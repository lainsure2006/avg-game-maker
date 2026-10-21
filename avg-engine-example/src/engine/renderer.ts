/**
 * AVG Engine - Canvas 渲染器
 * 负责背景图、角色立绘、转场特效、序列帧动画的渲染
 */

import type { CharacterState, TransitionType, AnimationDef, GradeType, WeatherType, EffectType } from './types';
import { ParticleSystem } from './particles';

const FONT_SIZES = { small: 15, medium: 18, large: 22 };
const CHAR_POSITIONS = { left: 0.2, center: 0.5, right: 0.8 };

// ========== 序列帧动画播放器 ==========

export interface ActiveAnimation {
  id: string;
  def: AnimationDef;
  images: HTMLImageElement[];
  currentFrame: number;
  timer: number;
  playing: boolean;
  position: 'left' | 'center' | 'right';
  alpha: number;
}

export class AnimationPlayer {
  private animations: Map<string, ActiveAnimation> = new Map();

  /** 注册一个动画（加载帧图片后调用） */
  register(id: string, def: AnimationDef, images: HTMLImageElement[]): void {
    this.animations.set(id, {
      id,
      def,
      images,
      currentFrame: 0,
      timer: 0,
      playing: false,
      position: 'center',
      alpha: 1,
    });
  }

  /** 播放指定动画 */
  play(id: string, position: 'left' | 'center' | 'right' = 'center'): void {
    const anim = this.animations.get(id);
    if (anim) {
      anim.playing = true;
      anim.currentFrame = 0;
      anim.timer = 0;
      anim.position = position;
      anim.alpha = 1;
    }
  }

  /** 停止动画 */
  stop(id: string): void {
    const anim = this.animations.get(id);
    if (anim) {
      anim.playing = false;
    }
  }

  /** 停止所有动画 */
  stopAll(): void {
    for (const anim of this.animations.values()) {
      anim.playing = false;
    }
  }

  /** 每帧更新 */
  update(dt: number): void {
    for (const anim of this.animations.values()) {
      if (!anim.playing) continue;
      if (anim.images.length === 0) continue;

      anim.timer += dt;
      const frameDuration = 1 / anim.def.frameRate;

      if (anim.timer >= frameDuration) {
        anim.timer -= frameDuration;
        anim.currentFrame++;

        if (anim.currentFrame >= anim.images.length) {
          if (anim.def.loop) {
            anim.currentFrame = 0;
          } else {
            anim.currentFrame = anim.images.length - 1;
            anim.playing = false; // 不循环则停在最后一帧
          }
        }
      }
    }
  }

  /** 绘制所有活跃动画 */
  render(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    // 只有显式 play() 后才绘制；避免 loop 动画在从未触发时也常驻屏幕。
    for (const anim of this.animations.values()) {
      if (!anim.playing) continue;
      const img = anim.images[anim.currentFrame];
      if (!img) continue;
      this.drawAnimFrame(ctx, img, anim, canvasW, canvasH);
    }
  }

