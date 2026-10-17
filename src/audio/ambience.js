// Per-floor ambience. Two loops (wind, a low room tone) cross-fade per floor; one-shot
// events (creaks, drips, rafter groans, distant fluttering) are timed on the game clock,
// so they stop with it.
import { A, gain, filt, noiseSrc, env, panner, placePanner } from './core.js';

// Where the player is, from zone and the house's local z bands (see world/*.js).
export function floorAt(zone, x, z) {
  if (zone === 'exterior') return 'exterior';
  if (z > 168) return 'attic';
  if (z > 111) return 'catacombs';
  if (z > 77) return 'first';
  if (z > 37) return 'cellar';
  return 'ground';
}

// wind, room tone, and how often each event fires (per second)
const FLOOR = {
  exterior: { wind: 0.5, tone: 0.0, creak: 0, drip: 0, groan: 0, flutter: 0.02 },
  ground: { wind: 0.16, tone: 0.25, creak: 0.09, drip: 0, groan: 0, flutter: 0.03 },
  first: { wind: 0.2, tone: 0.25, creak: 0.1, drip: 0, groan: 0.015, flutter: 0.05 },
  cellar: { wind: 0.04, tone: 0.45, creak: 0.03, drip: 0.35, groan: 0, flutter: 0.02 },
  catacombs: { wind: 0.0, tone: 0.55, creak: 0, drip: 0.6, groan: 0, flutter: 0.04 },
  attic: { wind: 0.3, tone: 0.3, creak: 0.06, drip: 0, groan: 0.12, flutter: 0.08 },
  house: { wind: 0.15, tone: 0.25, creak: 0.08, drip: 0, groan: 0, flutter: 0.03 },
};

let wind, windBP, tone, spot, lfoT = 0;

export function initAmbience() {
  const c = A.ctx;
  // wind at the windows: band-passed brown noise with slow gusts
  const ws = noiseSrc(A.brown, true); windBP = filt('bandpass', 420, 0.8); wind = gain(0);
  const whistle = filt('peaking', 900, 6); whistle.gain.value = 8;
  ws.connect(windBP).connect(whistle).connect(wind).connect(A.amb); ws.start();
  // room tone: very low rumble, the house breathing
  const ts = noiseSrc(A.brown, true); const lp = filt('lowpass', 120, 0.5); tone = gain(0);
  ts.connect(lp).connect(tone).connect(A.amb); ts.start(1.3);
  // one-shot events come from a random spot around the listener
  spot = panner(2, 30, 1); spot.connect(A.amb);
}

function around(p, r) { const a = Math.random() * Math.PI * 2, d = r * (0.5 + Math.random()); placePanner(spot, p.x + Math.cos(a) * d, p.y + (Math.random() - 0.2) * 2, p.z + Math.sin(a) * d); }

function creak(t, deep) {
  const o = A.ctx.createOscillator(), g = gain(0), f = filt('bandpass', deep ? 260 : 520, 4);
  o.type = 'sawtooth'; const f0 = (deep ? 45 : 80) + Math.random() * 35, len = 0.6 + Math.random() * (deep ? 2 : 0.8);
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.5), t + len);
  // friction: a fast wobble on the pitch
  const w = A.ctx.createOscillator(), wg = gain(f0 * 0.15); w.frequency.value = 9 + Math.random() * 14; w.connect(wg).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(deep ? 0.12 : 0.06, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(spot); o.start(t); o.stop(t + len + 0.05); w.start(t); w.stop(t + len + 0.05);
}
function drip(t) {
  const o = A.ctx.createOscillator(), g = gain(0); const f = 900 + Math.random() * 900;
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.06);
  env(g, t, 0.12, 0.002, 0.09); o.connect(g).connect(spot); o.start(t); o.stop(t + 0.15);
  // echo off the stone
  const d = A.ctx.createDelay(1), dg = gain(0.3); d.delayTime.value = 0.16 + Math.random() * 0.1; g.connect(d).connect(dg).connect(spot);
}
export function flutter(dest, t, level, len = 0.5) {
  const s = noiseSrc(), f = filt('bandpass', 700 + Math.random() * 500, 0.9), g = gain(0), am = gain(0);
  const lfo = A.ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 18 + Math.random() * 10; const lg = gain(0.5);
  lfo.connect(lg).connect(am.gain); am.gain.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(level, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(am).connect(g).connect(dest); s.start(t, Math.random(), len + 0.05); lfo.start(t); lfo.stop(t + len + 0.05);
}

// active: in game (not home). p: listener position.
export function updateAmbience(dt, active, floor, p) {
  if (!wind) return;
  const F = FLOOR[floor] || FLOOR.house, t = A.ctx.currentTime;
  lfoT += dt;
  const gust = 0.6 + 0.4 * Math.sin(lfoT * 0.45) * Math.sin(lfoT * 0.17 + 1);
  wind.gain.setTargetAtTime(active ? F.wind * gust : 0, t, 0.6);
  windBP.frequency.setTargetAtTime(300 + 350 * gust, t, 0.3);
  tone.gain.setTargetAtTime(active ? F.tone : 0, t, 1);
  if (!active || dt <= 0) return;
  const roll = r => Math.random() < r * dt;
  if (roll(F.creak)) { around(p, 6); creak(t, false); }
  if (roll(F.groan)) { placePanner(spot, p.x + (Math.random() - 0.5) * 8, p.y + 2.5, p.z + (Math.random() - 0.5) * 8); creak(t, true); }
  if (roll(F.drip)) { around(p, 5); drip(t); }
  if (roll(F.flutter)) { around(p, 9); flutter(spot, t, 0.05, 0.4 + Math.random() * 0.4); }
}
