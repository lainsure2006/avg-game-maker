# -*- coding: utf-8 -*-
"""
Krea2 人物资产参考图（角色设定表）生成器
技法来源：persona_asset_sheet_pack / persona_asset_sheet_guide.md（用户 CloudStudio 验证）

要点（与 SDXL 的本质区别）：
- Krea2 = Flux 系（DiT + Qwen3-VL 中文编码器）→ 一次出图即可正确排版多视图
- 节点：UNETLoader(unet) + CLIPLoader(type=krea2,device=cpu) + VAELoader
- 负提示：ConditioningZeroOut 零化（**不写负面词**）
- 采样：steps=8, cfg=1.0（固定，turbo 蒸馏）, euler + simple
- 尺寸：1536x768（左三视图 + 右面部特写）
- 提示词用**中文**
- save prefix 用唯一串，避免共享实例编号撞车
"""
import urllib.request, urllib.parse, ssl, json, time, os, sys

UNET = "krea2_turbo_int8_convrot.safetensors"
CLIP = "qwen3vl_4b_fp8_scaled.safetensors"
VAE = "qwen_image_vae.safetensors"
LORA_ANIME = "krea2/krea2_retroanime.safetensors"

# ---- 固定排版前缀（勿改版式描述）----
LAYOUT = ("角色设定参考图，一张图内包含该角色的多个视图："
          "左侧为三个全身视图并排（从左至右：正面、90度纯侧面、背面），"
          "右侧为一张面部特写。")
# ---- 风格词 ----
STYLE_REAL = "真人照片质感，写实摄影风格，高清摄影。"
STYLE_ANIME = "二次元动漫插画风格，日系动画，赛璐璐上色，2D illustration。"
# ---- 固定收尾（防缺陷）----
CLOSING = ("纯白背景，均匀影棚光线，无阴影，无文字，无 logo，高清，细节清晰，"
           "完整身体，双脚着地。")


def build_nodes(positive, prefix, anime=False, seed=0, w=1536, h=768):
    n = {
        "2": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP, "type": "krea2", "device": "cpu"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": positive}},
        "8": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": ""}},
        "7": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["8", 0]}},
        "9": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["4", 0]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }
    model_ref = ["2", 0]
    if anime:
        n["5"] = {"class_type": "LoraLoader",
                  "inputs": {"model": ["2", 0], "clip": ["3", 0], "lora_name": LORA_ANIME,
                             "strength_model": 1.0, "strength_clip": 1.0}}
        model_ref = ["5", 0]
    n["12"] = {"class_type": "KSampler",
               "inputs": {"model": model_ref, "positive": ["6", 0], "negative": ["7", 0],
                          "latent_image": ["9", 0], "seed": seed, "steps": 8, "cfg": 1.0,
                          "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}}
    return n


def make_opener():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx),
                                       urllib.request.ProxyHandler({}))


