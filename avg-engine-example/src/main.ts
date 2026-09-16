/**
 * AVG Engine - 入口文件
 */

import { GameEngine } from './engine/game-engine';
import { UIManager } from './ui/ui-manager';
import { stories, findStory, DEFAULT_STORY_ID, registerSwitchStoryHandler } from './game/index';

let engine: GameEngine;
let uiManager: UIManager;
let currentStoryId: string = DEFAULT_STORY_ID;

/** 加载并启动一个故事 */
async function loadStory(storyId: string): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('找不到游戏画布');
    return;
  }

  const story = findStory(storyId);
  if (!story) {
    console.error(`故事 "${storyId}" 未找到`);
    return;
  }

  currentStoryId = storyId;

  // 切换故事：先销毁旧的 UI 管理器（移除累积的全局监听 + 停打字机 + 断开回调），
  // 否则每次切换都会给 dialog-box/game-canvas/document 叠加一组旧监听，点击会同时
  // 推进多个旧引擎，导致对话框串到别的故事的台词。
  if (uiManager) {
    uiManager.dispose();
  }

  // 如果引擎已存在，先销毁
  if (engine) {
    engine.dispose();
  }

  // 创建新引擎
  engine = new GameEngine(canvas);

  try {
    const manifest = story.getManifest();
    const script = story.getScript();
    await engine.init(manifest, script);

    // 配置首页
    engine.setTitleScreen(story.titleScreen);
    engine.setStoryId(story.id);

    // 创建 UI 管理器
    uiManager = new UIManager(engine, stories);
    uiManager.setStoryEndings(story.endings ?? []);

    console.log(`[引擎] 故事 "${story.title}" 加载完成！`);

    // 恢复音频上下文（需要用户交互）
    document.addEventListener('click', () => {
      engine.audio?.resume();
    }, { once: true });

    engine.start();
  } catch (err) {
    console.error('引擎初始化失败:', err);
  }
}

// 注册故事切换处理器（供 UIManager 通过 game/index.ts 调用）
registerSwitchStoryHandler(loadStory);

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  loadStory(DEFAULT_STORY_ID);
});

// 暴露到全局供调试
(window as any).stories = stories;
