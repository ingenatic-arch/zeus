/**
 * What a building or walker is doing, in a few plain words, for the hover
 * tips: who lives in a home, what reaches it, and if nothing does, why not;
 * how a workplace is staffed and what it is doing. Each status is a headline
 * and further lines of detail ('' if none).
 */
import type { CoastMap } from '../map/bake';
import { fertilityOf, grassOf, oliveOf, vineOf } from './build';
import { BUILDING_NAMES, capacity, COTTAGE, findBuilding, footSide, HOME_NAMES, HUT, JOBS, jobsAt, levelName, TENT, TOWNHOUSE } from './buildings';
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
  stallRoom,
  VENDOR_RANGE,
  VENDOR_WALK,
} from './food';
import { FIRST_GOOD, FLEECE, GOOD_SERVICE, GRAPES, OIL, OLIVES, WARE_NAMES, WINE, type Ware } from './foods';
import { stallLow, STALL_GOODS, STALL_NAMES, STALL_VENDOR, unitOf, vendorGood } from './goods';
import { FLEECE_MONTH, grapesOf, OLIVE_GROW, olivesOf, OIL_MONTH, stageOf, MAKERS, VINE_GROW, WINE_MONTH } from './production';
import { roomFor as roomForWare, roomOf as roomForWareKind, storeOf as storeOfKind } from './stores';
import { CHEESE, coming, FOOD_NAMES, foodList, FOODS, foodUntil, held, kindsNeeded, MEAT, TABLE_NAMES, tableUntil, WHEAT, type Food } from './foods';
import { cityHas, citySells, foodsLacking, justOpened, levelNeeding, missingSince, nextNeed, RISE_MIN, SETTLE, untilOf, wantsMoreFood, warningsOf } from './folk';
import { herdDistance, herdsInReach, huntersFor, huntersOut, HUNT_RANGE, LODGE_MONTH, meatLimits, meatPerMonth } from './hunt';
import { goodUntil, hasStall } from './goods';
import { fleeing, herdName, MIN_HEAD, moving, regrowIn } from './wild';
import { COTTAGE_FOOD_MIN, DECLINE_AFTER } from './houses';
import { canWork, rateOf, workforce } from './labour';
import { edgeRoads, nearestReached, roadSearch, type Search } from './roads';
import { distFrom, roadsBeside } from './rounds';
import type { Building, BuildingKind, Herd, SimState, Walker } from './state';
import { dockerDoing, dockerNews, goodsList, priceFor, quayWorth, SHIP_COMING, SHIP_MOORED, shipNews, TRADE_GOODS } from './trade';
import { CARRIER_RANGE, CARRIER_WALK, stepsToFountain, waterReach } from './water';
import { COLLECTOR_RANGE, COLLECTOR_WALK, goneForTaxes, HARSH, purseTotal, TAX_RATES, taxedLately, taxFor } from './taxes';
import { hasTaxOffice, monthOf, owedWages, reserve, totals, WAGE, wageBill } from './treasury';
import { clearFee } from './build';
import { districtAt, districtTitle } from '../map/districts';
import {
  BURNT,
  burnable,
  daysToFull,
  FIRE_BURNING,
  FIRE_SMOULDER,
  HAZARD_FULL,
  INSPECT_RANGE,
  INSPECT_WALK,
  riskRate,
  WATCH_RANGE,
  WATCH_WALK,
  wearRate,
  wears,
} from './hazards';

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
  if (b.kind === 'rubble') return rubbleStatus(s, b);
  if (b.kind === 'watchpost' || b.kind === 'architect') return { ...postStatus(s, map, b), detail: lines(postStatus(s, map, b).detail, ...hazardLines(s, map, b)) };
  const st = buildingStatus(s, map, b, reach);
  const more = hazardLines(s, map, b);
  // Smouldering, burning or creaking goes first: it is the news.
  if (b.fire > 0 || b.creakAt > 0) return { title: st.title, detail: lines(...more, st.detail) };
  return { title: st.title, detail: lines(st.detail, ...more) };
}

function buildingStatus(s: SimState, map: CoastMap, b: Building, reach?: Search): Status {
  if (b.kind === 'fountain') return fountainStatus(s, map, b);
  if (b.kind === 'farm') return farmStatus(s, map, b);
  if (b.kind === 'lodge') return lodgeStatus(s, map, b);
  if (b.kind === 'dairy') return dairyStatus(s, map, b);
  if (b.kind === 'granary') return granaryStatus(s, map, b);
  if (b.kind === 'agora') return agoraStatus(s, map, b);
  if (b.kind === 'shrine' || b.kind === 'theatre') return cultureStatus(s, map, b);
  if (b.kind === 'taxoffice') return taxOfficeStatus(s, map, b);
  if (b.kind === 'grove') return groveStatus(s, map, b);
  if (b.kind === 'press') return pressStatus(s, map, b);
  if (b.kind === 'storehouse') return storehouseStatus(s, map, b);
  if (b.kind === 'pasture') return pastureStatus(s, map, b);
  if (b.kind === 'vineyard') return vineyardStatus(s, map, b);
  if (b.kind === 'winery') return wineryStatus(s, map, b);
  if (b.kind === 'trading') return tradingStatus(s, map, b);
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
  return { title, detail: lines(road && !full ? road : '', water, foodLine(s, map, b), blessingLine(s, map, b), oilLine(s, map, b), playsLine(s, map, b), goodLine(s, map, b, FLEECE), goodLine(s, map, b, WINE), workLine(s, map.size, b), taxLine(s, map, b)) };
}

/** What a home pays the tax collector, or why he doesn't call. */
export function taxLine(s: SimState, map: CoastMap, b: Building): string {
  if (b.kind !== 'home' || b.level === 0 || b.people === 0) return '';
  const would = taxFor(s, b);
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
  const jobs = jobsAt(b);
  if (jobs === 0) return '';
  const staffed = staffLine(s, map, b, jobs);
  if (b.owed <= 0) return staffed;
  return `${staffed}\nWages unpaid: the treasury owes its workers ${b.owed} dr this month, so they work at half pace · money coming in pays them first`;
}

