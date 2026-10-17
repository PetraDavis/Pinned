// The rest of the house: every blueprint room that was not built yet, and the rooms behind
// the doors that used to be locked props. None of them carries a puzzle and none of them is
// on the way anywhere: the single route through the house is unchanged.
//
// Built in the room zone's group, in its local coordinates, so each room lands in its floor's
// section (firstRoom.js draws only the floor the player is on). Static parts are merged into
// one mesh per material per room; lights are ordinary gas/candle lights (capped by caps.js).
//
//   Ground floor  Conservatory (x 20.4..33.8, z -12.6..-8.2): the glass lean-to north of the
//                 Grand Hall, through its (now unlocked) north door.
//   First floor   Bathroom (x 49.25..53.45, z 86.3..89.1): between the Leader's and Luna's
//                 bedrooms, its two swollen doors now open.
//                 West Corridor (x 27.5..29.8, z 84..96.8): through a new door in the Library's
//                 west wall; the members' coats, portraits, a stopped clock, and an iron
//                 turret stair up to
//                 the Observatory (centre x 10, z 100): a domed room with an open slit, a brass
//                 telescope on the moon, star charts and moth-and-moon diagrams.
//                 The Nursery's door into the Leader's room is unbolted.
//   Catacombs     Bogong Cave (x 47.8..57, z 130..141.2): a natural cave the Order broke into,
//                 north of the Tomb Hall; its rock is covered in sleeping moths.
//                 Burial Niches (x 33..43.1, z 133..141.9): loculi with the members' names,
//                 west of the Flooded Crypt, also off the Tomb Hall.
//   Cellar        the wardrobe's moth swarm (api.wardrobeSwarm()).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tex } from '../textures.js';
import { mat, rep, rect, rand } from './build.js';
import { gasLampFixture } from './fixtures.js';
import { spunCocoon, mergeSilk, animSilk } from './cocoon.js';
import { silkTex } from './lowerUpper.js';
import { mothPlaneTex } from './catacombs.js';
import '../roomMoths.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const OBS = { x: 10, z: 100, R: 4.2, WH: 2.6 };
export const EXTRA = {
  turretFoot: V(28.65, 86.25),   // the corridor's turret stair (interaction point)
  corridorArrive: V(28.65, 87.1),
  obsCentre: V(OBS.x, OBS.z),
  obsHatch: V(10, 103.1),        // the stair head in the observatory floor
  obsArrive: V(10, 101.9),
  telescope: V(10, 101.05),
  obsCharts: V(7.41, 98.12), obsDiagram: V(12.12, 97.6), obsLog: V(7.25, 100.0),
  sheet: V(30.3, -9.95), pottingBook: V(32.6, -10.6), teaTable: V(24.6, -9.6),
  bath: V(52.0, 87.35), washstand: V(50.35, 88.05),
  coats: V(28.2, 89.6), portraits: V(29.1, 94.6), clock: V(29.0, 88.05), visitorsBook: V(29.0, 95.6),
  caveCamp: V(49.4, 135.4), caveWall: V(54.2, 134.0), caveEntry: V(50.6, 140.2),
  niches: V(38.0, 134.4), bier: V(38.3, 136.2), photo: V(34.4, 138.3),
};
const OBS_SKY_Y = 0;

