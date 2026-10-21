/**
 * AVG Engine - 粒子系统（阶段1：樱花/雨/雪/散景）
 * 纯 Canvas2D 实现，由 Renderer 在每帧 update(dt) 驱动、render() 时绘制于最上层。
 * 无需任何图像/音频模型，零外部依赖。
 */

import type { WeatherType } from './types';

interface Particle {
  type: WeatherType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  alpha: number;
  sway: number;        // 水平摇摆幅度（px/s 等效）
  swayPhase: number;
  color: string;
  life: number;        // 剩余寿命（bokeh 用）
  maxLife: number;
}

const PETAL_COLORS = ['#ffd9e8', '#ffc2d8', '#ffe6f0', '#ffb8d4', '#fff0f6', '#ffcadc'];
const BOKEH_COLORS = ['#fff3c4', '#ffd9a8', '#ffe0b0', '#fff0d0', '#ffe8b8'];

export class ParticleSystem {
  private parts: Particle[] = [];
  private weather: WeatherType = 'none';
  private intensity = 1;
  private w = 1280;
  private h = 720;
  private acc = 0;
  private readonly maxParts = 560;

  /** 画布尺寸变化（resize 时调用） */
  setSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** 设置当前环境天气；切换时清空旧粒子，按强度预填充一批 */
  setWeather(type: WeatherType, intensity = 1): void {
    if (type === this.weather) {
      this.intensity = intensity;
      return;
    }
    this.weather = type;
    this.intensity = intensity;
    this.parts = [];
    this.acc = 0;
    if (type !== 'none') {
      const pre: Record<WeatherType, number> = { none: 0, petal: 34, rain: 90, snow: 34, bokeh: 7 };
      const n = pre[type] || 0;
      for (let i = 0; i < n; i++) this.spawn(type, true);
    }
  }

  /** 一次性爆发（保留当前天气类型，仅补充若干粒子） */
  burst(type: WeatherType, count: number): void {
    for (let i = 0; i < count; i++) this.spawn(type, false);
  }

  private rand(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  private pick(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private spawn(type: WeatherType, initial: boolean): void {
    if (this.parts.length >= this.maxParts) return;
    const w = this.w;
    const h = this.h;
    if (type === 'petal') {
      this.parts.push({
        type, x: this.rand(0, w), y: initial ? this.rand(-h, 0) : -12,
        vx: this.rand(-14, 14), vy: this.rand(26, 54),
        size: this.rand(7, 13), rot: this.rand(0, Math.PI * 2), vrot: this.rand(-1.6, 1.6),
        alpha: this.rand(0.6, 0.95), sway: this.rand(18, 44), swayPhase: this.rand(0, Math.PI * 2),
        color: this.pick(PETAL_COLORS), life: 0, maxLife: 0,
      });
    } else if (type === 'rain') {
      this.parts.push({
        type, x: this.rand(-50, w + 50), y: initial ? this.rand(-h, 0) : -24,
        vx: this.rand(-34, -14), vy: this.rand(640, 840),
        size: this.rand(1.1, 2.3), rot: 0, vrot: 0,
        alpha: this.rand(0.16, 0.4), sway: 0, swayPhase: 0,
        color: '#bcd4ff', life: 0, maxLife: 0,
      });
    } else if (type === 'snow') {
      this.parts.push({
        type, x: this.rand(0, w), y: initial ? this.rand(-h, 0) : -12,
        vx: this.rand(-9, 9), vy: this.rand(22, 46),
        size: this.rand(1, 2.6), rot: 0, vrot: 0,
        alpha: this.rand(0.45, 0.85), sway: this.rand(14, 32), swayPhase: this.rand(0, Math.PI * 2),
        color: '#ffffff', life: 0, maxLife: 0,
      });
    } else if (type === 'bokeh') {
      const ml = this.rand(4.5, 9.5);
      this.parts.push({
        type, x: this.rand(0, w), y: this.rand(0, h),
        vx: this.rand(-9, 9), vy: this.rand(-12, 12),
        size: this.rand(42, 130), rot: 0, vrot: 0,
        alpha: 0, sway: this.rand(8, 20), swayPhase: this.rand(0, Math.PI * 2),
        color: this.pick(BOKEH_COLORS), life: ml, maxLife: ml,
      });
    }
  }

  /** 每帧更新 */
  update(dt: number): void {
    const w = this.w;
    const h = this.h;

    // 环境天气持续生成
    if (this.weather !== 'none') {
      const rates: Record<WeatherType, number> = { none: 0, petal: 24, rain: 95, snow: 28, bokeh: 4 };
      this.acc += (rates[this.weather] || 0) * this.intensity * dt;
      while (this.acc >= 1) {
        this.acc -= 1;
        this.spawn(this.weather, false);
      }
    }

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];

      if (p.type === 'bokeh') {
        p.life -= dt;
        const t = p.maxLife > 0 ? p.life / p.maxLife : 0; // 1 -> 0
        p.alpha = Math.sin(Math.max(0, t) * Math.PI) * 0.11; // 淡入淡出，峰值 ~0.11
        if (p.life <= 0) {
          this.parts.splice(i, 1);
          continue;
        }
      }

      p.swayPhase += dt * 1.2;
      const swayX = p.type === 'rain' ? 0 : Math.sin(p.swayPhase) * p.sway;
      p.x += (p.vx + swayX) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      // 出界剔除（环境天气由生成器自动补足，无需重生）
      if (p.y > h + 40 || p.x < -100 || p.x > w + 100) {
        this.parts.splice(i, 1);
      }
    }
  }

  /** 绘制（在 render() 最上层调用，ctx 已处于游戏坐标系） */
  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      if (p.type === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const L = p.vy * 0.03;
        ctx.lineTo(p.x - p.vx * 0.03, p.y - L);
        ctx.stroke();
      } else if (p.type === 'snow') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bokeh') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'petal') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.52, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /** 销毁 */
  dispose(): void {
    this.parts = [];
  }
}
