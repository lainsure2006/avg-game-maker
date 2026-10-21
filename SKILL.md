---
name: avg-game-maker
description: "This skill should be used when the user wants to create an AVG (adventure visual novel or text-adventure) game with the TS+Vite avg-engine at <avg-engine>. It equips WorkBuddy to act as an AVG game-making partner that co-creates the game with the user through a strict 8-step pipeline: co-writing the story, reviewing and auditing it, script-ifying it into engine format, splitting and tallying assets, reconciling assets, coding the game (story N, an auto-discovered directory), testing, and finalizing. Trigger phrases include making an AVG game, writing a visual novel, using avg-engine to make a game, or any request to extend or iterate an existing story."
agent_created: true
---

# AVG Game Maker

## Overview

Act as an **AVG game-making partner**, not a one-shot generator. The user owns the creative
direction; WorkBuddy drives the production pipeline end-to-end. The engine is a TypeScript +
Vite visual-novel engine living at `<avg-engine>` (game content under
`src/game/storyN/`, built assets under `public/`). New games are added as new `storyN`
directories that the engine auto-discovers.

The single hard rule: **follow the 8-step pipeline in order; do not skip or reorder.**

## Role Division (confirm with the user at kickoff)

| Responsibility | WorkBuddy (you) | User |
|---|---|---|
| Story & script | Write the narrative, audit it, script-ify it, split & tally assets, write the engine code | Confirm direction & consistency standards, co-review & co-test |
| Assets | Write image-generation prompts, define consistency standards, code wiring | Search/download SFX & BGM, confirm asset direction |
| Decisions | Propose structure, flag contradictions | Choose branches, approve endings, give visual feedback |

## Asset Generation Scheme (confirm at kickoff)

Before Step 5, **confirm HOW images are produced**. This skill's documented pipeline is written
against **CloudStudio ComfyUI via local bridge**, but the method is NOT fixed — pick one at
kickoff and adapt.

**推荐方案（2026-10 实践结论）**：当前 **Qwen-Image-2.1（方案 D / companion `qwen-standee`）** 实测最稳定、面部/身份一致性最好，作为**首选推荐**；但各方案互不影响，用户按自身云端算力、模型获取难度与画风需求任选——本 skill 把每套方法都文档化，开工前确认用哪套即可。

**Two rules hold regardless of scheme**:
1. **S0 first (G1 §2.5)** — style definition + **model-selection experiment** + frozen Style Block,
   before any character art. *The pipeline is genre-agnostic; the style is not.* Never carry a previous
   game's style words / params into a new one.
2. **Then L0 four-panel card (G1 §1/§3)** — one per character, the first real character asset.

