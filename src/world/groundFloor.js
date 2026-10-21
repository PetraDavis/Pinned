// The rest of the ground floor, following the blueprint route (sheet A-102):
// hallway -> Specimen Study (lifespan puzzle) -> Grand Hall (stair A blocked, great
// mosaic, mirror M2) -> Dining Room -> Servants' Passage -> Kitchen (stair C down to
// the cellar, locked for now; back stair B sealed). Mirror M1 hangs in the hallway.
// Everything is built in the drawing room's group, in its local coordinates
// (x east, z south), so it shares the room zone, fog and colliders.
import * as THREE from 'three';
import { loadStep } from '../loadSteps.js';
import { gasLampFixture } from './fixtures.js';
import { buildLowerUpper } from './lowerUpper.js';
import { buildCatacombs } from './catacombs.js';
import { buildAttic } from './attic.js';
import { buildExtraRooms } from './extraRooms.js';
import { makeAvatar } from './avatar.js';
export { makeAvatar };
import { buildGlassWindow, cultGlassTexture } from './stainedGlass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';
import { makeSpecimenBox } from './drawerPuzzle.js';
import { SPECIES, drawSpecimenFit } from '../moths.js';

// lifespan of the adult moth, shortest first (as the leader's journal tells it)
// the dinner seating, in SEATS order: H, F, N1, N2, S1, S2
export const DINNER_SOLUTION = ['lubricipeda', 'calyptra', 'rubicunda', 'cecropia', 'caja', 'bisselliella'];
export const DINNER_START = ['caja', 'rubicunda', 'bisselliella', 'lubricipeda', 'calyptra', 'cecropia'];
export const SEATING_NOTE = [
  'A seating plan in the cook’s hand, for the Order’s last supper:',
  '“The pale one sits at the head, facing the window.',
  'The one who drinks blood sits at the foot, her back to it.',
  'The one who eats everything sits beside the blood-drinker, on the sideboard side.',
  'The giant sits across the table from the one who eats everything.',
  'The tiger will not sit beside the giant.',
  'The rosy one takes whatever chair is left.”',
  'Pencilled underneath: when they are seated, turn the plates.',
].join(' ');
export const LIFESPAN_ORDER = ['pavonia', 'polyphemus', 'vinula', 'elpenor', 'atropos'];
const START_ORDER = ['atropos', 'vinula', 'pavonia', 'elpenor', 'polyphemus'];
export const JOURNAL = [
  'The leader’s journal, in a small, upright hand:',
  '“The great hawk, Atropos, outlives them all: two months on the wing, and she will squeak if you hold her.',
  'The Emperor is gone almost before he has dried: three days, no mouth to feed, only the search.',
  'Our Elephant hawk takes the honeysuckle for three weeks. The Puss moth, a fortnight. The Polyphemus, a week, and not an hour longer.',
  'Hang them as they are given to us: the briefest life first. Only then does the house let us further in.”',
].join(' ');

const H_HALL = 3.6, H_STUDY = 3.8, H_GRAND = 7.5, H_DINE = 4.2, H_KITCH = 3.6;

