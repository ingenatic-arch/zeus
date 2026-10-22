/**
 * Vassals and allies (slice 34): your city standing over its neighbours.
 *
 * - **Three ways to take a city.** Conquest: a full force sent "to conquer"
 *   (expeditions.ts, aim 'conquer') meets the city's whole army on its home
 *   ground, with its friends' help and its lord's; won, the city bows to you.
 *   Awe: a city cold or wary to you, its side no more than half your army,
 *   can be told to submit: your herald comes back with its answer (it bows,
 *   refuses and remembers it, or calls on its friends). Debt: a city whose
 *   loan to you is overdue can be offered its debt for its loyalty.
 * - **A vassal** is a city whose `lord` is 'home' (slice 31's link). It sends
 *   tribute each season (coin or one of its goods; light, fair or heavy): a
 *   caravan down its road (or a ship into your bay) to your stores and
 *   treasury. Its loyalty moves each month towards the sum of named reasons;
 *   under 30 it arms, a season before it would rise, and you can lighten its
 *   tribute, send a gift or march on it. It never trades against you, never
 *   threatens you, and sends a company down its road when you are raided.
 * - **An ally** is a warm ruler who accepted your herald's offer: it sends a
 *   company down its road when you are raided too; when it goes to war it asks
 *   you to join (refusing is remembered), and it may march with you when you
 *   go to conquer.
 *
 * What it changes in your city: donkeys walking tribute in to your stores
 * (ledger and stock book lines of their own), allied companies walking in to
 * stand by what raiders make for, your army's absence and size weighing on a
 * vassal's loyalty. Pure: the dice are hashes of Greece's seed with a salt of
 * their own, so Greece's generator and every older roll land as before.
 * Nothing here runs in a town with no vassal, ally, herald or call.
 */
import type { CoastMap } from '../map/bake';
import { datan2, dhypot } from '../map/dmath';
import { EDGE_ALONG, HORIZON_ALONG, PLACES, RULED, type CityId } from '../map/greece';
import { hash2 } from '../map/noise';
import { COMPANY_SIZE, companyOf, dismiss, slotAt } from './army';
import { around, centreOf, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import type { Command } from './commands';
import { heraldTicks, news, settleMood, wayFor } from './diplomacy';
import { dayWords } from './favours';
import { held, setHeld, WARE_NAMES, type Ware } from './foods';
import { MEN } from './folk';
import { expeditionOut, expeditionPlan, expeditionRefusal, sendExpedition, WALLED } from './expeditions';
import { adjective, baseOf, change } from './growth';
import { end as endLoan, fearOf, garrisonOf, loanOf } from './loans';
import { landing, mayThreaten, threaten } from './raids';
import { FRIENDS, foeIn, mutual, PAIRS, warOf } from './rivals';
import { landTicks, routeWay, tributeCaravan, visitorAt, voyageTicks } from './routes';
import type { Building, Company, Expedition, Loan, Memory, Raid, SimState, Visitor, World, WorldCity } from './state';
import { note } from './stockbook';
import { roomFor } from './stores';
import { berthOf, leaveTicks, SAIL_IN, shipRoute, SHIP_ANCHORED, SHIP_COMING, SHIP_LEAVING, storeKind, TRADE_GOODS, tradingPost } from './trade';
import { income } from './treasury';
import { offMapPoint } from './walk';
import { offRoadPath, prunePath, walkable } from './wild';
import { cityOf, COLD, HOSTILE, memoryWorth, moodOf, rulerName, rulerShort, sellsAndBuys, WARM } from './world';
// Integrating slice 34 with 33: winter holds tribute ships back and keeps most allies at home.
import { armiesHome, lateWords, seasonOf, stormDelay, WINTER } from './seasons';
// Slice 37: your colonies (colonies.ts) keep their records here, and their ships bring their share as tribute does.
import type { Colony, Founding } from './colonies';
import { caravanEntry } from './routes';
import { lineLength, siteOf, wayOf, wayPoints } from '../map/greece';
import { TILE_ROAD } from './state';

// ---------------------------------------------------------------------------
// The records.

/** One of your vassals: how it was taken, its tribute, its loyalty, a rising's warning. */
export interface Vassal {
  city: CityId;
  /** When it bowed, and how: by conquest, by awe (it submitted to your herald), by debt (its debt for its loyalty). */
  since: number;
  how: 'conquest' | 'awe' | 'debt';
  /** Its tribute: coin (-1) or a trade good it sells (by TRADE_GOODS index), and how heavy (0 light, 1 fair, 2 heavy). */
  good: number;
  weight: number;
  /** Its loyalty, 0 to 100 (moved each month half the way towards what its reasons add up to). */
  loyalty: number;
  /** When its next tribute sets out from its city. */
  next: number;
  /** What it has sent you in all: how many times, and what it was worth (dr, at its prices). */
  sent: number;
  worth: number;
  /** Arming: when it began (0: not arming), and the day it rises unless its loyalty mends. */
  arming: number;
  rises: number;
}

/** One of your allies: since when; the ticks you refused its calls to war; how often it would not march with you. */
export interface Ally {
  city: CityId;
  since: number;
  refused: number[];
  declined: number;
}

/** Your herald on his way with a demand or an offer, and (once back) its answer. */
export interface Herald {
  id: number;
  city: CityId;
  /** submit (bow to you), debt (its debt for its loyalty: `loan`), alliance. */
  kind: 'submit' | 'debt' | 'alliance';
  loan: number;
  /** When he set out, and the day the answer comes. */
  at: number;
  due: number;
  /** The odds when he set out (0 to 1), and their reasons in words. */
  odds: number;
  why: string;
  /** '' while he is away; yes, no, or (a demand to submit) it called on its friends. */
  answer: '' | 'yes' | 'no' | 'friends';
  /** The answer in words. */
  line: string;
}

/** A vassal's tribute on its way: on its road (or lane) across Greece, then into your city, then done. */
export interface Tribute {
  id: number;
  city: CityId;
  /** Coin (-1) or a trade good; how much (dr, or measures); what it is worth (dr). */
  good: number;
  amount: number;
  worth: number;
  by: 'land' | 'sea';
  way: string;
  /** road (on the map of Greece), bay (its ship sailing in), city (donkeys walking it to the store), done. */
  phase: 'road' | 'bay' | 'city' | 'done';
  start: number;
  dur: number;
  /** By sea: its ship in your bay (routes.ts' visitorAt draws her; null by land, or once she has gone). */
  ship: Visitor | null;
  /** What went into your stores or treasury, what there was no room for, and where (a building id; 0 none, or straight in). */
  put: number;
  lost: number;
  store: number;
  /** In words, once in: "into the storehouse by the north road". */
  how: string;
  ended: number;
  /** Slice 37: a colony's shipment (its site; city 'home'), not a vassal's tribute. */
  colony?: string;
}

/** A company sent to your aid against raiders: on its road, in your city (`company`), going home, done. */
export interface Aid {
  id: number;
  city: CityId;
  raid: number;
  men: number;
  way: string;
  phase: 'road' | 'city' | 'home' | 'done';
  start: number;
  dur: number;
  company: number;
  /** What it did, in words, for the page. */
  line: string;
}

/** An ally's call to join its war: open (waiting on you, until `due`), joined (an expedition sent), refused, lapsed, or over (the war ended first). */
export interface WarCall {
  id: number;
  ally: CityId;
  foe: CityId;
  war: number;
  at: number;
  due: number;
  state: 'open' | 'joined' | 'refused' | 'lapsed' | 'over';
  expedition: number;
}

/** A conquest's side of things: who marched with you, who would not, and who stood with the city. */
export interface Conquest {
  expedition: number;
  city: CityId;
  helpers: Array<{ city: CityId; men: number }>;
  declined: CityId[];
  theirs: Array<{ who: string; n: number }>;
  /** It was sent to crush a vassal's rising, not to take a city. */
  crush: boolean;
}

/** Your empire: vassals, allies, heralds, tribute and aid on the way, allies' calls, conquests' records. */
export interface Empire {
  vassals: Vassal[];
  allies: Ally[];
  heralds: Herald[];
  tribute: Tribute[];
  aid: Aid[];
  calls: WarCall[];
  conquests: Conquest[];
  nextId: number;
  /** Slice 37: your colonies, and a colony on its way (colonies.ts). */
  colonies: Colony[];
  foundings: Founding[];
}

export const freshEmpire = (): Empire => ({ vassals: [], allies: [], heralds: [], tribute: [], aid: [], calls: [], conquests: [], nextId: 1, colonies: [], foundings: [] });

// ---------------------------------------------------------------------------
// The numbers.

/** Tribute a year, as a share of the vassal's income: light, fair, heavy. */
export const TRIBUTE_SHARE = [0.1, 0.2, 0.3] as const;
export const WEIGHT_WORDS = ['light', 'fair', 'heavy'] as const;
/** Tribute sets out each season; the first a month after it bows. */
export const SEASON = 3 * TICKS_PER_MONTH;
const FIRST_TRIBUTE = TICKS_PER_MONTH;
/** Loyalty: its base, the tribute's weight (light, fair, heavy), how it was taken (fading), time under you, your army, your army abroad, gifts, its ruler's mood, whispers. */
const LOYAL_BASE = 50;
const TRIBUTE_LOYALTY = [15, 0, -20] as const;
const HOW_LOYALTY: Record<Vassal['how'], { n: number; fade: number; why: string }> = {
  conquest: { n: -15, fade: 3 * TICKS_PER_YEAR, why: 'taken by conquest' },
  awe: { n: -5, fade: 2 * TICKS_PER_YEAR, why: 'bowed under threat, and resents it' },
  debt: { n: 10, fade: 3 * TICKS_PER_YEAR, why: 'its debt let go' },
};
/** Fresh from its defeat, or from facing your army, a city is cowed for a while (fading). */
const COWED: Partial<Record<Vassal['how'], { n: number; fade: number }>> = { conquest: { n: 25, fade: 18 * TICKS_PER_MONTH }, awe: { n: 15, fade: TICKS_PER_YEAR } };
/** A conquest is a defeat in war to the city: people, army and wealth (growth.ts' DEFEAT). */
const CONQUERED = { pop: -0.06, army: -0.4, wealth: -0.2 };
const YEAR_LOYALTY = 3;
const YEARS_MOST = 15;
const ARMY_LEAST = -15;
const ARMY_MOST = 20;
const ABROAD = -10;
const GIFT_SHARE = 0.6;
const GIFT_MOST = 20;
const MOOD_SHARE = 0.2;
const MOOD_MOST = 10;
const WHISPER = -5;
const WHISPER_MOST = -15;
/** Under this at a month's turn it arms; at or over STAND_DOWN it stands down; it rises on the day (a season on) if still under ARMING. */
export const ARMING = 30;
const STAND_DOWN = 40;
export const WARNING = 90 * TICKS_PER_DAY;
/** What a rising leaves: its grudge. */
const ROSE = { amount: -25, fade: 3 * TICKS_PER_YEAR };
/** A rising crushed: loyalty set back, and a hard memory. */
const CRUSHED = { loyalty: 50, amount: -20, fade: 3 * TICKS_PER_YEAR };
/** Awe: your army at least this many times its side; the odds at that, and for each time more; one demand a city a year. */
const AWE_RATIO = 2;
const AWE_BASE = 0.25;
const AWE_PER = 0.22;
const DEMAND_GAP = TICKS_PER_YEAR;
/** What a refused demand leaves, and what its friends make of it. */
const DEMANDED = { amount: -20, fade: 2 * TICKS_PER_YEAR };
const FRIEND_ILL = { amount: -15, fade: 2 * TICKS_PER_YEAR };
/** A friend stands by a city with this share of its army; so does its lord. */
const FRIEND_SHARE = 0.25;
const LORD_SHARE = 0.25;
/** Fighting at home, a city's army counts a quarter again against a conquest. */
const HOME_GROUND = 1.25;
/** A rival lord remembers losing its vassal to you. */
const TAKEN = { amount: -20, fade: 3 * TICKS_PER_YEAR };
/** A debt for loyalty refused: a small grudge. */
const DEBT_REFUSED = { amount: -5, fade: TICKS_PER_YEAR };
/** Alliances: ended by you, an ally's call refused or let lapse (two within three years end it), an ally's help in your war. */
const UNALLIED = { amount: -20, fade: 2 * TICKS_PER_YEAR };
const CALL_REFUSED = { amount: -15, fade: 18 * TICKS_PER_MONTH };
const CALL_DAYS = 60 * TICKS_PER_DAY;
const REFUSALS_MOST = 2;
const REFUSALS_FOR = 3 * TICKS_PER_YEAR;
const MARCHED = { amount: 15, fade: 2 * TICKS_PER_YEAR };
/** An ally marches with your conquest: warm, devoted. */
const MARCH_ODDS = [0.6, 0.8] as const;
/** Aid against raiders: a quarter of its army, 8 to 16 men; it waits this long after the raid before it goes home. */
const AID_SHARE = 0.3;
const AID_LEAST = 8;
/** A herald's answer comes back in twice his way, at least ten days, at most two months. */
const ANSWER_LEAST = 10 * TICKS_PER_DAY;
const ANSWER_MOST = 60 * TICKS_PER_DAY;
/** How long answers, tribute and aid done, calls and conquests are kept for the page. */
const KEEP = TICKS_PER_YEAR;
/** A tribute ship rides at anchor this long while her cargo comes ashore. */
const ASHORE = 2 * TICKS_PER_DAY;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const name = (id: CityId): string => (id === 'home' ? 'your city' : (PLACES[id]?.name ?? id));
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Greece's dice for the empire (a hash: Greece's own generator is never touched). */
const dice = (w: World, a: number, i: number, salt: number): number => hash2(a, i * 37 + salt, (w.seed ^ 0x76617373) | 0);

