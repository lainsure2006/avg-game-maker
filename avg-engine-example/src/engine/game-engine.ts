/**
 * AVG Engine - 游戏引擎核心
 * 脚本执行、场景调度、对话/选项/分支管理
 */

import type {
  ScriptCommand,
  AssetManifest,
  CharacterState,
  BacklogEntry,
  SerializedGameState,
  GameSettings,
  ChoiceItem,
  AnimationDef,
  TitleScreenConfig,
  TitleScreenAction,
  RelationDef,
  EventDef,
  ClueDef,
  CodexDef,
  DeductionDef,
  ExploreHotspot,
  ExploreDef,
  ExploreInfo,
  HubDef,
  HubNode,
  HubInfo,
} from './types';
import { Renderer } from './renderer';
import { VariableSystem } from './variables';
import { AssetLoader } from './asset-loader';
import { AudioManager } from './audio';
import { SaveSystem } from './save-system';
import { parseScript, findLabel } from './script-parser';

// ========== 阶段2：立绘入场/退场动画参数 ==========
const ENTER_DUR = 0.42; // 入场时长（秒）
const EXIT_DUR = 0.34;  // 退场时长（秒）
const SLIDE = 0.14;     // 入场/退场滑动幅度（占画布宽比例）

/** 平滑缓动 */
function smoothstep(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/** 阶段5：入场回弹缓动（带轻微过冲，营造“弹入”手感；t=0→0, t=1→1, 中段过冲>1） */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** 入场滑入方向：左→-1，右→+1，中→0（仅淡入） */
function dirFromPos(p: string): number {
  if (p === 'left') return -1;
  if (p === 'right') return 1;
  return 0;
}

/** 由角色 id 生成稳定且分散的呼吸相位（0~2π），避免所有角色同步呼吸 */
function hashPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return (h / 1000) * Math.PI * 2;
}

export class GameEngine {
  // 子系统
  renderer: Renderer;
  variables: VariableSystem;
  assets: AssetLoader;
  audio: AudioManager | null = null;
  saves: SaveSystem;

  // 脚本
  private commands: ScriptCommand[] = [];
  private commandIndex: number = 0;
  private labels: Map<string, number> = new Map();

  // 养成系统（阶段1）：角色档案 + 事件监视表（init 时预扫描登记，读档安全）
  private relations: Map<string, RelationDef> = new Map();
  private eventList: EventDef[] = [];

  // 线索系统（阶段2）：线索 def（init 预扫描）+ 已拥有集合 + 推理规则表（init 预扫描）
  private clueDefs: Map<string, ClueDef> = new Map();
  private ownedClues: Set<string> = new Set();
  private deductionList: DeductionDef[] = [];

  // 世界观图鉴（阶段6·Codex）：条目 def（init 预扫描）+ 已解锁集合
  private codexDefs: Map<string, CodexDef> = new Map();
  private unlockedCodex: Set<string> = new Set();

  // 探索系统（阶段3）：宽图平移 + 热区点击
  private exploreDef: ExploreDef | null = null;
  private exploreBgImage: HTMLImageElement | null = null;
  private exploreOffset: number = 0;     // 当前视口左缘在宽图上的位置（单位：视口宽）
  private exploreWidthRatio: number = 2;
  private exploreFound: Set<string> = new Set();
  private cinematicOn: boolean = false;   // 阶段5：电影宽银幕开关状态
  private waitingForExplore: boolean = false;

  // 场景自选枢纽（阶段4）：时间阶段 + 行动点（日程表模型）
  private hubDef: HubDef | null = null;
  private hubBgImage: HTMLImageElement | null = null;
  private hubPhase: number = 0;          // 当前时间阶段索引 0..N-1
  private hubApLeft: number = 0;         // 当前阶段剩余行动点
  private hubEnded: boolean = false;
  private waitingForHub: boolean = false;

  // 状态
  private characters: Map<string, CharacterState> = new Map();
  private characterImages: Map<string, HTMLImageElement> = new Map();
  // 阶段6·眨眼：闭眼覆盖层缓存（key `${charId}_${pose}`，按命名约定 `<sprite>_blink.png` 加载）
  private characterBlink: Map<string, HTMLImageElement> = new Map();
  private backlog: BacklogEntry[] = [];
  private running: boolean = false;
  private waitingForClick: boolean = false;
  private waitingForChoice: boolean = false;
  private waitingForVideo: boolean = false;
  private waitingForItem: boolean = false;
  // 阶段6：QTE 快速反应事件（限时输入；暂停对话推进直到成功/超时）
  private waitingForQte: boolean = false;
  private qteId: string = '';
  private qteMode: 'tap' | 'key' | 'mash' = 'tap';
  private qteKey: string = 'Space';
  private qteTarget: number = 0;
  private qteCount: number = 0;
  private qteDuration: number = 0;
  private qteTimeLeft: number = 0;
  private qteSuccessLabel: string = '';
  private qteFailLabel: string = '';
  private qteOnce: boolean = false;
  private autoMode: boolean = false;
  private skipMode: boolean = false;
  private autoTimer: number = 0;
  private textFinished: boolean = false;
  private waitTimer: number = 0;
  private lastTime: number = 0;
  private rafId: number = 0;

  // 设置
  settings: GameSettings = {
    textSpeed: 5,
    autoDelay: 5,
    bgmVolume: 70,
    seVolume: 80,
    fontSize: 'medium',
    qteEnabled: true,
    blinkEnabled: false, // 阶段6·眨眼：默认挂起。真实系小眼几乎不可见；代码与 9 张覆盖层保留，待二次元大眼项目启用。
  };

  // 资源清单
  private manifest: AssetManifest | null = null;

  // 首页
  private titleScreen: TitleScreenConfig | null = null;
  private onTitleScreen: boolean = false;
  /** 当前"应当在播放"的 BGM id（标题屏/读档设置），用于首次用户手势解锁音频后补播 */
  private desiredBgmId: string | null = null;
  private titleBgImage: HTMLImageElement | null = null;
  private titleMenuIndex: number = 0;
  /** 首页动效：'rain' 飘雨 | 'none' 静止（无开头动画时默认飘雨，加分项） */
  private titleAmbient: 'rain' | 'none' = 'none';
  private titleParticles: { x: number; y: number; speed: number; len: number; alpha: number }[] = [];
  private titleLastTs: number = 0;

  // 当前背景 ID（用于存档/读档恢复）
  private currentBgId: string | null = null;

  // 当前故事 ID（用于结局收集命名空间）
  private storyId: string = '';
  /** 最近一次 unlock 的结局 id（end 指令触发结局提示时用） */
  private pendingEndingId: string | null = null;

