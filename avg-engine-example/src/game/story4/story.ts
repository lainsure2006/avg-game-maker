/**
 * 《雾港回声》story4 —— 统一入口
 * 都市悬疑推理（人的悬疑，无超自然）。玩家代入实习记者「你」（无立绘，代入型）。
 */
import type { StoryDef } from '../index';
import { fogportManifest } from './manifest';
import { fogportScript } from './script';
import { fillFogportPlaceholders } from './placeholder';

const story: StoryDef = {
  id: 'fogport-echo',
  title: '雾港回声',
  subtitle: '— 一封信，一座城的旧账 —',
  description: '雾港，一座靠海的城市。三年前灯塔书店那场火，官方结论是老旧线路。你实习第八个月，收到第七封匿名信——「那不是意外」。',
  titleScreen: {
    background: 'office_night',
    title: '雾港回声',
    subtitle: '— 一封信，一座城的旧账 —',
    titleColor: '#e8eef5',
    subtitleColor: 'rgba(150, 175, 200, 0.85)',
    titleFontSize: 0,
    ambient: 'rain',   // 无开头动画 → 首页飘雨动效（加分项）
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillFogportPlaceholders(fogportManifest),
  getScript: () => fogportScript,
  // 结局收集目录（id 必须与脚本 unlock 指令的 ending 完全一致）
  endings: [
    {
      id: 'end_truth',
      title: '长夜有光',
      desc: '稿子发了，市局重启调查。第四年，开发商被带走——带走他的不是那篇稿子，是那第十八页。陆昭辞了，寄来一本盖着灯塔印章的旧书。',
      how: 'ch11 终局选择「发出这篇稿子」，且证据完整（clue ≥ 8，即三条支线里打过追问）。',
      thumbnail: '/images/bg/fogport/cg_06.png',
    },
    {
      id: 'end_compromise',
      title: '雾散之前',
      desc: '你压下了稿子，转正名单上有你。半年后临江路 47 号被推平，地基里挖出一箱烧焦的书，施工队当垃圾清走了。',
      how: 'ch11 终局选择「压下稿子，谁也不给」——无论证据多少。',
      thumbnail: '/images/bg/fogport/cg_07.png',
    },
    {
      id: 'end_silence',
      title: '回声沉没',
      desc: '稿子发了，被砍到八百字、换进不重要的版位。没有人来问，没有重启调查。第二年春天，那块地卖了，盖起一个商业广场的入口。',
      how: 'ch11 终局选择「发出这篇稿子」，但证据不足（clue < 8，即未打过追问）。',
      thumbnail: '/images/bg/fogport/cg_08.png',
    },
  ],
};

export default story;
