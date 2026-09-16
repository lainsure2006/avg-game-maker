/**
 * 《雾港回声》story4 脚本 —— 由 剧本化/*.md 自动拼接生成（素材/build_story4.py）
 *
 * 生成时间：2026-09-16 09:40
 * 拓扑：ch01–06 共通 → ch06 三分支（ch07a/08a/09a ｜ 07b/08b/09b ｜ 07c/08c/09c）
 *       → ch10 汇聚 → ch11 终局抉择（publish × clue>=8）→ ch12-1/2/3 三结局
 * 已含：① pose 接线（10_剧本pose接线表.md）② 8 条 CG scene 补镜 ③ item 补漏
 * ✅ 音频指令已放开为生效态（2026-09-16）：manifest.audio 已登记 5 SE + 5 BGM，全部文件落位 public/audio/。
 */
import type { ScriptCommand } from '../../engine/types';

export const fogportScript = [

// ============ ch01 · 第七封信 ============
// —— 变量初始化（共通线起点；引擎 set 仅 = += -=）——
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_main" },   // S01 起·阴郁雨夜主调
{ "type": "set", "variable": "clue",        "value": 0, "op": "=" },
{ "type": "set", "variable": "trust_lu",    "value": 0, "op": "=" },
{ "type": "set", "variable": "trust_jiang", "value": 0, "op": "=" },
{ "type": "set", "variable": "publish",     "value": 0, "op": "=" },

// S01–S02 报社夜雨·建立（主角无立绘）
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold", "weather": "rain" },
{ "type": "narration", "text": "雾港的十月，雨下得像有人在天台上不停地翻书。" },
{ "type": "narration", "text": "你在晚报实习的第八个月，工位在走廊尽头，头顶的灯管有一半是坏的。" },

// S03 老陈拍信
// SE：se_letter（信拍到桌面，见 §5.2）
  { "type": "se", "id": "se_letter" },
{ "type": "char", "action": "show", "id": "laochen", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "老陈", "text": "又是你的。第七封了。" },
{ "type": "char", "action": "hide", "id": "laochen" },

// S04 信封特写（zoom 强调质感）
// SE：se_letter（抽信）
  { "type": "se", "id": "se_letter" },
{ "type": "effect", "effect": "zoom", "duration": 1.0 },
{ "type": "narration", "text": "信封是那种最便宜的牛皮纸，没有寄件人，收件人一栏打印着你的名字和报社地址，字体是宋体四号——和你前六封收到的一模一样。" },

// S05 前六封回忆（全屏 CG-01 → 引擎键 `cg_01`）
// ⚠️ 2026-09-15 修正：原注释写「不另出 CG」——那是"没审就下的结论"。
//    3a2「画面呈现形式审核」判定这是全剧第一个闪回、是"匿名信"主线的视觉锚点，
//    且画面无角色（物件与时间的叙事）→ 出 CG。见 09_分镜画面呈现审核_v1.md §3.1。
// ⚠️ 2026-09-16 键名更正：本行原写自造的 `cg_recall_six_letters`（9/7 留下），
//    与 09 §7.1 的权威口径（`cg_01`…`cg_08`）不一致 → 统一为 `cg_01`，并启用该指令。
{ "type": "scene", "bg": "cg_01", "transition": "dissolve" },
{ "type": "narration", "text": "前六封你拆开看过，开头几封都只有一句话，写在方格纸上，用尺子比着写：那不是意外。" },
{ "type": "narration", "text": "后来的几封开始在后面添字——一个名字，一句‘别信签名的人’——你当时嫌烦，没往心里去。" },

// S06 第七封信内容 → item（戏眼①）
// BGM→bgm_tension 先兆；SE：se_letter（展开信纸）
  { "type": "bgm", "action": "play", "id": "bgm_tension" },
  { "type": "se", "id": "se_letter" },
{ "type": "item", "id": "letter7" },
{ "type": "narration", "text": "第七封不一样。信封比之前的厚。里面还是那张方格纸，还是尺子比着写的字，只是这次不止一句。" },

// S07 借书卡 → item（戏眼②）
// SE：se_card（硬卡片摩擦）
  { "type": "se", "id": "se_card" },
{ "type": "item", "id": "card_burnt" },
{ "type": "narration", "text": "纸的下面还压着一片东西。一张烧焦了边缘的硬纸卡片，巴掌大，正面印着褪色的蓝色横线，横线上用钢笔写着书名和一个日期。卡片右下角有一枚模糊的红色印章，只剩半个‘灯’字。背面用铅笔写着一个名字：江砚。" },

// S08 周聿登场
// BGM→bgm_tension 正式切（悬疑升级）
  { "type": "bgm", "action": "play", "id": "bgm_tension" },
{ "type": "char", "action": "show", "id": "zhouyu", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "周聿", "text": "还不走？" },
{ "type": "dialog", "speaker": "你", "text": "（把卡片递过去）" },
{ "type": "dialog", "speaker": "周聿", "text": "前六封呢？" },
{ "type": "dialog", "speaker": "你", "text": "抽屉里。" },
{ "type": "dialog", "speaker": "周聿", "text": "你实习八个月，收到七封匿名信，一封都没报？" },
{ "type": "dialog", "speaker": "你", "text": "我以为……是谁的恶作剧。" },

// S09 信息揭示·张力（周聿当年跑案）
{ "type": "dialog", "speaker": "周聿", "text": "江砚。三年前灯塔书店火灾，唯一一个从里面活着出来的人。今年三十一，现在在老城区开咖啡馆，店名叫‘回声’。" },
{ "type": "dialog", "speaker": "周聿", "text": "三年前这个案子是我跑的。结案那天我写了通稿，八百字，标题是《老旧线路引发火灾 店主不幸遇难》。我签的字。" },
{ "type": "narration", "text": "他说那八个字到现在都记得——‘排除他杀可能’。写的时候他信，现在他不确定还信不信了。" },

// S10 收束·举灯下（zoom 强调悬念）
// BGM bgm_tension 留白收束；SE：se_rain 渐强
  { "type": "se", "id": "se_rain" },
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "effect", "effect": "zoom", "duration": 1.2 },
{ "type": "narration", "text": "你把那张烧焦的借书卡举到灯下。蓝色横线，钢笔字，半个红章。三年前的十月十九日，有人在这张卡上写下了要还的书。而那本书，和写下它的人，一起烧在了灯塔书店的一楼。雨更大了。" },

// → ch02（共通线下一章，由 script 顺序接续）

// ============ ch02 · 灰烬里的目录卡片 ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_main" },   // S01 起·安静探索主调

// S01–S02 图书馆四楼过刊室
{ "type": "scene", "bg": "library", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "第二天上午你请了半天假，去了市图书馆。过刊阅览室在四楼，一年四季都是纸和霉的味道。" },
{ "type": "narration", "text": "你要的是三年前的本地报纸合订本。管理员找了二十分钟，抱来一本积了灰的厚册子，放在你面前时砸出一小团灰尘。" },

// S03 十月二十日火灾报道 → item（戏眼①）
// SE：se_photo（拍下这一页）
  { "type": "se", "id": "se_photo" },
{ "type": "item", "id": "newspaper_1020" },
{ "type": "narration", "text": "十月二十日，社会新闻版右下角：《老城灯塔书店火灾 店主不幸身亡》。死者陈守拙，六十七岁，起火约凌晨二时四十分，认定阁楼电气线路老化短路，排除他杀可能。配图是黑白现场照，门楣上‘灯塔’二字只剩半个‘火’字旁。" },
// S04 往后翻一周·无后续报道
{ "type": "narration", "text": "你把这一页拍下来。往后翻一周——没有后续报道。火灾死了一个人，在报纸上只活了一天。" },