function staffLine(s: SimState, map: CoastMap, b: Building, jobs: number): string {
  if (b.workers >= jobs) return `Workers: ${jobs} of ${jobs}`;
  if (b.workers === 0) {
    if (roadsBeside(s, map.size, b).length === 0) return `No workers · it needs ${jobs}, and a road beside it`;
    // Workers are shared out once a day: a workplace built since then hasn't had its turn.
    if (s.tick - b.placed < TICKS_PER_DAY) return `No workers yet · it needs ${jobs}; they are found among the homes at the start of each day`;
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
  const p = s.walkers.find((o) => o.kind === 'porter' && o.origin === a.id && o.food < FIRST_GOOD);
  let porter = '';
  if (p) porter = p.back ? `The porter is bringing ${porterLoad(p)} from the granary` : 'The porter is on his way to the granary for food';
  else if (!s.buildings.some((g) => g.kind === 'granary')) porter = 'Build a granary: the porter fetches the stall’s food from it';
  else if (!s.buildings.some((g) => g.kind === 'granary' && g.stock > 0) && a.stock <= STALL_LOW) porter = 'The porter waits: no granary has any grain';
  else if (a.stock <= STALL_LOW) {
    const search = roadSearch(s, map.size, roadsBeside(s, map.size, a));
    if (!s.buildings.some((g) => g.kind === 'granary' && g.stock > 0 && nearestReached(search, roadsBeside(s, map.size, g)) >= 0)) porter = 'The porter can’t go: no road joins the agora to a granary with grain';
  }
  const rooms = `The stall holds ${fmt(STALL_ROOM[WHEAT])} of wheat and ${fmt(STALL_ROOM[MEAT])} each of meat and cheese; the porter goes when any runs below ${fmt(STALL_LOW_AT[MEAT])} (wheat ${fmt(STALL_LOW)})`;
  return { title, detail: lines(workersLine(s, map, a), vendor, porter, rooms, ...STALL_GOODS.map((g) => stallLines(s, a, g)), balanceLine(s, map)) };
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
    const near = s.herds.map((h) => ({ h, d: herdDistance(l, h) })).sort((a, b) => a.d - b.d)[0];
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
  if (w.kind === 'watchman') {
    const f = w.target > 0 ? findBuilding(s, w.target) : undefined;
    if (f && w.wait > 0) return { title: 'Watchman', detail: `Fighting the fire at ${placeName(f)} with his bucket and hook · it is out in ${days(w.wait)} if it doesn’t fall first` };
    if (f) return { title: 'Watchman', detail: `Running to the fire at ${placeName(f)}` };
    if (w.back) return { title: 'Watchman', detail: 'Heading back to his watch post, looking out for smoke on the way' };
    return { title: 'Watchman', detail: `Out on his round, ${w.steps} of ${WATCH_WALK} new road tiles walked · he heads for the buildings nearest to smouldering · every building beside his way is made safe from fire, and he runs to any flames he sees` };
  }
  if (w.kind === 'inspector') {
    if (w.back) return { title: 'Inspector', detail: 'Heading back to the architect’s office, looking over the walls on the way' };
    return { title: 'Inspector', detail: `Out on her round, ${w.steps} of ${INSPECT_WALK} new road tiles walked · she heads for the most worn buildings · every building beside her way is made sound before it falls` };
  }
  if (w.kind === 'tax') {
    const bag = purseTotal(w);
    if (w.back) return { title: 'Tax collector', detail: `Heading back to the tax office with ${bag} dr, collecting on the way` };
    return { title: 'Tax collector', detail: `Out on his round, ${w.steps} of ${COLLECTOR_WALK} new road tiles walked · ${bag} dr in his satchel · he heads for the homes that haven’t paid this month` };
  }
  const sells = vendorGood(w.kind);
  if (sells >= 0) {
    const what = WARE_NAMES[sells];
    const a = findBuilding(s, w.origin);
    const stall = a ? ` · the ${what} stall has ${fmt(held(a, sells))} ${unitOf(sells, held(a, sells))}` : '';
    const title = `${cap(what)} vendor`;
    if (w.back) return { title, detail: `Heading back to the agora, selling ${what} on the way${stall}` };
    const p = sheHe(sells);
    return { title, detail: `Out on ${p.her} round, ${w.steps} of ${VENDOR_WALK} new road tiles walked · ${p.she} heads for the ${CHAINS[sells]?.buyers ?? 'homes'} whose ${what} is running lowest${stall}` };
  }
  if (w.kind === 'cart') {
    const g = findBuilding(s, w.target);
    const o = findBuilding(s, w.origin);
    const home = o ? CART_HOME[o.kind] ?? 'farm' : 'farm';
    const what = WARE_NAMES[w.food] ?? 'wheat';
    const to = g ? STORE_NAME[g.kind] ?? 'granary' : WARE_GOES[w.food] ?? 'granary';
    const load = amount(w.food, w.load);
    if (w.back) return { title: 'Ox cart', detail: w.load > 0 ? `Taking its ${what} back to its ${home}: nowhere has room for it` : `Heading back to its ${home}` };
    if (w.wait > 0) return { title: 'Ox cart', detail: g && g.workers === 0 ? `Waiting at the ${to}’s gate: nobody works there to take the ${what} in` : `Unloading ${load} at the ${to}` };
    return { title: 'Ox cart', detail: `Taking ${load} to the ${to}` };
  }
  if (w.kind === 'porter' && w.food >= FIRST_GOOD) {
    const what = WARE_NAMES[w.food];
    if (w.back) return { title: 'Porter', detail: w.load > 0 ? `Bringing ${amount(w.food, w.load)} to the agora’s ${what} stall` : 'Heading back to the agora empty-handed' };
    if (w.wait > 0) return { title: 'Porter', detail: `Loading ${unitOf(w.food, 2)} of ${what} at the storehouse` };
    return { title: 'Porter', detail: `On his way to the storehouse for ${what} for the agora’s ${what} stall` };
  }
  if (w.kind === 'porter') {
    if (w.back) return { title: 'Porter', detail: w.load + w.meat + w.cheese > 0 ? `Bringing ${porterLoad(w)} to the agora’s food stall` : 'Heading back to the agora empty-handed' };
    if (w.wait > 0) return { title: 'Porter', detail: 'Loading food at the granary' };
    return { title: 'Porter', detail: 'On his way to the granary for food for the stall' };
  }
  if (w.kind === 'docker') {
    const d = dockerDoing(s, w);
    return { title: 'Docker', detail: `${d[0].toUpperCase()}${d.slice(1)}` };
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

// ---------------------------------------------------------------------------
// Goods: the makers (grove and press, pasture, vineyard and winery), the
// storehouse, the agora's stalls, and the homes.

/** Where each kind's carts come home to, and what each store is called (for the carts' tips). */
const CART_HOME: Partial<Record<BuildingKind, string>> = { farm: 'farm', lodge: 'lodge', dairy: 'dairy', grove: 'olive grove', press: 'olive press', pasture: 'pasture', vineyard: 'vineyard', winery: 'winery' };
const STORE_NAME: Partial<Record<BuildingKind, string>> = { granary: 'granary', press: 'olive press', winery: 'winery', storehouse: 'storehouse' };
/** Where carts take each ware when the tip can't name the building (olives to a press, grapes to a winery, goods to a storehouse). */
const WARE_GOES: Partial<Record<Ware, string>> = { [OLIVES]: 'olive press', [GRAPES]: 'winery', [OIL]: 'storehouse', [FLEECE]: 'storehouse', [WINE]: 'storehouse' };

/** "12 jars of oil", "300 measures of olives". */
const amount = (w: Ware, n: number): string => `${fmt(n)} ${unitOf(w, n)} of ${WARE_NAMES[w]}`;

/** The wine vendor is a man; the oil and fleece vendors are women (see the walkers' looks). */
const VENDOR_MEN: ReadonlySet<Ware> = new Set([WINE]);
const sheHe = (good: Ware): { she: string; her: string } => (VENDOR_MEN.has(good) ? { she: 'he', her: 'his' } : { she: 'she', her: 'her' });

/**
 * Each stall good's chain, from what makes it to the stall: the buildings
 * that bring it to a storehouse (what to say when each is missing), the key
 * that adds its stall, who buys it, and why none has reached a storehouse
 * yet when every link stands.
 */
interface Chain {
  links: ReadonlyArray<{ kind: BuildingKind; missing: string }>;
  key: string;
  /** Who the vendor sells to, and who needs it. */
  buyers: string;
  needers: string;
  stuck(s: SimState): string;
}
const CHAINS: Partial<Record<Ware, Chain>> = {
  [OIL]: {
    links: [
      { kind: 'grove', missing: 'the city has no olive grove yet: build one on the dry slopes (M, four times)' },
      { kind: 'press', missing: 'the city has no olive press yet for the groves’ carts to take their olives to' },
      { kind: 'storehouse', missing: 'the city has no storehouse yet for the press’s carts to take its jars to (G twice)' },
    ],
    key: 'K twice',
    buyers: 'cottages and better',
    needers: 'townhouses and better need it',
    stuck(s) {
      const press = s.buildings.find((p) => p.kind === 'press');
      if (press && held(press, OLIVES) <= 0 && held(press, OIL) <= 0) return `no oil has reached a storehouse yet: the press waits for olives from the groves${nextPicking(s, 'grove')}`;
      return 'no oil has reached a storehouse yet';
    },
  },
  [FLEECE]: {
    links: [
      { kind: 'pasture', missing: 'the city has no sheep pasture yet: build one on green grass (M, six times)' },
      { kind: 'storehouse', missing: 'the city has no storehouse yet for the pasture’s carts to take its bales to (G twice)' },
    ],
    key: 'K three times',
    buyers: 'townhouses and better',
    needers: 'fine houses and better need it',
    stuck(s) {
      if (s.buildings.every((p) => p.kind !== 'pasture' || p.workers === 0)) return 'no fleece has reached a storehouse yet: nobody works a pasture to shear the sheep';
      return 'no fleece has reached a storehouse yet: the shepherds are still shearing the first bales';
    },
  },
  [WINE]: {
    links: [
      { kind: 'vineyard', missing: 'the city has no vineyard yet: plant one on a sunny slope (M, seven times)' },
      { kind: 'winery', missing: 'the city has no winery yet for the vineyards’ carts to take their grapes to (M, eight times)' },
      { kind: 'storehouse', missing: 'the city has no storehouse yet for the winery’s carts to take its amphorae to (G twice)' },
    ],
    key: 'K four times',
    buyers: 'fine houses and better',
    needers: 'villas need it',
    stuck(s) {
      const w = s.buildings.find((p) => p.kind === 'winery');
      if (w && held(w, GRAPES) <= 0 && held(w, WINE) <= 0) return `no wine has reached a storehouse yet: the winery waits for grapes from the vineyards${nextPicking(s, 'vineyard')}`;
      return 'no wine has reached a storehouse yet';
    },
  },
};

/**
 * Where a maker's ware goes (the grove's olives to a press, the press's oil
 * to a storehouse): carts on the road, or why none go.
 */
function goodsCartLine(s: SimState, map: CoastMap, b: Building, w: Ware, to: BuildingKind, build: string): string {
  if (roadsBeside(s, map.size, b).length === 0) return 'Needs a road beside it, for its workers and its carts';
  const what = WARE_NAMES[w];
  const name = STORE_NAME[to] ?? to;
  const carts = errandsOut(s, b);
  if (carts) return `${carts === 1 ? 'A cart is' : `${carts} carts are`} taking its ${what} to the ${name}`;
  if (held(b, w) <= 0) return '';
  if (!s.buildings.some((g) => g.kind === to)) return `Build ${build} for its carts to take the ${what} to`;
  if (!s.buildings.some((g) => g.kind === to && roomForWare(g, w) > 0)) return `Every ${name} is full of ${what}: its carts wait for room`;
  const search = roadSearch(s, map.size, roadsBeside(s, map.size, b));
  if (!s.buildings.some((g) => g.kind === to && nearestReached(search, roadsBeside(s, map.size, g)) >= 0)) return `No road joins it to ${build.replace(/^an? /, 'an ').replace(/^an s/, 'a s').replace(/^an w/, 'a w')}`;
  return '';
}

/** An olive grove or a vineyard: its ground, its crop, its store of what was picked. */
function cropStatus(s: SimState, map: CoastMap, g: Building): Status {
  const grove = g.kind === 'grove';
  const ware = grove ? OLIVES : GRAPES;
  const picked = held(g, ware);
  const ground = grove ? oliveOf(map, g.x, g.z, 3) : vineOf(map, g.x, g.z, 3);
  const title = `${BUILDING_NAMES[g.kind as 'grove' | 'vineyard']} · ${grove ? 'olive' : 'vine'} ground ${Math.round(ground * 100)}%`;
  if (roadsBeside(s, map.size, g).length === 0) return { title, detail: 'Needs a road beside it, for its pickers and its carts' };
  const rate = rateOf(g);
  const harvest = grove ? olivesOf(map, g) : grapesOf(map, g);
  const store = storeOfKind(g.kind);
  const grow = grove ? OLIVE_GROW : VINE_GROW;
  const fruit = grove ? 'olives' : 'grapes';
  let crop: string;
  if (picked >= store) crop = `The store is full of picked ${fruit}: nothing more is picked until carts take them away`;
  else if (rate === 0) crop = `Nobody tends the ${grove ? 'trees' : 'vines'} or picks the ${fruit} with nobody working here`;
  else {
    const stage = stageOf(g, MAKERS[g.kind]!);
    const look = grove
      ? stage < 2 ? 'the trees are in flower' : stage < 5 ? 'the olives are green on the trees' : 'the olives are ripening'
      : stage < 2 ? 'the vines are in leaf' : stage < 5 ? 'the grapes are small and green on the vines' : 'the grapes are ripening';
    crop = `${cap(look)} · picked in about ${days((grow - g.growth) / rate)}, about ${fmt(harvest)} measures${rate < 1 ? ' (later with fewer pickers)' : ''}`;
  }
  const inStore = `Picked: ${fmt(picked)} of ${fmt(store)} measures of ${fruit}`;
  const month = roundTen((harvest * TICKS_PER_MONTH) / grow);
  const yieldLine = rate > 0 ? `About ${fmt(month)} measures of ${fruit} a month fully worked: as many ${grove ? 'jars of oil once pressed' : 'amphorae of wine once trodden'}` : '';
  const cart = grove ? goodsCartLine(s, map, g, OLIVES, 'press', 'an olive press (M, five times)') : goodsCartLine(s, map, g, GRAPES, 'winery', 'a winery (M, eight times)');
  return { title, detail: lines(workersLine(s, map, g), crop, inStore, yieldLine, cart) };
}

/** An olive grove: its ground, its crop, its store of picked olives. */
export const groveStatus = (s: SimState, map: CoastMap, g: Building): Status => cropStatus(s, map, g);
/** A vineyard: its ground, its crop, its store of picked grapes. */
export const vineyardStatus = (s: SimState, map: CoastMap, g: Building): Status => cropStatus(s, map, g);

/** An olive press or a winery: what waits to be worked, what it has made, where it goes. */
function workshopStatus(s: SimState, map: CoastMap, p: Building): Status {
  const press = p.kind === 'press';
  const input = press ? OLIVES : GRAPES;
  const ware = press ? OIL : WINE;
  const raw = held(p, input);
  const made = held(p, ware);
  const store = storeOfKind(p.kind);
  const title = `${BUILDING_NAMES[p.kind as 'press' | 'winery']} · ${fmt(made)} of ${fmt(store)} ${unitOf(ware, 2)} of ${WARE_NAMES[ware]}`;
  if (roadsBeside(s, map.size, p).length === 0) return { title, detail: 'Needs a road beside it, for its workers and its carts' };
  const rate = rateOf(p);
  const fruit = WARE_NAMES[input];
  const from = press ? 'grove' : 'vineyard';
  const month = press ? OIL_MONTH : WINE_MONTH;
  let making: string;
  if (made >= store) making = `Its ${unitOf(ware, 2)} are all full: it ${press ? 'presses' : 'makes'} nothing more until carts take the ${WARE_NAMES[ware]} away`;
  else if (rate === 0) making = `Nothing is ${press ? 'pressed' : 'trodden'} with nobody working here`;
  else if (raw <= 0) {
    if (!s.buildings.some((g) => g.kind === from)) making = press ? 'It waits for olives: build an olive grove on the dry slopes (M, four times)' : 'It waits for grapes: plant a vineyard on a sunny slope (M, seven times)';
    else if (s.walkers.some((w) => w.kind === 'cart' && w.target === p.id)) making = `It waits for ${fruit}: a cart is on its way from a ${from}`;
    else making = `It waits for ${fruit}: the ${from}s’ next picking is still growing`;
  } else making = `${press ? 'Pressing' : 'Treading the grapes'}: about ${fmt(roundTen(month * rate))} ${unitOf(ware, 2)} of ${WARE_NAMES[ware]} a month while it has ${fruit}${rate < 1 ? ` (${fmt(month)} fully worked)` : ''}`;
  const bringing = coming(p, input);
  const inHand = `${cap(fruit)} waiting: ${fmt(raw)} of ${fmt(roomForWareKind(p.kind, input))} measures${bringing > 0 ? ` · carts are bringing ${fmt(bringing)} more` : ''}`;
  return { title, detail: lines(workersLine(s, map, p), making, inHand, goodsCartLine(s, map, p, ware, 'storehouse', 'a storehouse (G twice)')) };
}

/** An olive press: olives in hand, jars made, where its oil goes. */
export const pressStatus = (s: SimState, map: CoastMap, p: Building): Status => workshopStatus(s, map, p);
/** A winery: grapes in hand, amphorae made, where its wine goes. */
export const wineryStatus = (s: SimState, map: CoastMap, p: Building): Status => workshopStatus(s, map, p);

/** A sheep pasture: its grass, its flock's fleece, where it goes. */
export function pastureStatus(s: SimState, map: CoastMap, p: Building): Status {
  const grass = grassOf(map, p.x, p.z, 3);
  const bales = held(p, FLEECE);
  const title = `${BUILDING_NAMES.pasture} · ${fmt(bales)} of ${fmt(storeOfKind('pasture'))} bales of fleece`;
  if (roadsBeside(s, map.size, p).length === 0) return { title, detail: 'Needs a road beside it, for its shepherds and its carts' };
  const rate = rateOf(p);
  let making: string;
  if (bales >= storeOfKind('pasture')) making = 'The shed is full: nobody shears until carts take the fleece away';
  else if (rate === 0) making = 'No fleece is sheared with nobody to mind the sheep';
  else making = `Grass ${Math.round(grass * 100)}% · about ${fmt(roundTen(FLEECE_MONTH * grass * rate))} bales of fleece a month${rate < 1 ? ` (${fmt(roundTen(FLEECE_MONTH * grass))} fully worked)` : ''}`;
  return { title, detail: lines(workersLine(s, map, p), making, goodsCartLine(s, map, p, FLEECE, 'storehouse', 'a storehouse (G twice)')) };
}

/** A storehouse: what it holds, what carts are bringing, who fetches from it. */
export function storehouseStatus(s: SimState, map: CoastMap, g: Building): Status {
  const held_ = STALL_GOODS.filter((w) => held(g, w) > 0);
  const title = `${BUILDING_NAMES.storehouse} · ${held_.length ? held_.map((w) => `${fmt(held(g, w))} of ${fmt(roomForWareKind('storehouse', w))} ${unitOf(w, 2)} of ${WARE_NAMES[w]}`).join(' · ') : 'empty'}`;
  if (roadsBeside(s, map.size, g).length === 0) return { title, detail: 'Needs a road beside it, for carts and porters to reach it' };
  const rooms = `Holds ${STALL_GOODS.map((w) => `${fmt(roomForWareKind('storehouse', w))} ${unitOf(w, 2)} of ${WARE_NAMES[w]}`).join(', ').replace(/, ([^,]+)$/, ' and $1')}, each in its own room`;
  const bringing = STALL_GOODS.filter((w) => coming(g, w) > 0).map((w) => amount(w, coming(g, w)));
  const anyMaker = STALL_GOODS.some((w) => s.buildings.some((m) => MAKERS[m.kind]?.ware === w));
  const coming_ = bringing.length ? `Carts are bringing ${bringing.join(', ')} more` : !anyMaker ? 'Build an olive press, a sheep pasture or a winery (M): their carts bring their goods here' : '';
  const fullOf = STALL_GOODS.filter((w) => held(g, w) >= roomForWareKind('storehouse', w));
  const full = fullOf.length ? `Its ${fullOf.map((w) => WARE_NAMES[w]).join(' and ')} ${fullOf.length === 1 ? 'room is' : 'rooms are'} full: carts with more wait for room, and the makers fill their own stores` : '';
  const fetching = STALL_GOODS.map((w) => [w, s.walkers.filter((p) => p.kind === 'porter' && p.target === g.id && p.food === w).length] as const).filter(([, n]) => n > 0);
  const unsold = STALL_GOODS.filter((w) => held(g, w) > 0 && !citySells(s, w));
  const fetch = fetching.length
    ? fetching.map(([w, n]) => `${n === 1 ? 'A porter is' : `${n} porters are`} fetching ${WARE_NAMES[w]} from here for an agora’s ${WARE_NAMES[w]} stall`).join('\n')
    : unsold.length
      ? unsold.map((w) => `No agora has a ${STALL_NAMES[w]} to sell its ${WARE_NAMES[w]} yet: ${CHAINS[w]?.key ?? 'K'}, then click an agora`).join('\n')
      : '';
  const waiting = s.walkers.filter((w) => (w.kind === 'cart' || w.kind === 'porter') && w.target === g.id && w.wait > 0).length;
  const gate = waiting && g.workers === 0 ? `${waiting === 1 ? 'A cart is' : `${waiting} are`} waiting at the gate: nobody works here to take it in` : '';
  return { title, detail: lines(workersLine(s, map, g), rooms, coming_, full, fetch, gate) };
}

/** An agora's stall for a good: what it holds, its vendor, its porter ('' with no such stall). */
function stallLines(s: SimState, a: Building, good: Ware): string {
  if (!hasStall(a, good)) return '';
  const n = held(a, good);
  const what = WARE_NAMES[good];
  const units = unitOf(good, 2);
  const w = s.walkers.find((o) => o.kind === STALL_VENDOR[good] && o.origin === a.id);
  let vendor: string;
  const pro = sheHe(good);
  if (w) vendor = w.back ? `the ${what} vendor is heading back` : `the ${what} vendor is out, ${w.steps} of ${VENDOR_WALK} new road tiles into ${pro.her} round`;
  else if (a.workers === 0) vendor = `nobody works the agora, so the ${what} vendor can’t go out`;
  else if (n <= 0) vendor = `the ${what} vendor waits for ${what}`;
  else vendor = `the ${what} vendor is resting · ${pro.she} sets off again soon`;
  const p = s.walkers.find((o) => o.kind === 'porter' && o.origin === a.id && o.food === good);
  let porter = '';
  if (p) porter = p.back ? `Its porter is bringing ${fmt(p.load)} ${unitOf(good, p.load)} from the storehouse` : `Its porter is on his way to the storehouse for ${what}`;
  else if (!s.buildings.some((g) => g.kind === 'storehouse')) porter = `Build a storehouse (G twice): the ${what} stall’s porter fetches its ${units} from it`;
  else if (n <= stallLow(good) && !s.buildings.some((g) => g.kind === 'storehouse' && held(g, good) > 0)) porter = `Its porter waits: no storehouse has any ${what} yet`;
  return lines(`${cap(STALL_NAMES[good] ?? what)}: ${fmt(n)} of ${fmt(stallRoom(good))} ${units} · ${vendor}`, porter);
}

/** Why no stall good reaches a home: the first link of its chain that is missing. */
export function whyNoGood(s: SimState, map: CoastMap, b: Building, good: Ware): string {
  const chain = CHAINS[good];
  if (!chain) return '';
  const size = map.size;
  for (const l of chain.links) if (!s.buildings.some((o) => o.kind === l.kind)) return l.missing;
  const what = WARE_NAMES[good];
  const stallName = STALL_NAMES[good] ?? `${what} stall`;
  const stalls = s.buildings.filter((a) => hasStall(a, good));
  if (stalls.length === 0) return `no agora has a ${stallName} yet: press ${chain.key} and click an agora to add one`;
  if (roadsBeside(s, size, b).length === 0) return `the ${what} vendor only sells to homes beside the road ${sheHe(good).she} walks`;
  const d = stepsToFountain(roadSearch(s, size, stalls.flatMap((a) => roadsBeside(s, size, a))), s, size, b);
  if (d < 0) return `no road joins it to an agora with a ${stallName}`;
  if (d > VENDOR_RANGE) return `the nearest ${stallName} is ${d} steps away by road; its ${what} vendor goes ${VENDOR_RANGE} at most`;
  const reaching = stalls.filter((a) => roadsBeside(s, size, b).some((t) => distFrom(s, size, a)[t] >= 0 && distFrom(s, size, a)[t] <= VENDOR_RANGE));
  if (reaching.length && reaching.every((a) => a.workers === 0)) return `nobody works at the agora, so its ${what} vendor can’t go out`;
  if (reaching.every((a) => held(a, good) <= 0)) {
    if (s.buildings.some((g) => g.kind === 'storehouse' && held(g, good) > 0)) return `the ${stallName} is empty for now; its porter fetches ${unitOf(good, 2)} from the storehouse`;
    // The goods are on the way: the stall's porter bringing them, or the makers' carts taking them to a storehouse (an ox cart covers about a tile a day).
    if (s.walkers.some((w) => w.kind === 'porter' && w.food === good && w.load > 0 && reaching.some((a) => a.id === w.origin))) return `the ${stallName}’s porter is on his way back from the storehouse with ${unitOf(good, 2)} of ${what}`;
    if (s.walkers.some((w) => w.kind === 'cart' && w.food === good && w.load > 0 && !w.back)) return `no ${what} has reached a storehouse yet: the first ${unitOf(good, 2)} are on their way there by ox cart (slow: about a tile of road a day)`;
    return chain.stuck(s);
  }
  if (goodUntil(b, good) > 0) return `within reach of a ${stallName}, but the ${what} vendor has taken other turns lately`;
  return `within reach of a ${stallName}; the ${what} vendor hasn’t come this way yet`;
}

/** Why no oil reaches a cottage or better. */
export const whyNoOil = (s: SimState, map: CoastMap, b: Building): string => whyNoGood(s, map, b, OIL);

/** When the groves' (or vineyards') next crop is picked (" (the next picking is in about 20 days)"), or '' if none is being worked. */
function nextPicking(s: SimState, kind: 'grove' | 'vineyard'): string {
  const ware = kind === 'grove' ? OLIVES : GRAPES;
  const grow = kind === 'grove' ? OLIVE_GROW : VINE_GROW;
  let soonest = Infinity;
  for (const g of s.buildings) {
    if (g.kind !== kind || held(g, ware) >= storeOfKind(kind)) continue;
    const rate = rateOf(g);
    if (rate > 0) soonest = Math.min(soonest, (grow - g.growth) / rate);
  }
  if (s.walkers.some((w) => w.kind === 'cart' && w.food === ware && !w.back)) return ` (a cart of ${WARE_NAMES[ware]} is on its way to the ${kind === 'grove' ? 'press' : 'winery'})`;
  return soonest < Infinity ? ` (the next picking is in about ${days(soonest)})` : '';
}

/**
 * A home's supply of a stall good, for the level that likes it and those
 * that need it ('' below that, and for the level that likes it while the city
 * has no stall for it and it has none).
 */
export function goodLine(s: SimState, map: CoastMap, b: Building, good: Ware): string {
  const need = GOOD_SERVICE[good];
  if (!need || b.kind !== 'home' || b.people === 0) return '';
  const at = levelNeeding(need);
  if (b.level < at - 1) return '';
  const what = WARE_NAMES[good];
  const until = goodUntil(b, good);
  const left = until - s.tick;
  const needs = b.level >= at;
  if (left > 0) {
    const grow = !needs && left < RISE_MIN ? ` · ${levelName(at)} needs a month’s ${what} in hand` : '';
    return `${cap(what)} · lasts ${days(left)} more unless the ${what} vendor comes by again${grow}`;
  }
  if (needs) {
    const since = missingSince(b, need);
    // (A home from an older save, in its grace, isn't counting yet.)
    if (since > s.tick) return `No ${what} yet · they’ll put up with it for ${days(since - s.tick)} more: ${whyNoGood(s, map, b, good)}`;
    const goes = DECLINE_AFTER - (s.tick - since);
    return `No ${what} for ${days(s.tick - since)} · goes back to ${levelName(b.level - 1)} in ${days(goes)} unless the ${what} vendor comes: ${whyNoGood(s, map, b, good)}`;
  }
  if (!citySells(s, good)) return '';
  return `No ${what} · ${whyNoGood(s, map, b, good)}`;
}

/** A home's oil, for cottages and better. */
export const oilLine = (s: SimState, map: CoastMap, b: Building): string => goodLine(s, map, b, OIL);

/** A calm line about something the town is short of, for the strip under the top bar, and the building it is about (0 for none). */
export interface TownLine {
  need: 'fire' | 'wear' | 'rubble' | 'food' | 'oil' | 'fleece' | 'wine' | 'workers' | 'money' | 'tax' | 'ship';
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

/** Workers with no road to the jobs left, before the workers line names them rather than asking for more homes. */
const IDLE_WORDS = 4;

/**
 * What the town is short of, in a line each, readable without hovering: bread
 * (the farms growing less than the town eats, once there is a farm or an
 * agora, and the stores running out within BREAD_LEAD_MONTHS; or homes
 * already warning about bread while the farms grow less than a tenth more
 * than the town eats) and workers (jobs unfilled). Empty when all is well.
 */
export function townLines(s: SimState, map: CoastMap): TownLine[] {
  const out: TownLine[] = hazardTownLines(s, map);
  const ship = shipTownLine(s);
  if (ship) out.unshift(ship);
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
  for (const good of STALL_GOODS) {
    const line = goodTownLine(s, map, good);
    if (line) out.push(line);
  }
  const wf = workforce(s);
  const { able } = wf;
  // A workplace built since workers were last shared out (once a day) hasn't had its chance yet.
  const waiting = wf.short.filter((b) => b.workers === 0 && s.tick - b.placed <= TICKS_PER_DAY);
  const short = wf.short.filter((b) => !waiting.includes(b));
  const jobs = wf.jobs - waiting.reduce((n, b) => n + jobsAt(b), 0);
  const filled = wf.filled;
  if (filled < jobs && short.length) {
    const open = jobs - filled;
    const first = short[0];
    const name = (BUILDING_NAMES[first.kind as Exclude<BuildingKind, 'home'>] ?? 'A workplace').replace(/^A /, 'the ').replace(/^The /, 'the ');
    const others = short.length > 1 ? ` (and ${short.length - 1} more ${short.length === 2 ? 'place' : 'places'})` : '';
    // Workers left over once every workplace a road joins them to is full: their streets don't reach the jobs.
    const idle = able - filled;
    const fix =
      roadsBeside(s, map.size, first).length === 0
        ? 'It has no road beside it, so nobody can get there: lay one along a side.'
        : idle >= IDLE_WORDS
          ? `${idle} people who could work have no road to the jobs left: join their streets to them.`
          : able < jobs
          ? `${able} people can work for ${jobs} jobs: more homes would help.`
          : 'More homes near it by road would help.';
    out.push({ need: 'workers', text: `Workers: ${open} ${open === 1 ? 'job' : 'jobs'} unfilled. ${name[0].toUpperCase()}${name.slice(1)} has ${first.workers} of ${jobsAt(first)}${others}. ${fix}`, at: first.id });
  }
  const money = moneyLine(s);
  if (money) out.push(money);
  const harsh = harshLine(s);
  if (harsh) out.push(harsh);
  return out;
}

/** While taxes are harsh: households leaving and newcomers staying away (null otherwise). */
export function harshLine(s: SimState): TownLine | null {
  if (s.taxRate !== HARSH) return null;
  const gone = goneForTaxes(s, 3 * TICKS_PER_MONTH);
  const office = s.buildings.find((b) => b.kind === 'taxoffice');
  const went = gone === 0 ? 'households the collectors call on are starting to think of leaving' : `${gone === 1 ? 'a household has' : `${fmt(gone)} households have`} left the city for them in the last three months`;
  return { need: 'tax', text: `Taxes are harsh: ${went}, and newcomers stay away. Lower taxes (the rate by the drachmas) would bring people back.`, at: office?.id ?? 0 };
}

/**
 * A stall good: homes warning for want of it, and the first link of its
 * chain that is missing (as whyNoGood says it for the first of them),
 * pointing at the first maker short of workers, or the first home.
 */
function goodTownLine(s: SimState, map: CoastMap, good: Ware): TownLine | null {
  const need = GOOD_SERVICE[good];
  const chain = CHAINS[good];
  if (!need || !chain) return null;
  let short = 0;
  let first: Building | null = null;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || !warningsOf(s, b).some((w) => w.need === need)) continue;
    if (!first) first = b;
    short++;
  }
  if (!first) return null;
  const why = whyNoGood(s, map, first, good);
  const going = `${short === 1 ? `${levelName(first.level)} is` : `${fmt(short)} homes are`} going without (${chain.needers})`;
  const makers: BuildingKind[] = chain.links.map((l) => l.kind).filter((k) => k !== 'storehouse');
  const slow = s.buildings.find((b) => makers.includes(b.kind) && rateOf(b) < 1);
  const more = slow ? ` ${cap((BUILDING_NAMES[slow.kind as Exclude<BuildingKind, 'home'>] ?? 'A workplace').replace(/^An? /, 'the '))} is short of workers (${slow.workers} of ${jobsAt(slow)}).` : '';
  return { need: need as TownLine['need'], text: `${cap(WARE_NAMES[good])}: ${going}: ${why}.${more}`, at: slow?.id ?? first.id };
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
      text: `Money: the treasury can’t pay this month’s wages at ${where} (${fmt(owed.owed)} dr for ${fmt(owed.workers)} workers), so they work at half pace. Money coming in pays them first${!hasTaxOffice(s) ? '; build a tax office, which the treasury has kept back the cost of' : s.taxRate === 0 ? '; taxes are set to none, so the collectors bring nothing in' : unreached(s) > 0 ? `; ${fmt(unreached(s))} ${unreached(s) === 1 ? 'home' : 'homes'} no tax collector calls on: while wages are owed, another tax office beside them (Z) costs no more than the treasury holds` : '; higher taxes would help'}.`,
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

/** Lived-in homes no tax collector has called on in two months (the tax overlay's posts). */
function unreached(s: SimState): number {
  let n = 0;
  for (const b of s.buildings) if (b.kind === 'home' && b.people > 0 && s.tick - b.since >= 2 * TICKS_PER_MONTH && !(b.taxedAt > 0 && s.tick - b.taxedAt < 2 * TICKS_PER_MONTH)) n++;
  return n;
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

// ---------------------------------------------------------------------------
// Fire and collapse: the risk and wear lines on every building's tip, the
// watch post and the architect's office, and rubble.

/** "the fine house", "the granary": a building in a few words, for a walker's tip. */
export function placeName(b: Building): string {
  if (b.kind === 'home') return `the ${levelName(b.level, '').toLowerCase()}${b.family ? ` of ${b.family.name}` : ''}`;
  return BUILDING_NAMES[b.kind].replace(/^An? /, 'the ').replace(/^The /, 'the ');
}

/** What each guarding service is called. */
const GUARD = {
  watchpost: { walker: 'watchman', he: 'he', range: WATCH_RANGE, key: 'Z twice', what: 'watch post', a: 'a watch post' },
  architect: { walker: 'inspector', he: 'she', range: INSPECT_RANGE, key: 'Z three times', what: 'architect’s office', a: 'an architect’s office' },
} as const;

/** Why no watchman (or inspector) comes by a building. */
export function whyUnguarded(s: SimState, map: CoastMap, b: Building, kind: 'watchpost' | 'architect'): string {
  const g = GUARD[kind];
  const size = map.size;
  const places = s.buildings.filter((o) => o.kind === kind);
  if (places.length === 0) return `no ${g.what} in the city: build one beside a road nearby (${g.key})`;
  const beside = roadsBeside(s, size, b);
  if (beside.length === 0) return `the ${g.walker} only looks after buildings beside the road ${g.he} walks`;
  const d = stepsToFountain(roadSearch(s, size, places.flatMap((o) => roadsBeside(s, size, o))), s, size, b);
  if (d < 0) return `no road joins it to ${g.a}: build one nearby (${g.key})`;
  if (d > g.range) return `the nearest ${g.what} is ${d} steps away by road; its ${g.walker} goes ${g.range} at most: build one nearer (${g.key})`;
  const reaching = places.filter((o) => beside.some((t) => distFrom(s, size, o)[t] >= 0 && distFrom(s, size, o)[t] <= g.range));
  if (reaching.length && reaching.every((o) => o.workers === 0)) return `nobody works at the ${g.what}, so its ${g.walker} can’t go out`;
  return `within reach of ${g.a}; its ${g.walker} comes by now and then`;
}

/** Whether a watch post's watchman (an architect's inspector) can reach this building and goes out. */
function guarded(s: SimState, map: CoastMap, b: Building, kind: 'watchpost' | 'architect'): boolean {
  return whyUnguarded(s, map, b, kind).startsWith('within reach');
}

/** "about 4 months", "12 days". */
const inDays = (n: number): string => (n > 60 ? `about ${Math.round(n / DAYS_PER_MONTH)} months` : n <= 1 ? '1 day' : `${n} days`);

/**
 * A building's fire and wear, for its tip: smouldering, burning or creaking
 * with the days left and who can stop it; or how far its risk and wear have
 * filled (from a quarter up), when it would smoulder or creak, and whether a
 * watchman or an inspector comes by to reset them.
 */
export function hazardLines(s: SimState, map: CoastMap, b: Building): string[] {
  const out: string[] = [];
  if (!s.hazards && b.risk === 0 && b.wear === 0) return out;
  const left = (t: number): string => days(Math.max(1, t - s.tick));
  if (b.fire === FIRE_BURNING) {
    const fighting = s.walkers.some((w) => w.kind === 'watchman' && w.target === b.id);
    out.push(`On fire · it burns down in ${left(b.fireAt)} · ${fighting ? 'a watchman is on his way or at it with his bucket' : 'no watchman has seen it: one within sight of it runs to put it out'} · it can spread to the buildings beside it`);
  } else if (b.fire === FIRE_SMOULDER) {
    out.push(`Smouldering · it bursts into flame in ${left(b.fireAt)} unless a watchman walks by · ${whyUnguarded(s, map, b, 'watchpost')}`);
  } else if (burnable(b) && b.risk >= HAZARD_FULL / 4) {
    const pct = Math.round((b.risk / HAZARD_FULL) * 100);
    const when = inDays(daysToFull(b.risk, riskRate(s, b)));
    const why = guarded(s, map, b, 'watchpost') ? 'its watchman resets it when he passes' : whyUnguarded(s, map, b, 'watchpost');
    out.push(`Fire risk ${pct}% · smoulders in ${when} · ${why}`);
  }
  if (b.creakAt > 0) {
    out.push(`Creaking · it falls down in ${left(b.creakAt)} unless an inspector walks by · ${whyUnguarded(s, map, b, 'architect')}`);
  } else if (wears(b) && b.wear >= HAZARD_FULL / 4) {
    const pct = Math.round((b.wear / HAZARD_FULL) * 100);
    const when = inDays(daysToFull(b.wear, wearRate(s, b)));
    const why = guarded(s, map, b, 'architect') ? 'its inspector makes it sound when she passes' : whyUnguarded(s, map, b, 'architect');
    out.push(`Wear ${pct}% · starts to creak in ${when} · ${why}`);
  }
  return out;
}

/** A watch post or an architect's office: its walker and what it guards against. */
export function postStatus(s: SimState, map: CoastMap, b: Building): Status {
  const kind = b.kind as 'watchpost' | 'architect';
  const g = GUARD[kind];
  const title = BUILDING_NAMES[kind];
  const The = `The ${g.walker}`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: `Needs a road beside it, for the ${g.walker} to walk` };
  const w = s.walkers.find((o) => o.id === b.walker);
  const walk = kind === 'watchpost' ? WATCH_WALK : INSPECT_WALK;
  let line: string;
  if (w && kind === 'watchpost' && w.target > 0) {
    const f = findBuilding(s, w.target);
    line = f ? `${The} is ${w.wait > 0 ? 'fighting' : 'running to'} the fire at ${placeName(f)}` : `${The} is out`;
  } else if (w) line = w.back ? `${The} is heading back` : `${The} is out, ${w.steps} of ${walk} new road tiles into ${g.he === 'he' ? 'his' : 'her'} round`;
  else if (b.workers === 0) line = `${The} can’t go out with nobody working the ${g.what}`;
  else line = `${The} is resting · ${g.he} sets off again soon`;
  const what =
    kind === 'watchpost'
      ? `Every building beside the watchman’s way is made safe from fire, a smoulder put out; he goes ${WATCH_RANGE} steps by road at most, and runs to any flames he sees`
      : `Every building beside the inspector’s way is made sound, a creak stopped before it falls; she goes ${INSPECT_RANGE} steps by road at most`;
  const kinds = s.buildings.filter((o) => (kind === 'watchpost' ? o.fire > 0 : o.creakAt > 0));
  const news = kinds.length ? (kind === 'watchpost' ? `${kinds.length === 1 ? 'One building is' : `${kinds.length} buildings are`} smouldering or burning in the city` : `${kinds.length === 1 ? 'One building is' : `${kinds.length} buildings are`} creaking in the city`) : '';
  return { title, detail: lines(workersLine(s, map, b), line, what, news) };
}

/** Rubble: what stood there, how it ended, and what clearing it costs. */
export function rubbleStatus(_s: SimState, b: Building): Status {
  const was = b.was && b.was !== 'home' ? BUILDING_NAMES[b.was].replace(/^An? /, 'a ').replace(/^The /, 'the ') : 'a building';
  const was_ = b.was === 'home' ? (b.ruin ? `the house of ${b.ruin}` : 'a home') : was;
  const how = b.level === BURNT ? 'Burnt down' : 'Fallen down';
  const fee = clearFee(footSide(b));
  return { title: `Rubble · ${how.toLowerCase()}`, detail: lines(`${how}: ${was_} stood here`, `Clear it with the clear tool (X) for ${fee} dr before anything can be built here again`) };
}

/** Fire or wear past this share shows on the town lines (where no watchman or inspector reaches). */
const EARLY_WARN = 0.75;
/** Rubble shows on the town lines for this long after the fall. */
const RUBBLE_NEWS = 2 * TICKS_PER_MONTH;

/** "By the olive grove": where a building stands, for the start of a town line. */
const whereIs = (map: CoastMap, b: Building): string => {
  const h = footSide(b) / 2;
  return districtTitle(districtAt(map, b.x + h, b.z + h));
};

/** The road search out from every staffed watch post (architect's office), for whether a building is in reach; null if none. */
function guardSearch(s: SimState, size: number, kind: 'watchpost' | 'architect'): Search | null {
  const roads = s.buildings.filter((o) => o.kind === kind && o.workers > 0).flatMap((o) => roadsBeside(s, size, o));
  return roads.length ? roadSearch(s, size, roads) : null;
}

const inReach = (search: Search | null, s: SimState, size: number, b: Building, range: number): boolean => {
  if (!search) return false;
  const d = stepsToFountain(search, s, size, b);
  return d >= 0 && d <= range;
};

/** "the fine house of the Kallias family", "the granary". */
const named = (b: Building): string => placeName(b);

/**
 * The fire, wear and rubble lines: a building burning (the most urgent:
 * it falls within days and can spread), else one smouldering, else
 * buildings past three-quarters of their fire risk that no watchman
 * reaches; the same for creaking and wear; and rubble lately fallen,
 * waiting to be cleared. Each names the place.
 */
export function hazardTownLines(s: SimState, map: CoastMap): TownLine[] {
  const out: TownLine[] = [];
  const size = map.size;
  const left = (t: number): string => days(Math.max(1, t - s.tick));
  const more = (n: number, what: string): string => (n > 1 ? ` (and ${n - 1} more ${what})` : '');
  const byTime = (a: Building, b: Building, t: (x: Building) => number): number => t(a) - t(b) || a.id - b.id;
  // Fire.
  const fires = s.buildings.filter((b) => b.fire === FIRE_BURNING).sort((a, b) => byTime(a, b, (x) => x.fireAt));
  const smoulders = s.buildings.filter((b) => b.fire === FIRE_SMOULDER).sort((a, b) => byTime(a, b, (x) => x.fireAt));
  if (fires.length) {
    const f = fires[0];
    const coming = s.walkers.some((w) => w.kind === 'watchman' && w.target === f.id);
    const help = coming ? 'A watchman is on his way with his bucket.' : 'No watchman has seen it: a watch post (Z twice) within sight of it sends one running.';
    out.push({ need: 'fire', text: `Fire ${whereIs(map, f).toLowerCase()}: ${named(f)} is burning and falls in ${left(f.fireAt)}; it can spread to the buildings beside it${more(fires.length, fires.length === 2 ? 'fire' : 'fires')}. ${help}`, at: f.id });
  } else if (smoulders.length) {
    const f = smoulders[0];
    out.push({ need: 'fire', text: `Smoke ${whereIs(map, f).toLowerCase()}: ${named(f)} is smouldering and bursts into flame in ${left(f.fireAt)} unless a watchman walks by: ${whyUnguarded(s, map, f, 'watchpost')}${more(smoulders.length, smoulders.length === 2 ? 'smoulder' : 'smoulders')}.`, at: f.id });
  } else if (s.hazards) {
    const posts = guardSearch(s, size, 'watchpost');
    const risky = s.buildings.filter((b) => burnable(b) && b.risk >= HAZARD_FULL * EARLY_WARN && !inReach(posts, s, size, b, WATCH_RANGE)).sort((a, b) => b.risk - a.risk || a.id - b.id);
    if (risky.length) {
      const f = risky[0];
      const n = risky.length === 1 ? `${named(f)} is` : `${risky.length} buildings are`;
      out.push({ need: 'fire', text: `Fire risk ${whereIs(map, f).toLowerCase()}: ${n} three-quarters of the way to smouldering, and no watchman walks by: ${whyUnguarded(s, map, f, 'watchpost')}.`, at: f.id });
    }
  }
  // Wear.
  const creaks = s.buildings.filter((b) => b.creakAt > 0).sort((a, b) => byTime(a, b, (x) => x.creakAt));
  if (creaks.length) {
    const c = creaks[0];
    out.push({ need: 'wear', text: `Creaking ${whereIs(map, c).toLowerCase()}: ${named(c)} falls down in ${left(c.creakAt)} unless an inspector walks by: ${whyUnguarded(s, map, c, 'architect')}${more(creaks.length, 'creaking')}.`, at: c.id });
  } else if (s.hazards) {
    const offices = guardSearch(s, size, 'architect');
    const worn = s.buildings.filter((b) => wears(b) && b.wear >= HAZARD_FULL * EARLY_WARN && !inReach(offices, s, size, b, INSPECT_RANGE)).sort((a, b) => b.wear - a.wear || a.id - b.id);
    if (worn.length) {
      const c = worn[0];
      const n = worn.length === 1 ? `${named(c)} is` : `${worn.length} buildings are`;
      out.push({ need: 'wear', text: `Wear ${whereIs(map, c).toLowerCase()}: ${n} three-quarters worn, and no inspector walks by: ${whyUnguarded(s, map, c, 'architect')}.`, at: c.id });
    }
  }
  // Rubble lately fallen.
  const heaps = s.buildings.filter((b) => b.kind === 'rubble' && s.tick - b.placed < RUBBLE_NEWS).sort((a, b) => b.placed - a.placed || a.id - b.id);
  if (heaps.length) {
    const r = heaps[0];
    const what = r.was === 'home' ? (r.ruin ? `the house of ${r.ruin}` : 'a home') : r.was ? BUILDING_NAMES[r.was].replace(/^An? /, 'a ').replace(/^The /, 'the ') : 'a building';
    const gone = r.was === 'home' && r.ruin ? ` ${r.ruin}’s household has left the city.` : '';
    const n = heaps.length === 1 ? `${what} ${r.level === BURNT ? 'burnt down' : 'fell down'}` : `${heaps.length} buildings have ${heaps.every((h) => h.level === BURNT) ? 'burnt down' : 'burnt or fallen down'} lately, ${what} last`;
    out.push({ need: 'rubble', text: `Rubble ${whereIs(map, r).toLowerCase()}: ${n}.${gone} Clear ${heaps.length === 1 ? 'it' : 'them'} with the clear tool (X), ${clearFee(2)}–${clearFee(3)} dr a heap, before building there again.`, at: r.id });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The trading post (slice 13).

/** The trading post: what waits on the quay and what it would fetch, the ship's schedule, the dockers. */
export function tradingStatus(s: SimState, map: CoastMap, b: Building): Status {
  const quay = TRADE_GOODS.map((w) => held(b, w));
  const worth = quayWorth(s, b);
  const title = `${BUILDING_NAMES.trading} · ${quay.some((n) => n > 0) ? `on the quay: ${goodsList(quay)}${worth > 0 ? ` (${fmt(worth)} dr at the ship’s prices)` : ''}` : 'the quay is empty'}`;
  const ship = shipNews(s);
  return { title, detail: lines(workersLine(s, map, b), ship?.line ?? '', dockerNews(s, map, b), 'Click for the trade panel: what to sell and how much the city keeps') };
}

/** The ship's news while she is in sight (sailing in, or tied up loading): the line under the top bar. */
function shipTownLine(s: SimState): TownLine | null {
  const ship = s.trade.ship;
  const post = s.buildings.find((b) => b.kind === 'trading');
  // For a month after the post went with goods on its quay (and until another is built): what was lost.
  const t = s.trade;
  if (!post && t.lostAt > 0 && s.tick - t.lostAt < TICKS_PER_MONTH && t.lost.some((n) => n > 0)) {
    const worth = t.lost.reduce((dr, n, k) => dr + priceFor(k, n), 0);
    return { need: 'ship', text: `The trading post is gone, and the goods waiting on its quay with it: ${goodsList(t.lost)}, worth about ${fmt(worth)} dr at the ship’s prices. A new post on the bay shore starts with an empty quay.`, at: 0 };
  }
  if (!post || (ship.phase !== SHIP_COMING && ship.phase !== SHIP_MOORED)) return null;
  const news = shipNews(s);
  if (!news) return null;
  const quay = TRADE_GOODS.map((w) => held(post, w));
  const worth = quayWorth(s, post);
  const waiting = quay.some((n) => n > 0) ? ` On the quay: ${goodsList(quay)}${worth > 0 ? `, worth ${fmt(worth)} dr` : ''}.` : ' The quay is empty.';
  const inDays = news.days === 1 ? '1 day' : `${news.days} days`;
  const text = ship.phase === SHIP_COMING ? `${news.short.startsWith('Sailing in') ? 'The merchant ship is sailing into the bay: she' : 'A sail on the horizon: the merchant ship'} ties up at the trading post in ${inDays}.${waiting}` : `The merchant ship is tied up at the trading post, loading.${waiting}`;
  return { need: 'ship', text, at: post.id };
}
