/**
 * Crime (slice 30): every home's temptation to steal, the thieves it sends
 * out, and the watchman who deters and catches them.
 *
 * Once a day (staggered by id, like the homes) each lived-in home's
 * temptation (`tempt`, 0 to TEMPT_FULL) moves by its score (temptationOf): a
 * sum of named reasons, want (hunger, other needs it is warning about),
 * unhappiness (its mood), harsh or heavy taxes, envy (richer homes within a
 * few tiles), no work or wages owed, less a good deal where a watchman has
 * walked by within the month. A score above nothing fills it at
 * TEMPT_STEP a point a day; nothing or less lets it fall.
 *
 * Full, one of the household's grown members slips out (a walker of kind
 * `thief`) to the most worth his walk within THIEF_RANGE by road: a richer
 * home not robbed lately (its coin), a granary or storehouse (a sack of food,
 * a few jars or bales), or the tax office (the treasury). He takes it and
 * walks home; stolen food or goods feed the household for a while. A
 * watchman on his round who sees a thief (THIEF_SIGHT) runs after him and
 * catches him: the loot goes back, the household pays a fine, and the town
 * hears of it.
 *
 * Nothing moves while the switch (`crime.on`) is off: a bare state and a
 * demo's history are played that way, so every earlier town opens as it did.
 * The switch also brings in the slice's other new rules that would change how
 * a history plays: taxes handed in day by day, and harsh taxes' harder bite
 * (taxes.ts), and fire's gentler first year (hazards.ts reads `crime.on` for
 * that too).
 *
 * Every chance here is a hash of the seed, the home and the day, never a
 * draw from the state's generators, so crime shifts nobody else's random numbers.
 *
 * Walker fields for a thief: `home` and `origin` his home's id, `target` where
 * he is going, `food` what he took (a ware, or -1 for coin), `load` how much,
 * `back` on his way home, `wait` ticks left breaking in, `cheese` which member
 * of the household he is, `meat` the watchman after him (0 for none). For a
 * watchman, `meat` is the thief he is after (0 for none).
 */
import type { CoastMap } from '../map/bake';
import { DISTRICTS, districtAt } from '../map/districts';
import { dhypot } from '../map/dmath';
import { centreOf, findBuilding, HUT, levelName, livedIn } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { ageOf, moodOf, NEED_WORDS, tell, warningsOf } from './folk';
import { CHEESE, FLEECE, foodUntil, gi, held, isGood, MEAT, OIL, onTable, setFoodUntil, setHeld, tableUntil, WARE_NAMES, WHEAT, WINE, type Food, type Ware } from './foods';
import { FIRE_BURNING, lookForFire, moveWatchman, roadUnder, unit, WATCH } from './hazards';
import { canWorkIn } from './labour';
import { nearestReached, roadSearch, tracePath, type Search } from './roads';
import { door, endRound, headHome, roadsBeside } from './rounds';
import { TILE_ROAD, type Building, type SimState, type Story, type Walker } from './state';
import { note } from './stockbook';
import { roomOf } from './stores';
import { HEAVY, HARSH } from './taxes';
import { income, monthOf, pay } from './treasury';
import { centre, newWalker, PATROL_SPEED, position, RUN_SPEED, setPath } from './walk';

/** Temptation runs from 0 to this; full, a thief goes out. */
export const TEMPT_FULL = 1000;
/**
 * A home's temptation rises only with a real grievance, a score of TEMPT_FROM
 * or more: each point past TEMPT_FROM - 1 adds TEMPT_STEP a day (a hungry hut
 * beside villas with no watchman, a score of about 6, fills in about a month).
 * Below that it falls TEMPT_FALL a day.
 */
