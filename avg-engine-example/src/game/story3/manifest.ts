/**
 * 《樱色未央》story3 - 资源清单
 *
 * 背景：19 张真实图（含原模板 6 张；cafe / ending_good / ending_normal 原为占位，
 *       已于 2026-08-25 补全为实图，placeholder.ts 仅作缺失兜底）。
 * 立绘：林晚 / 沈知遥 / 周野 / 王老师，每角色全部已生成 pose（含 _ref 参考图）。
 * 音频：4 个音效 SE（Python 合成 WAV）+ 9 首 BGM（AI 生成 WAV），均已落位 public/audio/ 并在下方 audio 登记。
 *       剧本 bgm_* 与 se_* 指令的 id 与键位名一致，无需改剧本。
 *       bgm_title 为首页/选故事页 BGM，由引擎 showTitleScreen() 自动播放（不写进剧本）。
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
    rooftop_sunset:'/images/bg/rooftop_sunset.png',
    classroom_eve: '/images/bg/classroom_eve.png',
    library_eve:   '/images/bg/library_eve.png',
    street_dusk:   '/images/bg/street_dusk.png',
    // 以下 3 张原为占位图，2026-08-25 已补全为实图（cafe / ending_good / ending_normal）
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

  // 音频：
  // - 4 个音效 SE 已用 Python 合成（WAV，浏览器原生解码），落位 public/audio/，下方已登记。
  // - 9 首 BGM 由用户用 AI 音乐模型生成（WAV），落位 public/audio/，文件名=键位名，下方已登记。
  //   脚本里 bgm_* 指令 id 已对齐，无需改剧本；AudioManager 以 loop=true 循环播放。
  audio: {
    // 音效 SE（Python 合成）
    se_wind:       '/audio/se_wind.wav',
    se_candy:      '/audio/se_candy.wav',
    se_bell:       '/audio/se_bell.wav',
    se_basketball: '/audio/se_basketball.wav',
    // 背景音乐 BGM（AI 生成 WAV，循环播放）
    bgm_morning:    '/audio/bgm_morning.wav',
    bgm_library:    '/audio/bgm_library.wav',
    bgm_club:       '/audio/bgm_club.wav',
    bgm_tender:     '/audio/bgm_tender.wav',
    bgm_tense:      '/audio/bgm_tense.wav',
    bgm_end_good:   '/audio/bgm_end_good.wav',
    bgm_end_normal: '/audio/bgm_end_normal.wav',
    bgm_end_bad:    '/audio/bgm_end_bad.wav',
    // 首页/选故事页 BGM（引擎 showTitleScreen() 自动播放，不写进剧本）
    bgm_title:      '/audio/bgm_title.wav',
  },
  // 物件弹出放大图（item 指令）：演示沈知遥的淡蓝纸条（详见 AI_GUIDE「物件弹窗」）
  items: {
    note_shenzhiyao: { src: '/images/items/note_shenzhiyao.png', caption: '沈知遥的淡蓝纸条' },
  },
};
