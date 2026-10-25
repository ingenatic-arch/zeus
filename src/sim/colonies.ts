/**
 * Colonies (slice 37): your own people planted on one of Greece's empty sites.
 *
 * - **Founding.** From a free site's page: a price in drachmas, four
 *   households from your town (huts, cottages and townhouses, the nearest the
 *   trading post by road first) and wheat to see them through their first
 *   winter. Each household packs, leaves its home standing empty and walks the
 *   roads down to the quay with its bundles (a `colonist` walker); your ship
 *   sails in and rides at anchor off the jetty, and they are rowed out to her.
 *   Once all are aboard (or two months on) she sails out of the bay and along
 *   the site's own lane (SITE_LANES in greece.ts) at the Tyre ship's pace,
 *   held back in winter by the storms. Landed, the site is yours.
 * - **The colony** is run lightly: its people (the site's `pop`) grow each
 *   month from newcomers from the islands (none in winter) and its own
 *   children, a little less under a heavy share and more under a light one;
 *   it makes its site's good and sends you the share you choose each season
 *   by ship, as a vassal's tribute comes (a `Tribute` record with `colony`);
 *   its loyalty moves each month towards the sum of named reasons. A large
 *   one squeezed too hard talks of freedom a season before it declares it.
 * - **Threats.** Now and then a rival with ships, cold to you, sends them to
 *   raid a colony or claim a small one: news, a line under the top bar, its
 *   fleet on the map, and the day it arrives. Your triremes can sail out to
 *   guard it (the odds shown), your army can strike at the rival's city (the
 *   threat is called off while it is out or if it won), or you let it fall.
 *
 * What it changes in your city: the households leaving and their empty homes,
 * your ship at anchor in the bay, and the colony's ships and donkeys bringing
 * its good to your stores (a ledger line and stock book lines of their own).
 * Pure: the dice are hashes of Greece's seed with a salt of their own, so no
 * older roll moves. Nothing here runs in a town with no colony or founding.
 */
