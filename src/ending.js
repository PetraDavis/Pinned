// The ending, after the tunnel. Non-interactive, three scenes that fade into one another,
// with no words but a specimen label and the title:
//  a. your own bedroom at night; on the window glass, a large moth no book would name. Its
//     wing marks are the marks that came up under your reflection's skin (drawWingMarks).
//  b. the same room, before dawn: in the corner, a cocoon as tall as you, split and empty.
//     The window is open.
//  c. a collector's gloved hand pins that moth into a glass case. Its label: species unknown.
// Then PINNED, and back to the home screen. Esc skips, once it has been seen through once.
// Rendered in its own small scene with the game's renderer (main.js: state 'ending').
import * as THREE from 'three';
import { drawWingMarks } from './world/avatar.js';
import { silkTex } from './world/lowerUpper.js';
import { drawMoth, drawLabel, SPECIES } from './moths.js';
import { rand } from './world/build.js';

const SEEN_KEY = 'pinned.endingSeen';
const seen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} };
const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
const ctex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- the moth: pale as the reflection's hair, with the reflection's marks ----------
function wingTex() {
  return ctex(cv(512, 512, (g) => {
    const r = rand(1848);
    const fore = new Path2D(); fore.moveTo(4, 236); fore.bezierCurveTo(120, 150, 300, 60, 486, 70); fore.bezierCurveTo(500, 120, 470, 200, 440, 262); fore.bezierCurveTo(300, 280, 140, 272, 4, 268); fore.closePath();
    const hind = new Path2D(); hind.moveTo(4, 262); hind.bezierCurveTo(150, 250, 320, 270, 350, 330); hind.bezierCurveTo(370, 410, 270, 470, 190, 462); hind.bezierCurveTo(100, 452, 30, 380, 4, 300); hind.closePath();
    for (const [path, x0, y0, x1, y1] of [[hind, 0, 262, 340, 460], [fore, 0, 240, 480, 80]]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#b8ae9e'); gr.addColorStop(0.45, '#d8cfbf'); gr.addColorStop(1, '#c6bcaa');
      g.fillStyle = gr; g.fill(path);
      g.save(); g.clip(path);
      for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,78,66' : '245,240,230'},${r() * 0.09})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1); } // powder
      g.strokeStyle = 'rgba(110,96,82,0.28)'; g.lineWidth = 1.4; // veins from the base
      for (let k = 0; k < 9; k++) { const a = -0.55 + k * 0.17; g.beginPath(); g.moveTo(4, 262); g.quadraticCurveTo(200 * Math.cos(a), 262 + 200 * Math.sin(a) - 30, 520 * Math.cos(a), 262 + 520 * Math.sin(a)); g.stroke(); }
      g.strokeStyle = 'rgba(120,104,90,0.35)'; g.lineWidth = 6; g.stroke(path); // darker fringe
      g.restore();
    }
    // the marks: the same nested rings round a dark centre that showed under the skin in the mirrors
    drawWingMarks(g, 292, 188, 2.9, 0.62, '120,100,90', '90,66,58', 0.75);
    drawWingMarks(g, 214, 368, 2.1, 0.55, '120,100,90', '90,66,58', 0.7);
    // a faint cross-line, as the cheek marks had
    g.strokeStyle = 'rgba(130,110,96,0.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, 160); g.quadraticCurveTo(300, 120, 440, 236); g.stroke();
  }));
}
function buildMoth(span = 0.3) {
  const m = new THREE.Group();
  const wt = wingTex(), W = span / 2;
  const wingMat = new THREE.MeshStandardMaterial({ map: wt, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const wings = [];
  for (const s of [1, -1]) {
    const geo = new THREE.PlaneGeometry(W, W, 8, 8); geo.translate(W / 2, -W * 0.02, 0);
    const piv = new THREE.Group(); const mesh = new THREE.Mesh(geo, wingMat); piv.add(mesh); piv.scale.x = s; m.add(piv); wings.push(piv);
  }
  const fur = new THREE.MeshStandardMaterial({ color: 0xcdc2b0, roughness: 1 });
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), fur); thorax.scale.set(W * 0.09, W * 0.14, W * 0.09); thorax.position.y = W * 0.02; m.add(thorax);
  const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(W * 0.065, W * 0.3, 6, 12), fur); abdomen.position.y = -W * 0.26; m.add(abdomen);
  const head = new THREE.Mesh(new THREE.SphereGeometry(W * 0.07, 14, 10), fur); head.position.y = W * 0.17; m.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.2, metalness: 0.2 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(W * 0.035, 10, 8), eyeMat); e.position.set(s * W * 0.05, W * 0.19, W * 0.03); m.add(e);
    const ant = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(s * W * 0.03, W * 0.22, 0), new THREE.Vector3(s * W * 0.12, W * 0.4, 0.004), new THREE.Vector3(s * W * 0.26, W * 0.5, 0)), 10, W * 0.008, 4), fur); m.add(ant); }
  m.userData.wings = wings;
  m.userData.setOpen = (k) => { wings.forEach((w) => { w.rotation.y = (1 - k) * 1.2; }); };
  return m;
}