export function buildExtraRooms(ctx) {
  const { group, local, wall, plane, door, light, doors } = ctx;
  const r = rand(5150);
  // ---------- materials ----------
  const wood = mat({ map: tex.wood, color: 0x6a5444 });
  const darkWood = mat({ map: tex.wood, color: 0x3e2c22 });
  const oak = mat({ map: tex.wood, color: 0x8a6a4a });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2826, metalness: 0.8, roughness: 0.55 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x4a3426, metalness: 0.5, roughness: 0.8 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.35 });
  const dullBrass = new THREE.MeshStandardMaterial({ color: 0x7a6430, metalness: 0.8, roughness: 0.55 });
  const silk = new THREE.MeshStandardMaterial({ map: silkTex(), color: 0xd8d8d8, roughness: 0.85, emissive: 0x1a1814, side: THREE.DoubleSide });
  const plaster = mat({ color: 0x3a3836 });
  const stoneW = mat({ map: tex.stone, color: 0x5e5a54, roughness: 0.85 });   // world-mapped
  const brick = mat({ map: tex.stone, color: 0x7a5a4a, roughness: 1 });
  const render = mat({ map: tex.stone, color: 0x8a8a88, roughness: 0.95 });
  const paperGrey = (x, y, c = 0x76787c) => mat({ map: rep(tex.wallpaper, x, y), color: c });
  const fabric = (c) => mat({ map: tex.fabric, color: c, roughness: 1 });
  const linen = mat({ map: tex.sheet || tex.fabric, color: 0xd8d2c0, roughness: 1, side: THREE.DoubleSide });
  const wax = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.7 });
  const enamel = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.28, side: THREE.DoubleSide });
  const marble = mat({ map: tex.stone, color: 0xb8b4ac, roughness: 0.35 });
  const blackWater = new THREE.MeshStandardMaterial({ color: 0x0a0c0c, roughness: 0.05, metalness: 0.4 });
  const glassDark = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.75 });
  const terracotta = mat({ color: 0x8a4a32, roughness: 0.95 });
  const deadPlant = mat({ color: 0x4a3a26, roughness: 1 });
  const soil = mat({ color: 0x1e1610, roughness: 1 });
  const black = new THREE.MeshBasicMaterial({ color: 0x030303 });

  const lists = new Map();
  const silkGeos = { ground: [], first: [], cat: [] }, threads = { ground: [], first: [], cat: [] };
  const anim = []; // per-frame updaters for small moving things (each checks its section is drawn)

  // ---------- merge helpers ----------
  const m4 = new THREE.Matrix4(), eul = new THREE.Euler(), qq = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3();
  function push(material, g) {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    if (!lists.has(material)) lists.set(material, []);
    lists.get(material).push(n);
  }
  // add a geometry with a transform; uv > 0 maps the texture in world space at that scale
  function add(material, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, uv = 0, sc = null) {
    eul.set(rx, ry, rz, 'YXZ'); qq.setFromEuler(eul); m4.compose(pp.set(x, y, z), qq, sc || ss.set(1, 1, 1));
    const g = geo.index ? geo.toNonIndexed() : geo; g.applyMatrix4(m4);
    if (uv) worldUV(g, uv);
    push(material, g);
  }
  const B = (m, w, h, d, x, y, z, ry = 0, uv = 0) => add(m, new THREE.BoxGeometry(w, h, d), x, y, z, ry, 0, 0, uv);
  const C = (m, rt, rb, h, x, y, z, seg = 12, rx = 0, rz = 0, ry = 0) => add(m, new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, ry, rx, rz);
  // bake a built THREE.Group (its meshes) into the merge lists
  function bake(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse(o => { if (o.isMesh) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); push(o.material, g); } });
  }
  function flush() {
    for (const [m, gs] of lists) {
      const mesh = new THREE.Mesh(mergeGeometries(gs, false), m);
      mesh.receiveShadow = true; mesh.castShadow = !m.transparent; group.add(mesh);
    }
    lists.clear();
  }
  const col = (x0, x1, z0, z1) => rect(local, Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1));
  const cocoon = (fl, x, z, h, hanging, top) => spunCocoon(x, z, h, hanging, top, silkGeos[fl], threads[fl]);
  // a picture: a plane with its own texture (charts, labels, portraits)
  function pic(texture, w, h, x, y, z, ry = 0, opts = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, transparent: !!opts.alpha, alphaTest: opts.alpha ? 0.25 : 0, side: opts.double ? THREE.DoubleSide : THREE.FrontSide }));
    m.position.set(x, y, z); m.rotation.y = ry; if (opts.rx) m.rotation.x = opts.rx; m.receiveShadow = true; group.add(m); return m;
  }
  const cobweb = (x, y, z, ry, s = 0.8) => { const w = pic(tex.web, s, s, x, y, z, ry, { alpha: true, double: true }); w.material.opacity = 0.6; w.material.depthWrite = false; return w; };

  // ======================================================================================
  // GROUND FLOOR: the Conservatory, north of the Grand Hall
  // ======================================================================================
  {
    const X0 = 20.4, X1 = 33.8, Z0 = -12.6, Z1 = -8.2, HL = 3.3, HH = 4.8, SILL = 0.72;
    const GZ = Z0 - 0.12, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const roofY = z => HL + (HH - HL) * (z - GZ) / (Z1 - GZ);
    doors.conservatory.locked = false;
    doors.conservatory.openMsg = 'Cold glass, and the smell of dead leaves. Moths beat softly on the panes.';
    plane(X1 - X0 + 0.2, Z1 - Z0, cx, 0, cz, mat({ map: rep(tex.stone, 6, 2), color: 0x67645e, roughness: 0.9 }));
    // dwarf walls of brick under the glass, a stone sill on them
    B(brick, X1 - X0 + 0.5, SILL, 0.25, cx - 0.12, SILL / 2, GZ, 0, 0.9);
    B(brick, 0.25, SILL, Z1 - GZ, X0 - 0.12, SILL / 2, (GZ + Z1) / 2, 0, 0.9);
    B(stoneW, X1 - X0 + 0.6, 0.06, 0.34, cx - 0.12, SILL + 0.03, GZ, 0, 0.7);
    B(stoneW, 0.34, 0.06, Z1 - GZ, X0 - 0.12, SILL + 0.03, (GZ + Z1) / 2, 0, 0.7);
    col(X0 - 0.3, X1 + 0.3, GZ - 0.2, Z0); col(X0 - 0.3, X0, GZ - 0.2, Z1);
    // east: the house's own rendered wall (the kitchen is behind it), cut to the roof line
    {
      const g = new THREE.BoxGeometry(0.25, 1, Z1 - GZ + 0.15); g.translate(X1 + 0.125, 0.5, (GZ + Z1) / 2);
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.5) p.setY(i, roofY(p.getZ(i)) + 0.12);
      g.computeVertexNormals(); add(render, g, 0, 0, 0, 0, 0, 0, 0.6);
      col(X1, X1 + 0.3, GZ - 0.2, Z1);
    }
    // the glass: north wall, west wall (cut to the roof slope) and the sloping roof
    const glass = new THREE.MeshStandardMaterial({ map: glassTex(), color: 0xc8d0c8, roughness: 0.12, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const ivy = new THREE.MeshStandardMaterial({ map: ivyTex(), roughness: 0.9, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
    {
      const gn = new THREE.PlaneGeometry(X1 - X0 + 0.25, HL - SILL); gn.translate(cx - 0.12, SILL + (HL - SILL) / 2, GZ); push(glass, gn);
      const gw = new THREE.PlaneGeometry(Z1 - GZ, 1); gw.rotateY(Math.PI / 2); gw.translate(X0 - 0.12, 0.5, (GZ + Z1) / 2);
      const p = gw.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0.5 ? roofY(p.getZ(i)) : SILL);
      push(glass, gw);
      const gr = new THREE.PlaneGeometry(1, 1), q = gr.attributes.position;
      [[X0 - 0.12, HH, Z1], [X1, HH, Z1], [X0 - 0.12, HL, GZ], [X1, HL, GZ]].forEach(([x, y, z], i) => q.setXYZ(i, x, y, z));
      gr.computeVertexNormals(); push(glass, gr);
      // ivy pressed against the outside of the panes, thickest low down and in the corners
      for (const [x, y, z, w, h, ry] of [[21.6, 1.5, GZ - 0.04, 2.4, 1.6, 0], [31.6, 1.3, GZ - 0.04, 2.8, 1.2, 0], [26.4, 2.7, GZ - 0.04, 1.6, 1.0, 0], [X0 - 0.16, 1.6, -11.6, 1.8, 1.7, Math.PI / 2], [X0 - 0.16, 2.6, -9.2, 1.4, 1.2, Math.PI / 2]])
        add(ivy, new THREE.PlaneGeometry(w, h), x, y, z, ry);
    }
    // cast-iron glazing bars
    for (let x = X0 - 0.12; x <= X1 + 0.01; x += 0.67) B(iron, 0.04, HL - SILL, 0.05, x, SILL + (HL - SILL) / 2, GZ);
    for (let z = GZ; z <= Z1 + 0.01; z += 0.63) { const h = roofY(z) - SILL; B(iron, 0.05, h, 0.04, X0 - 0.12, SILL + h / 2, z); }
    for (const y of [SILL + 0.05, 2.1, HL]) B(iron, X1 - X0 + 0.3, 0.05, 0.06, cx - 0.1, y, GZ);
    const sl = Math.hypot(HH - HL, Z1 - GZ), sa = Math.atan2(HH - HL, Z1 - GZ);
    for (let x = X0 - 0.12; x <= X1 + 0.01; x += 0.67) add(iron, new THREE.BoxGeometry(0.045, 0.07, sl), x, (HL + HH) / 2, (GZ + Z1) / 2, 0, -sa);
    add(iron, new THREE.BoxGeometry(X1 - X0 + 0.3, 0.08, 0.08), cx - 0.1, (HL + HH) / 2 + 0.02, (GZ + Z1) / 2, 0, -sa);
    B(iron, X1 - X0 + 0.3, 0.1, 0.1, cx - 0.1, HH - 0.02, Z1 - 0.05);
    // outside, by moonlight: the overgrown garden, painted on a backdrop that ignores the fog
    {
      const back = new THREE.MeshBasicMaterial({ map: gardenTex(), fog: false });
      const n = new THREE.Mesh(new THREE.PlaneGeometry(34, 15), back); n.position.set(27, 4.6, -19.5); group.add(n);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 15), back); w.position.set(14.5, 4.6, -13.2); w.rotation.y = Math.PI / 2; group.add(w);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(26, 12.8), new THREE.MeshBasicMaterial({ color: 0x0e1422, fog: false })); top.rotation.x = Math.PI / 2; top.position.set(25, 10, -14.6); group.add(top);
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(20, 7), mat({ color: 0x1c2218, roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(24.5, -0.02, -16.2); group.add(lawn);
      const lawn2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 6.4), lawn.material); lawn2.rotation.x = -Math.PI / 2; lawn2.position.set(17.3, -0.02, -11.1); group.add(lawn2);
      const leafy = mat({ color: 0x141c12, roughness: 1 });
      for (const [x, z, s] of [[22.0, -14.0, 1.4], [25.6, -15.0, 1.1], [31.0, -14.2, 1.6], [18.6, -10.5, 1.3], [18.2, -13.6, 1.0], [34.5, -15.6, 1.8]])
        add(leafy, new THREE.IcosahedronGeometry(1, 1), x, s * 0.6, z, r() * 3, 0, 0, 0, new THREE.Vector3(s, s * 0.8, s));
      const moon = new THREE.SpotLight(0x8a9ad0, 26, 28, 0.6, 0.8, 1.3); moon.position.set(19, 12, -20); moon.target.position.set(27, 0, -10.4); group.add(moon, moon.target);
    }
    // staging benches along the glass, with pots of dead plants
    for (let x = 20.9; x < 33.4; x += 1.25) for (const z of [-12.5, -12.05]) B(wood, 0.05, 0.78, 0.05, x, 0.39, z);
    for (let k = 0; k < 6; k++) B(wood, 12.6, 0.025, 0.07, 27.15, 0.79, -12.5 + k * 0.09);
    for (let k = 0; k < 4; k++) B(wood, 12.6, 0.025, 0.07, 27.15, 0.32, -12.45 + k * 0.12);
    col(20.75, 33.5, -12.6, -11.95);
    for (let i = 0; i < 20; i++) {
      const x = 21.1 + i * 0.6 + (r() - 0.5) * 0.15, z = -12.3 + (r() - 0.5) * 0.25, lowRow = i % 5 === 2;
      const y = lowRow ? 0.33 : 0.8, k = 0.8 + r() * 0.5;
      if (r() < 0.12) { add(terracotta, new THREE.CylinderGeometry(0.1 * k, 0.075 * k, 0.17 * k, 12), x, y + 0.08, z, r() * 3, 0, Math.PI / 2); add(soil, new THREE.CircleGeometry(0.16, 10), x + 0.1, y + 0.03, z + 0.05, 0, -Math.PI / 2); continue; }
      add(terracotta, new THREE.CylinderGeometry(0.1 * k, 0.075 * k, 0.17 * k, 12), x, y + 0.085 * k, z);
      add(soil, new THREE.CircleGeometry(0.09 * k, 10), x, y + 0.16 * k, z, 0, -Math.PI / 2);
      for (let s = 0; s < 3; s++) add(deadPlant, new THREE.CylinderGeometry(0.004, 0.008, 0.35 + r() * 0.4, 4), x + (r() - 0.5) * 0.05, y + 0.32 * k, z + (r() - 0.5) * 0.05, r() * 3, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9);
    }
    // dead palms in Versailles tubs
    for (const [x, z] of [[21.25, -8.85], [32.95, -8.85]]) {
      B(darkWood, 0.62, 0.6, 0.62, x, 0.3, z, 0, 0); for (const y of [0.12, 0.5]) B(iron, 0.64, 0.04, 0.64, x, y, z);
      add(soil, new THREE.PlaneGeometry(0.58, 0.58), x, 0.6, z, 0, -Math.PI / 2);
      C(deadPlant, 0.06, 0.1, 1.9, x, 1.55, z, 8);
      for (let f = 0; f < 9; f++) {
        const a = f / 9 * Math.PI * 2 + r() * 0.3, droop = f % 3 === 0 ? 2.2 : 0.9 + r() * 0.5, len = 1.0 + r() * 0.5;
        const g = new THREE.BoxGeometry(0.16, 0.008, len); g.translate(0, 0, len / 2);
        add(deadPlant, g, x, 2.45, z, a, droop - Math.PI / 2 + 0.9, 0);
      }
      col(x - 0.33, x + 0.33, z - 0.33, z + 0.33);
    }
    // a wrought-iron bench against the west glass, a shawl and a veiled straw hat left on it
    {
      const b = new THREE.Group(); b.position.set(21.0, 0, -10.6); b.rotation.y = Math.PI / 2;
      const P = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); b.add(o); return o; };
      for (let k = 0; k < 5; k++) P(new THREE.BoxGeometry(1.5, 0.025, 0.07), iron, 0, 0.44, -0.2 + k * 0.09);
      for (let k = 0; k < 4; k++) P(new THREE.BoxGeometry(1.5, 0.06, 0.02), iron, 0, 0.62 + k * 0.12, -0.27, -0.12);
      for (const sx of [-0.72, 0.72]) {
        P(new THREE.BoxGeometry(0.03, 0.44, 0.03), iron, sx, 0.22, 0.18); P(new THREE.BoxGeometry(0.03, 0.95, 0.03), iron, sx, 0.47, -0.25, -0.12);
        P(new THREE.TorusGeometry(0.12, 0.012, 5, 14, Math.PI * 1.5), iron, sx, 0.64, 0.05, 0, Math.PI / 2, 0);
      }
      P(new THREE.BoxGeometry(0.62, 0.012, 0.55), fabric(0x4a3e4a), -0.38, 0.47, -0.02, 0, 0.3, 0.04);
      P(new THREE.BoxGeometry(0.5, 0.5, 0.012), fabric(0x4a3e4a), -0.42, 0.72, -0.29, -0.12, 0.3);
      P(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 18), mat({ color: 0xb89a60, roughness: 1 }), 0.35, 0.46, 0.0);
      P(new THREE.CylinderGeometry(0.09, 0.1, 0.09, 14), mat({ color: 0xb89a60, roughness: 1 }), 0.35, 0.51, 0.0);
      bake(b);
      const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.34, 18, 1, true), new THREE.MeshStandardMaterial({ map: laceTex(3), color: 0xe8e4d8, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 }));
      veil.scale.set(1, 0.25, 1); veil.position.set(21.0, 0.5, -10.95); group.add(veil);
      col(20.7, 21.35, -11.4, -9.8);
    }
    // a tea table for two, never cleared
    {
      const tx = 24.6, tz = -10.3;
      C(iron, 0.42, 0.42, 0.025, tx, 0.72, tz, 24); C(iron, 0.025, 0.025, 0.7, tx, 0.36, tz, 6); C(iron, 0.22, 0.25, 0.03, tx, 0.015, tz, 14);
      for (const [dx, dz] of [[-0.12, 0.08], [0.15, -0.06]]) { C(enamel, 0.05, 0.035, 0.05, tx + dx, 0.76, tz + dz, 12); C(enamel, 0.075, 0.075, 0.008, tx + dx, 0.738, tz + dz, 14); add(soil, new THREE.CircleGeometry(0.042, 10), tx + dx, 0.784, tz + dz, 0, -Math.PI / 2); }
      C(enamel, 0.06, 0.08, 0.14, tx + 0.02, 0.8, tz + 0.2, 12); // teapot
      B(mat({ color: 0x3a2a22 }), 0.16, 0.03, 0.22, tx - 0.18, 0.75, tz - 0.17, 0.4);
      B(brass, 0.1, 0.006, 0.03, tx - 0.17, 0.77, tz - 0.17, 0.2);
      col(tx - 0.45, tx + 0.45, tz - 0.45, tz + 0.45);
      for (const [dx, dz, ry] of [[-0.75, 0.25, 1.9], [0.7, -0.35, -1.3]]) {
        const c = new THREE.Group(); c.position.set(tx + dx, 0, tz + dz); c.rotation.y = ry;
        const P = (g, x, y, z, rx = 0) => { const o = new THREE.Mesh(g, iron); o.position.set(x, y, z); o.rotation.x = rx; c.add(o); };
        P(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 16), 0, 0.45, 0);
        for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) P(new THREE.BoxGeometry(0.02, 0.45, 0.02), lx, 0.225, lz);
        P(new THREE.TorusGeometry(0.18, 0.012, 5, 16, Math.PI), 0, 0.72, -0.19, 0); P(new THREE.BoxGeometry(0.02, 0.3, 0.02), -0.18, 0.6, -0.19); P(new THREE.BoxGeometry(0.02, 0.3, 0.02), 0.18, 0.6, -0.19);
        bake(c); col(tx + dx - 0.22, tx + dx + 0.22, tz + dz - 0.22, tz + dz + 0.22);
      }
    }
    // a moth sheet: a sheet on a frame with a lantern before it, hundreds of moths dried onto it
    {
      for (const x of [29.3, 31.3]) C(wood, 0.025, 0.03, 2.1, x, 1.05, -10.6, 6);
      C(wood, 0.02, 0.02, 2.1, 30.3, 2.05, -10.6, 6, 0, Math.PI / 2);
      const g = new THREE.PlaneGeometry(1.9, 1.7, 12, 8); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 1) * 2.2) * 0.04 + (0.85 - p.getY(i)) * 0.03);
      g.computeVertexNormals();
      const sheet = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: mothSheetTex(), roughness: 1, side: THREE.DoubleSide }));
      sheet.position.set(30.3, 1.18, -10.6); sheet.castShadow = true; group.add(sheet);
      // the lantern, long cold
      B(iron, 0.18, 0.02, 0.18, 30.3, 0.01, -10.0); B(glassDark, 0.15, 0.24, 0.15, 30.3, 0.14, -10.0); B(iron, 0.19, 0.03, 0.19, 30.3, 0.27, -10.0);
      add(iron, new THREE.TorusGeometry(0.06, 0.008, 4, 10, Math.PI), 30.3, 0.3, -10.0);
      col(29.2, 31.4, -10.72, -10.48);
    }
    // the potting table on the east wall
    {
      B(wood, 0.7, 0.06, 2.0, 33.25, 0.86, -10.6, 0, 0); for (const dz of [-0.9, 0.9]) for (const dx of [-0.28, 0.28]) B(wood, 0.05, 0.84, 0.05, 33.25 + dx, 0.42, -10.6 + dz);
      B(wood, 0.65, 0.03, 1.9, 33.25, 0.25, -10.6);
      for (let k = 0; k < 3; k++) { B(wood, 0.3, 0.06, 0.42, 33.2, 0.92, -11.25 + k * 0.45); add(soil, new THREE.PlaneGeometry(0.27, 0.39), 33.2, 0.952, -11.25 + k * 0.45, 0, -Math.PI / 2); }
      B(mat({ color: 0x6a5a3a, roughness: 1 }), 0.22, 0.04, 0.3, 33.15, 0.91, -9.95, 0.5); // the planting book
      B(iron, 0.03, 0.01, 0.2, 32.95, 0.9, -10.3, 0.7); C(wood, 0.016, 0.016, 0.1, 32.88, 0.9, -10.38, 6, Math.PI / 2, 0, 0.7);
      for (const dz of [0, 0.1]) B(fabric(0x6a5a40), 0.1, 0.02, 0.17, 33.4, 0.9, -9.8 + dz, 0.3 + dz); // gloves
      C(rust, 0.12, 0.14, 0.28, 28.2, 0.14, -11.5, 14); add(rust, new THREE.CylinderGeometry(0.014, 0.02, 0.36, 6), 28.42, 0.25, -11.5, 0, 0, -0.9); // watering can
      add(rust, new THREE.TorusGeometry(0.1, 0.012, 4, 12, Math.PI), 28.2, 0.3, -11.5, Math.PI / 2);
      B(fabric(0x5a4a30), 0.45, 0.5, 0.3, 23.2, 0.25, -11.6, 0.3); // a sack of potting soil
      col(32.88, 33.62, -11.62, -9.58); col(22.95, 23.45, -11.8, -11.4);
    }
    // dead leaves blown in over the years
    {
      const leaf = new THREE.MeshStandardMaterial({ map: leafTex(), roughness: 1, alphaTest: 0.4, side: THREE.DoubleSide });
      for (let i = 0; i < 160; i++) {
        const edge = r() < 0.6, x = edge ? (r() < 0.5 ? X0 + r() * 1.2 : X1 - r() * 1.2) : X0 + r() * (X1 - X0), z = edge ? Z0 + r() * (Z1 - Z0) : Z0 + 0.6 + r() * 1.6;
        add(leaf, new THREE.PlaneGeometry(0.09, 0.06), x, 0.004 + i * 0.00002, z, r() * 6.3, -Math.PI / 2);
      }
    }
    cocoon('ground', 23.0, -11.0, 1.0, true, roofY(-11.0)); cocoon('ground', 31.9, -9.3, 0.8, true, roofY(-9.3)); cocoon('ground', 26.0, -12.05, 0.9, true, roofY(-12.05));
    light(27.0, 2.7, -10.4, 0x7a88a8, 3.0, 10, false).userData.fill = true;
    flush();
    // moths at the glass, beating against it from the inside
    flutter({ count: 10, key: 'pronuba', size: 0.06, centre: new THREE.Vector3(27, 1.9, -12.4), spread: [5.5, 0.9, 0.12], speed: 0.6 });
  }

  // ======================================================================================
  // FIRST FLOOR: the Bathroom, between the Leader's and Luna's bedrooms
  // ======================================================================================
  const FH = 3.6;
  const BATH = { x0: 49.35, x1: 53.35, z0: 86.4, z1: 89.0 };
  let drip = null;
  {
    for (const id of ['fLeaderBath', 'fBathLuna']) doors[id].locked = false;
    doors.fLeaderBath.openMsg = 'The swollen door gives all at once. A bathroom: cold tiles, the drip of a tap, and black water.';
    doors.fBathLuna.openMsg = 'The door scrapes over the tiles. A bathroom, and a tap that has never stopped dripping.';
    const { x0, x1, z0, z1 } = BATH;
    plane(x1 - x0, z1 - z0, (x0 + x1) / 2, 0.004, (z0 + z1) / 2, mat({ map: rep(tex.slate || tex.stone, 3, 2), color: 0x8a8a86, roughness: 0.6 }));
    // a dado of white glazed tile, crazed and rust-streaked, the doorways left clear
    const tile = mat({ map: tileTex(), color: 0xd8d8d0, roughness: 0.35 });
    const dado = (w, x, z, ry) => add(tile, new THREE.PlaneGeometry(w, 1.3), x, 0.65, z, ry);
    dado(x1 - 51.15, (51.15 + x1) / 2, z0 + 0.01, 0); dado(50.05 - x0, (x0 + 50.05) / 2, z0 + 0.01, 0);
    dado(x1 - 51.15, (51.15 + x1) / 2, z1 - 0.01, Math.PI); dado(50.05 - x0, (x0 + 50.05) / 2, z1 - 0.01, Math.PI);
    dado(z1 - z0, x0 + 0.01, (z0 + z1) / 2, Math.PI / 2); dado(z1 - z0, x1 - 0.01, (z0 + z1) / 2, -Math.PI / 2);
    B(enamel, 1.95, 0.04, 0.03, 52.3, 1.31, z0 + 0.02); B(enamel, 1.95, 0.04, 0.03, 52.3, 1.31, z1 - 0.02);
    B(enamel, 0.03, 0.04, z1 - z0, x0 + 0.02, 1.31, (z0 + z1) / 2); B(enamel, 0.03, 0.04, z1 - z0, x1 - 0.02, 1.31, (z0 + z1) / 2);
    // a water stain spreading over the ceiling
    const stain = pic(stainTex(), 2.4, 1.8, 52.2, FH - 0.01, 87.6, 0, { alpha: true }); stain.rotation.x = Math.PI / 2;
    // the roll-top bath on claw feet, full of black water, something long lying in it under silk
    const bx = 52.93, bz = 87.38, sc = new THREE.Vector3(1, 1, 2.15);
    add(enamel, new THREE.CylinderGeometry(0.37, 0.33, 0.5, 24, 1, true), bx, 0.4, bz, 0, 0, 0, 0, sc);
    add(enamel, new THREE.CircleGeometry(0.33, 24), bx, 0.16, bz, 0, -Math.PI / 2, 0, 0, sc);
    add(enamel, new THREE.TorusGeometry(0.37, 0.028, 6, 32), bx, 0.65, bz, 0, Math.PI / 2, 0, 0, new THREE.Vector3(1, 2.15, 1));
    add(blackWater, new THREE.CircleGeometry(0.355, 24), bx, 0.56, bz, 0, -Math.PI / 2, 0, 0, sc);
    for (const [dx, dz] of [[-0.24, -0.55], [0.24, -0.55], [-0.24, 0.55], [0.24, 0.55]]) { add(dullBrass, new THREE.SphereGeometry(0.05, 8, 6), bx + dx, 0.07, bz + dz, 0, 0, 0, 0, new THREE.Vector3(1, 1.6, 1)); C(dullBrass, 0.03, 0.05, 0.12, bx + dx, 0.17, bz + dz, 8); }
    // the shape under the water
    {
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const w = t < 0.12 ? Math.sin(t / 0.12 * Math.PI / 2) * 0.11 : t < 0.2 ? 0.11 - (t - 0.12) * 0.3 : t < 0.55 ? 0.18 : 0.18 - (t - 0.55) * 0.28; pts.push(new THREE.Vector2(Math.max(0.01, w), t * 1.4)); }
      add(silk, new THREE.LatheGeometry(pts, 12), bx, 0.53, bz - 0.68, 0, Math.PI / 2, 0, 0, new THREE.Vector3(1, 1, 0.55));
    }
    // taps and the drip
    B(dullBrass, 0.03, 0.03, 0.22, bx, 0.82, z0 + 0.12); for (const dx of [-0.08, 0.08]) { C(dullBrass, 0.018, 0.018, 0.14, bx + dx, 0.82, z0 + 0.26, 8, Math.PI / 2); C(brass, 0.03, 0.03, 0.03, bx + dx, 0.9, z0 + 0.3, 8); }
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshStandardMaterial({ color: 0x9aa8a8, roughness: 0.05, metalness: 0.3 })); drop.position.set(bx + 0.08, 0.8, z0 + 0.33); group.add(drop);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.018, 16), new THREE.MeshBasicMaterial({ color: 0x8a9a9a, transparent: true, opacity: 0.6, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(bx + 0.08, 0.563, z0 + 0.33); group.add(ring);
    drip = { drop, ring, t: 0 };
    col(52.5, 53.35, 86.5, 88.27);
    // the water closet, its high cistern and chain
    C(enamel, 0.19, 0.14, 0.4, 53.06, 0.2, 88.66, 16); add(darkWood, new THREE.TorusGeometry(0.15, 0.03, 6, 18), 53.06, 0.42, 88.66, 0, Math.PI / 2);
    B(iron, 0.22, 0.26, 0.5, 53.22, 2.25, 88.66); C(iron, 0.02, 0.02, 1.8, 53.28, 1.3, 88.5, 6);
    for (let k = 0; k < 14; k++) add(iron, new THREE.TorusGeometry(0.008, 0.002, 3, 6), 53.06, 2.08 - k * 0.04, 88.86, k % 2 ? Math.PI / 2 : 0);
    C(enamel, 0.012, 0.016, 0.07, 53.06, 1.5, 88.86, 8);
    col(52.82, 53.35, 88.4, 89.0);
    // the washstand: marble top, basin and ewer, razor and brush, and a sheeted mirror
    const wx = 49.62, wz = 88.05;
    B(darkWood, 0.48, 0.75, 1.0, wx, 0.375, wz, 0, 0); B(marble, 0.52, 0.04, 1.06, wx + 0.01, 0.77, wz, 0, 0.8); B(marble, 0.03, 0.3, 1.06, x0 + 0.02, 0.94, wz, 0, 0.8);
    add(enamel, new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wx + 0.02, 0.92, wz - 0.1);
    add(enamel, new THREE.LatheGeometry([[0.0, 0], [0.07, 0.0], [0.08, 0.04], [0.06, 0.14], [0.05, 0.2], [0.065, 0.24]].map(([a, b]) => new THREE.Vector2(a, b)), 14), wx + 0.03, 0.79, wz + 0.28);
    C(dullBrass, 0.015, 0.012, 0.07, wx + 0.12, 0.825, wz - 0.42, 8); C(mat({ color: 0xe8e0d0 }), 0.022, 0.012, 0.035, wx + 0.12, 0.875, wz - 0.42, 8); // shaving brush
    B(mat({ color: 0xd8d0b8 }), 0.025, 0.01, 0.14, wx + 0.16, 0.795, wz - 0.3, 0.3); // razor
    B(darkWood, 0.06, 0.03, 0.22, wx + 0.12, 0.805, wz + 0.05, -0.4); // hairbrush
    { const hair = new THREE.LineBasicMaterial({ color: 0xd8d0b0, transparent: true, opacity: 0.7 }); const hp = []; for (let i = 0; i < 18; i++) { const a = r() * 6.3; hp.push(wx + 0.12, 0.83, wz + 0.05, wx + 0.12 + Math.cos(a) * 0.18, 0.79, wz + 0.05 + Math.sin(a) * 0.18); } const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); group.add(new THREE.LineSegments(hg, hair)); }
    for (const [dz, h] of [[0.42, 0.13], [0.36, 0.09]]) C(glassDark, 0.025, 0.028, h, wx + 0.1, 0.79 + h / 2, wz + dz, 10);
    B(dullBrass, 0.04, 0.72, 0.62, x0 + 0.03, 1.62, wz); // the mirror's frame, under its sheet
    { const g = new THREE.PlaneGeometry(0.8, 0.95, 6, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.02 + Math.abs(Math.sin(p.getX(i) * 9)) * 0.02 * (0.5 - p.getY(i))); g.computeVertexNormals(); add(linen, g, x0 + 0.07, 1.55, wz, Math.PI / 2); }
    col(x0, 49.9, 87.53, 88.57);
    // a towel rail and a hook with the white robe on it
    for (const y of [0.55, 1.0]) C(brass, 0.012, 0.012, 0.75, 52.0, y, z1 - 0.12, 8, 0, Math.PI / 2);
    for (const dx of [-0.38, 0.38]) C(brass, 0.014, 0.014, 1.05, 52.0 + dx, 0.53, z1 - 0.12, 8);
    { const g = new THREE.PlaneGeometry(0.6, 0.7, 4, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 6) * 0.015); add(mat({ map: tex.sheet || tex.fabric, color: 0xb0a890, roughness: 1, side: THREE.DoubleSide }), g, 52.0, 0.7, z1 - 0.1, 0); }
    robe(51.75, 1.82, z0 + 0.04, 0, 1.0); // facing south, into the room
    col(51.55, 52.45, 88.82, 89.0);
    cobweb(x1 - 0.02, FH - 0.35, z0 + 0.3, -Math.PI / 2 - 0.6, 0.7);
    cocoon('first', 51.6, 87.75, 0.7, true, FH);
    light(x0 + 0.02, 2.25, 86.95, 0xffa860, 2.4, 5.5, '+x').userData.creepy = true;
    flush();
  }

  // ---- the Nursery's door into the Leader's room: unbolted ----
  doors.fNurseryLeader.locked = false;
  doors.fNurseryLeader.openMsg = 'The bolt on the far side has been drawn back. A child’s door, into her father’s room.';

  // ======================================================================================
  // FIRST FLOOR: the West Corridor, behind the Library, and the turret stair
  // ======================================================================================
  {
    const X0 = 27.5, X1 = 29.8, Z0 = 84.0, Z1 = 96.8, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const wp = paperGrey(2, 1.4, 0x707276);
    plane(X1 - X0 + 0.2, Z1 - Z0, cx + 0.05, 0, cz, mat({ map: rep(tex.floor, 1, 6), color: 0x8a8070 }));
    plane(X1 - X0 + 0.2, Z1 - Z0, cx + 0.05, FH, cz, plaster, false);
    wall('z', X0 - 0.1, Z0 - 0.1, Z1 + 0.1, FH, wp);
    wall('x', Z0 - 0.1, X0 - 0.2, X1 + 0.1, FH, wp);
    wall('x', Z1 + 0.1, X0 - 0.2, X1 + 0.1, FH, wp);
    door('fLibCorridor', 'z', 29.9, 90.9, { w: 1.0, swing: 1, openMsg: 'A narrow corridor behind the books: coats on hooks, and at the far end an iron stair winding up.' });
    // a worn runner, a dado rail and skirting
    add(mat({ map: rep(tex.velvet || tex.fabric, 1, 10), color: 0x4a2426, roughness: 1 }), new THREE.PlaneGeometry(0.8, 10.6), cx, 0.006, 91.4, 0, -Math.PI / 2);
    for (const x of [X0 + 0.02, X1 - 0.02]) { B(darkWood, 0.03, 0.05, Z1 - Z0, x, 0.92, cz); B(darkWood, 0.03, 0.16, Z1 - Z0, x, 0.08, cz); }
    // the members' coats and capes on brass hooks, a name plate over each, boots beneath
    const names = ['BR. AMBROSE', 'SR. HARRIET', 'BR. TOBIAS', 'SR. CONSTANCE', 'BR. SILAS', 'LUNA'];
    const coatCols = [0x2a2a30, 0x3a2e2a, 0x26262a, 0x4a3a40, 0x2e3228, 0xd8d0c0];
    names.forEach((n, i) => {
      const z = 87.6 + i * 1.05 + (i > 3 ? 0.9 : 0), small = n === 'LUNA', k = small ? 0.72 : 1;
      C(brass, 0.012, 0.012, 0.09, X0 + 0.04, 1.85, z, 6, 0, Math.PI / 2);
      pic(plateTex(n), 0.22, 0.05, X0 + 0.012, 2.02, z, Math.PI / 2);
      coat(X0 + 0.03, 1.86, z, coatCols[i], k, i);
      for (const dz of [-0.07, 0.07]) { B(mat({ color: 0x1a1412, roughness: 0.5 }), 0.24 * k, 0.12 * k, 0.08 * k, X0 + 0.16, 0.06 * k, z + dz, 0); B(mat({ color: 0x1a1412, roughness: 0.5 }), 0.08 * k, 0.16 * k, 0.08 * k, X0 + 0.07, 0.14 * k, z + dz); }
    });
    col(X0, X0 + 0.32, 87.2, 94.8);
    // portraits of the members, each face spun over with a little cocoon
    [[85.2, 0], [86.6, 1], [93.4, 2], [94.6, 3], [95.8, 4]].forEach(([z, s]) => {
      B(darkWood, 0.04, 0.72, 0.56, X1 - 0.02, 1.75, z); pic(portraitTex(s), 0.46, 0.62, X1 - 0.045, 1.75, z, -Math.PI / 2);
    });
    // the long-case clock, stopped, its pendulum bound in silk
    {
      B(darkWood, 0.36, 2.1, 0.5, X1 - 0.18, 1.05, 88.05, 0, 0); B(darkWood, 0.4, 0.12, 0.56, X1 - 0.18, 2.16, 88.05);
      pic(clockTex(), 0.32, 0.32, X1 - 0.365, 1.82, 88.05, -Math.PI / 2);
      B(glassDark, 0.01, 0.9, 0.3, X1 - 0.365, 0.95, 88.05);
      C(dullBrass, 0.06, 0.06, 0.01, X1 - 0.3, 0.75, 88.05, 14, 0, Math.PI / 2);
      col(X1 - 0.38, X1, 87.78, 88.32);
    }
    // a hall table at the south end: the visitors' book, a candle, a moth net in the stand
    {
      B(wood, 0.36, 0.04, 0.9, X1 - 0.2, 0.8, 95.75); for (const dz of [-0.4, 0.4]) for (const dx of [-0.14, 0.14]) B(wood, 0.03, 0.78, 0.03, X1 - 0.2 + dx, 0.39, 95.75 + dz);
      B(mat({ color: 0x4a1e1a, roughness: 0.9 }), 0.24, 0.03, 0.34, X1 - 0.22, 0.835, 95.6, 0.15); B(mat({ color: 0xe8dcc0 }), 0.22, 0.012, 0.32, X1 - 0.22, 0.855, 95.6, 0.15);
      C(brass, 0.04, 0.05, 0.02, X1 - 0.2, 0.83, 96.0, 10); C(wax, 0.012, 0.012, 0.12, X1 - 0.2, 0.9, 96.0, 8);
      col(X1 - 0.4, X1, 95.25, 96.25);
      C(iron, 0.12, 0.1, 0.5, X0 + 0.2, 0.25, 96.35, 12); C(wood, 0.01, 0.01, 1.3, X0 + 0.22, 0.75, 96.33, 6, 0.08, 0.05);
      add(iron, new THREE.TorusGeometry(0.16, 0.006, 4, 18), X0 + 0.26, 1.48, 96.31, 0.6, 0.3);
      add(new THREE.MeshStandardMaterial({ map: laceTex(5), color: 0xd8d4c8, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), new THREE.ConeGeometry(0.15, 0.35, 10, 1, true), X0 + 0.27, 1.27, 96.3, 0, 0.3 + Math.PI);
      C(mat({ color: 0x141214 }), 0.012, 0.03, 0.85, X0 + 0.16, 0.5, 96.4, 6, -0.05, 0.08);
      col(X0, X0 + 0.34, 96.15, Z1);
    }
    // the turret stair: cast iron, winding up through a hole in the ceiling
    {
      const sx = 28.65, sz = 84.95, n = 15;
      C(iron, 0.05, 0.05, FH, sx, FH / 2, sz, 10);
      for (let i = 0; i < n; i++) {
        const a = i * 0.48 - 1.2, y = 0.22 + i * 0.22;
        const g = new THREE.BoxGeometry(0.66, 0.035, 0.2); g.translate(0.36, 0, 0);
        add(iron, g, sx, y, sz, a);
        add(iron, new THREE.CylinderGeometry(0.008, 0.008, 0.85, 5), sx + Math.cos(a) * 0.66, y + 0.43, sz - Math.sin(a) * 0.66);
      }
      const hp = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * (n - 1) * 0.48 - 1.2; hp.push(new THREE.Vector3(sx + Math.cos(a) * 0.66, 0.22 + t * (n - 1) * 0.22 + 0.86, sz - Math.sin(a) * 0.66)); }
      add(iron, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 90, 0.016, 5, false));
      add(black, new THREE.CircleGeometry(0.78, 24), sx, FH - 0.012, sz, 0, Math.PI / 2);
      col(27.9, 29.4, Z0, 85.75);
    }
    for (const [x, y, z, ry] of [[X0 + 0.05, FH - 0.4, Z0 + 0.4, Math.PI / 4], [X1 - 0.05, FH - 0.4, Z1 - 0.4, -Math.PI * 0.75]]) cobweb(x, y, z, ry, 0.9);
    cocoon('first', 28.1, 92.4, 1.1, true, FH); cocoon('first', 29.3, 85.9, 0.7, true, FH);
    light(X0 + 0.02, 2.3, 92.3, 0xffa860, 2.6, 7, '+x').userData.creepy = true;
    light(X1 - 0.2, 0.98, 96.0, 0xffc080, 1.2, 4, 'candle');
    flush();
  }

  // ======================================================================================
  // FIRST FLOOR (top of the west turret): the Observatory
  // ======================================================================================
  const beamDust = { pts: null };
  {
    const { x: OX, z: OZ, R, WH } = OBS;
    const at = (th, rr) => [OX + Math.cos(th) * rr, OZ + Math.sin(th) * rr];
    const face = th => Math.atan2(-Math.cos(th), -Math.sin(th)); // +z local faces the centre
    const MOON_DIR = new THREE.Vector3(0, Math.sin(0.92), -Math.cos(0.92));
    // floor, wall, wainscot, cornice
    add(mat({ map: rep(tex.floor, 3, 3), color: 0x8a7a68 }), new THREE.CircleGeometry(R + 0.05, 48), OX, 0, OZ, 0, -Math.PI / 2);
    add(new THREE.MeshStandardMaterial({ map: rep(tex.wallpaper, 9, 1.4), color: 0x6c6e74, roughness: 0.9, side: THREE.BackSide }), new THREE.CylinderGeometry(R, R, WH, 64, 1, true), OX, WH / 2, OZ);
    add(new THREE.MeshStandardMaterial({ map: rep(tex.wood, 12, 1), color: 0x3e2c22, roughness: 0.8, side: THREE.BackSide }), new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.9, 64, 1, true), OX, 0.45, OZ);
    for (const [y, rr, t] of [[0.92, R - 0.04, 0.025], [WH - 0.02, R - 0.03, 0.06], [0.06, R - 0.04, 0.06]]) add(darkWood, new THREE.TorusGeometry(rr, t, 6, 64), OX, y, OZ, 0, Math.PI / 2);
    // the dome, its slit open to the north, ribs and the shutter track
    const slitA = 0.17, ph0 = Math.PI * 1.5;
    add(new THREE.MeshStandardMaterial({ map: rep(tex.plank, 10, 3), color: 0x4e5058, roughness: 0.9, side: THREE.DoubleSide }), new THREE.SphereGeometry(R, 56, 18, ph0 + slitA, Math.PI * 2 - slitA * 2, 0, Math.PI / 2), OX, WH, OZ);
    for (let k = 0; k < 14; k++) {
      const phi = ph0 + slitA + k / 13 * (Math.PI * 2 - slitA * 2);
      add(k === 0 || k === 13 ? iron : darkWood, new THREE.TorusGeometry(R - 0.04, k === 0 || k === 13 ? 0.06 : 0.035, 6, 24, Math.PI / 2), OX, WH, OZ, Math.PI + phi);
    }
    add(iron, new THREE.TorusGeometry(R - 0.05, 0.05, 6, 64), OX, WH + 0.02, OZ, 0, Math.PI / 2);
    // the shutter, rolled back over the dome beside the slit
    add(new THREE.MeshStandardMaterial({ map: rep(tex.plank, 2, 3), color: 0x3a3c44, roughness: 0.9, side: THREE.DoubleSide }), new THREE.SphereGeometry(R - 0.09, 8, 10, ph0 + slitA + 0.02, slitA * 2, 0.05, Math.PI / 2 - 0.15), OX, WH, OZ);
    // the night outside: stars all round, the moon high in the north (ignores the fog)
    {
      const sky = new THREE.Mesh(new THREE.SphereGeometry(13, 32, 16), new THREE.MeshBasicMaterial({ map: starTex(), side: THREE.BackSide, fog: false }));
      sky.position.set(OX, OBS_SKY_Y, OZ); group.add(sky);
      const mp = new THREE.Vector3(OX, 1.7, OZ + 0.2).addScaledVector(MOON_DIR, 11);
      const moon = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: moonTex(), transparent: true, fog: false, depthWrite: false }));
      moon.position.copy(mp); moon.lookAt(OX, 1.7, OZ); group.add(moon);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      halo.position.copy(mp).addScaledVector(MOON_DIR, 0.3); halo.lookAt(OX, 1.7, OZ); group.add(halo);
      // moonlight down through the slit onto the floor, a faint shaft of it in the dusty air
      const target = new THREE.Vector3(OX, 0, OZ + 2.0);
      const spot = new THREE.SpotLight(0x9aaee0, 34, 22, 0.17, 0.6, 1.0); spot.position.copy(mp); spot.target.position.copy(target); group.add(spot, spot.target);
      const d = mp.clone().sub(target).normalize(), len = 8.2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, len, 20, 1, true), new THREE.MeshBasicMaterial({ map: shaftTex(), color: 0x8a9ccc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      shaft.position.copy(target).addScaledVector(d, len / 2); shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); group.add(shaft);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ map: haloTex(), color: 0x8a9ccc, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      patch.rotation.x = -Math.PI / 2; patch.scale.set(1, 1.35, 1); patch.position.set(OX, 0.006, OZ + 2.0); group.add(patch);
      // dust motes drifting in the beam
      const N = 140, pa = new Float32Array(N * 3), seeds = new Float32Array(N);
      for (let i = 0; i < N; i++) { const t = r() * len, rr = (0.45 + (0.85 - 0.45) * (1 - t / len)) * Math.sqrt(r()), a = r() * 6.3; const p = target.clone().addScaledVector(d, t); pa.set([p.x + Math.cos(a) * rr, p.y, p.z + Math.sin(a) * rr], i * 3); seeds[i] = r() * 100; }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xc8d4f0, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
      group.add(pts); beamDust.pts = pts; beamDust.base = pa.slice(); beamDust.seeds = seeds;
    }
    // the telescope: a long brass refractor on a cast-iron pier, still trained on the moon
    {
      const tel = new THREE.Group(); tel.position.set(OX, 0, OZ + 0.2);
      const P = (geo, m, x, y, z, parent = tel) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
      P(new THREE.CylinderGeometry(0.34, 0.4, 0.08, 20), iron, 0, 0.04, 0);
      P(new THREE.CylinderGeometry(0.12, 0.2, 1.25, 16), iron, 0, 0.7, 0);
      for (let k = 0; k < 3; k++) { const o = P(new THREE.BoxGeometry(0.05, 0.12, 0.5), iron, Math.sin(k * 2.09) * 0.28, 0.08, Math.cos(k * 2.09) * 0.28); o.rotation.y = k * 2.09; }
      P(new THREE.BoxGeometry(0.22, 0.2, 0.3), iron, 0, 1.4, 0);
      const head = new THREE.Group(); head.position.set(0, 1.62, 0); tel.add(head);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), MOON_DIR);
      P(new THREE.CylinderGeometry(0.1, 0.095, 2.5, 24), brass, 0, 0.35, 0, head);
      P(new THREE.CylinderGeometry(0.122, 0.118, 0.42, 24, 1, true), dullBrass, 0, 1.75, 0, head);
      P(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 24), brass, 0, 1.55, 0, head);
      P(new THREE.CircleGeometry(0.1, 20), new THREE.MeshStandardMaterial({ color: 0x0a1018, metalness: 0.6, roughness: 0.05 }), 0, 1.6, 0, head).rotation.x = -Math.PI / 2;
      P(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 12), brass, 0, -1.0, 0, head);
      P(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10), iron, 0, -1.16, 0, head);
      P(new THREE.CylinderGeometry(0.025, 0.025, 0.07, 10), dullBrass, 0.06, -0.92, 0, head).rotation.z = Math.PI / 2;
      P(new THREE.CylinderGeometry(0.03, 0.028, 0.6, 12), brass, 0.17, 0.5, 0, head);
      for (const y of [0.3, 0.7]) P(new THREE.BoxGeometry(0.12, 0.02, 0.03), brass, 0.11, y, 0, head);
      P(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), iron, 0, 0, -0.3, head).rotation.x = Math.PI / 2;
      P(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), iron, 0, 0, -0.6, head).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) P(new THREE.BoxGeometry(0.03, 0.28, 0.2), iron, s * 0.13, -0.05, 0, head);
      bake(tel);
      col(OX - 0.35, OX + 0.35, OZ - 0.15, OZ + 0.55);
    }
    // the observing chair, a tartan rug over it
    {
      const c = new THREE.Group(); c.position.set(OX + 0.95, 0, OZ + 1.35); c.rotation.y = 2.6;
      const P = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; c.add(o); };
      for (const s of [-0.22, 0.22]) { P(new THREE.BoxGeometry(0.05, 1.6, 0.06), oak, s, 0.78, -0.28, 0.32); P(new THREE.BoxGeometry(0.05, 0.75, 0.05), oak, s, 0.37, 0.25); }
      for (let k = 0; k < 4; k++) P(new THREE.BoxGeometry(0.44, 0.03, 0.06), oak, 0, 0.2 + k * 0.32, -0.32 + k * 0.1 + 0.18, 0.32);
      P(new THREE.BoxGeometry(0.5, 0.04, 0.4), oak, 0, 0.75, 0.05);
      P(new THREE.BoxGeometry(0.46, 0.02, 0.6), mat({ map: rep(tex.fabric, 2, 2), color: 0x5a2a28 }), 0.02, 0.78, 0.0, 0.25);
      bake(c); col(OX + 0.65, OX + 1.25, OZ + 1.05, OZ + 1.65);
    }
    // the chart table on the west wall: the log, an orrery, spectacles, a pipe, a cold cup
    {
      const th = Math.PI, [tx, tz] = at(th, R - 0.5), ry = face(th);
      const t = new THREE.Group(); t.position.set(tx, 0, tz); t.rotation.y = ry;
      const P = (geo, m, x, y, z, rx = 0, rry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, rry, 0); t.add(o); return o; };
      P(new THREE.BoxGeometry(1.8, 0.05, 0.8), darkWood, 0, 0.82, 0); P(new THREE.BoxGeometry(1.7, 0.16, 0.7), darkWood, 0, 0.72, 0);
      for (const [dx, dz] of [[-0.82, -0.32], [0.82, -0.32], [-0.82, 0.32], [0.82, 0.32]]) P(new THREE.BoxGeometry(0.06, 0.66, 0.06), darkWood, dx, 0.33, dz);
      P(new THREE.BoxGeometry(0.42, 0.025, 0.3), mat({ color: 0x3a2418 }), -0.35, 0.86, 0.05, 0, 0.1);
      P(new THREE.BoxGeometry(0.4, 0.012, 0.28), mat({ color: 0xe8dcc0 }), -0.35, 0.878, 0.05, 0, 0.1);
      // orrery
      P(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 14), brass, 0.45, 0.87, -0.05); P(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), brass, 0.45, 0.97, -0.05);
      P(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe8b850, emissive: 0x3a2808, metalness: 0.6, roughness: 0.3 }), 0.45, 1.08, -0.05);
      for (const [rr, h] of [[0.1, 1.06], [0.16, 1.05], [0.23, 1.04]]) { P(new THREE.TorusGeometry(rr, 0.003, 3, 32), brass, 0.45, h, -0.05, Math.PI / 2); P(new THREE.SphereGeometry(0.012 + rr * 0.06, 8, 6), dullBrass, 0.45 + rr * 0.7, h, -0.05 + rr * 0.7); }
      P(new THREE.TorusGeometry(0.025, 0.003, 3, 12), brass, 0.05, 0.855, 0.22, Math.PI / 2); P(new THREE.TorusGeometry(0.025, 0.003, 3, 12), brass, 0.11, 0.855, 0.22, Math.PI / 2); // spectacles
      P(new THREE.CylinderGeometry(0.018, 0.014, 0.05, 10), darkWood, -0.05, 0.87, -0.25); P(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 5), darkWood, 0.03, 0.855, -0.25, 0, 0).rotation.z = Math.PI / 2; // pipe
      P(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), enamel, 0.75, 0.885, 0.2);
      P(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 12), brass, -0.75, 0.855, -0.2); P(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), wax, -0.75, 0.91, -0.2);
      bake(t);
      gasLampFixture(group, ...t.localToWorld(new THREE.Vector3(-0.75, 0.97, -0.2)).toArray(), 'candle');
      const lp = t.localToWorld(new THREE.Vector3(-0.75, 0.99, -0.2)); light(lp.x, lp.y, lp.z, 0xffb070, 1.8, 5, false).userData.creepy = true;
      col(tx - 0.45, tx + 0.45, tz - 0.95, tz + 0.95);
    }
    // a bookcase of star atlases on the east wall, jars of moths on its top
    {
      const th = 0, [bx2, bz2] = at(th, R - 0.3), ry = face(th);
      const b = new THREE.Group(); b.position.set(bx2, 0, bz2); b.rotation.y = ry;
      const P = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); b.add(o); return o; };
      P(new THREE.BoxGeometry(1.3, 1.8, 0.36), darkWood, 0, 0.9, -0.02);
      const bookM = [0x4a2a22, 0x22303a, 0x3a3a26, 0x5a4a32].map(c => mat({ color: c, roughness: 0.8 }));
      for (let s = 0; s < 4; s++) { let x = -0.58; while (x < 0.56) { const w = 0.04 + r() * 0.05, h = 0.26 + r() * 0.1; P(new THREE.BoxGeometry(w, h, 0.26), bookM[Math.floor(r() * 4)], x + w / 2, 0.12 + s * 0.42 + h / 2, 0.06); x += w + 0.006; } }
      for (let k = 0; k < 4; k++) { P(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), glassDark, -0.45 + k * 0.3, 1.89, 0); P(new THREE.CylinderGeometry(0.064, 0.064, 0.02, 12), dullBrass, -0.45 + k * 0.3, 1.99, 0); }
      bake(b); col(bx2 - 0.3, bx2 + 0.2, bz2 - 0.68, bz2 + 0.68);
    }
    // a celestial globe on a stand, south-west
    {
      const th = Math.PI * 0.72, [gx, gz] = at(th, R - 0.7);
      C(darkWood, 0.04, 0.05, 0.8, gx, 0.4, gz, 10); for (let k = 0; k < 3; k++) add(darkWood, new THREE.BoxGeometry(0.04, 0.04, 0.32), gx + Math.sin(k * 2.09) * 0.14, 0.04, gz + Math.cos(k * 2.09) * 0.14, k * 2.09);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshStandardMaterial({ map: starTex(512, true), roughness: 0.6 })); globe.position.set(gx, 1.08, gz); globe.rotation.z = 0.4; group.add(globe);
      add(brass, new THREE.TorusGeometry(0.29, 0.01, 4, 32), gx, 1.08, gz, 0.5, 0, 0.4);
      add(brass, new THREE.TorusGeometry(0.3, 0.012, 4, 32), gx, 1.08, gz, 0, Math.PI / 2);
      col(gx - 0.3, gx + 0.3, gz - 0.3, gz + 0.3);
    }
    // star charts round the wall, and the moth-and-moon diagrams
    for (const [th, kind, w, h, y] of [[Math.PI * 1.13, 'chart', 0.9, 0.7, 1.65], [Math.PI * 1.27, 'chart2', 0.8, 0.95, 1.6], [Math.PI * 0.87, 'chart3', 0.7, 0.55, 1.75], [-Math.PI * 0.27, 'diagram', 1.2, 0.85, 1.6], [-Math.PI * 0.12, 'phases', 1.0, 0.6, 1.7], [Math.PI * 0.28, 'chart', 0.75, 0.6, 1.7], [Math.PI * 0.42, 'phases', 0.9, 0.55, 1.75]]) {
      const [x, z] = at(th, R - 0.025);
      const m = pic(kind === 'diagram' ? diagramTex() : kind === 'phases' ? phasesTex() : chartTex(kind), w, h, x, y, z, face(th));
      m.material.side = THREE.DoubleSide;
      const [px, pz] = at(th, R - 0.02); B(brass, 0.012, 0.012, 0.012, px, y + h / 2 - 0.03, pz);
    }
    // the stair head: an opening in the floor with an iron rail round it
    {
      const [hx, hz] = [EXTRA.obsHatch.x, EXTRA.obsHatch.z];
      add(black, new THREE.CircleGeometry(0.6, 24), hx, 0.007, hz, 0, -Math.PI / 2);
      add(iron, new THREE.TorusGeometry(0.6, 0.025, 5, 24), hx, 0.01, hz, 0, Math.PI / 2);
      C(iron, 0.04, 0.04, 0.9, hx, 0.45, hz + 0.25, 8);
      for (const [dx, dz] of [[-0.62, -0.1], [0.62, -0.1], [-0.45, 0.45], [0.45, 0.45], [0, 0.62]]) C(iron, 0.012, 0.012, 0.95, hx + dx, 0.475, hz + dz, 6);
      add(iron, new THREE.TorusGeometry(0.62, 0.016, 5, 24, Math.PI * 1.15), hx, 0.95, hz, -0.15, Math.PI / 2);
      col(hx - 0.65, hx + 0.65, hz - 0.15, hz + 0.65);
    }
    // the round wall's collider: a ring of small boxes just outside it
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, [x, z] = at(a, R + 0.32); col(x - 0.38, x + 0.38, z - 0.38, z + 0.38); }
    for (const [x, z, h] of [[OX - 1.4, OZ - 1.0, 1.1], [OX + 1.8, OZ + 0.4, 0.8], [OX - 0.6, OZ + 2.0, 0.9], [OX + 2.6, OZ - 1.8, 1.2]]) { const rr = Math.hypot(x - OX, z - OZ); cocoon('first', x, z, h, true, WH + Math.sqrt(R * R - rr * rr) - 0.05); }
    { const [wx, wz] = at(Math.PI * 0.6, R - 0.3); cobweb(wx, WH + 0.3, wz, face(Math.PI * 0.6), 0.9); }
    light(OX, WH + 0.8, OZ + 0.6, 0x7a88a8, 5, 10, false).userData.fill = true;
    flush();
  }

  // ======================================================================================
  // CATACOMBS: the Bogong Cave, north of the Tomb Hall
  // ======================================================================================
  let caveMoths = null;
  const CAVE = { x: 52.4, z: 135.6, rx: 4.6, rz: 5.6, WH: 2.4, DH: 1.3 };
  {
    const { x: CX, z: CZ, rx, rz, WH, DH } = CAVE;
    const rock = mat({ map: rep(tex.stone, 4, 1.6), color: 0x524a42, roughness: 0.95 });
    const rockF = mat({ map: rep(tex.stone, 5, 5), color: 0x403a34, roughness: 0.95 });
    const th0 = -0.395, gapA = 0.15;
    const angDist = th => { let d = Math.abs(((th - th0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI); return d; };
    const bump = (th, y) => (Math.sin(th * 5 + y * 2.1) * 0.16 + Math.sin(th * 11 - y * 3.7) * 0.08 + Math.sin(th * 23 + y * 7) * 0.04) * Math.min(1, Math.max(0, (angDist(th) - gapA) / 0.25));
    const wallPt = (th, y, inset = 0) => { const k = 1 + bump(th, y) / 5 - inset / 5; return new THREE.Vector3(CX + Math.sin(th) * rx * k, y, CZ + Math.cos(th) * rz * k); };
    // the wall, ragged rock, open where the Order broke through from the tomb hall
    {
      const g = new THREE.CylinderGeometry(1, 1, WH, 72, 8, true, th0 + gapA, Math.PI * 2 - gapA * 2); g.translate(0, WH / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), th = Math.atan2(x, z); const v = wallPt(th, y); p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals();
      add(new THREE.MeshStandardMaterial({ map: rock.map, normalMap: rock.normalMap, color: 0x524a42, roughness: 0.95, side: THREE.BackSide }), g);
      // the roof: a low ragged dome
      const d = new THREE.SphereGeometry(1, 64, 12, 0, Math.PI * 2, 0, Math.PI / 2); const q = d.attributes.position;
      for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i), th = Math.atan2(x, z), rr = Math.hypot(x, z); const n = 1 + (Math.sin(th * 7 + rr * 5) * 0.06 + Math.sin(th * 13 - rr * 9) * 0.03) * (1 - Math.pow(Math.min(1, rr), 4)); q.setXYZ(i, CX + x * rx * n * (1 + bump(th, WH) / 5), WH + y * DH * (0.85 + 0.15 * n), CZ + z * rz * n * (1 + bump(th, WH) / 5)); }
      d.computeVertexNormals();
      add(new THREE.MeshStandardMaterial({ map: rock.map, color: 0x4a423a, roughness: 0.95, side: THREE.BackSide }), d);
      // the floor, uneven, with fallen stones along the walls
      const f = new THREE.CircleGeometry(1, 48, 0, Math.PI * 2); const fp = f.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y = fp.getY(i); fp.setXYZ(i, x * (rx + 0.5), y * (rz + 0.5), (Math.sin(x * 9) * Math.cos(y * 7)) * 0.03); }
      f.computeVertexNormals(); add(rockF, f, CX, 0.0, CZ, 0, -Math.PI / 2);
      for (let i = 0; i < 46; i++) { const th = r() * Math.PI * 2; if (angDist(th) < gapA + 0.15) continue; const v = wallPt(th, 0, 0.6 + r() * 0.6), s = 0.12 + r() * 0.3; add(rock, new THREE.DodecahedronGeometry(s, 0), v.x, s * 0.4, v.z, r() * 3, r() * 3, 0); }
      // the short broken passage from the tomb hall
      for (const sx of [49.95, 51.25]) { B(stoneW, 0.2, 2.8, 1.75, sx, 1.4, 141.075, 0, 0.5); col(sx - 0.1, sx + 0.1, 140.2, 142.0); }
      B(stoneW, 1.5, 0.5, 1.75, 50.6, 2.55, 141.075, 0, 0.5);
      add(rockF, new THREE.PlaneGeometry(1.3, 1.6), 50.6, 0.005, 141.2, 0, -Math.PI / 2);
      for (let i = 0; i < 8; i++) { const s = 0.06 + r() * 0.14; add(brick, new THREE.BoxGeometry(s * 2, s, s * 1.4), 50.1 + r() * 1.0, s / 2, 140.9 + r() * 0.9, r() * 3); }
      // colliders round the ellipse, leaving the gap
      for (let i = 0; i < 44; i++) { const th = i / 44 * Math.PI * 2; if (angDist(th) < gapA + 0.06) continue; const v = wallPt(th, 1, -0.45); col(v.x - 0.42, v.x + 0.42, v.z - 0.42, v.z + 0.42); }
    }
    // the moths: tens of thousands in life, a few thousand here, packed like slates on the
    // rock and the roof, all heads up; a few always moving
    {
      const N = 3400, mm = new THREE.MeshStandardMaterial({ map: mothPlaneTex('infusa'), transparent: true, alphaTest: 0.35, roughness: 0.85, side: THREE.DoubleSide });
      const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.055, 0.05), mm, N);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), roll = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
      const centres = []; for (let k = 0; k < 34; k++) centres.push([r() * Math.PI * 2, 0.9 + r() * (WH - 0.9), r() < 0.35]);
      let n = 0, tries = 0;
      while (n < N && tries++ < N * 4) {
        const [cth, cy, ceil] = centres[tries % centres.length];
        const th = cth + (r() - 0.5) * 0.7, y = cy + (r() - 0.5) * 1.0;
        if (angDist(th) < gapA + 0.12) continue;
        let pos, nrm;
        if (ceil) { // on the roof
          const rr = 0.2 + r() * 0.75, x = Math.sin(th) * rr, z = Math.cos(th) * rr, yy = Math.sqrt(Math.max(0, 1 - rr * rr));
          pos = new THREE.Vector3(CX + x * rx * 0.98, WH + yy * DH * 0.92 - 0.02, CZ + z * rz * 0.98); nrm = new THREE.Vector3(-x / rx, -yy / DH, -z / rz).normalize();
        } else {
          if (y < 0.5 || y > WH + 0.1) continue;
          pos = wallPt(th, y, 0.06); nrm = new THREE.Vector3(-Math.sin(th) / rx, 0, -Math.cos(th) / rz).normalize();
        }
        M.lookAt(pos, pos.clone().sub(nrm), Math.abs(nrm.y) > 0.9 ? new THREE.Vector3(Math.sin(th), 0, Math.cos(th)) : up);
        Q.setFromRotationMatrix(M); roll.setFromAxisAngle(Z, (r() - 0.5) * 0.6); Q.multiply(roll);
        const k = 0.8 + r() * 0.45; M.compose(pos, Q, S.set(k, k, k)); inst.setMatrixAt(n, M); n++;
      }
      inst.count = n; inst.computeBoundingSphere(); group.add(inst);
      caveMoths = flutter({ count: 36, key: 'infusa', size: 0.05, centre: new THREE.Vector3(CX, 2.4, CZ - 0.4), spread: [2.6, 0.7, 3.4], speed: 1.0 });
    }
    // a member's camp against the west wall: blanket, tin cup, candle-lantern, a notebook
    {
      const v = wallPt(-Math.PI / 2 - 0.08, 0, 0.9); const x = v.x, z = v.z;
      add(fabric(0x4a3a2e), new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), x + 0.1, 0.16, z, 0, Math.PI / 2, 0);
      add(fabric(0x3a3028), new THREE.BoxGeometry(0.8, 0.04, 1.6), x + 0.55, 0.03, z + 0.2, 0.08);
      C(rust, 0.04, 0.035, 0.08, x + 0.9, 0.05, z - 0.55, 10); C(rust, 0.11, 0.11, 0.012, x + 0.75, 0.01, z - 0.7, 14);
      B(iron, 0.14, 0.2, 0.14, x + 1.0, 0.1, z + 1.0); B(glassDark, 0.12, 0.14, 0.12, x + 1.0, 0.13, z + 1.0); C(wax, 0.015, 0.015, 0.06, x + 1.0, 0.1, z + 1.0, 6);
      B(mat({ color: 0x3a2a1c }), 0.14, 0.02, 0.2, x + 0.75, 0.065, z + 0.45, 0.6);
      // a heap of husks: the moths he ate
      for (let i = 0; i < 26; i++) add(new THREE.MeshStandardMaterial({ map: mothPlaneTex('infusa'), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }), new THREE.PlaneGeometry(0.05, 0.045), x + 1.15 + (r() - 0.5) * 0.2, 0.01 + r() * 0.03, z + 0.15 + (r() - 0.5) * 0.2, r() * 6, -Math.PI / 2 + (r() - 0.5) * 0.8);
      pic(tallyTex(), 1.2, 0.8, ...wallPt(-Math.PI / 2 - 0.4, 1.3, 0.12).toArray(), Math.PI / 2 - 0.4, { alpha: true });
      light(x + 1.0, 0.26, z + 1.0, 0xffa050, 2.0, 6, 'candle').userData.creepy = true;
      col(x - 0.1, x + 1.1, z - 0.75, z + 1.1);
    }
    // a stone basin that catches the drip from the roof, moths drowned in it
    {
      const v = wallPt(0.9, 0, 0.9);
      C(stoneW, 0.32, 0.26, 0.4, v.x, 0.2, v.z, 14); add(blackWater, new THREE.CircleGeometry(0.28, 16), v.x, 0.38, v.z, 0, -Math.PI / 2);
      for (let i = 0; i < 6; i++) add(new THREE.MeshStandardMaterial({ map: mothPlaneTex('infusa'), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }), new THREE.PlaneGeometry(0.05, 0.045), v.x + (r() - 0.5) * 0.35, 0.385, v.z + (r() - 0.5) * 0.35, r() * 6, -Math.PI / 2);
      col(v.x - 0.32, v.x + 0.32, v.z - 0.32, v.z + 0.32);
    }
    cocoon('cat', CX + 1.2, CZ - 1.5, 1.0, true, WH + DH * 0.85); cocoon('cat', CX - 1.8, CZ + 2.2, 0.8, true, WH + DH * 0.6);
    light(CX, WH + 0.4, CZ, 0x8a7a6a, 7, 12, false).userData.fill = true;
    flush();
  }

  // ======================================================================================
  // CATACOMBS: the Burial Niches, west of the Flooded Crypt, off the Tomb Hall
  // ======================================================================================
  {
    const X0 = 33.0, X1 = 43.2, Z0 = 133.0, Z1 = 141.9, H = 2.8, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
    const fl = mat({ map: tex.stone, color: 0x4a4744, roughness: 0.75 });
    B(fl, X1 - X0, 0.06, Z1 - Z0, cx, -0.03, cz, 0, 0.5);
    B(stoneW, X1 - X0, 0.1, Z1 - Z0, cx, H + 0.05, cz, 0, 0.5);
    for (let x = X0 + 1.2; x < X1 - 0.5; x += 2.4) B(stoneW, 0.22, 0.2, Z1 - Z0, x, H - 0.1, cz, 0, 0.5);
    // walls: north and west hold the niches; the south wall joins the tomb hall's
    B(stoneW, X1 - X0 + 0.2, H, 0.2, cx, H / 2, Z0 - 0.1, 0, 0.5); col(X0 - 0.2, X1, Z0 - 0.2, Z0);
    B(stoneW, 0.2, H, Z1 - Z0 + 0.2, X0 - 0.1, H / 2, cz, 0, 0.5); col(X0 - 0.2, X0, Z0 - 0.2, Z1 + 0.1);
    B(stoneW, 38.0 - X0 + 0.2, H, 0.2, (X0 + 38.0) / 2, H / 2, 142.0, 0, 0.5); col(X0 - 0.2, 38.0, 141.9, 142.1);
    // the niches: three rows, closed with carved slabs; a few pushed out from inside
    const slabTexA = slabAtlas(), slabM = new THREE.MeshStandardMaterial({ map: slabTexA, roughness: 0.9 });
    let si = 0; const opened = new Set([3, 9, 14, 22]);
    const nicheRow = (alongX, a, b, at, dir) => { // dir: +1 niches open toward +z / +x
      const depth = 0.62, cell = 0.82;
      const front = at + dir * depth;
      if (alongX) B(stoneW, b - a, H - 0.02, depth, (a + b) / 2, (H - 0.02) / 2, at + dir * depth / 2, 0, 0.5); else B(stoneW, depth, H - 0.02, b - a, at + dir * depth / 2, (H - 0.02) / 2, (a + b) / 2, 0, 0.5);
      if (alongX) col(a, b, Math.min(at, front), Math.max(at, front)); else col(Math.min(at, front), Math.max(at, front), a, b);
      const n = Math.floor((b - a) / cell);
      for (let i = 0; i < n; i++) for (let row = 0; row < 3; row++) {
        const c = a + (i + 0.5) * ((b - a) / n), y = 0.35 + row * 0.62, idx = si++;
        const fx = alongX ? c : front + dir * 0.004, fz = alongX ? front + dir * 0.004 : c, ry = alongX ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        if (opened.has(idx)) {
          // a dark hole, the slab fallen out on the floor, silk-wrapped remains inside
          add(black, new THREE.PlaneGeometry(0.62, 0.44), fx, y, fz, ry);
          const g = new THREE.PlaneGeometry(0.6, 0.42); uvCell(g, idx % 32);
          add(slabM, g, alongX ? c + 0.1 : front + dir * 0.4, 0.025, alongX ? front + dir * 0.4 : c + 0.1, r() * 0.6, -Math.PI / 2);
          const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector2(Math.max(0.01, Math.sin(t * Math.PI) * 0.13), t * 0.56)); }
          add(silk, new THREE.LatheGeometry(pts, 10), alongX ? c - 0.28 : front + dir * 0.04, y - 0.1, alongX ? front + dir * 0.04 : c - 0.28, alongX ? 0 : -Math.PI / 2, 0, -Math.PI / 2);
        } else {
          const g = new THREE.PlaneGeometry(0.64, 0.46); uvCell(g, idx % 32);
          add(slabM, g, fx, y, fz, ry);
        }
        // a stone ledge under each row, with candle stubs here and there
        if (i === 0) { if (alongX) B(stoneW, b - a, 0.05, 0.12, (a + b) / 2, y - 0.27, front + dir * 0.06); else B(stoneW, 0.12, 0.05, b - a, front + dir * 0.06, y - 0.27, (a + b) / 2); }
        if (r() < 0.28) C(wax, 0.018, 0.02, 0.04 + r() * 0.08, (alongX ? c : front + dir * 0.07) + (r() - 0.5) * 0.3, y - 0.2, (alongX ? front + dir * 0.07 : c) + (r() - 0.5) * 0.1, 8);
      }
      return front;
    };
    const nFront = nicheRow(true, X0 + 0.65, X1 - 0.2, Z0, 1);
    const wFront = nicheRow(false, Z0 + 0.65, Z1 - 0.3, X0, 1);
    // tokens left before the slabs: a photograph, dried flowers, a child's shoe, letters
    const pX = wFront + 0.09, pZ = 138.3;
    pic(photoTex(), 0.16, 0.2, pX, 0.83, pZ, Math.PI / 2 - 0.1);
    B(darkWood, 0.02, 0.24, 0.2, pX - 0.02, 0.83, pZ, -0.1);
    add(mat({ color: 0x5a4a3a, roughness: 1 }), new THREE.TorusGeometry(0.14, 0.035, 6, 14), 38.4, 0.15, nFront + 0.1, 0, -Math.PI / 2 + 0.2);
    B(mat({ color: 0x3a2a22, roughness: 0.7 }), 0.08, 0.06, 0.14, wFront + 0.07, 0.14, 136.0, 0.4);
    B(mat({ color: 0xe0d4b8 }), 0.16, 0.03, 0.1, 36.0, 0.74, nFront + 0.06, 0.2); B(mat({ color: 0x8a2a2a }), 0.012, 0.012, 0.11, 36.0, 0.757, nFront + 0.06, 0.2);
    // the bier in the middle, a body on it under silk, dried honeysuckle laid across
    {
      const bx = 38.4, bz = 137.4;
      B(stoneW, 2.1, 0.75, 0.85, bx, 0.375, bz, 0, 0.5); B(stoneW, 2.2, 0.06, 0.95, bx, 0.78, bz, 0, 0.5);
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const w = t < 0.12 ? Math.sin(t / 0.12 * Math.PI / 2) * 0.12 : t < 0.2 ? 0.12 - (t - 0.12) * 0.4 : t < 0.55 ? 0.21 : 0.21 - (t - 0.55) * 0.3; pts.push(new THREE.Vector2(Math.max(0.01, w), t * 1.75)); }
      add(silk, new THREE.LatheGeometry(pts, 14), bx - 0.88, 0.97, bz, 0, 0, -Math.PI / 2, 0, new THREE.Vector3(1, 1, 0.7));
      for (let k = 0; k < 7; k++) add(deadPlant, new THREE.CylinderGeometry(0.004, 0.006, 0.4, 4), bx - 0.2 + k * 0.06, 1.13, bz + (r() - 0.5) * 0.2, 0.3, Math.PI / 2, (r() - 0.5) * 0.5);
      for (const dx of [-0.95, 0.95]) for (const dz of [-0.35, 0.35]) C(wax, 0.025, 0.03, 0.05 + r() * 0.1, bx + dx, 0.84, bz + dz, 8);
      col(bx - 1.1, bx + 1.1, bz - 0.48, bz + 0.48);
      light(bx + 0.95, 0.98, bz - 0.35, 0xffa050, 2.4, 7, 'candle').userData.creepy = true;
    }
    // a board on the south wall: the Order's roll of the taken-up
    pic(rollTex(), 1.5, 1.0, 35.6, 1.55, 141.88, Math.PI);
    cocoon('cat', 40.6, 135.0, 1.0, true, H); cocoon('cat', 35.4, 140.6, 0.8, true, H);
    cobweb(X0 + 0.7, H - 0.35, Z0 + 0.7, Math.PI / 4, 0.9);
    light(cx + 1, H - 0.4, cz, 0x8a7a6a, 4.5, 11, false).userData.fill = true;
    flush();
  }

  // ---------- spun silk: one mesh and one line set per floor ----------
  for (const k of Object.keys(silkGeos)) {
    if (!silkGeos[k].length) continue;
    const m = new THREE.Mesh(mergeSilk(mergeGeometries, silkGeos[k]), animSilk(silk)); m.castShadow = true; m.receiveShadow = true; group.add(m);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(threads[k], 3));
    group.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.35 })));
  }

  // ---------- the wardrobe's moths (boiler room) ----------
  const swarm = (() => {
    const N = 110, W0 = new THREE.Vector3(41.2, 1.25, 40.95);
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.04, 0.034), new THREE.MeshStandardMaterial({ map: mothPlaneTex('bisselliella'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, emissive: 0x2a2620 }), N);
    inst.frustumCulled = false; inst.visible = false;
    // a small box keeps the swarm in the cellar's section when the floors are sorted
    inst.boundingBox = new THREE.Box3(W0.clone().subScalar(0.1), W0.clone().addScalar(0.1));
    group.add(inst);
    const P = [], Vv = []; for (let i = 0; i < N; i++) { P.push(new THREE.Vector3()); Vv.push(new THREE.Vector3()); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), tgt = new THREE.Vector3();
    let t = -1;
    return {
      start() {
        t = 0; inst.visible = true;
        for (let i = 0; i < N; i++) { P[i].set(W0.x + (r() - 0.5) * 1.1, W0.y + (r() - 0.5) * 1.4, W0.z - 0.25); Vv[i].set((r() - 0.5) * 2.4, (r() - 0.2) * 1.4, 1.2 + r() * 2.4); }
      },
      update(dt, time, camLocal) {
        if (t < 0) return;
        t += dt; if (t > 11) { t = -1; inst.visible = false; return; }
        for (let i = 0; i < N; i++) {
          const p = P[i], v = Vv[i];
          // first they pour at the light (your face), then scatter up into the dark of the vault
          if (t < 1.6 && camLocal) tgt.copy(camLocal).add(S.set(Math.sin(i * 1.7) * 0.4, Math.cos(i * 2.3) * 0.3, 0)); else tgt.set(W0.x + Math.sin(i + t * 0.3) * 4, 2.9, W0.z + 2.5 + Math.cos(i * 0.7 + t * 0.2) * 2.5);
          v.addScaledVector(S.copy(tgt).sub(p).normalize(), dt * (t < 1.6 ? 7 : 3)); v.multiplyScalar(1 - dt * 1.2);
          v.x += Math.sin(time * 9 + i * 3.1) * dt * 3; v.y += Math.cos(time * 7 + i * 1.3) * dt * 2.5;
          p.addScaledVector(v, dt); if (p.y > 3.1) p.y = 3.1; if (p.y < 0.1) p.y = 0.1;
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(time * 38 + i * 2.7)), fade = t > 8 ? Math.max(0, 1 - (t - 8) / 3) : 1;
          E.set(-Math.PI / 2 + Math.sin(i) * 0.5, Math.atan2(v.x, v.z), 0, 'YXZ'); Q.setFromEuler(E);
          M.compose(p, Q, S.set(flap * fade, fade, fade)); inst.setMatrixAt(i, M);
        }
        inst.instanceMatrix.needsUpdate = true;
      },
    };
  })();

  // ---------- state ----------
  const camLocal = new THREE.Vector3();
  const api = {
    reset() { for (const id of ['fNurseryLeader', 'fLeaderBath', 'fBathLuna']) doors[id].locked = false; },
    wardrobeSwarm() { swarm.start(); },
    update(t, dt, camera) {
      if (camera) camLocal.set(camera.position.x - 1000, camera.position.y, camera.position.z);
      swarm.update(dt, t, camera ? camLocal : null);
      for (const a of anim) a(t, dt);
      if (drip && drip.drop.parent && drip.drop.parent.visible) {
        drip.t += dt; const k = drip.t % 1.6;
        drip.drop.position.y = k < 0.9 ? 0.8 : Math.max(0.565, 0.8 - (k - 0.9) * (k - 0.9) * 4.9 * 2);
        drip.drop.visible = drip.drop.position.y > 0.566;
        const rk = drip.drop.visible ? 0 : Math.min(1, (k - 1.12) / 0.45); drip.ring.scale.setScalar(1 + rk * 4); drip.ring.material.opacity = 0.6 * (1 - rk);
      }
      if (beamDust.pts && beamDust.pts.parent && beamDust.pts.parent.visible) {
        const p = beamDust.pts.geometry.attributes.position, b = beamDust.base, s = beamDust.seeds;
        for (let i = 0; i < p.count; i++) p.setXYZ(i, b[i * 3] + Math.sin(t * 0.21 + s[i]) * 0.12, b[i * 3 + 1] + Math.sin(t * 0.13 + s[i] * 1.7) * 0.15, b[i * 3 + 2] + Math.cos(t * 0.17 + s[i]) * 0.12);
        p.needsUpdate = true;
      }
    },
  };
  return api;

  // ---------- builders used above ----------
  // a few moths on the move: an instanced flock wandering round a centre
  function flutter({ count, key, size, centre, spread, speed }) {
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(size, size * 0.85), new THREE.MeshStandardMaterial({ map: mothPlaneTex(key), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), count);
    inst.frustumCulled = false; inst.boundingBox = new THREE.Box3(centre.clone().subScalar(0.1), centre.clone().addScalar(0.1));
    group.add(inst);
    const seeds = Array.from({ length: count }, () => [r() * 100, 0.5 + r(), r() * 6.3]);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), Pp = new THREE.Vector3(), S = new THREE.Vector3();
    anim.push((t) => {
      if (!inst.parent || !inst.parent.visible) return;
      seeds.forEach(([s, f, ph], i) => {
        const tt = t * speed * f + s;
        Pp.set(centre.x + Math.sin(tt * 0.7 + ph) * spread[0], centre.y + Math.sin(tt * 1.3 + ph * 2) * spread[1], centre.z + Math.cos(tt * 0.9 + ph) * spread[2]);
        const flap = 0.3 + 0.7 * Math.abs(Math.sin(t * 34 * f + s));
        E.set(-Math.PI / 2 + 0.4, tt * 0.7 + ph + Math.PI / 2, 0, 'YXZ'); Q.setFromEuler(E);
        M.compose(Pp, Q, S.set(flap, 1, 1)); inst.setMatrixAt(i, M);
      });
      inst.instanceMatrix.needsUpdate = true;
    });
    return inst;
  }
  // a long coat or cape hanging on a hook against a wall running along z (front facing +x)
  function coat(x, y, z, color, k, seed) {
    const m = mat({ map: tex.fabric, color, roughness: 1, side: THREE.DoubleSide });
    const h = 1.25 * k, g = new THREE.CylinderGeometry(0.07 * k, 0.24 * k, h, 12, 4, true, 0, Math.PI);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setX(i, p.getX(i) * 0.75 + Math.sin(yy * 9 + seed) * 0.01); }
    add(m, g, x, y - h / 2 - 0.02, z);
    add(m, new THREE.SphereGeometry(0.11 * k, 10, 8, 0, Math.PI, 0, Math.PI / 2), x + 0.01, y - 0.02, z, 0, 0.3);
    if (color === 0xd8d0c0) add(mat({ map: tex.fabric, color: 0xc0b8a8, roughness: 1, side: THREE.DoubleSide }), new THREE.PlaneGeometry(0.16 * k, 0.12 * k), x + 0.13 * k, y - 0.5 * k, z, Math.PI / 2);
  }
  // the white robe of a novice, with the Order's moth stitched on the breast (wall along x)
  function robe(x, y, z, ry, k) {
    const m = new THREE.MeshStandardMaterial({ map: robeTex(), color: 0xe0dccf, roughness: 1, side: THREE.DoubleSide });
    const h = 1.35 * k, g = new THREE.CylinderGeometry(0.08, 0.27, h, 14, 4, true, -Math.PI / 2, Math.PI);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * 0.6);
    add(m, g, x, y - h / 2, z + 0.02, ry);
    add(m, new THREE.SphereGeometry(0.12, 10, 8, -Math.PI / 2, Math.PI, 0, Math.PI / 2), x, y - 0.03, z + 0.02, ry);
    C(brass, 0.012, 0.012, 0.08, x, y + 0.02, z + 0.04, 6, Math.PI / 2);
  }
}

