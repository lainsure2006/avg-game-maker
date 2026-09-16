# -*- coding: utf-8 -*-
"""
量测立绘的**构图尺度**，用来判定"换图时角色会不会突然变大/被裁掉"。

用 alpha 通道（RGBA 立绘的背景是透明的），取：
  top%    = 最上面一行不透明像素 / 画面高      → 头顶位置
  bottom% = 最下面一行不透明像素 / 画面高      → 人物被裁在哪
  w%      = 轮廓外接框宽度 / 画面宽
  head%   = 「头部带」高度估算：从 top 往下找第一处"宽度骤增"的行（肩线）→ (肩线-top)/H
            （粗略但够用：肩线处宽度会明显放大）

用法：python measure_sprite_frame.py
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

from PIL import Image  # noqa: E402

P = r"<avg-engine>/public/images/sprite/<game>"
B = r"<project>/story-wip/素材/<game>_assets/char_busts"

TARGETS = [
    ("luzhensheng_default   (基准)", os.path.join(P, "luzhensheng_default.png")),
    ("luzhensheng_side   A  ", os.path.join(B, "Krea2_Bust_luzhensheng_side.png")),
    ("luzhensheng_side   B  ", os.path.join(B, "Krea2_Bust_luzhensheng_side_blkfree.png")),
    ("zhouyu_default        (基准)", os.path.join(P, "zhouyu_default.png")),
    ("zhouyu_side        (参照)", os.path.join(P, "zhouyu_side.png")),
    ("luzhao_default        (基准)", os.path.join(P, "luzhao_default.png")),
    ("luzhao_side        (参照)", os.path.join(P, "luzhao_side.png")),
]


def rows_width(alpha, W, H, step=4):
    out = []
    px = alpha.load()
    for y in range(0, H, step):
        xs = [x for x in range(0, W, 3) if px[x, y] > 24]
        out.append((y, (max(xs) - min(xs) + 1) if xs else 0))
    return out


def head_height_pct(alpha, W, H, top_y):
    """估算「头高」占画面高的百分比 —— 用**颈部收窄**判定。

    🔴 **不可靠，仅供调试，不要写进提示词**（2026-09-16 实测）：
       在 20 张已落位立绘里只有 2 张能测出值（`luzhao_side` 14.4、
       `zhouyu_side` 4.2 —— 后者明显偏小），其余全部 `nan`。
       原因：头肩过渡处宽度剖面噪声大，局部极小常常不存在或不唯一。
       **判断构图尺度的可信指标是 `top%`（头顶位置），不是这个。**
    """
    prof = rows_width(alpha, W, H, step=3)
    prof = [(y, w) for y, w in prof if y <= top_y + H * 0.45]
    if len(prof) < 12:
        return float("nan"), None
    ys = [y for y, _ in prof]
    ws = [w for _, w in prof]
    # 3 点平滑
    sm = [ws[0]] + [(ws[i - 1] + ws[i] + ws[i + 1]) / 3.0 for i in range(1, len(ws) - 1)] + [ws[-1]]
    peak = max(sm)
    # 第一个局部极大
    imax = None
    for i in range(1, len(sm) - 1):
        if sm[i] >= sm[i - 1] and sm[i] > sm[i + 1] and sm[i] > peak * 0.55:
            imax = i
            break
    if imax is None:
        return float("nan"), None
    # 其后的第一个局部极小
    inek = None
    for i in range(imax + 1, len(sm) - 1):
        if sm[i] <= sm[i - 1] and sm[i] < sm[i + 1]:
            inek = i
            break
    if inek is None:
        return float("nan"), None
    return (ys[inek] - top_y) / H * 100.0, ys[inek]


def measure(path):
    im = Image.open(path)
    if im.mode != "RGBA":
        return None
    W, H = im.size
    a = im.split()[-1]
    pxa = a.load()
    rows = [y for y in range(0, H, 2) if any(pxa[x, y] > 24 for x in range(0, W, 3))]
    cols = [x for x in range(0, W, 2) if any(pxa[x, y] > 24 for y in range(0, H, 3))]
    if not rows or not cols:
        return None
    top, bot = rows[0], rows[-1]
    w = (cols[-1] - cols[0] + 1)
    head_h, neck_y = head_height_pct(a, W, H, top)
    return dict(W=W, H=H, top=100.0 * top / H, bot=100.0 * bot / H,
                w=100.0 * w / W, head=head_h, neck=neck_y)


def main():
    print("%-30s %-11s %7s %7s %7s %8s" % ("文件", "尺寸", "top%", "bottom%", "宽%", "头高%"))
    print("-" * 82)
    for label, p in TARGETS:
        if not os.path.isfile(p):
            print("%-30s  缺文件" % label)
            continue
        m = measure(p)
        if not m:
            print("%-30s  非RGBA/空图" % label)
            continue
        print("%-30s %4dx%-5d %7.1f %7.1f %7.1f %8.1f"
              % (label, m["W"], m["H"], m["top"], m["bot"], m["w"], m["head"]))


if __name__ == "__main__":
    main()
