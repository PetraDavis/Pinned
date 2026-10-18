// The player's reflection. Always a human teenager, good-looking, with a soft, shaggy,
// chin-length androgynous haircut and a fringe; never wings or antennae. Each mirror shows
// a little more of an unknown moth, subtly (M1..M8):
//  1 tired, dusty                       2 a touch taller and thinner, paler smoother skin
//  3 eyes slightly too large and dark   4 pale soft fuzz-like hair, faint powdery sheen
//  5 longer neck and fingers, very still   6 faint wing-pattern markings under the skin
//  7 eyeshine                           8 almost perfect; smiles before you do
// Only rendered inside mirror reflections, so detail is spent on the head, hands and hair,
// and static parts are merged per material to keep draw calls low.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from './build.js';

// Multiplayer clothing colours, one per join slot (host = 0). Muted, period-dyed wools.
export const PLAYER_COLORS = [
  { name: 'Oxblood', hex: 0x6a2626 },
  { name: 'Bottle green', hex: 0x2c4a34 },
  { name: 'Navy', hex: 0x23304e },
  { name: 'Mustard', hex: 0x8a6c26 },
];
const DEFAULT_KNIT = 0x2c333c; // solo play: the original slate hoodie
const knitCache = new Map();
const knitFor = col => { if (!knitCache.has(col)) { const t = fabricTex(col, true); t.userData.shared = true; knitCache.set(col, t); } return knitCache.get(col); };
// Recolour an avatar's hoodie (null = the solo default).
export function setClothes(av, slot) {
  const m = av.userData.hoodieMat; if (!m) return;
  const c = PLAYER_COLORS[slot]; m.map = knitFor(c ? c.hex : DEFAULT_KNIT); m.needsUpdate = true;
}
// The mirror reflections are the local player: they follow the local player's slot.
const selfAvatars = new Set(); let selfSlot = null;
export function setSelfClothes(slot) { selfSlot = slot; for (const a of selfAvatars) setClothes(a, slot); }

const V2 = (x, y) => new THREE.Vector2(x, y);
const clean = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };

export function makeAvatar(stage, opts = {}) {
  const a = new THREE.Group();
  const st = k => stage >= k;
  const hr = rand(stage * 13 + 1);

  // ---------- materials ----------
  const skinCol = new THREE.Color(0xd9b29a).lerp(new THREE.Color(0xeee4dc), st(2) ? Math.min(1, 0.35 + (stage - 2) * 0.1) : 0);
  const skin = new THREE.MeshPhysicalMaterial({ color: skinCol, roughness: st(2) ? 0.48 : 0.6, emissive: 0x2a1c16, emissiveIntensity: 0.7,
    sheen: st(4) ? 0.7 : 0.18, sheenColor: new THREE.Color(0xf4ece0), sheenRoughness: 0.5, map: skinTex(stage), clearcoat: st(4) ? 0.15 : 0, clearcoatRoughness: 0.6 });
  const hairCol = st(4) ? 0xd2c9bb : 0x3a2a20;
  const hair = new THREE.MeshPhysicalMaterial({ color: hairCol, roughness: 0.7, sheen: st(4) ? 1 : 0.4, sheenColor: new THREE.Color(st(4) ? 0xffffff : 0x8a6a50), emissive: hairCol, emissiveIntensity: 0.05, side: THREE.DoubleSide });
  const knit = knitFor(DEFAULT_KNIT), denim = fabricTex(0x27303e, false);
  const hoodie = new THREE.MeshStandardMaterial({ map: knit, roughness: 0.95, emissive: 0x0b0d10 });
  a.userData.hoodieMat = hoodie;
  if (opts.self) { selfAvatars.add(a); if (selfSlot != null) setClothes(a, selfSlot); }
  const jeans = new THREE.MeshStandardMaterial({ map: denim, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1c1a1a, roughness: 0.7 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.8 });
  const cord = new THREE.MeshStandardMaterial({ color: 0xd8d6cc, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });

  const tall = st(2) ? 1.03 : 1, thin = st(2) ? 0.94 : 1, neckL = st(5) ? 1.55 : 1, fingerL = st(5) ? 1.3 : 1;
  const body = new THREE.Group(); body.scale.set(thin, tall, thin); a.add(body);
  const parts = { hoodie: [], jeans: [], skin: [], shoe: [], sole: [], cord: [] };
  const put = (list, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    list.push(geo.applyMatrix4(m)); return geo;
  };

  // ---------- torso: a hoodie with shoulders, a slight chest, a hem and a kangaroo pocket ----------
  const torsoProf = [[0.0, 0.0], [0.16, 0.0], [0.17, 0.02], [0.165, 0.08], [0.158, 0.2], [0.168, 0.34], [0.18, 0.44], [0.19, 0.5], [0.17, 0.55], [0.11, 0.6], [0.06, 0.62], [0.0, 0.62]].map(([x, y]) => V2(x, y));
  put(parts.hoodie, new THREE.LatheGeometry(torsoProf, 28), 0, 0.82, 0, 0, 0, 0, 1.0, 1, 0.64);
  put(parts.hoodie, new THREE.CylinderGeometry(0.168, 0.168, 0.05, 28, 1, true), 0, 0.84, 0, 0, 0, 0, 1.0, 1, 0.64); // ribbed hem
  put(parts.hoodie, new THREE.BoxGeometry(0.22, 0.13, 0.02, 4, 2, 1), 0, 0.96, 0.105);                                  // pocket
  // hood: a thick soft collar bunched behind the neck, open at the front
  put(parts.hoodie, new THREE.TorusGeometry(0.085, 0.042, 12, 24, Math.PI * 1.35), 0, 1.47, -0.03, Math.PI / 2 + 0.3, 0, Math.PI * 0.825, 1.05, 1, 1);
  put(parts.hoodie, new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 1.44, -0.1, -1.1, 0, 0, 1.1, 0.8, 0.9);
  // drawstrings with aglets
  for (const sx of [-1, 1]) {
    const pts = [new THREE.Vector3(sx * 0.035, 1.43, 0.095), new THREE.Vector3(sx * 0.04, 1.35, 0.11), new THREE.Vector3(sx * 0.037 + hr() * 0.01, 1.27, 0.115)];
    parts.cord.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0035, 5, false));
    put(parts.cord, new THREE.CylinderGeometry(0.0045, 0.0045, 0.02, 6), pts[2].x, 1.26, 0.115);
  }

  // ---------- arms: shoulder, upper arm, bent elbow, forearm, ribbed cuff, hands ----------
  for (const sx of [-1, 1]) {
    put(parts.hoodie, new THREE.SphereGeometry(0.06, 16, 12), sx * 0.17, 1.38, 0, 0, 0, 0, 1.1, 0.75, 1);
    put(parts.hoodie, new THREE.CapsuleGeometry(0.052, 0.24, 6, 14), sx * 0.205, 1.2, 0, 0, 0, sx * 0.1);
    put(parts.hoodie, new THREE.CapsuleGeometry(0.046, 0.22, 6, 14), sx * 0.235, 0.96, 0.025, -0.12, 0, sx * 0.05);
    for (let k = 0; k < 3; k++) put(parts.hoodie, new THREE.TorusGeometry(0.04, 0.008, 6, 18), sx * 0.242, 0.83 - k * 0.015, 0.04, Math.PI / 2 - 0.12, 0, 0);
    hand(sx, sx * 0.25, 0.8, 0.045);
  }

  // ---------- legs and shoes ----------
  const legProf = [[0.0, 0], [0.058, 0], [0.06, 0.06], [0.056, 0.3], [0.06, 0.42], [0.072, 0.62], [0.082, 0.8], [0.0, 0.82]].map(([x, y]) => V2(x, y));
  for (const sx of [-1, 1]) {
    put(parts.jeans, new THREE.LatheGeometry(legProf, 18), sx * 0.09, 0.06, 0, 0, 0, sx * -0.02);
    put(parts.shoe, new THREE.CapsuleGeometry(0.045, 0.15, 6, 12), sx * 0.09, 0.05, 0.04, Math.PI / 2, 0, 0, 1.1, 1, 0.8);
    put(parts.sole, new THREE.BoxGeometry(0.1, 0.02, 0.27, 2, 1, 4), sx * 0.09, 0.01, 0.04);
  }
  put(parts.jeans, new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.84, 0, Math.PI, 0, 0, 0.98, 0.45, 0.64);

  // ---------- neck: tapering into the trapezius ----------
  const neckProf = [[0.07, 0], [0.056, 0.03], [0.047, 0.07], [0.045, 0.09 * neckL], [0.05, 0.12 * neckL]].map(([x, y]) => V2(x, y));
  put(parts.skin, new THREE.LatheGeometry(neckProf, 18), 0, 1.42, 0, 0, 0, 0, 1, 1, 0.92);

  // ---------- merge the static parts, one mesh per material ----------
  for (const [k, matl] of [['hoodie', hoodie], ['jeans', jeans], ['skin', skin], ['shoe', shoeMat], ['sole', soleMat], ['cord', cord]]) {
    if (!parts[k].length) continue;
    const m = new THREE.Mesh(mergeGeometries(parts[k].map(clean), false), matl); body.add(m);
  }

  // ---------- head ----------
  const head = new THREE.Group(); head.position.y = 1.63 + 0.1 * (neckL - 1); head.scale.setScalar(1.1); body.add(head);
  head.add(new THREE.Mesh(sculptHead(), skin));
  const surf = (x, y) => headSurfaceZ(x, y);
  // ears: a curled rim, a bowl and a lobe
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(sx * 0.079, 0.002, -0.006); ear.rotation.y = sx * 0.35; head.add(ear);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), skin); bowl.scale.set(0.35, 1.15, 0.8); ear.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0035, 6, 20, Math.PI * 1.4), skin); rim.rotation.set(0, sx * Math.PI / 2, -Math.PI * 0.2); rim.scale.y = 1.25; rim.position.x = sx * 0.004; ear.add(rim);
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), skin); lobe.position.set(sx * 0.002, -0.019, 0.002); ear.add(lobe);
  }
  // nose: nostrils, a soft tip and the philtrum groove
  const nostril = new THREE.MeshStandardMaterial({ color: 0x5a3028, roughness: 0.9 });
  for (const sx of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), nostril); n.scale.set(1.4, 0.45, 1); n.position.set(sx * 0.0058, -0.0352, surf(sx * 0.0058, -0.0352) - 0.0035); n.rotation.x = 0.5; head.add(n); }
  // lips: an upper bow and a fuller lower lip; at M8 the corners lift, a smile
  const lipMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0xc0847a).lerp(skinCol, st(2) ? 0.35 : 0.1), roughness: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  for (const sx of [-1, 1]) { const u = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 14, 8), lipMat); u.scale.set(1.05, 0.33, 0.42); u.position.set(sx * 0.0075, -0.0515 + (st(8) ? 0.0012 : 0), surf(sx * 0.0075, -0.0515) - 0.002); u.rotation.z = sx * (st(8) ? -0.32 : -0.12); head.add(u); }
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 16, 8), lipMat); lower.scale.set(1.08, 0.42, 0.46); lower.position.set(0, -0.0605, surf(0, -0.0605) - 0.0022); head.add(lower);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0005, 4, 16, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0x6a3a34, roughness: 0.8 })); seam.rotation.z = st(8) ? Math.PI * 1.05 : Math.PI * 1.04; seam.position.set(0, -0.039 - (st(8) ? 0.0175 : 0.0168), surf(0, -0.056) + 0.0005); seam.scale.y = st(8) ? 0.45 : 0.2; head.add(seam);
  // eyes: sclera, iris with a darker limbal ring, pupil, a glint, lids, lashes and brows
  const eyeScale = st(3) ? 1.15 + (stage - 3) * 0.03 : 1;
  const sclera = new THREE.MeshPhysicalMaterial({ color: 0xece6de, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const irisMat = new THREE.MeshStandardMaterial({ map: irisTex(st(3) ? 0x241a12 : 0x6a4a32), roughness: 0.2, emissive: st(7) ? 0x8a7a3a : 0x000000, emissiveIntensity: st(7) ? 1.6 : 0 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x050404, roughness: 0.05 });
  const lashMat = new THREE.MeshStandardMaterial({ color: 0x140e0c, roughness: 0.9 });
  const browMat = new THREE.MeshStandardMaterial({ color: st(4) ? 0xb8ae9e : 0x2e2018, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const ex = sx * 0.03, ey = 0.016;
    const eye = new THREE.Group(); eye.position.set(ex, ey, surf(ex, ey) - 0.0085); eye.scale.setScalar(eyeScale); eye.scale.x *= 1.15; head.add(eye);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.0125, 20, 14), sclera));
    const iris = new THREE.Mesh(new THREE.CircleGeometry(st(3) ? 0.0079 : 0.0064, 24), irisMat); iris.position.z = 0.0123; eye.add(iris);
    const pp = new THREE.Mesh(new THREE.CircleGeometry(st(3) ? 0.0046 : 0.0029, 16), pupil); pp.position.z = 0.0126; eye.add(pp);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(0.0011, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.0022, 0.0024, 0.0129); eye.add(glint);
    // tear duct: a pink corner on the inside
    const duct = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 6, 6), new THREE.MeshStandardMaterial({ color: 0xc88a84, roughness: 0.3 })); duct.position.set(-sx * 0.0118, -0.0008, 0.0045); eye.add(duct);
    // lids: upper heavier (tired at M1), lower thin
    const upLid = new THREE.Mesh(new THREE.SphereGeometry(0.0136, 18, 8, 0, Math.PI * 2, 0, Math.PI * (st(2) ? 0.27 : 0.31)), skin); upLid.rotation.x = 0.28; eye.add(upLid);
    const loLid = new THREE.Mesh(new THREE.SphereGeometry(0.0134, 18, 6, 0, Math.PI * 2, Math.PI * 0.76, Math.PI * 0.24), skin); loLid.rotation.x = -0.1; eye.add(loLid);
    // lashes along the upper lid
    const lp = []; for (let i = 0; i <= 10; i++) { const t = i / 10 - 0.5; lp.push(new THREE.Vector3(t * 0.024, 0.0075 - t * t * 0.022, 0.0118 - t * t * 0.012)); }
    const lash = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lp), 14, 0.0007, 4, false), lashMat); lash.rotation.x = -0.05; eye.add(lash);
    // brows: a soft tapering arch
    const bp = []; for (let i = 0; i <= 8; i++) { const t = i / 8; bp.push(new THREE.Vector3(sx * (0.014 + t * 0.03), 0.034 + Math.sin(t * Math.PI * 0.9) * 0.006 - t * 0.002, 0)); }
    bp.forEach(p => { p.z = surf(p.x, p.y) + 0.0012; });
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 12, 0.0022, 5, false), browMat));
  }

  // ---------- hair: shaggy, chin-length, a fringe; strands merged into one mesh ----------
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.44), hair); cap.scale.set(0.9, 1.14, 1.02); cap.position.set(0, 0.013, -0.006); head.add(cap);
  const strands = [];
  const strand = (pts, r0) => { const c = new THREE.CatmullRomCurve3(pts); const g = new THREE.TubeGeometry(c, 10, r0, 4, false);
    // taper toward the tip
    const p = g.attributes.position, n = 11, ring = 5; for (let i = 0; i < n; i++) { const k = 1 - Math.pow(i / (n - 1), 1.6) * 0.8, cp = c.getPoint(i / (n - 1)); for (let j = 0; j < ring; j++) { const idx = i * ring + j; p.setXYZ(idx, cp.x + (p.getX(idx) - cp.x) * k, cp.y + (p.getY(idx) - cp.y) * k, cp.z + (p.getZ(idx) - cp.z) * k); } }
    g.computeVertexNormals(); strands.push(g); };
  // fringe: from the crown forward, falling to the brows, parted a little off-centre, uneven
  for (let i = 0; i < 64; i++) {
    const clump = Math.floor(i / 6), t = (clump / 10.5 - 0.5) + (hr() - 0.5) * 0.045, x = t * 0.15, len = 0.75 + hr() * 0.4 + (clump % 2) * 0.15;
    const root = new THREE.Vector3(x * 0.4, 0.1, 0.0), z0 = surf(x, 0.05) + 0.007;
    const tipX = x * 1.08 + (hr() - 0.5) * 0.012 + (clump % 3 - 1) * 0.004;
    strand([root, new THREE.Vector3(x * 0.8, 0.092, 0.065), new THREE.Vector3(x * 1.02, 0.068, z0 + 0.012), new THREE.Vector3(tipX, 0.066 - 0.034 * len, z0 + 0.004)], 0.0058 + hr() * 0.002);
  }
  // sides and back: falling to the chin, flicking out a little, layered
  for (let i = 0; i < 120; i++) {
    const a2 = Math.PI * 0.36 + (i / 119) * Math.PI * 1.28 + (hr() - 0.5) * 0.04, layer = i % 3;
    const sx = Math.sin(a2), cz = Math.cos(a2);
    const r0 = 0.092 + layer * 0.004, len = 0.15 + hr() * 0.035 - layer * 0.012;
    const root = new THREE.Vector3(sx * 0.05, 0.1, cz * 0.05 - 0.01);
    const mid = new THREE.Vector3(sx * r0, 0.03, cz * r0 * 0.98 - 0.008);
    const low = new THREE.Vector3(sx * (r0 + 0.006), 0.03 - len * 0.6, cz * (r0 + 0.004) - 0.01);
    const tip = new THREE.Vector3(sx * (r0 + 0.018 + hr() * 0.01), 0.03 - len, cz * (r0 + 0.012) - 0.012 + (hr() - 0.5) * 0.01);
    strand([root, mid, low, tip], 0.0068 + hr() * 0.002);
  }
  // a few flyaways
  for (let i = 0; i < 14; i++) { const a2 = Math.PI * (0.45 + hr() * 1.1), sx = Math.sin(a2), cz = Math.cos(a2); strand([new THREE.Vector3(sx * 0.06, 0.1, cz * 0.06), new THREE.Vector3(sx * 0.1, 0.06, cz * 0.1), new THREE.Vector3(sx * 0.115 + (hr() - 0.5) * 0.02, -0.02 - hr() * 0.04, cz * 0.11)], 0.0018); }
  head.add(new THREE.Mesh(mergeGeometries(strands.map(clean), false), hair));
  if (st(4)) { // a faint downy halo of fine fuzz along the hairline and cheeks
    const pts = []; for (let i = 0; i < 400; i++) { const u = hr() * 6.28, v = hr() * 1.6; pts.push(Math.cos(u) * Math.sin(v) * 0.105, 0.0 + Math.cos(v) * 0.12, Math.sin(u) * Math.sin(v) * 0.1); }
    head.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), new THREE.PointsMaterial({ color: 0xf4eee4, size: 0.0025, transparent: true, opacity: 0.5 })));
  }
  if (!st(2)) { // dust caught in the hair
    const pts = []; for (let i = 0; i < 160; i++) { const u = hr() * 6.28, v = hr() * 1.3; pts.push(Math.cos(u) * Math.sin(v) * 0.112, 0.02 + Math.cos(v) * 0.112, Math.sin(u) * Math.sin(v) * 0.112); }
    head.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), new THREE.PointsMaterial({ color: 0xd8d0c0, size: 0.004 })));
  }
  a.userData.stage = stage;
  a.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return a;

  // a relaxed hand: palm, four two-joint fingers curling slightly, a thumb, knuckles and nails
  function hand(sx, x, y, z) {
    const g = [];
    put(g, new THREE.BoxGeometry(0.062, 0.075, 0.022, 3, 3, 2), x, y - 0.04, z, 0, 0, 0);
    for (let f = 0; f < 4; f++) {
      const fx = x + sx * (-0.022 + f * 0.0148) * -1, l = [0.036, 0.042, 0.04, 0.032][f] * fingerL;
      put(g, new THREE.CapsuleGeometry(0.0062, l * 0.55, 4, 8), fx, y - 0.083 - l * 0.28, z + 0.003, 0.15, 0, 0);
      put(g, new THREE.CapsuleGeometry(0.0056, l * 0.45, 4, 8), fx, y - 0.083 - l * 0.78, z + 0.011, 0.45, 0, 0);
    }
    put(g, new THREE.CapsuleGeometry(0.0075, 0.03 * fingerL, 4, 8), x + sx * 0.032, y - 0.055, z + 0.012, 0.5, 0, sx * 0.6);
    const m = new THREE.Mesh(mergeGeometries(g.map(clean), false), skin); m.scale.set(1, 1, 1); body.add(m);
  }
}

