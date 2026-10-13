/**
 * 阶段4「场景自选 hub」示例故事 —— story10 资源清单
 * 复用《缄默回廊》已有背景/立绘，新增一张枢纽背景（hub_bg.svg）。
 * 验证完可整体删除。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    corridor_dark: '/images/bg/jianmo/bg_corridor_dark.png',
    hub_bg: '/images/bg/hub_bg.svg',
    ward: '/images/bg/jianmo/bg_ward.png',
    archive: '/images/bg/jianmo/bg_archive.png',
    courtyard: '/images/bg/jianmo/bg_courtyard.png',
  },
  sprites: {
    gucheng: {
      default: '/images/sprite/jianmo/gucheng_default.png',
      serious: '/images/sprite/jianmo/gucheng_serious.png',
    },
  },
  animations: {},
  audio: {},
  items: {},
};
