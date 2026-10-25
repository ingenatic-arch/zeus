/**
 * The court and the prison (slice 45): what happens to the caught.
 *
 * With no court the caught are fined on the spot, as slice 30 has it. With a
 * court at work (a magistrate and his jurors: its workers), reachable by road
 * from where a watchman lays hands on a criminal, `caught()` in crime.ts hands
 * him here instead: the loot goes back, and the criminal becomes a **convict**
 * (a walker of his own, hands bound) whom the watchman walks to the court, the
 * convict a step behind him (`toCourt`, `moveConvict`, `escort`). At the
 * court's door he is handed in (a case), and the watchman goes back to his
 * round. He is tried TRIAL_DAYS later (a court with nobody at work tries
 * nobody until it has someone), and sentenced by **the law** (`crime.law`),
 * a punishment for each kind of crime and for a gang's men:
 *
 * - a **fine**, as slice 30's;
 * - the **stocks**: a day pinned in the agora nearest his home, for all to see
 *   (`crime.stocks`); homes round that agora remember it for a month;
 * - **prison**: PRISON_MONTHS behind bars (`crime.held`), his household a
 *   worker short;
 * - **hard labour**: LABOUR_MONTHS as an unpaid hand at a quarry or copper
 *   mine (labour.ts puts him to work there, treasury.ts pays him no wage);
 * - **exile**: the whole household walks out of the city, its home left empty;
 * - **execution**: he drinks hemlock in the court's cell; his household
 *   mourns, the city is sombre, and kind rulers think less of you.
 *
 * Each punishment deters (temptationOf in crime.ts reads `deterrence`) and
 * costs (the moods in folk.ts read `crime.held`, `crime.cut` and the
 * household's story). Without what it needs (an agora, a prison, a quarry or
 * mine) a punishment falls back to the next (labour to prison, the rest to a
 * fine), and the town hears why.
 *
 * **The prison** holds CELLS prisoners. Overfull, or with fewer than half its
 * guards, its unrest rises (`crime.jails`); at UNREST_WARN the town hears of
 * it, and at UNREST_BREAK the prisoners break out and run home as criminals,
 * whom a watchman can catch again.
 *
 * **The crime rate**: each kind's crimes are counted month by month
 * (`crime.rate`, closed into `crime.rates` on the first of the month, with
 * the city's people then), for the court's panel and the overview.
 *
 * Nothing here moves without a court, a prison or a case: a town that has
 * none plays exactly as it did. Every chance is a hash of the seed (hazards.ts,
 * unit), never a draw from the state's generators.
 *
 * Walker fields for a convict: `home` his home, `cheese` which member of the
 * household he is, `target` and `origin` the court, `steps` his crime (its
 * index in CRIME_KINDS), `food` 1 for a gang's man, `meat` the watchman
 * walking him, `since` when he was caught.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { around, centreOf, COTTAGE, findBuilding, FINE, HUT, jobsAt, livedIn, recountPopulation, TOWNHOUSE } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { CRIME_KINDS, crimeOfWalker, CRIMINAL_OF, KIND_NAME, pronouns, tally, tellNews, thiefName, thiefWho, THIEF_FINE, walkBetween, whereOf, type CrimeKind } from './crime';
import { ageOf, tell } from './folk';
import { news } from './diplomacy';
import { rulerShort } from './world';
import { awayAt, rateOf } from './labour';
import { roadSearch, tracePath, type Search } from './roads';
import { distFrom, door, roadsBeside } from './rounds';
import { unit, WATCH_RANGE } from './hazards';
import { sendLeavers } from './settlers';
import { TILE_ROAD, type Building, type SimState, type Story, type Walker } from './state';
import { income } from './treasury';
import { centre, PATROL_SPEED, position, setPath } from './walk';

// ---------------------------------------------------------------------------
// The law.

/** What the court can sentence the caught to. */
export type Punishment = 'fine' | 'stocks' | 'prison' | 'labour' | 'exile' | 'execution';
export const PUNISHMENTS: readonly Punishment[] = ['fine', 'stocks', 'prison', 'labour', 'exile', 'execution'];
/** The law's rows: each kind of crime the watch catches, and a gang's men (whatever they were caught at). */
export type LawRow = CrimeKind | 'gang';
/** What one at court or serving was caught at: a kind of crime, or skimming a tax office's takings (the law's row for theft). */
export type CaseKind = CrimeKind | 'skimming';
export const CASE_KINDS: readonly CaseKind[] = ['theft', 'pickpocket', 'vandal', 'arson', 'smuggling', 'skimming'];
/** The law's row for a case. */
export const rowOf = (kind: CaseKind, gang: boolean): LawRow => (gang ? 'gang' : kind === 'skimming' ? 'theft' : kind);
/** A case's crime, in words: "theft", "skimming the takings". */
export const crimeWords = (kind: CaseKind, gang: boolean): string => (kind === 'skimming' && !gang ? 'skimming the takings' : CRIME_FOR[rowOf(kind, gang)]);
/** The one caught, in a word: "thief", "crooked collector". */
export const caseName = (kind: CaseKind): string => (kind === 'skimming' ? 'crooked collector' : KIND_NAME[kind]);
/** "Lykon of the house of Nikias", or "Nikias, the head of the house" (just the name with no household). */
export const memberWho = (name: string, house: string | undefined): string => (!house ? name : name === house ? `${name}, the head of the house` : `${name} of the house of ${house}`);
export const LAW_ROWS: readonly LawRow[] = ['theft', 'pickpocket', 'vandal', 'arson', 'smuggling', 'gang'];
export type Law = Record<LawRow, Punishment>;
/** The law a new court starts with. */
export const defaultLaw = (): Law => ({ theft: 'stocks', pickpocket: 'stocks', vandal: 'stocks', arson: 'prison', smuggling: 'fine', gang: 'prison' });

/** One of the caught, waiting at a court for the trial. */
export interface Case {
  home: number;
  /** Who (the household member's name) and whether a woman. */
  name: string;
  female: boolean;
  kind: CaseKind;
  /** One of a gang's men (the law's 'gang' row). */
  gang: boolean;
  court: number;
  since: number;
  /** The day of the trial (put off a day at a time while the court has nobody at work). */
  trial: number;
}

/** One serving a sentence away from home: in a prison, or at hard labour at a quarry or mine. */
export interface Held {
  home: number;
  name: string;
  female: boolean;
  kind: CaseKind;
  gang: boolean;
  /** The household's level when sentenced (the class whose mood hard labour sours). */
  level: number;
  as: 'prison' | 'labour';
  /** The prison, quarry or mine. */
  at: number;
  since: number;
  until: number;
}

/** One pinned in the stocks at an agora, for a day (kept a month after, for the quarter's memory of it). */
export interface Pinned {
  home: number;
  name: string;
  female: boolean;
  kind: CaseKind;
  at: number;
  since: number;
  until: number;
}

/** A prison's unrest (0 to UNREST_BREAK), and when the town was warned of it (0: not yet). */
export interface Jail {
  at: number;
  unrest: number;
  warned: number;
}

/** A month's crime: each kind's count (RATE_KINDS), the caught, the tried, and the city's people at the month's end. */
export interface RateMonth {
  month: number;
  people: number;
  n: number[];
  caught: number;
  tried: number;
}

/** The last execution or exile (for the city's and the poor's moods after it). */
export interface Cut {
  tick: number;
  what: '' | 'execution' | 'exile';
  /** Who: "Lykon of the house of Nikias", "the house of Nikias". */
  who: string;
}

