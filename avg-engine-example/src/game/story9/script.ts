/**
 * 阶段3「探索模式」示例剧本 —— story9
 *
 * 实测路径：
 *  1) 开场一段旁白，提示进入探索。
 *  2) 执行 explore：宽图（explore_wide，宽 2.2 倍屏宽）进入探索模式，HUD 显示提示与计数。
 *     · 拖动画面 / 点 ◀▶ 按钮平移视角（底部有范围指示条）。
 *     · 点击三个发光热区（柜子 / 护士台 / 墙上合影）→ 收集对应线索 + 弹出道具图。
 *     · 顶栏「线索」角标随收集递增。
 *  3) 点【结束探索】→ 退出探索，恢复常规剧情，展示已找到的证物。
 *
 * 热区坐标（x 归一化到整张宽图宽度，y 归一化到视口高度）与 explore_wide.svg 中
 * 三个发光圆位置对应：柜子≈(0.30,0.66) / 护士台≈(0.55,0.60) / 合影≈(0.80,0.50)。
 */
export const script = [
  // 线索声明（进入探索点中后由引擎登记进「线索笔记本」）
  { type: 'clue', id: 'c_key',   name: '锈蚀的铜钥匙', desc: '一把锈蚀的铜钥匙，齿纹对应老式病历柜。柄上刻着模糊编号：7-13。' },
  { type: 'clue', id: 'c_note',  name: '匿名信·第七封', desc: '没有署名，只写：「别信穿白大褂的。7-13 才是真的。」字迹与病历签字一致。' },
  { type: 'clue', id: 'c_photo', name: '褪色合影',     desc: '一张泛黄的全家福，背面写着日期——正是医院关闭前一天。' },

  // 开场
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'serious' },
  { type: 'narration', text: '护士站里一片死寂。顾承示意你：仔细搜一遍——有些东西，藏在视线之外。' },
  { type: 'dialog', speaker: '顾承', text: '拖动画面左右看，看到发光的地方就点一下。三样东西，别漏了。' },

  // —— 探索模式：宽图 + 三个热区 ——
  { type: 'explore', bg: 'explore_wide', widthRatio: 2.2, hint: '拖动或点 ◀▶ 浏览；点击发光处查看', hotspots: [
    { id: 'h_cabinet', x: 0.30, y: 0.66, w: 0.12, h: 0.20, clue: 'c_key',   item: 'prop_key',   label: '柜子里的铜钥匙' },
    { id: 'h_desk',    x: 0.55, y: 0.60, w: 0.12, h: 0.22, clue: 'c_note',  item: 'prop_note',  label: '护士台上的匿名信' },
    { id: 'h_photo',   x: 0.80, y: 0.50, w: 0.12, h: 0.24, clue: 'c_photo', item: 'prop_photo', label: '墙上的合影' },
  ]},

  // 退出探索后恢复常规剧情
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'default' },
  { type: 'narration', text: '三样东西到手。它们彼此之间，似乎藏着某种联系……' },
  { type: 'dialog', speaker: '顾承', text: '（顶栏「线索」已经记下你找到的证物，之后可以去推理了。）' },
  { type: 'end' },
];
