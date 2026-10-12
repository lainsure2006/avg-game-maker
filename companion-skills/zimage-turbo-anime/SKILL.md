---
name: zimage-turbo-anime
description: 【最小化经验记录】ComfyUI 出图三条硬经验：①「基础模型」与「控制网/参考图插件」必须同族配对（选 z_image_turbo 才配 z-image 插件，选 krea2 才用 Krea2* 节点，跨族挂控制网被静默忽略 MAE=0）；②表情/情绪能否拉动取决于「基础模型」本身而与提示/身份锁无关——krea2 文字调不动表情，要二次元强表情可换 Illustrious-XL-v2.0 等 booru 标签 SDXL；③krea2 的文字调不动表情，但**「宫格/表情表」构图先验能一次出多个不同表情**；且 `Krea2EncodeRebalance` 用「带表情的脸」作参考只会转身份/画风、**表情会被归中不转移**（双参考"全身+头部特写"还会诱发多视图排版泄漏）。正解＝**直接出「立绘表」再剪格**。适用"出图插件失灵"、"表情拉不开"、"想低成本批量出多表情立绘"类排障。
version: 0.5.0
author: user
agent_created: true
tags: [z-image, z_image_turbo, krea2, illustrious, comfyui, 基础模型选型, 控制网配对, 表情控制, 宫格表情表, 立绘表, 出图经验]
---

# 基础模型 ↔ 插件 配对经验（最小化，待丰富）

## 核心原则（修正版）
**基础模型与控制网/参考图插件必须「同族配对」**，这跟"是不是二次元"没有强绑定关系：
- 你**选择 z_image_turbo 作基础模型**时 → 才能配套使用 z-image 生态的插件（如 ZImageFunControlnet 控制网、z-image 对应的参考图/IP-Adapter 节点）。
- 你**选择 krea2 作基础模型**时 → 用 krea2 生态的节点（Krea2EncodeRebalance 身份锁、Krea2StyleReferenceNode 参考图），**不要**挂 z-image 训练的控制网——挂了也白挂。

> 风格由基础模型决定：krea2_turbo 偏真实系/写实，z_image_turbo 偏动漫/二次元。但"该挂哪套插件"取决于**你选了哪个基础模型**，而不是风格本身。先定基础模型，再选同族插件。

## 实测坑（已验证，2026-09-22 缄默回廊/沈砚流水线）
- `ZImageFunControlnet`（z-image 训练的 Union 控制网，权重 `Z-Image-Fun-Controlnet-Union-2.1.safetensors`）**只在 `z_image_turbo` 基础模型上生效**。
- 接到 `krea2_turbo_int8_convrot` 上：节点在图里但被**静默忽略**——固定种子下，加控制网与不加控制网输出**像素完全一致（MAE=0.00，已用无关图交叉验证方法有效）**。
- 推论：不要试图在 krea2 线上接 z-image 控制网；想要姿态控制就走 z_image_turbo 线（含配对控制网），或 krea2 线放弃控制网改用文本控姿势。

## 同实例环境（CloudStudio ap-shanghai2）
- 已同时装有 `krea2_turbo_int8_convrot.safetensors` 与 `z_image_turbo_bf16` 两个基础模型，切换 `UNETLoader.unet_name` 即可换风格/换族。
- 同一实例也已装齐 `Krea2StyleReferenceNode`、`ModelPatchLoader`（其 name 下拉正是 Union 权重）、`OpenposePreprocessor` 等节点（2545 节点全 LOADED）。注意：节点"在位"不等于"跨族能用"——`ZImageFunControlnet` 虽 LOADED，但对 krea2 仍零作用。

## 实测坑 ②：表情/情绪能不能拉开，取决于「基础模型」，与提示词/身份锁无关（2026-09-28 沈砚）
用户报告"4 个表情全一样"。做了两组对照实验钉死根因：

- **对照组 A（去掉身份锁）**：把 krea2 的 `Krea2EncodeRebalance` 参考图锁整个去掉，改纯文字 txt2img，同 prompt 同种子 → 4 表情**仍然几乎全一样**（中性脸）。说明**不是身份锁压制了表情**，而是模型本身不响应。
- **对照组 B（换基础模型）**：改用实例自带的 `Illustrious-XL-v2.0.safetensors`（二次元 SDXL，booru 标签训练），用**英文 booru 标签**写表情（`serious, furrowed brow, angry, gritted teeth` / `tired, exhausted, half-closed eyes, bags under eyes, open mouth`）→ 表情**强烈且一眼可辨**。
- **量化**：同表情对（serious↔exhausted）头部特写灰度 MAE —— **krea2=24.92 vs Illustrious=64.04**（约 2.5×）。且 Illustrious 视觉上是"怒/累/惊"的强情绪，krea2 是同一张平静脸。

