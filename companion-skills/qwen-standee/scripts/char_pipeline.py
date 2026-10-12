#!/usr/bin/env python3
"""CHAR 立绘流水线：设定表 1×4（单次出图）→ 逐张出状态图（Qwen-Image-2.1 直出 RGBA）。

用法:
  python char_pipeline.py --char CHAR_A1 --stage sheet
  python char_pipeline.py --char CHAR_A1 --stage state
  python char_pipeline.py --char CHAR_A1 --stage all [--steps 24]

流程约定
- sheet：一张 2:1 宽图直出 4 视角（头肩 / 正面全身 / 侧面90° / 背面全身），保留浅灰背景，
  再按网格切成 4 张单图供后续当身份参考。
- state：以设定表切出的单图为参考，逐张出各状态图，人物直出透明底，不再走抠图。
- 所有状态图放在**同一次 ComfyUI 运行**里，共用已加载的 UNet/CLIP/VAE，省掉反复加载 16G 权重。

关键约束（改模型前必读）
- Qwen-Image-2.1 潜空间是 **64 通道 / 16× 下采样**（comfy/latent_formats.py: QwenImage21）。
  ComfyUI 无对应空 latent 节点，借用 EmptyHunyuanImageLatent（64ch / 32×）传 2 倍尺寸。
- 带参考图的阶段必须用 TextEncodeQwenImage21 自带的 latent（第 3 输出），其尺寸 = 参考图
  按 `resolution` 等比缩放后的尺寸。故参考图要先裁成与目标画布一致的宽高比，
  且 resolution = round(sqrt(W*H)/32)*32（pick_resolution 会自动挑到精确匹配的值）。
- autogrow 输入在 API 格式下必须写扁平前缀键 `images.image_1`，嵌套 dict 会静默失效。
"""
import argparse, json, math, os, shutil, sys, time, urllib.request, urllib.error, uuid
from pathlib import Path
from PIL import Image

COMFY = Path("/root/ComfyUI")
CHARS = Path("/root/autodl-tmp/char")
HOST = "127.0.0.1:6006"
UNET = "qwen_image_2.1_int8_convrot.safetensors"
CLIP = "qwen3vl_8b_int8_convrot.safetensors"
VAE = "qwen_image_2.1_vae_bf16.safetensors"


def groups_of(P):
    """状态图分组 = prompts.json 里所有含 shots 的顶层键。"""
    return [k for k, v in P.items() if isinstance(v, dict) and "shots" in v]


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


def run(wf, timeout=3600):
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


def pick_resolution(w, h):
    """找满足 TextEncodeQwenImage21 缩放公式后恰好得到 w×h 的 resolution。"""
    r0 = round(math.sqrt(w * h) / 32) * 32
    for r in sorted({r0, r0 - 32, r0 + 32, r0 - 64, r0 + 64}):
        if r <= 0:
            continue
        ratio = w / h
        cw = round(math.sqrt(r * r * ratio) / 32) * 32
        ch = round(math.sqrt(r * r / ratio) / 32) * 32
        if (cw, ch) == (w, h):
            return r
    raise SystemExit(f"找不到 resolution 使参考图缩放到 {w}x{h}")


