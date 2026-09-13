Solar Quest

A 2D platformer built with Phaser 3: three levels, each with its own mechanics, unlocked as you clear them.

▶ Play it in your browser — no install, no build step.

Built during a 3-day game jam at EPF, in a team of 4, on the theme space.

The three levels

Each level is a separate scene with its own map, tileset and rules, rather than a reskin of the same code.

1 — Meteor run. A parallax-scrolling surface level with a checkpoint system and five lives. Hazards are identified by tile ID straight from the Tiled map: water, lava and spikes each get their own set of GIDs, so level design and collision logic stay in sync without hardcoding positions.

2 — Gravity. A timed Mars level where levers flip the direction of gravity. Sixty seconds, stars to collect, and a physics state that the player alters mid-run.

3 — Boss. A larger arena (2560 × 1280) with heavier gravity, an alien that shoots back, projectiles on both sides, and a lava layer using per-tile properties from Tiled.

Progression

Levels unlock in order. The level-select screen reads the furthest level reached from sessionStorage and locks the rest behind a badge — so progress survives a scene change or a reload within the session.

Built with
	
Engine	Phaser 3.60 (loaded from CDN)
Level design	Tiled — three separate maps
Structure	ES6 modules, one class per scene
Audio	Checkpoint and meteor sound effects

Around 1,800 lines of JavaScript across five scenes. No build step and no dependency to install: index.html pulls Phaser from a CDN and loads src/index.js, which registers every scene.

Running it locally

ES6 modules will not load over file://, so the folder has to be served over HTTP:

bash
python -m http.server 8000

Then open http://localhost:8000.

Structure
├── index.html              # entry point, loads Phaser from CDN
└── src/
    ├── index.js            # game config, scene registration
    ├── js/
    │   ├── menu.js         # title screen
    │   ├── levelSelect.js  # level picker, unlock state
    │   ├── niveau1.js      # meteor run, checkpoints
    │   ├── niveau2.js      # gravity levers, timer
    │   └── niveau3.js      # boss arena
    └── assets/             # sprites, tilesets, Tiled maps, audio
Known limitations
Scene classes and in-game text are in French, a leftover from the jam.
Progress is kept in sessionStorage, so it resets when the tab is closed. localStorage would persist it properly.
Assets are unoptimised and several unused files from earlier iterations are still in assets/.

Emir Budak — engineering student at EPF, Montpellier campus.