/** The kinds of crime the monthly rate counts: the five the watch catches, and the tax collector's skimming. */
export const RATE_KINDS = ['theft', 'pickpocket', 'vandal', 'arson', 'smuggling', 'skimming'] as const;
export type RateKind = (typeof RATE_KINDS)[number];
/** How many closed months the rate keeps (two years: the overview's charts). */
export const RATES_KEPT = 24;

/** Slice 45's fields in `crime` (crime.ts's freshCrime, migrate.ts's fromSlice45). */
export function freshJustice(): { law: Law; cases: Case[]; held: Held[]; stocks: Pinned[]; jails: Jail[]; rate: RateMonth; rates: RateMonth[]; cut: Cut } {
  return { law: defaultLaw(), cases: [], held: [], stocks: [], jails: [], rate: freshRate(0), rates: [], cut: { tick: 0, what: '', who: '' } };
}
export const freshRate = (month: number): RateMonth => ({ month, people: 0, n: RATE_KINDS.map(() => 0), caught: 0, tried: 0 });

/** Days from being handed in to the trial. */
export const TRIAL_DAYS = 3;
/** The stocks: a day pinned; the quarter round the agora remembers it a month, within this many tiles. */
export const STOCKS_DAYS = 1;
export const STOCKS_MEMORY = TICKS_PER_MONTH;
export const STOCKS_TILES = 12;
/** Months in prison, and at hard labour. */
export const PRISON_MONTHS = 4;
export const LABOUR_MONTHS = 6;
/** A prison's cells. */
export const CELLS = 8;
/** Unrest: the warning, and the breakout. */
export const UNREST_WARN = 50;
export const UNREST_BREAK = 100;
/** How much unrest a day for each prisoner over the cells, for being short of guards (fewer than half), and how much it calms a day otherwise. */
export const UNREST_CROWD = 4;
export const UNREST_SHORT = 5;
export const UNREST_CALM = 4;
/** How far (steps by road) a watchman walks a convict to the court; further, and he is fined on the spot. */
export const ESCORT_MAX = 90;
/** How much each punishment holds a home back (temptation's reasons; a fine only deters a tent or a hut). */
export const DETER: Readonly<Record<Punishment, number>> = { fine: 1, stocks: 1, prison: 2, labour: 2, exile: 3, execution: 4 };
/** One stood in the stocks at the agora lately: how much more that holds back homes round it. */
export const STOCKS_SEEN = 2;
/** What kind rulers (generous or pious) think of an execution and an exile, fading over a year. */
export const EXECUTION_MOOD = -8;
export const EXILE_MOOD = -4;
export const CUT_FADE = 12 * TICKS_PER_MONTH;
/** How long the city is sombre after an execution, and the poor grumble after an exile. */
export const CUT_MOOD = 2 * TICKS_PER_MONTH;

/** In words: "a fine", "the stocks", "prison", "hard labour", "exile", "execution". */
export const PUNISHMENT_NAMES: Readonly<Record<Punishment, string>> = { fine: 'a fine', stocks: 'the stocks', prison: 'prison', labour: 'hard labour', exile: 'exile', execution: 'execution' };
/** The law's rows in words: "thieves", "pickpockets", "a gang's men". */
export const ROW_NAMES: Readonly<Record<LawRow, string>> = { theft: 'thieves', pickpocket: 'pickpockets', vandal: 'vandals', arson: 'arsonists', smuggling: 'smugglers', gang: 'a gang’s men' };
/** "for theft", "for picking pockets". */
export const CRIME_FOR: Readonly<Record<LawRow, string>> = { theft: 'theft', pickpocket: 'picking pockets', vandal: 'vandalism', arson: 'arson', smuggling: 'smuggling', gang: 'running with a gang' };

/** What each punishment does, deters and costs, and what it suits: the court's panel. */
export const PUNISHMENT_WORDS: Readonly<Record<Punishment, { does: string; deters: string; costs: string; suits: string }>> = {
  fine: { does: 'Coin from the household, as without a court', deters: 'Weak: only a tent or a hut feels it, the rich hardly at all', costs: 'Nothing but the household’s purse', suits: 'Small crimes, and a gentle town' },
  stocks: { does: 'A day pinned in the stocks at the agora, for all to see', deters: 'Strong round that agora for a month, a little everywhere', costs: 'The household’s shame (its mood falls for two months)', suits: 'Pickpockets and vandals' },
  prison: { does: `${PRISON_MONTHS} months behind bars`, deters: 'Strong', costs: 'The household loses a worker; it needs a prison, and a crowded one is restless', suits: 'Thieves, smugglers and a gang’s men' },
  labour: { does: `${LABOUR_MONTHS} months cutting stone or digging copper, unpaid`, deters: 'Strong', costs: 'Fills a job for nothing, but the class he comes from is sore while he labours', suits: 'Where hands are short at the quarry or the mine' },
  exile: { does: 'The whole household is banished; its home stands empty', deters: 'Very strong', costs: 'The poor grumble, and kind rulers hear of it', suits: 'A gang’s men and arsonists' },
  execution: { does: 'Hemlock, as the law commands, told plainly', deters: 'The strongest of all', costs: 'The household mourns, the whole city is sombre for two months, and kind rulers think less of you', suits: 'Arsonists and a gang’s men only: far too harsh for a pickpocket' },
};

/** Set one row of the law (the `law` command). */
export function lawCommand(s: SimState, crime: string, punishment: string): void {
  if (!(LAW_ROWS as readonly string[]).includes(crime) || !(PUNISHMENTS as readonly string[]).includes(punishment)) return;
  const row = crime as LawRow;
  if (s.crime.law[row] === punishment) return;
  s.crime.law[row] = punishment as Punishment;
  s.rev++;
}

// ---------------------------------------------------------------------------
// The rate.

/** This month's rate record (closing the last into `rates` if the month has turned). */
export function rateNow(s: SimState): RateMonth {
  const c = s.crime;
  const m = Math.floor(s.tick / TICKS_PER_MONTH);
  if (c.rate.month !== m) {
    if (c.rate.n.some((x) => x > 0) || c.rate.caught > 0 || c.rate.tried > 0 || c.rates.length > 0) {
      c.rate.people = s.population;
      c.rates.push(c.rate);
      if (c.rates.length > RATES_KEPT) c.rates.splice(0, c.rates.length - RATES_KEPT);
    }
    c.rate = freshRate(m);
  }
  return c.rate;
}

/** A crime of this kind happened (for the monthly rate). */
export function countCrime(s: SimState, kind: RateKind): void {
  rateNow(s).n[RATE_KINDS.indexOf(kind)]++;
}

/** Crimes per thousand people in a month (the city's people as it closed, or now for this month). */
export const perThousand = (r: RateMonth, people: number): number => (people > 0 ? (1000 * r.n.reduce((a, b) => a + b, 0)) / people : 0);

// ---------------------------------------------------------------------------
// Who is away.

/** How many of a household are away at court, in prison or at hard labour (they can't work at home's jobs). */
export const awayFrom = (s: SimState, b: Building): number => awayAt(s, b);

/** Is this member of the household away (at court, in prison, at hard labour) or out walking as a convict? */
export function isAway(s: SimState, b: Building, name: string): boolean {
  const c = s.crime;
  return c.cases.some((x) => x.home === b.id && x.name === name) || c.held.some((x) => x.home === b.id && x.name === name) || s.walkers.some((w) => w.kind === 'convict' && w.home === b.id && thiefName(b, w) === name);
}

