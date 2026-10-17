// The escape: the finale chase. Taking the iron key from her nest wakes The Mother for good,
// and she hunts you down through the house: ladder D to the First Floor, back stair B into
// the Catacombs, and out through the sealed tunnel in the Bone Gallery, which her key opens.
//
// She only ever exists on the floor you are on. When you change floors she is gone for a few
// seconds, then comes down after you at the place you arrived (behind you), and twice she is
// suddenly ahead of you instead. Between floors she follows your trail (breadcrumbs of where
// you walked, so she never needs a map), and goes straight at you when she can see you.
//  - Light is bait: with the torch or lantern on she always knows where you are, and is faster.
//  - In the dark, out of her sight, crouched or keeping still, she loses you: she searches
//    where she lost you, then withdraws, and comes back on your trail a little later.
//  - A torch burst (B) stuns her. Being caught is death, back to the 'escape' save at the top
//    of the ladder.
// Tension beats: cocoons burst, moths swarm, doors slam.
// main.js wires this in with a few small hooks (createEscape, interactables, update, reset).
import * as THREE from 'three';
import { buildMother } from './characters/mother.js';
import { ATTIC } from './world/attic.js';
import { CATA } from './world/catacombs.js';
import { FIRST } from './world/lowerUpper.js';

const floorOf = z => z < 25 ? 'ground' : z < 70 ? 'cellar' : z < 110 ? 'first' : z < 165 ? 'catacombs' : 'attic';
const KEY_POS = new THREE.Vector3(34.85, 0.7, 178.0);      // on the lip of her nest (room-local)
const KEY_SPOT = new THREE.Vector3(35.45, 0, 178.0);
const DROP_POS = new THREE.Vector2(33.4, 178.4);            // she unfolds out of the rafters above the nest
const LADDER_TOP = { x: ATTIC.spawn.x, z: ATTIC.spawn.z, yaw: Math.PI / 2 };
const RELOAD_START = new THREE.Vector2(43.5, 182.0);        // after a death: she comes out of the egg store
const TUNNEL_DOOR = new THREE.Vector3(30.2, 0, 125.0);
const TUNNEL_END_X = 25.6;                                  // walk this far into the tunnel: the ending
const ARRIVE_DELAY = { first: 5.5, catacombs: 6.5, attic: 4, cellar: 6, ground: 6 };
const STEP_DUTY = 0.65; // she moves in jerks: moving 65% of the time

// ---------- a swarm of small pale moths (one instanced mesh) ----------
function mothSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#d8cfbe';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(32, 30); g.quadraticCurveTo(32 + s * 30, 6, 32 + s * 28, 30); g.quadraticCurveTo(32 + s * 22, 50, 32, 36); g.fill(); }
  g.fillStyle = '#6a5a48'; g.beginPath(); g.ellipse(32, 34, 3, 10, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function createSwarms(parent) {
  const N = 90, geo = new THREE.PlaneGeometry(0.07, 0.07);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: mothSprite(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x9a948a }), N);
  mesh.frustumCulled = false; mesh.visible = false; mesh.userData.noAO = true; parent.add(mesh);
  const ms = Array.from({ length: N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), ph: Math.random() * 6 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let next = 0, live = 0;
  return {
    // n moths from a point (room-local), drifting towards `toward` (optional)
    burst(at, n = 30, toward = null) {
      for (let i = 0; i < n; i++) {
        const m = ms[next]; next = (next + 1) % N;
        m.life = 2.5 + Math.random() * 2; m.p.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        m.v.set((Math.random() - 0.5) * 3, Math.random() * 1.6, (Math.random() - 0.5) * 3);
        if (toward) m.v.add(toward.clone().sub(at).setY(0).normalize().multiplyScalar(2.2 + Math.random() * 1.5));
      }
      mesh.visible = true;
    },
    update(dt, t, cam) {
      if (!mesh.visible) return;
      live = 0;
      for (let i = 0; i < N; i++) {
        const m = ms[i];
        if (m.life <= 0) { mesh.setMatrixAt(i, zero); continue; }
        live++; m.life -= dt;
        m.v.x += (Math.random() - 0.5) * dt * 14; m.v.y += (Math.random() - 0.5) * dt * 12 - dt * 0.4; m.v.z += (Math.random() - 0.5) * dt * 14;
        m.v.multiplyScalar(1 - dt * 0.8); m.p.addScaledVector(m.v, dt); if (m.p.y < 0.2) m.v.y = Math.abs(m.v.y);
        const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 34 + m.ph)), fade = Math.min(1, m.life * 1.5);
        e.set(-0.4 + Math.sin(t * 9 + m.ph) * 0.5, Math.atan2(m.v.x, m.v.z), 0); q.setFromEuler(e);
        m4.compose(m.p, q, sc.set(flap * fade, fade, 1)); mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (!live) mesh.visible = false;
    },
    clear() { for (const m of ms) m.life = 0; mesh.visible = false; },
  };
}

