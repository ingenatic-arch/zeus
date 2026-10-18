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
 * - **On your map.** It comes in at the edge nearest their city, at the open
 *   tile nearest its target: the field or store nearest that edge worth the
 *   trouble (a farm, a pasture or an olive grove; a granary or a storehouse
 *   with 300 or more in it), never a house. It crosses the land as a hunter
 *   does (roads and open ground, round buildings), spends two days there
 *   (a field set alight through the fire code, and what is in its barn
 *   carried off; a store plundered, up to 80 a man and never more than half
 *   of it), and walks off the way it came. Walkers near it run indoors.
 * - **Stopping them.** Paying in coin while the band is out pays at once and
 *   turns it round wherever it is; goods count when they reach their city;
 *   anything that lifts the ruler's mood past cold calls it off.
 * - **Afterwards.** The anger is partly spent (a memory), and a lull: no
 *   threat from that ruler for a year, and none from anyone for three months.
 *
 * One threat (or band) at a time across Greece; while one is live no ruler
 * makes a new request, offer or demand (favours.ts). Nothing here runs in a
 * town that has never opened a route. What is random is a hash of Greece's
 * seed and the month or the raid's number. Pure.
 */
import type { CoastMap } from '../map/bake';
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
import type { Building, BuildingKind, Deal, Gift, Raid, SimState, Walker, World, WorldCity } from './state';
import { note } from './stockbook';
import { cityHolds, TRADE_GOODS } from './trade';
import { pay, spendable } from './treasury';
import { newWalker, offMapPoint, position, setPath, WALK_SPEED } from './walk';
import { lineClear, offRoadPath, prunePath, walkable } from './wild';
import { cityOf, COLD, HOSTILE, moodOf, rulerName, rulerShort, sellsAndBuys } from './world';

// ---------------------------------------------------------------------------
// The numbers.

/** A threat's deadline, at the least (longer if goods would take longer to send). */
export const THREAT_DAYS = 2 * TICKS_PER_MONTH;
/** How long the band gathers at their city before it marches. */
export const GATHER = 10 * TICKS_PER_DAY;
/** A war band on the road is a little slower than a trader's caravan. */
const MARCH_SLOWER = 1.2;
/** After a raid (or a band paid off or called off): no threat from that ruler for a year, and none from anyone for three months. */
export const LULL = TICKS_PER_YEAR;
const GREECE_LULL = 3 * TICKS_PER_MONTH;
/** A hostile, proud or warlike ruler threatens about one month in six. */
const HOSTILE_ODDS = 1 / 6;
/** A tribute marked angry still gets its threat for this long after it was refused (if another threat held it back). */
const ANGRY_FOR = TICKS_PER_YEAR;
/** The price of peace: this much of a fair gift for your size, in coin (300 to 2,500 dr), or goods worth the same. */
const PEACE_VALUE = 1.2;
const PEACE_LEAST = 300;
const PEACE_MOST = 2500;
/** A band is 8 to 12 men. */
const MEN_LEAST = 8;
const MEN_MOST = 12;
/** They cross your land at a run. */
export const RAID_SPEED = WALK_SPEED * 1.6;
/** How long they spend at their target (firing it, or loading up). */
export const AT_TARGET = 2 * TICKS_PER_DAY;
/** What each man carries off, at most; never more than half of what a store holds. */
const CARRY = 80;
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
export const RAID_SIDE: Record<CityId, 'north' | 'west' | 'east' | 'south'> = { home: 'north', athens: 'north', corinth: 'north', sparta: 'west', troy: 'east', tyre: 'east' };

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

/** How long a city's band takes on the map, from their city to your edge (or your gulf). */
export function marchTicks(city: CityId): number {
  return routeWay(city, 'land') ? Math.round(landTicks(city) * MARCH_SLOWER) : voyageTicks(city);
}

/** The price of peace in coin, for a city your size. */
export const peaceCoin = (s: SimState): number => clamp(Math.round((PEACE_VALUE * fairGift(s)) / 50) * 50, PEACE_LEAST, PEACE_MOST);

// ---------------------------------------------------------------------------
// The threat.

/** May this ruler threaten now: no threat or band live in Greece, none ended in the last three months, theirs not within a year? */
export function mayThreaten(s: SimState, city: CityId): boolean {
  const w = s.world;
  if (threatLive(w)) return false;
  return !w.raids.some((r) => (r.ended > 0 && s.tick - r.ended < GREECE_LULL) || (r.city === city && r.ended > 0 && s.tick - r.ended < LULL));
}

