/**
 * Expeditions (slice 28): your companies sent after a city, a raiding party
 * (one or two companies, quick, for part of what is owed) or a full force
 * (most of your army, for the whole debt and a penalty), over a debt or
 * without cause.
 *
 * - **Mustering.** Each company's banner marches to the edge of your map on
 *   that city's side (Corinth and Athens north, Sparta west), and its men who
 *   reach it leave your map (`away`): they are not drawn, fight nobody, and are
 *   paid as ever. The men not ready (walking in, waiting for armour, healing)
 *   stay at the barracks. Once every company is at the edge (or after two
 *   months, with those that are), the expedition sets off.
 * - **On the map of Greece.** A little army in your colours along the road,
 *   its place a pure function of the tick as any traveller's, three days at
 *   their city, and home the same way. By sea (Troy) it needs triremes
 *   (fleet.ts: fleetFor), one to a company: the companies march to the
 *   shipyard instead of an edge, the triremes go out with them and come home
 *   with them, and on the map they are ships along the lane.
 * - **The fight.** Your strength (a hoplite 1.2, an archer 0.8) against their
 *   garrison (loans.ts: garrisonOf; Troy's walls half again against a full
 *   force; a raiding party meets only the countryside's watch, a quarter).
 *   The odds are ratio² / (1 + ratio²), between 5 and 95 in 100; the world's
 *   dice decide, and how many fall on each side.
 * - **What it brings, and what Greece thinks.** Won: coin and their most
 *   plentiful good, carried home and put in the treasury and the stores; what
 *   it is worth comes off the debt at once (paid off, the loan is collected).
 *   The target remembers it a long time, every other ruler a little (much more
 *   without cause). The killed are mourned at home when the news comes; the
 *   wounded come home with the rest and walk to the barracks to heal.
 * - **The report**: who went, the fight, what was recovered and what is left
 *   owed, the killed and wounded by company, how the ruler and Greece took it.
 *
 * Pure: the dice are hashes of Greece's seed with salts of their own, so
 * Greece's generator and every older roll land as before. Nothing here runs
 * with no expedition.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { EDGE_ALONG, PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { armyNews, companyName, companyOf, kindWord, LIE, readyOf, sendBanner, wayFrom } from './army';
import { mournMan } from './battle';
import { centreOf, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news, settleMood, wayFor } from './diplomacy';
import { dayWords } from './favours';
import { fleetFor, fleetHome, sailFor, triremeOf } from './fleet';
import { held, setHeld, WARE_NAMES } from './foods';
import { end as endLoan, garrisonOf, loanMemory, loanOf, whose, type LoanAnswer } from './loans';
import { marchTicks, RAID_SIDE } from './raids';
import { routeWay } from './routes';
import type { Company, Expedition, Loan, SimState, Soldier, WorldCity } from './state';
import { note } from './stockbook';
import { roomFor } from './stores';
import { storeKind, TRADE_GOODS } from './trade';
import { income } from './treasury';
import { offMapPoint } from './walk';
import { walkable } from './wild';
import { cityOf, rulerShort } from './world';

// ---------------------------------------------------------------------------
// The numbers.

/** What each man is worth in a fight abroad. */
export const MIGHT = { hoplite: 1.2, archer: 0.8 } as const;
/** A raiding party meets only the countryside's watch: this share of the garrison. */
export const WATCH = 0.25;
/** Troy's walls, against a full force. */
export const WALLED: Partial<Record<CityId, number>> = { troy: 1.5 };
/** How long the fight at their city lasts, and the longest the companies have to reach the edge. */
export const FIGHT_TICKS = 3 * TICKS_PER_DAY;
export const MUSTER_MOST = 2 * TICKS_PER_MONTH;
/** A raiding party's companies at most. */
export const RAID_COMPANIES = 2;
/** What each man brings home, won: a raid's coin and goods; a force's against a city that owes nothing. */
const RAID_COIN = 30;
const RAID_GOODS = 50;
const FORCE_COIN = 40;
const FORCE_GOODS = 100;
/** A raiding party over a debt takes at most this share of it; a full force the whole, and this share more in goods (the penalty). */
const RAID_SHARE = 0.6;
const PENALTY = 0.2;
/** Losses, as shares of the men who went: won (killed, wounded) and lost, each from the first figure to the first plus the second. */
const LOSS_WON = { killed: [0.04, 0.06], wounded: [0.06, 0.08] } as const;
const LOSS_LOST = { killed: [0.18, 0.12], wounded: [0.12, 0.1] } as const;
/** How long a finished expedition's report is kept. */
const KEEP = TICKS_PER_YEAR;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityName = (id: CityId): string => PLACES[id].name;
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Greece's dice for expeditions (a hash: Greece's own generator is never touched). */
const dice = (s: SimState, a: number, i: number, salt: number): number => hash2(a, i * 41 + salt, (s.world.seed ^ 0x65787064) | 0);

