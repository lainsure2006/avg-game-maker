# D. 特效 Effects — 《缄默回廊》

> Step 4 · D 类子表。特效绝大部分是引擎渲染层实现，**不消耗图片资源**。本步只记录"剧本用了哪些特效"以便 Step 6 正确写指令、Step 7 测试覆盖。

| 特效类型 | 参数(剧本 `effect` 指令) | 是否需资源 | 出现分镜 | 状态 |
|---|---|---|---|---|
| `flash` | `duration` 0.3~0.4 | 否（引擎内置） | Ch3-S04, Ch4-S07, Ch8, Ch10-S03 | 内置 |
| `dim` | `duration` 0.5~0.8 | 否（引擎内置） | Ch3-S05, Ch4-S04/S07, Ch5-S04/S05, Ch7-S05, Ch9-S02/S05/S06, Ch12-wrong | 内置 |

> 未用 `shake` / `zoom` / `petal` / `bokeh` 等。自定义粒子需 C 类序列帧，本作无。
> Step 6 编写时按上表写 `effect` 指令即可；Step 7 测试需覆盖 flash/dim 两类演出。
