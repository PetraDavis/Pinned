// The Mother: the cult leader's wife, half-emerged from a giant cocoon in the attic.
// Human-faced, but too-large dark eyes, pale fuzz and a powdery sheen; huge dusty
// wings folded round her like a cloak. Preview-only for now: not used by the game.
import * as THREE from 'three';

const rnd = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------- textures ----------
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// A dusty, unidentified moth wing: ash and umber, a faint hollow eyespot, wavy
// cross-lines, scale strokes, and a scalloped, frayed edge (alpha)
function wingTextures(seed) {
  const r = rnd(seed), W = 1024, H = 1280;
  const shape = g => { // spine along the left edge (x=0), tip at the bottom right
    g.beginPath(); g.moveTo(0, 30);
    g.bezierCurveTo(W * 0.5, -10, W * 0.95, 80, W * 0.98, H * 0.35);
    g.bezierCurveTo(W * 1.0, H * 0.6, W * 0.9, H * 0.85, W * 0.62, H * 0.97);
    // scalloped trailing edge
    const n = 9; for (let i = 0; i <= n; i++) { const t = i / n, x = W * 0.62 * (1 - t), y = H * (0.97 - 0.05 * Math.sin(t * Math.PI)); g.quadraticCurveTo(x + W * 0.04, y + 26, x, y); }
    g.lineTo(0, H * 0.9); g.closePath();
  };
  const color = canvas(W, H, (g) => {
    g.save(); shape(g); g.clip();
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#8a8074'); gr.addColorStop(0.45, '#a49a8c'); gr.addColorStop(1, '#6e665c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // darker basal area and a pale submarginal band
    g.fillStyle = 'rgba(60,50,40,0.35)'; g.beginPath(); g.ellipse(0, H * 0.45, W * 0.32, H * 0.5, 0, 0, 7); g.fill();
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = k === 1 ? 'rgba(220,210,190,0.35)' : 'rgba(40,32,26,0.45)'; g.lineWidth = k === 1 ? 18 : 6;
      g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, x = W * (0.25 + k * 0.18) + Math.sin(t * 18 + k) * 14, y = t * H * 0.95; i ? g.lineTo(x + t * W * 0.25, y) : g.moveTo(x, y); } g.stroke();
    }
    // the hollow eyespot: dark ring, pale centre, a faint second ring
    const ex = W * 0.58, ey = H * 0.42;
    for (const [rad, col] of [[120, 'rgba(50,40,34,0.55)'], [86, 'rgba(170,150,120,0.45)'], [60, 'rgba(30,22,18,0.7)'], [30, 'rgba(225,215,195,0.6)']]) { g.fillStyle = col; g.beginPath(); g.ellipse(ex, ey, rad, rad * 1.2, 0.3, 0, 7); g.fill(); }
    // veins
    g.strokeStyle = 'rgba(40,30,24,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const a = 0.1 + i * 0.16; g.beginPath(); g.moveTo(0, H * 0.12); g.quadraticCurveTo(W * 0.3 * Math.cos(a), H * 0.3, W * Math.cos(a) * 1.1, H * (0.15 + Math.sin(a) * 0.85)); g.stroke(); }
    // scales: tiny overlapping strokes, and powder
    for (let i = 0; i < 60000; i++) { const x = r() * W, y = r() * H; g.fillStyle = r() < 0.5 ? `rgba(30,24,20,${r() * 0.18})` : `rgba(235,228,214,${r() * 0.16})`; g.fillRect(x, y, 3, 1.5); }
    // worn, rubbed patches where the scales have come away
    for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rad = 20 + r() * 70; const gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(190,180,165,0.35)'); gg.addColorStop(1, 'rgba(190,180,165,0)'); g.fillStyle = gg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    g.restore();
  });
  const alpha = canvas(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; shape(g); g.fill();
    // frayed edge and a few small tears
    g.fillStyle = '#000';
    for (let i = 0; i < 40; i++) { const t = r(), x = W * 0.62 * (1 - t) + (r() - 0.5) * 30, y = H * (0.97 - 0.05 * Math.sin(t * Math.PI)) - r() * 18; g.beginPath(); g.ellipse(x, y, 4 + r() * 8, 3 + r() * 10, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) { g.beginPath(); const x = W * (0.3 + r() * 0.5), y = H * (0.5 + r() * 0.4); g.moveTo(x, y); g.lineTo(x + 8, y - 60 - r() * 60); g.lineTo(x + 16, y); g.fill(); }
  });
  return { map: tex(color), alphaMap: tex(alpha, false) };
}