| Scheme | How | Notes / pitfalls |
|--------|-----|------------------|
| **A. CloudStudio ComfyUI** (this project's default) | Local bridge `127.0.0.1:8188` → CloudStudio. Pipeline scripts `scripts/comfy_pipeline.py` (bg) + `gen_l0_onepass.py` (L0 cards) drive z-image-turbo. | Cloud preview port (e.g. 9000) ≠ real ComfyUI port (**8188**); `/history/{pid}` single-id returns empty → full `/history` scan; install nodes via CloudStudio terminal (`git clone` into `custom_nodes/`, restart via console, not `kill`). |
| **B. Local ComfyUI** | User runs ComfyUI on `localhost:8188` (or other). Same workflow JSON + prompts; bridge URL = `http://localhost:8188`. | No cloud gateway quirks. Must have z-image-turbo model (+ optional controlnet) locally. |
| **C. Prompt-only (manual)** | WorkBuddy delivers prompt templates (G1 §3) + negatives; user generates manually in any tool (SD webui / Midjourney / 即梦 / by hand). | No ComfyUI/API. WorkBuddy still owns S0 style/model design, prompt design, consistency standard, and the S0→L0 order. |
| **D. AutoDL qwen-image 2.1（★推荐/最稳定）(companion `qwen-standee`)** | autodl 实例(RTX 3090) + ComfyUI + qwen-image 2.1 int8。设定表 2:1 一次出 4 视角 → 切格 → 半身参考(front+head 单格+整张设定表)出图 → RMBG-2.0 抠透明 → ArcFace/透明占比数字验收。 | **★ 当前最稳定、身份一致性最好，作为首选推荐方案**；云端端口映射 6006(ComfyUI 实际 8188)；本地用 paramiko 编排(`autodl_bridge.py`)；不直出 alpha；步数≥24；参考图勿砍；二次元角色不能用 ArcFace（无 insightface 脸）。详见 `companion-skills/qwen-standee/SKILL.md`。 |

> Found a new scheme? Add it to this table so future runs start by confirming the scheme instead
> of assuming CloudStudio.

> **当前推荐**：若无特别偏好，优先选方案 D（qwen-standee）；其余方案互不影响，用户自行取舍。

---

## The 8-Step Pipeline (strict order)

> **Entry point**: read `references/pipeline-overview.md` FIRST for the global flow diagram and the
> two-level (Step → sub-step `x.y`) execution checklists. Then dive into the per-step docs below.
> **Optional illustration**: `references/example-walkthrough.md` shows one desensitized mini-slice
> flowing Step 1 → 3 → 4 (design → storyboard → engine commands → resource rows). Illustration only,
> **not** a template to copy.

### Step 1 — Co-write the story (叙事创作)
- Target **3–4万字 (no padding)** with **branches + ≥3 endings**.
- Lock a design skeleton first — use the field table in
  `references/step1-story-design.md`: title, genre/art style, protagonist (player-insert vs named),
  core themes, **ending list (≥3)**, branch mechanic (e.g. affinity system), key characters,
  season/setting.
  - **Worldview lock (MANDATORY)**: before any asset generation, Step 1 must produce `世界观设定.md`
    locking **era / region-culture / ethnicity / costume / visual-negative terms** (see
    `references/step1-story-design.md` §1.6). This is the hard pre-condition for Step 4/5 image
    prompts — an un-locked worldview previously caused a full 59-image scrap-and-rerun incident.
- **Fixed presets (do NOT ask the user — these are the engine's optimal defaults):**
  - Target platform = **web browser** (static build).
  - Design base **1280×720 (16:9)**; ship background art at **1920×1080**; sprites transparent PNG
    ~900–1100px tall; L0 cards 2048×1024.
  - **Audio (BGM / SE / voice) are standard reserved items** — always planned for, but the user may
    leave them empty. Planned-but-missing audio must stay OUT of `manifest.ts` (404 throws).
- **Scope guard (important)**: Step 1 = **story only**. It produces **no images and no audio**.
  The output specs above are baselines handed to **Step 4/5** (asset generation). The "角色体系"
  field here is a **text-only character roster + relationships**, not character art — the actual
  L0 cards / sprites are made in Step 4/5 per `g1-character-consistency.md` (order: **S0 → L0**).
- Output: a clean narrative draft (v0.x). Keep it as the source of truth.

### Step 2 — Story audit / 故事审核 (先定标准再审)
- **What it audits**: the **story draft (v0.x) from Step 1** — i.e. the *narrative* layer
  (plot, branch logic, character consistency, pacing, emotional control). **NOT the engine
  script** — script-ification is Step 3, so this step reviews prose, not engine instructions.
- Establish an explicit **《审核标准》** (e.g. 27 items: plot/logic contradictions, character
  consistency, pacing, emotional control).
- Produce a **《审核报告》** and iterate until the second-pass review passes.
- Use the full template + two-round review flow (v0.2 → revise → v0.3) in
  `references/step2-story-audit.md`.

### Step 3 — Storyboard + Script-ification (分镜设计 + 剧本化)
- **Three sub-phases**:
  - **3a Storyboard**: split the v0.x draft into shots — visual plan only (no engine instructions).
    Field table = the 11 dimensions (scene/time/character/position/action/expression/dialog/bgm/se/effect/anim)
    **plus shot-specific columns**: Shot#, 景别, 机位/角度, 构图, 镜头运动, 时长/节奏, 转场, 演出意图.
  - **3a2 Shot-format audit (画面呈现形式审核) — a mandatory gate, easy to skip, expensive to skip.**
    Walk **every shot** and decide its presentation form: **P1** bg+sprite · **P2** bg+sprite+effect ·
    **P3** `item` popup (the subject is a *readable document*) · **P4 CG single image**.
    CG triggers (any one ⇒ candidate): (1) poses a sprite cannot carry — crouch/kneel/lying/back turned/
    reaching/hand close-up; (2) no character but the shot must narrate (empty-frame storytelling);
    (3) protagonist has no sprite (player-insert) so a solo scene would be a bare background;
    (4) >3 characters whose **formation itself** is the point (engine auto-layout flattens it to a row);
    (5) flashback/dream/time-jump/abstract; (6) the chapter's emotional peak.
    **Reverse constraints matter as much**: if the subject is a document → use `item` (cheaper, text is exact);
    if an existing bg + sprite + effect can carry it → do that; if you can't name what the audience loses
    without the CG → don't make it; max 1 CG per scene.
    **CG art spec: TWO reference images are mandatory** — scene ref (the scene's pano段 / finished bg)
    + character ref (that character's finished `default`, cut to **head+neck** — crop height from the
    **measured skin bottom**, never a hard-coded ratio; build it from the **matted RGBA** on white,
    since the raw `_gray` base may be a green screen). Missing the scene ref ⇒ **scene drift**;
    missing the character ref ⇒ **face swap**.
    🔴 **Order + token weights are a hard constraint**: `[image1=scene, tokens=low]` +
    `[image2=character, tokens=low]`, with the **composition instruction front-loaded and marked
    "most important"**. Reversed order ⇒ a **giant blurred head** pasted into the scene, or the
    character vanishing; giving the scene ref `high` ⇒ the model treats it as *the canvas* and the
    output degenerates into a **re-rendered background** with all CG-specific content lost
    (`normal` is the same failure, milder). Mnemonic: **whoever "acts as the canvas" gets the low weight.**
    Also: if the scene ref itself contains text, writing "no text" is useless — list the specific
    objects to omit (newspaper headlines / signs / slogans / labels / stamps / handwriting / house numbers).
    Full recipe + error table: `krea2-persona-sheet` §十二.
    Also: never decide CG content yourself —
    deliver a candidate list + your recommended subset and **let the user pick** (aesthetic call).
    Output: `NN_分镜画面呈现审核_v1.md` + backfill the storyboard's 类型 column
    (add the column if the later chapters' compact table lacks it).
    *Why this exists*: a 20-chapter / 117-shot storyboard shipped with **0 CG marks** — not because none were
    needed, but because nobody audited; ending chapters full of "protagonist alone" shots landed as
    a motionless background + narration.
  - **3b Script-ify**: translate the storyboard into engine instructions (`ScriptCommand[]` for `script.ts`).
- **Five rules baked into the template** (user-confirmed constraints — the first four below + the 3a2 gate):
  1. **多人同屏 (>3)**: engine auto-layouts (`game-engine.ts:318 drawAllCharacters` evenly spreads + shrinks
     width when N>3); storyboard just marks headcount N; **hard rule: all sprites must share one art height
     baseline** (e.g. 1000px) or scaled sizes diverge.
  2. **CG / performance shots**: one-shot full-frame AI image (not sprite+bg); map to `scene(cgKey)` + hide all
     chars; suggest engine add `scene.kind:'cg'` / `cg` command later.
  3. **非正面机位 (side/top/bottom angle)**: needs matching-angle sprite poses (e.g. `alice_side`); flag in Step 4.
  4. **动态表情**: expression swap is currently a hard cut; do dynamic via **`anim` sequence-frame overlay**
     (`anim play <id> <position>`, already supported) or a future fade-transition on `char`.
- Full field table, storyboard template, key-map, 4-shot→command mapping, copy-paste examples, and self-check
  in `references/step3-story-board-and-script.md`.

### Step 4 — Resource breakdown & master sheet (拆资源 + 合并去重)
- Input: Step 3 storyboard + script-ification output. Walk every shot, extract asset needs, aggregate
  by 8 categories, merge & de-dup. **This step only plans — no image generation, no engine code.**
- **Eight categories** (each a sub-table): **A. Backgrounds (incl. CG) / B. Sprites / C. Animations /
  D. Effects / E. BGM / F. SE / G. Video cutscenes (engine-supported via `video` command) /
  H. Items — pop-up zoom images (engine-supported via `item` command, see `engine-asset-catalog.md` §J)**.
  Field schemas + engine key mapping in the reference doc.
- **Engine keying fact (verified `game-engine.ts:337`)**: sprites are keyed by `pose` ONLY
  (`manifest.sprites[charId][poseKey]`); the `expression` instruction field does NOT swap the image.
  → every distinct face = its own sprite poseKey + file. Multi-angle (side/top/bottom) poses are
  separate poseKeys. Sprites must share one art-height baseline (~1000px) for N>3 auto-layout.
- **🔴 Mandatory deliverable — 立绘差分清单 (sprite-expression matrix), sub-step 4.3b.**
  Registering only each character's `default` is **an omission, not minimalism**. Re-read *every*
  storyboard for each character's 动作/表情/机位 columns and turn them into `pose_key`s, then
  bucket A/B/C (high-frequency lead ≥10 shots ⇒ 3–4 poses; key supporting 4–9 ⇒ 2; single-line ⇒ 1)
  and let the user pick the budget tier. Evidence: in story3 (shipped), **61 of 97 `char` instructions
  (63%) were expression swaps**. Pitfall: storyboards can carry **two different column layouts**
  (front chapters `人物·动作·表情` vs later chapters `人物(立绘)` + `画面内容`) — a parser written for
  one silently drops every character in the second half. A `pose_key` with no file ⇒ the character
  **silently fails to render** (no error, no crash), so either produce the art or don't reference it.
  Gate: no tier chosen ⇒ do not start Step 5 art production.
- **Live2D = reserved only (user does NOT develop it)**: it is a separate pipeline — layered
  **image-slicing (拆图)** + **bone rigging (骨骼绑定)** in Live2D Cubism, plus a Web SDK runtime the
  engine lacks. Step 4 only tags `live2d_eligible` characters in the sprite sub-table; actual
  expressiveness stays static sprites + C-class anim overlay. If ever pursued, the L0 reference art
  must be produced as separable layers.
- Merge/dedup rules, naming convention (`bg_` / `{char}_{pose}` / `anim_` / `bgm_` / `se_` / `video_`
  / `item_` + unified `{game}` prefix; items may also use `ad_`/`shop_`/`dlc_` prefixes for monetization
  tagging), per-asset prompt workflow, audio-sourcing (user-supplied, may be left
  empty but never registered in manifest if missing — 404 throws), and consistency-standard handoff
  (G1 S0 → L0/L1/L2, S1/S2/S3) all specified.
- Output: `<project>/story-wip/资源/资源总表_v1.md` + 8 category sub-tables. Frozen as v1 after user comms.
- **Sprites need transparent backgrounds**: plan the background color into the *generation prompt*
  (cyan screen), not after the fact — see `references/g1-character-consistency.md` §10.
- **Prop / document images (`item` popups)** go through a **second production line**:
  AI supplies only texture/lighting, **every character of text + every stamp is drawn with PIL**
  (a text-to-image model cannot render readable Chinese small print, and these props are usually the
  story's crux). Also: local CV-based QA (diff final vs base) instead of eyeballing coordinates.
  See `references/g2-item-art.md`.
- Full schema + mapping in `references/step4-resource-planning.md`.

### Step 5 — Asset reconciliation (资源核对)
- Input: Step 4 master sheet + actual files in `public/` + the `manifest.ts` to be filled.
- **Reconcile four things per asset**: 总表登记项 ↔ 物理文件 ↔ manifest 键 ↔ 剧本引用.
- **Engine missing-asset reality (verified in `asset-loader.ts`)** — this drives severity:
  - **Audio (BGM/SE) missing → `throw` crashes the whole game** (`loadAudio` `resp.ok=false`,
    `asset-loader.ts:87-88`). Hard red line: never register an audio key without a real file.
  - **Images (bg/sprite/anim frame) missing → silent blank** (warn + resolve empty img, no throw).
    Must be caught by engine self-check (§4.2), not by console errors.
  - **Video missing → auto-skip, no crash** (playVideo recovers on 404/play-block).
- Five check dimensions, P0/P1/P2 severities, three-layer method (static list / engine self-check /
  visual consistency), per-category checklist (A–G), pitfall list, and a copy-paste
  **核对报告模板**. All in `references/step5-asset-reconciliation.md`.
- Pass gate: **P0 = 0** and **P1 cleared or explicitly accepted** → freeze, go to Step 6.

### Step 6 — Code the game (游戏编写, storyN 四件套)
- Input: Step 3 script-ify output → `script.ts`; Step 4 master sheet → `manifest.ts` keys;
  Step 5-cleared asset files. New story = directory `story<N>` (engine auto-discovers via
  `import.meta.glob('./story[0-9]*/story.ts')` — digit-suffixed only, so `story-template/` is
  excluded). Copy `story-template/` → rename to `story<N>`. Current state: story3 only ⇒ next is
  **story4**.
- **Four files (the "四件套")**, each a copy-paste boilerplate in `references/step6-game-authoring.md`:
  1. `story.ts` — `default export StoryDef` (`id`/`title`/`subtitle`(required)/`description`/
     `titleScreen`/`getManifest`/`getScript`/`endings`). `getManifest` MUST call THIS dir's
     `placeholder.ts` fill fn (rename consistently or build breaks).
  2. `manifest.ts` — `AssetManifest` (backgrounds/sprites/animations/audio/videos?). Register
     **only real files** — audio 404 throws and crashes the whole game.
  3. `script.ts` — `ScriptCommand[]` JSON array; split long prose into many nodes; translate
    Step 3 beats 1:1 (scene/dialog/narration/char/choice/set/jump/label/if/unlock/effect/anim/
    bgm/se/video/item/end).
  4. `placeholder.ts` — `fill<Game>Placeholders()` + `MISSING_KEYS`/`PLACEHOLDERS`; clear keys
     once real PNGs land or gradients override them.
- Boilerplate has all four skeletons, a rename-consistency checklist (§4), upstream handoff
  (Step 3→script.ts, Step 4→manifest.ts, Step 5→key alignment), pitfall red lines (§6: `set`
  op only `= += -=` no `add`; loadAudio 404 throws; MISSING_KEYS override; getManifest name
  match; JSON splitting; pose-only swap; video auto-skip), and build verification (§7).

  **引擎级约定（默认即标配，无需每故事重复声明）：**
  - **首页 BGM 标配**：`showTitleScreen()` 自动播放 BGM，规则＝优先 `bgm_title` → 缺省回退 `bgm_main`
    → 再缺省首个 `bgm*` 音频 → 都为空则安全无操作。**即"首页无特殊说明即带 BGM"**；想要独立标题曲就注册
    `bgm_title`，想要静音首页则把 story 的音频里都不放 bgm（或显式不放）。
  - **标题动效**：`titleScreen.ambient` = `'rain'`（默认，无开头动画时的加分项，canvas 飘雨，零素材）
    | `'none'`（静止）。雾港等都市/雨夜题材默认 `rain`。
  - **结局提示浮层**：剧本每个结局路径必须以 `{type:'unlock',ending:<id>}` + `{type:'end'}` 收尾；引擎在
    `end` 时通过 `onEndingReached` 弹出"抵达结局"浮层（标题+简介+返回标题/查看结局收集），**避免玩家以为卡住**。
    漏写 `unlock` 则显示通用"剧终"。

  **6.5 资产查看 / 审核页（Asset Viewer）— 流程标配交付物。**
  每做完一个 story 的编写（四件套 + manifest 填好）后，**必须**用通用生成器一键产出独立的资产查看网页，
  作为审核、测试、快速定位素材的工具（不是可选项）：
  - 命令（在 `<project>/story-wip/素材/` 下运行）：
    `python gen_asset_viewer.py --story story<N> --engine <avg-engine根> [--meta <中文名json>] [--out <输出html>]`
  - 输出：`public/resource-manager-<N>.html`（当前 story5 命名为 `jianmo_asset_viewer.html`）。
  - 功能：6 个 tab（概览 / 背景 / CG / 人物 / 物证 / 音频）。浏览器用 `<img onerror>` **自动检测磁盘缺失**
    —— 红框 = 引擎会 404；任意图点开放大核对。音频状态由生成器**实测 `public/` 下文件存在性**得出
    （"待采购" = 磁盘无该文件，登记必崩），比手写静态清单可靠。
  - 数据来源：直接解析该 story 的 `manifest.ts`（backgrounds/sprites/items/audio 全部从真实清单派生，
    路径前缀也自动提取）。**无需手写、无重复劳动、素材补齐后刷新即变绿。**
  - ⚠ **路径坑（已踩过，勿回退）**：manifest 里的 url 是绝对路径（`/images/...`、`/audio/...`），
    生成器必须统一 `lstrip('/')` 转成**相对路径**再写入 HTML。原因：相对路径下本页既能**直接双击
    `file://` 打开**（无需启 dev server），也能经 dev server 访问；若写成绝对路径，dev server 关掉后
    `file://` 会把 `/images` 当成磁盘根，图片全挂。改生成器后务必**重新生成 HTML**。
  - 中文名（场景 / 角色）可选 `--meta <json>`（字段 `title` / `scenes` / `chars`）；缺省用引擎 id 兜底。
  - 贯穿用法：Step 5 资源核对用它肉眼对账缺失 → Step 6 写完后生成一次 → Step 7 测试按 tab 快速定位
    "哪张没出 / 哪张静默空白"。CG 默认按 `cg_` 前缀识别（某 story 用其他命名则改生成器或 meta）。

- Engine facts live in `references/engine-conventions.md` (don't duplicate here).

### Step 7 — Game testing (游戏测试计划)
- **Prereq**: Step 6 build green (Exit 0) + Step 5 reconciliation P0=0 + `MISSING_KEYS` cleared.
- Three-layer method: static script walk-through (every `choice`/`label`/`jump`/`if` closed) →
  **engine self-check** (`npm run dev`, browser console OPEN — image-missing is *silent blank*, only
  caught by eye) → visual pass vs storyboard.
- **7 test dimensions** (all in the reference doc, copy-paste checklists): A. Smoke/launch · B. Command
  execution (every `ScriptCommand` type used) · C. Branch coverage (choices/vars/`set` op correctness) ·
  D. Ending collection (every `unlock` fires, persists, album+detail modal work) · E. Save/load
  (mid-game save, restore, no title-screen stall / bg loss) · F. A/V (transitions/grade/weather/effect/
  anim/video-skip/item-popup/bgm-fade) · G. Asset rendering (no silent blanks, sprite ratio, N>3 auto-layout, CG cover).
- **Regression suite R1–R10**: re-test every historically-fixed engine bug (loadAudio 404 throw,
  MISSING_KEYS override, fadeOutBgm volume residue, restoreFromSave title/bg bugs, video-skip bubble,
  set `add` bug, ending-modal z-index, default-story-no-endings, safe-delete build block) so they don't recur.
- Pass gate: A–E P0=0, F/G P1 cleared/accepted, R1–R10 all pass → Step 8. Any P0 → back to Step 6.
- Includes a copy-paste **测试报告模板** (per-dimension score + issue list + regression + tuning log).

### Step 8 — Finalize / acceptance (游戏完成判定与交付)
- **Prereq**: Step 7 test report passed (A–E P0=0, F/G P1 accepted, R1–R10 pass).
- **6 acceptance dimensions** (reference doc, checklists): A. Final asset audit (every manifest key has a
  real file; `MISSING_KEYS`/`PLACEHOLDERS` cleared — no gradient placeholders lingering) · B. Build & launch
  (`build` Exit 0, `dev` 200, no console error) · C. Test sign-off (Step 7 report + client ack) ·
  D. Version backup (`git tag` semantic version, push) · E. Release decision (static `dist/`, hosting,
  asset size) · F. Deliverables archive (dist + 4-file source + story-wip + reports + G1 consistency doc).
- **Definition of Done (DoD)**: 7 hard gates all met → game is "done"; any unmet → back to the step.
- Includes a copy-paste **完成报告模板** (DoD check + asset stats + endings/branches + known-leftover +
  deliverables). Genre only fills counts/names, never drops the DoD gates.
- **Env note** (not a game bug): safe-delete blocks Vite `.vite` purge and `dist` clean — engine already
  set `optimizeDeps.disabled:true` + `build.emptyOutDir:false`; don't revert before tagging.

## Engine Structure & Conventions (must-know)

- **Auto-discovery**: engine globs `./story[0-9]*/story.ts` — **digit-suffixed only**. A plain
  `./story*/story.ts` would also match `story-template/` (its `story.ts` exports a valid `StoryDef`
  「我的故事」), making the scaffold appear as a playable game. New stories MUST be `story<N>`;
  copy `story-template/` and rename. story1/story2 were deleted (2026-09-04); story3 is the current
  game ⇒ next is **story4**.
- **`set` op values** are only `'=' | '+=' | '-='` — **there is no `'add'`** (an `op:'add'` silently
  behaves as `'='`, breaking accumulation).
- **`manifest.ts`** registers real asset paths (bg under `/images/bg/...`, sprites/audio under
  `/images/sprites/`, `/audio/`). `loadAudio` **throws on 404** (not a safe skip) — a manifest
  entry without the file crashes startup.
- **`placeholder.ts`** uses a **hardcoded `MISSING_KEYS` set** that overrides real files with
  gradient placeholders. After dropping real PNGs in, you MUST clear the key from `MISSING_KEYS`
  (and the `PLACEHOLDERS` map) or the game keeps showing gradients.
- **Endings**: `unlock` instruction + `EndingDef` + localStorage persistence (isolated per
  storyId) + album panel/detail modal in `ui-manager.ts`.

## Asset Generation — CloudStudio Scheme (Scheme A, default)

> This section details **Scheme A** from the kickoff table above. For Scheme B (local ComfyUI) or
> C (prompt-only), skip the cloud-specific quirks but keep **S0 (style + model experiment + Style
> Block) → L0-card-first rule + consistency checks (G1)**.

- Cloud ComfyUI (CloudStudio) is reached through a **local bridge proxy at `127.0.0.1:8188`**;
  never put the https URL in `COMFY_URL`. The pipeline `scripts/comfy_pipeline.py`
  (`build_bg_wf`, `BG_JOBS`) drives z-image-turbo txt2img backgrounds; `gen_l0_onepass.py` drives
  the L0 four-panel character cards (see G1 §3).
- Cloud quirks: the user-given preview port (e.g. 9000) may 404 at the gateway — the real
  ComfyUI port is usually **8188**; the `/history/{pid}` single-id endpoint often returns empty
  on this deployment, so download via a **full `/history` prefix scan** instead.

## Hard Constraints (this sandbox)

- **safe-delete blocks all deletions** → keep `optimizeDeps.disabled: true` and
  `build.emptyOutDir: false` in `vite.config`.
- See `references/engine-conventions.md` for the full pitfall checklist before coding.

## Resources

- `scripts/gen_asset_viewer.py` — **资产查看 / 审核页生成器（Step 6.5 标配交付物）**. 读
  `story<N>/manifest.ts` 一键生成 `public/resource-manager-<N>.html`：6 个 tab 分类（概览/背景/CG/人物/物证/音频）＋
  浏览器 `<img onerror>` 自动检测磁盘缺失（红框＝引擎 404）＋ 点击放大；音频状态实测 `public/` 下文件存在性。
  中文名（场景/角色）经可选 `--meta <json>` 提供（`title`/`scenes`/`chars`），缺省用引擎 id 兜底。
- `references/pipeline-overview.md` — **8 步流水线总览与索引（入口文档，先读它）**. Global flow
  diagram + the two-level Step → sub-step (`x.y`) execution checklists for all 8 steps, the G1
  consistency side-branch (S0 + L0/L1/L2 + S1/S2/S3), the gate & rollback rules table, and a doc index.
- `references/example-walkthrough.md` — **脱敏小范例（仅示意，非模板）**. One mini-slice flowing
  Step 1 → 3 → 4: filled design skeleton → 3 storyboard rows → translated `ScriptCommand[]` → derived
  resource rows. Desensitized (no real paths/dates/tooling). Shows *structure* to reuse, not content.
- `references/step1-story-design.md` — **Step 1 故事设计（通用骨架）**. Tool-not-template
  positioning: structure container + mechanism paradigms only, zero genre assumptions. Contains the
  universal skeleton field table, the **fixed presets the user never has to decide** (web platform,
  1280×720 design base, 1920×1080 bg / 900–1100px sprite / 2048×1024 L0 card output specs, and
  BGM/SE/voice as standard reserved-but-optional items with the "missing audio must not be
  registered in manifest.ts" rule), the genre-agnostic variable/branch/ending paradigms, and an
  *optional* per-genre element checklist (pure-love / horror / mystery / healing / fantasy) as
  thinking prompts — not mandatory fields. Read this FIRST when starting any new game.
- `references/step2-story-audit.md` — **Step 2 故事审核（通用标准）**. Audits the Step 1 story
  draft (v0.x narrative layer), **not the engine script** (script-ify is Step 3). Contains the
  **27-item / 5-dimension universal standard** (Plot 6 / Logic 6 / Character 6 / Pacing 4 /
  Emotion 5) with operational checks, a P0/P1/P2 severity scheme, the two-round review flow
  (v0.2 → revise → v0.3), and a copy-paste **审核报告模板**. Genre only shifts item *weight*,
  never drops the P0 baseline items.
- `references/step3-story-board-and-script.md` — **Step 3 分镜设计 + 剧本化**. Splits Step 3 into
  **3a Storyboard** (shot table: 11 base dims + shot-specific cols: Shot#/景别/机位/构图/运动/时长/转场/意图)
  and **3b Script-ify** (storyboard → `ScriptCommand[]`). Bakes in the 4 user-confirmed shot rules:
  multi-char auto-layout + uniform sprite-height baseline, CG/performance full-frame shots (one-shot
  AI art, `scene(cgKey)`+hide chars, suggest `kind:'cg'`), non-frontal angle poses, and dynamic
  expressions via `anim` overlay or future fade-transition. Has key-map, 4-shot→command mapping,
  copy-paste examples, self-check list, Step 4 handoff, and engine extension suggestions.
- `references/step4-resource-planning.md` — **Step 4 资源拆解与合并去重总表**. Input = Step 3
  storyboard + script-ify output. **Eight** resource categories (Backgrounds incl. CG / Sprites /
  Animations / Effects / BGM / SE / **Video cutscenes (engine-supported)** /
  **Items pop-up zoom (engine-supported, `item` instruction)**) each with a field schema +
  verified engine-key mapping. Key facts: sprites keyed by `pose` only (`game-engine.ts:337`), so
  every distinct face = its own poseKey+file; multi-angle poses are separate keys; uniform ~1000px
  sprite-height baseline for N>3 auto-layout. **Live2D documented as reserved-only** (needs image
  slicing + bone rigging + Web SDK — user decided 2026-09-04 NOT to develop it: "改动太大"; tagged
  `live2d_eligible` only). **Video cutscenes are engine-supported** (`video` instruction → fullscreen
  DOM `<video>` overlay, click-to-skip, auto-skip on play-block/404). **Items pop-up zoom is also
  engine-supported** (`item` instruction → `manifest.items[id]` → fullscreen semi-transparent overlay
  with centered enlarged `<img>` + optional `caption`, click-to-close, 404 shows 「（物件图片缺失）」
  placeholder and still closes without crashing — distinct from video in that the popup is NOT
  auto/快进-skipped, forcing the player to open & view it). Details + monetization hooks in
  `engine-asset-catalog.md` §J. Includes merge/dedup rules, naming
  convention (`bg_`/`{char}_{pose}`/`anim_`/`bgm_`/`se_`/`video_`/`item_` + `{game}` prefix), per-asset prompt
  workflow, audio-sourcing (may be left empty but never registered if missing — 404 throws),
  consistency-standard handoff to G1 (S0 + L0/L1/L2, S1/S2/S3), and output layout
  (`<project>/story-wip/资源/资源总表_v1.md` + 8 sub-tables).
  **★ §4.5 立绘差分清单 is a mandatory deliverable** (sub-step 4.3b): the 4-step method
  (反查 storyboard action/expression columns → 归并 into `pose_key`s → A/B/C bucket → name),
  the two-column-layout pitfall, the output template, and the gate (no user-chosen tier ⇒ no Step 5).
  Dedup (§4) must run **after** the matrix is built, never before.
- `references/step5-asset-reconciliation.md` — **Step 5 资源核对清单**. Reconciles 总表项 ↔ 文件 ↔
  manifest 键 ↔ 剧本引用 across 5 dimensions. **Engine missing-asset reality is the backbone**
  (verified `asset-loader.ts`): audio 404 → `throw` crashes whole game (hard red line: never
  register audio without a real file); images missing → silent blank (caught only by engine
  self-check, not console); video missing → auto-skip. Includes P0/P1/P2 severity, three-layer
  check method (static list / `npm run dev` engine self-check / visual consistency), per-category
  A–G checklist, pitfall list (audio-throw, silent-image, sprite-key typo, sprite-height baseline,
  video-skip, item-404-placeholder), and a copy-paste 核对报告模板. Pass gate: P0=0 & P1 cleared/accepted.
- `references/step6-game-authoring.md` — **Step 6 游戏编写四件套 boilerplate**. The four files
  `story.ts`/`manifest.ts`/`script.ts`/`placeholder.ts` as copy-paste skeletons, the new-story
  procedure (dir `story<N>` → copy → rename-consistency), a full rename checklist (§4: `<Game>`
  naming across 4 files, `getManifest` must call THIS dir's placeholder fn, `subtitle` required,
  manifest-key ↔ script-ref ↔ Step4-sheet triple-align, audio-only-if-file), upstream handoff
  (Step 3→script.ts, Step 4→manifest.ts, Step 5→key-align), pitfall red lines (§6: `set` op only
  `= += -=` no `add`; loadAudio 404 throws; MISSING_KEYS override; getManifest name match; JSON
  splitting; pose-only swap; video auto-skip; item popup not auto-skipped), and build verification (`npm run dev`/`build`).
- `references/step7-game-testing.md` — **Step 7 游戏测试计划**. Prereq gate (build green + Step5 P0=0 +
  MISSING_KEYS cleared). Three-layer method (static walk-through / `npm run dev` engine self-check with
  console open / visual vs storyboard). **7 test dimensions** A–G each with a copy-paste checklist
  (smoke · command-exec · branch-coverage · ending-collection · save-load · A/V · asset-render). A
  **regression suite R1–R10** re-tests every historically-fixed engine bug (loadAudio 404 throw,
  MISSING_KEYS override, fadeOutBgm residue, restoreFromSave title/bg, video-skip bubble, set `add`,
  ending-modal z-index, default-story-no-endings, safe-delete block). Pass gate: A–E P0=0, F/G P1
  cleared/accepted, R1–R10 pass. Includes a copy-paste 测试报告模板. Genre only fills branch/ending
  names, never drops the P0 baseline.
- `references/step8-finalize.md` — **Step 8 完成判定与交付**. Prereq = Step 7 report passed. **6 acceptance
  dimensions** A–F (final asset audit with `MISSING_KEYS`/`PLACEHOLDERS` cleared + no gradient leftover,
  build & launch, test sign-off, git semantic tag, release decision for static `dist/`, deliverables archive).
  **Definition of Done** = 7 hard gates; any unmet → back to step. Copy-paste 完成报告模板 (DoD + asset
  stats + endings/branches + known-leftover + deliverables). Env note: safe-delete blocks `.vite` purge and
  `dist` clean — engine keeps `optimizeDeps.disabled:true` + `build.emptyOutDir:false`, don't revert.
- `references/engine-conventions.md` — detailed engine facts, the story3 four-file template, and
  the consolidated pitfall list (safe-delete, CloudStudio ports, history endpoint, placeholder
  override, loadAudio 404, JSON-instruction splitting, effect/system fixes already applied).
- `references/engine-asset-catalog.md` — **full capability inventory beyond images/audio**: the
  7 transitions, 5 grades, 5 weather types, 8 screen effects, character entrance/exit & zoom
  animation, sequence-frame `anim` + `AnimationDef`, `bgm`/`se` audio, and the `unlock` endings
  system. Use it as the checklist when landing a scripted chapter into `script.ts`.
- `references/g1-character-consistency.md` — **character art consistency**. Pipeline order is
  **S0 → L0 → S1/S2/S3 → batch poses**. **S0 (§2.5) is step zero and must run before any L0**: define
  the style keyword table, run a **model-selection experiment** (same test prompt + same seed across
  candidate models — z-image-turbo / SDXL / FLUX — scored on style fit, identity stability, multi-panel
  layout adherence, cost), then freeze a **Style Block** of three reusable chunks (`STYLE_POSITIVE` /
  `STYLE_NEGATIVE` / `STYLE_PARAMS`) that every later prompt is composed from. **The pipeline is
  genre-agnostic but the style is not**: never reuse a previous game's style words or params — a new
  art style means re-running S0, and mixing two Style Blocks is the top cause of style drift.
  Then: **L0 four-panel reference card = one per character, the first real asset step**, the three-layer
  reference assets (L0 / L1 expression sheet / L2 outfit variants), the script-driven pipeline (lock L0
  early, derive L1/L2/pose batches from the script breakdown), the **verified fill-in prompt template**
  (2048×1024, global angle constraint + profile-side wording that makes the side view actually appear —
  adapt the {appearance/outfit} parts per character & per game art style), the S1/S2/S3 recommendations
  (color swatch / key-pose precheck / naming convention), and the landing checklists (item 0/0.1 = S0
  gate). Read this before generating any character art.
- `references/g2-item-art.md` — **prop / document images (the `item` popup art)**. The one rule that
  matters: **the AI generates texture only; every piece of text, every stamp, every tick and red circle
  is drawn locally with PIL**. Covers why (a text-to-image model renders Chinese small print as
  garbled strokes — and writing "no stamp" in the prompt *makes it draw one*), the two production
  lines (pure text-overlay vs. hybrid PIL-composed layout for newspapers/forms), the
  text/typography split across `gen_items.py` / `item_texts.py` / `item_art.py`, and the pitfalls:
  per-character spacing silently breaking alignment anchors, `✓` having no glyph in simkai, and the
  two generation-side traps (prefix-only output matching silently returning the *previous* run's image —
  always match on `prompt_id`; back up old images with `os.replace`, never delete). Also specifies
  **objective QA by image differencing** (final − base = your ink) because eyeballing coordinates on a
  downscaled preview is off by 100px+.
  **★ §4.1 (page geometry) is the highest-value section** — it separates *tilt* (parallel edges; the
  whole text layer can be rotated to match) from *perspective* (trapezoid; rotation **cannot** fix it,
  because text can never hug both the near and far edges at once), and gives the measured
  tilt/perspective table for all 15 props. **It also opens with a mandatory user decision**: framing
  is an *aesthetic* call and is irreversible (changing it means re-shooting every base and
  re-laying out everything), so **show the user the A/B comparison before generating any base** —
  never decide it yourself. (Our own mistake here: we pushed the flat straight-on shot because it is
  objectively sharper — page coverage **24.5% → 95%**, page pixels **×3.9** — and the user rejected it:
  the tilted one *"更有感觉、更真实"*. The crux of an evidence prop is **looking like a real old
  object**, not being legible; sharpness can be recovered by layout, texture cannot.) The three routes
  are **A** re-shoot flat (sharpness-first), **B** keep the tilt and rotate the text layer
  (**default**, cost-free, the one chosen for 雾港回声), **C** homography warp via `persp.py`
  (`solve_quad` / `paste_quad`, pure-PIL — no numpy/scipy/cv2 in this environment, and `Image.MESH`
  is the wrong direction) only when grid lines are the visual subject. Read this before generating
  any prop/document art.
- `references/g1-character-consistency.md` — **§10 covers sprite matting** (transparent background) —
  it is a sub-step of character art, **not a standalone stage**: plan a cyan
  background into the generation prompt, then chroma-key locally with PIL; 4 dead-end generations are
  documented so you don't retry them, and **AI matting (RMBG/BiRefNet) is a 🟡 deferred upgrade** —
  finer on hair & semi-transparent edges, currently blocked by model-weight/env limits.
