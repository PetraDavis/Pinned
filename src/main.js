// Pinned - entry point: renderer, game states, menus, interactions, save points.
import * as THREE from 'three';
import { buildTextures } from './textures.js';
import { buildExterior, CLIMB_SPOT, BROKEN_WINDOW, FRONT_DOOR, GATE, FENCE } from './world/exterior.js';
import { buildFirstRoom, ROOM_SPAWN, ROOM_WINDOW, ROOM_DOOR, ROOM_ORIGIN } from './world/firstRoom.js';
import { Player } from './player.js';
import { startAudio, setVolume, playThud, playGlass } from './audio.js';
import { loadSettings, saveSettings, loadSave, writeSave, clearSave } from './storage.js';
import { startHomeBackdrop } from './homeScreen.js';

const $ = id => document.getElementById(id);
const canvas = $('game');

// ---------- renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG_OUT = new THREE.FogExp2(0x0b1018, 0.024), FOG_IN = new THREE.FogExp2(0x07080a, 0.05);
scene.background = new THREE.Color(0x0b1018);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 600);

buildTextures();
const exterior = buildExterior(scene);
const room = buildFirstRoom(scene);

const moonLight = new THREE.DirectionalLight(0xa9bbdd, 2.2);
moonLight.position.set(-35, 55, 45);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
moonLight.shadow.bias = -0.0008;
const sky = new THREE.HemisphereLight(0x34405a, 0x0b0d0a, 0.7);
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
  scene.background.set(out ? 0x0b1018 : 0x050506);
}
const colliders = () => (zone === 'exterior' ? exterior.colliders : room.colliders);

// ---------- settings ----------
let settings = loadSettings();
function applySettings() {
  player.sensitivity = settings.sensitivity;
  setVolume(settings.volume);
  renderer.toneMappingExposure = 1.15 * settings.brightness;
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
    zone: 'exterior', pos: new THREE.Vector3(BROKEN_WINDOW.x, 0, BROKEN_WINDOW.z + 0.9), r: 1.5, prompt: 'E  climb in through the window',
    act: () => transition(() => {
      setZone('room'); player.place(ROOM_SPAWN.x, ROOM_SPAWN.z, 0); playGlass();
      say('Glass crunches underfoot. The air smells of dust and old wax.');
      save('room');
    }),
  },
  {
    zone: 'room', pos: ROOM_WINDOW, r: 1.0, prompt: 'E  climb back out',
    act: () => transition(() => { setZone('exterior'); player.place(BROKEN_WINDOW.x, BROKEN_WINDOW.z + 1.3, Math.PI); }),
  },
  {
    zone: 'room', pos: ROOM_DOOR, r: 1.3, prompt: 'E  try the door',
    act: () => say('Locked. Something on the other side shifts, then is still.'),
  },
  {
    zone: 'room', pos: new THREE.Vector3(ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z - 4), r: 1.6, prompt: 'E  examine the mosaic',
    act: () => say('The Order of the Pale Wing. Thousands of tiny tiles, and the eyes are the only red ones.', 5500),
  },
];
let current = null;
function findInteractable() {
  let best = null, bd = Infinity;
  for (const it of interactables) {
    if (it.zone !== zone || (it.when && !it.when())) continue;
    const d = Math.hypot(player.pos.x - it.pos.x, player.pos.z - it.pos.z);
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

function save(checkpoint) { writeSave({ checkpoint }); }
function spawnAt(checkpoint) {
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

function startGame(checkpoint) {
  spawnAt(checkpoint);
  show('home', false); show('hud', true); backdrop.stop();
  state = 'playing'; player.enabled = true;
  startAudio(settings.volume);
  lock();
  if (!checkpoint) say('The Pale Wing house. Everyone at school says it’s haunted. Find a way past the fence.', 6000);
  else say(checkpoint === 'room' ? 'You are back in the drawing room.' : 'You are back on the grounds.');
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

$('btnContinue').onclick = () => { const s = loadSave(); if (s) startGame(s.checkpoint); };
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
  if (e.code === 'KeyE' && current) current.act();
  if (e.code === 'KeyF') { torchOn = !torchOn; torch.intensity = torchOn ? 25 : 0; }
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// ---------- loop ----------
const clock = new THREE.Clock();
const mist = exterior.group.getObjectByName('mist');
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (state === 'playing') player.update(dt, colliders());
  if (anim) anim.update(dt);
  if (state === 'playing') {
    current = findInteractable();
    promptEl.textContent = current ? current.prompt : '';
  } else promptEl.textContent = '';
  if (zone === 'room') room.update(t);
  else if (mist) for (const m of mist.children) { m.position.x += m.userData.drift * dt; if (m.position.x > 60) m.position.x = -60; }
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
  get state() { return state; }, get zone() { return zone; }, get prompt() { return current && current.prompt; },
  renderer, scene, camera, get colliders() { return colliders(); },
};
