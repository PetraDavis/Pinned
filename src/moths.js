// Procedural, species-accurate moth specimens drawn with Canvas 2D.
// Units: the body axis is x = 0, y grows downward (head at negative y).
// Wings are described for the moth's left side as seen from above (screen right)
// and mirrored for the other side.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Smooth closed curve through points (Catmull-Rom -> Bezier).
function smooth(g, pts) {
  const n = pts.length;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  g.closePath();
}

const blob = (g, x, y, rx, ry, rot, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
const eyespot = (g, x, y, r, rings) => { for (const [k, c] of rings) blob(g, x, y, r * k, r * k * 0.9, 0, c); };
function speckle(g, r, n, x0, y0, x1, y1, color, size) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { const s = size * (0.4 + r()); g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s, s * (0.5 + r())); }
}
function band(g, pts, width, color) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
}

// ---------------- species ----------------
export const SPECIES = {
  atropos: {
    latin: 'Acherontia atropos', common: "Death's-head hawkmoth", span: 105,
    fore: [[2, -6], [25, -16], [60, -24], [96, -27], [104, -22], [96, -10], [78, 2], [52, 12], [24, 14], [6, 6]],
    hind: [[3, 2], [26, 6], [48, 14], [56, 24], [48, 34], [26, 36], [8, 28], [2, 14]],
    foreAngle: -0.05, hindAngle: 0.05,
    paintFore(g, r) {
      const gr = g.createLinearGradient(0, -25, 0, 15); gr.addColorStop(0, '#3a2a20'); gr.addColorStop(0.6, '#4a3626'); gr.addColorStop(1, '#2a1c14');
      g.fillStyle = gr; g.fillRect(-5, -40, 120, 70);
      // mottled bark pattern: dark wavy cross-lines and pale ochre streaks
      for (let i = 0; i < 9; i++) blob(g, 15 + r() * 80, -20 + r() * 30, 4 + r() * 10, 2 + r() * 5, r() * 3, `rgba(${120 + r() * 60},${90 + r() * 40},${50 + r() * 20},0.45)`);
      for (const x of [22, 44, 70]) band(g, [[x, -22], [x + 4, -10], [x - 2, 2], [x + 3, 12]], 1.6, 'rgba(15,8,4,0.8)');
      band(g, [[10, 2], [40, -2], [75, -8], [98, -18]], 2.5, 'rgba(170,140,90,0.5)');
      blob(g, 48, -6, 3, 2, 0, '#e8dcb8'); // the pale stigma spot
      speckle(g, r, 500, 0, -28, 105, 15, 'rgba(10,5,3,0.35)', 1.2);
      speckle(g, r, 300, 0, -28, 105, 15, 'rgba(200,170,120,0.25)', 1);
    },
    paintHind(g, r) {
      g.fillStyle = '#e3b42a'; g.fillRect(-5, -5, 70, 50);
      band(g, [[4, 12], [24, 14], [42, 20], [54, 26]], 5, '#1c120a');
      band(g, [[6, 26], [24, 30], [40, 33], [50, 33]], 4, '#1c120a');
      band(g, [[0, 4], [3, 30]], 6, 'rgba(60,40,20,0.6)');
      speckle(g, r, 120, 0, 0, 60, 40, 'rgba(120,70,10,0.25)', 1);
    },
    body: { thorax: [9, 12], abdomen: [8, 36], fur: '#3a2a20', furHi: '#8a6a4a', head: 6,
      paint(g, r) {
        // the skull: pale yellow cranium with two dark orbits
        blob(g, 0, -12, 6.5, 6, 0, '#e8d49a');
        blob(g, -2.6, -12.5, 1.8, 2.2, 0.2, '#1a120a'); blob(g, 2.6, -12.5, 1.8, 2.2, -0.2, '#1a120a');
        blob(g, 0, -8.5, 1, 1.3, 0, '#3a2a18');
        // yellow abdomen with black rings and a blue-grey dorsal stripe
        for (let i = 0; i < 6; i++) { const y = 6 + i * 5.2; blob(g, 0, y, 7.6 - i * 0.6, 2.3, 0, '#d8a828'); blob(g, 0, y + 2.6, 7.4 - i * 0.6, 1.1, 0, '#1a1008'); }
        g.fillStyle = 'rgba(70,90,120,0.75)'; g.fillRect(-1.6, 5, 3.2, 30);
      } },
    antenna: { type: 'thick', len: 26, color: '#2a1c12' },
  },
  luna: {
    latin: 'Actias luna', common: 'Luna moth', span: 95,
    fore: [[2, -6], [24, -20], [58, -32], [80, -36], [86, -30], [72, -10], [52, 8], [28, 13], [6, 6]],
    hind: [[3, 4], [28, 8], [48, 20], [52, 38], [40, 56], [32, 82], [27, 112], [22, 116], [18, 108], [16, 80], [10, 48], [3, 24]],
    foreAngle: -0.08, hindAngle: 0.06,
    paintFore(g, r) {
      const gr = g.createRadialGradient(30, -8, 4, 40, -10, 70); gr.addColorStop(0, '#d6eab0'); gr.addColorStop(1, '#a8cf78');
      g.fillStyle = gr; g.fillRect(-5, -40, 100, 60);
      band(g, [[2, -7], [30, -21], [62, -33], [84, -35]], 4, '#7a3e58'); // maroon costa
      eyespot(g, 44, -12, 5.5, [[1, '#7a4a3a'], [0.8, '#d8b858'], [0.62, '#3a2a40'], [0.42, '#c8d8a8']]);
      band(g, [[44, -12], [8, -4]], 1, 'rgba(110,140,70,0.6)');
    },
    paintHind(g, r) {
      const gr = g.createLinearGradient(0, 0, 30, 110); gr.addColorStop(0, '#cfe6a2'); gr.addColorStop(0.5, '#acd27e'); gr.addColorStop(1, '#d8c88a');
      g.fillStyle = gr; g.fillRect(-5, -5, 70, 125);
      eyespot(g, 32, 30, 5.5, [[1, '#7a4a3a'], [0.8, '#d8b858'], [0.62, '#3a2a40'], [0.42, '#c8d8a8']]);
      band(g, [[22, 70], [27, 100], [24, 114]], 2, 'rgba(200,170,90,0.6)');
    },
    body: { thorax: [9, 11], abdomen: [7.5, 30], fur: '#f2efe4', furHi: '#ffffff', head: 5, paint() {} },
    antenna: { type: 'feather', len: 22, color: '#b89a50' },
  },
  rhipheus: {
    latin: 'Chrysiridia rhipheus', common: 'Madagascan sunset moth', span: 85,
    fore: [[2, -6], [26, -20], [62, -32], [78, -30], [72, -14], [56, 4], [30, 12], [6, 6]],
    hind: [[3, 4], [28, 8], [46, 18], [54, 30], [50, 40], [56, 52], [48, 50], [44, 62], [36, 54], [30, 64], [22, 50], [8, 36], [2, 18]],
    foreAngle: -0.1, hindAngle: 0.08,
    paintFore(g, r) {
      g.fillStyle = '#121214'; g.fillRect(-5, -40, 90, 60);
      for (const [o, c] of [[0, '#3fbf7f'], [10, '#2fa8a0'], [20, '#5ad08a'], [31, '#3fbf7f']]) band(g, [[8 + o, 6], [18 + o, -10], [28 + o, -24]], 3.2, c);
      band(g, [[56, -6], [64, -20], [70, -28]], 2.4, '#4ac8a0');
    },
    paintHind(g, r) {
      const gr = g.createLinearGradient(0, 0, 50, 55); gr.addColorStop(0, '#2fa86a'); gr.addColorStop(0.3, '#e8c040'); gr.addColorStop(0.55, '#e86a28'); gr.addColorStop(0.75, '#c02860'); gr.addColorStop(1, '#3a60c0');
      g.fillStyle = gr; g.fillRect(-5, -5, 65, 75);
      for (let i = 0; i < 5; i++) band(g, [[6 + i * 3, 10 + i * 9], [30, 14 + i * 9], [52, 18 + i * 8]], 1.4, 'rgba(10,10,10,0.8)');
      g.fillStyle = 'rgba(245,245,240,0.9)'; for (const [x, y] of [[52, 52], [44, 60], [34, 62], [26, 56]]) blob(g, x, y, 2.4, 1.6, 0, '#f2f2ea');
    },
    body: { thorax: [6.5, 10], abdomen: [5, 30], fur: '#16161a', furHi: '#3a6a5a', head: 4.5,
      paint(g) { for (let i = 0; i < 5; i++) blob(g, 0, 8 + i * 5.5, 4, 0.8, 0, '#e8a020'); } },
    antenna: { type: 'thin', len: 30, color: '#111' },
  },
  betularia: {
    latin: 'Biston betularia', common: 'Peppered moth', span: 55,
    fore: [[2, -5], [22, -14], [44, -20], [54, -18], [52, -8], [40, 4], [22, 9], [5, 5]],
    hind: [[3, 3], [22, 6], [36, 12], [40, 22], [32, 30], [16, 30], [5, 20], [2, 10]],
    foreAngle: -0.05, hindAngle: 0.08,
    paintFore(g, r) {
      g.fillStyle = '#e8e4da'; g.fillRect(-5, -30, 65, 45);
      speckle(g, r, 700, 0, -22, 56, 10, 'rgba(25,22,20,0.75)', 1.1);
      band(g, [[12, 6], [18, -4], [14, -14]], 1.2, 'rgba(30,26,22,0.8)');
      band(g, [[34, 4], [38, -6], [34, -18]], 1.2, 'rgba(30,26,22,0.8)');
    },
    paintHind(g, r) { g.fillStyle = '#ece8de'; g.fillRect(-5, -5, 50, 40); speckle(g, r, 350, 0, 0, 42, 32, 'rgba(25,22,20,0.65)', 1); },
    body: { thorax: [6, 8], abdomen: [4.6, 22], fur: '#ddd8cc', furHi: '#fff', head: 4,
      paint(g, r) { speckle(g, r, 80, -5, -14, 5, 24, 'rgba(30,26,22,0.7)', 0.8); } },
    antenna: { type: 'feather', len: 14, color: '#8a8070' },
  },
  mori: {
    latin: 'Bombyx mori', common: 'Silkworm moth', span: 45,
    fore: [[2, -5], [18, -12], [36, -16], [44, -14], [40, -10], [42, -4], [32, 4], [16, 8], [4, 5]],
    hind: [[3, 3], [18, 5], [30, 10], [33, 18], [26, 24], [12, 24], [4, 16], [2, 8]],
    foreAngle: -0.02, hindAngle: 0.05,
    paintFore(g, r) {
      g.fillStyle = '#efe8d6'; g.fillRect(-5, -25, 55, 40);
      band(g, [[10, 6], [14, -4], [12, -12]], 1, 'rgba(150,130,100,0.5)');
      band(g, [[26, 4], [29, -4], [27, -14]], 1, 'rgba(150,130,100,0.5)');
      blob(g, 40, -12, 3, 2, 0.4, 'rgba(140,120,90,0.5)');
    },
    paintHind(g) { g.fillStyle = '#ece4d0'; g.fillRect(-5, -5, 45, 35); band(g, [[8, 14], [22, 16], [30, 20]], 1, 'rgba(150,130,100,0.4)'); },
    body: { thorax: [7, 8], abdomen: [6.5, 20], fur: '#efe8d8', furHi: '#fff', head: 4, paint() {} },
    antenna: { type: 'feather', len: 12, color: '#3a3026' },
  },
  infusa: {
    latin: 'Agrotis infusa', common: 'Bogong moth', span: 50,
    fore: [[2, -5], [22, -11], [42, -15], [50, -12], [48, -4], [36, 4], [18, 7], [4, 4]],
    hind: [[3, 3], [20, 5], [34, 10], [38, 18], [30, 26], [14, 26], [4, 18], [2, 9]],
    foreAngle: 0.15, hindAngle: 0.25,
    paintFore(g, r) {
      const gr = g.createLinearGradient(0, -15, 0, 8); gr.addColorStop(0, '#5a4636'); gr.addColorStop(1, '#3a2c22');
      g.fillStyle = gr; g.fillRect(-5, -25, 60, 40);
      band(g, [[4, 0], [38, -6]], 2.6, '#1a120c'); // basal dash
      blob(g, 20, -6, 3, 2.2, 0, '#8a7458'); blob(g, 32, -6, 3.5, 2.2, 0.4, '#9a8466'); // orbicular & reniform
      blob(g, 32, -6, 1.6, 1, 0.4, '#2a1c14');
      speckle(g, r, 200, 0, -14, 50, 6, 'rgba(20,12,8,0.4)', 0.9);
    },
    paintHind(g) { g.fillStyle = '#8a7c6c'; g.fillRect(-5, -5, 45, 35); },
    body: { thorax: [6, 8], abdomen: [5, 22], fur: '#4a3a2c', furHi: '#7a6650', head: 4, paint() {} },
    antenna: { type: 'thin', len: 20, color: '#3a2c20' },
  },
  calyptra: {
    latin: 'Calyptra thalictri', common: 'Vampire moth', span: 45,
    fore: [[2, -5], [20, -12], [38, -16], [46, -18], [44, -12], [40, -6], [34, 2], [18, 6], [4, 4]],
    hind: [[3, 3], [18, 5], [30, 10], [33, 18], [26, 23], [12, 23], [4, 15], [2, 8]],
    foreAngle: 0.1, hindAngle: 0.2,
    paintFore(g, r) {
      const gr = g.createLinearGradient(0, -10, 40, 0); gr.addColorStop(0, '#8a6440'); gr.addColorStop(1, '#a87c4e');
      g.fillStyle = gr; g.fillRect(-5, -25, 55, 35);
      band(g, [[6, 4], [44, -16]], 1.6, '#4a3020'); // the dead-leaf midrib
      band(g, [[22, -2], [26, -10], [24, -12]], 1, 'rgba(60,40,24,0.7)');
      speckle(g, r, 120, 0, -14, 46, 6, 'rgba(60,40,24,0.35)', 0.8);
    },
    paintHind(g) { g.fillStyle = '#9a8a76'; g.fillRect(-5, -5, 45, 35); },
    body: { thorax: [5.5, 8], abdomen: [4.5, 20], fur: '#8a6a48', furHi: '#b08a60', head: 4, paint() {} },
    antenna: { type: 'thin', len: 18, color: '#5a4030' },
  },
  atlas: {
    latin: 'Attacus atlas', common: 'Atlas moth', span: 120,
    fore: [[2, -6], [30, -22], [70, -36], [98, -42], [110, -34], [104, -22], [92, -20], [80, -2], [50, 14], [22, 16], [6, 6]],
    hind: [[3, 4], [30, 8], [62, 18], [74, 36], [64, 56], [40, 64], [18, 56], [6, 36], [2, 18]],
    foreAngle: -0.05, hindAngle: 0.05,
    paintFore(g, r) {
      const gr = g.createLinearGradient(0, 0, 100, 0); gr.addColorStop(0, '#7a2a18'); gr.addColorStop(0.7, '#a0482a'); gr.addColorStop(1, '#c87a50');
      g.fillStyle = gr; g.fillRect(-5, -50, 120, 75);
      band(g, [[14, 12], [34, -4], [52, -22]], 2.5, '#f0e0c8'); band(g, [[15, 13], [35, -3], [53, -21]], 1.2, '#3a1408');
      g.fillStyle = 'rgba(240,235,220,0.85)'; g.beginPath(); g.moveTo(42, -4); g.lineTo(54, -14); g.lineTo(52, 2); g.closePath(); g.fill(); // window
      // the snake-head wingtip
      blob(g, 100, -30, 10, 7, -0.3, '#e8b878'); blob(g, 100, -32, 3, 2, 0, '#1a0a04'); blob(g, 94, -24, 8, 3, -0.3, '#c86a5a');
      band(g, [[8, 8], [80, -4], [104, -22]], 1.5, 'rgba(240,200,170,0.4)');
    },
    paintHind(g) {
      const gr = g.createLinearGradient(0, 0, 70, 60); gr.addColorStop(0, '#7a2a18'); gr.addColorStop(1, '#a8502e');
      g.fillStyle = gr; g.fillRect(-5, -5, 85, 75);
      g.fillStyle = 'rgba(240,235,220,0.85)'; g.beginPath(); g.moveTo(30, 22); g.lineTo(42, 28); g.lineTo(32, 36); g.closePath(); g.fill();
      band(g, [[10, 48], [40, 58], [66, 46]], 3, '#e8c890'); band(g, [[10, 51], [40, 61], [66, 49]], 1.2, '#2a1008');
    },
    body: { thorax: [9, 12], abdomen: [8, 30], fur: '#a0482a', furHi: '#e0b080', head: 5, paint(g) { for (let i = 0; i < 5; i++) blob(g, 0, 8 + i * 5, 7 - i * 0.6, 0.8, 0, '#f0e0c8'); } },
    antenna: { type: 'feather', len: 18, color: '#7a4a28' },
  },
};

