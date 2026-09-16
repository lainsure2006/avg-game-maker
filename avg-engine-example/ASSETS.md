# 可用资源清单

> AI 写剧本时请以本文件为准。所有列出的图片均确认存在。

---

## 背景图 (`public/images/bg/`)

共 **6 张**，尺寸 1280×720，动漫风格。

| key | 文件名 | 描述 |
|-----|--------|------|
| `classroom` | classroom.png | 教室内部，白天 |
| `street` | street.png | 城市街道，白天 |
| `park_day` | park_day.png | 公园，阳光明媚的白天 |
| `park_night` | park_night.png | 公园，夜晚星空 |
| `river` | river.png | 河边，傍晚夕阳 |
| `ending_bad` | ending_bad.png | 暗色调结局画面 |

---

## 角色立绘 (`public/images/sprite/`)

共 **7 张**，PNG 透明背景，2 个角色。

### 爱丽丝 (alice)

| pose | 文件名 | 表情 |
|------|--------|------|
| `default` | alice_default.png | 默认/平静 |
| `happy` | alice_happy.png | 开心/微笑 |
| `sad` | alice_sad.png | 伤心/低落 |
| `surprised` | alice_surprised.png | 惊讶/震惊 |

### 鲍勃 (bob)

| pose | 文件名 | 表情 |
|------|--------|------|
| `default` | bob_default.png | 默认/平静 |
| `smile` | bob_smile.png | 微笑 |
| `worry` | bob_worry.png | 担忧/焦虑 |

---

## 动画与音频

- **序列帧动画** (`public/images/anim/`)：暂无
- **背景音乐/音效**：暂无

---

## 新增资源

如果需要新图片，请先生成并放入对应目录，然后在 `manifest.ts` 中声明路径。

**生成图片的提示词模板**：

- 背景图（1280×720，动漫风格）：
  > A visual novel background, anime style, [场景描述], 1280x720, high quality, soft lighting, suitable for game background

- 角色立绘（PNG 透明背景）：
  > A visual novel character sprite, anime style, [角色描述], [表情], full body standing pose, transparent background, clean lines
