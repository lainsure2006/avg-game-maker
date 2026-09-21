# A. 背景 Backgrounds — 《缄默回廊》

> Step 4 · A 类子表。尺寸固定 **1920×1080（16:9）**。来源分镜 / 时段 / 类型 / 一致性标准 / 出图方案（Scheme A·CloudStudio z-image-turbo）/ 落位路径 / manifest 键 / 状态。
> **game 前缀 `jianmo`**；manifest 值 `/images/bg/jianmo/<id>.png`。

## A.1 普通背景（15 张）

| bg_id | 来源分镜 | 时段 | 类型 | pano? | 一致性标准(参考) | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `bg_pier_dusk` | Ch1-S01, Ch12-normal | 黄昏→暮 | 普通(含 pano 变体) | **是(3:1)** | S1 冷蓝青灰主色 | `public/images/bg/jianmo/bg_pier_dusk.png` | `/images/bg/jianmo/bg_pier_dusk.png` | 待出 |
| `bg_courtyard` | Ch1-S02, Ch1-S06, Ch4-S06 | 黄昏 | 普通 | 否 | 同上 | `.../bg_courtyard.png` | `/images/bg/jianmo/bg_courtyard.png` | 待出 |
| `bg_archway` | Ch1-S05 | 暮 | 普通 | 否 | 同上 | `.../bg_archway.png` | `/images/bg/jianmo/bg_archway.png` | 待出 |
| `bg_corridor_locked` | Ch1-S06 | 暮 | 普通(铁链门特写) | 否 | 同上 | `.../bg_corridor_locked.png` | `/images/bg/jianmo/bg_corridor_locked.png` | 待出 |
| `bg_dining` | Ch1-S07/S08, Ch5-S01 | 夜 | 普通 | 否 | 同上 | `.../bg_dining.png` | `/images/bg/jianmo/bg_dining.png` | 待出 |
| `bg_cabin_night` | Ch1-S09/S10, Ch3-S06, Ch10-S03 | 夜 | 普通(亦为 CG 场景源) | 否 | 同上 | `.../bg_cabin_night.png` | `/images/bg/jianmo/bg_cabin_night.png` | 待出 |
| `bg_compound` | Ch2-S01/S06, Ch4-S01 | 日/夜 | 普通 | 否 | 同上 | `.../bg_compound.png` | `/images/bg/jianmo/bg_compound.png` | 待出 |
| `bg_greenhouse` | Ch2-S02~S05, Ch5-S04/S05, Ch8-S04, Ch10-S01 | 日/夜 | 普通(花房) | 否 | 同上 | `.../bg_greenhouse.png` | `/images/bg/jianmo/bg_greenhouse.png` | 待出 |
| `bg_archive` | Ch3-S01~S04, Ch4-S02~S04/S07, Ch8-S01, Ch11-S01/S03 | 夜 | 普通(档案室) | 否 | 同上 | `.../bg_archive.png` | `/images/bg/jianmo/bg_archive.png` | 待出 |
| `bg_corridor_dark` | Ch3-S05, Ch9-S02/S05/S06, Ch12-wrong | 夜 | 普通(暗调) | 否 | 同上 | `.../bg_corridor_dark.png` | `/images/bg/jianmo/bg_corridor_dark.png` | 待出 |
| `bg_reef` | Ch6-S01~S06, Ch9-S01 | 日(退潮) | 普通(含 pano 变体) | **是(3:1)** | 同上 | `.../bg_reef.png` | `/images/bg/jianmo/bg_reef.png` | 待出 |
| `bg_office_night` | Ch7-S05 | 夜 | 普通(院长办公室) | 否 | 同上 | `.../bg_office_night.png` | `/images/bg/jianmo/bg_office_night.png` | 待出 |
| `bg_corridor` | Ch7-S05 | 夜 | 普通(长廊) | 否 | 同上 | `.../bg_corridor.png` | `/images/bg/jianmo/bg_corridor.png` | 待出 |
| `bg_cliff` | Ch11-S02/S03, Ch12-hidden | 日/夜雨 | 普通(含 pano 变体) | **是(3:1)** | 同上 | `.../bg_cliff.png` | `/images/bg/jianmo/bg_cliff.png` | 待出 |
| `bg_reveal_hall` | Ch12-true | — | 普通(旧礼堂) | 否 | 同上 | `.../bg_reveal_hall.png` | `/images/bg/jianmo/bg_reveal_hall.png` | 待出 |

> **3 个 pano 级背景的裁切工序（§3.1 红线①）**：`bg_pier_dusk` / `bg_reef` / `bg_cliff` 是 3:1 约束参考图，**不是引擎资产**。流程：先出 pano（3:1）→ 裁 1820×1024 → resize 1920×1080 得引擎单张 16:9。CG（cg_arrival / cg_reef / cg_cliff / cg_parents_cliff / cg_departure）复用同一 pano 源，保证 CG 与 live 场景零漂移。
> **合并去重**：同一场景不同小时段视觉可共享的（如 compound 日/夜差异靠 grade 参数调，不另出图）；本表已按下表去重。

## A.2 CG 子类（8 张，走 backgrounds 通道，需双参考图）

> 落位同背景通道：`manifest.backgrounds[cg_id]`，剧本 `scene(<cg_id>)` + 隐藏全部角色。详见主表 §2 双参考图锁定。

| cg_id | 来源分镜 | 场景参考图(bg) | 人物参考图(sprite/L0) | pano 裁切 | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|---|---|
| `cg_arrival` | Ch1-S01 | `bg_pier_dusk`(pano) | 无(空镜) | 需 | `.../bg/jianmo/cg_arrival.png` | `/images/bg/jianmo/cg_arrival.png` | 待出 |
| `cg_cabin_window` | Ch1-S09 | `bg_cabin_night` | 无(第一视角) | 否 | `.../cg_cabin_window.png` | `/images/bg/jianmo/cg_cabin_window.png` | 待出 |
| `cg_reef` | Ch6-S01 | `bg_reef`(pano) | 无(空镜) | 需 | `.../cg_reef.png` | `/images/bg/jianmo/cg_reef.png` | 待出 |
| `cg_reveal_room` | Ch10-S03 | `bg_cabin_night` | 无(背影/侧影) | 否 | `.../cg_reveal_room.png` | `/images/bg/jianmo/cg_reveal_room.png` | 待出 |
| `cg_cliff` | Ch11-S02 | `bg_cliff`(pano) | 无(空镜) | 需 | `.../cg_cliff.png` | `/images/bg/jianmo/cg_cliff.png` | 待出 |
| `cg_truth_hall` | Ch12-true | `bg_reveal_hall` | **`yanxi_yanshuang` 头颈裁切** | 否 | `.../cg_truth_hall.png` | `/images/bg/jianmo/cg_truth_hall.png` | 待出 |
| `cg_parents_cliff` | Ch12-hidden | `bg_cliff`(夜雨变体) | 无(背影) | 需 | `.../cg_parents_cliff.png` | `/images/bg/jianmo/cg_parents_cliff.png` | 待出 |
| `cg_departure` | Ch12-normal | `bg_pier_dusk`(暮变体) | 无(背影) | 需 | `.../cg_departure.png` | `/images/bg/jianmo/cg_departure.png` | 待出 |

> **CG 与 item 优先级（§3.1 红线②）**：画面主体是"可读文书/物件" → 走 item（H 类），不出 CG。本作 6 张物证全部走 item，CG 无此冲突。
> **CG 判定权**：哪些镜出 CG 已由 Step 3 §2.4 画面呈现审核（3a2）判定并交用户拍板，本步只登记不判定。