export async function buildGroundFloor(group, local, { quality: q0 = 'high' } = {}) {
  let quality = q0;
  const r = rand(77);
  const wallpaper = (x, y, c = 0x8a8c90) => mat({ map: rep(tex.wallpaper, x, y), color: c });
  const wood = mat({ map: tex.wood, color: 0x6a5444 });
  const darkWood = mat({ map: tex.wood, color: 0x3e2c22 });
  const floorMat = (x, y, c = 0xa09888) => mat({ map: rep(tex.floor, x, y), color: c });
  const stone = mat({ map: rep(tex.stone, 2, 2), color: 0x77787a });
  const plaster = mat({ color: 0x3a3836 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });

  await loadStep('Building the ground floor');
  // ---- helpers ----
  const plane = (w, d, x, y, z, m, up = true) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    p.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; group.add(p); return p;
  };
  await loadStep('Building the ground floor');
  // a wall along x (at z) or along z (at x), from a to b, with door gaps [centre, width]
  await loadStep('Building the ground floor');
  // and a header above each gap
  function wall(axis, at, a, b, h, m, gaps = [], doorH = 2.5) {
    const segs = []; let s = a;
    for (const [c, w] of [...gaps].sort((p, q) => p[0] - q[0])) { segs.push([s, c - w / 2]); s = c + w / 2; }
    segs.push([s, b]);
    for (const [p, q] of segs) if (q - p > 0.01) {
      if (axis === 'x') box(group, q - p, h, 0.2, (p + q) / 2, h / 2, at, m, local, { cast: false });
      else box(group, 0.2, h, q - p, at, h / 2, (p + q) / 2, m, local, { cast: false });
    }
    for (const [c, w] of gaps) {
      if (axis === 'x') box(group, w, h - doorH, 0.2, c, doorH + (h - doorH) / 2, at, m, null, { cast: false });
      else box(group, 0.2, h - doorH, w, at, doorH + (h - doorH) / 2, c, m, null, { cast: false });
    }
  }
  function room(x0, x1, z0, z1, h, floorM, ceilM) {
    plane(x1 - x0, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, floorM);
    plane(x1 - x0, z1 - z0, (x0 + x1) / 2, h, (z0 + z1) / 2, ceilM, false);
  }
  function light(x, y, z, color, I, dist, flame = true) {
    const l = new THREE.PointLight(color, I, dist, 1.6); l.position.set(x, y, z); group.add(l);
    if (flame) gasFixture(x, y, z, flame);
    l.userData.base = I; l.userData.moths = flame; l.userData.sputter = 0; l.userData.dip = 0; lights.push(l); return l;
  }
  const lights = [];
  const gasFixture = (x, y, z, kind) => gasLampFixture(group, x, y, z, kind);
  const fillHall = new THREE.PointLight(0x8a7a90, 6, 30, 1.2); fillHall.position.set(27, 6.5, 1); group.add(fillHall);

  await loadStep('Building the ground floor');
  // ---- doors ----
  await loadStep('Building the ground floor');
  // A door leaf hinged at one side of a gap. `axis` is the wall direction.
  const doors = {};
  function door(id, axis, at, c, { w = 1.2, h = 2.5, locked = false, msg = '', openMsg = '', boarded = false, swing = 1, open = false } = {}) {
    const pivot = new THREE.Group();
    const leaf = new THREE.Group(); pivot.add(leaf);
    const dm = boarded ? darkWood : mat({ map: tex.wood, color: 0x7a5e4a });
    const lw = w - 0.006; leaf.position.x = 0.003; // 3 mm clearance each side
    const slab = new THREE.Mesh(new THREE.BoxGeometry(lw, h - 0.006, 0.05), dm); slab.position.set(lw / 2, (h - 0.006) / 2 + 0.003, 0); slab.castShadow = true; leaf.add(slab);
    for (const [py, ph] of [[0.65, 0.8], [1.75, 0.9]]) for (const px of [0.3, 0.85]) {
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.36 * (w / 1.2), ph, 0.012), dm); pnl.position.set(px * (w / 1.2), py, 0.035); leaf.add(pnl);
      const pnl2 = pnl.clone(); pnl2.position.z = -0.035; leaf.add(pnl2);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), brass); knob.position.set(lw - 0.1, 1.0, 0.06); leaf.add(knob);
    const knob2 = knob.clone(); knob2.position.z = -0.06; leaf.add(knob2);
    if (boarded) for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.16, 0.04), mat({ map: tex.plank, color: 0x8a7a66 }));
      b.position.set(w / 2 - 0.02, 0.6 + i * 0.7, 0.08 * swing); b.rotation.z = (r() - 0.5) * 0.5; leaf.add(b);
    }
    // frame
    const fr = new THREE.Group();
    // architrave on both faces, its inner edge flush with the opening, and linings
    // covering the wall thickness inside the opening
    for (const fz of [-0.115, 0.115]) for (const [fw, fh, fx, fy] of [[0.09, h + 0.09, -0.045, (h + 0.09) / 2], [0.09, h + 0.09, w + 0.045, (h + 0.09) / 2], [w + 0.18, 0.09, w / 2, h + 0.045]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.03), wood); f.position.set(fx, fy, fz); fr.add(f);
    }
    for (const [fw, fh, fx, fy] of [[0.012, h, -0.006, h / 2], [0.012, h, w + 0.006, h / 2], [w, 0.012, w / 2, h + 0.006]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.2), wood); f.position.set(fx, fy, 0); fr.add(f);
    }
    const holder = new THREE.Group(); holder.add(pivot, fr);
    if (axis === 'x') { holder.position.set(c - w / 2, 0, at); }
    else { holder.position.set(at, 0, c + w / 2); holder.rotation.y = Math.PI / 2; }
    group.add(holder);
    const col = axis === 'x' ? { minX: c - w / 2, maxX: c + w / 2, minZ: at - 0.1, maxZ: at + 0.1 } : { minX: at - 0.1, maxX: at + 0.1, minZ: c - w / 2, maxZ: c + w / 2 };
    col.door = id; local.push(col);
    const d = { id, locked, boarded, msg, openMsg, isOpen: false, anim: 0, pivot, col,
      pos: axis === 'x' ? new THREE.Vector3(c, 0, at) : new THREE.Vector3(at, 0, c),
      open(instant) { if (d.isOpen) return; d.isOpen = true; if (instant) { d.anim = 1; pivot.rotation.y = -swing * 1.65; } removeCollider(col); },
      reset() { d.isOpen = false; d.anim = 0; pivot.rotation.y = 0; addColliderBack(col); },
      update(dt) { if (d.isOpen && d.anim < 1) { d.anim = Math.min(1, d.anim + dt * 1.2); pivot.rotation.y = -swing * 1.65 * (1 - Math.pow(1 - d.anim, 3)); } },
    };
    doors[id] = d;
    if (open) d.open(true);
    return d;
  }
  await loadStep('Building the ground floor');
  // colliders are converted to world space by firstRoom.js; it hands us functions to edit them
  let removeCollider = () => {}, addColliderBack = () => {};

  await loadStep('Building the ground floor');
  // =============== hallway extras: mirror M1 ===============
  await loadStep('Building the ground floor');
  // (hallway itself is built in drawerPuzzle.js: x 7.3..20, z 1.4..4.8)
  door('study', 'x', 1.3, 15, { swing: -1, openMsg: 'The door gives with a long sigh. Camphor, and something sweeter.' });

  await loadStep('Building the ground floor');
  // =============== Specimen Study: x 11..20, z -5.4..1.2 ===============
  const SX0 = 11, SX1 = 20, SZ0 = -5.4, SZ1 = 1.2;
  room(SX0, SX1, SZ0, SZ1, H_STUDY, floorMat(3, 2, 0x8a7a6a), plaster);
  wall('x', SZ0 - 0.1, SX0 - 0.2, SX1, H_STUDY, wallpaper(4, 1, 0x7a6a5e));
  wall('z', SX0 - 0.1, SZ0, SZ1 + 0.2, H_STUDY, wallpaper(3, 1, 0x7a6a5e));
  await loadStep('Building the ground floor');
  // the hallway's north wall closes the south side; the grand hall's west wall the east side
  await loadStep('Building the ground floor');
  // wainscot
  for (const [w, x, z, ry] of [[SX1 - SX0, (SX0 + SX1) / 2, SZ0 + 0.02, 0], [SZ1 - SZ0, SX0 + 0.02, (SZ0 + SZ1) / 2, Math.PI / 2]])
    box(group, w, 1.0, 0.03, x, 0.5, z, darkWood, null, { cast: false, ry });
  await loadStep('Building the ground floor');
  // desk with the journal and a green-shaded lamp
  box(group, 1.8, 0.06, 0.9, 15.5, 0.78, -1.6, darkWood, local);
  for (const [dx, dz] of [[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]]) box(group, 0.06, 0.76, 0.06, 15.5 + dx, 0.38, -1.6 + dz, darkWood);
  const journalMesh = new THREE.Group();
  const jc = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.3), mat({ color: 0x4a1e1a, roughness: 0.7 })); journalMesh.add(jc);
  const jp = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), new THREE.MeshStandardMaterial({ map: journalTex(), roughness: 0.9 }));
  jp.rotation.x = -Math.PI / 2; jp.position.y = 0.017; journalMesh.add(jp);
  journalMesh.position.set(15.3, 0.83, -1.45); journalMesh.rotation.y = 0.15; group.add(journalMesh);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.14, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1e5a3a, emissive: 0x0a2a18, side: THREE.DoubleSide, roughness: 0.4 }));
  shade.position.set(16.1, 1.2, -1.85); group.add(shade);
  box(group, 0.03, 0.4, 0.03, 16.1, 1.0, -1.85, brass);
  light(16.1, 1.1, -1.85, 0xffd8a0, 4, 7, false);
  await loadStep('Building the ground floor');
  // chair
  { const sc = victorianChair(darkWood, mat({ map: tex.velvet || tex.fabric, color: 0x2a3a2a })); sc.position.set(15.5, 0, -0.7); group.add(sc); rect(local, 15.24, 15.76, -0.96, -0.44); }
  await loadStep('Building the ground floor');
  // glass-fronted cases of pinned specimens on the side walls
  const caseTex = tex.specimensA;
  for (const [x, z, ry] of [[SX0 + 0.05, -3.2, Math.PI / 2], [SX0 + 0.05, -0.6, Math.PI / 2], [SX1 - 0.05, -3.6, -Math.PI / 2]]) {
    const c = new THREE.Group(); c.position.set(x, 1.7, z); c.rotation.y = ry; group.add(c);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), darkWood); c.add(fr);
    const im = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.78), new THREE.MeshStandardMaterial({ map: caseTex, roughness: 0.8 })); im.position.z = 0.041; c.add(im);
  }
  await loadStep('Building the ground floor');
  // tall cabinet with drawers
  box(group, 1.4, 2.2, 0.5, 12.2, 1.1, SZ0 + 0.3, darkWood, local);
  await loadStep('Building the ground floor');
  // ---- the lifespan board: five cases hung on hooks on the north wall ----
  const board = new THREE.Group(); board.position.set(15.5, 0, SZ0 + 0.05); group.add(board);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.3, 0.05), mat({ map: tex.velvet || tex.fabric, color: 0x3a1a1e }));
  backing.position.set(0, 1.75, 0.03); board.add(backing);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), new THREE.MeshStandardMaterial({ map: plaqueTex('BREVIS · VITA · ALIS'), metalness: 0.6, roughness: 0.4 }));
  plaque.position.set(0, 2.52, 0.06); board.add(plaque);
  const slots = [-1.9, -0.95, 0, 0.95, 1.9];
  const hooks = slots.map(x => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), brass); h.rotation.x = Math.PI / 2; h.position.set(x, 1.98, 0.08); board.add(h); return h; });
  const cases = {};
  for (const key of LIFESPAN_ORDER) {
    const b = makeSpecimenBox(key); b.scale.setScalar(2.2); board.add(b);
    b.traverse(o => { if (o.isMesh) o.userData.lifeCase = key; });
    cases[key] = b;
  }
  const L = { order: [...START_ORDER], lifted: null, solved: false, shake: 0 };
  const placeCases = () => L.order.forEach((k, i) => { const b = cases[k]; b.position.set(slots[i], 1.72, 0.12 + (L.lifted === i ? 0.12 : 0)); });
  placeCases();

  await loadStep('Building the ground floor');
  // =============== Grand Hall: x 20.2..34, z -8..10 ===============
  const GX0 = 20.2, GX1 = 34, GZ0 = -8, GZ1 = 10;
  room(GX0, GX1, GZ0, GZ1, H_GRAND, mat({ map: rep(tex.slate || tex.stone, 6, 8), color: 0x6a6866 }), plaster);
  await loadStep('Building the ground floor');
  // west wall: study (z<1.2) and hallway door at z 3.1
  wall('z', 20.1, GZ0, GZ1, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[3.1, 1.2]]);
  wall('x', GZ0 - 0.1, GX0 - 0.2, GX1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[27, 1.4]]);
  wall('x', GZ1 + 0.1, GX0 - 0.2, GX1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[27, 2.4]], 3.2);
  await loadStep('Building the ground floor');
  // east wall: kitchen behind its north part, dining room door at z 6
  wall('z', GX1 + 0.1, -10.2, GZ1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[6, 1.4]]);
  door('grand', 'z', 20.1, 3.1, { locked: true, swing: -1, msg: 'Locked. There is no keyhole on this side, only a brass plate engraved with five little hooks.', openMsg: 'The door swings into a vast, cold hall.' });
  door('conservatory', 'x', GZ0 - 0.1, 27, { w: 1.4, locked: true, msg: 'The conservatory door is locked. Through the glass, leaves pressed flat against the panes, and something fluttering.' });
  door('front', 'x', GZ1 + 0.1, 26.4, { w: 1.2, h: 3.2, locked: true, boarded: true, swing: -1, msg: 'The front doors are boarded over from the inside. Someone wanted to keep people in.' });
  const front2 = door('front2', 'x', GZ1 + 0.1, 27.6, { w: 1.2, h: 3.2, locked: true, boarded: true, swing: 1, msg: 'The front doors are boarded over from the inside. Someone wanted to keep people in.' });
  front2.pivot.parent.scale.x = -1; front2.pivot.parent.position.x += 1.2;
  door('dining', 'z', GX1 + 0.1, 6, { w: 1.4, swing: 1, openMsg: 'A long room beyond, and a table laid for guests who never came.' });
  await loadStep('Building the ground floor');
  // wainscot and cornice
  for (const [w, x, z, ry] of [[GX1 - GX0, (GX0 + GX1) / 2, GZ0 + 0.02, 0], [GX1 - GX0, (GX0 + GX1) / 2, GZ1 - 0.02, 0], [GZ1 - GZ0, GX0 + 0.02, (GZ0 + GZ1) / 2, Math.PI / 2], [GZ1 - GZ0, GX1 - 0.02, (GZ0 + GZ1) / 2, Math.PI / 2]]) {
    box(group, w, 0.14, 0.12, x, H_GRAND - 0.07, z, wood, null, { cast: false, ry });
  }
  await loadStep('Building the ground floor');
  // stair A: rises north along the west side, its foot buried under the collapsed landing
  const stairX = 23.6, stepN = 16;
  for (let i = 0; i < stepN; i++) box(group, 2.2, 0.22 * (i + 1), 0.4, stairX, 0.11 * (i + 1), -1.2 - i * 0.4, wood, null, { cast: i % 4 === 0 });
  rect(local, stairX - 1.15, stairX + 1.15, -1.2 - stepN * 0.4, -0.9);
  for (const sx of [-1.15, 1.15]) for (let i = 0; i < stepN; i += 2) box(group, 0.04, 0.9, 0.04, stairX + sx, 0.22 * (i + 1) + 0.45, -1.2 - i * 0.4, darkWood, null, { cast: false });
  await loadStep('Building the ground floor');
  // the collapse: splintered beams, broken balusters and treads, plaster and lath,
  await loadStep('Building the ground floor');
  // broken brick and stone, and a skin of dust over the boards
  buildRubble(group, stairX, -1.6, 2.2, r);
  rect(local, stairX - 1.8, stairX + 1.8, -1.0, -0.4);
  await loadStep('Building the ground floor');
  // a worn carpet lies under the chandelier
  await loadStep('Building the ground floor');
  // a great Victorian carpet, faded and moth-eaten, rucked where something was dragged over it
  {
    const geo = new THREE.PlaneGeometry(6.4, 8.4, 64, 84); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); const ruck = Math.max(0, Math.cos((x * 0.9 + z * 0.4 - 1.2) * 2.4)) ** 6 * 0.05 * Math.max(0, 1 - Math.abs(z + 1) / 3.5); p.setY(k, 0.012 + ruck + Math.sin(x * 3.1 + z * 2.3) * 0.002); }
    geo.computeVertexNormals();
    const rug = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: carpetTex(), roughness: 1, alphaTest: 0.5, side: THREE.DoubleSide }));
    rug.position.set(28.5, 0, 3); rug.receiveShadow = true; group.add(rug);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.4, 64), brass); ring.rotation.x = -Math.PI / 2; ring.position.set(28.5, 0.013, 3); group.add(ring);
  await loadStep('Building the ground floor');
  // chandelier
  const ch = new THREE.Group(); ch.position.set(28.5, H_GRAND - 2.4, 3); group.add(ch);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), brass); chain.position.y = 1.2; ch.add(chain);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 32), brass); hoop.rotation.x = Math.PI / 2; ch.add(hoop);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), mat({ color: 0xe8e0c8 })); c.position.set(Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8); ch.add(c); }
  { const ch = light(28.5, H_GRAND - 2.6, 3, 0xffb878, 45, 26, false); ch.userData.creepy = true; ch.userData.moths = true; }
  light(20.5, 3.2, -4.5, 0xffa860, 8, 10, '+x').userData.creepy = true; light(33.7, 3.2, 8.5, 0xffa860, 8, 10, '-x'); // wall sconces
  await loadStep('Building the ground floor');
  // a stained-glass moth window over the boarded doors: the cult symbol in leaded glass,
  await loadStep('Building the ground floor');
  // lit from behind by the dusk, throwing coloured shafts and a patch of colour on the floor
  const glassWin = buildGlassWindow(group, {
    texture: cultGlassTexture(tex.mosaicFloor.userData.design, 512),
    center: new THREE.Vector3(27, 5.3, GZ1 - 0.02), right: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0),
    radius: 1.6, dir: new THREE.Vector3(1.5, -5.3, -7).normalize(), quality, tint: 0xffffff,
  });
  const moon = new THREE.SpotLight(0x8090c0, 18, 20, 0.5, 0.8, 1.2); moon.position.set(27, 5.3, GZ1 - 0.3); moon.target.position.set(28.5, 0, 3); group.add(moon, moon.target);
  await loadStep('Building the ground floor');
  // portraits and a long bench
  for (const z of [-5, 7.4]) { box(group, 0.06, 1.6, 1.2, GX0 + 0.04, 3.0, z, darkWood, null, { cast: false }); const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), mat({ map: tex.painting })); pic.position.set(GX0 + 0.08, 3.0, z); pic.rotation.y = Math.PI / 2; group.add(pic); }
  box(group, 0.5, 0.45, 2.4, GX1 - 0.5, 0.23, 0.5, darkWood, local);

  await loadStep('Building the ground floor');
  // =============== Dining Room: x 34.2..44, z 1..10 ===============
  const DX0 = 34.2, DX1 = 44, DZ0 = 1, DZ1 = 10;
  room(DX0, DX1, DZ0, DZ1, H_DINE, floorMat(4, 3, 0x9a8a78), plaster);
  wall('x', DZ0 - 0.1, DX0 - 0.1, DX1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48), [[42, 1.6]]);
  wall('x', DZ1 + 0.1, DX0 - 0.1, DX1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48));
  wall('z', DX1 + 0.1, DZ0 - 0.2, DZ1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48));
  await loadStep('Building the ground floor');
  // the last supper: a table for six, a specimen pinned to the back of each chair
  const tx = 38.6, tz = 5.5;
  box(group, 5.6, 0.08, 1.3, tx, 0.76, tz, darkWood, local);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.02, 1.4), mat({ map: tex.sheet || tex.fabric, color: 0xd8d0c0 })); cloth.position.set(tx, 0.81, tz); group.add(cloth);
  for (const dx of [-2.6, 2.6]) for (const dz of [-0.55, 0.55]) group.add(turnedLeg(tx + dx, tz + dz, 0.74, 0.05, darkWood));
  await loadStep('Building the ground floor');
  // window at the far end, which the head of the table faces
  const dwin = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x1a2032, emissive: 0x4a5a88, emissiveIntensity: 0.6, roughness: 0.2 }));
  dwin.position.set(DX1 - 0.01, 1.9, tz); dwin.rotation.y = -Math.PI / 2; group.add(dwin);
  for (const [w, h, y, dz] of [[0.08, 2.6, 1.9, -0.74], [0.08, 2.6, 1.9, 0.74], [1.56, 0.08, 3.14, 0], [1.56, 0.08, 0.66, 0], [1.4, 0.04, 1.9, 0], [0.04, 2.4, 1.9, 0]])
    box(group, 0.06, h, w === 0.08 || w === 0.04 ? w : w, DX1 - 0.03, y, tz + dz, darkWood, null, { cast: false });
  for (const dz of [-1.0, 1.0]) { const cur = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.5), mat({ map: tex.velvet || tex.fabric, color: 0x5a1e22 })); cur.position.set(DX1 - 0.1, 1.75, tz + dz); group.add(cur); }
  const SEATS = [
    { id: 'H', name: 'the head of the table', x: tx - 3.1, z: tz, ry: -Math.PI / 2, card: 'The Head' },
    { id: 'F', name: 'the foot of the table', x: tx + 3.1, z: tz, ry: Math.PI / 2, card: 'The Foot' },
    { id: 'N1', name: 'the north side, near the head', x: tx - 1.2, z: tz - 0.95, ry: Math.PI, card: 'North, by the head' },
    { id: 'N2', name: 'the north side, near the foot', x: tx + 1.2, z: tz - 0.95, ry: Math.PI, card: 'North, by the foot' },
    { id: 'S1', name: 'the sideboard side, near the head', x: tx - 1.2, z: tz + 0.95, ry: 0, card: 'Sideboard, by the head' },
    { id: 'S2', name: 'the sideboard side, near the foot', x: tx + 1.2, z: tz + 0.95, ry: 0, card: 'Sideboard, by the foot' },
  ];
  const DIGITS = { H: 'I · 1', N1: 'II · 8', S2: 'III · 8', F: 'IV · 7' };
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.3 });
  const dinnerBoxes = {};
  for (const k of DINNER_SOLUTION) { const b = makeSpecimenBox(k); b.scale.setScalar(1.3); dinnerBoxes[k] = b; }
  for (const [i, st] of SEATS.entries()) {
    // ry: the direction the sitter faces (toward the table)
    const ch = victorianChair(darkWood, mat({ map: tex.velvet || tex.fabric, color: 0x4a2a2a })); ch.position.set(st.x, 0, st.z); ch.rotation.y = st.ry + Math.PI; group.add(ch);
    rect(local, st.x - 0.26, st.x + 0.26, st.z - 0.26, st.z + 0.26);
    st.chair = ch; st.key = DINNER_START[i];
    // plate, with a place card, and something written underneath
    const fx = Math.sin(st.ry + Math.PI), fz = Math.cos(st.ry + Math.PI); // from chair toward the table
    const pl = new THREE.Group(); pl.position.set(st.x + fx * 0.62, 0.83, st.z + fz * 0.62); group.add(pl);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 24), plateMat); pl.add(disc);
    if (DIGITS[st.id]) { const under = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ map: plaqueLike(DIGITS[st.id]) })); under.rotation.x = Math.PI / 2; under.position.y = -0.0085; pl.add(under); }
    st.plate = pl; st.digit = DIGITS[st.id] || null; st.flipped = false; st.flip = 0;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshStandardMaterial({ map: plaqueLike(st.card, '#efe6cf', '#2a1c10'), side: THREE.DoubleSide }));
    card.position.set(st.x + fx * 0.42, 0.86, st.z + fz * 0.42); card.rotation.y = st.ry + Math.PI; card.rotation.x = -0.4; group.add(card);
    // approach point behind the chair
    st.pos = new THREE.Vector3(st.x - fx * 0.55, 0, st.z - fz * 0.55);
  }
  const placeDinner = () => SEATS.forEach(st => {
    for (const b of Object.values(dinnerBoxes)) if (b.parent === st.chair) st.chair.remove(b);
    if (st.key) { const b = dinnerBoxes[st.key]; b.position.set(0, 0.72, -0.27); b.rotation.set(0.06, Math.PI, 0); st.chair.add(b); }
  });
  placeDinner();
  const dinner = { seats: SEATS, solved: false, shake: 0,
    use(st, held) { const prev = st.key; st.key = held || null; placeDinner(); return prev; },
    correct() { return SEATS.every((st, i) => st.key === DINNER_SOLUTION[i]); },
    filled() { return SEATS.every(st => st.key); },
    // multiplayer: who sits where
    layout() { return SEATS.map(st => st.key || null); },
    setLayout(k) { if (!Array.isArray(k) || k.length !== SEATS.length || !k.every(x => x === null || dinnerBoxes[x])) return false; const seen = new Set(); SEATS.forEach((st, i) => { const x = k[i]; st.key = x && !seen.has(x) ? (seen.add(x), x) : null; }); placeDinner(); return true; },
    solve() { SEATS.forEach((st, i) => { st.key = DINNER_SOLUTION[i]; }); placeDinner(); dinner.solved = true; },
    rattle() { dinner.shake = 1.2; },
    reset() { SEATS.forEach((st, i) => { st.key = DINNER_START[i]; st.flipped = false; st.flip = 0; st.plate.rotation.x = 0; }); dinner.solved = false; placeDinner(); },
    update(dt, t) {
      if (dinner.shake > 0) { dinner.shake -= dt; SEATS.forEach((st, i) => { st.plate.position.y = 0.83 + Math.abs(Math.sin(t * 40 + i)) * 0.006 * Math.min(1, dinner.shake); st.plate.rotation.z = Math.sin(t * 33 + i * 2) * 0.03 * Math.min(1, dinner.shake); }); }
      SEATS.forEach(st => { if (st.flipped && st.flip < 1) { st.flip = Math.min(1, st.flip + dt * 2.5); st.plate.rotation.x = Math.PI * st.flip; st.plate.position.y = 0.83 + Math.sin(st.flip * Math.PI) * 0.12 + st.flip * 0.01; } });
    },
  };
  await loadStep('Building the ground floor');
  // the seating note, in the kitchen
  const noteMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: noteTex(), roughness: 0.9 }));
  noteMesh.rotation.x = -Math.PI / 2; noteMesh.rotation.z = 0.2; noteMesh.position.set(38.1, 0.905, -6.4); group.add(noteMesh);
  for (const dx of [-1.3, 1.3]) {
    const cd = new THREE.Group(); cd.position.set(tx + dx, 0.82, tz); group.add(cd);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.4, 10), brass); stem.position.y = 0.2; cd.add(stem);
    for (const cx of [-0.15, 0, 0.15]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), mat({ color: 0xe8e0c8 })); c.position.set(cx, 0.48, 0); cd.add(c); if (cx) gasFixture(tx + dx + cx, 1.39, tz, 'candle'); }
    light(tx + dx, 1.39, tz, 0xffa860, 10, 11, 'candle');
  }
  box(group, 2.2, 1.0, 0.55, 38.6, 0.5, DZ1 - 0.35, darkWood, local); // sideboard

  await loadStep('Building the ground floor');
  // =============== Servants' Passage: x 41.2..42.8, z -3..1 ===============
  room(41.2, 42.8, -3, 1, 3.0, floorMat(1, 2, 0x6a6058), plaster);
  wall('z', 41.1, -3, 1, 3.0, mat({ color: 0x6a645a }));
  wall('z', 42.9, -3, 1, 3.0, mat({ color: 0x6a645a }));
  light(41.5, 2.6, -2.2, 0xffa060, 1.6, 4, '+x').userData.creepy = true;
  await loadStep('Building the ground floor');
  // a ceiling joist has come down across the passage: crouch to get under it
  {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.24), darkWood);
    beam.position.set(42, 1.38, -1.2); beam.rotation.z = 0.07; beam.castShadow = true; group.add(beam);
    for (let i = 0; i < 5; i++) {
      const lath = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5 + (i % 3) * 0.15, 0.015), wood);
      lath.position.set(41.4 + i * 0.32, 1.95 + (i % 2) * 0.2, -1.05 - (i % 2) * 0.3); lath.rotation.z = (i - 2) * 0.25; group.add(lath);
    }
    local.push({ minX: 41.2, maxX: 42.8, minZ: -1.32, maxZ: -1.08, minY: 1.26 });
  }

  await loadStep('Building the ground floor');
  // =============== Kitchen: x 34.2..44, z -10..-3 ===============
  const KX0 = 34.2, KX1 = 44, KZ0 = -10, KZ1 = -3;
  room(KX0, KX1, KZ0, KZ1, H_KITCH, mat({ map: rep(tex.slate || tex.stone, 5, 4), color: 0x5a5856 }), plaster);
  const tile = mat({ map: rep(tex.wallpaper, 3, 1), color: 0x7a7a70, roughness: 0.8 });
  wall('x', KZ1 + 0.1, KX0 - 0.1, KX1 + 0.2, H_KITCH, tile, [[42, 1.6]]);
  wall('x', KZ0 - 0.1, KX0 - 0.1, KX1 + 0.2, H_KITCH, tile, [[36.6, 1.1], [39.4, 1.1]]);
  wall('z', KX1 + 0.1, KZ0 - 0.2, KZ1 + 0.2, H_KITCH, tile);
  door('stairC', 'x', KZ0 - 0.1, 36.6, { w: 1.1, locked: true, msg: 'A padlocked door. Cold air rises through the gap beneath it: stairs going down. DN CELLAR is chalked on the frame.' });
  door('stairB', 'x', KZ0 - 0.1, 39.4, { w: 1.1, locked: true, boarded: true, msg: 'The back stair. Nailed shut, and the nails are new.' });
  await loadStep('Building the ground floor');
  // the range
  const range = new THREE.Group(); range.position.set(KX1 - 0.5, 0, -6.5); group.add(range);
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.6, roughness: 0.5 });
  const rb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 2.4), iron); rb.position.y = 0.475; rb.castShadow = true; range.add(rb);
  for (const dz of [-0.6, 0.6]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x3a1004 })); o.position.set(-0.451, 0.45, dz); o.rotation.y = -Math.PI / 2; range.add(o); }
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 2.6), iron); hood.position.y = 2.6; range.add(hood);
  rect(local, KX1 - 1.0, KX1, -7.8, -5.2);
  light(KX1 - 1.1, 0.5, -6.5, 0xff5020, 2.2, 5, false); // embers
  await loadStep('Building the ground floor');
  // table, pans and shelves
  box(group, 2.4, 0.08, 1.0, 38.5, 0.86, -6.5, wood, local);
  for (const dx of [-1.1, 1.1]) for (const dz of [-0.42, 0.42]) box(group, 0.08, 0.84, 0.08, 38.5 + dx, 0.42, -6.5 + dz, wood);
  for (const y of [1.4, 1.9, 2.4]) box(group, 3.0, 0.04, 0.35, 38.0, y, KZ1 - 0.25, wood, null, { cast: false });
  for (let i = 0; i < 9; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), mat({ color: [0x6a5a3a, 0x4a5a6a, 0x8a7a5a][i % 3], roughness: 0.4 })); j.position.set(36.8 + i * 0.3, 1.52 + Math.floor(i / 3) * 0.5, KZ1 - 0.25); group.add(j); }
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.8, roughness: 0.4 })); p.position.set(KX1 - 0.06, 2.0, -9 + i * 0.4); p.rotation.z = Math.PI / 2; group.add(p); }
  light(38.5, 2.9, -6.5, 0xffb070, 9, 11, { pendant: H_KITCH }).userData.creepy = true;

  await loadStep('Building the ground floor');
  // =============== mirrors M1 (hallway) and M2 (grand hall) ===============
  await loadStep('Building the ground floor');
  // Each reflection shows the player a little more moth-like.
  const size = quality === 'xlow' ? 128 : quality === 'low' ? 256 : quality === 'medium' ? 512 : 1024;
  const avatars = [];
  const mirrors = [];
  function addMirror(m) {
    // the reflection's figure is built the first time you come near that mirror (a faster load)
    const i = mirrors.length, av = new THREE.Group(); av.visible = false; av.userData.anyFloor = true; group.add(av); avatars.push(av);
    const mg = new THREE.Group(); mg.position.copy(m.pos); mg.rotation.y = m.ry; group.add(mg);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(m.w + 0.16, m.h + 0.16, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a6a30, metalness: 0.8, roughness: 0.35 }));
    frame.position.z = -0.02; mg.add(frame);
    const ref = new Reflector(new THREE.PlaneGeometry(m.w, m.h), { textureWidth: size, textureHeight: Math.round(size * m.h / m.w), color: 0xc8c8c8, clipBias: 0.003 });
    ref.position.z = 0.006; mg.add(ref);
    // tarnish over the glass
    const tarnish = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), new THREE.MeshBasicMaterial({ map: tarnishTex(i), transparent: true, depthWrite: false }));
    tarnish.position.z = 0.008; mg.add(tarnish);
    const orig = ref.onBeforeRender, world = new THREE.Vector3();
    ref.onBeforeRender = (renderer, scene, camera) => {
      ref.getWorldPosition(world);
      if (world.distanceTo(camera.position) > 9) return; // too far to matter: keep the last image
      if (!av.children.length) av.add(makeAvatar(m.stage, { self: true }));
      av.visible = true; orig.call(ref, renderer, scene, camera); av.visible = false;
    };
    const out = { ...m, group: mg, avatar: av, world: m.pos.clone() }; mirrors.push(out); return out;
  }
  addMirror({ id: 'M1', pos: new THREE.Vector3(17.6, 1.7, 4.78), ry: Math.PI, w: 0.9, h: 1.5, stage: 1 });
  addMirror({ id: 'M2', pos: new THREE.Vector3(20.32, 2.0, -3.0), ry: Math.PI / 2, w: 1.3, h: 2.3, stage: 2 });

  await loadStep('Building the ground floor');
  // =============== the Cellar and the First Floor ===============
  const lu = await buildLowerUpper({ group, local, wall, room, plane, door, light, addMirror, doors, carpetTex, buildRubble, makeSpecimenBox });
  await loadStep('Building the ground floor');
  // =============== the Catacombs, under the cellar ===============
  const cat = await buildCatacombs({ group, local, light, door, doors });
  await loadStep('Building the ground floor');
  // =============== the Attic (see attic.js) ===============
  const attic = await buildAttic({ group, local, wall, plane, door, light, addMirror, doors });
  await loadStep('Building the ground floor');
  // =============== the rest of the blueprint's rooms (see extraRooms.js) ===============
  const extra = await buildExtraRooms({ group, local, wall, plane, door, light, doors });

  let hiss = 0; const tmpV = new THREE.Vector3();
  const api = {
    get hiss() { return hiss; },
    lu, cat, attic, extra, dinner, note: noteMesh, doors, mirrors, lights, cases: Object.values(cases), lifespan: L,
    journal: journalMesh,
    setQuality(q) { quality = q; glassWin.setQuality(q); },
    bindColliders(remove, add) { removeCollider = remove; addColliderBack = add; lu.bindColliders(remove, add); cat.bindColliders(remove, add); attic.bindColliders(remove, add); },
    // aim interaction for the lifespan board cases (main.js raycasts against these)
    pickables: Object.values(cases).flatMap(b => { const out = []; b.traverse(o => o.isMesh && out.push(o)); return out; }),
    caseAt(key) { return L.order.indexOf(key); },
    useCase(key) {
      const i = L.order.indexOf(key);
      if (L.lifted === null) { L.lifted = i; placeCases(); return 'lifted'; }
      if (L.lifted === i) { L.lifted = null; placeCases(); return 'replaced'; }
      const j = L.lifted; [L.order[i], L.order[j]] = [L.order[j], L.order[i]]; L.lifted = null; placeCases();
      return 'swapped';
    },
    // multiplayer: the order of the cases on the board (a lifted case is only lifted for you)
    setLifespanOrder(o) { if (!Array.isArray(o) || o.length !== L.order.length || [...o].sort().join() !== [...L.order].sort().join()) return false; L.order = [...o]; placeCases(); return true; },
    lifespanCorrect() { return L.order.every((k, i) => k === LIFESPAN_ORDER[i]); },
    solveLifespan() { L.order = [...LIFESPAN_ORDER]; L.lifted = null; L.solved = true; placeCases(); doors.grand.locked = false; },
    reset() {
      L.order = [...START_ORDER]; L.lifted = null; L.solved = false; placeCases();
      for (const d of Object.values(doors)) { d.reset(); }
      doors.grand.locked = true; dinner.reset(); lu.reset(); cat.reset(); attic.reset();
      for (const id of ['cWineEgg', 'fNurseryLeader', 'fLeaderBath', 'fBathLuna', 'fLeaderLinen']) doors[id].locked = true;
      extra.reset();
    },
    update(t, dt, camera) {
      glassWin.update(t);
      for (const d of Object.values(doors)) d.update(dt);
      dinner.update(dt, t);
      lu.update(t, dt); cat.update(t, dt); attic.update(t, dt);
      extra.update(t, dt, camera);
      // gas lights: a gentle waver; the creepier ones sputter, dip and now and then drop out
      hiss = 0;
      lights.forEach((l, i) => {
        const u = l.userData; let k = 0.92 + Math.sin(t * 6 + i * 2.1) * 0.05 + Math.sin(t * 11.3 + i) * 0.03;
        if (u.creepy && ((quality !== 'low' && quality !== 'xlow') || i % 2 === 0)) {
          if (u.sputter > 0) { u.sputter -= dt; k *= 0.35 + 0.5 * Math.abs(Math.sin(t * 47 + i)) * (Math.random() < 0.3 ? 0.2 : 1); }
          else if (Math.random() < dt * 0.25) u.sputter = 0.15 + Math.random() * 0.6;
          if (u.dip > 0) { u.dip -= dt; k *= 0.06; } else if (Math.random() < dt * 0.04) u.dip = 0.05 + Math.random() * 0.15;
          const d = l.position.distanceTo(tmpV.set(camera.position.x - 1000, camera.position.y, camera.position.z));
          hiss = Math.max(hiss, Math.max(0, 1 - d / 6) * (u.sputter > 0 ? 1 : 0.45));
        }
        l.intensity = u.base * k;
      });
      // reflections: the avatar stands where the player stands
      const yaw = Math.atan2(-camera.matrixWorld.elements[8], -camera.matrixWorld.elements[10]);
      for (const a of avatars) {
        a.position.set(camera.position.x - 1000, 0, camera.position.z);
        a.rotation.y = yaw;
      }
    },
  };
  return api;
}