// ---------------------------------------------------------------------------
// Deterrence.

/** What a court's town has, for the law's deterrence (crime.ts's moodCtx works it out once). */
export interface LawCtx {
  court?: boolean;
  prison?: boolean;
  labour?: boolean;
  agora: boolean;
}

/** The punishment the court would give for a row now, with what it needs to hand (labour falls back to prison, the rest to a fine), and why it fell back ('' if it didn't). */
export function punishmentFor(s: SimState, row: LawRow, ctx: LawCtx): { p: Punishment; why: string } {
  let p = s.crime.law[row];
  let why = '';
  if (p === 'labour' && !ctx.labour) {
    why = 'no quarry or copper mine with a job to labour at';
    p = 'prison';
  }
  if (p === 'prison' && !ctx.prison) {
    why = why ? `${why}, and no prison` : 'no prison';
    p = 'fine';
  }
  if (p === 'stocks' && !ctx.agora) {
    why = 'no agora for the stocks';
    p = 'fine';
  }
  return { p, why };
}

/**
 * The law, holding a home back (temptationOf's reasons): with a court at work,
 * the punishment for the crime its trouble points to (`kind`, worked out
 * cheaply by crime.ts), and one stood in the stocks at an agora near it lately.
 */
export function deterrence(s: SimState, b: Building, kinds: readonly CrimeKind[], ctx: LawCtx): Array<{ text: string; w: number }> {
  if (!ctx.court) return [];
  const out: Array<{ text: string; w: number }> = [];
  // (Of the crimes its trouble could turn it to, the one the law punishes least.)
  let best: { row: LawRow; p: Punishment; w: number } | null = null;
  for (const kind of kinds) {
    const row: LawRow = s.crime.gangs.some((g) => g.den === b.id) ? 'gang' : kind;
    const { p } = punishmentFor(s, row, ctx);
    const w = p === 'fine' ? (b.level <= HUT ? DETER.fine : 0) : DETER[p];
    if (!best || w < best.w) best = { row, p, w };
  }
  if (best && best.w > 0) out.push({ text: `the law: ${PUNISHMENT_NAMES[best.p]} for ${CRIME_FOR[best.row]}`, w: -best.w });
  const seen = stocksSeen(s, b);
  if (seen) out.push({ text: `${seen} stood in the stocks at the agora lately`, w: -STOCKS_SEEN });
  // (Further off, the city heard of it: a little.)
  else if (s.crime.stocks.some((p) => s.tick >= p.since && s.tick - p.since < STOCKS_MEMORY && p.home !== b.id)) out.push({ text: 'someone stood in the stocks lately', w: -1 });
  return out;
}

/** Someone who stood in the stocks within the month at an agora within STOCKS_TILES of a home ('' if none). */
export function stocksSeen(s: SimState, b: Building): string {
  const list = s.crime.stocks;
  if (!list.length) return '';
  const [x, z] = centreOf(b);
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (s.tick < p.since || s.tick - p.since >= STOCKS_MEMORY || p.home === b.id) continue;
    const a = findBuilding(s, p.at);
    if (!a) continue;
    const [ax, az] = centreOf(a);
    if (dhypot(ax - x, az - z) <= STOCKS_TILES) return `a ${caseName(p.kind)}`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// The walk to the court.

/** A court at work that a watchman standing at road tile `from` can walk a convict to (the nearest by road; null: none, or too far). */
export function courtFor(s: SimState, size: number, from: number): { court: Building; search: Search } | null {
  if (from < 0) return null;
  let best: { court: Building; search: Search; d: number } | null = null;
  for (const b of s.buildings) {
    if (b.kind !== 'court' || rateOf(b) <= 0) continue;
    const roads = roadsBeside(s, size, b);
    if (!roads.length) continue;
    const search = roadSearch(s, size, roads);
    const d = search.dist[from];
    if (d < 0 || d > ESCORT_MAX || (best && d >= best.d)) continue;
    best = { court: b, search, d };
  }
  return best ? { court: best.court, search: best.search } : null;
}

/** The pace a watchman walks a convict (his patrol's). */
const escortSpeed = (): number => PATROL_SPEED;

/**
 * Caught, with a court in reach: the criminal becomes a convict, and the
 * watchman walks him there by road, the convict a step behind (crime.ts's
 * caught has already put the loot back).
 */
export function toCourt(s: SimState, map: CoastMap, w: Walker, watchman: Walker, court: Building, search: Search, from: number, gang: boolean): void {
  const size = map.size;
  const way = tracePath(search, from).reverse();
  const here = position(watchman);
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, court, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  setPath(watchman, pts);
  watchman.meat = w.id;
  watchman.target = 0;
  watchman.wait = 0;
  watchman.back = false;
  const mine = position(w);
  const crime = crimeOfWalker(w.kind);
  w.kind = 'convict';
  w.steps = CRIME_KINDS.indexOf(crime);
  w.food = gang ? 1 : 0;
  w.load = 0;
  w.back = false;
  w.wait = 0;
  w.target = court.id;
  w.origin = court.id;
  w.meat = watchman.id;
  w.since = s.tick;
  setPath(w, [[mine[0], mine[1], -1], ...pts]);
  s.rev++;
}

/** A convict's crime. */
export const convictCrime = (w: Walker): CrimeKind => CRIME_KINDS[w.steps] ?? 'theft';

/** One tick along a path at a pace: 'moved', 'end' (at its last point), or 'cut' (the road ahead is gone). */
function advance(s: SimState, w: Walker, speed: number): 'moved' | 'end' | 'cut' {
  let move = speed;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) return 'end';
    const next = w.tiles[w.seg + 1];
    if (next >= 0 && s.tiles[next] !== TILE_ROAD) return 'cut';
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      return 'moved';
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
  }
  return w.seg >= w.path.length / 2 - 1 ? 'end' : 'moved';
}

/** From where a walker stands to a building's door, by road (false: no road joins them). */
function rerouteTo(s: SimState, size: number, w: Walker, to: Building): boolean {
  const roads = roadsBeside(s, size, to);
  if (!roads.length) return false;
  const search = roadSearch(s, size, roads);
  let cur = -1;
  for (let k = Math.min(w.seg + 1, w.tiles.length - 1); k >= 0; k--) {
    const t = w.tiles[k];
    if (t >= 0 && s.tiles[t] === TILE_ROAD && search.dist[t] >= 0) {
      cur = t;
      break;
    }
  }
  if (cur < 0) return false;
  const way = tracePath(search, cur).reverse();
  const here = position(w);
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, to, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  setPath(w, pts);
  return true;
}

/** A convict's tick: on behind the watchman to the court's door, and handed in there. False once he is in (or let go). */
export function moveConvict(s: SimState, map: CoastMap, w: Walker): boolean {
  if (w.people <= 0) return false;
  const court = findBuilding(s, w.target);
  if (!court || court.kind !== 'court') {
    fineInstead(s, w, 'the court is gone');
    return false;
  }
  const r = advance(s, w, escortSpeed());
  if (r === 'cut' && !rerouteTo(s, map.size, w, court)) {
    // (No road to the court any more: handed in where he stands, as if he had got there.)
    handIn(s, map, w, court);
    return false;
  }
  if (r === 'end') {
    handIn(s, map, w, court);
    return false;
  }
  return true;
}