import type { CoastMap } from '../map/bake';
import { HORIZON_ALONG, lineLength, PLACES, RULED, siteLaneId, siteOf, SITES, wayOf, wayPoints, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { servingFrom } from './army';
import { around, centreOf, findBuilding, HUT, recountPopulation, TOWNHOUSE } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import type { Command } from './commands';
import { news } from './diplomacy';
import { dayWords } from './favours';
import { callHome, fit, guardColony, triremeOf, afloat } from './fleet';
// Integrating slice 37 with the trunk: slice 38's blockades, warships and crippled ships.
import { bandWords, crippled, guarded } from './fleet';
import { blockaded } from './lanes';
import { pastMouth } from './trade';
import { visitorAt } from './routes';
import { armyNews } from './army';
import { held, setHeld, WARE_NAMES, WHEAT } from './foods';
// Slice 43.
import { ARMOUR, HORSES } from './foods';
import { COLONY_MAKES, SITE_WARES } from './growth';
import { roadSearch, tracePath } from './roads';
import { door, roadsBeside } from './rounds';
import { warOf } from './rivals';
import { lateWords, seasonAt, stormDelay, WINTER } from './seasons';
import type { Building, Memory, SimState, Site, Visitor, Walker } from './state';
import { TILE_ROAD } from './state';
import { note } from './stockbook';
import { berthOf, leaveTicks, PRICES, sailable, SAIL_IN, shipRoute, SHIP_ANCHORED, SHIP_COMING, SHIP_LEAVING, tradeIndex, TRADE_GOODS, tradingPost } from './trade';
import { pay, spendable } from './treasury';
import { boundTo, SEASON, type Tribute } from './vassals';
import { newWalker, roadPoints, setPath, speedOf } from './walk';
import { cityOf, COLD, memoryWorth, moodOf, nameRefusal, rulerShort, VOYAGE, WARM } from './world';
import { dhypot } from '../map/dmath';
// Slice 43: stages, works, wants and governors, and what a colony makes retuned (colonyworks.ts).
import { worksTownLine } from './colonyworks';
import { defenceWords, freshGrowth, govTrait, growthCauses, loyaltyCauses, offerAtLanding, ownDefence, raidTakes, secondYear, sendsMore, sendsYear, shipPace, stageFor, stageOf, walled, type ColonyGrowth } from './colonyworks';

// ---------------------------------------------------------------------------
// The records (kept in the `empire` field: vassals.ts' Empire has `colonies` and `foundings`).

/** A governor's one trait: loyal to you, steady, proud (wants a city of its own one day), or grasping (keeps what he can). */
export type GovTrait = 'loyal' | 'steady' | 'proud' | 'grasping'
  // Slice 43: a builder, a miser, a soldier, a favourite of the people (colonyworks.ts).
  | 'builder' | 'miser' | 'soldier' | 'favourite';
export const GOV_TRAITS: readonly GovTrait[] = ['loyal', 'steady', 'proud', 'grasping'];
export const GOV_WORDS: Record<GovTrait, string> = {
  loyal: 'loyal to your city',
  steady: 'steady: a careful hand',
  proud: 'proud: he means it to be a city in its own right one day',
  grasping: 'grasping: he keeps back what he can',
  // Slice 43.
  builder: 'a builder: he means to see it grow',
  miser: 'a miser: he counts every measure',
  soldier: 'a soldier: he drills its men',
  favourite: 'a favourite of its people',
};

/** One household going out with a founding: its home, its name, how many, and where it is. */
export interface Household {
  home: number;
  /** "the house of Nikias", its head's name, and how many of them. */
  name: string;
  head: string;
  people: number;
  /** packing (at home), walking (to the quay), quay (waiting there for the boats), aboard, or stayed (it never came: its home gone, or it moved away). */
  state: 'packing' | 'walking' | 'quay' | 'aboard' | 'stayed';
  /** Its walker while it walks and waits (0: none), and the tick it came to the quay. */
  walker: number;
  at: number;
}

/** A colony on its way: its households coming down to the quay, your ship, the voyage. */
export interface Founding {
  id: number;
  site: string;
  /** When it was ordered, what it cost (dr, measures of wheat). */
  at: number;
  cost: number;
  wheat: number;
  households: Household[];
  /** The trading post they sail from (a building id). */
  post: number;
  /** gathering (your ship coming in or at anchor, the families coming down), leaving (sailing out of the bay), sea (on the map), done. */
  phase: 'gathering' | 'leaving' | 'sea' | 'done';
  ship: Visitor | null;
  /** The latest she waits for the families. */
  until: number;
  /** On the map: when she cleared the gulf, and how long the voyage takes (storms in it). */
  start: number;
  dur: number;
  /** How many are aboard. */
  people: number;
}

/** A rival's ships on their way to a colony of yours: to raid it, or (a small one) to claim it. */
export interface ColonyThreat {
  city: CityId;
  kind: 'raid' | 'claim';
  /** When it was told, and the day they arrive. */
  at: number;
  due: number;
  /** Their ships, and the men they carry. */
  ships: number;
  men: number;
  /** The first expedition id that could answer it (an expedition against its city sent since). */
  exp: number;
  /** '' while it stands; then how it ended: driven off, called off, raided, claimed. */
  end: '' | 'driven' | 'off' | 'raided' | 'claimed';
  line: string;
}

/** One of your colonies. Its people are its site's `pop`. (Slice 43: with its stage, works, want and governor candidates: ColonyGrowth.) */
export interface Colony extends ColonyGrowth {
  site: string;
  name: string;
  /** Its governor: the head of the first household, and his trait. */
  governor: string;
  trait: GovTrait;
  since: number;
  /** How many landed. */
  settlers: number;
  /** The share of what it makes you take: 0 light, 1 fair, 2 heavy. */
  share: number;
  /** 0 to 100, moved each month half the way to what its reasons add up to. */
  loyalty: number;
  /** When its next ship sets out; how many have come, and what they were worth (dr at the ship's prices). */
  next: number;
  sent: number;
  worth: number;
  /** What it remembers of you: protected, struck for, left to be sacked (each fading). */
  memories: Memory[];
  /** Talking of freedom: when it began (0: not), and the day it declares it unless its loyalty mends. */
  talk: number;
  frees: number;
  /** The threat it faces or last faced (kept a year once over), and the triremes guarding it. */
  threat: ColonyThreat | null;
  guards: number[];
  /** The homes its settlers left in your town, by household (for their hovers). */
  homes: Array<{ home: number; name: string }>;
  /** Its next shipment is lost (a raid took it). */
  skip: boolean;
}

// ---------------------------------------------------------------------------
// The numbers.

/** The price of a founding: drachmas, households and wheat. */
export const FOUND_COST = 1000;
export const FOUND_HOUSEHOLDS = 4;
export const FOUND_WHEAT = 400;
/** A household packs this long before it sets out (one after another, a little apart). */
const PACK = 2 * TICKS_PER_DAY;
const PACK_GAP = 6;
/** Waiting on the quay with your ship at anchor, a household is rowed out to her after this long. */
const BOARD = TICKS_PER_DAY;
/** She waits for the families at most this long after the founding was ordered. */
const WAIT_MOST = 60 * TICKS_PER_DAY;
/** She anchors this far back along her way in from the jetty (tiles), and this far to one side of it where the water is deep (the other side from where a trader waiting for the jetty anchors first), in sight of the quay and out of the way. */
const ANCHOR_BACK = 6;
const ANCHOR_ASIDE = [-2.2, 2.2, -1.2, 1.2, 0] as const;
/** Growth: newcomers a year while it is small (none in winter, fewer as it fills), its children a year, the share's pull a year (light, fair, heavy), and its ceiling. */
const NEWCOMERS = 150;
const CHILDREN = 0.03;
const SHARE_GROWTH = [0.02, 0, -0.03] as const;
export const COLONY_CEILING = 2000;
/** The share of what it makes sent: light, fair, heavy (slice 43: what it makes is in colonyworks.ts). */
export const COLONY_SHARE = [0.2, 0.4, 0.6] as const;
export const SHARE_WORDS = ['light', 'fair', 'heavy'] as const;
/** Loyalty: its base; its settlers' ties (fading over twelve years); the share; your triremes (each, most) or none; grown large (each hundred over, most); the governor. */
const LOYAL_BASE = 50;
const TIES = 25;
const TIES_FADE = 12 * TICKS_PER_YEAR;
const SHARE_LOYALTY = [15, 0, -20] as const;
const TRIREME_EACH = 3;
const TRIREMES_MOST = 9;
const NO_TRIREMES = -5;
const LARGE_FROM = 600;
const LARGE_MOST = -10;
/** Freedom: a colony this big talks of it under ARMING loyalty, stands down at STAND_DOWN, and declares it on its day (a season on). */
export const FREE_FROM = 500;
const ARMING = 30;
const STAND_DOWN = 40;
/** (For the page: where talk of freedom begins and ends.) */
export const COLONY_ARMING = ARMING;
export const COLONY_STAND_DOWN = STAND_DOWN;
const WARNING = 90 * TICKS_PER_DAY;
/** Threats: one in so many a month for each colony (from its sixth month, a year apart, none told in winter); their day; the ships (a quarter of the rival's fleet, 2 to 5) and the men each carries. */
const THREAT_ODDS = 1 / 40;
const THREAT_FROM = 6 * TICKS_PER_MONTH;
const THREAT_GAP = TICKS_PER_YEAR;
const THREAT_DAYS = 60 * TICKS_PER_DAY;
const SHIPS_LEAST = 2;
const SHIPS_MOST = 5;
const MEN_A_SHIP = 15;
/** A claim: on a colony under this many people, whose own men (one in eight) are under a third of theirs. */
const CLAIM_UNDER = 300;
/** A fight off the colony: the odds with as many ships as theirs, and for each time more (at most). */
const ODDS_BASE = 0.35;
const ODDS_PER = 0.35;
const ODDS_MOST = 0.9;
/** What it remembers: raiders driven off, a city struck for it, sacked while you did nothing (or though your triremes fought). */
const DRIVEN = { amount: 15, fade: 3 * TICKS_PER_YEAR };
const STRUCK = { amount: 10, fade: 2 * TICKS_PER_YEAR };
const SACKED = { amount: -25, fade: 3 * TICKS_PER_YEAR };
const FOUGHT = { amount: -10, fade: 2 * TICKS_PER_YEAR };
/** A raid takes this share of its people. */
const RAID_TAKES = 0.15;
/** A rival that claimed your colony remembers it of you. */
const CLAIMED = { amount: -15, fade: 2 * TICKS_PER_YEAR };
/** How long a threat that is over is kept for the page. */
const KEEP = TICKS_PER_YEAR;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const siteName = (id: string): string => siteOf(id)?.name ?? id;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Greece's dice for colonies (a hash: no generator is touched). */
const dice = (s: SimState, a: number, i: number, salt: number): number => hash2(a, i * 41 + salt, (s.world.seed ^ 0x636f6c6f) | 0);

/** The news key for a site's page ('site:thasos'): the map opens the site's page for it. */
export const siteKey = (site: string): string => `site:${site}`;

// ---------------------------------------------------------------------------
// Looking things up.

export const colonyOf = (s: SimState, site: string): Colony | undefined => s.empire.colonies.find((c) => c.site === site);
export const foundingOf = (s: SimState, site?: string): Founding | undefined => s.empire.foundings.find((f) => f.phase !== 'done' && (!site || f.site === site));
export const siteRecord = (s: SimState, site: string): Site | undefined => s.world.sites.find((x) => x.id === site);
/** A colony's people (its site's). */
export const peopleOf = (s: SimState, c: Colony): number => Math.round(siteRecord(s, c.site)?.pop ?? 0);
/** The trade good a site makes (TRADE_GOODS index; -1 none). */
export function siteGood(site: string): number {
  const p = siteOf(site);
  const ware = p ? SITE_WARES[p.good] : undefined;
  return ware === undefined ? -1 : tradeIndex(ware);
}
/** "timber", "marble". */
export const goodName = (k: number): string => (k >= 0 ? WARE_NAMES[TRADE_GOODS[k]] : 'goods');

/** How long your ship takes from the gulf's mouth to a site: at the Tyre ship's pace. */
export function laneTicks(site: string): number {
  const tyre = lineLength(wayPoints(wayOf('tyre-sea'))) - HORIZON_ALONG;
  return Math.max(TICKS_PER_DAY, Math.round((VOYAGE * (lineLength(wayPoints(wayOf(siteLaneId(site)))) - HORIZON_ALONG)) / tyre));
}

/** A lane's length on the table. */
const laneLength = (site: string): number => lineLength(wayPoints(wayOf(siteLaneId(site))));

// ---------------------------------------------------------------------------
// Founding.

/** The households that would go: from huts, cottages and townhouses, whose men are at home, the nearest the trading post by road first. */
export function foundingHouseholds(s: SimState, map: CoastMap, n = FOUND_HOUSEHOLDS): Household[] {
  const post = tradingPost(s);
  if (!post) return [];
  const roads = roadsBeside(s, map.size, post);
  if (!roads.length) return [];
  const search = roadSearch(s, map.size, roads);
  const busy = new Set<number>();
  for (const f of s.empire.foundings) for (const h of f.households) if (h.state === 'packing') busy.add(h.home);
  const out: Array<{ b: number; d: number; h: Household }> = [];
  for (const b of s.buildings) {
    // (Integrating slice 37 with the trunk: never an estate's noble house, slice 36's, whatever its level.)
    if (b.kind !== 'home' || b.estate || b.level < HUT || b.level > TOWNHOUSE || b.people < 2 || !b.family || busy.has(b.id)) continue;
    if (servingFrom(s, b) || s.fleet.triremes.some((t) => t.crew.some((r) => r.home === b.id)) || s.walkers.some((w) => w.kind === 'thief' && w.home === b.id)) continue;
    let d = Infinity;
    for (const t of around(map.size, b)) if (s.tiles[t] === TILE_ROAD && search.dist[t] >= 0 && search.dist[t] < d) d = search.dist[t];
    if (d === Infinity) continue;
    const head = b.family.members[0]?.name ?? b.family.name;
    out.push({ b: b.id, d, h: { home: b.id, name: `the house of ${b.family.name}`, head, people: b.people, state: 'packing', walker: 0, at: 0 } });
  }
  out.sort((a, b) => a.d - b.d || a.b - b.b);
  return out.slice(0, n).map((x) => x.h);
}

/** Wheat in your granaries. */
const wheatHeld = (s: SimState): number => s.buildings.reduce((a, b) => a + (b.kind === 'granary' ? held(b, WHEAT) : 0), 0);

/** A founding as it would go now: who would go, the price, or why it can't be sent. */
export function foundingPlan(s: SimState, map: CoastMap, site: string): { refusal: string; households: Household[]; people: number; cost: number; wheat: number; voyage: number } {
  const households = foundingHouseholds(s, map);
  const people = households.reduce((a, h) => a + h.people, 0);
  const plan = { households, people, cost: FOUND_COST, wheat: FOUND_WHEAT, voyage: siteOf(site) ? laneTicks(site) : 0 };
  return { refusal: foundRefusal(s, map, site, households.length), ...plan };
}

/** Why a colony can't be founded on a site now ('' if it can). */
export function foundRefusal(s: SimState, map: CoastMap, site: string, households = foundingHouseholds(s, map).length): string {
  const x = siteRecord(s, site);
  if (!x || !siteOf(site)) return 'There is no such site';
  if (x.owner === 'home') return 'It is your colony already';
  if (x.owner) return `${siteName(site)} is ${whose(x.owner)} colony`;
  if (x.free) return `${x.free} stands free there now: nobody founds on ${siteName(site)} again`;
  if (x.bound === 'home') return 'Your settlers are on their way there';
  if (x.bound) return `${cityName(x.bound)}’s settlers are on their way there`;
  if (foundingOf(s)) return `Your settlers for ${siteName(foundingOf(s)?.site ?? '')} are still on their way: one founding at a time`;
  const post = tradingPost(s);
  if (!post || !berthOf(map, post)) return 'Settlers sail from the quay: build a trading post on the bay shore';
  if (!roadsBeside(s, map.size, post).length) return 'No road reaches the trading post for the families to walk down';
  if (spendable(s) < FOUND_COST) return `Fitting out a colony costs ${fmt(FOUND_COST)} dr: you have ${fmt(spendable(s))} to spend`;
  if (wheatHeld(s) < FOUND_WHEAT) return `The settlers need ${fmt(FOUND_WHEAT)} wheat for their first winter: your granaries hold ${fmt(wheatHeld(s))}`;
  if (households < FOUND_HOUSEHOLDS) return `Four households must go (from huts, cottages or townhouses, by road from the trading post, their men at home): you have ${households} who could`;
  return '';
}

/** Send settlers to a site (foundRefusal said yes): the cost, the wheat, the households packing, your ship sailing in. */
function found(s: SimState, map: CoastMap, site: string): void {
  const post = tradingPost(s);
  const berth = post ? berthOf(map, post) : null;
  if (!post || !berth) return;
  const x = siteRecord(s, site) as Site;
  const households = foundingHouseholds(s, map);
  pay(s, -FOUND_COST, 'colonies', `Fitting out settlers for ${siteName(site)}`);
  let left = FOUND_WHEAT;
  for (const b of s.buildings.filter((y) => y.kind === 'granary').sort((a, b) => held(b, WHEAT) - held(a, WHEAT) || a.id - b.id)) {
    if (left <= 0) break;
    const n = Math.min(left, held(b, WHEAT));
    setHeld(b, WHEAT, held(b, WHEAT) - n);
    left -= n;
  }
  note(s, WHEAT, 'sold', `colony:${site}`, FOUND_WHEAT - left);
  households.forEach((h, i) => (h.at = s.tick + PACK + i * PACK_GAP));
  const path = shipRoute(map, berth);
  const L = pathLen(path);
  const ship: Visitor | null = path.length >= 4 ? { phase: SHIP_COMING, since: s.tick, turned: 1, path, post: post.id, stop: Math.max(0.3, 1 - ANCHOR_BACK / Math.max(1, L)), aside: 0 } : null;
  if (ship) {
    const at = pointOn(path, ship.stop * L);
    ship.aside = ANCHOR_ASIDE.find((a) => a === 0 || [0.5, 1].every((k) => sailable(map, at.x - at.dz * a * k, at.z + at.dx * a * k))) ?? 0;
  }
  const f: Founding = { id: s.empire.nextId++, site, at: s.tick, cost: FOUND_COST, wheat: FOUND_WHEAT - left, households, post: post.id, phase: 'gathering', ship, until: s.tick + WAIT_MOST, start: 0, dur: 0, people: 0 };
  s.empire.foundings.push(f);
  x.bound = 'home';
  x.told = s.tick;
  x.lands = 0;
  const people = households.reduce((a, h) => a + h.people, 0);
  news(s.world, s.tick, siteKey(site), `Your settlers for ${siteName(site)} are packing: ${households.map((h) => h.name.replace(/^the house of /, '')).join(', ')} (${people} people) walk down to the quay, and your ship sails in for them about ${dayWords(s.tick + SAIL_IN)}`);
  s.rev++;
}

/** A point along a path (x, z pairs) at a distance, and the way it runs there (a unit vector). */
export function pointOn(p: readonly number[], d: number): { x: number; z: number; dx: number; dz: number } {
  let left = d;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const len = dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
    if (left <= len || i + 4 >= p.length - 1) {
      const u = len > 0 ? Math.min(1, left / len) : 0;
      return { x: p[i] + (p[i + 2] - p[i]) * u, z: p[i + 1] + (p[i + 3] - p[i + 1]) * u, dx: len > 0 ? (p[i + 2] - p[i]) / len : 1, dz: len > 0 ? (p[i + 3] - p[i + 1]) / len : 0 };
    }
    left -= len;
  }
  return { x: p[0], z: p[1], dx: 1, dz: 0 };
}

