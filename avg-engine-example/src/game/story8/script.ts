/**
 * 阶段2「线索笔记本 + 推理板」示例剧本 —— story8
 *
 * 实测路径：
 *  1) 进入即收集到 3 件证物（顶栏「线索」角标变 3）。
 *  2) 点顶栏【线索】→ 看笔记本；点【进入推理】→ 勾选线索 → 点【推理】。
 *     · 选「锈蚀的铜钥匙」+「匿名信·第七封」→ 推出真相（跳 deduce_success）
 *     · 选「匿名信·第七封」+「褪色合影」→ 推出另一结论（跳 deduce_identity）
 *     · 选错组合 → 提示「线索不足」，可重新选。
 *  3) 也可选「直接看推理结果（演示）」走 bypass 分支，验证无论如何都能到结局。
 */

export const script = [
  // —— 线索声明（init 预扫描 def；执行时再标记为已拥有）——
  { type: 'clue', id: 'c_key',   name: '锈蚀的铜钥匙', desc: '一把锈蚀的铜钥匙，齿纹对应老式病历柜。柄上刻着一个模糊编号：7-13。' },
  { type: 'clue', id: 'c_note',  name: '匿名信·第七封', desc: '没有署名，只写：「别信穿白大褂的。7-13 才是真的。」字迹与病历签字一致。' },
  { type: 'clue', id: 'c_photo', name: '褪色合影',     desc: '一张泛黄的全家福，背面写着日期——正是医院关闭前一天。' },

  // —— 推理规则（init 预扫描）——
  { type: 'deduce', list: [
    { id: 'd_truth',    name: '钥匙 × 匿名信', requires: ['c_key', 'c_note'],
      sets: [{ variable: 'flag_deduced', value: true, op: '=' }],
      jump: 'deduce_success', toast: '推理成立：7-13 号柜藏着真相', once: true },
    { id: 'd_identity', name: '匿名信 × 合影', requires: ['c_note', 'c_photo'],
      jump: 'deduce_identity', toast: '推理成立：写信人就在合影里', once: true },
  ]},

  // —— 开场 ——
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'serious' },
  { type: 'narration', text: '阴冷的走廊里，你们在护士站抽屉深处翻出了几样东西。' },

  // —— 收集证物（执行时标记为已拥有）→ 角标 +1+1+1 ——
  { type: 'clue', id: 'c_key' },
  { type: 'clue', id: 'c_note' },
  { type: 'clue', id: 'c_photo' },
  { type: 'se', id: 'se_clue' },
  { type: 'dialog', speaker: '顾承', text: '都收好。这些东西……等会儿能救命。' },
  { type: 'narration', text: '（顶栏「线索」角标变成 3。点开它，进入「推理」，试着组合线索。）' },
  { type: 'dialog', speaker: '', text: '提示：选中「锈蚀的铜钥匙」与「匿名信·第七封」，再点「推理」能推出真相。' },

  // —— 等待玩家去推理（在对话框/选项态均可触发面板推理跳转）——
  { type: 'label', id: 'wait_deduce' },
  { type: 'choice', choices: [
    { text: '我去【线索】面板推理', label: 'instruct_again' },
    { text: '直接看推理结果（演示用）', label: 'deduce_demo' },
  ]},

  { type: 'label', id: 'instruct_again' },
  { type: 'dialog', speaker: '', text: '（打开顶栏【线索】→ 进入推理 → 勾选「钥匙」+「匿名信」→ 点【推理】）' },
  { type: 'jump', label: 'wait_deduce' },

  // —— 推理成功分支 1：钥匙 × 匿名信 ——
  { type: 'label', id: 'deduce_success' },
  { type: 'se', id: 'se_key' },
  { type: 'narration', text: '你把钥匙与匿名信并排——7-13 的编号、一致的笔迹。逻辑闭环了。' },
  { type: 'dialog', speaker: '顾承', text: '……所以真正的病历，一直锁在那只旧柜子里。你比我快。' },
  { type: 'jump', label: 'reveal' },

  // —— 推理成功分支 2：匿名信 × 合影 ——
  { type: 'label', id: 'deduce_identity' },
  { type: 'narration', text: '匿名信的字迹与合影中某个身影重合。写信的人，就在你们之中。' },
  { type: 'jump', label: 'reveal' },

  // —— 演示 bypass 分支 ——
  { type: 'label', id: 'deduce_demo' },
  { type: 'narration', text: '（演示）你直接翻看结论：7-13 号柜，藏着被掩埋的真相。' },
  { type: 'jump', label: 'reveal' },

  // —— 收束 ——
  { type: 'label', id: 'reveal' },
  { type: 'effect', effect: 'flash' },
  { type: 'char', action: 'move', id: 'gucheng', pose: 'default' },
  { type: 'dialog', speaker: '顾承', text: '走吧。趁天没亮，把该看清的都看清。' },
  { type: 'unlock', ending: 'e_truth' },
  { type: 'end' },
];