export const TEMPT_FROM = 3;
export const TEMPT_STEP = 8;
export const TEMPT_FALL = 25;
/** The panel names temptation from this far up (a quarter), and the overlay columns and town line from half. */
export const TEMPT_SHOW = 250;
export const TEMPT_HALF = 500;
/** Homes this many tiles apart (as the crow flies, centre to centre) or closer are neighbours, for envy. */
export const ENVY_TILES = 5;
/** At most this many thieves are out in the city at once. */
export const THIEVES_OUT = 3;
/** How far (steps by road) a thief walks to steal. */
export const THIEF_RANGE = 40;
/** He walks at a patrol's pace, keeping to the side of the road. */
export const THIEF_SPEED = PATROL_SPEED;
/** Ticks he spends at the door getting in and out. */
export const BREAK_IN = 6;
/** How far (tiles, as the crow flies) a watchman can see a thief. */
export const THIEF_SIGHT = 6;
/** The longest road a watchman runs after one (and he gives up beyond half as far again). */
export const CHASE_MAX = 24;
/** How often (ticks) the chasing watchman looks where the thief has got to. */
const CHASE_REPLAN = 4;
/** How near (tiles) he must get to lay hands on him. */
const CATCH_DIST = 0.9;
/** How often (ticks) a watchman on his round looks round for thieves (as for flames: hazards.ts). */
const LOOK_EVERY = 5;
/** A home robbed within this long isn't robbed again. */
const ROBBED_AGAIN = 2 * TICKS_PER_MONTH;
/** Nor a store or the tax office within this long (they keep a closer eye after a theft), nor one another thief is on his way to. */
const STORE_AGAIN = TICKS_PER_MONTH;
/** How long a robbed home minds it, and a caught thief's household its shame. */
export const ROBBED_MOOD = 2 * TICKS_PER_MONTH;
export const SHAMED_MOOD = 3 * TICKS_PER_MONTH;
/** Stolen food or goods keep a household this many days. */
export const STOLEN_DAYS = 20;

/** The coin a thief finds in a home, by level (plot, tent, hut, cottage, townhouse, fine house, villa). */
export const HOME_COIN = [0, 2, 4, 6, 10, 15, 24];
/** The fine a thief's household pays, by its level. */
export const THIEF_FINE = [0, 5, 6, 8, 10, 15, 20];
/** What a thief carries off from a granary (measures of food) and a storehouse (jars of oil or wine, bales of fleece). */
export const SACK = 12;
export const JARS = 4;
/** The most he takes from the tax office: a twentieth of the treasury, and never more than this. */
export const OFFICE_TAKE = 20;
const OFFICE_SHARE = 0.05;
/** How much each is worth his walk: a sack of food (twice as much to a hungry household), a few jars, and the office’s coin counts a quarter (it is guarded, and the treasury’s coin is hard to spend unseen). */
const SACK_WORTH = 8;
const JARS_WORTH = 6;
const OFFICE_WORTH = 0.25;
/** How many lines of crime news are kept. */
const NEWS_KEPT = 6;

/** A month's crime, for the side panel. */
export interface CrimeTally {
  thefts: number;
  caught: number;
  /** Drachmas taken (from homes and the tax office), and measures of food and goods. */
  coin: number;
  goods: number;
  fines: number;
}

/** A line of crime news: a theft, or a thief caught. */
export interface CrimeNews {
  tick: number;
  kind: 'theft' | 'caught';
  line: string;
  /** The building it happened at (0 if gone). */
  at: number;
}

/** The city's crime: the switch, the latest news, and this month's and last month's tallies. */
export interface Crime {
  on: boolean;
  news: CrimeNews[];
  month: number;
  now: CrimeTally;
  last: CrimeTally;
}

const freshTally = (): CrimeTally => ({ thefts: 0, caught: 0, coin: 0, goods: 0, fines: 0 });

/** No crime yet, and the switch off (a new game and a loaded save turn it on). */
export function freshCrime(on = false): Crime {
  return { on, news: [], month: 0, now: freshTally(), last: freshTally() };
}

/** This month's tally (turning the month first if it has turned). */
function tally(s: SimState): CrimeTally {
  const c = s.crime;
  const m = monthOf(s.tick);
  if (m !== c.month) {
    c.last = m === c.month + 1 ? c.now : freshTally();
    c.now = freshTally();
    c.month = m;
  }
  return c.now;
}

/** This month's and last month's tallies as they stand at `s.tick` (pure: for the UI). */
export function talliesNow(s: SimState): { now: CrimeTally; last: CrimeTally } {
  const c = s.crime;
  const m = monthOf(s.tick);
  if (m === c.month) return { now: c.now, last: c.last };
  return { now: freshTally(), last: m === c.month + 1 ? c.now : freshTally() };
}

function tellNews(s: SimState, kind: CrimeNews['kind'], line: string, at: number): void {
  s.crime.news.push({ tick: s.tick, kind, line, at });
  if (s.crime.news.length > NEWS_KEPT) s.crime.news.splice(0, s.crime.news.length - NEWS_KEPT);
}

// ---------------------------------------------------------------------------
// Temptation.

/** What the city offers, for moods (as stepHarsh works it out). */
export interface MoodCtx {
  agora: boolean;
  jobs: boolean;
  shrine: boolean;
  theatre: boolean;
}