export const pathLen = (p: readonly number[]): number => {
  let l = 0;
  for (let i = 0; i + 3 < p.length; i += 2) l += dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return l;
};

/** A household sets out: its home empties (its level kept, for newcomers later), and it walks down to the quay. */
function setOut(s: SimState, map: CoastMap, f: Founding, h: Household, i: number): void {
  const b = findBuilding(s, h.home);
  if (!b || b.kind !== 'home' || !b.family || `the house of ${b.family.name}` !== h.name || b.people <= 0 || servingFrom(s, b)) {
    h.state = 'stayed';
    return;
  }
  h.people = b.people;
  s.left += b.people;
  b.people = 0;
  b.family = null;
  b.workers = 0;
  b.unpaid = 0;
  recountPopulation(s);
  const post = findBuilding(s, f.post);
  const w = newWalker(s, 'colonist', h.people);
  w.home = h.home;
  w.origin = f.id;
  w.target = f.post;
  w.food = i;
  w.since = s.tick;
  const n = map.size;
  const homeRoads = around(n, b).filter((t) => s.tiles[t] === TILE_ROAD);
  const postRoads = post ? roadsBeside(s, n, post) : [];
  const spot = post ? quaySpot(map, post, i) : null;
  let ok = false;
  if (post && spot && homeRoads.length && postRoads.length) {
    const search = roadSearch(s, n, postRoads);
    const near = homeRoads.filter((t) => search.dist[t] >= 0).sort((a, c) => search.dist[a] - search.dist[c] || a - c)[0];
    if (near !== undefined) {
      const tiles = tracePath(search, near).reverse();
      const [hx, hz] = door(n, b, near);
      const last = tiles[tiles.length - 1];
      const [px, pz] = door(n, post, last);
      setPath(w, [[hx, hz, -1], ...roadPoints(s, n, tiles), [px, pz, -1], [spot[0], spot[1], -1]]);
      ok = true;
    }
  }
  if (!ok) {
    // (No road between them: they are carried down by back ways, and wait on the quay.)
    const [cx, cz] = spot ?? centreOf(b);
    setPath(w, [[cx, cz, -1], [cx + 0.01, cz, -1]]);
  }
  s.walkers.push(w);
  h.state = 'walking';
  h.walker = w.id;
  s.rev++;
}

/** Where a household waits on the quay: by the jetty's root, along the post's shore side, one beside another. */
export function quaySpot(map: CoastMap, post: Building, i: number): [number, number] | null {
  const berth = berthOf(map, post);
  if (!berth) return null;
  // Along the shore side (square to the jetty), each household a step further from it, and a little back from the water.
  const along = [-0.9, 0.9, -1.6, 1.6, -2.2, 2.2][i % 6];
  const back = 0.45;
  return [berth.jx - berth.ox * back - berth.oz * along, berth.jz - berth.oz * back + berth.ox * along];
}

/** Move a colonist household a tick (sim.ts' walkers): down the roads to the quay, waiting there, and aboard. False once it is gone. */
export function moveColonist(s: SimState, w: Walker): boolean {
  const f = s.empire.foundings.find((x) => x.id === w.origin);
  const h = f?.households[w.food];
  if (!f || !h || h.walker !== w.id) return false;
  if (h.state === 'aboard' || h.state === 'stayed') return false;
  if (h.state === 'quay') return true;
  let move = speedOf(w);
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return true;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  if (w.seg >= w.path.length / 2 - 1) {
    h.state = 'quay';
    h.at = s.tick;
    s.rev++;
  }
  return true;
}

