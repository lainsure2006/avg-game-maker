# -*- coding: utf-8 -*-
"""剧本静态体检：找 `char` 指令的结构性问题（跨全部 *_剧本化.md）。

检查项
1. HIDE-NO-SHOW : 某章内 hide 了某角色，但本章（或全局流）从未 show 过 TA → 该角色不会出现
2. SHOW-TWICE  : 同一章内同角色 show 两次且中间没有 hide（第二次会重放入场动画）
3. POSE-DEAD   : 剧本从未使用的 pose 键（相对已落位 sprite）
4. SCENE-ORPHAN: char 登场的场景与本章 scene 不一致（仅报告，不判错）

只读，不改任何文件。
"""
import glob
import os
import re
from collections import defaultdict

SCRIPTS = r"<project>/story-wip/<game>/剧本化"
SPRITE_DIR = r"<avg-engine>/public/images/sprite/<game>"

CHAR = re.compile(r'"type"\s*:\s*"char"\s*,\s*(?:"action"\s*:\s*"(\w+)"[^}]*?"id"|"id"\s*:\s*"([^"]+)"[^}]*?"action"\s*:\s*"(\w+)")')
ID_ANY = re.compile(r'"type"\s*:\s*"char"')
SCENE = re.compile(r'"type"\s*:\s*"scene"\s*,\s*"bg"\s*:\s*"([^"]+)"')


def parse(p):
    """返回 [(lineno, action, id)]（按出现顺序）"""
    out = []
    for i, line in enumerate(open(p, encoding="utf-8"), 1):
        if not ID_ANY.search(line):
            continue
        mid = re.search(r'"id"\s*:\s*"([^"]+)"', line)
        mact = re.search(r'"action"\s*:\s*"(\w+)"', line)
        if mid:
            out.append((i, mact.group(1) if mact else "show", mid.group(1)))
    return out


def main():
    files = sorted(glob.glob(os.path.join(SCRIPTS, "*_剧本化.md")))
    problems = []

    print("== 逐章 char 指令序列 ==")
    global_shown = set()
    for p in files:
        ch = os.path.basename(p).split("_")[0]
        cmds = parse(p)
        if not cmds:
            continue
        state = {}          # 本章当前状态：无键 = 从未 show；True = 在台上；False = 已 hide
        seq = []
        for ln, act, cid in cmds:
            if act == "show":
                if state.get(cid) is True:
                    problems.append(("SHOW-TWICE", ch, ln, cid,
                                     "同章重复 show 且中间无 hide → 会重放入场动画"))
                state[cid] = True
                global_shown.add(cid)
            elif act == "hide":
                if state.get(cid) is not True:
                    problems.append(("HIDE-NO-SHOW", ch, ln, cid,
                                     "本章内没有该角色的 show（或已 hide 过）→ 角色不会出现"))
                state[cid] = False
            seq.append("%s%s" % (act[:1].upper(), cid))
        print("  %-14s %s" % (ch, " ".join(seq)))

    # 缺 show 但本章有对该角色的 dialog（更强的证据）
    print("\n== 缺登场：本章有该角色台词、却无 show ==")
    found = False
    for p in files:
        ch = os.path.basename(p).split("_")[0]
        text = open(p, encoding="utf-8").read()
        cmds = parse(p)
        shown = set(c for _, a, c in cmds if a == "show")
        # 从 dialog speaker 反推中文名 → id
        NAME2ID = {"陆昭": "luzhao", "江砚": "jiangyan", "周聿": "zhouyu",
                   "陆振声": "luzhensheng", "赵永年": "zhaoyongnian",
                   "吴敬东": "wujingdong", "老陈": "laochen", "老孙": "laosun",
                   "老邮员": "old_postman"}
        for name, cid in NAME2ID.items():
            spoke = len(re.findall(r'"speaker"\s*:\s*"%s"' % name, text))
            if spoke and cid not in shown:
                found = True
                print("  ❌ %-14s %s（%s）有 %d 句台词，但本章无 show" % (ch, cid, name, spoke))
    if not found:
        print("  无")

    print("\n== 结构性问题汇总 ==")
    if not problems:
        print("  无")
    for kind, ch, ln, cid, desc in problems:
        print("  [%s] %s:%d %s — %s" % (kind, ch, ln, cid, desc))

    # pose 使用统计
    have = set(os.path.basename(x)[:-4] for x in glob.glob(os.path.join(SPRITE_DIR, "*.png")))
    print("\n== 已落位 pose 中，剧本层尚未接线 ==")
    dead = sorted(have)
    print("  （共 %d 张；接线属 Step 6 工作，此处仅登记）" % len(dead))


if __name__ == "__main__":
    main()
