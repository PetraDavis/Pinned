// Sound and music for Pinned, all generated with Web Audio (no asset files).
// main.js calls updateAudio() once a frame and initAudioSettings() once; the old
// src/audio.js API (playThud, setHiss, ...) is re-exported from here.
import * as THREE from 'three';
import { A, onReady, setVolumes, setFrozen, placeListener, unlock, voiceVolume } from './core.js';
import { initMusic, updateMusic } from './music.js';
import { initAmbience, updateAmbience, floorAt } from './ambience.js';
import { initFootsteps, updateFootsteps, surfaceAt } from './footsteps.js';
import { initMother, updateMother, motherClicks, motherFlutter, motherShriek } from './mother.js';

export * from './sfx.js';
export { voiceVolume, floorAt, surfaceAt };

onReady(() => { initMusic(); initAmbience(); initFootsteps(); initMother(); });

// ---- settings ----
const DEF = { musicVol: 0.7, sfxVol: 1, voiceVol: 1 };
let S = null;
const apply = () => S && setVolumes({ master: +S.volume, music: +(S.musicVol ?? DEF.musicVol), sfx: +(S.sfxVol ?? DEF.sfxVol), voice: +(S.voiceVol ?? DEF.voiceVol) });
// Adds Music / Effects / Voice chat sliders under the existing (master) Volume slider.
export function initAudioSettings(settings, save) {
  S = settings; for (const k in DEF) if (S[k] == null) S[k] = DEF[k];
  const master = document.getElementById('sVol'), label = master && master.closest('label');
  if (label && !document.getElementById('sMusicVol')) {
    if (label.firstChild && label.firstChild.nodeType === 3) label.firstChild.textContent = 'Master volume ';
    let after = label;
    for (const [key, name] of [['musicVol', 'Music'], ['sfxVol', 'Effects'], ['voiceVol', 'Voice chat']]) {
      const id = 's' + key[0].toUpperCase() + key.slice(1), l = document.createElement('label');
      l.innerHTML = `${name} volume <output id="o${id.slice(1)}"></output><input id="${id}" type="range" min="0" max="1" step="0.01">`;
      const inp = l.querySelector('input'), o = l.querySelector('output');
      const show = () => { o.textContent = Math.round(S[key] * 100) + '%'; };
      inp.value = S[key]; show();
      inp.addEventListener('input', () => { S[key] = +inp.value; show(); apply(); save(S); });
      after.after(l); after = l;
    }
  }
  apply();
}
// legacy API used by main.js
export function setVolume(v) { if (S) S.volume = v; apply(); }
export function startAudio(v) { if (S && v != null) S.volume = v; unlock(); apply(); }
// a sound that fails must never break the game code that asked for it (a missing import here
// once froze the attic chase): errors are logged once and swallowed
const soundErr = new Set();
const quiet = (name, fn) => { try { fn(); } catch (e) { if (!soundErr.has(name)) { soundErr.add(name); console.error('[pinned] sound ' + name + ' failed:', e); } } };
export function playFlutter(level = 1) { if (A.ctx && level > 0.02) quiet('flutter', () => motherFlutter(level)); }
export function playShriek(level = 1) { if (A.ctx && level > 0.02) quiet('shriek', () => motherShriek(level)); }
export function playClicksAt(level = 1, n = 2) { if (A.ctx && level > 0.02) quiet('clicks', () => motherClicks(level, n)); }

// ---- per frame ----
const fwd = new THREE.Vector3(), up = new THREE.Vector3(), lp = { x: 0, y: 0, z: 0 };
// g: { dt (game dt, 0 while frozen), realDt, state, frozen, zone, player, camera, origin, mother }
export function updateAudio(g) {
  if (!A.ctx) return;
  const home = g.state === 'home';
  // the game clock is stopped (pause menu / hidden tab): stop all sound with it.
  // The home screen keeps running for its music.
  setFrozen(!!(document.hidden || (g.frozen && !home)));
  if (A.suspendedByGame) return;
  const playing = !home && (g.state === 'playing' || g.state === 'cutscene' || g.state === 'paused');
  const O = g.origin || { x: 0, z: 0 }, cam = g.camera, p = g.player;
  if (cam) {
    cam.getWorldDirection(fwd); up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    lp.x = cam.position.x; lp.y = cam.position.y; lp.z = cam.position.z;
    placeListener(lp, fwd, up);
  }
  const lx = p ? p.pos.x - O.x : 0, lz = p ? p.pos.z - O.z : 0;
  const floor = floorAt(g.zone, lx, lz);
  updateMusic(home, g.realDt ?? g.dt, floor === 'attic' || floor === 'catacombs' ? 1 : 0.6);
  updateAmbience(g.dt, playing, floor, lp);
  if (playing && g.state === 'playing') updateFootsteps(p, surfaceAt(floor, lx, lz));
  updateMother(g.dt, playing && g.zone === 'room', g.mother, O);
}
