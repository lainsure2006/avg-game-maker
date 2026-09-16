/**
 * 《樱色未央》story3 - 资源清单
 *
 * 背景：12 张真实图（含原模板 6 张）+ 3 张占位（cafe / ending_good / ending_normal，
 *       由 placeholder.ts 在 getManifest 时替换为生成占位图）。
 * 立绘：林晚 / 沈知遥 / 周野 / 王老师，每角色全部已生成 pose（含 _ref 参考图）。
 * 音频：暂留空。引用 bgm_*/se_* 的指令在音频文件就位前会安全无操作（AudioManager 无 buffer 即跳过）。
 *       待用户按 素材/02_音频需求清单.md 下载 12 个文件放入 public/audio/ 后，
 *       把下方 audio 字段取消注释并填入对应路径即可。
 */

import type { AssetManifest } from '../../engine/types';

export const yingseManifest: AssetManifest = {
  backgrounds: {
    classroom:     '/images/bg/classroom.png',
    street:        '/images/bg/street.png',
    park_day:      '/images/bg/park_day.png',
    park_night:    '/images/bg/park_night.png',
    river:         '/images/bg/river.png',
    corridor:      '/images/bg/corridor.png',
    library:       '/images/bg/library.png',
    rooftop:       '/images/bg/rooftop.png',
    sea:           '/images/bg/sea.png',
    playground:    '/images/bg/playground.png',
    rehearsal:     '/images/bg/rehearsal.png',
    ending_bad:    '/images/bg/ending_bad.png',
    // 以下 3 张为占位图（文件不存在），由 placeholder.ts 替换为生成占位图
    cafe:          '/images/bg/cafe.png',
    ending_good:   '/images/bg/ending_good.png',
    ending_normal: '/images/bg/ending_normal.png',
  },

  sprites: {
    linwan: {
      default:    '/images/sprite/linwan_default.png',
      happy:      '/images/sprite/linwan_happy.png',
      sad:        '/images/sprite/linwan_sad.png',
      surprised:  '/images/sprite/linwan_surprised.png',
      ref:        '/images/sprite/linwan_ref.png',
    },
    shenzhiyao: {
      default:    '/images/sprite/shenzhiyao_default.png',
      smile:      '/images/sprite/shenzhiyao_smile.png',
      sad:        '/images/sprite/shenzhiyao_sad.png',
      surprised:  '/images/sprite/shenzhiyao_surprised.png',
      ref:        '/images/sprite/shenzhiyao_ref.png',
    },
    zhouye: {
      default:    '/images/sprite/zhouye_default.png',
      serious:    '/images/sprite/zhouye_serious.png',
      worried:    '/images/sprite/zhouye_worried.png',
      surprised:  '/images/sprite/zhouye_surprised.png',
      ref:        '/images/sprite/zhouye_ref.png',
    },
    wanglaoshi: {
      default:    '/images/sprite/wanglaoshi_default.png',
      ref:        '/images/sprite/wanglaoshi_ref.png',
    },
  },

  animations: {},

  // 音频占位：文件就位前务必保持为空，否则 loadManifest 会因 404 抛出而整体失败。
  // 待下载后填入，例如：
  // bgm_morning: '/audio/bgm_morning.mp3',
  // bgm_library: '/audio/bgm_library.mp3',
  // bgm_club:    '/audio/bgm_club.mp3',
  // bgm_tender:  '/audio/bgm_tender.mp3',
  // bgm_tense:   '/audio/bgm_tense.mp3',
  // bgm_end_good:   '/audio/bgm_end_good.mp3',
  // bgm_end_normal: '/audio/bgm_end_normal.mp3',
  // bgm_end_bad:    '/audio/bgm_end_bad.mp3',
  // se_wind:     '/audio/se_wind.mp3',
  // se_bell:     '/audio/se_bell.mp3',
  // se_candy:    '/audio/se_candy.mp3',
  // se_basketball: '/audio/se_basketball.mp3',
  audio: {},
};
