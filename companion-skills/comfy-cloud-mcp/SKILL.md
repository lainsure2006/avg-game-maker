---
name: comfy-cloud-mcp
description: 通过本地 comfy-mcp 调用云端(CloudStudio) ComfyUI 出图/查模型的实操 skill。覆盖：用 HTTP API 读云端模型与工作流（不走 mcp 自带列举）、用 MCP run_workflow/fetch_outputs 出图、提交 z-image-turbo 文生图工作流、桥接代理维护。适用于需要让 AI 任务正确操作 comfy-mcp 的场景。
version: 1.0.0
author: user
agent_created: true
tags: [comfy, comfyui, mcp, 文生图, image-generation]
---

# comfy-cloud-mcp 实操

架构：comfy-mcp(stdio) → 本地桥接代理 127.0.0.1:8188 → CloudStudio ComfyUI(https)。**WorkBuddy 信任 comfy-mcp 并重启后，桥接自动拉起，直接打 127.0.0.1:8188 就等于打云端。**

## 固定资产（本机真实路径）
- 受管 venv：<home>/.workbuddy\binaries\python\envs\default\（comfy.exe / comfy-mcp.exe）
- MCP 配置：<home>/.workbuddy\mcp.json
- 桥接代理：<home>/.workbuddy\comfy-bridge\proxy.py（日志 proxy.log）
- 启动器：<home>/.workbuddy\comfy-bridge\launcher.py
- python：<home>/.workbuddy\binaries\python\envs\default\Scripts\python.exe

## 桥接代理做什么
- 监听 `127.0.0.1:8188`。
- **HTTP 通道**：把 ComfyUI API 请求用 **https 转发**到 CloudStudio（`system_stats`、`prompt`、`history`、`view`、`object_info`），保留路径和 query。
- **WebSocket 通道**：把 `/ws` 用 **wss 转发**到 CloudStudio。`comfy run` / MCP `run_workflow` 的进度与完成通知必须走这条通道；只转 HTTP 会得到 `ws_disconnected` / 400 Bad Request。
- 原因：comfy-mcp 拒绝 https 的 `COMFYUI_URL`（源码写死），且 comfy-cli 只转发 host:port、不带路径；`comfy run` 又依赖 `/ws`。

## 读云端模型/工作流：直接打 HTTP API（关键）
**别用 comfy-mcp 自带的列举工具**——它们查的是本机 comfy-cli 环境，云端模型读不到。始终打 127.0.0.1:8188：

```
# 系统/显卡
GET http://127.0.0.1:8188/system_stats
# 某加载器节点的可选模型（取 required[字段][0]，是 list 即选项）
GET http://127.0.0.1:8188/object_info/UNETLoader   -> input.required.unet_name[0]
GET http://127.0.0.1:8188/object_info/CLIPLoader   -> input.required.clip_name[0]
GET http://127.0.0.1:8188/object_info/VAELoader    -> input.required.vae_name[0]
# 工作流历史
GET http://127.0.0.1:8188/history
```
> ComfyUI 0.30 的 combo 格式是 `[["模型A","模型B"], {...}]`，**没有 "COMBO" 类型字段**。解析时取 `required[field][0]`，判断 `isinstance(list)` 即可。

## 跑工作流（文生图）
1. 提交前先 `GET /system_stats` 轮询到返回 200（确认桥接已起，否则静默失败）。
2. `POST http://127.0.0.1:8188/prompt`，body 为 ComfyUI API 格式 JSON（见下）。返回 `{prompt_id}`。
3. `GET /history/{prompt_id}` 轮询到结果出现。
4. `GET /view?filename=<名>&subfolder=&type=output` 取回图片（存到当前工作区 comfy_out/ 并呈现）。

