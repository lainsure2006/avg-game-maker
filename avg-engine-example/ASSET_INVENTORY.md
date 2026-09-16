# 游戏资产清单 (Asset Inventory)

> **引擎版本**: AVG Engine v1.0  
> **最后更新**: 2026-07-31  
> **用途**: 统一登记引擎中所有可用的游戏资源，方便查询和复用。

---

## 快速索引

| 类别 | 数量 | 状态 | 跳转 |
|------|------|------|------|
| 背景图 (Backgrounds) | 9 个 | 9 实图（cafe/ending_good/ending_normal 已于 2026-08-25 补全） | [→ 查看](#1-背景图-backgrounds) |
| 角色立绘 (Sprites) | 7 个 | 全部实图 | [→ 查看](#2-角色立绘-sprites) |
| 序列帧动画 (Animations) | 0 个 | 预留 | [→ 查看](#3-序列帧动画-animations) |
| 音频 (Audio) | 0 个 | 预留 | [→ 查看](#4-音频-audio) |
| 剧本变量 (Variables) | 3 个 | — | [→ 查看](#5-剧本变量) |
| 场景标签 (Labels) | 13 个 | — | [→ 查看](#6-剧本场景标签) |

---

## 1. 背景图 (Backgrounds)

**建议规格**: 1280 × 720 px | 格式: PNG

| 注册 Key | 文件路径 | 尺寸 | 状态 | 剧本中使用场景 |
|----------|----------|------|------|----------------|
| `classroom` | `/images/bg/classroom.png` | 1280×720 | ✅ 实图 (1.23 MB) | 开场教室场景 |
| `street` | `/images/bg/street.png` | 1280×720 | ✅ 实图 (1.55 MB) | 街道对话场景 |
| `park_day` | `/images/bg/park_day.png` | 1280×720 | ✅ 实图 (1.79 MB) | 公园白天场景 |
| `park_night` | `/images/bg/park_night.png` | 1280×720 | ✅ 实图 (1.53 MB) | 公园夜晚（留下分支） |
| `river` | `/images/bg/river.png` | 1280×720 | ✅ 实图 (1.63 MB) | 河边烟花大会 |
| `ending_bad` | `/images/bg/ending_bad.png` | 1280×720 | ✅ 实图 (1.28 MB) | 坏结局画面 |
| `cafe` | `/images/bg/cafe.png` | 1280×720 | ✅ 实图 (1.07 MB) | 咖啡馆/奶茶店场景（2026-08-25 补全） |
| `ending_good` | `/images/bg/ending_good.png` | 1280×720 | ✅ 实图 (1.38 MB) | 好结局画面（2026-08-25 补全） |
| `ending_normal` | `/images/bg/ending_normal.png` | 1280×720 | ✅ 实图 (1.42 MB) | 普通结局画面（2026-08-25 补全） |

### 背景图使用示例

```typescript
// 切换场景
{ type: 'scene', bg: 'classroom' }
{ type: 'scene', bg: 'river' }
```

### 占位图说明

全部背景（含 cafe / ending_good / ending_normal）已于 2026-08-25 补全为实图，不再依赖占位。`placeholder.ts` 仍保留兜底：若未来某 PNG 缺失，会自动生成彩色渐变占位图，避免引擎渲染空白/破图。

---

## 2. 角色立绘 (Sprites)

**建议规格**: 400 × 600 px | 格式: PNG（透明背景最佳）  
**站位**: `left` / `center` / `right`

### 爱丽丝 (Alice) — `id: 'alice'`

| Pose Key | 文件路径 | 尺寸 | 状态 |
|----------|----------|------|------|
| `default` | `/images/sprite/alice_default.png` | 400×600 | ✅ 实图 (255 KB) |
| `happy` | `/images/sprite/alice_happy.png` | 400×600 | ✅ 实图 (327 KB) |
| `sad` | `/images/sprite/alice_sad.png` | 400×600 | ✅ 实图 (268 KB) |
| `surprised` | `/images/sprite/alice_surprised.png` | 400×600 | ✅ 实图 (318 KB) |

### 鲍勃 (Bob) — `id: 'bob'`

| Pose Key | 文件路径 | 尺寸 | 状态 |
|----------|----------|------|------|
| `default` | `/images/sprite/bob_default.png` | 400×600 | ✅ 实图 (254 KB) |
| `smile` | `/images/sprite/bob_smile.png` | 400×600 | ✅ 实图 (239 KB) |
| `worry` | `/images/sprite/bob_worry.png` | 400×600 | ✅ 实图 (251 KB) |

### 角色使用示例

```typescript
// 显示角色
{ type: 'char', action: 'show', id: 'alice', position: 'center', pose: 'default' }

// 切换表情（原地更新）
{ type: 'char', action: 'show', id: 'alice', position: 'left', pose: 'happy' }

// 隐藏角色
{ type: 'char', action: 'hide', id: 'alice' }
```

### 表情-场景对照表

| 场景 | Alice 表情 | Bob 表情 |
|------|-----------|----------|
| 开场教室 | `default` → `happy` | — |
| 街道对话 | `default` | — |
| 认真回答后 | `happy` | — |
| 开玩笑后 | `sad` | — |
| 反问后 | `surprised` → `happy` | — |
| 公园初遇 | `default` | `default` |
| 河边烟花 | `happy` | — |
| 夜晚公园 | `surprised` → `happy` | — |
| 所有结局 | 隐藏 | 隐藏 |

---

## 3. 序列帧动画 (Animations)

**目录**: `public/images/anim/`  
**当前状态**: 🚧 目录已预留，暂无动画资源

### 如何添加动画

1. 将连续帧 PNG 放入 `public/images/anim/`
2. 在 `manifest.ts` 的 `animations` 中注册：

```typescript
animations: {
  alice_blink: {
    frames: [
      '/images/anim/alice_blink_01.png',
      '/images/anim/alice_blink_02.png',
      '/images/anim/alice_blink_03.png',
    ],
    frameRate: 4,   // 每秒 4 帧
    loop: true,      // 循环播放
  },
}
```

3. 剧本中使用：

```typescript
{ type: 'anim', action: 'play', id: 'alice_blink' }
```

---

## 4. 音频 (Audio)

**目录**: `public/audio/`  
**当前状态**: 🚧 目录已预留，暂无音频文件

### 规划中的音频槽位

| 类别 | Key 命名规范 | 用途示例 |
|------|-------------|----------|
| BGM | `bgm_*` | `bgm_calm`, `bgm_tense`, `bgm_ending` |
| SE | `se_*` | `se_click`, `se_door`, `se_fireworks` |

### 使用方式（音频文件就绪后）

```typescript
// 播放 BGM
{ type: 'bgm', action: 'play', id: 'bgm_calm' }

// 停止 BGM
{ type: 'bgm', action: 'stop' }

// 淡出 BGM
{ type: 'bgm', action: 'fadeout' }

// 播放音效
{ type: 'se', id: 'se_door' }
```

---

## 5. 剧本变量

当前剧本中使用的游戏变量，影响分支走向。

| 变量名 | 类型 | 默认值 | 用途 |
|--------|------|--------|------|
| `affinity` | number | `0` | 爱丽丝好感度，决定结局走向 |
| `flag_serious` | boolean | `false` | 是否选择了认真回答 |
| `flag_fireworks` | boolean | `false` | 是否去了烟花大会 |

### 好感度阈值

| 结局 | 条件 | 触发路径 |
|------|------|----------|
| 好结局 (Good) | `affinity >= 5` | 认真回答 → 鼓励 → 留下 等 |
| 普通结局 (Normal) | `2 <= affinity < 5` | 中等好感度组合 |
| 坏结局 (Bad) | `affinity < 2` | 开玩笑 → 调侃 → 离开 等 |

---

## 6. 剧本场景标签

| 标签 ID | 说明 | 类型 |
|---------|------|------|
| `start` | 游戏开场入口 | 起始点 |
| `answer_serious` | 分支 A：认真回答梦想 | 分支 |
| `answer_joke` | 分支 B：开玩笑岔开 | 分支 |
| `answer_ask_back` | 分支 C：反问爱丽丝 | 分支 |
| `join_yes` | 愿意加入项目 | 子分支 |
| `join_maybe` | 考虑一下 | 子分支 |
| `after_join` | 加入决定后汇合 | 汇合点 |
| `encourage` | 鼓励爱丽丝的梦想 | 子分支 |
| `tease` | 调侃爱丽丝 | 子分支 |
| `park_scene` | 公园场景入口 | 汇合点 |
| `go_fireworks` | 去烟花大会 | 分支 |
| `stay_park` | 留在公园 | 分支 |
| `ending_check` | 结局判定节点 | 逻辑 |
| `ending_good` | 好结局 | 结局 |
| `ending_normal` | 普通结局 | 结局 |
| `ending_bad` | 坏结局 | 结局 |

---

## 7. 首页 (Title Screen) 配置

当前首页使用以下资源配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `background` | `'classroom'` | 首页背景图 |
| `title` | `'星之回响'` | 游戏标题 |
| `subtitle` | `'— 那个黄昏，我们的故事开始了 —'` | 副标题 |
| `showStartButton` | `true` | 显示"开始游戏" |
| `showContinueButton` | `true` | 显示"继续游戏"（有存档时） |
| `showSettingsButton` | `true` | 显示"游戏设置" |
| `showQuitButton` | `true` | 显示"退出游戏" |

---

## 8. 目录结构总览

```
public/
├── audio/                          (空 — 预留音频目录)
└── images/
    ├── anim/                       (空 — 预留动画帧目录)
    ├── bg/                         (9 个实图，cafe/ending_good/ending_normal 已于 2026-08-25 补全)
    │   ├── classroom.png           ✅ 1.23 MB
    │   ├── street.png              ✅ 1.55 MB
    │   ├── park_day.png            ✅ 1.79 MB
    │   ├── park_night.png          ✅ 1.53 MB
    │   ├── river.png               ✅ 1.63 MB
    │   ├── ending_bad.png          ✅ 1.28 MB
    │   ├── cafe.png                ✅ 1.07 MB
    │   ├── ending_good.png         ✅ 1.38 MB
    │   └── ending_normal.png       ✅ 1.42 MB
    └── sprite/                     (7 个实图)
        ├── alice_default.png       ✅ 255 KB
        ├── alice_happy.png         ✅ 327 KB
        ├── alice_sad.png           ✅ 268 KB
        ├── alice_surprised.png     ✅ 318 KB
        ├── bob_default.png         ✅ 254 KB
        ├── bob_smile.png           ✅ 239 KB
        └── bob_worry.png           ✅ 251 KB
```

---

## 9. 快速查询命令

### 按角色查所有表情

```
查找 Alice: manifest.sprites.alice → default, happy, sad, surprised
查找 Bob:   manifest.sprites.bob   → default, smile, worry
```

### 按场景查所需资源

| 剧本场景 | 背景 | Alice | Bob | 音乐 |
|----------|------|-------|-----|------|
| 教室开场 | `classroom` | `default` → `happy` | — | — |
| 街道对话 | `street` | `default` / `happy` / `sad` / `surprised` | — | — |
| 公园白天 | `park_day` | `default` | `default` | — |
| 河边烟花 | `river` | `happy` | — | — |
| 公园夜晚 | `park_night` | `surprised` → `happy` | — | — |
| 好结局 | `ending_good` | 隐藏 | 隐藏 | — |
| 普通结局 | `ending_normal` | 隐藏 | 隐藏 | — |
| 坏结局 | `ending_bad` | 隐藏 | 隐藏 | — |

### 按资源状态查

| 资源 | 状态 | 说明 |
|------|------|------|
| `cafe.png` | ✅ 已补全实图（2026-08-25） | 1.07 MB，咖啡馆/奶茶店场景 |
| `ending_good.png` | ✅ 已补全实图（2026-08-25） | 1.38 MB，好结局画面 |
| `ending_normal.png` | ✅ 已补全实图（2026-08-25） | 1.42 MB，普通结局画面 |
| 全部音频 | 无 BGM/SE | 不影响核心体验 |

---

> **提示**: 新增资源后，请同步更新本文档和 `manifest.ts` 中的注册信息。