/** Each tick, a founding: households setting out, your ship coming in and at anchor, the families rowed out, the ship sailing, the voyage, the landing. */
function stepFounding(s: SimState, map: CoastMap, f: Founding): void {
  if (f.phase === 'gathering') {
    f.households.forEach((h, i) => {
      if (h.state === 'packing' && s.tick >= h.at) setOut(s, map, f, h, i);
    });
    const v = f.ship;
    // (Integrating slice 37 with the trunk: while a blockade holds the harbour's mouth, your ship waits outside it, where she is, and sails in when it ends.)
    const closed = !!blockaded(s);
    if (v && v.phase === SHIP_COMING && closed && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0)) v.since++;
    if (v && v.phase === SHIP_COMING && s.tick >= v.since + SAIL_IN) {
      v.phase = SHIP_ANCHORED;
      v.since = s.tick;
      news(s.world, s.tick, siteKey(f.site), `Your ship for ${siteName(f.site)} rides at anchor off the jetty: the families are rowed out to her as they come down to the quay`);
      s.rev++;
    }
    const anchored = !v || v.phase === SHIP_ANCHORED;
    const late = s.tick >= f.until;
    for (const h of f.households) {
      if (!anchored) continue;
      if ((h.state === 'quay' && s.tick - h.at >= BOARD) || (late && (h.state === 'quay' || h.state === 'walking'))) aboard(s, f, h);
      if (late && h.state === 'packing') h.state = 'stayed';
    }
    // (And at anchor she can't sail out past it: she waits, with the families aboard.)
    if (anchored && !closed && f.households.every((h) => h.state === 'aboard' || h.state === 'stayed')) sail(s, f);
  } else if (f.phase === 'leaving') {
    if (!f.ship || s.tick >= f.ship.since + leaveTicks(f.ship)) {
      f.ship = null;
      f.phase = 'sea';
      f.start = s.tick;
      const voyage = laneTicks(f.site);
      f.dur = voyage + stormDelay(s, `colony-${f.site}`, s.tick + voyage);
      s.rev++;
    }
  } else if (f.phase === 'sea' && s.tick >= f.start + f.dur) land(s, f);
}

/** A household is rowed out to the ship. */
function aboard(s: SimState, f: Founding, h: Household): void {
  h.state = 'aboard';
  f.people += h.people;
  s.walkers = s.walkers.filter((w) => w.id !== h.walker || w.kind !== 'colonist');
  h.walker = 0;
  s.rev++;
}

/** All aboard (or as many as came): she sails out of the bay; with nobody aboard, the founding comes to nothing. */
function sail(s: SimState, f: Founding): void {
  const x = siteRecord(s, f.site) as Site;
  if (f.people <= 0) {
    f.phase = 'done';
    x.bound = '';
    if (f.ship) {
      f.ship.phase = SHIP_LEAVING;
      f.ship.turned = f.ship.stop;
      f.ship.since = s.tick;
    }
    news(s.world, s.tick, siteKey(f.site), `Nobody came down to the quay for ${siteName(f.site)}: your ship sails off empty, and there will be no colony there this time`, true);
    s.rev++;
    return;
  }
  f.phase = 'leaving';
  if (f.ship) {
    f.ship.phase = SHIP_LEAVING;
    f.ship.turned = f.ship.stop;
    f.ship.since = s.tick;
  }
  news(s.world, s.tick, siteKey(f.site), `Your settlers sail for ${siteName(f.site)}: ${fmt(f.people)} people from ${f.households.filter((h) => h.state === 'aboard').length} households. They land about ${dayWords(landsAbout(s, f))}`);
  s.rev++;
}

/** They land: the site is yours, the colony's record, its governor. */
function land(s: SimState, f: Founding): void {
  const x = siteRecord(s, f.site) as Site;
  f.phase = 'done';
  x.bound = '';
  x.owner = 'home';
  x.since = s.tick;
  x.pop = f.people;
  const first = f.households.find((h) => h.state === 'aboard') ?? f.households[0];
  const trait = GOV_TRAITS[Math.floor(dice(s, f.id, SITES.findIndex((p) => p.id === f.site), 1) * GOV_TRAITS.length)];
  const c: Colony = {
    site: f.site,
    name: `Nea ${siteName(f.site)}`,
    governor: first?.head ?? 'Nikias',
    trait,
    since: s.tick,
    settlers: f.people,
    share: 1,
    loyalty: LOYAL_BASE,
    next: s.tick + SEASON,
    sent: 0,
    worth: 0,
    memories: [],
    talk: 0,
    frees: 0,
    threat: null,
    guards: [],
    homes: f.households.filter((h) => h.state === 'aboard').map((h) => ({ home: h.home, name: h.name })),
    skip: false,
    // Slice 43: its stage, works, wants and governor.
    ...freshGrowth(s, f.site, f.people, s.tick),
  };
  s.empire.colonies.push(c);
  // (Slice 43: its leader governs while you choose from him and two others.)
  offerAtLanding(s, c);
  c.loyalty = Math.round(colonyLoyalty(s, c).target);
  s.empire.foundings = s.empire.foundings.filter((y) => y !== f);
  const k = siteGood(f.site);
  news(s.world, s.tick, siteKey(f.site), `Your settlers have landed on ${siteName(f.site)} and founded ${c.name}: ${fmt(f.people)} people, ${c.governor} its governor (${c.trait})${c.candidates.length ? ` until you choose who governs it from its page, by ${dayWords(c.chooseBy)}` /* (Review of slice 43: where the choice is made, and by when.) */ : ''}. Its first ship of ${goodName(k)} sails for you within a season`, true);
  s.rev++;
}

/**
 * A colony of yours on a site, as if it had landed `since` with so many
 * people (demos and tests call this to stage one; a player founds one).
 */
export function plantColony(s: SimState, site: string, people: number, since = s.tick, governor = 'Nikias', trait: GovTrait = 'steady'): Colony {
  const x = siteRecord(s, site) as Site;
  x.owner = 'home';
  x.bound = '';
  x.since = since;
  x.pop = people;
  const c: Colony = { site, name: `Nea ${siteName(site)}`, governor, trait, since, settlers: people, share: 1, loyalty: LOYAL_BASE, next: s.tick + SEASON, sent: 0, worth: 0, memories: [], talk: 0, frees: 0, threat: null, guards: [], homes: [], skip: false, ...freshGrowth(s, site, people, since) };
  s.empire.colonies.push(c);
  c.loyalty = Math.round(colonyLoyalty(s, c).target);
  s.rev++;
  return c;
}

// ---------------------------------------------------------------------------
// The colony: growth, shipments, loyalty, freedom.

/** A colony's growth a year now, cause by cause (people a year). */
export function colonyGrowth(s: SimState, c: Colony, winter = false): Array<{ why: string; n: number }> {
  const pop = peopleOf(s, c);
  const room = Math.max(0, 1 - pop / COLONY_CEILING);
  const out: Array<{ why: string; n: number }> = [];
  out.push({ why: winter ? 'newcomers from the islands (none sail in winter)' : `newcomers from the islands${pop < 600 ? ', while it is small' : ''}`, n: winter ? 0 : Math.round(NEWCOMERS * room) });
  out.push({ why: 'its own children', n: Math.round(pop * CHILDREN * room) });
  const sh = SHARE_GROWTH[clamp(c.share, 0, 2)];
  if (sh) out.push({ why: sh > 0 ? 'a light share: more stay and more come' : 'a heavy share: families leave for elsewhere', n: Math.round(pop * sh) });
  // Slice 43: its fields, its governor, a want met or ignored.
  out.push(...growthCauses(s, c, winter, winter ? 0 : Math.round(NEWCOMERS * room), pop, room));
  return out;
}

/** What a colony sends a year at a share: in drachmas at the ship's prices, and in its good. */
export function colonyYear(s: SimState, c: Colony, share = c.share): { dr: number; amount: number; good: number } {
  // (Slice 43: at its stage's rate, with what its harbour and its governor add.)
  return shareYear(c.site, peopleOf(s, c), share, stageOf(c), sendsMore(c));
}

