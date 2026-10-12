---
name: qwen-standee
description: 在 autodl + ComfyUI（Qwen-Image-2.1）上生成人物立绘资产：设定表四视图 → 半身表情/动作图 → RMBG 抠透明 PNG。当需要为 AVG/游戏角色出写实风立绘、设定表、表情或动作图时使用。本 skill 只负责「出图」这一段，角色设定与提示词由上游流程（如 avg-game-maker）提供。
---

# 人物立绘生成（AutoDL + ComfyUI + Qwen-Image-2.1）

> **★ 推荐方案**：相比 Krea2 / z-image-turbo，本方案在面部与身份一致性上最稳定，是 avg-game-maker 当前首选出图方案；用户仍可按自身云端算力、模型获取与画风需求选择其它方案（见主 `SKILL.md` 方案表）。

## 环境（固定，不要重新勘察）

| 项 | 值 |
|---|---|
| 云端 | autodl 实例，RTX 3090 24GB |
| ComfyUI | `/root/ComfyUI`（版本 0.36.0，含原生 `TextEncodeQwenImage21`） |
| 云端端口 | 8188；**autodl 端口映射 6006**，本地用 `http://localhost:6006` 探活 |
| 模型 | `qwen_image_2.1_int8_convrot.safetensors`(UNet) / `qwen3vl_8b_int8_convrot.safetensors`(CLIP) / `qwen_image_2.1_vae_bf16.safetensors`(VAE) / RMBG-2.0 |
| 角色资产根 | `/root/autodl-tmp/char/<CHAR_ID>/`（`bible.md` + `prompts.json`） |
| 脚本 | `/root/autodl-tmp/tools/`（本 skill `scripts/` 是同一份副本） |
| 产物 | `/root/ComfyUI/output/<CHAR_ID>/{sheet_*.png, cells/, states/, rmbg/}` |

启动 ComfyUI（SSH 到云端，脱离终端）：

```bash
ssh <autodl-host> "cd /root/ComfyUI && setsid nohup python main.py --listen 127.0.0.1 --port 8188 > /root/comfy_start.log 2>&1 < /dev/null &"
sleep 25 && curl -s http://localhost:6006/system_stats | head -c 120   # 本地经 6006 探活
```

> 脚本内部一律用云端地址 `127.0.0.1:8188`（在云端执行）；本地只经 6006 做状态查询。

## 输入契约：本 skill 要什么

上游只需交付两个文件到 `/root/autodl-tmp/char/<CHAR_ID>/`：

1. `bible.md` —— 角色圣经（年龄/性别/体型/面部特征/发型/服装逐件/气质/禁止特征/视角约定）。
2. `prompts.json` —— 提示词库（字段见 `references/prompts-schema.md`，可抄 `examples/CHAR_photoreal_prompts.json` 写实版或 `examples/CHAR_anime_prompts.json` 二次元版）。

写提示词三条硬要求：
- **画风必须写进 `char_block` / `char_override` / `sheet.prompt` 三处**（写实写 "Photorealistic, sharp focus, DSLR"；二次元写 "Japanese anime illustration, cel shading, clean lineart"）。
- **半身组的 `char_override` 必须去掉身高、下装、鞋**——这些描述会把取景拽成全身。
- **`shot` 里要写明画面底边被什么填满**（如"针织衫下摆与裙腰填满画面底边"），否则模型会在底部生成无意义黑块。

## 流程（6 步，别省环节）

```bash
# 1+2 设定表（2:1 宽幅一次出 4 视角）并切成 4 格
python char_pipeline.py --char <CHAR_ID> --stage sheet --steps 30
# 3 校验视角顺序（人脸宽占比应为 head≫front>side90，back≈0）
python check_assets.py sheet /root/ComfyUI/output/<CHAR_ID>/cells/*.png
# 4 出半身（参考 = front 单格 + head 单格 + 整张设定表，带浅灰背景）
python char_pipeline.py --char <CHAR_ID> --stage state --steps 30
# 5 抠透明（不直出 alpha）
python rmbg_stage.py --char <CHAR_ID> --pattern 'states/*.png'
# 6 校验立绘
python check_assets.py alpha /root/ComfyUI/output/<CHAR_ID>/rmbg/*.png
python check_assets.py sim /root/ComfyUI/output/<CHAR_ID>/cells/head.png /root/ComfyUI/output/<CHAR_ID>/rmbg/*.png
```

只重跑某分组：`python run_group.py --char <CHAR_ID> --group <组名> --steps 30`

## 判据（用数字验收，不靠感觉）

| 指标 | 期望 |
|---|---|
| 视角顺序（人脸宽占比） | head 30–40%、front 13–15%、side90 10–11%、back 0% |
| ArcFace 相似度（写实，vs head 格） | ≥ 0.70 合格，≥ 0.85 优秀；低头/大笑/侧面会天然偏低 |
| 透明占比 | 50–65% |
| 半透明边缘像素 | ≤ 2%（越小越干净） |
| 取景（脸宽占比） | 半身 20–22%；一套图内部几张应接近 |
| 底部近黑占比 | 目视确认是深色服装本体还是黑块 |

