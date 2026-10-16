// The player's flashlight: a rubber-gripped aluminium torch held in the right hand,
// a soft-edged spotlight with a faint visible beam and dust drifting in it, a battery
// that runs down, and a few moths that are drawn into the light.
//
// burst() is the hook for later use against The Mother: a short, focused, very bright
// pulse that costs battery and announces itself with a 'flashburst' window event
// carrying the beam origin, direction and range. Nothing listens to it yet.
import * as THREE from 'three';
import { SPECIES, drawMoth } from './moths.js';

const DRAIN = 1 / 300;          // a full battery lasts five minutes of light
const LOW = 0.15;               // below this the beam flickers

function rubberTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, 64, 256);
  // grip rings
  for (let y = 40; y < 216; y += 8) { g.fillStyle = '#0c0d0e'; g.fillRect(0, y, 64, 3); g.fillStyle = '#2a2b2e'; g.fillRect(0, y + 3, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildModel() {
  const m = new THREE.Group();
  const alu = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.85, roughness: 0.35 });
  const rubber = new THREE.MeshStandardMaterial({ map: rubberTex(), roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.16, 20), rubber);
  body.rotation.x = Math.PI / 2; body.position.z = 0.05; m.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.03, 20), alu);
  neck.rotation.x = Math.PI / 2; neck.position.z = -0.045; m.add(neck);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.04, 24), alu);
  head.rotation.x = Math.PI / 2; head.position.z = -0.08; m.add(head);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.003, 8, 24), alu); bezel.position.z = -0.1; m.add(bezel);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xd8dde0, emissive: 0xfff0d0, emissiveIntensity: 0, roughness: 0.1, metalness: 0.2 });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.027, 24), lensMat); lens.position.z = -0.1005; lens.rotation.y = Math.PI; m.add(lens);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.02, 20), alu);
  tail.rotation.x = Math.PI / 2; tail.position.z = 0.14; m.add(tail);
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, 0.016), new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.6 }));
  button.position.set(0, 0.022, -0.01); m.add(button);
  // a simple hand: knuckles wrapped round the grip
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a6656, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.03, 4, 8), skin);
    f.rotation.z = Math.PI / 2; f.scale.set(0.9, 1, 0.8); f.position.set(0.004, -0.022, 0.01 + i * 0.022); m.add(f);
  }
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.1), skin); palm.position.set(0.026, -0.006, 0.05); m.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.035, 4, 8), skin);
  thumb.rotation.x = Math.PI / 2; thumb.position.set(0.012, 0.02, 0.0); m.add(thumb);
  m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { m, lensMat };
}

