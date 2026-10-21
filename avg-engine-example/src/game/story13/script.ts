/**
 * NG+ 功能测试剧本脚本。
 * 验证点：
 *  1) 一周目：隐藏选项（requires.playthrough:2）不出现；
 *  2) 通关后标题屏出现「进入 NG+」；
 *  3) 进入二周目：playthrough=2，顾承好感（carryRelations）被携带；
 *  4) 二周目：隐藏选项出现，可选；
 *  5) 读档恢复 playthrough / ngCarry。
 */
import type { ScriptCommand } from '../../engine/types';

export const script: ScriptCommand[] = [
  // 声明一个角色关系，用于验证好感跨周目携带
  { type: 'relation', characters: [{ id: 'gucheng', name: '顾承', affinity: 'aff_gucheng', min: -10, max: 10 }] },

  { type: 'scene', bg: 'pier_dusk' },
  { type: 'narration', text: '（序）这是 NG+ 多周目功能测试。走到结局后即可在标题屏进入二周目。' },
  { type: 'dialog', speaker: '顾承', text: '欢迎来到回廊。' },

  // 选项：二周目专属隐藏选项（一周目不显示）
  { type: 'choice', choices: [
    { text: '普通问候', label: 'c_normal' },
    { text: '【隐藏】提及二十年前的旧案（需二周目）', label: 'c_hidden', requires: { playthrough: 2 } },
  ] },

  { type: 'label', id: 'c_normal' },
  { type: 'set', variable: 'aff_gucheng', value: 5, op: '=' },
  { type: 'jump', label: 'after_choice' },

  { type: 'label', id: 'c_hidden' },
  { type: 'narration', text: '（隐藏路线）你提及了那桩旧案，顾承的眼神变了。' },
  { type: 'set', variable: 'aff_gucheng', value: 8, op: '=' },
  { type: 'jump', label: 'after_choice' },

  { type: 'label', id: 'after_choice' },
  { type: 'if', condition: 'aff_gucheng >= 8', trueLabel: 'high', falseLabel: 'low' },

  { type: 'label', id: 'high' },
  { type: 'narration', text: '顾承对你的态度明显不同——仿佛你们之间已有些旧谊。' },
  { type: 'jump', label: 'fin' },

  { type: 'label', id: 'low' },
  { type: 'narration', text: '顾承对你仍保持客气的疏离。' },
  { type: 'jump', label: 'fin' },

  { type: 'label', id: 'fin' },
  { type: 'unlock', ending: 'ending_test' },
  { type: 'end' },
];
