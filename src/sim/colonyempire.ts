/**
 * A colonial empire (slice 47): your colonies as an empire, not a list.
 *
 * - **A company stationed in a colony.** Your ship sails in for it, its
 *   banner marches to the road beside the trading post, and a boat rows its
 *   men out to her, eight a trip; she sails along the colony's lane and the
 *   company holds the colony once she lands. While it is there raiders and
 *   claims fail more often (its might, on the same roll as the colony's walls
 *   and a soldier governor), and the colony is more loyal. Brought home the
 *   same way back: your ship in, the men rowed ashore, the march to barracks.
 * - **Triremes stationed in a colony** (colonies.ts keeps them in `ships`):
 *   they stay after a threat, unlike slice 37's guards.
 * - **Striking from a colony.** The stationed company raids a rival city
 *   from the colony: a shorter voyage than from home, no mustering. It counts
 *   as an expedition (expeditions.ts fights it), and comes back to the colony.
 * - **The colonies' trade.** Each colony trades with Greece on its own; your
 *   share comes in coin with its share ship (`colonytrade` in the ledger).
 * - **The militia.** A colony of town stage (loyal, not talking of freedom),
 *   and every free ally, sends its men when you are raided (by ship into your
 *   bay, ashore at the quay, to stand by what the raiders make for) and with
 *   your army to its wars (their might counted with yours).
 * - **A treaty for freedom.** A colony talking of freedom can be let go as a
 *   free ally: warm, trading with you, sending its militia.
 *
 * The records live in the `empire` field (`passages`, `militia`, `freed`) and
 * on each colony (`garrison`, `ships`). No new dice: nothing here rolls.
 * Nothing runs in a town with no colony, free ally, passage or militia.
 */
import type { CoastMap } from '../map/bake';
import { datan2, dhypot } from '../map/dmath';
import { HORIZON_ALONG, lineLength, PLACES, project, RULED, seaWayTo, siteLaneId, siteOf, SITES, wayOf, wayPoints, type CityId } from '../map/greece';
import { companyName, companyOf, kindWord, readyOf, sendBanner, slotAt, wayFrom } from './army';
import { MEN } from './folk';
import { around, centreOf, findBuilding } from './buildings';
import { walkable } from './wild';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import type { Command } from './commands';
import { news } from './diplomacy';
import { dayWords } from './favours';
import { held, setHeld, WARE_NAMES } from './foods';
import { roomFor } from './stores';
import { blockaded } from './lanes';
import { warOf } from './rivals';
import { roadsBeside } from './rounds';
import { visitorAt } from './routes';
import type { Company, Expedition, SimState, Soldier, Visitor } from './state';
import { note } from './stockbook';
import { leaveTicks, pastMouth, SAIL_IN, SHIP_ANCHORED, SHIP_COMING, SHIP_LEAVING, storeKind, TRADE_GOODS, tradingPost } from './trade';
import { income } from './treasury';
import { allyOf, aidGoal, vassalOf, SEASON, type Tribute } from './vassals';
import { cityOf, VOYAGE } from './world';
import { debtFrom, defenders, expeditionOut, MIGHT, oddsOf } from './expeditions';
import { marchTicks } from './raids';
import { routeWay } from './routes';
import { cargoesFor, callOff, newShip, ROW_TRIP, shipPace, stageOf, STAGE_NAMES, built, shipRefusal } from './colonyworks';
import { colonyOf, laneTicks, letGo, peopleOf, quaySpot, shipsHome, shipsRefusal, siteKey, siteRecord, stationShips, COLONY_CEILING, FREE_FROM, type Colony } from './colonies';
import { cargoActRefusal, loadingFor, sailNow } from './colonyworks';
import { hash2 } from '../map/noise';

// ---------------------------------------------------------------------------
// The records.

/** A colony's slice 47 fields (Colony extends these): the company stationed there (0 none) and your triremes stationed off it. */
export interface ColonyEmpire {
  garrison: number;
  ships: number[];
}

/**
 * A company's voyage to a colony (out) or back (home). Out: boarding (your
 * ship coming in, then at anchor while the boat rows the men out), leaving
 * (sailing out of the bay), sea, done. Home: sea, bay (your ship in, then at
 * anchor while the boat brings them ashore), done.
 */
export interface Passage {
  id: number;
  site: string;
  company: number;
  dir: 'out' | 'home';
  phase: 'boarding' | 'leaving' | 'sea' | 'bay' | 'done';
  ship: Visitor | null;
  /** The trading post, and the road tile beside it where the banner stands. */
  post: number;
  tile: number;
  /** When it was ordered; on the map, when the voyage began and how long it takes. */
  at: number;
  start: number;
  dur: number;
  /** The men aboard, and how many trips the boat has made. */
  men: number[];
  trips: number;
}

/**
 * A colony's (or a free ally's) militia: against a raid on your city (`raid`:
 * at sea, in your bay, ashore with its company, going home) or with your army
 * abroad (`exp`: counted at the fight, drawn on the map).
 */
export interface Militia {
  id: number;
  site: string;
  /** Its colony's (or free city's) name, for its company and the news. */
  name: string;
  raid: number;
  exp: number;
  men: number;
  phase: 'sea' | 'bay' | 'ashore' | 'home' | 'done';
  ship: Visitor | null;
  post: number;
  start: number;
  dur: number;
  company: number;
  /** Its men's ids once ashore. */
  ids: number[];
  /** What it did, in words. */
  line: string;
}

/** A colony set free by treaty: your ally. */
export interface FreeAlly {
  site: string;
  name: string;
  /** Who rules it (its governor when it was freed, or its council's first man). */
  ruler: string;
  since: number;
  /** When it was founded (it was yours from then). */
  founded: number;
  /** When its next ship with your share of its trade sets out; how many have come and what they brought. */
  next: number;
  sent: number;
  worth: number;
}

// ---------------------------------------------------------------------------
// The numbers.

/** The boat rows this many men a trip. */
const ROW_MEN = 8;
/** Your ship waits for the company this long at most. */
const WAIT_MOST = 60 * TICKS_PER_DAY;
/** A company's hold over raiders: so much for each man's might (MIGHT), at most so much. */
const HOLD_PER = 0.025;
const HOLD_MOST = 0.45;
/** Loyalty: a company there; each trireme stationed off it, and at most. */
const GARRISON_LOYALTY = 6;
const SHIP_LOYALTY = 2;
const SHIPS_LOYALTY_MOST = 6;
/** Its trade a year: drachmas a person at a town's rate; the stage's rate (outpost, settlement, town, city); a harbour's. */
const TRADE_PER = 4;
const TRADE_STAGE = [0.5, 0.75, 1, 1.25] as const;
const TRADE_HARBOUR = 1.5;
/** Your share of it: a third, halved under this loyalty; a free ally pays half of that. */
const TRADE_SHARE = 1 / 3;
const TRADE_LOW = 40;
const FREE_SHARE = 0.5;
/** The militia: from this stage, at this loyalty; a man for so many people, at least and at most. */
const MILITIA_STAGE = 2;
const MILITIA_LOYALTY = 40;
const MILITIA_PER = 40;
const MILITIA_LEAST = 8;
const MILITIA_MOST = 16;
/** A militiaman's might abroad (a hoplite of yours is 1.2). */
const MILITIA_MIGHT = 1;
/** A free ally grows by its own children: so much a year. */
const FREE_GROWTH = 0.03;
/** Wounded men stationed abroad heal this much a month. */
const HEAL = 35;
/** A free ally's mood: why it is warm. */
const FREED_WARMTH = 25;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const cityName = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const siteName = (site: string): string => siteOf(site)?.name ?? site;
const inTen = (p: number): string => `${Math.max(0, Math.min(10, Math.round(p * 10)))} in 10`;
const listWords = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const daysOf = (ticks: number): number => Math.max(1, Math.round(ticks / TICKS_PER_DAY));

// ---------------------------------------------------------------------------
// Looking things up.

/** A colony's fields, filled if a hand-made colony lacks them. */
export const garrisonOf = (s: SimState, c: Colony): Company | undefined => (c.garrison ? companyOf(s, c.garrison) : undefined);
export const shipsOf = (c: Colony): number[] => c.ships ?? [];
export const passagesFor = (s: SimState, site?: string): Passage[] => (s.empire.passages ?? []).filter((p) => p.phase !== 'done' && (!site || p.site === site));
/** A company's passage under way (out or home), if any. */
export const passageOf = (s: SimState, company: number): Passage | undefined => passagesFor(s).find((p) => p.company === company);
export const freedOf = (s: SimState, site: string): FreeAlly | undefined => (s.empire.freed ?? []).find((f) => f.site === site);
export const militiaOut = (s: SimState): Militia[] => (s.empire.militia ?? []).filter((m) => m.phase !== 'done');

