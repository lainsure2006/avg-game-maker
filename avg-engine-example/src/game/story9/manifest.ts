/**
 * 阶段3「探索模式」示例故事 —— story9 资源清单
 * 复用《缄默回廊》已有背景/立绘，并新增一张宽图（explore_wide.svg）与三件道具 SVG。
 * 验证完可整体删除。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    corridor_dark: '/images/bg/jianmo/bg_corridor_dark.png',
    explore_wide: '/images/bg/explore_wide.svg',
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
    se_key: '/audio/jianmo/se_key.wav',
  },
  items: {
    prop_key:   { src: '/images/items/prop_key.svg',   caption: '锈蚀的铜钥匙' },
    prop_note:  { src: '/images/items/prop_note.svg',  caption: '匿名信·第七封' },
    prop_photo: { src: '/images/items/prop_photo.svg', caption: '褪色合影' },
  },
};
