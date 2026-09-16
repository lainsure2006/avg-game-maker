# AVG 引擎 — 资源与表现能力总目录（动画 / 特效 / 转场 / 氛围 / 音频）

> 本文件是 `avg-game-maker` skill 的配套查阅文档。把剧本（剧本化产物）落到引擎 `script.ts`
> 时，除了图片与音频资产，还要考虑**转场、场景氛围、天气、屏幕特效、立绘动画、序列帧动画、结局**。
> 本目录按"剧本作者需要知道的引擎能力"编目，所有枚举值均已对照源码核实：
> - 类型定义：`src/engine/types.ts`（ScriptCommand / TransitionType / GradeType / WeatherType / EffectType / AnimationDef）
> - 指令解析：`src/engine/script-parser.ts`
> - 渲染与播放：`src/engine/renderer.ts` `src/engine/game-engine.ts` `src/engine/particles.ts`
> - 结局系统：`src/engine/save-system.ts` `src/ui/ui-manager.ts`
> - 故事元信息结构：`src/game/index.ts`（StoryDef）
>
> 关联文档：引擎通用指令见 `AI_GUIDE.md`；最详尽的实现说明在 `DEV_MANUAL.md`（§5 指令、§15 特效系统、§16 结局收集）。

---

## 能力总览（落地剧本时必须逐幕核对）

| 分类 | 指令 / 字段 | 枚举或结构 | 是否落地到 manifest | 备注 |
|------|------------|-----------|------------------|------|
| A 场景 + 转场 | `scene.transition` | 7 值 | 否（仅引用 bg key） | 背景切换动画 |
| B 场景氛围 | `scene.grade` | 5 值 | 否 | 叠色营造情绪 |
| C 场景天气 | `scene.weather` | 5 值 | 否 | 环境粒子（与特效天气值重叠） |
| D 屏幕特效 | `effect` | 8 值 | 否 | 闪白/震屏/暗角/缩放/粒子 |
| E 立绘动画 | `char` show/hide/move | — | 立绘在 `sprites` | 入场滑入+淡入 / 退场滑出+淡出 |
| F 序列帧动画 | `anim` | AnimationDef | 是（`animations`） | 帧图数组循环播放 |
| G 音频 | `bgm` / `se` | — | 是（`audio`） | BGM 播放/停止/淡出，SE 一次性 |
| H 图片资源 | `manifest.backgrounds` / `sprites` | — | 是 | 背景不透明、立绘透明 |
| I 结局 | `unlock` + `StoryDef.endings` | EndingDef | 是（`endings` 在 story.ts） | 收集解锁，localStorage 持久化 |
| J 物件弹出 | `item` + `manifest.items` | ItemDef | 是（`items`） | 证物/信件/照片放大图，点击关闭 |

---

## A. 场景切换与转场（`scene` 指令）

```ts
{ type: 'scene', bg: 'classroom', transition: 'fade' }
```

- `bg`：必须是 `manifest.backgrounds` 中的 key。
- `transition`（可选，默认引擎内置转场）：

| 值 | 效果 |
|----|------|
| `fade` | 淡入淡出（默认最常用） |
| `slide-left` | 背景向左滑入 |
| `slide-right` | 背景向右滑入 |
| `none` | 即时切换，无动画（读档转场用） |
| `iris` | 圆形光圈展开 |
| `dissolve` | 溶解叠化 |
| `flash` | 闪白切换 |

> 7 个值全部已实现（`types.ts:60`）。`AI_GUIDE.md` 旧文档只列了 4 个，以本目录为准。

---

## B. 场景氛围调色（`scene.grade`）

在背景上叠加一层淡色，低成本营造情绪，不影响后续指令：

```ts
{ type: 'scene', bg: 'rooftop', grade: 'dusk' }
```

| 值 | 氛围 |
|----|------|
| `none` | 不调色（默认） |
| `warm` | 暖色（黄昏/温馨/回忆） |
| `cold` | 冷色（清冷/疏离/夜晚） |
| `soft` | 柔和（日常/治愈） |
| `dusk` | 暮色（黄昏/感伤/收尾） |