// S05 查陈守拙
{ "type": "narration", "text": "资料很少。老人无妻无子，书店开了三十一年。网上只有几条街坊怀念帖，和一张多年前的社区合影——他抱着一只橘猫，笑得眼睛都看不见了。" },

// S06 消防年度通报·起火部位 → item（戏眼②）
// SE：se_photo（翻拍附表）
  { "type": "se", "id": "se_photo" },
{ "type": "item", "id": "fire_report_table" },
{ "type": "narration", "text": "你在电子资源区调出本地消防年度通报，翻到三年前那一册。火灾统计附表只有一行关于灯塔书店的记录，‘起火部位’一栏写着四个字：一层营业区。" },

// S07 矛盾点 + clue+1
{ "type": "narration", "text": "阁楼线路老化。起火部位是一层营业区。你把这两行抄在笔记本上，中间画了一条线。匿名信没有说错。" },
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// S08 回报社·周聿不在·转正评议
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold", "weather": "rain" },
{ "type": "narration", "text": "下午你回到报社，周聿不在。你在他桌上看到一份摊开的会议纪要，红笔圈出的日期是今天——社会新闻部实习记者转正评议，名单上你是第二个。" },
{ "type": "narration", "text": "你把纪要推回原处。" },

// S09 夜电话·管理员忆灯塔印章
{ "type": "narration", "text": "晚上八点你给管理员打电话。她说陈老先生走后书‘全部烧毁’，但第二年春天旧货市场有人见过带灯塔印章的书。‘红色的，小小的，盖在借书卡上，是一盏灯的图案。’" },

// S10 摸出借书卡·悬念收束
// SE：se_card（摩挲）
  { "type": "se", "id": "se_card" },
{ "type": "narration", "text": "你挂了电话，从口袋里摸出那张烧焦的借书卡。半个‘灯’字。如果书全烧了，这本不该存在。" },

// → ch03（主角决定去书店遗址）

// ============ ch03 · 灯塔书店遗址 ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_main" },      // S01 起·遗址探索

// S01 临江路坡·外景
{ "type": "scene", "bg": "oldstreet_dusk", "transition": "fade", "grade": "dusk" },
{ "type": "narration", "text": "临江路47号在一个坡上。老城区在拆迁，半条街刷着白色的‘拆’字。只有坡顶还住着几户不肯搬的人家，晾衣绳横在巷子中间。" },

// S02–S03 钻围挡·废墟内
{ "type": "scene", "bg": "ruins_dusk", "transition": "dissolve", "grade": "dusk" },
{ "type": "narration", "text": "灯塔书店被一圈蓝色铁皮围住，缺口被人掰开，边缘锈成暗红色。你钻进去。废墟比照片里更小，屋顶塌了一半，木梁横七竖八。" },
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "char", "action": "hide", "id": "jiangyan" },
{ "type": "char", "action": "hide", "id": "luzhensheng" },
{ "type": "char", "action": "hide", "id": "laochen" },
{ "type": "char", "action": "hide", "id": "zhaoyongnian" },
{ "type": "char", "action": "hide", "id": "laosun" },
{ "type": "char", "action": "hide", "id": "wujingdong" },
{ "type": "char", "action": "hide", "id": "old_postman" },
{ "type": "scene", "bg": "cg_02", "transition": "fade" },  // ★ CG 补镜（Step 6）

{ "type": "narration", "text": "你往进门右手边走了三步，蹲下来。地面的瓷砖烧裂了，但位置还在——一小块颜色更深的方形区域，边上有一段金属管子残骸。收银台。陈守拙的遗体就在这里被发现。" },

{ "type": "scene", "bg": "ruins_dusk", "transition": "fade", "grade": "dusk" },  // ← CG 回场

// S04 阁楼焦痕反燃 → item（戏眼①）
// SE：se_photo（拍焦痕）
  { "type": "se", "id": "se_photo" },
{ "type": "item", "id": "photo_scorch" },
{ "type": "narration", "text": "你站在半截楼梯下往上看。阁楼地板几乎全没了，只剩边缘一圈横梁。后墙有一小片区域颜色更深——那是当年线路走线的地方，焦痕沿墙体向下延伸，到楼板处就断了。火烧的方向是有迹可循的：木材燃烧痕迹从下往上收窄。但眼前的痕迹是反的——阁楼横梁还在，一层的墙却烧穿了。" },
{ "type": "narration", "text": "你掏出手机，把这道焦痕拍下来，又拍了阁楼残留的线路走向。" },

// S05 后门痕迹 → item（戏眼②）
// SE：se_photo（拍后门）
  { "type": "se", "id": "se_photo" },
{ "type": "item", "id": "photo_stain" },
{ "type": "narration", "text": "你绕到围挡侧面，后门门框还在，门板早没了。后门内侧的地上，有一小片颜色——不是焦黑，是深褐色，一层薄薄的、干涸的东西，被三年的雨冲淡了，从门口向内延伸约两米，消失在碎砖下面。你蹲下去，拍了照。" },

// S06 江砚登场
// BGM→bgm_tension（悬疑升级）
  { "type": "bgm", "action": "play", "id": "bgm_tension" },
{ "type": "char", "action": "show", "id": "jiangyan", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "江砚", "text": "你最好别动那个。" },
{ "type": "narration", "text": "一个男人站在围挡缺口处，三十出头，洗旧的深灰色毛衣，头发湿的。他的脸你见过——火灾报道配图的围观者照片里，最前面那个年轻人是他。" },
{ "type": "dialog", "speaker": "你", "text": "我知道你是谁。" },
{ "type": "dialog", "speaker": "江砚", "text": "我知道你不知道我是谁。否则你不会站在那里。" },

// S07 关键问答
{ "type": "dialog", "speaker": "你", "text": "火是从哪里烧起来的？" },
{ "type": "narration", "text": "江砚看着你。很久。久到你以为他不会回答。" },
{ "type": "dialog", "speaker": "江砚", "text": "一楼。" },
// S08 蹲放白菊 → CG-03（分镜 S08 类型=CG；本镜立绘下台，画面由 CG 承载）
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "char", "action": "hide", "id": "jiangyan" },
{ "type": "char", "action": "hide", "id": "luzhensheng" },
{ "type": "char", "action": "hide", "id": "laochen" },
{ "type": "char", "action": "hide", "id": "zhaoyongnian" },
{ "type": "char", "action": "hide", "id": "laosun" },
{ "type": "char", "action": "hide", "id": "wujingdong" },
{ "type": "char", "action": "hide", "id": "old_postman" },
{ "type": "scene", "bg": "cg_03", "transition": "fade" },  // ★ CG 补镜（Step 6）

{ "type": "narration", "text": "他从你身边走过去，蹲在收银台那块深色地砖前，把其中一袋东西放在地上——一束白菊，用牛皮纸包着。" },
{ "type": "dialog", "speaker": "江砚", "text": "三年了。每个月十九号我都来。但你是第一个问我这个问题的。" },

{ "type": "scene", "bg": "ruins_dusk", "transition": "fade", "grade": "dusk" },  // ← CG 回场

// S09 收束 + clue+1
{ "type": "char", "action": "hide", "id": "jiangyan" },
{ "type": "narration", "text": "你站在废墟里，脑子里同时浮起两条方向：官方的卷宗（陆昭），和幸存者的口述（江砚）。" },
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// → ch04（官方卷宗：陆昭）/ ch05（幸存者口述：江砚）

