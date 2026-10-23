/**
 * The fleet (slice 26): the shipyard and its triremes, enemy ships in your
 * bay, and pirates on the sea lanes.
 *
 * - **The shipyard** (3 x 3 on the shore, placed like the trading post) builds
 *   one trireme at a time, paid for as it is ordered, and moors up to three at
 *   its jetty, side by side off its end. A trireme needs CREW rowers: one man a
 *   home, from the huts and cottages, a few a day while she is short, who leave
 *   their jobs and are paid monthly on their own line of the ledger. Moored,
 *   she is mended a little each day while the yard has its shipwrights.
 * - **Ships in the bay.** A band from the sea (raids.ts) comes in ships that
 *   show on the horizon and sail in, each to its own spot on the beach nearest
 *   what the band came for. When every ship still afloat is drawn up, the band
 *   lands (raids.ts: landBand); it comes back to them, and they sail off with
 *   what it carried. Every trireme at home, crewed and sound, rows out to meet
 *   enemy ships in your waters, rams them, and they strike back; a ship whose
 *   hull runs out lists and sinks, with the men aboard. A trireme badly hurt
 *   rows home to mend; with no enemy left, they row back to the jetty.
 * - **Pirates** now and then take up a place on a sea lane you trade over:
 *   seen first, preying on what of yours passes their place a while later,
 *   gone after some months. A trireme sent to guard the lane keeps it safe,
 *   and a fight there is resolved on the map with a report.
 *
 * Pure and deterministic: the fights' dice are hashes of the seed, the tick
 * and the ship; Greece's pirates use Greece's dice by month. A town with no
 * shipyard, no raid from the sea and no sea route has an empty fleet, and
 * this does nothing.
 */
import type { CoastMap } from '../map/bake';
import { WATER_SEA } from '../map/bake';
import { dhypot } from '../map/dmath';
import { HORIZON_ALONG, lineLength, PLACES, siteOf, wayOf, wayPoints, WAYS, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { armyNews, eldestMan, knownBy, servingHomes } from './army';
import { findBuilding, livedIn, HUT, COTTAGE, centreOf } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { giftOnMap, giftWords, news } from './diplomacy';
import { undelivered } from './favours';
import { WORK_SHARE, rateOf } from './labour';
import { landBand, lostAtSea, raidOfShips } from './raids';
import { roadsBeside } from './rounds';
import { routeWay, voyageTicks } from './routes';
import type { Building, EnemyShip, Expedition, Fleet, Pirates, Raid, Rower, ServesAs, SimState, Trireme } from './state';
import { berthAt, pathLength, pointAlong } from './trade';
import { pay, settle, spendable } from './treasury';
import { guarded, preyingOn, ROWER_PAY } from './lanes';
// Slice 33: winter storms slow ships in the bay.
import { seaPace } from './seasons';
// Slice 35: pirates keep clear while the Lighthouse burns.
import { piratesKeepClear } from './monuments';
// Slice 38: blockades, warships, expeditions at sea, a laden ship's loot.
import { BAY_TICKS, blockadeOf, stepBlockades, stepWarships, type Blockade } from './blockades';
import { expeditionOnMap } from './expeditions';
import { regainAtSea } from './raids';
import { change } from './growth';

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** A trireme's price, how long she takes to build at a fully staffed yard, and how many a yard moors. */
export const TRIREME_COST = 400;
export const BUILD_TICKS = 30 * TICKS_PER_DAY;
export const PER_YARD = 3;
/** Rowers a trireme needs, those a day who come while she is short, and a rower's pay a month. */
export const CREW = 12;
export const ROWERS_A_DAY = 4;
export { ROWER_PAY, guarded, preyingOn };
/** How much of her hull a moored trireme gets back a day at a staffed yard (slice 38: 6, was 3; and 12 of her oars). */
export const MEND_A_DAY = 6;
/** Her names, one per number in turn. */
export const NAMES = ['Nike', 'Glaukos', 'Paralos', 'Salaminia', 'Amphitrite', 'Delphis', 'Euploia', 'Thalassa', 'Hippokampos', 'Nereis', 'Kymothoe', 'Galene'] as const;
/** Paces (tiles a tick): a trireme rowing; an enemy ship far out and across the bay. */
export const ROW_PACE = 0.55;
export const FAR_PACE = 0.8;
export const BAY_PACE = 0.45;
/** How far beyond the map's edge enemy ships first show, and how far apart (ticks) they set off. */
export const RAIDER_HORIZON = 30;
const STAGGER = 10;
/** Men to a ship, and how many ships a band comes in. */
export const SHIP_MEN = 8;
const SHIPS_LEAST = 2;
const SHIPS_MOST = 4;
/** Men an enemy ship leaves to guard her on the beach. */
const GUARDS = 2;
/** A trireme rams from this near (tiles), every so many ticks (and a few more, by the dice). */
export const RAM_REACH = 0.9;
const RAM_COOL = 15;
/** The odds a ram strikes home (with a full crew; less with fewer rowers), and what it takes off a hull (more off a ship on the beach). */
const RAM_HIT = 0.6;
const RAM_HURT = 20;
const RAM_MORE = 15;
const BEACHED_HURT = 1.3;
/** An enemy ship strikes back at a trireme this near, every so many ticks: the odds and what it takes off. On the beach, only her guards. */
const STRIKE_REACH = 1.1;
const STRIKE_COOL = 14;
const STRIKE_HIT = 0.45;
const STRIKE_HIT_BEACHED = 0.2;
const STRIKE_HURT = 6;
const STRIKE_MORE = 6;
/** A trireme goes out only with half her rowers and her hull at FIT or better, and breaks off below BREAK_OFF. */
export const FIT = 60;
export const BREAK_OFF = 35;
/** How much farther (tiles) a trireme will row for an enemy ship nobody else is on. */
const SPREAD = 15;
/** How long a ship takes to go under (ticks). */
export const SINK_TICKS = 40;
/** How far apart triremes moor, side by side off the jetty’s end (a little more than two beams, outriggers and all: review of slice 26, they touched). */
const MOOR_GAP = 1.45;
/** Your waters: enemy ships this far beyond the map's edge are fought too. */
const WATERS = 2;

// Slice 38: oars, wounds and repairs.
/** Of her oars, a moored trireme's shipwrights mend this many a day (a share with fewer); an enemy's blow that strikes home breaks this many and up to OARS_MORE more; her own ram breaks a few, one time in four. */
export const OARS_A_DAY = 12;
// (At slice 38's merge: 6 to 14 a blow, was 10 to 25. With those, a trireme broke off for her oars after three or four
// blows, half as many as her hull takes, and two triremes stopped a two-ship landing about one time in three, not nine
// in ten as before slice 38; with these and the sharing of foes in stepBay, about four in five.)
const OARS_HURT = 6;
const OARS_MORE = 8;
const RAM_OARS_ODDS = 1 / 4;
const RAM_OARS = 3;
const RAM_OARS_MORE = 5;
/** Under this many oars whole she breaks off and limps home; with none whole she rows at LIMP of her pace. */
export const CRIPPLED_OARS = 40;
const LIMP = 0.35;
/** Enemy ships from the sea: the last of a band's ships is on the beach about this long after the first set off (never slower than the usual paces). */
const BEACH_TICKS = 14 * TICKS_PER_DAY;
/** A blockade's ships come in from this far beyond the edge, and lie this far apart across the harbour's mouth. */
const BLOCKADE_HORIZON = 24;
const BLOCKADE_GAP = 4;
/** (Review of slice 38.) A blockade's ships set off from the horizon this far apart (ticks). */
const BLOCKADE_STAGGER = 5;

/** Pirates: none before your first sea route is this old; the odds a month once they may come; how long they are seen before they prey; how long they stay; the lull after. */
const PIRATES_AFTER = TICKS_PER_YEAR;
const PIRATE_ODDS = 1 / 10;
export const PIRATE_WARNING = 15 * TICKS_PER_DAY;
const PIRATE_STAY = 4 * TICKS_PER_MONTH;
const PIRATE_LULL = 6 * TICKS_PER_MONTH;
/** How long a beaten trireme's guard waits before it fights the same pirates again. */
const REFIGHT = 10 * TICKS_PER_DAY;

/** The places on the lanes where pirates lie (a point of the way, by its index), and their names. */
export const PIRATE_PLACES: ReadonlyArray<{ way: string; city: CityId; at: number; name: string }> = [
  { way: 'athens-sea', city: 'athens', at: 6, name: 'off Cape Skyllaion' },
  { way: 'corinth-sea', city: 'corinth', at: 8, name: 'off Aegina' },
  { way: 'troy-sea', city: 'troy', at: 8, name: 'off Kea' },
  // Slice 38: the newcomers' lanes.
  { way: 'knossos-sea', city: 'knossos', at: 7, name: 'off Melos' },
  { way: 'rhodes-sea', city: 'rhodes', at: 8, name: 'off Thera' },
  { way: 'memphis-sea', city: 'memphis', at: 10, name: 'off Cape Sidero' },
];

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

export const freshFleet = (): Fleet => ({ triremes: [], ships: [], pirates: [], reports: [], nextId: 1, blockades: [] });

/** The city's dice for a sea fight: a number in [0, 1) from the tick, who, and what for. */
const roll = (s: SimState, who: number, salt: number): number => hash2(s.tick, who * 16 + salt, (s.seed ^ 0x666c6565) | 0);
/** Greece's dice for the pirates, by month (or pirates' number) and purpose. */
const dice = (s: SimState, n: number, salt: number): number => hash2(n, salt, (s.world.seed ^ 0x70697261) | 0);

// ---------------------------------------------------------------------------
// Looking things up.

/** "the trireme Nike". */
export const triremeName = (t: Pick<Trireme, 'n'>): string => NAMES[(t.n - 1) % NAMES.length] + (t.n > NAMES.length ? ` ${['', 'II', 'III', 'IV'][Math.floor((t.n - 1) / NAMES.length)] ?? ''}`.trimEnd() : '');
export const triremeOf = (s: SimState, id: number): Trireme | undefined => s.fleet.triremes.find((t) => t.id === id);
/** A yard's triremes (building or afloat). */
export const triremesAt = (s: SimState, yard: number): Trireme[] => s.fleet.triremes.filter((t) => t.yard === yard);
/** Is a ship afloat (not going under)? */
export const afloat = (o: { state: string }): boolean => o.state !== 'sinking';
/** The enemy ships of a raid (not those going under). */
export const shipsOf = (s: SimState, r: Raid): EnemyShip[] => s.fleet.ships.filter((e) => e.raid === r.id && afloat(e));
/** Are a band's ships still sailing in, or drawn up on the beach waiting for it? */
export const seaborne = (s: SimState, r: Raid): boolean => s.fleet.ships.some((e) => e.raid === r.id && (e.state === 'sailing' || e.state === 'beached'));
/** Rowers serving now (every trireme's crew), by home. */
export function rowingHomes(s: SimState): Set<number> {
  const out = new Set<number>();
  for (const t of s.fleet.triremes) for (const r of t.crew) out.add(r.home);
  return out;
}
/** The trireme a home's man rows in, and the man, if any. */
export function rowerFrom(s: SimState, b: Building): { t: Trireme; r: Rower } | undefined {
  for (const t of s.fleet.triremes) for (const r of t.crew) if (r.home === b.id) return { t, r };
  return undefined;
}
/** Is a trireme fit to go out: half her rowers, a sound hull and oars (slice 38), and not laid up under repair? */
export const fit = (t: Trireme): boolean => t.crew.length * 2 >= CREW && t.hp >= FIT && t.oars >= FIT && !t.mend;
/** Slice 38: her pace rowing, with her oars broken: down to LIMP of it with none whole. */
export const oarPace = (t: Trireme): number => ROW_PACE * (LIMP + (1 - LIMP) * clamp(t.oars, 0, 100) / 100);
/** Slice 38: too hurt to fight on: her hull under BREAK_OFF, or under CRIPPLED_OARS oars whole. */
export const crippled = (t: Trireme): boolean => t.hp < BREAK_OFF || t.oars < CRIPPLED_OARS;
/** Slice 38: days until she is whole at her yard's pace now (0: whole; -1: not being mended, her yard gone or unstaffed). */
export function daysToMend(s: SimState, t: Trireme): number {
  if (t.hp >= 100 && t.oars >= 100) return 0;
  const yard = findBuilding(s, t.yard);
  const rate = yard ? rateOf(yard) : 0;
  if (rate <= 0) return -1;
  return Math.max(Math.ceil((100 - t.hp) / (MEND_A_DAY * rate)), Math.ceil((100 - t.oars) / (OARS_A_DAY * rate)), 1);
}

// ---------------------------------------------------------------------------
// The water: where ships can go.

interface Sea {
  /** 1 for sea joined to the open sea (any depth: these ships draw little). */
  open: Uint8Array;
  /** Steps over it to the map's edge (-1: none). */
  toEdge: Int32Array;
}
const seas = new WeakMap<CoastMap, Sea>();

function steps(n: number, open: Uint8Array, t: number): number[] {
  const x = t % n;
  const z = (t - x) / n;
  const out: number[] = [];
  for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
    const ux = x + dx;
    const uz = z + dz;
    if (ux >= 0 && uz >= 0 && ux < n && uz < n) out.push(uz * n + ux);
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ux = x + dx;
    const uz = z + dz;
    if (ux >= 0 && uz >= 0 && ux < n && uz < n && open[z * n + ux] && open[uz * n + x]) out.push(uz * n + ux);
  }
  return out;
}

