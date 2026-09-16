# -*- coding: utf-8 -*-
"""量化每张底图的纸面几何：四边是否平行、有无透视梯形。

目的：判断「单层旋转」能否贴合格线，还是必须上**透视（homography）**。

方法
1. 灰度 + 3px 高斯去噪 → 取亮度第 P 百分位为阈值，得「纸面」亮区 mask
2. 逐行取最长连续亮段（且须与上一行重叠，保证是同一张纸）→ 左右边界折线
3. 逐列同理 → 上下边界折线
4. 四条边界各自最小二乘拟合 → 求两两交点 = 纸面四边形四角
5. 输出：每条边的倾角、对角比、以及**透视强度**（上下边不平行度）
"""
import os, sys, math
from PIL import Image, ImageFilter

B = os.path.join(os.path.dirname(os.path.abspath(__file__)), "<game>_assets", "item_bases")

IDS = ["letter7", "card_burnt", "newspaper_1020", "fire_report_table", "photo_scorch",
       "photo_stain", "note_lu", "report_copy", "seven_papers", "report_p18",
       "tin_box", "regular_list", "old_book", "two_timelines", "postmark"]


def otsu_like(g, lo=45, hi=88):
    """返回使亮区占比落在 [lo,hi]% 的阈值。"""
    h = g.histogram()
    tot = sum(h)
    acc = 0
    target = tot * (1 - hi / 100.0)
    thr = 200
    for v in range(255, -1, -1):
        acc += h[v]
        if acc >= target:
            thr = v
            break
    return thr


def lin(pts):
    """最小二乘拟合 pts=[(x,y)] → (k, b) 使 y = k*x + b；竖直返回 None。"""
    n = len(pts)
    if n < 3:
        return None
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    den = sum((p[0] - mx) ** 2 for p in pts)
    if abs(den) < 1e-6:
        return None
    k = sum((p[0] - mx) * (p[1] - my) for p in pts) / den
    return (k, my - k * mx)


def inter(l1, l2):
    """两条 y=kx+b 直线求交；平行返回 None。"""
    if l1 is None or l2 is None:
        return None
    k1, b1 = l1
    k2, b2 = l2
    if abs(k1 - k2) < 1e-4:
        return None
    x = (b2 - b1) / (k1 - k2)
    return (x, k1 * x + b1)


def longest_run(row_vals):
    """row_vals = 该行各 x 是否在 mask 内 → 返回最长连续段 (a,b)。"""
    runs = []
    s = None
    for i, v in enumerate(row_vals):
        if v and s is None:
            s = i
        elif not v and s is not None:
            runs.append((s, i - 1)); s = None
    if s is not None:
        runs.append((s, len(row_vals) - 1))
    if not runs:
        return None
    return max(runs, key=lambda r: r[1] - r[0])


def analyze(iid, verbose=False):
    p = os.path.join(B, "Krea2_Item_%s.png" % iid)
    if not os.path.isfile(p):
        return None
    im = Image.open(p).convert("L").filter(ImageFilter.GaussianBlur(1.2))
    W, H = im.size
    px = im.load()
    thr = otsu_like(im)
    col_vals = [[px[x, y] > thr for y in range(H)] for x in range(0, W, 1)]
    row_vals = [[px[x, y] > thr for x in range(W)] for y in range(0, H, 1)]

    # --- 左右边界：逐行最长段，且与上一行有重叠（同一张纸） ---
    Lpts, Rpts = [], []
    prev = None
    for y in range(6, H - 6, 4):
        r = longest_run(row_vals[y])
        if r is None or r[1] - r[0] < W * 0.18:
            prev = None
            continue
        if prev is not None and not (r[0] < prev[1] and prev[0] < r[1]):
            continue
        Lpts.append((r[0], y)); Rpts.append((r[1], y))
        prev = r
    # --- 上下边界：逐列 ---
    Tpts, Bpts = [], []
    prev = None
    for x in range(6, W - 6, 4):
        r = longest_run(col_vals[x])
        if r is None or r[1] - r[0] < H * 0.18:
            prev = None
            continue
        if prev is not None and not (r[0] < prev[1] and prev[0] < r[1]):
            continue
        Tpts.append((x, r[0])); Bpts.append((x, r[1]))
        prev = r
    if len(Lpts) < 12 or len(Tpts) < 12:
        return {"err": "纸面区域检测不足 L=%d T=%d" % (len(Lpts), len(Tpts))}

    # 拟合：top/bottom 是 y=f(x)；left/right 是 x=f(y) → 交换坐标后同样按 y=f(x) 拟合
    top = lin(Tpts)
    bot = lin(Bpts)
    left = lin([(y, x) for x, y in Lpts])
    right = lin([(y, x) for x, y in Rpts])
    # left/right 拟合出来是 x = k*y + b（因为传的是 (y,x)），需要转回 y=g(x)
    def inv(l):
        if l is None:
            return None
        k, b = l
        if abs(k) < 1e-6:
            return None
        return (1.0 / k, -b / k)
    left_i, right_i = inv(left), inv(right)

    corners = {
        "TL": inter(top, left_i), "TR": inter(top, right_i),
        "BL": inter(bot, left_i), "BR": inter(bot, right_i),
    }
    if any(v is None for v in corners.values()):
        return {"err": "四角求解失败"}

    def ang(k):
        return math.degrees(math.atan(k)) if k is not None else None
    a_top, a_bot = ang(top[0]), ang(bot[0])
    a_left, a_right = ang(left_i[0]), ang(right_i[0])

    def dist(a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])
    w_top = dist(corners["TL"], corners["TR"])
    w_bot = dist(corners["BL"], corners["BR"])
    h_left = dist(corners["TL"], corners["BL"])
    h_right = dist(corners["TR"], corners["BR"])

    return {
        "thr": thr,
        "angles": {"top": a_top, "bottom": a_bot, "left": a_left, "right": a_right},
        "corners": corners,
        "ratio_wh": (w_top / w_bot if w_bot else None,
                     h_left / h_right if h_right else None),
        "avg_tilt": (a_top + a_bot) / 2 if a_top is not None and a_bot is not None else None,
        "skew": abs(a_top - a_bot) if a_top is not None and a_bot is not None else None,
    }


if __name__ == "__main__":
    args = sys.argv[1:] or IDS
    print("%-18s %7s %7s %7s %7s | %6s %6s | %s" %
          ("id", "top°", "bot°", "left°", "right°", "上/下宽", "左/右高", "判定"))
    print("-" * 100)
    for iid in args:
        r = analyze(iid)
        if not r or "err" in r:
            print("%-18s  %s" % (iid, (r or {}).get("err", "无底图")))
            continue
        a = r["angles"]
        rt, rh = r["ratio_wh"]
        sk = r["skew"]
        verdict = "✅近似正拍"
        if abs(r["avg_tilt"]) > 1.2:
            verdict = "↻ 纯倾斜 %.1f°" % r["avg_tilt"]
        if sk and sk > 1.5:
            verdict = "⚠️ 透视(梯形) skew=%.1f°" % sk
        if rt and (rt > 1.06 or rt < 0.94):
            verdict = "⚠️ 透视 上下宽比=%.2f" % rt
        print("%-18s %7.2f %7.2f %7.2f %7.2f | %6.2f %6.2f | %s" %
              (iid, a["top"], a["bottom"], a["left"], a["right"],
               rt if rt else -1, rh if rh else -1, verdict))
