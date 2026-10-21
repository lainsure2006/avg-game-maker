/**
 * 《雪见庄·长夜》story14 资源清单（Step 4 筹备 · 资产词表 v2 · 不计成本版）
 *
 * 物理隔离前缀 `xuejian`，落位目录：
 *   public/images/{bg,sprite,items}/xuejian/
 *   public/audio/xuejian/
 *
 * 命名依据：《资产设计蓝图_Step4筹备.md》
 *   - 背景：42 常规（17 场景 base + 变体）+ 18 CG（CG 走 backgrounds 通道）
 *   - 立绘：8 角色 × 6–7 pose（pose=表情）= 51 张
 *   - 物件：8（请柬/银镯/半枚符号/血信/刀鞘/绣样/庚辰册/旧庄景图）
 *   - 音频：12 BGM + 12 SE
 *   - 序列帧：炉火 / 飘雪
 *
 * ⚠️ 资产落地状态（2026-10-19 更新）：
 *    - A 机（krea2 / CloudStudio T4）已产出并接入：背景 43 张（常规 bg 全量）+ 物件 8 张 → 已拷至 public/images/{bg,items}/xuejian/。
 *    - B 机待出（qwen-image 2.1 / AutoDL 3090）：立绘 51 + CG 18 + 序列帧 8 + 音频 25。
 *      这些 key 目前**已用真实占位文件补位**（CG=深色图 / 序列帧=全透明 / 立绘=半透明轮廓 / 音频=静音 mp3），
 *      由 story-wip/雪见庄长夜/make_placeholder_assets.py 生成；B 机出图后**同名覆盖即可生效**，无需改代码。
 *    - 铁律：manifest 里声明的每个 URL 必须对应真实文件。引擎对「声明了却不存在」的资源不负责兜底
 *      （序列帧 loop 动画会常驻绘制第一帧，broken 图片会让 drawImage 抛错并终止主循环）。
 *      缺资源请补占位文件，**不要改引擎**。
 *    - 所有 key 必须与 script.ts 中指令完全一致（引擎 backgrounds[cmd.bg] 无前缀处理）。
 */
import type { AssetManifest } from '../../engine/types';

const BG = (k: string) => `/images/bg/xuejian/${k}.png`;
const SP = (k: string) => `/images/sprite/xuejian/${k}.png`;
const IT = (k: string) => `/images/items/xuejian/${k}.png`;
const AU = (k: string) => `/audio/xuejian/${k}.mp3`;

