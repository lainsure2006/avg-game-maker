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
| `scene` | `{ type:'scene', bg:'key', transition?:'fade', grade?:'none', weather?:'none' }` | 切换背景。transition 可选 fade/slide-left/slide-right/none/iris/dissolve/flash（7 值）；grade 可选 none/warm/cold/soft/dusk（5 值）；weather 可选 none/petal/rain/snow/bokeh（5 值） |
| `char` | `{ type:'char', action:'show'\|'hide'\|'move', id:'角色', position:'left'\|'center'\|'right', pose:'pose名' }` | 控制角色显示 |
| `dialog` | `{ type:'dialog', speaker:'说话人', text:'内容' }` | 角色对话 |
| `narration` | `{ type:'narration', text:'内容' }` | 旁白/描述 |
| `choice` | `{ type:'choice', choices:[{ text:'选项', label:'标签' }] }` | 选项分支 |
| `jump` | `{ type:'jump', label:'标签' }` | 跳转到标签 |
| `label` | `{ type:'label', id:'标签名' }` | 定义跳转目标 |
| `set` | `{ type:'set', variable:'变量', value:数值, op?:'+=' }` | 修改变量，op 默认 `=` |
| `if` | `{ type:'if', condition:'表达式', trueLabel:'真', falseLabel:'假' }` | 条件分支 |
| `wait` | `{ type:'wait', duration:秒数 }` | 暂停 |
| `end` | `{ type:'end' }` | 游戏结束 |
| `bgm` | `{ type:'bgm', action:'play'\|'stop'\|'fadeout', id:'key', duration?:秒 }` | 背景音乐 |
| `se` | `{ type:'se', id:'key' }` | 音效 |
| `effect` | `{ type:'effect', effect:'shake'\|'flash'\|'dim'\|'zoom'\|'rain'\|'snow'\|'petal'\|'bokeh', duration?:秒 }` | 屏幕特效（全部 8 值均已实现并驱动渲染器，详见 references/engine-asset-catalog.md） |
| `anim` | `{ type:'anim', action:'play'\|'stop', id:'序列帧key', position?:'left'\|'center'\|'right' }` | 序列帧动画；id 对应 manifest.animations（frames/frameRate/loop）。定位用 position（target 字段未接线） |
| `unlock` | `{ type:'unlock', ending:'结局id' }` | 解锁结局收集；ending 对应 StoryDef.endings[].id |
| `video` | `{ type:'video', id:'视频key' }` | 全屏视频过场：DOM `<video>` 覆盖播放，点击跳过，404/自动播放被拦截时自动结束不崩溃；id 对应 manifest.videos[key]；**可被快进模式跳过** |
| `item` | `{ type:'item', id:'物件key' }` | 物件弹出放大图（证物/信件/照片）：半透明全屏覆盖层，居中放大+可选标题，点击关闭；404 显示「物件图片缺失」占位但仍可关闭；id 对应 manifest.items[key]；**不会被快进模式跳过**，强制玩家查看 |

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

## 4. placeholder.ts — 占位图

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
