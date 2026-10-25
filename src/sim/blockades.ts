/**
 * Contested seas (slice 38): wars with you, the fleets they send to blockade
 * your harbour, and the warships wars put on your sea lanes.
 *
 * - **A war with you.** Greece keeps no single flag for it, so it is read
 *   from what the other lines keep, each with its reason: a ruler's band out
 *   against you (raids.ts: gathering, marching or in your land; a lender's
 *   army too); a city your expedition went against, while it is out and for
 *   six months after it came home (unless the city is your vassal or ally
 *   now); the foe in an ally's war you joined, while that war lasts; a vassal
 *   that rose against you, for a year. A demo can stage one, named so.
 * - **Blockades.** On the first of the month a city at war with you, with a
 *   sea lane to you and a fleet of BLOCKADE_FLEET or more, may send ships to
 *   sit across the mouth of your harbour (if you have one to close: a
 *   trading post with a berth). It is told at once, sails its lane on the
 *   map of Greece, shows on your horizon days before it takes station, and
 *   while it holds no ship comes or goes (trade.ts, routes.ts, vassals.ts
 *   ask `blockaded` in lanes.ts). Your triremes break it by sinking half its
 *   ships; it is lifted when its war ends, after HOLD_MOST, or when winter's
 *   storms drive it home.
 * - **Warships.** While a war is on between two rivals, each side with a
 *   fleet puts warships on the other's lane from your city, if you trade
 *   over it; a city at war with you puts them on its own lane. They are
 *   pirates in all but name (fleet.ts keeps them with the pirates, `of` set).
 *
 * Pure and deterministic: the dice are hashes of Greece's seed and the month.
 * Nothing here comes while fire and wear are off (as while a demo's history
 * is built), so the demos open as they did.
 */
import type { CoastMap } from '../map/bake';
import { HORIZON_ALONG, lineLength, PLACES, wayOf, wayPoints, CITY_IDS, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { armyNews } from './army';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news, settleMood } from './diplomacy';
import { blockadeOff, blockadeSailIn, guardsOf, placeOn, triremeName } from './fleet';
import { routeWay, voyageTicks } from './routes';
import { armiesHome, seaPace, seasonAt, TICKS_PER_SEASON, WINTER } from './seasons';
import type { Pirates, SimState } from './state';
import { harbourMouth, tradingPost } from './trade';
import { cityOf } from './world';

/** A fleet sent to blockade your harbour. */
export interface Blockade {
  id: number;
  city: CityId;
  /** The war it came for (see warsWithYou): a raid's id, an expedition's, an ally's call's, the tick a vassal rose; staged by a demo (`of` 0). */
  cause: 'raid' | 'expedition' | 'call' | 'rose' | 'staged';
  of: number;
  /** Its reason, in words: "its raiders are out against you". */
  why: string;
  ships: number;
  /** On the map of Greece; its ships sailing in across your waters; holding the harbour's mouth; over. */
  phase: 'sailing' | 'coming' | 'holding' | 'over';
  /** When it put to sea, when it reaches your gulf (its sails on your horizon), and when it took station (0 not yet). */
  seen: number;
  arrives: number;
  holds: number;
  /** A staged war's end (0: the war is a real one). */
  until: number;
  /** Its ships your triremes have sunk. */
  sunk: number;
  /** When it ended (0 while it is on), and how. */
  ended: number;
  end: '' | 'broken' | 'peace' | 'supplies' | 'winter' | 'harbour';
}

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** A city sends a blockade only with a fleet this big; one month in three while it may; with a quarter of its fleet, 2 to 4 ships. */
export const BLOCKADE_FLEET = 6;
const BLOCKADE_ODDS = 1 / 3;
const SHIPS_LEAST = 2;
const SHIPS_MOST = 4;
/** None from a city for a year after its last; none from anyone for four months after one ends. */
const LULL_CITY = TICKS_PER_YEAR;
const LULL_ANY = 4 * TICKS_PER_MONTH;
/** At least this long between its putting to sea and taking station (it sails slower if its lane is short). */
const WARNING_LEAST = 12 * TICKS_PER_DAY;
/** About how long its ships take from your horizon to the harbour's mouth (for the warning's sum; fleet.ts sets their pace to it: review of slice 38, they took twice the 4 days first set here). */
export const BAY_TICKS = 6 * TICKS_PER_DAY;
/** It holds at most this long before its supplies run short. */
export const HOLD_MOST = 3 * TICKS_PER_MONTH;
/** An expedition counts as a war with its city for this long after it comes home. */
const AFTER_EXPEDITION = 6 * TICKS_PER_MONTH;
/** A vassal that rose counts as at war with you for this long. */
const AFTER_RISING = TICKS_PER_YEAR;
/** The grudge a city keeps when its blockade is broken (fading over a year). */
const BROKEN_GRUDGE = { amount: -10, fade: TICKS_PER_YEAR };

