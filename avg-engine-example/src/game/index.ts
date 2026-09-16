/**
 * AVG Engine - 故事注册中心
 *
 * 新增故事只需：
 *   1. 在 src/game/ 下新建目录（如 story3/）
 *   2. 创建 story.ts（导出 StoryDef）
 *   3. 创建 manifest.ts / script.ts / placeholder.ts
 *
 * 引擎会自动发现所有 story.ts 并注册，无需手动编辑本文件。
 */

import type { AssetManifest, ScriptCommand, TitleScreenConfig, EndingDef } from '../engine/types';

// ========== 故事定义类型 ==========
export interface StoryDef {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  titleScreen: TitleScreenConfig;
  getManifest: () => AssetManifest;
  getScript: () => ScriptCommand[];
  /** 结局收集目录（可选）。声明后引擎会记录已解锁结局，UI 相册面板据此展示 */
  endings?: EndingDef[];
}

export type StoryConfig = StoryDef;

// ========== 自动发现所有故事 ==========
// Vite 会在构建时静态分析，自动收集所有 story<N>/story.ts
// 注意：glob 必须限定为【数字编号】目录（story[0-9]*），否则 story-template/ 也会被当成
// 可玩故事注册（其 story.ts 导出了合法的 StoryDef「我的故事」）。模板是脚手架，不是游戏。
const storyModules = import.meta.glob<{ default: StoryDef }>(
  './story[0-9]*/story.ts',
  { eager: true }
);

export const stories: StoryConfig[] = Object.values(storyModules)
  .map(m => m.default)
  .sort((a, b) => a.title.localeCompare(b.title, 'zh'));

console.log(`[故事注册] 已发现 ${stories.length} 个故事:`, stories.map(s => s.title).join(', '));

// ========== 工具函数 ==========
export function findStory(id: string): StoryConfig | undefined {
  return stories.find(s => s.id === id);
}

// 默认故事：优先选「已配置结局收集」的故事（如 story3），否则退回第一个
export const DEFAULT_STORY_ID = stories.find(s => s.endings?.length)?.id ?? stories[0]?.id ?? '';

// ========== 故事切换 ==========
let switchStoryHandler: ((storyId: string) => Promise<void>) | null = null;

export function registerSwitchStoryHandler(handler: (storyId: string) => Promise<void>): void {
  switchStoryHandler = handler;
}

export async function switchStory(storyId: string): Promise<void> {
  if (switchStoryHandler) {
    await switchStoryHandler(storyId);
  } else {
    console.error('[游戏] switchStory 处理器未注册');
  }
}