// ---------------------------------------------------------------------------
// Looking expeditions up.

export const expeditionOf = (s: SimState, id: number): Expedition | undefined => s.world.expeditions.find((e) => e.id === id);
/** The expedition out now (one at a time), if any. */
export const expeditionOut = (s: SimState): Expedition | undefined => s.world.expeditions.find((e) => e.phase !== 'done');
/** The latest expedition after a city (out, or its report), if any. */
export const lastExpedition = (s: SimState, city: CityId): Expedition | undefined => s.world.expeditions.filter((e) => e.city === city).at(-1);

/** How an expedition would go to a city: by road, or by sea with ships; or why it can't. */
export function expeditionWay(s: SimState, city: CityId): { by: 'land' | 'sea'; way: string } | { why: string } {
  const land = routeWay(city, 'land');
  if (land) return { by: 'land', way: land.way };
  const sea = routeWay(city, 'sea');
  if (!sea) return { why: `No way leads to ${cityName(city)}` };
  // (By sea: the triremes at home, crewed and sound, a company to each: fleet.ts.)
  const f = fleetFor(s, city);
  if (f.ids.length) return { by: 'sea', way: sea.way };
  if (s.fleet.triremes.length === 0) return { why: `${cityName(city)} can only be reached by sea: you need triremes (build a shipyard on the shore and order one)` };
  return { why: `${cityName(city)} can only be reached by sea, and your triremes can’t go: ${f.why.charAt(0).toLowerCase()}${f.why.slice(1)}` };
  return { why: `No way leads to ${cityName(city)}` };
}

/** The debt a city owes you that an expedition would go after (overdue), if any. */
export const debtFrom = (s: SimState, city: CityId): Loan | undefined => s.world.loans.find((l) => l.city === city && l.side === 'out' && l.state === 'overdue');

/** The companies an expedition would take: a raiding party the one or two with the most men ready (one with two or fewer), a full force every company with men ready (but the weakest stays home when there are three or more). */
export function chosen(s: SimState, kind: Expedition['kind'], city?: CityId): Company[] {
  const picked = chosenAll(s, kind);
  // (By sea, a trireme carries one company: no more go than there are triremes to carry them.)
  if (city && !routeWay(city, 'land') && routeWay(city, 'sea')) return picked.slice(0, fleetFor(s, city).ids.length);
  return picked;
}

function chosenAll(s: SimState, kind: Expedition['kind']): Company[] {
  const all = s.army.companies
    .filter((c) => !c.away && !c.routed && c.order !== 'away' && readyOf(s, c).length > 0)
    .sort((a, b) => readyOf(s, b).length - readyOf(s, a).length || Number(b.kind === 'hoplite') - Number(a.kind === 'hoplite') || a.id - b.id);
  if (kind === 'raid') return all.slice(0, all.length > 2 ? RAID_COMPANIES : 1);
  return all.length >= 3 ? all.slice(0, -1) : all;
}

/** A company's men ready in its ranks, as strength abroad. */
const mightOf = (s: SimState, c: Company): number => readyOf(s, c).length * MIGHT[c.kind];

/** What a city's defenders count for against an expedition of this kind. */
export function defenders(s: SimState, c: WorldCity, kind: Expedition['kind']): number {
  const g = garrisonOf(s, c);
  return Math.max(1, Math.round(kind === 'raid' ? g * WATCH : g * (WALLED[c.id] ?? 1)));
}

/** The odds of an expedition (0.05 to 0.95) from the two sides' strength. */
export const oddsOf = (ours: number, theirs: number): number => {
  const r = ours / Math.max(1, theirs);
  return clamp(Math.round(((r * r) / (1 + r * r)) * 100) / 100, 0.05, 0.95);
};

