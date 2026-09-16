# -*- coding: utf-8 -*-
"""生成「青幕原图 → 抠图透明 → 贴深底（游戏内效果）」三联对比图。"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

D = r"<project>/story-wip/素材/<game>_assets/char_busts"
TAG = sys.argv[1] if len(sys.argv) > 1 else "laosun"
H = 760
FONT = "/c/Windows/Fonts/msyh.ttc"
if not os.path.isfile(FONT):
    FONT = r"C:/Windows/Fonts/msyh.ttc"


def load(name):
    p = os.path.join(D, name)
    return Image.open(p).convert("RGBA") if os.path.isfile(p) else None


src = load("Krea2_Bust_%s_gray.png" % TAG)
cut = load("Krea2_Bust_%s.png" % TAG)

W0, H0 = src.size
w = int(W0 * H / H0)


def fit(im):
    return im.resize((w, H), Image.LANCZOS)


src2 = fit(src)
cut2 = fit(cut)

# 面板 2：透明区用棋盘格显示（证明真的透明）
board = Image.new("RGB", (w, H), (255, 255, 255))
cell = 16
for y in range(0, H, cell):
    for x in range(0, w, cell):
        if (x // cell + y // cell) % 2:
            board.paste((222, 222, 222), (x, y, min(x + cell, w), min(y + cell, H)))
p2 = board.convert("RGBA")
p2.alpha_composite(cut2)

# 面板 3：贴到游戏里会用的深冷色底上
bg = Image.new("RGB", (w, H), (26, 32, 44))
dr = ImageDraw.Draw(bg)
for i in range(H):
    v = int(26 + (i / H) * 26)
    dr.line([(0, i), (w, i)], fill=(v, v + 6, v + 16))
p3 = bg.convert("RGBA")
p3.alpha_composite(cut2)

pad, top = 14, 46
CW = w * 3 + pad * 4
CH = H + top + pad
canvas = Image.new("RGB", (CW, CH), (245, 245, 243))
draw = ImageDraw.Draw(canvas)
try:
    f = ImageFont.truetype(FONT, 22)
except Exception:
    f = ImageFont.load_default()

labels = ["① 出图原图（纯色底）", "② 抠图结果（棋盘格=透明）", "③ 贴深色底（游戏内效果）"]
panels = [src2, p2, p3]
for i, (lb, im) in enumerate(zip(labels, panels)):
    x = pad + i * (w + pad)
    canvas.paste(im.convert("RGB"), (x, top))
    draw.text((x, 14), lb, fill=(40, 40, 40), font=f)

out = os.path.join(D, "_对比_抠图三段_%s.png" % TAG)
canvas.save(out)
print("OK ->", out, canvas.size, os.path.getsize(out), "bytes")
