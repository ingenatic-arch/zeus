/**
 * The work of building the monuments (slice 35; what they are and need is in
 * monuments.ts): the sites' stages, the ox carts that haul their materials
 * from the storehouses, the masons' yards and their builders, what a finished
 * one does when it is finished, and the Stadium's games with their visitors.
 *
 * - **A site** is the monument's own building, placed and paid for at once
 *   and marked out. Its record (`s.monuments.sites`) is made the tick it
 *   stands. Its materials on site are its building's goods (marble, timber
 *   and copper for the bronze), counted in the city's stock until a stage
 *   uses them.
 * - **A stage starts** only when everything it needs is on site (and, for a
 *   stage of bronze, an armoury has smiths to cast it): the materials are used
 *   then, all at once. Its work is so many builder-days: each builder at the
 *   site does a tick of it each tick, up to the stage's builders (with half of
 *   them it takes twice as long). While it is under way the carts bring the
 *   next stage's materials, so a busy town goes straight from one to the next.
 * - **Ox carts** (walker 'oxcart', from a storehouse, `origin`; to the site,
 *   `target`; with the ware in `food` and the load in `load`): while a site
 *   wants something not yet on site or on the way, it calls a cart every
 *   HAUL_GAP (its building's `clock` counts down), up to MAX_HAULS on the road
 *   at once, from the storehouse nearest it by road that has some. The cart
 *   loads at the storehouse as it sets out, unloads at the site and goes home
 *   empty.
 * - **The masons' yard** (2 x 2) has up to MAX_BUILDERS builders out at once
 *   (one for each two of its workers). Each walks to the nearest site by road
 *   that wants builders for a stage under way, works there at his place on the
 *   scaffold, and walks home when the stage is done (or his yard loses the
 *   workers for him, or the site has more than it needs).
 * - **Finished**: every ruler admires it (a memory fading over a year), the
 *   warmest sends compliments; the Colossus is remembered for good ("they
 *   speak of your Colossus"); the Lighthouse speeds the Tyrian ship and keeps
 *   pirates off (trade.ts, fleet.ts); the Stadium holds its first games two
 *   months on.
 * - **The games**: a month every four years. Groups of visitors walk in from
 *   the map's edge every couple of days, pay for their seats at the Stadium
 *   (VISITOR_PAYS a head, on the ledger as sales), watch for a few days and
 *   walk out again; cordial rulers send athletes (a memory fading over a
 *   year). Every home's mood lifts while they are on (folk.ts).
 *
 * Nothing here draws a random number, and nothing runs in a town with no
 * monument and no masons' yard.
 */
import type { CoastMap } from '../map/bake';
import { WATER_SEA } from '../map/bake';
import { dhypot } from '../map/dmath';
import { PLACES } from '../map/greece';
import { findBuilding, footSide } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './clock';
import { news, settleMood } from './diplomacy';
import { CART_TAKE, goTo, lastRoad, nearestBy, wayPoints } from './food';
import { COPPER, held, MARBLE, setHeld, TIMBER, WARE_NAMES, type Ware } from './foods';
import { rateOf } from './labour';
import {
  finished as isFinished,
  FIRST_GAMES,
  GAMES_EVERY,
  GAMES_LAST,
  GAMES_NOTICE,
  isMonument,
  MATERIALS,
  monumentName,
  monumentOf,
  needOf,
  NOTICE_FADE,
  NOTICE_MOOD,
  COLOSSUS_MOOD,
  COLOSSUS_WHY,
  STAGE_COUNT,
  STAGES,
  stageNow,
  workOf,
  type MonumentKind,
  type Site,
} from './monuments';
import { nearestEdge, roadSearch, tracePath } from './roads';
import { door, roadsBeside } from './rounds';
import { TILE_ROAD, type Building, type BuildingKind, type SimState, type Walker, type WorldCity } from './state';
import { note } from './stockbook';
import { roomOf } from './stores';
import { berthAt } from './trade';
import { income } from './treasury';
import { CART_SPEED, centre, newWalker, OFF_MAP, offMapPoint, position, SENDING_SPEED, setPath, WALK_SPEED } from './walk';
import { fadeFor, moodOf, rulerName } from './world';

