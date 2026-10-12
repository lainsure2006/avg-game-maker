/**
 * 阶段1「人物养成」示例故事 —— 统一入口（story7）
 * 仅用于实测 relation/event 机制，验证满意后可整体删除。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'demo_cultivate',
  title: '养成机制示例',
  subtitle: '— 阶段1 实测 —',
  description: '演示 relation（角色档案）+ event（好感达标自动触发剧情）。右上角「关系」可随时查看好感。',
  titleScreen: {
    background: 'dining',
    title: '养成机制示例',
    subtitle: '— 阶段1 实测 —',
    titleColor: '#e8eef5',
    subtitleColor: 'rgba(150, 175, 200, 0.85)',
    titleFontSize: 0,
    ambient: 'none',
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => manifest,
  getScript: () => script,
  // 不配置结局收集，避免抢占默认故事（保持《缄默回廊》为开局）
};

export default story;
