// Settings and save data in localStorage (wrapped: storage can be unavailable).
const SKEY = 'pinned.settings', VKEY = 'pinned.save';
export const DEFAULTS = { sensitivity: 1, volume: 0.6, brightness: 1, fov: 72, quality: 'high' };

// In-memory copy so settings and saves keep working for this session even when
// localStorage is blocked or throws (private windows, sandboxed frames).
const memory = {};
function read(k) {
  try { const v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch { /* fall back */ }
  return k in memory ? JSON.parse(memory[k]) : null;
}
function write(k, v) {
  if (v == null) delete memory[k]; else memory[k] = JSON.stringify(v);
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, memory[k]); } catch { /* memory only */ }
}

export const loadSettings = () => ({ ...DEFAULTS, ...(read(SKEY) || {}) });
export const saveSettings = s => write(SKEY, s);
export const loadSave = () => read(VKEY);
export const writeSave = s => write(VKEY, { ...s, time: Date.now() });
export const clearSave = () => write(VKEY, null);
