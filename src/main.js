// Pinned - entry point: renderer, game states, menus, interactions, save points.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTextures } from './textures.js';
import { buildExterior, SUN_DIR, CLIMB_SPOT, BROKEN_WINDOW, FRONT_DOOR, GATE, FENCE } from './world/exterior.js';
import { createLampMoths } from './lampMoths.js';
import { buildFirstRoom, ROOM_LAMP, ROOM_SPAWN, ROOM_WINDOW, ROOM_DOOR, ROOM_ORIGIN, ROOM_CABINET, ROOM_MOSAIC, ROOM_STANDS, ROOM_PANEL } from './world/firstRoom.js';
import { tickSilk } from './world/cocoon.js';
import { JOURNAL, LIFESPAN_ORDER, SEATING_NOTE, DINNER_SOLUTION } from './world/groundFloor.js';
import { SPECIES } from './moths.js';
import { CELLAR, FIRST, WARDROBE_VERSE, DESK_CODE } from './world/lowerUpper.js';
import { CATA } from './world/catacombs.js';
import { createCatacombsPlay } from './catacombsPlay.js';
import { createRoomsPlay } from './roomsPlay.js';
import { MOTH_NOTES, STORY, buildMothNotes, mothImage } from './mothNotes.js';
import { specimenCanvas } from './world/drawerPuzzle.js';
import { Player } from './player.js';
import { startAudio, setVolume, playThud, playGlass, playCreak, playGrind, playClick, setHiss, playSoftClicks, playFlutter, playClicksAt } from './audio.js';
import { updateAudio, initAudioSettings, playDoor, playDrawer, playDial, playLamp, playLantern, playChime } from './audio/index.js';
import { createFlashlight, batteryMesh } from './flashlight.js';
import { createLantern, lanternMesh } from './lantern.js';
import { loadSettings, saveSettings, loadSave, writeSave, clearSave, setActiveSlot, setPlaytimeSource, latestSlot, readSlot } from './storage.js';
import { createSlotScreen, placeOf } from './slots.js';
import { addEverMoth } from './storage.js';
import { createCollection } from './collection.js';
import { createPhotoMode } from './photoMode.js';
import { startHomeBackdrop } from './homeScreen.js';
import { createAtticPlay } from './atticPlay.js';
import { createMotherPlay } from './motherPlay.js';
import { createHallucinations, initAccessibilitySettings } from './hallucinate.js';
import { captionSound } from './captions.js';
import { initMultiplayer } from './net/multiplayer.js';
import { createEscape } from './escape.js';
import { createEnding } from './ending.js';
let mp = null; // multiplayer session (src/net/), set up at the end of this file

const $ = id => document.getElementById(id);
const canvas = $('game');

// ---------- renderer & scene ----------
let settings = loadSettings();
// Low: 0.75 pixel ratio, sun shadow only (512, hard), no normal/roughness maps, sparse grass, no dust.
// Medium: 1.25 pixel ratio, 2048 soft shadows, full materials.
// High: full DPR (cap 2), 4096 soft shadows, ambient occlusion, bloom, dense grass and dust.
// Texture canvases are 512 / 1024 / 2048 px (see textures.js) and need a restart to change.
import { detectCaps, createLightLimiter } from './caps.js';
const CAPS = detectCaps();
// first run on this browser: pick a safe default
if (!settings.qualityChosen) { settings.quality = CAPS.defaultQuality; settings.qualityChosen = true; saveSettings(settings); }
const QUALITIES = {
  low: { pr: 0.75, shadow: 512, soft: false, lampShadows: false, pbr: false, grass: 0.2, dust: 0, post: false },
  medium: { pr: 1, shadow: 1024, soft: true, lampShadows: true, pbr: true, grass: 0.5, dust: 150, post: false },
  high: { pr: 1.5, shadow: 2048, soft: true, lampShadows: true, pbr: true, grass: 1, dust: 300, post: true },
};
const texQuality = settings.quality; // the texture detail this page load was built with
const QUALITY = QUALITIES[settings.quality] || QUALITIES.high;
// logarithmic depth avoids z-fighting between close, nearly coplanar surfaces (cases, trims, glass)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: settings.quality !== 'low' });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY.pr));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = QUALITY.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG_OUT = new THREE.FogExp2(0x6a5a6a, 0.011), FOG_IN = new THREE.FogExp2(0x1a1412, 0.03);
scene.background = new THREE.Color(0x3a3048);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 600);

buildTextures(settings.quality);
const exterior = buildExterior(scene, settings.quality);
const room = buildFirstRoom(scene, QUALITY.shadow, settings.quality);
const ground = room.ground;
const lightLimiter = createLightLimiter(scene, CAPS.maxLights);
const lampMoths = createLampMoths(scene, settings.quality);

// low dusk sun: warm, raking, long shadows
const moonLight = new THREE.DirectionalLight(0xffc49a, 3.0);
moonLight.position.copy(SUN_DIR).multiplyScalar(120);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow);
Object.assign(moonLight.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 300 });
moonLight.shadow.bias = -0.0005; moonLight.shadow.normalBias = 0.05;
const sky = new THREE.HemisphereLight(0x9a9cc4, 0x4a4030, 1.5);
scene.add(moonLight, sky);

const player = new Player(camera, canvas);
// flashlight (F): held in the right hand, battery-limited (see flashlight.js)
scene.add(camera);
const flashlight = createFlashlight(camera, scene, { playClick });
// battery pickups: one in the grounds, one in the first room, one in the hallway
const BATTERIES = [
  { id: 'b1', zone: 'exterior', pos: new THREE.Vector3(CLIMB_SPOT.x + 1.6, 0, FENCE.front - 3.2), parent: () => exterior.group },
  { id: 'b2', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x - 1.0, 0, ROOM_ORIGIN.z + 2.2), parent: () => room.group },
  { id: 'b3', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 14, 0, ROOM_ORIGIN.z + 4.3), parent: () => room.group },
];
let batteriesTaken = new Set();
for (const b of BATTERIES) {
  b.mesh = batteryMesh(); b.mesh.rotation.y = Math.random() * 3;
  const par = b.parent(); par.updateMatrixWorld(true); b.mesh.position.copy(par.worldToLocal(b.pos.clone())); par.add(b.mesh);
}
// lanterns: carried in the same (right) hand as the torch; specimens go in the left
const lantern = createLantern(camera);
const LANTERNS = [
  { id: 'l1', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 4.2, 0, ROOM_ORIGIN.z + 3.8) },
  { id: 'l2', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 13.4, 0, ROOM_ORIGIN.z - 4.4) },
  { id: 'l3', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 32.9, 0, ROOM_ORIGIN.z + 2.4) },
  { id: 'l4', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 36.0, 0, ROOM_ORIGIN.z - 4.2) },
  { id: 'l5', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 37.6, 0, ROOM_ORIGIN.z + 45.6) },
  { id: 'l6', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + 36.8, 0, ROOM_ORIGIN.z + 95.6) },
  { id: 'l7', zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x + CATA.lantern.x, 0, ROOM_ORIGIN.z + CATA.lantern.z) },
];
let lanternsTaken = new Set();
for (const l of LANTERNS) {
  l.mesh = lanternMesh(); l.mesh.position.copy(l.pos).sub(ROOM_ORIGIN); l.mesh.rotation.y = Math.random() * 3; room.group.add(l.mesh);
  const glow = new THREE.PointLight(0xffb060, 0.6, 2.5, 2); glow.position.y = 0.16; l.mesh.add(glow);
}
function raiseLantern() {
  if (!lantern.have) return;
  if (flashlight.on) { flashlight.toggle(); updateBatteryHud(); }
  const on = lantern.raise(); if (on) playLantern();
  if (on && lantern.fuel <= 0) { lantern.lower(); say('The lantern is dry. Another one might still have paraffin in it.'); }
}
const batteryEl = $('battery'), batteryFill = $('batteryFill');
function updateBatteryHud() {
  batteryFill.style.width = Math.round(flashlight.battery * 100) + '%';
  batteryEl.classList.toggle('low', flashlight.battery < 0.15);
  batteryEl.classList.toggle('on', flashlight.on);
}

// ---------- zones ----------
let zone = 'exterior';
function setZone(z) {
  zone = z;
  const out = z === 'exterior';
  exterior.group.visible = out; room.group.visible = !out;
  moonLight.visible = sky.visible = out;
  scene.fog = out ? FOG_OUT : FOG_IN;
  scene.background.set(out ? 0x3a3048 : 0x050506);
}
const colliders = () => (zone === 'exterior' ? exterior.colliders : room.colliders);

