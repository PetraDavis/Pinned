// Photo mode (K, or the pause menu): you step out of your body as a ghost. The game freezes
// (in multiplayer it plays on for the others, and your avatar stays where you stand), nothing
// can be used, and the camera floats free within a few metres of your body, which main.js shows
// in the third person. The camera cannot pass through anything solid: every move is ray-tested
// against the visible scene, so it is no use for seeing through walls or into locked places. Field of view, exposure, filters (sepia, black and
// white, grain, vignette) and hide-HUD; Save writes a PNG through a download link.
// Esc (or the Done button) returns to the game exactly where you were.
import * as THREE from 'three';

const RADIUS = 7, SKIN = 0.18, SPEED = 1.8;
const TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch { return false; } })();

export function createPhotoMode({ renderer, scene, camera, render, enter, exit }) {
  const el = document.createElement('div'); el.id = 'photo'; el.className = 'hidden';
  el.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none';
  el.innerHTML = `
    <div class="ph-fx" style="position:absolute;inset:0;pointer-events:none"></div>
    <div class="ph-panel" style="position:absolute;left:16px;top:16px;width:min(270px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;pointer-events:auto;background:rgba(8,8,10,.82);border:1px solid #3a3a36;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:14px">
      <b style="letter-spacing:.12em">PHOTO MODE</b>
      <span class="note" style="margin:0;font-size:12px">Drag to look. WASD to move, R/F (or Space/C) up and down, hold Shift to go faster, X slower. You can drift a few metres from your body, never through walls. V hides this panel. Esc to leave.</span>
      <label>Field of view <output class="ph-ofov"></output><input class="ph-fov" type="range" min="20" max="110" step="1"></label>
      <label>Exposure <output class="ph-oexp"></output><input class="ph-exp" type="range" min="0.3" max="3" step="0.05"></label>
      <label for="phFilter">Filter<select id="phFilter" class="ph-filter"><option value="none">None</option><option value="sepia">Sepia</option><option value="bw">Black &amp; white</option></select></label>
      <label class="check" style="display:flex;justify-content:space-between">Film grain<input class="ph-grain" type="checkbox"></label>
      <label class="check" style="display:flex;justify-content:space-between">Vignette<input class="ph-vig" type="checkbox"></label>
      <label class="check" style="display:flex;justify-content:space-between">Hide HUD<input class="ph-hud" type="checkbox" checked></label>
      <button class="ph-save">Save photo (PNG)</button>
      <a class="ph-link note" style="display:none;font-size:12px" download="pinned.png">Download again</a>
      <button class="ph-done">Done (Esc)</button>
    </div>
    <div class="ph-touch" style="display:none">
      <div class="ph-pad" style="position:absolute;left:16px;bottom:16px;width:132px;height:132px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.25);pointer-events:auto;touch-action:none"><div class="ph-knob" style="position:absolute;left:46px;top:46px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.35)"></div></div>
      <div style="position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;pointer-events:auto">
        <button class="ph-up" style="min-width:64px;min-height:48px;touch-action:none">Up</button>
        <button class="ph-down" style="min-width:64px;min-height:48px;touch-action:none">Down</button>
        <button class="ph-fast" style="min-width:64px;min-height:48px">Fast</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  const q = s => el.querySelector(s), fx = q('.ph-fx'), panel = q('.ph-panel');
  const opt = { fov: 72, exp: 1, filter: 'none', grain: false, vig: false, hud: true };
  let active = false, saved = null, keys = new Set(), drag = null, raf = 0, last = 0, fast = false;
  const pad = { x: 0, y: 0, id: null }, held = { up: false, down: false };
  const origin = new THREE.Vector3(), yawPitch = { yaw: 0, pitch: 0 }, ray = new THREE.Raycaster();
  ray.camera = camera;

  // live preview: CSS filters on the game canvas plus overlay layers
  const cssFilter = () => opt.filter === 'sepia' ? 'sepia(0.85) contrast(1.05)' : opt.filter === 'bw' ? 'grayscale(1) contrast(1.15)' : 'none';
  let grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 34; }
    g.putImageData(d, 0, 0); return (grainTile = c);
  }
  function applyLook() {
    camera.fov = opt.fov; camera.updateProjectionMatrix();
    renderer.toneMappingExposure = opt.exp;
    renderer.domElement.style.filter = cssFilter();
    fx.style.background = [opt.vig ? 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,.75) 100%)' : '', opt.grain ? `url(${grain().toDataURL()})` : ''].filter(Boolean).join(',');
    const hud = document.getElementById('hud'); if (hud) hud.style.visibility = opt.hud ? 'hidden' : '';
    for (const [k, i] of Object.entries(inputs || {})) { if (i.type === 'checkbox') i.checked = opt[k]; else if (i !== document.activeElement) i.value = opt[k]; }
    q('.ph-ofov').textContent = opt.fov + '°'; q('.ph-oexp').textContent = opt.exp.toFixed(2);
  }
  const bind = (sel, key, num) => { const i = q(sel); i.addEventListener('input', () => { opt[key] = i.type === 'checkbox' ? i.checked : num ? +i.value : i.value; applyLook(); }); return i; };
  var inputs = { fov: bind('.ph-fov', 'fov', 1), exp: bind('.ph-exp', 'exp', 1), filter: bind('.ph-filter', 'filter'), grain: bind('.ph-grain', 'grain'), vig: bind('.ph-vig', 'vig'), hud: bind('.ph-hud', 'hud') };
  for (const i of el.querySelectorAll('input,select')) i.addEventListener('keydown', e => { if (e.code !== 'Escape') e.stopPropagation(); });

  // ---- free camera, kept inside a small ball and out of walls ----
  const hits = (from, to) => {
    const dir = to.clone().sub(from), len = dir.length(); if (len < 1e-5) return null;
    ray.set(from, dir.divideScalar(len)); ray.far = len + SKIN;
    for (const h of ray.intersectObjects(scene.children, true)) {
      if (!h.object.isMesh) continue;
      let o = h.object, vis = true; while (o) { if (!o.visible || o.userData.photoIgnore) { vis = false; break; } o = o.parent; }
      if (vis) return h;
    }
    return null;
  };
  // each step is ray-tested from where the camera is now, so it can go round corners but never
  // through a wall; and it never strays more than RADIUS from the body
  function moveTo(target) {
    const off = target.clone().sub(origin); if (off.length() > RADIUS) off.setLength(RADIUS);
    const from = camera.position.clone(), want = origin.clone().add(off), h = hits(from, want);
    if (h) {
      // blocked: slide along the surface instead of stopping dead
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
      const d = want.clone().sub(from);
      if (n) { d.addScaledVector(n, -d.dot(n)); const w2 = from.clone().add(d); if (d.lengthSq() > 1e-8 && !hits(from, w2)) { camera.position.copy(w2); return; } }
      want.copy(from).addScaledVector(want.clone().sub(from).normalize(), Math.max(0, h.distance - SKIN));
    }
    camera.position.copy(want);
  }
  function tick(ms) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ms - (last || ms)) / 1000); last = ms;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - pad.y;
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + pad.x;
    const u = (keys.has('KeyR') || keys.has('Space') || held.up ? 1 : 0) - (keys.has('KeyF') || keys.has('KeyC') || held.down ? 1 : 0);
    if (f || s || u) {
      const k = SPEED * dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') || fast ? 3 : 1) * (keys.has('KeyX') ? 0.25 : 1);
      // fly where you look (W toward the floor if you look down); up/down is straight up and down
      const fwd = new THREE.Vector3(), right = new THREE.Vector3();
      camera.getWorldDirection(fwd); right.crossVectors(fwd, camera.up).normalize();
      const step = new THREE.Vector3().addScaledVector(fwd, f * k).addScaledVector(right, s * k).addScaledVector(camera.up, u * k);
      // in small steps, so a fast move cannot tunnel through a thin wall
      const n = Math.max(1, Math.ceil(step.length() / 0.12)); step.divideScalar(n);
      for (let i = 0; i < n; i++) moveTo(camera.position.clone().add(step));
    }
    camera.rotation.set(yawPitch.pitch, yawPitch.yaw, 0, 'YXZ');
  }
  const canvas = renderer.domElement;
  const down = e => { if (active && e.target === canvas && !drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const move = e => {
    if (!active || !drag || e.pointerId !== drag.id) return;
    yawPitch.yaw -= (e.clientX - drag.x) * 0.004; yawPitch.pitch = THREE.MathUtils.clamp(yawPitch.pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5);
    drag.x = e.clientX; drag.y = e.clientY;
  };
  const up = e => { if (drag && e.pointerId === drag.id) drag = null; };
  addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  // ---- touch: a joystick to fly, Up / Down held, Fast toggles ----
  const tpad = q('.ph-pad'), knob = q('.ph-knob'), PR = 66;
  const padAt = e => { const r = tpad.getBoundingClientRect(); let dx = e.clientX - (r.left + PR), dy = e.clientY - (r.top + PR); const d = Math.hypot(dx, dy); if (d > PR) { dx *= PR / d; dy *= PR / d; } pad.x = Math.abs(dx) < 10 ? 0 : dx / PR; pad.y = Math.abs(dy) < 10 ? 0 : dy / PR; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  const padEnd = e => { if (e.pointerId !== pad.id) return; pad.id = null; pad.x = pad.y = 0; knob.style.transform = ''; };
  tpad.addEventListener('pointerdown', e => { e.preventDefault(); pad.id = e.pointerId; try { tpad.setPointerCapture(e.pointerId); } catch { /* fine */ } padAt(e); });
  tpad.addEventListener('pointermove', e => { if (e.pointerId === pad.id) padAt(e); });
  tpad.addEventListener('pointerup', padEnd); tpad.addEventListener('pointercancel', padEnd);
  for (const [cls, k] of [['.ph-up', 'up'], ['.ph-down', 'down']]) {
    const b = q(cls);
    b.addEventListener('pointerdown', e => { e.preventDefault(); held[k] = true; });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { held[k] = false; });
  }
  q('.ph-fast').onclick = () => { fast = !fast; q('.ph-fast').style.outline = fast ? '2px solid #d8c890' : ''; };
  addEventListener('keydown', e => {
    if (!active) return;
    if (e.code === 'Escape' || e.code === 'KeyK') { e.preventDefault(); e.stopImmediatePropagation(); stop(); return; }
    if (e.code === 'KeyV') { panel.style.display = panel.style.display === 'none' ? '' : 'none'; }
    keys.add(e.code); e.stopImmediatePropagation();
  }, true);
  addEventListener('keyup', e => { keys.delete(e.code); });

  // ---- save: render once, read the canvas immediately, bake the filters into a 2D copy ----
  function shot() {
    render();
    const src = renderer.domElement, w = src.width, h = src.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.filter = cssFilter(); g.drawImage(src, 0, 0); g.filter = 'none';
    if (opt.vig) { const r = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) / 2); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.78)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }
    if (opt.grain) { g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, w, h); }
    const url = c.toDataURL('image/png'), name = `pinned-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`;
    // inside claude.ai the page cannot download directly: hand the file to the viewer's save prompt
    if (downloads) { c.toBlob(blob => { downloads.save({ filename: name, data: blob }).catch(() => {}); }, 'image/png'); return url; }
    const a = q('.ph-link'); a.href = url; a.download = name; a.style.display = '';
    a.click();
    return url;
  }
  let downloads = null;
  try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {}); } catch { /* not in claude.ai */ }
  q('.ph-save').onclick = shot;
  q('.ph-done').onclick = () => stop();

  function start() {
    if (active) return false;
    if (enter() === false) return false;
    active = true;
    saved = { fov: camera.fov, exp: renderer.toneMappingExposure, pos: camera.position.clone(), rot: camera.rotation.clone() };
    origin.copy(camera.position); yawPitch.yaw = camera.rotation.y; yawPitch.pitch = camera.rotation.x;
    if (camera.rotation.order !== 'YXZ') { const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); yawPitch.yaw = e.y; yawPitch.pitch = e.x; }
    opt.fov = Math.round(camera.fov); opt.exp = +saved.exp.toFixed(2);
    for (const [k, i] of Object.entries(inputs)) { if (i.type === 'checkbox') i.checked = opt[k]; else i.value = opt[k]; }
    el.classList.remove('hidden'); panel.style.display = ''; q('.ph-link').style.display = 'none';
    q('.ph-touch').style.display = TOUCH ? '' : 'none'; canvas.style.touchAction = 'none';
    pad.id = null; pad.x = pad.y = 0; held.up = held.down = false; knob.style.transform = '';
    // step back and up a little, so your body is in view from the start
    { const back = new THREE.Vector3(); camera.getWorldDirection(back); back.y = 0; if (back.lengthSq() > 1e-6) { back.normalize().multiplyScalar(-0.12); const up = new THREE.Vector3(0, 0.03, 0); for (let i = 0; i < 14; i++) moveTo(camera.position.clone().add(back).add(up)); } }
    applyLook(); keys.clear(); last = 0; raf = requestAnimationFrame(tick);
    return true;
  }
  function stop() {
    if (!active) return;
    active = false; cancelAnimationFrame(raf); keys.clear(); drag = null;
    camera.fov = saved.fov; camera.updateProjectionMatrix(); renderer.toneMappingExposure = saved.exp;
    camera.position.copy(saved.pos); camera.rotation.copy(saved.rot);
    renderer.domElement.style.filter = ''; fx.style.background = ''; canvas.style.touchAction = '';
    const hud = document.getElementById('hud'); if (hud) hud.style.visibility = '';
    el.classList.add('hidden'); exit();
  }
  return { start, stop, shot, get active() { return active; }, options: opt, apply: applyLook, moveTo: v => moveTo(new THREE.Vector3(...v)), origin };
}