// ---------------------------------------------------------------------------
// Looking things up.

export const vassalOf = (s: SimState, city: CityId | string): Vassal | undefined => s.empire.vassals.find((v) => v.city === city);
export const allyOf = (s: SimState, city: CityId | string): Ally | undefined => s.empire.allies.find((a) => a.city === city);
/** Is a city bound to you (your vassal or your ally)? Neither threatens you nor demands tribute of you. */
export const boundTo = (s: SimState, city: CityId | string): boolean => !!vassalOf(s, city) || !!allyOf(s, city);
/** Your herald to a city still on his way, if any. */
export const heraldTo = (s: SimState, city: CityId | string): Herald | undefined => s.empire.heralds.find((h) => h.city === city && h.answer === '');
/** The last herald to a city (away, or his answer), if any. */
export const lastHerald = (s: SimState, city: CityId | string, kind?: Herald['kind']): Herald | undefined => s.empire.heralds.filter((h) => h.city === city && (!kind || h.kind === kind)).at(-1);
/** An open call to war from an ally, if any. */
export const openCall = (s: SimState, ally?: CityId): WarCall | undefined => s.empire.calls.find((c) => c.state === 'open' && (!ally || c.ally === ally));

/** Your own men under arms, ready or away (not allies' companies, not the wounded). */
export function ourMen(s: SimState): number {
  const own = new Set(s.army.companies.filter((c) => !c.ally).map((c) => c.id));
  return s.army.soldiers.filter((x) => own.has(x.company) && (x.state === 'ready' || x.state === 'away')).length;
}

/** A city's yearly income (dr): its base wealth's taxes and trade with its people (growth.ts' INCOME, 3% a month). */
export function incomeOf(c: WorldCity): number {
  const b = baseOf(c.id);
  return b.pop > 0 ? b.wealth * 0.03 * 12 * (c.pop / b.pop) : 0;
}

/** The goods a vassal can pay in: those it sells. */
export const tributeGoods = (c: WorldCity): number[] => sellsAndBuys(c).sells;

/** What a vassal's tribute would come to a year at a weight, in dr, and in its good (measures, at its price now). */
export function tributeYear(s: SimState, v: Vassal, weight = v.weight, good = v.good): { dr: number; amount: number } {
  const c = cityOf(s.world, v.city);
  const dr = Math.round(incomeOf(c) * TRIBUTE_SHARE[clamp(weight, 0, 2)]);
  if (good < 0) return { dr, amount: dr };
  return { dr, amount: Math.round((dr * 100) / Math.max(1, c.price[good]) / 10) * 10 };
}

/** The ruled cities that would stand by a city against you: a road or lane between them, friends (+30 or better), not your vassals or allies, not at war with it. */
export function friendsOf(s: SimState, city: CityId): WorldCity[] {
  const w = s.world;
  const out: WorldCity[] = [];
  for (const [a, b] of PAIRS) {
    if (a !== city && b !== city) continue;
    const o = a === city ? b : a;
    const c = cityOf(w, o);
    if (!c.ruler || !c.pop || boundTo(s, o) || c.lord === 'home') continue;
    const x = warOf(w, o);
    if (x && foeIn(x, o) === city) continue;
    if (mutual(w, city, o, s.tick) >= FRIENDS && !out.includes(c)) out.push(c);
  }
  return out;
}

/** A city's side against you: its army, a share of each friend's and of its lord's (a rival lord), each named. */
export function sideOf(s: SimState, c: WorldCity, home = false): { total: number; parts: Array<{ who: string; n: number }> } {
  const own = home ? Math.round(garrisonOf(s, c) * HOME_GROUND * (WALLED[c.id] ?? 1)) : Math.round(c.army);
  const parts: Array<{ who: string; n: number }> = [{ who: home ? `${whose(c.id)} army at home${WALLED[c.id] ? ', behind its walls' : ''}` : `${whose(c.id)} army`, n: own }];
  for (const f of friendsOf(s, c.id)) parts.push({ who: `${name(f.id)}, its friend`, n: Math.round(f.army * FRIEND_SHARE) });
  if (c.lord && c.lord !== 'home') parts.push({ who: `${name(c.lord)}, its lord`, n: Math.round(cityOf(s.world, c.lord).army * LORD_SHARE) });
  return { total: parts.reduce((a, p) => a + p.n, 0), parts };
}

const sideWords = (parts: Array<{ who: string; n: number }>): string => parts.map((p, i) => (i === 0 ? `its ${p.n}` : `${p.who.replace(/, its (friend|lord)$/, '')}’s ${p.n}`)).join(' and ');

export type Likely = 'likely' | 'fair' | 'doubtful' | 'unlikely';
export const likelyWord = (p: number): Likely => (p >= 0.7 ? 'likely' : p >= 0.45 ? 'fair' : p >= 0.2 ? 'doubtful' : 'unlikely');

// ---------------------------------------------------------------------------
// Awe: "submit to us".

export interface Plan {
  /** '' if it can be sent; else why not. */
  refusal: string;
  p: number;
  word: Likely;
  /** The reasons, in a line. */
  why: string;
}

/** Why a city can't be sent a demand to submit now ('' if it can). */
function submitRefusal(s: SimState, c: WorldCity, ours: number, theirs: number): string {
  if (!c.ruler || !RULED.includes(c.id)) return 'There is no ruler there';
  if (vassalOf(s, c.id)) return `${name(c.id)} is your vassal already`;
  if (allyOf(s, c.id)) return `${name(c.id)} is your ally`;
  if (heraldTo(s, c.id)) return 'Your herald is on his way there already';
  const last = lastHerald(s, c.id, 'submit');
  if (last && s.tick - last.at < DEMAND_GAP) return `You demanded it once this year: again after ${dayWords(last.at + DEMAND_GAP)}`;
  const mood = moodOf(c, s.tick);
  if (mood <= HOSTILE) return `${rulerShort(c)} is hostile: too angry to listen to a herald`;
  if (mood >= 0) return `${rulerShort(c)} is on good terms with you: ${mood >= WARM ? 'offer an alliance instead' : 'a demand would make an enemy of a friend'}`;
  if (warOf(s.world, c.id)) return `${name(c.id)} is at war: it has no ear for heralds now`;
  if (ours < theirs * AWE_RATIO) return `Your army is not big enough to frighten it: your ${ours} men against its side of ${theirs} (you need twice as many)`;
  return '';
}