// ============ ch04 · 陆昭 ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // S01 起·询问室蓄力

// S01–S02 警局走廊→询问室·陆昭登场
{ "type": "scene", "bg": "police_corridor", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "去警局是在第三天上午。你没预约，在接待窗口等了四十分钟。走廊尽头一门开了，出来个穿便服的女人，白衬衫黑西裤，手里端着一次性纸杯。" },
{ "type": "scene", "bg": "interrogation", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "luzhao", "position": "left", "pose": "default" },
{ "type": "dialog", "speaker": "陆昭", "text": "雾港晚报？跟我来。" },
{ "type": "narration", "text": "询问室很小，墙上贴着‘执法记录’四个字。她在你对面坐下，纸杯放桌上，没喝。" },
{ "type": "dialog", "speaker": "陆昭", "text": "陆昭，刑侦支队。你想问灯塔书店的案子。" },
{ "type": "dialog", "speaker": "你", "text": "是。" },
{ "type": "dialog", "speaker": "陆昭", "text": "案子三年前结了。结论是意外。" },

{ "type": "char", "action": "move", "id": "luzhao", "pose": "cold" },  // pose 接线（ch04 S03）
// S03 正面交锋
{ "type": "dialog", "speaker": "你", "text": "起火部位是一层营业区，认定原因是阁楼线路老化。这两句不在一个案卷里，是我从两个地方抄来的。" },
{ "type": "dialog", "speaker": "陆昭", "text": "你在质疑一份经过两级审核的结论。" },
{ "type": "dialog", "speaker": "你", "text": "我在问一个问题。" },
{ "type": "dialog", "speaker": "陆昭", "text": "问题是有成本的。你实习多久了？" },
{ "type": "dialog", "speaker": "你", "text": "八个月。" },
{ "type": "dialog", "speaker": "陆昭", "text": "重新开一个已结案件，需要新的证据，不是新的怀疑。你手上有新的证据吗？" },

// S04 借书卡复核 → item（戏眼①）
// SE：se_card（放卡到桌）
  { "type": "se", "id": "se_card" },
{ "type": "item", "id": "card_burnt" },
{ "type": "dialog", "speaker": "你", "text": "有一张借书卡。" },
{ "type": "narration", "text": "你把烧焦的卡片放在桌上。陆昭看着它，这一次看的时间更长。" },

// S05 陆昭便签 → item（戏眼②）
// SE：se_letter（推便签）
  { "type": "se", "id": "se_letter" },
{ "type": "item", "id": "note_lu" },
{ "type": "narration", "text": "她伸手从桌上抽出一张便签，用你前所未见的速度写了一个号码，推给你。" },
{ "type": "dialog", "speaker": "陆昭", "text": "这是我父亲的电话。他叫陆振声，三年前他是这个案子的调查负责人，结论是他签的。他去年中风，现在说话不太利索，但脑子清楚。" },

// S06 态度交锋
{ "type": "dialog", "speaker": "你", "text": "你不觉得有问题吗？" },
{ "type": "dialog", "speaker": "陆昭", "text": "我三年前就觉得有问题。我问过他。他说证据是完整的。" },
{ "type": "dialog", "speaker": "你", "text": "你信了？" },
{ "type": "char", "action": "hide", "id": "luzhao" },

// S07 走廊·人物弧光
{ "type": "scene", "bg": "police_corridor", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "luzhao", "position": "left", "pose": "side" },
{ "type": "dialog", "speaker": "陆昭", "text": "我是他女儿。我信不信，不影响结论。" },
{ "type": "char", "action": "hide", "id": "luzhao" },

// S08 收束 + clue+1
{ "type": "narration", "text": "你低头看那张便签。号码下面的笔迹很重，最后一笔划破了纸。" },
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// → ch05（幸存者口述：江砚）

// ============ ch05 · 回声咖啡 ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_cafe" },   // S01 起·暖色孤岛

// S01 回声咖啡·江砚擦杯
{ "type": "scene", "bg": "cafe_night", "transition": "fade", "grade": "warm" },
{ "type": "narration", "text": "‘回声’在老城区另一条街上。推门进去有铃响，空气里是咖啡和旧书的味道——靠墙整面书架，书脊发黄。江砚在吧台后面擦杯子。" },
{ "type": "char", "action": "show", "id": "jiangyan", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "江砚", "text": "你找到这儿来了。" },

// S02 店名由来
{ "type": "dialog", "speaker": "你", "text": "你的店名。" },
{ "type": "dialog", "speaker": "江砚", "text": "灯塔书店的常客都记得那个印章。一盏灯。我用它做了店名，算是……没让它彻底没了。" },

{ "type": "char", "action": "move", "id": "jiangyan", "pose": "sit" },  // pose 接线（ch05 S03/S04）
// S03–S04 坐定·摊牌前奏
{ "type": "dialog", "speaker": "你", "text": "三年前十月十九日凌晨，你为什么回书店？" },
{ "type": "char", "action": "move", "id": "jiangyan", "pose": "tense" },  // pose 接线（ch05 S05）
// S05 推力逼近·手指收紧
{ "type": "narration", "text": "他的手指在桌面上收紧了一下。很轻，但你看到了。" },
{ "type": "dialog", "speaker": "江砚", "text": "谁告诉你的？" },
{ "type": "dialog", "speaker": "你", "text": "火灾报道里，消防的到场记录写着‘二楼发现一名被困人员，由消防员从后门带出’。二楼是阁楼。一个店员，凌晨两点多，在已经起火的店里待在阁楼——除非你是回去的，否则你没理由在那儿。" },

{ "type": "char", "action": "move", "id": "jiangyan", "pose": "calm" },  // pose 接线（ch05 S06）
// S06 反转①
{ "type": "dialog", "speaker": "江砚", "text": "我在那里住过。陈老先生让我住在阁楼。那年我二十三，家里出了事，没地方去。他给了我一个阁楼和一份工作。" },
{ "type": "dialog", "speaker": "江砚", "text": "那晚我根本不在店里。我十九号下午去了外地，二十号晚上才回来。等我回来，书店已经烧完了。" },

{ "type": "char", "action": "move", "id": "jiangyan", "pose": "default" },  // pose 接线（ch05 S07）
// S07 反转②·报告造假
{ "type": "dialog", "speaker": "你", "text": "所以报道里‘被困人员获救’那条——" },
{ "type": "dialog", "speaker": "江砚", "text": "是二十号晚上。我回到雾港，直接去了书店。火已经灭了，现场还封着。我从后门翻进去，想找陈老先生的东西，在阁楼上待了十分钟，留守消防发现了我，把我抬了出去。" },
{ "type": "dialog", "speaker": "江砚", "text": "然后他们把我写进了十九号凌晨的报告。因为这样比较省事。一次救援，一个获救者，逻辑完整，案子好结。" },

// S08 收束 + clue+1
{ "type": "dialog", "speaker": "江砚", "text": "你要的证据我没有。我只有一句话：那晚我不在。" },
{ "type": "narration", "text": "杯子和布摩擦的声音，一下，一下。‘但你信不信我，是你的事。’" },
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// → ch06（分岔点：你要信谁）

// ============ ch06 · 你要信谁（分岔点） ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // S01 起·高压·峰值在 choice

