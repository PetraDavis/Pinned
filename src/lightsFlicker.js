// The lights fail as she comes. When the Mother advances on someone who can see her, every lamp,
// the torch and the lantern near the player gutter out for a moment and stutter back on; while it
// is dark she takes a step nearer (the controllers move her; this file only does the lights).
//
// The flicker never writes light state that other code owns: main.js calls apply() just before it
// renders (lights near the camera are scaled, and the exposure dropped) and restore() just after.
// A torch burst always wins: no flicker while it is flaring.
import * as THREE from 'three';

const RADIUS = 16;
// a pulse: [seconds, light level] steps; dark first (that is when she moves), then a stutter back
const SHAPE = [[0.05, 0.25], [0.26, 0.03], [0.05, 0.55], [0.05, 0.08], [0.07, 0.8]];
const SHAPE_T = SHAPE.reduce((a, s) => a + s[0], 0);

export function createLightsFlicker({ scene, renderer, camera, flashlight }) {
  let lights = [], scanT = 0, t = -1;
  const saved = [], wp = new THREE.Vector3();
  let exposure = null;
  function scan() { lights = []; scene.traverse(o => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight && !o.isDirectionalLight) lights.push(o); }); }
  const level = () => {
    if (t < 0) return 1;
    let a = 0; for (const [d, l] of SHAPE) { a += d; if (t < a) return l; }
    return 1;
  };
  return {
    // start a pulse (ignored while one is running). Returns true when it started.
    pulse() { if (t >= 0) return false; t = 0; return true; },
    get active() { return t >= 0; },
    get level() { return level(); },
    update(dt) { if (t >= 0) { t += dt; if (t >= SHAPE_T) t = -1; } scanT -= dt; },
    apply() {
      const k = level();
      if (k >= 1 || (flashlight && flashlight.burstT >= 0)) return;
      if (scanT <= 0 || !lights.length) { scan(); scanT = 2; }
      const c = camera.getWorldPosition(wp).clone();
      for (const l of lights) {
        if (!l.visible || l.intensity <= 0) continue;
        if (l.getWorldPosition(wp).distanceTo(c) > RADIUS) continue;
        saved.push(l, l.intensity); l.intensity *= k;
      }
      exposure = renderer.toneMappingExposure; renderer.toneMappingExposure = exposure * (0.25 + 0.75 * k);
    },
    restore() {
      for (let i = 0; i < saved.length; i += 2) saved[i].intensity = saved[i + 1];
      saved.length = 0;
      if (exposure != null) { renderer.toneMappingExposure = exposure; exposure = null; }
    },
  };
}

// how often she lunges in the dark, and how far, with n players' crowd factor k (0..1)
export const flickerEvery = (k) => 1.7 / (1 + 0.35 * k);
export const flickerStep = (k) => 1.3 * (1 + 0.25 * k);
// can this player see her? In plan: she is within ~55 degrees of where they look, near enough, nothing between
export function seesHer(camDir, from, at, losOk, range = 16) {
  const dx = at.x - from.x, dz = at.y - from.y, L = Math.hypot(dx, dz);
  if (L > range) return false;
  if (L > 0.5) { const h = Math.hypot(camDir.x, camDir.z) || 1; if ((dx * camDir.x + dz * camDir.z) / (L * h) < 0.57) return false; }
  return losOk;
}
