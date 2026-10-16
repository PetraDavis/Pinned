// First-room puzzle: the specimen sequence.
//  - Under lamplight the fireplace mosaic shows five small tiled moths along its lower border.
//  - A specimen cabinet holds seven boxed specimens (five needed, two decoys) and an empty drawer.
//  - Five empty stands with brass plates I-V are spread around the room.
//  - Placing the five specimens in the mosaic's left-to-right order opens a panel in the
//    east wall onto the hallway. A wrong full set rattles and creaks; specimens can be moved.
// Also builds the hallway stub beyond the wall.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { SPECIES, drawSpecimenFit, drawLabel } from '../moths.js';
import { mat, box, rep } from './build.js';

export const SOLUTION = ['rubicunda', 'caja', 'mittrei', 'nerii', 'lubricipeda'];
export const DECOYS = ['io', 'elpenor'];
// Drawer contents (null = an empty drawer)
export const DRAWER_ITEMS = ['caja', 'elpenor', 'rubicunda', null, 'io', 'lubricipeda', 'nerii', 'mittrei'];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

// ---------- specimen boxes ----------
const boxTex = {};
export function specimenCanvas(key) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 420;
  const g = c.getContext('2d');
  g.fillStyle = '#d8ceb2'; g.fillRect(0, 0, 512, 420);
  const gr = g.createRadialGradient(256, 160, 40, 256, 210, 320); gr.addColorStop(0, 'rgba(255,250,235,0.25)'); gr.addColorStop(1, 'rgba(90,70,40,0.25)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 420);
  drawSpecimenFit(g, key, 40, 18, 432, 280);
  drawLabel(g, key, 256, 308, 300, 'Ord. P.W.');
  return c;
}
function specimenTexture(key) {
  if (!boxTex[key]) { const t = new THREE.CanvasTexture(specimenCanvas(key)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; boxTex[key] = t; }
  return boxTex[key];
}
// A small glass-topped specimen box; its face points along +z.
function makeSpecimenBox(key) {
  const g = new THREE.Group();
  const wood = mat({ map: tex.wood, color: 0x7a5a40, roughness: 0.55 });
  const W = 0.34, H = 0.28, D = 0.05;
  for (const [w, h, x, y] of [[W, 0.02, 0, H / 2], [W, 0.02, 0, -H / 2], [0.02, H, -W / 2, 0], [0.02, H, W / 2, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), wood); b.position.set(x, y, 0); b.castShadow = true; g.add(b);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ map: specimenTexture(key), roughness: 0.85 }));
  back.position.z = -D / 2 + 0.004; g.add(back);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, H - 0.02), new THREE.MeshStandardMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.14, roughness: 0.05, metalness: 0.9, depthWrite: false }));
  glass.position.z = D / 2 - 0.004; glass.renderOrder = 2; g.add(glass);
  g.userData.key = key;
  return g;
}

// ---------- cabinet ----------
function labelTex(key) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#eee4c8'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#6a5030'; g.lineWidth = 3; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = '#2a1c10'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!key) { g.font = 'italic 26px Georgia, serif'; g.fillText('(vacant)', 128, 48); }
  else {
    const fit = (txt, font, px, y) => { g.font = font(px); const w = g.measureText(txt).width; if (w > 228) g.font = font(px * 228 / w); g.fillText(txt, 128, y); };
    fit(SPECIES[key].latin, px => `italic ${px}px "Segoe Script", "Lucida Handwriting", cursive`, 26, 38);
    fit(SPECIES[key].common, px => `${px}px Georgia, serif`, 18, 70);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildCabinet(group, local, x, z) {
  const wood = mat({ map: tex.wood, color: 0x8a6a50, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const cab = new THREE.Group(); cab.position.set(x, 0, z); group.add(cab);
  box(cab, 1.7, 1.2, 0.62, 0, 0.64, 0, wood);
  box(cab, 1.8, 0.06, 0.7, 0, 1.27, 0.02, wood);
  for (const sx of [-1, 1]) box(cab, 0.08, 0.06, 0.08, sx * 0.78, 0.03, 0.25, wood);
  local.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.35, maxZ: z + 0.38 });
  const drawers = [];
  DRAWER_ITEMS.forEach((key, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const d = new THREE.Group();
    d.position.set(-0.4 + col * 0.8, 1.09 - row * 0.27, 0.31);
    cab.add(d);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.24, 0.03), wood);
    front.castShadow = front.receiveShadow = true; d.add(front);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.5), wood); tray.position.set(0, -0.02, -0.26); d.add(tray);
    const holder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.01), brass); holder.position.set(0, 0.045, 0.018); d.add(holder);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.095), new THREE.MeshStandardMaterial({ map: labelTex(key), roughness: 0.9 }));
    label.position.set(0, 0.045, 0.024); d.add(label);
    const pull = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 16, Math.PI), brass);
    pull.rotation.z = Math.PI; pull.position.set(0, -0.06, 0.03); d.add(pull);
    d.userData = { label: key, item: null, open: 0, target: 0 };
    for (const m of [front, label, pull, holder]) m.userData.drawer = d;
    drawers.push(d);
  });
  return { cab, drawers, pickables: drawers.flatMap(d => d.children.filter(c => c.userData.drawer)) };
}