/** A demand to submit as it would go now: the odds, their reasons, or why it can't be sent. */
export function submitPlan(s: SimState, city: CityId): Plan & { ours: number; theirs: number; friends: string[] } {
  const c = cityOf(s.world, city);
  const ours = ourMen(s);
  const side = sideOf(s, c);
  const theirs = side.total;
  const friends = friendsOf(s, city).map((f) => name(f.id));
  const refusal = submitRefusal(s, c, ours, theirs);
  const r = ours / Math.max(1, theirs);
  let p = AWE_BASE + AWE_PER * Math.max(0, r - AWE_RATIO);
  // (Review of slice 34: what the armies alone make of it, so the reasons add up to the odds shown.)
  const why: string[] = [`your ${ours} men against ${sideWords(side.parts)}, ${(Math.floor(r * 10) / 10).toFixed(1)} times its side (${Math.round(p * 100)} in 100)`];
  const t = c.ruler?.traits ?? [];
  const bend = (cond: boolean, n: number, words: string): void => {
    if (!cond) return;
    p += n;
    why.push(`${words} (${n > 0 ? '+' : '−'}${Math.round(Math.abs(n) * 100)})`);
  };
  bend(t.includes('proud'), -0.15, 'proud');
  bend(t.includes('warlike'), -0.15, 'warlike');
  bend(t.includes('steadfast'), -0.1, 'steadfast');
  bend(t.includes('shrewd'), 0.1, 'shrewd: it can count');
  bend(moodOf(c, s.tick) <= COLD, -0.1, 'cold to you');
  bend(s.world.expeditions.some((e) => e.city === city && e.won && e.ended > 0 && s.tick - e.ended < 2 * TICKS_PER_YEAR), 0.15, 'beaten by your soldiers lately');
  for (const f of friends) bend(true, -0.1, `${f} might come to its aid`);
  p = clamp(r2(p), 0.05, 0.9);
  return { refusal, p, word: likelyWord(p), why: why.join('; '), ours, theirs, friends };
}

// ---------------------------------------------------------------------------
// Debt: "your debt for your loyalty".

/** A loan a city owes you that could be traded for its loyalty: overdue, nobody out after it. */
export const debtFor = (s: SimState, city: CityId | string): Loan | undefined => s.world.loans.find((l) => l.city === city && l.side === 'out' && l.state === 'overdue' && !l.sent);

/** An offer of a city's debt for its loyalty as it would go now. */
export function debtPlan(s: SimState, city: CityId): Plan & { loan: Loan | undefined } {
  const c = cityOf(s.world, city);
  const l = debtFor(s, city);
  let refusal = '';
  if (!l) refusal = `${name(city)} owes you nothing overdue`;
  else if (vassalOf(s, city)) refusal = `${name(city)} is your vassal already`;
  else if (heraldTo(s, city)) refusal = 'Your herald is on his way there already';
  else if (l.demand > 0) refusal = 'Your demand stands: wait for its day';
  else if (lastHerald(s, city, 'debt')?.answer === 'no' && s.tick - (lastHerald(s, city, 'debt')?.at ?? 0) < DEMAND_GAP) refusal = 'It refused once this year';
  const owed = l?.owed ?? 0;
  const why: string[] = [];
  let p = 0.3;
  // (Owing more than its treasury holds, the offer looks better.)
  const heavy = clamp((owed / Math.max(1, c.wealth) - 0.5) * 0.4, 0, 0.3);
  if (heavy > 0) {
    p += heavy;
    why.push(`it owes ${fmt(owed)} dr with ${fmt(c.wealth)} in its treasury (+${Math.round(heavy * 100)})`);
  } else why.push(`it could pay: ${fmt(c.wealth)} dr in its treasury`);
  const mood = moodOf(c, s.tick);
  const t = c.ruler?.traits ?? [];
  const bend = (cond: boolean, n: number, words: string): void => {
    if (!cond) return;
    p += n;
    why.push(`${words} (${n > 0 ? '+' : '−'}${Math.round(Math.abs(n) * 100)})`);
  };
  bend(mood >= 0, 0.1, 'on good terms with you');
  bend(mood <= COLD, -0.2, 'cold to you');
  bend(t.includes('proud'), -0.2, 'proud');
  bend(t.includes('greedy'), 0.1, 'greedy');
  const f = fearOf(s, c);
  if (f.p > 0) {
    p += f.p;
    why.push(`${f.words} (+${Math.round(f.p * 100)})`);
  }
  p = clamp(r2(p), 0.05, 0.9);
  return { refusal, p, word: likelyWord(p), why: why.join('; '), loan: l };
}

// ---------------------------------------------------------------------------
// Alliances.

/** An offer of alliance as it would go now. */
export function allyPlan(s: SimState, city: CityId): Plan {
  const c = cityOf(s.world, city);
  const mood = moodOf(c, s.tick);
  let refusal = '';
  if (!c.ruler || !RULED.includes(city)) refusal = 'There is no ruler there';
  else if (allyOf(s, city)) refusal = `${name(city)} is your ally already`;
  else if (vassalOf(s, city)) refusal = `${name(city)} is your vassal`;
  else if (c.lord) refusal = `${name(city)} is ${whose(c.lord)} vassal: it makes no alliances of its own`;
  else if (heraldTo(s, city)) refusal = 'Your herald is on his way there already';
  else if (mood < WARM) refusal = `${rulerShort(c)} is not warm enough towards you (an alliance needs a warm ruler)`;
  else if (lastHerald(s, city, 'alliance')?.answer === 'no' && s.tick - (lastHerald(s, city, 'alliance')?.at ?? 0) < DEMAND_GAP) refusal = 'It declined once this year';
  const why: string[] = [];
  let p = mood >= 60 ? 0.85 : 0.55;
  why.push(mood >= 60 ? 'devoted to you' : 'warm towards you');
  const t = c.ruler?.traits ?? [];
  const bend = (cond: boolean, n: number, words: string): void => {
    if (!cond) return;
    p += n;
    why.push(`${words} (${n > 0 ? '+' : '−'}${Math.round(Math.abs(n) * 100)})`);
  };
  bend(t.includes('steadfast'), 0.1, 'steadfast');
  bend(t.includes('fickle'), -0.15, 'fickle');
  bend(t.includes('proud'), -0.1, 'proud');
  p = clamp(r2(p), 0.05, 0.95);
  return { refusal, p, word: likelyWord(p), why: why.join('; ') };
}

// ---------------------------------------------------------------------------
// Conquest.

/** Why a full force can't be sent to conquer a city now ('' if it can): the expedition's own refusals, and the city's standing with you. */
export function conquerRefusal(s: SimState, city: CityId | string): string {
  const v = vassalOf(s, city);
  if (v && !v.arming) return `${name(city as CityId)} is your vassal: you march on it only if it arms against you`;
  if (allyOf(s, city)) return `${name(city as CityId)} is your ally: end the alliance first`;
  return expeditionRefusal(s, city, 'force', 'conquer');
}

/** A conquest as it would go now: your force, their side at home, the odds, which allies might march with you. */
export function conquestPlan(s: SimState, city: CityId): Plan & { men: number; ours: number; theirs: number; parts: Array<{ who: string; n: number }>; allies: string[] } {
  const c = cityOf(s.world, city);
  const plan = expeditionPlan(s, city, 'force', 'conquer');
  const side = sideOf(s, c, true);
  // (Integrating slice 34 with 33: in winter most allies keep their men at home, as most rulers do.)
  const winter = seasonOf(s) === WINTER ? ', but in winter most armies stay home' : '';
  const allies = marchers(s, city).map((a) => `${name(a.city)} (${Math.round(MARCH_ODDS[moodOf(cityOf(s.world, a.city), s.tick) >= 60 ? 1 : 0] * 10)} in 10${winter})`);
  const refusal = conquerRefusal(s, city);
  return { refusal, p: plan.odds, word: likelyWord(plan.odds), why: `your ${plan.men} men (strength ${plan.ours}) against ${side.parts.map((p) => `${p.who} ${p.n}`).join(', ')}`, men: plan.men, ours: plan.ours, theirs: side.total, parts: side.parts, allies };
}

/** Allies who might march with you against a city: by road, at peace, not its friends. */
function marchers(s: SimState, city: CityId): Ally[] {
  return s.empire.allies.filter((a) => a.city !== city && routeWay(a.city, 'land') && !warOf(s.world, a.city) && mutual(s.world, a.city, city, s.tick) < FRIENDS);
}

/** What the conquest's defenders count for (expeditions.ts asks, for an expedition with an aim). */
export function conquestDefenders(s: SimState, c: WorldCity): number {
  return Math.max(1, sideOf(s, c, true).total);
}

/** The allies marching with an expedition, as strength (expeditions.ts adds it to yours). */
export function helpersMight(s: SimState, e: Expedition): number {
  const q = s.empire.conquests.find((x) => x.expedition === e.id);
  return q ? Math.round(q.helpers.reduce((a, h) => a + h.men * 1.2, 0)) : 0;
}

