/**
 * AVG Engine - UI 管理器
 * 对话框、选项面板、存档界面、设置、对话历史、故事选择
 */

import type { GameEngine } from '../engine/game-engine';
import type { ChoiceItem, BacklogEntry, GameSettings, TitleScreenConfig, TitleScreenAction, EndingDef, ClueDef } from '../engine/types';
import type { StoryConfig } from '../game/index';
import { switchStory } from '../game/index';

export class UIManager {
  private engine: GameEngine;
  private stories: StoryConfig[];

  // DOM 元素
  private dialogBox: HTMLElement;
  private speakerName: HTMLElement;
  private dialogText: HTMLElement;
  private clickIndicator: HTMLElement;
  private choicePanel: HTMLElement;
  private topBar: HTMLElement;
  private btnAuto: HTMLElement;
  private btnSkip: HTMLElement;
  private btnSave: HTMLElement;
  private btnLoad: HTMLElement;
  private btnSettings: HTMLElement;
  private btnBacklog: HTMLElement;
  private saveLoadPanel: HTMLElement;
  private saveLoadTitle: HTMLElement;
  private saveSlots: HTMLElement;
  private settingsPanel: HTMLElement;
  private backlogPanel: HTMLElement;
  private backlogContent: HTMLElement;

  // 角色关系面板（阶段1：人物养成）
  private relationsPanel: HTMLElement;
  private relationsContent: HTMLElement;
  private btnRelations: HTMLElement;
  private btnRelationsClose: HTMLElement;

  // 线索笔记本 + 推理板（阶段2：人物养成/探索）
  private cluesPanel: HTMLElement;
  private cluesContent: HTMLElement;
  private btnClues: HTMLElement;
  private btnCluesClose: HTMLElement;
  private btnCluesReason: HTMLElement;
  private btnCluesDeduce: HTMLElement;
  private btnCluesReasonExit: HTMLElement;
  private cluesBadge: HTMLElement;
  private cluesFooterRead: HTMLElement;
  private cluesFooterReason: HTMLElement;
  private cluesHint: HTMLElement;
  private cluesMode: 'read' | 'reason' = 'read';
  private cluesSelected: Set<string> = new Set();

  private eventToast: HTMLElement;
  private eventToastTimer: number = 0;

  private advanceLockUntil: number = 0;

  // 阶段3：探索模式 HUD
  private exploreHud: HTMLElement;
  private exploreHint: HTMLElement;
  private exploreCount: HTMLElement;
  private btnExploreLeft: HTMLElement;
  private btnExploreRight: HTMLElement;
  private btnExploreEnd: HTMLElement;
  private exploreHintText: string = '';

  // 首页元素
  private titleMenu: HTMLElement;
  private btnTitleStart: HTMLElement;
  private btnTitleContinue: HTMLElement;
  private btnTitleSettings: HTMLElement;
  private btnTitleQuit: HTMLElement;

  // 故事选择面板
  private storySelectPanel: HTMLElement;
  private storyList: HTMLElement;

  // 结局收集相册面板
  private endingGalleryPanel: HTMLElement;
  private endingGalleryGrid: HTMLElement;
  private endingDetailModal: HTMLElement;
  private endingDetailBody: HTMLElement;
  private currentEndings: EndingDef[] = [];

  // 结局抵达提示浮层
  private endingModal: HTMLElement;
  private endingModalTitle: HTMLElement;
  private endingModalBody: HTMLElement;
  private btnEndingGallery: HTMLElement;
  private btnEndingTitle: HTMLElement;
  /** 关闭相册后是否返回结局提示浮层（从结局提示打开相册时为 true） */
  private returnToEndingModal: boolean = false;

  // 状态
  private currentTab: 'save' | 'load' = 'save';
  private textAnimationTimer: number = 0;
  private textFullContent: string = '';
  private textDisplayIndex: number = 0;
  private textComplete: boolean = false;

  // 长文本分页
  private textPages: string[] = [];
  private currentPage: number = 0;
  private totalPages: number = 1;