/** Most builders a fully staffed masons' yard has out at once (one for each two of its eight workers). */
export const MAX_BUILDERS = 4;
/** Ticks between builders setting out from the same yard (half a day). */
export const BUILDER_GAP = 5;
/** Ticks between a site calling ox carts (two days), most on the road to it at once. */
export const HAUL_GAP = 2 * TICKS_PER_DAY;
export const MAX_HAULS = 6;
/** Ticks a site waits before calling again when no storehouse has what it wants (three days). */
const HAUL_RETRY = 3 * TICKS_PER_DAY;
/** Ticks an ox cart takes to unload at a site. */
export const UNLOAD = 20;
/** What an ox cart hauls of each material: as much as the makers' own carts (food.ts CART_TAKE). */
export const haulOf = (w: Ware): number => CART_TAKE[w] ?? 50;

/** How high (world units above the sea, the mean of its corners) the Lighthouse's ground must be: the headland, not the beach. */
export const LIGHTHOUSE_HIGH = 1.5;

/**
 * The games' visitors: a group sets out from the map's edge every VISITOR_GAP
 * from when the games are announced (GAMES_NOTICE before they open: the walk
 * in can take a month or more) for as long as it would still arrive before
 * they end; what each pays for a seat, and how long they stay to watch once
 * the games are on (WATCH, and a day longer for each group in turn up to a
 * week: those who come early wait in their seats for the opening, and don't
 * all leave at once).
 */
export const VISITOR_GAP = 2 * TICKS_PER_DAY;
export const VISITOR_PAYS = 8;
export const WATCH = 3 * TICKS_PER_DAY;
/** The size of the n-th group (3 to 6, in turn). */
export const groupSize = (n: number): number => 3 + (n % 4);
/** They hurry in for the games, and home after: at the pace of your own little caravan (walk.ts SENDING_SPEED, twice a man's). */
export const VISITOR_SPEED = SENDING_SPEED;
/** What athletes sent to your games add to a ruler's mood (fading over a year). */
export const ATHLETES_MOOD = 5;

// ---------------------------------------------------------------------------
// Where they go.

/** Is there sea within two tiles of a footprint? */
function seaNear(map: CoastMap, x: number, z: number, side: number): boolean {
  const n = map.size;
  for (let dz = -2; dz < side + 2; dz++) {
    for (let dx = -2; dx < side + 2; dx++) {
      const tx = x + dx;
      const tz = z + dz;
      if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
      if (map.tileWater[tz * n + tx] === WATER_SEA) return true;
    }
  }
  return false;
}

/** The mean height of a footprint's corners. */
function meanHeight(map: CoastMap, x: number, z: number, side: number): number {
  let h = 0;
  for (let dz = 0; dz <= side; dz++) for (let dx = 0; dx <= side; dx++) h += map.corner(x + dx, z + dz);
  return h / ((side + 1) * (side + 1));
}

