// The Cellar (sheet A-101) and the First Floor (sheet A-103).
// Both are built in the room zone's group, in its local coordinates, away from the ground
// floor: the cellar at z 40..56.8, the first floor at z 80..96.8 (x 30..58 for both).
// Stairs between floors are transitions (fade, then place the player).
//
// Cellar: Wine Cellar (mirror M3, stair C up, the B shaft), Boiler Room (the clothes-moth
// wardrobe), Egg Room, Ritual Chapel (mirror M4, the life-cycle altar puzzle, stair E down,
// locked for now). Solving the altar unbolts the gate to the back stair B.
// TEMPORARY LINK: the blueprint route is Cellar > stair E > Catacombs > passage to stair B >
// First Floor. Until the Catacombs are built, the altar opens the B shaft gate here instead.
// When they are: the altar should open stair E's grille, and stair B should be reachable only
// from the Catacombs (remove the shaft gate interaction in main.js and keep this gate shut).
// First Floor: Cocoon Room (stair B arrives here; silkworm note, wrapped bodies), Nursery,
// Gallery Landing (open over the Grand Hall; stair A's head buried in rubble), Library
// (peppered moth note), Luna Bedroom (countdown wall, M6 vanity), Leader's Bedroom
// (four-poster, locked desk: the floor's puzzle), Linen Room (M7, ladder D locked).
import * as THREE from 'three';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';
import { gasLampFixture } from './fixtures.js';

export const CELLAR = { spawn: new THREE.Vector3(31.75, 0, 46.7), shaftFoot: new THREE.Vector3(34.45, 0, 46.2), stairC: new THREE.Vector3(31.75, 0, 45.6), shaft: new THREE.Vector3(34.45, 0, 45.6), stairE: new THREE.Vector3(56.25, 0, 52.4) };
export const FIRST = { spawn: new THREE.Vector3(34.45, 0, 86.9), stairB: new THREE.Vector3(34.45, 0, 86.1), stairA: new THREE.Vector3(42.1, 0, 85.0), ladderD: new THREE.Vector3(56.9, 0, 87.7) };
// the altar's four carved stones, left to right, and the order the clothes moth lives them
export const ALTAR_TILES = ['cocoon', 'egg', 'wings', 'larva'];
export const ALTAR_ORDER = ['egg', 'larva', 'cocoon', 'wings'];
export const DESK_CODE = '1848';

export const WARDROBE_VERSE = [
  'Scratched inside the wardrobe door, under the eaten coats:',
  '“In the wool she lays her seed;',
  'the grub wakes small, and starts to feed;',
  'it wraps itself in silk to sleep;',
  'and wakes with wings, the dark to keep.”',
].join(' ');
export const BOILER_NOTE = [
  'A page of the Order’s catechism, pinned above the boiler:',
  '“As the clothes moth, so the faithful. Kneel at the altar and walk her life from the first day to the last,',
  'and the house will open the way up to the Mother.”',
].join(' ');
export const SILK_NOTE = [
  'A note tucked into a silk frame:',
  '“The silkworm does not choose the cocoon. It is spun for it, from inside, and boiled before it can leave.',
  'We were kinder. We let ours sleep.”',
].join(' ');
export const PEPPERED_NOTE = [
  'A naturalist’s card in the leader’s hand, about Biston betularia, the peppered moth:',
  '“Pale, speckled, a lichen on the bark. Then the mills came, the bark went black with soot, and the black ones lived.',
  'The first black one was taken in Manchester in eighteen-hundred and the year the girl stopped counting on her wall.',
  'The desk is set to it. Change with the bark, or be eaten.”',
].join(' ');

