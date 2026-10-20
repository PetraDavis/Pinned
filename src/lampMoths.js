// A few moths circling each lit lamp (gas sconces, the chandelier, the oil lamp).
// One InstancedMesh of camera-facing quads for the whole house; only lamps near the
// player get moths, and the count per lamp scales with graphics quality.
import * as THREE from 'three';
import { drawMoth } from './moths.js';

const PER = { xlow: 1, low: 2, medium: 4, high: 6 }, NEAR = 11, MAX_LAMPS = 6;

export function createLampMoths(scene, quality = 'high') {
  const lamps = [];
  scene.traverse(o => { if (o.isPointLight && o.userData.moths) lamps.push(o); });
  const c = document.createElement('canvas'); c.width = c.height = 64;
  drawMoth(c.getContext('2d'), 'bisselliella', 32, 30, 60, { pin: false, seed: 5 });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.2, depthWrite: false, side: THREE.DoubleSide, color: 0xd8c8b0 });
  const CAP = MAX_LAMPS * PER.high;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.07), mat, CAP);
  mesh.frustumCulled = false; mesh.userData.noAO = true; mesh.count = 0; scene.add(mesh);
  let per = PER[quality] || 4;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), lp = new THREE.Vector3(), sc = new THREE.Vector3();
  const seeds = Array.from({ length: CAP }, (_, i) => ({ r: 0.18 + ((i * 37) % 11) / 30, sp: 1.6 + ((i * 13) % 7) / 3, ph: i * 2.39, tilt: ((i * 29) % 9) / 9 - 0.5, dir: i % 3 ? 1 : -1 }));
  const near = [];
  return {
    mesh,
    setQuality(qn) { per = PER[qn] || 4; },
    update(t, camera) {
      near.length = 0;
      for (const l of lamps) {
        if (l.intensity < 0.3) continue;
        let o = l, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; } if (!vis) continue;
        l.getWorldPosition(lp); const d = lp.distanceToSquared(camera.position);
        if (d < NEAR * NEAR) near.push([d, l]);
      }
      near.sort((a, b) => a[0] - b[0]); if (near.length > MAX_LAMPS) near.length = MAX_LAMPS;
      q.copy(camera.quaternion); let n = 0;
      for (const [, l] of near) {
        l.getWorldPosition(lp);
        for (let k = 0; k < per; k++, n++) {
          const s = seeds[n], a = t * s.sp * s.dir + s.ph;
          // erratic loops: a circle with wobble in radius and height, plus a fast flutter
          const r = s.r * (1 + 0.35 * Math.sin(t * 2.7 + s.ph * 3));
          p.set(lp.x + Math.cos(a) * r, lp.y + Math.sin(a * 1.3 + s.ph) * 0.12 + s.tilt * 0.15, lp.z + Math.sin(a) * r);
          const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 38 + s.ph * 7));
          sc.set(flap, 1, 1); m.compose(p, q, sc); mesh.setMatrixAt(n, m);
        }
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
