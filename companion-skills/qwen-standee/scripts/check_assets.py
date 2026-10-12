#!/usr/bin/env python3
"""立绘体检：视角顺序 / 取景 / alpha 质量 / 身份相似度。

用法:
  python check_assets.py sheet cells/head.png cells/front.png ...      # 视角校验
  python check_assets.py alpha states/*.png                            # 透明与取景
  python check_assets.py sim ref.png states/*.png                      # 身份相似度
"""
import argparse, glob, os, sys
import numpy as np
from PIL import Image


def face_info(path, app):
    """返回 (脸宽占比%, 脸高px, 相似度用的 embedding)。无脸返回 (0,0,None)。"""
    import cv2
    img = cv2.imread(str(path))
    if img is None:
        return 0.0, 0.0, None
    faces = app.get(img)
    if not faces:
        return 0.0, 0.0, None
    f = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
    w = f.bbox[2] - f.bbox[0]
    h = f.bbox[3] - f.bbox[1]
    ratio = w / img.shape[1] * 100
    emb = f.embedding / (np.linalg.norm(f.embedding) + 1e-9)
    return ratio, h, emb


def get_app():
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="antelopev2", root="/root/ComfyUI/models/insightface",
                       providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def alpha_stats(path):
    im = Image.open(path)
    a = np.array(im)
    if a.ndim == 3 and a.shape[2] == 4:
        alpha = a[..., 3].astype(np.float32)
        rgb = a[..., :3].astype(np.float32)
    else:
        return None
    tot = alpha.size
    trans = float((alpha < 16).mean() * 100)
    semi = float(((alpha >= 16) & (alpha < 240)).mean() * 100)
    # 人物上下边界（不透明像素）
    rows = np.where((alpha > 128).sum(axis=1) > 0)[0]
    if len(rows) == 0:
        return {"trans": trans, "semi": semi, "bbox": None}
    top, bot = int(rows[0]), int(rows[-1])
    # 底部 25% 区域：不透明占比 + 其中近黑占比（黑块检测）
    bh = alpha.shape[0] // 4
    bottom = alpha[-bh:, :]
    bop = float((bottom > 128).mean() * 100)
    mask = bottom > 128
    dark = 0.0
    if mask.sum():
        brgb = rgb[-bh:, :][mask]
        dark = float((brgb.mean(axis=1) < 40).mean() * 100)
    return {"trans": trans, "semi": semi, "top": top, "bot": bot,
            "h_person": bot - top + 1, "bottom_opaque": bop, "bottom_dark_of_opaque": dark}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sheet", "alpha", "sim"])
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()
    files = []
    for p in a.files:
        files += sorted(glob.glob(p)) if any(c in p for c in "*?[") else [p]

    if a.mode == "alpha":
        print(f"{'文件':<34}{'透明%':>7}{'半透%':>7}{'人物顶':>7}{'人物底':>7}{'底25%不透%':>11}{'其中近黑%':>10}")
        for f in files:
            s = alpha_stats(f)
            if s is None:
                print(f"{os.path.basename(f):<34} 无 alpha 通道"); continue
            if s.get("bbox", 1) is None:
                print(f"{os.path.basename(f):<34}{s['trans']:>7.1f}{s['semi']:>7.1f}  全透明")
                continue
            print(f"{os.path.basename(f):<34}{s['trans']:>7.1f}{s['semi']:>7.1f}"
                  f"{s['top']:>7}{s['bot']:>7}{s['bottom_opaque']:>11.1f}{s['bottom_dark_of_opaque']:>10.1f}")
        return

    app = get_app()
    if a.mode == "sheet":
        for f in files:
            r, h, _ = face_info(f, app)
            print(f"{os.path.basename(f):<24} 脸宽占比 {r:5.1f}%  脸高 {h}px")
        return

    ref = files[0]
    r0, h0, e0 = face_info(ref, app)
    if e0 is None:
        print("参考图未检出人脸:", ref); sys.exit(1)
    print(f"参考 {os.path.basename(ref)}  脸宽占比 {r0:.1f}%")
    for f in files[1:]:
        r, h, e = face_info(f, app)
        if e is None:
            print(f"  {os.path.basename(f):<30} 未检出人脸 (脸宽占比 0)")
            continue
        s = float(np.dot(e0, e))
        ratio = h / h0 if h0 else 0
        print(f"  {os.path.basename(f):<30} 相似度 {s:.3f}  人物高/脸高 {ratio:.2f}  脸宽占比 {r:.1f}%")


if __name__ == "__main__":
    main()
