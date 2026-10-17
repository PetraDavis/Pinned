// Portable paraffin lanterns found around the house. Carried in the same hand as the
// torch (the other hand stays free for specimens), so raising one puts the torch away.
// Warm, wide, soft light; no battery, but the fuel burns down slowly. Its light draws
// moths like the torch does. It does NOT stun The Mother: only flashlight.burst() can.
import * as THREE from 'three';

const BURN = 1 / 900; // a full tank lasts fifteen minutes

export function lanternMesh() {
  const g = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: 0xa07a38, metalness: 0.85, roughness: 0.35 });
  const tin = new THREE.MeshStandardMaterial({ color: 0x3a3632, metalness: 0.6, roughness: 0.5 });
  const fount = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 20), tin); fount.position.y = 0.035; g.add(fount);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.03, 16), brass); collar.position.y = 0.085; g.add(collar);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf0e8d8, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
  glass.scale.set(1, 1.35, 1); glass.position.y = 0.17; g.add(glass);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const w = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.17, 5), tin); w.position.set(Math.cos(a) * 0.07, 0.17, Math.sin(a) * 0.07); g.add(w); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.04, 16), tin); cap.position.y = 0.27; g.add(cap);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.004, 6, 20, Math.PI), brass); handle.position.y = 0.29; g.add(handle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070 })); flame.scale.y = 2.2; flame.position.y = 0.15; g.add(flame);
  g.userData.flame = flame;
  return g;
}

export function createLantern(camera) {
  const model = lanternMesh(); model.scale.setScalar(0.85);
  model.position.set(0.26, -0.42, -0.5); model.visible = false; camera.add(model);
  const light = new THREE.PointLight(0xffb468, 0, 10, 1.4); light.userData.noLimit = true; light.position.set(0.18, -0.16, -0.95); camera.add(light); // just ahead of the lantern, so it doesn't burn out its own frame
  const L = { have: false, on: false, fuel: 0, onTime: 0, model, light,
    pickUp(fuel = 0.8) { L.have = true; L.fuel = Math.max(L.fuel, fuel); },
    raise() { if (!L.have) return false; L.on = !L.on; L.onTime = 0; return L.on; },
    lower() { L.on = false; },
    worldPos(v) { return light.getWorldPosition(v); },
    update(dt, t, moving) {
      if (L.on) { L.fuel = Math.max(0, L.fuel - BURN * dt); L.onTime += dt; }
      model.visible = L.on;
      const sway = moving ? 1 : 0.3;
      model.rotation.z = Math.sin(t * 3.1) * 0.04 * sway; model.rotation.x = Math.sin(t * 2.3) * 0.03 * sway;
      // low fuel: the flame shrinks and gutters
      const f = L.fuel, gutter = f < 0.12 ? (0.4 + Math.random() * 0.6) : 1;
      const I = L.on ? (f > 0 ? (2.2 + 3.8 * Math.min(1, f * 3)) * gutter * (0.93 + Math.sin(t * 9) * 0.04 + Math.sin(t * 23) * 0.03) : 0) : 0;
      light.intensity = I; light.distance = 4 + 6 * Math.min(1, f * 3);
      model.userData.flame.visible = I > 0; model.userData.flame.scale.set(1, 1.2 + Math.min(1, f * 3), 1);
    },
  };
  return L;
}
