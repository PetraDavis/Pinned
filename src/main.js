// Pinned - entry point: renderer, game states, menus, interactions, save points.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTextures } from './textures.js';
import { buildExterior, SUN_DIR, CLIMB_SPOT, BROKEN_WINDOW, FRONT_DOOR, GATE, FENCE } from './world/exterior.js';
import { buildFirstRoom, ROOM_LAMP, ROOM_SPAWN, ROOM_WINDOW, ROOM_DOOR, ROOM_ORIGIN, ROOM_CABINET, ROOM_MOSAIC, ROOM_STANDS, ROOM_PANEL } from './world/firstRoom.js';
import { SPECIES } from './moths.js';
import { JOURNAL } from './world/groundFloor.js';
import { specimenCanvas } from './world/drawerPuzzle.js';
import { Player } from './player.js';
import { startAudio, setVolume, playThud, playGlass, playCreak, playGrind, playClick } from './audio.js';
import { createFlashlight, batteryMesh } from './flashlight.js';
import { loadSettings, saveSettings, loadSave, writeSave, clearSave } from './storage.js';
import { startHomeBackdrop } from './homeScreen.js';

const $ = id => document.getElementById(id);
const canvas = $('game');

// ---------- renderer & scene ----------
let settings = loadSettings();
// Low: 0.75 pixel ratio, sun shadow only (512, hard), no normal/roughness maps, sparse grass, no dust.
// Medium: 1.25 pixel ratio, 2048 soft shadows, full materials.
// High: full DPR (cap 2), 4096 soft shadows, ambient occlusion, bloom, dense grass and dust.
// Texture canvases are 512 / 1024 / 2048 px (see textures.js) and need a restart to change.
const QUALITIES = {
  low: { pr: 0.75, shadow: 512, soft: false, lampShadows: false, pbr: false, grass: 0.2, dust: 0, post: false },
  medium: { pr: 1.25, shadow: 2048, soft: true, lampShadows: true, pbr: true, grass: 0.5, dust: 150, post: false },
  high: { pr: 2, shadow: 4096, soft: true, lampShadows: true, pbr: true, grass: 1, dust: 450, post: true },
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
// Quality applies in place (no reload): pixel ratio, shadow resolution and shadow
// filtering change immediately; texture resolution follows on the next load.
let composer = null;
function buildComposer() {
  const c = new EffectComposer(renderer);
  c.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.blendIntensity = 0.8; c.addPass(ao);
  // high threshold: only the lamp flame, sconces and lit glass bloom
  c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 0.88));
  c.addPass(new OutputPass());
  return c;
}
let currentQ = QUALITY;
function applyQuality(q) {
  const Q = QUALITIES[q] || QUALITIES.high;
  currentQ = Q;
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
  if (Q.post && !composer) composer = buildComposer();
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
    if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true;
  });
}
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

// ---------- interactions ----------
const msgEl = $('message'), promptEl = $('prompt');
let msgTimer;
function say(text, ms = 4000) {
  msgEl.textContent = text; msgEl.style.opacity = 1;
  clearTimeout(msgTimer); msgTimer = setTimeout(() => (msgEl.style.opacity = 0), ms);
}

