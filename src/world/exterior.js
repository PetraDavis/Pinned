// The grounds and outside of the mansion: house, fence, overgrowth, sky.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand, addCollider } from './build.js';

export const FENCE = { front: 20, back: -52, half: 50 };
export const CLIMB_SPOT = new THREE.Vector3(-8, 0, 20);
export const BROKEN_WINDOW = new THREE.Vector3(11, 0, -12);
export const FRONT_DOOR = new THREE.Vector3(0, 0, -10.5);
export const GATE = new THREE.Vector3(0, 0, 20);

export function buildExterior(scene) {
  const group = new THREE.Group();
  const colliders = [];
  scene.add(group);

  const stoneMat = (rx, ry) => mat({ map: rep(tex.stone, rx, ry), color: 0xb8b8b8 });
  const slateMat = (rx, ry) => mat({ map: rep(tex.slate, rx, ry), color: 0x9aa0aa, roughness: 0.7 });
  const trimMat = mat({ color: 0x8c8a84, map: rep(tex.stone, 0.3, 0.3) });
  const ironMat = mat({ color: 0x15161a, roughness: 0.55, metalness: 0.7 });
  const plankMat = mat({ map: tex.plank, color: 0x9b8a78 });

  // ---------- ground ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat({ map: tex.grass, color: 0x8a9a80 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 30), mat({ map: tex.gravel, color: 0xa0a0a0 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 5); path.receiveShadow = true; group.add(path);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(400, 9), mat({ map: rep(tex.gravel, 60, 2), color: 0x777777 }));
  lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.015, 27.5); lane.receiveShadow = true; group.add(lane);

  // ---------- the mansion ----------
  const house = new THREE.Group(); group.add(house);
  // plinth
  box(house, 74, 0.7, 22, 0, 0.35, -22, trimMat);
  // main block
  box(house, 36, 13.5, 20, 0, 6.75, -22, stoneMat(9, 3.5), colliders);
  // wings
  for (const s of [-1, 1]) box(house, 18, 9.5, 15, s * 27, 4.75, -21.5, stoneMat(4.5, 2.5), colliders);
  // central porch tower
  box(house, 8, 16, 1.6, 0, 8, -11.3, stoneMat(2, 4), colliders);
  // string courses
  for (const y of [4.6, 8.8]) box(house, 36.4, 0.25, 20.4, 0, y, -22, trimMat, null, { cast: false });
  box(house, 36.6, 0.5, 20.6, 0, 13.6, -22, trimMat, null, { cast: false });
  for (const s of [-1, 1]) box(house, 18.4, 0.45, 15.4, s * 27, 9.6, -21.5, trimMat, null, { cast: false });

  // roofs
  const roof = (w, d, h, x, y, z, ry, m) => {
    const sh = new THREE.Shape();
    sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(d * 0.12, h); sh.lineTo(-d * 0.12, h); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.castShadow = mesh.receiveShadow = true;
    house.add(mesh); return mesh;
  };
  roof(37, 21, 7, 0, 13.8, -22, Math.PI / 2, slateMat(4, 1));
  for (const s of [-1, 1]) roof(19, 16, 4.5, s * 27, 9.8, -21.5, Math.PI / 2, slateMat(2, 0.6));
  // porch gable (ridge front-to-back)
  roof(4, 9, 4, 0, 16, -12, 0, slateMat(1, 0.5));
  // ridge cresting (iron)
  box(house, 30, 0.5, 0.08, 0, 21.05, -22, ironMat, null, { cast: false });

  // chimneys
  const chimneyMat = mat({ map: rep(tex.stone, 0.6, 2), color: 0x9a9690 });
  for (const [x, z, h] of [[-12, -18, 8], [-12, -27, 8], [12, -18, 8], [12, -27, 8], [-31, -21, 5.5], [31, -21, 5.5], [0, -30, 9]]) {
    const base = x === 0 ? 13.5 : (Math.abs(x) > 20 ? 9.5 : 13.5);
    box(house, 1.6, h, 1.1, x, base + h / 2, z, chimneyMat);
    box(house, 1.9, 0.3, 1.4, x, base + h, z, trimMat);
    for (const o of [-0.4, 0.4]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.8, 8), mat({ color: 0x4a3a30 }));
      pot.position.set(x + o, base + h + 0.55, z); pot.castShadow = true; house.add(pot);
    }
  }

  // turret on the east corner
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 18, 20), stoneMat(4, 4));
  turret.position.set(18.5, 9, -12.8); turret.castShadow = turret.receiveShadow = true; house.add(turret);
  addCollider(colliders, turret);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7, 20), slateMat(3, 2));
  cone.position.set(18.5, 21.5, -12.8); cone.castShadow = true; house.add(cone);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 2, 6), ironMat);
  finial.position.set(18.5, 26, -12.8); house.add(finial);
  for (const y of [4, 9.5, 14]) {
    const g = new THREE.Group(); g.position.set(18.5, 0, -12.8); house.add(g);
    for (const a of [0.2, 0.9, -0.5]) {
      const w = makeWindow(a === 0.9 && y === 4 ? 'boarded' : 'dark', 1.0, y === 14 ? 1.6 : 2.2);
      w.position.set(Math.sin(a) * 2.62, y, Math.cos(a) * 2.62); w.rotation.y = a; g.add(w);
    }
  }

  // ---------- windows ----------
  const addWin = (kind, x, y, z, ry, w = 1.3, h = 2.4) => {
    const win = makeWindow(kind, w, h); win.position.set(x, y, z); win.rotation.y = ry; house.add(win); return win;
  };
  const r = rand(77);
  const pick = () => { const v = r(); return v < 0.18 ? 'boarded' : v < 0.3 ? 'cracked' : 'dark'; };
  const floors = [[0.9, 2.5], [5.1, 2.5], [9.3, 2.2]];
  for (const x of [-15, -11, -7, 7, 11, 15]) {
    floors.forEach(([y, h], i) => {
      const kind = (x === 11 && i === 0) ? 'broken' : pick();
      addWin(kind, x, y, -12, 0, 1.3, h);
      addWin(pick(), x, y, -32, Math.PI, 1.3, h);
    });
  }
  for (const s of [-1, 1]) {
    for (const x of [21, 25, 29, 33]) for (const [y, h] of floors.slice(0, 2)) {
      addWin(pick(), s * x, y, -14, 0, 1.3, h);
      addWin(pick(), s * x, y, -29, Math.PI, 1.3, h);
    }
    for (const z of [-17.5, -21.5, -25.5]) for (const [y, h] of floors.slice(0, 2))
      addWin(pick(), s * 36, y, z, s * Math.PI / 2, 1.3, h);
  }
  // round window in porch gable
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), mat({ color: 0x0a0c10, roughness: 0.2, metalness: 0.5 }));
  oculus.position.set(0, 13.6, -10.48); house.add(oculus);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 8, 24), trimMat);
  ring.position.copy(oculus.position); house.add(ring);

  // ---------- front entrance ----------
  const doorMat = mat({ map: tex.wood, color: 0x8a7a6a });
  for (const s of [-1, 1]) box(house, 1.15, 3.2, 0.15, s * 0.6, 2.3, -10.45, doorMat, null, { cast: false });
  box(house, 3.2, 0.4, 0.4, 0, 4.1, -10.35, trimMat);
  for (const s of [-1, 1]) box(house, 0.5, 4.2, 0.5, s * 1.65, 2.6, -10.3, trimMat);
  // boards nailed across the door
  for (const [y, a] of [[1.6, 0.25], [2.5, -0.2], [3.3, 0.1]]) {
    const b = box(house, 3.0, 0.26, 0.06, 0, y, -10.33, plankMat, null, { cast: false }); b.rotation.z = a;
  }
  // steps
  for (let i = 0; i < 3; i++) box(house, 5 - i * 0.4, 0.25, 1.2 - i * 0.3, 0, 0.12 + i * 0.25, -9.6 - i * 0.15, trimMat, i === 0 ? colliders : null);
  // the moth mosaic: the Order of the Pale Wing
  const mosaic = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), mat({ map: tex.mosaic, roughness: 0.55, metalness: 0.1 }));
  mosaic.position.set(0, 7.6, -10.48); house.add(mosaic);
  box(house, 4.7, 0.25, 0.3, 0, 5.4, -10.4, trimMat);
  box(house, 4.7, 0.25, 0.3, 0, 9.8, -10.4, trimMat);
  for (const s of [-1, 1]) box(house, 0.25, 4.6, 0.3, s * 2.3, 7.6, -10.4, trimMat);
  // pillars flanking the porch
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.5, 12), trimMat);
    col.position.set(s * 3, 2.95, -9.6); col.castShadow = true; house.add(col); addCollider(colliders, col);
  }
  box(house, 7.2, 0.4, 1.6, 0, 5.3, -10, trimMat);

  // ivy creeping up the walls
  const ivyMat = mat({ map: tex.grassBlade, color: 0x2a3a22, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) {
    const w = 2 + r() * 4, h = 3 + r() * 8;
    const ivy = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ivyMat);
    const onWing = r() < 0.4, s = r() < 0.5 ? -1 : 1;
    ivy.position.set(onWing ? s * (19 + r() * 16) : (r() - 0.5) * 34, h / 2, (onWing ? -14 : -12) + 0.08);
    house.add(ivy);
  }

  // ---------- the fence ----------
  buildFence(group, colliders, ironMat, trimMat);

  // ---------- overgrowth ----------
  buildGrass(group);
  const bushMat = mat({ color: 0x18220f, roughness: 1 });
  for (let i = 0; i < 70; i++) {
    let x, z;
    const side = r();
    if (side < 0.5) { x = (r() - 0.5) * 72; z = -10.5 + r() * 2.5; if (Math.abs(x) < 4.5 || Math.abs(x - 11) < 1.6) continue; }
    else { x = (r() - 0.5) * 96; z = -48 + r() * 66; if (Math.abs(x) < 3 || (Math.abs(x) < 38 && z < -8 && z > -34)) continue; }
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + r() * 1.1, 1), bushMat);
    b.position.set(x, 0.3, z); b.scale.y = 0.7; b.castShadow = true; group.add(b);
  }
  const trunkMat = mat({ color: 0x2b2722, map: tex.wood });
  for (const [x, z, h] of [[-26, 8, 11], [-38, -4, 13], [28, 6, 12], [40, -2, 10], [-14, 13, 8], [34, 14, 9], [-42, 14, 12], [-30, -42, 14], [32, -44, 12], [16, 12, 7]]) {
    const t = deadTree(trunkMat, h, Math.floor(x * 13 + z));
    t.position.set(x, 0, z); group.add(t);
    rect(colliders, x - 0.5, x + 0.5, z - 0.5, z + 0.5);
  }
  // broken fountain on the path
  const fountainMat = mat({ map: rep(tex.stone, 2, 0.5), color: 0x8a8a86 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 24, 1, true), fountainMat);
  basin.position.set(0, 0.4, 4); basin.material.side = THREE.DoubleSide; basin.castShadow = true; group.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.15, 24), mat({ color: 0x0c120e, roughness: 0.1, metalness: 0.6 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.5, 4); group.add(water);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 10), fountainMat);
  plinth.position.set(0, 1.1, 4); plinth.castShadow = true; group.add(plinth);
  const urn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), fountainMat);
  urn.position.set(0, 2.5, 4); urn.rotation.z = 0.5; group.add(urn);
  rect(colliders, -2.3, 2.3, 1.7, 6.3);

  // the way outside: hedge across the lane, a dead street lamp
  for (let x = -60; x < 60; x += 3) box(group, 3.1, 2.2 + Math.sin(x) * 0.3, 1.6, x, 1.1, 33, bushMat, null);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 4.2, 8), ironMat);
  lamp.position.set(6, 2.1, 31.5); lamp.castShadow = true; group.add(lamp);
  box(group, 0.45, 0.6, 0.45, 6, 4.4, 31.5, mat({ color: 0x1a1d20, roughness: 0.3, metalness: 0.5 }));
  // invisible bounds for the starting lane
  rect(colliders, -60, 60, 32, 34); rect(colliders, -54, -52, 19, 34); rect(colliders, 52, 54, 19, 34);

  // ---------- sky ----------
  buildSky(scene, group);

  return { group, colliders };
}

