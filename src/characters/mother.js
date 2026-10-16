// The Mother: the cult leader's wife, half-emerged from a giant cocoon in the attic.
// Human-faced, but too-large dark eyes, pale fuzz and a powdery sheen; huge dusty
// wings folded round her like a cloak. Preview-only for now: not used by the game.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const clean = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };
const merge = gs => mergeGeometries(gs.map(clean), false);

const rnd = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// ---------- textures ----------
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// Real moth wings, painted on canvases whose transparent outside is the wing outline.
// Fore: broad, pointed apex, base at left-middle. Hind: rounded, scalloped.
// Muted brown, ash grey, ochre and soot, wavy cross-lines, veins, dense scales,
// fur at the base, and one large eyespot on each forewing.
function wingCanvas(kind, seed) {
  const r = rnd(seed), W = 1536, H = kind === 'fore' ? 900 : 860;
  return canvas(W, H, (g) => {
    const path = () => {
      g.beginPath();
      if (kind === 'fore') {
        g.moveTo(0, H * 0.32);
        g.bezierCurveTo(W * 0.3, H * 0.06, W * 0.7, H * 0.02, W * 0.99, H * 0.04);            // costa to the pointed apex
        g.bezierCurveTo(W * 0.93, H * 0.3, W * 0.84, H * 0.62, W * 0.7, H * 0.93);              // outer margin, slightly concave
        const n = 7; for (let k = 1; k <= n; k++) { const x = W * 0.7 * (1 - k / n), y = H * (0.93 - 0.18 * (k / n) ** 2); g.quadraticCurveTo(x + W * 0.05, y + 18, x, y); } // inner margin
      } else {
        g.moveTo(0, H * 0.2);
        g.bezierCurveTo(W * 0.35, H * 0.0, W * 0.75, H * 0.08, W * 0.82, H * 0.38);
        const n = 8, pts = []; for (let k = 0; k <= n; k++) { const a = -0.35 + (k / n) * 2.2; pts.push([W * 0.42 + Math.cos(a) * W * 0.4, H * 0.5 + Math.sin(a) * H * 0.45]); }
        for (let k = 1; k < pts.length; k++) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; g.quadraticCurveTo((x0 + x1) / 2 + (x1 - x0 === 0 ? 0 : 0) + 22, (y0 + y1) / 2 + 22, x1, y1); } // scallops
        g.bezierCurveTo(W * 0.1, H * 0.9, 0, H * 0.6, 0, H * 0.2);
      }
      g.closePath();
    };
    g.save(); path(); g.clip();
    // ground colour
    const gr = g.createLinearGradient(0, 0, W, H);
    if (kind === 'fore') { gr.addColorStop(0, '#3e2e22'); gr.addColorStop(0.35, '#5e4e3e'); gr.addColorStop(0.7, '#6e665a'); gr.addColorStop(1, '#3e342a'); }
    else { gr.addColorStop(0, '#6a5038'); gr.addColorStop(0.6, '#a07c4a'); gr.addColorStop(1, '#6e5a44'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // mottled patches: ash grey, ochre, soot
    for (let k = 0; k < 40; k++) {
      const x = r() * W, y = r() * H, rad = 30 + r() * 120, cols = ['150,146,138', '176,132,64', '34,26,20', '120,98,74'];
      const c = cols[Math.floor(r() * cols.length)], gg = g.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, `rgba(${c},${0.25 + r() * 0.25})`); gg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    // wavy cross-lines (antemedial, postmedial, subterminal)
    for (const [fx, w, col] of kind === 'fore' ? [[0.28, 9, 'rgba(25,18,12,0.85)'], [0.31, 5, 'rgba(210,196,170,0.5)'], [0.62, 10, 'rgba(25,18,12,0.85)'], [0.66, 6, 'rgba(210,196,170,0.5)'], [0.86, 14, 'rgba(60,46,34,0.6)']] : [[0.45, 12, 'rgba(30,22,16,0.8)'], [0.7, 18, 'rgba(60,44,30,0.6)']]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath();
      for (let k = 0; k <= 60; k++) { const t = k / 60, x = W * fx + Math.sin(t * 22 + fx * 9) * 12 - t * W * 0.12, y = t * H; k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    // the eyespot (forewing): soot ring, ochre ring, black pupil, pale crescent
    if (kind === 'fore') {
      const ex = W * 0.47, ey = H * 0.5;
      for (const [rad, col] of [[170, '#201810'], [150, '#7a5a34'], [120, '#2a1e16'], [96, '#140e0a'], [54, '#3a0c08']]) { g.fillStyle = col; g.beginPath(); g.ellipse(ex, ey, rad, rad * 0.86, -0.2, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(200,190,170,0.45)'; g.lineWidth = 8; g.beginPath(); g.arc(ex - 18, ey - 10, 66, 3.6, 5.2); g.stroke();
      
      // dark apical patch and a pale streak to the apex
      g.fillStyle = 'rgba(30,22,16,0.55)'; g.beginPath(); g.ellipse(W * 0.9, H * 0.12, 120, 50, -0.15, 0, 7); g.fill();
      g.strokeStyle = 'rgba(220,210,190,0.55)'; g.lineWidth = 8; g.beginPath(); g.moveTo(W * 0.72, H * 0.3); g.lineTo(W * 0.97, H * 0.06); g.stroke();
    } else {
      // hindwing: dark discal spot and a soot border
      g.fillStyle = 'rgba(25,18,12,0.8)'; g.beginPath(); g.ellipse(W * 0.4, H * 0.45, 46, 38, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(40,30,22,0.7)'; g.lineWidth = 70; path(); g.stroke();
    }
    // veins radiating from the base, branching
    g.strokeStyle = 'rgba(28,20,14,0.55)'; g.lineWidth = 5;
    const bx = 0, by = kind === 'fore' ? H * 0.32 : H * 0.25;
    for (let k = 0; k < (kind === 'fore' ? 10 : 8); k++) {
      const t = k / (kind === 'fore' ? 9 : 7), ang = (kind === 'fore' ? -0.32 : -0.2) + t * (kind === 'fore' ? 1.15 : 1.5);
      const L = W * (kind === 'fore' ? 1.1 : 0.85);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(L * 0.35 * Math.cos(ang - 0.1), by + L * 0.35 * Math.sin(ang - 0.1), L * Math.cos(ang), by + L * Math.sin(ang)); g.stroke();
    }
    g.lineWidth = 3; g.beginPath(); g.ellipse(W * 0.42, by + H * 0.12, W * 0.16, H * 0.12, 0, 0, 7); g.stroke(); // discal cell
    // dense velvety scales: short overlapping strokes along the wing
    for (let k = 0; k < 140000; k++) {
      const x = r() * W, y = r() * H, d = r();
      g.fillStyle = d < 0.45 ? `rgba(18,12,8,${0.1 + r() * 0.15})` : d < 0.8 ? `rgba(230,220,200,${0.05 + r() * 0.1})` : `rgba(170,120,60,${0.08 + r() * 0.1})`;
      g.fillRect(x, y, 5, 2);
    }
    // thick fur at the base
    for (let k = 0; k < 2600; k++) {
      const a = r() * 6.28, d = Math.pow(r(), 1.5) * W * 0.16, x = bx + Math.abs(Math.cos(a)) * d, y = by + Math.sin(a) * d * 0.8;
      g.strokeStyle = r() < 0.5 ? `rgba(140,120,96,${0.35 + r() * 0.3})` : `rgba(60,46,34,${0.35 + r() * 0.3})`; g.lineWidth = 2 + r() * 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + r() * 30, y + (r() - 0.5) * 16); g.stroke();
    }
    // fringe of hair-scales along the margin
    g.restore();
    g.save(); g.strokeStyle = 'rgba(150,136,116,0.8)'; g.lineWidth = 3; g.setLineDash([3, 4]); path(); g.stroke(); g.restore();
    // old, tattered: bites out of the margin, worn holes, scales rubbed bare
    g.save(); g.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 26; k++) { const t = r(), x = kind === 'fore' ? W * (0.55 + t * 0.44) : W * (0.3 + t * 0.5), y = kind === 'fore' ? H * (0.05 + (1 - t) * 0.85) : H * (0.85 + r() * 0.1); const rad = 10 + r() * 45; g.beginPath(); g.ellipse(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill(); }
    for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(W * (0.25 + r() * 0.6), H * (0.2 + r() * 0.6), 6 + r() * 22, 5 + r() * 16, r() * 3, 0, 7); g.fill(); }
    g.restore();
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (let k = 0; k < 12; k++) { const x = r() * W, y = r() * H, rad = 40 + r() * 120, gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(190,180,160,0.35)'); gg.addColorStop(1, 'rgba(190,180,160,0)'); g.fillStyle = gg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    g.restore();
  });
}
function wingTexture(kind, seed) { const t = tex(wingCanvas(kind, seed)); t.anisotropy = 16; return t; }

function silkTexture(seed) {
  const r = rnd(seed);
  return tex(canvas(512, 1024, (g, w, h) => {
    g.fillStyle = '#b8a47a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.strokeStyle = `rgba(${r() < 0.45 ? '238,226,190' : r() < 0.5 ? '150,124,78' : '96,78,50'},${0.12 + r() * 0.25})`; g.lineWidth = 0.5 + r() * 1.5;
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
    for (let i = 0; i < w * h * density / 14; i++) g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3, 3);
  }), false);
}

function skinTexture() {
  const r = rnd(9);
  return tex(canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#d2c6bc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,128,120' : '246,240,232'},${r() * 0.09})`; g.fillRect(r() * w, r() * h, 1, 1); }
    // blotches, like bruising under very thin skin
    for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 60, gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, 'rgba(130,110,130,0.14)'); gg.addColorStop(1, 'rgba(130,110,130,0)'); g.fillStyle = gg; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad); }
    // veins showing through, branching
    for (let i = 0; i < 40; i++) { let x = r() * w, y = r() * h, wd = 1.6; g.strokeStyle = `rgba(80,96,140,${0.12 + r() * 0.14})`; for (let k = 0; k < 8; k++) { const nx = x + (r() - 0.5) * 50, ny = y + r() * 34; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); x = nx; y = ny; wd *= 0.85; } }
    // powdery moth scale
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(236,230,214,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 3, 1); }
  }));
}

