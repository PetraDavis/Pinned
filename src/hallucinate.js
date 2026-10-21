// Wing dust and the hallucinations it brings, plus the Settings additions for captions and
// the brightness calibration screen.
//
// Handling moths (taking moth notes, lifting specimens) leaves powdery dust on your hands
// and eyes: a faint shimmer at the screen edges. With enough of it, rare and harmless
// hallucinations happen. Dust fades slowly. Everything runs on game time (dt), so pausing
// freezes it all.
import * as THREE from 'three';
import { sampleNow } from './audio/samples.js';
import { drawMoth } from './moths.js';
import { caption, captionSound, updateCaptions, setCaptionSettings } from './captions.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const WHISPERS = [
  'she knows your name', 'stay a little longer', 'up the ladder', 'you have such pale wings',
  'we were cold too', 'do not look at her', 'one of us', 'the dark keeps',
];

export function createHallucinations({ scene, camera, room, ground, settings, saveSettings, volume }) {
  let dust = 0, next = rand(30, 60), active = null;
  setCaptionSettings(settings);

  // ---------- screen overlay: dust shimmer and crawling moths ----------
  const cv = document.createElement('canvas'); cv.id = 'wingDust';
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 4 });
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  const motes = Array.from({ length: 90 }, () => ({ u: Math.random(), v: Math.random(), ph: Math.random() * 6.28, s: rand(0.6, 1.8) }));
  const mothSprite = document.createElement('canvas'); mothSprite.width = mothSprite.height = 64;
  { const mg = mothSprite.getContext('2d'); drawMoth(mg, 'maura', 32, 32, 58, { pin: false, seed: 3 });
    mg.globalCompositeOperation = 'source-atop'; mg.fillStyle = 'rgba(20,16,12,0.75)'; mg.fillRect(0, 0, 64, 64); }
  let crawlers = [], overlayT = 0;
  function resize() { const k = 0.5; cv.width = Math.max(1, Math.round(innerWidth * k)); cv.height = Math.max(1, Math.round(innerHeight * k)); }
  resize(); addEventListener('resize', resize);

  function drawOverlay(dt, show) {
    overlayT += dt;
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    if (!show || (dust < 0.02 && !crawlers.length)) return;
    if (dust > 0.02) {
      const a = Math.min(1, dust) * 0.22;
      const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.55);
      grd.addColorStop(0, 'rgba(225,215,190,0)'); grd.addColorStop(1, `rgba(225,215,190,${a})`);
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const n = Math.round(motes.length * Math.min(1, dust * 1.4));
      for (let i = 0; i < n; i++) {
        const m = motes[i];
        // push motes out to the edges
        const ex = m.u < 0.5 ? m.u * 0.3 : 1 - (1 - m.u) * 0.3, ey = m.v < 0.5 ? m.v * 0.3 : 1 - (1 - m.v) * 0.3;
        const x = (i & 1 ? ex : m.u) * W, y = (i & 1 ? m.v : ey) * H;
        const tw = 0.5 + 0.5 * Math.sin(overlayT * 1.7 * m.s + m.ph);
        g.fillStyle = `rgba(240,232,210,${(0.08 + 0.3 * tw) * Math.min(1, dust * 1.5)})`;
        g.fillRect(x + Math.sin(overlayT * 0.3 + m.ph) * 3, y, m.s, m.s);
      }
    }
    for (const c of crawlers) {
      c.t += dt; c.x += Math.cos(c.dir) * c.speed * dt * W; c.y += Math.sin(c.dir) * c.speed * dt * H;
      if (Math.random() < dt * 0.8) c.dir += rand(-0.8, 0.8);
      const fade = Math.min(1, c.t / 1.2, (c.life - c.t) / 1.2);
      g.save(); g.globalAlpha = Math.max(0, fade) * 0.55; g.translate(c.x, c.y); g.rotate(c.dir + Math.PI / 2);
      const s = c.size * H; g.drawImage(mothSprite, -s / 2, -s / 2, s, s); g.restore();
    }
    crawlers = crawlers.filter(c => c.t < c.life);
  }

  // ---------- the tall pale figure ----------
  const figure = new THREE.Group();
  const pale = new THREE.MeshBasicMaterial({ color: 0xcfcabb, transparent: true, opacity: 0, depthWrite: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 8), pale); body.position.y = 1.1; figure.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), pale); head.position.y = 2.36; head.scale.y = 1.35; figure.add(head);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1.3, 5), pale); arm.position.set(s * 0.19, 1.45, 0); arm.rotation.z = s * 0.06; figure.add(arm); }
  figure.visible = false; figure.userData.noAO = true; scene.add(figure);

  const ray = new THREE.Raycaster(), fwd = new THREE.Vector3(), to = new THREE.Vector3(), v = new THREE.Vector3();
  const viewAngle = p => { camera.getWorldDirection(fwd); to.copy(p).sub(camera.position).normalize(); return fwd.angleTo(to); };
  const flatAngle = p => { camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); to.copy(p).sub(camera.position); to.y = 0; to.normalize(); return fwd.angleTo(to); };

  function startFigure() {
    camera.getWorldDirection(fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-4) return false; fwd.normalize();
    const side = Math.random() < 0.5 ? -1 : 1, dir = fwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), side * rand(0.45, 0.65));
    ray.set(camera.position, dir); ray.far = 22; ray.camera = camera;
    const hit = ray.intersectObject(room.group, true).find(h => h.object.isMesh && !h.object.isSprite && !h.object.userData.noAO && isShown(h.object));
    const D = hit ? hit.distance : 22;
    if (D < 7) return false; // no corridor that way
    const d = Math.min(D - 0.7, 15);
    figure.position.copy(camera.position).addScaledVector(dir, d); figure.position.y = camera.position.y - 1.6;
    figure.lookAt(camera.position.x, figure.position.y, camera.position.z);
    figure.visible = true; pale.opacity = 0;
    active = { kind: 'figure', t: 0, life: rand(6, 9), gone: false };
    return true;
  }
  function tickFigure(dt) {
    const a = active; a.t += dt;
    head.getWorldPosition(v);
    const near = camera.position.distanceTo(figure.position) < 4;
    if (!a.gone && (viewAngle(v) < 0.2 || near || a.t > a.life)) a.gone = true; // looked at: gone
    pale.opacity = a.gone ? Math.max(0, pale.opacity - dt * 6) : Math.min(0.42, pale.opacity + dt * 0.25);
    if (a.gone && pale.opacity <= 0) { figure.visible = false; return true; }
    return false;
  }

  // ---------- a door that seems to stand open ----------
  function startDoor() {
    if (!ground || !ground.doors) return false;
    const cands = Object.values(ground.doors).filter(d => {
      if (d.isOpen || d.boarded || !d.pivot) return false;
      d.pivot.getWorldPosition(v); if (!d.pivot.parent || !isShown(d.pivot)) return false;
      const dist = v.distanceTo(camera.position), ang = flatAngle(v);
      return dist > 3 && dist < 12 && ang > 0.4 && ang < 1.1;
    });
    if (!cands.length) return false;
    const d = pick(cands);
    active = { kind: 'door', d, t: 0, life: rand(4, 7), gone: false, base: d.pivot.rotation.y };
    return true;
  }
  function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function tickDoor(dt) {
    const a = active, d = a.d; a.t += dt;
    if (d.isOpen) return true; // really opened: leave it alone
    d.pivot.getWorldPosition(v);
    if (!a.gone && (flatAngle(v) < 0.22 || a.t > a.life)) a.gone = true;
    if (a.gone) { d.pivot.rotation.y = a.base; return true; } // and it was always shut
    d.pivot.rotation.y = a.base - Math.min(1, a.t * 2) * 0.9;
    return false;
  }

  // ---------- reflections that lag ----------
  const hist = []; // { t, x, z, yaw }
  let clock = 0;
  function nearMirror() {
    if (!ground || !ground.mirrors) return false;
    return ground.mirrors.some(m => { m.group.getWorldPosition(v); return isShown(m.group) && v.distanceTo(camera.position) < 6; });
  }
  function tickMirror(dt) {
    const a = active; a.t += dt;
    if (a.t > a.life) return true;
    const lag = Math.min(0.7, a.t * 0.5, (a.life - a.t) * 0.5);
    const target = clock - lag; let s = hist[0];
    for (const h of hist) { if (h.t <= target) s = h; else break; }
    if (!s) return false;
    const dx = s.x - camera.position.x, dz = s.z - camera.position.z;
    for (const m of ground.mirrors) { m.avatar.position.x += dx; m.avatar.position.z += dz; m.avatar.rotation.y = s.yaw; }
    return false;
  }

  // ---------- whispers ----------
  let actx = null;
  // her lines load a little after your first click or key press (not during the page load)
  const warm = () => { removeEventListener('pointerdown', warm, true); removeEventListener('keydown', warm, true);
    setTimeout(() => { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; if (!actx) actx = new AC(); WHISPERS.forEach((_, i) => sampleNow(actx, 'whisper-' + (i + 1))); } catch { /* synthesized whispers */ } }, 6000); };
  addEventListener('pointerdown', warm, true); addEventListener('keydown', warm, true);
  function whisper() {
    const words = pick(WHISPERS);
    caption(`(whispering) ${words}`, 3.5);
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      // Petra's recorded line (audio/whisper-N), drifting from one side of you to the other
      const rec = sampleNow(actx, 'whisper-' + (WHISPERS.indexOf(words) + 1));
      if (rec) {
        const src = actx.createBufferSource(); src.buffer = rec; src.playbackRate.value = 0.96 + Math.random() * 0.05;
        const g = actx.createGain(); g.gain.value = 0.9 * (volume ? volume() : 0.6); // the files are already quiet (all at the level of "we were cold too")
        const p = actx.createStereoPanner ? actx.createStereoPanner() : null, side = Math.random() < 0.5 ? -1 : 1, t = actx.currentTime;
        if (p) { p.pan.setValueAtTime(0.85 * side, t); p.pan.linearRampToValueAtTime(-0.5 * side, t + rec.duration); src.connect(g).connect(p).connect(actx.destination); } else src.connect(g).connect(actx.destination);
        src.start(); return;
      }
      const t0 = actx.currentTime + 0.05, sr = actx.sampleRate, len = Math.round(sr * 1.8);
      const buf = actx.createBuffer(1, len, sr), dd = buf.getChannelData(0);
      for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource(); src.buffer = buf;
      const out = actx.createGain(); out.gain.value = 0;
      const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
      const vol = 0.18 * (volume ? volume() : 0.6);
      // syllables: an envelope of short bumps
      let t = t0; const syl = words.split(' ').length * 1.4 | 0;
      for (let i = 0; i < syl; i++) { const d = rand(0.08, 0.17); out.gain.setTargetAtTime(vol * rand(0.5, 1), t, 0.02); out.gain.setTargetAtTime(vol * 0.08, t + d, 0.03); t += d + rand(0.03, 0.08); }
      out.gain.setTargetAtTime(0, t, 0.05);
      // two moving formants make it sound voice-like
      const merge = actx.createGain();
      for (const [f0, f1] of [[700, 1200], [1900, 2600]]) {
        const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
        bp.frequency.setValueAtTime(f0, t0); for (let tt = t0; tt < t; tt += 0.12) bp.frequency.setValueAtTime(rand(f0, f1), tt);
        src.connect(bp).connect(merge);
      }
      const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      merge.connect(hp).connect(out);
      if (pan) { pan.pan.value = Math.random() < 0.5 ? -0.8 : 0.8; out.connect(pan).connect(actx.destination); } else out.connect(actx.destination);
      src.start(t0); src.stop(t + 0.4);
    } catch { /* captions still show */ }
  }

  // ---------- scheduler ----------
  function trigger(kind) {
    const order = kind ? [kind] : [pick(['figure', 'whisper', 'moths', 'door', 'mirror']), 'whisper'];
    for (const k of order) {
      if (k === 'figure' && startFigure()) return k;
      if (k === 'door' && startDoor()) return k;
      if (k === 'mirror' && nearMirror()) { active = { kind: 'mirror', t: 0, life: rand(4, 6) }; return k; }
      if (k === 'whisper') { whisper(); return k; }
      if (k === 'moths') {
        const n = 1 + Math.round(dust * 2);
        for (let i = 0; i < n; i++) {
          const edge = Math.floor(Math.random() * 4), W = cv.width, H = cv.height;
          const x = edge === 0 ? W * 0.03 : edge === 1 ? W * 0.97 : rand(0.1, 0.9) * W, y = edge === 2 ? H * 0.04 : edge === 3 ? H * 0.96 : rand(0.15, 0.85) * H;
          const dir = edge < 2 ? (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2 : (Math.random() < 0.5 ? 0 : Math.PI);
          crawlers.push({ x, y, dir, speed: rand(0.006, 0.014), size: rand(0.035, 0.05), t: 0, life: rand(5, 8) });
        }
        captionSound('[something crawling]', 2.5);
        return k;
      }
    }
    return null;
  }

  return {
    get dust() { return dust; },
    addDust(amount = 0.2) { dust = Math.min(1, dust + amount); next = Math.min(next, rand(20, 45)); },
    setDust(x) { dust = Math.max(0, Math.min(1, x)); },
    trigger, // for testing: trigger('figure' | 'whisper' | 'moths' | 'door' | 'mirror')
    get active() { return active && active.kind; },
    // dt is game time (0 while paused). playing: the player is in control. inside: in the house.
    // Call after the world's own update so the mirror avatars can be moved.
    update(dt, playing, inside) {
      updateCaptions(dt);
      drawOverlay(dt, playing || dt === 0);
      if (dt <= 0) return;
      clock += dt;
      hist.push({ t: clock, x: camera.position.x, z: camera.position.z, yaw: Math.atan2(-camera.matrixWorld.elements[8], -camera.matrixWorld.elements[10]) });
      while (hist.length && hist[0].t < clock - 1.2) hist.shift();
      dust = Math.max(0, dust - dt * 0.0035);
      if (active) {
        const done = active.kind === 'figure' ? tickFigure(dt) : active.kind === 'door' ? tickDoor(dt) : active.kind === 'mirror' ? tickMirror(dt) : true;
        if (!playing && active.kind === 'door') { active.d.pivot.rotation.y = active.base; active = null; }
        else if (!playing && active.kind === 'figure') { figure.visible = false; active = null; }
        else if (done) active = null;
        return;
      }
      if (!playing || !inside || dust < 0.15) return;
      next -= dt * (0.4 + dust);
      if (next <= 0) { trigger(); next = rand(50, 100); }
    },
  };
}

