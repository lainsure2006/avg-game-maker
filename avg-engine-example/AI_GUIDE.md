# AVG 引擎 — AI 写剧本指南

> 本指南供 AI（或开发者）快速编写新故事。引擎会自动发现所有 `src/game/story<N>/` 目录。

---

## 快速开始

1. 复制 `src/game/story-template/` → `src/game/story3/`（数字递增）
2. 修改 4 个文件即可

---

## 文件结构

```
story3/
├── story.ts       ← 故事元信息（标题、副标题、首页配置）
├── manifest.ts    ← 资源清单（需要哪些背景图、角色立绘）
├── script.ts      ← 剧本（指令序列）
└── placeholder.ts ← 占位图（图片缺失时的替代方案）
```

---

## 1. story.ts — 故事元信息

```ts
const story: StoryDef = {
  id: 'my-story',           // 唯一 ID，英文短横线
  title: '我的故事',
  subtitle: '— 副标题 —',
  description: '故事选择页面的简介文字',
  titleScreen: {
    background: 'classroom', // 首页背景，必须是 manifest.backgrounds 中的 key
    title: '我的故事',
    subtitle: '— 副标题 —',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(200, 200, 220, 0.85)',
    titleFontSize: 0,        // 0=自动计算
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillPlaceholders(manifest),
  getScript: () => script,
};
```

---

## 2. manifest.ts — 资源清单

### 已有资源

**详见 [ASSETS.md](./ASSETS.md)** — 完整的可用背景、角色立绘清单，所有列出的图片均确认存在。

### 新增资源

如果故事需要新图片，在 manifest 中声明路径，然后生成图片放到对应目录：

```ts
backgrounds: {
  classroom: '/images/bg/classroom.png',  // 复用已有
  my_new_bg: '/images/bg/my_new_bg.png',  // 新背景
},
sprites: {
  alice: { default: '/images/sprite/alice_default.png' }, // 复用
  my_char: {                                     // 新角色
    default: '/images/sprite/my_char_default.png',
    happy:   '/images/sprite/my_char_happy.png',
  },
},
```

### 图片提示词模板（给 AI 生成图片用）

**背景图**（1280×720，动漫风格）：
> A visual novel background, anime style, [场景描述], 1280x720, high quality, soft lighting, suitable for game background

**角色立绘**（400×600，PNG 透明背景）：
> A visual novel character sprite, anime style, [角色描述], [表情], full body standing pose, 400x600, transparent background, clean lines

---

## 3. script.ts — 剧本指令

### 全部指令速查

