# 脱敏小范例 — 一条最小切片贯穿 Step 1→3→4

> ## ⚠️ 本文档性质：仅示意（illustration only），**不是模板，不要照抄**
>
> - 目的：把抽象的 Step 1/3/4 字段表**具象化**，让你看清"填完之后长什么样"。
> - 已脱敏：剥离真实项目路径、真实日期、工具/平台细节；人物与校名均为虚构。
> - **题材只是这一例的题材**。你的游戏可以是纯情、恐怖、悬疑、治愈、奇幻或任何自定义题材——
>   步骤与字段不变，变的只是填进去的内容。
> - 客户可直接跳过本文档；它不影响任何门槛判定。

---

## 0. 范例设定（虚构，仅用于演示字段怎么填）

| 项 | 范例取值 |
|---|---|
| 题材 | 校园青春 |
| 美术风格 | 日系清新动画风 |
| 情感基调 | 温暖带淡淡遗憾 |
| 主角模式 | 原创无名主角（玩家代入） |
| 主角身份 | 转学生（从陌生到融入 = 主线锚点） |
| 可攻略/关键角色 | A：邻座活泼运动型 · B：图书馆安静文学少女 · C：死党吐槽担当（友情线核心） |
| 季节 | 春（樱花） |
| 结局数 | 4（恋之光 / 挚友 / 遗憾 / 隐藏 TrueEnd） |
| 分支机制 | 对 A、B 分别累积好感度；关键抉择决定走向 |

---

## 1. Step 1 落地示意（设计骨架，节选）

| 字段 | 填写示意 |
|---|---|
| 变量机制 | `aff_a`（对 A 好感）、`aff_b`（对 B 好感），初值 0 |
| 分支结构 | 3 条主分支（A 线 / B 线 / 友情线），中段汇聚后再分化 |
| 结局门控 | `aff_a>=X` 且未触发遗憾 → 恋之光(A)；`aff_a`与`aff_b`双高 → TrueEnd；均低 → 遗憾 |
| 章节结构 | 若干章节，覆盖"入学→日常→冲突→抉择→收束" |

**产出**：干净稿 + 上表。客户确认后锁定，进 Step 2 审核（27 项标准见 step2）。

---

## 2. Step 3a 落地示意（分镜表，节选 3 镜）

> 分镜独立于引擎指令，是**先定的视觉决策层**。

| Shot# | 场景 | 景别 | 机位/角度 | 构图 | 镜头运动 | 转场 | 演出意图 |
|---|---|---|---|---|---|---|---|
| S012 | 教室·午后 | 中景 | 正面平视 | A 在左、主角在右 | 固定 | dissolve | 日常闲聊，建立亲近 |
| S013 | 教室·午后 | 近景 | 正面 | A 单人居中 | zoom 缓推 | — | 关键台词，情绪加重 |
| S014 | 走廊·黄昏 | 全景 | 侧机位 | 主角背影 + B 侧身 | KenBurns 缓推 | iris | 转场到 B 线，氛围转静 |

**这 3 镜直接决定 Step 4 需要哪些资源**（一镜 = 一组资源需求）：
- 背景：教室(午后)、走廊(黄昏)
- 立绘：A（至少 1 个正面 pose）、B（**侧身 pose**，S014 机位是侧机位）
- 特效/转场：dissolve、iris、zoom

---

## 3. Step 3b 落地示意（翻译成引擎指令）

> 由分镜直译；长文拆多条，**绝不一条 dialog 塞整章**。

