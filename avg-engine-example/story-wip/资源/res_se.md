# F. 音频 SE — 《缄默回廊》

> Step 4 · F 类子表。SE 由 **AI 程序化合成**（Python+numpy 生成 WAV，已落位 `public/audio/jianmo/se_{name}.wav`），可作为可用占位/直接用，后续可换高质量音源。红线同 E 类：若某条最终不采用则不登记 manifest。
> manifest 键 `audio[se_{name}]`。

| se_id | 用途 | 事件提示 | 落位路径 | manifest 键 | 状态 |
|---|---|---|---|---|---|
| `se_wind` | 海风/离岛 | 环境·结尾 | `public/audio/jianmo/se_wind.wav` | `audio.se_wind` | **AI生成(程序化WAV)** |
| `se_chain` | 长廊铁链声 | 听觉惊悚·脚步复现 | `.../se_chain.wav` | `audio.se_chain` | **AI生成(程序化WAV)** |
| `se_heartbeat` | 心跳 | 惊吓点(Ch3-S04) | `.../se_heartbeat.wav` | `audio.se_heartbeat` | **AI生成(程序化WAV)** |
| `se_key` | 钥匙串/开锁 | 行动·潜入档案室 | `.../se_key.wav` | `audio.se_key` | **AI生成(程序化WAV)** |
| `se_clue` | 线索获得提示 | 线索落点(flash 后) | `.../se_clue.wav` | `audio.se_clue` | **AI生成(程序化WAV)** |
| `se_wave` | 海浪 | 礁石/海岛 | `.../se_wave.wav` | `audio.se_wave` | **AI生成(程序化WAV)** |

> 共 6 个，全部由 AI 程序化合成（详见 `SE_合成说明.md`）。se_chain / se_heartbeat / se_clue 为悬疑演出关键，已优先生成。
