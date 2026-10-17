// The first room: a large, grey Victorian drawing room behind the broken window.
// Built away from the exterior (at ROOM_ORIGIN) and entered via a short fade.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';
import { createPuzzle, buildHallway, STANDS } from './drawerPuzzle.js';
import { buildGroundFloor } from './groundFloor.js';

export const ROOM_ORIGIN = new THREE.Vector3(1000, 0, 0);
const W = 14, D = 10, H = 4.6;
const WIN = { x: 2, w: 2.0, h: 2.6, sill: 0.75 }; // window in the +z wall
export const ROOM_SPAWN = new THREE.Vector3(ROOM_ORIGIN.x + WIN.x, 0, ROOM_ORIGIN.z + D / 2 - 1.1);
export const ROOM_WINDOW = new THREE.Vector3(ROOM_ORIGIN.x + WIN.x, 0, ROOM_ORIGIN.z + D / 2 - 0.4);
export const ROOM_LAMP = new THREE.Vector3(ROOM_ORIGIN.x - 2.75, 0, ROOM_ORIGIN.z - 1.3);
export const ROOM_DOOR = new THREE.Vector3(ROOM_ORIGIN.x + W / 2 - 0.5, 0, ROOM_ORIGIN.z + 2.6);
export const ROOM_CABINET = new THREE.Vector3(ROOM_ORIGIN.x + 4.4, 0, ROOM_ORIGIN.z - 3.7);
export const ROOM_PANEL = new THREE.Vector3(ROOM_ORIGIN.x + W / 2 - 0.6, 0, ROOM_ORIGIN.z + 4.0);
// interaction points 0.75 m in front of each specimen stand
export const ROOM_STANDS = STANDS.map(s => new THREE.Vector3(ROOM_ORIGIN.x + s.pos[0] + Math.sin(s.ry) * 0.75, 0, ROOM_ORIGIN.z + s.pos[2] + Math.cos(s.ry) * 0.75));
export const ROOM_MOSAIC = new THREE.Vector3(ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z - 3.9);

