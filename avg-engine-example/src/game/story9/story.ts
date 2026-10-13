/**
 * 阶段3「探索模式」示例故事 —— 统一入口（story9）
 * 仅用于实测 explore 指令（宽图左右平移 + 点击热区收集线索/弹出道具），验证满意后可整体删除。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'demo_explore',
  title: '探索模式示例',
  subtitle: '— 阶段3 实测 —',
  description: '演示 explore（宽图平移 + 热区点击）：拖动或点箭头浏览，点击发光处收集证物并弹出道具。顶栏「线索」记录已找到的证物。',
  titleScreen: {
    background: 'corridor_dark',
    title: '探索模式示例',
    subtitle: '— 阶段3 实测 —',
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