// ---------- a cotton-gloved hand, holding an insect pin between finger and thumb ----------
function buildHand() {
  const h = new THREE.Group();
  const glove = new THREE.MeshStandardMaterial({ color: 0xe9e5db, roughness: 1, map: ctex(cv(64, 64, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 2) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, 64, 1); } })) });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.95 });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glove); palm.scale.set(0.045, 0.019, 0.055); h.add(palm);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.08, 16), glove); wrist.rotation.x = Math.PI / 2; wrist.position.z = 0.075; wrist.scale.set(1.2, 1, 0.65); h.add(wrist);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.26, 16), sleeve); cuff.rotation.x = Math.PI / 2; cuff.position.z = 0.24; h.add(cuff);
  const seg = (len, r) => new THREE.CapsuleGeometry(r, len, 4, 10).translate(0, -len / 2 - r * 0.2, 0);
  // fingers along -z from the knuckles, bending down (-y); the index and the thumb pinch at the tip
  const finger = (x, curl, lens, r, splay = 0) => {
    let parent = new THREE.Group(); parent.position.set(x, 0, -0.05); parent.rotation.set(-Math.PI / 2 + 0.25, splay, 0); h.add(parent);
    const root = parent;
    lens.forEach((len, i) => { const m = new THREE.Mesh(seg(len, r * (1 - i * 0.08)), glove); parent.add(m); const j = new THREE.Group(); j.position.y = -len - r * 0.2; j.rotation.x = -curl[i]; parent.add(j); parent = j; });
    return { root, tip: parent };
  };
  const index = finger(-0.026, [0.5, 0.6, 0.4], [0.03, 0.022, 0.016], 0.0095, 0.12);
  finger(-0.008, [1.0, 1.1, 0.7], [0.032, 0.022, 0.016], 0.0098, 0.02);
  finger(0.012, [1.15, 1.1, 0.7], [0.03, 0.02, 0.015], 0.0094, -0.06);
  finger(0.03, [1.25, 1.0, 0.6], [0.024, 0.017, 0.013], 0.0085, -0.16);
  // the thumb, from the inside of the palm, reaching across to the index tip
  const tg = new THREE.Group(); tg.position.set(-0.04, -0.012, 0.0); tg.rotation.set(-1.2, 0.9, 0.3); h.add(tg);
  { let p = tg; [[0.028, 0.35], [0.022, 0.35]].forEach(([len, c]) => { const m = new THREE.Mesh(seg(len, 0.011), glove); p.add(m); const j = new THREE.Group(); j.position.y = -len; j.rotation.x = -c; p.add(j); p = j; }); }
  // the pin: long, fine, black-headed
  const pin = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 0.038, 6), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.25 })); shaft.position.y = -0.019; pin.add(shaft);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0016, 8, 6), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3 })); pin.add(bead);
  h.userData.pin = pin;
  return h;
}

