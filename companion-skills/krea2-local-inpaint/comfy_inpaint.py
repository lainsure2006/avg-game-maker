# -*- coding: utf-8 -*-
"""
《缄默回廊》局部重绘（inpaint）云端脚本 —— 与 mask_editor.html 配套。

流程：用户用 mask_editor.html 在出图上手绘蒙版（白=要重绘，黑=保留）
      → 导出与原图同分辨率的 _mask.png
      → 把 原图 + 蒙版 + inpaint 指令 发给我
      → 本脚本把两图上传云端，跑 Krea2 inpaint（VAEEncodeForInpaint + KSampler denoise<1）

节点链复用已验证的 krea2_turbo 模型/VAE/CLIP 加载链。
注意：首次使用建议在真实图+蒙版上做一次 smoke test（本脚本已含尺寸/体积校验）。

用法：
  python comfy_inpaint.py --image 原图.png --mask 原图_mask.png \
      --prompt "把右手腕上的银镯去掉，露出自然赤裸手腕" \
      --prefix JM_INPAINT_ --seed 1234 --out 输出目录
"""
import urllib.request, json, ssl, urllib.parse, os, time, argparse, traceback, struct

BASE = "https://c2966edec311497ead08069d21b61f88--8188.ap-shanghai2.cloudstudio.club"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
OP = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=CTX),
    urllib.request.ProxyHandler({}),
)