// S01–S02 报社夜·周聿摊风险
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold", "weather": "rain" },
{ "type": "char", "action": "show", "id": "zhouyu", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "周聿", "text": "还在查？" },
{ "type": "dialog", "speaker": "你", "text": "嗯。" },
{ "type": "dialog", "speaker": "周聿", "text": "转正评议下周一。名额基本定了。" },
{ "type": "dialog", "speaker": "你", "text": "如果那真的是谋杀呢？" },
{ "type": "dialog", "speaker": "周聿", "text": "那你就更惨了。因为你要证明一个警察在报告上撒了谎，而这个警察的女儿，现在还在替这座城市抓坏人。" },

{ "type": "char", "action": "move", "id": "zhouyu", "pose": "side" },  // pose 接线（ch06 S03）
// S03 悬念钩子
{ "type": "dialog", "speaker": "周聿", "text": "我抽屉里有个东西。三点前别走。" },

// S04 报告复印件 → item（戏眼·决定性物证）
// SE：se_letter（拍纸）＋ flash 强调
  { "type": "se", "id": "se_letter" },
{ "type": "effect", "effect": "flash", "duration": 0.3 },
{ "type": "item", "id": "report_copy" },
{ "type": "narration", "text": "夜里两点五十分，周聿把一页纸拍在你桌上——三年前火灾事故调查报告复印件，右上角盖着公章。其中一页被红笔圈了一整段：现场勘查与物证清单。第一条：阁楼东南角，碳化电线一段，认定短路熔痕。第二条：一层营业区地面，提取可燃液体残留试样一份，送检。" },

{ "type": "char", "action": "move", "id": "zhouyu", "pose": "default" },  // pose 接线（ch06 S05）
// S05 裂缝坐实
{ "type": "dialog", "speaker": "你", "text": "送检……结果呢？" },
{ "type": "dialog", "speaker": "周聿", "text": "整份报告十七页。没有结果页。" },
{ "type": "narration", "text": "一份送检了的可燃液体试样，在三年的档案里，没有下文。" },

{ "type": "char", "action": "move", "id": "zhouyu", "pose": "serious" },  // pose 接线（ch06 S06）
// S06 抉择铺陈
{ "type": "dialog", "speaker": "周聿", "text": "你现在有两条路。一是走官方，把这份东西给陆昭，让她走程序申请 reopen——慢，但干净，出来的东西能见报。二是走人，去找江砚，找常客，找旧货市场那些书——快，但拿到的是口述，没有公章。" },
{ "type": "dialog", "speaker": "你", "text": "第三条呢？" },
{ "type": "dialog", "speaker": "周聿", "text": "什么第三条？" },
{ "type": "dialog", "speaker": "你", "text": "谁都不靠。我自己查。" },
{ "type": "dialog", "speaker": "周聿", "text": "那你就会同时失去两边。陆昭不会给你档案，江砚不会给你真话。" },

// S07 抉择临界
{ "type": "narration", "text": "窗外的雨又下起来了。你把那页复印件折好，放进内袋。你必须在天亮之前做出选择。" },
{ "type": "char", "action": "hide", "id": "zhouyu" },

// S08 分岔点：三选一 → 支线（★ 与 §4 门控一致）
{ "type": "choice", "choices": [
  { "text": "把复印件交给陆昭（走官方）", "label": "ch06_A" },
  { "text": "去找江砚，沿记忆查（走人）", "label": "ch06_B" },
  { "text": "谁都不靠，自己查（独立）",    "label": "ch06_C" }
] },
{ "type": "label", "id": "ch06_A" },
{ "type": "set", "variable": "trust_lu", "value": 2, "op": "+=" },
{ "type": "jump", "label": "ch07a" },
{ "type": "label", "id": "ch06_B" },
{ "type": "set", "variable": "trust_jiang", "value": 2, "op": "+=" },
{ "type": "jump", "label": "ch07b" },
{ "type": "label", "id": "ch06_C" },
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },
{ "type": "jump", "label": "ch07c" },

// → ch07a / ch07b / ch07c（分支线，由后续章节文件承接 label）

// ============ ch07a · 她收下了（分支A·物证路线第一幕） ============
// —— 音频设计（注释预留；Step4 音频就位 + manifest.audio 登记后删注释符即生效）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // 全程·陆昭线张力

// ★ 对齐 ch06 的 jump 目标
{ "type": "label", "id": "ch07a" },

// S01–S02 路边夜谈·递交
{ "type": "scene", "bg": "streetside_night", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "luzhao", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "陆昭", "text": "东西呢？" },
{ "type": "narration", "text": "你把复印件递给她。她站在路边，从头看到尾，一共看了四分钟。中间有公交车进站，尾气喷在她脚边，她没动。" },

// S03 她折纸·不问来源
{ "type": "dialog", "speaker": "陆昭", "text": "这份东西你怎么来的？" },
{ "type": "dialog", "speaker": "你", "text": "不能说。" },
{ "type": "dialog", "speaker": "陆昭", "text": "我也没打算问。说了你就成了证人，成了证人我就不能用。" },

// S04 给我三天
{ "type": "dialog", "speaker": "陆昭", "text": "我会看。给我三天。" },
{ "type": "dialog", "speaker": "你", "text": "陆昭。" },
{ "type": "narration", "text": "她停住，没回头。" },

// S05 直球：父亲的结论
{ "type": "dialog", "speaker": "你", "text": "你父亲签的那个结论。如果是错的，你怎么办？" },
{ "type": "narration", "text": "风把她的头发吹起来一缕。" },

// S06 温情钩子·zoom
{ "type": "effect", "effect": "zoom", "duration": 1.0 },
{ "type": "dialog", "speaker": "陆昭", "text": "我当警察的第一天，他送了我一支笔。他说，这支笔写下去的东西，不能改，不能赖，十年后有人翻出来，你得能认。" },
{ "type": "dialog", "speaker": "陆昭", "text": "我认得出他的字。" },  // 回头

// S07 收束·雨
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "narration", "text": "她走了。" },
{ "type": "effect", "effect": "dim", "duration": 0.4 },

// —— 变量：trust_lu += 1（§3：A 线 ch07a）——
{ "type": "set", "variable": "trust_lu", "value": 1, "op": "+=" },

// → ch08a（疗养院）
{ "type": "jump", "label": "ch08a" },

// ============ ch08a · 疗养院（分支A·第二幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // 全程·揭示张力

// ★ 对齐 ch07a 的 jump 目标
{ "type": "label", "id": "ch08a" },

// S01–S03 疗养院307
{ "type": "scene", "bg": "sanatorium", "transition": "fade", "grade": "soft" },
{ "type": "char", "action": "show", "id": "luzhao", "position": "right", "pose": "default" },
{ "type": "char", "action": "show", "id": "luzhensheng", "position": "left", "pose": "side" },
{ "type": "narration", "text": "第三天，陆昭给你发了一条消息：下午两点，城西。疗养院在三楼，走廊里飘着消毒水和饭菜混合的味道。" },
// S02 老人瘦·右手蜷（陆振声·侧面）
{ "type": "dialog", "speaker": "陆昭", "text": "他是记者。" },
{ "type": "narration", "text": "床上的老人比你想象中瘦。陆振声，五十九岁，头发全白，右边身子僵硬，右手蜷着。他看见陆昭，眼睛动了一下；看见你，眼睛又动了一下。" },

// S03 老人喉咙音·指床头柜
{ "type": "dialog", "speaker": "陆昭", "text": "他问灯塔书店。" },