// head: a sphere pushed into a face - narrower, taller, a tapering jaw, a nose,
// soft eye sockets, cheekbones and a chin
function headShape(nx, ny, nz) {
  let x = nx * 0.082, y = ny * 0.112, z = nz * 0.094;
  if (ny < 0) { const k = 1 - 0.38 * Math.pow(-ny, 1.6); x *= k; z *= 1 - 0.18 * Math.pow(-ny, 2); }
  if (nz > 0) {
    z *= 1 - 0.1 * nz;
    const g = (cx, cy, sx, sy) => Math.exp(-(((nx - cx) / sx) ** 2) - (((ny - cy) / sy) ** 2)) * nz;
    z += 0.012 * g(0, -0.14, 0.08, 0.14) + 0.005 * g(0, -0.28, 0.11, 0.06);   // nose and its tip
    z -= 0.007 * (g(0.34, 0.12, 0.17, 0.11) + g(-0.34, 0.12, 0.17, 0.11)); // eye sockets
    z += 0.003 * g(0, 0.28, 0.5, 0.06);                                     // brow
    z += 0.004 * (g(0.48, -0.1, 0.15, 0.15) + g(-0.48, -0.1, 0.15, 0.15)); // cheekbones
    z -= 0.0015 * g(0, -0.4, 0.04, 0.06);                                   // philtrum
    z += 0.006 * g(0, -0.8, 0.2, 0.12);                                     // chin
    z -= 0.002 * (g(0.3, -0.62, 0.12, 0.12) + g(-0.3, -0.62, 0.12, 0.12));  // soft hollow under the cheek
  }
  return [x, y, z];
}
function sculptHead() {
  const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = headShape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v[0], v[1], v[2]); }
  g.computeVertexNormals(); return g;
}
// front surface depth of the head at (x, y), found by searching the sphere directions
function headSurfaceZ(x, y) {
  let best = 0, bd = 1e9;
  for (let a = -1; a <= 1; a += 0.02) for (let b = -1; b <= 1; b += 0.02) {
    const nz2 = 1 - a * a - b * b; if (nz2 <= 0) continue;
    const v = headShape(a, b, Math.sqrt(nz2)), d = (v[0] - x) ** 2 + (v[1] - y) ** 2;
    if (d < bd) { bd = d; best = v[2]; }
  }
  return best;
}