/** The colony a company is stationed in (or on its way to or from), if any. */
export const postedTo = (c: Company): string => c.posted ?? '';

/** The men of a stationed company abroad with it. */
const menAway = (s: SimState, c: Company): Soldier[] => s.army.soldiers.filter((x) => x.company === c.id && x.state === 'away');

/** Is a company stationed in a colony now, there (not at sea, not out striking)? */
export function stationedThere(s: SimState, col: Colony): Company | undefined {
  const c = garrisonOf(s, col);
  return c && c.posted === col.site && c.away === -1 && c.order === 'away' && !passageOf(s, c.id) ? c : undefined;
}

/** A company's might (its men abroad), as an expedition counts it. */
const mightAway = (s: SimState, c: Company): number => menAway(s, c).filter((x) => x.hp >= 50).length * MIGHT[c.kind];

// ---------------------------------------------------------------------------
// Defence and loyalty (colonies.ts asks).

/** How often a colony's company turns raiders away by itself (0 to HOLD_MOST): 0 with none there. */
export function garrisonHold(s: SimState, col: Colony): number {
  const c = stationedThere(s, col);
  return c ? Math.round(Math.min(HOLD_MOST, HOLD_PER * mightAway(s, c)) * 100) / 100 : 0;
}

/** How often a company at home would turn raiders away from a colony once stationed there (its men ready now). */
export const wouldHold = (s: SimState, c: Company): number => Math.round(Math.min(HOLD_MOST, HOLD_PER * readyOf(s, c).length * MIGHT[c.kind]) * 100) / 100;

/** The loyalty a company stationed in a colony, and its triremes stationed off it, are worth (for the page). */
export const STATION_LOYALTY = { company: GARRISON_LOYALTY, ship: SHIP_LOYALTY, ships: SHIPS_LOYALTY_MOST } as const;
/** The militia's terms (for the page): from what stage and loyalty. */
export const MILITIA_TERMS = { stage: MILITIA_STAGE, loyalty: MILITIA_LOYALTY } as const;

/** The parts of a colony's defence against a threat, each with how often it turns them away by itself, and the whole (your triremes' odds as given: `ships` of them against `theirs`). */
export function defenceParts(s: SimState, col: Colony, own: number, ownWords: string, tri: number, triremes: number): { p: number; parts: Array<{ why: string; p: number }> } {
  const parts: Array<{ why: string; p: number }> = [];
  if (triremes > 0) parts.push({ why: `your ${triremes === 1 ? 'trireme' : `${triremes} triremes`} off its shore`, p: tri });
  const c = stationedThere(s, col);
  const g = garrisonHold(s, col);
  if (c && g > 0) parts.push({ why: `${companyName(c)} of ${kindWord(c.kind)} (${menAway(s, c).filter((x) => x.hp >= 50).length} men)`, p: g });
  if (own > 0) parts.push({ why: ownWords || 'its own men', p: own });
  const p = 1 - parts.reduce((a, x) => a * (1 - x.p), 1);
  return { p: Math.round(p * 100) / 100, parts };
}

/** Its own hold with its company: walls and a soldier governor (`own`, colonyworks.ts) and the company, on one roll. */
export const holdWith = (s: SimState, col: Colony, own: number): number => Math.round((1 - (1 - own) * (1 - garrisonHold(s, col))) * 100) / 100;

/** Who turned raiders away by themselves, in words: "its walls and the 1st company of hoplites". */
export function holdWords(s: SimState, col: Colony, ownWords: string): string {
  const c = stationedThere(s, col);
  const g = c ? `${companyName(c)} of ${kindWord(c.kind)}` : '';
  return listWords([ownWords, g].filter(Boolean));
}

/** Slice 47's reasons for a colony's loyalty: a company there, triremes stationed off it. */
export function empireCauses(s: SimState, col: Colony): Array<{ why: string; n: number }> {
  const out: Array<{ why: string; n: number }> = [];
  const c = garrisonOf(s, col);
  if (c && c.posted === col.site && !passageOf(s, c.id)) out.push({ why: `${companyName(c)} of ${kindWord(c.kind)}, stationed there to hold it`, n: GARRISON_LOYALTY });
  const n = shipsOf(col).length;
  if (n) out.push({ why: `your ${n === 1 ? 'trireme' : `${n} triremes`} stationed off its shore`, n: Math.min(SHIPS_LOYALTY_MOST, n * SHIP_LOYALTY) });
  return out;
}

// ---------------------------------------------------------------------------
// The colonies' trade.

/** The cities a colony (or free ally) trades with: its two nearest ruled cities not at war with you. */
export function tradesWith(s: SimState, site: string): CityId[] {
  const p = siteOf(site);
  if (!p) return [];
  const [sx, sz] = project(p.lon, p.lat);
  return RULED.filter((id) => id !== 'home' && cityOf(s.world, id).pop > 0 && !warOf(s.world, id))
    .map((id) => {
      const q = PLACES[id];
      const [x, z] = project(q.lon, q.lat);
      return { id, d: dhypot(x - sx, z - sz) };
    })
    .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1))
    .slice(0, 2)
    .map((x) => x.id);
}

/** A colony's trade a year (dr), and your share of it, with every factor named. */
export function colonyTrade(s: SimState, col: Colony): { trade: number; share: number; why: string[] } {
  const pop = peopleOf(s, col);
  const st = stageOf(col);
  const harbour = built(col, 'harbour');
  const trade = Math.round(pop * TRADE_PER * TRADE_STAGE[st] * (harbour ? TRADE_HARBOUR : 1));
  const why = [`${fmt(pop)} people trading at ${TRADE_PER} dr a head a year`, `a ${STAGE_NAMES[st]}: ×${TRADE_STAGE[st]}`];
  if (harbour) why.push(`its harbour: ×${TRADE_HARBOUR}`);
  let k = TRADE_SHARE;
  const notes: string[] = [];
  if (col.talk) {
    k = 0;
    notes.push('it keeps it all while it talks of freedom');
  } else if (col.loyalty < TRADE_LOW) {
    k /= 2;
    notes.push(`halved: its loyalty is under ${TRADE_LOW}`);
  }
  return { trade, share: Math.round(trade * k), why: [...why, ...notes] };
}

/** A free ally's trade a year and the share it sends you (half a colony's). */
export function freeTrade(s: SimState, f: FreeAlly): { trade: number; share: number } {
  const pop = Math.round(siteRecord(s, f.site)?.pop ?? 0);
  const trade = Math.round(pop * TRADE_PER * TRADE_STAGE[pop >= 900 ? 3 : pop >= 400 ? 2 : pop >= 150 ? 1 : 0]);
  return { trade, share: Math.round(trade * TRADE_SHARE * FREE_SHARE) };
}

/** The coin a colony's share ship brings this season (colonies.ts asks as it sends it). */
export const seasonTrade = (s: SimState, col: Colony): number => Math.round(colonyTrade(s, col).share / 4);

/** Who a colony's or free ally's ship is from, by its site, for the news and the ledger. */
export function shareFrom(s: SimState, site: string): string {
  return colonyOf(s, site)?.name ?? freedOf(s, site)?.name ?? `your colony on ${siteName(site)}`;
}

/** Each season a free ally's ship sets out with your share of its trade, in coin. */
function freeShip(s: SimState, f: FreeAlly): void {
  f.next = s.tick + SEASON;
  const coin = Math.round(freeTrade(s, f).share / 4);
  if (coin <= 0) return;
  const voyage = laneTicks(f.site);
  const t: Tribute = { id: s.empire.nextId++, city: 'home', good: -1, amount: coin, worth: coin, by: 'sea', way: siteLaneId(f.site), phase: 'road', start: s.tick, dur: voyage, ship: null, put: 0, lost: 0, store: 0, how: '', ended: 0, colony: f.site };
  s.empire.tribute.push(t);
  news(s.world, s.tick, siteKey(f.site), `${f.name}, your free ally, sends you ${fmt(coin)} dr, your share of its trade this season: in your bay about ${dayWords(s.tick + voyage + SAIL_IN)}`);
}

// ---------------------------------------------------------------------------
// Stationing a company.

/** The road tile beside the trading post where a company stands to be rowed out (nearest the quay), or -1. */
function quayTile(s: SimState, map: CoastMap): { post: number; tile: number } | null {
  const post = tradingPost(s);
  if (!post) return null;
  const n = map.size;
  const spot = quaySpot(map, post, 0);
  const roads = roadsBeside(s, n, post);
  if (!spot || !roads.length) return null;
  const tile = roads.slice().sort((a, b) => dhypot((a % n) + 0.5 - spot[0], Math.floor(a / n) + 0.5 - spot[1]) - dhypot((b % n) + 0.5 - spot[0], Math.floor(b / n) + 0.5 - spot[1]) || a - b)[0];
  return { post: post.id, tile };
}