def submit(op, base, nodes):
    body = json.dumps({"prompt": nodes}).encode()
    req = urllib.request.Request(base + "/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    with op.open(req, timeout=60) as r:
        return json.loads(r.read())["prompt_id"]


def find_output(op, base, prefix, timeout=600, pid=None):
    """轮询全量 /history，按 SaveImage 文件名前缀匹配（规避单条 /history 空返回的坑）。

    🔴 必须传 pid（2026-09-15 踩坑）：
       只按「文件名前缀」匹配会命中**上一轮同名前缀的旧产物**——
       表现为「8 秒就跑完、落盘字节数与旧图一模一样」，静默拿回旧图。
       传 pid 后只在本次任务里找；同时能提前发现 execution_error（如磁盘配额满）
       直接快速失败，不再空等 600 秒。
    """
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            with op.open(base + "/history?max_items=128", timeout=30) as r:
                hist = json.loads(r.read())
            if pid:
                node = hist.get(pid)
                if node:
                    for o in node.get("outputs", {}).values():
                        for img in o.get("images", []):
                            if img.get("filename", "").startswith(prefix):
                                return img
                    # 本次任务已终止但没产物 → 打印真因并立即失败
                    st = node.get("status", {})
                    if st.get("status_str") in ("error", "failed") or st.get("completed") is False:
                        for m in st.get("messages", []):
                            d = m[1] if isinstance(m, (list, tuple)) and len(m) > 1 else m
                            if isinstance(d, dict) and d.get("type") in (
                                    "execution_error", "execution_interrupted"):
                                data = d.get("data", {})
                                print("  !! 任务失败 node=%s type=%s\n     %s" % (
                                    data.get("node_id"), data.get("node_type"),
                                    str(data.get("exception_message"))[:300]))
                                return None
            else:
                # 兼容旧调用：无 pid 时退回前缀扫描（有撞车风险，仅用于一次性任务）
                for p, node in hist.items():
                    for o in node.get("outputs", {}).values():
                        for img in o.get("images", []):
                            if img.get("filename", "").startswith(prefix):
                                return img
        except Exception as e:
            print("  轮询异常(忽略):", repr(e)[:100])
        time.sleep(6)
    return None


def download(op, base, img, dest):
    q = urllib.parse.urlencode({"filename": img["filename"],
                                "subfolder": img.get("subfolder", ""),
                                "type": img.get("type", "output")})
    with op.open(base + "/view?" + q, timeout=120) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def gen_one(op, base, name, desc, style, outdir, seed, w=1536, h=768, prefix_extra=""):
    anime = (style == "anime")
    prefix = "FP_%s%s_%s" % (name.upper(), prefix_extra, style.upper())
    positive = LAYOUT + (STYLE_ANIME if anime else STYLE_REAL) + desc + CLOSING
    nodes = build_nodes(positive, prefix, anime=anime, seed=seed, w=w, h=h)
    print("== 生成 %s [%s] ==" % (name, style))
    pid = submit(op, base, nodes)
    print("  prompt_id:", pid[:8], " prefix:", prefix)
    img = find_output(op, base, prefix)
    if not img:
        print("  !! 未找到产物"); return None
    os.makedirs(outdir, exist_ok=True)
    dest = os.path.join(outdir, "Krea2_Char_%s_%s.png" % (name, style))
    size = download(op, base, img, dest)
    print("  落盘:", dest, size, "bytes")
    return dest


if __name__ == "__main__":
    argv = sys.argv[1:]
    base = None; name = "luzhao"; style = "real"; seed = 7301
    desc = None; outdir = None; w = 1536; h = 768
    for i, a in enumerate(argv):
        if a == "--url" and i + 1 < len(argv):
            base = argv[i + 1].rstrip("/")
        elif a == "--name" and i + 1 < len(argv):
            name = argv[i + 1]
        elif a == "--style" and i + 1 < len(argv):
            style = argv[i + 1].lower()
        elif a == "--desc" and i + 1 < len(argv):
            desc = argv[i + 1]
        elif a == "--seed" and i + 1 < len(argv):
            seed = int(argv[i + 1])
        elif a == "--outdir" and i + 1 < len(argv):
            outdir = argv[i + 1]
        elif a == "--w" and i + 1 < len(argv):
            w = int(argv[i + 1])
        elif a == "--h" and i + 1 < len(argv):
            h = int(argv[i + 1])
    if not base:
        print("缺少 --url <ENDPOINT>"); sys.exit(1)
    if not desc:
        print("缺少 --desc <角色中文设定>"); sys.exit(1)
    outdir = outdir or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "fogport_assets", "krea2_sheets")
    op = make_opener()
    styles = ["real", "anime"] if style == "both" else [style]
    done = []
    for st in styles:
        p = gen_one(op, base, name, desc, st, outdir, seed, w, h)
        if p:
            done.append(p)
    print("== 完成 ==")
    for p in done:
        print("  ", p)