export function moodCtx(s: SimState): MoodCtx {
  let agora = false;
  let jobs = false;
  let shrine = false;
  let theatre = false;
  for (const o of s.buildings) {
    if (o.kind === 'agora') agora = true;
    else if (o.kind === 'shrine') shrine = true;
    else if (o.kind === 'theatre') theatre = true;
    if (o.kind !== 'home') jobs = true;
  }
  return { agora, jobs, shrine, theatre };
}

/** A reason a home is tempted (w > 0) or held back (w < 0). */
export interface TemptReason {
  text: string;
  w: number;
}

export interface Temptation {
  /** The day's score: what temptation moves by (times TEMPT_STEP, or falls if nothing or less). */
  score: number;
  reasons: TemptReason[];
  /** Is a watchman walking by (within the month)? */
  watched: boolean;
}

/** Has a watchman walked a road beside this building within the last month? */
export function watchedLately(s: SimState, size: number, b: Building): boolean {
  const walked = s.rounds.fire.walked;
  for (const t of roadsBeside(s, size, b)) if (walked[t] > 0 && s.tick - walked[t] < TICKS_PER_MONTH) return true;
  return false;
}

/** The richest home within ENVY_TILES of this one (its level; 0 if none). */
function richestNear(s: SimState, b: Building): Building | null {
  const [cx, cz] = centreOf(b);
  let best: Building | null = null;
  for (const o of s.buildings) {
    if (o === b || o.kind !== 'home' || !livedIn(o) || (best && o.level <= best.level)) continue;
    const [ox, oz] = centreOf(o);
    if (Math.abs(ox - cx) > ENVY_TILES || Math.abs(oz - cz) > ENVY_TILES) continue;
    if (dhypot(ox - cx, oz - cz) > ENVY_TILES) continue;
    best = o;
  }
  return best;
}

/** Plural home names for envy: "villas", "fine houses". */
const plural = (level: number): string => {
  const n = levelName(level, '');
  return n.endsWith('house') ? `${n}s` : n.endsWith('s') ? n : `${n}s`;
};

/**
 * How tempted a home is to steal today, and why: a pure reading of its state
 * (the panel, the overlay and the sim all read this). Not a lived-in home: nothing.
 */
export function temptationOf(s: SimState, size: number, b: Building, ctx: MoodCtx = moodCtx(s)): Temptation {
  const reasons: TemptReason[] = [];
  if (!livedIn(b) || !b.family) return { score: 0, reasons, watched: false };
  const add = (w: number, text: string): void => void reasons.push({ text, w });
  // Want.
  if (b.level >= HUT && tableUntil(b) <= s.tick) add(onTable(b, s.tick) === 0 ? 2 : 1, onTable(b, s.tick) === 0 ? 'hungry' : 'short of food');
  let others = 0;
  for (const warn of warningsOf(s, b)) {
    if (warn.need === 'food' || others >= 2) continue;
    others++;
    add(1, `no ${NEED_WORDS[warn.need]}`);
  }
  // Unhappiness.
  const mood = moodOf(s, b, ctx, canWorkIn(s, b)).level;
  if (mood === 0) add(3, 'fed up');
  else if (mood === 1) add(2, 'unhappy');
  else if (mood === 2) add(1, 'worried');
  else if (mood === 4) add(-1, 'content');
  // Taxes.
  if (b.taxedAt > 0 && s.tick - b.taxedAt < 2 * TICKS_PER_MONTH) {
    if (s.taxRate >= HARSH) add(3, 'harsh taxes');
    else if (s.taxRate === HEAVY) add(1, 'heavy taxes');
  }
  // Envy.
  const rich = richestNear(s, b);
  if (rich && rich.level - b.level >= 2) add(rich.level - b.level >= 3 ? 2 : 1, `${plural(rich.level)} nearby`);
  // Work.
  const workable = canWorkIn(s, b);
  if (workable > 0 && ctx.jobs && b.workers === 0) add(1, 'no work');
  if (b.unpaid > 0) add(1, 'wages owed');
  // The watch.
  let score = 0;
  for (const r of reasons) score += r.w;
  const watched = watchedLately(s, size, b);
  if (score > 0) {
    if (watched) add(-3, 'the watchman walks by');
    else add(1, 'no watchman this month');
  }
  score = 0;
  for (const r of reasons) score += r.w;
  return { score, reasons, watched };
}

