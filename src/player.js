// First-person player: pointer-lock mouse look, WASD, sprint, jump, collision.
import * as THREE from 'three';

const EYE = 1.62, RADIUS = 0.35, WALK = 2.6, SPRINT = 4.8, GRAVITY = 18, JUMP_V = 5.2;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.pos = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.vy = 0; this.y = 0; this.grounded = true;
    this.keys = {};
    this.enabled = false;   // movement allowed (not paused / not in cutscene)
    this.sensitivity = 1;
    this.bob = 0;
    this.moving = false;

    addEventListener('keydown', e => { this.keys[e.code] = true; });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('mousemove', e => {
      if (!this.enabled || document.pointerLockElement !== this.dom) return;
      const k = 0.0022 * this.sensitivity;
      this.yaw -= e.movementX * k;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * k, -1.45, 1.45);
    });
  }

  place(x, z, yaw = this.yaw) {
    this.pos.set(x, 0, z); this.yaw = yaw; this.pitch = 0; this.y = 0; this.vy = 0;
    this.applyCamera();
  }

  update(dt, colliders) {
    if (this.enabled) {
      const f = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
      const s = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
      const sprint = this.keys.ShiftLeft || this.keys.ShiftRight;
      const speed = sprint ? SPRINT : WALK;
      let dx = 0, dz = 0;
      if (f || s) {
        const len = Math.hypot(f, s);
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        dx = (-sin * f + cos * s) / len * speed * dt;
        dz = (-cos * f - sin * s) / len * speed * dt;
      }
      this.moving = !!(f || s);
      this.pos.x += dx; this.pos.z += dz; this.resolve(colliders);
      if (this.keys.Space && this.grounded) { this.vy = JUMP_V; this.grounded = false; }
      if (this.moving && this.grounded) this.bob += dt * (sprint ? 13 : 8.5);
    } else this.moving = false;
    // vertical
    this.vy -= GRAVITY * dt; this.y += this.vy * dt;
    if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    this.applyCamera();
  }

  // Push the player circle out of any overlapping XZ box along the shortest way out.
  resolve(colliders) {
    for (const c of colliders) {
      const nx = THREE.MathUtils.clamp(this.pos.x, c.minX, c.maxX);
      const nz = THREE.MathUtils.clamp(this.pos.z, c.minZ, c.maxZ);
      const ddx = this.pos.x - nx, ddz = this.pos.z - nz, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= RADIUS * RADIUS - 1e-9) continue;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        this.pos.x = nx + ddx / d * RADIUS; this.pos.z = nz + ddz / d * RADIUS;
      } else {
        // centre inside the box: leave by the nearest face
        const opts = [[this.pos.x - c.minX, 'x', c.minX - RADIUS], [c.maxX - this.pos.x, 'x', c.maxX + RADIUS],
          [this.pos.z - c.minZ, 'z', c.minZ - RADIUS], [c.maxZ - this.pos.z, 'z', c.maxZ + RADIUS]];
        opts.sort((a, b) => a[0] - b[0]);
        this.pos[opts[0][1]] = opts[0][2];
      }
    }
  }

  applyCamera(extraY = 0) {
    const bobY = this.grounded ? Math.sin(this.bob) * 0.035 : 0;
    this.camera.position.set(this.pos.x, EYE + this.y + bobY + extraY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
