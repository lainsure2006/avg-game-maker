# 云端 / 本地 ComfyUI 准备清单（CLOUD_SETUP）

> 本文件回答一个问题：**拿到这套 skill 的人，没有作者原版云端，怎么才能把图跑出来？**
> 出图依赖 = **ComfyUI 服务** + **模型文件** + **工作流 JSON** + **提交脚本**。
> 工作流 JSON 与提交脚本已随本包提供（见 `workflows/`）；**模型和 ComfyUI 服务需要你自己准备**——作者云端里的模型不会随 skill 分发。

---

## 0. 架构总览（必读）

```
提交脚本(workflows/*.py)
   │  POST /prompt  (ComfyUI API JSON)
   ▼
本地桥接 comfy-mcp  →  127.0.0.1:8188  ← 这一层对"云端"和"本地"完全一样
   │
   ├─ 云端模式：127.0.0.1:8188 经桥接打到 CloudStudio ComfyUI(https)
   └─ 本地模式：127.0.0.1:8188 直接是你在本地起的 ComfyUI
```

- **两种模式对脚本/工作流透明**：脚本只认 `http://127.0.0.1:8188`，不关心背后是云端还是本地。
- 所以你要么**(A) 用云端 ComfyUI（如 CloudStudio）**，要么**(B) 本地自己装 ComfyUI**——下面分别给清单。

---

## 1. 云端模式（作者在 CloudStudio 实测）

作者在 **CloudStudio（ap-shanghai2 区，Tesla T4 16GB）** 部署 ComfyUI。
云端**只托管模型与 ComfyUI 服务，不存工作流 JSON**（工作流在本地 `workflows/`）。

### 1.1 工作流 → 云端映射

| 工作流文件 | 用途 | 对应故事/资产 |
|---|---|---|
| `workflows/comfyui-api-A10.json` | z-image-turbo 文生图 | story3《樱色未央》动漫少女 |
| `workflows/krea2_charsheet_real.json` | Krea2 真人版角色设定表 | 立绘（真人写实用） |
| `workflows/krea2_charsheet_anime.json` | Krea2 + 二次元 LoRA 角色表 | 立绘（二次元风用） |
| `workflows/Krea2_Turbo_文生图_成功配置.json` | Krea2 完整成功配置（含参考图节点） | 立绘/CG 出图 |
| `workflows/krea2_wf.json` | Krea2EditRebalance 改图流 | 局部改图 |

### 1.2 云端必须预装的模型（缺一即失败）

**Krea2 三件套（人物/场景/CG 出图用）：**
| 文件 | 加载节点 | 备注 |
|---|---|---|
| `krea2_turbo_int8_convrot.safetensors` | `UNETLoader` (weight_dtype=default) | 主模型 |
| `qwen3vl_4b_fp8_scaled.safetensors` | `CLIPLoader` (type=`krea2`, device=`cpu`) | 中文编码器 |
| `qwen_image_vae.safetensors` | `VAELoader` | VAE |
| `krea2/krea2_retroanime.safetensors` | `LoraLoader` | 二次元风格 LoRA（仅 anime 工作流用） |

**z-image 三件套（story3 动漫少女文生图用）：**
| 文件 | 加载节点 | 备注 |
|---|---|---|
| `z_image_turbo_bf16.safetensors` | `UNETLoader` | 主模型 |
| `qwen_3_4b.safetensors` | `CLIPLoader` (type=`lumina2`) | 编码器 |
| `ae.safetensors` | `VAELoader` | VAE |

> ⚠️ 这些是**公开模型名**，不是作者的机密。你需要自行从模型来源（HuggingFace / 模型作者发布页 / 社区）下载并放进云端 ComfyUI 的 `models/` 对应目录（unet / clip / vae / lora）。

### 1.3 云端必须安装的自定义节点