// Draws one wing pair (left side, mirrored by the caller) in unit space.
function drawWingPair(g, sp, r, lift = 0) {
  const vein = (pts) => { g.save(); smooth(g, pts); g.clip(); };
  // hindwing first (under the forewing)
  for (const which of ['hind', 'fore']) {
    const pts = sp[which], ang = (which === 'fore' ? sp.foreAngle : sp.hindAngle) - lift * (which === 'fore' ? 1 : 0.6);
    g.save(); g.rotate(ang);
    // drop shadow
    g.save(); g.translate(2.5, 3.5); smooth(g, pts); g.fillStyle = 'rgba(30,20,10,0.22)'; g.filter = 'blur(3px)'; g.fill(); g.restore();
    vein(pts);
    (which === 'fore' ? sp.paintFore : sp.paintHind)(g, r);
    // wing veins radiating from the base
    g.strokeStyle = 'rgba(30,20,10,0.22)'; g.lineWidth = 0.35;
    const far = pts.reduce((a, p) => (p[0] * p[0] + p[1] * p[1] > a[0] * a[0] + a[1] * a[1] ? p : a));
    for (let i = 0; i < 7; i++) {
      const t = i / 6, tx = far[0] * (0.6 + 0.4 * t), ty = far[1] + (pts[Math.floor(pts.length / 2)][1] - far[1]) * t;
      g.beginPath(); g.moveTo(1, 0); g.quadraticCurveTo(tx * 0.4, ty * 0.2, tx, ty); g.stroke();
    }
    // scale texture: fine strokes + soft edge darkening
    g.globalAlpha = 0.12; speckle(g, r, 900, -5, -45, 115, 120, '#000', 0.5); speckle(g, r, 600, -5, -45, 115, 120, '#fff', 0.5); g.globalAlpha = 1;
    g.restore();
    // fringe
    smooth(g, pts); g.strokeStyle = 'rgba(40,28,18,0.45)'; g.lineWidth = 0.6; g.stroke();
    g.restore();
  }
}

