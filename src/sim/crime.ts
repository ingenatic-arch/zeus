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
 *
 * Slice 41 (Crimes of every kind): a full temptation now turns a home to the
 * crime its own trouble points to (crimeFor): theft, or, with the new kinds'
 * switch (`crime.kinds`) on, pickpocketing, vandalism, arson (after talk in the
 * quarter) or smuggling (misdeeds.ts), each with its own walker that walks,
 * waits at a door and is caught the way a thief is. Gangs (gangs.ts) take a
 * den in a quarter whose temptation stays high. `caught` is the one place where
 * what happens to a criminal the watchman lays hands on is decided. The other
 * criminals use a thief's walker fields; a pickpocket's `steps` is 1 while he
 * works the crowd. A criminal's `meat` below 0 names a watchman he has beaten
 * off (a gang's man), who doesn't run after him again.
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
// Slice 41: the new kinds of crime, and gangs.
import { COTTAGE, TENT } from './buildings';
import type { WalkerKind } from './state';
import { act, crimeTargets, criminalHome, holdBroken, mingle, catchOther, startTalk, stepTalk, type Target } from './misdeeds';
import { denOf, gangOf, lone, stepGangs } from './gangs';
// Slice 45: the court and the prison.
import { countCrime, courtFor, deterrence, escort, escorting, freshJustice, isAway, lawCtx, postsInReach, rateNow, stepJustice, toCourt, type Case, type Cut, type Held, type Jail, type Law, type Pinned, type RateMonth } from './justice';

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

/** The coin a thief finds in a home, by level (plot, tent, hut, cottage, townhouse, fine house, villa; slice 36: estate, great estate). */
export const HOME_COIN = [0, 2, 4, 6, 10, 15, 24, 40, 60];
/** The fine a thief's household pays, by its level. */
export const THIEF_FINE = [0, 5, 6, 8, 10, 15, 20, 25, 30];
/** Slice 36: an estate draws envy from further off: its walls and its horses are seen across the quarter. */
export const ESTATE_ENVY_MORE = 2;
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
  /** Slice 41: purses cut by pickpockets, buildings smashed by vandals, fires set by arsonists, lots smuggled away, drachmas skimmed by tax collectors, and watchmen beaten off by a gang's men. */
  picked: number;
  smashed: number;
  arson: number;
  smuggled: number;
  skimmed: number;
  beaten: number;
}

/** Slice 41: the kinds of crime news (theft and caught are slice 30's). Slice 45: the court's (a case brought in, a sentence, home again), a prison's unrest, a breakout, and its unrest eased (merge of slice 45: a crowded prison's overflow walked to another, or quiet again). */
export const NEWS_KINDS = ['theft', 'caught', 'picked', 'smashed', 'mended', 'talk', 'calmed', 'arson', 'smuggled', 'skimmed', 'gathering', 'dispersed', 'gang', 'beaten', 'brokenup', 'scattered', 'court', 'sentence', 'freed', 'unrest', 'breakout', 'eased'] as const;

/** A line of crime news: a theft, or a thief caught (slice 41: and every new kind's). */
export interface CrimeNews {
  tick: number;
  kind: (typeof NEWS_KINDS)[number];
  line: string;
  /** The building it happened at (0 if gone). */
  at: number;
}

/** Slice 41: a building a vandal smashed, until the architect's inspector mends it: a fountain's spout, a shrine's statue, or an agora's stall (`part`: -1 its food stall, else the good's index in `goods`, see gi). */
export interface Broken {
  at: number;
  part: number;
  tick: number;
  /** Who did it ("Lykon of the house of Nikias"). */
  by: string;
}

/** Slice 41: talk of burning in a home, before its arsonist goes out (misdeeds.ts). */
export interface Talk {
  home: number;
  since: number;
  /** When he goes, if the talk hasn't died down. */
  at: number;
}

/** Slice 41: a gang and its den (gangs.ts). */
export interface Gang {
  /** The home it took as its den. */
  den: number;
  /** "the Lykos gang". */
  name: string;
  /** Its quarter (a district's index). */
  district: number;
  formed: number;
  /** When its next man goes out. */
  next: number;
  /** Since when two watch posts have reached the den (0: fewer do). */
  covered: number;
}

