// Photo mode (K, or the pause menu): the game freezes and the camera floats free within a
// small radius of where you stood. The camera cannot pass through anything solid: every move
// is ray-tested from the player's eye against the visible scene, so it is no use for seeing
// through walls or into locked places. Field of view, exposure, filters (sepia, black and
// white, grain, vignette) and hide-HUD; Save writes a PNG through a download link.
// Esc (or the Done button) returns to the game exactly where you were.
import * as THREE from 'three';

const RADIUS = 1.5, SKIN = 0.18;

export function createPhotoMode({ renderer, scene, camera, render, enter, exit }) {
  const el = document.createElement('div'); el.id = 'photo'; el.className = 'hidden';
  el.style.cssText = 'position:fixed;inset:0;z-index:15;pointer-events:none';
  el.innerHTML = `
    <div class="ph-fx" style="position:absolute;inset:0;pointer-events:none"></div>
    <div class="ph-panel" style="position:absolute;left:16px;top:16px;width:min(270px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;pointer-events:auto;background:rgba(8,8,10,.82);border:1px solid #3a3a36;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:14px">
      <b style="letter-spacing:.12em">PHOTO MODE</b>
      <span class="note" style="margin:0;font-size:12px">Drag to look. WASD to move, R/F up and down (a short way, not through walls). V hides this panel. Esc to leave.</span>
      <label>Field of view <output class="ph-ofov"></output><input class="ph-fov" type="range" min="20" max="110" step="1"></label>
      <label>Exposure <output class="ph-oexp"></output><input class="ph-exp" type="range" min="0.3" max="3" step="0.05"></label>
      <label for="phFilter">Filter<select id="phFilter" class="ph-filter"><option value="none">None</option><option value="sepia">Sepia</option><option value="bw">Black &amp; white</option></select></label>
      <label class="check" style="display:flex;justify-content:space-between">Film grain<input class="ph-grain" type="checkbox"></label>
      <label class="check" style="display:flex;justify-content:space-between">Vignette<input class="ph-vig" type="checkbox"></label>
      <label class="check" style="display:flex;justify-content:space-between">Hide HUD<input class="ph-hud" type="checkbox" checked></label>
      <button class="ph-save">Save photo (PNG)</button>
      <a class="ph-link note" style="display:none;font-size:12px" download="pinned.png">Download again</a>
      <button class="ph-done">Done (Esc)</button>
    </div>`;
  document.body.appendChild(el);
  const q = s => el.querySelector(s), fx = q('.ph-fx'), panel = q('.ph-panel');
  const opt = { fov: 72, exp: 1, filter: 'none', grain: false, vig: false, hud: true };
  let active = false, saved = null, keys = new Set(), drag = null, raf = 0, last = 0;
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
      let o = h.object, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
      if (vis) return h;
    }
    return null;
  };
  function moveTo(target) {
    const off = target.clone().sub(origin); if (off.length() > RADIUS) off.setLength(RADIUS);
    const want = origin.clone().add(off), h = hits(origin, want);
    if (h) want.copy(origin).addScaledVector(want.clone().sub(origin).normalize(), Math.max(0, h.distance - SKIN));
    camera.position.copy(want);
  }
  function tick(ms) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ms - (last || ms)) / 1000); last = ms;
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const u = (keys.has('KeyR') ? 1 : 0) - (keys.has('KeyF') ? 1 : 0);
    if (f || s || u) {
      const fwd = new THREE.Vector3(), right = new THREE.Vector3();
      camera.getWorldDirection(fwd); right.crossVectors(fwd, camera.up).normalize();
      moveTo(camera.position.clone().addScaledVector(fwd, f * dt * 1.2).addScaledVector(right, s * dt * 1.2).addScaledVector(camera.up, u * dt * 1.2));
    }
    camera.rotation.set(yawPitch.pitch, yawPitch.yaw, 0, 'YXZ');
  }
  const canvas = renderer.domElement;
  const down = e => { if (active && e.target === canvas) drag = { x: e.clientX, y: e.clientY }; };
  const move = e => {
    if (!active || !drag) return;
    yawPitch.yaw -= (e.clientX - drag.x) * 0.004; yawPitch.pitch = THREE.MathUtils.clamp(yawPitch.pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5);
    drag = { x: e.clientX, y: e.clientY };
  };
  addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', () => { drag = null; });
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
    const url = c.toDataURL('image/png');
    const a = q('.ph-link'); a.href = url; a.download = `pinned-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`; a.style.display = '';
    a.click();
    return url;
  }
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
    applyLook(); keys.clear(); last = 0; raf = requestAnimationFrame(tick);
    return true;
  }
  function stop() {
    if (!active) return;
    active = false; cancelAnimationFrame(raf); keys.clear(); drag = null;
    camera.fov = saved.fov; camera.updateProjectionMatrix(); renderer.toneMappingExposure = saved.exp;
    camera.position.copy(saved.pos); camera.rotation.copy(saved.rot);
    renderer.domElement.style.filter = ''; fx.style.background = '';
    const hud = document.getElementById('hud'); if (hud) hud.style.visibility = '';
    el.classList.add('hidden'); exit();
  }
  return { start, stop, shot, get active() { return active; }, options: opt, apply: applyLook, moveTo: v => moveTo(new THREE.Vector3(...v)), origin };
}