// ---------- settings ----------
function applySettings() {
  player.sensitivity = settings.sensitivity;
  player.crouchToggle = !!settings.crouchToggle; if (!player.crouchToggle) player.crouchLatched = false;
  $('sCrouchToggle').checked = player.crouchToggle;
  setVolume(settings.volume);
  renderer.toneMappingExposure = 1.0 * settings.brightness;
  camera.fov = settings.fov; camera.updateProjectionMatrix();
  $('oSens').textContent = (+settings.sensitivity).toFixed(2);
  $('oVol').textContent = Math.round(settings.volume * 100) + '%';
  $('oBright').textContent = Math.round(settings.brightness * 100) + '%';
  $('oFov').textContent = settings.fov + '°';
}
const sliders = { sSens: 'sensitivity', sVol: 'volume', sBright: 'brightness', sFov: 'fov' };
for (const [id, key] of Object.entries(sliders)) {
  $(id).value = settings[key];
  $(id).addEventListener('input', e => { settings[key] = +e.target.value; applySettings(); saveSettings(settings); });
}
initAudioSettings(settings, saveSettings); // Music / Effects / Voice chat sliders (src/audio/)
// Quality applies in place (no reload): pixel ratio, shadow resolution and shadow
// filtering change immediately; texture resolution follows on the next load.
let composer = null;
function buildComposer() {
  const c = new EffectComposer(renderer);
  c.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  // light shafts, dust and other additive effects must not write into the AO depth/normals
  { const r0 = ao.render.bind(ao); const hidden = []; ao.render = (...a) => { hidden.length = 0; scene.traverseVisible(o => { if (o.userData.noAO) hidden.push(o); }); hidden.forEach(o => (o.visible = false)); r0(...a); hidden.forEach(o => (o.visible = true)); }; }
  ao.blendIntensity = 0.8; c.addPass(ao);
  // high threshold: only the lamp flame, sconces and lit glass bloom
  c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.65, 0.92));
  c.addPass(new OutputPass());
  return c;
}
let currentQ = QUALITY;
function applyQuality(q) {
  const Q = QUALITIES[q] || QUALITIES.high;
  currentQ = Q; if (typeof ground !== 'undefined') ground.setQuality(q); if (typeof lampMoths !== 'undefined') lampMoths.setQuality(q);
  if (typeof lightLimiter !== 'undefined') setTimeout(() => { lightLimiter.refresh(); lightLimiter.update(camera, true); });
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  // post effects (GTAO + bloom) fall back to plain rendering if this browser can't build them
  if (Q.post && !composer) { try { composer = buildComposer(); } catch (e) { console.warn('Post-processing unavailable:', e); QUALITIES.high.post = false; } }
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(innerWidth, innerHeight); }
  scene.traverse(o => {
    if (o.userData.grass) o.count = Math.round(o.userData.max * Q.grass);
    if (o.userData.dust) { o.geometry.setDrawRange(0, Q.dust); o.visible = Q.dust > 0; }
    if (o.isLight && o.shadow && !o.isDirectionalLight) {
      if (o.userData.shadowOn === undefined) o.userData.shadowOn = o.castShadow;
      o.castShadow = o.userData.shadowOn && Q.lampShadows;
    }
    if (o.material) for (const m of [].concat(o.material)) {
      if (!m.userData.pbrSaved) { m.userData.pbrSaved = true; m.userData.nm = m.normalMap; m.userData.rm = m.roughnessMap; }
      m.normalMap = Q.pbr ? m.userData.nm : null;
      m.roughnessMap = Q.pbr ? m.userData.rm : null;
    }
    if (o.isLight && o.shadow && o.castShadow) {
      const size = o.isDirectionalLight ? Q.shadow : Math.min(Q.shadow, 2048) / (o.isPointLight ? 2 : 1);
      o.shadow.mapSize.set(size, size);
      if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
    }
    if (o.material) for (const m of [].concat(o.material)) { m.dithering = true; m.needsUpdate = true; }
  });
}
$('sCrouchToggle').addEventListener('change', e => { settings.crouchToggle = e.target.checked; saveSettings(settings); applySettings(); });
$('sQuality').addEventListener('change', e => {
  settings.quality = e.target.value; saveSettings(settings);
  applyQuality(settings.quality);
  const texDiff = settings.quality !== texQuality;
  $('qualityNote').textContent = texDiff ? 'Applied. Texture detail changes after a restart.' : 'Applied.';
  $('btnReloadTex').classList.toggle('hidden', !texDiff);
});
// reload keeping progress: the save point stays, and the game resumes from it straight away
$('btnReloadTex').onclick = () => { try { sessionStorage.setItem('pinned.autoContinue', '1'); } catch {} location.reload(); };
applySettings();
applyQuality(settings.quality);
initAccessibilitySettings({ settings, saveSettings });

// ---------- interactions ----------
const msgEl = $('message'), promptEl = $('prompt');
let msgTimer;
function say(text, ms = 4000) {
  msgEl.textContent = text; msgEl.style.opacity = 1;
  clearTimeout(msgTimer); msgTimer = setTimeout(() => (msgEl.style.opacity = 0), ms);
}

// ---------- the Catacombs (catacombsPlay.js): their interactions, puzzles, hints and save ----------
const catPlay = createCatacombsPlay({
  cat: ground.cat, ROOM_ORIGIN, player, camera, lantern, flashlight, say, canvas, fogIn: FOG_IN,
  sfx: { playThud, playCreak, playGrind, playClick, playSoftClicks },
  save: (cp) => save(cp), transition, zone: () => zone, volume: () => settings.volume,
  openLock: (id) => openPadlock(id),
  setModal: (on) => { if (on) { state = 'modal'; player.enabled = false; if (document.pointerLockElement) document.exitPointerLock(); } else { state = 'playing'; player.enabled = true; lock(); } },
  die: () => {
    state = 'cutscene'; player.enabled = false; $('fade').style.opacity = 1;
    setTimeout(() => { const s = loadSave(); spawnAt(s ? s.checkpoint : null, s || {}); $('fade').style.opacity = 0; state = 'playing'; player.enabled = true; say('Dark, and then nothing. You are back where you last saved.', 6000); }, 3200);
  },
  toChapel: () => transition(() => { player.place(ROOM_ORIGIN.x + CELLAR.stairE.x, ROOM_ORIGIN.z + CELLAR.stairE.z - 0.3, 0); playThud(); }),
  toFirstFloor: () => transition(() => { player.place(ROOM_ORIGIN.x + FIRST.spawn.x, ROOM_ORIGIN.z + FIRST.spawn.z, Math.PI); playThud(); if (!visited.first) { visited.first = true; save('firstfloor'); say('The first floor. Silk everywhere, on the walls, in the corners, over the shapes on the trestles.', 7000); } }),
});
// ---------- the attic (see atticPlay.js, world/attic.js) ----------
const atticPlay = createAtticPlay({
  ground, room, origin: ROOM_ORIGIN, firstLadder: FIRST.ladderD, player, camera, say, save, transition, updateHeld, openPadlock,
  sfx: { thud: playThud, creak: playCreak, grind: playGrind, clicks: playSoftClicks },
  modal: { open() { state = 'overlay'; player.enabled = false; if (document.pointerLockElement) document.exitPointerLock(); }, close() { state = 'playing'; player.enabled = true; lock(); } },
  visited: () => visited,
});
// ---------- the extra rooms (roomsPlay.js, world/extraRooms.js) ----------
const roomsPlay = createRoomsPlay({ origin: ROOM_ORIGIN, player, say, transition, sfx: { thud: playThud, creak: playCreak } });
// ---------- The Mother (motherPlay.js) ----------
const motherPlay = createMotherPlay({
  ground, origin: ROOM_ORIGIN, player, camera, flashlight, lantern, say, colliders: () => colliders(),
  sfx: { flutter: (l) => { captionSound('[wings fluttering]'); playFlutter(l); }, clicks: (l, n) => { captionSound('[clicking nearby]'); playClicksAt(l, n); } }, detectScale: () => catPlay.detectScale,
  active: () => state === 'playing' && zone === 'room', playerCount: () => playerCount(),
  caught: () => {
    state = 'cutscene'; player.enabled = false; playFlutter(1); playClicksAt(1, 6);
    say('Wings close over you, soft and enormous, and the light goes out.', 3000);
    setTimeout(() => { $('fade').style.opacity = 1; }, 600);
    setTimeout(() => { const s = loadSave(); spawnAt(s ? s.checkpoint : null, s || {}); $('fade').style.opacity = 0; state = 'playing'; player.enabled = true; say('Dark, and then nothing. You are back where you last saved.', 6000); }, 3400);
  },
});
// how many are in the house (1 alone): The Mother is busier the more of you there are
function playerCount() { return mp && mp.active ? Math.max(1, Math.min(4, mp.count)) : 1; }
// caught in the chase together: no reload (the house goes on for the others); you wake at the top of the ladder
let escDead = false;
function caughtTogether() {
  if (escDead) return;
  escDead = true; state = 'cutscene'; player.enabled = false; playFlutter(1); playClicksAt(1, 6);
  if (motherPlay.hidden) motherPlay.reset();
  say('Wings close over you, soft and enormous, and the light goes out.', 3000);
  setTimeout(() => { if (state === 'cutscene') $('fade').style.opacity = 1; }, 600);
  setTimeout(() => {
    escDead = false; $('fade').style.opacity = 0;
    if (state !== 'cutscene') return; // the ending began meanwhile
    const sp = escape.spawn(); setZone('room'); player.place(ROOM_ORIGIN.x + sp.x, ROOM_ORIGIN.z + sp.z, sp.yaw);
    state = 'playing'; player.enabled = true; say('The top of the ladder. Behind you, in the dark, she is coming.', 5000);
  }, 3400);
}
// ---------- the escape: the finale chase (escape.js) and the ending (ending.js) ----------
const escape = createEscape({
  room, ground, origin: ROOM_ORIGIN, player, camera, flashlight, lantern, say, motherPlay,
  sfx: { flutter: playFlutter, clicks: playClicksAt, thud: playThud, creak: playCreak, grind: playGrind, glass: playGlass, softClicks: playSoftClicks },
  colliders: () => colliders(), active: () => state === 'playing' && zone === 'room', visited: () => visited, save: (cp) => save(cp),
  mpClient: () => !!(mp && mp.isClient),
  net: { active: () => !!(mp && mp.active), players: () => mp.players, toAll: (m, except) => mp.escSend(m, except), toOne: (id, m) => mp.escSend(m, null, id), toHost: (m) => mp.escSend(m) },
  playerCount: () => playerCount(), caughtMP: () => caughtTogether(), state: () => state,
  inGame: () => state !== 'home' && state !== 'ending',
  localAlive: () => !escDead && zone === 'room' && ['playing', 'paused', 'modal', 'overlay'].includes(state),
  caught: () => {
    state = 'cutscene'; player.enabled = false; playFlutter(1); playClicksAt(1, 6);
    say('Wings close over you, soft and enormous, and the light goes out.', 3000);
    setTimeout(() => { $('fade').style.opacity = 1; }, 600);
    setTimeout(() => { const s = loadSave(); spawnAt(s ? s.checkpoint : null, s || {}); $('fade').style.opacity = 0; state = 'playing'; player.enabled = true; say('The top of the ladder. Behind you, in the dark, she is coming.', 5000); }, 3400);
  },
  onEnd: () => {
    state = 'ending'; player.enabled = false; show('hud', false); promptEl.textContent = '';
    if (document.pointerLockElement) document.exitPointerLock();
    if (flashlight.on) flashlight.toggle(); if (lantern.on) lantern.lower();
    // the secret ending: every moth note in the house collected (counted from MOTH_NOTES, so new ones count too)
    const allNotes = MOTH_NOTES.length, have = new Set(mothsTaken.filter(id => NOTE_BY_ID[id])).size;
    const sv = loadSave() || {}, slotName = (sv.name || '').trim();
    // the save is done with: Continue no longer replays the chase (it offers to start over)
    if (!(mp && mp.isClient) && sv.checkpoint) writeSave({ ...sv, completed: true });
    let remembered = sv.collectedName; try { remembered = remembered || localStorage.getItem('pinned.collectedName'); } catch {}
    ending.start({ secret: allNotes > 0 && have >= allNotes ? {
      name: remembered || (slotName && !/^Save \d+$/.test(slotName) ? slotName : ''),
      onName: (n) => { try { localStorage.setItem('pinned.collectedName', n); } catch {} const cur = loadSave(); if (cur && !(mp && mp.isClient)) writeSave({ ...cur, collectedName: n }); },
    } : null });
  },
});
const ending = createEnding({ renderer, quality: settings.quality, sfx: { click: playClick, flutter: playFlutter },
  onDone: () => { if (mp && mp.active) mp.leave(); show('hud', false); show('home', true); state = 'home'; player.enabled = false; backdrop.start(); refreshHome(); } });