// ---------- textures ----------
function journalTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 352; const g = c.getContext('2d');
  g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 512, 352);
  g.fillStyle = 'rgba(80,60,30,0.25)'; g.fillRect(254, 0, 4, 352);
  g.fillStyle = '#3a2a18'; g.font = 'italic 15px Georgia, serif';
  const lines = ['Atropos: two months', 'Emperor: three days', 'Elephant: three weeks', 'Puss: a fortnight', 'Polyphemus: a week', '', 'the briefest life first'];
  lines.forEach((l, i) => g.fillText(l, 22, 40 + i * 24));
  for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(60,40,20,0.35)'; g.fillRect(280, 30 + i * 24, 180 + Math.random() * 40, 1.5); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function plaqueTex(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#c8a458'); gr.addColorStop(1, '#6a4a1a');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#2a1c0a'; g.font = '30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tarnishTex(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const r = rand(seed + 5);
  const vg = g.createRadialGradient(128, 128, 60, 128, 128, 190); vg.addColorStop(0, 'rgba(40,34,24,0)'); vg.addColorStop(1, 'rgba(40,34,24,0.6)');
  g.fillStyle = vg; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(60,50,30,${r() * 0.25})`; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 8, 0, 7); g.fill(); }
  // powdery dust, like wing scales, smeared across the glass
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(210,200,180,${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- rubble ----------
function noisy(geo, amt, seed) {
  const r = rand(seed), p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]);
    const d = seen.get(key); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals(); return geo;
}
function dustTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(190,182,168,0.75)'); gr.addColorStop(0.6, 'rgba(170,160,146,0.35)'); gr.addColorStop(1, 'rgba(160,150,136,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) { const a = Math.random() * 6.28, d = Math.pow(Math.random(), 0.7) * 120; g.fillStyle = `rgba(${Math.random() < 0.5 ? '110,100,90' : '220,212,200'},${Math.random() * 0.5})`; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Faded red-brown Victorian carpet: border bands, a central medallion and a field of
// repeating motifs, worn paths, dust, frayed fringed ends and moth-eaten holes (alpha).
function carpetTex() {
  const W = 512, H = 672, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const R = rand(404);
  g.fillStyle = '#6a2a22'; g.fillRect(0, 0, W, H);
  // field pattern
  for (let y = 40; y < H - 40; y += 36) for (let x = 40; x < W - 40; x += 36) {
    g.save(); g.translate(x + ((y / 36) % 2) * 18, y); g.rotate(Math.PI / 4);
    g.fillStyle = '#8a4a2c'; g.fillRect(-7, -7, 14, 14); g.fillStyle = '#3a2420'; g.fillRect(-3, -3, 6, 6); g.restore();
  }
  // border bands
  const band = (i, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(i, i, W - i * 2, H - i * 2); };
  band(18, '#2e1c1a', 22); band(34, '#9a6a3a', 5); band(46, '#4a2a40', 8);
  for (let x = 30; x < W - 20; x += 20) { g.fillStyle = '#a8783e'; g.beginPath(); g.arc(x, 18, 4, 0, 7); g.arc(x, H - 18, 4, 0, 7); g.fill(); }
  // medallion
  g.save(); g.translate(W / 2, H / 2);
  for (const [rx, ry, col] of [[130, 170, '#3a2030'], [112, 150, '#9a6a3a'], [100, 136, '#7a2e26'], [60, 80, '#2e1c1a'], [44, 60, '#b08848']]) { g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = '#5a3a2a'; g.beginPath(); g.ellipse(0, 90, 10, 26, 0, 0, 7); g.fill(); }
  g.restore();
  // fading, a worn path, dust
  const fade = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.8); fade.addColorStop(0, 'rgba(160,130,110,0.1)'); fade.addColorStop(1, 'rgba(120,100,90,0.35)');
  g.fillStyle = fade; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(150,130,115,0.25)'; g.fillRect(W * 0.35, 0, W * 0.3, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${170 + R() * 50},${150 + R() * 40},${130 + R() * 30},${R() * 0.12})`; g.fillRect(R() * W, R() * H, 2, 2); }
  // fringe and frayed ends
  g.clearRect(0, 0, W, 6); g.clearRect(0, H - 6, W, 6);
  for (let x = 0; x < W; x += 3) { const l = 4 + R() * 9; g.fillStyle = '#c8b898'; g.fillRect(x, 6 - 0, 1.5, -Math.min(6, l)); g.fillRect(x, H - 6, 1.5, Math.min(6, l)); }
  // moth-eaten holes and threadbare patches
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) { const x = 30 + R() * (W - 60), y = 30 + R() * (H - 60), rr = 2 + R() * (i < 4 ? 14 : 6); g.beginPath(); for (let a = 0; a < 7; a += 0.6) g.lineTo(x + Math.cos(a) * rr * (0.6 + R() * 0.6), y + Math.sin(a) * rr * (0.6 + R() * 0.6)); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildRubble(group, cx, cz, spread, r) {
  const woodMat = mat({ map: tex.wood, color: 0x6a5240 });
  const oldWood = mat({ map: tex.wood, color: 0x4a382a });
  const plasterMat = mat({ map: rep(tex.stone, 0.4, 0.4), color: 0xc8c0b0, roughness: 1 });
  const brickMat = mat({ map: rep(tex.stone, 0.3, 0.3), color: 0x8a4a36, roughness: 1 });
  const stoneMat = mat({ map: rep(tex.stone, 0.5, 0.5), color: 0x8a8884, roughness: 0.95 });
  // a heap of broken plaster, brick dust and debris that everything else rests on
  const hcz = cz - spread * 0.25, sig = spread * 0.7, HH = 0.8;
  const nz2 = (x, z) => Math.sin(x * 7.1 + z * 3.3) * 0.04 + Math.sin(x * 13.7 - z * 11.1) * 0.025 + Math.sin(x * 29 + z * 23) * 0.012;
  const heapY = (x, z) => { const d2 = ((x - cx) ** 2 + (z - hcz) ** 2) / (sig * sig); return Math.max(0, HH * Math.exp(-d2) * (1 + nz2(x, z) * 4) - 0.03); };
  {
    const W = spread * 3.2, geo = new THREE.PlaneGeometry(W, W, 48, 48); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, heapY(p.getX(k) + cx, p.getZ(k) + hcz) + 0.005);
    geo.computeVertexNormals();
    const heap = new THREE.Mesh(geo, mat({ map: rep(tex.stone, 1.5, 1.5), color: 0x9a9088, roughness: 1 })); heap.position.set(cx, 0, hcz); heap.receiveShadow = true; heap.castShadow = true; group.add(heap);
  }
  // many small chips and fragments scattered over and around the heap
  {
    const N = 260, chip = new THREE.InstancedMesh(noisy(new THREE.IcosahedronGeometry(0.05, 1), 0.035, 9), stoneMat, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const chipB = new THREE.InstancedMesh(noisy(new THREE.BoxGeometry(0.1, 0.05, 0.07, 2, 1, 2), 0.025, 8), brickMat, N / 2);
    for (let i = 0; i < N * 1.5; i++) {
      const a = r() * 6.28, d = Math.pow(r(), 1.1) * spread * 1.2, x = cx + Math.cos(a) * d, z = hcz + Math.sin(a) * d;
      e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); const k = 0.4 + r() * 1.6; sc.set(k, k * (0.5 + r() * 0.5), k);
      m4.compose(v.set(x, heapY(x, z) + 0.02 * k, z), q, sc);
      if (i < N) chip.setMatrixAt(i, m4); else chipB.setMatrixAt(i - N, m4);
    }
    chip.castShadow = chipB.castShadow = true; chip.receiveShadow = chipB.receiveShadow = true; group.add(chip, chipB);
  }
  const add = (m, x, y, z, rx, ry, rz) => { y = Math.min(y, 0.06) + heapY(x, z); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  // splintered beams: long timbers with ragged, split ends
  for (let i = 0; i < 4; i++) {
    const L = 2.2 + r() * 2, geo = new THREE.BoxGeometry(L, 0.24, 0.2, 24, 3, 3), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), e = Math.abs(x) / (L / 2); if (e > 0.82) { const f = (e - 0.82) / 0.18; p.setX(k, x - Math.sign(x) * r() * 0.25 * f); p.setY(k, p.getY(k) * (1 - 0.6 * f * r())); p.setZ(k, p.getZ(k) * (1 - 0.6 * f * r())); } }
    geo.computeVertexNormals();
    add(new THREE.Mesh(geo, i % 2 ? woodMat : oldWood), cx + (r() - 0.5) * spread, 0.2 + i * 0.35 + r() * 0.2, cz - r() * spread, (r() - 0.5) * 0.3, r() * 3, (r() - 0.5) * 0.7);
  }
  // broken treads and turned balusters
  for (let i = 0; i < 6; i++) {
    const geo = noisy(new THREE.BoxGeometry(0.9 + r() * 0.8, 0.04, 0.3, 8, 1, 2), 0.02, 50 + i);
    add(new THREE.Mesh(geo, woodMat), cx + (r() - 0.5) * spread, 0.05 + r() * 0.5, cz - r() * spread * 0.8, (r() - 0.5) * 1.2, r() * 3, (r() - 0.5) * 0.8);
  }
  const prof = [[0.0, 0], [0.03, 0], [0.03, 0.04], [0.022, 0.08], [0.03, 0.15], [0.018, 0.3], [0.026, 0.42], [0.02, 0.5], [0.0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y));
  for (let i = 0; i < 9; i++) {
    const cut = 0.5 + r() * 0.5, g2 = new THREE.LatheGeometry(prof.map(v => new THREE.Vector2(v.x, v.y * cut)), 10);
    add(new THREE.Mesh(g2, oldWood), cx + (r() - 0.5) * spread * 1.2, 0.03 + r() * 0.3, cz + 0.3 - r() * spread, Math.PI / 2 + (r() - 0.5) * 0.6, r() * 3, (r() - 0.5));
  }
  // plaster chunks with lath still nailed to their backs
  for (let i = 0; i < 16; i++) {
    const s = 0.12 + r() * 0.3, geo = noisy(new THREE.BoxGeometry(s, 0.03 + r() * 0.04, s * (0.6 + r() * 0.6), 4, 1, 4), s * 0.25, 70 + i);
    const ch = add(new THREE.Mesh(geo, plasterMat), cx + (r() - 0.5) * spread * 1.4, 0.03 + r() * 0.4, cz + 0.5 - r() * spread * 1.2, (r() - 0.5) * 1.4, r() * 3, (r() - 0.5) * 1.4);
    if (r() < 0.6) for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(s * 1.3, 0.008, 0.025), oldWood); l.position.set((r() - 0.5) * 0.05, -0.03, (k - 1) * 0.05); l.rotation.y = (r() - 0.5) * 0.2; ch.add(l); }
  }
  // loose laths
  for (let i = 0; i < 14; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.5 + r() * 0.6, 0.008, 0.028), oldWood), cx + (r() - 0.5) * spread * 1.4, 0.01 + r() * 0.2, cz + 0.4 - r() * spread * 1.2, (r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
  // broken brick and stone: irregular, chipped pieces
  for (let i = 0; i < 22; i++) {
    const brick = r() < 0.55, geo = brick ? noisy(new THREE.BoxGeometry(0.11 + r() * 0.1, 0.065, 0.1, 2, 1, 2), 0.02, 90 + i) : noisy(new THREE.IcosahedronGeometry(0.06 + r() * 0.12, 1), 0.05, 120 + i);
    if (!brick) geo.scale(1, 0.6, 1);
    add(new THREE.Mesh(geo, brick ? brickMat : stoneMat), cx + (r() - 0.5) * spread * 1.6, 0.04 + r() * 0.15, cz + 0.6 - r() * spread * 1.3, r() * 3, r() * 3, r() * 3);
  }
  // dust and grit spread across the floor
  const dust = new THREE.Mesh(new THREE.PlaneGeometry(spread * 2.6, spread * 2.2), new THREE.MeshStandardMaterial({ map: dustTex(), transparent: true, depthWrite: false, roughness: 1 }));
  dust.rotation.x = -Math.PI / 2; dust.position.set(cx, 0.015, cz + 0.2); dust.renderOrder = 1; group.add(dust);
  const N = 400, grit = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.012, 0), plasterMat, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) { const a = r() * 6.28, d = Math.pow(r(), 0.6) * spread * 1.2; e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); const sc = 0.5 + r() * 1.8; m4.compose(new THREE.Vector3(cx + Math.cos(a) * d, 0.012, cz + 0.2 + Math.sin(a) * d * 0.8), q, new THREE.Vector3(sc, sc, sc)); grit.setMatrixAt(i, m4); }
  group.add(grit);
}

