/**
 * 阶段1「人物养成」示例故事 —— story7 资源清单
 * 仅复用《缄默回廊》已有的背景/立绘，不引入任何新素材；验证完可整体删除。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    dining: '/images/bg/jianmo/bg_dining.png',
    archive: '/images/bg/jianmo/bg_archive.png',
  },
  sprites: {
    gucheng: {
      default: '/images/sprite/jianmo/gucheng_default.png',
      serious: '/images/sprite/jianmo/gucheng_serious.png',
    },
    sulan: {
      default: '/images/sprite/jianmo/sulan_default.png',
    },
  },
  animations: {},
  audio: {},
  items: {},
};
