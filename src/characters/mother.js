// The Mother: the cult leader's wife, half-emerged from a giant cocoon in the attic.
// Human-faced, but too-large dark eyes, pale fuzz and a powdery sheen; huge dusty
// wings folded round her like a cloak. Preview-only for now: not used by the game.
import * as THREE from 'three';

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
      for (const [rad, col] of [[170, '#2a2018'], [150, '#c09048'], [120, '#3a2a1c'], [96, '#1a120c'], [54, '#0c0806']]) { g.fillStyle = col; g.beginPath(); g.ellipse(ex, ey, rad, rad * 0.86, -0.2, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(235,225,200,0.9)'; g.lineWidth = 14; g.beginPath(); g.arc(ex - 18, ey - 10, 66, 3.6, 5.2); g.stroke();
      g.fillStyle = 'rgba(240,232,214,0.95)'; g.beginPath(); g.ellipse(ex - 26, ey - 26, 16, 10, -0.6, 0, 7); g.fill();
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
    g.fillStyle = '#d8b8a0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '170,130,110' : '250,236,222'},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 1); }
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
  const skin = new THREE.MeshPhysicalMaterial({ map: skinTexture(), color: 0xe6c8b2, roughness: 0.6, sheen: 0.8, sheenColor: new THREE.Color(0xf8eee0), sheenRoughness: 0.45 });
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
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 12, 28), new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 1 })); torso.scale.set(1.05, 1, 0.7); torso.position.y = 0.36; body.add(torso);
  addFuzz(torso, { depth: 0.035, layers: 12, density: 0.35, seed: 4, color: furCol });
  // thick moth fur over the shoulders and a deep ruff round the neck
  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.085, 16, 40), new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 1 }));
  ruff.rotation.x = Math.PI / 2; ruff.scale.set(1.45, 0.95, 1); ruff.position.y = 0.66; body.add(ruff);
  addFuzz(ruff, { depth: 0.06, layers: 14, density: 0.45, seed: 7, color: 0xe2d6bc });
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: furCol, roughness: 1 })); sh.scale.set(1.2, 0.8, 1); sh.position.set(sx * 0.2, 0.6, -0.01); body.add(sh); addFuzz(sh, { depth: 0.05, layers: 12, density: 0.4, seed: 8 + sx, color: 0xc8b896 }); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.055, 0.14, 20), skin); neck.position.y = 0.77; body.add(neck);
  // arms and long fingers gripping the torn rim at the front
  const limb = (a, b, rad, m = skin) => { const d = b.clone().sub(a); const mm = new THREE.Mesh(new THREE.CapsuleGeometry(rad, d.length(), 6, 12), m); mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); body.add(mm); return mm; };
  for (const sx of [-1, 1]) {
    const sh = new THREE.Vector3(sx * 0.21, 0.6, 0), el = new THREE.Vector3(sx * 0.4, 0.26, 0.12), wr = new THREE.Vector3(sx * 0.42, 0.08, 0.42);
    limb(sh, el, 0.034); limb(el, wr, 0.027);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), skin); palm.scale.set(1.1, 0.45, 1.25); palm.position.copy(wr).add(new THREE.Vector3(0, 0.0, 0.03)); body.add(palm);
    // four long fingers curling over the edge and down the outside, and a thumb inside
    for (let f = 0; f < 4; f++) {
      const base = wr.clone().add(new THREE.Vector3(sx * (f - 1.5) * 0.017 * -1, 0.0, 0.07));
      const k1 = base.clone().add(new THREE.Vector3(0, 0.012, 0.06 + (f === 1 || f === 2 ? 0.012 : 0)));
      const k2 = k1.clone().add(new THREE.Vector3(0, -0.07, 0.03));
      const tip = k2.clone().add(new THREE.Vector3(0, -0.06, -0.012));
      limb(base, k1, 0.0075); limb(k1, k2, 0.0068); limb(k2, tip, 0.006);
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.3 })); nail.position.copy(tip); body.add(nail);
    }
    limb(wr.clone().add(new THREE.Vector3(-sx * 0.03, 0, 0.0)), wr.clone().add(new THREE.Vector3(-sx * 0.06, -0.05, 0.02)), 0.008);
  }

  // ---- head: human, real skin, too-large glossy black eyes, feathered antennae ----
  const head = new THREE.Group(); head.position.set(0, 0.93, 0.03); head.rotation.set(0.12, 0.0, 0.05); body.add(head);
  const skull = new THREE.Mesh(headGeo(), skin); head.add(skull);
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x050304, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  for (const sx of [-1, 1]) {
    const ex = sx * 0.032, ey = 0.014;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.024, 24, 18), eyeMat); e.scale.set(1.15, 0.82, 0.55); e.rotation.z = -sx * 0.18;
    e.position.set(ex, ey, surfZ(ex, ey) - 0.006); head.add(e);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.003, 6, 24, Math.PI * 0.9), skin); lid.scale.set(1.1, 0.75, 1); lid.rotation.z = Math.PI * 0.05 - sx * 0.18; lid.position.set(ex, ey + 0.002, surfZ(ex, ey) - 0.001); head.add(lid);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0024, 0.03, 4, 8), new THREE.MeshStandardMaterial({ color: 0x6a5a48 })); brow.rotation.z = Math.PI / 2 - sx * 0.2; brow.position.set(sx * 0.034, 0.046, surfZ(sx * 0.034, 0.046) + 0.001); head.add(brow);
  }
  const lips = new THREE.MeshStandardMaterial({ color: 0xa87a72, roughness: 0.45 });
  const ul = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 8), lips); ul.scale.set(1.2, 0.28, 0.4); ul.position.set(0, -0.058, surfZ(0, -0.058) - 0.002); head.add(ul);
  const ll = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 8), lips); ll.scale.set(1.05, 0.36, 0.45); ll.position.set(0, -0.066, surfZ(0, -0.066) - 0.002); head.add(ll);
  // hair: dark, long, parted, matted with silk
  const hairMat = new THREE.MeshPhysicalMaterial({ color: 0x2e241c, roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color(0x8a7a66) });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.094, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat); cap.scale.set(0.95, 1.2, 1.06); cap.position.set(0, 0.01, -0.006); cap.rotation.x = -0.12; head.add(cap);
  for (let i = 0; i < 180; i++) {
    const a = Math.PI * 0.32 + (i / 179) * Math.PI * 1.36 + (r() - 0.5) * 0.05, rr = 0.088;
    const p0 = new THREE.Vector3(Math.sin(a) * rr * 0.9, 0.05 + r() * 0.04, Math.cos(a) * rr - 0.01);
    const len = 0.45 + r() * 0.3, p3 = new THREE.Vector3(Math.sin(a) * (0.2 + r() * 0.08), -len, Math.cos(a) * 0.12 - 0.08);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CubicBezierCurve3(p0, p0.clone().add(new THREE.Vector3(Math.sin(a) * 0.05, -0.05, 0.02)), p3.clone().add(new THREE.Vector3(0, 0.2, 0)), p3), 20, 0.003 + r() * 0.003, 4), hairMat));
  }
  const antMat = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx * 0.028, 0.08, 0.06), new THREE.Vector3(sx * 0.07, 0.17, 0.04), new THREE.Vector3(sx * 0.17, 0.21, -0.08));
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
