/**
 * 资源清单模板
 *
 * 在 backgrounds / sprites 中列出你的故事需要的图片。
 * 图片放到 /public/images/ 对应目录下。
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  backgrounds: {
    // 背景图，key 可自定义，url 指向 public/images/bg/
    // 已有可用背景（可直接复用）：
    //   classroom / street / park_day / park_night / river / ending_bad
    classroom: '/images/bg/classroom.png',
    // my_bg:   '/images/bg/my_bg.png',
  },

  sprites: {
    // 角色立绘，key 为角色名，每个 pose 指向 public/images/sprite/
    // 已有可用角色（可直接复用）：
    //   alice: default / happy / sad / surprised
    //   bob:   default / smile / worry
    // alice: {
    //   default: '/images/sprite/alice_default.png',
    // },
  },

  animations: {},
  audio: {},
};