// ---------- stands ----------
function numeralTex(n) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 48;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 48); gr.addColorStop(0, '#d8b468'); gr.addColorStop(0.5, '#a07a34'); gr.addColorStop(1, '#6a4e1c');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 48);
  g.strokeStyle = 'rgba(255,240,200,0.5)'; g.lineWidth = 2; g.strokeRect(3, 3, 122, 42);
  g.fillStyle = '#2a1c08'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 64, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Stand definitions in room-local coordinates: position of the frame centre and the way it faces.
export const STANDS = [
  { pos: [-6.96, 1.65, 1.3], ry: Math.PI / 2 },   // I   left wall, by the clock
  { pos: [-2.5, 1.75, -4.96], ry: 0 },            // II  back wall, left of the fireplace
  { pos: [6.7, 0.9, -0.6], ry: -Math.PI / 2, easel: true }, // III on the sideboard
  { pos: [5.4, 1.7, 4.96], ry: Math.PI },         // IV  window wall, right
  { pos: [-4.2, 1.7, 4.96], ry: Math.PI },        // V   window wall, left
];
export function buildStands(group) {
  const wood = mat({ map: tex.wood, color: 0x5a4030, roughness: 0.6 });
  const felt = mat({ color: 0x2a2224, roughness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  return STANDS.map((s, i) => {
    const g = new THREE.Group(); g.position.set(...s.pos); g.rotation.y = s.ry; group.add(g);
    const holder = new THREE.Group(); g.add(holder);
    if (s.easel) {
      holder.position.set(0, 0.26, 0.02); holder.rotation.x = -0.18;
      for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), wood); leg.position.set(sx * 0.14, 0.24, 0.02); leg.rotation.x = -0.18; g.add(leg); }
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.46, 0.025), wood); back.position.set(0, 0.22, -0.1); back.rotation.x = 0.35; g.add(back);
    }
    // frame: a recessed felt panel with a little brass hook
    const frame = new THREE.Group(); holder.add(frame);
    const f = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), wood); m.position.set(x, y, 0.02); m.castShadow = true; frame.add(m); };
    f(0.46, 0.04, 0, 0.19); f(0.46, 0.04, 0, -0.19); f(0.04, 0.42, -0.21, 0); f(0.04, 0.42, 0.21, 0);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.36), felt); panel.position.z = 0.006; frame.add(panel);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.05), new THREE.MeshStandardMaterial({ map: numeralTex(NUMERALS[i]), metalness: 0.6, roughness: 0.4 }));
    plate.position.set(0, -0.25, 0.03); holder.add(plate);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 6, 12), brass); hook.position.set(0, 0.17, 0.03); frame.add(hook);
    const slot = new THREE.Group(); slot.position.set(0, 0, 0.04); holder.add(slot);
    return { index: i, group: g, holder, slot, item: null, shake: 0 };
  });
}

// ---------- the puzzle state ----------
export function createPuzzle(group, local, cabinetPos) {
  const cabinet = buildCabinet(group, local, cabinetPos.x, cabinetPos.z);
  const stands = buildStands(group);
  const boxes = {};
  for (const key of [...SOLUTION, ...DECOYS]) boxes[key] = makeSpecimenBox(key);
  const putInDrawer = (d, key) => {
    d.userData.item = key;
    if (!key) return;
    const b = boxes[key]; b.position.set(0, 0.07, -0.26); b.rotation.set(-Math.PI / 2, 0, 0); b.visible = true; d.add(b);
  };
  const putOnStand = (s, key) => {
    s.item = key;
    if (!key) return;
    const b = boxes[key]; b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.visible = true; s.slot.add(b);
  };
  const remove = key => { const b = boxes[key]; if (b.parent) b.parent.remove(b); };
  const P = {
    cabinet, stands, held: null, solved: false,
    reset() {
      P.held = null; P.solved = false;
      for (const k in boxes) remove(k);
      cabinet.drawers.forEach((d, i) => { d.userData.target = d.userData.open = 0; d.position.z = 0.31; putInDrawer(d, DRAWER_ITEMS[i]); });
      stands.forEach(s => { s.item = null; });
    },
    solveInstantly() {
      P.held = null;
      for (const k in boxes) remove(k);
      cabinet.drawers.forEach(d => { d.userData.item = null; });
      stands.forEach((s, i) => putOnStand(s, SOLUTION[i]));
      cabinet.drawers.forEach((d, i) => { if (DECOYS.includes(DRAWER_ITEMS[i])) putInDrawer(d, DRAWER_ITEMS[i]); });
      P.solved = true;
    },
    takeFromDrawer(d) { const k = d.userData.item; remove(k); d.userData.item = null; P.held = k; return k; },
    putIntoDrawer(d) { const k = P.held; P.held = null; putInDrawer(d, k); return k; },
    // Place/take/swap at a stand. Returns 'placed' | 'taken' | 'swapped'.
    useStand(s) {
      const had = s.item, hand = P.held;
      if (had) remove(had);
      s.item = null;
      if (hand) putOnStand(s, hand);
      P.held = had || null;
      return hand && had ? 'swapped' : hand ? 'placed' : 'taken';
    },
    filled() { return stands.every(s => s.item); },
    correct() { return stands.every((s, i) => s.item === SOLUTION[i]); },
    rattle() { stands.forEach(s => { s.shake = 1; }); },
    update(dt, t) {
      for (const d of cabinet.drawers) { d.userData.open += (d.userData.target - d.userData.open) * Math.min(1, dt * 6); d.position.z = 0.31 + d.userData.open * 0.32; }
      for (const s of stands) {
        if (s.shake > 0) { s.shake = Math.max(0, s.shake - dt * 1.4); s.holder.rotation.z = Math.sin(t * 60) * 0.04 * s.shake; s.slot.position.x = Math.sin(t * 47) * 0.01 * s.shake; }
      }
    },
  };
  P.reset();
  return P;
}

