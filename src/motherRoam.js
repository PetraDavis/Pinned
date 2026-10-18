// The Mother below the attic: in normal play she now also comes down to the First Floor, the
// cellar and the catacombs (NEVER the ground floor). Lighter and rarer than the attic: after a
// while on a floor she arrives somewhere out of sight, prowls toward where you are for half a
// minute or so, chases if she sees or hears you, and leaves again. Long gaps between visits;
// no visits, no movement and no catching while a puzzle or other UI is open.
//
// - Paths: a 0.5 m grid of each floor built from the colliders (rebuilt now and then, as doors
//   open), routed with a breadth-first distance field toward her goal.
// - Hiding: the hiding spots of motherPlay.js (cellar pews, first-floor beds and table, the
//   catacomb biers). Under one, she does not see you, unless she watched you go under.
// - The lights gutter as she comes at someone who can see her, and she is nearer each time they
//   come back (lightsFlicker.js). A torch burst stuns her; then she leaves.
// - Together: the host runs her and sends {t:'esc', mo:2} messages; guests draw her, forward their
//   torch bursts and flicker their own lights. Busier the more of you there are (crowd()).
// - The escape chase owns her once it has begun (G.escapeOwns()): then this stays off.
import * as THREE from 'three';
import { buildMother } from './characters/mother.js';
import { burstHits, STUN_TIME } from './flashlight.js';
import { flickerEvery, flickerStep, seesHer } from './lightsFlicker.js';

export const ROAM_FLOORS = { cellar: [25, 70], first: [70, 110], catacombs: [110, 165] };
const floorOf = z => z < 25 ? 'ground' : z < 70 ? 'cellar' : z < 110 ? 'first' : z < 165 ? 'catacombs' : 'attic';
// The farther from her attic, the less she comes: the First Floor (just below it) often, the
// cellar now and then, the catacombs very rarely, the ground floor never. Seconds on that floor
// before her first visit, the gap between visits, and how long she stays (alone; more of you: sooner).
const FREQ = {
  first:     { first: 45,  gap: [60, 110],  stay: [35, 55] },
  cellar:    { first: 150, gap: [200, 320], stay: [28, 40] },
  catacombs: { first: 360, gap: [480, 720], stay: [22, 32] },
};
export { FREQ as ROAM_FREQ };
const CELL = 0.5, RAD = 0.3;