/** The companies at home that could be stationed abroad: your own, with men ready in the ranks, not away, broken or fighting. */
export const companiesAtHome = (s: SimState): Company[] => s.army.companies.filter((c) => !c.ally && !c.away && !c.routed && c.order !== 'away' && readyOf(s, c).length > 0);

/** Why a company can't be stationed in a colony now ('' if it can). */
export function stationRefusal(s: SimState, map: CoastMap, col: Colony, id?: number): string {
  if (col.garrison) {
    const c = garrisonOf(s, col);
    if (c) return passageOf(s, c.id) ? `${cap(companyName(c))} is on its way` : `${cap(companyName(c))} holds it already: one company to a colony`;
  }
  if (!s.army.companies.some((c) => !c.ally)) return 'You have no soldiers: raise a company at a barracks';
  const ship = shipRefusal(s, map);
  if (ship) return ship.replace('Goods for a colony sail', 'Soldiers for a colony sail');
  const c = id ? companyOf(s, id) : companiesAtHome(s)[0];
  if (!c || c.ally) return 'No such company';
  if (c.away) return c.posted ? `${cap(companyName(c))} is stationed in ${shareFrom(s, c.posted)}` : `${cap(companyName(c))} is away on an expedition`;
  if (c.routed) return `${cap(companyName(c))} is broken, running back to its barracks`;
  if (!readyOf(s, c).length) return `${cap(companyName(c))} has no men ready in its ranks`;
  if (!quayTile(s, map)) return 'No road reaches the trading post for your soldiers';
  return '';
}

/** Station a company in a colony: your ship sails in for it, and its banner marches to the quay. */
function station(s: SimState, map: CoastMap, col: Colony, id: number): void {
  const c = companyOf(s, id) as Company;
  const q = quayTile(s, map);
  if (!q || !sendBanner(s, map, c.id, q.tile)) return;
  const e = s.empire;
  if (!e.passages) e.passages = [];
  const p: Passage = { id: e.nextId++, site: col.site, company: c.id, dir: 'out', phase: 'boarding', ship: newShip(s, map, q.post), post: q.post, tile: q.tile, at: s.tick, start: 0, dur: 0, men: [], trips: 0 };
  e.passages.push(p);
  c.away = -1;
  c.posted = col.site;
  col.garrison = c.id;
  const men = readyOf(s, c).length;
  news(s.world, s.tick, siteKey(col.site), `${cap(companyName(c))} of ${kindWord(c.kind)} (${men} men) marches down to your quay to sail for ${col.name}: your ship sails in for them about ${dayWords(s.tick + SAIL_IN)}, and a boat rows them out to her`);
  s.rev++;
}

/** Why a stationed company can't be brought home now ('' if it can). */
export function homeRefusal(s: SimState, col: Colony): string {
  const c = garrisonOf(s, col);
  if (!c) return 'No company of yours holds it';
  const p = passageOf(s, c.id);
  if (p) return p.dir === 'out' ? `${cap(companyName(c))} is still on its way there` : `${cap(companyName(c))} is on its way home`;
  if (c.away > 0) return `${cap(companyName(c))} is out striking from there: it comes home once it is back`;
  return '';
}

/** Bring a stationed company home: your ship sails from the colony with it. */
function bringHome(s: SimState, col: Colony, why = ''): void {
  const c = garrisonOf(s, col);
  col.garrison = 0;
  if (!c) return;
  sailHome(s, c, col.site, why);
}

/** A company sails home from a colony (its colony's lane, then your bay). */
function sailHome(s: SimState, c: Company, site: string, why: string): void {
  const e = s.empire;
  if (!e.passages) e.passages = [];
  const dur = Math.round(laneTicks(site) * shipPace(colonyOf(s, site)));
  e.passages.push({ id: e.nextId++, site, company: c.id, dir: 'home', phase: 'sea', ship: null, post: 0, tile: -1, at: s.tick, start: s.tick, dur, men: menAway(s, c).map((x) => x.id), trips: 0 });
  c.away = -1;
  news(s.world, s.tick, siteKey(site), `${cap(companyName(c))} sails home from ${shareFrom(s, site)}${why}: in your bay about ${dayWords(s.tick + dur + SAIL_IN)}`);
  s.rev++;
}

/** Each tick, a company's passage: out (the ship in, the men rowed out, sailing, landing) or home (the voyage, the ship in, the men rowed ashore). */
function stepPassage(s: SimState, map: CoastMap, p: Passage): void {
  const c = companyOf(s, p.company);
  const v = p.ship;
  if (!c) {
    // (Its barracks gone and the company disbanded while it was on its way.)
    if (v && v.phase !== SHIP_LEAVING) leave(s, v);
    const col = colonyOf(s, p.site);
    if (col && col.garrison === p.company) col.garrison = 0;
    p.phase = 'done';
    return;
  }
  const closed = !!blockaded(s);
  if (v && v.phase === SHIP_COMING) {
    if (closed && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0)) v.since++;
    if (s.tick >= v.since + SAIL_IN) {
      v.phase = SHIP_ANCHORED;
      v.since = s.tick;
      s.rev++;
    }
  }
  if (p.dir === 'out') {
    if (p.phase === 'boarding') {
      const anchored = !!v && v.phase === SHIP_ANCHORED;
      const late = s.tick - p.at >= WAIT_MOST;
      // (The boat takes a trip's men when it sets out from the quay: the first as she anchors, then one each trip.)
      if (anchored && c.order === 'hold' && c.target === p.tile && s.tick >= (v as Visitor).since + p.trips * ROW_TRIP) {
        const waiting = readyOf(s, c).filter((x) => dhypot(x.x - c.x, x.z - c.z) < 2.5 && x.foe === 0);
        if (waiting.length) {
          const post = findBuilding(s, p.post);
          const spot = (post ? quaySpot(map, post, 0) : null) ?? [c.x, c.z];
          for (const x of waiting.slice(0, ROW_MEN)) {
            x.state = 'away';
            x.x = spot[0];
            x.z = spot[1];
            x.path = [];
            x.seg = 0;
            p.men.push(x.id);
          }
          p.trips++;
          s.rev++;
        }
      }
      const left = readyOf(s, c).length;
      const rowed = !!v && s.tick >= v.since + p.trips * ROW_TRIP;
      if (anchored && !closed && p.men.length && rowed && (left === 0 || late)) {
        c.order = 'away';
        c.path = [];
        p.phase = 'leaving';
        leave(s, v as Visitor);
        news(s.world, s.tick, siteKey(p.site), `Your ship sails for ${shareFrom(s, p.site)} with ${companyName(c)} of ${kindWord(c.kind)} (${p.men.length} men) aboard: they land about ${dayWords(s.tick + leaveTicks(v as Visitor) + Math.round(laneTicks(p.site) * shipPace(colonyOf(s, p.site))))}`);
        s.rev++;
      } else if (late && !p.men.length) {
        // (Nobody came down to her in two months: she sails off empty, and the company stays home.)
        p.phase = 'done';
        if (v) leave(s, v);
        unpost(s, map, c);
        const col = colonyOf(s, p.site);
        if (col && col.garrison === c.id) col.garrison = 0;
        news(s.world, s.tick, siteKey(p.site), `Your ship waited two months at your quay for ${companyName(c)}, and sailed off without it: none of its men came down to her`, true);
        s.rev++;
      }
    } else if (p.phase === 'leaving') {
      if (!v || s.tick >= v.since + leaveTicks(v)) {
        p.ship = null;
        p.phase = 'sea';
        p.start = s.tick;
        p.dur = Math.round(laneTicks(p.site) * shipPace(colonyOf(s, p.site)));
        s.rev++;
      }
    } else if (p.phase === 'sea' && s.tick >= p.start + p.dur) {
      p.phase = 'done';
      const col = colonyOf(s, p.site);
      if (!col || col.garrison !== c.id) {
        // (Its colony lost or let go while they were at sea: they sail straight home.)
        sailHome(s, c, p.site, col ? '' : `: ${siteName(p.site)} is yours no more`);
        return;
      }
      news(s.world, s.tick, siteKey(p.site), `${cap(companyName(c))} of ${kindWord(c.kind)} has landed at ${col.name} and holds it: raiders turn away by themselves ${inTen(garrisonHold(s, col))} times on its account, and it is more loyal (+${GARRISON_LOYALTY})`);
      s.rev++;
    }
    return;
  }
  // Home.
  if (p.phase === 'sea' && s.tick >= p.start + p.dur) {
    const q = quayTile(s, map);
    p.phase = 'bay';
    p.start = s.tick;
    if (q) {
      p.post = q.post;
      p.tile = q.tile;
      p.ship = newShip(s, map, q.post);
    }
    if (!p.ship) {
      // (No quay to come in to: they land on the beach and walk to their barracks.)
      ashore(s, map, c, p, p.men.length, true);
      p.phase = 'done';
    }
    s.rev++;
  } else if (p.phase === 'bay' && v && v.phase === SHIP_ANCHORED) {
    // (A trip's men come ashore as the boat reaches the quay: half a trip after it sets out.)
    if (s.tick >= v.since + p.trips * ROW_TRIP + ROW_TRIP / 2 && p.men.length) {
      ashore(s, map, c, p, ROW_MEN, false);
      p.trips++;
    }
    if (!p.men.length && !closed) {
      leave(s, v);
      p.phase = 'done';
      sendBanner(s, map, c.id, -1);
      news(s.world, s.tick, siteKey(p.site), `${cap(companyName(c))} of ${kindWord(c.kind)} is home from ${shareFrom(s, p.site)}, marching back to its barracks`);
    }
  }
}