/** Is this watchman walking a convict to the court? */
export const escorting = (s: SimState, w: Walker): Walker | undefined => (w.meat > 0 ? s.walkers.find((o) => o.id === w.meat && o.kind === 'convict' && o.people > 0) : undefined);

/** A watchman walking a convict: on to the court's door, and there he waits until the convict is handed in (then crime.ts sends him back to his round). */
export function escort(s: SimState, map: CoastMap, w: Walker, convict: Walker): void {
  const court = findBuilding(s, convict.target);
  const r = advance(s, w, escortSpeed());
  if (r === 'cut' && court) rerouteTo(s, map.size, w, court);
}

/** Handed in at the court: a case, tried in a few days. */
function handIn(s: SimState, map: CoastMap, w: Walker, court: Building): void {
  const home = findBuilding(s, w.home);
  const kind = convictCrime(w);
  const m = home?.family?.members[w.cheese] ?? home?.family?.members[0];
  const name = thiefName(home, w);
  const gang = w.food === 1;
  w.people = 0;
  if (!home || !home.family || !m) {
    tellNews(s, 'court', `The court ${whereOf(map, court)} let ${KIND_NAME[kind] === 'arsonist' ? 'an' : 'a'} ${KIND_NAME[kind]} go: ${name === 'a stranger' ? 'nobody knew who it was' : 'the household has left the city'}`, court.id);
    s.rev++;
    return;
  }
  const trial = s.tick + TRIAL_DAYS * TICKS_PER_DAY;
  s.crime.cases.push({ home: home.id, name: m.name, female: m.female, kind, gang, court: court.id, since: s.tick, trial });
  const pr = pronouns(home, w);
  tellNews(s, 'court', `${cap(thiefWho(home, w))} was brought before the court ${whereOf(map, court)}, caught ${CAUGHT_AT[kind]}${gang ? ' (one of a gang’s men)' : ''}. ${pr.he === 'she' ? 'She' : 'He'} is tried in about ${TRIAL_DAYS} days: the law says ${PUNISHMENT_NAMES[s.crime.law[gang ? 'gang' : kind]]}`, court.id);
  s.rev++;
}

/**
 * A crooked collector found out: with a staffed court in the city, its clerks
 * check each office's takings, and a collector who keeps some back is summoned
 * (a case like any other, under the law's row for theft). He lives in the
 * nearest home to his office with a grown member free to be him; none, and
 * nobody is summoned. Called from skim (misdeeds.ts) as he keeps it back.
 */
export function collectorCaught(s: SimState, office: Building): void {
  const court = s.buildings.find((b) => b.kind === 'court' && b.workers > 0);
  if (!court) return;
  const [ox, oz] = centreOf(office);
  let home: Building | undefined;
  let who = -1;
  let bd = Infinity;
  for (const b of s.buildings) {
    if (!livedIn(b) || !b.family) continue;
    const [x, z] = centreOf(b);
    const d = dhypot(x - ox, z - oz);
    if (d >= bd) continue;
    const free = b.family.members.map((m, i) => ({ m, i })).filter(({ m }) => ageOf(s, m) >= 16 && ageOf(s, m) <= 60 && !isAway(s, b, m.name));
    if (!free.length) continue;
    bd = d;
    home = b;
    who = free[Math.floor(unit(s.seed, office.id, Math.floor(s.tick / TICKS_PER_DAY), 45) * free.length)].i;
  }
  if (!home || !home.family || who < 0) return;
  const m = home.family.members[who];
  rateNow(s).caught++;
  s.crime.cases.push({ home: home.id, name: m.name, female: m.female, kind: 'skimming', gang: false, court: court.id, since: s.tick, trial: s.tick + TRIAL_DAYS * TICKS_PER_DAY });
  tell(s, home.family, 'caught', home.level, [m.name, 'skimming', 'court']);
  home.family.story[home.family.story.length - 1].n = 0;
  tellNews(s, 'court', `The court’s clerks found the tax office’s takings short: its collector, ${memberWho(m.name, home.family.name)}, is summoned before the court, to be tried in about ${TRIAL_DAYS} days (the law says ${PUNISHMENT_NAMES[s.crime.law.theft]})`, court.id);
  s.rev++;
}

/** Caught at a crime, in words. */
const CAUGHT_AT: Readonly<Record<CaseKind, string>> = { theft: 'stealing', pickpocket: 'picking pockets', vandal: 'smashing things', arson: 'with a torch', smuggling: 'smuggling', skimming: 'skimming the takings' };

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** No court to try him after all: the fine on the spot, as without a court. */
function fineInstead(s: SimState, w: Walker, why: string): void {
  const home = findBuilding(s, w.home);
  const fine = THIEF_FINE[Math.min(home?.level ?? 0, THIEF_FINE.length - 1)];
  if (fine > 0) income(s, fine, 'fines', `${KIND_NAME[convictCrime(w)]}s caught`);
  tally(s).fines += fine;
  w.people = 0;
  tellNews(s, 'sentence', `${cap(thiefWho(home, w))} was let go with a ${fine} dr fine: ${why}`, home?.id ?? 0);
  s.rev++;
}

// ---------------------------------------------------------------------------
// Trials and sentences.

/** What the court's town has to hand for its sentences. */
export function lawCtx(s: SimState): LawCtx {
  const ctx: LawCtx = { agora: false };
  for (const b of s.buildings) {
    if (b.kind === 'agora') ctx.agora = true;
    else if (b.kind === 'court' && b.workers > 0) ctx.court = true;
    else if (b.kind === 'prison') ctx.prison = true;
    else if ((b.kind === 'quarry' || b.kind === 'mine') && !ctx.labour && jobsAt(b) > labourers(s, b).length) ctx.labour = true;
  }
  return ctx;
}

/** The nearest of some buildings to a home (as the crow flies; ties by id). */
function nearest(list: Building[], b: Building): Building | undefined {
  const [x, z] = centreOf(b);
  let best: Building | undefined;
  let bd = Infinity;
  for (const o of list) {
    const [ox, oz] = centreOf(o);
    const d = dhypot(ox - x, oz - z);
    if (d < bd || (d === bd && best && o.id < best.id)) {
      bd = d;
      best = o;
    }
  }
  return best;
}

/** The prisoners in a prison now. */
export const prisoners = (s: SimState, prison: Building): Held[] => s.crime.held.filter((x) => x.as === 'prison' && x.at === prison.id);
/** The convicts at hard labour at a quarry or mine now. */
export const labourers = (s: SimState, b: Building): Held[] => s.crime.held.filter((x) => x.as === 'labour' && x.at === b.id);

/** Where a prisoner goes: the prison with the most room (the fullest still takes him: crowding is its trouble). */
function prisonFor(s: SimState): Building | undefined {
  let best: Building | undefined;
  let room = -Infinity;
  for (const b of s.buildings) {
    if (b.kind !== 'prison') continue;
    const r = CELLS - prisoners(s, b).length;
    if (r > room) {
      room = r;
      best = b;
    }
  }
  return best;
}

/** Where a convict labours: the quarry or copper mine with the most jobs left that convicts don't already fill (none with a job left: undefined). */
function labourFor(s: SimState): Building | undefined {
  let best: Building | undefined;
  let room = 0;
  for (const b of s.buildings) {
    if (b.kind !== 'quarry' && b.kind !== 'mine') continue;
    const r = jobsAt(b) - labourers(s, b).length;
    if (r > room) {
      room = r;
      best = b;
    }
  }
  return best;
}

