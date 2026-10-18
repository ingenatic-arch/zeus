/**
 * Greece goes on: what the rulers feel about each other, their feuds and
 * their wars.
 *
 * - **Feelings.** Each ruler's feeling for each other ruler is a number made
 *   of reasons, as their mood towards you is: the old rivalries of the cities
 *   and the ruler's own leaning (`ties`, set when Greece was shuffled), and
 *   what has passed between them since (`bonds`): quarrels and friendships
 *   that come by the dice on the first of a month and fade over a year or
 *   two, bent by the rulers' traits; a war, and how it ended.
 * - **Feuds.** A pair whose feelings average −25 or worse are feuding (news
 *   when it starts, and when they make it up).
 * - **Wars.** From the third year, with no other war on and none in the last
 *   six months, a pair at −40 or worse may go to war (one month in three).
 *   The angrier declares it. Each side's army marches along the way between
 *   them (Troy's fleet sails the lane) to the meeting place and stands there
 *   while the war lasts, a pure function of the tick. Food and fleece grow
 *   dear in both (world.ts: the `strife` push). After a season or two, as the
 *   dice set at the start, it ends in a peace or a defeat, hinted half-way
 *   through by a battle; a defeat leaves the loser's stores emptier still.
 * - **Your part.** A side at war asks your city for help more often
 *   (favours.ts); trading with one side, or sending it anything, cools the
 *   other (here: `tradedWithFoe`, `helpedFoe`).
 *
 * Wars between rivals never come to your city's map, and nothing here
 * touches your city: a town that keeps to itself plays exactly as before.
 * What is random is a hash of Greece's seed and the month or the war's
 * number, never `world.rng` (the harvests draw on it). Pure.
 */
import { lineLength, meetAlong, PLACES, RIVAL_WAYS, rivalPoints, rivalWay, RULED, wayOf, wayPoints, CITY_IDS, HORIZON_ALONG, type CityId, type RivalWay } from '../map/greece';
import { hash2 } from '../map/noise';
import { dateOfTick, formatYear, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news, settleMood } from './diplomacy';
import { STRENGTH } from './favours';
import { LAND_PACE } from './routes';
import type { Bond, Memory, SimState, War, World, WorldCity } from './state';
import { TRADE_GOODS } from './trade';
import { cityOf, memoryWorth, normalStock, OLD_TIES, reprice, rulerName, rulerShort, usualPrice, VOYAGE } from './world';
import { FESTIVALS, nextFestival } from './festivals';

// ---------------------------------------------------------------------------
// The numbers.

/** A feeling in a word: friends at this or better; feuding at this or worse (and making up past MAKE_UP); war possible at WAR_AT or worse (the pair's average). */
export const FRIENDS = 30;
export const FEUD = -25;
export const MAKE_UP = -15;
export const WAR_AT = -35;
/** Quarrels and friendships between a pair: how often (a month in so many, before traits), how big, how long remembered. */
const QUARREL_ODDS = 1 / 18;
const QUARREL_LEAST = 8;
const QUARREL_MOST = 18;
export const QUARREL_FADE = 18 * TICKS_PER_MONTH;
const FRIEND_ODDS = 1 / 16;
const FRIEND_LEAST = 6;
const FRIEND_MOST = 14;
export const FRIEND_FADE = 18 * TICKS_PER_MONTH;
/** No war before the third year of the game (the rulers take the measure of each other first). */
export const WAR_FROM = 2 * TICKS_PER_YEAR;
/** A pair far enough out goes to war about one month in three. */
const WAR_ODDS = 1 / 3;
/** No new war within six months of the last one's end, anywhere in Greece; and none between the same pair within three years. */
export const GREECE_PEACE = 6 * TICKS_PER_MONTH;
export const PAIR_LULL = 3 * TICKS_PER_YEAR;
/** A war lasts a season or two. */
export const WAR_LEAST = 90 * TICKS_PER_DAY;
export const WAR_MOST = 180 * TICKS_PER_DAY;
/** About one war in three ends in a peace with no loser. */
const PEACE_ODDS = 0.35;
/** What being at war is worth to each side's feeling while it lasts, and what is left after (the loser's bitterness, the winner's, a peace). */
export const AT_WAR = -30;
const LOST = { amount: -25, fade: 3 * TICKS_PER_YEAR };
const WON = { amount: -10, fade: 2 * TICKS_PER_YEAR };
const PEACE = { amount: -10, fade: 2 * TICKS_PER_YEAR };
/** A defeat leaves the loser's stores this far below normal at least (a share), by trade good: food and fleece, then oil and wine. */
export const DEFEAT_SHARE: readonly number[] = [0.6, 0.6, 0.6, 0.3, 0.6, 0.3];
/** Armies march a little slower than a caravan. */
const ARMY_SLOWER = 1.2;
/** Each side's army stands this far short of the meeting place, on its own side (table units). */
export const STAND_OFF = 0.8;
/** Trading with one side of a war: what each visit costs with the other, and how far it can go; what sending them anything costs. */
export const FOE_TRADE = -3;
export const FOE_TRADE_MOST = -15;
const FOE_TRADE_FADE = TICKS_PER_YEAR;
export const FOE_HELP = -8;
const FOE_HELP_FADE = 18 * TICKS_PER_MONTH;

