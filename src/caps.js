// Browser and GPU capability check. Picks a safe default graphics quality the first time
// the game runs (Firefox and Safari default to Medium, software or weak GPUs to Low), and
// says how many point lights may be active at once so shaders stay small enough for
// Firefox's and Safari's shader compilers.
let cached = null;
export function detectCaps() {
  if (cached) return cached;
  const ua = navigator.userAgent || '';
  const firefox = /Firefox\//.test(ua);
  const safari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);
  let gpu = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : (gl ? String(gl.getParameter(gl.RENDERER)) : '');
    const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch { /* no WebGL info */ }
  const software = /SwiftShader|llvmpipe|Software|Basic Render/i.test(gpu);
  // Chromebooks and small machines (few cores, little memory) are weak whatever the GPU says
  const cros = /\bCrOS\b/.test(ua), cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
  const weak = software || cros || cores <= 2 || mem <= 4 || /Intel.*(HD|UHD) Graphics [2-6]\d\d\b|Mali-[GT][0-7]\d\b|Adreno \(TM\) [3-5]\d\d/i.test(gpu);
  const defaultQuality = software ? 'xlow' : weak ? 'low' : (firefox || safari) ? 'medium' : 'high';
  // nearest-N point lights (a fixed count, so three.js never recompiles shaders on the move)
  const maxLights = weak ? 8 : (firefox || safari) ? 8 : 12;
  return (cached = { firefox, safari, gpu, software, weak, defaultQuality, maxLights });
}

// Keep at most `max` non-shadow point lights visible: the nearest to the camera. The visible
// count stays constant, so material programs are never rebuilt as the player walks.
export function createLightLimiter(scene, max) {
  let pool = [], tick = 0, want = null;
  const refresh = () => { pool.forEach(l => { l.visible = true; }); pool = []; scene.traverse(o => { if (o.isPointLight && !o.castShadow && !o.userData.noLimit) { pool.push(o); if (o.distance > 0 && !o.userData.longer) { o.distance *= 1.7; o.userData.longer = true; } } }); };
  const p = { x: 0, y: 0, z: 0 };
  return {
    refresh,
    update(camera, force = false) {
      if (!pool.length) refresh();
      if (!force && (tick++ % 10)) return; // every 10 frames is plenty
      // only lights whose parents are visible count (the inactive zone is hidden)
      const live = [];
      for (const l of pool) {
        let o = l.parent, vis = true; while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
        if (!vis) continue;
        l.getWorldPosition(p.v || (p.v = camera.position.clone()));
        live.push([p.v.distanceToSquared(camera.position) * (l.userData.fill ? 0.3 : 1), l]); // room fills win ties
      }
      live.sort((a, b) => a[0] - b[0]);
      want = new Set(live.slice(0, max).map(e => e[1]));
      for (const l of pool) if (!want.has(l) && l.visible && !live.some(e => e[1] === l)) { l.visible = false; } // its floor is hidden
      // swap: an unwanted light that has faded out gives its slot to a wanted one
      const out = live.filter(([, l]) => l.visible && !want.has(l)).map(e => e[1]), inn = live.filter(([, l]) => !l.visible && want.has(l)).map(e => e[1]);
      let vis = live.filter(([, l]) => l.visible).length;
      for (const l of inn) { const o = out.find(o => (o.userData.fade ?? 1) <= 0.01); if (o) { o.visible = false; out.splice(out.indexOf(o), 1); } else if (vis >= max) continue; else vis++; l.userData.fade = 0; l.visible = true; }
    },
    // fade lights toward wanted/unwanted every frame, so lights never pop
    fade(dt) {
      if (!want) return;
      for (const l of pool) {
        if (!l.visible) continue;
        const u = l.userData, target = want.has(l) ? 1 : 0;
        u.fade = (u.fade ?? 1) + Math.sign(target - (u.fade ?? 1)) * Math.min(Math.abs(target - (u.fade ?? 1)), dt * 2.5);
        if (u.faded === undefined || l.intensity !== u.faded) u.raw = l.intensity; // someone else set it this frame
        l.intensity = u.faded = u.raw * u.fade;
      }
    },
  };
}