/** An expedition with an aim set out (expeditions.ts calls this): the conquest's record, and the allies' answers. */
export function aimSent(s: SimState, e: Expedition): void {
  const c = cityOf(s.world, e.city);
  if (e.aim === 'conquer') {
    const v = vassalOf(s, e.city);
    const q: Conquest = { expedition: e.id, city: e.city, helpers: [], declined: [], theirs: sideOf(s, c, true).parts, crush: !!v };
    // (Integrating slice 34 with 33: an ally whose men would march in winter mostly keeps them home, as slice 33's rulers do; not held against the alliance.)
    const wintered: CityId[] = [];
    if (!v)
      for (const a of marchers(s, e.city)) {
        if (armiesHome(s, s.tick, e.id * 16 + RULED.indexOf(a.city))) {
          wintered.push(a.city);
          continue;
        }
        const o = cityOf(s.world, a.city);
        const odds = MARCH_ODDS[moodOf(o, s.tick) >= 60 ? 1 : 0];
        if (dice(s.world, e.id, RULED.indexOf(a.city), 3) < odds) q.helpers.push({ city: a.city, men: Math.max(4, Math.round(o.army * 0.25)) });
        else {
          q.declined.push(a.city);
          a.declined++;
        }
      }
    s.empire.conquests.push(q);
    if (q.helpers.length) news(s.world, s.tick, e.city, `${q.helpers.map((h) => `${name(h.city)} sends ${h.men} men`).join(' and ')} to march with your army against ${name(e.city)}`);
    if (q.declined.length) news(s.world, s.tick, e.city, `${q.declined.map((x) => name(x)).join(' and ')} would not march with you against ${name(e.city)}: it is remembered on the alliance`);
    if (wintered.length) news(s.world, s.tick, e.city, `${wintered.map((x) => name(x)).join(' and ')} ${wintered.length > 1 ? 'keep their' : 'keeps its'} men at home for the winter, and will not march with you against ${name(e.city)} (not held against the alliance)`);
  }
}

/**
 * At the city, the fight decided (expeditions.ts calls this for an
 * expedition with an aim): a conquest won makes it your vassal, or crushes a
 * vassal's rising; lost, a rising goes ahead. An ally's war joined and won
 * ends it in the ally's favour. The lines it adds to the report.
 */
