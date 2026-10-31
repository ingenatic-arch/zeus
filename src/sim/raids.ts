/**
 * Threats and raiders: what a furious ruler does about it, telegraphed in
 * three steps.
 *
 * - **A threat.** A tribute refused (or let run out) by a ruler who was
 *   already cold (favours.ts: `angered`), or now and then a hostile ruler who
 *   is proud or warlike, threatens your city: a price of peace (coin, or
 *   goods they are short of) by a deadline, at least two months off, and
 *   never so soon that raiders could reach you within a year of your first
 *   route. Paying (or sending the goods) in time ends it; refusing brings
 *   the raiders at once.
 * - **The band.** If nothing comes by the day, a war band of eight to twelve
 *   gathers at their city for ten days, then marches on yours along the road
 *   (Troy's sails the lane), its place on the map of Greece a pure function
 *   of the tick, and a chip counts the days.
 * - **On your map** (slice 24: loot, burn, then leave). It comes in at the
 *   edge nearest their city, at the open tile nearest its first target: the
 *   store nearest that edge worth the trouble (a granary or a storehouse with
 *   300 or more in it), then the tax office, where the treasury is kept (with
 *   neither, the field nearest the edge, as in phase 3). It crosses the land
 *   as a hunter does (roads and open ground, round buildings), spends a few
 *   days at each (a store plundered, up to 80 a man and never more than half
 *   of it; up to a tenth of the treasury from the tax office; a field set
 *   alight and its barn emptied), sets a few buildings alight on its way
 *   (houses too, through the fire code), and walks off the way it came.
 *   Walkers near it run indoors. Its men fight whoever stands in their way,
 *   man by man (battle.ts); while they fight the band waits, and a band that
 *   loses half its men breaks and runs for the edge.
 * - **Its size.** Eight to twelve men, and more the bigger your city and the
 *   stronger their city (Sparta most): a big city can face forty or more.
 * - **Stopping them.** Paying in coin while the band is out pays at once and
 *   turns it round wherever it is; goods count when they reach their city;
 *   anything that lifts the ruler's mood past cold calls it off.
 * - **Afterwards.** The anger is partly spent (a memory), and a lull: no
 *   threat from that ruler for a year, and none from anyone for three months.
 *
 * - **A lender's army** (slice 28, `raid.loan`): step 3 of a debt you have
 *   not repaid (loans.ts). Its threat asks what is left owed, in coin, within
 *   a month; paying it repays the loan. Its army is half again a band's size,
 *   no mood calls it off, it sets nothing alight, and it takes up to 80 a man
 *   of goods and 60 dr a man from the treasury (up to half of it), never more
 *   in all than what is owed; what it carries off is taken off the debt.
 *
 * One threat (or band) at a time across Greece; while one is live no ruler
 * makes a new request, offer or demand (favours.ts). Nothing here runs in a
 * town that has never opened a route. What is random is a hash of Greece's
 * seed and the month or the raid's number. Pure.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { EDGE_ALONG, HORIZON_ALONG, PLACES, RULED, type CityId, CITY_IDS } from '../map/greece';
import { hash2 } from '../map/noise';
import { around, centreOf, findBuilding } from './buildings';
import { dateOfTick, formatYear, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { dispatch, fairGift, giftMemory, giftWay, giftWords, news, settleMood, wayFor } from './diplomacy';
import { answerMemory, deadlineFor, firstRoute, sendTicks, makeDeal, ASK_AFTER } from './favours';
import { FLEECE, held, OLIVES, setHeld, WARE_NAMES, WARES, WHEAT, type Ware } from './foods';
import { burnable, FIRE_BURNING, ignite } from './hazards';
import { overland } from './roads';
import { landTicks, routeWay, voyageTicks } from './routes';
import { collectorsGone, loanOf, payDebt } from './loans';
import type { Building, BuildingKind, Deal, Gift, Loan, Raid, SimState, Walker, World, WorldCity } from './state';
// Slice 38: the ship a band lands from.
import type { EnemyShip } from './state';
import { note } from './stockbook';
import { berthOf, cityHolds, OLD_GOODS, TRADE_GOODS, tradeIndex } from './trade';
import { pay, spendable } from './treasury';
import { newWalker, offMapPoint, position, setPath, WALK_SPEED } from './walk';
import { lineClear, offRoadPath, prunePath, walkable } from './wild';
import { barsFoe, foeToll, foeWalkable, wallAt } from './walls';
import { districtAt, districtTitle } from '../map/districts';
import { armyScale, cityOf, COLD, HOSTILE, moodOf, rulerName, rulerShort, sellsAndBuys } from './world';
import { armyNews } from './army';
import { daysToBeach, embark, onWater, sailIn, seaOf, seaborne, shipsFor, shipsOf } from './fleet';
import { isStore, roomFor } from './stores';
import { income } from './treasury';
// Slice 33: winter keeps most armies home.
import { armiesHome } from './seasons';
// Slice 34.
import { boundTo } from './vassals';
// Slice 55.
import { monstersAbout } from './monsters';
// Slice 60: the god who marches with a band.
import { marchWords } from './godwar';

// ---------------------------------------------------------------------------
// The numbers.

/** A threat's deadline, at the least (longer if goods would take longer to send). */
export const THREAT_DAYS = 2 * TICKS_PER_MONTH;
/** How long the band gathers at their city before it marches. */
export const GATHER = 10 * TICKS_PER_DAY;
/** A war band on the road is a little slower than a trader's caravan. */
const MARCH_SLOWER = 1.2;
/** After a band paid off or called off: no threat from that ruler for a year, and none from anyone for three months. */
export const LULL = TICKS_PER_YEAR;
/** After a raid that came, the anger spent: none from that ruler for two years (slice 22: a ruler kept hostile raided every eighteen months, and a town left to itself lost every field it had in four years). */
export const RAID_LULL = 2 * TICKS_PER_YEAR;
const GREECE_LULL = 3 * TICKS_PER_MONTH;
/** How long a ruler's last raid or band holds them back. */
const lullOf = (r: Raid): number => (r.end === 'raided' || r.end === 'nothing' || r.end === 'sunk' ? RAID_LULL : LULL);
/** A hostile, proud or warlike ruler threatens about one month in eight. */
const HOSTILE_ODDS = 1 / 8;
/** (Slice 31, Oliver's balance card: raids about twice as often.) A ruler only cold towards you, proud or warlike, threatens too, about one month in a hundred and twenty; bolder with an army grown past its usual size, less so with one shrunk (half to half again as often). What a probe of nine years of a middling player found is in the slice 31 plan's As built. */
const COLD_ODDS = 1 / 120;
/** A tribute marked angry still gets its threat for this long after it was refused (if another threat held it back). */
const ANGRY_FOR = TICKS_PER_YEAR;
/** The price of peace: this much of a fair gift for your size, in coin (300 to 2,500 dr), or goods worth the same. */
const PEACE_VALUE = 1.2;
const PEACE_LEAST = 300;
const PEACE_MOST = 2500;
/** A band is 8 to 12 men, and more for a bigger city: a man for every 60 people past the first 400, times their city's strength; 48 at the most. */
const MEN_LEAST = 8;
const MEN_MOST = 12;
const MEN_CAP = 48;
const MEN_PER = 60;
const MEN_FROM = 400;
export const STRENGTH: Record<CityId, number> = { home: 1, athens: 1.1, corinth: 0.8, sparta: 1.4, troy: 1, tyre: 1, thebes: 1.2, argos: 0.7, knossos: 0.9, rhodes: 0.8, memphis: 1 };
/** The band a city sends against yours, for its size: the dice's 8 to 12, and the rest from your size and their strength (slice 31: with their army as it is now against its usual size, growth.ts). */
export function bandSize(s: SimState, city: CityId, roll: number): number {
  const base = MEN_LEAST + Math.floor(roll * (MEN_MOST - MEN_LEAST + 1));
  return Math.min(MEN_CAP, base + Math.round((Math.max(0, s.population - MEN_FROM) / MEN_PER) * (STRENGTH[city] ?? 1) * armyScale(cityOf(s.world, city))));
}
/** A lender's army (slice 28): half again a band's size, at least 14 men, at most 60. */
const DEBT_MEN = 1.5;
const DEBT_LEAST = 14;
const DEBT_MOST = 60;
export const debtBand = (s: SimState, city: CityId, roll: number): number => Math.min(DEBT_MOST, Math.max(DEBT_LEAST, Math.round(bandSize(s, city, roll) * DEBT_MEN)));
/** A lender's threat gives a month to pay what is left. */
export const DEBT_DAYS = TICKS_PER_MONTH;
/** What a lender's army carries off from the treasury: up to 60 dr a man, and up to half of it. */
const DEBT_COIN_CARRY = 60;
const DEBT_COIN_SHARE = 0.5;
/** They cross your land at a run. */
export const RAID_SPEED = WALK_SPEED * 1.6;
/** How long they spend at each target (firing it, and loading up): long enough to see them there, and to pay them off before they take anything. */
export const AT_TARGET = 4 * TICKS_PER_DAY;
/** What each man carries off, at most; never more than half of what a store holds. */
const CARRY = 80;
/** What each man carries off from the tax office, at most, and never more than a tenth of the treasury. */
const COIN_CARRY = 40;
const COIN_SHARE = 0.1;
/** The buildings they set alight on their way (one at most on the way in, the rest going out): one, and one more for every twelve men, four at most; once a day near one, about two days in five. */
const FIRES_LEAST = 1;
const FIRES_PER = 12;
const FIRES_MOST = 4;
const TORCH_ODDS = 0.4;
/** How near their way (tiles, from a building's edge) a building must be for them to set it alight. */
const TORCH_REACH = 1.6;
/** A store is worth raiding with this much in it. */
const STORE_WORTH = 300;
/** Walkers this close (tiles) to the band run indoors. */
export const SHELTER = 6;
/** How many of the targets nearest the edge they try a way to. */
const TRIES = 4;

/** The fields they set alight, and what each keeps in its barn; the stores they plunder. */
const FIELDS: Partial<Record<BuildingKind, Ware>> = { farm: WHEAT, grove: OLIVES, pasture: FLEECE };
const STORES: readonly BuildingKind[] = ['granary', 'storehouse'];

/** The edge of your map nearest each city: where its band comes in (Troy's lands beyond the eastern hills). */
export const RAID_SIDE: Record<CityId, 'north' | 'west' | 'east' | 'south'> = { home: 'north', athens: 'north', corinth: 'north', sparta: 'west', troy: 'east', tyre: 'east', thebes: 'north', argos: 'west', knossos: 'east', rhodes: 'east', memphis: 'east' };

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** "the king", "the queen", "the archon", "the lord". */
export const rulerWord = (c: WorldCity): string => (c.ruler?.female ? 'the queen' : c.ruler?.title.startsWith('King') ? 'the king' : c.ruler?.title.startsWith('Archon') ? 'the archon' : 'the lord');
const his = (c: WorldCity): string => (c.ruler?.female ? 'her' : 'his');

// ---------------------------------------------------------------------------
// Looking raids up.

