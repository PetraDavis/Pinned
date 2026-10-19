// Touchscreen controls for phones and tablets. Only built on touch devices
// (pointer: coarse, or ontouchstart). Pointer lock is not used on touch.
// Left half: a virtual joystick. Right half: drag to look, or tap an object to use it.
// Buttons: E (interact / hide), toggles for sprint, crouch, torch and lantern, plus a small
// torch burst, Q when a prompt offers it, and chat / talk / mute in multiplayer.
// Hint, Moth Journal and photo mode are in the pause menu (the II button).
// Buttons send the same key codes as the keyboard, so every system (hiding, tutorial,
// multiplayer chat, the Mother's crawl-out) hears them exactly as it would a key.
export const IS_TOUCH = (() => {
  try { return (matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window || navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches; } catch { return 'ontouchstart' in window; }
})();

const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key/, '').toLowerCase(), bubbles: true }));
const tap = code => { key('keydown', code); key('keyup', code); };

export function initTouch(G) {
  if (!IS_TOUCH) return null;
  document.documentElement.classList.add('touch');
  const $ = id => document.getElementById(id);
  const root = document.createElement('div'); root.id = 'touch'; root.className = 'hidden';
  root.innerHTML = `
    <div class="t-zone t-left"></div><div class="t-zone t-right"></div>
    <div class="t-stick hidden"><div class="t-knob"></div></div>
    <div class="t-btns t-main">
      <button data-k="KeyE" class="t-big" aria-label="Interact or hide">E</button>
      <button data-k="KeyQ" class="t-q hidden" aria-label="Alternative action">Q</button>
      <button data-sprint aria-label="Sprint (toggle)">Sprint</button>
      <button data-crouch aria-label="Crouch (toggle)">Crouch</button>
      <button data-k="KeyF" class="t-torch" aria-label="Torch on or off">Torch</button>
      <button data-k="KeyL" class="t-lamp hidden" aria-label="Raise or lower the lantern">Lantern</button>
      <button data-k="KeyB" class="t-small" aria-label="Torch burst">Burst</button>
    </div>
    <div class="t-btns t-top">
      <button data-k="KeyT" class="t-mp hidden" aria-label="Chat">Chat</button>
      <button data-hold="KeyV" class="t-mp t-ptt hidden" aria-label="Push to talk">Talk</button>
      <button data-k="KeyM" class="t-mp hidden" aria-label="Mute microphone">Mute</button>
    </div>`;
  document.body.appendChild(root);
  const q = s => root.querySelector(s);
  const P = G.player;

  // ---- buttons ----
  let crouchDown = false;
  for (const b of root.querySelectorAll('button')) {
    b.addEventListener('contextmenu', e => e.preventDefault());
    if (b.dataset.k) b.addEventListener('pointerdown', e => { e.preventDefault(); tap(b.dataset.k); });
    if (b.dataset.hold) {
      b.addEventListener('pointerdown', e => { e.preventDefault(); key('keydown', b.dataset.hold); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => key('keyup', b.dataset.hold));
    }
  }
  // crouch: always a toggle on touch (with "hold to crouch" set, the key is held down until the next tap)
  q('[data-crouch]').addEventListener('pointerdown', e => {
    e.preventDefault();
    if (P.crouchToggle) tap('KeyC');
    else { crouchDown = !crouchDown; key(crouchDown ? 'keydown' : 'keyup', 'KeyC'); }
  });
  // sprint: a toggle that keeps Shift held down
  let sprintOn = false;
  q('[data-sprint]').addEventListener('pointerdown', e => { e.preventDefault(); sprintOn = !sprintOn; key(sprintOn ? 'keydown' : 'keyup', 'ShiftLeft'); });
  // the chat field gets focus from the tap itself so the on-screen keyboard opens
  q('[data-k="KeyT"]').addEventListener('click', () => { const i = $('mpChatInput'); if (i && G.mp && G.mp.chatOpen) i.focus(); });

  // ---- joystick (left) and look (right) ----
  const stick = q('.t-stick'), knob = q('.t-knob'), R = 56;
  let mv = null, look = null;
  const held = new Set();
  function setKeys(want) {
    for (const c of held) if (!want.has(c)) { held.delete(c); key('keyup', c); }
    for (const c of want) if (!held.has(c)) { held.add(c); key('keydown', c); }
  }
  q('.t-left').addEventListener('pointerdown', e => {
    if (mv) return; e.preventDefault();
    mv = { id: e.pointerId, x: e.clientX, y: e.clientY };
    stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.classList.remove('hidden'); knob.style.transform = '';
  });
  q('.t-right').addEventListener('pointerdown', e => { if (look) return; e.preventDefault(); look = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() }; });
  addEventListener('pointermove', e => {
    if (mv && e.pointerId === mv.id) {
      let dx = e.clientX - mv.x, dy = e.clientY - mv.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const nx = dx / R, ny = dy / R, want = new Set(), dead = 0.3;
      if (ny < -dead) want.add('KeyW'); if (ny > dead) want.add('KeyS');
      if (nx < -dead) want.add('KeyA'); if (nx > dead) want.add('KeyD');
      setKeys(want);
    }
    if (look && e.pointerId === look.id) {
      const k = 0.0055 * (P.sensitivity || 1);
      if (P.enabled) {
        P.yaw -= (e.clientX - look.x) * k;
        P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - (e.clientY - look.y) * k));
      }
      look.x = e.clientX; look.y = e.clientY;
    }
  }, { passive: true });
  const end = e => {
    if (mv && e.pointerId === mv.id) { mv = null; stick.classList.add('hidden'); setKeys(new Set()); }
    if (look && e.pointerId === look.id) {
      // a quick tap without dragging: interact with whatever is under the finger
      if (performance.now() - look.t0 < 600 && Math.hypot(e.clientX - look.x0, e.clientY - look.y0) < 12 && G.state() === 'playing')
        G.tapInteract(look.x0 / innerWidth * 2 - 1, 1 - look.y0 / innerHeight * 2);
      look = null;
    }
  };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  // show the layer only during play, so taps go straight to menus otherwise
  function tick() {
    requestAnimationFrame(tick);
    try { update(); } catch (err) { console.warn('[touch]', err); }
  }
  function update() {
    const st = G.state(), mpOn = !!(G.mp && G.mp.active), chat = !!(G.mp && G.mp.chatOpen);
    const on = st === 'playing' && !chat;
    root.classList.toggle('hidden', !on);
    if (!on) { if (mv || held.size) { mv = null; stick.classList.add('hidden'); setKeys(new Set()); } look = null; }
    if (sprintOn && !P.keys.ShiftLeft && on) P.keys.ShiftLeft = true; // keys are cleared on blur / chat
    if (crouchDown && !P.keys.KeyC && on) P.keys.KeyC = true;
    for (const b of root.querySelectorAll('.t-mp')) b.classList.toggle('hidden', !mpOn);
    const pr = G.prompt() || '';
    q('.t-q').classList.toggle('hidden', !/(^|\s)Q\s/.test(pr));
    q('[data-k="KeyE"]').classList.toggle('lit', !!pr);
    q('[data-crouch]').classList.toggle('lit', !!P.crouching);
    q('[data-sprint]').classList.toggle('lit', sprintOn);
    q('.t-torch').classList.toggle('lit', !!G.flashlight.on);
    q('.t-lamp').classList.toggle('hidden', !G.lantern.have);
    q('.t-lamp').classList.toggle('lit', !!G.lantern.on);
  }
  tick();
  return { root };
}
