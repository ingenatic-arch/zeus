/**
 * Goods: olives, oil, fleece, grapes and wine (see foods.ts for the order
 * they are saved in), and the agora's stalls that sell them.
 *
 * An agora can have a stall for a good beside its food stall (`stalls`, a bit
 * each), added from the build bar for a price and one more worker
 * (STALL_JOBS). Each stall has its own porter, who fetches its good from the
 * nearest store that has it (a storehouse) when the stall is down to half,
 * on his own clock (`fetch`), and its own vendor, who walks the shared round
 * (rounds.ts) like the food vendor, from her own clock (`vclock`), topping up
 * every home that wants the good beside her way.
 *
 * Every good with a stall is a row of GOOD_USE: the need it is, which homes
 * buy it, how long a top-up lasts and how many people a unit serves a month.
 * Oil: cottages and better buy it, a townhouse needs it. Fleece: townhouses
 * and better buy it, a fine house needs it. Wine: fine houses and better buy
 * it, a villa needs it (folk.ts).
 */
import type { CoastMap } from '../map/bake';
import { STALL_COST } from './build';
import { COTTAGE, FINE, findBuilding, TOWNHOUSE } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { FIRST_VENDOR, nearestBy, porterTake, PORTER_RETRY, stallPorterOut, stallRoom, VENDOR_RANGE, VENDOR_REST, VENDOR_WALK, wayPoints } from './food';
import { ARMOUR, FLEECE, gi, held, MARBLE, OIL, setHeld, TIMBER, WINE, type Ware } from './foods';
import { serviceDue, serviceScore } from './folk';
import { door, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import type { Building, Service, SimState, Walker } from './state';
import { isStore, roomOf } from './stores';
import { besideRoad, CARRIER_SPEED, newWalker, setPath } from './walk';
import { noteHomeUse } from './stockbook';
import { restFor } from './water';

/** Each good by name, in order (from olives). */
export const GOOD_NAMES = ['olives', 'oil', 'fleece', 'grapes', 'wine', 'copper', 'armour', 'marble', 'timber'] as const;
/** What each ware is counted in, one and many (foods and the picked crops in measures). */
export const UNITS: Partial<Record<Ware, readonly [string, string]>> = { [OIL]: ['jar', 'jars'], [FLEECE]: ['bale', 'bales'], [WINE]: ['amphora', 'amphorae'], [ARMOUR]: ['set', 'sets'], [MARBLE]: ['block', 'blocks'], [TIMBER]: ['log', 'logs'] };
/** "a jar", "12 jars", "1 measure", "300 measures". */
export const unitOf = (w: Ware, n: number): string => (UNITS[w] ?? ['measure', 'measures'])[n === 1 ? 0 : 1];

/** The goods an agora can have a stall for, in the order they are added and shown. */
export const STALL_GOODS: readonly Ware[] = [OIL, FLEECE, WINE];
/** A good's bit in an agora's `stalls`. */
export const stallBit = (w: Ware): number => 1 << gi(w);
export const hasStall = (a: Building, w: Ware): boolean => a.kind === 'agora' && (a.stalls & stallBit(w)) !== 0;
/** What a stall costs to add. */
export const stallPrice = (_w: Ware): number => STALL_COST;
/** Each stall's vendor (a walker kind) and its name. */
export const STALL_VENDOR: Partial<Record<Ware, Walker['kind']>> = { [OIL]: 'oil', [FLEECE]: 'fleece', [WINE]: 'wine' };
export const STALL_NAMES: Partial<Record<Ware, string>> = { [OIL]: 'oil stall', [FLEECE]: 'fleece stall', [WINE]: 'wine stall' };
/** How low a stall's good gets before its porter goes for more (half its room). */
export const stallLow = (w: Ware): number => stallRoom(w) - porterTake(w);
/** The oil stall's (kept for the oil-era code and tests). */
export const STALL_GOOD_LOW = stallLow(OIL);

/** How long a home's oil lasts once the vendor has topped it up (six months: her round can take three)… */
export const OIL_LASTS = 6 * TICKS_PER_MONTH;
/** …and how many people a jar of oil lasts a month. */
export const OIL_PEOPLE = 6;
/** Fleece and wine: six months a top-up too, a bale or an amphora a month for every eight people. */
export const FLEECE_LASTS = 6 * TICKS_PER_MONTH;
export const FLEECE_PEOPLE = 8;
export const WINE_LASTS = 6 * TICKS_PER_MONTH;
export const WINE_PEOPLE = 8;

/** Does this home buy oil? Cottages and better with people in them. */
export const usesOil = (b: Building): boolean => b.kind === 'home' && b.level >= COTTAGE && b.people > 0;
/** Fleece: townhouses and better; wine: fine houses and better. */
export const usesFleece = (b: Building): boolean => b.kind === 'home' && b.level >= TOWNHOUSE && b.people > 0;
export const usesWine = (b: Building): boolean => b.kind === 'home' && b.level >= FINE && b.people > 0;

/** The tick a home's supply of a good lasts until (0: never had any). */
export const goodUntil = (b: Building, w: Ware): number => b.goodsUntil[gi(w)];

const near: Building[] = [];

/**
 * How the homes use each good that has a stall: who buys it, how long a
 * vendor's top-up lasts, how many people a unit serves a month, and the
 * service (round record and need) it is.
 */
export interface GoodUse {
  uses(b: Building): boolean;
  lasts: number;
  people: number;
  service: Service;
}
export const GOOD_USE: Partial<Record<Ware, GoodUse>> = {
  [OIL]: { uses: usesOil, lasts: OIL_LASTS, people: OIL_PEOPLE, service: 'oil' },
  [FLEECE]: { uses: usesFleece, lasts: FLEECE_LASTS, people: FLEECE_PEOPLE, service: 'fleece' },
  [WINE]: { uses: usesWine, lasts: WINE_LASTS, people: WINE_PEOPLE, service: 'wine' },
};

/** A stall vendor's round for a good: she tops up every home that uses it beside her way, from her stall's stock. */
function goodRound(good: Ware, use: GoodUse): ServiceSpec {
  const k = gi(good);
  return {
    record: (s) => s.rounds[use.service],
    range: VENDOR_RANGE,
    walk: VENDOR_WALK,
    speed: CARRIER_SPEED,
    score: (b, s) => serviceScore(b, use.service, use.uses(b), s.tick),
    due: (b) => serviceDue(b, use.service),
    serve(s: SimState, size: number, t: number, w: Walker) {
      const a = findBuilding(s, w.origin);
      if (!a || !hasStall(a, good)) return;
      let have = held(a, good);
      if (have <= 0) return;
      const full = s.tick + use.lasts;
      let changed = false;
      for (const b of besideRoad(s, size, t, near)) {
        if (!use.uses(b)) continue;
        const until = b.goodsUntil[k];
        if (until >= full) continue;
        const from = Math.max(until, s.tick);
        const cost = Math.ceil((b.people * (full - from)) / (TICKS_PER_MONTH * use.people));
        if (cost <= have) {
          b.goodsUntil[k] = full;
          have -= cost;
          noteHomeUse(s, good, b, cost);
        } else {
          b.goodsUntil[k] = from + Math.floor((have * TICKS_PER_MONTH * use.people) / b.people);
          noteHomeUse(s, good, b, have);
          have = 0;
        }
        changed = true;
        if (have <= 0) break;
      }
      if (changed) {
        setHeld(a, good, have);
        s.looks++;
      }
    },
    rest: (b) => restFor(b, VENDOR_REST),
    rested: (b) => {
      b.vclock[k] = restFor(b, VENDOR_REST);
    },
  };
}

/** Each stall good's vendor round. */
export const STALL_ROUNDS: Partial<Record<Ware, ServiceSpec>> = {};
for (const g of STALL_GOODS) {
  const use = GOOD_USE[g];
  if (use) STALL_ROUNDS[g] = goodRound(g, use);
}
/** The oil vendor's round. */
export const OIL_ROUND: ServiceSpec = STALL_ROUNDS[OIL]!;
/** Does a good have a stall (and a vendor) at all? */
export const isStallGood = (w: Ware): boolean => STALL_GOODS.includes(w);

/** The good a stall vendor (by walker kind) sells, or -1 if the kind is no stall vendor. */
export const vendorGood = (kind: Walker['kind']): Ware => {
  for (const g of STALL_GOODS) if (STALL_VENDOR[g] === kind) return g;
  return -1;
};

/** Move a stall's vendor (the oil, fleece or wine vendor) one tick along. */
export function moveStallVendor(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, STALL_ROUNDS[vendorGood(w.kind)]!, 'agora');
}

