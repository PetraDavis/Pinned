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
      // sooty brown-black ground, bluish-grey frosting toward the outer half
      const gr = g.createLinearGradient(0, -25, 0, 15); gr.addColorStop(0, '#2c2119'); gr.addColorStop(0.55, '#3a2b20'); gr.addColorStop(1, '#22180f');
      g.fillStyle = gr; g.fillRect(-5, -40, 120, 70);
      g.filter = 'blur(2.2px)';
      for (let i = 0; i < 7; i++) blob(g, 55 + r() * 45, -22 + r() * 22, 5 + r() * 9, 2 + r() * 4, r() * 3, `rgba(${110 + r() * 30},${112 + r() * 30},${120 + r() * 30},0.22)`);
      // mottled bark pattern: ochre and rust patches between wavy dark cross-lines
      for (let i = 0; i < 12; i++) blob(g, 12 + r() * 85, -20 + r() * 30, 3 + r() * 9, 1.5 + r() * 4, r() * 3, `rgba(${130 + r() * 60},${90 + r() * 35},${45 + r() * 20},${0.25 + r() * 0.25})`);
      g.filter = 'none';
      for (const x of [20, 43, 69]) band(g, [[x, -23], [x + 4 + r() * 2, -11], [x - 2, 1], [x + 3, 12]], 1.2 + r() * 0.8, 'rgba(12,7,3,0.75)');
      band(g, [[10, 2], [40, -2], [75, -8], [98, -18]], 2.2, 'rgba(170,140,90,0.4)');
      blob(g, 48, -6, 2.6, 1.8, 0.3, '#e2d4ae'); // the pale stigma spot
      // fine scale texture: rows of tiny overlapping strokes
      g.lineWidth = 0.25;
      for (let i = 0; i < 2200; i++) { const x = r() * 105, y = -28 + r() * 43; g.strokeStyle = r() < 0.55 ? 'rgba(8,4,2,0.28)' : 'rgba(205,180,140,0.18)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.9, y + 0.25); g.stroke(); }
    },
    paintHind(g, r) {
      const gr = g.createLinearGradient(0, 0, 55, 30); gr.addColorStop(0, '#c8901e'); gr.addColorStop(0.5, '#deb032'); gr.addColorStop(1, '#d2a42a');
      g.fillStyle = gr; g.fillRect(-5, -5, 70, 50);
      band(g, [[4, 12], [24, 14], [42, 20], [54, 26]], 4.4, '#1c120a');
      band(g, [[6, 26], [24, 30], [40, 33], [50, 33]], 3.6, '#1c120a');
      band(g, [[0, 4], [3, 30]], 6, 'rgba(60,40,20,0.55)');
      g.lineWidth = 0.25;
      for (let i = 0; i < 900; i++) { const x = r() * 58, y = r() * 38; g.strokeStyle = r() < 0.5 ? 'rgba(110,60,10,0.25)' : 'rgba(255,230,150,0.2)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 0.8, y + 0.3); g.stroke(); }
    },
    body: { thorax: [11, 15], abdomen: [8, 36], fur: '#2e2118', furHi: '#6e5640', head: 6,
      paint(g, r) {
        // the skull: a pale, furry, yellow-ochre pattern on the dark thorax, cranium
        // above, narrowing to the cheekbones, with two dark sockets and a small nasal mark
        g.save(); g.translate(0, 4.5);
        g.save();
        g.beginPath(); g.moveTo(0, -18.2);
        g.bezierCurveTo(5.8, -18.2, 7.4, -14, 6.4, -11); g.bezierCurveTo(5.8, -9, 4, -8.2, 3.2, -6.6);
        g.lineTo(-3.2, -6.6); g.bezierCurveTo(-4, -8.2, -5.8, -9, -6.4, -11); g.bezierCurveTo(-7.4, -14, -5.8, -18.2, 0, -18.2);
        g.clip();
        const sk = g.createRadialGradient(-1, -14, 0.5, 0, -12, 8); sk.addColorStop(0, '#eadba8'); sk.addColorStop(0.7, '#cdb47a'); sk.addColorStop(1, '#8a7348');
        g.fillStyle = sk; g.fillRect(-8, -19, 16, 13);
        g.lineCap = 'round'; g.lineWidth = 0.3;
        for (let i = 0; i < 700; i++) { const x = (r() - 0.5) * 14, y = -18.5 + r() * 12; g.strokeStyle = r() < 0.5 ? 'rgba(255,245,210,0.35)' : 'rgba(60,40,20,0.3)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + x * 0.06 + (r() - 0.5) * 0.4, y + 0.9); g.stroke(); }
        g.restore();
        g.filter = 'blur(0.35px)';
        blob(g, -2.5, -12.4, 1.65, 2.0, 0.25, 'rgba(22,14,8,0.92)'); blob(g, 2.6, -12.3, 1.6, 2.05, -0.22, 'rgba(22,14,8,0.92)');
        blob(g, 0.1, -9.4, 0.7, 0.9, 0, 'rgba(40,28,14,0.8)');
        g.filter = 'none';
        g.restore();
        // blue-black tegulae (shoulder tufts) either side
        for (const sx of [-1, 1]) blob(g, sx * 7.2, -9, 2.4, 5.2, sx * 0.25, 'rgba(30,32,40,0.75)');
        // yellow abdomen with black rings and a blue-grey dorsal stripe
        for (let i = 0; i < 6; i++) { const y = 6 + i * 5.2; blob(g, 0, y, 7.6 - i * 0.6, 2.3, 0, '#cf9f26'); blob(g, 0, y + 2.6, 7.4 - i * 0.6, 1.1, 0, '#1a1008'); }
        const st = g.createLinearGradient(-1.8, 0, 1.8, 0); st.addColorStop(0, 'rgba(60,72,95,0)'); st.addColorStop(0.5, 'rgba(70,85,110,0.85)'); st.addColorStop(1, 'rgba(60,72,95,0)');
        g.fillStyle = st; g.fillRect(-1.8, 5, 3.6, 30);
        g.lineWidth = 0.3;
        for (let i = 0; i < 500; i++) { const x = (r() - 0.5) * 14, y = 4 + r() * 34; g.strokeStyle = r() < 0.5 ? 'rgba(255,230,160,0.2)' : 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + x * 0.08, y + 0.9); g.stroke(); }
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
  bisselliella: {
    latin: 'Tineola bisselliella', common: 'Common clothes moth', span: 16,
    fore: [[2, -3], [14, -6], [28, -7], [36, -6], [38, -4], [34, -1], [20, 2], [6, 3]],
    hind: [[2, 2], [14, 3], [26, 3], [30, 4], [24, 6], [12, 6], [3, 5]],
    foreAngle: -0.02, hindAngle: 0.04,
    paintFore(g, r) {
      const gr = g.createLinearGradient(0, -8, 38, 2); gr.addColorStop(0, '#b8964e'); gr.addColorStop(1, '#d8bc78');
      g.fillStyle = gr; g.fillRect(-5, -12, 50, 20);
      speckle(g, r, 160, 0, -8, 38, 3, 'rgba(255,240,190,0.35)', 0.5);
      // long fringe of hair-scales along the trailing edge
      g.strokeStyle = 'rgba(200,170,110,0.7)'; g.lineWidth = 0.25;
      for (let x = 6; x < 36; x += 0.6) { g.beginPath(); g.moveTo(x, 2 - x * 0.08); g.lineTo(x + 0.6, 6 - x * 0.05); g.stroke(); }
    },
    paintHind(g) { g.fillStyle = '#c8b48a'; g.fillRect(-5, -5, 40, 15); g.strokeStyle = 'rgba(210,190,140,0.7)'; g.lineWidth = 0.25; for (let x = 3; x < 30; x += 0.5) { g.beginPath(); g.moveTo(x, 5.5); g.lineTo(x + 0.3, 10); g.stroke(); } },
    body: { thorax: [3.2, 5], abdomen: [2.6, 12], fur: '#c8a868', furHi: '#f0d8a0', head: 2.6, paint(g) { blob(g, 0, -17, 3, 2.4, 0, '#e8b860'); } },
    antenna: { type: 'thin', len: 14, color: '#a08050' },
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
  // ---- species used in the first-room puzzle and its display case ----
  rubicunda: {
    latin: 'Dryocampa rubicunda', common: 'Rosy maple moth', span: 46,
    fore: [[2, -5], [20, -12], [40, -16], [47, -12], [43, -2], [30, 6], [14, 8], [4, 4]],
    hind: [[3, 3], [18, 5], [31, 10], [34, 18], [27, 25], [12, 25], [4, 16], [2, 8]],
    foreAngle: -0.02, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#e57fa4'; g.fillRect(-5, -25, 60, 40);
      g.fillStyle = '#f3dc6a'; g.beginPath(); g.moveTo(6, -8); g.lineTo(40, -15); g.lineTo(44, -4); g.lineTo(10, 6); g.closePath(); g.fill(); // the yellow band
      speckle(g, r, 160, 0, -16, 46, 8, 'rgba(255,240,200,0.3)', 0.8);
    },
    paintHind(g, r) { g.fillStyle = '#f2df8a'; g.fillRect(-5, -5, 45, 35); band(g, [[10, 22], [24, 23], [32, 18]], 3, 'rgba(230,130,160,0.7)'); },
    body: { thorax: [7.5, 9], abdomen: [6.5, 20], fur: '#f0d25a', furHi: '#fff4b0', head: 4.5, paint(g) { blob(g, 0, 14, 5, 6, 0, 'rgba(232,130,164,0.6)'); } },
    antenna: { type: 'feather', len: 13, color: '#c86a8a' },
  },
  caja: {
    latin: 'Arctia caja', common: 'Garden tiger moth', span: 64,
    fore: [[2, -5], [24, -14], [50, -20], [62, -16], [58, -4], [44, 6], [22, 10], [4, 5]],
    hind: [[3, 3], [22, 6], [40, 12], [46, 24], [36, 34], [18, 34], [6, 24], [2, 10]],
    foreAngle: -0.04, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#4a2c1c'; g.fillRect(-5, -30, 70, 45);
      // the cream network
      for (const pts of [[[4, -3], [18, -12], [30, -17]], [[14, 6], [24, -4], [30, -16]], [[26, 8], [38, -6], [48, -18]], [[40, 4], [48, -4], [58, -12]], [[8, 2], [30, 2], [56, -6]]]) band(g, pts, 3.2, '#efe4c8');
    },
    paintHind(g, r) {
      g.fillStyle = '#e2502a'; g.fillRect(-5, -5, 55, 45);
      for (const [x, y, rr] of [[16, 10, 4], [32, 16, 5], [24, 26, 4.5], [38, 28, 3.5]]) { blob(g, x, y, rr, rr, 0, '#12121c'); blob(g, x, y, rr * 0.45, rr * 0.45, 0, '#3a5aa8'); }
    },
    body: { thorax: [7, 9], abdomen: [6, 24], fur: '#5a3220', furHi: '#a06040', head: 4.5,
      paint(g) { for (let i = 0; i < 5; i++) { blob(g, 0, 8 + i * 4.6, 5.6 - i * 0.5, 1.8, 0, '#e2502a'); blob(g, 0, 10 + i * 4.6, 2, 1, 0, '#111'); } blob(g, 0, -12, 6, 1.6, 0, '#d03020'); } },
    antenna: { type: 'thin', len: 18, color: '#2a1a10' },
  },
  polyphemus: {
    latin: 'Antheraea polyphemus', common: 'Polyphemus moth', span: 105,
    fore: [[2, -6], [30, -20], [70, -30], [96, -30], [102, -22], [92, -6], [70, 8], [36, 16], [6, 6]],
    hind: [[3, 4], [30, 8], [62, 18], [76, 36], [66, 58], [42, 66], [18, 58], [6, 36], [2, 18]],
    foreAngle: -0.05, hindAngle: 0.05,
    paintFore(g, r) {
      g.fillStyle = '#b48c5c'; g.fillRect(-5, -40, 110, 60);
      band(g, [[70, 6], [86, -8], [94, -26]], 3, 'rgba(200,140,150,0.8)');
      eyespot(g, 46, -8, 4, [[1, '#e8c860'], [0.6, '#f0ead8']]);
      band(g, [[4, 4], [20, -16]], 2, 'rgba(240,230,210,0.6)');
    },
    paintHind(g, r) {
      g.fillStyle = '#b08858'; g.fillRect(-5, -5, 85, 75);
      eyespot(g, 40, 32, 13, [[1.3, '#1c1820'], [1, '#e2b840'], [0.8, '#3a5a9a'], [0.55, '#14121a'], [0.35, '#f2ecd8']]);
      band(g, [[12, 56], [42, 64], [70, 50]], 2.5, 'rgba(200,140,150,0.7)');
    },
    body: { thorax: [9, 11], abdomen: [8, 30], fur: '#a8845a', furHi: '#e0c090', head: 5, paint() {} },
    antenna: { type: 'feather', len: 18, color: '#7a5a30' },
  },
  io: {
    latin: 'Automeris io', common: 'Io moth', span: 68,
    fore: [[2, -5], [26, -15], [54, -22], [68, -18], [62, -4], [44, 6], [22, 10], [4, 5]],
    hind: [[3, 3], [26, 6], [46, 14], [54, 28], [44, 40], [22, 40], [6, 26], [2, 10]],
    foreAngle: -0.03, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#e6c03a'; g.fillRect(-5, -30, 75, 45);
      band(g, [[10, 6], [28, -6], [40, -20]], 1.2, 'rgba(140,90,30,0.7)'); band(g, [[30, 8], [50, -4], [60, -16]], 1.2, 'rgba(140,90,30,0.7)');
      blob(g, 32, -6, 2.6, 2, 0, '#8a5a20');
    },
    paintHind(g, r) {
      g.fillStyle = '#e8c23c'; g.fillRect(-5, -5, 65, 50);
      band(g, [[4, 6], [10, 28], [24, 38]], 4, '#d2384a');
      eyespot(g, 30, 22, 10, [[1.15, '#1a1a22'], [0.95, '#3a4a8a'], [0.6, '#141418'], [0.28, '#f2f2ea']]);
    },
    body: { thorax: [7, 9], abdomen: [6, 24], fur: '#e0b434', furHi: '#fff0a0', head: 4.5, paint() {} },
    antenna: { type: 'feather', len: 14, color: '#a07830' },
  },
  cecropia: {
    latin: 'Hyalophora cecropia', common: 'Cecropia moth', span: 125,
    fore: [[2, -6], [34, -22], [78, -34], [104, -36], [112, -26], [100, -12], [76, 6], [40, 16], [6, 6]],
    hind: [[3, 4], [34, 8], [66, 20], [82, 38], [72, 60], [46, 70], [20, 60], [6, 38], [2, 18]],
    foreAngle: -0.05, hindAngle: 0.05,
    paintFore(g, r) {
      g.fillStyle = '#6a524a'; g.fillRect(-5, -45, 125, 70);
      band(g, [[8, 10], [6, -6]], 4, '#c0443a');
      band(g, [[60, 10], [66, -10], [70, -30]], 3.5, '#efe0d0'); band(g, [[63, 10], [69, -10], [73, -30]], 2.2, '#b84a3a');
      blob(g, 44, -8, 5, 3, 0.4, '#f2e8d8'); blob(g, 44, -8, 4.2, 1.6, 0.4, '#c0443a');
      blob(g, 100, -24, 5, 4, 0, '#1a1416'); blob(g, 101, -25, 1.8, 1.6, 0, '#7aa0c8');
    },
    paintHind(g, r) {
      g.fillStyle = '#6a524a'; g.fillRect(-5, -5, 95, 80);
      blob(g, 40, 32, 7, 4, 0.5, '#f2e8d8'); blob(g, 40, 32, 6, 2.4, 0.5, '#c0443a');
      band(g, [[16, 54], [46, 62], [76, 40]], 3.2, '#efe0d0'); band(g, [[16, 50], [46, 58], [74, 37]], 2, '#b84a3a');
    },
    body: { thorax: [9, 12], abdomen: [8, 32], fur: '#b8443a', furHi: '#e08070', head: 5,
      paint(g) { for (let i = 0; i < 6; i++) blob(g, 0, 8 + i * 5, 7.4 - i * 0.6, 1.1, 0, '#f0e8e0'); blob(g, 0, -14, 7, 1.4, 0, '#f0e8e0'); } },
    antenna: { type: 'feather', len: 18, color: '#4a3020' },
  },
  pavonia: {
    latin: 'Saturnia pavonia', common: 'Emperor moth', span: 58,
    fore: [[2, -5], [24, -14], [48, -22], [58, -20], [56, -8], [42, 4], [22, 9], [4, 5]],
    hind: [[3, 3], [22, 6], [38, 12], [44, 24], [36, 34], [18, 34], [6, 24], [2, 10]],
    foreAngle: -0.04, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#9a8a80'; g.fillRect(-5, -30, 65, 45);
      blob(g, 54, -16, 7, 5, 0, '#b0607a');
      band(g, [[8, 6], [12, -10]], 2, '#f0e8e0'); band(g, [[40, 4], [46, -18]], 2, '#f0e8e0');
      eyespot(g, 28, -6, 6, [[1, '#1a1418'], [0.8, '#e0c870'], [0.6, '#b04848'], [0.4, '#141016'], [0.16, '#eae2d0']]);
    },
    paintHind(g) {
      g.fillStyle = '#de8a42'; g.fillRect(-5, -5, 55, 45);
      eyespot(g, 24, 18, 6, [[1, '#1a1418'], [0.8, '#e0c870'], [0.6, '#3a4a7a'], [0.4, '#141016'], [0.16, '#eae2d0']]);
      band(g, [[8, 30], [24, 33], [40, 26]], 2, 'rgba(250,230,200,0.8)');
    },
    body: { thorax: [6.5, 8], abdomen: [5.5, 20], fur: '#8a7a70', furHi: '#c8b8a8', head: 4, paint() {} },
    antenna: { type: 'feather', len: 13, color: '#5a4030' },
  },
  nerii: {
    latin: 'Daphnis nerii', common: 'Oleander hawkmoth', span: 95,
    fore: [[2, -6], [26, -15], [62, -22], [94, -24], [98, -18], [88, -8], [68, 2], [42, 10], [18, 12], [5, 6]],
    hind: [[3, 2], [24, 5], [44, 12], [50, 22], [40, 30], [20, 30], [6, 22], [2, 10]],
    foreAngle: -0.04, hindAngle: 0.05,
    paintFore(g, r) {
      g.fillStyle = '#5e8048'; g.fillRect(-5, -32, 105, 48);
      g.fillStyle = '#a8c890'; g.beginPath(); g.moveTo(28, 10); g.lineTo(46, -20); g.lineTo(56, -20); g.lineTo(40, 10); g.fill();
      g.fillStyle = '#c89aa8'; g.beginPath(); g.moveTo(60, 2); g.lineTo(80, -22); g.lineTo(88, -20); g.lineTo(70, 2); g.fill();
      band(g, [[4, -2], [20, -10]], 3, '#2e4a24'); blob(g, 18, -2, 4, 3, 0, '#e8f0dc');
      band(g, [[70, -2], [92, -14]], 2, '#2e4a24');
    },
    paintHind(g) { g.fillStyle = '#4a5a3a'; g.fillRect(-5, -5, 60, 40); band(g, [[10, 24], [30, 26], [46, 20]], 3, '#b8c8a0'); },
    body: { thorax: [7, 10], abdomen: [6.5, 30], fur: '#5e8048', furHi: '#9ac080', head: 4.5, paint(g) { blob(g, 0, 7, 6, 1.2, 0, '#e8f0dc'); blob(g, 0, -12, 6.5, 1.2, 0, '#a8c890'); } },
    antenna: { type: 'thick', len: 20, color: '#d8e0d0' },
  },
  lubricipeda: {
    latin: 'Spilosoma lubricipeda', common: 'White ermine', span: 40,
    fore: [[2, -5], [20, -12], [36, -16], [42, -12], [38, -2], [26, 6], [12, 8], [4, 4]],
    hind: [[3, 3], [16, 5], [28, 10], [31, 18], [24, 24], [10, 24], [4, 16], [2, 8]],
    foreAngle: -0.03, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#f4f1ea'; g.fillRect(-5, -25, 55, 40);
      for (let i = 0; i < 16; i++) blob(g, 8 + r() * 30, -12 + r() * 16, 0.9 + r() * 0.7, 0.9 + r() * 0.7, 0, '#141414');
    },
    paintHind(g, r) { g.fillStyle = '#f2efe6'; g.fillRect(-5, -5, 40, 35); blob(g, 18, 14, 1, 1, 0, '#141414'); },
    body: { thorax: [6, 8], abdomen: [5, 18], fur: '#f4f0e6', furHi: '#ffffff', head: 4,
      paint(g) { for (let i = 0; i < 4; i++) { blob(g, 0, 8 + i * 4.2, 4.2, 1.6, 0, '#f0d040'); blob(g, 0, 9 + i * 4.2, 1, 1, 0, '#111'); } } },
    antenna: { type: 'feather', len: 11, color: '#2a2a2a' },
  },
  vinula: {
    latin: 'Cerura vinula', common: 'Puss moth', span: 68,
    fore: [[2, -5], [26, -14], [54, -20], [66, -17], [60, -4], [44, 6], [22, 10], [4, 5]],
    hind: [[3, 3], [24, 6], [42, 12], [48, 24], [38, 34], [18, 34], [6, 24], [2, 10]],
    foreAngle: -0.03, hindAngle: 0.06,
    paintFore(g, r) {
      g.fillStyle = '#e6e4de'; g.fillRect(-5, -30, 70, 45);
      for (let k = 0; k < 5; k++) { const pts = []; for (let i = 0; i <= 6; i++) pts.push([8 + k * 10 + (i % 2) * 3, 8 - i * 4.5]); band(g, pts, 0.9, 'rgba(70,70,74,0.7)'); }
      speckle(g, r, 120, 0, -20, 64, 8, 'rgba(60,60,64,0.4)', 0.8);
    },
    paintHind(g) { g.fillStyle = '#d6d4cc'; g.fillRect(-5, -5, 55, 45); band(g, [[8, 28], [28, 32], [44, 24]], 1, 'rgba(70,70,74,0.5)'); },
    body: { thorax: [8, 10], abdomen: [7, 24], fur: '#eeece6', furHi: '#ffffff', head: 5,
      paint(g) { for (const [x, y] of [[-3, -12], [3, -12], [0, -6]]) blob(g, x, y, 1.2, 1.2, 0, '#222'); } },
    antenna: { type: 'feather', len: 14, color: '#3a3a3a' },
  },
  mittrei: {
    latin: 'Argema mittrei', common: 'Comet moth', span: 92,
    fore: [[2, -6], [28, -20], [62, -32], [80, -34], [86, -28], [72, -8], [50, 8], [26, 12], [6, 6]],
    hind: [[3, 4], [26, 8], [44, 20], [46, 36], [38, 52], [34, 90], [32, 140], [28, 150], [24, 140], [22, 100], [16, 56], [6, 36], [2, 18]],
    foreAngle: -0.08, hindAngle: 0.04,
    paintFore(g, r) {
      g.fillStyle = '#efc62a'; g.fillRect(-5, -40, 95, 60);
      band(g, [[2, -7], [30, -21], [62, -33]], 3, '#8a4a20');
      eyespot(g, 44, -12, 5, [[1, '#8a3a1c'], [0.7, '#d8a040'], [0.45, '#2a1a10'], [0.2, '#f2e2b0']]);
    },
    paintHind(g) {
      const gr = g.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, '#f0c62c'); gr.addColorStop(0.45, '#e8b028'); gr.addColorStop(0.8, '#c86a28'); gr.addColorStop(1, '#a03a1c');
      g.fillStyle = gr; g.fillRect(-5, -5, 60, 160);
      eyespot(g, 28, 28, 5.5, [[1, '#8a3a1c'], [0.7, '#d8a040'], [0.45, '#2a1a10'], [0.2, '#f2e2b0']]);
    },
    body: { thorax: [8, 10], abdomen: [7, 28], fur: '#f2f0e6', furHi: '#ffffff', head: 5, paint(g) { blob(g, 0, -14, 7, 1.4, 0, '#c87a40'); } },
    antenna: { type: 'feather', len: 17, color: '#9a6a30' },
  },
  elpenor: {
    latin: 'Deilephila elpenor', common: 'Elephant hawkmoth', span: 62,
    fore: [[2, -5], [22, -12], [48, -18], [64, -19], [66, -14], [56, -4], [36, 6], [14, 8], [4, 4]],
    hind: [[3, 2], [18, 4], [32, 9], [36, 18], [28, 24], [14, 24], [5, 17], [2, 8]],
    foreAngle: -0.05, hindAngle: 0.08,
    paintFore(g) {
      g.fillStyle = '#7e7c3c'; g.fillRect(-5, -25, 75, 35);
      band(g, [[4, -5], [40, -16], [64, -18]], 2.6, '#d86a92');
      band(g, [[10, 6], [36, -2], [62, -12]], 3.2, '#d86a92');
      band(g, [[22, 6], [44, -4]], 1.6, '#e892b0');
    },
    paintHind(g) { g.fillStyle = '#d8789a'; g.fillRect(-5, -5, 45, 35); g.fillStyle = '#1a1414'; g.fillRect(-5, -5, 14, 35); },
    body: { thorax: [6.5, 9], abdomen: [6, 26], fur: '#7e7c3c', furHi: '#c0b060', head: 4.5,
      paint(g) { g.fillStyle = 'rgba(216,106,146,0.85)'; g.fillRect(-1.2, -14, 2.4, 40); g.fillRect(-6, -10, 1.6, 14); g.fillRect(4.4, -10, 1.6, 14); } },
    antenna: { type: 'thick', len: 16, color: '#e8e0e0' },
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
    g.globalAlpha = 0.12; speckle(g, r, 900, -5, -45, 115, 155, '#000', 0.5); speckle(g, r, 600, -5, -45, 115, 155, '#fff', 0.5); g.globalAlpha = 1;
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
  if (pin) drawPin(g);
}