/** The sea joined to the open sea, and how far each tile of it is from the map's edge (worked out once per map). */
export function seaOf(map: CoastMap): Sea {
  let f = seas.get(map);
  if (f) return f;
  const n = map.size;
  const wet = new Uint8Array(n * n);
  for (let t = 0; t < n * n; t++) wet[t] = map.tileWater[t] === WATER_SEA ? 1 : 0;
  const open = new Uint8Array(n * n);
  const toEdge = new Int32Array(n * n).fill(-1);
  const queue: number[] = [];
  for (let t = 0; t < n * n; t++) {
    const x = t % n;
    const z = (t - x) / n;
    if (wet[t] && (x === 0 || z === 0 || x === n - 1 || z === n - 1)) {
      toEdge[t] = 0;
      open[t] = 1;
      queue.push(t);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    for (const u of steps(n, wet, t)) {
      if (!wet[u] || toEdge[u] >= 0) continue;
      toEdge[u] = toEdge[t] + 1;
      open[u] = 1;
      queue.push(u);
    }
  }
  f = { open, toEdge };
  seas.set(map, f);
  return f;
}

/** Is a point on open water (or beyond the map's edge)? */
export function onWater(map: CoastMap, x: number, z: number): boolean {
  const n = map.size;
  if (x < 0 || z < 0 || x >= n || z >= n) return true;
  return seaOf(map).open[Math.floor(z) * n + Math.floor(x)] === 1;
}

/** Can a ship row straight from a to b, over water all the way? */
function clearWater(map: CoastMap, ax: number, az: number, bx: number, bz: number): boolean {
  const d = dhypot(bx - ax, bz - az);
  const k = Math.max(1, Math.ceil(d / 0.35));
  for (let i = 1; i < k; i++) {
    const f = i / k;
    if (!onWater(map, ax + (bx - ax) * f, az + (bz - az) * f)) return false;
  }
  return true;
}

const mid = (n: number, t: number): [number, number] => [(t % n) + 0.5, Math.floor(t / n) + 0.5];
const tileOf = (n: number, x: number, z: number): number => clamp(Math.floor(z), 0, n - 1) * n + clamp(Math.floor(x), 0, n - 1);

/** Points pulled straight: from the first, on to the farthest it can row to straight. */
function straighten(map: CoastMap, pts: Array<[number, number]>): number[] {
  if (pts.length <= 2) return pts.flat();
  const out: Array<[number, number]> = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearWater(map, pts[i][0], pts[i][1], pts[j][0], pts[j][1])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out.flat();
}

/** The nearest tile of open water to a point (itself if it is on one; -1 if none within a few tiles). */
function waterTile(map: CoastMap, x: number, z: number): number {
  const n = map.size;
  const sea = seaOf(map);
  const t = tileOf(n, x, z);
  if (sea.open[t]) return t;
  let best = -1;
  let bd = Infinity;
  const tx = t % n;
  const tz = Math.floor(t / n);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const ux = tx + dx;
    const uz = tz + dz;
    if (ux < 0 || uz < 0 || ux >= n || uz >= n || !sea.open[uz * n + ux]) continue;
    const d = dhypot(ux + 0.5 - x, uz + 0.5 - z);
    if (d < bd - 1e-9) {
      bd = d;
      best = uz * n + ux;
    }
  }
  return best;
}

/**
 * A way over water from (x, z) out of your waters: down the steps to the
 * map's edge, then straight out to `beyond` tiles past it, `aside` tiles to
 * one side (so ships coming in together don't come along one line). Pulled
 * straight. As x, z pairs from (x, z).
 */
export function wayOut(map: CoastMap, x: number, z: number, beyond: number, aside = 0): number[] {
  const n = map.size;
  const sea = seaOf(map);
  const pts: Array<[number, number]> = [[x, z]];
  let t = waterTile(map, x, z);
  if (t < 0) t = tileOf(n, x, z);
  for (let guard = 0; guard < n * 4 && sea.toEdge[t] > 0; guard++) {
    let best = -1;
    for (const u of steps(n, sea.open, t)) if (sea.open[u] && sea.toEdge[u] < sea.toEdge[t] && (best < 0 || sea.toEdge[u] < sea.toEdge[best])) best = u;
    if (best < 0) break;
    t = best;
    pts.push(mid(n, t));
  }
  const ex = t % n;
  const ez = Math.floor(t / n);
  const [nx, nz] = ex === 0 ? [-1, 0] : ex === n - 1 ? [1, 0] : ez === 0 ? [0, -1] : [0, 1];
  const [lx, lz] = pts[pts.length - 1];
  pts.push([lx + nx * 6, lz + nz * 6]);
  pts.push([lx + nx * beyond - nz * aside, lz + nz * beyond + nx * aside]);
  return straighten(map, pts);
}

/** A way over water from (x0, z0) to (x1, z1) (fewest steps, pulled straight), or null if there is none. */
export function wayTo(map: CoastMap, x0: number, z0: number, x1: number, z1: number): number[] | null {
  if (clearWater(map, x0, z0, x1, z1)) return [x0, z0, x1, z1];
  const n = map.size;
  const sea = seaOf(map);
  const a = waterTile(map, x0, z0);
  const b = waterTile(map, x1, z1);
  if (a < 0 || b < 0) return null;
  const from = new Int32Array(n * n).fill(-1);
  from[a] = a;
  const queue = [a];
  for (let i = 0; i < queue.length && from[b] < 0; i++) {
    const t = queue[i];
    for (const u of steps(n, sea.open, t)) {
      if (!sea.open[u] || from[u] >= 0) continue;
      from[u] = t;
      queue.push(u);
    }
  }
  if (from[b] < 0) return null;
  const tiles: number[] = [];
  for (let t = b; t !== a; t = from[t]) tiles.push(t);
  tiles.reverse();
  const pts: Array<[number, number]> = [[x0, z0], ...tiles.slice(0, -1).map((t) => mid(n, t)), [x1, z1]];
  return straighten(map, pts);
}

/** A ship's step along her way at a pace; true once she is at its end. Her heading follows the way. */
function sail(o: { x: number; z: number; hx: number; hz: number; path: number[]; along: number }, pace: number): boolean {
  if (o.path.length < 4) return true;
  const L = pathLength(o.path);
  o.along = Math.min(L, o.along + pace);
  const p = pointAlong(o.path, o.along);
  o.x = p.x;
  o.z = p.z;
  o.hx = p.dx;
  o.hz = p.dz;
  return o.along >= L - 1e-9;
}

/** Set a ship off on a new way from where she is. */
function setWay(o: { path: number[]; along: number }, path: number[]): void {
  o.path = path;
  o.along = 0;
}

// ---------------------------------------------------------------------------
// The shipyard and its moorings.

/** Where a yard's triremes moor: side by side off the end of its jetty (world units, and which way they lie). */
export function moorings(map: CoastMap, yard: Building): Array<{ x: number; z: number; hx: number; hz: number }> {
  const berth = berthAt(map, yard.x, yard.z);
  if (!berth) return [];
  const out: Array<{ x: number; z: number; hx: number; hz: number }> = [];
  for (let k = 0; k < PER_YARD + 2 && out.length < PER_YARD; k++) {
    // (The first a little off the jetty's end, so she lies clear of its planks.)
    const x = berth.x + berth.ox * (0.5 + k * MOOR_GAP);
    const z = berth.z + berth.oz * (0.5 + k * MOOR_GAP);
    if (!onWater(map, x, z) || !onWater(map, x + berth.hx * 1.6, z + berth.hz * 1.6) || !onWater(map, x - berth.hx * 1.6, z - berth.hz * 1.6)) continue;
    out.push({ x, z, hx: berth.hx, hz: berth.hz });
  }
  return out;
}

/** A trireme's mooring: her place among her yard's afloat triremes (or where she lies, with her yard gone). */
export function mooringOf(s: SimState, map: CoastMap, t: Trireme): { x: number; z: number; hx: number; hz: number } {
  const yard = findBuilding(s, t.yard);
  if (!yard) return { x: t.x, z: t.z, hx: t.hx, hz: t.hz };
  const spots = moorings(map, yard);
  const mine = s.fleet.triremes.filter((o) => o.yard === t.yard && o.state !== 'building' && o.state !== 'sinking');
  const i = Math.max(0, mine.indexOf(t));
  return spots[Math.min(i, spots.length - 1)] ?? { x: t.x, z: t.z, hx: t.hx, hz: t.hz };
}

/** Why a trireme can't be ordered at this yard now, or '' if it can. */
export function orderRefusal(s: SimState, b: Building | undefined): string {
  if (!b || b.kind !== 'shipyard') return 'Triremes are built at a shipyard';
  const at = triremesAt(s, b.id).filter((t) => t.state !== 'sinking');
  if (at.some((t) => t.state === 'building')) return 'A trireme is on the slip already: one at a time';
  if (at.length >= PER_YARD) return `A shipyard moors ${PER_YARD} triremes: build another yard for more`;
  if (spendable(s) < TRIREME_COST) return `The treasury can’t spare the ${TRIREME_COST} dr a trireme costs`;
  return '';
}

