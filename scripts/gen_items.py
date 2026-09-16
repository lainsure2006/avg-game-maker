# -*- coding: utf-8 -*-
"""
《<game>》Step 5 — 物证底图（15 张）批量出图

方案：底图只出「材质与光影」，文字全部留白，由本地 PIL 叠加真实文案
（见 <game>/剧本化/05_物证图_制作规格.md）。

出图栈：Krea2 三件套 + CLIPTextEncode 纯文生图 + ConditioningZeroOut 负向
参数：1280×960 / steps=8 / cfg=1.0 / euler + simple / denoise=1.0

用法：
    python gen_items.py                 # 全部 15 张
    python gen_items.py letter7 postmark   # 只跑指定几张

产物：<game>_assets/item_bases/Krea2_Item_<id>.png
"""
import os, sys, json, uuid, time
import urllib.request
import comfy_krea2_sheet as K

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(HERE, "<game>_assets", "item_bases")
os.makedirs(OUTDIR, exist_ok=True)

# ⚠️ 云端 IP 每次开机都会变，用 comfy_url.txt 覆盖，勿写死
BASE = "https://7f5f46ae988043ae8040338b0bd2641b--8188.ap-shanghai2.cloudstudio.club"
_urlf = os.path.join(HERE, "comfy_url.txt")
if os.path.isfile(_urlf):
    BASE = open(_urlf, encoding="utf-8").read().strip().rstrip("/")

UNET = "krea2_turbo_int8_convrot.safetensors"
CLIP = "qwen3vl_4b_fp8_scaled.safetensors"
VAE = "qwen_image_vae.safetensors"

W, H = 1280, 960

# 风格基底：每张都带（与 P0 定调一致：写实照片感 + 冷调 + 高对比反灰）
STYLE = (
    "写实照片感，翻拍扫描实物质感，冷色调校色，高对比，深色阴影有细节，"
    "电影感硬光，画面清晰锐利，不灰不雾，"
)
    # 🔴 铁律：底图必须无字，否则 Krea2 脑补乱码字符（中文小字 100% 崩）
NO_TEXT = "纸面完全空白，没有任何文字、字母、数字、符号、水印，"
# 🔴 第二条铁律（2026-09-15 血的教训）：**不要在正向提示里提到「印章/红章/红色印记/手写字」**。
#    写着「没有任何印章」也会被当成正面词采样 → AI 反而画出乱码红章。
#    正确做法：**整段不提**，只说「纸面素净空白」。