const interactables = [
  ...escape.interactables,
  ...motherPlay.interactables,
  // during the escape her key's prompt at the tunnel must win over the old 'examine' one
  ...catPlay.interactables.map(it => it.prompt === 'E  examine the tunnel' ? { ...it, when: () => !escape.chasing } : it),
  ...LANTERNS.map(l => ({
    zone: l.zone, pos: l.pos, r: 1.1, when: () => !lanternsTaken.has(l.id), prompt: 'E  take the lantern',
    act: () => {
      const first = !lantern.have; lanternsTaken.add(l.id); l.mesh.visible = false; lantern.pickUp(0.85); raiseLantern(); if (!lantern.on) raiseLantern();
      say(first ? 'A paraffin lantern, still half full. L raises or lowers it; it shares a hand with the torch.' : 'Another lantern. You pour its paraffin into yours.', 6000);
    },
  })),
  ...BATTERIES.map(b => ({
    zone: b.zone, pos: b.pos, r: 1.1, when: () => !batteriesTaken.has(b.id), prompt: 'E  take the batteries',
    act: () => { batteriesTaken.add(b.id); b.mesh.visible = false; flashlight.addBattery(0.5); updateBatteryHud(); say('Two batteries, still in their sleeve. They should be good for the torch.'); },
  })),
  {
    zone: 'exterior', pos: new THREE.Vector3(CLIMB_SPOT.x, 0, FENCE.front + 1), r: 1.7,
    when: () => player.pos.z > FENCE.front, prompt: 'E  climb the fence',
    act: () => climb(new THREE.Vector3(CLIMB_SPOT.x, 0, FENCE.front - 1.4), 1.8, 2.4, () => {
      playThud(); say('Over. The grass here hasn’t been cut in years.');
      save('grounds');
    }),
  },
  {
    zone: 'exterior', pos: new THREE.Vector3(GATE.x, 0, GATE.z + 0.8), r: 1.8,
    when: () => player.pos.z > FENCE.front, prompt: 'E  try the gate',
    act: () => say('Chained shut. The padlock has rusted solid. Maybe somewhere along the fence…'),
  },
  {
    zone: 'exterior', pos: new THREE.Vector3(FRONT_DOOR.x, 0, FRONT_DOOR.z + 1.4), r: 1.8, prompt: 'E  try the doors',
    act: () => say('Boarded shut. Above the door, a mosaic moth stares down with red eyes.'),
  },
  {
    zone: 'exterior', pos: new THREE.Vector3(BROKEN_WINDOW.x, 0, BROKEN_WINDOW.z + 1.0), r: 2.6, prompt: 'E  climb in through the window',
    act: () => transition(() => {
      setZone('room'); player.place(ROOM_SPAWN.x, ROOM_SPAWN.z, 0); playGlass();
      say('Glass crunches underfoot. The air smells of dust and old wax.');
      save('room');
    }),
  },
  {
    zone: 'room', pos: ROOM_WINDOW, r: 1.6, prompt: 'E  climb back out',
    act: () => transition(() => { setZone('exterior'); player.place(BROKEN_WINDOW.x, BROKEN_WINDOW.z + 1.3, Math.PI); }),
  },
  {
    zone: 'room', pos: ROOM_LAMP, r: 1.5,
    prompt: () => (room.lampOn ? 'E  turn the lamp down' : 'E  light the oil lamp'),
    act: () => {
      room.setLamp(!room.lampOn); playLamp(room.lampOn);
      if (room.lampOn) say('The wick catches. Warm light crawls up the walls, and every pinned moth seems to lean towards it.');
      const sv = loadSave(); if (sv && !(mp && mp.isClient)) writeSave({ ...sv, lampLit: room.lampOn });
    },
  },
  {
    zone: 'room', pos: ROOM_DOOR, r: 1.6, prompt: 'E  try the door',
    act: () => say('It will not budge. The lock has rusted solid, and the keyhole is packed with old wax.'),
  },
  {
    zone: 'room', pos: ROOM_PANEL, r: 1.3, when: () => !room.panelOpen, prompt: 'E  examine the panelling',
    act: () => say('A section of panelling. There is a hairline gap around it, and cold air seeps through.'),
  },
  {
    zone: 'room', pos: ROOM_MOSAIC, r: 1.9, prompt: 'E  examine the mosaic',
    act: () => say(room.lampOn
      ? 'In the lamplight, five small moths appear in the lower border of the mosaic, picked out in coloured tiles from left to right.'
      : 'The Order of the Pale Wing. It is too dim to make out the finer tiles. More light would help.', 6500),
  },
  // the five numbered specimen stands
  ...ROOM_STANDS.map((pos, i) => ({
    zone: 'room', pos, r: 1.4,
    prompt: () => {
      const st = room.puzzle.stands[i], n = ['I', 'II', 'III', 'IV', 'V'][i], held = room.puzzle.held;
      if (room.puzzle.solved) return null;
      if (st.item && held) return `E  swap for the ${SPECIES[held].common} (stand ${n})`;
      if (st.item) return `E  take the ${SPECIES[st.item].common} from stand ${n}`;
      if (held) return `E  place the ${SPECIES[held].common} on stand ${n}`;
      return `Stand ${n}: an empty specimen frame`;
    },
    act: () => {
      const P = room.puzzle, st = P.stands[i];
      if (P.solved || (!st.item && !P.held)) return;
      P.useStand(st); updateHeld();
      if (P.filled()) checkSequence();
    },
  })),
  // ground floor doors
  ...Object.values(ground.doors).map(d => ({
    zone: 'room', pos: d.pos.clone().add(ROOM_ORIGIN), r: 1.3, when: () => !d.isOpen && !d.custom,
    prompt: () => d.boarded ? 'E  examine the boarded door' : d.id === 'stairC' && d.locked && ground.dinner.solved ? 'E  try the padlock' : d.locked ? 'E  try the door' : 'E  open the door',
    act: () => {
      if (d.id === 'stairC' && d.locked && ground.dinner.solved) { openPadlock(); return; }
      if (d.locked) { say(d.msg, 6000); playCreak(); return; }
      d.open(); playDoor(); if (d.openMsg) say(d.openMsg, 5000);
    },
  })),
  ...ground.dinner.seats.map(st => ({
    zone: 'room', pos: st.pos.clone().add(ROOM_ORIGIN), r: 0.75, when: () => !ground.dinner.solved,
    prompt: () => {
      const h = room.puzzle.held;
      if (!h && st.key) return `E  lift the ${SPECIES[st.key].common} from the chair`;
      if (h && !st.key) return `E  pin the ${SPECIES[h].common} to this chair`;
      if (h && st.key) return `E  swap the ${SPECIES[h].common} for the ${SPECIES[st.key].common}`;
      return `An empty chair: ${st.name}`;
    },
    act: () => {
      const P = room.puzzle, h = P.held; if (!h && !st.key) return;
      const prev = ground.dinner.use(st, h); P.held = prev; updateHeld(); playThud();
      if (h) say(`You pin the ${SPECIES[h].common} to the chair at ${st.name}.`, 3000);
      if (ground.dinner.filled()) checkDinner();
    },
  })),
  ...ground.dinner.seats.filter(st => st.digit).map(st => ({
    zone: 'room', pos: st.pos.clone().add(ROOM_ORIGIN), r: 0.75, when: () => ground.dinner.solved && !st.flipped, prompt: 'E  turn over the plate',
    act: () => { st.flipped = true; playThud(); say(`Scratched into the glaze underneath: ${st.digit.replace(' · ', ', and the figure ')}.`, 7000); },
  })),
  {
    zone: 'room', pos: ground.note.position.clone().add(ROOM_ORIGIN), r: 1.3, prompt: 'E  read the note',
    act: () => say(SEATING_NOTE, 18000),
  },
  {
    zone: 'room', pos: ground.journal.position.clone().add(ROOM_ORIGIN), r: 1.3, prompt: 'E  read the journal',
    act: () => say(JOURNAL, 16000),
  },
  ...ground.mirrors.map(m => ({
    zone: 'room', pos: m.pos.clone().add(ROOM_ORIGIN), r: 1.6, prompt: 'E  look in the mirror',
    act: () => say(MIRROR_TEXT[m.stage] || MIRROR_TEXT[1], 7000),
  })),
  // ---- moth specimens: the story, one message each ----
  ...MOTH_NOTES.map(n => ({
    zone: 'room', pos: W(new THREE.Vector3(...n.pos)), r: 1.4, when: () => !mothsTaken.includes(n.id),
    prompt: `E  take the ${SPECIES[n.key].common}`, act: () => takeMoth(n),
  })),
  // ---- stairs between floors ----
  { zone: 'room', pos: W(ground.doors.stairC.pos), r: 1.3, when: () => ground.doors.stairC.isOpen, prompt: 'E  go down the cellar stairs',
    act: () => transition(() => { player.place(ROOM_ORIGIN.x + CELLAR.spawn.x, ROOM_ORIGIN.z + CELLAR.spawn.z, Math.PI); playThud(); if (!visited.cellar) { visited.cellar = true; save('cellar'); say('The cellar. Cold stone, and under the cold, a faint warmth, like breath.', 6000); } }) },
  { zone: 'room', pos: W(CELLAR.stairC), r: 1.2, prompt: 'E  climb up to the kitchen',
    act: () => transition(() => player.place(ROOM_ORIGIN.x + 36.6, ROOM_ORIGIN.z - 9.3, Math.PI)) },
  // the old back stair B: its cellar gate stays shut; the stair is reached from the Catacombs
  { zone: 'room', pos: W(CELLAR.shaft), r: 1.2, prompt: 'E  try the gate',
    act: () => { playCreak(); say('An iron gate across the old back stair. It is bolted from the other side, the bolts rusted solid. This stair must be reached from somewhere else, somewhere deeper.', 7000); } },
  { zone: 'room', pos: W(FIRST.stairB), r: 1.1, prompt: 'E  go down the back stair',
    act: () => transition(() => player.place(ROOM_ORIGIN.x + CATA.stairBFoot.x, ROOM_ORIGIN.z + CATA.stairBFoot.z, Math.PI)) },
  { zone: 'room', pos: W(CELLAR.stairE), r: 1.5, prompt: () => ground.lu.stairEOpen ? 'E  go down into the catacombs' : 'E  look down the steps',
    act: () => {
      if (!ground.lu.stairEOpen) { playCreak(); say('Steps go on down, below the cellar, behind a locked grille. The air coming up smells of earth and something sweet. Not yet.', 6000); return; }
      transition(() => { player.place(ROOM_ORIGIN.x + CATA.spawn.x, ROOM_ORIGIN.z + CATA.spawn.z, Math.PI); playThud(); if (!visited.catacombs) { visited.catacombs = true; save('catacombs'); say('The catacombs. Bones, stacked like firewood, as far as the light goes. The air is wet and very still.', 7000); } });
    } },
  { zone: 'room', pos: W(FIRST.ladderD), r: 1.2, prompt: () => ground.lu.deskOpen ? 'E  climb the ladder' : 'E  try the ladder',
    act: () => atticPlay.climbLadderD() },
  { zone: 'room', pos: W(FIRST.stairA), r: 1.3, prompt: 'E  look down the main stair',
    act: () => say('The main stair, choked with the fallen landing. Far below, the Grand Hall. No way down here.', 5000) },
  // ---- cellar ----
  { zone: 'room', pos: W(ground.lu.wardrobe.pos), r: 1.3, prompt: () => ground.lu.wardOpen ? 'E  read the scratches inside the door' : 'E  open the wardrobe',
    act: () => {
      if (!ground.lu.wardOpen) { ground.lu.openWardrobe(); ground.extra.wardrobeSwarm(); playCreak(); flashlight.scare && flashlight.scare(); say('The doors swing open and a cloud of tiny pale moths pours out, into your face, your hair. The coats inside are eaten to lace. There is writing scratched inside the door.', 8000); return; }
      say(WARDROBE_VERSE, 14000);
    } },
  ...ground.lu.tiles.map(t => ({
    zone: 'room', pos: W(t.pos), r: 0.5, when: () => !ground.lu.altarSolved && !t.pressed, prompt: `E  press the carved stone`,
    act: () => {
      const res = ground.lu.pressTile(t); playThud();
      if (res === 'pressed') say(`The stone sinks into the altar with a grinding click.`, 2500);
      if (res === 'wrong') { playCreak(); say('The stones grind back out, one after another. Wrong. The altar wants her life in its proper order.', 5000); }
      if (res === 'solved') { playSoftClicks(4); playGrind(); say('The last stone sinks home. Somewhere below, a grate scrapes open. At the far end of the chapel, past the pews in the right-hand corner, light comes up from the steps going down.', 9000); save('chapel');
        let k = 0; const quake = setInterval(() => { player.pitch += (k % 2 ? -1 : 1) * 0.012; if (++k > 12) clearInterval(quake); }, 45); setTimeout(() => playGrind(), 900); }
    } })),
  // ---- first floor ----
  { zone: 'room', pos: W(ground.lu.countdown.pos), r: 2.0, prompt: 'E  look at the wall',
    act: () => say('Numbers scratched into the plaster with something sharp, counting down: sixty-six, sixty-five… each one struck through. The last, forty-eight, is circled again and again. Underneath: until I wake.', 10000) },
  { zone: 'room', pos: W(ground.lu.desk.pos), r: 1.2, prompt: () => ground.lu.deskOpen ? 'An empty drawer.' : 'E  try the desk',
    act: () => { if (ground.lu.deskOpen) return; openPadlock('desk'); } },
  ...atticPlay.interactables,
  ...roomsPlay.interactables,
];
function W(v) { return new THREE.Vector3(v.x, 0, v.z).add(ROOM_ORIGIN); }
const visited = {};
const MIRROR_TEXT = {
  1: 'You look tired. Dust in your hair, a smudge on your cheek. Just you.',
  2: 'You, again. Paler than you remember, and somehow taller. The skin looks very smooth in this light.',
  3: 'Your eyes look darker than they should. Larger, too, or is it the candle? You blink. The reflection takes its time.',
  4: 'A soft pale down along your hairline, like dust that will not brush away. Your skin has a faint powdery sheen.',
  5: 'Your neck seems longer. Your fingers too. You are standing very, very still.',
  6: 'Under the skin of your cheeks, faint markings, like the pattern on a wing seen through paper. You touch your face. Nothing there.',
  7: 'Your eyes catch the light and throw it back, the way a cat’s do at night.',
  8: 'Almost perfect. Almost you. It smiles a moment before you do.',
};
let current = null;
const ray = new THREE.Raycaster(); ray.far = 2.6;
const centre = new THREE.Vector2(0, 0);
const FLAVOUR_EMPTY = 'Empty, apart from moth-eaten tissue paper.';
// The specimen cabinet: aim at a drawer to open, close, take or return a specimen.
function cabinetInteraction() {
  if (zone !== 'room' || Math.hypot(player.pos.x - ROOM_CABINET.x, player.pos.z - ROOM_CABINET.z) > 2.3) return null;
  ray.setFromCamera(centre, camera);
  const hit = ray.intersectObjects(room.pickables, false)[0];
  if (!hit) return { prompt: 'Aim at a drawer to open it', act: () => say('A specimen cabinet. Eight drawers, each labelled in a careful hand.') };
  const P = room.puzzle, d = hit.object.userData.drawer, item = d.userData.item;
  const open = d.userData.target > 0;
  if (!open) return { prompt: 'E  open the drawer', act: () => { d.userData.target = 1; playDrawer(true); if (!item) say(FLAVOUR_EMPTY); } };
  if (item && !P.held) return { prompt: `E  take the ${SPECIES[item].common}`, act: () => { P.takeFromDrawer(d); updateHeld(); halluc.addDust(0.1); } };
  if (!item && P.held) return { prompt: `E  put the ${SPECIES[P.held].common} in the drawer   ·   Q  close it`, act: () => { P.putIntoDrawer(d); updateHeld(); }, alt: () => { d.userData.target = 0; } };
  return { prompt: 'E  close the drawer', act: () => { d.userData.target = 0; playDrawer(false); } };
}
// the Specimen Study board: lift a case, then choose another to swap it with
const BOARD_POS = new THREE.Vector3(ROOM_ORIGIN.x + 15.5, 0, ROOM_ORIGIN.z - 5.35);
function lifespanInteraction() {
  if (zone !== 'room' || Math.hypot(player.pos.x - BOARD_POS.x, player.pos.z - BOARD_POS.z) > 3.2) return null;
  ray.setFromCamera(centre, camera); ray.far = 3.4;
  const hit = ray.intersectObjects(ground.pickables, false)[0]; ray.far = 2.6;
  if (!hit) return null;
  const key = hit.object.userData.lifeCase, L = ground.lifespan, name = SPECIES[key].common;
  if (L.solved) return { prompt: `${name}, ${SPECIES[key].latin}`, act: () => {} };
  const lifted = L.lifted !== null ? L.order[L.lifted] : null;
  const prompt = lifted === null ? `E  lift the ${name}` : lifted === key ? `E  hang the ${name} back` : `E  swap with the ${SPECIES[lifted].common}`;
  return { prompt, act: () => {
    const res = ground.useCase(key); playThud();
    if (res === 'lifted') say(`You lift the ${name} off its hook.`, 2500);
    if (res === 'replaced') say(`You hang the ${name} back where it was.`, 2500);
    if (res === 'swapped' && !ground.lifespanCorrect()) {
      const n = L.order.filter((k, i) => k === LIFESPAN_ORDER[i]).length;
      playSoftClicks(n);
      say(`You swap the ${SPECIES[lifted].common} and the ${name}. ${n ? `${n === 1 ? 'One case clicks' : `${n} cases click`} softly against the board.` : 'Nothing clicks.'} Not quite. Something is out of place.`, 5000);
    }
    if (res === 'swapped' && ground.lifespanCorrect()) {
      playSoftClicks(5);
      ground.solveLifespan(); playGrind();
      say('The last case settles on its hook. Behind the walls, something heavy slides, and down the hallway a bolt draws back.', 7000);
      save('study');
    }
  } };
}
// ---------- hints: up to three per puzzle, from a nudge to the near-answer ----------
const HINTS = {
  room: [
    'The room is too dark to read properly. The oil lamp on the side table would help, and so would a closer look at the mosaic over the fireplace.',
    'By lamplight the mosaic’s lower border shows five small moths, left to right. The cabinet drawers hold boxed specimens, and there are five numbered stands around the room.',
    'Match the stands to the border, I to V: Rosy maple, Garden tiger, Comet moth, Oleander hawkmoth, White ermine. The Io and the Elephant hawkmoth are decoys.',
  ],
  study: [
    'Someone in this study kept notes. The journal on the desk might explain the board on the wall.',
    'The journal gives each moth’s life on the wing. Hang the cases from the shortest life to the longest, left to right.',
    'Left to right: Emperor moth, Polyphemus, Puss moth, Elephant hawkmoth, Death’s-head hawkmoth.',
  ],
};
HINTS.dinner = [
  'There is a seating plan on the kitchen table. Each dining chair has a moth pinned to its back: the moths are the guests.',
  'Read the plan as moths: the pale one is the White ermine, the blood-drinker the Vampire moth, the one who eats everything the Clothes moth, the giant the Cecropia, the tiger the Garden tiger, the rosy one the Rosy maple.',
  'Head: White ermine. Foot: Vampire moth. Sideboard side by the foot: Clothes moth, with the Cecropia across from it. Sideboard side by the head: Garden tiger. North side by the head: Rosy maple.',
];
HINTS.padlock = [
  'The plan said to turn the plates once the guests were seated.',
  'Four of the plates have a numeral and a figure underneath. Read them from I to IV.',
  'The padlock code is 1 8 8 7.',
];
HINTS.altar = [
  'The Herald moth pinned above the boiler says to walk the clothes moth’s life at the altar, from the first day. Something in the boiler room may say how that life goes.',
  'Open the wardrobe in the boiler room and read what is scratched inside its door. Each carved stone on the altar is one stage of that life.',
  'Press the stones in this order: the eggs, the grub, the cocoon, the wings.',
];
HINTS.desk = [
  'The desk in the leader’s room has a four-figure letter-lock. The Peppered moth on the library table is about it.',
  'The Peppered moth’s card says eighteen-hundred-and-something: the rest is the number the girl in the Luna bedroom stopped counting at.',
  'The desk code is 1 8 4 8.',
];
Object.assign(HINTS, catPlay.hints);
let hintState = {}, stuckTime = 0, nudged = {};
function currentPuzzle() {
  if (zone !== 'room') return null;
  const x = player.pos.x - ROOM_ORIGIN.x, z = player.pos.z - ROOM_ORIGIN.z;
  if (x < 7.2 && !room.puzzle.solved) return 'room';
  if (x > 10.9 && x < 20 && z < 1.25 && !ground.lifespan.solved) return 'study';
  return extraPuzzle ? extraPuzzle(x, z) : null;
}
const extraPuzzle = (x, z) => {
  const cp = catPlay.puzzleAt(x, z); if (cp) return cp;
  const ap = atticPlay.puzzleAt(x, z); if (ap) return ap;
  const dining = x > 34.2 && x < 44 && z > 1 && z < 10, kitchen = x > 34.2 && x < 44 && z > -10 && z < -2.9;
  if ((dining || kitchen) && !ground.dinner.solved) return 'dinner';
  if ((dining || kitchen) && ground.doors.stairC.locked) return 'padlock';
  if (x > 29 && x < 59 && z > 39 && z < 58 && !ground.lu.altarSolved) return 'altar';
  if (x > 29 && x < 59 && z > 79 && z < 98 && !ground.lu.deskOpen) return 'desk';
  return null;
};
// Hints are rationed: at most three for each pair of rooms. After that, the voice in your
// head has had enough. The count is kept in the save.
const HINT_GROUP = { room: 'drawing+study', study: 'drawing+study', dinner: 'dining+kitchen', padlock: 'dining+kitchen', altar: 'boiler+chapel', desk: 'library+leader' };
Object.assign(HINT_GROUP, catPlay.hintGroups);
Object.assign(HINTS, atticPlay.hints); Object.assign(HINT_GROUP, atticPlay.hintGroups);
const HINT_LIMIT = 3;
const HINT_REFUSALS = ['I don’t feel like it.', 'Stop asking.', 'Stop bothering me.', 'I can’t do everything.', 'STOP.'];
let hintsUsed = {};
function showHint() {
  const p = currentPuzzle();
  if (!p) { say('Nothing here seems to need solving right now.', 3000); return; }
  const grp = HINT_GROUP[p] || p;
  if ((hintsUsed[grp] || 0) >= HINT_LIMIT) {
    // past the (unstated) limit: refuse, more and more crossly, then just STOP
    const k = (hintsUsed[grp + ':no'] || 0); hintsUsed[grp + ':no'] = k + 1;
    say(HINT_REFUSALS[Math.min(k, HINT_REFUSALS.length - 1)], 3000); return;
  }
  hintsUsed[grp] = (hintsUsed[grp] || 0) + 1;
  const n = Math.min(HINTS[p].length, (hintState[p] || 0) + 1); hintState[p] = n; stuckTime = 0;
  say(`Hint ${n}: ${HINTS[p][n - 1]}`, 11000);
  save(lastCheckpoint || 'room');
}
// a gentle nudge if the player has been in a puzzle room for a few minutes without a hint
function hintTick(dt) {
  const p = currentPuzzle(); if (!p) { stuckTime = 0; return; }
  stuckTime += dt;
  if (stuckTime > 180 && !nudged[p] && !hintState[p]) { nudged[p] = true; say(`${HINTS[p][0]} (Press H for more hints.)`, 10000); }
}
$('btnHint').onclick = () => { resume(); setTimeout(showHint, 300); };
function checkDinner() {
  const D = ground.dinner;
  if (D.correct()) {
    D.solve(); D.rattle(); playCreak(); playSoftClicks(6);
    say('Every guest in their place. The plates rattle on the cloth, as if the whole table shivered. Something scrapes underneath them.', 7000);
    save('dining');
  } else {
    const n = D.seats.filter((st, i) => st.key === DINNER_SOLUTION[i]).length;
    playSoftClicks(n);
    say(`The table stays still. ${n ? `${n === 1 ? 'One chair creaks' : `${n} chairs creak`} quietly under its guest. ` : ''}Not quite. Someone is sitting in the wrong place.`, 5000);
  }
}
// ---------- the cellar padlock: four brass dials ----------
const dials = [0, 0, 0, 0]; let dialSel = 0, dialBase = 10;
function drawDials() { if (!$('padlock').classList.contains('hidden')) playDial(); document.querySelectorAll('#padlock .dial').forEach((el, i) => { el.querySelector('span').textContent = dialBase === 26 ? String.fromCharCode(65 + dials[i]) : dials[i]; el.classList.toggle('sel', i === dialSel); }); }
let padTarget = 'cellar';
function openPadlock(target = 'cellar') {
  const info = atticPlay.lockInfo(target), base = info ? info.base : 10;
  dialBase = base; dials.fill(0); dialSel = 0; $('padlockMsg').textContent = '';
  padTarget = target; document.querySelector('#padlock h2').textContent = info ? info.title : catPlay.locks[target] ? catPlay.locks[target].title : target === 'desk' ? 'A brass letter-lock on the desk drawer' : 'A brass padlock';
  state = 'padlock'; player.enabled = false; show('padlock', true); drawDials();
  if (document.pointerLockElement) document.exitPointerLock();
}
function closePadlock() { show('padlock', false); state = 'playing'; player.enabled = true; lock(); }
function tryPadlock() {
  const xl = catPlay.locks[padTarget];
  if (xl) { if (dials.join('') === xl.code) { playThud(); closePadlock(); xl.onOpen(); } else { playCreak(); $('padlockMsg').textContent = xl.fail; } return; }
  const res = atticPlay.tryLock(padTarget, dials);
  if (res) { if (res.ok) closePadlock(); else { playCreak(); $('padlockMsg').textContent = res.msg; } return; }
  if (padTarget === 'desk') {
    if (dials.join('') === DESK_CODE) {
      ground.lu.openDesk(); playThud(); closePadlock();
      say('The dials click into line and the drawer slides out. Inside, on a brass tag stamped LINEN, a key. You take it.', 7000);
      save('leader');
    } else { playCreak(); $('padlockMsg').textContent = 'The drawer does not move.'; }
    return;
  }
  if (dials.join('') === '1887') {
    const d = ground.doors.stairC; d.locked = false; d.open(); playThud(); closePadlock();
    say('The shackle drops open. The door swings in on cold, damp air and stone steps going down.', 7000);
    save('kitchen');
  } else { playCreak(); $('padlockMsg').textContent = 'The shackle does not move.'; }
}
document.querySelectorAll('#padlock .dial').forEach((el, i) => {
  el.querySelector('.up').onclick = () => { dials[i] = (dials[i] + 1) % dialBase; dialSel = i; drawDials(); };
  el.querySelector('.down').onclick = () => { dials[i] = (dials[i] + dialBase - 1) % dialBase; dialSel = i; drawDials(); };
});
$('padlockTry').onclick = tryPadlock; $('padlockClose').onclick = closePadlock;
addEventListener('keydown', e => {
  if (state !== 'padlock') return;
  if (e.code === 'ArrowLeft') dialSel = (dialSel + 3) % 4; if (e.code === 'ArrowRight') dialSel = (dialSel + 1) % 4;
  if (e.code === 'ArrowUp') dials[dialSel] = (dials[dialSel] + 1) % dialBase; if (e.code === 'ArrowDown') dials[dialSel] = (dials[dialSel] + dialBase - 1) % dialBase;
  if (dialBase === 10 && /^Digit\d$/.test(e.code)) { dials[dialSel] = +e.code.slice(5); dialSel = Math.min(3, dialSel + 1); }
  if (dialBase === 26 && /^Key[A-Z]$/.test(e.code)) { dials[dialSel] = e.code.charCodeAt(3) - 65; dialSel = Math.min(3, dialSel + 1); }
  if (e.code === 'Enter') tryPadlock(); if (e.code === 'Escape') closePadlock();
  if (e.code !== 'Enter') $('padlockMsg').textContent = ''; drawDials();
});
// HUD: the specimen in hand
function updateHeld() {
  const k = room.puzzle.held, el = $('held');
  el.classList.toggle('hidden', !k);
  if (!k) return;
  $('heldImg').src = specimenCanvas(k).toDataURL('image/png');
  $('heldName').textContent = `${SPECIES[k].common} (${SPECIES[k].latin})`;
}
function checkSequence() {
  const P = room.puzzle;
  if (P.correct()) {
    P.solved = true; room.openPanel(); playGrind();
    say('The frames click, one after another. Stone grinds in the east wall, and a panel slides back onto a dark hallway.', 7000);
    save('hallway');
  } else {
    P.rattle(); playCreak();
    say('The specimens rattle in their frames. Something in the wall creaks, then settles. Nothing else happens.', 6000);
  }
}
function findInteractable() {
  const ca = catPlay.aim(); if (ca) return ca;
  const ar = atticPlay.aim(); if (ar) return ar;
  const lb = lifespanInteraction(); if (lb) return lb;
  const cab = cabinetInteraction(); if (cab) return cab;
  let best = null, bd = Infinity;
  for (const it of interactables) {
    if (it.zone !== zone || (it.when && !it.when())) continue;
    const ip = typeof it.pos === 'function' ? it.pos() : it.pos;
    const d = Math.hypot(player.pos.x - ip.x, player.pos.z - ip.z);
    if (d < it.r && d < bd) { best = it; bd = d; }
  }
  return best;
}

