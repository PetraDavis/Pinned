// The grounds and outside of the mansion: house, fence, overgrowth, sky.
import * as THREE from 'three';
import { cultGlassTexture } from './stainedGlass.js';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand, addCollider } from './build.js';

export const FENCE = { front: 20, back: -52, half: 50 };
export const CLIMB_SPOT = new THREE.Vector3(-8, 0, 20);
export const BROKEN_WINDOW = new THREE.Vector3(11, 0, -12);
export const FRONT_DOOR = new THREE.Vector3(0, 0, -10.5);
// Low evening sun, from the west and slightly in front of the house (rakes across the facade).
export const SUN_DIR = new THREE.Vector3(-0.8, 0.2, 0.55).normalize();
export const GATE = new THREE.Vector3(0, 0, 20);

export function buildExterior(scene, quality = 'high') {
  const group = new THREE.Group();
  const colliders = [];
  scene.add(group);

  const stoneMat = (rx, ry) => mat({ map: rep(tex.stone, rx, ry), color: 0xb8b8b8 });
  const slateMat = (rx, ry) => mat({ map: rep(tex.slate, rx, ry), color: 0x9aa0aa, roughness: 0.7 });
  const trimMat = mat({ color: 0x8c8a84, map: rep(tex.stone, 0.3, 0.3) });
  const ironMat = mat({ color: 0x15161a, roughness: 0.55, metalness: 0.7 });
  const plankMat = mat({ map: tex.plank, color: 0x9b8a78 });

  // ---------- ground ----------
  // Dry, rough lawn: tiled grass texture plus large-scale vertex-colour variation
  // (worn dirt patches, darker weedy clumps) so it never reads as a flat sheet.
  const gGeo = new THREE.PlaneGeometry(400, 400, 160, 160);
  const gp = gGeo.attributes.position, cols = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i);
    const n = Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * 0.5 + Math.sin(y * 0.13 + x * 0.05) * 0.35 + Math.sin(x * 0.37 - y * 0.29) * 0.15;
    const dirt = THREE.MathUtils.smoothstep(n, 0.35, 0.8);
    const c = new THREE.Color(0xa8b882).lerp(new THREE.Color(0xb39a78), dirt).multiplyScalar(1.25 + Math.sin(x * 0.8) * Math.cos(y * 0.9) * 0.12);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const groundMat = mat({ map: tex.grass, vertexColors: true, roughness: 1 });
  const ground = new THREE.Mesh(gGeo, groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 30), mat({ map: tex.gravel, color: 0xa89c88, roughness: 1 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 5); path.receiveShadow = true; group.add(path);
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(400, 9), mat({ map: rep(tex.gravel, 60, 2), color: 0x8a8070, roughness: 1 }));
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

  // ---------- facade detail: dentil cornices, quoins, porch balustrade ----------
  {
    const parts = { dentil: [], quoin: [], baluster: [] };
    const run = (list, x1, z1, x2, z2, y, step, nx, nz) => {
      const len = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(len / step);
      for (let i = 0; i <= n; i++) {
        const t = i / n; list.push([x1 + (x2 - x1) * t + nx, y, z1 + (z2 - z1) * t + nz, Math.atan2(nx, nz)]);
      }
    };
    // main block cornice (front, back, sides) and wing cornices
    run(parts.dentil, -18, -12, 18, -12, 13.3, 0.32, 0, 0.08);
    run(parts.dentil, -18, -32, 18, -32, 13.3, 0.32, 0, -0.08);
    for (const s of [-1, 1]) {
      run(parts.dentil, s * 18, -12, s * 18, -32, 13.3, 0.32, s * 0.08, 0);
      run(parts.dentil, s * 18, -14, s * 36, -14, 9.25, 0.32, 0, 0.08);
      run(parts.dentil, s * 36, -14, s * 36, -29, 9.25, 0.32, s * 0.08, 0);
      run(parts.dentil, s * 18, -29, s * 36, -29, 9.25, 0.32, 0, -0.08);
      // quoins: alternating long/short blocks up each visible corner
      for (const [x, z, top] of [[s * 18, -12, 13.4], [s * 36, -14, 9.4], [s * 36, -29, 9.4], [s * 18, -32, 13.4], [s * 4, -10.5, 15.8]]) {
        for (let y = 0.9, k = 0; y < top; y += 0.62, k++) parts.quoin.push([x, y, z, k % 2]);
      }
    }
    // balustrade on top of the porch ledge
    for (let x = -3.4; x <= 3.4; x += 0.28) parts.baluster.push([x, 5.85, -9.35, 0]);
    const dentilMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), trimMat, parts.dentil.length);
    const quoinMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.56, 1), trimMat, parts.quoin.length);
    const balGeo = new THREE.LatheGeometry([[0.07, 0], [0.1, 0.08], [0.05, 0.2], [0.11, 0.38], [0.05, 0.55], [0.08, 0.62]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
    const balMesh = new THREE.InstancedMesh(balGeo, trimMat, parts.baluster.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    parts.dentil.forEach(([x, y, z, ry], i) => dentilMesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q.setFromAxisAngle(up, ry), sc.set(1, 1, 1))));
    parts.quoin.forEach(([x, y, z, long], i) => {
      const L = long ? 0.95 : 0.6;
      quoinMesh.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), sc.set(L, 1, L)));
    });
    parts.baluster.forEach(([x, y, z], i) => balMesh.setMatrixAt(i, m4.compose(p.set(x, y - 0.3, z), q.identity(), sc.set(1, 1, 1))));
    for (const im of [dentilMesh, quoinMesh, balMesh]) { im.castShadow = true; im.receiveShadow = true; house.add(im); }
    box(house, 7.2, 0.12, 0.3, 0, 6.15, -9.35, trimMat); // balustrade rail
    // plinth moulding and eave fascias
    box(house, 74.3, 0.18, 22.3, 0, 0.78, -22, trimMat, null, { cast: false });
    box(house, 37.4, 0.3, 21.4, 0, 13.85, -22, trimMat, null, { cast: false });
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
      if (x === 11 && i === 0) buildBrokenWindow(house, x, -12);
      else addWin(pick(), x, y, -12, 0, 1.3, h);
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
  // a round leaded-glass rose window in the cult's moth design: the same window the Grand
  // Hall shows from inside, set in a polished brass ring
  const glassTex = cultGlassTexture(tex.mosaicFloor.userData.design, 512);
  const mosaic = new THREE.Mesh(new THREE.CircleGeometry(2.0, 96), new THREE.MeshStandardMaterial({ map: glassTex, emissive: 0xffffff, emissiveMap: glassTex, emissiveIntensity: 0.22, roughness: 0.12, metalness: 0.05 }));
  mosaic.position.set(0, 7.6, -10.47); house.add(mosaic);
  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.11, 20, 128), new THREE.MeshStandardMaterial({ color: 0xd0a850, metalness: 1, roughness: 0.2 }));
  goldRing.position.set(0, 7.6, -10.46); house.add(goldRing);
  // pillars flanking the porch
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.5, 12), trimMat);
    col.position.set(s * 3, 2.95, -9.6); col.castShadow = true; house.add(col); addCollider(colliders, col);
  }
  box(house, 7.2, 0.4, 1.6, 0, 5.3, -10, trimMat);

  // ivy creeping up the walls
  const ivyMat = mat({ map: tex.grassBlade, color: 0x2a3a22, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  for (let i = 0; i < 26; i++) {
    const w = 1.5 + r() * 2.5, h = 2 + r() * 5;
    const ivy = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ivyMat);
    const onWing = r() < 0.4, s = r() < 0.5 ? -1 : 1;
    ivy.position.set(onWing ? s * (19 + r() * 16) : (r() - 0.5) * 34, h / 2, (onWing ? -14 : -12) + 0.08);
    if (i % 2 || (!onWing && Math.abs(ivy.position.x - BROKEN_WINDOW.x) < 3)) continue; // keep the way in clear
    house.add(ivy);
  }

  // ---------- the fence ----------
  buildFence(group, colliders, ironMat, trimMat);

  // ---------- overgrowth ----------
  buildGrass(group, 10000); // the quality setting shows a share of these (main.js)
  const bushMat = mat({ color: 0x18220f, roughness: 1 });
  for (let i = 0; i < 70; i++) {
    let x, z;
    const side = r();
    if (side < 0.5) { x = (r() - 0.5) * 72; z = -10.5 + r() * 2.5; if (Math.abs(x) < 4.5 || Math.abs(x - 11) < 3) continue; }
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
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.15, 24), mat({ map: rep(tex.gravel, 1, 1), color: 0x6a5238, roughness: 1 })); // dry, full of dead leaves
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.3, 4); group.add(water);
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

