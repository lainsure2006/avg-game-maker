/**
 * AVG Engine - UI 管理器
 * 对话框、选项面板、存档界面、设置、对话历史、故事选择
 */

import type { GameEngine } from '../engine/game-engine';
import type { ChoiceItem, BacklogEntry, GameSettings, TitleScreenConfig, TitleScreenAction, EndingDef } from '../engine/types';
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
  private advanceLockUntil: number = 0;

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
      if (!this.engine.isOnTitleScreen()) {
        this.advanceOnce();
      }
    }, { signal: sig });

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
          this.storySelectPanel.classList.contains('hidden')) {
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
  }
}