/** What quarrels and friendships are about (by the dice). */
const QUARRELS = [
  'a quarrel over the border lands',
  'cattle raided across the border',
  'an insult at the games',
  'a dispute over harbour dues',
  'a marriage between their houses refused',
  'exiles given shelter',
  'a boundary stone moved in the night',
];
const FRIENDSHIPS = ['a marriage between their houses', 'gifts exchanged', 'a treaty of friendship', 'sacrifices together at Delphi', 'guests at each other’s table', 'a dispute settled fairly'];
/** The old rivalries of the cities, in words (the amounts are OLD_TIES in world.ts). */
const HISTORY: Record<string, string> = {
  'athens-sparta': 'old rivals for the leadership of Greece',
  'athens-corinth': 'neighbours across the isthmus, and rivals at sea',
  'athens-troy': 'the Greeks sailed against Troy once',
  'sparta-corinth': 'old friends in the Peloponnese',
  'sparta-troy': 'Helen of Sparta, and the war that followed',
  'corinth-troy': 'the Greeks sailed against Troy once',
};

const name = (id: CityId): string => PLACES[id].name;
/** A line of news of Greece's own doings (festivals, feuds, wars): on the map's list always; under the top bar once your city has dealt with Greece (status.ts), so a town that keeps to itself reads as it did. */
function told(w: World, tick: number, city: CityId, line: string): void {
  news(w, tick, city, line);
  w.news[w.news.length - 1].greece = true;
}
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** A pair's key, in RULED order: 'athens-sparta'. */
export const pairKey = (x: CityId, y: CityId): string => (RULED.indexOf(x) <= RULED.indexOf(y) ? `${x}-${y}` : `${y}-${x}`);
/** Every pair of ruled cities, in RULED order. */
export const PAIRS: ReadonlyArray<readonly [CityId, CityId]> = RULED.flatMap((x, i) => RULED.slice(i + 1).map((y) => [x, y] as const));

/** Greece's dice for a month (or a war) and a pair. */
const dice = (w: World, n: number, i: number, salt: number): number => hash2(n, i * 43 + salt, (w.seed ^ 0x72697661) | 0);

// ---------------------------------------------------------------------------
// Feelings.

/** How one ruler feels about another at a tick: their old feeling and what has passed between them since (whole numbers, so the reasons add up). */
export function tieOf(w: World, from: CityId, to: CityId, tick: number): number {
  const c = cityOf(w, from);
  if (!c.ruler || from === to || !RULED.includes(to)) return 0;
  return c.ties[CITY_IDS.indexOf(to)] + c.bonds.reduce((a, b) => a + (b.city === to ? memoryWorth(b, tick) : 0), 0);
}

/** How a pair feel about each other, on average. */
export const mutual = (w: World, x: CityId, y: CityId, tick: number): number => (tieOf(w, x, y, tick) + tieOf(w, y, x, tick)) / 2;

export type TieWord = 'friends' | 'cordial' | 'cool' | 'feuding' | 'at war';
/** A feeling in a word (at war, whatever the number, while the war is on). */
export function tieWord(n: number, war = false): TieWord {
  if (war) return 'at war';
  if (n >= FRIENDS) return 'friends';
  if (n >= 0) return 'cordial';
  if (n > FEUD) return 'cool';
  return 'feuding';
}

