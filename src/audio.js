// Generated night ambience with Web Audio: gusting wind + faint creaks.
let ctx, master;

export function startAudio(volume) {
  if (ctx) { setVolume(volume); if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);

  // brown noise buffer
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.7;
  const wind = ctx.createGain(); wind.gain.value = 0.35;
  src.connect(bp).connect(wind).connect(master); src.start();
  // slow gusts: LFOs on filter frequency and gain
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 250; lfo.connect(lfoAmt).connect(bp.frequency); lfo.start();
  const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
  const lfo2Amt = ctx.createGain(); lfo2Amt.gain.value = 0.2; lfo2.connect(lfo2Amt).connect(wind.gain); lfo2.start();

  const creak = () => {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(50 + Math.random() * 30, t + 0.9);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 1);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.1);
    setTimeout(creak, 7000 + Math.random() * 14000);
  };
  setTimeout(creak, 5000);
}

export function setVolume(v) { if (master) master.gain.value = v; }

export function playThud() {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.35);
}

export function playGlass() {
  if (!ctx) return;
  for (let i = 0; i < 6; i++) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.05 + Math.random() * 0.05;
    o.type = 'triangle'; o.frequency.value = 2500 + Math.random() * 3000;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
  }
}

export function playCreak() {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), t = ctx.currentTime;
  o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(55, t + 1.2);
  f.type = 'lowpass'; f.frequency.value = 600;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.15); g.gain.linearRampToValueAtTime(0, t + 1.3);
  o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.4);
  for (let i = 0; i < 10; i++) { // rattling frames
    const c = ctx.createOscillator(), cg = ctx.createGain(), ct = t + i * 0.06;
    c.type = 'square'; c.frequency.value = 180 + Math.random() * 120;
    cg.gain.setValueAtTime(0.03, ct); cg.gain.exponentialRampToValueAtTime(0.001, ct + 0.05);
    c.connect(cg).connect(master); c.start(ct); c.stop(ct + 0.06);
  }
}

export function playGrind() {
  if (!ctx) return;
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
  const g = ctx.createGain(), t = ctx.currentTime;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.3); g.gain.setValueAtTime(0.5, t + 2.4); g.gain.linearRampToValueAtTime(0, t + 3);
  src.connect(f).connect(g).connect(master); src.start(t);
}

// flashlight switch: a short plastic click
export function playClick() {
  if (!ctx) return;
  const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 1.5;
  const g = ctx.createGain(); g.gain.value = 0.6;
  src.connect(hp).connect(g).connect(master); src.start(t);
}

// gas-light hiss: a quiet filtered noise loop whose level main.js sets each frame
let hissGain = null;
export function setHiss(level) {
  if (!ctx) return;
  if (!hissGain) {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const hum = ctx.createOscillator(); hum.frequency.value = 100; const humG = ctx.createGain(); humG.gain.value = 0.15;
    hissGain = ctx.createGain(); hissGain.gain.value = 0;
    src.connect(hp).connect(hissGain); hum.connect(humG).connect(hissGain); hissGain.connect(master); src.start(); hum.start();
  }
  hissGain.gain.setTargetAtTime(level * 0.05, ctx.currentTime, 0.05);
}
// a soft click, n times in a row (one per case hung in its right place)
export function playSoftClicks(n) {
  if (!ctx) return;
  for (let k = 0; k < n; k++) {
    const t = ctx.currentTime + 0.25 + k * 0.18, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.08);
  }
}