/** What a colony of so many people on a site would send a year at a share (for a free site's page, before it is founded). */
export function shareYear(site: string, people: number, share: number, stage = stageFor(people), more = 0): { dr: number; amount: number; good: number } {
  const k = siteGood(site);
  // (Slice 43: measures of its good a person at its stage's rate (colonyworks.ts), no longer slice 37's MAKES_DR drachmas a person, which sent cheap goods by the thousand.)
  const y = sendsYear(k, people, stage, COLONY_SHARE[clamp(share, 0, 2)], more);
  return { dr: y.dr, amount: y.amount, good: k };
}

export interface Loyalty {
  target: number;
  why: Array<{ why: string; n: number }>;
}

/** What a colony's loyalty adds up to now, reason by reason. */
export function colonyLoyalty(s: SimState, c: Colony): Loyalty {
  const why: Array<{ why: string; n: number }> = [];
  const add = (n: number, words: string): void => {
    const k = Math.round(n);
    if (k !== 0) why.push({ why: words, n: k });
  };
  const years = Math.floor((s.tick - c.since) / TICKS_PER_YEAR);
  add(TIES * Math.max(0, 1 - (s.tick - c.since) / TIES_FADE), years < 1 ? 'its settlers are your own people' : `its settlers are your own people (yours ${years} ${years === 1 ? 'year' : 'years'}: the ties loosen)`);
  add(SHARE_LOYALTY[clamp(c.share, 0, 2)], `a ${SHARE_WORDS[clamp(c.share, 0, 2)]} share`);
  for (const m of c.memories) add(memoryWorth(m, s.tick), m.why);
  const ships = s.fleet.triremes.filter((t) => afloat(t) && t.state !== 'building').length;
  add(ships ? Math.min(TRIREMES_MOST, ships * TRIREME_EACH) : NO_TRIREMES, ships ? `your ${ships} ${ships === 1 ? 'trireme' : 'triremes'} to protect it` : 'you have no triremes to protect it');
  const pop = peopleOf(s, c);
  if (pop > LARGE_FROM) add(Math.max(LARGE_MOST, -Math.floor((pop - LARGE_FROM) / 100)), 'grown large: it feels it could stand alone');
  // (Slice 43: no governor's trait while its council holds it.)
  const trait = govTrait(c);
  if (trait === 'loyal') add(10, `${c.governor}, its governor, is loyal`);
  if (trait === 'steady') add(5, `${c.governor}, its governor, is steady`);
  if (trait === 'proud' && pop > FREE_FROM) add(-10, `${c.governor}, its governor, is proud, and it has grown`);
  // (Review of slice 37: the share is already its own reason, so this one doesn't name it again in the short list.)
  if (trait === 'grasping' && c.share === 2) add(-10, `${c.governor}, its governor, is grasping: he keeps back what he can of a heavy share`);
  // Slice 43: its agora and temple, and its governor's new traits.
  for (const x of loyaltyCauses(c)) add(x.n, x.why);
  why.sort((a, b) => Math.abs(b.n) - Math.abs(a.n));
  return { target: clamp(LOYAL_BASE + why.reduce((a, x) => a + x.n, 0), 0, 100), why };
}

