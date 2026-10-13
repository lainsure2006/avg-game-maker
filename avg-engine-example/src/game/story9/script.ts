/**
 * 阶段3「探索模式」示例剧本 —— story9
 *
 * 实测路径：
 *  1) 开场一段旁白，提示进入探索。
 *  2) 执行 explore：真实超宽图 pier_dusk_wide（3072×1024，约 2.4 倍屏宽）进入探索模式，
 *     HUD 显示提示与计数。
 *     · 拖动画面 / 点 ◀▶ 按钮平移视角（底部有范围指示条）。
 *     · 点击三个发光热区（船屋 / 栈桥 / 系缆桩）→ 收集对应线索 + 弹出道具图。
 *     · 顶栏「线索」角标随收集递增。
 *  3) 点【结束探索】→ 退出探索，恢复常规剧情，展示已找到的证物。
 *
 * 素材说明：探索背景改用《缄默回廊》真实超宽场景图
 *  （story-wip/素材/jianmo_bg/JM_BG_bg_pier_dusk__00001_.png，3072×1024），
 *  经 public/images/bg/pier_dusk_wide.png 接入，替代早期占位 SVG explore_wide.svg。
 *  热区坐标 x 归一化到整张宽图宽度，y 归一化到视口高度；发光提示由引擎实时绘制，
 *  故任意真实背景图均可使用。
 */
export const script = [
  // 线索声明（进入探索点中后由引擎登记进「线索笔记本」）
  { type: 'clue', id: 'c_key',   name: '锈蚀的铜钥匙', desc: '挂在系缆桩的铁环上，齿纹很旧，柄上刻着模糊编号：7-13。', icon: '/images/items/prop_key.svg' },
  { type: 'clue', id: 'c_note',  name: '压舱箱里的信', desc: '没有署名，只写：「别信穿白大褂的。7-13 才是真的。」字迹与病历签字一致。', icon: '/images/items/prop_note.svg' },
  { type: 'clue', id: 'c_photo', name: '褪色的船票',   desc: '一张泛黄的单程船票，背面写着日期——正是医院关闭前一天。', icon: '/images/items/prop_photo.svg' },

  // 开场
  { type: 'scene', bg: 'pier_dusk', transition: 'fade' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'serious' },
  { type: 'narration', text: '黄昏的码头浸在浓雾里，海水是铅灰色的。顾承示意你：仔细搜一遍——有些东西，藏在视线之外。' },
  { type: 'dialog', speaker: '顾承', text: '拖动画面左右看，看到发光的地方就点一下。三样东西，别漏了。' },

  // —— 探索模式：真实超宽图 + 三个热区 ——
  { type: 'explore', bg: 'explore_wide_real', widthRatio: 2.0, hint: '拖动或点 ◀▶ 浏览；点击发光处查看', hotspots: [
    { id: 'h_cabinet', x: 0.16, y: 0.72, w: 0.12, h: 0.22, clue: 'c_key',   item: 'prop_key',   label: '船屋门边的铜钥匙' },
    { id: 'h_desk',    x: 0.47, y: 0.62, w: 0.12, h: 0.22, clue: 'c_note',  item: 'prop_note',  label: '压舱箱里的信' },
    { id: 'h_photo',   x: 0.78, y: 0.60, w: 0.12, h: 0.24, clue: 'c_photo', item: 'prop_photo', label: '系缆桩上的船票' },
  ]},

  // 退出探索后恢复常规剧情
  { type: 'cinematic', on: true },   // 阶段5：收尾进入电影宽银幕（上下黑边 + 加强缓推）
  { type: 'scene', bg: 'pier_dusk', transition: 'fade' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'default' },
  { type: 'narration', text: '三样东西到手。它们彼此之间，似乎藏着某种联系……' },
  { type: 'dialog', speaker: '顾承', text: '（顶栏「线索」已经记下你找到的证物，之后可以去推理了。）' },
  { type: 'cinematic', on: false },  // 阶段5：退出电影宽银幕
  { type: 'end' },
];
