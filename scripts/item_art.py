# -*- coding: utf-8 -*-
"""
《<game>》物证图叠字程序

流程：`item_bases/Krea2_Item_<id>.png`（AI 底图，纸面空白）
      → 按 `item_texts.py` 的文案 + 本文件的坐标/字体/做旧参数排版
      → `avg-engine/public/images/items/<id>.png`（1280×960）+ 预览图

设计要点：
- 文字一律 `ImageDraw.text()` + 真实系统字体 → 100% 准确，改文案不用重出图。
- 所有文字/印章都先画在**独立 RGBA 层**，再旋转、做旧、alpha 合成，
  这样才能做「轻微旋转 + 降不透明度 + 噪点」的做旧而互不干扰。
- 坐标以 1280×960 为基准（与底图同尺寸），全部集中在本文件，便于逐张微调。

用法：
    python item_art.py letter7              # 只叠指定几张
    python item_art.py                      # 全部（底图缺失的自动跳过）
"""
import os, sys, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

import item_texts as T

HERE = os.path.dirname(os.path.abspath(__file__))
BASES = os.path.join(HERE, "<game>_assets", "item_bases")
OUT = r"<avg-engine>/public/images/items"
PREVIEW = os.path.join(HERE, "<game>_assets", "item_bases")
os.makedirs(OUT, exist_ok=True)

W, H = 1280, 960
_fc = {}


def F(key, size):
    k = (key, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(T.FONT[key], size)
    return _fc[k]


def base(iid):
    p = os.path.join(BASES, "Krea2_Item_%s.png" % iid)
    if not os.path.isfile(p):
        return None
    im = Image.open(p).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return im


def layer():
    """新建一张透明文字层。"""
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def text_on(ly, xy, s, key, size, fill=(20, 20, 22, 235), anchor="la", spacing=0):
    """写字。

    ⚠️ 字距与锚点必须一起算：逐字绘制时若直接沿用锚点，x 会被当成**起点**，
    右对齐/居中会整体跑偏（报头日期一度被画出画面）。
    正确做法 = 先量出含字距的总宽，再按锚点的水平分量回退起点。
    """
    d = ImageDraw.Draw(ly)
    f = F(key, size)
    if not spacing:
        d.text(xy, s, font=f, fill=fill, anchor=anchor)
        return d
    total = sum(f.getlength(c) for c in s) + spacing * (len(s) - 1)
    x, y = xy
    h = anchor[0] if len(anchor) == 2 else "l"
    if h == "m":
        x -= total / 2
    elif h == "r":
        x -= total
    for c in s:
        d.text((x, y), c, font=f, fill=fill, anchor=anchor)
        x += f.getlength(c) + spacing
    return d


def paste_rot(im, ly, angle=0.0, center=None):
    """把文字层按角度旋转后合成（做旧用：轻微旋转模拟手写/歪斜）。"""
    if angle:
        ly = ly.rotate(angle, resample=Image.BICUBIC, center=center or (W / 2, H / 2), expand=False)
    return Image.alpha_composite(im.convert("RGBA"), ly)


def noise(ly, amount=14, seed=7):
    """给文字层加轻微噪点（做旧：印章/墨迹不匀）。"""
    rnd = random.Random(seed)
    px = ly.load()
    for _ in range(int(W * H * 0.01)):
        x, y = rnd.randrange(W), rnd.randrange(H)
        r, g, b, a = px[x, y]
        if a > 40:
            d = rnd.randint(-amount, amount)
            px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)), a)
    return ly


