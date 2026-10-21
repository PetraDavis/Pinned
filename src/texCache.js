// A small IndexedDB store for slow-to-paint canvases, so a repeat visit can skip painting
// them. Everything is optional: any failure (private window, blocked storage) just means the
// canvas gets painted again. Bump VERSION whenever the painting code changes.
const VERSION = 1, DB = 'pinned-cache', STORE = 'canvases';
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
// a canvas with the stored picture on it, or null
export async function cachedCanvas(key, w, h) {
  try {
    const db = await timeout(open(), 1500); if (!db) return null;
    const blob = await timeout(new Promise((res) => { const rq = db.transaction(STORE).objectStore(STORE).get(`${VERSION}:${key}`); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }), 1500);
    if (!blob) return null;
    const bmp = await createImageBitmap(blob);
    if (bmp.width !== w || bmp.height !== h) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0); bmp.close && bmp.close();
    return c;
  } catch { return null; }
}
// store a canvas (in the background; the PNG is encoded off the main thread)
export function storeCanvas(key, canvas) {
  try {
    canvas.toBlob(async (blob) => {
      try { const db = await open(); if (!db || !blob) return; db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, `${VERSION}:${key}`); } catch { /* no cache */ }
    }, 'image/png');
  } catch { /* no cache */ }
}