/** The city's crime: the switch, the latest news, and this month's and last month's tallies. */
export interface Crime {
  on: boolean;
  news: CrimeNews[];
  month: number;
  now: CrimeTally;
  last: CrimeTally;
  /** Slice 41: the new kinds' and gangs' switch (on in a new game, as a demo opens and from loading; off while a history plays). */
  kinds: boolean;
  /** Slice 41: buildings smashed and not yet mended. */
  broken: Broken[];
  /** Slice 41: talk of burning. */
  talk: Talk[];
  /** Slice 41: when the last fire was set by an arsonist, or the last talk began (0: never): one at a time, and seldom. */
  arsonAt: number;
  /** Slice 41: for each district, how many months running its temptation has stayed high, and the home at its heart (0: none). */
  heat: number[];
  seats: number[];
  /** Slice 41: the gangs and their dens. */
  gangs: Gang[];
  /** Slice 45: the law (a punishment for each kind of crime), the caught waiting for trial, those serving a sentence, those in the stocks, each prison's unrest, this month's crime and the months before, and the last execution or exile (justice.ts). */
  law: Law;
  cases: Case[];
  held: Held[];
  stocks: Pinned[];
  jails: Jail[];
  rate: RateMonth;
  rates: RateMonth[];
  cut: Cut;
}

/** Slice 41: an empty tally (exported for migrate.ts). */
export const freshTally = (): CrimeTally => ({ thefts: 0, caught: 0, coin: 0, goods: 0, fines: 0, picked: 0, smashed: 0, arson: 0, smuggled: 0, skimmed: 0, beaten: 0 });

/** No crime yet, and the switch off (a new game and a loaded save turn it on; slice 41: the new kinds' switch with it). */
export function freshCrime(on = false): Crime {
  return { on, news: [], month: 0, now: freshTally(), last: freshTally(), kinds: on, broken: [], talk: [], arsonAt: 0, heat: [], seats: [], gangs: [], ...freshJustice() };
}