/** An expedition as it would go now: its companies, men, strength against theirs, the odds, and what it would bring if it won. */
export function expeditionPlan(s: SimState, city: CityId, kind: Expedition['kind']): { companies: Company[]; men: number; ours: number; theirs: number; odds: number; brings: string; why: string } {
  const c = cityOf(s.world, city);
  const companies = chosen(s, kind, city);
  const men = companies.reduce((a, x) => a + readyOf(s, x).length, 0);
  const ours = Math.round(companies.reduce((a, x) => a + mightOf(s, x), 0));
  const theirs = defenders(s, c, kind);
  const debt = debtFrom(s, city);
  const owed = debt?.owed ?? 0;
  const brings =
    kind === 'raid'
      ? debt
        ? `about ${fmt(Math.min(owed * RAID_SHARE, men * (RAID_COIN + RAID_GOODS)))} dr of the ${fmt(owed)} owed, in coin and goods`
        : `about ${fmt(men * RAID_COIN)} dr and ${fmt(men * RAID_GOODS)} of their goods`
      : debt
        ? `the whole ${fmt(owed)} dr, and a fifth more in goods`
        : `about ${fmt(men * FORCE_COIN)} dr and ${fmt(men * FORCE_GOODS)} of their goods`;
  return { companies, men, ours, theirs, odds: oddsOf(ours, theirs), brings, why: '' };
}

/** Why an expedition can't go now, or '' if it can. */
export function expeditionRefusal(s: SimState, city: CityId | string, kind: string): string {
  if (!RULED.includes(city as CityId)) return 'There is no ruler there';
  if (kind !== 'raid' && kind !== 'force') return 'Not an expedition';
  const way = expeditionWay(s, city as CityId);
  if ('why' in way) return way.why;
  const out = expeditionOut(s);
  if (out) return `Your soldiers are out already, after ${cityName(out.city)}: one expedition at a time`;
  if (s.world.raids.some((r) => r.phase === 'raiding')) return 'Not while raiders are on your land';
  if (!chosen(s, kind, city as CityId).length) return s.army.companies.length ? 'No company has men ready in its ranks' : 'You have no soldiers: raise a company at a barracks';
  const l = debtFrom(s, city as CityId);
  if (l?.demand) return 'Your demand stands: wait for its day';
  return '';
}

// ---------------------------------------------------------------------------
// Sending one (the `expedition` command).

/** The edge tile the companies leave by: on the city's side, the open one nearest the first company that it can reach. */
function edgeFor(s: SimState, map: CoastMap, city: CityId, c: Company): number {
  const n = map.size;
  const side = routeWay(city, 'land')?.side ?? RAID_SIDE[city];
  const tiles: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = side === 'north' ? i : side === 'south' ? (n - 1) * n + i : side === 'west' ? i * n : i * n + n - 1;
    if (walkable(map, s, t)) tiles.push(t);
  }
  tiles.sort((a, b) => dhypot((a % n) + 0.5 - c.x, Math.floor(a / n) + 0.5 - c.z) - dhypot((b % n) + 0.5 - c.x, Math.floor(b / n) + 0.5 - c.z) || a - b);
  for (const t of tiles.slice(0, 10)) if (wayFrom(s, map, c.x, c.z, t)) return t;
  return -1;
}

/** By sea: the open tile beside the shipyard of the first trireme that can go, nearest the yard, that the first company can reach. */
function yardTile(s: SimState, map: CoastMap, city: CityId, c: Company): number {
  const n = map.size;
  const t = triremeOf(s, fleetFor(s, city).ids[0] ?? 0);
  const yard = t ? findBuilding(s, t.yard) : undefined;
  if (!yard) return -1;
  const [cx, cz] = centreOf(yard);
  const tiles: number[] = [];
  for (let dz = -4; dz <= 4; dz++)
    for (let dx = -4; dx <= 4; dx++) {
      const x = Math.floor(cx) + dx;
      const z = Math.floor(cz) + dz;
      if (x < 0 || z < 0 || x >= n || z >= n) continue;
      if (walkable(map, s, z * n + x)) tiles.push(z * n + x);
    }
  tiles.sort((a, b) => dhypot((a % n) + 0.5 - cx, Math.floor(a / n) + 0.5 - cz) - dhypot((b % n) + 0.5 - cx, Math.floor(b / n) + 0.5 - cz) || a - b);
  for (const k of tiles.slice(0, 12)) if (wayFrom(s, map, c.x, c.z, k)) return k;
  return -1;
}

/** Where the men of an expedition leave your map and come back onto it: off the edge by land; at the shipyard's tile by sea (aboard). */
function leavePoint(n: number, e: Expedition): [number, number] {
  return e.by === 'sea' ? [(e.edge % n) + 0.5, Math.floor(e.edge / n) + 0.5] : offMapPoint(n, e.edge);
}

