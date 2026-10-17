// Footsteps, timed off the player's head-bob phase (one step per half cycle), so they
// follow walk / sprint / crouch cadence and stop with the game clock.
import { A, gain, filt, burst, env, tone } from './core.js';

// local house coordinates -> surface
export function surfaceAt(floor, x, z) {
  if (floor === 'exterior') return 'grass';
  if (floor === 'catacombs') return (x > 43 && x < 47 && z > 128 && z < 142) ? 'water' : 'stone';
  if (floor === 'cellar') return 'stone';
  if (floor === 'attic') return 'boards';
  return 'wood';
}

let bus, lastHalf = null, wasGrounded = true;
export function initFootsteps() { bus = gain(1); bus.connect(A.sfx); }

export function step(surface, kind, t = A.ctx.currentTime) {
  const k = kind === 'crouch' ? 0.3 : kind === 'sprint' ? 1.35 : 0.8;
  const soft = kind === 'crouch' ? 0.6 : 1;
  const v = k * (0.85 + Math.random() * 0.3);
  const g = gain(0), out = g; out.connect(bus);
  if (surface === 'grass') {
    const f = filt('bandpass', 2200 * soft + Math.random() * 600, 0.7); f.connect(g); env(g, t, 0.16 * v, 0.02, 0.18); burst(f, t, 0.22);
  } else if (surface === 'water') {
    const f = filt('bandpass', 700 + Math.random() * 300, 1.2); f.connect(g); env(g, t, 0.22 * v, 0.03, 0.3); burst(f, t, 0.35);
    const o = tone(g, t + 0.05, 'sine', 350 + Math.random() * 200, 0.12); o.frequency.exponentialRampToValueAtTime(900, t + 0.15);
  } else if (surface === 'stone') {
    const f = filt('highpass', 1400 * soft, 0.8); f.connect(g); env(g, t, 0.14 * v, 0.002, 0.07); burst(f, t, 0.1);
    const th = gain(0); th.connect(bus); env(th, t, 0.12 * v, 0.003, 0.06); tone(th, t, 'sine', 110, 0.08);
  } else { // wood, boards
    const f = filt('bandpass', 380 * soft + Math.random() * 80, 1.4); f.connect(g); env(g, t, 0.24 * v, 0.004, 0.11); burst(f, t, 0.14);
    const th = gain(0); th.connect(bus); env(th, t, 0.16 * v, 0.003, 0.09); const o = tone(th, t, 'sine', 95, 0.1); o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    // loose boards complain now and then
    if (Math.random() < (surface === 'boards' ? 0.25 : 0.06) * (kind === 'crouch' ? 0.5 : 1)) {
      const c = A.ctx.createOscillator(), cg = gain(0), cf = filt('bandpass', 600, 5); c.type = 'sawtooth';
      const f0 = 140 + Math.random() * 120, d = 0.25 + Math.random() * 0.3; c.frequency.setValueAtTime(f0, t + 0.03); c.frequency.linearRampToValueAtTime(f0 * 0.75, t + d);
      cg.gain.setValueAtTime(0.0001, t); cg.gain.linearRampToValueAtTime(0.05 * v, t + 0.08); cg.gain.linearRampToValueAtTime(0.0001, t + d);
      c.connect(cf).connect(cg).connect(bus); c.start(t); c.stop(t + d + 0.05);
    }
  }
}

export function updateFootsteps(player, surface) {
  if (!bus || !player) return;
  const half = Math.floor(player.bob / Math.PI);
  const sprint = !player.crouching && !!(player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight));
  const kind = player.crouching ? 'crouch' : sprint ? 'sprint' : 'walk';
  if (lastHalf !== null && half !== lastHalf && player.moving && player.grounded) step(surface, kind);
  lastHalf = half;
  if (player.grounded && !wasGrounded) step(surface, 'sprint'); // landing from a jump
  wasGrounded = player.grounded;
}
