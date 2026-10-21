// Proximity warning: when the Mother is near, small pale moths flutter around your view.
// Nothing is written on screen; the swarm thickens as she closes in (sparse at ~15 m,
// thick at ~4 m) and fades while you are hidden or she is stunned. One InstancedMesh of
// quads parented to the camera; the moth count scales with graphics quality.
import * as THREE from 'three';
import { drawMoth } from './moths.js';

const CAP = { xlow: 14, low: 24, medium: 50, high: 90 }, FAR = 15, THICK = 4;

export function createMotherMoths(camera, quality = 'high') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  drawMoth(c.getContext('2d'), 'bisselliella', 32, 30, 60, { pin: false, seed: 11 });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.15, depthWrite: false, depthTest: false, side: THREE.DoubleSide, color: 0xe6dccb, fog: false, opacity: 1 });
  const MAX = CAP.high;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.045, 0.045), mat, MAX);
  mesh.frustumCulled = false; mesh.renderOrder = 10; mesh.userData.noAO = true; mesh.count = 0; mesh.visible = false;
  camera.add(mesh);
  let cap = CAP[quality] || CAP.medium, level = 0;
  // each moth orbits its own anchor in view space (x,y spread over the screen, z 0.35..1.1 m ahead)
  const seeds = Array.from({ length: MAX }, (_, i) => {
    const a = i * 2.399, r = 0.25 + 0.75 * (((i * 53) % 97) / 97);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.65, z: 0.35 + ((i * 31) % 23) / 30, sp: 1.3 + ((i * 17) % 9) / 4, ph: i * 1.7, rad: 0.04 + ((i * 7) % 5) / 60, dir: i % 2 ? 1 : -1 };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  return {
    mesh,
    get level() { return level; },
    setQuality(qn) { cap = CAP[qn] || CAP.medium; },
    // dist: metres to the Mother (Infinity when she does not count); suppressed: hidden / stunned
    update(dt, t, dist, suppressed) {
      const target = suppressed || !(dist < FAR) ? 0 : Math.min(1, (FAR - dist) / (FAR - THICK));
      level += (target - level) * Math.min(1, dt * (target > level ? 1.5 : 2.5));
      if (level < 0.01) { level = target ? level : 0; mesh.visible = false; mesh.count = 0; return; }
      const n = Math.max(1, Math.round(cap * Math.pow(level, 1.3)));
      mesh.visible = true; mesh.count = n;
      mat.opacity = Math.min(1, 0.4 + level);
      const hw = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
      for (let i = 0; i < n; i++) {
        const sd = seeds[i], w = t * sd.sp * sd.dir + sd.ph;
        const flap = Math.abs(Math.sin(t * 22 + sd.ph * 3)); // wingbeat: squash across x
        p.set((sd.x * hw * 1.1 + Math.cos(w) * sd.rad * 3) * sd.z, (sd.y + Math.sin(w * 1.3) * sd.rad * 2 + Math.sin(t * 5 + sd.ph) * 0.02) * sd.z, -sd.z);
        e.set(0, 0, Math.sin(w) * 0.8 + sd.ph); q.setFromEuler(e);
        s.set(0.35 + 0.65 * flap, 1, 1);
        m.compose(p, q, s); mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
