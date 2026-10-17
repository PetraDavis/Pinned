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
// Places to hide under (room-local): under = where you lie, out = where you stand to get in and
// where you come out, yaw = which way you look while under (towards the room). Every floor she
// can hunt on; the catacombs have nothing to get under. Furniture stays where it is.
const HIDE_SPOTS = [
  ...COTS.map(([x, z]) => ({ name: 'cot', under: [x, z + 0.25], out: [x, z + 1.4], yaw: Math.PI })),        // attic
  { name: 'bed', under: [47.9, 80.95], out: [48.8, 80.95], yaw: -Math.PI / 2 },                             // first floor: child's bed
  { name: 'four-poster', under: [55.2, 81.7], out: [55.2, 83.0], yaw: Math.PI },                            // Leader's Bedroom
  { name: 'table', under: [34.6, 92.6], out: [34.6, 93.8], yaw: Math.PI },                                  // library table
  ...[51.3, 55.9].map(x => ({ name: 'pew', under: [x, 49.4], out: [x, 48.75], yaw: 0 })),                  // cellar chapel, back row
];
export { HIDE_SPOTS };
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
  // more players, a busier Mother: 0 alone (exactly as before) .. 1 with four
  const crowd = () => { const n = Math.max(1, Math.min(4, (G.playerCount && G.playerCount()) || 1)); return (n - 1) / 3; };

  // moth on the hand: a small HUD moth that settles at the bottom of the screen
  const moth = document.createElement('div'); moth.id = 'motherMoth';
  moth.style.cssText = 'position:fixed;left:50%;bottom:70px;width:46px;height:34px;margin-left:120px;pointer-events:none;opacity:0;transition:opacity .6s;z-index:6;background:radial-gradient(ellipse at 30% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 70% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 50% 50%,#5a4a3a 0 12%,transparent 14%);filter:drop-shadow(0 2px 3px #000)';
  document.body.appendChild(moth);
  // hidden under a cot: a dark vignette
  const veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .4s;background:radial-gradient(ellipse at 50% 80%,rgba(0,0,0,0) 0 22%,rgba(0,0,0,.92) 60%),linear-gradient(#000 0 30%,transparent 46%)';
  document.body.appendChild(veil);

  // hiding: E on furniture to get under it (low view, vignette); E or any move key to come out
  function hideIn(h) {
    S.hidden = h.under; veil.style.opacity = 1; player.enabled = false; player.place(O.x + h.under[0], O.z + h.under[1], h.yaw); player.lowView = 1.3; // eye ~0.3 m off the floor
    S.hideOut = h.out;
    if (!inAttic(h.under[1])) return; // the escape chase decides for itself whether she saw you go in
    if (isClient()) { if (R.m === 'chase' && dist < 3) say('She saw you go under.', 2500); return; } // the host decides what she does about it
    if (S.mode === 'chase' && S.tid === 'h' && dist < 3) say('She saw you go under.', 2500); else if (S.mode === 'chase' && S.tid === 'h') { S.mode = 'search'; S.lost = 0; }
  }
  function crawlOut() { const o = S.hideOut; S.hidden = null; veil.style.opacity = 0; player.lowView = 0; player.enabled = true; if (o) player.place(O.x + o[0], O.z + o[1], player.yaw); }
  addEventListener('keydown', e => {
    if (!S.hidden || e.repeat || (G.state && G.state() !== 'playing')) return;
    if (['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.stopImmediatePropagation(); crawlOut(); }
  }, true);

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

  // a quarry: you (local) or, together, another player (from the host's view of them)
  const localQ = () => ({ id: 'h', pos: P(), torch: flashlight.on, lamp: lantern.on, crouch: player.crouching, moving: player.moving, sprint: !!(player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight)), hidden: !!S.hidden, local: true });
  function sightRange(q = localQ()) {
    if (q.hidden) return 0;
    let r = 7;
    if (q.torch) r = 10;
    if (q.lamp) r = 15;
    if (q.crouch && !q.torch && !q.lamp) r = 2.6;
    return r * (q.local && G.detectScale ? G.detectScale() : 1) * (1 + 0.3 * crowd());
  }
  function chase(q) { if (S.mode !== 'chase') { anim('spread'); sfx.flutter(hear()); anim('twitch'); } S.mode = 'chase'; S.tid = q.id; S.lastSeen = q.pos.clone(); S.lost = 0; }

  // ---- together (multiplayer): the host runs her and sends {t:'esc', mo:1} messages; guests only draw her ----
  const net = () => (G.net && G.net.active() ? G.net : null);
  const isClient = () => !!(net() && G.mpClient && G.mpClient());
  const ops = []; // her animation beats since the last message
  function anim(op) { api[op](); if (net()) ops.push(op); }
  const deadUntil = new Map(); let clock = 0, sendT = 0;
  const R = { x: pos.x, z: pos.y, yaw: 0, m: 'asleep', s: 0, have: false }; // a guest's last word from the host
  function quarries() {
    if (!net()) return [localQ()];
    const out = [];
    if (!deadUntil.has('h') && (!G.localAlive || G.localAlive())) out.push(localQ());
    for (const r of net().players()) {
      if (r.zone !== 'room' || r.dd || deadUntil.has(r.id) || r.x == null) continue;
      out.push({ id: r.id, pos: new THREE.Vector2(r.x - O.x, r.z - O.z), torch: !!r.f, lamp: !!r.ln, crouch: (r.crouch || 0) > 0.5, moving: !!r.mv, sprint: !!r.sp, hidden: !!r.hd, local: false });
    }
    return out;
  }
  function catchQ(q) {
    if (!net()) return G.caught();
    deadUntil.set(q.id, clock + 6); S.mode = 'search'; S.path = []; S.tid = null; anim('fold');
    if (q.local) G.caughtMP(); else net().toOne(q.id, { mo: 1, ev: 'caught' });
  }
  function broadcast(dt) {
    const n = net(); if (!n) { ops.length = 0; return; }
    sendT -= dt; if (sendT > 0 && !ops.length) return; sendT = 0.1;
    n.toAll({ mo: 1, ev: 'st', x: +pos.x.toFixed(3), z: +pos.y.toFixed(3), yaw: +S.yaw.toFixed(3), m: S.mode, s: S.stun > 0 ? 1 : 0, op: ops.splice(0) });
  }
  function stunBy(origin, dir, range, from) {
    if (S.mode === 'asleep' || S.stun > 0) return false;
    const m = new THREE.Vector3(anchor.position.x + O.x, 1.8, anchor.position.z + O.z), v = m.clone().sub(origin);
    if (v.length() > range || v.normalize().dot(dir) < 0.94 || !los(from, pos)) return false;
    S.stun = 3.5; S.mode = 'search'; S.path = []; anim('fold'); anim('twitch'); sfx.flutter(1);
    return true;
  }
  const STUN_MSG = 'She rears back from the light, wings snapping shut over her face. Go. Now.';

  addEventListener('flashburst', e => {
    if (G.escapeOwns && G.escapeOwns()) return;
    const d = e.detail;
    if (isClient()) { if (R.m !== 'asleep' && !R.s) net().toHost({ mo: 1, req: 'flash', o: [d.origin.x, d.origin.y, d.origin.z], d: [d.dir.x, d.dir.y, d.dir.z], r: d.range }); return; }
    if (stunBy(d.origin, d.dir, d.range, P())) say(STUN_MSG, 4000);
  });

  // a guest: draw her where the host says she is
  function guestUpdate(dt) {
    const p = P(); dist = pos.distanceTo(p);
    const here = inAttic(p.y);
    if (R.have) {
      const k = Math.min(1, dt * 12), tgt = new THREE.Vector2(R.x, R.z);
      if (pos.distanceTo(tgt) > 3) pos.copy(tgt); else pos.lerp(tgt, k);
      S.yaw = R.yaw;
    }
    api.update(R.m === 'asleep' ? 0 : R.s ? dt * 0.3 : R.m === 'chase' ? dt * 3 : dt);
    anchor.position.set(pos.x, 0, pos.y);
    anchor.rotation.y += (((S.yaw - anchor.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
    S.warnT -= dt;
    const near = here && dist < 8 && R.m !== 'chase' && R.m !== 'asleep' && !R.s;
    moth.style.opacity = near ? 1 : 0;
    if (near && S.warnT <= 0) { S.warnT = 25; say('A small, pale moth lands on the back of your hand and will not leave. She is close.', 4500); }
  }

  function step(dt, speed) { // twitchy: bursts of motion and dead stops
    if (!S.path.length) return true;
    S.phase += dt; const moving = (S.phase % 0.55) < 0.36;
    const tgt = S.path[0], d = tgt.clone().sub(pos), L = d.length();
    if (L < 0.15) { S.path.shift(); return !S.path.length; }
    if (moving) { const m = Math.min(L, speed * 1.55 * dt); pos.addScaledVector(d.normalize(), m); S.yaw = Math.atan2(d.x, d.y); }
    else if (Math.random() < dt * 3) anim('twitch');
    return false;
  }

  return {
    model, api,
    get mode() { return S.mode; }, get hidden() { return !!S.hidden; },
    debugPlace(x, z, yaw = 0) { pos.set(x, z); S.yaw = yaw; anchor.position.set(x, 0, z); anchor.rotation.y = yaw; },
    get debug() { return { ...S, x: pos.x, z: pos.y, dist }; },
    reset() { pos.set(...WP[0]); S.mode = 'asleep'; S.path = []; S.stun = 0; S.hidden = null; player.lowView = 0; S.wake = 0; S.wakeAt = 0; S.tid = null; veil.style.opacity = 0; moth.style.opacity = 0; api.setOpen(0); anchor.position.set(pos.x, 0, pos.y); deadUntil.clear(); R.have = false; R.m = 'asleep'; R.s = 0; },
    // out from under a cot without moving her (waking after being caught, together)
    unhide() { if (S.hidden) { S.hidden = null; veil.style.opacity = 0; player.lowView = 0; } },
    interactables: HIDE_SPOTS.map(h => ({
      zone: 'room', pos: new THREE.Vector3(O.x + h.out[0], 0, O.z + h.out[1]), r: 1.1, when: () => !S.hidden,
      prompt: `E  hide under the ${h.name}`,
      act: () => hideIn(h),
    })),
    // {t:'esc', mo:1} messages. from: 'h' (the host) or a guest's id
    onNet(from, m) {
      if (isClient()) {
        if (m.ev === 'st') {
          const p = P(), here = inAttic(p.y);
          if (R.m === 'asleep' && m.m !== 'asleep' && here) say('From the far end of the attic, a dry rustle, like a great deal of paper being unfolded. Then nothing.', 6000);
          if (!R.s && m.s && here && pos.distanceTo(p) < 15) say(STUN_MSG, 4000);
          Object.assign(R, { x: m.x, z: m.z, yaw: m.yaw, m: m.m, s: m.s, have: true });
          for (const op of m.op || []) if (op === 'spread' || op === 'fold' || op === 'twitch') api[op]();
        } else if (m.ev === 'caught') { if (G.state && (G.state() === 'playing' || G.state() === 'paused')) G.caughtMP(); }
        return;
      }
      if (m.req === 'flash' && m.o) stunBy(new THREE.Vector3(...m.o), new THREE.Vector3(...m.d), m.r, new THREE.Vector2(m.o[0] - O.x, m.o[2] - O.z));
    },
    update(dt) {
      if (isClient()) return guestUpdate(dt);
      const together = !!net();
      if (together ? dt <= 0 || (G.inGame && !G.inGame()) : !G.active()) return;
      clock += dt; for (const [id, until] of deadUntil) if (clock > until) deadUntil.delete(id);
      const lp = P(); dist = pos.distanceTo(lp); // you: for her sounds and the moth on your hand
      const localHere = inAttic(lp.y) && (!together || G.active());
      const all = quarries(), up = all.filter(q => inAttic(q.pos.y));
      // her quarry: the one she is after, else the nearest of you up here (alone: always you)
      let T = up.find(q => q.id === S.tid) || up.slice().sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0] || (together ? null : all[0]);
      const here = !!T && inAttic(T.pos.y);
      const p = T ? T.pos : pos.clone(), tdist = pos.distanceTo(p);
      // asleep until the hatch is unbolted, and only once one of you is up here
      if (S.mode === 'asleep') {
        if (ground.attic.clockSolved && here) { const now = performance.now() / 1000; if (!S.wakeAt) S.wakeAt = now + 5; if (now > S.wakeAt) { S.wakeAt = 0; S.mode = 'wander'; S.still = 0.3; anim('twitch'); sfx.flutter(hear()); if (localHere) say('From the far end of the attic, a dry rustle, like a great deal of paper being unfolded. Then nothing.', 6000); } }
        api.update(0); anchor.position.set(pos.x, 0, pos.y); broadcast(dt); return;
      }
      if (S.stun > 0) { S.stun -= dt; api.update(dt * 0.3); broadcast(dt); return; }
      api.update(S.mode === 'chase' ? dt * 3 : dt);
      if (T && T.hidden && S.mode === 'chase' && tdist < 3) { /* saw you go under: drags you out */ if (tdist < 1.2) return catchQ(T); }
      else if (T && !T.local && T.hidden && S.mode === 'chase' && S.tid === T.id) { S.mode = 'search'; S.lost = 0; } // a guest got under a cot unseen
      // detection: any of you up here
      for (const q of (together ? up : here ? [T] : [])) {
        const qd = pos.distanceTo(q.pos);
        if (q.hidden && !(S.mode === 'chase' && S.tid === q.id && qd < 3)) continue;
        const r = sightRange(q), see = qd < r && los(pos, q.pos);
        const ear = 1 + 0.3 * crowd(), noise = q.moving && !q.crouch && qd < (q.sprint ? 8 : 4) * ear;
        if (see || (noise && qd < 6 * ear)) { if (S.mode !== 'chase' || S.tid === q.id || !T || qd < tdist) { chase(q); if (q !== T) return; } break; }
      }
      if (S.mode !== 'chase') { const lure = up.filter(q => q.lamp && !q.hidden).sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0] || (!together && here && lantern.on && !(T.hidden) ? T : null);
        if (lure) { if (!S.target || S.target.distanceTo(lure.pos) > 2) { S.target = lure.pos.clone(); S.path = route(lure.pos); S.mode = 'lured'; } } }
      if (S.mode === 'chase') {
        if (!here) { S.mode = 'wander'; S.path = []; S.tid = null; anim('fold'); }
        else if (!T.hidden && los(pos, p) && tdist < sightRange(T) + 3) { S.lastSeen = p.clone(); S.path = [p.clone()]; S.lost = 0; }
        else { S.lost += dt; if (!S.path.length || S.lost < dt * 1.5) S.path = route(S.lastSeen); if (S.lost > 5 * (1 - 0.4 * crowd())) { S.mode = 'search'; S.tid = null; anim('fold'); } }
        step(dt, 3.1 * (1 + 0.18 * crowd()));
        if (T && tdist < 0.85 && !T.hidden) return catchQ(T);
      } else {
        const done = step(dt, (S.mode === 'lured' ? 2.2 : 1.1) * (1 + 0.18 * crowd()));
        if (done) {
          S.still -= dt;
          if (S.still <= 0) { S.still = (2 + Math.random() * 5) * (1 - 0.45 * crowd()); /* off on her rounds sooner with more of you */ S.mode = 'wander'; S.target = null; S.path = route(new THREE.Vector2(...WP[Math.floor(Math.random() * WP.length)])); }
        }
      }
      // she is the attic's alone: never below it (never the ground floor)
      if (!inAttic(pos.y)) { pos.set(...WP[nearestWp(pos)]); S.path = []; S.mode = 'wander'; S.tid = null; }
      // together: anyone else she walks into
      if (together) for (const q of up) { if (q !== T && !q.hidden && pos.distanceTo(q.pos) < 0.85) return catchQ(q); }
      anchor.position.set(pos.x, 0, pos.y);
      anchor.rotation.y += (((S.yaw - anchor.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 10);
      broadcast(dt);
      // a moth lands on you when she is near and you have not seen her yet
      dist = pos.distanceTo(lp);
      S.warnT -= dt;
      const near = localHere && dist < 8 && !(S.mode === 'chase' && S.tid === 'h');
      moth.style.opacity = near ? 1 : 0;
      if (near && S.warnT <= 0) { S.warnT = 25; say('A small, pale moth lands on the back of your hand and will not leave. She is close.', 4500); }
    },
  };
}