/** Send an expedition (a command; nothing if expeditionRefusal says no). */
export function sendExpedition(s: SimState, map: CoastMap, city: CityId | string, kind: string): Expedition | null {
  if (expeditionRefusal(s, city, kind) !== '') return null;
  const id = city as CityId;
  const k = kind as Expedition['kind'];
  const w = s.world;
  const way = expeditionWay(s, id) as { by: 'land' | 'sea'; way: string };
  const comps = chosen(s, k, id);
  const edge = way.by === 'sea' ? yardTile(s, map, id, comps[0]) : edgeFor(s, map, id, comps[0]);
  if (edge < 0) return null;
  const debt = debtFrom(s, id);
  const e: Expedition = {
    id: w.nextExpedition++,
    city: id,
    kind: k,
    loan: debt?.id ?? 0,
    companies: [],
    men: [],
    phase: 'mustering',
    by: way.by,
    way: way.way,
    edge,
    ships: [],
    start: 0,
    dur: 0,
    a0: 0,
    a1: 0,
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
  };
  for (const c of comps) {
    if (!sendBanner(s, map, c.id, edge)) continue;
    c.away = e.id;
    e.companies.push(c.id);
  }
  if (!e.companies.length) {
    w.nextExpedition--;
    return null;
  }
  w.expeditions.push(e);
  if (debt) debt.sent = e.id;
  const men = e.companies.reduce((a, cid) => a + readyOf(s, companyOf(s, cid) as Company).length, 0);
  const what = k === 'raid' ? 'a raiding party' : 'a full force';
  const why = debt ? `to collect the ${fmt(debt.owed)} dr ${cityName(id)} owes you` : 'against a city that owes you nothing';
  if (way.by === 'sea') {
    armyNews(s, `${cap(what)} of ${men} men marches out for ${cityName(id)}, ${why}: the companies make for the shipyard, to sail in your triremes`, 0);
    news(w, s.tick, id, `You sent ${what} of ${men} men against ${cityName(id)}, ${why}. They sail from your shipyard in your triremes`);
  } else {
    armyNews(s, `${cap(what)} of ${men} men marches out for ${cityName(id)}, ${why}: the companies make for the ${routeWay(id, 'land')?.side ?? RAID_SIDE[id]} edge of your land`, 0);
    news(w, s.tick, id, `You sent ${what} of ${men} men against ${cityName(id)}, ${why}. They march out by the ${routeWay(id, 'land')?.side ?? RAID_SIDE[id]} edge of your land`);
  }
  s.rev++;
  return e;
}

// ---------------------------------------------------------------------------
// Each tick.

/** Expeditions, once a tick: the companies reaching the edge and leaving, the march on the map, the fight, the march home, the companies back at their barracks. Nothing with none out. */
export function stepExpeditions(s: SimState, map: CoastMap): void {
  const w = s.world;
  if (w.expeditions.length === 0) return;
  for (const e of w.expeditions) {
    if (e.phase === 'mustering') muster(s, map, e);
    else if (e.phase === 'marching' && s.tick >= e.start + e.dur) fight(s, e);
    else if (e.phase === 'fighting' && s.tick >= e.start + e.dur) {
      const { L } = wayFor(e.city, e.by);
      e.phase = 'homeward';
      e.start = s.tick;
      e.dur = marchTicks(e.city, e.by);
      e.a0 = L;
      e.a1 = EDGE_ALONG;
      s.rev++;
    } else if (e.phase === 'homeward' && s.tick >= e.start + e.dur) comeHome(s, map, e);
    else if (e.phase === 'back') {
      // Home once every company is back at its barracks (or gone).
      if (e.companies.every((id) => (companyOf(s, id)?.order ?? 'drill') === 'drill')) {
        e.phase = 'done';
        e.ended = s.tick;
        s.rev++;
      }
    }
  }
  if (s.tick % TICKS_PER_MONTH === 0 && w.expeditions.some((e) => e.phase === 'done' && s.tick - e.ended > KEEP)) w.expeditions = w.expeditions.filter((e) => !(e.phase === 'done' && s.tick - e.ended > KEEP));
}

/**
 * Mustering: men of a company holding at the edge leave your map as they reach
 * it; a company with all its ready men gone is away. A company broken on the
 * way (in a fight) drops out. Once every company is away, or after two
 * months with those that are, the expedition sets off on the map.
 */
