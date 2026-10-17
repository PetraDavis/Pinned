// The preserved: former members of the Order, kept in the Mother's Chamber. Pale, dried, in the
// rags of their Sunday clothes, and hung up like marionettes: fine taut silk strings run from
// wrist, elbow, knee, ankle, shoulder and crown straight up to the rafters, or slant away to one
// hidden point above her nest, as if she works them. Each is held up in a different wrong way,
// toes just brushing the boards. No blood, no wounds: just the wrongness of the angles.
// Three draw calls (skin, cloth, strings) plus one for the fan of fine threads. They all sway
// together in the vertex shader on the game clock (uTime), with a rare small jerk on the strings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from './build.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// Poses in a body frame: pelvis at the origin, +y up, +z the way the body faces.
// P pelvis, C chest, N neck, H head; S shoulder, E elbow, W wrist; I hip, K knee, F foot (L/R).
// twist turns the shoulders about the spine; strings: which joints are hung; toNest: strings
// slant to the point over the nest instead of straight up.
const POSES = {
  // both arms hauled up over the head by the wrists, elbows cocked out, one knee lifted, head dropped forward
  arch: { C: V(0, 0.45, 0.02), N: V(0, 0.58, 0.03), H: V(0.03, 0.6, 0.17), EL: V(0.36, 0.68, 0), WL: V(0.28, 0.94, 0.06), ER: V(-0.38, 0.62, 0.06), WR: V(-0.42, 0.88, 0.14),
    KL: V(0.09, -0.42, 0.06), FL: V(0.08, -0.84, 0.02), KR: V(-0.08, -0.3, 0.3), FR: V(-0.1, -0.68, 0.22), headRoll: 0.3, dress: false, twist: 0,
    strings: ['WL', 'WR', 'EL', 'ER', 'KR', 'FR', 'SL', 'SR', 'H'] },
  // the head lolled over until the ear touches the shoulder; one arm up, the other hung by its wrist
  loll: { C: V(0.05, 0.45, 0), N: V(0.08, 0.58, 0), H: V(0.24, 0.6, 0.02), EL: V(0.42, 0.56, -0.04), WL: V(0.5, 0.82, 0.1), ER: V(-0.24, 0.2, 0.1), WR: V(-0.2, 0.36, 0.33),
    KL: V(0.1, -0.43, 0), FL: V(0.12, -0.85, -0.04), KR: V(-0.1, -0.42, 0.08), FR: V(-0.06, -0.8, -0.16), headRoll: 1.35, dress: true, twist: -0.2,
    strings: ['WL', 'WR', 'EL', 'KR', 'FL', 'SR', 'H'] },
  // the chest wrung round on the hips, arms strung out at two heights, legs dangling apart, the face turned behind
  bridge: { C: V(0.06, 0.44, 0.04), N: V(0.06, 0.57, 0.03), H: V(0.08, 0.63, -0.07), EL: V(0.36, 0.52, -0.3), WL: V(0.5, 0.72, -0.46), ER: V(-0.18, 0.62, 0.4), WR: V(-0.4, 0.62, 0.56),
    KL: V(0.14, -0.42, 0.02), FL: V(0.2, -0.84, -0.02), KR: V(-0.12, -0.42, 0), FR: V(-0.16, -0.84, 0.05), headRoll: -2.2, dress: false, twist: 0.9, toNest: true,
    strings: ['WL', 'WR', 'EL', 'ER', 'KL', 'FL', 'FR', 'SL', 'H'] },
  // half standing: knees drawn forward by their strings, arms raised in front as if to reach, head thrown back
  pinned: { C: V(0, 0.44, 0.03), N: V(0, 0.57, -0.02), H: V(0, 0.61, -0.16), EL: V(0.22, 0.4, 0.26), WL: V(0.24, 0.52, 0.52), ER: V(-0.24, 0.34, 0.24), WR: V(-0.3, 0.2, 0.47),
    KL: V(0.1, -0.3, 0.32), FL: V(0.1, -0.7, 0.16), KR: V(-0.1, -0.34, 0.28), FR: V(-0.12, -0.72, 0.08), headRoll: 0, dress: true, twist: 0.25, toNest: true,
    strings: ['WL', 'WR', 'EL', 'ER', 'KL', 'KR', 'SL', 'SR', 'H'] },
  // crouched under the low roof: slumped forward, one knee hiked, an elbow hoisted over the shoulder, the head hung
  slump: { C: V(0.04, 0.4, 0.12), N: V(0.06, 0.5, 0.2), H: V(0.08, 0.43, 0.33), EL: V(0.24, 0.15, 0.16), WL: V(0.28, 0.42, 0.3), ER: V(-0.2, 0.66, 0.1), WR: V(-0.18, 0.4, 0.18),
    KL: V(0.1, -0.12, 0.38), FL: V(0.1, -0.5, 0.3), KR: V(-0.1, -0.2, 0.34), FR: V(-0.12, -0.5, 0), headRoll: -0.5, dress: false, twist: -0.4,
    strings: ['WL', 'ER', 'EL', 'KL', 'SR', 'H'] },
};