/** The reasons for one ruler's feeling for another, biggest first: the old rivalry of their cities, their own leaning, and what has passed between them. */
export function tieReasons(w: World, from: CityId, to: CityId, tick: number): Array<{ worth: number; why: string; fading: boolean; tick: number }> {
  const c = cityOf(w, from);
  if (!c.ruler) return [];
  const j = CITY_IDS.indexOf(to);
  const old = OLD_TIES[from]?.[j] ?? 0;
  const own = c.ties[j] - old;
  const out: Array<{ worth: number; why: string; fading: boolean; tick: number }> = [];
  if (old !== 0) out.push({ worth: old, why: HISTORY[pairKey(from, to)] ?? 'old history between the cities', fading: false, tick: 0 });
  if (own !== 0) out.push({ worth: own, why: own > 0 ? `${rulerShort(c)} has a liking of ${c.ruler.female ? 'her' : 'his'} own for ${name(to)}` : `${rulerShort(c)} has never cared for ${name(to)}`, fading: false, tick: 0 });
  for (const b of c.bonds) {
    if (b.city !== to) continue;
    const v = memoryWorth(b, tick);
    if (v !== 0) out.push({ worth: v, why: b.why, fading: b.fade > 0, tick: b.tick });
  }
  return out.sort((a, b) => Math.abs(b.worth) - Math.abs(a.worth));
}

/** How long a ruler remembers what passed with another (a fickle one half as long, a steadfast one half as long again). */
function fadeOf(c: WorldCity, base: number): number {
  const t = c.ruler?.traits ?? [];
  return Math.round(base * (t.includes('fickle') ? 0.5 : 1) * (t.includes('steadfast') ? 1.5 : 1));
}

/** What a quarrel (or a friendship) is worth to a ruler: a proud one takes a quarrel harder, a steadfast one either less. */
function bend(c: WorldCity, amount: number): number {
  const t = c.ruler?.traits ?? [];
  let a = amount;
  if (amount < 0 && t.includes('proud')) a *= 1.3;
  if (t.includes('steadfast')) a *= 0.7;
  return Math.round(a);
}

/** Remember something between two rulers, each their own way. */
function bond(w: World, x: CityId, y: CityId, kind: string, why: (other: CityId) => string, amount: number, tick: number, fade: number): void {
  for (const [a, b] of [
    [x, y],
    [y, x],
  ] as const) {
    const c = cityOf(w, a);
    c.bonds.push({ kind, city: b, why: why(b), amount: bend(c, amount), tick, fade: fade > 0 ? fadeOf(c, fade) : 0 });
  }
}

// ---------------------------------------------------------------------------
// Each day: the wars' turns; each month: quarrels, friendships, feuds and new wars.

/** A war on now between a city and another, or with anyone. */
export const warOf = (w: World, city: CityId): War | undefined => w.wars.find((x) => x.ended === 0 && (x.a === city || x.b === city));
/** The war on now, anywhere in Greece (one at a time). */
export const warOn = (w: World): War | undefined => w.wars.find((x) => x.ended === 0);
/** A war's other side. */
export const foeIn = (x: War, city: CityId): CityId => (x.a === city ? x.b : x.a);

/**
 * Greece's rivals, once a day: a war half-way through has its battle, a war
 * at its end ends. On the first of each month: quarrels and friendships by
 * the dice, feuds begun or made up (news), perhaps a war; wars and bonds long
 * over let go.
 */
export function stepRivals(s: SimState): void {
  if (s.tick % TICKS_PER_DAY !== 0) return;
  const w = s.world;
  festivals(s);
  for (const x of w.wars) {
    if (x.ended) continue;
    if (!x.told && s.tick >= x.start + Math.round((x.until - x.start) / 2)) battle(s, x);
    if (s.tick >= x.until) endWar(s, x);
  }
  if (s.tick % TICKS_PER_MONTH !== 0) return;
  const month = Math.floor(s.tick / TICKS_PER_MONTH);
  PAIRS.forEach(([x, y], i) => passing(s, x, y, month, i));
  feuds(s);
  maybeWar(s, month);
  // Let go of what is long over: bonds faded to nothing, wars ended over three years ago.
  for (const c of w.cities) if (c.bonds.some((b) => b.fade > 0 && s.tick - b.tick >= b.fade)) c.bonds = c.bonds.filter((b) => b.fade <= 0 || s.tick - b.tick < b.fade);
  if (w.wars.some((x) => x.ended > 0 && s.tick - x.ended > PAIR_LULL)) w.wars = w.wars.filter((x) => !(x.ended > 0 && s.tick - x.ended > PAIR_LULL));
}