/** Does any store in the city hold some of this good? */
const anyStoreHas = (s: SimState, w: Ware): boolean => s.buildings.some((g) => isStore(g.kind) && roomOf(g.kind, w) > 0 && held(g, w) > 0);

/**
 * An agora's stalls, each tick: each stall's vendor sets off from her own
 * clock while the stall has its good, and each stall's porter (his clock
 * `fetch`) goes for its good when it is down to half and some store has it.
 * (With only an oil stall this is exactly the one goods porter of before.)
 */
export function stepStalls(s: SimState, size: number, a: Building, rate: number): void {
  for (const good of STALL_GOODS) {
    if (!hasStall(a, good)) continue;
    const k = gi(good);
    if (a.vclock[k] >= 0 && --a.vclock[k] <= 0) {
      const kind = STALL_VENDOR[good];
      if (rate === 0 || !kind || held(a, good) <= 0 || !sendOut(s, size, a, kind, true)) a.vclock[k] = VENDOR_REST;
      else a.vclock[k] = -1;
    }
  }
  for (const good of STALL_GOODS) {
    if (!hasStall(a, good)) continue;
    const k = gi(good);
    if (a.fetch[k] > 0) a.fetch[k]--;
    if (rate === 0 || a.fetch[k] > 0 || stallPorterOut(s, a, good)) continue;
    if (held(a, good) > stallLow(good) || !anyStoreHas(s, good)) continue;
    const found = nearestBy(s, size, roadsBeside(s, size, a), (g) => isStore(g.kind) && roomOf(g.kind, good) > 0 && held(g, good) > 0);
    if (!found) {
      a.fetch[k] = PORTER_RETRY;
      continue;
    }
    const w = newWalker(s, 'porter', 1);
    w.origin = a.id;
    w.target = found.g.id;
    w.food = good;
    w.since = s.tick;
    setPath(w, wayPoints(size, door(size, a, found.way[0]), found.way, found.g));
    s.walkers.push(w);
    a.fetch[k] = restFor(a, VENDOR_REST);
  }
}

