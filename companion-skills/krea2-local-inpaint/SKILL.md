---
name: krea2-local-inpaint
description: Krea2 出图后的「局部重绘 / inpaint」闭环——当 AI 读不了出图、无法定位要改的区域时，把蒙版标记交还给用户手绘，再由脚本跑云端 inpaint。配套 mask_editor.html（浏览器手绘蒙版）+ comfy_inpaint.py（上传原图+蒙版跑 Krea2 VAEEncodeForInpaint）。覆盖白=重绘/黑=保留、alpha 陷阱、羽化防色晕、denoise 调参、文件名哈希防缓存、CloudStudio 端点重启变更、429 限流等全部已知坑。适用于"出图大体对、只差局部（去物件/修瑕疵/改细节）"且需要人机协作定位的场景；并覆盖**换脸/局部换身份**场景：用 Krea2EncodeRebalance(参考脸,high) 接 inpaint 正向，把蒙版区（脸）替换成"参考图人物的脸/特征"，身体·发型·衣物·配饰全保留。
version: 1.0.0
author: user
agent_created: true
tags: [krea2, comfyui, inpaint, 局部重绘, 蒙版, 人机协作, 去物, 修瑕]
---

# Krea2 局部重绘 · 交用户标记蒙版

**核心结论**：AI 读不了出图（环境把 PNG 过滤了），**无法自己定位"要改哪块"**。
所以局部重绘的正确分工是：
> **用户用浏览器手绘蒙版（白=要重绘 / 黑=保留）→ 导出蒙版 PNG + 任务单 JSON → 发给 AI → AI 跑云端 inpaint。**

这是《缄默回廊》项目里用户明确拍板的偏好：**"再有这种局部重绘的，可以交给我来标记。"**
以后遇到任何 Krea2 出图的局部修正，默认走这条人机协作链路，不要再尝试让 AI 自己猜位置。

## 何时用
- 出图整体满意，但局部要改：去掉某物件（如角色手腕的镯子）、修瑕疵、改某处材质/颜色、补细节。
- 需要把"改哪块"的决定权交还用户（AI 看不到图，盲改必偏）。
- 不适合：大面积重画 / 换构图 / 换身份 —— 那种应重新 txt2img 或换参考图，而不是 inpaint。

## 一、两件工具（本 skill 目录自带）
| 文件 | 作用 | 谁用 |
|---|---|---|
| `mask_editor.html` | 纯浏览器蒙版手绘器：加载原图 → 刷子/橡皮/撤销/清空 → 导出**与原图同分辨率**的 `_mask.png` + `_inpaint_task.json`（含 inpaint 指令） | **用户** |
| `comfy_inpaint.py` | 把 原图 + 蒙版 上传云端，跑 Krea2 `VAEEncodeForInpaint` + `KSampler(denoise<1)`，按 pid 轮询下载结果。**纯文字正向**（去物/修瑕） | **AI** |
| `comfy_faceswap_inpaint.py` | **换脸变体**：正向用 `Krea2EncodeRebalance(参考脸,high)` 锁身份，蒙版区（脸）替换成参考脸，身体保留。默认参数 `--denoise 0.92 --grow 6 --feather 8 --seed 7065` | **AI** |
| `diag_faceswap_mask_check.py` | 客观校验（换脸）：用蒙版分脸内/脸外算差异比 + 低分辨率连通块判单人 | **AI** |

> 云端地址写在脚本 `BASE` 常量；CloudStudio 实例**重启会变 URL**，跑前先用 `curl -k -s -o /dev/null -w "%{http_code}" <BASE>/` 探活，变了就更新 `BASE` 与项目 `comfy_url.txt`。

## 二、用户侧操作（交给用户，AI 只给指引）
1. 双击 / 浏览器打开 `mask_editor.html`。
2. 点"选择图片"或把出图拖进画布。
3. 用刷子涂**要重绘的区域**（白）；涂错用橡皮擦（黑）或撤销。
4. 右侧文本框写 inpaint 指令，例如：
   `把右手腕上的银镯去掉，露出自然赤裸的手腕皮肤，保持肤色与光照一致，与周围无缝衔接。`
5. 点"下载蒙版 PNG" + "下载任务单 JSON"，把两文件发给我（AI）。

## 三、AI 侧操作（跑 inpaint）
```bash
python comfy_inpaint.py \
  --image 原图.png \
  --mask  原图_mask.png \
  --prompt "把...去掉，保持...与周围无缝衔接" \
  --prefix JM_INPAINT_ --seed 1234 \
  --denoise 0.78 --grow 0 --feather 5 \
  --out 输出目录
```
- `--denoise` 默认 0.78：越高重绘越彻底但越易破坏周边；越低越保守。去小物件 0.7~0.85 试。
- `--grow` 默认 0：蒙版外扩像素，一般 0；色晕时反而要 0。
- `--feather` 默认 5：蒙版高斯羽化半径，让接缝平滑、不晕染。**色晕开的头号解法 = 降 denoise + 羽化 + 强化"无缝衔接"提示词**。

## 三-B、换脸 / 局部换身份变体（Krea2EncodeRebalance 锁脸）
> 适用：底图构图/姿态/身体都对，只把**蒙版区（脸）**替换成"参考图人物的脸"，身体·发型·衣物·配饰全部保留。典型案例：《缄默回廊》`yanxi_yanshuang`（言霜态底图 → 换言溪脸，用户嫌自动椭圆有接缝/脸不够像，改手绘蒙版换脸定稿）。

