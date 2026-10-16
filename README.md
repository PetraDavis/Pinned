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
| Space | Jump |
| E | Interact (climb, try doors, examine) |
| F | Flashlight (battery runs down; batteries can be found) |
| Q | Close a drawer while holding a specimen |
| Esc / P | Pause menu (or the II button, top right) |

Settings also has **Graphics quality** (Low / Medium / High, default High). High renders at up to 2x pixel ratio with 2048px textures, generated normal/roughness maps and 4096px soft shadows; use Medium or Low on weaker computers. Changing it reloads the game.

The way in: climb the fence at the stone block left of the gate, then find the smashed ground-floor window with the crate under it, right of the front door.

Inside the first room the east door is stuck fast. Light the oil lamp and study the moth mosaic above the fireplace: in lamplight, five small moths show in the tiles of its lower border. Take boxed specimens from the cabinet drawers (E), one at a time, and set them on the five numbered stands (I to V) around the room in the mosaic's left-to-right order. Two specimens are decoys. A wrong order only rattles the frames, and you can pick specimens back up and rearrange them. The right order opens a hidden panel in the east wall onto the hallway, and the game saves there.

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
- `src/world/drawerPuzzle.js` - specimen cabinet, numbered stands, sequence puzzle and the hallway
- `src/moths.js` - species-accurate moth specimens (wing shapes, patterns, bodies, labels)
- `src/textures.js` - canvas-generated textures, including the moth mosaics
- `src/homeScreen.js` - animated home screen (the pinned moth)
- `src/audio.js` - Web Audio wind and creaks
- `src/storage.js` - settings and save data