// scripted climb: arc over an obstacle, ignoring collision
let anim = null;
function climb(to, dur, height, done) {
  const from = player.pos.clone();
  state = 'cutscene'; player.enabled = false;
  anim = { t: 0, dur, update(dt) {
    this.t += dt; const k = Math.min(1, this.t / dur), e = k * k * (3 - 2 * k);
    player.pos.lerpVectors(from, to, e);
    player.applyCamera(Math.sin(k * Math.PI) * height);
    if (k >= 1) { anim = null; state = 'playing'; player.enabled = true; done && done(); }
  } };
}
function transition(mid) {
  state = 'cutscene'; player.enabled = false;
  $('fade').style.opacity = 1;
  setTimeout(() => { mid(); $('fade').style.opacity = 0; setTimeout(() => { state = 'playing'; player.enabled = true; }, 400); }, 550);
}

let lastCheckpoint = null;
function save(checkpoint) { if (mp && mp.isClient) return; catPlay.settle(); /* a guest's progress lives in the host's game */ writeSave({ checkpoint, lampLit: room.lampOn, solved: room.puzzle.solved, studySolved: ground.lifespan.solved, dinnerSolved: ground.dinner.solved, plates: ground.dinner.seats.filter(st => st.flipped).map(st => st.id), doorsOpen: Object.values(ground.doors).filter(d => d.isOpen).map(d => d.id), battery: +flashlight.battery.toFixed(3), batteries: [...batteriesTaken], lantern: lantern.have ? +lantern.fuel.toFixed(3) : null, lanternOn: !!lantern.on, torchOn: !!flashlight.on, lanterns: [...lanternsTaken], altarSolved: ground.lu.altarSolved, deskOpen: ground.lu.deskOpen, wardOpen: ground.lu.wardOpen, visited: { ...visited }, hintsUsed: { ...hintsUsed }, hintState: { ...hintState }, moths: [...mothsTaken], cat: catPlay.state(), attic: ground.attic.serialize() }); lastCheckpoint = checkpoint; }
let grandHallSaved = false;
function spawnAt(checkpoint, saved = {}) {
  room.resetPuzzle(); room.setLamp(!!saved.lampLit);
  flashlight.battery = saved.battery ?? 0.6; if (flashlight.on) flashlight.toggle();
  batteriesTaken = new Set(saved.batteries || []);
  lanternsTaken = new Set(saved.lanterns || []); for (const l of LANTERNS) l.mesh.visible = !lanternsTaken.has(l.id);
  lantern.have = saved.lantern != null; lantern.fuel = saved.lantern || 0; lantern.lower();
  restoreHeld = { lantern: !!saved.lanternOn && lantern.have && lantern.fuel > 0, torch: !!saved.torchOn && flashlight.battery > 0 };
  hintState = { ...(saved.hintState || {}) }; hintsUsed = { ...(saved.hintsUsed || {}) }; stuckTime = 0; lastCheckpoint = checkpoint;
  mothsTaken = [...(saved.moths || [])]; mothNotes.reset(new Set(mothsTaken));
  for (const b of BATTERIES) b.mesh.visible = !batteriesTaken.has(b.id);
  updateBatteryHud();
  if (saved.solved) { room.puzzle.solveInstantly(); room.openPanel(true); }
  ground.reset(); motherPlay.reset(); grandHallSaved = !!checkpoint && !['grounds', 'room', 'hallway', 'study'].includes(checkpoint);
  if (saved.studySolved) ground.solveLifespan();
  if (saved.dinnerSolved) ground.dinner.solve();
  for (const st of ground.dinner.seats) if ((saved.plates || []).includes(st.id)) { st.flipped = true; st.flip = 0; }
  if ((saved.doorsOpen || []).includes('stairC')) ground.doors.stairC.locked = false;
  for (const id of saved.doorsOpen || []) if (ground.doors[id]) ground.doors[id].open(true);
  updateHeld();
  if (saved.altarSolved) ground.lu.solveAltar();
  if (saved.deskOpen) ground.lu.openDesk();
  if (saved.wardOpen) ground.lu.openWardrobe();
  ground.attic.restore(saved.attic);
  for (const k of Object.keys(visited)) delete visited[k]; Object.assign(visited, saved.visited || {});
  catPlay.load(saved.cat); catPlay.closeUI();
  const at = (v, yaw) => { setZone('room'); player.place(ROOM_ORIGIN.x + v.x, ROOM_ORIGIN.z + v.z, yaw); };
  if (checkpoint === 'escape') { setZone('room'); escape.reset(checkpoint, visited); return; }
  escape.reset(null, visited);
  const as = atticPlay.spawnFor(checkpoint); if (as) { at(as, as.yaw); return; }
  if (checkpoint === 'cellar') { at(CELLAR.spawn, Math.PI); return; }
  if (checkpoint === 'catacombs') { at(CATA.spawn, Math.PI); return; }
  if (checkpoint === 'chapel') { at({ x: 53.65, z: 43.2 }, 0); return; }
  if (checkpoint === 'firstfloor') { at(FIRST.spawn, Math.PI); return; }
  if (checkpoint === 'leader') { at({ x: 51.4, z: 82.6 }, 0); return; }
  if (checkpoint === 'dining') { setZone('room'); player.place(ROOM_ORIGIN.x + 35.2, ROOM_ORIGIN.z + 2.2, -Math.PI / 2); return; }
  if (checkpoint === 'kitchen') { setZone('room'); player.place(ROOM_ORIGIN.x + 36.6, ROOM_ORIGIN.z - 7.6, 0); return; }
  if (checkpoint === 'study') { setZone('room'); player.place(ROOM_ORIGIN.x + 15.5, ROOM_ORIGIN.z - 3.2, 0); return; }
  if (checkpoint === 'grandhall') { setZone('room'); player.place(ROOM_ORIGIN.x + 21.4, ROOM_ORIGIN.z + 3.1, -Math.PI / 2); return; }
  if (checkpoint === 'hallway') { setZone('room'); player.place(room.hall.spawn.x, room.hall.spawn.z, -Math.PI / 2); return; }
  if (checkpoint === 'room') { setZone('room'); player.place(ROOM_SPAWN.x, ROOM_SPAWN.z, 0); }
  else if (checkpoint === 'grounds') { setZone('exterior'); player.place(CLIMB_SPOT.x, FENCE.front - 1.4, 0); }
  else { setZone('exterior'); player.place(CLIMB_SPOT.x + 4, FENCE.front + 6, 0.15); }
}