/** Order a trireme at a shipyard (a command): paid now, she is built on its slip. */
export function orderTrireme(s: SimState, map: CoastMap, yardId: number): Trireme | null {
  const b = findBuilding(s, yardId);
  if (orderRefusal(s, b) !== '' || !b) return null;
  const used = new Set(s.fleet.triremes.map((t) => t.n));
  let n = 1;
  while (used.has(n)) n++;
  const [cx, cz] = centreOf(b);
  const t: Trireme = {
    id: s.fleet.nextId++,
    n,
    yard: b.id,
    state: 'building',
    task: '',
    order: 'bay',
    lane: '',
    x: cx,
    z: cz,
    hx: 1,
    hz: 0,
    path: [],
    along: 0,
    hp: 100,
    work: 0,
    crew: [],
    foe: 0,
    cool: 0,
    rammed: 0,
    struck: 0,
    start: 0,
    dur: 0,
    a0: 0,
    a1: 0,
    homeward: false,
    sank: 0,
    owed: 0,
    oars: 100,
    mend: false,
  };
  s.fleet.triremes.push(t);
  pay(s, -TRIREME_COST, 'building', 'trireme');
  void map;
  s.rev++;
  return t;
}

/** A shipyard is gone (cleared, burnt, fallen in): a trireme on its slip is lost; those afloat ride where they are, with nowhere to be mended. */
export function yardGone(s: SimState, b: Building): void {
  const f = s.fleet;
  if (!f.triremes.some((t) => t.yard === b.id)) return;
  f.triremes = f.triremes.filter((t) => !(t.yard === b.id && t.state === 'building'));
  for (const t of f.triremes) if (t.yard === b.id) t.yard = 0;
  s.rev++;
}

// ---------------------------------------------------------------------------
// Rowers.

/** Can a home spare a rower: a hut or a cottage, lived in, with someone of working age left once he goes, a grown man, and none of its men serving already? */
export function canRow(s: SimState, b: Building, serving: Set<number>): boolean {
  if (!livedIn(b) || b.level < HUT || b.level > COTTAGE || serving.has(b.id)) return false;
  if (Math.floor(b.people * WORK_SHARE) < 1) return false;
  return eldestMan(s, b) !== null;
}

/** Call up to `most` rowers for a trireme from the homes nearest her yard that can spare one. */
function callRowers(s: SimState, t: Trireme, yard: Building, most: number, serving: Set<number>): number {
  const [yx, yz] = centreOf(yard);
  const homes = s.buildings
    .filter((h) => h.kind === 'home' && canRow(s, h, serving))
    .map((h) => ({ h, d: dhypot(centreOf(h)[0] - yx, centreOf(h)[1] - yz) }))
    .sort((p, q) => p.d - q.d || p.h.id - q.h.id);
  let n = 0;
  for (const { h } of homes) {
    if (n >= most) break;
    const p = eldestMan(s, h);
    if (!p) continue;
    t.crew.push({ home: h.id, name: p.name, father: knownBy(h, p), house: h.family?.name ?? '', kin: p.role as ServesAs });
    serving.add(h.id);
    n++;
  }
  if (n) s.rev++;
  return n;
}

/**
 * How many homes could send a rower now (huts and cottages with a man to
 * spare): the shipyard's tip and the trireme button say so before you pay,
 * since a town grown past its cottages has nobody to row (review of phase 4:
 * a natural town of fine houses built a trireme that lay unmanned for years).
 */
export const rowersSpare = (s: SimState): number => {
  const serving = new Set([...servingHomes(s)]);
  return s.buildings.filter((h) => h.kind === 'home' && canRow(s, h, serving)).length;
};

/** The caution, in words, when fewer homes can spare a rower than a trireme needs ('' when enough can). */
export function rowersWarning(s: SimState): string {
  const n = rowersSpare(s);
  if (n >= CREW) return '';
  if (n === 0) return `No hut or cottage in the city can spare a man to row now: a trireme would lie at her mooring unmanned until some can (townhouses and better don’t send rowers)`;
  return `Only ${n} ${n === 1 ? 'hut or cottage' : 'huts and cottages'} can spare a man to row now, of the ${CREW} a trireme needs`;
}

/** Why a trireme is short of rowers, in words ('' while she isn't, or they are coming). */
export function crewWhy(s: SimState, map: CoastMap, t: Trireme): string {
  if (t.crew.length >= CREW || t.state === 'building' || t.state === 'sinking') return '';
  const yard = findBuilding(s, t.yard);
  if (!yard) return 'Her shipyard is gone: nobody comes to row';
  if (roadsBeside(s, map.size, yard).length === 0) return 'Her shipyard needs a road beside it: the rowers come down by the road';
  if (rateOf(yard) <= 0) return 'Her shipyard has no shipwrights to take the rowers on';
  const serving = new Set([...servingHomes(s)]);
  const spare = s.buildings.filter((h) => h.kind === 'home' && canRow(s, h, serving)).length;
  return spare === 0 ? 'No hut or cottage can spare a man to row' : '';
}

// ---------------------------------------------------------------------------
// Each tick.

/** The fleet's tick: the yards' work, rowers, pay and mending (daily), ships in the bay, triremes on the lanes, and pirates. */
export function stepFleet(s: SimState, map: CoastMap): void {
  const f = s.fleet;
  const yards = f.triremes.length > 0 || s.buildings.some((b) => b.kind === 'shipyard');
  if (yards) {
    for (const t of f.triremes) if (t.state === 'building') build(s, map, t);
    if (s.tick % TICKS_PER_DAY === 0) daily(s, map);
    if (s.tick % TICKS_PER_MONTH === 0 && f.triremes.some((t) => t.crew.length > 0 || t.owed > 0)) monthly(s);
  }
  if (f.ships.length || f.triremes.some((t) => t.state === 'rowing' || t.state === 'sinking')) stepBay(s, map);
  if (f.triremes.some((t) => t.state === 'away')) stepAway(s, map);
  stepPirates(s);
  // Slice 38: fleets sent to blockade your harbour.
  stepBlockades(s, map);
}

/** A trireme on the slip: the shipwrights' work, at the yard's rate; done, she is launched and moors. */
function build(s: SimState, map: CoastMap, t: Trireme): void {
  const yard = findBuilding(s, t.yard);
  if (!yard) return;
  t.work += rateOf(yard);
  if (t.work < BUILD_TICKS) return;
  t.state = 'moored';
  t.work = BUILD_TICKS;
  const m = mooringOf(s, map, t);
  t.x = m.x;
  t.z = m.z;
  t.hx = m.hx;
  t.hz = m.hz;
  armyNews(s, `The trireme ${triremeName(t)} is launched at the shipyard${t.crew.length < CREW ? `: she needs ${CREW} rowers from the huts and cottages` : ''}`, t.yard);
  s.rev++;
}

function daily(s: SimState, map: CoastMap): void {
  const f = s.fleet;
  let serving: Set<number> | null = null;
  for (const t of f.triremes) {
    if (t.state === 'building' || t.state === 'sinking') continue;
    // A rower whose home is gone (or no longer lived in) leaves.
    const before = t.crew.length;
    t.crew = t.crew.filter((r) => {
      const h = findBuilding(s, r.home);
      return !!h && livedIn(h);
    });
    if (t.crew.length !== before) s.rev++;
    const yard = findBuilding(s, t.yard);
    if (!yard) continue;
    // Mended at her yard (slice 38: her hull and her oars, at the shipwrights' rate; laid up until whole, then ready).
    if (t.state === 'moored' && (t.hp < 100 || t.oars < 100) && rateOf(yard) > 0) {
      t.hp = Math.min(100, t.hp + MEND_A_DAY * rateOf(yard));
      t.oars = Math.min(100, t.oars + OARS_A_DAY * rateOf(yard));
      if (t.mend && t.hp >= 100 && t.oars >= 100) {
        t.mend = false;
        armyNews(s, `The trireme ${triremeName(t)} is mended, hull and oars: she is ready to go out again`, t.yard);
      }
      s.rev++;
    }
    // Rowers come down while she is short (not while she is away).
    if (t.crew.length < CREW && t.state !== 'away' && rateOf(yard) > 0 && roadsBeside(s, map.size, yard).length > 0) {
      serving ??= servingHomes(s);
      callRowers(s, t, yard, Math.min(ROWERS_A_DAY, CREW - t.crew.length), serving);
    }
  }
}

/** The first of the month: rowers unpaid a month go home; the rest are owed their month, and paid what the treasury can. */
function monthly(s: SimState): void {
  for (const t of s.fleet.triremes) {
    if (t.owed > 0 && t.crew.length) {
      armyNews(s, `The rowers of the trireme ${triremeName(t)} have had no pay for a month (${fmt(t.owed)} dr owed): they go home to their old work`, t.yard);
      t.crew = [];
      t.owed = 0;
    }
    t.owed += t.crew.length * ROWER_PAY;
  }
  settle(s);
}

/** Rowers' pay owed and unpaid this month (drachmas). */
export const rowersOwed = (s: SimState): number => s.fleet.triremes.reduce((a, t) => a + t.owed, 0);

// ---------------------------------------------------------------------------
// Ships in the bay.

/** Is a ship within your waters (on the map, or just beyond its edge)? */
const inWaters = (map: CoastMap, x: number, z: number): boolean => x > -WATERS && z > -WATERS && x < map.size + WATERS && z < map.size + WATERS;

/** The enemy ships that triremes go for: afloat, in your waters, and set off. */
function targets(s: SimState, map: CoastMap): EnemyShip[] {
  return s.fleet.ships.filter((e) => afloat(e) && s.tick >= e.from && inWaters(map, e.x, e.z));
}

