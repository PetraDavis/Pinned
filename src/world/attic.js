// The Attic (sheet A-104): "Emergence", the top of the house and the Mother's floor.
// Built in the room zone's group, in its local coordinates, at z 171.4..185.4 (x 30..58),
// well away from the other floors; firstRoom.js draws it as its own section (z > 165).
// Ladder D in the Linen Room comes up through the floor of the Landing.
//
// A pitched roof runs east-west over the whole floor: ridge at z 178.4 (4.6 m), knee walls
// 1.3 m high along both eaves, rafters every 0.6 m, moonlit skylights in both slopes.
//   Landing (SE, x 48..58, z 178.4..185.4): ladder D, the hymn book, the Wingspan Rack.
//   Sleepers' Loft (NE, x 48..58, z 171.4..178.4): iron cots against the knee wall, mirror M8.
//   Egg Store (S, x 39..48): jars of eggs and the egg ledger; a padlocked door north.
//   Clock Room (N, x 39..48): the Night Clock, the cipher wheel, marks on the rafters, the
//   brass box with the clock's hands, and the crawl hatch into the Mother's chamber.
//   Mother's Chamber (W, x 30..39): cocoons that twitch and split, and her empty nest.
//
// Route: Wingspan Rack (shadow door, Landing -> Egg Store) > Egg Ledger (padlock, Egg Store ->
// Clock Room) > Cipher Wheel (letter-lock box: the clock's hands) > Night Clock (unbolts the
// crawl hatch) > Mother's Chamber.
//
// THE MOTHER IS NOT BUILT YET. Her chamber has an empty nest and an anchor group,
// `api.motherAnchor`, at ATTIC.motherSpawn: add her model as a child of that group.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';
import { gasLampFixture } from './fixtures.js';
import { silkTexture } from './lowerUpper.js';
import { spunCocoon } from './cocoon.js';
const spinCocoon = (silkGeos, threadPts, x, z, h, hanging, top) => spunCocoon(x, z, h, hanging, top, silkGeos, threadPts);
import { drawMoth, SPECIES } from '../moths.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
export const ATTIC = {
  spawn: V(56.0, 182.4), ladder: V(57.0, 183.9),
  rack: V(50.2, 182.0), hymn: V(55.2, 179.4), ledger: V(44.6, 183.9), eggLock: V(43.5, 178.9),
  clock: V(47.3, 175.0), clockLog: V(47.3, 173.2), wheel: V(39.7, 177.2), rafters: V(43.5, 175.6), box: V(41.2, 172.6),
  hatch: V(39.6, 174.2), hatchIn: V(38.4, 174.2), chamber: V(36.0, 176.0),
  motherSpawn: new THREE.Vector3(32.6, 0, 178.4), // HOOK: the Mother's spawn point (not built yet)
};
// ---- 1. Wingspan Rack: smallest to largest, left to right as you face the wall ----
// wingspans in mm (typical adult): Small magpie ~26, Lappet ~75, Privet hawk-moth ~110,
// Owl moth (Brahmaea wallichii) ~150, White witch (Thysania agrippina) up to ~280.
export const RACK_ORDER = ['hortulata', 'quercifolia', 'ligustri', 'wallichii', 'agrippina'];
export const RACK_START = ['ligustri', 'agrippina', 'hortulata', 'wallichii', 'quercifolia'];
export const SPAN_MM = { hortulata: 26, quercifolia: 75, ligustri: 110, wallichii: 150, agrippina: 280 };
// ---- 2. Egg Ledger: eggs laid by one female; fewest to most, first figure of each ----
export const EGG_JARS = [ // left to right on the table (not in order)
  { key: 'zea', eggs: 1000 }, { key: 'atripalpis', eggs: 29100 }, { key: 'pomonella', eggs: 50 }, { key: 'cunea', eggs: 400 },
];
export const EGG_CODE = [...EGG_JARS].sort((a, b) => a.eggs - b.eggs).map(j => String(j.eggs)[0]).join(''); // '5412'
// ---- 3. Night Clock: each moth to the hour of the night it was taken at the lamp ----
export const CLOCK_MOTHS = [
  { key: 'lupulina', hour: 9 }, { key: 'convolvuli', hour: 11 }, { key: 'pronuba', hour: 12 }, { key: 'aprilina', hour: 3 },
];
export const CLOCK_START = [6, 2, 7, 5];
// ---- 4. Cipher Wheel: 26 moth symbols on an inner ring under the letters A..Z ----
export const CIPHER_KEY = 12;            // the moon symbol (0) sits under M
export const CIPHER_PLAIN = 'SHE WAKES AT DUSK';
export const BOX_WORD = 'DUSK';
export const cipherOf = (ch) => ch === ' ' ? -1 : ((ch.charCodeAt(0) - 65 - CIPHER_KEY) % 26 + 26) % 26;

export const HYMN_TEXT = [
  'The Order’s hymnal, bound in moth-grey cloth. Most of the hymns are about light, and climbing, and sleep.',
  'Hymn the Twelfth, “The Moon Over the Mother”, is underlined twice. In the margin, in pencil:',
  '“Turn the wheel until the moon sits under M. Then the rafters will speak plainly.”',
].join(' ');
export const LEDGER_TEXT = [
  'The Egg Ledger, kept in the same small upright hand as the journal downstairs:',
  '“Laid by one mother, counted by lamplight.',
  'Rain moth, of the far south: twenty-nine thousand one hundred, and more unlaid inside her.',
  'Codling moth: fifty, one by one on the apples.',
  'Corn earworm: a thousand.',
  'Fall webworm: four hundred, in one white mass under the leaf.',
  'Set them down from the meanest mother to the most generous, and the first figure of each will open the door.”',
].join(' ');
export const CLOCK_LOG = [
  'A collector’s record, pinned beside the clock, the ink gone brown:',
  '“Taken at the lamp, the year round.',
  'The Common swift at dusk, nine o’clock, low over the long grass.',
  'The Convolvulus hawk at eleven, at the tobacco flowers by the kitchen door.',
  'The Large yellow underwing at midnight, battering the glass.',
  'The Merveille du Jour, the marvel of the day, last of all, at three in the morning, in the darkest hour.',
  'Set each where she flies and the hands will remember the way in.”',
].join(' ');
export const RACK_PLATE = 'A brass plate screwed to the rack: “From the least of them to the White Witch, as she taught us to grow.” Five hooks, numbered I to V, left to right.';

