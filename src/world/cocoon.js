// Spun silk cocoons, shared by the cellar, the first floor and the catacombs.
// A fibrous silk body (a lathe profile) wrapped in criss-crossing strands. Callers either
// merge the geometries into one silk mesh (static cocoons) or build one mesh per cocoon
// (cocoons that twitch and crack).
import * as THREE from 'three';
import { rand } from './build.js';

// The body and its wrapped strands in a local frame: upright, base at y = 0, top at y = h.
export function cocoonBody(h, seed, phase = 0) {
  const cr = rand(seed), geos = [];
  const prof = []; for (let i = 0; i <= 14; i++) { const t = i / 14; prof.push(new THREE.Vector2(Math.max(0.004, Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.21 * h * (1 + 0.08 * Math.sin(t * 13 + phase))), t * h)); }
  geos.push(new THREE.LatheGeometry(prof, 16));
  for (let k = 0; k < 3; k++) {
    const pts = [], turns = 3 + k, ph = cr() * 6.28, tilt = (cr() - 0.5) * 0.6;
    for (let i = 0; i <= 60; i++) { const t = 0.06 + i / 60 * 0.88, rr = Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.21 * h * 1.04 + 0.004, a2 = ph + t * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a2) * rr, t * h + Math.cos(a2) * rr * tilt, Math.sin(a2) * rr)); }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0035, 3, false));
  }
  return { geos, rng: cr };
}

// A cocoon placed in the world: hanging from the ceiling (`top` is the ceiling height) or
// lying on the floor, with anchor threads. Pushes into the caller's geometry and thread lists.
export function spunCocoon(x, z, h, hanging, top, silkGeos, threadPts) {
  const { geos, rng: cr } = cocoonBody(h, Math.floor(x * 31 + z * 17), x);
  const place = (g) => { if (hanging) { g.rotateX(Math.PI); g.translate(x, top - 0.22, z); } else { g.rotateZ(Math.PI / 2 * 0.92); g.translate(x + h * 0.45, 0.17, z); } return g; };
  const anchor = hanging ? new THREE.Vector3(x, top - 0.22, z) : new THREE.Vector3(x + h * 0.9, 0.3, z);
  // each vertex remembers its cocoon's anchor and a phase, so the merged mesh can still twitch (animSilk)
  const ph = 1 + cr() * 6.28, pivot = hanging ? anchor : new THREE.Vector3(x + h * 0.45, 0.02, z);
  for (const g of geos) { place(g); const n = g.attributes.position.count, a = new Float32Array(n * 4); for (let i = 0; i < n; i++) a.set([pivot.x, pivot.y, pivot.z, ph], i * 4); g.setAttribute('aCoc', new THREE.BufferAttribute(a, 4)); silkGeos.push(g); }
  const n = 5 + Math.floor(cr() * 4);
  for (let i = 0; i < n; i++) {
    const a2 = cr() * 6.28, d = 0.15 + cr() * (i < 2 ? 1.6 : 0.5);
    const end = hanging ? new THREE.Vector3(x + Math.cos(a2) * d, top - 0.005, z + Math.sin(a2) * d) : new THREE.Vector3(anchor.x + Math.cos(a2) * d, i < 2 ? 0.005 : 0.3 + cr() * 1.2, anchor.z + Math.sin(a2) * d);
    const from = anchor.clone().add(new THREE.Vector3((cr() - 0.5) * 0.06, hanging ? 0 : (cr() - 0.5) * 0.1, (cr() - 0.5) * 0.06));
    threadPts.push(from.x, from.y, from.z, end.x, end.y, end.z);
  }
}

// geometry lists -> one geometry with only position/normal/uv
// (keeps the twitch attribute when any of them has it; pieces without it stay still)
export function mergeSilk(mergeGeometries, geos) {
  const anim = geos.some(g => g.attributes.aCoc);
  return mergeGeometries(geos.map(g => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', ...(anim ? ['aCoc'] : [])].includes(k)) n.deleteAttribute(k);
    if (anim && !n.attributes.aCoc) n.setAttribute('aCoc', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 4), 4));
    return n;
  }), false);
}

// The merged cocoons, alive: a slow breathing swell, frequent small twitches and now and then a
// bigger jolt, all in the vertex shader (one draw call, nothing per frame on the CPU but a clock).
const silkT = { value: 0 }, animCache = new WeakMap();
export function tickSilk(t) { silkT.value = t; }
export function animSilk(mat) {
  if (animCache.has(mat)) return animCache.get(mat);
  const m = mat.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSilkT = silkT;
    sh.vertexShader = 'attribute vec4 aCoc;\nuniform float uSilkT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      if (aCoc.w > 0.5) {
        float ph = aCoc.w; vec3 d = transformed - aCoc.xyz; float L = length(d);
        transformed.xz += d.xz * 0.035 * sin(uSilkT * 0.9 + ph * 2.0);
        float tw = pow(max(0.0, sin(uSilkT * 1.1 + ph * 5.0)), 30.0) + pow(max(0.0, sin(uSilkT * 0.53 + ph * 3.0)), 40.0);
        float jolt = pow(max(0.0, sin(uSilkT * 0.17 + ph * 4.0)), 160.0);
        float s = sin(uSilkT * 37.0 + ph * 7.0) * (tw * 0.04 + jolt * 0.11);
        transformed.x += L * s; transformed.z += L * s * 0.7 * cos(ph * 3.0);
      }`);
  };
  m.customProgramCacheKey = () => 'animSilk';
  animCache.set(mat, m); return m;
}