// S04 铁盒 → item（戏眼①）
{ "type": "item", "id": "tin_box" },
{ "type": "narration", "text": "陆昭拉开抽屉，里面是一个旧铁盒，锈了，上面印着饼干两个字。" },

// S05 七张纸 → item（戏眼②·七封信）
{ "type": "item", "id": "seven_papers" },
{ "type": "narration", "text": "最上面一张手写字迹歪斜——是中风后写的，你能辨认出几个字：去找江砚。第二张第三张，全是同一个句子，写了满满七张，一张比一张工整。" },
{ "type": "dialog", "speaker": "陆昭", "text": "他写不了字。他连自己的名字都写不了。" },

// S06 反转钩子
{ "type": "effect", "effect": "flash", "duration": 0.3 },
{ "type": "narration", "text": "她翻到最后一张。纸的背面，有一行更小更歪的字：别信签名的人。" },

// —— 变量：clue += 1（确认匿名信作者，行641）——
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// S07 ★ 追问选择（行642：追问 → clue += 2）
{ "type": "choice", "choices": [
  { "text": "追问陆昭：他为什么写七张", "label": "ch08a_ask" },
  { "text": "不追问，记下就走", "label": "ch08a_skip" }
] },
{ "type": "label", "id": "ch08a_ask" },
{ "type": "set", "variable": "clue", "value": 2, "op": "+=" },
{ "type": "dialog", "speaker": "你", "text": "他为什么写七张？" },
{ "type": "dialog", "speaker": "陆昭", "text": "因为他想有人看见。一个人写七遍，总有一遍能被人捡到。" },
{ "type": "label", "id": "ch08a_skip" },

// → ch09a
{ "type": "jump", "label": "ch09a" },

// ============ ch09a · 第十七页（分支A·第三幕·决定性物证） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // S01–S04

// ★ 对齐 ch08a 的 jump 目标
{ "type": "label", "id": "ch09a" },

// S01 凌晨·陆昭出
{ "type": "scene", "bg": "sanatorium", "transition": "fade", "grade": "cold" },
// 🔴 2026-09-16 补：原稿整章没有 `show`，只有 S06 的 `hide` → 陆昭（本章唯一在场角色、
//    3 句台词）在引擎里根本不会出现。已补登场。
{ "type": "char", "action": "show", "id": "luzhao", "position": "right", "pose": "default" },
{ "type": "narration", "text": "陆昭在他那间带书桌的起居室里翻了一整夜。你被安置在走廊的等候区。凌晨四点她出来，手里拿着一个牛皮纸档案袋，脸色白得像纸。" },
{ "type": "dialog", "speaker": "陆昭", "text": "找到了。" },

// S02 第十八页 → item（戏眼）
{ "type": "item", "id": "report_p18" },
{ "type": "narration", "text": "一沓打印纸，是那份火灾事故调查报告的完整版，一共是十八页。而周聿那份复印件，是十七页。" },
{ "type": "dialog", "speaker": "陆昭", "text": "第十七页之后，原本有第十八页。物证检验报告。一层地面提取的可燃液体残留，检出汽油成分。" },

// S03 检出助燃剂·zoom
{ "type": "effect", "effect": "zoom", "duration": 1.0 },
{ "type": "narration", "text": "检验结论栏，四个黑体字：检出助燃剂。下面手写批注——建议立案侦查，检测人吴敬东；另一行：样本来源存疑，退回，陆振声。" },
{ "type": "dialog", "speaker": "你", "text": "他签了退回？" },

{ "type": "char", "action": "move", "id": "luzhao", "pose": "cold" },  // pose 接线（ch09a S04）
// S04 平声陈述
// 换表情用 `move`（人在台上，原地换 pose，不重放入场动画）
{ "type": "char", "action": "move", "id": "luzhao", "pose": "cold" },
{ "type": "dialog", "speaker": "陆昭", "text": "他签了排除他杀，也签了样本存疑退回。同一支笔，同一天，同一份案子。" },

// S05 举灯·高潮 zoom+dim
{ "type": "effect", "effect": "zoom", "duration": 1.2 },
{ "type": "effect", "effect": "dim", "duration": 0.5 },
{ "type": "narration", "text": "她把那页纸拿起来，对着灯。他把这一页从卷宗里抽走了，锁在自己家里。三年。" },

// S06 天亮·收束
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "narration", "text": "窗外的天开始亮了。他抽走的不是证据，是证据还在的证明。" },

// —— 变量：clue += 2（决定性物证，行691）——
{ "type": "set", "variable": "clue", "value": 2, "op": "+=" },

// → ch10（三线汇聚）
{ "type": "jump", "label": "ch10" },

// ============ ch07b · 常客名单（分支B·记忆路线第一幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_cafe" },   // 咖啡馆暖岛

// ★ 对齐 ch06 的 jump 目标
{ "type": "label", "id": "ch07b" },

// S01–S02 江砚递赊账本
{ "type": "scene", "bg": "cafe_night", "transition": "fade", "grade": "warm" },
{ "type": "char", "action": "show", "id": "jiangyan", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "江砚", "text": "给你一个本子。不是借书卡，是更旧的东西——一本硬壳的笔记本，封面写着赊账两个字。" },
{ "type": "item", "id": "regular_list" },
{ "type": "narration", "text": "里面是陈守拙的笔迹，一页一个人名，后面记着书名和日期，有的画了勾，有的没有。" },

// S03 引导翻到火灾那年
{ "type": "dialog", "speaker": "江砚", "text": "老头不让人欠钱。但他让所有人赊书。这上面是三十一年里在他这儿赊过书的人。" },
{ "type": "dialog", "speaker": "你", "text": "这能做什么？" },
{ "type": "dialog", "speaker": "江砚", "text": "火灾那年的九月和十月，你翻到后面几页。" },

// S04 钩子·zoom
{ "type": "effect", "effect": "zoom", "duration": 1.0 },
{ "type": "narration", "text": "你翻到最后。十月，有十一个名字。最后三个的日期是十月十七日、十八日、十八日。其中一个名字后面没有书名，只有一行小字：来问地契的事。" },

{ "type": "char", "action": "move", "id": "jiangyan", "pose": "calm" },  // pose 接线（ch07b S05）
// S05 留白
{ "type": "dialog", "speaker": "你", "text": "地契？" },
{ "type": "dialog", "speaker": "江砚", "text": "……" },

// —— 变量：trust_jiang += 1（§3：B 线 ch07b）——
{ "type": "set", "variable": "trust_jiang", "value": 1, "op": "+=" },

// → ch08b
{ "type": "jump", "label": "ch08b" },

// ============ ch08b · 来问地契的人（分支B·第二幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // 利益方揭露·蓄力

// ★ 对齐 ch07b 的 jump 目标
{ "type": "label", "id": "ch08b" },

// S01 五金店
{ "type": "scene", "bg": "hardware_store", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "zhaoyongnian", "position": "right", "pose": "guarded" },
{ "type": "narration", "text": "十月十八日来问地契的那个人，叫赵永年。你花了两天找到他——他在新城区开了家五金店，听说是灯塔书店四个字，脸色就变了。" },
{ "type": "dialog", "speaker": "赵永年", "text": "我不想惹事。" },
{ "type": "dialog", "speaker": "你", "text": "我不写你的名字。" },

