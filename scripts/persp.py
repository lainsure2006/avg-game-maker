# -*- coding: utf-8 -*-
"""透视贴图工具：把「纸面平面」上排好的文字层，按单应变换贴到底图的纸面四边形上。

为什么不能直接用 PIL：
- Image.QUAD / Image.PERSPECTIVE / Image.MESH 的语义都是「源四边形 → 目标矩形」，
  即**只能把斜的拉正**；而我们要的是反向「矩形 → 斜四边形」。（已实测 MESH 探针确认为反向语义）
- 环境无 numpy / scipy / cv2，装不上。
→ 结论：手写 3x3 单应矩阵 + 逐像素逆映射 + 双线性采样。

用法上的心智模型：
    文字层 ly 是一张 W×H 的透明画布，**它代表"摊平正视的一张纸"**。
    排版时用纸面坐标（可以直接写成整幅画布的百分比），不必关心底图里纸是歪的还是斜的。
    最后 paste_quad 把这张「平纸」拍到底图里那张真实存在的斜纸上。
"""
import os, sys, math
from PIL import Image

BASES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "<game>_assets", "item_bases")
W, H = 1280, 960


# ---------- 线性代数（3x3） ----------
def _inv3(m):
    a, b, c = m[0]; d, e, f = m[1]; g, h, i = m[2]
    A = e * i - f * h
    B = -(d * i - f * g)
    C = d * h - e * g
    D = -(b * i - c * h)
    E = a * i - c * g
    F = -(a * h - b * g)
    G = b * f - c * e
    Hh = -(a * f - c * d)
    I = a * e - b * d
    det = a * A + b * B + c * C
    if abs(det) < 1e-12:
        return None
    inv = [[A / det, D / det, G / det],
           [B / det, E / det, Hh / det],
           [C / det, F / det, I / det]]
    return inv


def homography_unit_to_quad(quad):
    """单位正方形 (u,v)∈[0,1]² → 四边形。

    quad 顶点顺序必须是 UL, UR, LR, LL（左上/右上/右下/左下）。
    公式来自 Heckbert《Fundamentals of Texture Mapping and Image Warping》附录。
    """
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    dx1 = x1 - x2; dx2 = x3 - x2; sx = x0 - x1 + x2 - x3
    dy1 = y1 - y2; dy2 = y3 - y2; sy = y0 - y1 + y2 - y3
    den = dx1 * dy2 - dx2 * dy1
    if abs(den) < 1e-9:
        return None
    g = (sx * dy2 - dx2 * sy) / den
    h = (dx1 * sy - sx * dy1) / den
    return [[x1 - x0 + g * x1, x3 - x0 + h * x3, x0],
            [y1 - y0 + g * y1, y3 - y0 + h * y3, y0],
            [g, h, 1.0]]


def pix_to_target(quad, w=W, h=H):
    """综合变换 M：源层像素 (X,Y) ∈ [0,w]x[0,h] → 目标图坐标。

    (X,Y) → (u,v)=(X/w, Y/h) → homography → 目标点
    """
    Hu = homography_unit_to_quad(quad)
    if Hu is None:
        return None
    return [[Hu[0][0] / w, Hu[0][1] / h, Hu[0][2]],
            [Hu[1][0] / w, Hu[1][1] / h, Hu[1][2]],
            [Hu[2][0] / w, Hu[2][1] / h, Hu[2][2]]]


