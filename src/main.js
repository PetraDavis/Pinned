// Pinned - entry point: renderer, game states, menus, interactions, save points.
import * as THREE from 'three';
import { buildTextures } from './textures.js';
import { buildExterior, SUN_DIR, CLIMB_SPOT, BROKEN_WINDOW, FRONT_DOOR, GATE, FENCE } from './world/exterior.js';
import { buildFirstRoom, ROOM_LAMP, ROOM_SPAWN, ROOM_WINDOW, ROOM_DOOR, ROOM_ORIGIN, ROOM_CABINET, ROOM_MOSAIC } from './world/firstRoom.js';
import { SPECIES } from './moths.js';
import { KEY_DRAWER, FLAVOUR } from './world/drawerPuzzle.js';
import { Player } from './player.js';
import { startAudio, setVolume, playThud, playGlass } from './audio.js';
import { loadSettings, saveSettings, loadSave, writeSave, clearSave } from './storage.js';
import { startHomeBackdrop } from './homeScreen.js';

const $ = id => document.getElementById(id);
const canvas = $('game');

// ---------- renderer & scene ----------
let settings = loadSettings();
const QUALITIES = {
  low: { pr: 1, shadow: 1024, soft: false },
  medium: { pr: 1.5, shadow: 2048, soft: true },
  high: { pr: 2, shadow: 4096, soft: true },
};
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
const room = buildFirstRoom(scene, QUALITY.shadow);

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
// flashlight (F)
const torch = new THREE.SpotLight(0xffe6c0, 0, 22, 0.42, 0.5, 1.6);
torch.position.set(0.25, -0.2, 0); torch.target.position.set(0, -0.3, -3);
camera.add(torch, torch.target); scene.add(camera);
let torchOn = false;

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
function applyQuality(q) {
  const Q = QUALITIES[q] || QUALITIES.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.pr));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.type = Q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  scene.traverse(o => {
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
  $('qualityNote').textContent = 'Applied. Texture detail updates the next time the game loads.';
});
applySettings();

// ---------- interactions ----------
const msgEl = $('message'), promptEl = $('prompt');
let msgTimer;
function say(text, ms = 4000) {
  msgEl.textContent = text; msgEl.style.opacity = 1;
  clearTimeout(msgTimer); msgTimer = setTimeout(() => (msgEl.style.opacity = 0), ms);
}

const interactables = [
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
    zone: 'room', pos: ROOM_DOOR, r: 1.6, when: () => !room.doorOpen,
    prompt: () => (hasKey ? 'E  unlock the door' : 'E  try the door'),
    act: () => {
      if (!hasKey) { say('Locked. There is a small brass keyhole under the handle.'); return; }
      room.openDoor(); playThud();
      say('The key turns with a gritty click. The door swings inward onto a dark hallway.');
      save('hallway');
    },
  },
  {
    zone: 'room', pos: ROOM_MOSAIC, r: 1.9, prompt: 'E  examine the mosaic',
    act: () => say(room.lampOn
      ? 'In the lamplight three tiles on the left wing glint gold. Each one bears a tiny skull.'
      : 'The Order of the Pale Wing. It is too dim to make out the finer tiles. More light would help.', 6000),
  },
  {
    zone: 'room', pos: () => room.hall.endDoor, r: 1.4,
    prompt: 'E  try the door', act: () => say('Locked. Something heavy has been pushed against it from the other side.'),
  },
  {
    zone: 'room', pos: () => room.hall.sideDoor, r: 1.3,
    prompt: 'E  try the door', act: () => say('Locked. Through the keyhole, only darkness and the smell of camphor.'),
  },
];
let current = null, hasKey = false;
const ray = new THREE.Raycaster(); ray.far = 2.6;
const centre = new THREE.Vector2(0, 0);
// The specimen cabinet: aim at a drawer to open, close or search it.
function cabinetInteraction() {
  if (zone !== 'room' || Math.hypot(player.pos.x - ROOM_CABINET.x, player.pos.z - ROOM_CABINET.z) > 2.3) return null;
  ray.setFromCamera(centre, camera);
  const hit = ray.intersectObjects(room.pickables, false)[0];
  if (!hit) return { prompt: 'Aim at a drawer to open it', act: () => say('A specimen cabinet. Six drawers, each labelled in a careful hand.') };
  const d = hit.object.userData.drawer, key = d.userData.key, name = SPECIES[key].common;
  const open = d.userData.target > 0;
  if (open && key === KEY_DRAWER && !hasKey) return { prompt: 'E  take the brass key', act: () => {
    hasKey = true; d.userData.keyMesh.visible = false;
    say('A brass key, wrapped in a label: "For the east door." The death\'s-head was the clue.');
  } };
  if (open) return { prompt: `E  close the drawer (${name})`, act: () => { d.userData.target = 0; } };
  return { prompt: `E  open the drawer: ${name}`, act: () => {
    d.userData.target = 1;
    if (key === KEY_DRAWER) say(hasKey ? 'Empty now, apart from a single death\'s-head hawkmoth, its skull marking bright.' : 'A death\'s-head hawkmoth, its skull marking bright. Beneath it lies a brass key.');
    else say(FLAVOUR[key]);
  } };
}
function findInteractable() {
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

function save(checkpoint) { writeSave({ checkpoint, lampLit: room.lampOn, hasKey, doorOpen: room.doorOpen }); }
function spawnAt(checkpoint, saved = {}) {
  room.resetPuzzle(); room.setLamp(!!saved.lampLit);
  hasKey = !!saved.hasKey;
  if (hasKey) for (const d of room.drawers) if (d.userData.keyMesh) d.userData.keyMesh.visible = false;
  if (saved.doorOpen) room.openDoor(true);
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
  else say(checkpoint === 'hallway' ? 'You are back in the hallway.' : checkpoint === 'room' ? 'You are back in the drawing room.' : 'You are back on the grounds.');
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
  if (e.code === 'KeyF') { torchOn = !torchOn; torch.intensity = torchOn ? 25 : 0; }
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
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
    promptEl.textContent = current ? (typeof current.prompt === 'function' ? current.prompt() : current.prompt) : '';
  } else promptEl.textContent = '';
  if (zone === 'room') room.update(t, dt);
  else if (curtain) { curtain.rotation.x = -0.25 - Math.sin(t * 1.3) * 0.12 + Math.sin(t * 3.1) * 0.05; }
  if (state !== 'home') renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

spawnAt(null);
refreshHome();
$('loading').classList.add('hidden');
loop();

// Hook for automated tests / debugging.
window.__pinned = {
  start: startGame, pause, resume, quitHome, player, setZone, interact: () => current && current.act(),
  get state() { return state; }, get zone() { return zone; }, get hasKey() { return hasKey; }, get prompt() { return current && (typeof current.prompt === 'function' ? current.prompt() : current.prompt); }, room,
  renderer, scene, camera, get colliders() { return colliders(); },
};