> 5 个值全部实现（`types.ts:64`）。`grade` 与 `transition`、`weather` 可在同一条 `scene` 中共存。

---

## C. 场景天气粒子（`scene.weather`）

在场景上叠加持续的环境粒子层：

```ts
{ type: 'scene', bg: 'street', weather: 'petal' }
```

| 值 | 效果 |
|----|------|
| `none` | 无（默认） |
| `petal` | 樱花飘落（本项目主基调） |
| `rain` | 雨 |
| `snow` | 雪 |
| `bokeh` | 光斑 / 散景光点 |

> 5 个值全部实现（`types.ts:67`）。粒子由 `particles.ts` 驱动。
> 注意：`weather` 与 D 类 `effect` 的 `rain/snow/petal/bokeh` 值**同名同义**——若只想常驻天气，用 `scene.weather`；若想要一次性触发/可控时长，用 `effect`。

---

## D. 屏幕特效（`effect` 指令）

```ts
{ type: 'effect', effect: 'flash', duration: 0.4 }
```

- `effect`：

| 值 | 效果 | 典型用途 |
|----|------|---------|
| `shake` | 画面震动 | 冲击、惊讶、突发事件 |
| `flash` | 闪白 | 转场强调、回忆切、告白点 |
| `dim` | 暗角 / 压暗 | 聚焦、沉思、紧张 |
| `zoom` | 镜头推近（摄像机缩放） | 告白、关键特写（本项目 2 个告白点用） |
| `rain` | 触发雨粒子（一次/可控时长） | 同 C，但可带 `duration` 限时 |
| `snow` | 触发雪粒子 | 同上 |
| `petal` | 触发樱花粒子 | 同上 |
| `bokeh` | 触发光斑粒子 | 同上 |

- `duration`（可选，秒）：特效持续时间；不填则按引擎默认。
- **全部 8 个值均已接入渲染器（非 stub）**（`types.ts:61`，`renderer.ts` 驱动）。
- `AI_GUIDE.md` 旧标注"特效（部分未实现）"已过时——实际全部实现，本目录为权威说明。

> 用法建议：5 个抉择点用 `flash`/`shake`/`dim` 做节奏强调；告白点用 `zoom` 做镜头推近。

---

## E. 立绘与角色动画（`char` 指令 + 自动入场/退场）

```ts
{ type: 'char', action: 'show', id: 'alice', position: 'center', pose: 'default', expression: 'happy' }
{ type: 'char', action: 'move', id: 'alice', position: 'left', pose: 'surprised' }
{ type: 'char', action: 'hide', id: 'alice' }
```

- `action`：`show` / `hide` / `move`。
- `id`：角色 key，必须存在于 `manifest.sprites`。
- `position`（可选）：`left` / `center` / `right`。
- `pose`（可选）：该角色在 `sprites[id]` 下的姿态 key（如 `default`/`happy`/`sad`/`surprised`）。
- `expression`（可选）：对话/立绘的表情覆盖。

**角色动画（引擎自动，无需作者写额外指令）：**
- 入场：`show` 时自动**滑入 + 淡入**（`entering`，方向由 `enterDir` 决定：`-1` 从左、`1` 从右、`0` 仅淡入）。
- 退场：`hide` 时自动**滑出 + 淡出**（`exiting`，`EXIT_DUR = 0.34s`）。
- 位移：`move` 改变位置时平滑过渡（`currentX` → `targetX`）。
- 镜头缩放：`effect: 'zoom'` 可做关键帧特写，与立绘位置配合。

> 立绘资源：透明 PNG，按 `pose` 拆图（多种表情/动作图）。换景时引擎会清台（隐藏所有立绘）。
> 立绘自适应与分页已由引擎处理，作者只需给出 `position`/`pose`。

---

## F. 序列帧动画（`anim` 指令 + manifest.animations）

用于播放帧图序列（如表情包动图、特效序列、过场动画）：

```ts
// manifest.ts
animations: {
  sparkle: { frames: ['/images/anim/sparkle_1.png', '/images/anim/sparkle_2.png', ...],
             frameRate: 8, loop: true, width: 400, height: 600 },
}

// script.ts
{ type: 'anim', action: 'play', id: 'sparkle', position: 'center' }
{ type: 'anim', action: 'stop', id: 'sparkle' }
```