/** Each day: trials due, sentences served, the stocks' day, each prison's unrest, the month's rate. Nothing at all with no court, case, prisoner or prison. */
export function stepJustice(s: SimState, map: CoastMap): void {
  const c = s.crime;
  if (s.tick % TICKS_PER_DAY === 9) rateNow(s);
  if (!c.cases.length && !c.held.length && !c.stocks.length && !c.jails.length && !s.buildings.some((b) => b.kind === 'prison')) return;
  // The trials due (each case looked at once a day, by its home's id).
  for (const x of [...c.cases]) {
    if ((s.tick + x.home) % TICKS_PER_DAY !== 4 || s.tick < x.trial) continue;
    let court = findBuilding(s, x.court);
    if (!court || court.kind !== 'court') {
      court = s.buildings.find((b) => b.kind === 'court');
      if (court) x.court = court.id;
    }
    if (court && rateOf(court) <= 0) {
      x.trial = s.tick + TICKS_PER_DAY;
      continue;
    }
    c.cases.splice(c.cases.indexOf(x), 1);
    sentence(s, map, x, court ?? null);
  }
  // Sentences served.
  for (const x of [...c.held]) {
    if ((s.tick + x.home) % TICKS_PER_DAY !== 6) continue;
    const at = findBuilding(s, x.at);
    const home = findBuilding(s, x.home);
    const there = !!at && (x.as === 'prison' ? at.kind === 'prison' : at.kind === 'quarry' || at.kind === 'mine');
    if (s.tick >= x.until || !there || !home || !home.family || !home.family.members.some((m) => m.name === x.name)) {
      if (!there && s.tick < x.until && x.as === 'labour' && home?.family) {
        // (His quarry or mine is gone: on to another, or to prison, for the rest of his time.)
        const next = labourFor(s) ?? prisonFor(s);
        if (next) {
          x.at = next.id;
          if (next.kind === 'prison') x.as = 'prison';
          s.rev++;
          continue;
        }
      }
      c.held.splice(c.held.indexOf(x), 1);
      free(s, map, x, there ? '' : x.as === 'prison' ? 'the prison is gone' : 'there is nowhere left to labour');
    }
  }
  // The stocks: each is remembered a month after his day.
  if (c.stocks.length) {
    const before = c.stocks.length;
    c.stocks = c.stocks.filter((p) => s.tick - p.since < STOCKS_MEMORY && !!findBuilding(s, p.at));
    if (c.stocks.length !== before) s.rev++;
  }
  // Each prison's unrest, once a day.
  if (s.tick % TICKS_PER_DAY === 7) stepPrisons(s, map);
}

/** A sentence served (or cut short): home again. */
function free(s: SimState, map: CoastMap, x: Held, why: string): void {
  const home = findBuilding(s, x.home);
  const f = home?.family;
  if (!home || !f || !f.members.some((m) => m.name === x.name)) return;
  const from = x.as === 'prison' ? 'prison' : 'hard labour';
  tell(s, f, 'freed', home.level, [x.name, from]);
  tellNews(s, 'freed', `${memberWho(x.name, f.name)} is home ${whereOf(map, home)} from ${from}${why ? `: ${why}` : `, ${x.as === 'prison' ? PRISON_MONTHS : LABOUR_MONTHS} months on`}`, home.id);
  s.rev++;
}

/** The trial: the law's punishment (or what it falls back to), and what follows. */
function sentence(s: SimState, map: CoastMap, x: Case, court: Building | null): void {
  const home = findBuilding(s, x.home);
  const f = home?.family;
  const m = f?.members.find((p) => p.name === x.name && p.female === x.female);
  const where = court ? whereOf(map, court) : home ? whereOf(map, home) : 'in the city';
  const r = rateNow(s);
  if (!home || !f || !m) {
    tellNews(s, 'sentence', `The court ${where} let ${x.name} go: ${f ? 'nobody of that name lives with the household now' : 'the household has left the city'}`, court?.id ?? 0);
    s.rev++;
    return;
  }
  r.tried++;
  const ctx = lawCtx(s);
  ctx.court = true;
  const row: LawRow = rowOf(x.kind, x.gang);
  const what = crimeWords(x.kind, x.gang);
  const { p, why } = court ? punishmentFor(s, row, ctx) : { p: 'fine' as Punishment, why: 'there is no court any more' };
  const who = memberWho(x.name, f.name);
  const pr = x.female ? { he: 'she', his: 'her', him: 'her', He: 'She', His: 'Her' } : { he: 'he', his: 'his', him: 'him', He: 'He', His: 'His' };
  const instead = why ? ` (the law says ${PUNISHMENT_NAMES[s.crime.law[row]]}, but there is ${why})` : '';
  const fineOf = THIEF_FINE[Math.min(home.level, THIEF_FINE.length - 1)];
  const story = (punishment: Punishment, place: string, n: number): void => {
    tell(s, f, 'sentence', home.level, [x.name, punishment, x.kind, place]);
    f.story[f.story.length - 1].n = n;
  };
  const gang = x.gang ? s.crime.gangs.find((g) => g.den === home.id) : undefined;
  if (p === 'fine') {
    if (fineOf > 0) income(s, fineOf, 'fines', `${caseName(x.kind)}s caught`);
    tally(s).fines += fineOf;
    story('fine', '', fineOf);
    tellNews(s, 'sentence', `The court ${where} fined ${who} ${fineOf} dr for ${what}${instead}`, home.id);
  } else if (p === 'stocks') {
    const agora = nearest(
      s.buildings.filter((b) => b.kind === 'agora'),
      home,
    )!;
    s.crime.stocks.push({ home: home.id, name: x.name, female: x.female, kind: x.kind, at: agora.id, since: s.tick, until: s.tick + STOCKS_DAYS * TICKS_PER_DAY });
    story('stocks', whereOf(map, agora), 0);
    tellNews(s, 'sentence', `The court ${where} sentenced ${who} to a day in the stocks for ${what}${instead}: ${pr.he} stands pinned at the agora ${whereOf(map, agora)} for all to see, and the homes round it will remember it`, agora.id);
  } else if (p === 'prison') {
    const prison = prisonFor(s)!;
    s.crime.held.push({ home: home.id, name: x.name, female: x.female, kind: x.kind, gang: x.gang, level: home.level, as: 'prison', at: prison.id, since: s.tick, until: s.tick + PRISON_MONTHS * TICKS_PER_MONTH });
    story('prison', whereOf(map, prison), PRISON_MONTHS);
    const full = prisoners(s, prison).length > CELLS ? ` The prison holds ${prisoners(s, prison).length} in its ${CELLS} cells` : '';
    tellNews(s, 'sentence', `The court ${where} sent ${who} to prison for ${PRISON_MONTHS} months for ${what}${instead}: the household is a worker short till ${pr.he} is home${full ? `.${full}` : ''}`, prison.id);
  } else if (p === 'labour') {
    const work = labourFor(s)!;
    s.crime.held.push({ home: home.id, name: x.name, female: x.female, kind: x.kind, gang: x.gang, level: home.level, as: 'labour', at: work.id, since: s.tick, until: s.tick + LABOUR_MONTHS * TICKS_PER_MONTH });
    const site = work.kind === 'quarry' ? 'the quarry' : 'the copper mine';
    story('labour', site, LABOUR_MONTHS);
    tellNews(s, 'sentence', `The court ${where} sentenced ${who} to ${LABOUR_MONTHS} months of hard labour at ${site} for ${what}${instead}: ${pr.he} works there unpaid, and ${classWords(home.level)} are sore while ${pr.he} does`, work.id);
  } else if (p === 'exile') {
    exile(s, map, home, who, what, where);
  } else {
    execute(s, home, x, who, what, where);
  }
  // A gang loses its man: exiled or put to death, the gang breaks up; in prison or at labour, it lies low.
  if (gang) {
    if (p === 'exile' || p === 'execution') {
      const gangs = s.crime.gangs;
      if (gangs.includes(gang)) gangs.splice(gangs.indexOf(gang), 1);
      tellNews(s, 'brokenup', `${cap(gang.name)} is broken: its man ${p === 'exile' ? 'exiled with his household' : 'put to death'} by the court`, 0);
    } else if (p === 'prison' || p === 'labour') gang.next = Math.max(gang.next, s.tick + (p === 'prison' ? PRISON_MONTHS : LABOUR_MONTHS) * TICKS_PER_MONTH);
  }
  s.rev++;
}