def _arc_text(ly, s, cx, cy, rr, color, font, top=True, span=150, blur=True):
    """沿圆弧逐字排版（字头朝外）。

    top=True：沿 12 点方向的弧，ψ 从左(-span/2)到右(+span/2)，字旋转 -ψ。
    top=False：沿 6 点方向的弧，φ 从左(-span/2)到右(+span/2)，字旋转 180-φ。
    """
    n = len(s)
    for i, ch in enumerate(s):
        t = ((i - (n - 1) / 2) / (n - 1)) if n > 1 else 0.0
        a = t * span
        if top:
            x, y, ang = cx + rr * math.sin(math.radians(a)), cy - rr * math.cos(math.radians(a)), -a
        else:
            x, y, ang = cx + rr * math.sin(math.radians(a)), cy + rr * math.cos(math.radians(a)), 180 - a
        g = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
        ImageDraw.Draw(g).text((40, 40), ch, font=font, fill=color, anchor="mm")
        g = g.rotate(ang, resample=Image.BICUBIC)
        if blur:
            g = g.filter(ImageFilter.GaussianBlur(0.5))
        ly.alpha_composite(g, (int(x - 40), int(y - 40)))
    return ly


def stamp_ring(ly, center, r_out, r_in, ring_top, ring_bottom="", center_text="",
               color=(178, 34, 34, 215), center_size=34, arc_size=26, center_font="hei",
               span=150, line_w=4):
    """圆形双圈邮戳 / 印章：外内双圈 + 环形上下文字 + 中心字。"""
    d = ImageDraw.Draw(ly)
    cx, cy = center
    d.ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], outline=color, width=line_w)
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=color, width=2)
    f = F(center_font, arc_size)
    rr = (r_out + r_in) / 2
    if ring_top:
        _arc_text(ly, ring_top, cx, cy, rr, color, f, top=True, span=span)
    if ring_bottom:
        _arc_text(ly, ring_bottom, cx, cy, rr, color, f, top=False, span=span)
    if center_text:
        d.text((cx, cy), center_text, font=F(center_font, center_size), fill=color, anchor="mm")
    return ly


