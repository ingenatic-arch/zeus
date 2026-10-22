/**
 * The great houses (slice 36): estates and great estates.
 *
 * An estate is a home laid out on its own 4 x 4 plot (`estate` set; the plot
 * tool's command is `estate`, sim.ts). Ordinary settlers never take one: a
 * noble house comes to an empty estate's plot only once the city has a villa
 * (a city where people of quality already live), along the road from the
 * map's edge, NOBLE_HOUSE strong, and its kin follow, all together, until
 * it is full (12 at an estate, 20 at a great estate). Once there, it needs
 * every walker a villa needs to pass its gate, as a villa does.
 * (Tried first: only once every villa walker had passed the plot within a
 * month. An empty plot draws no walker, so in #richtown one never came.)
 *
 * Its levels: the *estate* (7) needs all a villa does; the *great estate* (8)
 * also marble for its statues, armour for its sons and horses for its stable.
 * Those three it fetches itself: its porter goes to the nearest storehouse
 * that has some when what it has in hand would last less than FETCH_BELOW
 * (an estate fetches them once the city has any, to have them in hand when
 * it rises), and keeps what he brings in its stable and yard, at most MOST of
 * each. A great estate uses one block, set or horse at a time, each lasting
 * LASTS; the stock book counts them used as they come in, as a vendor's
 * goods are. An estate rises after a month as it is, with a month in hand of
 * everything a great estate needs (folk.ts: readyToRise). A great estate
 * that goes two months and ten days without one of its needs (as any home
 * does: folk.ts's WARN_AFTER and WARNING) drops back to an estate; an estate
 * without a villa's need that long is left: the noble house packs up and
 * goes, and the plot waits for another.
 *
 * Its people keep to the estate (labour.ts: none of them works in the city),
 * pay the most tax (taxes.ts), draw envy from further off (crime.ts), and send
 * a son each to ride with the horsemen (army.ts).
 *
 * Pure and deterministic: nothing here draws a random number, and a town
 * with no estate's plot runs exactly as before.
 */
import type { CoastMap } from '../map/bake';
import { around, capacity, centreOf, ESTATE, GREAT_ESTATE, levelName, recountPopulation, VILLA } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { nearestBy, wayPoints } from './food';
import { ARMOUR, gi, held, HORSES, MARBLE, setHeld, type Ware } from './foods';
import { BRINGER, DECLINE_AFTER, missingNeed, moveOut, NEED_WORDS, readyToRise, RISE_MIN, tell, WARN_AFTER, warningsOf, type Warning } from './folk';
import { edgeRoads, nearestReached, roadSearch, tracePath, type Search } from './roads';
import { door, roadsBeside } from './rounds';
import { sendLeavers } from './settlers';
import { noteHomeUse } from './stockbook';
import { isStore } from './stores';
import { TILE_ROAD, type Building, type Need, type SimState } from './state';
import { newWalker, offMapPoint, plotCentre, roadPoints, setPath } from './walk';

/** What an estate's porter fetches for it, in the order they are always shown. */
export type EstateNeed = 'marble' | 'armour' | 'horses';
export const ESTATE_NEEDS: readonly EstateNeed[] = ['marble', 'armour', 'horses'];
/** Each one's ware. */
export const WARE_OF: Record<EstateNeed, Ware> = { marble: MARBLE, armour: ARMOUR, horses: HORSES };
/** How long one lasts a great estate: a block of marble five days (about six a month, for its statues and floors), a set of armour two months, a horse a month and a half. */
export const LASTS: Record<EstateNeed, number> = { marble: 5 * TICKS_PER_DAY, armour: 2 * TICKS_PER_MONTH, horses: 45 * TICKS_PER_DAY };
/** The most an estate keeps of each in its yard and stable. */
export const MOST: Record<EstateNeed, number> = { marble: 24, armour: 3, horses: 4 };
/** What its porter brings at most in one trip (a handcart of blocks, two sets, two horses on a lead). */
export const TAKE: Record<EstateNeed, number> = { marble: 24, armour: 2, horses: 2 };
/** Its porters go for more when what it has in hand would last less than this (a porter's walk to a storehouse across town and back can take a month). */
export const FETCH_BELOW = 3 * TICKS_PER_MONTH;
/** How long its porter waits after finding nothing to fetch before looking again. */
const FETCH_AGAIN = 5 * TICKS_PER_DAY;
/** The noble house that comes to an empty estate's plot (its kin follow, all together, to fill it). */
export const NOBLE_HOUSE = 6;

