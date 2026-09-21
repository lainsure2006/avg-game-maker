# E. 音频 BGM — 《缄默回廊》

> Step 4 · E 类子表。BGM 由 **用户凭精细提示词出**（本步已附 `BGM_精细提示词.md`，含逐曲风格/乐器/情绪/loop 规格，可直接喂 AI 音乐工具或作曲）。**可空**：未供则标"空"，绝不登记 manifest。落位 `public/audio/jianmo/bgm_{name}.wav`。
> ⚠️ **红线（§7）**：规划了但用户暂未供 → 状态标"空"，**绝不登记进 `manifest.audio`**（`loadAudio` 遇 404 = throw 崩溃）。
> manifest 键 `audio[bgm_{name}]`。

| bgm_id | 用途 | 场景/情绪 | 时长要求(loop≥30s) | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|---|
| `bgm_title` | 首页自动播放 | 标题/氛围定调 | ≥60s | `public/audio/jianmo/bgm_title.wav` | `audio.bgm_title` | **空(待供)** |
| `bgm_arrival` | 开篇渡轮/到任 | 孤绝·冷 | ≥60s | `.../bgm_arrival.wav` | `audio.bgm_arrival` | **空(待供)** |
| `bgm_day` | 日常/调查 | 平静·克制的日常 | ≥60s | `.../bgm_day.wav` | `audio.bgm_day` | **空(待供)** |
| `bgm_night` | 夜戏/探查 | 压抑·夜 | ≥60s | `.../bgm_night.wav` | `audio.bgm_night` | **空(待供)** |
| `bgm_tension` | 悬疑/反转/揭示 | 紧张·高悬 | ≥60s | `.../bgm_tension.wav` | `audio.bgm_tension` | **空(待供)** |
| `bgm_tender` | 温情/结局 | 释然·柔 | ≥60s | `.../bgm_tender.wav` | `audio.bgm_tender` | **空(待供)** |

> 共 6 个。逐曲 **精细提示词** 见 `BGM_精细提示词.md`（用户据此出曲后落位上方路径）。剧本里对应 `bgm` 指令已写在剧本化文件。若某曲未供则标"空"，Step 6 编写省略其 `bgm` 指令，运行不受影响。