export const manifest: AssetManifest = {
  // —— 背景：42 常规（写实 noir · krea2 定调）——
  backgrounds: {
    // 序章
    bg_postoffice:        BG('bg_postoffice'),         // 小镇邮局（取信）
    bg_snowroad:         BG('bg_snowroad'),           // 雪原步行上山（九公里）
    bg_snowroad_avalanche:BG('bg_snowroad_avalanche'), // 雪崩
    bg_snowroad_clear:   BG('bg_snowroad_clear'),     // 雪融（尾声）
    bg_inn:              BG('bg_inn'),                // 客栈歇脚
    bg_inn_wreck:        BG('bg_inn_wreck'),          // 客栈撞车翻覆
    bg_gate_night:       BG('bg_gate_night'),         // 庄门·夜雪·匾·铜铃
    bg_gate_day:         BG('bg_gate_day'),           // 庄门·白日
    bg_gate_open:        BG('bg_gate_open'),          // 庄门·雪停开
    // 第1章 / 共同线
    bg_lobby_warm:       BG('bg_lobby_warm'),         // 大堂·壁炉暖（宴·对峙）
    bg_lobby_cold:       BG('bg_lobby_cold'),         // 大堂·熄火冷
    bg_lobby_crime:      BG('bg_lobby_crime'),        // 大堂·林越横尸
    bg_corridor:         BG('bg_corridor'),           // 回廊·夜行
    bg_corridor_dark:    BG('bg_corridor_dark'),      // 回廊·熄灯
    bg_guestroom:        BG('bg_guestroom'),          // 侦探客房·线索整理
    bg_guestroom_clue:   BG('bg_guestroom_clue'),     // 客房·暗格开
    bg_dining_feast:     BG('bg_dining_feast'),       // 餐厅·年夜饭
    bg_dining_empty:     BG('bg_dining_empty'),       // 餐厅·人散
    bg_onsen_steam:      BG('bg_onsen_steam'),       // 温泉·蒸汽
    bg_onsen_pooldead:   BG('bg_onsen_pooldead'),     // 温泉·林越坠池
    bg_onsen_blood:      BG('bg_onsen_blood'),       // 温泉·血色
    // 路线 / 旧案
    bg_stable:           BG('bg_stable'),             // 马厩
    bg_stable_cell:      BG('bg_stable_cell'),        // 马厩羁所·老周父死地
    bg_study:            BG('bg_study'),              // 澜书房
    bg_study_archive:    BG('bg_study_archive'),      // 书房·卷宗摊开
    bg_study_secret:     BG('bg_study_secret'),       // 书房·暗格
    bg_boiler:           BG('bg_boiler'),             // 锅炉房
    bg_boiler_fire:      BG('bg_boiler_fire'),        // 锅炉房·重烧池子
    bg_boiler_ash:       BG('bg_boiler_ash'),         // 锅炉房·灰冷
    bg_forest:           BG('bg_forest'),             // 后山雪林
    bg_forest_cliff:     BG('bg_forest_cliff'),       // 后山·崖
    bg_forest_grave:     BG('bg_forest_grave'),       // 后山·旧坟
    bg_shrine:           BG('bg_shrine'),             // 祠堂/工棚
    bg_kitchen:          BG('bg_kitchen'),            // 厨房（routeC 阿福线）
    bg_oldphoto:         BG('bg_oldphoto'),           // 旧案照片/卷宗·回忆插叙底（第8章闪回）
    bg_garage:           BG('bg_garage'),             // 车库
    bg_garage_tire:      BG('bg_garage_tire'),        // 车库·轮胎痕
    bg_rooftop:          BG('bg_rooftop'),            // 天台/钟楼
    bg_rooftop_bell:     BG('bg_rooftop_bell'),       // 钟楼·钟
    bg_rooftop_clear:    BG('bg_rooftop_clear'),      // 钟楼·雪晴
    bg_basement:         BG('bg_basement'),           // 地下室
    bg_basement_secret:  BG('bg_basement_secret'),    // 地下室·暗格/秘道
    bg_void:             BG('bg_void'),               // 留白黑场·NG+ 覆盖层
  },

  // —— 立绘：8 角色 × 6–7 pose（pose=表情；qwen-image 2.1 参考重生 · 写实）——
  sprites: {
    detective: { // 你 / 无名侦探（第一人称 POV，通常隐去；反思/CG 才显）
      default: SP('detective_default'), think: SP('detective_think'), tense: SP('detective_tense'),
      shock: SP('detective_shock'), sad: SP('detective_sad'), resolve: SP('detective_resolve'), wry: SP('detective_wry'),
    },
    lan: { // 雪见澜·庄主遗孀
      default: SP('lan_default'), cold: SP('lan_cold'), grief: SP('lan_grief'),
      resolve: SP('lan_resolve'), soft: SP('lan_soft'), bitter: SP('lan_bitter'), shock: SP('lan_shock'),
    },
    laozhou: { // 老周·管家
      default: SP('laozhou_default'), worried: SP('laozhou_worried'), grief: SP('laozhou_grief'),
      tense: SP('laozhou_tense'), resolve: SP('laozhou_resolve'), old: SP('laozhou_old'), shock: SP('laozhou_shock'),
    },
    shenman: { // 沈曼·女医生
      default: SP('shenman_default'), worried: SP('shenman_worried'), shock: SP('shenman_shock'),
      guilty: SP('shenman_guilty'), soft: SP('shenman_soft'), cold: SP('shenman_cold'), sad: SP('shenman_sad'),
    },
    linyue: { // 林越·中年生意人（首案死者）
      default: SP('linyue_default'), drunk: SP('linyue_drunk'), dead: SP('linyue_dead'), smug: SP('linyue_smug'),
    },
    suyao: { // 苏窈·女画家
      default: SP('suyao_default'), draw: SP('suyao_draw'), curious: SP('suyao_curious'),
      cold: SP('suyao_cold'), close: SP('suyao_close'), shock: SP('suyao_shock'),
    },
    gushen: { // 顾沉·推理小说家
      default: SP('gushen_default'), sharp: SP('gushen_sharp'), amused: SP('gushen_amused'),
      serious: SP('gushen_serious'), shock: SP('gushen_shock'), think: SP('gushen_think'),
    },
    afu: { // 阿福·杂工（第八透明人）
      default: SP('afu_default'), lookup: SP('afu_lookup'), tense: SP('afu_tense'),
      shock: SP('afu_shock'), resolve: SP('afu_resolve'), cold: SP('afu_cold'), sad: SP('afu_sad'),
    },
  },

  animations: {
    anim_fire: { frames: [BG('anim_fire_0'), BG('anim_fire_1'), BG('anim_fire_2'), BG('anim_fire_3')], frameRate: 8, loop: true },
    anim_snow: { frames: [BG('anim_snow_0'), BG('anim_snow_1'), BG('anim_snow_2'), BG('anim_snow_3')], frameRate: 6, loop: true },
  },

  // —— 音频 ——
  audio: {
    // BGM
    bgm_title:    AU('bgm_title'),      // 标题/选故事·主题
    bgm_main:     AU('bgm_main'),       // 主旋律 noir piano
    bgm_prologue: AU('bgm_prologue'),   // 序章·风雪独行
    bgm_feast:    AU('bgm_feast'),      // 除夕宴·表面暖
    bgm_night:    AU('bgm_night'),      // 夜行调查
    bgm_tension:  AU('bgm_tension'),    // 悬疑/反转/揭示
    bgm_tender:   AU('bgm_tender'),     // 温情/结局
    bgm_memory:   AU('bgm_memory'),     // 旧时光闪回
    bgm_ending:   AU('bgm_ending'),     // 尾声
    bgm_routeA:   AU('bgm_routeA'),     // routeA·沉重
    bgm_routeB:   AU('bgm_routeB'),     // routeB·哀婉
    bgm_routeC:   AU('bgm_routeC'),     // routeC·冷寂
    // SE
    se_wind:      AU('se_wind'),        // 风雪
    se_door:      AU('se_door'),        // 门轴/拐杖
    se_footstep:  AU('se_footstep'),    // 雪地脚步
    se_fire:      AU('se_fire'),        // 炉火/燃烧
    se_knife:     AU('se_knife'),       // 刀鸣
    se_heartbeat: AU('se_heartbeat'),    // 心跳
    se_glass:     AU('se_glass'),       // 玻璃碎
    se_bell:      AU('se_bell'),        // 钟鸣
    se_splash:    AU('se_splash'),      // 落水闷响
    se_page:      AU('se_page'),        // 翻档
    se_thunder:   AU('se_thunder'),     // 雪崩闷响
    se_creak:     AU('se_creak'),       // 门轴/木桥
    se_clue:      AU('se_clue'),        // 线索浮现
  },

  // —— 物件（书信/信物放大图 · item 弹窗）——
  items: {
    item_invitation:  { src: IT('item_invitation'),  caption: '火漆请柬·雪见庄旧事将清' },
    item_bracelet:    { src: IT('item_bracelet'),    caption: '澜的银镯·内侧两道掐痕' },
    item_halfsymbol:  { src: IT('item_halfsymbol'),  caption: '半枚符号·刻「符号不全的，是冤」' },
    item_bloodletter: { src: IT('item_bloodletter'), caption: '曼娘血信·替我护住曼娘' },
    item_sheath:      { src: IT('item_sheath'),      caption: '周德海遗刀鞘·沈砚秋赠德海 + 怀表' },
    item_embroidery:  { src: IT('item_embroidery'),  caption: '阿福母绣样·朱砂符号' },
    item_ledger:      { src: IT('item_ledger'),      caption: '庚辰册·立契文书' },
    item_photo:       { src: IT('item_photo'),       caption: '泛黄庄景图·被抹去的第三人' },
  },
};

