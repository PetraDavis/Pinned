// High mosaics are leaded stained glass: the cult moth, in coloured glass pieces, lit from
// behind by the dusk. Light shafts (stacked textured slices, additive), drifting dust in
// the beams, and a coloured patch where the light lands. Driven by game time.
import * as THREE from 'three';

// Leaded-glass texture: Voronoi pieces whose colour is sampled from a design canvas,
// pushed toward saturated glass colours, with dark lead lines between pieces.
export function stainedGlassTexture(design, size = 512, cell = 13) {
  const S = size, dc = document.createElement('canvas'); dc.width = dc.height = S;
  const dg = dc.getContext('2d'); dg.imageSmoothingEnabled = true; dg.fillStyle = '#1e3036'; dg.fillRect(0, 0, S, S); const P = S * 0.06; dg.drawImage(design, P, P, S - 2 * P, S - 2 * P);
  const D = dg.getImageData(0, 0, S, S).data;
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const G = Math.ceil(S / cell), pts = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const x = Math.min(S - 1, (i + 0.15 + rnd() * 0.7) * cell), y = Math.min(S - 1, (j + 0.15 + rnd() * 0.7) * cell);
    const k = (Math.floor(y) * S + Math.floor(x)) * 4; let r = D[k], g = D[k + 1], b = D[k + 2];
    // map the design's colours onto a glass palette, with per-piece variation
    const m = (r + g + b) / 3, v = 0.85 + rnd() * 0.3, t = rnd();
    if (m < 60) { r = 40 + t * 70; g = 50 + t * 30; b = 150 + rnd() * 90; }          // ground: deep blue and violet
    else if (r > g + 35) { r = 200 * v; g = 30 * v; b = 40 * v; }                    // eyespots: ruby
    else if (m < 95) { r = 150 * v; g = 80 * v; b = 25 * v; }                        // body, veins: dark amber
    else if (m > 185) { r = 255 * v; g = 225 * v; b = 150 * v; }                     // forewings: pale gold
    else { r = 240 * v; g = 150 * v; b = 50 * v; }                                    // hindwings: amber
    pts.push([x, y, r, g, b]);
  }
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const img = g.createImageData(S, S), O = img.data, R = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let d1 = 1e9, d2 = 1e9, best = null;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const I = ci + a, J = cj + b; if (I < 0 || J < 0 || I >= G || J >= G) continue;
      const p = pts[J * G + I], d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
      if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d;
    }
    const lead = Math.sqrt(d2) - Math.sqrt(d1) < 1.6, rr = Math.hypot(x - R, y - R), k = (y * S + x) * 4;
    const ring = rr > R - 10; // a lead-and-iron rim
    const shade = 0.88 + 0.12 * Math.sin(x * 0.07 + y * 0.05); // uneven glass
    if (lead || ring) { O[k] = 18; O[k + 1] = 16; O[k + 2] = 16; }
    else { O[k] = best[2] * shade; O[k + 1] = best[3] * shade; O[k + 2] = best[4] * shade; }
    O[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// The cult-symbol window: one texture, shared by the facade and the Grand Hall, so the
// window reads identically from both sides.
let cultTex = null;
export function cultGlassTexture(design, size) { return cultTex || (cultTex = stainedGlassTexture(design, size)); }

// Light, not a picture: the window's colours averaged into soft pools. A tiny copy of the
// glass is blurred heavily and faded toward its edge, so the floor patch and the shafts
// carry the window's colours (blue at the rim, amber and gold in the middle) without
// repeating its pattern.
function lightTexture(image, blurPx, edge = 0.5) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const small = document.createElement('canvas'); small.width = small.height = 24; small.getContext('2d').drawImage(image, 0, 0, 24, 24);
  g.filter = `blur(${blurPx}px)`; g.imageSmoothingEnabled = true; g.drawImage(small, -8, -8, S + 16, S + 16); g.filter = 'none';
  // radial falloff: brightest in the middle, fading to nothing at the rim
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(edge, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // premultiply onto black so additive blending fades smoothly
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const SLICES = { low: 5, medium: 10, high: 18 }, DUST = { low: 50, medium: 140, high: 300 };

// center: window centre (world, in `group` space); right/up: unit vectors of the window plane
// as seen from inside; radius; dir: direction the light travels (normalized); floorY.
export function buildGlassWindow(group, { texture, center, right, up, radius, dir, floorY = 0.01, quality = 'high', tint = 0xffffff }) {
  const api = { slices: [] };
  // the glass itself: glowing with the light behind it
  const geo = new THREE.CircleGeometry(radius, 64);
  const glass = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, color: tint, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  const basis = new THREE.Matrix4().makeBasis(right, up, new THREE.Vector3().crossVectors(right, up));
  glass.quaternion.setFromRotationMatrix(basis); glass.position.copy(center); group.add(glass);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.04, 0.07, 16, 96), new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.22 }));
  rim.quaternion.copy(glass.quaternion); rim.position.copy(center); group.add(rim);
  // where a point on the glass lands on the floor, travelling along dir
  const land = (p) => p.clone().addScaledVector(dir, (floorY - p.y) / dir.y);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const sliceGeo = (s) => {
    const g = new THREE.BufferGeometry(), arr = new Float32Array(pos.count * 3), w = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      w.copy(center).addScaledVector(right, pos.getX(i)).addScaledVector(up, pos.getY(i));
      const f = land(w); w.lerp(f, s); arr.set([w.x, w.y, w.z], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); g.setAttribute('uv', uv); g.setIndex(geo.index); return g;
  };
  // the coloured patch on the floor
  const poolTex = lightTexture(texture.image, 6, 0.35), shaftTex = lightTexture(texture.image, 4, 0.55);
  const patch = new THREE.Mesh(sliceGeo(1), new THREE.MeshBasicMaterial({ map: poolTex, color: tint, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  { const gg = patch.geometry; gg.computeBoundingBox(); const c = gg.boundingBox.getCenter(new THREE.Vector3()); gg.translate(-c.x, -c.y, -c.z); gg.scale(1.4, 1, 1.4); gg.translate(c.x, c.y, c.z); } // soft edge spills past the hard projection
  patch.position.y = 0.06; patch.renderOrder = 3; patch.userData.noAO = true; group.add(patch);
  // shafts: textured slices between the glass and the floor, faint, fading toward the floor
  const maxS = SLICES.high;
  for (let k = 0; k < maxS; k++) {
    const s = (k + 0.5) / maxS;
    const m = new THREE.Mesh(sliceGeo(s), new THREE.MeshBasicMaterial({ map: shaftTex, color: tint, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    m.userData.s = s; m.userData.noAO = true; m.renderOrder = 4; group.add(m); api.slices.push(m);
  }
  // dust motes drifting in the beam
  const maxD = DUST.high, dpos = new Float32Array(maxD * 3), seeds = [];
  for (let i = 0; i < maxD; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * 0.95; seeds.push([Math.cos(a) * r, Math.sin(a) * r, Math.random(), Math.random() * 10]); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.009, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  dust.frustumCulled = false; dust.userData.noAO = true; group.add(dust);
  const w = new THREE.Vector3(), f = new THREE.Vector3();
  api.setQuality = (q) => {
    const step = Math.max(1, Math.round(maxS / (SLICES[q] || SLICES.medium)));
    api.slices.forEach((m, k) => { m.visible = k % step === 0; m.material.opacity = 0.045 * step * (1 - m.userData.s * 0.7); });
    dgeo.setDrawRange(0, DUST[q] || DUST.medium);
  };
  api.update = (t) => {
    const n = dgeo.drawRange.count === Infinity ? maxD : Math.min(maxD, dgeo.drawRange.count);
    for (let i = 0; i < n; i++) {
      const [u, v, s0, ph] = seeds[i], s = (s0 + t * 0.006) % 1;
      w.copy(center).addScaledVector(right, u + Math.sin(t * 0.3 + ph) * 0.08).addScaledVector(up, v + Math.sin(t * 0.21 + ph * 2) * 0.08);
      f.copy(w).addScaledVector(dir, (floorY - w.y) / dir.y); w.lerp(f, 0.05 + s * 0.9);
      dpos.set([w.x, w.y, w.z], i * 3);
    }
    dgeo.attributes.position.needsUpdate = true;
  };
  api.setQuality(quality);
  return api;
}