/** A festival begins (a line of news, with what wine and meat cost there now) or ends; the city's record says when the one on ends. */
function festivals(s: SimState): void {
  const w = s.world;
  for (const f of FESTIVALS) {
    const c = cityOf(w, f.city);
    const n = nextFestival(f.city, s.tick);
    if (!n) continue;
    const on = s.tick >= n.start && s.tick < n.end;
    if (on && c.festival !== n.end) {
      c.festival = n.end;
      const usual = (k: number): number => usualPrice(c, k);
      told(w, s.tick, f.city, `${cap(f.name)} begins in ${name(f.city)}: wine there is ${c.price[5]} a hundred (usually ${usual(5)}) and meat ${c.price[1]} (usually ${usual(1)}). A gift that arrives while it lasts counts for more`);
    } else if (!on && c.festival > 0) {
      c.festival = 0;
    }
  }
}

/** On the first of the month, between a pair not at war: perhaps a quarrel, perhaps a friendship. */
function passing(s: SimState, x: CityId, y: CityId, month: number, i: number): void {
  const w = s.world;
  if (warOf(w, x)?.a === y || warOf(w, x)?.b === y) return;
  const a = cityOf(w, x);
  const b = cityOf(w, y);
  const traits = [...(a.ruler?.traits ?? []), ...(b.ruler?.traits ?? [])];
  const count = (t: string): number => traits.filter((u) => u === t).length;
  const quarrel = QUARREL_ODDS * Math.pow(1.5, count('warlike')) * Math.pow(1.2, count('proud')) * Math.pow(0.7, count('generous')) * Math.pow(1.3, count('fickle'));
  const friend = FRIEND_ODDS * Math.pow(1.5, count('generous')) * Math.pow(0.7, count('warlike')) * Math.pow(1.3, count('fickle'));
  if (dice(w, month, i, 1) < quarrel) {
    const size = QUARREL_LEAST + Math.round(dice(w, month, i, 2) * (QUARREL_MOST - QUARREL_LEAST));
    const what = QUARRELS[Math.floor(dice(w, month, i, 3) * QUARRELS.length)];
    bond(w, x, y, 'quarrel', (o) => `${what} with ${name(o)}`, -size, s.tick, QUARREL_FADE);
  } else if (dice(w, month, i, 4) < friend) {
    const size = FRIEND_LEAST + Math.round(dice(w, month, i, 5) * (FRIEND_MOST - FRIEND_LEAST));
    const what = FRIENDSHIPS[Math.floor(dice(w, month, i, 6) * FRIENDSHIPS.length)];
    bond(w, x, y, 'friendship', (o) => `${what} with ${name(o)}`, size, s.tick, FRIEND_FADE);
  }
}

/** The worst grievance one ruler holds against another now, in words ('' if none). */
function grievance(w: World, from: CityId, to: CityId, tick: number): string {
  const r = tieReasons(w, from, to, tick).filter((x) => x.worth < 0);
  return r[0]?.why ?? '';
}

/** Feuds begun (a pair falling to −25 or worse) and made up (back past −15, at peace): a line of news each. */
function feuds(s: SimState): void {
  const w = s.world;
  for (const [x, y] of PAIRS) {
    const key = pairKey(x, y);
    const m = mutual(w, x, y, s.tick);
    const on = w.feuds.includes(key);
    if (!on && m <= FEUD) {
      w.feuds.push(key);
      const why = grievance(w, x, y, s.tick) || grievance(w, y, x, s.tick);
      told(w, s.tick, x, `${name(x)} and ${name(y)} are feuding${why ? `: ${why.replace(/ with [A-Z][a-z]+$/, '')}` : ''}`);
    } else if (on && m > MAKE_UP && !(warOf(w, x) && foeIn(warOf(w, x) as War, x) === y)) {
      w.feuds = w.feuds.filter((k) => k !== key);
      told(w, s.tick, x, `${name(x)} and ${name(y)} have made up their quarrel`);
    }
  }
}

