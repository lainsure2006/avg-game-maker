#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L0 一次性 4 宫格参考卡（z-image-turbo，单 pass 多面板构图）
对比 gen_l0_ref.py 的「4 张分图拼」方案：同一次生成 4 视图共享潜空间，
脸/发色/服饰天然一致，且大图清晰。
出图后：抹掉第2-4列脸部 -> 作为后续 img2img 初值参考卡（防多脸干扰）。
"""
import json, os, sys, time, uuid
import urllib.request, urllib.parse
from PIL import Image

COMFY_URL = "http://127.0.0.1:8188"
BASE_WF = r"<project>/story-wip/素材/comfyui-api-A10.json"
OUT_DIR = r"<project>/story-wip/素材/ref"
os.makedirs(OUT_DIR, exist_ok=True)

POS = ("【角色设定三视图，一张画布内】二次元角色参考图，"
       "四个面板必须从四个截然不同的角度展示同一个角色，禁止重复角度。 "
       "最左侧独立面部大特写，脸部占满整个面板，只展示五官、脸型、发型、发色，无肩颈躯干；"
       "右侧第1格正面全身站立（face front），第2格严格90度左侧面全身（profile view，身体完全侧向，仅展示一侧脸颊与鼻梁线条，与正面格角度截然不同），第3格背面全身（back view），"
       "从头到脚完整展示人物，无裁切，纯白色背景，构图工整规整，"
       "专业角色设计稿，人物比例标准。"
       "美少女，温柔甜美的日系二次元少女，柔和浅棕色长卷发，蓬松有层次，"
       "轻薄空气刘海，部分发丝随风微微飘动，发丝光泽细腻通透。"
       "温润的棕琥珀色大眼睛，弯弯眼型，淡淡的粉橘腮红，柔和浅浅微笑，"
       "气质恬静温柔。身穿经典日系水手服，浅米白色长袖水手服上衣，"
       "藏青色水手领，领口带有两道白色细条纹，胸前系酒红色大领结，"
       "短款上衣，袖口藏青色袖边配两道白色条纹；"
       "下身藏青色百褶短裙，面料褶皱清晰。双手姿态自然，肌肤白皙细腻，"
       "柔和干净的漫射光影，高级柔和氛围感，干净通透色彩，"
       "8K超高细节，精致二次元插画，线条干净。")

NEG = ("人物截断，裁切不全，畸形四肢，扭曲手部，多手指，残缺肢体，"
       "杂乱背景，水印，文字，污渍，强烈阴影，昏暗，杂乱构图，"
       "多余装饰，道具，环境景物")

W, H = 2048, 1024   # 用户确认：宽2048 高1024 横图（比例 2:1，4 宫格横向排）
SEED = 20260833

def api(path, data=None, raw=None, timeout=120, method=None):
    url = COMFY_URL + path
    hdr = {"Cache-Control": "no-cache", "Pragma": "no-cache"}
    if raw is not None:
        hdr["Content-Type"] = "application/json"
        r = urllib.request.Request(url, data=raw, headers=hdr, method=method or "POST")
    elif data is not None:
        hdr["Content-Type"] = "application/json"
        r = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=hdr, method=method or "POST")
    else:
        r = urllib.request.Request(url, headers=hdr, method=method or "GET")
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", "replace")
    return json.loads(body) if body else {}

def submit(wf):
    r = api("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})
    pid = r.get("prompt_id")
    if not pid:
        raise RuntimeError("submit failed: " + json.dumps(r, ensure_ascii=False)[:200])
    return pid

def download_by_prefix(prefix, out_path, timeout=400):
    deadline = time.time() + timeout
    while time.time() < deadline:
        h = api("/history")
        for pid, node in h.items():
            for nid, o in node.get("outputs", {}).items():
                for img in o.get("images", []):
                    fn = img["filename"]
                    if fn.startswith(prefix):
                        url = (COMFY_URL + "/view?filename=" + urllib.parse.quote(fn)
                               + "&subfolder=" + urllib.parse.quote(img.get("subfolder", ""))
                               + "&type=" + urllib.parse.quote(img.get("type", "output")))
                        with urllib.request.urlopen(url, timeout=120) as r:
                            data = r.read()
                        with open(out_path, "wb") as f:
                            f.write(data)
                        print(f"  downloaded {prefix} -> {out_path} ({len(data)} bytes)")
                        return out_path
        time.sleep(4)
    raise TimeoutError("download timeout: " + prefix)

def load_base():
    with open(BASE_WF, encoding="utf-8") as f:
        return json.load(f)

def build_onepass():
    wf = load_base()
    wf["67"]["inputs"]["text"] = POS
    wf["71"]["inputs"]["text"] = NEG
    wf["70"]["inputs"]["seed"] = SEED
    wf["68"]["inputs"]["width"] = W
    wf["68"]["inputs"]["height"] = H
    wf["9"]["inputs"]["filename_prefix"] = "L0_v7"
    return wf

def main():
    print(f"== 一次性 4 宫格 {W}x{H} (seed={SEED}) ==")
    wf = build_onepass()
    pid = submit(wf)
    print(f"  submitted L0_v7 ({pid[:8]})")
    raw = os.path.join(OUT_DIR, "L0_v7_raw.png")
    download_by_prefix("L0_v7", raw)

    print("\n== 完成 ==")
    print(f"  参考卡原图: {raw}")
    print("  去脸: 请用户自行用画图/Photoshop 以白色画笔涂抹非主脸区域的面部。")
    print("        脚本不再自动抹脸（一次性布局不稳定，自动涂抹边界不可靠）。")

if __name__ == "__main__":
    if "--url" in sys.argv:
        COMFY_URL = sys.argv[sys.argv.index("--url") + 1].rstrip("/")
    print("ComfyURL:", COMFY_URL)
    main()
