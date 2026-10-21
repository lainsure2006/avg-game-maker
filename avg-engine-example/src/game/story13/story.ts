/**
 * NG+ 功能测试剧本 —— 统一入口（验证用，验证后删除，不随版本上传）。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'ngplus-test',
  title: 'NG+ 测试',
  subtitle: '— 多周目功能验证 —',
  description: 'NG+（多周目）功能验证剧本。一周目通关后标题屏出现「进入 NG+」，二周目保留好感并解锁隐藏选项。',
  titleScreen: {
    background: 'pier_dusk',
    title: 'NG+ 测试',
    subtitle: '— 多周目功能验证 —',
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => manifest,
  getScript: () => script,
  // NG+ 声明：跨周目携带顾承好感
  ngPlus: {
    carryRelations: ['gucheng'],
    carryFlags: [],
    hiddenRoutesRequire: 2,
  },
  endings: [
    {
      id: 'ending_test',
      title: '测试结局',
      desc: 'NG+ 测试走到终点。',
      how: '完成剧本即可解锁。',
      thumbnail: '/images/bg/jianmo/cg_departure.png',
    },
  ],
};

export default story;
