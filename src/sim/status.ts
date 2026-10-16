/**
 * What a building or walker is doing, in a few plain words, for the hover
 * tips: who lives in a home, what reaches it, and if nothing does, why not;
 * how a workplace is staffed and what it is doing. Each status is a headline
 * and further lines of detail ('' if none).
 */
import type { CoastMap } from '../map/bake';
import { fertilityOf, grassOf } from './build';
import { BUILDING_NAMES, capacity, COTTAGE, findBuilding, HOME_NAMES, HUT, JOBS, levelName, TENT, TOWNHOUSE } from './buildings';
import { ACTOR_RANGE, ACTOR_WALK, PRIESTESS_RANGE, PRIESTESS_WALK } from './culture';
import { DAYS_PER_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import {
  BARN,
  CHEESE_BATCH,
  CHEESE_EVERY,
  cheeseOf,
  DAIRY_STORE,
  eatsBread,
  errandsOut,
  foodsIn,
  GRANARY_CAP,
  GRANARY_ROOM,
  GROW,
  HARVEST,
  harvestOf,
  LODGE_STORE,
  roomFor,
  roomIn,
  STALL_CAP,
  STALL_LOW,
  STALL_LOW_AT,
  STALL_ROOM,
  VENDOR_RANGE,
  VENDOR_WALK,
} from './food';
import { CHEESE, coming, FOOD_NAMES, foodList, FOODS, foodUntil, held, kindsNeeded, MEAT, TABLE_NAMES, tableUntil, WHEAT, type Food } from './foods';
import { cityHas, foodsLacking, justOpened, missingSince, nextNeed, RISE_MIN, SETTLE, untilOf, wantsMoreFood, warningsOf } from './folk';
import { herdDistance, herdsInReach, huntersFor, huntersOut, HUNT_RANGE, LODGE_MONTH, meatLimits, meatPerMonth } from './hunt';
import { fleeing, herdName, MIN_HEAD, moving, regrowIn } from './wild';
import { COTTAGE_FOOD_MIN, DECLINE_AFTER } from './houses';
import { canWork, rateOf, workforce } from './labour';
import { edgeRoads, nearestReached, roadSearch, type Search } from './roads';
import { distFrom, roadsBeside } from './rounds';
import type { Building, BuildingKind, Herd, SimState, Walker } from './state';
import { CARRIER_RANGE, CARRIER_WALK, stepsToFountain, waterReach } from './water';
import { COLLECTOR_RANGE, COLLECTOR_WALK, purseTotal, TAX_RATES, taxedLately, taxOf } from './taxes';
import { hasTaxOffice, monthOf, owedWages, reserve, totals, WAGE, wageBill } from './treasury';

export interface Status {
  title: string;
  detail: string;
}

const days = (ticks: number): string => {
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  // Long waits read better in months.
  if (d > 60) return `${Math.round(d / DAYS_PER_MONTH)} months`;
  return d === 1 ? '1 day' : `${d} days`;
};

const people = (n: number): string => (n === 1 ? '1 person' : `${n} people`);
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');

/** What a building is waiting for, or who lives there, and what reaches it. */
export function homeStatus(s: SimState, map: CoastMap, b: Building, reach?: Search): Status {
  if (b.kind === 'fountain') return fountainStatus(s, map, b);
  if (b.kind === 'farm') return farmStatus(s, map, b);
  if (b.kind === 'lodge') return lodgeStatus(s, map, b);
  if (b.kind === 'dairy') return dairyStatus(s, map, b);
  if (b.kind === 'granary') return granaryStatus(s, map, b);
  if (b.kind === 'agora') return agoraStatus(s, map, b);
  if (b.kind === 'shrine' || b.kind === 'theatre') return cultureStatus(s, map, b);
  if (b.kind === 'taxoffice') return taxOfficeStatus(s, map, b);
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
  return { title, detail: lines(road && !full ? road : '', water, foodLine(s, map, b), blessingLine(s, map, b), playsLine(s, map, b), workLine(s, map.size, b), taxLine(s, map, b)) };
}

/** What a home pays the tax collector, or why he doesn't call. */
export function taxLine(s: SimState, map: CoastMap, b: Building): string {
  if (b.kind !== 'home' || b.level === 0 || b.people === 0) return '';
  const would = taxOf(s.taxRate, b.level);
  const rate = TAX_RATES[s.taxRate];
  if (taxedLately(s, b) && b.taxPaid > 0) return `Taxes: paid the tax collector ${b.taxPaid} dr ${days(s.tick - b.taxedAt)} ago (${rate})`;
  if (would === 0) return 'Taxes: none to pay, the rate is none';
  // Called on while the rate was none: he comes back for it now the rate is up.
  const why = taxedLately(s, b) ? 'the tax collector called while the rate was none, and comes back for it' : whyUntaxed(s, map, b);
  return `Taxes: ${would} dr a month at ${rate} · ${why}`;
}

/** Why the tax collector hasn't called on a home this month. */
export function whyUntaxed(s: SimState, map: CoastMap, b: Building): string {
  const size = map.size;
  const offices = s.buildings.filter((o) => o.kind === 'taxoffice');
  if (offices.length === 0) return 'no tax office, so it pays nothing';
  const beside = roadsBeside(s, size, b);
  if (beside.length === 0) return 'the tax collector only calls on homes beside the road he walks';
  const d = stepsToFountain(roadSearch(s, size, offices.flatMap((o) => roadsBeside(s, size, o))), s, size, b);
  if (d < 0) return 'no road joins it to a tax office, so it pays nothing';
  if (d > COLLECTOR_RANGE) return `the nearest tax office is ${d} steps away by road; its collector goes ${COLLECTOR_RANGE} at most, so it pays nothing`;
  const reaching = offices.filter((o) => beside.some((t) => distFrom(s, size, o)[t] >= 0 && distFrom(s, size, o)[t] <= COLLECTOR_RANGE));
  if (reaching.length && reaching.every((o) => o.workers === 0)) return 'nobody works at the tax office, so its collector can’t go out';
  return 'no tax collector has called this month';
}

/** A tax office: its collector, and what came in. */
export function taxOfficeStatus(s: SimState, map: CoastMap, o: Building): Status {
  const title = BUILDING_NAMES.taxoffice;
  if (roadsBeside(s, map.size, o).length === 0) return { title, detail: 'Needs a road beside it, for the tax collector to walk' };
  const w = s.walkers.find((x) => x.id === o.walker);
  let line: string;
  if (w) {
    const bag = purseTotal(w);
    line = w.back ? `The tax collector is heading back with ${bag} dr` : `The tax collector is out, ${w.steps} of ${COLLECTOR_WALK} new road tiles into his round · ${bag} dr in his satchel`;
  } else if (o.workers === 0) line = 'The tax collector can’t go out with nobody working the office';
  else line = 'The tax collector is resting · he sets off again soon';
  const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0);
  const paid = homes.filter((b) => taxedLately(s, b)).length;
  const reach = `In the last month the city’s collectors have called on ${fmt(paid)} of its ${fmt(homes.length)} homes · the rate is ${TAX_RATES[s.taxRate]}`;
  return { title, detail: lines(workersLine(s, map, o), line, reach) };
}

