/**
 * 《樱色未央》story3 - 统一入口
 */
import type { StoryDef } from '../index';
import { yingseManifest } from './manifest';
import { yingseScript } from './script';
import { fillYingsePlaceholders } from './placeholder';

const story: StoryDef = {
  id: 'yingse-weiyang',
  title: '樱色未央',
  subtitle: '— 转学生与他们的春天 —',
  description: '靠海小城樱华，转学来的你，在樱花树下遇见了三个人。一段关于融入、心动与告别的故事。',
  titleScreen: {
    background: 'classroom',
    title: '樱色未央',
    subtitle: '— 转学生与他们的春天 —',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(220, 210, 240, 0.85)',
    titleFontSize: 0,
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillYingsePlaceholders(yingseManifest),
  getScript: () => yingseScript,
  // 结局收集目录（与脚本中各分支的 unlock 指令 ending 值对应）
  endings: [
    {
      id: 'lin',
      title: '恋之光 · 林晚篇',
      desc: '两根红绳并成一束，把两个人的孤单缠成了伴。她在樱华留了下来——「热闹没了家底，但还有你这个底」。',
      how: '第十章体育馆表白时选择「回应林晚」，并在后续关键抉择中始终偏向她（陪她、信她），最终在海边说出那句「当陪你怕孤单的人」。',
      thumbnail: '/images/bg/street.png',
    },
    {
      id: 'shen',
      title: '恋之光 · 沈知遥篇',
      desc: '安静的人，爱得也安静。你成了她新亮起的那盏灯塔，从此替两个人亮着。',
      how: '第十章体育馆表白时选择「回应沈知遥」，并在后续关键抉择中始终偏向她（陪她去图书馆、信她），最终在天台让她「把灯塔移到你这儿」。',
      thumbnail: '/images/bg/sea.png',
    },
    {
      id: 'zhou',
      title: '挚友',
      desc: '你没有选爱情，可一点也不空——周野就是那个人，证明你不是一座岛。一颗旧篮球，一句「怪得有伴」。',
      how: '第十章体育馆表白时选择「都不回应，珍惜和周野的友情」，走友情线，和死党把青春过成一场闹剧与真心。',
      thumbnail: '/images/bg/playground.png',
    },
    {
      id: 'regret',
      title: '遗憾',
      desc: '逃避的代价不是天塌，是每一个机会都留成「下次」，直到没有下次。但遗憾不是终点，是你下一次勇敢的起点。',
      how: '第十章体育馆表白时选择「逃避 / 沉默」，或在后续关键抉择中一次次回避——机会被留成「下次」，直到没有下次。',
      thumbnail: '/images/bg/street_dusk.png',
    },
    {
      id: 'trueend',
      title: '真·结局（TrueEnd）',
      desc: '不是占有，是都不肯放开。三张脸叠成一座春天——有些光，不是抓住才亮，是都不肯放开，它就一直亮着。',
      how: '隐藏结局：在第十章表白场景之前，让林晚与沈知遥的好感同时拉满（双线高好感），触发隐藏分支，最终三张脸叠成一座春天。',
      thumbnail: '/images/bg/park_day.png',
    },
  ],
};

export default story;