/** Each in a word, as people say it. */
export const ESTATE_WORDS: Record<EstateNeed, string> = { marble: 'marble', armour: 'armour', horses: 'horses' };
/** Who brings each. */
export const ESTATE_BRINGER: Record<EstateNeed, string> = { marble: 'their porter with marble', armour: 'their porter with armour', horses: 'their groom with horses' };
/** A need in a word, a villa's or an estate's. */
export const needWord = (need: Need): string => (isEstateNeed(need) ? ESTATE_WORDS[need] : NEED_WORDS[need]);
/** Who brings a need, a villa's or an estate's. */
export const bringerOf = (need: Need): string => (isEstateNeed(need) ? ESTATE_BRINGER[need] : BRINGER[need]);
export const isEstateNeed = (need: Need | ''): need is EstateNeed => need === 'marble' || need === 'armour' || need === 'horses';

/** Is this an estate with its house living in it? */
export const isEstate = (b: Building): boolean => b.kind === 'home' && b.estate && b.level >= ESTATE;
/** An estate's plot nobody has come to yet. */
export const isEstatePlot = (b: Building): boolean => b.kind === 'home' && b.estate && b.level === 0;

// ---------------------------------------------------------------------------
// What an estate has in hand.

/** The tick an estate's supply of one of its wares runs out: the one in use, then those in its stable and yard. */
export function wareUntil(s: SimState, b: Building, need: EstateNeed): number {
  return Math.max(s.tick, b.goodsUntil[gi(WARE_OF[need])]) + held(b, WARE_OF[need]) * LASTS[need];
}

/** Does an estate have a month in hand of its marble, armour and horses (to rise to a great estate)? */
export function estateStocked(s: SimState, b: Building): boolean {
  return ESTATE_NEEDS.every((need) => wareUntil(s, b, need) - s.tick >= RISE_MIN);
}

/** Since when a great estate has been without one of its wares (the tick it ran out, or its last change of level, if later; in the future while it has some). */
export function wareMissingSince(b: Building, need: EstateNeed): number {
  return Math.max(b.goodsUntil[gi(WARE_OF[need])], b.since);
}

/** An estate's warning about one of its wares, as folk.ts's for a service. */
export interface WareWarning {
  need: EstateNeed;
  since: number;
  left: number;
}

/** What a great estate warns about of its marble, armour and horses now, the most urgent first (an estate: nothing, as it doesn't need them yet). */
export function wareWarnings(s: SimState, b: Building): WareWarning[] {
  if (!isEstate(b) || b.level < GREAT_ESTATE || b.people === 0) return [];
  const out: WareWarning[] = [];
  for (const need of ESTATE_NEEDS) {
    const since = wareMissingSince(b, need);
    if (since > s.tick || s.tick - since < WARN_AFTER) continue;
    out.push({ need, since, left: Math.max(0, DECLINE_AFTER - (s.tick - since)) });
  }
  return out.sort((a, c) => a.left - c.left);
}

/** Every warning an estate gives now, a villa's needs and its own wares together, the most urgent first. */
export function estateWarnings(s: SimState, b: Building): Array<Warning | WareWarning> {
  return [...warningsOf(s, b), ...wareWarnings(s, b)].sort((a, c) => a.left - c.left);
}

/** The wares an estate fetches now: a great estate all three; an estate those the city's storehouses have, to have them in hand when it rises. */
export function wanted(s: SimState, b: Building): EstateNeed[] {
  if (!isEstate(b) || b.people === 0) return [];
  return ESTATE_NEEDS.filter((need) => wareUntil(s, b, need) - s.tick < FETCH_BELOW && held(b, WARE_OF[need]) < MOST[need]);
}

/** Does any store in the city hold some of a ware? */
const storesHave = (s: SimState, w: Ware): boolean => s.buildings.some((g) => isStore(g.kind) && held(g, w) > 0);