/**
 * How the court's sentences weigh on a household's mood (folk.ts's moodOf):
 * shamed by one of theirs in the stocks (two months); one of theirs in prison
 * or at hard labour; mourning one put to death (a season); the city sombre
 * after an execution, the poor grumbling after an exile (two months each);
 * and sore while one of their own class labours at a quarry or mine. Nothing
 * at all in a town whose court has sentenced nobody.
 */
export function justiceMoods(s: SimState, b: Building): Array<{ w: number; text: string }> {
  const c = s.crime;
  const out: Array<{ w: number; text: string }> = [];
  const f = b.family;
  if (!f || (!c.held.length && !c.cut.what && !c.stocks.length && !f.story.some((e) => e.what === 'sentence'))) return out;
  let stocks: Story | undefined;
  let death: Story | undefined;
  for (const e of f.story) {
    if (e.what !== 'sentence') continue;
    if (e.names[1] === 'stocks') stocks = e;
    else if (e.names[1] === 'execution') death = e;
  }
  if (death && s.tick - death.tick < 3 * TICKS_PER_MONTH) out.push({ w: -3, text: `Mourning ${death.names[0]}, put to death by the court` });
  if (stocks && s.tick - stocks.tick < 2 * TICKS_PER_MONTH) out.push({ w: -2, text: `Shamed: ${stocks.names[0]} stood in the stocks for all to see` });
  const mine = c.held.find((x) => x.home === b.id);
  if (mine) out.push({ w: -1, text: `${mine.name} is ${mine.as === 'prison' ? 'in prison' : 'at hard labour'}, and missed at home` });
  else if (c.held.some((x) => x.as === 'labour' && sameClass(x.level, b.level))) out.push({ w: -1, text: `Sore that one of ${classWords(b.level)} labours unpaid at the quarry` });
  if (c.cut.what && s.tick - c.cut.tick < CUT_MOOD) {
    if (c.cut.what === 'execution') out.push({ w: -1, text: `The city is sombre: ${c.cut.who} was put to death` });
    else if (b.level <= COTTAGE) out.push({ w: -1, text: `The poor grumble: ${c.cut.who} was exiled` });
  }
  return out;
}

/** "the poor", "the middling houses", "the rich": the class a home's level is of. */
export const classWords = (level: number): string => (level <= COTTAGE ? 'the poor' : level <= FINE ? 'the middling houses' : 'the rich');
/** Is a level of the same class as another (hard labour's mood)? */
export const sameClass = (a: number, b: number): boolean => (a <= COTTAGE) === (b <= COTTAGE) && (a >= TOWNHOUSE && a <= FINE) === (b >= TOWNHOUSE && b <= FINE);

/** Exile: the whole household walks out of the city, its home left empty for newcomers. */
function exile(s: SimState, map: CoastMap, home: Building, who: string, what: string, where: string): void {
  const f = home.family!;
  const people = home.people;
  const name = f.name;
  s.left += people;
  home.people = 0;
  home.family = null;
  home.workers = 0;
  home.unpaid = 0;
  home.tempt = 0;
  // (Any other of theirs at court or serving goes with them.)
  s.crime.cases = s.crime.cases.filter((x) => x.home !== home.id);
  s.crime.held = s.crime.held.filter((x) => x.home !== home.id);
  recountPopulation(s);
  sendLeavers(s, map, people, centreOf(home), around(map.size, home));
  s.crime.cut = { tick: s.tick, what: 'exile', who: `the house of ${name}` };
  const heard = ruled(s, EXILE_MOOD, `you exiled the house of ${name} for ${what}`);
  tellNews(s, 'sentence', `The court ${where} exiled the house of ${name} for ${what} (${who}): all ${people} of them walk out of the city, and their home stands empty. The poor grumble${heard}`, home.id);
}

/** Execution: hemlock in the court's cell. The household mourns, the city is sombre, and kind rulers hear of it. */
function execute(s: SimState, home: Building, x: Case, who: string, what: string, where: string): void {
  const f = home.family!;
  const i = f.members.findIndex((p) => p.name === x.name && p.female === x.female);
  const name = f.name;
  tell(s, f, 'sentence', home.level, [x.name, 'execution', x.kind, '']);
  f.story[f.story.length - 1].n = 0;
  if (i >= 0) {
    f.members.splice(i, 1);
    home.people = Math.max(0, home.people - 1);
    if (f.members.length === 0) home.family = null;
    recountPopulation(s);
  }
  s.crime.cut = { tick: s.tick, what: 'execution', who };
  const heard = ruled(s, EXECUTION_MOOD, `you put ${who} to death for ${what}`);
  tellNews(s, 'sentence', `The court ${where} condemned ${who} to death for ${what}. ${x.female ? 'She' : 'He'} drank the hemlock in the court’s cell, as the law commands. The house of ${name} mourns, and the city is sombre${heard}`, home.id);
}

/** Kind rulers (generous or pious) hear of a harsh sentence and think less of you: ", and King Leon of Sparta thinks less of you" ('' if none). */
function ruled(s: SimState, amount: number, why: string): string {
  const names: string[] = [];
  for (const c of s.world.cities) {
    if (!c.ruler || !c.ruler.traits.some((t) => t === 'generous' || t === 'pious')) continue;
    c.memories.push({ kind: 'harsh', why, amount, tick: s.tick, fade: CUT_FADE });
    names.push(rulerShort(c));
    if (s.world.contact) news(s.world, s.tick, c.id, `${rulerShort(c)} has heard that ${why}, and thinks less of you (${amount})`);
  }
  if (!names.length) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `. Word reaches ${list}: ${names.length === 1 ? 'a kind ruler, who thinks' : 'kind rulers, who think'} less of you`;
}

// ---------------------------------------------------------------------------
// The prisons.

/** A prison's unrest record (made when first needed). */
function jailOf(s: SimState, prison: Building): Jail {
  let j = s.crime.jails.find((x) => x.at === prison.id);
  if (!j) {
    j = { at: prison.id, unrest: 0, warned: 0 };
    s.crime.jails.push(j);
  }
  return j;
}