// compound eye: thousands of tiny glossy facets, dark, with a dull red sheen deep inside
function compoundEyeTexture() {
  return tex(canvas(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.5, w * 0.5); gr.addColorStop(0, '#3a0a08'); gr.addColorStop(0.5, '#140606'); gr.addColorStop(1, '#030202'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const R = 7; for (let y = 0, row = 0; y < h + R; y += R * 1.5, row++) for (let x = (row % 2) * R * 0.87; x < w + R; x += R * 1.73) {
      g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } g.closePath(); g.stroke();
      g.fillStyle = 'rgba(255,240,230,0.06)'; g.beginPath(); g.arc(x - 2, y - 2, 1.6, 0, 7); g.fill();
    }
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
    z -= 0.02 * (g(0.36, 0.1, 0.24, 0.17) + g(-0.36, 0.1, 0.24, 0.17)); // deep orbits for the big eyes
    z -= 0.009 * (g(0.5, -0.38, 0.16, 0.16) + g(-0.5, -0.38, 0.16, 0.16)); // hollow cheeks
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
  const alphaMap = fuzzAlpha(seed, density); alphaMap.minFilter = alphaMap.magFilter = THREE.NearestFilter; alphaMap.generateMipmaps = false;
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
  const skin = new THREE.MeshPhysicalMaterial({ map: skinTexture(), color: 0xe0d6cc, roughness: 0.5, sheen: 0.9, sheenColor: new THREE.Color(0xf8eee0), sheenRoughness: 0.45 });
  const silk = silkTexture(3); silk.wrapS = silk.wrapT = THREE.RepeatWrapping; silk.repeat.set(4, 2);
  const silkMat = new THREE.MeshStandardMaterial({ map: silk, color: 0xd8c8a0, roughness: 0.95, side: THREE.DoubleSide });
  const furCol = 0xb8a88e;

  // ---- the cocoon: a dense, layered, yellowed pod; her lower half is still inside ----
  const RIM = 1.62;
  const pod = (rad, top, seed, jag) => {
    const prof = []; for (let i = 0; i <= 48; i++) { const t = i / 48, y = t * top; const rr = rad * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5 + 0.02), 0.7) * (1 - 0.25 * Math.pow(t, 3)) * (t < 0.08 ? t / 0.08 : 1); prof.push(new THREE.Vector2(Math.max(0.02, rr), y)); }
    const geo = new THREE.LatheGeometry(prof, 120), p = geo.attributes.position, rr2 = rnd(seed);
    const ph = [rr2() * 6, rr2() * 6, rr2() * 6];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const n = Math.sin(a * 5 + ph[0]) * 0.5 + Math.sin(a * 11 + ph[1]) * 0.3 + Math.sin(a * 29 + ph[2]) * 0.2;
      const ny = y > top - 0.25 ? top - 0.25 + (y - (top - 0.25)) * (0.5 + 0.5 * n) * jag : y;
      const lump = 1 + 0.05 * Math.sin(y * 7 + a * 4 + ph[0]) + 0.03 * Math.sin(a * 17 + y * 13);
      p.setXYZ(i, x * lump, ny, z * lump);
    }
    geo.computeVertexNormals(); return geo;
  };
  const layers = [[0.62, RIM - 0.05, 1, 1], [0.66, RIM - 0.25, 2, 1.2], [0.7, RIM - 0.55, 3, 1.4]];
  for (const [rad, top, seed, jag] of layers) {
    const m = new THREE.Mesh(pod(rad, top, seed, jag), silkMat.clone()); m.material.color.offsetHSL(0, 0, -0.04 * seed);
    m.castShadow = m.receiveShadow = true; root.add(m);
  }
  // fibrous strands wound round the pod, and a few tethers to the floor and rafters
  const fibre = new THREE.MeshStandardMaterial({ color: 0xa89468, roughness: 0.9 });
  for (let i = 0; i < 22; i++) {
    const pts = [], a0 = r() * 6.28, turns = 0.3 + r() * 0.8, y0 = 0.1 + r() * 1.2, y1 = y0 + 0.2 + r() * 0.4;
    for (let k = 0; k <= 24; k++) { const t = k / 24, a = a0 + t * turns * 6.28, y = y0 + (y1 - y0) * t, rad = 0.62 + 0.04 * Math.sin(y * 7); pts.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad)); }
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0025 + r() * 0.002, 4), fibre));
  }
  for (let i = 0; i < 12; i++) {
    const a = r() * 6.28, up = i < 7, p0 = new THREE.Vector3(Math.cos(a) * 0.6, 0.3 + r() * 1.2, Math.sin(a) * 0.6);
    const p2 = up ? new THREE.Vector3(Math.cos(a) * 1.6, 4.3, Math.sin(a) * 1.6 - 0.5) : new THREE.Vector3(Math.cos(a) * (1.3 + r()), 0, Math.sin(a) * (1.3 + r()));
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p0.clone().lerp(p2, 0.5).add(new THREE.Vector3(0, up ? -0.4 : 0.15, 0)), p2), 20, 0.003, 4), fibre));
  }

  // ---- her body: hips inside the rim, a furred, thorax-like torso ----
  const body = new THREE.Group(); body.position.set(0, RIM - 0.22, 0.04); body.rotation.x = 0.1; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.42, 12, 28), skin); torso.scale.set(1.08, 1, 0.7); torso.position.y = 0.36; body.add(torso);
  // ribs pressing through, and the sternum sunk between them
  const ribs = [];
  for (let k = 0; k < 7; k++) { const y = 0.52 - k * 0.045, w = 0.128 - k * 0.002; for (const sx of [-1, 1]) { const t = new THREE.TorusGeometry(w, 0.0065, 6, 24, Math.PI * 0.42); t.rotateX(Math.PI / 2); t.rotateY(sx > 0 ? Math.PI * 0.08 : Math.PI - Math.PI * 0.08 - Math.PI * 0.42); t.rotateZ(sx * 0.18); t.scale(1.05, 1, 0.7); t.translate(0, y, 0.004); ribs.push(t); } }
  body.add(new THREE.Mesh(merge(ribs), skin));
  // where the moth begins: a band of dark, segmented chitin at the waist, sinking into the silk
  const chitin = new THREE.MeshPhysicalMaterial({ color: 0x2a1e18, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  for (let k = 0; k < 4; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - k * 0.004, 0.142 - k * 0.004, 0.04, 28, 1), chitin); seg.scale.set(1.05, 1, 0.72); seg.position.y = 0.08 - k * 0.045; body.add(seg); }
  // a second, smaller pair of arms: thin, jointed, folded over the chest like a mantis at prayer
  for (const sx of [-1, 1]) {
    const a0 = new THREE.Vector3(sx * 0.1, 0.44, 0.06), a1 = new THREE.Vector3(sx * 0.17, 0.33, 0.14), a2 = new THREE.Vector3(sx * 0.03, 0.4, 0.15), a3 = new THREE.Vector3(-sx * 0.02, 0.5, 0.14);
    const seg = (a, b, rad) => { const d = b.clone().sub(a); const g = new THREE.CylinderGeometry(rad * 0.8, rad, d.length(), 8); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g; };
    const gs = [seg(a0, a1, 0.011), seg(a1, a2, 0.009), seg(a2, a3, 0.006)];
    for (const j of [a1, a2]) { const k = new THREE.SphereGeometry(0.012, 10, 8); k.translate(j.x, j.y, j.z); gs.push(k); }
    for (let f = 0; f < 3; f++) gs.push(seg(a3, a3.clone().add(new THREE.Vector3(-sx * 0.02 + (f - 1) * 0.008, 0.035, 0.012)), 0.0025));
    body.add(new THREE.Mesh(merge(gs), chitin));
  }
  // thick moth fur over the shoulders and a deep ruff round the neck
  // a thick ruff of long, dirty-cream moth fur round the neck and over the shoulders
  const ruffGs = [];
  for (let i = 0; i < 3000; i++) {
    const a = r() * Math.PI * 2, ring = 0.1 + r() * 0.12, y = 0.6 + r() * 0.1 - ring * 0.25;
    const p0 = new THREE.Vector3(Math.cos(a) * ring * 1.35, y, Math.sin(a) * ring * 0.85);
    const out = new THREE.Vector3(Math.cos(a) * 1.35 + (r() - 0.5) * 0.8, -0.2 - r() * 0.9 + (r() < 0.25 ? 0.6 : 0), Math.sin(a) * 0.85 + (r() - 0.5) * 0.8).normalize(), L = 0.04 + r() * 0.1;
    const p1 = p0.clone().addScaledVector(out, L * 0.5).add(new THREE.Vector3((r() - 0.5) * 0.02, 0.01, (r() - 0.5) * 0.02)), p2 = p0.clone().addScaledVector(out, L).add(new THREE.Vector3(0, -L * 0.3, 0));
    ruffGs.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, p1, p2), 4, 0.0016 + r() * 0.0016, 3));
  }
  const ruffMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ac, roughness: 1, vertexColors: false });
  const ruff = new THREE.Mesh(merge(ruffGs), ruffMat); ruff.castShadow = true; body.add(ruff);
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: furCol, roughness: 1 })); sh.scale.set(1.2, 0.8, 1); sh.position.set(sx * 0.2, 0.6, -0.01); body.add(sh); addFuzz(sh, { depth: 0.05, layers: 12, density: 0.4, seed: 8 + sx, color: 0xc8b896 }); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.055, 0.14, 20), skin); neck.position.y = 0.77; body.add(neck);
  // arms and long fingers gripping the torn rim at the front
  const limb = (a, b, rad, m = skin) => { const d = b.clone().sub(a); const mm = new THREE.Mesh(new THREE.CapsuleGeometry(rad, d.length(), 6, 12), m); mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); body.add(mm); return mm; };
  for (const sx of [-1, 1]) {
    const sh = new THREE.Vector3(sx * 0.21, 0.6, 0), el = new THREE.Vector3(sx * 0.4, 0.26, 0.12), wr = new THREE.Vector3(sx * 0.42, 0.08, 0.42);
    limb(sh, el, 0.028); limb(el, wr, 0.022);
    const elb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), skin); elb.position.copy(el); body.add(elb);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), skin); palm.scale.set(1.1, 0.45, 1.25); palm.position.copy(wr).add(new THREE.Vector3(0, 0.0, 0.03)); body.add(palm);
    // four long fingers curling over the edge and down the outside, and a thumb inside
    for (let f = 0; f < 4; f++) {
      const base = wr.clone().add(new THREE.Vector3(sx * (f - 1.5) * 0.017 * -1, 0.0, 0.07));
      const k1 = base.clone().add(new THREE.Vector3(0, 0.012, 0.06 + (f === 1 || f === 2 ? 0.012 : 0)));
      const k2 = k1.clone().add(new THREE.Vector3(0, -0.07, 0.03));
      const tip = k2.clone().add(new THREE.Vector3(0, -0.085, -0.016));
      limb(base, k1, 0.0075); limb(k1, k2, 0.0068); limb(k2, tip, 0.006);
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.25 })); nail.position.copy(tip); body.add(nail);
    }
    limb(wr.clone().add(new THREE.Vector3(-sx * 0.03, 0, 0.0)), wr.clone().add(new THREE.Vector3(-sx * 0.06, -0.05, 0.02)), 0.008);
  }

  // ---- head: human, real skin, too-large glossy black eyes, feathered antennae ----
  const head = new THREE.Group(); head.position.set(0, 0.93, 0.03); head.rotation.set(0.12, 0.0, 0.05); body.add(head);
  const skull = new THREE.Mesh(headGeo(), skin); head.add(skull);
  const eyeTex = compoundEyeTexture();
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTex, emissiveMap: eyeTex, emissive: 0xff5030, emissiveIntensity: 0.6, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const socket = new THREE.MeshBasicMaterial({ color: 0x120c0c, transparent: true, opacity: 0.55, depthWrite: false });
  for (const sx of [-1, 1]) {
    const ex = sx * 0.032, ey = 0.014;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.029, 32, 24), eyeMat); e.scale.set(1.12, 0.86, 0.6); e.rotation.z = -sx * 0.22;
    e.position.set(ex * 1.08, ey, surfZ(ex, ey) - 0.008); head.add(e);
    const sk = new THREE.Mesh(new THREE.CircleGeometry(0.036, 24), socket); sk.scale.set(1.15, 0.95, 1); sk.rotation.z = -sx * 0.22; sk.position.set(ex * 1.08, ey - 0.002, surfZ(ex, ey) - 0.0035); sk.renderOrder = 1; head.add(sk);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0024, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: 0x6a5a48 })); brow.rotation.z = Math.PI / 2 - sx * 0.2; brow.position.set(sx * 0.034, 0.046, surfZ(sx * 0.034, 0.046) + 0.001); head.add(brow);
  }
  const lips = new THREE.MeshStandardMaterial({ color: 0x7a5e62, roughness: 0.4 });
  // mouth slightly open; a coiled proboscis unrolling from it, down over the chin
  const gap = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 6), new THREE.MeshBasicMaterial({ color: 0x080404 })); gap.scale.set(1.15, 0.18, 0.3); gap.position.set(0, -0.062, surfZ(0, -0.062) - 0.003); head.add(gap);
  { const pts = [], z0 = surfZ(0, -0.064); for (let k = 0; k <= 80; k++) { const t = k / 80; if (t < 0.25) { pts.push(new THREE.Vector3(0, -0.064 - t * 0.12, z0 + 0.002 + t * 0.03)); continue; } const u = (t - 0.25) / 0.75, a = u * Math.PI * 4.2, rr = 0.022 * (1 - u * 0.8); pts.push(new THREE.Vector3(Math.sin(a) * rr, -0.094 - rr + Math.cos(a) * rr, z0 + 0.012 + Math.cos(a) * 0.004)); }
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0018, 6), new THREE.MeshPhysicalMaterial({ color: 0x4a2a1c, roughness: 0.3, clearcoat: 0.8 }))); }
  const ul = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 8), lips); ul.scale.set(1.2, 0.28, 0.4); ul.position.set(0, -0.058, surfZ(0, -0.058) - 0.002); head.add(ul);
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8), lips); ll.scale.set(1.05, 0.36, 0.45); ll.position.set(0, -0.066, surfZ(0, -0.066) - 0.002); head.add(ll);
  // hair: dark, long, parted, matted with silk
  const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x1e1a18, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0x6a6460), side: THREE.DoubleSide });
  const cap = new THREE.Mesh(headGeo(), hairMat); cap.scale.setScalar(1.025); head.add(cap);
  { // keep only the scalp part of the cap: drop triangles of the face and below the ears
    const g = cap.geometry.toNonIndexed(), p = g.attributes.position, keep = [];
    for (let t = 0; t < p.count; t += 3) { let ok = true; for (let k = 0; k < 3; k++) { const x = p.getX(t + k), y = p.getY(t + k), z = p.getZ(t + k); const face = z > 0.03 && y < 0.07 - Math.abs(x) * 0.2; if (face || y < -0.02 - (z < 0 ? 0.06 : 0)) ok = false; } if (ok) for (let k = 0; k < 3; k++) keep.push(p.getX(t + k), p.getY(t + k), p.getZ(t + k)); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); ng.computeVertexNormals(); cap.geometry = ng; }
  const hairGs = [], silkGs = [];
  for (let i = 0; i < 1100; i++) {
    // a root on the scalp: away from the face, a centre parting
    let nx, ny, nz; do { nx = r() * 2 - 1; ny = r() * 2 - 1; nz = r() * 2 - 1; } while (nx * nx + ny * ny + nz * nz > 1 || ny < 0.2 || (nz > 0.45 && ny < 0.75) || Math.abs(nx) < 0.04);
    const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const p0 = new THREE.Vector3(...headShape(nx, ny, nz)).multiplyScalar(1.03);
    const side = Math.sign(nx) || 1, len = 0.5 + r() * 0.35 + (nz < 0 ? 0.1 : 0);
    const p1 = p0.clone().add(new THREE.Vector3(side * (0.03 + r() * 0.03), 0.01, nz * 0.03));
    const p2 = new THREE.Vector3(side * (0.095 + r() * 0.04) + Math.sin(i) * 0.012, -0.14 + (r() - 0.5) * 0.05, (nz > 0 ? 0.04 : -0.05) + (r() - 0.5) * 0.06);
    const p3 = new THREE.Vector3(side * (0.13 + r() * 0.12), -len, (nz > 0 ? 0.08 : -0.1) + (r() - 0.5) * 0.12);
    const silky = r() < 0.08;
    (silky ? silkGs : hairGs).push(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(p0, p1, p2, p3), 14, silky ? 0.0009 : 0.0011 + r() * 0.0009, 3));
  }
  // a few matted clumps hanging across the face
  for (let i = 0; i < 7; i++) { const sx = r() < 0.5 ? -1 : 1, x = sx * (0.02 + r() * 0.045); const p0 = new THREE.Vector3(x * 0.6, 0.11, 0.07), p3 = new THREE.Vector3(x * 1.4, -0.2 - r() * 0.2, 0.1 + r() * 0.02); hairGs.push(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(p0, new THREE.Vector3(x, 0.09, 0.105), new THREE.Vector3(x * 1.2, -0.02, 0.108), p3), 16, 0.0016, 3)); }
  head.add(new THREE.Mesh(merge(hairGs), hairMat));
  head.add(new THREE.Mesh(merge(silkGs), new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.6 })));
  const antMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.7 });
  for (const sx of [-1, 1]) {
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx * 0.028, 0.08, 0.06), new THREE.Vector3(sx * 0.06, 0.2, 0.06), new THREE.Vector3(sx * 0.2, 0.28, -0.04));
    head.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.0026, 5), antMat));
    for (let t = 0.12; t < 0.98; t += 0.022) {
      const p = c.getPoint(t), tg = c.getTangent(t), L = 0.028 * Math.sin(t * Math.PI) + 0.006;
      for (const side of [-1, 1]) { const dir = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(side); head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p, p.clone().addScaledVector(dir, L).addScaledVector(tg, L * 0.4)), 1, 0.0009, 3), antMat)); }
    }
  }

  // ---- the wings: rigid, opaque, partly open behind her like a mantle ----
  const wingMats = { fore: wingTexture('fore', 21), hind: wingTexture('hind', 22) };
  const mkWing = (kind, len, ht) => {
    const geo = new THREE.PlaneGeometry(len, ht, 40, 24); geo.translate(len / 2, 0, 0);
    // a slight camber and a forward curl toward the tip so it wraps round her
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.45 * Math.pow(x / len, 2) - 0.03 * Math.pow(y / ht, 2)); }
    geo.computeVertexNormals();
    const m = new THREE.MeshPhysicalMaterial({ map: wingMats[kind], transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, sheen: 0.7, sheenColor: new THREE.Color(0xd8ccb8), sheenRoughness: 0.7 });
    const w = new THREE.Mesh(geo, m); w.castShadow = true; w.receiveShadow = true; return w;
  };
  const wingRoot = new THREE.Group(); wingRoot.position.set(0, 0.5, -0.12); body.add(wingRoot);
  for (const sx of [-1, 1]) {
    const side = new THREE.Group(); side.scale.x = sx; wingRoot.add(side);
    // forewing: base at the shoulder blade, apex up and out, swept back
    const fw = mkWing('fore', 1.55, 0.92); fw.position.set(0.05, 0.12, 0); fw.rotation.set(0.0, 0.55, 0.32); side.add(fw);
    // hindwing: lower, fanned down and back
    const hw = mkWing('hind', 1.1, 0.95); hw.position.set(0.05, -0.12, -0.02); hw.rotation.set(0.0, 0.7, -0.45); side.add(hw);
    // a furry wing base
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9a8a72, roughness: 1 })); base.scale.set(1.3, 1.1, 0.8); base.position.set(0.1, 0.02, 0); side.add(base);
    addFuzz(base, { depth: 0.05, layers: 10, density: 0.4, seed: 30 + sx, color: 0xa89a80 });
  }
  // the mirrored side flips winding; keep both faces lit
  root.traverse(o => { if (o.isMesh && o.material && o.material.side === undefined) o.material.side = THREE.DoubleSide; });
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
