# Pinned

A first-person horror game set in the abandoned mansion of the Order of the Pale Wing, a Victorian moth cult.
You play a teenager who loves moths and exploring abandoned places.

Plain HTML + JavaScript, Three.js loaded from a CDN via an import map. No build step and no asset files:
all geometry and textures are generated in code.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look (click the game to capture the mouse) |
| W A S D / arrows | Move |
| Shift (hold) | Sprint |
| C or Left Ctrl (hold) | Crouch: slower, quieter, lets you pass under low obstacles and hide. You stay down while something is overhead. Settings can make it a toggle. Careful: Ctrl+W closes the browser tab, so prefer C while moving forward. |
| Space | Jump |
| E | Interact (climb, try doors, examine) |
| F | Flashlight (battery runs down; batteries can be found) |
| L | Raise or lower a paraffin lantern once you have found one (it shares the torch hand; its light draws moths) |
| H | Hint for the current puzzle (each more direct; three per pair of rooms, then you're on your own; also in the pause menu) |
| Q | Close a drawer while holding a specimen |
| Esc / P | Pause menu (or the II button, top right) |

Settings also has **Graphics quality** (Low / Medium / High, default High). High renders at up to 2x pixel ratio with 2048px textures, generated normal/roughness maps and 4096px soft shadows; use Medium or Low on weaker computers. Changing it reloads the game.

The way in: climb the fence at the stone block left of the gate, then find the smashed ground-floor window with the crate under it, right of the front door.

Inside the first room the east door is stuck fast. Light the oil lamp and study the moth mosaic above the fireplace: in lamplight, five small moths show in the tiles of its lower border. Take boxed specimens from the cabinet drawers (E), one at a time, and set them on the five numbered stands (I to V) around the room in the mosaic's left-to-right order. Two specimens are decoys. A wrong order only rattles the frames, and you can pick specimens back up and rearrange them. The right order opens a hidden panel in the east wall onto the hallway, and the game saves there.

Beyond the hallway, the ground floor follows the blueprint route: the **Specimen Study** (read the leader's journal on the desk, then rehang the five cases on the board by adult lifespan, shortest first, to unbolt the hallway's end door), the **Grand Hall** (the main stair is buried under a collapsed landing, a round stained-glass moth window over the boarded front doors throws coloured light onto a moth-eaten carpet, the front doors are boarded), the **Dining Room**, the **Servants' Passage** and the **Kitchen**, where the cellar stair is padlocked. In the Dining Room, six moth specimens must be seated at the dinner table as the seating note in the kitchen describes; plates rattle when the seating is right, and the digits painted under the plates open the four-dial padlock on the cellar stair (the game saves when it opens) and the back stair is nailed shut. Two old mirrors, one in the hallway and one in the Grand Hall, show your reflection a little more moth-like each time. The game saves on solving the study and on entering the Grand Hall.

Down the cellar stairs: the **Wine Cellar** (a mirror, and the barred shaft of the old back stair), the **Boiler Room** (a page of the Order's catechism and a wardrobe full of clothes moths), the **Egg Room** and the **Ritual Chapel** (another mirror; the steps on down are behind a locked grille). The chapel altar has four carved stones: press them in the order of the clothes moth's life, as the verse inside the wardrobe tells it. That lifts the grille over the steps down to the catacombs and unbolts a shortcut from the Egg Room to the Wine Cellar. The back stair's gate in the wine cellar stays rusted shut.

Down the chapel steps, the **Catacombs** (the game saves at the foot of the steps, the floor's one spawn point): the **Bone Gallery** (walls of stacked bones and skulls, a lantern, and a bricked-up tunnel behind a chained iron door), the **Ossuary** (four bays of numbered skull niches, and a four-figure lock on the gate south), the **Flooded Crypt** (coffins afloat in black water, each lid carved with the same cross; not every lid will hold you), the **Tomb Hall** (a tomb door sealed with wax, a living cocoon pressed into the seal; it is too cold to wake), the **Apothecary** (thirty little skull-carved drawers, some of them with spring needles, a half-burnt pharmacist's ledger, a dead rat, and an iron cabinet with six keyholes) and, behind it, the foot of the **back stair**, the only way up to the first floor. The first needle poisons you (blurred vision, thicker air, a racing heartbeat, wearing off over a few minutes); a second one kills you, and the game goes back to your last save. Cocoons on the walls twitch now and then, and their silk splits a little.

Up the back stair from the catacombs, the **First Floor**: the **Cocoon Room** (silk frames, wrapped shapes on trestles, a silkworm moth in a jar), the **Nursery**, the gallery over the Grand Hall (the main stair's head is buried in rubble), the **Library** (a peppered moth pinned on a naturalist's card), the **Luna Bedroom** (a countdown scratched into the wall, and a vanity mirror), the **Leader's Bedroom** (a four-poster and a desk with a four-figure letter-lock: the peppered moth's card and the wall between them give the code) and the **Linen Room** behind it (a mirror, and a ladder up to a padlocked hatch). Each floor has a lantern to find, and hints (H) for its puzzle. The game saves on reaching each floor and on solving each puzzle.

Progress is saved automatically at save points (climbing the fence, entering the first room, unlocking the east door), and settings
(mouse sensitivity, volume, brightness, field of view) are kept in `localStorage`. **Continue** on the home
screen resumes from the last save point.

## Moths and the Moth Journal

The story is carried by moths, not paper. Twenty-three specimens, each a different species (four of them in the catacombs), are pinned in boxes, sealed in jars or resting on the walls of every built room. Pick one up (E) to read its message; it goes into the **Moth Journal** (pause menu or home screen), which shows every moth collected with its picture, name and message, and writes out the story in plain words, one passage per moth, in the order you find them. Two of them carry puzzle clues: the Herald above the boiler (the altar) and the Peppered moth in the library (the desk). The journal is kept in the save.

## Run it locally

ES modules need to be served over HTTP (opening `index.html` as a file will not work):

```sh
git clone https://github.com/PetraDavis/Pinned.git
cd Pinned
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, etc.). An internet connection is needed to load Three.js from jsDelivr.

## Play it in the browser with GitHub Pages

1. On GitHub open the repo, then **Settings -> Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Choose branch `main` and folder `/ (root)`, then **Save**.
4. After a minute the game is live at `https://petradavis.github.io/Pinned/`.

## Code layout

- `index.html`, `style.css` - page, menus, HUD
- `src/main.js` - renderer, game states, menus, interactions, save points
- `src/player.js` - first-person controller and collision
- `src/world/exterior.js` - mansion, iron fence, grounds, sky
- `src/world/firstRoom.js` - the drawing room behind the broken window, its oil lamp and door
- `src/world/groundFloor.js` - study and lifespan board, grand hall, dining room, passage, kitchen, mirrors
- `src/flashlight.js` - held torch, battery, beam, dust and moths
- `src/world/drawerPuzzle.js` - specimen cabinet, numbered stands, sequence puzzle and the hallway
- `src/world/lowerUpper.js` - the cellar and the first floor
- `src/world/catacombs.js` - the catacombs: bone walls, ossuary, flooded crypt, tomb, apothecary, back stair B, the sealed tunnel (`CATA.tunnel`, collider `catTunnel`, kept for the ending)
- `src/catacombsPlay.js` - the catacombs in play: interactions, puzzles, poison (`detectScale`, `onPoison` hooks for later), hints and save state
- `src/catacombMoths.js` - the catacombs' moth species, moth notes and story passages
- `src/world/cocoon.js` - spun silk cocoons, shared by every floor
- `src/moths.js` - species-accurate moth specimens (wing shapes, patterns, bodies, labels)
- `src/textures.js` - canvas-generated textures, including the moth mosaics
- `src/homeScreen.js` - animated home screen (the pinned moth)
- `src/audio.js` - Web Audio wind and creaks
- `src/storage.js` - settings and save data
