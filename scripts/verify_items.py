# -*- coding: utf-8 -*-
"""
物证成品客观校验 —— 「成品 − 底图」差分 = 我叠上去的墨迹。

用途：排版坐标调完后，不用靠肉眼估（缩略图上目测极易偏上百像素），
     直接量出每一处墨迹的真实包围框，再和底图的「纸面亮区」比对，
     检查有没有压到纸外 / 越出栏目。

用法：
    python verify_items.py                # 全部
    python verify_items.py letter7 ...    # 指定
"""
import os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
BASES = os.path.join(HERE, "<game>_assets", "item_bases")
OUT = r"<avg-engine>/public/images/items"
W, H = 1280, 960


def bands(iid, thr=26):
    """返回墨迹的「行带」列表：[(y0, y1, x0, x1), ...]（按 y 合并连续行）。"""
    b = Image.open(os.path.join(BASES, "Krea2_Item_%s.png" % iid)).convert("L")
    o = Image.open(os.path.join(OUT, "%s.png" % iid)).convert("L")
    if b.size != (W, H):
        b = b.resize((W, H), Image.LANCZOS)
    d = ImageChops.difference(b, o)
    px = d.load()
    rows = []
    for y in range(H):
        xs = [x for x in range(W) if px[x, y] > thr]
        rows.append((min(xs), max(xs)) if xs else None)
    out = []
    cur = None
    for y, r in enumerate(rows):
        if r:
            if cur is None:
                cur = [y, y, r[0], r[1]]
            else:
                cur[1] = y
                cur[2] = min(cur[2], r[0]); cur[3] = max(cur[3], r[1])
        else:
            if cur and cur[1] - cur[0] >= 2:
                out.append(tuple(cur))
            cur = None
    if cur and cur[1] - cur[0] >= 2:
        out.append(tuple(cur))
    return out


def paper(iid, frac=0.34):
    """底图纸面亮区（行/列亮像素占比的连续带）。"""
    g = Image.open(os.path.join(BASES, "Krea2_Item_%s.png" % iid)).convert("L")
    if g.size != (W, H):
        g = g.resize((W, H), Image.LANCZOS)
    px = g.load()
    hist = g.histogram()
    tot = W * H
    s_all = sum(i * hist[i] for i in range(256))
    sB = wB = 0; best = -1; thr = 128
    for i in range(256):
        wB += hist[i]
        if wB == 0: continue
        wF = tot - wB
        if wF == 0: break
        sB += i * hist[i]
        v = wB * wF * ((sB / wB) - ((s_all - sB) / wF)) ** 2
        if v > best: best = v; thr = i
    rowc = [sum(1 for x in range(0, W, 4) if px[x, y] > thr) for y in range(H)]
    colc = [sum(1 for y in range(0, H, 4) if px[x, y] > thr) for x in range(W)]

    def band(cnt, mx):
        lim = mx * frac
        runs = []; s = None
        for i, v in enumerate(cnt):
            if v >= lim and s is None: s = i
            elif v < lim and s is not None: runs.append((s, i - 1)); s = None
        if s is not None: runs.append((s, len(cnt) - 1))
        return max(runs, key=lambda r: r[1] - r[0]) if runs else (0, len(cnt) - 1)

    y0, y1 = band(rowc, max(rowc) or 1)
    x0, x1 = band(colc, max(colc) or 1)
    return (x0, y0, x1, y1)


def main(only=None):
    import glob
    ids = only or [os.path.basename(p)[11:-4]
                   for p in sorted(glob.glob(os.path.join(BASES, "Krea2_Item_*.png")))
                   if "_old" not in p]
    for iid in ids:
        if not os.path.isfile(os.path.join(OUT, "%s.png" % iid)):
            print("== %s  未产出成品，跳过" % iid); continue
        bx = paper(iid)
        print("== %s   纸面 x %d..%d y %d..%d" % (iid, bx[0], bx[2], bx[1], bx[3]))
        for (y0, y1, x0, x1) in bands(iid):
            flag = ""
            if x0 < bx[0] - 6 or x1 > bx[2] + 6 or y0 < bx[1] - 6 or y1 > bx[3] + 6:
                flag = "   ⚠️ 越出纸面"
            print("     墨迹 y %4d..%4d  x %4d..%4d%s" % (y0, y1, x0, x1, flag))


if __name__ == "__main__":
    main(only=sys.argv[1:] or None)
