/**
 * AVG Engine - 脚本解析器
 * 将 YAML-like 脚本解析为指令序列
 */

import type { ScriptCommand, GradeType, WeatherType, TransitionType, RelationDef, EventDef, ClueDef, DeductionDef, ExploreHotspot } from './types';

/**
 * 解析脚本 JSON 为指令序列
 * 支持 JSON 格式的剧本定义
 */
export function parseScript(script: Record<string, unknown>[]): ScriptCommand[] {
  return script.map((item, index) => {
    const type = item.type as string;
    if (!type) throw new Error(`脚本第 ${index} 行缺少 type 字段`);

    switch (type) {
      case 'scene':
        return {
          type: 'scene',
          bg: item.bg as string,
          transition: (item.transition as TransitionType) || 'fade',
          grade: item.grade as GradeType | undefined,
          weather: item.weather as WeatherType | undefined,
        } as ScriptCommand;

      case 'bgm':
        return {
          type: 'bgm',
          action: (item.action as string) || 'play',
          id: item.id as string | undefined,
          duration: item.duration as number | undefined,
        } as ScriptCommand;

      case 'se':
        return {
          type: 'se',
          id: item.id as string,
        } as ScriptCommand;

      case 'char':
        return {
          type: 'char',
          action: (item.action as string) || 'show',
          id: item.id as string,
          position: item.position as 'left' | 'center' | 'right' | undefined,
          pose: item.pose as string | undefined,
          expression: item.expression as string | undefined,
        } as ScriptCommand;

      case 'dialog':
        return {
          type: 'dialog',
          speaker: item.speaker as string,
          text: item.text as string,
          expression: item.expression as string | undefined,
        } as ScriptCommand;

      case 'narration':
        return {
          type: 'narration',
          text: item.text as string,
        } as ScriptCommand;

      case 'choice':
        return {
          type: 'choice',
          choices: (item.choices as Array<{ text: string; label: string; condition?: string }>) || [],
        } as ScriptCommand;

      case 'jump':
        return {
          type: 'jump',
          label: item.label as string,
        } as ScriptCommand;

      case 'label':
        return {
          type: 'label',
          id: item.id as string,
        } as ScriptCommand;

      case 'if':
        return {
          type: 'if',
          condition: item.condition as string,
          trueLabel: item.trueLabel as string,
          falseLabel: item.falseLabel as string,
        } as ScriptCommand;

      case 'set':
        return {
          type: 'set',
          variable: item.variable as string,
          value: item.value as number | string | boolean,
          op: (item.op as '=' | '+=' | '-=') || '=',
        } as ScriptCommand;

      case 'wait':
        return {
          type: 'wait',
          duration: (item.duration as number) || 1,
        } as ScriptCommand;

      case 'effect':
        return {
          type: 'effect',
          effect: (item.effect as string) || 'fade',
          duration: item.duration as number | undefined,
        } as ScriptCommand;

      case 'anim':
        return {
          type: 'anim',
          action: (item.action as 'play' | 'stop') || 'play',
          id: item.id as string,
          position: item.position as 'left' | 'center' | 'right' | undefined,
        } as ScriptCommand;

      case 'end':
        return { type: 'end' } as ScriptCommand;

      case 'video':
        return {
          type: 'video',
          id: item.id as string,
        } as ScriptCommand;

      case 'item':
        return {
          type: 'item',
          id: item.id as string,
        } as ScriptCommand;

      case 'unlock':
        return {
          type: 'unlock',
          ending: item.ending as string,
        } as ScriptCommand;

      case 'relation':
        return {
          type: 'relation',
          characters: (item.characters as RelationDef[]) || [],
        } as ScriptCommand;

      case 'event':
        return {
          type: 'event',
          list: (item.list as EventDef[]) || [],
        } as ScriptCommand;

      case 'clue':
        return {
          type: 'clue',
          id: item.id as string,
          name: item.name as string,
          desc: item.desc as string,
          icon: item.icon as string | undefined,
        } as ScriptCommand;

      case 'deduce':
        return {
          type: 'deduce',
          list: (item.list as DeductionDef[]) || [],
        } as ScriptCommand;

      case 'explore':
        return {
          type: 'explore',
          bg: item.bg as string,
          widthRatio: (item.widthRatio as number) ?? 2,
          hint: item.hint as string | undefined,
          hotspots: (item.hotspots as ExploreHotspot[]) || [],
        } as ScriptCommand;

      default:
        throw new Error(`未知指令类型: ${type} (第 ${index} 行)`);
    }
  });
}

/**
 * 查找标签位置
 */
export function findLabel(commands: ScriptCommand[], labelId: string): number {
  return commands.findIndex(cmd => cmd.type === 'label' && 'id' in cmd && cmd.id === labelId);
}