# ---------- 透视贴图 ----------
def paste_quad(im, ly, quad, supersample=2):
    """把文字层 ly（纸面平面）透视贴到底图 im 的 quad 区域。

    supersample: 内部超采样倍数，用于抗锯齿（>1 时先放大再 warping，效果更平滑但更慢）。
    """
    quad = [(float(p[0]), float(p[1])) for p in quad]
    M = pix_to_target(quad)
    if M is None:
        raise ValueError("退化四边形")
    Minv = _inv3(M)
    if Minv is None:
        raise ValueError("不可逆变换")

    src = ly.convert("RGBA")
    if supersample > 1:
        src = src.resize((W * supersample, H * supersample), Image.LANCZOS)
        sw, sh = W * supersample, H * supersample
    else:
        sw, sh = W, H
    sdata = src.tobytes()

    xmin = max(0, int(min(p[0] for p in quad)) - 2)
    xmax = min(W, int(max(p[0] for p in quad)) + 3)
    ymin = max(0, int(min(p[1] for p in quad)) - 2)
    ymax = min(H, int(max(p[1] for p in quad)) + 3)

    out = im.convert("RGBA")
    dst = bytearray(out.tobytes())
    m00, m01, m02 = Minv[0]
    m10, m11, m12 = Minv[1]
    m20, m21, m22 = Minv[2]
    smax_x = sw - 2
    smax_y = sh - 2

    for y in range(ymin, ymax):
        wb = m21 * y + m22          # w 的常数部分
        xb = m01 * y + m02          # X 分子的常数部分
        yb = m11 * y + m12          # Y 分子的常数部分
        row = y * W
        for x in range(xmin, xmax):
            wgt = m20 * x + wb
            if -1e-9 < wgt < 1e-9:
                continue
            inv = 1.0 / wgt
            sx = (m00 * x + xb) * inv
            sy = (m10 * x + yb) * inv
            if sx < 0 or sy < 0 or sx > smax_x or sy > smax_y:
                continue
            ix = int(sx); iy = int(sy)
            fx = sx - ix; fy = sy - iy
            # 四邻域
            i00 = (iy * sw + ix) * 4
            i10 = i00 + 4
            i01 = i00 + sw * 4
            i11 = i01 + 4
            a0 = sdata[i00 + 3] + (sdata[i10 + 3] - sdata[i00 + 3]) * fx
            a1 = sdata[i01 + 3] + (sdata[i11 + 3] - sdata[i01 + 3]) * fx
            a = a0 + (a1 - a0) * fy
            if a <= 0.5:
                continue
            if a > 255:
                a = 255.0
            t = a / 255.0
            o = (row + x) * 4
            inv_a = 1.0 - t
            c0 = sdata[i00] + (sdata[i10] - sdata[i00]) * fx
            c1 = sdata[i01] + (sdata[i11] - sdata[i01]) * fx
            dst[o]     = int((c0 + (c1 - c0) * fy) * t + dst[o] * inv_a)
            c0 = sdata[i00 + 1] + (sdata[i10 + 1] - sdata[i00 + 1]) * fx
            c1 = sdata[i01 + 1] + (sdata[i11 + 1] - sdata[i01 + 1]) * fx
            dst[o + 1] = int((c0 + (c1 - c0) * fy) * t + dst[o + 1] * inv_a)
            c0 = sdata[i00 + 2] + (sdata[i10 + 2] - sdata[i00 + 2]) * fx
            c1 = sdata[i01 + 2] + (sdata[i11 + 2] - sdata[i01 + 2]) * fx
            dst[o + 2] = int((c0 + (c1 - c0) * fy) * t + dst[o + 2] * inv_a)
            av = dst[o + 3] + t * (255 - dst[o + 3])
            dst[o + 3] = int(av) if av < 255 else 255
    return Image.frombytes("RGBA", (W, H), bytes(dst))


def draw_quad(im, quad, color=(255, 60, 200), label=""):
    """调试用：把四边形画到图上并标角点序号。"""
    from PIL import ImageDraw, ImageFont
    im = im.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    pts = [(float(p[0]), float(p[1])) for p in quad]
    d.line(pts + [pts[0]], fill=color, width=3)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 22)
    except Exception:
        f = None
    for i, p in enumerate(pts):
        d.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(255, 230, 0))
        if f:
            d.text((p[0] + 6, p[1] - 12), "UL UR LR LL".split()[i], font=f, fill=(255, 230, 0))
    if label and f:
        d.text((12, 12), label, font=f, fill=(60, 255, 180))
    return im


# ---------- 纸面四边形求解（稳健版） ----------
def _otsu(g):
    h = g.histogram()
    tot = sum(h)
    best, bv = -1, 128
    sum_all = sum(i * h[i] for i in range(256))
    w0 = 0
    s0 = 0
    for v in range(256):
        w0 += h[v]
        if w0 == 0:
            continue
        w1 = tot - w0
        if w1 == 0:
            break
        s0 += v * h[v]
        m0 = s0 / w0
        m1 = (sum_all - s0) / w1
        var = w0 * w1 * (m0 - m1) ** 2
        if var > best:
            best, bv = var, v
    return bv


def _fill_rows(pm, w, h):
    """行内填充：把每行最左到最右之间的洞补上（纸面被折痕/暗纹割断时修复）。"""
    for y in range(h):
        xs = [x for x in range(w) if pm[x, y]]
        if not xs:
            continue
        for x in range(min(xs), max(xs) + 1):
            pm[x, y] = 255


