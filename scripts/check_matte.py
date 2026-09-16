# -*- coding: utf-8 -*-
"""体检：检查已抠好的立绘 alpha 是否真的透明、边缘有无色残留。"""
import os
from PIL import Image

D = r"<project>/story-wip/素材/<game>_assets/char_busts"

TAGS = ["luzhao_blazer", "luzhao_jacket", "zhouyu", "jiangyan", "luzhensheng",
        "laochen", "zhaoyongnian", "laosun", "wujingdong", "old_postman"]


def probe(tag):
    p = os.path.join(D, "Krea2_Bust_%s.png" % tag)
    if not os.path.isfile(p):
        return tag, None
    im = Image.open(p).convert("RGBA")
    W, H = im.size
    a = im.split()[3]
    px = a.load()
    corners = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
    # 四边框 6px 环带的平均 alpha
    ring = []
    for x in range(0, W, 7):
        ring += [px[x, 3], px[x, H - 4]]
    for y in range(0, H, 7):
        ring += [px[3, y], px[W - 4, y]]
    ring_avg = sum(ring) / len(ring)
    hist = a.histogram()
    trans = sum(hist[0:16]) / (W * H) * 100      # 全透明占比
    opaque = sum(hist[240:256]) / (W * H) * 100  # 全不透明占比
    return tag, dict(size=(W, H), corners=corners, ring_avg=round(ring_avg, 1),
                     trans=round(trans, 1), opaque=round(opaque, 1))


print("%-16s %-12s %-22s %8s %8s %8s" % ("tag", "size", "corners", "ring", "trans%", "opaque%"))
for t in TAGS:
    tag, r = probe(t)
    if r is None:
        print("%-16s MISSING" % tag)
        continue
    print("%-16s %-12s %-22s %8s %8s %8s" % (
        tag, "%dx%d" % r["size"], str(r["corners"]), r["ring_avg"], r["trans"], r["opaque"]))
