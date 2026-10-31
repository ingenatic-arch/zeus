/**
 * Sanctuaries (slice 54): a great precinct to one of the twelve, raised in
 * stages as a smaller monument is (monuments.ts, monumentworks.ts: the same
 * sites, ox carts and masons' builders), noticed by its god, served by its
 * priests, and dimmed when it is left without workers.
 *
 * - **The building**: kind `sanctuary`, 5 x 5 (buildings.ts `isGrand`), with
 *   the god on the building record (`god`, the groundwork's field) and on its
 *   site's record (`Site.god`). One to a god (`sanctuaryRefusal`), as many
 *   gods as you like. Marked out for SANCTUARY_COST (build.ts) by the
 *   `sanctuary` command.
 * - **Its stages** (monuments.ts `sanctuaryStages`): the foundations, the temple, and the
 *   statue and finish, each needing marble and timber on site; the last also
 *   copper (cast into bronze by an armoury's smiths) and a measure of the
 *   god's sacred good to consecrate it (`sacredMeasure`), which the ox carts
 *   fetch from the granaries or storehouses that hold it.
 * - **The god notices** (only through the groundwork's API): each stage
 *   finished is remembered (STAGE_HONOUR, fading over STAGE_FADE); finished
 *   and staffed, the sanctuary is a standing honour (STANDING_HONOUR, asserted
 *   as it is finished and on the first of every month, never fading while it
 *   lasts). Without workers for a season (DIM_AFTER) it dims: the standing
 *   honour is forgotten until they come back, and it is drawn dimmer.
 * - **Its priests** (walker `priest`): a finished, staffed sanctuary sends a
 *   crew of them on the religion round, as a shrine sends its priestesses,
 *   with half as far again to go (PRIEST_RANGE), blessing every home they
 *   pass for four months.
 * - **Finished** is `sanctuaryFinished` (called by monumentworks.ts): the
 *   one place a later slice hooks what a god does when their sanctuary is
 *   finished. (Merge with slice 56: with the gods switched on, the god comes
 *   to see it, rising at its altar, `altarOf`; the visit's cap of three gods
 *   at once holds, and while a demo's history is played nobody comes.)
 *
 * The switch: nothing here acts on its own. Everything follows from a
 * sanctuary the player built, so it runs whether or not the gods are
 * switched on (no older town has a sanctuary, so no history moves).
 *
 * Pure: nothing here draws a random number. Its tables are worked out inside
 * functions, so the order modules load in can't spoil them.
 */
import type { CoastMap } from '../map/bake';
import { mapOf } from '../map/lands';
import { hash2 } from '../map/noise';
import { COTTAGE, findBuilding, footSide } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { RELIGION_LASTS } from './culture';
import { serviceDue, serviceScore } from './folk';
import { rateOf } from './labour';
import { say, WARNING } from './messages';
import { siteName, type Site } from './monuments';
import { assert, GODS, honour, type GodId } from './pantheon';
import { CREW_GAP, crewClock, moveRounds, sendOut, type ServiceSpec } from './rounds';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
// Merge with slice 56: the god comes to see their sanctuary finished.
import { startVisit } from './epiphany';
import { besideRoad, CARRIER_SPEED } from './walk';
import { restFor } from './water';

// ---------------------------------------------------------------------------
// Reading them (the exports other lines read).

/** The record of this city's sanctuary to a god, if it has marked one out (finished or not). */
export const sanctuaryOf = (s: SimState, god: GodId): Site | undefined => s.monuments.sites.find((x) => x.kind === 'sanctuary' && x.god === god);
/** Is this god's sanctuary finished and standing? */
export function sanctuaryDone(s: SimState, god: GodId): boolean {
  const x = sanctuaryOf(s, god);
  if (!x || !x.finished) return false;
  const b = findBuilding(s, x.id);
  return !!b && b.kind === 'sanctuary';
}
/** The sanctuaries' site records, in the order they were marked out. */
export const sanctuaries = (s: SimState): Site[] => s.monuments.sites.filter((x) => x.kind === 'sanctuary');

/** "the sanctuary to Demeter". */
export const sanctuaryName = (god: GodId, cap = false): string => siteName({ kind: 'sanctuary', god }, cap);

/** Why a sanctuary to this god can't be marked out ('' if it can): one to a god. */
export function sanctuaryRefusal(s: SimState, god: GodId): string {
  const x = sanctuaryOf(s, god);
  if (!x && !s.buildings.some((b) => b.kind === 'sanctuary' && b.god === god)) return '';
  const name = GODS[god].name;
  return x?.finished ? `Your city has its sanctuary to ${name} already: it stands finished. One to a god` : `Your city has its sanctuary to ${name} already: it is rising. One to a god`;
}

// ---------------------------------------------------------------------------
// The god notices.

/** What each stage finished adds to the god's mood, and how long it takes to fade. */
export const STAGE_HONOUR = [6, 8, 10];
export const STAGE_FADE = 2 * TICKS_PER_YEAR;
/** What a finished, staffed sanctuary adds to its god's mood while it lasts. */
export const STANDING_HONOUR = 18;
/** How long a finished sanctuary goes without workers before it dims and its honour lapses: a season. */
export const DIM_AFTER = 3 * TICKS_PER_MONTH;

