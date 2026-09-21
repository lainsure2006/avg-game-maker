# Step 6 完成报告 — 《缄默回廊》

> 8 步流水线：写故事 → 审核 → 剧本化 → 拆资源 → 核对 → 编写 → 测试 → 完成。
> 本报告对应 **Step 6 游戏编写**（落盘 story5 四件套 + 资产落位 + 构建审计）。

## 1. 结论

✅ **Step 6 完成**。新增游戏《缄默回廊》以 **story5** 槽位落盘，引擎自动注册（`import.meta.glob('./story[0-9]*/story.ts')`），`vite build` 通过（26 模块），静态审计通过（270 指令 / 37 标签 / 8 CG / 4 结局）。可进入 **Step 7 测试**。

## 2. 关键决策（与历史对账）

| 项 | 结论 |
|---|---|
| 槽位 | story4 已被《雾港回声》占用 → 本作落 **story5**（不破坏既有，符合全局编号） |
| 资源前缀 | `jianmo`，物理隔离 `public/images/{bg,sprite,items}/jianmo/` + `public/audio/jianmo/`，根治多游戏 key 撞车 |
| BGM 6 | 全缺 → **manifest.audio 不登记**（loadAudio 遇 404 会 `throw` 崩溃）；剧本 `bgm` 指令保留为无害 no-op（playBgm 未注册 id 直接 return） |
| 物件 6 | 未产 → 仍登记 `manifest.items`，引擎显示「物件图片缺失」内联占位（可关闭，不崩） |
| CG 替换 | 章节 + bg 双键映射，引擎**换景即清台**，无需手动 hide |

## 3. 落盘清单

### 3.1 代码（src/game/story5/）
| 文件 | 内容 |
|---|---|
| `story.ts` | StoryDef：id=`jianmo`，首页 `bg_pier_dusk` + `ambient: rain`，4 结局注册 |
| `manifest.ts` | 23 背景/CG 键 + 7 立绘 + 6 SE + 6 item 占位 + 空 animations |
| `script.ts` | 270 条 ScriptCommand（生成器产出，见 §5） |
| `placeholder.ts` | 空 MISSING_KEYS（图片 100% 落位，物件走引擎内联占位） |

### 3.2 资产（public/，已 verify）
| 类别 | 数量 | 状态 | 落位路径 |
|---|---|---|---|
| 背景 | 15 | ✅ | `public/images/bg/jianmo/` |
| CG | 8 | ✅ | 同上（同通道） |
| 立绘 | 7 pose / 4 角色 | ✅ | `public/images/sprite/jianmo/` |
| SE | 6 | ✅ | `public/audio/jianmo/` |
| 物件 | 6 | ⚠️ 未产（P2） | 登记键，src 缺失 → 占位 |
| BGM | 6 | ⚠️ 未产（P2） | 不登记，剧本 no-op |

> 背景 pier_dusk / reef / cliff 落盘为 `__16x9` 裁切版；corridor / reveal_hall 取 `__00002_` 最新版；立绘均经本机 rembg 抠图 + 1080×1080 归一化。

## 4. 4 结局判定链（解锁条件）

| 结局 | 条件（脚本 Ch12 判定链） | 代表画面 |
|---|---|---|
| `ending_hidden` 接过那支笔 | `found_parent==1 && clue>=6 && trust_s>=2` | cg_parents_cliff |
| `ending_true` 回廊听见 | `clue>=6 && trust_s>=2 && found_parent==0` | cg_truth_hall |
| `ending_wrong` 错告 | `report_flag==1 && clue<6` | bg_corridor_dark |
| `ending_normal` 雾未散 | 其余兜底 | cg_departure |

> `clue` 计数自洽：①Ch4 + ②Ch6(银镯+老K矛盾) + ④Ch8(旧照) + ⑤Ch9(物证袋) + ⑦Ch10(身份揭穿补丁) = 6；`found_parent=0` 时可达 6，矛盾已解（Ch10 +1 执行层补丁）。

## 5. 脚本生成（可复现）

| 脚本 | 作用 |
|---|---|
| `story-wip/素材/gen_jianmo_script.py` | 解析剧本化_Ch1-6.md + Ch7-12.md 的 ```json 块，按序拼接（init+ch01-06+Ch5末 trust_s 补丁+ch07-12），应用 8 处 CG 替换 + bgm_tense→bgm_tension 归一 |
| `story-wip/素材/audit_jianmo.py` | 静态审计：label 闭合 / 4 结局 unlock 一致 / char 平衡 / set op 合法 / CG=8 / bgm 归一 / 变量覆盖 |
| `story-wip/素材/deploy_jianmo_assets.py` | 背景/CG/立绘去 JM_ 前缀、取目标名复制到 public/ |
| `story-wip/素材/gen_jianmo_viewer.py` | 资产对账查看页（6 类 + 状态徽章） |

## 6. 已知 P2 项 / 风险

1. **物件 6 未产**：`medical_cover / medical_sign / silver_bracelet / old_photo / evidence_bag / parents_badge` 当前显示「物件图片缺失」占位，需走 G2 产线（AI 底图 + PIL 叠字）后落地 `public/images/items/jianmo/`。
2. **BGM 6 缺失**：剧本内 bgm 指令为 no-op，需用户凭 `BGM_精细提示词.md` 出曲后：① 放 `public/audio/jianmo/bgm_*.wav` ② manifest.audio 补键 ③ 剧本即生效。
3. **对话为锚点级**：Ch7–12 正文为【锚点】标注，待 Step 1 扩写替换完整台词（Step 3 已声明，不影响当前可玩骨架）。
4. **第三方资源**：主角「你」无立绘/CG 不露脸（第一视角/背影/空镜），已锁定。

## 7. 下一步

→ **Step 7 测试**：引擎实跑 story5，验证 ① 4 结局可达性 ② 换景清台效果 ③ CG 替换观感 ④ 物件占位不崩 ⑤ SE 播放 ⑥ 首页飘雨。测试通过即 Step 8 完成（无变现计划，物品/视频仅游戏内叙事）。