/** This month's tally (turning the month first if it has turned). */
export function tally(s: SimState): CrimeTally {
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

export function tellNews(s: SimState, kind: CrimeNews['kind'], line: string, at: number): void {
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
  /** Slice 45: a court at work, a prison, a quarry or mine with a job for a convict (the law's deterrence: justice.ts). */
  court?: boolean;
  prison?: boolean;
  labour?: boolean;
}

export function moodCtx(s: SimState): MoodCtx {
  let agora = false;
  let jobs = false;
  let shrine = false;
  let theatre = false;
  let court = false;
  for (const o of s.buildings) {
    if (o.kind === 'agora') agora = true;
    else if (o.kind === 'shrine') shrine = true;
    else if (o.kind === 'theatre') theatre = true;
    // (Slice 45.)
    else if (o.kind === 'court' && o.workers > 0) court = true;
    if (o.kind !== 'home') jobs = true;
  }
  if (!court) return { agora, jobs, shrine, theatre };
  return { ...lawCtx(s), agora, jobs, shrine, theatre, court };
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
  /** Slice 41: the trouble behind it, for which crime it turns to (crimeFor): its mood (0 fed up … 4 content), hungry, harshly taxed, envying richer homes nearby, nobody in work. */
  mood?: number;
  hungry?: boolean;
  harsh?: boolean;
  envy?: boolean;
  idle?: boolean;
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
    const far = ENVY_TILES + (o.estate ? ESTATE_ENVY_MORE : 0);
    if (Math.abs(ox - cx) > far || Math.abs(oz - cz) > far) continue;
    if (dhypot(ox - cx, oz - cz) > far) continue;
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
  const hungry = b.level >= HUT && tableUntil(b) <= s.tick && onTable(b, s.tick) === 0;
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
  const taxed = b.taxedAt > 0 && s.tick - b.taxedAt < 2 * TICKS_PER_MONTH;
  if (taxed) {
    if (s.taxRate >= HARSH) add(3, 'harsh taxes');
    else if (s.taxRate === HEAVY) add(1, 'heavy taxes');
  }
  // Envy.
  const rich = richestNear(s, b);
  const envy = !!rich && rich.level - b.level >= 2;
  if (rich && rich.level - b.level >= 2) add(rich.level - b.level >= 3 ? 2 : 1, `${plural(rich.level)} nearby`);
  // Work.
  const workable = canWorkIn(s, b);
  const idle = workable > 0 && ctx.jobs && b.workers === 0;
  if (workable > 0 && ctx.jobs && b.workers === 0) add(1, 'no work');
  if (b.unpaid > 0) add(1, 'wages owed');
  // Slice 41: a gang's den in the quarter (never with no gang, so earlier towns are as they were).
  if (s.crime.gangs.length && s.crime.gangs.some((g) => g.den !== b.id && denNear(s, g, b))) add(1, 'a gang’s den nearby');
  // Slice 45: the law, with a court at work (never without one, so earlier towns are as they were): the punishment for the crime its trouble points to.
  if (ctx.court) {
    const t0: Temptation = { score: 0, reasons, watched: false, mood, hungry, harsh: taxed && s.taxRate >= HARSH, envy, idle };
    for (const r of deterrence(s, b, likelyKinds(s, b, t0), ctx)) add(r.w, r.text);
  }
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
  return { score, reasons, watched, mood, hungry, harsh: taxed && s.taxRate >= HARSH, envy, idle };
}

/** Slice 41: is a home within a gang's quarter (GANG_TILES of its den)? */
export function denNear(s: SimState, g: Gang, b: Building): boolean {
  const den = findBuilding(s, g.den);
  if (!den) return false;
  const [ax, az] = centreOf(den);
  const [bx, bz] = centreOf(b);
  return dhypot(ax - bx, az - bz) <= GANG_TILES;
}

/**
 * Slice 45: the crimes a home's trouble would turn it to (crimeFor's order, read cheaply without its road search), for
 * the law's deterrence: the first that fits, or for a poor home both of its trades (the law's milder counts).
 */
export function likelyKinds(s: SimState, b: Building, t: Temptation): CrimeKind[] {
  if (!s.crime.kinds) return ['theft'];
  if (aggrieved(s, b, t)) return ['arson'];
  if ((t.mood ?? 3) <= 1 && t.idle) return ['vandal'];
  if (t.envy) return ['theft'];
  if (poorHome(b)) return ['pickpocket', 'smuggling'];
  return ['theft'];
}

/** Slice 41: a quarter, for gangs: homes this many tiles (centre to centre) from one another's. */
export const GANG_TILES = 8;

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

/**
 * The grown member of a household who goes out to steal: a young man first (a son or brother), then an older one, then a
 * woman (a hash of the day picks among them). (Slice 45: never one already out at a crime, at court or serving a sentence;
 * -1 when every grown member is, so a gang's den sends no more men than it has. A home with none of them grown sends its
 * head, as ever.)
 */
export function whoGoes(s: SimState, b: Building, day: number): number {
  const m = b.family?.members ?? [];
  const pools: number[][] = [[], [], [], []];
  const busy = new Set<number>();
  for (const w of s.walkers) if (w.home === b.id && w.people > 0 && (isCriminal(w.kind) || w.kind === 'convict')) busy.add(w.cheese);
  let grown = 0;
  m.forEach((p, i) => {
    const age = ageOf(s, p);
    if (age < 16 || age > 60) return;
    grown++;
    if (busy.has(i) || ((s.crime.cases.length || s.crime.held.length || s.crime.stocks.length) && isAway(s, b, p.name))) return;
    pools[(p.female ? 2 : 0) + (age <= 35 ? 0 : 1)].push(i);
  });
  const pool = pools.find((x) => x.length) ?? [];
  if (pool.length === 0) return grown > 0 || busy.size > 0 ? -1 : 0;
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
export function walkBetween(s: SimState, size: number, w: Walker, from: Building, to: Building, here?: [number, number]): boolean {
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
  if (w.cheese < 0) {
    s.nextId--;
    return null;
  }
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
 * (Slice 41: with the new kinds on, it turns to the crime its trouble points
 * to; and the broken buildings, the talk of burning and the gangs move on.)
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
    // Slice 41: the crime its own trouble points to.
    if (s.crime.kinds) {
      turnTo(s, map, b, t, day);
      continue;
    }
    if (out < 0) out = thievesOut(s).length;
    if (out >= THIEVES_OUT || s.walkers.some((w) => w.kind === 'thief' && w.home === b.id)) continue;
    const got = targetFor(s, size, b);
    if (!got) continue;
    setOut(s, size, b, got.target, day);
    out++;
  }
  // Slice 41: broken buildings send nobody out; talk of burning grows or dies down; the gangs gather, send their men and break up.
  if (s.crime.kinds) {
    holdBroken(s, map);
    stepTalk(s, map);
    stepGangs(s, map);
  }
  // Slice 45: trials, sentences served, the stocks, the prisons' unrest and the month's rate (nothing with no court, case, prisoner or prison).
  stepJustice(s, map);
}

// ---------------------------------------------------------------------------
// Slice 41: which crime a home turns to.

/** The crimes a home can turn to. */
export type CrimeKind = 'theft' | 'pickpocket' | 'vandal' | 'arson' | 'smuggling';
export const CRIME_KINDS: readonly CrimeKind[] = ['theft', 'pickpocket', 'vandal', 'arson', 'smuggling'];
/** The walker each sends out. */
export const CRIMINAL_OF: Readonly<Record<CrimeKind, WalkerKind>> = { theft: 'thief', pickpocket: 'pickpocket', vandal: 'vandal', arson: 'arsonist', smuggling: 'smuggler' };
/** Is this a criminal's walker (a thief, a pickpocket, a vandal, an arsonist or a smuggler)? */
export const isCriminal = (k: WalkerKind): boolean => k === 'thief' || k === 'pickpocket' || k === 'vandal' || k === 'arsonist' || k === 'smuggler';
/** The crime a criminal's walker is out for. */
export const crimeOfWalker = (k: WalkerKind): CrimeKind => (k === 'pickpocket' ? 'pickpocket' : k === 'vandal' ? 'vandal' : k === 'arsonist' ? 'arson' : k === 'smuggler' ? 'smuggling' : 'theft');
/** Criminals out now (every kind). */
export const criminalsOut = (s: SimState): Walker[] => s.walkers.filter((w) => isCriminal(w.kind) && w.people > 0);
/** How many of each kind can be out at once (thieves THIEVES_OUT, as before; the others one each; a gang's men besides, see gangs.ts). */
export const KIND_OUT: Readonly<Record<CrimeKind, number>> = { theft: 3, pickpocket: 1, vandal: 1, arson: 1, smuggling: 1 };
/** In words: "steal", "pick pockets", "smash things", "burn", "smuggle". */
export const KIND_VERB: Readonly<Record<CrimeKind, string>> = { theft: 'steal', pickpocket: 'pick pockets', vandal: 'smash things', arson: 'burn', smuggling: 'smuggle' };
/** The walker's name: "thief", "pickpocket", "vandal", "arsonist", "smuggler". */
export const KIND_NAME: Readonly<Record<CrimeKind, string>> = { theft: 'thief', pickpocket: 'pickpocket', vandal: 'vandal', arson: 'arsonist', smuggling: 'smuggler' };
/** Six months between one arsonist's fire (or talk of one) and the next talk, in the whole city. */
export const ARSON_GAP = 6 * TICKS_PER_MONTH;

/** A crime a home would turn to: the kind, where, how far by road, which part (a vandal's: see Broken), and its trouble in words. */
export interface CrimeChoice {
  kind: CrimeKind;
  target: Building;
  steps: number;
  part: number;
  why: string;
}

/** Is a home poor (a tent, hut or cottage)? Poor homes pick pockets and smuggle. */
export const poorHome = (b: Building): boolean => !b.estate && b.level >= TENT && b.level <= COTTAGE;

/** The most aggrieved homes (arson's): three of hungry, harshly taxed, robbed lately and fed up. */
export function aggrieved(s: SimState, b: Building, t: Temptation): boolean {
  let n = 0;
  if (t.hungry) n++;
  if (t.harsh) n++;
  if (robbedLately(s, b)) n++;
  if (t.mood === 0) n++;
  return n >= 3;
}

/** Can talk of burning begin in this home: it has talk already, or there is none in the city and none lately? */
const arsonOpen = (s: SimState, b: Building): boolean => s.crime.talk.some((x) => x.home === b.id) || (s.crime.talk.length === 0 && (s.crime.arsonAt === 0 || s.tick - s.crime.arsonAt >= ARSON_GAP));

/**
 * The crime a home's own trouble points to, first that has something within
 * reach (null: nothing): arson for the most aggrieved (after talk), vandalism
 * for the angry and idle, theft for a home envying richer ones nearby,
 * smuggling or pickpocketing for a poor home near the quay or yard or a busy
 * agora or theatre, else theft. With the new kinds off, only theft (as slice 30).
 */
export function crimeFor(s: SimState, size: number, b: Building, t: Temptation): CrimeChoice | null {
  const from = roadsBeside(s, size, b);
  if (from.length === 0) return null;
  const search = roadSearch(s, size, from);
  const theft = pickTarget(s, size, b, search);
  const asTheft: CrimeChoice | null = theft ? { kind: 'theft', target: theft.target, steps: theft.steps, part: -1, why: '' } : null;
  if (!s.crime.kinds) return asTheft;
  const tg = crimeTargets(s, size, b, search);
  const as = (kind: CrimeKind, x: Target | undefined, why: string): CrimeChoice | null => (x ? { kind, target: x.target, steps: x.steps, part: x.part, why } : null);
  const poor = poorHome(b);
  const order = [
    aggrieved(s, b, t) && arsonOpen(s, b) ? as('arson', tg.arson, 'the most aggrieved in the quarter') : null,
    (t.mood ?? 3) <= 1 && t.idle ? as('vandal', tg.vandal, 'angry and idle') : null,
    t.envy ? asTheft : null,
    poor ? as('smuggling', tg.smuggling, `poor, and ${tg.smuggling?.target.kind === 'yard' ? 'the caravan yard' : 'the quay'} close by`) : null,
    poor ? as('pickpocket', tg.pickpocket, `poor, and the ${tg.pickpocket?.target.kind === 'theatre' ? 'theatre' : 'agora'}’s crowds close by`) : null,
    asTheft,
  ];
  return order.find((c) => c !== null) ?? null;
}

/** How many criminals of a kind are out (a gang's men not counted: they have their own). */
export const kindOut = (s: SimState, kind: CrimeKind): number => s.walkers.filter((w) => w.people > 0 && w.kind === CRIMINAL_OF[kind] && !gangOf(s, w)).length;

/** A full home turns to its crime: talk of burning, or one of them slips out (once the kind's cap allows). */
function turnTo(s: SimState, map: CoastMap, b: Building, t: Temptation, day: number): void {
  // (A den sends its men on the gang's own clock: gangs.ts.)
  if (denOf(s, b) || s.walkers.some((w) => isCriminal(w.kind) && w.home === b.id && w.people > 0)) return;
  // (When every crime its trouble could point to already has its walkers out, crimeFor's choice would only be turned away
  // below: skip its road search, a day's work for each full home in a town at its caps. Talk of burning has no cap.)
  const capped = (k: CrimeKind): boolean => kindOut(s, k) >= KIND_OUT[k];
  const poor = poorHome(b);
  if (!(aggrieved(s, b, t) && arsonOpen(s, b)) && capped('theft') && (!((t.mood ?? 3) <= 1 && t.idle) || capped('vandal')) && (!poor || (capped('smuggling') && capped('pickpocket')))) return;
  const c = crimeFor(s, map.size, b, t);
  if (!c) return;
  if (c.kind === 'arson') {
    startTalk(s, map, b, t);
    return;
  }
  if (kindOut(s, c.kind) >= KIND_OUT[c.kind]) return;
  setOutAs(s, map.size, b, c, day, true);
}

/** One of the household slips out for a crime (null if no road joins them); `own`: their temptation spent (false for a gang's man). */
export function setOutAs(s: SimState, size: number, b: Building, c: Pick<CrimeChoice, 'kind' | 'target' | 'part'>, day: number, own: boolean): Walker | null {
  if (c.kind === 'theft' && own) return setOut(s, size, b, c.target, day);
  const w = newWalker(s, CRIMINAL_OF[c.kind], 1);
  w.home = b.id;
  w.origin = b.id;
  w.target = c.target.id;
  // (A vandal's `food` is the part he means to smash: see Broken.)
  w.food = c.kind === 'vandal' ? c.part : -1;
  w.cheese = whoGoes(s, b, day);
  w.since = s.tick;
  if (w.cheese < 0) {
    s.nextId--;
    return null;
  }
  if (!walkBetween(s, size, w, b, c.target)) return null;
  s.walkers.push(w);
  if (own) b.tempt = 0;
  s.rev++;
  return w;
}

/** Where a place is, for the news: "by the bay". */
export const whereOf = (map: CoastMap, b: Building): string => {
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

/** Slice 33: what a thief carrying the treasury's coin (from the tax office) has in `food`; any other coin is -1. */
export const TREASURY_COIN = -2;

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
    // (Slice 33: marked as the treasury's, so a catch hands it back there even if the office has gone since.)
    w.food = TREASURY_COIN;
    w.load = coin;
    tl.coin += coin;
  } else return;
  t.robbedAt = s.tick;
  tl.thefts++;
  // (Slice 45: the month's rate.)
  countCrime(s, 'theft');
  tellNews(s, 'theft', `A thief robbed ${placeOf(t)} ${whereOf(map, t)}: ${lootWords(w)}`, t.id);
  s.rev++;
}