/** On the first of a month: a pair far enough out may go to war (one war at a time in Greece). */
function maybeWar(s: SimState, month: number): void {
  const w = s.world;
  if (s.tick < WAR_FROM || warOn(w)) return;
  if (w.wars.some((x) => x.ended > 0 && s.tick - x.ended < GREECE_PEACE)) return;
  // The pair furthest out first.
  const pairs = PAIRS.map(([x, y], i) => ({ x, y, i, m: mutual(w, x, y, s.tick) }))
    .filter((p) => p.m <= WAR_AT && !w.wars.some((v) => pairKey(v.a, v.b) === pairKey(p.x, p.y) && s.tick - v.ended < PAIR_LULL))
    .sort((a, b) => a.m - b.m);
  for (const p of pairs) {
    // The angrier declares it (a warlike ruler, if they are as angry as each other).
    const tx = tieOf(w, p.x, p.y, s.tick);
    const ty = tieOf(w, p.y, p.x, s.tick);
    const warlike = (id: CityId): boolean => !!cityOf(w, id).ruler?.traits.includes('warlike');
    const a = tx < ty || (tx === ty && warlike(p.x)) ? p.x : p.y;
    const odds = WAR_ODDS * (warlike(a) ? 1.5 : 1);
    if (dice(w, month, p.i, 11) >= odds) continue;
    declareWar(s, a, foeOf(p, a));
    return;
  }
}
const foeOf = (p: { x: CityId; y: CityId }, a: CityId): CityId => (p.x === a ? p.y : p.x);

/**
 * A ruler goes to war with another: how long it lasts and how it ends, set by
 * the dice now (a peace about one time in three, else the stronger, and the
 * warlike, more likely to win); their armies march; each side remembers being
 * at war; a line of news. (Demos call this to stage a war; `why` names the
 * grievance, or the dice's own.)
 */
export function declareWar(s: SimState, a: CityId, b: CityId, why?: string): War {
  const w = s.world;
  const way = rivalWay(a, b) as RivalWay;
  const n = w.nextWar++;
  const len = WAR_LEAST + Math.round((dice(w, n, 0, 21) * (WAR_MOST - WAR_LEAST)) / TICKS_PER_DAY) * TICKS_PER_DAY;
  const might = (id: CityId): number => (STRENGTH[id] ?? 5000) * (cityOf(w, id).ruler?.traits.includes('warlike') ? 1.25 : 1);
  const fate: War['fate'] = dice(w, n, 0, 22) < PEACE_ODDS ? 'peace' : dice(w, n, 0, 23) * (might(a) + might(b)) < might(a) ? a : b;
  const men = (id: CityId): number => clamp(Math.round(might(id) / 600), 8, 14);
  const cause = why ?? (grievance(w, a, b, s.tick) || 'old enmity').replace(/ with [A-Z][a-z]+$/, '');
  const x: War = { id: n, a, b, why: cause, way: way.id, by: way.kind, start: s.tick, until: s.tick + len, fate, menA: men(a), menB: men(b), told: false, ended: 0 };
  w.wars.push(x);
  cityOf(w, a).war = b;
  cityOf(w, b).war = a;
  bond(w, a, b, 'war', (o) => `at war with ${name(o)}`, AT_WAR, s.tick, 0);
  const key = pairKey(a, b);
  if (!w.feuds.includes(key)) w.feuds.push(key);
  const by = way.kind === 'sea' ? `their fleets sail to meet ${way.place}` : `their armies march to meet at ${way.place}`;
  told(w, s.tick, a, `${rulerName(cityOf(w, a))} has declared war on ${name(b)}: ${cause}. ${cap(by)}; the way between them is closed, and food and fleece will be dear in both`);
  return x;
}

const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;

/** Half-way through: the battle, and who had the better of it (as the war will end). */
function battle(s: SimState, x: War): void {
  const w = s.world;
  x.told = true;
  const way = rivalWay(x.a, x.b) as RivalWay;
  const where = way.kind === 'sea' ? `A sea fight ${way.place}` : `A battle at ${way.place}`;
  const how = x.fate === 'peace' ? 'neither side would give way, and both are weary of it' : `${name(x.fate)} had the better of it, and ${name(foeIn(x, x.fate))} is hard pressed`;
  told(w, s.tick, x.fate === 'peace' ? x.a : x.fate, `${where} between ${name(x.a)} and ${name(x.b)}: ${how}`);
}

