// The Catacombs in play: interactions, the four puzzles, the poison, hints and save state.
// main.js hands over a small context (messages, saving, transitions, sounds) and merges what
// this returns into its own interactables, hints and saves.
import * as THREE from 'three';
import { SPECIES } from './moths.js';
import { CATA, OSSUARY_CODE, POISON_ORDER } from './world/catacombs.js';

const LEDGER = [
  'A pharmacist’s ledger, half burnt, the pages fused at the edges:',
  '“Poisons, kept as Father kept them, the mildest drawer first.',
  'The white woolly one from the Gran Sabana, which looks like a child’s toy and harms nobody.',
  'The Scarlet tiger: bitter; a bird spits it out and remembers.',
  'The little wasp-waisted one, blue-black with white spots, reared on oleander, carrying its heart-poison in its bo… [burnt]',
  '…own-tail: the hairs blister the skin and close the throat.',
  '[burnt] …soft as a cat, and its sting puts a grown man on the floor for a day.',
  'And last, Lonomia, whose touch makes the blood forget how to clot.',
  'Mind the needles. Father set one in every drawer that weeps. The rats have learned it the hard way.”',
].join(' ');
const TUNNEL = 'A low tunnel, bricked up behind an iron door and chained twice across. Cold air breathes through the cracks, and it smells of rain and open ground. The chains are newer than anything else down here. Someone wanted this shut more than they wanted anything.';
const NICHES = 'Four bays of niches, nine to a bay, each niche numbered in the stone and each with its skull. The bays are marked I to IV underneath. Some of the skulls are not quite alone.';
const EMPTY = ['Empty. A smell of bitter almonds and dust.', 'Empty, apart from a scatter of brittle wings.', 'Nothing inside but a paper label, too faded to read.', 'Empty. The wood inside is stained dark.'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export function createCatacombsPlay(ctx) {
  const { cat, ROOM_ORIGIN, player, camera, lantern, say, sfx } = ctx;
  const W = v => new THREE.Vector3(v.x, 0, v.z).add(ROOM_ORIGIN);
  const local = () => ({ x: player.pos.x - ROOM_ORIGIN.x, z: player.pos.z - ROOM_ORIGIN.z });
  let poisoned = false, poisonK = 0, sinkT = 0, told = {}, heartT = 0, audio = null;

  // ---------- the iron cabinet: a small overlay to set the keys in their keyholes ----------
  const ui = document.createElement('div'); ui.id = 'catCabinet'; ui.className = 'screen dim hidden';
  ui.innerHTML = `<div class="menu padlock"><h2>An iron cabinet</h2><p class="note">Six keyholes, I to VI. Each key is tagged with a moth. Choose a key for each keyhole, from I on.</p>
    <div class="catSlots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font:15px Georgia,serif"></div>
    <div class="catKeys" style="display:grid;grid-template-columns:1fr 1fr;gap:6px"></div>
    <p class="note catMsg"></p><button class="catTurn">Turn the keys</button><button class="catOut">Take the keys out</button><button class="catClose">Step back</button></div>`;
  document.body.appendChild(ui);
  const q = s => ui.querySelector(s);
  const heldKeys = () => cat.drawers.filter(d => d.moth && d.keyTaken).map(d => d.moth).filter(k => !cat.inserted.includes(k));
  function drawUI() {
    q('.catSlots').innerHTML = '';
    ROMAN.forEach((n, i) => { const el = document.createElement('div'); el.style.cssText = 'border:1px solid #5a4a30;padding:6px;background:#1a140c;color:#e8d8b0;min-height:44px'; el.textContent = `${n}: ${cat.inserted[i] ? SPECIES[cat.inserted[i]].common : '—'}`; q('.catSlots').appendChild(el); });
    q('.catKeys').innerHTML = '';
    const held = heldKeys();
    if (!held.length && cat.inserted.length < 6) { const p = document.createElement('p'); p.className = 'note'; p.textContent = cat.inserted.length ? 'You have no more keys.' : 'You have no keys that fit.'; q('.catKeys').appendChild(p); }
    for (const k of held) { const b = document.createElement('button'); b.style.cssText = 'font-size:14px;padding:6px;margin:0'; b.textContent = SPECIES[k].common; b.onclick = () => { if (cat.inserted.length < 6) { cat.setInserted([...cat.inserted, k]); sfx.playClick(); q('.catMsg').textContent = ''; drawUI(); } }; q('.catKeys').appendChild(b); }
  }
  function openCabinetUI() { q('.catMsg').textContent = ''; drawUI(); ui.classList.remove('hidden'); ctx.setModal(true); }
  function closeCabinetUI() { ui.classList.add('hidden'); ctx.setModal(false); }
  q('.catClose').onclick = closeCabinetUI;
  q('.catOut').onclick = () => { cat.setInserted([]); drawUI(); };
  q('.catTurn').onclick = () => {
    if (cat.inserted.length < 6) { q('.catMsg').textContent = 'The keys will not turn. Some keyholes are still empty.'; return; }
    const n = cat.inserted.filter((k, i) => k === POISON_ORDER[i]).length;
    if (n === 6) {
      closeCabinetUI(); cat.openCabinet(); sfx.playSoftClicks(6); sfx.playGrind();
      say('One after another the keys turn, the mildest first. The cabinet doors swing open on a lever, and as it drops, a bolt draws back somewhere in the east wall.', 8000);
      ctx.save('catacombs'); return;
    }
    sfx.playSoftClicks(n); sfx.playCreak();
    q('.catMsg').textContent = `The keys turn a quarter and stick. ${n ? `${n === 1 ? 'One clicks' : `${n} click`} further than the rest. ` : ''}The springs push them all back out. Wrong order.`;
    cat.setInserted([]); drawUI();
  };
  addEventListener('keydown', e => { if (!ui.classList.contains('hidden') && e.code === 'Escape') closeCabinetUI(); });

  // ---------- poison: the first needle ----------
  function heartbeat() {
    try {
      if (!audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; audio = new AC(); }
      const t = audio.currentTime, vol = 0.5 * (ctx.volume ? ctx.volume() : 0.6) * Math.min(1, 0.4 + poisonK);
      for (const [dt, f] of [[0, 62], [0.17, 52]]) {
        const o = audio.createOscillator(), g = audio.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, t + dt); o.frequency.exponentialRampToValueAtTime(30, t + dt + 0.15);
        g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(vol * (dt ? 0.6 : 1), t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.22);
        o.connect(g).connect(audio.destination); o.start(t + dt); o.stop(t + dt + 0.25);
      }
    } catch { /* no audio */ }
  }
  function applyPoison(t = 0) {
    const on = poisoned && poisonK > 0.01 && ctx.zone() === 'room';
    ctx.canvas.style.filter = on ? `blur(${(0.3 + 2.2 * poisonK * (0.6 + 0.4 * Math.sin(t * 0.8))).toFixed(2)}px)` : '';
    if (ctx.fogIn) ctx.fogIn.density = 0.03 * (on ? 1 + 1.6 * poisonK : 1);
  }
  function poison() {
    poisoned = true; poisonK = 1; heartT = 0;
    say('A sting in your fingertip, sharp and deep. A needle snaps back into the drawer. Within a breath your heart is going too fast, and the edges of everything begin to swim.', 9000);
    for (const f of hooks.poison) f();
  }
  function die() {
    sfx.playThud();
    say('Another needle. This time the cold runs all the way up your arm, and the floor comes up to meet you.', 4000);
    ctx.die();
  }

  // ---------- the drawers (aimed at, like the specimen cabinet) ----------
  const ray = new THREE.Raycaster(); ray.far = 2.2; const centre = new THREE.Vector2();
  function aim() {
    const p = local();
    if (Math.hypot(p.x - 41.2, p.z - 156.1) > 2.2) return null;
    ray.setFromCamera(centre, camera);
    const hit = ray.intersectObject(cat.drawerMesh, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    const d = cat.drawers[hit.instanceId];
    if (!d.target) return { prompt: 'E  open the drawer', act: () => openDrawer(d) };
    if (d.moth && !d.keyTaken) { const sp = SPECIES[d.moth]; return { prompt: `E  take the key  ·  ${sp.common} (${sp.latin})`, act: () => { cat.takeKey(d); sfx.playClick(); say(`A small iron key on a card tag, the drawing of the ${sp.common} on it. You take it.`, 4000); } }; }
    if (d.moth) { const sp = SPECIES[d.moth]; return { prompt: `${sp.common} (${sp.latin})  ·  E  close the drawer`, act: () => cat.setDrawer(d, false) }; }
    return { prompt: 'E  close the drawer', act: () => cat.setDrawer(d, false) };
  }
  function openDrawer(d) {
    cat.setDrawer(d, true); sfx.playClick();
    if (d.trap && !d.sprung) { cat.spring(d); if (poisoned) die(); else poison(); return; }
    if (d.trap) { say('The needle has already sprung from this one. It hangs out of the wood, still wet.', 4000); return; }
    if (d.moth) { const sp = SPECIES[d.moth]; say(`Inside, on a card: a drawing of a moth, ${sp.latin}, the ${sp.common}. A small iron key lies on the card.`, 5000); return; }
    say(EMPTY[d.i % EMPTY.length], 3000);
  }

  // ---------- fixed interactions ----------
  const interactables = [
    { zone: 'room', pos: W(CATA.stairE), r: 1.2, prompt: 'E  climb the steps to the chapel', act: () => ctx.toChapel() },
    { zone: 'room', pos: W(CATA.stairB), r: 1.2, prompt: 'E  climb the back stair', act: () => ctx.toFirstFloor() },
    { zone: 'room', pos: W(CATA.tunnel), r: 1.5, prompt: 'E  examine the tunnel', act: () => { sfx.playCreak(); say(TUNNEL, 9000); } },
    { zone: 'room', pos: W(CATA.ossLock), r: 1.2, when: () => !cat.ossOpen, prompt: 'E  try the padlock', act: () => ctx.openLock('ossuary') },
    { zone: 'room', pos: W(new THREE.Vector3(43.0, 0, 121.6)), r: 1.3, prompt: 'E  look at the niches', act: () => say(NICHES, 8000) },
    { zone: 'room', pos: W(new THREE.Vector3(47.6, 0, 121.6)), r: 1.3, prompt: 'E  look at the niches', act: () => say(NICHES, 8000) },
    { zone: 'room', pos: W(CATA.seal), r: 1.4, when: () => !cat.tombOpen, prompt: 'E  examine the seal',
      act: () => say(cat.heat > 0.3 ? 'The wax is soft and warm now, and the cocoon in it moves on its own.' : 'A wax seal across the tomb door, as wide as your hand. Pressed into it, a cocoon spun from pale silk, cold as the stone. When you hold your breath you can feel it twitch.', 7000) },
    { zone: 'room', pos: W(CATA.ledger), r: 1.0, prompt: 'E  read the ledger', act: () => say(LEDGER, 30000) },
    { zone: 'room', pos: W(CATA.cabinet), r: 1.3, prompt: () => cat.cabinetOpen ? 'The iron cabinet stands open. The lever inside is down.' : 'E  try the iron cabinet', act: () => { if (!cat.cabinetOpen) openCabinetUI(); } },
  ];

  // ---------- hints: three per pair of rooms (ossuary + crypt, tomb hall + apothecary) ----------
  const hints = {
    ossuary: [
      'The gate out of the ossuary has a four-figure lock. The skulls in the niches on the north wall are numbered, four bays of nine.',
      'In each bay, one skull is not alone. Take a light close to the niches.',
      'One moth rests on one skull in each bay. Read their niche numbers from bay I to IV: 7 2 9 4.',
    ],
    crypt: [
      'The water is deep and cold, and not every coffin lid will hold you. Look at what is lying on them.',
      'Every lid has the same carved cross, so the cross tells you nothing. Something sleeps on the lids that hold.',
      'Walking away from the gate: the middle lid, then the right, the right again, the middle, and the left lid to the far ledge.',
    ],
    tomb: [
      'The tomb door is sealed with wax, and something is pressed into the seal. It is very cold down here.',
      'The cocoon in the seal is alive, but too cold to wake. The torch gives light, not warmth. A flame might.',
      'Raise a lantern (L) and stand close to the seal until the cocoon hatches. If your lantern is dry, there is another in the bone gallery.',
    ],
    apothecary: [
      'The ledger on the counter is about the drawers. Look at the drawers before you open them. The rat under the cabinet did not die of old age.',
      'The drawers that weep, with dark stains running down from them, hide spring needles. Six drawers hold a moth and a key: the iron cabinet wants the keys from the mildest poison to the deadliest.',
      `Keys in order, I to VI: ${POISON_ORDER.map(k => SPECIES[k].common).join(', ')}.`,
    ],
  };
  const hintGroups = { ossuary: 'ossuary+crypt', crypt: 'ossuary+crypt', tomb: 'tomb+apothecary', apothecary: 'tomb+apothecary' };
  function puzzleAt(x, z) {
    if (z < 118 || z > 158) return null;
    if (x >= 30 && x <= 50 && z >= 120 && z <= 128) return cat.ossOpen ? null : 'ossuary';
    if (x > 43 && x < 47 && z > 128 && z < 142) return cat.crossed ? null : 'crypt';
    if (x > 38 && x < 52 && z > 142 && z < 148) return cat.tombOpen ? null : 'tomb';
    if (x > 38 && x < 52 && z > 148 && z < 157) return cat.cabinetOpen ? null : 'apothecary';
    return null;
  }
  const locks = {
    ossuary: { title: 'An iron padlock on the ossuary gate', code: OSSUARY_CODE, fail: 'The shackle does not move.',
      onOpen: () => { cat.openGate(); sfx.playGrind(); say('The lock drops open. The gate grinds up into the vault, and beyond it you hear water lapping against wood.', 7000); ctx.save('catacombs'); } },
  };

  // ---------- per frame ----------
  function update(dt, t, playing) {
    const inCat = ctx.zone() === 'room' && player.pos.z - ROOM_ORIGIN.z > 112 && player.pos.z - ROOM_ORIGIN.z < 165;
    if (poisoned) {
      // the worst passes in a few minutes; the flag stays (she can still smell it on you)
      poisonK = Math.max(0, poisonK - dt / 360);
      applyPoison(t);
      if (playing && poisonK > 0.05) { heartT -= dt; if (heartT <= 0) { heartT = 60 / (66 + 54 * poisonK); heartbeat(); } }
    }
    if (!playing || !inCat) return;
    const p = local();
    // the flooded crypt: only the lids with sleepers hold
    if (cat.inWater(p.x, p.z)) {
      const c = cat.coffinAt(p.x, p.z);
      if (!c || !c.safe) {
        sinkT += dt; if (c) c.tip = Math.min(1, c.tip + dt * 5);
        if (sinkT > 0.35) {
          sinkT = 0; sfx.playThud();
          ctx.transition(() => { player.place(W(CATA.cryptStart).x, W(CATA.cryptStart).z, Math.PI); say(c ? 'The lid tips under you and the black water takes you, so cold it stops your breath. You claw your way back to the ledge by the gate.' : 'There is nothing under the water but more water. You haul yourself back to the ledge by the gate, shaking.', 7000); });
        }
      } else sinkT = 0;
    } else sinkT = 0;
    if (!cat.crossed && p.x > 43.4 && p.x < 46.8 && p.z > 140.75 && p.z < 142) { cat.setCrossed(); say('Stone under your feet again. Behind you the water closes over the lids as if nobody had passed.', 6000); ctx.save('catacombs'); }
    // the sealed tomb: a lantern held close warms the cocoon in the wax
    if (!cat.tombOpen) {
      const d = Math.hypot(p.x - CATA.seal.x, p.z - CATA.seal.z), warm = lantern.on && lantern.fuel > 0 && d < 1.8;
      cat.heat = warm ? Math.min(1, cat.heat + dt / 12) : Math.max(0, cat.heat - dt / 40);
      if (warm && cat.heat > 0.3 && !told.h1) { told.h1 = true; say('The wax softens and starts to shine. Inside the seal, the cocoon twitches.', 5000); }
      if (warm && cat.heat > 0.65 && !told.h2) { told.h2 = true; say('A hairline crack runs down the silk. Something inside is pushing.', 5000); }
      if (cat.heat >= 1) {
        cat.hatch(); sfx.playCreak(); setTimeout(() => sfx.playGrind(), 2000);
        say('The cocoon splits. A pale moth drags itself out of the wax, wet and crumpled, and the seal cracks in two behind it. Stone grinds: the slab slides away into the wall.', 9000);
        ctx.save('catacombs');
      }
    }
  }

  const hooks = { poison: [] };
  return {
    interactables, aim, hints, hintGroups, puzzleAt, locks, update,
    get poisoned() { return poisoned; },
    // for The Mother, later: how much more easily she notices you (poisoned: heartbeat, stumbling)
    get detectScale() { return poisoned ? 1.75 : 1; },
    onPoison(f) { hooks.poison.push(f); },
    state() { return { ...cat.getState(), poisoned, poisonK: +poisonK.toFixed(3) }; },
    load(s) { cat.setState(s || {}); poisoned = !!(s && s.poisoned); poisonK = poisoned ? (s.poisonK ?? 0.5) : 0; sinkT = 0; told = {}; applyPoison(0); },
    closeUI() { if (!ui.classList.contains('hidden')) closeCabinetUI(); },
  };
}