function stepBay(s: SimState, map: CoastMap): void {
  const f = s.fleet;
  for (const e of f.ships) moveEnemy(s, map, e);
  const foes = targets(s, map);
  const byFoe = new Map<number, EnemyShip>();
  for (const e of foes) byFoe.set(e.id, e);
  // Who goes for whom: each fit trireme at home the nearest foe, no more than two to one while others are free.
  const on = new Map<number, number>();
  for (const t of f.triremes) if (t.foe && byFoe.has(t.foe)) on.set(t.foe, (on.get(t.foe) ?? 0) + 1);
  for (const t of f.triremes) {
    if (t.order !== 'bay' || (t.state !== 'moored' && t.state !== 'rowing')) continue;
    if (t.state === 'rowing' && (t.task === 'out' || t.task === 'in')) continue;
    const engaged = t.task === 'fight' && t.foe > 0 && byFoe.has(t.foe);
    // (Slice 38: in a fight she fights on until crippled, hull or oars; to go out she must be fit, oars and all, and not laid up under repair.)
    const able = t.crew.length * 2 >= CREW && (engaged ? !crippled(t) : t.hp >= FIT && t.oars >= FIT && !t.mend);
    let foe = able && engaged ? byFoe.get(t.foe) : undefined;
    // (At slice 38's merge: two on one only while no other ship is free, through the fight and not only when she sets
    // out. A trireme sharing her foe goes for a ship nobody is on that has come into your waters since, unless that
    // ship is much farther. With a band's ships a day apart, both triremes stayed on the first while the second beached.)
    if (foe && (on.get(foe.id) ?? 0) >= 2) {
      let free: EnemyShip | undefined;
      let fd = dhypot(foe.x - t.x, foe.z - t.z) + SPREAD;
      for (const e of foes) {
        if (on.get(e.id)) continue;
        const d = dhypot(e.x - t.x, e.z - t.z);
        if (d < fd - 1e-9) {
          fd = d;
          free = e;
        }
      }
      if (free) {
        on.set(foe.id, (on.get(foe.id) ?? 1) - 1);
        on.set(free.id, 1);
        t.foe = free.id;
        t.path = [];
        t.along = 0;
        foe = free;
      }
    }
    if (!foe && able && foes.length) {
      if (t.foe && on.has(t.foe)) on.set(t.foe, (on.get(t.foe) ?? 1) - 1);
      let best: EnemyShip | undefined;
      let bd = Infinity;
      for (const e of foes) {
        // (A ship nobody is on first, unless she is much farther; never three on one.)
        const n = on.get(e.id) ?? 0;
        const d = dhypot(e.x - t.x, e.z - t.z) + n * SPREAD + (n >= 2 ? 1000 : 0);
        if (d < bd - 1e-9) {
          bd = d;
          best = e;
        }
      }
      foe = best;
      if (foe) {
        on.set(foe.id, (on.get(foe.id) ?? 0) + 1);
        t.foe = foe.id;
        t.task = 'fight';
        t.state = 'rowing';
        t.path = [];
        t.along = 0;
        armyNewsOnce(s, t, foe);
      }
    }
    if (foe) chase(s, map, t, foe);
    else if (t.state === 'rowing') {
      if (t.task === 'fight') {
        // Nothing left to fight, or too hurt to go on: home to the jetty.
        // (Slice 38: or her oars too broken to row on: she limps home.)
        if (crippled(t) && t.foe) armyNews(s, t.hp < BREAK_OFF ? `The trireme ${triremeName(t)} is badly holed and breaks off: she rows home to be mended` : `The trireme ${triremeName(t)} has too many oars broken to fight on: she limps home to be mended`, t.yard);
        t.foe = 0;
        homeTo(s, map, t);
      }
      if (t.task === 'home' && sail(t, oarPace(t))) moor(s, map, t);
    }
  }
  // Blows: rams, and the enemy striking back.
  for (const t of f.triremes) {
    if (t.cool > 0) t.cool--;
    const e = t.task === 'fight' ? byFoe.get(t.foe) : undefined;
    if (!e || t.cool > 0 || dhypot(e.x - t.x, e.z - t.z) > RAM_REACH) continue;
    t.cool = RAM_COOL + Math.floor(roll(s, t.id, 1) * 5);
    t.rammed = s.tick;
    const share = Math.min(1, t.crew.length / CREW);
    if (roll(s, t.id, 2) < RAM_HIT * (0.5 + 0.5 * share)) {
      const hurt = (RAM_HURT + RAM_MORE * roll(s, t.id, 3)) * (e.state === 'beached' ? BEACHED_HURT : 1);
      e.hp -= hurt;
      e.hit = s.tick;
    }
    // (Slice 38: ramming breaks a few of her own oars, one time in four.)
    if (roll(s, t.id, 7) < RAM_OARS_ODDS) t.oars = Math.max(0, t.oars - (RAM_OARS + RAM_OARS_MORE * roll(s, t.id, 8)));
  }
  for (const e of foes) {
    if (e.cool > 0) e.cool--;
    if (e.cool > 0 || !afloat(e) || e.hp <= 0) continue;
    let near: Trireme | undefined;
    let nd = STRIKE_REACH;
    for (const t of f.triremes) {
      // (Only a trireme on her: one passing by on her way to another is let be.)
      if (t.state !== 'rowing' || t.task !== 'fight' || t.foe !== e.id) continue;
      const d = dhypot(t.x - e.x, t.z - e.z);
      if (d <= nd) {
        nd = d;
        near = t;
      }
    }
    if (!near) continue;
    e.cool = STRIKE_COOL + Math.floor(roll(s, 1000 + e.id, 4) * 5);
    e.struck = s.tick;
    const odds = e.state === 'beached' ? STRIKE_HIT_BEACHED : STRIKE_HIT;
    if (roll(s, 1000 + e.id, 5) < odds) {
      near.hp -= STRIKE_HURT + STRIKE_MORE * roll(s, 1000 + e.id, 6);
      near.struck = s.tick;
      // (Slice 38: and breaks her oars along that side.)
      near.oars = Math.max(0, near.oars - (OARS_HURT + OARS_MORE * roll(s, 1000 + e.id, 9)));
    }
  }
  // The sunk.
  for (const e of f.ships) if (afloat(e) && e.hp <= 0) sinkEnemy(s, e);
  for (const t of f.triremes) if (afloat(t) && t.state !== 'building' && t.hp <= 0) sinkTrireme(s, t);
  // Gone under.
  if (f.ships.some((e) => e.state === 'sinking' && s.tick - e.sank >= SINK_TICKS)) f.ships = f.ships.filter((e) => !(e.state === 'sinking' && s.tick - e.sank >= SINK_TICKS));
  if (f.triremes.some((t) => t.state === 'sinking' && s.tick - t.sank >= SINK_TICKS)) {
    f.triremes = f.triremes.filter((t) => !(t.state === 'sinking' && s.tick - t.sank >= SINK_TICKS));
    s.rev++;
  }
  // A band whose ships are all drawn up lands; one whose ships are all sunk before it landed is over.
  for (const r of s.world.raids) {
    if (r.phase !== 'raiding' || r.shore < 0 || r.landed > 0 || r.end !== '') continue;
    const mine = f.ships.filter((e) => e.raid === r.id);
    if (!mine.length) continue;
    const up = mine.filter(afloat);
    if (!up.length) {
      if (mine.every((e) => s.tick - e.sank >= 2)) lostAtSea(s, map, r);
      continue;
    }
    if (up.every((e) => e.state === 'beached')) {
      const men = up.reduce((a, e) => a + Math.max(0, e.men - GUARDS), 0);
      for (const e of up) e.men = Math.min(e.men, GUARDS);
      landBand(s, map, r, men);
    }
  }
}

/** The town line as a trireme first goes for an enemy ship (once per ship). */
function armyNewsOnce(s: SimState, t: Trireme, e: EnemyShip): void {
  // (Slice 38: or a blockade's.)
  const city = cityOfShip(s, e);
  if (!city) return;
  const key = `The trireme ${triremeName(t)} rows out`;
  if (s.army.news.some((n) => n.line.startsWith(key) && s.tick - n.tick < 20 * TICKS_PER_DAY)) return;
  armyNews(s, `${key} to meet ${whose(city)} ships ${e.blockade ? 'across the harbour’s mouth' : 'in the bay'}`, t.yard);
}

/** Slice 38: whose an enemy ship is: her band's city, or her blockade's. */
function cityOfShip(s: SimState, e: EnemyShip): CityId | undefined {
  if (e.blockade) return blockadeOf(s, e.blockade)?.city;
  return raidOfShips(s, e.raid)?.city;
}
/** Slice 38: a band's ship's raid (none for a blockade's). */
const raidOf = (s: SimState, e: EnemyShip): Raid | undefined => (e.blockade ? undefined : raidOfShips(s, e.raid));
/** Slice 38: home hurt this badly, she is laid up under repair until whole. */
const mustMend = (t: Trireme): boolean => t.hp < FIT || t.oars < FIT;
/** Slice 38: how hurt she is, in words: "her hull at 42% and 55 of every hundred oars broken". */
export function hurtWords(t: Trireme): string {
  const out: string[] = [];
  if (t.hp < 100) out.push(`her hull at ${Math.round(t.hp)}%`);
  if (t.oars < 100) out.push(t.oars <= 0 ? 'every oar broken' : `${Math.round(100 - t.oars)} of every hundred oars broken`);
  return out.length ? out.join(' and ') : 'whole';
}

/** Row at a foe: straight at her if the water allows, else by a way round (looked for again as she moves); alongside, keep with her. */
function chase(s: SimState, map: CoastMap, t: Trireme, e: EnemyShip): void {
  const d = dhypot(e.x - t.x, e.z - t.z);
  const pace = oarPace(t);
  // Alongside: on her beam, a little off, keeping with her.
  // (Slice 38: two on one ship take her two sides, the first on her one, the second on her other, so they and their oars don't draw into each other.)
  const on = s.fleet.triremes.filter((o) => o.task === 'fight' && o.foe === e.id && afloat(o));
  const first = on.length > 1 && on[0] !== t ? on[0] : undefined;
  const side = (first ? -((first.id % 2 === 0 ? 1 : -1)) : t.id % 2 === 0 ? 1 : -1) * 0.55;
  const gx = e.x - e.hz * side;
  const gz = e.z + e.hx * side;
  if (d <= RAM_REACH * 0.85) {
    const gd = dhypot(gx - t.x, gz - t.z);
    if (gd > 1e-6) {
      const step = Math.min(gd, pace * 0.6);
      t.x += ((gx - t.x) / gd) * step;
      t.z += ((gz - t.z) / gd) * step;
    }
    t.hx = e.x - t.x;
    t.hz = e.z - t.z;
    const h = dhypot(t.hx, t.hz) || 1;
    t.hx /= h;
    t.hz /= h;
    t.path = [];
    return;
  }
  if (clearWater(map, t.x, t.z, e.x, e.z)) {
    const step = Math.min(d, pace);
    t.hx = (e.x - t.x) / d;
    t.hz = (e.z - t.z) / d;
    t.x += t.hx * step;
    t.z += t.hz * step;
    t.path = [];
    return;
  }
  // Round the land: a way, looked for again when its end has fallen behind her foe.
  const n = t.path.length;
  if (n < 4 || dhypot(t.path[n - 2] - e.x, t.path[n - 1] - e.z) > 2 || t.along >= pathLength(t.path) - 1e-9) {
    const way = wayTo(map, t.x, t.z, e.x, e.z);
    if (!way) return;
    setWay(t, way);
  }
  sail(t, pace);
}

/** Set a trireme rowing home to her mooring. */
function homeTo(s: SimState, map: CoastMap, t: Trireme): void {
  const m = mooringOf(s, map, t);
  t.task = 'home';
  t.state = 'rowing';
  setWay(t, wayTo(map, t.x, t.z, m.x, m.z) ?? [t.x, t.z, m.x, m.z]);
}

/** In at her mooring. */
function moor(s: SimState, map: CoastMap, t: Trireme): void {
  const m = mooringOf(s, map, t);
  // (Slice 38: home badly hurt, she is laid up under repair until whole: no more rowing out at half mended.)
  if (mustMend(t) && !t.mend) {
    t.mend = true;
    armyNews(s, `The trireme ${triremeName(t)} is in, ${hurtWords(t)}: she is laid up at the shipyard under repair until she is whole`, t.yard);
  }
  t.state = 'moored';
  t.task = '';
  t.foe = 0;
  if (t.order === 'bay') t.lane = '';
  t.x = m.x;
  t.z = m.z;
  t.hx = m.hx;
  t.hz = m.hz;
  t.path = [];
  t.along = 0;
  s.rev++;
}

/** An enemy ship's tick: sailing in to her spot on the beach (slowed while a trireme is on her), waiting there, sailing off. */
function moveEnemy(s: SimState, map: CoastMap, e: EnemyShip): void {
  if (!afloat(e) || s.tick < e.from) return;
  const r = raidOf(s, e);
  // Paid off or called off before the band landed: she turns for the open sea.
  if (e.state === 'sailing' && r && r.end !== '' && r.landed === 0) leave(map, e);
  // (Slice 38: a blockade's ship on station rides there.)
  if (e.state === 'beached' || e.state === 'holding') return;
  const engaged = s.fleet.triremes.some((t) => t.task === 'fight' && t.foe === e.id && dhypot(t.x - e.x, t.z - e.z) <= STRIKE_REACH);
  // (Slice 38: at her own pace, if she has one: collectors and raiders reach the beach within about a fortnight.)
  const pace = (e.x >= 0 && e.z >= 0 && e.x < map.size && e.z < map.size ? BAY_PACE : FAR_PACE) * (e.pace ?? 1) * (engaged ? 0.5 : 1) * seaPace(s);
  const done = sail(e, pace);
  if (!done) return;
  if (e.state === 'sailing' && e.blockade) {
    // (Slice 38: on station across the harbour's mouth, bow to the harbour.)
    e.state = 'holding';
    e.x = e.bx;
    e.z = e.bz;
    s.rev++;
  } else if (e.state === 'sailing') {
    e.state = 'beached';
    e.x = e.bx;
    e.z = e.bz;
    s.rev++;
  } else if (e.state === 'leaving') {
    s.fleet.ships = s.fleet.ships.filter((o) => o !== e);
    s.rev++;
  }
}

