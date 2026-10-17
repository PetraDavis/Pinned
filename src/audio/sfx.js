// One-shot interaction sounds, all generated. Every function is a no-op until the
// context exists (first user gesture).
import { A, gain, filt, burst, env, tone, noiseSrc } from './core.js';

const ok = () => !!A.ctx;
const now = () => A.ctx.currentTime;
const out = (v) => { const g = gain(v); g.connect(A.sfx); return g; };

// heavy wooden impact (doors shutting, things set down, transitions)
export function playThud() {
  if (!ok()) return; const t = now(), g = out(0);
  env(g, t, 0.35, 0.003, 0.28); const o = tone(g, t, 'sine', 120, 0.3); o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
  const n = gain(0), f = filt('lowpass', 700); f.connect(n).connect(A.sfx); env(n, t, 0.2, 0.002, 0.1); burst(f, t, 0.12);
}
export function playGlass() {
  if (!ok()) return;
  for (let i = 0; i < 9; i++) {
    const t = now() + i * 0.04 + Math.random() * 0.06, g = out(0);
    env(g, t, 0.06, 0.001, 0.25 + Math.random() * 0.2); tone(g, t, 'triangle', 2500 + Math.random() * 3500, 0.5);
  }
  const n = gain(0), f = filt('highpass', 3000); f.connect(n).connect(A.sfx); env(n, now(), 0.15, 0.002, 0.2); burst(f, now(), 0.25);
}
// rusty hinge / something refusing to move
export function playCreak() {
  if (!ok()) return; const t = now(), o = A.ctx.createOscillator(), g = out(0), f = filt('bandpass', 700, 3);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(55, t + 1.2);
  const w = A.ctx.createOscillator(), wg = gain(18); w.frequency.value = 13; w.connect(wg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.15); g.gain.linearRampToValueAtTime(0.0001, t + 1.3);
  o.connect(f).connect(g); o.start(t); o.stop(t + 1.4); w.start(t); w.stop(t + 1.4);
  for (let i = 0; i < 8; i++) { const ct = t + i * 0.06, cg = out(0); env(cg, ct, 0.03, 0.001, 0.04); tone(cg, ct, 'square', 180 + Math.random() * 120, 0.05); }
}
// stone grinding, and (debounced) a solve stinger: every puzzle solve in the game calls this
let lastSting = -9;
export function playGrind() {
  if (!ok()) return; const t = now(), f = filt('lowpass', 260), g = out(0);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.3); g.gain.setValueAtTime(0.5, t + 2.4); g.gain.linearRampToValueAtTime(0.0001, t + 3);
  const s = noiseSrc(A.brown); const am = gain(0.7); const l = A.ctx.createOscillator(); l.frequency.value = 7; const lg = gain(0.3); l.connect(lg).connect(am.gain);
  s.connect(f).connect(am).connect(g); s.start(t, 0, 3.1); l.start(t); l.stop(t + 3.1);
  if (t - lastSting > 4) { lastSting = t; playStinger(); }
}
// puzzle solved: a low swell and a falling minor arpeggio on bell tones
export function playStinger() {
  if (!ok()) return; const t = now() + 0.1;
  const sw = out(0), lp = filt('lowpass', 500); lp.connect(sw); sw.gain.setValueAtTime(0.0001, t); sw.gain.linearRampToValueAtTime(0.12, t + 0.6); sw.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  for (const f of [110, 130.8, 164.8]) tone(lp, t, 'sawtooth', f, 3);
  [880, 659.3, 523.3, 440, 415.3].forEach((f, i) => bell(t + 0.15 + i * 0.22, f, 0.09));
}
function bell(t, f, v) {
  for (const [m, a, d] of [[1, 1, 1.8], [2.4, 0.4, 0.6], [4.1, 0.2, 0.3]]) { const g = out(0); env(g, t, v * a, 0.003, d); tone(g, t, 'sine', f * m, d); }
}
// moth taken: a soft high chime with a papery shimmer
export function playChime() {
  if (!ok()) return; const t = now();
  bell(t, 1318.5, 0.07); bell(t + 0.12, 1975.5, 0.05); bell(t + 0.24, 1568, 0.04);
  const g = gain(0), f = filt('bandpass', 1400, 1); f.connect(g).connect(A.sfx); env(g, t, 0.05, 0.05, 0.4); burst(f, t, 0.5);
}
export function playClick() { // a small switch or latch
  if (!ok()) return; const t = now(), f = filt('bandpass', 3200, 1.5), g = out(0); f.connect(g); env(g, t, 0.5, 0.001, 0.03); burst(f, t, 0.04);
}
// padlock dial: a detent click with a little metal ring
export function playDial() {
  if (!ok()) return; const t = now(), f = filt('bandpass', 4200, 4), g = out(0); f.connect(g); env(g, t, 0.35, 0.001, 0.02); burst(f, t, 0.03);
  const r = out(0); env(r, t, 0.025, 0.001, 0.08); tone(r, t, 'sine', 2900 + Math.random() * 200, 0.1);
}
// a door swinging open: latch, long hinge creak, soft knock against the stop
export function playDoor() {
  if (!ok()) return; const t = now(); playClick();
  const o = A.ctx.createOscillator(), g = out(0), f = filt('bandpass', 900, 5); o.type = 'sawtooth';
  o.frequency.setValueAtTime(180, t + 0.05); o.frequency.linearRampToValueAtTime(260, t + 0.6); o.frequency.linearRampToValueAtTime(150, t + 1.2);
  const w = A.ctx.createOscillator(), wg = gain(20); w.frequency.value = 22; w.connect(wg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
  o.connect(f).connect(g); o.start(t); o.stop(t + 1.3); w.start(t); w.stop(t + 1.3);
  const k = out(0); env(k, t + 1.15, 0.2, 0.003, 0.15); const kk = tone(k, t + 1.15, 'sine', 90, 0.2); kk.frequency.exponentialRampToValueAtTime(50, t + 1.3);
}
// a wooden drawer sliding: rough friction noise
export function playDrawer(open = true) {
  if (!ok()) return; const t = now(), f = filt('bandpass', open ? 600 : 500, 1.5), g = out(0); f.connect(g);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.05); g.gain.linearRampToValueAtTime(0.1, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  burst(f, t, 0.45);
  const k = out(0); env(k, t + 0.38, 0.12, 0.002, 0.06); tone(k, t + 0.38, 'triangle', 220, 0.08);
}
// oil lamp: the match strike and the flame catching (or a puff when blown out)
export function playLamp(on = true) {
  if (!ok()) return; const t = now();
  if (on) { const f = filt('highpass', 2500), g = out(0); f.connect(g); env(g, t, 0.25, 0.005, 0.25); burst(f, t, 0.3); }
  const f2 = filt('lowpass', on ? 600 : 400), g2 = out(0); f2.connect(g2); env(g2, t + (on ? 0.25 : 0), 0.3, 0.06, 0.5); burst(f2, t + (on ? 0.25 : 0), 0.6, A.brown);
}
// paraffin lantern: wire bail and glass chimney clink, then a soft whoomp
export function playLantern() {
  if (!ok()) return; const t = now();
  for (let i = 0; i < 3; i++) { const g = out(0), tt = t + i * 0.07; env(g, tt, 0.05, 0.001, 0.12); tone(g, tt, 'triangle', 2200 + Math.random() * 1500, 0.14); }
  const f = filt('lowpass', 500), g = out(0); f.connect(g); env(g, t + 0.2, 0.25, 0.05, 0.4); burst(f, t + 0.2, 0.5, A.brown);
}
// gas-light hiss: a quiet filtered noise loop whose level main.js sets each frame
let hissGain = null;
export function setHiss(level) {
  if (!ok()) return;
  if (!hissGain) {
    const s = noiseSrc(A.noise, true), hp = filt('highpass', 2500); hissGain = gain(0);
    const hum = A.ctx.createOscillator(); hum.frequency.value = 100; const hg = gain(0.15);
    s.connect(hp).connect(hissGain); hum.connect(hg).connect(hissGain); hissGain.connect(A.sfx); s.start(); hum.start();
  }
  hissGain.gain.setTargetAtTime(level * 0.05, now(), 0.05);
}
// a soft click, n times in a row (one per piece in its right place)
export function playSoftClicks(n) {
  if (!ok()) return;
  for (let k = 0; k < n; k++) {
    const t = now() + 0.25 + k * 0.18, g = out(0); env(g, t, 0.12, 0.001, 0.05);
    const o = tone(g, t, 'sine', 1800, 0.06); o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
  }
}