/** Warships: a side with a fleet this big sends them; a sixth of its fleet, 1 to 3. */
export const WARSHIP_FLEET = 4;

const cityName = (id: CityId): string => PLACES[id].name;
const whose = (id: CityId): string => (cityName(id).endsWith('s') ? `${cityName(id)}’` : `${cityName(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const dayWords = (n: number): string => (n === 1 ? 'a day' : `${n} days`);
/** Greece's dice for the blockades, by month and purpose. */
const dice = (s: SimState, n: number, salt: number): number => hash2(n, salt, (s.world.seed ^ 0x626c6f63) | 0);

// ---------------------------------------------------------------------------
// Wars with you.

/** A city at war with you, and why. */
export interface WarWithYou {
  city: CityId;
  cause: Blockade['cause'];
  of: number;
  why: string;
}

/** Is a city your vassal or ally now? */
const friend = (s: SimState, city: CityId): boolean => cityOf(s.world, city)?.lord === 'home' || s.empire.allies.some((a) => a.city === city);

/** The cities at war with you now, each once (its first reason), in a fixed order. */
export function warsWithYou(s: SimState): WarWithYou[] {
  const w = s.world;
  const out: WarWithYou[] = [];
  const add = (x: WarWithYou): void => {
    if (x.city !== 'home' && !out.some((o) => o.city === x.city)) out.push(x);
  };
  for (const r of w.raids) {
    if (r.ended === 0 && (r.phase === 'gathering' || r.phase === 'marching' || r.phase === 'raiding')) add({ city: r.city, cause: 'raid', of: r.id, why: r.loan ? 'its army comes to collect what you owe it' : 'its raiders are out against you' });
  }
  for (const e of w.expeditions) {
    if (friend(s, e.city)) continue;
    const out = e.phase === 'marching' || e.phase === 'fighting' || e.phase === 'homeward' || e.phase === 'back';
    const lately = e.phase === 'done' && e.ended > 0 && s.tick - e.ended < AFTER_EXPEDITION;
    if (out || lately) add({ city: e.city, cause: 'expedition', of: e.id, why: e.aim === 'conquer' ? 'your army marched to conquer it' : 'your army went against it' });
  }
  for (const c of s.empire.calls) {
    if (c.state !== 'joined' || friend(s, c.foe)) continue;
    const war = w.wars.find((x) => x.id === c.war);
    if (war && war.ended === 0) add({ city: c.foe, cause: 'call', of: c.id, why: `you joined ${whose(c.ally)} war against it` });
  }
  for (const c of w.cities) {
    if (c.id === 'home' || c.lord === 'home') continue;
    const m = c.memories.find((x) => x.kind === 'rose' && s.tick - x.tick < AFTER_RISING);
    if (m) add({ city: c.id, cause: 'rose', of: m.tick, why: 'it rose against your rule' });
  }
  for (const b of s.fleet.blockades) if (b.cause === 'staged' && b.phase !== 'over' && s.tick < b.until) add({ city: b.city, cause: 'staged', of: 0, why: b.why });
  return out;
}

/** Does a blockade's war still hold? */
function warHolds(s: SimState, b: Blockade, wars: readonly WarWithYou[]): boolean {
  if (b.cause === 'staged') return s.tick < b.until;
  return wars.some((x) => x.city === b.city && x.cause === b.cause && x.of === b.of);
}

// ---------------------------------------------------------------------------
// Looking things up.

/** The blockade coming or holding now, if any (one at a time). */
export const blockadeOn = (s: SimState): Blockade | undefined => s.fleet.blockades.find((b) => b.phase !== 'over');
export const blockadeOf = (s: SimState, id: number): Blockade | undefined => s.fleet.blockades.find((b) => b.id === id);
/** Ships it has left afloat. */
export const blockadeLeft = (s: SimState, b: Blockade): number => s.fleet.ships.filter((e) => e.blockade === b.id && e.state !== 'sinking').length;
/** How many of its ships must be sunk to break it: half, rounded up. */
export const toBreak = (b: Blockade): number => Math.ceil(b.ships / 2);

/** Where a blockading fleet is on the map of Greece at a tick: along its lane from your city (null once home, or none left). */
export function blockadeOnMap(s: SimState, b: Blockade, tick: number): { along: number; homeward: boolean; way: string; ships: number } | null {
  const way = routeWay(b.city, 'sea')?.way;
  if (!way) return null;
  const L = lineLength(wayPoints(wayOf(way)));
  const H = HORIZON_ALONG;
  const voyage = Math.max(1, b.arrives - b.seen);
  if (b.phase === 'sailing') {
    const u = clamp((tick - b.seen) / voyage, 0, 1);
    return { along: L + (H - L) * u, homeward: false, way, ships: b.ships };
  }
  if (b.phase === 'coming' || b.phase === 'holding') return { along: H * 0.6, homeward: false, way, ships: blockadeLeft(s, b) };
  const left = b.ships - b.sunk;
  if (left <= 0 || b.ended === 0) return null;
  // (Review of slice 38: turned for home before it reached your gulf, it sails home from where it was, not from the gulf.)
  const early = b.ended < b.arrives;
  const from = early ? L + (H - L) * clamp((b.ended - b.seen) / voyage, 0, 1) : H;
  const u = (tick - b.ended) / (early ? Math.max(1, b.ended - b.seen) : voyage);
  if (u < 0 || u >= 1) return null;
  return { along: from + (L - from) * u, homeward: true, way, ships: left };
}

// ---------------------------------------------------------------------------
// Each tick (from fleet.ts).

export function stepBlockades(s: SimState, map: CoastMap): void {
  const f = s.fleet;
  const on = f.blockades.some((b) => b.phase !== 'over');
  const day = s.tick % TICKS_PER_DAY === 0;
  const month = s.tick % TICKS_PER_MONTH === 0;
  if (!on && !(month && s.hazards && s.world.contact)) {
    if (day && f.blockades.length && f.blockades.some((b) => s.tick - b.ended > TICKS_PER_YEAR)) f.blockades = f.blockades.filter((b) => s.tick - b.ended <= TICKS_PER_YEAR);
    return;
  }
  for (const b of f.blockades) {
    if (b.phase === 'over') continue;
    // Half its ships sunk: the rest flee.
    if ((b.phase === 'coming' || b.phase === 'holding') && b.sunk >= toBreak(b)) {
      end(s, map, b, 'broken');
      continue;
    }
    if (b.phase === 'sailing' && s.tick >= b.arrives) {
      const post = tradingPost(s);
      const mouth = post ? harbourMouth(map, post) : null;
      if (!mouth) {
        end(s, map, b, 'harbour');
        continue;
      }
      // (Review of slice 38: the days as they will sail them, winter's storms and all.)
      const ticks = blockadeSailIn(s, map, b, mouth, false) / seaPace(s);
      b.phase = 'coming';
      const days = Math.max(1, Math.round(ticks / TICKS_PER_DAY));
      const line = `Sails! ${whose(b.city)} blockading fleet is in sight off your shore, ${b.ships} ships: they take station across the mouth of your harbour in about ${dayWords(days)}`;
      news(s.world, s.tick, b.city, line, true);
      armyNews(s, line, 0);
      s.rev++;
    }
    if (b.phase === 'coming') {
      const mine = s.fleet.ships.filter((e) => e.blockade === b.id && e.state !== 'sinking');
      if (mine.length && mine.every((e) => e.state === 'holding')) hold(s, b);
    }
  }
  if (day) {
    const wars = warsWithYou(s);
    for (const b of f.blockades) {
      if (b.phase === 'over') continue;
      if (!warHolds(s, b, wars)) end(s, map, b, 'peace');
      else if (b.phase === 'holding' && s.tick - b.holds >= HOLD_MOST) end(s, map, b, 'supplies');
      else if ((b.phase === 'coming' || b.phase === 'holding') && !tradingPost(s)) end(s, map, b, 'harbour');
      // The turn of winter: its storms drive most fleets home.
      else if (s.tick % TICKS_PER_SEASON === 0 && seasonAt(s.tick) === WINTER && armiesHome(s, s.tick, b.id * 7 + 3)) end(s, map, b, 'winter');
    }
  }
  if (month && s.hazards && s.world.contact) newBlockade(s, map);
}

/** Its ships are all on station: the harbour is closed. */
function hold(s: SimState, b: Blockade): void {
  b.phase = 'holding';
  b.holds = s.tick;
  const line = `${whose(b.city)} ships hold the mouth of your harbour: no ship comes or goes until the blockade is broken or lifted. Sink ${toBreak(b)} of its ${b.ships} ships and the rest will flee`;
  news(s.world, s.tick, b.city, line, true, 'blockade');
  armyNews(s, line, 0);
  s.rev++;
}

/** It ends: what is left of it sails home (or flees), and the News says why. */
function end(s: SimState, map: CoastMap, b: Blockade, why: Blockade['end']): void {
  const was = b.phase;
  b.phase = 'over';
  b.ended = s.tick;
  b.end = why;
  blockadeOff(s, map, b);
  const c = cityOf(s.world, b.city);
  const left = b.ships - b.sunk;
  const open = was === 'holding' ? ' Your harbour is open again: the ships waiting come and go' : '';
  let line = '';
  if (why === 'broken') {
    c.memories.push({ kind: 'blockade', why: 'its fleet was broken off your harbour', amount: BROKEN_GRUDGE.amount, tick: s.tick, fade: BROKEN_GRUDGE.fade });
    settleMood(s, c);
    line = `Your triremes have broken ${whose(b.city)} blockade: ${b.sunk} of its ${b.ships} ships sunk, and the ${left === 1 ? 'last has' : `other ${left} have`} fled.${open}. ${cityName(b.city)} will remember it (${BROKEN_GRUDGE.amount})`;
  } else if (why === 'peace') line = `${whose(b.city)} fleet has ${was === 'sailing' ? 'turned for home: it will not blockade your harbour' : 'lifted its blockade and sailed home'}, its war with you over.${open}`;
  else if (why === 'supplies') line = `${whose(b.city)} fleet has lifted its blockade, short of water and food after ${Math.round(HOLD_MOST / TICKS_PER_MONTH)} months off your harbour.${open}`;
  else if (why === 'winter') line = `Winter’s storms have driven ${whose(b.city)} fleet home${was === 'sailing' ? ' before it reached you' : ''}.${open}`;
  else line = `${whose(b.city)} fleet has turned for home: you have no harbour for it to close`;
  line = line.replace('..', '.').replace(/\.$/, '');
  news(s.world, s.tick, b.city, line, true);
  if (was !== 'sailing') armyNews(s, line, 0);
  s.rev++;
}

/** On the first of the month: now and then a city at war with you sends its fleet against your harbour. */
function newBlockade(s: SimState, map: CoastMap): void {
  const f = s.fleet;
  if (f.blockades.some((b) => b.phase !== 'over')) return;
  if (f.blockades.some((b) => s.tick - b.ended < LULL_ANY)) return;
  const post = tradingPost(s);
  if (!post || !harbourMouth(map, post)) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  for (const war of warsWithYou(s)) {
    const c = cityOf(s.world, war.city);
    if (!c || c.fleet < BLOCKADE_FLEET || !routeWay(war.city, 'sea')) continue;
    if (f.blockades.some((b) => b.city === war.city && s.tick - b.seen < LULL_CITY)) continue;
    const k = CITY_IDS.indexOf(war.city);
    if (dice(s, month, 10 + k) >= BLOCKADE_ODDS) continue;
    // (Winter keeps most fleets home: one that would reach you in winter waits, two times in three.)
    if (armiesHome(s, s.tick + voyageOf(war.city), month * 16 + k)) continue;
    sendBlockade(s, war, clamp(Math.round(c.fleet / 4), SHIPS_LEAST, SHIPS_MOST));
    return;
  }
}

/** How long a blockading fleet takes from its city to your gulf: at a ship's pace, and never less than the warning's least less the bay. */
const voyageOf = (city: CityId): number => Math.max(voyageTicks(city), WARNING_LEAST - BAY_TICKS);

/** A city's fleet puts to sea against your harbour (a demo stages one with `until`: its war's end). */
export function sendBlockade(s: SimState, war: WarWithYou, ships: number, until = 0): Blockade {
  const voyage = voyageOf(war.city);
  const b: Blockade = { id: s.fleet.nextId++, city: war.city, cause: war.cause, of: war.of, why: war.why, ships: clamp(ships, 1, SHIPS_MOST), phase: 'sailing', seen: s.tick, arrives: s.tick + voyage, holds: 0, until, sunk: 0, ended: 0, end: '' };
  s.fleet.blockades.push(b);
  const days = Math.round((voyage + BAY_TICKS) / TICKS_PER_DAY);
  // (Integrating slice 37 with the trunk: and your colonies' ships, and your settlers' ship, if you have any.)
  const g = s.fleet.triremes.filter((t) => t.state !== 'building' && t.state !== 'sinking').length;
  const break_ = g ? `Your ${g === 1 ? 'trireme' : `${g} triremes`} can break it: sink ${toBreak(b)} of its ships and the rest flee` : 'Triremes could break it: sink half its ships and the rest flee';
  news(s.world, s.tick, war.city, `${whose(war.city)} fleet has put to sea to blockade your harbour (${war.why}): ${b.ships} ships, off your harbour in about ${days} days. While they hold its mouth no ship comes or goes: the Tyrian ship, your sea routes’ traders, tribute and gifts by sea${s.empire.colonies.length ? ', your colonies’ ships' : ''}${s.empire.foundings.some((f) => f.phase === 'gathering') ? ', your settlers’ ship' : ''} all wait. ${break_}`, true);
  s.rev++;
  return b;
}

/** A demo's blockade already on station (its ships placed across the mouth), for a staged war that lasts `until`. */
export function stageBlockade(s: SimState, map: CoastMap, city: CityId, ships: number, why: string, until: number): Blockade | null {
  const post = tradingPost(s);
  const mouth = post ? harbourMouth(map, post) : null;
  if (!mouth) return null;
  const voyage = voyageOf(city);
  const b: Blockade = { id: s.fleet.nextId++, city, cause: 'staged', of: 0, why, ships: clamp(ships, 1, SHIPS_MOST), phase: 'holding', seen: s.tick - voyage - BAY_TICKS, arrives: s.tick - BAY_TICKS, holds: s.tick, until, sunk: 0, ended: 0, end: '' };
  s.fleet.blockades.push(b);
  blockadeSailIn(s, map, b, mouth, true);
  s.rev++;
  return b;
}

/** A blockade in words, for the shipyard's panel, the Army tab and the ship's chip ('' with none). */
export function blockadeWords(s: SimState): string {
  const b = blockadeOn(s);
  if (!b) {
    const last = s.fleet.blockades.filter((x) => x.phase === 'over').at(-1);
    if (last && s.tick - last.ended < TICKS_PER_MONTH) return last.end === 'broken' ? `Your triremes broke ${whose(last.city)} blockade: ${last.sunk} of its ${last.ships} ships sunk` : `${whose(last.city)} blockade is over`;
    return '';
  }
  const left = blockadeLeft(s, b);
  const need = Math.max(0, toBreak(b) - b.sunk);
  if (b.phase === 'sailing') return `${whose(b.city)} fleet is on its way to blockade your harbour (${b.why}): ${b.ships} ships, off your harbour in about ${dayWords(Math.max(1, Math.round((b.arrives + BAY_TICKS - s.tick) / TICKS_PER_DAY)))}`;
  if (b.phase === 'coming') return `${whose(b.city)} blockading fleet is sailing in to take station across your harbour’s mouth: ${left} ships`;
  const days = Math.max(1, Math.ceil((b.holds + HOLD_MOST - s.tick) / TICKS_PER_DAY));
  // (Review of slice 38: how the fight goes, their hulls as your triremes wear them down.)
  const hulls = s.fleet.ships.filter((e) => e.blockade === b.id && e.state !== 'sinking').map((e) => `${Math.max(1, Math.round(e.hp))}%`);
  const hp = hulls.some((h) => h !== '100%') ? ` (${hulls.length === 1 ? 'her hull' : 'their hulls'} at ${hulls.length === 1 ? hulls[0] : `${hulls.slice(0, -1).join(', ')} and ${hulls.at(-1)}`})` : '';
  return `${whose(b.city)} fleet holds your harbour’s mouth (${b.why}): ${left} ships${hp}, ${b.sunk} sunk. No ship comes or goes. Sink ${need} more and the rest flee; at most ${dayWords(days)} more before its supplies run short`;
}

// ---------------------------------------------------------------------------
// Warships on the lanes (fleet.ts keeps them with the pirates).

/** The warships a war would put on your lanes now: whose, on which lane, for which war (-1: a war with you). */
function warshipsWanted(s: SimState): Array<{ of: CityId; way: string; to: CityId; war: number }> {
  const w = s.world;
  const out: Array<{ of: CityId; way: string; to: CityId; war: number }> = [];
  const trades = (city: CityId): boolean => w.routes.some((r) => r.kind === 'sea' && r.city === city);
  for (const war of w.wars) {
    if (war.ended !== 0) continue;
    for (const [x, y] of [[war.a, war.b], [war.b, war.a]] as Array<[CityId, CityId]>) {
      const way = routeWay(y, 'sea')?.way;
      if (!way || !trades(y) || (cityOf(w, x)?.fleet ?? 0) < WARSHIP_FLEET) continue;
      out.push({ of: x, way, to: y, war: war.id });
    }
  }
  for (const war of warsWithYou(s)) {
    const way = routeWay(war.city, 'sea')?.way;
    if (!way || !trades(war.city) || (cityOf(w, war.city)?.fleet ?? 0) < WARSHIP_FLEET) continue;
    out.push({ of: war.city, way, to: war.city, war: -1 });
  }
  return out;
}

/** Once a day (fleet.ts): warships whose war is over sail off; new wars put theirs on your lanes (while a town is played). */
export function stepWarships(s: SimState): void {
  const f = s.fleet;
  const wanted = warshipsWanted(s);
  for (const p of f.pirates) {
    if (!p.of || (p.state !== 'seen' && p.state !== 'preying')) continue;
    if (wanted.some((x) => x.of === p.of && x.way === p.way && x.war === p.war)) continue;
    p.state = 'gone';
    p.until = s.tick;
    news(s.world, s.tick, p.city, `${whose(p.of)} warships ${p.place} have sailed home, the war over${p.took.length ? `: they took ${p.took.length === 1 ? 'one cargo' : `${p.took.length} cargoes`} of yours` : ''}`);
    s.rev++;
  }
  if (!s.hazards) return;
  for (const x of wanted) {
    // (One band on a lane at a time; not again for the same war once they have gone or been beaten.)
    if (f.pirates.some((p) => p.way === x.way && (p.state === 'seen' || p.state === 'preying'))) continue;
    if (f.pirates.some((p) => p.of === x.of && p.way === x.way && p.war === x.war)) continue;
    warships(s, x.of, x.way, x.war);
  }
}

/** A city's warships take station on a lane (or a demo's). */
export function warships(s: SimState, of: CityId, way: string, war: number): Pirates | null {
  const place = placeOn(way);
  if (!place) return null;
  const ships = clamp(Math.round((cityOf(s.world, of)?.fleet ?? 6) / 6), 1, 3);
  const p: Pirates = { id: s.fleet.nextId++, way, city: place.city, place: place.name, ships, seen: s.tick, from: s.tick + WARSHIP_WARNING, until: s.tick + 10 * TICKS_PER_YEAR, state: 'seen', took: [], fought: 0, of, war };
  s.fleet.pirates.push(p);
  const g = guardsOf(s, way);
  const x = war < 0 ? undefined : s.world.wars.find((o) => o.id === war);
  const whyWar = x ? `at war with ${cityName(x.a === of ? x.b : x.a)}` : 'at war with you';
  news(s.world, s.tick, place.city, `${whose(of)} warships have taken station ${place.name}, on the lane to ${cityName(place.city)}: ${ships} ${ships === 1 ? 'ship' : 'ships'}, ${whyWar}. From about ${Math.round(WARSHIP_WARNING / TICKS_PER_DAY)} days on they will seize what of yours passes there${g.length ? `: the ${triremeName(g[0])} guards the lane` : ': a trireme sent to guard the lane keeps it safe'}`, true);
  s.rev++;
  return p;
}

/** Warships are seen this long before they seize. */
export const WARSHIP_WARNING = 10 * TICKS_PER_DAY;
