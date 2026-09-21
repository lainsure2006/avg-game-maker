# SE 合成说明 — 《缄默回廊》

> 6 个 SE 由 **AI 程序化合成**（纯 Python 标准库，无第三方依赖），已落位 `avg-engine-example/public/audio/jianmo/`。
> 生成脚本：`story-wip/资源/se_gen.py`（可重跑 / 调参）。

## 合成法（诚实标注）
| se_id | 文件 | 合成方式 | 时长 | 说明 |
|---|---|---|---|---|
| `se_wind` | se_wind.wav | 粉红噪声 + 阵风 LFO 包络 + 高频嘶声 | 4.0s（可循环） | 海风/离岛环境 |
| `se_chain` | se_chain.wav | 多次金属咔哒（带通噪声 + 3kHz 谐振音） | 1.6s | 长廊铁链声 |
| `se_heartbeat` | se_heartbeat.wav | 55Hz 低频 thump × 3 拍（lub-dub） | 3.0s | 惊吓点心跳 |
| `se_key` | se_key.wav | 高频金属铃响（带通噪声 + 5kHz 谐振） | 1.3s | 钥匙串/开锁 |
| `se_clue` | se_clue.wav | 双音铃（C5→G5，钟型衰减） | 1.6s | 线索获得提示 |
| `se_wave` | se_wave.wav | 布朗噪声 + 涌浪包络 + 浪尖泡沫嘶声 | 5.0s（可循环） | 海浪 |

## 重要说明（诚实原则）
- 这些是**程序化占位音效**，听感接近但非采样级；可作为 demo 直接运行，不影响引擎。
- 后续若要更高质感，用同文件名替换 `public/audio/jianmo/se_*.wav` 即可，manifest 键不变（`audio.se_{name}`）。
- 与 BGM 不同：**SE 不走"空则不登记"红线**——本作 6 个 SE 已全部生成并可直接登记进 `manifest.audio`（Step 6 编写时带上 `se` 指令即可）。若你决定某条不采用，再将其从 manifest 移除。

## 重跑 / 调参
```bash
# 用托管 Python 直接跑（无需 venv / 联网）
C:\Users\wll\.workbuddy\binaries\python\versions\3.13.12\python.exe D:\avg-game-maker-skill\avg-engine-example\story-wip\资源\se_gen.py
```