function muster(s: SimState, map: CoastMap, e: Expedition): void {
  const [ox, oz] = leavePoint(map.size, e);
  for (const id of e.companies.slice()) {
    const c = companyOf(s, id);
    if (!c || c.routed || (c.order !== 'march' && c.order !== 'hold' && c.order !== 'away') || (c.order !== 'away' && c.target !== e.edge)) {
      // (Broken, sent elsewhere, dismissed or its barracks gone: it stays.)
      if (c) c.away = 0;
      e.companies = e.companies.filter((x) => x !== id);
      s.rev++;
      continue;
    }
    if (c.order !== 'hold') continue;
    let left = 0;
    for (const x of s.army.soldiers) {
      if (x.company !== c.id || x.state !== 'ready' || x.foe > 0) continue;
      if (dhypot(x.x - c.x, x.z - c.z) < 1.6 || s.tick - e.at >= MUSTER_MOST) {
        x.state = 'away';
        x.x = ox;
        x.z = oz;
        x.path = [];
        x.seg = 0;
        s.rev++;
      } else left++;
    }
    if (left === 0) {
      c.order = 'away';
      c.x = ox;
      c.z = oz;
      s.rev++;
    }
  }
  const late = s.tick - e.at >= MUSTER_MOST;
  const all = e.companies.map((id) => companyOf(s, id) as Company);
  if (!all.length) {
    e.phase = 'done';
    e.ended = s.tick;
    const l = e.loan ? loanOf(s.world, e.loan) : undefined;
    if (l && l.sent === e.id) l.sent = 0;
    armyNews(s, `The expedition to ${cityName(e.city)} never left: no company reached ${e.by === 'sea' ? 'the shipyard' : 'the edge of your land'}`, 0);
    return;
  }
  if (!all.every((c) => c.order === 'away') && !late) return;
  // (Late: a company still on its way stays home.)
  for (const c of all.filter((x) => x.order !== 'away')) {
    c.away = 0;
    e.companies = e.companies.filter((x) => x !== c.id);
    sendBanner(s, map, c.id, -1);
  }
  e.men = s.army.soldiers.filter((x) => x.state === 'away' && e.companies.includes(x.company)).map((x) => x.id);
  // (By sea: the triremes go out with them, a company to each: fleet.ts takes them off the bay's guard.)
  if (e.by === 'sea') e.ships = sailFor(s, map, fleetFor(s, e.city).ids.slice(0, e.companies.length), e.city);
  const { L } = wayFor(e.city, e.by);
  e.phase = 'marching';
  e.start = s.tick;
  e.dur = marchTicks(e.city, e.by);
  e.a0 = EDGE_ALONG;
  e.a1 = L;
  s.rev++;
}

/** The men of an expedition still with it. */
const menWith = (s: SimState, e: Expedition): Soldier[] => s.army.soldiers.filter((x) => e.men.includes(x.id) && x.state === 'away');

/** "the 1st company of hoplites (16 men)". */
const companyLine = (c: Company, n: number): string => `${companyName(c)} of ${kindWord(c.kind)} (${n} men)`;

/** The city's most plentiful trade good (by its stock), what its soldiers carry off. */
function plentiful(c: WorldCity): number {
  let best = 0;
  for (let k = 1; k < TRADE_GOODS.length; k++) if (c.stock[k] > c.stock[best]) best = k;
  return best;
}