- `AnimationDef`（`types.ts:18`）：`frames: string[]`（帧图路径）、`frameRate: number`（建议 6–12）、`loop: boolean`、`width?`/`height?`（可选绘制尺寸，默认按立绘规则缩放）。
- `anim` 指令：
  - `action`：`play` / `stop`。
  - `id`：对应 `manifest.animations` 的 key。
  - `position`（可选）：播放位置（left/center/right），由 `renderer.ts` 读取并定位。
  - ⚠️ `target` 字段在类型中声明（`types.ts:41`）但**未被 script-parser 解析使用**（解析只取 `position`，`renderer` 也只用 `position`）。要定位动画请用 `position`，`target` 当前为潜在未接线字段，不要依赖。

> 本项目 `story3` 的 `manifest.animations` 为空（`{}`）——引擎支持但本故事未使用序列帧资源。新故事若需表情动图/过场动画，在此登记。

---

## G. 音频（`bgm` / `se` 指令）

```ts
{ type: 'bgm', action: 'play', id: 'bgm_morning' }
{ type: 'bgm', action: 'fadeout', duration: 1.5 }
{ type: 'bgm', action: 'stop' }
{ type: 'se', id: 'se_bell' }
```

- `manifest.audio`：`id -> url`，注册所有 BGM 与 SE。
- `bgm`：`action` 为 `play` / `stop` / `fadeout`；`id` 指定曲目；`duration`（可选）用于淡出时长。
  - 首页 BGM 由引擎 `showTitleScreen()` 自动播放 `bgm_title`；`restoreFromSave` 读档时自动停 BGM。
  - `playBgm`/`stopBgm` 已修复音量残留问题（淡出后恢复 `bgmGain.gain`），后续 BGM 不会静音。
- `se`：一次性音效，传 `id` 即可。
- ⚠️ **`loadAudio` 在文件缺失时会 throw（非安全跳过）**——manifest 登记了 audio key 就必须有对应文件，否则游戏启动崩溃。

> 示例资产（story3 已落地，非引擎内置）：BGM×9（`bgm_morning`…`bgm_title`）、SE×4（`se_wind`/`se_candy`/`se_bell`/`se_basketball`）。

---

## H. 图片资源（backgrounds / sprites）

- `manifest.backgrounds`：`id -> url`，**不透明** txt2img 背景（本项目 1280×720，动漫风）。
- `manifest.sprites`：`角色id -> { pose: url }`，**透明** PNG 立绘（先白底出图再抠透明）。
- 占位机制：`placeholder.ts` 的 `MISSING_KEYS` 硬编码集合会覆盖实图为渐变占位图。**落图后必须清空对应 key**，否则仍显示占位。
- `loadImage` 缺失通常走降级；但 `loadAudio` 缺失直接 throw（见 G）。

---

## I. 结局收集系统（`unlock` 指令 + StoryDef.endings）

```ts
// story.ts（StoryDef）
endings: [
  { id: 'love', title: '恋之光', desc: '...', how: '...', thumbnail: '/images/bg/ending_good.png' },
  ...
]

// script.ts（关键节点解锁）
{ type: 'unlock', ending: 'love' }
```

- `StoryDef.endings`（`src/game/index.ts:24`，`EndingDef` 类型）：声明本故事全部结局（标题/简介/达成方式/缩略图）。
- `unlock` 指令：在剧情关键分支点调用，参数为 `ending` id（对应 `StoryDef.endings[].id`）。
- 持久化：`save-system.ts` 用 localStorage（`STORAGE_KEY_ENDINGS`），**按 storyId 隔离**。
- UI：`ui-manager.ts` 提供结局相册面板 + 详情弹窗（缩略图、标题、达成方式）。
- 默认故事选择：引擎优先选有 `endings` 的故事（避免空结局收集点不开）。

> 完整文档见 `DEV_MANUAL.md` §16。本项目 story3 已注册 4 个结局并在 ch17–21 共 5 处 `unlock`。