ITEMS = [
    # (id, seed, 底图提示词)
    # ── 试产 A（2026-09-15）：验证「正拍充满画面」构图是否被 Krea2 服从 ──
    #    动机：现有底图是「俯拍特写+桌面环境」，纸面在画面里又小又斜（倾斜 5~15° 且带透视），
    #    导致叠字必须做单应变换才能贴合格线；若底图本身正拍，则排版回归普通正坐标，
    #    且纸面分辨率从 ~700×330 提升到 1280×960，字迹清晰度提升 3~4 倍。
    ("letter7_flat", 4401,
     "一张米白色方格信纸的正面垂直俯视照片，"
     "纸张平铺摆正、四条边与画面边缘完全平行，"
     "纸张撑满整个画面、看不到桌面与背景，"
     "完全没有透视变形、没有倾斜、正对镜头，"
     "纸面素净空白，有轻微折痕与压痕，纸张纤维与方格线清晰，"
     "均匀柔和的冷白台灯光，画面安静，"),
    ("fire_report_table_flat", 4402,
     "一张旧消防登记表格的正面垂直俯视照片，"
     "表格纸张平铺摆正、四条边与画面边缘完全平行，"
     "纸张撑满整个画面、看不到桌面与背景，"
     "完全没有透视变形、没有倾斜、正对镜头，"
     "表格是黑白印刷网格（表头栏与多行单元格），格子线清晰工整，"
     "纸面素净空白，纸略泛黄，"
     "均匀柔和的冷白荧光灯，"),
    ("letter7", 4101,
     "俯拍特写，一张米白色方格信纸平铺在旧木桌面上，纸面完全空白，"
     "有轻微折痕与压痕，纸张纤维清晰，"
     "台灯冷白光从左上斜射，右下方有柔和阴影，背景是虚化的雨夜窗户与暗色室内，"
     "浅景深，画面安静，"),
    # ⚠️ 首版（4102/4202）两次失败：都在提示里提了「印章」→ AI 反而画出**乱码红章**，且焦化不明显。
    #    4302 版：整段不提印章/印记；用「硬卡纸」替代「借书卡」（后者会触发「借书证」联想）；
    #    把焦黑提到句首并加重权重词，确保碳化是画面主体。
    ("card_burnt", 4302,
     "俯拍特写，一张小型长方形硬卡纸平放在深棕色木桌上，"
     "卡片右侧约三分之一被火严重烧毁，呈大面积焦黑色碳化，"
     "碳化边缘不规则卷曲、破碎、有烧穿的孔洞与黑色炭化碎屑掉落，"
     "焦痕从右向左由纯黑渐变为褐色再过渡到完好纸面，"
     "卡片左半部分完好，纸面素净，只有淡蓝色横线格，"
     "冷白光从左上打来，浅景深，"),
    # ⚠️ 首版（4103/4203）失败：报纸正文被画成明显乱码笔画（「报纸」必然触发文字）。
    #    4303 版：**改成只拍版面顶部局部特写**，正文天然出画 → 从根上消除乱码。
    ("newspaper_1020", 4303,
     "一张旧报纸版面上半部分的局部特写，报纸泛黄有折痕与霉斑，"
     "画面最上方是一整条完全空白的横向纸带（纯粹的泛黄纸面），"
     "空白横幅正下方是一张黑白新闻照片：一栋两层旧楼外景、外墙大面积焦黑、"
     "二楼窗口熏黑、楼下有围观人群的模糊剪影、地面有水渍，"
     "照片下方只露出一小条空白的纸张边缘就被画面裁掉，"
     "冷调校色，翻拍扫描质感，"),
    ("fire_report_table", 4104,
     "一张A4纸复印件俯拍，纸上是一个打印表格，表格边框与横线竖线清晰，"
     "但所有单元格内部完全空白，"
     "复印件特有的底灰与轻微倾斜，纸面有复印条纹，右侧有两个装订孔，"
     "冷白色荧光灯从上方照明，桌面为浅灰色，浅景深，"),
    ("photo_scorch", 4105,
     "一张现场勘查翻拍照片，照片有白色边框，"
     "画面是一面烧焦的砖墙，墙面有清晰的V字形向上蔓延的焦痕，"
     "V字底部窄、向上逐渐变宽（火焰向上蔓延的痕迹），"
     "黑白低饱和，闪光灯直打的硬光，四角有暗角，颗粒感，"),
    ("photo_stain", 4106,
     "一张现场翻拍照片，低角度闪光灯直打，"
     "画面是一扇旧木门内侧下缘的特写，门板下方有一道深褐色的干涸流挂痕迹，"
     "液体从门缝向下流淌后干涸的形状，颜色深褐发暗，"
     "木门纹理清晰，暗部很重，高对比，照片有白色边框，"),
    ("note_lu", 4107,
     "俯拍特写，一张黄色便利贴便签纸平放在旧木桌面上，纸面完全空白，"
     "纸面有一道被笔尖用力划破的痕迹和一个小破口，纸张微微卷曲，"
     "左上角有胶带残留的痕迹，冷白台灯光，浅景深，"),
    # ⚠️ 首版（4108）失败：提了「印章」→ AI 画出红框印章，且下层纸页残留半可读乱码字。
    #    4308 版：整段不提印章，强调「全新空白复印纸」。
    ("report_copy", 4308,
     "俯拍，几页装订过的空白复印纸摊开叠放在深灰色桌面上，"
     "纸页边缘有装订钉痕与打孔痕迹，纸面干净素白，有明显复印底灰与轻微条纹，"
     "纸张有复印件的微微泛灰，边角略有卷曲，"
     "冷白荧光灯，"),
    ("seven_papers", 4109,
     "俯拍，七张手写纸整齐拼排陈列（上排3张下排4张）在深褐色桌面上，"
     "每张纸上有模糊的手写笔迹痕迹，笔迹不可辨认、不形成任何可读文字，"
     "纸张颜色略有差异，米白与泛黄混杂，有折痕与磨损，"
     "冷白光从左上打来，画面安静，"),
    # ⚠️ 首版（4110）失败：AI 自画的「蓝色手写批注」是**半可读的乱码汉字**。
    #    4310 版：底图彻底留白（不写批注），批注改由 PIL 用楷体叠上去。
    ("report_p18", 4310,
     "俯拍特写，一张泛黄的档案纸页平放，纸页有折角、磨损边与装订折痕，"
     "纸面素净空白，只有纸张纤维与陈旧斑点，"
     "右上角有一小块空白的页码框（框内空白），"
     "冷白光，浅景深，"),
    ("tin_box", 4111,
     "一张旧铁皮饼干盒的特写，盒盖为长方形，盒盖中央有一块空白的浅色标贴区域，"
     "盒体表面锈迹斑驳，有划痕与掉漆，冷调金属反光，"
     "暗色背景，侧上方硬光，浅景深，"),
    ("regular_list", 4112,
     "俯拍，一本旧账簿内页摊开平放，纸页为泛黄的竖排红线格，"
     "红色竖线与横线清晰，格子内部完全空白，"
     "纸页有污渍与水痕，边角磨损卷曲，"
     "纸上有极淡的模糊手写笔迹痕迹（不可辨认），冷白光，"),
    ("old_book", 4113,
     "俯拍特写，一本旧书摊开，露出扉页，纸页泛黄有黄斑与磨损，"
     "扉页正中央有一块空白区域（供盖章），周围是模糊的印刷痕迹，"
     "书页边缘有压痕与折角，装订线可见，冷白光，浅景深，"),
    ("two_timelines", 4114,
     "俯拍特写，一张出勤值班记录表平放，表格边框与格线清晰，"
     "但所有单元格内部完全空白，"
     "纸面为复印件底灰质感，表格上方有表头横线区域但空白，"
     "冷白荧光灯照明，桌面浅灰，"),
    ("postmark", 4115,
     "一张牛皮纸信封的特写，纸张纤维与纹理清晰，"
     "信封右上角有一块空白的圆形区域（供盖邮戳），"
     "浅景深，冷白侧光从左上方打来，背景虚化的深色桌面，"),
    # ── 16. final_pencil_note（2026-09-15 由 09 分镜画面呈现审核补出）──
    #    原 last_page 被当"孤儿物证"误删，但它是 ch12-1 真相结局的最后一句台词。
    #    底图走「正拍撑满画面」（同 letter7_flat 思路）：纸面即全画面 →
    #    叠字可用普通正坐标，不需要单应变换，且纸面分辨率吃满 1280×960。
    ("final_pencil_note", 4416,
     "一张旧书内页的正面垂直俯视照片，"
     "纸张平铺摆正、四条边与画面边缘完全平行，"
     "纸面撑满整个画面、看不到桌面与背景，"
     "完全没有透视变形、没有倾斜、正对镜头，"
     "纸面泛黄、有零星陈年黄斑与纤维纹理，"
     "右侧有一条装订折痕的浅压印，右下角边缘微微磨损起毛、有细小缺口，"
     "纸面素净空白，"
     "冷白柔和的侧光从左上打来，浅景深，画面安静，"),
]


