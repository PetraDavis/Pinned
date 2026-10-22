// Speed-ups for Low and Extra Low only (Medium and High are left exactly as they are).
//  - Cheaper surfaces: every plain MeshStandard/MeshPhysical material is drawn with a
//    MeshLambertMaterial copy (same colour, texture, emissive, transparency). Other code keeps
//    its references to the original material, so changes made to it later (a lamp's glow, a
//    fade) are copied across a few times a second; changes made to the copy stay.
//  - Distance culling: small things (under ~1.2 m across) more than CULL m from the camera are
//    not drawn (moved to a camera layer that is not rendered, so their own visibility, which
//    game code toggles, is never touched). Walls, floors and big furniture always draw.
//  - Dynamic resolution: when frames take too long the pixel ratio steps down (to a floor), and
//    climbs back when there is room again.
import * as THREE from 'three';

const HIDE = 3; // camera layer that is never rendered
// Lambert has no specular sheen, so the same lamps read darker: lift the base colour to match
const LIFT = 1.6;
const baseOnBeforeCompile = THREE.Material.prototype.onBeforeCompile;

export function createLowPerf({ renderer, scene, camera }) {
  let on = false, quality = 'high', basePr = 1, minPr = 0.5, pr = 1;
  const pairs = []; // [original, lambert, snapshot]
  const swapped = []; // [mesh, originalMaterial]
  let cands = [], refreshT = 0, cullT = 0, CULL = 22;
  const wp = new THREE.Vector3();

  function lambertFor(m) {
    if (m.userData.lambert) return m.userData.lambert;
    if (!(m.isMeshStandardMaterial) || m.onBeforeCompile !== baseOnBeforeCompile || m.userData.keepPBR || (m.transmission > 0) || m.isShaderMaterial) return null;
    const l = new THREE.MeshLambertMaterial({
      color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
      transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, alphaMap: m.alphaMap, side: m.side, depthWrite: m.depthWrite, depthTest: m.depthTest,
      vertexColors: m.vertexColors, fog: m.fog, aoMap: m.aoMap, aoMapIntensity: m.aoMapIntensity, lightMap: m.lightMap, lightMapIntensity: m.lightMapIntensity,
      blending: m.blending, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits, flatShading: m.flatShading,
    });
    l.color = m.color.clone(); l.emissive = m.emissive.clone(); l.name = m.name; l.visible = m.visible; l.toneMapped = m.toneMapped; l.dithering = m.dithering;
    // metal reads too dark without its reflections: lift it a little
    l.color.multiplyScalar(LIFT * (m.metalness > 0.5 ? 1.25 : 1));
    l.userData.fromPBR = m;
    m.userData.lambert = l;
    pairs.push([m, l, snap(m)]);
    return l;
  }
  const snap = m => ({ c: m.color.getHex(), e: m.emissive.getHex(), ei: m.emissiveIntensity, o: m.opacity, v: m.visible, t: m.transparent, map: m.map, em: m.emissiveMap });
  function sync() {
    for (const pr of pairs) {
      const [m, l, s] = pr;
      if (m.color.getHex() !== s.c) { l.color.copy(m.color).multiplyScalar(LIFT * (m.metalness > 0.5 ? 1.25 : 1)); s.c = m.color.getHex(); }
      if (m.emissive.getHex() !== s.e) { l.emissive.copy(m.emissive); s.e = m.emissive.getHex(); }
      if (m.emissiveIntensity !== s.ei) { l.emissiveIntensity = s.ei = m.emissiveIntensity; }
      if (m.opacity !== s.o) { l.opacity = s.o = m.opacity; }
      if (m.visible !== s.v) { l.visible = s.v = m.visible; }
      if (m.transparent !== s.t) { l.transparent = s.t = m.transparent; l.needsUpdate = true; }
      if (m.map !== s.map) { l.map = s.map = m.map; l.needsUpdate = true; }
      if (m.emissiveMap !== s.em) { l.emissiveMap = s.em = m.emissiveMap; l.needsUpdate = true; }
    }
  }
  function swapAll() {
    scene.traverse(o => {
      if (!o.isMesh || o.userData.lowSwapped || o.isInstancedMesh && o.userData.keepPBR) return;
      const mats = [].concat(o.material); let any = false;
      const out = mats.map(m => { const l = m && lambertFor(m); if (l) { any = true; return l; } return m; });
      if (!any) return;
      o.userData.lowSwapped = true; swapped.push([o, o.material]);
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  }
  function unswapAll() {
    for (const [o, m] of swapped) { o.material = m; o.userData.lowSwapped = false; }
    swapped.length = 0;
  }

  // ---- distance culling ----
  function refreshCands() {
    cands = [];
    scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noCull) return;
      const g = o.geometry; if (!g) return;
      // lights you see from afar in the dark (bulbs, flames, glowing glass) always draw
      if ([].concat(o.material).some(m => m && (m.isMeshBasicMaterial || (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05) || m.blending === THREE.AdditiveBlending))) return;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const s = o.matrixWorld.getMaxScaleOnAxis(), r = g.boundingSphere.radius * s;
      if (r < 0.6) cands.push(o);
    });
  }
  function cull() {
    const c = camera.position, c2 = CULL * CULL;
    for (const o of cands) {
      const e = o.matrixWorld.elements, dx = e[12] - c.x, dy = e[13] - c.y, dz = e[14] - c.z;
      const far = dx * dx + dy * dy + dz * dz > c2;
      if (far) { if (o.layers.mask !== (1 << HIDE)) { o.userData.layersMask = o.layers.mask; o.layers.set(HIDE); } }
      else if (o.layers.mask === (1 << HIDE)) o.layers.mask = o.userData.layersMask ?? 1;
    }
  }
  function uncullAll() { for (const o of cands) if (o.layers.mask === (1 << HIDE)) o.layers.mask = o.userData.layersMask ?? 1; cands = []; }

  // ---- dynamic resolution ----
  let acc = 0, n = 0, judgeT = 0;
  function setPr(v) { pr = v; renderer.setPixelRatio(v); renderer.setSize(innerWidth, innerHeight); }

  return {
    get active() { return on; }, get pixelRatio() { return pr; }, get pairs() { return pairs.length; }, get culled() { let k = 0; for (const o of cands) if (o.layers.mask === (1 << HIDE)) k++; return k; },
    setQuality(q, base) {
      quality = q; basePr = base; on = q === 'low' || q === 'xlow';
      minPr = q === 'xlow' ? 0.35 : 0.45; CULL = q === 'xlow' ? 18 : 22;
      pr = renderer.getPixelRatio();
      if (on) { swapAll(); refreshCands(); refreshT = 3; } else { unswapAll(); uncullAll(); }
    },
    // after something new was built (a floor, an avatar): pick up its materials and meshes
    rescan() { if (on) { swapAll(); refreshCands(); } },
    frame(realMs) {
      if (!on) return;
      refreshT -= realMs / 1000; if (refreshT <= 0) { refreshT = 4; swapAll(); refreshCands(); }
      if (++cullT % 8 === 0) cull();
      if (cullT % 4 === 0) sync();
      // judge the frame rate every ~2 s; don't react to single hitches
      if (realMs < 1000) { acc += realMs; n++; }
      judgeT += realMs;
      if (judgeT > 2000 && n > 5) {
        const avg = acc / n; acc = 0; n = 0; judgeT = 0;
        if (avg > 45 && pr > minPr + 0.01) setPr(Math.max(minPr, pr * 0.85));
        else if (avg < 24 && pr < basePr - 0.01) setPr(Math.min(basePr, pr * 1.12));
      } else if (judgeT > 2000) { acc = 0; n = 0; judgeT = 0; }
    },
  };
}