/** A ship turns for the open sea from where she is. */
function leave(map: CoastMap, e: EnemyShip): void {
  e.state = 'leaving';
  setWay(e, wayOut(map, e.x, e.z, RAIDER_HORIZON, (e.slot - 1) * 4));
}

/** An enemy ship's hull is gone: she lists and goes down, with the men aboard. */
function sinkEnemy(s: SimState, e: EnemyShip): void {
  const r = raidOf(s, e);
  const men = e.state === 'sailing' ? e.men : 0;
  // (Slice 38, review of slice 26: sunk laden as she sails off, her share of the loot is hauled out of the shallows and goes back to the stores and the treasury.)
  let back = '';
  if (r && e.state === 'leaving' && e.laden) back = regainAtSea(s, r, 1 / Math.max(1, shipsOf(s, r).filter((x) => x.laden && x.state === 'leaving').length));
  e.state = 'sinking';
  e.sank = s.tick;
  e.hp = 0;
  for (const t of s.fleet.triremes) if (t.foe === e.id) t.foe = 0;
  if (r) {
    r.sunk++;
    r.drowned += men;
    const name = whose(r.city);
    const left = shipsOf(s, r).length;
    const what = men > 0 ? `, and ${men} of their men with her` : e.laden ? (back ? `, with what she carried off: ${back} hauled out of the shallows and taken back` : ', with what she carried off') : ' on the beach';
    // (The army's line only: the news of Greece hears the whole of it when the raid is over. Review of slice 26: the two said the same.)
    armyNews(s, `Your triremes have sunk one of ${name} ships${what}${left ? ` (${left} left)` : ''}`, 0);
  }
  // Slice 38: one of a blockade's ships: counted towards breaking it, and its city's fleet the smaller.
  const b = e.blockade ? blockadeOf(s, e.blockade) : undefined;
  if (b) {
    b.sunk++;
    const c = s.world.cities.find((x) => x.id === b.city);
    if (c) change(c, s.tick, 'blockade', 'ships sunk off your harbour', { fleet: -1 });
    const left = s.fleet.ships.filter((x) => x.blockade === b.id && afloat(x)).length;
    const need = b.phase !== 'over' ? Math.max(0, Math.ceil(b.ships / 2) - b.sunk) : 0;
    armyNews(s, `Your triremes have sunk one of ${whose(b.city)} ${b.phase === 'over' ? 'fleeing' : 'blockading'} ships${left ? ` (${left} left${need ? `: sink ${need} more and the rest flee` : ''})` : ''}`, 0);
  }
  e.men = 0;
  s.rev++;
}

/** A trireme's hull is gone: she goes down; her rowers swim ashore and go home. */
function sinkTrireme(s: SimState, t: Trireme): void {
  const e = s.fleet.ships.find((o) => o.id === t.foe);
  // (Slice 38: or a blockade's.)
  const city = e ? cityOfShip(s, e) : undefined;
  armyNews(s, `The trireme ${triremeName(t)} has been sunk${city ? ` by ${whose(city)} ships` : ''}: her ${t.crew.length} rowers swam ashore and have gone home`, t.yard);
  t.state = 'sinking';
  t.sank = s.tick;
  t.hp = 0;
  t.crew = [];
  t.foe = 0;
  t.task = '';
  s.rev++;
}

// ---------------------------------------------------------------------------
// Landings (raids.ts hands them here).

/** How many ships a band of so many men comes in. */
export const shipsFor = (men: number): number => clamp(Math.ceil(men / SHIP_MEN), SHIPS_LEAST, SHIPS_MOST);

/**
 * A band's ships come in: from beyond the horizon, a little apart, each to
 * its spot on the beach (`spots`: where she runs up, world units, and the
 * beach tile beside it), the band's men shared among them.
 */
export function sailIn(s: SimState, map: CoastMap, r: Raid, spots: ReadonlyArray<{ x: number; z: number; tile: number }>): void {
  const n = shipsFor(r.men);
  r.ships = n;
  for (let k = 0; k < n; k++) {
    const spot = spots[k % spots.length];
    const out = wayOut(map, spot.x, spot.z, RAIDER_HORIZON + k * 2, (k - (n - 1) / 2) * 5);
    const path: number[] = [];
    for (let i = out.length - 2; i >= 0; i -= 2) path.push(out[i], out[i + 1]);
    const men = Math.floor(r.men / n) + (k < r.men % n ? 1 : 0);
    const e: EnemyShip = {
      id: s.fleet.nextId++,
      raid: r.id,
      slot: k,
      state: 'sailing',
      x: path[0],
      z: path[1],
      hx: 0,
      hz: -1,
      path,
      along: 0,
      from: s.tick + k * STAGGER,
      hp: 100,
      men,
      bx: spot.x,
      bz: spot.z,
      tile: spot.tile,
      laden: false,
      struck: 0,
      hit: 0,
      sank: 0,
      cool: 0,
    };
    const p = pointAlong(path, 0);
    e.hx = p.dx;
    e.hz = p.dz;
    // (Slice 38: quick enough that the last is on the beach about a fortnight after the first set off, never slower than the usual paces; winter's storms slow them still.)
    const usual = voyageIn(map, path);
    const room = BEACH_TICKS - k * STAGGER;
    if (usual > room) e.pace = Math.round((usual / room) * 100) / 100;
    s.fleet.ships.push(e);
  }
  s.rev++;
}

/** Slice 38: how long a way in takes at the usual paces (ticks): the part beyond the map's edge far out, the rest across the bay. */
function voyageIn(map: CoastMap, path: readonly number[]): number {
  const L = pathLength(path);
  const k = Math.max(1, Math.ceil(L / 0.5));
  let ticks = 0;
  for (let i = 0; i < k; i++) {
    const p = pointAlong(path, (L * (i + 0.5)) / k);
    const inside = p.x >= 0 && p.z >= 0 && p.x < map.size && p.z < map.size;
    ticks += L / k / (inside ? BAY_PACE : FAR_PACE);
  }
  return ticks;
}

/** The band is back at the beach: its ships take it off and sail away, laden if it carries anything. False if no ship is there to take it. */
export function embark(s: SimState, map: CoastMap, r: Raid, laden: boolean): boolean {
  const up = s.fleet.ships.filter((e) => e.raid === r.id && (e.state === 'beached' || e.state === 'sailing'));
  if (!up.length) return false;
  for (const e of up) {
    e.laden = laden;
    e.men = 0;
    leave(map, e);
  }
  s.rev++;
  return true;
}

/** How many days until a band's ships are all on the beach (the slowest afloat), at least 1. */
export function daysToBeach(s: SimState, map: CoastMap, r: Raid): number {
  let most = 0;
  for (const e of shipsOf(s, r)) {
    if (e.state !== 'sailing') continue;
    let left = pathLength(e.path) - e.along;
    // (Roughly: the part beyond the edge at the far pace, the rest across the bay.)
    let ticks = 0;
    const out = Math.max(0, Math.min(left, e.z - map.size + 0.5));
    ticks += out / FAR_PACE;
    left -= out;
    ticks += left / BAY_PACE;
    // (Slice 38: at her own pace.)
    ticks /= e.pace ?? 1;
    ticks += Math.max(0, e.from - s.tick);
    // (Slice 33: the sailing, not the wait, slower through winter's storms.)
    const pace = seaPace(s);
    if (pace !== 1) ticks += (ticks - Math.max(0, e.from - s.tick)) * (1 / pace - 1);
    most = Math.max(most, ticks);
  }
  return Math.max(1, Math.ceil(most / TICKS_PER_DAY));
}

// ---------------------------------------------------------------------------
// Slice 38: a blockade's ships (blockades.ts hands them here).

/**
 * A blockade's ships come in from beyond the horizon, a day apart, each to
 * her spot in a line across the harbour's mouth (`mouth`: the point on the
 * ship's way in, and which way it runs there), bow to the harbour; or (a
 * demo's) are there already, holding.
 */
export function blockadeSailIn(s: SimState, map: CoastMap, b: Blockade, mouth: { x: number; z: number; dx: number; dz: number }, there: boolean): number {
  const n = b.ships;
  // (Review of slice 38: how long until the last is on station, for the "Sails!" line.)
  let last = 0;
  const px = -mouth.dz;
  const pz = mouth.dx;
  const clear = (x: number, z: number): boolean => onWater(map, x, z) && onWater(map, x + mouth.dx * 1.5, z + mouth.dz * 1.5) && onWater(map, x - mouth.dx * 1.5, z - mouth.dz * 1.5);
  for (let k = 0; k < n; k++) {
    // Her place in the line, pulled in towards its middle (then along the way) until she lies on open water.
    let off = (k - (n - 1) / 2) * BLOCKADE_GAP;
    let x = mouth.x + px * off;
    let z = mouth.z + pz * off;
    for (let tries = 0; tries < 10 && !clear(x, z); tries++) {
      off *= 0.8;
      const back = tries >= 5 ? (tries - 4) * 0.8 : 0;
      x = mouth.x + px * off - mouth.dx * back;
      z = mouth.z + pz * off - mouth.dz * back;
    }
    const out = wayOut(map, x, z, BLOCKADE_HORIZON + k * 2, (k - (n - 1) / 2) * 5);
    const path: number[] = [];
    for (let i = out.length - 2; i >= 0; i -= 2) path.push(out[i], out[i + 1]);
    const e: EnemyShip = {
      id: s.fleet.nextId++,
      raid: 0,
      slot: k,
      state: there ? 'holding' : 'sailing',
      x: there ? x : path[0],
      z: there ? z : path[1],
      hx: mouth.dx,
      hz: mouth.dz,
      path,
      along: there ? pathLength(path) : 0,
      blockade: b.id,
      from: there ? s.tick : s.tick + k * BLOCKADE_STAGGER,
      hp: 100,
      men: 0,
      bx: x,
      bz: z,
      tile: -1,
      laden: false,
      struck: 0,
      hit: 0,
      sank: 0,
      cool: 0,
    };
    if (!there) {
      const p = pointAlong(path, 0);
      e.hx = p.dx;
      e.hz = p.dz;
      // (Review of slice 38: quick enough that the last is on station about BAY_TICKS after the first is sighted, as the lines say; never slower than the usual paces. They took twice that.)
      const usual = voyageIn(map, path);
      const room = BAY_TICKS - k * BLOCKADE_STAGGER;
      if (usual > room) e.pace = Math.round((usual / room) * 100) / 100;
      last = Math.max(last, k * BLOCKADE_STAGGER + usual / (e.pace ?? 1));
    }
    s.fleet.ships.push(e);
  }
  s.rev++;
  return last;
}