def loaders():
    return {
        "unet": {"class_type": "UNETLoader",
                 "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "clip": {"class_type": "CLIPLoader",
                 "inputs": {"clip_name": CLIP, "type": "qwen_image"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
    }


def wf_sheet(p, seed, steps, cfg, prefix):
    wf = loaders()
    wf["te"] = {"class_type": "TextEncodeQwenImage21",
                "inputs": {"clip": ["clip", 0], "vae": ["vae", 0],
                           "prompt": p["prompt"].replace("{char}", p["_char"]),
                           "negative_prompt": p["_neg"], "resolution": 1024, "images": []}}
    # 本机 qwen2.1 实测为 8x 下采样（SD3 风格），用 EmptySD3LatentImage 直传真实像素尺寸
    wf["latent"] = {"class_type": "EmptySD3LatentImage",
                    "inputs": {"width": p["w"], "height": p["h"], "batch_size": 1}}
    wf["ks"] = {"class_type": "KSampler",
                "inputs": {"model": ["unet", 0], "seed": seed, "steps": steps, "cfg": cfg,
                           "sampler_name": "euler", "scheduler": "simple",
                           "positive": ["te", 0], "negative": ["te", 1],
                           "latent_image": ["latent", 0], "denoise": 1.0}}
    wf["dec"] = {"class_type": "VAEDecode", "inputs": {"samples": ["ks", 0], "vae": ["vae", 0]}}
    wf["save"] = {"class_type": "SaveImage", "inputs": {"images": ["dec", 0], "filename_prefix": prefix}}
    return wf


def wf_states(P, seed, steps, cfg, ref_rel, char, sheet_rel=None):
    """一次运行出全部状态图：共用 loaders，每个状态一条独立分支。"""
    wf = loaders()
    for gi, grp in enumerate(groups_of(P)):
        g = P[grp]
        # resolution=0 → 每张参考图保持自身尺寸（取整到 32），用于「首图定画布 + 整张设定表原尺寸入参」
        res = g.get("resolution") or pick_resolution(g["w"], g["h"])
        neg_base = P["neg"] + (" " + g["neg_extra"] if g.get("neg_extra") else "")
        for si, (name, cfg_shot) in enumerate(g["shots"].items()):
            i = f"{gi}{si}"
            # shots 值可为字符串，或 {"desc":..., "shot":..., "neg_extra":...} —— 后者用于
            # 覆盖公共取景段（例：跳跃举手需要头顶留白）与压制该动作不该出现的特征
            if isinstance(cfg_shot, dict):
                desc = cfg_shot["desc"]
                shot = cfg_shot.get("shot", g["shot"])
                neg = neg_base + (" " + cfg_shot["neg_extra"] if cfg_shot.get("neg_extra") else "")
            else:
                desc, shot, neg = cfg_shot, g["shot"], neg_base
            # char_block 里的身高/长裤/靴子会把取景拽成全身，半身组需用精简版覆盖
            body = g.get("char_override", P["char_block"])
            prompt = f"{shot}{desc}. {body} " \
                     f"Photorealistic, sharp focus, full-frame DSLR look, natural skin and fabric texture."
            if g.get("transparent"):
                prompt += " Isolated on a fully transparent background with a clean alpha cutout, no backdrop, no scenery, no cast shadow."
            prompt += f" {shot.strip()}"   # 取景在尾部再强调一次，避免被长外观描述稀释
            images = {}
            n = 0
            for ri, rel in enumerate(ref_rel[grp], start=1):
                wf[f"ref{i}_{ri}"] = {"class_type": "LoadImage", "inputs": {"image": rel}}
                images[f"images.image_{ri}"] = [f"ref{i}_{ri}", 0]
                n = ri
            # 原流程（Skill 设计）：参考槽位里要放整张设定表，模型能看到 4 视图全信息。
            # 但 latent 尺寸由 image_1 决定，故设定表必须放在首位之后，否则输出会变成宽幅设定表比例。
            if g.get("ref_sheet") and sheet_rel:
                n += 1
                wf[f"ref{i}_{n}"] = {"class_type": "LoadImage", "inputs": {"image": sheet_rel}}
                images[f"images.image_{n}"] = [f"ref{i}_{n}", 0]
            wf[f"te{i}"] = {"class_type": "TextEncodeQwenImage21",
                            "inputs": {"clip": ["clip", 0], "vae": ["vae", 0], "prompt": prompt,
                                       "negative_prompt": neg, "resolution": res, **images}}
            wf[f"ks{i}"] = {"class_type": "KSampler",
                            "inputs": {"model": ["unet", 0], "seed": seed, "steps": steps, "cfg": cfg,
                                       "sampler_name": "euler", "scheduler": "simple",
                                       "positive": [f"te{i}", 0], "negative": [f"te{i}", 1],
                                       "latent_image": [f"te{i}", 2], "denoise": 1.0}}
            wf[f"dec{i}"] = {"class_type": "VAEDecode",
                             "inputs": {"samples": [f"ks{i}", 0], "vae": ["vae", 0]}}
            wf[f"sv{i}"] = {"class_type": "SaveImage",
                            "inputs": {"images": [f"dec{i}", 0],
                                       "filename_prefix": f"{char}/states/{grp}_{name}"}}
    return wf


def split_grid(src, grid, names, out_dir):
    im = Image.open(src).convert("RGB")
    cols, rows = grid
    cw, ch = im.width // cols, im.height // rows
    return [(_save(im.crop(((i % cols) * cw, (i // cols) * ch,
                            (i % cols + 1) * cw, (i // cols + 1) * ch)),
                   out_dir / f"{n}.png"))
            for i, n in enumerate(names)]


def _save(cell, path):
    cell.save(path)
    return path


def crop_ref(src, ratio, dst, top_frac=1.0):
    """参考图预处理：先按 top_frac 取顶部（裁掉下半身以匹配目标取景），再裁成目标宽高比。

    top_frac 很关键——参考图的构图会压过文字里的取景描述，参考是全身图就会出全身图。
    """
    im = Image.open(src).convert("RGB")
    if top_frac < 1.0:
        im = im.crop((0, 0, im.width, int(im.height * top_frac)))
    w, h = im.width, im.height
    if w / h > ratio:          # 过宽 → 裁宽（水平居中）
        cw, ch = int(h * ratio), h
    else:                      # 过高 → 裁高（从顶部保留）
        cw, ch = w, int(w / ratio)
    im.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, ch)).save(dst)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char", required=True)
    ap.add_argument("--stage", required=True, choices=["sheet", "state", "all"])
    ap.add_argument("--seed", type=int, default=20261010)
    ap.add_argument("--steps", type=int, default=24)
    ap.add_argument("--cfg", type=float, default=4.0)
    ap.add_argument("--ref_image", default=None,
                    help="外部设定表(如 krea2 4视图)本地路径，作为 qwen 参考生图的参考源"
                         "（替换 qwen 自出 sheet 的 front/head 参考；配合 --stage state 使用）")
    ap.add_argument("--ref_grid", default="4,1",
                    help="外部设定表网格 cols,rows（默认 4,1 横条）")
    ap.add_argument("--ref_cells", default="0,3",
                    help="外部设定表取哪几列当参考(逗号分隔，负数=-len)；默认 0,3 = "
                         "第1列(正面全身)+最后列(面部特写)，对应 qwen 原生 refs=[front,head]")
    a = ap.parse_args()

    P = json.loads((CHARS / a.char / "prompts.json").read_text())
    outdir = COMFY / "output" / a.char
    inputdir = COMFY / "input" / a.char
    celldir = outdir / "cells"
    for d in (outdir, inputdir, celldir):
        d.mkdir(parents=True, exist_ok=True)

    for st in (["sheet", "state"] if a.stage == "all" else [a.stage]):
        if st == "sheet":
            print("[sheet] 单次出图 4 视角 %dx%d" % (P["sheet"]["w"], P["sheet"]["h"]))
            for f in outdir.glob("sheet_*.png"):   # 清上一轮，避免 SaveImage 序号堆叠分不清新旧
                f.unlink()
            P["sheet"]["_char"] = P["char_block"]
            P["sheet"]["_neg"] = P["neg"]
            run(wf_sheet(P["sheet"], a.seed, a.steps, a.cfg, f"{a.char}/sheet"))
            img = sorted(outdir.glob("sheet_*.png"))[-1]
            for p in split_grid(img, tuple(P["sheet"]["grid"]), P["sheet"]["cells"], celldir):
                pass
            print("  切成 4 张 →", celldir)
            continue

        groups = groups_of(P)
        if a.ref_image:
            # ── 外部设定表（如 krea2 4视图）模式：跳过 qwen sheet，按 qwen 原生逻辑切格后用单格当参考 ──
            # 关键修正：只取「正面单格 + 面部特写单格」（对应 qwen 原生 refs=[front,head]），
            # 不把整张图追加进参考槽——整图含三视图全身，会压成全身先验并导致身份漂移（上一轮已踩）。
            ext = Path(a.ref_image)
            if not ext.exists():
                print(f"  外部参考图不存在: {ext}"); sys.exit(1)
            cols, rows = (int(x) for x in a.ref_grid.split(","))
            split_grid(ext, (cols, rows), [f"k{i}" for i in range(cols * rows)], celldir)
            # 选取参考单格：front=第一列(正面全身)，head=最后一列(面部特写)；--ref_cells 可改
            cells_idx = [int(x) + (cols * rows if int(x) < 0 else 0) for x in a.ref_cells.split(",")]
            sheet_rel = None  # 不追加整张，避免全身先验与身份漂移
            ref_rel = {}
            for grp in groups:
                g = P[grp]
                rel = []
                for ri, ci in enumerate(cells_idx, start=1):
                    src = celldir / f"k{ci}.png"
                    dst = inputdir / f"{grp}_ref{ri}.png"
                    crop_ref(src, g["w"] / g["h"], dst, g.get("ref_top", 1.0))
                    if g.get("resolution") == 0 and ri == 1:
                        Image.open(dst).resize((g["w"], g["h"]), Image.LANCZOS).save(dst)
                    rel.append(f"{a.char}/{grp}_ref{ri}.png")
                ref_rel[grp] = rel
            label = f"外部设定表 {ext.name}（网格 {cols}x{rows}，切格取列{cells_idx}当参考，不追加整图）"
        else:
            # ── 原 qwen 自出 sheet 流程 ──
            sheets = sorted(outdir.glob("sheet_*.png"))
            sheet_rel = None
            if sheets:
                shutil.copy(sheets[-1], inputdir / "sheet.png")
                sheet_rel = f"{a.char}/sheet.png"
            ref_rel = {}
            for grp in groups:
                g = P[grp]
                refs = g.get("refs") or [g["ref"]]
                rel = []
                for ri, r in enumerate(refs, start=1):
                    src = celldir / f"{r}.png"
                    if not src.exists():
                        print(f"  缺参考图 {src}，请先跑 sheet"); sys.exit(1)
                    dst = inputdir / f"{grp}_ref{ri}.png"
                    crop_ref(src, g["w"] / g["h"], dst, g.get("ref_top", 1.0))
                    # resolution=0 时 latent 尺寸 = 参考图原尺寸，故首图必须预先缩放到目标画布
                    if g.get("resolution") == 0 and ri == 1:
                        Image.open(dst).resize((g["w"], g["h"]), Image.LANCZOS).save(dst)
                    rel.append(f"{a.char}/{grp}_ref{ri}.png")
                ref_rel[grp] = rel
            label = (f"参考={ {g: P[g].get('refs') or [P[g]['ref']] for g in groups} }"
                     f"{' + 整张设定表' if sheet_rel else ''}")
        n = sum(len(P[g]["shots"]) for g in groups)
        print(f"[state] 逐张出 {n} 张（组={groups}，{label}）")
        for f in (outdir / "states").glob("*.png"):
            f.unlink()
        run(wf_states(P, a.seed, a.steps, a.cfg, ref_rel, a.char, sheet_rel))

    print("完成。产物目录:", outdir)


if __name__ == "__main__":
    main()
