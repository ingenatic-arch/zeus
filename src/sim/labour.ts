/**
 * Workers. Half of each household's people (rounded down) are of working
 * age. Once a day the city's workers are shared out among the buildings that
 * need them, nearest first: every pair of lived-in home and workplace joined
 * by road is taken in order of road distance, and each pair fills what it
 * can. A building works at the share of its jobs that are filled (half
 * that while its wages are unpaid: see treasury.ts).
 */
import type { CoastMap } from '../map/bake';
import { JOBS, livedIn } from './buildings';
import { TICKS_PER_DAY } from './clock';
import { distFrom, roadsBeside } from './rounds';
import type { Building, SimState } from './state';

/** The share of a household that can work. */
export const WORK_SHARE = 0.5;

/** How many of a home's people can work. */
export const canWork = (b: Building): number => (livedIn(b) ? Math.floor(b.people * WORK_SHARE) : 0);

/** Jobs a building offers. */
export const jobsAt = (b: Building): number => JOBS[b.kind];

/** How hard a workplace works while its wages are unpaid this month. */
export const UNPAID_RATE = 0.5;

/** How hard a building works: the share of its jobs filled (1 for buildings that need nobody), halved while its wages are unpaid. */
export function rateOf(b: Building): number {
  const jobs = JOBS[b.kind];
  if (jobs === 0) return 1;
  const r = Math.min(1, b.workers / jobs);
  return b.owed > 0 ? r * UNPAID_RATE : r;
}

/** Share the workers out, once a day. */
export function stepLabour(s: SimState, map: CoastMap): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  shareWork(s, map);
}

/** Share the city's workers among its workplaces, nearest first (see the module note). */
export function shareWork(s: SimState, map: CoastMap): void {
  const size = map.size;
  const places: Building[] = [];
  const homes: Array<{ b: Building; roads: number[]; free: number }> = [];
  const before = s.buildings.map((b) => b.workers);
  for (const b of s.buildings) {
    b.workers = 0;
    b.unpaid = 0;
    if (JOBS[b.kind] > 0) places.push(b);
    else if (canWork(b) > 0) homes.push({ b, roads: roadsBeside(s, size, b), free: canWork(b) });
  }
  if (places.length > 0 && homes.length > 0) fill(s, size, places, homes);
  // A workplace that works at a new rate may look different (the farm's field).
  if (s.buildings.some((b, i) => b.workers !== before[i])) s.looks++;
}

function fill(s: SimState, size: number, places: Building[], homes: Array<{ b: Building; roads: number[]; free: number }>): void {
  // Every (distance, workplace, home) pair joined by road.
  const pairs: number[][] = [];
  places.forEach((p, pi) => {
    const dist = distFrom(s, size, p);
    homes.forEach((h, hi) => {
      let d = -1;
      for (const t of h.roads) if (dist[t] >= 0 && (d < 0 || dist[t] < d)) d = dist[t];
      if (d >= 0) pairs.push([d, pi, hi]);
    });
  });
  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  for (const [, pi, hi] of pairs) {
    const p = places[pi];
    const h = homes[hi];
    const want = JOBS[p.kind] - p.workers;
    if (want <= 0 || h.free <= 0) continue;
    const take = Math.min(want, h.free);
    p.workers += take;
    h.free -= take;
    h.b.workers += take;
    // Working where the wages went unpaid this month.
    if (p.owed > 0) h.b.unpaid += take;
  }
}

/** The city's jobs and workers, for the top bar: jobs, filled, people who can work, and the places short of hands. */
export function workforce(s: SimState): { jobs: number; filled: number; able: number; short: Building[] } {
  let jobs = 0;
  let filled = 0;
  let able = 0;
  const short: Building[] = [];
  for (const b of s.buildings) {
    const j = JOBS[b.kind];
    if (j > 0) {
      jobs += j;
      filled += b.workers;
      if (b.workers < j) short.push(b);
    } else able += canWork(b);
  }
  return { jobs, filled, able, short };
}
