/**
 * 阶段1「人物养成」示例脚本
 * 演示：relation（角色档案）→ event（好感达标自动触发剧情）→ choice 改变好感 → 事件自动跳转 + 提示。
 *
 * 关键指令（新增）：
 *  - relation：声明角色性格/好恶/好感变量（init 预扫描，读档安全）
 *  - event  ：声明事件监视表，每句 set 后引擎自动判定，命中即跳转 label
 */
import type { ScriptCommand } from '../../engine/types';

export const script: ScriptCommand[] = [
  { type: 'scene', bg: 'dining', transition: 'fade' },

  // —— 角色养成档案（init 时预扫描登记）——
  {
    type: 'relation',
    characters: [
      { id: 'gucheng', name: '顾承', personality: '克制 · 守密', likes: '专业克制', dislikes: '情绪化', affinity: 'aff_gucheng' },
      { id: 'sulan', name: '苏岚', personality: '敏锐 · 防备', likes: '真诚', dislikes: '试探', affinity: 'aff_sulan' },
    ],
  },

  // —— 事件监视表（set 后自动判定；once 事件只触发一次，用 flag.event.<id> 守门）——
  {
    type: 'event',
    list: [
      { id: 'ev_gc3', when: 'aff_gucheng>=3', jump: 'ev_gucheng_warm', once: true, toast: '顾承开始信任你' },
      { id: 'ev_sl3', when: 'aff_sulan>=3', jump: 'ev_sulan_warm', once: true, toast: '苏岚放下防备' },
    ],
  },

  { type: 'char', action: 'show', id: 'gucheng', position: 'left', pose: 'default' },
  { type: 'char', action: 'show', id: 'sulan', position: 'right', pose: 'default' },

  { type: 'dialog', speaker: '顾承', text: '你来了。今晚的档案室……不太安静。' },
  { type: 'narration', text: '（你的态度会改变他们对你的好感。点右上角「关系」可随时查看好感条。）' },

  {
    type: 'choice',
    choices: [
      { text: '用专业口吻回应，保持克制', label: 'c_pro' },
      { text: '直接追问失踪案，流露急切', label: 'c_urge' },
      { text: '先观察，什么也不说', label: 'c_wait' },
    ],
  },

  { type: 'label', id: 'c_pro' },
  { type: 'set', variable: 'aff_gucheng', value: 2, op: '+=' },
  { type: 'dialog', speaker: '顾承', text: '（他微微点头）……你比我想的稳。' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'c_urge' },
  { type: 'set', variable: 'aff_gucheng', value: -1, op: '+=' },
  { type: 'set', variable: 'aff_sulan', value: -1, op: '+=' },
  { type: 'dialog', speaker: '苏岚', text: '（她皱眉）你这么急，是想把我们全送进去吗？' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'c_wait' },
  { type: 'set', variable: 'aff_sulan', value: 1, op: '+=' },
  { type: 'dialog', speaker: '苏岚', text: '（她稍放松）……肯等的人，不多了。' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'loop' },
  { type: 'narration', text: '（继续互动，把任一好感刷到 3 试试——看事件会不会自动触发？）' },
  {
    type: 'choice',
    choices: [
      { text: '再夸顾承一句（好感 +2）', label: 'b_gc' },
      { text: '向苏岚示好（好感 +2）', label: 'b_sl' },
      { text: '结束这一段', label: 'b_end' },
    ],
  },

  { type: 'label', id: 'b_gc' },
  { type: 'set', variable: 'aff_gucheng', value: 2, op: '+=' },
  { type: 'dialog', speaker: '顾承', text: '（他罕见地笑了）……记下你这份沉稳。' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'b_sl' },
  { type: 'set', variable: 'aff_sulan', value: 2, op: '+=' },
  { type: 'dialog', speaker: '苏岚', text: '（她别过脸）……别以为这就算了。' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'b_end' },
  { type: 'dialog', speaker: '', text: '——「人物养成」示例到此。回标题可看「结局收集」，或再回来重刷好感。' },
  { type: 'end' },

  // —— 事件跳转目标（好感达标后被引擎自动跳入）——
  { type: 'label', id: 'ev_gucheng_warm' },
  { type: 'dialog', speaker: '系统', text: '🔔 事件触发：顾承好感 ≥3，他开始信任你。后续专属剧情可在此展开。' },
  { type: 'jump', label: 'loop' },

  { type: 'label', id: 'ev_sulan_warm' },
  { type: 'dialog', speaker: '系统', text: '🔔 事件触发：苏岚好感 ≥3，她放下了防备。' },
  { type: 'jump', label: 'loop' },
];
