/**
 * What a building or walker is doing, in a few plain words, for the hover
 * tips: who lives in a home, what reaches it, and if nothing does, why not;
 * how a workplace is staffed and what it is doing. Each status is a headline
 * and further lines of detail ('' if none).
 */
import type { CoastMap } from '../map/bake';
import { fertilityOf } from './build';
import { BUILDING_NAMES, capacity, COTTAGE, findBuilding, HOME_NAMES, HUT, JOBS, TENT } from './buildings';
import { TICKS_PER_DAY } from './clock';
import { BARN, eatsBread, errandsOut, GRANARY_CAP, GROW, harvestOf, roomIn, STALL_CAP, VENDOR_RANGE, VENDOR_WALK } from './food';
import { DECLINE_AFTER, missing } from './houses';
import { canWork, rateOf } from './labour';
import { edgeRoads, nearestReached, roadSearch, type Search } from './roads';
import { roadsBeside } from './rounds';
import type { Building, SimState, Walker } from './state';
import { CARRIER_RANGE, CARRIER_WALK, stepsToFountain, waterReach } from './water';

export interface Status {
  title: string;
  detail: string;
}

const days = (ticks: number): string => {
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  return d === 1 ? '1 day' : `${d} days`;
};

const people = (n: number): string => (n === 1 ? '1 person' : `${n} people`);
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');

/** What a building is waiting for, or who lives there, and what reaches it. */
export function homeStatus(s: SimState, map: CoastMap, b: Building, reach?: Search): Status {
  if (b.kind === 'fountain') return fountainStatus(s, map, b);
  if (b.kind === 'farm') return farmStatus(s, map, b);
  if (b.kind === 'granary') return granaryStatus(s, map, b);
  if (b.kind === 'agora') return agoraStatus(s, map, b);
  const size = map.size;
  const beside = roadsBeside(s, size, b);
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
  const water = waterLine(s, map, b, reach);
  return { title, detail: lines(road && !full ? road : '', water, foodLine(s, map, b), workLine(s, b)) };
}

