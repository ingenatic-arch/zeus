/**
 * Fire and collapse: fire risk and wear on every building, the watch post's
 * watchman and the architect's office's inspector who reset them, and what
 * happens where nobody comes.
 *
 * Once a day (staggered by id, like the homes) every building's fire risk and
 * wear rise towards HAZARD_FULL: risk faster in busy and crowded buildings
 * (the presses, the winery, the theatre, packed houses), wear faster in big
 * ones. Each building's pace is varied a little by a hash of the seed and its
 * id, so a street doesn't all fill on the same day. Nothing rises while the
 * state's `hazards` switch is off (demo histories are built that way).
 *
 * A building whose risk tops out smoulders for about a month (SMOULDER_DAYS);
 * a watchman passing puts it out. If none does, it catches fire and burns
 * for BURN_DAYS, then falls to rubble. While it burns, once a day, there is a
 * seeded chance (SPREAD_CHANCE) that one of the buildings touching it (on any
 * of its four sides; never across a road, never a fountain) catches too. A
 * watchman who can see flames (within WATCH_SIGHT of him, and reachable by a
 * short road) leaves his round and runs to them by the shortest road, and
 * fights them for FIGHT_TICKS, which puts the fire out.
 *
 * A building whose wear tops out creaks for about a month (CREAK_DAYS); an
 * inspector passing makes it sound. If none does, it falls in: rubble.
 * Collapse never spreads.
 *
 * Every chance here is a hash of the seed, the building and the day, not a
 * draw from the state's generators, so fire never shifts anything else's
 * random numbers (and a town with no fire runs exactly as before).
 */