export function buildFirstRoom(scene, shadowSize = 2048, quality = 'high') {
  const group = new THREE.Group();
  group.position.copy(ROOM_ORIGIN);
  scene.add(group);
  const local = [];
  const r = rand(1234);

  const wallMat = mat({ map: rep(tex.wallpaper, 3, 1), color: 0x9a9ca0 });
  const wallMatS = mat({ map: rep(tex.wallpaper, 2, 1), color: 0x9a9ca0 });
  const trim = mat({ map: tex.wood, color: 0x6e6258 });
  const dark = mat({ map: tex.wood, color: 0x5a4a3e, roughness: 0.6 });

  // floor & ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat({ map: tex.floor, color: 0xb0a89c }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat({ color: 0x4a4a4a, map: rep(tex.stone, 3, 2) }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; group.add(ceil);
  // ceiling rose + chandelier stub
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24), mat({ color: 0x777470 }));
  rose.position.set(0, H - 0.03, 0); group.add(rose);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2), mat({ color: 0x222, metalness: 0.8 }));
  chain.position.set(0, H - 0.6, 0); group.add(chain);
  const chand = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 20), mat({ color: 0x3a3226, metalness: 0.7, roughness: 0.5 }));
  chand.rotation.x = Math.PI / 2; chand.position.set(0, H - 1.2, 0); chand.castShadow = true; group.add(chand);

  // walls (the +z wall has the window opening)
  const T = 0.3;
  box(group, W, H, T, 0, H / 2, -D / 2 - T / 2, wallMat, local);           // back
  box(group, T, H, D, -W / 2 - T / 2, H / 2, 0, wallMatS, local);          // left
  // right wall, with the doorway to the hallway (z 2.0 .. 3.2)
  box(group, T, H, 7, W / 2 + T / 2, H / 2, -1.5, wallMatS, local);
  box(group, T, H, 0.2, W / 2 + T / 2, H / 2, 3.3, wallMatS, local);
  box(group, T, H, 0.4, W / 2 + T / 2, H / 2, 4.8, wallMatS, local);
  box(group, T, H - 2.5, 1.2, W / 2 + T / 2, (H + 2.5) / 2, 4.0, wallMatS);
  // the secret panel: a section of panelled wall that grinds back and slides aside
  const panel = new THREE.Group(); panel.position.set(W / 2 + T / 2, 0, 4.0); group.add(panel);
  box(panel, T, 2.5, 1.2, 0, 1.25, 0, wallMatS, null);
  box(panel, 0.04, 0.95, 1.2, -T / 2 - 0.02, 0.48, 0, trim, null, { cast: false });   // wainscot to match the room
  box(panel, 0.06, 0.06, 1.2, -T / 2 - 0.03, 1.0, 0, trim, null, { cast: false });
  box(panel, 0.05, 0.25, 1.2, -T / 2 - 0.025, 0.125, 0, trim, null, { cast: false });
  local.push({ minX: W / 2, maxX: W / 2 + T, minZ: 3.4, maxZ: 4.6, panel: true });
  box(group, T, H - 2.5, 1.2, W / 2 + T / 2, (H + 2.5) / 2, 2.6, wallMatS);
  local.push({ minX: W / 2, maxX: W / 2 + T, minZ: 2.0, maxZ: 3.2 }); // the old door, stuck shut
  const fz = D / 2 + T / 2, wl = WIN.x - WIN.w / 2, wr = WIN.x + WIN.w / 2;
  box(group, wl + W / 2, H, T, (-W / 2 + wl) / 2, H / 2, fz, mat({ map: rep(tex.wallpaper, 2, 1), color: 0x9a9ca0 }), local);
  box(group, W / 2 - wr, H, T, (wr + W / 2) / 2, H / 2, fz, wallMatS, local);
  box(group, WIN.w, WIN.sill, T, WIN.x, WIN.sill / 2, fz, wallMatS, local);
  const top = WIN.sill + WIN.h;
  box(group, WIN.w, H - top, T, WIN.x, (H + top) / 2, fz, wallMatS);
  // skirting & dado & cornice
  // (the east wall's runs stop at the old door and the secret panel so nothing crosses the openings)
  for (const [w, d, x, z] of [[W, 0.05, 0, -D / 2], [0.05, D, -W / 2, 0], [0.05, 6.9, W / 2, -1.55], [0.05, 0.2, W / 2, 3.3], [0.05, 0.4, W / 2, 4.8]]) {
    box(group, w, 0.25, d, x, 0.125, z, trim, null, { cast: false });
    box(group, w, 0.06, d, x, 1.0, z, trim, null, { cast: false });
    box(group, w, 0.2, d, x, H - 0.1, z, mat({ color: 0x6a6a68 }), null, { cast: false });
  }
  // window frame, snapped mullion, curtain rags
  box(group, WIN.w + 0.2, 0.1, 0.4, WIN.x, WIN.sill, D / 2 + 0.05, dark);
  const mull = box(group, 0.06, 1.6, 0.06, WIN.x + 0.2, WIN.sill + 1.6, D / 2 + 0.1, dark); mull.rotation.z = 0.5;
  const curtainMat = mat({ map: tex.fabric, color: 0x7a6a6a, side: THREE.DoubleSide });
  for (const [x, h] of [[WIN.x - 1.4, 3.6], [WIN.x + 1.35, 2.6]]) {
    const geo = new THREE.PlaneGeometry(0.7, h, 6, 1);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 18) * 0.06);
    geo.computeVertexNormals();
    const c = new THREE.Mesh(geo, curtainMat); c.position.set(x, H - 0.3 - h / 2, D / 2 - 0.12); c.castShadow = true; group.add(c);
  }
  box(group, 2.8, 0.05, 0.05, WIN.x, H - 0.3, D / 2 - 0.12, mat({ color: 0x2a2520, metalness: 0.6 }));

  // the night outside the window
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: outsideTex(), fog: false }));
  outside.position.set(WIN.x, 2, D / 2 + 2.5); outside.rotation.y = Math.PI; group.add(outside);

  // broken glass under the window
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc, roughness: 0.02, metalness: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 60; i++) {
    const s = new THREE.Shape(), k = 0.03 + r() * 0.14;
    s.moveTo(0, 0); s.lineTo(k, r() * k * 0.4); s.lineTo(r() * k, k * (0.6 + r())); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), shardMat);
    const rad = Math.pow(r(), 1.6) * 1.8, a = Math.PI + r() * Math.PI;
    m.position.set(WIN.x + Math.cos(a) * rad, 0.005 + r() * 0.01, D / 2 - 0.2 + Math.sin(a) * rad * 0.8);
    m.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.15, 0, r() * 6.28); group.add(m);
  }

  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.4), mat({ map: tex.rug, color: 0xaaaaaa }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(-0.5, 0.01, -0.5); rug.receiveShadow = true; group.add(rug);

  // fireplace on the back wall, with the moth mosaic above (big room rule)
  const marble = mat({ color: 0x595b5e, roughness: 0.4, map: rep(tex.stone, 0.5, 0.5) });
  box(group, 2.6, 1.3, 0.5, 0, 0.65, -D / 2 + 0.25, marble, local);
  box(group, 1.3, 0.9, 0.06, 0, 0.5, -D / 2 + 0.51, mat({ color: 0x050403 }));
  box(group, 3.0, 0.12, 0.65, 0, 1.36, -D / 2 + 0.3, marble);
  box(group, 1.1, 0.2, 0.3, 0, 0.1, -D / 2 + 0.7, mat({ color: 0x1a1612, metalness: 0.5 }), null); // grate
  const mosaic = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), mat({ map: tex.mosaic, roughness: 0.55 }));
  mosaic.position.set(0, 2.9, -D / 2 + 0.02); group.add(mosaic);
  const puzzle = createPuzzle(group, local, new THREE.Vector3(4.4, 0, -D / 2 + 0.36));
  const hall = buildHallway(group, local);
  const ground = buildGroundFloor(group, local, { quality });
  const frameMat = mat({ color: 0x5a4a2a, metalness: 0.5, roughness: 0.5 });
  for (const [w, h, x, y] of [[2.6, 0.1, 0, 4.15], [2.6, 0.1, 0, 1.65], [0.1, 2.6, -1.25, 2.9], [0.1, 2.6, 1.25, 2.9]])
    box(group, w, h, 0.08, x, y, -D / 2 + 0.04, frameMat, null, { cast: false });
  // candlesticks on mantel
  for (const x of [-1.2, 1.2]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.35, 8), frameMat);
    c.position.set(x, 1.6, -D / 2 + 0.3); group.add(c);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), mat({ color: 0xbab49e }));
    wax.position.set(x, 1.83, -D / 2 + 0.3); group.add(wax);
  }

  // a sitting area round the fire: the sheeted sofa faces the hearth across a rug,
  // a lamp table at its left, an armchair either side of the fireplace
  const sofa = new THREE.Group(); sofa.position.set(0, 0, -0.8); sofa.rotation.y = Math.PI; group.add(sofa);
  buildSofa(sofa, dark);
  rect(local, -1.42, 1.42, -1.3, -0.3);

  // round table with an oil lamp and a book
  const table = new THREE.Group(); table.position.set(-2.6, 0, -1.2); group.add(table);
  const top0 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24), dark); top0.position.y = 0.75; top0.castShadow = true; table.add(top0);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.72, 8), dark); leg.position.y = 0.37; table.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.06, 12), dark); foot.position.y = 0.03; table.add(foot);
  box(table, 0.32, 0.06, 0.24, 0.2, 0.81, 0.1, mat({ color: 0x3a1f1a }), null, { ry: 0.4 });
  const lamp = buildOilLamp(Math.min(shadowSize, 2048) / 2 >= 1024 ? 2048 : 1024); lamp.group.position.set(-0.15, 0.78, -0.1); table.add(lamp.group);
  rect(local, -3.3, -1.9, -1.9, -0.5);

  // tipped-over armchair
  const chairMat = mat({ map: tex.fabric, color: 0x998888 });
  const chair = new THREE.Group(); chair.position.set(2.2, 0, -2.4); chair.rotation.set(0, -2.1, 0); group.add(chair);
  const ch = new THREE.Group(); ch.rotation.x = -Math.PI / 2 + 0.15; ch.position.y = 0.45; chair.add(ch);
  box(ch, 0.9, 0.4, 0.9, 0, 0, 0, chairMat); box(ch, 0.9, 1.0, 0.2, 0, 0.5, -0.4, chairMat);
  for (const s of [-1, 1]) box(ch, 0.15, 0.6, 0.9, s * 0.45, 0.2, 0, chairMat);
  rect(local, 1.5, 2.9, -3.2, -1.6);
  // upright armchair by the fire
  const chair2 = new THREE.Group(); chair2.position.set(-2.0, 0, -2.8); chair2.rotation.y = 2.1; group.add(chair2);
  box(chair2, 0.9, 0.45, 0.9, 0, 0.3, 0, chairMat); box(chair2, 0.9, 1.1, 0.2, 0, 0.9, -0.4, chairMat);
  for (const s of [-1, 1]) box(chair2, 0.15, 0.4, 0.9, s * 0.45, 0.65, 0, chairMat);
  rect(local, -2.65, -1.35, -3.45, -2.15);

  // bookcase on the left wall, books toppled
  const bc = new THREE.Group(); bc.position.set(-W / 2 + 0.25, 0, -1.5); group.add(bc);
  box(bc, 0.5, 3.0, 3.0, 0, 1.5, 0, dark);
  for (let s = 0; s < 5; s++) {
    let z = -1.35;
    while (z < 1.3) {
      const w = 0.05 + r() * 0.06, h = 0.35 + r() * 0.15;
      if (r() < 0.15) { z += 0.15; continue; }
      const v = r();
      box(bc, 0.35, h, w, 0.12, 0.25 + s * 0.6 + h / 2, z, mat({ color: new THREE.Color(0.15 + v * 0.2, 0.08 + v * 0.08, 0.06) }), null, { cast: false, ry: r() < 0.1 ? 0.3 : 0 });
      z += w + 0.01;
    }
  }
  for (let i = 0; i < 6; i++) box(group, 0.3, 0.06, 0.22, -W / 2 + 1 + r() * 0.8, 0.03, -2.5 + r() * 2, mat({ color: 0x3a2018 }), null, { ry: r() * 3 });
  rect(local, -W / 2, -W / 2 + 0.55, -3.0, 0);

  // grandfather clock, stopped
  const clock = new THREE.Group(); clock.position.set(-W / 2 + 0.35, 0, 2.6); group.add(clock);
  box(clock, 0.45, 2.3, 0.55, 0, 1.15, 0, dark);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat({ color: 0xc9c1a8 }));
  face.rotation.y = Math.PI / 2; face.position.set(0.23, 1.85, 0); clock.add(face);
  rect(local, -W / 2, -W / 2 + 0.6, 2.3, 2.9);

  // pinned-moth display cases on the right wall
  for (const [z, specimens] of [[-2.7, tex.specimensA]]) { // clear of the doorway (z 1.9 .. 3.3)
    const cs = new THREE.Group(); cs.position.set(W / 2 - 0.05, 1.75, z); cs.rotation.y = -Math.PI / 2; group.add(cs);
    box(cs, 2.4, 1.3, 0.1, 0, 0, 0, dark, null, { cast: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), mat({ map: specimens, roughness: 0.85 })); back.position.z = 0.058; back.castShadow = false; cs.add(back);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 1 }));
    glass.position.z = 0.11; glass.castShadow = false; glass.material.depthWrite = false; glass.renderOrder = 2; cs.add(glass);
  }
  // sideboard under the cases
  box(group, 0.6, 0.9, 2.6, W / 2 - 0.3, 0.45, -1.2, dark, local);

  // locked door on the right wall
  // the old door: closed and rusted shut
  const door = new THREE.Group(); door.position.set(W / 2 + T / 2, 0, 2.6); door.rotation.y = -Math.PI / 2; group.add(door);
  box(door, 1.194, 2.494, 0.06, 0, 1.25, 0, mat({ map: tex.wood, color: 0xa88a72 }), null, { cast: false });
  for (const [px, py] of [[-0.28, 1.75], [0.28, 1.75], [-0.28, 0.65], [0.28, 0.65]]) box(door, 0.42, py > 1 ? 0.9 : 0.8, 0.02, px, py, 0.05, mat({ map: tex.wood, color: 0x8a7060 }), null, { cast: false });
  // carved architrave: fluted jambs on plinth blocks, corner rosettes, a moulded head and cornice
  const archMat = mat({ map: tex.wood, color: 0xb0947c, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const zc = 2.6 + sx * 0.7;
    box(group, 0.07, 2.5, 0.16, W / 2 - 0.035, 1.25, zc, archMat, null, { cast: false });
    for (const f of [-0.045, 0, 0.045]) box(group, 0.012, 2.2, 0.018, W / 2 - 0.075, 1.3, zc + f, dark, null, { cast: false }); // flutes
    box(group, 0.09, 0.3, 0.2, W / 2 - 0.045, 0.15, zc, archMat, null, { cast: false });                                      // plinth block
    box(group, 0.09, 0.2, 0.2, W / 2 - 0.045, 2.6, zc, archMat, null, { cast: false });                                       // corner block
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), dark); rosette.rotation.z = Math.PI / 2;
    rosette.position.set(W / 2 - 0.095, 2.6, zc); group.add(rosette);
  }
  box(group, 0.07, 0.2, 1.24, W / 2 - 0.035, 2.6, 2.6, archMat, null, { cast: false });   // head
  // linings across the wall thickness, and a plain architrave on the hallway side
  for (const z of [1.994, 3.206]) box(group, T, 2.5, 0.012, W / 2 + T / 2, 1.25, z, archMat, null, { cast: false });
  box(group, T, 0.012, 1.2, W / 2 + T / 2, 2.506, 2.6, archMat, null, { cast: false });
  for (const z of [1.955, 3.245]) box(group, 0.03, 2.55, 0.09, W / 2 + T + 0.015, 1.275, z, archMat, null, { cast: false });
  box(group, 0.03, 0.09, 1.38, W / 2 + T + 0.015, 2.545, 2.6, archMat, null, { cast: false });
  box(group, 0.16, 0.08, 1.8, W / 2 - 0.08, 2.76, 2.6, archMat, null, { cast: false });   // cornice
  box(group, 0.1, 0.06, 1.7, W / 2 - 0.05, 2.83, 2.6, archMat, null, { cast: false });
  const brassDoor = new THREE.MeshStandardMaterial({ color: 0xc09848, metalness: 0.9, roughness: 0.3 });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), brassDoor); knob.position.set(0.45, 1.05, 0.1); door.add(knob);
  const knobRose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), brassDoor); knobRose.rotation.x = Math.PI / 2; knobRose.position.set(0.45, 1.05, 0.05); door.add(knobRose);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.01), brassDoor); plate.position.set(0.45, 0.88, 0.045); door.add(plate);
  const keyhole = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.012), new THREE.MeshBasicMaterial({ color: 0x000000 })); keyhole.position.set(0.45, 0.87, 0.05); door.add(keyhole);

  // paintings
  for (const [x, y] of [[-4.2, 2.6], [4.2, 2.6]]) {
    box(group, 1.0, 1.25, 0.06, x, y, -D / 2 + 0.04, frameMat, null, { cast: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.1), mat({ map: tex.painting })); p.position.set(x, y, -D / 2 + 0.08);
    if (x > 0) { p.rotation.z = 0.12; } group.add(p);
  }

  // cobwebs in the corners
  const webMat = new THREE.MeshBasicMaterial({ map: tex.web, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.6 });
  for (const [x, z, ry, sx] of [[-W / 2, -D / 2, Math.PI / 4, 1], [W / 2, -D / 2, -Math.PI / 4, -1], [-W / 2, D / 2, 3 * Math.PI / 4, 1]]) {
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), webMat);
    wb.geometry.translate(0.6, -0.6, 0); wb.position.set(x, H, z); wb.rotation.set(0, ry, 0); wb.scale.x = sx; group.add(wb);
  }

  // ---------- light ----------
  const moon = new THREE.SpotLight(0xff9a5a, 120, 24, 0.5, 0.6, 1.2);
  moon.position.set(WIN.x + 3.5, 3.6, D / 2 + 4); // low sun: long patch across the floor
  moon.target.position.set(WIN.x - 2.2, 0, -1.5);
  moon.castShadow = true; moon.shadow.mapSize.set(Math.min(shadowSize, 2048), Math.min(shadowSize, 2048)); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.035; moon.shadow.camera.near = 1; moon.shadow.camera.far = 20;
  group.add(moon, moon.target);
  const fill = new THREE.HemisphereLight(0x7a6a80, 0x241a14, 2.4); group.add(fill);
  const bounce = new THREE.PointLight(0xc08060, 5, 12, 1.2); bounce.position.set(WIN.x - 0.5, 1.2, 2.5); group.add(bounce);

  // dust motes drifting in the moonbeam
  const N = 450, pos = new Float32Array(N * 3); // quality decides how many are drawn
  for (let i = 0; i < N; i++) pos.set([WIN.x - 1.8 + r() * 3.2, r() * 3.5, -0.8 + r() * 5.6], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd8b0, size: 0.004, transparent: true, opacity: 0.45, depthWrite: false }));
  dust.userData.dust = N; group.add(dust);

  const colliders = local.map(c => ({ minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ }));
  // the local rects created via rect() are in group space; box() ones were already world-space
  // (box() uses world matrices) -> normalise: rects without world offset get shifted.
  const worldColliders = local.map(c => c.minX < 500 ? { ...c, minX: c.minX + ROOM_ORIGIN.x, maxX: c.maxX + ROOM_ORIGIN.x, minZ: c.minZ + ROOM_ORIGIN.z, maxZ: c.maxZ + ROOM_ORIGIN.z } : c);
  const panelCollider = worldColliders.find(c => c.panel);
  const doorColliders = {}; for (const c of worldColliders) if (c.door) doorColliders[c.door] = c;
  ground.bindColliders(
    col => { const c = doorColliders[col.door], i = worldColliders.indexOf(c); if (i >= 0) worldColliders.splice(i, 1); },
    col => { const c = doorColliders[col.door]; if (c && !worldColliders.includes(c)) worldColliders.push(c); },
  );

  const baseFill = fill.intensity, baseBounce = bounce.intensity;
  let lampOn = false, panelOpen = false, panelAnim = 0;
  const toWorld = v => v.clone().add(ROOM_ORIGIN);
  // panel motion: first back into the hallway (grinding), then aside along the hallway wall
  const placePanel = k => {
    const a = Math.min(1, k * 2.5), b = Math.max(0, (k - 0.4) / 0.6);
    panel.position.set(W / 2 + T / 2 + a * 0.36, 0, 4.0 - b * 1.3);
  };
  // ---- floors as sections: only the floor the player is on is drawn ----
  // (ground floor z < 25, cellar 25..70, first floor 70..110, catacombs 110..165, attic > 165, in local coordinates)
  const sections = { ground: new THREE.Group(), cellar: new THREE.Group(), first: new THREE.Group(), catacombs: new THREE.Group(), attic: new THREE.Group() };
  {
    const box3 = new THREE.Box3(), c = new THREE.Vector3();
    group.updateMatrixWorld(true);
    for (const ch of [...group.children]) {
      if (ch.userData.anyFloor) continue; // mirror reflections follow the player to every floor
      let z;
      if (ch.isLight) z = ch.position.z;
      else { box3.setFromObject(ch, false); if (box3.isEmpty()) z = ch.position.z; else { box3.getCenter(c); z = c.z - ROOM_ORIGIN.z; } }
      const sec = z < 25 ? sections.ground : z < 70 ? sections.cellar : z < 110 ? sections.first : z < 165 ? sections.catacombs : sections.attic;
      sec.add(ch); // sections sit at the group's origin, so nothing moves
    }
    for (const sgrp of Object.values(sections)) group.add(sgrp);
  }
  let activeSection = null;
  const setSection = (zLocal) => {
    const n = zLocal < 25 ? 'ground' : zLocal < 70 ? 'cellar' : zLocal < 110 ? 'first' : zLocal < 165 ? 'catacombs' : 'attic';
    if (n === activeSection) return;
    activeSection = n; for (const [k, g] of Object.entries(sections)) g.visible = k === n;
  };
  setSection(0);

  return {
    group, colliders: worldColliders, ground,
    puzzle, drawers: puzzle.cabinet.drawers, pickables: puzzle.cabinet.pickables,
    hall: { spawn: toWorld(hall.spawn), endDoor: toWorld(hall.endDoor), sideDoor: toWorld(hall.sideDoor) },
    get lampOn() { return lampOn; },
    get panelOpen() { return panelOpen; },
    openPanel(instant = false) {
      panelOpen = true;
      const i = worldColliders.indexOf(panelCollider); if (i >= 0) worldColliders.splice(i, 1);
      if (instant) { panelAnim = 1; placePanel(1); }
    },
    resetPuzzle() {
      panelOpen = false; panelAnim = 0; placePanel(0);
      if (!worldColliders.includes(panelCollider)) worldColliders.push(panelCollider);
      puzzle.reset();
    },
    setLamp(on) {
      lampOn = on; lamp.set(on); mosaic.material.map = on ? tex.mosaicLit : tex.mosaic; mosaic.material.needsUpdate = true;
      // the room warms up a little when the lamp is lit
      fill.intensity = on ? baseFill * 1.35 : baseFill;
      fill.color.set(on ? 0x8a6a5a : 0x6a5a70);
      bounce.intensity = on ? baseBounce * 0.6 : baseBounce;
    },
    update(t, dt = 0.016, camera = null) {
      lamp.update(t); hall.update(t);
      if (camera) { setSection(camera.position.z - ROOM_ORIGIN.z); ground.update(t, dt, camera); }
      if (panelOpen && panelAnim < 1) { panelAnim = Math.min(1, panelAnim + dt * 0.35); placePanel(panelAnim); }
      puzzle.update(dt, t);
      const p = dg.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) - 0.0015 + Math.sin(t * 0.7 + i) * 0.0008;
        if (y < 0) y = 3.5;
        p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i * 1.7) * 0.0006);
      }
      p.needsUpdate = true;
    },
  };
}

function outsideTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2a2a52'); gr.addColorStop(0.35, '#7a4a6a'); gr.addColorStop(0.6, '#f0965a'); gr.addColorStop(0.62, '#2a2418'); gr.addColorStop(1, '#141410');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#05070a';
  for (let x = 0; x < 256; x += 7) g.fillRect(x, 120, 2, 50); // the fence, far off
  g.fillRect(0, 128, 256, 2);
  return new THREE.CanvasTexture(c);
}

// Victorian brass oil lamp: weighted base, glass font, brass burner, tall glass chimney.
function buildOilLamp(lampShadow = 1024) {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.32 });
  const lathe = (pts, m, segs = 32) => { const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs), m); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
  // base and stem
  lathe([[0, 0], [0.085, 0], [0.09, 0.012], [0.07, 0.03], [0.04, 0.05], [0.025, 0.09], [0.03, 0.12], [0.05, 0.14], [0, 0.14]], brass);
  // glass font holding the oil (amber, with a liquid level inside)
  const fontGlass = new THREE.MeshPhysicalMaterial({ color: 0xd8a860, roughness: 0.05, transmission: 0.7, thickness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1 });
  lathe([[0.03, 0.14], [0.07, 0.16], [0.085, 0.2], [0.075, 0.24], [0.035, 0.26], [0.02, 0.265]], fontGlass).castShadow = false;
  lathe([[0, 0.145], [0.065, 0.15], [0.075, 0.19], [0, 0.19]], new THREE.MeshStandardMaterial({ color: 0x6a3a10, roughness: 0.2, transparent: true, opacity: 0.8 }));
  // burner, gallery and wick knob
  lathe([[0.022, 0.265], [0.03, 0.27], [0.032, 0.3], [0.045, 0.31], [0.045, 0.32], [0.03, 0.325], [0, 0.325]], brass).castShadow = false; // burner sits right under the flame
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), brass);
  knob.rotation.z = Math.PI / 2; knob.position.set(0.05, 0.3, 0); group.add(knob);
  // chimney glass: bulbous lower part and tall neck
  const chimneyMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 0.9, thickness: 0.005, transparent: true, opacity: 0.28, emissive: 0x000000, side: THREE.DoubleSide, depthWrite: false });
  // glass must not cast shadows: the light sits inside the chimney
  lathe([[0.034, 0.32], [0.05, 0.35], [0.055, 0.39], [0.04, 0.43], [0.026, 0.46], [0.024, 0.6], [0.027, 0.61]], chimneyMat).castShadow = false;
  // flame: a teardrop that glows, plus a soft halo sprite
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.95 });
  const flame = lathe([[0, 0.33], [0.007, 0.338], [0.009, 0.35], [0.006, 0.365], [0, 0.39]], flameMat, 12);
  flame.castShadow = false;
  const hc = document.createElement('canvas'); hc.width = hc.height = 128; const hg = hc.getContext('2d');
  const gr = hg.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,200,120,0.9)'); gr.addColorStop(0.25, 'rgba(255,150,60,0.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  hg.fillStyle = gr; hg.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(0.35, 0.35, 1); halo.position.y = 0.37; group.add(halo);
  const light = new THREE.PointLight(0xffa850, 0, 16, 1.15); light.userData.moths = true;
  light.position.y = 0.45; light.castShadow = true; light.shadow.mapSize.set(lampShadow, lampShadow); light.shadow.bias = -0.0015; light.shadow.normalBias = 0.045; light.shadow.radius = 3; light.shadow.camera.near = 0.08; light.shadow.camera.far = 9;
  group.add(light);
  let on = false;
  const set = v => { on = v; flame.visible = halo.visible = v; light.intensity = v ? 7 : 0; chimneyMat.emissive.set(v ? 0x3a2008 : 0x000000); };
  set(false);
  return {
    group, set,
    update(t) {
      if (!on) return;
      const f = 1 + Math.sin(t * 11) * 0.04 + Math.sin(t * 23.7) * 0.03 + Math.sin(t * 4.3) * 0.05;
      light.intensity = 7 * f; flame.scale.set(1, 0.9 + f * 0.12, 1); halo.material.opacity = 0.75 + (f - 1) * 2;
    },
  };
}