// ---------- Settings additions: captions toggles and the brightness calibration ----------
export function initAccessibilitySettings({ settings, saveSettings }) {
  if (settings.captions === undefined) settings.captions = true;
  if (settings.soundCaptions === undefined) settings.soundCaptions = false;
  const back = document.getElementById('btnSettingsBack'); if (!back) return;
  const mk = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const bright = document.getElementById('sBright');
  const cal = mk('<button id="btnCalibrate" type="button">Calibrate brightness</button>');
  bright.closest('label').after(cal);
  const c1 = mk('<label class="check">Subtitles (whispers and voices)<input id="sCaptions" type="checkbox"></label>');
  const c2 = mk('<label class="check">Sound captions, e.g. [wings fluttering]<input id="sSoundCaptions" type="checkbox"></label>');
  back.before(c1, c2);
  const s1 = c1.querySelector('input'), s2 = c2.querySelector('input');
  s1.checked = settings.captions; s2.checked = settings.soundCaptions;
  s1.onchange = () => { settings.captions = s1.checked; saveSettings(settings); setCaptionSettings(settings); };
  s2.onchange = () => { settings.soundCaptions = s2.checked; saveSettings(settings); setCaptionSettings(settings); };
  setCaptionSettings(settings);

  // the calibration screen: a moth drawn just above black, shown at the chosen brightness
  const scr = mk(`<div id="calibrate" class="screen hidden" style="background:#000;z-index:25;flex-direction:column;gap:14px">
    <canvas width="300" height="240" style="width:300px;max-width:calc(100vw - 32px)"></canvas>
    <p class="note" style="max-width:min(420px,calc(100vw - 32px));text-align:center">Move the slider until the moth is only just visible against the black.</p>
    <label style="width:min(340px,calc(100vw - 32px))">Brightness <output></output><input type="range" min="0.5" max="2" step="0.05"></label>
    <button type="button">Done</button></div>`);
  document.body.appendChild(scr);
  const ccv = scr.querySelector('canvas'), cg = ccv.getContext('2d');
  drawMoth(cg, 'maura', 150, 120, 220, { pin: false, seed: 5 });
  cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = '#0b0a09'; cg.fillRect(0, 0, 300, 240);
  const sl = scr.querySelector('input'), out = scr.querySelector('output');
  const sync = () => { sl.value = settings.brightness; out.textContent = Math.round(settings.brightness * 100) + '%'; ccv.style.filter = `brightness(${Math.pow(settings.brightness, 1.6) * 1.0})`; };
  sl.oninput = () => { bright.value = sl.value; bright.dispatchEvent(new Event('input')); sync(); };
  cal.onclick = () => { sync(); scr.classList.remove('hidden'); };
  scr.querySelector('button').onclick = () => scr.classList.add('hidden');
}