function drawFurEllipse(g, r, cx, cy, rx, ry, base, hi) {
  blob(g, cx, cy, rx, ry, 0, base);
  g.lineCap = 'round';
  for (let i = 0; i < rx * ry * 3; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
    g.strokeStyle = r() < 0.5 ? hi : 'rgba(0,0,0,0.25)'; g.globalAlpha = 0.25 + r() * 0.3; g.lineWidth = 0.35;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x - cx) * 0.12 + (r() - 0.5), y + (y - cy) * 0.12 + 0.8); g.stroke();
  }
  g.globalAlpha = 1;
  // soft shading
  const gr = g.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, Math.max(rx, ry));
  gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill();
}

function drawAntenna(g, a, side) {
  g.save(); g.scale(side, 1);
  const tip = [a.len * 0.55, -a.len - 6];
  g.strokeStyle = a.color; g.lineCap = 'round';
  g.lineWidth = a.type === 'thick' ? 1.6 : a.type === 'feather' ? 0.9 : 0.6;
  g.beginPath(); g.moveTo(1.5, -18); g.quadraticCurveTo(2, -18 - a.len * 0.7, tip[0], tip[1]); g.stroke();
  if (a.type === 'feather') {
    g.lineWidth = 0.35;
    for (let t = 0.05; t < 0.95; t += 0.045) {
      const x = (1 - t) * (1 - t) * 1.5 + 2 * (1 - t) * t * 2 + t * t * tip[0];
      const y = (1 - t) * (1 - t) * -18 + 2 * (1 - t) * t * (-18 - a.len * 0.7) + t * t * tip[1];
      const L = 3.5 * Math.sin(t * Math.PI) + 0.8;
      g.beginPath(); g.moveTo(x - L * 0.8, y - L * 0.2); g.lineTo(x, y); g.lineTo(x + L * 0.6, y + L * 0.6); g.stroke();
    }
  }
  if (a.type === 'thin') { blob(g, tip[0], tip[1], 0.8, 1.4, 0.5, a.color); }
  g.restore();
}

