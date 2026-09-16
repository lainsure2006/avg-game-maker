# Step 6 — Code the Game / 游戏编写（storyN 四件套）

> 本文件为**通用 boilerplate**，不绑定任何题材。适用于《樱色未央》及之后任意新游戏。
> 引擎事实（set op / loadAudio / placeholder 机制等）详见 `references/engine-conventions.md`，本步只做「可复制骨架 + 必改项 + 衔接」。

---

## 0. 定位

| 项 | 内容 |
|---|---|
| 输入 | Step 3 剧本化输出（`script.ts` 可直接抄的指令）+ Step 4 资源总表（→ `manifest.ts` 键位）+ Step 5 核对通过的资源文件 |
| 动作 | 新建 `story<N>` 目录，填 4 件套，把剧本与资源翻译成引擎可运行的故事 |
| 产出 | `src/game/story<N>/` 下 4 文件，构建通过、dev 可玩 |
| 边界 | 只写代码，不出图（出图是 Step 4/G1）；不审剧情（Step 2 已过） |

---

## 1. 四件套是什么（职责总表）

引擎通过 `import.meta.glob('./story[0-9]*/story.ts')` 自动发现故事。**目录名必须 `story<N>`（数字编号）**——glob 刻意限定数字后缀，否则 `story-template/` 也会被匹配（它导出了合法 `StoryDef`「我的故事」，会混进故事选择列表）。

**当前状态（2026-09-04）**：story1/story2 已删除（不成熟），现仅存 story3 ⇒ **下一个新故事是 `story4`**。每个目录标准 4 文件：

| 文件 | 导出/类型 | 职责 | 关键约束 |
|---|---|---|---|
| `story.ts` | `default export StoryDef` | 故事入口：`id`/`title`/`subtitle`(必填)/`description`/`titleScreen`/`getManifest`/`getScript`/`endings` | `getManifest` **必须调用本目录** `placeholder.ts` 的填充函数；函数名复制后须一致 |
| `manifest.ts` | `export const xxxManifest: AssetManifest` | 资源清单：背景/立绘/动画/音频/视频的 key→路径 | **只登记真实存在的文件**；音频缺失 → `loadAudio` 404 → 整游戏崩 |
| `script.ts` | `export const xxxScript: ScriptCommand[]` | 剧本指令数组（JSON 风格） | 长文拆成多条 `dialog`/`narration`，**绝不一条塞整章** |
| `placeholder.ts` | `export function fillXxxPlaceholders(m): AssetManifest` | 缺图兜底：生成渐变占位图 data URL，避免破图 | `MISSING_KEYS`/`PLACEHOLDERS` 在真图就位后**必须清空**，否则渐变图覆盖真图 |

> `placeholder.ts` 是**推荐兜底**：缺图时显示渐变占位图而非空白/破图，且不崩。即使所有图都就位，保留它（空 `MISSING_KEYS`）也无害。

---

## 2. 新建故事步骤

1. 在 `src/game/` 下建目录 `story<N>`（N 取当前最大值+1）。
2. 复制下方 §3 四份骨架到该目录。
3. 全局替换占位符：
   - `<Game>` → 游戏英文名/拼音（如 `yingse`），用于函数/常量命名（**保持全小写无空格**）。
   - `<游戏标题>` / `<副标题>` / `<简介>` → 实际文案。
   - `<角色id>` / `<pose>` / `<bg键>` / `<audio键>` → 与 Step 4 总表、剧本引用**逐字符一致**。
4. 按 Step 3 剧本化逐镜翻译进 `script.ts`。
5. 按 Step 4 总表登记进 `manifest.ts`（音频仅在文件就位时登记）。
6. 构建验证（`§7`）。

---

## 3. 四文件完整 boilerplate（可直接复制）

### 3.1 `story.ts`