  private drawAnimFrame(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    anim: ActiveAnimation,
    canvasW: number,
    canvasH: number,
  ): void {
    ctx.globalAlpha = anim.alpha;
    const posX = CHAR_POSITIONS[anim.position] * canvasW;

    // 按立绘规则缩放：高度占画布 75%，但宽度不能超过 0.28*画布宽，
    // 否则相邻 left/center/right（间距 0.3*画布宽）的角色立绘会水平重叠。
    const maxHeight = canvasH * 0.75;
    const maxW = canvasW * 0.28;
    let scale = Math.min(maxHeight / img.height, 1);
    let drawW = img.width * scale;
    if (drawW > maxW) {
      scale = maxW / img.width;
      drawW = maxW;
    }
    const drawH = img.height * scale;
    const drawX = posX - drawW / 2;
    const drawY = canvasH - drawH;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  /** 获取动画列表（用于引擎层查询） */
  getAnimations(): Map<string, ActiveAnimation> {
    return this.animations;
  }

  /** 销毁 */
  dispose(): void {
    this.animations.clear();
  }
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1280;
  private height: number = 720;

  // 序列帧动画播放器
  animPlayer: AnimationPlayer;

  // 粒子系统（阶段1：樱花/雨/雪/散景）
  private particles: ParticleSystem = new ParticleSystem();

  // 场景情绪调色
  private grade: GradeType = 'none';

  // 屏幕特效状态（flash/dim/shake）
  private flashTime: number = 0;
  private flashTotal: number = 1;
  private flashAlpha: number = 0;
  private dimTime: number = 0;
  private dimTotal: number = 1;
  private dimAlpha: number = 0;
  private shakeTime: number = 0;
  private shakeTotal: number = 1;
  private shakeMag: number = 0;

  // 阶段2：时间累计 + 背景 Ken Burns 缓推 + 强调 zoom 镜头推拉
  private elapsed: number = 0;
  private kbT: number = 0;
  private zoomTime: number = 0;
  private zoomTotal: number = 1;
  private zoomActive: boolean = false;
  // 阶段5：电影宽银幕（放大背景 Ken Burns 缓推振幅）
  private cinematicMode: boolean = false;

  // 当前渲染状态
  private bgImage: HTMLImageElement | null = null;
  private bgAlpha: number = 1;
  private transitionAlpha: number = 1;
  private prevBgImage: HTMLImageElement | null = null;
  private transitionType: TransitionType = 'fade';
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;
  private transitionResolve: (() => void) | null = null;

  // 阶段6·视差（深度伪分层）：多层背景按深度因子偏移 + 空闲呼吸 + 鼠标视差
  private parallax: { img: HTMLImageElement; factor: number }[] | null = null;
  private prevParallax: { img: HTMLImageElement; factor: number }[] | null = null;
  private parallaxT: number = 0;
  private parallaxProgress: number = 1;
  private parallaxTransitioning: boolean = false;
  private pResolve: (() => void) | null = null;
  private mouseNX: number = 0;
  private mouseNY: number = 0;
  private parallaxOn: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.animPlayer = new AnimationPlayer();
    this.particles.setSize(this.width, this.height);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e: PointerEvent) => {
      this.mouseNX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNY = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  /** 响应窗口大小变化 */
  resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.width = rect.width;
      this.height = rect.height;
      this.ctx.setTransform(
        window.devicePixelRatio, 0, 0,
        window.devicePixelRatio, 0, 0
      );
      this.particles.setSize(this.width, this.height);
    }
  }

  /** 获取画布尺寸 */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /** 获取 Canvas 2D 上下文 */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** 阶段5：开关电影宽银幕（放大背景缓推振幅，黑边由 UI 层负责） */
  setCinematic(on: boolean): void {
    this.cinematicMode = on;
  }

  /** 设置背景 */
  setBackground(image: HTMLImageElement | null, transition: TransitionType = 'fade'): Promise<void> {
    this.kbT = 0; // 每个场景重新从静止开始缓慢推镜
    // 阶段6·视差：切换到单图层背景时清空视差层组
    this.parallax = null;
    this.prevParallax = null;
    this.parallaxTransitioning = false;
    if (!image) {
      this.bgImage = null;
      return Promise.resolve();
    }

    if (!this.bgImage || transition === 'none') {
      // 首次设置，或显式要求无转场 → 立即切换
      this.bgImage = image;
      this.bgAlpha = 1;
      this.isTransitioning = false;
      this.prevBgImage = null;
      return Promise.resolve();
    }

    // 执行转场
    return new Promise(resolve => {
      this.prevBgImage = this.bgImage;
      this.bgImage = image;
      this.transitionType = transition;
      this.transitionProgress = 0;
      this.isTransitioning = true;
      this.transitionResolve = resolve;
    });
  }

  /** 阶段6·视差：设置多层背景（far->near），可带层组淡入淡出转场 */
  setParallaxStack(stack: { img: HTMLImageElement; factor: number }[] | null, transition: TransitionType = 'fade'): Promise<void> {
    this.kbT = 0;
    if (!stack || stack.length === 0) {
      this.parallax = null;
      this.prevParallax = null;
      this.parallaxTransitioning = false;
      return Promise.resolve();
    }
    if (!this.parallax || transition === 'none') {
      this.parallax = stack;
      this.prevParallax = null;
      this.parallaxTransitioning = false;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.prevParallax = this.parallax;
      this.parallax = stack;
      this.parallaxProgress = 0;
      this.parallaxTransitioning = true;
      this.pResolve = resolve;
    });
  }

  /** 阶段6·视差：总开关（空闲呼吸 + 鼠标视差） */
  setParallaxEnabled(on: boolean): void {
    this.parallaxOn = on;
  }

  /** 每帧更新 */
  update(dt: number): void {
    // 更新转场
    if (this.isTransitioning) {
      this.transitionProgress += dt * 2; // 转场速度
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.prevBgImage = null;
        this.transitionResolve?.();
        this.transitionResolve = null;
      }
    }

    // 更新序列帧动画
    this.animPlayer.update(dt);

    // 更新粒子
    this.particles.update(dt);

    // 更新屏幕特效计时
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      this.flashAlpha = this.flashTime > 0 ? Math.max(0, this.flashTime / this.flashTotal) : 0;
    } else {
      this.flashAlpha = 0;
    }
    if (this.dimTime > 0) {
      this.dimTime -= dt;
      this.dimAlpha = this.dimTime > 0 ? 0.45 * Math.max(0, this.dimTime / this.dimTotal) : 0;
    } else {
      this.dimAlpha = 0;
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }

    // 阶段2：时间累计（驱动立绘呼吸 / 背景 Ken Burns 缓推）
    this.elapsed += dt;
    if (!this.isTransitioning) {
      this.kbT += dt;
    }
    // 阶段6·视差：时间累计（即使转场中也推进，使偏移持续运动）
    if (this.parallax && this.parallaxOn) {
      this.parallaxT += dt;
    }
    if (this.parallaxTransitioning) {
      this.parallaxProgress += dt * 2;
      if (this.parallaxProgress >= 1) {
        this.parallaxProgress = 1;
        this.parallaxTransitioning = false;
        this.prevParallax = null;
        this.pResolve?.();
        this.pResolve = null;
      }
    }
    // 强调 zoom 镜头推拉计时
    if (this.zoomTime > 0) {
      this.zoomTime -= dt;
      if (this.zoomTime <= 0) {
        this.zoomTime = 0;
        this.zoomActive = false;
      }
    }
  }

  /** 渲染一帧 */
  render(characters: Map<string, CharacterState>, fontSize: string): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 震屏：整体平移（clearRect 已清全屏，故边缘留白可忽略）
    let sx = 0;
    let sy = 0;
    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / this.shakeTotal);
      sx = (Math.random() * 2 - 1) * m;
      sy = (Math.random() * 2 - 1) * m;
    }

    ctx.save();
    // 阶段2：强调 zoom 镜头推拉（围绕画面中心轻微推拉）
    if (this.zoomActive) {
      const p = 1 - this.zoomTime / this.zoomTotal; // 0 -> 1
      const z = 1 + 0.05 * Math.sin(p * Math.PI);   // 0->1->0 峰值 1.05
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(z, z);
      ctx.translate(-this.width / 2, -this.height / 2);
    }
    // 震屏：整体平移
    ctx.translate(sx, sy);

    // 绘制背景（+转场）
    this.renderBackground(ctx);

    // 绘制角色（按位置排序）
    this.renderCharacters(ctx, characters);

    // 绘制序列帧动画（覆盖在角色上层）
    this.animPlayer.render(ctx, this.width, this.height);

    // 场景情绪调色（覆盖在场景与角色之上，营造氛围）
    this.renderGrade(ctx);

    // 天气粒子（最上层）
    this.particles.render(ctx);

    ctx.restore();

    // 屏幕特效（flash/dim 不随震屏偏移，全屏）
    this.renderScreenFx(ctx);
  }

  /** 渲染背景 */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    // 无背景：深色填充
    if (!this.bgImage && !this.parallax) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    // 阶段6·视差：多层背景按深度因子偏移 + 空闲呼吸 + 鼠标视差
    if (this.parallax && this.parallaxOn) {
      this.renderParallax(ctx);
      return;
    }

    if (!this.isTransitioning) {
      this.drawBackgroundImage(ctx, this.bgImage, 1);
      return;
    }

    const p = this.transitionProgress; // 0 -> 1

    // 所有转场都先画旧背景打底
    if (this.prevBgImage) {
      this.drawBackgroundImage(ctx, this.prevBgImage, 1);
    }

    switch (this.transitionType) {
      case 'fade':
        this.drawBackgroundImage(ctx, this.bgImage, p);
        break;

      case 'slide-left':
      case 'slide-right': {
        // 新背景从右/左滑入覆盖旧背景
        const dir = this.transitionType === 'slide-left' ? -1 : 1;
        const offset = (1 - p) * this.width * dir;
        ctx.save();
        ctx.translate(offset, 0);
        this.drawBackgroundImage(ctx, this.bgImage, 1);
        ctx.restore();
        break;
      }

      case 'iris': {
        // 圆形展开揭示新背景
        const radius = p * Math.hypot(this.width, this.height) * 0.62;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        ctx.clip();
        this.drawBackgroundImage(ctx, this.bgImage, 1);
        ctx.restore();
        break;
      }

      case 'dissolve': {
        // 棋盘格按伪随机顺序逐块揭示（带 cover 映射，保证构图正确）
        const cols = 14;
        const rows = 8;
        const cw = this.width / cols;
        const ch = this.height / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (this.hashBlock(idx) < p) {
              ctx.save();
              ctx.beginPath();
              ctx.rect(c * cw, r * ch, cw, ch);
              ctx.clip();
              this.drawBackgroundImage(ctx, this.bgImage, 1);
              ctx.restore();
            }
          }
        }
        break;
      }

      case 'flash': {
        // 中点切换 + 白色闪过（峰值在 p=0.5）
        if (p >= 0.5) {
          this.drawBackgroundImage(ctx, this.bgImage, 1);
        }
        const wf = 1 - Math.abs(2 * p - 1);
        ctx.save();
        ctx.globalAlpha = Math.min(1, wf);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
        break;
      }

      default:
        this.drawBackgroundImage(ctx, this.bgImage, p);
    }
  }

  /** 绘制背景并叠加 Ken Burns 缓推（缓慢缩放+漂移，营造电影感） */
  private drawBackgroundImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, alpha: number): void {
    ctx.save();
    // 阶段5：电影模式下放大缓推振幅（更明显的“推镜”感）
    const amp = this.cinematicMode ? 2.4 : 1;
    const s = 1 + 0.05 * amp * (0.5 - 0.5 * Math.cos(this.kbT * 0.06)); // 1.0 -> 1.05(常规)/1.12(电影) 缓慢呼吸
    const ox = Math.sin(this.kbT * 0.04) * this.width * 0.012 * amp;
    const oy = Math.cos(this.kbT * 0.03) * this.height * 0.01 * amp;
    ctx.translate(this.width / 2 + ox, this.height / 2 + oy);
    ctx.scale(s, s);
    ctx.translate(-this.width / 2, -this.height / 2);
    this.drawImageCover(ctx, img, alpha);
    ctx.restore();
  }

  /** 阶段6·视差：渲染多层背景（far->near 顺序，按 factor 偏移） */
  private renderParallax(ctx: CanvasRenderingContext2D): void {
    const stack = this.parallax!;
    const t = this.parallaxT;
    const idleX = Math.sin(t * 0.18) * this.width * 0.004;   // 极轻微空闲呼吸
    const idleY = Math.cos(t * 0.13) * this.height * 0.003;
    const mouseX = this.mouseNX * this.width * 0.012;          // 鼠标视差幅度
    const mouseY = this.mouseNY * this.height * 0.010;
    const draw = (layer: { img: HTMLImageElement; factor: number }, alpha: number) => {
      const f = layer.factor;
      this.drawParallaxLayer(ctx, layer.img, (idleX + mouseX) * f, (idleY + mouseY) * f, alpha);
    };
    if (this.parallaxTransitioning && this.prevParallax) {
      const p = this.parallaxProgress;
      for (const l of this.prevParallax) draw(l, 1 - p);
      for (const l of stack) draw(l, p);
    } else {
      for (const l of stack) draw(l, 1);
    }
  }

  /** 阶段6·视差：绘制单层（带 overscan 防位移露边 + 轻微 Ken Burns 缓推） */
  private drawParallaxLayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement, ox: number, oy: number, alpha: number): void {
    ctx.save();
    const baseScale = 1.06; // overscan 防位移露边
    const kb = 0.03 * (0.5 - 0.5 * Math.cos(this.kbT * 0.06)) * (this.cinematicMode ? 1.6 : 1);
    const sc = baseScale + kb;
    ctx.translate(this.width / 2 + ox, this.height / 2 + oy);
    ctx.scale(sc, sc);
    ctx.translate(-this.width / 2, -this.height / 2);
    this.drawImageCover(ctx, img, alpha);
    ctx.restore();
  }

  /** 棋盘格揭示的确定性伪随机（0~1），保证转场期间顺序稳定 */
  private hashBlock(i: number): number {
    const v = Math.sin(i * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  }

  /** 场景情绪调色叠加 */
  private renderGrade(ctx: CanvasRenderingContext2D): void {
    const colors: Record<GradeType, string> = {
      none: 'rgba(0,0,0,0)',
      warm: 'rgba(255,170,90,0.13)',
      cold: 'rgba(80,130,220,0.16)',
      soft: 'rgba(255,200,220,0.10)',
      dusk: 'rgba(255,130,120,0.15)',
    };
    if (this.grade === 'none') return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors[this.grade];
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  /** 屏幕特效叠加（flash 白 / dim 黑） */
  private renderScreenFx(ctx: CanvasRenderingContext2D): void {
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flashAlpha);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
    if (this.dimAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.dimAlpha);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  // ========== 特效对外接口（由引擎指令驱动） ==========

  /** 设置场景情绪调色 */
  setGrade(g: GradeType): void {
    this.grade = g;
  }

  /** 设置/切换环境天气 */
  setWeather(w: WeatherType, intensity = 1): void {
    this.particles.setWeather(w, intensity);
  }

  /** 触发一次性/环境特效 */
  startEffect(effect: EffectType, duration = 1): void {
    switch (effect) {
      case 'flash':
        this.startFlash(duration * 0.6);
        break;
      case 'dim':
        this.startDim(duration * 0.6);
        break;
      case 'shake':
        this.startShake(Math.min(1.4, duration * 0.6), 9);
        break;
      case 'rain':
        this.particles.setWeather('rain');
        break;
      case 'snow':
        this.particles.setWeather('snow');
        break;
      case 'petal':
        this.particles.setWeather('petal');
        break;
      case 'bokeh':
        this.particles.setWeather('bokeh');
        break;
      case 'zoom':
        this.startZoom(duration * 0.6);
        break;
    }
  }

  private startZoom(dur: number): void {
    this.zoomTotal = Math.max(0.3, dur);
    this.zoomTime = this.zoomTotal;
    this.zoomActive = true;
  }

  private startFlash(dur: number): void {
    this.flashTotal = Math.max(0.1, dur);
    this.flashTime = this.flashTotal;
  }

  private startDim(dur: number): void {
    this.dimTotal = Math.max(0.1, dur);
    this.dimTime = this.dimTotal;
  }

  private startShake(dur: number, mag: number): void {
    this.shakeTotal = Math.max(0.1, dur);
    this.shakeTime = this.shakeTotal;
    this.shakeMag = mag;
  }

  /** 绘制角色立绘 */
  private renderCharacters(ctx: CanvasRenderingContext2D, characters: Map<string, CharacterState>): void {
    const sorted = Array.from(characters.values())
      .filter(c => c.visible)
      .sort((a, b) => {
        const order = { left: 0, center: 1, right: 2 };
        return order[a.position] - order[b.position];
      });

    for (const char of sorted) {
      // 角色的实际图片由引擎层通过 imageMap 提供
      // 这里使用一个关联方式
    }
  }

  /** 绘制角色立绘（供引擎调用） */
  drawCharacter(
    image: HTMLImageElement,
    position: 'left' | 'center' | 'right',
    alpha: number = 1
  ): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;

    const posX = CHAR_POSITIONS[position] * this.width;

    // 立绘缩放：高度占画布的75%，同时限制最大宽度为 0.28*画布宽，
    // 避免相邻 left/center/right（间距 0.3*画布宽）的角色立绘水平重叠。
    const maxHeight = this.height * 0.75;
    const maxW = this.width * 0.28;
    let scale = Math.min(maxHeight / image.height, 1);
    let drawW = image.width * scale;
    if (drawW > maxW) {
      scale = maxW / image.width;
      drawW = maxW;
    }
    const drawH = image.height * scale;
    const drawX = posX - drawW / 2;
    const drawY = this.height - drawH;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  /**
   * 自适应布局绘制立绘（方案 B：位置/宽度由调用方按同屏人数计算，支持任意人数不重叠）。
   * @param xRatio    立绘中心相对画布宽度的比例（0~1）
   * @param maxWRatio 立绘允许的最大宽度相对画布宽度的比例（0~1），由调用方按人数给定
   */
  drawCharacterAuto(
    image: HTMLImageElement,
    xRatio: number,
    maxWRatio: number,
    alpha: number = 1,
    breathPhase: number = 0,
    popScale: number = 1,
    blinkOverlay: HTMLImageElement | null = null,
    blinkAlpha: number = 1
  ): void {
    const ctx = this.ctx;

    // 高度占画布 75%，宽度不超过调用方传入的 maxWRatio；
    // 相邻立绘的间距由 xRatio 决定，保证任意人数下水平不重叠。
    const maxHeight = this.height * 0.75;
    const maxW = this.width * maxWRatio;
    let scale = Math.min(maxHeight / image.height, 1);
    let drawW = image.width * scale;
    if (drawW > maxW) {
      scale = maxW / image.width;
      drawW = maxW;
    }
    const drawH = image.height * scale;

    // 阶段5：入场缩放弹入（popScale 由引擎按入场进度传入；1=正常，过冲期略>1）
    const popW = drawW * popScale;
    const popH = drawH * popScale;

    // 阶段2：立绘呼吸（极轻微垂直起伏 + 微缩放，使角色“活”起来）
    const t = this.elapsed * 1.6 + breathPhase;
    const breathScale = 1 + Math.sin(t) * 0.006;
    const bob = Math.sin(t) * (this.height * 0.005);
    const breatheH = popH * breathScale;
    const baseY = this.height + bob;          // 脚底随呼吸轻微上下
    const drawY = baseY - breatheH;
    const posX = xRatio * this.width;
    const drawX = posX - popW / 2;

    ctx.save();
    // 强调 zoom + 震屏（与背景层一致，使整屏演出统一）
    if (this.zoomActive) {
      const p = 1 - this.zoomTime / this.zoomTotal;
      const z = 1 + 0.05 * Math.sin(p * Math.PI);
      ctx.translate(this.width / 2, this.height / 2);
      ctx.scale(z, z);
      ctx.translate(-this.width / 2, -this.height / 2);
    }
    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / this.shakeTotal);
      ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, drawX, drawY, popW, breatheH);
    // 阶段6·眨眼：闭眼覆盖层在原同尺寸/同变换下叠加（像素级对齐，无位移）
    if (blinkOverlay && blinkAlpha > 0.01) {
      ctx.globalAlpha = alpha * blinkAlpha;
      ctx.drawImage(blinkOverlay, drawX, drawY, popW, breatheH);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** 图片 cover 绘制 */
  private drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, alpha: number = 1): void {
    ctx.globalAlpha = alpha;
    const imgRatio = img.width / img.height;
    const canvasRatio = this.width / this.height;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgRatio > canvasRatio) {
      drawH = this.height;
      drawW = this.height * imgRatio;
      drawX = (this.width - drawW) / 2;
      drawY = 0;
    } else {
      drawW = this.width;
      drawH = this.width / imgRatio;
      drawX = 0;
      drawY = (this.height - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
  }

  /** 获取画布快照（用于存档缩略图） */
  getSnapshot(): string {
    return this.canvas.toDataURL('image/jpeg', 0.5);
  }

  /**
   * 阶段3：渲染探索宽图
   * - 把整图 cover 到「widthRatio×视口宽 × 视口高」的宽画布，再裁切出当前视口窗口（按 offset 平移）；
   * - 绘制热区：未发现的画脉动微光点（引导玩家寻找），已发现的画高亮环 + ✓；
   * - 底部画一条拖动范围指示条。
   * 坐标系说明：热区 x 归一化到「整张宽图宽度」，y 归一化到视口高度。
   */
  renderExplore(
    bgImage: HTMLImageElement,
    offset: number,
    widthRatio: number,
    hotspots: { id: string; x: number; y: number; w?: number; h?: number }[],
    found: Set<string>,
  ): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    ctx.clearRect(0, 0, W, H);

    // —— 1) 裁切绘制宽图 ——
    if (bgImage.width > 0 && bgImage.height > 0) {
      const wideW = widthRatio * W;
      const wideH = H;
      const imgRatio = bgImage.width / bgImage.height;
      const wideRatio = wideW / wideH;
      let dw: number, dh: number, dx: number, dy: number;
      if (imgRatio > wideRatio) {
        dh = wideH; dw = wideH * imgRatio; dx = (wideW - dw) / 2; dy = 0;
      } else {
        dw = wideW; dh = wideW / imgRatio; dx = 0; dy = (wideH - dh) / 2;
      }
      const sx = (offset * W - dx) * (bgImage.width / dw);
      const sy = (0 - dy) * (bgImage.height / dh);
      const sw = W * (bgImage.width / dw);
      const sh = H * (bgImage.height / dh);
      ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);
    }

    // 暗角，聚焦中央
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // —— 2) 热区标记 ——
    const t = performance.now() / 1000;
    for (const h of hotspots) {
      const screenXNorm = h.x * widthRatio - offset; // 视口归一化 x
      if (screenXNorm < -0.12 || screenXNorm > 1.12) continue; // 不在视口内
      const px = screenXNorm * W;
      const py = h.y * H;
      const isFound = found.has(h.id);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + h.x * 10);
      if (isFound) {
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120, 220, 160, 0.22)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(150, 240, 180, 0.95)';
        ctx.stroke();
        ctx.strokeStyle = 'rgba(150, 240, 180, 0.95)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px - 9, py); ctx.lineTo(px - 2, py + 8); ctx.lineTo(px + 10, py - 9);
        ctx.stroke();
      } else {
        const r = 14 + pulse * 6;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 120, ${0.12 + pulse * 0.18})`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255, 220, 120, ${0.5 + pulse * 0.4})`;
        ctx.stroke();
      }
    }

    // —— 3) 底部拖动范围指示条 ——
    if (widthRatio > 1.001) {
      const barW = W * 0.5;
      const barX = (W - barW) / 2;
      const barY = H - 26;
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(barX, barY, barW, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const handleW = barW / widthRatio;
      const handleX = barX + offset * (barW - handleW);
      ctx.fillRect(handleX, barY - 3, handleW, 10);
    }
  }

  /**
   * 阶段4：渲染枢纽背景。
   * 把背景图 cover 铺满画布，叠加暗色渐变遮罩（让 DOM 覆盖层上的节点文字清晰可读）。
   */
  renderHubBg(bgImage: HTMLImageElement): void {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    ctx.clearRect(0, 0, W, H);
    if (bgImage.width > 0 && bgImage.height > 0) {
      this.drawImageCover(ctx, bgImage, 1);
    } else {
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, W, H);
    }
    // 暗色渐变遮罩（上深下更深，中心略亮，聚焦节点网格）
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(6, 9, 16, 0.78)');
    g.addColorStop(0.5, 'rgba(6, 9, 16, 0.62)');
    g.addColorStop(1, 'rgba(6, 9, 16, 0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /** 清空画布为指定纯色（枢纽无背景图时兜底） */
  clearToColor(color: string): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /** 渲染首页背景（带暗色遮罩） */
  renderTitleBackground(image: HTMLImageElement | null): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (image) {
      this.drawImageCover(ctx, image, 1);
      // 添加暗色遮罩，让文字更清晰
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // 默认深色背景
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#0f0f2e');
      grad.addColorStop(0.5, '#1a1a3e');
      grad.addColorStop(1, '#0d0d25');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // 装饰性星星/粒子
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 173 + 71) % this.width;
        const sy = (i * 97 + 37) % this.height;
        const sr = (i % 3) + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ========== 视频过场（全屏 DOM <video> 覆盖播放） ==========
  private videoEl: HTMLVideoElement | null = null;
  private videoOnEnd: (() => void) | null = null;
  private videoEnded: boolean = false;

  // ========== 物件弹出（全屏 DOM 覆盖，展示证物/信件等放大图） ==========
  private itemEl: HTMLDivElement | null = null;
  private itemOnClose: (() => void) | null = null;
  private itemClosed: boolean = false;

  /**
   * 全屏播放一段视频过场。播放结束（或用户点击跳过/出错）时回调 onEnd。
   * 视频覆盖在画布之上，object-fit: contain 居中，背景黑边。
   */
  playVideo(url: string, onEnd: () => void): void {
    this.stopVideo(); // 清理任何残留
    const container = this.canvas.parentElement;
    if (!container) {
      console.warn('视频容器缺失，跳过视频播放');
      onEnd();
      return;
    }
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.controls = false;
    video.muted = false;
    video.playsInline = true;
    video.style.position = 'absolute';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = '#000';
    video.style.zIndex = '50';
    video.style.cursor = 'pointer';

    this.videoEnded = false;
    this.videoOnEnd = onEnd;

    const finish = () => {
      if (this.videoEnded) return;
      this.videoEnded = true;
      const cb = this.videoOnEnd;
      this.videoOnEnd = null;
      cb?.();
    };

    video.addEventListener('ended', finish);
    video.addEventListener('error', () => {
      console.warn(`视频加载失败（将跳过）: ${url}`);
      finish();
    });
    // 点击视频 = 跳过过场（stopPropagation 防止冒泡到游戏点击处理器，误跳过后续对话）
    video.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.stopVideo();
    });

    container.appendChild(video);
    this.videoEl = video;
    video.play().catch(err => {
      console.warn(`视频自动播放被拦截: ${url}`, err);
      // 浏览器自动播放策略可能阻止，不阻塞游戏：直接结束
      finish();
    });
  }

  /** 停止并移除当前视频（点击跳过时触发，内部会回调 onEnd） */
  stopVideo(): void {
    if (!this.videoEl) return;
    const el = this.videoEl;
    this.videoEl = null;
    try {
      el.pause();
      el.removeAttribute('src');
      el.load();
    } catch { /* ignore */ }
    el.remove();
    // 触发结束回调（stopVideo 本身由点击事件同步调用，这里完成恢复）
    if (!this.videoEnded && this.videoOnEnd) {
      this.videoEnded = true;
      const cb = this.videoOnEnd;
      this.videoOnEnd = null;
      cb?.();
    }
  }

  /** 当前是否有视频在播放（供 game-engine 判断跳过） */
  isVideoPlaying(): boolean {
    return this.videoEl !== null;
  }

  // ========== 物件弹出（全屏 DOM 覆盖，展示证物/信件等放大图） ==========
  /**
   * 弹出一张物件放大图（证物 / 信件 / 照片等）。玩家点击遮罩任意处关闭。
   * 关闭时回调 onClose，由 game-engine 恢复脚本循环。
   */
  showItem(url: string, caption: string | undefined, onClose: () => void): void {
    this.hideItem(); // 清理任何残留
    const container = this.canvas.parentElement;
    if (!container) {
      console.warn('物件容器缺失，跳过弹出');
      onClose();
      return;
    }

    this.itemClosed = false;
    this.itemOnClose = onClose;

    const overlay = document.createElement('div');
    overlay.className = 'avg-item-overlay';

    const frame = document.createElement('div');
    frame.className = 'avg-item-frame';

    const img = document.createElement('img');
    img.className = 'avg-item-img';
    img.src = url;
    img.alt = caption || '物件';
    img.addEventListener('error', () => {
      // 404 容错：不阻断游戏，显示占位提示，玩家仍可点击关闭
      console.warn(`物件图片加载失败（仍可关闭）: ${url}`);
      img.style.display = 'none';
      const note = document.createElement('div');
      note.className = 'avg-item-missing';
      note.textContent = '（物件图片缺失）';
      frame.insertBefore(note, img.nextSibling);
    });

    frame.appendChild(img);

    if (caption) {
      const cap = document.createElement('div');
      cap.className = 'avg-item-caption';
      cap.textContent = caption;
      frame.appendChild(cap);
    }

    const hint = document.createElement('div');
    hint.className = 'avg-item-hint';
    hint.textContent = '点击任意处关闭';
    frame.appendChild(hint);

    overlay.appendChild(frame);

    // 点击遮罩任意处 = 关闭（阻止冒泡到游戏点击，避免误跳过后续对话）
    overlay.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.hideItem();
    });

    container.appendChild(overlay);
    this.itemEl = overlay;
  }

  /** 关闭并移除当前物件弹窗（点击关闭时触发，内部会回调 onClose） */
  hideItem(): void {
    if (!this.itemEl) return;
    const el = this.itemEl;
    this.itemEl = null;
    try {
      el.remove();
    } catch { /* ignore */ }
    // 触发结束回调（hideItem 本身由点击事件同步调用，这里完成恢复）
    if (!this.itemClosed && this.itemOnClose) {
      this.itemClosed = true;
      const cb = this.itemOnClose;
      this.itemOnClose = null;
      cb?.();
    }
  }

  /** 当前是否有物件弹窗在显示（供 game-engine 判断） */
  isItemOpen(): boolean {
    return this.itemEl !== null;
  }

  /** 销毁 */
  dispose(): void {
    this.stopVideo();
    this.hideItem();
    this.animPlayer.dispose();
    this.particles.dispose();
    window.removeEventListener('resize', () => this.resize());
  }
}
