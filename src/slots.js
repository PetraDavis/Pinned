// The save-slot screen: Load, New Game and (for a multiplayer host) Host, over the five slots.
// Each slot shows its name, where you are, moths found, time played and when it was saved,
// with Rename and Delete.
import { listSlots, renameSlot, deleteSlot } from './storage.js';

const PLACES = {
  grounds: ['The grounds', ''], room: ['Ground floor', 'Drawing room'], hallway: ['Ground floor', 'Hallway'], grandhall: ['Ground floor', 'Grand Hall'],
  study: ['Ground floor', 'Specimen Study'], dining: ['Ground floor', 'Dining room'], kitchen: ['Ground floor', 'Kitchen'], cellar: ['Cellar', ''],
  firstfloor: ['First floor', ''], leader: ['First floor', 'Leader’s bedroom'], catacombs: ['Catacombs', ''], chapel: ['Catacombs', 'Chapel'],
  attic: ['Attic', 'Landing'], atticRack: ['Attic', 'Landing'], atticEggs: ['Attic', 'Egg Store'], atticBox: ['Attic', 'Clock Room'],
  atticClock: ['Attic', 'Clock Room'], chamber: ['Attic', 'Her chamber'], escape: ['Escape', ''],
};
export const placeOf = cp => { const p = PLACES[cp]; return p ? (p[1] ? `${p[0]} · ${p[1]}` : p[0]) : cp ? String(cp) : 'The grounds'; };
const hms = s => { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h} h ${m} min` : `${m} min`; };
const when = t => { if (!t) return ''; try { return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

// open(mode, onPick): mode 'load' | 'new' | 'host'; onPick(slot, hasSave) when a slot is chosen
export function createSlotScreen() {
  const el = document.createElement('div'); el.id = 'slots'; el.className = 'screen dim hidden'; el.style.zIndex = 60;
  el.innerHTML = `<div class="menu" style="width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto">
    <h2 class="sl-title"></h2><p class="note sl-note"></p><div class="sl-list" style="display:flex;flex-direction:column;gap:8px"></div>
    <button class="sl-back">Back</button></div>`;
  document.body.appendChild(el);
  const list = el.querySelector('.sl-list'), title = el.querySelector('.sl-title'), note = el.querySelector('.sl-note');
  let mode = 'load', onPick = null;
  const TITLES = { load: ['Load a game', 'Choose a save to carry on from.'], new: ['New game', 'Choose a slot. An empty one, or overwrite an old save.'], host: ['Host a game', 'Host from a save, or start a new game in an empty slot. Progress saves to that slot; guests do not save.'] };
  function render() {
    [title.textContent, note.textContent] = TITLES[mode];
    list.innerHTML = '';
    for (const { slot, save } of listSlots()) {
      const row = document.createElement('div'); row.className = 'sl-row';
      row.style.cssText = 'text-align:left;border:1px solid rgba(216,200,160,.25);padding:8px 10px;border-radius:4px;display:flex;flex-direction:column;gap:6px';
      const info = document.createElement('div');
      if (save) {
        info.innerHTML = '<b></b><div class="note" style="margin:2px 0 0"></div>';
        info.querySelector('b').textContent = `${slot}. ${save.name || `Save ${slot}`}`;
        info.querySelector('div').textContent = `${placeOf(save.checkpoint)} · ${(save.moths || []).length} moths · ${hms(save.playtime)} played${save.time ? ` · ${when(save.time)}` : ''}`;
      } else info.innerHTML = `<b>${slot}. Empty</b>`;
      row.appendChild(info);
      const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap'; row.appendChild(btns);
      const b = (label, fn) => { const x = document.createElement('button'); x.textContent = label; x.style.flex = '1 1 auto'; x.onclick = fn; btns.appendChild(x); return x; };
      const pick = () => { close(); onPick && onPick(slot, !!save); };
      if (mode === 'load' && save) b('Load', pick);
      if (mode === 'new') { const x = b(save ? 'Overwrite' : 'Start here', () => { if (save && x.dataset.sure !== '1') { x.dataset.sure = '1'; x.textContent = 'Overwrite? Click again'; return; } deleteSlot(slot); pick(); }); }
      if (mode === 'host') b(save ? 'Host from this save' : 'Host a new game here', pick);
      if (save) {
        b('Rename', () => {
          btns.style.display = 'none';
          const f = document.createElement('div'); f.style.cssText = 'display:flex;gap:6px';
          const inp = document.createElement('input'); inp.value = save.name || `Save ${slot}`; inp.maxLength = 32; inp.style.flex = '1';
          const ok = document.createElement('button'); ok.textContent = 'OK';
          const done = () => { renameSlot(slot, inp.value.trim()); render(); };
          ok.onclick = done; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') done(); if (e.key === 'Escape') render(); };
          f.append(inp, ok); row.appendChild(f); inp.focus(); inp.select();
        });
        const d = b('Delete', () => { if (d.dataset.sure !== '1') { d.dataset.sure = '1'; d.textContent = 'Delete? Click again'; return; } deleteSlot(slot); render(); });
      }
      list.appendChild(row);
    }
  }
  function open(m, cb) { mode = m; onPick = cb; render(); el.classList.remove('hidden'); }
  function close() { el.classList.add('hidden'); }
  el.querySelector('.sl-back').onclick = close;
  addEventListener('keydown', e => { if (e.code === 'Escape' && !el.classList.contains('hidden')) { e.stopImmediatePropagation(); close(); } }, true);
  return { open, close, get isOpen() { return !el.classList.contains('hidden'); } };
}