```ts
/**
 * <游戏标题> story<N> - 统一入口
 */
import type { StoryDef } from '../index';
import { <game>Manifest } from './manifest';
import { <game>Script } from './script';
import { fill<Game>Placeholders } from './placeholder';   // ← 函数名必须与 placeholder.ts 一致

const story: StoryDef = {
  id: '<game>',                       // 唯一 id，小写无空格
  title: '<游戏标题>',
  subtitle: '<副标题>',              // ← 必填（StoryDef.subtitle 非可选）
  description: '<一句话简介>',
  titleScreen: {
    background: '<首页背景键>',       // 对应 manifest.backgrounds 的键
    title: '<游戏标题>',
    subtitle: '<副标题>',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(220,210,240,0.85)',
    titleFontSize: 0,                // 0 = 用引擎默认字号
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fill<Game>Placeholders(<game>Manifest),  // ← 必须包一层 placeholder
  getScript: () => <game>Script,
  // 结局收集目录（与 script.ts 里 unlock 指令的 ending 值一一对应；不需要结局收集可删此字段）
  endings: [
    {
      id: 'end_a',
      title: '结局A',
      desc: '结局A简介',
      how: '如何达成（玩家点卡片看的方向指引）',
      thumbnail: '/images/bg/<代表背景>.png',
    },
    // …更多结局
  ],
};

export default story;
```

### 3.2 `manifest.ts`

```ts
/**
 * <游戏标题> story<N> - 资源清单
 * 只登记真实存在的文件！音频缺失 → loadAudio 404 → 整游戏崩。
 */
import type { AssetManifest } from '../../engine/types';

export const <game>Manifest: AssetManifest = {
  backgrounds: {
    classroom: '/images/bg/classroom.png',
    // …与 Step 4 总表 A 类一一对应
  },

  sprites: {
    // 键 = 角色id；每个角色下键 = pose（与 script.ts 里 char.pose 逐字符一致）
    <char_id>: {
      default: '/images/sprite/<char_id>_default.png',
      happy:   '/images/sprite/<char_id>_happy.png',
      // …pose 即文件，每个不同表情/动作 = 独立文件
    },
  },
  // 💡 多故事共存时，把素材放进**按故事命名的子目录**并写全路径
  //    （如 '/images/sprite/fogport/luzhao_default.png'）——根治不同故事同名文件互相覆盖。
  //    bg 同理：'/images/bg/fogport/cafe_night_left.png'。
  //    路径完全由 manifest 决定，引擎不做拼接（见 §3.3 的取图逻辑），所以子目录零成本。

  animations: {
    // 序列帧动态表情：id → 帧数组（见 Step 3 动态表情方案）
    // blink: { frames: ['/images/anim/blink_001.png', …], frameRate: 8, loop: true },
  },

  audio: {
    // BGM（首页曲 bgm_title 由引擎自动播放，必须存在）
    bgm_title:   '/audio/bgm_title.wav',
    bgm_morning: '/audio/bgm_morning.wav',
    // SE
    se_wind:     '/audio/se_wind.wav',
    // 规划了但用户未供的音频：删掉这一行，绝不登记（否则崩）
  },

  // videos?: { op_opening: '/videos/op_opening.webm' },  // 有视频过场才加
  // items?: {  // 有「弹出物件放大图」才加（证物/信件/照片，无需专门背景）
  //   letter_07: { src: '/images/items/letter_07.png', caption: '匿名信·第七封' },
  //   report_p18: { src: '/images/items/report_p18.png' },
  // },
};
```

### 3.3 `script.ts`

