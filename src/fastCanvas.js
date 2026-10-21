// Slow devices: every texture in the game is painted on a 2D canvas at load. Browsers put
// those canvases on the GPU, and then each read back (grain, normal maps, mosaics) and each
// upload into WebGL waits on the GPU. On the Low and Extra Low settings the generated
// (off-page) canvases are kept in ordinary memory instead (willReadFrequently), which on weak
// GPUs makes the load several times faster. Imported first, before anything paints.
import { detectCaps } from './caps.js';
let mode = null;
try { const s = JSON.parse(localStorage.getItem('pinned.settings') || '{}'); mode = s.qualityChosen ? s.quality : null; } catch { /* default */ }
if (!mode) mode = detectCaps().defaultQuality; // first run: the quality main.js is about to pick
export const CPU_CANVAS = mode === 'low' || mode === 'xlow';
if (CPU_CANVAS && typeof HTMLCanvasElement !== 'undefined') {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    if (type === '2d' && !this.isConnected) opts = { ...(opts || {}), willReadFrequently: true };
    return orig.call(this, type, opts);
  };
}
