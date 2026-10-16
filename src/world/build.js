// Small helpers shared by world builders.
import * as THREE from 'three';
import { pbrMaps } from '../textures.js';

// Standard material; if the colour map has generated normal/roughness maps,
// attach them with the same tiling.
export function mat(opts) {
  const o = { roughness: 0.9, metalness: 0, ...opts };
  const pbr = o.map && o.map.image && pbrMaps.get(o.map.image);
  if (pbr && !o.normalMap) {
    o.normalMap = pbr.normal.clone(); o.normalMap.repeat.copy(o.map.repeat);
    o.normalScale = new THREE.Vector2(o.bump ?? 1, o.bump ?? 1);
    if (o.roughness > 0.3 && opts.roughness !== 1) { o.roughnessMap = pbr.rough.clone(); o.roughnessMap.repeat.copy(o.map.repeat); o.roughness = 1; }
  }
  delete o.bump;
  return new THREE.MeshStandardMaterial(o);
}

// Adds a box mesh; if `colliders` is given, registers its XZ footprint.
export function box(parent, w, h, d, x, y, z, material, colliders, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = true;
  parent.add(m);
  if (colliders) addCollider(colliders, m, opts.pad || 0);
  return m;
}

// Registers the world-space XZ bounding box of an object as a collider.
export function addCollider(colliders, obj, pad = 0) {
  obj.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(obj);
  colliders.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad });
}

export function rect(colliders, minX, maxX, minZ, maxZ) {
  colliders.push({ minX, maxX, minZ, maxZ });
}

// Texture clone with its own repeat
export function rep(t, x, y) {
  const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c;
}

export function rand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
