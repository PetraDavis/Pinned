// First-person player: pointer-lock mouse look, WASD, sprint, jump, collision.
import * as THREE from 'three';

const EYE = 1.62, CROUCH_EYE = 0.95, STAND_H = 1.78, CROUCH_H = 1.15, CROUCH_SPEED = 1.3, RADIUS = 0.35, WALK = 2.6, SPRINT = 4.8, GRAVITY = 18, JUMP_V = 5.2;

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
    this.crouchToggle = false; // Settings option: toggle instead of hold
    this.crouchLatched = false; this.crouching = false; this.crouchT = 0;

    addEventListener('keydown', e => {
      if (!e.repeat && (e.code === 'KeyC' || e.code === 'ControlLeft') && this.crouchToggle) this.crouchLatched = !this.crouchLatched;
      this.keys[e.code] = true;
    });
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
      const want = this.crouchToggle ? this.crouchLatched : !!(this.keys.KeyC || this.keys.ControlLeft);
      if (want) this.crouching = true;
      else if (this.crouching && !this.blockedAbove(colliders)) this.crouching = false;
      const sprint = !this.crouching && (this.keys.ShiftLeft || this.keys.ShiftRight);
      const speed = this.crouching ? CROUCH_SPEED : sprint ? SPRINT : WALK;
      let dx = 0, dz = 0;
      if (f || s) {
        const len = Math.hypot(f, s);
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        dx = (-sin * f + cos * s) / len * speed * dt;
        dz = (-cos * f - sin * s) / len * speed * dt;
      }
      this.moving = !!(f || s);
      this.pos.x += dx; this.pos.z += dz; this.resolve(colliders);
      if (this.keys.Space && this.grounded && !this.crouching) { this.vy = JUMP_V; this.grounded = false; }
      if (this.moving && this.grounded) this.bob += dt * (sprint ? 13 : this.crouching ? 6 : 8.5);
    } else this.moving = false;
    this.crouchT += ((this.crouching ? 1 : 0) - this.crouchT) * Math.min(1, dt * 9);
    // vertical
    this.vy -= GRAVITY * dt; this.y += this.vy * dt;
    if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    this.applyCamera();
  }

  // Push the player circle out of any overlapping XZ box along the shortest way out.
  resolve(colliders) {
    const h = this.crouching ? CROUCH_H : STAND_H;
    for (const c of colliders) {
      if (c.minY !== undefined && c.minY >= h) continue; // low overhang: pass beneath
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

  // Something with an underside (minY) lower than standing height overlaps the player.
  blockedAbove(colliders) {
    for (const c of colliders) {
      if (c.minY === undefined || c.minY >= STAND_H) continue;
      const nx = THREE.MathUtils.clamp(this.pos.x, c.minX, c.maxX), nz = THREE.MathUtils.clamp(this.pos.z, c.minZ, c.maxZ);
      if ((this.pos.x - nx) ** 2 + (this.pos.z - nz) ** 2 < RADIUS * RADIUS) return true;
    }
    return false;
  }

  // Quieter footsteps / harder to notice while crouched.
  get noise() { return this.crouching ? 0.35 : (this.keys.ShiftLeft || this.keys.ShiftRight) ? 1.6 : 1; }

  applyCamera(extraY = 0) {
    const bobY = this.grounded ? Math.sin(this.bob) * (0.035 - 0.015 * this.crouchT) : 0;
    this.camera.position.set(this.pos.x, EYE + (CROUCH_EYE - EYE) * this.crouchT + this.y + bobY + extraY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
