# -*- coding: utf-8 -*-
"""把透明立绘归一化为引擎可用 sprite。
输入: jianmo_portraits/jianmo_portraits_matte/  (整帧透明 PNG)
输出: jianmo_portraits/jianmo_portraits_sprite/ (统一画布 1080x1080, 身体高度归一 900px, 底部对齐)

为什么：引擎 renderer.drawCharacterAuto 对 ≤3 人同屏 maxWRatio=0.28、maxHeight=0.75*H，
且 scale 上限为 1（不放大）。整帧 1536x768 会因宽度被卡成矮横条、人物极小；
各人宽高比不同还会导致缩放不一致（身高基线不齐）。归一化后 7 张渲染尺寸一致。
"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "jianmo_portraits", "jianmo_portraits_matte")
OUT = os.path.join(BASE, "jianmo_portraits", "jianmo_portraits_sprite")
os.makedirs(OUT, exist_ok=True)

CANVAS = 1080          # 正方形画布
BODY_H = 900           # 身体(包围盒)归一高度
BOTTOM_MARGIN = 30     # 底部留白
SIDE_PAD = 8           # 左右最小安全边

SKIP = ("mask", "feat", "OLD", "YYS", "YYSC", "FACESWAP", "COMPARE", "ROW", "_test", "MATTE")

files = sorted(f for f in os.listdir(SRC)
               if f.startswith("JM_PORTRAIT_") and f.lower().endswith(".png")
               and not any(k in f for k in SKIP))

print(f"归一化 {len(files)} 张 -> {CANVAS}x{CANVAS}, body_h={BODY_H}")
rows = []
for f in files:
    im = Image.open(os.path.join(SRC, f)).convert("RGBA")
    bbox = im.split()[3].getbbox()
    if not bbox:
        print(f"  SKIP {f} 无前景")
        continue
    person = im.crop(bbox)
    pw, ph = person.size

    # 身体高度归一 -> 900；同时保证宽度不超画布
    s = BODY_H / ph
    if pw * s > CANVAS - 2 * SIDE_PAD:
        s = (CANVAS - 2 * SIDE_PAD) / pw
    nw, nh = max(1, round(pw * s)), max(1, round(ph * s))

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - nw) // 2
    y = CANVAS - BOTTOM_MARGIN - nh
    if y < 0:
        y = 0
    canvas.alpha_composite(person.resize((nw, nh), Image.LANCZOS), (x, y))
    dst = os.path.join(OUT, f)
    canvas.save(dst)

    nb = canvas.split()[3].getbbox()
    rows.append((f, (nw, nh), (x, y), nb))
    print(f"  OK {f[:44]:44s} person{nw}x{nh} at({x},{y}) bbox={nb}")

print(f"\n完成 {len(rows)} 张 -> {OUT}")