/** Home with the loot: the household's story, and stolen food or goods on their table. */
function arriveHome(s: SimState, w: Walker, home: Building): void {
  // (Slice 41: the other kinds' homecomings: misdeeds.ts.)
  if (w.kind !== 'thief') return criminalHome(s, w, home);
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
    // (Slice 41: each kind does its own deed at the door: misdeeds.ts.)
    if (w.kind === 'thief') steal(s, map, w);
    else act(s, map, w);
    const t = findBuilding(s, w.target);
    w.back = true;
    if (!t || !walkBetween(s, size, w, t, home, position(w))) return false;
    return true;
  }
  // (Slice 41: a pickpocket working the crowd sidles slowly.)
  let move = w.kind === 'pickpocket' && w.steps === 1 && !w.back ? MINGLE_SPEED : THIEF_SPEED;
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
    // Slice 41: a pickpocket works the crowd first, sidling round the place's edge.
    if (w.kind === 'pickpocket' && w.steps === 0) {
      w.steps = 1;
      if (mingle(s, size, w, t)) return true;
    }
    w.wait = BREAK_IN;
    return true;
  }
  // At his own door, with the watchman after him: he waits there, caught.
  if (chased(s, w)) return true;
  arriveHome(s, w, home);
  return false;
}

/** Slice 41: how fast a pickpocket sidles through a crowd (half a patrol's pace). */
export const MINGLE_SPEED = 0.09;

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
    // (Slice 41: every kind of criminal, but not a gang's man who has beaten this watchman off.)
    if (!isCriminal(t.kind) || t.people <= 0 || (t.meat > 0 && t.meat !== w.id && chased(s, t)) || t.meat === -w.id) continue;
    // (Slice 45: a gang's man who has beaten off a watchman is known to the watch: a lone watchman runs after him only with a second to help.)
    if (t.meat < 0 && s.crime.kinds && gangOf(s, t) && lone(s, w) && !helperFor(s, size, w, t)) continue;
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