// Draws the body (thorax, abdomen, head, antennae) and the pin head.
function drawBody(g, sp, r, pin = true) {
  const b = sp.body;
  for (const s of [-1, 1]) drawAntenna(g, sp.antenna, s);
  // abdomen
  drawFurEllipse(g, r, 0, 4 + b.abdomen[1] / 2, b.abdomen[0], b.abdomen[1] / 2, b.fur, b.furHi);
  // thorax
  drawFurEllipse(g, r, 0, -8, b.thorax[0], b.thorax[1] / 2 + 2, b.fur, b.furHi);
  // head and eyes
  drawFurEllipse(g, r, 0, -17, b.head, b.head * 0.8, b.fur, b.furHi);
  for (const s of [-1, 1]) blob(g, s * b.head * 0.75, -17.5, b.head * 0.38, b.head * 0.45, 0, '#141010');
  b.paint(g, r);
  if (pin) {
    // shadow of the pin head, then the head itself with a specular highlight
    blob(g, 2.4, -6, 2.4, 1.6, 0.3, 'rgba(20,12,6,0.35)');
    const pg = g.createRadialGradient(-0.7, -9.8, 0.2, 0, -9, 2.4);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.35, '#b8b8b4'); pg.addColorStop(1, '#2a2a28');
    g.fillStyle = pg; g.beginPath(); g.arc(0, -9, 2.2, 0, 7); g.fill();
  }
}