// ---------- furniture ----------
export function turnedLeg(x, z, h, rad, m) {
  const pr = [[0, 0], [rad * 0.7, 0], [rad * 0.8, h * 0.06], [rad * 0.55, h * 0.12], [rad * 0.9, h * 0.2], [rad * 0.6, h * 0.3], [rad * 0.5, h * 0.6], [rad * 0.75, h * 0.72], [rad * 0.55, h * 0.8], [rad, h * 0.84], [rad, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b));
  const l = new THREE.Mesh(new THREE.LatheGeometry(pr, 12), m); l.position.set(x, 0, z); l.castShadow = true; return l;
}
// A Victorian dining chair facing +z: turned front legs, raked back legs, stretchers,
// an upholstered seat and a carved back. The back is at -z.
export function victorianChair(wood, cloth) {
  const c = new THREE.Group();
  const seatH = 0.46, w = 0.46, d = 0.44;
  for (const sx of [-1, 1]) {
    c.add(turnedLeg(sx * (w / 2 - 0.035), d / 2 - 0.035, seatH - 0.03, 0.022, wood));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.035), wood); back.position.set(sx * (w / 2 - 0.03), 0.5, -d / 2 + 0.02); back.rotation.x = -0.06; back.castShadow = true; c.add(back);
  }
  const rail = (len, x, y, z, ry, th = 0.02) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(th / 2, th / 2, len, 8), wood); m.rotation.z = Math.PI / 2; m.rotation.y = ry; m.position.set(x, y, z); c.add(m); };
  rail(w - 0.06, 0, 0.14, d / 2 - 0.035, 0); rail(w - 0.06, 0, 0.14, -d / 2 + 0.03, 0);         // front and back stretchers
  rail(d - 0.06, -(w / 2 - 0.035), 0.12, 0, Math.PI / 2); rail(d - 0.06, (w / 2 - 0.035), 0.12, 0, Math.PI / 2); // side stretchers
  rail(w - 0.04, 0, 0.12, 0, 0, 0.016);                                                                   // H-stretcher
  const apron = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), wood); apron.position.y = seatH - 0.05; c.add(apron);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.06, d + 0.02), cloth); seat.position.y = seatH; seat.castShadow = true; c.add(seat);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.08, 0.04), wood); top.position.set(0, 0.97, -d / 2 + 0.0); c.add(top);
  const splat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.42, 0.02), wood); splat.position.set(0, 0.7, -d / 2 + 0.02); c.add(splat);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.05, 0.03), wood); mid.position.set(0, 0.5, -d / 2 + 0.02); c.add(mid);
  c.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return c;
}
function plaqueLike(text, bg = '#d8d0c0', fg = '#3a2a18') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 128); g.strokeStyle = 'rgba(80,60,30,0.5)'; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let px = 40; g.font = `italic ${px}px Georgia, serif`; const w = g.measureText(text).width; if (w > 230) { px *= 230 / w; g.font = `italic ${px}px Georgia, serif`; }
  g.fillText(text, 128, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noteTex() {
  const c = document.createElement('canvas'); c.width = 384; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#e4d8bc'; g.fillRect(0, 0, 384, 512);
  // a little drawing of the table: head by the left, window on the right
  g.strokeStyle = '#4a3a28'; g.lineWidth = 2; g.strokeRect(92, 60, 200, 70);
  g.fillStyle = '#4a3a28'; g.font = 'italic 16px Georgia, serif';
  g.fillText('head', 40, 100); g.fillText('foot', 304, 100); g.fillText('window ⟶', 290, 40); g.fillText('sideboard', 160, 168);
  g.font = 'italic 15px Georgia, serif';
  ['The pale one at the head,', 'facing the window.', 'Blood-drinker at the foot.', 'The one who eats everything', 'beside her, sideboard side.', 'The giant across from him.', 'The tiger not beside the giant.', 'The rosy one: what is left.', '', '...then turn the plates.'].forEach((l, i) => g.fillText(l, 30, 220 + i * 26));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
