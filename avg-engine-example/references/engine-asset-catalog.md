# 引擎表现能力清单（Capability Catalog）

> 本文件是 skill 在「把剧本章节落进 `script.ts`」时的**能力清单**，列出除背景图/立绘/音频之外所有可用的表现形式。写剧本前对照此表，能多几种演出手段——尤其全新的 **`video` 全屏过场** 与 **`item` 物件弹窗**。
>
> 所有取值均与 `src/engine/types.ts` 对齐，且已**实装**（非占位）。最后更新随 `video`/`item` 指令一并落地（2026-09-04）。

---

## §1 转场 Transition（7 值）

`scene` 指令的 `transition` 字段：

`fade` · `slide-left` · `slide-right` · `none` · `iris` · `dissolve` · `flash`

背景切换的进场方式；`flash` 同时带一次白闪，常用于强转折。

## §2 场景调色 Grade（5 值）

`scene` 指令的 `grade` 字段，在场景上叠加一层淡色营造氛围：

`none` · `warm`（暖调）· `cold`（冷调）· `soft`（柔光）· `dusk`（黄昏）

例：公园=soft、黄昏=warm、遗憾/失落=cold。

## §3 天气粒子 Weather（5 值）

`scene` 指令的 `weather` 字段，叠加在场景之上的环境粒子：

`none` · `petal`（樱花）· `rain` · `snow` · `bokeh`（光斑）

例：公园白天=petal、雨夜=rain、梦幻回忆=bokeh。

## §4 屏幕特效 Effect（8 值）

`effect` 指令的 `effect` 字段，用于表白/冲突/悬念等戏剧点强化演出；可加 `duration`（秒）：

`shake`（震屏）· `flash`（闪白）· `dim`（压暗）· `zoom`（推拉）· `rain` · `snow` · `petal` · `bokeh`

前 4 个为屏幕级特效，后 4 个与 Weather 共享粒子系统。

## §5 立绘动画与序列帧

- **入场 / 退场**：`char` 的 `show`/`hide` 自动带滑入+淡入 / 滑出+淡出（已在引擎实现）。
- **镜头推拉**：`effect:'zoom'` 或 `effect:'dim'` + KenBurns 缓慢平移缩放。
- **序列帧动画**：`anim` 指令 `play`/`stop`，`manifest.animations[id]` 对应
  `AnimationDef { frames:[...], frameRate, loop, width?, height? }`，定位用 `position`（left/center/right）。适合表情动态、技能演出等。

## §6 音频 Audio

- `bgm`：`action: play | stop | fadeout`，`id` 对应 `manifest.audio[key]`。
- `se`：`id` 对应 `manifest.audio[key]`。
- ⚠️ **`loadAudio` 对缺失文件 `throw`，会直接崩溃整个游戏**。缺失音频**绝不**登记进 `manifest.ts`（音效/BGM 可留空，但空了就不要写 key）。

## §7 结局收集 Ending 系统

- `unlock` 指令 + `EndingDef`（`id/title/desc/how/thumbnail`）+ localStorage 持久化（按 `storyId` 隔离）+ 相册面板/详情弹窗。
- 多结局故事在 `StoryDef.endings` 声明，剧本关键处 `unlock`，给玩家结局收集相册。

---

## §J 全屏视频过场 + 物件弹窗（演出强化指令）

> 这是本次新增的两条「演出强化」指令，纯游戏内叙事/演出道具。本作（樱色未央）**不使用任何变现**——`item`/`video` 只用于推动剧情与强化演出，不接外链、不接二维码/购买引导图。

### J.1 `video` — 全屏视频过场

- **登记**：`manifest.videos[key] = url`（按需加载，**不预载**）。
  ```ts
  videos: {
    op_cinematic: '/videos/op.mp4',        // 片头动画
    promo_trailer: '/videos/promo.mp4',    // 推广/预告片（变现用法，见 J.3）
  }
  ```
- **指令**：`{ type:'video', id:'op_cinematic' }`
- **行为**：DOM `<video>` 覆盖在画布之上，`object-fit:contain` 居中、黑底；点击=跳过；`ended` / 404 / 自动播放被拦截时**自动结束并继续，不崩溃**。
- **跳过策略**：**可被快进(skip)模式自动跳过**，适合纯演出过场（片头/章节过场/OP·ED）。
- **用途**：片头动画、章节过场、OP/ED，或**推广/预告片视频**。

### J.2 `item` — 物件弹出放大图

- **登记**：`manifest.items[key] = { src, caption? }`。
  ```ts
  items: {
    letter_01:  { src:'/images/items/letter_01.png', caption:'匿名信·第一封' },
    evidence_1: { src:'/images/items/evidence_1.png', caption:'沾血的书签' },
  }
  ```
- **指令**：`{ type:'item', id:'letter_01' }`
- **行为**：半透明全屏覆盖层（z-index 60，高于视频层），居中放大显示图片 + 可选标题，点击任意处关闭；图片 **404 → 显示「（物件图片缺失）」占位但仍可关闭，不阻断游戏**。
- **跳过策略**：**不会被自动/快进模式跳过**，强制玩家点开查看——适合关键证物、信件、照片等必须让玩家亲眼看到的物件。
- **用途**：书信、证物、照片、地图、日记、收藏品等「需要玩家亲眼看到」的物件。

### J.3 扩展说明（本作不用变现）

- 物件 id / 文件名**本作不用** `ad_`/`shop_`/`dlc_` 前缀——`item`/`video` 纯粹服务剧情（书信、证物、照片、回忆过场等）。
- 引擎虽已留好 DOM 覆盖层与关闭回调（`showItem(url, caption, onClose)` / `playVideo(url, onEnd)`），可在 `onClose`/`onEnd` 挂跳转/埋点；但**当前项目不接**，保留为纯演出层。
- 若日后确有变现需求，再按此前缀约定与回调接入，不污染现有剧本格式。

---

## 命名约定（Step 4 资源总表）

`bg_` / `{char}_{pose}` / `anim_` / `bgm_` / `se_` / `video_` / `item_` + 统一 `{game}` 前缀；
`items` 本作仅按剧情命名（如 `letter_01`/`evidence_1`），`ad_`/`shop_`/`dlc_` 变现前缀**当前项目不使用**。
