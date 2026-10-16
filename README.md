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
| H | Hint for the current puzzle (up to three, each more direct; also in the pause menu) |
| Q | Close a drawer while holding a specimen |
| Esc / P | Pause menu (or the II button, top right) |

Settings also has **Graphics quality** (Low / Medium / High, default High). High renders at up to 2x pixel ratio with 2048px textures, generated normal/roughness maps and 4096px soft shadows; use Medium or Low on weaker computers. Changing it reloads the game.

The way in: climb the fence at the stone block left of the gate, then find the smashed ground-floor window with the crate under it, right of the front door.

Inside the first room the east door is stuck fast. Light the oil lamp and study the moth mosaic above the fireplace: in lamplight, five small moths show in the tiles of its lower border. Take boxed specimens from the cabinet drawers (E), one at a time, and set them on the five numbered stands (I to V) around the room in the mosaic's left-to-right order. Two specimens are decoys. A wrong order only rattles the frames, and you can pick specimens back up and rearrange them. The right order opens a hidden panel in the east wall onto the hallway, and the game saves there.

Beyond the hallway, the ground floor follows the blueprint route: the **Specimen Study** (read the leader's journal on the desk, then rehang the five cases on the board by adult lifespan, shortest first, to unbolt the hallway's end door), the **Grand Hall** (the main stair is buried under a collapsed landing, a round stained-glass moth window over the boarded front doors throws coloured light onto a moth-eaten carpet, the front doors are boarded), the **Dining Room**, the **Servants' Passage** and the **Kitchen**, where the cellar stair is padlocked. In the Dining Room, six moth specimens must be seated at the dinner table as the seating note in the kitchen describes; plates rattle when the seating is right, and the digits painted under the plates open the four-dial padlock on the cellar stair (the game saves when it opens) and the back stair is nailed shut. Two old mirrors, one in the hallway and one in the Grand Hall, show your reflection a little more moth-like each time. The game saves on solving the study and on entering the Grand Hall.

Down the cellar stairs: the **Wine Cellar** (a mirror, and the barred shaft of the old back stair), the **Boiler Room** (a page of the Order's catechism and a wardrobe full of clothes moths), the **Egg Room** and the **Ritual Chapel** (another mirror; the steps on down are behind a locked grille for now). The chapel altar has four carved stones: press them in the order of the clothes moth's life, as the verse inside the wardrobe tells it. That lifts the gate on the back stair and unbolts a shortcut from the Egg Room to the Wine Cellar. (Temporary: the planned route is cellar, down to the catacombs, then up the back stair; until the catacombs exist, the altar opens the back stair directly.)

Up the back stair, the **First Floor**: the **Cocoon Room** (silk frames, wrapped shapes on trestles, a note about silkworms), the **Nursery**, the gallery over the Grand Hall (the main stair's head is buried in rubble), the **Library** (a card about the peppered moth), the **Luna Bedroom** (a countdown scratched into the wall, and a vanity mirror), the **Leader's Bedroom** (a four-poster and a desk with a four-figure letter-lock: the card and the wall between them give the code) and the **Linen Room** behind it (a mirror, and a ladder up to a padlocked hatch). Each floor has a lantern to find, and hints (H) for its puzzle. The game saves on reaching each floor and on solving each puzzle.

Progress is saved automatically at save points (climbing the fence, entering the first room, unlocking the east door), and settings
(mouse sensitivity, volume, brightness, field of view) are kept in `localStorage`. **Continue** on the home
screen resumes from the last save point.

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
- `src/moths.js` - species-accurate moth specimens (wing shapes, patterns, bodies, labels)
- `src/textures.js` - canvas-generated textures, including the moth mosaics
- `src/homeScreen.js` - animated home screen (the pinned moth)
- `src/audio.js` - Web Audio wind and creaks
- `src/storage.js` - settings and save data
