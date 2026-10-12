/**
 * 阶段2「线索笔记本 + 推理板」示例故事 —— story8 资源清单
 * 仅复用《缄默回廊》已有的背景/立绘/音效，不引入任何新素材；验证完可整体删除。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    corridor_dark: '/images/bg/jianmo/bg_corridor_dark.png',
    archive:      '/images/bg/jianmo/bg_archive.png',
  },
  sprites: {
    gucheng: {
      default: '/images/sprite/jianmo/gucheng_default.png',
      serious: '/images/sprite/jianmo/gucheng_serious.png',
    },
  },
  animations: {},
  audio: {
    se_clue: '/audio/jianmo/se_clue.wav',
    se_key:  '/audio/jianmo/se_key.wav',
  },
  items: {},
};
