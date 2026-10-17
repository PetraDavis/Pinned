// The Catacombs (sheet A-100), under the cellar. Built in the room zone's group, in its local
// coordinates, at x 27..58, z 117..157 (well away from the other floors; firstRoom.js draws
// only the floor the player is on). Static stone, bone and silk are merged by material;
// skulls are instanced, the stacked bone courses are a bump-mapped texture; only moving
// parts are separate meshes.
//
// Route: stair E comes down from the Ritual Chapel into the Bone Gallery (the floor's one
// spawn point, and the sealed tunnel kept for the escape at the end), then
//   Ossuary      - four bays of numbered skull niches; a four-figure lock on the gate south
//   Flooded Crypt- coffins afloat in black water; only some lids hold
//   Tomb Hall    - a tomb door sealed with wax, a living cocoon pressed into the seal
//   Apothecary   - thirty skull-carved drawers, six poison moths and their keys, an iron
//                  cabinet that wants the keys from the mildest poison to the deadliest
//   Back Stair   - stair B, up to the First Floor (the only way up to it)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex } from '../textures.js';
import { mat, rep, rect, rand } from './build.js';
import { cocoonBody, spunCocoon, mergeSilk } from './cocoon.js';
import { silkTex } from './lowerUpper.js';
import { drawMoth, SPECIES } from '../moths.js';
import { POISON_ORDER, DECOY_KEYS } from '../catacombMoths.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const H = 2.8; // vault height

export const CATA = {
  spawn: V(33.5, 121.4),        // foot of stair E (the floor's one spawn point)
  stairE: V(33.5, 120.7),       // back up to the chapel
  tunnel: V(30.75, 125.0),      // the sealed tunnel (the finale escape goes this way)
  ossLock: V(45.1, 127.3),
  cryptStart: V(45.1, 128.9),
  seal: V(45.0, 147.3),
  ledger: V(43.8, 151.6),
  cabinet: V(48.6, 155.9),
  stairB: V(55.0, 150.7),       // up to the First Floor
  stairBFoot: V(55.0, 151.8),
  lantern: V(38.6, 126.9),
};
// the ossuary lock: in each bay, the niche whose skull carries a resting moth
export const OSS_DIGITS = [7, 2, 9, 4];
export const OSSUARY_CODE = OSS_DIGITS.join('');
// the flooded crypt: 3 columns x 5 rows of coffins; [row, col] of the lids that hold
// (col 0 is the west column, on your right as you walk south from the gate)
export const CRYPT = {
  x0: 43.4, x1: 46.8, z0: 129.7, z1: 140.7,
  cols: [44.0, 45.1, 46.2], rows: [130.8, 133.0, 135.2, 137.4, 139.6], w: 0.9, l: 2.0,
  safe: [[0, 1], [1, 0], [2, 0], [3, 1], [4, 2]],
};
// the apothecary drawers: 6 columns x 5 rows. "c,r" -> moth (each holds a key), and the
// drawers with spring needles (stained underneath)
export const DRAWERS = {
  cols: 6, rows: 5, x: 41.2, front: 156.49,
  moths: { '1,3': 'poodle', '4,0': 'dominula', '0,1': 'epilais', '5,4': 'chrysorrhoea', '2,2': 'opercularis', '3,4': 'obliqua' },
  traps: ['2,0', '1,1', '5,1', '3,2', '0,3', '4,3', '2,4'],
};
export { POISON_ORDER };