// —— CG（18 张·电影级过场 · 走 backgrounds 通道）——
manifest.backgrounds = {
  ...manifest.backgrounds,
  cg_prologue_trek:      BG('cg_prologue_trek'),       // 雪夜九公里跋涉 key visual
  cg_prologue_gate:      BG('cg_prologue_gate'),       // 庄门初见澜
  cg_ch1_drowning:       BG('cg_ch1_drowning'),        // 林越坠池横尸
  cg_ch2_footprints:     BG('cg_ch2_footprints'),      // 雪地脚印探查
  cg_ch4_medicine:       BG('cg_ch4_medicine'),        // 密室与药箱
  cg_ch5_stable_talk:    BG('cg_ch5_stable_talk'),     // 老周夜话·羁所
  cg_ch6_symbol:         BG('cg_ch6_symbol'),          // 半枚符号刻字
  cg_sigil_wax:          BG('cg_sigil_wax'),           // 火漆族徽
  cg_bracelet:           BG('cg_bracelet'),            // 银镯两道掐痕
  cg_knife_sheath:       BG('cg_knife_sheath'),        // 周德海遗刀鞘+怀表
  cg_bloodletter:        BG('cg_bloodletter'),         // 曼娘血信
  cg_routeA_ledger:      BG('cg_routeA_ledger'),       // 账册名字揭露·老周沈曼对峙
  cg_routeB_orphan_wife: BG('cg_routeB_orphan_wife'),  // 澜独白·替夫担罪
  cg_routeC_knife:       BG('cg_routeC_knife'),        // 阿福执刀·透明人逆袭
  cg_burn_pool:          BG('cg_burn_pool'),           // 重烧池子·火焚伪装
  cg_memory_20y:         BG('cg_memory_20y'),          // 二十年前·沈砚秋溺亡
  cg_ngplus_origin:      BG('cg_ngplus_origin'),       // 侦探身世·沈家孤儿
  cg_epilogue_snow:      BG('cg_epilogue_snow'),       // 来年雪·火漆余响
};
