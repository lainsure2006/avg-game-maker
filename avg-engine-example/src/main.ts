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
    engine.setNgPlus(story.ngPlus ?? null);

    // 创建 UI 管理器
    uiManager = new UIManager(engine, stories);
    uiManager.setStoryEndings(story.endings ?? []);

    console.log(`[引擎] 故事 "${story.title}" 加载完成！`);

    // 浏览器 autoplay 策略：无用户手势前 AudioContext 处于 suspended，标题屏 BGM 会被拦截无法自动播放。
    // 注册首次用户手势（pointerdown/keydown/touchstart）解锁音频；若解锁时仍在标题屏，则补播主题曲。
    const unlockAudio = () => {
      engine.resumeAudio().then(() => engine.replayTitleBgm());
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    engine.start();
  } catch (err) {
    console.error('引擎初始化失败:', err);
  }
}

/** 舞台设计基准宽度（与 main.css 中 #ui-layer 的固定宽度一致） */
const STAGE_DESIGN_WIDTH = 1280;

/**
 * 让 DOM UI 层（对话框 / 顶栏 / 菜单等）随游戏舞台等比缩放。
 * 画布由 Renderer 按舞台实际尺寸自适应渲染（原生分辨率，清晰），而 DOM 覆盖层
 * 是固定像素布局，必须按同一比例 transform 缩放，才能与画布内容视觉等比例：
 * 大屏不显小、小屏不溢出。舞台本身恒为 16:9，故只需一个缩放比。
 */
function applyStageScale(): void {
  const container = document.getElementById('game-container');
  const uiLayer = document.getElementById('ui-layer');
  if (!container || !uiLayer) return;
  const scale = container.clientWidth / STAGE_DESIGN_WIDTH;
  if (scale > 0) {
    uiLayer.style.setProperty('--ui-scale', String(scale));
  }
}

// 舞台尺寸随窗口变化 → 同步刷新 UI 缩放
window.addEventListener('resize', applyStageScale);

// 注册故事切换处理器（供 UIManager 通过 game/index.ts 调用）
registerSwitchStoryHandler(loadStory);

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  applyStageScale();
  loadStory(DEFAULT_STORY_ID);
});

// 暴露到全局供调试
(window as any).stories = stories;