**结论**：
1. krea2 系列（含 krea2_turbo）**表情/微表情能力被训练压制**，中文散文式神态描述基本无效；换不换身份锁都一样。
2. 要二次元表情 → 用 **Illustrious-XL-v2.0**（或同类 booru 系 SDXL），提示词改**英文 booru 标签**（表情靠标签如 `furrowed brow / half-closed eyes / open mouth / raised eyebrows`，不要写中文散文）。
3. 换模型做表情后，**新的难点变成"取景/明暗/身份一致性"**：Illustrious 各表情会自行改变景别与打光（有的变特写、有的压暗），需要额外用固定 seed+固定角色标签、或 img2img/ControlNet 锁构图。

## 实测坑 ③：krea2「文字调不动表情」，但「宫格构图先验」能一次出多个表情；正解＝立绘表剪格（2026-09-28 沈砚）
上一节说 krea2 表情差。但发现一个**绕过它缺陷的实用技法**：

- **宫格表情表可行**：给 krea2 中文提示「角色表情参考表，2x3 网格，六格各不同表情（平静/愤怒/悲伤/惊讶/疲惫/微笑）」
  → 一张 1536x1024 图里**真的画出 6 个明显不同的表情**。
  机理：不是模型不会画表情，而是**单张文字 conditioning 调不动表情**；而"参考表/多宫格"是训练里的强构图先验，
  一次解锁多个表情。**要多个表情，就用宫格，不要用文字逐张逼。**
- **❌ 剪一格表情当参考 → 表情不转移**：把表情格喂 `Krea2EncodeRebalance`（`image1`=表情格, `image1_tokens`=high）
  → 生成的立绘**表情回到中性**。该节点提取的是**身份/画风**，**不携带参考图的表情**。（身份/服装/发型能转，表情不能。）
- **❌ 双参考会诱发多视图排版泄漏**：同时给「全身参考」+「头部特写参考」→ 模型理解为"角色设定表"请求，
  **自己排版成多视图**（重画成 4 视图 + 头像）。**别用"3视图 + 表情格"这种组合。**
- **✅ 正解：直接出「立绘表」再剪格**：让 krea2 一张图出「2行x3列 = 6 格完整全身立绘，各格姿态+表情互不相同，
  同一角色，纯色底」（用 1536x2048 → 每格 512x1024 竖构图）。剪开即 6 个资产，再做 rembg 抠透明。
  一张图搞定「多姿态 + 多表情 + 身份一致」，**同时绕开"文字调不动表情"和"参考图表情不转移"两个坑**。
- 小坑：姿势文案里出现「上半身」会与「从头到大腿/全身」构图约束打架，**把画面拉成胸像**——写全身立绘时避免该词，
  并显式强调「全身从头到脚、不是胸像/头像」。
- **景别可控 + 画布纵横比要匹配景别**（2026-09-28 全新人物「林夏」复现验证）：
  写「**半身**立绘（从头顶到大腿中部以上、脚部不出现、画面下缘裁在大腿位置）」→ 得干净半身（头到大腿）；
  写「**全身**立绘（从头顶到脚、双脚着地）」→ 得全身。**画布宽高比必须跟着景别走**：
  全身 ≈ **1:2**（1536x2048，每格 512x1024）；半身 ≈ **1:1.4**（1536x1440，每格 512x720）。
  景别说半身却给 1:2 画布，模型会硬塞全身或留空。
- **单 seed 一次出整张网格 → 各格天然同一人，无需任何参考图**即可身份一致（同一张图 = 同一角色描述 = 同一人）。
  全新人物零参考复现成功：林夏（20 岁女/黑长直/米色连帽卫衣+蓝牛仔裤），2 行 3 列出「平静/开心/严肃/惊讶/难过/生气」
  六格，表情动作清晰可辨、身份高度统一、纯青底 → **此法可定为常规出图方式**。
- 后处理：剪格用 PIL（含中文标签时给 `ImageFont.truetype` 指系统字体如 `C:/Windows/Fonts/msyh.ttc`，否则中文变方块）；
  抠透明用本地 `local_rembg.py`（rembg u2net_human_seg，纯色底抠得干净）。

## 待以后丰富（当前未填）
- z_image_turbo_bf16 上接 ZImageFunControlnet 的正确接线（是否先 OpenposePreprocessor 预处理骨骼图、推荐 strength）。
- krea2 与 z_image_turbo 两套基础模型下各自可用的「身份锁/参考图」节点对照表。
- 两族基础模型的推荐参数（steps、cfg、sampler、调度器）。
- Illustrious-XL 的表情标签词表（calm/serious/exhausted/alert 等的稳定 booru 组合）与"锁构图"方案（固定 seed 仍会漂景别时的对策）。