function silkTexture(seed) {
  const r = rnd(seed);
  return tex(canvas(512, 1024, (g, w, h) => {
    g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '250,245,232' : '120,108,90'},${0.08 + r() * 0.18})`; g.lineWidth = 0.5 + r() * 1.5;
      const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 60, x + (r() - 0.5) * 120, y + (r() - 0.5) * 60, x + (r() - 0.5) * 200, y + (r() - 0.5) * 80); g.stroke();
    }
    // stains seeping from inside
    for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 100; const gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(120,96,60,0.25)'); gg.addColorStop(1, 'rgba(120,96,60,0)'); g.fillStyle = gg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
  }));
}

// fuzz: shell layers with sparse opaque dots make short, soft pile
function fuzzAlpha(seed, density = 0.35) {
  const r = rnd(seed);
  return tex(canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    for (let i = 0; i < w * h * density / 6; i++) g.fillRect(r() * w, r() * h, 1.5, 1.5);
  }), false);
}

function skinTexture() {
  const r = rnd(9);
  return tex(canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#e6ddd2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '170,150,140' : '255,252,246'},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 1); }
    // faint veins under translucent skin
    g.strokeStyle = 'rgba(120,130,160,0.12)'; g.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += r() * 40; g.lineTo(x, y); } g.stroke(); }
  }));
}

// ---------- head ----------
function headShape(nx, ny, nz) {
  // long, narrow, high cheekbones, small chin
  let x = nx * 0.078, y = ny * 0.122, z = nz * 0.095;
  if (ny < 0) { const k = 1 - 0.45 * Math.pow(-ny, 1.5); x *= k; z *= 1 - 0.2 * Math.pow(-ny, 2); }
  if (nz > 0) {
    z *= 1 - 0.12 * nz;
    const g = (cx, cy, sx, sy) => Math.exp(-(((nx - cx) / sx) ** 2) - (((ny - cy) / sy) ** 2)) * nz;
    z += 0.009 * g(0, -0.12, 0.07, 0.13) + 0.004 * g(0, -0.26, 0.09, 0.05);
    z -= 0.012 * (g(0.36, 0.1, 0.22, 0.15) + g(-0.36, 0.1, 0.22, 0.15)); // deep orbits for the big eyes
    z += 0.005 * (g(0.52, -0.08, 0.14, 0.12) + g(-0.52, -0.08, 0.14, 0.12));
    z += 0.004 * g(0, -0.82, 0.16, 0.1);
  }
  return [x, y, z];
}
function headGeo() {
  const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = headShape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, ...v); }
  g.computeVertexNormals(); return g;
}
function surfZ(x, y) {
  let best = 0, bd = 1e9;
  for (let a = -1; a <= 1; a += 0.015) for (let b = -1; b <= 1; b += 0.015) { const q = 1 - a * a - b * b; if (q <= 0) continue; const v = headShape(a, b, Math.sqrt(q)), d = (v[0] - x) ** 2 + (v[1] - y) ** 2; if (d < bd) { bd = d; best = v[2]; } }
  return best;
}

// shell fuzz over a mesh: several slightly inflated copies with dotted alpha
function addFuzz(mesh, { layers = 7, depth = 0.012, color = 0xeee8dc, density = 0.3, seed = 1 } = {}) {
  const alphaMap = fuzzAlpha(seed, density);
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping; alphaMap.repeat.set(3, 3);
  for (let i = 1; i <= layers; i++) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, alphaMap, alphaTest: 0.5 + (i / layers) * 0.3, transparent: false });
    const shell = new THREE.Mesh(mesh.geometry, m);
    const k = 1 + (depth / 0.1) * (i / layers);
    shell.scale.setScalar(k); mesh.add(shell);
  }
}

// ---------- the figure ----------
export function buildMother({ quality = 'high' } = {}) {
  const root = new THREE.Group();
  const r = rnd(5);
  const skin = new THREE.MeshPhysicalMaterial({ map: skinTexture(), color: 0xf0e8de, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xfff6e8), sheenRoughness: 0.35, clearcoat: 0.05 });
  const silk = silkTexture(3); silk.wrapS = silk.wrapT = THREE.RepeatWrapping; silk.repeat.set(3, 1);
  const silkMat = new THREE.MeshPhysicalMaterial({ map: silk, color: 0xb8b4ac, roughness: 0.8, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4 });

  // ---- the cocoon: a vast spindle of silk, split open at the top; she rises from it ----
  const cocoon = new THREE.Group(); root.add(cocoon);
  const prof = []; for (let i = 0; i <= 40; i++) { const t = i / 40, y = t * 2.3; const rr = Math.sin(Math.pow(t, 0.8) * Math.PI) * 0.78 + 0.02; prof.push(new THREE.Vector2(rr * (t > 0.85 ? 1 + (t - 0.85) * 1.2 : 1), y)); }
  const lathe = new THREE.LatheGeometry(prof, 96);
  // tear the rim: lower vertices near the top unevenly, and bulge the silk
  const lp = lathe.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i), a = Math.atan2(z, x);
    const n = Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + 1) * 0.3 + Math.sin(a * 23 + 2) * 0.2;
    let ny = y; if (y > 1.75) ny = 1.75 + (y - 1.75) * (0.6 + 0.4 * n) - (Math.cos(a - Math.PI / 2) > 0.3 ? (y - 1.75) * 0.9 : 0);
    const bulge = 1 + 0.04 * Math.sin(y * 9 + a * 3) + 0.03 * Math.sin(a * 11);
    lp.setXYZ(i, x * bulge, ny, z * bulge);
  }
  lathe.computeVertexNormals();
  const shell = new THREE.Mesh(lathe, silkMat); shell.position.y = 0.0; shell.castShadow = shell.receiveShadow = true; cocoon.add(shell);
  // silk strands anchoring it to the rafters and floor
  const strand = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, y0 = 0.4 + r() * 1.5, up = r() < 0.6;
    const p0 = new THREE.Vector3(Math.cos(a) * 0.7, y0, Math.sin(a) * 0.7);
    const p2 = up ? new THREE.Vector3(Math.cos(a) * (1.2 + r()), 4.2, Math.sin(a) * (1.2 + r())) : new THREE.Vector3(Math.cos(a) * (1.4 + r() * 1.5), 0, Math.sin(a) * (1.4 + r() * 1.5));
    const p1 = p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, up ? -0.3 : 0.2, 0));
    cocoon.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 20, 0.0018 + r() * 0.002, 4), strand));
  }

  // ---- her body, from the hips up, leaning slightly forward out of the silk ----
  const body = new THREE.Group(); body.position.set(0, 1.55, 0.05); body.rotation.x = 0.12; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 10, 24), skin); torso.scale.set(1.05, 1, 0.68); torso.position.y = 0.35; body.add(torso);
  addFuzz(torso, { depth: 0.008, density: 0.18, seed: 4 });
  // the remains of a nightgown, wet with silk
  const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.35, 32, 6, true), new THREE.MeshPhysicalMaterial({ color: 0xd8d0c4, roughness: 0.7, transparent: true, opacity: 0.85, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) }));
  gown.scale.z = 0.72; gown.position.y = 0.18; body.add(gown);
  // a ruff of pale fuzz at the throat and over the shoulders, moth-like
  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.07, 16, 40), new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 1 }));
  ruff.rotation.x = Math.PI / 2; ruff.scale.set(1.3, 0.85, 1); ruff.position.y = 0.66; body.add(ruff);
  addFuzz(ruff, { depth: 0.03, layers: 9, density: 0.4, seed: 7 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.16, 20), skin); neck.position.y = 0.77; body.add(neck);
  // arms: thin, long; one hand on the rim of the cocoon, one raised to her breast
  const limb = (a, b, rad) => { const d = b.clone().sub(a); const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, d.length(), 6, 12), skin); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); body.add(m); return m; };
  const finger = (base, dir, n = 4) => { for (let i = 0; i < n; i++) { const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (i - 1.5) * 0.12); limb(base.clone().add(new THREE.Vector3((i - 1.5) * 0.016, 0, 0)), base.clone().add(new THREE.Vector3((i - 1.5) * 0.016, 0, 0)).add(d.multiplyScalar(0.085 + (i === 1 || i === 2 ? 0.015 : 0))), 0.0065); } };
  const shL = new THREE.Vector3(-0.2, 0.62, 0), elL = new THREE.Vector3(-0.36, 0.3, 0.18), haL = new THREE.Vector3(-0.42, 0.08, 0.42);
  limb(shL, elL, 0.034); limb(elL, haL, 0.028);
  const palmL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skin); palmL.scale.set(1, 0.4, 1.2); palmL.position.copy(haL); body.add(palmL);
  finger(haL.clone().add(new THREE.Vector3(0, -0.01, 0.03)), new THREE.Vector3(0, -0.6, 0.8).normalize());
  const shR = new THREE.Vector3(0.2, 0.62, 0), elR = new THREE.Vector3(0.3, 0.32, 0.14), haR = new THREE.Vector3(0.08, 0.52, 0.16);
  limb(shR, elR, 0.034); limb(elR, haR, 0.028);
  const palmR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skin); palmR.scale.set(1.2, 1, 0.4); palmR.position.copy(haR); body.add(palmR);
  finger(haR.clone().add(new THREE.Vector3(-0.02, 0.02, 0.01)), new THREE.Vector3(-0.7, 0.7, 0.1).normalize());

  // ---- head ----
  const head = new THREE.Group(); head.position.set(0, 0.92, 0.02); head.rotation.set(0.08, 0.0, 0.06); body.add(head);
  const skull = new THREE.Mesh(headGeo(), skin); head.add(skull);
  addFuzz(skull, { depth: 0.004, density: 0.08, layers: 4, seed: 11, color: 0xf6f0e6 });
  // the eyes: too large, glossy black, almond-shaped, with a faint dark-amber depth
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x060405, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.4, sheenColor: new THREE.Color(0x4a2a10) });
  for (const sx of [-1, 1]) {
    const ex = sx * 0.032, ey = 0.014;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 24, 18), eyeMat); e.scale.set(1.15, 0.8, 0.55); e.rotation.z = -sx * 0.18;
    e.position.set(ex, ey, surfZ(ex, ey) - 0.006); head.add(e);
    // the lid line above, thin and pale
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0028, 6, 24, Math.PI * 0.9), skin); lid.scale.set(1.1, 0.75, 1); lid.rotation.z = Math.PI * 0.05 - sx * 0.18; lid.position.set(ex, ey + 0.002, surfZ(ex, ey) - 0.001); head.add(lid);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: 0xd8d0c4 })); brow.rotation.z = Math.PI / 2 - sx * 0.2; brow.position.set(sx * 0.034, 0.045, surfZ(sx * 0.034, 0.045) + 0.001); head.add(brow);
  }
  const lips = new THREE.MeshStandardMaterial({ color: 0xb8a4a0, roughness: 0.4 });
  const ul = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 8), lips); ul.scale.set(1.2, 0.28, 0.4); ul.position.set(0, -0.058, surfZ(0, -0.058) - 0.002); head.add(ul);
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8), lips); ll.scale.set(1.05, 0.36, 0.45); ll.position.set(0, -0.066, surfZ(0, -0.066) - 0.002); head.add(ll);
  // long hair, dark and matted with silk, falling over the shoulders and down her back
  const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2420, roughness: 0.7, sheen: 0.8, sheenColor: new THREE.Color(0x9a9080) });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.094, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.4), hairMat); cap.scale.set(0.92, 1.18, 1.05); cap.position.set(0, 0.012, -0.01); cap.rotation.x = -0.3; head.add(cap);
  for (let i = 0; i < 160; i++) {
    const a = Math.PI * 0.35 + (i / 159) * Math.PI * 1.3 + (r() - 0.5) * 0.05, rr = 0.088;
    const p0 = new THREE.Vector3(Math.sin(a) * rr * 0.9, 0.05 + r() * 0.04, Math.cos(a) * rr);
    const front = Math.cos(a) > 0.2, len = 0.5 + r() * 0.35;
    const p3 = new THREE.Vector3(Math.sin(a) * (0.18 + r() * 0.1), -len, Math.cos(a) * 0.1 + (front ? 0.06 : -0.12));
    const p1 = p0.clone().add(new THREE.Vector3(Math.sin(a) * 0.05, -0.05, Math.cos(a) * 0.03));
    const p2 = p3.clone().add(new THREE.Vector3((r() - 0.5) * 0.08, 0.2, (r() - 0.5) * 0.05));
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(p0, p1, p2, p3), 24, 0.0035 + r() * 0.003, 4), hairMat));
  }
  // feathered antennae swept back from the brow into the hair
  const antMat = new THREE.MeshStandardMaterial({ color: 0x9a8c78, roughness: 0.8 });
  for (const sx of [-1, 1]) {
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx * 0.03, 0.075, 0.06), new THREE.Vector3(sx * 0.07, 0.16, 0.03), new THREE.Vector3(sx * 0.16, 0.19, -0.1));
    head.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.0025, 5), antMat));
    for (let t = 0.12; t < 0.98; t += 0.025) {
      const p = c.getPoint(t), tg = c.getTangent(t), L = 0.03 * Math.sin(t * Math.PI) + 0.006;
      for (const side of [-1, 1]) { const dir = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(side); const q = p.clone().addScaledVector(dir, L).addScaledVector(tg, L * 0.4); head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p, q), 1, 0.0009, 3), antMat)); }
    }
  }

  // ---- the wings, folded round her like a cloak ----
  const wt = wingTextures(21);
  const wingMat = new THREE.MeshPhysicalMaterial({ map: wt.map, alphaMap: wt.alphaMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xf2ece0), sheenRoughness: 0.6 });
  for (const sx of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(1.5, 2.4, 48, 64), gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const u = (gp.getX(i) + 0.75) / 1.5, v = (gp.getY(i) + 1.2) / 2.4; // u: spine -> outer edge; v: bottom -> top
      const R = 0.26 + 0.66 * Math.pow(Math.max(0, 1 - v), 0.75) + 0.035 * Math.sin(u * 26 + v * 3) * u; // tight at the shoulders, wide over the cocoon, soft folds
      const ang = 0.12 + u * Math.PI * 0.8;
      let x = Math.sin(ang) * R * sx, z = -Math.cos(ang) * R;
      const y = 0.55 + v * 1.85 + Math.pow(u, 2) * 0.12 * v;             // top edge at the shoulders, rising toward the front like a collar
      gp.setXYZ(i, x, y, z + 0.05);
    }
    geo.computeVertexNormals();
    // map u along the wing so the spine side is the wing base
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
    const w = new THREE.Mesh(geo, wingMat); w.position.set(0, 0.0, 0.02); w.castShadow = true; w.receiveShadow = true; root.add(w);
  }
  return root;
}

// ---------- the attic chamber, for the previews ----------
export function buildAttic(mosaicTex) {
  const g = new THREE.Group(), r = rnd(31);
  const plank = tex(canvas(512, 512, (c, w, h) => { c.fillStyle = '#4a3a2c'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.2})`; c.fillRect(0, y, w, 2); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '20,12,6' : '120,90,60'},0.15)`; c.fillRect(r() * w, y + r() * 30, 40 + r() * 80, 1); } } }));
  plank.wrapS = plank.wrapT = THREE.RepeatWrapping; plank.repeat.set(4, 4);
  const wood = new THREE.MeshStandardMaterial({ map: plank, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), wood); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  // pitched roof, rafters, a round window in the gable behind her
  for (const s of [-1, 1]) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 12), wood); roof.position.set(s * 2.55, 2.55, 0); roof.rotation.z = -s * 0.785; roof.receiveShadow = true; g.add(roof);
  }
  for (let z = -5; z <= 5; z += 1.1) for (const s of [-1, 1]) {
    const raf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7.1, 0.16), new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.9 }));
    raf.position.set(s * 2.45, 2.55, z); raf.rotation.z = s * 0.79; raf.castShadow = true; g.add(raf);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x3a2c22 })); ridge.position.y = 5.0; g.add(ridge);
  const gable = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-5, 0), new THREE.Vector2(5, 0), new THREE.Vector2(0, 5.1)])), new THREE.MeshStandardMaterial({ color: 0x5a5048, roughness: 1 }));
  gable.position.z = -3.2; g.add(gable);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ color: 0x5a6a9a })); win.position.set(0, 3.3, -3.19); g.add(win);
  for (let i = 0; i < 4; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1612 })); bar.position.set(0, 3.3, -3.17); bar.rotation.z = i * Math.PI / 4; g.add(bar); }
  // the final mosaic on the gable, under the window
  if (mosaicTex) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: 0.5 })); m.position.set(0, 1.5, -3.18); g.add(m); }
  // smaller cocoons hung from the rafters, and candles on the boards
  const silkMat = new THREE.MeshStandardMaterial({ map: silkTexture(8), color: 0xd8cfbc, roughness: 0.9 });
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), silkMat); c.scale.set(1, 2.2, 1);
    const x = (r() < 0.5 ? -1 : 1) * (1.6 + r() * 1.2), z = -2.6 + r() * 5; c.position.set(x, 3.0 - Math.abs(x) * 0.35 + r() * 0.3, z); c.castShadow = true; g.add(c);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 4), silkMat); s.position.set(x, c.position.y + 0.8, z); g.add(s);
  }
  const candles = [];
  for (const [x, z, h] of [[-1.2, 1.0, 0.25], [1.3, 0.8, 0.18], [-0.7, 1.7, 0.3], [0.9, 1.6, 0.14], [1.6, -0.6, 0.22]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, h, 12), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 })); c.position.set(x, h / 2, z); g.add(c);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd08a })); f.scale.y = 2; f.position.set(x, h + 0.03, z); g.add(f);
    const l = new THREE.PointLight(0xffa860, 1.6, 5, 1.6); l.position.set(x, h + 0.1, z); g.add(l); candles.push(l);
  }
  // cold moonlight through the round window
  const moon = new THREE.SpotLight(0x9ab0e0, 30, 14, 0.42, 0.6, 1.2); moon.position.set(0, 3.4, -3.6); moon.target.position.set(0, 1.6, 0.3); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0005; g.add(moon, moon.target);
  g.add(new THREE.HemisphereLight(0x2a2c3a, 0x1a1210, 0.6));
  // dust in the moonbeam
  const N = 900, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const t = r(); pos.set([(r() - 0.5) * (0.4 + t * 1.6), 3.3 - t * 1.8 + (r() - 0.5) * 0.6, -3.1 + t * 3.4], i * 3); }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xc8d4f0, size: 0.008, transparent: true, opacity: 0.6, depthWrite: false }));
  g.add(dust);
  return g;
}
