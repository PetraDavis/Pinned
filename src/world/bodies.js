// The preserved: former members of the Order, kept in the Mother's Chamber. Pale, dried, in the
// rags of their Sunday clothes, half wound in silk and strung up by threads to the rafters, the
// walls and the boards like flies in a web, every one of them bent the wrong way.
// No blood, no wounds: just the wrongness of the angles. All of them merge into three meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from './build.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// Poses in a body frame: pelvis at the origin, +y up, +z the way the body faces.
// P pelvis, C chest, N neck, H head; S shoulder, E elbow, W wrist; I hip, K knee, F foot (L/R).
const POSES = {
  // arched back like a bow, one arm wrenched up behind, the other folded the wrong way at the elbow
  arch: { C: V(0, 0.4, -0.2), N: V(0, 0.55, -0.36), H: V(0.07, 0.62, -0.5), EL: V(0.32, 0.72, -0.32), WL: V(0.2, 0.98, -0.42), ER: V(-0.34, 0.58, -0.06), WR: V(-0.5, 0.8, 0.14),
    KL: V(0.07, -0.45, 0.02), FL: V(0.05, -0.88, 0), KR: V(-0.07, -0.45, 0.02), FR: V(-0.04, -0.88, -0.02), headRoll: 0.5, dress: false, wrap: 'legs' },
  // upright, the head lolled over until the ear touches the shoulder; one knee bent backwards
  loll: { C: V(0.02, 0.46, 0.02), N: V(0.04, 0.6, 0.02), H: V(0.2, 0.62, 0.04), EL: V(0.36, 0.42, -0.12), WL: V(0.5, 0.62, -0.3), ER: V(-0.26, 0.2, 0.04), WR: V(-0.26, -0.08, 0.16),
    KL: V(0.09, -0.44, 0.04), FL: V(0.12, -0.86, 0.06), KR: V(-0.09, -0.44, -0.05), FR: V(-0.1, -0.7, -0.36), headRoll: 1.35, dress: true, wrap: 'torso' },
  // bent backwards almost double, arms flung out past the shoulders
  bridge: { C: V(0, 0.36, -0.28), N: V(0, 0.44, -0.5), H: V(0, 0.38, -0.66), EL: V(0.4, 0.58, -0.3), WL: V(0.56, 0.48, -0.52), ER: V(-0.4, 0.56, -0.36), WR: V(-0.62, 0.62, -0.22),
    KL: V(0.08, -0.46, 0), FL: V(0.07, -0.9, 0.02), KR: V(-0.08, -0.46, 0), FR: V(-0.07, -0.9, 0.02), headRoll: -0.3, dress: false, wrap: 'legs' },
  // splayed against a wall, the arms at two different wrong angles, the head hung too far down
  pinned: { C: V(0, 0.45, 0), N: V(0, 0.56, 0.04), H: V(-0.03, 0.5, 0.2), EL: V(0.4, 0.68, 0), WL: V(0.52, 1.0, -0.02), ER: V(-0.32, 0.22, 0), WR: V(-0.6, 0.12, -0.02),
    KL: V(0.1, -0.44, 0.02), FL: V(0.12, -0.88, 0), KR: V(-0.1, -0.44, 0.02), FR: V(-0.12, -0.88, 0), headRoll: -0.4, dress: true, wrap: 'legs' },
  // sat against the knee wall; the torso twisted round past where it should stop, the head turned too far
  slump: { C: V(0.1, 0.42, -0.12), N: V(0.14, 0.56, -0.18), H: V(0.3, 0.6, -0.12), EL: V(0.3, 0.2, 0.06), WL: V(0.36, -0.04, 0.2), ER: V(-0.28, 0.28, -0.2), WR: V(-0.42, 0.04, -0.04),
    KL: V(0.14, 0.06, 0.42), FL: V(0.3, -0.06, 0.82), KR: V(-0.22, 0.1, 0.38), FR: V(-0.12, -0.08, -0.04), headRoll: 1.1, dress: false, wrap: 'torso' },
};

function limb(list, a, b, r0, r1, seg = 12) {
  const d = b.clone().sub(a), len = d.length(); if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); list.push(g);
}
function ball(list, p, r, sx = 1, sy = 1, sz = 1, seg = 12) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)); g.scale(sx, sy, sz); g.translate(p.x, p.y, p.z); list.push(g); }
// a sheath of silk along an axis, ragged at the open end
function sheath(list, a, b, r, rnd) {
  const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(r * (0.55 + 0.45 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2)) * (1 + (rnd() - 0.5) * 0.12), t)); }
  const d = b.clone().sub(a), len = d.length(), g = new THREE.LatheGeometry(prof, 14); g.scale(1, len, 1);
  const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { if (pa.getY(i) > len * 0.97) pa.setY(i, len * (0.82 + rnd() * 0.18)); }
  g.computeVertexNormals(); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); list.push(g);
  // and wound round with strands
  const side = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0), u = new THREE.Vector3().crossVectors(d, side).normalize(), w = new THREE.Vector3().crossVectors(d, u).normalize();
  for (let k = 0; k < 2; k++) { const pts = [], ph = rnd() * 6.28; for (let i = 0; i <= 40; i++) { const t = i / 40, an = ph + t * (5 + k * 2) * Math.PI, rr = r * 1.04; pts.push(a.clone().addScaledVector(d, len * t * 0.95).addScaledVector(u, Math.cos(an) * rr).addScaledVector(w, Math.sin(an) * rr)); } list.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.004, 3, false)); }
}