/** A stall's walkers: its vendor, and its porter. */
export const stallWalker = (w: Walker, a: Building, good: Ware): boolean => w.origin === a.id && (w.kind === STALL_VENDOR[good] || (w.kind === 'porter' && w.food === good));

/** A new stall's vendor sets off this soon. */
export const FIRST_STALL_VENDOR = FIRST_VENDOR;

/** The first goods an agora's stalls can still be added for, in order. */
export const stallsToAdd = (a: Building): Ware[] => STALL_GOODS.filter((g) => !hasStall(a, g));

/** Why a stall for this good can't be added to the agora at this tile, or '' if it can. */
export function stallRefusal(s: SimState, size: number, at: number, good: Ware, money: number): string {
  if (!STALL_GOODS.includes(good)) return 'There is no stall for that';
  const id = at >= 0 && at < s.tiles.length ? s.tiles[at] : 0;
  const a = id > 0 ? findBuilding(s, id) : undefined;
  if (!a || a.kind !== 'agora') return 'Stalls go on an agora: click one';
  if (hasStall(a, good)) return `This agora has its ${STALL_NAMES[good] ?? 'stall'} already`;
  if (roadsBeside(s, size, a).length === 0) return 'The agora needs a road beside it first';
  if (money < stallPrice(good)) return 'Not enough money';
  return '';
}
