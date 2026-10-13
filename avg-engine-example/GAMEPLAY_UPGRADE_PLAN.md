# 引擎可玩性升级总纲（GAMEPLAY UPGRADE PLAN）

> 目标：在现有轻量自研 TS 引擎（`avg-engine-example/`）上，分阶段加入「游戏性」系统，让《缄默回廊》等作品从「被剧情拖着走」升级为有探索、养成、选择、动效的体验。
> 一切改动**受 Git 版本控制、可单步回退**。

---

## 0. 回退基建（已完成 ✅）

| 项 | 值 | 用途 |
|---|---|---|
| 基线 tag | `engine-gameplay-baseline` → `88f61d5` | 一键回到「脱敏新版本 + qwen 推荐 + 9 张新立绘」的干净状态 |
| 开发分支 | `feat/gameplay-upgrades` | master 保持干净；每个阶段先在分支提交，验证后合并+推送 |
| 单功能回退 | `git revert <commit>` | 任一阶段可单独撤销，不影响其他阶段 |
| **禁止** | `git reset --hard` / `git rm` | 不破坏历史、不删文件 |

> CNB 同步：`88f61d5` 已推到 `master`；后续阶段合并后再 `git push origin feat/gameplay-upgrades` + `master`。

---

## 1. 现有引擎能力盘点（升级前已具备，避免重复造轮子）

| 能力 | 现有实现 | 升级可复用点 |
|---|---|---|
| 数值/旗标变量 | `VariableSystem`：`set/get/evaluate`（`>=,<=,==,!=,&&,||,!`） | 人物好感、计数、条件触发全靠它 |
| 分支跳转 | `if` / `jump` / `label` / `choice` | 场景自选、事件路由 |
| 物证弹窗 | `item` 指令 + `ItemDef` | 线索拾取弹窗 |
| 序列帧动画 | `anim` + `AnimationDef` | 人物/物件动画 |
| 天气粒子 | `effect`：rain/snow/petal/bokeh + 调色 grade | 氛围 |
| 屏幕特效 | `effect`：shake/flash/dim/zoom | 事件/拾取反馈 |
| 结局系统 | `unlock` + `end` + 结局收集相册 | 多结局 |
| 存档 | `SaveSystem` + 序列化 | 新状态需一并序列化 |

**结论**：4 大方向里，②③④都是「加指令 + 加 UI 层」的增量；**只有①探索模式（宽图平移+热区）是从零新系统**。

---

## 2. 设计总原则

1. **不破坏引擎内核**：所有新功能通过「指令 → 状态 → UI 回调」三层接入，内核 `ScriptCommand` 联合类型只增不改。
2. **数据驱动**：人物档案、事件表、热区、枢纽节点全部用脚本指令声明，作者零改 TS。
3. **读档安全**：所有静态声明（relation/event/hotspot/hub）在 `init()` 时预扫描入引擎，不依赖执行顺序，读档后不丢失。
4. **即时可测**：每个阶段配一个独立示例故事（story7/story8/…），从标题屏直接选入即可验证，验证后可删。
5. **单一职责提交**：每个功能一个 commit，便于 `git revert` 单删。

---

## 3. 六阶段路线图

```
阶段1  人物养成（属性模型 + 事件监视器 + 关系面板）   ← 地基，先动
  ↓
阶段2  线索笔记本 + 推理板（咬合探索证物）
  ↓
阶段3  探索模式（宽图平移 + 热区点击）                  ← ✅ 已完成
  ↓
阶段4  场景自选 hub 地图 + 时间/行动点系统
  ↓
阶段5  动画/特效润色（视差/宽银幕/微表情）
  ↓
阶段6  可选：QTE / 世界观图鉴 / 多周目路线锁
```

---

## 4. 阶段 1 · 人物养成（✅ 已完成 · 实测通过）

