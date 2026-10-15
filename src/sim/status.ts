/**
 * What a building or walker is doing, in a few plain words, for the hover
 * tips: who lives in a home, what reaches it, and if nothing does, why not.
 * Each status is a headline and a second line of detail ('' if none).
 */
import type { CoastMap } from '../map/bake';
import { plotNeighbours } from './build';
import { capacity, HOME_NAMES } from './buildings';
import { TICKS_PER_DAY } from './clock';
import { edgeRoads, nearestReached, roadSearch, type Search } from './roads';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { CARRIER_RANGE, CARRIER_WALK, HUT, HUT_DECLINE_AFTER, roadsBeside, stepsToFountain, waterReach } from './water';

export interface Status {
  title: string;
  detail: string;
}

const days = (ticks: number): string => {
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  return d === 1 ? '1 day' : `${d} days`;
};

const people = (n: number): string => (n === 1 ? '1 person' : `${n} people`);

/** What a home is waiting for, or who lives there, and what water reaches it. */
export function homeStatus(s: SimState, map: CoastMap, b: Building, reach?: Search): Status {
  if (b.kind === 'fountain') return fountainStatus(s, map, b);
  const size = map.size;
  const beside = plotNeighbours(size, b.x, b.z).filter((t) => s.tiles[t] === TILE_ROAD);
  let road = '';
  if (beside.length === 0) road = 'Needs a road beside it';
  else {
    const search = roadSearch(s, size, edgeRoads(s, size));
    if (nearestReached(search, beside) < 0) road = 'Needs its road joined to the edge of the map, where settlers come in';
  }
  if (b.level === 0) {
    if (b.incoming > 0) return { title: 'A housing plot', detail: 'Settlers are on their way' };
    return { title: 'A housing plot', detail: road || 'Waiting for settlers' };
  }
  const full = b.people >= capacity(b);
  const more = b.incoming > 0 ? ' · more on the way' : full ? ' · full' : road ? '' : ' · room for more';
  const title = `${HOME_NAMES[Math.min(b.level, HOME_NAMES.length - 1)]} · ${people(b.people)}${more}`;
  return { title, detail: road && !full ? `${road} · ${waterLine(s, map, b, reach)}` : waterLine(s, map, b, reach) };
}

/** What water reaches a lived-in home, and if none, why not. */
export function waterLine(s: SimState, map: CoastMap, b: Building, reach?: Search): string {
  const left = b.waterUntil - s.tick;
  if (left > 0) {
    if (b.level < HUT) return `Has water (${days(left)} left) · becoming a hut`;
    return `Has water · lasts ${days(left)} more unless the water carrier comes by again`;
  }
  if (b.level === HUT) {
    const goes = HUT_DECLINE_AFTER - (s.tick - b.waterUntil);
    return `No water for ${days(s.tick - b.waterUntil)} · goes back to a tent in ${days(goes)} unless the water carrier comes`;
  }
  return `No water · ${whyDry(s, map, b, reach)}`;
}

/** Why no water reaches a home. */
function whyDry(s: SimState, map: CoastMap, b: Building, reach?: Search): string {
  const size = map.size;
  if (!s.buildings.some((o) => o.kind === 'fountain')) return 'build a fountain beside a road nearby';
  if (roadsBeside(s, size, b).length === 0) return 'a water carrier only waters homes beside the road she walks';
  const r = reach ?? waterReach(s, size);
  const d = stepsToFountain(r, s, size, b);
  if (d < 0) return 'no road joins it to a fountain';
  if (d > CARRIER_RANGE) return `the nearest fountain is ${d} steps away by road; its water carrier goes ${CARRIER_RANGE} at most`;
  if (b.waterUntil > 0) return 'within reach of a fountain, but the water carrier has taken other turns lately';
  return 'within reach of a fountain; the water carrier hasn’t come this way yet';
}

export function fountainStatus(s: SimState, map: CoastMap, f: Building): Status {
  const title = 'A fountain';
  if (roadsBeside(s, map.size, f).length === 0) return { title, detail: 'Needs a road beside it, for the water carrier to walk' };
  const w = s.walkers.find((o) => o.id === f.walker);
  if (w) return { title, detail: carrierLine(w) };
  return { title, detail: 'The water carrier is resting · she sets off again soon' };
}

function carrierLine(w: Walker): string {
  if (w.back) return 'The water carrier is heading home';
  return `The water carrier is out, ${w.steps} of ${CARRIER_WALK} steps into her round`;
}

export function carrierStatus(w: Walker): Status {
  if (w.back) return { title: 'Water carrier', detail: 'Heading home to her fountain, watering homes on the way' };
  return { title: 'Water carrier', detail: `Out on her round, ${w.steps} of ${CARRIER_WALK} steps · she heads for the homes whose water is running lowest` };
}