/**
 * The road tile a runner is nearest: the nearer end of the stretch he is on. (Review of slice 40: roadUnder gives the
 * tile at the stretch's start, often the one behind him, and a chase planned afresh every CHASE_REPLAN ticks from there
 * sent him back to it each time: in #empire a watchman ran to and fro on one spot for months while his thief waited at
 * his own door.)
 */
function roadNearest(s: SimState, w: Walker): number {
  const a = w.tiles[w.seg];
  const b = w.tiles[w.seg + 1];
  const ok = (t: number | undefined): t is number => t !== undefined && t >= 0 && s.tiles[t] === TILE_ROAD;
  if (!ok(a) || !ok(b)) return roadUnder(s, w);
  const i = w.seg * 2;
  return w.along * 2 > dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]) ? b : a;
}

/** Plan the chaser's way to where the thief is now (false if he can't be reached). */
function planChase(s: SimState, size: number, w: Walker, thief: Walker): boolean {
  const from = roadNearest(s, w);
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

/** Caught: the loot goes back, the household pays its fine and hears of it, and the town too. (Slice 45: `court`, walked to the court instead: the loot back and the household told, no fine on the spot; justice.ts tells the town.) */
export function catchThief(s: SimState, map: CoastMap, thief: Walker, court = false): void {
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
    } else if (thief.food === TREASURY_COIN || (thief.food < 0 && t?.kind === 'taxoffice')) {
      // (Only the tax office's coin goes back to the treasury. Review of slice 30: a purse from a home burnt or
      // cleared since went there too, coin the treasury never had. Slice 33: the office's coin goes back even
      // when the office has been cleared or burnt since.)
      income(s, thief.load, 'recovered', 'from a thief');
      tl.coin -= thief.load;
    } else if (thief.food < 0) {
      tl.coin -= thief.load;
    } else if (t && (t.kind === 'granary' || t.kind === 'storehouse')) {
      const back = Math.min(thief.load, Math.max(0, roomOf(t.kind, thief.food) - held(t, thief.food)));
      setHeld(t, thief.food, held(t, thief.food) + back);
      note(s, thief.food, 'lost', 'Stolen by thieves', -back);
      tl.goods -= back;
    }
  }
  if (court) {
    tl.caught++;
    if (home?.family) {
      tell(s, home.family, 'caught', home.level, [name, 'theft', 'court']);
      home.family.story[home.family.story.length - 1].n = 0;
    }
    return;
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
  const thief = s.walkers.find((o) => o.id === w.meat && isCriminal(o.kind) && o.people > 0) ?? null;
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
  if (near()) return lay(s, map, w, thief);
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
  if (near()) return lay(s, map, w, thief);
  return true;
}

