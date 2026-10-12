---
name: sprite-matte-local
description: 把「白底/带背景的人物立绘」转成引擎可用的透明 sprite——**本机 rembg(u2net_human_seg, ONNX/CPU) AI 抠图** + **归一化到统一画布**。当云端 ComfyUI 的 BiRefNetRMBG/RMBG 因 TensorFlow 崩而不可用、或云端实例反复 500 时，这是保图（不重画）的首选方案，一次装好永久可用。覆盖：rembg 隔离 venv 安装、模型自动下载路径、u2net_human_seg 选型、抠图质量校验（RGBA/四角透明/透明占比）、以及**为什么必须归一化**（引擎 renderer.drawCharacterAuto 的 maxWRatio=0.28 / maxHeight=0.75H / scale 不放大 会把手掌比例错的图压成矮横条，且各人宽高比不同导致身高基线不齐）。适用于 AVG 视觉小说立绘落位前的抠图与 sprite 制作。
version: 1.0.0
author: user
agent_created: true
tags: [rembg, u2net_human_seg, 抠图, 去背景, sprite, 立绘, 透明PNG, AVG, 归一化, onnx]
---

# 本地 AI 抠图 + sprite 归一化

**何时用**：手上有「白底 / 带场景的人物立绘」PNG（通常是 Krea2 出的 1536×768 白底人物卡），需要变成引擎能吃进去的**透明单人 cutout sprite**。典型触发：资源核对报告里 P1「立绘不是引擎可用 sprite」。

**核心结论**：
- Krea2 / z-image-turbo 的 editor **都不是抠图模型**（前者是 Flux 系 T2I/I2I，后者是 controlnet/放大），**不能抠图**。
- 云端 ComfyUI 里的 `BiRefNetRMBG` / `RMBG`（1038lab 包）**底层走 TensorFlow**，许多环境 TF 起不来 → `initialization of _pywrap_checkpoint_reader raised unreported exception`，**装了也全废**。
- ✅ **正解：本机 `rembg`（ONNX 后端，纯 CUDA/CPU，不碰 TF）** + `u2net_human_seg`（人像分割专用）→ 出透明 RGBA。**不依赖云端、零模型转换、一次装好永久可用。**

---

## 一、两步流水线

| 步 | 脚本 | 作用 | 产物 |
|---|---|---|---|
| ① 抠图 | `comfy_matte_local.py` | rembg `u2net_human_seg` 语义抠图，白底→透明 RGBA，保留整帧构图 | `jianmo_portraits/jianmo_portraits_matte/`（整帧 1536×768 透明） |
| ② 归一化 | `build_sprites.py` | 裁到人物 alpha 包围盒 → 身体高度归一 900px → 贴统一 1080×1080 透明画布（底部对齐） | `jianmo_portraits/jianmo_portraits_sprite/`（引擎落位用） |

> 落位引擎时用 **sprite/** 目录；**matte/** 是中间产物（保留原构图，方便回溯）。

---

## 二、安装（隔离 venv，勿污染全局）

```bash
# Windows 隔离 venv 的 python
"C:/Users/<user>/.workbuddy/binaries/python/envs/default/Scripts/python.exe" -m pip install rembg onnxruntime
```

- `u2net_human_seg` 权重**首次运行自动下载**：`https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx` → 落到 `C:\Users\<user>\.rembg\models\u2net_human_seg\u2net_human_seg.onnx`（约 **176MB**）。首次会慢，之后秒级。
- 也可换模型：`u2net`(通用) / `isnet-anime`(动漫插图) / `silueta`(轻量)。写实人像首选 **`u2net_human_seg`**。

---

## 三、为什么必须「归一化」（关键坑，别跳过）

引擎 `src/engine/renderer.ts :: drawCharacterAuto` 的渲染约束：
```ts
const maxHeight = this.height * 0.75;       // 高度上限 = 0.75*画布高
const maxW = this.width * maxWRatio;         // ≤3人时 maxWRatio = 0.28
let scale = Math.min(maxHeight / image.height, 1);  // ⚠️ scale 上限=1，不放大
if (drawW > maxW) { scale = maxW / image.width; }   // 宽度是真正的瓶颈
```
- 整帧 **1536×768 横版** → 被宽度卡死 → 渲染成约 **358×179px 的矮横条**，人物极小。
- 实测人物只占原图 **48–57% 宽**（两侧一半是空白），且各人包围盒宽高比在 **0.99–1.17** 波动 → 缩放不一致、**身高基线不齐**。
- **归一化做法**：裁到 alpha bbox → 身体高度统一 900px → 贴统一的 **1080×1080** 画布（底部对齐、水平居中）。这样 7 张在引擎里渲染尺寸完全一致。

> 归一化**不改画面内容**（只做裁剪 + 加透明留白），零艺术风险。

---

## 四、验收（客观指标）

用 `verify_assets.py` 或内联脚本逐张检查：
- `im.mode == 'RGBA'`（有 alpha）
- 四角 alpha < 20（背景真透明）
- 透明像素占比落在 **30%–92%**（太低=没抠掉底，太高=人也被抠没了）
- sprite 尺寸 == **1080×1080**
- 可再量 alpha bbox，确认各张 `bbox_h/画布高` 一致（身高基线对齐）

目视抽样：直接看 matte/sprite 成品，确认**无白边、无白衣误扣、发丝边缘干净**。

---

## 五、已知坑速查

| 坑 | 现象 | 处置 |
|---|---|---|
| 云端 TF 抠图节点 | `_pywrap_checkpoint_reader raised unreported exception` | **放弃** BiRefNetRMBG/RMBG，走本机 rembg |
| 云端实例不稳 | `/` 或 `/queue` `/history` `/upload` 反复 HTTP 500 | 别死磕；**本地 rembg 绕开云端** |
| 本 shell 环境残缺 | `cp`/`tail`/`dirname` command not found (EXIT 127) | 用 Python 干活（`python -c` / runner 脚本），别依赖这些 coreutils |
| Pillow 12.x 弃用 | `Image.Image.getdata is deprecated` | 仅告警，可忽略；或用 `get_flattened_data` |
| 只有 alpha 才准 | 用 `RGB.convert` 后判透明会全丢 | 必须读 **RGBA** 的 alpha 通道 |
| 输出目录 | 覆盖原稿 | 分目录输出（matte/ 与 sprite/），**绝不动原稿** |

---

## 六、与项目约定的对接
- 脚本放项目 `素材/` 下，路径/文件名沿用 `JM_PORTRAIT_<char>_<pose>__0000N_.png`。
- 落位引擎：去 `JM_PORTRAIT_` 前缀 + 取最新版本号 → `sprites[char][pose]`。
- 完成后更新资源核对报告的 P1 状态 + 刷新资产画廊（加 sprite 段，用棋盘格 CSS 衬底体现透明）。
