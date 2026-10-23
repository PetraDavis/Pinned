// Multiplayer escape test: one player (host|guest) takes the key, is caught by the escape Mother,
// and must respawn into a working escape; both players must then reach the ending.
// Usage: node tools/test-escape-mp.mjs [host|guest] [low|xlow|medium] [url] [peerServer] [peerjs.esm.js]
// Needs a local PeerJS server (default 127.0.0.1:9000/) and a local copy of peerjs@1.5.4 ESM.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const WHO = process.argv[2] || 'guest', Q = process.argv[3] || 'low', URL0 = process.argv[4] || 'http://localhost:8113/', PEER = process.argv[5] || '127.0.0.1:9000/', PJS = process.argv[6] || 'peerjs.esm.js';
const peerjs = fs.readFileSync(PJS, 'utf8');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
async function open(name) {
  const ctx = await b.newContext({ viewport: { width: 480, height: 300 } });
  await ctx.addInitScript(([n, q]) => { localStorage.setItem('pinned.settings', JSON.stringify({ quality: q, qualityChosen: true, tutorial: false })); localStorage.setItem('pinned.mpName', n); }, [name, Q]);
  await ctx.route('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/+esm', r => r.fulfill({ body: peerjs, contentType: 'text/javascript' }));
  const page = await ctx.newPage(); page.on('pageerror', e => console.log(name, 'PAGEERR', e.message)); page.on('console', m => { if (m.type() === 'error' && !/404|TUNNEL|net::/.test(m.text())) console.log(name, 'ERR', m.text().slice(0, 300)); });
  await page.goto(URL0 + '?peer=' + PEER);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hidden') && window.__pinned?.mp, null, { timeout: 600000, polling: 1000 });
  return page;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n, x); if (!c) fails++; };
const h = await open('Petra'), c = await open('Robin');
const code = await h.evaluate(() => window.__pinned.mp.hostGame(false));
await c.evaluate(k => window.__pinned.mp.joinCode(k), code);
await wait(5000); await h.evaluate(() => document.getElementById('mpLobbyStart').click()); await wait(8000);
const place = (p, x, z, yaw = 0) => p.evaluate(([x, z, yaw]) => { const P = window.__pinned; P.setZone('room'); const o = P.room.group.position; P.player.place(o.x + x, o.z + z, yaw); }, [x, z, yaw]);
await h.evaluate(() => window.__pinned.ground.attic.solveClock()); await wait(3000);
ok('guest sees the clock solved', await c.evaluate(() => window.__pinned.ground.attic.clockSolved));
await h.evaluate(() => { const M = window.__pinned.mother; setInterval(() => { try { if (!window.__pinned.escape.chasing) M.debugPlace(56, 176); } catch {} }, 100); });
const taker = WHO === 'guest' ? c : h, other = WHO === 'guest' ? h : c;
// the taker crawls through the hatch (real keys), the other waits on the landing
await place(other, 52, 182.5, 0);
await place(taker, 40.5, 174.2, Math.PI / 2); await wait(500);
await taker.evaluate(() => { window.__pinned.player.enabled = true; for (const k of ['KeyC', 'KeyW']) dispatchEvent(new KeyboardEvent('keydown', { code: k })); });
await taker.waitForFunction(() => { const P = window.__pinned; return P.player.pos.x - P.room.group.position.x < 38.4; }, null, { timeout: 40000, polling: 200 }).catch(() => {});
await taker.evaluate(() => { for (const k of ['KeyC', 'KeyW']) dispatchEvent(new KeyboardEvent('keyup', { code: k })); }); await wait(800);
ok(WHO + ' through the hatch', await taker.evaluate(() => window.__pinned.player.pos.x - window.__pinned.room.group.position.x < 38.6));
await place(taker, 35.45, 178.0); await wait(800);
const pr = await taker.evaluate(() => document.getElementById('prompt').textContent); ok(WHO + ' sees the key prompt', pr.includes('iron key'), pr);
await taker.evaluate(() => { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); });
for (const p of [h, c]) await p.waitForFunction(() => window.__pinned.escape.chasing, null, { timeout: 20000 }).catch(() => {});
const hs = await h.evaluate(() => ({ on: window.__pinned.escape.chasing, mode: window.__pinned.escape.debug.mode })), cs = await c.evaluate(() => ({ on: window.__pinned.escape.chasing, mode: window.__pinned.escape.debug.mode, vis: window.__pinned.escape.debug.visible }));
ok('chase begun on host', hs.on, JSON.stringify(hs)); ok('chase begun on guest', cs.on, JSON.stringify(cs));
// caught about 5 s in: stand the taker right in front of her
await wait(2000);
const victim = taker;
for (let k = 0; k < 40; k++) {
  const d = await h.evaluate(() => window.__pinned.escape.debug);
  await victim.evaluate(([x, z]) => { const P = window.__pinned; const o = P.room.group.position; P.player.place(o.x + x, o.z + z + 0.4, Math.PI); }, [d.x, d.z]);
  await wait(400);
  if (await victim.evaluate(() => window.__pinned.state === 'cutscene')) break;
}
console.log('caught', await victim.evaluate(() => window.__pinned.state));
await victim.waitForFunction(() => window.__pinned.state === 'playing', null, { timeout: 30000, polling: 300 }).catch(() => {});
await wait(3000);
for (const [n, pg] of [['host', h], ['guest', c]]) {
  const s2 = await pg.evaluate(() => { const P = window.__pinned, o = P.room.group.position, d = P.escape.debug; return { st: P.state, on: P.escape.chasing, mode: d.mode, x: +(P.player.pos.x - o.x).toFixed(1), z: +(P.player.pos.z - o.z).toFixed(1), escVisited: !!P.visited.escape, errs: (window.__pinnedErrors || []).map(e => e.where + ':' + e.msg) }; });
  ok(n + ' still in a running escape after the catch', s2.on && s2.st === 'playing', JSON.stringify(s2));
}
// both go down the ladder; the victim can still finish
const prm = async (pg, x, z, want) => { await pg.evaluate(([x, z]) => { const P = window.__pinned; const o = P.room.group.position; P.player.place(o.x + x, o.z + z, 0); }, [x, z]); await pg.waitForFunction(t => (document.getElementById('prompt')?.textContent || '').includes(t), want, { timeout: 15000, polling: 200 }).catch(() => {}); const t = await pg.evaluate(() => document.getElementById('prompt').textContent); ok(want, t.includes(want), t); await pg.evaluate(() => { dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); }); await wait(2500); };
await prm(victim, 56.6, 183.6, 'climb down the ladder');
await prm(victim, 34.45, 86.1, 'go down the back stair');
await prm(victim, 30.2, 125.0, 'open the chains');
await h.waitForFunction(() => window.__pinned.escape.debug.tunnel > 0.9, null, { timeout: 60000, polling: 300 }).catch(() => {});
await victim.evaluate(() => { const P = window.__pinned; const o = P.room.group.position; P.player.place(o.x + 27.5, o.z + 125, Math.PI / 2); P.player.enabled = true; dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); });
await h.waitForFunction(() => window.__pinned.state === 'ending', null, { timeout: 40000, polling: 300 }).catch(() => {});
ok('ending for host', await h.evaluate(() => window.__pinned.state === 'ending'), await h.evaluate(() => window.__pinned.state));
ok('ending for guest', await c.waitForFunction(() => window.__pinned.state === 'ending', null, { timeout: 20000 }).then(() => true, () => false));
console.log(WHO, Q, fails ? 'FAILS ' + fails : 'ALL OK');
await b.close();