/** Why a monument (or the masons' yard) can't have its top-left tile here ('' if it can): the ground itself is checked before (build.ts). */
export function monumentRefusal(map: CoastMap, s: SimState, kind: BuildingKind, tx: number, tz: number): string {
  if (!isMonument(kind)) return '';
  if (monumentOf(s, kind) || s.buildings.some((b) => b.kind === kind)) return `Only one ${monumentName(kind).replace(/^the /, '')} to a city: yours is already marked out`;
  if (kind === 'lighthouse') {
    if (!seaNear(map, tx, tz, 3)) return 'The Lighthouse stands by the sea: on a headland over the water, where ships can see its fire';
    if (meanHeight(map, tx, tz, 3) < LIGHTHOUSE_HIGH) return 'Too low for the Lighthouse: it needs high ground over the sea, on the headland, so its fire is seen far out';
  }
  if (kind === 'colossus') {
    if (!seaNear(map, tx, tz, 3)) return 'The Colossus stands at the harbour mouth: on the shore of the bay';
    if (!berthAt(map, tx, tz)) return 'The Colossus stands over deep water, where the ships come in: the water off this shore is too shallow (the tint shows where it is deep)';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Reading the sites.

/** A site's building, if it still stands. */
export const siteBuilding = (s: SimState, x: Site): Building | undefined => {
  const b = findBuilding(s, x.id);
  return b && b.kind === x.kind ? b : undefined;
};

/** The ox carts on the road to a site (not those going home), and what they bring of a ware. */
export const cartsTo = (s: SimState, id: number): Walker[] => s.walkers.filter((w) => w.kind === 'oxcart' && w.target === id && !w.back);
export const comingTo = (s: SimState, id: number, w: Ware): number => cartsTo(s, id).reduce((a, k) => a + (k.food === w ? k.load : 0), 0);

/** The builders bound for or working at a site (not those going home), and those at work there now. */
export const buildersTo = (s: SimState, id: number): Walker[] => s.walkers.filter((w) => w.kind === 'builder' && w.target === id && !w.back);
export const buildersAt = (s: SimState, id: number): number => s.walkers.reduce((a, w) => a + (w.kind === 'builder' && w.target === id && !w.back && w.steps === 1 ? 1 : 0), 0);

/** The builders a yard has out at once, for its workers. */
export const buildersFor = (y: Building): number => {
  const r = rateOf(y);
  return r <= 0 ? 0 : Math.max(1, Math.floor(r * MAX_BUILDERS + 1e-9));
};

/** Has some armoury smiths at work to cast bronze? */
export const smithsAt = (s: SimState): boolean => s.buildings.some((b) => b.kind === 'armoury' && b.workers > 0 && rateOf(b) > 0);

/** The stage whose materials a site gathers now: the one it waits to start, or (while one is under way) the next; undefined when there is none. */
export const gathering = (x: Site): number => (x.building ? x.stage + 1 : x.stage);

/** What a site still wants of a ware for the stage it gathers for: its need, less what is on site and on the way. */
export function wantOf(s: SimState, x: Site, b: Building, w: Ware): number {
  const st = STAGES[x.kind][gathering(x)];
  if (!st) return 0;
  return Math.max(0, needOf(st, w) - held(b, w) - comingTo(s, x.id, w));
}

/** Is everything the stage waiting to start needs on site? */
export const allOnSite = (x: Site, b: Building): boolean => {
  const st = stageNow(x);
  return !!st && MATERIALS.every((w) => held(b, w) >= needOf(st, w));
};

/** A stage of bronze (the Colossus's frame and skin): cast on site by the armourers. */
export const isBronze = (x: Site): boolean => (stageNow(x)?.bronze ?? 0) > 0;

// ---------------------------------------------------------------------------
// The sites.

const freshSite = (b: Building, kind: MonumentKind): Site => ({ id: b.id, kind, stage: 0, building: false, work: 0, marked: b.placed, done: [], finished: 0 });

/** A monument's site is marked out (sim.ts, as it is placed): its record. */
export function markSite(s: SimState, b: Building): void {
  if (!isMonument(b.kind) || s.monuments.sites.some((x) => x.id === b.id)) return;
  s.monuments.sites = [...s.monuments.sites, freshSite(b, b.kind)];
}

/** A record for every monument standing, none for those gone (their goods went with them). */
function syncSites(s: SimState): void {
  const list = s.monuments.sites;
  let changed = false;
  const keep = list.filter((x) => !!siteBuilding(s, x));
  if (keep.length !== list.length) {
    // A finished one taken down: the Colossus is forgotten, and no more games.
    for (const x of list) {
      if (keep.includes(x)) continue;
      if (x.kind === 'colossus' && x.finished) for (const c of s.world.cities) c.memories = c.memories.filter((m) => m.kind !== 'colossus');
      if (x.kind === 'stadium') {
        s.monuments.games.next = 0;
        s.monuments.games.until = 0;
      }
    }
    changed = true;
  }
  for (const b of s.buildings) {
    if (!isMonument(b.kind) || keep.some((x) => x.id === b.id)) continue;
    keep.push(freshSite(b, b.kind));
    changed = true;
  }
  if (changed) {
    s.monuments.sites = keep;
    s.looks++;
  }
}

/** A stage starts: its materials are used, all at once. */
function startStage(s: SimState, x: Site, b: Building): void {
  const st = stageNow(x)!;
  for (const w of MATERIALS) {
    const n = needOf(st, w);
    if (n <= 0) continue;
    setHeld(b, w, held(b, w) - n);
    note(s, w, 'used', 'monuments', n);
  }
  x.building = true;
  x.work = 0;
  s.looks++;
}

/** A site's tick: its stage starting, worked on and finished, and its ox carts called. */
function stepSite(s: SimState, map: CoastMap, x: Site, b: Building): void {
  if (x.finished) return;
  if (!x.building && allOnSite(x, b) && (!isBronze(x) || smithsAt(s))) startStage(s, x, b);
  if (x.building) {
    const st = stageNow(x)!;
    const here = Math.min(buildersAt(s, x.id), st.builders);
    // (Bronze is cast only while the armourers are at work.)
    if (here > 0 && (!isBronze(x) || smithsAt(s))) x.work += here;
    if (x.work >= workOf(st)) {
      x.done = [...x.done, s.tick];
      x.stage++;
      x.building = false;
      x.work = 0;
      s.looks++;
      s.rev++;
      if (x.stage >= STAGE_COUNT) finish(s, x);
      else if (allOnSite(x, b) && (!isBronze(x) || smithsAt(s))) startStage(s, x, b);
    }
  }
  if (!x.finished) haul(s, map, x, b);
}

/** A site calls an ox cart for what it wants most (by cartloads), from the storehouse nearest it by road that has some. */
function haul(s: SimState, map: CoastMap, x: Site, b: Building): void {
  if (b.clock > 0) {
    b.clock--;
    return;
  }
  const size = map.size;
  const roads = roadsBeside(s, size, b);
  if (roads.length === 0 || cartsTo(s, x.id).length >= MAX_HAULS) {
    b.clock = HAUL_GAP;
    return;
  }
  const wants = MATERIALS.map((w) => ({ w, n: wantOf(s, x, b, w) }))
    .filter((o) => o.n > 0)
    .sort((a, c) => c.n / haulOf(c.w) - a.n / haulOf(a.w) || a.w - c.w);
  for (const { w, n } of wants) {
    const found = nearestBy(s, size, roads, (g) => g.kind === 'storehouse' && held(g, w) > 0);
    if (!found) continue;
    const { g, way } = found;
    const load = Math.min(haulOf(w), n, held(g, w));
    const k = newWalker(s, 'oxcart', 1);
    k.origin = g.id;
    k.target = x.id;
    k.food = w;
    k.load = load;
    k.since = s.tick;
    setHeld(g, w, held(g, w) - load);
    // (The way was found from the site's side: the cart drives it from the storehouse.)
    const rev = way.slice().reverse();
    setPath(k, wayPoints(size, door(size, g, rev[0]), rev, b));
    s.walkers.push(k);
    s.looks++;
    b.clock = HAUL_GAP;
    return;
  }
  b.clock = wants.length ? HAUL_RETRY : HAUL_GAP;
}

/** A monument finished: what Greece says of it, and what it does from now on. */
function finish(s: SimState, x: Site): void {
  x.finished = s.tick;
  const name = monumentName(x.kind);
  const w = s.world;
  // Every ruler admires it; the Colossus is remembered for good.
  let warmest: { c: WorldCity; mood: number } | null = null;
  for (const c of w.cities) {
    if (!c.ruler) continue;
    c.memories.push({ kind: 'monument', why: `Your city has finished ${name}`, amount: NOTICE_MOOD, tick: s.tick, fade: fadeFor(c, NOTICE_FADE, true) });
    if (x.kind === 'colossus') c.memories.push({ kind: 'colossus', why: COLOSSUS_WHY, amount: COLOSSUS_MOOD, tick: s.tick, fade: 0 });
    const line = settleMood(s, c, x.kind === 'colossus' ? 'they speak of your Colossus' : `your city has finished ${name}`);
    if (line) news(w, s.tick, c.id, line);
    const m = moodOf(c, s.tick);
    if (!warmest || m > warmest.mood) warmest = { c, mood: m };
  }
  if (warmest) {
    const c = warmest.c;
    news(w, s.tick, c.id, `${rulerName(c)} sends compliments on ${name}: all Greece is talking of it`);
  }
  if (x.kind === 'stadium') {
    const g = s.monuments.games;
    g.next = s.tick + FIRST_GAMES;
    g.until = 0;
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// The ox carts.

/** Move a walker along its path at a pace; 'end' when it reaches the end, 'cut' when the road ahead was taken up. */
function roll(s: SimState, w: Walker, speed: number): 'on' | 'end' | 'cut' {
  const next = w.tiles[w.seg + 1];
  if (next !== undefined && next >= 0 && s.tiles[next] !== TILE_ROAD) return 'cut';
  let move = speed;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) return 'end';
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return 'on';
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
    if (w.seg >= last) return 'end';
    const t = w.tiles[w.seg + 1];
    if (t >= 0 && s.tiles[t] !== TILE_ROAD) return 'cut';
  }
  return 'on';
}

/** A cart whose load can't be delivered puts it back in its storehouse (as much as there is room for; the rest is lost). */
function putBack(s: SimState, k: Walker, g: Building | undefined): void {
  if (k.load <= 0) return;
  const w = k.food as Ware;
  if (g) {
    const room = Math.max(0, roomOf(g.kind, w) - held(g, w));
    const back = Math.min(room, k.load);
    setHeld(g, w, held(g, w) + back);
    if (k.load > back) note(s, w, 'lost', 'monuments', k.load - back);
  } else note(s, w, 'lost', 'monuments', k.load);
  k.load = 0;
  s.looks++;
}

/** Turn a cart for home from where it stands; false if it can't get there. */
function homeward(s: SimState, map: CoastMap, k: Walker, g: Building | undefined): boolean {
  k.back = true;
  k.wait = 0;
  return !!g && goTo(s, map.size, k, g, lastRoad(s, k));
}

/** Move an ox cart one tick along. False when it is done (home, or gone). */
export function moveOxcart(s: SimState, map: CoastMap, k: Walker): boolean {
  const store = findBuilding(s, k.origin);
  const site = k.back ? undefined : findBuilding(s, k.target);
  if (!k.back && (!site || !isMonument(site.kind))) {
    if (homeward(s, map, k, store)) return true;
    putBack(s, k, undefined);
    return false;
  }
  // Unloading at the site.
  if (k.wait > 0) {
    if (--k.wait > 0) return true;
    const w = k.food as Ware;
    setHeld(site!, w, held(site!, w) + k.load);
    k.load = 0;
    s.looks++;
    if (homeward(s, map, k, store)) return true;
    return false;
  }
  const r = roll(s, k, CART_SPEED);
  if (r === 'on') return true;
  if (r === 'cut') {
    const to = k.back ? store : site;
    if (to && goTo(s, map.size, k, to, lastRoad(s, k))) return true;
    if (!k.back && homeward(s, map, k, store)) return true;
    putBack(s, k, k.back ? store : undefined);
    return false;
  }
  // The end of the way.
  if (k.back) {
    putBack(s, k, store);
    return false;
  }
  k.wait = UNLOAD;
  return true;
}

// ---------------------------------------------------------------------------
// The masons' yards and their builders.

/** Where a builder works on a site (world units): his place round the scaffold, by his number there. */
export function builderSpot(b: Building, place: number): [number, number] {
  const side = footSide(b);
  // Round the footprint, a little in from its edge, spread out by the golden ratio so a few or many stand apart.
  const inset = side >= 6 ? 0.9 : 0.45;
  const L = side - 2 * inset;
  const t = ((place * 0.618034) % 1) * 4 * L;
  const e = Math.floor(t / L);
  const u = t - e * L;
  const [x0, z0] = [b.x + inset, b.z + inset];
  return e === 0 ? [x0 + u, z0] : e === 1 ? [x0 + L, z0 + u] : e === 2 ? [x0 + L - u, z0 + L] : [x0, z0 + L - u];
}

/** Send a builder home (to his yard) from where he is; false if he can't get there. */
function sendHome(s: SimState, map: CoastMap, w: Walker): boolean {
  const y = findBuilding(s, w.origin);
  w.back = true;
  w.steps = 0;
  return !!y && goTo(s, map.size, w, y, lastRoad(s, w));
}

/** Yards send builders to the sites that want them, and call back those not wanted. */
function stepYards(s: SimState, map: CoastMap): void {
  const size = map.size;
  // Builders not wanted at their site (the stage done, or more than it needs: the last to come go first) go home.
  const gone = new Set<number>();
  for (const x of s.monuments.sites) {
    const want = x.building ? stageNow(x)!.builders : 0;
    const there = buildersTo(s, x.id);
    if (there.length <= want) continue;
    there.sort((a, b) => a.id - b.id);
    for (const w of there.slice(want)) gone.add(w.id);
  }
  for (const y of s.buildings) {
    if (y.kind !== 'masons') continue;
    const mine = s.walkers.filter((w) => w.kind === 'builder' && w.origin === y.id && !w.back && !gone.has(w.id));
    const most = buildersFor(y);
    if (mine.length > most) {
      mine.sort((a, b) => b.id - a.id);
      for (const w of mine.slice(0, mine.length - most)) gone.add(w.id);
    }
  }
  if (gone.size) {
    s.walkers = s.walkers.filter((w) => !gone.has(w.id) || sendHome(s, map, w));
    s.looks++;
  }
  // Each yard sends a builder (half a day apart) to the nearest site wanting more.
  const wanting = s.monuments.sites.filter((x) => x.building && buildersTo(s, x.id).length < stageNow(x)!.builders);
  for (const y of s.buildings) {
    if (y.kind !== 'masons') continue;
    if (y.clock > 0) {
      y.clock--;
      continue;
    }
    y.clock = BUILDER_GAP;
    if (wanting.length === 0) continue;
    const most = buildersFor(y);
    if (most === 0) continue;
    const mine = s.walkers.reduce((a, w) => a + (w.kind === 'builder' && w.origin === y.id && !w.back ? 1 : 0), 0);
    if (mine >= most) continue;
    const roads = roadsBeside(s, size, y);
    const found = nearestBy(s, size, roads, (g) => wanting.some((x) => x.id === g.id && buildersTo(s, x.id).length < stageNow(x)!.builders));
    if (!found) continue;
    const site = found.g;
    const taken = new Set(buildersTo(s, site.id).map((w) => w.food));
    let place = 0;
    while (taken.has(place)) place++;
    const w = newWalker(s, 'builder', 1);
    w.origin = y.id;
    w.target = site.id;
    w.food = place;
    w.since = s.tick;
    const pts = wayPoints(size, door(size, y, found.way[0]), found.way, site);
    // (On past the site's edge to his place on the scaffold.)
    const [sx, sz] = builderSpot(site, place);
    pts.push([sx, sz, -1]);
    setPath(w, pts);
    s.walkers.push(w);
    s.looks++;
  }
}

/** Move a builder one tick along. False when he is done (home, or gone). */
export function moveBuilder(s: SimState, map: CoastMap, w: Walker): boolean {
  if (w.steps === 1) {
    // At work: until his site is gone (stepYards calls him home otherwise).
    const site = findBuilding(s, w.target);
    if (site && isMonument(site.kind)) return true;
    return sendHome(s, map, w);
  }
  if (!w.back) {
    const site = findBuilding(s, w.target);
    if (!site || !isMonument(site.kind)) return sendHome(s, map, w);
  }
  const r = roll(s, w, WALK_SPEED);
  if (r === 'on') return true;
  if (r === 'cut') {
    if (w.back) return sendHome(s, map, w);
    const site = findBuilding(s, w.target)!;
    if (!goTo(s, map.size, w, site, lastRoad(s, w))) return sendHome(s, map, w);
    const [sx, sz] = builderSpot(site, w.food);
    w.path.push(sx, sz);
    w.tiles.push(-1);
    return true;
  }
  if (w.back) return false;
  w.steps = 1;
  return true;
}

// ---------------------------------------------------------------------------
// The games.

/** Where a group of visitors sits in the Stadium (world units), by its number. */
export function seatOf(b: Building, n: number): [number, number] {
  // Along the banks either side of the track (the Stadium's long sides run along x).
  const side = footSide(b);
  const along = 1 + ((n * 0.618034) % 1) * (side - 2);
  const bank = n % 2 === 0 ? 0.75 : side - 0.75;
  return [b.x + along, b.z + bank];
}

/** A group of visitors walks in from the edge of the map to the Stadium, if a road joins them. */
function sendVisitors(s: SimState, map: CoastMap, b: Building, end: number): boolean {
  const size = map.size;
  const search = roadSearch(s, size, roadsBeside(s, size, b));
  const edge = nearestEdge(search, s, size);
  if (edge < 0) return false;
  const tiles = tracePath(search, edge).reverse();
  // (Not if they would get there after the games are over.)
  if (s.tick + (tiles.length + 2 * OFF_MAP) / VISITOR_SPEED >= end) return false;
  const g = s.monuments.games;
  const v = newWalker(s, 'visitor', groupSize(g.groups));
  v.origin = b.id;
  v.target = b.id;
  v.since = s.tick;
  v.food = g.groups;
  const [ox, oz] = offMapPoint(size, edge);
  const pts: Array<[number, number, number]> = [[ox, oz, -1]];
  for (const t of tiles) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, b, tiles[tiles.length - 1]);
  pts.push([dx, dz, -1]);
  const [sx, sz] = seatOf(b, g.groups);
  pts.push([sx, sz, -1]);
  setPath(v, pts);
  s.walkers.push(v);
  g.groups++;
  s.looks++;
  return true;
}

/** Visitors leave: by road to the nearest edge of the map, and off it. False if no road leads out. */
function sendOff(s: SimState, map: CoastMap, v: Walker, b: Building | undefined): boolean {
  const size = map.size;
  v.back = true;
  v.steps = 0;
  const from = b ? roadsBeside(s, size, b) : [];
  const start = lastRoad(s, v);
  const search = roadSearch(s, size, start >= 0 ? [start] : from);
  const edge = nearestEdge(search, s, size);
  if (edge < 0) return false;
  const pts: Array<[number, number, number]> = [[...position(v), -1]];
  for (const t of tracePath(search, edge)) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [ox, oz] = offMapPoint(size, edge);
  pts.push([ox, oz, -1]);
  setPath(v, pts);
  return true;
}

/** Move a group of visitors one tick along. False when they are gone. */
export function moveVisitor(s: SimState, map: CoastMap, v: Walker): boolean {
  const b = findBuilding(s, v.target);
  if (v.steps === 1) {
    if (!b) return sendOff(s, map, v, b);
    // (Come early: they wait in their seats for the opening.)
    if (gamesSoon(s)) return true;
    if (--v.wait > 0) return true;
    return sendOff(s, map, v, b);
  }
  if (!v.back && (!b || b.kind !== 'stadium')) return sendOff(s, map, v, undefined);
  const r = roll(s, v, VISITOR_SPEED);
  if (r === 'on') return true;
  if (r === 'cut') return sendOff(s, map, v, b);
  if (v.back) return false;
  // In their seats: they pay, and watch a few days.
  const g = s.monuments.games;
  const dr = v.people * VISITOR_PAYS;
  income(s, dr, 'sales', 'visitors at the games', v.people);
  g.visitors += v.people;
  g.takings += dr;
  v.steps = 1;
  v.wait = WATCH + (v.food % 7) * TICKS_PER_DAY;
  s.looks++;
  return true;
}

/** Are the games announced and not yet open? */
export const gamesSoon = (s: SimState): boolean => {
  const g = s.monuments.games;
  return g.until <= s.tick && g.next > s.tick && g.next - s.tick <= GAMES_NOTICE && isFinished(s, 'stadium');
};

/** The rulers who send athletes: those cordial or better, by name of city. */
const athleteCities = (s: SimState): WorldCity[] => s.world.cities.filter((c) => c.ruler && moodOf(c, s.tick) >= 0);

/** "Corinth, Sparta and Argos". */
const andList = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The games: opened when due, visitors sent while they are on, closed after a month. */
function stepGames(s: SimState, map: CoastMap): void {
  const stadium = monumentOf(s, 'stadium');
  const g = s.monuments.games;
  if (!stadium || !stadium.finished) return;
  const b = siteBuilding(s, stadium);
  if (!b) return;
  const w = s.world;
  if (g.until > 0 && s.tick >= g.until) {
    g.until = 0;
    g.ended = s.tick;
    s.rev++;
    return;
  }
  // Announced: the tallies start afresh for these games (their first visitors set out now).
  if (g.until === 0 && g.next > 0 && s.tick === g.next - GAMES_NOTICE) {
    g.groups = 0;
    g.visitors = 0;
    g.takings = 0;
  }
  if (g.until === 0 && g.next > 0 && s.tick >= g.next) {
    g.held++;
    g.until = s.tick + GAMES_LAST;
    g.next = s.tick + GAMES_EVERY;
    const sent = athleteCities(s);
    for (const c of sent) {
      c.memories.push({ kind: 'games', why: 'Their athletes ran at your games', amount: ATHLETES_MOOD, tick: s.tick, fade: fadeFor(c, TICKS_PER_YEAR, true) });
      const line = settleMood(s, c, 'their athletes ran at your games');
      if (line) news(w, s.tick, c.id, line);
    }
    if (sent.length) news(w, s.tick, sent[0].id, `The games open at your Stadium: athletes have come from ${andList(sent.map((c) => PLACES[c.id].name))}`);
    s.rev++;
  }
  // Visitors set out from the announcement on, while they would still arrive before the games end.
  const opens = g.until > s.tick ? g.until - GAMES_LAST : g.next;
  if (opens > 0 && s.tick >= opens - GAMES_NOTICE && (s.tick - (opens - GAMES_NOTICE)) % VISITOR_GAP === 0) sendVisitors(s, map, b, opens + GAMES_LAST);
}

// ---------------------------------------------------------------------------
// The tick.

/**
 * The slice's tick, after the quarries': the sites (stages starting, worked
 * and finished; ox carts called), the masons' yards (builders sent and called
 * home), and the games. Nothing in a town with no monument and no yard.
 */
export function stepMonuments(s: SimState, map: CoastMap): void {
  const m = s.monuments;
  if (m.sites.length === 0 && !s.buildings.some((b) => isMonument(b.kind) || b.kind === 'masons')) return;
  syncSites(s);
  for (const x of s.monuments.sites) {
    const b = siteBuilding(s, x);
    if (b) stepSite(s, map, x, b);
  }
  stepYards(s, map);
  if (isFinished(s, 'stadium')) stepGames(s, map);
}

/** The marble, timber and bronze names, for lines about them. */
export const materialName = (w: Ware): string => (w === COPPER ? 'bronze' : w === MARBLE ? 'marble' : w === TIMBER ? 'timber' : WARE_NAMES[w]);