// G: { room, ground, origin, player, camera, flashlight, lantern, say, sfx: {flutter, clicks, thud, creak, grind, glass, softClicks},
//      colliders(), active(), visited(), save(cp), caught(), motherPlay, mpClient(), onEnd() }
export function createEscape(G) {
  const { room, ground, origin: O, player, flashlight, lantern, say, sfx } = G;
  const cat = ground.cat, group = room.group;
  const local = () => new THREE.Vector2(player.pos.x - O.x, player.pos.z - O.z);

  // ---------- the key in her nest (attic section, so it is only drawn up there) ----------
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x4a4038, metalness: 0.85, roughness: 0.45, emissive: 0x1a1208 });
  const key = new THREE.Group();
  { const bow = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 16), keyMat); bow.position.x = -0.08; key.add(bow);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 6), keyMat); shank.rotation.z = Math.PI / 2; shank.position.x = 0.02; key.add(shank);
    for (const [x, h] of [[0.08, 0.035], [0.06, 0.025]]) { const bit = new THREE.Mesh(new THREE.BoxGeometry(0.012, h, 0.006), keyMat); bit.position.set(x, -h / 2, 0); key.add(bit); }
    const silkLoop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.004, 4, 20), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 1 })); silkLoop.position.x = -0.12; silkLoop.rotation.y = 1.2; key.add(silkLoop); }
  key.position.copy(KEY_POS); key.rotation.set(-1.35, 0.4, 0);
  (ground.attic.motherAnchor.parent || group).add(key);

  // ---------- the tunnel beyond the bricks (catacombs section) ----------
  const catSection = cat.tunnelDoor.parent || group;
  const tunnel = new THREE.Group(); catSection.add(tunnel);
  {
    const stone = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.95 });
    const earth = new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 1 });
    const L = 11.4, cx = 27.4 - L / 2;
    const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.receiveShadow = true; tunnel.add(me); return me; };
    add(new THREE.BoxGeometry(L, 0.06, 1.8), earth, cx, -0.03, 125.0);
    add(new THREE.BoxGeometry(L, 0.2, 2.2), stone, cx, 2.3, 125.0);
    add(new THREE.BoxGeometry(L, 2.4, 0.2), stone, cx, 1.2, 124.0);
    add(new THREE.BoxGeometry(L, 2.4, 0.2), stone, cx, 1.2, 126.0);
    add(new THREE.BoxGeometry(0.2, 2.4, 2.0), stone, 27.4 - L, 1.2, 125.0);
    // far off, a cold grey light: night air
    const glow = add(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshBasicMaterial({ color: 0x8890a8, transparent: true, opacity: 0.0, depthWrite: false, fog: false }), 27.4 - L + 0.15, 1.0, 125.0);
    glow.rotation.y = Math.PI / 2; tunnel.userData.glow = glow;
    for (const c of [[16, 27.45, 123.85, 124.1], [16, 27.45, 125.9, 126.15], [15.8, 16.05, 123.8, 126.2]])
      room.colliders.push({ minX: c[0] + O.x, maxX: c[1] + O.x, minZ: c[2] + O.z, maxZ: c[3] + O.z });
  }
  const tunnelCol = room.colliders.find(c => c.door === 'catTunnel');
  // falling bricks when the wall gives way
  const brickMat = (cat.tunnelBricks.children[0] && cat.tunnelBricks.children[0].material) || new THREE.MeshStandardMaterial({ color: 0x6a4a3c });
  const NB = 26, bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.09, 0.11), brickMat, NB); bricks.visible = false; bricks.frustumCulled = false; catSection.add(bricks);
  const bk = Array.from({ length: NB }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
  let tunnelAnim = -1; // <0 sealed; 0..: opening; done at >2
  const doorHome = cat.tunnelDoor.position.clone();

  // ---------- The Mother, as she hunts (her own model, so it can follow you to any floor) ----------
  let model = null, api = null;
  function ensureModel() {
    if (model) return;
    model = buildMother(); api = model.userData.api; model.visible = false; group.add(model);
    api.onClick = () => sfx.clicks(hear(), 2); api.onFlutter = (k) => sfx.flutter(hear() * k);
  }
  const swarms = createSwarms(group);
  const S = { on: false, mode: 'off', floor: null, pos: new THREE.Vector2(), yaw: 0, y: 0, crumbs: [], ci: 0, maxCi: Infinity, knows: true, lost: 0, stun: 0, t: 0,
    search: null, searchT: 0, goneT: 0, arrive: null, arriveT: 0, beats: {}, slowT: 0, told: {} };
  let dist = 99; const hear = () => Math.max(0, 1 - dist / 16);

  // ---------- line of sight in the floor plan (walls only, not low headers) ----------
  let wallCache = null, wallCacheT = 0, wallFloor = null;
  const zRange = { ground: [-40, 25], cellar: [25, 70], first: [70, 110], catacombs: [110, 165], attic: [165, 200] };
  function walls() {
    if (wallCache && wallFloor === S.floor && wallCacheT > 0) return wallCache;
    const [z0, z1] = zRange[S.floor] || [-1e9, 1e9];
    wallCache = G.colliders().filter(c => !c.minY && c.maxZ - O.z > z0 && c.minZ - O.z < z1).map(c => [c.minX - O.x, c.maxX - O.x, c.minZ - O.z, c.maxZ - O.z]);
    wallFloor = S.floor; wallCacheT = 1; return wallCache;
  }
  function segRect(ax, az, bx, bz, x0, x1, z0, z1) {
    let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1 && t1 > 0.02 && t0 < 0.98;
  }
  const los = (a, b) => { for (const w of walls()) if (segRect(a.x, a.y, b.x, b.y, w[0], w[1], w[2], w[3])) return false; return true; };
  const freeAt = (p, r = 0.45) => { for (const w of walls()) if (p.x > w[0] - r && p.x < w[1] + r && p.y > w[2] - r && p.y < w[3] + r) return false; return true; };
  const lowAt = (p) => { for (const c of G.colliders()) if (c.minY !== undefined && c.minY < 2.3 && p.x + O.x > c.minX - 0.4 && p.x + O.x < c.maxX + 0.4 && p.y + O.z > c.minZ - 0.4 && p.y + O.z < c.maxZ + 0.4) return true; return false; };
  // keep her out of walls when she goes straight at you
  function pushOut(p, r = 0.3) {
    for (const w of walls()) {
      const cx = Math.max(w[0], Math.min(p.x, w[1])), cz = Math.max(w[2], Math.min(p.y, w[3])), dx = p.x - cx, dz = p.y - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += dx / d * (r - d); p.y += dz / d * (r - d); } }
    }
  }

  const lit = () => flashlight.on || lantern.on;
  const sprinting = () => player.moving && !player.crouching && player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight);
  const hiddenNow = () => (G.motherPlay && G.motherPlay.hidden) || (!lit() && player.crouching);

  function show(on) { ensureModel(); model.visible = on; }
  function placeModel() { model.position.set(S.pos.x, S.y, S.pos.y); model.rotation.y += (((S.yaw - model.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * 0.25; }
  function appear(at, mode = 'hunt', msg = null) {
    ensureModel(); S.pos.copy(at); S.y = 0; S.mode = mode; S.knows = true; S.lost = 0; S.maxCi = Infinity; S.stun = 0;
    let bi = 0, bd = 1e9; S.crumbs.forEach((c, i) => { const d = c.distanceToSquared(at); if (d < bd) { bd = d; bi = i; } }); S.ci = bi;
    const p = local(); S.yaw = Math.atan2(p.x - at.x, p.y - at.y); model.rotation.y = S.yaw;
    show(true); api.spread(); api.twitch(); sfx.flutter(1); sfx.clicks(1, 5); if (msg) say(msg, 4500);
  }
  function slam(msg) { sfx.thud(); setTimeout(() => sfx.thud(), 90); sfx.creak(); shake = 0.5; if (msg) say(msg, 4000); }
  let shake = 0;

  // a point off to one side, ahead of you on the way to `goal`, that she can be standing on
  function aheadPoint(goal, minD = 4, maxD = 7) {
    const p = local();
    for (let k = 0; k < 160; k++) {
      const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD), c = new THREE.Vector2(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      if (floorOf(c.y) !== S.floor || !freeAt(c, 0.55) || !los(c, p)) continue;
      if (c.distanceTo(goal) > p.distanceTo(goal) - 1) continue;          // ahead of you
      const seg = goal.clone().sub(p), t = Math.max(0, Math.min(1, c.clone().sub(p).dot(seg) / seg.lengthSq())), off = p.clone().addScaledVector(seg, t).distanceTo(c);
      if (off < 1.6) continue;                                             // never right in the way
      if (c.distanceTo(goal) < 2.2) continue;
      return c;
    }
    return null;
  }

  // ---------- beats ----------
  function burstCocoon(x, z, toward = true) {
    const at = new THREE.Vector3(x, 1.2, z); swarms.burst(at, 26, toward ? new THREE.Vector3(player.pos.x - O.x, 1.4, player.pos.z - O.z) : null);
    sfx.softClicks(6); sfx.flutter(0.8); sfx.glass && sfx.glass();
  }
  function floorBeats(p) {
    const f = S.floor;
    if (f === 'attic' && !S.beats.atticCocoons && S.t > 1.2) { S.beats.atticCocoons = true; burstCocoon(34.2, 174.6); burstCocoon(33.4, 181.8, false); }
    if (f === 'attic' && !S.beats.atticSlam && p.x > 43 && p.y > 179) { S.beats.atticSlam = true; slam(); swarms.burst(new THREE.Vector3(47, 2.4, 181), 20, new THREE.Vector3(p.x, 1.4, p.y)); }
    if (f === 'first' && !S.beats.firstSlam && S.floorT > 1.0) { S.beats.firstSlam = true; slam('Somewhere on this floor a door slams, and keeps on rattling in its frame.'); swarms.burst(new THREE.Vector3(p.x - 1.5, 2.6, p.y), 30, new THREE.Vector3(p.x, 1.4, p.y)); }
    if (f === 'first' && !S.beats.firstAhead && S.mode === 'hunt' && dist > 7 && p.distanceTo(new THREE.Vector2(FIRST.stairB.x, FIRST.stairB.z)) < 13) {
      const c = aheadPoint(new THREE.Vector2(FIRST.stairB.x, FIRST.stairB.z));
      if (c) { S.beats.firstAhead = true; appear(c, 'glimpse', 'She is ahead of you. How is she ahead of you?'); S.glimpseT = 1.6; }
    }
    if (f === 'first' && !S.beats.firstCocoon && S.beats.firstAhead && S.mode === 'hunt') { S.beats.firstCocoon = true; burstCocoon(p.x + 1.2, p.y + 0.6); }
    if (f === 'catacombs' && !S.beats.cataSwarm && S.floorT > 0.8) { S.beats.cataSwarm = true; slam(); swarms.burst(new THREE.Vector3(CATA.stairB.x, 2.3, CATA.stairB.z - 0.6), 40, new THREE.Vector3(p.x, 1.4, p.y)); }
    if (f === 'catacombs' && !S.beats.cataAhead && S.mode === 'hunt' && dist > 7 && p.y < 133 && p.x < 47) {
      const c = aheadPoint(new THREE.Vector2(TUNNEL_DOOR.x, TUNNEL_DOOR.z), 4.5, 8);
      if (c) { S.beats.cataAhead = true; appear(c, 'glimpse', null); S.glimpseT = 1.4; burstCocoon(36.4, 120.3); }
    }
  }

  // ---------- the tunnel door ----------
  function openTunnel() {
    if (tunnelAnim >= 0) return;
    tunnelAnim = 0; sfx.creak(); sfx.thud();
    say('Her key turns. The chain slithers off and the door falls in, and the bricks behind it go with it, rotten, into the dark. Cold air. Night air.', 7000);
    const r = Math.random;
    bk.forEach((b, i) => { b.p.set(27.6 + (r() - 0.5) * 0.2, 0.2 + (i % 13) * 0.16, 124.4 + r() * 1.2); b.v.set(-0.8 - r() * 1.6, r() * 0.6, (r() - 0.5) * 0.8); b.r.set(r() * 3, r() * 3, r() * 3); b.w.set((r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8); });
    bricks.visible = true; cat.tunnelBricks.visible = false;
  }
  function tunnelUpdate(dt) {
    if (tunnelAnim < 0 || tunnelAnim > 3) return;
    tunnelAnim += dt;
    const d = cat.tunnelDoor, k = Math.min(1, tunnelAnim / 0.9);
    // the door tips over backwards onto the floor of the tunnel, pivoting on its foot
    const ang = k * k * 1.45, piv = new THREE.Vector3(28.95, 0, 125.0);
    d.rotation.z = ang; d.position.copy(doorHome).sub(piv).applyAxisAngle(new THREE.Vector3(0, 0, 1), ang).add(piv);
    if (tunnelAnim > 0.9 && !S.told.doorDown) { S.told.doorDown = true; sfx.thud(); sfx.grind(); const i = room.colliders.indexOf(tunnelCol); if (i >= 0) room.colliders.splice(i, 1); wallCacheT = 0; shake = 0.4; }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < NB; i++) { const b = bk[i]; if (b.p.y > 0.05) { b.v.y -= 9.8 * dt; b.p.addScaledVector(b.v, dt); b.r.x += b.w.x * dt; b.r.z += b.w.z * dt; } else { b.p.y = 0.045; b.v.set(0, 0, 0); }
      q.setFromEuler(b.r); m4.compose(b.p, q, one); bricks.setMatrixAt(i, m4); }
    bricks.instanceMatrix.needsUpdate = true;
    tunnel.userData.glow.material.opacity = Math.min(0.55, tunnelAnim * 0.3);
  }
  function resetTunnel() {
    tunnelAnim = -1; cat.tunnelDoor.position.copy(doorHome); cat.tunnelDoor.rotation.set(0, 0, 0); cat.tunnelBricks.visible = true; bricks.visible = false;
    if (tunnelCol && !room.colliders.includes(tunnelCol)) room.colliders.push(tunnelCol);
    tunnel.userData.glow.material.opacity = 0; S.told.doorDown = false;
  }

  // ---------- start / stop ----------
  let ended = false;
  function begin(fromSave) {
    ensureModel(); swarms.clear();
    S.on = true; S.t = 0; S.beats = {}; S.told = {}; S.crumbs = []; S.ci = 0; S.stun = 0; S.floor = floorOf(local().y); S.floorT = 0; ended = false;
    key.visible = false;
    if (G.motherPlay) { G.motherPlay.reset && G.motherPlay.reset(); if (G.motherPlay.model) G.motherPlay.model.visible = false; }
    if (fromSave) {
      S.mode = 'away'; S.arrive = RELOAD_START.clone(); S.arriveT = 2.2; show(false); S.beats.atticCocoons = true;
    } else {
      S.mode = 'wake'; S.pos.copy(DROP_POS); S.y = 2.9; S.wakeT = 0; const p = local(); S.yaw = Math.atan2(p.x - S.pos.x, p.y - S.pos.y); model.rotation.y = S.yaw; show(true); api.setOpen(0);
    }
  }
  function takeKey() {
    if (S.on) return;
    sfx.clicks(0.6, 2);
    say('You work the key free of the silk. The silk is warm. Above you, in the dark of the rafters, something very large lets go.', 6000);
    G.visited().escape = true; G.save('escape');
    begin(false);
  }

  const interactables = [
    { zone: 'room', pos: KEY_SPOT.clone().add(O), r: 0.95, when: () => !S.on && !G.visited().escape && !!G.visited().chamber && !(G.mpClient && G.mpClient()),
      prompt: 'E  take the iron key from the nest', act: takeKey },
    { zone: 'room', pos: TUNNEL_DOOR.clone().add(O), r: 1.4, when: () => S.on && tunnelAnim < 0, prompt: 'E  open the chains with her key', act: openTunnel },
  ];

  const self = {
    interactables,
    get running() { return S.on; },
    get ownsMother() { return S.on || !!G.visited().escape; },
    get chasing() { return S.on; },
    get debug() { return { mode: S.mode, floor: S.floor, x: S.pos.x, z: S.pos.y, dist, knows: S.knows, crumbs: S.crumbs.length, ci: S.ci, beats: { ...S.beats }, tunnel: tunnelAnim, stun: S.stun }; },
    begin, openTunnel,
    // tests / debugging: straight to the ending
    endNow() { ended = true; S.on = false; if (model) model.visible = false; G.onEnd(); },
    spawn() { return LADDER_TOP; },
    // from spawnAt(): every load resets the chase; the 'escape' save restarts it at the ladder
    reset(checkpoint, visited) {
      S.on = false; S.mode = 'off'; swarms.clear(); resetTunnel(); if (model) model.visible = false; ended = false;
      key.visible = !(visited && visited.escape);
      if (G.motherPlay && G.motherPlay.model) G.motherPlay.model.visible = !(visited && visited.escape);
      if (checkpoint === 'escape') { player.place(O.x + LADDER_TOP.x, O.z + LADDER_TOP.z, LADDER_TOP.yaw); begin(true); }
    },
    update(dt, t) {
      swarms.update(dt, t);
      if (shake > 0 && dt > 0) { shake -= dt; player.pitch += (Math.random() - 0.5) * shake * 0.03; }
      if (!S.on) return;
      tunnelUpdate(dt);
      if (!G.active() || dt <= 0) { if (model && model.visible) api.update(0); return; }
      S.t += dt; wallCacheT -= dt;
      const p = local(); const f = floorOf(p.y);
      // the ending: far enough into the tunnel
      if (tunnelAnim > 0.9 && p.x < TUNNEL_END_X && Math.abs(p.y - 125) < 1.2 && !ended) { ended = true; S.on = false; if (model) model.visible = false; G.onEnd(); return; }
      // breadcrumbs: where you walked on this floor
      if (f !== S.floor) {
        S.floor = f; S.floorT = 0; S.crumbs = [p.clone()]; S.ci = 0; wallCacheT = 0;
        if (S.mode !== 'wake') { S.mode = 'away'; S.arrive = p.clone(); S.arriveT = ARRIVE_DELAY[f] || 6; show(false); }
      } else { S.floorT += dt; const last = S.crumbs[S.crumbs.length - 1]; if (!last || last.distanceTo(p) > 0.4) S.crumbs.push(p.clone()); if (S.crumbs.length > 1500) { S.crumbs.splice(0, 500); S.ci = Math.max(0, S.ci - 500); if (S.maxCi !== Infinity) S.maxCi = Math.max(0, S.maxCi - 500); } }
      floorBeats(p);
      dist = S.pos.distanceTo(p);
      if (model.visible) api.update(S.mode === 'hunt' ? dt * 2.5 : dt);

      // ---- modes ----
      if (S.mode === 'away') {
        S.arriveT -= dt;
        const far = p.distanceTo(S.arrive);
        if (S.arriveT <= 0 && (far > 3.5 || S.arriveT < -8)) {
          appear(S.arrive, 'hunt', S.told[f] ? null : ({ first: 'Above you, the ladder creaks under a weight that is not yours. She is coming down after you.', catacombs: 'Up the stair, the dry rustle of wings, folding to fit. She is coming down.', attic: 'Behind you, from the egg store: a click, and then another.' })[f]);
          S.told[f] = true;
        }
        return;
      }
      if (S.mode === 'wake') {
        S.wakeT += dt; S.y = Math.max(0, 2.9 - S.wakeT * 2.2); placeModel();
        if (S.wakeT > 0.5 && !S.told.wake) { S.told.wake = true; api.spread(); api.twitch(); sfx.flutter(1); sfx.clicks(1, 8); }
        if (S.wakeT > 4.0) { S.stiff = 7; S.mode = 'hunt'; S.knows = true; say('Run. Light draws her; the dark hides you. A torch burst (B) will drive her back.', 6000); }
        return;
      }
      if (S.mode === 'gone') { S.goneT -= dt; if (S.goneT <= 0) { // back on your trail, some way behind you
          let i = S.crumbs.length - 1, acc = 0; while (i > 0 && acc < 11) { acc += S.crumbs[i].distanceTo(S.crumbs[i - 1]); i--; }
          appear(S.crumbs[i].clone(), 'hunt'); S.knows = lit(); S.maxCi = Infinity; S.prowl = !lit();
        } return; }
      if (S.stun > 0) { S.stun -= dt; placeModel(); return; }
      if (S.mode === 'glimpse') { S.glimpseT -= dt; S.yaw = Math.atan2(p.x - S.pos.x, p.y - S.pos.y); placeModel(); if (S.glimpseT <= 0) { S.mode = 'hunt'; S.knows = true; } if (dist < 0.85) return G.caught(); return; }

      // ---- senses ----
      const hidden = hiddenNow();
      const sightR = hidden ? 1.4 : lit() ? 16 : player.crouching ? 2.6 : 6.5;
      const see = dist < sightR && los(S.pos, p);
      const noise = player.moving && !player.crouching && dist < (sprinting() ? 9 : 4.5);
      if (see || noise || (lit() && dist < 24)) { if (!S.knows && S.mode === 'search') { api.spread(); sfx.flutter(1); } S.knows = true; S.lost = 0; S.maxCi = Infinity; S.prowl = false; if (S.mode === 'search') S.mode = 'hunt'; }
      else if (S.knows) { S.lost += dt; if (S.lost > 1.6) { S.knows = false; S.maxCi = Math.max(S.ci, S.crumbs.length - 5); } }

      // ---- movement ----
      S.phase = (S.phase || 0) + dt; const moving = (S.phase % 0.55) < 0.55 * STEP_DUTY;
      let tgt = null, speed = 0;
      if (S.mode === 'hunt') {
        if (see && dist < 9) { tgt = p; speed = lit() ? 3.3 : 2.9; // straight at you; keep her place on the trail
          for (let i = S.ci; i < S.crumbs.length; i++) if (S.crumbs[i].distanceTo(S.pos) < 0.8) S.ci = i; }
        else {
          const lim = Math.min(S.crumbs.length - 1, S.maxCi);
          while (S.ci < lim && S.crumbs[S.ci].distanceTo(S.pos) < 0.25) S.ci++;
          tgt = S.crumbs[Math.min(S.ci, lim)]; speed = S.prowl ? 1.8 : lit() ? 3.0 : 2.5;
          if (!S.knows && S.ci >= lim && tgt && tgt.distanceTo(S.pos) < 0.3) { S.mode = 'search'; S.searchT = 7 + Math.random() * 3; S.search = null; api.fold(); sfx.clicks(hear(), 3); }
        }
      } else if (S.mode === 'search') {
        S.searchT -= dt;
        if (!S.search || S.search.distanceTo(S.pos) < 0.25 || S.searchWait > 0) {
          if (S.search && S.search.distanceTo(S.pos) < 0.25 && !(S.searchWait > 0)) { S.searchWait = 0.8 + Math.random() * 1.4; if (Math.random() < 0.5) api.twitch(); }
          if (S.searchWait > 0) S.searchWait -= dt;
          if (!(S.searchWait > 0)) {
            const base = S.crumbs[Math.min(S.ci, S.crumbs.length - 1)] || S.pos;
            for (let k = 0; k < 30; k++) { const c = base.clone().add(new THREE.Vector2((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)); if (!freeAt(c, 0.4) || !los(S.pos, c)) continue;
              if (hidden && c.distanceTo(p) < 1.35) c.sub(p).setLength(1.4).add(p); // she comes close, sniffs, and passes on
              S.search = c; break; }
          }
        }
        tgt = S.searchWait > 0 ? null : S.search; speed = 1.2;
        if (S.searchT <= 0) { S.mode = 'gone'; S.goneT = 8 + Math.random() * 4; show(false); if (!S.told.hid) { S.told.hid = true; say('The clicking moves off, and stops. She has lost you. For now.', 4500); } }
      }
      // under a low header (the crawl hatch, a low arch) she has to fold herself small: slow
      if (lowAt(S.pos)) speed *= 0.3;
      if (S.stiff > 0) { S.stiff -= dt; speed *= 0.55; } // just woken: stiff, unfolding, slow
      if (tgt && moving) {
        const d = tgt.clone().sub(S.pos), L = d.length();
        if (L > 0.01) { S.pos.addScaledVector(d.normalize(), Math.min(L, speed / STEP_DUTY * dt)); S.yaw = Math.atan2(d.x, d.y); }
        if (see && dist < 9) pushOut(S.pos);
      } else if (Math.random() < dt * 2) api.twitch();
      placeModel();
      dist = S.pos.distanceTo(p);
      if (dist < 0.85 && !(hidden && S.mode === 'search' && dist > 0.6)) return G.caught();
      // a pale moth on your hand: she is close and you have not seen her
      if (dist < 6 && !S.told.near) { S.told.near = true; say('A pale moth lands on the back of your hand. She is close.', 3500); }
    },
    // torch burst: she rears back and folds her wings over her face
    flash(e) {
      if (!S.on || !model || !model.visible || S.mode === 'away' || S.mode === 'gone' || S.mode === 'wake') return;
      const d = e.detail, m = new THREE.Vector3(S.pos.x + O.x, 1.8, S.pos.y + O.z), v = m.clone().sub(d.origin);
      if (v.length() > d.range || v.normalize().dot(d.dir) < 0.93 || !los(local(), S.pos)) return;
      S.stun = 3.5; S.mode = 'hunt'; api.fold(); api.twitch(); sfx.flutter(1);
      // she recoils a step
      const back = S.pos.clone().sub(local()).setLength(1.2).add(S.pos); if (freeAt(back, 0.35)) S.pos.copy(back);
      if (!S.told.stun) { S.told.stun = true; say('She rears back from the light, wings snapping shut over her face. Go.', 3500); }
    },
  };
  addEventListener('flashburst', e => self.flash(e));
  return self;
}
