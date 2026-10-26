# Slice 52 — A city in order

*26 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The phase's last slice, built on the trunk (`claude/project-thread-2jx118`, also `main`) after all three lines merged. It starts at `0f9dc87` (state version 47).*

## Goal and check-in

The spec's words: `#order`, a prepared town on a generated medium river delta, with gangs and a court, a plague threatened, colonies grown, store rules set and a full message history; numbers tuned across a few years of play; a look pass bringing every new panel onto the kit; the budgets on a large land; any leftovers.

This slice adds no new system. It puts everything the phase built into one town on one of slice 46's generated lands, plays it and `#town` forward for years to find the numbers that are plainly off, brings the panels slice 50 left behind onto the kit, measures a large wooded land and the new town against the budgets, and closes what it can of the findings carried over.

**Oliver can:** open `#order` and play it for a few years, then judge whether the new systems and panels make the city easier to read and more alive.

**Demo links** (bare hash tokens):

- `#order`: a town founded on a generated medium river delta (the word "order", edition 2) and built up over about six years as a player would: streets of houses up to villas, the watch and the architects, a hut street by the road in where a gang has its den, a court and a prison with the law set and men inside, an infirmary with its physicians out, two colonies (Arcadian hirelings stationed at one, the other trading), the quay's storehouse set to fetch the ship's oil and wine and take nothing else, years of messages and annals, and plague reported in Athens with her ship due (warned, not landed).
- `#bigwoods`: a founded large (256) wooded land, the heaviest kind, for the budgets.
- `#order-paused` and `#order-plain`, as for every demo.
- Every earlier token keeps working.

## Not in this slice