export function buildCatacombs(ctx) {
  const { group, local, light, door } = ctx;
  const r = rand(4471);
  // ---------- materials ----------
  const stone = mat({ map: rep(tex.stone, 1, 1), color: 0x5e5a54, roughness: 0.8 });
  const floorStone = mat({ map: rep(tex.stone, 1, 1), color: 0x4a4744, roughness: 0.7 });
  const brick = mat({ map: rep(tex.stone, 1, 1), color: 0x6a4a3c, roughness: 0.9 });
  const darkWood = mat({ map: tex.wood, color: 0x3a2a20 });
  const wood = mat({ map: tex.wood, color: 0x5e4836 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.8, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const boneBack = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 });
  const wet = new THREE.MeshStandardMaterial({ color: 0x101414, roughness: 0.06, metalness: 0.35 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });
  const silk = new THREE.MeshStandardMaterial({ map: silkTex(), color: 0xd8d8d8, roughness: 0.85, emissive: 0x1a1814, side: THREE.DoubleSide });

  // ---------- merged static geometry, one mesh per material ----------
  const lists = new Map();
  const m4 = new THREE.Matrix4(), eul = new THREE.Euler(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pp = new THREE.Vector3();
  function addGeo(material, geo, x, y, z, ry = 0, rx = 0, rz = 0, uv = 0) {
    eul.set(rx, ry, rz, 'YXZ'); qq.setFromEuler(eul); m4.compose(pp.set(x, y, z), qq, one); geo.applyMatrix4(m4);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (uv) worldUV(g, uv);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!lists.has(material)) lists.set(material, []);
    lists.get(material).push(g);
  }
  const B = (material, w, h, d, x, y, z, ry = 0, uv = 0.5) => addGeo(material, new THREE.BoxGeometry(w, h, d), x, y, z, ry, 0, 0, uv);
  function flush() {
    for (const [m, gs] of lists) { const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.receiveShadow = true; mesh.castShadow = false; group.add(mesh); }
    lists.clear();
  }
  // walls along x (at z) or along z (at x), with gaps [centre, width, headerHeight]
  function wallX(z, x0, x1, gaps = [], y0 = 0, m = stone) {
    let s = x0;
    for (const [c, w, dh = 2.3] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (c - w / 2 - s > 0.01) { B(m, c - w / 2 - s, H - y0, 0.2, (s + c - w / 2) / 2, (H + y0) / 2, z); rect(local, s, c - w / 2, z - 0.1, z + 0.1); }
      B(m, w, H - dh, 0.2, c, (H + dh) / 2, z); s = c + w / 2;
    }
    if (x1 - s > 0.01) { B(m, x1 - s, H - y0, 0.2, (s + x1) / 2, (H + y0) / 2, z); rect(local, s, x1, z - 0.1, z + 0.1); }
  }
  function wallZ(x, z0, z1, gaps = [], y0 = 0, m = stone) {
    let s = z0;
    for (const [c, w, dh = 2.3] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (c - w / 2 - s > 0.01) { B(m, 0.2, H - y0, c - w / 2 - s, x, (H + y0) / 2, (s + c - w / 2) / 2); rect(local, x - 0.1, x + 0.1, s, c - w / 2); }
      B(m, 0.2, H - dh, w, x, (H + dh) / 2, c); s = c + w / 2;
    }
    if (z1 - s > 0.01) { B(m, 0.2, H - y0, z1 - s, x, (H + y0) / 2, (s + z1) / 2); rect(local, x - 0.1, x + 0.1, s, z1); }
  }
  const floor = (x0, x1, z0, z1) => B(floorStone, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, -0.03, (z0 + z1) / 2, 0, 0.5);
  const ceil = (x0, x1, z0, z1) => {
    B(stone, x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, H + 0.05, (z0 + z1) / 2, 0, 0.5);
    // ribs of the vault
    if (x1 - x0 > z1 - z0) for (let x = x0 + 1.2; x < x1 - 0.5; x += 2.4) B(stone, 0.22, 0.2, z1 - z0, x, H - 0.1, (z0 + z1) / 2, 0, 0.5);
    else for (let z = z0 + 1.2; z < z1 - 0.5; z += 2.4) B(stone, x1 - x0, 0.2, 0.22, (x0 + x1) / 2, H - 0.1, z, 0, 0.5);
  };
  const puddle = (x, z, s) => addGeo(wet, new THREE.CircleGeometry(s, 14).scale(1, 0.6 + r() * 0.4, 1), x, 0.004, z, r() * 3, -Math.PI / 2);

  // ---------- instanced bones and skulls ----------
  const skullGeo = makeSkull();
  // the femur courses are a texture (bone ends in rows, with a bump map); skulls are 3D
  const boneTex = boneEndsTex(); boneTex.wrapS = boneTex.wrapT = THREE.RepeatWrapping;
  const boneFace = new THREE.MeshStandardMaterial({ map: boneTex, bumpMap: boneTex, bumpScale: 3, roughness: 0.9 });
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true });
  const skulls = [];
  // a stacked ossuary wall: femur heads in courses, with rows of skulls between
  function boneWall(axis, at, a, b, facing, y0 = 0.1, y1 = 1.75) {
    const depth = 0.34, inward = facing; // facing: +1 or -1 along the wall normal
    const nx = axis === 'z' ? inward : 0, nz = axis === 'x' ? inward : 0;
    const yaw = Math.atan2(nx, nz);
    const front = at + inward * (0.1 + depth);
    // dark backing so the gaps between bones read as shadow
    if (axis === 'x') B(boneFace, b - a, y1 - y0 + 0.1, depth, (a + b) / 2, (y0 + y1) / 2, at + inward * (0.1 + depth / 2), 0, 1 / 0.6);
    else B(boneFace, depth, y1 - y0 + 0.1, b - a, at + inward * (0.1 + depth / 2), (y0 + y1) / 2, (a + b) / 2, 0, 1 / 0.6);
    if (axis === 'x') rect(local, a, b, Math.min(at, front), Math.max(at, front)); else rect(local, Math.min(at, front), Math.max(at, front), a, b);
    let row = 0;
    for (let y = y0; y < y1; row++) {
      const skullRow = row === 6 || row === 15;
      if (skullRow) {
        for (let s = a + 0.12; s < b - 0.1; s += 0.19 + r() * 0.03) skulls.push([axis === 'x' ? s : front + inward * 0.01, y + 0.06, axis === 'x' ? front + inward * 0.01 : s, yaw + (r() - 0.5) * 0.4, 0.95 + r() * 0.12]);
        y += 0.17;
      } else {
        y += 0.062;
      }
    }
    // a capping course of skulls on top
    for (let s = a + 0.12; s < b - 0.1; s += 0.2) skulls.push([axis === 'x' ? s : front - inward * 0.12, y1 + 0.11, axis === 'x' ? front - inward * 0.12 : s, yaw + (r() - 0.5) * 0.5, 0.95 + r() * 0.1]);
  }

  // ---------- cocoons: static hanging ones (merged) and twitching wall ones ----------
  const silkGeos = [], threadPts = [], wallCocoons = [];
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x120c08, emissive: 0x2a1408, emissiveIntensity: 0.6, roughness: 1, side: THREE.DoubleSide });
  function wallCocoon(x, z, nx, nz, y, h) {
    const rad = 0.21 * h, seed = Math.floor(x * 13 + z * 7);
    const { geos } = cocoonBody(h, seed, x);
    const m = new THREE.Mesh(mergeSilk(mergeGeometries, geos), silk); m.castShadow = true;
    const g = new THREE.Group(); g.position.set(x + nx * (rad + 0.02), y, z + nz * (rad + 0.02)); g.rotation.y = Math.atan2(nx, nz); group.add(g);
    const lean = new THREE.Group(); lean.rotation.x = -0.12; g.add(lean); lean.add(m); m.position.y = 0;
    // the crack: a dark split down the silk, facing out of the wall
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.035, h * 0.42), crackMat); crack.position.set(0, h * 0.52, rad * 1.02); lean.add(crack);
    // anchor threads to the wall around it
    const cr = rand(seed + 3);
    for (let i = 0; i < 7; i++) {
      const t = i < 3 ? 0.95 : i < 5 ? 0.05 : 0.5, a = (cr() - 0.5) * 2.4;
      const fx = g.position.x, fz = g.position.z, fy = y + h * t;
      const ex = x + Math.cos(Math.atan2(nx, nz)) * a * 0.4, ez = z - Math.sin(Math.atan2(nx, nz)) * a * 0.4;
      threadPts.push(fx, fy, fz, ex, fy + (cr() - 0.5) * 0.6 + (t > 0.9 ? 0.25 : t < 0.1 ? -0.25 : 0), ez);
    }
    wallCocoons.push({ g: lean, crack, t: cr() * 8, tw: 0, h });
  }

  // ======================= BONE GALLERY: x 30..40, z 120..128 =======================
  floor(30, 40, 120, 128); ceil(30, 40, 120, 128);
  wallX(120, 30, 40, [[33.5, 1.6]]);
  wallX(128, 30, 40);
  wallZ(30, 120, 128, [[125.0, 1.6, 2.2]], 0, brick);
  wallZ(40, 120, 128, [[124.0, 1.4]]);
  // stair E: steps rising north into a recess, up to the chapel
  for (let i = 0; i < 8; i++) B(floorStone, 1.6, 0.18 * (i + 1), 0.36, 33.5, 0.09 * (i + 1), 119.78 - i * 0.36);
  B(stone, 0.2, H, 3.2, 32.6, H / 2, 118.4); B(stone, 0.2, H, 3.2, 34.4, H / 2, 118.4); B(stone, 1.8, H, 0.2, 33.5, H / 2, 116.8);
  B(stone, 1.8, 0.1, 3.2, 33.5, H + 0.05, 118.4);
  addGeo(new THREE.MeshBasicMaterial({ color: 0x030303 }), new THREE.PlaneGeometry(1.6, 1.3), 33.5, 2.0, 116.95);
  rect(local, 32.6, 34.4, 116.8, 120.05);
  // the sealed tunnel: an arched passage west, bricked up behind an iron door, chained
  B(stone, 2.6, H, 0.2, 28.7, H / 2, 124.1); B(stone, 2.6, H, 0.2, 28.7, H / 2, 125.9); B(stone, 2.6, 0.1, 1.8, 28.7, 2.25, 125.0);
  B(brick, 0.3, 2.2, 1.6, 27.6, 1.1, 125.0, 0, 0.9);
  // (static and merged; the ending will open it: its collider is 'catTunnel')
  { const TX = 29.0, TZ = 125.0;
    B(iron, 0.06, 2.05, 1.45, TX, 1.03, TZ, 0, 0);
    for (const y of [0.4, 1.0, 1.6]) B(iron, 0.08, 0.08, 1.5, TX + 0.02, y, TZ, 0, 0);
    // two chains crossing the door, and a padlock where they meet
    for (const s of [-1, 1]) for (let k = 0; k < 16; k++) { const t = k / 15; addGeo(iron, new THREE.TorusGeometry(0.035, 0.009, 4, 8), TX + 0.08, 0.35 + t * 1.5, TZ + s * (0.65 - t * 1.3), k % 2 ? Math.PI / 2 : 0, 0, Math.atan2(1.5, 1.3) * s); }
    B(brass, 0.06, 0.13, 0.1, TX + 0.1, 1.1, TZ, 0, 0); }
  const tunnelCol = { minX: 27.4, maxX: 29.95, minZ: 124.1, maxZ: 125.9, door: 'catTunnel' }; local.push(tunnelCol);
  boneWall('x', 128, 30.3, 39.7, -1);
  boneWall('z', 30, 120.3, 124.0, 1); boneWall('z', 30, 126.0, 127.6, 1);
  for (const [x, z, s] of [[35.2, 125.6, 0.5], [37.8, 122.4, 0.3], [31.6, 122.8, 0.35]]) puddle(x, z, s);
  wallCocoon(36.4, 120.1, 0, 1, 0.9, 1.0); wallCocoon(39.9, 126.8, -1, 0, 0.5, 0.8);
  spunCocoon(35.8, 124.6, 1.1, true, H, silkGeos, threadPts);
  light(35, H - 0.4, 124, 0x8a7a6a, 6, 12, false).userData.fill = true;
  // a candle on a skull at the end of the bone wall
  B(wax, 0.05, 0.2, 0.05, 38.9, 1.95, 127.45); light(38.9, 2.07, 127.45, 0xffa050, 2.2, 6, 'candle').userData.creepy = true;

  // ======================= OSSUARY: x 40..50, z 120..128 =======================
  floor(40, 50, 120, 128); ceil(40, 50, 120, 128);
  wallX(120, 40, 50);
  wallX(128, 40, 50, [[45.1, 1.4]]);
  wallZ(50, 120, 128);
  boneWall('z', 50, 122.6, 127.7, -1);
  // the niche wall: four bays of nine numbered niches, a skull in each
  const BAYS = [41.3, 43.8, 46.3, 48.8], NZ = 120.1, ND = 0.42;
  const nicheSkulls = [], restMoths = [];
  for (let b = 0; b < 4; b++) {
    const bx = BAYS[b];
    B(stone, 1.76, 0.75, ND, bx, 0.375, NZ + ND / 2);
    B(stone, 1.76, H - 2.1, ND, bx, (H + 2.1) / 2, NZ + ND / 2);
    for (const y of [1.2, 1.65]) B(stone, 1.76, 0.06, ND, bx, y, NZ + ND / 2);
    for (const dx of [-0.85, -0.283, 0.283, 0.85]) B(stone, 0.06, 1.35, ND, bx + dx, 1.425, NZ + ND / 2);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.35), new THREE.MeshStandardMaterial({ map: nicheNumbersTex(), transparent: true, alphaTest: 0.2, roughness: 1 }));
    plaque.position.set(bx, 1.425, NZ + 0.012); group.add(plaque);
    const roman = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ map: textTex(['I', 'II', 'III', 'IV'][b], 64, 'rgba(30,24,18,0.85)', 'bold'), transparent: true, alphaTest: 0.2, roughness: 1 }));
    roman.position.set(bx, 0.42, NZ + ND + 0.004); group.add(roman);
    for (let d = 1; d <= 9; d++) {
      const row = Math.floor((d - 1) / 3), col = (d - 1) % 3;
      const cx = bx + (col - 1) * 0.567, yb = [1.68, 1.23, 0.78][row];
      const sc = 0.95 + r() * 0.1;
      skulls.push([cx, yb + 0.07 * sc, NZ + 0.24, (r() - 0.5) * 0.35, sc]);
      nicheSkulls.push({ bay: b, d, x: cx, y: yb + 0.07 * sc, z: NZ + 0.24, sc });
      if (d === OSS_DIGITS[b]) restMoths.push([cx + (r() - 0.5) * 0.03, yb + 0.07 * sc + 0.068 * sc, NZ + 0.27]);
    }
  }
  for (const x of [40.21, 42.55, 45.05, 47.55, 49.8]) B(stone, x === 40.21 || x === 49.8 ? 0.22 : 0.74, H, ND, x, H / 2, NZ + ND / 2);
  rect(local, 40, 50, 120, NZ + ND);
  // the moths resting on their skulls
  const restTex = mothPlaneTex('maura');
  const resting = restMoths.map(([x, y, z], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshStandardMaterial({ map: restTex, transparent: true, alphaTest: 0.3, roughness: 0.8, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(-1.2, 0, (i % 2 ? 0.3 : -0.25)); group.add(m); return { m, t: i * 2.3 };
  });
  // an iron candle stand before the niches
  B(iron, 0.04, 1.35, 0.04, 45.05, 0.675, 121.4); B(iron, 0.3, 0.03, 0.3, 45.05, 0.015, 121.4); B(iron, 0.14, 0.02, 0.14, 45.05, 1.36, 121.4);
  B(wax, 0.05, 0.16, 0.05, 45.05, 1.45, 121.4); light(45.05, 1.55, 121.4, 0xffa050, 3, 7, 'candle').userData.creepy = true;
  rect(local, 44.9, 45.2, 121.25, 121.55);
  light(45, H - 0.4, 124.5, 0x8a7a6a, 6, 12, false).userData.fill = true;
  // the gate south, onto the crypt, with a four-figure lock
  const gate = new THREE.Group(); gate.position.set(45.1, 0, 128); group.add(gate);
  { const parts = []; for (let i = 0; i < 7; i++) parts.push(new THREE.CylinderGeometry(0.018, 0.018, 2.28, 6).translate(-0.6 + i * 0.2, 1.14, 0));
    for (const y of [0.1, 1.1, 2.2]) parts.push(new THREE.BoxGeometry(1.36, 0.05, 0.04).translate(0, y, 0));
    gate.add(new THREE.Mesh(mergeGeometries(parts.map(g => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); return n; }), false), iron));
    const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), brass); lockBody.position.set(0.25, 1.1, -0.06); gate.add(lockBody); }
  const gateCol = { minX: 44.4, maxX: 45.8, minZ: 127.9, maxZ: 128.1, door: 'catOssGate' }; local.push(gateCol);
  for (const [x, z, s] of [[42.4, 125.5, 0.4], [48.2, 123.2, 0.3]]) puddle(x, z, s);
  wallCocoon(49.6, 121.6, -1, 0, 0.7, 1.1);
  spunCocoon(42.0, 126.4, 0.9, true, H, silkGeos, threadPts);

  // ======================= FLOODED CRYPT: x 43.4..46.8, z 128..142 =======================
  wallZ(43.3, 128.1, 141.9, [], -1.4); wallZ(46.9, 128.1, 141.9, [], -1.4);
  ceil(43.4, 46.8, 128.1, 141.9);
  B(floorStone, 3.4, 1.4, 1.6, 45.1, -0.7, 128.9, 0, 0.5);
  B(floorStone, 3.4, 1.4, 1.3, 45.1, -0.7, 141.35, 0, 0.5);
  B(stone, 3.4, 0.05, CRYPT.z1 - CRYPT.z0, 45.1, -1.4, (CRYPT.z0 + CRYPT.z1) / 2);
  // burial niches (loculi) in the crypt walls, half under the water
  for (const x of [43.42, 46.78]) for (let z = 129.5; z < 141; z += 1.4) for (const y of [0.3, 1.2]) B(boneBack, 0.04, 0.5, 1.0, x, y + 0.25, z);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(CRYPT.x1 - CRYPT.x0, CRYPT.z1 - CRYPT.z0), new THREE.MeshStandardMaterial({ color: 0x0a1010, roughness: 0.04, metalness: 0.55, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(45.1, -0.14, (CRYPT.z0 + CRYPT.z1) / 2); group.add(water);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: 0x8a9a9a, transparent: true, opacity: 0, depthWrite: false }));
  // (everything starts where it lives: firstRoom.js files objects into floors by position)
  ripple.rotation.x = -Math.PI / 2; ripple.position.set(45.1, -0.135, 135); group.add(ripple);
  const lidTex = coffinLidTex();
  const lidMat = new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.85, color: 0x9a948a });
  const coffins = [];
  const sleepTex = mothPlaneTex('humuli');
  CRYPT.rows.forEach((cz, ri) => CRYPT.cols.forEach((cx, ci) => {
    B(darkWood, CRYPT.w - 0.04, 0.9, CRYPT.l - 0.04, cx, -0.48, cz, 0, 0);
    const lid = new THREE.Group(); lid.position.set(cx, -0.03, cz); group.add(lid);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(CRYPT.w, 0.06, CRYPT.l), lidMat); slab.receiveShadow = true; lid.add(slab);
    const safe = CRYPT.safe.some(([a, b]) => a === ri && b === ci);
    if (safe) for (let k = 0; k < 3; k++) {
      const mm = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), new THREE.MeshStandardMaterial({ map: sleepTex, transparent: true, alphaTest: 0.3, roughness: 0.8, emissive: 0x2a2620 }));
      mm.rotation.set(-Math.PI / 2, 0, r() * 6.28); mm.position.set((r() - 0.5) * 0.45, 0.033, (k - 1) * 0.6 + (r() - 0.5) * 0.2); lid.add(mm);
    }
    coffins.push({ row: ri, col: ci, x: cx, z: cz, safe, lid, tip: 0 });
  }));
  light(43.65, 2.0, 131.2, 0xffa860, 3, 8, '+x').userData.creepy = true;
  light(45.1, H - 0.4, 136, 0x6a7a7a, 4, 10, false).userData.fill = true;
  wallCocoon(43.4, 134.6, 1, 0, 0.8, 1.0); wallCocoon(46.8, 138.4, -1, 0, 1.0, 0.9);

  // ======================= TOMB HALL: x 38..52, z 142..148 =======================
  floor(38, 52, 142, 148); ceil(38, 52, 142, 148);
  wallX(142, 38, 43.3); wallX(142, 46.9, 52);
  wallX(148, 38, 52, [[45.0, 1.2, 2.3]]);
  wallZ(38, 142, 148); wallZ(52, 142, 148);
  boneWall('z', 38, 142.3, 147.7, 1);
  // the tomb front: pilasters, lintel, pediment and an inscription
  for (const x of [44.1, 45.9]) B(stone, 0.32, 2.5, 0.26, x, 1.25, 147.77);
  B(stone, 2.4, 0.34, 0.3, 45, 2.47, 147.76);
  addGeo(stone, new THREE.CylinderGeometry(0.28, 0.28, 2.5, 3).rotateZ(Math.PI / 2), 45, 2.74, 147.8, 0, 0, 0, 0.5);
  const insc = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), new THREE.MeshStandardMaterial({ map: textTex('DORMIUNT · NON · MORTUI', 30, 'rgba(26,20,14,0.85)', '', 512, 64), transparent: true, alphaTest: 0.2 }));
  insc.position.set(45, 2.47, 147.6); insc.rotation.y = Math.PI; group.add(insc);
  rect(local, 43.9, 44.3, 147.6, 148); rect(local, 45.7, 46.1, 147.6, 148); // the two pilasters (the doorway between stays open once the slab goes)
  // the slab door, the wax seal, and the cocoon pressed into it
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.16), mat({ map: rep(tex.stone, 1, 1.6), color: 0x8a847a }));
  slab.position.set(45, 1.15, 148); slab.castShadow = true; group.add(slab);
  const slabCol = { minX: 44.4, maxX: 45.6, minZ: 147.85, maxZ: 148.15, door: 'catTombSlab' }; local.push(slabCol);
  const sealMat = new THREE.MeshStandardMaterial({ color: 0x7a1a14, roughness: 0.45, emissive: 0x000000 });
  const sealHalves = [0, 1].map(k => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 20, 1, false, k * Math.PI, Math.PI), sealMat);
    h.rotation.x = Math.PI / 2; h.position.set(45, 1.2, 147.9); group.add(h); return h;
  });
  const sealCocoon = new THREE.Group(); sealCocoon.position.set(44.86, 1.2, 147.87); sealCocoon.rotation.z = -Math.PI / 2; group.add(sealCocoon);
  { const { geos } = cocoonBody(0.28, 991, 1); const m = new THREE.Mesh(mergeSilk(mergeGeometries, geos), silk); sealCocoon.add(m); }
  const sealCrack = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.08), crackMat); sealCrack.position.set(0.0, 0.14, -0.061); sealCrack.rotation.set(0, Math.PI, Math.PI / 2); sealCocoon.add(sealCrack);
  const hatchling = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshStandardMaterial({ map: mothPlaneTex('humuli'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  hatchling.visible = false; hatchling.position.set(44.9, 1.24, 147.84); group.add(hatchling);
  // sarcophagi with candles
  for (const x of [40.6, 49.6]) {
    B(stone, 2.1, 0.8, 0.9, x, 0.4, 146.6); B(stone, 2.2, 0.08, 1.0, x, 0.84, 146.6);
    rect(local, x - 1.1, x + 1.1, 146.1, 147.1);
    B(wax, 0.05, 0.14, 0.05, x + 0.7, 0.95, 146.5); light(x + 0.7, 1.05, 146.5, 0xffa050, 2.4, 6, 'candle').userData.creepy = true;
  }
  light(45, H - 0.4, 144.5, 0x8a7a6a, 5, 11, false).userData.fill = true;
  wallCocoon(40.2, 142.1, 0, 1, 0.8, 1.2); wallCocoon(51.9, 147.2, -1, 0, 0.6, 0.9);
  spunCocoon(47.6, 143.6, 1.2, true, H, silkGeos, threadPts);
  for (const [x, z, s] of [[43.2, 144.8, 0.45], [47.4, 145.2, 0.3]]) puddle(x, z, s);

  // ======================= APOTHECARY: x 38..52, z 148..157 =======================
  floor(38, 52, 148, 157); ceil(38, 52, 148, 157);
  wallX(157, 38, 52);
  wallZ(38, 148, 157); wallZ(52, 148, 157, [[153.5, 1.2, 2.5]]);
  // shelves of bottles along the west wall
  const bottleCols = [0x1a3a2a, 0x3a1a14, 0x2a2a4a, 0x4a3a1a, 0x1a2a2a, 0x5a4a3a];
  const bottleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.16, 8);
  const NBT = 140, bottleMesh = new THREE.InstancedMesh(bottleGeo, new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.1 }), NBT); let nbt = 0; const col = new THREE.Color();
  for (let s = 0; s < 4; s++) {
    B(darkWood, 0.36, 0.035, 5.6, 38.3, 0.5 + s * 0.48, 152.0);
    for (let z = 149.4; z < 154.7 && nbt < NBT; z += 0.11 + r() * 0.08) {
      if (r() < 0.2) continue;
      m4.compose(pp.set(38.3 + (r() - 0.5) * 0.12, 0.6 + s * 0.48, z), qq.identity(), one.set(1, 0.8 + r() * 0.6, 1)); bottleMesh.setMatrixAt(nbt, m4);
      bottleMesh.setColorAt(nbt++, col.setHex(bottleCols[Math.floor(r() * bottleCols.length)])); one.set(1, 1, 1);
    }
  }
  for (const z of [149.2, 154.8]) B(darkWood, 0.36, 1.9, 0.05, 38.3, 0.95, z);
  bottleMesh.count = nbt; bottleMesh.instanceColor.needsUpdate = true; bottleMesh.computeBoundingSphere(); group.add(bottleMesh);
  rect(local, 38.1, 38.5, 149.2, 154.8);
  // the counter, the half-burnt ledger, a candle
  B(darkWood, 2.4, 0.9, 0.7, 44.6, 0.45, 151.6); B(wood, 2.5, 0.04, 0.8, 44.6, 0.9, 151.6);
  rect(local, 43.35, 45.85, 151.2, 152.0);
  const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: ledgerTex(), transparent: true, alphaTest: 0.1, roughness: 0.95 }));
  ledger.rotation.set(-Math.PI / 2, 0, 0.12); ledger.position.set(43.8, 0.925, 151.6); group.add(ledger);
  B(wax, 0.05, 0.12, 0.05, 45.9, 0.98, 151.4); light(45.9, 1.07, 151.4, 0xffa050, 3, 7, 'candle').userData.creepy = true;
  // the drawer cabinet: thirty small drawers, each carved with a skull
  const DC = DRAWERS, dw = 0.29, dh = 0.22, ddp = 0.32, pitchX = 0.33, pitchY = 0.27;
  const dX = c => DC.x + (c - (DC.cols - 1) / 2) * pitchX, dY = row => 1.42 - row * pitchY;
  B(darkWood, DC.cols * pitchX + 0.12, 1.65, 0.5, DC.x, 0.825, 156.75);
  B(darkWood, DC.cols * pitchX + 0.2, 0.05, 0.56, DC.x, 1.67, 156.72);
  rect(local, DC.x - 1.1, DC.x + 1.1, 156.45, 157);
  const drawerMat = new THREE.MeshStandardMaterial({ map: drawerTex(), roughness: 0.7 });
  const drawerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(dw, dh, ddp), drawerMat, DC.cols * DC.rows);
  const drawers = [];
  for (let row = 0; row < DC.rows; row++) for (let c = 0; c < DC.cols; c++) {
    const id = `${c},${row}`, i = drawers.length;
    const d = { i, id, c, row, x: dX(c), y: dY(row), moth: DC.moths[id] || null, label: null, trap: DC.traps.includes(id), open: 0, target: 0, keyTaken: false, sprung: false };
    drawers.push(d);
  }
  // every drawer front: a paper label with a painted moth and its names (the six poisons, or a decoy)
  { let k = 0; for (const d of drawers) d.label = d.moth || DECOY_KEYS[k++ % DECOY_KEYS.length]; }
  for (const d of drawers) {
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.255, 0.17), new THREE.MeshStandardMaterial({ map: drawerLabelTex(d.label), emissive: 0xffffff, emissiveMap: drawerLabelTex(d.label), emissiveIntensity: 0.14, roughness: 0.85 }));
    lm.rotation.y = Math.PI; group.add(lm); d.labelMesh = lm;
  }
  const setDrawer = d => { m4.makeTranslation(d.x, d.y, DC.front + ddp / 2 + 0.002 - d.open * 0.24); drawerMesh.setMatrixAt(d.i, m4); if (d.labelMesh) d.labelMesh.position.set(d.x, d.y, DC.front - 0.0015 - d.open * 0.24); };
  drawers.forEach(setDrawer); drawerMesh.computeBoundingSphere(); group.add(drawerMesh);
  // inside the six moth drawers: a card with the moth, its Latin and common names, and a key
  const keyGeo = makeKeyGeo();
  for (const d of drawers) if (d.moth) {
    // the card stands propped in the open drawer, facing out; the key hangs on its tag in front
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.175), new THREE.MeshStandardMaterial({ map: poisonCardTex(d.moth), roughness: 0.9 }));
    card.rotation.set(-0.35, Math.PI, 0, 'YXZ'); group.add(card);
    const key = new THREE.Mesh(keyGeo, iron); key.rotation.set(0, Math.PI, 0.5); group.add(key);
    card.position.set(d.x, d.y, DC.front + 0.17); key.position.set(d.x, d.y, DC.front + 0.17); card.visible = key.visible = false;
    d.card = card; d.key = key;
  }
  // stains seeping from under the needled drawers
  const stainMat = new THREE.MeshStandardMaterial({ map: stainTex(), transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const d of drawers) if (d.trap) addGeo(stainMat, new THREE.PlaneGeometry(0.24, 0.16), d.x + (r() - 0.5) * 0.04, d.y - dh / 2 - 0.075, DC.front - 0.004, Math.PI);
  // the needle that springs out of a drawer
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.004, 0.12, 5), new THREE.MeshStandardMaterial({ color: 0xc8c8c0, metalness: 0.9, roughness: 0.2 }));
  needle.rotation.x = Math.PI / 2; needle.visible = false; needle.position.set(DC.x, 1, DC.front); group.add(needle);
  // the dead rat on its back under the needled bottom drawer
  { const rx = dX(2), rz = 156.1; const fur = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 1 });
    addGeo(fur, new THREE.SphereGeometry(0.06, 10, 8).scale(1, 0.75, 2.0), rx, 0.045, rz, 0.5);
    addGeo(fur, new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.9, 1.4), rx + Math.sin(0.5) * 0.14, 0.04, rz + Math.cos(0.5) * 0.14, 0.5);
    const tail = []; for (let i = 0; i <= 10; i++) tail.push(new THREE.Vector3(rx - Math.sin(0.5) * (0.11 + i * 0.02) + Math.sin(i * 0.8) * 0.02, 0.02, rz - Math.cos(0.5) * (0.11 + i * 0.02)));
    addGeo(new THREE.MeshStandardMaterial({ color: 0x8a6a62, roughness: 0.8 }), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 16, 0.006, 4), 0, 0, 0);
    for (const s of [-1, 1]) addGeo(new THREE.MeshStandardMaterial({ color: 0xa87a72 }), new THREE.CylinderGeometry(0.004, 0.006, 0.05, 4), rx + s * 0.05, 0.08, rz + s * 0.02, 0, 0.6 * s, 0.3); }
  // the iron cabinet: six keyholes, I to VI
  const IC = { x: 48.6, z: 156.75 };
  B(iron, 1.3, 1.9, 0.5, IC.x, 0.95, IC.z);
  rect(local, IC.x - 0.65, IC.x + 0.65, 156.45, 157);
  const icDoors = [-1, 1].map(s => {
    const piv = new THREE.Group(); piv.position.set(IC.x + s * 0.62, 0, IC.z - 0.26); group.add(piv);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.78, 0.03), new THREE.MeshStandardMaterial({ map: ironDoorTex(s), metalness: 0.7, roughness: 0.55 }));
    leaf.position.set(-s * 0.31, 0.95, 0); piv.add(leaf); return { piv, s };
  });
  const insertedKeys = [];
  // a key standing in each keyhole once inserted (keyhole i at the texture's escutcheon)
  for (let i = 0; i < 6; i++) {
    const k = new THREE.Mesh(keyGeo, iron); k.rotation.set(0, -Math.PI / 2, 0); k.visible = false; group.add(k); insertedKeys.push(k);
    k.position.set(i < 3 ? IC.x + 0.535 - 0.186 * i : IC.x - 0.07 - 0.186 * (i - 3), 1.114 - 0.03, IC.z - 0.29);
  }
  // inside the iron cabinet: a lever that draws the bolt on the back-stair door
  B(new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 1 }), 1.2, 1.7, 0.02, IC.x, 0.95, IC.z - 0.235);
  light(45, H - 0.4, 152.5, 0x8a7a6a, 5, 11, false).userData.fill = true;
  wallCocoon(51.9, 149.8, -1, 0, 0.9, 1.0);
  door('catStairB', 'z', 52, 153.5, { locked: true, swing: -1, msg: 'An iron-bound door with no handle on this side. Something inside the wall is holding it: you can hear a bolt rest in its keeper when you push.', openMsg: 'A narrow room beyond, and a stair going up into the dark.' });

  // ======================= BACK STAIR B: x 52..58, z 148..157 =======================
  floor(52, 58, 148, 157); ceil(52, 58, 148, 157);
  wallX(148, 52, 58, [[55, 2.0, 2.4]]); wallX(157, 52, 58); wallZ(58, 148, 157);
  for (let i = 0; i < 9; i++) B(wood, 2.0, 0.2 * (i + 1), 0.4, 55, 0.1 * (i + 1), 149.8 - i * 0.4);
  B(stone, 0.2, H, 3.4, 53.9, H / 2, 146.4); B(stone, 0.2, H, 3.4, 56.1, H / 2, 146.4); B(stone, 2.4, H, 0.2, 55, H / 2, 144.7);
  B(stone, 2.4, 0.1, 3.4, 55, H + 0.05, 146.4);
  addGeo(new THREE.MeshBasicMaterial({ color: 0x030303 }), new THREE.PlaneGeometry(2.0, 1.2), 55, 2.2, 144.85);
  for (const s of [-1, 1]) B(darkWood, 0.06, 0.9, 3.6, 55 + s * 1.02, 1.1, 148.2);
  rect(local, 53.9, 56.1, 144.7, 150.05);
  light(57.64, 2.0, 155, 0xffa860, 3, 8, '-x').userData.creepy = true;
  light(55, H - 0.4, 153, 0x8a7a6a, 4, 10, false).userData.fill = true;
  wallCocoon(57.9, 151.2, -1, 0, 0.7, 1.1);
  puddle(54.2, 155.4, 0.4);

  // ---------- finish: instanced bones and skulls, merged silk and threads, merged static ----------
  {
    const q = new THREE.Quaternion(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const sm = new THREE.InstancedMesh(skullGeo, skullMat, skulls.length);
    skulls.forEach(([x, y, z, yaw, k], i) => { q.setFromAxisAngle(up, yaw); sm.setMatrixAt(i, m4.compose(pp.set(x, y, z), q, s.set(k, k, k))); sm.setColorAt(i, col.setHSL(0.1, 0.22, 0.66 + r() * 0.18)); });
    sm.instanceColor.needsUpdate = true; sm.computeBoundingSphere(); group.add(sm);
    const silkMesh = new THREE.Mesh(mergeSilk(mergeGeometries, silkGeos), silk); silkMesh.castShadow = true; group.add(silkMesh);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(threadPts, 3));
    group.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.35 })));
    flush();
  }

  // ---------- state ----------
  const st = { ossOpen: false, crossed: false, tombOpen: false, heat: 0, hatch: 0, cabinetOpen: false, inserted: [] };
  let removeLocal = () => {}, addLocal = () => {}, gateY = 0, rippleT = 0, slabSlide = 0, cabAnim = 0;
  const api = {
    CATA, CRYPT, DRAWERS, drawers, drawerMesh, coffins, nicheSkulls, resting,
    get ossOpen() { return st.ossOpen; }, get crossed() { return st.crossed; }, get tombOpen() { return st.tombOpen; },
    get heat() { return st.heat; }, set heat(v) { st.heat = v; }, get cabinetOpen() { return st.cabinetOpen; },
    get inserted() { return st.inserted; },
    openGate(instant) { st.ossOpen = true; removeLocal(gateCol); if (instant) gateY = 2.0; },
    setCrossed() { st.crossed = true; },
    hatch(instant) { st.tombOpen = true; st.heat = 1; if (instant) { st.hatch = 10; removeLocal(slabCol); } },
    // the coffin under a point, preferring a lid that holds
    coffinAt(x, z) {
      let best = null;
      for (const c of coffins) if (Math.abs(x - c.x) <= CRYPT.w / 2 + 0.14 && Math.abs(z - c.z) <= CRYPT.l / 2 + 0.14) { if (!best || (c.safe && !best.safe)) best = c; }
      return best;
    },
    inWater(x, z) { return x > CRYPT.x0 && x < CRYPT.x1 && z > CRYPT.z0 + 0.02 && z < CRYPT.z1 - 0.02; },
    setDrawer(d, open) { d.target = open ? 1 : 0; },
    spring(d) { d.sprung = true; needle.visible = true; needle.position.set(d.x, d.y + 0.02, DC.front - 0.06); needle.userData.t = 0; },
    takeKey(d) { d.keyTaken = true; },
    setInserted(list) { st.inserted = [...list]; insertedKeys.forEach((k, i) => { k.visible = i < st.inserted.length; }); },
    openCabinet(instant) { st.cabinetOpen = true; ctx.doors.catStairB.locked = false; if (instant) cabAnim = 1; },
    getState() { return { ossOpen: st.ossOpen, crossed: st.crossed, tombOpen: st.tombOpen, cabinetOpen: st.cabinetOpen, inserted: [...st.inserted], drawers: drawers.filter(d => d.target).map(d => d.id), keys: drawers.filter(d => d.keyTaken).map(d => d.moth), sprung: drawers.filter(d => d.sprung).map(d => d.id) }; },
    setState(s = {}) {
      api.reset();
      if (s.ossOpen) api.openGate(true);
      if (s.crossed) st.crossed = true;
      if (s.tombOpen) api.hatch(true);
      for (const d of drawers) { if ((s.drawers || []).includes(d.id)) { d.target = d.open = 1; } if (d.moth && (s.keys || []).includes(d.moth)) d.keyTaken = true; if ((s.sprung || []).includes(d.id)) d.sprung = true; setDrawer(d); }
      drawerMesh.instanceMatrix.needsUpdate = true;
      api.setInserted(s.inserted || []);
      if (s.cabinetOpen) api.openCabinet(true);
    },
    reset() {
      st.ossOpen = st.crossed = st.tombOpen = st.cabinetOpen = false; st.heat = 0; st.hatch = 0; st.inserted = [];
      addLocal(gateCol); addLocal(slabCol); gateY = 0; slabSlide = 0; cabAnim = 0;
      for (const d of drawers) { d.open = d.target = 0; d.keyTaken = d.sprung = false; setDrawer(d); }
      drawerMesh.instanceMatrix.needsUpdate = true; needle.visible = false;
      insertedKeys.forEach(k => { k.visible = false; });
      sealHalves.forEach((h, k) => { h.position.set(45, 1.2, 147.9); h.rotation.set(Math.PI / 2, 0, 0); h.visible = true; });
      sealCocoon.visible = true; sealCrack.scale.set(1, 1, 1); hatchling.visible = false; slab.position.x = 45;
      for (const c of coffins) { c.tip = 0; c.lid.rotation.set(0, 0, 0); c.lid.position.y = -0.03; }
      if (ctx.doors.catStairB) ctx.doors.catStairB.locked = true;
    },
    update(t, dt) {
      // the gate rises into the vault
      gateY += ((st.ossOpen ? 2.0 : 0) - gateY) * Math.min(1, dt * 1.6); gate.position.y = gateY;
      // resting moths: now and then a wing shiver
      for (const m of resting) { m.t -= dt; if (m.t < 0) { m.t = 2 + Math.random() * 6; m.k = 0.5; } if (m.k > 0) { m.k -= dt; m.m.scale.x = 1 - Math.abs(Math.sin(m.k * 40)) * 0.25; } else m.m.scale.x = 1; }
      // wall cocoons: an occasional twitch, the crack breathing open and shut
      for (const c of wallCocoons) {
        c.t -= dt; if (c.t < 0) { c.t = 3 + Math.random() * 9; c.tw = 0.7; }
        if (c.tw > 0) c.tw -= dt;
        const k = Math.max(0, c.tw);
        c.g.rotation.z = Math.sin(t * 38) * 0.035 * k; c.g.rotation.x = -0.12 + Math.sin(t * 29 + 1) * 0.02 * k;
        c.crack.scale.x = 0.8 + 0.3 * Math.sin(t * 0.9 + c.h * 10) + k * 1.4; c.g.scale.y = 1 + k * 0.03;
      }
      // the crypt: a drip, rings spreading on the black water; tipping lids
      rippleT -= dt; if (rippleT < 0) { rippleT = 1.5 + Math.random() * 3; ripple.position.x = CRYPT.x0 + 0.3 + Math.random() * (CRYPT.x1 - CRYPT.x0 - 0.6); ripple.position.z = CRYPT.z0 + 0.4 + Math.random() * (CRYPT.z1 - CRYPT.z0 - 0.8); ripple.userData.a = 0; }
      if (ripple.userData.a !== undefined && ripple.userData.a < 1) { ripple.userData.a += dt * 0.7; const a = ripple.userData.a; ripple.scale.setScalar(0.05 + a * 0.35); ripple.material.opacity = 0.35 * (1 - a); }
      for (const c of coffins) { c.lid.rotation.z = Math.sin(t * 7) * 0.06 * c.tip + c.tip * 0.18 * (c.col === 0 ? 1 : -1); c.lid.position.y = -0.03 - c.tip * 0.09; c.tip = Math.max(0, c.tip - dt * 0.8); }
      // the wax seal warms; the cocoon hatches; the seal breaks; the slab slides into the wall
      sealMat.emissive.setRGB(0.25 * st.heat, 0.06 * st.heat, 0.02 * st.heat);
      sealCrack.scale.y = 1 + st.heat * 0.8; sealCrack.scale.x = 1 + st.heat * 2;
      if (!st.tombOpen && st.heat > 0.25) sealCocoon.rotation.x = Math.sin(t * 30) * 0.05 * (Math.sin(t * 1.7) > 0.6 ? st.heat : 0);
      if (st.tombOpen) {
        st.hatch += dt; const hk = st.hatch;
        sealCocoon.visible = hk < 1.6;
        if (hk < 3.6) {
          hatchling.visible = hk > 0.4;
          const f = Math.max(0, hk - 0.4);
          hatchling.position.set(44.9 - f * 0.1, 1.24 + f * f * 0.25, 147.84 - f * 0.25); hatchling.rotation.set(0, Math.PI, Math.sin(t * 30) * 0.3); hatchling.scale.setScalar(Math.min(1, 0.4 + f));
        } else hatchling.visible = false;
        sealHalves.forEach((h, k) => {
          const f = Math.max(0, hk - 1.0);
          if (f > 0) { h.position.set(45 + (k ? -1 : 1) * f * 0.05, Math.max(0.03, 1.2 - f * f * 2.4), 147.8 - f * 0.1); h.rotation.z = f * (k ? -2 : 2); h.rotation.x = Math.PI / 2 + Math.min(f * 1.2, Math.PI / 2); }
        });
        slabSlide = Math.min(1, Math.max(0, (hk - 2.0) / 2.5));
        slab.position.x = 45 + slabSlide * 1.22;
        if (slabSlide > 0.6) removeLocal(slabCol); // the way is open once the slab is mostly gone
      }
      // drawers glide in and out
      let moved = false;
      for (const d of drawers) {
        if (d.open !== d.target) { d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 4); setDrawer(d); moved = true; }
        if (d.card) {
          const z = DC.front + 0.17 - d.open * 0.24;
          d.card.position.set(d.x, d.y + dh / 2 + 0.08, z); d.key.position.set(d.x + 0.05, d.y + dh / 2 + 0.03, z - 0.04); d.key.visible = !d.keyTaken;
          d.card.visible = d.open > 0.7; if (d.open <= 0.7) d.key.visible = false;
        }
      }
      if (moved) { drawerMesh.instanceMatrix.needsUpdate = true; }
      if (needle.visible) { needle.userData.t += dt; if (needle.userData.t > 2.5) needle.visible = false; }
      // the iron cabinet swings open
      if (st.cabinetOpen && cabAnim < 1) cabAnim = Math.min(1, cabAnim + dt * 0.6);
      for (const d of icDoors) d.piv.rotation.y = d.s * 1.7 * (1 - Math.pow(1 - cabAnim, 3)) * -1;
    },
    bindColliders(rem, add) { removeLocal = rem; addLocal = add; },
  };
  return api;
}