脚本 `comfy_faceswap_inpaint.py` 与 `comfy_inpaint.py` 的唯一区别：**正向 conditioning 用 `Krea2EncodeRebalance(参考脸, high)` 代替纯文字**——被重绘区被参考脸强约束 → 锁身份。

```bash
python comfy_faceswap_inpaint.py \
  --image 底图.png \
  --mask  底图_mask.png \          # 用户手绘脸部蒙版（白=脸 黑=身体/头发/衣物/配饰）
  --ref   ref/face_<参考人物>.png \ # 参考脸（从 persona sheet 右半面部特写裁，见立绘产线）
  --out 输出目录 \
  --denoise 0.92 --grow 6 --feather 8 --seed 7065
```
**换脸场景的参数与"去小物件"相反**（已实测验证）：
- `--grow` 用 **6**（不是 0）：蒙版向外扩张，避免脸缘残留旧脸形成"面包圈"缝——这是换脸接缝的头号来源，**不是**色晕。
- `--feather` 用 **8**（不是 5）：略强羽化让重绘区与保留区过渡自然。
- `--denoise` 0.92：必须高，脸才真正被替换。
- 若仍见接缝：grow 加到 8 / feather 加到 10 再试。
- 用户手绘蒙版位置用「底图+蒙版红叠加」先核验（PIL composite），质心/ bbox 应与底图脸部重合，避免涂错区域。

## 四、节点链（已验证）
```
LoadImage(原图) ─┐
LoadImage(蒙版) → ImageToMask(channel="red") ─┐   # ⚠️ 用红通道，绕开 alpha 陷阱
UNET/CLIP/VAE (krea2_turbo 链)                  │
CLIPTextEncode(prompt) → positive                │
CLIPTextEncode("") → ConditioningZeroOut → negative (Krea2 负向零化，不写负面词)
VAEEncodeForInpaint(pixels=原图, vae, mask, grow_mask_by) → latent
KSampler(model, positive, negative, latent, denoise<1, steps=8, cfg=1.0, euler, simple)
VAEDecode → SaveImage
```

## 五、⚠️ 全部已知坑（诚实清单）
1. **alpha 陷阱（最致命）**：ComfyUI `LoadImage` 遇带 alpha 的 PNG，会**把 alpha 当蒙版**（全 255=不重绘），导致 inpaint 完全不动。
   → 解决：蒙版走 `ImageToMask(channel="red")`，从红通道取遮罩，根本不碰 alpha。
2. **色晕开**：denoise 太高（如 0.95）+ `grow_mask_by` 膨胀，接缝处颜色外溢。
   → 降 denoise（0.78 左右）、`grow=0`、蒙版羽化（feather≥5）、提示词强调"与周围无缝衔接/保持光照一致"。
3. **文件名缓存**：云端 `input/` 同名图会复用，旧蒙版误用 → 羽化后的蒙版文件名带**内容 MD5 哈希**，蒙版一变即重传。
4. **按 pid 取图，不靠 history 前缀遍历**：本部署 history 会捞到旧提交（字节完全一致）→ `find_output` 严格按提交返回的 `prompt_id` 取对应条目。
5. **端点重启变更**：CloudStudio 每次重启 URL 变，跑前探活。
6. **429 限流**：连续提交会限流，单张串行即可；出错看 `_inpaint_err.log`。
7. **体积/尺寸校验**：下载后 PIL 校验尺寸=原图尺寸，且字节≥200KB，否则判空图/撞车删掉重跑。
8. **Krea2 写不了可读文字**：需要刻字/文字的元素（如银镯"霜"字）别靠 inpaint 写，走 G2 产线（底图+PIL 叠字）。
9. **shell PATH 抖动：`cp`/`curl` 偶发 command not found（EXIT127）**：Git Bash 环境不稳定，用 `cp && python ...` 链或靠 `curl` 探活会随机失败。
   → 规避：写 **Python runner**（如 `run_faceswap.py`）：用 `shutil.copy` 归档蒙版，再 `sys.path.insert + import` 主脚本**同进程**调用 `main()`，**完全不依赖 shell 文件命令**。上传/下载已封装在脚本的 urllib 里，无需 curl。
10. **换脸接缝 ≠ 色晕**：自动椭圆蒙版 + `grow=0` 会让脸缘残留旧脸（面包圈缝）。换脸场景必须 `grow≥6 + feather≥8`（见三-B）；去小物件才用 `grow=0 + feather=5`。两类参数**别混**。
11. **客观校验要区分"脸内/脸外"**：`diag_faceswap_mask_check.py` 用**手绘蒙版**当脸区域，分别算"蒙版内 vs 底图差异"（应大=脸被换）、"蒙版外差异"（应极小=身体保留），再算内外差比 + 低分辨率连通块判单人。比纯全图差分更准（能确认只动了脸、没动身体）。

## 六、验收
- **换脸用 `diag_faceswap_mask_check.py` 客观校验**：脸内平均差应明显 > 12、脸外平均差 < 8、内外差比 > 6、连通块 = 1（单人）→ 判 PASS。实测一例：脸内 30.8 / 脸外 2.4 / 内外比 12.6 / 连通块 1。
- 通用 inpaint 用**像素级差分**：只蒙版区变化，区外几乎零差（实测内外差 ~20 倍以上）即成功。
- 仍有局部偏色（如中间侧视图宽 blob 同盖双腕）→ 换 seed / 把蒙版拆成更小块 / 调大 `--feather`。
- 用户肉眼最终确认观感（AI 看不到图，最终裁决在用户）。
