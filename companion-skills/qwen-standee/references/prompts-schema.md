# prompts.json 字段 Schema（Qwen-Image-2.1 角色输入）

每个角色一个 `prompts.json`，放在 `<project>/character-art/qwen_autodl/chars/<CHAR_ID>/` 下。
引擎与脚本只认以下字段；复制 `examples/CHAR_photoreal_prompts.json`（写实）或
`examples/CHAR_anime_prompts.json`（二次元）改成你自己的角色即可。

## 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `_comment` | string | 可选，给自己看的备注 |
| `char_block` | string | **角色共享描述**：年龄/族裔/体型/脸型/发型/服装逐件/气质。会被同时注入「设定表(sheet)」与「立绘(game)」两处，是身份一致性的根。 |
| `neg` | string | **共享负向词**：两处通用。写实务必含 `cartoon, anime, illustration, 3d render`；二次元务必含 `realistic photo, photorealistic, 3d`。 |
| `sheet` | object | 设定表（四视图）参数，见下。 |
| `game` | object | 半身立绘参数，见下。 |

## `sheet` 字段（设定表 / 四视图）

| 字段 | 类型 | 说明 |
|---|---|---|
| `w`, `h` | int | 画布像素。**必须 2:1 宽幅**（如 `2048×1024`）—— 4 竖视图才有完整全身，正方形会把人物压成窄条。 |
| `grid` | [cols, rows] | 网格。**固定 `[4, 1]`**（一行四列），别用 2×2。 |
| `cells` | [string] | 四格顺序，固定 `["head","front","side90","back"]`（左→右）。 |
| `prompt` | string | 设定表提示词。**必须**在文中写明四视图内容（左=头部特写 / 中=正面全身 / 侧90° / 背面），并在结尾写画风词（写实写 `Photorealistic, sharp focus, DSLR`；二次元写 `Japanese anime illustration, cel shading`）。`{char}` 是占位符，脚本会自动替换为 `char_block`。 |

## `game` 字段（半身立绘）

| 字段 | 类型 | 说明 |
|---|---|---|
| `w`, `h` | int | 半身画布，如 `768×1024`。 |
| `refs` | [string] | 参考哪几格（单格），固定 `["front","head"]`。 |
| `ref_sheet` | bool | **true**：把整张设定表追加进参考槽末位锁身份（相似度显著↑），务必开。 |
| `resolution` | int | `0` = 参考图保持自身尺寸（脚本会预缩放首图到 w/h）；非 0 则强制。 |
| `ref_top` | float | 参考图在 latent 中的顶部占比，约 `0.55`。 |
| `char_override` | string | **半身专用描述**。**必须去掉身高、下装、鞋**（这些会把取景拽成全身）。只保留脸型/发型/服装上半身。 |
| `shot` | string | **构图说明**：写明画面底边被什么填满（如"大衣下摆填满底边"），否则模型会在底部生成黑块。固定"从头顶到 mid-thigh、下半身出画、半身、浅灰背景"。 |
| `neg_extra` | string | 半身专用负向：必须含 `full body, feet, shoes, head and shoulders closeup, face filling the frame, black block, dark void at the bottom` 等，防全身/黑块/头肩象。 |
| `transparent` | bool | `false`（不直出 alpha，靠 RMBG-2.0 后处理抠透明）。 |
| `shots` | {pose: desc} | **每个 pose 一句表情/动作描述**，key 必须与引擎 `manifest.ts` 的 pose 名一致（如 `default/serious/calm/sad`）。 |

## 三条硬规则

1. **画风词必须三处都写**：`char_block` / `char_override` / `sheet.prompt` 都要带对应画风词，否则风格漂移。
2. **半身 `char_override` 去身高/下装/鞋**；`shot` 写明底边填充。
3. **pose 的 key 对齐引擎 manifest**：脚本注册时按 `game.shots` 的 key 解析文件名，对不上会 skip。

## 数字验收判据（check_assets.py）

| 指标 | 写实期望 | 二次元 |
|---|---|---|
| 视角顺序（人脸宽占比） | head 30–40% / front 13–15% / side90 10–11% / back≈0 | 同左（用浅灰背景分割求前景框判视角） |
| ArcFace 相似度（vs head 格） | ≥0.70 合格，≥0.85 优秀 | **不可用**（insightface 检不出动漫脸） |
| 透明占比 | 50–65% | 同左 |
| 半透明边缘像素 | ≤2% | 同左 |
| 取景（脸宽占比） | 半身 20–22% | 同左 |
