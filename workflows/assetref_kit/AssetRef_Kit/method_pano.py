#!/usr/bin/env python
# 方式 B：超宽连续视角图 —— 生成 3072x1024 连续场景，裁 4 段当 前/右/后/左 参考。
# 用法：编辑下方 PANORAMA，然后 `python method_pano.py`
# 产出：ComfyUI/output/Panorama/<NAME>_00001_.png（宽图）
#       ComfyUI/output/Panorama/<NAME>_front/right/back/left.png（4 张裁切）
# 脚本自动打印 4 段两两哈希差，客观确认"确为不同视角"（实测均值 ~30%）。

import urllib.request, json, time, os
from PIL import Image

OUT = "/workspace/ComfyUI/output"
NAME = "Scene_pano"   # 输出前缀（子目录 Panorama/）
SEED = 20260914

# ===== 编辑这里：左->右连续 ONE unbroken space（见 提示词模板.md 方式 B）=====
PANORAMA = ("ultra-wide seamless panoramic photograph of a continuous cyberpunk alley ramen stall scene, "
     "panning left to right as ONE unbroken space: far left shows a neon-sign wall with red 'RAMEN' sign "
     "and rusty metal pipes; left-center shows the ramen stall cart with red striped awning and three round stools; "
     "center-right shows the stall interior with steam and warm orange light; far right shows the alley mouth "
     "with blue city glow, hanging cables and wet reflective ground. "
     "consistent warm-orange interior light blending to cool-blue ambient, cinematic, photorealistic, "
     "no seams, no repeated tiles, no text, no logo.")
# =============================================================================

NEG = "no distortion, no stretched objects, no seam, no text, no logo, no duplicate"

def base():
    return {
     "2":{"class_type":"UNETLoader","inputs":{"unet_name":"krea2_turbo_int8_convrot.safetensors","weight_dtype":"default"}},
     "3":{"class_type":"CLIPLoader","inputs":{"clip_name":"qwen3vl_4b_fp8_scaled.safetensors","type":"krea2","device":"cpu"}},
     "4":{"class_type":"VAELoader","inputs":{"vae_name":"qwen_image_vae.safetensors"}},
    }

nodes=base()
nodes["6"]={"class_type":"CLIPTextEncode","inputs":{"clip":["3",0],"text":PANORAMA}}
nodes["8"]={"class_type":"CLIPTextEncode","inputs":{"clip":["3",0],"text":""}}
nodes["7"]={"class_type":"ConditioningZeroOut","inputs":{"conditioning":["8",0]}}
nodes["9"]={"class_type":"EmptyLatentImage","inputs":{"width":3072,"height":1024,"batch_size":1}}
nodes["12"]={"class_type":"KSampler","inputs":{"model":["2",0],"positive":["6",0],"negative":["7",0],
        "latent_image":["9",0],"seed":SEED,"steps":8,"cfg":1.0,"sampler_name":"euler","scheduler":"simple","denoise":1.0}}
nodes["13"]={"class_type":"VAEDecode","inputs":{"samples":["12",0],"vae":["4",0]}}
nodes["14"]={"class_type":"SaveImage","inputs":{"images":["13",0],"filename_prefix":f"Panorama/{NAME}"}}

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
pano=None
for i in range(160):
    time.sleep(6)
    try: hist=json.loads(urllib.request.urlopen(f"http://127.0.0.1:8188/history/{pid}",timeout=30).read())
    except Exception: continue
    if pid in hist:
        for nid,o in hist[pid].get("outputs",{}).items():
            for im in o.get("images",[]):
                pano=os.path.join(OUT,im.get("subfolder","") or "",im["filename"])
                print("PANO",pano,flush=True)
        break

if pano:
    im=Image.open(pano); W,H=im.size; seg=W//4
    names=["front","right","back","left"]
    segs=[]
    for i in range(4):
        c=im.crop((i*seg,0,(i+1)*seg,H))
        p=os.path.join(OUT,"Panorama",f"{NAME}_{names[i]}.png")
        c.save(p); segs.append(p); print("SEG",p,flush=True)
    print("--- 4 段两两哈希差(0-1024, 越高=越不同视角) ---",flush=True)
    ha=[ahash(s) for s in segs]; diffs=[]
    for i in range(4):
        for j in range(i+1,4):
            d=hdiff(ha[i],ha[j]); diffs.append(d)
            print(f"{names[i]} vs {names[j]}: {d}",flush=True)
    print(f"平均差异={sum(diffs)//len(diffs)} (~{sum(diffs)/len(diffs)/1024*100:.0f}%)",flush=True)
    print("说明：这是'超宽连续视角图'，非真 360 全景，覆盖约 140° 前向，看不到相机背后。",flush=True)
print("B_DONE",flush=True)
