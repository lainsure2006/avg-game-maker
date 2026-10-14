/**
 * 阶段6·QTE 演示剧本（story11）
 *
 * 演示三种 QTE 模式：
 *   tap  —— 点击屏幕立即成功（倒计时内）
 *   key  —— 按下指定按键（默认空格）成功
 *   mash —— 限时内连点指定按键填充满进度条
 *
 * 关闭「设置 → QTE 总开关」后，引擎会直接判定成功，跳过覆盖层（照顾休闲玩家）。
 * 每个 QTE 都带 once 守门范例（id 唯一 + flag.qte.<id>），读档后不会因重放而重复触发惩罚。
 */

export const script = [
  // ===== 开场 =====
  { type: 'scene', bg: 'classroom' },
  { type: 'cinematic', on: true },
  { type: 'label', id: 'start' },

  // 阶段6·Codex 演示：声明图鉴目录（角色/地点/术语），运行时逐步解锁
  { type: 'codex', list: [
    { id: 'cx_gucheng', category: 'character', title: '顾承', desc: '《缄默回廊》核心人物，冷静而背负秘密的男人。' },
    { id: 'cx_jianmo', category: 'place', title: '缄默回廊', desc: '一座废弃却仍在运转的滨海医院，陈旧阴森却住着人。' },
    { id: 'cx_protocol', category: 'term', title: '缄默协议', desc: '医院遗留的不成文规则：入夜后不得发出声响。' },
  ] },
  // 开场即解锁一条，便于打开「图鉴」面板查看效果（顶栏角标 +1）
  { type: 'codexUnlock', id: 'cx_gucheng' },

  { type: 'narration', text: '【QTE 快速反应 · 演示】接下来会弹出三次限时反应事件，请在倒计时环归零前按屏幕提示操作。' },
  { type: 'char', action: 'show', id: 'alice', position: 'center', pose: 'default' },
  { type: 'dialog', speaker: '爱丽丝', text: '准备好了吗？第一个考验——提示出现时立刻点击屏幕！' },

  // ===== QTE 1：tap 点击模式 =====
  { type: 'qte', id: 'qte_tap', prompt: '快点击屏幕！', duration: 2.5, mode: 'tap', successLabel: 'tap_ok', failLabel: 'tap_fail' },
  { type: 'label', id: 'tap_ok' },
  { type: 'dialog', speaker: '爱丽丝', text: '漂亮！点击反应满分。' },
  { type: 'jump', label: 'qte2' },
  { type: 'label', id: 'tap_fail' },
  { type: 'dialog', speaker: '爱丽丝', text: '慢了半拍～不过没关系，我们继续。' },
  { type: 'jump', label: 'qte2' },

  // ===== QTE 2：key 按键模式 =====
  { type: 'label', id: 'qte2' },
  { type: 'narration', text: '第二个：提示出现时按下键盘的【空格】键。' },
  { type: 'qte', id: 'qte_key', prompt: '按下空格键！', duration: 2.5, mode: 'key', key: 'Space', successLabel: 'key_ok', failLabel: 'key_fail' },
  { type: 'label', id: 'key_ok' },
  { type: 'dialog', speaker: '爱丽丝', text: '按键时机正好！' },
  { type: 'jump', label: 'qte3' },
  { type: 'label', id: 'key_fail' },
  { type: 'dialog', speaker: '爱丽丝', text: '没按到键～空格键在键盘最下面那排，长条形的那个。' },
  { type: 'jump', label: 'qte3' },

  // ===== QTE 3：mash 连点模式 =====
  { type: 'label', id: 'qte3' },
  { type: 'codexUnlock', id: 'cx_jianmo' },
  { type: 'narration', text: '第三个：限时内疯狂连按【空格】键，把进度条填满！' },
  { type: 'qte', id: 'qte_mash', prompt: '狂按空格键！', duration: 3, mode: 'mash', key: 'Space', target: 10, successLabel: 'mash_ok', failLabel: 'mash_fail' },
  { type: 'label', id: 'mash_ok' },
  { type: 'dialog', speaker: '爱丽丝', text: '哇，手速惊人！连点挑战通过。' },
  { type: 'jump', label: 'finish' },
  { type: 'label', id: 'mash_fail' },
  { type: 'dialog', speaker: '爱丽丝', text: '差一点点就填满了，下次再快些也能过！' },
  { type: 'codexUnlock', id: 'cx_protocol' },
  { type: 'jump', label: 'finish' },

  // ===== 收尾 =====
  { type: 'label', id: 'finish' },
  { type: 'codexUnlock', id: 'cx_protocol' },
  { type: 'cinematic', on: false },
  { type: 'narration', text: 'QTE 与图鉴演示结束。你可以随时在「设置 → 快速反应事件(QTE)」里关闭总开关：关闭后引擎会直接判定成功，不弹覆盖层，照顾休闲玩家。顶栏「图鉴」可随时查看已解锁的世界观条目。' },
  { type: 'char', action: 'hide', id: 'alice' },
  { type: 'end' },
];