const interactables = [
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
      room.setLamp(!room.lampOn);
      if (room.lampOn) say('The wick catches. Warm light crawls up the walls, and every pinned moth seems to lean towards it.');
      const sv = loadSave(); if (sv) writeSave({ ...sv, lampLit: room.lampOn });
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
    zone: 'room', pos: d.pos.clone().add(ROOM_ORIGIN), r: 1.3, when: () => !d.isOpen,
    prompt: () => d.boarded ? 'E  examine the boarded door' : d.locked ? 'E  try the door' : 'E  open the door',
    act: () => {
      if (d.locked) { say(d.msg, 6000); playCreak(); return; }
      d.open(); playThud(); if (d.openMsg) say(d.openMsg, 5000);
    },
  })),
  {
    zone: 'room', pos: ground.journal.position.clone().add(ROOM_ORIGIN), r: 1.3, prompt: 'E  read the journal',
    act: () => say(JOURNAL, 16000),
  },
  ...ground.mirrors.map(m => ({
    zone: 'room', pos: m.pos.clone().add(ROOM_ORIGIN), r: 1.6, prompt: 'E  look in the mirror',
    act: () => say(m.stage === 1
      ? 'You look tired. Dust in your hair, a smudge on your cheek. Just you.'
      : 'You, again. Paler than you remember, and somehow taller. The skin looks very smooth in this light.', 7000),
  })),
];
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
  if (!open) return { prompt: 'E  open the drawer', act: () => { d.userData.target = 1; if (!item) say(FLAVOUR_EMPTY); } };
  if (item && !P.held) return { prompt: `E  take the ${SPECIES[item].common}`, act: () => { P.takeFromDrawer(d); updateHeld(); } };
  if (!item && P.held) return { prompt: `E  put the ${SPECIES[P.held].common} in the drawer   ·   Q  close it`, act: () => { P.putIntoDrawer(d); updateHeld(); }, alt: () => { d.userData.target = 0; } };
  return { prompt: 'E  close the drawer', act: () => { d.userData.target = 0; } };
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
    if (res === 'swapped' && ground.lifespanCorrect()) {
      ground.solveLifespan(); playGrind();
      say('The last case settles on its hook. Behind the walls, something heavy slides, and down the hallway a bolt draws back.', 7000);
      save('study');
    }
  } };
}
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

function save(checkpoint) { writeSave({ checkpoint, lampLit: room.lampOn, solved: room.puzzle.solved, studySolved: ground.lifespan.solved, doorsOpen: Object.values(ground.doors).filter(d => d.isOpen).map(d => d.id), battery: +flashlight.battery.toFixed(3), batteries: [...batteriesTaken] }); }
let grandHallSaved = false;
function spawnAt(checkpoint, saved = {}) {
  room.resetPuzzle(); room.setLamp(!!saved.lampLit);
  flashlight.battery = saved.battery ?? 0.6; if (flashlight.on) flashlight.toggle();
  batteriesTaken = new Set(saved.batteries || []);
  for (const b of BATTERIES) b.mesh.visible = !batteriesTaken.has(b.id);
  updateBatteryHud();
  if (saved.solved) { room.puzzle.solveInstantly(); room.openPanel(true); }
  ground.reset(); grandHallSaved = checkpoint === 'grandhall';
  if (saved.studySolved) ground.solveLifespan();
  for (const id of saved.doorsOpen || []) if (ground.doors[id]) ground.doors[id].open(true);
  updateHeld();
  if (checkpoint === 'study') { setZone('room'); player.place(ROOM_ORIGIN.x + 15.5, ROOM_ORIGIN.z - 3.2, 0); return; }
  if (checkpoint === 'grandhall') { setZone('room'); player.place(ROOM_ORIGIN.x + 21.4, ROOM_ORIGIN.z + 3.1, -Math.PI / 2); return; }
  if (checkpoint === 'hallway') { setZone('room'); player.place(room.hall.spawn.x, room.hall.spawn.z, -Math.PI / 2); return; }
  if (checkpoint === 'room') { setZone('room'); player.place(ROOM_SPAWN.x, ROOM_SPAWN.z, 0); }
  else if (checkpoint === 'grounds') { setZone('exterior'); player.place(CLIMB_SPOT.x, FENCE.front - 1.4, 0); }
  else { setZone('exterior'); player.place(CLIMB_SPOT.x + 4, FENCE.front + 6, 0.15); }
}

// ---------- game states & menus ----------
let state = 'home';
const show = (id, on) => $(id).classList.toggle('hidden', !on);
let settingsReturn = 'home';
const backdrop = startHomeBackdrop($('homeBg'));

function refreshHome() {
  const s = loadSave();
  $('btnContinue').disabled = !s;
  $('homeNote').textContent = '';
}
function lock() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* headless etc. */ } }