def paper_mask(iid, clip=None, down=8):
    """求「纸面」二值掩膜（原尺寸）。返回 (mask, thr)。"""
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    g = Image.open(p).convert("L")
    ox, oy = 0, 0
    if clip:
        g = g.crop(clip)
        ox, oy = clip[0], clip[1]
    w, h = g.size
    sw, sh = max(8, w // down), max(8, h // down)
    sm = g.resize((sw, sh), Image.BILINEAR)
    thr = _otsu(sm)
    smp = sm.load()
    binm = [[smp[x, y] > thr for x in range(sw)] for y in range(sh)]

    seen = [[False] * sw for _ in range(sh)]
    best = []
    for y0 in range(sh):
        for x0 in range(sw):
            if binm[y0][x0] and not seen[y0][x0]:
                q = [(x0, y0)]
                seen[y0][x0] = True
                comp = []
                while q:
                    cx, cy = q.pop()
                    comp.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < sw and 0 <= ny < sh and not seen[ny][nx] and binm[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                if len(comp) > len(best):
                    best = comp
    m = Image.new("L", (sw, sh), 0)
    pm = m.load()
    for x, y in best:
        pm[x, y] = 255
    _fill_rows(pm, sw, sh)
    m = m.resize((w, h), Image.BILINEAR)
    # 回到全图坐标
    full = Image.new("L", (W, H), 0)
    full.paste(m, (ox, oy))
    return full.point(lambda v: 255 if v > 128 else 0), thr


def _fit_robust(pts):
    """两次最小二乘 + 2.5σ 剔除离群 → y = kx + b。"""
    for _ in range(2):
        n = len(pts)
        if n < 3:
            return None
        mx = sum(p[0] for p in pts) / n
        my = sum(p[1] for p in pts) / n
        den = sum((p[0] - mx) ** 2 for p in pts)
        if abs(den) < 1e-6:
            return None
        k = sum((p[0] - mx) * (p[1] - my) for p in pts) / den
        b = my - k * mx
        res = [abs(p[1] - (k * p[0] + b)) for p in pts]
        mean = sum(res) / n
        sd = (sum((r - mean) ** 2 for r in res) / n) ** 0.5 or 1.0
        keep = [p for p, r in zip(pts, res) if r <= mean + 2.5 * sd]
        if len(keep) == len(pts):
            break
        pts = keep
    return (k, b)


def _inter(l1, l2):
    if l1 is None or l2 is None:
        return None
    k1, b1 = l1
    k2, b2 = l2
    if abs(k1 - k2) < 1e-5:
        return None
    x = (b2 - b1) / (k1 - k2)
    return (x, k1 * x + b1)


def solve_quad(iid, clip=None, verbose=False):
    """求解纸面四边形 → [UL, UR, LR, LL]（原图坐标）。失败返回 None。"""
    mask, thr = paper_mask(iid, clip)
    px = mask.load()
    if clip:
        x0, y0, x1, y1 = clip
    else:
        x0, y0, x1, y1 = 0, 0, W, H

    Tpts, Bpts, Lpts, Rpts = [], [], [], []
    for x in range(x0 + 4, x1 - 4, 4):
        ys = [y for y in range(y0, y1) if px[x, y]]
        if len(ys) > (y1 - y0) * 0.12:
            Tpts.append((x, ys[0])); Bpts.append((x, ys[-1]))
    for y in range(y0 + 4, y1 - 4, 4):
        xs = [x for x in range(x0, x1) if px[x, y]]
        if len(xs) > (x1 - x0) * 0.12:
            Lpts.append((y, xs[0])); Rpts.append((y, xs[-1]))
    if min(len(Tpts), len(Bpts), len(Lpts), len(Rpts)) < 10:
        return None
    top = _fit_robust(Tpts)          # y = f(x)
    bot = _fit_robust(Bpts)
    left = _fit_robust(Lpts)         # x = f(y)（以 y 为自变量）
    right = _fit_robust(Rpts)

    def inv(l):
        if l is None:
            return None
        k, b = l
        if abs(k) < 1e-6:
            return None
        return (1.0 / k, -b / k)
    li, ri = inv(left), inv(right)
    if None in (top, bot, li, ri):
        return None
    TL = _inter(top, li)
    TR = _inter(top, ri)
    BR = _inter(bot, ri)
    BL = _inter(bot, li)
    if None in (TL, TR, BR, BL):
        return None
    quad = [TL, TR, BR, BL]
    if verbose:
        print("   thr=%d  top k=%.3f  bot k=%.3f  left k=%.3f  right k=%.3f" %
              (thr, top[0], bot[0], left[0], right[0]))
    return quad


# 每张图的检测先验（纸面大致所在区域；None = 全图搜）。来自首轮预览的实测复核。
CLIPS = {
    "letter7": None,
    "card_burnt": None,
    "note_lu": None,
    "report_copy": None,
    "report_p18": None,
    "old_book": None,
    "regular_list": None,
    "two_timelines": None,
    "fire_report_table": None,
    "newspaper_1020": None,
    "postmark": None,
}


if __name__ == "__main__":
    import measure_quad as MQ
    ids = [a for a in sys.argv[1:] if a in MQ.IDS] or MQ.IDS
    tw, th = 428, 321
    cols = 5
    rows = (len(ids) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (20, 22, 26))
    from PIL import ImageDraw
    for i, iid in enumerate(ids):
        p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
        im = Image.open(p).convert("RGB")
        quad = solve_quad(iid, CLIPS.get(iid))
        if quad is None:
            ImageDraw.Draw(im).text((20, 20), "quad 求解失败", fill=(255, 80, 80))
        else:
            tl, tr, br, bl = quad
            tilt = math.degrees(math.atan2(tr[1] - tl[1], tr[0] - tl[0]))
            wtop = math.hypot(tr[0] - tl[0], tr[1] - tl[1])
            wbot = math.hypot(br[0] - bl[0], br[1] - bl[1])
            im = draw_quad(im, quad, label="%s  tilt %.1f°  w比 %.2f" % (iid, tilt, wtop / wbot))
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    outp = os.path.join(BASES, "_透视框预览.png")
    sheet.save(outp)
    print("->", outp, os.path.getsize(outp))