/** At their city: the fight with the garrison, resolved from the two sides' strength and the dice; the takings, the losses, the moods, and the report. */
function fight(s: SimState, e: Expedition): void {
  const w = s.world;
  const c = cityOf(w, e.city);
  const name = cityName(e.city);
  const men = menWith(s, e);
  const comps = e.companies.map((id) => companyOf(s, id)).filter((x): x is Company => !!x);
  const kindOf = new Map(comps.map((x) => [x.id, x.kind] as const));
  e.ours = Math.round(men.reduce((a, x) => a + MIGHT[kindOf.get(x.company) ?? 'hoplite'], 0));
  e.theirs = defenders(s, c, e.kind);
  e.odds = oddsOf(e.ours, e.theirs);
  e.won = dice(s, e.id, 0, 11) < e.odds;
  e.fallen = Math.round(e.theirs * (e.won ? 0.3 + 0.2 * dice(s, e.id, 1, 12) : 0.1 + 0.1 * dice(s, e.id, 1, 12)));
  // Who falls: the men in an order the dice set, the first killed, the next wounded.
  const loss = e.won ? LOSS_WON : LOSS_LOST;
  const raidish = e.kind === 'raid' ? 0.5 : 1;
  const nKilled = Math.min(men.length, Math.round(men.length * (loss.killed[0] + loss.killed[1] * dice(s, e.id, 2, 13)) * raidish));
  const nWounded = Math.min(men.length - nKilled, Math.round(men.length * (loss.wounded[0] + loss.wounded[1] * dice(s, e.id, 3, 14))));
  const order = men.slice().sort((a, b) => dice(s, e.id, a.id, 15) - dice(s, e.id, b.id, 15) || a.id - b.id);
  const killed = order.slice(0, nKilled);
  const wounded = order.slice(nKilled, nKilled + nWounded);
  e.killed = killed.map((x) => x.id);
  e.wounded = wounded.map((x) => x.id);
  for (const x of wounded) x.hp = 30;
  // The killed are mourned at home now, as the news comes (and lie in Greece).
  const foe = `${whose(e.city)} ${e.kind === 'raid' ? 'watch' : 'garrison'}`;
  for (const x of killed) {
    mournMan(s, x, companyOf(s, x.company), e.kind === 'raid' ? `${whose(e.city)} garrison` : foe);
  }
  s.army.soldiers = s.army.soldiers.filter((x) => !e.killed.includes(x.id));
  // The takings.
  const l = e.loan ? loanOf(w, e.loan) : undefined;
  const debt = l && l.state === 'overdue' ? l : undefined;
  const left = men.length - killed.length;
  const k = plentiful(c);
  const unit = Math.max(0.01, c.price[k] / 100);
  if (e.won) {
    if (e.kind === 'raid') {
      const most = debt ? debt.owed * RAID_SHARE : Infinity;
      e.coin = Math.round(Math.min(left * RAID_COIN, most));
      e.goods = Math.max(0, Math.floor(Math.min(left * RAID_GOODS, (most - e.coin) / unit)));
    } else if (debt) {
      e.coin = debt.owed;
      e.goods = Math.round((debt.owed * PENALTY) / unit);
    } else {
      e.coin = left * FORCE_COIN;
      e.goods = left * FORCE_GOODS;
    }
    e.goods = Math.floor(e.goods / 10) * 10;
    e.good = e.goods > 0 ? k : -1;
    // (Gone from their stores: it moves their prices.)
    if (e.goods > 0) c.stock[k] = Math.max(0, c.stock[k] - e.goods);
  }
  const worth = e.coin + Math.round(e.goods * unit);
  // What it is worth comes off the debt now (the takings are yours, on their way home); a full force that won clears it.
  let debtLine = '';
  if (debt) {
    debt.sent = 0;
    e.value = e.won ? (e.kind === 'force' ? debt.owed : Math.min(debt.owed, worth)) : 0;
    if (e.value > 0) {
      debt.seized += e.value;
      debt.owed -= e.value;
      if (debt.owed <= 0) endLoan(s, debt, 'collected');
    }
    debtLine = debt.state === 'collected' ? 'the debt is paid off' : e.value > 0 ? `${fmt(debt.owed)} dr of the debt is still owed` : `the ${fmt(debt.owed)} dr still stands`;
  } else if (l && l.sent === e.id) l.sent = 0;
  // What Greece makes of it.
  const cause = !!e.loan;
  const answer: LoanAnswer = cause ? (e.kind === 'raid' ? 'raided' : 'forced') : e.kind === 'raid' ? 'raidedfree' : 'forcedfree';
  const m = loanMemory(c, answer, cause ? `you sent your soldiers against them over a debt` : `you sent your soldiers against them without cause`, s.tick);
  c.memories.push(m);
  settleMood(s, c);
  const heard: LoanAnswer = cause ? 'heardraid' : 'heardfree';
  let heardAmount = 0;
  for (const o of w.cities) {
    if (!o.ruler || o.id === e.city) continue;
    const hm = loanMemory(o, heard, cause ? `heard you attacked ${name} over a debt` : `heard you attacked ${name} without cause`, s.tick);
    o.memories.push(hm);
    heardAmount = Math.min(heardAmount, hm.amount);
    settleMood(s, o);
  }
  // The report.
  const what = e.kind === 'raid' ? 'A raiding party' : 'A full force';
  const went = comps.map((x) => companyLine(x, men.filter((y) => y.company === x.id).length)).join(' and ');
  const r: string[] = [];
  r.push(`${what}: ${went}, ${men.length} men in all, ${cause ? `for the ${fmt((l?.owed ?? 0) + (debt ? e.value : 0))} dr ${name} owed you` : `against ${name}, which owed you nothing`}.`);
  r.push(`They met ${e.kind === 'raid' ? `${whose(e.city)} watch in the countryside, about ${e.theirs} men` : `${whose(e.city)} garrison, about ${e.theirs} men${WALLED[e.city] ? ' behind its walls' : ''}`} (the odds were about ${Math.round(e.odds * 10)} in 10), and ${e.won ? 'won' : 'were beaten'}: about ${e.fallen} of theirs fell.`);
  const haul = [e.coin > 0 ? `${fmt(e.coin)} dr` : '', e.goods > 0 ? `${fmt(e.goods)} ${WARE_NAMES[TRADE_GOODS[k]]}` : ''].filter(Boolean).join(' and ');
  const goodsWords = e.goods > 0 ? `${fmt(e.goods)} ${WARE_NAMES[TRADE_GOODS[k]]}` : '';
  if (!e.won) r.push(`They took nothing${debt ? `: ${debtLine}` : ''}.`);
  else if (debt && e.kind === 'force') r.push(`They took the ${fmt(e.coin)} dr owed${goodsWords ? `, and ${goodsWords} besides (about ${fmt(Math.round(e.goods * unit))} dr to ${name}, the penalty)` : ''}: ${debtLine}. It comes home with them.`);
  else r.push(`They took ${haul || 'nothing worth carrying'}${debt ? `, worth ${fmt(e.value)} dr against the debt: ${debtLine}` : ''}. It comes home with them.`);
  const byCompany = comps
    .map((x) => {
      const dead = killed.filter((y) => y.company === x.id);
      const hurt = wounded.filter((y) => y.company === x.id).length;
      const bits = [dead.length ? `${dead.length} killed (${dead.map((y) => y.name).join(', ')})` : '', hurt ? `${hurt} wounded` : ''].filter(Boolean).join(', ');
      return `${cap(companyName(x))}: ${bits || 'none lost'}`;
    })
    .join('. ');
  r.push(`${byCompany}.`);
  r.push(`${cap(rulerShort(c))} will not soon forget it (${signed(m.amount)}), and Greece ${cause ? 'frowns on it' : 'is shocked'} (${signed(heardAmount)} with every other ruler).`);
  r.push(e.by === 'sea' ? `They sail home: in your bay about ${dayWords(s.tick + FIGHT_TICKS + marchTicks(e.city, e.by))}.` : `They march home by road: at the edge of your land about ${dayWords(s.tick + FIGHT_TICKS + marchTicks(e.city, e.by))}.`);
  e.report = r;
  e.phase = 'fighting';
  e.start = s.tick;
  e.dur = FIGHT_TICKS;
  e.a0 = e.a1;
  s.rev++;
  const lost = killed.length ? `; ${killed.length} of yours killed` : '';
  news(w, s.tick, e.city, `Your ${e.kind === 'raid' ? 'raiding party' : 'army'} at ${name} ${e.won ? `won, and comes home with ${haul || 'little'}` : 'was beaten, and comes home with nothing'}${lost}${debt ? ` (${debtLine})` : ''}. The report is on ${whose(e.city)} page`, true);
  armyNews(s, `Your ${e.kind === 'raid' ? 'raiding party' : 'army'} at ${name} ${e.won ? 'won' : 'was beaten'}: ${killed.length} killed, ${wounded.length} wounded${haul && e.won ? `; it brings ${haul}` : ''}`, 0);
}

