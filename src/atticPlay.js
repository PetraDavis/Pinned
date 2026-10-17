// The attic's interactions, hints, save points and its three close-up views (the Night Clock,
// the cipher wheel, the marks on the rafters). The world itself is built in world/attic.js;
// main.js wires this in with a handful of hooks (see `createAtticPlay`).
import * as THREE from 'three';
import { SPECIES } from './moths.js';
import { mothImage } from './mothNotes.js';
import { ATTIC, RACK_ORDER, SPAN_MM, EGG_CODE, BOX_WORD, CLOCK_MOTHS, CIPHER_PLAIN, HYMN_TEXT, LEDGER_TEXT, CLOCK_LOG, RACK_PLATE, drawGlyph, cipherOf } from './world/attic.js';

// ---------- hints: three per puzzle, from a nudge to the near-answer ----------
export const ATTIC_HINTS = {
  rack: [
    'Read the brass plate on the rack by the lamp. Each hook takes one moth: lift one, then swap it with another.',
    'Hang them by the size of their wings, the smallest on the left as you face the wall, the largest on the right. The White witch has the widest wings of any moth.',
    'Left to right: Small magpie, Lappet, Privet hawk-moth, Owl moth, White witch.',
  ],
  eggs: [
    'The ledger on the clerk’s desk records how many eggs each mother laid. The big jars on the table are labelled with the same four moths, and they lift: each of the places on the table is numbered, I to IV.',
    'Stand the jars on the table from the fewest eggs at I to the most at IV. When they are right, look at the lids. The first figure of each count, in that order, opens the padlock.',
    'I Codling moth (50), II Fall webworm (400), III Corn earworm (1,000), IV Rain moth (29,100). The padlock code is 5 4 1 2.',
  ],
  cipher: [
    'The marks chalked across the rafters use the same symbols as the inner ring of the brass wheel. The brass box by the knee wall wants a word.',
    'The hymn book on the landing has a pencilled note: turn the wheel until the moon sits under M, then read each symbol as the letter above it.',
    'The rafters say SHE WAKES AT DUSK. The box opens to D U S K.',
  ],
  clock: [
    'The paper pinned beside the clock is a collector’s record of when each moth came to the lamp.',
    'The clock needs its hands first: they are in the brass box in the clock room. Then lift each moth off the rim and set it at the hour of the night it was taken: the Common swift at dusk, the last of them in the small hours.',
    'Common swift at IX, Convolvulus hawk-moth at XI, Large yellow underwing at XII, Merveille du Jour at III.',
  ],
};
// three hints for each pair of rooms, as on the floors below
export const ATTIC_HINT_GROUP = { rack: 'landing+eggstore', eggs: 'landing+eggstore', cipher: 'clockroom+chamber', clock: 'clockroom+chamber' };
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// deps: { ground, room, origin, firstLadder, player, camera, say, save, transition, sfx: {thud, creak, grind, clicks}, updateHeld, openPadlock, modal: {open, close}, visited: () => object }
export function createAtticPlay(deps) {
  const { ground, room, origin: O, player, camera, say, save, transition, sfx, updateHeld, openPadlock, modal, visited } = deps;
  const A = () => ground.attic;
  const W = v => new THREE.Vector3(v.x + O.x, 0, v.z + O.z);
  const at = (x, z) => W({ x, z });

  // ---------- the ladder ----------
  function climbLadderD() {
    if (!ground.lu.deskOpen) { sfx.creak(); say('The ladder goes up to a hatch in the ceiling, chained and padlocked. Above it, something heavy shifts, and is still.', 6000); return; }
    const first = !visited().attic;
    if (first) say('The LINEN key fits the hatch padlock too. It turns stiffly, the chain slithers to the floor, and you push the hatch up into cold air and moonlight.', 6000);
    setTimeout(() => transition(() => {
      player.place(O.x + ATTIC.spawn.x, O.z + ATTIC.spawn.z, Math.PI / 2); sfx.thud();
      if (!visited().attic) { visited().attic = true; save('attic'); say('The attic. Moonlight falls through the skylights in long grey bars, and there is silk on every rafter. Somewhere at the far end, something breathes, slow and even.', 8000); }
    }), first ? 1800 : 0);
  }

  // ---------- the Wingspan Rack (aim at a hook) ----------
  const ray = new THREE.Raycaster(); ray.far = 2.4; const centre = new THREE.Vector2();
  function aim() { return aimRack() || aimJars(); }
  // ---------- the Night Clock (aim at an hour on the rim) ----------
  function aimClock() {
    const a = A(); if (!a || a.clockSolved) return null;
    const cp = W(ATTIC.clock); if (Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z) > 2.0) return null;
    ray.setFromCamera(centre, camera);
    const hit = ray.intersectObjects(a.clockPicks, false)[0], name = i => SPECIES[CLOCK_MOTHS[i].key].common, held = a.clockHeld;
    const hands = a.boxOpen ? '' : '   ·   the hands are missing';
    if (!hit) return held >= 0 ? { prompt: `Carrying the ${name(held)}   ·   aim at an hour on the dial`, act: () => {} }
      : { prompt: `Aim at a moth on the dial to lift it${hands}   ·   E  look at the clock`, act: () => say(a.boxOpen ? 'The Night Clock, its iron hands fitted on the boss. Four moths on the rim. Lift one off and set it at another hour; the paper pinned beside the clock says when each came to the lamp.' : 'A big plain clock face with NOX painted under its centre. Four moths are pinned round the rim; you can lift each off and set it at another hour. But the hands are gone, only the brass boss left: without them it cannot strike. Perhaps they are locked away somewhere in this room.', 9000) };
    const h = hit.object.userData.hour, at = a.mothAtHour(h), n = ROMAN[h];
    const prompt = at >= 0 && held >= 0 ? `E  set the ${name(held)} at ${n}, lift the ${name(at)}` : at >= 0 ? `E  lift the ${name(at)} off ${n}` : held >= 0 ? `E  set the ${name(held)} at ${n}` : `${n}: empty`;
    return { prompt, act: () => {
      if (at < 0 && held < 0) return;
      if (room.puzzle.held || a.jarHeld) { say('Your hands are full.', 3000); return; }
      a.useHour(h); sfx.clicks(1);
      if (a.clockHeld < 0) checkClock();
    } };
  }
  function checkClock() {
    const a = A(), n = CLOCK_MOTHS.filter((c, i) => a.clock[i] === c.hour).length;
    if (n === 4 && a.boxOpen) { tryClock(); return; }
    if (n === 4) { sfx.creak(); say('The four moths sit snug on their pins, all of them. But the clock has no hands to turn, and nothing happens. The hands must be somewhere in this room, locked away.', 8000); return; }
    say(`${n === 1 ? 'One moth sits' : `${n} moths sit`} snug on ${n === 1 ? 'its' : 'their'} pin.`, 3500);
  }
  // ---------- the Egg Store jars (aim at a numbered place on the table) ----------
  function aimJars() {
    const a = A(); if (!a || a.jarsSolved) return null;
    if (a.carry.parent !== camera) camera.add(a.carry);
    const tp = at(43.4, 181.4); if (Math.hypot(player.pos.x - tp.x, player.pos.z - tp.z) > 2.2) return null;
    ray.setFromCamera(centre, camera);
    const hit = ray.intersectObjects(a.jarPicks, false)[0];
    const name = k => SPECIES[k].common;
    if (!hit) return a.jarHeld ? { prompt: `Carrying the ${name(a.jarHeld)} jar   ·   aim at an empty place on the table`, act: () => {} }
      : { prompt: 'Aim at a jar to lift it   ·   E  look at the jars', act: () => say('Four big preserving jars, their labels in the same careful hand. Pale eggs inside each, a scatter in one, packed nearly to the lid in another. Each stands on a brass plate let into the table, numbered I to IV.', 9000) };
    const i = hit.object.userData.jarSlot, key = a.jars[i], held = a.jarHeld, n = ROMAN[i + 1];
    const prompt = key && held ? `E  set the ${name(held)} jar on ${n}, lift the ${name(key)}`
      : key ? `E  lift the ${name(key)} jar off ${n}` : held ? `E  set the ${name(held)} jar on ${n}` : `Place ${n}: empty`;
    return { prompt, act: () => {
      if (!key && !held) return;
      if (room.puzzle.held) { say('Your hands are full. Put the specimen back first.', 3000); return; }
      a.useJar(i); sfx.thud();
      if (a.jarsFull()) checkJars();
    } };
  }
  function checkJars() {
    const a = A();
    if (a.jarsCorrect()) {
      a.solveJars(); sfx.clicks(4);
      say('The last jar settles onto its plate with a soft click, and the eggs inside shift and pale. Scratched into each brass lid, a figure you had not noticed catches the light: 5, 4, 1, 2.', 9000);
    } else {
      const n = a.jarsRight(); sfx.clicks(n); sfx.creak();
      say(`The jars chink against the plates. ${n ? `${n === 1 ? 'One plate clicks' : `${n} plates click`} softly.` : 'Nothing clicks.'} Not in the right order yet.`, 5000);
    }
  }
  function aimRack() {
    const a = A(); if (!a || a.rackSolved) return null;
    const rp = W(ATTIC.rack); if (Math.hypot(player.pos.x - rp.x, player.pos.z - rp.z) > 2.2) return null;
    ray.setFromCamera(centre, camera);
    const hit = ray.intersectObjects(a.pickables, false)[0];
    if (!hit) return { prompt: 'Aim at a hook   ·   E  read the brass plate', act: () => say(RACK_PLATE, 9000) };
    const i = hit.object.userData.hook, key = a.rack[i], held = room.puzzle.held, n = ROMAN[i + 1];
    const prompt = key && held ? `E  hang the ${SPECIES[held].common} on hook ${n}, take the ${SPECIES[key].common}`
      : key ? `E  lift the ${SPECIES[key].common} off hook ${n}` : held ? `E  hang the ${SPECIES[held].common} on hook ${n}` : `Hook ${n}: empty`;
    return { prompt, act: () => {
      if (!key && !held) return;
      if (a.jarHeld) { say('Your hands are full. Put the jar down first.', 3000); return; }
      if (held && !SPAN_MM[held]) { say('That specimen does not belong on this rack.', 3000); return; }
      room.puzzle.held = a.useHook(i, held); updateHeld(); sfx.thud();
      if (a.rackFull()) checkRack();
    } };
  }
  function checkRack() {
    const a = A();
    if (a.rackCorrect()) {
      a.solveRack(); sfx.clicks(5); sfx.grind();
      say('The last moth settles on its hook. On the wall the five shadows creep together in the lamplight, wing into wing, into the shape of a door. Then the shape swings open.', 9000);
      save('atticRack');
    } else {
      const n = a.rackRight(); a.shakeRack(); sfx.clicks(n); sfx.creak();
      say(`The specimens shiver on their threads and the shadows jerk across the wall. ${n ? `${n === 1 ? 'One hook clicks' : `${n} hooks click`} softly.` : 'Nothing clicks.'} Not in the right order yet.`, 5000);
    }
  }

  // ---------- locks: the egg-store padlock (digits) and the brass box (letters) ----------
  function lockInfo(target) {
    if (target === 'eggs') return { title: 'A brass padlock on the door', base: 10 };
    if (target === 'box') return { title: 'A brass box with four letter-dials', base: 26 };
    return null;
  }
  function tryLock(target, dials) {
    if (target === 'eggs') {
      if (dials.join('') !== EGG_CODE) return { ok: false, msg: 'The shackle does not move.' };
      A().openEggs(); sfx.thud();
      say('The shackle drops open. The door swings in on a narrow room under the ridge, and the slow tick of a clock that is not there.', 7000);
      save('atticEggs'); return { ok: true };
    }
    if (target === 'box') {
      if (dials.map(d => String.fromCharCode(65 + d)).join('') !== BOX_WORD) return { ok: false, msg: 'The lid does not lift.' };
      A().openBox(); sfx.thud();
      say('The letters click into line and the lid lifts. Inside, on a strip of silk, two black iron clock hands. You carry them to the clock and press them onto the brass boss. They click home.', 8000);
      save('atticBox'); return { ok: true };
    }
    return null;
  }

  // ---------- close-up views ----------
  const views = buildViews();
  let openView = null;
  function show(id) { openView = id; views.el.classList.remove('hidden'); for (const [k, p] of Object.entries(views.panels)) p.style.display = k === id ? '' : 'none'; views.draw(); modal.open(); }
  function hide() { if (!openView) return; openView = null; views.el.classList.add('hidden'); modal.close(); }
  let clockSel = 0;
  function tryClock() {
    const a = A();
    if (a.clockCorrect()) {
      a.solveClock(); hide(); sfx.clicks(4); sfx.grind();
      say('The last moth slides into place. The hands shudder, then sweep round, three times, faster and faster, and stop at three. Behind you, low in the west wall, a heavy bolt draws back.', 9000);
      save('atticClock');
    } else {
      const n = CLOCK_MOTHS.filter((c, i) => a.clock[i] === c.hour).length;
      sfx.clicks(n); sfx.creak();
      views.clockMsg.textContent = `The hands twitch and fall back to twelve. ${n ? `${n === 1 ? 'One moth sits' : `${n} moths sit`} snug on ${n === 1 ? 'its' : 'their'} pin.` : ''}`;
    }
  }
  addEventListener('keydown', e => {
    if (!openView) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); hide(); return; }
    const a = A();
    if (openView === 'clock') {
      if (e.code === 'ArrowUp') clockSel = (clockSel + 3) % 4;
      if (e.code === 'ArrowDown') clockSel = (clockSel + 1) % 4;
      if (e.code === 'ArrowLeft') a.setHour(clockSel, a.clock[clockSel] - 1);
      if (e.code === 'ArrowRight') a.setHour(clockSel, a.clock[clockSel] + 1);
      if (e.code === 'Enter') tryClock(); else views.clockMsg.textContent = '';
    }
    if (openView === 'wheel') {
      if (e.code === 'ArrowLeft') a.setWheel(a.wheel - 1);
      if (e.code === 'ArrowRight') a.setWheel(a.wheel + 1);
    }
    views.draw();
  });

  function buildViews() {
    const el = document.createElement('div'); el.id = 'atticView'; el.className = 'screen dim hidden';
    el.innerHTML = `<div class="menu" style="width:min(400px,calc(100vw - 32px))">
      <div data-p="clock"><h2>The Night Clock</h2><p class="note">Slide each moth round the rim. Arrows or the buttons; Enter to set the hands; Esc to step back.</p>
        <canvas width="300" height="300" style="width:min(200px,30vh);height:min(200px,30vh);margin:2px auto;display:block"></canvas><div class="rows"></div>
        <p class="note cmsg"></p><button class="ctry">Set the hands</button></div>
      <div data-p="wheel"><h2>The cipher wheel</h2><p class="note">Turn the inner ring with the arrows or the buttons. Esc to step back.</p>
        <canvas width="320" height="320" style="width:min(230px,36vh);height:min(230px,36vh);margin:2px auto;display:block"></canvas>
        <div style="display:flex;gap:10px;justify-content:center"><button class="wl">◀ Turn</button><button class="wr">Turn ▶</button></div>
        <p class="note wmsg"></p><canvas class="strip" width="360" height="186" style="width:100%;max-width:300px;margin:2px auto;display:block"></canvas></div>
      <div data-p="rafters"><h2>Marks on the rafters</h2><p class="note">Chalked across a brace board nailed to the rafters, in three runs:</p>
        <canvas class="strip" width="360" height="186" style="width:100%;max-width:360px;margin:4px auto;display:block"></canvas></div>
      <button class="vclose">Step back (Esc)</button></div>`;
    document.body.appendChild(el);
    const panels = {}; el.querySelectorAll('[data-p]').forEach(p => { panels[p.dataset.p] = p; });
    const clockCanvas = panels.clock.querySelector('canvas'), rows = panels.clock.querySelector('.rows'), clockMsg = panels.clock.querySelector('.cmsg');
    const imgs = CLOCK_MOTHS.map(c => { const im = new Image(); im.src = mothImage(c.key); im.onload = () => draw(); return im; });
    const rowEls = CLOCK_MOTHS.map((c, i) => {
      const d = document.createElement('div'); d.style.cssText = 'display:grid;grid-template-columns:1fr auto 3em auto;gap:6px;align-items:center;margin:1px 0';
      d.innerHTML = `<span style="text-align:left"></span><button>◀</button><b style="font:700 18px Georgia,serif;color:#f0dca0"></b><button>▶</button>`;
      d.querySelector('span').textContent = SPECIES[c.key].common;
      const [l, rgt] = d.querySelectorAll('button');
      l.onclick = () => { clockSel = i; A().setHour(i, A().clock[i] - 1); clockMsg.textContent = ''; draw(); };
      rgt.onclick = () => { clockSel = i; A().setHour(i, A().clock[i] + 1); clockMsg.textContent = ''; draw(); };
      rows.appendChild(d); return d;
    });
    panels.clock.querySelector('.ctry').onclick = () => tryClock();
    panels.wheel.querySelector('.wl').onclick = () => { A().setWheel(A().wheel - 1); draw(); };
    panels.wheel.querySelector('.wr').onclick = () => { A().setWheel(A().wheel + 1); draw(); };
    el.querySelector('.vclose').onclick = () => hide();
    const wmsg = panels.wheel.querySelector('.wmsg');
    function drawStrip(cv, seen) {
      const g = cv.getContext('2d'); g.fillStyle = '#3a2c20'; g.fillRect(0, 0, cv.width, cv.height);
      if (!seen) { g.fillStyle = '#a89878'; g.font = 'italic 15px Georgia, serif'; g.textAlign = 'center'; g.fillText('(You have not copied down the marks on the rafters.)', cv.width / 2, cv.height / 2); return; }
      CIPHER_PLAIN.split(' ').reduce((rowsAcc, w) => { const last = rowsAcc[rowsAcc.length - 1]; if (last && (last + ' ' + w).length <= 5) rowsAcc[rowsAcc.length - 1] = last + ' ' + w; else rowsAcc.push(w); return rowsAcc; }, [])
        .forEach((line, ri) => [...line].forEach((ch, ci) => { const k = cipherOf(ch); if (k >= 0) drawGlyph(g, k, 40 + ci * 56, 24 + ri * 42, 30); }));
    }
    function draw() {
      const a = A(); if (!a) return;
      if (openView === 'clock') {
        const g = clockCanvas.getContext('2d'), S = 300; g.clearRect(0, 0, S, S);
        g.fillStyle = '#d8ccb0'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, 7); g.fill(); g.strokeStyle = '#2a2018'; g.lineWidth = 3; g.stroke();
        g.fillStyle = '#1a1410'; g.font = '20px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let h = 1; h <= 12; h++) { const ang = -Math.PI / 2 + h / 12 * Math.PI * 2; g.fillText(ROMAN[h], S / 2 + Math.cos(ang) * 128, S / 2 + Math.sin(ang) * 128); }
        CLOCK_MOTHS.forEach((c, i) => { const ang = -Math.PI / 2 + a.clock[i] / 12 * Math.PI * 2, rr = 74 + (i % 2) * 22; if (imgs[i].complete) g.drawImage(imgs[i], S / 2 + Math.cos(ang) * rr - 22, S / 2 + Math.sin(ang) * rr - 22, 44, 44); if (i === clockSel) { g.strokeStyle = '#a86a2a'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2 + Math.cos(ang) * rr, S / 2 + Math.sin(ang) * rr, 24, 0, 7); g.stroke(); } });
        g.fillStyle = '#141210'; g.save(); g.translate(S / 2, S / 2); g.fillRect(-2, -80, 4, 80); g.fillRect(-3, -55, 6, 55); g.restore();
        rowEls.forEach((d, i) => { d.querySelector('b').textContent = ROMAN[a.clock[i]]; d.style.outline = i === clockSel ? '1px solid #d8b870' : 'none'; });
      }
      if (openView === 'wheel') {
        const cv = panels.wheel.querySelector('canvas'), g = cv.getContext('2d'), S = 320; g.clearRect(0, 0, S, S);
        g.fillStyle = '#9a7a3a'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.fill();
        g.fillStyle = '#7a5e2a'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, 7); g.fill();
        g.fillStyle = '#1e1408'; g.font = 'bold 18px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < 26; i++) {
          const ang = -Math.PI / 2 + i / 26 * Math.PI * 2;
          g.fillText(String.fromCharCode(65 + i), S / 2 + Math.cos(ang) * S * 0.44, S / 2 + Math.sin(ang) * S * 0.44);
          const k = ((i - a.wheel) % 26 + 26) % 26; drawGlyph(g, k, S / 2 + Math.cos(ang) * S * 0.3, S / 2 + Math.sin(ang) * S * 0.3, 22, '#1e1408');
        }
        drawStrip(panels.wheel.querySelector('.strip'), a.sawRafters);
        wmsg.textContent = '';
      }
      if (openView === 'rafters') drawStrip(panels.rafters.querySelector('.strip'), true);
    }
    return { el, panels, draw, clockMsg };
  }

  // ---------- interactables (main.js adds these to its list) ----------
  const interactables = [
    { zone: 'room', pos: W(ATTIC.ladder), r: 1.2, prompt: 'E  climb down the ladder',
      act: () => transition(() => player.place(O.x + deps.firstLadder.x - 0.6, O.z + deps.firstLadder.z, -Math.PI / 2)) },
    { zone: 'room', pos: W(ATTIC.hymn), r: 1.2, prompt: 'E  read the hymn book', act: () => say(HYMN_TEXT, 14000) },
    { zone: 'room', pos: W(ATTIC.ledger), r: 1.2, prompt: 'E  read the ledger', act: () => say(LEDGER_TEXT, 22000) },
    { zone: 'room', pos: at(43.4, 180.4), r: 1.1, when: () => A().jarsSolved, prompt: 'E  look at the jars',
      act: () => say('The four jars stand in their order, fewest eggs to most. Scratched into the lids: 5, 4, 1, 2.', 7000) },
    { zone: 'room', pos: W(ATTIC.eggLock), r: 1.1, when: () => !A().eggsOpen, prompt: 'E  try the padlock', act: () => openPadlock('eggs') },
    { zone: 'room', pos: W(ATTIC.clock), r: 1.3, when: () => !A().clockSolved,
      prompt: () => A().boxOpen ? 'E  move the moths round the clock' : 'E  look at the clock (its hands are missing)',
      act: () => {
        if (!A().boxOpen) { say('A big plain clock face with NOX painted under its centre. The hands are gone; only the brass boss is left, so the moths on the rim cannot be set yet. The hands must be locked away somewhere in this room.', 9000); return; }
        clockSel = 0; show('clock');
      } },
    { zone: 'room', pos: W(ATTIC.clockLog), r: 1.0, prompt: 'E  read the paper by the clock', act: () => say(CLOCK_LOG, 20000) },
    { zone: 'room', pos: W(ATTIC.wheel), r: 1.2, prompt: 'E  turn the brass wheel', act: () => show('wheel') },
    { zone: 'room', pos: W(ATTIC.rafters), r: 1.5, prompt: 'E  look up at the marks on the rafters', act: () => { A().seeRafters(); show('rafters'); } },
    { zone: 'room', pos: W(ATTIC.box), r: 1.0, prompt: () => A().boxOpen ? 'An empty brass box.' : 'E  try the brass box',
      act: () => { if (!A().boxOpen) openPadlock('box'); } },
    { zone: 'room', pos: W(ATTIC.hatch), r: 1.1, prompt: () => A().clockSolved ? 'Crouch (C) to crawl through the hatch' : 'E  try the little door',
      act: () => { if (!A().clockSolved) { sfx.creak(); say('A low door, barely waist-high, held by a long iron bolt that will not move. Cut into the beam above it: EMERGENCE. Warm air breathes through the cracks, in, and out.', 8000); } } },
    { zone: 'room', pos: at(ATTIC.motherSpawn.x + 2.4, ATTIC.motherSpawn.z), r: 1.6, prompt: 'E  look at the nest',
      act: () => say('A nest of silk, wide as a cart, slung from the rafters. Empty. The silk is still warm, and pressed down in the middle into the shape of something very large.', 8000) },
  ];

  // save points inside the attic, and where each puts you back
  const SPAWNS = { attic: [ATTIC.spawn.x, ATTIC.spawn.z, Math.PI / 2], atticRack: [50.9, 182.9, Math.PI / 2], atticEggs: [43.5, 179.4, 0], atticBox: [41.6, 173.6, Math.PI], atticClock: [40.5, 174.2, Math.PI / 2], chamber: [37.4, 174.6, Math.PI / 2] };
  const BACK = { attic: 'You are back in the attic, by the ladder.', atticRack: 'You are back on the attic landing, by the rack.', atticEggs: 'You are back in the attic, by the clock room door.', atticBox: 'You are back in the clock room.', atticClock: 'You are back in the clock room, by the hatch.', chamber: 'You are back in her chamber.' };
  return {
    interactables, aim, climbLadderD, lockInfo, tryLock, hints: ATTIC_HINTS, hintGroups: ATTIC_HINT_GROUP,
    puzzleAt(x, z) {
      const a = A(); if (!a || z < 170 || z > 187 || x < 38.9) return null;
      return !a.rackSolved ? 'rack' : !a.eggsOpen ? 'eggs' : !a.boxOpen ? 'cipher' : !a.clockSolved ? 'clock' : null;
    },
    spawnFor(cp) { const s = SPAWNS[cp]; return s ? { x: s[0], z: s[1], yaw: s[2] } : null; },
    backMessage(cp) { return BACK[cp] || null; },
    // first time through the hatch: a save point, and her chamber
    tick() {
      const x = player.pos.x - O.x, z = player.pos.z - O.z;
      if (!visited().chamber && x < 38.6 && z > 171 && z < 186) {
        visited().chamber = true; save('chamber');
        say('Her chamber. The cocoons here are not still. One twitches as your torch finds it; another has split down one side, and something wet glistens in the seam.', 9000);
      }
    },
    get viewOpen() { return !!openView; },
  };
}