/**
 * A ruler threatens your city: the price of peace (coin, or goods they are
 * short of that your city could send), a deadline at least two months off
 * (longer if the goods need it, or if raiders would otherwise reach you
 * within a year of your first route), and a line of news that can't wait.
 */
export function threaten(s: SimState, map: CoastMap, c: WorldCity, cause: string): Raid {
  const w = s.world;
  const coin = peaceCoin(s);
  // The goods they would take instead: one they are short of that your stores hold and you could send them.
  const n = w.nextRaid;
  const canGoods = !('why' in giftWay(s, map, c.id, false));
  const worth = (k: number): number => clamp(Math.round((coin * 100) / Math.max(1, c.price[k]) / 100) * 100, 200, 2000);
  const goods = canGoods ? sellsAndBuys(c).buys.filter((k) => cityHolds(s, TRADE_GOODS[k]) >= worth(k)) : [];
  const alt = goods.length ? goods[Math.floor(dice(w, n, 0, 1) * goods.length)] : -1;
  const altAmount = alt >= 0 ? worth(alt) : 0;
  const first = firstRoute(w);
  const march = marchTicks(c.id);
  let days = Math.max(deadlineFor(s, map, c.id, -1, coin, THREAT_DAYS), alt >= 0 ? deadlineFor(s, map, c.id, alt, altAmount, THREAT_DAYS) : 0);
  // (No raiders at your edge within a year of your first route.)
  if (first) days = Math.max(days, first + TICKS_PER_YEAR - GATHER - march - s.tick);
  days = Math.ceil(days / TICKS_PER_DAY) * TICKS_PER_DAY;
  const why = cause;
  const d = makeDeal(s, 'threat', c.id, -1, coin, s.tick + days, why);
  const land = !!routeWay(c.id, 'land');
  const { id: way } = wayFor(c.id, land ? 'land' : 'sea');
  const r: Raid = {
    id: w.nextRaid++,
    deal: d.id,
    city: c.id,
    men: MEN_LEAST + Math.floor(dice(w, n, 0, 2) * (MEN_MOST - MEN_LEAST + 1)),
    phase: 'threat',
    by: land ? 'land' : 'sea',
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
    ended: 0,
    end: '',
  };
  w.raids.push(r);
  if (!w.contact) w.contact = Math.max(1, s.tick);
  news(w, s.tick, c.id, `${rulerName(c)} is out of patience: pay ${fmt(coin)} dr${alt >= 0 ? ` or send ${giftWords(alt, altAmount)}` : ''} ${dueIn(days, s.tick + days)}, or ${his(c)} raiders will come`, true);
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
  }
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const r of w.raids) {
    if (!live(r)) continue;
    const c = cityOf(w, r.city);
    const d = dealOf(w, r.deal);
    // Their mood mended past cold (a gift, or time): the threat is called off, the band turned back.
    if (moodOf(c, s.tick) > COLD) {
      callOff(s, r, 'called');
      continue;
    }
    if (r.phase === 'threat' && d && s.tick >= d.due && d.gift === 0) gather(s, r, false);
  }
  if (s.tick % TICKS_PER_MONTH === 0) {
    if (w.raids.some((r) => r.phase === 'done' && s.tick - r.ended > LULL)) w.raids = w.raids.filter((r) => !(r.phase === 'done' && s.tick - r.ended > LULL));
    threats(s, map);
  }
}

const dealOf = (w: World, id: number): Deal | undefined => w.deals.find((d) => d.id === id);

/** On the first of the month: a tribute marked angry (refused while another threat ran) gets its threat; else a hostile ruler, proud or warlike, may threaten. */
function threats(s: SimState, map: CoastMap): void {
  const w = s.world;
  if (threatLive(w)) return;
  const owed = w.deals.find((d) => d.kind === 'tribute' && d.angry && d.ended > 0 && s.tick - d.ended < ANGRY_FOR && mayThreaten(s, d.city));
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
    if (!c.ruler || !RULED.includes(c.id) || !(t.includes('proud') || t.includes('warlike'))) continue;
    if (moodOf(c, s.tick) > HOSTILE || !mayThreaten(s, c.id)) continue;
    if (dice(w, month, i, 31) >= HOSTILE_ODDS) continue;
    threaten(s, map, c, `${rulerShort(c)} is hostile to your city, and ${t.includes('warlike') ? 'warlike' : 'proud'}`);
    return;
  }
}