/** "a heavy share, grown large": what pulls a colony's loyalty down, worst first. */
export const lowReasons = (l: Loyalty, most = 2): string => l.why.filter((x) => x.n < 0).slice(0, most).map((x) => x.why.replace(/[:(].*$/, '').trim()).join(', ');

/** A colony's ship sets out with its share for the season. */
function sendShipment(s: SimState, c: Colony): void {
  c.next = s.tick + SEASON;
  if (c.skip) {
    c.skip = false;
    news(s.world, s.tick, siteKey(c.site), `${c.name} sends you nothing this season: the raiders took what it had`);
    return;
  }
  const y = colonyYear(s, c);
  // (Slice 43: horses and armour come by the head and the set, not by tens; and a second trade sends its own good on a second ship.)
  const season = (k: number, n: number): number => {
    const step = k >= 0 && (TRADE_GOODS[k] === HORSES || TRADE_GOODS[k] === ARMOUR) ? 1 : 10;
    return Math.round(n / 4 / step) * step;
  };
  const two = secondYear(s, c, COLONY_SHARE[clamp(c.share, 0, 2)]);
  const loads = [
    { good: y.good, amount: season(y.good, y.amount) },
    { good: two.good, amount: season(two.good, two.amount) },
  ].filter((l) => l.good >= 0 && l.amount >= (TRADE_GOODS[l.good] === HORSES || TRADE_GOODS[l.good] === ARMOUR ? 1 : 10));
  if (!loads.length) return;
  // (Integrating slice 37 with the trunk: a city at war with you whose warships prey on your lanes, slice 38's, takes the share as
  // it sails, unless a trireme guards the colony's lane.)
  const foe = s.fleet.pirates.find((p) => p.of && p.war === -1 && p.state === 'preying');
  if (foe && !guarded(s, siteLaneId(c.site))) {
    const words = `${c.name}’s share of ${loads.map((l) => `${fmt(l.amount)} ${goodName(l.good)}`).join(' and ')}`;
    foe.took.push(words);
    news(s.world, s.tick, siteKey(c.site), `${bandWords(foe)} ${foe.place} seized ${words} on its way to you: ${whose(foe.of as CityId)} ships are at war with you. A trireme guarding ${c.name} keeps its ships safe`, true);
    armyNews(s, `${bandWords(foe)} ${foe.place} seized ${words}`, 0);
    s.rev++;
    return;
  }
  // (Slice 43: a colony with a harbour sends its ships a quarter quicker.)
  const voyage = Math.round(laneTicks(c.site) * shipPace(c));
  const ship = `colony-${c.site}`;
  const late = stormDelay(s, ship, s.tick + voyage);
  for (const l of loads) {
    const worth = Math.round((l.amount * PRICES[l.good]) / 100);
    const t: Tribute = { id: s.empire.nextId++, city: 'home', good: l.good, amount: l.amount, worth, by: 'sea', way: siteLaneId(c.site), phase: 'road', start: s.tick, dur: voyage + late, ship: null, put: 0, lost: 0, store: 0, how: '', ended: 0, colony: c.site };
    s.empire.tribute.push(t);
  }
  news(s.world, s.tick, siteKey(c.site), `${c.name} sends you its share: ${loads.map((l) => `${fmt(l.amount)} ${goodName(l.good)}`).join(' and ')}${loads.length > 1 ? ', on two ships' : ''}, in your bay about ${dayWords(s.tick + voyage + late + SAIL_IN)}${late ? lateWords(s, ship) : ''}`);
}

/** Once a month: each colony grows, its loyalty moves, it talks of freedom (or stops, or declares it), and a threat may come. */
function monthly(s: SimState, map: CoastMap): void {
  const winter = seasonAt(s.tick) === WINTER && !!s.season?.on;
  for (const c of s.empire.colonies.slice()) {
    const x = siteRecord(s, c.site);
    if (!x) continue;
    const grow = colonyGrowth(s, c, winter).reduce((a, g) => a + g.n, 0);
    x.pop = Math.round(clamp(x.pop + grow / 12, 1, COLONY_CEILING) * 100) / 100;
    const l = colonyLoyalty(s, c);
    c.loyalty = Math.round(clamp(c.loyalty + (l.target - c.loyalty) / 2, 0, 100));
    const pop = peopleOf(s, c);
    if (c.talk) {
      if (c.loyalty >= STAND_DOWN) {
        c.talk = 0;
        c.frees = 0;
        news(s.world, s.tick, siteKey(c.site), `${c.name} stops its talk of freedom: its loyalty has mended (${c.loyalty})`, true);
      } else if (s.tick >= c.frees) {
        if (c.loyalty < ARMING && pop >= FREE_FROM) goFree(s, map, c, l);
        else {
          c.talk = 0;
          c.frees = 0;
          news(s.world, s.tick, siteKey(c.site), `${c.name} thought better of standing alone (its loyalty ${c.loyalty}), and stays yours`);
        }
      }
    } else if (c.loyalty < ARMING && pop >= FREE_FROM) {
      c.talk = s.tick;
      c.frees = s.tick + WARNING;
      news(s.world, s.tick, siteKey(c.site), `${c.name} talks of freedom: loyalty ${c.loyalty} (${lowReasons(l)}). It declares itself free about ${dayWords(c.frees)} unless its loyalty mends: lighten its share, or guard it`, true);
    }
    if (!winter && s.empire.colonies.includes(c)) maybeThreat(s, c);
  }
}

/** A colony declares itself free: no longer yours, its site marked free. */
function goFree(s: SimState, map: CoastMap, c: Colony, l: Loyalty): void {
  const x = siteRecord(s, c.site) as Site;
  x.owner = '';
  x.free = c.name;
  x.since = s.tick;
  guardsHome(s, map, c);
  s.empire.colonies = s.empire.colonies.filter((y) => y !== c);
  news(s.world, s.tick, siteKey(c.site), `${c.name} has declared itself free: ${fmt(peopleOf(s, c))} people under ${c.governor || 'its council'}, with its loyalty at ${c.loyalty} (${lowReasons(l)}). It sends you nothing now`, true, 'rebellion');
  s.rev++;
}

// ---------------------------------------------------------------------------
// Threats.

/** The rivals who might send ships against your colonies: ruled, with ships, at peace, not bound to you, cold to you (or warlike and not warm). */
export function colonyFoes(s: SimState): CityId[] {
  return RULED.filter((id) => {
    const c = cityOf(s.world, id);
    if (!c.ruler || !c.pop || c.fleet < SHIPS_LEAST || warOf(s.world, id) || boundTo(s, id) || c.lord === 'home') return false;
    const mood = moodOf(c, s.tick);
    return mood <= COLD || (c.ruler.traits.includes('warlike') && mood < WARM);
  });
}

/** Now and then, a rival's ships set out against a colony. */
function maybeThreat(s: SimState, c: Colony): void {
  if ((c.threat && c.threat.end === '') || s.tick - c.since < THREAT_FROM) return;
  if (c.threat && s.tick - c.threat.at < THREAT_GAP) return;
  const i = SITES.findIndex((p) => p.id === c.site);
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  if (dice(s, month, i, 2) >= THREAT_ODDS) return;
  const foes = colonyFoes(s);
  if (!foes.length) return;
  const city = foes[Math.floor(dice(s, month, i, 3) * foes.length)];
  threatenColony(s, c, city);
}

/** A rival's ships set out against a colony (demos call this to stage one): a raid, or a claim on a small one. */
export function threatenColony(s: SimState, c: Colony, city: CityId, kind?: ColonyThreat['kind']): ColonyThreat {
  const r = cityOf(s.world, city);
  const ships = clamp(Math.round(r.fleet / 4), SHIPS_LEAST, SHIPS_MOST);
  const men = ships * MEN_A_SHIP;
  const pop = peopleOf(s, c);
  // (Slice 43: a walled colony can't be claimed, only raided.)
  const k = kind ?? (!walled(c) && pop < CLAIM_UNDER && men >= 3 * Math.round(pop / 8) ? 'claim' : 'raid');
  const t: ColonyThreat = { city, kind: k, at: s.tick, due: s.tick + THREAT_DAYS, ships, men, exp: s.world.nextExpedition, end: '', line: '' };
  c.threat = t;
  news(s.world, s.tick, siteKey(c.site), `${ships} ships of ${cityName(city)} are sailing for ${c.name} ${k === 'claim' ? `to claim it for ${cityName(city)}: ${men} men against its ${Math.round(pop / 8)}` : `to raid it: ${men} men`}. They arrive about ${dayWords(t.due)}: send your triremes to guard it, strike at ${cityName(city)}, or let it be`, true);
  s.rev++;
  return t;
}

/** The triremes at home that could sail to guard a colony: guarding the bay, crewed and sound. */
export const guardsAtHome = (s: SimState): number[] => s.fleet.triremes.filter((t) => t.order === 'bay' && (t.state === 'moored' || (t.state === 'rowing' && t.task === 'home')) && fit(t)).map((t) => t.id);

/** The odds of a fight off a colony with so many triremes against their ships. */
export const fightOdds = (ours: number, theirs: number): number => (ours <= 0 ? 0 : Math.min(ODDS_MOST, Math.round((ODDS_BASE + (ODDS_PER * ours) / Math.max(1, theirs)) * 100) / 100));

/** A colony's guards there now (on station off it). */
const guardsThere = (s: SimState, c: Colony): number => c.guards.filter((id) => {
  const t = triremeOf(s, id);
  // (Integrating slice 37 with the trunk: a crippled trireme, slice 38's, hull or oars, does not guard.)
  return !!t && afloat(t) && !crippled(t) && t.order === 'lane' && t.lane === siteLaneId(c.site) && t.state === 'away' && !t.homeward && s.tick >= t.start + t.dur;
}).length;

/** A colony's guards that can fight, there or on the way (afloat, not crippled): for its page and the line under the top bar. */
export const colonyGuards = (s: SimState, c: Colony): number => c.guards.filter((id) => {
  const t = triremeOf(s, id);
  return !!t && afloat(t) && !crippled(t);
}).length;

/** Each day: a threat called off by your army, or come to its day. */
function stepThreat(s: SimState, map: CoastMap, c: Colony): void {
  const t = c.threat;
  if (!t) return;
  if (t.end !== '') {
    if (s.tick - t.due > KEEP) c.threat = null;
    return;
  }
  // (Your army against its city, sent since: out, or back the winner.)
  const struck = s.world.expeditions.find((e) => e.city === t.city && e.id >= t.exp && (e.phase !== 'done' || e.won));
  if (struck) {
    t.end = 'off';
    t.line = `${cityName(t.city)} called its ships home: its men were needed at home, with your army ${struck.phase === 'done' ? 'lately at its gates' : 'marching on it'}`;
    remember(c, s.tick, 'struck', `you struck at ${cityName(t.city)} for it`, STRUCK.amount, STRUCK.fade);
    guardsHome(s, map, c);
    news(s.world, s.tick, siteKey(c.site), `${cityName(t.city)} calls its ships home from ${c.name}: its men are needed at home. ${c.name} remembers you struck for it (${signed(STRUCK.amount)})`, true);
    s.rev++;
    return;
  }
  if (s.tick < t.due) return;
  const ours = guardsThere(s, c);
  const p = fightOdds(ours, t.ships);
  // (Slice 43: its walls and a soldier governor turn raiders away by themselves, on the same roll past your triremes' odds, so with
  // neither every fight comes out as it did.)
  const roll = fightRoll(s, c, t);
  const own = ownDefence(c);
  const held = ours > 0 ? 1 - (1 - p) * (1 - own) : own;
  if (!(ours > 0 && roll < p) && roll < held) {
    t.end = 'driven';
    t.line = `${defenceWords(c)} turned ${whose(t.city)} ${t.ships} ships away${ours > 0 ? ' when your triremes could not' : ''}`;
    if (ours > 0) for (const id of c.guards) hurt(s, id, 30);
    news(s.world, s.tick, siteKey(c.site), `${whose(t.city)} raiders came to ${c.name} and went away again: ${defenceWords(c)} held them off`, true);
  } else if (ours > 0 && roll < p) {
    t.end = 'driven';
    t.line = `your ${ours} ${ours === 1 ? 'trireme' : 'triremes'} drove off ${whose(t.city)} ${t.ships} ships`;
    for (const id of c.guards) hurt(s, id, 10);
    remember(c, s.tick, 'driven', `your triremes drove off ${whose(t.city)} raiders`, DRIVEN.amount, DRIVEN.fade);
    news(s.world, s.tick, siteKey(c.site), `Your triremes drove off ${whose(t.city)} ships from ${c.name}: it is safe, and grateful (${signed(DRIVEN.amount)})`, true);
  } else {
    if (ours > 0) for (const id of c.guards) hurt(s, id, 30);
    const fought = ours > 0 ? `; your ${ours} ${ours === 1 ? 'trireme' : 'triremes'} fought and were beaten off` : '';
    const x = siteRecord(s, c.site) as Site;
    if (t.kind === 'claim' && !walled(c)) {
      t.end = 'claimed';
      t.line = `${cityName(t.city)} took it${fought}`;
      const r = cityOf(s.world, t.city);
      const k = siteGood(c.site);
      x.owner = t.city;
      x.since = s.tick;
      if (k >= 0) r.make[k] += COLONY_MAKES;
      r.memories.push({ kind: 'colonytaken', why: `took your colony on ${siteName(c.site)}, and expects you to resent it`, amount: CLAIMED.amount, tick: s.tick, fade: CLAIMED.fade });
      guardsHome(s, map, c);
      s.empire.colonies = s.empire.colonies.filter((y) => y !== c);
      news(s.world, s.tick, siteKey(c.site), `${cityName(t.city)} has taken ${c.name}${fought}: ${siteName(c.site)} is ${whose(t.city)} colony now, and ${rulerShort(r)} expects you to resent it (${signed(CLAIMED.amount)})`, true);
    } else {
      t.end = 'raided';
      // (Slice 43: behind walls a raid takes a third as many, and the season's ship still sails.)
      const lost = Math.round(x.pop * raidTakes(c, RAID_TAKES));
      x.pop = Math.max(1, Math.round((x.pop - lost) * 100) / 100);
      c.skip = !walled(c);
      t.line = `${whose(t.city)} raiders took ${fmt(lost)} of its people${c.skip ? ' and its next shipment' : ', but not its next shipment: its walls kept them from the stores'}${fought}`;
      const m = ours > 0 ? FOUGHT : SACKED;
      remember(c, s.tick, 'sacked', ours > 0 ? `raided by ${cityName(t.city)} though your triremes fought for it` : `sacked by ${cityName(t.city)} while you did nothing`, m.amount, m.fade);
      news(s.world, s.tick, siteKey(c.site), `${whose(t.city)} raiders have sacked ${c.name}${fought}: ${fmt(lost)} of its people taken${c.skip ? ', and its next shipment' : ''}. It remembers (${signed(m.amount)})`, true);
    }
  }
  if (s.empire.colonies.includes(c)) guardsHome(s, map, c);
  s.rev++;
}

/** The dice for a fight off a colony (0 to 1: under the odds, your triremes win). */
export const fightRoll = (s: SimState, c: Colony, t: ColonyThreat): number => dice(s, t.at, SITES.findIndex((q) => q.id === c.site), 5);

function hurt(s: SimState, id: number, n: number): void {
  const t = triremeOf(s, id);
  if (!t || !afloat(t)) return;
  t.hp = Math.max(20, t.hp - n);
  // (Integrating slice 37 with the trunk: as in slice 38's fights, her oars break as her hull is hurt.)
  t.oars = Math.max(0, t.oars - n);
}

function remember(c: Colony, tick: number, kind: string, why: string, amount: number, fade: number): void {
  c.memories.push({ kind, why, amount, tick, fade });
  c.memories = c.memories.filter((m) => memoryWorth(m, tick) !== 0 || m.tick === tick);
}

/** Send triremes at home to guard a colony (all of them, or `n`). */
function sendGuards(s: SimState, map: CoastMap, c: Colony, n?: number): void {
  const ids = guardsAtHome(s).slice(0, n && n > 0 ? n : undefined);
  const went: number[] = [];
  for (const id of ids) if (guardColony(s, map, id, siteLaneId(c.site))) went.push(id);
  c.guards = [...c.guards.filter((id) => !went.includes(id)), ...went];
  if (went.length) news(s.world, s.tick, siteKey(c.site), `${went.length} of your triremes ${went.length === 1 ? 'sails' : 'sail'} to guard ${c.name}: off its shore about ${dayWords(s.tick + laneTicks(c.site) + 4 * TICKS_PER_DAY)}`);
}

/** Bring a colony's guards home. */
function guardsHome(s: SimState, map: CoastMap, c: Colony): void {
  for (const id of c.guards) {
    const t = triremeOf(s, id);
    if (t && t.order === 'lane' && t.lane === siteLaneId(c.site)) callHome(s, map, id);
  }
  c.guards = [];
}

// ---------------------------------------------------------------------------
// Each tick.

/** Colonies' tick: foundings on their way; daily shipments and threats; monthly growth, loyalty, freedom and threats. Nothing with none. */
export function stepColonies(s: SimState, map: CoastMap): void {
  const e = s.empire;
  if (!e.colonies.length && !e.foundings.length) return;
  for (const f of e.foundings.slice()) stepFounding(s, map, f);
  e.foundings = e.foundings.filter((f) => f.phase !== 'done' || !!f.ship);
  for (const f of e.foundings) if (f.phase === 'done' && f.ship && s.tick >= f.ship.since + leaveTicks(f.ship)) f.ship = null;
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const c of e.colonies.slice()) {
    if (s.tick >= c.next && !e.tribute.some((t) => t.colony === c.site && t.phase !== 'done')) sendShipment(s, c);
    stepThreat(s, map, c);
    // (Guards sunk or gone are let go.)
    c.guards = c.guards.filter((id) => !!triremeOf(s, id));
  }
  if (s.tick % TICKS_PER_MONTH === 0 && e.colonies.length) monthly(s, map);
}

