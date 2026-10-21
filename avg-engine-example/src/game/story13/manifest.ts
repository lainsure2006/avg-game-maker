/**
 * NG+ 功能测试剧本的资源清单。
 * 直接复用《缄默回廊》story5 的真实资源（背景/立绘/音频均已落位），
 * 仅用于验证多周目（NG+）引擎功能：通关后进入二周目、好感跨周目携带、隐藏选项门控。
 * 验证完成后此 story13 会被删除（不随版本上传）。
 */
import type { AssetManifest } from '../../engine/types';
import { manifest as s5 } from '../story5/manifest';

export const manifest: AssetManifest = s5;