/** The band gathers at their city (the day passed with nothing sent, or you refused). */
export function gather(s: SimState, r: Raid, refused: boolean): void {
  const c = cityOf(s.world, r.city);
  const { L } = wayFor(r.city, r.by);
  r.phase = 'gathering';
  r.start = s.tick;
  // (Ten days; longer, so that no raiders reach your edge within a year of your first route.)
  const first = firstRoute(s.world);
  r.dur = Math.ceil(Math.max(GATHER, first ? first + TICKS_PER_YEAR - marchTicks(r.city) - s.tick : 0) / TICKS_PER_DAY) * TICKS_PER_DAY;
  r.a0 = L;
  r.a1 = L;
  const days = Math.round((r.dur + marchTicks(r.city)) / TICKS_PER_DAY);
  news(s.world, s.tick, r.city, `${refused ? `You defied ${rulerShort(c)}: ` : ''}${whose(r.city)} raiders gather to march on your city, ${r.men} men: at the ${RAID_SIDE[r.city]} edge of your land in about ${days} days. Pay ${fmt(r.coin)} dr to turn them back`, true);
  s.rev++;
}

/** The band sets out along the road (or the lane) to your edge. */
function march(s: SimState, r: Raid): void {
  r.phase = 'marching';
  r.start = s.tick;
  r.dur = marchTicks(r.city);
  r.a1 = r.by === 'land' ? EDGE_ALONG : HORIZON_ALONG;
  s.rev++;
}

/** Days until the band reaches your edge (gathering or marching), at least 1. */
export function daysToEdge(r: Raid, tick: number): number {
  const at = r.phase === 'gathering' ? r.start + r.dur + marchTicks(r.city) : r.phase === 'marching' ? r.start + r.dur : tick;
  return Math.max(1, Math.ceil((at - tick) / TICKS_PER_DAY));
}

/** When the band reaches your edge (a tick), from the threat's day if it has not set out. */
export function reachesEdge(s: SimState, r: Raid): number {
  if (r.phase === 'gathering') return r.start + r.dur + marchTicks(r.city);
  if (r.phase === 'marching') return r.start + r.dur;
  const d = dealOf(s.world, r.deal);
  return (d ? Math.max(d.due, s.tick) : s.tick) + GATHER + marchTicks(r.city);
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
  if (!STORES.includes(b.kind)) return false;
  return WARES.reduce((a, w) => a + held(b, w), 0) >= STORE_WORTH;
}

/** The open tiles along an edge. */
function edgeTiles(map: CoastMap, s: SimState, side: string): number[] {
  const n = map.size;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = side === 'north' ? i : side === 'south' ? (n - 1) * n + i : side === 'west' ? i * n : i * n + n - 1;
    if (walkable(map, s, t)) out.push(t);
  }
  return out;
}

/**
 * Where a band comes in and what it goes for: of the fields and stores worth
 * it, the nearest to the edge on their side (trying the next few if no way
 * leads to one), in at the open edge tile nearest it, and the way there
 * across the land. Null if nothing worth it can be reached from that edge.
 */
export function landing(s: SimState, map: CoastMap, city: CityId): { edge: number; target: Building; path: Array<[number, number, number]> } | null {
  const size = map.size;
  const side = RAID_SIDE[city];
  const edges = edgeTiles(map, s, side);
  if (!edges.length) return null;
  const targets = s.buildings.filter(worthRaiding).sort((a, b) => fromEdge(size, a, side) - fromEdge(size, b, side) || a.id - b.id);
  for (const b of targets.slice(0, TRIES)) {
    const [cx, cz] = centreOf(b);
    const goals = around(size, b).filter((t) => walkable(map, s, t));
    if (!goals.length) continue;
    // The side of it facing the edge they come from; in at whichever open edge tile is the shortest walk from it.
    const toEdge = (t: number): number => edgeDistance(size, t % size, Math.floor(t / size), side);
    goals.sort((p, q) => toEdge(p) - toEdge(q) || Math.hypot((p % size) - cx, Math.floor(p / size) - cz) - Math.hypot((q % size) - cx, Math.floor(q / size) - cz) || p - q);
    const tiles = offRoadPath(map, s, edges, goals[0]);
    if (!tiles) continue;
    const edge = tiles[0];
    const [ox, oz] = offMapPoint(size, edge);
    const path: Array<[number, number, number]> = [[ox, oz, -1]];
    for (const [px, pz] of prunePath(map, s, tiles)) path.push([px, pz, -1]);
    return { edge, target: b, path };
  }
  return null;
}