/** How much a home's temptation moves a day at this score. */
export const temptRate = (score: number): number => (score >= TEMPT_FROM ? (score - TEMPT_FROM + 1) * TEMPT_STEP : -TEMPT_FALL);

/** Days until a home sends a thief at this rate (Infinity if it isn't rising); 0 once full. */
export function daysToThief(b: Building, t: Temptation): number {
  if (b.tempt >= TEMPT_FULL) return 0;
  const r = temptRate(t.score);
  return r > 0 ? Math.ceil((TEMPT_FULL - b.tempt) / r) : Infinity;
}

// ---------------------------------------------------------------------------
// Thieves.

/** The thieves out now. */
export const thievesOut = (s: SimState): Walker[] => s.walkers.filter((w) => w.kind === 'thief' && w.people > 0);

/** The member of a household a thief is (or would be). */
export function thiefName(b: Building | undefined, w: Walker | null): string {
  const m = b?.family?.members;
  if (!m || m.length === 0) return 'a stranger';
  const i = w ? w.cheese : 0;
  return (m[i] ?? m[0]).name;
}

/** Who a thief is, with his house ('Nikias of the house of Kimon', or 'Kimon, the head of the house'). */
export function thiefWho(b: Building | undefined, w: Walker | null, none = 'a stranger'): string {
  if (!b?.family) return none;
  const name = thiefName(b, w);
  return name === b.family.name ? `${name}, the head of the house` : `${name} of the house of ${b.family.name}`;
}

/** He or she, his or her, him or her: for the member of the household a thief is. */
export function pronouns(b: Building | undefined, w: Walker | null): { he: string; his: string; him: string } {
  const m = b?.family?.members;
  const p = m ? (m[w ? w.cheese : 0] ?? m[0]) : undefined;
  return p?.female ? { he: 'she', his: 'her', him: 'her' } : { he: 'he', his: 'his', him: 'him' };
}

/** The grown member of a household who goes out to steal: a young man first (a son or brother), then an older one, then a woman (a hash of the day picks among them). */
function whoGoes(s: SimState, b: Building, day: number): number {
  const m = b.family?.members ?? [];
  const pools: number[][] = [[], [], [], []];
  m.forEach((p, i) => {
    const age = ageOf(s, p);
    if (age < 16 || age > 60) return;
    pools[(p.female ? 2 : 0) + (age <= 35 ? 0 : 1)].push(i);
  });
  const pool = pools.find((x) => x.length) ?? [];
  if (pool.length === 0) return 0;
  return pool[Math.floor(unit(s.seed, b.id, day, 31) * pool.length)];
}

/** The last story entry of a kind, if any. */
const lastStory = (b: Building, what: Story['what']): Story | undefined => {
  const st = b.family?.story ?? [];
  for (let i = st.length - 1; i >= 0; i--) if (st[i].what === what) return st[i];
  return undefined;
};

/** Was this home robbed lately (so a thief passes it by)? */
export const robbedLately = (s: SimState, b: Building, within = ROBBED_AGAIN): boolean => {
  const r = lastStory(b, 'robbed');
  return !!r && s.tick - r.tick < within;
};

/** Are two homes within ENVY_TILES of each other (centre to centre)? */
function near(a: Building, b: Building): boolean {
  const [ax, az] = centreOf(a);
  const [bx, bz] = centreOf(b);
  return dhypot(ax - bx, az - bz) <= ENVY_TILES;
}

/** The ware a granary or storehouse has most of that a thief would take (-1 for none). */
function wareAt(g: Building): Ware {
  const pool: Ware[] = g.kind === 'granary' ? [WHEAT, MEAT, CHEESE] : g.kind === 'storehouse' ? [OIL, FLEECE, WINE] : [];
  let best: Ware = -1;
  let most = 0;
  for (const w of pool) {
    const n = held(g, w);
    if (n > most) {
      most = n;
      best = w;
    }
  }
  return best;
}

/** What a thief takes from the tax office now. */
const officeTake = (s: SimState): number => Math.min(OFFICE_TAKE, Math.floor(Math.max(0, s.money) * OFFICE_SHARE));

