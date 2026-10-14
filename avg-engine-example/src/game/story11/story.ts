/**
 * 阶段6·QTE 演示故事 —— 统一入口（story11）
 * 仅用于实测 qte 指令（tap / key / mash 三种模式 + 设置开关 + once 守门），验收满意后可整体删除。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'demo_qte',
  title: 'QTE反应演示',
  subtitle: '— 阶段6 实测 —',
  description: '阶段6 综合演示：QTE 快速反应（点击/按键/连点）+ 世界观图鉴 Codex（声明与逐步解锁）。',
  titleScreen: {
    background: 'classroom',
    title: 'QTE反应演示',
    subtitle: '— 阶段6 实测 —',
    titleColor: '#e8eef5',
    subtitleColor: 'rgba(150, 175, 200, 0.85)',
    titleFontSize: 0,
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => manifest,
  getScript: () => script,
  // 不配置结局收集，避免抢占默认故事
};

export default story;
