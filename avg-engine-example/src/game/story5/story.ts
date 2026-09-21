/**
 * 《缄默回廊》story5 —— 统一入口
 * 荒岛疗养院悬疑（人的悬疑，无超自然）。玩家代入新来的心理咨询师「你」（无立绘，代入型）。
 * 4 角色：顾承（院长）/ 苏岚（护理员）/ 言溪·言霜 / 老K。双反转 + 隐藏层 + 4 结局。
 */
import type { StoryDef } from '../index';
import { manifest } from './manifest';
import { script } from './script';
import { fillPlaceholders } from './placeholder';

const story: StoryDef = {
  id: 'jianmo',
  title: '缄默回廊',
  subtitle: '— 回廊尽头，藏着所有秘密的入口 —',
  description: '一座靠海的荒岛疗养院，一扇被铁链锁住、通往海崖的「缄默回廊」。你作为新来的心理咨询师赴任，却在档案室翻出一桩二十年前的「失踪」旧案——而这座院里每个人都守着一个秘密。',
  titleScreen: {
    background: 'pier_dusk',
    title: '缄默回廊',
    subtitle: '— 回廊尽头，藏着所有秘密的入口 —',
    titleColor: '#e8eef5',
    subtitleColor: 'rgba(150, 175, 200, 0.85)',
    titleFontSize: 0,
    ambient: 'rain',   // 荒岛海雾氛围 → 首页飘雨动效（加分项）
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  getManifest: () => fillPlaceholders(manifest),
  getScript: () => script,
  // 结局收集目录（id 必须与脚本 unlock 指令的 ending 完全一致）
  endings: [
    {
      id: 'ending_normal',
      title: '雾未散',
      desc: '案未破。你离开回廊，岛影渐小没入雾中。有些真相，这一次没能带走。',
      how: '未触发隐藏线索链（clue < 6 或未集齐信任），也未错告顾承时的兜底结局。',
      thumbnail: '/images/bg/jianmo/cg_departure.png',
    },
    {
      id: 'ending_true',
      title: '回廊听见',
      desc: '实验黑幕揭穿，言霜身份与假死曝光。缄默回廊，终于有人听见。',
      how: 'clue ≥ 6 且 苏岚信任 trust_s ≥ 2，且 未追查父母遗留（found_parent == 0）。',
      thumbnail: '/images/bg/jianmo/cg_truth_hall.png',
    },
    {
      id: 'ending_hidden',
      title: '接过那支笔',
      desc: '真结局之上——父母当年命运揭晓：他们也是被这黑幕吞没的人。你接过了他们的笔。',
      how: 'found_parent == 1 且 clue ≥ 6 且 trust_s ≥ 2（追查父母记者证 + 集齐线索 + 苏岚信任）。',
      thumbnail: '/images/bg/jianmo/cg_parents_cliff.png',
    },
    {
      id: 'ending_wrong',
      title: '错告',
      desc: '你错告了顾承。真相永埋在缄默回廊深处，再无人问。',
      how: '在 Ch9 坚持举报顾承（report_flag == 1）且 clue < 6（证据不足时误判）。',
      thumbnail: '/images/bg/jianmo/bg_corridor_dark.png',
    },
  ],
};

export default story;
