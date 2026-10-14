/**
 * AVG Engine - 核心类型定义
 */

// ========== 资源 ==========
export interface AssetManifest {
  backgrounds: Record<string, string>;       // id -> url
  sprites: Record<string, SpriteSet>;        // character -> poses
  animations: Record<string, AnimationDef>;  // id -> 动画定义
  audio: Record<string, string>;             // id -> url
  videos?: Record<string, string>;           // id -> url（视频过场，按需加载，不预载）
  items?: Record<string, ItemDef>;           // id -> 物件（证物/信件/照片等放大图）
}

/** 物件定义（弹出式放大图，无需专门背景） */
export interface ItemDef {
  src: string;          // 图片地址（建议放 public/images/items/）
  caption?: string;     // 可选标题，如「匿名信·第七封」
}

export interface SpriteSet {
  [pose: string]: string;  // pose -> url
}

/** 序列帧动画定义 */
export interface AnimationDef {
  frames: string[];      // 帧图片路径数组
  frameRate: number;     // 每秒帧数 (建议 6-12)
  loop: boolean;         // 是否循环播放
  width?: number;        // 绘制宽度（可选，默认按立绘规则缩放）
  height?: number;       // 绘制高度（可选）
}

// ========== 脚本指令 ==========
export type ScriptCommand =
  | { type: 'scene'; bg: string; transition?: TransitionType; grade?: GradeType; weather?: WeatherType }
  | { type: 'bgm'; action: 'play' | 'stop' | 'fadeout'; id?: string; duration?: number }
  | { type: 'se'; id: string }
  | { type: 'char'; action: 'show' | 'hide' | 'move'; id: string; position?: 'left' | 'center' | 'right'; pose?: string; expression?: string }
  | { type: 'dialog'; speaker: string; text: string; expression?: string }
  | { type: 'narration'; text: string }
  | { type: 'choice'; choices: ChoiceItem[] }
  | { type: 'jump'; label: string }
  | { type: 'label'; id: string }
  | { type: 'if'; condition: string; trueLabel: string; falseLabel: string }
  | { type: 'set'; variable: string; value: number | string | boolean; op?: '=' | '+=' | '-=' }
  | { type: 'wait'; duration: number }
  | { type: 'effect'; effect: EffectType; duration?: number }
  | { type: 'anim'; action: 'play' | 'stop'; id: string; target?: string; position?: 'left' | 'center' | 'right' }
  | { type: 'unlock'; ending: string }
  | { type: 'video'; id: string }            // 全屏视频过场（DOM <video> 覆盖播放）
  | { type: 'item'; id: string }            // 弹出物件放大图（证物/信件/照片，DOM 覆盖层，点击关闭）
  | { type: 'relation'; characters: RelationDef[] }  // 角色养成档案声明（init 预扫描）
  | { type: 'event'; list: EventDef[] }            // 养成事件监视表声明（init 预扫描）
  | { type: 'clue'; id: string; name: string; desc: string; icon?: string }  // 线索声明+收集（init 预扫描 def；执行时标记为已拥有）
  | { type: 'deduce'; list: DeductionDef[] }       // 推理规则声明（init 预扫描）
  | { type: 'explore'; bg: string; widthRatio?: number; hint?: string; hotspots: ExploreHotspot[] }  // 阶段3：探索模式（宽图左右平移，点击热区收集线索/弹出道具）
  | { type: 'hub'; title?: string; bg?: string; time: string[]; apPerPhase?: number; onEnd: string; nodes: HubNode[] }  // 阶段4：场景自选枢纽（地图节点 + 时间阶段 + 行动点）
  | { type: 'returnHub' }  // 阶段4：场景结束后回到枢纽（消耗已计入进入节点时）
  | { type: 'cinematic'; on: boolean }  // 阶段5：电影宽银幕开关（显示黑边 + 加强背景缓推）
  | { type: 'qte'; id: string; prompt: string; duration: number; mode: 'tap' | 'key' | 'mash'; key?: string; target?: number; successLabel: string; failLabel: string; once?: boolean }  // 阶段6·QTE 快速反应事件（可关闭）
  | { type: 'codex'; list: CodexDef[] }  // 阶段6·Codex：声明图鉴目录（init 预扫描登记 def）
  | { type: 'codexUnlock'; id: string }  // 阶段6·Codex：解锁某个图鉴条目（置 unlockedCodex）
  | { type: 'end' };

export interface ChoiceItem {
  text: string;
  label: string;
  condition?: string;  // 可选条件
}

/** 角色关系/养成档案（由 `relation` 指令声明，init 时预扫描登记） */
export interface RelationDef {
  id: string;          // 角色 id（与 sprite key 对应）
  name: string;        // 显示名
  personality?: string;// 性格描述
  likes?: string;      // 好恶·喜
  dislikes?: string;   // 好恶·恶
  affinity: string;    // 好感变量名（数值，如 aff_gucheng）
  min?: number;        // 好感刻度下限（默认 -10）
  max?: number;        // 好感刻度上限（默认 10）
}