/** A raid by its threat's deal. */
export const raidOf = (w: World, deal: number): Raid | undefined => w.raids.find((r) => r.deal === deal);
/** Is a raid live: a threat standing, or its band out and not yet settled? */
export const live = (r: Raid): boolean => r.ended === 0;
/** The live threat or band, if any (one at a time). */
export const liveRaid = (w: World): Raid | undefined => w.raids.find(live);
/** A band on the move or in your city (gathering, marching, raiding), settled or not. */
export const bandOut = (r: Raid): boolean => r.phase === 'gathering' || r.phase === 'marching' || r.phase === 'raiding';
/** Is a threat or a band live anywhere in Greece? */
export const threatLive = (w: World): boolean => w.raids.some(live);

/** Greece's dice for a month (or a raid) and a purpose. */
const dice = (w: World, n: number, i: number, salt: number): number => hash2(n, i * 41 + salt, (w.seed ^ 0x72616964) | 0);

/** How long a city's band takes on the map, from their city to your edge (or, by sea, your gulf). */
export function marchTicks(city: CityId, by: 'land' | 'sea' = routeWay(city, 'land') ? 'land' : 'sea'): number {
  return by === 'land' && routeWay(city, 'land') ? Math.round(landTicks(city) * MARCH_SLOWER) : voyageTicks(city);
}

/**
 * How a city's band comes (slice 26): by sea from a city with no road to
 * yours (Troy), or from one you trade with by sea and not by land (Athens or
 * Corinth, their ships knowing the way); else along the road.
 */
export function raidBy(s: SimState, city: CityId): 'land' | 'sea' {
  if (!routeWay(city, 'land')) return 'sea';
  if (!routeWay(city, 'sea')) return 'land';
  const open = (k: 'land' | 'sea'): boolean => s.world.routes.some((r) => r.city === city && r.kind === k);
  return open('sea') && !open('land') ? 'sea' : 'land';
}

/** Where a band comes: "at the west edge of your land", "off your shore". */
export const edgeWords = (r: Pick<Raid, 'by' | 'city'>): string => (r.by === 'sea' ? 'off your shore' : `at the ${RAID_SIDE[r.city]} edge of your land`);

/** The men of a band on your land (by sea, those who landed). */
export const bandMen = (r: Raid): number => (r.landed > 0 ? r.landed : r.men);

/** The price of peace in coin, for a city your size. */
export const peaceCoin = (s: SimState): number => clamp(Math.round((PEACE_VALUE * fairGift(s)) / 50) * 50, PEACE_LEAST, PEACE_MOST);

// ---------------------------------------------------------------------------
// The threat.

/** May this ruler threaten now: no threat or band live in Greece, none ended in the last three months, theirs not within a year (two after a raid)? */
export function mayThreaten(s: SimState, city: CityId): boolean {
  const w = s.world;
  if (threatLive(w)) return false;
  return !w.raids.some((r) => (r.ended > 0 && s.tick - r.ended < GREECE_LULL) || (r.city === city && r.ended > 0 && s.tick - r.ended < lullOf(r)));
}

/**
 * A ruler threatens your city: the price of peace (coin, or goods they are
 * short of that your city could send), a deadline at least two months off
 * (longer if the goods need it, or if raiders would otherwise reach you
 * within a year of your first route), and a line of news that can't wait.
 */
export function threaten(s: SimState, map: CoastMap, c: WorldCity, cause: string, debt?: Loan): Raid {
  const w = s.world;
  const coin = debt ? debt.owed : peaceCoin(s);
  // The goods they would take instead: one they are short of that your stores hold and you could send them.
  const n = w.nextRaid;
  const canGoods = !('why' in giftWay(s, map, c.id, false));
  const worth = (k: number): number => clamp(Math.round((coin * 100) / Math.max(1, c.price[k]) / 100) * 100, 200, 2000);
  // (Only a good your stores hold twice over, as a request asks no more than about half: fetching it is then quick, and the day it would arrive can be trusted.)
  const goods = canGoods && !debt ? sellsAndBuys(c).buys.filter((k) => k < OLD_GOODS && cityHolds(s, TRADE_GOODS[k]) >= 2 * worth(k)) : [];
  const alt = goods.length ? goods[Math.floor(dice(w, n, 0, 1) * goods.length)] : -1;
  const altAmount = alt >= 0 ? worth(alt) : 0;
  const first = firstRoute(w);
  const by = raidBy(s, c.id);
  const march = marchTicks(c.id, by);
  let days = debt ? DEBT_DAYS : Math.max(deadlineFor(s, map, c.id, -1, coin, THREAT_DAYS), alt >= 0 ? deadlineFor(s, map, c.id, alt, altAmount, THREAT_DAYS) : 0);
  // (No raiders at your edge within a year of your first route; a lender's army comes when the debt says.)
  if (first && !debt) days = Math.max(days, first + TICKS_PER_YEAR - GATHER - march - s.tick);
  days = Math.ceil(days / TICKS_PER_DAY) * TICKS_PER_DAY;
  const why = cause;
  const d = makeDeal(s, 'threat', c.id, -1, coin, s.tick + days, why);
  const { id: way } = wayFor(c.id, by);
  const r: Raid = {
    id: w.nextRaid++,
    deal: d.id,
    city: c.id,
    men: debt ? debtBand(s, c.id, dice(w, n, 0, 2)) : bandSize(s, c.id, dice(w, n, 0, 2)),
    phase: 'threat',
    by,
    way,
    start: s.tick,
    dur: days,
    a0: 0,
    a1: 0,
    coin,
    alt,
    altAmount,
    edge: -1,
    target: 0,
    aim: '',
    ware: -1,
    took: 0,
    fired: false,
    next: [],
    stole: 0,
    fires: 0,
    fallen: 0,
    regained: 0,
    coinBack: 0,
    broke: false,
    fought: 0,
    killed: 0,
    wounded: 0,
    siege: -1,
    breaches: 0,
    ended: 0,
    end: '',
    shore: -1,
    ships: 0,
    sunk: 0,
    landed: 0,
    drowned: 0,
    brokeAt: '',
    loan: debt ? debt.id : 0,
  };
  w.raids.push(r);
  if (!w.contact) w.contact = Math.max(1, s.tick);
  if (debt) {
    news(w, s.tick, c.id, `${rulerName(c)} will wait no longer for the ${fmt(coin)} dr you owe: pay it ${dueIn(days, s.tick + days)}, or ${his(c)} army will come to collect it, about ${r.men} men${by === 'sea' ? ', by sea' : ''}`, true);
    s.rev++;
    return r;
  }
  news(w, s.tick, c.id, `${rulerName(c)} is out of patience: pay ${fmt(coin)} dr${alt >= 0 ? ` or send ${giftWords(alt, altAmount)}` : ''} ${dueIn(days, s.tick + days)}, or ${his(c)} raiders will come, about ${r.men} men${by === 'sea' && routeWay(c.id, 'land') ? ', by sea' : ''}`, true);
  s.rev++;
  return r;
}

/** "within two months", "within 45 days", "by 6 March 746 BC". */
function dueIn(ticks: number, due: number): string {
  const days = Math.round(ticks / TICKS_PER_DAY);
  if (days % 30 === 0 && days <= 360) {
    const m = days / 30;
    return `within ${m === 1 ? 'a month' : `${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][m]} months`}`;
  }
  return days <= 60 ? `within ${days} days` : `by ${dayWords(due)}`;
}

/**
 * A tribute refused (or let run out) by a ruler who was already cold: they
 * threaten at once, whatever else is open (it follows from your answer);
 * unless another threat or band is live, or they are in their lull, when
 * the tribute stays marked and the threat comes on a later month's turn.
 */
export function threatFromTribute(s: SimState, map: CoastMap, c: WorldCity, d: Deal): void {
  d.angry = true;
  s.rev++;
  if (!mayThreaten(s, c.id)) return;
  d.angry = false;
  threaten(s, map, c, `you refused ${his(c)} tribute while ${c.ruler?.female ? 'she' : 'he'} was cold towards you`);
}

/** A lender's threat over a debt of yours (loans.ts, step 3): what is left owed, in coin, within a month, or an army comes to collect it. */
export function threatenDebt(s: SimState, map: CoastMap, c: WorldCity, l: Loan): Raid {
  return threaten(s, map, c, `you have not repaid ${rulerWord(c).replace(/^the /, 'the ')}’s loan of ${fmt(l.amount)} dr`, l);
}

/** The debt a lender's army comes for, if it is one. */
export const debtOf = (s: SimState, r: Raid): Loan | undefined => (r.loan ? loanOf(s.world, r.loan) : undefined);

/** What a lender's army has carried off so far, at the lender's prices (dr): the coin it took and the goods, less what was taken back from its fallen. */
export function lootValue(s: SimState, r: Raid): number {
  const coin = r.stole - r.coinBack;
  const goods = r.took - r.regained;
  if (goods <= 0 || r.ware < 0) return Math.max(0, coin);
  const k = tradeIndex(r.ware as Ware);
  const unit = k >= 0 ? cityOf(s.world, r.city).price[k] / 100 : 1;
  return Math.max(0, coin) + Math.round(goods * unit);
}

// ---------------------------------------------------------------------------
// Each tick: the band's phases; each day: deadlines and moods mended; each month: new threats.

/**
 * Threats and bands, once a tick: a band gathering sets out, a band
 * marching reaches your edge (and comes in), a band going home gets there.
 * Once a day: a threat past its day with nothing on its way brings the
 * raiders; a ruler warmed past cold calls them off. On the first of the
 * month: a tribute marked angry gets its threat, a hostile ruler may
 * threaten. Nothing in a town that has never opened a route.
 */
export function stepRaids(s: SimState, map: CoastMap): void {
  const w = s.world;
  if (w.raids.length === 0 && w.routes.length === 0) return;
  for (const r of w.raids) {
    if (r.phase === 'gathering' && s.tick >= r.start + r.dur) march(s, r);
    else if (r.phase === 'marching' && s.tick >= r.start + r.dur) arrive(s, map, r);
    else if ((r.phase === 'homeward' || r.phase === 'turned') && s.tick >= r.start + r.dur) {
      r.phase = 'done';
      s.rev++;
    }
    // (Ships paid off or called off before they landed, gone over the horizon: home along the lane.)
    else if (r.phase === 'raiding' && r.shore >= 0 && r.landed === 0 && r.end !== '' && !seaborne(s, r)) home(s, r);
  }
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const r of w.raids) {
    if (!live(r)) continue;
    const c = cityOf(w, r.city);
    const d = dealOf(w, r.deal);
    // Their mood mended past cold (a gift, or time): the threat is called off, the band turned back.
    if (!r.loan && moodOf(c, s.tick) > COLD) {
      callOff(s, r, 'called');
      continue;
    }
    if (r.phase === 'threat' && d && s.tick >= d.due && d.gift === 0) gather(s, r, false);
    // (The band no longer on your map, however that came about: the raid is over, not stuck live for ever.)
    // (From the sea and not landed yet: while any of its ships is still in the water, sinking ones included, so that a fleet sunk to the last ship is told as one: fleet.ts's lostAtSea.)
    else if (r.phase === 'raiding' && !raidersOf(s, r) && !(r.shore >= 0 && r.landed === 0 && s.fleet.ships.some((e) => e.raid === r.id))) {
      // (A band from the sea fallen to the last man ashore: its ships put off for home, with nobody to wait for. Review of slice 26.)
      if (r.shore >= 0 && r.landed > 0) embark(s, map, r, false);
      home(s, r);
      settle(s, r, 'raided');
    }
  }
  if (s.tick % TICKS_PER_MONTH === 0) {
    if (w.raids.some((r) => r.phase === 'done' && s.tick - r.ended > lullOf(r))) w.raids = w.raids.filter((r) => !(r.phase === 'done' && s.tick - r.ended > lullOf(r)));
    threats(s, map);
  }
}

