#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CG 出图管线（云端 AutoDL / qwen-image 2.1）：双参考，1280x720，无 rmbg。

设计：
- refs[0] = 场景背景（16:9），先本地缩放到目标画布尺寸 → 由 TextEncodeQwenImage21 的
  resolution=0 机制决定 latent = 该图尺寸（即 1280x720）。
- refs[1..] = 角色透明 sprite / 道具图，作为身份/物体参考槽（不改变画布尺寸）。
- 每个 CG 独立一组，一次运行内逐组串行出（共用已加载 UNET/CLIP/VAE，省 16G 权重反复加载）。
- 不抠图（CG 为不透明场景图），直接存 cg/states/<key>_*.png。

用法:
  python cg_pipeline.py                       # 全部组
  python cg_pipeline.py --only cg_prologue_trek cg_sigil_wax cg_prologue_gate
"""
import argparse
import json
import math
import os
import shutil
import sys
import time
import urllib.request
import urllib.error
import uuid
from pathlib import Path
from PIL import Image

COMFY = Path("/root/ComfyUI")
CG = Path("/root/autodl-tmp/cg")
CGINPUT = CG / "input"
HOST = "127.0.0.1:6006"
UNET = "qwen_image_2.1_int8_convrot.safetensors"
CLIP = "qwen3vl_8b_int8_convrot.safetensors"
VAE = "qwen_image_2.1_vae_bf16.safetensors"


def api(path, data=None):
    url = f"http://{HOST}{path}"
    if data is not None:
        body = json.dumps(data).encode()
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"}, method="POST")
    else:
        req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def run(wf, timeout=7200):
    try:
        resp = api("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})
    except urllib.error.HTTPError as e:
        print("提交失败:", e.read().decode()[:2000]); sys.exit(1)
    if resp.get("node_errors"):
        print("节点校验错误:", json.dumps(resp["node_errors"], ensure_ascii=False)[:1500]); sys.exit(1)
    pid = resp["prompt_id"]
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(5)
        hist = api(f"/history/{pid}")
        if pid not in hist:
            continue
        errs = [m for m in hist[pid]["status"].get("messages", [])
                if m[0] in ("execution_error", "validation_error")]
        if errs:
            for m in errs:
                print("执行出错:", m[0], json.dumps(m[1], ensure_ascii=False)[:1500])
            sys.exit(2)
        files = [im["subfolder"] + "/" + im["filename"]
                 for o in hist[pid].get("outputs", {}).values() for im in o.get("images", [])]
        print("  完成，用时 %.1fs，产出 %d 张" % (time.time() - t0, len(files)))
        return files
    print("超时未完成"); sys.exit(3)


def loaders():
    return {
        "unet": {"class_type": "UNETLoader",
                 "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader",
                 "inputs": {"clip_name": CLIP, "type": "qwen_image"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
    }


def wf_group(g, seed, steps, cfg):
    wf = loaders()
    w, h = g["w"], g["h"]
    scene, shot, char_block = g["scene"], g["shot"], g.get("char_block", "")
    prompt = (f"{shot}. {scene}. {char_block} "
              f"Photorealistic, sharp focus, cinematic, full-frame DSLR look, "
              f"natural skin and fabric texture, 8k uhd, masterpiece. {shot}")
    neg = g["neg"]
    images = {}
    for ri, rel in enumerate(g["refs"], start=1):
        wf[f"ref{ri}"] = {"class_type": "LoadImage", "inputs": {"image": rel}}
        images[f"images.image_{ri}"] = [f"ref{ri}", 0]
    wf["te"] = {"class_type": "TextEncodeQwenImage21",
                "inputs": {"clip": ["clip", 0], "vae": ["vae", 0], "prompt": prompt,
                           "negative_prompt": neg, "resolution": 0, **images}}
    wf["ks"] = {"class_type": "KSampler",
                "inputs": {"model": ["unet", 0], "seed": seed, "steps": steps, "cfg": cfg,
                           "sampler_name": "euler", "scheduler": "simple",
                           "positive": ["te", 0], "negative": ["te", 1],
                           "latent_image": ["te", 2], "denoise": 1.0}}
    wf["dec"] = {"class_type": "VAEDecode", "inputs": {"samples": ["ks", 0], "vae": ["vae", 0]}}
    wf["sv"] = {"class_type": "SaveImage",
                "inputs": {"images": ["dec", 0], "filename_prefix": f"cg/states/{g['_name']}"}}
    return wf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=32)
    ap.add_argument("--cfg", type=float, default=5.0)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--only", nargs="*", default=None)
    a = ap.parse_args()

    P = json.loads((CG / "prompts.json").read_text())
    groups = P["groups"]
    want = a.only or list(groups.keys())

    # 先把每个组的 refs[0]（场景背景）缩放到目标画布尺寸，作为 latent 尺寸来源；
    # 同时把所有 refs 复制到 ComfyUI 的 input 目录（LoadImage 按文件名只认该目录，
    # 不认 /root/autodl-tmp/cg/input，否则报 Invalid image file）。
    (COMFY / "input").mkdir(parents=True, exist_ok=True)
    for gname in want:
        g = groups[gname]
        g["_name"] = gname
        for ri, rel in enumerate(g["refs"]):
            src = CGINPUT / rel
            if not src.exists():
                print(f"  [WARN] 缺参考 {src}")
                continue
            if ri == 0:
                im = Image.open(src).convert("RGB").resize((g["w"], g["h"]), Image.LANCZOS)
                im.save(src)          # 背景预缩放（原地，供 latent 定尺寸）
            shutil.copy(src, COMFY / "input" / rel)   # 复制到 ComfyUI input，供 LoadImage 按名读取

    for gname in want:
        g = groups[gname]
        seed = a.seed or g["seed"]
        print(f"[cg] {gname} (seed={seed}, refs={g['refs']})")
        for f in (COMFY / "output" / "cg" / "states").glob(f"{gname}_*.png"):
            f.unlink()
        run(wf_group(g, seed, a.steps, a.cfg))

    print("完成。")


if __name__ == "__main__":
    main()
