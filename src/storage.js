// Settings and save data in localStorage (wrapped: storage can be unavailable).
const SKEY = 'pinned.settings', VKEY = 'pinned.save';
export const DEFAULTS = { sensitivity: 1, volume: 0.6, brightness: 1, fov: 72 };

function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function write(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

export const loadSettings = () => ({ ...DEFAULTS, ...(read(SKEY) || {}) });
export const saveSettings = s => write(SKEY, s);
export const loadSave = () => read(VKEY);
export const writeSave = s => write(VKEY, { ...s, time: Date.now() });
export const clearSave = () => write(VKEY, null);