const dealOf = (w: World, id: number): Deal | undefined => w.deals.find((d) => d.id === id);

/** On the first of the month: a tribute marked angry (refused while another threat ran) gets its threat; else a hostile ruler, proud or warlike, may threaten. */
function threats(s: SimState, map: CoastMap): void {
  const w = s.world;
  if (threatLive(w)) return;
  // (Slice 34: your vassals and allies never threaten you.)
  const owed = w.deals.find((d) => d.kind === 'tribute' && d.angry && d.ended > 0 && s.tick - d.ended < ANGRY_FOR && mayThreaten(s, d.city) && !boundTo(s, d.city));
  if (owed) {
    owed.angry = false;
    const c = cityOf(w, owed.city);
    if (moodOf(c, s.tick) <= COLD) threaten(s, map, c, `you refused ${his(c)} tribute while ${c.ruler?.female ? 'she' : 'he'} was cold towards you`);
    return;
  }
  const first = firstRoute(w);
  if (!first || s.tick - first < ASK_AFTER) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (let i = 0; i < w.cities.length; i++) {
    const c = w.cities[i];
    const t = c.ruler?.traits ?? [];
    if (!c.ruler || !RULED.includes(c.id) || !(t.includes('proud') || t.includes('warlike')) || boundTo(s, c.id)) continue;
    const mood = moodOf(c, s.tick);
    if (mood > COLD || !mayThreaten(s, c.id)) continue;
    // (Slice 33: a band that would march in winter mostly waits for spring; cold rulers' threats (slice 31) too.)
    if (armiesHome(s, s.tick + THREAT_DAYS, month * 64 + i)) continue;
    const bold = Math.max(0.5, Math.min(1.5, armyScale(c)));
    if (dice(w, month, i, 31) >= (mood <= HOSTILE ? HOSTILE_ODDS : COLD_ODDS * bold)) continue;
    const grown = bold >= 1.2 ? `, with an army grown to ${Math.round(c.army).toLocaleString('en-GB')} men` : '';
    threaten(s, map, c, `${rulerShort(c)} is ${mood <= HOSTILE ? 'hostile' : 'cold'} to your city, and ${t.includes('warlike') ? 'warlike' : 'proud'}${grown}`);
    return;
  }
}

/** The band gathers at their city (the day passed with nothing sent, or you refused). */
export function gather(s: SimState, r: Raid, refused: boolean): void {
  const c = cityOf(s.world, r.city);
  const { L } = wayFor(r.city, r.by);
  r.phase = 'gathering';
  // (Ten days. So that no raiders reach your edge within a year of your first route, a band defied early bides its time at home first, out of sight, and gathers for its last ten days: slice 31, where it camped for months.)
  const first = firstRoute(s.world);
  const wait = first && !r.loan ? Math.max(0, first + TICKS_PER_YEAR - marchTicks(r.city, r.by) - GATHER - s.tick) : 0;
  r.start = s.tick + Math.ceil(wait / TICKS_PER_DAY) * TICKS_PER_DAY;
  r.dur = GATHER;
  r.a0 = L;
  r.a1 = L;
  const days = Math.round((r.start + r.dur - s.tick + marchTicks(r.city, r.by)) / TICKS_PER_DAY);
  if (r.loan) {
    news(s.world, s.tick, r.city, `${refused ? `You would not pay ${rulerShort(c)}: ` : ''}${whose(r.city)} army gathers to collect your debt, ${r.men} men: ${edgeWords(r)} in about ${days} days. Pay the ${fmt(r.coin)} dr to turn them back`, true);
    s.rev++;
    return;
  }
  news(s.world, s.tick, r.city, `${refused ? `You defied ${rulerShort(c)}: ` : ''}${whose(r.city)} raiders gather to ${r.by === 'sea' ? 'sail' : 'march'} on your city, ${r.men} men: ${edgeWords(r)} in about ${days} days. Pay ${fmt(r.coin)} dr to turn them back`, true);
  s.rev++;
}

/** The band sets out along the road (or the lane) to your edge. */
function march(s: SimState, r: Raid): void {
  r.phase = 'marching';
  r.start = s.tick;
  r.dur = marchTicks(r.city, r.by);
  r.a1 = r.by === 'land' ? EDGE_ALONG : HORIZON_ALONG;
  s.rev++;
}

/** Days until the band reaches your edge (gathering or marching), at least 1. */
export function daysToEdge(r: Raid, tick: number): number {
  const at = r.phase === 'gathering' ? r.start + r.dur + marchTicks(r.city, r.by) : r.phase === 'marching' ? r.start + r.dur : tick;
  return Math.max(1, Math.ceil((at - tick) / TICKS_PER_DAY));
}

/** When the band reaches your edge (a tick), from the threat's day if it has not set out. */
export function reachesEdge(s: SimState, r: Raid): number {
  if (r.phase === 'gathering') return r.start + r.dur + marchTicks(r.city, r.by);
  if (r.phase === 'marching') return r.start + r.dur;
  const d = dealOf(s.world, r.deal);
  return (d ? Math.max(d.due, s.tick) : s.tick) + GATHER + marchTicks(r.city, r.by);
}

// ---------------------------------------------------------------------------
// On your map.

/** How far a building is from an edge of the map (tiles, from its middle). */
function fromEdge(size: number, b: Building, side: string): number {
  const [cx, cz] = centreOf(b);
  return edgeDistance(size, cx, cz, side);
}
const edgeDistance = (size: number, x: number, z: number, side: string): number => (side === 'north' ? z : side === 'west' ? x : side === 'east' ? size - x : size - z);

/** Is a building worth raiding: a field (always), or a store with 300 or more of something in it? */
export function worthRaiding(b: Building): boolean {
  if (FIELDS[b.kind] !== undefined) return true;
  return storeWorth(b);
}
/** A store worth raiding: a granary or storehouse with 300 or more in it. */
const storeWorth = (b: Building): boolean => STORES.includes(b.kind) && WARES.reduce((a, w) => a + held(b, w), 0) >= STORE_WORTH;

/** The open tiles along an edge. */
function edgeTiles(map: CoastMap, s: SimState, side: string): number[] {
  const n = map.size;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = side === 'north' ? i : side === 'south' ? (n - 1) * n + i : side === 'west' ? i * n : i * n + n - 1;
    // (A stretch of wall or a gate along the very edge is a way in too, once broken: slice 25's review.)
    if (foeWalkable(map, s, t) || (s.walls.length > 0 && barsFoe(s, t))) out.push(t);
  }
  return out;
}

/**
 * Where a band comes in and what it goes for: of the fields and stores worth
 * it, the nearest to the edge on their side (trying the next few if no way
 * leads to one), in at the open edge tile nearest it, and the way there
 * across the land. Null if nothing worth it can be reached from that edge.
 */
export function landing(s: SimState, map: CoastMap, city: CityId): { edge: number; target: Building; path: Array<[number, number, number]>; next: number[]; siege: number } | null {
  const size = map.size;
  const side = RAID_SIDE[city];
  const edges = edgeTiles(map, s, side);
  if (!edges.length) return null;
  const near = (a: Building, b: Building): number => fromEdge(size, a, side) - fromEdge(size, b, side) || a.id - b.id;
  // The stores worth it first, nearest the edge; then the tax offices (where the treasury is kept); a town with neither, its fields.
  const stores = s.buildings.filter(storeWorth).sort(near);
  const offices = s.buildings.filter((b) => b.kind === 'taxoffice').sort(near);
  const fields = s.buildings.filter((b) => FIELDS[b.kind] !== undefined).sort(near);
  const targets = stores.length ? [...stores.slice(0, TRIES), ...offices.slice(0, TRIES)] : offices.length ? offices.slice(0, TRIES) : fields;
  for (const b of targets.slice(0, 2 * TRIES)) {
    const [cx, cz] = centreOf(b);
    const goals = around(size, b).filter((t) => foeWalkable(map, s, t));
    if (!goals.length) continue;
    // The side of it facing the edge they come from; in at whichever open edge tile is the shortest walk from it.
    const toEdge = (t: number): number => edgeDistance(size, t % size, Math.floor(t / size), side);
    goals.sort((p, q) => toEdge(p) - toEdge(q) || dhypot((p % size) - cx, Math.floor(p / size) - cz) - dhypot((q % size) - cx, Math.floor(q / size) - cz) || p - q);
    const found = foeWay(map, s, edges, goals[0]);
    if (!found) continue;
    const { tiles, siege, from: edge } = found;
    const [ox, oz] = offMapPoint(size, edge);
    const path: Array<[number, number, number]> = [[ox, oz, -1]];
    for (const [px, pz] of prunePath(map, s, tiles, foeWalkable)) path.push([px, pz, -1]);
    // (A wall along the very edge: they stand just off the map, at it, to break it.)
    if (!tiles.length) path.push([...justOff(size, edge), -1]);
    // After a store, the tax office nearest it (its way is found when they set off from the store).
    const [bx, bz] = centreOf(b);
    const office = STORES.includes(b.kind) ? offices.slice().sort((p, q) => dhypot(centreOf(p)[0] - bx, centreOf(p)[1] - bz) - dhypot(centreOf(q)[0] - bx, centreOf(q)[1] - bz) || p.id - q.id)[0] : undefined;
    return { edge, target: b, path, next: office ? [office.id] : [], siege };
  }
  return null;
}

/**
 * A raiders' way from any of `starts` to `goal` (slice 25): across country,
 * a wall or gate standing in the way counted as the steps it is worth to
 * break (walls.ts). The tiles they walk up to the first one they must break,
 * and that one's tile (-1: none in the way). Null if there is no way at all.
 */
export function foeWay(map: CoastMap, s: SimState, starts: readonly number[], goal: number): { tiles: number[]; siege: number; from: number } | null {
  if (s.walls.length === 0) {
    const tiles = offRoadPath(map, s, starts, goal);
    return tiles ? { tiles, siege: -1, from: tiles[0] } : null;
  }
  const all = offRoadPath(map, s, starts, goal, 20000, foeToll(map, s));
  if (!all) return null;
  const i = all.findIndex((t) => (wallAt(s, t)?.hp ?? 0) > 0);
  if (i < 0) return { tiles: all, siege: -1, from: all[0] };
  // (Breaking in at the very edge, `from` a wall on it: no tiles to walk, they stand off the map, at it.)
  return { tiles: i > 0 ? all.slice(0, i) : [], siege: all[i], from: all[0] };
}

/** The middle of the tile just off the map beyond an edge tile (where a band stands to break a wall on the edge). */
function justOff(size: number, t: number): [number, number] {
  const tx = t % size;
  const tz = (t - tx) / size;
  if (tx === 0) return [-0.5, tz + 0.5];
  if (tx === size - 1) return [size + 0.5, tz + 0.5];
  if (tz === 0) return [tx + 0.5, -0.5];
  return [tx + 0.5, size + 0.5];
}

