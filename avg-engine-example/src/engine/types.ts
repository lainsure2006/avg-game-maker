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
  | { type: 'end' };

export interface ChoiceItem {
  text: string;
  label: string;
  condition?: string;  // 可选条件
}

/** 结局收集条目（由故事在 StoryDef.endings 中声明） */
export interface EndingDef {
  id: string;          // 与 unlock 指令的 ending 值对应
  title: string;       // 结局标题
  desc: string;        // 结局简介
  how: string;         // 如何达成（点击卡片后详情中展示，给玩家解锁方向）
  thumbnail: string;   // 缩略图路径（通常使用该结局代表背景图，如 '/images/bg/street.png'）
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
