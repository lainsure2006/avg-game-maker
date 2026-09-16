# -*- coding: utf-8 -*-
"""演示：同一份文案，在「斜拍底图」与「正拍底图」上的落位差异。

正拍版按方格稿纸的实际格距排版（一字一格，格居中），证明路线 A 的效果。
用法：python demo_flat.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import item_art as A
import item_texts as T

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "<game>_assets", "item_bases")
OUT = os.path.join(D, "_对比_斜拍vs正拍_letter7.png")

# 正拍版实测格线间距 41px；找一个格交点作原点（纸面左上角内侧）
CELL = 41.0
X0 = 62
Y0 = 90                       # 首行下移，避开顶部标题栏
LINE_LEAD = int(CELL * 2)      # 行距 = 2 格（信件空行写）
SIZE = 30


def render_flat():
    im = Image.open(os.path.join(D, "Krea2_Item_letter7_flat.png")).convert("RGB")
    ly = Image.new("RGBA", im.size, (0, 0, 0, 0))
    f = A.F("kai", SIZE)
    ink = (30, 32, 36, 236)
    for i, line in enumerate(T.LETTER7):
        y = Y0 + i * LINE_LEAD
        # 一字一格：每字在格内居中
        for j, ch in enumerate(line):
            cx = X0 + j * CELL + CELL / 2
            cy = y + CELL / 2
            ImageDraw.Draw(ly).text((cx, cy), ch, font=f, fill=ink, anchor="mm")
    ly = A.noise(ly, 9, seed=11)
    return A.paste_rot(im, ly, angle=0.0)


def render_slant():
    """旧斜拍版：沿用 item_art 里已校准好的排版。"""
    return A.build_letter7()


def label(im, text, sub):
    im = im.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    fb = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 30)
    fs = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 22)
    d.rectangle([0, 0, im.size[0], 78], fill=(16, 18, 22))
    d.text((22, 10), text, font=fb, fill=(255, 236, 160))
    d.text((22, 48), sub, font=fs, fill=(190, 198, 208))
    return im


if __name__ == "__main__":
    a = label(render_slant(), "① 旧 · 斜拍底图", "纸面占画面 24.5% · 格线倾斜 15.5° · 纸面像素 基准")
    b = label(render_flat(), "② 新 · 垂直正拍底图", "纸面占画面 95.0% · 格线≈0° · 纸面像素 ×3.9")
    w, h = a.size
    sheet = Image.new("RGB", (w, h * 2), (14, 16, 20))
    sheet.paste(a, (0, 0))
    sheet.paste(b, (0, h))
    sheet = sheet.resize((w // 2, h), Image.LANCZOS)
    sheet.save(OUT)
    print("->", OUT, os.path.getsize(OUT), "bytes")
