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
└── scripts/                # 21 个通用 Python 工具（见下）
```

---

## 安装

本 skill 是标准 WorkBuddy skill 格式（`SKILL.md` + 资源目录）。两种装法：

1. **手动放置（推荐）**：把本仓库 clone 后，整个文件夹改名为 `avg-game-maker`，放到
   - Windows：`C:/Users/<你>/`.workbuddy/skills/avg-game-maker/`
   - macOS/Linux：`~/.workbuddy/skills/avg-game-maker/`
   重启 WorkBuddy 即生效。
2. **WorkBuddy 导入**：若你的版本支持从本地/市场导入 skill，按对应入口加载本目录即可。

---

## 依赖的配套 Skill

`avg-game-maker` 在「出图」环节会指向以下独立 skill，需另行安装：

| Skill | 用途 |
|---|---|
| `krea2-persona-sheet` | 人物资产参考图 / 角色设定表 / 单人立绘（Krea2 方案） |
| `krea2-scene-sheet` | 同一场景多角度参考图（避免场景漂移） |
| `comfy-cloud-mcp` | 通过本地 bridge 调用云端 ComfyUI 出图/查模型 |

> 出图方案**不强制**用上述 Krea2/ComfyUI 方案——`SKILL.md` 第 27 行起明确要求「开工前先确认用哪种出图方案」，选好再适配即可。

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
