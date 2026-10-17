// The Mother: a rasping breath, clicks and wing flutters placed at her head with a
// PannerNode, and the player's own heartbeat (not positional) rising as she gets close.
import { A, gain, filt, noiseSrc, panner, placePanner, env, tone } from './core.js';
import { flutter } from './ambience.js';

let pan = null, breath, breathBP, heart, phase = 0, beatT = 0, near = 0, active = false;

export function initMother() {
  pan = panner(1.2, 40, 1.1); pan.connect(A.sfx);
  // breath: noise through a throat-like band pass, with a rasp (amplitude flutter)
  const s = noiseSrc(A.noise, true); breathBP = filt('bandpass', 600, 2.2); const rasp = gain(0.6); breath = gain(0);
  const r = A.ctx.createOscillator(); r.frequency.value = 31; const rg = gain(0.4); r.connect(rg).connect(rasp.gain); r.start();
  s.connect(breathBP).connect(rasp).connect(breath).connect(pan); s.start();
  heart = gain(1); heart.connect(A.sfx);
}

function beat(t, v) {
  for (const [dt, f, a] of [[0, 58, 1], [0.16, 50, 0.7]]) {
    const g = gain(0); const lp = filt('lowpass', 160); g.connect(lp).connect(heart); env(g, t + dt, 0.55 * v * a, 0.008, 0.16);
    const o = tone(g, t + dt, 'sine', f, 0.2); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dt + 0.18);
  }
}

// m: motherPlay (debug gives x, z, dist, mode in local coords), O: house origin
export function updateMother(dt, playing, m, O) {
  if (!pan) return;
  const t = A.ctx.currentTime;
  let d = 99, mode = 'asleep';
  if (playing && m) { try { const s = m.debug; mode = s.mode; d = s.dist; placePanner(pan, O.x + s.x, 1.75, O.z + s.z); } catch { /* not built */ } }
  active = playing && mode !== 'asleep' && d < 30;
  const chase = mode === 'chase';
  // breath: in and out, faster and harsher in a chase
  phase += dt * (chase ? 0.75 : 0.38);
  const cyc = Math.max(0, Math.sin(phase * Math.PI * 2)) ** 1.5;
  breath.gain.setTargetAtTime(active ? (0.08 + 0.18 * cyc) * (chase ? 1.6 : 1) : 0, t, 0.08);
  breathBP.frequency.setTargetAtTime(480 + 300 * cyc, t, 0.1);
  // heartbeat: from 14 m in, from about 60 to 150 bpm
  near += ((active ? Math.max(0, 1 - d / 14) : 0) + (active && chase ? 0.3 : 0) - near) * Math.min(1, dt * 1.5);
  const k = Math.min(1, near);
  if (k > 0.03 && dt > 0) { beatT -= dt; if (beatT <= 0) { beatT = 60 / (60 + 90 * k); beat(t, 0.3 + 0.7 * k); } }
}

export const motherActive = () => active;
// her clicks and wings, at her position while she is up; level scales the loudness
export function motherClicks(level = 1, n = 2) {
  const dest = active ? pan : A.sfx, v = active ? 1 : Math.min(1, level);
  for (let i = 0; i < n; i++) {
    const t = A.ctx.currentTime + i * (0.04 + Math.random() * 0.05), g = gain(0), f = filt('bandpass', 2600 + Math.random() * 900, 3);
    g.connect(dest); env(g, t, 0.22 * v, 0.001, 0.025);
    const s = noiseSrc(); s.connect(f).connect(g); s.start(t, Math.random(), 0.04);
    tone(g, t, 'square', 1800 + Math.random() * 600, 0.02);
  }
}
export function motherFlutter(level = 1) {
  flutter(active ? pan : A.sfx, A.ctx.currentTime, 0.4 * (active ? Math.max(0.5, Math.min(1, level)) : Math.min(1, level)), 0.6);
}
// stunned by a torch burst: a thin, rising shriek that breaks into a hiss
export function motherShriek(level = 1) {
  const t = A.ctx.currentTime, v = Math.min(1, level), g = gain(0), bp = filt('bandpass', 1800, 4);
  g.connect(active ? pan : A.sfx); env(g, t, 0.32 * v, 0.02, 0.7);
  for (const [f0, f1] of [[900, 2600], [1350, 3700]]) { const o = tone(bp, t, 'sawtooth', f0, 0.75); o.frequency.exponentialRampToValueAtTime(f1, t + 0.18); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.75); }
  bp.connect(g);
  const h = gain(0), hf = filt('highpass', 2500); h.connect(active ? pan : A.sfx); env(h, t + 0.25, 0.18 * v, 0.03, 0.6);
  const s = noiseSrc(); s.connect(hf).connect(h); s.start(t + 0.25, Math.random(), 0.7);
}