def _post(path, data, timeout=90, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(BASE + path, data=data, headers=h)
    try:
        return OP.open(req, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        print("[HTTP %d] %s\n%s" % (e.code, path, body[:1500]), flush=True)
        raise


def _get(path, timeout=30):
    req = urllib.request.Request(BASE + path, headers={"Content-Type": "application/json"})
    return OP.open(req, timeout=timeout).read()


def upload_image(path, name):
    if ref_exists(name):
        print("[upload] reuse input/%s" % name, flush=True)
        return name
    BOUND = "----inpaint%x" % int(time.time())
    with open(path, "rb") as f:
        data = f.read()
    body = bytearray()
    body += ("--%s\r\n" % BOUND).encode()
    body += ('Content-Disposition: form-data; name="image"; filename="%s"\r\n' % name).encode("utf-8")
    body += b"Content-Type: image/png\r\n\r\n"
    body += data
    body += ("\r\n--%s--\r\n" % BOUND).encode()
    hdr = {"Content-Type": "multipart/form-data; boundary=%s" % BOUND}
    last = None
    for attempt in range(1, 6):
        try:
            _post("/upload/image", bytes(body), timeout=60, headers=hdr)
            print("[upload] attempt=%d ok %s" % (attempt, name), flush=True)
            return name
        except Exception as e:
            last = e
            time.sleep(3)
    raise RuntimeError("upload failed: %s" % last)


def ref_exists(name):
    q = urllib.parse.urlencode({"filename": name, "subfolder": "", "type": "input"})
    try:
        _get("/view?" + q, timeout=20)
        return True
    except Exception:
        return False


def find_output(prefix, pid, timeout=600):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            hist = json.loads(_get("/history?max_items=256", timeout=30))
        except Exception:
            time.sleep(3)
            continue
        entry = hist.get(pid)
        if entry is not None:
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                for m in status.get("messages", []):
                    if isinstance(m, list) and len(m) >= 2 and m[0] == "execution_error":
                        raise RuntimeError("execution_error: %s" % m[1].get("exception_message", m))
            for nid, out in entry.get("outputs", {}).items():
                for img in out.get("images", []):
                    if img.get("filename", "").startswith(prefix):
                        return img["filename"], img.get("subfolder", ""), img.get("type", "output")
        time.sleep(4)
    raise RuntimeError("timeout waiting pid=%s prefix=%s" % (pid, prefix))


def download(filename, subfolder, typ, out_path):
    q = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": typ})
    data = _get("/view?" + q, timeout=60)
    with open(out_path, "wb") as f:
        f.write(data)
    return out_path


def _png_size(path):
    with open(path, "rb") as f:
        f.seek(16)
        w0, h0 = struct.unpack(">II", f.read(8))
    return (w0, h0)


def feather_mask(mask_path, radius=5):
    """对蒙版做高斯羽化，生成灰色过渡边缘，让 inpaint 边界平滑衔接、不晕染。
    文件名带内容哈希，蒙版内容变化即重传，避免云端同名旧羽化图误用。"""
    from PIL import Image, ImageFilter
    import hashlib
    im = Image.open(mask_path).convert("L")
    feathered = im.filter(ImageFilter.GaussianBlur(radius=radius))
    h = hashlib.md5(open(mask_path, "rb").read()).hexdigest()[:8]
    out = mask_path[:-4] + "_feathered_%s.png" % h
    feathered.save(out)
    return out


def build_graph(base_name, mask_name, prompt, seed, denoise, w, h, grow=0):
    # 模型/VAE/CLIP 复用已验证链
    nodes = {
        "2": {"class_type": "UNETLoader", "inputs": {"unet_name": "krea2_turbo_int8_convrot.safetensors", "weight_dtype": "default"}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_4b_fp8_scaled.safetensors", "type": "krea2", "device": "cpu"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": "qwen_image_vae.safetensors"}},
        # 原图
        "10": {"class_type": "LoadImage", "inputs": {"image": base_name}},
        # 蒙版（白=重绘，黑=保留）：用 ImageToMask 从红通道取遮罩，绕开 LoadImage alpha 陷阱
        "11": {"class_type": "LoadImage", "inputs": {"image": mask_name}},
        "15": {"class_type": "ImageToMask", "inputs": {"image": ["11", 0], "channel": "red"}},
        # 正/负 conditioning（Krea2 turbo cfg=1.0，负向零化）
        "20": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": prompt}},
        "8": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": ""}},
        "7": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["8", 0]}},
        # inpaint 编码：把 base 图 + mask 编码成带噪掩码的 latent
        "30": {"class_type": "VAEEncodeForInpaint", "inputs": {
            "pixels": ["10", 0], "vae": ["4", 0], "mask": ["15", 0], "grow_mask_by": grow}},
        # 采样：denoise<1 保留 mask 外内容，仅重绘 mask 内
        "12": {"class_type": "KSampler", "inputs": {
            "model": ["2", 0], "positive": ["20", 0], "negative": ["7", 0],
            "latent_image": ["30", 0], "seed": seed, "steps": 8, "cfg": 1.0,
            "sampler_name": "euler", "scheduler": "simple", "denoise": denoise}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["4", 0]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": "__P__"}},
    }
    return nodes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--mask", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--prefix", default="JM_INPAINT_")
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--denoise", type=float, default=0.78)
    ap.add_argument("--grow", type=int, default=0)
    ap.add_argument("--feather", type=int, default=5)
    ap.add_argument("--out", default=".")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    if not os.path.exists(args.image) or not os.path.exists(args.mask):
        raise RuntimeError("原图或蒙版不存在")

    base_name = os.path.basename(args.image)
    # 蒙版羽化后再上传（灰色过渡边 -> 接缝平滑、不晕染）
    feathered = feather_mask(args.mask, radius=args.feather)
    mask_name = os.path.basename(feathered)
    upload_image(args.image, base_name)
    upload_image(feathered, mask_name)

    nodes = build_graph(base_name, mask_name, args.prompt, args.seed, args.denoise, 1536, 768, grow=args.grow)
    # 清理旧同名输出，避免历史缓存误下
    for fn in os.listdir(args.out):
        if fn.startswith(args.prefix) and fn.lower().endswith(".png"):
            try:
                os.remove(os.path.join(args.out, fn))
            except Exception:
                pass
    nodes["14"]["inputs"]["filename_prefix"] = args.prefix
    pid = json.loads(_post("/prompt", json.dumps({"prompt": nodes, "client_id": "jianmo_inpaint"}).encode("utf-8"), timeout=90))["prompt_id"]
    print("[submit] prefix=%s pid=%s" % (args.prefix, pid), flush=True)
    fn, sub, typ = find_output(args.prefix, pid)
    out = os.path.join(args.out, fn)
    download(fn, sub, typ, out)
    sz = _png_size(out)
    nb = os.path.getsize(out)
    if nb < 200000:
        os.remove(out)
        raise RuntimeError("体积过小 %d -> 疑似空图" % nb)
    print("[ok] %s size=%s bytes=%d" % (out, sz, nb), flush=True)
    print("ALL_DONE", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_inpaint_err.log"), "a", encoding="utf-8") as ef:
            ef.write("=== %s ===\n" % time.strftime("%H:%M:%S"))
            traceback.print_exc(file=ef)
        raise