// The way in: a wide ground-floor window, smashed, with a crate pushed under it.
export function buildBrokenWindow(house, x, z) {
  const W = 2.0, H = 2.6, Y = 0.75;
  const g = new THREE.Group(); g.position.set(x, Y, z); house.add(g);
  const stone = mat({ color: 0x9a968e, map: rep(tex.stone, 0.5, 0.5) });
  const wood = mat({ map: tex.wood, color: 0x6a5a4a });
  const add = (bw, bh, bd, px, py, pz, m, rz = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m); b.position.set(px, py, pz); b.rotation.z = rz;
    b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };
  // recess: dark reveal walls and a dim view of the room inside
  const ic = document.createElement('canvas'); ic.width = 256; ic.height = 320; const ig = ic.getContext('2d');
  const igr = ig.createRadialGradient(150, 170, 10, 128, 160, 220);
  igr.addColorStop(0, '#8a5e3c'); igr.addColorStop(0.5, '#3a2818'); igr.addColorStop(1, '#070504');
  ig.fillStyle = igr; ig.fillRect(0, 0, 256, 320);
  ig.fillStyle = 'rgba(0,0,0,0.6)'; ig.fillRect(40, 190, 120, 60); ig.fillRect(30, 160, 20, 90); // sofa shape
  ig.fillStyle = 'rgba(190,150,110,0.25)'; ig.fillRect(160, 60, 60, 60); // a picture frame catching light
  // painted reveal: the thickness of the wall, in shadow, gives the hole depth
  ig.fillStyle = 'rgba(20,16,14,0.95)';
  ig.beginPath(); ig.moveTo(0, 0); ig.lineTo(256, 0); ig.lineTo(226, 28); ig.lineTo(30, 28); ig.closePath(); ig.fill();
  ig.beginPath(); ig.moveTo(0, 0); ig.lineTo(30, 28); ig.lineTo(30, 300); ig.lineTo(0, 320); ig.closePath(); ig.fill();
  ig.fillStyle = 'rgba(60,48,40,0.95)';
  ig.beginPath(); ig.moveTo(256, 0); ig.lineTo(226, 28); ig.lineTo(226, 300); ig.lineTo(256, 320); ig.closePath(); ig.fill();
  ig.beginPath(); ig.moveTo(0, 320); ig.lineTo(30, 300); ig.lineTo(226, 300); ig.lineTo(256, 320); ig.closePath(); ig.fill();
  const itex = new THREE.CanvasTexture(ic); itex.colorSpace = THREE.SRGBColorSpace;
  const view = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: itex }));
  view.position.set(0, H / 2, 0.03); g.add(view);
  // stone surround: architrave, deep sill, hood, keystone
  for (const sx of [-1, 1]) add(0.22, H + 0.2, 0.3, sx * (W / 2 + 0.11), H / 2, 0.08, stone);
  add(W + 0.7, 0.18, 0.45, 0, -0.06, 0.18, stone);
  add(W + 0.8, 0.3, 0.32, 0, H + 0.3, 0.12, stone);
  add(W + 0.4, 0.12, 0.26, 0, H + 0.5, 0.1, stone);
  add(0.3, 0.46, 0.36, 0, H + 0.32, 0.17, stone);
  // sash frame, a snapped mullion and a sash bar hanging loose
  const frame = mat({ color: 0x2e2a26, roughness: 0.8 });
  add(W, 0.1, 0.1, 0, H - 0.05, 0.02, frame); add(W, 0.1, 0.12, 0, 0.05, 0.02, frame);
  for (const sx of [-1, 1]) add(0.1, H, 0.1, sx * (W / 2 - 0.05), H / 2, 0.02, frame);
  add(0.07, 1.0, 0.07, 0, H - 0.6, 0.02, frame);           // mullion stub from the top
  add(0.07, 0.6, 0.07, 0, 0.35, 0.02, frame);              // stub from the bottom
  add(0.06, 1.1, 0.06, 0.28, 1.15, 0.06, frame, 0.7);      // broken piece hanging askew
  add(W * 0.48, 0.06, 0.06, -W / 4, H * 0.62, 0.02, frame); // one surviving sash bar
  // jagged shards still in the frame
  const shardMat = new THREE.MeshPhysicalMaterial({ color: 0xb8c8d0, roughness: 0.04, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.5, clearcoat: 1, side: THREE.DoubleSide });
  const rr = rand(11);
  const shard = (px, py, rot, len, base) => {
    const sh = new THREE.Shape(); sh.moveTo(-base / 2, 0); sh.lineTo(base / 2, 0);
    sh.lineTo(base * (rr() - 0.5) * 0.6, len * 0.55); sh.lineTo((rr() - 0.5) * 0.08, len); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), shardMat);
    m.position.set(px, py, 0.05); m.rotation.z = rot; g.add(m);
  };
  for (let i = 0; i < 7; i++) shard(-W / 2 + 0.15 + i * (W - 0.3) / 6, 0.1, (rr() - 0.5) * 0.4, 0.25 + rr() * 0.45, 0.22 + rr() * 0.15);
  for (let i = 0; i < 7; i++) shard(-W / 2 + 0.15 + i * (W - 0.3) / 6, H - 0.1, Math.PI + (rr() - 0.5) * 0.4, 0.2 + rr() * 0.5, 0.2 + rr() * 0.15);
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) shard(sx * (W / 2 - 0.1), 0.4 + i * 0.55, -sx * Math.PI / 2 + (rr() - 0.5) * 0.3, 0.15 + rr() * 0.35, 0.2);
  // glass glittering on the ground below
  for (let i = 0; i < 45; i++) {
    const k = 0.04 + rr() * 0.12, sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(k, rr() * k * 0.4); sh.lineTo(rr() * k, k); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), shardMat);
    m.rotation.set(-Math.PI / 2, 0, rr() * 6.28);
    m.position.set((rr() - 0.5) * 2.6, -Y + 0.03 + rr() * 0.01, 0.5 + rr() * 1.4); g.add(m);
  }
  // old crate and rubble pushed under the window: the obvious way up
  const crateMat = mat({ map: tex.plank, color: 0xa08a70 });
  const crate = add(0.9, 0.75, 0.75, 0.45, -Y + 0.37, 1.45, crateMat); crate.rotation.y = 0.15;
  for (const [px, pz, s2] of [[-0.7, 0.6, 0.22], [-0.4, 0.9, 0.15], [1.1, 0.8, 0.18], [-1.0, 1.1, 0.12]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s2, 0), stone);
    rock.position.set(px, -Y + s2 * 0.6, pz + 0.7); rock.rotation.set(rr() * 3, rr() * 3, 0); rock.castShadow = true; g.add(rock);
  }
  // a torn curtain lifting out through the gap
  const cGeo = new THREE.PlaneGeometry(0.6, 1.8, 4, 10); cGeo.translate(0, -0.9, 0);
  const cMat = mat({ map: tex.fabric, color: 0x8a7070, side: THREE.DoubleSide });
  const curtain = new THREE.Mesh(cGeo, cMat); curtain.position.set(-0.6, H - 0.15, -0.05); curtain.name = 'curtain'; g.add(curtain);
  // faint warm glow from inside so players notice it
  const glow = new THREE.PointLight(0xffa060, 5, 4, 2); glow.position.set(0.2, 1.3, 0.5); g.add(glow);
  return g;
}