export function buildAttic(ctx) {
  const { group, local, wall, plane, door, light, addMirror, doors } = ctx;
  const r = rand(4104);
  const X0 = 30, X1 = 58, Z0 = 171.4, Z1 = 185.4, ZR = 178.4, RH = 4.6, KH = 1.3;
  const roofY = z => RH - Math.abs(z - ZR) / (ZR - Z0) * (RH - KH);
  const SLOPE = Math.atan2(RH - KH, ZR - Z0), SLEN = Math.hypot(RH - KH, ZR - Z0);

  const boards = mat({ map: rep(tex.floor, 7, 4), color: 0x8a7a6a });
  const roofBoards = mat({ map: rep(tex.plank, 10, 9), color: 0x6a5646, side: THREE.DoubleSide });
  const timber = mat({ map: tex.wood, color: 0x5a4434 });
  const darkWood = mat({ map: tex.wood, color: 0x3e2c22 });
  const partition = mat({ map: rep(tex.plank, 0.9, 1.6), color: 0x9a8670 });
  const brick = mat({ map: rep(tex.stone, 0.45, 0.6), color: 0x7a5a4a, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.8, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const silk = new THREE.MeshStandardMaterial({ map: silkTexture(), color: 0xd8d8d8, roughness: 0.85, emissive: 0x1a1814, side: THREE.DoubleSide });
  const paper = t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const silkGeos = [], threadPts = [], veils = [];
  const add = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); return m; };

  // ======================= shell: floor, roof, knee walls, gables =======================
  plane(X1 - X0, Z1 - Z0, (X0 + X1) / 2, 0, ZR, boards);
  // roof slopes (one quad each), carried a little past the knee walls
  const quad = (pts, m, ru, rv) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, ru, 0, ru, rv, 0, rv], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
    const q = new THREE.Mesh(g, m); q.receiveShadow = true; group.add(q); return q;
  };
  const ze = 0.4, ye = ze * Math.tan(SLOPE);
  quad([[X0, KH - ye, Z0 - ze], [X1, KH - ye, Z0 - ze], [X1, RH, ZR], [X0, RH, ZR]], roofBoards, 1, 1);
  quad([[X0, RH, ZR], [X1, RH, ZR], [X1, KH - ye, Z1 + ze], [X0, KH - ye, Z1 + ze]], roofBoards, 1, 1);
  wall('x', Z0 - 0.1, X0, X1, KH, partition);
  wall('x', Z1 + 0.1, X0, X1, KH, partition);
  // gable-shaped walls across the roof: the end walls and the two partitions
  function gable(x, m, gaps = []) {
    // outline along the floor, notched up and over each opening, then up the roof line
    const pts = [[Z0 - 0.1, 0]];
    for (const [c, w, h] of [...gaps].sort((p, q) => p[0] - q[0])) pts.push([c - w / 2, 0], [c - w / 2, h], [c + w / 2, h], [c + w / 2, 0]);
    pts.push([Z1 + 0.1, 0], [Z1 + 0.1, KH - 0.04], [ZR, RH], [Z0 - 0.1, KH - 0.04]);
    const s = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(x + 0.1, 0, 0);
    const w = new THREE.Mesh(g, m); w.receiveShadow = true; group.add(w);
    let a = Z0 - 0.1;
    for (const [c, gw] of [...gaps].sort((p, q) => p[0] - q[0])) { rect(local, x - 0.1, x + 0.1, a, c - gw / 2); a = c + gw / 2; }
    rect(local, x - 0.1, x + 0.1, a, Z1 + 0.1);
    return w;
  }
  gable(X0 - 0.1, brick); gable(X1 + 0.1, brick);
  gable(48, partition, [[182.0, 1.0, 2.1]]);       // the shadow door
  gable(39, partition, [[174.2, 0.9, 1.1]]);       // the crawl hatch
  wall('x', ZR, 48, X1, RH, partition, [[53.0, 1.4]]); // Landing / Sleepers' Loft: an open doorway
  wall('x', ZR, 39, 48, RH, partition, [[43.5, 1.2]]); // Egg Store / Clock Room: padlocked door
  door('aEggClock', 'x', ZR, 43.5, { locked: true, swing: 1, msg: 'Padlocked: a brass lock with four number dials.' });
  doors.aEggClock.custom = true;
  // the chimney stack rising through the Landing
  box(group, 0.9, RH, 0.7, 54.9, RH / 2, 185.0, brick, local);

  // ======================= rafters, ridge, purlins, collar ties (one merged mesh) =======================
  {
    const geos = [];
    const beam = (w, h, d, x, y, z, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); geos.push(g); };
    const off = 0.1; // rafters sit just under the boards
    for (let x = X0 + 0.25; x < X1; x += 0.6) {
      for (const s of [-1, 1]) {
        const zm = ZR + s * (ZR - Z0) / 2 + s * 0.2, ym = roofY(zm) - off;
        beam(0.07, 0.15, SLEN + 0.6, x, ym, zm, s * SLOPE);
      }
    }
    beam(X1 - X0, 0.24, 0.1, (X0 + X1) / 2, RH - 0.12, ZR);
    for (const s of [-1, 1]) for (const k of [0.33, 0.66]) { const z = ZR + s * (ZR - Z0) * k; beam(X1 - X0, 0.14, 0.1, (X0 + X1) / 2, roofY(z) - 0.25, z); }
    for (let x = X0 + 1.45; x < X1; x += 2.4) beam(0.08, 0.15, 6.5, x, 3.05, ZR);
    const m = new THREE.Mesh(mergeGeometries(geos, false), timber); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }

  // ======================= moonlight: skylights, shafts, patches =======================
  const skyTexture = skylightTex();
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0x8aa0c8, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const patchMat = new THREE.MeshBasicMaterial({ map: patchTex(), color: 0x6a80a8, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const moons = [];
  function skylight(x, side) {
    // a four-pane cast-iron rooflight in the slope (side -1 north, +1 south)
    const zc = ZR + side * 3.2, y = roofY(zc) - 0.02;
    const g = new THREE.Group(); g.position.set(x, y, zc); g.rotation.x = side * SLOPE; group.add(g);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide })); pane.rotation.x = Math.PI / 2; g.add(pane);
    for (const [w, d, px, pz] of [[1.12, 0.06, 0, -0.68], [1.12, 0.06, 0, 0.68], [0.06, 1.42, -0.53, 0], [0.06, 1.42, 0.53, 0]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), timber); f.position.set(px, -0.04, pz); g.add(f); }
    // the beam of moonlight slanting down to the boards, and the pale patch it leaves
    const fz = zc - side * 0.9, top = new THREE.Vector3(x, y - 0.05, zc), foot = new THREE.Vector3(x - 0.5, 0.01, fz);
    const len = top.distanceTo(foot);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.5, len, 12, 1, true), shaftMat);
    shaft.position.copy(top).add(foot).multiplyScalar(0.5); shaft.lookAt(foot); shaft.rotateX(Math.PI / 2); shaft.userData.noAO = true; group.add(shaft);
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), patchMat); patch.rotation.x = -Math.PI / 2; patch.position.copy(foot); patch.position.y = 0.012; patch.userData.noAO = true; group.add(patch);
    const l = new THREE.PointLight(0x8aa4d8, 8, 9, 1.6); l.position.set(x - 0.2, y - 0.9, (zc + fz) / 2); group.add(l); moons.push(l);
    return { top, foot };
  }
  const beams = [skylight(53.2, 1), skylight(53.2, -1), skylight(43.5, 1), skylight(43.5, -1), skylight(34.5, -1), skylight(34.5, 1)];
  // dust motes turning in the moonlight
  const ND = 320, dpos = new Float32Array(ND * 3);
  for (let i = 0; i < ND; i++) { const b = beams[i % beams.length], t = r(); dpos.set([b.top.x + (b.foot.x - b.top.x) * t + (r() - 0.5) * 0.9, b.top.y + (b.foot.y - b.top.y) * t, b.top.z + (b.foot.z - b.top.z) * t + (r() - 0.5) * 0.9], i * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xc8d4ec, size: 0.006, transparent: true, opacity: 0.5, depthWrite: false }));
  dust.userData.dust = ND; dust.userData.noAO = true; group.add(dust);
  // room fills (no visible source), cool and low, so the attic reads in the dark
  for (const [x, z] of [[53, 182], [53, 174.6], [43.5, 182], [43.5, 174.8], [34.5, 178.4]]) light(x, 2.6, z, 0x8a8a9a, 10, 14, false).userData.fill = true;

  // ======================= Landing (SE): ladder D, hymn book, Wingspan Rack =======================
  // ladder D comes up through a square hole in the boards
  plane(1.1, 1.0, 57.0, 0.004, 183.9, mat({ color: 0x050404 }));
  for (const s of [-0.25, 0.25]) box(group, 0.06, 1.0, 0.06, 57.3, 0.5, 183.9 + s, timber, null, { cast: false });
  for (const [w, d, x, z] of [[1.2, 0.08, 57.0, 183.36], [1.2, 0.08, 57.0, 184.44], [0.08, 1.16, 56.42, 183.9]]) box(group, w, 0.06, d, x, 0.03, z, darkWood, null, { cast: false });
  rect(local, 56.6, 57.6, 183.45, 184.35);
  // the hatch cover, thrown back against the knee wall
  box(group, 1.0, 0.05, 0.9, 57.2, 0.62, 184.95, darkWood, null).rotation.x = -1.2;
  // lectern with the hymn book
  const lect = new THREE.Group(); lect.position.set(55.2, 0, 179.1); group.add(lect);
  box(lect, 0.08, 1.05, 0.08, 0, 0.52, 0, darkWood); box(lect, 0.5, 0.04, 0.4, 0, 0.02, 0, darkWood);
  const desk = box(lect, 0.56, 0.04, 0.42, 0, 1.1, 0.02, darkWood); desk.rotation.x = 0.35;
  const hymn = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), paper(bookTex('hymn'))); hymn.rotation.x = -Math.PI / 2 + 0.35; hymn.position.set(0, 1.13, 0.03); lect.add(hymn);
  rect(local, 54.9, 55.5, 178.85, 179.35);
  light(55.0, 1.25, 179.0, 0xffc890, 3, 5, 'candle');
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.14, 8), mat({ color: 0xe8e0c8 })); c.position.set(55.0, 1.17, 179.0); group.add(c); }

  // The Wingspan Rack: a gallows of dark wood, five hooks on threads, an oil lamp behind.
  const LAMP = new THREE.Vector3(50.55, 1.05, 182.0), HY = 1.4, RX = 49.75, WALLX = 48.115;
  const hookZ = i => 182.72 - i * 0.36; // I (left, as you face the wall) .. V (right)
  const rackG = new THREE.Group(); group.add(rackG);
  for (const z of [181.0, 183.0]) box(rackG, 0.07, 2.05, 0.07, RX, 1.02, z, darkWood);
  box(rackG, 0.07, 0.07, 2.1, RX, 2.05, 182.0, darkWood);
  box(rackG, 0.5, 0.05, 0.5, RX, 0.025, 181.0, darkWood); box(rackG, 0.5, 0.05, 0.5, RX, 0.025, 183.0, darkWood);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.08), paper(plateTex())); plate.position.set(RX + 0.04, 1.96, 182.0); plate.rotation.y = Math.PI / 2; group.add(plate);
  rect(local, RX - 0.25, RX + 0.25, 180.8, 183.2);
  const threadGeo = [], hooks = [], pickables = [];
  const rackTex = {}; const mothCut = key => rackTex[key] || (rackTex[key] = cutoutTex(key, false));
  const shadowTex = {}; const mothShadow = key => shadowTex[key] || (shadowTex[key] = cutoutTex(key, true));
  for (let i = 0; i < 5; i++) {
    const z = hookZ(i);
    threadGeo.push(RX, 2.02, z, RX, HY + 0.05, z);
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 12, Math.PI * 1.4), brass); hk.position.set(RX, HY + 0.05, z); hk.rotation.y = Math.PI / 2; group.add(hk);
    const spec = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 }));
    spec.rotation.y = Math.PI / 2; spec.position.set(RX, HY, z); group.add(spec);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8, depthWrite: false }));
    sh.rotation.y = Math.PI / 2; sh.renderOrder = 2; group.add(sh);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.33), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(RX, HY, z); pick.userData.hook = i; group.add(pick); pickables.push(pick);
    hooks.push({ i, z, spec, sh, pick });
  }
  { const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(threadGeo, 3)); group.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.5 }))); }
  // the oil lamp on its stand, between the rack and the room
  box(group, 0.06, 0.92, 0.06, LAMP.x, 0.46, LAMP.z, darkWood); box(group, 0.36, 0.04, 0.36, LAMP.x, 0.02, LAMP.z, darkWood); box(group, 0.24, 0.03, 0.24, LAMP.x, 0.93, LAMP.z, darkWood);
  { const font = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), brass); font.scale.y = 0.8; font.position.set(LAMP.x, 0.99, LAMP.z); group.add(font); }
  gasLampFixture(group, LAMP.x, LAMP.y, LAMP.z, 'candle');
  { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.2, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff0d8, transparent: true, opacity: 0.3, emissive: 0xffa050, emissiveIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false })); ch.position.set(LAMP.x, LAMP.y + 0.04, LAMP.z); group.add(ch); }
  light(LAMP.x + 0.05, LAMP.y + 0.1, LAMP.z, 0xffb060, 6, 7, false);
  // the pool of lamplight on the partition, which the shadows fall across
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.9), new THREE.MeshBasicMaterial({ map: patchTex(), color: 0x6a4420, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.set(WALLX + 0.002, 1.75, 182.0); glow.rotation.y = Math.PI / 2; glow.renderOrder = 1; glow.userData.noAO = true; group.add(glow);
  rect(local, LAMP.x - 0.2, LAMP.x + 0.2, LAMP.z - 0.2, LAMP.z + 0.2);
  // the shape the five shadows make when they are hung right: a door
  const doorShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 2.16), new THREE.MeshBasicMaterial({ map: doorShadowTex(), transparent: true, opacity: 0, depthWrite: false }));
  doorShadow.position.set(WALLX + 0.004, 1.06, 182.0); doorShadow.rotation.y = Math.PI / 2; doorShadow.renderOrder = 3; group.add(doorShadow);
  // the door itself: boards flush with the partition, hinged at its south edge
  const sdPivot = new THREE.Group(); sdPivot.position.set(48, 0, 182.5); group.add(sdPivot);
  box(sdPivot, 0.16, 2.1, 0.99, 0, 1.05, -0.5, partition);
  const sdCol = { minX: 47.9, maxX: 48.1, minZ: 181.5, maxZ: 182.5, door: 'aShadow' }; local.push(sdCol);
  cocoon(56.8, 180.0, 0.9, true); cocoon(50.6, 184.6, 1.0, true);

  // ======================= Sleepers' Loft (NE): cots, M8 =======================
  for (let k = 0; k < 4; k++) {
    const x = 49.6 + k * 2.1, cot = new THREE.Group(); cot.position.set(x, 0, 172.45); group.add(cot); // head to the knee wall
    for (const [dx, dz] of [[-0.4, -0.95], [0.4, -0.95], [-0.4, 0.95], [0.4, 0.95]]) box(cot, 0.04, 0.45, 0.04, dx, 0.22, dz, iron, null, { cast: false });
    box(cot, 0.86, 0.04, 1.95, 0, 0.45, 0, iron, null, { cast: false });
    box(cot, 0.8, 0.12, 1.85, 0, 0.53, 0, mat({ map: tex.sheet || tex.fabric, color: 0xb0a898 }));
    box(cot, 0.86, 0.75, 0.04, 0, 0.6, -0.97, iron);
    if (k !== 2) { // a sleeper, wrapped
      const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.max(0.01, Math.sin(Math.pow(t, 0.8) * Math.PI) * (t < 0.2 ? 0.13 : 0.19)), t * 1.6)); }
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), silk); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.65); body.position.set(0, 0.68, -0.8); cot.add(body);
    }
    rect(local, x - 0.45, x + 0.45, 171.4, 173.5);
  }
  const chest = box(group, 1.0, 0.55, 0.55, 56.9, 0.28, 176.4, darkWood, local); chest.rotation.y = Math.PI / 2;
  addMirror({ id: 'M8', pos: new THREE.Vector3(48.12, 1.6, 175.2), ry: Math.PI / 2, w: 0.8, h: 1.4, stage: 8 });
  cocoon(50.4, 176.6, 1.1, true); cocoon(55.4, 175.0, 1.3, true); cocoon(57.2, 173.4, 0.8, false);
  light(57.6, 1.9, 174.6, 0xffa860, 2.4, 6, '-x').userData.creepy = true;

  // ======================= Egg Store (S mid): the jars and the ledger =======================
  // shelves of small jars under the eaves, each furred with eggs
  const jarGlass = new THREE.MeshStandardMaterial({ color: 0xcfe0d8, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const eggMat = new THREE.MeshStandardMaterial({ color: 0xe0dcc8, roughness: 0.4, emissive: 0x1a1a14 });
  for (const y of [0.35, 0.8]) box(group, 8.4, 0.04, 0.4, 43.5, y, 185.1, timber, null, { cast: false });
  rect(local, 39.2, 47.8, 184.85, 185.4);
  {
    const NJ = 30, small = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12, 1, true), jarGlass, NJ), fill = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.052, 0.052, 1, 10), eggMat, NJ);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < NJ; i++) { const x = 39.6 + (i % 15) * 0.55 + r() * 0.1, y = i < 15 ? 0.46 : 0.91, h = 0.03 + r() * 0.12; m4.makeTranslation(x, y, 185.1); small.setMatrixAt(i, m4); m4.compose(v.set(x, y - 0.09 + h / 2, 185.1), q, sc.set(1, h, 1)); fill.setMatrixAt(i, m4); }
    group.add(small, fill);
  }
  // the four great jars on the table, each labelled
  box(group, 2.6, 0.06, 0.9, 43.4, 0.78, 181.4, timber); for (const [dx, dz] of [[-1.2, -0.38], [1.2, -0.38], [-1.2, 0.38], [1.2, 0.38]]) box(group, 0.06, 0.78, 0.06, 43.4 + dx, 0.39, 181.4 + dz, timber, null, { cast: false });
  rect(local, 42.05, 44.75, 180.9, 181.9);
  const eggGeo = new THREE.SphereGeometry(0.012, 6, 4);
  EGG_JARS.forEach((j, i) => {
    const x = 42.5 + i * 0.6, jg = new THREE.Group(); jg.position.set(x, 0.81, 181.35); group.add(jg);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 18, 1, true), jarGlass); gl.position.y = 0.18; jg.add(gl);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.03, 18), brass); lid.position.y = 0.37; jg.add(lid);
    // eggs heaped by how many she laid (a handful for the fewest, the jar packed for the most)
    const n = Math.round(20 + Math.log10(j.eggs) * 60), inst = new THREE.InstancedMesh(eggGeo, eggMat, n), m4 = new THREE.Matrix4();
    const fillH = 0.03 + (Math.log10(j.eggs) - 1.6) / 3 * 0.26;
    for (let k = 0; k < n; k++) { const a = r() * 6.28, rr = Math.sqrt(r()) * 0.11; m4.makeTranslation(Math.cos(a) * rr, 0.015 + r() * fillH, Math.sin(a) * rr); inst.setMatrixAt(k, m4); }
    jg.add(inst);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), paper(jarLabelTex(j.key))); lab.position.set(0, 0.17, 0.132); jg.add(lab);
  });
  // the ledger, open on a clerk's desk
  const ld = new THREE.Group(); ld.position.set(44.6, 0, 184.45); group.add(ld);
  box(ld, 1.2, 0.05, 0.6, 0, 0.82, 0, darkWood); for (const [dx, dz] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) box(ld, 0.05, 0.82, 0.05, dx, 0.41, dz, darkWood, null, { cast: false });
  const ledger = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.32), paper(bookTex('ledger'))); ledger.rotation.x = -Math.PI / 2; ledger.position.set(-0.15, 0.851, 0); ld.add(ledger);
  rect(local, 43.95, 45.25, 184.1, 184.8);
  light(44.2, 0.98, 184.5, 0xffc890, 3, 6, 'candle');
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.12, 8), mat({ color: 0xe8e0c8 })); c.position.set(44.2, 0.91, 184.5); group.add(c); }
  // the padlock hanging on the door north
  const eggLock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.05), brass); eggLock.position.set(44.0, 1.05, ZR + 0.14); group.add(eggLock);
  cocoon(40.2, 183.6, 1.0, true); cocoon(47.0, 180.0, 1.2, true);

  // ======================= Clock Room (N mid) =======================
  // the Night Clock on the partition's west face: a big plain dial, four moths on pins round the rim
  const CLK = new THREE.Vector3(47.88, 1.75, 175.0), CR = 0.62;
  const clockG = new THREE.Group(); clockG.position.copy(CLK); clockG.rotation.y = -Math.PI / 2; group.add(clockG);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(CR + 0.07, CR + 0.07, 0.08, 40), darkWood); rim.rotation.x = Math.PI / 2; rim.position.z = 0.02; clockG.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(CR, 48), new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.7 })); face.position.z = 0.065; clockG.add(face);
  const hand = (len, w) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.01), new THREE.MeshStandardMaterial({ color: 0x141210, metalness: 0.6, roughness: 0.4 })); m.position.y = len / 2 - 0.04; p.add(m); p.position.z = 0.08; clockG.add(p); p.visible = false; return p; };
  const hourHand = hand(0.34, 0.03), minHand = hand(0.5, 0.018);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), brass); boss.rotation.x = Math.PI / 2; boss.position.z = 0.09; clockG.add(boss);
  const clockTokens = CLOCK_MOTHS.map(c => {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: cutoutTex(c.key, false), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    t.position.z = 0.075; clockG.add(t); return t;
  });
  const placeToken = (i, h) => { const a = Math.PI / 2 - (h % 12) / 12 * Math.PI * 2, rr = CR * 0.62 + (i % 2) * 0.08; clockTokens[i].position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.075 + i * 0.002); };
  // the collector's record pinned beside it (the clue)
  const log = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), paper(noteTex(r))); log.position.set(47.885, 1.55, 173.4); log.rotation.y = -Math.PI / 2; group.add(log);
  light(47.75, 2.35, 176.4, 0xffa860, 2.6, 6, '-x').userData.creepy = true;
  // the cipher wheel on the opposite wall: letters round the outside, moth symbols on a turning ring
  const WH = new THREE.Vector3(39.115, 1.5, 177.2);
  const wheelG = new THREE.Group(); wheelG.position.copy(WH); wheelG.rotation.y = Math.PI / 2; group.add(wheelG);
  const wb = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 40), brass); wb.rotation.x = Math.PI / 2; wheelG.add(wb);
  const outer = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), new THREE.MeshStandardMaterial({ map: wheelTex(false), transparent: true, roughness: 0.4, metalness: 0.3 })); outer.position.z = 0.017; wheelG.add(outer);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.25, 48), new THREE.MeshStandardMaterial({ map: wheelTex(true), roughness: 0.4, metalness: 0.4, color: 0xd8c090 })); inner.position.z = 0.019; wheelG.add(inner);
  // the marks on the rafters: a brace board nailed across them, chalked with symbols
  const brace = new THREE.Group(); brace.position.set(43.5, 2.3, 174.35); group.add(brace);
  box(brace, 8.6, 0.3, 0.05, 0, 0, 0, timber, null, { cast: false });
  const msg = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 0.28), new THREE.MeshBasicMaterial({ map: rafterTex(), transparent: true, color: 0xb8b0a0 })); msg.position.z = 0.027; brace.add(msg);
  // the brass box with a letter-lock, on a stool by the knee wall
  box(group, 0.5, 0.5, 0.5, 41.2, 0.25, 172.0, darkWood, local);
  const bx = new THREE.Group(); bx.position.set(41.2, 0.5, 172.0); group.add(bx);
  box(bx, 0.34, 0.14, 0.22, 0, 0.07, 0, darkWood); for (const dx of [-0.15, 0.15]) box(bx, 0.02, 0.15, 0.23, dx, 0.075, 0, brass, null, { cast: false });
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.14, -0.11); bx.add(lidPivot); box(lidPivot, 0.34, 0.04, 0.22, 0, 0.02, 0.11, darkWood);
  for (let k = 0; k < 4; k++) { const dl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 10), brass); dl.rotation.z = Math.PI / 2; dl.position.set(-0.06 + k * 0.04, 0.07, 0.115); bx.add(dl); }
  const boxHands = new THREE.Group(); bx.add(boxHands); box(boxHands, 0.03, 0.01, 0.2, -0.05, 0.13, 0, iron, null, { cast: false }); box(boxHands, 0.02, 0.01, 0.28, 0.05, 0.13, 0, iron, null, { cast: false });
  // the crawl hatch west, into her chamber; EMERGENCE cut above it
  const hatchPivot = new THREE.Group(); hatchPivot.position.set(39.0, 0, 173.75); group.add(hatchPivot);
  box(hatchPivot, 0.06, 1.1, 0.9, 0.1, 0.55, 0.45, darkWood);
  for (const y of [0.25, 0.85]) box(hatchPivot, 0.03, 0.06, 0.9, 0.14, y, 0.45, iron, null, { cast: false });
  const bolt = box(group, 0.05, 0.05, 0.3, 39.17, 0.6, 174.55, iron, null, { cast: false });
  const hatchCol = { minX: 38.9, maxX: 39.1, minZ: 173.75, maxZ: 174.65, door: 'aHatch' }; local.push(hatchCol);
  local.push({ minX: 38.85, maxX: 39.15, minZ: 173.7, maxZ: 174.7, minY: 1.2 }); // low header: crouch to pass
  const carve = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), new THREE.MeshStandardMaterial({ map: carveTex('EMERGENCE'), transparent: true, roughness: 0.9 })); carve.position.set(39.115, 1.42, 174.2); carve.rotation.y = Math.PI / 2; group.add(carve);
  cocoon(45.6, 173.2, 0.9, true); cocoon(40.4, 177.4, 1.1, true);

  // ======================= Mother's Chamber (W) =======================
  plane(8.6, 13.6, 34.6, 0.006, ZR, new THREE.MeshStandardMaterial({ map: rep(silk.map, 4, 6), color: 0x8a857a, roughness: 0.95, transparent: true, opacity: 0.8, depthWrite: false })); // silk over the boards
  // her nest against the west gable: a broad shallow cup of silk, slung from the rafters, EMPTY
  {
    // profile: a low hollow in the middle, a thick heaped lip, sloping back down to the boards
    const prof = [[0.02, 0.12], [0.6, 0.1], [1.2, 0.2], [1.6, 0.45], [1.85, 0.68], [2.0, 0.74], [2.15, 0.62], [2.3, 0.35], [2.45, 0.08], [2.5, 0.0]];
    const nest = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 40);
    { const pa = nest.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(a * 7 + y * 4) + 0.04 * Math.sin(a * 17); pa.setXYZ(i, x * k, y * (1 + 0.25 * Math.sin(a * 5) * Math.min(1, y * 2)), z * k); } nest.computeVertexNormals(); }
    nest.scale(1, 1, 0.8); nest.translate(ATTIC.motherSpawn.x + 0.4, 0.01, ATTIC.motherSpawn.z); silkGeos.push(nest);
    for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2, rx = ATTIC.motherSpawn.x + 0.4 + Math.cos(a) * 1.95, rz = ATTIC.motherSpawn.z + Math.sin(a) * 1.55; threadPts.push(rx, 0.7, rz, rx + Math.cos(a) * 0.6 + (r() - 0.5), roofY(rz) - 0.08, rz + (r() - 0.5) * 2); }
    // the husks of the ones that came out, split and empty, kicked into the hollow
    for (let k = 0; k < 4; k++) { const h = 0.9 + r() * 0.5; spinCocoon(silkGeos, threadPts, ATTIC.motherSpawn.x + 1.4 + r() * 1.2, ATTIC.motherSpawn.z - 1.6 + k * 1.0, h, false, 0); }
    // veils of silk she has hung from the collar ties, torn at the hems, stirring
    const veilMat = new THREE.MeshStandardMaterial({ map: silk.map, alphaMap: veilAlpha(), color: 0xd8d4c8, transparent: true, alphaTest: 0.25, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x141210 });
    for (let k = 0; k < 6; k++) {
      const g = new THREE.PlaneGeometry(1.3, 2.1, 6, 12), pa = g.attributes.position, ph = r() * 6;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), d = (1.05 - y) / 2.1; pa.setZ(i, Math.sin(x * 4 + ph) * 0.08 + Math.sin(y * 3 + ph) * 0.05 * d); pa.setX(i, x * (1 - d * 0.25)); }
      g.computeVertexNormals();
      const v = new THREE.Mesh(g, veilMat); v.position.set(30.9 + (k % 3) * 1.6, 1.98, 174.4 + k * 1.55); v.rotation.y = 0.9 + (r() - 0.5) * 0.7; group.add(v); veils.push(v);
    }
  }
  const motherAnchor = new THREE.Group(); motherAnchor.name = 'motherAnchor'; motherAnchor.position.copy(ATTIC.motherSpawn); group.add(motherAnchor);
  rect(local, 30.6, 34.6, 176.6, 180.2);
  // static spun cocoons, crowding the rafters
  for (const [x, z, h] of [[31.4, 173.0, 1.2], [33.0, 183.6, 1.4], [35.2, 172.6, 1.0], [36.4, 184.2, 1.3], [37.8, 180.6, 1.1], [31.8, 184.4, 0.9], [37.6, 176.0, 1.0]]) cocoon(x, z, h, true);
  // and the waking ones: separate meshes that twitch, some splitting open
  const waking = [];
  for (const [x, z, h, crack] of [[34.2, 174.6, 1.5, true], [36.0, 178.6, 1.7, false], [33.4, 181.8, 1.6, true], [37.2, 173.4, 1.3, false], [35.6, 182.6, 1.4, true], [32.0, 175.4, 1.2, false]]) waking.push(wakingCocoon(x, z, h, crack));
  light(35.0, 2.6, 178.4, 0x9a8a9a, 6, 12, false).userData.fill = true;

  // ---------- merge silk ----------
  {
    const merged = mergeGeometries(silkGeos.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; }), false);
    const silkMesh = new THREE.Mesh(merged, silk); silkMesh.castShadow = true; silkMesh.receiveShadow = true; group.add(silkMesh);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(threadPts, 3));
    group.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.35 })));
  }

  // ======================= state =======================
  const S = {};
  let shadowAnim = 0, hatchAnim = 0, lidAnim = 0, handsAnim = 0, rackShake = 0;
  let removeLocal = () => {}, addLocal = () => {};
  const projShadow = (h, key) => {
    // the lamp throws the specimen's shadow onto the partition, enlarged
    const k = (LAMP.x - WALLX) / (LAMP.x - RX), span = SPAN_MM[key] / 1000;
    h.sh.position.set(WALLX + 0.003 + h.i * 0.0004, LAMP.y + (HY - LAMP.y) * k, LAMP.z + (h.z - LAMP.z) * k);
    h.sh.scale.set(span * k * 1.15, span * k * 1.15, 1);
  };
  function placeRack() {
    hooks.forEach((h, i) => {
      const key = S.rack[i];
      h.spec.visible = h.sh.visible = !!key;
      if (!key) return;
      if (h.spec.material.map !== mothCut(key)) { h.spec.material.map = mothCut(key); h.spec.material.needsUpdate = true; }
      if (h.sh.material.map !== mothShadow(key)) { h.sh.material.map = mothShadow(key); h.sh.material.alphaMap = null; h.sh.material.needsUpdate = true; }
      const s = SPAN_MM[key] / 1000 * 1.15; h.spec.scale.set(s, s, 1);
      projShadow(h, key);
    });
  }
  const api = {
    group, motherAnchor, pickables, hooks,
    get rack() { return S.rack; }, get rackSolved() { return S.rackSolved; },
    get eggsOpen() { return S.eggsOpen; }, get boxOpen() { return S.boxOpen; },
    get clock() { return S.clock; }, get clockSolved() { return S.clockSolved; },
    get wheel() { return S.wheel; }, get sawRafters() { return S.sawRafters; },
    // hooks: swap what is held with what hangs there; returns what was there
    useHook(i, held) { const prev = S.rack[i] || null; S.rack[i] = held || null; placeRack(); return prev; },
    rackFull() { return S.rack.every(Boolean); },
    rackCorrect() { return S.rack.every((k, i) => k === RACK_ORDER[i]); },
    rackRight() { return S.rack.filter((k, i) => k === RACK_ORDER[i]).length; },
    shakeRack() { rackShake = 0.8; },
    solveRack(instant) { S.rackSolved = true; S.rack = [...RACK_ORDER]; placeRack(); removeLocal(sdCol); if (instant) shadowAnim = 1.5; },
    openEggs(instant) { S.eggsOpen = true; doors.aEggClock.locked = false; doors.aEggClock.open(instant); eggLock.visible = false; },
    openBox() { S.boxOpen = true; },
    setWheel(k) { S.wheel = ((k % 26) + 26) % 26; inner.rotation.z = -S.wheel / 26 * Math.PI * 2; },
    seeRafters() { S.sawRafters = true; },
    setHour(i, h) { S.clock[i] = ((h - 1) % 12 + 12) % 12 + 1; placeToken(i, S.clock[i]); },
    clockCorrect() { return CLOCK_MOTHS.every((c, i) => S.clock[i] === c.hour); },
    solveClock() { S.clockSolved = true; CLOCK_MOTHS.forEach((c, i) => api.setHour(i, c.hour)); removeLocal(hatchCol); },
    serialize() { return { rack: [...S.rack], rackSolved: S.rackSolved, eggsOpen: S.eggsOpen, boxOpen: S.boxOpen, clock: [...S.clock], clockSolved: S.clockSolved, wheel: S.wheel, sawRafters: S.sawRafters }; },
    restore(s) {
      if (!s) return;
      if (Array.isArray(s.rack) && s.rack.length === 5) { S.rack = [...s.rack]; placeRack(); }
      if (s.rackSolved) api.solveRack(true);
      if (s.eggsOpen) api.openEggs(true);
      if (s.boxOpen) { api.openBox(); lidAnim = 1; handsAnim = 1; }
      if (Array.isArray(s.clock)) s.clock.forEach((h, i) => api.setHour(i, h));
      api.setWheel(s.wheel || 0); S.sawRafters = !!s.sawRafters;
      if (s.clockSolved) { api.solveClock(); hatchAnim = 1; }
    },
    reset() {
      S.rack = [...RACK_START]; S.rackSolved = false; S.eggsOpen = false; S.boxOpen = false; S.clock = [...CLOCK_START]; S.clockSolved = false; S.wheel = 0; S.sawRafters = false;
      shadowAnim = 0; hatchAnim = 0; lidAnim = 0; handsAnim = 0; doorShadow.material.opacity = 0;
      doors.aEggClock.locked = true; eggLock.visible = true;
      addLocal(sdCol); addLocal(hatchCol);
      placeRack(); CLOCK_START.forEach((h, i) => placeToken(i, h)); api.setWheel(0);
    },
    bindColliders(rem, addB) { removeLocal = rem; addLocal = addB; },
    update(t, dt) {
      // rack: a wrong arrangement rattles; the right one draws the shadows together into a door
      if (rackShake > 0) { rackShake -= dt; hooks.forEach((h, i) => { h.spec.rotation.z = Math.sin(t * 40 + i) * 0.15 * rackShake; }); } else hooks.forEach((h, i) => { h.spec.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.04; });
      if (S.rackSolved && shadowAnim < 1.5) shadowAnim = Math.min(1.5, shadowAnim + dt * 0.45);
      const k1 = Math.min(1, shadowAnim), k2 = Math.max(0, Math.min(1, (shadowAnim - 1) * 2));
      if (S.rackSolved) {
        hooks.forEach(h => { projShadow(h, S.rack[h.i]); h.sh.position.lerp(tmpV.set(WALLX + 0.003, 1.06, 182.0), k1 * 0.85); h.sh.material.opacity = 0.8 * (1 - k1); });
        doorShadow.material.opacity = 0.85 * k1 * (1 - k2);
      }
      sdPivot.rotation.y = -1.7 * easeOut(k2);
      lidPivot.rotation.x = -1.9 * easeOut(lidAnim);
      if (S.boxOpen && lidAnim < 1) lidAnim = Math.min(1, lidAnim + dt * 1.2);
      if (S.boxOpen && handsAnim < 1) handsAnim = Math.min(1, handsAnim + dt * 2);
      boxHands.visible = !S.boxOpen || lidAnim < 0.9; hourHand.visible = minHand.visible = S.boxOpen && lidAnim >= 0.9;
      // the hands: idle at twelve; when the moths are right they sweep round and stop at three
      if (S.clockSolved) { hatchAnim = Math.min(1, hatchAnim + dt * 0.35); }
      const sweep = easeOut(hatchAnim);
      minHand.rotation.z = -sweep * Math.PI * 2 * 3; hourHand.rotation.z = -sweep * Math.PI * 2 * 3 / 12;
      bolt.position.z = 174.55 + (S.clockSolved ? Math.min(1, hatchAnim * 3) * 0.25 : 0);
      hatchPivot.rotation.y = 1.6 * easeOut(Math.max(0, hatchAnim - 0.5) * 2);
      // the waking cocoons: long stillness, then a jerk; the splitting ones breathe at the seam
      for (const w of waking) {
        if (w.jerk > 0) { w.jerk -= dt; w.g.rotation.z = Math.sin(t * 38 + w.ph) * 0.06 * w.jerk; w.g.rotation.x = Math.cos(t * 31 + w.ph) * 0.04 * w.jerk; }
        else { w.g.rotation.z = Math.sin(t * 0.6 + w.ph) * 0.012; w.g.rotation.x = 0; if (Math.random() < dt * 0.12) w.jerk = 0.4 + Math.random() * 0.6; }
        if (w.slit) { const o = 0.75 + 0.35 * Math.max(0, Math.sin(t * 0.9 + w.ph)) + (w.jerk > 0 ? 0.3 : 0); w.slit.scale.x = o; }
      }
      veils.forEach((v, i) => { v.rotation.z = Math.sin(t * 0.5 + i * 1.7) * 0.03; });
      const p = dg.attributes.position;
      for (let i = 0; i < ND; i++) { let y = p.getY(i) - 0.0012 + Math.sin(t * 0.6 + i) * 0.0006; if (y < 0.05) y = 3.6; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.25 + i * 1.7) * 0.0005); }
      p.needsUpdate = true;
      for (const l of moons) l.intensity = 8 + Math.sin(t * 0.13) * 0.6; // cloud passing
    },
  };
  const tmpV = new THREE.Vector3();
  api.reset();
  return api;

  // ---------- local builders ----------
  function cocoon(x, z, h, hanging) { spinCocoon(silkGeos, threadPts, x, z, h, hanging, hanging ? roofY(z) - 0.1 : 0); }
  // A cocoon of its own mesh, pivoting at its anchor so it can twitch; split ones show a dark
  // seam down one side, edged with torn silk.
  function wakingCocoon(x, z, h, crack) {
    const top = roofY(z) - 0.1, geos = [], pts = [];
    spinCocoon(geos, pts, x, z, h, true, top);
    for (let i = 0; i < pts.length; i++) threadPts.push(pts[i]);
    const merged = mergeGeometries(geos.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; }), false);
    merged.translate(-x, -(top - 0.22), -z);
    const g = new THREE.Group(); g.position.set(x, top - 0.22, z); group.add(g);
    const m = new THREE.Mesh(merged, silk); m.castShadow = true; g.add(m);
    let slit = null;
    if (crack) {
      const rr = 0.21 * h * 0.98, a = r() * 6.28;
      slit = new THREE.Group(); slit.position.set(Math.cos(a) * rr, -h * 0.5, Math.sin(a) * rr); slit.rotation.y = -a + Math.PI / 2; g.add(slit);
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.08, h * 0.5), new THREE.MeshBasicMaterial({ color: 0x050302, side: THREE.DoubleSide })); slit.add(seam);
      const wet = new THREE.Mesh(new THREE.PlaneGeometry(0.035, h * 0.36), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide })); wet.position.z = 0.004; slit.add(wet);
      for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.06 + r() * 0.05), silk); f.position.set((k % 2 ? 1 : -1) * 0.035, (r() - 0.5) * h * 0.4, 0.01); f.rotation.z = (k % 2 ? 1 : -1) * 0.5; slit.add(f); }
    }
    return { g, slit, jerk: 0, ph: r() * 6.28 };
  }
}