// ---------------------------------------------------------------------------
// Its porter.

/** Is an estate's porter out (for this ware; any, without one)? It has one for each. */
export const estatePorterOut = (s: SimState, b: Building, w?: Ware): boolean => s.walkers.some((p) => p.kind === 'porter' && p.origin === b.id && (w === undefined || p.food === w));

/** What an estate's porter takes from a store of what it holds there (food.ts, at the store's gate). */
export function estateTake(b: Building, w: Ware, there: number): number {
  const need = ESTATE_NEEDS.find((n) => WARE_OF[n] === w);
  if (!need) return 0;
  return Math.max(0, Math.min(TAKE[need], there, MOST[need] - held(b, w)));
}

/** The porter is home: what he brought goes into the estate's stable or yard (and the stock book counts it used, as a vendor's goods are). */
export function bringHome(s: SimState, b: Building, w: Ware, n: number): void {
  const need = ESTATE_NEEDS.find((m) => WARE_OF[m] === w);
  if (!need || n <= 0) return;
  const now = Math.min(MOST[need], held(b, w) + n);
  noteHomeUse(s, w, b, now - held(b, w));
  setHeld(b, w, now);
}

/** Send an estate's porters, one for each ware it is short of that a store has, if it is time (each ware's own clock in `fetch`). */
function sendPorters(s: SimState, size: number, b: Building): void {
  for (const need of wanted(s, b)) {
    const w = WARE_OF[need];
    const k = gi(w);
    if (b.fetch[k] > 0) {
      b.fetch[k] = Math.max(0, b.fetch[k] - TICKS_PER_DAY);
      continue;
    }
    if (estatePorterOut(s, b, w)) continue;
    const found = storesHave(s, w) ? nearestBy(s, size, roadsBeside(s, size, b), (g) => isStore(g.kind) && held(g, w) > 0) : null;
    if (!found) {
      b.fetch[k] = FETCH_AGAIN;
      continue;
    }
    const p = newWalker(s, 'porter', 1);
    p.origin = b.id;
    p.target = found.g.id;
    p.food = w;
    p.since = s.tick;
    setPath(p, wayPoints(size, door(size, b, found.way[0]), found.way, found.g));
    s.walkers.push(p);
  }
}

// ---------------------------------------------------------------------------
// The noble house and its kin.

/** Does the city have a villa with people in it (a noble house comes only to a city that has)? */
export const hasVilla = (s: SimState): boolean => s.buildings.some((b) => b.kind === 'home' && !b.estate && b.level >= VILLA && b.people > 0);

/** Send people in from the map's edge to an estate (the noble house to its plot, or its kin), along the search's roads. */
function sendIn(s: SimState, size: number, search: Search, b: Building, people: number): boolean {
  const at = nearestReached(search, around(size, b).filter((t) => s.tiles[t] === TILE_ROAD));
  if (at < 0 || people <= 0) return false;
  const road = tracePath(search, at);
  const [ox, oz] = offMapPoint(size, road[0]);
  const [px, pz] = plotCentre(b);
  const w = newWalker(s, 'settler', people);
  w.home = b.id;
  setPath(w, [[ox, oz, -1], ...roadPoints(s, size, road), [px, pz, -1]]);
  b.incoming += people;
  s.walkers.push(w);
  return true;
}

/**
 * Once a day: estates' porters, and the noble houses coming in (an empty
 * estate's plot on a villa's street) and their kin following (an estate with
 * room). Nothing in a town with no estate's plot.
 */
export function stepEstates(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const size = map.size;
  let search: Search | null = null;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || !b.estate) continue;
    if (b.level >= ESTATE && b.people > 0) sendPorters(s, size, b);
    if (b.incoming > 0) continue;
    const plot = b.level === 0 && b.people === 0;
    if (!plot && !(b.level >= ESTATE && b.people > 0 && b.people < capacity(b))) continue;
    if (plot && !hasVilla(s)) continue;
    if (!search) {
      const edges = edgeRoads(s, size);
      if (edges.length === 0) return;
      search = roadSearch(s, size, edges);
    }
    sendIn(s, size, search, b, plot ? NOBLE_HOUSE : capacity(b) - b.people);
  }
}

