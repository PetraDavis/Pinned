// Audio core: one AudioContext (created on the first user gesture, as every browser
// requires), a small bus graph and shared noise buffers.
//   amb -> sfx -> master -> limiter -> destination,   music -> master
// Voice chat plays through <audio> elements (net/voice.js) scaled by voiceVolume().
// Volumes come from settings: volume (master), musicVol, sfxVol, voiceVol.
export const A = { ctx: null, master: null, music: null, sfx: null, amb: null, noise: null, brown: null, suspendedByGame: false };
const vol = { master: 0.6, music: 0.7, sfx: 1, voice: 1 };
const listeners = [];
export const onReady = fn => { if (A.ctx) fn(A); else listeners.push(fn); };

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { A.ctx = new AC({ latencyHint: 'interactive' }); } catch { A.ctx = new AC(); }
  const c = A.ctx;
  A.master = c.createGain();
  // a gentle limiter keeps stacked one-shots from clipping
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  A.master.connect(comp).connect(c.destination);
  A.music = c.createGain(); A.sfx = c.createGain(); A.amb = c.createGain();
  A.music.connect(A.master); A.sfx.connect(A.master); A.amb.connect(A.sfx);
  const mk = (sec, brown) => {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  };
  A.noise = mk(2, false); A.brown = mk(4, true);
  applyVolumes();
  listeners.splice(0).forEach(fn => { try { fn(A); } catch (e) { console.warn('audio init', e); } });
}

// Create or resume the context. Must happen inside a user gesture the first time.
export function unlock() {
  if (!A.ctx) build();
  else if (A.ctx.state !== 'running' && !A.suspendedByGame) A.ctx.resume().catch(() => {});
}
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });

export function setVolumes(v) { Object.assign(vol, v); applyVolumes(); }
export const voiceVolume = () => vol.master * vol.voice;
function applyVolumes() {
  if (!A.ctx) return;
  const t = A.ctx.currentTime;
  A.master.gain.setTargetAtTime(vol.master, t, 0.03);
  A.music.gain.setTargetAtTime(vol.music, t, 0.03);
  A.sfx.gain.setTargetAtTime(vol.sfx, t, 0.03);
}

// Freeze with the game clock: suspending the context halts every scheduled sound at once.
export function setFrozen(on) {
  if (!A.ctx || A.suspendedByGame === on) return;
  A.suspendedByGame = on;
  (on ? A.ctx.suspend() : A.ctx.resume()).catch(() => {});
}

// ---- small helpers ----
export function noiseSrc(buf = A.noise, loop = false) { const s = A.ctx.createBufferSource(); s.buffer = buf; s.loop = loop; return s; }
export function filt(type, f, q = 1) { const n = A.ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; }
export function gain(v = 1) { const g = A.ctx.createGain(); g.gain.value = v; return g; }
// percussive envelope on a gain node
export function env(g, t, peak, atk, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec); }
// a short burst of noise from a random offset in the buffer
export function burst(dest, t, dur, buf = A.noise) { const s = noiseSrc(buf); s.connect(dest); s.start(t, Math.random() * Math.max(0, buf.duration - dur - 0.05), dur + 0.02); return s; }
export function tone(dest, t, type, f, dur) { const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }

// PannerNode helpers (older Safari only has setPosition / setOrientation)
export function panner(ref = 1.5, max = 40, roll = 1.2) {
  const p = A.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = roll; return p;
}
export function placePanner(p, x, y, z) {
  if (p.positionX) { const t = A.ctx.currentTime; p.positionX.setTargetAtTime(x, t, 0.05); p.positionY.setTargetAtTime(y, t, 0.05); p.positionZ.setTargetAtTime(z, t, 0.05); }
  else p.setPosition(x, y, z);
}
export function placeListener(pos, fwd, up) {
  const L = A.ctx.listener, t = A.ctx.currentTime;
  if (L.positionX) {
    L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02);
    L.forwardX.setTargetAtTime(fwd.x, t, 0.02); L.forwardY.setTargetAtTime(fwd.y, t, 0.02); L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
    L.upX.setTargetAtTime(up.x, t, 0.02); L.upY.setTargetAtTime(up.y, t, 0.02); L.upZ.setTargetAtTime(up.z, t, 0.02);
  } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
}
