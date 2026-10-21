// Other players in the world: the same plain human teenager the mirrors show at their first
// stage (hoodie, jeans, shaggy androgynous hair; no wings, no antennae), a faint name above
// the head, and a torch beam when their torch is on. Positions are smoothed between updates.
import * as THREE from 'three';
import { makeAvatar, setClothes } from '../world/avatar.js';
import { lanternMesh } from '../lantern.js';

function nameSprite(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'italic 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#000'; g.shadowBlur = 8; g.fillStyle = 'rgba(216,210,194,0.85)';
  g.fillText(String(name).slice(0, 18), 128, 32);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
  s.scale.set(0.8, 0.2, 1); s.position.y = 2.05; s.renderOrder = 5;
  return s;
}

export function createRemotes(scene) {
  const players = new Map();
  const tmp = new THREE.Vector3();

  function add(id, name, slot) {
    if (players.has(id)) { if (slot != null) setSlot(id, slot); return players.get(id); }
    const root = new THREE.Group(); root.name = 'remote-' + id;
    const body = makeAvatar(1); setClothes(body, slot); body.rotation.y = Math.PI; root.add(body); // the model faces +z; a player's view (yaw 0) looks down -z
    const tag = nameSprite(name); root.add(tag);
    // torch: a small dark body in the right hand and an unshadowed beam
    const torch = new THREE.Group(); torch.position.set(0.24, 1.05, -0.22); root.add(torch);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.5, metalness: 0.6 }));
    can.rotation.x = Math.PI / 2; torch.add(can);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    lens.position.z = -0.081; lens.rotation.y = Math.PI; torch.add(lens);
    const beam = new THREE.SpotLight(0xffe8c0, 0, 16, 0.38, 0.5, 1.6); beam.castShadow = false; beam.userData.noLimit = true;
    beam.target.position.set(0, -0.2, -3); torch.add(beam, beam.target);
    // lantern: carried low in the same hand, with its own warm light so the others see it too
    const lantern = lanternMesh(); lantern.scale.setScalar(0.85); lantern.position.set(0.28, 0.62, -0.2); lantern.visible = false; root.add(lantern);
    const glow = new THREE.PointLight(0xffb468, 0, 9, 1.4); glow.castShadow = false; glow.userData.noLimit = true; glow.position.set(0.28, 0.85, -0.32); root.add(glow);
    scene.add(root);
    const p = { id, name, slot, root, body, tag, torch, beam, lens, lantern, glow, target: new THREE.Vector3(), last: new THREE.Vector3(), stride: 0, walk: 0, yaw: 0, pitch: 0, crouch: 0, y: 0, zone: 'exterior', flash: false, have: false };
    players.set(id, p);
    return p;
  }

  function remove(id) {
    const p = players.get(id); if (!p) return;
    scene.remove(p.root);
    p.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); }); });
    players.delete(id);
  }

  function setSlot(id, slot) { const p = players.get(id); if (!p) return; p.slot = slot; setClothes(p.body, slot); }

  function setState(id, s) {
    const p = players.get(id); if (!p) return;
    p.target.set(s.x, s.y || 0, s.z); p.yaw = s.yaw; p.pitch = s.pitch || 0; p.crouch = s.c || 0;
    p.zone = s.zn; p.flash = !!s.f; p.paused = !!s.p;
    p.extra = { ln: s.ln || 0, hd: s.hd || 0, mv: s.mv || 0, sp: s.sp || 0, dd: s.dd || 0, ui: s.ui || 0 }; // for the escape chase and the Mother
    if (!p.have) { p.root.position.copy(p.target); p.root.rotation.y = p.yaw; p.have = true; }
  }

  function update(dt, myZone) {
    const k = Math.min(1, dt * 12);
    for (const p of players.values()) {
      p.root.visible = p.have && p.zone === myZone;
      if (!p.root.visible) continue;
      p.last.copy(p.root.position);
      p.root.position.lerp(p.target, k);
      // walking: legs and arms swing with the distance covered, settling when they stop
      const sp = dt > 0 ? tmp.copy(p.root.position).sub(p.last).setY(0).length() / dt : 0;
      p.walk += ((sp > 0.25 ? 1 : 0) - p.walk) * Math.min(1, dt * 8);
      p.stride += sp * dt * 5.2;
      const L = p.body.userData.limbs, sw = Math.sin(p.stride) * 0.55 * p.walk;
      if (L) { L.legL.rotation.x = sw; L.legR.rotation.x = -sw; L.armL.rotation.x = -sw * 0.7; L.armR.rotation.x = (p.flash || (p.extra && p.extra.ln)) ? -0.9 : sw * 0.7; }
      p.body.position.y = Math.abs(Math.cos(p.stride)) * 0.025 * p.walk;
      let dy = p.yaw - p.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      p.root.rotation.y += dy * k;
      p.body.scale.y = 1 - 0.38 * p.crouch; p.tag.position.y = 2.05 - 0.7 * p.crouch;
      p.torch.position.y = 1.05 - 0.45 * p.crouch; p.torch.rotation.x = p.pitch * 0.8;
      p.beam.intensity = p.flash ? 9 : 0; p.lens.visible = p.flash;
      const ln = !!(p.extra && p.extra.ln), t = performance.now() / 1000;
      p.lantern.visible = ln; p.lantern.position.y = 0.62 - 0.3 * p.crouch; p.glow.position.y = 0.85 - 0.3 * p.crouch;
      p.lantern.rotation.z = Math.sin(t * 3.1 + p.slot) * 0.05;
      p.glow.intensity = ln ? 5 * (0.93 + Math.sin(t * 9 + p.slot) * 0.04 + Math.sin(t * 23) * 0.03) : 0;
    }
  }

  const distanceTo = (id, pos) => { const p = players.get(id); return p && p.have ? tmp.copy(p.root.position).setY(0).distanceTo(pos) : Infinity; };
  const zoneOf = id => players.get(id)?.zone;
  return { add, remove, setSlot, setState, update, distanceTo, zoneOf, players, clear() { for (const id of [...players.keys()]) remove(id); } };
}