### 4.1 新增数据结构（types.ts）
```ts
interface RelationDef {
  id: string;          // 角色 id（与 sprite key 对应）
  name: string;        // 显示名
  personality?: string;// 性格
  likes?: string;      // 好恶·喜
  dislikes?: string;   // 好恶·恶
  affinity: string;    // 好感变量名（数值，如 aff_gucheng）
  min?: number; max?: number; // 好感刻度（默认 -10..10）
}
interface EventDef {
  id: string;          // 事件唯一 id
  when: string;        // 触发条件（复用 evaluate 语法）
  jump: string;        // 命中后跳转 label
  once?: boolean;      // 是否只触发一次（用 flag.event.<id> 守门）
  toast?: string;      // 触发时的瞬时提示文案
}
```

### 4.2 新增脚本指令
```jsonc
// 声明角色档案（init 时预扫描，建议放在脚本最前）
{ "type": "relation", "characters": [ { "id":"gucheng","name":"顾承",
  "personality":"克制·守密","likes":"专业克制","dislikes":"情绪化",
  "affinity":"aff_gucheng" } ] }

// 声明事件监视表（init 时预扫描）；set 后引擎自动判定
{ "type": "event", "list": [
  { "id":"ev_gc3","when":"aff_gucheng>=3","jump":"ev_gucheng_warm","once":true,
    "toast":"顾承开始信任你" }
] }
```

### 4.3 引擎改动（game-engine.ts）
- 新增 `relations: Map<string, RelationDef>`、`eventList: EventDef[]`。
- `init()` 预扫描脚本里的 `relation`/`event` 指令，一次性登记（读档安全）。
- `set` 指令执行后调用 `checkEvents()`：遍历 `eventList`，跳过 `once` 且已置 `flag.event.<id>` 的事件；命中则置 flag（若 `once`）、触发 `onEventFired` 回调、跳转到 `jump` label。
- 新增 `getRelations()` getter 供 UI 读取。
- 新增回调 `onEventFired?: (id:string, toast?:string) => void`。

### 4.4 UI 改动
- 顶栏新增「关系」按钮 → 打开 `#relations-panel`，列出角色名/性格/好恶/好感进度条（值取自 `engine.variables.get(affinity)`）。
- 新增 `#event-toast` 瞬时提示层，`onEventFired` 时滑入、2.5s 后淡出。

### 4.5 验收判据
- [ ] 脚本声明 relation/event 后，顶栏出现「关系」且面板显示好感=0。
- [ ] choice 改变好感变量，关系面板实时刷新。
- [ ] 好感达阈值 → 自动跳转事件 label + toast 弹出，且 `once` 事件不重复触发。
- [ ] 读档后 relation/event 仍在（预扫描保证）。
- [ ] 示例 story7 从标题屏可进入并完整演示。

---

## 5. 阶段 2 · 线索笔记本 + 推理板（✅ 已完成 · 实测路径见下）

### 5.1 新增数据结构（types.ts）
```ts
interface ClueDef {
  id: string;          // 线索唯一 id
  name: string;        // 显示名（如「锈蚀的铜钥匙」）
  desc: string;        // 描述 / 揭示含义
  icon?: string;       // 可选缩略图
}
interface DeductionDef {
  id: string;          // 推理唯一 id
  name?: string;       // 可选标题
  requires: string[];  // 必须「已拥有且被选中」的线索 id（超集亦可命中）
  sets?: { variable; value; op? }[];  // 命中后写入变量
  jump?: string;       // 命中后跳转 label（解锁路线/结局）
  toast?: string;      // 推理成功瞬时提示
  once?: boolean;      // 仅触发一次（flag.deduce.<id> 守门）
}
```

### 5.2 新增脚本指令
```jsonc
// 声明线索（init 预扫描 def；执行时再标记「已拥有」，触发 onClueAdded 刷新角标）
{ "type": "clue", "id": "c_key", "name": "锈蚀的铜钥匙",
  "desc": "柄上刻着编号 7-13，对应老式病历柜。" }

// 推理规则（init 预扫描）；玩家在推理板选中线索后引擎 tryDeduce 判定
{ "type": "deduce", "list": [
  { "id": "d_truth", "requires": ["c_key","c_note"],
    "sets": [{ "variable":"flag_deduced","value":true,"op":"=" }],
    "jump": "deduce_success", "toast": "推理成立：7-13 号柜藏着真相", "once": true }
] }
```

