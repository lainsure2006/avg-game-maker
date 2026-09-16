import os
from PIL import Image

SRC = "/workspace/image"
BG_DIR = "/workspace/avg-engine/public/images/bg"
SPRITE_DIR = "/workspace/avg-engine/public/images/sprite"

BG_SIZE = (1280, 720)
SPRITE_HEIGHT = 600

SPRITE_NAMES = {
    "alice_default", "alice_happy", "alice_sad", "alice_surprised",
    "bob_default", "bob_smile", "bob_worry",
}
BG_NAMES = {
    "classroom", "street", "park_day", "park_night", "river", "ending_bad",
}

os.makedirs(BG_DIR, exist_ok=True)
os.makedirs(SPRITE_DIR, exist_ok=True)

for fname in sorted(os.listdir(SRC)):
    if not fname.endswith(".png"):
        continue
    src_path = os.path.join(SRC, fname)
    clean_name = fname.replace(".png.png", ".png")
    base = clean_name.replace(".png", "")

    img = Image.open(src_path)
    orig_w, orig_h = img.size

    if base in BG_NAMES:
        img = img.resize(BG_SIZE, Image.LANCZOS)
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
        dest = os.path.join(BG_DIR, clean_name)
        img.save(dest, "PNG")
        print(f"[BG]  {clean_name}: {orig_w}x{orig_h} -> {BG_SIZE[0]}x{BG_SIZE[1]}  OK")

    elif base in SPRITE_NAMES:
        ratio = SPRITE_HEIGHT / orig_h
        new_w = int(orig_w * ratio)
        img = img.resize((new_w, SPRITE_HEIGHT), Image.LANCZOS)
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        dest = os.path.join(SPRITE_DIR, clean_name)
        img.save(dest, "PNG")
        print(f"[SP]  {clean_name}: {orig_w}x{orig_h} -> {new_w}x{SPRITE_HEIGHT}  OK")

    else:
        print(f"[??]  {fname}: unknown, skipped")

print("\nDone!")