/** The band reaches your edge: in it comes, for its target (or, with nothing worth taking in reach, it goes home). By sea, its ships come into sight. */
function arrive(s: SimState, map: CoastMap, r: Raid): void {
  if (r.by === 'sea') {
    arriveBySea(s, map, r);
    return;
  }
  const w = s.world;
  const c = cityOf(w, r.city);
  const at = landing(s, map, r.city);
  if (!at) {
    home(s, r);
    settle(s, r, 'nothing');
    news(w, s.tick, r.city, `${whose(r.city)} raiders came to the edge of your land and found nothing worth taking near it: they have gone home`, true);
    return;
  }
  r.phase = 'raiding';
  r.start = s.tick;
  r.edge = at.edge;
  r.target = at.target.id;
  r.aim = at.target.kind;
  r.next = at.next;
  r.siege = at.siege;
  const band = newWalker(s, 'raider', r.men);
  band.origin = at.target.id;
  band.target = at.target.id;
  band.home = r.id;
  band.food = CITY_IDS.indexOf(r.city);
  band.meat = -1;
  band.since = s.tick;
  setPath(band, at.path);
  s.walkers.push(band);
  const then = at.next.map((id) => findBuilding(s, id)).filter((b): b is Building => !!b).map(aimWords).join(', then ');
  if (r.loan) news(w, s.tick, r.city, `${whose(r.city)} army is in at the ${RAID_SIDE[r.city]} edge of your land, ${r.men} men come to collect the ${fmt(r.coin)} dr you owe, making for ${aimWords(at.target)}${then ? ` and then ${then}` : ''}. People are running indoors`, true, 'raid');
  else news(w, s.tick, r.city, `Raiders! ${r.men} of ${whose(r.city)} men are in at the ${RAID_SIDE[r.city]} edge of your land, making for ${aimWords(at.target)}${then ? ` and then ${then}` : ''}. People are running indoors. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`, true, 'raid');
  void c;
  s.rev++;
}

// ---------------------------------------------------------------------------
// From the sea (slice 26): ships in the bay, the beach, and back to the ships.

/** The shore a band from the sea can land on: open ground (or a stretch of wall or a gate) beside the open sea. */
function beachTiles(map: CoastMap, s: SimState): number[] {
  const n = map.size;
  const open = seaOf(map).open;
  const out: number[] = [];
  // (Not beside a jetty, the trading post's or a shipyard's: a ship drawn up there would lie across it.)
  const jetties = s.buildings
    .filter((b) => b.kind === 'trading' || b.kind === 'shipyard')
    .map((b) => berthOf(map, b))
    .filter((j) => j !== null);
  const byJetty = (x: number, z: number): boolean =>
    jetties.some((j) => {
      for (let k = 0; k <= 4; k++) {
        const u = (j.len * k) / 4;
        if (dhypot(j.jx + j.ox * u - x, j.jz + j.oz * u - z) < 2.6) return true;
      }
      return dhypot(j.x - x, j.z - z) < 2.6;
    });
  for (let z = 1; z < n - 1; z++) {
    for (let x = 1; x < n - 1; x++) {
      const t = z * n + x;
      if (open[t] || !(foeWalkable(map, s, t) || (s.walls.length > 0 && barsFoe(s, t)))) continue;
      if (jetties.length && byJetty(x + 0.5, z + 0.5)) continue;
      if (open[t - 1] || open[t + 1] || open[t - n] || open[t + n]) out.push(t);
    }
  }
  return out;
}

/** Where a ship runs up on a beach tile: on the waterline, her bow on the sand (world units), from the sea beside it. */
function shipSpot(map: CoastMap, t: number): { x: number; z: number; tile: number } {
  const n = map.size;
  const open = seaOf(map).open;
  const x = t % n;
  const z = (t - x) / n;
  let dx = 0;
  let dz = 0;
  if (open[t - 1]) dx -= 1;
  if (open[t + 1]) dx += 1;
  if (open[t - n]) dz -= 1;
  if (open[t + n]) dz += 1;
  const h = dhypot(dx, dz) || 1;
  return { x: x + 0.5 + (dx / h) * 0.85, z: z + 0.5 + (dz / h) * 0.85, tile: t };
}

/** Slice 38: a band's ships draw up within this many tiles of its landing (was 10). */
const SPOTS_NEAR = 4;

/** A spot on the beach for each of a band's ships: the landing first, the rest along the shore beside it, a little apart. */
function spotsNear(map: CoastMap, beaches: readonly number[], from: number, n: number): Array<{ x: number; z: number; tile: number }> {
  const size = map.size;
  const fx = from % size;
  const fz = Math.floor(from / size);
  const near = beaches
    .map((t) => ({ t, d: dhypot((t % size) - fx, Math.floor(t / size) - fz) }))
    .filter((p) => p.d <= 10)
    .sort((p, q) => p.d - q.d || p.t - q.t);
  const out = [shipSpot(map, from)];
  // (Slice 38: drawn up within SPOTS_NEAR of the landing, as the "Sails!" line names it, and farther only if the beach has no room nearer.)
  for (const most of [SPOTS_NEAR, 10]) {
    for (const { t, d } of near) {
      if (out.length >= n || d > most) break;
      const p = shipSpot(map, t);
      if (out.every((o) => dhypot(o.x - p.x, o.z - p.z) >= 1.9)) out.push(p);
    }
  }
  return out;
}

/**
 * Where a band from the sea lands and what it goes for: of the stores worth
 * it (then the tax offices; with neither, the fields), the nearest to the
 * shore that a way leads to, and the beach from which the walk there is the
 * shortest, by the raiders' own way-finding (walls and gates counted as on
 * land). Null if nothing worth it can be reached from the shore.
 */
export function seaLanding(s: SimState, map: CoastMap, men: number, ships: number): { from: number; target: Building; next: number[]; spots: Array<{ x: number; z: number; tile: number }> } | null {
  const size = map.size;
  const beaches = beachTiles(map, s);
  if (!beaches.length) return null;
  void men;
  const toShore = (x: number, z: number): number => {
    let best = Infinity;
    for (const t of beaches) best = Math.min(best, dhypot((t % size) + 0.5 - x, Math.floor(t / size) + 0.5 - z));
    return best;
  };
  const key = new Map<number, number>();
  const shoreOf = (b: Building): number => {
    let k = key.get(b.id);
    if (k === undefined) {
      const [cx, cz] = centreOf(b);
      k = toShore(cx, cz);
      key.set(b.id, k);
    }
    return k;
  };
  const near = (a: Building, b: Building): number => shoreOf(a) - shoreOf(b) || a.id - b.id;
  const stores = s.buildings.filter(storeWorth).sort(near);
  const offices = s.buildings.filter((b) => b.kind === 'taxoffice').sort(near);
  const fields = s.buildings.filter((b) => FIELDS[b.kind] !== undefined).sort(near);
  const targets = stores.length ? [...stores.slice(0, TRIES), ...offices.slice(0, TRIES)] : offices.length ? offices.slice(0, TRIES) : fields;
  for (const b of targets.slice(0, 2 * TRIES)) {
    const goals = around(size, b).filter((t) => foeWalkable(map, s, t));
    if (!goals.length) continue;
    const g = goals.map((t) => ({ t, d: toShore((t % size) + 0.5, Math.floor(t / size) + 0.5) })).sort((p, q) => p.d - q.d || p.t - q.t)[0].t;
    const found = foeWay(map, s, beaches, g);
    if (!found) continue;
    const [bx, bz] = centreOf(b);
    const office = STORES.includes(b.kind) ? offices.slice().sort((p, q) => dhypot(centreOf(p)[0] - bx, centreOf(p)[1] - bz) - dhypot(centreOf(q)[0] - bx, centreOf(q)[1] - bz) || p.id - q.id)[0] : undefined;
    return { from: found.from, target: b, next: office ? [office.id] : [], spots: spotsNear(map, beaches, found.from, ships) };
  }
  return null;
}

/** " below the market quarter": where on the shore, for the news (nothing outside a district). */
function shoreWhere(map: CoastMap, t: number): string {
  const n = map.size;
  const title = districtTitle(districtAt(map, (t % n) + 0.5, Math.floor(t / n) + 0.5));
  return title ? ` ${title[0].toLowerCase()}${title.slice(1)}` : '';
}

/** A band by sea reaches your gulf: its ships come into sight, each making for its spot on the beach nearest what it came for. */
function arriveBySea(s: SimState, map: CoastMap, r: Raid): void {
  const w = s.world;
  const at = seaLanding(s, map, r.men, shipsFor(r.men));
  if (!at) {
    home(s, r);
    settle(s, r, 'nothing');
    news(w, s.tick, r.city, `${whose(r.city)} ships came into sight off your shore and found nothing worth landing for: they have sailed home`, true);
    return;
  }
  r.phase = 'raiding';
  r.start = s.tick;
  r.shore = at.from;
  r.edge = at.from;
  r.target = at.target.id;
  r.aim = at.target.kind;
  r.next = at.next;
  r.siege = -1;
  sailIn(s, map, r, at.spots);
  const days = daysToBeach(s, map, r);
  const then = at.next.map((id) => findBuilding(s, id)).filter((b): b is Building => !!b).map(aimWords).join(', then ');
  // (A lender's army (slice 28) comes for what you owe, and can't be paid off once it is here.)
  const pay = r.loan ? `, come to collect the ${fmt(r.coin)} dr you owe` : '';
  news(w, s.tick, r.city, `Sails! ${r.ships} of ${whose(r.city)} ships are in sight off your shore, about ${r.men} men aboard${pay}, making for the beach${shoreWhere(map, at.from)}: they will land for ${aimWords(at.target)}${then ? ` and then ${then}` : ''} in about ${days === 1 ? 'a day' : `${days} days`}${r.loan ? '' : `. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`}`, true, 'raid');
  s.rev++;
}

/** The raid a ship sails for. */
export const raidOfShips = (s: SimState, id: number): Raid | undefined => s.world.raids.find((r) => r.id === id);

/**
 * Every ship still afloat is drawn up on the beach (fleet.ts): the band lands,
 * `men` of them (those aboard the ships that made it, less a few left to
 * guard each), forms up at the ship nearest the way in, and marches inland
 * for what it came for. With no way to it any more, they sail off again.
 */