def build_nodes(prefix, seed, pos_text, w=W, h=H):
    """纯文生图链（无参考图）：Krea2 clip 用 CLIPTextEncode，负向零化。"""
    return {
        "2": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": CLIP, "type": "krea2", "device": "cpu"}},
        "4": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": pos_text}},
        "8": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": ""}},
        "7": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["8", 0]}},
        "9": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "12": {"class_type": "KSampler", "inputs": {"model": ["2", 0], "positive": ["6", 0], "negative": ["7", 0],
                                                    "latent_image": ["9", 0], "seed": seed, "steps": 8, "cfg": 1.0,
                                                    "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["4", 0]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }


def submit(op, prefix, seed, text, iid=None):
    """iid 必须显式传入：含下划线的 id 若从 prefix 反解会被截断成最后一个片段。"""
    body = json.dumps({"prompt": build_nodes(prefix, seed, text),
                       "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(BASE + "/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        with op.open(req, timeout=60) as r:
            resp = json.loads(r.read())
    except Exception as e:
        print("  提交失败:", repr(e)[:200]); return None
    if "prompt_id" not in resp:
        print("  被拒:", json.dumps(resp, ensure_ascii=False)[:400]); return None
    pid = resp["prompt_id"]
    print("  pid", pid[:8], flush=True)
    # 🔴 必须传 pid：否则会匹配到上一轮同前缀的旧产物（静默拿回旧图）
    img = K.find_output(op, BASE, prefix, timeout=900, pid=pid)
    if not img:
        print("  !! 无产物"); return None
    dest = os.path.join(OUTDIR, "Krea2_Item_%s.png" % (iid or prefix.lower()))
    K.download(op, BASE, img, dest)
    sz = os.path.getsize(dest)
    # 🔴 出图必看体积：5~6KB = 单色空图（history 会谎报 success）
    print("  ->", dest, sz, "bytes", "  ⚠️疑似空图!" if sz < 20000 else "")
    return dest


def main(only=None, force=None):
    """用法：python gen_items.py letter7            # 只跑指定
             python gen_items.py --force card_burnt # 强制重出（旧图改名留档，不删）"""
    force = set(force or [])
    op = K.make_opener()
    print("BASE =", BASE)
    made = []
    for iid, seed, desc in ITEMS:
        if only and iid not in only:
            continue
        dst = os.path.join(OUTDIR, "Krea2_Item_%s.png" % iid)
        if iid in force and os.path.isfile(dst):
            os.replace(dst, dst[:-4] + "_old%02d.png" % seed)
            print("== %s 强制重出（旧图留档）==" % iid, flush=True)
        elif os.path.isfile(dst) and os.path.getsize(dst) > 20000:
            print("== %s 已存在，跳过 ==" % iid); made.append(dst); continue
        print("== %s ==" % iid, flush=True)
        p = submit(op, "ITEM_%s_S%d" % (iid.upper(), seed), seed, STYLE + NO_TEXT + desc, iid=iid)
        if p:
            made.append(p)
    print("== DONE ==")
    for p in made:
        print("  ", p)


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--force" in argv:
        i = argv.index("--force")
        ids = argv[i + 1:] or [x[0] for x in ITEMS]   # 不带 id = 全部强制重出
        main(only=ids, force=ids)
    else:
        main(only=argv or None)
