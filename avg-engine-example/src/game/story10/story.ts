/**
 * 阶段4「场景自选 hub」示例故事 —— 统一入口（story10）
 * 验证 hub 指令（时间阶段 + 行动点 + 节点解锁）与探索/线索的联动。验证满意后可整体删除。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'demo_hub',
  title: '场景自选示例',
  subtitle: '— 阶段4 实测 —',
  description: '演示 hub（时间阶段 + 行动点 + 节点解锁）：每天 N 个时段、每时段 M 行动点，点节点进场景、花行动点，行动点耗尽自动进下一时段，时段走完收尾。档案室需先去病房解锁。',
  titleScreen: {
    background: 'corridor_dark',
    title: '场景自选示例',
    subtitle: '— 阶段4 实测 —',
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
