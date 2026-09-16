# -*- coding: utf-8 -*-
"""
本地抠图（纯 PIL，无需 ML / 外部服务）
原理：立绘背景是「中性灰纯色」+ 无阴影 -> 全局色彩键控即可干净分离。
- 从四角采样背景色
- 逐通道差值阈值 -> 背景掩膜 -> 反相得人物 alpha
- 高斯软化边缘（1px 抗锯齿）
- 额外：从边框 floodfill 兜底清除「与边框连通的近背景残留」（应对轻微渐晕）
- 输出：<name>_alpha.png（透明）+ <name>_preview.png（贴在深色上看效果）
"""
import os, sys, statistics
from PIL import Image, ImageChops, ImageFilter, ImageDraw

D = r"<project>/story-wip/素材/<game>_assets/char_busts"


def bg_color(im, patch=24):
    W, H = im.size
    pts = [(0, 0), (W - patch, 0), (0, H - patch), (W - patch, H - patch)]
    vals = []
    for (x, y) in pts:
        vals += list(im.crop((x, y, x + patch, y + patch)).getdata())
    return tuple(int(statistics.median([c[i] for c in vals])) for i in range(3))


def matte(src, out_alpha, out_preview, T=30, S=12, soft=0.8, shrink=4):
    """色键 = 「接近背景色」AND「低饱和度(中性无彩)」。
    - 中性灰背景与其阴影都是无彩 -> 被抠掉（含被手臂围住的内侧背景）
    - 皮肤高光虽亮但带暖色相(有饱和度) -> 受保护，不会在脸上打洞
    - 深色衣物与背景差异大 -> 受保护
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    bg = bg_color(im)
    solid = Image.new("RGB", (W, H), bg)
    diff = ImageChops.difference(im, solid)
    r, g, b = diff.split()

    def thr(ch):
        return ch.point(lambda v: 255 if v < T else 0)   # 接近背景色

    near = ImageChops.multiply(ImageChops.multiply(thr(r), thr(g)), thr(b))

    ro, go, bo = im.split()
    maxc = ImageChops.lighter(ImageChops.lighter(ro, go), bo)
    minc = ImageChops.darker(ImageChops.darker(ro, go), bo)
    spread = ImageChops.subtract(maxc, minc)
    low_sat = spread.point(lambda v: 255 if v < S else 0)   # 中性无彩

    bgmask = ImageChops.multiply(near, low_sat)
    alpha = ImageChops.invert(bgmask)
    for _ in range(max(0, shrink // 2)):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if soft > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(soft))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(out_alpha)
    print("  alpha ->", out_alpha, out.size, "bg=", bg, os.path.getsize(out_alpha), "bytes")

    prev = Image.new("RGB", (W, H), (40, 48, 60))
    prev.paste(im, (0, 0), alpha)
    prev.save(out_preview)
    print("  preview ->", out_preview)
    return out_alpha


def matte_green(src, out_alpha, out_preview, T=25, soft=0.8, shrink=4, despill=True):
    """绿幕抠图（chroma key green）。

    为什么需要它：中灰背景会**同时**撞上「白发/花白头发」和「无彩灰衣物」，
    导致大面积误抠（实测江砚灰毛衣、陆振声/老陈/老孙白发、老孙呢夹克全中招）。
    绿幕下白发、灰衣、黑衣、白衣、藏青/深蓝衣物在色相上全部远离绿色，
    判据改成「绿通道显著高于红/蓝」即可一次全解。
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    r, g, b = im.split()
    maxrb = ImageChops.lighter(r, b)
    diff = ImageChops.subtract(g, maxrb)          # g - max(r,b)，负值截为 0
    bgmask = diff.point(lambda v: 255 if v > T else 0)
    alpha = ImageChops.invert(bgmask)
    for _ in range(max(0, shrink // 2)):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if soft > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(soft))

    out_im = im
    if despill:
        # 去绿边：g = min(g, (r+b)/2)。中性色处 (r+b)/2 ≈ g，几乎无副作用
        avg = ImageChops.add(r, b, scale=2.0)
        g2 = ImageChops.darker(g, avg)
        out_im = Image.merge("RGB", (r, g2, b))

    out = out_im.convert("RGBA")
    out.putalpha(alpha)
    out.save(out_alpha)
    print("  alpha ->", out_alpha, out.size, os.path.getsize(out_alpha), "bytes")

    prev = Image.new("RGB", (W, H), (40, 48, 60))
    prev.paste(out_im, (0, 0), alpha)
    prev.save(out_preview)
    print("  preview ->", out_preview)
    return out_alpha


def is_green_bg(src, sample=24):
    """快速判断图是否为绿幕底（四角采样）。"""
    im = Image.open(src).convert("RGB")
    W, H = im.size
    bg = bg_color(im, sample)
    return bg[1] > max(bg[0], bg[2]) + 25, bg


def matte_tex(src, out_alpha, out_preview, T=34, S=14, MAD_T=7, radius=3,
              soft=0.8, shrink=4):
    """纹理感知色键（解决「灰发/无彩灰衣物 与 中灰背景 撞色」）。

    纯色键为什么不够：白发与灰毛衣的**中间调**会和背景落入同一亮度区间，
    逐通道阈值分辨不出 → 大面积误抠。
    但有个可靠差异：**背景是平坦的（无纹理），头发/针织有细密纹理**。
    于是加第三个判据「局部纹理强度 MAD 低」——只有同时满足
      「接近背景色」+「低饱和」+「局部平坦」的像素才算背景。
    - 灰发/毛发：MAD 高 → 受保护 ✅
    - 灰毛衣针织：MAD 中高 → 受保护 ✅
    - 臂间平滑阴影/渐变：MAD 低 → 正确被抠 ✅
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    bg = bg_color(im)
    solid = Image.new("RGB", (W, H), bg)
    diff = ImageChops.difference(im, solid)
    r, g, b = diff.split()

    def thr(ch, t):
        return ch.point(lambda v: 255 if v < t else 0)

    near = ImageChops.multiply(ImageChops.multiply(thr(r, T), thr(g, T)), thr(b, T))

    ro, go, bo = im.split()
    maxc = ImageChops.lighter(ImageChops.lighter(ro, go), bo)
    minc = ImageChops.darker(ImageChops.darker(ro, go), bo)
    low_sat = ImageChops.subtract(maxc, minc).point(lambda v: 255 if v < S else 0)

    # 局部纹理强度：灰度与自身均值之差的均值（MAD）
    gray = im.convert("L")
    mean = gray.filter(ImageFilter.BoxBlur(radius))
    mad = ImageChops.difference(gray, mean).filter(ImageFilter.BoxBlur(radius))
    flat = mad.point(lambda v: 255 if v < MAD_T else 0)

    bgmask = ImageChops.multiply(ImageChops.multiply(near, low_sat), flat)
    # 清掉孤立噪点
    bgmask = bgmask.filter(ImageFilter.MedianFilter(3))
    # 膨胀保证背景连通（防 floodfill 从噪声缝隙漏进人物）
    bgmask = bgmask.filter(ImageFilter.MaxFilter(3))

    # ★ 只保留「与画布四边连通」的背景：人物内部的破洞自动被填回
    #   为什么必须有这一步：深灰背景虽解决了白发，但会让**黑/深色衣物**
    #   （差仅 ~20）被判成背景 → 衣物上出现斑驳破洞。这些破洞都在人物内部、
    #   不与外围背景连通 → floodfill 只捞外围，破洞自然保住。
    #   而「臂间缝隙」上下开口、与外围连通 → 仍会被正确抠掉。
    fill = bgmask.copy()
    step = 6
    seeds = []
    for x in range(0, W, step):
        seeds += [(x, 0), (x, H - 1)]
    for y in range(0, H, step):
        seeds += [(0, y), (W - 1, y)]
    for p in seeds:
        if fill.getpixel(p) > 128:
            ImageDraw.floodfill(fill, p, 128, thresh=0)
    outer_bg = fill.point(lambda v: 255 if v == 128 else 0)

    alpha = ImageChops.invert(outer_bg)
    for _ in range(max(0, shrink // 2)):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if soft > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(soft))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(out_alpha)
    print("  alpha ->", out_alpha, out.size, "bg=", bg, os.path.getsize(out_alpha), "bytes")

    prev = Image.new("RGB", (W, H), (40, 48, 60))
    prev.paste(im, (0, 0), alpha)
    prev.save(out_preview)
    print("  preview ->", out_preview)
    return out_alpha


def matte_cyan(src, out_alpha, out_preview, HUE_T=20, soft=0.8, shrink=4, despill=True):
    """青幕抠图（cyan background）—— 灰阶背景的终结方案。

    核心：**用色调判据而非亮度判据**。
    - 青幕与人物任何元素在**色相**上都不同，而色相与明暗无关 → 天然容忍背景的光照渐变
      （用「逐通道亮度差」判据时，背景的明暗渐变会漏判 → 残留斑块，实测踩过）。
    - 判据 = `g - r > HUE_T 且 b - r > HUE_T`（青色 = 绿蓝都显著高于红）。
    - 实测该判据下：白发/灰衣/黑衣/藏青衣/棕衣/白人肤色 **全部安全**（它们 g 都不显著高于 r）。
    - 唯一禁忌：青/绿色衣物 —— 本剧无。
    - despill：青溢色让边缘 R 偏低 → 修正 r = max(r, min(g,b))。
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    ro, go, bo = im.split()

    def over(ch, base, t):
        """ch - base > t （负值自动截为 0）"""
        return ImageChops.subtract(ch, base).point(lambda v: 255 if v > t else 0)

    bgmask = ImageChops.multiply(over(go, ro, HUE_T), over(bo, ro, HUE_T))
    bgmask = bgmask.filter(ImageFilter.MedianFilter(3))
    bgmask = bgmask.filter(ImageFilter.MaxFilter(3))

    # 只保留与画布四边连通的背景（人物内部破洞自动填回）
    fill = bgmask.copy()
    step = 4
    seeds = []
    for x in range(0, W, step):
        seeds += [(x, 0), (x, H - 1)]
    for y in range(0, H, step):
        seeds += [(0, y), (W - 1, y)]
    for p in seeds:
        if fill.getpixel(p) > 128:
            ImageDraw.floodfill(fill, p, 128, thresh=0)
    outer_bg = fill.point(lambda v: 255 if v == 128 else 0)
    alpha = ImageChops.invert(outer_bg)
    for _ in range(max(0, shrink // 2)):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if soft > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(soft))

    out_im = im
    if despill:
        mgb = ImageChops.darker(go, bo)          # min(g,b)
        r2 = ImageChops.lighter(ro, mgb)         # r = max(r, min(g,b))
        out_im = Image.merge("RGB", (r2, go, bo))

    out = out_im.convert("RGBA")
    out.putalpha(alpha)
    out.save(out_alpha)

    # 统计背景残留（alpha 不透明但明显是青色的像素）辅助判断
    chk = ImageChops.multiply(over(go, ro, 40), over(bo, ro, 40))
    print("  alpha ->", out_alpha, out.size, os.path.getsize(out_alpha), "bytes")

    prev = Image.new("RGB", (W, H), (40, 48, 60))
    prev.paste(out_im, (0, 0), alpha)
    prev.save(out_preview)
    print("  preview ->", out_preview)
    return out_alpha


def matte_light(src, out_alpha, out_preview, L_T=26, S_T=22, soft=0.8, shrink=6):
    """浅底（白/浅灰）抠图 —— Krea2 有时无视「青幕/绿幕」提示直接给浅灰白底时的兜底。

    判据 = 「与四角采样底色的逐通道差都 < L_T」AND「低饱和(spread < S_T)」。
    - L_T 是**差值**阈值（不是绝对亮度）：底色常有暗角/渐变，固定亮度阈值会在
      画布角落漏判 → 残留白线（实测踩过）。
    - 适合：黑/深色头发 + 中深色衣物的角色（如江砚：黑发 + 中灰毛衣 ≈140）
    - 不安全：白色/米白衣物、银白发（会与浅底撞色）→ 这类必须先重出青幕
    - shrink 默认给到 6（收缩约 3px），把边缘抗锯齿形成的白边一并啃掉
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    bg = bg_color(im)
    ro, go, bo = im.split()
    maxc = ImageChops.lighter(ImageChops.lighter(ro, go), bo)
    minc = ImageChops.darker(ImageChops.darker(ro, go), bo)

    # 判据 = 「接近采样到的底色」AND「低饱和」
    #   用「相对底色的逐通道差」而非绝对亮度阈值：底色常有暗角/渐变，
    #   固定阈值会漏掉偏暗的角落（实测底边残留白线）。
    solid = Image.new("RGB", (W, H), bg)
    diff = ImageChops.difference(im, solid)
    dr, dg, db = diff.split()

    def thr(ch):
        return ch.point(lambda v: 255 if v < L_T else 0)

    near = ImageChops.multiply(ImageChops.multiply(thr(dr), thr(dg)), thr(db))
    low_sat = ImageChops.subtract(maxc, minc).point(lambda v: 255 if v < S_T else 0)

    bgmask = ImageChops.multiply(near, low_sat)
    bgmask = bgmask.filter(ImageFilter.MedianFilter(3))
    bgmask = bgmask.filter(ImageFilter.MaxFilter(3))

    # 只保留与画布四边连通的背景（人物内部浅色高光/白点自动填回）
    fill = bgmask.copy()
    step = 4
    seeds = []
    for x in range(0, W, step):
        seeds += [(x, 0), (x, H - 1)]
    for y in range(0, H, step):
        seeds += [(0, y), (W - 1, y)]
    for p in seeds:
        if fill.getpixel(p) > 128:
            ImageDraw.floodfill(fill, p, 128, thresh=0)
    outer_bg = fill.point(lambda v: 255 if v == 128 else 0)

    alpha = ImageChops.invert(outer_bg)
    for _ in range(max(0, shrink // 2)):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    if soft > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(soft))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(out_alpha)
    print("  alpha ->", out_alpha, out.size, os.path.getsize(out_alpha), "bytes")

    prev = Image.new("RGB", (W, H), (40, 48, 60))
    prev.paste(im, (0, 0), alpha)
    prev.save(out_preview)
    print("  preview ->", out_preview)
    return out_alpha


def bg_kind(src, patch=24):
    """采样四角底色，判定该用哪种色键。返回 (mode, 采样色)。

    存在的意义：Krea2 **不总是听话** —— 提示词写「纯青幕」，它可能给浅灰底
    （实测陆昭/江砚就是这样）。逐张人工分辨既慢又容易错，故按底色的**色彩特征**
    自动选判据：
      - 青幕      : g-r>20 且 b-r>20      → matte_cyan（色调判据，容忍光照渐变）
      - 绿幕      : g-max(r,b)>25         → matte_green（白发/灰衣的安全解）
      - 浅底(>200): 三通道均很高           → matte_light（差值判据，容忍暗角）
      - 其余      : 中灰/深灰             → matte_tex（纹理感知，防灰发/灰衣误抠）
    """
    im = Image.open(src).convert("RGB")
    W, H = im.size
    bg = bg_color(im, patch)
    r, g, b = bg
    if g - r > 20 and b - r > 20:
        return "cyan", bg
    if g - max(r, b) > 25:
        return "green", bg
    if min(r, g, b) > 200:
        return "light", bg
    return "tex", bg


if __name__ == "__main__":
    # 用法：python matte_local.py <tag>...     tag 形如 "luzhao_blazer" / "zhouyu"
    #   前缀：g:=绿幕  t:=纹理  c:=青幕  l:=浅底  a:=自动判底色（推荐，不猜）
    items = sys.argv[1:] or ["luzhao_blazer", "luzhao_jacket"]
    for tag in items:
        mode = "gray"
        if tag[:2] in ("g:", "t:", "c:", "l:"):
            mode = {"g:": "green", "t:": "tex", "c:": "cyan", "l:": "light"}[tag[:2]]
            tag = tag[2:]
        elif tag[:2] == "a:":
            tag = tag[2:]
            src0 = os.path.join(D, "Krea2_Bust_%s_gray.png" % tag)
            if os.path.isfile(src0):
                mode, bg = bg_kind(src0)
                print("  自动判底色:", bg, "-> 用", mode)
            else:
                print("!! 缺文件", src0); continue
        src = os.path.join(D, "Krea2_Bust_%s_gray.png" % tag)
        if not os.path.isfile(src):
            print("!! 缺文件", src); continue
        print("== 抠图", tag, "(%s)" % mode, "==")
        dst = os.path.join(D, "Krea2_Bust_%s.png" % tag)
        pv = os.path.join(D, "_preview_%s.png" % tag)
        if mode == "green":
            matte_green(src, dst, pv)
        elif mode == "tex":
            matte_tex(src, dst, pv)
        elif mode == "cyan":
            matte_cyan(src, dst, pv)
        elif mode == "light":
            matte_light(src, dst, pv)
        else:
            matte(src, dst, pv)
    print("== DONE ==")
