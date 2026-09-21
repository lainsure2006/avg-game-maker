# B. 角色立绘 Sprites — 《缄默回廊》

> Step 4 · B 类子表。引擎键 `manifest.sprites[char][pose]`（只按 pose 键位，expression 不换图）。
> 出图身高统一 **~1000px**（多人同屏缩放参差，Step 3 第 1 条）。透明 PNG（青幕抠图，G1 §10）。
> 落位 `public/images/sprite/jianmo/{char}_{pose}.png`。详见 `立绘差分清单.md`（档位待拍板）。

| char_id | pose_key | 角度 | 关联 L0 | 出图身高基准 | 神态/姿态说明 | 用在哪几镜 | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| `gucheng` | `default` | 正面 | L0_gucheng | 1000px | 50 岁、霜鬓、温开水笑、沉稳 | Ch1-S03/S04/S05, Ch4-S04, Ch5-S03, Ch7-S05 | `.../sprite/jianmo/gucheng_default.png` | `sprites.gucheng.default` | 待出 |
| `gucheng` | `serious` *(推荐档)* | 正面 | L0_gucheng | 1000px | 坦白沉重、神情凝重（反转1） | Ch7-S05 | `.../gucheng_serious.png` | `sprites.gucheng.serious` | 待定(档位) |
| `sulan` | `default` | 正面 | L0_sulan | 1000px | 30+、眉间淡疤、压低音量、克制 | Ch1-S07/S08, Ch2-S05, Ch3-S05, Ch5-S05, Ch9-S05 | `.../sulan_default.png` | `sprites.sulan.default` | 待出 |
| `sulan` | `drunk` *(推荐档)* | 正面 | L0_sulan | 1000px | 微醺、眼尾红、话少（Ch5 醉语） | Ch5-S05 | `.../sulan_drunk.png` | `sprites.sulan.drunk` | 待定(档位) |
| `yanxi` | `default` | 正面 | L0_yanxi | 1000px | 青年、淡色眼（海水漂过的玻璃）、常抱诗集 | Ch2-S02/S03/S04/S05, Ch8-S04 | `.../yanxi_default.png` | `sprites.yanxi.default` | 待出 |
| `yanxi` | `yanshuang` | 正面 | L0_yanxi | 1000px | **言霜态**（身份揭穿·反转2必出） | Ch10-S01/S03, Ch12-true | `.../yanxi_yanshuang.png` | `sprites.yanxi.yanshuang` | 待出 |
| `laok` | `default` | 正面 | L0_laok | 1000px | 旧案关联人、市井气、含混 | Ch6-S02~S04, Ch9-S02 | `.../laok_default.png` | `sprites.laok.default` | 待出 |

> **最小集 = 5 张**（每个角色 1 default + 言溪 yanshuang）。**推荐集 = 9 张**（加 gucheng_serious + sulan_drunk）。
> **`yanshuang` 必出**：反转2（言溪=言霜）的视觉核心，缺失则 Ch10/Ch12-true 无法呈现身份揭穿。
> **Live2D**：用户 2026-09-04 决定暂不做，本类仅标 `live2d_eligible` 预留，不产资产。
> ⚠️ **同屏身高基准**：4 角色立绘必须共享 ~1000px 基线，否则 N>3 自动布局错位（本作最多同屏 2 人，仍守基线）。
> ⚠️ 主角"你"无立绘（玩家代入）→ 不消耗 sprite 行。