{ "type": "char", "action": "move", "id": "zhaoyongnian", "pose": "default" },  // pose 接线（ch08b S02）
// S02 三百万·flash
{ "type": "effect", "effect": "flash", "duration": 0.3 },
{ "type": "dialog", "speaker": "赵永年", "text": "那年老城区要改。开发商要整片拿下来，就剩陈老头那一个点。四十七号那个位置，是坡底的转角，他们要做一个入口，缺了那块地，整个方案就得改。" },
{ "type": "dialog", "speaker": "你", "text": "他们给钱了吗？" },
{ "type": "dialog", "speaker": "赵永年", "text": "给了。三百万。" },

// S03 老人语气
{ "type": "dialog", "speaker": "赵永年", "text": "他跟我说——我这辈子没做过什么有用的事。就守着这些书。书在，我这一辈子就有个数。" },

// —— 变量：clue += 1（确认拆迁纠纷与利益方，行780）——
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// S04 ★ 追问选择（行781：追问 → clue += 2）
{ "type": "choice", "choices": [
  { "text": "追问赵永年：那天对方说了什么", "label": "ch08b_ask" },
  { "text": "不追问，记下就走", "label": "ch08b_skip" }
] },
{ "type": "label", "id": "ch08b_ask" },
{ "type": "set", "variable": "clue", "value": 2, "op": "+=" },
{ "type": "dialog", "speaker": "你", "text": "十月十八日下午，你也在场？那天还有谁？" },
{ "type": "dialog", "speaker": "赵永年", "text": "在。那个名字你见过——市图书馆旧报纸上，一个地产公司的名字，以及它董事长的姓。" },
{ "type": "label", "id": "ch08b_skip" },

// → ch09b
{ "type": "jump", "label": "ch09b" },

// ============ ch09b · 旧货市场上的书（分支B·第三幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },   // 揭示·排除意外

// ★ 对齐 ch08b 的 jump 目标
{ "type": "label", "id": "ch09b" },

// S01 旧货市场
{ "type": "scene", "bg": "flea_market", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "jiangyan", "position": "right", "pose": "default" },
{ "type": "char", "action": "show", "id": "laosun", "position": "left", "pose": "default" },
{ "type": "narration", "text": "江砚陪你去了旧货市场。书贩姓孙，摊子上堆着半人高的旧书。江砚直接报了那个红印章。" },
{ "type": "dialog", "speaker": "老孙", "text": "有。" },
{ "type": "narration", "text": "老孙从摊子底下拖出一个纸箱。十四本。每一本的扉页内侧都盖着那盏灯。每一本的最后，都夹着一张借书卡。" },

// S02 借书卡→item（戏眼）
{ "type": "item", "id": "old_book" },
{ "type": "narration", "text": "你一本一本地翻。借书卡上的日期，最晚的一张是十月十九日。火灾发生在十九日凌晨两点四十分。" },

// S03 推理反转
{ "type": "dialog", "speaker": "江砚", "text": "不对。陈老先生从来不在借书卡上写当天日期。他写的是预计归还日，一般是借出去之后一周。" },
{ "type": "dialog", "speaker": "你", "text": "所以——" },
{ "type": "dialog", "speaker": "江砚", "text": "所以这张卡是提前写的。他在十九号之前，就已经写好了十九号的归还日期。" },

{ "type": "char", "action": "move", "id": "jiangyan", "pose": "calm" },  // pose 接线（ch09b S04）
// S04 收束
{ "type": "effect", "effect": "dim", "duration": 0.4 },
{ "type": "dialog", "speaker": "江砚", "text": "他早就把最要紧的书往外送了。他不是被烧死的。他是在等。" },

// —— 变量：clue += 2（排除意外最后拼图，行840）——
{ "type": "set", "variable": "clue", "value": 2, "op": "+=" },

// → ch10（三线汇聚）
{ "type": "jump", "label": "ch10" },

// ============ ch07c · 两条时间线（分支C·独立路线第一幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },

// ★ 对齐 ch06 的 jump 目标
{ "type": "label", "id": "ch07c" },

// S01 申请查阅
{ "type": "scene", "bg": "fire_archive", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "你没有去找陆昭，也没有去找江砚。你去找了消防队。以整理城市火灾年鉴的名义申请查阅非涉密历史出勤记录——这是周聿教你的说法：不要说你在查什么，说你在写什么。" },

// S02 两条时间线→item
{ "type": "item", "id": "two_timelines" },
{ "type": "narration", "text": "三天后你拿到了三年前十月的出勤记录。十九日凌晨：02:47接警，03:05到场，03:41控制火势，04:20扑灭，人员栏写着搜救组4人。二十日晚上：22:16接警，22:31到场——事由是群众报警称有人翻入火灾现场，现场带回1人，批评教育后放行。" },

// S03 被困人员：0
{ "type": "dialog", "speaker": "旁白", "text": "你翻到十九日凌晨那一条，往下看。被困人员：0。火灾报道里写的是二楼发现一名被困人员，由消防员从后门带出。而原始出勤记录里，被困人员是零。" },
{ "type": "narration", "text": "你的手指停在那一格上。" },

// S04 叙事验证
{ "type": "dialog", "speaker": "旁白", "text": "江砚没有撒谎。" },

// → ch08c（clue 不变，行880；ch06 选 C 已 +1）
{ "type": "jump", "label": "ch08c" },

// ============ ch08c · 第一个到场的人（分支C·第二幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },

// ★ 对齐 ch07c 的 jump 目标
{ "type": "label", "id": "ch08c" },

// S01 城郊
{ "type": "scene", "bg": "suburb_home", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "wujingdong", "position": "right", "pose": "default" },
{ "type": "narration", "text": "你找到当年第一个进现场的人花了五天。他叫吴敬东，五十二岁，退休前是消防队的火调员——就是写起火原因的那个人。他在城郊带孙子，开门时手里还拿着奶瓶。" },
{ "type": "dialog", "speaker": "吴敬东", "text": "我不接受采访。" },
{ "type": "dialog", "speaker": "你", "text": "我不是来采访的。" },

// S02 摊牌
{ "type": "dialog", "speaker": "你", "text": "我是来问这个的。" },
{ "type": "narration", "text": "你把那页检测报告拍在桌上。他看着照片，脸色变了。" },
{ "type": "dialog", "speaker": "吴敬东", "text": "你从哪儿弄的？" },
{ "type": "dialog", "speaker": "你", "text": "有人留了一份。" },

{ "type": "char", "action": "move", "id": "wujingdong", "pose": "recall" },  // pose 接线（ch08c S03）
// S03 血迹·flash
{ "type": "effect", "effect": "flash", "duration": 0.3 },
{ "type": "dialog", "speaker": "吴敬东", "text": "后门内侧地上有一片痕迹，褐色的，让雨泡了三天，但形状还在。我取样了。是人的血。而且不是老人的——样本里有一个人的血，和死者的不匹配。" },
{ "type": "narration", "text": "你的呼吸停了半拍。" },

// —— 变量：clue += 1（第三人血迹+检测页被抽走，行939）——
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// S04 ★ 追问选择（行940：追问 → clue += 2）
{ "type": "choice", "choices": [
  { "text": "追问吴敬东：那份报告最后落在谁手里", "label": "ch08c_ask" },
  { "text": "不追问，记下就走", "label": "ch08c_skip" }
] },
{ "type": "label", "id": "ch08c_ask" },
{ "type": "set", "variable": "clue", "value": 2, "op": "+=" },
{ "type": "dialog", "speaker": "吴敬东", "text": "然后那一页就不见了。我去问，他们说卷宗归档就是这个样子。我问了三次。第三次以后，他们就不让我碰这个案子了。" },
{ "type": "label", "id": "ch08c_skip" },

