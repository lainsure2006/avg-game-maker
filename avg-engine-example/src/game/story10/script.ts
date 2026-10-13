/**
 * 阶段4「场景自选 hub」示例脚本（story10）
 *
 * 演示要点：
 *  - hub 声明：time 4 个时段 × apPerPhase 1 行动点 → 共 4 次进场机会；
 *  - 节点 archive 用 requires 锁在「先去过病房（v_ward_done == 1）」之后；
 *  - 进入节点场景消耗 1 行动点，场景末尾 returnHub 回到枢纽；行动点耗尽自动推进时间；
 *  - 全部时段结束（或主动「结束今天」）跳 onEnd 收尾；
 *  - 顺带收集 2 条线索，验证 hub 与阶段2 线索系统的联动。
 *
 * 阅读顺序：先开场旁白 → hub 声明 → 各节点场景（label 起、returnHub 止） → 收尾。
 */
import type { ScriptCommand } from '../../engine/types';

export const script: ScriptCommand[] = [
  // ===== 开场 =====
  { type: 'narration', text: '《缄默回廊》实测 · 阶段4 场景自选 hub' },
  { type: 'narration', text: '你被潮水推上这座荒岛医院。天还没黑，时间却不多——每个时段，你只能去一个地方。' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'center', pose: 'default' },
  { type: 'dialog', speaker: '顾承', text: '天黑前，把能看的地方都看一遍。但体力有限，别乱跑。' },
  { type: 'char', action: 'hide', id: 'gucheng' },

  // ===== 枢纽声明（进入 hub） =====
  {
    type: 'hub',
    title: '荒岛医院 · 第一天',
    bg: 'hub_bg',
    time: ['上午', '午后', '黄昏', '夜晚'],
    apPerPhase: 1,
    onEnd: 'day_end',
    nodes: [
      { id: 'ward', label: '病房', bg: 'ward', jump: 'sc_ward' },
      { id: 'corridor', label: '走廊', bg: 'corridor_dark', jump: 'sc_corridor' },
      { id: 'archive', label: '档案室', bg: 'archive', requires: 'v_ward_done == 1', locked_msg: '先去病房找到线索', jump: 'sc_archive' },
      { id: 'court', label: '庭院', bg: 'courtyard', jump: 'sc_court' },
    ],
  },

  // ===== 节点场景：病房（解锁档案室） =====
  { type: 'label', id: 'sc_ward' },
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'set', variable: 'v_ward_done', value: 1, op: '=' },
  { type: 'clue', id: 'c_ward', name: '病房床头卡', desc: '007 床的病人，三天前最后一次被护士登记，之后无人问津。' },
  { type: 'narration', text: '病房的床铺整齐得诡异，仿佛主人只是暂时离开。床头卡上写着编号 007。' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'center', pose: 'serious' },
  { type: 'dialog', speaker: '顾承', text: '（低声）这间房的钥匙，应该在护士台。但档案室……得先确认这里没错。' },
  { type: 'char', action: 'hide', id: 'gucheng' },
  { type: 'returnHub' },

  // ===== 节点场景：走廊 =====
  { type: 'label', id: 'sc_corridor' },
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'narration', text: '长廊的灯忽明忽暗。墙上的指示牌指向「档案室」，却被一道上锁的铁门挡住。' },
  { type: 'returnHub' },

  // ===== 节点场景：档案室（需先去病房） =====
  { type: 'label', id: 'sc_archive' },
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'clue', id: 'c_archive', name: '泛黄档案', desc: '007 床的真实姓名被涂改过，只剩一个代号：缄默。' },
  { type: 'narration', text: '档案室的门竟没锁。里面的卷宗大多被焚毁，唯有一份被刻意留下。' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'center', pose: 'default' },
  { type: 'dialog', speaker: '顾承', text: '原来你先去了病房……这份档案，本来不打算让你这么早看到。' },
  { type: 'char', action: 'hide', id: 'gucheng' },
  { type: 'returnHub' },

  // ===== 节点场景：庭院 =====
  { type: 'label', id: 'sc_court' },
  { type: 'scene', bg: 'hub_bg' },
  { type: 'narration', text: '庭院里疯长的藤蔓爬过锈蚀的长椅。海风咸涩，远处灯塔的光扫过海面。' },
  { type: 'returnHub' },

  // ===== 收尾 =====
  { type: 'label', id: 'day_end' },
  { type: 'cinematic', on: true },   // 阶段5：收尾进入电影宽银幕（上下黑边 + 加强缓推）
  { type: 'scene', bg: 'corridor_dark' },
  { type: 'narration', text: '夜色合拢。你今天踏过的每一处，都在记忆里连成一条线。' },
  { type: 'char', action: 'show', id: 'gucheng', position: 'center', pose: 'serious' },
  { type: 'dialog', speaker: '顾承', text: '明天，我们再往下挖。今晚……先活下来。' },
  { type: 'char', action: 'hide', id: 'gucheng' },
  { type: 'cinematic', on: false },  // 阶段5：退出电影宽银幕
  { type: 'end' },
];
