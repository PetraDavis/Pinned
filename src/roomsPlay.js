// The extra rooms in play (world/extraRooms.js): things to look at, and the turret stair
// between the West Corridor and the Observatory. No puzzles: the route through the house
// does not pass this way. main.js adds `interactables` to its list.
import * as THREE from 'three';
import { EXTRA } from './world/extraRooms.js';

// deps: { origin, player, say, transition, sfx: { thud, creak } }
export function createRoomsPlay({ origin: O, player, say, transition, sfx }) {
  const W = v => new THREE.Vector3(v.x + O.x, 0, v.z + O.z);
  const seen = {};
  const look = (key, pos, prompt, text, r = 1.3, ms = 9000) => ({ zone: 'room', pos: W(pos), r, prompt, act: () => say(text, ms) });
  const interactables = [
    // ---- the conservatory ----
    look('sheet', EXTRA.sheet, 'E  look at the sheet', 'A white sheet hung on a frame, with a lantern set before it: the way collectors catch moths on summer nights. Hundreds are still stuck to it, dried flat. Along the hem, in ink: “Every one that came to the light was counted, and named, and given to Her.”'),
    look('potting', EXTRA.pottingBook, 'E  read the planting book', 'A potting book in a round, careful hand: “Honeysuckle, night-scented stock, evening primrose, tobacco flower. Pale flowers only, that open at dusk. Feed the moths, and the moths feed Her.” The last pages hold seed packets, never opened, labelled for the spring of 1888.'),
    look('tea', EXTRA.teaTable, 'E  look at the table', 'Tea for two, laid and never drunk; the cups have dried to brown rings. A book on the hawk-moths lies face down, a pair of spectacles folded on it, as if someone would be straight back.'),
    // ---- the bathroom ----
    look('bath', EXTRA.bath, 'E  look into the bath', 'The bath is full to the brim with black water. Something long lies in it under a skin of silk, very still. The tap drips, and has dripped for years: the enamel under it is worn through to the iron.'),
    look('wash', EXTRA.washstand, 'E  look at the washstand', 'A razor, a shaving brush, a hairbrush full of long pale hair. The mirror over the basin has a sheet hung over it, the way they cover mirrors in a house where someone has died. A brown bottle: Laudanum. Two drops for the novice, in warm milk.'),
    // ---- the west corridor ----
    look('coats', EXTRA.coats, 'E  look at the coats', 'Coats and capes on brass hooks, a name plate over each: Br. Ambrose, Sr. Harriet, Br. Tobias, Sr. Constance, Br. Silas. The smallest hook says Luna, and the coat on it is white. Their boots wait underneath in pairs, polished, for people who are not coming back for them.'),
    look('portraits', EXTRA.portraits, 'E  look at the portraits', 'Photographs of the members in their Sunday best, each with a name and a year. On every one, something has spun silk over the face, thick and careful, as if it knew exactly where the face was.'),
    look('clock', EXTRA.clock, 'E  look at the clock', 'The long-case clock has stopped at forty-eight minutes past eleven. Its pendulum is bound to the case with silk, holding it still.', 1.1),
    look('book', EXTRA.visitorsBook, 'E  read the book', 'A visitors’ book with no visitors in it: only members, one to a line, in the order they went up. The last line is in a child’s hand: Luna, the forty-eighth day. Below it the leader has ruled a line in ink and left a space for one more name.', 1.1),
    { zone: 'room', pos: W(EXTRA.turretFoot), r: 1.15, prompt: 'E  climb the turret stair',
      act: () => transition(() => {
        player.place(O.x + EXTRA.obsArrive.x, O.z + EXTRA.obsArrive.z, 0); sfx.thud();
        if (!seen.obs) { seen.obs = true; say('The top of the west turret: a dome, open to the night along one side. A great brass telescope is pointed through the gap at the moon.', 8000); }
      }) },
    // ---- the observatory ----
    { zone: 'room', pos: W(EXTRA.obsHatch), r: 1.3, prompt: 'E  go down the turret stair',
      act: () => transition(() => { player.place(O.x + EXTRA.corridorArrive.x, O.z + EXTRA.corridorArrive.z, Math.PI); sfx.thud(); }) },
    look('scope', EXTRA.telescope, 'E  look through the telescope', 'Through the eyepiece the moon fills everything, white and pitted and very close. Something small and dark crosses it, wings open, and then another, and another, all flying the same way: towards the house.', 0.9),
    look('charts', EXTRA.obsCharts, 'E  look at the star charts', 'Star charts, pinned up all round the dome. On every one the old constellations have been inked over with a new one: a moth, her wings made of Cassiopeia and the Swan, her body laid down the Milky Way. Under her, in red: MATER.', 1.2),
    look('diagram', EXTRA.obsDiagram, 'E  study the diagrams', 'Diagrams of the moon in all her phases, with a moth drawn under each, a little larger every time. Another shows a moth flying straight by the moon, and one spiralling into a lamp. In the margin: “We are the false moon. We light the lamp and they come to us.”', 1.3),
    look('log', EXTRA.obsLog, 'E  read the observing log', 'The observing log of Br. Silas Wren: night after night, the moon’s age, the weather, and a column headed HER with one word in it. Restless. Restless. Feeding. Quiet. Restless. The last entry: “Moon full. She came down as far as the hatch tonight and looked at the stair a long while. I have locked myself up here.” Nothing after that.', 1.3, 11000),
    // ---- the bogong cave ----
    { zone: 'room', pos: W(EXTRA.caveEntry), r: 1.0, when: () => !seen.cave, prompt: 'E  look into the cave',
      act: () => { seen.cave = true; say('Behind the broken wall the stone gives way to living rock: a cave, and its walls are moving. Moths, thousands of them, asleep in the cold, the way the bogong moths sleep out the summer in their caves.', 8000); } },
    look('wall', EXTRA.caveWall, 'E  look at the moths', 'The rock is not rock. It is moths, overlapping like roof slates, brown and still, thousands deep. When your light touches them a shiver runs across the whole wall, and settles.'),
    look('camp', EXTRA.caveCamp, 'E  look at the camp', 'A blanket, a tin cup, a candle-lantern and a notebook full of tallies. Someone came down here to sleep among the moths. Beside the blanket, a heap of empty wings: he ate them, as people once ate the bogongs, to be closer to them. The last page: “They do not mind me now. When I lie still they cover me too.”', 1.4, 11000),
    // ---- the burial niches ----
    look('niches', EXTRA.niches, 'E  read the slabs', 'Every niche is closed with a slab and every slab has a name: Ambrose Fell, Harriet Cole, Tobias Marsh… and under each name the same two words, TAKEN UP. A few of the slabs have been pushed out from the inside.', 1.4),
    look('bier', EXTRA.bier, 'E  look at the bier', 'A body on the bier, wrapped in silk and laid out with dried honeysuckle, as if for a funeral that was never finished. The silk over the face has been opened, and carefully closed again.', 1.2),
    look('photo', EXTRA.photo, 'E  look at the photograph', 'A photograph propped in front of a slab: a woman and a small girl on the front steps of this house, squinting into the sun. On the back: “Constance and Luna, June 1880.” The slab behind it is one of the open ones.', 1.1),
  ];
  return { interactables, reset() { for (const k of Object.keys(seen)) delete seen[k]; } };
}