// An insect pin seen from slightly above and to the left: a black enamel head on a
// steel shaft that leans out of the thorax, with a soft shadow cast down-right.
export function drawPin(g, scale = 1) {
  g.save(); g.scale(scale, scale);
  const hx = 5.6, hy = -4.2, bx = 2.4, by = -0.8; // head and entry point in the thorax
  // cast shadow of shaft and head on the wing/backing
  g.save(); g.filter = 'blur(1.2px)'; g.strokeStyle = 'rgba(15,8,4,0.45)'; g.lineWidth = 1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 9, by + 6); g.stroke();
  g.fillStyle = 'rgba(15,8,4,0.45)'; g.beginPath(); g.ellipse(bx + 10.5, by + 7, 3, 2.3, 0.5, 0, 7); g.fill(); g.restore();
  // dimple where the pin enters
  blob(g, bx, by, 1.3, 0.9, 0, 'rgba(10,6,3,0.6)');
  // steel shaft
  const sg = g.createLinearGradient(bx - 0.6, 0, bx + 0.6, 0); sg.addColorStop(0, '#5a5a58'); sg.addColorStop(0.5, '#e8e8e2'); sg.addColorStop(1, '#4a4a48');
  g.strokeStyle = sg; g.lineWidth = 0.75; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(hx, hy); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 0.25; g.beginPath(); g.moveTo(bx - 0.15, by - 0.3); g.lineTo(hx - 0.1, hy + 0.6); g.stroke();
  // round black enamel head with a specular highlight
  const pg = g.createRadialGradient(hx - 1, hy - 1.1, 0.1, hx, hy, 2.8);
  pg.addColorStop(0, '#d8d8d8'); pg.addColorStop(0.18, '#4a4a4c'); pg.addColorStop(0.6, '#141416'); pg.addColorStop(1, '#050506');
  g.fillStyle = pg; g.beginPath(); g.arc(hx, hy, 2.6, 0, 7); g.fill();
  g.restore();
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
  // the other side: a different scale pattern and a fractionally different set
  const wing2 = document.createElement('canvas'); wing2.width = W; wing2.height = H;
  const w2 = wing2.getContext('2d'); w2.translate(4, H * 0.32); w2.scale(k * 0.985, k * 0.985); w2.rotate(0.025); drawWingPair(w2, sp, rng(seed + 17));
  const body = document.createElement('canvas'); body.width = Math.ceil(size * 0.25); body.height = H;
  const bg = body.getContext('2d'); bg.translate(body.width / 2, H * 0.32); bg.scale(k, k); drawBody(bg, sp, rng(seed + 1), false);
  const pin = document.createElement('canvas'); pin.width = body.width * 2; pin.height = H;
  const pg2 = pin.getContext('2d'); pg2.translate(pin.width / 2, H * 0.32); pg2.scale(k, k); drawPin(pg2, 1.1);
  return { wing, wing2, body, pin, originY: H * 0.32, ox: 4 };
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

// Wing extents of a species in body units (for fitting a specimen into a box).
export function mothBounds(key) {
  const sp = SPECIES[key]; let maxX = 0, minY = -sp.antenna.len - 20, maxY = 4 + sp.body.abdomen[1];
  for (const p of [...sp.fore, ...sp.hind]) { maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  return { halfW: maxX + 4, minY: minY - 3, maxY: maxY + 4 };
}

// Draw a specimen scaled to fit the rectangle (x, y, w, h).
export function drawSpecimenFit(g, key, x, y, w, h, opts = {}) {
  const b = mothBounds(key), sp = SPECIES[key];
  const k = Math.min(w / (2 * b.halfW), h / (b.maxY - b.minY));
  const cy = y + (h - (b.maxY - b.minY) * k) / 2 - b.minY * k;
  drawMoth(g, key, x + w / 2, cy, sp.span * 2 * k, opts);
}