New systems of any kind. The gods (the next phase's biggest gap). A burial ground, riots, laying out a colony's streets, land with the sea elsewhere than the south. The phase summary (the orchestrator writes it after the review).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- **State version** stays 47 unless saved state is added; if it is, version 48 with `fromSlice52` hooked at `if (st.version === 47)`, filling only this slice's fields.
- **Histories may move on purpose** (the tuning pass) and nowhere else. Every demo is compared at opening (date, people, money, levels) before and after; every one that moves is named in the check-in with how much.
- **Tune constants, not systems.** Every change is listed with before and after in the check-in.
- Kinds appended at the end of their lists; no new wares; no `MAP_SIZE` in new code (the land's own size); news through `say`; building panels through `src/ui/buildingpanel.ts`; panels built from slice 50's kit.
- Sim code stays pure and deterministic (seeded hashes only, maths through `dmath.ts`); player actions are commands; money only through the treasury; the renderer and UI only read.
- Judge by screenshots at 1920 × 1080 and 1366 × 768; never claim it looks or feels right on Oliver's behalf.
- Budgets checked on `#order` and the large wooded land, side by side with the starting commit (a timeout-loosened copy of `measure.mjs`, since the machine is shared).

## Before

At `0f9dc87`, on a loaded machine (load about 4 on 4 cores, other lines' browsers running).

| What | Before |
|---|---|
| Tests | 780 in 59 files, all passing (4 min 7 s) |
| Build | 2.9 s with the prepared towns cached |
| Download, loads and frame work | the loosened `measure.mjs` at `0f9dc87` (`dist` built at the starting commit), side by side with this slice's build in the check-in's Measurements |

## Design decisions

**`#order`** is built in code the way a careful player builds (`orderTown` in `src/game/demos.ts`), on `{ kind: 'delta', size: 192, seed: seedOf('order') }`: each step waits until the treasury can pay for it and a month's wages, with a caretaker who clears and rebuilds what burns or falls, and with a middling player's answers to Greece. In order: the main street and two streets of houses with fountains, farms, a granary, an agora and a tax office; a shrine, a dairy and a hunting lodge; a third street; oil (groves, a press, a storehouse); fleece; a theatre and a second agora; the watch and the architects (hazards on from here); wine; the quay with its trading post and storehouse, selling oil and wine to the Tyrian ship; crime on; a hut street by the road in; a sea route to Athens; Nea Thasos and a second colony; a barracks with Arcadian hirelings stationed at the first colony; a court and a prison with the law set; an infirmary with health on; the quay storehouse's rules; then two years' play so every overview page has two years of charts. Plague is started in Athens a fortnight before it opens (as `#plague` does), so it opens warned and not landed. It opens on its own view over the town.

**The tuning pass** plays `#order` and `#town` headless for four game years (and the plague in `#plague`), counting crimes, cases and punishments, fever deaths with and without an infirmary, the plague's deaths, the colonies' coin and crime against the watch, and changes only the constants that are plainly off.

**The look pass** brings onto the kit what slice 50 left: the home panel (`household.ts`); the side panel's other tabs; the map of Greece's route tables as real `ktoggle` and `kstep`; one bar tone for a trireme's hull and oars; the town lines under the top bar; the close buttons' `title` to `data-tip`; the overview's tab words at 1366 × 768; Space and Enter on a focused button in the help.

**The findings carried over**, triaged: small and plainly wrong ones fixed, numbers tuned, the rest listed for Oliver under Recorded for later.

| Finding | What I mean to do |
|---|---|
| Tyre's ship says "Ship in N d" while a quarantine holds her | `shipNews` says she waits outside |
| Vassal loyalty "your army too small to fear: 32 men against its 31" | Fix the comparison or the words |
| Militia companies' banner can be taken and marched | Refuse it as for aid companies |
| A quarantine doesn't stop tribute, gifts or colonists sailing out | Hold them while it lasts, if small |
| The health town line ranks last | Rank a fever with the other warnings |
| Close buttons carry `title` | `data-tip` |
| The overview's tab words cut at 1366 × 768 | Look; shorten or let them wrap |
| A trading post on a lake "too shallow" | Check slice 50's wording; say why |
| Colony and company ships in the quay picture | Draw them if small |
| Distribution's sparklines read flat | Look; taller or scaled to their own range |
| The sick at their doors hard to see; the small quarantine pennant | Look; a distinct blanket, a larger pennant |
| Delta and islands anchorage past a wide shelf; the third ship anchoring shallow | Look in `#order`; fix only if it does not move other demos' histories, else record |
| War fleets never prey on a free ally's coin ships; Sparta's or Rhodes' label faded; overlapping triremes at the jetties; the new-game preview on the main thread; the wooded coast's opening; the delta's road over the knoll; the dry plain's site; faint far-band lines; routes' far anchorage; the overview refresh on a real laptop; #colonies' frame work | Look and re-measure; fix the small ones, record the rest |

## Tests

- The existing suite, with `tests/treasury.test.ts`, the purity and `tests/loadorder.test.ts` passing.
- A save round-trip of `#order` (a prisoner, a plague, store rules, messages, a generated land), and a version 37 save loading.
- Tests for any leftover that changes the sim, where they earn their keep.
- `smoke.mjs` opens `#order` and checks what it shows (the gang, the court and prison, the infirmary, the colonies, the plague warning, the storehouse rules); `measure.mjs` adds `#order` and `#bigwoods` with their triangles, draw calls and frame work.
- The demo probe: every demo at opening, before and after.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. `#order` and `#bigwoods`: setups, views, smoke and measure entries. Commit.
3. Leftovers in the sim and the small findings. Commit.
4. Tuning pass: `#order` and `#town` four years headless; tune constants; probe every demo before and after. Commit.
5. Look pass: the panels onto the kit; every new panel of the phase at 1920 × 1080 and 1366 × 768. Commit.
6. Budgets: `#order` and the large woods against the starting commit; fix what is over. Commit.
7. Full checks (tests, build, the slow smoke, the measure, every demo opening, a version 37 save), As built, the check-in. Commit, push.

## As built

(To be filled in.)
