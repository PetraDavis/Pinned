// Tutorial puzzle for the first room:
//  - under lamplight, three gilt tiles in the mosaic's wing show tiny skulls
//  - a specimen cabinet has six drawers labelled by species
//  - the death's-head hawkmoth drawer holds the brass key to the door
// Also builds the hallway stub beyond the door.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { SPECIES } from '../moths.js';
import { mat, box, rect, rep } from './build.js';

export const DRAWERS = ['luna', 'betularia', 'atropos', 'mori', 'rhipheus', 'calyptra'];
export const KEY_DRAWER = 'atropos';
export const FLAVOUR = {
  luna: 'Pale green wings, folded in tissue paper. Nothing else.',
  betularia: 'Dozens of peppered moths, some white, some soot-black. No key.',
  mori: 'Silk cocoons, still whole. Something inside one of them rattles. Best leave it.',
  rhipheus: 'Iridescent scraps of wing. They catch the light like oil on water. Empty otherwise.',
  calyptra: 'A note in faded ink: "It drinks." The drawer is otherwise empty.',
};

// Gilt tiles with skulls, laid over the mosaic's left forewing; hidden until the lamp is lit.
export function buildMosaicClue(group, mosaicPos, mosaicSize) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const tile = 44;
  // positions in mosaic UV space (0..1), on the upper-left wing near the eyespot
  for (const [u, v] of [[0.29, 0.34], [0.37, 0.3], [0.34, 0.42]]) {
    const x = u * 512, y = v * 512;
    const gr = g.createLinearGradient(x - tile / 2, y - tile / 2, x + tile / 2, y + tile / 2);
    gr.addColorStop(0, '#f2d27a'); gr.addColorStop(0.5, '#b8902e'); gr.addColorStop(1, '#7a5a18');
    g.fillStyle = gr; g.fillRect(x - tile / 2, y - tile / 2, tile, tile);
    // the skull
    g.fillStyle = '#2a1a08';
    g.beginPath(); g.ellipse(x, y - 3, 12, 12, 0, 0, 7); g.fill();
    g.fillRect(x - 7, y + 4, 14, 9);
    g.fillStyle = '#e8c868';
    g.beginPath(); g.arc(x - 4.6, y - 3, 3.4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 4.6, y - 3, 3.4, 0, 7); g.fill();
    g.fillRect(x - 5, y + 7, 1.8, 6); g.fillRect(x - 0.9, y + 7, 1.8, 6); g.fillRect(x + 3.2, y + 7, 1.8, 6);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(mosaicSize, mosaicSize),
    new THREE.MeshStandardMaterial({ map: t, transparent: true, metalness: 0.85, roughness: 0.3, emissive: 0x3a2808, emissiveMap: t }));
  m.position.copy(mosaicPos); m.position.z += 0.012; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; m.visible = false; group.add(m);
  return m;
}

function labelTex(key) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#eee4c8'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = '#6a5030'; g.lineWidth = 3; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = '#2a1c10'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 26px "Segoe Script", "Lucida Handwriting", cursive';
  g.fillText(SPECIES[key].latin, 128, 38);
  g.font = '18px Georgia, serif'; g.fillText(SPECIES[key].common, 128, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Specimen cabinet with six drawers; returns drawer meshes for ray picking.
export function buildCabinet(group, local, x, z) {
  const wood = mat({ map: tex.wood, color: 0x8a6a50, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const cab = new THREE.Group(); cab.position.set(x, 0, z); group.add(cab);
  box(cab, 1.7, 1.15, 0.62, 0, 0.62, 0, wood);
  box(cab, 1.8, 0.06, 0.7, 0, 1.22, 0.02, wood);
  for (const sx of [-1, 1]) box(cab, 0.08, 0.1, 0.08, sx * 0.78, 0.05, 0.25, wood);
  local.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.35, maxZ: z + 0.38 });
  const drawers = [];
  DRAWERS.forEach((key, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const d = new THREE.Group();
    d.position.set(-0.4 + col * 0.8, 1.0 - row * 0.33, 0.31);
    cab.add(d);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.29, 0.03), wood);
    front.castShadow = front.receiveShadow = true; d.add(front);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.5), wood); tray.position.set(0, -0.02, -0.26); d.add(tray);
    const holder = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.01), brass); holder.position.set(0, 0.05, 0.018); d.add(holder);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.1), new THREE.MeshStandardMaterial({ map: labelTex(key), roughness: 0.9 }));
    label.position.set(0, 0.05, 0.024); d.add(label);
    const pull = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 16, Math.PI), brass);
    pull.rotation.z = Math.PI; pull.position.set(0, -0.06, 0.03); d.add(pull);
    if (key === KEY_DRAWER) {
      const key3 = brassKey(brass); key3.position.set(0, 0.09, -0.2); key3.rotation.x = -Math.PI / 2; d.add(key3);
      d.userData.keyMesh = key3;
    }
    d.userData = { ...d.userData, key, open: 0, target: 0 };
    front.userData.drawer = d; label.userData.drawer = d; pull.userData.drawer = d; holder.userData.drawer = d;
    drawers.push(d);
  });
  return { cab, drawers, pickables: drawers.flatMap(d => d.children.filter(c => c.userData.drawer)) };
}

