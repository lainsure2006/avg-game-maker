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
阶段4  场景自选 hub 地图 + 时间/行动点系统              ← ✅ 已完成（验收通过）
  ↓
阶段5  动画/特效润色（宽银幕/拾取闪光/立绘弹入）        ← ✅ 已完成（验收通过）
  ↓
阶段6  QTE（✅已完成）· 世界观图鉴（✅已完成）· 视差（✅已完成·2026-10-14 用户实测通过）· 眨眼（⏸️挂起·程序化眼睑已实现，真实系小眼不可见，留待二次元项目）· 多周目（纯引擎·SPEC 待实施）
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

## 7. 阶段 4 · 场景自选 hub（✅ 已实现 · 验收通过）

> 时间/行动点采用「日程表模型」：N 个时间阶段 × 每阶段 M 行动点；阶段内可访问多个节点，行动点花完自动进入下一时段；全部时段结束才收尾（或玩家主动「结束今天」）。

### 7.1 新增数据结构（types.ts）
```ts
interface HubNode {
  id: string;          // 节点 id
  label: string;       // 显示名（如「病房」）
  bg?: string;         // 进入节点时的背景 id（可选）
  requires?: string;   // 解锁条件（复用 evaluate 语法，如 `v_ward_done == 1` / `flag.x`）
  locked_msg?: string; // 未解锁提示
  jump: string;        // 进入该场景的 label
}
interface HubDef {
  title?: string;      // 枢纽标题
  bg?: string;         // 枢纽背景 id
  time: string[];      // 时间阶段名数组（长度 = 阶段数 N）
  apPerPhase?: number; // 每阶段行动点（默认 1）
  onEnd: string;       // 时限到跳转的 label（收尾剧情）
  nodes: HubNode[];
}
```

### 7.2 新增脚本指令
```jsonc
{ "type": "hub", "title":"荒岛医院·第一天", "bg":"hub_bg",
  "time":["上午","午后","黄昏","夜晚"], "apPerPhase":1, "onEnd":"day_end",
  "nodes":[
    { "id":"ward","label":"病房","jump":"sc_ward" },
    { "id":"archive","label":"档案室","requires":"v_ward_done == 1",
      "locked_msg":"先去病房找到线索","jump":"sc_archive" }
  ] }
// 节点场景从 label 进入，末尾用 returnHub 回到枢纽：
{ "type":"label", "id":"sc_ward" }
// ...scene/dialog/set/clue...
{ "type":"returnHub" }
```

### 7.3 引擎改动（game-engine.ts）
- 新增 `hubDef / hubPhase / hubApLeft / hubEnded / waitingForHub` 状态字段。
- `hub` 指令：`commandIndex++` 跳过自身后 `enterHub(def)`（与 explore 同款防重入）；设 `waitingForHub=true`，回调 `onHubEnter/onHubUpdate`。
- `selectHubNode(id)`：校验 `requires`（不满足 → `onHubLocked`）；扣 1 行动点；跳 `node.jump`。
- `returnHub` 指令：`exitHubReturn()`——行动点耗尽则 `hubPhase++`（到顶跳 `onEnd` 收尾），否则 `reenterHub()` 回枢纽。
- `endHubEarly()`：「结束今天」主动收尾。
- 主循环新增分支：枢纽激活时画布渲染 `renderer.renderHubBg`（DOM 覆盖层画节点）。
- `advance()` 在 `waitingForHub` 时 no-op（防画布点击误推进）。
- 存档：`SerializedGameState.hub` 记录 `{def, phase, apLeft}`；读档若处于枢纽则 `reenterHub()`（读档安全）。

### 7.4 UI 改动（ui-manager.ts + index.html + main.css）
- `#hub-overlay` 覆盖层：标题 + 状态条（🕐 时段 X/N · ⚡ 行动点 a/b）+ 节点网格 + 「结束今天」按钮 + locked toast。
- 节点卡片：解锁→📍可点；锁定→🔒灰显 + `locked_msg`。状态条随 `onHubUpdate` 刷新。
- 进入枢纽隐藏顶栏/对话框；离开（进场景/收尾）恢复顶栏。