/** What a thief from `home` would get at `t`, and its worth to him (0: nothing worth it). */
export function worthAt(s: SimState, home: Building, t: Building): number {
  if (t === home) return 0;
  // (A richer home within sight of theirs, the one they envy, is worth twice as much to them.)
  if (t.kind === 'home') return livedIn(t) && t.family && t.level > home.level && !robbedLately(s, t) && !s.walkers.some((w) => w.kind === 'thief' && w.target === t.id && w.people > 0) ? HOME_COIN[Math.min(t.level, HOME_COIN.length - 1)] * (near(home, t) ? 2 : 1) : 0;
  if (t.robbedAt > 0 && s.tick - t.robbedAt < STORE_AGAIN) return 0;
  if (s.walkers.some((w) => w.kind === 'thief' && w.target === t.id && w.people > 0)) return 0;
  if (t.kind === 'granary') return wareAt(t) >= 0 ? (home.level >= HUT && tableUntil(home) <= s.tick ? 2 * SACK_WORTH : SACK_WORTH) : 0;
  if (t.kind === 'storehouse') return wareAt(t) >= 0 ? JARS_WORTH : 0;
  if (t.kind === 'taxoffice') return officeTake(s) * OFFICE_WORTH;
  return 0;
}

/** Where a thief from this home would go: the most worth his walk within THIEF_RANGE by road (null: nothing worth it). */
export function targetFor(s: SimState, size: number, home: Building): { target: Building; steps: number } | null {
  const from = roadsBeside(s, size, home);
  if (from.length === 0) return null;
  const search = roadSearch(s, size, from);
  return pickTarget(s, size, home, search);
}

function pickTarget(s: SimState, size: number, home: Building, search: Search): { target: Building; steps: number } | null {
  let best: { target: Building; steps: number } | null = null;
  let bv = 0;
  for (const t of s.buildings) {
    if (t.kind !== 'home' && t.kind !== 'granary' && t.kind !== 'storehouse' && t.kind !== 'taxoffice') continue;
    const worth = worthAt(s, home, t);
    if (worth <= 0) continue;
    const r = nearestReached(search, roadsBeside(s, size, t));
    if (r < 0) continue;
    const d = search.dist[r];
    if (d > THIEF_RANGE) continue;
    const v = worth / (8 + d);
    if (v > bv) {
      bv = v;
      best = { target: t, steps: d };
    }
  }
  return best;
}

/** A path by road from `from`'s door to `to`'s door (false if no road joins them). */
function walkBetween(s: SimState, size: number, w: Walker, from: Building, to: Building, here?: [number, number]): boolean {
  const ends = roadsBeside(s, size, to);
  if (ends.length === 0) return false;
  const search = roadSearch(s, size, ends);
  const start = nearestReached(search, roadsBeside(s, size, from));
  if (start < 0) return false;
  const way = tracePath(search, start).reverse();
  const pts: Array<[number, number, number]> = [];
  const [dx, dz] = here ?? door(size, from, start);
  pts.push([dx, dz, -1]);
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [ex, ez] = door(size, to, way[way.length - 1]);
  pts.push([ex, ez, -1]);
  setPath(w, pts);
  return true;
}

/** One of the household slips out to steal from `target` (null if no road joins them). */
export function setOut(s: SimState, size: number, b: Building, target: Building, day = Math.floor(s.tick / TICKS_PER_DAY)): Walker | null {
  const w = newWalker(s, 'thief', 1);
  w.home = b.id;
  w.origin = b.id;
  w.target = target.id;
  w.food = -1;
  w.cheese = whoGoes(s, b, day);
  w.since = s.tick;
  if (!walkBetween(s, size, w, b, target)) return null;
  s.walkers.push(w);
  b.tempt = 0;
  s.rev++;
  return w;
}

/** A watchman starts after a thief (the chase then runs on its own: see moveWatch). */
export function startChase(s: SimState, map: CoastMap, w: Walker, thief: Walker): boolean {
  w.meat = thief.id;
  thief.meat = w.id;
  w.back = false;
  w.target = 0;
  if (planChase(s, map.size, w, thief)) return true;
  w.meat = 0;
  thief.meat = 0;
  return false;
}

/**
 * Once a day per home (staggered by id): temptation rises or falls; a full one
 * sends a thief, if fewer than THIEVES_OUT are out and none from it.
 */
