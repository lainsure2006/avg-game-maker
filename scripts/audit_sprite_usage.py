# -*- coding: utf-8 -*-
"""核对：剧本里用到的 `char` 立绘 (id, pose) vs 已落位的引擎 sprite 文件。

产出
- 逐 (id, pose) 的使用次数与出处章节
- 缺失清单（剧本要用、图没有）
- 冗余清单（图有、剧本没用）—— 提示是否白做/是否需要补剧本

只读，不改任何文件。
"""
import glob
import os
import re
import sys
from collections import defaultdict

SCRIPTS = r"<project>/story-wip/<game>/剧本化"
SPRITE_DIR = r"<avg-engine>/public/images/sprite/<game>"

# { "type": "char", "action": "show", "id": "laochen", "position": "right", "pose": "default" },
PAT = re.compile(r'"type"\s*:\s*"char"\s*,\s*"action"\s*:\s*"(\w+)"[^}]*?"id"\s*:\s*"([^"]+)"(?:[^}]*?"pose"\s*:\s*"([^"]+)")?')


def main():
    use = defaultdict(list)          # (id,pose) -> [file:line]
    for p in sorted(glob.glob(os.path.join(SCRIPTS, "*_剧本化.md"))):
        ch = os.path.basename(p).split("_")[0]
        with open(p, encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                for m in PAT.finditer(line):
                    act, cid, pose = m.group(1), m.group(2), m.group(3) or "default"
                    if act == "hide":
                        continue
                    use[(cid, pose)].append("%s:%d" % (ch, i))

    have = set()
    for p in glob.glob(os.path.join(SPRITE_DIR, "*.png")):
        have.add(os.path.basename(p)[:-4])

    print("== 剧本用到的 (id, pose) ==")
    print("%-26s %5s  %s" % ("id_pose", "次数", "出处"))
    missing = []
    for (cid, pose), locs in sorted(use.items(), key=lambda kv: -len(kv[1])):
        key = "%s_%s" % (cid, pose)
        flag = "" if key in have else "   ❌ 缺图"
        if key not in have:
            missing.append((key, locs))
        src = ", ".join(sorted(set(l.split(":")[0] for l in locs)))
        print("%-26s %5d  %s%s" % (key, len(locs), src, flag))

    unused = sorted(have - set("%s_%s" % k for k in use))
    print("\n== 缺失（剧本要用、图没有）==")
    print("  无 ✓" if not missing else "\n".join("  ❌ %s  ← %s" % (k, ", ".join(l[:14] for l in v[:3])) for k, v in missing))
    print("\n== 冗余（图有、剧本未用）==")
    print("  无" if not unused else "\n".join("  · %s" % u for u in unused))
    print("\n统计：剧本用到 %d 种 / 已落位 %d 张" % (len(use), len(have)))


if __name__ == "__main__":
    main()