/** Why a prison is restless, in words ('' if it isn't): "crowded (11 in 8 cells)", "short of guards (2 of 6)". */
export function restlessWords(s: SimState, prison: Building): string {
  const n = prisoners(s, prison).length;
  const out: string[] = [];
  if (n > CELLS) out.push(`crowded (${n} in its ${CELLS} cells)`);
  if (n > 0 && prison.workers < jobsAt(prison) / 2) out.push(`short of guards (${prison.workers} of ${jobsAt(prison)})`);
  return out.join(' and ');
}

/** Days until a restless prison breaks out at today's pace (Infinity if it is calming). */
export function daysToBreak(s: SimState, prison: Building, j: Jail): number {
  const over = Math.max(0, prisoners(s, prison).length - CELLS);
  const short = prisoners(s, prison).length > 0 && prison.workers < jobsAt(prison) / 2;
  const pace = over * UNREST_CROWD + (short ? UNREST_SHORT : 0);
  return pace > 0 ? Math.max(1, Math.ceil((UNREST_BREAK - j.unrest) / pace)) : Infinity;
}

/** A prison past the warning, for the line under the top bar: what is wrong, and how long before the breakout (null if none). */
export function prisonWarning(s: SimState, map: CoastMap): { text: string; at: number } | null {
  for (const j of s.crime.jails) {
    if (j.unrest < UNREST_WARN) continue;
    const prison = findBuilding(s, j.at);
    if (!prison || prison.kind !== 'prison') continue;
    const why = restlessWords(s, prison);
    const d = daysToBreak(s, prison, j);
    return {
      text: `The prison ${whereOf(map, prison)} is ${why || 'still restless'}, its unrest at ${j.unrest}%${d < Infinity ? `: the prisoners break out in about ${d === 1 ? 'a day' : `${d} days`}` : ', calming down'}.${why ? ` ${cap(calmWords(s, prison))} would calm it.` : ''}`,
      at: prison.id,
    };
  }
  return null;
}

/** What would calm a restless prison, in words: "another prison (more room)", "more guards (workers)", or both. */
export function calmWords(s: SimState, prison: Building): string {
  const n = prisoners(s, prison).length;
  const out: string[] = [];
  if (n > CELLS) out.push('more room (another prison)');
  if (n > 0 && prison.workers < jobsAt(prison) / 2) out.push('more guards (workers for this one)');
  return out.join(' or ');
}

/** Once a day each prison: unrest rises while it is crowded or short of guards, and falls otherwise; the warning, then the breakout. */
function stepPrisons(s: SimState, map: CoastMap): void {
  const c = s.crime;
  // (A prison gone: its record goes too.)
  const before = c.jails.length;
  c.jails = c.jails.filter((j) => findBuilding(s, j.at)?.kind === 'prison');
  if (c.jails.length !== before) s.rev++;
  for (const prison of s.buildings) {
    if (prison.kind !== 'prison') continue;
    const n = prisoners(s, prison).length;
    const over = Math.max(0, n - CELLS);
    const short = n > 0 && prison.workers < jobsAt(prison) / 2;
    if (!over && !short && !c.jails.some((j) => j.at === prison.id)) continue;
    const j = jailOf(s, prison);
    const was = j.unrest;
    j.unrest = over || short ? Math.min(UNREST_BREAK, j.unrest + over * UNREST_CROWD + (short ? UNREST_SHORT : 0)) : Math.max(0, j.unrest - UNREST_CALM);
    if (j.unrest !== was) s.rev++;
    if (j.unrest >= UNREST_BREAK) {
      breakOut(s, map, prison, j);
      continue;
    }
    if (j.unrest >= UNREST_WARN && j.warned === 0) {
      j.warned = s.tick;
      tellNews(s, 'unrest', `The prison ${whereOf(map, prison)} is ${restlessWords(s, prison)}, and the guards are restless: unless there is ${calmWords(s, prison)}, the prisoners will break out within about ${Math.max(1, Math.ceil((UNREST_BREAK - j.unrest) / Math.max(1, over * UNREST_CROWD + (short ? UNREST_SHORT : 0))))} days`, prison.id);
    } else if (j.unrest === 0 && j.warned > 0) {
      j.warned = 0;
      tellNews(s, 'unrest', `The prison ${whereOf(map, prison)} is quiet again`, prison.id);
    }
    if (j.unrest === 0 && !over && !short) c.jails.splice(c.jails.indexOf(j), 1);
  }
}

/** The breakout: every prisoner runs home as a criminal of his own crime, whom a watchman can catch again. */
function breakOut(s: SimState, map: CoastMap, prison: Building, j: Jail): void {
  const size = map.size;
  const out = prisoners(s, prison);
  s.crime.held = s.crime.held.filter((x) => !(x.as === 'prison' && x.at === prison.id));
  j.unrest = 0;
  j.warned = 0;
  let ran = 0;
  for (const x of out) {
    const home = findBuilding(s, x.home);
    const f = home?.family;
    const i = f ? f.members.findIndex((m) => m.name === x.name && m.female === x.female) : -1;
    if (!home || !livedIn(home) || !f || i < 0) continue;
    const w = newRunner(s, x.kind === 'skimming' ? 'theft' : x.kind, home, prison, i);
    if (!walkBetween(s, size, w, prison, home)) {
      s.nextId--;
      continue;
    }
    w.back = true;
    s.walkers.push(w);
    ran++;
  }
  tellNews(s, 'breakout', `A breakout at the prison ${whereOf(map, prison)}: ${out.length === 1 ? 'its prisoner broke out' : `its ${out.length} prisoners broke out`}${ran ? ` and ${ran === 1 ? 'runs' : 'run'} for home. A watchman who sees them can catch them again` : ''}`, prison.id);
  s.rev++;
}

/** A prisoner broken out, as a walker of his own crime's kind, at the prison's door. */
function newRunner(s: SimState, kind: CrimeKind, home: Building, prison: Building, member: number): Walker {
  const w: Walker = { id: s.nextId++, kind: CRIMINAL_OF[kind], people: 1, home: home.id, path: [], tiles: [], seg: 0, along: 0, walked: 0, route: 0, origin: home.id, back: true, steps: 0, since: s.tick, target: prison.id, load: 0, food: -1, meat: 0, cheese: member, wait: 0, trail: [], purse: [] };
  return w;
}

// ---------------------------------------------------------------------------
// In words.

/** A convict's hover: who, what for, and where he is being walked. */
export function convictStatus(s: SimState, w: Walker): { title: string; detail: string } {
  const home = findBuilding(s, w.home);
  const court = findBuilding(s, w.target);
  const kind = convictCrime(w);
  const pr = pronouns(home, w);
  const law = s.crime.law[w.food === 1 ? 'gang' : kind];
  return {
    title: 'Caught',
    detail: `Hands bound, head down: ${thiefWho(home, w, 'a stranger')}, caught ${CAUGHT_AT[kind]}${w.food === 1 ? ' (one of a gang’s men)' : ''}, walked by a watchman to the court${court ? '' : ` (it is gone: ${pr.he} will be let go with a fine)`} · tried within days: the law says ${PUNISHMENT_NAMES[law]} · ${pr.he === 'she' ? 'She' : 'He'} goes quietly`,
  };
}

