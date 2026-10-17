// Moths of the extra rooms (world/extraRooms.js): two new species, drawn like the rest (see
// moths.js), their moth notes and the story passages they add to the Moth Journal.
// Registered into the shared SPECIES / MOTH_NOTES / STORY lists when this module loads, like
// catacombMoths.js. Neither species appears anywhere else in the house.
import { SPECIES } from './moths.js';
import { MOTH_NOTES, STORY } from './mothNotes.js';

const blob = (g, x, y, rx, ry, rot, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
const eyespot = (g, x, y, r, rings) => { for (const [k, c] of rings) blob(g, x, y, r * k, r * k * 0.9, 0, c); };
function band(g, pts, width, color) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke();
}
function speckle(g, r, n, x0, y0, x1, y1, color, size) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { const s = size * (0.4 + r()); g.fillRect(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), s, s * (0.5 + r())); }
}

export const ROOM_SPECIES = {
  // the Indian moon moth: paler and yellower than the Luna, with far longer tails
  selene: {
    latin: 'Actias selene', common: 'Indian moon moth', span: 120,
    fore: [[2, -6], [26, -22], [62, -36], [88, -40], [94, -33], [78, -12], [56, 8], [30, 14], [6, 6]],
    hind: [[3, 4], [30, 9], [52, 22], [56, 42], [44, 62], [36, 96], [31, 136], [25, 142], [20, 132], [17, 96], [10, 54], [3, 26]],
    foreAngle: -0.08, hindAngle: 0.05,
    paintFore(g, r) {
      const gr = g.createRadialGradient(30, -8, 4, 44, -12, 80); gr.addColorStop(0, '#e6eebc'); gr.addColorStop(1, '#bcd890');
      g.fillStyle = gr; g.fillRect(-5, -45, 105, 65);
      band(g, [[2, -7], [32, -23], [66, -37], [92, -39]], 4.5, '#8a4a5e'); // purplish costa
      eyespot(g, 46, -14, 6, [[1, '#8a5a3a'], [0.82, '#e0c060'], [0.6, '#4a3040'], [0.38, 'rgba(230,236,210,0.85)']]);
      band(g, [[46, -14], [8, -5]], 1, 'rgba(120,150,80,0.55)');
      speckle(g, r, 120, 0, -34, 90, 10, 'rgba(255,255,230,0.18)', 1.2);
    },
    paintHind(g, r) {
      const gr = g.createLinearGradient(0, 0, 30, 140); gr.addColorStop(0, '#dcecb0'); gr.addColorStop(0.45, '#bcd88a'); gr.addColorStop(1, '#e8c87a');
      g.fillStyle = gr; g.fillRect(-5, -5, 75, 150);
      eyespot(g, 34, 32, 6, [[1, '#8a5a3a'], [0.82, '#e0c060'], [0.6, '#4a3040'], [0.38, 'rgba(230,236,210,0.85)']]);
      band(g, [[22, 76], [28, 112], [26, 138]], 2.4, 'rgba(210,150,90,0.7)'); // the rosy tail edge
      speckle(g, r, 80, 0, 0, 56, 70, 'rgba(255,255,230,0.15)', 1.2);
    },
    body: { thorax: [9, 11], abdomen: [7.5, 32], fur: '#f4f0dc', furHi: '#ffffff', head: 5, paint() {} },
    antenna: { type: 'feather', len: 22, color: '#a88a40' },
  },
  // the Drinker: a big brown eggar, a line from the wing tip and two pale spots
  potatoria: {
    latin: 'Euthrix potatoria', common: 'Drinker', span: 60,
    fore: [[2, -5], [20, -12], [44, -18], [60, -19], [60, -12], [52, -2], [38, 8], [18, 11], [4, 5]],
    hind: [[3, 3], [18, 6], [34, 11], [40, 20], [32, 28], [16, 28], [5, 19], [2, 9]],
    foreAngle: 0.0, hindAngle: 0.1,
    paintFore(g, r) {
      g.fillStyle = '#a07038'; g.fillRect(-5, -24, 70, 40);
      g.fillStyle = 'rgba(200,160,90,0.45)'; g.beginPath(); g.moveTo(0, -4); g.lineTo(58, -18); g.lineTo(40, 8); g.lineTo(4, 8); g.fill();
      band(g, [[58, -17], [34, 2], [14, 10]], 1.8, '#4a2c12'); // the oblique line from the tip
      band(g, [[40, -15], [30, -2], [20, 8]], 1.0, 'rgba(74,44,18,0.6)');
      blob(g, 24, -7, 1.9, 1.5, 0, '#f0e8d8'); blob(g, 30, -5, 1.4, 1.1, 0, '#f0e8d8'); // the two pale spots
      speckle(g, r, 200, 0, -18, 60, 10, 'rgba(60,36,14,0.25)', 0.9);
    },
    paintHind(g, r) { g.fillStyle = '#8a5a2c'; g.fillRect(-5, -5, 50, 40); speckle(g, r, 80, 0, 0, 40, 28, 'rgba(50,30,12,0.25)', 0.9); },
    body: { thorax: [6.5, 8], abdomen: [6, 22], fur: '#9a6a34', furHi: '#d0a060', head: 4.4, paint() {} },
    antenna: { type: 'feather', len: 12, color: '#5a3a18' },
  },
};
Object.assign(SPECIES, ROOM_SPECIES);

// Moth notes in the extra rooms (room-zone local coordinates).
export const ROOM_NOTES = [
  { id: 'n-potatoria', key: 'potatoria', kind: 'wall', pos: [53.33, 1.75, 87.35], ry: -Math.PI / 2,
    text: 'A Drinker moth over the bath, named for the caterpillar that drinks the dew. The label has gone soft with damp: “Sister Agnes bathed the novices here before their night in silk. Warm water, then cold, then the white robe. She said they must go up clean. She never said clean of what.”' },
  { id: 'n-selene', key: 'selene', kind: 'pinned', pos: [6.568, 1.55, 102.404], ry: 2.1815,
    text: 'An Indian moon moth, pinned beside the star charts. On the card, in a careful observer’s hand: “She steers by the moon, keeping it always at the same angle, and so she flies straight. A lamp is a false moon: keep it at the same angle and you spiral in. We kept the true one in the glass every night, and wrote down how full it was when She was hungry.”' },
];
MOTH_NOTES.push(...ROOM_NOTES);

// two more pages of the story, before the attic's
export const ROOM_STORY = [
  'Before anyone was taken up they were bathed, dressed in a white robe and walked down the west corridor, past the portraits of the ones who had gone before. Their everyday coats are still on the hooks. Nobody came back for them.',
  'The Order kept an observatory at the top of the west turret. They did not study the stars. They watched the moon, because the Mother grew restless as it filled, and someone had to know when to bring her the next one.',
];
{ const i = STORY.findIndex(s => s.startsWith('The attic is where')); STORY.splice(i < 0 ? STORY.length : i, 0, ...ROOM_STORY); }
