# Working agreement: the Zeus remake

Read `docs/vision/VISION.md` first. When anything disagrees with it, the vision wins. This project is built with the playable-slices process: vision, then phases cut into slices, each ending in something Oliver can try.

## Where things live

- `docs/vision/VISION.md`: the north star.
- `docs/specs/YYYY-MM-DD-<phase-name>-design.md`: one spec per phase.
- `docs/plans/YYYY-MM-DD-slice-<N>-<slice-name>.md`: one plan per slice, numbered across the whole project.
- `docs/CHECKINS.md`: notes to Oliver, newest first, one per slice plus a summary per phase.
- The code lives on GitHub at `ingenatic-arch/zeus` (branch `main`). Push after every commit. A mirror (code, docs and `.git` history, without `node_modules/` or `dist/`) is also copied to the shared project folder `/mnt/project-files/zeus/` with `scripts/sync-to-shared.sh` so other threads can read it; never edit files there directly.

## Run mode

**Run the whole phase, then hand over** (Oliver's choice, 15 Oct). Oliver can step in at any time, and anything he says takes priority over the plan.

## Principles that follow from the vision

- **The city comes first.** Every system beyond the walls (rulers, market, war, gods) must show up as something that changes in the city. If a feature only lives in a menu, it isn't done.
- **Readable depth.** Deep systems underneath, but you can always see where you stand and why: a ruler's mood names its reasons, a house says what it's missing, a price shows what moved it.
- **Pressure you can see coming.** Threats are telegraphed before they land, and setbacks are recoverable.
- **Build at the level of detail Oliver can perceive.** Make it real where he'll look (the streets, the walkers, the houses) and cheap where he won't.
- **Judge by looking.** For anything visual, run it in the browser, take screenshots and tune by eye before calling a slice done.
- **Never claim it feels right on Oliver's behalf.** Say what was checked, and ask him to judge.

## Technical conventions (defaults, Oliver can change any)

- TypeScript, Vite and three.js; runs in a modern desktop browser from a link.
- The simulation is separate from rendering: a fixed-tick, deterministic simulation (seeded random numbers, no `Math.random` or wall-clock time in sim code) that the renderer reads from. This keeps pause, speed controls, saves and later desktop packaging simple.
- All art is generated in code (low-poly meshes, procedural textures and palettes); no external art assets unless Oliver asks.
- Saves are plain serialised simulation state, versioned, so old saves either load or fail with a clear message.
- Every slice leaves the game playable, with a demo link (for example a URL parameter) that drops Oliver straight into the new thing.
- Demo links are bare hash tokens like `#streets`, because the published page only receives the hash.

## Budgets (targets, tuned by eye and revisited each phase)

- 60 fps on a mid-range laptop at 1080p with a city of a few hundred buildings and a few hundred walkers.
- First load under 3 seconds on a normal connection.

## Tests

Tests are written only where they earn their keep: simulation determinism (same seed and inputs give the same city), save and load, pathfinding and walker routing correctness, and the budgets. No test ceremony for visuals; those are judged by looking.