import type { CoastMap } from '../map/bake';
import { beside, capacity, centreOf, findBuilding, footSide, HOME_CAPACITY } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { rateOf } from './labour';
import { roadSearch, tracePath, type Search } from './roads';
import { door, endRound, headHome, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import { TILE_ROAD, type Building, type BuildingKind, type SimState, type Walker } from './state';
import { besideRoad, centre, COLLECTOR_SPEED, position, RUN_SPEED, setPath } from './walk';
import { restFor } from './water';

/** Fire risk and wear run from 0 to this. */
export const HAZARD_FULL = 1000;
/** Past this, a building shows a mark (half full). */
export const HAZARD_MARK = 500;
/** Past this, the overlays tint it red and the town lines warn (three-quarters). */
export const HAZARD_HIGH = 750;

export const FIRE_NONE = 0;
export const FIRE_SMOULDER = 1;
export const FIRE_BURNING = 2;

/** About how long a building smoulders before it catches, and creaks before it falls (each give or take DAYS_JITTER). */
export const SMOULDER_DAYS = 30;
export const CREAK_DAYS = 30;
export const DAYS_JITTER = 5;
/** How long a fire burns before the building falls to rubble. */
export const BURN_DAYS = 10;
/** The chance each day that a fire spreads to one of the buildings touching it. */
export const SPREAD_CHANCE = 0.08;

/** Rubble: how it came to be (its `level`). */
export const BURNT = 1;
export const FALLEN = 2;

/** The watchman's round: as far as the tax collector's, a little longer. */
export const WATCH_RANGE = 32;
export const WATCH_WALK = 40;
export const WATCH_REST = 30;
export const FIRST_WATCHMAN = 20;
/** How far (tiles, as the crow flies) a watchman, or his post, can see flames. */
export const WATCH_SIGHT = 10;
/** The longest road he will run to a fire he can see. */
export const DASH_MAX = 24;
/** He runs to a fire at this pace (tiles a tick). */
export const DASH_SPEED = RUN_SPEED;
/** How long he fights a fire before it is out. */
export const FIGHT_TICKS = 2 * TICKS_PER_DAY;
/** How often (ticks) a watchman on his round looks round for flames. */
const LOOK_EVERY = 5;

/** The inspector's round. */
export const INSPECT_RANGE = 40;
export const INSPECT_WALK = 48;
export const INSPECT_REST = 30;
export const FIRST_INSPECTOR = 20;

/** Below this a watchman's or an inspector's round doesn't go out of its way for a building. */
const CARE_FROM = 300;

/** About how many days a building's fire risk takes to fill, by kind (homes by level, below; Infinity: it never burns). */
const RISK_DAYS: Record<BuildingKind, number> = {
  home: 0,
  fountain: Infinity,
  farm: 480,
  granary: 330,
  agora: 330,
  shrine: 420,
  theatre: 240,
  taxoffice: 420,
  lodge: 330,
  dairy: 330,
  grove: 480,
  press: 240,
  storehouse: 330,
  pasture: 480,
  vineyard: 480,
  winery: 240,
  watchpost: 420,
  architect: 420,
  rubble: Infinity,
};
/** A home's, by level (plot, tent, hut, cottage, townhouse, fine house, villa), before crowding. */
const HOME_RISK_DAYS = [Infinity, 420, 420, 400, 360, 330, 330];

/** About how many days a building's wear takes to fill: faster in big buildings. */
const WEAR_DAYS: Record<BuildingKind, number> = {
  home: 0,
  fountain: 450,
  farm: 480,
  granary: 330,
  agora: 330,
  shrine: 450,
  theatre: 330,
  taxoffice: 450,
  lodge: 400,
  dairy: 400,
  grove: 480,
  press: 330,
  storehouse: 330,
  pasture: 480,
  vineyard: 480,
  winery: 330,
  watchpost: 450,
  architect: 450,
  rubble: Infinity,
};
const HOME_WEAR_DAYS = [Infinity, 600, 600, 540, 540, 540, 540];

/** A small hash to [0, 1) (not state: the same seed, building, day and salt always give the same answer). */
export function unit(seed: number, id: number, day: number, salt: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(id + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) ^ Math.imul(day + 0x165667b1, 0x27d4eb2f);
  h ^= Math.imul(salt + 0x5bd1e995, 0x1b873593);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** This building's own pace (0.85 to 1.15), so neighbours don't all fill together. */
const pace = (s: SimState, b: Building, salt: number): number => 0.85 + 0.3 * unit(s.seed, b.id, 0, salt);

/** Can this building catch fire? */
export const burnable = (b: Building): boolean => (b.kind === 'home' ? b.level > 0 : RISK_DAYS[b.kind] < Infinity);
/** Does this building wear? */
export const wears = (b: Building): boolean => (b.kind === 'home' ? b.level > 0 : WEAR_DAYS[b.kind] < Infinity);

/** How crowded a home is (0.7 empty to 1.2 full): a packed house catches more easily. */
const crowding = (b: Building): number => 0.7 + 0.5 * Math.min(1, b.people / Math.max(1, capacity(b) || HOME_CAPACITY[1]));

/** How much a building's fire risk rises a day (0 if it can't burn). */
export function riskRate(s: SimState, b: Building): number {
  if (!burnable(b)) return 0;
  const days = b.kind === 'home' ? HOME_RISK_DAYS[Math.min(b.level, HOME_RISK_DAYS.length - 1)] / crowding(b) : RISK_DAYS[b.kind];
  return HAZARD_FULL / (days * pace(s, b, 1));
}

/** How much a building's wear rises a day (0 if it doesn't wear). */
export function wearRate(s: SimState, b: Building): number {
  if (!wears(b)) return 0;
  const days = b.kind === 'home' ? HOME_WEAR_DAYS[Math.min(b.level, HOME_WEAR_DAYS.length - 1)] : WEAR_DAYS[b.kind];
  return HAZARD_FULL / (days * pace(s, b, 2));
}

/** Days until a counter rising at `rate` a day from `now` reaches full (Infinity if it doesn't rise). */
export const daysToFull = (now: number, rate: number): number => (rate > 0 ? Math.max(0, Math.ceil((HAZARD_FULL - now) / rate)) : Infinity);

/** A month give or take a few days, for this building and this counter. */
const spell = (s: SimState, b: Building, days: number, salt: number): number => (days + Math.round((unit(s.seed, b.id, Math.floor(s.tick / TICKS_PER_DAY), salt) * 2 - 1) * DAYS_JITTER)) * TICKS_PER_DAY;

/** Set a building burning (from now: BURN_DAYS until it falls). */
export function ignite(s: SimState, b: Building): void {
  b.fire = FIRE_BURNING;
  b.fireAt = s.tick + BURN_DAYS * TICKS_PER_DAY;
  b.risk = HAZARD_FULL;
}

/** Put a smoulder or a fire out: the building is safe again, its risk back to nothing. */
export function putOut(b: Building): void {
  b.fire = FIRE_NONE;
  b.fireAt = 0;
  b.risk = 0;
}

/** The buildings touching this one, on any of its four sides, that could catch from it (in id order). */
export function catchable(s: SimState, size: number, b: Building): Building[] {
  const out: Building[] = [];
  for (const t of beside(size, b.x, b.z, footSide(b))) {
    const id = s.tiles[t];
    if (id <= 0) continue;
    const o = findBuilding(s, id);
    if (o && o !== b && !out.includes(o) && burnable(o) && o.fire !== FIRE_BURNING) out.push(o);
  }
  return out.sort((a, c) => a.id - c.id);
}

/** How a building ends: burnt down, or fallen in. */
export type Fall = 'fire' | 'collapse';

/**
 * Once a day per building: risk and wear rise; a smoulder catches, a fire
 * spreads or burns out, a creak ends in a fall. `fall` turns a building into
 * rubble (sim.ts: its family leaves); falls are made after the day's pass.
 */
export function stepHazards(s: SimState, map: CoastMap, fall: (b: Building, how: Fall) => void): void {
  if (!s.hazards) return;
  const size = map.size;
  const day = Math.floor(s.tick / TICKS_PER_DAY);
  let falls: Array<[Building, Fall]> | null = null;
  for (const b of s.buildings) {
    if ((s.tick + b.id) % TICKS_PER_DAY !== 0 || b.kind === 'rubble') continue;
    if (b.fire === FIRE_BURNING) {
      if (s.tick >= b.fireAt) {
        (falls ??= []).push([b, 'fire']);
        continue;
      }
      if (unit(s.seed, b.id, day, 3) < SPREAD_CHANCE) {
        const next = catchable(s, size, b);
        if (next.length) ignite(s, next[Math.floor(unit(s.seed, b.id, day, 4) * next.length)]);
      }
    } else if (b.fire === FIRE_SMOULDER) {
      if (s.tick >= b.fireAt) ignite(s, b);
    } else if (burnable(b)) {
      b.risk = Math.min(HAZARD_FULL, b.risk + riskRate(s, b));
      if (b.risk >= HAZARD_FULL) {
        b.fire = FIRE_SMOULDER;
        b.fireAt = s.tick + spell(s, b, SMOULDER_DAYS, 5);
      }
    }
    if (b.creakAt > 0) {
      if (s.tick >= b.creakAt) (falls ??= []).push([b, 'collapse']);
    } else if (wears(b)) {
      b.wear = Math.min(HAZARD_FULL, b.wear + wearRate(s, b));
      if (b.wear >= HAZARD_FULL) b.creakAt = s.tick + spell(s, b, CREAK_DAYS, 6);
    }
  }
  if (falls) for (const [b, how] of falls) if (findBuilding(s, b.id) === b) fall(b, how);
}

// ---------------------------------------------------------------------------
// The watchman.

const near: Building[] = [];

/** When a building would start to smoulder, on the tick scale (a smouldering one: well before anything else). */
function smoulderScore(b: Building, s: SimState): number {
  if (!burnable(b) || b.fire === FIRE_BURNING) return Infinity;
  if (b.fire === FIRE_SMOULDER) return b.fireAt - 2 * TICKS_PER_MONTH;
  if (b.risk < CARE_FROM) return Infinity;
  return s.tick + daysToFull(b.risk, riskRate(s, b)) * TICKS_PER_DAY;
}

/** The watchman's round: to the buildings nearest to smouldering first; every building beside his way has its risk reset, and a smoulder put out. */
export const WATCH: ServiceSpec = {
  record: (s) => s.rounds.fire,
  range: WATCH_RANGE,
  walk: WATCH_WALK,
  speed: COLLECTOR_SPEED,
  score: smoulderScore,
  due: (b) => (b.fire === FIRE_SMOULDER ? b.fireAt : Infinity),
  serve(s: SimState, size: number, t: number) {
    for (const b of besideRoad(s, size, t, near)) {
      if (b.fire === FIRE_BURNING) continue;
      if (b.fire === FIRE_SMOULDER) putOut(b);
      else b.risk = 0;
    }
  },
  rest: (b) => restFor(b, WATCH_REST),
};

/** Buildings on fire now. */
export const burning = (s: SimState): Building[] => s.buildings.filter((b) => b.fire === FIRE_BURNING);

/**
 * The nearest fire (by road) that someone standing at `here` can see and
 * reach from road tile `from` within DASH_MAX, with the road search out from
 * it; null if none.
 */
export function fireInSight(s: SimState, size: number, here: [number, number], from: number): { fire: Building; search: Search } | null {
  if (from < 0 || s.tiles[from] !== TILE_ROAD) return null;
  let best: { fire: Building; search: Search } | null = null;
  let bd = Infinity;
  for (const f of s.buildings) {
    if (f.fire !== FIRE_BURNING) continue;
    const [cx, cz] = centreOf(f);
    if (Math.hypot(cx - here[0], cz - here[1]) > WATCH_SIGHT) continue;
    const roads = roadsBeside(s, size, f);
    if (roads.length === 0) continue;
    const search = roadSearch(s, size, roads);
    const d = search.dist[from];
    if (d < 0 || d > DASH_MAX || d >= bd) continue;
    bd = d;
    best = { fire: f, search };
  }
  return best;
}

/** The road tile a walker stands on or is stepping onto (-1 if neither is a road). */
function roadUnder(s: SimState, w: Walker): number {
  for (const t of [w.tiles[w.seg], w.tiles[w.seg + 1]]) if (t !== undefined && t >= 0 && s.tiles[t] === TILE_ROAD) return t;
  for (let k = w.seg; k >= 0; k--) if (w.tiles[k] >= 0 && s.tiles[w.tiles[k]] === TILE_ROAD) return w.tiles[k];
  return -1;
}

/** Off he runs: the shortest road from where he stands to the fire's door. */
function dashTo(size: number, w: Walker, fire: Building, search: Search, from: number): void {
  const here = position(w);
  const way = tracePath(search, from).reverse();
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, fire, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  setPath(w, pts);
  w.target = fire.id;
  w.wait = 0;
  w.back = false;
}

/** Look round for flames from where he is; run to the nearest he can see. */
function lookForFire(s: SimState, size: number, w: Walker): boolean {
  const from = roadUnder(s, w);
  const got = fireInSight(s, size, position(w), from);
  if (!got) return false;
  dashTo(size, w, got.fire, got.search, from);
  return true;
}

/** Watch posts: send out the watchman when one is due, or at once when the post can see flames. */
export function stepWatchPosts(s: SimState, map: CoastMap): void {
  const size = map.size;
  let fires = -1;
  for (const b of s.buildings) {
    if (b.kind !== 'watchpost' || b.walker !== 0) continue;
    if (rateOf(b) > 0) {
      if (fires < 0) fires = burning(s).length;
      if (fires > 0 && b.clock > 1) {
        const [cx, cz] = centreOf(b);
        const roads = roadsBeside(s, size, b);
        if (roads.length && fireInSight(s, size, [cx, cz], roads[0])) b.clock = 1;
      }
    }
    if (--b.clock > 0) continue;
    if (rateOf(b) === 0 || !sendOut(s, size, b, 'watchman')) b.clock = WATCH_REST;
  }
}

/** Move a watchman one tick along: his round, or a run to a fire and the fight. Returns false when he is done for this round. */
export function moveWatchman(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  if (w.target === 0 && (s.tick + w.id) % LOOK_EVERY === 0) lookForFire(s, size, w);
  if (w.target === 0) return moveRounds(s, map, w, WATCH, 'watchpost');
  const post = findBuilding(s, w.origin);
  if (!post || post.kind !== 'watchpost') return false;
  const fire = findBuilding(s, w.target);
  const after = (): boolean => {
    w.target = 0;
    w.wait = 0;
    if (lookForFire(s, size, w)) return true;
    const from = roadUnder(s, w);
    if (from >= 0 && headHome(s, size, w, post, from, position(w))) return true;
    return endRound(WATCH, post);
  };
  if (!fire || fire.fire !== FIRE_BURNING) return after();
  if (w.wait > 0) {
    if (--w.wait > 0) return true;
    putOut(fire);
    s.rev++;
    return after();
  }
  // Running: along the way at a run, serving the buildings he passes as on his round.
  const walked = s.rounds.fire.walked;
  let move = DASH_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) {
      w.wait = FIGHT_TICKS;
      return true;
    }
    const next = w.tiles[w.seg + 1];
    if (next >= 0 && s.tiles[next] !== TILE_ROAD) return after();
    const i = w.seg * 2;
    const len = Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      break;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
    const t = w.tiles[w.seg];
    if (t >= 0) {
      WATCH.serve(s, size, t, w);
      walked[t] = s.tick;
    }
  }
  if (w.seg >= w.path.length / 2 - 1) w.wait = FIGHT_TICKS;
  return true;
}

