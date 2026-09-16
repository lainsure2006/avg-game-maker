/**
 * 《樱色未央》story3 - 缺失图片占位图生成器
 *
 * 当某个背景图文件不存在时，自动生成彩色占位图（渐变 + 文字），
 * 避免引擎渲染出空白/破图。音频缺失不在此处理（由 manifest.audio 留空 + 引擎静默跳过）。
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

/** 占位图定义（仅对确实缺文件的键生成） */
// NOTE: cafe / ending_good / ending_normal 已补全为实图（2026-08-25），不再需要占位。
const PLACEHOLDERS: Record<string, string> = {};

/** 明确不存在的背景键（manifest 中注册了但文件缺失） */
const MISSING_KEYS = new Set<string>();

/**
 * 对 manifest 中缺失的背景图路径替换为占位图 data URL，其余保持不变。
 */
export function fillYingsePlaceholders(manifest: AssetManifest): AssetManifest {
  const result: AssetManifest = {
    backgrounds: {},
    sprites: {},
    animations: { ...manifest.animations },
    audio: { ...manifest.audio },
  };

  for (const [key, url] of Object.entries(manifest.backgrounds)) {
    if (MISSING_KEYS.has(key)) {
      result.backgrounds[key] = PLACEHOLDERS[key] || url;
      console.log(`[placeholder] 背景 "${key}" → 占位图（文件缺失）`);
    } else {
      result.backgrounds[key] = url;
    }
  }

  for (const [charId, poses] of Object.entries(manifest.sprites)) {
    result.sprites[charId] = { ...poses };
  }

  return result;
}