function makeWindow(kind, w, h) {
  const g = new THREE.Group();
  const frame = mat({ color: 0x2a2724, roughness: 0.8 });
  const stone = mat({ color: 0x8c8a84, map: tex.stone });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.12, metalness: 0.8, emissive: 0x05080d });
  const add = (bw, bh, bd, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m); b.position.set(x, y, z); g.add(b); return b;
  };
  // reveal (dark hole) and glass
  if (kind !== 'broken') {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); p.position.set(0, h / 2, 0.02); g.add(p);
  } else {
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x020203 }));
    hole.position.set(0, h / 2, 0.01); g.add(hole);
    // jagged remnants of glass around the edges
    const shardMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const rr = rand(5);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Shape(); const base = 0.25 + rr() * 0.35;
      s.moveTo(-base / 2, 0); s.lineTo(base / 2, 0); s.lineTo((rr() - 0.5) * 0.2, 0.2 + rr() * 0.5); s.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), shardMat);
      const edge = i % 3;
      if (edge === 0) { m.position.set(-w / 2 + 0.1 + rr() * (w - 0.2), 0.05, 0.03); }
      else if (edge === 1) { m.position.set(-w / 2 + 0.05, 0.3 + rr() * (h - 0.6), 0.03); m.rotation.z = -Math.PI / 2; }
      else { m.position.set(-w / 2 + 0.1 + rr() * (w - 0.2), h - 0.05, 0.03); m.rotation.z = Math.PI; }
      g.add(m);
    }
  }
  if (kind === 'cracked') {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false }));
    c.position.set(0, h / 2, 0.03); g.add(c);
  }
  // frame & mullions
  add(w + 0.2, 0.12, 0.12, 0, h + 0.06, 0.05, frame);
  add(0.12, h, 0.12, -w / 2 - 0.04, h / 2, 0.05, frame);
  add(0.12, h, 0.12, w / 2 + 0.04, h / 2, 0.05, frame);
  if (kind !== 'broken') {
    add(0.06, h, 0.06, 0, h / 2, 0.05, frame);
    add(w, 0.06, 0.06, 0, h * 0.62, 0.05, frame);
  } else {
    const m = add(0.06, h * 0.7, 0.06, 0.18, h * 0.62, 0.08, frame); m.rotation.z = 0.5; // snapped mullion
  }
  // sill and stone hood
  add(w + 0.5, 0.15, 0.35, 0, -0.05, 0.15, stone);
  add(w + 0.6, 0.3, 0.3, 0, h + 0.3, 0.12, stone);
  add(w + 0.2, 0.12, 0.25, 0, h + 0.5, 0.1, stone);
  if (kind === 'boarded') {
    const pm = mat({ map: tex.plank, color: 0x9b8a78 });
    for (let i = 0; i < 4; i++) {
      const b = add(w + 0.3, 0.22, 0.05, 0, h * (0.15 + i * 0.24), 0.12, pm);
      b.rotation.z = (i % 2 ? 1 : -1) * 0.08;
    }
  }
  g.traverse(o => { o.castShadow = false; o.receiveShadow = true; });
  return g;
}