```ts
/**
 * <游戏标题> story<N> 脚本 — ScriptCommand[] 指令数组
 * 由 Step 3 剧本化逐镜翻译；长文拆多条，绝不一条塞整章。
 */
import type { ScriptCommand } from '../../engine/types';

export const <game>Script: ScriptCommand[] = [
  // —— 初始化：先隐藏所有角色，避免残留 ——
  { type: 'label', id: 'title' },
  { type: 'char', action: 'hide', id: '<char_id>' },
  { type: 'label', id: 'ch01' },

  // —— 场景 + 转场 + 调色 ——
  { type: 'scene', bg: 'classroom', transition: 'fade', grade: 'soft' },
  { type: 'bgm', action: 'play', id: 'bgm_morning' },

  // —— 旁白 / 对话 ——
  { type: 'narration', text: '你站在校门前，背包带勒着肩膀。' },
  { type: 'char', action: 'show', id: '<char_id>', position: 'right', pose: 'default' },
  { type: 'dialog', speaker: '<角色名>', text: '喂——新来的？' },
  { type: 'se', id: 'se_wind' },

  // —— 换表情 / 移动（pose 即文件，expression 字段不参与换图）——
  { type: 'char', action: 'move', id: '<char_id>', position: 'left', pose: 'happy' },

  // —— 变量 + 分支（set 仅 = += -=，没有 add）——
  { type: 'set', variable: 'aff_linwan', value: 1, op: '+=' },
  { type: 'choice', choices: [
    { text: '回应林晚', label: 'go_linwan' },
    { text: '不回应',   label: 'go_alone' },
  ]},
  { type: 'label', id: 'go_linwan' },
  { type: 'set', variable: 'aff_linwan', value: 2, op: '+=' },
  { type: 'jump', label: 'merge' },
  { type: 'label', id: 'go_alone' },
  { type: 'jump', label: 'merge' },
  { type: 'label', id: 'merge' },

  // —— 条件跳转（按好感阈值控制结局走向）——
  { type: 'if', condition: 'aff_linwan >= 3', trueLabel: 'end_linwan', falseLabel: 'end_normal' },
  { type: 'label', id: 'end_linwan' },
  { type: 'unlock', ending: 'lin' },          // 解锁结局收集（与 story.ts endings[].id 对应）
  { type: 'label', id: 'end_normal' },
  { type: 'unlock', ending: 'regret' },

  // —— 特效 / 视频过场 / 物件弹出 ——
  { type: 'effect', effect: 'flash', duration: 0.4 },
  { type: 'video', id: 'op_opening' },        // 全屏过场，缺失自动跳过（不崩）
  { type: 'item', id: 'letter_07' },          // 弹出「匿名信·第七封」放大图，点击关闭；404 显示占位仍可关

  { type: 'end' },
];
```

### 3.4 `placeholder.ts`

```ts
/**
 * <游戏标题> story<N> - 缺失图片占位图生成器
 * 缺图时显示渐变占位图而非空白/破图。真图就位后须清空 MISSING_KEYS / PLACEHOLDERS。
 */
import type { AssetManifest } from '../../engine/types';

const createPlaceholder = (text: string, color: string, w: number, h: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)})`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `${Math.min(w,h)*0.07}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w/2, h/2);
  return canvas.toDataURL('image/png');
};

/** 明确不存在的背景键（manifest 注册了但文件缺失）→ 用占位图覆盖 */
const MISSING_KEYS = new Set<string>();   // ← 真图就位后清空此集合
const PLACEHOLDERS: Record<string, string> = {};

export function fill<Game>Placeholders(manifest: AssetManifest): AssetManifest {
  const result: AssetManifest = {
    backgrounds: {},
    sprites: {},
    animations: { ...manifest.animations },
    audio: { ...manifest.audio },
    ...(manifest.videos ? { videos: { ...manifest.videos } } : {}),
    ...(manifest.items ? { items: { ...manifest.items } } : {}),
  };
  for (const [key, url] of Object.entries(manifest.backgrounds)) {
    result.backgrounds[key] = MISSING_KEYS.has(key) ? (PLACEHOLDERS[key] || url) : url;
  }
  for (const [charId, poses] of Object.entries(manifest.sprites)) {
    result.sprites[charId] = { ...poses };
  }
  return result;
}
```

---

## 4. 必改项清单（复制骨架后逐条核对）

- [ ] 目录名 `story<N>`（N 正确，不与已有冲突）。
- [ ] `<Game>` / `<game>` 命名全局一致：`story.ts` 的 import、`manifest.ts` 常量名、`script.ts` 常量名、`placeholder.ts` 函数名 **四处必须一致**。
- [ ] `story.ts` 的 `getManifest` 调用的是**本目录** `placeholder.ts` 导出的函数（复制后最易错：用了模板默认的 `fillPlaceholders` 导致构建报错）。
- [ ] `subtitle` 已填（StoryDef 必填，漏了 TS 报错）。
- [ ] `manifest` 资源键 ↔ `script.ts` 引用 ↔ Step 4 总表 **三处一致**（含大小写、下划线）。
- [ ] 音频键只在文件就位时登记（缺一个 = 崩）。
- [ ] `endings[].id` ↔ `script.ts` 的 `unlock` 值 **一致**（否则解锁不进相册）。