/** The war ends as the dice said at its start: a peace, or a defeat (the loser's stores emptier still, the winner's spoils easing its own). */
export function endWar(s: SimState, x: War): void {
  const w = s.world;
  x.ended = s.tick;
  if (!x.told) x.told = true;
  const ca = cityOf(w, x.a);
  const cb = cityOf(w, x.b);
  if (ca.war === x.b) ca.war = '';
  if (cb.war === x.a) cb.war = '';
  // Each forgets being at war, and remembers how it ended.
  for (const c of [ca, cb]) c.bonds = c.bonds.filter((b) => !(b.kind === 'war' && b.fade === 0 && (b.city === x.a || b.city === x.b)));
  if (x.fate === 'peace') {
    bond(w, x.a, x.b, 'peace', (o) => `the war with ${name(o)}, ended in a weary peace`, PEACE.amount, s.tick, PEACE.fade);
    told(w, s.tick, x.a, `${name(x.a)} and ${name(x.b)} have made peace, neither the winner. Their armies go home, and food and fleece will ease there over the months`);
  } else {
    const winner = x.fate;
    const loser = foeIn(x, winner);
    const cw = cityOf(w, winner);
    const cl = cityOf(w, loser);
    cl.bonds.push({ kind: 'lost', city: winner, why: `lost the war to ${name(winner)}, and bitter about it`, amount: bend(cl, LOST.amount), tick: s.tick, fade: fadeOf(cl, LOST.fade) });
    cw.bonds.push({ kind: 'won', city: loser, why: `beat ${name(loser)} in the war, and wary of them since`, amount: bend(cw, WON.amount), tick: s.tick, fade: fadeOf(cw, WON.fade) });
    // The loser poorer: fields burned, flocks driven off, stores taken; the winner's stores eased by the spoils.
    TRADE_GOODS.forEach((_, k) => {
      cl.strife[k] = Math.min(cl.strife[k], -DEFEAT_SHARE[k] * normalStock(cl, k));
      cw.strife[k] = Math.round(cw.strife[k] * 50) / 100;
    });
    reprice(cl);
    reprice(cw);
    told(w, s.tick, winner, `${name(winner)} has won its war with ${name(loser)}. ${cap(whose(loser))} fields were burned and its flocks driven off: food there will be dear for a good while`);
  }
}

// ---------------------------------------------------------------------------
// The armies on the map.

/** How long an army (or a fleet) takes over so far along a rival way (ticks): a little slower than a caravan on land; at a ship's pace at sea. */
export function marchFor(by: 'land' | 'sea', dist: number): number {
  if (by === 'land') return Math.max(TICKS_PER_DAY, Math.round((dist / LAND_PACE) * ARMY_SLOWER));
  const tyre = lineLength(wayPoints(wayOf('tyre-sea'))) - HORIZON_ALONG;
  return Math.max(TICKS_PER_DAY, Math.round((VOYAGE * dist) / tyre));
}

export interface ArmyAt {
  city: CityId;
  /** How far along the war's way (from its first city) it is, and which way it faces (towards the way's far end: +1, or back: -1). */
  along: number;
  facing: 1 | -1;
  /** Out (marching to the meeting place), standing there, or going home. */
  phase: 'out' | 'standing' | 'home';
  men: number;
  by: 'land' | 'sea';
}

