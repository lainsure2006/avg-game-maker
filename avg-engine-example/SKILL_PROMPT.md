# CodeBuddy Skill 提示词

> 将此提示词复制到 CodeBuddy，创建一个 Skill，即可让 AI 帮你写 AVG 游戏故事。

---

## 创建 Skill 的提示词

请直接复制以下内容，在 CodeBuddy 中发送：

---

```
请帮我创建一个 Skill，命名为「avg-story-writer」。

这个 Skill 的功能是：为一个名为 avg-engine 的网页 AVG（文字冒险游戏）引擎编写新故事。

## 引擎说明

avg-engine 是一个基于 Vite + TypeScript + Canvas 的轻量级 AVG 游戏引擎。项目结构如下：

- `src/game/` — 故事目录，引擎通过 `import.meta.glob` 自动发现所有 `story<N>/story.ts`
- `src/game/story-template/` — 故事模板，包含 4 个文件，是写新故事的起点
- `ASSETS.md` — 可用资源清单（背景图、角色立绘）
- `AI_GUIDE.md` — AI 写剧本的完整指令参考
- `public/images/bg/` — 背景图目录
- `public/images/sprite/` — 角色立绘目录

引擎构建命令：`cd avg-engine && npx vite build`
预览命令：`npx vite preview --host 0.0.0.0 --port 3000`

## Skill 的工作流程

当用户要求写一个新故事时，按以下步骤执行：

### 步骤 1：了解需求
- 询问用户想要什么类型的故事（题材、风格、篇幅等）
- 如果用户没有特别说明，就创作一个适合现有资源的短篇故事

### 步骤 2：阅读现有资源
- **必须** 先阅读 `ASSETS.md` 了解当前有哪些可用的背景图和角色立绘
- **必须** 阅读 `AI_GUIDE.md` 了解所有指令的精确格式
- **必须** 阅读 `DEV_MANUAL.md` 第 15 节「特效系统」，掌握可用特效（粒子天气 / 场景调色 / 转场升级 / 屏幕特效 / 立绘动画）及剧本用法
- **建议** 阅读 `DEV_MANUAL.md` 第 16 节「结局收集系统」，若故事含多结局，按该节接入 `endings` 目录 + 剧本 `unlock` 指令 + 结尾 `gallery` 选项，给玩家结局收集相册
- 参考 `story-template/` 下的 4 个文件了解代码结构

### 步骤 3：编写故事
- 确定故事编号：查看 `src/game/` 下已有的 `story<N>` 目录，使用下一个编号
- 复制 `story-template/` 到 `src/game/story<N>/`（如 story3、story4）
- 编写 4 个文件：

#### story.ts — 故事元信息
```typescript
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';
import { fillPlaceholders } from './placeholder';