def half_stamp(ly, cx, cy, r, ch, color=(168, 30, 30, 205), size=44, keep="left"):
    """半枚残章（起火/撕毁只剩一半）——画整章后只保留一侧，再做旧。

    keep='left'：保留左半（如借书卡右下角被烧掉右半）。
    """
    g = Image.new("RGBA", (r * 2 + 20, r * 2 + 20), (0, 0, 0, 0))
    c = (r + 10, r + 10)
    stamp_ring(g, c, r, int(r * 0.72), "", "", ch, color=color, center_size=size,
               line_w=5)
    w, h = g.size
    if keep == "left":
        g = g.crop((0, 0, w // 2, h))
        ox = cx - r - 10
    else:
        g = g.crop((w // 2, 0, w, h))
        ox = cx
    ly.alpha_composite(g, (int(ox), int(cy - r - 10) + 0))
    return ly


def pencil(ly, xy, s, size=30, alpha=150, angle=0.0):
    """铅笔手写（灰、半透、轻微抖动）。"""
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.text(xy, s, font=F("kai", size), fill=(88, 88, 92, alpha), anchor="la")
    if angle:
        g = g.rotate(angle, resample=Image.BICUBIC, center=xy)
    return Image.alpha_composite(ly, g)


def square_stamp(ly, box, text, color=(170, 30, 30, 190), size=40, font="hei"):
    """方形红章（框内叠字）。"""
    d = ImageDraw.Draw(ly)
    x0, y0, x1, y1 = box
    d.rectangle([x0, y0, x1, y1], outline=color, width=5)
    d.text(((x0 + x1) / 2, (y0 + y1) / 2), text, font=F(font, size), fill=color, anchor="mm")
    return ly


def circle_mark(ly, box, color=(200, 30, 30, 230), width=5):
    """徒手红圈标注（PIL 椭圆描边 + 轻微抖动）。"""
    d = ImageDraw.Draw(ly)
    d.ellipse(box, outline=color, width=width)
    return ly


def tick(ly, xy, size=24, color=(40, 60, 40, 210), width=3):
    """手写勾 ✓ —— ⚠️ 不要用字体画「✓」：simkai/simhei 里没有 U+2713 字形，会渲染成空白。"""
    x, y = xy
    d = ImageDraw.Draw(ly)
    d.line([(x, y + size * 0.45), (x + size * 0.38, y + size)],
           fill=color, width=width)
    d.line([(x + size * 0.38, y + size), (x + size, y)],
           fill=color, width=width)
    return ly


def arrow(ly, p0, p1, color=(200, 30, 30, 220), width=4):
    d = ImageDraw.Draw(ly)
    d.line([p0, p1], fill=color, width=width)
    ang = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    L = 18
    for da in (math.radians(160), math.radians(-160)):
        d.line([p1, (p1[0] + L * math.cos(ang + da), p1[1] + L * math.sin(ang + da))],
               fill=color, width=width)
    return ly


def defocus(im, box, radius=9, feather=45):
    """局部虚化：把 AI 在底图上自画的乱码字压成「焦外灰雾」。

    背景：报纸/文件类提示词必然诱发 Krea2 脑补乱码汉字，重出多次也压不住。
    与其死磕，不如把有字区域做「景深虚化」——翻拍照片里正文不在焦平面极自然，
    再由 PIL 在焦平面上叠我们的真文案。既不乱码，又保留纸张质感。
    """
    x0, y0, x1, y1 = box
    region = im.crop(box).filter(ImageFilter.GaussianBlur(radius))
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rectangle(box, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    out = im.copy()
    out.paste(region, (x0, y0))
    return Image.composite(out, im, mask)


def grid_overlay(im, step=100):
    """在成品上叠坐标网格，供肉眼定/校排版坐标。"""
    im = im.convert("RGB").copy()
    W, H = im.size
    d = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 22)
    except Exception:
        f = ImageFont.load_default()
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=(255, 0, 190), width=1)
        d.text((x + 3, 4), str(x), font=f, fill=(255, 225, 0))
        d.text((x + 3, H - 26), str(x), font=f, fill=(255, 225, 0))
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=(255, 0, 190), width=1)
        d.text((4, y + 3), str(y), font=f, fill=(0, 245, 255))
        d.text((W - 78, y + 3), str(y), font=f, fill=(0, 245, 255))
    return im


def finish(im, iid, grid=False):
    im = im.convert("RGB")
    dst = os.path.join(OUT, "%s.png" % iid)
    im.save(dst)
    im.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(PREVIEW, "_item_%s_preview.png" % iid))
    if grid:
        grid_overlay(im).save(os.path.join(PREVIEW, "_grid_%s.png" % iid))
    print("  ->", dst, os.path.getsize(dst), "bytes")
    return dst


# ============================================================
#  逐张排版
# ============================================================

def build_letter7():
    """⑤ 行楷体工整小字，尺子比着写 —— 纸面斜置，文字块整体小幅旋转贴合。"""
    im = base("letter7")
    ly = layer()
    # 纸面亮区实测：y470-660 / x260-1000（故文字块落在这里，避开折痕与纸边）
    x, y, lh, size = 330, 452, 45, 27
    for i, line in enumerate(T.LETTER7):
        text_on(ly, (x, y + i * lh), line, "kai", size, fill=(18, 19, 22, 245), spacing=1.5)
    ly = noise(ly, 10, seed=11)
    # 纸上边缘实测 (272,460)→(948,445)，右上略高 → 逆时针 +1.3°
    im = paste_rot(im, ly, angle=1.3, center=(W / 2, H / 2))
    return im


def build_card_burnt():
    """烧焦的借书卡。

    底图为斜置卡面，实测蓝横线倾角 **-9.3°**（x356,y320 → x612,y278）。
    做法：先在「虚拟正置卡面」坐标里写字（规尺般落在格线上），
    再把整层文字绕卡心 (500,500) 旋转 -9.3° 贴合 —— 文字基线自然沿蓝线走。
    平面坐标换算（绕 C=(500,500) 逆变换实测）：
      蓝线1 flat y≈299，行距 85 → 蓝线 299/384/469/554
      故书名写在 flat y=383（第 2 条线）、日期写在 flat y=468（第 3 条线）
    残章「灯」放在 flat x=690 处只留左半 —— 转正后切口正好顺着焦黑边界，像被火烧掉右半。
    """
    im = base("card_burnt")
    ly = layer()
    C = T.CARD_BURNT
    ink = (34, 44, 78, 232)
    text_on(ly, (225, 383), C["front_book"], "kai", 40, fill=ink, anchor="ls", spacing=3)
    text_on(ly, (225, 468), C["front_date"], "kai", 40, fill=ink, anchor="ls", spacing=3)
    half_stamp(ly, 690, 424, 95, C["stamp_char"], size=56, keep="left")
    # 背面铅笔字：淡到像透出来的痕迹（卡背在现场被翻看过）
    text_on(ly, (240, 662), C["back_name"], "kai", 30, fill=(92, 92, 96, 132), spacing=4)
    ly = noise(ly, 12, seed=23)
    im = paste_rot(im, ly, angle=-9.3, center=(500, 500))
    return im


def flow(ly, xy, s, key, size, max_w, leading, fill, spacing=0):
    """中文自动换行排版（按像素宽度断行）。返回下一行的 y。"""
    d = ImageDraw.Draw(ly)
    f = F(key, size)
    x0, y = xy
    line = ""
    for ch in s:
        if ch == "\n":
            d.text((x0, y), line, font=f, fill=fill)
            y += leading; line = ""
            continue
        t = line + ch
        if f.getlength(t) > max_w and line:
            d.text((x0, y), line, font=f, fill=fill)
            y += leading; line = ch
        else:
            line = t
    if line:
        d.text((x0, y), line, font=f, fill=fill)
        y += leading
    return y


def paper_tex(iid, band, size=(W, H), blur=1.6):
    """把底图里的一块「纯纸面」区域做成整幅纸张纹理（上下镜像平铺，缝不可见）。"""
    src = base(iid)
    b = src.crop(band)
    bw, bh = b.size
    tex = Image.new("RGB", size)
    y = 0; k = 0
    while y < size[1]:
        t = b if k % 2 == 0 else b.transpose(Image.FLIP_TOP_BOTTOM)
        tex.paste(t.resize((size[0], bh), Image.LANCZOS), (0, y))
        y += bh; k += 1
    return tex.filter(ImageFilter.GaussianBlur(blur))


def build_newspaper_1020():
    """报纸整版报道 —— **混合实现**。

    为什么不用纯 AI 底图：Krea2 连续两版都把「报纸」画成一整张现场照片 / 满版乱码正文
    （它无法抑制「报纸必有大量文字」的先验）。而报纸本质就是**排版**，
    所以改成：AI 只提供「火灾现场照片」+「泛黄纸张纹理」两样素材，
    报头/标题/正文/图注全部由 PIL 排版 → 一个错字都不会有，而且版式完全可控。
    """
    src = base("newspaper_1020")
    im = paper_tex("newspaper_1020", (8, 8, 1068, 200))
    ly = layer()
    N = T.NEWSPAPER_1020
    # 报头
    text_on(ly, (64, 46), "雾港日报", "song", 40, fill=(132, 30, 28, 242), spacing=6)
    text_on(ly, (1216, 60), "十月二十日　星期一", "song", 22,
            fill=(70, 66, 62, 225), anchor="ra", spacing=2)
    d = ImageDraw.Draw(ly)
    d.line([(64, 104), (1216, 104)], fill=(96, 88, 80, 210), width=3)
    # 标题区
    text_on(ly, (640, 128), N["title"], "hei", 92, fill=(22, 22, 24, 248),
            anchor="ma", spacing=14)
    text_on(ly, (640, 250), N["sub"], "song", 26, fill=(48, 46, 46, 232), anchor="ma")
    d.line([(64, 292), (1216, 292)], fill=(112, 104, 96, 180), width=2)
    # 现场照片（取自 AI 底图）
    ph = src.crop((35, 215, 1015, 767)).resize((810, 456), Image.LANCZOS)
    im.paste(ph, (70, 306))
    d.rectangle([69, 305, 880, 762], outline=(58, 54, 50, 235), width=2)
    text_on(ly, (70, 776), "十月十九日凌晨，城西灯塔书店火灾现场。（本报记者摄）",
            "song", 19, fill=(74, 70, 66, 225))
    # 右栏正文（第 1、2 段接着排）
    y = 306
    for para in N["body"][:2]:
        y = flow(ly, (900, y), para, "song", 20, 316, 30, (44, 42, 42, 230)) + 14
    # 通栏正文
    flow(ly, (70, 812), N["body"][2], "song", 20, 1146, 30, (44, 42, 42, 230))
    ly = noise(ly, 8, seed=31)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_fire_report_table():
    """消防通报表格：仿宋文字，关键单元格「一层营业区」加红圈。

    坐标依据实测：底图表头在 y≈150..215，数据行 pitch≈71px；
    纸面整体向右下倾斜约 +2°（左列横线 y535 vs 右列 y559 / Δx520），
    故整层文字旋转 +2° 贴合，避免末行压到格线上。
    """
    im = base("fire_report_table")
    ly = layer()
    text_on(ly, (150, 128), "消防年度通报·起火部位", "hei", 34,
            fill=(30, 30, 34, 235), spacing=3)
    y = 226
    for r in T.FIRE_REPORT_TABLE["rows"]:
        text_on(ly, (182, y), r[0], "fang", 30, fill=(38, 38, 42, 228), spacing=1)
        text_on(ly, (470, y), r[1], "fang", 30, fill=(38, 38, 42, 228), spacing=1)
        y += 71
    # 红圈：只圈住「一层营业区」这 5 个字（第 2 行右侧，行中心 y≈312）
    circle_mark(ly, (452, 288, 648, 344), width=4)
    ly = noise(ly, 8, seed=41)
    im = paste_rot(im, ly, angle=2.0, center=(640, 400))
    return im


def build_photo_scorch():
    im = base("photo_scorch")
    ly = layer()
    text_on(ly, (1010, 880), T.PHOTO_SCORCH_NO, "fang", 24, fill=(235, 235, 235, 220), anchor="ra")
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_photo_stain():
    im = base("photo_stain")
    ly = layer()
    text_on(ly, (1010, 880), T.PHOTO_STAIN_NO, "fang", 24, fill=(235, 235, 235, 220), anchor="ra")
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_note_lu():
    """陆昭的便签：楷体用力笔迹（姓名 + 电话），最后一笔划破纸的观感。"""
    im = base("note_lu")
    ly = layer()
    ink = (26, 27, 30, 240)
    text_on(ly, (500, 400), T.NOTE_LU["name"], "kai", 46, fill=ink, spacing=3)
    text_on(ly, (500, 480), T.NOTE_LU["phone"], "kai", 42, fill=ink, spacing=2)
    ly = noise(ly, 12, seed=53)
    im = paste_rot(im, ly, angle=-3.0, center=(640, 460))
    return im


def build_report_copy():
    """物证送检清单（复印件）—— 仿宋条目 + 右下红色方章「无结果」。

    底图为扇形叠放的复印件，实测**顶边斜率 -3.79°**；最上面那张纸右 2/3 是干净可用区
    （y210 起 x600..1197、y450 起 x191..1177）。故整层文字绕 (900,460) 旋转 -3.79°。
    """
    im = base("report_copy")
    ly = layer()
    R = T.REPORT_COPY
    text_on(ly, (580, 296), R["title"], "hei", 38, fill=(32, 32, 36, 242), spacing=5)
    y = 390
    for line in R["items"]:
        text_on(ly, (580, y), line, "fang", 25, fill=(40, 40, 44, 226), spacing=1)
        y += 66
    square_stamp(ly, (790, 660, 1010, 790), R["stamp"], size=54)
    ly = noise(ly, 8, seed=61)
    im = paste_rot(im, ly, angle=-3.79, center=(900, 460))
    return im


def build_seven_papers():
    """七张纸 = 七封信。

    落点依据 `_crop_seven_papers.png` 实测：
      上排 3 张  A x175..410  B x420..660  C x685..890
      下排 4 张  D x55..290   E x300..535  F x550..785  G x800..1035
    第 1 张（A）歪斜「去找江砚」；B~G 六张同一句「那不是意外。」，
    字号逐张放大一点（模拟「一张比一张工整」）；末张 G 下方另起一行小字「别 信 签 名 的 人」。
    """
    im = base("seven_papers")
    ly = layer()
    P = T.SEVEN_PAPERS
    # 第 1 张：歪斜、字距不齐
    text_on(ly, (205, 195), P["top_line"], "kai", 34, fill=(30, 31, 34, 238), spacing=6)
    # 第 2~7 张：同一句，逐张稍微放大 + 字距收紧 = 越来越工整
    spots = [(450, 197, 27, 4), (700, 197, 28, 3),      # B, C
             (85, 548, 29, 3), (328, 548, 30, 2),       # D, E
             (578, 548, 31, 2), (830, 548, 33, 1)]      # F, G
    for (x, y, sz, sp) in spots:
        text_on(ly, (x, y), P["repeat"], "kai", sz, fill=(30, 31, 34, 236), spacing=sp)
    # 末张背面那行：写在 G 的下半部分，更小、更淡（G 右缘 x≈1035，故收紧字距防越界）
    text_on(ly, (818, 626), P["back_line"], "kai", 21, fill=(58, 58, 62, 215), spacing=4)
    ly = noise(ly, 10, seed=71)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_report_p18():
    """第十八页报告（戏眼）—— 仿宋正文 + 醒目黑体「检出助燃剂」+ 页边红笔批注。

    底图为几乎正拍的对开空白档案页：左页 x20..510 / 右页 x520..1035，
    右上角有一个**空白页码框** x855..1005 y60..150（出图时预留，页码叠在里面）。
    """
    im = base("report_p18")
    ly = layer()
    R = T.REPORT_P18
    # 页码叠进预留框
    text_on(ly, (930, 105), R["page_no"], "fang", 36, fill=(52, 52, 56, 225), anchor="mm")
    y = 235
    for line in R["body"]:
        if line:
            y = flow(ly, (560, y), line, "fang", 26, 445, 48, (40, 40, 44, 230))
    # 戏眼：加粗放大
    text_on(ly, (560, y + 14), R["hl"], "hei", 42, fill=(20, 20, 22, 250), spacing=4)
    y += 76
    for line in R["body2"]:
        y = flow(ly, (560, y), line, "fang", 26, 445, 48, (40, 40, 44, 230))
    # 页边红笔批注（手写角度）
    note = layer()
    text_on(note, (700, 700), R["margin_note"], "kai", 30, fill=(176, 34, 32, 222), spacing=3)
    note = note.rotate(-9.0, resample=Image.BICUBIC, center=(700, 715))
    ly = Image.alpha_composite(ly, note)
    ly = noise(ly, 8, seed=81)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_tin_box():
    """铁盒盖上的「饼干」二字（做旧：降不透明度 + 噪点）。"""
    im = base("tin_box")
    ly = layer()
    text_on(ly, (640, 470), T.TIN_BOX["text"], "hei", 96, fill=(58, 50, 44, 165), anchor="mm", spacing=10)
    ly = noise(ly, 26, seed=91)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_regular_list():
    """赊账本：一页一人名 + 书名 + 日期（有的画勾）；最后一行名字模糊、只留「来问地契的事」。

    坐标依据 `_grid_regular_list.png` 实测：账本左右两页各是一张竖格网，
    左页第一栏（人名）x≈175..355，第二栏（书名）x≈380..520；日期栏跟在书名后。
    """
    im = base("regular_list")
    ly = layer()
    P = T.REGULAR_LIST
    y = 190
    for i, (who, book, date, do_tick) in enumerate(P):
        last = (i == len(P) - 1)
        if last:
            # ⚠️ 末行特殊：名字淡到近乎看不清（身份 ch08b 才揭示，此处不剧透），
            #    书名栏也不写书名、改写成钩子句，且**拆成两行短句**避免越出栏目。
            text_on(ly, (185, y), who, "kai", 27, fill=(36, 34, 32, 105))
            text_on(ly, (385, y), "来问地契的事", "kai", 26, fill=(36, 34, 32, 255), spacing=1)
            text_on(ly, (830, y), date, "kai", 27, fill=(36, 34, 32, 120))
        else:
            ink = (36, 34, 32, 234)
            text_on(ly, (185, y), who, "kai", 28, fill=ink, spacing=2)
            text_on(ly, (385, y), book, "kai", 28, fill=ink, spacing=1)
            text_on(ly, (830, y), date, "kai", 28, fill=ink, spacing=1)
            if do_tick:
                tick(ly, (1075, y - 4), size=26)
        y += 62
    ly = noise(ly, 14, seed=101)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_old_book():
    """旧书扉页：红色灯塔印章（圆环「灯塔书店」+ 中心「借」）+ 仿宋小字「最晚借阅：十月十九日」。"""
    im = base("old_book")
    ly = layer()
    O = T.OLD_BOOK
    stamp_ring(ly, (640, 430), 150, 108, O["stamp_ring"], "", O["stamp_center"],
               color=(176, 30, 30, 200), center_size=54, arc_size=30, span=170)
    text_on(ly, (640, 640), O["caption"], "fang", 30, fill=(40, 40, 44, 220), anchor="ma", spacing=2)
    ly = noise(ly, 16, seed=111)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_two_timelines():
    """值班记录表：仿宋行 + 两个时间红圈 + 箭头对照（02:47 接警 / 03:05 到场）。

    坐标依据实测格线（左列 x180..340 / 右列 x700..900 两处横线几乎同高，倾斜仅约 0.3°）：
      表头行 y196..248 → 行中心 222；数据行 pitch 52.7 → 行中心 274/327/380/433/486
      竖线 x192 / 627 / 1220 → 标签列左边界 192，数值列左边界 627
    """
    im = base("two_timelines")
    ly = layer()
    Hh = T.TWO_TIMELINES["header"]
    text_on(ly, (215, 203), Hh[0], "hei", 30, fill=(34, 34, 38, 236), spacing=2)
    text_on(ly, (660, 203), Hh[1], "hei", 30, fill=(34, 34, 38, 236), spacing=2)
    y = 255
    for k, v in T.TWO_TIMELINES["rows"]:
        text_on(ly, (215, y), k, "fang", 30, fill=(38, 38, 42, 228), spacing=1)
        text_on(ly, (660, y), v, "fang", 30, fill=(38, 38, 42, 228), spacing=1)
        y += 53
    # 两个时间红圈 + 竖向箭头（18 分钟时间差是关键矛盾）
    circle_mark(ly, (646, 252, 762, 300), width=4)
    circle_mark(ly, (646, 358, 762, 406), width=4)
    arrow(ly, (790, 276), (790, 382))
    ly = noise(ly, 8, seed=121)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_postmark():
    """牛皮纸信封上的圆形双圈邮戳：环形「城西邮政」+「ChengXi」+ 中心「疗养院」+ 日期。

    坐标依据实测：底图右上角有一块**浅压印的空白圆区**（出图时要求的「供盖邮戳」位置），
    圆心约 (700,320) r≈137 —— 邮戳必须**盖在这块圆区正中**，否则圆区会露在章外像块脏印。
    信封上缘是从 (30,250) 升到 (860,130) 的斜边，故 r 收到 132、圆心 (700,322)，保证整章都在纸内。
    """
    im = base("postmark")
    ly = layer()
    P = T.POSTMARK
    stamp_ring(ly, (700, 322), 132, 95, P["ring_top"], P["ring_bottom"], "",
               color=(46, 46, 50, 208), center_size=44, arc_size=26, span=160, line_w=5)
    text_on(ly, (700, 305), P["center"], "hei", 44, fill=(46, 46, 50, 205), anchor="mm")
    text_on(ly, (700, 372), P["date"], "hei", 26, fill=(46, 46, 50, 200), anchor="mm", spacing=2)
    ly = noise(ly, 20, seed=131)
    im = paste_rot(im, ly, angle=0.0)
    return im


def build_final_pencil_note():
    """旧书最后一页的铅笔字（ch12-1 S04 特写 / 真相结局的最后一句）。

    文案见 `item_texts.FINAL_PENCIL_NOTE`（源自 ch12-1_剧本化.md:23 旁白）。

    ⚠️ 坐标依据 = **对底图实测**（`Krea2_Item_final_pencil_note.png` 1280×960）：
       纸面按「暖调判据 r-b>6 且 r>170」识别得 **x≈304..971（宽 667，中心 637）、y≈30..922**。
       底图并没有把纸面撑满画面（四周有冷灰蓝桌面/背景，与其余物证的"俯拍带环境"一致），
       所以**不能按 1280 宽居中排版**，否则末行右端会落纸外。
       可用文字带宽 ≈ 600px（667 减去两侧留白）→ 字号 42 下最长行 474px，安全。

    铅笔质感的三件事（缺一就"不像铅笔"）：
      ① **灰不是黑** —— 石墨落在纸上发灰，纯黑 0,0,0 会变成印刷体。
      ② **略低不透明度** —— 铅笔笔画轻，alpha 压到 ~198 才不会像马克笔。
      ③ **噪点 + 轻微旋转** —— 石墨颗粒不匀 + 手写不可能水平，二者一起才有机写感。

    底图是「正拍」的纸页（无透视）→ 普通正坐标排版即可，
    不需要 `persp.py` 的单应变换（那是给斜拍底图用的）。
    """
    im = base("final_pencil_note")
    ly = layer()
    P = T.FINAL_PENCIL_NOTE
    ink = (72, 72, 78, 198)
    CX = 637                      # 纸面水平中心（实测）
    y = 430
    for line in P["lines"]:
        text_on(ly, (CX, y), line, "kai", 42, fill=ink, anchor="ma", spacing=6)
        y += 72
    ly = noise(ly, 26, seed=141)
    im = paste_rot(im, ly, angle=-1.3, center=(CX, 466))
    return im


BUILDERS = {
    "letter7": build_letter7,
    "card_burnt": build_card_burnt,
    "newspaper_1020": build_newspaper_1020,
    "fire_report_table": build_fire_report_table,
    "photo_scorch": build_photo_scorch,
    "photo_stain": build_photo_stain,
    "note_lu": build_note_lu,
    "report_copy": build_report_copy,
    "seven_papers": build_seven_papers,
    "report_p18": build_report_p18,
    "tin_box": build_tin_box,
    "regular_list": build_regular_list,
    "old_book": build_old_book,
    "two_timelines": build_two_timelines,
    "postmark": build_postmark,
    "final_pencil_note": build_final_pencil_note,
}


def main(only=None, grid=False):
    ids = only or list(BUILDERS)
    done = []
    for iid in ids:
        b = BUILDERS.get(iid)
        if not b:
            print("!! 未实现:", iid); continue
        if base(iid) is None:
            print("!! 缺底图，跳过:", iid); continue
        print("== 叠字", iid, flush=True)
        done.append(finish(b(), iid, grid=grid))
    print("== DONE ==")
    for p in done:
        print("  ", p)


if __name__ == "__main__":
    argv = sys.argv[1:]
    g = "--grid" in argv
    argv = [a for a in argv if a != "--grid"]
    main(only=argv or None, grid=g)