// ---------- moth specimens & the Moth Journal ----------
const mothNotes = buildMothNotes(room.group);
const halluc = createHallucinations({ scene, camera, room, ground, settings, saveSettings, volume: () => settings.volume });
let mothsTaken = [];
const NOTE_BY_ID = Object.fromEntries(MOTH_NOTES.map(n => [n.id, n]));
const imgCache = {}; const imgOf = (k) => imgCache[k] || (imgCache[k] = mothImage(k));
function takeMoth(n) {
  mothsTaken.push(n.id); mothNotes.take(n.id); addEverMoth(n.id); playChime(); halluc.addDust(0.25);
  const sp = SPECIES[n.key], i = mothsTaken.length - 1;
  $('mothCardImg').src = imgOf(n.key); $('mothCardName').textContent = sp.common; $('mothCardLatin').textContent = sp.latin;
  $('mothCardText').textContent = n.text;
  $('mothCardStory').textContent = STORY[i] ? 'Added to the Moth Journal. A new page of the story is written.' : 'Added to the Moth Journal.';
  state = 'mothcard'; player.enabled = false; show('mothCard', true);
  save(lastCheckpoint);
}
function closeMothCard() { show('mothCard', false); if (state === 'mothcard') { state = 'playing'; player.enabled = true; lock(); } }
let journalReturn = 'pause';
function openJournal(from) {
  journalReturn = from; show(from, false); show('journal', true);
  const ids = from === 'home' ? ((loadSave() || {}).moths || []) : mothsTaken;
  $('journalCount').textContent = `${ids.length} of ${MOTH_NOTES.length} moths collected`;
  const story = $('journalStory'); story.innerHTML = '';
  if (!ids.length) story.innerHTML = '<p class="note">Nothing yet. The house is full of moths; each one has something to say.</p>';
  ids.forEach((id, i) => { if (STORY[i]) { const p = document.createElement('p'); p.textContent = STORY[i]; story.appendChild(p); } });
  const grid = $('journalGrid'); grid.innerHTML = '';
  for (const id of ids) {
    const n = NOTE_BY_ID[id]; if (!n) continue; const sp = SPECIES[n.key];
    const d = document.createElement('div'); d.className = 'jmoth';
    d.innerHTML = `<img alt=""><div><h3></h3><em></em><p></p></div>`;
    d.querySelector('img').src = imgOf(n.key); d.querySelector('h3').textContent = sp.common; d.querySelector('em').textContent = sp.latin; d.querySelector('p').textContent = n.text;
    grid.appendChild(d);
  }
}

