#!/usr/bin/env python
# 方式 A：2x2 网格图 —— 一次生成 1536x1536，内部 2x2 排布同一场景 4 个视角。
# 用法：编辑下方 SCENE_GRID，然后 `python method_2x2.py`
# 产出：ComfyUI/output/SceneGrid/<NAME>_2x2_00001_.png
# 脚本自动校验 4 个象限的平均哈希差，确认 4 格确实为不同视角。

import urllib.request, json, time, os
from PIL import Image

OUT = "/workspace/ComfyUI/output"
NAME = "Scene_2x2"   # 输出前缀（子目录 SceneGrid/）
SEED = 20260914

# ===== 编辑这里：同场景 4 视角 + 一致性锁（见 提示词模板.md 方式 A）=====
SCENE_GRID = ("场景设定参考图，一张图内以 2x2 网格排布展示同一赛博朋克小巷拉面摊的多个相机视角："
    "左上为主视角（正面看向摊位），右上为左侧视角（从霓虹招牌一侧看入），"
    "左下为右侧视角（从金属管道一侧看入），右下为俯视特写（俯瞰吧台与三只圆凳布局）。"
    "固定场景库存：红底白字霓虹招牌'拉麵'在左、红色条纹遮阳棚、木质吧台与三只高脚圆凳、"
    "锈迹金属管道与蓝色电缆在右、湿滑反光地面。"
    "保留完全相同的建筑结构、道具、光照方向（暖橙从摊位内、冷蓝从巷尾）、调色板与物体数量，仅旋转相机角度。"
    "夜晚氛围，各视角统一光照与色调，无 logo，高清，细节清晰。"
    "Continuity lock: 招牌'拉麵'始终在左；管道与蓝电缆始终在右；暖橙内光、冷蓝巷尾光方向不变；"
    "吧台三只圆凳数量不变；无场景、光照或色调变更。")
# ==========================================================================

NEG = "no distortion, no text, no logo, no duplicate"

nodes = {
  "2": {"class_type":"UNETLoader","inputs":{"unet_name":"krea2_turbo_int8_convrot.safetensors","weight_dtype":"default"}},
  "3": {"class_type":"CLIPLoader","inputs":{"clip_name":"qwen3vl_4b_fp8_scaled.safetensors","type":"krea2","device":"cpu"}},
  "4": {"class_type":"VAELoader","inputs":{"vae_name":"qwen_image_vae.safetensors"}},
  "6": {"class_type":"CLIPTextEncode","inputs":{"clip":["3",0],"text":SCENE_GRID}},
  "8": {"class_type":"CLIPTextEncode","inputs":{"clip":["3",0],"text":""}},
  "7": {"class_type":"ConditioningZeroOut","inputs":{"conditioning":["8",0]}},
  "9": {"class_type":"EmptyLatentImage","inputs":{"width":1536,"height":1536,"batch_size":1}},
  "12": {"class_type":"KSampler","inputs":{"model":["2",0],"positive":["6",0],"negative":["7",0],
         "latent_image":["9",0],"seed":SEED,"steps":8,"cfg":1.0,
         "sampler_name":"euler","scheduler":"simple","denoise":1.0}},
  "13": {"class_type":"VAEDecode","inputs":{"samples":["12",0],"vae":["4",0]}},
  "14": {"class_type":"SaveImage","inputs":{"images":["13",0],"filename_prefix":f"SceneGrid/{NAME}"}}
}

def submit():
    data=json.dumps({"prompt":nodes}).encode()
    req=urllib.request.Request("http://127.0.0.1:8188/prompt",data=data,headers={"Content-Type":"application/json"})
    return json.loads(urllib.request.urlopen(req,timeout=30).read())["prompt_id"]

def ahash(p,size=32):
    im=Image.open(p).convert("L").resize((size,size),Image.LANCZOS)
    px=list(im.getdata()); avg=sum(px)/len(px)
    return [1 if v>avg else 0 for v in px]
def hdiff(a,b): return sum(1 for x,y in zip(a,b) if x!=y)

pid=submit(); print("SUBMITTED",pid,flush=True)
img=None
for i in range(120):
    time.sleep(6)
    try: hist=json.loads(urllib.request.urlopen(f"http://127.0.0.1:8188/history/{pid}",timeout=30).read())
    except Exception: continue
    if pid in hist:
        for nid,o in hist[pid].get("outputs",{}).items():
            for im in o.get("images",[]):
                img=os.path.join(OUT,im.get("subfolder","") or "",im["filename"])
                print("DONE",img,flush=True)
        break

if img:
    im=Image.open(img); W,H=im.size; hw,hh=W//2,H//2
    quads={"TL(主视)":(0,0,hw,hh),"TR(左)":(hw,0,W,hh),"BL(右)":(0,hh,hw,H),"BR(俯视)":(hw,hh,W,H)}
    hs={k:ahash(im.crop(v)) for k,v in quads.items()}
    print("--- 4 象限两两哈希差(0-1024, 越高=越不同视角) ---",flush=True)
    ks=list(hs); diffs=[]
    for i in range(4):
        for j in range(i+1,4):
            d=hdiff(hs[ks[i]],hs[ks[j]]); diffs.append(d)
            print(f"{ks[i]} vs {ks[j]}: {d}",flush=True)
    print(f"平均差异={sum(diffs)//len(diffs)} (~{sum(diffs)/len(diffs)/1024*100:.0f}%)",flush=True)
    print("提示：网格法 4 格共享同一 latent，差异通常低于宽图法的 30%，属正常；重点看有无某格被邻近格'渗透'。",flush=True)
print("A_DONE",flush=True)