// Draw a complete specimen centred at (cx, cy); `size` is the wingspan in pixels.
// `lift` raises the wings slightly (used for the twitch on the home screen).
export function drawMoth(g, key, cx, cy, size, { seed = 7, lift = 0, pin = true } = {}) {
  const sp = SPECIES[key];
  const k = size / (sp.span * 2);
  g.save(); g.translate(cx, cy); g.scale(k, k);
  for (const side of [1, -1]) { const r = rng(seed); g.save(); g.scale(side, 1); drawWingPair(g, sp, r, lift); g.restore(); }
  drawBody(g, sp, rng(seed + 1), pin);
  g.restore();
}

// Parts for animation: wing layer (one side) and body layer, pre-rendered once.
export function renderMothLayers(key, size, seed = 7) {
  const sp = SPECIES[key], k = size / (sp.span * 2);
  const W = Math.ceil(size * 0.6), H = Math.ceil(size * 0.75);
  const wing = document.createElement('canvas'); wing.width = W; wing.height = H;
  const wg = wing.getContext('2d'); wg.translate(4, H * 0.32); wg.scale(k, k); drawWingPair(wg, sp, rng(seed));
  const body = document.createElement('canvas'); body.width = Math.ceil(size * 0.25); body.height = H;
  const bg = body.getContext('2d'); bg.translate(body.width / 2, H * 0.32); bg.scale(k, k); drawBody(bg, sp, rng(seed + 1));
  return { wing, body, originY: H * 0.32, ox: 4 };
}