// ---------- game states & menus ----------
let state = 'home';
const show = (id, on) => $(id).classList.toggle('hidden', !on);
let settingsReturn = 'home';
const backdrop = startHomeBackdrop($('homeBg'));

// save slots: Continue takes the latest, Load and New Game choose one; every save goes to the active slot
const slotsUI = createSlotScreen();
let playSecs = 0, lastPlayNow = 0; setPlaytimeSource(() => playSecs);
function refreshHome() {
  const n = latestSlot(), s = n && readSlot(n);
  if (n) setActiveSlot(n); // the home-screen journal shows the save Continue would load
  $('btnContinue').disabled = !s; $('btnLoad').disabled = !s;
  $('homeNote').textContent = s ? `Continue: ${s.name || `Save ${n}`}, ${s.completed ? 'escaped. Start over?' : placeOf(s.checkpoint)}` : '';
}
// a finished save (the ending seen) is not replayed: it offers to start over from the beginning
const confirmText = $('confirm').querySelector('p'), confirmDefault = confirmText.textContent;
function playSlot(n) {
  setActiveSlot(n); const s = loadSave();
  if (s && s.completed) { confirmText.textContent = 'You got out. This save is finished. Start again from the beginning, in this slot?'; show('confirm', true); return; }
  if (s) startGame(s.checkpoint, s); else startGame(null);
}
function lock() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* headless etc. */ } }