  constructor(engine: GameEngine, stories: StoryConfig[]) {
    this.engine = engine;
    this.stories = stories;

    // 获取 DOM 引用
    this.dialogBox = document.getElementById('dialog-box')!;
    this.speakerName = document.getElementById('speaker-name')!;
    this.dialogText = document.getElementById('dialog-text')!;
    this.clickIndicator = document.getElementById('click-indicator')!;
    this.choicePanel = document.getElementById('choice-panel')!;
    this.topBar = document.getElementById('top-bar')!;
    this.btnAuto = document.getElementById('btn-auto')!;
    this.btnSkip = document.getElementById('btn-skip')!;
    this.btnSave = document.getElementById('btn-save')!;
    this.btnLoad = document.getElementById('btn-load')!;
    this.btnSettings = document.getElementById('btn-settings')!;
    this.btnBacklog = document.getElementById('btn-backlog')!;
    this.saveLoadPanel = document.getElementById('save-load-panel')!;
    this.saveLoadTitle = document.getElementById('save-load-title')!;
    this.saveSlots = document.getElementById('save-slots')!;
    this.settingsPanel = document.getElementById('settings-panel')!;
    this.backlogPanel = document.getElementById('backlog-panel')!;
    this.backlogContent = document.getElementById('backlog-content')!;

    // 角色关系面板（阶段1）
    this.relationsPanel = document.getElementById('relations-panel')!;
    this.relationsContent = document.getElementById('relations-content')!;
    this.btnRelations = document.getElementById('btn-relations')!;
    this.btnRelationsClose = document.getElementById('btn-relations-close')!;

    // 线索笔记本 + 推理板（阶段2）
    this.cluesPanel = document.getElementById('clues-panel')!;
    this.cluesContent = document.getElementById('clues-content')!;
    this.btnClues = document.getElementById('btn-clues')!;
    this.btnCluesClose = document.getElementById('btn-clues-close')!;
    this.btnCluesReason = document.getElementById('btn-clues-reason')!;
    this.btnCluesDeduce = document.getElementById('btn-clues-deduce')!;
    this.btnCluesReasonExit = document.getElementById('btn-clues-reason-exit')!;
    this.cluesBadge = document.getElementById('clues-badge')!;
    this.cluesFooterRead = document.getElementById('clues-footer-read')!;
    this.cluesFooterReason = document.getElementById('clues-footer-reason')!;
    this.cluesHint = document.getElementById('clues-hint')!;

    // 阶段3：探索模式 HUD
    this.exploreHud = document.getElementById('explore-hud')!;
    this.exploreHint = document.getElementById('explore-hint')!;
    this.exploreCount = document.getElementById('explore-count')!;
    this.btnExploreLeft = document.getElementById('btn-explore-left')!;
    this.btnExploreRight = document.getElementById('btn-explore-right')!;
    this.btnExploreEnd = document.getElementById('btn-explore-end')!;

    this.eventToast = document.getElementById('event-toast')!;

    // 首页元素
    this.titleMenu = document.getElementById('title-menu')!;
    this.btnTitleStart = document.getElementById('btn-title-start')!;
    this.btnTitleContinue = document.getElementById('btn-title-continue')!;
    this.btnTitleSettings = document.getElementById('btn-title-settings')!;
    this.btnTitleQuit = document.getElementById('btn-title-quit')!;

    // 故事选择面板
    this.storySelectPanel = document.getElementById('story-select-panel')!;
    this.storyList = document.getElementById('story-list')!;

    // 结局收集相册面板
    this.endingGalleryPanel = document.getElementById('ending-gallery-panel')!;
    this.endingGalleryGrid = document.getElementById('ending-gallery-grid')!;
    this.endingDetailModal = document.getElementById('ending-detail-modal')!;
    this.endingDetailBody = document.getElementById('ending-detail-body')!;
    this.endingModal = document.getElementById('ending-modal')!;
    this.endingModalTitle = document.getElementById('ending-modal-title')!;
    this.endingModalBody = document.getElementById('ending-modal-body')!;
    this.btnEndingGallery = document.getElementById('btn-ending-gallery')!;
    this.btnEndingTitle = document.getElementById('btn-ending-title')!;
    this.abort = new AbortController();
    this.endingDetailModal.addEventListener('click', (e) => {
      if (e.target === this.endingDetailModal) this.endingDetailModal.classList.add('hidden');
    }, { signal: this.abort.signal });

    this.setupEngineCallbacks();
    this.setupEventListeners();
    this.loadSettings();
  }

  /** 设置引擎回调 */
  private setupEngineCallbacks(): void {
    this.engine.onDialogUpdate = (speaker, text, isNarration) => {
      this.showDialog(speaker, text, isNarration);
    };

    this.engine.onDialogComplete = () => {
      this.finishTextAnimation();
    };

    this.engine.onAdvanceRequest = () => {
      this.advanceOnce();
    };

    this.engine.onChoicesShow = (choices) => {
      this.showChoices(choices);
    };

    this.engine.onChoicesHide = () => {
      this.hideChoices();
    };

    // 打开结局收集相册
    this.engine.onGalleryOpen = () => {
      this.showGallery();
    };

    // 游戏抵达结局 → 弹出结局提示（避免玩家以为游戏卡住）
    this.engine.onEndingReached = (endingId) => {
      this.showEndingModal(endingId);
    };

    // 养成事件触发 → 瞬时提示（若关系面板正打开则同步刷新好感条）
    this.engine.onEventFired = (id, toast) => {
      this.showEventToast(toast ?? `事件：${id}`);
      if (!this.relationsPanel.classList.contains('hidden')) this.renderRelations();
    };

    // 收集到新线索 → 刷新「线索」按钮角标（若笔记本正打开则同步刷新列表）
    this.engine.onClueAdded = (clue: ClueDef) => {
      this.updateCluesBadge();
      if (!this.cluesPanel.classList.contains('hidden')) this.renderClues();
    };

    // 推理成功 → 瞬时提示（与养成事件共用 toast）
    this.engine.onDeductionFired = (id, toast) => {
      this.showEventToast(toast ?? `推理：${id}`);
    };

    // 阶段3：探索模式回调
    this.engine.onExploreEnter = (info) => this.showExploreHud(info);
    this.engine.onExploreFound = (found, total, label) => this.updateExploreCount(found, total, label);
    this.engine.onExploreExit = () => this.hideExploreHud();

    // 首页状态变化
    this.engine.onTitleScreenChange = (visible) => {
      if (visible) {
        this.titleMenu.classList.remove('hidden');
        this.topBar.classList.add('hidden');
        this.dialogBox.classList.add('hidden');
        this.choicePanel.classList.add('hidden');
        this.storySelectPanel.classList.add('hidden');
        this.endingGalleryPanel.classList.add('hidden');

        // 检查是否有存档，决定"继续游戏"按钮是否显示
        let hasSaves = false;
        for (let i = 0; i < 20; i++) {
          if (this.engine.saves.load(i)) {
            hasSaves = true;
            break;
          }
        }
        if (hasSaves) {
          this.btnTitleContinue.classList.remove('hidden');
        } else {
          this.btnTitleContinue.classList.add('hidden');
        }
      } else {
        this.titleMenu.classList.add('hidden');
        this.topBar.classList.remove('hidden');
        this.storySelectPanel.classList.add('hidden');
      }
    };

    // 首页操作回调
    this.engine.onTitleAction = (action) => {
      switch (action) {
        case 'start':
          this.titleMenu.classList.add('hidden');
          this.topBar.classList.remove('hidden');
          break;
        case 'continue':
          this.currentTab = 'load';
          this.saveLoadTitle.textContent = '读档';
          this.showSaveLoadPanel();
          break;
        case 'settings':
          this.showSettings();
          break;
        case 'quit':
          // 退出不做实际操作
          break;
        case 'select_story':
          this.showStorySelect();
          break;
      }
    };
  }

