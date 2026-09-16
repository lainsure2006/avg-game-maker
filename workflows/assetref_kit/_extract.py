# -*- coding: utf-8 -*-
import os
from PIL import Image

BASE = r"<project>/<project>/story-wip/素材/assetref_kit/AssetRef_Kit"

print("--- examples 尺寸 ---")
ex = os.path.join(BASE, "examples")
for f in sorted([os.path.join(ex, x) for x in os.listdir(ex) if x.endswith(".png")]):
    im = Image.open(f)
    print(os.path.basename(f), im.size, "ratio", round(im.size[0] / im.size[1], 2))

print("--- docs 行数 ---")
for d in ["README.md", "提示词模板.md", "经验与必坑.md", "method_2x2.py", "method_pano.py"]:
    p = os.path.join(BASE, d)
    n = sum(1 for _ in open(p, encoding="utf-8"))
    print(d, n, "lines")