// Box with rounded edges (subdivided box whose vertices are pushed onto a rounded shell).
function roundedBox(w, h, d, rad, seg = 6) {
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = geo.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3(w / 2 - rad, h / 2 - rad, d / 2 - rad);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(THREE.MathUtils.clamp(v.x, -inner.x, inner.x), THREE.MathUtils.clamp(v.y, -inner.y, inner.y), THREE.MathUtils.clamp(v.z, -inner.z, inner.z));
    const n = v.clone().sub(c); if (n.lengthSq() > 0) n.normalize().multiplyScalar(rad);
    p.setXYZ(i, c.x + n.x, c.y + n.y, c.z + n.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSofa(sofa, wood) {
  const velvet = mat({ map: tex.velvet, color: 0xb0a0a0 });
  const part = (geo, m, x, y, z, rx = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz);
    mesh.castShadow = mesh.receiveShadow = true; sofa.add(mesh); return mesh;
  };
  part(roundedBox(2.7, 0.3, 0.95, 0.06), velvet, 0, 0.32, 0);                       // seat base
  for (let i = 0; i < 3; i++) part(roundedBox(0.86, 0.17, 0.8, 0.07), velvet, -0.87 + i * 0.87, 0.55, 0.05); // cushions
  part(roundedBox(2.6, 0.62, 0.2, 0.09), velvet, 0, 0.86, -0.4, -0.12);             // back
  part(roundedBox(2.4, 0.12, 0.16, 0.05), velvet, 0, 1.2, -0.44);                   // back crest
  for (const s of [-1, 1]) {
    part(roundedBox(0.2, 0.42, 0.95, 0.07), velvet, s * 1.28, 0.6, 0);               // arm panel
    const roll = part(new THREE.CapsuleGeometry(0.12, 0.72, 6, 16), velvet, s * 1.32, 0.82, 0.02, Math.PI / 2);
    roll.rotation.set(Math.PI / 2, 0, 0);
    for (const z of [-0.38, 0.38]) {                                                 // turned legs
      const leg = part(new THREE.LatheGeometry([[0.0, 0], [0.03, 0], [0.04, 0.04], [0.025, 0.09], [0.045, 0.14], [0.035, 0.18], [0, 0.18]].map(([a, b]) => new THREE.Vector2(a, b)), 12), wood, s * 1.22, 0, z);
      leg.scale.y = 1;
    }
  }
  // dust sheet draped over the left two-thirds: a height field over the sofa,
  // falling away past the edges into soft hanging folds that pool on the floor
  const x0 = -1.95, x1 = 0.55, z0 = -0.95, z1 = 0.95, NX = 90, NZ = 70;
  const sofaH = (x, z) => {
    if (Math.abs(x) > 1.42 || Math.abs(z) > 0.5) return -1;
    let h = 0.68;
    if (z < -0.28) h = 1.27;
    if (Math.abs(x) > 1.16) h = Math.max(h, 0.95);
    return h;
  };
  const H = new Float32Array((NX + 1) * (NZ + 1));
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
    const x = x0 + (x1 - x0) * i / NX, z = z0 + (z1 - z0) * j / NZ;
    let h = sofaH(x, z);
    if (h < 0) {
      const cx = THREE.MathUtils.clamp(x, -1.42, 1.42), cz = THREE.MathUtils.clamp(z, -0.5, 0.5);
      const d = Math.hypot(x - cx, z - cz);
      h = sofaH(cx, cz) - d * 4.2;
    }
    H[j * (NX + 1) + i] = h;
  }
  for (let pass = 0; pass < 4; pass++) {
    const T = H.slice();
    for (let j = 1; j < NZ; j++) for (let i = 1; i < NX; i++) {
      const k = j * (NX + 1) + i;
      H[k] = (T[k] * 4 + T[k - 1] + T[k + 1] + T[k - NX - 1] + T[k + NX + 1]) / 8;
    }
  }
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, NX, NZ); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
    const gi = Math.round((x - x0) / (x1 - x0) * NX), gj = Math.round((z - z0) / (z1 - z0) * NZ);
    let y = H[gj * (NX + 1) + gi];
    const hang = THREE.MathUtils.clamp((0.7 - y) / 0.7, 0, 1);
    y += Math.sin(x * 23 + z * 3) * 0.018 * hang + Math.sin(z * 31 - x * 5) * 0.014 * hang + Math.sin(x * 7 + z * 9) * 0.01; // folds
    y = Math.max(y, 0.012 + Math.abs(Math.sin(x * 13 + z * 17)) * 0.015);           // pooled hem
    p.setXYZ(i, x + Math.sin(z * 19) * 0.02 * hang, y + 0.03, z + Math.sin(x * 19) * 0.02 * hang);
  }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, mat({ map: rep(tex.sheet, 3, 2), color: 0xd8d2c6, side: THREE.DoubleSide, bump: 0.8 }));
  cloth.castShadow = cloth.receiveShadow = true; sofa.add(cloth);
}
