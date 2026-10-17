// The Mother in play: the only monster. She sleeps in her nest until the Night Clock unbolts
// the crawl hatch, then she roams the attic (and only the attic: the ladder down is safe).
//  - She stands perfectly still, then moves in fast, twitching jerks; wings flutter, she clicks.
//  - Light is bait: a lit lantern draws her from anywhere in the attic; the torch carries further
//    than the dark. Crouching with no light makes you hard to see; under a cot you are hidden.
//  - A moth landing on you means she is close. A torch burst (B) stuns her for a few seconds.
//  - Poison (catPlay.detectScale) makes her find you sooner. If she reaches you: death, and back
//    to the last save.
import * as THREE from 'three';
import { buildMother } from './characters/mother.js';
import { ATTIC } from './world/attic.js';

// her paths through the attic (room-zone local x, z): chamber > hatch > clock room > egg store >
// shadow door > landing > the loft
const WP = [[35.6, 178.4], [37.5, 174.2], [40.5, 174.2], [43.5, 176.0], [43.5, 177.8], [43.5, 179.2], [43.5, 182.0], [46.8, 182.0], [49.2, 182.0], [53.0, 182.4], [56.0, 182.8], [53.0, 179.2], [53.0, 177.6], [51.0, 175.5], [55.5, 175.5]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [9, 11], [11, 12], [12, 13], [12, 14], [13, 14]];
const NB = WP.map(() => []); for (const [a, b] of EDGES) { NB[a].push(b); NB[b].push(a); }
const COTS = [0, 1, 2, 3].map(k => [49.6 + k * 2.1, 172.45]);
const inAttic = z => z > 170.5 && z < 186.5;