/** The band reaches your edge: in it comes, for its target (or, with nothing worth taking in reach, it goes home). */
function arrive(s: SimState, map: CoastMap, r: Raid): void {
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
  const band = newWalker(s, 'raider', r.men);
  band.origin = at.target.id;
  band.target = at.target.id;
  band.home = r.id;
  band.food = CITY_IDS.indexOf(r.city);
  band.meat = -1;
  band.since = s.tick;
  setPath(band, at.path);
  s.walkers.push(band);
  news(w, s.tick, r.city, `Raiders! ${r.men} of ${whose(r.city)} men are in at the ${RAID_SIDE[r.city]} edge of your land, making for ${aimWords(at.target)}. People are running indoors. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`, true);
  void c;
  s.rev++;
}

/** "the farm", "the granary": what they make for. */
export const aimWords = (b: Pick<Building, 'kind'>): string => (b.kind === 'grove' ? 'the olive grove' : b.kind === 'pasture' ? 'the sheep pasture' : `the ${b.kind}`);

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
  if (walkable(map, s, t)) return [t];
  return [t - size, t - 1, t + 1, t + size, t - size - 1, t - size + 1, t + size - 1, t + size + 1].filter((u) => u >= 0 && u < size * size && walkable(map, s, u));
}

/** Off the way they came: to the edge tile they came in by (or the nearest open edge), and off the map. False if there is no way at all. */
function headOff(s: SimState, map: CoastMap, w: Walker, r: Raid | undefined): boolean {
  const size = map.size;
  const [x, z] = position(w);
  w.back = true;
  w.wait = 0;
  const starts = startsAt(map, s, x, z);
  const edge = r && r.edge >= 0 ? r.edge : -1;
  const tiles = edge >= 0 && starts.length ? offRoadPath(map, s, starts, edge) : null;
  if (tiles) {
    const way: Array<[number, number, number]> = [[x, z, -1]];
    for (const [px, pz] of prunePath(map, s, tiles)) way.push([px, pz, -1]);
    const [ox, oz] = offMapPoint(size, edge);
    way.push([ox, oz, -1]);
    setPath(w, way);
    return true;
  }
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
  const goals = around(size, b).filter((t) => walkable(map, s, t));
  if (!starts.length || !goals.length) return false;
  let best: number[] | null = null;
  for (const g of goals.slice(0, 4)) {
    const p = offRoadPath(map, s, starts, g);
    if (p && (!best || p.length < best.length)) best = p;
  }
  if (!best) return false;
  const way: Array<[number, number, number]> = [[x, z, -1]];
  for (const [px, pz] of prunePath(map, s, best)) way.push([px, pz, -1]);
  setPath(w, way);
  return true;
}

/** Move the raiders one tick: across the land to their target, two days there, and off the way they came. False when they have left your map. */
export function moveRaider(s: SimState, map: CoastMap, w: Walker): boolean {
  const r = raidOfBand(s, w);
  if (w.wait > 0) {
    if (--w.wait > 0) return true;
    strike(s, w, r);
    return headOff(s, map, w, r) || gone(s, w, r);
  }
  // Paid off or called off on the way in: they turn for the edge from where they stand.
  if (!w.back && r && r.end !== '') {
    if (!headOff(s, map, w, r)) return gone(s, w, r);
  }
  let move = RAID_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
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
      const offMap = (x: number, z: number): boolean => x < 0 || z < 0 || x >= map.size || z >= map.size;
      if (!offMap(w.path[j], w.path[j + 1]) && !offMap(w.path[j + 2], w.path[j + 3]) && !lineClear(map, s, w.path[j], w.path[j + 1], w.path[j + 2], w.path[j + 3], walkable)) {
        if (!(w.back ? headOff(s, map, w, r) : reaim(s, map, w) || headOff(s, map, w, r))) return gone(s, w, r);
      }
      continue;
    }
    // The end of the way: off the map, or at the target.
    if (w.back) return gone(s, w, r);
    const b = findBuilding(s, w.target);
    if (!b || b.kind === 'rubble' || (r && r.end !== '')) return headOff(s, map, w, r) || gone(s, w, r);
    w.wait = AT_TARGET;
    break;
  }
  return true;
}