/** Some of a company's men come ashore at the quay (or, with no quay, all of them on the beach by their barracks). */
function ashore(s: SimState, map: CoastMap, c: Company, p: Passage, most: number, beach: boolean): void {
  const post = findBuilding(s, p.post);
  const n = map.size;
  if (c.away === -1) {
    c.away = 0;
    c.posted = '';
    if (!beach && p.tile >= 0) {
      c.x = (p.tile % n) + 0.5;
      c.z = Math.floor(p.tile / n) + 0.5;
      c.target = p.tile;
    } else {
      const b = findBuilding(s, c.barracks);
      const [bx, bz] = b ? centreOf(b) : [c.x, c.z];
      c.x = bx;
      c.z = bz;
      c.target = -1;
    }
    c.order = 'hold';
    c.path = [];
  }
  const ids = p.men.splice(0, beach ? p.men.length : most);
  let i = 0;
  for (const id of ids) {
    const x = s.army.soldiers.find((o) => o.id === id);
    if (!x || x.state !== 'away') continue;
    const spot = !beach && post ? quaySpot(map, post, i++) : null;
    x.x = spot ? spot[0] : c.x;
    x.z = spot ? spot[1] : c.z;
    x.path = [];
    x.seg = 0;
    x.foe = 0;
    x.state = 'ready';
  }
  if (beach) sendBanner(s, map, c.id, -1);
  s.rev++;
}

/** A company called back before it sailed: home to barracks. */
function unpost(s: SimState, map: CoastMap, c: Company): void {
  c.away = 0;
  c.posted = '';
  for (const x of s.army.soldiers) if (x.company === c.id && x.state === 'away') x.state = 'ready';
  if (c.order === 'away') c.order = 'hold';
  sendBanner(s, map, c.id, -1);
}

/** A ship of this line sails out of the bay. */
function leave(s: SimState, v: Visitor): void {
  v.phase = SHIP_LEAVING;
  v.turned = v.stop;
  v.since = s.tick;
}

// ---------------------------------------------------------------------------
// Triremes stationed off a colony (the fleet's guardColony; colonies.ts counts them with its guards).

// (colonies.ts' colonyCommand stations and recalls them: it has the fleet's helpers.)

// ---------------------------------------------------------------------------
// Striking from a colony.

/**
 * The way a colony's company sails to a city on the map of Greece (table x,
 * z pairs from the colony): along the sea ways (slice 37's `seaWayTo`,
 * reversed) or, where that goes far round, straight across, counted a third
 * longer for the shores it keeps to; whichever is shorter.
 */
export function strikeWay(site: string, city: CityId): { pts: number[]; len: number } {
  const p = siteOf(site);
  const q = PLACES[city];
  const [ax, az] = p ? project(p.lon, p.lat) : [0, 0];
  const [bx, bz] = project(q.lon, q.lat);
  const straight = { pts: [ax, az, bx, bz], len: dhypot(bx - ax, bz - az) * 1.3 };
  const way = seaWayTo(city, site);
  if (!way) return straight;
  const len = lineLength(way);
  if (len >= straight.len) return straight;
  const pts: number[] = [];
  for (let i = way.length - 2; i >= 0; i -= 2) pts.push(way[i], way[i + 1]);
  return { pts, len };
}

/** How long a voyage from a colony to a city takes (at the colonies' lane pace; a harbour a quarter quicker). */
export function strikeTicks(s: SimState, site: string, city: CityId): number {
  const tyre = lineLength(wayPoints(wayOf('tyre-sea'))) - HORIZON_ALONG;
  return Math.max(TICKS_PER_DAY, Math.round(((VOYAGE * strikeWay(site, city).len) / tyre) * shipPace(colonyOf(s, site))));
}

/** How long the same strike would take from your city (the expedition's march or sail). */
export function homeTicks(city: CityId): number {
  return marchTicks(city, routeWay(city, 'land') ? 'land' : 'sea');
}

/** The cities a colony's company could strike: its three nearest rival cities, and any whose ships threaten it. */
export function strikeTargets(s: SimState, col: Colony): CityId[] {
  const near = RULED.filter((id) => id !== 'home' && cityOf(s.world, id).pop > 0 && !vassalOf(s, id) && !allyOf(s, id))
    .map((id) => ({ id, t: strikeTicks(s, col.site, id) }))
    .sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
    .slice(0, 3)
    .map((x) => x.id);
  const t = col.threat && col.threat.end === '' ? col.threat.city : null;
  return t && !near.includes(t) ? [t, ...near] : t ? [t, ...near.filter((x) => x !== t)] : near;
}

/** A strike from a colony, before it sails: the company's might, the city's watch, the odds, how long from here and from home. */
export function strikePlan(s: SimState, col: Colony, city: CityId): { ours: number; theirs: number; odds: number; days: number; fromHome: number } {
  const c = garrisonOf(s, col);
  const ours = c ? Math.round(mightAway(s, c)) : 0;
  const theirs = defenders(s, cityOf(s.world, city), 'raid');
  return { ours, theirs, odds: oddsOf(ours, theirs), days: daysOf(strikeTicks(s, col.site, city)), fromHome: daysOf(homeTicks(city)) };
}

/** Why the colony's company can't strike at a city now ('' if it can). */
export function strikeRefusal(s: SimState, col: Colony, city: string): string {
  if (!RULED.includes(city as CityId) || city === 'home') return 'There is no ruler there';
  const id = city as CityId;
  if (vassalOf(s, id)) return `${cityName(id)} is your vassal`;
  if (allyOf(s, id)) return `${cityName(id)} is your ally: end the alliance first`;
  const c = garrisonOf(s, col);
  if (!c) return 'No company of yours holds it: station one here first';
  if (passageOf(s, c.id)) return `${cap(companyName(c))} is not there yet`;
  if (c.away > 0) return `${cap(companyName(c))} is out already`;
  const out = expeditionOut(s);
  if (out) return `Your soldiers are out already, after ${cityName(out.city)}: one expedition at a time`;
  if (!menAway(s, c).some((x) => x.hp >= 50)) return `${cap(companyName(c))} has nobody fit to fight`;
  const l = debtFrom(s, id);
  if (l?.demand) return 'Your demand stands: wait for its day';
  return '';
}

/** The stationed company raids a city from its colony: it sails at once. */
function strike(s: SimState, col: Colony, city: CityId): Expedition | null {
  const c = garrisonOf(s, col) as Company;
  const w = s.world;
  const debt = debtFrom(s, city);
  const men = menAway(s, c).filter((x) => x.hp >= 50);
  const e: Expedition = {
    id: w.nextExpedition++,
    city,
    kind: 'raid',
    loan: debt?.id ?? 0,
    companies: [c.id],
    men: men.map((x) => x.id),
    phase: 'marching',
    by: 'sea',
    way: siteLaneId(col.site),
    edge: -1,
    ships: [],
    start: s.tick,
    dur: strikeTicks(s, col.site, city),
    a0: 0,
    a1: 1,
    at: s.tick,
    ours: 0,
    theirs: 0,
    odds: 0,
    won: false,
    fallen: 0,
    coin: 0,
    good: -1,
    goods: 0,
    value: 0,
    killed: [],
    wounded: [],
    report: [],
    ended: 0,
    aim: '',
    from: col.site,
  };
  w.expeditions.push(e);
  if (debt) debt.sent = e.id;
  c.away = e.id;
  const why = debt ? `to collect the ${fmt(debt.owed)} dr ${cityName(city)} owes you` : 'against a city that owes you nothing';
  news(w, s.tick, city, `${cap(companyName(c))} of ${kindWord(c.kind)} (${men.length} men) sails from ${col.name} to raid ${cityName(city)}, ${why}: there about ${dayWords(s.tick + e.dur)} (from your city it would be ${daysOf(homeTicks(city))} days)`);
  s.rev++;
  return e;
}

