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
| H | Hint for the current puzzle (each more direct; also in the pause menu) |
| B | Torch burst: a blinding flash that costs battery and drives The Mother back for a moment |
| Q | Close a drawer while holding a specimen |
| K | Photo mode (also in the pause menu): the game freezes and the camera floats within a short reach of you, never through walls. Drag to look, WASD and R/F to move, adjust field of view, exposure, sepia / black and white, grain, vignette and hide-HUD, then save a PNG. V hides the panel, Esc returns to the game. |
| Esc / P | Pause menu (or the II button, top right) |

Settings also has **Graphics quality** (Low / Medium / High, default High). High renders at up to 2x pixel ratio with 2048px textures, generated normal/roughness maps and 4096px soft shadows; use Medium or Low on weaker computers. Changing it reloads the game.

The way in: climb the fence at the stone block left of the gate, then find the smashed ground-floor window with the crate under it, right of the front door.

Inside the first room the east door is stuck fast. Light the oil lamp and study the moth mosaic above the fireplace: in lamplight, five small moths show in the tiles of its lower border. Take boxed specimens from the cabinet drawers (E), one at a time, and set them on the five numbered stands (I to V) around the room in the mosaic's left-to-right order. Two specimens are decoys. A wrong order only rattles the frames, and you can pick specimens back up and rearrange them. The right order opens a hidden panel in the east wall onto the hallway, and the game saves there.

Beyond the hallway, the ground floor follows the blueprint route: the **Specimen Study** (read the leader's journal on the desk, then rehang the five cases on the board by adult lifespan, shortest first, to unbolt the hallway's end door), the **Grand Hall** (the main stair is buried under a collapsed landing, a round stained-glass moth window over the boarded front doors throws coloured light onto a moth-eaten carpet, the front doors are boarded), the **Dining Room**, the **Servants' Passage** and the **Kitchen**, where the cellar stair is padlocked. In the Dining Room, six moth specimens must be seated at the dinner table as the seating note in the kitchen describes; plates rattle when the seating is right, and the digits painted under the plates open the four-dial padlock on the cellar stair (the game saves when it opens) and the back stair is nailed shut. Two old mirrors, one in the hallway and one in the Grand Hall, show your reflection a little more moth-like each time. The game saves on solving the study and on entering the Grand Hall.

Down the cellar stairs: the **Wine Cellar** (a mirror, and the barred shaft of the old back stair), the **Boiler Room** (a page of the Order's catechism and a wardrobe full of clothes moths), the **Egg Room** and the **Ritual Chapel** (another mirror; the steps on down are behind a locked grille). The chapel altar has four carved stones: press them in the order of the clothes moth's life, as the verse inside the wardrobe tells it. That lifts the grille over the steps down to the catacombs and unbolts a shortcut from the Egg Room to the Wine Cellar. The back stair's gate in the wine cellar stays rusted shut.

Down the chapel steps, the **Catacombs** (the game saves at the foot of the steps, the floor's one spawn point): the **Bone Gallery** (walls of stacked bones and skulls, a lantern, and a bricked-up tunnel behind a chained iron door), the **Ossuary** (four bays of numbered skull niches, and a four-figure lock on the gate south), the **Flooded Crypt** (coffins afloat in black water, each lid carved with the same cross; not every lid will hold you), the **Tomb Hall** (a tomb door sealed with wax, a living cocoon pressed into the seal; it is too cold to wake), the **Apothecary** (thirty little skull-carved drawers, some of them with spring needles, a half-burnt pharmacist's ledger, a dead rat, and an iron cabinet with six keyholes) and, behind it, the foot of the **back stair**, the only way up to the first floor. The first needle poisons you (blurred vision, thicker air, a racing heartbeat, wearing off over a few minutes); a second one kills you, and the game goes back to your last save. Cocoons on the walls twitch now and then, and their silk splits a little.

Up the back stair from the catacombs, the **First Floor**: the **Cocoon Room** (silk frames, wrapped shapes on trestles, a silkworm moth in a jar), the **Nursery**, the gallery over the Grand Hall (the main stair's head is buried in rubble), the **Library** (a peppered moth pinned on a naturalist's card), the **Luna Bedroom** (a countdown scratched into the wall, and a vanity mirror), the **Leader's Bedroom** (a four-poster and a desk with a four-figure letter-lock: the peppered moth's card and the wall between them give the code) and the **Linen Room** behind it (a mirror, and a ladder up to a padlocked hatch). Each floor has a lantern to find, and hints (H) for its puzzle. The game saves on reaching each floor and on solving each puzzle.

Progress is saved automatically at save points (climbing the fence, entering the first room, unlocking the east door), and settings
(mouse sensitivity, volume, brightness, field of view) are kept in `localStorage`. There are five named save
slots: **Continue** on the home screen resumes the most recent one, **Load** picks a slot (each shows its
name, floor and room, moths found, time played and date, with Rename and Delete), and **New Game** starts in an
empty slot or overwrites one after you confirm. Save points write to the slot you are playing. An old single
save is moved into slot 1.