function body(pose, rnd, skin, cloth, silk) {
  const p = POSES[pose], P = V(0, 0, 0), J = { P, ...p };
  J.SL = p.C.clone().add(V(0.17, 0.02, 0)); J.SR = p.C.clone().add(V(-0.17, 0.02, 0)); J.IL = V(0.1, -0.04, 0); J.IR = V(-0.1, -0.04, 0);
  // clothes: a coat or a dress over the torso, sleeves, trousers, boots
  limb(cloth, P, p.C, 0.15, 0.17, 10); ball(cloth, p.C, 0.17, 1.15, 0.7, 0.8); ball(cloth, P, 0.15, 1.1, 0.7, 0.85);
  for (const s of ['L', 'R']) {
    limb(cloth, J['S' + s], J['E' + s], 0.055, 0.05); ball(cloth, J['S' + s], 0.06); ball(cloth, J['E' + s], 0.05);
    limb(skin, J['E' + s], J['W' + s], 0.042, 0.03, 10); ball(skin, J['W' + s].clone().lerp(J['E' + s], -0.18), 0.04, 0.7, 1.4, 0.5, 6); // a long dry hand
    limb(cloth, J['I' + s], J['K' + s], 0.075, 0.065); ball(cloth, J['K' + s], 0.065);
    limb(p.dress ? skin : cloth, J['K' + s], J['F' + s], p.dress ? 0.042 : 0.06, p.dress ? 0.034 : 0.05, 10); ball(cloth, J['F' + s], 0.05, 1, 0.8, 1.7, 6);
  }
  if (p.dress) { const g = new THREE.CylinderGeometry(0.17, 0.36, 0.62, 12, 1, true); g.translate(0, -0.3, 0); cloth.push(g); }
  // collar, neck, head: pale and shrunken, the eyes sunk to dark hollows, the jaw dropped
  limb(skin, p.C.clone().lerp(p.N, 0.3), p.N, 0.05, 0.045, 6);
  const up = p.H.clone().sub(p.N).normalize(), fw0 = V(0, 0, 1);
  const side = new THREE.Vector3().crossVectors(up, fw0).normalize().applyAxisAngle(up, p.headRoll * 0.3), fw = new THREE.Vector3().crossVectors(side, up).normalize();
  const H = p.H.clone().addScaledVector(up, 0.04);
  { const g = new THREE.SphereGeometry(0.1, 12, 10); g.scale(0.85, 1.12, 0.95); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const k = 1 + (rnd() - 0.5) * 0.06; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k, pa.getZ(i) * k); } g.computeVertexNormals();
    const m = new THREE.Matrix4().makeBasis(side, up, fw).setPosition(H); g.applyMatrix4(m); skin.push(g); }
  for (const sx of [-1, 1]) ball(cloth, H.clone().addScaledVector(fw, 0.078).addScaledVector(side, sx * 0.034).addScaledVector(up, 0.02), 0.024, 1, 0.8, 0.6, 6);
  ball(cloth, H.clone().addScaledVector(fw, 0.074).addScaledVector(up, -0.06), 0.022, 1, 1.8, 0.6, 6);
  ball(cloth, H.clone().addScaledVector(up, 0.035).addScaledVector(fw, -0.02), 0.1, 0.92, 0.82, 0.98, 8); // what is left of the hair
  // silk: half wound
  if (p.wrap === 'legs') sheath(silk, J.FL.clone().lerp(J.FR, 0.5).add(V(0, -0.08, 0)), p.C.clone().lerp(P, 0.35), 0.2, rnd);
  else sheath(silk, P.clone().add(V(0, -0.18, 0)), p.N.clone().lerp(p.C, 0.2), 0.21, rnd);
  return J;
}

// placed: [pose, x, y, z, rx, ry, rz, anchors: [[joint, x, y, z], ...]] in attic-local coordinates
export function preservedBodies(group, placed, threadPts, silkMat, seed = 909) {
  const rnd = rand(seed), skinG = [], clothG = [], silkG = [];
  for (const [pose, x, y, z, rx, ry, rz, anchors] of placed) {
    const s = [], c = [], k = [];
    const J = body(pose, rnd, s, c, k);
    const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(1, 1, 1));
    for (const g of [...s, ...c, ...k]) g.applyMatrix4(m);
    skinG.push(...s); clothG.push(...c); silkG.push(...k);
    // threads: thick ones as tubes, a fan of fine ones as lines
    for (const [j, ax, ay, az] of anchors) {
      const from = J[j].clone().applyMatrix4(m), to = V(ax, ay, az);
      silkG.push(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 1, 0.006, 3, false));
      for (let i = 0; i < 3; i++) threadPts.push(from.x, from.y, from.z, to.x + (rnd() - 0.5) * 0.5, to.y + (rnd() - 0.5) * 0.3, to.z + (rnd() - 0.5) * 0.5);
    }
  }
  const clean = gs => mergeGeometries(gs.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; }), false);
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb4a78e, roughness: 0.95, emissive: 0x16120c });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 1 });
  for (const [gs, mat] of [[skinG, skinMat], [clothG, clothMat], [silkG, silkMat]]) { const mesh = new THREE.Mesh(clean(gs), mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
}