export function stepCrime(s: SimState, map: CoastMap): void {
  if (!s.crime.on) return;
  const size = map.size;
  const day = Math.floor(s.tick / TICKS_PER_DAY);
  let ctx: MoodCtx | null = null;
  let out = -1;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || (s.tick + b.id + 3) % TICKS_PER_DAY !== 0) continue;
    if (!livedIn(b) || !b.family) {
      b.tempt = 0;
      continue;
    }
    ctx ??= moodCtx(s);
    const t = temptationOf(s, size, b, ctx);
    b.tempt = Math.max(0, Math.min(TEMPT_FULL, b.tempt + temptRate(t.score)));
    if (b.tempt < TEMPT_FULL) continue;
    if (out < 0) out = thievesOut(s).length;
    if (out >= THIEVES_OUT || s.walkers.some((w) => w.kind === 'thief' && w.home === b.id)) continue;
    const got = targetFor(s, size, b);
    if (!got) continue;
    setOut(s, size, b, got.target, day);
    out++;
  }
}

/** Where a place is, for the news: "by the bay". */
const whereOf = (map: CoastMap, b: Building): string => {
  const [cx, cz] = centreOf(b);
  return DISTRICTS[districtAt(map, cx, cz)]?.where ?? 'in the city';
};

/** "the villa of Kallias", "the granary". */
export function placeOf(b: Building): string {
  if (b.kind === 'home') return `the ${levelName(b.level, '')}${b.family ? ` of ${b.family.name}` : ''}`;
  return b.kind === 'taxoffice' ? 'the tax office' : `the ${b.kind}`;
}

/** What a thief carries, in words: "24 dr", "12 measures of wheat", "4 jars of oil". */
export function lootWords(w: Walker): string {
  if (w.food < 0) return `${w.load} dr`;
  if (isGood(w.food)) return `${w.load} ${w.food === FLEECE ? 'bales' : 'jars'} of ${WARE_NAMES[w.food]}`;
  return `${w.load} measures of ${WARE_NAMES[w.food]}`;
}

/** At the door: he takes what he came for. */
function steal(s: SimState, map: CoastMap, w: Walker): void {
  const t = findBuilding(s, w.target);
  w.food = -1;
  w.load = 0;
  if (!t) return;
  const tl = tally(s);
  if (t.kind === 'home' && livedIn(t) && t.family) {
    const coin = HOME_COIN[Math.min(t.level, HOME_COIN.length - 1)];
    w.load = coin;
    tell(s, t.family, 'robbed', t.level);
    t.family.story[t.family.story.length - 1].n = coin;
    tl.coin += coin;
  } else if (t.kind === 'granary' || t.kind === 'storehouse') {
    const ware = wareAt(t);
    if (ware < 0) return;
    const n = Math.min(held(t, ware), t.kind === 'granary' ? SACK : JARS);
    setHeld(t, ware, held(t, ware) - n);
    note(s, ware, 'lost', 'Stolen by thieves', n);
    w.food = ware;
    w.load = n;
    tl.goods += n;
  } else if (t.kind === 'taxoffice') {
    const coin = officeTake(s);
    if (coin <= 0) return;
    pay(s, -coin, 'stolen', 'from the tax office');
    w.load = coin;
    tl.coin += coin;
  } else return;
  t.robbedAt = s.tick;
  tl.thefts++;
  tellNews(s, 'theft', `A thief robbed ${placeOf(t)} ${whereOf(map, t)}: ${lootWords(w)}`, t.id);
  s.rev++;
}

/** Home with the loot: the household's story, and stolen food or goods on their table. */
function arriveHome(s: SimState, w: Walker, home: Building): void {
  const f = home.family;
  if (!f || w.load <= 0) return;
  const what = w.food < 0 ? `a purse of ${w.load} dr` : lootWords(w);
  tell(s, f, 'stole', home.level, [thiefName(home, w), what]);
  f.story[f.story.length - 1].n = w.load;
  const until = (now: number): number => Math.max(now, s.tick) + STOLEN_DAYS * TICKS_PER_DAY;
  if (w.food >= 0 && !isGood(w.food)) setFoodUntil(home, w.food as Food, until(foodUntil(home, w.food as Food)));
  else if (w.food >= 0) home.goodsUntil[gi(w.food)] = until(home.goodsUntil[gi(w.food)]);
  s.rev++;
}

/** Is a watchman after this thief now? */
const chased = (s: SimState, w: Walker): boolean => w.meat > 0 && s.walkers.some((o) => o.id === w.meat && o.kind === 'watchman' && o.meat === w.id);

