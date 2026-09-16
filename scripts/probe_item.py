# -*- coding: utf-8 -*-
"""
物证底图坐标探测 —— 排版定坐标用的小工具。

用法：
    python probe_item.py letter7            # 打印纸面亮区分布（默认）
    python probe_item.py card_burnt --row 400 500 600
    python probe_item.py tin_box --box      # 打印整图亮区外接框 + 质心
"""
import os, sys
from PIL import Image, ImageFont

BASES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "<game>_assets", "item_bases")


def load(iid):
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    if not os.path.isfile(p):
        print("!! 缺底图:", p); sys.exit(1)
    im = Image.open(p).convert("L")
    return im, im.load()


def rows(im, px, ys, thr=None):
    W, H = im.size
    for y in ys:
        row = [px[x, y] for x in range(W)]
        t = thr if thr is not None else sum(row) / W + 22
        xs = [x for x in range(W) if row[x] > t]
        if not xs:
            print("  y=%3d 无亮区" % y); continue
        segs = []; s = xs[0]; p = xs[0]
        for x in xs[1:]:
            if x - p > 14:
                segs.append((s, p)); s = x
            p = x
        segs.append((s, p))
        segs = [q for q in segs if q[1] - q[0] > 70]
        print("  y=%3d 亮区%s" % (y, segs))


def centroid(im, px, thr=150):
    W, H = im.size
    xs = []; ys = []
    for y in range(0, H, 3):
        for x in range(0, W, 3):
            if px[x, y] > thr:
                xs.append(x); ys.append(y)
    if not xs:
        print("  无亮区"); return
    print("  亮区外接框 x %d..%d  y %d..%d  质心 (%d,%d)  样本 %d"
          % (min(xs), max(xs), min(ys), max(ys),
             sum(xs) // len(xs), sum(ys) // len(ys), len(xs)))


def grid(iid, step=100):
    """在底图上叠一层坐标网格（每 step 像素一条 + 标注），用于快速目测定排版坐标。

    产物：item_bases/_grid_<id>.png
    用法：python probe_item.py <id> --grid [step]
    """
    from PIL import ImageDraw
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    im = Image.open(p).convert("RGB")
    W, H = im.size
    d = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 20)
    except Exception:
        f = ImageFont.load_default()
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=(255, 60, 200), width=1)
        d.text((x + 3, 3), str(x), font=f, fill=(255, 220, 0))
        d.text((x + 3, H - 24), str(x), font=f, fill=(255, 220, 0))
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=(255, 60, 200), width=1)
        d.text((3, y + 2), str(y), font=f, fill=(0, 255, 255))
        d.text((W - 70, y + 2), str(y), font=f, fill=(0, 255, 255))
    out = os.path.join(BASES, "_grid_%s.png" % iid)
    im.save(out)
    print("  ->", out, os.path.getsize(out), "bytes")
    return out


def bright_box(iid, frac=0.30, thr=None):
    """测「纸面/亮区」外接框：按行/列统计亮像素占比，取最长的连续带。

    比连通域快得多且够用：物证书页通常是画面里唯一的大面积亮块。
    """
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    im = Image.open(p).convert("L")
    W, H = im.size
    px = im.load()
    if thr is None:
        hist = im.histogram()
        tot = W * H
        s_all = sum(i * hist[i] for i in range(256))
        sumB = wB = 0; best = -1; thr = 128
        for i in range(256):
            wB += hist[i]
            if wB == 0: continue
            wF = tot - wB
            if wF == 0: break
            sumB += i * hist[i]
            v = wB * wF * ((sumB / wB) - ((s_all - sumB) / wF)) ** 2
            if v > best:
                best = v; thr = i
    rowc = [sum(1 for x in range(0, W, 4) if px[x, y] > thr) for y in range(H)]
    colc = [sum(1 for y in range(0, H, 4) if px[x, y] > thr) for x in range(W)]
    rmax = max(rowc) or 1
    cmax = max(colc) or 1

    def band(cnt, mx):
        lim = mx * frac
        runs = []; s = None
        for i, v in enumerate(cnt):
            if v >= lim and s is None:
                s = i
            elif v < lim and s is not None:
                runs.append((s, i - 1)); s = None
        if s is not None:
            runs.append((s, len(cnt) - 1))
        return max(runs, key=lambda r: r[1] - r[0]) if runs else (0, len(cnt) - 1)

    y0, y1 = band(rowc, rmax)
    x0, x1 = band(colc, cmax)
    return (x0, y0, x1, y1), thr


def ruled(iid, box, axis, min_frac=0.55):
    """在一张有格线的纸里找横线/竖线位置。

    axis='y' → 返回横线 y 坐标（自上而下）；axis='x' → 竖线 x 坐标。
    原理：线像素在整条跨度上显著比邻域暗 → 用「沿线暗像素占比」找峰。
    """
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    g = Image.open(p).convert("L")
    px = g.load()
    x0, y0, x1, y1 = box
    if axis == "y":
        span = range(x0, x1, 2)
        prof = []
        for y in range(y0, y1):
            v = [px[x, y] for x in span]
            prof.append((y, sum(v) / len(v)))
    else:
        span = range(y0, y1, 2)
        prof = []
        for x in range(x0, x1):
            v = [px[x, y] for y in span]
            prof.append((x, sum(v) / len(v)))
    vals = [v for _, v in prof]
    if not vals:
        return []
    lo, hi = min(vals), max(vals)
    thr = lo + (hi - lo) * 0.30
    hits = [i for i, (_, v) in enumerate(prof) if v < thr]
    groups = []
    for i in hits:
        if groups and i - groups[-1][-1] <= 2:
            groups[-1].append(i)
        else:
            groups.append([i])
    return [prof[int(sum(g) / len(g))][0] for g in groups if len(g) >= 1]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("用法: python probe_item.py <id> [--row y1 y2 ...] [--box] [--grid [step]] [--all]"); sys.exit(1)
    if args[0] == "--all":
        import glob
        for pp in sorted(glob.glob(os.path.join(BASES, "Krea2_Item_*.png"))):
            n = os.path.basename(pp)[11:-4]
            if n.endswith("_old") or "_old" in n:
                continue
            (x0, y0, x1, y1), thr = bright_box(n)
            print("%-18s 纸面 x %4d..%4d  y %4d..%4d   中心(%4d,%4d)  阈值%d"
                  % (n, x0, x1, y0, y1, (x0 + x1) // 2, (y0 + y1) // 2, thr))
        sys.exit(0)
    iid = args[0]
    if "--grid" in args:
        i = args.index("--grid")
        st = int(args[i + 1]) if len(args) > i + 1 and args[i + 1].isdigit() else 100
        grid(iid, st); sys.exit(0)
    im, px = load(iid)
    W, H = im.size
    print("%s  size=%dx%d" % (iid, W, H))
    if "--row" in args:
        i = args.index("--row")
        ys = [int(v) for v in args[i + 1:]]
        rows(im, px, ys)
    elif "--box" in args:
        centroid(im, px)
    else:
        rows(im, px, range(int(H * 0.12), int(H * 0.96), int(H * 0.06)))
        centroid(im, px)
