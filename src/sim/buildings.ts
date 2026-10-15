/** Looking up buildings, and how many people a home holds. */
import type { Building, SimState } from './state';

/** People a home holds, by level: 0 an empty plot (the first family turns it into a tent), 1 a tent, 2 a hut. */
export const HOME_CAPACITY = [5, 5, 9];

/** House levels by name, for the hover tips. */
export const HOME_NAMES = ['A housing plot', 'A tent', 'A hut'];

export function capacity(b: Building): number {
  if (b.kind !== 'home') return 0;
  return HOME_CAPACITY[Math.min(b.level, HOME_CAPACITY.length - 1)];
}

export function findBuilding(s: SimState, id: number): Building | undefined {
  // Buildings are kept in id order.
  let lo = 0;
  let hi = s.buildings.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = s.buildings[mid];
    if (b.id === id) return b;
    if (b.id < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

export function recountPopulation(s: SimState): void {
  let p = 0;
  for (const b of s.buildings) p += b.people;
  s.population = p;
}
