// The Mother: very tall (about 2.4 m), far too thin, pale, mostly human. Lank silk-matted
// hair hides half her face; her eyes are only dark, with a faint eyeshine. Her dusty moth
// wings are folded round her like a shroud, and spread all at once for the reveal.
// She stands perfectly still, then moves in fast, twitching insect jerks. Preview-only for now: not used by the game.
import * as THREE from 'three';
import { cachedCanvas, storeCanvas } from '../texCache.js';
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
const wingCanvases = new Map(); // kind:seed -> canvas, filled ahead by prepareMother
function wingTexture0(kind, seed) { const k = kind + ':' + seed; if (!wingCanvases.has(k)) wingCanvases.set(k, wingCanvas(kind, seed)); const t = tex(wingCanvases.get(k)); t.anisotropy = 16; return t; }

function silkTexture0(seed) {
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

function skinTexture0() {
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
    z += 0.013 * g(0, -0.12, 0.06, 0.14) + 0.005 * g(0, -0.27, 0.08, 0.05) + 0.004 * (g(0.3, 0.32, 0.25, 0.07) + g(-0.3, 0.32, 0.25, 0.07)); // nose, nostrils, brow ridge
    z -= 0.02 * (g(0.36, 0.1, 0.24, 0.17) + g(-0.36, 0.1, 0.24, 0.17)); // deep orbits for the big eyes
    z -= 0.009 * (g(0.5, -0.38, 0.16, 0.16) + g(-0.5, -0.38, 0.16, 0.16)); // hollow cheeks
    z += 0.005 * (g(0.52, -0.08, 0.14, 0.12) + g(-0.52, -0.08, 0.14, 0.12));
    z += 0.004 * g(0, -0.82, 0.16, 0.1);
  }
  return [x, y, z];
}
function headGeo0() {
  const g = new THREE.SphereGeometry(1, 128, 96), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = headShape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, ...v); }
  g.computeVertexNormals(); return g;
}
function surfZ0(x, y) {
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
// smooth limb: a tapered tube along a curve, capped with spheres at the joints
function limbGeo(pts, r0, r1, seg = 48, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, radial, false), p = g.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) { const t = i / seg, rr = r0 + (r1 - r0) * t; curve.getPointAt(t, c); for (let k = 0; k <= radial; k++) { const idx = i * (radial + 1) + k; const v = new THREE.Vector3(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(c).multiplyScalar(rr).add(c); p.setXYZ(idx, v.x, v.y, v.z); } }
  g.computeVertexNormals();
  const a = new THREE.SphereGeometry(r0, radial, 12); a.translate(...pts[0].toArray());
  const b = new THREE.SphereGeometry(r1, radial, 12); b.translate(...pts[pts.length - 1].toArray());
  return merge([g, a, b]);
}

// Painting and shaping her takes seconds on a slow machine, and three parts of the game build
// her (the attic, the roaming hunt, the escape): the costly pieces are made once and shared.
// Textures are handed out as clones (same image, own settings); geometry is never changed after.
const memo = (fn, cloneTex) => { const c = new Map(); return (...a) => { const k = a.join(); if (!c.has(k)) c.set(k, fn(...a)); const v = c.get(k); return cloneTex ? v.clone() : v; }; };
const wingTexture = memo(wingTexture0, true), silkTexture = memo(silkTexture0, true), skinTexture = memo(skinTexture0, true);
const headGeo = memo(headGeo0), surfZ = memo(surfZ0);
// make the costly pieces ahead, a step at a time (main.js awaits this while loading)
export async function prepareMother(step) {
  skinTexture(); await step('skin'); silkTexture(3); await step('silk');
  // the wing is the slowest picture of all: kept from the last visit when the browser allows it
  if (!wingCanvases.has('fore:21')) {
    const W = 1536, H = 900, old = await cachedCanvas('mother-wing-fore-21', W, H);
    if (old) wingCanvases.set('fore:21', old);
    else { const c = wingCanvas('fore', 21); wingCanvases.set('fore:21', c); storeCanvas('mother-wing-fore-21', c); }
  }
  wingTexture('fore', 21); await step('wing'); headGeo(); await step('head');
}