---

## 5. 与上游衔接

- **`script.ts` ← Step 3 剧本化**：每镜的 scene/char/dialog/bgm/se/effect/anim 直接翻译成指令；分支用 `choice`+`label`+`jump`，结局门控用 `if`+`unlock`。
- **`manifest.ts` ← Step 4 资源总表**：A 背景 / B 立绘 / C 动画 / E BGM / F SE / G 视频 / H 物件 的 key→路径逐类登记；命名遵循 Step 4 §5（`bg_` / `{char}_{pose}` / `anim_` / `bgm_` / `se_` / `video_` / `item_`，变现类用 `ad_`/`shop_`/`dlc_` 前缀）。
- **核对 ← Step 5**：Step 5 的"四连对齐"验证的就是本步填的 manifest 键与 script 引用是否一致；Step 5 不过不进本步最终构建。

---

## 6. 编写期必读约束（踩坑红线，详见 engine-conventions.md）

1. **`set` 的 `op` 仅 `'=' | '+=' | '-='`，没有 `'add'`**——写 `op:'add'` 会被静默当 `'='`，好感不累加（story2 真实 bug）。
2. **`loadAudio` 404 = `throw` 整游戏崩**——manifest 里任何没文件的音频键都删掉。
3. **`placeholder.ts` 的 `MISSING_KEYS` 覆盖真图**——真 PNG 就位后必须清空该键，否则渐变图盖住真图。
4. **`getManifest` 函数名必须匹配**——复制模板忘改名 → 构建失败。
5. **剧本 = JSON 指令数组，长文拆分**——5 万字正文拆成多条 `dialog`/`narration`，一条塞整章会破坏节奏与存档。
6. **立绘换图只看 `pose`**——`expression` 指令字段不参与换图（**空壳**：`types.ts` 有定义、parser 会解析、引擎会存进 state，但**渲染完全不读**）；不同脸 = 不同 `poseKey` + 独立文件。
7. **视频缺失自动跳过**（不崩），但过场没播——确认是"故意空"还是"漏了"。
8. **换表情的正确写法是 `move` + `pose`，不是再 `show` 一次**：
   ```json
   { "type":"char", "action":"move", "id":"luzhao", "pose":"cold" }
   ```
   `show` 会把 `entering` 置 true → **重放入场动画（滑入），画面会闪**；`move` 不触 `entering` → 原地换图。
   🔴 **2026-09-16 修复的引擎缺陷**：`game-engine.ts` 的 `case 'move'` 原为
   `if (c && cmd.position) c.position = cmd.position;` —— **只改位置，`cmd.pose` 被静默丢弃**，
   导致本写法（以及 `AI_GUIDE.md:206/210` 的示例）**从未生效**，且不报错。
   已补 `if (cmd.pose) c.pose = cmd.pose;`（`vite build` 验证通过）。若换引擎版本必须复查此分支。
9. **`hide` 之前必须有 `show`**——写 `hide` 而整章没有 `show`，角色根本不会出现，**且不报错**
   （真实案例：雾港 `ch09a` 整章只有 `hide`，陆昭 3 句台词全对着空气说）。
   用 §9 的体检脚本扫，不要靠肉眼。

---

## 7. 构建验证

```bash
cd <avg-engine>
npm.cmd run dev      # Vite，默认 http://localhost:3000
# 打开页面：看控制台有无 `音频加载失败` throw；走主线+分支检查有无空白破图
npm.cmd run build    # 生产构建，Exit 0 即通过（注意 sandbox 下 build.emptyOutDir:false）
```