const easeOut = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

// ======================= textures =======================
const canvasTexture = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
// a specimen cut out of its background (or its black shadow)
function cutoutTex(key, shadow) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  drawMoth(g, key, 128, 122, 240, { pin: !shadow, seed: key.length * 7 });
  if (shadow) { g.globalCompositeOperation = 'source-in'; g.filter = 'blur(2px)'; g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); }
  return canvasTexture(c);
}
function veilAlpha() {
  // white where the silk is, ragged at the hem, with moth-holes and runs
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); g.fillStyle = '#fff';
  const r = rand(77); g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0);
  for (let x = 128; x >= 0; x -= 6) g.lineTo(x, 170 + r() * 80);
  g.closePath(); g.fill();
  g.fillStyle = '#000'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * 128, 40 + r() * 190, 2 + r() * 7, 3 + r() * 12, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
}
function doorShadowTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.filter = 'blur(3px)'; g.fillStyle = 'rgba(0,0,0,0.95)';
  g.beginPath(); g.moveTo(8, 252); g.lineTo(8, 40); g.quadraticCurveTo(64, -6, 120, 40); g.lineTo(120, 252); g.closePath(); g.fill();
  // the wings still show at its edges, as if it were made of them
  g.fillStyle = 'rgba(0,0,0,0.8)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(i % 2 ? 122 : 6, 60 + i * 34, 10, 18, 0, 0, 7); g.fill(); }
  return canvasTexture(c);
}
function skylightTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#2a3450'); gr.addColorStop(1, '#4a5a7a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 160);
  const rr = rand(9); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(230,236,255,${0.3 + rr() * 0.6})`; g.fillRect(rr() * 128, rr() * 160, 1, 1); }
  g.fillStyle = 'rgba(240,244,255,0.9)'; g.beginPath(); g.arc(88, 44, 12, 0, 7); g.fill();
  g.fillStyle = 'rgba(80,90,110,0.5)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(rr() * 128, rr() * 160, 6 + rr() * 20, 2 + rr() * 6, 0, 0, 7); g.fill(); } // grime and leaves on the glass
  g.fillStyle = '#1a1410'; g.fillRect(62, 0, 4, 160); g.fillRect(0, 78, 128, 4);
  return canvasTexture(c);
}
function patchTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(61, 0, 6, 128); g.fillRect(0, 61, 128, 6);
  return canvasTexture(c);
}
function plateTex() {
  const c = document.createElement('canvas'); c.width = 340; c.height = 80; const g = c.getContext('2d');
  g.fillStyle = '#9a7a3a'; g.fillRect(0, 0, 340, 80); g.strokeStyle = '#4a3a1a'; g.lineWidth = 4; g.strokeRect(4, 4, 332, 72);
  g.fillStyle = '#2a1e0e'; g.font = 'italic 19px Georgia, serif'; g.textAlign = 'center';
  g.fillText('From the least of them', 170, 34); g.fillText('to the White Witch', 170, 60);
  return canvasTexture(c);
}
function jarLabelTex(key) {
  const c = document.createElement('canvas'); c.width = 180; c.height = 100; const g = c.getContext('2d');
  g.fillStyle = '#e4d8bc'; g.fillRect(0, 0, 180, 100); g.strokeStyle = '#5a4020'; g.lineWidth = 3; g.strokeRect(5, 5, 170, 90);
  g.fillStyle = '#2a1a0a'; g.textAlign = 'center'; g.font = 'italic 17px Georgia, serif'; g.fillText(SPECIES[key].common, 90, 44);
  g.font = 'italic 12px Georgia, serif'; g.fillText(SPECIES[key].latin, 90, 68);
  return canvasTexture(c);
}
function bookTex(kind) {
  const c = document.createElement('canvas'); c.width = 460; c.height = 320; const g = c.getContext('2d');
  g.fillStyle = kind === 'hymn' ? '#3a3a40' : '#4a2a1a'; g.fillRect(0, 0, 460, 320);
  g.fillStyle = '#e4d8bc'; g.fillRect(10, 8, 216, 304); g.fillRect(234, 8, 216, 304);
  g.fillStyle = 'rgba(50,35,20,0.5)'; g.fillRect(228, 8, 4, 304);
  const r = rand(kind.length * 13);
  g.fillStyle = '#2a1e10'; g.font = 'italic 15px Georgia, serif';
  if (kind === 'hymn') {
    g.fillText('XII.', 26, 40); g.fillText('The Moon Over the Mother', 26, 62);
    for (let i = 0; i < 12; i++) g.fillRect(26, 84 + i * 17, 120 + r() * 70, 1.6);
    g.fillStyle = 'rgba(70,70,80,0.85)'; g.font = '13px Georgia, serif'; g.fillText('moon under M', 250, 200);
    g.beginPath(); g.arc(270, 236, 12, 0.6, 5.6); g.strokeStyle = 'rgba(70,70,80,0.85)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 8; i++) g.fillRect(250, 40 + i * 17, 120 + r() * 70, 1.6);
  } else {
    for (let i = 0; i < 15; i++) { g.fillRect(26, 32 + i * 18, 100 + r() * 60, 1.6); g.fillRect(170, 32 + i * 18, 40, 1.6); g.fillRect(250, 32 + i * 18, 110 + r() * 60, 1.6); }
  }
  return canvasTexture(c);
}
function noteTex(r) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#dccfae'; g.fillRect(0, 0, 192, 256);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(60,40,20,0.55)'; g.fillRect(16, 30 + i * 34, 120 + r() * 40, 1.6); g.fillRect(16, 42 + i * 34, 60 + r() * 40, 1.6); }
  return canvasTexture(c);
}
function clockFaceTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#d8ccb0'; g.fillRect(0, 0, S, S);
  const gr = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(70,50,20,0.45)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, 7); g.stroke(); g.beginPath(); g.arc(S / 2, S / 2, S * 0.4, 0, 7); g.stroke();
  const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  g.fillStyle = '#1a1410'; g.font = '34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 0; h < 12; h++) { const a = -Math.PI / 2 + h / 12 * Math.PI * 2; g.save(); g.translate(S / 2 + Math.cos(a) * S * 0.435, S / 2 + Math.sin(a) * S * 0.435); g.rotate(a + Math.PI / 2); g.fillText(R[h], 0, 0); g.restore(); }
  for (let m = 0; m < 60; m++) { const a = m / 60 * Math.PI * 2; g.fillRect(S / 2 + Math.cos(a) * S * 0.4 - 1, S / 2 + Math.sin(a) * S * 0.4 - 1, 3, 3); }
  g.font = 'italic 20px Georgia, serif'; g.fillStyle = 'rgba(40,30,20,0.8)'; g.fillText('Nox', S / 2, S * 0.66);
  return canvasTexture(c);
}
// The 26 moth symbols: 0 is the moon; the rest are moth shapes (5 wing forms) with 0-4 marks.
export function drawGlyph(g, idx, cx, cy, s, color = '#e8e0cc') {
  g.save(); g.translate(cx, cy); g.scale(s / 40, s / 40); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round';
  if (idx === 0) { g.beginPath(); g.arc(0, 0, 15, 0.9, 5.4); g.arc(7, 0, 12, 4.6, 1.7, true); g.closePath(); g.fill(); g.restore(); return; }
  const form = (idx - 1) % 5, marks = Math.floor((idx - 1) / 5);
  g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 14); g.stroke(); // body
  for (const sx of [-1, 1]) {
    g.save(); g.scale(sx, 1); g.beginPath();
    if (form === 0) { g.ellipse(9, -5, 9, 8, -0.3, 0, 7); g.moveTo(14, 7); g.ellipse(8, 7, 6, 5, 0.3, 0, 7); }
    if (form === 1) { g.moveTo(1, -6); g.lineTo(19, -15); g.lineTo(13, 2); g.lineTo(1, 2); g.moveTo(1, 3); g.lineTo(10, 10); g.lineTo(1, 10); }
    if (form === 2) { g.moveTo(1, -6); g.quadraticCurveTo(14, -18, 19, -10); g.quadraticCurveTo(13, -9, 15, -3); g.lineTo(1, 1); g.moveTo(1, 3); g.quadraticCurveTo(12, 4, 9, 12); g.lineTo(1, 8); }
    if (form === 3) { g.moveTo(1, -6); g.lineTo(16, -12); g.lineTo(13, 0); g.lineTo(1, 1); g.moveTo(1, 3); g.lineTo(11, 6); g.lineTo(9, 18); g.lineTo(5, 8); g.lineTo(1, 8); }
    if (form === 4) { g.moveTo(1, -3); g.lineTo(20, -6); g.lineTo(18, -1); g.lineTo(1, 1); g.moveTo(1, 3); g.lineTo(8, 5); g.lineTo(1, 7); }
    g.stroke();
    for (let k = 0; k < marks; k++) { g.beginPath(); g.arc(7 + (k % 2) * 5, -8 + Math.floor(k / 2) * 5 + (form === 4 ? 4 : 0), 1.6, 0, 7); g.fill(); }
    g.restore();
  }
  g.restore();
}
function wheelTex(innerRing) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  if (innerRing) {
    g.fillStyle = '#7a5e2a'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + i / 26 * Math.PI * 2; drawGlyph(g, i, S / 2 + Math.cos(a) * S * 0.4, S / 2 + Math.sin(a) * S * 0.4, 34, '#1e1408'); }
    g.fillStyle = '#4a3618'; g.beginPath(); g.arc(S / 2, S / 2, 30, 0, 7); g.fill();
  } else {
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#9a7a3a'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.arc(S / 2, S / 2, S * 0.36, 0, 7, true); g.fill();
    g.fillStyle = '#1e1408'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + i / 26 * Math.PI * 2; g.save(); g.translate(S / 2 + Math.cos(a) * S * 0.43, S / 2 + Math.sin(a) * S * 0.43); g.rotate(a + Math.PI / 2); g.fillText(String.fromCharCode(65 + i), 0, 0); g.restore(); }
  }
  return canvasTexture(c);
}
export function rafterCanvas(w = 2048, h = 68, color = 'rgba(232,226,210,0.9)') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const chars = [...CIPHER_PLAIN], step = w / (chars.length + 1);
  chars.forEach((ch, i) => { const k = cipherOf(ch); if (k >= 0) drawGlyph(g, k, step * (i + 1), h / 2, h * 0.8, color); });
  return c;
}
function rafterTex() { return canvasTexture(rafterCanvas()); }
function carveTex(word) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 86; const g = c.getContext('2d');
  g.font = '44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillText(word.split('').join(' '), 257, 45);
  g.fillStyle = 'rgba(20,12,6,0.85)'; g.fillText(word.split('').join(' '), 256, 43);
  return canvasTexture(c);
}
