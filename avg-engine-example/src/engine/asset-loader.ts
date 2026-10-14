/**
 * AVG Engine - 资源加载器
 * 管理背景图、角色立绘、音频等资源的预加载
 */

import type { AssetManifest } from './types';

export class AssetLoader {
  private images: Map<string, HTMLImageElement> = new Map();
  private audioBuffers: Map<string, ArrayBuffer> = new Map();
  private audioContext: AudioContext | null = null;

  /** 根据 manifest 加载所有资源 */
  async loadManifest(manifest: AssetManifest, onProgress?: (pct: number) => void): Promise<void> {
    const urls: string[] = [];

    // 收集所有背景图
    for (const url of Object.values(manifest.backgrounds)) {
      urls.push(url);
    }
    // 收集所有角色立绘
    for (const spriteSet of Object.values(manifest.sprites)) {
      for (const url of Object.values(spriteSet)) {
        urls.push(url);
      }
    }
    // 收集所有序列帧动画
    for (const anim of Object.values(manifest.animations)) {
      for (const frameUrl of anim.frames) {
        urls.push(frameUrl);
      }
    }
    // 收集所有音频
    for (const url of Object.values(manifest.audio)) {
      urls.push(url);
    }
    // 收集所有视差层（阶段6·视差）
    for (const def of Object.values(manifest.parallax ?? {})) {
      for (const url of def.layers) {
        urls.push(url);
      }
    }

    let loaded = 0;
    const total = urls.length;

    // 并行加载图片
    const imageUrls = urls.filter(u => /\.(png|jpe?g|gif|webp|svg)$/i.test(u));
    const audioUrls = urls.filter(u => /\.(mp3|ogg|wav|m4a)$/i.test(u));

    await Promise.all([
      ...imageUrls.map(async url => {
        const img = await this.loadImage(url);
        this.images.set(url, img);
        loaded++;
        onProgress?.(loaded / total);
      }),
      ...audioUrls.map(async url => {
        const buffer = await this.loadAudio(url);
        this.audioBuffers.set(url, buffer);
        loaded++;
        onProgress?.(loaded / total);
      }),
    ]);
  }

  /** 加载单张图片 */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        // data URL 加载失败时重试（可能是占位图）
        if (url.startsWith('data:')) {
          console.warn(`占位图加载失败: ${url.slice(0, 50)}...`);
          // 创建一个最小图片
          const fallback = new Image();
          // 什么都不画，返回空图片
          resolve(img);
        } else {
          console.warn(`图片加载失败（将跳过）: ${url}`);
          // 不阻塞流程，resolve 一个空图片
          resolve(img);
        }
      };
      img.src = url;
    });
  }

  /** 加载音频 */
  private async loadAudio(url: string): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`音频加载失败: ${url}`);
    return resp.arrayBuffer();
  }

  /** 获取已加载的图片 */
  getImage(url: string): HTMLImageElement | undefined {
    return this.images.get(url);
  }

  /**
   * 阶段6·眨眼：按需加载单张图片（带缓存）。
   * 用于按命名约定加载「闭眼覆盖层」等非清单资源；文件缺失时静默返回 undefined，不阻塞流程。
   */
  async ensureImage(url: string): Promise<HTMLImageElement | undefined> {
    const cached = this.images.get(url);
    if (cached) return cached;
    try {
      const img = await this.loadImageStrict(url);
      this.images.set(url, img);
      return img;
    } catch {
      return undefined;
    }
  }

  /** 严格加载（失败 reject），供 ensureImage 判定资源是否存在 */
  private loadImageStrict(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`图片不存在: ${url}`));
      img.src = url;
    });
  }

  /** 获取已加载的音频 buffer */
  getAudioBuffer(url: string): ArrayBuffer | undefined {
    return this.audioBuffers.get(url);
  }

  /** 获取 AudioContext */
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /** 释放资源 */
  dispose(): void {
    this.images.clear();
    this.audioBuffers.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
