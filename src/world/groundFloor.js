// The rest of the ground floor, following the blueprint route (sheet A-102):
// hallway -> Specimen Study (lifespan puzzle) -> Grand Hall (stair A blocked, great
// mosaic, mirror M2) -> Dining Room -> Servants' Passage -> Kitchen (stair C down to
// the cellar, locked for now; back stair B sealed). Mirror M1 hangs in the hallway.
// Everything is built in the drawing room's group, in its local coordinates
// (x east, z south), so it shares the room zone, fog and colliders.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';
import { makeSpecimenBox } from './drawerPuzzle.js';
import { SPECIES, drawSpecimenFit } from '../moths.js';

// lifespan of the adult moth, shortest first (as the leader's journal tells it)
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

export function buildGroundFloor(group, local, { quality = 'high' } = {}) {
  const r = rand(77);
  const wallpaper = (x, y, c = 0x8a8c90) => mat({ map: rep(tex.wallpaper, x, y), color: c });
  const wood = mat({ map: tex.wood, color: 0x6a5444 });
  const darkWood = mat({ map: tex.wood, color: 0x3e2c22 });
  const floorMat = (x, y, c = 0xa09888) => mat({ map: rep(tex.floor, x, y), color: c });
  const stone = mat({ map: rep(tex.stone, 2, 2), color: 0x77787a });
  const plaster = mat({ color: 0x3a3836 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });

  // ---- helpers ----
  const plane = (w, d, x, y, z, m, up = true) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
    p.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; p.position.set(x, y, z); p.receiveShadow = true; group.add(p); return p;
  };
  // a wall along x (at z) or along z (at x), from a to b, with door gaps [centre, width]
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
    if (flame) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc080 })); g.position.copy(l.position); group.add(g); }
    l.userData.base = I; lights.push(l); return l;
  }
  const lights = [];
  const fillHall = new THREE.PointLight(0x8a7a90, 6, 30, 1.2); fillHall.position.set(27, 6.5, 1); group.add(fillHall);

  // ---- doors ----
  // A door leaf hinged at one side of a gap. `axis` is the wall direction.
  const doors = {};
  function door(id, axis, at, c, { w = 1.2, h = 2.5, locked = false, msg = '', openMsg = '', boarded = false, swing = 1, open = false } = {}) {
    const pivot = new THREE.Group();
    const leaf = new THREE.Group(); pivot.add(leaf);
    const dm = boarded ? darkWood : mat({ map: tex.wood, color: 0x7a5e4a });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h - 0.02, 0.06), dm); slab.position.set((w - 0.04) / 2, h / 2, 0); slab.castShadow = true; leaf.add(slab);
    for (const [py, ph] of [[0.65, 0.8], [1.75, 0.9]]) for (const px of [0.3, 0.85]) {
      const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.36 * (w / 1.2), ph, 0.012), dm); pnl.position.set(px * (w / 1.2), py, 0.035); leaf.add(pnl);
      const pnl2 = pnl.clone(); pnl2.position.z = -0.035; leaf.add(pnl2);
    }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), brass); knob.position.set(w - 0.14, 1.0, 0.06); leaf.add(knob);
    const knob2 = knob.clone(); knob2.position.z = -0.06; leaf.add(knob2);
    if (boarded) for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.16, 0.04), mat({ map: tex.plank, color: 0x8a7a66 }));
      b.position.set(w / 2 - 0.02, 0.6 + i * 0.7, 0.08 * swing); b.rotation.z = (r() - 0.5) * 0.5; leaf.add(b);
    }
    // frame
    const fr = new THREE.Group();
    for (const [fw, fh, fx, fy] of [[0.1, h + 0.1, -0.05, h / 2], [0.1, h + 0.1, w + 0.05, h / 2], [w + 0.2, 0.1, w / 2, h + 0.05]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.26), wood); f.position.set(fx, fy, 0); fr.add(f);
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
  // colliders are converted to world space by firstRoom.js; it hands us functions to edit them
  let removeCollider = () => {}, addColliderBack = () => {};

  // =============== hallway extras: mirror M1 ===============
  // (hallway itself is built in drawerPuzzle.js: x 7.3..20, z 1.4..4.8)
  door('study', 'x', 1.3, 15, { swing: -1, openMsg: 'The door gives with a long sigh. Camphor, and something sweeter.' });

  // =============== Specimen Study: x 11..20, z -5.4..1.2 ===============
  const SX0 = 11, SX1 = 20, SZ0 = -5.4, SZ1 = 1.2;
  room(SX0, SX1, SZ0, SZ1, H_STUDY, floorMat(3, 2, 0x8a7a6a), plaster);
  wall('x', SZ0 - 0.1, SX0 - 0.2, SX1, H_STUDY, wallpaper(4, 1, 0x7a6a5e));
  wall('z', SX0 - 0.1, SZ0, SZ1 + 0.2, H_STUDY, wallpaper(3, 1, 0x7a6a5e));
  // the hallway's north wall closes the south side; the grand hall's west wall the east side
  // wainscot
  for (const [w, x, z, ry] of [[SX1 - SX0, (SX0 + SX1) / 2, SZ0 + 0.02, 0], [SZ1 - SZ0, SX0 + 0.02, (SZ0 + SZ1) / 2, Math.PI / 2]])
    box(group, w, 1.0, 0.03, x, 0.5, z, darkWood, null, { cast: false, ry });
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
  // chair
  box(group, 0.5, 0.06, 0.5, 15.5, 0.48, -0.75, darkWood, local);
  box(group, 0.5, 0.6, 0.05, 15.5, 0.8, -0.5, darkWood);
  // glass-fronted cases of pinned specimens on the side walls
  const caseTex = tex.specimensA;
  for (const [x, z, ry] of [[SX0 + 0.05, -3.2, Math.PI / 2], [SX0 + 0.05, -0.6, Math.PI / 2], [SX1 - 0.05, -3.6, -Math.PI / 2]]) {
    const c = new THREE.Group(); c.position.set(x, 1.7, z); c.rotation.y = ry; group.add(c);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), darkWood); c.add(fr);
    const im = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.78), new THREE.MeshStandardMaterial({ map: caseTex, roughness: 0.8 })); im.position.z = 0.041; c.add(im);
  }
  // tall cabinet with drawers
  box(group, 1.4, 2.2, 0.5, 12.2, 1.1, SZ0 + 0.3, darkWood, local);
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

  // =============== Grand Hall: x 20.2..34, z -8..10 ===============
  const GX0 = 20.2, GX1 = 34, GZ0 = -8, GZ1 = 10;
  room(GX0, GX1, GZ0, GZ1, H_GRAND, mat({ map: rep(tex.slate || tex.stone, 6, 8), color: 0x6a6866 }), plaster);
  // west wall: study (z<1.2) and hallway door at z 3.1
  wall('z', 20.1, GZ0, GZ1, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[3.1, 1.2]]);
  wall('x', GZ0 - 0.1, GX0 - 0.2, GX1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[27, 1.4]]);
  wall('x', GZ1 + 0.1, GX0 - 0.2, GX1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[27, 2.4]], 3.2);
  // east wall: kitchen behind its north part, dining room door at z 6
  wall('z', GX1 + 0.1, -10.2, GZ1 + 0.2, H_GRAND, wallpaper(5, 1.6, 0x6a6c72), [[6, 1.4]]);
  door('grand', 'z', 20.1, 3.1, { locked: true, swing: -1, msg: 'Locked. There is no keyhole on this side, only a brass plate engraved with five little hooks.', openMsg: 'The door swings into a vast, cold hall.' });
  door('conservatory', 'x', GZ0 - 0.1, 27, { w: 1.4, locked: true, msg: 'The conservatory door is locked. Through the glass, leaves pressed flat against the panes, and something fluttering.' });
  door('front', 'x', GZ1 + 0.1, 26.4, { w: 1.2, h: 3.2, locked: true, boarded: true, swing: -1, msg: 'The front doors are boarded over from the inside. Someone wanted to keep people in.' });
  const front2 = door('front2', 'x', GZ1 + 0.1, 27.6, { w: 1.2, h: 3.2, locked: true, boarded: true, swing: 1, msg: 'The front doors are boarded over from the inside. Someone wanted to keep people in.' });
  front2.pivot.parent.scale.x = -1; front2.pivot.parent.position.x += 1.2;
  door('dining', 'z', GX1 + 0.1, 6, { w: 1.4, swing: 1, openMsg: 'A long room beyond, and a table laid for guests who never came.' });
  // wainscot and cornice
  for (const [w, x, z, ry] of [[GX1 - GX0, (GX0 + GX1) / 2, GZ0 + 0.02, 0], [GX1 - GX0, (GX0 + GX1) / 2, GZ1 - 0.02, 0], [GZ1 - GZ0, GX0 + 0.02, (GZ0 + GZ1) / 2, Math.PI / 2], [GZ1 - GZ0, GX1 - 0.02, (GZ0 + GZ1) / 2, Math.PI / 2]]) {
    box(group, w, 0.14, 0.12, x, H_GRAND - 0.07, z, wood, null, { cast: false, ry });
  }
  // stair A: rises north along the west side, its foot buried under the collapsed landing
  const stairX = 23.6, stepN = 16;
  for (let i = 0; i < stepN; i++) box(group, 2.2, 0.22 * (i + 1), 0.4, stairX, 0.11 * (i + 1), -1.2 - i * 0.4, wood, null, { cast: i % 4 === 0 });
  rect(local, stairX - 1.15, stairX + 1.15, -1.2 - stepN * 0.4, -0.9);
  for (const sx of [-1.15, 1.15]) for (let i = 0; i < stepN; i += 2) box(group, 0.04, 0.9, 0.04, stairX + sx, 0.22 * (i + 1) + 0.45, -1.2 - i * 0.4, darkWood, null, { cast: false });
  // the collapse: fallen beams, a broken banister and plaster across the lower flight
  const beams = [[stairX - 0.3, 0.7, -1.4, 0.5, 0.9], [stairX + 0.4, 1.2, -2.2, -0.4, 0.5], [stairX, 1.8, -3.0, 0.2, -0.7]];
  for (const [x, y, z, rz, ry] of beams) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 0.32), darkWood); b.position.set(x, y, z); b.rotation.set(0.1, ry, rz); b.castShadow = true; group.add(b);
  }
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2 + r() * 0.5, 0.05 + r() * 0.1, 0.2 + r() * 0.5), plaster.clone());
    p.material.color.setHex(0x8a8680); p.position.set(stairX + (r() - 0.5) * 3, 0.05 + r() * 0.5, -0.6 - r() * 2.2); p.rotation.set(r(), r() * 3, r()); group.add(p);
  }
  rect(local, stairX - 1.8, stairX + 1.8, -1.0, -0.4);
  // the great moth mosaic set into the floor under the chandelier
  const gm = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), mat({ map: tex.mosaicFloor, roughness: 0.5 }));
  gm.rotation.x = -Math.PI / 2; gm.position.set(28.5, 0.012, 3); gm.receiveShadow = true; group.add(gm);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.4, 64), brass); ring.rotation.x = -Math.PI / 2; ring.position.set(28.5, 0.013, 3); group.add(ring);
  // chandelier
  const ch = new THREE.Group(); ch.position.set(28.5, H_GRAND - 2.4, 3); group.add(ch);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), brass); chain.position.y = 1.2; ch.add(chain);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 32), brass); hoop.rotation.x = Math.PI / 2; ch.add(hoop);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), mat({ color: 0xe8e0c8 })); c.position.set(Math.cos(a) * 0.8, 0.1, Math.sin(a) * 0.8); ch.add(c); }
  light(28.5, H_GRAND - 2.6, 3, 0xffb878, 45, 26, false);
  light(22, 3.2, -4.5, 0xffa860, 8, 10); light(32.5, 3.2, 8.5, 0xffa860, 8, 10); // wall sconces
  // a moonlit window above the boarded doors
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x3a4468 })); win.position.set(27, 5.2, GZ1 - 0.01); win.rotation.y = Math.PI; group.add(win);
  const moon = new THREE.SpotLight(0x8090c0, 18, 20, 0.5, 0.8, 1.2); moon.position.set(27, 5.2, GZ1 - 0.3); moon.target.position.set(28, 0, 3); group.add(moon, moon.target);
  // portraits and a long bench
  for (const z of [-5, 7.4]) { box(group, 0.06, 1.6, 1.2, GX0 + 0.04, 3.0, z, darkWood, null, { cast: false }); const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), mat({ map: tex.painting })); pic.position.set(GX0 + 0.08, 3.0, z); pic.rotation.y = Math.PI / 2; group.add(pic); }
  box(group, 0.5, 0.45, 2.4, GX1 - 0.5, 0.23, 0.5, darkWood, local);

  // =============== Dining Room: x 34.2..44, z 1..10 ===============
  const DX0 = 34.2, DX1 = 44, DZ0 = 1, DZ1 = 10;
  room(DX0, DX1, DZ0, DZ1, H_DINE, floorMat(4, 3, 0x9a8a78), plaster);
  wall('x', DZ0 - 0.1, DX0 - 0.1, DX1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48), [[42, 1.6]]);
  wall('x', DZ1 + 0.1, DX0 - 0.1, DX1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48));
  wall('z', DX1 + 0.1, DZ0 - 0.2, DZ1 + 0.2, H_DINE, wallpaper(4, 1, 0x6e4a48));
  // table laid for twelve
  const tx = 38.6, tz = 5.5;
  box(group, 5.6, 0.08, 1.3, tx, 0.76, tz, darkWood, local);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.02, 1.4), mat({ map: tex.sheet || tex.fabric, color: 0xd8d0c0 })); cloth.position.set(tx, 0.81, tz); group.add(cloth);
  for (const dx of [-2.6, 2.6]) for (const dz of [-0.55, 0.55]) box(group, 0.08, 0.74, 0.08, tx + dx, 0.37, tz + dz, darkWood);
  const plate = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.3 });
  for (let i = 0; i < 12; i++) {
    const side = i < 6 ? -1 : 1, k = i % 6, x = tx - 2.2 + k * 0.88, z = tz + side * 0.45;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.015, 20), plate); p.position.set(x, 0.83, z); group.add(p);
    // a dead moth on some plates
    if (r() < 0.4) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 3; m.position.set(x, 0.84, z); group.add(m); }
    const seatZ = tz + side * 1.0;
    box(group, 0.45, 0.05, 0.45, x, 0.46, seatZ, darkWood, local);
    box(group, 0.45, 0.7, 0.05, x, 0.8, seatZ + side * 0.21, darkWood, null, { cast: false });
  }
  for (const dx of [-1.3, 1.3]) {
    const cd = new THREE.Group(); cd.position.set(tx + dx, 0.82, tz); group.add(cd);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.4, 10), brass); stem.position.y = 0.2; cd.add(stem);
    for (const cx of [-0.15, 0, 0.15]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), mat({ color: 0xe8e0c8 })); c.position.set(cx, 0.48, 0); cd.add(c); }
    light(tx + dx, 1.45, tz, 0xffa860, 10, 11);
  }
  box(group, 2.2, 1.0, 0.55, 38.6, 0.5, DZ1 - 0.35, darkWood, local); // sideboard

  // =============== Servants' Passage: x 41.2..42.8, z -3..1 ===============
  room(41.2, 42.8, -3, 1, 3.0, floorMat(1, 2, 0x6a6058), plaster);
  wall('z', 41.1, -3, 1, 3.0, mat({ color: 0x6a645a }));
  wall('z', 42.9, -3, 1, 3.0, mat({ color: 0x6a645a }));
  light(42, 2.6, -1, 0xffa060, 1.6, 4);

  // =============== Kitchen: x 34.2..44, z -10..-3 ===============
  const KX0 = 34.2, KX1 = 44, KZ0 = -10, KZ1 = -3;
  room(KX0, KX1, KZ0, KZ1, H_KITCH, mat({ map: rep(tex.slate || tex.stone, 5, 4), color: 0x5a5856 }), plaster);
  const tile = mat({ map: rep(tex.wallpaper, 3, 1), color: 0x7a7a70, roughness: 0.8 });
  wall('x', KZ1 + 0.1, KX0 - 0.1, KX1 + 0.2, H_KITCH, tile, [[42, 1.6]]);
  wall('x', KZ0 - 0.1, KX0 - 0.1, KX1 + 0.2, H_KITCH, tile, [[36.6, 1.1], [39.4, 1.1]]);
  wall('z', KX1 + 0.1, KZ0 - 0.2, KZ1 + 0.2, H_KITCH, tile);
  door('stairC', 'x', KZ0 - 0.1, 36.6, { w: 1.1, locked: true, msg: 'A padlocked door. Cold air rises through the gap beneath it: stairs going down. DN CELLAR is chalked on the frame.' });
  door('stairB', 'x', KZ0 - 0.1, 39.4, { w: 1.1, locked: true, boarded: true, msg: 'The back stair. Nailed shut, and the nails are new.' });
  // the range
  const range = new THREE.Group(); range.position.set(KX1 - 0.5, 0, -6.5); group.add(range);
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.6, roughness: 0.5 });
  const rb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 2.4), iron); rb.position.y = 0.475; rb.castShadow = true; range.add(rb);
  for (const dz of [-0.6, 0.6]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x3a1004 })); o.position.set(-0.451, 0.45, dz); o.rotation.y = -Math.PI / 2; range.add(o); }
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 2.6), iron); hood.position.y = 2.6; range.add(hood);
  rect(local, KX1 - 1.0, KX1, -7.8, -5.2);
  light(KX1 - 1.1, 0.5, -6.5, 0xff5020, 2.2, 5, false); // embers
  // table, pans and shelves
  box(group, 2.4, 0.08, 1.0, 38.5, 0.86, -6.5, wood, local);
  for (const dx of [-1.1, 1.1]) for (const dz of [-0.42, 0.42]) box(group, 0.08, 0.84, 0.08, 38.5 + dx, 0.42, -6.5 + dz, wood);
  for (const y of [1.4, 1.9, 2.4]) box(group, 3.0, 0.04, 0.35, 38.0, y, KZ1 - 0.25, wood, null, { cast: false });
  for (let i = 0; i < 9; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), mat({ color: [0x6a5a3a, 0x4a5a6a, 0x8a7a5a][i % 3], roughness: 0.4 })); j.position.set(36.8 + i * 0.3, 1.52 + Math.floor(i / 3) * 0.5, KZ1 - 0.25); group.add(j); }
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.8, roughness: 0.4 })); p.position.set(KX1 - 0.06, 2.0, -9 + i * 0.4); p.rotation.z = Math.PI / 2; group.add(p); }
  light(38.5, 2.9, -6.5, 0xffb070, 9, 11);

  // =============== mirrors M1 (hallway) and M2 (grand hall) ===============
  // Each reflection shows the player a little more moth-like.
  const size = quality === 'low' ? 256 : quality === 'medium' ? 512 : 1024;
  const avatars = [makeAvatar(1), makeAvatar(2)];
  avatars.forEach(a => { a.visible = false; group.add(a); });
  const mirrors = [
    { id: 'M1', pos: new THREE.Vector3(17.6, 1.7, 4.78), ry: Math.PI, w: 0.9, h: 1.5, stage: 1 },
    { id: 'M2', pos: new THREE.Vector3(20.32, 2.0, -3.0), ry: Math.PI / 2, w: 1.3, h: 2.3, stage: 2 },
  ].map((m, i) => {
    const mg = new THREE.Group(); mg.position.copy(m.pos); mg.rotation.y = m.ry; group.add(mg);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(m.w + 0.16, m.h + 0.16, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a6a30, metalness: 0.8, roughness: 0.35 }));
    frame.position.z = -0.02; mg.add(frame);
    const ref = new Reflector(new THREE.PlaneGeometry(m.w, m.h), { textureWidth: size, textureHeight: Math.round(size * m.h / m.w), color: 0xc8c8c8, clipBias: 0.003 });
    ref.position.z = 0.006; mg.add(ref);
    // tarnish over the glass
    const tarnish = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h), new THREE.MeshBasicMaterial({ map: tarnishTex(i), transparent: true, depthWrite: false }));
    tarnish.position.z = 0.008; mg.add(tarnish);
    const orig = ref.onBeforeRender, av = avatars[i], world = new THREE.Vector3();
    ref.onBeforeRender = (renderer, scene, camera) => {
      ref.getWorldPosition(world);
      if (world.distanceTo(camera.position) > 9) return; // too far to matter: keep the last image
      av.visible = true; orig.call(ref, renderer, scene, camera); av.visible = false;
    };
    return { ...m, group: mg, avatar: av, world: m.pos.clone() };
  });

  const api = {
    doors, mirrors, lights, cases: Object.values(cases), lifespan: L,
    journal: journalMesh,
    bindColliders(remove, add) { removeCollider = remove; addColliderBack = add; },
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
    lifespanCorrect() { return L.order.every((k, i) => k === LIFESPAN_ORDER[i]); },
    solveLifespan() { L.order = [...LIFESPAN_ORDER]; L.lifted = null; L.solved = true; placeCases(); doors.grand.locked = false; },
    reset() {
      L.order = [...START_ORDER]; L.lifted = null; L.solved = false; placeCases();
      for (const d of Object.values(doors)) { d.reset(); }
      doors.grand.locked = true;
    },
    update(t, dt, camera) {
      for (const d of Object.values(doors)) d.update(dt);
      lights.forEach((l, i) => { l.intensity = l.userData.base * (0.92 + Math.sin(t * 6 + i * 2.1) * 0.05 + Math.sin(t * 11.3 + i) * 0.03); });
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

// ---------- the player's reflection ----------
// stage 1: a teenager in a hoodie, eyes a little too large and dark, dust in the hair.
// stage 2: the eyes black and wide, a ruff of pale fuzz at the collar, feathered
// antennae through the hair, and folded dusty wings showing over the shoulders.
function makeAvatar(stage) {
  const a = new THREE.Group();
  const hoodie = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.9, emissive: 0x0c0e12 });
  const skin = new THREE.MeshStandardMaterial({ color: stage > 1 ? 0xc8b8a8 : 0xd0a890, roughness: 0.7, emissive: 0x2a1c16 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x2a1e16, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 6, 12), hoodie); torso.position.y = 1.15; torso.scale.set(1.15, 1, 0.75); a.add(torso);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.5, 4, 8), hoodie); arm.position.set(sx * 0.29, 1.12, 0); arm.rotation.z = sx * 0.12; a.add(arm); }
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.9 })); leg.position.set(sx * 0.1, 0.45, 0); a.add(leg); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), skin); neck.position.y = 1.5; a.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), skin); head.position.y = 1.64; head.scale.set(0.9, 1.1, 0.95); a.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hairCap.position.y = 1.66; hairCap.rotation.x = -0.25; a.add(hairCap);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 8, 16, Math.PI * 1.3), hoodie); hood.position.set(0, 1.5, -0.05); hood.rotation.set(Math.PI / 2, 0, Math.PI * 0.85); a.add(hood);
  // eyes (the avatar faces +z)
  const eyeR = stage > 1 ? 0.03 : 0.018;
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 10), new THREE.MeshStandardMaterial({ color: 0x050405, roughness: 0.15, metalness: 0.3 }));
    e.position.set(sx * 0.042, 1.66, 0.09); e.scale.z = 0.6; a.add(e);
  }
  // dust in the hair
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 240 }, (_, i) => { const k = i % 3, u = Math.random() * 6.28, v = Math.random() * 1.4; return k === 0 ? Math.cos(u) * Math.sin(v) * 0.125 : k === 1 ? 1.66 + Math.cos(v) * 0.13 : Math.sin(u) * Math.sin(v) * 0.125; }), 3)),
    new THREE.PointsMaterial({ color: 0xd8d0c0, size: 0.006 }));
  a.add(dust);
  if (stage > 1) {
    const fuzz = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 10, 24), new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 }));
    fuzz.rotation.x = Math.PI / 2; fuzz.position.y = 1.47; a.add(fuzz);
    for (const sx of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx * 0.03, 1.74, 0.06), new THREE.Vector3(sx * 0.08, 1.92, 0.1), new THREE.Vector3(sx * 0.2, 1.98, 0.02));
      const ant = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.006, 5), new THREE.MeshStandardMaterial({ color: 0x6a5a48 })); a.add(ant);
      for (let t = 0.2; t < 1; t += 0.08) { const p = curve.getPoint(t); const f = new THREE.Mesh(new THREE.BoxGeometry(0.035 * Math.sin(t * Math.PI), 0.003, 0.003), ant.material); f.position.copy(p); f.rotation.z = sx * 0.6; a.add(f); }
      // folded wing over each shoulder, dusty brown-grey
      const wc = document.createElement('canvas'); wc.width = 256; wc.height = 256;
      drawSpecimenFit(wc.getContext('2d'), 'pavonia', 0, 0, 256, 256, { pin: false });
      const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshStandardMaterial({ map: wt, color: 0x9a9088, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 }));
      wing.position.set(sx * 0.18, 1.2, -0.17); wing.rotation.set(0.1, sx * 0.5, sx * 0.15); a.add(wing);
    }
  }
  a.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return a;
}