z-image-turbo 标准配方（已验证出图）：
```json
{
  "1": {"class_type": "UNETLoader",            "inputs": {"unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default"}},
  "2": {"class_type": "CLIPLoader",            "inputs": {"clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default"}},
  "3": {"class_type": "VAELoader",             "inputs": {"vae_name": "ae.safetensors"}},
  "4": {"class_type": "CLIPTextEncode",        "inputs": {"clip": ["2",0], "text": "你的提示词"}},
  "5": {"class_type": "ConditioningZeroOut",   "inputs": {"conditioning": ["4",0]}},
  "6": {"class_type": "EmptySD3LatentImage",   "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
  "7": {"class_type": "ModelSamplingAuraFlow","inputs": {"model": ["1",0], "shift": 1.73}},
  "8": {"class_type": "KSampler",              "inputs": {"model": ["7",0], "positive": ["4",0], "negative": ["5",0], "latent_image": ["6",0], "seed": 88888888, "steps": 9, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
  "9": {"class_type": "VAEDecode",             "inputs": {"samples": ["8",0], "vae": ["3",0]}},
  "10":{"class_type": "SaveImage",             "inputs": {"images": ["9",0], "filename_prefix": "zimage_test"}}
}
```
要点：steps=9、cfg=1.0、euler/simple（turbo 模型别高 CFG 多步数）；ModelSamplingAuraFlow 用 `shift=1.73`，**不是**旧的 `beta`；CLIPLoader 的 `type` 必须 `lumina2`。

## 用 MCP run_workflow 出图（推荐）
直接 HTTP 路径和 MCP 路径用的是同一套工作流 JSON，但 MCP 工具封装了提交与下载。

1. 确认桥接已起：先用 `server_info`（MCP）或 `GET /system_stats`（HTTP）拿到云端状态。
2. 调 MCP 工具 `run_workflow`：
   - `workflow_path`：z-image-turbo API 格式 JSON 文件路径（同上）。
   - `wait=True`：`comfy run` 会在后台打开 `/ws` 通道等待完成，所以桥接必须支持 WebSocket（见上）。
   - `timeout_seconds`：按需（默认 110s，可设 200）。
3. 返回值里取 `prompt_id`（UUID，如 `c41c11b7-...`）和 `outputs` 列表。
4. 调 MCP 工具 `fetch_outputs`：
   - `prompt_id=<uuid>`
   - `out_dir=<你的输出目录>`
   - 返回 `{files: [{url, path, size}]}`，path 就是本地保存的 PNG。

> **`generate_image` 在云端的实际行为取决于该云部署的默认 T2I 模板配置**：
> - 若云端 comfy-cli 的 T2I 模板指向 z-image-turbo（如当前 CloudStudio 部署，模板路径含 `z_image_turbo`），则 `generate_image(prompt=...)` **可直接使用**，无需自定义工作流 JSON。
> - 若云端仍用 SD1.5 默认模板且无对应 checkpoint，则会失败（报模型找不到）。
> - **判断方法**：调一次 `generate_image(wait=False)`，看返回的 `workflow` 路径是否包含目标模型名；或直接看 `server_info` / `system_stats` 推断。
> - **注意**：`wait=True` 可能触发 MCP 客户端 ~120s 超时（-32001），推荐始终用 `wait=False` + `job(action="wait")` 两步式。
> - 需要精确控制参数（自定义节点/采样器/尺寸）时，仍用 `run_workflow` + 自定义 JSON。

## MCP 图生图（img2img）
已验证可跑通，核心链路：
1. `upload_file(paths=["绝对路径.jpg"], overwrite=True)` → 传到云端 `input` 目录。
2. 工作流把 `EmptySD3LatentImage` 换成：
   ```
   LoadImage(image=basename) → VAEEncode(pixels=LoadImage, vae=VAE) → KSampler(latent_image=VAEEncode, denoise<1.0)
   ```
3. `run_workflow` + `fetch_outputs` 取图。

参考脚本：`<home>/.workbuddy\comfy-bridge\use_mcp_img2img.py`

z-image-turbo img2img 参数建议：
- `denoise`：0.45–0.65（turbo 重绘力极强；0.55 是兼顾"二次元化"与"保留构图"的甜点）。
- `steps=9`、`cfg=1.0`、`sampler_name=euler`、`scheduler=simple` 照旧。
- 尺寸跟随源图（LoadImage 原生尺寸），不必强设 1024×1024。
- 提示词重点强调风格：`anime style illustration, 2D anime art, cinematic anime poster, soft detailed shading`。

