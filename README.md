# avg-game-maker

一个 WorkBuddy **用户级 Skill**：把 WorkBuddy 变成「AVG（文字冒险/视觉小说）游戏制作搭档」，通过一套**严格的 8 步流水线**和人类协作产出一款可玩的 AVG 游戏。

引擎是独立的 TS + Vite 项目 `avg-engine`（游戏内容自动发现 `src/game/storyN/` 目录）。本 skill 不绑定具体故事，方法通用。

---

## 目录结构

```
avg-game-maker/
├── SKILL.md                # 主入口：8 步流水线、角色分工、资产方案、红线
├── references/             # 14 篇深度文档（每步 1 篇 + G1/G2 专项 + 总览）
│   ├── pipeline-overview.md
│   ├── step1-story-design.md … step8-finalize.md
│   ├── g1-character-consistency.md   # 立绘一致性（侧身/差分/抠图/头部尺度）
│   ├── g2-item-art.md                # 物件图产线（透视贴图/排版/校验）
│   ├── engine-conventions.md         # 引擎坑与约定
│   └── engine-asset-catalog.md
├── scripts/                # 21 个通用 Python 工具（见下，已脱敏泛化）
├── companion-skills/       # 7 个出图配套 skill（已脱敏，本机路径→占位符）
│   ├── qwen-standee/SKILL.md         # 【★推荐 / 当前最稳定】AutoDL + Qwen-Image-2.1 写实立绘/设定表
│   ├── krea2-persona-sheet/SKILL.md  # 人物资产参考图 / 角色设定表（Krea2）
│   ├── krea2-scene-sheet/SKILL.md    # 同一场景多角度参考图
│   ├── krea2-local-inpaint/SKILL.md  # Krea2 出图后局部重绘（inpaint）
│   ├── sprite-matte-local/SKILL.md   # 本地 rembg 抠图 → 引擎透明 sprite
│   ├── zimage-turbo-anime/SKILL.md   # z-image-turbo 动漫风出图经验
│   └── comfy-cloud-mcp/SKILL.md      # 本地 bridge 调用云端 ComfyUI
├── workflows/              # 出图工作流（本地 JSON + 提交脚本，非云端）
│   ├── comfyui-api-A10.json          # z-image-turbo 文生图（story3 动漫少女）
│   ├── krea2_charsheet_real.json     # Krea2 真人版角色表
│   ├── krea2_charsheet_anime.json    # Krea2 + 二次元 LoRA 角色表
│   ├── Krea2_Turbo_文生图_成功配置.json  # Krea2 完整成功配置
│   ├── krea2_wf.json                 # Krea2EditRebalance 改图流
│   ├── comfy_krea2_sheet.py          # 云端提交脚本（角色表）
│   ├── comfy_krea2_scene.py          # 云端提交脚本（场景）
│   └── assetref_kit/                 # 场景参考图工具包（krea2-scene-sheet 依赖）
├── cloud-setup.md          # 云端/本地 ComfyUI 准备清单（模型/节点/部署）
└── avg-engine-example/     # 引擎 + 2 故事干净快照（含 story3+story5(jianmo)+public 资源，~527MB）
```

> **脱敏说明**：`SKILL.md` / `references/` / `companion-skills/` / `workflows/*.py` 中所有作者本机路径
>（`E:\myprogram\...`、`C:\Users\Administrator\...`）已统一替换为 `<avg-engine>` / `<project>` / `<home>` 占位符。
> **模型文件与作者的云端不会随包分发**——出图所需的模型见 `cloud-setup.md`，需使用者自备。

---

## 安装

本 skill 是标准 WorkBuddy skill 格式（`SKILL.md` + 资源目录）。两种装法：