/** What water reaches a lived-in home, and if none, why not. */
export function waterLine(s: SimState, map: CoastMap, b: Building, reach?: Search): string {
  const left = b.waterUntil - s.tick;
  if (left > 0) {
    if (b.level < HUT) return `Has water (${days(left)} left) · becoming a hut`;
    return `Has water · lasts ${days(left)} more unless the water carrier comes by again`;
  }
  const lack = missing(b);
  if (b.level >= HUT && lack?.need === 'water') {
    const goes = DECLINE_AFTER - (s.tick - lack.since);
    const to = b.level === HUT ? 'a tent' : 'a hut';
    return `No water for ${days(s.tick - b.waterUntil)} · goes back to ${to} in ${days(goes)} unless the water carrier comes`;
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

/** What food reaches a home ('' for a tent when there is no agora yet). */
export function foodLine(s: SimState, map: CoastMap, b: Building): string {
  if (b.kind !== 'home' || b.level === 0) return '';
  const agoras = s.buildings.filter((o) => o.kind === 'agora');
  if (b.level === TENT) return agoras.length ? 'Lives off the land for now: the food vendor sells to huts and better' : '';
  const left = b.foodUntil - s.tick;
  if (left > 0) {
    const grow = b.level === HUT && b.waterUntil > s.tick ? ' · becoming a cottage' : '';
    return `Has food · lasts ${days(left)} more${grow}`;
  }
  const lack = missing(b);
  if (b.level === COTTAGE && lack?.need === 'food') {
    const goes = DECLINE_AFTER - (s.tick - lack.since);
    return `No food for ${days(s.tick - b.foodUntil)} · goes back to a hut in ${days(goes)} unless the food vendor comes`;
  }
  return `No food · ${whyHungry(s, map, b, agoras)}`;
}

/** Why no food reaches a hut or better. */
function whyHungry(s: SimState, map: CoastMap, b: Building, agoras: Building[]): string {
  const size = map.size;
  if (agoras.length === 0) return 'build an agora, with a granary and a farm to fill it, so a food vendor walks the streets';
  if (roadsBeside(s, size, b).length === 0) return 'the food vendor only sells to homes beside the road she walks';
  const sources: number[] = [];
  for (const a of agoras) sources.push(...roadsBeside(s, size, a));
  const d = stepsToFountain(roadSearch(s, size, sources), s, size, b);
  if (d < 0) return 'no road joins it to the agora';
  if (d > VENDOR_RANGE) return `the agora is ${d} steps away by road; its food vendor goes ${VENDOR_RANGE} at most`;
  if (agoras.every((a) => a.stock <= 0)) return 'the agora’s food stall is empty';
  if (b.foodUntil > 0) return 'within reach of the agora, but the food vendor has taken other turns lately';
  return 'within reach of the agora; the food vendor hasn’t come this way yet';
}

/** How many of a home's people work. */
function workLine(s: SimState, b: Building): string {
  const able = canWork(b);
  if (able === 0) return '';
  const can = `${able} can work`;
  if (!s.buildings.some((o) => JOBS[o.kind] > 0)) return `${can} · nothing needs workers yet`;
  if (b.workers >= able) return `${can} · ${able === 1 ? 'has' : 'all have'} work`;
  if (b.workers === 0) return `${can} · none has work: every job they can reach is taken`;
  return `${can} · ${b.workers} have work; every other job they can reach is taken`;
}

/** How a workplace is staffed ('' if it needs nobody). */
export function workersLine(s: SimState, map: CoastMap, b: Building): string {
  const jobs = JOBS[b.kind];
  if (jobs === 0) return '';
  if (b.workers >= jobs) return `Workers: ${jobs} of ${jobs}`;
  if (b.workers === 0) {
    if (roadsBeside(s, map.size, b).length === 0) return `No workers · it needs ${jobs}, and a road beside it`;
    return `No workers · it needs ${jobs} from homes joined to it by road`;
  }
  return `Short of workers: ${b.workers} of ${jobs} · working at ${Math.round(rateOf(b) * 100)}% · more homes nearby would help`;
}

export function fountainStatus(s: SimState, map: CoastMap, f: Building): Status {
  const title = BUILDING_NAMES.fountain;
  if (roadsBeside(s, map.size, f).length === 0) return { title, detail: 'Needs a road beside it, for the water carrier to walk' };
  const w = s.walkers.find((o) => o.id === f.walker);
  let line: string;
  if (w) line = carrierLine(w);
  else if (f.workers === 0) line = 'The water carrier can’t go out with nobody working the fountain';
  else line = 'The water carrier is resting · she sets off again soon';
  return { title, detail: lines(workersLine(s, map, f), line) };
}

function carrierLine(w: Walker): string {
  if (w.back) return 'The water carrier is heading home';
  return `The water carrier is out, ${w.steps} of ${CARRIER_WALK} new road tiles into her round`;
}

export function carrierStatus(w: Walker): Status {
  if (w.back) return { title: 'Water carrier', detail: 'Heading home to her fountain, watering homes on the way' };
  return { title: 'Water carrier', detail: `Out on her round, ${w.steps} of ${CARRIER_WALK} new road tiles walked · she heads for the homes whose water is running lowest` };
}

export function farmStatus(s: SimState, map: CoastMap, f: Building): Status {
  const title = `${BUILDING_NAMES.farm} · fertile ground ${Math.round(fertilityOf(map, f.x, f.z, 3) * 100)}%`;
  if (roadsBeside(s, map.size, f).length === 0) return { title, detail: 'Needs a road beside it, for its workers and its carts' };
  const rate = rateOf(f);
  let crop: string;
  if (f.stock >= BARN) crop = 'The barn is full: nothing more grows until carts take the grain away';
  else if (rate === 0) crop = 'Nothing grows with nobody to work the fields';
  else {
    const left = (GROW - f.growth) / rate;
    crop = `The wheat is ${Math.round((f.growth / GROW) * 100)}% grown · harvest in about ${days(left)}, about ${fmt(harvestOf(map, f))} measures`;
  }
  const carts = errandsOut(s, f);
  let barn = `Barn: ${fmt(f.stock)} measures`;
  if (carts) barn += ` · ${carts === 1 ? 'a cart' : `${carts} carts`} on the road`;
  else if (f.stock > 0 && !s.buildings.some((g) => g.kind === 'granary')) barn += ' · build a granary for the carts to take it to';
  else if (f.stock > 0 && !s.buildings.some((g) => g.kind === 'granary' && roomIn(g) > 0)) barn += ' · every granary is full';
  return { title, detail: lines(workersLine(s, map, f), crop, barn) };
}

export function granaryStatus(s: SimState, map: CoastMap, g: Building): Status {
  const title = `${BUILDING_NAMES.granary} · ${fmt(g.stock)} of ${fmt(GRANARY_CAP)} measures of wheat`;
  if (roadsBeside(s, map.size, g).length === 0) return { title, detail: 'Needs a road beside it, for carts and porters to reach it' };
  const coming = g.incoming > 0 ? `Carts are bringing ${fmt(g.incoming)} more` : !s.buildings.some((f) => f.kind === 'farm') ? 'Build a wheat farm on the green land by the river to fill it' : '';
  const waiting = s.walkers.filter((w) => (w.kind === 'cart' || w.kind === 'porter') && w.target === g.id && w.wait > 0).length;
  const gate = waiting && g.workers === 0 ? `${waiting === 1 ? 'A cart is' : `${waiting} are`} waiting at the gate: nobody works here to take it in` : '';
  return { title, detail: lines(workersLine(s, map, g), coming, gate) };
}

export function agoraStatus(s: SimState, map: CoastMap, a: Building): Status {
  const title = `${BUILDING_NAMES.agora} · the food stall has ${fmt(a.stock)} of ${fmt(STALL_CAP)} measures`;
  if (roadsBeside(s, map.size, a).length === 0) return { title, detail: 'Needs a road beside it, for the food vendor to walk' };
  const w = s.walkers.find((o) => o.id === a.walker);
  let vendor: string;
  if (w) vendor = w.back ? 'The food vendor is heading back' : `The food vendor is out, ${w.steps} of ${VENDOR_WALK} new road tiles into her round`;
  else if (a.workers === 0) vendor = 'Nobody works the stall, so the food vendor can’t go out';
  else if (a.stock <= 0) vendor = 'The food vendor waits for the stall to have food';
  else vendor = 'The food vendor is resting · she sets off again soon';
  const p = s.walkers.find((o) => o.kind === 'porter' && o.origin === a.id);
  let porter = '';
  if (p) porter = p.back ? `The porter is bringing ${fmt(p.load)} measures from the granary` : 'The porter is on his way to the granary for grain';
  else if (!s.buildings.some((g) => g.kind === 'granary')) porter = 'Build a granary: the porter fetches the stall’s grain from it';
  else if (!s.buildings.some((g) => g.kind === 'granary' && g.stock > 0) && a.stock < STALL_CAP / 2) porter = 'The porter waits: no granary has any grain';
  return { title, detail: lines(workersLine(s, map, a), vendor, porter) };
}

/** What any walker other than settlers is doing. */
export function walkerStatus(s: SimState, w: Walker): Status | null {
  if (w.kind === 'water') return carrierStatus(w);
  if (w.kind === 'food') {
    const a = findBuilding(s, w.origin);
    const stall = a ? ` · the stall has ${fmt(a.stock)} measures` : '';
    if (w.back) return { title: 'Food vendor', detail: `Heading back to the agora, selling on the way${stall}` };
    return { title: 'Food vendor', detail: `Out on her round, ${w.steps} of ${VENDOR_WALK} new road tiles walked · she heads for the homes whose food is running lowest${stall}` };
  }
  if (w.kind === 'cart') {
    const g = findBuilding(s, w.target);
    if (w.back) return { title: 'Ox cart', detail: 'Heading back to its farm' };
    if (w.wait > 0) return { title: 'Ox cart', detail: g && g.workers === 0 ? 'Waiting at the granary’s gate: nobody works there to take the grain in' : `Unloading ${fmt(w.load)} measures of wheat at the granary` };
    return { title: 'Ox cart', detail: `Taking ${fmt(w.load)} measures of wheat to the granary` };
  }
  if (w.kind === 'porter') {
    if (w.back) return { title: 'Porter', detail: w.load > 0 ? `Bringing ${fmt(w.load)} measures of grain to the agora’s food stall` : 'Heading back to the agora empty-handed' };
    if (w.wait > 0) return { title: 'Porter', detail: 'Loading grain at the granary' };
    return { title: 'Porter', detail: 'On his way to the granary for grain for the food stall' };
  }
  return null;
}

export { eatsBread };