> **sandbox 里 `npm.cmd` 可能不在 PATH** → 直接用托管 Node 调 vite：
> `"<user-home>/.workbuddy/binaries/node/versions/<ver>/node.exe" node_modules/vite/bin/vite.js build`
> 验证修复是否真进产物：`ls -t dist/assets/*.js | head -1` 只查**最新**那个文件
> （`build.emptyOutDir:false` 会让 dist 堆积历史产物，grep 整个 dist 会得到假阳性）。

---

## 9. 剧本静态体检（写完后必跑，成本几乎为零）

把下面两个脚本放到素材目录（`<project>/story-wip/素材/`），**每次改完剧本跑一遍**——
它们抓的都是「不报错、不崩、但演出是错的」那类问题，肉眼审 20 份 md 抓不到。

| 脚本 | 抓什么 |
|---|---|
| `audit_script_health.py` | ① `HIDE-NO-SHOW`：`hide` 了本章从未 `show` 的角色（**角色不会出现**）② `SHOW-TWICE`：同章重复 `show` 且中间无 `hide`（**重放入场动画会闪**）③ `缺登场`：本章有该角色台词却无 `show`（最强证据）④ 打印每章 char 指令序列 |
| `audit_sprite_usage.py` | 剧本实际用到的 (id, pose) ↔ 已落位 sprite 文件**对账**：输出「缺失（要用但没图）」与「冗余（有图但没接线）」 |
| `audit_story4_flow.py` | **静态通关**：括号配对解出全部指令 → 枚举 choice/if 双支跑一遍控制流，报「label 是否闭合 / 三结局是否都可达 / 每个 `end` 处立绘是否清空 / 有无死代码」。**大分支剧本的最终验收闸门。** |

⚠️ **审计必须建模引擎的「换景即清台」语义**（`game-engine.ts` 的 `case 'scene'` 会把所有立绘
`visible = false`）—— 否则会把「ch11 结尾挂着的陆昭 → ch12 开场 scene 自动清掉」误报成
「结局残留立绘」（首版实测误报 2 处）。**先校检测器，再改剧本。**

**为什么必须跑**：实测雾港 20 份剧本化里，`char` 用到的 (id,pose) **只有 10 种、全是 `default`** ——
即 11 张表情差分虽然出图+落位了，**剧本层一处都没接线**，不接就等于白做（观众仍看到"全程一张脸"）。
体检脚本会把这个事实直接摆出来。

⚠️ **审计脚本自身的假阳性要先自查再动手改文件**：首版 `SHOW-TWICE` 误报了
`ch04`（实际 `L49 hide` → `L53 show`，写法正确），原因是状态机用 `cid in state` 判"在台上"，
而 `hide` 后键仍留在字典里 → 应改 `state.get(cid) is True`。**先校检测器，再改剧本。**

---

## 8. 衔接

- 本步通过（构建 Exit 0 + dev 可玩 + Step 5 已核对资源）→ 进 **Step 7 游戏测试**（逐结局走查演出效果，按反馈微调）。
- 测试中发现剧本/资源问题 → 回本步改 `script.ts`/`manifest.ts`，或回 Step 4/5 补资源。

---

## 10. 大剧本必用：从 `*_剧本化.md` 自动生成 `script.ts`（生成器范式）

> **触发条件**：剧本化 ≥ 10 章，或**有多分支 / 有 CG 补镜表 / 有 pose 接线表**。
> 此时手抄必漏（雾港：20 章 455 条指令 + 15 处 pose 补写 + 7 处 CG 插入 + 1 处 item 补漏），
> 且手抄不可复算 —— 改一处提示词就得重抄一遍。**改为脚本生成，可重跑、可审计。**

参考实现：`scripts/build_story4.py`（~500 行，含校验闸门，失败即不写盘）。

### 10.1 生成器做四件事（顺序不可换）

