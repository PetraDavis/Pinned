// Petra's recorded sounds (audio/*.ogg, with .m4a for browsers without Opus). Loaded only
// when first wanted, never during the page load; every caller keeps its synthesized sound
// for when a file is not (yet) there. The single-file build carries the files inline
// (window.__PINNED_ASSETS, see tools/build.mjs).
// Off until Petra has listened to the processed takes and said yes (then true, and the audio/
// files go in with it).
export const VOICES = false;
const cache = new WeakMap(); // AudioContext -> Map(name -> Promise<AudioBuffer|null>)
let opus = null;
const assetUrl = p => (typeof window !== 'undefined' && window.__PINNED_ASSETS && window.__PINNED_ASSETS[p]) || p;
export function loadSample(ctx, name) {
  if (!ctx || !VOICES) return Promise.resolve(null);
  let m = cache.get(ctx); if (!m) cache.set(ctx, m = new Map());
  if (m.has(name)) return m.get(name);
  if (opus === null) { try { opus = !!new Audio().canPlayType('audio/ogg; codecs=opus'); } catch { opus = false; } }
  const files = opus ? [`audio/${name}.ogg`, `audio/${name}.m4a`] : [`audio/${name}.m4a`, `audio/${name}.ogg`];
  const p = (async () => {
    for (const f of files) {
      try {
        const res = await fetch(assetUrl(f)); if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        return await new Promise((ok, bad) => { const r = ctx.decodeAudioData(ab, ok, bad); if (r && r.then) r.then(ok, bad); });
      } catch { /* next file */ }
    }
    return null;
  })();
  m.set(name, p); return p;
}
// a loaded buffer right now, or null (and start loading it)
const ready = new WeakMap();
export function sampleNow(ctx, name) {
  let r = ready.get(ctx); if (!r) ready.set(ctx, r = new Map());
  if (!r.has(name)) { r.set(name, null); loadSample(ctx, name).then(b => r.set(name, b)); }
  return r.get(name);
}
