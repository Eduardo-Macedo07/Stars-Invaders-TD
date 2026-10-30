# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Defensores da Nave-Mãe" is a sci-fi tower defense game, in the style of Bloons TD. Invaders follow a fixed path from a portal to the mother ship, and the player places **characters** (not towers) to stop them.

It is plain JavaScript with Canvas 2D, with no build step, no dependencies and no package.json. It is published as static files (GitHub Pages).

All user-facing text, code comments, the README and commit messages are in **Portuguese (pt-BR)**.

## Running and testing

- **Run:** open `index.html` directly. The scripts are classic `<script>` tags, not ES modules, so `file://` works. Alternatively, serve the folder with `python3 -m http.server`.
- **No tooling:** there is no linter, test suite or build.
- **Quick syntax check:**
  ```
  node --check js/game.js && node --check js/art.js && node --check js/data.js && node --check js/sprites.js
  ```
- **Browser testing:** use headless Playwright, which is available globally. Run scripts with `NODE_PATH=$(npm root -g) node script.js`, and keep test scripts and screenshots out of the repo.
- **Test hooks:** `game.js` exposes `window.__ndm`, with these members:
  - `G`, the current match state;
  - `step(dt)`, which advances the simulation without rendering and is used for fast whole-game balance simulations;
  - `newGame(mapIndex, dif)` (`dif` is `'facil'`, `'normal'` or `'dificil'`), `startWave()`, `placeUnit(type, x, y)`, `buyTier(unit, pathIndex)`, `nextTier`, `useAbility(heroType)`, `sell`, `selectUnit`, `canPlace`.
- **Viewports:** check both a desktop size (e.g. 1366x768) and a landscape phone size (e.g. 844x390). The layout has a `@media (max-height: 500px)` mode for phones.

## Architecture

The scripts load in this order (`index.html`) and share globals: `js/audio.js` → `js/data.js` → `assets/sprites/lista.js` → `js/sprites.js` → `js/art.js` → `js/game.js`.

- **`js/data.js`:** pure data plus `buildWave` and `describeFx`. Balancing happens here.
  - **World:** fixed at `WORLD_W`×`WORLD_H` (1280×720). Everything in the game uses world coordinates. `game.js` scales and letterboxes the world into the area left of the shop column and below the top bar (`resize()`, `view`).
  - **`MAPS`:** each map has a `theme` (selects the background painter and path style in `Art.buildBackground`) and `rotas: {facil, normal, dificil}`. A route is a **list of paths** (several entrances); each path is a list of **control points**: at load, `suavizar()` turns them into a smooth Catmull-Rom curve sampled every ~14 units, so `rotas` hold the dense polylines everything else uses (`posAt` binary-searches the segments). Merging entrances should share a tail of control points well before the ship (placement is blocked within 100 units of it), or the merge can't be defended. The first waypoint of a path is its portal (it may sit off-screen; the portal is then drawn 70 units in) and all paths of a route must end at the same point, where the mother ship sits.
  - **`DIFICULDADES`:** per-difficulty enemy HP multiplier, starting money, lives and reward multiplier. `DIF_ORDER` is the display order.
  - **`PATH_LOOKS`:** the accessory each skill path draws (see `backAccessory`, `weaponAccessory` and `frontAccessory` in `art.js`); copied into `UNITS[type].paths[i].look`.
  - **`UNITS`:** the base stats, plus `costs[5]` and `paths[]`. Each path has 5 tiers of `{name, fx, d}`. `d` is optional hand-written text; otherwise `describeFx(fx)` generates the description. A unit with `hero: true` has an `ability` and a hotkey `key`, and only one of each hero type can be placed.
  - **`ENEMIES` and `buildWave(n, mapIndex, dif)`:** a wave returns `groups`, `hpMul` and `bossMul`. The boss uses its own slower HP scaling.
- **Skill tree rules** (`game.js`: `applyFx`, `nextTier`, `buyTier`, `renderUnitPanel`):
  - A unit has `path` (null until the first purchase) and `tier` (0–5).
  - Buying tier 1 of a path locks all other paths.
  - Tier 5 is the "SUPER" (soldiers) or "LENDÁRIO" (heroes) tier. `Art.unit` draws it larger, with an aura and a crown.
- **How `fx` keys combine:**
  - The keys are listed in the comment above `UNITS`. `applyFx` interprets them.
  - Most keys add.
  - `dmgMul` multiplies.
  - `rate` divides `cd` by `(1+v)`.
  - `slow`, `critMul`, `stunT`, `slowAura` and `explode` take the maximum.
  - `aura` sums its components.
  - `pulse` replaces any previous pulse.
  - `ab` modifies `unit.ab`, the hero's copy of its ability. Inside `ab`, `dmg` and `dps` multiply and the other fields add. The cooldown is clamped to `MIN_ABILITY_CD`.