/** What each of the new services is called, and who brings it. */
const KINDS = {
  religion: { building: 'shrine' as BuildingKind, what: 'blessings', walker: 'priestess', range: PRIESTESS_RANGE, his: 'her' },
  culture: { building: 'theatre' as BuildingKind, what: 'plays', walker: 'actor', range: ACTOR_RANGE, his: 'his' },
};

/** Why the priestess (or the actor) doesn't reach a home. */
function whyNot(s: SimState, map: CoastMap, b: Building, service: 'religion' | 'culture'): string {
  const k = KINDS[service];
  const size = map.size;
  const places = s.buildings.filter((o) => o.kind === k.building);
  if (places.length === 0) return `build a ${k.building} beside a road nearby`;
  if (roadsBeside(s, size, b).length === 0) return `the ${k.walker} only visits homes beside the road ${k.his === 'her' ? 'she' : 'he'} walks`;
  const sources: number[] = [];
  for (const o of places) sources.push(...roadsBeside(s, size, o));
  const d = stepsToFountain(roadSearch(s, size, sources), s, size, b);
  if (d < 0) return `no road joins it to a ${k.building}`;
  if (d > k.range) return `the nearest ${k.building} is ${d} steps away by road; its ${k.walker} goes ${k.range} at most`;
  // Within reach of one: is anyone working there?
  const reaching = places.filter((o) => roadsBeside(s, size, b).some((t) => distFrom(s, size, o)[t] >= 0 && distFrom(s, size, o)[t] <= k.range));
  if (reaching.length && reaching.every((o) => o.workers === 0)) return `nobody works at the ${k.building}, so its ${k.walker} can’t go out`;
  const until = service === 'religion' ? b.religionUntil : b.cultureUntil;
  if (until > 0 && !justOpened(s, k.building as 'shrine' | 'theatre', until)) return `within reach of a ${k.building}, but the ${k.walker} has taken other turns lately`;
  return `within reach of a ${k.building}; the ${k.walker} hasn’t come this way yet`;
}

/** Why no blessings reach a home. */
export const whyUnblessed = (s: SimState, map: CoastMap, b: Building): string => whyNot(s, map, b, 'religion');
/** Why no plays reach a home. */
export const whyNoPlays = (s: SimState, map: CoastMap, b: Building): string => whyNot(s, map, b, 'culture');

/**
 * A line on blessings or plays, for the levels that need them or would like
 * them (a cottage once the city has a shrine; a townhouse once it has a
 * theatre), or ''.
 */
function cultureLine(s: SimState, map: CoastMap, b: Building, service: 'religion' | 'culture'): string {
  const k = KINDS[service];
  const wants = service === 'religion' ? COTTAGE : TOWNHOUSE;
  if (b.kind !== 'home' || b.level < wants) return '';
  const needs = b.level > wants;
  if (!needs && !s.buildings.some((o) => o.kind === k.building)) return '';
  const until = service === 'religion' ? b.religionUntil : b.cultureUntil;
  const What = k.what[0].toUpperCase() + k.what.slice(1);
  const left = until - s.tick;
  if (left > 0) {
    let grow = '';
    if (!needs) {
      const next = levelName(b.level + 1);
      grow = left < RISE_MIN ? ` · ${next} needs a month’s ${k.what} in hand` : s.tick - b.since < SETTLE ? ` · ${next} once they’ve settled in` : '';
    }
    return `${What} · last ${days(left)} more unless the ${k.walker} comes by again${grow}`;
  }
  if (needs) {
    const goes = DECLINE_AFTER - (s.tick - missingSince(b, service));
    return `No ${k.what} for ${days(s.tick - until)} · goes back to ${levelName(b.level - 1)} in ${days(goes)} unless the ${k.walker} comes`;
  }
  return `No ${k.what} · ${whyNot(s, map, b, service)}`;
}

export const blessingLine = (s: SimState, map: CoastMap, b: Building): string => cultureLine(s, map, b, 'religion');
export const playsLine = (s: SimState, map: CoastMap, b: Building): string => cultureLine(s, map, b, 'culture');

/** A shrine or theatre: how it is staffed and where its walker is. */
export function cultureStatus(s: SimState, map: CoastMap, b: Building): Status {
  const k = b.kind === 'shrine' ? KINDS.religion : KINDS.culture;
  const title = BUILDING_NAMES[b.kind as 'shrine' | 'theatre'];
  const The = `The ${k.walker}`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: `Needs a road beside it, for the ${k.walker} to walk` };
  const w = s.walkers.find((o) => o.id === b.walker);
  const walk = b.kind === 'shrine' ? PRIESTESS_WALK : ACTOR_WALK;
  let line: string;
  if (w) line = w.back ? `${The} is heading back` : `${The} is out, ${w.steps} of ${walk} new road tiles into ${k.his} round`;
  else if (b.workers === 0) line = `${The} can’t go out with nobody working the ${k.building}`;
  else line = `${The} is resting · ${k.his === 'her' ? 'she' : 'he'} sets off again soon`;
  const who = b.kind === 'shrine' ? 'Cottages and better want her blessing: a cottage needs it to become a townhouse' : 'Townhouses and better want plays: a townhouse needs them to become a fine house';
  return { title, detail: lines(workersLine(s, map, b), line, who) };
}

/** What water reaches a lived-in home, and if none, why not. */
export function waterLine(s: SimState, map: CoastMap, b: Building, reach?: Search): string {
  const left = b.waterUntil - s.tick;
  if (left > 0) {
    if (b.level < HUT) return `Has water (${days(left)} left) · becoming a hut`;
    return `Has water · lasts ${days(left)} more unless the water carrier comes by again`;
  }
  if (b.level >= HUT) {
    const goes = DECLINE_AFTER - (s.tick - missingSince(b, 'water'));
    const to = levelName(b.level - 1);
    return `No water for ${days(s.tick - b.waterUntil)} · goes back to ${to} in ${days(goes)} unless the water carrier comes`;
  }
  return `No water · ${whyDry(s, map, b, reach)}`;
}

