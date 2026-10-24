/**
 * 《雪见庄·长夜》story14 故事元信息
 * 类型：写实 noir AVG · 暴雪夜雪山温泉庄院连环命案 · 推理/封闭空间
 * 结构：序章 + 第1–6章（共同线）→ 第6章末 route gate 锁定 A/B/C 三互斥路线 →
 *       第7–9章（路线特殊章）→ 第10–12章 + 尾声（收束线）
 *       NG+ 第四结局（侦探身世 secret_SELF）为收束线第12章覆盖层。
 */
import type { StoryDef } from '../../game/index';
import { manifest } from './manifest';
import { script } from './script';

const story: StoryDef = {
  id: 'xuejian-changye',
  title: '雪见庄·长夜',
  subtitle: '— 暴雪夜，一封预告死亡的信 —',
  description: '除夕雪夜，一座被风雪封死的温泉庄院，七个人，三桩旧案，与一桩二十年前的账。你是被那枚火漆印选中的侦探——来看，而不是来查。',
  titleScreen: {
    background: 'bg_gate_night',
    title: '雪见庄·长夜',
    subtitle: '— 暴雪夜，一封预告死亡的信 —',
    titleColor: '#f4f1ea',
    subtitleColor: 'rgba(210, 220, 230, 0.85)',
    titleFontSize: 0,
    showStartButton: true,
    showContinueButton: true,
    showSettingsButton: true,
    showQuitButton: true,
  },
  // —— 4 结局收集 ——
  endings: [
    {
      id: 'ending_A',
      title: '结局A · 账与刀',
      desc: '老周与沈曼：两代人的债，用一条人命平了一半，另一半压进了雪里。',
      how: '在 route_A（老周+沈曼）走完第9章清算，解锁。',
      thumbnail: '/images/bg/xuejian/cg_routeA_ledger.png',
    },
    {
      id: 'ending_B',
      title: '结局B · 替身',
      desc: '澜：她替亡夫担了二十年的罪，也替自己活成了一个不该存在的名字。',
      how: '在 route_B（澜）走完第9章体面的代价，解锁。',
      thumbnail: '/images/bg/xuejian/cg_routeB_orphan_wife.png',
    },
    {
      id: 'ending_C',
      title: '结局C · 最轻的人',
      desc: '阿福：一个连名字都没人记得的透明人，握着刀，也握着被这庄偷走的一生。',
      how: '在 route_C（阿福）走完第9章最轻的人，解锁。',
      thumbnail: '/images/bg/xuejian/cg_routeC_knife.png',
    },
    {
      id: 'ending_ngplus',
      title: '第四结局 · 长夜未尽',
      desc: '庄中无人无辜，而你终于认领了自己压了十一年的那个姓。',
      how: '集齐 secret_V / secret_OLD / secret_OUT 三枚（第四枚是你自己），第12章覆盖层触发。需 NG+ 周目。',
      thumbnail: '/images/bg/xuejian/cg_ngplus_origin.png',
    },
  ],
  // —— NG+ 多周目：携带三枚 secret flag + 结局累加；隐藏第四结局需 ≥3 周目 ——
  ngPlus: {
    carryFlags: ['secret_V', 'secret_OLD', 'secret_OUT', 'secret_SELF'],
    hiddenRoutesRequire: 3,
  },
  getManifest: () => manifest,
  getScript: () => script,
};

export default story;
