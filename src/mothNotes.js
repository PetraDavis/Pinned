// The story lives in the moths. Specimens found around the house (pinned in boxes, sealed in
// jars, resting on the walls) each carry a short message. Picking one up shows it and adds
// it to the Moth Journal. The journal also writes out the story in plain words, one passage
// per moth collected, in collection order whichever moth it was.
// Each species appears once here, and none is an answer to the first three puzzles.
// Positions are in the room zone's local coordinates.
import * as THREE from 'three';
import { drawMoth, SPECIES } from './moths.js';

export const MOTH_NOTES = [
  // ---- ground floor ----
  { id: 'n-atlas', key: 'atlas', kind: 'wall', pos: [27.0, 2.2, -7.93], ry: 0,
    text: 'Pinned through the thorax to the wallpaper, still perfect: “The Atlas has no mouth. It lives a week on what it ate as a child. So shall we.”' },
  { id: 'n-infusa', key: 'infusa', kind: 'wall', pos: [9.6, 1.9, 4.72], ry: Math.PI,
    text: 'A Bogong moth, a long way from home. Scratched beside it: “They fly a thousand miles to sleep in the same cold caves their parents slept in. They never met their parents.”' },
  { id: 'n-rhipheus', key: 'rhipheus', kind: 'pinned', pos: [11.12, 1.75, -2.4], ry: Math.PI / 2,
    text: 'The Sunset moth, in a box labelled in the leader’s hand: “Its colours are not pigment. They are only the way light breaks on it. Look closely and there is nothing there at all.”' },
  { id: 'n-nupta', key: 'nupta', kind: 'wall', pos: [33.93, 2.4, 0.5], ry: -Math.PI / 2,
    text: 'A Red underwing, grey as bark until it opens. On the plaster beside it, in pencil: “Members, 1879: forty. Members, 1886: nineteen. The rest have been taken up.”' },
  { id: 'n-papilionaria', key: 'papilionaria', kind: 'wall', pos: [20.33, 2.6, 5.6], ry: Math.PI / 2,
    text: 'A Large emerald, faded almost white. A label: “The green does not keep. Nothing keeps that is taken out of the dark too soon.”' },
  { id: 'n-grossulariata', key: 'grossulariata', kind: 'wall', pos: [37.0, 2.0, 9.93], ry: Math.PI,
    text: 'A Magpie moth over the sideboard. “The guests were told it was a supper. It was a supper. They were the last course anyone served in this house.”' },
  { id: 'n-filipendulae', key: 'filipendulae', kind: 'wall', pos: [41.33, 1.8, 0.2], ry: Math.PI / 2,
    text: 'A Six-spot burnet. It carries its own poison, made from what it ate. Under it, small writing: “Cook would not touch the cups after. She said they smelled of almonds.”' },
  { id: 'n-luteolata', key: 'luteolata', kind: 'jar', pos: [43.7, 0.0, -6.0], ry: 0,
    text: 'A Brimstone moth sealed in a preserving jar, the lid waxed shut. Scratched into the glass: “Fed the Mother today. She is so much bigger. She knew my name.”' },
  // ---- cellar ----
  { id: 'n-maura', key: 'maura', kind: 'wall', pos: [33.5, 1.7, 56.73], ry: Math.PI,
    text: 'An Old lady, the moth that hides in cellars. Chalked beneath it: “The cellar is warm because she is warm. Do not touch the eggs. They are listening.”' },
  { id: 'n-libatrix', key: 'libatrix', kind: 'pinned', pos: [43.0, 1.45, 40.1], ry: 0, clue: 'altar',
    text: 'The Herald, which sleeps all winter in cellars and wakes first. Its label is a page of the Order’s catechism: “As the clothes moth, so the faithful. Kneel at the altar and walk her life from the first day to the last, and the house will open the way up to the Mother.”' },
  { id: 'n-humuli', key: 'humuli', kind: 'wall', pos: [39.23, 1.6, 48.0], ry: Math.PI / 2,
    text: 'A Ghost moth, white as a sheet. “The males dance over the grass at dusk to call the females down. The Mother called us the same way. We came.”' },
  { id: 'n-jacobaeae', key: 'jacobaeae', kind: 'pinned', pos: [57.93, 1.8, 44.0], ry: -Math.PI / 2,
    text: 'A Cinnabar, black and red. Its card: “Initiation: one night in silk. Those who came out were no longer cold. Those who did not, we keep upstairs.”' },
  // ---- first floor ----
  { id: 'n-mori', key: 'mori', kind: 'jar', pos: [31.6, 0.81, 82.2], ry: 0.4,
    text: 'A Silkworm moth in a jar, too heavy to fly; it was bred that way. A note wound round the jar: “The silkworm does not choose the cocoon. It is spun for it, from inside, and boiled before it can leave. We were kinder. We let ours sleep.”' },
  { id: 'n-miniata', key: 'miniata', kind: 'wall', pos: [42.0, 1.5, 80.07], ry: 0,
    text: 'A Rosy footman over the empty cradle. “She was born in this room in the spring of 1874. By her twelfth birthday her eyes were already too dark.”' },
  { id: 'n-quadripunctaria', key: 'quadripunctaria', kind: 'wall', pos: [39.23, 1.8, 88.0], ry: Math.PI / 2,
    text: 'A Jersey tiger on the gallery wall. “From up here you can see the whole hall. He used to stand here and count us as we came in.”' },
  { id: 'n-betularia', key: 'betularia', kind: 'pinned', pos: [34.4, 0.81, 92.5], ry: -0.3, flat: true, clue: 'desk',
    text: 'A Peppered moth, pinned on a naturalist’s card in the leader’s hand: “Pale, speckled, a lichen on the bark. Then the mills came, the bark went black with soot, and the black ones lived. The first black one was taken in Manchester in eighteen-hundred and the year the girl stopped counting on her wall. The desk is set to it. Change with the bark, or be eaten.”' },
  { id: 'n-bucephala', key: 'bucephala', kind: 'wall', pos: [49.37, 1.7, 83.0], ry: Math.PI / 2,
    text: 'A Buff-tip, which looks exactly like a broken twig. “I am the leader of the Order of the Pale Wing. I have been wrong about everything except her.”' },
  { id: 'n-luna', key: 'luna', kind: 'wall', pos: [55.0, 1.8, 89.23], ry: 0,
    text: 'A Luna moth, pale green, its long tails curled. A child’s writing on the label: “When the Luna comes out of its cocoon it has no mouth. It cannot eat. It only lives a little while. I have fourteen days, and no mouth to tell anyone.”' },
  { id: 'n-stellatarum', key: 'stellatarum', kind: 'wall', pos: [55.6, 1.8, 88.97], ry: Math.PI,
    text: 'A Hummingbird hawk-moth in the linen room. “Every mirror in the house shows you a little further along. She likes to watch you change.”' },
  // ---- attic ----
  { id: 'n-mi', key: 'mi', kind: 'wall', pos: [57.93, 1.6, 130.6], ry: -Math.PI / 2,
    text: 'A Mother Shipton, an old woman’s face drawn in cream on each wing. Under it, in the leader’s hand: “They all climbed the ladder in the end, one by one, singing. I sat at the foot of it and listened until the singing stopped.”' },
  { id: 'n-antiqua', key: 'antiqua', kind: 'pinned', pos: [56.0, 1.6, 128.28], ry: Math.PI,
    text: 'A Vapourer. Its card: “The female has no wings. She never leaves the cocoon she was born in: the males come to her, and she lays her eggs on its silk. The Mother has not left this attic in eleven years. She tells me she is tired of it.”' },
  { id: 'n-fagi', key: 'fagi', kind: 'jar', pos: [47.62, 0.82, 135.08], ry: 0.3,
    text: 'A Lobster moth in a jar. Its caterpillar is all legs, and rears up like a crab when it is touched. Scratched into the lid: “Luna went up on the forty-eighth day. She did not cry. She said she could hear the Mother humming through the boards.”' },
  { id: 'n-versicolora', key: 'versicolora', kind: 'wall', pos: [42.0, 0.95, 121.43], ry: 0,
    text: 'A Kentish glory, the colour of rust. Beneath it, the newest ink in the house: “I am the last of the Order. She says she cannot leave until the one from outside comes up the ladder to her. So I will not go up. I will wait below, where they will have to pass me.”' },
];