/**
 * An estate's day (houses.ts, once a day each, staggered by id): a great
 * estate takes the next block, set or horse as the last is used up; it rises,
 * warns, or goes down: a great estate to an estate, an estate to an empty
 * plot, its house leaving. True if its level changed.
 */
export function estateDay(s: SimState, map: CoastMap, b: Building, rise: (b: Building) => void): boolean {
  // The next of each, as the last is used up.
  if (b.level >= GREAT_ESTATE) {
    for (const need of ESTATE_NEEDS) {
      const k = gi(WARE_OF[need]);
      if (b.goodsUntil[k] - s.tick >= TICKS_PER_DAY || held(b, WARE_OF[need]) <= 0) continue;
      setHeld(b, WARE_OF[need], held(b, WARE_OF[need]) - 1);
      b.goodsUntil[k] = Math.max(b.goodsUntil[k], s.tick) + LASTS[need];
    }
  }
  if (b.people === 0) return false;
  const f = b.family;
  if (b.level === ESTATE && readyToRise(s, b)) {
    rise(b);
    return true;
  }
  if (f) {
    const now: Need[] = estateWarnings(s, b).map((w) => w.need);
    for (const need of now) if (!f.warned.includes(need)) tell(s, f, 'warn', b.level, [], need);
    for (const need of f.warned) if (!now.includes(need)) tell(s, f, 'relief', b.level, [], need);
    f.warned = now;
  }
  // The need missing longest, a villa's or (a great estate) its own.
  let lack: { need: Need; since: number } | null = missingNeed(b);
  if (b.level >= GREAT_ESTATE) {
    for (const need of ESTATE_NEEDS) {
      const since = wareMissingSince(b, need);
      if (!lack || since < lack.since) lack = { need, since };
    }
  }
  if (!lack || lack.since > s.tick || s.tick - lack.since < DECLINE_AFTER) return false;
  if (b.level >= GREAT_ESTATE) {
    // Back to an estate: the kin it can no longer hold go.
    b.level = ESTATE;
    b.since = s.tick;
    if (f) {
      f.warned = [];
      tell(s, f, 'down', b.level, [], lack.need);
    }
    const extra = b.people - capacity(b);
    if (extra > 0) {
      const going = f ? moveOut(s, b, extra, lack.need).length : extra;
      b.people -= going;
      s.left += going;
      sendLeavers(s, map, going, centreOf(b), around(map.size, b));
    }
    return true;
  }
  // An estate without a villa's need: the noble house packs up and goes, and the plot waits for another.
  leave(s, map, b, lack.need);
  return true;
}

/** The noble house leaves its estate for good: everyone walks out, what was in its stable and yard goes with them, and the plot is empty again. */
function leave(s: SimState, map: CoastMap, b: Building, need: Need): void {
  if (b.family) tell(s, b.family, 'left', b.level, [], need);
  const going = b.people;
  s.left += going;
  sendLeavers(s, map, going, centreOf(b), around(map.size, b));
  b.people = 0;
  b.family = null;
  b.level = 0;
  b.since = s.tick;
  for (const n of ESTATE_NEEDS) {
    setHeld(b, WARE_OF[n], 0);
    b.goodsUntil[gi(WARE_OF[n])] = 0;
  }
  recountPopulation(s);
}

// ---------------------------------------------------------------------------
// Words.

/** What an estate's level is called in a sentence. */
export const estateName = (b: Building): string => (b.level === 0 ? 'an estate’s plot' : levelName(b.level));

/** Why no noble house has come to an estate's plot yet, in words ('' if one is on its way). */
export function plotWaits(s: SimState, map: CoastMap, b: Building): string {
  if (b.incoming > 0) return 'A noble house is on its way to it';
  if (roadsBeside(s, map.size, b).length === 0) return 'No road beside it: a noble house comes in by the road from the edge of your land';
  if (!hasVilla(s)) return 'A noble house comes only to a city that has a villa: raise a home to a villa first';
  return 'A noble house will come any day now, if a road from the edge of your land reaches it';
}