/** Put goods into the stores (the nearest kind with room); what there is no room for is lost. How many went in. */
function store(s: SimState, ware: number, n: number): number {
  let left = n;
  for (const b of s.buildings) {
    if (left <= 0) break;
    if (b.kind !== storeKind(ware as never)) continue;
    const r = Math.min(left, roomFor(b, ware as never));
    if (r <= 0) continue;
    setHeld(b, ware as never, held(b, ware as never) + r);
    left -= r;
  }
  return n - left;
}

/** Home at the edge: the companies come back onto your map and march to their barracks (the wounded walk there to heal); the coin into the treasury, the goods into the stores. */
function comeHome(s: SimState, map: CoastMap, e: Expedition): void {
  const n = map.size;
  const [ex, ez] = [(e.edge % n) + 0.5, Math.floor(e.edge / n) + 0.5];
  const [ox, oz] = leavePoint(n, e);
  // (By sea: the triremes come in to their moorings, fleet.ts.)
  if (e.ships.length) fleetHome(s, map, e.ships);
  for (const x of s.army.soldiers) {
    if (!e.men.includes(x.id) || x.state !== 'away') continue;
    x.x = ox;
    x.z = oz;
    x.path = [];
    x.seg = 0;
    x.foe = 0;
    if (e.wounded.includes(x.id)) {
      x.state = 'wounded';
      x.fell = s.tick - LIE;
    } else x.state = 'ready';
  }
  for (const id of e.companies) {
    const c = companyOf(s, id);
    if (!c) continue;
    c.away = 0;
    c.x = ex;
    c.z = ez;
    c.order = 'hold';
    c.target = e.edge;
    if (!sendBanner(s, map, c.id, -1)) c.order = 'hold';
  }
  // (Any of their men who stayed behind and are standing about the edge: none; the rest are at the barracks.)
  const name = cityName(e.city);
  if (e.coin > 0) income(s, e.coin, 'collected', `from ${name}`);
  let put = 0;
  if (e.goods > 0 && e.good >= 0) {
    const ware = TRADE_GOODS[e.good];
    put = store(s, ware, e.goods);
    if (put > 0) note(s, ware, 'bought', `taken:${e.city}`, put);
    s.looks++;
  }
  e.phase = 'back';
  e.start = s.tick;
  s.rev++;
  const haul = [e.coin > 0 ? `${fmt(e.coin)} dr into the treasury` : '', put > 0 ? `${fmt(put)} ${WARE_NAMES[TRADE_GOODS[e.good]]} into the stores${put < e.goods ? ` (no room for the other ${fmt(e.goods - put)})` : ''}` : ''].filter(Boolean).join(' and ');
  armyNews(s, `Your soldiers are home from ${name}${haul ? `, with ${haul}` : ''}${e.wounded.length ? `; ${e.wounded.length} wounded walk to the barracks to heal` : ''}`, 0);
  void findBuilding;
}

