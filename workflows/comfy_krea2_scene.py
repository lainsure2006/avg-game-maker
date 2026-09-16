# -*- coding: utf-8 -*-
"""
Krea2 场景资产参考图生成器（两方案：A=2x2 网格 / B=超宽连续图）
来源：AssetRef_Kit（用户 CloudStudio 验证包）→ 本脚本适配【CloudStudio 云端】

与工具包原脚本（本机 8188）的差异（本环境必需）：
- endpoint 走 --url（云端每次变）或读同目录 comfy_url.txt
- SaveImage 前缀用唯一串 WBSCENE_<场景>_<A|B>，避免共享实例编号撞车
- 轮询用【全量 /history?max_items=128】按前缀匹配（该部署单条 /history/{pid} 可能返空）
- 下载后用 PIL 校验真实尺寸，防撞车旧图
- 内置客观校验：4 格/4 段两两平均哈希差（0-1024）

要点（与 SDXL 的本质区别）：
- Krea2 = Flux 系（DiT + Qwen3-VL 中文编码器）→ 一次出图即可正确排版多视图
- 节点：UNETLoader + CLIPLoader(type=krea2,device=cpu) + VAELoader
- 负提示：ConditioningZeroOut 零化（**不写负面词**）
- 采样：steps=8, cfg=1.0（固定）, euler + simple
- A: 1536x1536（1:1，裁 4 象限）  B: 3072x1024（3:1，裁 4 段）
"""
import urllib.request, urllib.parse, ssl, json, time, os, sys
from PIL import Image

UNET = "krea2_turbo_int8_convrot.safetensors"
CLIP = "qwen3vl_4b_fp8_scaled.safetensors"
VAE = "qwen_image_vae.safetensors"

