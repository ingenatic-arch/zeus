/** Looking up buildings: their footprints, how many people a home holds, how many a workplace needs. */
import type { Building, BuildingKind, SimState } from './state';

/** People a home holds, by level: 0 an empty plot (the first family turns it into a tent), 1 a tent, 2 a hut, 3 a cottage, 4 a townhouse, 5 a fine house, 6 a villa. */
export const HOME_CAPACITY = [5, 5, 9, 13, 17, 21, 27];

/** House levels by name, for the hover tips. */
export const HOME_NAMES = ['A housing plot', 'A tent', 'A hut', 'A cottage', 'A townhouse', 'A fine house', 'A villa'];

export const TENT = 1;
export const HUT = 2;
export const COTTAGE = 3;
export const TOWNHOUSE = 4;
export const FINE = 5;
export const VILLA = 6;
/** The highest level a home can reach. */
export const TOP_LEVEL = VILLA;

/** A level's name in a sentence: "a cottage", "the fine house" with `the`. */
export const levelName = (level: number, article: 'a' | 'the' | '' = 'a'): string => {
  const n = HOME_NAMES[Math.max(0, Math.min(level, HOME_NAMES.length - 1))].replace(/^An? /, '').toLowerCase();
  return article ? `${article} ${n}` : n;
};

/** Names of the other buildings, for the hover tips. */
export const BUILDING_NAMES: Record<Exclude<BuildingKind, 'home'>, string> = {
  fountain: 'A fountain',
  farm: 'A wheat farm',
  granary: 'A granary',
  agora: 'The agora',
  shrine: 'A shrine',
  theatre: 'A theatre',
  taxoffice: 'A tax office',
  lodge: 'A hunting lodge',
  dairy: 'A dairy',
  grove: 'An olive grove',
  press: 'An olive press',
  storehouse: 'A storehouse',
  pasture: 'A sheep pasture',
  vineyard: 'A vineyard',
  winery: 'A winery',
  watchpost: 'A watch post',
  architect: 'An architect’s office',
  rubble: 'Rubble',
  trading: 'The trading post',
  yard: 'The caravan yard',
  mine: 'A copper mine',
  armoury: 'An armoury',
  barracks: 'A barracks',
  tower: 'A tower',
  shipyard: 'A shipyard',
};

/** Workers each kind of building needs (homes need none). */
export const JOBS: Record<BuildingKind, number> = { home: 0, fountain: 2, farm: 10, granary: 6, agora: 6, shrine: 2, theatre: 5, taxoffice: 3, lodge: 6, dairy: 8, grove: 4, press: 4, storehouse: 3, pasture: 4, vineyard: 4, winery: 4, watchpost: 3, architect: 3, rubble: 0, trading: 6, yard: 4, mine: 6, armoury: 6, barracks: 4, tower: 4, shipyard: 8 };

/** More workers an agora needs for each stall it has for goods (the stall keeper and its vendor). */
export const STALL_JOBS = 1;

/** How many stalls for goods an agora has. */
export const stallCount = (b: Building): number => {
  let n = 0;
  for (let m = b.stalls; m; m &= m - 1) n++;
  return n;
};

/** Jobs a building offers: its kind's, and an agora's stalls'. */
export const jobsAt = (b: Building): number => JOBS[b.kind] + (b.stalls ? stallCount(b) * STALL_JOBS : 0);

/** Buildings drawn on a two-by-two footprint (the rest take three by three, the barracks four by four; rubble takes what stood there). */
export const isSmall = (kind: BuildingKind): boolean =>
  kind === 'home' || kind === 'fountain' || kind === 'shrine' || kind === 'taxoffice' || kind === 'watchpost' || kind === 'architect' || kind === 'mine' || kind === 'tower';

/** Buildings drawn on a four-by-four footprint: the barracks. */
export const isLarge = (kind: BuildingKind): boolean => kind === 'barracks';

/** The side of a kind of building's square footprint, in tiles (for rubble, see footSide). */
export function sideOf(kind: BuildingKind): number {
  return isSmall(kind) ? 2 : isLarge(kind) ? 4 : 3;
}

/** The side of this building's footprint: its kind's, or for rubble, that of what stood there. */
export const footSide = (b: Building): number => (b.kind === 'rubble' ? sideOf(b.was || 'home') : sideOf(b.kind));

export function capacity(b: Building): number {
  if (b.kind !== 'home') return 0;
  return HOME_CAPACITY[Math.min(b.level, HOME_CAPACITY.length - 1)];
}

/** The tiles a footprint of this side covers, top-left at (x, z), in tile order. */
export function footprint(size: number, x: number, z: number, side: number): number[] {
  const out: number[] = [];
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) out.push((z + dz) * size + x + dx);
  return out;
}

/** The tiles orthogonally beside a footprint (on the map), in tile order. */
export function beside(size: number, x: number, z: number, side: number): number[] {
  const out: number[] = [];
  const add = (tx: number, tz: number): void => {
    if (tx >= 0 && tz >= 0 && tx < size && tz < size) out.push(tz * size + tx);
  };
  for (let d = 0; d < side; d++) add(x + d, z - 1);
  for (let d = 0; d < side; d++) add(x - 1, z + d);
  for (let d = 0; d < side; d++) add(x + side, z + d);
  for (let d = 0; d < side; d++) add(x + d, z + side);
  return out.sort((a, b) => a - b);
}

/** The tiles beside a building. */
export const around = (size: number, b: Building): number[] => beside(size, b.x, b.z, footSide(b));

/** The middle of a building's footprint, world units. */
export const centreOf = (b: Building): [number, number] => {
  const h = footSide(b) / 2;
  return [b.x + h, b.z + h];
};

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

/** Is it a lived-in home? */
export const livedIn = (b: Building): boolean => b.kind === 'home' && b.level > 0 && b.people > 0;