let limbTag = 0; // 1 while building limbs: they get a little extra jerk
function tag(g) { g.userData.limb = limbTag; return g; }
function limb(list, a, b, r0, r1, seg = 12) {
  const d = b.clone().sub(a), len = d.length(); if (len < 1e-4) return;
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); list.push(tag(g));
}
function ball(list, p, r, sx = 1, sy = 1, sz = 1, seg = 12) { const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)); g.scale(sx, sy, sz); g.translate(p.x, p.y, p.z); list.push(tag(g)); }

function body(pose, rnd, skin, cloth) {
  const p = POSES[pose], P = V(0, 0, 0), J = { P, ...p };
  const sh = x => V(x, 0.02, 0).applyAxisAngle(UP, p.twist).add(p.C);
  J.SL = sh(0.17); J.SR = sh(-0.17); J.IL = V(0.1, -0.04, 0); J.IR = V(-0.1, -0.04, 0);
  // clothes: a coat or a dress over the torso, sleeves, trousers, boots
  limbTag = 0;
  limb(cloth, P, p.C, 0.15, 0.17, 10);
  { const g = new THREE.SphereGeometry(0.17, 12, 9); g.scale(1.15, 0.7, 0.8); g.rotateY(p.twist); g.translate(p.C.x, p.C.y, p.C.z); cloth.push(tag(g)); }
  ball(cloth, P, 0.15, 1.1, 0.7, 0.85);
  limbTag = 1;
  for (const s of ['L', 'R']) {
    limb(cloth, J['S' + s], J['E' + s], 0.055, 0.05); ball(cloth, J['S' + s], 0.06); ball(cloth, J['E' + s], 0.05);
    limb(skin, J['E' + s], J['W' + s], 0.042, 0.03, 10); ball(skin, J['W' + s].clone().lerp(J['E' + s], -0.18), 0.04, 0.7, 1.4, 0.5, 6); // a long dry hand
    limb(cloth, J['I' + s], J['K' + s], 0.075, 0.065); ball(cloth, J['K' + s], 0.065);
    limb(p.dress ? skin : cloth, J['K' + s], J['F' + s], p.dress ? 0.042 : 0.06, p.dress ? 0.034 : 0.05, 10);
    // the foot hangs toe down, pointed like a dancer's
    { const g = new THREE.SphereGeometry(0.05, 6, 5); g.scale(1, 0.8, 1.7); g.rotateX(0.9); g.translate(J['F' + s].x, J['F' + s].y - 0.02, J['F' + s].z + 0.03); cloth.push(tag(g)); }
  }
  limbTag = 0;
  if (p.dress) { const g = new THREE.CylinderGeometry(0.17, 0.34, 0.58, 12, 1, true); g.translate(0, -0.28, 0); cloth.push(tag(g)); }
  // collar, neck, head: pale and shrunken, the eyes sunk to dark hollows, the jaw dropped
  limb(skin, p.C.clone().lerp(p.N, 0.3), p.N, 0.05, 0.045, 6);
  const up = p.H.clone().sub(p.N).normalize(), fw0 = V(0, 0, 1);
  const side = new THREE.Vector3().crossVectors(up, fw0).normalize().applyAxisAngle(up, p.headRoll * 0.3), fw = new THREE.Vector3().crossVectors(side, up).normalize();
  const H = p.H.clone().addScaledVector(up, 0.04);
  { const g = new THREE.SphereGeometry(0.1, 12, 10); g.scale(0.85, 1.12, 0.95); const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const k = 1 + (rnd() - 0.5) * 0.06; pa.setXYZ(i, pa.getX(i) * k, pa.getY(i) * k, pa.getZ(i) * k); } g.computeVertexNormals();
    const m = new THREE.Matrix4().makeBasis(side, up, fw).setPosition(H); g.applyMatrix4(m); skin.push(tag(g)); }
  for (const sx of [-1, 1]) ball(cloth, H.clone().addScaledVector(fw, 0.078).addScaledVector(side, sx * 0.034).addScaledVector(up, 0.02), 0.024, 1, 0.8, 0.6, 6);
  ball(cloth, H.clone().addScaledVector(fw, 0.074).addScaledVector(up, -0.06), 0.022, 1, 1.8, 0.6, 6);
  ball(cloth, H.clone().addScaledVector(up, 0.035).addScaledVector(fw, -0.02), 0.1, 0.92, 0.82, 0.98, 8); // what is left of the hair
  J.H = H.clone().addScaledVector(up, 0.1); // the crown string ties on at the top of the skull
  // pelvis height that leaves the pointed toes just brushing the floor
  J.lift = -Math.min(J.FL.y, J.FR.y) + 0.075;
  return J;
}

