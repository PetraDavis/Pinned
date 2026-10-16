// The first room: a large, grey Victorian drawing room behind the broken window.
// Built away from the exterior (at ROOM_ORIGIN) and entered via a short fade.
import * as THREE from 'three';
import { tex } from '../textures.js';
import { mat, box, rect, rep, rand } from './build.js';

export const ROOM_ORIGIN = new THREE.Vector3(1000, 0, 0);
const W = 14, D = 10, H = 4.6;
const WIN = { x: 2, w: 1.3, h: 2.5, sill: 0.9 }; // window in the +z wall
export const ROOM_SPAWN = new THREE.Vector3(ROOM_ORIGIN.x + WIN.x, 0, ROOM_ORIGIN.z + D / 2 - 1.1);
export const ROOM_WINDOW = new THREE.Vector3(ROOM_ORIGIN.x + WIN.x, 0, ROOM_ORIGIN.z + D / 2 - 0.4);
export const ROOM_DOOR = new THREE.Vector3(ROOM_ORIGIN.x + W / 2 - 0.4, 0, ROOM_ORIGIN.z - 1);

export function buildFirstRoom(scene) {
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
  box(group, T, H, D, W / 2 + T / 2, H / 2, 0, wallMatS, local);           // right
  const fz = D / 2 + T / 2, wl = WIN.x - WIN.w / 2, wr = WIN.x + WIN.w / 2;
  box(group, wl + W / 2, H, T, (-W / 2 + wl) / 2, H / 2, fz, mat({ map: rep(tex.wallpaper, 2, 1), color: 0x9a9ca0 }), local);
  box(group, W / 2 - wr, H, T, (wr + W / 2) / 2, H / 2, fz, wallMatS, local);
  box(group, WIN.w, WIN.sill, T, WIN.x, WIN.sill / 2, fz, wallMatS, local);
  const top = WIN.sill + WIN.h;
  box(group, WIN.w, H - top, T, WIN.x, (H + top) / 2, fz, wallMatS);
  // skirting & dado & cornice
  for (const [w, d, x, z] of [[W, 0.05, 0, -D / 2], [0.05, D, -W / 2, 0], [0.05, D, W / 2, 0]]) {
    box(group, w, 0.25, d, x, 0.125, z, trim, null, { cast: false });
    box(group, w, 0.06, d, x, 1.0, z, trim, null, { cast: false });
    box(group, w, 0.2, d, x, H - 0.1, z, mat({ color: 0x6a6a68 }), null, { cast: false });
  }
  // window frame, snapped mullion, curtain rags
  box(group, WIN.w + 0.2, 0.1, 0.4, WIN.x, WIN.sill, D / 2 + 0.05, dark);
  const mull = box(group, 0.06, 1.6, 0.06, WIN.x + 0.2, WIN.sill + 1.6, D / 2 + 0.1, dark); mull.rotation.z = 0.5;
  const curtainMat = mat({ map: tex.fabric, color: 0x7a6a6a, side: THREE.DoubleSide });
  for (const [x, h] of [[WIN.x - 1.05, 3.6], [WIN.x + 0.95, 2.6]]) {
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
  mosaic.position.set(0, 2.9, -D / 2 + 0.01); group.add(mosaic);
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

  // a dust-sheeted sofa
  const sheet = mat({ map: tex.sheet, color: 0xb0aca4 });
  const sofa = new THREE.Group(); sofa.position.set(-1, 0, 0.6); group.add(sofa);
  box(sofa, 2.6, 0.5, 1.0, 0, 0.35, 0, sheet); box(sofa, 2.6, 0.7, 0.25, 0, 0.9, -0.4, sheet);
  for (const s of [-1, 1]) box(sofa, 0.25, 0.4, 1.0, s * 1.3, 0.75, 0, sheet);
  const drape = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 4, 1, true), sheet);
  drape.rotation.y = Math.PI / 4; drape.scale.set(1, 0.6, 0.45); drape.position.set(0, 0.6, 0); sofa.add(drape);
  rect(local, -2.4, 0.4, 0.05, 1.15);

  // round table with a candelabra and a book
  const table = new THREE.Group(); table.position.set(-1, 0, -1.6); group.add(table);
  const top0 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24), dark); top0.position.y = 0.75; top0.castShadow = true; table.add(top0);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.72, 8), dark); leg.position.y = 0.37; table.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.06, 12), dark); foot.position.y = 0.03; table.add(foot);
  box(table, 0.32, 0.06, 0.24, 0.2, 0.81, 0.1, mat({ color: 0x3a1f1a }), null, { ry: 0.4 });
  const cand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.5, 8), frameMat); cand.position.set(-0.2, 1.03, -0.1); table.add(cand);
  rect(local, -1.75, -0.25, -2.35, -0.85);

  // tipped-over armchair
  const chairMat = mat({ map: tex.fabric, color: 0x998888 });
  const chair = new THREE.Group(); chair.position.set(2.2, 0, -1.2); chair.rotation.set(0, 0.6, 0); group.add(chair);
  const ch = new THREE.Group(); ch.rotation.x = -Math.PI / 2 + 0.15; ch.position.y = 0.45; chair.add(ch);
  box(ch, 0.9, 0.4, 0.9, 0, 0, 0, chairMat); box(ch, 0.9, 1.0, 0.2, 0, 0.5, -0.4, chairMat);
  for (const s of [-1, 1]) box(ch, 0.15, 0.6, 0.9, s * 0.45, 0.2, 0, chairMat);
  rect(local, 1.5, 2.9, -2.0, -0.4);
  // upright armchair by the fire
  const chair2 = new THREE.Group(); chair2.position.set(-2.4, 0, -3.3); chair2.rotation.y = 0.9; group.add(chair2);
  box(chair2, 0.9, 0.45, 0.9, 0, 0.3, 0, chairMat); box(chair2, 0.9, 1.1, 0.2, 0, 0.9, -0.4, chairMat);
  for (const s of [-1, 1]) box(chair2, 0.15, 0.4, 0.9, s * 0.45, 0.65, 0, chairMat);
  rect(local, -3.05, -1.75, -3.95, -2.65);

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
  for (const z of [-2.6, 0.2]) {
    const cs = new THREE.Group(); cs.position.set(W / 2 - 0.05, 2.0, z); cs.rotation.y = -Math.PI / 2; group.add(cs);
    box(cs, 2.0, 1.0, 0.08, 0, 0, 0, dark, null, { cast: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.85), mat({ map: tex.specimens })); back.position.z = 0.05; cs.add(back);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.85), new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.15, roughness: 0.05, metalness: 1 }));
    glass.position.z = 0.1; cs.add(glass);
  }
  // sideboard under the cases
  box(group, 0.6, 0.9, 2.6, W / 2 - 0.3, 0.45, -1.2, dark, local);

  // locked door on the right wall
  const door = new THREE.Group(); door.position.set(W / 2 - 0.02, 0, 2.6); door.rotation.y = -Math.PI / 2; group.add(door);
  box(door, 1.2, 2.5, 0.08, 0, 1.25, 0, mat({ map: tex.wood, color: 0x7a6a5a }), null, { cast: false });
  box(door, 1.5, 2.7, 0.04, 0, 1.35, -0.02, trim, null, { cast: false });
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), frameMat); knob.position.set(0.45, 1.1, 0.08); door.add(knob);

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
  const moon = new THREE.SpotLight(0x9fb4d8, 90, 24, 0.5, 0.55, 1.2);
  moon.position.set(WIN.x + 2.0, 6.5, D / 2 + 4);
  moon.target.position.set(WIN.x - 0.6, 0, 0.6);
  moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0005;
  group.add(moon, moon.target);
  const fill = new THREE.HemisphereLight(0x4a5670, 0x14110e, 1.6); group.add(fill);
  const bounce = new THREE.PointLight(0x6d7a92, 6, 12, 1.2); bounce.position.set(WIN.x - 0.5, 1.2, 2.5); group.add(bounce);

  // dust motes drifting in the moonbeam
  const N = 400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pos.set([WIN.x - 1.8 + r() * 3.2, r() * 3.5, -0.8 + r() * 5.6], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xc8d2e4, size: 0.007, transparent: true, opacity: 0.7, depthWrite: false }));
  group.add(dust);

  const colliders = local.map(c => ({ minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ }));
  // the local rects created via rect() are in group space; box() ones were already world-space
  // (box() uses world matrices) -> normalise: rects without world offset get shifted.
  const worldColliders = colliders.map(c => c.minX < 500 ? { minX: c.minX + ROOM_ORIGIN.x, maxX: c.maxX + ROOM_ORIGIN.x, minZ: c.minZ + ROOM_ORIGIN.z, maxZ: c.maxZ + ROOM_ORIGIN.z } : c);

  return {
    group, colliders: worldColliders,
    update(t) {
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
  gr.addColorStop(0, '#1a2436'); gr.addColorStop(0.6, '#3a4a62'); gr.addColorStop(0.62, '#141a14'); gr.addColorStop(1, '#0a0d0a');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#05070a';
  for (let x = 0; x < 256; x += 7) g.fillRect(x, 120, 2, 50); // the fence, far off
  g.fillRect(0, 128, 256, 2);
  return new THREE.CanvasTexture(c);
}