// ---------------------------------------------------------------------------
// Your acts (the `colony` command).

/** Why an act can't be done now ('' if it can). */
export function colonyRefusal(s: SimState, map: CoastMap, act: string, site: string, share?: number, name?: string): string {
  if (act === 'found') return foundRefusal(s, map, site);
  const c = colonyOf(s, site);
  if (!c) return `${siteName(site)} is not your colony`;
  if (act === 'share') return Number.isInteger(share) && (share as number) >= 0 && (share as number) <= 2 ? '' : 'Light, fair or heavy';
  if (act === 'name') {
    const why = nameRefusal(String(name ?? ''));
    if (why) return why;
    return String(name).trim() === c.name ? 'That is its name already' : '';
  }
  if (act === 'guard') {
    if (!s.fleet.triremes.some((t) => afloat(t) && t.state !== 'building')) return 'You have no triremes: build a shipyard on the shore and order one';
    return guardsAtHome(s).length ? '' : 'No trireme at home has the rowers and the hull to go (or all are out)';
  }
  if (act === 'recall') return c.guards.length ? '' : 'None of your triremes is guarding it';
  return 'Not an act';
}

/** Do an act (colonyRefusal said yes). */
export function colonyCommand(s: SimState, map: CoastMap, cmd: Extract<Command, { type: 'colony' }>): void {
  const site = String(cmd.site ?? '');
  if (colonyRefusal(s, map, cmd.act, site, cmd.share, cmd.name) !== '') return;
  if (cmd.act === 'found') {
    found(s, map, site);
    return;
  }
  const c = colonyOf(s, site) as Colony;
  if (cmd.act === 'share') {
    if (c.share === cmd.share) return;
    const lighter = (cmd.share as number) < c.share;
    c.share = cmd.share as number;
    const y = colonyYear(s, c);
    news(s.world, s.tick, siteKey(site), `You set ${c.name}’s share ${SHARE_WORDS[c.share]}: about ${fmt(y.amount)} ${goodName(y.good)} a year (${fmt(y.dr)} dr)${lighter ? '. Its loyalty will mend over the next months' : ''}`);
  } else if (cmd.act === 'name') {
    const was = c.name;
    c.name = String(cmd.name).trim().replace(/\s+/g, ' ');
    news(s.world, s.tick, siteKey(site), `${was} on ${siteName(site)} is called ${c.name} from today`);
  } else if (cmd.act === 'guard') sendGuards(s, map, c, cmd.n);
  else if (cmd.act === 'recall') {
    const n = c.guards.length;
    guardsHome(s, map, c);
    news(s.world, s.tick, siteKey(site), `Your ${n === 1 ? 'trireme comes' : `${n} triremes come`} home from guarding ${c.name}`);
  }
  s.rev++;
}

// ---------------------------------------------------------------------------
// For the map, the hovers and the town lines.

/** Where a founding's ship is on the map of Greece (distance along the site's lane; null once landed). */
export function foundingOnMap(f: Founding, tick: number): { along: number; where: 'bay' | 'quay' | 'sea' } | null {
  if (f.phase === 'gathering') {
    const v = f.ship;
    if (!v) return { along: 0, where: 'quay' };
    if (v.phase === SHIP_ANCHORED) return { along: 0, where: 'quay' };
    const u = clamp((tick - v.since) / SAIL_IN, 0, 1);
    return { along: HORIZON_ALONG * (1 - u), where: 'bay' };
  }
  if (f.phase === 'leaving') {
    const v = f.ship;
    const u = v ? clamp((tick - v.since) / Math.max(1, leaveTicks(v)), 0, 1) : 1;
    return { along: HORIZON_ALONG * u, where: 'bay' };
  }
  if (f.phase === 'sea') {
    const L = laneLength(f.site);
    const u = clamp((tick - f.start) / Math.max(1, f.dur), 0, 1);
    return { along: HORIZON_ALONG + (L - HORIZON_ALONG) * u, where: 'sea' };
  }
  return null;
}

/** Where a colony shipment is on the map (vassals.ts' tributeOnMap asks, for one with `colony`): along its lane, coming in. */
export function shipmentAlong(t: Tribute, tick: number): number {
  const L = laneLength(t.colony as string);
  const u = clamp((tick - t.start) / Math.max(1, t.dur), 0, 1);
  return L + (HORIZON_ALONG - L) * u;
}

