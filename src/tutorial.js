// A short, quiet tutorial in the drawing room (the first room, behind the broken window).
// Prompts appear one at a time as captions and fade the moment the player does the thing.
// A step already done is skipped; a step done once never comes back (localStorage + save).
// Purely local: in multiplayer every player sees their own prompts. Never touches puzzles.
import { caption, dismissCaption } from './captions.js';

const KEY = 'pinned.tutorial';
// the drawing room in world space (firstRoom.js: origin x 1000, 14 x 10)
const inDrawingRoom = p => Math.abs(p.x - 1000) < 7 && Math.abs(p.z) < 5;

export const STEPS = [
  { id: 'move', text: 'Mouse to look. W A S D to move. Slowly, now.' },
  { id: 'lamp', text: 'The oil lamp on the side table. E to light it.' },
  { id: 'torch', text: 'F for the torch. B spends its battery in one bright burst.' },
  { id: 'crouch', text: 'C, or Ctrl, to crouch. Quieter, and lower.' },
  { id: 'hide', text: 'She hunts by light and by sight. If she comes, crawl under a cot (E) and keep still.', info: 14 },
  { id: 'run', text: 'Shift to run. Space to jump. She will hear you running.' },
  { id: 'moths', text: 'Pinned moths are hidden in the house. E to take one.', info: 10 },
  { id: 'hint', text: 'Lost? H, and the house may whisper a hint.', info: 10 },
  { id: 'pause', text: 'Esc to pause, and to read your journal.', info: 12 },
];

export function createTutorial(G) {
  // G: { enabled(), player, zone(), state(), lampOn(), torchOn(), hidden(), moths(), mpClient() }
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  let cur = null, shown = 0, gap = 1.5, used = {};
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch {} };
  const finish = id => {
    if (done[id]) return; done[id] = 1; persist();
    if (cur && cur.id === id) { dismissCaption(cur.text); cur = null; gap = 2.5; }
  };
  let moths0 = null;
  const pressed = c => (used[c] = 1);
  addEventListener('keydown', e => { if (!e.repeat) pressed(e.code); });

  const check = {
    move: () => G.player.moving,
    lamp: () => G.lampOn(),
    torch: () => G.torchOn() || used.KeyB,
    crouch: () => G.player.crouching,
    hide: () => G.hidden(),
    run: () => (G.player.moving && (G.player.keys.ShiftLeft || G.player.keys.ShiftRight)) || used.Space,
    moths: () => moths0 != null && G.moths() > moths0,
    hint: () => used.KeyH,
    pause: () => G.state() === 'paused',
  };

  return {
    // finished steps, for the save file
    state: () => ({ ...done }),
    merge(s) { if (s && typeof s === 'object') { Object.assign(done, s); persist(); } },
    tick(dt) {
      const st = G.state();
      if (st === 'paused' && cur && cur.id === 'pause') finish('pause');
      if (st !== 'playing') return;
      if (moths0 == null) moths0 = G.moths();
      // anything done at any time counts, even before its prompt
      for (const s of STEPS) if (!done[s.id] && check[s.id]()) finish(s.id);
      const here = G.enabled() && G.zone() === 'room' && inDrawingRoom(G.player.pos);
      if (!here) { if (cur) { dismissCaption(cur.text); cur = null; gap = 1; } return; }
      if (cur) {
        shown += dt;
        if (cur.info && shown > cur.info) { finish(cur.id); return; } // informational: shown once is enough
        caption(cur.text, 3, { force: true }); // keep it lit while waiting
        return;
      }
      if ((gap -= dt) > 0) return;
      cur = STEPS.find(s => !done[s.id]) || null; shown = 0;
      if (cur) caption(cur.text, 3, { force: true });
    },
    reset() { done = {}; persist(); },
  };
}