**二次元角色不能用 ArcFace**：insightface 检不出动漫脸（实测 4 格全 0），改用「浅灰背景分割求前景框」判视角；一致性只能目视。

## 硬坑（踩过，别再踩）

1. **不要直出 alpha**。带浅灰背景出图 → RMBG-2.0 去背更清晰；抠 4 张仅 ~10s，成本可忽略。
2. **`TextEncodeQwenImage21` 输出画布尺寸只由 `image_1` 决定** → 整张设定表必须放在 image_1 之后（ref_sheet 放末位），否则输出退回 2048×1024 宽幅。
3. **`resolution: 0` 模式**：每张参考图保持自身尺寸；首图须预先缩放到目标画布(w/h)。脚本已处理。
4. **autogrow 输入 API 必须写扁平键 `"images.image_1"`**，嵌套 dict 静默失效（症状：输出退回正方形）。
5. **Qwen-Image-2.1 潜空间 64ch/16×**，无对应空 latent 节点；不带参考图时借用 `EmptySD3LatentImage`(直传像素尺寸) 或 `EmptyHunyuanImageLatent`(32×) 传 2 倍尺寸。**本机实测用 `EmptySD3LatentImage`**（SD3 风格 8× 下采样）。
6. **RMBG 节点从 kwargs 取参**，漏传可选参数会 KeyError，必须全量显式传（`sensitivity/process_res/mask_blur/mask_offset/invert_output/refine_foreground/unload_model/background/background_color`）。
7. **步数 ≥24**（20 步被判定"糊"）；参考图加回整张设定表后相似度显著上升（0.575→0.804、0.858→0.920），勿为省时砍参考。
8. **磁盘**：autodl-tmp 常剩 ~3G，批量出图前先看 `df -h`。
9. **半身 `char_override` 去身高/下装/鞋**；`shot` 写明底边填充（防黑块）。

## 耗时基准（3090，30 步）

| 环节 | 耗时 |
|---|---|
| ComfyUI 启动 + 权重加载 | ~40s |
| 设定表 2048×1024 | ~215s |
| 半身 768×1024 ×4（同一次运行共用模型） | ~455s |
| RMBG 抠图 ×4 | ~10s |
| 校验（insightface CPU） | ~20s |

省时间靠降步数/降分辨率/合并到同一次运行，**不是靠砍参考图或砍抠图**。

## 落地位置与本 skill 自带资产

本 skill 自带可直接部署到云端的通用脚本与说明（不绑定作者云端、不含任何凭证）：

- `scripts/`：`char_pipeline.py` / `rmbg_stage.py` / `check_assets.py` / `run_group.py`（在**云端**运行，内含 `/root/ComfyUI`、`/root/autodl-tmp` 等云端路径，按你的云端改）、`autodl_bridge.py`（**本地编排器**：paramiko 上传脚本与角色 → 跑 sheet/state/rmbg/check → SFTP 拉回 → 归一化注册引擎；凭证走本地文件/环境变量，不写死）。
- `references/prompts-schema.md`：`prompts.json` 字段 schema（照抄即可）。
- `examples/`：`CHAR_photoreal_prompts.json`（写实示例）/ `CHAR_anime_prompts.json`（二次元示例）——均为**虚构通用角色**，复制后改成你自己的角色。
- 角色输入：在你的工程资产目录下为每人建 `chars/<CHAR_ID>/{bible.md, prompts.json}`（例如 `<project>/character-art/qwen_autodl/chars/`）。

> 作者私有的「运行工作副本」放在工程素材目录（如 `<project>/character-art/qwen_autodl/`，已被 `.gitignore` 排除，不随 skill 分发）；本 skill 的 `scripts/` 是其通用化副本。

## 审核门（强烈建议，2026-10 拍板）

设定图和立绘都只走 qwen（已放弃 krea2 混用）；且**设定图出完必须先给客户审「形象」，合格才继续立绘/抠图/注册**。用 `autodl_bridge.py --sheet --sheet_pull` 拉设定图交审，禁止一步跳过审核。标准分步流程：

```
1. --sheet            云端 qwen 出设定图（2:1 宽幅 4 视角）
2. --sheet_pull       拉回设定图 → 交客户审「形象」
   └─ 【门】不合格 → 改 prompts/bible 重出；合格才继续
3. --state --rmbg --check --pull   立绘(半身)+抠透明+数字验收+拉回
4. （客户看立绘实装效果）→ 【门】确认 OK
5. --register         注册引擎 sprite/<game>
```

实战细节与坑见 `references/` 与你的工程内 qwen_autodl/README_综合流程.md。
