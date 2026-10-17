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
  for (const g of geos) silkGeos.push(place(g));
  const anchor = hanging ? new THREE.Vector3(x, top - 0.22, z) : new THREE.Vector3(x + h * 0.9, 0.3, z);
  const n = 5 + Math.floor(cr() * 4);
  for (let i = 0; i < n; i++) {
    const a2 = cr() * 6.28, d = 0.15 + cr() * (i < 2 ? 1.6 : 0.5);
    const end = hanging ? new THREE.Vector3(x + Math.cos(a2) * d, top - 0.005, z + Math.sin(a2) * d) : new THREE.Vector3(anchor.x + Math.cos(a2) * d, i < 2 ? 0.005 : 0.3 + cr() * 1.2, anchor.z + Math.sin(a2) * d);
    const from = anchor.clone().add(new THREE.Vector3((cr() - 0.5) * 0.06, hanging ? 0 : (cr() - 0.5) * 0.1, (cr() - 0.5) * 0.06));
    threadPts.push(from.x, from.y, from.z, end.x, end.y, end.z);
  }
}

// geometry lists -> one geometry with only position/normal/uv
export function mergeSilk(mergeGeometries, geos) {
  return mergeGeometries(geos.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; }), false);
}