// per-vertex sway data: aPivot = hang point, aSway = (phase, weight 0 fixed .. 1 swings, limb jerk)
function stamp(g, pivot, phase, weight, limbK) {
  const n = g.attributes.position.count, pv = new Float32Array(n * 3), sw = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pv.set([pivot.x, pivot.y, pivot.z], i * 3); sw.set([phase, typeof weight === 'function' ? weight(i) : weight, limbK], i * 3); }
  g.setAttribute('aPivot', new THREE.BufferAttribute(pv, 3)); g.setAttribute('aSway', new THREE.BufferAttribute(sw, 3));
}

const SWAY_GLSL = /* glsl */`
uniform float uTime;
attribute vec3 aPivot;
attribute vec3 aSway;
vec3 marionette(vec3 p) {
  float ph = aSway.x, w = aSway.y;
  // rare, short tugs on the strings
  float j = pow(max(0.0, sin(uTime * 0.53 + ph * 2.3) * sin(uTime * 0.29 + ph * 5.1)), 24.0);
  float tw = sin(uTime * 37.0 + ph * 9.0) * j;
  float yaw = sin(uTime * 0.23 + ph * 0.9) * 0.07 + tw * 0.05;
  vec2 sw = vec2(sin(uTime * 0.41 + ph), sin(uTime * 0.33 + ph * 1.7)) * 0.03 + tw * 0.012;
  vec3 rel = p - aPivot; float c = cos(yaw), s = sin(yaw);
  rel.xz = mat2(c, -s, s, c) * rel.xz;
  float hang = clamp((aPivot.y - p.y) / 1.4, 0.3, 1.6);
  vec3 q = aPivot + rel + vec3(sw.x * hang, j * 0.012 + aSway.z * tw * 0.018, sw.y * hang);
  return mix(p, q, w);
}
`;
function swayMaterial(mat, uTime) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = SWAY_GLSL + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = marionette(transformed);');
  };
  mat.customProgramCacheKey = () => 'marionette';
  return mat;
}