export function landBand(s: SimState, map: CoastMap, r: Raid, men: number): void {
  const size = map.size;
  const beached = shipsOf(s, r).filter((e) => e.state === 'beached');
  // (Slice 29: a band with no men left to land, past each ship's guard, lands none: it sails home. It used to land one.)
  if (men <= 0) {
    embark(s, map, r, false);
    home(s, r);
    settle(s, r, 'nothing');
    news(s.world, s.tick, r.city, `${whose(r.city)} ships beached on your shore with too few men left to land: they have sailed home`, true);
    return;
  }
  r.landed = men;
  const b = findBuilding(s, r.target);
  // (Slice 38: they land from the beach the "Sails!" line named (its first ship's), or the nearest of their ships to it if she was sunk; from any only if no way leads from there.)
  const named = landingShip(beached, r.shore, size);
  let best: { tiles: number[]; siege: number; from: number } | null = null;
  for (const starts of named ? [[named.tile], beached.map((e) => e.tile)] : [beached.map((e) => e.tile)]) {
    if (best || !b || b.kind === 'rubble' || !starts.length) break;
    const goals = around(size, b).filter((t) => foeWalkable(map, s, t));
    for (const g of goals.slice(0, 4)) {
      const p = foeWay(map, s, starts, g);
      if (p && (!best || p.tiles.length < best.tiles.length)) best = p;
    }
  }
  if (!best || !beached.length) {
    embark(s, map, r, false);
    home(s, r);
    settle(s, r, 'nothing');
    news(s.world, s.tick, r.city, `${whose(r.city)} raiders beached on your shore, but found no way to what they came for: they have sailed home`, true);
    return;
  }
  const ship = beached.find((e) => e.tile === best!.from) ?? beached[0];
  const path: Array<[number, number, number]> = [[ship.bx, ship.bz, -1]];
  for (const [px, pz] of prunePath(map, s, best.tiles, foeWalkable)) path.push([px, pz, -1]);
  // (A wall on the very beach: they stand at the waterline, at it, to break it.)
  if (!best.tiles.length) {
    const t = best.from;
    path.push([(ship.bx + (t % size) + 0.5) / 2, (ship.bz + Math.floor(t / size) + 0.5) / 2, -1]);
  }
  r.edge = best.from;
  r.siege = best.siege;
  const band = newWalker(s, 'raider', r.landed);
  band.origin = r.target;
  band.target = r.target;
  band.home = r.id;
  band.food = CITY_IDS.indexOf(r.city);
  band.meat = -1;
  band.since = s.tick;
  setPath(band, path);
  s.walkers.push(band);
  const then = r.next.map((id) => findBuilding(s, id)).filter((x): x is Building => !!x).map(aimWords).join(', then ');
  if (r.loan) news(s.world, s.tick, r.city, `${whose(r.city)} army is ashore${shoreWhere(map, best.from)}, ${r.landed} men come to collect the ${fmt(r.coin)} dr you owe, making for ${b ? aimWords(b) : 'what they came for'}${then ? ` and then ${then}` : ''}. People are running indoors`, true, 'raid');
  else news(s.world, s.tick, r.city, `Raiders! ${r.landed} of ${whose(r.city)} men are ashore${shoreWhere(map, best.from)}, making for ${b ? aimWords(b) : 'what they came for'}${then ? ` and then ${then}` : ''}. People are running indoors. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`, true, 'raid');
  s.rev++;
}

/** Slice 38: of a band's ships on the beach, the one it lands from: on the named landing, or the nearest to it. */
function landingShip(beached: readonly EnemyShip[], shore: number, size: number): EnemyShip | undefined {
  if (shore < 0 || !beached.length) return undefined;
  const sx = shore % size;
  const sz = Math.floor(shore / size);
  let best: EnemyShip | undefined;
  let bd = Infinity;
  for (const e of beached) {
    const d = dhypot((e.tile % size) - sx, Math.floor(e.tile / size) - sz);
    if (d < bd - 1e-9) {
      bd = d;
      best = e;
    }
  }
  return best;
}

/**
 * Slice 38 (review of slice 26): one of a band's ships sunk laden as she
 * sails off: her share of what it carried off is hauled out of the shallows
 * and goes back into the stores (the nearest with room) and the treasury, as
 * when a band finds its ships sunk. What came back, in words ('' nothing).
 */
export function regainAtSea(s: SimState, r: Raid, share: number): string {
  const back: string[] = [];
  const goods = Math.round((r.took - r.regained) * Math.min(1, share));
  if (goods > 0 && r.ware >= 0) {
    const store = s.buildings.filter((g) => isStore(g.kind) && roomFor(g, r.ware) >= goods).sort((p, q) => p.id - q.id)[0];
    if (store) {
      setHeld(store, r.ware, held(store, r.ware) + goods);
      note(s, r.ware, 'lost', `raid:${r.city}`, -goods);
      r.regained += goods;
      back.push(`${fmt(goods)} ${WARE_NAMES[r.ware]}`);
      s.looks++;
    }
  }
  const coin = Math.round((r.stole - r.coinBack) * Math.min(1, share));
  if (coin > 0) {
    income(s, coin, 'recovered', `from ${whose(r.city)} raiders`);
    r.coinBack += coin;
    back.push(`${fmt(coin)} dr`);
  }
  if (back.length) s.rev++;
  return back.join(' and ');
}

/** Every ship of a band sunk before it landed: nobody landed, and the raid is over. */
export function lostAtSea(s: SimState, map: CoastMap, r: Raid): void {
  if (r.end !== '') {
    home(s, r);
    return;
  }
  settle(s, r, 'sunk');
  r.phase = 'done';
  void map;
  s.rev++;
}

/**
 * Back at the beach with no ship to take them off (all sunk while they were
 * ashore): they drop what they carried on the sand (taken back into the
 * stores and the treasury, as from the fallen) and flee overland.
 */
function strand(s: SimState, r: Raid, w: Walker, x: number, z: number): void {
  r.shore = -1;
  const goods = r.took - r.regained;
  const back: string[] = [];
  if (goods > 0 && r.ware >= 0) {
    let store: Building | null = null;
    let bd = Infinity;
    for (const g of s.buildings) {
      if (!isStore(g.kind) || roomFor(g, r.ware) < goods) continue;
      const d = dhypot(g.x + 1 - x, g.z + 1 - z);
      if (d < bd - 1e-9) {
        bd = d;
        store = g;
      }
    }
    if (store) {
      setHeld(store, r.ware, held(store, r.ware) + goods);
      note(s, r.ware, 'lost', `raid:${r.city}`, -goods);
      r.regained += goods;
      back.push(`${fmt(goods)} ${WARE_NAMES[r.ware]}`);
      s.looks++;
    }
  }
  const coin = r.stole - r.coinBack;
  if (coin > 0) {
    income(s, coin, 'recovered', `from ${whose(r.city)} raiders`);
    r.coinBack += coin;
    back.push(`${fmt(coin)} dr`);
  }
  w.load = Math.max(0, r.took - r.regained);
  news(s.world, s.tick, r.city, `${whose(r.city)} raiders came back to the shore and found their ships sunk: they ${back.length ? `dropped what they carried (${back.join(' and ')} taken back) and ` : ''}flee overland`, true);
  s.rev++;
}

/** "the farm", "the granary", "the tax office": what they make for. */
export const aimWords = (b: Pick<Building, 'kind'>): string => (b.kind === 'grove' ? 'the olive grove' : b.kind === 'pasture' ? 'the sheep pasture' : b.kind === 'taxoffice' ? 'the tax office' : `the ${b.kind}`);

/** The raiders on your map now (the band's walker), if any. */
export const raidersOf = (s: SimState, r: Raid): Walker | undefined => s.walkers.find((w) => w.kind === 'raider' && w.home === r.id);

/** The raid a band on your map belongs to. */
export const raidOfBand = (s: SimState, w: Walker): Raid | undefined => s.world.raids.find((r) => r.id === w.home);

/** The tile under a point. */
const tileAt = (size: number, x: number, z: number): number => Math.max(0, Math.min(size - 1, Math.floor(z))) * size + Math.max(0, Math.min(size - 1, Math.floor(x)));

/** The tiles a walker standing here can set off from. */
function startsAt(map: CoastMap, s: SimState, x: number, z: number): number[] {
  const size = map.size;
  const t = tileAt(size, x, z);
  if (foeWalkable(map, s, t)) return [t];
  return [t - size, t - 1, t + 1, t + size, t - size - 1, t - size + 1, t + size - 1, t + size + 1].filter((u) => u >= 0 && u < size * size && foeWalkable(map, s, u));
}

/** Off the way they came: to the edge tile they came in by (or the nearest open edge), and off the map. False if there is no way at all. */
export function headOff(s: SimState, map: CoastMap, w: Walker, r: Raid | undefined): boolean {
  const size = map.size;
  const [x, z] = position(w);
  w.back = true;
  w.wait = 0;
  // (Still off the map, on their way to a wall they must break (one on the very edge, say): straight off again. Slice 25's review.)
  if (r && r.siege >= 0 && (x < 0 || z < 0 || x >= size || z >= size)) {
    r.siege = -1;
    const [ox, oz] = offMapPoint(size, tileAt(size, x, z));
    setPath(w, [
      [x, z, -1],
      [ox, oz, -1],
    ]);
    return true;
  }
  const starts = startsAt(map, s, x, z);
  // From the sea (slice 26): back to whichever of their ships on the beach is the shortest walk, and out to her. None left: they flee overland.
  if (r && r.shore >= 0 && r.landed > 0) {
    const ships = s.fleet.ships.filter((e) => e.raid === r.id && (e.state === 'beached' || e.state === 'sailing'));
    let best: { tiles: number[]; siege: number; from: number } | null = null;
    let to: (typeof ships)[number] | undefined;
    for (const e of ships) {
      const p = starts.length ? foeWay(map, s, starts, e.tile) : null;
      if (p && (!best || p.tiles.length < best.tiles.length)) {
        best = p;
        to = e;
      }
    }
    if (best && to) {
      const way: Array<[number, number, number]> = [[x, z, -1]];
      for (const [px, pz] of prunePath(map, s, best.tiles, foeWalkable)) way.push([px, pz, -1]);
      r.siege = best.siege;
      if (best.siege < 0) way.push([to.bx, to.bz, -1]);
      setPath(w, way);
      return true;
    }
    if (!ships.length) strand(s, r, w, x, z);
  }
  const edge = r && r.edge >= 0 && r.shore < 0 && r.landed === 0 ? r.edge : -1;
  const found = edge >= 0 && starts.length ? foeWay(map, s, starts, edge) : null;
  if (found) {
    const way: Array<[number, number, number]> = [[x, z, -1]];
    for (const [px, pz] of prunePath(map, s, found.tiles, foeWalkable)) way.push([px, pz, -1]);
    // (Walled in: out the way they broke in, or through another stretch they must break first.)
    if (r) r.siege = found.siege;
    if (found.siege < 0) {
      const [ox, oz] = offMapPoint(size, edge);
      way.push([ox, oz, -1]);
    }
    setPath(w, way);
    return true;
  }
  if (r) r.siege = -1;
  const out = overland(map, s, tileAt(size, x, z));
  if (!out) return false;
  const way: Array<[number, number, number]> = [[x, z, -1]];
  for (let i = 0; i < out.points.length; i += 2) way.push([out.points[i], out.points[i + 1], -1]);
  const [ox, oz] = offMapPoint(size, out.edge);
  way.push([ox, oz, -1]);
  setPath(w, way);
  return true;
}

/** A fresh way to their target from where they stand (something was built across the old one). False if there is none. */
function reaim(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const b = findBuilding(s, w.target);
  if (!b) return false;
  const [x, z] = position(w);
  const starts = startsAt(map, s, x, z);
  const goals = around(size, b).filter((t) => foeWalkable(map, s, t));
  if (!starts.length || !goals.length) return false;
  let best: { tiles: number[]; siege: number } | null = null;
  for (const g of goals.slice(0, 4)) {
    const p = foeWay(map, s, starts, g);
    if (p && (!best || p.tiles.length < best.tiles.length)) best = p;
  }
  if (!best) return false;
  const way: Array<[number, number, number]> = [[x, z, -1]];
  for (const [px, pz] of prunePath(map, s, best.tiles, foeWalkable)) way.push([px, pz, -1]);
  const r = raidOfBand(s, w);
  if (r) r.siege = best.siege;
  setPath(w, way);
  return true;
}

/** Is the band standing at a stretch of wall or a gate it must break (at the end of its way, the stretch still standing)? */
export function besieging(s: SimState, r: Raid, w: Walker): boolean {
  return r.siege >= 0 && w.seg >= w.path.length / 2 - 1 && (wallAt(s, r.siege)?.hp ?? 0) > 0;
}