1. **手动放置（推荐）**：把本仓库 clone 后，整个文件夹改名为 `avg-game-maker`，放到
   - Windows：`C:/Users/<你>/`.workbuddy/skills/avg-game-maker/`
   - macOS/Linux：`~/.workbuddy/skills/avg-game-maker/`
   重启 WorkBuddy 即生效。
2. **WorkBuddy 导入**：若你的版本支持从本地/市场导入 skill，按对应入口加载本目录即可。

---

## 依赖的配套 Skill（已随包提供，无需另装）

`avg-game-maker` 在「出图」环节会指向以下独立 skill，本包已将它们放在 `companion-skills/`（已脱敏）。**当前推荐 `qwen-standee`（Qwen-Image-2.1）为最稳定方案；其余方案互不影响，用户按自身云端算力、模型获取与画风需求任选。**

| Skill | 用途 | 包内路径 |
|---|---|---|
| `qwen-standee` | **【★推荐 / 当前最稳定】** AutoDL + Qwen-Image-2.1 写实立绘：设定表四视图 → 半身 → RMBG 抠透明，含 ArcFace 数字验收 | `companion-skills/qwen-standee/SKILL.md` |
| `krea2-persona-sheet` | 人物资产参考图 / 角色设定表 / 单人立绘（Krea2 方案） | `companion-skills/krea2-persona-sheet/SKILL.md` |
| `krea2-scene-sheet` | 同一场景多角度参考图（避免场景漂移） | `companion-skills/krea2-scene-sheet/SKILL.md` |
| `krea2-local-inpaint` | Krea2 出图后局部重绘（inpaint）闭环 | `companion-skills/krea2-local-inpaint/SKILL.md` |
| `sprite-matte-local` | 本地 rembg 抠图 → 引擎透明 sprite（云端 RMBG 不可用时的兜底） | `companion-skills/sprite-matte-local/SKILL.md` |
| `zimage-turbo-anime` | z-image-turbo 动漫风出图三条硬经验 | `companion-skills/zimage-turbo-anime/SKILL.md` |
| `comfy-cloud-mcp` | 通过本地 bridge 调用云端 ComfyUI 出图/查模型 | `companion-skills/comfy-cloud-mcp/SKILL.md` |

> ⚠️ **配套 skill 不绑定作者的云端**：它们只描述方法 + 工作流。**模型文件、ComfyUI 服务、云端实例地址都要使用者自己准备**——详见 `cloud-setup.md`。作者的云端实例地址是运行期向用户索取的，不写死在包里。

> 出图方案**不强制**用上述 Krea2/ComfyUI 方案——`SKILL.md` 第 27 行起明确要求「开工前先确认用哪种出图方案」，选好再适配即可。

---

## 出图工作流与云端准备（`workflows/` + `cloud-setup.md`）

- **工作流 JSON 在本地，不在云端**：`workflows/*.json` 是 ComfyUI API 格式工作流，直接 POST 到 `127.0.0.1:8188`（云端桥接或本地 ComfyUI 皆可）。
- **提交脚本**：`workflows/comfy_krea2_sheet.py`（角色表）、`comfy_krea2_scene.py`（场景），用法见各自 `--help`。
- **云端/本地需要准备什么**：模型清单（Krea2 三件套 + z-image 三件套 + LoRA）、自定义节点、采样参数、本地 ComfyUI 部署步骤——全部写在 **`cloud-setup.md`**。没有作者云端的人，按该文件自备即可跑通。

---

## 引擎示例（`avg-engine-example/`）

本包附带一份**引擎 + 2 个完整故事的干净快照**（已排除 `node_modules/dist/.git` 与构建验证垃圾、以及出图/诊断中间产物，约 527MB），让你开箱即玩、对照学习：

- 引擎：TS + Vite 的 AVG 引擎（`index.html` / `src/engine` / `src/ui` / `src/game`）
- 故事：`src/game/story3`（校园日系《樱色未央》，4 结局）+ `src/game/story5`（悬疑《缄默回廊》/jianmo，多结局）——`story4`（《雾港回声》）已排除（见 `.gitignore`）
- 资源：`public/`（132 张图 + 23 个音频 wav）

运行方式（在 `avg-engine-example/` 内）：
```bash
npm install      # 首次需装依赖（不随包，需联网）
npm run dev      # 启动后开 http://localhost:3000 试玩
# 或 npm run build && 把 dist/ 丢到任意静态托管
```

> 引擎会自动发现 `src/game/storyN/` 目录，无需改 `index.ts`。要加新故事，照 `references/step6-game-authoring.md` 的「四件套」范式新建 `storyN/` 即可。

---

## 路径占位符约定

文档与脚本里的占位符含义：

| 占位符 | 含义 |
|---|---|
| `<avg-engine>` | 你的 avg-engine 仓库根（TS+Vite 引擎） |
| `<project>` | 你的工作文件根（故事草稿/剧本化/素材脚本所在） |
| `<project>/story-wip/素材/` | 出图/体检/查看页等 Python 脚本的存放目录 |
| `<game>` | 当前游戏代号（如原项目 `雾港回声` 的实例值 `fogport`） |
| `<story>` | 当前故事目录名（引擎里 `storyN` 的 N） |

---

## scripts/ 脚本用途索引（21 个，均为通用工具）

| 脚本 | 用途 | 所属环节 |
|---|---|---|
| `gen_asset_viewer.py` | 生成自包含「资产查看/审核网页」（背景/CG/立绘/物证/音频 tab，缺失自动标红） | Step 6.5 标配交付物 |
| `comfy_pipeline.py` | ComfyUI 文生图流水线驱动（背景批量出图） | Step 5 出图 |
| `gen_l0_onepass.py` | 角色 L0 四宫格卡（首张真人设资产） | S0/L0 |
| `download_by_prefix.py` | 按前缀扫描云端 `/history` 批量下载产物 | 云端出图 |
| `gen_items.py` | 物件图底图文生图 | G2 物件 |
| `item_texts.py` | 物件叠字文案唯一真源（逐字从剧本摘录） | G2 物件 |
| `item_art.py` | 物件排版（坐标/字体/做旧/透视贴图） | G2 物件 |
| `persp.py` | 单应变换（透视贴图）引擎 | G2 物件 |
| `verify_items.py` | 物件墨迹越界客观校验 | G2 物件 |
| `measure_quad.py` | 量纸面四角/倾斜 | G2 物件 |
| `probe_item.py` | 量底图几何（亮区/格线） | G2 物件 |
| `demo_flat.py` | 透视/正拍落位差异演示 | G2 物件 |
| `check_matte.py` | 立绘 alpha 体检（四角/边框/透明占比） | G1 立绘 |
| `matte_local.py` | 抠图主程序（青/绿/灰/浅底自动判定） | G1 立绘 |
| `make_matte_compare.py` | 三联对比图（原图/透明/贴深底） | G1 立绘 |
| `gen_bust_cyan.py` | 青幕立绘批量出图 | G1 立绘 |
| `measure_sprite_frame.py` | 量立绘头部尺度（top%/bottom%/宽%，防换图变大变小） | G1 立绘 |
| `audit_script_health.py` | 剧本体检（HIDE-NO-SHOW / SHOW-TWICE / 缺登场） | Step 6 体检 |
| `audit_sprite_usage.py` | 剧本用到的 (id,pose) ↔ 落位 sprite 对账 | Step 6 体检 |
| `synth_se.py` | 纯标准库合成音效 WAV（无 numpy 依赖） | Step 5 音频 |
| `gen_se.py` | 音效生成入口 | Step 5 音频 |

> **实例性质声明**：`scripts/` 源自《雾港回声》实际生产，算法通用，但默认路径/示例数据指向原项目（已泛化为 `<avg-engine>`/`<game>`/`<project>` 占位符）。**运行前请把占位符替换成你的实际路径/游戏名**，或改用各脚本的命令行参数（`python <脚本> --help` 查看）。其中 `gen_asset_viewer.py`、`comfy_pipeline.py`、`gen_l0_onepass.py`、`download_by_prefix.py`、`gen_bust_cyan.py` 是参数化、可直接使用的核心工具。

> 另有 3 个原项目实例脚本（`reconcile_assets.py`、`gen_pose_wiring.py`、`gen_side.py`）因深度耦合《雾港回声》项目结构（写死 `E:\myprogram`、依赖项目内私有模块），**未纳入本包**；其方法论已完整写进 `references/g1-character-consistency.md`、`g2-item-art.md` 及 `krea2-persona-sheet` skill，自行按项目结构适配即可。

---

## 8 步流水线速览

写故事 → 审核(27项) → 剧本化 → 拆剧本+统资源 → 资源核对 → 编写(四件套) → 一起测试 → 完成判定与交付。

引擎自动发现 `storyN/` 目录；需 4 文件：`story.ts`(默认导出) / `manifest.ts` / `script.ts` / `placeholder.ts`。

---

## 许可证

按原项目约定：本 skill 仅供学习与个人创作使用，出图模型与第三方服务请遵守各自许可。
