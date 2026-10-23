// Regression test: the whole escape, start to ending.
//   node tools/test-escape.mjs [quality=low] [url=http://localhost:8811/dist/index.html]
// Needs Playwright; CHROME=path to a Chromium binary (default: the Playwright one in this container).
// attic (clock solved) -> crawl the hatch -> chamber -> key -> ladder D down -> First Floor ->
// back stair B -> catacombs -> tunnel chains -> walk into the tunnel -> ending.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const Q = process.argv[2] || 'low', URL = process.argv[3] || 'http://localhost:8811/dist/index.html';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 640, height: 400 } });
await ctx.addInitScript(q => { localStorage.setItem('pinned.settings', JSON.stringify({ quality: q, qualityChosen: true, tutorial: false })); }, Q);
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERR', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|TUNNEL|net::/.test(m.text())) console.log('ERR', m.text().slice(0, 300)); });
await p.goto(URL);
await p.waitForFunction(() => document.getElementById('loading')?.classList.contains('hidden') && window.__pinned, null, { timeout: 600000, polling: 1000 });
const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
let fails = 0; const ok = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, x); if (!c) fails++; return c; };
const where = () => ev(() => { const P = window.__pinned, o = P.room.group.position; return { x: +(P.player.pos.x - o.x).toFixed(2), z: +(P.player.pos.z - o.z).toFixed(2), st: P.state, prompt: document.getElementById('prompt')?.textContent || '' }; });
const place = (x, z, yaw = 0) => ev(([x, z, yaw]) => { const P = window.__pinned; P.setZone('room'); const o = P.room.group.position; P.player.place(o.x + x, o.z + z, yaw); }, [x, z, yaw]);
// stand at a spot, wait for the prompt, press E (a real key press)
async function use(x, z, want) {
  await place(x, z);
  await p.waitForFunction(t => (document.getElementById('prompt')?.textContent || '').includes(t), want, { timeout: 15000, polling: 200 }).catch(() => {});
  const w = await where(); if (!ok(`prompt "${want}"`, w.prompt.includes(want), JSON.stringify(w))) return false;
  await ev(() => { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); });
  await p.waitForFunction(() => window.__pinned.state === 'playing', null, { timeout: 20000, polling: 200 }).catch(() => {});
  await wait(1200); return true;
}
const hold = (keys, on) => ev(([keys, on]) => { for (const k of keys) dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: k })); }, [keys, on]);
await ev(() => window.__pinned.start(null, {})); await wait(2000);
// keep her from catching us while the route is walked (this test is about the doors, not the chase)
// (the attic Mother wakes once the clock is solved and hunts you in her chamber: keep her at the far end while we walk)
await ev(() => { const M = window.__pinned.mother; window.__noCatch = setInterval(() => { try { if (!window.__pinned.escape.chasing) M.debugPlace(56, 176); } catch {} }, 100); });
await ev(() => window.__pinned.ground.attic.solveClock()); await wait(1000);
// 1. the attic hatch: crouch and crawl through
await place(40.5, 174.2, Math.PI / 2);
await p.waitForFunction(() => (document.getElementById('prompt')?.textContent || '').includes('Crouch'), null, { timeout: 15000, polling: 200 }).catch(() => {});
ok('hatch prompt', (await where()).prompt.includes('Crouch'), (await where()).prompt);
await ev(() => { window.__pinned.player.enabled = true; }); await hold(['KeyC', 'KeyW'], true);
await p.waitForFunction(() => { const P = window.__pinned; return P.player.pos.x - P.room.group.position.x < 38.4; }, null, { timeout: 30000, polling: 200 }).catch(() => {});
await hold(['KeyC', 'KeyW'], false); await wait(800);
let w = await where(); ok('crawled through the hatch into her chamber', w.x < 38.6, JSON.stringify(w));
ok('chamber visited', await ev(() => !!window.__pinned.visited.chamber));
// 2. the key in the nest
await use(35.45, 178.0, 'take the iron key');
ok('the chase has begun', await ev(() => window.__pinned.escape.chasing), JSON.stringify(await ev(() => window.__pinned.escape.debug)));
// 2b. back out through the hatch the way you came (crawl east), as a player has to
await place(37.6, 174.2, -Math.PI / 2); await wait(400);
await ev(() => { window.__pinned.player.enabled = true; }); await hold(['KeyC', 'KeyW'], true);
await p.waitForFunction(() => { const P = window.__pinned; return P.player.pos.x - P.room.group.position.x > 40.2 || P.state !== 'playing'; }, null, { timeout: 30000, polling: 200 }).catch(() => {});
await hold(['KeyC', 'KeyW'], false); await wait(500);
w = await where(); ok('crawled back out through the hatch after taking the key', w.x > 40.2, JSON.stringify(w));
// 3. down ladder D
await use(56.6, 183.6, 'climb down the ladder');
w = await where(); ok('on the First Floor', w.z > 70 && w.z < 110, JSON.stringify(w));
// 4. the back stair B into the catacombs
await use(34.45, 86.1, 'go down the back stair');
w = await where(); ok('in the catacombs', w.z > 110 && w.z < 165, JSON.stringify(w));
// 5. the tunnel chains
await use(30.2, 125.0, 'open the chains');
await p.waitForFunction(() => window.__pinned.escape.debug.tunnel > 0.9, null, { timeout: 60000, polling: 300 }).catch(() => {});
ok('tunnel open', await ev(() => window.__pinned.escape.debug.tunnel > 0.9), await ev(() => window.__pinned.escape.debug.tunnel));
// 6. into the tunnel: the ending
await place(27.5, 125.0, Math.PI / 2); await ev(() => { window.__pinned.player.enabled = true; }); await hold(['KeyW'], true);
await p.waitForFunction(() => window.__pinned.state === 'ending', null, { timeout: 30000, polling: 200 }).catch(() => {});
await hold(['KeyW'], false);
w = await where(); ok('the ending', w.st === 'ending', JSON.stringify(w));
console.log(Q, fails ? 'FAILS ' + fails : 'ALL OK');
await b.close();
process.exit(fails ? 1 : 0);