```ts
// S012 — 教室午后，A 在左、主角在右，dissolve 转场
{ type: 'scene', bg: 'classroom', transition: 'dissolve' },
{ type: 'char', action: 'show', id: 'a', pose: 'default', position: 'left' },
{ type: 'dialog', character: 'A', text: '（笑）你今天来得真早。' },

// S013 — 近景 + zoom 缓推，情绪加重
{ type: 'effect', effect: 'zoom' },
{ type: 'char', action: 'show', id: 'a', pose: 'happy', position: 'center' },
{ type: 'dialog', character: 'A', text: '其实……我有话想跟你说。' },

// 关键抉择 → 好感累加（注意：set 的 op 只有 = += -=，没有 add）
{ type: 'choice', prompt: '你要怎么回应？', options: [
    { text: '认真听她说', jump: 'listen_carefully', set: [{ var: 'aff_a', op: '+=', value: 2 }] },
    { text: '先开个玩笑', jump: 'joke_first',        set: [{ var: 'aff_a', op: '+=', value: 1 }] },
]},

{ type: 'label', name: 'listen_carefully' },
{ type: 'narration', text: '她愣了一下，随即露出一个很轻的笑。' },
{ type: 'jump', target: 'after_choice_1' },

{ type: 'label', name: 'joke_first' },
{ type: 'narration', text: '她噗嗤一声笑了出来，气氛松了下来。' },
{ type: 'jump', target: 'after_choice_1' },

{ type: 'label', name: 'after_choice_1' },

// S014 — 走廊黄昏，侧机位，B 侧身，iris 转场 + KenBurns
{ type: 'scene', bg: 'corridor', transition: 'iris' },
{ type: 'char', action: 'hide', id: 'a' },
{ type: 'char', action: 'show', id: 'b', pose: 'side', position: 'right' },
{ type: 'dialog', character: 'B', text: '……你也还没走啊。' },
```

**指令与分镜的对应关系**（这就是"分镜能落地"的意思）：
- `scene.bg` ← 分镜"场景"；`transition` ← 分镜"转场"
- `char.pose/position` ← 分镜"构图"；`pose:'side'` ← 分镜"侧机位"（需对应角度立绘图）
- `effect:'zoom'` ← 分镜"镜头运动"

---

## 4. Step 4 落地示意（资源表，节选）

> 由上面 3 镜抽出的资源需求，按 7 大类聚合后的样子。

### B. 立绘（节选）
| 角色 | poseKey | 文件 | 说明 |
|---|---|---|---|
| A | `a_default` | `a_default.png` | 正面·普通表情 |
| A | `a_happy` | `a_happy.png` | 正面·笑（**不同脸图 = 独立 poseKey + 独立文件**） |
| B | `b_side` | `b_side.png` | **侧身 pose**（S014 侧机位专用） |

> 引擎事实：sprite 只按 `pose` 键位，指令里的 `expression` 字段**不参与换图** → 任何需要不同脸的表情/动作都得各自一个 poseKey。

### A. 背景（节选）
| bgKey | 文件 | 时段 | 说明 |
|---|---|---|---|
| `classroom` | `classroom.png` | 午后 | 1920×1080，16:9 |
| `corridor` | `corridor.png` | 黄昏 | 1920×1080，16:9 |

### D. 特效 / 转场（节选）
| 类型 | 用到 | 备注 |
|---|---|---|
| 转场 | `dissolve`、`iris` | 由分镜"转场"列决定 |
| 特效 | `zoom` | 由分镜"镜头运动"列决定 |

---

## 5. 这个例子说明了什么（要点回顾）

1. **分镜先行**：先定视觉（S012–S014），再翻译指令，最后才反推资源——顺序不能倒。
2. **一镜 = 一组资源需求**：分镜表天然就是 Step 4 的输入，不会漏。
3. **机位决定立绘**：分镜写"侧机位"，Step 4 就必须有 `b_side` 这张图，否则演出穿帮。
4. **表情 = 独立 poseKey**：A 的"普通"和"笑"是两张图，不是同一张图换个字段。
5. **抉择直连变量**：`choice` 的 `set` 用 `+=` 累加好感，再用 `if`/`jump` 做结局门控。

---

## 6. 不要照抄的部分

- 角色名/校名/季节/结局名 → 换成你自己的。
- 变量命名（`aff_a`/`aff_b`）→ 按你的机制命名。
- 具体 bgKey / poseKey → 按 Step 4 命名规范与你的资源表定。
- **要抄的是"结构"（分镜→指令→资源的三段式流转），不是内容。**
