/**
 * 故事模板 - 统一入口
 *
 * 复制本目录到 src/game/ 下，修改文件名和内容即可。
 * 引擎会自动发现所有包含 story.ts 的子目录。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';
import { fillPlaceholders } from './placeholder';

const story: StoryDef = {
  id: 'my-story',           // 唯一 ID，用英文短横线命名
  title: '我的故事',         // 显示标题
  subtitle: '— 副标题 —',   // 首页副标题
  description: '故事简介，会在故事选择页面显示。',
  titleScreen: {
    background: 'classroom',  // 首页背景图 key（来自 manifest.backgrounds）
    title: '我的故事',
    subtitle: '— 副标题 —',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(200, 200, 220, 0.85)',
    titleFontSize: 0,
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillPlaceholders(manifest),
  getScript: () => script,
};

export default story;