/** 养成事件定义（由 `event` 指令声明，set 后引擎自动判定触发） */
export interface EventDef {
  id: string;          // 事件唯一 id
  when: string;        // 触发条件（复用 VariableSystem.evaluate 语法）
  jump: string;        // 命中后跳转的 label
  once?: boolean;      // 是否只触发一次（用 flag.event.<id> 守门，读档安全）
  toast?: string;      // 触发时的瞬时提示文案（可选）
}

/** 线索/证物定义（由 `clue` 指令声明并收集；init 预扫描 def，执行时标记为已拥有） */
export interface ClueDef {
  id: string;          // 线索唯一 id
  name: string;        // 显示名（如「锈蚀的钥匙」）
  desc: string;        // 描述 / 揭示的含义
  icon?: string;       // 可选缩略图地址（建议放 public/images/items/…）
}

/** 世界观图鉴条目定义（阶段6·Codex：由 `codex` 指令声明，运行时 `codexUnlock` 解锁） */
export interface CodexDef {
  id: string;          // 图鉴条目唯一 id
  category: 'character' | 'place' | 'term' | 'clue';  // 分类：角色/地点/术语/线索
  title: string;       // 显示名（如「顾承」「废旧码头」「缄默协议」）
  desc: string;        // 解锁后的百科描述
  icon?: string;       // 可选缩略图地址（建议放 public/images/items/… 或 sprite）
}

/** 推理规则定义（由 `deduce` 指令声明，init 预扫描；玩家在推理板选择线索后由引擎判定） */
export interface DeductionDef {
  id: string;          // 推理唯一 id
  name?: string;       // 可选标题（如「三者拼合」）
  requires: string[];  // 必须「已拥有且被选中」的线索 id 集合（超集亦可命中）
  sets?: { variable: string; value: number | string | boolean; op?: '=' | '+=' | '-=' }[]; // 命中后写入变量
  jump?: string;       // 命中后跳转的 label（可选，用于解锁路线/结局）
  toast?: string;      // 推理成功的瞬时提示
  once?: boolean;      // 仅触发一次（flag.deduce.<id> 守门，读档安全）
}

/** 探索模式热区（由 `explore` 指令声明；坐标均为归一化 0~1） */
export interface ExploreHotspot {
  id: string;          // 热区唯一 id（通常 = 线索 id）
  x: number;           // 中心点 x：归一化到「整张宽图宽度」（0=左缘, 1=右缘）
  y: number;           // 中心点 y：归一化到视口高度（0=顶, 1=底）
  w?: number;          // 热区宽度（归一化，默认 0.08）
  h?: number;          // 热区高度（归一化，默认 0.12）
  clue?: string;       // 命中后收集的线索 id（可选，对应 `clue` 声明）
  item?: string;       // 命中后弹出的物件 id（对应 manifest.items，可选）
  label?: string;      // 发现时的提示文字
}

/** 探索模式定义（由 `explore` 指令声明） */
export interface ExploreDef {
  bg: string;          // 宽图背景 id（对应 manifest.backgrounds，建议宽图 ≥ 视口 2 倍宽）
  widthRatio?: number; // 宽图相对视口宽的倍数（默认 2；即宽图是屏宽的 2 倍）
  hint?: string;       // 探索提示语（如「拖动浏览，点击可疑处」）
  hotspots: ExploreHotspot[];
}

/** 探索进入信息（供 UI 展示 HUD） */
export interface ExploreInfo {
  hint?: string;
  total: number;       // 热区总数
}

/** 阶段4：枢纽节点（由 `hub` 指令声明） */
export interface HubNode {
  id: string;          // 节点唯一 id
  label: string;       // 节点显示名（如「病房」「档案室」）
  bg?: string;         // 进入该节点时的背景 id（可选，用于过场提示）
  requires?: string;   // 解锁条件（复用 VariableSystem.evaluate 语法，如 `flag.x` 或 `v_done == 1`）；不满足则锁定
  locked_msg?: string; // 未解锁时提示文案
  jump: string;        // 进入该场景的 label
}

/** 阶段4：枢纽定义（由 `hub` 指令声明） */
export interface HubDef {
  title?: string;      // 枢纽标题（如「缄默回廊·第一天」）
  bg?: string;         // 枢纽背景 id（对应 manifest.backgrounds）
  time: string[];      // 时间阶段名数组（长度 = 阶段数 N）
  apPerPhase?: number; // 每阶段行动点（默认 1）
  onEnd: string;       // 时限到跳转的 label（收尾剧情）
  nodes: HubNode[];
}