// → ch09c
{ "type": "jump", "label": "ch09c" },

// ============ ch09c · 邮戳（分支C·第三幕） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },

// ★ 对齐 ch08c 的 jump 目标
{ "type": "label", "id": "ch09c" },

// S01 邮局
{ "type": "scene", "bg": "post_office", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "old_postman", "position": "right", "pose": "default" },
{ "type": "narration", "text": "最后一块拼图是一枚邮戳。你回到那七封信上，第七封的你留着——牛皮纸，宋体四号打印的地址，邮戳模糊，但有一个字能认出来：西。城西。陆昭说过，她父亲住在城西疗养院。" },
{ "type": "dialog", "speaker": "老邮员", "text": "有。护工来的，是个小伙子。一次一封，半年多寄了六七回。" },

// S02 邮戳→item（戏眼）
{ "type": "item", "id": "postmark" },
{ "type": "dialog", "speaker": "老邮员", "text": "记得他每次都用现金。而且每次都要我盖清楚点，说老人家交代的，要盖在邮票上，别盖在字上。" },

// S03 闭环
{ "type": "narration", "text": "七封信。一个连自己名字都写不了的中风老人，让护工跑了七趟邮局。" },

// S04 收束
{ "type": "effect", "effect": "dim", "duration": 0.4 },
{ "type": "narration", "text": "那张卡片，三年前应该在卷宗袋里。只有一个人有那个袋子。" },

// —— 变量：clue += 1（确认匿名信出自陆振声本人，行978）——
{ "type": "set", "variable": "clue", "value": 1, "op": "+=" },

// → ch10（三线汇聚）
{ "type": "jump", "label": "ch10" },

// ============ ch10 · 雨夜的最后一页（汇聚线） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_main" },    // 报社主调

// ★ 对齐三条支线的 jump 目标
{ "type": "label", "id": "ch10" },

// S01 摊开物证
{ "type": "scene", "bg": "cg_05", "transition": "fade" },  // ★ CG 补镜（Step 6）
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold", "weather": "rain" },
{ "type": "narration", "text": "回到报社是夜里十一点。整层楼只剩你这一格灯。你把所有的东西摊在桌上：那张烧焦的借书卡、起火部位与认定原因的矛盾、消防出勤记录里被困人员为零、吴敬东的取样记录、旧货市场的十四本书、赊账本上来问地契的事，以及那第十八页——检出助燃剂。" },

{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold", "weather": "rain" },  // ← CG 回场

// S02 周聿登场
{ "type": "char", "action": "show", "id": "zhouyu", "position": "right", "pose": "tired" },
{ "type": "narration", "text": "周聿不知什么时候站在门口，手里拎着两罐啤酒。他走过来，一样一样看过去，看了十分钟，一句话没说。" },
{ "type": "dialog", "speaker": "周聿", "text": "够发吗？" },
{ "type": "char", "action": "move", "id": "zhouyu", "pose": "serious" },  // pose 接线（ch10 S03）
// S03 新闻角度·物证这条就够
{ "type": "dialog", "speaker": "你", "text": "从新闻角度？" },
{ "type": "dialog", "speaker": "周聿", "text": "物证这一条就够。一份盖着公章的检测报告，检出助燃剂，被人为抽走。这一条打出去，市局得重新开案。" },

// S04 人的角度
{ "type": "dialog", "speaker": "你", "text": "从人的角度呢？" },
{ "type": "dialog", "speaker": "周聿", "text": "从人的角度，你要发的是一个女儿的父亲。你要告诉全雾港，一个干了三十年警察的人，在一张报告上撒了谎，撒了三年。" },
{ "type": "dialog", "speaker": "周聿", "text": "他也是留下证据的人。" },

// S05 球在你这儿
{ "type": "dialog", "speaker": "周聿", "text": "他自己说自己有罪，比你说他有一百倍的力气。但他没说。他让一个不相干的人——让我，让你——替他说。" },
{ "type": "narration", "text": "窗外的雨敲在玻璃上。" },
{ "type": "dialog", "speaker": "周聿", "text": "所以现在球在你这儿。发，还是不发。" },
{ "type": "dialog", "speaker": "周聿", "text": "李主任的评议是下周一。如果你明天早上交一篇三千字的稿子，转正名单会改。如果你交不出来——那你现在查的这些东西，就只是你抽屉里的纸。" },

// → ch11（终局对峙）
{ "type": "jump", "label": "ch11" },

// ============ ch11 · 对峙（汇聚线·终局抉择） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_tension" },  // S01–S05 对峙

// ★ 对齐 ch10 的 jump 目标
{ "type": "label", "id": "ch11" },

// S01 咖啡馆→江砚同行
{ "type": "scene", "bg": "cafe_night", "transition": "fade", "grade": "warm" },
{ "type": "char", "action": "show", "id": "jiangyan", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "你", "text": "我要去见他。" },
{ "type": "dialog", "speaker": "江砚", "text": "陆振声？" },
{ "type": "dialog", "speaker": "江砚", "text": "我跟你去。" },

// S02–S03 307病房·摆物证
{ "type": "scene", "bg": "sanatorium", "transition": "fade", "grade": "soft" },
{ "type": "char", "action": "show", "id": "luzhao", "position": "right", "pose": "cold" },
{ "type": "char", "action": "show", "id": "luzhensheng", "position": "left", "pose": "default" },
{ "type": "dialog", "speaker": "陆昭", "text": "你不该带他来。" },
{ "type": "dialog", "speaker": "你", "text": "他该在。" },
{ "type": "narration", "text": "你把东西一样一样放在床头柜上。第十八页、出勤记录、旧货市场的书、赊账本、第十四张借书卡。最后你放上那七张纸——七张写着去找江砚的纸，字迹从歪斜到工整。" },

{ "type": "char", "action": "move", "id": "luzhao", "pose": "softer" },  // pose 接线（ch11 S04）
// S04 七张纸
{ "type": "dialog", "speaker": "陆昭", "text": "他写不了字。" },
{ "type": "dialog", "speaker": "你", "text": "他写了七遍。" },

// S05 老人"我签的"
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "char", "action": "hide", "id": "jiangyan" },
{ "type": "char", "action": "hide", "id": "luzhensheng" },
{ "type": "char", "action": "hide", "id": "laochen" },
{ "type": "char", "action": "hide", "id": "zhaoyongnian" },
{ "type": "char", "action": "hide", "id": "laosun" },
{ "type": "char", "action": "hide", "id": "wujingdong" },
{ "type": "char", "action": "hide", "id": "old_postman" },
{ "type": "scene", "bg": "cg_04", "transition": "fade" },  // ★ CG 补镜（Step 6）

{ "type": "narration", "text": "床上，老人的左手在动。很轻微，像是要抬起来。陆昭扑过去握住。老人看着你，喉结滚动，用尽力气挤出三个字：我签的。" },
{ "type": "char", "action": "hide", "id": "jiangyan" },

{ "type": "scene", "bg": "sanatorium", "transition": "fade", "grade": "cold" },  // ← CG 回场
{ "type": "char", "action": "show", "id": "luzhao", "position": "right", "pose": "default" },

// S06 陆昭"发真的"·zoom
{ "type": "effect", "effect": "zoom", "duration": 1.0 },
{ "type": "dialog", "speaker": "陆昭", "text": "你要发吗？你要发，就发真的。不要写据知情人士。不要写疑似。不要给我父亲留一条退路——他不配留。也不配不留。" },