// skin: pores and freckles, a slight blush; at M1 tired shadows under the eyes; from M6
// faint wing-pattern markings on the cheeks
// The faint wing-pattern markings under the reflection's skin (M6+): four nested rings round a
// soft dark centre. Exported so the ending can give the moth on the window the same marks.
export function drawWingMarks(g, cx, cy, s = 1, alpha = 0.16, col = '150,130,120', blotCol = '140,110,100', blotA = 0.2) {
  g.strokeStyle = `rgba(${col},${alpha})`; g.lineWidth = 1.5 * s;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx, cy, (12 + k * 6) * s, (8 + k * 4) * s, 0, 0, 7); g.stroke(); }
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 6 * s); gr.addColorStop(0, `rgba(${blotCol},${blotA})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - 6 * s, cy - 6 * s, 12 * s, 12 * s);
}
function skinTex(stage) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
  const r = rand(stage + 40);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(160,120,100,${r() * (stage >= 2 ? 0.025 : 0.06)})`; g.fillRect(r() * 512, r() * 512, 1, 1); }
  if (stage < 4) for (let i = 0; i < 60; i++) { const u = 0.75 + (r() - 0.5) * 0.16, v = 0.48 + (r() - 0.5) * 0.1; g.fillStyle = `rgba(150,95,70,${0.12 + r() * 0.15})`; g.beginPath(); g.arc(u * 512, v * 512, 0.8 + r() * 1.2, 0, 7); g.fill(); }
  const blot = (u, v, rad, col) => { const gr = g.createRadialGradient(u * 512, v * 512, 0, u * 512, v * 512, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); };
  if (stage < 2) { for (const du of [-0.06, 0.06]) blot(0.75 + du, 0.47, 20, 'rgba(110,80,90,0.28)'); blot(0.73, 0.52, 10, 'rgba(120,110,100,0.2)'); } // tired, and a smudge
  for (const du of [-0.1, 0.1]) blot(0.75 + du, 0.56, 32, 'rgba(220,130,120,0.14)');
  blot(0.75, 0.53, 12, 'rgba(220,140,130,0.1)');
  if (stage >= 6) for (const du of [-0.1, 0.1]) drawWingMarks(g, (0.75 + du) * 512, 0.55 * 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function irisTex(col) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const base = new THREE.Color(col), hex = '#' + base.getHexString(), lite = '#' + base.clone().lerp(new THREE.Color(0xc8a070), 0.35).getHexString();
  g.fillStyle = hex; g.fillRect(0, 0, 64, 64);
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, lite); gr.addColorStop(0.75, hex); gr.addColorStop(1, '#0a0806'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(255,230,190,0.18)'; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28; g.beginPath(); g.moveTo(32 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); g.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function fabricTex(col, knit) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const base = new THREE.Color(col); g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, 128, 128);
  const r = rand(knit ? 3 : 4);
  if (knit) for (let y = 0; y < 128; y += 3) for (let x = 0; x < 128; x += 3) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`; g.fillRect(x, y, 2, 1); }
  else for (let i = 0; i < 128; i += 2) { g.strokeStyle = `rgba(200,210,230,${0.05 + r() * 0.06})`; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 128, r() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t;
}