export function aimFought(s: SimState, e: Expedition): string[] {
  const w = s.world;
  const c = cityOf(w, e.city);
  const lines: string[] = [];
  const q = s.empire.conquests.find((x) => x.expedition === e.id);
  if (q?.helpers.length) lines.push(`${q.helpers.map((h) => `${h.men} men of ${name(h.city)}`).join(' and ')} fought beside them.`);
  if (e.aim === 'conquer') {
    const v = vassalOf(s, e.city);
    if (v) {
      if (e.won) {
        v.loyalty = CRUSHED.loyalty;
        v.arming = 0;
        v.rises = 0;
        remember(s, c, 'crushed', 'you crushed its rising', CRUSHED.amount, CRUSHED.fade);
        lines.push(`${name(e.city)}’s rising is crushed: it stays your vassal, its loyalty set back to ${CRUSHED.loyalty}, and it will not soon forget it.`);
        news(w, s.tick, e.city, `Your army has crushed ${whose(e.city)} rising: it stays your vassal`, true);
      } else {
        lines.push(`${name(e.city)} beat your army: it throws off your rule.`);
        rise(s, v, 'it beat the army you sent against it');
      }
      return lines;
    }
    if (e.won) {
      lines.push(`${name(e.city)} bows to you: your vassal from today, by conquest. Set its tribute on its Empire tab.`);
      take(s, c, 'conquest', `beaten by your army in the field (${e.ours} against ${e.theirs})`);
    } else lines.push(`${name(e.city)} stands: it is no vassal of yours.`);
    return lines;
  }
  if (e.aim === 'war') {
    const call = s.empire.calls.find((x) => x.expedition === e.id);
    const ally = call ? cityOf(w, call.ally) : undefined;
    const war = call ? w.wars.find((x) => x.id === call.war) : undefined;
    if (ally) remember(s, ally, 'marched', `you marched to its aid against ${name(e.city)}`, MARCHED.amount, MARCHED.fade);
    if (e.won && war && war.ended === 0 && ally) {
      war.fate = ally.id;
      war.until = Math.min(war.until, s.tick + 10 * TICKS_PER_DAY);
      lines.push(`Your victory turns the war: ${name(ally.id)} will have the better of ${name(e.city)}, and ${rulerShort(ally)} is grateful (${signed(MARCHED.amount)}).`);
      news(w, s.tick, e.city, `Your army beat ${whose(e.city)} at its gates: the war goes ${whose(ally.id)} way`, true);
    } else if (ally) lines.push(`${rulerShort(ally)} is grateful you came (${signed(MARCHED.amount)}).`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Taking a city, and losing one.

function remember(s: SimState, c: WorldCity, kind: string, why: string, amount: number, fade: number): Memory {
  const m: Memory = { kind, why, amount, tick: s.tick, fade };
  c.memories.push(m);
  settleMood(s, c);
  return m;
}

/** A city bows to you: its lord is you, a record with fair tribute in coin, and a line of news. (Demos call this to stage one.) */
export function take(s: SimState, c: WorldCity, how: Vassal['how'], why: string): Vassal {
  const w = s.world;
  const was = c.lord;
  if (was && was !== 'home') {
    const lord = cityOf(w, was);
    remember(s, lord, 'took', `you took ${name(c.id)} from them`, TAKEN.amount, TAKEN.fade);
    news(w, s.tick, was, `${name(c.id)} was ${whose(was)} vassal: ${rulerShort(lord)} will not forgive you for taking it (${signed(TAKEN.amount)})`);
  }
  c.lord = 'home';
  c.lordSince = s.tick;
  if (how === 'conquest') change(c, s.tick, 'defeat', 'conquered by your city', { pop: c.pop * CONQUERED.pop, army: c.army * CONQUERED.army, wealth: c.wealth * CONQUERED.wealth });
  s.empire.allies = s.empire.allies.filter((a) => a.city !== c.id);
  for (const call of s.empire.calls) if (call.state === 'open' && call.ally === c.id) call.state = 'over';
  const v: Vassal = { city: c.id, since: s.tick, how, good: -1, weight: 1, loyalty: LOYAL_BASE, next: s.tick + FIRST_TRIBUTE, sent: 0, worth: 0, arming: 0, rises: 0 };
  s.empire.vassals.push(v);
  v.loyalty = Math.round(loyaltyOf(s, v).target);
  // Its own routes stay open to you whatever its mood (a vassal never trades against you).
  settleMood(s, c);
  const y = tributeYear(s, v);
  news(w, s.tick, c.id, `${name(c.id)} has bowed to you: ${why}. It is your vassal, and pays you tribute each season (fair, in coin: about ${fmt(y.dr)} dr a year); its first sets out within a month`, true);
  s.rev++;
  return v;
}

/** A vassal rises: no longer yours, a grudge, a rival again. */
function rise(s: SimState, v: Vassal, why: string): void {
  const w = s.world;
  const c = cityOf(w, v.city);
  s.empire.vassals = s.empire.vassals.filter((x) => x !== v);
  c.lord = '';
  c.lordSince = s.tick;
  remember(s, c, 'rose', 'threw off your rule', ROSE.amount, ROSE.fade);
  news(w, s.tick, v.city, `${name(v.city)} has risen and thrown off your rule: ${why}. It pays you nothing now, and remembers your rule bitterly (${signed(ROSE.amount)})`, true);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Loyalty.

export interface Loyalty {
  /** Where it is heading (0 to 100), and the reasons, biggest first. */
  target: number;
  why: Array<{ why: string; n: number }>;
}

/** What a vassal's loyalty adds up to now, reason by reason. */
export function loyaltyOf(s: SimState, v: Vassal): Loyalty {
  const w = s.world;
  const c = cityOf(w, v.city);
  const why: Array<{ why: string; n: number }> = [];
  const add = (n: number, words: string): void => {
    const k = Math.round(n);
    if (k !== 0) why.push({ why: words, n: k });
  };
  add(TRIBUTE_LOYALTY[clamp(v.weight, 0, 2)], `${WEIGHT_WORDS[clamp(v.weight, 0, 2)]} tribute`);
  const how = HOW_LOYALTY[v.how];
  add(how.n * Math.max(0, 1 - (s.tick - v.since) / how.fade), how.why);
  const cowed = COWED[v.how];
  if (cowed) add(cowed.n * Math.max(0, 1 - (s.tick - v.since) / cowed.fade), v.how === 'conquest' ? 'still cowed by its defeat' : 'still in awe of your army');
  add(Math.min(YEARS_MOST, YEAR_LOYALTY * Math.floor((s.tick - v.since) / TICKS_PER_YEAR)), 'years under you');
  const ours = ourMen(s);
  const r = ours / Math.max(1, c.army);
  const might = clamp(ARMY_LEAST + ((r - 1) * (ARMY_MOST - ARMY_LEAST)) / 3, ARMY_LEAST, ARMY_MOST);
  add(might, `${might < 0 ? 'your army too small to fear' : 'your army'}: ${ours} men against its ${Math.round(c.army)}`);
  if (expeditionOut(s) && expeditionOut(s)?.city !== v.city) add(ABROAD, 'your army abroad');
  let gifts = 0;
  let rest = 0;
  for (const m of c.memories) {
    const n = memoryWorth(m, s.tick);
    if (m.kind === 'gift') gifts += n;
    else if (m.kind !== 'forcedfree' && m.kind !== 'raidedfree' && m.kind !== 'crushed') rest += n;
  }
  add(clamp(gifts * GIFT_SHARE, 0, GIFT_MOST), 'your gifts');
  add(clamp(rest * MOOD_SHARE, -MOOD_MOST, MOOD_MOST), `${rulerShort(c)}’s feelings otherwise`);
  // Whispers: rivals cold to you and friendly with it.
  let whispers = 0;
  const names: string[] = [];
  for (const o of w.cities) {
    if (!o.ruler || o.id === v.city || boundTo(s, o.id)) continue;
    if (moodOf(o, s.tick) <= COLD && mutual(w, o.id, v.city, s.tick) >= FRIENDS) {
      whispers += WHISPER;
      names.push(name(o.id));
    }
  }
  add(Math.max(WHISPER_MOST, whispers), `whispers from ${names.join(' and ')}`);
  why.sort((a, b) => Math.abs(b.n) - Math.abs(a.n));
  return { target: clamp(LOYAL_BASE + why.reduce((a, x) => a + x.n, 0), 0, 100), why };
}

/** "heavy tribute, your army abroad": the reasons pulling a vassal's loyalty down, worst first. */
export const lowWords = (l: Loyalty, most = 2): string => l.why.filter((x) => x.n < 0).slice(0, most).map((x) => x.why.replace(/: .*/, '')).join(', ');

/** Once a month: each vassal's loyalty moves half the way to its target; under 30 it arms, a season ahead; mended, it stands down; on its day, it rises. */
function monthly(s: SimState): void {
  const w = s.world;
  for (const v of s.empire.vassals.slice()) {
    const c = cityOf(w, v.city);
    const l = loyaltyOf(s, v);
    v.loyalty = Math.round(clamp(v.loyalty + (l.target - v.loyalty) / 2, 0, 100));
    // (Your army marching on it: it waits for the fight.)
    const marched = s.world.expeditions.some((e) => e.city === v.city && e.aim === 'conquer' && e.phase !== 'done' && e.phase !== 'back' && e.phase !== 'homeward');
    if (v.arming) {
      if (v.loyalty >= STAND_DOWN) {
        v.arming = 0;
        v.rises = 0;
        news(w, s.tick, v.city, `${name(v.city)} stands down: its loyalty has mended (${v.loyalty}), and it stays your vassal`, true);
      } else if (s.tick >= v.rises && !marched) {
        if (v.loyalty < ARMING) rise(s, v, `its loyalty was ${v.loyalty} (${lowWords(l)})`);
        else {
          v.arming = 0;
          v.rises = 0;
          news(w, s.tick, v.city, `${name(v.city)} thought better of rising (its loyalty ${v.loyalty}), and stays your vassal`);
        }
      }
    } else if (v.loyalty < ARMING) {
      v.arming = s.tick;
      v.rises = s.tick + WARNING;
      news(w, s.tick, v.city, `${name(v.city)} is arming: loyalty ${v.loyalty} (${lowWords(l)}). It rises about ${dayWords(v.rises)} unless its loyalty mends: lighten its tribute, send a gift, or march`, true);
    }
    void c;
  }
}

// ---------------------------------------------------------------------------
// Tribute.

/** A vassal's tribute sets out from its city: its coin out of its treasury, or its goods out of its stock. */
function sendTribute(s: SimState, v: Vassal): void {
  const w = s.world;
  const c = cityOf(w, v.city);
  const by = routeWay(v.city, 'land') ? 'land' : 'sea';
  const y = tributeYear(s, v);
  let dr = Math.round(y.dr / 4);
  let amount: number;
  let short = '';
  if (v.good < 0) {
    if (c.wealth < dr) {
      short = ` (all it could: its treasury is nearly empty)`;
      dr = Math.max(0, Math.floor(c.wealth * 0.5));
    }
    amount = dr;
    if (dr > 0) change(c, s.tick, 'tribute', 'tribute to your city', { wealth: -dr });
  } else {
    amount = Math.round(y.amount / 4 / 10) * 10;
    const have = Math.max(0, Math.floor(c.stock[v.good] * 0.5 / 10) * 10);
    if (have < amount) {
      short = ` (all it could spare: its stores are low)`;
      amount = have;
    }
    c.stock[v.good] = Math.max(0, c.stock[v.good] - amount);
    dr = Math.round((amount * c.price[v.good]) / 100);
  }
  v.next = s.tick + SEASON;
  if (amount <= 0) {
    news(w, s.tick, v.city, `${name(v.city)} sends no tribute this season: it has nothing to send${v.good < 0 ? '' : ` of ${WARE_NAMES[TRADE_GOODS[v.good]]}`}`);
    return;
  }
  const { id: way } = wayFor(v.city, by);
  // (Integrating slice 34 with 33: a tribute ship due in winter is held back by the storms, as the trading ships are; caravans keep their pace.)
  const voyage = by === 'land' ? landTicks(v.city) : voyageTicks(v.city);
  const ship = `${v.city}-tribute`;
  const late = by === 'sea' ? stormDelay(s, ship, s.tick + voyage) : 0;
  const t: Tribute = { id: s.empire.nextId++, city: v.city, good: v.good, amount, worth: dr, by, way, phase: 'road', start: s.tick, dur: voyage + late, ship: null, put: 0, lost: 0, store: 0, how: '', ended: 0 };
  s.empire.tribute.push(t);
  news(w, s.tick, v.city, `${whose(v.city)} tribute is on its way: ${tributeWords(t)}${short}, ${by === 'land' ? `by road: at the edge of your land about ${dayWords(s.tick + t.dur)}, then its donkeys walk it to your stores` : `by sea: in your bay about ${dayWords(s.tick + t.dur + SAIL_IN)}${late ? lateWords(s, ship) : ''}`}`);
}

/** "640 jars of oil", "360 dr". */
export const tributeWords = (t: Pick<Tribute, 'good' | 'amount'>): string => (t.good < 0 ? `${fmt(t.amount)} dr` : `${fmt(t.amount)} ${WARE_NAMES[TRADE_GOODS[t.good]]}`);

/** Where a tribute is taken: for coin, the tax office (or a store); for goods, the store of its kind with the most room, that a road reaches. */
function storesFor(s: SimState, t: Tribute): Building[] {
  if (t.good < 0) {
    const offices = s.buildings.filter((b) => b.kind === 'taxoffice');
    return offices.length ? offices : s.buildings.filter((b) => b.kind === 'storehouse' || b.kind === 'granary');
  }
  const ware = TRADE_GOODS[t.good] as Ware;
  return s.buildings.filter((b) => b.kind === storeKind(ware) && roomFor(b, ware) > 0).sort((a, b) => roomFor(b, ware) - roomFor(a, ware) || a.id - b.id);
}

/** At your edge (by land) or anchored (by sea): its donkeys come in to a store; with no way in, it is unloaded straight into the stores. */
function tributeIn(s: SimState, map: CoastMap, t: Tribute, from?: Building): void {
  const donkeys = clamp(Math.ceil(t.worth / 150), 2, 6);
  for (const b of storesFor(s, t).slice(0, 4)) {
    if (tributeCaravan(s, map, t.id, t.city, donkeys, b, from)) {
      t.phase = 'city';
      t.store = b.id;
      s.rev++;
      return;
    }
  }
  unload(s, t, undefined, from ? 'carried straight to the stores from the jetty' : 'unloaded at the edge of your land (no road from it reaches a store)');
}

/**
 * The tribute arrives (routes.ts calls this when its donkeys reach the store,
 * or tributeIn with no way in): coin into the treasury, goods into the store
 * and the next of its kind (what nothing has room for is lost, and named).
 */
export function unload(s: SimState, t: Tribute, at: Building | undefined, how: string): void {
  if (t.phase === 'done') return;
  const w = s.world;
  const v = vassalOf(s, t.city);
  if (t.good < 0) {
    income(s, t.amount, 'vassals', name(t.city));
    t.put = t.amount;
  } else {
    const ware = TRADE_GOODS[t.good] as Ware;
    let left = t.amount;
    const order = [...(at ? [at] : []), ...s.buildings.filter((b) => b !== at && b.kind === storeKind(ware))];
    for (const b of order) {
      if (left <= 0) break;
      const r = Math.min(left, roomFor(b, ware));
      if (r <= 0) continue;
      setHeld(b, ware, held(b, ware) + r);
      left -= r;
    }
    t.put = t.amount - left;
    t.lost = left;
    if (t.put > 0) note(s, ware, 'bought', t.colony ? `colony:${t.colony}` : `vassal:${t.city}`, t.put);
    s.looks++;
  }
  t.how = how;
  t.phase = 'done';
  t.ended = s.tick;
  if (t.ship && t.ship.phase !== SHIP_LEAVING) {
    t.ship.phase = SHIP_LEAVING;
    t.ship.turned = t.ship.stop;
    t.ship.since = s.tick;
  }
  if (v) {
    v.sent++;
    v.worth += t.worth;
  }
  const lost = t.lost > 0 ? `; no room for the other ${fmt(t.lost)}, lost` : '';
  // Slice 37: a colony's shipment.
  const col = t.colony ? s.empire.colonies.find((c) => c.site === t.colony) : undefined;
  if (col) {
    col.sent++;
    col.worth += t.worth;
  }
  if (t.colony) news(w, s.tick, `site:${t.colony}`, `${col?.name ?? `Your colony on ${siteOf(t.colony)?.name ?? t.colony}`}’s share is in: ${fmt(t.put)} ${WARE_NAMES[TRADE_GOODS[t.good]]} ${how}${lost}`);
  else news(w, s.tick, t.city, `${whose(t.city)} tribute is in: ${t.good < 0 ? `${fmt(t.put)} dr into the treasury` : `${fmt(t.put)} ${WARE_NAMES[TRADE_GOODS[t.good]]} ${how}`}${lost}`);
  s.rev++;
}

/** A tribute ship's way into the bay: for the trading post's berth, anchoring short of it. */
function sailIn(s: SimState, map: CoastMap, t: Tribute): boolean {
  const post = tradingPost(s);
  const berth = post ? berthOf(map, post) : null;
  if (!post || !berth) return false;
  const path = shipRoute(map, berth);
  if (path.length < 4) return false;
  t.ship = { phase: SHIP_COMING, since: s.tick, turned: 1, path, post: post.id, stop: 0.82, aside: 0 };
  t.phase = 'bay';
  t.start = s.tick;
  t.dur = SAIL_IN;
  t.store = post.id;
  s.rev++;
  return true;
}

/** Each tick, the tribute on its way: on the road to your edge, a ship sailing in, anchored while its cargo comes ashore, sailing off. */
function stepTribute(s: SimState, map: CoastMap): void {
  for (const t of s.empire.tribute) {
    if (t.phase === 'road' && s.tick >= t.start + t.dur) {
      if (t.by === 'land') tributeIn(s, map, t);
      else if (!sailIn(s, map, t)) unload(s, t, undefined, 'landed on the beach and carried straight to the stores (you have no trading post)');
    } else if (t.phase === 'bay' && t.ship && t.ship.phase === SHIP_COMING && s.tick >= t.start + t.dur) {
      t.ship.phase = SHIP_ANCHORED;
      t.ship.since = s.tick;
      const post = findBuilding(s, t.ship.post);
      if (post) tributeIn(s, map, t, post);
      else unload(s, t, undefined, 'landed on the beach and carried straight to the stores (the trading post is gone)');
    }
    // (Her cargo ashore: she rides at anchor a little, then sails off.)
    if (t.ship && t.ship.phase === SHIP_ANCHORED && t.phase === 'city' && s.tick - t.ship.since >= ASHORE) {
      t.ship.phase = SHIP_LEAVING;
      t.ship.turned = t.ship.stop;
      t.ship.since = s.tick;
    }
    if (t.ship && t.ship.phase === SHIP_LEAVING && s.tick >= t.ship.since + leaveTicks(t.ship)) t.ship = null;
  }
}

/** Where a tribute ship is in your bay at a tick (null: none, or gone). */
export const tributeShipAt = (t: Tribute, tick: number): ReturnType<typeof visitorAt> => (t.ship ? visitorAt(t.ship, tick) : null);

/** Where a tribute is on the map of Greece at a tick: along its way from your city (null once it is in your city). */
export function tributeOnMap(t: Tribute, tick: number): { along: number } | null {
  if (t.phase === 'bay' && t.ship) {
    const at = visitorAt(t.ship, tick);
    return at ? { along: HORIZON_ALONG * (1 - at.inward) } : null;
  }
  if (t.phase !== 'road') return null;
  // (Slice 37: a colony's ship comes in along the colony's lane.)
  const { L } = t.colony ? { L: lineLength(wayPoints(wayOf(t.way))) } : wayFor(t.city, t.by);
  const u = clamp((tick - t.start) / Math.max(1, t.dur), 0, 1);
  const end = t.by === 'land' ? EDGE_ALONG : HORIZON_ALONG;
  return { along: L + (end - L) * u };
}

// ---------------------------------------------------------------------------
// Aid against raiders.

/** What a vassal or ally would send against raiders: a quarter of its army or so, 8 to 16 men; none with no road to you. */
export function aidMen(s: SimState, city: CityId): number {
  if (!routeWay(city, 'land')) return 0;
  return clamp(Math.round(cityOf(s.world, city).army * AID_SHARE), AID_LEAST, COMPANY_SIZE);
}

/** A band against your city gathering or marching: each vassal and ally with a road sends a company, once. */
function sendAid(s: SimState): void {
  const w = s.world;
  for (const r of w.raids) {
    if (r.ended > 0 || (r.phase !== 'gathering' && r.phase !== 'marching' && r.phase !== 'raiding')) continue;
    for (const id of [...s.empire.vassals.map((v) => v.city), ...s.empire.allies.map((a) => a.city)]) {
      if (id === r.city || s.empire.aid.some((a) => a.raid === r.id && a.city === id)) continue;
      const v = vassalOf(s, id);
      if (v?.arming) continue;
      const c = cityOf(w, id);
      if (warOf(w, id)) continue;
      const men = aidMen(s, id);
      if (!men) continue;
      const { id: way } = wayFor(id, 'land');
      s.empire.aid.push({ id: s.empire.nextId++, city: id, raid: r.id, men, way, phase: 'road', start: s.tick, dur: landTicks(id), company: 0, line: '' });
      news(w, s.tick, id, `${rulerShort(c)} sends ${men} men down the road to help you against ${whose(r.city)} ${r.loan ? 'army' : 'raiders'}: at the ${routeWay(id, 'land')?.side} edge of your land about ${dayWords(s.tick + landTicks(id))}`, true);
    }
  }
}

/** Where the raiders are making for, to stand by: their target, or where a band from their side would make for. */
function aidGoal(s: SimState, map: CoastMap, r: Raid): Building | undefined {
  const b = r.target ? findBuilding(s, r.target) : undefined;
  if (b && b.kind !== 'rubble') return b;
  if (r.by === 'land') return landing(s, map, r.city)?.target;
  return s.buildings.find((x) => x.kind === 'taxoffice') ?? s.buildings.find((x) => x.kind === 'storehouse' || x.kind === 'granary');
}

/** An aid company at your edge: it walks in by its road's side to stand by what the raiders make for (a company of your army in all but pay). */
function aidArrives(s: SimState, map: CoastMap, a: Aid, r: Raid): boolean {
  const n = map.size;
  const goal = aidGoal(s, map, r);
  if (!goal) return false;
  let side = routeWay(a.city, 'land')?.side ?? 'north';
  const [gx, gz] = centreOf(goal);
  const ring = around(n, goal).filter((t) => walkable(map, s, t));
  if (!ring.length) return false;
  // Slice 37 (the finding of slice 34: it came in over the fields by its city's side of the map): in by the road edge its
  // city's caravans use, and along the road to stand by what the raiders make for; over the fields only with no road in.
  let tiles: number[] | null = null;
  const entry = caravanEntry(s, n, goal, a.city);
  if (entry && entry.tiles.length) {
    const last = entry.tiles[entry.tiles.length - 1];
    const hold = ring.slice().sort((p, q) => dhypot((p % n) - (last % n), Math.floor(p / n) - Math.floor(last / n)) - dhypot((q % n) - (last % n), Math.floor(q / n) - Math.floor(last / n)) || p - q)[0];
    tiles = [...entry.tiles, hold];
    const e = entry.tiles[0];
    side = e % n === 0 ? 'west' : e % n === n - 1 ? 'east' : e < n ? 'north' : 'south';
  } else {
    const edges: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = side === 'north' ? i : side === 'south' ? (n - 1) * n + i : side === 'west' ? i * n : i * n + n - 1;
      if (walkable(map, s, t)) edges.push(t);
    }
    if (!edges.length) return false;
    // (The side of it towards where they come in from.)
    ring.sort((p, q) => dhypot((p % n) - (edges[0] % n), Math.floor(p / n) - Math.floor(edges[0] / n)) - dhypot((q % n) - (edges[0] % n), Math.floor(q / n) - Math.floor(edges[0] / n)) || p - q);
    tiles = offRoadPath(map, s, edges, ring[0]);
  }
  if (!tiles || !tiles.length) return false;
  // (Slice 37: numbered among its own city's companies, so yours don't skip a number.)
  const used = new Set(s.army.companies.filter((c) => c.ally === a.city).map((c) => c.n));
  let num = 1;
  while (used.has(num)) num++;
  const hold = tiles[tiles.length - 1];
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
    face: datan2(gz - hz, gx - hx),
    path: [],
    along: 0,
    target: hold,
    want: a.men,
    raised: s.tick,
    owed: 0,
    why: '',
    hired: '',
    strong: 0,
    routed: false,
    away: 0,
    ally: a.city,
  };
  // (Facing the way the raiders come: back towards the edge.)
  c.face = datan2(Math.floor(tiles[0] / n) + 0.5 - hz, (tiles[0] % n) + 0.5 - hx);
  s.army.companies.push(c);
  const way: number[] = [];
  // (On the road, it keeps to the road: Slice 37.)
  const onRoad = !!entry && entry.tiles.length > 0;
  for (const [px, pz] of prunePath(map, s, tiles, onRoad ? (_m, st, t) => st.tiles[t] === TILE_ROAD : walkable)) way.push(px, pz);
  const [ox, oz] = offMapPoint(n, tiles[0]);
  const dx = ox - way[0];
  const dz = oz - way[1];
  const d = dhypot(dx, dz) || 1;
  const from = PLACES[a.city];
  for (let slot = 0; slot < a.men; slot++) {
    const back = 0.45 * Math.floor(slot / 2);
    const sideOff = (slot % 2 === 0 ? -1 : 1) * 0.17;
    const sx0 = ox + (dx / d) * back - (dz / d) * sideOff;
    const sz0 = oz + (dz / d) * back + (dx / d) * sideOff;
    const id = s.army.nextId++;
    const nm = MEN[Math.floor(hash2(id, 1, 3401) * MEN.length)];
    const father = MEN[Math.floor(hash2(id, 2, 3401) * MEN.length)];
    const [px, pz] = slotAt('hoplite', slot, hx, hz, c.face);
    s.army.soldiers.push({ id, company: c.id, slot, home: 0, name: nm, father: father === nm ? MEN[(MEN.indexOf(nm) + 7) % MEN.length] : father, kin: 'son', house: from?.name ?? a.city, state: 'coming', x: sx0, z: sz0, face: datan2(-dz, -dx), path: [sx0, sz0, ox, oz, ...way, px, pz], seg: 1, walked: 0, armed: true, hp: 100, foe: 0, cool: 0, swung: 0, fell: 0 });
  }
  a.company = c.id;
  a.phase = 'city';
  a.line = `${a.men} men of ${name(a.city)} came in by the ${side} edge to stand by ${goal.kind === 'taxoffice' ? 'the tax office' : `the ${goal.kind}`}`;
  news(s.world, s.tick, a.city, `${a.men} men of ${name(a.city)} are in at the ${side} edge of your land, marching to stand by ${goal.kind === 'taxoffice' ? 'the tax office' : `the ${goal.kind}`} against ${whose(r.city)} ${r.loan ? 'army' : 'raiders'}`, true);
  s.rev++;
  return true;
}

/** Each tick: aid on its road reaches your edge; aid in your city goes home once the raid is over (or it breaks); aid going home gets there. */
function stepAid(s: SimState, map: CoastMap): void {
  for (const a of s.empire.aid) {
    const r = s.world.raids.find((x) => x.id === a.raid);
    if (a.phase === 'road' && s.tick >= a.start + a.dur) {
      if (!r || r.ended > 0 || !aidArrives(s, map, a, r)) {
        a.line = a.line || (r && r.ended === 0 ? `${a.men} men of ${name(a.city)} found no way to the raiders, and turned home` : `${a.men} men of ${name(a.city)} came too late: the raiders had gone`);
        homeward(s, a);
      }
    } else if (a.phase === 'city') {
      const c = companyOf(s, a.company);
      const over = !r || r.ended > 0;
      if (!c || over || c.routed) {
        if (c) {
          const lost = a.men - s.army.soldiers.filter((x) => x.company === c.id && x.state !== 'fallen').length;
          a.line += lost > 0 ? `; ${lost} of them fell` : '';
          if (c.routed && !over) a.line += '; they broke and went home';
          dismiss(s, map, c.id);
        }
        homeward(s, a);
      }
    } else if (a.phase === 'home' && s.tick >= a.start + a.dur) a.phase = 'done';
  }
}

function homeward(s: SimState, a: Aid): void {
  a.phase = 'home';
  a.start = s.tick;
  a.dur = landTicks(a.city);
  s.rev++;
}

/** Where an aid company is on the map of Greece at a tick (null while in your city or done). */
export function aidOnMap(a: Aid, tick: number): { along: number; homeward: boolean } | null {
  if (a.phase !== 'road' && a.phase !== 'home') return null;
  const { L } = wayFor(a.city, 'land');
  const u = clamp((tick - a.start) / Math.max(1, a.dur), 0, 1);
  return a.phase === 'road' ? { along: L + (EDGE_ALONG - L) * u, homeward: false } : { along: EDGE_ALONG + (L - EDGE_ALONG) * u, homeward: true };
}

// ---------------------------------------------------------------------------
// Allies' calls to war.

/** Each day: an ally gone to war asks you to join (once a war); a call past its day lapses; a call whose war ended is over; alliances that have soured end. */
function stepCalls(s: SimState): void {
  const w = s.world;
  for (const a of s.empire.allies.slice()) {
    const c = cityOf(w, a.city);
    if (moodOf(c, s.tick) <= COLD) {
      endAlliance(s, a, `${rulerShort(c)} has turned cold towards you`);
      continue;
    }
    // (Review of slice 34: an ally made to bow to a rival makes no alliances of its own.)
    if (c.lord && c.lord !== 'home') {
      endAlliance(s, a, `${name(a.city)} has bowed to ${name(c.lord)}, and makes no alliances of its own now`);
      continue;
    }
    const x = warOf(w, a.city);
    if (x && !s.empire.calls.some((k) => k.war === x.id && k.ally === a.city)) {
      const foe = foeIn(x, a.city);
      const call: WarCall = { id: s.empire.nextId++, ally: a.city, foe, war: x.id, at: s.tick, due: s.tick + CALL_DAYS, state: 'open', expedition: 0 };
      s.empire.calls.push(call);
      news(w, s.tick, a.city, `${rulerName(c)} is at war with ${name(foe)}, and asks you as an ally to join: send your army against ${name(foe)} ${`by ${dayWords(call.due)}`}, or refuse (it will be remembered)`, true);
    }
  }
  for (const call of s.empire.calls) {
    if (call.state !== 'open') continue;
    const x = w.wars.find((y) => y.id === call.war);
    if (!x || x.ended > 0) call.state = 'over';
    else if (s.tick >= call.due) refuse(s, call, true);
  }
}

/** You refuse an ally's call (or let it lapse): remembered; two within three years end the alliance. */
function refuse(s: SimState, call: WarCall, lapsed: boolean): void {
  const a = allyOf(s, call.ally);
  const c = cityOf(s.world, call.ally);
  call.state = lapsed ? 'lapsed' : 'refused';
  remember(s, c, 'callrefused', `you would not join its war with ${name(call.foe)}`, CALL_REFUSED.amount, CALL_REFUSED.fade);
  news(s.world, s.tick, call.ally, `${lapsed ? `You never answered ${whose(call.ally)} call` : `You refused ${whose(call.ally)} call`} to join its war with ${name(call.foe)}: ${rulerShort(c)} remembers it (${signed(CALL_REFUSED.amount)})`);
  if (!a) return;
  a.refused.push(s.tick);
  a.refused = a.refused.filter((t) => s.tick - t < REFUSALS_FOR);
  if (a.refused.length >= REFUSALS_MOST) endAlliance(s, a, 'you have refused its calls to war twice');
}

function endAlliance(s: SimState, a: Ally, why: string): void {
  s.empire.allies = s.empire.allies.filter((x) => x !== a);
  for (const call of s.empire.calls) if (call.state === 'open' && call.ally === a.city) call.state = 'over';
  news(s.world, s.tick, a.city, `Your alliance with ${name(a.city)} is over: ${why}`, true);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Heralds.

function sendHerald(s: SimState, city: CityId, kind: Herald['kind'], plan: Plan, loan = 0): Herald {
  const by = routeWay(city, 'land') ? 'land' : 'sea';
  const due = s.tick + clamp(Math.round((2 * heraldTicks(city, by)) / TICKS_PER_DAY) * TICKS_PER_DAY, ANSWER_LEAST, ANSWER_MOST);
  const h: Herald = { id: s.empire.nextId++, city, kind, loan, at: s.tick, due, odds: plan.p, why: plan.why, answer: '', line: '' };
  s.empire.heralds.push(h);
  if (!s.world.contact) s.world.contact = Math.max(1, s.tick);
  const what = kind === 'submit' ? `to demand that ${name(city)} submit to you` : kind === 'debt' ? `to offer ${name(city)} its debt for its loyalty` : `to offer ${name(city)} an alliance`;
  news(s.world, s.tick, city, `Your herald sets out ${what}: ${plan.word} (${plan.why}). The answer comes about ${dayWords(due)}`);
  s.rev++;
  return h;
}

/** A herald's day: the answer, as the dice and the odds when he set out say. */
function answer(s: SimState, map: CoastMap, h: Herald): void {
  const w = s.world;
  const c = cityOf(w, h.city);
  const roll = dice(w, h.id, 0, 7);
  const yes = roll < h.odds;
  if (h.kind === 'alliance') {
    if (yes && !c.lord && !boundTo(s, h.city)) {
      h.answer = 'yes';
      s.empire.allies.push({ city: h.city, since: s.tick, refused: [], declined: 0 });
      h.line = `${rulerShort(c)} accepts: ${name(h.city)} is your ally. It sends men when you are raided, and may ask you to join its wars`;
    } else {
      h.answer = 'no';
      h.line = `${rulerShort(c)} declines your alliance, politely: not now`;
    }
  } else if (h.kind === 'debt') {
    const l = h.loan ? loanOf(w, h.loan) : undefined;
    if (yes && l && l.state === 'overdue' && !c.lord) {
      h.answer = 'yes';
      const owed = l.owed;
      endLoan(s, l, 'forgiven');
      l.why = 'let go for its loyalty: it bowed to you';
      take(s, c, 'debt', `its debt of ${fmt(owed)} dr let go for its loyalty`);
      h.line = `${rulerShort(c)} accepts: the ${fmt(owed)} dr is let go, and ${name(h.city)} is your vassal`;
    } else {
      h.answer = 'no';
      remember(s, c, 'debtoffer', 'you asked its loyalty for its debt', DEBT_REFUSED.amount, DEBT_REFUSED.fade);
      h.line = `${rulerShort(c)} refuses: ${name(h.city)} will owe you money, not obedience. The debt stands`;
    }
  } else {
    const friends = friendsOf(s, h.city);
    if (yes && !c.lord) {
      h.answer = 'yes';
      take(s, c, 'awe', `it would not face your army (${h.why.split(';')[0].replace(/, [\d.]+ times its side \(\d+ in 100\)$/, '')})`);
      h.line = `${rulerShort(c)} bows: ${name(h.city)} is your vassal`;
    } else if (yes && c.lord && c.lord !== 'home') {
      h.answer = 'yes';
      take(s, c, 'awe', `it would not face your army, and leaves ${whose(c.lord)} rule for yours`);
      h.line = `${rulerShort(c)} bows: ${name(h.city)} is your vassal`;
    } else if (friends.length && dice(w, h.id, 1, 8) < 0.5) {
      h.answer = 'friends';
      remember(s, c, 'demanded', 'you demanded that it submit', DEMANDED.amount, DEMANDED.fade);
      for (const f of friends) remember(s, f, 'friendthreat', `you demanded that its friend ${name(h.city)} submit`, FRIEND_ILL.amount, FRIEND_ILL.fade);
      // (A cold, proud or warlike friend may threaten you for it.)
      const angry = friends.find((f) => moodOf(f, s.tick) <= COLD && (f.ruler?.traits.includes('proud') || f.ruler?.traits.includes('warlike')) && mayThreaten(s, f.id));
      if (angry) threaten(s, map, angry, `you demanded that ${name(h.city)}, ${his(angry)} friend, submit to you`);
      h.line = `${rulerShort(c)} refuses, and calls on ${friends.map((f) => name(f.id)).join(' and ')}: they take it ill (${signed(FRIEND_ILL.amount)})${angry ? `, and ${name(angry.id)} threatens you` : ''}`;
    } else {
      h.answer = 'no';
      remember(s, c, 'demanded', 'you demanded that it submit', DEMANDED.amount, DEMANDED.fade);
      h.line = `${rulerShort(c)} refuses to submit, and will remember the demand (${signed(DEMANDED.amount)})`;
    }
  }
  news(w, s.tick, h.city, `Your herald is back from ${name(h.city)}: ${h.line}`, true);
  s.rev++;
}

const his = (c: WorldCity): string => (c.ruler?.female ? 'her' : 'his');

// ---------------------------------------------------------------------------
// Each tick.

/** The empire's tick: tribute and aid on their way; daily heralds' answers, calls and aid sent; monthly loyalty and tribute setting out. Nothing with nothing in it. */
export function stepEmpire(s: SimState, map: CoastMap): void {
  const e = s.empire;
  if (!e.vassals.length && !e.allies.length && !e.heralds.length && !e.tribute.length && !e.aid.length && !e.calls.length) return;
  if (e.tribute.length) stepTribute(s, map);
  if (e.aid.length) stepAid(s, map);
  if (s.tick % TICKS_PER_DAY !== 0) return;
  for (const h of e.heralds) if (h.answer === '' && s.tick >= h.due) answer(s, map, h);
  if (e.vassals.length || e.allies.length) sendAid(s);
  if (e.allies.length || e.calls.length) stepCalls(s);
  for (const v of e.vassals) if (s.tick >= v.next && !e.tribute.some((t) => t.city === v.city && t.phase !== 'done')) sendTribute(s, v);
  if (s.tick % TICKS_PER_MONTH === 0) {
    if (e.vassals.length) monthly(s);
    // What is over is let go after a year.
    const old = (t: number): boolean => t > 0 && s.tick - t > KEEP;
    e.tribute = e.tribute.filter((t) => !(t.phase === 'done' && !t.ship && old(t.ended)));
    e.aid = e.aid.filter((a) => !(a.phase === 'done' && old(a.start)));
    e.heralds = e.heralds.filter((h) => !(h.answer !== '' && old(h.due)));
    e.calls = e.calls.filter((c) => !(c.state !== 'open' && old(c.due)));
    e.conquests = e.conquests.filter((q) => s.world.expeditions.some((x) => x.id === q.expedition));
  }
}

// ---------------------------------------------------------------------------
// Your acts (the `empire` command).

/** Why an act can't be done now ('' if it can). */
export function empireRefusal(s: SimState, act: string, city: string, good?: number, weight?: number, call?: number): string {
  if (act === 'join' || act === 'refuse') {
    const k = s.empire.calls.find((x) => x.id === call);
    if (!k || k.state !== 'open') return 'No call waits on you';
    return act === 'join' ? expeditionRefusal(s, k.foe, 'force', 'war') : '';
  }
  if (!RULED.includes(city as CityId)) return 'There is no ruler there';
  const id = city as CityId;
  if (act === 'tribute') {
    const v = vassalOf(s, id);
    if (!v) return `${name(id)} is not your vassal`;
    if (!Number.isInteger(weight) || (weight as number) < 0 || (weight as number) > 2) return 'Light, fair or heavy';
    if (!Number.isInteger(good) || ((good as number) !== -1 && !tributeGoods(cityOf(s.world, id)).includes(good as number))) return `${name(id)} pays in coin or in a good it sells`;
    return '';
  }
  if (act === 'submit') return submitPlan(s, id).refusal;
  if (act === 'debt') return debtPlan(s, id).refusal;
  if (act === 'ally') return allyPlan(s, id).refusal;
  if (act === 'unally') return allyOf(s, id) ? '' : `${name(id)} is not your ally`;
  if (act === 'conquer') return conquerRefusal(s, id);
  return 'Not an act';
}

/** Do an act (empireRefusal said yes). */
export function empireCommand(s: SimState, map: CoastMap, c: Extract<Command, { type: 'empire' }>): void {
  const city = String(c.city ?? '');
  if (empireRefusal(s, c.act, city, c.good, c.weight, c.call) !== '') return;
  const id = city as CityId;
  switch (c.act) {
    case 'tribute': {
      const v = vassalOf(s, id) as Vassal;
      if (v.good === c.good && v.weight === c.weight) return;
      const lighter = (c.weight as number) < v.weight;
      v.good = c.good as number;
      v.weight = c.weight as number;
      const y = tributeYear(s, v);
      news(s.world, s.tick, id, `You set ${whose(id)} tribute ${WEIGHT_WORDS[v.weight]}, in ${v.good < 0 ? 'coin' : WARE_NAMES[TRADE_GOODS[v.good]]}: about ${v.good < 0 ? `${fmt(y.dr)} dr` : `${fmt(y.amount)} ${WARE_NAMES[TRADE_GOODS[v.good]]} (${fmt(y.dr)} dr)`} a year${lighter ? '. Its loyalty will mend over the next months' : ''}`);
      s.rev++;
      return;
    }
    case 'submit':
      sendHerald(s, id, 'submit', submitPlan(s, id));
      return;
    case 'debt': {
      const p = debtPlan(s, id);
      sendHerald(s, id, 'debt', p, p.loan?.id ?? 0);
      return;
    }
    case 'ally':
      sendHerald(s, id, 'alliance', allyPlan(s, id));
      return;
    case 'unally': {
      const a = allyOf(s, id) as Ally;
      remember(s, cityOf(s.world, id), 'unallied', 'you ended your alliance', UNALLIED.amount, UNALLIED.fade);
      endAlliance(s, a, `you ended it (${signed(UNALLIED.amount)} with ${rulerShort(cityOf(s.world, id))})`);
      return;
    }
    case 'conquer':
      sendExpedition(s, map, id, 'force', 'conquer');
      return;
    case 'join': {
      const k = s.empire.calls.find((x) => x.id === c.call) as WarCall;
      const e = sendExpedition(s, map, k.foe, 'force', 'war');
      if (!e) return;
      k.state = 'joined';
      k.expedition = e.id;
      news(s.world, s.tick, k.ally, `You answer ${whose(k.ally)} call: your army marches against ${name(k.foe)}`);
      return;
    }
    case 'refuse':
      refuse(s, s.empire.calls.find((x) => x.id === c.call) as WarCall, false);
      return;
  }
}

// ---------------------------------------------------------------------------
// In words.

/** "your vassal since 745 BC, by conquest", "your ally since 744 BC", or ''. */
export function boundWords(s: SimState, city: CityId): string {
  const v = vassalOf(s, city);
  if (v) return `your vassal (${v.how === 'conquest' ? 'by conquest' : v.how === 'awe' ? 'by awe' : 'for its debt'}), loyalty ${v.loyalty}${v.arming ? ', arming' : ''}`;
  if (allyOf(s, city)) return 'your ally';
  return '';
}

/** The line under the top bar, if the empire needs you: a vassal arming, an ally's call waiting, aid on its way. */
export function empireTownLine(s: SimState): { text: string; city: CityId; urgent: boolean } | null {
  const arming = s.empire.vassals.filter((v) => v.arming).sort((a, b) => a.rises - b.rises)[0];
  if (arming) {
    const l = loyaltyOf(s, arming);
    return { text: `${name(arming.city)} is arming: loyalty ${arming.loyalty} (${lowWords(l)}). It rises about ${dayWords(arming.rises)} unless its loyalty mends: lighten its tribute, send a gift, or march (its Empire tab).`, city: arming.city, urgent: true };
  }
  const call = openCall(s);
  if (call) return { text: `${name(call.ally)}, your ally, asks you to join its war with ${name(call.foe)}: answer by ${dayWords(call.due)} on its Empire tab.`, city: call.ally, urgent: false };
  const aid = s.empire.aid.find((a) => a.phase === 'road');
  if (aid) return { text: `${aid.men} men of ${name(aid.city)} are coming down the road to help you: at the ${routeWay(aid.city, 'land')?.side} edge of your land about ${dayWords(aid.start + aid.dur)}.`, city: aid.city, urgent: false };
  const t = s.empire.tribute.find((x) => x.phase === 'city' || x.phase === 'bay');
  if (t) return { text: `${t.colony ? `${colonyName(s, t)}’s share` : `${whose(t.city)} tribute`} is ${t.phase === 'bay' ? 'sailing into your bay' : 'coming in to your stores'}: ${tributeWords(t)}.`, city: t.colony ? `site:${t.colony}` : t.city, urgent: false };
  return null;
}

/** For a tribute caravan's hover. */
export function tributeDoing(s: SimState, id: number, back: boolean): { title: string; detail: string } {
  const t = s.empire.tribute.find((x) => x.id === id);
  const city = t?.city ?? 'corinth';
  const to = t ? findBuilding(s, t.store) : undefined;
  // Slice 37: a colony's share.
  if (t?.colony) {
    const nm = colonyName(s, t);
    if (back || t.phase === 'done') return { title: `${nm}’s share`, detail: `Your donkeys, heading back to the quay · they brought ${tributeWords(t)}` };
    return { title: `${nm}’s share`, detail: `Your donkeys bringing ${tributeWords(t)} from the jetty to ${to ? `the ${to.kind}` : 'your stores'} · your colony’s share for the season` };
  }
  if (!t || back || t.phase === 'done') return { title: `${whose(city)} tribute`, detail: `Donkeys of ${name(city)}, heading home along the road${t ? ` · they brought ${tributeWords(t)}` : ''}` };
  return { title: `${whose(city)} tribute`, detail: `Donkeys of ${name(city)} bringing ${tributeWords(t)} to ${to ? (to.kind === 'taxoffice' ? 'the tax office' : `the ${to.kind}`) : 'your stores'} · your vassal’s tribute for the season` };
}

/** Slice 37: the name of the colony a shipment is from. */
const colonyName = (s: SimState, t: Tribute): string => s.empire.colonies.find((c) => c.site === t.colony)?.name ?? `your colony on ${siteOf(t.colony ?? '')?.name ?? t.colony}`;

/** Every vassal and ally in a line each, for the probes and the smoke test. */
export const empireList = (s: SimState): string[] => [...s.empire.vassals.map((v) => `${v.city}: vassal (${v.how}), ${WEIGHT_WORDS[v.weight]} ${v.good < 0 ? 'coin' : WARE_NAMES[TRADE_GOODS[v.good]]}, loyalty ${v.loyalty}${v.arming ? ', arming' : ''}`), ...s.empire.allies.map((a) => `${a.city}: ally`)];

void adjective;