const story: StoryDef = {
  id: 'story-id',           // 英文短横线，唯一
  title: '故事标题',
  subtitle: '— 副标题 —',
  description: '故事简介',
  titleScreen: {
    background: 'classroom',  // 从 ASSETS.md 选一个已有的背景
    title: '故事标题',
    subtitle: '— 副标题 —',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(200, 200, 220, 0.85)',
    titleFontSize: 0,
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillPlaceholders(manifest),
  getScript: () => script,
};

export default story;
```

#### manifest.ts — 资源清单
- 只声明故事实际用到的背景和角色
- 优先复用 ASSETS.md 中列出的已有资源
- 如果故事需要新图片，声明路径并在后续步骤生成

```typescript
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    classroom: '/images/bg/classroom.png',
    // 按需添加
  },
  sprites: {
    alice: {
      default: '/images/sprite/alice_default.png',
      // 按需添加需要的 pose
    },
  },
  animations: {},
  audio: {},
  // 可选：全屏视频过场（按需，详见 AI_GUIDE.md 的 video 指令）
  // videos: { op_cinematic: '/videos/op.mp4' },
  // 可选：物件弹出放大图（证物/信件/照片，详见 AI_GUIDE.md 的 item 指令）
  // items: { letter_01: { src:'/images/items/letter_01.png', caption:'匿名信·第一封' } },
};
```

#### script.ts — 剧本
- 这是核心文件，包含指令序列
- **指令格式参考 AI_GUIDE.md**，关键指令：
  - `scene` — 切换背景（bg 用 ASSETS.md 中的 key）；可选 `transition`（fade/slide-left/slide-right/none/iris/dissolve/flash）、`grade`（none/warm/cold/soft/dusk 场景调色）、`weather`（none/petal/rain/snow/bokeh 天气粒子）
  - `char` — 控制角色（action: show/hide/move，position: left/center/right，pose 从 ASSETS.md 查）
  - `dialog` — 角色对话
  - `narration` — 旁白
  - `choice` — 选项分支（每个 choice 的 label 必须有对应的 label 指令）
  - `label` / `jump` — 跳转控制
  - `set` / `if` — 变量和条件判断
  - `wait` — 暂停
  - `effect` — 特效（`effect` 取值：shake/flash/dim/zoom 屏幕特效，或 petal/rain/snow/bokeh 天气粒子；可加 `duration`）；用于表白/冲突/悬念等戏剧点强化演出（详解见 DEV_MANUAL.md 第 15 节）
  - `video` — 全屏视频过场（`manifest.videos[key]`，点击跳过，404/被拦截自动跳过不崩溃，可被快进模式跳过）；用于片头/章节过场动画或回忆/过场演出
  - `item` — 物件弹出放大图（`manifest.items[key] = {src, caption?}`，点击关闭，404 显示占位仍可用，不会被快进模式跳过）；用于证物/信件/照片等关键物件（本作纯剧情，不接变现）
  - `end` — 结束

#### placeholder.ts — 占位图
- 如果所有图片都是已有资源，保持模板原样即可
- 如果有新增图片但尚未生成，在 MISSING_KEYS 和 PLACEHOLDERS 中声明

### 步骤 4：如果需要新图片
- 使用 `ASSETS.md` 中的提示词模板，为用户生成图片
- 背景图：1280×720，动漫风格
- 角色立绘：PNG 透明背景
- 生成后放入 `public/images/` 对应目录

### 步骤 5：构建验证
- 执行 `npx vite build` 确认无编译错误
- 如果有 TypeScript 错误，修正后重新构建

### 步骤 6：提示用户
- 告诉用户执行 `npx vite preview --host 0.0.0.0 --port 3000` 预览
- 或直接帮用户启动预览服务

## 重要规则

1. **必须先读 ASSETS.md**，不要引用不存在的资源
2. **背景图 key 必须精确匹配** ASSETS.md 中的名称（classroom / street / park_day / park_night / river / ending_bad）
3. **角色 pose 必须精确匹配**（alice: default/happy/sad/surprised，bob: default/smile/worry）
4. **每个 choice 的 label 必须在后续有对应的 `{ type:'label', id:'...' }`**
5. **`set` 指令的 op 参数**：`'+='` 表示加，`'-='` 表示减，省略表示直接赋值
6. **目录必须叫 `story<N>`**（story3, story4...），引擎才能自动发现
7. **不要修改 `src/game/index.ts`**，引擎会自动发现新目录
8. **故事要短小精悍**，适合 AVG 引擎的节奏，避免过长
9. **充分利用分支和变量**，让故事有重玩价值
10. **善用特效营造氛围**：每个场景按情绪选 `grade` / `weather` / `transition`（如公园 = soft + petal、黄昏 = warm + bokeh + iris、遗憾 = cold + rain）；在表白/冲突/悬念处加 `effect`（flash/shake/dim/zoom）强化演出。特效为引擎标准能力，无需额外资源即可使用

## 现有资源速查

背景图（6张）：classroom（教室）、street（街道）、park_day（公园白天）、park_night（公园夜晚）、river（河边夕阳）、ending_bad（暗色调结局）

角色（2个）：
- 爱丽丝 alice：default（平静）、happy（开心）、sad（伤心）、surprised（惊讶）
- 鲍勃 bob：default（平静）、smile（微笑）、worry（担忧）

完整清单见 ASSETS.md。
```

---

## 使用方式

1. 将 avg-engine 文件夹导出给用户
2. 让用户在 CodeBuddy 中发送以上提示词
3. CodeBuddy 会创建一个 Skill
4. 之后用户只需说「写一个新故事」，Skill 就会自动按流程执行

---

## 提示词设计说明

| 设计要点 | 说明 |
|----------|------|
| **先读资源再写** | 强制 AI 先读 ASSETS.md，避免引用不存在的资源 |
| **精确的格式约束** | 每个指令格式都有明确示例，减少语法错误 |
| **步骤化工作流** | 6 步流程，AI 不会遗漏任何环节 |
| **资源速查表** | 内嵌在提示词中，即使不读 ASSETS.md 也能快速判断 |
| **构建验证** | 写完后自动构建，发现错误立即修正 |
| **限制篇幅** | 要求短小精悍，避免 AI 写出 500 行剧本导致超时 |