// placed: [pose, x, y, z, rx, ry, rz, anchors] in attic-local coordinates. Only pose, x, z and ry are
// used now: every body stands at (x, z) and hangs from its own strings. opts.roofY(z) gives the
// rafter height; opts.nest is the point the slanted strings run to. Returns { update(t) } to be
// called with the game clock so the sway freezes on pause.
export function preservedBodies(group, placed, threadPts, silkMat, seed = 909, opts = {}) {
  const roofY = opts.roofY || (z => 4.6 - Math.abs(z - 178.4) / 7 * 3.3);
  const nest = opts.nest || V(33.0, 4.35, 178.4);
  const rnd = rand(seed), skinG = [], clothG = [], strG = [], fine = [], fineP = [], fineS = [];
  const uTime = { value: 0 };
  placed.forEach(([pose, x, , z, , ry], bi) => {
    const s = [], c = [];
    const J = body(pose, rnd, s, c), p = POSES[pose];
    const m = new THREE.Matrix4().compose(V(x, J.lift, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(1, 1, 1));
    const phase = bi * 1.91 + 0.4, pivot = V(x, J.lift + 1.4, z);
    for (const g of [...s, ...c]) { g.applyMatrix4(m); stamp(g, pivot, phase, 1, g.userData.limb); }
    skinG.push(...s); clothG.push(...c);
    // the strings: dead straight and taut, a knot of silk where each one bites into the clothes
    for (const j of p.strings) {
      const from = J[j].clone().applyMatrix4(m);
      const to = p.toNest ? nest.clone().add(V((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.15, (rnd() - 0.5) * 0.3))
        : V(from.x + (rnd() - 0.5) * 0.06, roofY(from.z) - 0.06, from.z + (rnd() - 0.5) * 0.06);
      const limbK = /[WEKF]/.test(j[0]) ? 1 : 0, len = from.distanceTo(to);
      const g = new THREE.CylinderGeometry(0.0032, 0.0032, len, 3, 1, true); g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, to.clone().sub(from).normalize())); g.translate(from.x, from.y, from.z);
      const pa = g.attributes.position, tv = new THREE.Vector3();
      stamp(g, pivot, phase, i => 1 - Math.min(1, tv.fromBufferAttribute(pa, i).distanceTo(from) / len), limbK); strG.push(g);
      const k = new THREE.SphereGeometry(0.018, 5, 4); k.scale(1, 0.6, 1); k.translate(from.x, from.y, from.z); stamp(k, pivot, phase, 1, limbK); strG.push(k);
      // and a couple of hair-fine threads beside it, to the same point
      for (let i = 0; i < 2; i++) {
        const o = V((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.04);
        fine.push(from.x + o.x, from.y, from.z + o.z, to.x + o.x * 2, to.y, to.z + o.z * 2);
        fineP.push(pivot.x, pivot.y, pivot.z, pivot.x, pivot.y, pivot.z); fineS.push(phase, 1, limbK, phase, 0, limbK);
      }
    }
  });
  const clean = gs => mergeGeometries(gs.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'aPivot', 'aSway'].includes(a)) n.deleteAttribute(a); return n; }), false);
  const skinMat = swayMaterial(new THREE.MeshStandardMaterial({ color: 0xb4a78e, roughness: 0.95, emissive: 0x16120c }), uTime);
  const clothMat = swayMaterial(new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 1 }), uTime);
  const strMat = swayMaterial(new THREE.MeshStandardMaterial({ color: 0xe4dccb, roughness: 0.6, emissive: 0x2a2620 }), uTime);
  for (const [gs, mat, shadow] of [[skinG, skinMat, true], [clothG, clothMat, true], [strG, strMat, false]]) {
    const mesh = new THREE.Mesh(clean(gs), mat); mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh);
  }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fine, 3));
  fg.setAttribute('aPivot', new THREE.Float32BufferAttribute(fineP, 3)); fg.setAttribute('aSway', new THREE.Float32BufferAttribute(fineS, 3));
  const lines = new THREE.LineSegments(fg, swayMaterial(new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.4 }), uTime)); lines.frustumCulled = false; group.add(lines);
  return { update(t) { uTime.value = t; } };
}