function brassKey(m) {
  const k = new THREE.Group();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 20), m); bow.position.x = -0.07; k.add(bow);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), m); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.02; k.add(shaft);
  for (const [x, h] of [[0.06, 0.03], [0.075, 0.022]]) { const bit = new THREE.Mesh(new THREE.BoxGeometry(0.008, h, 0.005), m); bit.position.set(x, -h / 2, 0); k.add(bit); }
  return k;
}

// Short, dim hallway beyond the room's east door (room-local coordinates; door at x=7, z=2.6).
export function buildHallway(group, local) {
  const X0 = 7.3, X1 = 20, Z0 = 1.4, Z1 = 3.8, H = 3.6, zc = (Z0 + Z1) / 2;
  const wall = mat({ map: rep(tex.wallpaper, 4, 1), color: 0x8a8c90 });
  const wains = mat({ map: tex.wood, color: 0x5a4a3e });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), mat({ map: rep(tex.floor, 3, 0.6), color: 0xa09888 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((X0 + X1) / 2, 0, zc); floor.receiveShadow = true; group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), mat({ color: 0x3a3a3a }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((X0 + X1) / 2, H, zc); group.add(ceil);
  box(group, X1 - X0, H, 0.2, (X0 + X1) / 2, H / 2, Z0 - 0.1, wall, local);
  box(group, X1 - X0, H, 0.2, (X0 + X1) / 2, H / 2, Z1 + 0.1, wall, local);
  box(group, 0.2, H, Z1 - Z0, X1 + 0.1, H / 2, zc, wall, local);
  // wainscot panelling and dado rail
  for (const z of [Z0 + 0.02, Z1 - 0.02]) {
    box(group, X1 - X0, 0.95, 0.03, (X0 + X1) / 2, 0.47, z, wains, null, { cast: false });
    box(group, X1 - X0, 0.05, 0.06, (X0 + X1) / 2, 0.97, z, wains, null, { cast: false });
  }
  // runner rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 1, 1.1), mat({ map: tex.rug, color: 0x9a8a8a }));
  rug.rotation.x = -Math.PI / 2; rug.position.set((X0 + X1) / 2, 0.01, zc); group.add(rug);
  // locked doors: one at the end, one on the side
  const doorMat = mat({ map: tex.wood, color: 0x7a6a5a });
  box(group, 0.08, 2.5, 1.2, X1 - 0.02, 1.25, zc, doorMat, null, { cast: false });
  box(group, 1.2, 2.5, 0.08, 15, 1.25, Z0 + 0.02, doorMat, null, { cast: false });
  // side table, a painting and dim gas sconces
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
    spawn: new THREE.Vector3(8.3, 0, zc),
    update(t) { sconces.forEach((s, i) => { s.intensity = 3.5 * (0.9 + Math.sin(t * 7 + i * 3) * 0.05 + Math.sin(t * 13 + i) * 0.04); }); },
  };
}
