#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 SaveImage 文件名前缀从云端历史抓取背景图并落位到引擎目录。

注：本云端部署的 /history/{pid} 单条接口行为异常（返回空），但 /history（全量）
正常。故改为全量扫描，按文件名前缀 cafe / ending_good / ending_normal 匹配并下载。
"""
import os, json, urllib.request, urllib.parse

UP = "http://127.0.0.1:8188"
ENGINE_BG = r"<avg-engine>/public/images/bg"
GEN_DIR = r"<project>/story-wip/素材/generated"
os.makedirs(ENGINE_BG, exist_ok=True)
os.makedirs(GEN_DIR, exist_ok=True)

WANT = ["cafe", "ending_good", "ending_normal"]


def get(p):
    with urllib.request.urlopen(UP + p, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def main():
    h = get("/history")
    # prefix -> list of (filename, subfolder, type)
    found = {w: [] for w in WANT}
    for pid, entry in (h.items() if isinstance(h, dict) else []):
        for nid, o in entry.get("outputs", {}).items():
            for img in o.get("images", []):
                fn = img.get("filename", "")
                for w in WANT:
                    if fn.startswith(w):
                        found[w].append((fn, img.get("subfolder", ""), img.get("type", "output")))

    for w in WANT:
        hits = found[w]
        if not hits:
            print(f"[缺失] {w}.png：历史中无匹配图像")
            continue
        fn, sub, typ = hits[0]  # 取第一张即可（同 seed 输出一致）
        url = (UP + "/view?filename=" + urllib.parse.quote(fn)
               + "&subfolder=" + urllib.parse.quote(sub) + "&type=" + urllib.parse.quote(typ))
        data = urllib.request.urlopen(url, timeout=90).read()
        out = os.path.join(ENGINE_BG, w + ".png")
        with open(out, "wb") as f:
            f.write(data)
        gen = os.path.join(GEN_DIR, w + ".png")
        with open(gen, "wb") as f:
            f.write(data)
        print(f"[OK] {w}.png <- {fn} ({len(data)} bytes) -> {out}", flush=True)


if __name__ == "__main__":
    main()
