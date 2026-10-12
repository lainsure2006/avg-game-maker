/**
 * 阶段2「线索笔记本 + 推理板」示例故事 —— 统一入口（story8）
 * 仅用于实测 clue / deduce 机制，验证满意后可整体删除。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'demo_clue',
  title: '线索推理示例',
  subtitle: '— 阶段2 实测 —',
  description: '演示 clue（线索收集）+ deduce（推理板组合解锁路线）。顶栏「线索」按钮可随时打开笔记本与推理板。',
  titleScreen: {
    background: 'corridor_dark',
    title: '线索推理示例',
    subtitle: '— 阶段2 实测 —',
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
