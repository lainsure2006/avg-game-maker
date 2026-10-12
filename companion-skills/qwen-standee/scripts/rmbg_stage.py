#!/usr/bin/env python3
"""RMBG 抠透明（原流程第 3 步）：出图后去背，替代直出 alpha。

用法: python rmbg_stage.py --char CHAR_B1 [--pattern 'states/asset_*_00002_.png']
产物: ComfyUI/output/<char>/rmbg/<原名>.png（RGBA）
"""
import argparse, shutil, sys
from pathlib import Path
import char_pipeline as cp

MODEL = "RMBG-2.0"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char", required=True)
    ap.add_argument("--pattern", default="states/*.png")
    ap.add_argument("--process_res", type=int, default=1024)
    ap.add_argument("--sensitivity", type=float, default=1.0)
    ap.add_argument("--mask_blur", type=int, default=0)
    ap.add_argument("--mask_offset", type=int, default=0)
    ap.add_argument("--refine_foreground", action="store_true", default=True)
    a = ap.parse_args()

    outdir = cp.COMFY / "output" / a.char
    srcs = sorted(outdir.glob(a.pattern))
    if not srcs:
        print("没有匹配的图:", outdir / a.pattern); sys.exit(1)
    indir = cp.COMFY / "input" / a.char / "rmbg_in"
    if indir.exists():
        shutil.rmtree(indir)
    indir.mkdir(parents=True, exist_ok=True)

    wf = {}
    for i, s in enumerate(srcs):
        rel = f"{a.char}/rmbg_in/{s.name}"
        shutil.copy(s, cp.COMFY / "input" / rel)
        wf[f"ld{i}"] = {"class_type": "LoadImage", "inputs": {"image": rel}}
        # 硬坑：RMBG 从 kwargs 取可选参数，漏传会 KeyError，必须全部显式给
        wf[f"rg{i}"] = {"class_type": "RMBG",
                        "inputs": {"image": [f"ld{i}", 0], "model": MODEL,
                                   "sensitivity": a.sensitivity, "process_res": a.process_res,
                                   "mask_blur": a.mask_blur, "mask_offset": a.mask_offset,
                                   "invert_output": False, "refine_foreground": a.refine_foreground,
                                   "unload_model": False, "background": "Alpha",
                                   "background_color": "#222222"}}
        wf[f"sv{i}"] = {"class_type": "SaveImage",
                        "inputs": {"images": [f"rg{i}", 0],
                                   "filename_prefix": f"{a.char}/rmbg/{s.stem}"}}
    print(f"[rmbg] {len(srcs)} 张，模型 {MODEL}，process_res {a.process_res}")
    cp.run(wf)
    print("产物:", outdir / "rmbg")


if __name__ == "__main__":
    main()
