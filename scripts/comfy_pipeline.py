#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI 客户端（云端 CloudStudio / Z-Image Turbo）
- 生成 6 张新背景（纯 txt2img，不透明）
- 把已生成的白底立绘/参考图上传云端，经 RMBG(RMBG-2.0, Alpha) 抠透明
- submit-all-then-poll：一次提交所有任务，轮询直到全完成，云端队列不空转
- 自动落位到 avg-engine/public/images/{bg,sprite}/

用法：
  python comfy_pipeline.py --go        # 生成背景 + 抠透明全部立绘 + 落位引擎
  python comfy_pipeline.py --bg        # 仅生成 6 背景
  python comfy_pipeline.py --rmbg      # 仅对已有白底立绘抠透明
  python comfy_pipeline.py --check     # 仅报告云端连通性
"""
import json, os, sys, time, uuid, traceback, re, glob
import urllib.request, urllib.parse, urllib.error

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

# 云端 ComfyUI 地址：IP 每次都会变化，优先读取本目录 comfy_url.txt（里面只放一行 URL）；
# 也可用 --url 覆盖。旧的写死地址仅作兜底。
_FALLBACK_URL = "https://18232dc1ee17484e8c093dc7f5def223--8188.ap-shanghai2.cloudstudio.club"
def _resolve_comfy_url(override=None):
    if override:
        return override.rstrip("/")
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, "comfy_url.txt")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            u = f.read().strip()
            if u:
                return u.rstrip("/")
    return _FALLBACK_URL
COMFY_URL = _resolve_comfy_url()
BASE_WF     = r"<project>/story-wip/素材/comfyui-api-A10.json"
GEN_DIR     = r"<project>/story-wip/素材/generated"
WF_DIR      = r"<project>/story-wip/素材/workflows"
ENGINE_BG   = r"<avg-engine>/public/images/bg"
ENGINE_SPR  = r"<avg-engine>/public/images/sprite"
os.makedirs(GEN_DIR, exist_ok=True)
os.makedirs(WF_DIR, exist_ok=True)
os.makedirs(ENGINE_BG, exist_ok=True)
os.makedirs(ENGINE_SPR, exist_ok=True)

NEG_GLOBAL = "lowres, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, signature, blurry, jpeg artifacts, mutated, deformed, ugly, poorly drawn, extra digits, cropped, out of frame, duplicate, plain, dull, unattractive, bland, flat lighting, mediocre"

# ---------- 背景图（纯 txt2img，不透明） ----------
BG_JOBS = [
    # --- 第一批：已出图（10 张）---
    dict(name="rooftop", seed=501, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, empty high school rooftop, metal railing, clean open rooftop floor in the foreground with plenty of clear empty space for character sprites to stand on, no people, no humans, no figures, no characters, nobody, spring, distant sea horizon with a silver shimmering line, sea breeze, a few cherry blossom petals floating, warm golden sunlight, blue sky with layered clouds"),
    dict(name="rooftop_sunset", seed=501, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, empty high school rooftop, metal railing, clean open rooftop floor in the foreground with plenty of clear empty space for character sprites to stand on, no people, no humans, no figures, no characters, nobody, distant sea horizon, sea now darker with a shimmering sunset reflection, silhouetted shoreline, sea breeze, a few cherry blossom petals floating, dramatic orange and purple gradient sunset sky with layered clouds, warm low golden-hour light fading to magenta, sun touching the horizon"),
    dict(name="library", seed=502, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, interior of an old Japanese high school library on the third floor, large floor-to-ceiling windows facing the deep blue sea horizon, wooden bookshelves lining the walls filled with colorful hardcover books, a few empty reading desks and chairs pushed neatly aside, warm golden afternoon sunlight streaming diagonally through the windows creating volumetric god rays and dust motes floating in light beams, polished wooden floor reflecting soft light, quiet peaceful atmosphere, absolutely no people no humans no figures nobody, spacious clean foreground area suitable for placing character sprites on top, cherry blossom petals drifting near the window sill, distant sea view with shimmering water surface under bright blue sky with layered cumulus clouds"),
    dict(name="sea", seed=503, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, soft shadows, atmospheric, detailed background, anime, high quality, seaside with a small white lighthouse, ocean waves, rocky shore, clear blue sky, sea breeze, peaceful, wide horizon"),
    dict(name="playground", seed=504, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, soft shadows, atmospheric, detailed background, anime, high quality, school playground, rows of club recruitment tents and stalls, banners, cherry blossom trees in background, lively spring afternoon, students in uniform"),
    dict(name="rehearsal", seed=505, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, interior of a school rehearsal room, large mirrors covering one wall, polished wooden floor, theatrical stage props and stacked scenery panels in the back, a few chairs and music stands pushed neatly aside, warm soft afternoon light streaming through high windows creating volumetric god rays and dust motes floating in the light beams, quiet peaceful atmosphere, absolutely no people no humans no figures nobody, spacious clean foreground area suitable for placing character sprites, calm and empty"),
    dict(name="corridor", seed=506, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, soft shadows, atmospheric, detailed background, anime, high quality, school corridor, lockers along the wall, large windows with afternoon light, dust in light beams, quiet, spring"),
    dict(name="classroom_eve", seed=507, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, interior of a high school classroom, rows of desks, green blackboard, large windows with evening dusk glow outside showing gradient orange and purple sky, warm desk-lamp light pools on the desks, empty and quiet, no people no humans no figures nobody, spacious clean foreground area suitable for placing character sprites, dust motes floating in the light beams, peaceful after-school atmosphere"),
    dict(name="library_eve", seed=502, w=1280, h=720,
         pos="makoto shinkai style, beautiful cinematic lighting, volumetric light, god rays, soft shadows, atmospheric, aerial perspective, detailed background, anime, high quality, 8k, masterpiece, interior of an old Japanese high school library on the third floor, large floor-to-ceiling windows facing the deep blue sea horizon now dim with evening light, wooden bookshelves lining the walls filled with colorful hardcover books, a few empty reading desks and chairs pushed neatly aside, warm lamplight pools in the evening dim, quiet peaceful atmosphere, absolutely no people no humans no figures nobody, spacious clean foreground area suitable for placing character sprites, cherry blossom petals drifting near the window sill, dusk glow on the horizon"),
    dict(name="street_dusk", seed=525, w=1280, h=720,
         pos="makoto shinkai style, anime movie still, vibrant youthful atmosphere, bright and airy, luminous clear lighting, vivid colors, cinematic composition, soft diffuse shadows, atmospheric perspective, rich detailed background, sparkling light, high quality, 8k, masterpiece, a high school front gate in the soft glowing dusk, an ornate wrought-iron school gate with a stone archway in the center, a clean paved path leading straight through the gate into the campus, in the far distance a multi-story school building with rows of large windows reflecting the warm sky light, silhouetted against the sky, the dusk sky is bright and translucent, a gentle gradient from warm peach and gold near the horizon to soft cyan and lavender high above, scattered soft glowing clouds, soft long shadows of the gate railings stretching across the path, a few roadside trees and a low hedge lining the path, warm pools of light from street lamps just beginning to glow, gentle floating dust motes and a few cherry blossom petals drifting in the air, peaceful lively youth campus mood, spacious clean foreground area suitable for placing character sprites, no people, no humans, no figures, no characters, nobody, no text, no letters, no words, no signboard, no plaque"),
    # --- 第二批：缺失背景补全（3 张，2026-08-25 新增）---
    dict(name="cafe", seed=511, w=1280, h=720, steps=12,
         pos="makoto shinkai style, breathtaking cinematic lighting, warm volumetric god rays, soft golden shadows, atmospheric perspective, rich detailed anime movie still, high quality, 8k, masterpiece, interior of an elegant Japanese-style cafe and milk-tea shop in a quiet coastal town, late-afternoon sunlight pouring through tall glass windows forming luminous light beams and gentle god rays with floating dust motes, warm amber pendant lamps on the ceiling casting golden pools, polished wooden floor reflecting amber highlights, a clean wooden counter in the background with an espresso machine and pastries under glass, potted green plants on the windowsill, through the window a calm cherry-blossom-lined street under bright blue sky with layered clouds, an empty wooden table and round chair in the immediate foreground leaving plenty of clear empty space for character sprites, intimate refined cozy mood, cinematic color grading, soft shallow depth of field, subtle film grain, absolutely no people no humans no figures nobody, spacious clean foreground",
         neg="person, human, people, figure, character, man, woman, crowd, crowd of people, silhouette of a person, lowres, bad anatomy, blurry, jpeg artifacts, text, watermark, signature, extra digits, cropped, out of frame, dull, flat lighting, oversaturated, washed out"),
    dict(name="ending_good", seed=515, w=1280, h=720, steps=16,
         pos="makoto shinkai style, breathtaking cinematic lighting, dramatic golden-hour color grading, volumetric god rays piercing through blossom branches, soft rim light on petals, atmospheric depth, richly detailed anime movie still, high quality, 8k, masterpiece, intricate highly detailed cherry blossom trees forming a magnificent natural tunnel archway over a garden path on a school rooftop, thousands of individual delicate pink and white petals with fine detail, gnarled branches with visible bark texture, complex layered composition, countless petals drifting and dancing in warm golden-hour light, a sky filled with structured volumetric clouds of varied tones and internal highlights rather than a plain wash, gradient from soft peach and rose-gold at the horizon to lavender and deep orange above with complex cloud structure, dreamy bokeh, gentle breeze, distant silhouette of the school building and a shimmering sea horizon softened by petal haze, completely empty open foreground with generous clear space, romantic hopeful heartwarming mood, cinematic composition, subtle film grain, sharp focus, fine detail everywhere, absolutely empty scene, zero humans, zero people, zero figures, zero characters, no silhouettes, no couples, no pairs, no standing figures, nobody, nothing alive, spacious pristine clean foreground area only",
         neg="person, human, people, figure, character, man, woman, boy, girl, crowd, couple, pair, two people, standing together, holding hands, silhouette of person, silhouette of couple, human shape, humanoid form, lowres, bad anatomy, blurry, jpeg artifacts, text, watermark, extra digits, cropped, dull, flat lighting, oversaturated, washed out, flat color, solid color blocks, posterized, low detail, simple, minimal, plain, plain color regions, banding"),
    dict(name="ending_normal", seed=516, w=1280, h=720, steps=16,
         pos="makoto shinkai style, breathtaking cinematic lighting, soft diffused early-morning light, gentle long shadows, atmospheric haze, richly detailed anime movie still, high quality, 8k, masterpiece, a quiet school gate path and platform in the fresh early morning, intricate highly detailed cherry trees with most petals fallen leaving tender new green leaves with visible vein texture and individual leaf detail, a few last pink petals scattered on the wet textured pavement and drifting in the cool morning air, pale blue sky with thin wispy structured clouds of varied tone, soft cyan and warm gold morning light with atmospheric variation, a clean paved path with visible stone texture extending into the distance suggesting a journey forward, dimly glowing street lamps with warm halos, peaceful bittersweet atmosphere of moving forward and growing up, cinematic composition, gentle depth of field, subtle film grain, sharp focus, fine detail everywhere, absolutely no people no humans no figures nobody, spacious clean foreground for character sprites, serene beautiful melancholy",
         neg="person, human, people, figure, character, man, woman, boy, girl, crowd, couple, pair, silhouette of a person, human shape, lowres, bad anatomy, blurry, jpeg artifacts, text, watermark, extra digits, cropped, dull, flat lighting, oversaturated, washed out, flat color, solid color blocks, posterized, low detail, simple, minimal, plain, plain color regions, banding"),
]

# 已生成的白底立绘/参考图（保留已确认的脸，仅抠透明）
SPRITE_FILES = [
    "linwan_default_00001_.png","linwan_happy_00001_.png","linwan_sad_00001_.png","linwan_surprised_00001_.png",
    "shenzhiyao_default_00001_.png","shenzhiyao_smile_00001_.png","shenzhiyao_sad_00001_.png","shenzhiyao_surprised_00001_.png",
    "zhouye_default_00001_.png","zhouye_serious_00001_.png","zhouye_surprised_00001_.png","zhouye_worried_00001_.png",
    "wanglaoshi_default_00001_.png",
    "linwan_ref_00003_.png","shenzhiyao_ref_00001_.png","zhouye_ref_00001_.png","wanglaoshi_ref_00001_.png",
]

def canonical(name):
    """linwan_default_00001_.png -> linwan_default.png"""
    m = re.match(r"^(.+)_\d{5}_\.png$", name)
    return (m.group(1) if m else name[:-4]) + ".png"

# ---------- HTTP ----------
def api(req_path, data=None, raw=None, timeout=90, method=None):
    url = COMFY_URL + req_path
    hdr = {"Cache-Control": "no-cache", "Pragma": "no-cache"}
    if raw is not None:
        hdr["Content-Type"] = "application/json"
        r = urllib.request.Request(url, data=raw, headers=hdr, method=method or "POST")
    elif data is not None:
        hdr["Content-Type"] = "application/json"
        r = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=hdr, method=method or "POST")
    else:
        r = urllib.request.Request(url, headers=hdr, method=method or "GET")
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", "replace")
    if not body:
        return {}
    return json.loads(body)

def check():
    s = api("/system_stats")
    print("云端连通：", "OK" if "system" in s else "异常", "| 设备数:", len(s.get("system", {}).get("devices", [])))

def upload_image(path):
    boundary = "----comfyboundary"
    bd = boundary.encode()
    with open(path, "rb") as f:
        data = f.read()
    fn = os.path.basename(path).encode()
    body = b""
    body += b"--" + bd + b"\r\n"
    body += b'Content-Disposition: form-data; name="image"; filename="' + fn + b'"\r\n'
    body += b"Content-Type: application/octet-stream\r\n\r\n" + data + b"\r\n"
    body += b"--" + bd + b"--\r\n"
    req = urllib.request.Request(COMFY_URL + "/upload/image", data=body,
                                 headers={"Content-Type": "multipart/form-data; boundary=" + boundary})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))

def load_base():
    with open(BASE_WF, encoding="utf-8") as f:
        return json.load(f)

def build_bg_wf(job):
    wf = json.loads(json.dumps(load_base()))
    pos_n = wf["70"]["inputs"]["positive"][0]
    neg_n = wf["70"]["inputs"]["negative"][0]
    wf[pos_n]["inputs"]["text"] = job["pos"]
    wf[neg_n]["inputs"]["text"] = job.get("neg", NEG_GLOBAL)
    wf["70"]["inputs"]["seed"] = job["seed"]
    if "steps" in job:
        wf["70"]["inputs"]["steps"] = job["steps"]
    if "cfg" in job:
        wf["70"]["inputs"]["cfg"] = job["cfg"]
    wf["68"]["inputs"]["width"] = job["w"]
    wf["68"]["inputs"]["height"] = job["h"]
    wf["9"]["inputs"]["filename_prefix"] = job["name"]
    return wf

def build_rmbg_wf(uploaded_name, out_name):
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": uploaded_name}},
        "2": {"class_type": "RMBG", "inputs": {
            "image": ["1", 0], "model": "RMBG-2.0", "sensitivity": 1.0,
            "process_res": 1024, "mask_blur": 0, "mask_offset": 0,
            "invert_output": False, "refine_foreground": True,
            "background": "Alpha", "background_color": "#000000"}},
        "3": {"class_type": "SaveImage", "inputs": {
            "images": ["2", 0], "filename_prefix": out_name, "compress_level": 4}},
    }

# ---------- 落位 ----------
def save_outputs(node, out_name, engine_sub):
    outs = node.get("outputs", {})
    saved = []
    for nid, o in outs.items():
        for img in o.get("images", []):
            fn, sub, typ = img["filename"], img.get("subfolder", ""), img.get("type", "output")
            url = (COMFY_URL + "/view?filename=" + urllib.parse.quote(fn)
                   + "&subfolder=" + urllib.parse.quote(sub) + "&type=" + urllib.parse.quote(typ))
            with urllib.request.urlopen(url, timeout=90) as r:
                data = r.read()
            raw = os.path.join(GEN_DIR, fn)
            with open(raw, "wb") as f:
                f.write(data)
            # canonical 名：generated/ + 引擎目录
            can = os.path.join(GEN_DIR, out_name)
            with open(can, "wb") as f:
                f.write(data)
            eng = os.path.join(engine_sub, out_name)
            with open(eng, "wb") as f:
                f.write(data)
            saved.append(eng)
            print(f"  -> {eng} ({len(data)} bytes)")
    return saved

def extract_error(node):
    for m in node.get("status", {}).get("messages", []):
        if m[0] == "execution_error":
            return json.dumps(m[1], ensure_ascii=False)[:400]
    return None

def submit(wf):
    r = api("/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})
    pid = r.get("prompt_id")
    if not pid:
        raise RuntimeError("提交失败: " + json.dumps(r, ensure_ascii=False)[:200])
    return pid

def run_pipeline(specs, overall_timeout=2400):
    """specs: list of {wf, out_name, engine_sub}. 一次全提交，轮询到全部完成。"""
    print(f"== 提交 {len(specs)} 个任务到云端队列 ==")
    pending = []
    for s in specs:
        try:
            pid = submit(s["wf"])
            pending.append((pid, s))
            print(f"  submitted {s['out_name']} -> {pid[:8]}")
        except Exception as e:
            print(f"  [提交失败] {s['out_name']}: {e}")
    done, failed = [], []
    deadline = time.time() + overall_timeout
    while pending and time.time() < deadline:
        for item in list(pending):
            pid, s = item
            try:
                h = api(f"/history/{pid}")
            except Exception:
                continue
            if pid in h:
                node = h[pid]
                err = extract_error(node)
                if err:
                    failed.append((s, err)); pending.remove(item); continue
                if node.get("outputs"):
                    save_outputs(node, s["out_name"], s["engine_sub"])
                    done.append(s); pending.remove(item)
        if pending:
            time.sleep(5)
    print(f"\n== 完成：成功 {len(done)} / 失败 {len(failed)} / 仍待处理 {len(pending)} ==")
    for s, e in failed:
        print("  FAILED", s["out_name"], "|", e)
    for s in pending:
        print("  PENDING", s[1]["out_name"])

def build_specs():
    specs = []
    for j in BG_JOBS:
        specs.append({"wf": build_bg_wf(j), "out_name": j["name"] + ".png", "engine_sub": ENGINE_BG})
    for fn in SPRITE_FILES:
        local = os.path.join(GEN_DIR, fn)
        if not os.path.exists(local):
            print(f"  [跳过] 本地缺少 {fn}")
            continue
        up = upload_image(local)
        up_name = up.get("name") or fn
        print(f"  uploaded {fn} -> {up_name}")
        specs.append({"wf": build_rmbg_wf(up_name, canonical(fn)),
                      "out_name": canonical(fn), "engine_sub": ENGINE_SPR})
    return specs

if __name__ == "__main__":
    raw = sys.argv[1:]
    # 解析 --url / --one 选项，其余交给原分支逻辑
    url_override = None
    one_name = None
    args = []
    i = 0
    while i < len(raw):
        a = raw[i]
        if a == "--url" and i + 1 < len(raw):
            url_override = raw[i + 1]; i += 2; continue
        if a == "--one" and i + 1 < len(raw):
            one_name = raw[i + 1]; i += 2; continue
        args.append(a); i += 1
    COMFY_URL = _resolve_comfy_url(url_override)
    print("ComfyUI endpoint:", COMFY_URL)
    if "--check" in args:
        check()
    elif "--bg" in args or one_name is not None:
        # --bg 或 --one 都走背景分支；--one 单独使用也只出过滤后的单张（不再触发全量）
        jobs = [j for j in BG_JOBS if (one_name is None or j["name"] == one_name)]
        if one_name and not jobs:
            print(f"[跳过] 未找到背景 '{one_name}'，可选：{{ {', '.join(j['name'] for j in BG_JOBS)} }}")
        else:
            print(f"== 出背景 {len(jobs)} 张：{{ {', '.join(j['name'] for j in jobs)} }} ==")
            run_pipeline([{"wf": build_bg_wf(j), "out_name": j["name"] + ".png", "engine_sub": ENGINE_BG} for j in jobs])
    elif "--rmbg" in args:
        specs = []
        for fn in SPRITE_FILES:
            local = os.path.join(GEN_DIR, fn)
            if not os.path.exists(local):
                continue
            up = upload_image(local); up_name = up.get("name") or fn
            specs.append({"wf": build_rmbg_wf(up_name, canonical(fn)), "out_name": canonical(fn), "engine_sub": ENGINE_SPR})
        run_pipeline(specs)
    else:  # --go（默认）
        print("开始全量生产：6 背景 + 17 立绘抠透明 + 落位引擎")
        run_pipeline(build_specs())
