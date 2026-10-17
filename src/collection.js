// The Collection: a Victorian glass-fronted specimen cabinet, opened from the home screen.
// One drawer per moth in the game (counted from MOTH_NOTES, so moths added elsewhere get a
// drawer automatically). Moths ever picked up in any save slot are pinned with a handwritten
// label; the rest are an empty pin over a faint outline and a "?" card. Click a drawer to
// read its journal text. It has its own small renderer and only runs while open.
import * as THREE from 'three';
import { SPECIES, drawSpecimenFit, drawLabel, drawPin } from './moths.js';
import { MOTH_NOTES } from './mothNotes.js';
import { everMoths } from './storage.js';

const CELL = 0.24, BORDER = 0.09, DEPTH = 0.16, TEX = 256;

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function linen(g, w, h, rnd) {
  g.fillStyle = '#c4b896'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(90,70,40,${rnd() * 0.06})`; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,250,230,${rnd() * 0.05})`; g.fillRect(x, 0, 1, h); }
  for (let i = 0; i < 4; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(110,80,40,0.16)'); gr.addColorStop(1, 'rgba(110,80,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const sh = g.createLinearGradient(0, 0, 0, 40); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(0, 0, w, 40);
}
const rng = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

// one drawer's backing: the pinned specimen and its label, or an empty pin and a "?"
function cellTexture(note, have, i) {
  const c = canvas(TEX, TEX), g = c.getContext('2d');
  linen(g, TEX, TEX, rng(i * 97 + 13));
  if (have) {
    drawSpecimenFit(g, note.key, 18, 8, TEX - 36, 165);
    drawLabel(g, note.key, TEX / 2, 182, 158, 'Coll. Ord. P.W.');
  } else {
    const t = canvas(TEX, TEX), tg = t.getContext('2d');
    drawSpecimenFit(tg, note.key, 18, 8, TEX - 36, 165, { pin: false });
    tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgba(60,42,22,0.2)'; tg.fillRect(0, 0, TEX, TEX);
    g.drawImage(t, 0, 0);
    g.save(); g.translate(TEX / 2 - 8, 92); drawPin(g, 3.2); g.restore();
    const w = 104, h = 46, x = TEX / 2 - w / 2, y = 192;
    g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = '#e6dcc2'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(60,40,20,0.4)'; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = '#5a4630'; g.font = 'italic 34px "Segoe Script", "Lucida Handwriting", Georgia, cursive';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', TEX / 2, y + h / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

function woodTexture() {
  const c = canvas(512, 512), g = c.getContext('2d'), r = rng(5);
  const base = g.createLinearGradient(0, 0, 512, 512); base.addColorStop(0, '#4a2c18'); base.addColorStop(0.5, '#3a2212'); base.addColorStop(1, '#24140a');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) {
    const y = r() * 512; g.strokeStyle = `rgba(${r() < 0.5 ? '10,5,2' : '120,70,35'},${0.08 + r() * 0.15})`; g.lineWidth = 0.5 + r() * 1.5;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 14, 340, y + (r() - 0.5) * 14, 512, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function plateTexture(text) {
  const c = canvas(1024, 96), g = c.getContext('2d');
  const b = g.createLinearGradient(0, 0, 0, 96); b.addColorStop(0, '#c8a458'); b.addColorStop(0.45, '#8a6a30'); b.addColorStop(1, '#5a4218');
  g.fillStyle = b; g.fillRect(0, 0, 1024, 96);
  g.strokeStyle = 'rgba(255,230,170,0.4)'; g.lineWidth = 3; g.strokeRect(6, 6, 1012, 84);
  g.fillStyle = '#2a1c0a'; g.font = '44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createCollection() {
  const el = document.createElement('div'); el.id = 'collection'; el.className = 'screen hidden'; el.style.cssText = 'z-index:25;background:#050403';
  el.innerHTML = `<canvas class="co-canvas" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab"></canvas>
    <div style="position:absolute;top:12px;left:0;right:0;text-align:center;pointer-events:none;padding:0 16px">
      <h2 style="margin:0">The Collection</h2><p class="note co-count" style="margin:2px 0 0"></p>
      <p class="note" style="margin:2px 0 0;opacity:.7;font-size:13px">Every moth found, in any save. Drag to look, scroll to lean in, click a drawer to read it.</p></div>
    <div class="co-info hidden" style="position:absolute;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));max-height:45vh;overflow:auto;background:rgba(10,8,6,.88);border:1px solid #5a4a30;padding:12px 14px;text-align:left">
      <h3 class="co-name" style="margin:0;font-weight:normal;letter-spacing:.06em"></h3><em class="co-latin" style="opacity:.7;font-size:14px"></em>
      <p class="co-text" style="line-height:1.5;font-size:15px;margin:8px 0 0"></p></div>
    <button class="co-back" style="position:absolute;left:16px;bottom:16px">Back</button>`;
  document.body.appendChild(el);
  const cv = el.querySelector('.co-canvas'), info = el.querySelector('.co-info');
  let renderer = null, scene, camera, cab, cells = [], raf = 0, onClose = null;
  const view = { yaw: 0, pitch: 0, zoom: 1, ty: 0, tx: 0, cur: new THREE.Vector3(), aim: new THREE.Vector3(), sel: -1 };
  let size = { w: 1, h: 1 };

  function disposeScene() {
    if (!scene) return;
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { for (const m of [].concat(o.material)) { if (m.map) m.map.dispose(); m.dispose(); } } });
    scene = null; cells = [];
  }

  function build() {
    disposeScene();
    const have = everMoths(), notes = MOTH_NOTES.filter(n => SPECIES[n.key]);
    const n = notes.length, cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.7))), rows = Math.ceil(n / cols);
    const found = notes.filter(x => have.has(x.id)).length;
    el.querySelector('.co-count').textContent = `${found} of ${n} moths collected`;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x050403); scene.fog = new THREE.Fog(0x050403, 4, 12);
    const iw = cols * CELL, ih = rows * CELL, W = iw + 2 * BORDER, H = ih + 2 * BORDER;
    cab = new THREE.Group(); scene.add(cab);
    const wt = woodTexture(), wood = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.55, metalness: 0.05 });
    const box = (w, h, d, x, y, z, m = wood) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); cab.add(b); return b; };
    // carcass: back, sides, top, bottom, a moulded cornice and plinth
    box(W, H, 0.03, 0, 0, -DEPTH / 2 - 0.015);
    box(BORDER, H, DEPTH, -W / 2 + BORDER / 2, 0, 0); box(BORDER, H, DEPTH, W / 2 - BORDER / 2, 0, 0);
    box(W, BORDER, DEPTH, 0, H / 2 - BORDER / 2, 0); box(W, BORDER, DEPTH, 0, -H / 2 + BORDER / 2, 0);
    box(W + 0.08, 0.05, DEPTH + 0.08, 0, H / 2 + 0.025, 0.02); box(W + 0.14, 0.035, DEPTH + 0.12, 0, H / 2 + 0.065, 0.03);
    box(W * 0.4, 0.09, 0.05, 0, H / 2 + 0.12, -0.02);
    box(W + 0.06, 0.08, DEPTH + 0.06, 0, -H / 2 - 0.04, 0.01);
    for (const sx of [-1, 1]) box(0.06, 0.5, 0.06, sx * (W / 2 - 0.05), -H / 2 - 0.33, 0);
    // drawer dividers and gilt slip
    const div = new THREE.MeshStandardMaterial({ color: 0x2a180c, roughness: 0.7 });
    for (let c = 1; c < cols; c++) box(0.012, ih, DEPTH * 0.8, -iw / 2 + c * CELL, 0, -0.01, div);
    for (let r = 1; r < rows; r++) box(iw, 0.012, DEPTH * 0.8, 0, ih / 2 - r * CELL, -0.01, div);
    const gilt = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.35 });
    box(iw + 0.012, 0.008, 0.01, 0, ih / 2, DEPTH / 2 - 0.01, gilt); box(iw + 0.012, 0.008, 0.01, 0, -ih / 2, DEPTH / 2 - 0.01, gilt);
    box(0.008, ih, 0.01, -iw / 2, 0, DEPTH / 2 - 0.01, gilt); box(0.008, ih, 0.01, iw / 2, 0, DEPTH / 2 - 0.01, gilt);
    // the specimens
    const pg = new THREE.PlaneGeometry(CELL - 0.016, CELL - 0.016);
    notes.forEach((note, i) => {
      const c = i % cols, r = Math.floor(i / cols), got = have.has(note.id);
      const m = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: cellTexture(note, got, i), roughness: 0.9, emissive: 0xffd9a0, emissiveIntensity: 0 }));
      m.position.set(-iw / 2 + (c + 0.5) * CELL, ih / 2 - (r + 0.5) * CELL, -DEPTH / 2 + 0.002);
      m.userData = { note, got, i }; cab.add(m); cells.push(m);
    });
    // brass plate on the plinth
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(W * 0.6, 0.9), Math.min(W * 0.6, 0.9) * 96 / 1024),
      new THREE.MeshStandardMaterial({ map: plateTexture('THE ORDER OF THE PALE WING · COLLECTION'), metalness: 0.6, roughness: 0.4 }));
    plate.position.set(0, -H / 2 - 0.04, DEPTH / 2 + 0.042); cab.add(plate);
    // the glass, with two faint reflection streaks
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), new THREE.MeshPhysicalMaterial({ color: 0xcfd8d0, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0, depthWrite: false }));
    glass.position.z = DEPTH / 2 - 0.004; cab.add(glass);
    for (const [x, w, o] of [[-0.2, 0.16, 0.05], [0.05, 0.05, 0.035]]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(iw * w, ih * 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: o, depthWrite: false }));
      s.position.set(iw * x, 0, DEPTH / 2 - 0.003); s.rotation.z = -0.35; s.scale.y = 0.85;
      s.material.clippingPlanes = null; cab.add(s);
    }
    // a dim study: warm lamp from above-left, a cold fill, a faint floor
    scene.add(new THREE.AmbientLight(0x403028, 0.6));
    const lamp = new THREE.SpotLight(0xffd8a0, 30, 12, 0.7, 0.6, 1.6); lamp.position.set(-1.2, H / 2 + 1.4, 2.4); lamp.target = cab; scene.add(lamp);
    const fill = new THREE.PointLight(0x8090b0, 2, 8); fill.position.set(2, 0, 2); scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -H / 2 - 0.58; scene.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 }));
    wall.position.z = -DEPTH / 2 - 0.4; scene.add(wall);
    cab.userData = { W, H, iw, ih };
    view.sel = -1; view.aim.set(0, 0.03, 0); view.cur.copy(view.aim); view.zoom = 1; info.classList.add('hidden');
  }

  function fitDistance() {
    const { W, H } = cab.userData, f = THREE.MathUtils.degToRad(camera.fov / 2);
    const dh = (H / 2 + 0.25) / Math.tan(f), dw = (W / 2 + 0.12) / (Math.tan(f) * camera.aspect);
    return Math.max(dh, dw) * 1.08;
  }

  function resize() {
    if (!renderer) return;
    size = { w: innerWidth, h: innerHeight };
    renderer.setSize(size.w, size.h, false); camera.aspect = size.w / size.h; camera.updateProjectionMatrix();
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    view.cur.lerp(view.aim, 0.12);
    cab.rotation.y += (view.yaw - cab.rotation.y) * 0.12; cab.rotation.x += (view.pitch - cab.rotation.x) * 0.12;
    const d = fitDistance() * view.zoom;
    camera.position.set(view.cur.x, view.cur.y, d); camera.lookAt(view.cur.x, view.cur.y, 0);
    for (const m of cells) { const k = m.userData.i === view.sel ? 0.12 : m === hover ? 0.06 : 0; m.material.emissiveIntensity += (k - m.material.emissiveIntensity) * 0.2; }
    renderer.render(scene, camera);
  }

  // input: drag to tilt the cabinet, wheel to lean in, click a drawer to read it
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null, hover = null;
  const pick = e => {
    const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(cells, false)[0]; return h ? h.object : null;
  };
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: false }; cv.style.cursor = 'grabbing'; });
  addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null; cv.style.cursor = 'grab';
    if (!d.moved && renderer && e.target === cv) select(pick(e));
  });
  cv.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      view.yaw = THREE.MathUtils.clamp(drag.yaw + dx * 0.004, -0.45, 0.45); view.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.003, -0.25, 0.25);
    } else if (renderer) { hover = pick(e); cv.style.cursor = hover ? 'pointer' : 'grab'; }
  });
  cv.addEventListener('wheel', e => { e.preventDefault(); view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.3, 1.2); }, { passive: false });

  function select(m) {
    if (!m || m.userData.i === view.sel) { view.sel = -1; view.aim.set(0, 0.03, 0); view.zoom = 1; info.classList.add('hidden'); return; }
    const { note, got, i } = m.userData, sp = SPECIES[note.key];
    view.sel = i; view.aim.set(m.position.x, m.position.y, 0); view.zoom = Math.min(view.zoom, 0.45); view.yaw = view.pitch = 0;
    el.querySelector('.co-name').textContent = got ? sp.common : 'Not yet found';
    el.querySelector('.co-latin').textContent = got ? sp.latin : '';
    el.querySelector('.co-text').textContent = got ? note.text : 'An empty pin. Somewhere in the house there is a moth that belongs here.';
    info.classList.remove('hidden');
  }

  function open(cb) {
    onClose = cb;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
      camera = new THREE.PerspectiveCamera(40, 1, 0.05, 30);
    }
    build(); el.classList.remove('hidden'); resize();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  function close() {
    if (el.classList.contains('hidden')) return;
    el.classList.add('hidden'); cancelAnimationFrame(raf); disposeScene();
    if (onClose) onClose();
  }
  el.querySelector('.co-back').onclick = close;
  addEventListener('resize', resize);
  addEventListener('keydown', e => { if (e.code === 'Escape' && !el.classList.contains('hidden')) { e.stopImmediatePropagation(); close(); } }, true);
  return { open, close, select: i => select(cells[i]), get isOpen() { return !el.classList.contains('hidden'); }, get count() { return cells.length; } };
}