// ---------- geometry ----------
function makeSkull() {
  // cranium, cheekbones and jaw in bone; sockets and nose in shadow (vertex colours)
  const parts = [];
  const paint = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };
  parts.push(paint(new THREE.SphereGeometry(0.075, 8, 6).scale(0.85, 0.85, 1.05), 0xd8ccb0));
  parts.push(paint(new THREE.BoxGeometry(0.1, 0.05, 0.06).translate(0, -0.05, 0.04), 0xcfc2a4));
  parts.push(paint(new THREE.BoxGeometry(0.075, 0.03, 0.055).translate(0, -0.085, 0.035), 0xc4b698));
  for (const s of [-1, 1]) parts.push(paint(new THREE.SphereGeometry(0.019, 5, 3).scale(1, 0.9, 0.6).translate(s * 0.026, -0.012, 0.066), 0x1a140e));
  parts.push(paint(new THREE.ConeGeometry(0.01, 0.022, 4).rotateX(Math.PI).translate(0, -0.042, 0.072), 0x1a140e));
  parts.push(paint(new THREE.BoxGeometry(0.06, 0.012, 0.01).translate(0, -0.074, 0.07), 0xeee4cc)); // teeth
  for (const p of parts) { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); }
  return mergeGeometries(parts, false);
}
function makeKeyGeo() {
  const parts = [new THREE.TorusGeometry(0.018, 0.005, 6, 14).translate(-0.045, 0, 0), new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6).rotateZ(Math.PI / 2), new THREE.BoxGeometry(0.012, 0.018, 0.005).translate(0.03, -0.01, 0)];
  return mergeGeometries(parts.map(g => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; }), false);
}
function worldUV(g, s) {
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; if (!U) return;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i));
    if (ny > 0.5) U.setXY(i, P.getX(i) * s, P.getZ(i) * s);
    else if (nx > 0.5) U.setXY(i, P.getZ(i) * s, P.getY(i) * s);
    else U.setXY(i, P.getX(i) * s, P.getY(i) * s);
  }
}