// A small handwritten specimen label: three lines (Latin name, common name, collection),
// each shrunk to fit inside the card with margins.
export function drawLabel(g, key, x, y, w, extra = 'Coll. Ord. P.W. 1887') {
  const sp = SPECIES[key], h = w * 0.46, pad = w * 0.07;
  g.save();
  g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(x - w / 2 + 2, y + 2, w, h);
  g.fillStyle = '#efe6cf'; g.fillRect(x - w / 2, y, w, h);
  g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = Math.max(1, w / 220); g.strokeRect(x - w / 2 + w * 0.03, y + h * 0.06, w * 0.94, h * 0.88);
  g.fillStyle = '#2a1c10'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const line = (text, font, size, ly) => {
    let px = size;
    g.font = font(px);
    const max = w - 2 * pad, m = g.measureText(text).width;
    if (m > max) { px = px * max / m; g.font = font(px); }
    g.fillText(text, x, ly);
  };
  line(sp.latin, px => `italic ${px}px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive`, h * 0.26, y + h * 0.3);
  line(sp.common, px => `${px}px "Segoe Script", "Lucida Handwriting", Georgia, cursive`, h * 0.17, y + h * 0.58);
  line(extra, px => `${px}px Georgia, serif`, h * 0.13, y + h * 0.8);
  g.restore();
}