/** Move the raiders one tick: across the land to their target, two days there, and off the way they came. False when they have left your map. */
export function moveRaider(s: SimState, map: CoastMap, w: Walker): boolean {
  const r = raidOfBand(s, w);
  // Fighting (battle.ts, last tick): the band stands where it is until the fight is done, or it breaks.
  const fighting = !!r && !r.broke && r.fought >= s.tick - 1;
  if (w.wait > 0) {
    // (Paid off or called off while they stand at their target: they go at once, with nothing from it.)
    if (r && r.end !== '') {
      w.wait = 0;
      return headOff(s, map, w, r) || gone(s, map, w, r);
    }
    if (fighting) return true;
    if (--w.wait > 0) return true;
    strike(s, w, r);
    // Then on to the next place they came for (the tax office, after a store), or off home.
    if (r && onward(s, map, w, r)) return true;
    return headOff(s, map, w, r) || gone(s, map, w, r);
  }
  // Paid off or called off on the way in: they turn for the edge from where they stand.
  if (!w.back && r && r.end !== '') {
    if (!headOff(s, map, w, r)) return gone(s, map, w, r);
  }
  if (fighting) return true;
  // At a wall or gate they must break (slice 25): they stand and hammer at it (battle.ts); once it is broken, on through it.
  if (r && r.siege >= 0 && w.seg >= w.path.length / 2 - 1) {
    if ((wallAt(s, r.siege)?.hp ?? 0) > 0) return true;
    r.siege = -1;
    if (!(w.back ? headOff(s, map, w, r) : reaim(s, map, w) || headOff(s, map, w, r))) return gone(s, map, w, r);
  }
  // Torches on their way: now and then a building beside them is set alight.
  if (r && s.tick % TICKS_PER_DAY === 0) torch(s, map, w, r);
  let move = RAID_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      break;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
    if (w.seg < last) {
      // Something built across the way ahead (not the last step, off the map): find another.
      const j = w.seg * 2;
      // (Nor the step out to their ships, at the waterline: slice 26.)
      const offMap = (x: number, z: number): boolean => x < 0 || z < 0 || x >= map.size || z >= map.size || (r !== undefined && r.landed > 0 && onWater(map, x, z));
      if (!offMap(w.path[j], w.path[j + 1]) && !offMap(w.path[j + 2], w.path[j + 3]) && !lineClear(map, s, w.path[j], w.path[j + 1], w.path[j + 2], w.path[j + 3], s.walls.length ? foeWalkable : walkable)) {
        if (!(w.back ? headOff(s, map, w, r) : reaim(s, map, w) || headOff(s, map, w, r))) return gone(s, map, w, r);
      }
      continue;
    }
    // The end of the way at a wall or gate they must break (slice 25): they stand and hammer at it (battle.ts); broken, on.
    if (r && r.siege >= 0) break;
    // The end of the way: off the map, or at the target.
    if (w.back) return gone(s, map, w, r);
    const b = findBuilding(s, w.target);
    if (!b || b.kind === 'rubble' || (r && r.end !== '')) {
      if (r && r.end === '' && onward(s, map, w, r)) return true;
      return headOff(s, map, w, r) || gone(s, map, w, r);
    }
    w.wait = AT_TARGET;
    light(s, b, r);
    break;
  }
  return true;
}

/** On from one target to the next they came for (the tax office, after a store): a fresh way there from where they stand. False if there is none left (or no way to it). */
function onward(s: SimState, map: CoastMap, w: Walker, r: Raid): boolean {
  while (r.next.length) {
    const id = r.next.shift()!;
    const b = findBuilding(s, id);
    if (!b || b.kind === 'rubble') continue;
    w.target = id;
    r.target = id;
    w.wait = 0;
    if (!reaim(s, map, w)) continue;
    s.rev++;
    return true;
  }
  return false;
}

/** How many buildings a band sets alight on its way, at most. */
const firesFor = (r: Raid): number => Math.min(FIRES_MOST, FIRES_LEAST + Math.floor(r.men / FIRES_PER));

/**
 * Once a day on their way (in or out, not running from a beating): now and
 * then the band sets alight a building beside it, a house as likely as any
 * (but not a store or the tax office: what they came to take), up to a few
 * in a raid. Through the fire code, so the watchmen come and it
 * can spread. Not with fire switched off (as while a demo's history is built).
 */
function torch(s: SimState, map: CoastMap, w: Walker, r: Raid): void {
  // (A lender's army came for coin, and sets nothing alight.)
  if (!s.hazards || r.loan || r.broke || r.end !== '' || r.fires >= firesFor(r) || w.wait > 0) return;
  // (One at most on their way in: the rest as they leave, loaded.)
  if (!w.back && r.fires >= 1) return;
  if (dice(s.world, r.id, Math.floor(s.tick / TICKS_PER_DAY), 7) >= TORCH_ODDS) return;
  const [x, z] = position(w);
  if (x < 0 || z < 0 || x >= map.size || z >= map.size) return;
  let best: Building | null = null;
  let bd = Infinity;
  for (const b of s.buildings) {
    // (Never the stores and tax offices they came to plunder: burning those would take everything they left, the granary's
    // food with it, and the town couldn't recover from that. Slice 24's review.)
    if (!burnable(b) || b.fire === FIRE_BURNING || b.id === w.target || r.next.includes(b.id) || STORES.includes(b.kind) || b.kind === 'taxoffice') continue;
    const [cx, cz] = centreOf(b);
    const half = b.kind === 'home' ? 0.5 : 1.5;
    const d = dhypot(cx - x, cz - z) - half;
    if (d <= TORCH_REACH && (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && best && b.id < best.id))) {
      bd = d;
      best = b;
    }
  }
  if (!best) return;
  ignite(s, best);
  r.fires++;
  s.rev++;
}

/** At the target, as they come: a field set alight; a store too, if there is little in it worth carrying (never the tax office: they came for its coin). */
function light(s: SimState, b: Building, r: Raid | undefined): void {
  // (Slice 24's review: with nothing in it to count as worth carrying, every tax office they reached was set alight, and burnt down.)
  if (!r || r.end !== '' || r.loan || b.kind === 'taxoffice') return;
  const field = FIELDS[b.kind] !== undefined;
  let most = 0;
  for (const x of WARES) most = Math.max(most, held(b, x));
  // (Not with fire switched off, as while a demo's history is built: it would never burn out.)
  if (s.hazards && (field || Math.min(Math.floor(most / 2), r.men * CARRY) < STORE_WORTH / 2) && burnable(b) && b.fire !== FIRE_BURNING) {
    ignite(s, b);
    r.fired = true;
    s.rev++;
  }
}

/** At the end of their time there: what is in a field's barn carried off, a store plundered (up to 80 a man, never more than half). */
function strike(s: SimState, w: Walker, r: Raid | undefined): void {
  const b = findBuilding(s, w.target);
  if (!b || !r || r.end !== '') return;
  const city = r.city;
  // (A lender's army: never more in all than what is owed, at the lender's prices.)
  const debt = debtOf(s, r);
  const left = debt ? Math.max(0, debt.owed - lootValue(s, r)) : Infinity;
  const most = w.people * CARRY;
  const field = FIELDS[b.kind];
  let ware = -1;
  let took = 0;
  if (b.kind === 'taxoffice') {
    // The treasury: up to a tenth of it, as much as they can carry (a lender's army: up to half, and what is owed).
    const coin = debt ? Math.min(Math.floor(Math.max(0, s.money) * DEBT_COIN_SHARE), w.people * DEBT_COIN_CARRY, left) : Math.min(Math.floor(Math.max(0, s.money) * COIN_SHARE), w.people * COIN_CARRY);
    if (coin > 0) {
      pay(s, -coin, 'raid', `${cityName(city)} · drachmas`, coin);
      r.stole += coin;
      s.rev++;
    }
    return;
  }
  if (field !== undefined) {
    ware = field;
    took = Math.min(held(b, field), most);
  } else {
    // The ware it holds most of: up to what they can carry, never more than half of it.
    let best = -1;
    for (const x of WARES) if (best < 0 || held(b, x) > held(b, best)) best = x;
    if (best >= 0) {
      ware = best;
      took = Math.min(Math.floor(held(b, best) / 2), most);
    }
  }
  if (debt && ware >= 0 && took > 0) {
    const k = tradeIndex(ware as Ware);
    const unit = k >= 0 ? cityOf(s.world, city).price[k] / 100 : 1;
    took = Math.min(took, Math.ceil(left / Math.max(0.01, unit)));
    // (Another ware than the one they carry already: they take only the one, as a band does.)
    if (r.ware >= 0 && r.ware !== ware && r.took > r.regained) took = 0;
  }
  if (ware >= 0 && took > 0) {
    setHeld(b, ware, held(b, ware) - took);
    note(s, ware, 'lost', `raid:${city}`, took);
    pay(s, 0, 'raid', `${cityName(city)} · ${WARE_NAMES[ware]}`, took);
    w.load = took;
    w.meat = ware;
    r.ware = ware;
    r.took += took;
    s.looks++;
  }
  // (A lender's army with what it came for: home, with nothing more.)
  if (debt && lootValue(s, r) >= debt.owed) r.next = [];
  s.rev++;
}

/** The raiders have left your map (or could get nowhere): home along the way on the map; the raid is over, the anger spent. */
function gone(s: SimState, map: CoastMap, w: Walker, r: Raid | undefined): boolean {
  if (!r) return false;
  // From the sea: they wade out, and the ships take them off (laden, if they carry anything); with none left, they flee overland.
  if (r.shore >= 0 && r.landed > 0) {
    const laden = r.took - r.regained > 0 || r.stole - r.coinBack > 0;
    if (!embark(s, map, r, laden) && headOff(s, map, w, r) && r.shore < 0) return true;
  }
  home(s, r);
  if (r.end === '') settle(s, r, 'raided');
  else {
    // (Paid off or called off while in your city: they go with what they took.)
    const loot = lootWords(r);
    news(s.world, s.tick, r.city, `${whose(r.city)} ${r.loan ? 'army has' : 'raiders have'} left your land${loot ? `, with ${loot}` : ''}`, true);
  }
  void w;
  return false;
}

/** What a band carries off (what it took, less what was taken back from its fallen), in words: "400 wheat and 315 dr"; '' for nothing. */
export function lootWords(r: Raid): string {
  const goods = r.took - r.regained;
  const coin = r.stole - r.coinBack;
  return [goods > 0 && r.ware >= 0 ? `${fmt(goods)} ${WARE_NAMES[r.ware]}` : '', coin > 0 ? `${fmt(coin)} dr` : ''].filter(Boolean).join(' and ');
}

/**
 * The band breaks (battle.ts: half its men have fallen): it runs for the
 * edge from where it stands, with what it still carries, and sets nothing
 * more alight. Its men no longer stand to fight.
 */
export function breakBand(s: SimState, map: CoastMap, r: Raid, why = 'half their men have fallen'): void {
  if (r.broke) return;
  r.broke = true;
  const w = raidersOf(s, r);
  if (w) {
    w.wait = 0;
    r.next = [];
    if (!headOff(s, map, w, r)) s.walkers = s.walkers.filter((o) => o !== w);
  }
  // (No count here: towers and archers often bring down more as they run. The whole fight's count comes when they have gone. Slice 25's review.)
  // (A lender's army is an army, in the singular: review of phase 4.)
  // (Slice 60: or a god has broken them: `why` says how.)
  news(s.world, s.tick, r.city, `${whose(r.city)} ${r.loan ? 'army breaks and runs' : 'raiders break and run'} for ${runFor(r)}: ${why}`, true);
  s.rev++;
}