let _crack;
function crackTex() {
  if (_crack) return _crack;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.strokeStyle = 'rgba(200,210,220,0.6)'; g.lineWidth = 1.2;
  const r = rand(9); const cx = 90, cy = 110;
  for (let i = 0; i < 14; i++) {
    let x = cx, y = cy, a = (i / 14) * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { a += (r() - 0.5) * 0.6; x += Math.cos(a) * 25; y += Math.sin(a) * 25; g.lineTo(x, y); }
    g.stroke();
  }
  _crack = new THREE.CanvasTexture(c); return _crack;
}

function buildFence(group, colliders, ironMat, trimMat) {
  const { front, back, half } = FENCE;
  const H = 2.6, spacing = 0.16;
  const segs = [
    [[-half, front], [-2.2, front]], [[2.2, front], [half, front]],
    [[-half, back], [half, back]],
    [[-half, back], [-half, front]], [[half, back], [half, front]],
  ];
  const pts = [];
  for (const [[x1, z1], [x2, z2]] of segs) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(len / spacing);
    for (let i = 0; i <= n; i++) {
      const t = i / n; pts.push([x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 0]);
    }
    // rails
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, ry = Math.atan2(x2 - x1, z2 - z1);
    for (const y of [0.25, H - 0.35]) box(group, 0.05, 0.07, len, cx, y, cz, ironMat, null, { ry, cast: false });
    if (z1 === z2) rect(colliders, Math.min(x1, x2), Math.max(x1, x2), z1 - 0.15, z1 + 0.15);
    else rect(colliders, x1 - 0.15, x1 + 0.15, Math.min(z1, z2), Math.max(z1, z2));
  }
  // the gate (chained shut)
  for (let x = -2.1; x <= 2.1; x += 0.14) pts.push([x, front, 0.5]);
  rect(colliders, -2.2, 2.2, front - 0.15, front + 0.15);
  for (const y of [0.25, 1.4, H + 0.1]) box(group, 4.3, 0.07, 0.06, 0, y, front, ironMat, null, { cast: false });
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), mat({ color: 0x3a3028, metalness: 0.6, roughness: 0.6 }));
  chain.position.set(0, 1.4, front + 0.08); group.add(chain);
  box(group, 0.18, 0.22, 0.08, 0, 1.18, front + 0.12, mat({ color: 0x4a3a20, metalness: 0.6, roughness: 0.5 })); // padlock

  const n = pts.length;
  const barGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  const tipGeo = new THREE.ConeGeometry(0.045, 0.22, 6);
  const bars = new THREE.InstancedMesh(barGeo, ironMat, n);
  const tips = new THREE.InstancedMesh(tipGeo, ironMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const r = rand(3);
  pts.forEach(([x, z, extra], i) => {
    // a couple of bent / sagging bars at the climbable section
    const near = Math.abs(x - CLIMB_SPOT.x) < 0.8 && z === front;
    const h = H + extra + (near ? -0.25 : 0);
    const lean = near ? (r() - 0.5) * 0.25 : (r() - 0.5) * 0.02;
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean);
    s.set(1, h, 1); p.set(x, h / 2, z);
    bars.setMatrixAt(i, m.compose(p, q, s));
    s.set(1, 1, 1); p.set(x, h + 0.1, z + Math.sin(lean) * h);
    tips.setMatrixAt(i, m.compose(p, q, s));
  });
  bars.castShadow = tips.castShadow = true;
  group.add(bars, tips);

  // stone piers every ~10 m and taller gate piers
  const pier = (x, z, h) => {
    box(group, 0.7, h, 0.7, x, h / 2, z, trimMat, colliders);
    box(group, 0.9, 0.2, 0.9, x, h + 0.1, z, trimMat);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), trimMat);
    ball.position.set(x, h + 0.45, z); ball.castShadow = true; group.add(ball);
  };
  for (let x = -half; x <= half; x += 10) if (Math.abs(x) > 3) { pier(x, front, 2.9); pier(x, back, 2.9); }
  for (let z = back; z < front; z += 12) { pier(-half, z, 2.9); pier(half, z, 2.9); }
  pier(-2.6, front, 3.6); pier(2.6, front, 3.6);

  // the climbable spot: an old stone mounting block pushed against the fence
  const blockMat = mat({ map: rep(tex.stone, 0.5, 0.3), color: 0x8a8a84 });
  box(group, 1.4, 0.7, 0.9, CLIMB_SPOT.x, 0.35, front + 0.65, blockMat, colliders);
  box(group, 1.0, 0.35, 0.6, CLIMB_SPOT.x - 0.1, 0.87, front + 0.55, blockMat);
}