---

## J. 物件弹出（`item` 指令 + manifest.items）—★ 2026-09-04 新增通用能力

把「证物 / 信件 / 照片 / 收藏品」等物件以**放大图**在画面中弹出，玩家点击遮罩任意处关闭，关闭后剧本继续。
**无需为物件专门做一张背景图**——既省出图预算，又让「检视」动作有仪式感。

```ts
// manifest.ts
items: {
  letter_anon_7: { src: '/images/items/letter_anon_7.png', caption: '匿名信·第七封' },
  report_18th:    { src: '/images/items/report_18th.png',    caption: '第十八页报告' },
}

// script.ts（在描述「展开那封信」的 narration 之后直接加一条）
{ type: 'narration', text: '你展开了那封信……' },
{ type: 'item', id: 'letter_anon_7' },   // 弹出放大图，点击关闭继续
```

- `ItemDef`（`types.ts`）：`src: string`（图片地址，建议放 `public/images/items/`）、`caption?: string`（可选标题，如「匿名信·第七封」）。
- `item` 指令：`{ type: 'item', id }`，`id` 对应 `manifest.items` 的 key。
- **交互**：弹出后**阻塞脚本循环**，游戏暂停；**点击遮罩任意处关闭**恢复。
- **自动/快进模式不自动关闭**：`waitingForItem` 是独立标志，自动模式只自动推进 `waitingForClick`（对话），快进模式只跳过 `dialog/narration/video`——物件必须玩家亲自点开细看，不会被一闪而过。
- **404 容错**：图片缺失时显示「（物件图片缺失）」占位，仍可点击关闭，游戏不崩（与 video 的"静默跳过"不同，物件是"显示占位仍能继续"）。
- 落位路径：`public/images/items/<id>.png`。图片建议**透明或纯底色的物件特写**（平铺摆放最易保持一致）。

> **★ 编辑剧本时的变现切入点（monetization）**：`item` 弹窗是天然的「展示位」，编辑剧本时可直接接入商业内容而不破坏叙事——
> - **植入 / 产品展示**：在剧情自然节点弹出品牌物件（如角色喝的那款饮料、用的那款手机），带 `caption` 标注。
> - **收藏品 / 周边橱窗**：把游戏内道具、联名周边做成可弹出的 `item`，引导玩家去商店。
> - **付费解锁证物**：把关键证物设为需解锁才弹出的 `item`（配合 `unlock` / 付费墙），做成 DLC 式内容。
> - **二维码 / 购买引导图**：把一张含二维码或购买链接的图作为 `item` 弹出，玩家点击遮罩前先看得到。
> 这一类内容建议统一前缀（如 `ad_` / `shop_` / `dlc_`）以便与剧情物件区分、也便于后续统计曝光。

---

## 落地检查清单（写 script.ts 前逐幕过一遍）

1. **换景**：`scene` 的 `bg` 是否在 `manifest.backgrounds`？需要转场/氛围/天气吗（`transition`/`grade`/`weather`）？
2. **氛围**：情绪节点是否用 `grade`（warm/cold/dusk）强化？
3. **天气**：常驻天气用 `scene.weather`；限时粒子用 `effect: rain/snow/petal/bokeh` 带 `duration`。
4. **强调点**：抉择/转折是否用 `effect: flash/shake/dim`；告白/特写是否用 `effect: zoom`。
5. **立绘**：`char` 的 `id`/`pose`/`position` 是否都在 `manifest.sprites` 中？换景是否需 `hide` 清台？
6. **序列帧**：本幕是否需要 `anim`？`manifest.animations` 是否登记了 `frames`/`frameRate`/`loop`？定位用 `position`（勿用 `target`）。
7. **音频**：BGM 切换（`play`/`fadeout`/`stop`）与 SE 触发点；`manifest.audio` 是否齐备（缺失即崩）。
8. **结局**：分支收束点是否 `unlock` 了对应 `StoryDef.endings[].id`？
9. **占位清理**：若剧本此前用占位图，`placeholder.ts` 的 `MISSING_KEYS`/`PLACEHOLDERS` 是否已清空。
