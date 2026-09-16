/**
 * 占位图生成器模板
 *
 * 如果你引用了不存在的图片，在此列出 key，
 * 引擎会自动生成彩色渐变占位图，避免加载失败。
 */
import type { AssetManifest } from '../../engine/types';

const createPlaceholder = (text: string, color: string, w: number, h: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const num = parseInt(color.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `${Math.min(w, h) * 0.07}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  return canvas.toDataURL('image/png');
};

// 占位图定义：key → data URL
const PLACEHOLDERS: Record<string, string> = {
  // 示例：'my_bg': createPlaceholder('我的背景', '#4a6fa5', 1280, 720),
};

// 标记为缺失的 key（会被替换为占位图）
const MISSING_KEYS = new Set<string>([
  // 'my_bg',
]);

export function fillPlaceholders(manifest: AssetManifest): AssetManifest {
  const result: AssetManifest = {
    backgrounds: {},
    sprites: {},
    animations: { ...manifest.animations },
    audio: { ...manifest.audio },
  };

  for (const [key, url] of Object.entries(manifest.backgrounds)) {
    result.backgrounds[key] = MISSING_KEYS.has(key) ? (PLACEHOLDERS[key] || url) : url;
  }

  for (const [charId, poses] of Object.entries(manifest.sprites)) {
    result.sprites[charId] = {};
    for (const [poseId, url] of Object.entries(poses)) {
      result.sprites[charId][poseId] = url;
    }
  }

  return result;
}