function startGame(checkpoint, saved = {}) {
  playSecs = 0;
  spawnAt(checkpoint, saved);
  if (restoreHeld) { if (restoreHeld.lantern) raiseLantern(); else if (restoreHeld.torch && !flashlight.on) { flashlight.toggle(); updateBatteryHud(); } restoreHeld = null; }
  show('home', false); show('hud', true); backdrop.stop();
  state = 'playing'; player.enabled = true;
  startAudio(settings.volume);
  lock();
  if (!checkpoint) say('The Pale Wing house. Everyone at school says it’s haunted. Find a way past the fence.', 6000);
  else say((checkpoint === 'escape' && 'The top of the ladder. Behind you, in the dark, she is coming.') || atticPlay.backMessage(checkpoint) || (checkpoint === 'cellar' ? 'You are back in the cellar, at the foot of the stairs.' : checkpoint === 'catacombs' ? 'You are back in the catacombs, at the foot of the chapel steps.' : checkpoint === 'chapel' ? 'You are back in the chapel.' : checkpoint === 'firstfloor' ? 'You are back on the first floor.' : checkpoint === 'leader' ? 'You are back in the leader’s bedroom.' : checkpoint === 'dining' ? 'You are back in the dining room.' : checkpoint === 'kitchen' ? 'You are back in the kitchen, by the cellar door.' : checkpoint === 'study' ? 'You are back in the Specimen Study.' : checkpoint === 'grandhall' ? 'You are back in the Grand Hall.' : checkpoint === 'hallway' ? 'You are back in the hallway.' : checkpoint === 'room' ? 'You are back in the drawing room.' : 'You are back on the grounds.'));
}
function pause() {
  if (state !== 'playing') return;
  state = 'paused'; player.enabled = false;
  show('pause', true);
  if (document.pointerLockElement) document.exitPointerLock();
}
function resume() {
  show('pause', false); state = 'playing'; player.enabled = true; lock();
}
let restoreHeld = null;
function quitHome() {
  if (state !== 'home' && lastCheckpoint !== undefined && !(mp && mp.isClient)) save(lastCheckpoint); // keep what you were holding
  show('pause', false); show('hud', false); show('home', true);
  state = 'home'; player.enabled = false; backdrop.start(); refreshHome();
}
function openSettings(from) { settingsReturn = from; show(from, false); show('settings', true); }

$('btnContinue').onclick = () => { const n = latestSlot(); if (n) playSlot(n); };
$('btnLoad').onclick = () => slotsUI.open('load', n => playSlot(n));
try { if (sessionStorage.getItem('pinned.autoContinue')) { sessionStorage.removeItem('pinned.autoContinue'); const s = loadSave(); if (s && !s.completed) startGame(s.checkpoint, s); } } catch {}
$('btnRestart').onclick = () => slotsUI.open('new', n => playSlot(n));
$('btnConfirmYes').onclick = () => { show('confirm', false); confirmText.textContent = confirmDefault; clearSave(); startGame(null); };
$('btnConfirmNo').onclick = () => { show('confirm', false); confirmText.textContent = confirmDefault; };
$('btnMulti').onclick = () => mp && mp.openMenu();
$('btnSettingsHome').onclick = () => openSettings('home');
$('btnSettingsPause').onclick = () => openSettings('pause');
$('btnSettingsBack').onclick = () => { show('settings', false); show(settingsReturn, true); };
$('btnResume').onclick = resume;
$('btnQuit').onclick = quitHome;
$('pauseBtn').onclick = pause;
$('btnJournalPause').onclick = () => openJournal('pause');
$('btnJournalHome').onclick = () => openJournal('home');
$('journalBack').onclick = () => { show('journal', false); show(journalReturn, true); };
$('mothCardClose').onclick = closeMothCard;
// the Collection cabinet (src/collection.js) and photo mode (src/photoMode.js)
const collection = createCollection();
$('btnCollection').onclick = () => { show('home', false); collection.open(() => show('home', true)); };
const photo = createPhotoMode({ renderer, scene, camera,
  render: () => { if (currentQ.post && composer) composer.render(0); else renderer.render(scene, camera); },
  enter: () => { if (state !== 'playing' && state !== 'paused') return false; if (mp && mp.active) { say('Photo mode is not available in multiplayer.', 3000); return false; } show('pause', false); state = 'photo'; player.enabled = false; if (document.pointerLockElement) document.exitPointerLock(); },
  exit: () => { state = 'playing'; player.enabled = true; lock(); } });
$('btnPhoto').onclick = () => photo.start();
addEventListener('keydown', e => { if (e.code === 'KeyK' && state === 'playing' && !e.repeat) photo.start(); });