/** A case or a sentence of a household, in a line for its panel ('' if none): "Lykon is at the court by the bay, caught stealing: tried in 2 days". */
export function awayLines(s: SimState, map: CoastMap, b: Building): string[] {
  const out: string[] = [];
  const days = (t: number): string => {
    const d = Math.max(1, Math.ceil(t / TICKS_PER_DAY));
    return d === 1 ? 'a day' : `${d} days`;
  };
  const months = (t: number): string => {
    const m = Math.max(1, Math.round(t / TICKS_PER_MONTH));
    return m === 1 ? 'a month' : `${m} months`;
  };
  for (const w of s.walkers) if (w.kind === 'convict' && w.home === b.id && w.people > 0) out.push(`${thiefName(b, w)} was caught ${CAUGHT_AT[convictCrime(w)]}: a watchman is walking ${pronouns(b, w).him} to the court`);
  for (const x of s.crime.cases) {
    if (x.home !== b.id) continue;
    const court = findBuilding(s, x.court);
    const p = s.crime.law[rowOf(x.kind, x.gang)];
    out.push(`${x.name} is at the court${court ? ` ${whereOf(map, court)}` : ''}, caught ${CAUGHT_AT[x.kind]}: tried ${s.tick >= x.trial ? 'any day now' : `in about ${days(x.trial - s.tick)}`} (the law says ${PUNISHMENT_NAMES[p]})`);
  }
  for (const x of s.crime.held) {
    if (x.home !== b.id) continue;
    const at = findBuilding(s, x.at);
    const where = x.as === 'prison' ? 'in prison' : `at hard labour at ${at?.kind === 'mine' ? 'the copper mine' : 'the quarry'}`;
    out.push(`${x.name} is ${where}${at ? ` ${whereOf(map, at)}` : ''} for ${crimeWords(x.kind, x.gang)}: home in about ${months(x.until - s.tick)}, a worker short till then`);
  }
  for (const p of s.crime.stocks) {
    if (p.home !== b.id || s.tick >= p.until) continue;
    const a = findBuilding(s, p.at);
    out.push(`${p.name} stands in the stocks at the agora${a ? ` ${whereOf(map, a)}` : ''} today, for all to see`);
  }
  return out;
}

/** Who is pinned in the stocks at this agora now (for its tip and the drawing). */
export const pinnedAt = (s: SimState, agora: Building): Pinned[] => s.crime.stocks.filter((p) => p.at === agora.id && s.tick >= p.since && s.tick < p.until);

/** The court's tip lines: its cases, its sentences lately, the law in short. */
export function courtLines(s: SimState, b: Building): string[] {
  const out: string[] = [];
  const cases = s.crime.cases.filter((x) => x.court === b.id);
  const coming = s.walkers.filter((w) => w.kind === 'convict' && w.target === b.id && w.people > 0).length;
  if (b.workers === 0) out.push('No magistrate or jurors at work: it tries nobody, and the watch fines the caught on the spot');
  out.push(cases.length ? `${cases.length === 1 ? 'One case waits' : `${cases.length} cases wait`} for trial${coming ? `, and ${coming === 1 ? 'one more is' : `${coming} more are`} being walked here` : ''}` : coming ? `${coming === 1 ? 'One of the caught is' : `${coming} of the caught are`} being walked here` : 'No case waits for trial');
  const law = LAW_ROWS.map((r) => `${ROW_NAMES[r]} ${PUNISHMENT_NAMES[s.crime.law[r]].replace(/^an? /, '')}`).join(', ');
  out.push(`The law: ${law}`);
  out.push('Click for the court: the law, what each punishment deters and costs, and the cases');
  return out;
}

/** The prison's tip lines: who it holds, its guards, its unrest. */
export function prisonLines(s: SimState, b: Building): string[] {
  const n = prisoners(s, b).length;
  const j = s.crime.jails.find((x) => x.at === b.id);
  const out = [`Holds ${n} of its ${CELLS} cells${n > CELLS ? `: ${n - CELLS} over` : ''} · ${b.workers} of ${jobsAt(b)} guards`];
  const why = restlessWords(s, b);
  if (j && j.unrest >= UNREST_WARN) out.push(`Restless (${j.unrest}%): ${why || 'calming down'}. At 100% the prisoners break out and run home`);
  else if (why) out.push(`Unrest ${j?.unrest ?? 0}%: ${why}. ${cap(calmWords(s, b))} would calm it`);
  out.push('Click for the prison: who it holds, for what, and till when');
  return out;
}

/** Slice 45's lines on other buildings' tips: who stands in an agora's stocks today, and the convicts at hard labour at a quarry or mine. */
export function justiceLines(s: SimState, b: Building): string[] {
  const out: string[] = [];
  if (b.kind === 'agora' && s.crime.stocks.length) {
    for (const p of pinnedAt(s, b)) {
      const home = findBuilding(s, p.home);
      out.push(`${memberWho(p.name, home?.family?.name)} stands in the stocks here today, for ${crimeWords(p.kind, false)}: the homes round the agora remember it for a month`);
    }
  } else if ((b.kind === 'quarry' || b.kind === 'mine') && s.crime.held.length) {
    const n = labourers(s, b).length;
    if (n) out.push(`${n === 1 ? 'One convict labours' : `${n} convicts labour`} here unpaid, sentenced by the court (${n === 1 ? 'he fills a job' : 'they fill jobs'} no wage is paid for)`);
  }
  return out;
}

/** The tip of a watch post: the posts in reach of it, whose watchmen help each other chase (the sergeant's). */
export function sergeantLine(s: SimState, size: number, post: Building): string {
  const n = s.buildings.filter((o) => o !== post && o.kind === 'watchpost' && postsInReach(s, size, post, o)).length;
  return n ? `Its sergeant and ${n === 1 ? 'the watch post' : `the ${n} watch posts`} in reach help each other chase: two watchmen always take a criminal, even a gang’s man` : 'No other watch post is in reach: its watchmen chase alone (a gang’s man beats off a lone watchman)';
}

/** Two watch posts are in reach of each other when a road joins them within the watch's range (hazards.ts's WATCH_RANGE). */
export function postsInReach(s: SimState, size: number, a: Building, b: Building): boolean {
  if (a === b) return true;
  const dist = distFrom(s, size, a);
  return roadsBeside(s, size, b).some((r) => dist[r] >= 0 && dist[r] <= WATCH_RANGE);
}

/** The build tool's lines for a court or a prison about to be placed (roads: whether a road runs beside the spot). */
export function placeLines(s: SimState, kind: 'court' | 'prison', roads: boolean): { lines: string[]; warn: string } {
  const lines: string[] = [];
  let warn = '';
  const courts = s.buildings.filter((b) => b.kind === 'court').length;
  const posts = s.buildings.filter((b) => b.kind === 'watchpost').length;
  if (kind === 'court') {
    lines.push(`Its magistrate and jurors try those the watch catches, by the law you set (click it): a fine, the stocks, prison, hard labour, exile or death for each crime. Without one, the watch fines the caught on the spot`);
    if (courts) lines.push('Another court: each watchman walks the caught to the nearer one');
    if (!posts) lines.push('Nobody is caught without a watch post: build one too (Z twice)');
    else if (!s.crime.on) lines.push('No crime in the city yet: it tries nobody until there is');
    if (!roads) warn = 'No road beside it: the watch couldn’t walk anyone there. Lay a road along one side first.';
  } else {
    lines.push(`Its guards hold up to ${CELLS} prisoners the court sends for ${PRISON_MONTHS} months; more than that, or fewer than half its guards, and it grows restless, and in the end they break out`);
    if (!courts) lines.push('Its prisoners come from a court: build one too (Z ×4)');
    if (!roads) warn = 'No road beside it: its guards couldn’t get there. Lay a road along one side first.';
  }
  return { lines, warn };
}
