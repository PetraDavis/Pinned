// Moths of the Catacombs: new species (drawn like the rest, see moths.js), the four moth
// notes found down there, and the story passages they add to the Moth Journal.
// Registered into the shared SPECIES / MOTH_NOTES / STORY lists when this module loads, so
// the rest of the game treats them like any other specimen.
// None of these species appears anywhere else in the house.
import { SPECIES } from './moths.js';
import { MOTH_NOTES, STORY } from './mothNotes.js';

const blob = (g, x, y, rx, ry, rot, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
function band(g, pts, width, color) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
}
function speckle(g, r, n, x0, y0, x1, y1, color, size) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { const s = size * (0.4 + r()); g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s, s * (0.5 + r())); }
}
const wavy = (g, x, y0, y1, amp, w, c) => { const pts = []; for (let y = y0; y <= y1; y += 3) pts.push([x + Math.sin(y * 0.7) * amp + (y - y0) * 0.15, y]); band(g, pts, w, c); };

export const CATACOMB_SPECIES = {
  // ---------- moth notes ----------
  odorata: {
    latin: 'Ascalapha odorata', common: 'Black witch', span: 120,
    fore: [[2, -6], [30, -18], [70, -28], [112, -32], [118, -26], [104, -8], [80, 8], [44, 16], [8, 8]],
    hind: [[3, 4], [32, 10], [70, 18], [96, 30], [92, 50], [66, 64], [34, 60], [10, 40], [2, 18]],
    foreAngle: 0.0, hindAngle: 0.04,
    paintFore(g, r) {
      g.fillStyle = '#2e221c'; g.fillRect(-5, -40, 130, 65);
      for (const x of [22, 46, 70, 92]) wavy(g, x, -30, 14, 2.4, 1.3, 'rgba(12,8,6,0.75)');
      band(g, [[10, 8], [50, -6], [96, -24]], 2.2, 'rgba(160,110,150,0.28)'); // violet sheen
      // the comma-shaped mark near the costa
      blob(g, 40, -12, 5, 3.2, 0.5, '#120c0a'); blob(g, 41.5, -12.5, 2.2, 1.4, 0.5, 'rgba(200,170,120,0.55)'); band(g, [[44, -10], [47, -5]], 1.6, '#120c0a');
      speckle(g, r, 260, 0, -30, 112, 12, 'rgba(120,96,80,0.3)', 1.0);
    },
    paintHind(g, r) {
      g.fillStyle = '#2a1e1a'; g.fillRect(-5, -5, 105, 75);
      for (const k of [0, 1, 2]) band(g, [[6 + k * 14, 14 + k * 12], [40 + k * 10, 22 + k * 10], [88 - k * 6, 34 + k * 8]], 1.4, 'rgba(10,6,4,0.7)');
      band(g, [[10, 46], [44, 52], [80, 44]], 2.2, 'rgba(170,120,160,0.3)');
      for (const [x, y] of [[20, 52], [30, 56]]) { blob(g, x, y, 4.2, 3.2, 0, '#0e0a08'); blob(g, x, y, 2.4, 1.8, 0, 'rgba(70,100,120,0.6)'); }
      speckle(g, r, 200, 0, 0, 96, 64, 'rgba(110,90,74,0.3)', 1.0);
    },
    body: { thorax: [9, 12], abdomen: [7, 30], fur: '#2a201a', furHi: '#5a4a3e', head: 5.5, paint() {} },
    antenna: { type: 'thin', len: 26, color: '#1c1410' },
  },
  dubitata: {
    latin: 'Triphosa dubitata', common: 'Tissue', span: 40,
    fore: [[2, -4], [16, -10], [32, -15], [40, -14], [38, -8], [36, -2], [24, 5], [10, 7], [3, 4]],
    hind: [[3, 3], [14, 5], [26, 9], [30, 15], [27, 19], [22, 21], [12, 21], [4, 14], [2, 7]],
    foreAngle: 0.08, hindAngle: 0.14,
    paintFore(g, r) {
      g.fillStyle = '#9a7e74'; g.fillRect(-5, -20, 50, 30);
      for (let i = 0; i < 12; i++) wavy(g, 3 + i * 3.1, -16, 8, 0.9, 0.5 + (i % 4 === 1 ? 0.7 : 0), i % 4 === 1 ? 'rgba(60,40,36,0.75)' : 'rgba(80,58,52,0.4)');
      blob(g, 16, -6, 8, 4, 0.2, 'rgba(190,140,130,0.35)'); speckle(g, r, 120, 0, -14, 38, 6, 'rgba(230,210,200,0.25)', 0.7);
    },
    paintHind(g) { g.fillStyle = '#a89088'; g.fillRect(-5, -5, 40, 30); for (let i = 0; i < 6; i++) wavy(g, 4 + i * 4, 2, 20, 0.8, 0.5, 'rgba(80,60,54,0.35)'); },
    body: { thorax: [4.5, 6], abdomen: [3.8, 17], fur: '#8a7068', furHi: '#c8aca0', head: 3.4, paint() {} },
    antenna: { type: 'thin', len: 13, color: '#6a5048' },
  },
  tapetzella: {
    latin: 'Trichophaga tapetzella', common: 'Tapestry moth', span: 20,
    fore: [[2, -3], [9, -5], [16, -6.5], [20, -6], [19.5, -3], [14, -1], [7, 1], [2, 1]],
    hind: [[2, 1], [8, 1.5], [15, 2.5], [17, 4], [13, 5.5], [6, 4.5], [2, 3]],
    foreAngle: 0.18, hindAngle: 0.26,
    paintFore(g, r) {
      g.fillStyle = '#ece6da'; g.fillRect(-5, -12, 30, 18);
      g.fillStyle = '#2a201e'; g.fillRect(-5, -12, 11.5, 18); // the dark basal third
      speckle(g, r, 70, 7, -6, 20, 1, 'rgba(110,104,100,0.55)', 0.7);
      blob(g, 14, -3.5, 1.6, 1.1, 0, 'rgba(120,112,108,0.6)');
    },
    paintHind(g) { g.fillStyle = '#b8b0a8'; g.fillRect(-5, -5, 25, 15); },
    body: { thorax: [2.6, 3.2], abdomen: [2.2, 8], fur: '#ece4d8', furHi: '#ffffff', head: 2.2, paint(g) { blob(g, 0, -17.2, 2.4, 1.8, 0, '#f4ecde'); } },
    antenna: { type: 'thin', len: 9, color: '#8a7e70' },
  },
  aprilina: {
    latin: 'Griposia aprilina', common: 'Merveille du jour', span: 45,
    fore: [[2, -4], [16, -9], [32, -13], [44, -12], [43, -6], [34, 2], [16, 6], [3, 3]],
    hind: [[3, 2], [14, 4], [26, 7], [30, 13], [24, 18], [12, 17], [3, 11], [2, 6]],
    foreAngle: 0.05, hindAngle: 0.14,
    paintFore(g, r) {
      g.fillStyle = '#9cc4a0'; g.fillRect(-5, -18, 55, 28);
      // black and white lichen blotches and wavy cross-lines
      for (let k = 0; k < 26; k++) blob(g, 4 + r() * 40, -12 + r() * 16, 1 + r() * 3, 0.8 + r() * 2, r() * 3, r() < 0.6 ? '#1a1e1a' : '#eef2ea');
      band(g, [[10, 5], [12, -2], [10, -9], [13, -13]], 1.4, '#141814'); band(g, [[28, 3], [30, -4], [27, -10], [30, -13]], 1.4, '#141814');
      blob(g, 20, -6, 2.4, 1.8, 0, '#eef2ea'); blob(g, 20, -6, 1.2, 0.9, 0, '#2a302a');
    },
    paintHind(g) { g.fillStyle = '#6a6a64'; g.fillRect(-5, -5, 40, 30); band(g, [[4, 10], [16, 12], [28, 12]], 1.2, '#4a4a46'); },
    body: { thorax: [4.4, 6], abdomen: [3.6, 15], fur: '#9cc4a0', furHi: '#e4f0e0', head: 3.4, paint() {} },
    antenna: { type: 'thin', len: 12, color: '#3a3e38' },
  },
  // ---------- the apothecary's poison drawers, mildest first ----------
  poodle: {
    latin: 'Artace sp.', common: 'Venezuelan poodle moth', span: 30,
    fore: [[2, -4], [12, -9], [24, -12], [30, -11], [29, -5], [22, 2], [10, 5], [3, 3]],
    hind: [[3, 2], [12, 4], [21, 7], [23, 12], [18, 16], [9, 16], [3, 10], [2, 5]],
    foreAngle: 0.12, hindAngle: 0.2,
    paintFore(g, r) { g.fillStyle = '#f2efe8'; g.fillRect(-5, -15, 40, 22); speckle(g, r, 120, 0, -12, 30, 4, 'rgba(255,255,255,0.8)', 0.9); speckle(g, r, 40, 4, -10, 28, 2, 'rgba(200,190,170,0.35)', 0.7); },
    paintHind(g) { g.fillStyle = '#f4f2ec'; g.fillRect(-5, -5, 30, 25); },
    body: { thorax: [7, 8], abdomen: [6.5, 16], fur: '#f6f2ea', furHi: '#ffffff', head: 5.5,
      paint(g) { for (const s of [-1, 1]) blob(g, s * 4.2, -17.6, 2.5, 2.8, 0, '#0c0a0a'); } },
    antenna: { type: 'feather', len: 15, color: '#a8742a' },
  },
  dominula: {
    latin: 'Callimorpha dominula', common: 'Scarlet tiger', span: 52,
    fore: [[2, -5], [20, -11], [40, -15], [52, -13], [50, -5], [38, 4], [18, 8], [4, 4]],
    hind: [[3, 3], [18, 5], [32, 10], [36, 18], [28, 25], [14, 25], [5, 17], [2, 8]],
    foreAngle: 0.02, hindAngle: 0.12,
    paintFore(g) {
      g.fillStyle = '#1a2228'; g.fillRect(-5, -22, 60, 34);
      g.fillStyle = 'rgba(60,110,100,0.25)'; g.fillRect(-5, -22, 60, 34); // green-blue gloss
      for (const [x, y, c, s] of [[8, -6, '#f0e8d0', 2.6], [14, -2, '#f0d84a', 2.2], [20, -9, '#f0e8d0', 2.8], [28, -2, '#f0e8d0', 2.4], [34, -10, '#f0e8d0', 2.6], [42, -6, '#f0e8d0', 2.2], [46, -10, '#f0e8d0', 1.8], [6, 2, '#f0d84a', 1.8]]) blob(g, x, y, s, s * 0.85, 0, c);
    },
    paintHind(g) { g.fillStyle = '#d8202a'; g.fillRect(-5, -5, 45, 35); for (const [x, y, s] of [[20, 10, 3.2], [28, 18, 3.8], [14, 20, 2.6], [30, 10, 2.2]]) blob(g, x, y, s, s * 0.8, 0.3, '#14161a'); },
    body: { thorax: [5.5, 7.5], abdomen: [4.5, 19], fur: '#1a2228', furHi: '#3a5a58', head: 4, paint(g) { g.fillStyle = 'rgba(216,32,42,0.8)'; g.fillRect(-1, 6, 2, 16); } },
    antenna: { type: 'thin', len: 15, color: '#14181c' },
  },
  epilais: {
    latin: 'Syntomeida epilais', common: 'Polka-dot wasp moth', span: 46,
    fore: [[2, -4], [18, -8], [36, -11], [46, -11], [45, -6], [32, 0], [14, 2], [3, 2]],
    hind: [[3, 2], [10, 3], [18, 5], [20, 9], [14, 11], [6, 9], [2, 5]],
    foreAngle: 0.12, hindAngle: 0.3,
    paintFore(g) {
      const gr = g.createLinearGradient(0, -12, 46, 2); gr.addColorStop(0, '#16224a'); gr.addColorStop(0.5, '#243a7a'); gr.addColorStop(1, '#141c3c');
      g.fillStyle = gr; g.fillRect(-5, -16, 55, 22);
      for (const [x, y] of [[10, -4], [18, -6], [26, -7], [33, -6], [40, -8], [22, -2]]) blob(g, x, y, 1.7, 1.5, 0, '#f4f4f4');
    },
    paintHind(g) { g.fillStyle = '#1c2a5a'; g.fillRect(-5, -5, 30, 18); blob(g, 10, 5, 1.6, 1.3, 0, '#f4f4f4'); },
    body: { thorax: [4.5, 6], abdomen: [3.8, 20], fur: '#1e3070', furHi: '#4a68c0', head: 3.4,
      paint(g) { for (let i = 0; i < 4; i++) for (const s of [-1, 1]) blob(g, s * 2, 8 + i * 4.2, 0.9, 0.8, 0, '#f4f4f4'); blob(g, 0, 22.5, 2.6, 1.6, 0, '#d82a20'); } },
    antenna: { type: 'thin', len: 14, color: '#141a30' },
  },
  chrysorrhoea: {
    latin: 'Euproctis chrysorrhoea', common: 'Brown-tail', span: 36,
    fore: [[2, -4], [16, -10], [30, -13], [36, -12], [35, -5], [26, 2], [12, 5], [3, 3]],
    hind: [[3, 2], [14, 4], [24, 8], [27, 14], [21, 19], [10, 19], [3, 12], [2, 6]],
    foreAngle: 0.04, hindAngle: 0.12,
    paintFore(g, r) { g.fillStyle = '#f8f6f0'; g.fillRect(-5, -18, 45, 26); speckle(g, r, 80, 0, -12, 34, 4, 'rgba(255,255,255,0.7)', 0.8); },
    paintHind(g) { g.fillStyle = '#f6f4ee'; g.fillRect(-5, -5, 35, 28); },
    body: { thorax: [5, 6.5], abdomen: [4.2, 17], fur: '#f4f0e6', furHi: '#ffffff', head: 3.8,
      paint(g) { blob(g, 0, 19, 4.6, 4.2, 0, '#7a4a20'); blob(g, 0, 20.5, 3.4, 2.6, 0, '#a8682a'); } },
    antenna: { type: 'feather', len: 12, color: '#c8b088' },
  },
  opercularis: {
    latin: 'Megalopyge opercularis', common: 'Southern flannel moth', span: 30,
    fore: [[2, -4], [12, -9], [24, -11], [30, -9], [28, -3], [20, 3], [9, 5], [3, 3]],
    hind: [[3, 2], [11, 4], [19, 7], [21, 12], [16, 15], [8, 15], [3, 10], [2, 5]],
    foreAngle: 0.2, hindAngle: 0.28,
    paintFore(g, r) {
      g.fillStyle = '#e8c27a'; g.fillRect(-5, -15, 40, 22);
      for (let i = 0; i < 260; i++) { const x = r() * 30, y = -12 + r() * 16; g.strokeStyle = r() < 0.5 ? 'rgba(255,236,190,0.5)' : 'rgba(150,100,40,0.35)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.6, y + 0.8); g.stroke(); }
      band(g, [[3, -1], [8, -6], [6, -10]], 1.2, 'rgba(70,40,20,0.75)'); band(g, [[8, 1], [12, -4]], 1.0, 'rgba(70,40,20,0.6)');
    },
    paintHind(g) { g.fillStyle = '#f0d49a'; g.fillRect(-5, -5, 30, 22); },
    body: { thorax: [6.5, 8], abdomen: [5.5, 15], fur: '#e8bc6a', furHi: '#fff0c8', head: 4.6, paint() {} },
    antenna: { type: 'feather', len: 10, color: '#8a5a2a' },
  },
  obliqua: {
    latin: 'Lonomia obliqua', common: 'Lonomia moth', span: 64,
    fore: [[2, -5], [22, -14], [46, -20], [62, -22], [64, -17], [58, -12], [56, -4], [40, 6], [18, 9], [4, 5]],
    hind: [[3, 3], [20, 6], [38, 12], [44, 22], [36, 30], [18, 30], [6, 22], [2, 10]],
    foreAngle: 0.0, hindAngle: 0.1,
    paintFore(g, r) {
      g.fillStyle = '#8a6a3c'; g.fillRect(-5, -26, 75, 40);
      band(g, [[8, 8], [34, -6], [60, -18]], 1.8, '#3a2614'); // the oblique line
      band(g, [[6, 6], [32, -8], [58, -20]], 0.8, 'rgba(230,200,140,0.6)');
      blob(g, 24, -6, 1.8, 1.4, 0, '#2a1a0e'); speckle(g, r, 160, 0, -20, 62, 8, 'rgba(60,40,20,0.3)', 0.9);
    },
    paintHind(g) { g.fillStyle = '#9a7442'; g.fillRect(-5, -5, 50, 40); band(g, [[6, 22], [24, 26], [40, 22]], 1.4, '#3a2614'); },
    body: { thorax: [6, 8], abdomen: [5, 22], fur: '#7a5a32', furHi: '#b08a52', head: 4.2, paint() {} },
    antenna: { type: 'feather', len: 14, color: '#5a3e20' },
  },
};
Object.assign(SPECIES, CATACOMB_SPECIES);

// The apothecary's six drawers of poisons, from the harmless to the deadliest.
export const POISON_ORDER = ['poodle', 'dominula', 'epilais', 'chrysorrhoea', 'opercularis', 'obliqua'];

// Moth notes in the Catacombs (room-zone local coordinates).
export const CATACOMB_NOTES = [
  { id: 'n-odorata', key: 'odorata', kind: 'wall', pos: [37.6, 1.75, 120.13], ry: 0,
    text: 'A Black witch, wide as a hand and dark as a bruise. In the leader’s hand on the stone: “In the south they say that when this one comes into a house, someone in it will die. We kept a hundred down here. We were never short of the dying.”' },
  { id: 'n-dubitata', key: 'dubitata', kind: 'wall', pos: [51.87, 1.6, 144.6], ry: -Math.PI / 2,
    text: 'A Tissue, rose and grey, the moth that sleeps out the winter in caves. Chalked beside it: “She goes down into the dark every winter and comes up in the spring as if nothing had happened. The ones we laid in the water were promised the same.”' },
  { id: 'n-tapetzella', key: 'tapetzella', kind: 'pinned', pos: [44.6, 0.922, 151.6], ry: 0.3, flat: true,
    text: 'A Tapestry moth in a pill box on the counter. Its grubs eat what other moths will not: fur, feathers, hair. The label, in a shaking hand: “Nothing down here goes to waste. Father said that about the moths. I think he meant the members.”' },
  { id: 'n-aprilina', key: 'aprilina', kind: 'wall', pos: [57.87, 1.7, 154.0], ry: -Math.PI / 2,
    text: 'A Merveille du jour, green and black like lichen on a gravestone, and almost invisible against the stone. Scratched under it: “She has a face too, under the dust. I saw it once, at the hatch. She was smiling the way he does.”' },
];
MOTH_NOTES.push(...CATACOMB_NOTES);

// four more pages of the story, continuing the Journal
export const CATACOMB_STORY = [
  'Under the cellar the Order buried its own. Not in the churchyard: down here, in the old catacomb under the house, where the bones could be stacked and counted and kept.',
  'Those who did not come out of the silk were laid in the flooded crypt. The faithful called it the waiting room. They believed the dead were only sleeping longer than the rest.',
  'The Order had its own apothecary. He knew which moths could kill, and kept them in order, mildest first. Some of the members who doubted were cured by him, and never doubted again.',
  'There is a tunnel out of the catacombs that the Order bricked up and chained. Someone on the other side once tried very hard to get through it. The scratches go both ways.',
];
STORY.splice(19, 0, ...CATACOMB_STORY); // the route reaches the catacombs before the attic

// ---------- decoy labels for the apothecary's other twenty-four drawers ----------
// Real species, drawn simply, used nowhere else in the house: every drawer front carries a
// painted moth and its names, so the right drawers have to be found from the clues.
const SHAPES = {
  noctuid: { fore: [[2, -3], [12, -7], [24, -10], [30, -9], [29, -3], [22, 3], [10, 5], [2, 2]], hind: [[2, 2], [10, 3], [19, 6], [22, 11], [17, 15], [8, 14], [2, 9]], foreAngle: 0.1, hindAngle: 0.2 },
  geometrid: { fore: [[2, -3], [14, -9], [26, -14], [32, -13], [30, -6], [20, 1], [8, 4], [2, 2]], hind: [[2, 2], [12, 3], [24, 6], [30, 12], [24, 19], [12, 18], [3, 11]], foreAngle: -0.05, hindAngle: 0.05 },
  hawk: { fore: [[2, -3], [16, -7], [32, -11], [40, -11], [36, -6], [24, 1], [8, 3], [2, 2]], hind: [[2, 2], [10, 3], [18, 5], [20, 9], [14, 11], [6, 10], [2, 7]], foreAngle: 0.18, hindAngle: 0.3 },
};
const decoy = (key, latin, common, span, shape, ground, line, spot, hind) => ({ key, sp: {
  latin, common, span, ...SHAPES[shape],
  paintFore(g, r) {
    g.fillStyle = ground; g.fillRect(-5, -18, 50, 30);
    speckle(g, r, 120, 0, -14, 40, 6, 'rgba(0,0,0,0.12)', 0.8);
    band(g, [[9, 4], [11, -4], [9, -12]], 1.2, line); band(g, [[21, 3], [24, -5], [22, -13]], 1.2, line);
    if (spot) blob(g, 15, -4, 1.8, 1.3, 0, spot);
  },
  paintHind(g) { g.fillStyle = hind; g.fillRect(-5, -5, 45, 30); },
  body: { thorax: [3.6, 5], abdomen: [3, 13], fur: ground, furHi: '#e8e0d0', head: 2.8, paint() {} },
  antenna: { type: shape === 'geometrid' ? 'feather' : 'thin', len: 11, color: '#3a3028' },
} });
const DECOYS = [
  decoy('meticulosa', 'Phlogophora meticulosa', 'Angle shades', 45, 'noctuid', '#9a8a6a', '#4a3a2a', '#c09080', '#b0a088'),
  decoy('chrysitis', 'Diachrysia chrysitis', 'Burnished brass', 36, 'noctuid', '#b89a50', '#5a4a30', null, '#8a7a60'),
  decoy('tiliae', 'Mimas tiliae', 'Lime hawk-moth', 70, 'hawk', '#9aa078', '#3e5236', '#3e5236', '#c09a60'),
  decoy('sambucaria', 'Ourapteryx sambucaria', 'Swallow-tailed moth', 50, 'geometrid', '#ece2a8', '#b0a070', '#c06030', '#ece2a8'),
  decoy('batis', 'Thyatira batis', 'Peach blossom', 36, 'noctuid', '#5a4a3e', '#e8b0a8', '#e8b0a8', '#8a7a6a'),
  decoy('prasinana', 'Pseudoips prasinana', 'Green silver-lines', 34, 'noctuid', '#7aa860', '#e8ece0', null, '#e8e8d8'),
  decoy('alniaria', 'Ennomos alniaria', 'Canary-shouldered thorn', 38, 'geometrid', '#d8a040', '#8a5a20', '#8a5a20', '#e0b860'),
  decoy('pudibunda', 'Calliteara pudibunda', 'Pale tussock', 50, 'noctuid', '#c0bab0', '#6a645c', null, '#d8d2c8'),
  decoy('tripartita', 'Abrostola tripartita', 'Spectacle', 32, 'noctuid', '#8a847a', '#2a2622', '#e8e0d0', '#9a9488'),
  decoy('comae', 'Timandra comae', 'Blood-vein', 32, 'geometrid', '#e8dcc0', '#b04a40', null, '#e8dcc0'),
  decoy('marginata', 'Lomaspilis marginata', 'Clouded border', 26, 'geometrid', '#f0ece0', '#3a3430', '#3a3430', '#f0ece0'),
  decoy('ziczac', 'Notodonta ziczac', 'Pebble prominent', 44, 'noctuid', '#c8a878', '#5a4030', '#e8dcc0', '#d8c8a8'),
  decoy('glaucata', 'Cilix glaucata', 'Chinese character', 22, 'geometrid', '#f2f0ea', '#9a8a7a', '#8a7a6a', '#f2f0ea'),
  decoy('flavago', 'Gortyna flavago', 'Frosted orange', 36, 'noctuid', '#d89838', '#7a4a20', '#7a4a20', '#e8d8b0'),
  decoy('nigrum', 'Xestia c-nigrum', 'Setaceous Hebrew character', 38, 'noctuid', '#7a5a4a', '#1a1412', '#e8c8a0', '#b8a898'),
  decoy('bilineata', 'Camptogramma bilineata', 'Yellow shell', 28, 'geometrid', '#d8b040', '#6a4a20', null, '#d8b040'),
  decoy('parthenias', 'Archiearis parthenias', 'Orange underwing', 38, 'noctuid', '#5a4a40', '#e8e0d0', null, '#e08030'),
  decoy('tetralunaria', 'Selenia tetralunaria', 'Purple thorn', 42, 'geometrid', '#8a6a5a', '#4a3028', '#e8d8c8', '#b89880'),
  decoy('pennaria', 'Colotois pennaria', 'Feathered thorn', 44, 'geometrid', '#b0703a', '#5a3018', '#f0e0c0', '#c8905a'),
  decoy('populi', 'Poecilocampa populi', 'December moth', 40, 'noctuid', '#3a302a', '#d8c8a0', null, '#4a403a'),
  decoy('hirtaria', 'Lycia hirtaria', 'Brindled beauty', 48, 'geometrid', '#8a8070', '#2a2420', null, '#a09888'),
  decoy('flammea', 'Panolis flammea', 'Pine beauty', 34, 'noctuid', '#b05a30', '#e8d8b8', '#e8d8b8', '#8a6a5a'),
  decoy('furcula', 'Furcula furcula', 'Sallow kitten', 34, 'noctuid', '#e8e4dc', '#4a4a50', '#2a2a30', '#e8e4dc'),
  decoy('capucina', 'Ptilodon capucina', 'Coxcomb prominent', 40, 'noctuid', '#b07a40', '#5a3a1a', null, '#d0b080'),
];
for (const d of DECOYS) SPECIES[d.key] = d.sp;
export const DECOY_KEYS = DECOYS.map(d => d.key);