  // 回调
  onDialogUpdate: ((speaker: string, text: string, isNarration: boolean) => void) | null = null;
  onDialogComplete: (() => void) | null = null;
  onChoicesShow: ((choices: ChoiceItem[]) => void) | null = null;
  onChoicesHide: (() => void) | null = null;
  onCommandChange: ((index: number, total: number) => void) | null = null;
  onTitleAction: ((action: TitleScreenAction) => void) | null = null;
  onTitleScreenChange: ((visible: boolean) => void) | null = null;
  /** UI 请求“推进/翻页”：自动播放模式下的前进统一走此回调，使长文本分页也能逐页展示 */
  onAdvanceRequest: (() => void) | null = null;
  /** 打开结局收集相册面板（由 UI 实现） */
  onGalleryOpen: (() => void) | null = null;
  /** 游戏抵达结局（unlock 后由 end 指令触发）；endingId 为 null 表示未配置 unlock 的纯“剧终” */
  onEndingReached: ((endingId: string | null) => void) | null = null;
  /** 养成事件触发（由「set 后自动判定」触发）；UI 据此弹瞬时提示 */
  onEventFired: ((id: string, toast?: string) => void) | null = null;
  /** 收集到新线索（clue 指令执行时）；UI 据此刷新「线索」按钮角标 */
  onClueAdded: ((clue: ClueDef) => void) | null = null;
  /** 推理成功（tryDeduce 命中）；UI 据此弹瞬时提示 */
  onDeductionFired: ((id: string, toast?: string) => void) | null = null;
  /** 阶段6·Codex：解锁图鉴条目（codexUnlock 执行时）；UI 据此刷新角标/弹提示 */
  onCodexUnlocked: ((def: CodexDef) => void) | null = null;
  /** 进入探索模式（UI 据此显示 HUD） */
  onExploreEnter: ((info: ExploreInfo) => void) | null = null;
  /** 探索中命中热区（UI 刷新计数/提示） */
  onExploreFound: ((found: number, total: number, label?: string) => void) | null = null;
  /** 退出探索模式（UI 据此隐藏 HUD） */
  onExploreExit: (() => void) | null = null;
  /** 进入枢纽（UI 据此显示覆盖层） */
  onHubEnter: ((info: HubInfo) => void) | null = null;
  /** 枢纽时间/行动点更新（UI 据此刷新顶栏状态条） */
  onHubUpdate: ((phase: number, apLeft: number, totalPhases: number) => void) | null = null;
  /** 节点未解锁（UI 据此弹提示） */
  onHubLocked: ((msg: string) => void) | null = null;
  /** 退出枢纽（UI 据此隐藏覆盖层） */
  onHubExit: (() => void) | null = null;
  /** 阶段5：电影宽银幕开关（UI 据此显示/隐藏上下黑边） */
  onCinematic: ((on: boolean) => void) | null = null;
  /** 阶段5：探索拾取线索时的闪光回调（UI 据此播放金色光环） */
  onPickupFlash: (() => void) | null = null;
  /** 阶段6·QTE：进入（UI 显示覆盖层 + 倒计时环）。key 为要提示的按键名（如 'SPACE'），tap 模式为 undefined */
  onQteEnter: ((info: { prompt: string; duration: number; mode: 'tap' | 'key' | 'mash'; target?: number; key?: string }) => void) | null = null;
  /** 阶段6·QTE：倒计时环进度（ratio 1→0 实时刷新） */
  onQteTick: ((ratio: number) => void) | null = null;
  /** 阶段6·QTE：连点进度（ratio 0→1，mash 模式） */
  onQteProgress: ((ratio: number) => void) | null = null;
  /** 阶段6·QTE：退出（UI 隐藏覆盖层） */
  onQteExit: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.variables = new VariableSystem();
    this.assets = new AssetLoader();
    this.saves = new SaveSystem();
  }

  /** 初始化：加载资源清单和脚本 */
  async init(manifest: AssetManifest, script: Record<string, unknown>[]): Promise<void> {
    this.manifest = manifest;
    this.commands = parseScript(script);

    // 建立标签索引
    this.commands.forEach((cmd, i) => {
      if (cmd.type === 'label' && 'id' in cmd) {
        this.labels.set(cmd.id, i);
      }
    });

    // 预扫描 relation/event/clue/deduce 声明（读档安全：不依赖执行顺序，
    // 即使从存档恢复跳过了脚本前段的声明指令，档案/事件/线索/推理表也已就位）。
    this.relations.clear();
    this.eventList = [];
    this.clueDefs.clear();
    this.ownedClues.clear();
    this.deductionList = [];
    this.codexDefs.clear();
    this.unlockedCodex.clear();
    for (const cmd of this.commands) {
      if (cmd.type === 'relation' && 'characters' in cmd) {
        for (const c of cmd.characters) this.relations.set(c.id, c);
      } else if (cmd.type === 'event' && 'list' in cmd) {
        for (const e of cmd.list) this.eventList.push(e);
      } else if (cmd.type === 'clue' && 'id' in cmd && cmd.name) {
        // 仅当带 name（声明条）才登记/更新 def；收集条（仅 id、无 name）不覆盖已有定义，
        // 避免「仅 id 收集」写法把已登记的名称/描述清空，导致渲染层拿到的 name 为 undefined 而崩溃。
        this.clueDefs.set(cmd.id, { id: cmd.id, name: cmd.name, desc: cmd.desc, icon: cmd.icon });
      } else if (cmd.type === 'deduce' && 'list' in cmd) {
        for (const d of cmd.list) this.deductionList.push(d);
      } else if (cmd.type === 'codex' && 'list' in cmd) {
        // 阶段6·Codex：预扫描登记图鉴 def（读档安全：不依赖执行顺序）
        for (const c of cmd.list) this.codexDefs.set(c.id, c);
      }
    }

    // 加载资源
    await this.assets.loadManifest(manifest, (pct) => {
      console.log(`加载中... ${Math.round(pct * 100)}%`);
    });

    // 注册角色图片
    for (const [charId, spriteSet] of Object.entries(manifest.sprites)) {
      for (const [pose, url] of Object.entries(spriteSet)) {
        const img = this.assets.getImage(url);
        if (img) {
          this.characterImages.set(`${charId}_${pose}`, img);
        }
      }
    }

    // 阶段6·眨眼：按命名约定 `<sprite>_blink.png` 预加载「闭眼覆盖层」。
    // 存在则缓存（key 与立绘一致）；缺失静默跳过（该角色/姿态不眨眼），不影响流程。
    if (this.settings.blinkEnabled !== false) {
      const tasks: Promise<void>[] = [];
      for (const [charId, spriteSet] of Object.entries(manifest.sprites)) {
        for (const [pose, url] of Object.entries(spriteSet)) {
          const blinkUrl = url.replace(/\.png(\?.*)?$/i, '_blink.png$1');
          if (blinkUrl === url) continue;
          tasks.push(
            this.assets.ensureImage(blinkUrl).then(img => {
              if (img && img.width > 0) this.characterBlink.set(`${charId}_${pose}`, img);
            })
          );
        }
      }
      await Promise.all(tasks);
    }

    // 注册序列帧动画
    for (const [animId, animDef] of Object.entries(manifest.animations)) {
      const frames: HTMLImageElement[] = [];
      for (const frameUrl of animDef.frames) {
        const img = this.assets.getImage(frameUrl);
        if (img) frames.push(img);
      }
      if (frames.length > 0) {
        this.renderer.animPlayer.register(animId, animDef, frames);
      }
    }

    // 初始化音频
    const audioCtx = this.assets.getAudioContext();
    this.audio = new AudioManager(audioCtx);

    for (const [id, url] of Object.entries(manifest.audio)) {
      const buf = this.assets.getAudioBuffer(url);
      if (buf) {
        await this.audio.register(id, buf);
      }
    }
  }

  /** 开始游戏 */
  start(): void {
    // 如果有首页配置，先显示首页
    if (this.titleScreen) {
      this.showTitleScreen();
    } else {
      this.startGameLoop();
    }
  }

  /** 显示首页 */
  showTitleScreen(): void {
    if (!this.titleScreen) return;
    this.onTitleScreen = true;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    // 首页/选故事页 BGM：约定"首页无特殊说明即标配 BGM"。
    // 优先 bgm_title；缺省时自动回退到 bgm_main；再缺省用首个 bgm 类音频；都为空则安全无操作。
    if (this.audio && this.manifest) {
      const a = this.manifest.audio;
      let id: string | null = a['bgm_title'] ? 'bgm_title' : null;
      if (!id && a['bgm_main']) id = 'bgm_main';
      if (!id) id = Object.keys(a).find(k => k.startsWith('bgm')) ?? null;
      if (id) {
        this.desiredBgmId = id; // 记下标题屏本应在播的 BGM，供首次手势解锁后补播
        this.audio.playBgm(id);
      }
    }
    this.onTitleScreenChange?.(true);
  }

  /** 开始游戏主循环（首页后调用） */
  private startGameLoop(): void {
    this.running = true;
    this.commandIndex = 0;
    // 阶段5：开局复位电影宽银幕（避免上一局残留黑边）
    this.cinematicOn = false;
    this.renderer.setCinematic(false);
    this.onCinematic?.(false);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    // 立即执行第一条指令（否则游戏画面不会初始化）
    this.executeNext();
  }

  /** 从存档恢复 */
  restoreFromSave(state: SerializedGameState): void {
    this.commandIndex = state.currentCommandIndex;
    this.variables.import(state.variables, state.flags);
    this.backlog = state.backlog;

    // 恢复已收集线索（def 已在 init 预扫描登记，此处仅重建「已拥有」集合）
    this.ownedClues = new Set(state.clues ?? []);

    // 阶段6·Codex：恢复已解锁图鉴条目
    this.unlockedCodex = new Set(state.unlockedCodex ?? []);

    // 关键修复：退出标题屏，否则主循环会一直渲染标题页，读档无效
    this.onTitleScreen = false;
    this.onTitleScreenChange?.(false);

    // 停掉首页 BGM（读档必然离开标题屏）；随后按存档时正在播放的 BGM 恢复游戏音频，
    // 避免"读档后 title 主题曲残留 / 游戏 BGM 静默"——存档已记录当时 BGM id。
    this.audio?.stopBgm();
    if (state.bgmId) {
      this.desiredBgmId = state.bgmId; // 记下读档时正在播放的 BGM，供首次手势解锁后补播
      this.audio?.playBgm(state.bgmId); // 未注册的 id 安全 no-op（如待补的 night/tension/tender）
    }

    // 恢复场景
    if (state.scene.bg && this.manifest) {
      const bgUrl = this.manifest.backgrounds[state.scene.bg];
      const px = this.manifest.parallax?.[state.scene.bg];
      if (px) {
        const stack = this.buildParallaxStack(px);
        if (stack) {
          this.renderer.setParallaxStack(stack, 'none');
          this.currentBgId = state.scene.bg;
        } else if (bgUrl) {
          this.renderer.setBackground(this.assets.getImage(bgUrl) || null, 'none');
          this.currentBgId = state.scene.bg;
        }
      } else if (bgUrl) {
        this.renderer.setBackground(this.assets.getImage(bgUrl) || null, 'none');
        this.currentBgId = state.scene.bg;
      }
    }

    // 恢复角色
    this.characters.clear();
    for (const char of state.scene.characters) {
      this.characters.set(char.id, {
        id: char.id,
        visible: char.visible,
        position: char.position as 'left' | 'center' | 'right',
        pose: char.pose,
        expression: char.expression,
        alpha: char.visible ? 1 : 0,
        targetX: 0,
        currentX: 0,
        entering: false,
        exiting: false,
        enterT: 1,
        exitT: 0,
        enterDir: 0,
        blink: false,
        blinkNext: 1.2 + Math.random() * 3.5,
        blinkT: 0,
        blinkDur: 0.16,
      });
    }

    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);

    // 读档时正处于枢纽（暂停态）：恢复枢纽定义/时间/行动点并重新进入覆盖层，
    // 不执行 commandIndex 处指令（枢纽靠节点跳转/收尾按 label 路由）。
    if (state.hub) {
      this.hubDef = state.hub.def;
      this.hubPhase = state.hub.phase;
      this.hubApLeft = state.hub.apLeft;
      this.hubEnded = false;
      this.reenterHub();
      return;
    }

    // 关键修复：执行当前指令，渲染存档处的对话/画面
    this.executeNext();
  }

  /** 主循环 */
  private loop = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // 防止大帧跳跃
    this.lastTime = time;

    if (this.onTitleScreen) {
      // 首页渲染
      this.renderTitleScreen();
    } else {
      if (this.waitingForExplore && this.exploreBgImage) {
        this.renderer.renderExplore(
          this.exploreBgImage, this.exploreOffset, this.exploreWidthRatio,
          this.exploreDef!.hotspots, this.exploreFound,
        );
      } else if (this.waitingForHub) {
        // 阶段4：枢纽激活时，画布渲染枢纽背景（节点由 DOM 覆盖层绘制）
        if (this.hubBgImage) {
          this.renderer.renderHubBg(this.hubBgImage);
        } else {
          this.renderer.clearToColor('#0b0e14');
        }
      } else {
        this.renderer.update(dt);
        this.update(dt);
        this.renderer.render(this.characters, this.settings.fontSize);
        this.drawAllCharacters();
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  /** 游戏逻辑更新 */
  private update(dt: number): void {
    // 阶段2：角色入场/退场动画推进（独立于等待计时，即使等待中也持续播放）
    this.advanceCharacterAnims(dt);

    // 阶段6·眨眼：推进每个可见角色的眨眼计时（独立于等待计时）
    this.advanceBlinks(dt);

    // 阶段6·QTE：限时计时与超时判定（独立于对话等待；QTE 期间角色动画仍继续播放）
    if (this.waitingForQte) {
      this.qteTimeLeft -= dt;
      this.onQteTick?.(Math.max(0, this.qteTimeLeft / this.qteDuration));
      if (this.qteTimeLeft <= 0) {
        this.resolveQte(false);
      }
      return;
    }

    // 等待计时器
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.waitTimer = 0;
        this.executeNext();
      }
      return;
    }

    // 自动模式：必须等当前句文字播放完毕（textFinished）才计时前进，
    // 否则长文本在打字途中就被 autoDelay 到点强跳，造成"字多快闪/被吞"。
    if (this.autoMode && this.waitingForClick && this.textFinished) {
      this.autoTimer += dt;
      const autoDelay = (11 - this.settings.autoDelay) * 0.5 + 1;
      if (this.autoTimer >= autoDelay) {
        this.autoTimer = 0;
        if (this.onAdvanceRequest) {
          this.onAdvanceRequest();
        } else {
          this.advance();
        }
      }
    } else if (this.autoMode) {
      // 翻页后文字未播完，重置自动计时，避免下一页被瞬间跳过
      this.autoTimer = 0;
    }
  }

  /**
   * 绘制所有角色立绘（方案 B：自适应布局，支持任意人数同屏不重叠）。
   * - 同屏 ≤3 人：沿用 left/center/right 三档语义位置（0.2 / 0.5 / 0.8）+ 固定宽度 0.28，
   *   与原本调好的左右布局完全一致，向后兼容。
   * - 同屏 >3 人：按位置优先级排序后均匀分布在画布上，立绘宽度随人数自动收缩，
   *   保证任意人数（4 人、5 人……）相邻立绘都不重叠。
   */
  private drawAllCharacters(): void {
    const visible = Array.from(this.characters.values()).filter(c => c.visible);
    const N = visible.length;
    if (N === 0) return;

    // 按 position 语义排序（left < center < right），保持剧本指定的左右关系；
    // 非法/缺省 position 视为居中（优先级 1）。
    const order: Record<string, number> = { left: 0, center: 1, right: 2 };
    visible.sort((a, b) => (order[a.position] ?? 1) - (order[b.position] ?? 1));

    // 判定“无冲突”：可见角色占用的档位互不重复（且无 >3 人）。
    // 无冲突 → 沿用原三档语义位置（0.2/0.5/0.8）+ 固定宽 0.28，保持原布局；
    // 有冲突（同档位重叠风险）或人数 >3 → 按人数均匀分、宽度自适应收缩，永不重叠。
    const uniquePositions = new Set(visible.map(c => c.position));
    const legacy = N <= 3 && uniquePositions.size === N;
    const legacyX: Record<string, number> = { left: 0.2, center: 0.5, right: 0.8 };

    for (let i = 0; i < N; i++) {
      const char = visible[i];
      const imgKey = `${char.id}_${char.pose}`;
      const img = this.characterImages.get(imgKey);
      if (!img) continue;

      let baseX: number, maxWRatio: number;
      if (legacy) {
        baseX = legacyX[char.position] ?? 0.5;
        maxWRatio = 0.28;
      } else {
        // 均匀分：第 i 人（0-based）位于 (i+1)/(N+1)；
        // 最大宽度 = 0.9/(N+1) 画布宽，相邻间距 1/(N+1)，两半宽之和 0.9/(N+1) < 间距，
        // 预留 10% 间隙，永不重叠（含两人同档位、4 人及以上等所有情况）。
        baseX = (i + 1) / (N + 1);
        maxWRatio = 0.9 / (N + 1);
      }

      // 阶段2：入场/退场动画（滑入 + 淡入 / 滑出 + 淡出）
      // 阶段5：入场缓动改用 easeOutBack（带轻微过冲），并叠加缩放弹入（popScale 0.92→1.05→1.0）
      const easeIn = easeOutBack(char.enterT ?? 1);
      const easeOut = smoothstep(char.exitT ?? 0);
      const dir = char.enterDir ?? 0;
      const enterOffset = dir * (1 - easeIn) * SLIDE; // 入场：从侧边滑入（过冲带回弹）
      const exitOffset = dir * easeOut * SLIDE;        // 退场：向侧边滑出（平滑，不回弹）
      const xRatio = baseX + enterOffset + exitOffset;
      const alpha = (char.alpha ?? 1) * Math.min(1, easeIn) * (1 - easeOut);
      const popScale = 0.92 + 0.08 * easeIn;           // 入场缩放弹入（最终归 1.0）

      const breathPhase = hashPhase(char.id);
      // 阶段6·眨眼：闭眼覆盖层（若存在且处于眨眼帧）与原立绘在同尺寸/同变换下叠加
      const blinkImg = char.blink ? (this.characterBlink.get(imgKey) ?? null) : null;
      const blinkAlpha = blinkImg ? this.blinkOverlayAlpha(char) : 1;
      this.renderer.drawCharacterAuto(img, xRatio, maxWRatio, alpha, breathPhase, popScale, blinkImg, blinkAlpha);
    }
  }

  /**
   * 阶段6·眨眼：推进每个可见角色的眨眼计时。
   * 每帧调用（独立于等待/自动/跳过状态），使角色在待机与对话中都随机眨眼。
   * 节奏：随机间隔 1.8~6.0s 眨一次，单次闭合约 0.16s。
   */
  private advanceBlinks(dt: number): void {
    if (this.settings.blinkEnabled === false) {
      // 关闭眨眼：复位任何停在闭眼帧的角色，避免永久闭眼
      for (const c of this.characters.values()) {
        if (c.blink) { c.blink = false; c.blinkT = 0; }
      }
      return;
    }
    for (const c of this.characters.values()) {
      if (!c.visible) continue;
      if (!c.blink) {
        c.blinkNext = (c.blinkNext ?? 2.0) - dt;
        if (c.blinkNext <= 0) {
          c.blink = true;
          c.blinkT = 0;
          c.blinkDur = 0.16;
        }
      } else {
        c.blinkT = (c.blinkT ?? 0) + dt;
        if (c.blinkT >= (c.blinkDur ?? 0.16)) {
          c.blink = false;
          c.blinkT = 0;
          c.blinkNext = 1.8 + Math.random() * 4.2; // 下次眨眼间隔
        }
      }
    }
  }

  /** 阶段6·眨眼：本次眨眼覆盖层的透明度（快速闭合/张开，避免生硬弹跳） */
  private blinkOverlayAlpha(c: CharacterState): number {
    const dur = c.blinkDur ?? 0.16;
    const t = c.blinkT ?? 0;
    const ramp = 0.035;
    if (t < ramp) return t / ramp;                 // 闭眼过渡
    if (t > dur - ramp) return Math.max(0, (dur - t) / ramp); // 睁眼过渡
    return 1;
  }

  /**
   * 阶段2：推进角色入场/退场动画进度。
   * 与 drawAllCharacters 协同：drawAllCharacters 用 enterT/exitT 的 smoothstep
   * 计算最终位移与透明度；本方法只负责把进度从 0 推向 1，
   * 并在退场完成时置 visible=false。即使处于等待点击/自动播放，
   * update() 也会在每帧调用它，使动画独立于对话推进持续播放。
   */
  private advanceCharacterAnims(dt: number): void {
    const SPEED = 2.4; // 进度速度，约 0.42s 完成一段入场/退场
    for (const c of this.characters.values()) {
      if (c.entering) {
        c.enterT = Math.min(1, (c.enterT ?? 0) + dt * SPEED);
        if (c.enterT >= 1) {
          c.entering = false;
          c.enterT = 1;
        }
      } else if (c.exiting) {
        c.exitT = Math.min(1, (c.exitT ?? 0) + dt * SPEED);
        if (c.exitT >= 1) {
          c.exiting = false;
          c.exitT = 1;
          c.visible = false;
          c.alpha = 1; // 复位，避免影响下次 show 的淡入
        }
      }
    }
  }

  /** 执行下一条指令 */
  private executeNext(): void {
    if (this.commandIndex >= this.commands.length) {
      this.running = false;
      // 兜底：脚本自然走完（无显式 end 指令）且此前解锁过结局 → 仍弹出结局提示
      if (this.pendingEndingId) this.onEndingReached?.(this.pendingEndingId);
      return;
    }

    const cmd = this.commands[this.commandIndex];
    this.onCommandChange?.(this.commandIndex, this.commands.length);

    // 快进模式：跳过对话 / 视频过场
    if (this.skipMode && (cmd.type === 'dialog' || cmd.type === 'narration' || cmd.type === 'video')) {
      this.commandIndex++;
      this.executeNext();
      return;
    }

    this.executeCommand(cmd);
  }

  /** 阶段6·视差：由 manifest.parallax 定义构建多层背景栈（层未就绪返回 null 降级单图层） */
  private buildParallaxStack(px: { layers: string[]; factors: number[] }): { img: HTMLImageElement; factor: number }[] | null {
    if (!this.assets) return null;
    const imgs = px.layers.map(u => this.assets!.getImage(u));
    if (imgs.some(i => !i)) return null;
    return px.layers.map((u, i) => ({
      img: this.assets!.getImage(u)!,
      factor: px.factors[i] ?? (i / Math.max(1, px.layers.length - 1)),
    }));
  }

  /** 执行单条指令 */
  private async executeCommand(cmd: ScriptCommand): Promise<void> {
    switch (cmd.type) {
      case 'scene': {
        if (!this.manifest) break;
        this.renderer.setParallaxEnabled(this.settings.parallaxEnabled ?? true);
        const bgUrl = this.manifest.backgrounds[cmd.bg];
        const px = this.manifest.parallax?.[cmd.bg];
        const stack = px ? this.buildParallaxStack(px) : null;
        if (stack) {
          await this.renderer.setParallaxStack(stack, cmd.transition);
          this.currentBgId = cmd.bg;
        } else if (bgUrl) {
          const img = this.assets.getImage(bgUrl);
          await this.renderer.setBackground(img || null, cmd.transition);
          this.currentBgId = cmd.bg;
        }
        // 场景情绪调色 + 环境天气：每个 scene 显式声明自己的氛围，
        // 未填写则恢复默认（清除上一场景残留的调色/天气）。
        this.renderer.setGrade(cmd.grade ?? 'none');
        this.renderer.setWeather(cmd.weather ?? 'none');
        // 换景即清台：切换背景时清空舞台上所有立绘（标准 AVG 习惯）。
        // 剧本若需在换景后保留某角色，必须在其后显式 show，不可依赖残留。
        for (const c of this.characters.values()) c.visible = false;
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'bgm': {
        if (this.audio) {
          switch (cmd.action) {
            case 'play':
              if (cmd.id) this.audio.playBgm(cmd.id);
              break;
            case 'stop':
              this.audio.stopBgm();
              break;
            case 'fadeout':
              this.audio.fadeOutBgm(cmd.duration || 1);
              break;
          }
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'se': {
        if (this.audio && cmd.id) {
          this.audio.playSe(cmd.id);
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'char': {
        switch (cmd.action) {
          case 'show': {
            const enterDir = cmd.position === 'left' ? -1 : cmd.position === 'right' ? 1 : 0;
            this.characters.set(cmd.id, {
              id: cmd.id,
              visible: true,
              position: cmd.position || 'center',
              pose: cmd.pose || 'default',
              expression: cmd.expression || 'neutral',
              alpha: 1,
              targetX: 0,
              currentX: 0,
              entering: true,
              exiting: false,
              enterT: 0,
              exitT: 0,
              enterDir,
              blink: false,
              blinkNext: 1.2 + Math.random() * 3.5,
              blinkT: 0,
              blinkDur: 0.16,
            });
            break;
          }
          case 'hide': {
            const c = this.characters.get(cmd.id);
            if (c) {
              // 触发退场动画（滑出+淡出），由 advanceCharacterAnims 推进并在完成时置 visible=false
              c.entering = false;
              c.exiting = true;
              c.exitT = 0;
            }
            break;
          }
          case 'move': {
            const c = this.characters.get(cmd.id);
            if (c) {
              // 位置变更（原有行为）
              if (cmd.position) c.position = cmd.position;
              // 原地换 pose（表情 / 姿态差分）：不动 position 就不触发入场动画，
              // 因此不会闪烁 —— 这是「换表情」的正确写法。
              // 2026-09-16 修：此前本分支只处理 position，cmd.pose 被静默丢弃，
              // 导致剧本按文档写 { action:'move', id, pose:'cold' } 完全不生效
              // （story3 的 12 条 happy/sad/surprised 换表情同样从未真正生效过）。
              if (cmd.pose) c.pose = cmd.pose;
            }
            break;
          }
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'dialog':
      case 'narration': {
        const speaker = cmd.type === 'narration' ? '' : cmd.speaker;
        const isNarration = cmd.type === 'narration';
        this.backlog.push({ speaker, text: cmd.text });
        this.onDialogUpdate?.(speaker, cmd.text, isNarration);
        this.waitingForClick = true;
        this.autoTimer = 0;
        this.textFinished = false;
        break;
      }

      case 'choice': {
        this.waitingForChoice = true;
        this.onChoicesShow?.(cmd.choices);
        break;
      }

      case 'jump': {
        const targetIdx = this.labels.get(cmd.label);
        if (targetIdx !== undefined) {
          this.commandIndex = targetIdx;
          this.executeNext();
        } else {
          console.warn(`标签未找到: ${cmd.label}`);
          this.commandIndex++;
          this.executeNext();
        }
        break;
      }

      case 'label':
        // 标签不执行任何操作，直接跳过
        this.commandIndex++;
        this.executeNext();
        break;

      case 'if': {
        const result = this.variables.evaluate(cmd.condition);
        const targetLabel = result ? cmd.trueLabel : cmd.falseLabel;
        const targetIdx = this.labels.get(targetLabel);
        if (targetIdx !== undefined) {
          this.commandIndex = targetIdx;
        } else {
          console.warn(`条件跳转标签未找到: ${targetLabel}`);
          this.commandIndex++;
        }
        this.executeNext();
        break;
      }

      case 'set': {
        this.variables.set(cmd.variable, cmd.value, cmd.op);
        this.commandIndex++;
        // 养成事件监视：set 后自动判定，命中则跳转（checkEvents 内部已 executeNext）。
        // 声明为 relation/event 的指令本身在 init 时已预扫描，这里作为 no-op 直接跳过。
        if (this.checkEvents()) return;
        this.executeNext();
        break;
      }

      case 'relation':
      case 'event':
        // 声明类指令：init 时已预扫描登记，运行时不再执行任何操作，仅推进指针。
        this.commandIndex++;
        this.executeNext();
        break;

      case 'clue': {
        // 线索收集：标记为已拥有（def 已在 init 预扫描登记）；通知 UI 刷新角标。
        if (!this.ownedClues.has(cmd.id)) {
          this.ownedClues.add(cmd.id);
          const def = this.clueDefs.get(cmd.id);
          if (def) this.onClueAdded?.(def);
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'deduce':
        // 推理规则声明：init 时已预扫描登记，运行时不再执行任何操作，仅推进指针。
        this.commandIndex++;
        this.executeNext();
        break;

      case 'codex': {
        // 阶段6·Codex：图鉴目录声明。def 已在 init 预扫描登记；运行时兜底再登记一次
        // （确保即便绕过预扫描也能登记），随后推进指针，不暂停、不弹窗。
        for (const c of cmd.list) this.codexDefs.set(c.id, c);
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'codexUnlock': {
        // 阶段6·Codex：解锁条目。置 unlockedCodex 集合（读档恢复），并回调 UI 刷新角标/提示。
        if (!this.unlockedCodex.has(cmd.id)) {
          this.unlockedCodex.add(cmd.id);
          const def = this.codexDefs.get(cmd.id);
          if (def) this.onCodexUnlocked?.(def);
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'explore': {
        // 探索模式：先跳过本指令（避免 exit 后再次进入），再进入探索并暂停主脚本推进，
        // 直到 UI「结束探索」调用 exitExplore → executeNext 才从后续指令继续。
        this.commandIndex++;
        this.enterExplore(cmd);
        break;
      }

      case 'cinematic': {
        // 阶段5：电影宽银幕开关（显示黑边 + 加强背景缓推）
        this.cinematicOn = cmd.on;
        this.renderer.setCinematic(cmd.on);
        this.onCinematic?.(cmd.on);
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'qte': {
        // 阶段6·QTE：可关闭的限时反应事件。
        // once 守门（flag.qte.<id>，读档安全）；设置关闭时直接成功；否则进入 QTE 状态暂停推进。
        if (cmd.once && this.variables.hasFlag('qte.' + cmd.id)) {
          this.commandIndex++;
          const skip = this.labels.get(cmd.successLabel);
          if (skip !== undefined) this.commandIndex = skip;
          this.executeNext();
          break;
        }
        if (!this.settings.qteEnabled) {
          // 设置关闭 QTE：直接判定成功（照顾休闲玩家），不弹出覆盖层
          this.commandIndex++;
          const ok = this.labels.get(cmd.successLabel);
          if (ok !== undefined) this.commandIndex = ok;
          this.executeNext();
          break;
        }
        this.commandIndex++;
        this.enterQte(cmd);
        break;
      }

      case 'hub': {
        // 阶段4：场景自选枢纽。先跳过本指令（避免 returnHub 后再次进入），
        // 再进入枢纽并暂停主脚本推进，直到节点跳转 / onEnd 收尾。
        this.commandIndex++;
        this.enterHub(cmd);
        break;
      }

      case 'returnHub': {
        // 阶段4：场景结束回到枢纽（行动点已在进入节点时扣除）；
        // 若当前阶段行动点耗尽则推进时间，全时段结束则跳 onEnd 收尾。
        this.exitHubReturn();
        break;
      }

      case 'wait': {
        this.waitTimer = cmd.duration;
        this.commandIndex++;
        break;
      }

      case 'effect': {
        // 阶段1 特效：樱花/雨/雪/散景(天气) 与 flash/dim/shake(屏幕特效)
        this.renderer.startEffect(cmd.effect, cmd.duration);
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'anim': {
        switch (cmd.action) {
          case 'play':
            this.renderer.animPlayer.play(cmd.id, cmd.position || 'center');
            break;
          case 'stop':
            this.renderer.animPlayer.stop(cmd.id);
            break;
        }
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'end': {
        this.running = false;
        // 阶段5：抵达结局时复位电影宽银幕（黑边不残留）
        this.cinematicOn = false;
        this.renderer.setCinematic(false);
        this.onCinematic?.(false);
        // 抵达结局：弹出结局提示（pendingEndingId 由 preceding unlock 指令设置；
        // 若某结局路径漏写 unlock，则传 null 显示通用“剧终”）。
        this.onEndingReached?.(this.pendingEndingId);
        break;
      }

      case 'unlock': {
        // 记录结局解锁（跨周目持久化，按故事命名空间）
        this.saves.unlockEnding(this.storyId, cmd.ending);
        this.pendingEndingId = cmd.ending;
        this.commandIndex++;
        this.executeNext();
        break;
      }

      case 'video': {
        if (!this.manifest?.videos) { this.commandIndex++; this.executeNext(); break; }
        const vurl = this.manifest.videos[cmd.id];
        if (!vurl) {
          console.warn(`视频未登记: ${cmd.id}`);
          this.commandIndex++;
          this.executeNext();
          break;
        }
        // 暂停命令循环，等待视频播完或用户跳过
        this.waitingForVideo = true;
        this.renderer.playVideo(vurl, () => {
          if (!this.waitingForVideo) return;
          this.waitingForVideo = false;
          this.commandIndex++;
          this.executeNext();
        });
        break;
      }

      case 'item': {
        if (!this.manifest?.items) { this.commandIndex++; this.executeNext(); break; }
        const itemDef = this.manifest.items[cmd.id];
        if (!itemDef) {
          console.warn(`物件未登记: ${cmd.id}`);
          this.commandIndex++;
          this.executeNext();
          break;
        }
        // 暂停命令循环，等待玩家点击关闭（自动/快进模式不自动关闭，必须玩家看）
        this.waitingForItem = true;
        this.renderer.showItem(itemDef.src, itemDef.caption, () => {
          if (!this.waitingForItem) return;
          this.waitingForItem = false;
          this.commandIndex++;
          this.executeNext();
        });
        break;
      }
    }
  }

  /** 渲染首页 */
  private renderTitleScreen(): void {
    this.renderer.renderTitleBackground(this.titleBgImage);

    if (!this.titleScreen) return;
    const ctx = this.renderer.getContext();
    const { width, height } = this.renderer.getSize();
    const cfg = this.titleScreen;

    // 首页动效：飘雨（在标题/文字之下绘制，保证文字清晰）
    if (this.titleAmbient === 'rain') {
      this.drawTitleRain(ctx, width, height);
    }

    // 标题
    const titleSize = cfg.titleFontSize || height * 0.09;
    ctx.fillStyle = cfg.titleColor || '#ffffff';
    ctx.font = `bold ${titleSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(cfg.title, width / 2, height * 0.28);
    ctx.shadowBlur = 0;

    // 副标题
    if (cfg.subtitle) {
      const subSize = titleSize * 0.42;
      ctx.fillStyle = cfg.subtitleColor || 'rgba(200, 200, 220, 0.85)';
      ctx.font = `${subSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillText(cfg.subtitle, width / 2, height * 0.28 + titleSize * 0.8);
    }

    // 版本/装饰线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.28 + titleSize * 1.4);
    ctx.lineTo(width * 0.7, height * 0.28 + titleSize * 1.4);
    ctx.stroke();
  }

  /** 首页飘雨动效（canvas 绘制，无额外素材；标题之下，不碍阅读） */
  private drawTitleRain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const now = performance.now();
    const dt = this.titleLastTs ? Math.min((now - this.titleLastTs) / 1000, 0.05) : 0;
    this.titleLastTs = now;

    const ANG = 0.22; // 雨丝倾斜斜率（vx = speed*ANG）

    // 惰性初始化粒子（按画布尺寸）
    if (this.titleParticles.length === 0) {
      const COUNT = Math.max(90, Math.round(w / 12));
      for (let i = 0; i < COUNT; i++) {
        this.titleParticles.push({
          x: Math.random() * (w + 80) - 40,
          y: Math.random() * h,
          speed: 360 + Math.random() * 380,
          len: 9 + Math.random() * 16,
          alpha: 0.07 + Math.random() * 0.16,
        });
      }
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(185, 205, 230, 1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of this.titleParticles) {
      const dx = d.speed * ANG * dt;
      const dy = d.speed * dt;
      d.x += dx;
      d.y += dy;
      if (d.y > h) { d.y = -d.len; d.x = Math.random() * (w + 80) - 40; }
      if (d.x > w + 40) d.x -= (w + 80);
      ctx.strokeStyle = `rgba(185, 205, 230, ${d.alpha})`;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * ANG, d.y - d.len);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** 设置首页配置 */
  setTitleScreen(config: TitleScreenConfig): void {
    this.titleScreen = config;
    // 首页动效：缺省视为 'rain'（无开头动画时的加分项），显式 'none' 才静止
    this.titleAmbient = config.ambient ?? 'rain';
    this.titleParticles = []; // 重置，drawTitleRain 会按新尺寸惰性重建

    // 预加载首页背景
    if (config.background && this.manifest) {
      const bgUrl = this.manifest.backgrounds[config.background];
      if (bgUrl) {
        const img = this.assets.getImage(bgUrl);
        if (img) {
          this.titleBgImage = img;
        }
      }
    }
  }

  /** 设置当前故事 ID（用于结局收集命名空间） */
  setStoryId(id: string): void {
    this.storyId = id;
  }

  /** 获取当前故事已解锁的结局 id 列表 */
  getUnlockedEndings(): string[] {
    return this.saves.getUnlockedEndings(this.storyId);
  }

  /** 当前是否停留在选项（等待玩家选择），供 UI 判断关闭相册后是否恢复选项面板 */
  isChoicePending(): boolean {
    return this.waitingForChoice;
  }

  /** 执行首页操作 */
  titleAction(action: TitleScreenAction): void {
    if (!this.onTitleScreen) return;

    switch (action) {
      case 'start':
        // 隐藏首页，进入游戏
        this.onTitleScreen = false;
        this.onTitleScreenChange?.(false);
        this.desiredBgmId = null; // 离开标题屏，后续 BGM 由剧本指令接管
        this.audio?.stopBgm(); // 停掉标题屏 BGM，交给定本第一条 bgm 指令接管
        this.startGameLoop();
        break;
      case 'continue':
        // 触发继续游戏（由 UIManager 处理读档）
        break;
      case 'settings':
        // 触发设置面板
        break;
      case 'quit':
        // 不做实际退出，回到首页
        break;
    }

    this.onTitleAction?.(action);
  }

  /** 是否在首页 */
  isOnTitleScreen(): boolean {
    return this.onTitleScreen;
  }

  /**
   * 解锁音频上下文（浏览器 autoplay 策略：无用户手势前 AudioContext 处于 suspended，
   * 标题屏 BGM 因此被拦截无法自动播放；须由首次用户手势触发 resume）。
   */
  async resumeAudio(): Promise<void> {
    await this.audio?.resume();
  }

  /**
   * 首次用户手势解锁音频后，若仍在标题屏、且本应在播的 BGM 因 autoplay 被拦截未真正出声，
   * 则显式补播（避免「进游戏前标题曲一直静音」）。进入游戏后由剧本指令接管，不在此补播。
   */
  replayTitleBgm(): void {
    if (this.onTitleScreen && this.desiredBgmId) {
      this.audio?.playBgm(this.desiredBgmId);
    }
  }

  /** 用户点击/推进 */
  advance(): void {
    if (!this.running) return;
    if (this.waitingForChoice) return; // 等待选择
    if (this.waitingForHub) return;     // 阶段4：枢纽激活时点击节点由 UI 处理，画布点击不推进
    if (this.waitingForQte) return;     // 阶段6：QTE 进行中，画布点击不推进（tap/key/mash 由 UI 层各自处理）

    // 视频过场中：点击 = 跳过，恢复命令循环
    if (this.waitingForVideo) {
      this.renderer.stopVideo();
      return;
    }

    // 物件弹窗中：点击 = 关闭，恢复命令循环
    if (this.waitingForItem) {
      this.renderer.hideItem();
      return;
    }

    if (this.waitingForClick) {
      this.waitingForClick = false;
      this.onDialogComplete?.();
      this.commandIndex++;
      this.executeNext();
      } else {
        // 如果当前没有等待点击，尝试执行下一条
        this.executeNext();
      }
    }

  /** UI 通知：当前对话文字已自然播放完毕（供自动模式判断何时可前进） */
  notifyTextFinished(): void {
    this.textFinished = true;
  }

  /** UI 通知：当前页开始打字（长文本翻页场景），重置自动/等待计时与文字完成标记 */
  notifyTextStarted(): void {
    this.textFinished = false;
    this.autoTimer = 0;
    this.waitTimer = 0;
  }

  /** 选择选项 */
  selectChoice(index: number): void {
    if (!this.waitingForChoice) return;

    const cmd = this.commands[this.commandIndex];
    if (cmd.type !== 'choice') return;

    const choice = cmd.choices[index];
    if (!choice) return;

    // 特殊标签：结局收集相册（打开 UI 面板，保持当前选项暂停状态，关闭后可继续选择）
    if (choice.label === 'gallery') {
      this.onGalleryOpen?.();
      return;
    }

    this.waitingForChoice = false;
    this.onChoicesHide?.();

    const targetIdx = this.labels.get(choice.label);
    if (targetIdx !== undefined) {
      this.commandIndex = targetIdx;
      this.executeNext();
    }
  }

  /** 切换自动模式 */
  toggleAuto(): boolean {
    this.autoMode = !this.autoMode;
    this.skipMode = false;
    return this.autoMode;
  }

  /** 切换快进模式 */
  toggleSkip(): boolean {
    this.skipMode = !this.skipMode;
    this.autoMode = false;
    return this.skipMode;
  }

  /** 获取当前存档状态 */
  getSaveState(label: string): SerializedGameState {
    return {
      currentCommandIndex: this.commandIndex,
      bgmId: this.audio?.getCurrentBgmId() ?? null,
      variables: this.variables.export(),
      flags: this.variables.exportFlags(),
      clues: Array.from(this.ownedClues),
      unlockedCodex: Array.from(this.unlockedCodex),
      hub: this.waitingForHub && this.hubDef
        ? { def: this.hubDef, phase: this.hubPhase, apLeft: this.hubApLeft }
        : null,
      backlog: this.backlog,
      scene: {
        bg: this.getCurrentBgId(),
        characters: Array.from(this.characters.values()).map(c => ({
          id: c.id,
          visible: c.visible,
          position: c.position,
          pose: c.pose,
          expression: c.expression,
        })),
      },
    };
  }

  /** 获取当前背景 ID */
  private getCurrentBgId(): string | null {
    return this.currentBgId;
  }

  /** 获取对话历史 */
  getBacklog(): BacklogEntry[] {
    return this.backlog;
  }

  /**
   * 养成事件监视：遍历事件表，对未触发过（once 且已置 flag.event.<id>）的事件求值条件，
   * 命中则置守门 flag、回调 onEventFired、跳转到事件 label。
   * 在「每次 set 之后」被调用，使属性变化能自动触发剧情事件，作者无需满剧本撒 if。
   * @returns 是否发生了跳转（true 时调用方不应再 executeNext）
   */
  private checkEvents(): boolean {
    for (const ev of this.eventList) {
      if (ev.once && this.variables.hasFlag('event.' + ev.id)) continue;
      if (this.variables.evaluate(ev.when)) {
        if (ev.once) this.variables.setFlag('event.' + ev.id);
        this.onEventFired?.(ev.id, ev.toast);
        const idx = this.labels.get(ev.jump);
        if (idx !== undefined) {
          this.commandIndex = idx;
          this.executeNext();
          return true;
        }
      }
    }
    return false;
  }

  /** 获取角色关系档案（供 UI 关系面板渲染） */
  getRelations(): RelationDef[] {
    return Array.from(this.relations.values());
  }

  /** 获取已收集线索（含完整 def，供 UI 线索笔记本渲染） */
  getClues(): ClueDef[] {
    return Array.from(this.ownedClues)
      .map(id => this.clueDefs.get(id))
      .filter((c): c is ClueDef => !!c);
  }

  /** 获取全部图鉴目录（供 UI 图鉴面板渲染分类） */
  getCodexDefs(): CodexDef[] {
    return Array.from(this.codexDefs.values());
  }

  /** 获取已解锁图鉴条目 id 列表 */
  getUnlockedCodex(): string[] {
    return Array.from(this.unlockedCodex);
  }

  /** 获取全部推理规则（供 UI 推理板判断可选线索 / 提示用） */
  getDeductions(): DeductionDef[] {
    return this.deductionList;
  }

  /**
   * 推理判定：玩家在推理板选中 selectedIds 线索后调用。
   * 遍历推理表，命中「requires 内每条线索都已拥有且被选中」的首条规则：
   *  - 应用 sets（写入变量）
   *  - once 则置守门 flag.deduce.<id>
   *  - 回调 onDeductionFired（UI 弹提示）
   *  - 若含 jump，跳转该 label（关闭面板后由 UI 调用，故此处直接跳转执行）
   * @returns 命中的推理规则（null 表示无匹配，UI 应提示「线索不足」）
   */
  tryDeduce(selectedIds: string[]): DeductionDef | null {
    const selected = new Set(selectedIds);
    for (const d of this.deductionList) {
      if (d.once && this.variables.hasFlag('deduce.' + d.id)) continue;
      const ok = d.requires.every(req => this.ownedClues.has(req) && selected.has(req));
      if (!ok) continue;
      // 命中
      if (d.sets) {
        for (const s of d.sets) this.variables.set(s.variable, s.value, s.op);
      }
      if (d.once) this.variables.setFlag('deduce.' + d.id);
      this.onDeductionFired?.(d.id, d.toast);
      if (d.jump) {
        const idx = this.labels.get(d.jump);
        if (idx !== undefined) {
          // 若当前正停在选项面板，先收起它，避免跳转后旧选项残留挡住新剧情
          if (this.waitingForChoice) {
            this.waitingForChoice = false;
            this.onChoicesHide?.();
          }
          // 游戏已结束（running=false，如已抵达 end）时不接受推理跳转：
          // 避免结局后误触推理静默改 commandIndex 导致画面/状态矛盾。
          // 正常流程（running=true）才执行跳转推进。
          if (this.running) {
            this.commandIndex = idx;
            this.executeNext();
          }
        }
      }
      return d;
    }
    return null;
  }

  // ========== 阶段6：QTE 快速反应事件 ==========
  /** 是否处于 QTE 激活态（供 UI 判断输入路由） */
  isQteActive(): boolean {
    return this.waitingForQte;
  }

  /** 当前 QTE 连点目标次数（mash 模式 UI 显示用） */
  getQteTarget(): number {
    return this.qteTarget;
  }

  /** 进入 QTE（由 `qte` 指令调用；暂停脚本推进直到输入成功/超时失败） */
  private enterQte(d: { id: string; prompt: string; duration: number; mode: 'tap' | 'key' | 'mash'; key?: string; target?: number; successLabel: string; failLabel: string; once?: boolean }): void {
    this.waitingForQte = true;
    this.qteId = d.id;
    this.qteMode = d.mode;
    this.qteKey = (d.key || 'Space').toUpperCase();
    this.qteTarget = d.target ?? 0;
    this.qteCount = 0;
    this.qteDuration = d.duration;
    this.qteTimeLeft = d.duration;
    this.qteSuccessLabel = d.successLabel;
    this.qteFailLabel = d.failLabel;
    this.qteOnce = !!d.once;
    this.onQteEnter?.({ prompt: d.prompt, duration: d.duration, mode: d.mode, target: d.target, key: this.qteKey });
  }

  /** 玩家在 QTE 期间输入（点击/按键/连点）。引擎按模式判定成功。 */
  qteInput(): void {
    if (!this.waitingForQte) return;
    if (this.qteMode === 'mash') {
      this.qteCount++;
      this.onQteProgress?.(Math.min(1, this.qteCount / Math.max(1, this.qteTarget)));
      if (this.qteCount >= Math.max(1, this.qteTarget)) this.resolveQte(true);
    } else {
      this.resolveQte(true);
    }
  }

  /** 解析 QTE 结果（成功跳 successLabel，失败/超时跳 failLabel）；once 则置守门 flag。 */
  private resolveQte(success: boolean): void {
    if (!this.waitingForQte) return;
    this.waitingForQte = false;
    if (this.qteOnce) this.variables.setFlag('qte.' + this.qteId);
    this.onQteExit?.();
    const label = success ? this.qteSuccessLabel : this.qteFailLabel;
    const idx = this.labels.get(label);
    if (idx !== undefined) {
      this.commandIndex = idx;
    } else {
      this.commandIndex++; // 标签缺失则跳过本指令继续
    }
    this.executeNext();
  }

  // ========== 阶段3：探索模式 ==========
  /** 进入探索模式（由 `explore` 指令调用；暂停脚本直到 exitExplore） */
  private enterExplore(def: ExploreDef): void {
    this.exploreDef = def;
    this.exploreWidthRatio = def.widthRatio ?? 2;
    this.exploreOffset = 0;
    this.exploreFound.clear();
    const url = this.manifest?.backgrounds[def.bg];
    this.exploreBgImage = url ? (this.assets.getImage(url) ?? null) : null;
    this.waitingForExplore = true;
    this.onExploreEnter?.({ hint: def.hint, total: def.hotspots.length });
  }

  /** 是否处于探索模式（供 UI 判断输入路由） */
  isExploring(): boolean {
    return this.waitingForExplore;
  }

  /** 退出探索模式并继续脚本（由 UI「结束探索」按钮调用） */
  exitExplore(): void {
    if (!this.waitingForExplore) return;
    this.waitingForExplore = false;
    this.onExploreExit?.();
    this.executeNext();
  }

  /** 平移视角（deltaRatio 单位：视口宽；正数向右看、负数向左看）。范围自动 clamp。 */
  panExplore(deltaRatio: number): void {
    if (!this.waitingForExplore) return;
    const max = Math.max(0, this.exploreWidthRatio - 1);
    this.exploreOffset = Math.max(0, Math.min(max, this.exploreOffset + deltaRatio));
  }

  /** 点击探索（normX/normY 为视口归一化坐标 0~1）；命中未发现的熱区则返回 true。 */
  clickExplore(normX: number, normY: number): boolean {
    if (!this.waitingForExplore || !this.exploreDef) return false;
    const gx = (normX + this.exploreOffset) / this.exploreWidthRatio;
    const gy = normY;
    for (const h of this.exploreDef.hotspots) {
      if (this.exploreFound.has(h.id)) continue;
      const w = h.w ?? 0.08;
      const hh = h.h ?? 0.12;
      if (gx >= h.x - w / 2 && gx <= h.x + w / 2 && gy >= h.y - hh / 2 && gy <= h.y + hh / 2) {
        this.exploreFound.add(h.id);
        // 阶段5：拾取闪光（画布白光一闪 + UI 金色光环）
        this.renderer.startEffect('flash', 0.4);
        this.onPickupFlash?.();
        // 收集线索（角标 +1，登记进笔记本）
        if (h.clue && !this.ownedClues.has(h.clue)) {
          this.ownedClues.add(h.clue);
          const cdef = this.clueDefs.get(h.clue);
          if (cdef) this.onClueAdded?.(cdef);
        }
        // 弹出关键道具（物件放大图）
        const it = h.item ? this.manifest?.items?.[h.item] : undefined;
        if (it) {
          this.renderer.showItem(it.src, it.caption, () => { /* 关闭道具后仍在探索中 */ });
        }
        this.onExploreFound?.(this.exploreFound.size, this.exploreDef.hotspots.length, h.label);
        return true;
      }
    }
    return false;
  }

  // ========== 阶段4：场景自选枢纽（hub） ==========
  /** 进入枢纽（由 `hub` 指令调用；暂停脚本直到节点跳转 / onEnd 收尾） */
  private enterHub(def: HubDef): void {
    this.hubDef = def;
    this.hubPhase = 0;
    this.hubApLeft = def.apPerPhase ?? 1;
    this.hubEnded = false;
    this.waitingForHub = true;
    const url = def.bg ? this.manifest?.backgrounds[def.bg] : undefined;
    this.hubBgImage = url ? (this.assets.getImage(url) ?? null) : null;
    this.onHubEnter?.({
      title: def.title,
      timePhases: def.time,
      apPerPhase: def.apPerPhase ?? 1,
      nodes: def.nodes,
    });
    this.onHubUpdate?.(this.hubPhase, this.hubApLeft, def.time.length);
  }

  /** 是否处于枢纽（供 UI 判断输入路由） */
  isInHub(): boolean {
    return this.waitingForHub;
  }

  /** 将 manifest 背景键解析为完整 URL（hub 节点背景图用） */
  backgroundUrl(key?: string): string | undefined {
    return key ? this.manifest?.backgrounds[key] : undefined;
  }

  /** 重新进入枢纽（读档恢复，或场景 returnHub 后回到枢纽） */
  private reenterHub(): void {
    if (!this.hubDef) return;
    this.waitingForHub = true;
    this.onHubEnter?.({
      title: this.hubDef.title,
      timePhases: this.hubDef.time,
      apPerPhase: this.hubDef.apPerPhase ?? 1,
      nodes: this.hubDef.nodes,
    });
    this.onHubUpdate?.(this.hubPhase, this.hubApLeft, this.hubDef.time.length);
  }

  /** 玩家在枢纽选择一个节点（消耗 1 行动点后跳转到节点场景） */
  selectHubNode(id: string): void {
    if (!this.waitingForHub || !this.hubDef) return;
    const node = this.hubDef.nodes.find(n => n.id === id);
    if (!node) return;
    // 锁定检查（requires 不满足则提示并忽略）
    if (node.requires && !this.variables.evaluate(node.requires)) {
      this.onHubLocked?.(node.locked_msg ?? '该地点尚未解锁');
      return;
    }
    // 消耗行动点
    this.hubApLeft = Math.max(0, this.hubApLeft - 1);
    // 进入节点场景（jump 到该 label）
    const idx = this.labels.get(node.jump);
    if (idx === undefined) {
      console.warn(`枢纽节点跳转标签未找到: ${node.jump}`);
      this.hubApLeft += 1; // 回滚扣除
      return;
    }
    this.waitingForHub = false;
    this.onHubExit?.();
    this.commandIndex = idx;
    this.executeNext();
  }

  /** 场景末尾 returnHub：回到枢纽；若阶段行动点耗尽则推进时间；全时段结束则收尾 */
  private exitHubReturn(): void {
    if (!this.hubDef) { this.executeNext(); return; }
    // 时间推进：当前阶段行动点耗尽 → 进入下一时间阶段；全部阶段结束 → 收尾
    if (this.hubApLeft <= 0) {
      this.hubPhase += 1;
      if (this.hubPhase >= this.hubDef.time.length) {
        this.hubEnded = true;
        this.waitingForHub = false;
        this.onHubExit?.();
        const idx = this.labels.get(this.hubDef.onEnd);
        if (idx !== undefined) {
          this.commandIndex = idx;
          this.executeNext();
          return;
        }
        this.executeNext();
        return;
      }
      this.hubApLeft = this.hubDef.apPerPhase ?? 1;
    }
    // 回到枢纽（不前进 commandIndex；节点跳转/收尾均按 label 路由）
    this.reenterHub();
  }

  /** 提前结束当天（玩家主动点「结束今天」）：直接跳 onEnd 收尾 */
  endHubEarly(): void {
    if (!this.waitingForHub || !this.hubDef) return;
    this.hubEnded = true;
    this.waitingForHub = false;
    this.onHubExit?.();
    const idx = this.labels.get(this.hubDef.onEnd);
    if (idx !== undefined) {
      this.commandIndex = idx;
      this.executeNext();
      return;
    }
    this.executeNext();
  }

  /** 暂停 */
  pause(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  /** 恢复 */
  resume(): void {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  /** 销毁 */
  dispose(): void {
    this.disposed = true;
    this.pause();
    this.audio?.dispose();
    this.assets.dispose();
    this.renderer.dispose();
    // 清理新增回调与首页动效状态（防止跨故事残留）
    this.onEndingReached = null;
    this.pendingEndingId = null;
    this.onClueAdded = null;
    this.onDeductionFired = null;
    this.onCodexUnlocked = null;
    this.titleParticles = [];
    this.titleLastTs = 0;
    this.titleAmbient = 'none';
  }
}