/** The kinds of memory a sanctuary gives its god: a stage finished, and its standing honour. */
export const STAGE_KIND = 'sanctuary-stage';
export const STANDING_KIND = 'sanctuary';

/** The reason a god's standing honour gives: "your sanctuary to Demeter". */
export const standingWhy = (god: GodId): string => `your sanctuary to ${GODS[god].name}`;
/** The reason each stage gives. */
function stageWhy(god: GodId, stage: number): string {
  const name = GODS[god].name;
  return stage === 0 ? `the foundations of your sanctuary to ${name}` : stage === 1 ? `the temple of your sanctuary to ${name} raised` : `your sanctuary to ${name} consecrated`;
}

/** Is a finished sanctuary dimmed (without workers for a season)? */
export const dimmed = (s: SimState, x: Site): boolean => !!x.finished && x.idle > 0 && s.tick - x.idle >= DIM_AFTER;

/** Is a finished sanctuary's standing honour in force (standing, not dimmed)? */
const standing = (s: SimState, x: Site): boolean => !!x.finished && !dimmed(s, x);

// ---------------------------------------------------------------------------
// The hooks monumentworks.ts calls.

/** A sanctuary is marked out (monumentworks.ts markSite): the news. */
export function sanctuaryMarked(s: SimState, x: Site): void {
  if (!x.god) return;
  say(s, { kind: 'sanctuary', words: `${sanctuaryName(x.god, true)} is marked out. The ox carts will haul marble and timber to it from your storehouses, and the masons’ builders lay its foundations once they are there.`, at: { building: x.id } });
}

/** A stage of a sanctuary is finished (monumentworks.ts, before the last is `sanctuaryFinished`): the god remembers it. */
export function sanctuaryStageDone(s: SimState, x: Site, stage: number): void {
  if (!x.god) return;
  honour(s, x.god, STAGE_HONOUR[stage] ?? 0, STAGE_KIND, stageWhy(x.god, stage), STAGE_FADE);
  if (stage >= 2) return;
  const g = GODS[x.god];
  const words = stage === 0 ? `The foundations of ${sanctuaryName(x.god)} are laid. ${g.name} has noticed.` : `The temple of ${sanctuaryName(x.god)} is raised: only the statue and the finish are left. ${g.name} is watching.`;
  say(s, { kind: 'sanctuary', words, at: { building: x.id } });
}

/**
 * A sanctuary is finished (monumentworks.ts's `finish`, after the last
 * stage's memory): it takes its workers from now (its building's level 1),
 * its god's standing honour begins, and the city hears of it. This is the
 * one place a later slice hooks what a god does when their sanctuary is
 * finished (slice 56: the god's visit).
 */
export function sanctuaryFinished(s: SimState, x: Site): void {
  if (!x.god) return;
  const b = findBuilding(s, x.id);
  if (b && b.kind === 'sanctuary') {
    b.level = 1;
    b.since = s.tick;
    b.clock = FIRST_PRIEST;
  }
  x.idle = 0;
  assert(s, x.god, STANDING_KIND, standingWhy(x.god), STANDING_HONOUR);
  const g = GODS[x.god];
  say(s, { kind: 'sanctuary', words: `${sanctuaryName(x.god, true)} is finished and consecrated: ${g.name}’s statue stands in its court. Once its priests come to work it, they walk far through the streets, blessing homes.`, at: { building: x.id } });
  // Merge with slice 56: the god comes to see it, rising at its altar (only with the gods switched on, so never while a
  // demo's history is played; refused, as any visit is, with three gods in the city already).
  if (b && b.kind === 'sanctuary' && s.gods.on) startVisit(s, x.god, 'sanctuary', altarOf(s, b));
}

/** How far before a sanctuary's middle its altar stands, towards its gate (src/render/sanctuary.ts draws it there). */
export const ALTAR_AHEAD = 1.55;

/**
 * Where a sanctuary's altar stands in the world (merge with slice 56: where
 * its god rises): ALTAR_AHEAD from its middle towards its gate, which faces
 * its road as the renderer turns it (src/render/homes.ts `facingOf`: the
 * first side with a road of east, south, north and west).
 */
export function altarOf(s: SimState, b: Building): { x: number; z: number } {
  const size = mapOf(s).size;
  const n = footSide(b);
  const road = (tx: number, tz: number): boolean => tx >= 0 && tz >= 0 && tx < size && tz < size && s.tiles[tz * size + tx] === TILE_ROAD;
  const any = (f: (d: number) => boolean): boolean => {
    for (let d = 0; d < n; d++) if (f(d)) return true;
    return false;
  };
  // (The quarter turns as facingOf counts them: 0 east, π/2 north, π west, 3π/2 south.)
  const QUARTERS: Array<[number, number]> = [[1, 0], [0, -1], [-1, 0], [0, 1]];
  const [dx, dz] = any((d) => road(b.x + n, b.z + d))
    ? QUARTERS[0]
    : any((d) => road(b.x + d, b.z + n))
      ? QUARTERS[3]
      : any((d) => road(b.x + d, b.z - 1))
        ? QUARTERS[1]
        : any((d) => road(b.x - 1, b.z + d))
          ? QUARTERS[2]
          : QUARTERS[Math.floor(hash2(b.id, 3, 41) * 4)];
  return { x: b.x + n / 2 + dx * ALTAR_AHEAD, z: b.z + n / 2 + dz * ALTAR_AHEAD };
}

