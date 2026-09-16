# -*- coding: utf-8 -*-
"""
《<game>》批量出立绘 —— 青幕版（最终方案）

方案定型（经 4 轮失败迭代）：
  背景 = 均匀纯青色（cyan）
  抠图 = 色调判据（g-r > 20 且 b-r > 20）+ 连通域补洞 + 青色 despill
  服装 = **完全按原设定**（灰/黑/白/藏青/棕 全安全，无需回避颜色）

为什么灰阶背景被淘汰：白发(180~230) 与黑衣(30) 分处亮度两端，
任何灰阶亮度都会撞其中之一 —— 中灰撞白发、深灰撞黑衣，无解。
青幕在色相上与所有人物元素都不同，且色相判据与明暗无关，
因此天然容忍背景光照渐变（早期用亮度差判据时会出现残留斑块）。
"""
import os, sys
import gen_bust as G

CYAN_BG = (
    "背景为均匀的纯青色背景（cyan，明亮的青蓝色），"
    "背景颜色完全均匀一致、无渐变、无纹理、无阴影、无杂物。"
)

COMMON = (
    "保持参考图中人物的脸型、五官、发型、肤色、气质完全不变，只改变服装。"
    "单人，正面，站立，居中，从头到腰部完整入镜，人物身体完整可见，"
    "画面中只有一个人物、只有一个头部，身首比例协调，构图正常，"
    "均匀影棚光线，无文字，无logo，无其他人物，高清细节。"
)

CHARS = [
    ("zhouyu", 8501,
     "中国男性，35岁，黑色短发，国字脸轮廓硬朗，剑眉微锁，冷白肤色，瘦高身材，"
     "看起来三十出头、皮肤紧致、无明显皱纹，神情犬儒而犀利。"
     "身穿深灰色长款风衣，内搭白衬衫，深色西裤。"),
    ("jiangyan", 8502,
     "中国男性，31岁，柔顺黑发微长，五官清秀干净、温润如玉、清俊耐看，极具镜头感，"
     "眼神温和略沉，气质文艺内敛、安静。"
     "身穿洗旧的深灰色圆领毛衣，深色长裤。"),
    ("luzhensheng", 8503,
     "中国男性，59岁，灰白短发，方脸沟壑深，神情沧桑沉重，身形略驼。"
     "身穿旧藏青色夹克，内搭深色衬衫，深色长裤。"),
    ("laochen", 8504,
     "中国男性，中老年，圆脸微胖，灰发，神情平和不起眼。"
     "身穿蓝色布制工装外套，深色长裤。"),
    ("zhaoyongnian", 8505,
     "中国男性，中年，身形壮实，寸头，皮肤糙黑，神情直爽。"
     "身穿深褐色工装外套，系着沾油渍的深色围裙，深色长裤。"),
    ("wujingdong", 8506,
     "中国男性，老年，灰发，身形精干，眼神锐利，神情沉稳。"
     "身穿深灰色旧夹克，内搭深色衬衫，深色长裤。"),
    ("old_postman", 8507,
     "中国男性，中老年，身形瘦小，神情温和。"
     "身穿深蓝色旧式邮政制服衬衫，深色长裤。"),
]


def main(only=None):
    op = G.K.make_opener()
    made = []
    for cid, seed, desc in CHARS:
        if only and cid not in only:
            continue
        sheet = os.path.normpath(os.path.join(G.OUTDIR, "..", "krea2_sheets",
                                             "Krea2_Char_%s_real.png" % cid))
        if not os.path.isfile(sheet):
            print("!! 缺角色表", sheet); continue
        print("== %s ==" % cid, flush=True)
        ref = G.face_ref(sheet)
        # ⚠️ /upload/image 端点会周期性 500（实测持续故障，连 4 字节探测包也 500）。
        # 绕过：input 目录里**已上传过**的同名参考图可直接引用，无需重新上传。
        # 若引用失败（文件已被清理）再回退到上传。
        ref_name = os.path.basename(ref)
        if not G.ref_exists(op, ref_name):
            try:
                ref_name = G.upload(op, G.BASE, ref)
            except Exception as e:
                print("  !! 上传失败且无已有文件，跳过:", repr(e)[:120]); continue
        else:
            print("  复用云端已有参考图:", ref_name)
        raw = G.run(op, "WBCY2_%s" % cid.upper(), seed, ref_name, COMMON + desc + CYAN_BG)
        if raw:
            made.append(G.crop_bust(raw, "Krea2_Bust_%s_gray.png" % cid, crop_ratio=1.0))
    print("== DONE ==")
    for p in made:
        print("  ", p)


if __name__ == "__main__":
    main(only=sys.argv[1:] or None)
