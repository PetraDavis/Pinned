// Home screen theme: a slow, slightly out-of-tune music box in A minor whose spring
// sags and recovers once a phrase, with a short echo tail. Notes are scheduled a little
// ahead on the audio clock. In game only a faint low drone stays on the music bus.
import { A, gain, filt } from './core.js';

const N = n => 440 * Math.pow(2, (n - 69) / 12);
// [midi note, beats]; 0 = rest
const MELODY = [
  [76, 1], [72, 1], [69, 1], [71, 2], [72, 1], [74, 1], [71, 1], [67, 2], [0, 1],
  [76, 1], [72, 1], [69, 1], [77, 2], [76, 1], [74, 1], [72, 1], [71, 3], [0, 1],
  [69, 1], [72, 1], [76, 1], [81, 2], [79, 1], [77, 1], [76, 1], [72, 2], [0, 1],
  [74, 1], [71, 1], [68, 1], [69, 3], [0, 3],
];
const BASS = [45, 41, 43, 40, 45, 41, 38, 40];

let bus = null, drone = null, timer = 0, next = 0, idx = 0, beat = 0, on = false;

function pluck(t, f, v) {
  const c = A.ctx;
  // a tine: fundamental plus inharmonic partials, each with its own decay
  for (const [mul, amp, dec] of [[1, 1, 2.4], [2.76, 0.35, 0.8], [5.4, 0.18, 0.35], [8.93, 0.08, 0.15]]) {
    const o = c.createOscillator(), og = c.createGain();
    o.frequency.value = f * mul * (1 + (Math.random() - 0.5) * 0.004);
    og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(amp * v, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(og).connect(bus); o.start(t); o.stop(t + dec + 0.05);
  }
}

function schedule() {
  const c = A.ctx;
  if (next < c.currentTime) next = c.currentTime + 0.05;
  while (next < c.currentTime + 0.4) {
    const [n, beats] = MELODY[idx];
    const spb = 0.42 * (1 + 0.18 * Math.sin(idx / MELODY.length * Math.PI * 2) + (Math.random() - 0.5) * 0.04);
    if (n) pluck(next, N(n) * (1 + 0.006 * Math.sin(beat * 0.7)), 0.16);
    if (beat % 4 === 0) pluck(next, N(BASS[(beat / 4) % BASS.length]), 0.12);
    next += beats * spb; beat += beats; idx = (idx + 1) % MELODY.length;
  }
}

export function initMusic() {
  const c = A.ctx;
  bus = gain(0); bus.connect(A.music);
  for (const [dt, fb] of [[0.31, 0.35], [0.47, 0.28]]) { // two feedback delays as a small room
    const d = c.createDelay(1), f = gain(fb), lp = filt('lowpass', 2500);
    d.delayTime.value = dt; bus.connect(d); d.connect(lp).connect(f).connect(d); f.connect(A.music);
  }
  drone = gain(0); const lp = filt('lowpass', 400); drone.connect(lp).connect(A.music);
  for (const f of [55, 55.4, 82.6]) { const o = c.createOscillator(); o.frequency.value = f; const g = gain(f > 80 ? 0.25 : 0.5); o.connect(g).connect(drone); o.start(); }
}

// home: the music box; in game: the drone, at droneLevel (0..1)
export function updateMusic(home, dt, droneLevel) {
  if (!bus) return;
  const t = A.ctx.currentTime;
  if (home && !on) { on = true; next = t + 0.3; idx = 0; beat = 0; timer = 0; }
  if (!home) on = false;
  bus.gain.setTargetAtTime(on ? 1 : 0, t, on ? 0.4 : 0.5);
  drone.gain.setTargetAtTime(home ? 0.05 : 0.05 * droneLevel, t, 0.8);
  if (on) { timer -= dt; if (timer <= 0) { timer = 0.1; schedule(); } }
}