/** Where a beaten band runs: "the west edge", "their ships". */
export const runFor = (r: Raid): string => (r.shore >= 0 && r.landed > 0 ? 'their ships' : `the ${RAID_SIDE[r.city]} edge`);

/** The band heads home along the way on the map from your edge (or your gulf). */
function home(s: SimState, r: Raid): void {
  const { L } = wayFor(r.city, r.by);
  r.phase = 'homeward';
  r.start = s.tick;
  r.dur = marchTicks(r.city, r.by);
  r.a0 = r.by === 'land' ? EDGE_ALONG : HORIZON_ALONG;
  r.a1 = L;
  s.rev++;
}

/**
 * A raid is over: the threat is settled ('raided', 'paid', 'called' or
 * 'nothing'), and the ruler remembers. After a raid their anger is partly
 * spent; paid off, they remember the payment.
 */
function settle(s: SimState, r: Raid, how: string): void {
  const w = s.world;
  const c = cityOf(w, r.city);
  const d = dealOf(w, r.deal);
  r.end = how;
  r.ended = s.tick;
  if (d && d.state === 'open') {
    d.state = how === 'paid' ? 'met' : how === 'called' ? 'ended' : 'raided';
    d.ended = s.tick;
  }
  if (r.loan && (how === 'raided' || how === 'nothing' || how === 'sunk')) {
    // A lender's army gone: what it carried off comes off the debt (loans.ts). No anger spent: it came for coin.
    collectorsGone(s, r, lootValue(s, r));
    s.rev++;
    return;
  }
  if (how === 'raided' || how === 'nothing' || how === 'sunk') {
    const loot = lootWords(r);
    const lost = loot ? `${loot} carried off` : '';
    const burnt = r.fires + (r.fired ? 1 : 0);
    const fired = r.fired && r.fires === 0 ? `${r.aim === 'grove' ? 'the olive grove' : r.aim === 'pasture' ? 'the sheep pasture' : `the ${r.aim}`} set alight` : burnt ? `${burnt === 1 ? 'a building' : `${burnt} buildings`} set alight` : '';
    const beaten = r.fallen ? `${r.fallen} of their ${bandMen(r)} men fell${r.broke ? ' and the rest ran' : ''}` : '';
    const sunk = r.sunk ? `${r.sunk === 1 ? 'a ship' : `${r.sunk} ships`} sunk by your triremes${r.drowned ? `, ${r.drowned} men with them` : ''}` : '';
    const what = [beaten, sunk, lost, fired].filter(Boolean).join(', ');
    const m = answerMemory(c, 'spent', `their raid has eased ${rulerWord(c).replace(/^the /, 'the ')}’s temper`, s.tick);
    c.memories.push(m);
    const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
    if (how === 'raided') news(w, s.tick, r.city, `${whose(r.city)} raiders have gone${what ? `: ${what}` : ''}. Their raid has eased ${rulerShort(c)}’s temper (+${m.amount})${turn ? `. ${turn}` : ''}`, true);
    if (how === 'sunk') {
      const line = `${whose(r.city)} raiders never reached your shore: your triremes sank ${r.sunk === 2 ? 'both' : `all ${r.sunk}`} of their ships in the bay${r.drowned ? `, and ${r.drowned} men with them` : ''}`;
      news(w, s.tick, r.city, `${line}. Their raid has eased ${rulerShort(c)}’s temper (+${m.amount})${turn ? `. ${turn}` : ''}`, true);
      armyNews(s, line, 0);
    }
  }
  // The fight that broke the band, counted whole now it is over (slice 25's review: towers often bring down more as it runs).
  if (r.broke && r.brokeAt) {
    const ours = [r.killed ? `${r.killed} of yours ${r.killed === 1 ? 'was' : 'were'} killed` : '', r.wounded ? `${r.wounded} wounded` : ''].filter(Boolean).join(' and ');
    armyNews(s, `Your soldiers broke ${whose(r.city)} raiders ${r.brokeAt}: ${r.fallen} of their ${bandMen(r)} men fell${ours ? `; ${ours}` : ', and none of yours'}`, 0);
    r.brokeAt = '';
  }
  s.rev++;
}

/**
 * Paid off (coin paid while the band is out, or what was sent arriving) or
 * called off (their mood mended past cold): the threat ends, and the band,
 * wherever it is, turns back: on the map it turns round where it is, in
 * your city it heads for the edge with whatever it took.
 */