### 7.5 验收判据
- [ ] 进入 hub 后显示 N 个时段、行动点，节点网格可见；点击解锁节点 → 进场景、扣 1 行动点。
- [ ] 行动点耗尽 → 自动推进时间；全部时段走完 → 跳 onEnd 收尾。
- [ ] 锁定节点灰显，点击弹 `locked_msg`；去病房设 `v_ward_done` 后档案室解锁。
- [ ] 「结束今天」可提前收尾。
- [ ] 读档若处于枢纽，恢复后枢纽仍在（时间/行动点正确）。
- [ ] 示例 story10「场景自选示例」从标题屏可进入完整演示（4 时段×1 行动点，档案室锁）。

---

## 8. 阶段 5 · 动画 / 特效润色（✅ 已实现 · 验收通过）

> 目标：在不改内核的前提下，给对话演出增加「电影感」与「鲜活感」。
> 三项全部纯 CSS/Canvas（无新素材）；视差分层与眨眼/微表情因需分层素材，**本轮不做**，留待阶段6 后再议。

### 8.1 电影宽银幕（`cinematic` 指令）
- **新增指令**：`{ type: 'cinematic', on: boolean }` —— 开关电影模式。
- **行为**：`on=true` 时 UI 在屏幕上下加 **11% 黑边（letterbox）**，且背景的 Ken Burns 缓推振幅放大（1.0× → 2.4×），关键对话/转场更显「推镜」；`on=false` 恢复常规 16:10 视野。
- **接入**：
  - `types.ts`：`ScriptCommand` 联合类型加 `cinematic` 分支。
  - `game-engine.ts`：新增 `onCinematic(on)` 回调 + `cinematicOn` 状态；`executeCommand` 加分支（置状态 + `renderer.setCinematic` + 回调）；`startGameLoop()` 与 `case 'end'` 自动复位（避免黑边卡死）。
  - `renderer.ts`：新增 `cinematicMode` / `setCinematic()`；`drawBackgroundImage` 在 `cinematicMode` 下放大 KB 缩放/漂移振幅。
  - `index.html` + `ui-manager.ts` + `main.css`：`#cinematic-bars`（上/下黑边，`.hidden` 默认隐藏，`pointer-events:none`、`z-index:200`）。
- **作者用法**：在想出电影感的地方写 `{type:'cinematic',on:true}`，收尾前写 `{type:'cinematic',on:false}`。

### 8.2 线索拾取闪光（`flash` + 金色光环）
- **行为**：探索中点中热区 → ① 画布白光一闪（`renderer.startEffect('flash', 0.4)`，复用既有屏幕特效）；② 屏幕中央泛起**金色光环**（`#pickup-flash` DOM 覆盖层，keyframes 脉冲，`pointer-events:none`）。
- **接入**：`game-engine.clickExplore` 命中后调用 `renderer.startEffect('flash',0.4)` + `onPickupFlash?.()`；`ui-manager` 绑定 `onPickupFlash` → `showPickupFlash()`（650ms 自动隐）。
- **道具弹窗升级**：`.avg-item-frame` 加金色发光描边（`box-shadow` 暖金），拾取弹出更有「证物登场」感。

### 8.3 立绘入场弹跳（easeOutBack 回弹 + 缩放弹入）
- **复用**：引擎已有入场滑入 + 淡入（`enterT`/`exitT`/`smoothstep`），本项把**入场缓动换成 `easeOutBack`**（带轻微过冲），并叠加 **0.92→1.05→1.0 的缩放弹入（popScale）**，使角色「弹」出来而非平铺滑入。
- **接入**：
  - `game-engine.ts`：新增 `easeOutBack(t)`；`drawAllCharacters` 入场 `easeIn` 改用 `easeOutBack`，并算 `popScale = 0.92 + 0.08*easeIn` 传入 `drawCharacterAuto`。
  - `renderer.ts`：`drawCharacterAuto` 加 `popScale = 1` 形参，作用于绘制宽高（绕脚底缩放）。
- 退场仍用 `smoothstep`（不回弹），保持干净离场。

