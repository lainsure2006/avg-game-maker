/**
 * 《缄默回廊》story5 资源清单（Step 6 落地）
 *
 * 游戏前缀 `jianmo`，物理目录隔离在 public/images/{bg,sprite,items}/jianmo/ 与 public/audio/jianmo/，
 * 根治多故事 key 撞车（实例：story3 占过 library.png）。
 *
 * 落位现状（Step 5 冻结 + Step 6 落位）：
 *  - 背景 15 + CG 8 = 23 张   → 已落 public/images/bg/jianmo/（pier_dusk/reef/cliff 用 __16x9 裁切版）
 *  - 立绘 4 角色 9 pose        → 已落 public/images/sprite/jianmo/（AutoDL qwen-image 2.1 出图 + RMBG-2.0 抠透明归一化；顾承 2026-10-11、苏岚/言溪/老K 2026-10-12 审核通过重做版，覆盖 2026-10-03 旧 krea2/anime 版）
 *  - SE 6                     → 已落 public/audio/jianmo/（AI 程序化合成 WAV）
 *  - BGM 6                    → 已全入（arrival/day/title 2026-09-20；night/tension/tender 2026-09-21，用户提供 WAV，均已落 public/audio/jianmo/）
 *  - 物件 6                   → ⚠️ 未产出，仍登记 manifest.items（renderer 已登记但 src 缺失 → 显示「物件图片缺失」占位，可关闭，不崩）
 *  - 动画 0                   → 剧本未用 anim
 */
import type { AssetManifest } from '../../engine/types';

export const manifest: AssetManifest = {
  // —— 15 背景 + 8 CG（CG 走同一 backgrounds 通道，scene 直接取用）——
  backgrounds: {
    // —— 注意：manifest 背景 KEY 必须与脚本 scene.bg 完全一致（引擎 backgrounds[cmd.bg] 不做前缀处理，参考 story3 约定）——
    pier_dusk:        '/images/bg/jianmo/bg_pier_dusk.png',
    courtyard:        '/images/bg/jianmo/bg_courtyard.png',
    archway:          '/images/bg/jianmo/bg_archway.png',
    corridor_locked:  '/images/bg/jianmo/bg_corridor_locked.png',
    dining:           '/images/bg/jianmo/bg_dining.png',
    cabin_night:      '/images/bg/jianmo/bg_cabin_night.png',
    compound:         '/images/bg/jianmo/bg_compound.png',
    greenhouse:       '/images/bg/jianmo/bg_greenhouse.png',
    archive:          '/images/bg/jianmo/bg_archive.png',
    corridor_dark:    '/images/bg/jianmo/bg_corridor_dark.png',
    reef:             '/images/bg/jianmo/bg_reef.png',
    office_night:     '/images/bg/jianmo/bg_office_night.png',
    corridor:         '/images/bg/jianmo/bg_corridor.png',
    cliff:            '/images/bg/jianmo/bg_cliff.png',
    reveal_hall:      '/images/bg/jianmo/bg_reveal_hall.png',
    // —— CG（8 张，上线由 Step 6 脚本 scene 替换触发，引擎换景即清台）——
    cg_arrival:       '/images/bg/jianmo/cg_arrival.png',
    cg_cabin_window:  '/images/bg/jianmo/cg_cabin_window.png',
    cg_reef:          '/images/bg/jianmo/cg_reef.png',
    cg_reveal_room:   '/images/bg/jianmo/cg_reveal_room.png',
    cg_cliff:         '/images/bg/jianmo/cg_cliff.png',
    cg_truth_hall:    '/images/bg/jianmo/cg_truth_hall.png',
    cg_parents_cliff: '/images/bg/jianmo/cg_parents_cliff.png',
    cg_departure:     '/images/bg/jianmo/cg_departure.png',
  },

  // —— 4 角色 9 pose（AutoDL qwen-image 2.1 出图 + RMBG-2.0 抠透明归一化；2026-10-11/12 审核通过版，覆盖 2026-10-03 旧 krea2/anime 版）——
  sprites: {
    gucheng: {
      default: '/images/sprite/jianmo/gucheng_default.png',
      serious: '/images/sprite/jianmo/gucheng_serious.png',
      calm:    '/images/sprite/jianmo/gucheng_calm.png',
      sad:     '/images/sprite/jianmo/gucheng_sad.png',
    },
    sulan: {
      default: '/images/sprite/jianmo/sulan_default.png',
      drunk:   '/images/sprite/jianmo/sulan_drunk.png',
    },
    yanxi: {
      default:   '/images/sprite/jianmo/yanxi_default.png',
      yanshuang: '/images/sprite/jianmo/yanxi_yanshuang.png',
    },
    laok: {
      default: '/images/sprite/jianmo/laok_default.png',
    },
  },

  animations: {},

  // —— 音频：6 个 SE 已落位；BGM 6 已全入（用户提供 WAV，2026-09-20/21）——
  // 剧本内 bgm 指令：arrival/day/night/tension/tender 均生效；bgm_title 由首页 showTitleScreen 自动播放。
  // 首页/选故事页 BGM 由引擎 showTitleScreen 自动优先取 bgm_title 播放（game-engine.ts:205）。
  audio: {
    se_wind:      '/audio/jianmo/se_wind.wav',
    se_chain:     '/audio/jianmo/se_chain.wav',
    se_heartbeat: '/audio/jianmo/se_heartbeat.wav',
    se_key:       '/audio/jianmo/se_key.wav',
    se_clue:      '/audio/jianmo/se_clue.wav',
    se_wave:      '/audio/jianmo/se_wave.wav',
    // —— BGM（用户提供 WAV）——
    bgm_arrival:  '/audio/jianmo/bgm_arrival.wav',  // 抵岛/序章，剧本 line 24 触发
    bgm_day:      '/audio/jianmo/bgm_day.wav',       // 白天推进，剧本 line 51/167 触发
    bgm_title:    '/audio/jianmo/bgm_title.wav',     // 标题/选故事页主题曲（引擎自动播放）
    bgm_night:    '/audio/jianmo/bgm_night.wav',     // 夜戏/探查，剧本 night 段触发
    bgm_tension:  '/audio/jianmo/bgm_tension.wav',   // 悬疑/反转/揭示，剧本 tension 段触发
    bgm_tender:   '/audio/jianmo/bgm_tender.wav',    // 温情/结局，剧本 tender 段触发
  },

  // —— 物件 6（P3 产线未产，暂登记占位；renderer 显示「物件图片缺失」可关闭，不崩）——
  items: {
    medical_cover:  { src: '/images/items/jianmo/medical_cover.png',  caption: '病历封皮·言霜' },
    medical_sign:   { src: '/images/items/jianmo/medical_sign.png',   caption: '外诊签字件' },
    silver_bracelet:{ src: '/images/items/jianmo/silver_bracelet.png',caption: '银镯·刻「霜」' },
    old_photo:      { src: '/images/items/jianmo/old_photo.png',      caption: '旧照·姐妹' },
    evidence_bag:   { src: '/images/items/jianmo/evidence_bag.png',   caption: '物证袋' },
    parents_badge:  { src: '/images/items/jianmo/parents_badge.png',  caption: '父母记者证' },
  },
};
