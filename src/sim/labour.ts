/**
 * Workers. Half of each household's people (rounded down) are of working
 * age. Once a day the city's workers are shared out among the buildings that
 * need them, nearest first: every pair of lived-in home and workplace joined
 * by road is taken in order of road distance, and each pair fills what it
 * can. A building works at the share of its jobs that are filled (half
 * that while its wages are unpaid: see treasury.ts).
 *
 * Slice 48: a workplace can be paused, and takes nobody (its workers go to
 * the next nearest jobs, so it works at nothing), or given its workers first:
 * the places with workers first are filled, nearest homes first, before the
 * rest are filled as always.
 */
import type { CoastMap } from '../map/bake';
import { jobsAt, livedIn } from './buildings';
import { TICKS_PER_DAY } from './clock';
import { distFrom, roadsBeside } from './rounds';
import type { Building, SimState } from './state';

/** The share of a household that can work. */
export const WORK_SHARE = 0.5;

// (Slice 36: an estate's noble house and its servants keep to the estate: none of them takes work in the city.)
/** How many of a home's people can work (`away`: men of it serving in the army, who have left their jobs). */
export const canWork = (b: Building, away = 0): number => (livedIn(b) && !b.estate ? Math.max(0, Math.floor(b.people * WORK_SHARE) - away) : 0);

/** How many of a home's people can work, its man serving in the army (if any) left out. */
export const canWorkIn = (s: SimState, b: Building): number => canWork(b, (b.kind === 'home' && (s.army.soldiers.some((x) => x.home === b.id && x.state !== 'leaving') || s.fleet.triremes.some((t) => t.crew.some((r) => r.home === b.id))) ? 1 : 0) + awayAt(s, b));

// Slice 45: those of a household at court, in prison or at hard labour can't work at home's jobs; convicts at hard labour fill a quarry's or mine's jobs first, unpaid (treasury.ts leaves them out of the wages).
/** How many of a household are away at court, in prison or at hard labour (justice.ts). */
export function awayAt(s: SimState, b: Building): number {
  const c = s.crime;
  if (!c.cases.length && !c.held.length) return 0;
  let n = 0;
  for (const x of c.cases) if (x.home === b.id) n++;
  for (const x of c.held) if (x.home === b.id) n++;
  return n;
}
/** The convicts at hard labour filling a quarry's or mine's jobs. */
export function convictsAt(s: SimState, b: Building): number {
  if (!s.crime.held.length || (b.kind !== 'quarry' && b.kind !== 'mine')) return 0;
  let n = 0;
  for (const x of s.crime.held) if (x.as === 'labour' && x.at === b.id) n++;
  return Math.min(n, jobsAt(b));
}

export { jobsAt };

/** How hard a workplace works while its wages are unpaid this month. */
export const UNPAID_RATE = 0.5;

/** How hard a building works: the share of its jobs filled (1 for buildings that need nobody), halved while its wages are unpaid. */
export function rateOf(b: Building): number {
  const jobs = jobsAt(b);
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
  // (The homes with a man in the army: he has left his job.)
  const away = new Set<number>();
  for (const x of s.army.soldiers) if (x.home > 0 && x.state !== 'leaving') away.add(x.home);
  for (const b of s.buildings) {
    b.workers = 0;
    b.unpaid = 0;
    const free = canWork(b, (away.has(b.id) ? 1 : 0) + awayAt(s, b));
    // (Slice 48: a paused workplace takes nobody.)
    if (jobsAt(b) > 0) {
      if (!b.paused) places.push(b);
    } else if (free > 0) homes.push({ b, roads: roadsBeside(s, size, b), free });
  }
  // (Slice 45: convicts at hard labour first.)
  if (s.crime.held.length) for (const p of places) p.workers = convictsAt(s, p);
  if (places.length > 0 && homes.length > 0) fill(s, size, places, homes);
  // A workplace that works at a new rate may look different (the farm's field).
  if (s.buildings.some((b, i) => b.workers !== before[i])) s.looks++;
}

function fill(s: SimState, size: number, places: Building[], homes: Array<{ b: Building; roads: number[]; free: number }>): void {
  // Every (distance, workplace, home) pair joined by road, packed into one number
  // (distance, then workplace, then home) so that a plain numeric sort puts them in order.
  const H = homes.length;
  const span = places.length * H;
  const pairs: number[] = [];
  places.forEach((p, pi) => {
    const dist = distFrom(s, size, p);
    homes.forEach((h, hi) => {
      let d = -1;
      for (const t of h.roads) if (dist[t] >= 0 && (d < 0 || dist[t] < d)) d = dist[t];
      if (d >= 0) pairs.push(d * span + pi * H + hi);
    });
  });
  const order = Float64Array.from(pairs).sort();
  // (Slice 48: the places given their workers first are filled before the rest, in the same order.)
  const firsts = places.some((p) => p.first);
  for (let pass = firsts ? 0 : 1; pass < 2; pass++) {
    for (const key of order) {
      const rest = key % span;
      const p = places[Math.floor(rest / H)];
      if (pass === 0 && !p.first) continue;
      const h = homes[rest % H];
      const want = jobsAt(p) - p.workers;
      if (want <= 0 || h.free <= 0) continue;
      const take = Math.min(want, h.free);
      p.workers += take;
      h.free -= take;
      h.b.workers += take;
      // Working where the wages went unpaid this month.
      if (p.owed > 0) h.b.unpaid += take;
    }
  }
}

/** The city's jobs and workers, for the top bar: jobs, filled, people who can work, and the places short of hands. */
export function workforce(s: SimState): { jobs: number; filled: number; able: number; short: Building[] } {
  let jobs = 0;
  let filled = 0;
  let able = 0;
  const short: Building[] = [];
  for (const b of s.buildings) {
    // (Slice 48: a paused workplace's jobs aren't counted, nor short.)
    const j = b.paused ? 0 : jobsAt(b);
    if (j > 0) {
      jobs += j;
      filled += b.workers;
      if (b.workers < j) short.push(b);
    } else able += canWorkIn(s, b);
  }
  return { jobs, filled, able, short };
}