### 8.4 验收判据
- [ ] 标题屏选「探索模式示例」→ 探索中点中热区：白光闪 + 金色光环 + 道具弹窗带金边。
- [ ] 收尾段 `cinematic on` 后：屏幕上下出现黑边、背景明显缓推（比常规更慢更明显）；`cinematic off` 后黑边消失、视野恢复。
- [ ] 任意 `char show`：角色以「滑入 + 缩放弹入 + 淡入」登场，带轻微回弹；`char hide` 干净滑出。
- [ ] 走到 `end` 或重开新故事：电影黑边自动消失（不卡死）。
- [ ] 示例 story9（探索+收尾电影感）、story10（day_end 电影感）从标题屏可进入完整演示。

---

## 9. 阶段 6 · 可选系统（进行中）

> **范围约定（2026-10-14）**：纯引擎三项（QTE / 世界观图鉴 Codex / 多周目路线锁+NG+）先行；**视差分层 + 眨眼/微表情需补 krea2-scene-sheet 分层素材，待用户开机出图（AutoDL）后实施——届时由 AI 主动通知用户开机**。提交约定：每项一个 commit，前缀 `[阶段6·QTE]` / `[阶段6·Codex]` / `[阶段6·NG+]`。

### 9.1 QTE 快速反应事件（可关闭） ✅ 已完成（2026-10-14 验收待用户实测）
- **新增指令** `{ type:'qte', id, prompt, duration, mode:'tap'|'key'|'mash', key?, target?, successLabel, failLabel, once? }`
  - `mode:'tap'` 限时点击屏幕；`'key'` 限时按某键（如 Space）；`'mash'` 限时连点 N 次（`target` = 次数）。
- **行为**：进入后暂停主循环 `advance`（画布点击被 `waitingForQte` 守卫拦截），弹出 `#qte-overlay`（提示 + SVG 倒计时环 + 剩余秒数 + 紧急态转红）；成功→跳 `successLabel`，超时/失败→跳 `failLabel`；`once` 守门（flag.qte.<id>）防读档重触。
- **可关闭**：设置面板加「快速反应事件(QTE)」开关（默认开，序列化进 localStorage）；关闭时引擎对该事件直接走 `successLabel`，不弹覆盖层，照顾休闲玩家。
- **接入**：types 加 `qte` 指令联合分支 + `GameSettings.qteEnabled`；game-engine 加 qte 状态机（`update()` 计时与超时、`enterQte`/`qteInput`/`resolveQte`/`isQteActive`/`getQteTarget`）+ `advance()` 守卫；ui-manager 绑 `onQteEnter/onQteTick/onQteProgress/onQteExit` + 覆盖层点击监听 + 键盘路由（key/mash 模式拦截 Space/指定键）+ 设置开关绑定；index.html 加 `#qte-overlay` 结构；main.css 加覆盖层/环/紧急态样式；示例故事 `story11`（tap/key/mash 三连 + cinematic 配合）。
- **验收**：选入 story11 → 三次 QTE 依次出现 → 点中/按键/填满跳 success，不操作超时跳 fail；设置关 QTE 后三事件直接成功不触发；读档后 `once` 事件不重触。
- **已知约束**：`story11` 为新增 digit 目录，需重启 dev 服务器（glob 编译期扫描）才会出现在故事列表。

### 9.2 世界观图鉴 Codex（收集式百科） ✅ 已完成（2026-10-14 验收通过）
- **新增指令** `{ type:'codex', list:[{ id, category:'character'|'place'|'term'|'clue', title, desc, icon? }] }` + `{ type:'codexUnlock', id }`
- **行为**：顶栏「图鉴」入口 → `#codex-panel` 分类标签（角色/地点/术语/线索，各标签显示「已解锁/总数」）→ 卡片网格；已解锁显示图标+名称+描述，未解锁灰显「?」+「未解锁 · 继续探索以揭示」。解锁时顶栏角标 +1 并弹瞬时提示。
- **接入**：types 加 `CodexDef` + `codex`/`codexUnlock` 指令 + `SerializedGameState.unlockedCodex`；game-engine 加 `codexDefs: Map` + `unlockedCodex: Set`（init 预扫描 codex 声明；`codexUnlock` 置集合 + 回调 `onCodexUnlocked`；`getSaveState`/`restoreFromSave` 序列化）；ui-manager 加 `#codex-panel`（分类标签 + 卡片网格 + ??? 占位）+ 顶栏「图鉴」入口 + 角标 + 键盘 Esc 关闭 + keydown 守卫；index.html 加按钮与面板；main.css 加样式。
- **验收**：story11 含 codex 声明（3 条）与 3 处解锁 → 顶栏出现「图鉴」入口且角标随解锁递增 1→2→3；打开面板分类切换正常，未解锁条目显 ???；读档后解锁状态恢复。
- **已知约束**：`story11` 为新增 digit 目录，需重启 dev 服务器才会出现在故事列表。