| 指令 | 格式 | 说明 |
|------|------|------|
| `scene` | `{ type:'scene', bg:'key', transition?, grade?, weather? }` | 切换背景。transition: fade/slide-left/slide-right/none/iris/dissolve/flash；grade(调色): none/warm/cold/soft/dusk；weather(天气): none/petal/rain/snow/bokeh。**若 `bg` 在 `manifest.parallax` 中有定义，自动启用多层视差** |
| `char` | `{ type:'char', action:'show'\|'hide'\|'move', id, position?:'left'\|'center'\|'right', pose?, expression? }` | 角色显隐/移动 |
| `dialog` | `{ type:'dialog', speaker, text, expression? }` | 角色对话 |
| `narration` | `{ type:'narration', text }` | 旁白 |
| `choice` | `{ type:'choice', choices:[{ text, label, condition? }] }` | 选项分支（可选 `condition` 控制显隐） |
| `jump` / `label` | `{ type:'jump', label }` / `{ type:'label', id }` | 跳转 / 跳转锚点 |
| `set` | `{ type:'set', variable, value, op?:'='\|'+='\|'-=' }` | 变量赋值，op 默认 `=` |
| `if` | `{ type:'if', condition, trueLabel, falseLabel }` | 条件分支 |
| `wait` | `{ type:'wait', duration }` | 暂停（秒） |
| `end` | `{ type:'end' }` | 结束 |
| `bgm` | `{ type:'bgm', action:'play'\|'stop'\|'fadeout', id?, duration? }` | 背景音乐 |
| `se` | `{ type:'se', id }` | 音效 |
| `effect` | `{ type:'effect', effect, duration? }` | 屏幕特效：shake/flash/dim/rain/snow/petal/bokeh/zoom（详见 references/engine-asset-catalog.md） |
| `anim` | `{ type:'anim', action:'play'\|'stop', id, position? }` | 序列帧动画；id 对应 manifest.animations（frames/frameRate/loop） |
| `unlock` | `{ type:'unlock', ending }` | 解锁结局收集；ending 对应 StoryDef.endings[].id |
| `video` | `{ type:'video', id }` | 全屏视频过场（DOM `<video>` 覆盖，点击跳过，**可被快进模式跳过**） |
| `item` | `{ type:'item', id }` | 物件放大弹窗（证物/信件/照片，半透明覆盖层，**不会被快进跳过**，强制查看） |
| `cinematic` | `{ type:'cinematic', on:boolean }` | 阶段5 电影宽银幕开关（黑边 + 加强背景缓推） |
| `relation` | `{ type:'relation', characters:[ RelationDef ] }` | 角色养成档案声明（好感等），init 预扫描 |
| `event` | `{ type:'event', list:[ EventDef ] }` | 养成事件监视表（条件命中自动跳转），init 预扫描 |
| `clue` | `{ type:'clue', id, name, desc, icon? }` | 线索/证物声明与收集 |
| `deduce` | `{ type:'deduce', list:[ DeductionDef ] }` | 推理规则（选线索组合触发跳转/写变量） |
| `explore` | `{ type:'explore', bg, widthRatio?, hint?, hotspots:[ ExploreHotspot ] }` | 阶段3 探索模式（宽图平移 + 点击热区收集线索/弹出道具） |
| `hub` | `{ type:'hub', title?, bg?, time:[…], apPerPhase?, onEnd, nodes:[ HubNode ] }` | 阶段4 场景自选枢纽（地图节点 + 时间阶段 + 行动点） |
| `returnHub` | `{ type:'returnHub' }` | 阶段4 场景结束回到枢纽 |
| `qte` | `{ type:'qte', id, prompt, duration, mode:'tap'\|'key'\|'mash', key?, target?, successLabel, failLabel, once? }` | 阶段6 QTE 快速反应事件 |
| `codex` | `{ type:'codex', list:[ CodexDef ] }` | 阶段6 图鉴目录声明（角色/地点/术语/线索） |
| `codexUnlock` | `{ type:'codexUnlock', id }` | 阶段6 解锁图鉴条目 |

### 条件表达式

```ts
// 支持：>= <= > < == != && || !
{ type:'if', condition:'affinity >= 5', trueLabel:'good', falseLabel:'normal' }
{ type:'if', condition:'score >= 3 && flag.foundKey', trueLabel:'secret', falseLabel:'normal' }
```

### 全屏视频过场与物件弹窗（video / item）

两条「演出强化」指令，让剧本多两种表现形式，无需额外手写 UI：

**① video — 全屏视频过场**
- manifest 登记：在 `AssetManifest` 增加 `videos: { [key]: url }`（按需加载，不预载）。
  ```ts
  videos: {
    op_cinematic: '/videos/op.mp4',      // 片头动画
    promo_trailer: '/videos/promo.mp4',  // 片头/章节过场/OP·ED 等演出视频（本作纯演出，不接变现）
  }
  ```
- 剧本用法：`{ type:'video', id:'op_cinematic' }`
- 行为：DOM `<video>` 覆盖在画布之上，object-fit:contain 居中、黑底；点击=跳过；视频结束/404/自动播放被拦截时自动结束并继续，不会崩溃。
- 跳过策略：**可被快进(skip)模式自动跳过**，适合纯演出过场（片头/章节过场/OP·ED）。

**② item — 物件弹出放大图**
- manifest 登记：在 `AssetManifest` 增加 `items: { [key]: { src, caption? } }`。
  ```ts
  items: {
    letter_01:  { src:'/images/items/letter_01.png', caption:'匿名信·第一封' },
    evidence_1: { src:'/images/items/evidence_1.png', caption:'沾血的书签' },
  }
  ```
