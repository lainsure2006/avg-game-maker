/**
 * 《雾港回声》story4 资源清单（由 素材/build_story4.py 生成，勿手改）
 *
 * 背景：14 场景 × 左/中/右（B 方案裁窗，1280×720）= 42 张 + 14 个裸键别名（= 中景）
 *       + 8 张 CG 单图；全部落位 public/images/bg/fogport/（子目录根治与 story3 撞车）
 * 立绘：9 角色 21 张（10 底稿 + 11 差分），落位 public/images/sprite/fogport/
 * 物证：16 张 item 弹窗图，落位 public/images/items/
 * 音频：⚠️ 尚未登记 —— 用户采购中。剧本里的 bgm/se 全部是 // 注释态，
 *       音频到位后：① public/audio/ 放文件 ② 下方 audio 补键 ③ 删剧本注释符。
 */
import type { AssetManifest } from '../../engine/types';

export const fogportManifest: AssetManifest = {
  backgrounds: {
    office_night_left     : '/images/bg/fogport/office_night_left.png',
    office_night_center   : '/images/bg/fogport/office_night_center.png',
    office_night_right    : '/images/bg/fogport/office_night_right.png',
    library_left          : '/images/bg/fogport/library_left.png',
    library_center        : '/images/bg/fogport/library_center.png',
    library_right         : '/images/bg/fogport/library_right.png',
    oldstreet_dusk_left   : '/images/bg/fogport/oldstreet_dusk_left.png',
    oldstreet_dusk_center : '/images/bg/fogport/oldstreet_dusk_center.png',
    oldstreet_dusk_right  : '/images/bg/fogport/oldstreet_dusk_right.png',
    ruins_dusk_left       : '/images/bg/fogport/ruins_dusk_left.png',
    ruins_dusk_center     : '/images/bg/fogport/ruins_dusk_center.png',
    ruins_dusk_right      : '/images/bg/fogport/ruins_dusk_right.png',
    police_corridor_left  : '/images/bg/fogport/police_corridor_left.png',
    police_corridor_center: '/images/bg/fogport/police_corridor_center.png',
    police_corridor_right : '/images/bg/fogport/police_corridor_right.png',
    interrogation_left    : '/images/bg/fogport/interrogation_left.png',
    interrogation_center  : '/images/bg/fogport/interrogation_center.png',
    interrogation_right   : '/images/bg/fogport/interrogation_right.png',
    cafe_night_left       : '/images/bg/fogport/cafe_night_left.png',
    cafe_night_center     : '/images/bg/fogport/cafe_night_center.png',
    cafe_night_right      : '/images/bg/fogport/cafe_night_right.png',
    sanatorium_left       : '/images/bg/fogport/sanatorium_left.png',
    sanatorium_center     : '/images/bg/fogport/sanatorium_center.png',
    sanatorium_right      : '/images/bg/fogport/sanatorium_right.png',
    flea_market_left      : '/images/bg/fogport/flea_market_left.png',
    flea_market_center    : '/images/bg/fogport/flea_market_center.png',
    flea_market_right     : '/images/bg/fogport/flea_market_right.png',
    streetside_night_left : '/images/bg/fogport/streetside_night_left.png',
    streetside_night_center: '/images/bg/fogport/streetside_night_center.png',
    streetside_night_right: '/images/bg/fogport/streetside_night_right.png',
    fire_archive_left     : '/images/bg/fogport/fire_archive_left.png',
    fire_archive_center   : '/images/bg/fogport/fire_archive_center.png',
    fire_archive_right    : '/images/bg/fogport/fire_archive_right.png',
    hardware_store_left   : '/images/bg/fogport/hardware_store_left.png',
    hardware_store_center : '/images/bg/fogport/hardware_store_center.png',
    hardware_store_right  : '/images/bg/fogport/hardware_store_right.png',
    suburb_home_left      : '/images/bg/fogport/suburb_home_left.png',
    suburb_home_center    : '/images/bg/fogport/suburb_home_center.png',
    suburb_home_right     : '/images/bg/fogport/suburb_home_right.png',
    post_office_left      : '/images/bg/fogport/post_office_left.png',
    post_office_center    : '/images/bg/fogport/post_office_center.png',
    post_office_right     : '/images/bg/fogport/post_office_right.png',
    // —— 场景别名：剧本 scene 指令用的是裸键（= 中景裁段）——
    office_night          : '/images/bg/fogport/office_night_center.png',
    library               : '/images/bg/fogport/library_center.png',
    oldstreet_dusk        : '/images/bg/fogport/oldstreet_dusk_center.png',
    ruins_dusk            : '/images/bg/fogport/ruins_dusk_center.png',
    police_corridor       : '/images/bg/fogport/police_corridor_center.png',
    interrogation         : '/images/bg/fogport/interrogation_center.png',
    cafe_night            : '/images/bg/fogport/cafe_night_center.png',
    sanatorium            : '/images/bg/fogport/sanatorium_center.png',
    flea_market           : '/images/bg/fogport/flea_market_center.png',
    streetside_night      : '/images/bg/fogport/streetside_night_center.png',
    fire_archive          : '/images/bg/fogport/fire_archive_center.png',
    hardware_store        : '/images/bg/fogport/hardware_store_center.png',
    suburb_home           : '/images/bg/fogport/suburb_home_center.png',
    post_office           : '/images/bg/fogport/post_office_center.png',
    // —— CG 单图（8 张，与背景同目录同 16:9，scene 可直接取用）——
    cg_01                 : '/images/bg/fogport/cg_01.png',
    cg_02                 : '/images/bg/fogport/cg_02.png',
    cg_03                 : '/images/bg/fogport/cg_03.png',
    cg_04                 : '/images/bg/fogport/cg_04.png',
    cg_05                 : '/images/bg/fogport/cg_05.png',
    cg_06                 : '/images/bg/fogport/cg_06.png',
    cg_07                 : '/images/bg/fogport/cg_07.png',
    cg_08                 : '/images/bg/fogport/cg_08.png',
  },

  sprites: {
    zhouyu: {
      default   : '/images/sprite/fogport/zhouyu_default.png',
      serious   : '/images/sprite/fogport/zhouyu_serious.png',
      side      : '/images/sprite/fogport/zhouyu_side.png',
      tired     : '/images/sprite/fogport/zhouyu_tired.png',
    },
    luzhao: {
      cold      : '/images/sprite/fogport/luzhao_cold.png',
      default   : '/images/sprite/fogport/luzhao_default.png',
      side      : '/images/sprite/fogport/luzhao_side.png',
      softer    : '/images/sprite/fogport/luzhao_softer.png',
    },
    jiangyan: {
      calm      : '/images/sprite/fogport/jiangyan_calm.png',
      default   : '/images/sprite/fogport/jiangyan_default.png',
      sit       : '/images/sprite/fogport/jiangyan_sit.png',
      tense     : '/images/sprite/fogport/jiangyan_tense.png',
    },
    luzhensheng: {
      default   : '/images/sprite/fogport/luzhensheng_default.png',
      side      : '/images/sprite/fogport/luzhensheng_side.png',
    },
    laochen: {
      default   : '/images/sprite/fogport/laochen_default.png',
    },
    zhaoyongnian: {
      default   : '/images/sprite/fogport/zhaoyongnian_default.png',
      guarded   : '/images/sprite/fogport/zhaoyongnian_guarded.png',
    },
    laosun: {
      default   : '/images/sprite/fogport/laosun_default.png',
    },
    wujingdong: {
      default   : '/images/sprite/fogport/wujingdong_default.png',
      recall    : '/images/sprite/fogport/wujingdong_recall.png',
    },
    old_postman: {
      default   : '/images/sprite/fogport/old_postman_default.png',
    },
  },

  animations: {},

  // ✅ 音频已全部落位：5 SE（程序合成占位）+ 5 BGM（用户采购，2026-09-16 放入 public/audio/）。
  // 剧本 script.ts 的 bgm/se 播放指令已放开为生效态（基础 BGM 在音频设计块首条、切换见行内 BGM→ 标记、SE 见行内 SE：标记）。
  audio: {
    // —— 5 个 SE（短音效，程序合成占位）——
    se_letter:  '/audio/se_letter.wav',
    se_card:    '/audio/se_card.wav',
    se_photo:   '/audio/se_photo.wav',
    se_coffee:  '/audio/se_coffee.wav',
    se_rain:    '/audio/se_rain.wav',
    // —— 5 个 BGM（用户采购，循环背景乐）——
    bgm_main:    '/audio/bgm_main.wav',
    bgm_tension: '/audio/bgm_tension.wav',
    bgm_cafe:    '/audio/bgm_cafe.wav',
    bgm_truth:   '/audio/bgm_truth.wav',
    bgm_silence: '/audio/bgm_silence.wav',
  },

  items: {
    card_burnt          : { src: '/images/items/card_burnt.png', caption: '烧焦的借书卡' },
    final_pencil_note   : { src: '/images/items/final_pencil_note.png', caption: '最后一页的铅笔字' },
    fire_report_table   : { src: '/images/items/fire_report_table.png', caption: '消防年度通报·起火部位' },
    letter7             : { src: '/images/items/letter7.png', caption: '第七封匿名信' },
    newspaper_1020      : { src: '/images/items/newspaper_1020.png', caption: '十月二十日·火灾报道' },
    note_lu             : { src: '/images/items/note_lu.png', caption: '陆昭的便签' },
    old_book            : { src: '/images/items/old_book.png', caption: '旧货市场上的书' },
    photo_scorch        : { src: '/images/items/photo_scorch.png', caption: '焦痕照片' },
    photo_stain         : { src: '/images/items/photo_stain.png', caption: '后门痕迹照片' },
    postmark            : { src: '/images/items/postmark.png', caption: '邮戳' },
    regular_list        : { src: '/images/items/regular_list.png', caption: '常客名单' },
    report_copy         : { src: '/images/items/report_copy.png', caption: '火灾报告复印件' },
    report_p18          : { src: '/images/items/report_p18.png', caption: '第十八页报告' },
    seven_papers        : { src: '/images/items/seven_papers.png', caption: '七张纸' },
    tin_box             : { src: '/images/items/tin_box.png', caption: '铁盒' },
    two_timelines       : { src: '/images/items/two_timelines.png', caption: '两条时间线' },
  },
};