export function buildMother() {
  const root = new THREE.Group(), r = rnd(5);
  const skinMap = skinTexture(); const skin = new THREE.MeshPhysicalMaterial({ map: skinMap, bumpMap: skinMap, bumpScale: 0.0015, color: 0xe4dcd4, roughness: 0.62, sheen: 0.7, sheenColor: new THREE.Color(0xf4efe6), sheenRoughness: 0.5 });
  const shiftMat = new THREE.MeshStandardMaterial({ map: silkTexture(3), color: 0x8a8680, roughness: 0.95, side: THREE.DoubleSide });
  // proportions: ~2.4 m tall, the head small, the neck and limbs too long
  const S = 1.0, SH = 1.98 * S, NECK = 0.2, HEADY = SH + NECK + 0.11;

  // body: a thin torso under a long, ragged shift that falls to the floor
  // rig: everything that walks (bobs, leans, sways) sits under this, so callers can keep placing root
  const rig = new THREE.Group(); root.add(rig);
  const body = new THREE.Group(); rig.add(body);
  const prof = [[0.0, 0.0], [0.17, 0.0], [0.15, 0.3], [0.13, 0.7], [0.12, 1.05], [0.1, 1.3], [0.085, 1.45], [0.1, 1.62], [0.115, 1.8], [0.12, 1.9], [0.07, SH + 0.02], [0.035, SH + 0.05]].map(([x, y]) => new THREE.Vector2(x, y));
  const shiftGeo = new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(80), 96);
  { const p = shiftGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); const fold = y < 1.3 ? 1 + 0.06 * Math.sin(a * 9 + y * 2) * (1.3 - y) : 1; const hem = y < 0.05 ? (Math.sin(a * 13) * 0.5 + 0.5) * 0.06 : 0; p.setXYZ(i, x * fold * 1.05, y + hem, z * fold * 0.75); } shiftGeo.computeVertexNormals(); }
  const shift = new THREE.Mesh(shiftGeo, shiftMat); shift.castShadow = shift.receiveShadow = true; body.add(shift);
  // neck: long and thin
  const neck = new THREE.Mesh(limbGeo([new THREE.Vector3(0, SH, 0), new THREE.Vector3(0, SH + NECK * 0.5, 0.01), new THREE.Vector3(0, SH + NECK, 0.02)], 0.036, 0.03), skin); body.add(neck);
  // collarbones under the skin
  for (const sx of [-1, 1]) body.add(new THREE.Mesh(limbGeo([new THREE.Vector3(sx * 0.02, SH - 0.02, 0.06), new THREE.Vector3(sx * 0.1, SH - 0.03, 0.05), new THREE.Vector3(sx * 0.17, SH - 0.05, 0.0)], 0.012, 0.016), skin));

  // arms: hang almost to the knee; fingers long. Each arm is a jointed rig for twitches.
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.17, SH - 0.06, 0); body.add(sh);
    sh.add(new THREE.Mesh(limbGeo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.02, -0.25, 0), new THREE.Vector3(sx * 0.03, -0.5, 0.01)], 0.032, 0.024), skin));
    const el = new THREE.Group(); el.position.set(sx * 0.03, -0.5, 0.01); sh.add(el);
    el.add(new THREE.Mesh(limbGeo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.24, 0.01), new THREE.Vector3(0, -0.48, 0.02)], 0.024, 0.017), skin));
    const wr = new THREE.Group(); wr.position.set(0, -0.48, 0.02); el.add(wr);
    const hand = [];
    hand.push(limbGeo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.04, 0.004), new THREE.Vector3(0, -0.08, 0.006)], 0.019, 0.024));
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fx = sx * (-0.016 + f * 0.011), L = [0.07, 0.08, 0.075, 0.06][f];
      const pts = [new THREE.Vector3(fx, -0.08, 0.008), new THREE.Vector3(fx * 1.1, -0.08 - L * 0.55, 0.012), new THREE.Vector3(fx * 1.15, -0.08 - L * 1.05, 0.03), new THREE.Vector3(fx * 1.15, -0.08 - L * 1.45, 0.055)];
      fingers.push(limbGeo(pts, 0.0062, 0.0042, 24, 10));
      const nail = new THREE.SphereGeometry(0.005, 10, 8); nail.scale(1, 1.6, 0.6); nail.translate(pts[3].x, pts[3].y - 0.004, pts[3].z + 0.002); hand.push(nail);
    }
    hand.push(limbGeo([new THREE.Vector3(-sx * 0.02, -0.04, 0.01), new THREE.Vector3(-sx * 0.035, -0.08, 0.03), new THREE.Vector3(-sx * 0.035, -0.12, 0.045)], 0.008, 0.005, 16, 10));
    const fingerMesh = new THREE.Mesh(merge(fingers), skin); const handMesh = new THREE.Mesh(merge(hand), skin); wr.add(handMesh, fingerMesh);
    sh.rotation.z = sx * 0.06; el.rotation.x = -0.12;
    if (sx < 0) { sh.rotation.set(-0.35, 0, -0.12); el.rotation.set(-0.9, 0, 0.5); } // one hand comes out between the wings, at her waist
    arms.push({ sh, el, wr, fingers: fingerMesh, sx, rest: { sh: sh.rotation.clone(), el: el.rotation.clone(), wr: wr.rotation.clone() } });
  }

  // feet: long, bare, grey; only the toes show under the hem. Each is planted on the floor while
  // it carries her (moves back exactly as fast as she moves forward: no sliding) and then snaps forward.
  const feet = [];
  { const fg = []; fg.push(limbGeo([new THREE.Vector3(0, 0.05, -0.05), new THREE.Vector3(0, 0.025, 0.06), new THREE.Vector3(0, 0.012, 0.17), new THREE.Vector3(0, 0.008, 0.24)], 0.03, 0.014, 24, 10));
    for (let t = 0; t < 4; t++) fg.push(limbGeo([new THREE.Vector3((t - 1.5) * 0.012, 0.01, 0.22), new THREE.Vector3((t - 1.5) * 0.015, 0.006, 0.27), new THREE.Vector3((t - 1.5) * 0.016, 0.003, 0.3 - t * 0.008)], 0.0062, 0.004, 12, 6));
    const footGeo = merge(fg), shinGeo = limbGeo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, 0.8, 0)], 0.021, 0.03, 16, 8);
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(footGeo, skin); f.castShadow = true; f.position.set(sx * 0.07, 0, 0); root.add(f);
      // the shin leans from the ankle up toward her hip, so it always disappears under the shift
      const shin = new THREE.Mesh(shinGeo, skin); shin.position.set(0, 0.05, -0.04); f.add(shin); f.userData.shin = shin; feet.push(f); } }

  // head: human, small, gaunt; eyes only dark hollows with a faint eyeshine
  const neckTop = new THREE.Group(); neckTop.position.set(0, SH + NECK, 0.02); body.add(neckTop);
  const head = new THREE.Group(); head.position.set(0, 0.11, 0.0); head.scale.setScalar(1.04); neckTop.add(head);
  const skull = new THREE.Mesh(headGeo(), skin); skull.castShadow = true; head.add(skull);
  const hollow = new THREE.MeshStandardMaterial({ color: 0x040303, roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.85, fog: false });
  const eyeshine = [];
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g2 = gc.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,180,1)'); gr.addColorStop(0.25, 'rgba(255,200,120,0.5)'); gr.addColorStop(1, 'rgba(255,180,100,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64); }
  const glintMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 1 });
  for (const sx of [-1, 1]) {
    const ex = sx * 0.031, ey = 0.014;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.019, 32, 24), hollow); e.scale.set(1.2, 0.8, 0.5); e.rotation.z = -sx * 0.15; e.position.set(ex, ey, surfZ(ex, ey) - 0.006); head.add(e);
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 12, 8), shine); g.position.set(ex + sx * 0.002, ey - 0.002, surfZ(ex, ey) + 0.0025); head.add(g); eyeshine.push(g);
    // the glint that carries down a dark corridor: a soft additive point, unaffected by fog
    const glint = new THREE.Sprite(glintMat); glint.scale.setScalar(0.05); glint.position.copy(g.position); glint.position.z += 0.012; glint.renderOrder = 6; head.add(glint); eyeshine.push(glint);
    // soft dark shadow round the socket
    const sock = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), new THREE.MeshBasicMaterial({ color: 0x1a1214, transparent: true, opacity: 0.4, depthWrite: false })); sock.position.set(ex, ey, surfZ(ex, ey) - 0.002); sock.scale.set(1.2, 0.9, 1); head.add(sock);
  }
  const lips = new THREE.MeshStandardMaterial({ color: 0x9a8484, roughness: 0.4 });
  const ul = new THREE.Mesh(new THREE.SphereGeometry(0.012, 24, 12), lips); ul.scale.set(1.15, 0.24, 0.38); ul.position.set(0, -0.058, surfZ(0, -0.058) - 0.002); head.add(ul);
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.011, 24, 12), lips); ll.scale.set(1.0, 0.3, 0.42); ll.position.set(0, -0.065, surfZ(0, -0.065) - 0.002); head.add(ll);
  // hair: long, lank, black, rooted on the scalp, matted with silk; a curtain over her right side of the face
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x110e0d, roughness: 0.8, side: THREE.DoubleSide });
  const cap = new THREE.Mesh(headGeo(), hairMat); cap.scale.setScalar(1.022); head.add(cap);
  { const g = cap.geometry.toNonIndexed(), p = g.attributes.position, keep = [];
    for (let t = 0; t < p.count; t += 3) { let ok = true; for (let k = 0; k < 3; k++) { const x = p.getX(t + k), y = p.getY(t + k), z = p.getZ(t + k); if ((z > 0.03 && y < 0.075 - Math.abs(x) * 0.25) || y < -0.03 - (z < 0 ? 0.07 : 0)) ok = false; } if (ok) for (let k = 0; k < 3; k++) keep.push(p.getX(t + k), p.getY(t + k), p.getZ(t + k)); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); ng.computeVertexNormals(); cap.geometry = ng; }
  const hairGs = [], silkGs = [];
  const strand = (p0, p1, p2, p3, rad, silky) => (silky ? silkGs : hairGs).push(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(p0, p1, p2, p3), 20, rad, 3));
  for (let i = 0; i < 1500; i++) {
    let nx, ny, nz; do { nx = r() * 2 - 1; ny = r() * 2 - 1; nz = r() * 2 - 1; } while (nx * nx + ny * ny + nz * nz > 1 || ny < 0.25 || (nz > 0.5 && ny < 0.7));
    const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    const p0 = new THREE.Vector3(...headShape(nx, ny, nz)).multiplyScalar(1.03), side = nx >= 0 ? 1 : -1, len = 0.7 + r() * 0.35;
    const front = nz > 0.1;
    const p1 = p0.clone().add(new THREE.Vector3(side * 0.03, 0.006, nz * 0.03));
    const p2 = new THREE.Vector3(side * (0.09 + r() * 0.03), -0.1, front ? 0.05 + r() * 0.03 : -0.06 + (r() - 0.5) * 0.06);
    const p3 = new THREE.Vector3(side * (0.11 + r() * 0.1) + Math.sin(i * 1.7) * 0.02, -len, front ? 0.07 + r() * 0.05 : -0.1 + (r() - 0.5) * 0.14);
    strand(p0, p1, p2, p3, 0.0009 + r() * 0.0008, r() < 0.07);
  }
  // the curtain: strands from the parting falling straight down over her right eye and cheek
  for (let i = 0; i < 260; i++) {
    const x = -0.004 - r() * 0.05, p0 = new THREE.Vector3(x * 0.5, 0.118, 0.035 + r() * 0.02);
    const p3 = new THREE.Vector3(x * 1.2 - 0.01, -0.35 - r() * 0.35, 0.115 + r() * 0.03);
    strand(p0, new THREE.Vector3(x * 0.9, 0.1, 0.1), new THREE.Vector3(x * 1.1, 0.0, 0.112 + r() * 0.008), p3, 0.0008 + r() * 0.0007, r() < 0.05);
  }
  head.add(new THREE.Mesh(merge(hairGs), hairMat));
  head.add(new THREE.Mesh(merge(silkGs), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 })));
  head.rotation.set(0.1, 0, -0.06); // chin a little down, a little tilted

  // wings: two great forewings rooted at the shoulder blades. Folded, they wrap her from the
  // back round to the front like a shroud; open, they spread up and out. Each vertex is
  // stored in both poses and blended.
  const wingTex = wingTexture('fore', 21);
  const wingMat = new THREE.MeshPhysicalMaterial({ map: wingTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.92, sheen: 0.6, sheenColor: new THREE.Color(0xcfc4b0), sheenRoughness: 0.7 });
  const wings = [];
  for (const sx of [-1, 1]) {
    const LEN = 2.1, HT = 1.25, geo = new THREE.PlaneGeometry(LEN, HT, 80, 48); geo.translate(LEN / 2, 0, 0);
    const p = geo.attributes.position, folded = new Float32Array(p.count * 3), open = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / LEN, v = p.getY(i) / HT + 0.5; // u: base->apex, v: trailing->leading edge
      // folded: hangs down from the shoulder, wrapping round from the back (v=0) to the front (v=1)
      const R = 0.24 + 0.26 * Math.pow(u, 0.8) + 0.02 * v, th = sx * (0.06 + v * 0.86) * Math.PI;
      folded.set([Math.sin(th) * R, SH + 0.05 - u * (SH - 0.02), -Math.cos(th) * R * 0.85 + 0.02], i * 3);
      // open: spread out and up behind her, slightly cupped forward
      const ox = sx * (0.08 + u * LEN * 0.92), oy = SH - 0.1 + u * 0.75 + (v - 0.5) * HT * 0.95, oz = -0.14 + 0.28 * u * u - 0.05 * (v - 0.5);
      open.set([ox, oy, oz], i * 3);
    }
    geo.userData = { folded, open };
    // pivot at the shoulder blades so the cloak can sway from there
    const piv = new THREE.Group(); piv.position.set(0, SH, -0.04); rig.add(piv);
    const m = new THREE.Mesh(geo, wingMat); m.position.set(0, -SH, 0.04); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; piv.add(m); wings.push(m); m.userData.piv = piv; m.userData.sx = sx;
  }
  const setOpen = (t) => {
    const e = t * t * (3 - 2 * t);
    for (const w of wings) { const { folded, open } = w.geometry.userData, p = w.geometry.attributes.position; for (let i = 0; i < p.array.length; i++) p.array[i] = folded[i] + (open[i] - folded[i]) * e; p.needsUpdate = true; w.geometry.computeVertexNormals(); }
    api.open = t;
  };

  // ---- motion: perfectly still, then a burst of fast, jerky insect movement ----
  // Hooks: api.onFlutter(strength) when the wings move, api.onClick() on each twitch.
  const api = { open: 0, onFlutter: null, onClick: null, setOpen, head, arms, eyeshine, feet, rig, get walking() { return amt; } };
  let still = 3, twitches = [], spreadT = null;
  const snap = (obj, prop, to, dur) => twitches.push({ obj, prop, from: obj.rotation[prop], to, t: 0, dur });
  api.twitch = () => {
    // head snaps to a new angle, the fingers curl, a shoulder jerks
    snap(head, 'z', (r() - 0.5) * 0.7, 0.05); snap(head, 'y', (r() - 0.5) * 0.9, 0.06); snap(head, 'x', 0.05 + r() * 0.35, 0.05);
    const a = arms[Math.floor(r() * 2)]; snap(a.wr, 'x', -0.3 - r() * 0.6, 0.04); snap(a.el, 'x', -0.12 - r() * 0.5, 0.06);
    if (api.onClick) api.onClick();
  };
  api.spread = () => { spreadT = 0; if (api.onFlutter) api.onFlutter(1); };
  api.fold = () => { spreadT = -1; };
  // ---- the walk: glide, too-long stride, joints that snap ----
  // Driven by how far root moves in the world each frame, so any caller (attic, chase, a guest's
  // copy) gets it for free. A jump of more than a metre in one frame is a teleport, not a step.
  const STRIDE = 1.12, wp = new THREE.Vector3(), lastWp = new THREE.Vector3(), fwdV = new THREE.Vector3(); let haveWp = false, phase = 0, amt = 0, spd = 0;
  const footZ = [0.04, -0.03];
  function gait(dt) {
    root.getWorldPosition(wp); let moved = 0;
    if (haveWp && dt > 0) { const d = wp.distanceTo(lastWp); if (d < 1) { fwdV.set(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())); moved = Math.max(0, (wp.x - lastWp.x) * fwdV.x + (wp.z - lastWp.z) * fwdV.z); } }
    lastWp.copy(wp); haveWp = true;
    spd += ((dt > 0 ? moved / dt : 0) - spd) * Math.min(1, dt * 10);
    amt += ((spd > 0.15 ? 1 : 0) - amt) * Math.min(1, dt * 6);
    phase += moved / STRIDE; // one full cycle = two steps = one stride per foot
    const ST = 0.62, Ls = ST * STRIDE; // stance length: the foot travels back exactly as far as she goes forward
    for (let i = 0; i < 2; i++) {
      const ph = (phase + i * 0.5) % 1;
      // stance (ph < 0.62): planted, slides back under her at exactly her speed. Swing: a fast snap forward.
      let z, lift;
      if (ph < ST) { z = Ls / 2 - (ph / ST) * Ls; lift = 0; }
      else { const k = (ph - ST) / (1 - ST), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; z = -Ls / 2 + e * Ls; lift = Math.sin(k * Math.PI) * 0.07; }
      const f = feet[i]; f.position.z = z * amt + (1 - amt) * footZ[i];
      f.position.y = lift * amt; f.rotation.x = -lift * 2.2 * amt;
      f.userData.shin.rotation.x = -Math.atan2(f.position.z, 0.85) - f.rotation.x; // knee snaps through with the foot
    }
    // the body glides: barely any bob, a forward lean, a sway from hip to hip, and a small hitch (the
    // joint snap) right as each foot lands
    const c = phase * Math.PI * 2, land = Math.max(0, Math.cos(c * 2)) ** 18;
    rig.position.y = (0.012 * Math.cos(c * 2) - 0.035 * land) * amt;
    rig.position.x = 0.03 * Math.sin(c) * amt;
    rig.rotation.x = (0.1 + 0.03 * land) * amt;
    rig.rotation.z = -0.035 * Math.sin(c) * amt;
    body.rotation.y = 0.06 * Math.sin(c) * amt;
    // the cloak: the wings lag behind the body, swinging from the shoulders
    for (const w of wings) { const pv = w.userData.piv, sx = Math.sign(w.geometry.userData.open[3 * 40] || 1); pv.rotation.x = (-0.12 - 0.05 * Math.sin(c * 2 - 0.9)) * amt * (1 - api.open); pv.rotation.z = 0.05 * Math.sin(c - 0.8) * amt * (1 - api.open); pv.rotation.y = sx * 0.03 * Math.sin(c * 2 - 1.2) * amt; }
    // arms barely move: one swings stiffly from the shoulder, out of time
    const a = arms[1]; a.sh.rotation.x = a.rest.sh.x + 0.18 * Math.sin(c + Math.PI) * amt;
  }
  api.update = (dt) => {
    for (const tw of twitches) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.obj.rotation[tw.prop] = tw.from + (tw.to - tw.from) * (1 - Math.pow(1 - k, 4)); }
    twitches = twitches.filter(t => t.t < t.dur);
    if (spreadT !== null) { if (spreadT >= 0) { spreadT += dt; setOpen(Math.min(1, spreadT / 0.18)); if (spreadT > 0.18) spreadT = null; } else { setOpen(Math.max(0, api.open - dt / 1.2)); if (api.open <= 0) spreadT = null; } }
    gait(dt);
    still -= dt;
    if (still <= 0) { api.twitch(); still = r() < 0.6 ? 0.08 + r() * 0.15 : 2 + r() * 4; }
  };
  root.userData.api = api;
  setOpen(0);
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