## Moths and the Moth Journal

The story is carried by moths, not paper. Twenty-three specimens, each a different species (four of them in the catacombs), are pinned in boxes, sealed in jars or resting on the walls of every built room. Pick one up (E) to read its message; it goes into the **Moth Journal** (pause menu or home screen), which shows every moth collected with its picture, name and message, and writes out the story in plain words, one passage per moth, in the order you find them. Two of them carry puzzle clues: the Herald above the boiler (the altar) and the Peppered moth in the library (the desk). The journal is kept in the save.

## Multiplayer

Explore the house together, peer to peer. There is no game server: the **host's browser is the server**, and everyone else connects to the host over WebRTC.

- **Host:** home screen -> **Multiplayer** -> **Host a game…**, then pick a save slot to host from (or an empty slot for a new game). The game starts and the HUD shows a five-character **room code**; share it with your friends. The host's progress saves to the slot they chose.
- **Join:** home screen -> **Multiplayer**, type the code, **Join**. You appear next to the host. A guest's progress lives in the host's game; joining never touches your own save.
- **No code / signaling down:** open *No code? Connect by copy-paste*. The host opens the pause menu -> *Invite a player by copy-paste* -> **Make an invite** and sends the text to the player (any chat app); the player pastes it, presses **Make my reply** and sends the reply back; the host pastes it and presses **Connect**. One invite per player. If the signaling server is unreachable, the host can start with **Host with copy-paste invites only**.

Room codes use the free public [PeerJS](https://peerjs.com/) cloud broker only to introduce the browsers; game data, chat and voice then go directly between players (STUN only, no TURN relay, so a few strict corporate or mobile networks may not connect). To use your own PeerJS server, add `?peer=host:port` to the game URL.

What is shared: player positions, facing, crouch and torch (other players appear as a plain teenager in a hoodie with their name over their head, and you see their torch beam); puzzles, doors, the drawing-room lamp, moths and pickups. The host owns the world: anything a guest solves or opens is merged into the host's world and sent to everyone. Moths are shared: when anyone takes one it goes into everybody's Moth Journal. Pausing in multiplayer only opens your menu; the house carries on around you.

| Key | Action |
| --- | --- |
| T or Enter | Text chat (Enter sends, Esc closes) |
| V (hold) | Push to talk, when enabled |
| M | Mute or unmute your microphone |

**Voice chat:** pause menu -> **Join voice**. The browser asks for the microphone only then. Options there: mute, push to talk (hold V), and *Voices fade with distance* (proximity voice: close voices are clear, distant ones thin to a whisper, and through the house's walls into another zone you barely hear them). The host forwards each voice to the other players. On iPhone and iPad Safari the per-voice volume cannot be changed by the page, so proximity fading does not apply there.

Not shared (yet): half-finished puzzle moves (specimens in hand, partly rearranged cases or seats; only the solved result is shared) and the hint counter. Mirrors show only your own reflection.

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
- `src/net/` - multiplayer: `link.js` (PeerJS and copy-paste WebRTC links), `multiplayer.js` (host/guest session, world merge, chat, UI), `voice.js` (voice peer connections and playback), `remotes.js` (other players' avatars), `net.css`

## Sound and music

All sound is generated live with the Web Audio API (`src/audio/`); there are no sound files and no third-party recordings, so nothing needs crediting. Audio starts on the first click or key press (browsers require a user gesture) and works in Chrome, Firefox and Safari (`webkitAudioContext` and the older `PannerNode.setPosition` API are handled).

- **Home screen:** a slow, slightly out-of-tune music-box theme whose spring sags and recovers (`music.js`). In game a faint low drone stays on the music bus.
- **Ambience per floor** (`ambience.js`): wind at the windows (strongest outside and in the attic), house creaks, dripping water with stone echoes in the cellar and catacombs, rafters groaning in the attic, and distant fluttering, each placed around you in 3D.
- **Footsteps** (`footsteps.js`): grass outside, wood floors, creaky attic boards, stone in the cellar and catacombs, splashing in the flooded crypt; quieter and softer crouched, heavier when sprinting, a thump on landing.
- **Interactions** (`sfx.js`): doors, drawers, padlock dial clicks, a stinger on every puzzle solve, a chime when a moth is taken, the oil lamp, the lantern and the torch switch.
- **The Mother** (`mother.js`): her clicks, wing flutters and a rasping breath come from her position through a `PannerNode` (HRTF); your heartbeat rises from about 60 to 150 bpm as she gets within 14 m, and harder in a chase.
- **Settings:** Master, Music, Effects and Voice-chat volume sliders, saved with the other settings.

All game audio stops with the game clock (pause menu, hidden tab) by suspending the audio context.

## The Collection

**Collection** on the home screen opens a glass-fronted specimen cabinet with a drawer for every moth in the game. Moths you have ever picked up, in any save slot (kept even if the save is deleted), are pinned with a handwritten label; the rest are an empty pin over a faint outline. Click a drawer to read its journal entry.