/** Slice 41: he lays hands on him: caught (then on as after a fire), or beaten off by a gang's man (then home). */
function lay(s: SimState, map: CoastMap, w: Walker, thief: Walker): boolean {
  // (Slice 45: walking him to the court, or back to his round.)
  if (caught(s, map, thief, w)) return escorting(s, w) ? true : giveUp(s, map, w, null);
  w.meat = 0;
  w.wait = 0;
  const post = findBuilding(s, w.origin);
  if (!post || post.kind !== 'watchpost') return false;
  const from = roadUnder(s, w);
  if (from >= 0 && headHome(s, map.size, w, post, from, position(w))) return true;
  return endRound(WATCH, post);
}

/**
 * Slice 41: the one place where what happens to a criminal the watchman lays
 * hands on is decided (slice 45 hands the caught to a court from here). A
 * gang's man with no second watchman near beats him off (false: he goes on);
 * otherwise he is caught: the loot goes back and the household pays its fine
 * (a thief as slice 30, the other kinds in misdeeds.ts).
 */
export function caught(s: SimState, map: CoastMap, criminal: Walker, watchman: Walker): boolean {
  const gang = gangOf(s, criminal);
  // (Slice 45: two watchmen together always win: another after the same man counts wherever he is.)
  if (gang && lone(s, watchman) && !s.walkers.some((o) => o !== watchman && o.kind === 'watchman' && o.people > 0 && o.meat === criminal.id)) {
    beatenOff(s, map, criminal, watchman, gang);
    return false;
  }
  rateNow(s).caught++;
  // Slice 45: a court at work within reach: the loot goes back, and the watchman walks him there to be tried.
  const from = roadNearest(s, watchman);
  const court = s.buildings.some((b) => b.kind === 'court') ? courtFor(s, map.size, from) : null;
  if (court) {
    if (criminal.kind === 'thief') catchThief(s, map, criminal, true);
    else catchOther(s, map, criminal, true);
    toCourt(s, map, criminal, watchman, court.court, court.search, from, !!gang);
    return true;
  }
  if (criminal.kind === 'thief') catchThief(s, map, criminal);
  else catchOther(s, map, criminal);
  return true;
}