- 剧本用法：`{ type:'item', id:'letter_01' }`
- 行为：半透明全屏覆盖层，居中放大显示图片 + 可选标题，点击任意处关闭；图片 404 时显示「（物件图片缺失）」占位但仍可关闭，不阻断游戏。
- 跳过策略：**不会被自动/快进模式跳过**，强制玩家点开查看——适合关键证物、信件、照片等必须让玩家亲眼看到的物件。

**扩展说明（本作不用变现）**

本作（樱色未央）`item`/`video` **纯粹服务剧情**——书信、证物、照片、回忆过场等，不接外链、不接二维码/购买引导图。物件 id / 文件名按剧情命名（如 `letter_01`/`evidence_1`），不用 `ad_`/`shop_`/`dlc_` 前缀。引擎虽已留好 DOM 覆盖层与关闭回调（`showItem(url, caption, onClose)` / `playVideo(url, onEnd)`），可在 `onClose`/`onEnd` 挂跳转/埋点，但当前项目不接，保留为纯演出层。

---

## 4. 阶段6 演出增强与系统（让剧本多一些表达）

以下 stage 6 功能均已实现（眨眼除外，见下）。合理使用可显著丰富演出层次与玩法深度。

### 4.1 视差（Parallax）— 背景「厚度感」

把单张背景按**深度图切成远/中/近多层**，引擎按层位移因子偏移：近景随鼠标/空闲呼吸移动明显、远景几乎不动。

```ts
// manifest.ts —— 在 AssetManifest 增加 parallax 字段
parallax: {
  px_corridor: {
    layers: [
      '/images/bg/jianmo/parallax/px_corridor_far.png',   // 远景（整图）
      '/images/bg/jianmo/parallax/px_corridor_mid.png',   // 中景带
      '/images/bg/jianmo/parallax/px_corridor_near.png',  // 近景带
    ],
    factors: [0.12, 0.45, 1.0],   // 位移因子：远景小、近景大
  },
}
// script.ts —— 普通切换场景即可，bg 命中 parallax 定义就自动启用多层
{ type:'scene', bg:'px_corridor' }
```

- 行为：**空闲时画面极缓「呼吸」**（Ken Burns 级微动）；**鼠标移动时各层按 factor 错位**（近景位移大、远景几乎不动）；**切换场景整组视差层淡入淡出**。
- 开关：`GameSettings.parallaxEnabled` 可整体关闭。
- 资源制作：用深度图（DepthAnything）把单张背景切成 far/mid/near 三层，详见 `STAGE6_PARALLAX_BLINK_ASSETS.md`。

### 4.2 QTE — 快速反应事件

在关键时刻插入限时反应，失败/成功走不同分支。

```ts
{ type:'qte', id:'demo_qte', prompt:'快躲开！', duration:2.0, mode:'tap',
  successLabel:'dodge_ok', failLabel:'dodge_fail', once:true }
```

- `mode`：`tap`（点击/触屏即过）、`key`（按指定键，`key:' '`）、`mash`（连点 `target:5` 次）。
- `once:true` 用 `flag.qte.<id>` 守门（读档安全，不会重复触发）。
- **总开关**：设置或 `GameSettings.qteEnabled=false` 时引擎直接判定成功（无障碍/跳过友好）。

### 4.3 图鉴（Codex）— 世界观收集

声明目录，游戏进程中逐步解锁，玩家在顶栏「图鉴」面板查阅（未解锁显示 ???）。

```ts
// 声明目录（init 预扫描登记）
{ type:'codex', list:[
  { id:'gucheng', category:'character', title:'顾承', desc:'……' },
  { id:'dock',    category:'place',     title:'废旧码头', desc:'……' },
  { id:'protocol',category:'term',      title:'缄默协议', desc:'……' },
]}
// 剧情推进中解锁
{ type:'codexUnlock', id:'gucheng' }
```

- `category`：`character` / `place` / `term` / `clue`。
- 存档：`unlockedCodex` 序列化，读档恢复。

### 4.4 多周目（NG+）— 规划中