/** Where a threat's ships are on the map: from their city towards the colony, a share of the way (0 to 1). */
export const threatShare = (t: ColonyThreat, tick: number): number => clamp((tick - t.at) / Math.max(1, t.due - t.at), 0, 1);

/** The household a home's settlers went with, for an empty home's hover: "The house of Nikias left for Nea Thasos" (or ''). */
export function leftFor(s: SimState, home: number): string {
  const b = findBuilding(s, home);
  if (!b || b.people > 0 || b.family) return '';
  for (const f of s.empire.foundings) {
    const h = f.households.find((x) => x.home === home && x.state !== 'stayed' && x.state !== 'packing');
    if (h) return `${h.name.replace(/^t/, 'T')} left it to found a colony on ${siteName(f.site)}${h.state === 'aboard' ? ': they are aboard your ship' : h.state === 'quay' ? ': they wait on the quay' : ': they are walking down to the quay'}`;
  }
  for (const c of s.empire.colonies) {
    const h = c.homes.find((x) => x.home === home);
    if (h) return `${h.name.replace(/^t/, 'T')} left it for ${siteName(c.site)}, to found ${c.name}`;
  }
  return '';
}

/** A colonist household's hover. */
export function colonistDoing(s: SimState, w: Walker): { title: string; detail: string } {
  const f = s.empire.foundings.find((x) => x.id === w.origin);
  const h = f?.households[w.food];
  const where = f ? siteName(f.site) : 'a new colony';
  const title = h ? `${h.name.replace(/^t/, 'T')}, ${h.people} people` : 'Settlers';
  if (!h || h.state === 'walking') return { title, detail: `Walking down to the quay with their bundles, to sail for ${where} and found a colony` };
  const anchored = f?.ship?.phase === SHIP_ANCHORED;
  // (Integrating slice 37 with the trunk: her way in held by a blockade.)
  const held = f && !anchored ? heldWords(s, f) : '';
  if (held) return { title, detail: `Waiting on the quay for your ship to ${where}. ${held}` };
  return { title, detail: anchored ? `On the quay, being rowed out to your ship for ${where}` : `Waiting on the quay for your ship to ${where}${f?.ship ? `: she sails in about ${dayWords(f.ship.since + SAIL_IN)}` : ''}` };
}

/** (Integrating slice 37 with the trunk) Your settlers' ship held by a blockade of your harbour, in words ('' if she isn't). */
export function heldWords(s: SimState, f: Founding): string {
  const b = blockaded(s);
  const v = f.ship;
  if (!b || f.phase !== 'gathering' || !v) return '';
  const fleet = `${whose(b.city)} fleet holds the mouth of your harbour`;
  if (v.phase === SHIP_COMING && !pastMouth(v.path, visitorAt(v, s.tick)?.inward ?? 0)) return `Your ship waits outside the harbour: ${fleet}, and she sails in once the blockade is broken or lifted`;
  if (v.phase === SHIP_ANCHORED && f.households.every((h) => h.state === 'aboard' || h.state === 'stayed')) return `Your ship waits at anchor with the families aboard: ${fleet}, and she sails once the blockade is broken or lifted`;
  return '';
}

/** About when a founding's settlers land: at sea, its day; sailing out of the bay, once she clears it and makes the voyage (winter's storms not known yet). */
export function landsAbout(s: SimState, f: Founding): number {
  if (f.phase === 'sea') return f.start + f.dur;
  const out = f.ship && f.phase === 'leaving' ? Math.max(0, f.ship.since + leaveTicks(f.ship) - s.tick) : 0;
  return s.tick + out + laneTicks(f.site);
}

/** Your settlers' ship's hover in the bay. */
export function settlersShipStatus(s: SimState, f: Founding): { title: string; detail: string } {
  const aboard = f.households.filter((h) => h.state === 'aboard').length;
  const going = f.households.filter((h) => h.state !== 'stayed').length;
  const v = f.ship;
  const held = heldWords(s, f);
  if (held) return { title: `Your ship for ${siteName(f.site)}`, detail: `${held}\nOn the map of Greece she sails the lane to ${siteName(f.site)}` };
  const doing = f.phase !== 'gathering' ? `Sailing out of the bay with ${fmt(f.people)} settlers: they land on ${siteName(f.site)} about ${dayWords(landsAbout(s, f))}` : v?.phase === SHIP_ANCHORED ? `At anchor off the jetty: ${aboard} of ${going} households rowed out to her so far. She sails once all are aboard, or ${dayWords(f.until)} at the latest` : 'Sailing in for your settlers: she anchors off the jetty';
  return { title: `Your ship for ${siteName(f.site)}`, detail: `${doing}\nOn the map of Greece she sails the lane to ${siteName(f.site)}` };
}

/** The line under the top bar, if a colony needs you: talk of freedom, a threat, settlers on the quay. */
// (Review of slice 37: with a rank, as the empire's lines have: 3 talk of freedom, 2 a threat, 1 your settlers on their way.)
export function colonyTownLine(s: SimState): { text: string; site: string; urgent: boolean; rank: number } | null {
  const talk = s.empire.colonies.filter((c) => c.talk).sort((a, b) => a.frees - b.frees)[0];
  if (talk) return { text: `${talk.name} talks of freedom: loyalty ${talk.loyalty} (${lowReasons(colonyLoyalty(s, talk))}). It declares itself free about ${dayWords(talk.frees)} unless its loyalty mends (its page on the map of Greece).`, site: talk.site, urgent: true, rank: 3 };
  const threat = s.empire.colonies.filter((c) => c.threat && c.threat.end === '').sort((a, b) => (a.threat as ColonyThreat).due - (b.threat as ColonyThreat).due)[0];
  if (threat) {
    const t = threat.threat as ColonyThreat;
    // (Integrating slice 37 with the trunk: crippled guards don't count.)
    const n = colonyGuards(s, threat);
    const g = n ? ` Your ${n} ${n === 1 ? 'trireme is' : 'triremes are'} on the way.` : '';
    return { text: `${t.ships} ships of ${cityName(t.city)} are sailing to ${t.kind === 'claim' ? 'claim' : 'raid'} ${threat.name}: they arrive about ${dayWords(t.due)}.${g}`, site: threat.site, urgent: !n, rank: 2 };
  }
  // (Slice 43: a colony asking for something you haven't sent, then your settlers, then a shipment loading at the quay.)
  const works = worksTownLine(s);
  if (works && works.rank >= 2) return works;
  const f = foundingOf(s);
  if (f && f.phase === 'gathering') {
    const aboard = f.households.filter((h) => h.state === 'aboard').length;
    const going = f.households.filter((h) => h.state !== 'stayed').length;
    const anchored = f.ship?.phase === SHIP_ANCHORED;
    const held = heldWords(s, f);
    if (held) return { text: `Your settlers for ${siteName(f.site)}: ${aboard} of ${going} households aboard. ${held}.`, site: f.site, urgent: false, rank: 1 };
    return { text: `Your settlers for ${siteName(f.site)} are coming down to the quay: ${aboard} of ${going} households aboard; ${anchored ? 'your ship rides at anchor off the jetty' : `your ship sails in about ${dayWords((f.ship?.since ?? s.tick) + SAIL_IN)}`}.`, site: f.site, urgent: false, rank: 1 };
  }
  // (Review of slice 37: sailing out of the bay, the day counts the way out too, as the news of her sailing did.)
  if (f && f.phase !== 'done') return { text: `Your settlers are at sea for ${siteName(f.site)}: ${fmt(f.people)} people, landing about ${dayWords(landsAbout(s, f))}.`, site: f.site, urgent: false, rank: 1 };
  return works;
}

/** Every colony and founding in a line each, for the probes and the smoke test. */
export const colonyList = (s: SimState): string[] => [
  ...s.empire.colonies.map((c) => `${c.site}: ${c.name}, ${peopleOf(s, c)} people, ${SHARE_WORDS[c.share]} share, loyalty ${c.loyalty}${c.talk ? ', talks of freedom' : ''}${c.threat && c.threat.end === '' ? `, ${c.threat.kind} from ${c.threat.city}` : ''}`),
  ...s.empire.foundings.filter((f) => f.phase !== 'done').map((f) => `${f.site}: founding, ${f.phase}, ${f.households.map((h) => h.state).join('/')}`),
];