/** A blockade is over: its ships still afloat turn for the open sea. */
export function blockadeOff(s: SimState, map: CoastMap, b: Blockade): void {
  for (const e of s.fleet.ships) if (e.blockade === b.id && (e.state === 'sailing' || e.state === 'holding')) leave(map, e);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Triremes on the map of Greece: guarding a lane, or away with a force.

/** How far along a lane its pirates' place (and a guard's station) is (table units). */
export function stationAlong(way: string): number {
  const p = PIRATE_PLACES.find((x) => x.way === way);
  const pts = wayPoints(wayOf(way));
  // Slice 37: guarding your colony, she sails all the way to it (the lane's end, off its shore).
  if (way.endsWith('-colony')) return Math.max(0, lineLength(pts) - 0.5);
  if (!p) return lineLength(pts) / 2;
  return lineLength(pts.slice(0, (p.at + 1) * 2));
}

/**
 * The lanes a trireme can guard: every sea lane from your city but the Tyre
 * ship's (slice 38: each with its place: named, or its middle, "on the lane
 * to Thasos", for a lane with none named).
 */
export const LANES: ReadonlyArray<{ way: string; city: CityId; name: string }> = WAYS.filter((w) => w.kind === 'sea' && w.to !== 'tyre').map((w) => {
  const p = PIRATE_PLACES.find((x) => x.way === w.id);
  return { way: w.id, city: w.to, name: p ? p.name : `on the lane to ${PLACES[w.to]?.name ?? w.to}` };
});
/** Slice 38: a lane's place for pirates and warships (null: no such lane). */
export const placeOn = (way: string): { way: string; city: CityId; name: string } | null => LANES.find((l) => l.way === way) ?? null;

/** How long a trireme takes over so far along a lane (ticks): at a trader's pace. */
function laneTicks(city: CityId, from: number, to: number): number {
  const w = routeWay(city, 'sea');
  const L = w ? lineLength(wayPoints(wayOf(w.way))) : 1;
  return Math.max(TICKS_PER_DAY, Math.round((voyageTicks(city) * Math.abs(to - from)) / Math.max(1, L - HORIZON_ALONG)));
}

/** Where a trireme away is on the map of Greece at a tick: along her lane, and whether she is coming home; null while she isn't on the map. */
export function triremeOnMap(t: Trireme, tick: number): { along: number; homeward: boolean; station: boolean } | null {
  if (t.state !== 'away' || !t.lane) return null;
  const u = clamp((tick - t.start) / Math.max(1, t.dur), 0, 1);
  return { along: t.a0 + (t.a1 - t.a0) * u, homeward: t.homeward, station: !t.homeward && u >= 1 && t.order === 'lane' };
}


/** The triremes guarding (or on their way to guard) a lane. */
export const guardsOf = (s: SimState, way: string): Trireme[] => s.fleet.triremes.filter((t) => t.order === 'lane' && t.lane === way && afloat(t));

/** Why a trireme can't be sent to guard a lane now, or '' if she can. */
export function guardRefusal(t: Trireme | undefined, way: string): string {
  if (!t || !afloat(t)) return 'No such trireme';
  if (t.state === 'building') return 'She is still on the slip';
  const lane = LANES.find((l) => l.way === way);
  if (!lane) return 'No such sea lane';
  if (t.order === 'lane' && t.lane === way) return 'She is guarding it already';
  if (t.order === 'away') return 'She is away with your soldiers';
  // (Out on another lane, or sailing home along one: home first. Review of slice 26: she can't cross from lane to lane on the map.)
  const on = t.state === 'away' ? LANES.find((l) => l.way === t.lane) : undefined;
  if (on && on.way !== way) return t.order === 'lane' ? `She is out on the lane to ${cityName(on.city)}: bring her home first` : `She is sailing home along the lane to ${cityName(on.city)}: she can go out again once she is in`;
  // (Slice 38, review of slice 26: rowing home in the bay, she offers no lanes until she is in.)
  if (t.state === 'rowing' && (t.task === 'home' || t.task === 'in')) return 'She is rowing home: she can go out again once she is in';
  if (t.crew.length * 2 < CREW) return `She needs at least ${CREW / 2} rowers to go out (${t.crew.length} now)`;
  if (t.mend) return 'She is laid up under repair until she is whole';
  if (t.hp < FIT) return 'Her hull needs mending first';
  // (Slice 38.)
  if (t.oars < FIT) return 'Her oars need mending first';
  return '';
}

/** Slice 38: why a trireme can't be called in for repair now, or '' if she can. */
export function repairRefusal(t: Trireme | undefined): string {
  if (!t || !afloat(t)) return 'No such trireme';
  if (t.state === 'building') return 'She is still on the slip';
  if (t.mend) return 'She is under repair already';
  if (t.order === 'away') return 'She is away with your soldiers: she is mended when she is home';
  if (t.hp >= 100 && t.oars >= 100) return 'She is whole: nothing to mend';
  return '';
}

/** Slice 38: call a trireme in for repair (a command): home if she is out, then laid up at her mooring until whole. */
export function callRepair(s: SimState, map: CoastMap, id: number): boolean {
  const t = triremeOf(s, id);
  if (repairRefusal(t) !== '' || !t) return false;
  if (t.order === 'lane' || t.state === 'away' || (t.state === 'rowing' && t.task === 'out')) callHome(s, map, id);
  else if (t.state === 'rowing' && t.task === 'fight') {
    t.foe = 0;
    homeTo(s, map, t);
  }
  t.mend = true;
  s.rev++;
  return true;
}

/** Send a trireme out to guard a lane (a command): out of the bay, then along the lane on the map to its place. */
export function sendGuard(s: SimState, map: CoastMap, id: number, way: string): boolean {
  const t = triremeOf(s, id);
  if (guardRefusal(t, way) !== '' || !t) return false;
  t.order = 'lane';
  t.lane = way;
  t.foe = 0;
  goOut(s, map, t);
  s.rev++;
  return true;
}

/** Out of the bay from where she is (on the map already: along to her new station). */
function goOut(s: SimState, map: CoastMap, t: Trireme): void {
  if (t.state === 'away') {
    // Already at sea: on (or back) along the map to where she is wanted now.
    const at = triremeOnMap(t, s.tick);
    const here = at ? at.along : HORIZON_ALONG;
    const to = t.order === 'lane' ? stationAlong(t.lane) : HORIZON_ALONG;
    const city = LANES.find((l) => l.way === t.lane)?.city ?? 'troy';
    t.a0 = here;
    t.a1 = to;
    t.start = s.tick;
    t.dur = laneTicks(city, here, to);
    t.homeward = false;
    return;
  }
  t.state = 'rowing';
  t.task = 'out';
  setWay(t, wayOut(map, t.x, t.z, 12));
}

/** Bring a trireme home (a command): back along the lane, into the bay and to her mooring. */
export function callHome(s: SimState, map: CoastMap, id: number): boolean {
  const t = triremeOf(s, id);
  // (Not one carrying your soldiers on an expedition (slice 28): she comes home with them, fleetHome. Review of slice 26.)
  if (!t || !afloat(t) || t.state === 'building' || t.order === 'away') return false;
  const city = LANES.find((l) => l.way === t.lane)?.city ?? 'troy';
  const at = triremeOnMap(t, s.tick);
  t.order = 'bay';
  // (Away, she keeps her lane while she sails home along it, so the map still shows her: moor() lets it go.)
  if (t.state !== 'away') t.lane = '';
  if (t.state === 'away') {
    const here = at ? at.along : HORIZON_ALONG;
    t.a0 = here;
    t.a1 = HORIZON_ALONG;
    t.start = s.tick;
    t.dur = here > HORIZON_ALONG ? laneTicks(city, here, HORIZON_ALONG) : 1;
    t.homeward = true;
  } else if (t.state === 'rowing' && t.task === 'out') homeTo(s, map, t);
  s.rev++;
  return true;
}

/** Triremes rowing out to sea or in from it, and those on the map. */
function stepAway(s: SimState, map: CoastMap): void {
  for (const t of s.fleet.triremes) {
    if (t.state !== 'away') continue;
    if (s.tick < t.start + t.dur) continue;
    if (t.homeward) {
      // Off your gulf again: in from the horizon to her mooring.
      const m = mooringOf(s, map, t);
      const out = wayOut(map, m.x, m.z, 12);
      const path: number[] = [];
      for (let i = out.length - 2; i >= 0; i -= 2) path.push(out[i], out[i + 1]);
      t.state = 'rowing';
      t.task = 'in';
      t.homeward = false;
      setWay(t, path);
      t.x = path[0];
      t.z = path[1];
      s.rev++;
    }
  }
}

/** A trireme rowing out of the bay (for a lane or with a force) or in from it: along her way; at its end, on the map or at her mooring. */
function rowOutIn(s: SimState, map: CoastMap, t: Trireme): void {
  // (Slice 38: limping, with her oars broken.)
  if (!sail(t, oarPace(t))) return;
  if (t.task === 'in') {
    moor(s, map, t);
    return;
  }
  // Out past the edge: on the map of Greece, along the lane to her station (or waiting at sea, away with a force).
  t.state = 'away';
  t.task = '';
  t.path = [];
  t.along = 0;
  t.homeward = false;
  t.start = s.tick;
  t.a0 = HORIZON_ALONG;
  if (t.order === 'lane') {
    const to = stationAlong(t.lane);
    const city = LANES.find((l) => l.way === t.lane)?.city ?? 'troy';
    t.a1 = to;
    t.dur = laneTicks(city, HORIZON_ALONG, to);
  } else {
    t.a1 = HORIZON_ALONG;
    t.dur = 1;
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// For slice 28: a force carried by sea.

/** Men a trireme carries besides her rowers: one company. */
export const CARRY = 16;

/**
 * What can carry a force to a city by sea: the triremes at home (moored or
 * rowing in the bay on its guard), crewed (half or better) and sound; how
 * many men they carry between them; and why not, if none can ('' if some can).
 */
export function fleetFor(s: SimState, city: CityId): { ids: number[]; carry: number; why: string } {
  if (!routeWay(city, 'sea')) return { ids: [], carry: 0, why: `No sea lane leads to ${cityName(city)}` };
  const ids = s.fleet.triremes.filter((t) => t.order === 'bay' && (t.state === 'moored' || (t.state === 'rowing' && t.task === 'home')) && fit(t)).map((t) => t.id);
  if (ids.length) return { ids, carry: ids.length * CARRY, why: '' };
  const any = s.fleet.triremes.filter((t) => afloat(t) && t.state !== 'building');
  const why = any.length === 0 ? 'You have no triremes: build a shipyard on the shore and order one' : any.every((t) => t.order !== 'bay') ? 'Your triremes are all away' : 'No trireme at home has the rowers and the hull to go';
  return { ids: [], carry: 0, why };
}

/** Take triremes off the bay's guard and send them out to sea with a force for a city (slice 28 places the force on the map itself). The ids that went. */
export function sailFor(s: SimState, map: CoastMap, ids: readonly number[], city: CityId): number[] {
  const way = routeWay(city, 'sea')?.way ?? '';
  const went: number[] = [];
  for (const id of ids) {
    const t = triremeOf(s, id);
    if (!t || t.order !== 'bay' || !fit(t) || (t.state !== 'moored' && t.state !== 'rowing')) continue;
    t.order = 'away';
    t.lane = way;
    t.foe = 0;
    goOut(s, map, t);
    went.push(id);
  }
  if (went.length) s.rev++;
  return went;
}

/** Bring triremes away with a force home again (slice 28): in from the horizon to their moorings. */
export function fleetHome(s: SimState, map: CoastMap, ids: readonly number[]): void {
  for (const id of ids) {
    const t = triremeOf(s, id);
    if (!t || t.order !== 'away') continue;
    t.order = 'bay';
    if (t.state === 'away') {
      t.a0 = HORIZON_ALONG;
      t.a1 = HORIZON_ALONG;
      t.start = s.tick;
      t.dur = 1;
      t.homeward = true;
    } else if (t.state === 'rowing') homeTo(s, map, t);
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// Slice 37: your triremes guarding a colony (colonies.ts sends them, and calls them home with callHome).

/** Send a trireme at home (guarding the bay, crewed and sound) out along a colony's lane to guard it. */
export function guardColony(s: SimState, map: CoastMap, id: number, way: string): boolean {
  const t = triremeOf(s, id);
  if (!t || !afloat(t) || t.order !== 'bay' || !fit(t) || (t.state !== 'moored' && t.state !== 'rowing')) return false;
  t.order = 'lane';
  t.lane = way;
  t.foe = 0;
  goOut(s, map, t);
  s.rev++;
  return true;
}

/** A colony's guard in words: "Sailing to guard Thasos, your colony". */
function colonyGuardWords(lane: string, homeward: boolean, station: boolean): string {
  const site = siteOf(lane.replace(/-colony$/, ''))?.name ?? 'your colony';
  return homeward ? `Sailing home from guarding ${site}` : station ? `On guard off ${site}, your colony` : `Sailing to guard ${site}, your colony`;
}

// ---------------------------------------------------------------------------
// Pirates.

/** The pirates on a lane now (seen or preying), if any. */
export const piratesOn = (s: SimState, way: string): Pirates | undefined => s.fleet.pirates.find((p) => p.way === way && (p.state === 'seen' || p.state === 'preying'));

/** The lanes your city trades over (a sea route to a city with a pirates' place: slice 38, every lane has one). */
function lanesUsed(s: SimState): typeof LANES[number][] {
  return LANES.filter((p) => s.world.routes.some((r) => r.kind === 'sea' && r.city === p.city));
}

/** Set pirates on a lane (now, or a demo's staging): seen now, preying from a fortnight on. */
export function pirateBand(s: SimState, way: string, ships: number, why = ''): Pirates | null {
  const place = placeOn(way);
  if (!place) return null;
  const p: Pirates = {
    id: s.fleet.nextId++,
    way,
    city: place.city,
    place: place.name,
    ships: clamp(ships, 1, 3),
    seen: s.tick,
    from: s.tick + PIRATE_WARNING,
    until: s.tick + PIRATE_WARNING + PIRATE_STAY,
    state: 'seen',
    took: [],
    fought: 0,
  };
  s.fleet.pirates.push(p);
  const g = guardsOf(s, way);
  news(s.world, s.tick, place.city, `Pirates seen ${place.name}, on the lane to ${cityName(place.city)}: ${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}${why ? ` (${why})` : ''}. From about ${dayIn(p.from)} they will seize what of yours passes there${g.length ? `: the ${triremeName(g[0])} guards the lane` : ': a trireme sent to guard the lane keeps it safe'}`, true);
  s.rev++;
  return p;
}

const dayIn = (tick: number): string => {
  const m = Math.floor(tick / TICKS_PER_MONTH);
  const d = Math.floor((tick % TICKS_PER_MONTH) / TICKS_PER_DAY) + 1;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${MONTHS[(m + 2) % 12]}`;
};

function stepPirates(s: SimState): void {
  const f = s.fleet;
  const w = s.world;
  // (Slice 38: an expedition by sea may meet pirates or warships on its lane, with or without your trade.)
  if (f.pirates.length === 0 && (!w.contact || !w.routes.some((r) => r.kind === 'sea'))) return;
  // Slice 38: wars put warships on your lanes, and take them off again.
  if (s.tick % TICKS_PER_DAY === 0 && w.contact) stepWarships(s);
  // (None come while fire and wear are switched off, as while a demo's history is built: the demos open as they did.)
  // Each tick, while some prey: what of yours passes their place on an unguarded lane is seized.
  if (f.pirates.some((p) => p.state === 'preying')) {
    seize(s);
    robbedNews(s);
  }
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const p of f.pirates) {
    if (p.state === 'seen' && s.tick >= p.from) {
      p.state = 'preying';
      s.rev++;
    }
    // Slice 35: the Lighthouse's fire is seen far out, and pirates keep clear of your waters while it burns (the hook slice 38 builds on).
    // (Slice 38: warships are war, not piracy: its fire doesn't keep them off, nor a blockade.)
    if ((p.state === 'seen' || p.state === 'preying') && !p.of && piratesKeepClear(s)) {
      p.state = 'gone';
      p.until = s.tick;
      news(w, s.tick, p.city, `The pirates ${p.place} saw the fire of your Lighthouse and sailed off${p.took.length ? `, with ${tookWords(p.took)}` : ''}: they keep clear of your waters while it burns`);
      s.rev++;
    }
    if ((p.state === 'seen' || p.state === 'preying') && s.tick >= p.until) {
      p.state = 'gone';
      news(w, s.tick, p.city, `${p.of ? `${whose(p.of)} warships` : 'The pirates'} ${p.place} have sailed away${p.took.length ? `, with ${tookWords(p.took)}` : ''}`);
      s.rev++;
    }
    if ((p.state === 'seen' || p.state === 'preying') && guarded(s, p.way) && (p.fought === 0 || s.tick - p.fought >= REFIGHT)) laneFight(s, p);
  }
  // Slice 38: expeditions at sea passing their place fight them.
  if (f.pirates.some((p) => p.state === 'seen' || p.state === 'preying')) meetExpeditions(s);
  // Pirates long gone are forgotten.
  if (f.pirates.some((p) => (p.state === 'gone' || p.state === 'beaten') && s.tick - p.until > TICKS_PER_YEAR)) f.pirates = f.pirates.filter((p) => !((p.state === 'gone' || p.state === 'beaten') && s.tick - p.until > TICKS_PER_YEAR));
  if (f.reports.length > 8) f.reports.splice(0, f.reports.length - 8);
  if (s.tick % TICKS_PER_MONTH === 0 && s.hazards) newPirates(s);
}

/** On the first of the month: now and then, pirates on a lane you trade over (none in your first year of sea trade, one band at a time, a lull after). */
function newPirates(s: SimState): void {
  const f = s.fleet;
  // (Slice 35: none while the Lighthouse burns.)
  if (piratesKeepClear(s)) return;
  // (Slice 38: pirates only: warships are another matter, and their lanes are taken.)
  if (f.pirates.some((p) => !p.of && (p.state === 'seen' || p.state === 'preying'))) return;
  if (f.pirates.some((p) => !p.of && s.tick - Math.min(p.until, p.fought || p.until) < PIRATE_LULL)) return;
  const lanes = lanesUsed(s).filter((l) => !piratesOn(s, l.way));
  if (!lanes.length) return;
  const first = s.world.routes.filter((r) => r.kind === 'sea').reduce((a, r) => Math.min(a, r.opened), Infinity);
  if (s.tick - first < PIRATES_AFTER) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  if (dice(s, month, 1) >= PIRATE_ODDS) return;
  const lane = lanes[Math.floor(dice(s, month, 2) * lanes.length)];
  pirateBand(s, lane.way, 1 + Math.floor(dice(s, month, 3) * 3));
}

/** What of yours passes the place of pirates preying on an unguarded lane this tick is seized: your gifts and goods sent by sea, and coin. */
function seize(s: SimState): void {
  const w = s.world;
  for (const p of s.fleet.pirates) {
    if (p.state !== 'preying' || guarded(s, p.way)) continue;
    const at = stationAlong(p.way);
    for (const g of w.gifts.slice()) {
      if (g.from !== 'home' || g.by !== 'sea' || g.phase !== 2 || g.way !== p.way || g.loan) continue;
      const now = giftOnMap(g, s.tick);
      const before = giftOnMap(g, s.tick - 1);
      if (!now || !before || !(before.along < at && now.along >= at)) continue;
      w.gifts = w.gifts.filter((x) => x !== g);
      const words = giftWords(g.good, g.amount);
      p.took.push(words);
      // (Slice 38: or a city's warships.)
      const who = bandWords(p);
      if (g.deal) {
        undelivered(s, g);
        news(w, s.tick, p.city, `${who} ${p.place} seized the ${words} you sent for ${cityName(g.to)}: it never got there, and they wait for it still`, true);
      } else news(w, s.tick, p.city, `${who} ${p.place} seized your gift of ${words} for ${cityName(g.to)}: it never got there`, true);
      armyNews(s, `${who} ${p.place} seized the ${words} you sent to ${cityName(g.to)}`, 0);
      s.rev++;
    }
  }
}

/** A trader robbed on her way in this tick (routes.ts marks her as she sets sail for your quay, pirates preying on her lane): the news. */
function robbedNews(s: SimState): void {
  for (const r of s.world.routes) {
    if (r.kind !== 'sea' || r.robbed !== s.tick) continue;
    const p = preyingOn(s, routeWay(r.city, 'sea')?.way ?? '');
    if (!p) continue;
    p.took.push(`${whose(r.city)} trader’s cargo`);
    news(s.world, s.tick, r.city, `${bandWords(p)} ${p.place} ${p.of ? 'seized the cargo of' : 'plundered'} ${whose(r.city)} ship on her way to you: she comes in empty, with nothing to sell you this time`, true);
    s.rev++;
  }
}

/**
 * Triremes on station and pirates on one lane: a fight, resolved from the
 * two sides' strength and Greece's dice, with a report. Won: the pirates are
 * sunk. Lost: the hurt trireme comes home (or goes down), the pirates stay.
 */
function laneFight(s: SimState, p: Pirates): void {
  const guards = s.fleet.triremes.filter((t) => t.order === 'lane' && t.lane === p.way && t.state === 'away' && !t.homeward && s.tick >= t.start + t.dur);
  if (!guards.length) return;
  p.fought = s.tick;
  const ours = guards.reduce((a, t) => a + 2 * (t.hp / 100) * Math.min(1, t.crew.length / CREW), 0);
  // (Slice 38: a city's warship counts half again a pirate ship.)
  const odds = clamp(ours / (ours + p.ships * (p.of ? WARSHIP_WORTH : 1)), 0.15, 0.92);
  const n = p.id * 7 + Math.floor(s.tick / TICKS_PER_DAY);
  const won = dice(s, n, 11) < odds;
  const names = guards.map((t) => triremeName(t));
  const who = names.length === 1 ? `The ${names[0]}` : `The ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const many = shipsWords(p);
  let line: string;
  if (won) {
    const hurt: string[] = [];
    guards.forEach((t, i) => {
      const h = Math.round(10 + 20 * dice(s, n + i, 12));
      t.hp = Math.max(1, t.hp - h);
      // (Slice 38: and her oars.)
      const o = Math.round(OARS_LANE + OARS_LANE_MORE * dice(s, n + i, 15));
      t.oars = Math.max(0, t.oars - o);
      hurt.push(`${guards.length > 1 ? `the ${triremeName(t)}’s ` : 'her '}hull took ${h} and ${o} of every hundred oars broke`);
    });
    line = `${who} met ${many} ${p.place} and sank ${p.ships === 1 ? 'her' : p.ships === 2 ? 'both' : 'all three'}; ${hurt.join(', ')}. The lane to ${cityName(p.city)} is clear`;
    // (Slice 38: a city's warships sunk: its fleet the smaller.)
    if (p.of) {
      const c = s.world.cities.find((x) => x.id === p.of);
      if (c) change(c, s.tick, 'blockade', 'warships sunk on your lanes', { fleet: -p.ships });
    }
    p.state = 'beaten';
    p.until = s.tick;
  } else {
    const t = guards.slice().sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
    const h = Math.round(40 + 30 * dice(s, n, 13));
    const sank = ours > p.ships * 0.6 && p.ships > 1 && dice(s, n, 14) < 0.5;
    if (sank) p.ships--;
    t.hp -= h;
    // (Slice 38: and her oars, badly.)
    t.oars = Math.max(0, t.oars - Math.round(OARS_LANE + OARS_LANE_MORE * dice(s, n, 16)));
    if (t.hp <= 0) {
      line = `${who} fought ${many} ${p.place} and lost: the ${triremeName(t)} was sunk, her rowers picked up and brought home${sank ? `; one ${p.of ? 'warship' : 'pirate ship'} went down too` : ''}. The ${p.of ? 'warships' : 'pirates'} still hold the lane`;
      s.fleet.triremes = s.fleet.triremes.filter((o) => o !== t);
    } else {
      line = `${who} fought ${many} ${p.place} and was beaten off: the ${triremeName(t)}’s hull took ${h} and many of her oars broke, and she limps home to be mended${sank ? `; one ${p.of ? 'warship' : 'pirate ship'} went down` : ''}. The ${p.of ? 'warships' : 'pirates'} still hold the lane`;
      t.order = 'bay';
      const at = triremeOnMap(t, s.tick);
      const here = at ? at.along : HORIZON_ALONG;
      t.a0 = here;
      t.a1 = HORIZON_ALONG;
      t.start = s.tick;
      t.dur = laneTicks(p.city, here, HORIZON_ALONG);
      t.homeward = true;
    }
  }
  s.fleet.reports.push({ tick: s.tick, way: p.way, city: p.city, won, line });
  news(s.world, s.tick, p.city, line, true);
  armyNews(s, line, 0);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Commands.

/** A fleet order (a command): send a trireme to guard a lane, or bring her home (slice 38: or call her in for repair). */
export function fleetCommand(s: SimState, map: CoastMap, id: number, act: string, lane: string): void {
  if (act === 'guard') sendGuard(s, map, id, lane);
  else if (act === 'home') callHome(s, map, id);
  else if (act === 'repair') callRepair(s, map, id);
}

// ---------------------------------------------------------------------------
// Slice 38: warships, and expeditions meeting pirates at sea.

/** A city's warship in a lane fight counts this many pirate ships; a lane fight breaks this many of a trireme's oars and up to so many more. */
const WARSHIP_WORTH = 1.5;
const OARS_LANE = 15;
const OARS_LANE_MORE = 25;

/** "Pirates", "Troy’s warships". */
export const bandWords = (p: Pirates): string => (p.of ? `${whose(p.of)} warships` : 'Pirates');
/** Review of slice 38: why a city's warships are on the lane: "at war with Athens", "at war with you" ('' for pirates). */
export function warWords(s: SimState, p: Pirates): string {
  if (!p.of) return '';
  const x = p.war !== undefined && p.war >= 0 ? s.world.wars.find((o) => o.id === p.war) : undefined;
  return x ? `at war with ${cityName(x.a === p.of ? x.b : x.a)}` : 'at war with you';
}
/** "a pirate ship", "two of Troy’s warships". */
function shipsWords(p: Pirates): string {
  const n = ['a', 'two', 'three'][p.ships - 1] ?? String(p.ships);
  if (p.of) return p.ships === 1 ? `a warship of ${cityName(p.of)}` : `${n} of ${whose(p.of)} warships`;
  return p.ships === 1 ? 'a pirate ship' : `${n} pirate ships`;
}

/**
 * Expeditions at sea (out or home) that have passed the place of pirates or
 * warships on their lane since yesterday fight them there: their triremes
 * and the men aboard (a company counts as a trireme) against their ships,
 * from the strengths and Greece's dice, with a report. Won, they are sunk;
 * lost, they hold the lane. The triremes take hull and oars but keep with
 * the fleet carrying your men (never sunk), and are mended when home. The
 * expedition's own record is not touched.
 */
function meetExpeditions(s: SimState): void {
  for (const e of s.world.expeditions) {
    if (e.by !== 'sea' || (e.phase !== 'marching' && e.phase !== 'homeward')) continue;
    const p = s.fleet.pirates.find((x) => x.way === e.way && (x.state === 'seen' || x.state === 'preying'));
    if (!p) continue;
    const leg = e.phase === 'homeward' ? 1 : 0;
    if ((p.met ?? []).some((m) => m === e.id * 2 + leg)) continue;
    const now = expeditionOnMap(e, s.tick);
    const before = expeditionOnMap(e, s.tick - TICKS_PER_DAY);
    if (!now || !before) continue;
    const at = stationAlong(p.way);
    const crossed = (before.along - at) * (now.along - at) <= 0 && before.along !== now.along;
    if (!crossed) continue;
    p.met = [...(p.met ?? []), e.id * 2 + leg];
    seaFight(s, e, p);
  }
}

function seaFight(s: SimState, e: Expedition, p: Pirates): void {
  const ships = e.ships.map((id) => triremeOf(s, id)).filter((t): t is Trireme => !!t && afloat(t));
  const ours = ships.reduce((a, t) => a + 2 * (t.hp / 100) * Math.min(1, t.crew.length / CREW), 0) + 2 * e.companies.length;
  const theirs = p.ships * (p.of ? WARSHIP_WORTH : 1);
  const odds = clamp(ours / (ours + theirs), 0.15, 0.95);
  const n = p.id * 11 + e.id * 3 + Math.floor(s.tick / TICKS_PER_DAY);
  const won = dice(s, n, 21) < odds;
  const hurt: string[] = [];
  ships.forEach((t, i) => {
    const h = Math.round((won ? 8 : 20) + (won ? 17 : 25) * dice(s, n + i, 22));
    const o = Math.round((won ? 10 : 20) + (won ? 20 : 25) * dice(s, n + i, 23));
    t.hp = Math.max(20, t.hp - h);
    t.oars = Math.max(10, t.oars - o);
    hurt.push(`the ${triremeName(t)}’s hull took ${h} and ${o} of every hundred oars broke`);
  });
  const what = e.kind === 'raid' ? 'Your raiding party' : 'Your army';
  const going = e.phase === 'homeward' ? `on its way home from ${cityName(e.city)}` : `on its way to ${cityName(e.city)}`;
  const many = shipsWords(p);
  let line: string;
  if (won) {
    p.state = 'beaten';
    p.until = s.tick;
    p.fought = s.tick;
    if (p.of) {
      const c = s.world.cities.find((x) => x.id === p.of);
      if (c) change(c, s.tick, 'blockade', 'warships sunk on your lanes', { fleet: -p.ships });
    }
    line = `${what}, ${going}, met ${many} ${p.place} and its triremes sank ${p.ships === 1 ? 'her' : p.ships === 2 ? 'both' : 'all three'}${hurt.length ? `; ${hurt.join(', ')}` : ''}. The lane to ${cityName(p.city)} is clear`;
  } else line = `${what}, ${going}, met ${many} ${p.place} and was beaten off: they keep the lane${hurt.length ? `; ${hurt.join(', ')}` : ''}. The triremes keep with the men aboard, and are mended when home`;
  s.fleet.reports.push({ tick: s.tick, way: p.way, city: p.city, won, line });
  news(s.world, s.tick, p.city, line, true);
  armyNews(s, line, 0);
  s.rev++;
}

/** Rowing out or in: called from the bay's step for triremes on those errands. */
export function stepErrands(s: SimState, map: CoastMap): void {
  for (const t of s.fleet.triremes) if (t.state === 'rowing' && (t.task === 'out' || t.task === 'in')) rowOutIn(s, map, t);
}

// ---------------------------------------------------------------------------
// In words (for the Army tab and the hovers).

/** What a trireme is doing, in words: "Moored at the shipyard", "Rowing out to meet a ship of Troy". */
export function triremeDoing(s: SimState, t: Trireme): string {
  const lane = LANES.find((l) => l.way === t.lane);
  switch (t.state) {
    case 'building':
      return `On the slip: ${Math.min(99, Math.floor((100 * t.work) / BUILD_TICKS))}% built`;
    case 'sinking':
      return 'Going down';
    case 'moored':
      // (Slice 38: laid up under repair, or mended at her mooring; her oars too.)
      if (t.mend) return `Laid up at the shipyard under repair: ${hurtWords(t)}`;
      return t.hp < 100 || t.oars < 100 ? `Moored at the shipyard, being mended (${hurtWords(t)})` : t.crew.length * 2 < CREW ? 'Moored at the shipyard, waiting for her rowers' : 'Moored at the shipyard, guarding the bay';
    case 'rowing': {
      if (t.task === 'fight') {
        const e = s.fleet.ships.find((x) => x.id === t.foe);
        const city = e ? cityOfShip(s, e) : undefined;
        const of = city ? ` of ${cityName(city)}` : '';
        if (e?.blockade) return `Rowing out to ram a ship${of} across the harbour’s mouth`;
        return e?.state === 'beached' ? `Rowing in on a ship${of} drawn up on the beach` : `Rowing out to ram a ship${of}`;
      }
      // (Slice 38: limping, her oars broken.)
      if (t.task === 'home') return t.hp < BREAK_OFF ? 'Badly holed: rowing home to be mended' : t.oars < CRIPPLED_OARS ? 'Her oars broken: limping home to be mended' : 'Rowing back to her mooring';
      if (t.task === 'out') return lane ? `Rowing out of the bay, to guard the lane to ${cityName(lane.city)}` : 'Rowing out of the bay';
      return 'Rowing in from the sea';
    }
    case 'away': {
      const at = triremeOnMap(t, s.tick);
      if (t.order === 'away') return at?.homeward ? 'Sailing home from the expedition' : 'Away with your soldiers';
      // Slice 37: guarding your colony (colonies.ts).
      if (t.lane.endsWith('-colony')) return colonyGuardWords(t.lane, !!at?.homeward || t.order !== 'lane', !!at?.station);
      if (!lane || at?.homeward) return 'Sailing home along the lane';
      return at?.station ? `On guard ${lane.name}, on the lane to ${cityName(lane.city)}` : `Sailing to guard the lane to ${cityName(lane.city)}, ${lane.name}`;
    }
  }
  return '';
}

/** What an enemy ship is doing, in words. */
export function enemyDoing(s: SimState, e: EnemyShip): string {
  // (Slice 38: or a blockade's ship.)
  const city = cityOfShip(s, e);
  const of = city ? ` of ${cityName(city)}` : '';
  if (e.blockade) {
    if (e.state === 'holding') return `A ship${of} holding the mouth of your harbour: no ship comes or goes`;
    if (e.state === 'sailing') return s.tick < e.from ? `A ship${of} on the horizon, come to blockade your harbour` : `A ship${of} sailing in to blockade your harbour`;
    if (e.state === 'leaving') return `A ship${of} sailing off, the blockade over`;
  }
  switch (e.state) {
    case 'sailing':
      return s.tick < e.from ? `A ship${of} on the horizon` : `A ship${of} sailing in, ${e.men} men aboard`;
    case 'beached':
      return `A ship${of} drawn up on the beach: ${e.men} ${e.men === 1 ? 'man' : 'men'} guard her while the raiders are ashore`;
    case 'leaving':
      return e.laden ? `A ship${of} sailing off with what was taken` : `A ship${of} sailing off`;
    case 'sinking':
      return `A ship${of} going down`;
  }
  return '';
}

/** What pirates took, in words, each kind once ("Troy’s trader’s cargo twice", not the same words twice over: review of phase 4). */
function tookWords(took: readonly string[]): string {
  const n = new Map<string, number>();
  for (const t of took) n.set(t, (n.get(t) ?? 0) + 1);
  const times = ['', '', ' twice', ' three times'];
  return [...n].map(([t, k]) => `${t}${times[k] ?? ` ${k} times`}`).join(', ');
}