### 5.3 引擎改动（game-engine.ts）
- 新增 `clueDefs: Map`（def，init 预扫描）、`ownedClues: Set`（执行标记）、`deductionList`（init 预扫描）。
- `clue` 执行：标记已拥有 + 回调 `onClueAdded`；`deduce` 为声明，no-op。
- `tryDeduce(selectedIds)`：遍历 `deductionList`，命中「requires 全部已拥有且被选中」首条 → 应用 `sets`、`once` 守门、`onDeductionFired` 回调、`jump`（跳转前若停在选项则先收起选项面板）。
- `getClues()` 供 UI 渲染；`SerializedGameState` 增加 `clues: string[]` 并纳入 `getSaveState`/`restoreFromSave`（读档安全）。
- 回调：`onClueAdded?`、`onDeductionFired?`。

### 5.4 UI 改动
- 顶栏「线索」按钮 + `#clues-badge` 角标（已收集数量）。
- `#clues-panel`：阅读模式列线索卡（名+描述+图标）；点「进入推理」切推理模式——线索卡变可点选，底部出现「推理 / 退出推理」。
- 选线索 → 点「推理」→ `engine.tryDeduce`，命中则关面板 + toast；未命中显示「线索不足」提示。
- 复用阶段1的 `#event-toast` 作推理成功提示。

### 5.5 验收判据
- [x] 执行 `clue` 后顶栏角标 +1，关系/线索面板可查。
- [x] 「进入推理」选中「钥匙+匿名信」→ 推理命中 → 跳 `deduce_success` + toast。
- [x] 选错组合 → 提示「线索不足」，可重选；`once` 推理不重复触发。
- [x] 读档后已收集线索仍在（序列化保证）。
- [x] 示例 story8「线索推理示例」从标题屏可进入完整演示。

---

## 6. 阶段 3 · 探索模式（✅ 已完成 · 实测路径见下）

- **引擎指令**：`explore` —— 进入探索模式，指定宽图（`bg`）、`widthRatio`（宽图相对屏宽倍数，默认 2）、`hint`，以及 `hotspots` 热区数组。
- **热区定义**：`{ id, x, y, w?, h?, clue?, item?, label? }`，坐标 `x/y` 归一化（x 对整张宽图宽度、y 对视口高度），`clue` 命中收集线索、`item` 命中弹道具放大图。
- **交互**：画布拖拽 / ◀▶ 按钮左右平移视角（底部范围条指示）；点击发光热区 → 收集线索 + 弹道具 + 顶栏角标 +1；命中后热区标记变 ✓。
- **结束**：UI【结束探索】→ 引擎 `exitExplore` 恢复常规脚本流程（探索指令执行时先 `+1` 跳过自身，避免反复进入）。
- **存档/读档**：`clue` 已纳入序列化；探索 found 为运行期态，读档重进探索可重新点（线索已拥有的不重复 +1）。
- **示例**：story9「探索模式示例」从标题屏可进入完整演示（宽 2.2 倍图 + 3 热区）。

---

## 7. 后续阶段（占位，逐阶段展开 SPEC）

- **阶段4 场景自选 hub**：`hub` 地图层（节点+requires+locked_msg）；`time` 时间阶段 + `action_points` 行动点。
- **阶段5 动画特效**：宽图视差分层、电影宽银幕（16:9 黑边+缓推）、线索拾取闪光、立绘入场弹跳、眨眼/微表情。
- **阶段6 可选**：QTE（可关）、世界观图鉴 Codex、多周目路线锁 + NG+ 携带好感。

---

## 8. 提交约定
- 每阶段一个 commit，message 前缀 `[阶段N]`。
- 验证（build + 示例故事实测）通过后才合并进 master 并推送 CNB。
- 示例故事（story7…）验证满意后可整体删除，不影响正式故事。