// ---------------------------------------------------------------------------
// The inspector.

/** When a building would start to creak, on the tick scale (a creaking one: well before anything else). */
function creakScore(b: Building, s: SimState): number {
  if (!wears(b)) return Infinity;
  if (b.creakAt > 0) return b.creakAt - 2 * TICKS_PER_MONTH;
  if (b.wear < CARE_FROM) return Infinity;
  return s.tick + daysToFull(b.wear, wearRate(s, b)) * TICKS_PER_DAY;
}

/** The inspector's round: to the most worn buildings first; every building beside her way is made sound (its wear reset, a creak stopped). */
export const INSPECT: ServiceSpec = {
  record: (s) => s.rounds.wear,
  range: INSPECT_RANGE,
  walk: INSPECT_WALK,
  speed: COLLECTOR_SPEED,
  score: creakScore,
  due: (b) => (b.creakAt > 0 ? b.creakAt : Infinity),
  serve(s: SimState, size: number, t: number) {
    for (const b of besideRoad(s, size, t, near)) {
      b.wear = 0;
      b.creakAt = 0;
    }
  },
  rest: (b) => restFor(b, INSPECT_REST),
};

/** Architects' offices: send out the inspector when one is due and someone works there. */
export function stepArchitects(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const b of s.buildings) {
    if (b.kind !== 'architect' || b.walker !== 0) continue;
    if (--b.clock > 0) continue;
    if (rateOf(b) === 0 || !sendOut(s, size, b, 'inspector')) b.clock = INSPECT_REST;
  }
}

/** Move an inspector one tick along. Returns false when she is done for this round. */
export function moveInspector(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, INSPECT, 'architect');
}

/** Is this home or workplace marked (past half) for risk, wear, or both? */
export const marked = (b: Building): { risk: boolean; wear: boolean } => ({ risk: b.fire !== FIRE_NONE || b.risk >= HAZARD_MARK, wear: b.creakAt > 0 || b.wear >= HAZARD_MARK });