/** Expeditions.ts' step for an expedition from a colony: after the fight, back to the colony; there, the takings home. */
export function stepFromColony(s: SimState, e: Expedition, fought: () => void): void {
  if (e.phase === 'marching' && s.tick >= e.start + e.dur) {
    fought();
    // (The report's last line: they sail back to the colony, not home.)
    if (e.report.length) e.report[e.report.length - 1] = `They sail back to ${shareFrom(s, e.from as string)}: there about ${dayWords(s.tick + e.dur * 2)}${e.coin || e.goods ? ', and what they took comes home on your ship' : ''}.`;
    e.a0 = 1;
    e.a1 = 1;
  } else if (e.phase === 'fighting' && s.tick >= e.start + e.dur) {
    e.phase = 'homeward';
    e.start = s.tick;
    e.dur = strikeTicks(s, e.from as string, e.city);
    e.a0 = 1;
    e.a1 = 0;
    s.rev++;
  } else if (e.phase === 'homeward' && s.tick >= e.start + e.dur) backAtColony(s, e);
}

/** Back at its colony: the company holds it again; the coin into the treasury, the goods into your stores. */
function backAtColony(s: SimState, e: Expedition): void {
  e.phase = 'done';
  e.ended = s.tick;
  const site = e.from as string;
  const c = companyOf(s, e.companies[0] ?? 0);
  const col = colonyOf(s, site);
  if (c) {
    c.away = -1;
    if (!col || col.garrison !== c.id) sailHome(s, c, site, col ? '' : `: ${siteName(site)} is yours no more`);
  }
  const name = cityName(e.city);
  if (e.coin > 0) income(s, e.coin, 'collected', `from ${name}`);
  let put = 0;
  if (e.goods > 0 && e.good >= 0) {
    const ware = TRADE_GOODS[e.good];
    let left = e.goods;
    for (const b of s.buildings) {
      if (left <= 0) break;
      if (b.kind !== storeKind(ware)) continue;
      const r = Math.min(left, roomFor(b, ware));
      if (r <= 0) continue;
      setHeld(b, ware, held(b, ware) + r);
      left -= r;
    }
    put = e.goods - left;
    if (put > 0) note(s, ware, 'bought', `taken:${e.city}`, put);
    s.looks++;
  }
  const haul = [e.coin > 0 ? `${fmt(e.coin)} dr into the treasury` : '', put > 0 ? `${fmt(put)} ${WARE_NAMES[TRADE_GOODS[e.good]]} into the stores` : ''].filter(Boolean).join(' and ');
  news(s.world, s.tick, siteKey(site), `${c ? cap(companyName(c)) : 'Your company'} is back at ${shareFrom(s, site)} from ${name}${haul ? `, and sends home ${haul}` : ''}`);
  s.rev++;
}

/** Where a colony's strike is on the map of Greece: from the colony (0) to the city (1); null while not under way. */
export function strikeOnMap(e: Expedition, tick: number): { u: number; homeward: boolean; fighting: boolean } | null {
  if (!e.from || (e.phase !== 'marching' && e.phase !== 'fighting' && e.phase !== 'homeward')) return null;
  if (e.phase === 'fighting') return { u: 1, homeward: false, fighting: true };
  const k = clamp((tick - e.start) / Math.max(1, e.dur), 0, 1);
  return { u: e.phase === 'marching' ? k : 1 - k, homeward: e.phase === 'homeward', fighting: false };
}

/** A colony's strike in a line (expeditions.ts' expeditionLine asks). */
export function strikeLine(s: SimState, e: Expedition): string {
  const from = shareFrom(s, e.from as string);
  const name = cityName(e.city);
  const days = (t: number): string => `${daysOf(t - s.tick)} ${daysOf(t - s.tick) === 1 ? 'day' : 'days'}`;
  if (e.phase === 'marching') return `Your raiding party from ${from} is at sea, bound for ${name}: there in ${days(e.start + e.dur)}`;
  if (e.phase === 'fighting') return `Your raiding party from ${from} is at ${name}, ${e.won ? 'the watch beaten' : 'beaten by the watch'}`;
  if (e.phase === 'homeward') return `Your raiding party is at sea on the way back to ${from}${e.won ? ' with what it took' : ', beaten'}: there in ${days(e.start + e.dur)}`;
  return `Your raiding party came back to ${from} from ${name} ${dayWords(e.ended)}`;
}

// ---------------------------------------------------------------------------
// The militia.

/** The colonies (and free allies) that would send their militia now, with how many men. */
export function militiaReady(s: SimState): Array<{ site: string; name: string; men: number }> {
  const out: Array<{ site: string; name: string; men: number }> = [];
  const size = (pop: number): number => clamp(Math.round(pop / MILITIA_PER), MILITIA_LEAST, MILITIA_MOST);
  for (const c of s.empire.colonies) if (stageOf(c) >= MILITIA_STAGE && c.loyalty >= MILITIA_LOYALTY && !c.talk) out.push({ site: c.site, name: c.name, men: size(peopleOf(s, c)) });
  for (const f of s.empire.freed ?? []) out.push({ site: f.site, name: f.name, men: size(siteRecord(s, f.site)?.pop ?? 0) });
  return out;
}

/** Why a colony sends no militia, for its page ('' if it would). */
export function militiaWhy(c: Colony): string {
  if (stageOf(c) < MILITIA_STAGE) return `It has militia once it is a ${STAGE_NAMES[MILITIA_STAGE]}`;
  if (c.talk) return 'It sends none while it talks of freedom';
  if (c.loyalty < MILITIA_LOYALTY) return `It sends none while its loyalty is under ${MILITIA_LOYALTY}`;
  return '';
}

/** How many militiamen a colony would send. */
export const militiaMen = (s: SimState, site: string): number => militiaReady(s).find((m) => m.site === site)?.men ?? 0;

/** The militia's might with an expedition of yours (counted at the fight: expeditions.ts asks). */
export const militiaMight = (s: SimState, e: Expedition): number => Math.round((s.empire.militia ?? []).filter((m) => m.exp === e.id).reduce((a, m) => a + m.men * MILITIA_MIGHT, 0));
/** The militia's might that would sail with a full force now (for the plan). */
export const militiaMightNow = (s: SimState): number => Math.round(militiaReady(s).reduce((a, m) => a + m.men * MILITIA_MIGHT, 0));

/** An expedition of yours sets out to a war (a full force, a conquest, an ally's war): the militia sail to meet it (expeditions.ts calls this). */
export function militiaSail(s: SimState, e: Expedition): void {
  if (e.from || (e.kind !== 'force' && !e.aim)) return;
  const xs = militiaReady(s);
  if (!xs.length) return;
  const e2 = s.empire;
  if (!e2.militia) e2.militia = [];
  for (const m of xs) e2.militia.push({ id: e2.nextId++, site: m.site, name: m.name, raid: 0, exp: e.id, men: m.men, phase: 'sea', ship: null, post: 0, start: s.tick, dur: 0, company: 0, ids: [], line: '' });
  news(s.world, s.tick, e.city, `The militia of ${listWords(xs.map((m) => `${m.name} (${m.men} men)`))} sail to meet your army at ${cityName(e.city)}`);
}

/** The report's line on the militia with an expedition (expeditions.ts adds it). */
export function militiaFought(s: SimState, e: Expedition): string {
  const xs = (s.empire.militia ?? []).filter((m) => m.exp === e.id);
  if (!xs.length) return '';
  return `The militia of ${listWords(xs.map((m) => `${m.name} (${m.men} men)`))} fought beside them, strength ${militiaMight(s, e)} of the ${e.ours}.`;
}

/** Each day: a threat or a band against your city has the militia sail (once a raid for each colony). */
function sendMilitia(s: SimState): void {
  const raids = s.world.raids.filter((r) => r.ended === 0 && (r.phase === 'threat' || r.phase === 'gathering' || r.phase === 'marching' || r.phase === 'raiding'));
  if (!raids.length) return;
  const e = s.empire;
  if (!e.militia) e.militia = [];
  for (const r of raids) {
    for (const m of militiaReady(s)) {
      if (e.militia.some((x) => x.site === m.site && (x.raid === r.id || (x.raid > 0 && x.phase !== 'done')))) continue;
      const dur = Math.round(laneTicks(m.site) * shipPace(colonyOf(s, m.site)));
      e.militia.push({ id: e.nextId++, site: m.site, name: m.name, raid: r.id, exp: 0, men: m.men, phase: 'sea', ship: null, post: 0, start: s.tick, dur, company: 0, ids: [], line: '' });
      news(s.world, s.tick, siteKey(m.site), `${m.name} sends its militia, ${m.men} men, to help you against ${whose(r.city)} ${r.loan ? 'army' : 'raiders'}: in your bay about ${dayWords(s.tick + dur + SAIL_IN)}, ashore at your quay`, true);
    }
  }
}