export function createMotherPlay(G) {
  const { ground, origin: O, player, camera, flashlight, lantern, say, sfx } = G;
  const anchor = ground.attic.motherAnchor;
  const model = buildMother(); anchor.add(model); const api = model.userData.api;
  api.onClick = () => sfx.clicks(hear(), 2);
  api.onFlutter = (k) => sfx.flutter(hear() * k);
  const pos = new THREE.Vector2(...WP[0]); anchor.position.set(pos.x, 0, pos.y);
  const S = { mode: 'asleep', path: [], target: null, lastSeen: null, lost: 0, still: 2, stun: 0, phase: 0, hidden: null, warnT: 0, yaw: 0, wake: 0 };
  const P = () => new THREE.Vector2(player.pos.x - O.x, player.pos.z - O.z);
  let dist = 99; const hear = () => Math.max(0, 1 - dist / 14);

  // moth on the hand: a small HUD moth that settles at the bottom of the screen
  const moth = document.createElement('div'); moth.id = 'motherMoth';
  moth.style.cssText = 'position:fixed;left:50%;bottom:70px;width:46px;height:34px;margin-left:120px;pointer-events:none;opacity:0;transition:opacity .6s;z-index:6;background:radial-gradient(ellipse at 30% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 70% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 50% 50%,#5a4a3a 0 12%,transparent 14%);filter:drop-shadow(0 2px 3px #000)';
  document.body.appendChild(moth);
  // hidden under a cot: a dark vignette
  const veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse at 50% 80%,rgba(0,0,0,0) 0 22%,rgba(0,0,0,.92) 60%),linear-gradient(#000 0 30%,transparent 46%)';
  document.body.appendChild(veil);

  // line of sight in the floor plan: blocked by any wall rect (not low headers)
  function los(a, b) {
    for (const c of G.colliders()) {
      if (c.minY) continue;
      const x0 = c.minX - O.x, x1 = c.maxX - O.x, z0 = c.minZ - O.z, z1 = c.maxZ - O.z;
      if (z1 < 170 || z0 > 187) continue;
      if (segRect(a.x, a.y, b.x, b.y, x0, x1, z0, z1)) return false;
    }
    return true;
  }
  function segRect(ax, az, bx, bz, x0, x1, z0, z1) {
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1 && t1 > 0.02 && t0 < 0.98;
  }
  const nearestWp = (v) => { let b = 0, bd = 1e9; WP.forEach((w, i) => { const d = (w[0] - v.x) ** 2 + (w[1] - v.y) ** 2; if (d < bd && los(v, new THREE.Vector2(...w))) { bd = d; b = i; } }); return b; };
  function route(to) { // BFS over waypoints, then the final leg
    const s = nearestWp(pos), e = nearestWp(to), prev = new Array(WP.length).fill(-1), q = [s]; prev[s] = s;
    while (q.length) { const n = q.shift(); if (n === e) break; for (const m of NB[n]) if (prev[m] < 0) { prev[m] = n; q.push(m); } }
    const path = []; for (let n = e; n !== s && n >= 0; n = prev[n]) path.unshift(new THREE.Vector2(...WP[n]));
    path.unshift(new THREE.Vector2(...WP[s])); path.push(to.clone()); return path;
  }

  function sightRange() {
    if (S.hidden) return 0;
    let r = 7;
    if (flashlight.on) r = 10;
    if (lantern.on) r = 15;
    if (player.crouching && !flashlight.on && !lantern.on) r = 2.6;
    return r * (G.detectScale ? G.detectScale() : 1);
  }
  function chase(p) { if (S.mode !== 'chase') { api.spread(); sfx.flutter(hear()); api.twitch(); } S.mode = 'chase'; S.lastSeen = p.clone(); S.lost = 0; }

  addEventListener('flashburst', e => {
    if (S.mode === 'asleep' || S.stun > 0) return;
    const d = e.detail, m = new THREE.Vector3(anchor.position.x + O.x, 1.8, anchor.position.z + O.z), v = m.clone().sub(d.origin);
    if (v.length() > d.range || v.normalize().dot(d.dir) < 0.94 || !los(P(), pos)) return;
    S.stun = 3.5; S.mode = 'search'; S.path = []; api.fold(); api.twitch(); sfx.flutter(1);
    say('She rears back from the light, wings snapping shut over her face. Go. Now.', 4000);
  });

  function step(dt, speed) { // twitchy: bursts of motion and dead stops
    if (!S.path.length) return true;
    S.phase += dt; const moving = (S.phase % 0.55) < 0.36;
    const tgt = S.path[0], d = tgt.clone().sub(pos), L = d.length();
    if (L < 0.15) { S.path.shift(); return !S.path.length; }
    if (moving) { const m = Math.min(L, speed * 1.55 * dt); pos.addScaledVector(d.normalize(), m); S.yaw = Math.atan2(d.x, d.y); }
    else if (Math.random() < dt * 3) api.twitch();
    return false;
  }

  return {
    model, api,
    get mode() { return S.mode; }, get hidden() { return !!S.hidden; },
    debugPlace(x, z, yaw = 0) { pos.set(x, z); S.yaw = yaw; anchor.position.set(x, 0, z); anchor.rotation.y = yaw; },
    get debug() { return { ...S, x: pos.x, z: pos.y, dist }; },
    reset() { pos.set(...WP[0]); S.mode = 'asleep'; S.path = []; S.stun = 0; S.hidden = null; S.wake = 0; S.wakeAt = 0; veil.style.opacity = 0; moth.style.opacity = 0; api.setOpen(0); anchor.position.set(pos.x, 0, pos.y); },
    interactables: COTS.map(([x, z]) => ({
      zone: 'room', pos: new THREE.Vector3(O.x + x, 0, O.z + z + 1.3), r: 1.1,
      prompt: () => S.hidden ? 'E  crawl out' : 'E  hide under the cot',
      act: () => {
        if (S.hidden) { S.hidden = null; veil.style.opacity = 0; player.enabled = true; player.place(O.x + x, O.z + z + 1.4, player.yaw); return; }
        S.hidden = [x, z]; veil.style.opacity = 1; player.enabled = false; player.place(O.x + x, O.z + z + 1.15, Math.PI);
        if (S.mode === 'chase' && dist < 3) say('She saw you go under.', 2500); else if (S.mode === 'chase') { S.mode = 'search'; S.lost = 0; }
      },
    })),
    update(dt) {
      if (!G.active()) return;
      const p = P(); dist = pos.distanceTo(p);
      const here = inAttic(p.y);
      // asleep until the hatch is unbolted, and only once the player is up here
      if (S.mode === 'asleep') {
        if (ground.attic.clockSolved && here) { const now = performance.now() / 1000; if (!S.wakeAt) S.wakeAt = now + 5; if (now > S.wakeAt) { S.wakeAt = 0; S.mode = 'wander'; S.still = 0.3; api.twitch(); sfx.flutter(hear()); say('From the far end of the attic, a dry rustle, like a great deal of paper being unfolded. Then nothing.', 6000); } }
        api.update(0); anchor.position.set(pos.x, 0, pos.y); return;
      }
      if (S.stun > 0) { S.stun -= dt; api.update(dt * 0.3); return; }
      api.update(S.mode === 'chase' ? dt * 3 : dt);
      if (S.hidden && S.mode === 'chase' && dist < 3) { /* saw you go under: drags you out */ if (dist < 1.2) return G.caught(); }
      // detection
      if (here && !(S.hidden && !(S.mode === 'chase' && dist < 3))) {
        const r = sightRange(), see = dist < r && los(pos, p);
        const noise = player.moving && !player.crouching && dist < (player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight) ? 8 : 4);
        if (see || (noise && dist < 6)) chase(p);
        else if (lantern.on && S.mode !== 'chase') { if (!S.target || S.target.distanceTo(p) > 2) { S.target = p.clone(); S.path = route(p); S.mode = 'lured'; } }
      }
      if (S.mode === 'chase') {
        if (!here) { S.mode = 'wander'; S.path = []; api.fold(); }
        else if (!S.hidden && los(pos, p) && dist < sightRange() + 3) { S.lastSeen = p.clone(); S.path = [p.clone()]; S.lost = 0; }
        else { S.lost += dt; if (!S.path.length || S.lost < dt * 1.5) S.path = route(S.lastSeen); if (S.lost > 5) { S.mode = 'search'; api.fold(); } }
        step(dt, 3.1);
        if (dist < 0.85 && !S.hidden) return G.caught();
      } else {
        const done = step(dt, S.mode === 'lured' ? 2.2 : 1.1);
        if (done) {
          S.still -= dt;
          if (S.still <= 0) { S.still = 2 + Math.random() * 5; S.mode = 'wander'; S.target = null; S.path = route(new THREE.Vector2(...WP[Math.floor(Math.random() * WP.length)])); }
        }
      }
      anchor.position.set(pos.x, 0, pos.y);
      anchor.rotation.y += (((S.yaw - anchor.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
      // a moth lands on you when she is near and you have not seen her yet
      S.warnT -= dt;
      const near = here && dist < 8 && S.mode !== 'chase';
      moth.style.opacity = near ? 1 : 0;
      if (near && S.warnT <= 0) { S.warnT = 25; say('A small, pale moth lands on the back of your hand and will not leave. She is close.', 4500); }
    },
  };
}