/** A gang's man beats off a lone watchman: he goes on his way, and the watchman won't run after him again. */
function beatenOff(s: SimState, map: CoastMap, criminal: Walker, watchman: Walker, gang: Gang): void {
  criminal.meat = -watchman.id;
  tally(s).beaten++;
  const home = findBuilding(s, criminal.home);
  const at = home ?? findBuilding(s, criminal.target);
  tellNews(s, 'beaten', `${gang.name[0].toUpperCase()}${gang.name.slice(1)}’s men beat off a lone watchman ${at ? whereOf(map, at) : 'in the city'}, and ${thiefName(home, criminal)} got away. Two watch posts within reach of their den would break the gang up`, home?.id ?? 0);
  s.rev++;
}

/**
 * A watchman's tick (sim.ts calls this in place of moveWatchman): with crime
 * on, after a thief he has seen, or on his round looking round for one;
 * otherwise his round and his fires as ever.
 */
export function moveWatch(s: SimState, map: CoastMap, w: Walker): boolean {
  if (!s.crime.on) return moveWatchman(s, map, w);
  // Slice 45: walking one of the caught to the court.
  if (w.meat > 0) {
    const convict = escorting(s, w);
    // (One who ran to help: the other walks him to the court, and he goes back to his round.)
    if (convict && convict.meat !== w.id) return giveUp(s, map, w, null);
    if (convict) {
      escort(s, map, w, convict);
      return true;
    }
    return chase(s, map, w);
  }
  if (w.target === 0 && (s.tick + w.id) % LOOK_EVERY === 2 && s.walkers.some((o) => isCriminal(o.kind) && o.people > 0)) {
    const thief = thiefInSight(s, map.size, w, roadUnder(s, w));
    if (thief && startChase(s, map, w, thief)) {
      // Slice 45: a watchman of a post in reach of his runs after him too (with the new kinds' switch).
      if (s.crime.kinds) callHelp(s, map, w, thief);
      return chase(s, map, w);
    }
  }
  return moveWatchman(s, map, w);
}