// ---------- hallway ----------
// Short, dim hallway beyond the room's east wall (room-local coordinates).
// The old door (z 2.0..3.2) opens onto it but is stuck; the secret panel is at z 3.4..4.6.
export const HALL = { X0: 7.3, X1: 20, Z0: 1.4, Z1: 4.8 };
export function buildHallway(group, local) {
  const { X0, X1, Z0, Z1 } = HALL, H = 3.6, zc = (Z0 + Z1) / 2;
  const wall = mat({ map: rep(tex.wallpaper, 4, 1), color: 0x8a8c90 });
  const wains = mat({ map: tex.wood, color: 0x5a4a3e });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), mat({ map: rep(tex.floor, 3, 0.8), color: 0xa09888 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((X0 + X1) / 2, 0, zc); floor.receiveShadow = true; group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), mat({ color: 0x3a3a3a }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((X0 + X1) / 2, H, zc); group.add(ceil);
  box(group, X1 - X0, H, 0.2, (X0 + X1) / 2, H / 2, Z0 - 0.1, wall, local);
  box(group, X1 - X0, H, 0.2, (X0 + X1) / 2, H / 2, Z1 + 0.1, wall, local);
  box(group, 0.2, H, Z1 - Z0, X1 + 0.1, H / 2, zc, wall, local);
  for (const z of [Z0 + 0.02, Z1 - 0.02]) {
    box(group, X1 - X0, 0.95, 0.03, (X0 + X1) / 2, 0.47, z, wains, null, { cast: false });
    box(group, X1 - X0, 0.05, 0.06, (X0 + X1) / 2, 0.97, z, wains, null, { cast: false });
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 1, 1.2), mat({ map: tex.rug, color: 0x9a8a8a }));
  rug.rotation.x = -Math.PI / 2; rug.position.set((X0 + X1) / 2 + 0.5, 0.01, zc); group.add(rug);
  const doorMat = mat({ map: tex.wood, color: 0x8a7462 });
  box(group, 0.08, 2.5, 1.2, X1 - 0.02, 1.25, zc, doorMat, null, { cast: false });
  box(group, 1.2, 2.5, 0.08, 15, 1.25, Z0 + 0.02, doorMat, null, { cast: false });
  box(group, 0.9, 0.8, 0.4, 12, 0.4, Z1 - 0.25, wains, local);
  const frame = new THREE.MeshStandardMaterial({ color: 0x5a4a2a, metalness: 0.5, roughness: 0.5 });
  box(group, 0.9, 1.1, 0.05, 12, 2.1, Z1 - 0.03, frame, null, { cast: false });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), mat({ map: tex.painting })); pic.position.set(12, 2.1, Z1 - 0.06); pic.rotation.y = Math.PI; group.add(pic);
  const sconces = [];
  for (const x of [10, 17]) {
    const s = new THREE.PointLight(0xffa860, 3.5, 7, 1.6); s.position.set(x, 2.3, Z0 + 0.3); group.add(s); sconces.push(s);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb070 })); glass.position.copy(s.position); group.add(glass);
    box(group, 0.06, 0.25, 0.12, x, 2.15, Z0 + 0.12, frame, null, { cast: false });
  }
  return {
    endDoor: new THREE.Vector3(X1 - 0.6, 0, zc), sideDoor: new THREE.Vector3(15, 0, Z0 + 0.6),
    spawn: new THREE.Vector3(8.4, 0, 4.0),
    update(t) { sconces.forEach((s, i) => { s.intensity = 3.5 * (0.9 + Math.sin(t * 7 + i * 3) * 0.05 + Math.sin(t * 13 + i) * 0.04); }); },
  };
}