// The Moth Journal's story, one passage unlocked per moth collected (in collection order).
export const STORY = [
  'The house belonged to the Order of the Pale Wing: a small society of collectors who began, in the 1870s, by pinning moths, and ended by wanting to become them.',
  'Their leader believed the moth is the only creature that truly changes: it dissolves in the dark and comes out as something else. He wanted that for his people.',
  'Somewhere in the house they found, or made, something they called the Mother: a moth grown far too large, who never left the dark at the top of the house.',
  'They fed her. They brought her members, one at a time, and she wrapped them in silk. The Order called it being “taken up”.',
  'The leader’s daughter grew up inside the Order. She took the name Luna. She counted the days on her bedroom wall until she would be taken up too.',
  'The last supper in the dining room was for the members who had begun to doubt. Nobody who sat at that table walked out of it.',
  'The cellar is warm. The eggs in the cellar are hers. The chapel is where the faithful knelt and recited the clothes moth’s life, egg to wing, like a prayer.',
  'Upstairs, the ones who were taken up still lie in their silk. Some of the cocoons are empty. Something came out of them.',
  'You came in through a broken window because everyone at school said the house was haunted. It is not haunted. It is occupied.',
  'Every mirror shows you a little different. Paler. Stiller. Darker eyes. It is not the light. Something in the dust here is already working on you.',
  'The Order believed the change was a gift. The journals do not say whether anyone was ever asked.',
  'Luna’s countdown stopped at forty-eight. No one crossed that number out. Either the day never came, or nobody was left to count.',
  'The leader’s last entries are only about her: how big she has grown, how she knows his name, how she is waiting for “the one who comes in from outside”.',
  'You are the first person to come in from outside in a very long time.',
  'The moths in this house are not decorations. They are the members, or what the Order told itself the members had become.',
  'The Mother is still up there. The ladder to the top of the house is chained shut, but the hatch is warm to the touch.',
  'If the house is letting you further in, it is not because you are clever. It is because it wants you to reach her.',
  'You could still leave. Your reflection is less sure of that than you are.',
  'Whatever you decide at the top of the house, the Order will have its ending. The question is whether you will be in it as a guest, or as the next course.',
  'The attic is where the Order ended. One by one the members climbed the ladder, singing, and the leader sat at the foot of it until the singing stopped.',
  'Luna went up on the forty-eighth day. She was not afraid. She said she could hear the Mother humming.',
  'Not every cocoon up here is still. Some of them twitch when you are not looking. Some have begun to split.',
  'The leader did not go up. The Mother told him she could not leave until the one from outside climbed to her, and he is still somewhere in the house, waiting for you to pass.',
];