/** Each tick, a militia against a raid: at sea, its ship in your bay, its men ashore with their company, home again. */
function stepMilitia(s: SimState, map: CoastMap, m: Militia): void {
  if (m.exp) {
    // (With your army abroad: done once the expedition is.)
    const ex = s.world.expeditions.find((x) => x.id === m.exp);
    if (!ex || ex.phase === 'back' || ex.phase === 'done') m.phase = 'done';
    return;
  }
  const r = s.world.raids.find((x) => x.id === m.raid);
  const over = !r || r.ended > 0 || r.phase === 'done' || r.phase === 'homeward' || r.phase === 'turned';
  const v = m.ship;
  if (m.phase === 'sea' && s.tick >= m.start + m.dur) {
    if (over) {
      m.line = m.line || `${m.men} men of ${m.name} came too late: the raiders had gone`;
      goHome(s, m);
      return;
    }
    const post = tradingPost(s);
    m.ship = post ? newShip(s, map, post.id) : null;
    if (!m.ship || !post) {
      m.line = `${m.men} men of ${m.name} found no quay to land at (build a trading post on the bay shore), and sailed home`;
      goHome(s, m);
      return;
    }
    m.post = post.id;
    m.phase = 'bay';
    m.start = s.tick;
    s.rev++;
  } else if (m.phase === 'bay' && v) {
    const closed = !!blockaded(s);
    if (v.phase === SHIP_COMING) {
      if (closed && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0)) v.since++;
      if (s.tick >= v.since + SAIL_IN) {
        v.phase = SHIP_ANCHORED;
        v.since = s.tick;
        s.rev++;
      }
    }
    if (v.phase === SHIP_ANCHORED) {
      if (over) {
        m.line = m.line || `${m.men} men of ${m.name} came into your bay after the raiders had gone, and sailed home`;
        leave(s, v);
        goHome(s, m);
      } else if (!comeAshore(s, map, m, r)) {
        m.line = `${m.men} men of ${m.name} found no way from your quay to the raiders, and sailed home`;
        leave(s, v);
        goHome(s, m);
      }
    }
  } else if (m.phase === 'ashore') {
    const c = companyOf(s, m.company);
    if (c && (over || c.routed)) {
      const lost = m.men - s.army.soldiers.filter((x) => x.company === c.id && x.state !== 'fallen').length;
      m.line += lost > 0 ? `; ${lost} of them fell` : '';
      if (c.routed && !over) m.line += '; they broke';
      backToQuay(s, map, m, c);
    }
    // (Every man back aboard, or fallen: she sails.)
    if (!c && !s.army.soldiers.some((x) => m.ids.includes(x.id) && x.state !== 'fallen')) {
      if (v) leave(s, v);
      goHome(s, m);
    }
  } else if (m.phase === 'home') {
    if (v && v.phase === SHIP_LEAVING && s.tick >= v.since + leaveTicks(v)) m.ship = null;
    if (s.tick >= m.start + m.dur && !m.ship) m.phase = 'done';
  }
}

/** The militia's ship turns for home: out of the bay (if she is in it), and along the lane. */
function goHome(s: SimState, m: Militia): void {
  m.phase = 'home';
  m.start = s.tick;
  m.dur = (m.ship ? leaveTicks(m.ship) : 0) + Math.round(laneTicks(m.site) * shipPace(colonyOf(s, m.site)));
  s.rev++;
}

/** The militia come ashore at your quay and march to stand by what the raiders make for, a company under their own name. */
function comeAshore(s: SimState, map: CoastMap, m: Militia, r: SimState['world']['raids'][number] | undefined): boolean {
  if (!r) return false;
  const n = map.size;
  const goal = aidGoal(s, map, r);
  const post = findBuilding(s, m.post);
  const q = quayTile(s, map);
  if (!goal || !post || !q) return false;
  const [gx, gz] = centreOf(goal);
  const [rx, rz] = [(q.tile % n) + 0.5, Math.floor(q.tile / n) + 0.5];
  // (Where it holds: the open tile beside the goal nearest the quay that it can reach.)
  const ring = around(n, goal).filter((t) => walkable(map, s, t)).sort((a, b) => dhypot((a % n) + 0.5 - rx, Math.floor(a / n) + 0.5 - rz) - dhypot((b % n) + 0.5 - rx, Math.floor(b / n) + 0.5 - rz) || a - b);
  let way: number[] | null = null;
  let hold = -1;
  for (const t of ring.slice(0, 6)) {
    way = wayFrom(s, map, rx, rz, t);
    if (way) {
      hold = t;
      break;
    }
  }
  if (!way || hold < 0) return false;
  const used = new Set(s.army.companies.filter((c) => c.ally === (m.site as CityId)).map((c) => c.n));
  let num = 1;
  while (used.has(num)) num++;
  const hx = (hold % n) + 0.5;
  const hz = Math.floor(hold / n) + 0.5;
  const c: Company = {
    id: s.army.nextId++,
    n: num,
    kind: 'hoplite',
    barracks: 0,
    emblem: 0,
    order: 'hold',
    x: hx,
    z: hz,
    face: 0,
    path: [],
    along: 0,
    target: hold,
    want: m.men,
    raised: s.tick,
    owed: 0,
    why: '',
    hired: '',
    strong: 0,
    routed: false,
    away: 0,
    ally: m.site as CityId,
    militia: m.name,
  };
  // (Facing out from what it guards, towards where the raiders come from: away from the goal.)
  c.face = datan2(hz - gz, hx - gx);
  s.army.companies.push(c);
  for (let slot = 0; slot < m.men; slot++) {
    const id = s.army.nextId++;
    const nm = MEN[Math.floor(hash2(id, 1, 4701) * MEN.length)];
    const father = MEN[Math.floor(hash2(id, 2, 4701) * MEN.length)];
    const spot = quaySpot(map, post, slot) ?? [rx, rz];
    const [px, pz] = slotAt('hoplite', slot, hx, hz, c.face);
    s.army.soldiers.push({ id, company: c.id, slot, home: 0, name: nm, father: father === nm ? MEN[(MEN.indexOf(nm) + 7) % MEN.length] : father, kin: 'son', house: m.name, state: 'coming', x: spot[0], z: spot[1], face: 0, path: [spot[0], spot[1], ...way, px, pz], seg: 1, walked: 0, armed: true, hp: 100, foe: 0, cool: 0, swung: 0, fell: 0 });
    m.ids.push(id);
  }
  m.company = c.id;
  m.phase = 'ashore';
  const what = goal.kind === 'taxoffice' ? 'the tax office' : `the ${goal.kind}`;
  m.line = `${m.men} men of ${m.name} came ashore at your quay to stand by ${what}`;
  news(s.world, s.tick, siteKey(m.site), `The militia of ${m.name}, ${m.men} men, are ashore at your quay, marching to stand by ${what} against ${whose(r.city)} ${r.loan ? 'army' : 'raiders'}`, true);
  s.rev++;
  return true;
}

/** The raid over: the militia walk back to the quay and are rowed out to their ship. */
function backToQuay(s: SimState, map: CoastMap, m: Militia, c: Company): void {
  const post = findBuilding(s, m.post);
  const q = quayTile(s, map);
  let i = 0;
  for (const x of s.army.soldiers.filter((o) => o.company === c.id)) {
    if (x.state === 'fallen') continue;
    x.company = 0;
    x.state = 'leaving';
    x.foe = 0;
    const spot = post ? quaySpot(map, post, i++) : null;
    const way = q ? wayFrom(s, map, x.x, x.z, q.tile) : null;
    if (!way || !spot) {
      x.hp = 0;
      continue;
    }
    x.path = [...way, spot[0], spot[1]];
    x.seg = 1;
  }
  s.army.companies = s.army.companies.filter((o) => o !== c);
  m.company = 0;
  s.rev++;
}

/** Where a militia's ship is on the map of Greece (along its colony's lane from your city), or with an expedition (0 to 1 from the colony to the city); null when not on the map. */
export function militiaOnMap(s: SimState, m: Militia, tick: number): { along?: number; u?: number; homeward: boolean } | null {
  if (m.exp) {
    const e = s.world.expeditions.find((x) => x.id === m.exp);
    if (!e || (e.phase !== 'marching' && e.phase !== 'fighting' && e.phase !== 'homeward')) return null;
    const k = clamp((tick - e.start) / Math.max(1, e.dur), 0, 1);
    return { u: e.phase === 'marching' ? k : e.phase === 'fighting' ? 1 : 1 - k, homeward: e.phase === 'homeward' };
  }
  const L = lineLength(wayPoints(wayOf(siteLaneId(m.site))));
  if (m.phase === 'sea') {
    const k = clamp((tick - m.start) / Math.max(1, m.dur), 0, 1);
    return { along: L + (HORIZON_ALONG - L) * k, homeward: false };
  }
  if (m.phase === 'bay' && m.ship && m.ship.phase === SHIP_COMING) {
    const k = clamp((tick - m.ship.since) / SAIL_IN, 0, 1);
    return { along: HORIZON_ALONG * (1 - k), homeward: false };
  }
  if (m.phase === 'home') {
    const k = clamp((tick - m.start) / Math.max(1, m.dur), 0, 1);
    return { along: L * k, homeward: true };
  }
  return null;
}