function startGame(checkpoint, saved = {}) {
  spawnAt(checkpoint, saved);
  show('home', false); show('hud', true); backdrop.stop();
  state = 'playing'; player.enabled = true;
  startAudio(settings.volume);
  lock();
  if (!checkpoint) say('The Pale Wing house. Everyone at school says it’s haunted. Find a way past the fence.', 6000);
  else say(checkpoint === 'study' ? 'You are back in the Specimen Study.' : checkpoint === 'grandhall' ? 'You are back in the Grand Hall.' : checkpoint === 'hallway' ? 'You are back in the hallway.' : checkpoint === 'room' ? 'You are back in the drawing room.' : 'You are back on the grounds.');
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
function quitHome() {
  show('pause', false); show('hud', false); show('home', true);
  state = 'home'; player.enabled = false; backdrop.start(); refreshHome();
}
function openSettings(from) { settingsReturn = from; show(from, false); show('settings', true); }

$('btnContinue').onclick = () => { const s = loadSave(); if (s) startGame(s.checkpoint, s); };
try { if (sessionStorage.getItem('pinned.autoContinue')) { sessionStorage.removeItem('pinned.autoContinue'); const s = loadSave(); if (s) startGame(s.checkpoint, s); } } catch {}
$('btnRestart').onclick = () => { if (loadSave()) show('confirm', true); else startGame(null); };
$('btnConfirmYes').onclick = () => { show('confirm', false); clearSave(); startGame(null); };
$('btnConfirmNo').onclick = () => show('confirm', false);
$('btnMulti').onclick = () => { $('homeNote').textContent = 'Multiplayer: coming soon.'; };
$('btnSettingsHome').onclick = () => openSettings('home');
$('btnSettingsPause').onclick = () => openSettings('pause');
$('btnSettingsBack').onclick = () => { show('settings', false); show(settingsReturn, true); };
$('btnResume').onclick = resume;
$('btnQuit').onclick = quitHome;
$('pauseBtn').onclick = pause;

document.addEventListener('pointerlockchange', () => {
  // Esc releases pointer lock in the browser; treat that as pause.
  if (!document.pointerLockElement && state === 'playing') pause();
});
canvas.addEventListener('click', () => { if (state === 'playing' && !document.pointerLockElement) lock(); });
addEventListener('keydown', e => {
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'playing') { pause(); return; }
  if (e.code === 'KeyP' && state === 'paused' && !$('pause').classList.contains('hidden')) { resume(); return; }
  if (state !== 'playing') return;
  if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && current) current.act();
  if (e.code === 'KeyQ' && current && current.alt) current.alt();
  if (e.code === 'KeyF' && state === 'playing') { const on = flashlight.toggle(); if (!on && flashlight.battery <= 0) say('The torch is dead. It needs new batteries.'); updateBatteryHud(); }
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// ---------- loop ----------
const clock = new THREE.Clock();
const curtain = exterior.group.getObjectByName('curtain');
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (state === 'playing') player.update(dt, colliders());
  if (anim) anim.update(dt);
  if (state === 'playing') {
    current = findInteractable();
    promptEl.textContent = current ? ((typeof current.prompt === 'function' ? current.prompt() : current.prompt) || '') : '';
  } else promptEl.textContent = '';
  flashlight.update(dt, t, player.moving, currentQ);
  if (state === 'playing' && flashlight.on) updateBatteryHud();
  if (zone === 'room') {
    room.update(t, dt, camera);
    if (state === 'playing' && !grandHallSaved && player.pos.x > ROOM_ORIGIN.x + 20.6) { grandHallSaved = true; save('grandhall'); say('The Grand Hall. Somewhere above, wings stir in the dark.', 5000); }
  }
  else if (curtain) { curtain.rotation.x = -0.25 - Math.sin(t * 1.3) * 0.12 + Math.sin(t * 3.1) * 0.05; }
  if (state !== 'home') { if (currentQ.post && composer) composer.render(dt); else renderer.render(scene, camera); }
  requestAnimationFrame(loop);
}

spawnAt(null);
refreshHome();
$('loading').classList.add('hidden');
loop();

// Hook for automated tests / debugging.
window.__pinned = {
  start: startGame, pause, resume, quitHome, player, setZone, interact: () => current && current.act(),
  get state() { return state; }, get zone() { return zone; }, get prompt() { return current && (typeof current.prompt === 'function' ? current.prompt() : current.prompt); }, room,
  renderer, scene, camera, flashlight, get colliders() { return colliders(); },
};