/** At the target: a field set alight (and its barn emptied), a store plundered (or, almost empty, set alight). */
function strike(s: SimState, w: Walker, r: Raid | undefined): void {
  const b = findBuilding(s, w.target);
  if (!b || !r || r.end !== '') return;
  const city = r.city;
  const most = w.people * CARRY;
  const field = FIELDS[b.kind];
  let ware = -1;
  let took = 0;
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
  if (ware >= 0 && took > 0) {
    setHeld(b, ware, held(b, ware) - took);
    note(s, ware, 'lost', `raid:${city}`, took);
    pay(s, 0, 'raid', `${cityName(city)} · ${WARE_NAMES[ware]}`, took);
    w.load = took;
    w.meat = ware;
    r.ware = ware;
    r.took = took;
    s.looks++;
  }
  // Fields are fired; a store too, if there was little in it.
  // (Not with fire switched off, as while a demo's history is built: it would never burn out.)
  if (s.hazards && (field !== undefined || took < STORE_WORTH / 2) && burnable(b) && b.fire !== FIRE_BURNING) {
    ignite(s, b);
    r.fired = true;
  }
  s.rev++;
}

/** The raiders have left your map (or could get nowhere): home along the way on the map; the raid is over, the anger spent. */
function gone(s: SimState, w: Walker, r: Raid | undefined): false {
  if (!r) return false;
  home(s, r);
  if (r.end === '') settle(s, r, 'raided');
  else {
    // (Paid off or called off while in your city: they go with what they took.)
    news(s.world, s.tick, r.city, `${whose(r.city)} raiders have left your land${r.took ? `, with ${fmt(r.took)} ${WARE_NAMES[r.ware]}` : ''}`, true);
  }
  void w;
  return false;
}