// ---------- the bedroom ----------
function buildBedroom(q) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x020306);
  const R = { scene: s };
  const W = 3.6, D = 3.4, H = 2.5;
  const paint = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.95 });
  const floorT = ctex(cv(256, 256, (g) => { g.fillStyle = '#6a5040'; g.fillRect(0, 0, 256, 256); const r = rand(3); for (let y = 0; y < 256; y += 32) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.1})`; g.fillRect(0, y, 256, 2); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,200'},${r() * 0.06})`; g.fillRect(0, y + r() * 30, 256, 1); } } }));
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(3, 3);
  const add = (geo, m, x, y, z, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; s.add(me); return me; };
  add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.6 }), 0, 0, 0).rotation.x = -Math.PI / 2;
  add(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x8a8c94, roughness: 1 }), 0, H, 0).rotation.x = Math.PI / 2;
  // north wall with the window hole (x 0.0..1.1, y 0.9..2.05)
  const WX0 = -0.1, WX1 = 1.0, WY0 = 0.9, WY1 = 2.05, ZN = -D / 2;
  add(new THREE.PlaneGeometry(WX0 + W / 2, H), paint, (-W / 2 + WX0) / 2, H / 2, ZN);
  add(new THREE.PlaneGeometry(W / 2 - WX1, H), paint, (WX1 + W / 2) / 2, H / 2, ZN);
  add(new THREE.PlaneGeometry(WX1 - WX0, WY0), paint, (WX0 + WX1) / 2, WY0 / 2, ZN);
  add(new THREE.PlaneGeometry(WX1 - WX0, H - WY1), paint, (WX0 + WX1) / 2, (WY1 + H) / 2, ZN);
  add(new THREE.PlaneGeometry(D, H), paint, -W / 2, H / 2, 0, Math.PI / 2);
  add(new THREE.PlaneGeometry(D, H), paint, W / 2, H / 2, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(W, H), paint, 0, H / 2, D / 2, Math.PI);
  // window frame, sill, sash bars
  const frame = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6 });
  const WCX = (WX0 + WX1) / 2, WCY = (WY0 + WY1) / 2;
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.1, 0.06, WCX, WY0], [WX1 - WX0 + 0.1, 0.06, WCX, WY1], [0.06, WY1 - WY0, WX0, WCY], [0.06, WY1 - WY0, WX1, WCY], [0.04, WY1 - WY0, WCX, WCY]]) add(new THREE.BoxGeometry(w, h, 0.1), frame, x, y, ZN);
  add(new THREE.BoxGeometry(WX1 - WX0 + 0.2, 0.04, 0.22), frame, WCX, WY0 - 0.02, ZN + 0.08);
  // two casements; the right one opens outwards in the morning
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa8c0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, depthWrite: false });
  const smear = ctex(cv(256, 256, (g) => { g.clearRect(0, 0, 256, 256); const r = rand(9); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(220,214,200,${r() * 0.12})`; g.beginPath(); g.ellipse(80 + r() * 100, 90 + r() * 90, 4 + r() * 18, 2 + r() * 8, r() * 3, 0, 7); g.fill(); } }));
  add(new THREE.PlaneGeometry(WCX - WX0, WY1 - WY0), glassMat, (WX0 + WCX) / 2, WCY, ZN - 0.01);
  const rightPivot = new THREE.Group(); rightPivot.position.set(WX1, 0, ZN - 0.02); s.add(rightPivot);
  const rightGlass = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WCX, WY1 - WY0), glassMat); rightGlass.position.set(-(WX1 - WCX) / 2, WCY, 0); rightPivot.add(rightGlass);
  const powder = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: smear, transparent: true, depthWrite: false })); powder.position.set(-(WX1 - WCX) / 2, WCY + 0.05, 0.002); rightPivot.add(powder);
  const sashBar = new THREE.Mesh(new THREE.BoxGeometry(WX1 - WCX, 0.03, 0.03), frame); sashBar.position.set(-(WX1 - WCX) / 2, WCY, 0); rightPivot.add(sashBar);
  R.rightPivot = rightPivot; R.powder = powder;
  // outside: the night (and later the grey before dawn)
  const sky = (dawn) => ctex(cv(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); if (dawn) { gr.addColorStop(0, '#4a5466'); gr.addColorStop(0.7, '#8a8c96'); gr.addColorStop(1, '#a89c94'); } else { gr.addColorStop(0, '#05070e'); gr.addColorStop(0.75, '#141a2c'); gr.addColorStop(1, '#262838'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rand(dawn ? 5 : 6);
    if (!dawn) { for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.6, 1.5, 1.5); }
      const mg = g.createRadialGradient(700, 110, 0, 700, 110, 90); mg.addColorStop(0, 'rgba(230,232,240,1)'); mg.addColorStop(0.3, 'rgba(230,232,240,0.9)'); mg.addColorStop(0.34, 'rgba(160,170,200,0.25)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.fillRect(560, 0, 300, 260); }
    // rooftops and trees
    g.fillStyle = dawn ? '#2a2c34' : '#020204';
    g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.72 - Math.abs(Math.sin(x * 0.011)) * 60 - Math.sin(x * 0.07) * 8 - (x > 300 && x < 520 ? 70 : 0)); g.lineTo(w, h); g.fill();
    if (!dawn) for (const [x, y] of [[340, 300], [380, 300], [460, 290]]) { g.fillStyle = 'rgba(255,200,120,0.8)'; g.fillRect(x, y, 10, 14); }
  }));
  R.skyNight = sky(false); R.skyDawn = sky(true);
  R.sky = add(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: R.skyNight, fog: false }), 0.6, 1.4, ZN - 3.5);
  // curtains
  const curtainMat = new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 1, side: THREE.DoubleSide });
  R.curtains = [];
  for (const x of [WX0 - 0.28, WX1 + 0.28]) { const g = new THREE.PlaneGeometry(0.42, 2.25, 8, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.025); g.computeVertexNormals(); R.curtains.push(add(g, curtainMat, x, 1.25, ZN + 0.07)); }
  // bed along the west wall, the duvet rumpled, a phone face down on it
  const duvet = new THREE.MeshStandardMaterial({ color: 0x6a7a8a, roughness: 1 });
  add(new THREE.BoxGeometry(1.0, 0.32, 2.0), new THREE.MeshStandardMaterial({ color: 0x3a2e28 }), -W / 2 + 0.52, 0.16, 0.55);
  { const g = new THREE.BoxGeometry(0.98, 0.16, 1.7, 10, 2, 16), p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 9) * Math.sin(p.getZ(i) * 5) * 0.04); g.computeVertexNormals(); add(g, duvet, -W / 2 + 0.52, 0.4, 0.7); }
  add(new THREE.BoxGeometry(0.6, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 1 }), -W / 2 + 0.52, 0.42, -0.25);
  // desk by the window, a laptop, a jar on the sill
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8b090, roughness: 0.7 });
  add(new THREE.BoxGeometry(1.0, 0.04, 0.55), wood, 1.55 - 0.05, 0.74, ZN + 0.3);
  for (const [x, z] of [[1.05, ZN + 0.06], [1.95, ZN + 0.06], [1.05, ZN + 0.54], [1.95, ZN + 0.54]]) add(new THREE.BoxGeometry(0.04, 0.74, 0.04), wood, x, 0.37, z);
  add(new THREE.BoxGeometry(0.34, 0.015, 0.24), new THREE.MeshStandardMaterial({ color: 0x9a9ca4, metalness: 0.6, roughness: 0.4 }), 1.5, 0.77, ZN + 0.32);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x5a7aa8 });
  const screen = add(new THREE.PlaneGeometry(0.32, 0.2), screenMat, 1.5, 0.88, ZN + 0.2); screen.rotation.x = -0.2; R.screen = screen;
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 16), new THREE.MeshPhysicalMaterial({ color: 0xc8d0d0, transparent: true, opacity: 0.35, roughness: 0.1 }), WX1 - 0.1, WY0 + 0.07, ZN + 0.1);
  // posters: a moth identification chart, and a plain gig poster
  const chart = ctex(cv(512, 720, (g, w, h) => {
    g.fillStyle = '#ece4d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2018'; g.font = 'bold 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('MOTHS', w / 2, 52);
    const keys = ['luna', 'atropos', 'caja', 'io', 'pavonia', 'papilionaria', 'cecropia', 'bucephala', 'elpenor', 'betularia', 'nupta', 'polyphemus'];
    keys.forEach((k, i) => drawMoth(g, k, 90 + (i % 3) * 166, 130 + Math.floor(i / 3) * 150, 130, { pin: false, seed: i + 3 }));
  }));
  add(new THREE.PlaneGeometry(0.6, 0.84), new THREE.MeshStandardMaterial({ map: chart, roughness: 0.9 }), W / 2 - 0.01, 1.55, -0.2, -Math.PI / 2);
  const gig = ctex(cv(256, 360, (g, w, h) => { g.fillStyle = '#1a1a22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c84a6a'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, h * 0.45, 20 + i * 18, 0, 7); g.stroke(); } g.fillStyle = '#e8d8c0'; g.fillRect(30, h - 70, w - 60, 10); g.fillRect(60, h - 50, w - 120, 6); }));
  add(new THREE.PlaneGeometry(0.42, 0.6), new THREE.MeshStandardMaterial({ map: gig, roughness: 0.9 }), -W / 2 + 0.01, 1.6, 0.4, Math.PI / 2);
  // fairy lights along the top of the west wall
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc070 }), 30);
  for (let i = 0; i < 30; i++) { const z = -D / 2 + 0.1 + i * 0.11; bulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-W / 2 + 0.03, 2.25 - Math.abs(Math.sin(i * 0.55)) * 0.12, z)); }
  s.add(bulbs); R.bulbs = bulbs;
  // a hoodie over the desk chair
  add(new THREE.BoxGeometry(0.42, 0.45, 0.42), new THREE.MeshStandardMaterial({ color: 0x2c333c, roughness: 1 }), 1.5, 0.45, ZN + 0.85);
  // lights
  R.amb = new THREE.HemisphereLight(0x6a7090, 0x201814, 0.5); s.add(R.amb);
  R.moon = new THREE.DirectionalLight(0x9aa8d0, 0.9); R.moon.position.set(1.4, 3, -6); R.moon.target.position.set(-0.4, 0, 0.6); s.add(R.moon, R.moon.target);
  R.fairy = new THREE.PointLight(0xffb060, 1.6, 4.5, 1.6); R.fairy.position.set(-W / 2 + 0.25, 2.1, -0.1); s.add(R.fairy);
  R.glow = new THREE.PointLight(0x7a9ad0, 0.6, 2.2, 2); R.glow.position.set(1.5, 0.95, ZN + 0.45); s.add(R.glow);
  R.onMoth = new THREE.PointLight(0xffd0a0, 0.25, 1.6, 2); R.onMoth.position.set(0.7, 1.55, ZN + 0.7); s.add(R.onMoth);
  // the moth, on the outside of the glass
  R.moth = buildMoth(0.3); R.moth.position.set(0.68, 1.5, ZN - 0.035); R.moth.rotation.z = 0.12; s.add(R.moth);
  // the cocoon, in the north-west corner: as tall as you, hung from the ceiling, split down the front and empty
  {
    const silk = silkTex();
    const prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(0.03 + Math.sin(Math.pow(t, 0.9) * Math.PI) * 0.34 * (1 - 0.18 * t), t * 1.9)); }
    const gap = 0.9, outer = new THREE.LatheGeometry(prof, 36, Math.PI / 2 + gap / 2, Math.PI * 2 - gap);
    { const p = outer.attributes.position, r = rand(41); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); const n = 1 + 0.06 * Math.sin(y * 13 + a * 3) + 0.03 * Math.sin(a * 11 + y * 31); p.setXYZ(i, x * n, y, z * n); } outer.computeVertexNormals(); }
    const cocoon = new THREE.Group(); cocoon.position.set(-W / 2 + 0.42, 0.42, ZN + 0.42); cocoon.rotation.y = 0.65 + Math.PI;
    const silkMat = new THREE.MeshStandardMaterial({ map: silk, color: 0xe0d8c8, roughness: 0.95, side: THREE.FrontSide });
    const insideMat = new THREE.MeshStandardMaterial({ map: silk, color: 0x4a4030, roughness: 1, side: THREE.BackSide });
    cocoon.add(new THREE.Mesh(outer, silkMat), new THREE.Mesh(outer, insideMat));
    // torn flaps peeled back along the split
    const flapMat = new THREE.MeshStandardMaterial({ map: silk, color: 0xd8d0c0, roughness: 1, side: THREE.DoubleSide, transparent: true, alphaTest: 0.3,
      alphaMap: ctex(cv(64, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); for (let y = 0; y <= 128; y += 8) g.lineTo(30 + Math.sin(y) * 20 + (y % 16) * 1.5, y); g.lineTo(0, 128); g.fill(); }), false) });
    for (const s2 of [-1, 1]) for (const [y, h] of [[0.6, 0.7], [1.15, 0.5]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, h), flapMat); const a = Math.PI / 2 + s2 * gap / 2; f.position.set(Math.sin(a + Math.PI / 2 - Math.PI / 2) * 0.33, y, Math.cos(a) * 0.33); f.rotation.y = a + s2 * 0.9; cocoon.add(f); }
    // silk threads holding it into the corner
    const pts = []; const r = rand(77); for (let i = 0; i < 40; i++) { const y = 0.4 + r() * 1.6; pts.push(-W / 2 + 0.42 + (r() - 0.5) * 0.4, y, ZN + 0.42 + (r() - 0.5) * 0.4, r() < 0.5 ? -W / 2 : -W / 2 + r() * 0.8, y + (r() - 0.3) * 0.5, r() < 0.5 ? ZN + r() * 0.8 : ZN); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const threads = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.4 }));
    // something left in the hollow at its foot: a scrap of dark grey knit, and the dust of wing scales
    const scrap = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.14), new THREE.MeshStandardMaterial({ color: 0x2c333c, roughness: 1, side: THREE.DoubleSide })); scrap.position.set(0.05, 0.1, 0.05); scrap.rotation.set(-1.2, 0.3, 0.2); cocoon.add(scrap);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.27), new THREE.MeshStandardMaterial({ color: 0x1c1a1a, roughness: 0.7 })); shoe.position.set(-W / 2 + 0.95, 0.04, ZN + 0.62); shoe.rotation.y = 0.9;
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.025, 0.275), new THREE.MeshStandardMaterial({ color: 0xd8d2c8 })); sole.position.copy(shoe.position).setY(0.012); sole.rotation.y = 0.9;
    R.cocoon = new THREE.Group(); R.cocoon.add(cocoon, threads, shoe, sole); s.add(R.cocoon);
  }
  R.set = (scene) => {
    const night = scene === 'a';
    R.moth.visible = night; R.cocoon.visible = !night; R.powder.visible = !night;
    R.sky.material.map = night ? R.skyNight : R.skyDawn; R.sky.material.needsUpdate = true;
    R.fairy.intensity = night ? 1.6 : 0; R.bulbs.visible = night; R.glow.intensity = night ? 0.6 : 0; R.screen.material.color.set(night ? 0x5a7aa8 : 0x0a0a0c); R.onMoth.intensity = night ? 0.35 : 0;
    R.moon.color.set(night ? 0x9aa8d0 : 0xb8bcc8); R.moon.intensity = night ? 0.9 : 1.4; R.amb.intensity = night ? 0.45 : 0.9; R.amb.color.set(night ? 0x6a7090 : 0x9aa0b0);
    R.rightPivot.rotation.y = night ? 0 : 0.85;
  };
  return R;
}

// ---------- the collector's table ----------
function buildCollector(q) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x030202);
  const C = { scene: s };
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); s.add(me); return me; };
  const tableT = ctex(cv(512, 512, (g) => { g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 512, 512); const r = rand(12); for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '0,0,0' : '120,80,50'},${r() * 0.2})`; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 20, 340, y + (r() - 0.5) * 20, 512, y); g.stroke(); } }));
  add(new THREE.BoxGeometry(2.4, 0.05, 1.4), new THREE.MeshStandardMaterial({ map: tableT, roughness: 0.45 }), 0, -0.025, 0);
  // the case: dark wood frame, a cream paper floor, and old specimens round the edge, each labelled
  const CW = 0.86, CD = 0.6, CH = 0.07;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.5 });
  for (const [w, d, x, z] of [[CW + 0.04, 0.02, 0, -CD / 2], [CW + 0.04, 0.02, 0, CD / 2], [0.02, CD, -CW / 2, 0], [0.02, CD, CW / 2, 0]]) add(new THREE.BoxGeometry(w, CH, d), frameMat, x, CH / 2, z);
  const others = ['atropos', 'betularia', 'caja', 'nupta', 'io', 'luna', 'pavonia', 'bucephala', 'elpenor', 'quercifolia', 'polyphemus', 'vinula'];
  const PX = 1600, PY = Math.round(PX * CD / CW);
  const paper = ctex(cv(PX, PY, (g, w, h) => {
    g.fillStyle = '#e8dfca'; g.fillRect(0, 0, w, h); const r = rand(4); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    const slots = [[0.12, 0.17], [0.31, 0.17], [0.5, 0.15], [0.69, 0.17], [0.88, 0.17], [0.12, 0.5], [0.88, 0.5], [0.12, 0.82], [0.31, 0.84], [0.5, 0.86], [0.69, 0.84], [0.88, 0.82]];
    slots.forEach(([u, v], i) => { const k = others[i]; drawMoth(g, k, u * w, v * h - 30, 200, { pin: true, seed: i + 11 }); drawLabel(g, k, u * w, v * h + 62, 150); });
    // the middle place, and its label: nothing to name it by
    const lx = w / 2, ly = h * 0.5 + 150, lw = 190, lh = lw * 0.46;
    g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(lx - lw / 2 + 2, ly + 2, lw, lh); g.fillStyle = '#f2ead6'; g.fillRect(lx - lw / 2, ly, lw, lh);
    g.strokeStyle = 'rgba(60,40,20,0.5)'; g.strokeRect(lx - lw / 2 + 6, ly + 4, lw - 12, lh - 8);
    g.fillStyle = '#2a1c10'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 26px "Segoe Script", "Lucida Handwriting", Georgia, cursive'; g.fillText('species unknown', lx, ly + lh / 2);
  }));
  const floor = add(new THREE.PlaneGeometry(CW - 0.02, CD - 0.02), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.95 }), 0, 0.012, 0); floor.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(CW, 0.012, CD), frameMat, 0, 0.006, 0);
  // the glass lid, hinged along the back
  C.lid = new THREE.Group(); C.lid.position.set(0, CH, -CD / 2); s.add(C.lid);
  const lidGlass = new THREE.Mesh(new THREE.PlaneGeometry(CW, CD), new THREE.MeshPhysicalMaterial({ color: 0xc8d0d8, transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); lidGlass.rotation.x = -Math.PI / 2; lidGlass.position.z = CD / 2; C.lid.add(lidGlass);
  for (const [w, d, x, z] of [[CW + 0.04, 0.025, 0, 0.0125], [CW + 0.04, 0.025, 0, CD - 0.0125], [0.025, CD, -CW / 2, CD / 2], [0.025, CD, CW / 2, CD / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), frameMat); b.position.set(x, 0.008, z); C.lid.add(b); }
  // the moth, wings set, waiting for its pin
  C.moth = buildMoth(0.3); C.moth.rotation.x = -Math.PI / 2; C.moth.position.set(0, 0.03, -0.02); C.moth.userData.setOpen(1); s.add(C.moth);
  // tools on the table: forceps, a setting board, a box of pins
  add(new THREE.BoxGeometry(0.02, 0.006, 0.18), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.9, roughness: 0.3 }), 0.62, 0.003, 0.2).rotation.y = 0.4;
  add(new THREE.BoxGeometry(0.08, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.6 }), 0.6, 0.01, -0.1);
  // the hand
  C.hand = buildHand(); s.add(C.hand); s.add(C.hand.userData.pin);
  // the lamp: one warm pool on the case
  C.lamp = new THREE.SpotLight(0xffd8a8, 9, 4, 0.55, 0.6, 1.5); C.lamp.position.set(-0.5, 1.3, 0.35); C.lamp.target.position.set(0, 0, 0); s.add(C.lamp, C.lamp.target);
  if (q !== 'low') { C.lamp.castShadow = true; C.lamp.shadow.mapSize.set(1024, 1024); C.lamp.shadow.bias = -0.0004; C.hand.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  floor.receiveShadow = true;
  s.add(new THREE.HemisphereLight(0x504840, 0x080604, 0.35));
  return C;
}

