# AVG 游戏引擎开发手册

> 版本：1.0 | 基于 TypeScript + Vite + Canvas 2D 的轻量级视觉小说引擎

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 快速开始](#2-快速开始)
- [3. 项目结构](#3-项目结构)
- [4. 资源管理](#4-资源管理)
- [5. 剧本编写](#5-剧本编写)
- [6. 引擎 API](#6-引擎-api)
- [7. UI 系统](#7-ui-系统)
- [8. 首页系统](#8-首页系统)
- [9. 渲染系统](#9-渲染系统)
- [10. 音频系统](#10-音频系统)
- [11. 存档系统](#11-存档系统)
- [12. 变量与分支系统](#12-变量与分支系统)
- [13. 序列帧动画](#13-序列帧动画)
- [14. 进阶定制](#14-进阶定制)
- [15. 特效系统](#15-特效系统)

---

## 1. 项目概述

AVG Engine 是一个基于浏览器 Canvas 2D 的轻量级视觉小说（Visual Novel / AVG）游戏引擎。它使用 TypeScript 编写，Vite 作为构建工具，无需任何第三方游戏框架。

### 核心特性

- **Canvas 渲染**：背景图（cover 适配）、角色立绘（按高度缩放）、序列帧动画
- **脚本驱动**：JSON 格式的剧本，支持对话、旁白、分支选项、条件跳转
- **首页系统**：带标题、菜单按钮的游戏开机首页
- **存档/读档**：20 个槽位，localStorage 持久化，含缩略图
- **打字机效果**：可调速的文字逐字显示动画
- **自动/快进模式**：自动播放和跳过已读对话
- **变量系统**：支持整数、布尔值、字符串，含 `=`、`+=`、`-=` 运算
- **音频管理**：BGM / SE 分离，独立音量控制
- **设置面板**：文字速度、自动延迟、BGM/SE 音量、字体大小
- **对话历史**：回溯已读对话

### 技术栈

| 技术 | 用途 |
|------|------|
| TypeScript | 主要开发语言 |
| Vite 5 | 构建工具与开发服务器 |
| Canvas 2D API | 游戏画面渲染 |
| Web Audio API | 音频播放 |
| localStorage | 存档与设置持久化 |

---

## 2. 快速开始

### 环境要求

- Node.js >= 18
- npm >= 8

### 安装与运行

```bash
cd avg-engine
npm install
npm run dev       # 启动开发服务器（默认 http://localhost:3000）
npm run build     # 构建生产版本到 dist/
npm run preview   # 预览生产构建
```

### 项目启动流程

```
DOMContentLoaded
  └─ main() 入口
       ├─ 创建 GameEngine 实例（绑定 Canvas）
       ├─ engine.init(manifest, script)  // 加载资源 + 解析剧本
       ├─ engine.setTitleScreen({...})   // 配置首页
       ├─ new UIManager(engine)          // 初始化 UI 交互
       └─ engine.start()                 // 显示首页，等待用户操作
```

---

## 3. 项目结构

```
avg-engine/
├── index.html                    # 入口 HTML（Canvas + DOM UI 层）
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 配置（开发服务器 host/port）
├── DEV_MANUAL.md                 # 本手册
├── public/
│   └── images/
│       ├── bg/                   # 背景图（建议 1280×720）
│       ├── sprite/               # 角色立绘（建议 400×600，PNG 透明）
│       └── anim/                 # 序列帧动画帧
└── src/
    ├── main.ts                   # 入口文件
    ├── vite-env.d.ts             # Vite 类型声明
    ├── engine/
    │   ├── types.ts              # 核心类型定义
    │   ├── game-engine.ts        # 游戏引擎核心（脚本执行、状态管理）
    │   ├── renderer.ts           # Canvas 渲染器 + 动画播放器
    │   ├── asset-loader.ts       # 资源加载器
    │   ├── script-parser.ts      # 脚本解析器（JSON → 指令序列）
    │   ├── variables.ts          # 变量系统
    │   ├── save-system.ts        # 存档系统
    │   └── audio.ts              # 音频管理器
    ├── game/
    │   ├── manifest.ts           # 资源清单（图片/音频/动画注册）
    │   ├── script.ts             # 游戏剧本
    │   └── placeholder.ts        # 缺失图片占位图生成
    ├── ui/
    │   └── ui-manager.ts         # UI 管理器（对话框/选项/面板）
    └── styles/
        └── main.css              # 全局样式
```

### 架构分层

```
┌──────────────────────────────────────────────┐
│                  入口层 (main.ts)              │
│         组装引擎 + 配置首页 + 启动            │
├──────────────────────────────────────────────┤
│   UI 层 (ui-manager.ts)                      │
│   对话框 / 选项 / 设置 / 存档 / 首页菜单       │
├──────────────────────┬───────────────────────┤
│   游戏内容层 (game/)  │   引擎核心层 (engine/) │
│   manifest.ts        │   game-engine.ts      │
│   script.ts          │   renderer.ts         │
│   placeholder.ts     │   asset-loader.ts     │
│                      │   script-parser.ts    │
│                      │   variables.ts        │
│                      │   save-system.ts      │
│                      │   audio.ts            │
│                      │   types.ts            │
└──────────────────────┴───────────────────────┘
```

---

## 4. 资源管理

### 4.1 资源清单（manifest.ts）

所有资源需要在 `src/game/manifest.ts` 中注册。引擎只加载注册过的资源。

```ts
export const demoManifest: AssetManifest = {
  backgrounds: {
    classroom:     '/images/bg/classroom.png',
    street:        '/images/bg/street.png',
    park_day:      '/images/bg/park_day.png',
    // ... 更多背景
  },

  sprites: {
    alice: {
      default:    '/images/sprite/alice_default.png',
      happy:      '/images/sprite/alice_happy.png',
      sad:        '/images/sprite/alice_sad.png',
      surprised:  '/images/sprite/alice_surprised.png',
    },
    bob: {
      default:    '/images/sprite/bob_default.png',
      smile:      '/images/sprite/bob_smile.png',
      worry:      '/images/sprite/bob_worry.png',
    },
  },

  animations: {
    // 序列帧动画（详见第 13 节）
  },

  audio: {
    // bgm_calm: '/audio/bgm_calm.mp3',
    // se_click: '/audio/se_click.mp3',
  },
};
```

### 4.2 添加资源流程

1. **放置文件**：将图片放入 `public/images/` 对应子目录
2. **注册路径**：在 `manifest.ts` 中添加 `key → url` 映射
3. **剧本引用**：在剧本中用 `key` 名称引用

### 4.3 图片规格建议

| 类型 | 建议尺寸 | 格式 | 说明 |
|------|---------|------|------|
| 背景图 | 1280×720 | PNG/JPG/WebP | 自动 cover 适配画布 |
| 角色立绘 | 400×600 | PNG（透明背景） | 高度缩放至画布 75% |
| 动画帧 | 任意（统一尺寸） | PNG | 放入 `public/images/anim/` |

### 4.4 占位图系统

当 manifest 中注册了但文件实际不存在的图片，`placeholder.ts` 会自动生成彩色占位图替代，确保引擎不会崩溃。

```ts
// 标记已知缺失的文件
const MISSING_KEYS = new Set(['cafe', 'ending_good', 'ending_normal']);

// 在 main.ts 中调用
const manifest = fillMissingPlaceholders(demoManifest);
```

---

## 5. 剧本编写

剧本是一个 JSON 数组，每条指令包含 `type` 字段标识指令类型。

### 5.1 完整指令参考

#### scene — 切换场景背景

```json
{ "type": "scene", "bg": "classroom" }
{ "type": "scene", "bg": "park_day", "transition": "iris", "grade": "soft", "weather": "petal" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bg` | string | ✅ | 背景 ID（对应 manifest.backgrounds 的 key） |
| `transition` | string | ❌ | 转场效果：`"fade"` \| `"slide-left"` \| `"slide-right"` \| `"none"` \| `"iris"` \| `"dissolve"` \| `"flash"`（详见 [15.4 转场升级](#154-转场升级)） |
| `grade` | string | ❌ | 场景调色（氛围）：`"none"` \| `"warm"` \| `"cold"` \| `"soft"` \| `"dusk"`（详见 [15.3 场景调色](#153-场景调色)） |
| `weather` | string | ❌ | 环境天气粒子：`"none"` \| `"petal"` \| `"rain"` \| `"snow"` \| `"bokeh"`（详见 [15.2 粒子天气系统](#152-粒子天气系统)） |

> 换景即清台：每次 `scene` 指令会清空舞台上的立绘（标准 AVG 习惯），并在切换后应用新的 `grade` / `weather`（未填则恢复默认、清除上一场景残留氛围）。若换景后需保留某角色，必须在其后显式 `char` show。

---

#### char — 角色控制

```json
{ "type": "char", "action": "show", "id": "alice", "position": "center", "pose": "default" }
{ "type": "char", "action": "hide", "id": "alice" }
{ "type": "char", "action": "move", "id": "alice", "position": "left" }
// 换表情 / 姿态：人在台上时用 move 原地换 pose（不重放入场动画，不闪烁）
{ "type": "char", "action": "move", "id": "alice", "pose": "happy" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | `"show"` \| `"hide"` \| `"move"` |
| `id` | string | ✅ | 角色 ID（对应 manifest.sprites 的 key） |
| `position` | string | ❌ | `"left"` \| `"center"` \| `"right"` |
| `pose` | string | ❌ | 姿势 ID（对应该角色下的 key，如 `"happy"`）。`show` 与 `move` 都生效 |
| `expression` | string | ❌ | ⚠️ **空壳字段**：会被解析与保存，但渲染完全不读 → 写它不报错也不生效。换表情必须用 `pose` |

**位置规则**：
- `left` = 画布宽度 20% 处
- `center` = 画布宽度 50% 处
- `right` = 画布宽度 80% 处

---

#### dialog — 角色对话

```json
{ "type": "dialog", "speaker": "爱丽丝", "text": "今天的夕阳真美啊……" }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `speaker` | string | ✅ | 说话人名称 |
| `text` | string | ✅ | 对话内容 |
| `expression` | string | ❌ | 表情标记（可选，UI 扩展用） |

---

#### narration — 旁白

```json
{ "type": "narration", "text": "这是一个普通的放学后……" }
```

旁白不显示说话人名称，以斜体/灰色样式显示。

---

#### choice — 分支选项

```json
{
  "type": "choice",
  "choices": [
    { "text": "认真回答自己的梦想", "label": "answer_serious" },
    { "text": "开玩笑地岔开话题", "label": "answer_joke" },
    { "text": "反问她同样的问题", "label": "answer_ask_back" }
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `choices` | array | ✅ | 选项数组 |
| `choices[].text` | string | ✅ | 选项显示文字 |
| `choices[].label` | string | ✅ | 选中后跳转的标签名 |
| `choices[].condition` | string | ❌ | 显示条件（变量表达式） |

---

#### jump / label — 跳转与标签

```json
{ "type": "label", "id": "answer_serious" }
{ "type": "jump", "label": "ending_check" }
```

- `label`：定义跳转目标点
- `jump`：无条件跳转到指定标签

---

#### if — 条件分支

```json
{ "type": "if", "condition": "affinity >= 5", "trueLabel": "ending_good", "falseLabel": "check_normal" }
```

条件表达式支持：
- 比较运算符：`>=`、`<=`、`>`、`<`、`==`、`!=`
- 逻辑运算符：`&&`、`||`
- 布尔变量直接判断：`"flag_serious"`（等同于 `flag_serious == true`）

---

#### set — 变量操作

```json
{ "type": "set", "variable": "affinity", "value": 2, "op": "+=" }
{ "type": "set", "variable": "flag_serious", "value": true }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `variable` | string | ✅ | 变量名 |
| `value` | number/string/boolean | ✅ | 值 |
| `op` | string | ❌ | `"="`（默认）\| `"+="` \| `"-="` |

---

#### bgm — 背景音乐

```json
{ "type": "bgm", "action": "play", "id": "bgm_calm" }
{ "type": "bgm", "action": "stop" }
{ "type": "bgm", "action": "fadeout", "duration": 2 }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | `"play"` \| `"stop"` \| `"fadeout"` |
| `id` | string | play 时必填 | 音频 ID（对应 manifest.audio 的 key） |
| `duration` | number | ❌ | fadeout 持续时间（秒），默认 1 |

---

#### se — 音效

```json
{ "type": "se", "id": "se_click" }
```

---

#### wait — 等待

```json
{ "type": "wait", "duration": 2 }
```

暂停脚本执行 N 秒，期间不阻塞渲染。

---

#### effect — 特效

```json
{ "type": "effect", "effect": "shake", "duration": 0.5 }
{ "type": "effect", "effect": "zoom", "duration": 0.8 }
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `effect` | string | ✅ | 特效类型（见下表） |
| `duration` | number | ❌ | 持续时间（秒），默认 1；屏幕特效实际时长约 `duration * 0.6` |

**`effect` 取值与效果：**

| 值 | 类别 | 效果 |
|------|------|------|
| `flash` | 屏幕特效 | 白色闪光（瞬间提亮后回落） |
| `dim` | 屏幕特效 | 黑色压暗（情绪低沉时） |
| `shake` | 屏幕特效 | 画面震动（冲击/紧张时） |
| `zoom` | 屏幕特效 | 镜头轻微推拉（强调/拉近时，峰值约 1.05 倍，围绕画面中心 0→1→0） |
| `petal` | 天气粒子 | 触发樱花花瓣飘落（持续至下一次 `scene` 切换） |
| `rain` | 天气粒子 | 触发雨丝 |
| `snow` | 天气粒子 | 触发飘雪 |
| `bokeh` | 天气粒子 | 触发暖色散景光斑 |

> 屏幕特效（`flash`/`dim`/`shake`/`zoom`）为一次性瞬时演出，与天气粒子（`petal`/`rain`/`snow`/`bokeh`）是**不同子系统，可叠加不冲突**。由 `game-engine.ts` 的 `case 'effect'` 调用 `renderer.startEffect()` 驱动，已**实装可用**（详见 [15.5 屏幕特效](#155-屏幕特效) 与 [15.2 粒子天气系统](#152-粒子天气系统)）。

---

#### anim — 序列帧动画

```json
{ "type": "anim", "action": "play", "id": "alice_blink", "position": "center" }
{ "type": "anim", "action": "stop", "id": "alice_blink" }
```

---

#### end — 游戏结束

```json
{ "type": "end" }
```

停止主循环，游戏结束。

---

### 5.2 剧本编写示例

```ts
export const myScript = [
  // 开场
  { type: 'scene', bg: 'classroom' },
  { type: 'label', id: 'start' },

  { type: 'narration', text: '这是一个普通的放学后……' },

  // 角色登场
  { type: 'char', action: 'show', id: 'alice', position: 'center', pose: 'default' },
  { type: 'dialog', speaker: '爱丽丝', text: '啊，你还没走啊？' },
  { type: 'dialog', speaker: '我', text: '嗯，刚收拾好东西。' },

  // 分支选项
  {
    type: 'choice',
    choices: [
      { text: '认真回答', label: 'serious' },
      { text: '开玩笑', label: 'joke' },
    ],
  },

  // 分支 A
  { type: 'label', id: 'serious' },
  { type: 'set', variable: 'affinity', value: 2, op: '+=' },
  { type: 'dialog', speaker: '我', text: '我想成为一个能帮助他人的人。' },
  { type: 'jump', label: 'merge' },

  // 分支 B
  { type: 'label', id: 'joke' },
  { type: 'dialog', speaker: '我', text: '当然是成为世界第一的游戏玩家！' },
  { type: 'jump', label: 'merge' },

  // 汇合 + 结局判定
  { type: 'label', id: 'merge' },
  { type: 'if', condition: 'affinity >= 2', trueLabel: 'good_end', falseLabel: 'bad_end' },

  { type: 'label', id: 'good_end' },
  { type: 'scene', bg: 'ending_good' },
  { type: 'narration', text: '好结局！' },
  { type: 'end' },

  { type: 'label', id: 'bad_end' },
  { type: 'scene', bg: 'ending_bad' },
  { type: 'narration', text: '遗憾结局……' },
  { type: 'end' },
];
```

---

## 6. 引擎 API

### GameEngine 类

```ts
class GameEngine {
  // ===== 公共属性 =====
  renderer: Renderer;         // 渲染器（Canvas 绘制）
  variables: VariableSystem;  // 变量系统
  assets: AssetLoader;        // 资源加载器
  audio: AudioManager | null; // 音频管理器
  saves: SaveSystem;          // 存档系统
  settings: GameSettings;     // 游戏设置

  // ===== 生命周期 =====
  constructor(canvas: HTMLCanvasElement)
  async init(manifest: AssetManifest, script: Record<string, unknown>[]): Promise<void>
  start(): void
  pause(): void
  resume(): void
  dispose(): void

  // ===== 首页 =====
  setTitleScreen(config: TitleScreenConfig): void
  showTitleScreen(): void
  titleAction(action: TitleScreenAction): void
  isOnTitleScreen(): boolean

  // ===== 游戏控制 =====
  advance(): void              // 推进对话 / 执行下一条指令
  selectChoice(index: number): void  // 选择分支选项
  toggleAuto(): boolean        // 切换自动模式
  toggleSkip(): boolean        // 切换快进模式

  // ===== 存档 =====
  getSaveState(label: string): SerializedGameState
  restoreFromSave(state: SerializedGameState): void

  // ===== 数据 =====
  getBacklog(): BacklogEntry[]

  // ===== 回调（由 UIManager 设置） =====
  onDialogUpdate: ((speaker: string, text: string, isNarration: boolean) => void) | null
  onDialogComplete: (() => void) | null
  onChoicesShow: ((choices: ChoiceItem[]) => void) | null
  onChoicesHide: (() => void) | null
  onCommandChange: ((index: number, total: number) => void) | null
  onTitleAction: ((action: TitleScreenAction) => void) | null
  onTitleScreenChange: ((visible: boolean) => void) | null
}
```

### Renderer 类

```ts
class Renderer {
  animPlayer: AnimationPlayer;

  getSize(): { width: number; height: number }
  getContext(): CanvasRenderingContext2D
  setBackground(image: HTMLImageElement | null, transition?: TransitionType): Promise<void>
  renderTitleBackground(image: HTMLImageElement | null): void
  drawCharacter(image: HTMLImageElement, position: string, alpha?: number): void
  getSnapshot(): string        // 获取画布快照（base64）
  update(dt: number): void     // 每帧更新
  render(characters: Map, fontSize: string): void  // 渲染一帧
  dispose(): void
}
```

### AnimationPlayer 类

```ts
class AnimationPlayer {
  register(id: string, def: AnimationDef, images: HTMLImageElement[]): void
  play(id: string, position?: 'left' | 'center' | 'right'): void
  stop(id: string): void
  stopAll(): void
  getAnimations(): Map<string, ActiveAnimation>
  dispose(): void
}
```

---

## 7. UI 系统

### 7.1 UIManager

`UIManager` 负责所有 DOM 层面的 UI 交互，在 `main.ts` 中通过 `new UIManager(engine)` 初始化。

### 7.2 对话框

- 底部渐变遮罩 + 白色文字
- 说话人标签浮于对话框上方
- 打字机文字动画，可调速（设置面板）
- 点击对话框直接显示全部文字，再次点击推进

### 7.3 选项面板

- 居中显示，毛玻璃背景按钮
- 支持条件显示（通过 `condition` 字段）
- hover 缩放 + 光效

### 7.4 顶部控制栏

| 按钮 | 功能 |
|------|------|
| 自动 | 自动逐句播放 |
| 快进 | 跳过对话直接执行 |
| 存档 | 打开存档面板 |
| 读档 | 打开读档面板 |
| 设置 | 打开设置面板 |
| 历史 | 查看对话历史 |

控制栏默认透明，鼠标悬停时显示。

### 7.5 设置面板

| 设置项 | 范围 | 默认值 | 说明 |
|--------|------|--------|------|
| 文字速度 | 1-10 | 5 | 越小越快 |
| 自动播放间隔 | 1-10 | 5 | 自动模式下每句间隔 |
| BGM 音量 | 0-100 | 70 | 背景音乐音量 |
| 音效音量 | 0-100 | 80 | 音效音量 |
| 文字大小 | 小/中/大 | 中 | 对话框字体大小 |

设置自动持久化到 `localStorage`。

### 7.6 存档系统

- 20 个存档槽位
- 每个存档包含：缩略图（Canvas 快照）、场景描述、时间戳
- 存档面板支持"存档"/"读档" Tab 切换
- 空槽位点击存档，已有存档可删除

### 7.7 键盘控制

| 按键 | 功能 |
|------|------|
| Space / Enter | 推进对话 |
| Escape | 打开设置面板 / 关闭面板 |

---

## 8. 首页系统

### 8.1 配置首页

在 `main.ts` 中通过 `engine.setTitleScreen()` 配置：

```ts
engine.setTitleScreen({
  background: 'classroom',             // 背景图 key（可选，不设则用星空背景）
  title: '星之回响',                   // 游戏标题
  subtitle: '— 那个黄昏，我们的故事开始了 —',  // 副标题
  titleColor: '#ffffff',               // 标题颜色
  subtitleColor: 'rgba(220, 210, 240, 0.85)', // 副标题颜色
  titleFontSize: 0,                    // 0=默认（画布高度 9%），可设具体像素值
  showStartButton: true,               // 显示"开始游戏"
  showContinueButton: true,            // 显示"继续游戏"（有存档时自动显示）
  showSettingsButton: true,            // 显示"设置"
  showQuitButton: true,                // 显示"退出"
});
```

### 8.2 首页按钮行为

| 按钮 | 行为 |
|------|------|
| 开始游戏 | 隐藏首页菜单，进入游戏主流程 |
| 继续游戏 | 打开读档面板（仅当有存档时显示） |
| 游戏设置 | 打开设置面板 |
| 退出游戏 | 触发 `onTitleAction('quit')` 回调 |

### 8.3 自定义首页

如果要完全自定义首页，可以不调用 `setTitleScreen()`，引擎将直接进入游戏主流程。此时你可以在 HTML 中添加自定义首页 UI。

---

## 9. 渲染系统

### 9.1 渲染管线

每帧执行顺序：
```
clearRect → 背景图（cover 模式） → 角色立绘 → 序列帧动画 → 转场效果
```

### 9.2 背景渲染

- 使用 **cover 模式**：等比缩放填满画布，裁剪多余部分
- 无背景时使用深色纯色填充（`#1a1a2e`）

### 9.3 角色立绘渲染

- 高度缩放至画布高度的 **75%**
- 水平位置：
  - `left` = 20% 画布宽
  - `center` = 50% 画布宽
  - `right` = 80% 画布宽
- 绘制顺序：left → center → right（Z 轴）

### 9.4 转场效果

```ts
setBackground(image, 'fade')        // 淡入淡出
setBackground(image, 'slide-left')  // 从右向左滑入
setBackground(image, 'slide-right') // 从左向右滑入
setBackground(image, 'none')        // 立即切换
setBackground(image, 'iris')        // 圆形展开（从中心圆扩散揭示新场景）
setBackground(image, 'dissolve')    // 棋盘格逐块揭示（14×8 伪随机顺序）
setBackground(image, 'flash')       // 白色闪过 + 中点切换
```

转场速度为每帧 `dt * 2`，约 0.5 秒完成。`iris` / `dissolve` / `flash` 为升级转场，适合招牌时刻（如天台黄昏）。详见 [15.4 转场升级](#154-转场升级)。

### 9.5 首页背景渲染

- 有背景图时：cover 绘制 + 55% 不透明度的黑色遮罩
- 无背景图时：深色渐变 + 随机星空粒子装饰

---

## 10. 音频系统

### 10.1 架构

- 基于 **Web Audio API**，不依赖 DOM `<audio>` 元素
- `AudioManager` 管理 BGM（背景音乐）和 SE（音效）两个独立通道
- 资源通过 `AssetLoader` 预加载为 `AudioBuffer`

### 10.2 添加音频

```ts
// manifest.ts
audio: {
  bgm_calm: '/audio/bgm_calm.mp3',
  se_click: '/audio/se_click.mp3',
}
```

```json
// 剧本中
{ "type": "bgm", "action": "play", "id": "bgm_calm" }
{ "type": "se", "id": "se_click" }
```

### 10.3 API

```ts
class AudioManager {
  async register(id: string, buffer: AudioBuffer): Promise<void>
  playBgm(id: string): void
  stopBgm(): void
  fadeOutBgm(duration?: number): void  // 默认 1 秒
  playSe(id: string): void
  setBgmVolume(volume: number): void    // 0.0 - 1.0
  setSeVolume(volume: number): void     // 0.0 - 1.0
  resume(): void                        // 恢复 AudioContext
  dispose(): void
}
```

### 10.4 首页 BGM（标题 / 选故事页）

- 引擎在 `showTitleScreen()` 中自动执行 `audio.playBgm('bgm_title')`。
- 约定键位 `bgm_title`：若故事的 manifest.audio 里登记了该 id，则标题屏与选故事页循环播放；
  未登记时 `playBgm` 安全无操作（不报错、不播放）。
- 点"开始游戏"后，剧本第一条 `bgm play` 指令会 `stopBgm()` 切走标题 BGM（无需手动处理）。
- 接入一个故事：在 manifest.audio 登记 `bgm_title: '/audio/bgm_title.wav'` 即可（**文件必须先就位**）。

### 10.5 已知坑：fadeOutBgm 音量残留（已修复，勿回退）

- **症状（旧）**：剧本执行过一次 `fadeout` 后，后续所有 `play` 的 BGM 全部静音。
- **根因（旧）**：`fadeOutBgm` 把 `bgmGain.gain` 淡到 0 后未恢复，`playBgm` 新建 source 也经过
  gain=0 的音量节点 → 等于静音。
- **修复**：`playBgm` / `stopBgm` 启动或停止时 `cancelScheduledValues` + `setValueAtTime(bgmVolume)`
  恢复音量；`fadeOutBgm` 用 `fadeToken` 令牌防止挂起的淡出回调误停期间新播的 BGM。

---

## 11. 存档系统

### 11.1 数据结构

```ts
interface SaveData {
  id: number;                // 槽位号 0-19
  timestamp: number;         // 存档时间戳
  label: string;             // 剧情描述（自动生成）
  thumbnail: string;         // base64 JPEG 缩略图
  gameState: SerializedGameState;
}

interface SerializedGameState {
  currentCommandIndex: number;
  variables: Record<string, number | string | boolean>;
  flags: string[];
  backlog: BacklogEntry[];
  scene: {
    bg: string | null;
    characters: Array<{
      id: string;
      visible: boolean;
      position: string;
      pose: string;
      expression: string;
    }>;
  };
}
```

### 11.2 API

```ts
class SaveSystem {
  save(slot: number, state: SerializedGameState, thumbnail: string, label: string): void
  load(slot: number): SaveData | null
  delete(slot: number): void
  listSlots(): (SaveData | null)[]   // 返回 20 个槽位状态
}
```

### 11.3 存储位置

- 存档：`localStorage` key `avg-save-{slot}`
- 设置：`localStorage` key `avg-engine-settings`

---

## 12. 变量与分支系统

### 12.1 VariableSystem

```ts
class VariableSystem {
  set(name: string, value: number | string | boolean, op?: '=' | '+=' | '-='): void
  get(name: string): number | string | boolean | undefined
  evaluate(condition: string): boolean
  export(): Record<string, number | string | boolean>
  import(variables: Record<string, number | string | boolean>, flags: string[]): void
  exportFlags(): string[]
}
```

### 12.2 条件表达式语法

```
// 比较
affinity >= 5
score < 3
name == 'alice'

// 逻辑
affinity >= 5 && flag_serious
score < 3 || hasItem

// 布尔
flag_serious           // 等同于 flag_serious == true
!flag_serious          // 等同于 flag_serious == false
```

### 12.3 使用场景

```json
// 设置变量
{ "type": "set", "variable": "affinity", "value": 2, "op": "+=" }
{ "type": "set", "variable": "flag_met_bob", "value": true }

// 条件分支
{ "type": "if", "condition": "affinity >= 5", "trueLabel": "good_ending", "falseLabel": "normal_ending" }

// 条件选项显示
{ "text": "和爱丽丝打招呼", "label": "greet_alice", "condition": "affinity >= 3" }
```

---

## 13. 序列帧动画

### 13.1 准备帧图片

将连续帧 PNG 放入 `public/images/anim/`，命名建议带序号：
```
public/images/anim/
├── alice_blink_01.png
├── alice_blink_02.png
├── alice_blink_03.png
└── alice_idle_01.png  ...  alice_idle_08.png
```

### 13.2 注册动画

在 `manifest.ts` 中：

```ts
animations: {
  alice_blink: {
    frames: [
      '/images/anim/alice_blink_01.png',
      '/images/anim/alice_blink_02.png',
      '/images/anim/alice_blink_03.png',
    ],
    frameRate: 4,     // 每秒 4 帧
    loop: true,       // 循环播放
  },
  spark_effect: {
    frames: [
      '/images/anim/spark_01.png',
      // ... spark_08.png
    ],
    frameRate: 12,    // 每秒 12 帧
    loop: false,      // 播放一次后停止
  },
},
```

### 13.3 剧本中播放

```json
{ "type": "anim", "action": "play", "id": "alice_blink", "position": "center" }
{ "type": "anim", "action": "stop", "id": "alice_blink" }
```

### 13.4 动画参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `frames` | string[] | 帧图片路径数组 |
| `frameRate` | number | 每秒帧数，建议 6-12 |
| `loop` | boolean | 是否循环播放 |
| `width` | number | 可选，绘制宽度 |
| `height` | number | 可选，绘制高度 |

- 动画渲染位置与角色立绘相同规则（高度 75% 画布，left/center/right 定位）
- 动画绘制在角色立绘上层
- 循环动画即使暂停也显示第一帧

---

## 14. 进阶定制

### 14.1 自定义 UI 主题

修改 `src/styles/main.css` 中的 CSS 变量（当前未使用 CSS 变量，直接修改颜色值即可）。

关键样式区域：
- 对话框：`#dialog-box`、`#speaker-name`、`#dialog-text`
- 选项按钮：`.choice-btn`
- 顶部栏：`#top-bar button`
- 首页菜单：`.title-menu-btn`

### 14.2 自定义首页背景

```ts
// 使用自定义背景图
engine.setTitleScreen({
  background: 'my_title_bg',   // 在 manifest.ts 中注册
  title: '我的游戏',
  // ...
});

// 不使用背景图（显示星空粒子背景）
engine.setTitleScreen({
  title: '我的游戏',
  // background 不设置
  // ...
});
```

### 14.3 修改角色立绘大小

在 `renderer.ts` 中修改缩放比例：

```ts
// 当前：高度占画布 75%
const maxHeight = this.height * 0.75;

// 修改为 80%
const maxHeight = this.height * 0.80;
```

### 14.4 修改角色位置

在 `renderer.ts` 中修改 `CHAR_POSITIONS`：

```ts
const CHAR_POSITIONS = { left: 0.2, center: 0.5, right: 0.8 };

// 例如让左角色更靠边
const CHAR_POSITIONS = { left: 0.15, center: 0.5, right: 0.85 };
```

### 14.5 扩展特效

`effect` 指令与粒子/调色/转场系统均已**实装**（详见 [第 15 节](#15-特效系统)）。如需新增一种特效类型：

1. 在 `types.ts` 的 `EffectType` / `WeatherType` / `GradeType` / `TransitionType` 中添加新值
2. 在 `renderer.ts` 中实现对应渲染逻辑（`startFlash`/`startDim`/`startShake`/`startZoom` 或 `particles.setWeather`、以及 `renderBackground` 的转场分支）
3. 在 `game-engine.ts` 的 `case 'effect'` 中调用 `this.renderer.startEffect(cmd.effect, cmd.duration)`
4. 若需 `scene` 持久氛围，在 `script-parser.ts` 的 `scene` case 透传新字段

> 调参位置（幅度/密度/速度）见 [15.8 调参位置清单](#158-调参位置清单)。

### 14.6 添加新指令类型

1. 在 `types.ts` 的 `ScriptCommand` 联合类型中添加新类型
2. 在 `script-parser.ts` 的 `parseScript` 中添加解析 case
3. 在 `game-engine.ts` 的 `executeCommand` 中添加执行 case

---

## 15. 特效系统

> 本引擎的特效全部基于 Canvas 2D 实现，**零外部依赖**，纯 TypeScript。所有特效均可由剧本指令驱动，无需改引擎代码即可使用。

### 15.1 特效总览（5 大类）

| 类别 | 触发方式 | 典型用途 |
|------|----------|----------|
| 粒子天气 | `scene.weather` 或 `effect: petal/rain/snow/bokeh` | 樱花飘落、雨、雪、散景光斑 |
| 场景调色 | `scene.grade` | 暖调/冷调/柔调/黄昏，营造情绪 |
| 转场升级 | `scene.transition` | iris 圆形展开、dissolve 棋盘揭示、flash 闪过 |
| 屏幕特效 | `effect: flash/dim/shake/zoom` | 冲击、压暗、震屏、镜头推拉 |
| 立绘动画 | 引擎自动 / `effect: zoom` | 呼吸微动、入场滑入、退场淡出、镜头推拉、背景 Ken Burns |

**文件分布：**
- `src/engine/particles.ts` — 粒子系统（petal/rain/snow/bokeh）
- `src/engine/renderer.ts` — 调色、转场、屏幕特效、立绘动画、背景 Ken Burns
- `src/engine/game-engine.ts` — `scene` 清台+氛围应用、`effect` 指令驱动
- `src/engine/types.ts` — `WeatherType` / `GradeType` / `TransitionType` / `EffectType` 类型定义

### 15.2 粒子天气系统

粒子由 `ParticleSystem` 管理（上限 560 粒子），每帧 `update(dt)` 生成/更新、最上层 `render(ctx)`。

- **触发方式一（持久氛围）**：`scene` 指令的 `weather` 字段，如 `{ "type":"scene", "bg":"park_day", "weather":"petal" }`。换景时引擎自动 `setWeather(cmd.weather ?? 'none')`，未填则恢复默认（清除残留）。
- **触发方式二（一次性强调）**：`effect` 指令，如 `{ "type":"effect", "effect":"rain" }`。在对话中途触发天气，持续至下一次 `scene` 切换才被清除。

| weather 值 | 视觉 | 调色建议搭配 |
|-----------|------|--------------|
| `petal` | 粉色调椭圆花瓣，旋转飘落 + 左右摇摆 | `soft`（公园/街道） |
| `rain` | 蓝色斜雨丝 | `cold`（遗憾/忧郁） |
| `snow` | 白色飘点 | `cold` / `soft` |
| `bokeh` | 暖色径向渐变光斑，缓慢漂移、淡入淡出 | `warm`（黄昏） |

> 剧本建议：用 `scene.weather` 做**贯穿整个场景**的氛围（如公园全程飘樱），用 `effect` 触发的天气做**局部强调**（注意它会被后续 `scene` 清掉）。

### 15.3 场景调色（GradeType）

在背景与角色之上叠一层淡色，营造情绪。由 `scene.grade` 设置，引擎调用 `setGrade` / `renderGrade`。

| grade 值 | 色感 | 适用 |
|----------|------|------|
| `none` | 无 | 默认 |
| `warm` | 暖橙 | 黄昏、温馨、告白 |
| `cold` | 冷蓝 | 忧郁、雨夜、遗憾 |
| `soft` | 柔粉 | 日常、梦境、青春 |
| `dusk` | 黄昏紫 | 傍晚、离别 |

### 15.4 转场升级（TransitionType）

`scene.transition` 现支持 7 种：

| 值 | 视觉 |
|----|------|
| `fade` | 淡入淡出（默认） |
| `slide-left` | 旧场景向右滑出、新场景从右滑入 |
| `slide-right` | 反向 |
| `none` | 立即切换 |
| `iris` | 圆形从中心展开揭示新场景（招牌时刻） |
| `dissolve` | 14×8 棋盘格伪随机逐块揭示 |
| `flash` | 白色闪过 + 中点切换 |

`iris` / `dissolve` / `flash` 适合关键切换（如天台黄昏 `rooftop_sunset` 用 `iris`）。

### 15.5 屏幕特效（EffectType）

由 `effect` 指令触发，引擎 `case 'effect'` → `renderer.startEffect(effect, duration)`。屏幕特效实际时长约 `duration * 0.6`。

| effect | 实现方法 | 说明 |
|--------|----------|------|
| `flash` | `startFlash(dur)` | 白屏 alpha 从 0→峰值→0 |
| `dim` | `startDim(dur)` | 黑屏 alpha 渐入渐出（压暗） |
| `shake` | `startShake(min(1.4, dur*0.6), 9)` | 每帧随机平移（震屏） |
| `zoom` | `startZoom(dur*0.6)` | 整体围绕中心 `scale = 1 + 0.05*sin(p*π)`，0→1→0 轻微推拉 |

> `flash`/`dim`/`shake`/`zoom` 与天气粒子是不同子系统，**可叠加**。例如表白时先 `flash` 再在台词前 `zoom`，或在紧张处 `shake`。

### 15.6 立绘动画与镜头

引擎自动为立绘与背景添加以下动画，无需剧本指令（除 `zoom` 需显式触发）：

- **立绘呼吸**：静止立绘以 `breathPhase`（按角色 id 哈希）做正弦微动，幅度极小（肉眼可见的"活气"）。
- **入场 / 退场**：`char show` 时从 `enterDir` 侧滑入 + 淡入；`char hide` 或 `scene` 清台时滑出 + 淡出（`enterT`/`exitT`/`alpha` 驱动，smoothstep 缓动）。
- **镜头 zoom 推拉**：`effect: zoom` 触发整屏（含背景）轻微推拉，用于强调。
- **背景 Ken Burns**：背景切换后缓慢平移（`kbT` 计时），营造电影感。

### 15.7 给新游戏接入特效的推荐流程

1. **列场景情绪表**：每个 `scene` 该用什么 `grade` / `weather` / `transition`（如"公园 = soft + petal"、"黄昏 = warm + bokeh + iris"、"遗憾 = cold + rain"）。
2. **戏剧点标 effect**：在表白、冲突、悬念处加 `effect: flash/shake/dim/zoom`（参考现有 story3 的 ch11 五个抉择点）。
3. **资源对齐**：粒子/调色/转场不依赖图片资源，直接可用；立绘动画依赖 `public/images/sprite/` 实图。
4. **构建验证**：`npx vite build` 确认无 TS 错误。
5. **目测微调**：按手感改 `particles.ts` 密度或 `renderer.ts` 幅度（见 15.8）。

### 15.8 调参位置清单（供自主微调）

| 想调什么 | 文件:位置 | 改哪 |
|----------|-----------|------|
| 花瓣/雨/雪/光斑 密度、速度、摇摆 | `particles.ts`：`pre`（预填充数）、`rates`（生成率）、`sway`/`vy` | 对应天气参数对象 |
| 调色颜色 | `renderer.ts`：`renderGrade` 的色层 `fillStyle` | 改 rgba 颜色 |
| 转场时长/样式 | `renderer.ts`：`renderBackground` 的 `iris`/`dissolve`/`flash` 分支 | 改揭示块数、速度 |
| 闪白/压暗强度 | `renderer.ts`：`startFlash` / `startDim` | 改 alpha 峰值 |
| 震屏幅度 | `renderer.ts`：`startShake` 第二参数 mag | 改像素幅度 |
| **zoom 推拉幅度** | `renderer.ts`：`render` 内 `1 + 0.05*Math.sin(p*Math.PI)` | 改 `0.05` 峰值系数 |
| 立绘呼吸幅度 | `renderer.ts`：`drawCharacterAuto` 的 breath 计算 | 改微动系数 |
| 入场/退场滑入距离 | `game-engine.ts`：`SLIDE` 常量 + `drawAllCharacters` | 改滑入像素比例 |

> 所有特效参数改动都只需改 `renderer.ts` / `particles.ts`，**不影响剧本与类型**，改完 `vite build` 即可生效。

---

## 16. 结局收集系统（相册 / Gallery）

> 让玩家在通关后查看已解锁的结局，未解锁显示「？？？」。解锁状态按**故事 id 命名空间**持久化到 localStorage，**跨周目累积**。

### 16.1 三步接入一个新故事的结局收集

1. **声明目录**：在 `story.ts` 的 `StoryDef` 上加 `endings` 数组，每项 `{ id, title, desc, thumbnail }`：
   ```ts
   endings: [
     { id: 'lin',  title: '恋之光 · 林晚篇', desc: '…', thumbnail: '/images/bg/street.png' },
     { id: 'trueend', title: '真·结局（TrueEnd）', desc: '…', thumbnail: '/images/bg/park_day.png' },
   ]
   ```
   - `id` 必须唯一，且与剧本里 `unlock` 指令的 `ending` 值一致。
   - `thumbnail` 用该结局的代表背景图路径即可（缩略图即 CG）。
2. **剧本里标记解锁点**：在每条结局分支**一进入就放** `unlock` 指令（用 JSON 剧本即 `{"type":"unlock","ending":"lin"}`）：
   ```json
   { "type": "label", "id": "ch17" },
   { "type": "unlock", "ending": "lin" },
   { "type": "scene", "bg": "street", ... }
   ```
   放在分支最前面，即使玩家中途退出也能记录本次达成的结局。
3. **提供入口**：在结尾处给一个选项 `{ "text": "查看结局收集", "label": "gallery" }`。引擎在 `selectChoice` 中识别 `label === 'gallery'`，自动打开相册面板（不推进剧本，关闭后可继续选「重新开始」）。

> 标题屏也内置「结局收集」按钮（`#btn-title-gallery`），随时可查看当前故事的收集进度。

### 16.2 相关代码位置

| 职责 | 文件:位置 |
|------|-----------|
| 结局类型 `EndingDef`、指令 `unlock` | `src/engine/types.ts` |
| 解锁持久化（命名空间、读写） | `src/engine/save-system.ts`：`unlockEnding` / `getUnlockedEndings` / `isEndingUnlocked` |
| 指令解析 `unlock` | `src/engine/script-parser.ts` |
| 引擎接入：`setStoryId` / `onGalleryOpen` / `getUnlockedEndings` / `isChoicePending` / `case 'unlock'` / gallery 拦截 | `src/engine/game-engine.ts` |
| 相册面板 UI（渲染已/未解锁卡片） | `src/ui/ui-manager.ts`：`showGallery` / `hideGallery` / `renderEndingGallery` / `setStoryEndings` |
| 面板 DOM 与样式 | `index.html`（`#ending-gallery-panel`）、`src/styles/main.css`（`.ending-grid` / `.ending-card`） |
| 装配 | `src/main.ts`：`engine.setStoryId(story.id)` + `uiManager.setStoryEndings(story.endings ?? [])` |

### 16.3 交互细节

- **已解锁卡片**：鼠标悬停上浮 + 高亮，点击弹出**详情浮层**（`#ending-detail-modal`），含：顶部代表背景大图 + 标题、结局简介、如何达成、✓ 已解锁状态。详情通过 `showEndingDetail()` 渲染，关闭按钮在浮层内右上角，点击遮罩也可关闭。
- **未解锁卡片**：显示「？？？」+ 斜纹缩略图，不可点击（无详情）。
- **EndingDef 字段**：`id`（与 `unlock` 指令对应）、`title`、`desc`（简介）、`how`（如何达成，仅详情浮层展示）、`thumbnail`（代表背景图路径，如 `/images/bg/street.png`）。

### 16.4 扩展要点

- **新增结局**：在 `endings` 数组加一项 + 对应分支加 `unlock`，无需改引擎/UI。
- **换故事隔离**：解锁记录按 `story.id` 存储，不同故事的结局互不串扰。
- **占位背景**：若某结局缩略图用的是占位图（`placeholder.ts` 生成的渐变图），显示效果为彩色渐变，不影响功能。

---

## 附录 A：完整指令速查表

| 指令 | JSON 示例 |
|------|-----------|
| scene | `{ "type": "scene", "bg": "classroom", "transition": "iris", "grade": "soft", "weather": "petal" }` |
| char | `{ "type": "char", "action": "show", "id": "alice", "position": "center", "pose": "default" }` |
| dialog | `{ "type": "dialog", "speaker": "爱丽丝", "text": "你好！" }` |
| narration | `{ "type": "narration", "text": "这是一个故事……" }` |
| choice | `{ "type": "choice", "choices": [{ "text": "选项A", "label": "labelA" }] }` |
| jump | `{ "type": "jump", "label": "target_label" }` |
| label | `{ "type": "label", "id": "target_label" }` |
| if | `{ "type": "if", "condition": "x >= 5", "trueLabel": "yes", "falseLabel": "no" }` |
| set | `{ "type": "set", "variable": "score", "value": 10, "op": "+=" }` |
| bgm | `{ "type": "bgm", "action": "play", "id": "bgm_calm" }` |
| se | `{ "type": "se", "id": "se_click" }` |
| wait | `{ "type": "wait", "duration": 2 }` |
| unlock | `{ "type": "unlock", "ending": "lin" }`（标记该结局已解锁，写入结局收集） |
| effect | `{ "type": "effect", "effect": "flash", "duration": 0.5 }`（flash / shake / dim / zoom） |
| effect | `{ "type": "effect", "effect": "shake", "duration": 0.5 }`（还可：flash / dim / zoom / petal / rain / snow / bokeh） |
| anim | `{ "type": "anim", "action": "play", "id": "my_anim", "position": "center" }` |
| end | `{ "type": "end" }` |

---

## 附录 B：配置文件参考

### package.json
```json
{
  "name": "avg-engine",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve"
  },
  "include": ["src"]
}
```

### vite.config.ts
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
```

---

> 手册结束。如有问题，请参考源码注释或项目 README。