// ---------------------------------------------------------------------------
// On the map of Greece, and in words.

/** Where an expedition is on the map of Greece at a tick: along its way from your city, which way it faces, and whether it is fighting; null while it is in your city or done. */
export function expeditionOnMap(e: Expedition, tick: number): { along: number; homeward: boolean; fighting: boolean } | null {
  if (e.phase !== 'marching' && e.phase !== 'fighting' && e.phase !== 'homeward') return null;
  if (e.phase === 'fighting') return { along: e.a0, homeward: false, fighting: true };
  const u = clamp((tick - e.start) / Math.max(1, e.dur), 0, 1);
  return { along: e.a0 + (e.a1 - e.a0) * u, homeward: e.phase === 'homeward', fighting: false };
}

/** How many men an expedition has with it now (on the map; before it sets off, those mustering). */
export function expeditionMen(s: SimState, e: Expedition): number {
  if (e.phase === 'mustering') return e.companies.reduce((a, id) => a + s.army.soldiers.filter((x) => x.company === id && (x.state === 'ready' || x.state === 'away')).length, 0);
  return s.army.soldiers.filter((x) => e.men.includes(x.id) && x.state === 'away').length;
}

/** An expedition in a line: where it is and what it is doing. */
export function expeditionLine(s: SimState, e: Expedition): string {
  const name = cityName(e.city);
  const what = e.kind === 'raid' ? 'Your raiding party' : 'Your army';
  const men = expeditionMen(s, e);
  const days = (t: number): string => {
    const n = Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
    return n === 1 ? '1 day' : `${n} days`;
  };
  switch (e.phase) {
    case 'mustering':
      return e.by === 'sea' ? `${what} for ${name} (${men} men) is marching to the shipyard` : `${what} for ${name} (${men} men) is marching to the ${routeWay(e.city, 'land')?.side ?? RAID_SIDE[e.city]} edge of your land`;
    case 'marching':
      return `${what} (${men} men) is ${e.by === 'sea' ? 'at sea, bound for' : 'on the road to'} ${name}: there in ${days(e.start + e.dur)}`;
    case 'fighting':
      return `${what} is at ${name}, ${e.won ? 'the garrison beaten' : 'beaten by the garrison'}`;
    case 'homeward':
      return `${what} is ${e.by === 'sea' ? 'at sea on the way home' : 'on the road home'} from ${name}${e.won ? ' with what it took' : ', beaten'}: ${e.by === 'sea' ? 'in your bay' : 'at the edge of your land'} in ${days(e.start + e.dur)}`;
    case 'back':
      return `${what} is home from ${name}, marching back to the barracks`;
    default:
      return `${what} came home from ${name} ${dayWords(e.ended)}`;
  }
}