export function buildLowerUpper(ctx) {
  const { group, local, wall, room, plane, door, light, addMirror, carpetTex, buildRubble } = ctx;
  const r = rand(3131);
  const wood = mat({ map: tex.wood, color: 0x6a5444 });
  const darkWood = mat({ map: tex.wood, color: 0x3e2c22 });
  const brick = mat({ map: rep(tex.stone, 3, 1.5), color: 0x7a5a4a, roughness: 1 });
  const flag = mat({ map: rep(tex.stone, 5, 3), color: 0x6a6866, roughness: 1 });
  const vault = mat({ map: rep(tex.stone, 4, 2), color: 0x4a4644 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.8, roughness: 0.55 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const silk = new THREE.MeshStandardMaterial({ map: silkTex(), color: 0xd8d8d8, roughness: 0.85, emissive: 0x1a1814, side: THREE.DoubleSide });
  const paperMat = t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const wallpaper = (x, y, c) => mat({ map: rep(tex.wallpaper, x, y), color: c });
  const floorMat = (x, y, c = 0xa09888) => mat({ map: rep(tex.floor, x, y), color: c });
  const plaster = mat({ color: 0x3a3836 });
  const add = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); return m; };
  const note = (x, y, z, ry = 0, flat = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), paperMat(noteTex(r)));
    if (flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry;
    m.position.set(x, y, z); group.add(m); return m;
  };

  // ======================= CELLAR: x 30..58, z 40..56.8 =======================
  const CX0 = 30, CX1 = 58, CZ0 = 40, CZ1 = 56.8, CH = 3.2;
  room(CX0, CX1, CZ0, CZ1, CH, flag, vault);
  wall('x', CZ0 - 0.1, CX0 - 0.2, CX1 + 0.2, CH, brick);
  wall('x', CZ1 + 0.1, CX0 - 0.2, CX1 + 0.2, CH, brick);
  wall('z', CX0 - 0.1, CZ0, CZ1, CH, brick);
  wall('z', CX1 + 0.1, CZ0, CZ1, CH, brick);
  wall('z', 39.1, CZ0, CZ1, CH, brick, [[41.6, 1.2], [51.2, 1.2]]);
  wall('z', 49.25, CZ0, CZ1, CH, brick, [[51.9, 1.2]]);
  wall('x', 46.3, 39.1, 49.25, CH, brick, [[43.0, 1.2]]);
  door('cWineBoiler', 'z', 39.1, 41.6, { swing: 1, openMsg: 'Heat, and the smell of wet wool.' });
  door('cBoilerEgg', 'x', 46.3, 43.0, { swing: -1, openMsg: 'The air beyond is warm and still, like a held breath.' });
  door('cEggChapel', 'z', 49.25, 51.9, { swing: 1, openMsg: 'Candles, long burned down. Pews. Someone kept this place.' });
  door('cWineEgg', 'z', 39.1, 51.2, { locked: true, swing: -1, msg: 'Bolted from the other side.' });
  // vault ribs across the ceiling
  for (let x = CX0 + 1.5; x < CX1; x += 3) box(group, 0.25, 0.22, CZ1 - CZ0, x, CH - 0.11, (CZ0 + CZ1) / 2, vault, null, { cast: false });

  // dim fills so the rooms read in the dark (no visible source)
  for (const [x, z] of [[34.5, 50], [44.2, 43.0], [44.2, 52], [53.6, 46], [53.6, 53]]) light(x, CH - 0.4, z, 0x9a8a7a, 10, 14, false).userData.fill = true;
  // ---- Wine Cellar: x 30..39.1 ----
  // stair C rises north to the kitchen, beside the shaft of the old back stair B
  for (let i = 0; i < 9; i++) box(group, 2.0, 0.18 * (i + 1), 0.5, 31.75, 0.09 * (i + 1), 45.0 - i * 0.5, darkWood, null, { cast: i % 3 === 0 });
  rect(local, 30.7, 32.8, 40.2, 45.25);
  box(group, 0.08, 1.0, 4.6, 32.85, 1.4, 43.0, darkWood, null, { cast: false }); // handrail
  // the B shaft, behind an iron gate
  const shaftG = new THREE.Group(); shaftG.position.set(34.45, 0, 45.2); group.add(shaftG);
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), iron); b.position.set(-0.95 + i * 0.237, 1.2, 0); shaftG.add(b); }
  for (const y of [0.15, 1.2, 2.3]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.04), iron); b.position.y = y; shaftG.add(b); }
  const padlockB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.05), iron); padlockB.position.set(0.6, 1.2, 0.05); shaftG.add(padlockB);
  for (let i = 0; i < 9; i++) box(group, 2.0, 0.18 * (i + 1), 0.5, 34.45, 0.09 * (i + 1), 44.6 - i * 0.5, wood, null, { cast: false });
  box(group, 0.2, CH, 5.2, 33.3, CH / 2, 42.6, brick, local, { cast: false });
  box(group, 0.2, CH, 5.2, 35.6, CH / 2, 42.6, brick, local, { cast: false });
  const gateCol = { minX: 33.4, maxX: 35.5, minZ: 45.1, maxZ: 45.3, door: 'shaftGate' }; local.push(gateCol);
  rect(local, 33.4, 35.5, 40.2, 45.1);
  // racks of bottles down the west wall, barrels opposite
  const bottleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8); bottleGeo.rotateZ(Math.PI / 2);
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.2, metalness: 0.1 });
  const NB = 300, bottles = new THREE.InstancedMesh(bottleGeo, bottleMat, NB); let nb = 0; const m4 = new THREE.Matrix4();
  for (let k = 0; k < 4; k++) {
    const z0 = 47.4 + k * 2.3;
    box(group, 0.6, 2.2, 2.0, 30.4, 1.1, z0 + 1, darkWood, null, { cast: false });
    for (let row = 0; row < 7; row++) for (let c = 0; c < 10; c++) if (r() < 0.82 && nb < NB) { m4.makeTranslation(30.55, 0.25 + row * 0.28, z0 + 0.12 + c * 0.18); bottles.setMatrixAt(nb++, m4); }
  }
  bottles.count = nb; group.add(bottles);
  rect(local, 30, 30.75, 47.3, 56.6);
  for (const [x, z] of [[37.8, 48.2], [37.8, 49.4], [38.2, 54.4]]) {
    const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 16), wood), x, 0.55, z); b.rotation.z = Math.PI / 2; b.rotation.y = Math.PI / 2;
    rect(local, x - 0.45, x + 0.45, z - 0.55, z + 0.55);
  }
  // a collapsed rack: rubble and broken glass
  buildRubble(group, 35.5, 55.5, 1.1, r);
  rect(local, 34.6, 36.4, 54.6, 56.4);
  light(36.0, 2.4, CZ1 - 0.2, 0xffa860, 4, 9, '-z').userData.creepy = true;
  light(32.2, 2.4, 46.4, 0xffa860, 3, 7, '+x');
  addMirror({ id: 'M3', pos: new THREE.Vector3(37.2, 1.7, CZ1 - 0.02), ry: Math.PI, w: 0.8, h: 1.4, stage: 3 });
  cocoon(36.9, 41.0, 1.2, true); cocoon(38.4, 46.5, 0.9, false);

  // ---- Boiler Room: x 39.1..49.25, z 40..46.3 ----
  const boiler = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.4, 24), iron), 46.8, 1.2, 42.4);
  const fire = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), new THREE.MeshBasicMaterial({ color: 0xff6a20 })); fire.position.set(46.8, 0.5, 43.31); group.add(fire);
  rect(local, 45.8, 47.8, 41.4, 43.4);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 10), iron); p.rotation.z = Math.PI / 2; p.position.set(44.2, 2.5 + i * 0.15, 40.25 + i * 0.12); group.add(p); }
  light(46.8, 0.6, 43.6, 0xff6020, 3, 6, false);
  light(42.8, 2.4, 40.0, 0xffa860, 4, 8, '+z').userData.creepy = true;
  // the clothes-moth wardrobe: tall, its coats eaten to lace
  const ward = new THREE.Group(); ward.position.set(41.2, 0, 40.45); group.add(ward);
  box(ward, 1.5, 2.3, 0.6, 0, 1.15, 0.3, darkWood);
  const wDoors = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.74, 0, 0.61); ward.add(piv);
    const lf = box(piv, 0.73, 2.1, 0.04, -s * 0.365, 1.15, 0, wood); lf.castShadow = true;
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), brass); kn.position.set(-s * 0.68, 1.15, 0.03); piv.add(kn);
    wDoors.push({ piv, s });
  }
  for (let i = 0; i < 4; i++) { const coat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.4), new THREE.MeshStandardMaterial({ map: lacyTex(i), color: [0x4a3a3a, 0x3a3a4a, 0x5a4a3a, 0x3a4a3a][i], transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); coat.position.set(-0.5 + i * 0.33, 1.4, 0.3); coat.rotation.y = Math.PI / 2; ward.add(coat); }
  const verse = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), paperMat(verseTex())); verse.position.set(0.365, 1.5, -0.015); wDoors[0].piv.add(verse); verse.rotation.y = Math.PI;
  rect(local, 40.4, 42.0, 40.0, 41.1);
  const boilerNote = note(43.0, 1.4, 40.12, 0, false);
  box(group, 0.8, 0.8, 0.6, 44.5, 0.4, 45.6, wood, local); // crate

  // ---- Egg Room: x 39.1..49.25, z 46.3..56.8 ----
  const eggMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.3, emissive: 0x24262a });
  const eggGeo = new THREE.SphereGeometry(0.06, 12, 8); eggGeo.scale(1, 1.35, 1);
  const NE = 260, eggs = new THREE.InstancedMesh(eggGeo, eggMat, NE); let ne = 0; const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), v = new THREE.Vector3();
  for (let row = 0; row < 4; row++) {
    const z = 48.4 + row * 2.2;
    box(group, 7.2, 0.5, 0.9, 44.2, 0.25, z, darkWood, local);  // low trestles
    for (let i = 0; i < 52 && ne < NE; i++) {
      e.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4); q.setFromEuler(e); const k = 0.8 + r() * 0.4; sc.set(k, k, k);
      m4.compose(v.set(40.8 + (i % 26) * 0.27 + r() * 0.05, 0.57, z - 0.2 + Math.floor(i / 26) * 0.4), q, sc); eggs.setMatrixAt(ne++, m4);
    }
  }
  eggs.count = ne; eggs.castShadow = true; group.add(eggs);
  light(44.2, 2.6, 51.5, 0xd8c8a8, 3.5, 10, { pendant: CH }).userData.creepy = true;
  cocoon(40.0, 56.2, 1.3, true); cocoon(48.6, 47.0, 1.1, true); cocoon(48.5, 56.2, 1.0, false);

  // ---- Ritual Chapel: x 49.25..58, z 40..56.8 ----
  box(group, 3.0, 1.0, 1.0, 53.65, 0.5, 40.6, mat({ map: rep(tex.stone, 1, 0.5), color: 0x9a948a }), local); // altar
  box(group, 3.4, 0.08, 1.2, 53.65, 1.04, 40.6, mat({ color: 0xd8d0c0, roughness: 0.9 }), null, { cast: false }); // altar cloth
  const altarMosaic = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), mat({ map: tex.mosaic, roughness: 0.55 }));
  altarMosaic.position.set(53.65, 2.1, 40.02); group.add(altarMosaic);
  // the four carved stones set into the altar front
  const tiles = ALTAR_TILES.map((k, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), new THREE.MeshStandardMaterial({ map: stoneIcon(k), roughness: 0.9 }));
    m.position.set(52.4 + i * 0.83, 0.55, 41.12); group.add(m);
    return { key: k, mesh: m, pressed: false, pos: new THREE.Vector3(52.4 + i * 0.83, 0, 41.9) };
  });
  for (const x of [52.0, 55.3]) for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2 + k * 0.08, 8), mat({ color: 0xe8e0c8 })); c.position.set(x + k * 0.12, 1.18 + k * 0.04, 40.4); group.add(c);
    gasLampFixture(group, x + k * 0.12, 1.28 + k * 0.08, 40.4, 'candle');
  }
  light(53.65, 1.6, 40.9, 0xffa050, 5, 9, false).userData.creepy = true;
  light(57.8, 2.4, 52.0, 0xffa860, 3, 8, '-x').userData.creepy = true;
  for (let k = 0; k < 4; k++) {
    const z = 44.6 + k * 1.6;
    for (const x of [51.3, 55.9]) {
      box(group, 2.6, 0.08, 0.5, x, 0.48, z, darkWood, null);
      box(group, 2.6, 0.7, 0.06, x, 0.8, z + 0.25, darkWood, null, { cast: false });
      for (const dx of [-1.2, 1.2]) box(group, 0.08, 0.48, 0.5, x + dx, 0.24, z, darkWood, null, { cast: false });
      rect(local, x - 1.3, x + 1.3, z - 0.28, z + 0.3);
    }
  }
  // stair E: steps going down, closed off by a grille
  for (let i = 0; i < 6; i++) box(group, 2.0, 0.06, 0.5, 56.25, -0.18 * i, 53.4 + i * 0.5, flag, null, { cast: false });
  plane(2.1, 3.2, 56.25, 0.005, 54.8, mat({ color: 0x050505 }));
  const grille = new THREE.Group(); grille.position.set(56.25, 0, 53.05); group.add(grille);
  for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), iron); b.position.set(-0.9 + i * 0.26, 0.6, 0); grille.add(b); }
  for (const y of [0.1, 1.15]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.04), iron); b.position.y = y; grille.add(b); }
  rect(local, 55.2, 57.3, 53.0, 56.6);
  addMirror({ id: 'M4', pos: new THREE.Vector3(CX1 - 0.02, 1.8, 47.7), ry: -Math.PI / 2, w: 1.0, h: 1.8, stage: 4 });
  cocoon(50.0, 55.9, 1.5, true); cocoon(57.4, 41.0, 1.2, true); cocoon(50.2, 41.2, 0.9, false);

  // ======================= FIRST FLOOR: x 30..58, z 80..96.8 =======================
  const FX0 = 30, FX1 = 58, FZ0 = 80, FZ1 = 96.8, FH = 3.6;
  const wp = wallpaper(4, 1.4, 0x7a7276), wpN = wallpaper(3, 1.4, 0x8a8478), wpL = wallpaper(3, 1.4, 0x6a7a8a);
  // floors (the gallery's around its open well), ceilings
  plane(9.1, FZ1 - FZ0, 34.55, 0, (FZ0 + FZ1) / 2, floorMat(4, 6));
  plane(FX1 - 49.25, FZ1 - FZ0, (49.25 + FX1) / 2, 0, (FZ0 + FZ1) / 2, floorMat(4, 6));
  plane(10.15, 5.6, 44.175, 0, 82.8, floorMat(4, 2));
  plane(5.3, 11.2, 41.75, 0, 91.2, floorMat(2, 5));
  plane(1.25, 11.2, 48.625, 0, 91.2, floorMat(1, 5));
  plane(3.6, 0.8, 46.2, 0, 96.4, floorMat(2, 1));
  plane(FX1 - FX0, FZ1 - FZ0, (FX0 + FX1) / 2, FH, (FZ0 + FZ1) / 2, plaster, false);
  wall('x', FZ0 - 0.1, FX0 - 0.2, FX1 + 0.2, FH, wp);
  wall('x', FZ1 + 0.1, FX0 - 0.2, FX1 + 0.2, FH, wp);
  wall('z', FX0 - 0.1, FZ0, FZ1, FH, wp);
  wall('z', FX1 + 0.1, FZ0, FZ1, FH, wp);
  wall('z', 39.1, FZ0, FZ1, FH, wp, [[82.1, 1.2], [91.9, 1.2]]);
  wall('z', 49.25, FZ0, FZ1, FH, wp, [[81.0, 1.2], [85.3, 1.2], [90.2, 1.2]]);
  wall('x', 88.4, FX0, 39.1, FH, wp);
  wall('x', 84.2, 39.1, 49.25, FH, wpN, [[42.25, 1.2]]);
  wall('x', 86.3, 49.25, FX1, FH, wp, [[50.6, 1.0], [55.6, 1.0]]);
  wall('x', 89.1, 49.25, FX1, FH, wpL, [[50.6, 1.0]]);
  wall('z', 53.45, 86.3, 89.1, FH, wp);
  door('fCocoonNursery', 'z', 39.1, 82.1, { swing: 1, openMsg: 'A nursery. Very quiet.' });
  door('fNurseryGallery', 'x', 84.2, 42.25, { swing: -1 });
  door('fGalleryLeader', 'z', 49.25, 85.3, { swing: 1, openMsg: 'The leader’s room. It smells of camphor and old smoke.' });
  door('fGalleryLuna', 'z', 49.25, 90.2, { swing: 1, openMsg: 'A girl’s bedroom, pale green. Numbers on the far wall.' });
  door('fLibrary', 'z', 39.1, 91.9, { swing: -1, openMsg: 'Books to the ceiling, and the dry, sweet smell of paper.' });
  door('fNurseryLeader', 'z', 49.25, 81.0, { locked: true, swing: 1, msg: 'Locked. A child’s door into the leader’s room, locked from his side.' });
  door('fLeaderBath', 'x', 86.3, 50.6, { w: 1.0, locked: true, swing: 1, msg: 'The bathroom door is swollen shut. Water has been dripping here for years.' });
  door('fBathLuna', 'x', 89.1, 50.6, { w: 1.0, locked: true, swing: 1, msg: 'Swollen shut.' });
  door('fLeaderLinen', 'x', 86.3, 55.6, { w: 1.0, locked: true, swing: -1, msg: 'Locked. A brass plate reads LINEN. The key must be somewhere in this room.', openMsg: 'Shelves of yellowed linen, and a ladder going up into the dark.' });

  for (const [x, z] of [[34.5, 84], [44.2, 82], [42, 92], [34.5, 92.5], [53.6, 83], [53.6, 93]]) light(x, FH - 0.4, z, 0x9a8a80, 10, 14, false).userData.fill = true;
  // ---- Cocoon Room: x 30..39.1, z 80..88.4 (stair B arrives here) ----
  for (let i = 0; i < 9; i++) box(group, 2.0, 0.06, 0.5, 34.45, -0.2 * (i + 1), 85.5 - i * 0.5, wood, null, { cast: false });
  plane(2.1, 4.8, 34.45, 0.004, 83.4, mat({ color: 0x080706 }));
  for (const x of [33.35, 35.55]) box(group, 0.06, 0.9, 4.8, x, 0.45, 83.3, darkWood, null, { cast: false });
  rect(local, 33.3, 35.6, 80.6, 85.8);
  // silk frames along the walls, and the wrapped ones
  for (let i = 0; i < 4; i++) {
    const fx = 30.5 + i * 0.75;
    const fr = new THREE.Group(); fr.position.set(fx, 0, 87.6); fr.rotation.y = 0.2 * (i - 1.5); group.add(fr);
    box(fr, 0.05, 2.0, 0.05, -0.32, 1.0, 0, darkWood); box(fr, 0.05, 2.0, 0.05, 0.32, 1.0, 0, darkWood); box(fr, 0.7, 0.05, 0.05, 0, 1.98, 0, darkWood);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.6), silk); sh.position.set(0, 1.15, 0); fr.add(sh);
  }
  rect(local, 30.0, 33.2, 87.3, 88.3);
  for (const [x, z, ry] of [[37.4, 80.9, Math.PI / 2], [37.4, 87.6, Math.PI / 2], [31.8, 84.8, 0]]) { wrapped(x, z, ry); const sw = Math.abs(Math.sin(ry)) > 0.7; rect(local, x - (sw ? 1.0 : 0.5), x + (sw ? 1.0 : 0.5), z - (sw ? 0.5 : 1.0), z + (sw ? 0.5 : 1.0)); }
  cocoon(31.2, 81.0, 1.6, true); cocoon(38.4, 87.6, 1.4, true); cocoon(32.0, 85.0, 1.2, true);
  const silkNote = note(31.6, 0.85, 82.2, 0.4);
  box(group, 0.9, 0.8, 0.6, 31.6, 0.4, 82.3, wood, local);
  light(38.9, 2.6, 84.0, 0xffa860, 4, 9, '-x').userData.creepy = true;
  light(30.15, 2.6, 85.5, 0xffa860, 3, 7, '+x');

  // ---- Nursery: x 39.1..49.25, z 80..84.2 ----
  const nursFloor = floorMat(3, 2, 0xb0a898);
  plane(10.1, 4.1, 44.2, 0.004, 82.1, nursFloor);
  const cradle = new THREE.Group(); cradle.position.set(44.5, 0, 81.4); group.add(cradle);
  for (const s of [-1, 1]) { const rk = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 24, Math.PI * 0.5), wood); rk.rotation.z = Math.PI * 0.75; rk.position.set(0, 0.42, s * 0.3); cradle.add(rk); }
  box(cradle, 0.95, 0.4, 0.55, 0, 0.55, 0, wood); box(cradle, 0.95, 0.04, 0.55, 0, 0.36, 0, wood);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI, 0, Math.PI / 2), silk); hood.rotation.z = Math.PI / 2; hood.position.set(-0.4, 0.75, 0); cradle.add(hood);
  rect(local, 43.9, 45.1, 80.9, 81.9);
  box(group, 1.5, 0.45, 0.8, 47.9, 0.25, 81.0, wood, local); box(group, 1.5, 0.08, 0.8, 47.9, 0.52, 81.0, mat({ color: 0xc8c0b0 }), null);
  const horse = new THREE.Group(); horse.position.set(41.0, 0, 82.8); horse.rotation.y = 0.7; group.add(horse);
  box(horse, 0.7, 0.3, 0.2, 0, 0.6, 0, mat({ color: 0xc8b8a0 })); box(horse, 0.12, 0.35, 0.15, 0.32, 0.85, 0, mat({ color: 0xc8b8a0 }));
  const rocker = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 20, Math.PI * 0.4), wood); rocker.rotation.z = Math.PI * 0.8; rocker.position.y = 0.62; horse.add(rocker);
  rect(local, 40.6, 41.4, 82.4, 83.2);
  light(44.5, 2.9, 82.0, 0xffb878, 4, 8, { pendant: FH }).userData.creepy = true;
  cocoon(40.0, 80.6, 0.8, true);

  // ---- Gallery Landing: open well over the Grand Hall, stair A's head under rubble ----
  const railMat = darkWood;
  const well = { x0: 44.4, x1: 48.0, z0: 85.6, z1: 96.0 };
  for (const [x0, z0, x1, z1] of [[well.x0, well.z0, well.x1, well.z0], [well.x0, well.z0, well.x0, well.z1], [well.x1, well.z0, well.x1, well.z1], [well.x0, well.z1, well.x1, well.z1]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), along = x0 === x1 ? 'z' : 'x';
    const rail = box(group, along === 'x' ? len : 0.08, 0.08, along === 'z' ? len : 0.08, (x0 + x1) / 2, 1.0, (z0 + z1) / 2, railMat, null, { cast: false });
    for (let s = 0; s <= len; s += 0.3) box(group, 0.04, 1.0, 0.04, along === 'x' ? x0 + s : x0, 0.5, along === 'z' ? z0 + s : z0, railMat, null, { cast: false });
  }
  rect(local, well.x0 - 0.05, well.x1 + 0.05, well.z0 - 0.05, well.z1 + 0.05);
  // looking down: the hall far below, the carpet catching coloured light
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(well.x1 - well.x0, well.z1 - well.z0), new THREE.MeshBasicMaterial({ map: carpetTex(), color: 0x3a3436 }));
  deep.rotation.x = -Math.PI / 2; deep.position.set((well.x0 + well.x1) / 2, -7.2, (well.z0 + well.z1) / 2); group.add(deep);
  for (const [x0, z0, w, d, ry] of [[well.x0, (well.z0 + well.z1) / 2, well.z1 - well.z0, 7.2, Math.PI / 2], [well.x1, (well.z0 + well.z1) / 2, well.z1 - well.z0, 7.2, -Math.PI / 2], [(well.x0 + well.x1) / 2, well.z0, well.x1 - well.x0, 7.2, 0], [(well.x0 + well.x1) / 2, well.z1, well.x1 - well.x0, 7.2, Math.PI]]) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x0c0a0a })); sh.position.set(x0, -3.6, z0); sh.rotation.y = ry; group.add(sh);
  }
  // stair A comes up here, choked with the collapsed landing
  for (let i = 0; i < 5; i++) box(group, 2.2, 0.06, 0.4, 42.1, -0.22 * (i + 1), 86.0 + i * 0.4, wood, null, { cast: false });
  buildRubble(group, 42.1, 88.2, 1.2, r);
  rect(local, 40.9, 43.3, 85.6, 92.2);
  light(39.4, 2.6, 94.5, 0xffa860, 3.5, 9, '+x').userData.creepy = true;
  light(49.0, 2.6, 88.0, 0xffa860, 3.5, 9, '-x');
  cocoon(48.8, 95.8, 1.2, true);

  // ---- Library: x 30..39.1, z 88.4..96.8 ----
  const bookCols = [0x5a2a22, 0x2a3a4a, 0x3a4a2a, 0x6a5a3a, 0x4a2a3a, 0x2a2a2a, 0x7a6a4a];
  const NBK = 900, books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), NBK); let nbk = 0;
  const col = new THREE.Color();
  const shelf = (x0, z0, len, alongX) => {
    box(group, alongX ? len : 0.4, 2.8, alongX ? 0.4 : len, alongX ? x0 + len / 2 : x0, 1.4, alongX ? z0 : z0 + len / 2, darkWood, local, { cast: false });
    for (let s = 0; s < 6; s++) { let p = 0.05; while (p < len - 0.1 && nbk < NBK) { const w = 0.035 + r() * 0.04, h = 0.24 + r() * 0.12; if (r() < 0.06) { p += 0.1; continue; }
      const cx = alongX ? x0 + p + w / 2 : x0 + (x0 < 34 ? 0.2 : -0.2), cz = alongX ? z0 + (z0 > 92 ? -0.2 : 0.2) : z0 + p + w / 2;
      m4.compose(v.set(cx, 0.2 + s * 0.45 + h / 2, cz), q.identity(), sc.set(alongX ? w : 0.28, h, alongX ? 0.28 : w)); books.setMatrixAt(nbk, m4); books.setColorAt(nbk, col.setHex(bookCols[Math.floor(r() * bookCols.length)]).multiplyScalar(0.7 + r() * 0.5)); nbk++; p += w + 0.004; } }
  };
  shelf(30.2, 88.6, 8.0, false);
  shelf(30.4, 96.6, 8.4, true);
  books.count = nbk; books.instanceColor.needsUpdate = true; group.add(books);
  box(group, 1.8, 0.06, 1.0, 34.6, 0.78, 92.6, wood, null); for (const [dx, dz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) box(group, 0.06, 0.78, 0.06, 34.6 + dx, 0.39, 92.6 + dz, wood, null, { cast: false });
  rect(local, 33.6, 35.6, 92.0, 93.2);
  const pepNote = note(34.4, 0.815, 92.5, -0.3);
  light(34.6, 2.9, 92.6, 0xffc080, 4, 9, { pendant: FH }).userData.creepy = true;
  light(38.9, 2.4, 95.4, 0xffa860, 2.5, 6, '-x');

  // ---- Leader's Bedroom: x 49.25..58, z 80..86.3 ----
  const bed = new THREE.Group(); bed.position.set(55.2, 0, 82.2); group.add(bed);
  box(bed, 2.0, 0.55, 2.3, 0, 0.3, 0, darkWood); box(bed, 1.9, 0.18, 2.2, 0, 0.66, 0, mat({ color: 0x7a2a2a, roughness: 0.95 }));
  for (const [dx, dz] of [[-1, -1.15], [1, -1.15], [-1, 1.15], [1, 1.15]]) box(bed, 0.1, 2.6, 0.1, dx, 1.3, dz, darkWood);
  box(bed, 2.1, 0.12, 2.4, 0, 2.6, 0, darkWood);
  for (const s of [-1, 1]) { const cur = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshStandardMaterial({ map: lacyTex(7), color: 0x5a1a1a, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide })); cur.rotation.y = Math.PI / 2; cur.position.set(s * 1.02, 1.4, 0); bed.add(cur); }
  rect(local, 54.1, 56.3, 80.9, 83.4);
  const desk = new THREE.Group(); desk.position.set(51.4, 0, 80.5); group.add(desk);
  box(desk, 1.5, 0.75, 0.7, 0, 0.375, 0.05, wood); box(desk, 1.6, 0.05, 0.8, 0, 0.775, 0.05, darkWood);
  const drawer = box(desk, 0.6, 0.18, 0.05, 0, 0.6, 0.42, darkWood);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), brass); dial.rotation.x = Math.PI / 2; dial.position.set(0.4, 0.6, 0.43); desk.add(dial);
  const keyTag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.12), brass); keyTag.position.set(0, 0.62, 0.3); keyTag.visible = false; desk.add(keyTag);
  rect(local, 50.6, 52.2, 80.0, 81.0);
  light(51.0, 1.5, 80.7, 0xffd0a0, 2.5, 6, 'candle');
  light(57.8, 2.6, 84.5, 0xffa860, 3.5, 8, '-x').userData.creepy = true;
  cocoon(57.4, 80.6, 1.0, true);

  // ---- Linen Room: x 53.45..58, z 86.3..89.1 ----
  for (let s = 0; s < 4; s++) { box(group, 0.5, 0.04, 2.6, 53.8, 0.4 + s * 0.55, 87.7, wood, null, { cast: false }); for (let k = 0; k < 4; k++) box(group, 0.4, 0.14 + r() * 0.1, 0.5, 53.8, 0.5 + s * 0.55, 86.7 + k * 0.62, mat({ color: 0xd8d0b8, roughness: 1 }), null, { cast: false }); }
  rect(local, 53.5, 54.1, 86.4, 89.0);
  // ladder D, up to a hatch, padlocked
  const lad = new THREE.Group(); lad.position.set(57.4, 0, 87.7); lad.rotation.z = 0.12; group.add(lad);
  for (const s of [-0.25, 0.25]) box(lad, 0.06, 3.7, 0.06, 0, 1.85, s, wood);
  for (let k = 0; k < 11; k++) box(lad, 0.04, 0.04, 0.5, 0, 0.3 + k * 0.32, 0, wood);
  box(group, 1.0, 0.06, 1.0, 57.2, FH - 0.03, 87.7, darkWood, null, { cast: false });
  rect(local, 57.0, 57.9, 87.3, 88.1);
  light(55.6, 2.8, 87.7, 0xffb070, 2.5, 6, { pendant: FH });
  addMirror({ id: 'M7', pos: new THREE.Vector3(54.12, 1.7, 87.7), ry: Math.PI / 2, w: 0.7, h: 1.3, stage: 7 });

  // ---- Luna Bedroom: x 49.25..58, z 89.1..96.8 ----
  const luna = new THREE.Group(); luna.position.set(51.2, 0, 94.8); group.add(luna);
  box(luna, 1.2, 0.5, 2.0, 0, 0.25, 0, wood); box(luna, 1.1, 0.15, 1.9, 0, 0.57, 0, mat({ color: 0x9ab8a0, roughness: 0.95 }));
  box(luna, 1.2, 1.1, 0.08, 0, 0.55, 1.0, wood);
  rect(local, 50.6, 51.8, 93.8, 95.8);
  const countdown = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8), new THREE.MeshStandardMaterial({ map: countdownTex(), transparent: true, roughness: 1 }));
  countdown.position.set(FX1 - 0.02, 1.5, 92.3); countdown.rotation.y = -Math.PI / 2; group.add(countdown);
  const vanity = new THREE.Group(); vanity.position.set(55.8, 0, 96.4); group.add(vanity);
  box(vanity, 1.3, 0.75, 0.5, 0, 0.375, 0, mat({ map: tex.wood, color: 0xd8d0c0 })); box(vanity, 1.4, 0.04, 0.55, 0, 0.77, 0, mat({ map: tex.wood, color: 0xe8e0d0 }));
  rect(local, 55.1, 56.5, 96.1, 96.8);
  addMirror({ id: 'M6', pos: new THREE.Vector3(55.8, 1.45, 96.7), ry: Math.PI, w: 0.8, h: 1.0, stage: 6 });
  const lunaMosaic = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), mat({ map: tex.mosaicFloor, roughness: 0.5, color: 0xa8d8b8 }));
  lunaMosaic.rotation.x = -Math.PI / 2; lunaMosaic.position.set(53.6, 0.008, 94.0); group.add(lunaMosaic);
  light(53.6, 2.9, 93.0, 0xc8e0c0, 3.5, 9, { pendant: FH }).userData.creepy = true;
  light(55.4, 1.4, 96.5, 0xffd0a0, 1.5, 4, 'candle');
  cocoon(57.4, 89.8, 1.2, true); cocoon(49.8, 96.2, 0.9, false);

  // ---------- state ----------
  const shaftOpen = { v: false }, deskOpen = { v: false }, altar = { seq: [], solved: false, shake: 0 };
  let wardOpen = false, wardAnim = 0;
  const api = {
    tiles, boilerNote, silkNote, pepNote, wardrobe: { pos: new THREE.Vector3(41.2, 0, 41.5) }, desk: { pos: new THREE.Vector3(51.4, 0, 81.4) }, countdown: { pos: new THREE.Vector3(57.0, 0, 92.3) },
    get wardOpen() { return wardOpen; },
    get shaftOpen() { return shaftOpen.v; },
    get deskOpen() { return deskOpen.v; },
    get altarSolved() { return altar.solved; },
    openWardrobe() { wardOpen = true; },
    pressTile(t) {
      if (altar.solved || t.pressed) return null;
      t.pressed = true; altar.seq.push(t.key);
      if (altar.seq.length < 4) return 'pressed';
      const ok = altar.seq.every((k, i) => k === ALTAR_ORDER[i]);
      if (ok) { api.solveAltar(); return 'solved'; }
      altar.seq = []; altar.shake = 0.8; setTimeout(() => tiles.forEach(x => { x.pressed = false; }), 900); return 'wrong';
    },
    solveAltar() { altar.solved = true; altar.seq = [...ALTAR_ORDER]; tiles.forEach(x => { x.pressed = true; }); shaftOpen.v = true; removeLocal(gateCol); ctx.doors.cWineEgg.locked = false; },
    openDesk() { deskOpen.v = true; keyTag.visible = true; ctx.doors.fLeaderLinen.locked = false; },
    reset() {
      altar.seq = []; altar.solved = false; tiles.forEach(x => { x.pressed = false; }); shaftOpen.v = false; addLocal(gateCol);
      deskOpen.v = false; keyTag.visible = false; wardOpen = false; wardAnim = 0;
    },
    update(t, dt) {
      tiles.forEach((x, i) => { const target = x.pressed ? 41.08 : 41.12; x.mesh.position.z += (target - x.mesh.position.z) * Math.min(1, dt * 8); if (altar.shake > 0) x.mesh.position.x = 52.4 + i * 0.83 + Math.sin(t * 60 + i) * 0.006 * altar.shake; });
      if (altar.shake > 0) altar.shake -= dt;
      const gt = shaftOpen.v ? 1.55 : 0; shaftG.position.y += (Math.min(gt, 2.4) - shaftG.position.y) * Math.min(1, dt * 1.5);
      if (wardOpen && wardAnim < 1) wardAnim = Math.min(1, wardAnim + dt * 1.4);
      for (const w of wDoors) w.piv.rotation.y = w.s * 1.9 * (1 - Math.pow(1 - wardAnim, 3));
      drawer.position.z = 0.42 + (deskOpen.v ? 0.3 : 0);
    },
  };
  let removeLocal = () => {}, addLocal = () => {};
  api.bindColliders = (rem, addB) => { removeLocal = rem; addLocal = addB; };
  return api;

  // ---------- local builders ----------
  function cocoon(x, z, h, hanging) {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.22 * h * (1 + 0.15 * Math.sin(t * 9)), t * h)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), silk); m.castShadow = true;
    if (hanging) {
      const top = (z > 70 ? FH : CH);
      m.rotation.x = Math.PI; m.position.set(x, top - 0.25, z); group.add(m);
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), silk); thread.position.set(x, top - 0.12, z); group.add(thread);
    } else { m.rotation.z = Math.PI / 2 * 0.9; m.position.set(x, 0.18, z); group.add(m); }
    return m;
  }
  function wrapped(x, z, ry) {
    // a body bound in silk, lying on a low trestle
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    box(g, 0.7, 0.4, 2.0, 0, 0.2, 0, darkWood, null, { cast: false });
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const w = t < 0.12 ? Math.sin(t / 0.12 * Math.PI / 2) * 0.12 : t < 0.2 ? 0.12 - (t - 0.12) * 0.4 : t < 0.55 ? 0.2 : 0.2 - (t - 0.55) * 0.3; pts.push(new THREE.Vector2(Math.max(0.01, w), t * 1.75)); }
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), silk); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.7);
    body.position.set(0, 0.55, -0.87); body.castShadow = true; g.add(body);
  }
}

