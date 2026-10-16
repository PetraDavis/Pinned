// Browser and GPU capability check. Picks a safe default graphics quality the first time
// the game runs (Firefox and Safari default to Medium, software or weak GPUs to Low), and
// says how many point lights may be active at once so shaders stay small enough for
// Firefox's and Safari's shader compilers.
export function detectCaps() {
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
  const weak = software || /Intel.*(HD|UHD) Graphics [2-6]\d\d\b|Mali-[GT][0-7]\d\b|Adreno \(TM\) [3-5]\d\d/i.test(gpu);
  const defaultQuality = weak ? 'low' : (firefox || safari) ? 'medium' : 'high';
  // nearest-N point lights (a fixed count, so three.js never recompiles shaders on the move)
  const maxLights = weak ? 8 : (firefox || safari) ? 8 : 12;
  return { firefox, safari, gpu, software, weak, defaultQuality, maxLights };
}

// Keep at most `max` non-shadow point lights visible: the nearest to the camera. The visible
// count stays constant, so material programs are never rebuilt as the player walks.
export function createLightLimiter(scene, max) {
  let pool = [], tick = 0;
  const refresh = () => { pool.forEach(l => { l.visible = true; }); pool = []; scene.traverse(o => { if (o.isPointLight && !o.castShadow && !o.userData.noLimit) pool.push(o); }); };
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
      live.forEach(([, l], i) => { l.visible = i < max; });
    },
  };
}