// ======================================================================================
// textures (canvas)
// ======================================================================================
function cv(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const rr = (seed) => rand(seed);
function worldUV(g, s) {
  const P = g.attributes.position, N = g.attributes.normal, uv = g.attributes.uv; if (!uv || !N) return;
  for (let i = 0; i < P.count; i++) {
    const nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i)), x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (ny >= nx && ny >= nz) uv.setXY(i, x * s, z * s); else if (nx >= nz) uv.setXY(i, z * s, y * s); else uv.setXY(i, x * s, y * s);
  }
  uv.needsUpdate = true;
}
// put a plane's uvs on one cell of the 8 x 4 slab atlas
function uvCell(g, i) {
  const u0 = (i % 8) / 8, v0 = 1 - (Math.floor(i / 8) + 1) / 4, uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) / 8, v0 + uv.getY(k) / 4);
}
function glassTex() {
  return cv(512, 512, (g, w, h) => {
    const r = rr(81); g.fillStyle = 'rgba(150,160,150,0.14)'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${70 + r() * 40},${70 + r() * 40},${60 + r() * 30},${0.08 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * w, h - r() * r() * h, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 60; i++) { const x = r() * w; g.strokeStyle = `rgba(90,90,80,${0.08 + r() * 0.15})`; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, r() * h * 0.5); g.lineTo(x + (r() - 0.5) * 8, h); g.stroke(); }
    const gr = g.createLinearGradient(0, h * 0.6, 0, h); gr.addColorStop(0, 'rgba(60,64,50,0)'); gr.addColorStop(1, 'rgba(50,54,40,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
function ivyTex() {
  return cv(512, 512, (g, w, h) => {
    const r = rr(17);
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = h - Math.pow(r(), 0.6) * h, s = 10 + r() * 16, a = r() * 6.3;
      g.fillStyle = `rgb(${14 + r() * 14},${24 + r() * 22},${12 + r() * 10})`;
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.8, -s * 0.2); g.lineTo(s * 0.5, s * 0.7); g.lineTo(0, s * 0.4); g.lineTo(-s * 0.5, s * 0.7); g.lineTo(-s * 0.8, -s * 0.2); g.closePath(); g.fill(); g.restore();
    }
    g.strokeStyle = '#1a140c'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); let x = r() * w, y = h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y -= 30 + r() * 40; g.lineTo(x, y); } g.stroke(); }
  });
}
function gardenTex() {
  return cv(1024, 512, (g, w, h) => {
    const r = rr(303);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#080c18'); sky.addColorStop(0.55, '#1a2236'); sky.addColorStop(0.75, '#2a3246'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const mg = g.createRadialGradient(230, 90, 4, 230, 90, 220); mg.addColorStop(0, 'rgba(190,200,230,0.55)'); mg.addColorStop(0.08, 'rgba(160,175,215,0.25)'); mg.addColorStop(1, 'rgba(60,70,110,0)'); g.fillStyle = mg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8ecf4'; g.beginPath(); g.arc(230, 90, 16, 0, 7); g.fill();
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(220,225,240,${r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.5, 1.2, 1.2); }
    // trees, ragged against the sky
    g.fillStyle = '#05070b';
    for (let k = 0; k < 14; k++) { const x = r() * w, base = h * 0.75, top = h * (0.18 + r() * 0.3); for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(x + (r() - 0.5) * 140, top + r() * (base - top), 20 + r() * 50, 16 + r() * 34, 0, 0, 7); g.fill(); } g.fillRect(x - 6, top + 60, 12, base); }
    // hedges and the fence
    g.fillStyle = '#04060a'; g.fillRect(0, h * 0.78, w, h); for (let i = 0; i < 80; i++) { g.beginPath(); g.ellipse(r() * w, h * 0.78, 20 + r() * 40, 14 + r() * 26, 0, 0, 7); g.fill(); }
    g.fillStyle = '#020305'; for (let x = 0; x < w; x += 14) { g.fillRect(x, h * 0.68, 2.4, h * 0.2); g.beginPath(); g.moveTo(x - 2, h * 0.68); g.lineTo(x + 1.2, h * 0.655); g.lineTo(x + 4.4, h * 0.68); g.fill(); }
    g.fillRect(0, h * 0.7, w, 2); g.fillRect(0, h * 0.84, w, 2);
  });
}
function mothSheetTex() {
  return cv(512, 460, (g, w, h) => {
    const r = rr(41); g.fillStyle = '#d8d2c0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.12})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 80, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
    const cols = ['#5a4a3a', '#7a6a50', '#3a3028', '#8a7a60', '#6a5040', '#b0a080', '#4a4038'];
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = Math.pow(r(), 0.8) * h, s = 4 + r() * 10, a = (r() - 0.5) * 0.8;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.beginPath(); g.moveTo(0, -s * 0.2); g.quadraticCurveTo(s * 1.1, -s * 0.9, s * 0.9, s * 0.2); g.quadraticCurveTo(s * 0.4, s * 0.5, 0, s * 0.6); g.quadraticCurveTo(-s * 0.4, s * 0.5, -s * 0.9, s * 0.2); g.quadraticCurveTo(-s * 1.1, -s * 0.9, 0, -s * 0.2); g.fill();
      g.fillStyle = 'rgba(20,14,10,0.6)'; g.fillRect(-0.8, -s * 0.4, 1.6, s * 0.9); g.restore();
    }
    g.fillStyle = 'rgba(40,30,20,0.75)'; g.font = 'italic 20px Georgia, serif'; g.fillText('Every one that came to the light was counted, and named, and given to Her.', 12, h - 14);
  });
}
function leafTex() {
  return cv(64, 48, (g, w, h) => { g.fillStyle = '#5a3e22'; g.beginPath(); g.ellipse(32, 24, 28, 14, 0.2, 0, 7); g.fill(); g.strokeStyle = '#3a2814'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 28); g.lineTo(58, 20); g.stroke(); });
}
function laceTex(seed) {
  return cv(128, 128, (g, w, h) => {
    g.strokeStyle = '#fff'; g.lineWidth = 1.4; const r = rr(seed + 50);
    for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(0, i * 9 + r() * 3); g.lineTo(w, i * 9 + r() * 3); g.stroke(); g.beginPath(); g.moveTo(i * 9 + r() * 3, 0); g.lineTo(i * 9 + r() * 3, h); g.stroke(); }
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 10, 3 + r() * 8, 0, 0, 7); g.fill(); }
  });
}
function tileTex() {
  return cv(512, 256, (g, w, h) => {
    const r = rr(9); g.fillStyle = '#e8e6de'; g.fillRect(0, 0, w, h);
    const s = 32; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const l = 220 + r() * 25; g.fillStyle = `rgb(${l},${l},${l - 8})`; g.fillRect(x + 1.5, y + 1.5, s - 3, s - 3); }
    g.strokeStyle = 'rgba(60,60,50,0.25)'; g.lineWidth = 0.8; for (let i = 0; i < 70; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 9; i++) { const x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,70,30,0.35)'); gr.addColorStop(1, 'rgba(120,70,30,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + r() * 10, h * (0.4 + r() * 0.6)); }
    const gr = g.createLinearGradient(0, h * 0.7, 0, h); gr.addColorStop(0, 'rgba(60,50,30,0)'); gr.addColorStop(1, 'rgba(60,50,30,0.3)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
function stainTex() {
  return cv(256, 192, (g, w, h) => { const r = rr(5); for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(110,80,40,${0.2 + r() * 0.25})`; g.lineWidth = 2 + r() * 3; g.fillStyle = `rgba(90,70,40,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 60, 96 + (r() - 0.5) * 40, 30 + i * 12, 20 + i * 9, r(), 0, 7); g.fill(); g.stroke(); } });
}
function plateTex(text) {
  return cv(256, 56, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b8964a'); gr.addColorStop(1, '#5a4018'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#20160a'; g.font = '30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  });
}
function portraitTex(seed) {
  return cv(192, 256, (g, w, h) => {
    const r = rr(seed * 13 + 7);
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#5a5048'); bg.addColorStop(1, '#2a241e'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, h);
    const dress = seed % 2 ? '#1a1614' : '#22201c';
    g.fillStyle = dress; g.beginPath(); g.moveTo(20, h); g.quadraticCurveTo(30, 150, 96, 140); g.quadraticCurveTo(162, 150, 172, h); g.fill();
    g.fillStyle = '#c8b8a0'; g.fillRect(84, 118, 24, 26);
    g.fillStyle = '#b8a890'; g.beginPath(); g.ellipse(96, 92, 30, 38, 0, 0, 7); g.fill();
    g.fillStyle = seed % 2 ? '#2a1e14' : '#4a3a2a'; g.beginPath(); g.ellipse(96, 64, 32, 18, 0, Math.PI, 0); g.fill();
    // silk spun over the face
    for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(236,230,214,${0.25 + r() * 0.4})`; g.lineWidth = 0.6 + r(); const a = r() * 6.3; g.beginPath(); g.moveTo(96 + Math.cos(a) * 28, 94 + Math.sin(a) * 34); g.lineTo(96 + Math.cos(a + 2.4 + r()) * 28, 94 + Math.sin(a + 2.4 + r()) * 34); g.stroke(); }
    g.fillStyle = 'rgba(232,226,210,0.6)'; g.beginPath(); g.ellipse(96, 94, 22, 28, 0, 0, 7); g.fill();
    g.strokeStyle = '#8a7a50'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = 'rgba(40,30,20,0.7)'; g.font = 'italic 13px Georgia, serif'; g.textAlign = 'center'; g.fillText(['Br. Ambrose, 1880', 'Sr. Harriet, 1881', 'Br. Tobias, 1883', 'Sr. Constance, 1884', 'Br. Silas, 1886'][seed % 5], w / 2, h - 16);
  });
}
function clockTex() {
  return cv(256, 256, (g, w, h) => {
    g.fillStyle = '#d8ccb0'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#3a2a18'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#2a1c10'; g.font = '22px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(n, 128 + Math.cos(a) * 94, 128 + Math.sin(a) * 94); });
    const hand = (a, l, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * l, 128 + Math.sin(a) * l); g.stroke(); };
    g.strokeStyle = '#1a120a'; hand((11 + 48 / 60) / 12 * Math.PI * 2 - Math.PI / 2, 56, 6); hand(48 / 60 * Math.PI * 2 - Math.PI / 2, 86, 3.5);
    g.strokeStyle = 'rgba(236,230,214,0.6)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(128 + (Math.random() - 0.5) * 200, 20); g.lineTo(128 + (Math.random() - 0.5) * 200, 236); g.stroke(); }
  });
}
function robeTex() {
  return cv(256, 256, (g, w, h) => {
    const r = rr(66); g.fillStyle = '#e2ddd0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(140,130,110,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 6); }
    g.strokeStyle = '#7a6a4a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(128, 70); g.bezierCurveTo(90, 40, 70, 90, 108, 100); g.bezierCurveTo(84, 130, 112, 140, 128, 112); g.bezierCurveTo(144, 140, 172, 130, 148, 100); g.bezierCurveTo(186, 90, 166, 40, 128, 70); g.stroke(); g.beginPath(); g.moveTo(128, 66); g.lineTo(128, 126); g.stroke();
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(90,80,50,${0.05 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * w, 180 + r() * 76, 10 + r() * 30, 6 + r() * 14, 0, 0, 7); g.fill(); }
  });
}
function starTex(size = 2048, globe = false) {
  return cv(size, size / 2, (g, w, h) => {
    const r = rr(globe ? 12 : 1887);
    g.fillStyle = globe ? '#1e2a46' : '#03050c'; g.fillRect(0, 0, w, h);
    if (!globe) { for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(160,170,210,${r() * 0.05})`; const y = h * 0.3 + Math.sin(i * 0.01 + r()) * h * 0.12 + (r() - 0.5) * h * 0.18; g.beginPath(); g.ellipse(r() * w, y, 10 + r() * 40, 4 + r() * 16, 0, 0, 7); g.fill(); } }
    for (let i = 0; i < (globe ? 300 : 2600); i++) { const b = r(); g.fillStyle = globe ? '#e8d8a0' : `rgba(${220 + r() * 35},${220 + r() * 35},${235 + r() * 20},${0.3 + b * 0.7})`; const s = (globe ? 1.5 : 0.7) + Math.pow(b, 6) * (globe ? 3 : 2.6); g.fillRect(r() * w, r() * h, s, s); }
    if (globe) { g.strokeStyle = 'rgba(232,216,160,0.5)'; g.lineWidth = 1.2; for (let k = 0; k < 18; k++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(232,216,160,0.4)'; for (let y = 0; y < h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }
  });
}
function moonTex() {
  return cv(256, 256, (g, w, h) => {
    const r = rr(29); const gr = g.createRadialGradient(118, 116, 10, 128, 128, 110); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(0.85, '#c8ccd4'); gr.addColorStop(1, '#9aa0aa');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { const a = r() * 6.3, d = Math.sqrt(r()) * 90; g.fillStyle = `rgba(120,126,140,${0.1 + r() * 0.25})`; g.beginPath(); g.ellipse(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 4 + r() * 16, 4 + r() * 14, 0, 0, 7); g.fill(); }
    for (const [x, y, rx, ry] of [[100, 96, 34, 26], [150, 140, 26, 30], [118, 160, 20, 14]]) { g.fillStyle = 'rgba(110,116,130,0.35)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0.4, 0, 7); g.fill(); }
  });
}
function haloTex() {
  return cv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(200,210,255,0.35)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
}
function shaftTex() {
  return cv(16, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0.05)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); });
}
function chartTex(kind) {
  return cv(512, 400, (g, w, h) => {
    const r = rr(kind.length * 31);
    g.fillStyle = kind === 'chart3' ? '#1a2440' : '#e4d8b8'; g.fillRect(0, 0, w, h);
    const ink = kind === 'chart3' ? 'rgba(232,220,170,0.9)' : 'rgba(40,40,70,0.85)';
    g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(12, 12, w - 24, h - 24);
    g.lineWidth = 0.6; for (let k = 1; k < 6; k++) { g.beginPath(); g.arc(w / 2, h / 2, k * 34, 0, 7); g.stroke(); } for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * 200, h / 2 + Math.sin(a) * 200); g.stroke(); }
    const stars = []; for (let i = 0; i < 160; i++) { const s = [30 + r() * (w - 60), 30 + r() * (h - 60), r()]; stars.push(s); g.fillStyle = ink; g.beginPath(); g.arc(s[0], s[1], 0.8 + Math.pow(s[2], 4) * 4, 0, 7); g.fill(); }
    // the Order's constellation over the old ones: the Moth
    g.strokeStyle = kind === 'chart3' ? 'rgba(232,200,120,0.95)' : 'rgba(130,40,30,0.9)'; g.lineWidth = 2.2;
    const cx = w / 2, cy = h / 2 + 10, s = kind === 'chart2' ? 1.1 : 0.85;
    g.beginPath(); g.moveTo(cx, cy - 60 * s); g.bezierCurveTo(cx - 70 * s, cy - 130 * s, cx - 150 * s, cy - 30 * s, cx - 60 * s, cy); g.bezierCurveTo(cx - 120 * s, cy + 50 * s, cx - 40 * s, cy + 110 * s, cx, cy + 40 * s); g.bezierCurveTo(cx + 40 * s, cy + 110 * s, cx + 120 * s, cy + 50 * s, cx + 60 * s, cy); g.bezierCurveTo(cx + 150 * s, cy - 30 * s, cx + 70 * s, cy - 130 * s, cx, cy - 60 * s); g.stroke();
    g.beginPath(); g.moveTo(cx, cy - 70 * s); g.lineTo(cx, cy + 70 * s); g.stroke();
    g.fillStyle = ink; g.font = 'italic 18px Georgia, serif'; g.textAlign = 'center';
    g.fillText(kind === 'chart2' ? 'MATER · in Cassiopeia et Cygno' : kind === 'chart3' ? 'Hemisphaerium Boreale' : 'Phalaena Magna', w / 2, h - 24);
    g.font = '11px Georgia, serif'; for (let i = 0; i < 8; i++) g.fillText(['Vega', 'Deneb', 'Capella', 'Polaris', 'Altair', 'Schedar', 'Mirfak', 'Alkaid'][i], 40 + r() * (w - 80), 40 + r() * (h - 80));
  });
}
function phasesTex() {
  return cv(512, 300, (g, w, h) => {
    g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,30,20,0.8)'; g.strokeRect(10, 10, w - 20, h - 20);
    for (let i = 0; i < 8; i++) {
      const x = 40 + i * 62, y = 90, k = i / 7;
      g.fillStyle = '#2a2420'; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill();
      g.fillStyle = '#f4ecd8'; g.beginPath(); g.ellipse(x, y, 22 * Math.abs(1 - 2 * Math.min(k * 2, 1)), 22, 0, 0, 7); if (k > 0.25) { g.arc(x, y, 22, -Math.PI / 2, Math.PI / 2); } g.fill();
      // a moth beneath each, larger as the moon fills
      const s = 6 + i * 3.2; g.fillStyle = 'rgba(60,40,30,0.85)'; g.beginPath(); g.moveTo(x, 170 - s * 0.3); g.quadraticCurveTo(x + s * 1.2, 170 - s, x + s, 170 + s * 0.3); g.quadraticCurveTo(x, 170 + s * 0.6, x - s, 170 + s * 0.3); g.quadraticCurveTo(x - s * 1.2, 170 - s, x, 170 - s * 0.3); g.fill();
    }
    g.fillStyle = 'rgba(40,30,20,0.85)'; g.font = 'italic 18px Georgia, serif'; g.textAlign = 'center';
    g.fillText('As the moon fills, so does She.', w / 2, 240); g.font = 'italic 14px Georgia, serif'; g.fillText('Full on the forty-eighth night.', w / 2, 266);
  });
}
function diagramTex() {
  return cv(640, 450, (g, w, h) => {
    g.fillStyle = '#e6dab8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(40,30,20,0.85)'; g.lineWidth = 2; g.strokeRect(12, 12, w - 24, h - 24);
    // left: the moth flying straight by the moon (parallel rays); right: spiralling into a lamp
    g.fillStyle = '#f2ead0'; g.beginPath(); g.arc(120, 70, 30, 0, 7); g.fill(); g.stroke();
    g.setLineDash([5, 6]); g.lineWidth = 1; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(120 + k * 10, 100); g.lineTo(60 + k * 50, 380); g.stroke(); } g.setLineDash([]);
    g.lineWidth = 2; g.beginPath(); g.moveTo(50, 360); g.lineTo(290, 200); g.stroke();
    for (let k = 0; k < 5; k++) { const x = 50 + k * 60, y = 360 - k * 40; g.fillStyle = 'rgba(60,40,30,0.9)'; g.beginPath(); g.ellipse(x, y, 8, 4, -0.6, 0, 7); g.fill(); }
    g.fillStyle = '#d8a040'; g.beginPath(); g.arc(470, 250, 12, 0, 7); g.fill(); g.stroke();
    g.beginPath(); for (let a = 0; a < 6 * Math.PI; a += 0.05) { const rr2 = 150 * Math.exp(-a * 0.12); g.lineTo(470 + Math.cos(a) * rr2, 250 + Math.sin(a) * rr2); } g.stroke();
    g.fillStyle = 'rgba(40,30,20,0.9)'; g.font = 'italic 17px Georgia, serif'; g.textAlign = 'center';
    g.fillText('By the true moon she flies straight.', 170, 420); g.fillText('By a false one she spirals in.', 470, 420);
    g.font = 'italic 15px Georgia, serif'; g.fillText('We are the false moon. We light the lamp and they come to us.', w / 2, 40);
  });
}
function tallyTex() {
  return cv(384, 256, (g, w, h) => {
    const r = rr(77); g.strokeStyle = 'rgba(230,226,214,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let n = 0; n < 31; n++) { const x = 20 + (n % 8) * 44, y = 30 + Math.floor(n / 8) * 56; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 7, y + (r() - 0.5) * 3); g.lineTo(x + k * 7 + (r() - 0.5) * 3, y + 34); g.stroke(); } g.beginPath(); g.moveTo(x - 4, y + 28); g.lineTo(x + 26, y + 6); g.stroke(); }
    g.fillStyle = 'rgba(230,226,214,0.85)'; g.font = 'italic 22px Georgia, serif'; g.fillText('they do not mind me now', 40, h - 14);
  });
}
function slabAtlas() {
  const first = ['AMBROSE', 'HARRIET', 'TOBIAS', 'CONSTANCE', 'SILAS', 'AGNES', 'EWART', 'MARTHA', 'JOSIAH', 'ELLEN', 'GIDEON', 'MAUD', 'NATHANIEL', 'ADA', 'SEPTIMUS', 'LETTICE'];
  const last = ['FELL', 'COLE', 'MARSH', 'WREN', 'HOLLOWAY', 'PIKE', 'ASHDOWN', 'GREAVES', 'STRAKER', 'BIRCH', 'VOSS', 'LOCKE', 'TIERNEY', 'MOTT', 'HALE', 'CRANE'];
  return cv(1024, 384, (g, w, h) => {
    const r = rr(1879), cw = w / 8, ch = h / 4;
    for (let i = 0; i < 32; i++) {
      const x = (i % 8) * cw, y = Math.floor(i / 8) * ch, l = 120 + r() * 30;
      g.fillStyle = `rgb(${l},${l - 4},${l - 12})`; g.fillRect(x, y, cw, ch);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${40 + r() * 40},${40 + r() * 30},${30 + r() * 20},0.2)`; g.fillRect(x + r() * cw, y + r() * ch, 2, 2); }
      g.strokeStyle = 'rgba(30,26,20,0.6)'; g.lineWidth = 2; g.strokeRect(x + 5, y + 5, cw - 10, ch - 10);
      g.fillStyle = 'rgba(28,24,18,0.85)'; g.textAlign = 'center'; g.font = 'bold 13px Georgia, serif';
      g.fillText(first[i % 16] + ' ' + last[(i * 7) % 16], x + cw / 2, y + 28);
      g.font = '12px Georgia, serif'; g.fillText(String(1879 + (i % 9)), x + cw / 2, y + 46);
      g.font = 'italic 12px Georgia, serif'; g.fillText(i % 5 === 3 ? 'SHE SLEEPS' : 'TAKEN UP', x + cw / 2, y + 66);
      // the little moth glyph under each name
      const mx = x + cw / 2, my = y + 80; g.beginPath(); g.moveTo(mx, my - 2); g.quadraticCurveTo(mx + 9, my - 8, mx + 7, my + 2); g.quadraticCurveTo(mx, my + 5, mx - 7, my + 2); g.quadraticCurveTo(mx - 9, my - 8, mx, my - 2); g.fill();
    }
  });
}
function photoTex() {
  return cv(128, 160, (g, w, h) => {
    g.fillStyle = '#c8b898'; g.fillRect(0, 0, w, h); g.fillStyle = '#8a7a60'; g.fillRect(8, 8, w - 16, h - 32);
    g.fillStyle = '#4a3e30'; g.fillRect(8, 90, w - 16, 38); // the steps
    g.fillStyle = '#2a221a'; g.beginPath(); g.ellipse(46, 60, 12, 16, 0, 0, 7); g.fill(); g.fillRect(34, 72, 24, 50);
    g.beginPath(); g.ellipse(82, 82, 8, 10, 0, 0, 7); g.fill(); g.fillRect(74, 90, 16, 30);
    g.fillStyle = 'rgba(40,30,20,0.8)'; g.font = 'italic 10px Georgia, serif'; g.textAlign = 'center'; g.fillText('C. & L., 1880', w / 2, h - 10);
  });
}
function rollTex() {
  return cv(512, 340, (g, w, h) => {
    g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8964a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#d8c080'; g.textAlign = 'center'; g.font = '24px Georgia, serif'; g.fillText('IN THE SILK THEY WAIT', w / 2, 46);
    g.font = '15px Georgia, serif'; const names = ['Ambrose Fell', 'Harriet Cole', 'Tobias Marsh', 'Agnes Pike', 'Ewart Ashdown', 'Martha Greaves', 'Josiah Straker', 'Ellen Birch', 'Gideon Voss', 'Maud Locke', 'Septimus Hale', 'Constance Wren'];
    names.forEach((n, i) => g.fillText(n, i < 6 ? w * 0.3 : w * 0.7, 86 + (i % 6) * 34));
    g.font = 'italic 14px Georgia, serif'; g.fillText('and Luna, on the forty-eighth day', w / 2, h - 26);
  });
}