// a cone with soft edges that fades with distance, drawn additively
function buildBeam() {
  const len = 9, geo = new THREE.ConeGeometry(Math.tan(0.36) * len, len, 32, 1, true);
  geo.translate(0, -len / 2, 0); geo.rotateX(Math.PI / 2); geo.rotateX(Math.PI); // apex at origin, opening along -z
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { strength: { value: 0 }, len: { value: len } },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main() { vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float strength; uniform float len; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main() { float d = clamp(-vP.z / len, 0.0, 1.0); float edge = pow(abs(dot(vN, vV)), 1.6);
        float a = strength * edge * (1.0 - d) * (1.0 - d) * smoothstep(0.0, 0.06, d) * 0.11;
        gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * a, a); }`,
  });
  const beam = new THREE.Mesh(geo, mat); beam.renderOrder = 5; beam.frustumCulled = false;
  return beam;
}

function mothSprite(key) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  drawMoth(c.getContext('2d'), key, 64, 58, 118, { pin: false, seed: 3 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: true });
}

export function createFlashlight(camera, scene, { playClick } = {}) {
  const rig = new THREE.Group(); camera.add(rig);
  const { m: model, lensMat } = buildModel();
  model.scale.setScalar(0.8); model.position.set(0.24, -0.23, -0.42); model.rotation.set(0.03, 0.1, 0); rig.add(model);
  const light = new THREE.SpotLight(0xfff0d8, 0, 26, 0.36, 0.75, 1.5);
  light.castShadow = true; light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.0008; light.shadow.normalBias = 0.03; light.shadow.camera.near = 0.1;
  light.position.set(0, 0, -0.11); model.add(light);
  const target = new THREE.Object3D(); target.position.set(0, 0, -4); model.add(target); light.target = target;
  const beam = buildBeam(); beam.position.z = -0.1; model.add(beam);

  // dust in the beam (camera space, so it stays in the cone)
  const DN = 220, dpos = new Float32Array(DN * 3), dseed = new Float32Array(DN);
  const spawnDust = i => { const z = 0.6 + Math.random() * 5.5, a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * Math.tan(0.33) * z; dpos.set([Math.cos(a) * r, Math.sin(a) * r, -z], i * 3); dseed[i] = Math.random() * 100; };
  for (let i = 0; i < DN; i++) spawnDust(i);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff2dc, size: 0.006, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; dust.position.z = -0.1; model.add(dust);

  // moths that come to the light: world-space sprites
  const keys = ['lubricipeda', 'caja', 'elpenor', 'vinula', 'pavonia'];
  const moths = keys.map((k, i) => {
    const s = new THREE.Sprite(mothSprite(k)); s.scale.set(0.09, 0.09, 1); s.visible = false; scene.add(s);
    return { s, i, home: new THREE.Vector3(), vel: new THREE.Vector3(), phase: Math.random() * 10, arrive: 2 + i * 1.6 };
  });

  const f = { on: false, battery: 1, flicker: 0, burstT: -1, onTime: 0, model, light, moths,
    toggle() {
      if (!f.on && f.battery <= 0) { playClick && playClick(); return false; }
      f.on = !f.on; f.onTime = 0; playClick && playClick();
      if (f.on) for (const m of moths) { m.arrive = 2 + m.i * (1.2 + Math.random()); }
      return f.on;
    },
    addBattery(x) { f.battery = Math.min(1, f.battery + x); },
    // hook for later: a focused, blinding pulse
    burst() {
      if (!f.on || f.battery < 0.12) return null;
      f.battery -= 0.12; f.burstT = 0;
      const origin = new THREE.Vector3(), dir = new THREE.Vector3();
      light.getWorldPosition(origin); camera.getWorldDirection(dir);
      const detail = { origin, dir, range: 12 };
      dispatchEvent(new CustomEvent('flashburst', { detail }));
      return detail;
    },
    update(dt, t, moving, quality, lure = null) {
      // gentle hand sway, more when walking
      const k = moving ? 1 : 0.35;
      model.position.set(0.24 + Math.sin(t * 1.7) * 0.004 * k + Math.sin(t * 7.5) * 0.006 * (moving ? 1 : 0), -0.23 + Math.cos(t * 1.3) * 0.003 * k + Math.abs(Math.sin(t * 7.5)) * 0.006 * (moving ? 1 : 0), -0.42);
      if (f.on) { f.battery = Math.max(0, f.battery - DRAIN * dt); f.onTime += dt; if (f.battery <= 0) { f.on = false; playClick && playClick(); } }
      let I = f.on ? 30 : 0, angle = 0.36;
      if (f.on && f.battery < LOW) { f.flicker -= dt; if (f.flicker < 0) f.flicker = Math.random() * 0.4; I *= f.flicker < 0.06 ? 0.15 : 0.6 + f.battery * 2; }
      if (f.burstT >= 0) { f.burstT += dt; const b = Math.max(0, 1 - f.burstT / 0.45); I += 260 * b; angle = 0.36 - 0.2 * b; if (f.burstT > 0.45) f.burstT = -1; }
      light.intensity = I; light.angle = angle;
      lensMat.emissiveIntensity = I > 0 ? 1.5 : 0;
      beam.material.uniforms.strength.value = I / 30; beam.visible = I > 0;
      dust.visible = I > 0 && quality.dust > 0;
      dust.material.opacity = Math.min(0.35, I / 80);
      dg.setDrawRange(0, Math.min(DN, Math.round(quality.dust / 2)));
      if (dust.visible) {
        for (let i = 0; i < DN; i++) {
          dpos[i * 3] += Math.sin(t * 0.3 + dseed[i]) * 0.0006; dpos[i * 3 + 1] += Math.cos(t * 0.23 + dseed[i]) * 0.0005 - 0.0002;
          const z = -dpos[i * 3 + 2]; if (Math.hypot(dpos[i * 3], dpos[i * 3 + 1]) > Math.tan(0.34) * z) spawnDust(i);
        }
        dg.attributes.position.needsUpdate = true;
      }
      // moths: after a while in the dark with the torch on, a few flutter into the beam
      const camPos = new THREE.Vector3(), dir = new THREE.Vector3(); camera.getWorldPosition(camPos); camera.getWorldDirection(dir);
      for (const m of moths) {
        const lured = !f.on && lure && lure.on && lure.onTime > m.arrive;
        if ((f.on && f.onTime > m.arrive) || lured) {
          if (!m.s.visible) { m.s.visible = true; m.s.position.copy(camPos).addScaledVector(dir, 6).add(new THREE.Vector3((Math.random() - 0.5) * 6, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 6)); m.vel.set(0, 0, 0); }
          const goal = (lured ? lure.pos.clone().add(new THREE.Vector3(0, 0.15, 0)).addScaledVector(new THREE.Vector3(Math.sin(t * 2 + m.i), 0, Math.cos(t * 2 + m.i)), 0.25 + m.i * 0.08) : camPos.clone().addScaledVector(dir, 1.6 + m.i * 0.5)).add(new THREE.Vector3(Math.sin(t * 1.3 + m.phase) * 0.35, Math.cos(t * 1.7 + m.phase) * 0.25, Math.sin(t * 0.9 + m.phase * 2) * 0.35));
          m.vel.addScaledVector(goal.sub(m.s.position), dt * 2.2).multiplyScalar(1 - dt * 1.4);
          m.vel.x += (Math.random() - 0.5) * dt * 3; m.vel.y += (Math.random() - 0.5) * dt * 3;
        } else if (m.s.visible) {
          m.vel.y += dt * 0.6; m.vel.multiplyScalar(1 - dt * 0.5);
          if (m.s.position.distanceTo(camPos) > 9) m.s.visible = false;
        }
        if (m.s.visible) {
          m.s.position.addScaledVector(m.vel, dt);
          const flap = Math.abs(Math.sin(t * 26 + m.phase)); m.s.scale.set(0.09 * (0.25 + 0.75 * flap), 0.09, 1);
          m.s.material.rotation = Math.atan2(m.vel.x, m.vel.y) * 0.3;
        }
      }
    },
  };
  return f;
}

// A boxed battery pickup (two AA cells in a card sleeve).
export function batteryMesh() {
  const g = new THREE.Group();
  const cell = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.6, roughness: 0.4 });
  const band = new THREE.MeshStandardMaterial({ color: 0xc8a030, metalness: 0.7, roughness: 0.35, emissive: 0x403010 });
  for (const x of [-0.009, 0.009]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.05, 14), cell); c.rotation.z = Math.PI / 2; c.position.set(0, 0.0072, x); g.add(c);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0074, 0.012, 14), band); b.rotation.z = Math.PI / 2; b.position.set(0.016, 0.0072, x); g.add(b);
  }
  g.scale.setScalar(2.2);
  return g;
}
