# 所羅門攻略戰 · Battle of Solomon · U.C. 0079

**Live:** https://icomppower.github.io/gundam0079solomon/

A fan visit, not a game. You stand on the bridge of an original Federation cruiser,
**蒼鷺號 Grey Heron**, and watch the attack on Solomon happen outside the window:
10 acts, about 3½ minutes, bilingual (繁中 / English).

Part 2 of the Narrated History Map · Gundam U.C. 0079 trilogy
(Part 1: Odessa · Part 3: A Baoa Qu, to come).

## v2 (October 2026): the bridge rebuild

v1 (preserved on branch [`v1`](../../tree/v1)) was a free-camera diorama made from Three.js primitives.
Space has no ground to give scale, so everything floated in black at the wrong size.
v2 fixes that with five rules:

1. **A place to stand.** The camera never leaves the bridge. The window frames are the composition.
2. **One hero object.** Solomon is a sculpted ~2.4 km Blender asteroid with horns, craters and surface structures. Earth and the Moon sit far behind it.
3. **Light tells the story.** Distant fights are small flashes; near hits light up the bridge; the Solar System whites it out.
4. **Small motion for scale.** Debris drifts past, companion ships hold formation, fleets close in.
5. **Story from inside.** Bridge comms, act cards and narration carry the script.

## Two views

- **艦橋 Bridge** (default): first person, standing on Grey Heron's bridge.
- **追蹤 Chase** (v2.1): third person, camera locked behind and above Grey Heron. The hull is the
  scale anchor; near hits and the Solar System light the hull instead of the bridge, and our own
  turrets fire. Same timeline, so switching never changes what happens.

## Controls

Drag to look around (orbit the ship in chase view) · double-click to recentre · `C` switch view ·
`Space` pause · `←` `→` previous/next act · `H` hide HUD · `M` sound. The timeline scrubs.
URL options: `?autostart` skips the title screen, `?t=95` jumps to 1:35, `?view=chase` opens in chase view.

## Layout

```
index.html                 page shell, HUD, title and end cards
src/acts.js                the 10 acts: ship path, comms, narration, canon tags, timing
src/main.js                runtime: space + bridge scenes, effects, act directors, audio, controls
assets/*.glb               Blender-built models (fortress, bridge, ships, hero ship) with baked AO
assets/hero.json           Grey Heron gun tips, engines and lights (for the chase view)
assets/fortress_lights.json  surface beacon positions
tools/blender/build_assets.py  regenerates every asset from a fixed seed
lib/three/                 vendored Three.js r160 (no CDN at runtime)
```

## Rebuilding the assets

```
pip install bpy           # Blender as a Python module (5.x)
python3 tools/blender/build_assets.py              # all
python3 tools/blender/build_assets.py -- fortress  # just one
```

Deterministic: same seed, same models. AO is baked with Cycles into vertex colours,
so the runtime needs no textures.

## Canon notes

Acts are tagged `CANON`, `VARIANT` or `SUPP` (see the Notion Canon & Accuracy page).
Act 8 (Elmeth) is `VARIANT`: the duel happened after Solomon fell, and is compressed into this
timeline. The narration says so on screen.

## Serving locally

Any static server, e.g. `python3 -m http.server`, then open `http://localhost:8000`.
ES modules need http(s); opening the file directly won't work.

Built by Johnny Lai · icomppower. Fan work. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