/** The band heads home along the way on the map from your edge (or your gulf). */
function home(s: SimState, r: Raid): void {
  const { L } = wayFor(r.city, r.by);
  r.phase = 'homeward';
  r.start = s.tick;
  r.dur = marchTicks(r.city);
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
  if (how === 'raided' || how === 'nothing') {
    const lost = r.took ? `${fmt(r.took)} ${WARE_NAMES[r.ware]} carried off` : '';
    const what = [lost, r.fired ? `${r.aim === 'grove' ? 'the olive grove' : r.aim === 'pasture' ? 'the sheep pasture' : `the ${r.aim}`} set alight` : ''].filter(Boolean).join(', ');
    const m = answerMemory(c, 'spent', `their raid has eased ${rulerWord(c).replace(/^the /, 'the ')}’s temper`, s.tick);
    c.memories.push(m);
    const turn = settleMood(s, c, '§', true).replace(/: §$/, '');
    if (how === 'raided') news(w, s.tick, r.city, `${whose(r.city)} raiders have gone${what ? `: ${what}` : ''}. Their raid has eased ${rulerShort(c)}’s temper (+${m.amount})${turn ? `. ${turn}` : ''}`, true);
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
  if (how === 'paid') c.memories.push(answerMemory(c, 'peace', `you paid them to call off their raiders (${r.alt >= 0 && dealOf(w, r.deal)?.good === r.alt ? giftWords(r.alt, r.altAmount) : `${fmt(r.coin)} dr`})`, s.tick));
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
    r.dur = Math.max(1, Math.round(u * marchTicks(r.city)));
    r.a0 = along;
    r.a1 = L;
  }
  // (In your city: the band sees it next tick and heads off, moveRaider.)
  const band = was === 'raiding' ? ' turn back' : was === 'threat' ? '' : ' turn round on the road home';
  const line =
    how === 'paid'
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
  if (act === 'send') {
    d.good = -1;
    d.amount = r.coin;
    // The band out: the coin goes to it at once, and it turns back. Before: a herald takes it to them.
    if (bandOut(r)) {
      pay(s, -r.coin, 'peace', cityName(d.city));
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
  if (r && live(r) && d.state === 'open') {
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
  for (let i = 0; i < bands.length; i += 2) if (Math.hypot(bands[i] - x, bands[i + 1] - z) < SHELTER) return true;
  return false;
}

// ---------------------------------------------------------------------------
// On the map of Greece, and in words.

/** Where a band is on the map of Greece at a tick: a distance along its way from your city, which way it faces, and whether it is gathering; null while there is none to see (a threat, in your city, over). */
export function raidOnMap(r: Raid, tick: number): { along: number; homeward: boolean; gathering: boolean } | null {
  if (r.phase === 'gathering') return { along: r.a0, homeward: false, gathering: true };
  if (r.phase !== 'marching' && r.phase !== 'homeward' && r.phase !== 'turned') return null;
  const u = Math.max(0, Math.min(1, (tick - r.start) / Math.max(1, r.dur)));
  return { along: r.a0 + (r.a1 - r.a0) * u, homeward: r.phase !== 'marching', gathering: false };
}

/** "12 June 748 BC". */
const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName} ${formatYear(d.yearBC)}`;
};

/** A live raid in a few words, for the top bar's chip: "Sparta's raiders · 12 days", "Raiders in the city"; '' for a threat (it has its line) or a band settled. */
export function raidChip(s: SimState, r: Raid): { chip: string; line: string } | null {
  if (!live(r) && !(r.phase === 'raiding' && raidersOf(s, r))) return null;
  const name = cityName(r.city);
  if (r.phase === 'threat') return null;
  if (r.phase === 'raiding') {
    const band = raidersOf(s, r);
    const doing = !band ? '' : band.back ? (band.load ? `making off with ${fmt(band.load)} ${WARE_NAMES[band.meat]}` : 'leaving your land') : band.wait > 0 ? (FIELDS[r.aim as BuildingKind] !== undefined ? `firing ${aimWords({ kind: r.aim as BuildingKind })}` : `plundering ${aimWords({ kind: r.aim as BuildingKind })}`) : `making for ${aimWords({ kind: r.aim as BuildingKind })}`;
    return { chip: 'Raiders in the city', line: `${r.men} of ${whose(r.city)} raiders are in your city, ${doing}${live(r) ? `. Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back` : ''}` };
  }
  const days = daysToEdge(r, s.tick);
  const when = `${days === 1 ? '1 day' : `${days} days`}`;
  return {
    chip: `${name}’s raiders · ${when}`,
    line: `${whose(r.city)} raiders ${r.phase === 'gathering' ? 'are gathering' : 'are on the march'}, ${r.men} men: at the ${RAID_SIDE[r.city]} edge of your land in about ${when} (${dayWords(reachesEdge(s, r))}). Pay ${fmt(r.coin)} dr on ${whose(r.city)} page to turn them back`,
  };
}

/** The standing line under the top bar for a live threat or band (the most pressing thing a ruler waits on you for). */
export function raidLine(s: SimState, map: CoastMap, r: Raid): string {
  const c = cityOf(s.world, r.city);
  const d = dealOf(s.world, r.deal);
  const name = cityName(r.city);
  if (r.phase === 'threat' && d) {
    const days = Math.max(0, Math.ceil((d.due - s.tick) / TICKS_PER_DAY));
    if (d.gift) return `${whose(r.city)} price of peace is on its way: ${rulerShort(c)} waits for it`;
    void map;
    return `${rulerName(c)} threatens your city: pay ${fmt(r.coin)} dr${r.alt >= 0 ? ` or send ${giftWords(r.alt, r.altAmount)}` : ''} by ${dayWords(d.due)} (${days === 1 ? '1 day' : `${days} days`}), or ${his(c)} raiders will come. Answer on ${name}’s page`;
  }
  return raidChip(s, r)?.line ?? '';
}

/** What the raiders are doing, for their hover tip. */
export function raiderDoing(s: SimState, w: Walker): { title: string; detail: string } {
  const r = raidOfBand(s, w);
  const city = CITY_IDS[w.food] ?? 'sparta';
  const name = cityName(city);
  const title = `Raiders of ${name}`;
  const kit = `${w.people} men in ${whose(city)} colours, with shields and torches`;
  const b = findBuilding(s, w.target);
  const aim = b ? aimWords(b) : 'what they came for';
  if (w.back) {
    const why = r && r.end === 'paid' ? `paid off, they are leaving your land` : r && r.end === 'called' ? `called off, they are leaving your land` : 'leaving your land the way they came';
    return { title, detail: `${kit} · ${w.load ? `${why}, with ${fmt(w.load)} ${WARE_NAMES[w.meat]} in their sacks` : why}` };
  }
  if (w.wait > 0) return { title, detail: `${kit} · ${b && FIELDS[b.kind] !== undefined ? `setting fire to ${aim} and emptying its barn` : `plundering ${aim}`}` };
  return { title, detail: `${kit} · crossing your land to ${aim}${r && live(r) ? ` · pay ${fmt(r.coin)} dr on ${name}’s page to turn them back` : ''}` };
}
