/**
 * 阶段6·QTE 演示故事 —— 资源清单（story11）
 * 复用引擎自带占位/实拍素材，无需额外出图即可运行。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    classroom: '/images/bg/classroom.png',
    corridor: '/images/bg/corridor.png',
  },

  sprites: {
    alice: {
      default: '/images/sprite/alice_default.png',
      happy: '/images/sprite/alice_happy.png',
      sad: '/images/sprite/alice_sad.png',
      surprised: '/images/sprite/alice_surprised.png',
    },
  },

  animations: {},
  audio: {},
};
