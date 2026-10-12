# -*- coding: utf-8 -*-
"""本地 rembg 批量抠图：把白底立绘转透明 RGBA sprite。
不依赖云端，纯 CPU (onnxruntime)。输出到 jianmo_portraits_matte/ 保留原文件名。
"""
import os, sys
from PIL import Image
from rembg import remove, new_session

# 输入目录：放待抠图的 PNG（白底/带背景立绘）。默认读环境变量 MATTE_INPUT_DIR；也可直接改成你的目录。
PORT = os.environ.get("MATTE_INPUT_DIR", r"<path-to-your-portrait-png-dir>")
OUT = os.path.join(PORT, 'jianmo_portraits_matte')
os.makedirs(OUT, exist_ok=True)

SKIP = ('mask', 'feat', 'OLD', 'YYS', 'YYSC', 'FACESWAP', 'COMPARE', 'ROW', '_test', 'MATTE')
MODEL = 'u2net_human_seg'

files = sorted(f for f in os.listdir(PORT)
               if f.startswith('JM_PORTRAIT_') and f.lower().endswith('.png')
               and not any(k in f for k in SKIP))

print(f"待抠图 {len(files)} 张，模型={MODEL}")
session = new_session(model_name=MODEL)

ok, bad = [], []
for f in files:
    src = os.path.join(PORT, f)
    dst = os.path.join(OUT, f)
    try:
        im = Image.open(src).convert('RGB')
        res = remove(im, session=session)  # RGBA
        res.save(dst)
        a = res.split()[3]
        px = list(a.getdata())
        transp = sum(1 for v in px if v < 10) / len(px)
        w, h = res.size
        corners = [a.getpixel((3, 3)), a.getpixel((w - 3, 3)),
                   a.getpixel((3, h - 3)), a.getpixel((w - 3, h - 3))]
        ok.append((f, res.size, round(transp * 100, 1), corners))
        print(f"  OK {f} {res.size} 透明{round(transp*100,1)}% 四角{corners}", flush=True)
    except Exception as e:
        bad.append((f, repr(e)))
        print(f"  FAIL {f}: {e}", flush=True)

print(f"\n完成: 成功 {len(ok)} / 失败 {len(bad)}")
for f, sz, t, c in ok:
    print(f"  + {f} {sz} 透明{t}%")
for f, e in bad:
    print(f"  - {f} {e}")
sys.exit(1 if bad else 0)