// leaving the tab or window pauses too
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
addEventListener('blur', () => pause());
document.addEventListener('pointerlockchange', () => {
  // Esc releases pointer lock in the browser; treat that as pause.
  if (!document.pointerLockElement && state === 'playing' && !(mp && mp.chatOpen)) pause();
});
canvas.addEventListener('click', () => { if (state === 'playing' && !document.pointerLockElement) lock(); });
addEventListener('keydown', e => {
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'playing') { pause(); return; }
  if (e.code === 'KeyP' && state === 'paused' && !$('pause').classList.contains('hidden')) { resume(); return; }
  if (state === 'mothcard' && (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) { closeMothCard(); return; }
  if (state !== 'playing') return;
  if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && current) current.act();
  if (e.code === 'KeyQ' && current && current.alt) current.alt();
  if (e.code === 'KeyL' && state === 'playing') raiseLantern();
  if (e.code === 'KeyH' && state === 'playing') showHint();
  if (e.code === 'KeyB' && state === 'playing') { if (!flashlight.burst()) say(flashlight.on ? 'Not enough battery for a burst.' : 'Switch the torch on first (F).', 2500); else updateBatteryHud(); }
  if (e.code === 'KeyF' && state === 'playing') { if (lantern.on) lantern.lower(); const on = flashlight.toggle(); if (!on && flashlight.battery <= 0) say('The torch is dead. It needs new batteries.'); updateBatteryHud(); }
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// ---------- loop ----------
const clock = new THREE.Clock();
const curtain = exterior.group.getObjectByName('curtain');
const lurePos = new THREE.Vector3();
// One game clock for the whole simulation. It stops while the game is paused, on the
// home screen, or while the tab is hidden, so moths, flickering lights, battery and fuel
// drain, animations, hint timers (and later The Mother) all freeze together.
let gameTime = 0;
// In multiplayer the shared world never stops: pausing only opens the menu for you.
const frozen = () => ((state === 'paused' || state === 'photo') && !(mp && mp.active)) || state === 'home' || document.hidden;
let shadowLights = null, frameNo = 0; const tmpShadowV = new THREE.Vector3();
function loop() {
  const realDt = Math.min(clock.getDelta(), 0.05);
  const dt = frozen() ? 0 : realDt;
  { const now = performance.now() / 1000; if (state === 'playing' || state === 'paused') playSecs += Math.min(1, now - (lastPlayNow || now)); lastPlayNow = now; }
  gameTime += dt; const t = gameTime;
  if (state === 'playing') player.update(dt, colliders());
  if (anim) anim.update(dt);
  if (state === 'playing') {
    current = findInteractable();
    promptEl.textContent = current ? ((typeof current.prompt === 'function' ? current.prompt() : current.prompt) || '') : '';
  } else promptEl.textContent = '';
  lantern.update(dt, t, player.moving);
  lampMoths.update(t, camera);
  lightLimiter.update(camera);
  if (!escape.ownsMother) motherPlay.update(dt);
  escape.update(dt, t);
  // shadow maps: only for shadow-casting lamps near the player, refreshed every other frame
  if (!shadowLights) { shadowLights = []; scene.traverse(o => { if (o.isLight && o.shadow && !o.isDirectionalLight && o.userData.shadowOn) shadowLights.push(o); }); }
  frameNo++;
  for (const l of shadowLights) {
    l.shadow.autoUpdate = false;
    let o = l, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
    if (vis && l.castShadow && l.intensity > 0 && (settings.quality === 'low' ? (frameNo & 1) === 0 : true) && l.getWorldPosition(tmpShadowV).distanceTo(camera.position) < 14) l.shadow.needsUpdate = true;
  }
  flashlight.update(dt, t, player.moving, currentQ, lantern.on ? { on: true, onTime: lantern.onTime, pos: lantern.worldPos(lurePos) } : null);
  setHiss(state === 'playing' && zone === 'room' ? ground.hiss : 0);
  updateAudio({ dt, realDt, state, frozen: frozen(), zone, player, camera, origin: ROOM_ORIGIN, mother: motherPlay });
  if (state === 'playing') hintTick(dt);
  catPlay.update(dt, t, state === 'playing');
  if (state === 'playing' && flashlight.on) updateBatteryHud();
  if (zone === 'room') {
    room.update(t, dt, camera);
    if (state === 'playing') atticPlay.tick();
    if (state === 'playing' && !grandHallSaved && player.pos.x > ROOM_ORIGIN.x + 20.6 && player.pos.z < ROOM_ORIGIN.z + 12) { grandHallSaved = true; save('grandhall'); say('The Grand Hall. Somewhere above, wings stir in the dark.', 5000); }
  }
  else if (curtain) { curtain.rotation.x = -0.25 - Math.sin(t * 1.3) * 0.12 + Math.sin(t * 3.1) * 0.05; }
  tickSilk(t);
  halluc.update(dt, state === 'playing', zone === 'room');
  lightLimiter.fade(realDt);
  if (state === 'ending') ending.frame(document.hidden ? 0 : realDt);
  else if (state !== 'home') { if (currentQ.post && composer) composer.render(dt); else renderer.render(scene, camera); }
  requestAnimationFrame(loop);
}

spawnAt(null);
refreshHome();
$('loading').classList.add('hidden');
loop();

// Hook for automated tests / debugging.
window.__pinned = {
  start: startGame, pause, resume, quitHome, player, setZone, interactables, interact: () => current && current.act(), refresh: () => { current = findInteractable(); },
  caps: CAPS, get state() { return state; }, get zone() { return zone; }, get prompt() { return current && (typeof current.prompt === 'function' ? current.prompt() : current.prompt); }, room,
  renderer, scene, camera, flashlight, lantern, catacombs: catPlay, ground, mother: motherPlay, escape, ending, save: (cp) => save(cp), visited, get hints() { return { used: hintsUsed, state: hintState }; }, currentPuzzle: () => currentPuzzle(), openPadlock, tryPadlock, dials, get gameTime() { return gameTime; }, get colliders() { return colliders(); }, collection, photo, halluc,
};

// ---------- multiplayer (src/net/) ----------
// The host owns the shared world. worldSnapshot() is what is shared; applyWorld() merges a
// snapshot in. Progress only ever moves forward, so merging is a union (the lamp is the one
// on/off exception). Returns the names of moths newly taken, and whether a puzzle opened.
function worldSnapshot() {
  return { lamp: room.lampOn, solved: room.puzzle.solved, study: ground.lifespan.solved, dinner: ground.dinner.solved,
    plates: ground.dinner.seats.filter(st => st.flipped).map(st => st.id), doors: Object.values(ground.doors).filter(d => d.isOpen).map(d => d.id),
    altar: ground.lu.altarSolved, desk: ground.lu.deskOpen, ward: ground.lu.wardOpen,
    moths: [...mothsTaken], batteries: [...batteriesTaken], lanterns: [...lanternsTaken],
    cat: catPlay.state(), attic: ground.attic.serialize() };
}
// catacomb and attic puzzle state: take the other side's when it has got further (more solved/open flags)
const progress = o => o ? Object.values(o).filter(v => v === true).length : 0;
function applyWorld(w) {
  const res = { moths: [], solved: false };
  if (typeof w.lamp === 'boolean' && w.lamp !== room.lampOn) room.setLamp(w.lamp);
  if (w.solved && !room.puzzle.solved) { room.puzzle.solveInstantly(); room.openPanel(); updateHeld(); res.solved = true; }
  if (w.study && !ground.lifespan.solved) { ground.solveLifespan(); res.solved = true; }
  if (w.dinner && !ground.dinner.solved) { ground.dinner.solve(); res.solved = true; }
  for (const st of ground.dinner.seats) if ((w.plates || []).includes(st.id)) st.flipped = true;
  for (const id of w.doors || []) { const d = ground.doors[id]; if (d && !d.isOpen) { d.locked = false; d.open(); } }
  if (w.altar && !ground.lu.altarSolved) { ground.lu.solveAltar(); res.solved = true; }
  if (w.desk && !ground.lu.deskOpen) { ground.lu.openDesk(); res.solved = true; }
  if (w.ward && !ground.lu.wardOpen) ground.lu.openWardrobe();
  for (const id of w.moths || []) if (!mothsTaken.includes(id) && NOTE_BY_ID[id]) { mothsTaken.push(id); mothNotes.take(id); addEverMoth(id); res.moths.push(SPECIES[NOTE_BY_ID[id].key].common); }
  for (const b of BATTERIES) if ((w.batteries || []).includes(b.id)) { batteriesTaken.add(b.id); b.mesh.visible = false; }
  for (const l of LANTERNS) if ((w.lanterns || []).includes(l.id)) { lanternsTaken.add(l.id); l.mesh.visible = false; }
  if (w.cat && progress(w.cat) > progress(catPlay.state())) { catPlay.load(w.cat); res.solved = true; }
  if (w.attic && progress(w.attic) > progress(ground.attic.serialize())) { ground.attic.restore(w.attic); res.solved = true; }
  return res;
}
mp = initMultiplayer({ chooseSlot: cb => slotsUI.open('host', n => { setActiveSlot(n); const s = loadSave(); cb(!!s && !s.completed); }),
  onEsc: (from, m) => escape.onNet(from, m),
  extraState: () => ({ ln: lantern.on ? 1 : 0, hd: motherPlay.hidden ? 1 : 0, mv: player.moving ? 1 : 0, sp: player.moving && !player.crouching && player.keys && (player.keys.ShiftLeft || player.keys.ShiftRight) ? 1 : 0, dd: escDead ? 1 : 0 }), scene, camera, player, flashlight, say, lock, setZone, startGame, worldSnapshot, applyWorld,
  get zone() { return zone; }, get state() { return state; } });
window.__pinned.mp = mp;
