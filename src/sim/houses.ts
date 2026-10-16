/**
 * Homes change with what reaches them, each looked at once a day (staggered
 * by id): a tent with people and water becomes a hut; a hut with water and
 * food becomes a cottage. A home drops a level when what its level needs has
 * been missing for a month, counted from when it ran out or from the home's
 * last change of level, whichever is later (a hut needs water; a cottage
 * water and food), and the people it can no longer hold walk out. Each
 * household pays rent on the first day of the month.
 */
import type { CoastMap } from '../map/bake';
import { around, capacity, centreOf, COTTAGE, HUT, recountPopulation, TENT } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { sendLeavers } from './settlers';
import type { Building, SimState } from './state';

/** How long a level's need can be missing before the home drops a level (a month). */
export const DECLINE_AFTER = TICKS_PER_MONTH;

/** Rent a household pays each month, by level (plot, tent, hut, cottage). */
export const RENT = [0, 1, 2, 4];

/**
 * The need a home's level is missing longest and since when, or null if it
 * has all it needs: 'water' or 'food' and the tick it ran out (or the home's
 * last change of level, if later).
 */
export function missing(b: Building): { need: 'water' | 'food'; since: number } | null {
  const now = (until: number): number => Math.max(until, b.since);
  let worst: { need: 'water' | 'food'; since: number } | null = null;
  if (b.level >= HUT) worst = { need: 'water', since: now(b.waterUntil) };
  if (b.level >= COTTAGE && (!worst || now(b.foodUntil) < worst.since)) worst = { need: 'food', since: now(b.foodUntil) };
  return worst;
}

export function stepHouses(s: SimState, map: CoastMap): void {
  let changed = false;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0 || (s.tick + b.id) % TICKS_PER_DAY !== 0) continue;
    const wet = b.waterUntil > s.tick;
    const fed = b.foodUntil > s.tick;
    if (b.level === TENT && wet && b.people > 0) {
      b.level = HUT;
      b.since = s.tick;
      changed = true;
      continue;
    }
    if (b.level === HUT && wet && fed && b.people > 0) {
      b.level = COTTAGE;
      b.since = s.tick;
      changed = true;
      continue;
    }
    const lack = missing(b);
    if (!lack || lack.since > s.tick || s.tick - lack.since < DECLINE_AFTER) continue;
    b.level--;
    b.since = s.tick;
    changed = true;
    const extra = b.people - capacity(b);
    if (extra > 0) {
      b.people -= extra;
      s.left += extra;
      sendLeavers(s, map, extra, centreOf(b), around(map.size, b));
    }
  }
  if (changed) {
    recountPopulation(s);
    s.rev++;
  }
}

/** Rent: on the first day of each month every lived-in household pays by its level. */
export function stepRent(s: SimState): void {
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  let paid = 0;
  let homes = 0;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0 || b.people === 0) continue;
    paid += RENT[Math.min(b.level, RENT.length - 1)];
    homes++;
  }
  s.money += paid;
  s.rent = { paid, homes };
}
