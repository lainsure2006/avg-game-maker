#!/usr/bin/env python3
"""只跑指定分组的状态图（不重跑其它组，用于 A/B 对照实验）。

用法: python run_group.py --char CHAR_B1 --group asset2 [--steps 20] [--seed ...]
"""
import argparse, json
from pathlib import Path
import char_pipeline as cp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char", required=True)
    ap.add_argument("--group", required=True, action="append")
    ap.add_argument("--seed", type=int, default=20261010)
    ap.add_argument("--steps", type=int, default=24)
    ap.add_argument("--cfg", type=float, default=4.0)
    a = ap.parse_args()

    P = json.loads((cp.CHARS / a.char / "prompts.json").read_text())
    inputdir = cp.COMFY / "input" / a.char
    celldir = cp.COMFY / "output" / a.char / "cells"
    inputdir.mkdir(parents=True, exist_ok=True)

    sheets = sorted((cp.COMFY / "output" / a.char).glob("sheet_*.png"))
    sheet_rel = None
    if sheets:
        import shutil
        shutil.copy(sheets[-1], inputdir / "sheet.png")
        sheet_rel = f"{a.char}/sheet.png"

    sub = {"neg": P["neg"], "char_block": P["char_block"]}
    ref_rel = {}
    for grp in a.group:
        g = P[grp]
        sub[grp] = g
        refs = g.get("refs") or [g["ref"]]
        rel = []
        for ri, r in enumerate(refs, start=1):
            src = celldir / f"{r}.png"
            if not src.exists():
                raise SystemExit(f"缺参考图 {src}")
            dst = inputdir / f"{grp}_ref{ri}.png"
            cp.crop_ref(src, g["w"] / g["h"], dst, g.get("ref_top", 1.0))
            # resolution=0 时 latent 尺寸 = 参考图原尺寸，故首图必须预先缩放到目标画布
            if g.get("resolution") == 0 and ri == 1:
                from PIL import Image
                Image.open(dst).resize((g["w"], g["h"]), Image.LANCZOS).save(dst)
            rel.append(f"{a.char}/{grp}_ref{ri}.png")
        ref_rel[grp] = rel

    n = sum(len(sub[g]["shots"]) for g in a.group)
    print(f"[subset] 组={a.group} 出图 {n} 张，参考={ {g: ref_rel[g] for g in a.group} }"
          f"{' + 整张设定表' if sheet_rel else ''}")
    cp.run(cp.wf_states(sub, a.seed, a.steps, a.cfg, ref_rel, a.char, sheet_rel))


if __name__ == "__main__":
    main()
