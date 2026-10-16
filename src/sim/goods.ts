/**
 * Goods: olives, oil, fleece, grapes and wine (see foods.ts for the order
 * they are saved in), and the agora's stalls that sell them.
 *
 * An agora can have a stall for a good beside its food stall (`stalls`, a bit
 * each), added from the build bar for a price and two more workers. The
 * stall's porter fetches the good from the nearest store that has it (a
 * storehouse) when the stall is down to half, and its vendor walks the shared
 * round (rounds.ts) like the food vendor, from her own clock (`vclock`),
 * topping up every home that wants the good beside her way. Only oil has a
 * stall and a vendor so far; fleece and wine follow in slice 11.
 *
 * Oil: a home the oil vendor tops up has oil for six months; it costs a jar
 * a month for every five people. Cottages and better buy it; a townhouse
 * needs it (folk.ts).
 */
import type { CoastMap } from '../map/bake';
import { STALL_COST } from './build';
import { COTTAGE, findBuilding } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { FIRST_VENDOR, GOOD_PORTER_TAKE, GOOD_STALL_ROOM, nearestBy, portersOut, PORTER_RETRY, VENDOR_RANGE, VENDOR_REST, VENDOR_WALK, wayPoints } from './food';
import { gi, held, OIL, setHeld, type Ware } from './foods';
import { serviceDue, serviceScore } from './folk';
import { door, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import type { Building, SimState, Walker } from './state';
import { isStore, roomOf } from './stores';
import { besideRoad, CARRIER_SPEED, newWalker, setPath } from './walk';
import { restFor } from './water';

/** Each good by name, in order (from olives). */
export const GOOD_NAMES = ['olives', 'oil', 'fleece', 'grapes', 'wine'] as const;

/** The goods an agora can have a stall for (fleece and wine in slice 11). */
export const STALL_GOODS: readonly Ware[] = [OIL];
/** A good's bit in an agora's `stalls`. */
export const stallBit = (w: Ware): number => 1 << gi(w);
export const hasStall = (a: Building, w: Ware): boolean => a.kind === 'agora' && (a.stalls & stallBit(w)) !== 0;
/** What a stall costs to add. */
export const stallPrice = (_w: Ware): number => STALL_COST;
/** Each stall's vendor (a walker kind) and its name. */
export const STALL_VENDOR: Partial<Record<Ware, Walker['kind']>> = { [OIL]: 'oil' };
export const STALL_NAMES: Partial<Record<Ware, string>> = { [OIL]: 'oil stall' };
/** How low a stall's good gets before its porter goes for more. */
export const STALL_GOOD_LOW = GOOD_STALL_ROOM - GOOD_PORTER_TAKE;

/** How long a home's oil lasts once the vendor has topped it up (six months: her round can take three)… */
export const OIL_LASTS = 6 * TICKS_PER_MONTH;
/** …and how many people a jar of oil lasts a month. */
export const OIL_PEOPLE = 6;

/** Does this home buy oil? Cottages and better with people in them. */
export const usesOil = (b: Building): boolean => b.kind === 'home' && b.level >= COTTAGE && b.people > 0;

/** The tick a home's supply of a good lasts until (0: never had any). */
export const goodUntil = (b: Building, w: Ware): number => b.goodsUntil[gi(w)];

const near: Building[] = [];

/** The oil vendor's round. */
export const OIL_ROUND: ServiceSpec = {
  record: (s) => s.rounds.oil,
  range: VENDOR_RANGE,
  walk: VENDOR_WALK,
  speed: CARRIER_SPEED,
  score: (b) => serviceScore(b, 'oil', usesOil(b)),
  due: (b) => serviceDue(b, 'oil'),
  serve(s: SimState, size: number, t: number, w: Walker) {
    const a = findBuilding(s, w.origin);
    if (!a || !hasStall(a, OIL)) return;
    let have = held(a, OIL);
    if (have <= 0) return;
    const k = gi(OIL);
    const full = s.tick + OIL_LASTS;
    let changed = false;
    for (const b of besideRoad(s, size, t, near)) {
      if (!usesOil(b)) continue;
      const until = b.goodsUntil[k];
      if (until >= full) continue;
      const from = Math.max(until, s.tick);
      const cost = Math.ceil((b.people * (full - from)) / (TICKS_PER_MONTH * OIL_PEOPLE));
      if (cost <= have) {
        b.goodsUntil[k] = full;
        have -= cost;
      } else {
        b.goodsUntil[k] = from + Math.floor((have * TICKS_PER_MONTH * OIL_PEOPLE) / b.people);
        have = 0;
      }
      changed = true;
      if (have <= 0) break;
    }
    if (changed) {
      setHeld(a, OIL, have);
      s.looks++;
    }
  },
  rest: (b) => restFor(b, VENDOR_REST),
  rested: (b) => {
    b.vclock[gi(OIL)] = restFor(b, VENDOR_REST);
  },
};

/** Move the oil vendor one tick along. */
export function moveOilVendor(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, OIL_ROUND, 'agora');
}

/** Does any store in the city hold some of this good? */
const anyStoreHas = (s: SimState, w: Ware): boolean => s.buildings.some((g) => isStore(g.kind) && roomOf(g.kind, w) > 0 && held(g, w) > 0);

/**
 * An agora's stalls, each tick: each stall's vendor sets off from her own
 * clock while the stall has its good, and the goods porter (one for all the
 * agora's stalls, his clock `fetch`) goes for the first good that is down to
 * half and that some store has.
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
  if (a.fetch > 0) a.fetch--;
  if (rate === 0 || a.fetch > 0 || portersOut(s, a, true) > 0) return;
  const good = STALL_GOODS.find((g) => hasStall(a, g) && held(a, g) <= STALL_GOOD_LOW && anyStoreHas(s, g));
  if (good === undefined) return;
  const found = nearestBy(s, size, roadsBeside(s, size, a), (g) => isStore(g.kind) && roomOf(g.kind, good) > 0 && held(g, good) > 0);
  if (!found) {
    a.fetch = PORTER_RETRY;
    return;
  }
  const w = newWalker(s, 'porter', 1);
  w.origin = a.id;
  w.target = found.g.id;
  w.food = good;
  w.since = s.tick;
  setPath(w, wayPoints(size, door(size, a, found.way[0]), found.way, found.g));
  s.walkers.push(w);
  a.fetch = restFor(a, VENDOR_REST);
}

/** A stall's walkers: its vendor, and the goods porter while he is after its good. */
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