/** Where each side of a war is on the map at a tick (null for a side at home): out from its city to the meeting place, standing a little short of it, and home again once the war is over. */
export function armiesOnMap(x: War, tick: number): ArmyAt[] {
  const way = RIVAL_WAYS.find((r) => r.id === x.way);
  if (!way) return [];
  const L = lineLength(rivalPoints(way));
  const meet = meetAlong(way);
  const out: ArmyAt[] = [];
  for (const city of [x.a, x.b]) {
    const first = city === way.a;
    const from = first ? 0 : L;
    const stand = first ? meet - STAND_OFF : meet + STAND_OFF;
    const m = marchFor(x.by, Math.abs(stand - from));
    const men = city === x.a ? x.menA : x.menB;
    const toward: 1 | -1 = first ? 1 : -1;
    const end = x.ended || x.until;
    // (Where it was when the war ended: at the stand, or still on its way if it had not got there.)
    const reached = Math.min(1, (end - x.start) / m);
    if (tick < x.start) continue;
    if (tick < end) {
      const u = Math.min(1, (tick - x.start) / m);
      out.push({ city, along: from + (stand - from) * u, facing: toward, phase: u < 1 ? 'out' : 'standing', men, by: x.by });
      continue;
    }
    const back = m * reached;
    const v = (tick - end) / Math.max(1, back);
    if (v >= 1) continue;
    const at = from + (stand - from) * reached;
    out.push({ city, along: at + (from - at) * v, facing: toward === 1 ? -1 : 1, phase: 'home', men, by: x.by });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Your part in it: trading with one side, or helping it, cools the other.

/** "−3 · you trade with their enemy Sparta (2 visits during the war)": the memory a foe keeps of your trade with the other side. */
function foeTradeWhy(other: CityId, visits: number): string {
  return `you trade with their enemy ${name(other)}${visits > 1 ? ` (${visits} visits during the war)` : ' (during the war)'}`;
}

/** A trader of a city at war has bought or sold at your city: its enemy remembers (one memory for the war, growing to at most −15, fading over a year from the latest). */
export function tradedWithFoe(s: SimState, city: CityId): void {
  const w = s.world;
  const x = warOf(w, city);
  if (!x) return;
  const foe = cityOf(w, foeIn(x, city));
  if (!foe.ruler) return;
  const proud = foe.ruler.traits.includes('proud') ? 1.5 : 1;
  const most = Math.round(FOE_TRADE_MOST * proud);
  const m = foe.memories.find((y) => y.kind === 'foetrade' && y.tick >= x.start && y.why.includes(` ${name(city)}`));
  if (m) {
    const visits = (Number(/\((\d+) visits/.exec(m.why)?.[1]) || 1) + 1;
    m.amount = Math.max(most, m.amount + Math.round(FOE_TRADE * proud));
    m.why = foeTradeWhy(city, visits);
    m.tick = s.tick;
  } else foe.memories.push({ kind: 'foetrade', why: foeTradeWhy(city, 1), amount: Math.round(FOE_TRADE * proud), tick: s.tick, fade: FOE_TRADE_FADE });
  const line = settleMood(s, foe, `you trade with their enemy ${name(city)}`, true);
  if (line) news(w, s.tick, foe.id, line);
  s.rev++;
}

/** What you sent a city at war (a gift, what it asked for) has arrived: its enemy remembers. */
export function helpedFoe(s: SimState, city: CityId, words: string): Memory | null {
  const w = s.world;
  const x = warOf(w, city);
  if (!x) return null;
  const foe = cityOf(w, foeIn(x, city));
  if (!foe.ruler) return null;
  const proud = foe.ruler.traits.includes('proud') ? 1.5 : 1;
  const m: Memory = { kind: 'foehelp', why: `you sent ${words} to their enemy ${name(city)} during the war`, amount: Math.round(FOE_HELP * proud), tick: s.tick, fade: FOE_HELP_FADE };
  foe.memories.push(m);
  const line = settleMood(s, foe, m.why, true);
  news(w, s.tick, foe.id, line || `${rulerShort(foe)} has heard that you sent ${words} to ${name(city)}, ${foe.ruler.female ? 'her' : 'his'} enemy (${m.amount})`);
  s.rev++;
  return m;
}

// ---------------------------------------------------------------------------
// In words.

/** "since 12 June 746 BC". */
export const sinceWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName} ${formatYear(d.yearBC)}`;
};

/** A war in a line: "Sparta and Athens at war since 2 May 747 BC, over the border lands; the armies stand at Megara". */
export function warLine(x: War, tick: number): string {
  const way = rivalWay(x.a, x.b) as RivalWay;
  const armies = armiesOnMap(x, tick);
  const standing = armies.some((a) => a.phase === 'standing');
  const where = way.kind === 'sea' ? (standing ? `their fleets face each other ${way.place}` : `their fleets are sailing to meet ${way.place}`) : standing ? `their armies stand at ${way.place}` : `their armies are marching to meet at ${way.place}`;
  if (x.ended) {
    const how = x.fate === 'peace' ? 'ended in a weary peace' : `won by ${name(x.fate)}`;
    return `${name(x.a)}’s war on ${name(x.b)} ${how}, ${sinceWords(x.ended)}`;
  }
  return `${name(x.a)} at war with ${name(x.b)} since ${sinceWords(x.start)}, ${x.why}: ${where}`;
}

/** The bonds a ruler keeps of another, newest first (for the page). */
export const bondsOf = (c: WorldCity, other: CityId): Bond[] => c.bonds.filter((b) => b.city === other).slice().reverse();