Krea2 / z-image 不是标准 SDXL 节点，需要对应自定义节点包（提供 `Krea2EncodeRebalance`、`Krea2EditRebalance` 等）：
- `Krea2EncodeRebalance`（text+clip+image1..4 → CONDITIONING，锁身份出立绘/CG，正解）
- `Krea2EditRebalance`（参考图改图）
- `ModelSamplingAuraFlow`（z-image 采样算法 AuraFlow）
- 标准节点：`UNETLoader` / `CLIPLoader` / `VAELoader` / `KSampler` / `VAEDecode` / `SaveImage` / `EmptyLatentImage`(或 `EmptySD3LatentImage`) 等

### 1.4 采样参数（写进工作流，别改）

| 参数 | Krea2 | z-image |
|---|---|---|
| steps | 8 | 8 |
| cfg | 1.0 | 1 |
| sampler | euler | res_multistep |
| scheduler | simple | simple |
| denoise | 1.0 | 1 |
| 分辨率 | 1536×768（角色表）/ 场景按文档 | 1024×1024 |
| 负向 | `ConditioningZeroOut` 零化（**不写负面词**） | 标准负面词 |

### 1.5 云端连接要点（来自 `companion-skills/comfy-cloud-mcp`）

- 云端实例**每次重启地址会变** → 出图前必须向用户索取当前 URL（作者用 `story-wip/素材/comfy_url.txt` 记录，你换成自己的机制）。
- 连云端一律走桥接打 `127.0.0.1:8188`，**不要**在 `COMFYUI_URL/HOST/PORT` 填 https/443（comfy-mcp 会拒）。
- 探活：`GET http://127.0.0.1:8188/system_stats`；核对模型：`GET http://127.0.0.1:8188/object_info/UNETLoader` 看 `required.unet_name[0]` 是否含所需模型名。

---

## 2. 本地模式（在自己机器跑 ComfyUI）

> 作者默认云端，但**完全支持本地**。本地用户只需让 ComfyUI 监听 8188，脚本与工作流无需改动。

### 2.1 安装 ComfyUI
- 官方：`git clone https://github.com/comfyanonymous/ComfyUI ; cd ComfyUI ; pip install -r requirements.txt`
- 启动：`python main.py --listen 127.0.0.1 --port 8188`（默认就是 8188）。

### 2.2 放模型（同上 §1.2 两套三件套）
- `models/unet/`、`models/clip/`、`models/vae/`、`models/loras/krea2/`（LoRA 放子目录 `krea2/`，与工作流 `lora_name: krea2/krea2_retroanime.safetensors` 对应）。
- 放自定义节点（§1.3），重启 ComfyUI 让其加载。

### 2.3 核对
- 浏览器开 `http://127.0.0.1:8188` 确认 WebUI 起来；`/object_info/UNETLoader` 确认模型在列。

### 2.4 提交工作流
- 用本包 `workflows/comfy_krea2_sheet.py`（角色表）/ `comfy_krea2_scene.py`（场景）这类脚本，传 `--url http://127.0.0.1:8188`。
- 或直接把 `workflows/*.json` 在 ComfyUI WebUI 里 "Load" 后 Queue。
- 本地若显存不够（T4 16GB 是下限），Krea2 int8 版可降 batch / 分辨率。

---

## 3. 提交脚本用法（通用）

```bash
# 角色设定表（Krea2）
python workflows/comfy_krea2_sheet.py \
  --url http://127.0.0.1:8188 \
  --name luzhao --style real \
  --desc "28岁女刑警，黑色皮夹克，短发，冷峻" \
  --outdir ./output/krea2_sheets

# 场景参考图（Krea2，A/B 两方式）
python workflows/comfy_krea2_scene.py --url http://127.0.0.1:8188 --help
```

> 脚本默认输出目录是相对脚本的 `fogport_assets/krea2_sheets`（作者项目名），用 `--outdir` 覆盖即可，无依赖锁定。

---

## 4. 给接收方的一句话总结

> 这套 skill 自带**工作流 JSON + 提交脚本 + 完整方法论**，但**不含模型文件，也不含作者的云端**。
> 你要出图，必须自己准备：**一个能跑 ComfyUI 的环境（云端 CloudStudio 或本地）+ §1.2 两套模型 + §1.3 自定义节点**。
> 准备好后，按本文件 §1.5/§2.4 连上 8188，工作流即可提交出图。
