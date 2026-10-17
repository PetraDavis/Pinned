// End credits: a slow Victorian scroll over a dark ground, with a few moths drifting across,
// ending on a card with one moth pinned above its label. Plays after the ending (normal and
// secret) and from the home screen's Credits button. Esc or a click skips, after 2 s.
// Purely local DOM + 2D canvas, so in multiplayer each player sees it on their own screen.
import { drawMoth, drawLabel } from './moths.js';

const SKIP_AFTER = 2;     // seconds before Esc / click may skip
const SPEED = 38;         // scroll speed, px per second
const HOLD = 6;           // seconds the final card stays before returning
const DRIFTERS = ['luna', 'betularia', 'mori', 'infusa', 'caja'];

const LINES = `
  <div class="cr-title">PINNED</div>
  <div class="cr-rule">❦</div>
  <div class="cr-role">A game by</div><div class="cr-name">Petra Davis</div>
  <div class="cr-role">Built with</div><div class="cr-name">Claude</div>
  <div class="cr-role">Engine</div><div class="cr-name">three.js</div>
  <div class="cr-role">Sound</div><div class="cr-name">Generated with the Web Audio API</div>
  <div class="cr-small">Every footstep, flutter and creak is synthesised as you play; no recorded samples are used.</div>
  <div class="cr-role">Typeface</div><div class="cr-name">Cinzel Decorative</div>
  <div class="cr-small">by Natanael Gama, via Google Fonts (SIL Open Font License)</div>
  <div class="cr-rule">❦</div>
  <div class="cr-thanks">Thanks to my beta tester and inspiration, Frida!</div>
  <div class="cr-rule">❦</div>`;

export function createCredits() {
  const el = document.createElement('div'); el.id = 'credits'; el.className = 'hidden';
  el.innerHTML = `<canvas class="cr-moths"></canvas><div class="cr-roll">${LINES}</div>
    <div class="cr-card"><canvas class="cr-pinned"></canvas><div class="cr-fin">Finis</div></div>
    <button class="cr-skip" type="button" disabled title="Esc or click to skip">Skip</button>`;
  document.body.appendChild(el);
  const cv = el.querySelector('.cr-moths'), g = cv.getContext('2d');
  const roll = el.querySelector('.cr-roll'), card = el.querySelector('.cr-card'), pinned = el.querySelector('.cr-pinned'), skipEl = el.querySelector('.cr-skip');
  let running = false, t = 0, last = 0, raf = 0, onDone = null, moths = [], rollH = 0, dpr = 1, cardAt = Infinity;

  // each drifting moth is pre-drawn once at its size; frames only move and flap it
  function sprite(key, size) {
    const c = document.createElement('canvas'); c.width = c.height = Math.ceil(size * 1.3);
    drawMoth(c.getContext('2d'), key, c.width / 2, c.height / 2, size, { seed: 3 + Math.floor(Math.random() * 50), pin: false }); return c;
  }
  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    rollH = roll.offsetHeight;
    // the final card: one moth pinned above its specimen label
    const s = Math.min(innerWidth - 32, innerHeight * 0.5, 360);
    pinned.width = s * dpr; pinned.height = s * 1.2 * dpr; pinned.style.width = s + "px"; pinned.style.height = s * 1.2 + "px";
    const p = pinned.getContext('2d'); p.clearRect(0, 0, pinned.width, pinned.height);
    drawMoth(p, 'atropos', pinned.width / 2, pinned.height * 0.3, pinned.width * 0.74, { seed: 7, pin: true });
    drawLabel(p, 'atropos', pinned.width / 2, pinned.height * 0.66, pinned.width * 0.56, 'Coll. P. Davis');
  }
  function spawnMoths() {
    moths = DRIFTERS.map((key, i) => {
      const size = (40 + Math.random() * 40) * dpr;
      return { img: sprite(key, size), x: Math.random() * cv.width, y: cv.height * (0.15 + 0.7 * Math.random()), vx: (i % 2 ? -1 : 1) * (10 + Math.random() * 14) * dpr,
        ph: Math.random() * 7, fl: 5 + Math.random() * 4, a: 0.35 + Math.random() * 0.3 };
    });
  }
  function frame(ms) {
    if (!running) return;
    const dt = Math.min(0.1, (ms - (last || ms)) / 1000); last = ms; t += dt;
    const y = innerHeight - t * SPEED;
    roll.style.transform = `translate(-50%, ${y}px)`;
    if (y + rollH < innerHeight * 0.45 && cardAt === Infinity) cardAt = t;
    const ck = Math.max(0, Math.min(1, (t - cardAt) / 2));
    card.style.opacity = ck; roll.style.opacity = Math.max(0, 1 - ck * 2);
    skipEl.disabled = t < SKIP_AFTER;
    g.clearRect(0, 0, cv.width, cv.height);
    for (const m of moths) {
      m.x += m.vx * dt; m.y += Math.sin(t * 0.7 + m.ph) * 8 * dpr * dt;
      const w = m.img.width; if (m.x > cv.width + w) m.x = -w; if (m.x < -w) m.x = cv.width + w;
      const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * m.fl + m.ph));
      g.save(); g.globalAlpha = m.a * (1 - ck * 0.7); g.translate(m.x, m.y); g.rotate(Math.PI / 2 * Math.sign(m.vx)); g.scale(flap, 1);
      g.drawImage(m.img, -w / 2, -w / 2); g.restore();
    }
    if (t > cardAt + 2 + HOLD) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    if (!running) return; running = false; cancelAnimationFrame(raf); el.classList.add('hidden');
    const cb = onDone; onDone = null; cb && cb();
  }
  const trySkip = (e) => { if (!running) return; e.preventDefault(); e.stopImmediatePropagation(); if (t >= SKIP_AFTER) finish(); };
  addEventListener('keydown', (e) => { if (running && e.code === 'Escape') trySkip(e); }, true);
  el.addEventListener('pointerdown', trySkip);
  addEventListener('resize', () => { if (running) { layout(); spawnMoths(); } });
  return {
    get running() { return running; }, get time() { return t; },
    play(cb) {
      onDone = cb; t = 0; last = 0; cardAt = Infinity; running = true; el.classList.remove('hidden');
      card.style.opacity = 0; roll.style.opacity = 1; layout(); spawnMoths(); raf = requestAnimationFrame(frame);
    },
    skip() { finish(); }, seek(s) { t = s; },
  };
}