# ============================================================
# 场景预设（《雾港回声》）—— 制作新场景时在此追加
# ============================================================
SCENES = {
    "office_night": {
        "cn": "雾港市报社夜班办公区",
        # Scene DNA（文字双保险，出分镜图时逐字复制）
        "dna": ("雾港市报社夜班办公区：成排旧木质办公桌与绿色台灯在中央，文件与报纸堆叠；"
                "右侧落地窗，窗外雨夜港口灯火朦胧、雨水沿玻璃蜿蜒；左侧通往走廊的门与金属文件柜；"
                "天花板冷白日光灯管偏青，角落一盏暖黄台灯；磨旧水磨石地面。冷蓝色调、高对比、雨夜。"),
        "a": ("场景设定参考图，一张图内以 2x2 网格排布展示同一雾港市报社夜班办公区的多个相机视角："
              "左上为主视角（从办公区中部正对成排办公桌与落地窗），"
              "右上为左侧视角（从走廊门口一侧看入，可见门与金属文件柜），"
              "左下为右侧视角（从落地窗一侧看入，可见窗外雨夜港口灯火），"
              "右下为俯视特写（俯瞰办公桌、台灯与报纸堆叠布局）。"
              "固定场景库存：成排旧木质办公桌与绿色台灯在中央、文件与报纸堆叠、"
              "右侧落地窗、左侧走廊门与金属文件柜、磨旧水磨石地面、天花板冷白日光灯管。"
              "保留完全相同的建筑结构、道具、光照方向（冷白顶光为主、角落一盏暖黄台灯）、"
              "调色板与物体数量，仅旋转相机角度。"
              "雨夜氛围、冷蓝色调、高对比，各视角统一光照与色调，无文字，无 logo，高清，细节清晰。"
              "Continuity lock: 办公桌排列与数量不变；绿色台灯与暖黄角落灯位置不变；"
              "落地窗始终在右、走廊门始终在左；冷蓝雨夜色调不变；无场景、光照或色调变更。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous foggy-port city newspaper "
              "office at night in the rain, panning left to right as ONE unbroken space: "
              "far left shows a corridor doorway with a metal filing cabinet and a coat rack; "
              "left-center shows rows of old wooden desks with green banker lamps and stacked "
              "newspapers and files; center-right shows a workstation area with scattered notes and "
              "a wall clock; far right shows a large floor-to-ceiling window with rain running down "
              "the glass and blurred harbor lights outside. "
              "consistent cool-blue night lighting with warm amber desk-lamp accents, high contrast, "
              "cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "cafe_night": {
        "cn": "回声咖啡馆（夜/雨，暖色孤岛）",
        "dna": ("回声咖啡馆：临街小咖啡馆，深色木质吧台与酒红皮革高脚凳；"
                "墙面书架与暖黄吊灯；右侧落地窗对着雨夜街景、雾气与霓虹反光；"
                "吧台后蒸汽与咖啡机。整体暖橙内光、窗外冷蓝雨夜，高对比。"),
        "a": ("场景设定参考图，一张图内以 2x2 网格排布展示同一临街回声咖啡馆的多个相机视角："
              "左上为主视角（正对吧台与酒红高脚凳），右上为左侧视角（从书架墙一侧看入），"
              "左下为右侧视角（从落地窗一侧看入，可见窗外雨夜街景），右下为俯视特写（俯瞰吧台与杯具布局）。"
              "固定场景库存：深色木质吧台、三只酒红皮革高脚凳、墙面书架与暖黄吊灯、"
              "右侧落地窗、咖啡机与蒸汽、木质地板。保留完全相同的建筑结构、道具、"
              "光照方向（暖橙内光为主、窗外冷蓝）、调色板与物体数量，仅旋转相机角度。"
              "雨夜氛围、暖色孤岛反差，各视角统一光照与色调，无文字，无 logo，高清，细节清晰。"
              "Continuity lock: 吧台与三只高脚凳位置数量不变；窗始终在右；暖橙内光、窗外冷蓝不变；无场景或色调变更。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous small corner cafe interior at "
              "night in the rain, panning left to right as ONE unbroken space: far left shows a dark "
              "wood bookshelf wall with warm pendant lamps; left-center shows a dark wood counter bar "
              "with three oxblood leather bar stools; center-right shows an espresso machine with steam "
              "and stacked cups; far right shows a large window with rain and blurred neon reflections "
              "of the wet street outside. consistent warm amber interior light against cool-blue rainy "
              "exterior, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "library": {
        "cn": "市图书馆过刊室（日/cold）",
        "dna": ("市图书馆过刊室：高大的木质书架排满装订旧报纸与期刊；中央木质阅览桌配绿色台灯、"
                "期刊堆叠；靠墙卡片目录柜；一侧高窗透入柔和日光、空气中浮尘。冷调日光、高对比。"),
        "b": ("wide photograph of a continuous municipal library old-periodicals reading room, shown as a "
              "left-to-right sweep in daytime: far left shows tall wooden shelves with bound old newspapers "
              "and magazines, well spaced; left-center shows a few wooden reading tables with green banker "
              "lamps and stacked periodicals, not crowded; center-right shows a card-catalog index desk with "
              "drawers and a reading lamp; far right shows a tall window with soft overcast daylight and "
              "faint dust motes in the air. spacious, uncluttered, generous spacing, consistent cool overcast "
              "daylight with high contrast, cinematic, photorealistic, no seams, no repeated tiles, "
              "no text, no logo."),
    },
    "oldstreet_dusk": {
        "cn": "临江路坡·书店外（黄昏/阴/dusk）",
        "dna": ("临江路坡·书店外：书店门面挂招牌、暖光窗；坡道金属栏杆与旧路灯；下坡远处雾港与橙紫黄昏天；"
                "河岸栏杆泊小船。黄昏橙紫过渡、阴天。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous sloping street outside a riverside "
              "bookstore at dusk under overcast sky, panning left to right as ONE unbroken space: far left "
              "shows the bookstore facade with a hanging signboard and a warm-lit window; left-center shows "
              "the sloping pavement with a metal railing and an old streetlamp; center-right shows a downward "
              "view of the distant foggy harbor and dusk sky in orange-purple transition; far right shows the "
              "riverbank railing with a moored small boat. consistent dusk transition of orange-purple "
              "overcast light, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "ruins_dusk": {
        "cn": "灯塔书店遗址·废墟内（黄昏/阴/dusk）",
        "dna": ("灯塔书店遗址（废墟内）：坍塌书架与瓦砾；残灯塔基座与裂墙；墙洞透入微弱暮光与碎屑；"
                "破窗见海与黄昏天。荒凉、黄昏阴天。"),
        "b": ("wide photograph of the ruined interior of the Lighthouse Bookstore years after the fire, "
              "shown as a left-to-right sweep at dusk under overcast sky: far left shows collapsed charred "
              "wooden bookshelves and rubble on the floor with a few scorched book spines still on a broken "
              "shelf; left-center shows a cracked concrete wall with a remaining fragment of the shop sign "
              "reading part of the word 'Lighthouse'; center-right shows a gaping hole in the wall where dim "
              "dusk light enters over debris; far right shows the sea and the foggy-port skyline with a "
              "distant lighthouse visible through a broken window, dusk sky beyond. the bookstore sits on a "
              "riverside slope by the harbor. desolate burned ruins, consistent dusk overcast light, high "
              "contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "police_corridor": {
        "cn": "警局走廊（日/cold）",
        "dna": ("警局走廊：一排询问室门（小加固窗）；墙边储物柜与软木通知板；日光灯走廊、浅色瓷砖地；"
                "尽头饮水机与自动售货机。冷调临床日光。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous police-station corridor in daytime, "
              "panning left to right as ONE unbroken space: far left shows a row of interrogation-room doors "
              "with small reinforced windows; left-center shows wall lockers and a cork notice board; "
              "center-right shows a fluorescent-lit corridor with pale tiled floor and ceiling lights; far "
              "right shows a water fountain and vending machine at the corridor end. consistent cool clinical "
              "fluorescent daylight, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "interrogation": {
        "cn": "询问室（日/cold）",
        "dna": ("询问室：单面镜墙；朴素金属桌配两把简椅；壁装监控摄像头与挂钟；实门带小窗、空墙。"
                "冷调无菌、单一顶光。"),
        "b": ("wide photograph of a continuous police interrogation room in daytime, shown as a "
              "left-to-right sweep: far left shows a one-way mirror wall; left-center shows a plain metal "
              "table with two simple chairs; center-right shows a wall-mounted surveillance camera and a wall "
              "clock; far right shows a solid door with a small window and a bare wall. consistent cold "
              "sterile single overhead light, high contrast, cinematic, photorealistic, no seams, "
              "no repeated tiles, no text, no logo."),
    },
    "sanatorium": {
        "cn": "疗养院·陆振声起居室（日/cold，统一冷调）",
        "dna": ("疗养院·陆振声起居室：门口走廊带挂衣钩；起居区旧扶手椅、边几与相框照；"
                "低书架与小药柜；窗含安静庭院景与柔光。冷调安静日光。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous sanatorium living room (patient "
              "quarters) in daytime, panning left to right as ONE unbroken space: far left shows a doorway to "
              "a hallway with a coat hook; left-center shows a sitting area with a worn armchair, a side "
              "table and a framed photo; center-right shows a low bookshelf and a small medical cabinet; far "
              "right shows a window with a calm garden view and soft daylight. consistent cool calm daylight, "
              "high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "flea_market": {
        "cn": "旧货市场（日/cold）",
        "dna": ("旧货市场：摊位堆叠旧书与纸盒；桌面杂货摊与摊主；悬挂衣物与纸灯、窄拥挤过道；"
                "空地木箱与远处摊主。冷调阴天日光。"),
        "b": ("wide photograph of a continuous daytime secondhand flea market, shown as a left-to-right "
              "sweep: far left shows orderly stalls with stacked old books and cardboard boxes in fair "
              "vintage condition; left-center shows a tidy table with assorted bric-a-brac and a vendor; "
              "center-right shows hanging clothes and paper lanterns over an aisle; far right shows an open "
              "area with wooden crates and a distant vendor. tidy and well-kept, not derelict or decaying, "
              "consistent cool overcast daylight, high contrast, cinematic, photorealistic, no seams, "
              "no repeated tiles, no text, no logo."),
    },
    "streetside_night": {
        "cn": "路边夜·便利店门口（夜/cold）",
        "dna": ("路边夜·便利店门口：便利店入口亮内部货架与门；店面海报板与户外 ATM；人行道上单一路灯与"
                "停放自行车；暗湿街面远处车灯、雨反。冷蓝夜、便利店暖光小孤岛。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous street at night by a "
              "convenience-store entrance, panning left to right as ONE unbroken space: far left shows the "
              "convenience-store entrance with bright interior shelving and a lit doorway; left-center shows "
              "the storefront with a poster board and an outdoor ATM; center-right shows the sidewalk under a "
              "single streetlamp with a parked bicycle; far right shows the dark wet street with distant car "
              "lights and rain-slick asphalt. consistent cool-blue night lighting with a small warm "
              "convenience-store spill, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "fire_archive": {
        "cn": "消防档案室（日/cold）",
        "dna": ("消防档案室：一排灰色金属文件柜；阅览桌配档案盒与台灯；书架满档案件卷宗夹；"
                "小窗日光与滚轮梯。冷调机构日光。"),
        "b": ("wide photograph of a continuous fire-department archive room in daytime, shown as a "
              "left-to-right sweep: far left shows rows of grey metal filing cabinets; left-center shows a "
              "reading desk with archive boxes and a desk lamp; center-right shows shelves of binders and "
              "case-file folders; far right shows a small window with daylight and exactly one rolling ladder "
              "leaning against a single shelf. exactly one ladder only, consistent cool institutional "
              "daylight, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "hardware_store": {
        "cn": "五金店（日/cold）",
        "dna": ("五金店：工具架与钉/栓/螺丝分拣盒；木质柜台配收银与店主位；悬挂园艺工具、绳卷与管；"
                "入口成卷电线与门外日光。冷调阴天日光。"),
        "b": ("wide photograph of a continuous small hardware store interior in daytime, shown as a "
              "left-to-right sweep: far left shows the shop entrance with exactly one wooden front door and "
              "rolls of wire; left-center shows shelves of tools with bins of nails, bolts and screws; "
              "center-right shows a wooden counter with a cash register and a shopkeeper stool; far right "
              "shows hanging garden tools, coils of rope and pipes on the wall. exactly one doorway only, "
              "no extra doors, consistent cool overcast daylight, high contrast, cinematic, photorealistic, "
              "no seams, no repeated tiles, no text, no logo."),
    },
    "suburb_home": {
        "cn": "城郊家·吴敬东（日/cold）",
        "dna": ("城郊家·吴敬东：门口走廊带鞋架；客厅旧布沙发、矮桌与旧电视；厨房角冰箱与窗；"
                "后门小阳台与郊区院景。冷调朴素日光。"),
        "b": ("ultra-wide seamless panoramic photograph of a continuous modest suburban home living space in "
              "daytime, panning left to right as ONE unbroken space: far left shows a doorway to a hallway "
              "with a shoe rack; left-center shows a living room with a worn fabric sofa, a low table and an "
              "old television; center-right shows a kitchen corner with a fridge and a window; far right "
              "shows a back door with a small balcony and a suburban yard view. consistent cool modest "
              "daylight, high contrast, cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
    "post_office": {
        "cn": "城西邮局（日/cold）",
        "dna": ("城西邮局：服务柜台带业务窗与职员桌；一排私人信箱与包裹架；书写台配表单与邮票机；"
                "玻璃门入口与室外邮筒、日光。冷调机构日光。"),
        "b": ("wide photograph of a continuous west-city post office interior in daytime, shown as a "
              "left-to-right sweep: far left shows a service counter with transaction windows and a clerk "
              "desk; left-center shows a row of individual postboxes and parcel shelves; center-right shows a "
              "writing desk with forms and a stamp-vending machine; far right shows a glass entrance door "
              "with an outdoor mailbox and daylight. consistent cool institutional daylight, high contrast, "
              "cinematic, photorealistic, no seams, no repeated tiles, no text, no logo."),
    },
}

NEG = "no distortion, no stretched objects, no seam, no text, no logo, no duplicate"

# 去畸变后缀（方式B超宽图系统性诱发鱼眼/广角畸变，统一拼接强制 rectilinear）
# 根因：'panoramic/ultra-wide' 措辞 + 室内大空间 → 模型用球面投影，直线变弧线
DISTORT_SUFFIX = (", straight rectilinear perspective, no fisheye, no wide-angle lens distortion, "
                  "no barrel distortion, no curved walls, no curved floor, no curved lines, "
                  "straight edges, normal camera lens, architectural photography")


# ============================================================
# 工作流
# ============================================================
def build_nodes(positive, prefix, w, h, seed):
    return {
        "2": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP, "type": "krea2", "device": "cpu"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": positive}},
        "8": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": ""}},
        "7": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["8", 0]}},
        "9": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "12": {"class_type": "KSampler",
               "inputs": {"model": ["2", 0], "positive": ["6", 0], "negative": ["7", 0],
                          "latent_image": ["9", 0], "seed": seed, "steps": 8, "cfg": 1.0,
                          "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["4", 0]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }


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


def find_output(op, base, prefix, timeout=900):
    """轮询全量 /history，按文件名前缀匹配（规避单条 /history/{pid} 返空的坑）。"""
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            with op.open(base + "/history?max_items=128", timeout=30) as r:
                hist = json.loads(r.read())
            for pid, node in hist.items():
                for o in node.get("outputs", {}).values():
                    for img in o.get("images", []):
                        if img.get("filename", "").startswith(prefix):
                            return img
        except Exception as e:
            print("  轮询异常(忽略):", repr(e)[:100], flush=True)
        time.sleep(6)
    return None


def download(op, base, img, dest):
    q = urllib.parse.urlencode({"filename": img["filename"],
                                "subfolder": img.get("subfolder", ""),
                                "type": img.get("type", "output")})
    with op.open(base + "/view?" + q, timeout=120) as r:
        data = r.read()
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


# ============================================================
# 客观校验
# ============================================================
def ahash(p, size=32):
    im = Image.open(p).convert("L").resize((size, size), Image.LANCZOS)
    px = list(im.getdata()); avg = sum(px) / len(px)
    return [1 if v > avg else 0 for v in px]


def hdiff(a, b):
    return sum(1 for x, y in zip(a, b) if x != y)


def report_diffs(items):
    """items: [(label, path), ...] → 两两哈希差 + 平均亮度"""
    hs = [(lbl, ahash(p), p) for lbl, p in items]
    print("--- 两两平均哈希差 (0-1024, 越高=越不同) ---", flush=True)
    diffs = []
    for i in range(len(hs)):
        for j in range(i + 1, len(hs)):
            d = hdiff(hs[i][1], hs[j][1]); diffs.append(d)
            print("  %s vs %s: %d" % (hs[i][0], hs[j][0], d), flush=True)
    if diffs:
        m = sum(diffs) / len(diffs)
        print("  平均差异=%.0f (~%.0f%%)" % (m, m / 1024 * 100), flush=True)
    print("--- 平均亮度 (0-255) ---", flush=True)
    for lbl, _, p in hs:
        im = Image.open(p).convert("L")
        px = list(im.getdata())
        print("  %s: %.1f" % (lbl, sum(px) / len(px)), flush=True)


# ============================================================
# 生成
# ============================================================
def gen_A(op, base, scene, outdir, seed, w=1536, h=1536):
    p = SCENES[scene]
    prefix = "WBSCENE_%s_A" % scene.upper()
    print("== [方式A 2x2网格] %s (%s) %dx%d ==" % (scene, p["cn"], w, h), flush=True)
    pid = submit(op, base, build_nodes(p["a"], prefix, w, h, seed))
    print("  prompt_id:", pid[:8], " prefix:", prefix, flush=True)
    img = find_output(op, base, prefix)
    if not img:
        print("  !! 未找到产物"); return None
    dest = os.path.join(outdir, "Krea2_Scene_%s_2x2.png" % scene)
    n = download(op, base, img, dest)
    im = Image.open(dest)
    print("  落盘:", dest, n, "bytes  size:", im.size, flush=True)
    if im.size != (w, h):
        print("  !! 尺寸不符（疑似撞车旧图），请删掉重跑:", im.size); return None
    # 裁 4 象限
    W, H = im.size; hw, hh = W // 2, H // 2
    quads = {"TL主视": (0, 0, hw, hh), "TR左": (hw, 0, W, hh),
             "BL右": (0, hh, hw, H), "BR俯视": (hw, hh, W, H)}
    items = []
    for k, v in quads.items():
        qp = os.path.join(outdir, "Krea2_Scene_%s_2x2_%s.png" % (scene, k[:2]))
        im.crop(v).save(qp); items.append((k, qp))
    report_diffs(items)
    print("  提示：网格 4 格共享同一 latent，差异通常低于宽图法，属正常；重点看有无某格被邻近格'渗透'。", flush=True)
    return dest


def gen_B(op, base, scene, outdir, seed, w=3072, h=1024, prefix_extra=""):
    p = SCENES[scene]
    prefix = "WBSCENE_%s_B%s" % (scene.upper(), prefix_extra)
    print("== [方式B 超宽连续图] %s (%s) %dx%d ==" % (scene, p["cn"], w, h), flush=True)
    pid = submit(op, base, build_nodes(p["b"] + DISTORT_SUFFIX, prefix, w, h, seed))
    print("  prompt_id:", pid[:8], " prefix:", prefix, flush=True)
    img = find_output(op, base, prefix)
    if not img:
        print("  !! 未找到产物"); return None
    dest = os.path.join(outdir, "Krea2_Scene_%s_pano.png" % scene)
    n = download(op, base, img, dest)
    im = Image.open(dest)
    print("  落盘:", dest, n, "bytes  size:", im.size, flush=True)
    if im.size != (w, h):
        print("  !! 尺寸不符（疑似撞车旧图），请删掉重跑:", im.size); return None
    # 裁 4 段
    W, H = im.size; seg = W // 4
    names = ["front", "right", "back", "left"]
    items = []
    for i in range(4):
        sp = os.path.join(outdir, "Krea2_Scene_%s_%s.png" % (scene, names[i]))
        im.crop((i * seg, 0, (i + 1) * seg, H)).save(sp)
        items.append((names[i], sp))
    report_diffs(items)
    print("  说明：这是'超宽连续视角图'，非真 360 全景，覆盖约 140° 前向，看不到相机背后。", flush=True)
    return dest


if __name__ == "__main__":
    argv = sys.argv[1:]
    base = None; scene = "office_night"; method = "both"; seed = 20260914
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "fogport_assets", "scene_sheets")
    for i, a in enumerate(argv):
        if a == "--url" and i + 1 < len(argv):
            base = argv[i + 1].rstrip("/")
        elif a == "--scene" and i + 1 < len(argv):
            scene = argv[i + 1]
        elif a == "--method" and i + 1 < len(argv):
            method = argv[i + 1].upper()
        elif a == "--seed" and i + 1 < len(argv):
            seed = int(argv[i + 1])
        elif a == "--outdir" and i + 1 < len(argv):
            outdir = argv[i + 1]
    # 允许读同目录 comfy_url.txt
    if not base:
        f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "comfy_url.txt")
        if os.path.exists(f):
            base = open(f, encoding="utf-8").read().strip().rstrip("/")
    if not base:
        print("缺少 --url <ENDPOINT>（或在同目录放 comfy_url.txt）"); sys.exit(1)
    if scene not in SCENES:
        print("未知场景:", scene, " 可选:", list(SCENES.keys())); sys.exit(1)

    op = make_opener()
    # 探活
    try:
        with op.open(base + "/system_stats", timeout=20) as r:
            json.loads(r.read())
        print("云端存活:", base, flush=True)
    except Exception as e:
        print("云端不可达:", repr(e)[:120]); sys.exit(1)

    if method in ("A", "BOTH"):
        gen_A(op, base, scene, outdir, seed)
    if method in ("B", "BOTH"):
        gen_B(op, base, scene, outdir, seed)
    print("== 完成，输出目录:", outdir, "==")