export function callOff(s: SimState, r: Raid, how: 'paid' | 'called'): void {
  const w = s.world;
  const c = cityOf(w, r.city);
  const was = r.phase;
  settle(s, r, how);
  const d = dealOf(w, r.deal);
  if (how === 'paid' && !r.loan) c.memories.push(answerMemory(c, 'peace', `you paid them to call off their raiders (${r.alt >= 0 && d?.good === r.alt ? giftWords(r.alt, d.got || r.altAmount) : `${fmt(r.coin)} dr`})`, s.tick));
  const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
  const { L } = wayFor(r.city, r.by);
  if (was === 'threat') r.phase = 'done';
  else if (was === 'gathering') {
    r.phase = 'turned';
    r.start = s.tick;
    r.dur = 1;
    r.a0 = L;
    r.a1 = L;
  } else if (was === 'marching') {
    const u = Math.max(0, Math.min(1, (s.tick - r.start) / Math.max(1, r.dur)));
    const along = r.a0 + (r.a1 - r.a0) * u;
    r.phase = 'turned';
    r.start = s.tick;
    r.dur = Math.max(1, Math.round(u * marchTicks(r.city, r.by)));
    r.a0 = along;
    r.a1 = L;
  }
  // (In your city: the band sees it next tick and heads off, moveRaider.)
  const band = was === 'raiding' ? ' turn back' : was === 'threat' ? '' : ' turn round on the road home';
  const line = r.loan
    ? `${rulerShort(c)} has the coin you owed: ${was === 'threat' ? 'the threat to collect it is lifted' : `${his(c)} army${band.replace(/^ turn/, ' turns')}`}`
    : how === 'paid'
      ? was === 'threat'
        ? `${rulerShort(c)} has the price of peace: the threat is lifted`
        : `${rulerShort(c)} has the price of peace: ${his(c)} raiders${band}`
      : was === 'threat'
        ? `${rulerShort(c)}’s anger has cooled: the threat is lifted`
        : `${rulerShort(c)}’s anger has cooled: ${his(c)} raiders${band}`;
  news(w, s.tick, r.city, `${line}${turn ? `. ${turn}` : ''}`, true);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Your answers to a threat (favours.ts's `answer` hands them here).

/** Why an answer to a threat can't be given now, or '' if it can: pay in coin ('send'), send the goods ('goods'), or refuse. */
export function threatRefusal(s: SimState, map: CoastMap, d: Deal, act: string): string {
  const r = raidOf(s.world, d.id);
  if (!r || !live(r) || d.state !== 'open') return 'It is settled';
  // (Leaving already, with whatever they took: nothing to pay for.)
  const leaving = r.phase === 'raiding' && raidersOf(s, r)?.back === true;
  if ((act === 'send' || act === 'goods') && leaving) return 'They are leaving your land already';
  if (r.loan) {
    // (A lender's army: paying is repaying the loan; nothing once they are in your city, taking what is owed.)
    const l = loanOf(s.world, r.loan);
    if (act === 'goods') return 'They want coin';
    if (act === 'send') return !l ? 'It is settled' : r.phase === 'raiding' ? 'They are in your city, taking what is owed' : spendable(s) < l.owed ? `The treasury can’t spare ${fmt(l.owed)} dr now` : '';
  }
  if (act === 'send') {
    if (d.gift) return 'What you sent is on its way';
    return spendable(s) < r.coin ? `The treasury can’t spare ${fmt(r.coin)} dr now` : '';
  }
  if (act === 'goods') {
    if (r.alt < 0) return 'They asked for coin';
    if (d.gift) return 'What you sent is on its way';
    const ware = TRADE_GOODS[r.alt];
    if (cityHolds(s, ware) < r.altAmount) return `Your stores hold ${fmt(cityHolds(s, ware))} ${WARE_NAMES[ware]}, less than ${fmt(r.altAmount)}`;
    const g = giftWay(s, map, d.city, false);
    return 'why' in g ? g.why : '';
  }
  if (act === 'refuse') {
    if (r.phase !== 'threat') return 'The raiders are already on their way';
    return d.gift ? 'What you sent is on its way' : '';
  }
  return 'Not an answer to a threat';
}

/** Answer a threat (a command, through favours.ts's `answer`). */
export function answerThreat(s: SimState, map: CoastMap, d: Deal, act: string): void {
  const r = raidOf(s.world, d.id);
  if (!r || threatRefusal(s, map, d, act) !== '') return;
  if (act === 'refuse') {
    gather(s, r, true);
    return;
  }
  if (act === 'send' && r.loan) {
    payDebt(s, r.loan);
    return;
  }
  if (act === 'send') {
    d.good = -1;
    d.amount = r.coin;
    // The band out: the coin goes to it at once, and it turns back. Before: a herald takes it to them.
    if (bandOut(r)) {
      pay(s, -r.coin, 'peace', `to ${cityName(d.city)}`);
      callOff(s, r, 'paid');
      return;
    }
    const g = dispatch(s, map, d.city, -1, r.coin, d.id, 'peace');
    d.gift = g.id;
    s.rev++;
    return;
  }
  // The goods: fetched and sent as a gift is; they count when they reach their city.
  d.good = r.alt;
  d.amount = r.altAmount;
  const g = dispatch(s, map, d.city, TRADE_GOODS[r.alt], r.altAmount, d.id, 'peace');
  d.gift = g.id;
  s.rev++;
}

/** What you sent for a threat has reached their city: the price of peace (a band out turns back). After the raid, too late: it counts as a gift. */
export function peaceArrived(s: SimState, g: Gift, d: Deal): void {
  const c = cityOf(s.world, d.city);
  d.gift = 0;
  d.got = g.amount;
  const r = raidOf(s.world, d.id);
  // (Arriving while the band is already leaving your land with what it took: too late for peace, as paying then is.)
  if (r && live(r) && d.state === 'open' && !(r.phase === 'raiding' && raidersOf(s, r)?.back)) {
    callOff(s, r, 'paid');
    return;
  }
  // Too late for peace: they take it as a gift.
  const m = giftMemory(s, c, g.good, g.amount, s.tick);
  c.memories.push(m);
  const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
  news(s.world, s.tick, d.city, `Your ${giftWords(g.good, g.amount)} reached ${cityName(d.city)} after the raid: ${rulerShort(c)} takes it as a gift (+${m.amount})${turn ? `. ${turn}` : ''}`);
  s.rev++;
}

/** When goods sent now for a threat would reach their city (a tick), or -1 if they can't go. */
export function goodsArrive(s: SimState, map: CoastMap, r: Raid): number {
  if (r.alt < 0) return -1;
  const t = sendTicks(s, map, { city: r.city, good: r.alt, amount: r.altAmount });
  return t < 0 ? -1 : s.tick + t;
}

// ---------------------------------------------------------------------------
// People running indoors.

/** Where the bands on your map stand (x, z pairs); empty with none. */
export function bandsAt(s: SimState): number[] {
  const out: number[] = [];
  // Slice 55: and the monsters out of their lairs (walkers run indoors from them as from raiders).
  if (s.legends.monsters.length) monstersAbout(s, out);
  if (!s.world.raids.some((r) => r.phase === 'raiding')) return out;
  for (const w of s.walkers) {
    if (w.kind !== 'raider') continue;
    const [x, z] = position(w);
    out.push(x, z);
  }
  return out;
}

/** Has this walker run indoors from the raiders (within SHELTER tiles of a band; never the watchmen, the caravans or the raiders themselves)? */
export function sheltering(bands: readonly number[], w: Walker): boolean {
  if (!bands.length || w.kind === 'raider' || w.kind === 'watchman' || w.kind === 'caravan' || w.path.length < 2) return false;
  const [x, z] = position(w);
  for (let i = 0; i < bands.length; i += 2) if (dhypot(bands[i] - x, bands[i + 1] - z) < SHELTER) return true;
  return false;
}

// ---------------------------------------------------------------------------
// On the map of Greece, and in words.

/** Where a band is on the map of Greece at a tick: a distance along its way from your city, which way it faces, and whether it is gathering; null while there is none to see (a threat, in your city, over). */
export function raidOnMap(r: Raid, tick: number): { along: number; homeward: boolean; gathering: boolean } | null {
  // (Biding its time at home, before it gathers: nothing to see yet.)
  if (r.phase === 'gathering') return tick < r.start ? null : { along: r.a0, homeward: false, gathering: true };
  if (r.phase !== 'marching' && r.phase !== 'homeward' && r.phase !== 'turned') return null;
  const u = Math.max(0, Math.min(1, (tick - r.start) / Math.max(1, r.dur)));
  return { along: r.a0 + (r.a1 - r.a0) * u, homeward: r.phase !== 'marching', gathering: false };
}

/** "12 June 748 BC". */
const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName} ${formatYear(d.yearBC)}`;
};

/** " in the market quarter": where a stretch of wall stands, for the band's line (nothing without the map). */
function wallWhere(map: CoastMap | undefined, t: number): string {
  if (!map) return '';
  const n = map.size;
  const title = districtTitle(districtAt(map, (t % n) + 0.5, Math.floor(t / n) + 0.5));
  return title ? ` ${title[0].toLowerCase()}${title.slice(1)}` : '';
}

/** A live raid in a few words, for the top bar's chip: "Sparta's raiders · 12 days", "Raiders in the city"; '' for a threat (it has its line) or a band settled. */
export function raidChip(s: SimState, r: Raid, map?: CoastMap): { chip: string; line: string } | null {
  // Slice 60: and the god who marches with the band, if any: "Ares with them".
  const out = bandChip(s, r, map);
  const god = out ? marchWords(s, r) : null;
  return out && god ? { chip: `${out.chip} · ${god.chip}`, line: `${out.line}. ${god.line}` } : out;
}

function bandChip(s: SimState, r: Raid, map?: CoastMap): { chip: string; line: string } | null {
  if (!live(r) && !(r.phase === 'raiding' && raidersOf(s, r))) return null;
  const name = cityName(r.city);
  if (r.phase === 'threat') return null;
  // From the sea, not landed yet: the ships in the bay.
  if (r.phase === 'raiding' && r.shore >= 0 && r.landed === 0) {
    const ships = shipsOf(s, r);
    const n = ships.length;
    const aim = findBuilding(s, r.target);
    const at = aim ? aimWords(aim) : aimWords({ kind: r.aim as BuildingKind });
    const up = ships.every((e) => e.state === 'beached');
    const days = map && !up ? daysToBeach(s, map, r) : 0;
    const men = ships.reduce((a, e) => a + e.men, 0);
    const sunk = r.sunk ? ` (${r.sunk} sunk)` : '';
    return {
      chip: `${name}’s ships · ${n} in the bay`,
      line: `${n} of ${whose(r.city)} ships${sunk} ${up ? 'are drawn up on your beach, their men landing' : `are sailing in for your beach, ${men} men aboard: they land in about ${days === 1 ? 'a day' : `${days} days`}`}, for ${at}${r.loan ? ', come to collect what you owe' : live(r) ? `. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back` : ''}`,
    };
  }
  if (r.phase === 'raiding') {
    const band = raidersOf(s, r);
    const aim = band ? findBuilding(s, band.target) : undefined;
    const at = aim ? aimWords(aim) : aimWords({ kind: r.aim as BuildingKind });
    // Every place it makes for, in turn: "the granary, then the tax office".
    const rest = r.next.map((id) => findBuilding(s, id)).filter((b): b is Building => !!b).map(aimWords).join(', then ');
    const ats = rest ? `${at}, then ${rest}` : at;
    const loot = lootWords(r);
    const wall = band && besieging(s, r, band) ? wallAt(s, r.siege) : undefined;
    const doing = !band ? '' : r.broke ? `beaten, running for ${runFor(r)}${loot ? ` with ${loot}` : ''}` : band.back || r.end !== '' ? (wall ? `hammering at your ${wall.gate ? 'gate' : 'wall'}${wallWhere(map, r.siege)} to get out${loot ? ` with ${loot}` : ''}` : loot ? `making off with ${loot}` : r.end === 'paid' ? 'paid off, leaving your land' : 'leaving your land') : r.fought >= s.tick - 1 ? `fighting your soldiers on their way to ${ats}` : wall ? `hammering at your ${wall.gate ? 'gate' : 'wall'}${wallWhere(map, r.siege)}, to get at ${ats}` : band.wait > 0 ? (aim && FIELDS[aim.kind] !== undefined ? `firing ${at}` : `plundering ${at}`) + (rest ? `, then making for ${rest}` : '') : `making for ${ats}`;
    const left = bandMen(r) - r.fallen;
    // (A lender's army (slice 28) came for what you owe: it can't be paid off once it is in.)
    if (r.loan) return { chip: r.fought >= s.tick - 1 && !r.broke ? 'Fighting in the city' : 'Collectors in the city', line: `${left} of ${whose(r.city)} men, come to collect what you owe, are in your city${r.fallen ? ` (${r.fallen} fallen)` : ''}, ${doing}` };
    return { chip: r.fought >= s.tick - 1 && !r.broke ? 'Fighting in the city' : 'Raiders in the city', line: `${left} of ${whose(r.city)} raiders are in your city${r.fallen ? ` (${r.fallen} fallen)` : ''}, ${doing}${live(r) && !band?.back ? `. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back` : ''}` };
  }
  const days = daysToEdge(r, s.tick);
  const when = `${days === 1 ? '1 day' : `${days} days`}`;
  if (r.loan)
    return {
      chip: `${name}’s army · ${r.men} men · ${when}`,
      line: `${whose(r.city)} army ${r.phase === 'gathering' ? 'is gathering' : 'is on the march'} to collect what you owe, ${r.men} men: ${edgeWords(r)} in about ${when} (${dayWords(reachesEdge(s, r))}). Pay the ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`,
    };
  return {
    chip: `${name}’s raiders · ${r.men} men · ${when}`,
    line: `${whose(r.city)} raiders ${r.phase === 'gathering' ? (s.tick < r.start ? 'bide their time at home' : 'are gathering') : r.by === 'sea' ? 'are at sea' : 'are on the march'}, ${r.men} men: ${edgeWords(r)} in about ${when} (${dayWords(reachesEdge(s, r))}). Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`,
  };
}

/** The standing line under the top bar for a live threat or band (the most pressing thing a ruler waits on you for). */
export function raidLine(s: SimState, map: CoastMap, r: Raid): string {
  // Slice 60: a threat's line names the god who will march with the band, too (the band's chip does, once it sets out).
  const line = threatLine(s, map, r);
  const god = r.phase === 'threat' && line ? marchWords(s, r) : null;
  return god ? `${line}. ${god.line}` : line;
}

function threatLine(s: SimState, map: CoastMap, r: Raid): string {
  const c = cityOf(s.world, r.city);
  const d = dealOf(s.world, r.deal);
  const name = cityName(r.city);
  if (r.phase === 'threat' && d) {
    const days = Math.max(0, Math.ceil((d.due - s.tick) / TICKS_PER_DAY));
    if (d.gift) return `${whose(r.city)} price of peace is on its way: ${rulerShort(c)} waits for it`;
    void map;
    if (r.loan) return `${rulerName(c)} sends to collect what you owe: pay the ${fmt(r.coin)} dr by ${dayWords(d.due)} (${days === 1 ? '1 day' : `${days} days`}), or about ${r.men} of ${his(c)} men will come and take it. Answer on ${name}’s page`;
    return `${rulerName(c)} threatens your city: pay ${fmt(r.coin)} dr${r.alt >= 0 ? ` or send ${giftWords(r.alt, r.altAmount)}` : ''} by ${dayWords(d.due)} (${days === 1 ? '1 day' : `${days} days`}), or ${his(c)} raiders will come, about ${r.men} men. Answer on ${name}’s page`;
  }
  return raidChip(s, r, map)?.line ?? '';
}

/** What the raiders are doing, for their hover tip. */
export function raiderDoing(s: SimState, w: Walker): { title: string; detail: string } {
  const r = raidOfBand(s, w);
  const city = CITY_IDS[w.food] ?? 'sparta';
  const name = cityName(city);
  const title = r?.loan ? `${name}’s collectors` : `Raiders of ${name}`;
  const kit = r?.loan ? `${w.people} men in ${whose(city)} colours, come for what you owe${r.fallen ? ` (${r.fallen} fallen)` : ''}` : `${w.people} men in ${whose(city)} colours, with shields and torches${r && r.fallen ? ` (${r.fallen} fallen)` : ''}`;
  const b = findBuilding(s, w.target);
  const aim = b ? aimWords(b) : 'what they came for';
  const loot = r ? lootWords(r) : '';
  if (r && r.broke) return { title, detail: `${kit} · beaten: half of them have fallen, and the rest run for ${r ? runFor(r) : 'the edge'}${loot ? `, with ${loot} in their sacks` : ''}` };
  if (r && r.fought >= s.tick - 1) return { title, detail: `${kit} · fighting your soldiers on their way to ${aim}` };
  if (w.back) {
    const why = r && r.end === 'paid' ? `paid off, they are leaving your land` : r && r.end === 'called' ? `called off, they are leaving your land` : r && r.shore >= 0 && r.landed > 0 ? 'going back to their ships' : 'leaving your land the way they came';
    return { title, detail: `${kit} · ${loot ? `${why}, with ${loot} in their sacks` : why}` };
  }
  if (w.wait > 0 && r?.loan) return { title, detail: `${kit} · ${b?.kind === 'taxoffice' ? 'taking the treasury’s drachmas' : `emptying ${aim}`}, up to what is owed` };
  if (w.wait > 0) return { title, detail: `${kit} · ${b && FIELDS[b.kind] !== undefined ? `setting fire to ${aim} and emptying its barn` : b?.kind === 'taxoffice' ? 'breaking into the tax office for the treasury’s drachmas' : `plundering ${aim}`}` };
  return { title, detail: `${kit} · crossing your land to ${aim}${r && live(r) && !r.loan ? ` · pay ${fmt(r.coin)} dr on ${name}’s page to turn them back` : ''}` };
}