/** Move a thief one tick along. False once he is home (or gone). */
export function moveThief(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const home = findBuilding(s, w.home);
  if (w.people <= 0 || !home || !livedIn(home) || !home.family) return false;
  if (w.wait > 0) {
    if (--w.wait > 0) return true;
    steal(s, map, w);
    const t = findBuilding(s, w.target);
    w.back = true;
    if (!t || !walkBetween(s, size, w, t, home, position(w))) return false;
    return true;
  }
  let move = THIEF_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const next = w.tiles[w.seg + 1];
    if (next >= 0 && s.tiles[next] !== TILE_ROAD) {
      // The road was cut: find another way, or give up.
      const to = w.back ? home : findBuilding(s, w.target);
      const cur = roadUnder(s, w);
      if (!to || cur < 0 || !rerouteTo(s, size, w, cur, to)) {
        if (w.back) arriveHome(s, w, home);
        return false;
      }
      continue;
    }
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      move = 0;
      break;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  if (w.seg < w.path.length / 2 - 1) return true;
  if (!w.back) {
    // At the door of where he was going: in he goes, if it is still worth it.
    const t = findBuilding(s, w.target);
    if (!t) {
      w.back = true;
      return walkBetweenHere(s, size, w, home);
    }
    w.wait = BREAK_IN;
    return true;
  }
  // At his own door, with the watchman after him: he waits there, caught.
  if (chased(s, w)) return true;
  arriveHome(s, w, home);
  return false;
}

/** Turn for home from where he stands. */
function walkBetweenHere(s: SimState, size: number, w: Walker, home: Building): boolean {
  const cur = roadUnder(s, w);
  return cur >= 0 && rerouteTo(s, size, w, cur, home);
}

/** From road tile `cur` (standing where he is) to a building's door. */
function rerouteTo(s: SimState, size: number, w: Walker, cur: number, to: Building): boolean {
  const ends = roadsBeside(s, size, to);
  if (ends.length === 0) return false;
  const search = roadSearch(s, size, ends);
  if (search.dist[cur] < 0) return false;
  const way = tracePath(search, cur).reverse();
  const here = position(w);
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [ex, ez] = door(size, to, way[way.length - 1]);
  pts.push([ex, ez, -1]);
  setPath(w, pts);
  return true;
}

// ---------------------------------------------------------------------------
// The watch.

/** The nearest thief a watchman standing at road tile `from` can see and reach by a short road (null: none). */
function thiefInSight(s: SimState, size: number, w: Walker, from: number): Walker | null {
  if (from < 0) return null;
  const here = position(w);
  let best: Walker | null = null;
  let bd = Infinity;
  for (const t of s.walkers) {
    if (t.kind !== 'thief' || t.people <= 0 || (t.meat > 0 && t.meat !== w.id && chased(s, t))) continue;
    const [x, z] = position(t);
    const d = dhypot(x - here[0], z - here[1]);
    if (d > THIEF_SIGHT || d >= bd) continue;
    const tt = roadUnder(s, t);
    if (tt < 0) continue;
    const steps = roadSearch(s, size, [tt]).dist[from];
    if (steps < 0 || steps > CHASE_MAX) continue;
    bd = d;
    best = t;
  }
  return best;
}

/** Plan the chaser's way to where the thief is now (false if he can't be reached). */
function planChase(s: SimState, size: number, w: Walker, thief: Walker): boolean {
  const from = roadUnder(s, w);
  const to = roadUnder(s, thief);
  if (from < 0 || to < 0) return false;
  const search = roadSearch(s, size, [to]);
  const d = search.dist[from];
  if (d < 0 || d > CHASE_MAX * 1.5) return false;
  const way = tracePath(search, from).reverse();
  const here = position(w);
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [tx, tz] = position(thief);
  pts.push([tx, tz, -1]);
  setPath(w, pts);
  return true;
}

/** Stop chasing: on as after a fire (the next fire he can see, else home). */
function giveUp(s: SimState, map: CoastMap, w: Walker, thief: Walker | null): boolean {
  w.meat = 0;
  w.wait = 0;
  if (thief && thief.meat === w.id) thief.meat = 0;
  const size = map.size;
  if (lookForFire(s, size, w)) return true;
  const post = findBuilding(s, w.origin);
  if (!post || post.kind !== 'watchpost') return false;
  const from = roadUnder(s, w);
  if (from >= 0 && headHome(s, size, w, post, from, position(w))) return true;
  return endRound(WATCH, post);
}