路线锁 + 周目继承的纯引擎方案已写入 `GAMEPLAY_UPGRADE_PLAN.md §9.3`（SPEC 阶段，尚未编码）。需要时按该 SPEC 落地即可。

### 4.5 立绘眨眼（Blink）— 已实现，默认挂起 ⏸️

程序化眼睑方案已实现（Pillow 几何定位双眼 + 采样肤色生成闭眼覆盖层，与原立绘 100% 对齐、无 GPU）。**但因本作是真实系小眼，眨眼几乎不可见，已默认关闭**（`GameSettings.blinkEnabled=false`）。

- 适用场景：**二次元大眼向立绘**效果显著。届时把 9 张 `<sprite>_blink.png` 覆盖层 + 引擎代码一键启用即可。
- 设置面板保留「立绘眨眼」开关（关着），可勾选复验。

> 更早的 stage 3–5 系统（`hub` 枢纽 / `explore` 探索 / `clue`+`deduce` 推理 / `relation`+`event` 养成 / `cinematic` 电影宽屏）的完整字段与示例见 `DEV_MANUAL.md` 与 `references/step6-game-authoring.md`。

---

## 5. placeholder.ts — 占位图

如果 manifest 中声明的图片文件实际不存在，在 `MISSING_KEYS` 中标记：

```ts
const MISSING_KEYS = new Set<string>([
  'my_new_bg',
]);
```

同时在 `PLACEHOLDERS` 中定义占位图颜色：

```ts
const PLACEHOLDERS: Record<string, string> = {
  'my_new_bg': createPlaceholder('我的新背景', '#4a6fa5', 1280, 720),
};
```

---

## 完整最小示例

```ts
// story.ts
const story: StoryDef = {
  id: 'hello', title: '你好世界', subtitle: '— 一个最小示例 —',
  description: '最简单的故事示例。',
  titleScreen: { background:'classroom', title:'你好世界', subtitle:'— 示例 —',
    titleColor:'#fff', subtitleColor:'rgba(200,200,220,0.85)', titleFontSize:0,
    showStartButton:true, showContinueButton:true, showSettingsButton:true, showQuitButton:true },
  getManifest: () => fillPlaceholders(manifest),
  getScript: () => script,
};

// manifest.ts — 复用已有资源
export const manifest: AssetManifest = {
  backgrounds: { classroom:'/images/bg/classroom.png' },
  sprites: { alice:{ default:'/images/sprite/alice_default.png', happy:'/images/sprite/alice_happy.png' } },
  animations: {}, audio: {},
};

// script.ts
export const script = [
  { type:'scene', bg:'classroom' },
  { type:'label', id:'start' },
  { type:'char', action:'show', id:'alice', position:'center', pose:'default' },
  { type:'dialog', speaker:'爱丽丝', text:'你好，欢迎来到这个世界！' },
  { type:'choice', choices:[
    { text:'很高兴见到你', label:'happy' },
    { text:'这里是什么地方？', label:'confused' },
  ]},
  { type:'label', id:'happy' },
  { type:'char', action:'move', id:'alice', position:'center', pose:'happy' },
  { type:'dialog', speaker:'爱丽丝', text:'我也很高兴！' },
  { type:'jump', label:'end' },
  { type:'label', id:'confused' },
  { type:'char', action:'move', id:'alice', position:'center', pose:'surprised' },
  { type:'dialog', speaker:'爱丽丝', text:'这里是故事的世界呀。' },
  { type:'label', id:'end' },
  { type:'narration', text:'— 完 —' },
  { type:'end' },
];
```

---

## 注意事项

1. **id 必须唯一**，用英文短横线命名
2. **目录必须叫 `story<N>`**（如 story3、story4），引擎才能自动发现
3. **`titleScreen.background`** 必须是 manifest.backgrounds 中存在的 key
4. **`choice` 的 `label`** 必须有对应的 `{ type:'label', id:'...' }`
5. **`set` 指令**：`op` 参数是 `'+='` 或 `'-='`，默认是 `'='`（直接赋值）
6. 变量是全局的，同一故事内共享