export function createMotherRoam(G) {
  const { origin: O, player, camera, say, sfx } = G;
  let model = null, api = null;
  const S = { mode: 'off', floor: null, pos: new THREE.Vector2(), yaw: 0, goal: null, visitT: 0, lost: 0, stun: 0, phase: 0, tid: null, lastSeen: null, flT: 0.6, uiT: 0, timers: {}, wait: 0 };
  const deadUntil = new Map(); let clock = 0, sendT = 0, dist = 99;
  const P = () => new THREE.Vector2(player.pos.x - O.x, player.pos.z - O.z);
  const crowd = () => { const n = Math.max(1, Math.min(4, (G.playerCount && G.playerCount()) || 1)); return (n - 1) / 3; };
  const hear = () => Math.max(0, 1 - dist / 14);
  const net = () => (G.net && G.net.active() ? G.net : null);
  const isClient = () => !!(net() && G.mpClient && G.mpClient());
  const ops = [];
  function ensureModel() {
    if (model) return;
    model = buildMother(); api = model.userData.api; model.visible = false; G.room.group.add(model);
    api.onClick = () => sfx.clicks(hear(), 2); api.onFlutter = (k) => sfx.flutter(hear() * k);
  }
  function anim(op) { ensureModel(); api[op](); if (net()) ops.push(op); }

  // moth on the hand: she is near and you have not seen her (the attic's cue, for the floors below)
  const moth = document.createElement('div');
  moth.style.cssText = 'position:fixed;left:50%;bottom:70px;width:46px;height:34px;margin-left:120px;pointer-events:none;opacity:0;transition:opacity .6s;z-index:6;background:radial-gradient(ellipse at 30% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 70% 50%,#cfc6b4 0 38%,transparent 40%),radial-gradient(ellipse at 50% 50%,#5a4a3a 0 12%,transparent 14%);filter:drop-shadow(0 2px 3px #000)';
  document.body.appendChild(moth);

  // ---------- the floor grid ----------
  const grids = {};
  function walls(f) {
    const [z0, z1] = ROAM_FLOORS[f];
    return G.colliders().filter(c => !c.minY && c.maxZ - O.z > z0 - 1 && c.minZ - O.z < z1 + 1).map(c => [c.minX - O.x, c.maxX - O.x, c.minZ - O.z, c.maxZ - O.z]);
  }
  function grid(f) {
    let g = grids[f];
    if (g && g.t > clock) return g;
    const w = walls(f), [z0, z1] = ROAM_FLOORS[f];
    let x0 = 1e9, x1 = -1e9; for (const r of w) { x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[1]); }
    if (!(x1 > x0)) { x0 = 0; x1 = CELL; } // no walls here (not in the house): an empty grid
    const nx = Math.ceil((x1 - x0) / CELL), nz = Math.ceil((z1 - z0) / CELL), free = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const cx = x0 + (i + 0.5) * CELL, cz = z0 + (j + 0.5) * CELL; let ok = true;
      for (const r of w) if (cx > r[0] - RAD && cx < r[1] + RAD && cz > r[2] - RAD && cz < r[3] + RAD) { ok = false; break; }
      free[j * nx + i] = ok ? 1 : 0;
    }
    g = grids[f] = { f, x0, z0, nx, nz, free, w, t: clock + 20, fields: new Map() };
    return g;
  }
  const cellOf = (g, v) => { const i = Math.floor((v.x - g.x0) / CELL), j = Math.floor((v.y - g.z0) / CELL); return i < 0 || j < 0 || i >= g.nx || j >= g.nz ? -1 : j * g.nx + i; };
  const cellPos = (g, c) => new THREE.Vector2(g.x0 + ((c % g.nx) + 0.5) * CELL, g.z0 + (Math.floor(c / g.nx) + 0.5) * CELL);
  function nearestFree(g, v) { let c = cellOf(g, v); if (c >= 0 && g.free[c]) return c; let best = -1, bd = 1e9; const i0 = Math.floor((v.x - g.x0) / CELL), j0 = Math.floor((v.y - g.z0) / CELL);
    for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const i = i0 + di, j = j0 + dj; if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue; const k = j * g.nx + i; if (g.free[k] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = k; } } return best; }
  // breadth-first steps from a cell to everywhere reachable (8-connected, no corner cutting)
  function field(g, from) {
    const key = from; if (g.fields.has(key)) return g.fields.get(key);
    const d = new Int16Array(g.nx * g.nz).fill(-1); if (from < 0) return d;
    const q = new Int32Array(g.nx * g.nz); let h = 0, t = 0; q[t++] = from; d[from] = 0;
    while (h < t) { const c = q[h++], i = c % g.nx, j = (c - i) / g.nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= g.nx || b >= g.nz) continue; const n = b * g.nx + a;
        if (!g.free[n] || d[n] >= 0) continue; if (di && dj && (!g.free[j * g.nx + a] || !g.free[b * g.nx + i])) continue; d[n] = d[c] + 1; q[t++] = n; } }
    if (g.fields.size > 6) g.fields.clear(); g.fields.set(key, d); return d;
  }
  function segRect(ax, az, bx, bz, x0, x1, z0, z1) {
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1 && t1 > 0.02 && t0 < 0.98;
  }
  // skip: ignore a rect that point stands in or against (furniture she or you are pressed to)
  const near = (r, q) => q && q.x > r[0] - 0.5 && q.x < r[1] + 0.5 && q.y > r[2] - 0.5 && q.y < r[3] + 0.5;
  function los(a, b, skip = null) { const g = grid(S.floor || floorOf(a.y)); for (const r of g.w) if (!near(r, skip) && segRect(a.x, a.y, b.x, b.y, r[0], r[1], r[2], r[3])) return false; return true; }

  // the next point toward goal: straight there if clear, else down the distance field
  function nextToward(goal) {
    const g = grid(S.floor), gc = nearestFree(g, goal);
    if (gc < 0) return null;
    if (S.pos.distanceTo(goal) < 9 && los(S.pos, goal)) return goal;
    const d = field(g, gc), c = nearestFree(g, S.pos); if (c < 0 || d[c] < 0) return null;
    const i = c % g.nx, j = (c - i) / g.nx; let best = c;
    // look a few cells ahead for the furthest one still in plain sight, so she does not zigzag
    let cur = c;
    for (let k = 0; k < 6; k++) { let nb = cur; const ci = cur % g.nx, cj = (cur - ci) / g.nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= g.nx || b >= g.nz) continue; const n = b * g.nx + a; if (d[n] >= 0 && d[n] < d[nb]) nb = n; }
      if (nb === cur) break; cur = nb; if (los(S.pos, cellPos(g, cur))) best = cur; }
    if (best === c && i >= 0) return d[c] === 0 ? goal : cellPos(g, cur);
    return cellPos(g, best);
  }

  // ---------- quarries: you, and (together) the others ----------
  const localQ = () => ({ id: 'h', pos: P(), torch: flashlight().on, lamp: G.lantern.on, crouch: player.crouching, moving: player.moving, sprint: !!(player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight)), hidden: !!(G.motherPlay && G.motherPlay.hidden), local: true });
  const flashlight = () => G.flashlight;
  function quarries() {
    const out = [];
    const me = localQ();
    if (!deadUntil.has('h') && G.state() === 'playing' && (!net() || !G.localAlive || G.localAlive()) && ROAM_FLOORS[floorOf(me.pos.y)]) out.push(me);
    if (net()) for (const r of net().players()) {
      if (r.zone !== 'room' || r.dd || deadUntil.has(r.id) || r.x == null) continue;
      const q = { id: r.id, pos: new THREE.Vector2(r.x - O.x, r.z - O.z), torch: !!r.f, lamp: !!r.ln, crouch: (r.crouch || 0) > 0.5, moving: !!r.mv, sprint: !!r.sp, hidden: !!r.hd, local: false };
      if (ROAM_FLOORS[floorOf(q.pos.y)] && !r.ui) out.push(q);
    }
    return out;
  }
  function sightRange(q) {
    if (q.hidden) return 0;
    let r = 6; if (q.torch) r = 9; if (q.lamp) r = 13; if (q.crouch && !q.torch && !q.lamp) r = 2.4;
    return r * (q.local && G.detectScale ? G.detectScale() : 1) * (1 + 0.3 * crowd());
  }

  // ---------- visits ----------
  function show(on) { ensureModel(); model.visible = on && floorOf(P().y) === S.floor; }
  function place() { ensureModel(); model.position.set(S.pos.x, 0, S.pos.y); model.rotation.y += (((S.yaw - model.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * 0.25; }
  function arrive(f, near) {
    const g = grid(f), pc = nearestFree(g, near.pos); if (pc < 0) return false;
    const d = field(g, pc), qs = quarries().filter(q => floorOf(q.pos.y) === f), cand = [];
    S.floor = f;
    // out of everyone's sight, 13..24 m away by her path; in a small closed-off space, as far as there is (5 m at least)
    let lo = 26, hi = 48; { let mx = 0; for (const v of d) mx = Math.max(mx, v); if (mx < lo) { lo = Math.max(10, mx - 6); hi = mx; } }
    for (let c = 0; c < d.length; c++) { if (d[c] < lo || d[c] > hi) continue; const v = cellPos(g, c); if (qs.some(q => los(q.pos, v))) continue; cand.push(c); }
    if (!cand.length) { S.floor = null; return false; }
    S.pos.copy(cellPos(g, cand[Math.floor(Math.random() * cand.length)])); S.floor = f;
    S.mode = 'patrol'; const st = FREQ[f].stay; S.visitT = (st[0] + Math.random() * (st[1] - st[0])) * (1 + 0.3 * crowd()); S.goal = null; S.tid = null; S.stun = 0; S.lost = 0; S.flT = 0.6;
    S.yaw = Math.atan2(near.pos.x - S.pos.x, near.pos.y - S.pos.y); ensureModel(); model.rotation.y = S.yaw; place(); show(true); anim('twitch'); sfx.clicks(0.35, 3);
    return true;
  }
  function leave() { S.mode = 'leave'; S.goal = null; S.tid = null; anim('fold'); }
  function gone(gap = 1) { S.mode = 'off'; if (model) model.visible = false; const G2 = FREQ[S.floor] ? FREQ[S.floor].gap : [200, 300]; S.timers[S.floor] = -(G2[0] + Math.random() * (G2[1] - G2[0])) * gap * (1 - 0.4 * crowd()); S.floor = null; }
  function catchQ(q) {
    deadUntil.set(q.id, clock + 8); gone(1.2);
    if (q.local) G.caught(); else net().toOne(q.id, { mo: 2, ev: 'caught' });
  }
  function broadcast(dt) {
    const n = net(); if (!n) { ops.length = 0; return; }
    sendT -= dt; if (sendT > 0 && !ops.length) return; sendT = 0.1;
    n.toAll({ mo: 2, ev: 'st', x: +S.pos.x.toFixed(3), z: +S.pos.y.toFixed(3), yaw: +S.yaw.toFixed(3), m: S.mode, f: S.floor, s: S.stun > 0 ? 1 : 0, op: ops.splice(0) });
  }
  function twitchStep(dt, goal, speed) {
    S.phase += dt; const moving = (S.phase % 0.6) < 0.4;
    if (!goal) return true;
    const to = nextToward(goal); if (!to) return true;
    const d = to.clone().sub(S.pos), L = d.length();
    if (S.pos.distanceTo(goal) < 0.3) return true;
    if (moving && L > 0.01) { S.pos.addScaledVector(d.normalize(), Math.min(L, speed * 1.5 * dt)); S.yaw = Math.atan2(d.x, d.y); }
    else if (!moving && Math.random() < dt * 2.5) anim('twitch');
    return false;
  }
  function randomGoal(around, r) {
    const g = grid(S.floor), c0 = nearestFree(g, S.pos); if (c0 < 0) return null; const d = field(g, c0);
    for (let k = 0; k < 40; k++) { const v = around.clone().add(new THREE.Vector2((Math.random() - 0.5) * 2 * r, (Math.random() - 0.5) * 2 * r)); const c = cellOf(g, v); if (c >= 0 && d[c] > 0) return cellPos(g, c); }
    return null;
  }
  // the lights fail while she advances on someone who can see her; in the dark, a step nearer
  const camDir = new THREE.Vector3();
  function flick() { const me = P(); if (G.flicker && floorOf(me.y) === S.floor && S.pos.distanceTo(me) < 16) G.flicker.pulse(); if (net()) ops.push('fl'); }
  function flickerApproach(dt, T, tdist) {
    S.flT -= dt;
    if (S.flT > 0 || T.hidden || tdist < 2.4) return;
    const clear = los(T.pos, S.pos), sees = T.local ? seesHer(camera.getWorldDirection(camDir), T.pos, S.pos, clear) : clear && tdist < 14;
    if (!sees) return;
    S.flT = flickerEvery(crowd()); flick();
    let D = Math.min(flickerStep(crowd()), tdist - 1.7);
    for (let k = 0; k < 4 && D > 0.05; k++) { const to = nextToward(T.pos); if (!to) break; const v = to.clone().sub(S.pos), L = v.length(); if (L < 0.01) break; const m = Math.min(L, D); S.pos.addScaledVector(v.normalize(), m); D -= m; S.yaw = Math.atan2(v.x, v.y); }
  }

  // ---------- torch bursts ----------
  function stunBy(origin, dir, range, from) {
    if (S.mode === 'off' || S.stun > 0 || floorOf(from.y) !== S.floor) return false;
    const at = new THREE.Vector3(S.pos.x + O.x, 1.6, S.pos.y + O.z);
    if (!burstHits({ origin, dir, range }, at, () => los(from, S.pos, S.pos))) return false;
    S.stun = STUN_TIME; S.mode = 'stun'; anim('fold'); anim('twitch'); sfx.flutter(1); if (sfx.shriek) sfx.shriek(1);
    const back = S.pos.clone().sub(from).setLength(1.0).add(S.pos); if (los(S.pos, back)) S.pos.copy(back);
    place(); return true;
  }
  const STUN_MSG = 'She rears back from the light, wings snapping shut over her face. Go.';
  addEventListener('flashburst', e => {
    if (G.escapeOwns && G.escapeOwns()) return;
    const d = e.detail;
    if (isClient()) { if (R.m !== 'off' && !R.s && R.f === floorOf(P().y)) net().toHost({ mo: 2, req: 'flash', o: [d.origin.x, d.origin.y, d.origin.z], d: [d.dir.x, d.dir.y, d.dir.z], r: d.range }); return; }
    if (stunBy(d.origin, d.dir, d.range, P())) { d.hit = true; say(STUN_MSG, 4000); }
  });

  // ---------- a guest: draw her where the host says ----------
  const R = { x: 0, z: 0, yaw: 0, m: 'off', f: null, s: 0, have: false };
  function guestUpdate(dt) {
    const p = P(), mine = floorOf(p.y);
    if (!R.have || R.m === 'off' || R.f !== mine) { if (model) model.visible = false; dist = 99; moth.style.opacity = 0; return; }
    ensureModel(); const tgt = new THREE.Vector2(R.x, R.z);
    if (S.pos.distanceTo(tgt) > 3) S.pos.copy(tgt); else S.pos.lerp(tgt, Math.min(1, dt * 12));
    S.yaw = R.yaw; S.floor = R.f; model.visible = true; place(); api.update(R.s ? dt * 0.3 : R.m === 'chase' ? dt * 2.5 : dt);
    dist = S.pos.distanceTo(p);
    moth.style.opacity = dist < 8 && R.m !== 'chase' && !R.s ? 1 : 0;
  }

  return {
    get mode() { return S.mode; },
    get floor() { return S.floor; },
    // for the moth swarm: metres to her when she is on your floor, 99 otherwise or while stunned
    get warnDist() {
      if (G.escapeOwns && G.escapeOwns()) return 99;
      const m = isClient() ? R.m : S.mode, f = isClient() ? R.f : S.floor, s = isClient() ? R.s : S.stun > 0;
      return (m === 'off' || s || f !== floorOf(P().y)) ? 99 : dist;
    },
    // tests: a free spot r metres (+-1) from her that she can walk to, in plain sight of her
    debugSpotNear(r) { const g = grid(S.floor), c0 = nearestFree(g, S.pos); if (c0 < 0) return null; const d = field(g, c0); let best = null, bd = 1e9;
      for (let c = 0; c < d.length; c++) { if (d[c] < 0) continue; const v = cellPos(g, c), e = Math.abs(v.distanceTo(S.pos) - r); if (e < bd && los(v, S.pos)) { bd = e; best = v; } } return best && [best.x, best.y]; },
    debugGrid(f) { const g = grid(f), me = P(), c = nearestFree(g, me), d = c >= 0 ? field(g, c) : []; let n = 0, mx = 0, free = 0; for (let i = 0; i < d.length; i++) { if (d[i] >= 0) { n++; mx = Math.max(mx, d[i]); } } for (const v of g.free) free += v; return { nx: g.nx, nz: g.nz, x0: g.x0, free, me: c, reach: n, maxSteps: mx }; },
    get debug() { return { mode: S.mode, floor: S.floor, x: S.pos.x, z: S.pos.y, dist, stun: S.stun, visitT: S.visitT, timers: { ...S.timers }, tid: S.tid, visible: !!(model && model.visible), flT: S.flT }; },
    // tests / debugging: a visit now, on the floor you are on
    debugVisit() { const q = localQ(); S.timers[floorOf(q.pos.y)] = 1e6; },
    debugPlace(x, z, mode = 'patrol') { if (!ROAM_FLOORS[floorOf(z)]) return; ensureModel(); S.floor = floorOf(z); S.pos.set(x, z); S.mode = mode; S.visitT = 60; S.stun = 0; place(); show(true); },
    reset() { S.mode = 'off'; S.floor = null; S.timers = {}; S.stun = 0; if (model) model.visible = false; deadUntil.clear(); R.have = false; R.m = 'off'; moth.style.opacity = 0; },
    onNet(from, m) {
      if (isClient()) {
        if (m.ev === 'st') {
          const p = P(), here = floorOf(p.y) === m.f;
          if (!R.s && m.s && here && new THREE.Vector2(m.x, m.z).distanceTo(p) < 15) say(STUN_MSG, 4000);
          Object.assign(R, { x: m.x, z: m.z, yaw: m.yaw, m: m.m, f: m.f, s: m.s, have: true });
          for (const op of m.op || []) {
            if (op === 'spread' || op === 'fold' || op === 'twitch') { ensureModel(); api[op](); }
            else if (op === 'fl' && here && G.flicker && new THREE.Vector2(m.x, m.z).distanceTo(p) < 16) G.flicker.pulse();
          }
        } else if (m.ev === 'caught') { if (G.state() === 'playing' || G.state() === 'paused') G.caughtMP(); }
        return;
      }
      if (m.req === 'flash' && m.o) stunBy(new THREE.Vector3(...m.o), new THREE.Vector3(...m.d), m.r, new THREE.Vector2(m.o[0] - O.x, m.o[2] - O.z));
    },
    update(dt) {
      if (G.escapeOwns && G.escapeOwns()) { if (S.mode !== 'off') { S.mode = 'off'; if (model) model.visible = false; } moth.style.opacity = 0; return; }
      if (isClient()) return guestUpdate(dt);
      const together = !!net();
      if (dt <= 0 || G.zone() !== 'room') return;
      if (!together && G.state() !== 'playing') { // a puzzle or menu is open: she waits; a long look and she is gone
        if (S.mode !== 'off' && G.state() !== 'paused') { S.uiT += dt; if (S.uiT > 2) gone(0.6); }
        return;
      }
      S.uiT = 0; clock += dt; for (const [id, until] of deadUntil) if (clock > until) deadUntil.delete(id);
      const all = quarries(), k = crowd();
      if (S.mode === 'off') {
        moth.style.opacity = 0; dist = 99;
        // time on each floor (anyone's) counts toward her next visit there
        const fl = new Set(all.map(q => floorOf(q.pos.y)));
        for (const f of fl) { S.timers[f] = (S.timers[f] ?? -FREQ[f].first) + dt * (1 + 0.5 * k); }
        for (const f of fl) if (S.timers[f] >= 0) { const q = all.filter(q => floorOf(q.pos.y) === f).sort(() => Math.random() - 0.5)[0]; if (arrive(f, q)) break; S.timers[f] = -10; }
        broadcast(dt); return;
      }
      const up = all.filter(q => floorOf(q.pos.y) === S.floor);
      if (!up.length && S.mode !== 'leave') { gone(0.5); broadcast(dt); return; }
      let T = up.find(q => q.id === S.tid) || up.slice().sort((a, b) => a.pos.distanceTo(S.pos) - b.pos.distanceTo(S.pos))[0];
      const me = P(); dist = floorOf(me.y) === S.floor ? S.pos.distanceTo(me) : 99;
      ensureModel(); model.visible = floorOf(me.y) === S.floor;
      api.update(S.mode === 'stun' ? dt * 0.3 : S.mode === 'chase' ? dt * 2.5 : dt);
      if (S.mode === 'stun') { S.stun -= dt; if (S.stun <= 0) leave(); place(); broadcast(dt); return; }
      S.visitT -= dt;
      // senses
      if (T && S.mode !== 'leave') for (const q of up) {
        const qd = S.pos.distanceTo(q.pos);
        const sawIn = S.mode === 'chase' && S.tid === q.id && qd < 3;
        if (q.hidden && !sawIn) continue;
        const see = qd < sightRange(q) && los(S.pos, q.pos), noise = q.moving && !q.crouch && qd < (q.sprint ? 7 : 3.5) * (1 + 0.3 * k);
        if (see || noise) { if (S.mode !== 'chase') { anim('spread'); anim('twitch'); sfx.flutter(hear()); } S.mode = 'chase'; S.tid = q.id; S.lastSeen = q.pos.clone(); S.lost = 0; T = q; break; }
      }
      const tdist = T ? S.pos.distanceTo(T.pos) : 99;
      if (S.mode === 'chase') {
        if (!T || T.id !== S.tid) { S.mode = 'patrol'; S.tid = null; }
        else {
          const sawIn = T.hidden && tdist < 3;
          if ((!T.hidden || sawIn) && los(S.pos, T.pos) && tdist < sightRange({ ...T, hidden: false }) + 3) { S.lastSeen = T.pos.clone(); S.lost = 0; }
          else { S.lost += dt; if (S.lost > 4 * (1 - 0.35 * k)) { S.mode = 'patrol'; S.goal = S.lastSeen; S.visitT = Math.min(S.visitT, 12); S.tid = null; anim('fold'); } }
          if (S.mode === 'chase') {
            twitchStep(dt, S.lastSeen, 2.7 * (1 + 0.18 * k));
            if (!T.hidden) flickerApproach(dt, T, S.pos.distanceTo(T.pos));
            if (S.pos.distanceTo(T.pos) < 0.8 && (!T.hidden || sawIn)) return catchQ(T);
          }
        }
      } else if (S.mode === 'patrol') {
        if (S.wait > 0) S.wait -= dt;
        else if (!S.goal || twitchStep(dt, S.goal, 1.05 * (1 + 0.18 * k))) { // on to somewhere near one of you
          S.wait = 0.8 + Math.random() * 2; if (Math.random() < 0.5) anim('twitch');
          S.goal = randomGoal(T ? T.pos : S.pos, 6);
        }
        if (S.visitT <= 0) leave();
      } else if (S.mode === 'leave') {
        if (!S.goal) { // somewhere away from all of you
          const g = grid(S.floor), c0 = nearestFree(g, S.pos), d = c0 >= 0 ? field(g, c0) : null; let best = null, bs = -1;
          if (d) for (let t = 0; t < 60; t++) { const c = Math.floor(Math.random() * d.length); if (d[c] <= 0 || d[c] > 40) continue; const v = cellPos(g, c), sc = Math.min(99, ...up.map(q => q.pos.distanceTo(v))); if (sc > bs) { bs = sc; best = v; } }
          S.goal = best || S.pos.clone();
        }
        const done = twitchStep(dt, S.goal, 1.3);
        const seen = up.some(q => !q.hidden && S.pos.distanceTo(q.pos) < 14 && los(q.pos, S.pos));
        if ((done || S.visitT < -25) && !seen) { gone(); broadcast(dt); return; }
        if (S.visitT < -40) { gone(); broadcast(dt); return; }
      }
      // never the ground floor, never off her floor
      if (floorOf(S.pos.y) !== S.floor || !ROAM_FLOORS[S.floor]) { gone(); broadcast(dt); return; }
      // together: anyone else she walks into
      if (together) for (const q of up) if (q !== T && !q.hidden && S.pos.distanceTo(q.pos) < 0.8) return catchQ(q);
      place(); broadcast(dt);
      dist = floorOf(me.y) === S.floor ? S.pos.distanceTo(me) : 99;
      moth.style.opacity = dist < 8 && !(S.mode === 'chase' && S.tid === 'h') ? 1 : 0;
    },
  };
}
