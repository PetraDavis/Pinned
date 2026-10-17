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
// ---------- save slots ----------
// Five named slots ('pinned.save.1'..5). Everything that saves (checkpoints, autosave) writes to
// the active slot through the same loadSave / writeSave / clearSave as before.
export const SLOTS = 5;
const AKEY = 'pinned.activeSlot', slotKey = n => `${VKEY}.${n}`;
// the old single save becomes slot 1
{ const old = read(VKEY); if (old && !read(slotKey(1))) { write(slotKey(1), { name: 'Save 1', ...old }); } if (old) write(VKEY, null); }
let active = Math.min(SLOTS, Math.max(1, +read(AKEY) || 1));
let playSource = () => 0; // seconds played since the slot was loaded, from main.js
let playBase = 0;
export const activeSlot = () => active;
export function setActiveSlot(n) { active = n; write(AKEY, n); const s = read(slotKey(n)); playBase = (s && s.playtime) || 0; }
export const setPlaytimeSource = fn => { playSource = fn; };
export const readSlot = n => read(slotKey(n));
export const listSlots = () => Array.from({ length: SLOTS }, (_, i) => ({ slot: i + 1, save: read(slotKey(i + 1)) }));
export const latestSlot = () => { let best = 0, t = -1; for (const { slot, save } of listSlots()) if (save && (save.time || 0) > t) { t = save.time || 0; best = slot; } return best; };
export function renameSlot(n, name) { const s = read(slotKey(n)); if (s) write(slotKey(n), { ...s, name: String(name).slice(0, 32) || `Save ${n}` }); }
export const deleteSlot = n => write(slotKey(n), null);

export const loadSave = () => read(slotKey(active));
export const writeSave = s => { const prev = read(slotKey(active)); write(slotKey(active), { ...s, name: (prev && prev.name) || `Save ${active}`, playtime: Math.round(playBase + playSource()), time: Date.now() }); };
export const clearSave = () => write(slotKey(active), null);

// ---------- the collection ----------
// Every moth ever picked up, in any slot: a global set that outlives deleted saves.
const EKEY = 'pinned.everMoths';
export function everMoths() {
  const s = new Set(read(EKEY) || []);
  for (const { save } of listSlots()) for (const id of (save && save.moths) || []) s.add(id);
  return s;
}
export function addEverMoth(id) { const s = everMoths(); s.add(id); write(EKEY, [...s]); }