### 9.3 多周目路线锁 + NG+（携带好感/解锁）— SPEC 已完成，⏸ 编码待一周目主线完整
> 本期只写 SPEC，不落地代码。原因：NG+ 的「隐藏路线」必须有真实的一周目分支点才能演示，否则是空系统。待《樱色未央》22 章 / 《缄默回廊》主线成型后，按本 SPEC 编码并配示例故事实测。

#### 9.3.1 目标
通关后开启二周目（可累加到 N 周目），保留部分进度（好感度 / 关键解锁 / 图鉴），并解锁隐藏选项或隐藏枢纽节点，形成 replay 价值。

#### 9.3.2 数据模型（types.ts）
- `SerializedGameState` 增加：
  - `playthrough: number` —— 当前周目（首轮为 1）。
  - `ngCarry: { relations: Record<string, number>; flags: string[]; codex: string[]; endings: string[] }` —— 跨周目携带子集。
- `StoryDef` 增加可选 `ngPlus?: { carryRelations?: string[]; carryFlags?: string[]; hiddenRoutesRequire?: number }` —— 声明本作允许 NG+ 且携带哪些变量。
- `ScriptCommand`：`choice` 选项 / `hub` 节点增加可选 `requires?: { playthrough?: number; flags?: string[] }` —— 周目 / flag 门。

#### 9.3.3 引擎（game-engine.ts）
- 状态：`this.playthrough`（从存档恢复；新游戏默认 1）。
- `end` 指令：若当前 story 的 `ngPlus` 存在 → 置 `canNgPlus = true`，标题屏「进入 NG+」按钮可用。
- `enterNgPlus()`：
  1. `playthrough += 1`；
  2. 收集 `ngCarry`：relations 取 `carryRelations` 名单当前值；flags 取 `carryFlags` 名单中已置位的；codex 全量保留（图鉴本就该跨周目保留）；endings 累加；
  3. 重置：commandIndex=0、临时 flag、choice/hub 运行时状态、QTE once 集合；
  4. 恢复 carry：写回 relations/flags；
  5. 重新 `init`（扫描 def）并从 start 重跑。
- `requires` 门：`choice`/`hub` 渲染前过滤不符合 `requires`（周目不足 / flag 未满足）的选项或节点 —— 灰显 + 锁图标 + tooltip「需第 N 周目 / 需达成 X」。
- 序列化：`getSaveState` 写 `playthrough`/`ngCarry`；`restoreFromSave` 恢复；NG+ 后生成新存档槽（周目数写入槽名）。

#### 9.3.4 UI（ui-manager.ts / index.html / main.css）
- 标题屏：当 `canNgPlus` 时显示「进入 NG+」按钮（二周目及以上显示「进入第 N 周目」）。
- 顶栏 / 存档面板：显示当前周目数。
- `requires` 未满足的选项：灰显 + 🔒 + tooltip「需第 N 周目」。

#### 9.3.5 接入清单（编码期）
- types：`SerializedGameState.playthrough`/`ngCarry`、`StoryDef.ngPlus`、`choice`/`hub` 的 `requires`。
- game-engine：`playthrough` 字段 + `enterNgPlus` + `end` 改造 + `requires` 过滤 + 序列化。
- ui-manager：NG+ 按钮 + 周目显示 + 锁提示。
- 示例：待一周目主线完整后，选一个明确分支点做 `requires: { playthrough: 2 }` 的隐藏选项演示（建议放《樱色未央》或《缄默回廊》真实分支，而非 story11 占位）。

#### 9.3.6 验收（编码后）
- 一周目通关 → 标题屏出现「进入 NG+」；进入后周目=2、好感/解锁保留、隐藏选项出现；读档周目数恢复；三周目仍能继续累加。

