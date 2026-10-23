/**
 * Homes change with what reaches them, each looked at once a day (staggered
 * by id): a tent with people and water becomes a hut; a hut with water and a
 * month's bread in hand becomes a cottage; a cottage settled a month, with a
 * month in hand of water, bread and the priestess's blessing, becomes a
 * townhouse; a townhouse that also has plays, a fine house (see readyToRise).
 * When what a home's level needs runs out (a hut its water; a cottage its
 * water or bread; a townhouse those or its blessings; a fine house any of
 * those or its plays) it warns, and if
 * the need is still missing two months later (counted from when it ran out,
 * or from the home's last change of level, whichever is later) it drops one
 * level, and the people it can no longer hold walk out. The household's
 * story notes each of these. (Taxes are the tax collector's: src/sim/taxes.ts.)
 */
import type { CoastMap } from '../map/bake';
import { around, capacity, centreOf, COTTAGE, recountPopulation } from './buildings';
import { TICKS_PER_DAY } from './clock';
import { COTTAGE_FOOD_MIN, DECLINE_AFTER, missingNeed, moveOut, readyToRise, tell, warningsOf } from './folk';
import { sendLeavers } from './settlers';
import type { Building, Need, SimState } from './state';
import { estateDay } from './estates';

export { COTTAGE_FOOD_MIN, DECLINE_AFTER };

/** The need a home's level is missing longest and since when, or null if it has all it needs. */
export const missing = missingNeed;

/** A home goes up a level. */
function rise(s: SimState, b: Building, level: number): void {
  b.level = level;
  b.since = s.tick;
  if (b.family) {
    b.family.warned = [];
    tell(s, b.family, 'up', level);
  }
}

export function stepHouses(s: SimState, map: CoastMap): void {
  let changed = false;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0 || (s.tick + b.id) % TICKS_PER_DAY !== 0) continue;
    // Slice 36: an estate keeps its own ways (estates.ts).
    if (b.estate) {
      if (estateDay(s, map, b, (e) => rise(s, e, e.level + 1))) changed = true;
      continue;
    }
    if (readyToRise(s, b)) {
      rise(s, b, b.level + 1);
      changed = true;
      continue;
    }
    const f = b.family;
    if (f) {
      // The story notes each warning when it starts, and the relief if what was missing comes back in time.
      const now: Need[] = warningsOf(s, b).map((w) => w.need);
      for (const need of now) if (!f.warned.includes(need)) tell(s, f, 'warn', b.level, [], need);
      for (const need of f.warned) if (!now.includes(need)) tell(s, f, 'relief', b.level, [], need);
      f.warned = now;
    }
    const lack = missingNeed(b);
    if (!lack || lack.since > s.tick || s.tick - lack.since < DECLINE_AFTER) continue;
    b.level--;
    b.since = s.tick;
    changed = true;
    if (f) {
      f.warned = [];
      tell(s, f, 'down', b.level, [], lack.need);
    }
    // The people the lower level can't hold walk out: whole families together, so now and then a few more.
    const extra = b.people - capacity(b);
    if (extra > 0) {
      const going = f ? moveOut(s, b, extra).length : extra;
      b.people -= going;
      s.left += going;
      sendLeavers(s, map, going, centreOf(b), around(map.size, b));
    }
  }
  if (changed) {
    recountPopulation(s);
    s.rev++;
  }
}

export { COTTAGE };