/** A sanctuary is taken down or lost (monumentworks.ts, as its record goes): its god's standing honour goes with it. */
export function sanctuaryGone(s: SimState, x: Site): void {
  if (!x.god) return;
  assert(s, x.god, STANDING_KIND, standingWhy(x.god), 0);
}

// ---------------------------------------------------------------------------
// Its priests.

/** How far by road from the sanctuary its priests ever go, and how much fresh road a round is: half as far again as a shrine's priestess. */
export const PRIEST_RANGE = 48;
export const PRIEST_WALK = 96;
/** Ticks a priest rests between rounds at a fully staffed sanctuary, and before the first. */
export const PRIEST_REST = 30;
export const FIRST_PRIEST = 20;

const near: Building[] = [];
/** Does a home want the priests? As it wants the priestess: cottages and better with people in them. */
const wantsPriest = (b: Building): boolean => b.kind === 'home' && b.level >= COTTAGE && b.people > 0;

let priestsSpec: ServiceSpec | null = null;
/** The priests' round: the priestess's, further. (Made on first use, so the order modules load in can't spoil it.) */
export function priestsRound(): ServiceSpec {
  if (priestsSpec) return priestsSpec;
  priestsSpec = {
    record: (s) => s.rounds.religion,
    range: PRIEST_RANGE,
    walk: PRIEST_WALK,
    speed: CARRIER_SPEED,
    score: (b) => serviceScore(b, 'religion', wantsPriest(b)),
    due: (b) => serviceDue(b, 'religion'),
    serve(s: SimState, size: number, t: number) {
      const until = s.tick + RELIGION_LASTS;
      for (const b of besideRoad(s, size, t, near)) if (b.kind === 'home' && b.level > 0 && b.religionUntil < until) b.religionUntil = until;
    },
    rest: (b) => restFor(b, PRIEST_REST),
    crew: true,
  };
  return priestsSpec;
}

/** Move a priest one tick along. False when done for this round. */
export function movePriest(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, priestsRound(), 'sanctuary');
}

// ---------------------------------------------------------------------------
// The tick.

/**
 * The sanctuaries' tick (after the shrines'): each finished one's staff
 * watched (dimming after a season without, its honour lapsing; back when they
 * return), its standing honour re-asserted on the first of the month, and its
 * priests sent out. Nothing in a town with no sanctuary.
 */
export function stepSanctuaries(s: SimState, map: CoastMap): void {
  const sites = s.monuments.sites;
  if (!sites.some((x) => x.kind === 'sanctuary' && x.finished)) return;
  const size = map.size;
  const day = s.tick % TICKS_PER_DAY === 0;
  const month = s.tick % TICKS_PER_MONTH === 0;
  for (const x of sites) {
    if (x.kind !== 'sanctuary' || !x.finished || !x.god) continue;
    const b = findBuilding(s, x.id);
    if (!b || b.kind !== 'sanctuary') continue;
    const staffed = b.workers > 0 && rateOf(b) > 0;
    if (day) {
      const g = GODS[x.god];
      if (staffed && x.idle > 0) {
        const was = dimmed(s, x);
        x.idle = 0;
        if (was) {
          assert(s, x.god, STANDING_KIND, standingWhy(x.god), STANDING_HONOUR);
          say(s, { kind: 'sanctuary', words: `${sanctuaryName(x.god, true)} has its priests again: its lamps are lit, and ${g.name} is honoured once more.`, at: { building: x.id } });
          s.looks++;
        }
      } else if (!staffed && x.idle === 0) x.idle = s.tick;
      else if (!staffed && s.tick - x.idle >= DIM_AFTER && s.tick - x.idle < DIM_AFTER + TICKS_PER_DAY) {
        assert(s, x.god, STANDING_KIND, standingWhy(x.god), 0);
        say(s, { kind: 'sanctuary', u: WARNING, words: `${sanctuaryName(x.god, true)} has stood without priests for a season: its lamps are out, and ${g.name} no longer counts it an honour. Workers bring it back: it needs homes nearby with people free to work.`, at: { building: x.id } });
        s.looks++;
      }
    }
    if (month && standing(s, x)) assert(s, x.god, STANDING_KIND, standingWhy(x.god), STANDING_HONOUR);
    b.clock = crewClock(s, b, 'priest', b.clock, staffed, () => sendOut(s, size, b, 'priest'), restFor(b, CREW_GAP), PRIEST_REST);
  }
}