// ---------- textures ----------
function silkTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#ddd5c4'; g.fillRect(0, 0, 256, 256);
  const r = rand(55);
  for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${200 + r() * 55},${195 + r() * 50},${180 + r() * 40},${0.15 + r() * 0.3})`; g.lineWidth = 0.5 + r(); g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 40, x + (r() - 0.5) * 80, y + (r() - 0.5) * 40, x + (r() - 0.5) * 120, y + (r() - 0.5) * 60); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.12})`; g.beginPath(); g.arc(r() * 256, r() * 256, 4 + r() * 18, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function lacyTex(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  const r = rand(seed + 9); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) { g.beginPath(); g.ellipse(r() * 128, r() * 128, 2 + r() * 7, 2 + r() * 5, r() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noteTex(r) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e4d8bc'; g.fillRect(0, 0, 192, 256);
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(50,35,20,0.45)'; g.fillRect(16, 26 + i * 16, 110 + r() * 50, 1.6); }
  g.fillStyle = 'rgba(120,90,50,0.2)'; g.beginPath(); g.arc(150, 210, 22, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function verseTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 300; const g = c.getContext('2d');
  g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, 256, 300);
  g.strokeStyle = 'rgba(220,200,170,0.75)'; g.font = 'italic 17px Georgia, serif'; g.fillStyle = 'rgba(220,200,170,0.8)';
  ['In the wool she lays her seed;', 'the grub wakes small,', 'and starts to feed;', 'it wraps itself in silk to sleep;', 'and wakes with wings,', 'the dark to keep.'].forEach((l, i) => g.fillText(l, 14, 44 + i * 40));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function stoneIcon(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#8a847a'; g.fillRect(0, 0, 128, 128);
  const r = rand(kind.length * 7); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${60 + r() * 60},${60 + r() * 50},${50 + r() * 40},0.25)`; g.fillRect(r() * 128, r() * 128, 2, 2); }
  g.strokeStyle = '#2e2a26'; g.fillStyle = '#3a342e'; g.lineWidth = 5; g.lineCap = 'round';
  g.strokeRect(6, 6, 116, 116);
  if (kind === 'egg') { for (const [x, y] of [[48, 60], [70, 52], [62, 76], [82, 74]]) { g.beginPath(); g.ellipse(x, y, 10, 13, 0.3, 0, 7); g.stroke(); } }
  if (kind === 'larva') { g.beginPath(); for (let i = 0; i <= 8; i++) { const x = 24 + i * 10, y = 70 + Math.sin(i * 1.1) * 14; g.moveTo(x + 6, y); g.arc(x, y, 6, 0, 7); } g.stroke(); }
  if (kind === 'cocoon') { g.beginPath(); g.ellipse(64, 66, 20, 40, 0, 0, 7); g.stroke(); for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(46, 66 + i * 10); g.quadraticCurveTo(64, 72 + i * 10, 82, 66 + i * 10); g.stroke(); } g.beginPath(); g.moveTo(64, 26); g.lineTo(64, 12); g.stroke(); }
  if (kind === 'wings') { g.beginPath(); g.moveTo(64, 40); g.bezierCurveTo(30, 10, 10, 50, 40, 66); g.bezierCurveTo(20, 90, 50, 110, 64, 80); g.bezierCurveTo(78, 110, 108, 90, 88, 66); g.bezierCurveTo(118, 50, 98, 10, 64, 40); g.stroke(); g.beginPath(); g.moveTo(64, 40); g.lineTo(64, 92); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function countdownTex() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 400; const g = c.getContext('2d');
  g.clearRect(0, 0, 768, 400);
  const r = rand(48);
  g.font = '34px Georgia, serif'; g.textAlign = 'center';
  let n = 0;
  for (let k = 66; k >= 48; k--, n++) {
    const x = 60 + (n % 8) * 92 + (r() - 0.5) * 10, y = 70 + Math.floor(n / 8) * 110 + (r() - 0.5) * 12;
    g.fillStyle = 'rgba(40,30,25,0.8)'; g.fillText(String(k), x, y);
    g.strokeStyle = 'rgba(40,25,20,0.85)'; g.lineWidth = 3;
    if (k > 48) { g.beginPath(); g.moveTo(x - 28, y - 8 + (r() - 0.5) * 8); g.lineTo(x + 28, y - 16 + (r() - 0.5) * 8); g.stroke(); }
    else { g.beginPath(); g.ellipse(x, y - 12, 38, 28, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(x + 1, y - 11, 42, 31, 0.1, 0, 7); g.stroke(); }
  }
  g.font = 'italic 28px Georgia, serif'; g.fillStyle = 'rgba(40,30,25,0.75)'; g.fillText('until I wake', 560, 330);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
