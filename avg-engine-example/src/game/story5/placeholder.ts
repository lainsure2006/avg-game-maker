/**
 * 《缄默回廊》story5 - 缺失图片占位图生成器
 *
 * 图片侧（23 背景/CG + 7 立绘 + 6 SE）已 100% 落位，故 PLACEHOLDERS / MISSING_KEYS 为空。
 * 保留此文件是为：① story.ts 的 getManifest 接口需要；② 将来替换素材时可兜底。
 *
 * ⚠️ 物件 6 未产：不在此处理（manifest.items 已登记，但 src 文件缺失），
 *   由引擎 renderer 显示「物件图片缺失」内联占位（可关闭），不崩、不抛错。
 * ⚠️ BGM 6 全缺：manifest.audio 不登记，剧本 bgm 指令为无害 no-op。
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

/** 占位图定义（当前为空 —— 背景/CG/立绘 100% 落位） */
const PLACEHOLDERS: Record<string, string> = {};

/** 明确不存在的背景键（manifest 中注册了但文件缺失） */
const MISSING_KEYS = new Set<string>();

/**
 * 对 manifest 中缺失的背景图路径替换为占位图 data URL，其余保持不变。
 */
export function fillPlaceholders(manifest: AssetManifest): AssetManifest {
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
  if (manifest.items) {
    result.items = { ...manifest.items };
  }
  return result;
}