let winMats = null;
function makeWindow(kind, w, h) {
  const g = new THREE.Group();
  const M = winMats || (winMats = {
    frame: mat({ color: 0x2a2724, roughness: 0.8 }),
    stone: mat({ color: 0x8c8a84, map: rep(tex.stone, 0.4, 0.4) }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x10141c, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, reflectivity: 0.9, emissive: 0x05070b }),
    plank: mat({ map: tex.plank, color: 0x9b8a78 }),
  });
  const { frame, stone, glass } = M;
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
    add(w, 0.07, 0.07, 0, h * 0.62, 0.05, frame);
    for (const f of [0.31, 0.81]) add(w, 0.035, 0.04, 0, h * f, 0.04, frame); // glazing bars
    for (const sx of [-1, 1]) add(0.035, h, 0.04, sx * w / 4, h / 2, 0.04, frame);
  } else {
    const m = add(0.06, h * 0.7, 0.06, 0.18, h * 0.62, 0.08, frame); m.rotation.z = 0.5; // snapped mullion
  }
  // sill and stone hood
  add(w + 0.5, 0.15, 0.35, 0, -0.05, 0.15, stone);
  add(w + 0.6, 0.3, 0.3, 0, h + 0.3, 0.12, stone);
  add(w + 0.2, 0.12, 0.25, 0, h + 0.5, 0.1, stone);
  add(0.26, 0.42, 0.34, 0, h + 0.3, 0.16, stone); // keystone
  for (const sx of [-1, 1]) {
    add(0.16, h + 0.1, 0.22, sx * (w / 2 + 0.2), h / 2, 0.08, stone); // architrave
    add(0.14, 0.24, 0.3, sx * (w / 2 + 0.12), -0.22, 0.12, stone); // sill brackets
  }
  if (kind === 'boarded') {
    const pm = M.plank;
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

function buildGrass(group, count) {
  const geo = new THREE.PlaneGeometry(1.2, 0.9); geo.translate(0, 0.45, 0);
  const geo2 = geo.clone().rotateY(Math.PI / 2);
  const material = mat({ map: tex.grassBlade, color: 0x9aaa88, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
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
  a.userData.grass = b.userData.grass = true; a.userData.max = b.userData.max = count;
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
  // dusk sky dome: warm band low on the horizon, purple above, deep blue at the zenith,
  // brighter towards the sun
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: SUN_DIR }, moonDir: { value: new THREE.Vector3(150, 150, -280).normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
    fragmentShader: `
      uniform vec3 sunDir; uniform vec3 moonDir; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        float s = max(dot(normalize(vec3(vDir.x,0.0,vDir.z)), normalize(vec3(sunDir.x,0.0,sunDir.z))), 0.0);
        vec3 zenith = vec3(0.05,0.08,0.18);
        vec3 mid = vec3(0.24,0.17,0.33);
        vec3 horizon = mix(vec3(0.62,0.33,0.30), vec3(0.98,0.52,0.24), pow(s, 3.0));
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
        c = mix(c, zenith, smoothstep(0.15, 0.7, h));
        c += vec3(1.0,0.6,0.3) * pow(max(dot(vDir, sunDir), 0.0), 64.0) * 0.8;
        c = mix(c, vec3(0.22,0.18,0.24), smoothstep(0.0, -0.15, h));
        // a faint dusk moon, part of the sky itself (no sprite quad)
        float m = dot(normalize(vDir), moonDir);
        c += vec3(0.45,0.5,0.62) * pow(max(m, 0.0), 900.0) * 0.18;
        c = mix(c, vec3(0.86,0.86,0.8), smoothstep(0.99955, 0.99965, m) * 0.45);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(390, 32, 16), skyMat);
  dome.renderOrder = -1; group.add(dome);
  // stars
  const n = 600, pos = new Float32Array(n * 3), r = rand(99);
  for (let i = 0; i < n; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(0.55 + r() * 0.45), R = 380;
    pos.set([Math.cos(th) * Math.sin(ph) * R, Math.cos(ph) * R, Math.sin(th) * Math.sin(ph) * R], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaab4c8, size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.35 }));
  group.add(stars);
  // (the moon is drawn by the sky dome shader)

  // (no flat ground-mist planes: they read as standing water; scene fog does the job)
}