/** Why no water reaches a home. */
export function whyDry(s: SimState, map: CoastMap, b: Building, reach?: Search): string {
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

/** "Bread", "Bread and cheese". */
const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** What food reaches a home ('' for a tent when there is no agora yet): what is on its table, what runs out first, and what its level lacks. */
export function foodLine(s: SimState, map: CoastMap, b: Building): string {
  if (b.kind !== 'home' || b.level === 0) return '';
  const agoras = s.buildings.filter((o) => o.kind === 'agora');
  if (b.level === TENT) return agoras.length ? 'Lives off the land for now: the food vendor sells to huts and better' : '';
  const table = FOODS.filter((f) => foodUntil(b, f) > s.tick);
  const k = Math.max(1, kindsNeeded(b.level));
  const until = tableUntil(b);
  const left = until - s.tick;
  if (left > 0) {
    // The food that runs out first, of the kinds its level needs.
    const first = k > 1 ? table.reduce((a, f) => (foodUntil(b, f) < foodUntil(b, a) ? f : a)) : -1;
    const lasts = k > 1 && table.length > 1 ? `the ${TABLE_NAMES[first as Food]} runs out first, in ${days(left)}` : `lasts ${days(left)} more`;
    let grow = '';
    if (b.level === HUT && b.waterUntil > s.tick) grow = left >= COTTAGE_FOOD_MIN ? ' · becoming a cottage' : ' · a cottage needs a month’s food in hand';
    else if (wantsMoreFood(s, b)) {
      const want = FOODS.filter((f) => foodUntil(b, f) - s.tick < RISE_MIN && cityHas(s).makes[f]);
      const n = kindsNeeded(b.level + 1);
      // Kinds it has none of ("cheese too"), and kinds it has too little of ("more bread").
      const none = want.filter((f) => !table.includes(f));
      const more = want.filter((f) => table.includes(f));
      const asks = [none.length ? `${foodList(none, 'or')} too` : '', more.length ? `more ${foodList(more)}` : ''].filter(Boolean).join(', and ');
      grow = ` · ${levelName(b.level + 1)} needs ${n === 2 ? 'two kinds' : 'all three kinds'} of food, a month of each in hand: ${asks}`;
    } else if ((b.level === COTTAGE || b.level === TOWNHOUSE) && untilOf(b, nextNeed(b.level) || 'religion') > s.tick) {
      // Ready to grow but for the food: the city doesn't make enough kinds.
      const has = cityHas(s);
      const n = kindsNeeded(b.level + 1);
      if (has.kinds >= 1 && has.kinds < n) {
        const makers = FOODS.filter((f) => !has.makes[f]).map((f) => MAKER[f].name);
        grow = ` · ${levelName(b.level + 1)} needs ${n === 2 ? 'two kinds' : 'all three kinds'} of food, and the city makes only ${foodList(FOODS.filter((f) => has.makes[f]))}: build ${makers.join(n - has.kinds > 1 ? ' and ' : ' or ')}`;
      }
    }
    return `Has food: ${foodList(table)} · ${lasts}${grow}`;
  }
  if (b.level >= COTTAGE) {
    const goes = DECLINE_AFTER - (s.tick - missingSince(b, 'food'));
    const gone = s.tick - Math.max(until, b.grace);
    // (A home from an older save, in its grace, isn't counting yet.)
    const since = gone > 0 ? `for ${days(gone)}` : 'yet';
    if (table.length === 0) return `No food ${since} · goes back to ${levelName(b.level - 1)} in ${days(goes)} unless the food vendor comes`;
    const lack = foodsLacking(s, b);
    return `Only ${foodList(table)} on the table; ${levelName(b.level)} needs ${k === 2 ? 'two kinds' : 'all three'} · no ${foodList(lack, 'or')} ${since}: ${whyLacking(s, lack)} · goes back to ${levelName(b.level - 1)} in ${days(goes)}`;
  }
  return `No food · ${whyHungry(s, map, b, agoras)}`;
}

/** What makes each food, in a sentence: "a hunting lodge". */
const MAKER: Record<Food, { kind: BuildingKind; name: string; build: string }> = {
  [WHEAT]: { kind: 'farm', name: 'a wheat farm', build: 'build a wheat farm on the green land by the river' },
  [MEAT]: { kind: 'lodge', name: 'a hunting lodge', build: 'build a hunting lodge within reach of the deer on the hills or the boar in the woods' },
  [CHEESE]: { kind: 'dairy', name: 'a dairy', build: 'build a dairy on green pasture' },
};

/** Why a home lacks some kinds of food it needs (the first that the city can't get to it). */
export function whyLacking(s: SimState, lack: readonly Food[]): string {
  for (const f of lack) {
    const m = MAKER[f];
    const makers = s.buildings.filter((o) => o.kind === m.kind);
    if (makers.length === 0) return `the city has no ${m.name.replace(/^an? /, '')} yet: ${m.build}`;
  }
  const f = lack.find((x) => x !== WHEAT) ?? lack[0];
  const name = FOOD_NAMES[f];
  const stalls = s.buildings.filter((o) => o.kind === 'agora');
  if (f === MEAT && s.buildings.filter((o) => o.kind === 'lodge').every((l) => meatPerMonth(s, l) === 0)) return 'the hunters find no game to spare: the herds in reach are down to their last head';
  if (stalls.every((a) => held(a, f) <= 0)) {
    const stored = s.buildings.some((g) => g.kind === 'granary' && held(g, f) > 0);
    return stored ? `the agora’s stall has no ${name}; its porter fetches it from the granary` : `no ${name} has reached a granary lately`;
  }
  return `the food vendor hasn’t brought ${name} this way lately`;
}

/**
 * How much of a food (wheat by default) the town makes in a month at its
 * present staffing, and how much it eats: a measure a person a month in all
 * (huts and better), shared across the kinds of food the city makes; with
 * what one more farm (lodge, dairy) like these would add.
 */
export function foodBalance(s: SimState, map: CoastMap, food: Food = WHEAT): { grown: number; eaten: number; perFarm: number } {
  let grown = 0;
  let full = 0;
  let farms = 0;
  for (const f of s.buildings) {
    if (food === WHEAT && f.kind === 'farm') {
      const h = (harvestOf(map, f) * TICKS_PER_MONTH) / GROW;
      grown += h * rateOf(f);
      full += h;
      farms++;
    } else if (food === MEAT && f.kind === 'lodge') {
      grown += meatPerMonth(s, f);
      full += LODGE_MONTH;
      farms++;
    } else if (food === CHEESE && f.kind === 'dairy') {
      grown += cheeseOf(map, f) * rateOf(f);
      full += cheeseOf(map, f);
      farms++;
    }
  }
  const kinds = Math.max(1, cityHas(s).kinds);
  let eaten = 0;
  for (const b of s.buildings) if (eatsBread(b)) eaten += b.people;
  eaten /= kinds;
  const typical = food === WHEAT ? (HARVEST * TICKS_PER_MONTH) / GROW : food === MEAT ? LODGE_MONTH : ((CHEESE_BATCH * TICKS_PER_MONTH) / CHEESE_EVERY) * 0.6;
  return { grown, eaten, perFarm: farms ? full / farms : typical };
}

/** Round to the nearest ten from a hundred up. */
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/** "the farms grow about 570 measures a month and the town eats about 800: two more farms would feed it". */
export function balanceWords(bal: { grown: number; eaten: number; perFarm: number }): string {
  // With a tenth to spare: the vendor tops homes up in bursts, and towns grow.
  const more = Math.max(1, Math.ceil((bal.eaten * 1.1 - bal.grown) / bal.perFarm));
  const n = more === 1 ? 'another farm' : `${more <= 9 ? ['', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][more] : more} more farms`;
  return `the farms grow about ${fmt(roundTen(bal.grown))} measures of wheat a month and the town eats about ${fmt(roundTen(bal.eaten))}; ${n} would feed it`;
}

/** The town's wheat in a line, for the granary's and the agora's tips ('' before there are farms and people who eat bread). */
export function balanceLine(s: SimState, map: CoastMap): string {
  const bal = foodBalance(s, map);
  if (bal.eaten === 0 || !s.buildings.some((f) => f.kind === 'farm')) return '';
  const both = `The farms grow about ${fmt(roundTen(bal.grown))} measures of wheat a month and the town eats about ${fmt(roundTen(bal.eaten))}`;
  if (bal.eaten > bal.grown && s.buildings.some((f) => f.kind === 'farm' && rateOf(f) < 1)) return `${both}; a farm is short of workers (hover it to see why)`;
  const words = balanceWords(bal);
  if (bal.eaten > bal.grown) return `${words[0].toUpperCase()}${words.slice(1)}`;
  return `The farms grow about ${fmt(roundTen(bal.grown))} measures of wheat a month; the town eats about ${fmt(roundTen(bal.eaten))}`;
}

/** Why no food reaches a hut or better. */
export function whyHungry(s: SimState, map: CoastMap, b: Building, agoras: Building[]): string {
  const size = map.size;
  if (agoras.length === 0) return 'build an agora, with a granary and a farm to fill it, so a food vendor walks the streets';
  if (roadsBeside(s, size, b).length === 0) return 'the food vendor only sells to homes beside the road she walks';
  const sources: number[] = [];
  for (const a of agoras) sources.push(...roadsBeside(s, size, a));
  const d = stepsToFountain(roadSearch(s, size, sources), s, size, b);
  if (d < 0) return 'no road joins it to the agora';
  if (d > VENDOR_RANGE) return `the agora is ${d} steps away by road; its food vendor goes ${VENDOR_RANGE} at most`;
  // Little on the stall and in the granaries, or nothing on the stall while the town eats more than its farms grow: say why, with the numbers.
  const stored = s.buildings.reduce((n, g) => n + (g.kind === 'granary' ? g.stock : 0), 0);
  const empty = agoras.every((a) => a.stock <= 0);
  const bal = foodBalance(s, map);
  const short = bal.eaten > bal.grown;
  if ((agoras.every((a) => a.stock < STALL_CAP / 4) && stored < STALL_CAP / 2) || (empty && short)) {
    const stall = empty ? 'the agora’s food stall is empty' : 'the agora’s stall runs low';
    // A farm short of hands grows slowly: say so before asking for another farm.
    if (s.buildings.some((f) => f.kind === 'farm' && rateOf(f) < 1)) return `${stall}: a farm is short of workers (hover it to see why)`;
    if (short) return `${stall}: ${balanceWords(bal)}`;
    return `${stall} until the next harvest comes in`;
  }
  if (empty) return 'the agora’s food stall is empty for now; its porter is fetching more from the granary';
  if (b.foodUntil > 0) return 'within reach of the agora, but the food vendor has taken other turns lately';
  return 'within reach of the agora; the food vendor hasn’t come this way yet';
}

/** Whether any workplace is joined to a home by road. */
export function reachesWork(s: SimState, size: number, b: Building): boolean {
  const roads = roadsBeside(s, size, b);
  return s.buildings.some((o) => JOBS[o.kind] > 0 && roads.some((t) => distFrom(s, size, o)[t] >= 0));
}

/** How many of a home's people work. */
function workLine(s: SimState, size: number, b: Building): string {
  const able = canWork(b);
  if (able === 0) return '';
  const can = `${able} can work`;
  if (!s.buildings.some((o) => JOBS[o.kind] > 0)) return `${can} · nothing needs workers yet`;
  if (b.workers === 0) return `${can} · none has work: ${reachesWork(s, size, b) ? 'every job they can reach is taken' : 'no road joins it to a workplace'}`;
  const unpaid = b.unpaid > 0 ? ` · ${b.unpaid === b.workers ? 'their' : `${b.unpaid} of their`} wages unpaid this month` : '';
  if (b.workers >= able) return `${can} · ${able === 1 ? 'has' : 'all have'} work${unpaid}`;
  return `${can} · ${b.workers} have work; every other job they can reach is taken${unpaid}`;
}

/** How a workplace is staffed ('' if it needs nobody), and whether its wages are paid. */
export function workersLine(s: SimState, map: CoastMap, b: Building): string {
  const jobs = JOBS[b.kind];
  if (jobs === 0) return '';
  const staffed = staffLine(s, map, b, jobs);
  if (b.owed <= 0) return staffed;
  return `${staffed}\nWages unpaid: the treasury owes its workers ${b.owed} dr this month, so they work at half pace · money coming in pays them first`;
}

function staffLine(s: SimState, map: CoastMap, b: Building, jobs: number): string {
  if (b.workers >= jobs) return `Workers: ${jobs} of ${jobs}`;
  if (b.workers === 0) {
    if (roadsBeside(s, map.size, b).length === 0) return `No workers · it needs ${jobs}, and a road beside it`;
    // Homes joined to it by road, whose workers all work somewhere nearer their homes.
    const dist = distFrom(s, map.size, b);
    const joined = s.buildings.some((h) => canWork(h) > 0 && roadsBeside(s, map.size, h).some((t) => dist[t] >= 0));
    if (joined) return `No workers · it needs ${jobs}; everyone who can reach it already works somewhere nearer home · more homes nearby would help`;
    return `No workers · it needs ${jobs} from homes joined to it by road`;
  }
  return `Short of workers: ${b.workers} of ${jobs} · working at ${Math.round(Math.min(1, b.workers / jobs) * 100)}% · more homes nearby would help`;
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
  else if (f.stock > 0) {
    const search = roadSearch(s, map.size, roadsBeside(s, map.size, f));
    if (!s.buildings.some((g) => g.kind === 'granary' && nearestReached(search, roadsBeside(s, map.size, g)) >= 0)) barn += ' · no road joins it to a granary';
  }
  return { title, detail: lines(workersLine(s, map, f), crop, barn) };
}

/** "1,240 wheat · 300 meat · 0 cheese". */
const stocks = (b: Building): string => FOODS.map((f) => `${fmt(held(b, f))} ${FOOD_NAMES[f]}`).join(' · ');

export function granaryStatus(s: SimState, map: CoastMap, g: Building): Status {
  const title = `${BUILDING_NAMES.granary} · ${stocks(g)}`;
  if (roadsBeside(s, map.size, g).length === 0) return { title, detail: 'Needs a road beside it, for carts and porters to reach it' };
  const rooms = `Holds ${fmt(GRANARY_CAP)} measures of wheat and ${fmt(GRANARY_ROOM[MEAT])} each of meat and cheese, each in its own store`;
  const bringing = FOODS.filter((f) => coming(g, f) > 0).map((f) => `${fmt(coming(g, f))} ${FOOD_NAMES[f]}`);
  const coming_ = bringing.length ? `Carts are bringing ${bringing.join(', ')} more` : !s.buildings.some((f) => f.kind === 'farm') ? 'Build a wheat farm on the green land by the river to fill it' : '';
  const full = FOODS.filter((f) => held(g, f) >= GRANARY_ROOM[f] && s.buildings.some((o) => o.kind === MAKER[f].kind)).map((f) => FOOD_NAMES[f]);
  const fullLine = full.length ? `Its ${foodList(full as unknown as Food[]).replace(/bread/, 'wheat')} store is full: carts with more wait for room` : '';
  const waiting = s.walkers.filter((w) => (w.kind === 'cart' || w.kind === 'porter') && w.target === g.id && w.wait > 0).length;
  const gate = waiting && g.workers === 0 ? `${waiting === 1 ? 'A cart is' : `${waiting} are`} waiting at the gate: nobody works here to take it in` : '';
  // Standing empty beside a granary that gets the grain: say why.
  const others = s.buildings.filter((o) => o.kind === 'granary' && o !== g);
  const idle = g.stock + g.incoming === 0 && others.some((o) => o.stock + o.incoming > 0) ? 'Empty for now: carts take their food to the granary with room nearest them, and porters fetch from the nearest with food' : '';
  return { title, detail: lines(workersLine(s, map, g), rooms, coming_, fullLine, gate, idle, balanceLine(s, map)) };
}

export function agoraStatus(s: SimState, map: CoastMap, a: Building): Status {
  const title = `${BUILDING_NAMES.agora} · the food stall has ${stocks(a)}`;
  if (roadsBeside(s, map.size, a).length === 0) return { title, detail: 'Needs a road beside it, for the food vendor to walk' };
  const w = s.walkers.find((o) => o.id === a.walker);
  let vendor: string;
  if (w) vendor = w.back ? 'The food vendor is heading back' : `The food vendor is out, ${w.steps} of ${VENDOR_WALK} new road tiles into her round`;
  else if (a.workers === 0) vendor = 'Nobody works the stall, so the food vendor can’t go out';
  else if (foodsIn(a) === 0) vendor = 'The food vendor waits for the stall to have food';
  else vendor = 'The food vendor is resting · she sets off again soon';
  const p = s.walkers.find((o) => o.kind === 'porter' && o.origin === a.id);
  let porter = '';
  if (p) porter = p.back ? `The porter is bringing ${porterLoad(p)} from the granary` : 'The porter is on his way to the granary for food';
  else if (!s.buildings.some((g) => g.kind === 'granary')) porter = 'Build a granary: the porter fetches the stall’s food from it';
  else if (!s.buildings.some((g) => g.kind === 'granary' && g.stock > 0) && a.stock <= STALL_LOW) porter = 'The porter waits: no granary has any grain';
  else if (a.stock <= STALL_LOW) {
    const search = roadSearch(s, map.size, roadsBeside(s, map.size, a));
    if (!s.buildings.some((g) => g.kind === 'granary' && g.stock > 0 && nearestReached(search, roadsBeside(s, map.size, g)) >= 0)) porter = 'The porter can’t go: no road joins the agora to a granary with grain';
  }
  const rooms = `The stall holds ${fmt(STALL_ROOM[WHEAT])} of wheat and ${fmt(STALL_ROOM[MEAT])} each of meat and cheese; the porter goes when any runs below ${fmt(STALL_LOW_AT[MEAT])} (wheat ${fmt(STALL_LOW)})`;
  return { title, detail: lines(workersLine(s, map, a), vendor, porter, rooms, balanceLine(s, map)) };
}

/** "1,200 measures of wheat, 300 of meat and 200 of cheese". */
function porterLoad(p: Walker): string {
  const bits = FOODS.filter((f) => (f === WHEAT ? p.load : f === MEAT ? p.meat : p.cheese) > 0).map((f) => [f === WHEAT ? p.load : f === MEAT ? p.meat : p.cheese, FOOD_NAMES[f]] as const);
  if (bits.length === 0) return 'nothing';
  return bits.map(([n, name], i) => (i === 0 ? `${fmt(n)} measures of ${name}` : `${fmt(n)} of ${name}`)).join(bits.length > 2 ? ', ' : ' and ').replace(/, ([^,]+)$/, ' and $1');
}

/** A hunting lodge: its hunters, its game, its store. */
export function lodgeStatus(s: SimState, map: CoastMap, l: Building): Status {
  const title = `${BUILDING_NAMES.lodge} · ${fmt(l.meat)} of ${fmt(LODGE_STORE)} measures of meat`;
  const out = huntersOut(s, l);
  const game: Array<{ h: Herd }> = herdsInReach(s, l);
  // A herd its hunters are after counts as in reach, though it has drifted just past the edge since they set out.
  for (const w of out) if (!w.back && s.herds[w.food] && !game.some((g) => g.h === s.herds[w.food])) game.push({ h: s.herds[w.food] });
  const spare = game.filter((g) => g.h.head > MIN_HEAD);
  let hunt: string;
  if (huntersFor(l) === 0) hunt = 'Nobody hunts with nobody working the lodge';
  else if (out.length) {
    const doing = out.map((w) => (w.back ? (w.load > 0 ? 'bringing back meat' : 'heading back empty-handed') : w.wait > 0 ? `stalking ${herdName(s.herds[w.food])}` : `after ${herdName(s.herds[w.food])}`));
    hunt = `${out.length === 1 ? 'A hunter is' : `${out.length} hunters are`} out: ${[...new Set(doing)].join(', ')}`;
  } else if (l.meat + MEAT_STEP > LODGE_STORE) hunt = 'The store is full: nobody hunts until carts take the meat away';
  else hunt = spare.length ? 'The hunters are resting · one sets out again soon' : 'Nobody hunts: there is no game to spare';
  let herds: string;
  if (game.length === 0) {
    const near = s.herds.map((h) => ({ h, d: Math.hypot(h.x - l.x - 1.5, h.z - l.z - 1.5) })).sort((a, b) => a.d - b.d)[0];
    herds = near ? `No game within reach: the nearest herd is ${herdName(near.h)}, ${Math.round(near.d)} tiles off; hunters go ${HUNT_RANGE} at most` : 'No game anywhere';
  } else if (spare.length === 0) {
    herds = `Game is scarce: ${game.map((g) => `${herdName(g.h)} ${g.h.head === 1 ? 'has 1 head' : `has ${g.h.head} head`}`).join(', ')}, and hunters leave every herd its last ${MIN_HEAD} · a herd this thin grows back a head only every ${Math.round(Math.min(...game.map((g) => regrowIn(g.h))) / TICKS_PER_DAY)} days or so`;
  } else herds = `Game in reach: ${game.map((g) => `${herdName(g.h)} (${g.h.head} head)`).join(', ')}`;
  const lim = meatLimits(s, l);
  const made = huntersFor(l) && lim.meat > 0 ? `About ${fmt(roundTen(lim.meat))} measures of meat a month${lim.game ? `: as fast as the game in reach grows back${s.buildings.some((o) => o !== l && o.kind === 'lodge' && game.some((g) => herdDistance(o, g.h) <= HUNT_RANGE)) ? ', shared with the other lodges after it' : ''}` : ' as staffed'}` : '';
  return { title, detail: lines(workersLine(s, map, l), hunt, herds, made, storeLine(s, map, l, MEAT)) };
}

/** What a lodge's hunters step out for, in measures (for the store's room). */
const MEAT_STEP = 160;

/** A dairy: its grass, its goats, its cheese. */
export function dairyStatus(s: SimState, map: CoastMap, d: Building): Status {
  const grass = grassOf(map, d.x, d.z, 3);
  const title = `${BUILDING_NAMES.dairy} · ${fmt(d.cheese)} of ${fmt(DAIRY_STORE)} measures of cheese`;
  const best = cheeseOf(map, d);
  const rate = rateOf(d);
  let making: string;
  if (d.cheese >= DAIRY_STORE) making = 'The store is full: the goats give nothing more until carts take the cheese away';
  else if (rate === 0) making = 'No cheese is made with nobody to milk the goats';
  else making = `Grass ${Math.round(grass * 100)}% · about ${fmt(roundTen(best * rate))} measures of cheese a month${rate < 1 ? ` (${fmt(roundTen(best))} fully worked)` : ''}`;
  return { title, detail: lines(workersLine(s, map, d), making, storeLine(s, map, d, CHEESE)) };
}

/** Where a lodge's or a dairy's food goes: carts on the road, or why none. */
function storeLine(s: SimState, map: CoastMap, b: Building, f: Food): string {
  if (roadsBeside(s, map.size, b).length === 0) return 'Needs a road beside it, for its workers and its carts';
  const carts = errandsOut(s, b);
  if (carts) return `${carts === 1 ? 'A cart is' : `${carts} carts are`} taking its ${FOOD_NAMES[f]} to the granary`;
  if (held(b, f) <= 0) return '';
  if (!s.buildings.some((g) => g.kind === 'granary')) return `Build a granary for its carts to take the ${FOOD_NAMES[f]} to`;
  if (!s.buildings.some((g) => g.kind === 'granary' && roomFor(g, f) > 0)) return `Every granary’s ${FOOD_NAMES[f]} store is full`;
  const search = roadSearch(s, map.size, roadsBeside(s, map.size, b));
  if (!s.buildings.some((g) => g.kind === 'granary' && nearestReached(search, roadsBeside(s, map.size, g)) >= 0)) return 'No road joins it to a granary';
  return '';
}

/** A wild herd, for its hover tip. */
export function herdStatus(s: SimState, h: Herd): Status {
  const name = herdName(h);
  const title = `${cap(name.replace(/^the /, ''))} · ${h.head} head`;
  const doing = fleeing(s, h) ? 'Running from a hunter' : moving(h) ? 'Moving on to fresh grazing' : 'Grazing';
  const grow = h.head < h.full ? `Grows back a head about every ${Math.round(regrowIn(h) / TICKS_PER_DAY)} days (slower the fewer are left), to ${h.full}` : `Whole: ${h.full} head`;
  const after = s.walkers.filter((w) => w.kind === 'hunter' && !w.back && s.herds[w.food] === h).length;
  const hunted = after ? `${after === 1 ? 'A hunter is' : `${after} hunters are`} after it` : h.head <= MIN_HEAD ? `Hunters leave it alone: its last ${MIN_HEAD} head` : '';
  return { title, detail: lines(doing, grow, hunted) };
}

/** What any walker other than settlers is doing. */
export function walkerStatus(s: SimState, w: Walker): Status | null {
  if (w.kind === 'water') return carrierStatus(w);
  if (w.kind === 'food') {
    const a = findBuilding(s, w.origin);
    const stall = a ? ` · the stall has ${stocks(a)}` : '';
    if (w.back) return { title: 'Food vendor', detail: `Heading back to the agora, selling on the way${stall}` };
    return { title: 'Food vendor', detail: `Out on her round, ${w.steps} of ${VENDOR_WALK} new road tiles walked · she heads for the homes whose food is running lowest${stall}` };
  }
  if (w.kind === 'priestess') {
    if (w.back) return { title: 'Priestess', detail: 'Heading back to her shrine, blessing homes on the way' };
    return { title: 'Priestess', detail: `Out on her round, ${w.steps} of ${PRIESTESS_WALK} new road tiles walked · she heads for the cottages and better whose blessings are running out soonest` };
  }
  if (w.kind === 'actor') {
    if (w.back) return { title: 'Actor', detail: 'Heading back to the theatre, still in costume' };
    return { title: 'Actor', detail: `Out on his round, ${w.steps} of ${ACTOR_WALK} new road tiles walked · he heads for the townhouses and better that have gone longest without a play` };
  }
  if (w.kind === 'tax') {
    const bag = purseTotal(w);
    if (w.back) return { title: 'Tax collector', detail: `Heading back to the tax office with ${bag} dr, collecting on the way` };
    return { title: 'Tax collector', detail: `Out on his round, ${w.steps} of ${COLLECTOR_WALK} new road tiles walked · ${bag} dr in his satchel · he heads for the homes that haven’t paid this month` };
  }
  if (w.kind === 'cart') {
    const g = findBuilding(s, w.target);
    const o = findBuilding(s, w.origin);
    const home = o?.kind === 'lodge' ? 'lodge' : o?.kind === 'dairy' ? 'dairy' : 'farm';
    const what = FOOD_NAMES[w.food as Food] ?? 'wheat';
    if (w.back) return { title: 'Ox cart', detail: `Heading back to its ${home}` };
    if (w.wait > 0) return { title: 'Ox cart', detail: g && g.workers === 0 ? `Waiting at the granary’s gate: nobody works there to take the ${what} in` : `Unloading ${fmt(w.load)} measures of ${what} at the granary` };
    return { title: 'Ox cart', detail: `Taking ${fmt(w.load)} measures of ${what} to the granary` };
  }
  if (w.kind === 'porter') {
    if (w.back) return { title: 'Porter', detail: w.load + w.meat + w.cheese > 0 ? `Bringing ${porterLoad(w)} to the agora’s food stall` : 'Heading back to the agora empty-handed' };
    if (w.wait > 0) return { title: 'Porter', detail: 'Loading food at the granary' };
    return { title: 'Porter', detail: 'On his way to the granary for food for the stall' };
  }
  if (w.kind === 'hunter') {
    const h = s.herds[w.food];
    const name = h ? herdName(h) : 'the herd';
    if (w.back) return { title: 'Hunter', detail: w.load > 0 ? `Bringing ${fmt(w.load)} measures of meat back to the lodge` : `Heading back to the lodge empty-handed: ${h && h.head <= MIN_HEAD ? `${name} is down to its last ${MIN_HEAD} head` : `${name} got away`}` };
    if (w.wait > 0) return { title: 'Hunter', detail: `Stalking ${name} (${h?.head ?? 0} head)` };
    return { title: 'Hunter', detail: `Heading across country for ${name}${h ? ` (${h.head} head)` : ''}` };
  }
  return null;
}

export { eatsBread };

/** A calm line about something the town is short of, for the strip under the top bar, and the building it is about (0 for none). */
export interface TownLine {
  need: 'food' | 'workers' | 'money';
  text: string;
  at: number;
}

/**
 * Months of warning the bread line gives: it shows once the stores would run
 * out within this many months at the rate the town is eating into them (a
 * new farm's first harvest is two months off, and homes warn for two more
 * before they go down), not merely when the farms tip below what the town
 * eats while the granaries are full.
 */
export const BREAD_LEAD_MONTHS = 6;

/**
 * The spare the farms need over what the town eats to keep every stall full
 * between harvests (the same tenth the farm count in balanceWords leaves).
 */
export const BREAD_SPARE = 1.1;

/**
 * What the town is short of, in a line each, readable without hovering: bread
 * (the farms growing less than the town eats, once there is a farm or an
 * agora, and the stores running out within BREAD_LEAD_MONTHS; or homes
 * already warning about bread while the farms grow less than a tenth more
 * than the town eats) and workers (jobs unfilled). Empty when all is well.
 */
export function townLines(s: SimState, map: CoastMap): TownLine[] {
  const out: TownLine[] = [];
  const farms = s.buildings.filter((b) => b.kind === 'farm');
  const agora = s.buildings.find((b) => b.kind === 'agora');
  const bal = foodBalance(s, map);
  let stored = 0;
  for (const g of s.buildings) if (g.kind === 'granary' || g.kind === 'agora') stored += g.stock;
  // How many months the stores last at the rate the town eats into them.
  const runsOut = stored / Math.max(1, bal.eaten - bal.grown);
  // Homes warning about bread: the stalls already run short between harvests.
  let hungry = 0;
  if (farms.length > 0 && bal.grown < bal.eaten * BREAD_SPARE) for (const b of s.buildings) if (b.kind === 'home' && warningsOf(s, b).some((w) => w.need === 'food')) hungry++;
  const already = hungry ? ` ${hungry === 1 ? 'A home is' : `${fmt(hungry)} homes are`} already going without.` : '';
  if (farms.length > 0 && hungry > 0 && bal.eaten <= bal.grown && !farms.some((f) => rateOf(f) < 1)) {
    // Enough on paper, but too little to spare: say so, and how many farms would give the tenth more.
    const more = Math.max(1, Math.ceil((bal.eaten * BREAD_SPARE - bal.grown) / bal.perFarm));
    const n = more === 1 ? 'Another farm' : `${more <= 9 ? ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][more] : more} more farms`;
    const granary = s.buildings.find((g) => g.kind === 'granary');
    out.push({
      need: 'food',
      text: `Bread: the farms grow about ${fmt(roundTen(bal.grown))} measures of wheat a month and the town eats about ${fmt(roundTen(bal.eaten))}, too little to spare.${already.replace(/\.$/, ' between harvests.')} ${n} would keep it fed.`,
      at: granary?.id ?? farms[0].id,
    });
  } else if (bal.eaten > bal.grown && (farms.length > 0 || agora) && (farms.length === 0 || runsOut < BREAD_LEAD_MONTHS || hungry > 0)) {
    const eats = fmt(roundTen(bal.eaten));
    if (farms.length === 0) {
      out.push({ need: 'food', text: `Bread: the town eats about ${eats} measures of wheat a month and no farm grows any yet. A wheat farm on the green land by the river would start it.`, at: agora?.id ?? 0 });
    } else {
      const slow = farms.find((f) => rateOf(f) < 1);
      const months = stored / Math.max(1, bal.eaten);
      const stores =
        months < 0.5
          ? ' The granaries are nearly empty.'
          : runsOut >= 1.5
            ? ` At this rate the granaries and stalls run empty in about ${Math.round(runsOut)} months.`
            : ' At this rate the granaries and stalls run empty within a month or so.';
      const granary = s.buildings.find((g) => g.kind === 'granary');
      const why =
        slow && roadsBeside(s, map.size, slow).length === 0
          ? 'a farm has no road beside it, so nobody can work it'
          : slow && slow.owed > 0 && slow.workers >= JOBS.farm
            ? 'a farm’s wages are unpaid, so it works at half pace'
            : `a farm is short of workers (${slow?.workers} of ${JOBS.farm})`;
      if (slow) out.push({ need: 'food', text: `Bread: the farms grow about ${fmt(roundTen(bal.grown))} measures of wheat a month and the town eats about ${eats}; ${why}.${stores}${already}`, at: slow.id });
      else if (roundTen(bal.grown) === roundTen(bal.eaten)) {
        // Rounded, the two would read the same: say which way it tips.
        out.push({ need: 'food', text: `Bread: the town now eats a little more wheat than the farms grow (about ${eats} measures a month). Another farm would keep it fed.${stores}${already}`, at: granary?.id ?? farms[0].id });
      } else {
        const words = balanceWords(bal).replace(/; (another farm|\w+ more farms) would feed it$/, (_, n: string) => `. ${n[0].toUpperCase()}${n.slice(1)} would keep it fed.`);
        out.push({ need: 'food', text: `Bread: ${words}${stores}${already}`, at: granary?.id ?? farms[0].id });
      }
    }
  }
  // Meat and cheese: homes warning about food for want of one of them.
  for (const f of [MEAT, CHEESE] as Food[]) {
    let short = 0;
    let first = 0;
    for (const b of s.buildings) {
      if (b.kind !== 'home' || !warningsOf(s, b).some((w) => w.need === 'food') || !foodsLacking(s, b).includes(f)) continue;
      if (!short) first = b.id;
      short++;
    }
    if (!short) continue;
    const m = MAKER[f];
    const Name = cap(FOOD_NAMES[f]);
    const going = `${short === 1 ? 'a home is' : `${fmt(short)} homes are`} going without (townhouses need two kinds of food, fine houses all three)`;
    const makers = s.buildings.filter((o) => o.kind === m.kind);
    if (makers.length === 0) {
      out.push({ need: 'food', text: `${Name}: ${going}. ${cap(m.build)}.`, at: first });
      continue;
    }
    const bal = foodBalance(s, map, f);
    const scarce = f === MEAT && bal.grown === 0 ? ' The hunters find no game to spare: the herds in reach are down to their last head, and grow back in time; a lodge near other herds would help.' : '';
    const more = !scarce && bal.grown < bal.eaten ? ` Another ${m.name.replace(/^an? /, '')} would help.` : '';
    out.push({
      need: 'food',
      text: `${Name}: ${going}. The ${f === MEAT ? 'lodges bring in' : 'dairies make'} about ${fmt(roundTen(bal.grown))} measures a month and the town eats about ${fmt(roundTen(bal.eaten))}.${scarce}${more}`,
      at: makers[0].id,
    });
  }
  const wf = workforce(s);
  const { able } = wf;
  // A workplace built since workers were last shared out (once a day) hasn't had its chance yet.
  const waiting = wf.short.filter((b) => b.workers === 0 && s.tick - b.placed <= TICKS_PER_DAY);
  const short = wf.short.filter((b) => !waiting.includes(b));
  const jobs = wf.jobs - waiting.reduce((n, b) => n + JOBS[b.kind], 0);
  const filled = wf.filled;
  if (filled < jobs && short.length) {
    const open = jobs - filled;
    const first = short[0];
    const name = (BUILDING_NAMES[first.kind as Exclude<BuildingKind, 'home'>] ?? 'A workplace').replace(/^A /, 'the ').replace(/^The /, 'the ');
    const others = short.length > 1 ? ` (and ${short.length - 1} more ${short.length === 2 ? 'place' : 'places'})` : '';
    const fix =
      roadsBeside(s, map.size, first).length === 0
        ? 'It has no road beside it, so nobody can get there: lay one along a side.'
        : able < jobs
          ? `${able} people can work for ${jobs} jobs: more homes would help.`
          : 'More homes near it by road would help.';
    out.push({ need: 'workers', text: `Workers: ${open} ${open === 1 ? 'job' : 'jobs'} unfilled. ${name[0].toUpperCase()}${name.slice(1)} has ${first.workers} of ${JOBS[first.kind]}${others}. ${fix}`, at: first.id });
  }
  const money = moneyLine(s);
  if (money) out.push(money);
  return out;
}

/** The treasury runs dry within this many months at last month's rate before the money line warns. */
export const MONEY_LEAD_MONTHS = 6;

/**
 * The money line: wages owed that the treasury can't pay; or wages going out
 * with no tax office to bring taxes in; or, with a tax office that has stood
 * a month, the treasury running dry within MONEY_LEAD_MONTHS at the rate
 * taxes and wages run now. Taxes come in by the round, so a month's ledger
 * can hold one hand-in or three; the rate here is steadier: what the homes
 * paid the collectors in the last month (some of it still in their satchels)
 * against the wages the workplaces are owed each month as staffed now.
 * Null when the money is fine.
 */
export function moneyLine(s: SimState): TownLine | null {
  const owed = owedWages(s);
  if (owed.owed > 0) {
    const first = s.buildings.find((b) => b.owed > 0);
    const where = owed.places === 1 ? 'one workplace' : `${owed.places} workplaces`;
    return {
      need: 'money',
      text: `Money: the treasury can’t pay this month’s wages at ${where} (${fmt(owed.owed)} dr for ${fmt(owed.workers)} workers), so they work at half pace. Money coming in pays them first${!hasTaxOffice(s) ? '; build a tax office, which the treasury has kept back the cost of' : s.taxRate === 0 ? '; taxes are set to none, so the collectors bring nothing in' : '; higher taxes, or a tax collector reaching more homes, would help'}.`,
      at: first?.id ?? 0,
    };
  }
  const bill = wageBill(s);
  if (!hasTaxOffice(s)) {
    if (bill <= 0) return null;
    return { need: 'money', text: `Money: no taxes come in without a tax office, and wages go out, about ${fmt(bill)} dr a month. A tax office beside the houses sends out a tax collector.`, at: 0 };
  }
  const office = s.buildings.find((b) => b.kind === 'taxoffice' && s.tick - b.placed >= TICKS_PER_MONTH);
  if (!office) return null;
  const taxes = monthlyTaxes(s);
  const net = taxes - bill;
  if (net >= 0) return null;
  const months = (s.money - reserve(s)) / -net;
  if (months >= MONEY_LEAD_MONTHS) return null;
  const when = months < 1.5 ? 'within a month or so' : `in about ${Math.round(months)} months`;
  return {
    need: 'money',
    text: `Money: the tax collectors bring in about ${fmt(taxes)} dr a month and wages take about ${fmt(bill)}; at that rate the treasury runs dry ${when}. Higher taxes, or a tax collector reaching more homes, would help.`,
    at: office.id,
  };
}

/** What the homes paid the tax collectors over the last month (the coins still in satchels too). */
export function monthlyTaxes(s: SimState): number {
  let n = 0;
  for (const b of s.buildings) if (b.kind === 'home' && b.people > 0 && taxedLately(s, b)) n += b.taxPaid;
  return n;
}

/** The drachmas' tooltip: what the treasury holds, and last month in a line. */
export function moneyTip(s: SimState): string {
  const l = s.ledger;
  const current = l.month === monthOf(s.tick);
  const last = current ? l.last : l.month === monthOf(s.tick) - 1 ? l.now : [];
  const head = 'Drachmas in the treasury · click for the ledger';
  if (last.length === 0) return `${head}. Taxes come in with the tax collector; wages go out on the first of each month (${WAGE} dr a worker).`;
  const t = totals(last);
  return `${head}. Last month: ${fmt(t.in)} dr in, ${fmt(t.out)} out (${t.net >= 0 ? '+' : '−'}${fmt(Math.abs(t.net))}).`;
}