## 39 个 MCP 工具可用性速查（挑工具用，别乱猜）
comfy-mcp 为"本机 ComfyUI"设计；我们目标是云端（走桥接），所以**只认打云端 API 的那批**：
- ✅ 云端可用（8）：`run_workflow`(主力出图)、`fetch_outputs`(取图)、`system_stats`(探活)、`free_memory`(清显存)、`validate_workflow`(跑前校验)、`upload_file`(传参考图做图生图)、`nodes`(查云端节点目录，替代手写 /object_info)、`job`(查/等/取消任务)。
- ❌ 本地进程/文件（7）：`launch_comfyui`、`stop_comfyui`、`restart_comfyui`、`update_comfyui`、`switch_comfyui_version`、`install_node`、`get_logs` —— 云端由 CloudStudio 托管，本机不跑服务。
- ❌ 本地模型（3）：`search_models`、`download_model`、`download` —— 列的是本机，读不到云端模型，**不可信**。
- ❌ Comfy Cloud 合作伙伴（6）：`auth_status`、`auth_login`、`list_partner_models`、`partner_model_schema`、`partner_generate`、`emit_partner_workflow` —— 需连 Comfy 云账号，当前未配。
- ⚠️ 本地元信息/模板/文件（15）：`server_info`、`discover`、`which`、`project`、`search_templates`、`get_template`、`fetch_template`、`node_dependencies`、`workflow_deps`、`list_workflow_slots`、`list_workflow_notes`、`set_workflow_slot`、`vary_workflow`、`run_template`、`generate_image` —— 能跑但服务本机；**`generate_image` 在云端是否可用取决于该云的 T2I 默认模板配置**（见上方详细说明），不可用时才回退到 `run_workflow` + 云端兼容 JSON。

> 想查云端模型/节点：`nodes` 或 HTTP `/object_info`，**别用 `search_models`**。

## 连不通时怎么办（极重要）
CloudStudio 服务器**可能未开启**，且**每次的预览 URL 可能不同**。连接失败**不等于配置坏了**，不要因此反复重试或擅自改动。

1. 任何操作前先轻量探活：`GET http://127.0.0.1:8188/system_stats`。
   - 返回 200 → 云端在线，正常继续。
   - 连接拒绝/超时 → **立刻停手**，不要循环重试，也不要去改 mcp.json / proxy.py / COMFYUI_URL。
2. 连不通时，先向用户确认两件事，等回复再动：
   - 「CloudStudio 上的 ComfyUI 当前是否已启动？」
   - 「当前的预览 URL 是多少？」（CloudStudio 每次可能给不同地址）
3. URL 变了 → 让用户给新 URL，再把 `proxy.py` 的 `DEFAULT_UPSTREAM`（或设环境变量 `COMFY_BRIDGE_UPSTREAM`）改成新值并重启 WorkBuddy。**不要**往 `COMFYUI_URL` 塞 https（铁律 1）。
4. 仅在用户确认云端**已开且 URL 正确**后仍连不上，才去查 `proxy.log`、必要时 `pkill -f comfy-bridge/proxy.py` 后重启 WorkBuddy。

> 最坏的错误动作：因为连不上就试图「修配置」，结果把 https 塞进 COMFYUI_URL 或乱改 mcp.json —— 这只会更糟。**连不通，先问人。**

## 铁律
1. **永不往 COMFYUI_URL/HOST/PORT 填 https 或 443**——comfy-mcp 会拒。连云端一律走桥接（打 127.0.0.1:8188）。
2. 读云端模型/工作流用 HTTP API（见上），comfy-mcp 自带枚举工具查本机、不可信。
3. 别重装 comfy-mcp / 改 mcp.json 启动方式，除非确认要升级。
4. **连不通先确认、别盲重试别盲改**（见上节）：只有在用户确认云端已开且 URL 正确后仍失败，才查 proxy.log 或重启代理。