// —— ★ 终局抉择（按 00 §4 范式：publish + 嵌套 if + jump）——
// S07 ★终局抉择（发 / 不发）
{ "type": "choice", "choices": [
  { "text": "发出这篇稿子", "label": "ch11_publish" },
  { "text": "压下稿子，谁也不给", "label": "ch11_hold" }
] },
{ "type": "label", "id": "ch11_publish" },
{ "type": "set", "variable": "publish", "value": 1, "op": "=" },
{ "type": "if", "condition": "clue >= 8", "trueLabel": "to_truth", "falseLabel": "to_silence" },
{ "type": "label", "id": "ch11_hold" },
{ "type": "set", "variable": "publish", "value": 0, "op": "=" },
{ "type": "jump", "label": "to_compromise" },
// —— 跳转至各结局章节开头 label（与下方 ch12 文件起始 label 对齐）——
{ "type": "label", "id": "to_truth" },      { "type": "jump", "label": "ch12_truth" },
{ "type": "label", "id": "to_silence" },    { "type": "jump", "label": "ch12_silence" },
{ "type": "label", "id": "to_compromise" }, { "type": "jump", "label": "ch12_compromise" },

// ============ ch12-1 · 长夜有光（结局 end_truth） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_truth" },   // 全程·释然

// ★ 对齐 ch11 的 jump 目标（to_truth → ch12_truth）
{ "type": "label", "id": "ch12_truth" },

// S01 稿子发
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "稿子发了。五千字，头版转二版，标题是周聿定的：被抽走的那一页。第二天雾港炸了。第三天市局宣布重启调查。" },
// S02 市局重启·开发商被带走（分镜 bg=oldstreet_dusk；剧本化沿用 office_night，见 10_接线表 §4）
{ "type": "narration", "text": "第四年，拆迁项目停工，开发商的负责人被带走协助调查——带走他的不是那篇稿子，是那第十八页。" },

// S03 陆昭辞·包裹
{ "type": "dialog", "speaker": "旁白", "text": "陆昭没来葬礼。她给你发了一条消息，只有一句：我辞了。" },
{ "type": "narration", "text": "一个月后你收到一个包裹，没有寄件人。里面是一本旧书，扉页内侧盖着一盏灯的印章。夹在里面的借书卡上，是陈守拙的字迹。" },
{ "type": "item", "id": "old_book" },   // 复用 §6 物证作信物（同源灯塔印章旧书）
// S04 最后一页小字 → item（`final_pencil_note`，分镜 S04 类型=item）
{ "type": "item", "id": "final_pencil_note" },  // ★ 补漏 item（Step 6）
{ "type": "dialog", "speaker": "旁白", "text": "书的最后一页，有人用铅笔写了一行小字：他说书在，他这一辈子就有个数。" },

// S05 收束
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "char", "action": "hide", "id": "luzhao" },
{ "type": "char", "action": "hide", "id": "jiangyan" },
{ "type": "char", "action": "hide", "id": "luzhensheng" },
{ "type": "char", "action": "hide", "id": "laochen" },
{ "type": "char", "action": "hide", "id": "zhaoyongnian" },
{ "type": "char", "action": "hide", "id": "laosun" },
{ "type": "char", "action": "hide", "id": "wujingdong" },
{ "type": "char", "action": "hide", "id": "old_postman" },
{ "type": "scene", "bg": "cg_06", "transition": "fade" },  // ★ CG 补镜（Step 6）

{ "type": "narration", "text": "你把那本书放在工位上。灯管还是坏了一半。但你现在写的东西不一样了。" },

// —— 解锁结局 + 结束 ——
{ "type": "unlock", "ending": "end_truth" },
{ "type": "end" },

// ============ ch12-2 · 雾散之前（结局 end_compromise） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_silence" },   // 妥协/沉默共用

// ★ 对齐 ch11 的 jump 目标（to_compromise → ch12_compromise）
{ "type": "label", "id": "ch12_compromise" },

// S01 没交稿
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold" },
{ "type": "char", "action": "show", "id": "zhouyu", "position": "right", "pose": "default" },
{ "type": "dialog", "speaker": "周聿", "text": "你怕什么？" },
{ "type": "dialog", "speaker": "你", "text": "我怕我手上的东西不够。差一点。就差一点。" },
{ "type": "narration", "text": "周一评议，你转正了。是第二个名字，但李主任说今年破例两个都要。" },

// S02 失去联结
{ "type": "char", "action": "hide", "id": "zhouyu" },
{ "type": "narration", "text": "陆昭没再联系你。江砚的咖啡馆你去了两次，第三次去的时候，店门口贴着转让。" },

// S03 拆迁开工
{ "type": "scene", "bg": "cg_07", "transition": "fade" },  // ★ CG 补镜（Step 6）
{ "type": "scene", "bg": "oldstreet_dusk", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "半年后，老城区的拆迁项目开工。临江路47号被推平，地基打下去的时候挖出一箱烧焦的书，施工队当垃圾清走了。" },

// S04 抽屉里的第十八页
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold" },
{ "type": "item", "id": "report_p18" },
{ "type": "narration", "text": "那第十八页，你锁在报社的抽屉里。你偶尔会拿出来看一次。纸已经发黄，检出助燃剂四个字还是黑的。" },

// S05 收束
{ "type": "narration", "text": "你知道它在。它知道你知道。这就够了——你这样告诉自己。直到有一天你发现，你已经很久没有再拿出来过了。" },

// —— 解锁结局 + 结束 ——
{ "type": "unlock", "ending": "end_compromise" },
{ "type": "end" },

// ============ ch12-3 · 回声沉没（结局 end_silence） ============
// —— 音频设计（注释预留）——
{ "type": "bgm", "action": "play", "id": "bgm_silence" },

// ★ 对齐 ch11 的 jump 目标（to_silence → ch12_silence）
{ "type": "label", "id": "ch12_silence" },

// S01 被砍的稿子
{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "稿子你发了。周一交上去，周二见报——在一个不重要的版位，标题被改成《老城区火灾旧案再受关注 相关部门表示案情无变化》。你写的五千字被砍到八百字，检出助燃剂那一行被删了，陆振声的名字被换成了某退休警官。" },

// S02 无人问津
{ "type": "narration", "text": "没有人来问。没有重启调查。那第十八页在抽屉里多积了一层灰。转正名单出来了，没有你。李主任找你谈了一次，说得很客气：你很有热情，但热情不等于判断力，报纸也不是用来较真的。" },

// S03 继续通稿
{ "type": "narration", "text": "你继续写通稿。我区秋季绿化养护工作扎实推进之后，是冬季供暖保障工作全面启动。" },

// S04 遗忘
{ "type": "scene", "bg": "cg_08", "transition": "fade" },  // ★ CG 补镜（Step 6）
{ "type": "scene", "bg": "oldstreet_dusk", "transition": "fade", "grade": "cold" },
{ "type": "narration", "text": "第二年春天，那块地卖了。开发商在原地做了一个商业广场的入口，很宽敞，铺了大理石。没有人知道这里曾经有一万四千本书，也没有人记得你发过那篇稿子。" },

{ "type": "scene", "bg": "office_night", "transition": "fade", "grade": "cold" },  // ← CG 回场

// S05 收束
{ "type": "narration", "text": "你偶尔会想起那张烧焦的借书卡。它还在你抽屉里，和过期的采访证放在一起。" },

// —— 解锁结局 + 结束 ——
{ "type": "unlock", "ending": "end_silence" },
{ "type": "end" },

] as unknown as ScriptCommand[];