- **Adding a new effect** means touching three places: `applyFx` and/or `makeUnit` defaults, the combat code in `game.js`, and `describeFx` in `data.js`.
- **Combat flow** (`game.js`): `update(dt)` runs the following steps in order:
  1. spawn queue (with several entrances, spawns alternate between `G.paths`; each enemy stores its path index `e.pi`);
  2. goo puddles;
  3. enemies (burn, stun and slow, movement along the path via `posAt`, leaking into the ship);
  4. aura buffs (`bDmg`/`bRate`);
  5. units (targeting picks the enemy furthest along its path, then `slowAura`, `pulse` and `fire`). Hero ability cooldowns only tick while `G.waveActive`; game speed works by calling `update` `G.speed` times per frame;
  6. projectiles;
  7. Plasma Rain strikes;
  8. fx and floating text;
  9. win/lose and end-of-wave checks.
- **Damage path:** every hit goes through `onHit(u, e)`, which applies crit, boss multiplier, slow, burn, shred, vuln, explode and stun, and then calls `damage(e, amount, pierce, src)`. `damage` handles armor, vulnerability and the 1-damage minimum, then calls `kill`, which handles rewards, `cash` and the explode chain. Continuous damage (burn, puddles) subtracts HP directly so it skips the 1-damage minimum.
- **Shot types:** `rail`, `zap` and `flame` resolve instantly. `plasma`, `laser`, `ice`, `rocket` and `goo` create projectiles. `line` makes `rail` and `flame` pierce in a line.
- **`js/art.js`:** the `Art` IIFE draws everything procedurally.
  - Backgrounds and the static paths are drawn once per match and cached (`buildBackground(map, idx, rota)`); decorations avoid the paths.
  - **Evolution looks:** `stageOf(tier)` maps tiers to stages e0–e3 (tiers 0, 1–2, 3–4, 5). `unitVector` changes size, armor colour, weapon scale, shoulder pads, crest, wings and halo by stage, plus the path accessory.
  - **Pixel mode** (default, toggled by `Art.setPixel`, saved as `save.pixel`): `unit` and `enemy` render `unitVector`/`enemyVector` into a small canvas (`PX` world units per pixel), threshold the alpha and posterize the colours, then cache the result per pose (16 angle buckets, 4 animation frames). Backgrounds are halved and upscaled without smoothing.
  - **User sprites** override the generated art when listed in `assets/sprites/lista.js` (see `assets/LEIA-ME-sprites.md` for names and frame layout). Lookup order: `unidade_<type>_<path-slug>_e<stage>`, then `unidade_<type>_e<stage>`, then `unidade_<type>_e0`. Enemies use `inimigo_<type>`; map backgrounds use `mapa_<id>`.
  - **No `toDataURL`:** loaded sprites taint canvases under `file://`, so shop and panel icons and map previews are canvases copied into `<canvas data-icon>` elements (`Art.fillIcons`), never data URLs.
  - `Art.glow` uses cached radial sprites with additive blending.
  - Shop and panel icons are rendered to data URLs (`unitIcon`).
  - A new unit type needs a weapon branch in `soldierBody`. The Gosma hero has its own `gosmaBody`.
- **`js/audio.js`:** the `Sound` IIFE uses Web Audio for procedural SFX and music, so there are no audio files.
  - `Sound.unlock()` must be called after a user gesture.
  - `Sound.play(name)` only accepts the names defined there. Unknown names are ignored, which is why `game.js` maps new shot types onto existing sounds.
- **UI:** the HUD and menus are DOM overlays defined in `index.html`. `showOnly(id)` switches between overlays. The unit panel is re-rendered only when `panelSig(u)` changes, which avoids swallowing clicks.
- **Saving:** progress lives in `localStorage` under the key `ndm_save_v2`, with the shape `{unlocked, best: {mapId: {dif: {won, wave, lives}}}, pixel}`. An old `ndm_save_v1` save is migrated into the `normal` difficulty.

## Conventions

- **Cache-busting:** after changing JS or CSS, bump the `?v=` query strings in `index.html`, all to the same number.
- **Visual style:** minimalist yellow (`--sw: #ffe81f`) and black, thin 1px lines, square corners, no drop shadows. Fonts: Barlow Condensed (uppercase with letter-spacing) for text and Share Tech Mono for numbers; canvas text uses the same fonts.
- **Balance check:** after balance changes, simulate full 20-wave runs on every map and difficulty using the `__ndm.step` hook with a simple bot. Target: a naive bot wins Fácil comfortably and Normal on the early maps with damage (boss waves 10, 15 and 20 hurt), while Difícil is tight.
- **New routes:** check that every path stays inside the world, leaves room to place units, and that previews look right (render `Art.mapPreview(map, i, dif)` for all maps in a grid).