/** Slice 45: how far (tiles, as the crow flies) a watchman of a post in reach can be from the criminal to come and help. */
export const HELP_SIGHT = 16;

/** Slice 45: a free watchman of a post in reach of this one's who could run after this criminal too (null: none). */
export function helperFor(s: SimState, size: number, w: Walker, thief: Walker): Walker | null {
  const post = findBuilding(s, w.origin);
  if (!post || post.kind !== 'watchpost') return null;
  const [tx, tz] = position(thief);
  for (const o of s.walkers) {
    if (o === w || o.kind !== 'watchman' || o.people <= 0 || o.meat !== 0 || o.target !== 0) continue;
    const [ox, oz] = position(o);
    if (Math.abs(ox - tx) > HELP_SIGHT || Math.abs(oz - tz) > HELP_SIGHT || dhypot(ox - tx, oz - tz) > HELP_SIGHT) continue;
    const op = findBuilding(s, o.origin);
    if (!op || op.kind !== 'watchpost' || !postsInReach(s, size, post, op)) continue;
    const from = roadNearest(s, o);
    const to = roadUnder(s, thief);
    if (from < 0 || to < 0) continue;
    const d = roadSearch(s, size, [to]).dist[from];
    if (d < 0 || d > CHASE_MAX * 1.5) continue;
    return o;
  }
  return null;
}

/** Slice 45: the sergeant's call: a watchman of a post in reach joins the chase. */
function callHelp(s: SimState, map: CoastMap, w: Walker, thief: Walker): void {
  const o = helperFor(s, map.size, w, thief);
  if (!o) return;
  o.meat = thief.id;
  o.back = false;
  o.target = 0;
  if (!planChase(s, map.size, o, thief)) o.meat = 0;
}