| # | 步骤 | 要点 |
|---|---|---|
| 1 | **抽取** | 每份 `*_剧本化.md` 只有一个 ```ts 块 → 正则取出；先清掉注释里的 markdown `**`（会污染 TS 源码），非注释行出现 `**` 则直接报错 |
| 2 | **pose 接线** | 解析 `10_剧本pose接线表.md` 的 `(章, 镜) → {id: pose}`；走一遍指令流维护 `on_stage`：`show/move` 的 pose 直接改写；**人在台上但目标 pose 不同 → 补一条 `char move`**（这是"换表情"的唯一正确写法）；`hide` 出栈 |
| 3 | **补镜（表驱动）** | `CG_JOBS` / `ITEM_JOBS` 两张表，每条声明 `{章, 镜, CG键, 模式, 锚点, 回场目标}`。`insert` = 在锚点行前插入「全员 `hide` + `scene cg_0X`」；`swap` = 把本镜已有 `scene` 的 `bg` 改写成 CG 键（CG 就是这一镜的画面本身） |
| 4 | **校验** | bg / char id / (id,pose) 落位 / item 有图 / ending 已登记 / **label 闭合** / `set.op` 合法 / **分镜「类型」列 × 剧本化对账**（标了 CG 或 item 却找不到 → 报错）。**任一硬错误 → 不写文件** |

### 10.2 拓扑顺序（分支剧本的拼接顺序）

```
ch01…ch06（共通）→ ch07a→ch08a→ch09a ｜ ch07b→ch08b→ch09b ｜ ch07c→ch08c→ch09c → ch10（汇聚）→ ch11（抉择）→ ch12-1/2/3（结局）
```
每条支线末尾 `jump ch10`，三条支线**并排放在 ch10 之前**即可——顺序落空不可达，
但要保证 `ch10` 有自己的 `label`（靠 `jump` 进入，不靠顺序落到）。

### 10.3 🔴 三个真踩到的坑（务必抄走）

1. **插入的指令行必须带行尾逗号**。它们是 JS 数组字面量的元素：
   `{ "type": "char", "action": "hide", "id": "x" }` ← 漏逗号 → **直接 SyntaxError，整个包构建失败**。
   ⇒ 生成器里所有 emit 函数（`hide_all()` / `scene_line()` / `show_line()` / `move` 行 / `item` 行）
   **统一把 `,` 拼在函数内部**，别靠调用处记得加。
2. **别用 `%` 格式化拼时间戳**。`"...生成时间：%s" % dt.strftime("%%Y-%%m-%%d")` 会输出**字面 `%Y-%m-%d`**
   （`strftime` 的 `%%` 转义 + `%` 格式化的双重转义叠加）。⇒ 用 `__GEN__` 占位符再 `.replace()`。
3. **剧本化往往比分镜粗**，镜号注释有缺口 —— pose 接线与 CG 补镜都靠镜号锚定，缺了就找不到落点。
   实测 7 章共 8 处缺口（`ch02 S04`／`ch03 S08`／`ch05 S05`／`ch08a S02,S03`／`ch10 S03`／`ch11 S07`／`ch12-1 S02,S04`）。
   **其中 `ch05 S05` 是功能性的**：不补则 `jiangyan_tense` 永远接不上（注释只到 `S03–S04`）。
   ⇒ Step 6 第一步先跑「分镜镜号 × 剧本化注释」对账，把缺的 `// Sxx` 补进剧本化（**改剧本化，不改分镜**）。

### 10.4 背景键：`<scene>_<view>` + 裸键别名

多机位裁窗产物命名 `<scene>_left/_center/_right`，而剧本 `scene` 指令写的是裸键（`office_night`）。
**不要改剧本**，在 `manifest.backgrounds` 里给每个场景补一条**裸键别名 → `_center`**：
剧本零改动，42 张多机位图仍全部可用（将来要换机位只改剧本那一行）。

### 10.5 收尾自检（生成后按序跑）

```bash
python build_story4.py --dry          # 干跑：看 pose 改写/补 move/CG 插入/对账，硬错误不写盘
python build_story4.py                # 通过则写四件套
python audit_story4_flow.py           # 静态通关：label 闭合 + 三结局可达 + 立绘平衡 + 死代码
node node_modules/vite/bin/vite.js build
ls -t dist/assets/*.js | head -1      # 只查最新产物再 grep（dist 会堆积历史包）
```