function buildGrass(group) {
  const geo = new THREE.PlaneGeometry(1.2, 0.9); geo.translate(0, 0.45, 0);
  const geo2 = geo.clone().rotateY(Math.PI / 2);
  const material = mat({ map: tex.grassBlade, color: 0x9aaa88, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
  const count = 4500;
  const a = new THREE.InstancedMesh(geo, material, count), b = new THREE.InstancedMesh(geo2, material, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const r = rand(42); let i = 0;
  while (i < count) {
    const x = (r() - 0.5) * 140, z = -70 + r() * 105;
    if (z > 21 && z < 32) continue; // lane
    if (Math.abs(x) < 1.8 && z > -10 && z < 21) continue; // path
    if (Math.abs(x) < 37 && z < -9.8 && z > -33) continue; // house
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
    const sc = 0.6 + r() * 1.1; s.set(sc, sc * (0.7 + r() * 0.8), sc); p.set(x, 0, z);
    m.compose(p, q, s); a.setMatrixAt(i, m); b.setMatrixAt(i, m); i++;
  }
  group.add(a, b);
}

function deadTree(material, h, seed) {
  const r = rand(seed * 7 + 11);
  const tree = new THREE.Group();
  const limb = (parent, len, rad, depth) => {
    const geo = new THREE.CylinderGeometry(rad * 0.6, rad, len, 6); geo.translate(0, len / 2, 0);
    const mesh = new THREE.Mesh(geo, material); mesh.castShadow = true; parent.add(mesh);
    if (depth > 0) {
      const kids = 2 + Math.floor(r() * 2);
      for (let k = 0; k < kids; k++) {
        const holder = new THREE.Group(); holder.position.y = len * (0.55 + r() * 0.45);
        holder.rotation.set((r() - 0.5) * 1.6, r() * Math.PI * 2, (r() - 0.5) * 1.6);
        mesh.add(holder); limb(holder, len * (0.5 + r() * 0.25), rad * 0.6, depth - 1);
      }
    }
  };
  limb(tree, h * 0.45, 0.45, 4);
  tree.rotation.z = (r() - 0.5) * 0.1;
  return tree;
}

function buildSky(scene, group) {
  // stars
  const n = 1500, pos = new Float32Array(n * 3), r = rand(99);
  for (let i = 0; i < n; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(0.15 + r() * 0.85), R = 380;
    pos.set([Math.cos(th) * Math.sin(ph) * R, Math.cos(ph) * R, Math.sin(th) * Math.sin(ph) * R], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaab4c8, size: 1.2, sizeAttenuation: false, fog: false }));
  group.add(stars);
  // moon with halo
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(240,240,225,1)'); gr.addColorStop(0.2, 'rgba(225,228,220,1)');
  gr.addColorStop(0.24, 'rgba(160,175,200,0.35)'); gr.addColorStop(1, 'rgba(60,80,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(150,150,140,0.35)';
  for (const [x, y, rr] of [[115, 120, 9], [138, 132, 6], [124, 142, 5]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false }));
  moon.scale.set(90, 90, 1); moon.position.set(-170, 190, -260); group.add(moon);

  // ground mist sheets
  const mc = document.createElement('canvas'); mc.width = mc.height = 128; const mg = mc.getContext('2d');
  const mgr = mg.createRadialGradient(64, 64, 0, 64, 64, 64);
  mgr.addColorStop(0, 'rgba(160,175,195,0.22)'); mgr.addColorStop(1, 'rgba(160,175,195,0)');
  mg.fillStyle = mgr; mg.fillRect(0, 0, 128, 128);
  const mistMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mc), transparent: true, depthWrite: false });
  const mist = new THREE.Group(); mist.name = 'mist';
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mistMat);
    p.rotation.x = -Math.PI / 2; p.position.set((r() - 0.5) * 110, 0.4 + r() * 0.8, -55 + r() * 85);
    p.userData.drift = 0.2 + r() * 0.4; mist.add(p);
  }
  group.add(mist);
}