// ---------- the sequence ----------
// times in seconds: [a: 1.5-12.5] [b: 13.5-22] [c: 23-35.5] [title: 36.5-42.5] -> home
const T = { aIn: 1.5, aOut: 12.5, bIn: 13.5, bOut: 22, cIn: 23, cOut: 35.5, title: 36.5, end: 43 };
export function createEnding({ renderer, quality, sfx = {}, onDone }) {
  let built = null, t = 0, running = false, canSkip = false;
  const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 60);
  const veil = document.createElement('div'); veil.id = 'endingVeil';
  veil.style.cssText = 'position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:9;display:none';
  const title = document.createElement('div'); title.id = 'endingTitle'; title.textContent = 'PINNED';
  title.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:10;pointer-events:none;color:#e8dcc0;font:700 clamp(48px,11vw,140px) Georgia,"Times New Roman",serif;letter-spacing:.22em;opacity:0;text-shadow:0 0 18px rgba(255,220,170,.15)';
  const skipNote = document.createElement('div'); skipNote.style.cssText = 'position:fixed;right:16px;bottom:12px;z-index:10;color:#6a6458;font:13px Georgia,serif;display:none;pointer-events:none';
  skipNote.textContent = 'Esc';
  document.body.append(veil, title, skipNote);
  addEventListener('keydown', (e) => { if (!running || e.code !== 'Escape') return; e.preventDefault(); e.stopImmediatePropagation(); if (canSkip) finish(); }, true);
  function build() { if (built) return; built = { room: buildBedroom(quality), col: buildCollector(quality) }; }
  function finish() {
    running = false; veil.style.display = title.style.display = skipNote.style.display = 'none'; markSeen();
    if (built) { built.room.scene.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); built.col.scene.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); built = null; }
    onDone && onDone();
  }
  // black between scenes: 1 at the edges of each scene, 0 inside it
  const fadeFor = (a, b) => 1 - Math.min(smooth((t - a) / 1.2), smooth((b - t) / 1.2));
  function frame(dt) {
    if (!running) return;
    t += dt;
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
    let scene = null, black = 1;
    if (t < T.aOut + 0.5) {
      const R = built.room; if (R.cur !== 'a') { R.set('a'); R.cur = 'a'; }
      const k = smooth((t - T.aIn) / (T.aOut - T.aIn));
      cam.fov = 52 - 10 * k; cam.position.set(lerp(-0.2, 0.35, k), lerp(1.3, 1.45, k), lerp(1.1, -0.4, k)); cam.lookAt(lerp(0.6, 0.68, k), 1.48, -1.7);
      // the moth breathes its wings, and once, shivers
      const sh = t > 8.5 && t < 9.4 ? Math.sin((t - 8.5) * 40) * 0.25 : 0;
      R.moth.userData.setOpen(0.88 + Math.sin(t * 0.9) * 0.08 + sh);
      R.curtains.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.6 + i) * 0.03; });
      scene = R.scene; black = fadeFor(T.aIn, T.aOut);
    } else if (t < T.bOut + 0.5) {
      const R = built.room; if (R.cur !== 'b') { R.set('b'); R.cur = 'b'; }
      const k = smooth((t - T.bIn) / (T.bOut - T.bIn));
      cam.fov = 50; cam.position.set(lerp(1.3, 1.0, k), 1.55, lerp(1.45, 1.05, k)); cam.lookAt(lerp(-1.1, -1.25, k), lerp(1.2, 1.05, k), -1.15);
      R.curtains.forEach((c, i) => { c.rotation.y = Math.sin(t * 1.4 + i * 2) * 0.12; });
      scene = R.scene; black = fadeFor(T.bIn, T.bOut);
    } else if (t < T.cOut + 0.5) {
      const C = built.col, lt = t - T.cIn;
      // the hand comes in from the right with the pin, sets it, pushes it home, and goes
      const down = smooth((lt - 1.2) / 2.6), push = smooth((lt - 4.4) / 0.9), lift = smooth((lt - 6.2) / 2.0);
      const pinX = 0, pinZ = -0.02 + 0.006;
      const tipY = lerp(0.24, 0.07, down) - push * 0.032;
      const pin = C.hand.userData.pin, released = lt > 5.5;
      if (!released) { pin.position.set(pinX + (1 - down) * 0.35, tipY + 0.038, pinZ + (1 - down) * 0.1); }
      else { pin.position.set(pinX, 0.07 - 0.032 + 0.038, pinZ); }
      C.hand.position.set(pinX + (1 - down) * 0.35 + lift * 0.5 + 0.012, (released ? 0.075 - 0.032 + 0.038 : tipY + 0.038) + 0.012 + lift * 0.3, pinZ + 0.045 + (1 - down) * 0.1 + lift * 0.2);
      C.hand.rotation.set(0.5, -0.5, 0.15);
      if (push > 0.5 && !C.clicked) { C.clicked = true; sfx.click && sfx.click(); }
      // the lid comes down
      C.lid.rotation.x = lerp(-1.35, 0, smooth((lt - 8.4) / 2.2));
      const k = smooth(lt / (T.cOut - T.cIn));
      cam.fov = lerp(30, 40, k); cam.position.set(lerp(0.12, 0.05, k), lerp(0.48, 0.95, k), lerp(0.42, 0.75, k)); cam.lookAt(0, 0.02, lerp(-0.01, 0.02, k));
      scene = C.scene; black = fadeFor(T.cIn, T.cOut);
    } else {
      black = 1;
      const tk = Math.min(smooth((t - T.title) / 1.6), smooth((T.end - 0.8 - t) / 1.4));
      title.style.display = 'flex'; title.style.opacity = Math.max(0, tk);
      if (t >= T.end) return finish();
    }
    veil.style.opacity = black;
    if (scene) renderer.render(scene, cam);
    else { renderer.setClearColor(0x000000, 1); renderer.clear(); }
  }
  return {
    get running() { return running; },
    get time() { return t; },
    get canSkip() { return canSkip; },
    start() {
      build(); t = 0; running = true; canSkip = seen();
      veil.style.display = 'block'; veil.style.opacity = 1; title.style.display = 'none'; title.style.opacity = 0;
      skipNote.style.display = canSkip ? 'block' : 'none';
      // compile now, behind the black, so the first frame does not hitch
      try { renderer.compile(built.room.scene, cam); renderer.compile(built.col.scene, cam); } catch {}
    },
    frame,
    skip() { if (running) finish(); },
    seek(s) { t = s; },
  };
}