- **状态**：⏸ SPEC 已完成（2026-10-14），编码待一周目主线完整后落地。

### 9.4 ✅ 视差（已完成 2026-10-14，用户实测）
- **实现路径**：放弃「krea2 真分层」，改走**「单图 + 深度伪分层」**——每场景用 `DepthAnythingV2Preprocessor` 出深度图，按深度阈值切成 far/mid/near 三层（近层位移大、远层小），露缝由底图兜住。
- `AssetManifest` 加 `parallax?: Record<string, ParallaxDef>`（layers + factors）；`GameSettings.parallaxEnabled?`。`renderer.ts` 加 `setParallaxStack/setParallaxEnabled` + `renderParallax/drawParallaxLayer`（factor 偏移 + 空闲呼吸 + 鼠标视差 + overscan 防露边 + 层组淡入淡出）；`game-engine.ts` 的 `scene` 与读档恢复均接入，层未就绪自动降级单图层。
- 4 场景（走廊/大厅/病房/庭院）底图 + 深度 + 12 张视差层已落 `public/images/bg/jianmo/parallax/`；切层脚本 `comfy_stage6/prep_parallax.py`。
- 演示：`story12「视差演示」`。
- 素材清单 → 见 `STAGE6_PARALLAX_BLINK_ASSETS.md`（一）。

### 9.5 ⏸️ 眨眼（已实现 2026-10-14·程序化眼睑，2026-10-14 末用户决定「挂起」）
- **实现路径**：本实例（CloudStudio）**无任何 edit 模型**，qwen-image 2.1 基座无法做保身份局部编辑（闭眼），故放弃扩散路线，改走**「程序化眼睑」**：用 Pillow 由 alpha 轮廓几何（bbox + 颈部收窄，失败按 bbox×0.25 钳制）+ 头部质心定位双眼，采样颊部肤色生成**闭眼覆盖层** `<sprite>_blink.png`（仅眼睛区不透明、羽化），引擎在眨眼帧以**同尺寸/同变换**叠加到原立绘上（100% 对齐、无 GPU、确定性）。
- 生成器 `comfy_stage6/make_blink.py`；9 张覆盖层（gucheng×4 / sulan×2 / yanxi×2 / laok×1）。
- `CharacterState` 加 `blink/blinkNext/blinkT/blinkDur`；`GameSettings.blinkEnabled`；`game-engine.advanceBlinks`（随机 1.8~6.0s 眨一次，单次 ~0.16s，含闭合/张开过渡）+ 按命名约定预加载 + `drawAllCharacters` 叠加；`renderer.drawCharacterAuto` 加 `blinkOverlay/blinkAlpha`；`asset-loader.ensureImage`；设置面板加「立绘眨眼」开关。
- **⏸️ 挂起原因（2026-10-14 末）**：实测真实系（photoreal）小眼，眨眼眼罩几乎不可见，观感收益过低。用户判定**「真实系眼睛小、二次元大眼才显效果」**——故**保留全部代码与 9 张覆盖层、默认关闭 `blinkEnabled=false`、演示剧本撤除眨眼展示段**，留待未来**二次元大眼项目**一键启用。设置面板「立绘眨眼」开关保留（关着），可随时勾选复验。
- 素材清单 → 见 `STAGE6_PARALLAX_BLINK_ASSETS.md`（二）。

### 9.5 ⚠️ 眨眼/微表情（素材待出图，未实施）
- `CharacterState` 加 blink 计时；renderer 叠加/切换眼睛层（或序列帧）。**需眼睛单独层素材**，待用户开机出图后实施。
- 素材清单与开机出图流程 → 见 `STAGE6_PARALLAX_BLINK_ASSETS.md`（二、眨眼素材）。

---

## 10. 提交约定
- 每阶段一个 commit，message 前缀 `[阶段N]`。
- 验证（build + 示例故事实测）通过后才合并进 master 并推送 CNB。
- 示例故事（story7 人物养成 / story8 线索推理 / story9 探索 / story10 hub）已于 2026-10-14 上传前清理删除，不影响正式故事 story3《樱色未央》/ story4《雾港回声》/ story5《缄默回廊》。删除后 `npm run build` 26 模块通过。
