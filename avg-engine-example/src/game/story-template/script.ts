/**
 * 剧本模板
 *
 * 可用指令（按 type 分类）：
 *
 * scene     — 切换背景   { type:'scene', bg:'key', transition?:'fade'|'slide-left'|'slide-right'|'none' }
 * char      — 角色控制   { type:'char', action:'show'|'hide'|'move', id:'角色名', position:'left'|'center'|'right', pose:'pose名' }
 * dialog    — 角色对话   { type:'dialog', speaker:'说话人', text:'内容' }
 * narration — 旁白       { type:'narration', text:'内容' }
 * choice    — 选项分支   { type:'choice', choices:[{ text:'选项文字', label:'跳转标签' }] }
 * jump      — 跳转       { type:'jump', label:'标签名' }
 * label     — 标签       { type:'label', id:'标签名' }
 * set       — 设置变量   { type:'set', variable:'变量名', value:数值, op?:'='|'+='|'-=' }
 * if        — 条件判断   { type:'if', condition:'表达式', trueLabel:'真时跳转', falseLabel:'假时跳转' }
 * wait      — 等待       { type:'wait', duration:秒数 }
 * effect    — 特效       { type:'effect', effect:'shake'|'flash'|'dim'|'rain'|'snow', duration?:秒数 }
 * bgm       — 音乐       { type:'bgm', action:'play'|'stop'|'fadeout', id:'音频key', duration?:秒数 }
 * se        — 音效       { type:'se', id:'音频key' }
 * anim      — 动画       { type:'anim', action:'play'|'stop', id:'动画key', target?:'角色名', position?:'left'|'center'|'right' }
 * end       — 结束       { type:'end' }
 */

export const script = [
  // ===== 开场 =====
  { type: 'scene', bg: 'classroom' },
  { type: 'label', id: 'start' },

  { type: 'narration', text: '这是一个新的故事……' },

  // 示例对话
  // { type: 'char', action: 'show', id: 'alice', position: 'center', pose: 'default' },
  // { type: 'dialog', speaker: '爱丽丝', text: '你好！' },

  // 示例选择分支
  // { type: 'choice', choices: [
  //   { text: '选项 A', label: 'branch_a' },
  //   { text: '选项 B', label: 'branch_b' },
  // ] },
  // { type: 'label', id: 'branch_a' },
  // { type: 'dialog', speaker: '???', text: '你选择了 A。' },
  // { type: 'jump', label: 'ending' },
  // { type: 'label', id: 'branch_b' },
  // { type: 'dialog', speaker: '???', text: '你选择了 B。' },
  // { type: 'jump', label: 'ending' },

  // 示例条件判断
  // { type: 'set', variable: 'score', value: 5 },
  // { type: 'if', condition: 'score >= 3', trueLabel: 'good_end', falseLabel: 'bad_end' },

  // ===== 结局 =====
  // { type: 'label', id: 'ending' },
  { type: 'narration', text: '故事结束。' },
  { type: 'end' },
];