  /** 设置事件监听 */
  private setupEventListeners(): void {
    const sig = this.abort!.signal;

    // 点击对话框推进
    this.dialogBox.addEventListener('click', (e) => {
      e.stopPropagation();
      this.advanceOnce();
    }, { signal: sig });

    // 点击画布推进
    document.getElementById('game-canvas')?.addEventListener('click', () => {
      if (!this.engine.isOnTitleScreen() && !this.engine.isExploring()) {
        this.advanceOnce();
      }
    }, { signal: sig });

    // 阶段3：探索模式输入（拖拽平移 / 点击热区）—— 仅探索激活时生效
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    let pDown = false, pDragged = false, pStartX = 0, pLastX = 0;
    const DRAG_THRESH = 6;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.engine.isExploring()) return;
      pDown = true; pDragged = false; pStartX = e.clientX; pLastX = e.clientX;
    }, { signal: sig });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.engine.isExploring() || !pDown) return;
      const dx = e.clientX - pLastX; pLastX = e.clientX;
      if (Math.abs(e.clientX - pStartX) > DRAG_THRESH) pDragged = true;
      this.engine.panExplore(-dx / canvas.clientWidth); // 向右拖 → 视角向左（offset 减小）
    }, { signal: sig });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.engine.isExploring()) { pDown = false; return; }
      pDown = false;
      if (!pDragged) {
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;
        const hit = this.engine.clickExplore(nx, ny);
        if (!hit) this.showExploreNudge();
      }
    }, { signal: sig });
    canvas.addEventListener('pointerleave', () => { pDown = false; }, { signal: sig });

    this.btnExploreLeft.addEventListener('click', () => this.engine.panExplore(-0.3));
    this.btnExploreRight.addEventListener('click', () => this.engine.panExplore(0.3));
    this.btnExploreEnd.addEventListener('click', () => this.engine.exitExplore());

    // 首页按钮
    this.btnTitleStart.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.titleAction('start');
    }, { signal: sig });

    this.btnTitleContinue.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.titleAction('continue');
    }, { signal: sig });

    this.btnTitleSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      this.engine.titleAction('settings');
    }, { signal: sig });

    this.btnTitleQuit.addEventListener('click', (e) => {
      e.stopPropagation();
      // 多故事时：显示故事选择，而非退出
      if (this.stories.length > 1) {
        this.engine.titleAction('select_story');
      }
    }, { signal: sig });

    // 结局收集（标题屏）
    document.getElementById('btn-title-gallery')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showGallery();
    }, { signal: sig });

    // 结局收集关闭
    document.getElementById('btn-gallery-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideGallery();
    }, { signal: sig });

    // 结局提示浮层：查看结局收集
    this.btnEndingGallery.addEventListener('click', (e) => {
      e.stopPropagation();
      this.returnToEndingModal = true;
      this.hideEndingModal();
      this.showGallery();
    }, { signal: sig });

    // 结局提示浮层：返回标题
    this.btnEndingTitle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideEndingModal();
      this.engine.showTitleScreen();
    }, { signal: sig });

    // 自动播放
    this.btnAuto.addEventListener('click', (e) => {
      e.stopPropagation();
      const active = this.engine.toggleAuto();
      this.btnAuto.classList.toggle('active', active);
      this.btnSkip.classList.remove('active');
    }, { signal: sig });

    // 快进
    this.btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      const active = this.engine.toggleSkip();
      this.btnSkip.classList.toggle('active', active);
      this.btnAuto.classList.remove('active');
    }, { signal: sig });

    // 存档按钮
    this.btnSave.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentTab = 'save';
      this.saveLoadTitle.textContent = '存档';
      this.showSaveLoadPanel();
    }, { signal: sig });

    // 读档按钮
    this.btnLoad.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentTab = 'load';
      this.saveLoadTitle.textContent = '读档';
      this.showSaveLoadPanel();
    }, { signal: sig });

    // 关闭存档面板
    document.getElementById('btn-save-load-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideSaveLoadPanel();
    }, { signal: sig });

    // Tab 切换
    document.querySelectorAll('.panel-tabs .tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.target as HTMLElement;
        const tabType = el.dataset.tab as 'save' | 'load';
        this.currentTab = tabType;
        this.saveLoadTitle.textContent = tabType === 'save' ? '存档' : '读档';
        document.querySelectorAll('.panel-tabs .tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        this.renderSaveSlots();
      }, { signal: sig });
    });

    // 设置
    this.btnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSettings();
    }, { signal: sig });

    document.getElementById('btn-settings-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideSettings();
    }, { signal: sig });

    // 设置滑块
    this.setupSettingsControls();

    // 对话历史
    this.btnBacklog.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showBacklog();
    }, { signal: sig });

    document.getElementById('btn-backlog-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideBacklog();
    }, { signal: sig });

    // 角色关系面板（阶段1）
    this.btnRelations.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRelations();
    }, { signal: sig });

    this.btnRelationsClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideRelations();
    }, { signal: sig });

    // 线索笔记本（阶段2）
    this.btnClues.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleClues();
    }, { signal: sig });

    this.btnCluesClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideClues();
    }, { signal: sig });

    this.btnCluesReason.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enterReasonMode();
    }, { signal: sig });

    this.btnCluesReasonExit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitReasonMode();
    }, { signal: sig });

    this.btnCluesDeduce.addEventListener('click', (e) => {
      e.stopPropagation();
      this.doDeduce();
    }, { signal: sig });

    // 故事选择关闭
    document.getElementById('btn-story-select-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideStorySelect();
    }, { signal: sig });

    // 键盘控制
    document.addEventListener('keydown', (e) => {
      if (this.saveLoadPanel.classList.contains('hidden') &&
          this.settingsPanel.classList.contains('hidden') &&
          this.backlogPanel.classList.contains('hidden') &&
          this.storySelectPanel.classList.contains('hidden') &&
          this.relationsPanel.classList.contains('hidden') &&
          this.cluesPanel.classList.contains('hidden')) {
        switch (e.key) {
          case ' ':
          case 'Enter':
            e.preventDefault();
            this.advanceOnce();
            break;
          case 'Escape':
            this.showSettings();
            break;
        }
      } else if (e.key === 'Escape') {
        this.hideSaveLoadPanel();
        this.hideSettings();
        this.hideBacklog();
        this.hideStorySelect();
        this.hideRelations();
        this.hideClues();
      }
    }, { signal: sig });
  }

  /** 显示故事选择面板 */
  private showStorySelect(): void {
    this.storySelectPanel.classList.remove('hidden');
    this.renderStoryList();
  }

  /** 隐藏故事选择面板 */
  private hideStorySelect(): void {
    this.storySelectPanel.classList.add('hidden');
  }

  /** 由 main.ts 在当前故事加载后注入结局目录 */
  setStoryEndings(endings: EndingDef[]): void {
    this.currentEndings = endings || [];
  }

  /** 显示结局收集相册 */
  private showGallery(): void {
    this.hideChoices();
    this.renderEndingGallery();
    this.endingGalleryPanel.classList.remove('hidden');
  }

  /** 隐藏结局收集相册（若来自结局选项，恢复选项面板） */
  private hideGallery(): void {
    this.endingGalleryPanel.classList.add('hidden');
    this.endingDetailModal.classList.add('hidden');
    if (this.returnToEndingModal) {
      // 从结局提示浮层打开的相册：关闭后回到结局提示
      this.returnToEndingModal = false;
      this.endingModal.classList.remove('hidden');
      return;
    }
    if (this.engine.isChoicePending()) {
      this.choicePanel.classList.remove('hidden');
    }
  }

  /** 游戏抵达结局：弹出提示浮层（含标题/简介 + 返回标题 / 查看结局收集） */
  private showEndingModal(endingId: string | null): void {
    const def = endingId ? this.currentEndings.find(e => e.id === endingId) : undefined;
    if (def) {
      this.endingModalTitle.textContent = `抵达结局 · ${def.title}`;
      this.endingModalBody.textContent = def.desc;
    } else {
      this.endingModalTitle.textContent = '剧终';
      this.endingModalBody.textContent = '故事已走到终点。你可以返回标题重新选择，或查看已解锁的结局。';
    }
    // 隐藏进行中的游戏 UI，避免与浮层重叠
    this.dialogBox.classList.add('hidden');
    this.topBar.classList.add('hidden');
    this.choicePanel.classList.add('hidden');
    this.endingModal.classList.remove('hidden');
  }

  /** 关闭结局提示浮层 */
  private hideEndingModal(): void {
    this.endingModal.classList.add('hidden');
  }

  /** 渲染结局卡片（已解锁显示缩略图+标题+简介，未解锁显示 ???） */
  private renderEndingGallery(): void {
    this.endingGalleryGrid.innerHTML = '';
    const unlocked = this.engine.getUnlockedEndings();

    // 本故事未配置结局收集
    if (this.currentEndings.length === 0) {
      const tip = document.createElement('div');
      tip.className = 'ending-empty';
      tip.textContent = '本故事暂未配置结局收集。';
      this.endingGalleryGrid.appendChild(tip);
      return;
    }

    if (unlocked.length === 0) {
      const tip = document.createElement('div');
      tip.className = 'ending-empty';
      tip.textContent = '还没有达成任何结局。去故事里做出你的选择吧。';
      this.endingGalleryGrid.appendChild(tip);
      return;
    }

    this.currentEndings.forEach(ending => {
      const isUnlocked = unlocked.includes(ending.id);
      const card = document.createElement('div');
      card.className = isUnlocked ? 'ending-card' : 'ending-card locked';

      if (isUnlocked) {
        card.innerHTML = `
          <div class="ending-thumb" style="background-image:url('${ending.thumbnail}')"></div>
          <div class="ending-card-title">${ending.title}</div>
          <div class="ending-card-desc">${ending.desc}</div>
        `;
      } else {
        card.innerHTML = `
          <div class="ending-thumb locked-thumb">？</div>
          <div class="ending-card-title">？？？</div>
          <div class="ending-card-desc">尚未解锁</div>
        `;
      }

      if (isUnlocked) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => this.showEndingDetail(ending));
      }

      this.endingGalleryGrid.appendChild(card);
    });
  }

  /** 点击已解锁结局卡片 → 弹出详情（大图 + 简介 + 如何达成 + 解锁状态） */
  private showEndingDetail(ending: EndingDef): void {
    this.endingDetailBody.innerHTML = `
      <div class="ending-detail-banner" style="background-image:url('${ending.thumbnail}')">
        <div class="ending-detail-banner-mask"></div>
        <div class="ending-detail-banner-title">${ending.title}</div>
        <button class="ending-detail-close">✕</button>
      </div>
      <div class="ending-detail-section">
        <div class="ending-detail-label">结局简介</div>
        <div class="ending-detail-text">${ending.desc}</div>
      </div>
      <div class="ending-detail-section">
        <div class="ending-detail-label">如何达成</div>
        <div class="ending-detail-text">${ending.how}</div>
      </div>
      <div class="ending-detail-section">
        <div class="ending-detail-label">解锁状态</div>
        <div class="ending-detail-status">✓ 已解锁</div>
      </div>
    `;
    this.endingDetailBody
      .querySelector('.ending-detail-close')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.endingDetailModal.classList.add('hidden');
      });
    this.endingDetailModal.classList.remove('hidden');
  }

  /** 渲染故事列表 */
  private renderStoryList(): void {
    this.storyList.innerHTML = '';

    this.stories.forEach(story => {
      const card = document.createElement('div');
      card.className = 'story-card';

      card.innerHTML = `
        <div class="story-card-title">${story.title}</div>
        <div class="story-card-subtitle">${story.subtitle}</div>
        ${story.description ? `<div class="story-card-desc">${story.description}</div>` : ''}
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideStorySelect();
        // 切换故事
        switchStory(story.id);
      });

      this.storyList.appendChild(card);
    });
  }

  /** 显示对话框 */
  private showDialog(speaker: string, text: string, isNarration: boolean): void {
    this.dialogBox.classList.remove('hidden');
    this.choicePanel.classList.add('hidden');

    if (isNarration || !speaker) {
      this.speakerName.style.display = 'none';
    } else {
      this.speakerName.style.display = 'block';
      this.speakerName.textContent = speaker;
    }

    // 长文本自动分页：超出对话框高度时切成多页，页间点击翻页、最后一页点击才前进
    this.textPages = this.splitIntoPages(text);
    this.totalPages = this.textPages.length;
    this.currentPage = 0;
    this.textFullContent = this.textPages[0];
    this.textDisplayIndex = 0;
    this.textComplete = false;
    this.dialogText.textContent = '';
    this.clickIndicator.classList.add('hidden');

    this.startTextAnimation();
  }

  /** 文字打字机动画 */
  private startTextAnimation(): void {
    const speed = this.getTextAnimationSpeed();
    const step = () => {
      if (this.textDisplayIndex < this.textFullContent.length) {
        this.textDisplayIndex++;
        this.dialogText.textContent = this.textFullContent.slice(0, this.textDisplayIndex);
        this.textAnimationTimer = window.setTimeout(step, speed);
      } else {
        this.textComplete = true;
        this.textAnimationTimer = 0;
        this.clickIndicator.classList.remove('hidden');
        this.engine.notifyTextFinished();
      }
    };
    step();
  }

  /** 跳过文字动画 */
  private finishTextAnimation(): void {
    if (this.textAnimationTimer) {
      clearTimeout(this.textAnimationTimer);
      this.textAnimationTimer = 0;
    }
    this.textDisplayIndex = this.textFullContent.length;
    this.dialogText.textContent = this.textFullContent;
    this.textComplete = true;
    this.clickIndicator.classList.remove('hidden');
  }

  /**
   * 长文本自动分页：按对话框实际可用高度，把一条文本切成多页。
   * 用隐藏测量容器复制 dialogText 的排版样式，逐字符测量其所属行，
   * 再按每页最大行数合并，保证任意字号/宽度下都能精确分页——不溢出、不撑满屏。
   */
  private splitIntoPages(text: string): string[] {
    if (!text) return [''];
    const src = this.dialogText;
    const cs = getComputedStyle(src);
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.left = '-99999px';
    probe.style.top = '0';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'normal';
    probe.style.wordBreak = 'break-word';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.lineHeight = cs.lineHeight;
    probe.style.letterSpacing = cs.letterSpacing;
    probe.style.width = src.clientWidth + 'px';
    probe.style.padding = cs.padding;
    probe.style.border = cs.border;
    probe.style.boxSizing = cs.boxSizing;
    probe.textContent = text;
    document.body.appendChild(probe);

    const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.8);
    // 每页最多行数：按约 120px 高度上限动态计算，保证不撑满对话框
    const maxLines = Math.max(2, Math.floor(120 / lineHeight));

    const node = probe.firstChild as Text;
    const charTop: number[] = new Array(text.length);
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      charTop[i] = range.getBoundingClientRect().top;
    }

    // 按行分组（top 发生明显跳变即换行）
    const lines: string[] = [];
    let cur = '';
    let curTop = charTop[0];
    for (let i = 0; i < text.length; i++) {
      if (i > 0 && Math.abs(charTop[i] - curTop) > lineHeight / 2) {
        lines.push(cur);
        cur = '';
        curTop = charTop[i];
      }
      cur += text[i];
    }
    lines.push(cur);

    // 按每页最大行数合并成页
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += maxLines) {
      pages.push(lines.slice(i, i + maxLines).join(''));
    }

    document.body.removeChild(probe);
    return pages.length ? pages : [text];
  }

  /**
   * 统一的前进入口：
   * - 文本仍在打字（textAnimationTimer 存在）→ 仅补全，不前进；
   * - 文本已播完 → 带 220ms 防抖再前进，避免连点把长文本瞬间秒跳。
   */
  private advanceOnce(): void {
    if (this.textAnimationTimer) {
      this.finishTextAnimation();
      return;
    }
    const now = Date.now();
    if (now < this.advanceLockUntil) return;
    this.advanceLockUntil = now + 220;

    // 长文本分页：非最后一页时仅翻到下一页，不前进到下一条指令
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.textFullContent = this.textPages[this.currentPage];
      this.textDisplayIndex = 0;
      this.textComplete = false;
      this.dialogText.textContent = '';
      this.clickIndicator.classList.add('hidden');
      this.engine.notifyTextStarted();
      this.startTextAnimation();
      return;
    }

    this.engine.advance();
  }

  /** 获取文字速度 */
  private getTextAnimationSpeed(): number {
    return 130 - this.engine.settings.textSpeed * 12;
  }

  /** 显示选项 */
  private showChoices(choices: ChoiceItem[]): void {
    this.dialogBox.classList.add('hidden');
    this.choicePanel.innerHTML = '';
    this.choicePanel.classList.remove('hidden');

    choices.forEach((choice, index) => {
      if (choice.condition && !this.engine.variables.evaluate(choice.condition)) {
        return;
      }

      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.engine.selectChoice(index);
      });
      this.choicePanel.appendChild(btn);
    });
  }

  /** 隐藏选项 */
  private hideChoices(): void {
    this.choicePanel.classList.add('hidden');
  }

  /** 显示存档面板 */
  private showSaveLoadPanel(): void {
    this.saveLoadPanel.classList.remove('hidden');
    this.renderSaveSlots();
  }

  /** 隐藏存档面板 */
  private hideSaveLoadPanel(): void {
    this.saveLoadPanel.classList.add('hidden');
  }

  /** 渲染存档槽位 */
  private renderSaveSlots(): void {
    this.saveSlots.innerHTML = '';

    for (let i = 0; i < 20; i++) {
      const slot = document.createElement('div');
      slot.className = 'save-slot';

      const saveData = this.engine.saves.load(i);

      if (saveData) {
        const thumb = document.createElement('div');
        thumb.className = 'slot-thumb';
        if (saveData.thumbnail) {
          const img = document.createElement('img');
          img.src = saveData.thumbnail;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          thumb.appendChild(img);
        }
        slot.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'slot-info';
        info.innerHTML = `
          <div class="slot-label">槽位 ${i + 1} - ${saveData.label}</div>
          <div class="slot-meta">${new Date(saveData.timestamp).toLocaleString('zh-CN')}</div>
        `;
        slot.appendChild(info);

        slot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentTab === 'save') {
            this.doSave(i);
          } else {
            this.doLoad(i);
          }
        });

        if (this.currentTab === 'save') {
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-delete-slot';
          delBtn.textContent = '删除';
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.engine.saves.delete(i);
            this.renderSaveSlots();
          });
          slot.appendChild(delBtn);
        }
      } else {
        slot.innerHTML = `<span class="slot-empty">槽位 ${i + 1} — 空</span>`;
        if (this.currentTab === 'save') {
          slot.addEventListener('click', (e) => {
            e.stopPropagation();
            this.doSave(i);
          });
        }
      }

      this.saveSlots.appendChild(slot);
    }
  }

  /** 执行存档 */
  private doSave(slotId: number): void {
    const label = this.getSceneDescription();
    const thumbnail = this.engine.renderer.getSnapshot();
    const state = this.engine.getSaveState(label);
    this.engine.saves.save(slotId, state, thumbnail, label);
    this.renderSaveSlots();
  }

  /** 执行读档 */
  private doLoad(slotId: number): void {
    const saveData = this.engine.saves.load(slotId);
    if (saveData) {
      this.hideSaveLoadPanel();
      this.engine.restoreFromSave(saveData.gameState);
    }
  }

  /** 获取场景描述 */
  private getSceneDescription(): string {
    const backlog = this.engine.getBacklog();
    if (backlog.length > 0) {
      const last = backlog[backlog.length - 1];
      const text = last.text.length > 20 ? last.text.slice(0, 20) + '...' : last.text;
      return last.speaker ? `${last.speaker}: ${text}` : text;
    }
    return '游戏开始';
  }

  /** 显示设置 */
  private showSettings(): void {
    this.settingsPanel.classList.remove('hidden');
    this.syncSettingsToUI();
  }

  /** 隐藏设置 */
  private hideSettings(): void {
    this.settingsPanel.classList.add('hidden');
  }

  /** 设置控件 */
  private setupSettingsControls(): void {
    const textSpeed = document.getElementById('setting-text-speed') as HTMLInputElement;
    const autoDelay = document.getElementById('setting-auto-delay') as HTMLInputElement;
    const bgmVolume = document.getElementById('setting-bgm-volume') as HTMLInputElement;
    const seVolume = document.getElementById('setting-se-volume') as HTMLInputElement;
    const fontSize = document.getElementById('setting-font-size') as HTMLSelectElement;

    textSpeed.addEventListener('input', () => {
      this.engine.settings.textSpeed = parseInt(textSpeed.value);
      this.saveSettings();
    });

    autoDelay.addEventListener('input', () => {
      this.engine.settings.autoDelay = parseInt(autoDelay.value);
      this.saveSettings();
    });

    bgmVolume.addEventListener('input', () => {
      const vol = parseInt(bgmVolume.value) / 100;
      this.engine.settings.bgmVolume = parseInt(bgmVolume.value);
      this.engine.audio?.setBgmVolume(vol);
      this.saveSettings();
    });

    seVolume.addEventListener('input', () => {
      const vol = parseInt(seVolume.value) / 100;
      this.engine.settings.seVolume = parseInt(seVolume.value);
      this.engine.audio?.setSeVolume(vol);
      this.saveSettings();
    });

    fontSize.addEventListener('change', () => {
      this.engine.settings.fontSize = fontSize.value as 'small' | 'medium' | 'large';
      this.applyFontSize();
      this.saveSettings();
    });
  }

  /** 同步设置到 UI */
  private syncSettingsToUI(): void {
    (document.getElementById('setting-text-speed') as HTMLInputElement).value = String(this.engine.settings.textSpeed);
    (document.getElementById('setting-auto-delay') as HTMLInputElement).value = String(this.engine.settings.autoDelay);
    (document.getElementById('setting-bgm-volume') as HTMLInputElement).value = String(this.engine.settings.bgmVolume);
    (document.getElementById('setting-se-volume') as HTMLInputElement).value = String(this.engine.settings.seVolume);
    (document.getElementById('setting-font-size') as HTMLSelectElement).value = this.engine.settings.fontSize;
  }

  /** 应用字体大小 */
  private applyFontSize(): void {
    const sizes = { small: '15px', medium: '18px', large: '22px' };
    this.dialogText.style.fontSize = sizes[this.engine.settings.fontSize];
  }

  /** 显示对话历史 */
  private showBacklog(): void {
    this.backlogPanel.classList.remove('hidden');
    const backlog = this.engine.getBacklog();
    this.backlogContent.innerHTML = backlog
      .map(entry => {
        if (entry.speaker) {
          return `<div class="backlog-entry"><span class="backlog-speaker">${entry.speaker}</span>${entry.text}</div>`;
        }
        return `<div class="backlog-entry" style="color:#888;font-style:italic;">${entry.text}</div>`;
      })
      .join('');
    this.backlogContent.scrollTop = this.backlogContent.scrollHeight;
  }

  /** 隐藏对话历史 */
  private hideBacklog(): void {
    this.backlogPanel.classList.add('hidden');
  }

  // ========== 角色关系面板（阶段1：人物养成） ==========
  private toggleRelations(): void {
    if (this.relationsPanel.classList.contains('hidden')) this.showRelations();
    else this.hideRelations();
  }

  private showRelations(): void {
    this.renderRelations();
    this.relationsPanel.classList.remove('hidden');
  }

  private hideRelations(): void {
    this.relationsPanel.classList.add('hidden');
  }

  /** 渲染角色关系卡片：性格/好恶/好感进度条（好感值实时取自变量系统） */
  private renderRelations(): void {
    const relations = this.engine.getRelations();
    this.relationsContent.innerHTML = '';

    if (relations.length === 0) {
      const tip = document.createElement('div');
      tip.className = 'ending-empty';
      tip.textContent = '本故事暂未声明角色关系（relation 指令）。';
      this.relationsContent.appendChild(tip);
      return;
    }

    for (const r of relations) {
      const min = r.min ?? -10;
      const max = r.max ?? 10;
      const raw = Number(this.engine.variables.get(r.affinity)) || 0;
      const val = Math.max(min, Math.min(max, raw));

      // 好感条：以中点(0)为界，正负各占半边。fillLeft/fillWidth 用百分比定位。
      const half = 50;
      const magPct = (Math.abs(val) / (val >= 0 ? max : -min)) * half;
      const fillLeft = val >= 0 ? half : half - magPct;
      const fillWidth = val >= 0 ? magPct : magPct;

      const card = document.createElement('div');
      card.className = 'relation-card';

      const tags: string[] = [];
      if (r.likes) tags.push(`<span class="relation-tag like">喜·${r.likes}</span>`);
      if (r.dislikes) tags.push(`<span class="relation-tag dislike">恶·${r.dislikes}</span>`);

      card.innerHTML = `
        <div class="relation-name">${r.name}</div>
        ${r.personality ? `<div class="relation-personality">${r.personality}</div>` : ''}
        ${tags.length ? `<div class="relation-tags">${tags.join('')}</div>` : ''}
        <div class="affinity-row">
          <span class="affinity-label">好感</span>
          <div class="affinity-bar">
            <div class="mid"></div>
            <div class="affinity-fill ${val >= 0 ? 'pos' : 'neg'}" style="left:${fillLeft}%;width:${fillWidth}%"></div>
          </div>
          <span class="affinity-value">${val}</span>
        </div>
      `;
      this.relationsContent.appendChild(card);
    }
  }

  // ========== 线索笔记本 + 推理板（阶段2） ==========
  private toggleClues(): void {
    if (this.cluesPanel.classList.contains('hidden')) this.showClues();
    else this.hideClues();
  }

  private showClues(): void {
    this.cluesMode = 'read';
    this.cluesSelected.clear();
    this.updateCluesBadge();
    this.renderClues();
    this.cluesPanel.classList.remove('hidden');
  }

  private hideClues(): void {
    this.cluesPanel.classList.add('hidden');
  }

  /** 渲染线索列表（read 模式=只读卡片；reason 模式=可点选卡片） */
  private renderClues(): void {
    this.cluesContent.innerHTML = '';
    const clues = this.engine.getClues();

    if (clues.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'clue-empty';
      empty.textContent = '尚未收集到任何线索。继续探索吧。';
      this.cluesContent.appendChild(empty);
    } else {
      for (const c of clues) {
        const card = document.createElement('div');
        card.className = 'clue-card' + (this.cluesMode === 'reason' ? ' selectable' : '');
        const selected = this.cluesMode === 'reason' && this.cluesSelected.has(c.id);
        if (selected) card.classList.add('selected');

        const iconHtml = c.icon
          ? `<img class="clue-icon" src="${this.escapeHtml(c.icon)}" alt="" />`
          : `<div class="clue-icon"></div>`;
        const checkHtml = this.cluesMode === 'reason'
          ? `<div class="clue-check">${selected ? '✓' : ''}</div>`
          : '';
        card.innerHTML = `${checkHtml}${iconHtml}<div class="clue-body"><div class="clue-name">${this.escapeHtml(c.name)}</div><div class="clue-desc">${this.escapeHtml(c.desc)}</div></div>`;

        if (this.cluesMode === 'reason') {
          card.addEventListener('click', () => this.toggleClueSelect(c.id));
        }
        this.cluesContent.appendChild(card);
      }
    }

    // 底部操作栏随模式切换
    if (this.cluesMode === 'read') {
      this.cluesFooterRead.classList.remove('hidden');
      this.cluesFooterReason.classList.add('hidden');
    } else {
      this.cluesFooterRead.classList.add('hidden');
      this.cluesFooterReason.classList.remove('hidden');
    }
    this.cluesHint.classList.add('hidden');
  }

  private enterReasonMode(): void {
    this.cluesMode = 'reason';
    this.cluesSelected.clear();
    this.renderClues();
  }

  private exitReasonMode(): void {
    this.cluesMode = 'read';
    this.cluesSelected.clear();
    this.renderClues();
  }

  private toggleClueSelect(id: string): void {
    if (this.cluesSelected.has(id)) this.cluesSelected.delete(id);
    else this.cluesSelected.add(id);
    this.renderClues();
  }

  private doDeduce(): void {
    if (this.cluesSelected.size === 0) {
      this.showCluesHint('请先选择若干线索，再点「推理」。');
      return;
    }
    const fired = this.engine.tryDeduce(Array.from(this.cluesSelected));
    if (fired) {
      // 推理成功：关闭面板；瞬时提示由引擎 onDeductionFired 回调弹
      this.hideClues();
    } else {
      this.showCluesHint('线索不足以推出结论，再想想组合方式。');
    }
  }

  // ========== 阶段3：探索模式 HUD 控制 ==========
  private showExploreHud(info: { hint?: string; total: number }): void {
    this.exploreHintText = info.hint ?? '拖动浏览场景，点击发光处寻找线索';
    this.exploreHint.textContent = this.exploreHintText;
    this.updateExploreCount(0, info.total);
    this.exploreHud.classList.remove('hidden');
    this.dialogBox.classList.add('hidden'); // 探索时隐藏对话框，避免误触推进
  }

  private updateExploreCount(found: number, total: number, label?: string): void {
    this.exploreCount.textContent = `线索 ${found}/${total}`;
    if (label) {
      this.exploreHint.textContent = `发现：${label}`;
      window.setTimeout(() => { this.exploreHint.textContent = this.exploreHintText; }, 1600);
    }
  }

  private hideExploreHud(): void {
    this.exploreHud.classList.add('hidden');
  }

  private showExploreNudge(): void {
    this.exploreHint.textContent = '（这里似乎什么也没有…）';
    window.setTimeout(() => { this.exploreHint.textContent = this.exploreHintText; }, 1200);
  }

  private showCluesHint(text: string): void {
    this.cluesHint.textContent = text;
    this.cluesHint.classList.remove('hidden');
  }

  /** 刷新顶栏「线索」角标（已收集线索数量） */
  private updateCluesBadge(): void {
    const n = this.engine.getClues().length;
    if (n > 0) {
      this.cluesBadge.textContent = String(n);
      this.cluesBadge.classList.remove('hidden');
    } else {
      this.cluesBadge.classList.add('hidden');
    }
  }

  /** 防止线索文本里的 < > & 破坏 DOM（与渲染安全一致） */
  private escapeHtml(s: string): string {
    if (s == null) return '';
    return s.replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch] ?? ch));
  }

  /** 养成事件触发瞬时提示（2.5s 后自动淡出） */
  private showEventToast(text: string): void {
    this.eventToast.innerHTML = `<span class="toast-badge">🔔</span><span>${text}</span>`;
    this.eventToast.classList.remove('hidden');
    void this.eventToast.offsetWidth; // 强制重绘以触发 transition
    this.eventToast.classList.add('show');
    if (this.eventToastTimer) clearTimeout(this.eventToastTimer);
    this.eventToastTimer = window.setTimeout(() => {
      this.eventToast.classList.remove('show');
      window.setTimeout(() => this.eventToast.classList.add('hidden'), 300);
    }, 2500);
  }

  /** 持久化设置 */
  private saveSettings(): void {
    try {
      localStorage.setItem('avg-engine-settings', JSON.stringify(this.engine.settings));
    } catch { /* ignore */ }
  }

  /** 加载设置 */
  private loadSettings(): void {
    try {
      const raw = localStorage.getItem('avg-engine-settings');
      if (raw) {
        const saved = JSON.parse(raw) as GameSettings;
        Object.assign(this.engine.settings, saved);
      }
    } catch { /* ignore */ }
  }

  /**
   * 销毁：切换故事时由 main.ts 调用。
   * 1) 移除绑定在持久 DOM（dialog-box / game-canvas / document / 各固定按钮）上的监听，
   *    否则每次切换都会累积一组旧监听，点击会同时推进多个旧引擎 → 对话框串台词；
   * 2) 停掉可能仍在跑的打字机 setTimeout，避免旧字符继续写入对话框；
   * 3) 断开引擎回调，避免旧 UIManager 被旧引擎残留回调引用而泄漏 / 写旧文本。
   */
  dispose(): void {
    if (this.textAnimationTimer) {
      clearTimeout(this.textAnimationTimer);
      this.textAnimationTimer = 0;
    }
    if (this.abort) {
      this.abort.abort();
      this.abort = null;
    }
    this.engine.onDialogUpdate = null;
    this.engine.onDialogComplete = null;
    this.engine.onAdvanceRequest = null;
    this.engine.onChoicesShow = null;
    this.engine.onChoicesHide = null;
    this.engine.onGalleryOpen = null;
    this.engine.onTitleScreenChange = null;
    this.engine.onTitleAction = null;
    this.engine.onEndingReached = null;
    this.engine.onEventFired = null;
    this.engine.onClueAdded = null;
    this.engine.onDeductionFired = null;
  }
}