/** Where a company's passage is on the map of Greece (along the colony's lane from your city); null while at your quay or done. */
export function passageOnMap(p: Passage, tick: number): { along: number; homeward: boolean } | null {
  const L = lineLength(wayPoints(wayOf(siteLaneId(p.site))));
  if (p.dir === 'out') {
    if (p.phase === 'boarding') {
      const v = p.ship;
      if (!v || v.phase !== SHIP_COMING) return null;
      const k = clamp((tick - v.since) / SAIL_IN, 0, 1);
      return { along: HORIZON_ALONG * (1 - k), homeward: true };
    }
    if (p.phase === 'leaving') {
      const v = p.ship;
      const k = v ? clamp((tick - v.since) / Math.max(1, leaveTicks(v)), 0, 1) : 1;
      return { along: HORIZON_ALONG * k, homeward: false };
    }
    if (p.phase === 'sea') {
      const k = clamp((tick - p.start) / Math.max(1, p.dur), 0, 1);
      return { along: HORIZON_ALONG + (L - HORIZON_ALONG) * k, homeward: false };
    }
    return null;
  }
  if (p.phase === 'sea') {
    const k = clamp((tick - p.start) / Math.max(1, p.dur), 0, 1);
    return { along: L + (HORIZON_ALONG - L) * k, homeward: true };
  }
  if (p.phase === 'bay' && p.ship && p.ship.phase === SHIP_COMING) {
    const k = clamp((tick - p.ship.since) / SAIL_IN, 0, 1);
    return { along: HORIZON_ALONG * (1 - k), homeward: true };
  }
  return null;
}

// ---------------------------------------------------------------------------
// The treaty.

/** Why a colony can't be offered a treaty for its freedom now ('' if it can). */
export function treatyRefusal(s: SimState, col: Colony): string {
  if (!col.talk) return `It doesn’t want its freedom: it talks of it only when it has grown past ${fmt(FREE_FROM)} and its loyalty is low`;
  if (peopleOf(s, col) < FREE_FROM) return `It is too small to stand alone (under ${fmt(FREE_FROM)} people)`;
  return '';
}

/** A colony lost (claimed, or declared free) or let go: its company comes home (or never sails), and its stationed triremes (colonies.ts sends them). */
export function colonyLost(s: SimState, map: CoastMap, col: Colony, why = ''): void {
  const c = garrisonOf(s, col);
  col.garrison = 0;
  if (!c) return;
  const p = passageOf(s, c.id);
  if (!p && c.away === -1) sailHome(s, c, col.site, why);
  else if (p && p.dir === 'out' && p.phase === 'boarding') {
    p.phase = 'done';
    if (p.ship) leave(s, p.ship);
    unpost(s, map, c);
  }
  // (At sea out, or out striking: it turns for home when it gets there, finding the colony not yours: stepPassage, backAtColony.)
}

/** Let a colony go by treaty: free, and your ally. */
function treaty(s: SimState, map: CoastMap, col: Colony): void {
  const x = siteRecord(s, col.site);
  if (!x) return;
  const pop = peopleOf(s, col);
  // (Its company comes home; its guards and stationed triremes sail home; what is loading for it is called off.)
  colonyLost(s, map, col, `: ${col.name} is free by treaty`);
  for (const cg of cargoesFor(s, col.site)) if (cg.phase === 'loading') callOff(s, map, cg, `${col.name} is free by treaty`);
  letGo(s, map, col);
  if (col.want && col.want.end === '') col.want = null;
  x.owner = '';
  x.free = col.name;
  x.since = s.tick;
  const ruler = col.governor || col.candidates[0]?.name || `its council`;
  if (!s.empire.freed) s.empire.freed = [];
  s.empire.freed.push({ site: col.site, name: col.name, ruler, since: s.tick, founded: col.since, next: s.tick + SEASON, sent: 0, worth: 0 });
  s.empire.colonies = s.empire.colonies.filter((y) => y !== col);
  const f = freedOf(s, col.site) as FreeAlly;
  news(s.world, s.tick, siteKey(col.site), `You have signed a treaty with ${col.name}: it stands free under ${ruler}, ${fmt(pop)} people, and is your ally. It sends you a share of its trade (about ${fmt(freeTrade(s, f).share)} dr a year) and its militia when you need them`, true);
  s.rev++;
}

/** A free ally's ruler's mood towards you, with its reasons (always warm: a treaty kept). */
export function freeMood(f: FreeAlly): { mood: number; why: Array<{ why: string; n: number }> } {
  const years = Math.max(0, Math.floor((f.since - f.founded) / TICKS_PER_YEAR));
  const why = [
    { why: 'you set it free by treaty, in peace', n: FREED_WARMTH },
    { why: `it was your colony ${years === 1 ? 'one year' : `${years} years`}: its people are your people’s kin`, n: Math.min(15, 5 + years) },
    { why: 'your ally: you send it no demands', n: 10 },
  ];
  return { mood: why.reduce((a, x) => a + x.n, 0), why };
}

// ---------------------------------------------------------------------------
// Each tick.

/** Slice 47's tick: passages, militia and the free allies (each day: militia sailing, free allies' ships, healing). Nothing with none of them and no colony. */
export function stepColonyEmpire(s: SimState, map: CoastMap): void {
  const e = s.empire;
  const ps = e.passages ?? [];
  const ms = e.militia ?? [];
  const fs = e.freed ?? [];
  if (!ps.length && !ms.length && !fs.length && !e.colonies.length) return;
  for (const p of ps) if (p.phase !== 'done') stepPassage(s, map, p);
  if (ps.some((p) => p.phase === 'done' && (!p.ship || p.ship.phase !== SHIP_LEAVING || s.tick >= p.ship.since + leaveTicks(p.ship)))) e.passages = ps.filter((p) => p.phase !== 'done' || (!!p.ship && p.ship.phase === SHIP_LEAVING && s.tick < p.ship.since + leaveTicks(p.ship)));
  for (const m of ms) if (m.phase !== 'done') stepMilitia(s, map, m);
  if (ms.some((m) => m.phase === 'done')) e.militia = ms.filter((m) => m.phase !== 'done');
  if (s.tick % TICKS_PER_DAY !== 0) return;
  if (e.colonies.length || fs.length) sendMilitia(s);
  for (const f of fs) if (s.tick >= f.next) freeShip(s, f);
  if (s.tick % TICKS_PER_MONTH === 0) {
    // (Wounded men abroad heal; a free ally grows by its own children.)
    for (const c of s.army.companies) if (c.posted) for (const x of s.army.soldiers) if (x.company === c.id && x.state === 'away' && x.hp < 100) x.hp = Math.min(100, x.hp + HEAL);
    for (const f of fs) {
      const x = siteRecord(s, f.site);
      if (x) x.pop = Math.round(clamp(x.pop * (1 + FREE_GROWTH / 12), 1, COLONY_CEILING) * 100) / 100;
    }
  }
}

// ---------------------------------------------------------------------------
// Your acts (the `colonyempire` command).

/** Why an act can't be done now ('' if it can). */
export function empireActRefusal(s: SimState, map: CoastMap, act: string, site: string, company?: number, city?: string): string {
  const col = colonyOf(s, site);
  if (!col) return `${siteName(site)} is not your colony`;
  if (act === 'sail' || act === 'cancel') return cargoActRefusal(s, act, site);
  if (act === 'ships') return shipsRefusal(s);
  if (act === 'shipshome') return shipsOf(col).length ? '' : 'None of your triremes is stationed off it';
  if (act === 'station') return stationRefusal(s, map, col, company);
  if (act === 'home') return homeRefusal(s, col);
  if (act === 'strike') return strikeRefusal(s, col, String(city ?? ''));
  if (act === 'free') return treatyRefusal(s, col);
  return 'Not an act';
}