// ---- build the specimens into the room group ----
export function buildMothNotes(group) {
  const items = {};
  for (const n of MOTH_NOTES) {
    const g = new THREE.Group(); g.position.set(...n.pos); g.rotation.y = n.ry || 0; group.add(g);
    if (n.kind === 'wall') {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshStandardMaterial({ map: mothTex(n.key), transparent: true, alphaTest: 0.3, roughness: 0.8, side: THREE.DoubleSide }));
      m.position.z = 0.01; m.rotation.z = (Math.random() - 0.5) * 0.6; g.add(m);
    } else if (n.kind === 'jar') {
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe0d8, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }));
      glass.position.y = 0.08; g.add(glass);
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshStandardMaterial({ color: 0xa8b8b0, transparent: true, opacity: 0.4 })); base.rotation.x = -Math.PI / 2; base.position.y = 0.002; g.add(base);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.025, 16), new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 0.6 })); lid.position.y = 0.17; g.add(lid);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.09), new THREE.MeshStandardMaterial({ map: mothTex(n.key), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide })); m.position.y = 0.07; m.rotation.x = -0.4; g.add(m);
    } else {
      // pinned in a small glazed box, on a wall or lying flat
      const box = new THREE.Group(); g.add(box); if (n.flat) box.rotation.x = -Math.PI / 2;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.035), new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.6 })); frame.position.z = 0.018; box.add(frame);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), new THREE.MeshStandardMaterial({ map: mothTex(n.key, '#e8e0cc'), roughness: 0.9 })); back.position.z = 0.0365; box.add(back);
    }
    g.userData.note = n; items[n.id] = g;
  }
  return {
    items,
    take(id) { if (items[id]) items[id].visible = false; },
    reset(taken) { for (const [id, g] of Object.entries(items)) g.visible = !taken.has(id); },
  };
}

const texCache = {};
function mothTex(key, bg = null) {
  const k = key + (bg || ''); if (texCache[k]) return texCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); }
  const sp = SPECIES[key], size = 220 * Math.min(1, 1.15 * sp.span / Math.max(sp.span, 60));
  drawMoth(g, key, 128, 120, Math.max(150, size), { pin: !!bg, seed: key.length * 7 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[k] = t; return t;
}

// a picture of the moth for the journal and the pickup card
export function mothImage(key) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, 256, 256);
  drawMoth(g, key, 128, 122, 210, { pin: true, seed: key.length * 7 });
  return c.toDataURL('image/png');
}