/** Caught: the loot goes back, the household pays its fine and hears of it, and the town too. */
export function catchThief(s: SimState, map: CoastMap, thief: Walker): void {
  const home = findBuilding(s, thief.home);
  const name = thiefName(home, thief);
  const tl = tally(s);
  const t = findBuilding(s, thief.target);
  if (thief.load > 0 && thief.back) {
    if (thief.food < 0 && t?.kind === 'home' && t.family) {
      // The purse back to the house it was taken from.
      const r = lastStory(t, 'robbed');
      if (r) {
        r.n = 0;
        r.names = [name];
      }
      tl.coin -= thief.load;
    } else if (thief.food < 0) {
      income(s, thief.load, 'recovered', 'from a thief');
      tl.coin -= thief.load;
    } else if (t && (t.kind === 'granary' || t.kind === 'storehouse')) {
      const back = Math.min(thief.load, Math.max(0, roomOf(t.kind, thief.food) - held(t, thief.food)));
      setHeld(t, thief.food, held(t, thief.food) + back);
      note(s, thief.food, 'lost', 'Stolen by thieves', -back);
      tl.goods -= back;
    }
  }
  const level = home?.level ?? 0;
  const fine = THIEF_FINE[Math.min(level, THIEF_FINE.length - 1)];
  if (fine > 0) income(s, fine, 'fines', 'thieves caught');
  tl.caught++;
  tl.fines += fine;
  if (home?.family) {
    tell(s, home.family, 'caught', home.level, [name]);
    home.family.story[home.family.story.length - 1].n = fine;
  }
  const whose = home?.family ? thiefWho(home, thief) : name;
  const pr = pronouns(home, thief);
  const going = t ? (thief.back ? `on ${pr.his} way home from ${placeOf(t)}` : `on ${pr.his} way to ${placeOf(t)}`) : 'in the street';
  const at = home ?? t;
  tellNews(s, 'caught', `A thief caught ${at ? whereOf(map, at) : 'in the city'}: ${whose}, ${going}. ${fine > 0 ? `${pr.his === 'her' ? 'Her' : 'His'} family paid a ${fine} dr fine` : `${pr.he === 'she' ? 'She' : 'He'} was sent home`}`, home?.id ?? 0);
  thief.people = 0;
  thief.load = 0;
  thief.meat = 0;
  s.rev++;
}

/** The chase, a tick of it: re-plan now and then, run, lay hands on him. */
function chase(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const thief = s.walkers.find((o) => o.id === w.meat && o.kind === 'thief' && o.people > 0) ?? null;
  if (!thief) return giveUp(s, map, w, null);
  // Fire comes first.
  if ((s.tick + w.id) % LOOK_EVERY === 0 && s.buildings.some((b) => b.fire === FIRE_BURNING) && lookForFire(s, size, w)) {
    w.meat = 0;
    if (thief.meat === w.id) thief.meat = 0;
    return true;
  }
  const near = (): boolean => {
    const [ax, az] = position(w);
    const [bx, bz] = position(thief);
    return dhypot(ax - bx, az - bz) <= CATCH_DIST;
  };
  if (near()) {
    catchThief(s, map, thief);
    return giveUp(s, map, w, null);
  }
  if ((s.tick + w.id) % CHASE_REPLAN === 0 || w.seg >= w.path.length / 2 - 1) {
    if (!planChase(s, size, w, thief)) return giveUp(s, map, w, thief);
  }
  const walked = s.rounds.fire.walked;
  let move = RUN_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const next = w.tiles[w.seg + 1];
    if (next >= 0 && s.tiles[next] !== TILE_ROAD) {
      if (!planChase(s, size, w, thief)) return giveUp(s, map, w, thief);
      continue;
    }
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
    const t = w.tiles[w.seg];
    if (t >= 0) {
      WATCH.serve(s, size, t, w, map);
      walked[t] = s.tick;
    }
  }
  if (near()) {
    catchThief(s, map, thief);
    return giveUp(s, map, w, null);
  }
  return true;
}

/**
 * A watchman's tick (sim.ts calls this in place of moveWatchman): with crime
 * on, after a thief he has seen, or on his round looking round for one;
 * otherwise his round and his fires as ever.
 */
export function moveWatch(s: SimState, map: CoastMap, w: Walker): boolean {
  if (!s.crime.on) return moveWatchman(s, map, w);
  if (w.meat > 0) return chase(s, map, w);
  if (w.target === 0 && (s.tick + w.id) % LOOK_EVERY === 2 && s.walkers.some((o) => o.kind === 'thief' && o.people > 0)) {
    const thief = thiefInSight(s, map.size, w, roadUnder(s, w));
    if (thief && startChase(s, map, w, thief)) return chase(s, map, w);
  }
  return moveWatchman(s, map, w);
}