/** Do an act (empireActRefusal said yes). */
export function colonyEmpireCommand(s: SimState, map: CoastMap, cmd: Extract<Command, { type: 'colonyempire' }>): void {
  const site = String(cmd.site ?? '');
  if (empireActRefusal(s, map, cmd.act, site, cmd.company, cmd.city) !== '') return;
  const col = colonyOf(s, site) as Colony;
  if (cmd.act === 'station') station(s, map, col, cmd.company ?? companiesAtHome(s)[0].id);
  else if (cmd.act === 'home') bringHome(s, col);
  else if (cmd.act === 'ships') stationShips(s, map, col, cmd.n);
  else if (cmd.act === 'shipshome') {
    const n = shipsOf(col).length;
    shipsHome(s, map, col);
    news(s.world, s.tick, siteKey(site), `Your ${n === 1 ? 'trireme comes' : `${n} triremes come`} home from ${col.name}`);
  } else if (cmd.act === 'strike') strike(s, col, cmd.city as CityId);
  else if (cmd.act === 'free') treaty(s, map, col);
  else if (cmd.act === 'sail') sailNow(s, loadingFor(s, site) as NonNullable<ReturnType<typeof loadingFor>>);
  else if (cmd.act === 'cancel') callOff(s, map, loadingFor(s, site) as NonNullable<ReturnType<typeof loadingFor>>, 'you called it off');
  s.rev++;
}

// ---------------------------------------------------------------------------
// For the city's bay, the hovers and the save.

/** The ships of this line in your bay now: each with its key, how she looks, and who she is for (the city draws them from a pool; the hover finds them). */
export function bayShips(s: SimState): Array<{ key: string; ship: Visitor; laden: boolean; kind: 'cargo' | 'passage' | 'militia'; id: number }> {
  const out: Array<{ key: string; ship: Visitor; laden: boolean; kind: 'cargo' | 'passage' | 'militia'; id: number }> = [];
  for (const x of cargoesFor(s)) {
    const v = x.ship;
    if (!v || (x.phase !== 'loading' && x.phase !== 'leaving')) continue;
    // (Review of slice 43: her sacks show once the boat has rowed the first load out to her, half a trip after she anchors.)
    const laden = x.phase === 'leaving' || (v.phase === SHIP_ANCHORED && s.tick >= v.since + ROW_TRIP / 2 && x.items.some((it) => it.got > 0));
    out.push({ key: `cargo-${x.id}`, ship: v, laden, kind: 'cargo', id: x.id });
  }
  for (const p of s.empire.passages ?? []) if (p.ship) out.push({ key: `passage-${p.id}`, ship: p.ship, laden: false, kind: 'passage', id: p.id });
  for (const m of s.empire.militia ?? []) if (m.ship) out.push({ key: `militia-${m.id}`, ship: m.ship, laden: false, kind: 'militia', id: m.id });
  return out;
}

/** For the rowing boat (colonyworks.ts' rowingOut): passages with men to row out or ashore. */
export function rowingPassages(s: SimState): Array<{ post: number; ship: Visitor }> {
  const out: Array<{ post: number; ship: Visitor }> = [];
  for (const p of passagesFor(s)) {
    const v = p.ship;
    if (!v || v.phase !== SHIP_ANCHORED) continue;
    const c = companyOf(s, p.company);
    if (p.dir === 'out' && p.phase === 'boarding' && c && (readyOf(s, c).length > 0 || s.tick < v.since + p.trips * ROW_TRIP)) out.push({ post: p.post, ship: v });
    else if (p.dir === 'home' && p.phase === 'bay' && p.men.length) out.push({ post: p.post, ship: v });
  }
  return out;
}

/** A company's passage in words, for the hovers and the page. */
export function passageWords(s: SimState, p: Passage): string {
  const c = companyOf(s, p.company);
  const who = c ? `${companyName(c)} of ${kindWord(c.kind)}` : 'your company';
  const to = shareFrom(s, p.site);
  const v = p.ship;
  if (p.dir === 'out') {
    if (p.phase === 'boarding') {
      if (!v || v.phase === SHIP_COMING) return `Your ship sails in for ${who}, bound for ${to}: at anchor off the jetty about ${dayWords((v?.since ?? s.tick) + SAIL_IN)}. The company waits for her by the trading post`;
      return `Your ship rides at anchor for ${who}, bound for ${to}: a boat rows the men out to her, ${ROW_MEN} a trip (${p.men.length} aboard)`;
    }
    if (p.phase === 'leaving') return `Your ship sails out of the bay with ${who} (${p.men.length} men), bound for ${to}`;
    return `${cap(who)} is at sea, bound for ${to}: they land about ${dayWords(p.start + p.dur)}`;
  }
  if (p.phase === 'sea') return `${cap(who)} is at sea, sailing home from ${to}: in your bay about ${dayWords(p.start + p.dur + SAIL_IN)}`;
  if (!v || v.phase === SHIP_COMING) return `Your ship brings ${who} home from ${to}: at anchor off the jetty about ${dayWords((v?.since ?? s.tick) + SAIL_IN)}`;
  return `Your ship rides at anchor with ${who}, home from ${to}: a boat rows the men ashore, ${ROW_MEN} a trip (${p.men.length} still aboard)`;
}

/** A militia's ship in your bay, in words. */
export function militiaWords(s: SimState, m: Militia): string {
  const v = m.ship;
  if (m.phase === 'bay') return v && v.phase === SHIP_ANCHORED ? `The militia of ${m.name} (${m.men} men) are coming ashore at your quay` : `The militia of ${m.name} (${m.men} men) sail in to help you: at anchor about ${dayWords((v?.since ?? s.tick) + SAIL_IN)}`;
  if (m.phase === 'ashore') return `Riding at anchor while the militia of ${m.name} stand with your soldiers: ${m.line}`;
  return `Taking the militia of ${m.name} home${m.line ? `: ${m.line}` : ''}`;
}

/** A ship of this line in your bay: her hover. */
export function bayShipStatus(s: SimState, key: string): { title: string; detail: string } | null {
  const [kind, raw] = key.split('-');
  const id = Number(raw);
  if (kind === 'passage') {
    const p = (s.empire.passages ?? []).find((x) => x.id === id);
    if (!p) return null;
    return { title: `Your ship for ${shareFrom(s, p.site)} · soldiers`, detail: `${passageWords(s, p)}.\nOn the map of Greece she sails the lane to ${siteName(p.site)}` };
  }
  if (kind === 'militia') {
    const m = (s.empire.militia ?? []).find((x) => x.id === id);
    if (!m) return null;
    return { title: `The ship of ${m.name} · its militia`, detail: `${militiaWords(s, m)}.\nOn the map of Greece she sails the lane to ${siteName(m.site)}` };
  }
  return null;
}

/** A colony's page line on what is stationed there, short (for the empire list and the map's card). */
export function stationedWords(s: SimState, col: Colony): string {
  const bits: string[] = [];
  const c = garrisonOf(s, col);
  if (c) {
    const p = passageOf(s, c.id);
    bits.push(`${companyName(c)} of ${kindWord(c.kind)}${p ? (p.dir === 'out' ? ' (on its way)' : ' (sailing home)') : c.away > 0 ? ' (out striking)' : ''}`);
  }
  const n = shipsOf(col).length;
  if (n) bits.push(`${n === 1 ? 'a trireme' : `${n} triremes`}`);
  return bits.length ? listWords(bits) : '';
}

/** The save's check of this slice's records (saves.ts asks). */
export function colonyEmpireOk(e: Record<string, unknown>): boolean {
  const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const fin = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);
  const nums = (x: unknown): boolean => Array.isArray(x) && x.every(fin);
  if (!Array.isArray(e.passages) || !Array.isArray(e.militia) || !Array.isArray(e.freed)) return false;
  const passOk = (p: unknown): boolean => isObj(p) && typeof p.site === 'string' && ['out', 'home'].includes(p.dir as string) && ['boarding', 'leaving', 'sea', 'bay', 'done'].includes(p.phase as string) && (p.ship === null || isObj(p.ship)) && nums(p.men) && ['id', 'company', 'post', 'tile', 'at', 'start', 'dur', 'trips'].every((k) => fin(p[k]));
  const milOk = (m: unknown): boolean => isObj(m) && typeof m.site === 'string' && typeof m.name === 'string' && typeof m.line === 'string' && ['sea', 'bay', 'ashore', 'home', 'done'].includes(m.phase as string) && (m.ship === null || isObj(m.ship)) && nums(m.ids) && ['id', 'raid', 'exp', 'men', 'post', 'start', 'dur', 'company'].every((k) => fin(m[k]));
  const freeOk = (f: unknown): boolean => isObj(f) && typeof f.site === 'string' && typeof f.name === 'string' && typeof f.ruler === 'string' && ['since', 'founded', 'next', 'sent', 'worth'].every((k) => fin(f[k]));
  const colOk = (c: unknown): boolean => isObj(c) && fin(c.garrison) && nums(c.ships);
  return (e.passages as unknown[]).every(passOk) && (e.militia as unknown[]).every(milOk) && (e.freed as unknown[]).every(freeOk) && (e.colonies as unknown[]).every(colOk);
}

/** (For the map of Greece: the site index of a colony, as colonies.ts' dice use.) */
export const siteIndexOf = (site: string): number => SITES.findIndex((p) => p.id === site);