// ---------- textures ----------
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const toTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const mothCache = {};
export function mothPlaneTex(key) {
  if (mothCache[key]) return mothCache[key];
  const [c, g] = canvasOf(256, 256); drawMoth(g, key, 128, 120, Math.max(150, 200 * Math.min(1, SPECIES[key].span / 60)), { pin: false, seed: key.length * 5 });
  return (mothCache[key] = toTex(c));
}
function textTex(text, px, color, weight = '', w = 128, h = 80) {
  const [c, g] = canvasOf(w, h); g.font = `${weight} ${px}px Georgia, serif`; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2); return toTex(c);
}
function boneEndsTex() {
  // courses of femur and shin ends seen end-on, stacked in the Paris manner: knobbed heads,
  // pale with grime in the joints, a few broken
  const [c, g] = canvasOf(256, 256); const r = rand(203);
  g.fillStyle = '#1e1a14'; g.fillRect(0, 0, 256, 256);
  const rows = 10, cols = 8, rh = 256 / rows, cw = 256 / cols;
  for (let row = 0; row < rows; row++) for (let k = -1; k <= cols; k++) {
    const x = (k + (row % 2) * 0.5) * cw + (r() - 0.5) * 4, y = row * rh + rh / 2 + (r() - 0.5) * 3;
    const w = cw * (0.36 + r() * 0.1), h = rh * (0.38 + r() * 0.08), l = 150 + r() * 60;
    for (const dx of [-w * 0.42, w * 0.42]) { // the two condyles of the knob
      const gr = g.createRadialGradient(x + dx - w * 0.15, y - h * 0.3, 1, x + dx, y, w * 0.75);
      gr.addColorStop(0, `rgb(${l + 40},${l + 30},${l + 8})`); gr.addColorStop(0.7, `rgb(${l - 20},${l - 30},${l - 50})`); gr.addColorStop(1, `rgb(${l - 90},${l - 95},${l - 105})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + dx, y, w * 0.62, h, 0, 0, 7); g.fill();
    }
    if (r() < 0.12) { g.fillStyle = 'rgba(20,16,10,0.8)'; g.beginPath(); g.ellipse(x, y, w * 0.35, h * 0.5, r(), 0, 7); g.fill(); } // broken, hollow
    g.fillStyle = `rgba(40,50,30,${r() * 0.25})`; g.fillRect(x - w, y + h * 0.4, w * 2, 2); // damp
  }
  return toTex(c);
}
function nicheNumbersTex() {
  // numerals cut into the back of each niche, top left: 1 2 3 / 4 5 6 / 7 8 9
  const [c, g] = canvasOf(512, 408); g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center';
  for (let d = 1; d <= 9; d++) {
    const row = Math.floor((d - 1) / 3), col = (d - 1) % 3, x = 256 + (col - 1) * 171, y = row * 136 + 44;
    g.fillStyle = 'rgba(14,10,8,0.85)'; g.fillText(String(d), x, y); g.fillStyle = 'rgba(200,190,170,0.25)'; g.fillText(String(d), x + 1.5, y + 1.5);
  }
  return toTex(c);
}
function coffinLidTex() {
  const [c, g] = canvasOf(128, 256); const r = rand(77);
  g.fillStyle = '#8a8478'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${50 + r() * 60},${50 + r() * 60},${40 + r() * 50},0.2)`; g.fillRect(r() * 128, r() * 256, 2, 2); }
  g.strokeStyle = 'rgba(30,28,24,0.7)'; g.lineWidth = 4; g.strokeRect(6, 6, 116, 244);
  // the carved cross, the same on every lid
  g.fillStyle = 'rgba(28,24,20,0.75)'; g.fillRect(56, 34, 16, 170); g.fillRect(28, 78, 72, 16);
  g.fillStyle = 'rgba(200,190,170,0.25)'; g.fillRect(58, 36, 3, 166); g.fillRect(30, 80, 68, 3);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(40,70,50,${0.1 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 128, r() * 256, 4 + r() * 10, 3 + r() * 8, 0, 0, 7); g.fill(); } // moss and damp
  return toTex(c);
}
function drawerTex() {
  const [c, g] = canvasOf(128, 96); const r = rand(31);
  g.fillStyle = '#3e2c20'; g.fillRect(0, 0, 128, 96);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(20,12,6,${0.2 + r() * 0.3})`; g.lineWidth = 1; g.beginPath(); g.moveTo(0, r() * 96); g.lineTo(128, r() * 96); g.stroke(); }
  g.strokeStyle = 'rgba(14,8,4,0.8)'; g.lineWidth = 3; g.strokeRect(4, 4, 120, 88);
  // a small carved skull, and a brass ring pull under it
  g.fillStyle = '#c8b890'; g.beginPath(); g.ellipse(64, 36, 16, 15, 0, 0, 7); g.fill(); g.fillRect(55, 44, 18, 12);
  g.fillStyle = '#1a120a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * 7, 37, 4.5, 5, 0, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(64, 42); g.lineTo(61, 47); g.lineTo(67, 47); g.fill();
  for (let i = 0; i < 4; i++) g.fillRect(57 + i * 4.5, 52, 1.2, 4);
  g.strokeStyle = '#b08a40'; g.lineWidth = 3; g.beginPath(); g.arc(64, 74, 7, 0, 7); g.stroke();
  return toTex(c);
}
function stainTex() {
  const [c, g] = canvasOf(128, 96); const r = rand(9);
  for (let i = 0; i < 6; i++) { const x = 30 + r() * 68, l = 30 + r() * 60, w = 3 + r() * 6; const gr = g.createLinearGradient(0, 0, 0, l); gr.addColorStop(0, 'rgba(40,22,10,0.85)'); gr.addColorStop(1, 'rgba(40,22,10,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, l / 2, w, l / 2, 0, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(50,28,12,0.7)'; g.fillRect(14, 0, 100, 6);
  return toTex(c);
}
function poisonCardTex(key) {
  const sp = SPECIES[key]; const [c, g] = canvasOf(256, 214);
  g.fillStyle = '#e8dfc6'; g.fillRect(0, 0, 256, 214); g.strokeStyle = 'rgba(60,40,20,0.6)'; g.lineWidth = 2; g.strokeRect(6, 6, 244, 202);
  drawMoth(g, key, 128, 80, 150, { pin: false, seed: key.length * 5 });
  g.fillStyle = '#2a1c10'; g.textAlign = 'center';
  g.font = 'italic 19px Georgia, serif'; g.fillText(sp.latin, 128, 168);
  g.font = '17px Georgia, serif'; g.fillText(sp.common, 128, 192);
  return toTex(c);
}
function ironDoorTex(side) {
  const [c, g] = canvasOf(160, 456); const r = rand(side > 0 ? 5 : 6);
  g.fillStyle = '#2e2b28'; g.fillRect(0, 0, 160, 456);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${90 + r() * 50},${50 + r() * 20},${20},${r() * 0.25})`; g.fillRect(r() * 160, r() * 456, 3 + r() * 6, 2 + r() * 5); } // rust
  g.fillStyle = '#4a4540'; for (const y of [12, 444]) for (let x = 12; x < 160; x += 22) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  // three keyholes on each leaf, with numerals
  // seen from the room, the +x leaf is on the left: it carries I to III
  const nums = side > 0 ? ['I', 'II', 'III'] : ['IV', 'V', 'VI'];
  for (let i = 0; i < 3; i++) {
    const x = side > 0 ? 22 + i * 48 : 18 + i * 48, y = 190;
    g.fillStyle = '#9a7a3a'; g.beginPath(); g.ellipse(x, y, 13, 19, 0, 0, 7); g.fill();
    g.fillStyle = '#0a0806'; g.beginPath(); g.arc(x, y - 4, 4, 0, 7); g.fill(); g.fillRect(x - 2, y - 2, 4, 11);
    g.fillStyle = '#c8b890'; g.font = 'bold 18px Georgia, serif'; g.textAlign = 'center'; g.fillText(nums[i], x, y - 28);
  }
  return toTex(c);
}
function ledgerTex() {
  // an open ledger, its right-hand page and corner burnt away
  const [c, g] = canvasOf(420, 300); const r = rand(12);
  g.fillStyle = '#e2d6b8'; g.fillRect(0, 0, 420, 300);
  g.fillStyle = 'rgba(60,40,20,0.25)'; g.fillRect(206, 0, 8, 300);
  g.fillStyle = 'rgba(40,28,16,0.75)';
  for (let p = 0; p < 2; p++) for (let i = 0; i < 15; i++) { let x = 18 + p * 210; while (x < 190 + p * 210) { const w = 6 + r() * 26; g.fillRect(x, 24 + i * 17, w, 2); x += w + 5; } }
  // the burn: charred, ragged, then gone
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(420, 40); for (let y = 40; y <= 300; y += 10) g.lineTo(300 - Math.sin(y * 0.11) * 30 - r() * 30 - (y - 40) * 0.25, y); g.lineTo(420, 300); g.fill();
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = 'rgba(20,10,4,0.9)'; g.lineWidth = 18; g.beginPath(); g.moveTo(420, 40); for (let y = 40; y <= 300; y += 10) g.lineTo(300 - Math.sin(y * 0.11) * 30 - (y - 40) * 0.25 + 4, y); g.stroke();
  g.globalCompositeOperation = 'source-over';
  return toTex(c);
}

// a drawer-front label: the moth painted on the left, its common and Latin names beside it
const labelCache = {};
function drawerLabelTex(key) {
  if (labelCache[key]) return labelCache[key];
  const c = document.createElement('canvas'); c.width = 512; c.height = 340; const g = c.getContext('2d');
  g.fillStyle = '#e6dcc2'; g.fillRect(0, 0, 512, 340);
  g.strokeStyle = '#5a4630'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 324); g.lineWidth = 2; g.strokeRect(18, 18, 476, 304);
  drawMoth(g, key, 256, 105, 230, { pin: false, seed: key.length * 5 });
  const sp = SPECIES[key];
  g.fillStyle = '#1e160e'; g.textAlign = 'center';
  let fs = 58; g.font = `bold ${fs}px Georgia, serif`; while (g.measureText(sp.common).width > 470 && fs > 26) { fs -= 2; g.font = `bold ${fs}px Georgia, serif`; }
  g.fillText(sp.common, 256, 250);
  fs = 42; g.font = `italic ${fs}px Georgia, serif`; while (g.measureText(sp.latin).width > 470 && fs > 22) { fs -= 2; g.font = `italic ${fs}px Georgia, serif`; }
  g.fillText(sp.latin, 256, 306);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; labelCache[key] = t; return t;
}