/** 阶段4：枢纽进入信息（供 UI 渲染覆盖层） */
export interface HubInfo {
  title?: string;
  timePhases: string[];
  apPerPhase: number;
  nodes: HubNode[];
}

/** 结局收集条目（由故事在 StoryDef.endings 中声明） */
export interface EndingDef {
  id: string;          // 与 unlock 指令的 ending 值对应
  title: string;       // 结局标题
  desc: string;        // 结局简介
  how: string;         // 如何达成（点击卡片后详情中展示，给玩家解锁方向）
  thumbnail: string;   // 缩略图路径（通常使用该结局代表背景图，如 '/images/bg/street.png'）
}

/** 阶段4：枢纽存档状态（读档恢复用） */
export interface HubSaveState {
  def: HubDef;         // 枢纽定义（纯数据，可序列化）
  phase: number;       // 当前时间阶段索引
  apLeft: number;      // 当前阶段剩余行动点
}

export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'none' | 'iris' | 'dissolve' | 'flash';
export type EffectType = 'shake' | 'flash' | 'dim' | 'rain' | 'snow' | 'petal' | 'bokeh' | 'zoom';

/** 场景情绪调色（在场景上叠加一层淡色，营造氛围） */
export type GradeType = 'none' | 'warm' | 'cold' | 'soft' | 'dusk';

/** 环境天气粒子 */
export type WeatherType = 'none' | 'petal' | 'rain' | 'snow' | 'bokeh';

// ========== 游戏状态 ==========
export interface GameState {
  currentCommandIndex: number;
  variables: Record<string, number | string | boolean>;
  flags: Set<string>;
  backlog: BacklogEntry[];
  scene: {
    bg: string | null;
    bgAlpha: number;
    characters: Map<string, CharacterState>;
  };
}

export interface CharacterState {
  id: string;
  visible: boolean;
  position: 'left' | 'center' | 'right';
  pose: string;
  expression: string;
  alpha: number;
  targetX: number;
  currentX: number;
  // 阶段2：入场/退场动画
  entering: boolean;   // 正在播放入场（滑入+淡入）
  exiting: boolean;    // 正在播放退场（滑出+淡出），完成置 visible=false
  enterT: number;      // 入场进度 0..1（1=完全就位）
  exitT: number;       // 退场进度 0..1（1=完全离场）
  enterDir: number;    // 入场滑入方向：-1 从左, 1 从右, 0 仅淡入
}

export interface BacklogEntry {
  speaker: string;
  text: string;
}

// ========== 存档 ==========
export interface SaveData {
  id: number;
  timestamp: number;
  label: string;        // 剧情描述
  thumbnail: string;    // base64缩略图
  gameState: SerializedGameState;
}

export interface SerializedGameState {
  currentCommandIndex: number;
  /** 读档时正在播放的 BGM id（null 表示当时静默）；用于读档后恢复游戏音频 */
  bgmId: string | null;
  variables: Record<string, number | string | boolean>;
  flags: string[];
  clues: string[];     // 已收集线索 id 列表（读档恢复用）
  unlockedCodex: string[];  // 阶段6·Codex：已解锁图鉴条目 id 列表（读档恢复用）
  hub: HubSaveState | null;  // 阶段4：中枢纽状态（读档恢复用，非枢纽中则为 null）
  backlog: BacklogEntry[];
  scene: {
    bg: string | null;
    characters: Array<{
      id: string;
      visible: boolean;
      position: string;
      pose: string;
      expression: string;
      entering: boolean;
      exiting: boolean;
      enterT: number;
      exitT: number;
      enterDir: number;
    }>;
  };
}

// ========== 设置 ==========
export interface GameSettings {
  textSpeed: number;       // 1-10, 越小越快
  autoDelay: number;       // 1-10, 自动播放间隔秒数
  bgmVolume: number;       // 0-100
  seVolume: number;        // 0-100
  fontSize: 'small' | 'medium' | 'large';
  qteEnabled: boolean;     // 阶段6：QTE 快速反应事件总开关（关闭时引擎直接判定成功）
}

// ========== 首页 ==========
export interface TitleScreenConfig {
  background?: string;           // 背景图 key（对应 manifest.backgrounds）
  title: string;                 // 游戏标题
  subtitle?: string;             // 副标题
  titleColor?: string;           // 标题颜色
  subtitleColor?: string;        // 副标题颜色
  titleFontSize?: number;        // 标题字号（基于画布高度百分比）
  ambient?: 'rain' | 'none';    // 首页动效：'rain' 飘雨（默认，无开头动画时的加分项）| 'none' 静止
  showStartButton: boolean;      // 显示"开始游戏"
  showContinueButton: boolean;   // 显示"继续游戏"（有存档时）
  showSettingsButton: boolean;   // 显示"设置"
  showQuitButton: boolean;       // 显示"退出"
}

export type TitleScreenAction = 'start' | 'continue' | 'settings' | 'quit' | 'select_story';
