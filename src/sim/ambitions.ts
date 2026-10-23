/**
 * Ambitions (slice 39): what the city plays towards. Three ambitions run side
 * by side from the founding, and there is nothing to pick (Oliver's choice,
 * 21 Oct: "chase all three at once"): every town works toward all three, and
 * whatever you do counts toward one of them.
 *
 * - **Master of Greece**: vassals and colonies, an army feared across
 *   Greece; its great monument is the Colossus.
 * - **The great trading city**: routes, trade and the richest treasury; its
 *   great monument is the Lighthouse.
 * - **A city of wonders**: monuments, grand estates and a great population;
 *   its great monument is the Stadium.
 *
 * Each has five milestones, from easy to grand, and each one names exactly
 * what it wants and how far you are ("2 of 3: Corinth, Argos"). A milestone
 * is looked at once a day and, reached, stays reached: a town line, a short
 * fanfare (the page's), a laurel on the panel and a small reward, named on
 * the panel before you reach it: a ruler's gift of coin (it comes by road or
 * sea, as their gifts do), settlers drawn by fame (newcomers come twice as
 * often for a while), or renown (every ruler warmer for a year). The last of
 * each is its great monument standing. All five reached, the ambition is
 * achieved ("Achieved in year 9"), and the city is proud of it for a year;
 * all three achieved is the grand finish, with a word from every ruler. Play
 * goes on after either.
 *
 * The milestones only read what the town already has: vassals (slice 34),
 * the army, routes, the ledger's sales, the treasury against Greece's
 * cities, homes and people, the monuments (slice 35) and the great estates
 * (slice 36, wired in at its merge) and your colonies (slice 37, wired in at
 * its merge).
 *
 * The switch: off in a bare state and while a demo's history is played (so
 * no history changes), on as a game starts or a demo opens. Switched on (and
 * in an older save, on its first tick) it records what the town has already
 * met quietly: no fanfare, no reward, marked as already met. Pure: nothing
 * here draws a random number.
 */
import { PLACES, RULED, type CityId } from '../map/greece';
import { GREAT_ESTATE } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { news, rulerGift, settleMood } from './diplomacy';
import { monumentName, monumentOf, progressOf, STAGE_COUNT, STAGES, type MonumentKind } from './monuments';
import type { SimState, WorldCity } from './state';
import { cityOf, fadeFor, moodOf, rulerName, rulerShort } from './world';
import { achieved, AMBITION_IN, AMBITIONS, laurelOf, MILESTONE_IDS, type AmbitionKind, type Laurel } from './laurels';

// ---------------------------------------------------------------------------
// The record, when an ambition was achieved and the city's pride (laurels.ts, which imports nothing but the clock).

export { achieved, AMBITION_IN, AMBITIONS, freshAmbition, GRAND_MOOD, laurelOf, MILESTONE_IDS, PRIDE_FOR, PRIDE_MOOD, prideMood, type Ambition, type AmbitionKind, type Laurel } from './laurels';

// ---------------------------------------------------------------------------
// The three ambitions and their milestones.

export const AMBITION_NAMES: Record<AmbitionKind, string> = { greece: 'Master of Greece', trade: 'The great trading city', wonders: 'A city of wonders' };
/** What each is about, in a line. */
export const AMBITION_WHAT: Record<AmbitionKind, string> = {
  greece: 'Vassals and colonies, and an army feared across Greece',
  trade: 'Routes, trade and the richest treasury in Greece',
  wonders: 'Monuments, grand estates and a great population',
};
/** Each ambition's great monument, its last milestone. */
export const GREAT_MONUMENT: Record<AmbitionKind, MonumentKind> = { greece: 'colossus', trade: 'lighthouse', wonders: 'stadium' };

/** A milestone's reward: a gift of coin from the warmest ruler, settlers drawn by fame for some months, or every ruler warmer for a year. */
export type Reward = { kind: 'gift'; dr: number } | { kind: 'fame'; months: number } | { kind: 'renown'; mood: number };

/** How far a town is towards a milestone: what it has, what it wants, and the two in words. */
export interface Progress {
  have: number;
  need: number;
  words: string;
}

export interface Milestone {
  id: string;
  ambition: AmbitionKind;
  /** Its name ("Lord of three cities") and what it wants, in a line; and the deed it honours, in words ("your rule over three cities"), for a ruler's gift and renown. */
  name: string;
  want: string;
  deed: string;
  reward: Reward;
  progress: (s: SimState) => Progress;
}

/** Master of Greece: an army of this many men under arms (two full companies). */
export const ARMY_MEN = 32;
/** Lord of this many cities (vassals and colonies together). */
export const LORD_OF = 3;
/** Feared across Greece: your army at least as big as the strongest in Greece, and at least this. */
export const FEARED_LEAST = 40;
/** The great trading city: routes to this many cities; this much sold to the ship and traders in a month; trade with this many cities (Tyre's ship counts). */
export const ROUTE_CITIES = 2;
export const MARKET_DR = 600;
export const TRADE_CITIES = 5;
/** The richest treasury: at least as much as any city of Greece holds, and at least this. */
export const RICHEST_LEAST = 10000;
/** A city of wonders: a town of this many people; this many villas; this many great estates; a great city of this many people. */
export const TOWN_PEOPLE = 300;
export const VILLAS = 20;
export const ESTATES = 2;
export const GREAT_PEOPLE = 2000;
/** Egypt is not Greece: Memphis' army and treasury don't count against "the strongest" and "the richest in Greece". */
const NOT_GREECE: readonly CityId[] = ['memphis'];

/** Settlers drawn by fame come twice as often: the settlers' clock runs a tick more each tick (see stepAmbition). */
export const FAME_PACE = 2;
/** Renown: every ruler warmer for this long (fading). */
export const RENOWN_FADE = TICKS_PER_YEAR;
/** The town line about a laurel stands this long. */
export const LINE_DAYS = 12;

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cityWord = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (cityWord(id).endsWith('s') ? `${cityWord(id)}’` : `${cityWord(id)}’s`);
const list = (names: string[]): string => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** Your men under arms, ready or away (your own companies and hirelings, not allies' companies; not the wounded). */
export function menUnderArms(s: SimState): number {
  const own = new Set(s.army.companies.filter((c) => !c.ally).map((c) => c.id));
  let n = 0;
  for (const x of s.army.soldiers) if (own.has(x.company) && (x.state === 'ready' || x.state === 'away')) n++;
  return n;
}

/** Your vassals' cities, in the order they bowed. */
export const vassalCities = (s: SimState): CityId[] => s.empire.vassals.map((v) => v.city);

/**
 * Your colonies (slice 37, wired at its merge): the colonies you hold, by
 * their names ("Nea Thasos"), in the order they were founded. One that went
 * free or was taken is no longer yours, and no longer counts.
 */
export function colonyNames(s: SimState): string[] {
  return s.empire.colonies.filter((c) => s.world.sites.some((x) => x.id === c.site && x.owner === 'home')).map((c) => c.name);
}

/** Your great estates (slice 36, wired at its merge): the estates at the great estate's level with their noble house in. */
export function greatEstates(s: SimState): number {
  return s.buildings.reduce((a, b) => a + (b.kind === 'home' && b.estate && b.level === GREAT_ESTATE && b.people > 0 ? 1 : 0), 0);
}

/** The cities of Greece whose army or treasury counts against yours: ruled, peopled, not yours, not Egypt. */
const rivalsOf = (s: SimState): WorldCity[] => s.world.cities.filter((c) => c.id !== 'home' && c.ruler && c.pop > 0 && c.lord !== 'home' && !NOT_GREECE.includes(c.id));

/** The cities you trade with: your routes' (by name), and Tyre's if her ship has called at your trading post. */
export function tradingCities(s: SimState): string[] {
  const out: string[] = [];
  for (const r of s.world.routes) if (!out.includes(cityWord(r.city))) out.push(cityWord(r.city));
  if (s.trade.ship.visits > 0 && s.buildings.some((b) => b.kind === 'trading')) out.push('Tyre (her ship)');
  return out;
}

/** What the ship and the routes' traders paid for your goods: last month, and this month so far (not the visitors at the games). */
export function salesOf(s: SimState): { last: number; now: number } {
  const sum = (lines: SimState['ledger']['now']): number => lines.reduce((a, l) => a + (l.kind === 'sales' && l.what !== 'visitors at the games' ? l.amount : 0), 0);
  return { last: sum(s.ledger.last), now: sum(s.ledger.now) };
}

const homesAt = (s: SimState, level: number): number => s.buildings.reduce((a, b) => a + (b.kind === 'home' && b.level === level ? 1 : 0), 0);

/** "2 of 3: Corinth and Argos". */
const countWords = (have: number, need: number, what: string, names: string[]): string => `${have >= need ? fmt(have) : `${fmt(have)} of ${fmt(need)}`} ${what}${names.length ? `: ${list(names)}` : ''}`;

/** A great monument's milestone: standing (finished), or how far along it is. */
function monumentProgress(s: SimState, kind: MonumentKind): Progress {
  const x = monumentOf(s, kind);
  const name = monumentName(kind, true);
  if (!x) return { have: 0, need: 1, words: `${name} is not yet marked out` };
  if (x.finished) return { have: 1, need: 1, words: `${name} stands, finished in year ${yearOf(x.finished)}` };
  // (Review of slice 39: rounded down and kept under 1, so the laurel never comes in the last days before he stands.)
  const pct = Math.min(99, Math.floor(progressOf(x) * 100));
  const st = STAGES[kind][x.stage];
  const stage = st ? `${st.name.toLowerCase()} ${x.building ? 'going up' : 'waiting for its materials'}` : '';
  return { have: pct / 100, need: 1, words: `${name}: ${pct}% built, stage ${Math.min(STAGE_COUNT, x.stage + 1)} of ${STAGE_COUNT}${stage ? `, ${stage}` : ''}` };
}

/** The game's year a tick falls in, counted from the founding (year 1). */
export const yearOf = (tick: number): number => Math.floor(tick / TICKS_PER_YEAR) + 1;

export const MILESTONES: readonly Milestone[] = [
  // Master of Greece.
  {
    id: 'army',
    ambition: 'greece',
    name: 'An army under arms',
    want: `${ARMY_MEN} men under arms: two full companies`,
    deed: 'your army under arms',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => {
      const n = menUnderArms(s);
      return { have: n, need: ARMY_MEN, words: n ? `${fmt(n)} of ${ARMY_MEN} men under arms` : 'No soldiers yet: a barracks raises them' };
    },
  },
  {
    id: 'vassal',
    ambition: 'greece',
    name: 'A city bows to you',
    want: 'Your first vassal or colony',
    deed: 'a city bowing to you',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const names = [...vassalCities(s).map(cityWord), ...colonyNames(s)];
      return { have: names.length, need: 1, words: names.length ? `${list(names)} ${names.length === 1 ? 'is' : 'are'} yours` : 'No vassal or colony yet: conquer, cow or buy a city' };
    },
  },
  {
    id: 'feared',
    ambition: 'greece',
    name: 'Feared across Greece',
    want: 'An army as big as the strongest in Greece',
    deed: 'your army, feared across Greece',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const n = menUnderArms(s);
      let top: WorldCity | null = null;
      for (const c of rivalsOf(s)) if (!top || c.army > top.army) top = c;
      const theirs = Math.round(top?.army ?? 0);
      const need = Math.max(FEARED_LEAST, theirs);
      const who = top ? `${whose(top.id)} ${fmt(theirs)}, the strongest in Greece` : 'no army in Greece to match';
      return { have: n, need, words: `Your army ${fmt(n)} men; ${who}${theirs < FEARED_LEAST ? ` (at least ${FEARED_LEAST} wanted)` : ''}` };
    },
  },
  {
    id: 'lord',
    ambition: 'greece',
    name: 'Lord of three cities',
    want: `${LORD_OF} vassals and colonies`,
    deed: 'your rule over three cities',
    reward: { kind: 'gift', dr: 1000 },
    progress: (s) => {
      const names = [...vassalCities(s).map(cityWord), ...colonyNames(s)];
      return { have: names.length, need: LORD_OF, words: countWords(names.length, LORD_OF, 'vassals and colonies', names) };
    },
  },
  {
    id: 'colossus',
    ambition: 'greece',
    name: 'The Colossus',
    want: 'The Colossus standing at the harbour mouth',
    deed: 'the Colossus',
    reward: { kind: 'renown', mood: 10 },
    progress: (s) => monumentProgress(s, 'colossus'),
  },
  // The great trading city.
  {
    id: 'routes',
    ambition: 'trade',
    name: 'Open for trade',
    want: `Trade routes to ${ROUTE_CITIES} cities`,
    deed: 'your trade routes',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => {
      const names: string[] = [];
      for (const r of s.world.routes) if (!names.includes(cityWord(r.city))) names.push(cityWord(r.city));
      return { have: names.length, need: ROUTE_CITIES, words: names.length ? countWords(names.length, ROUTE_CITIES, 'cities', names) : 'No route open yet: open one from a city’s page on the map of Greece' };
    },
  },
  {
    id: 'market',
    ambition: 'trade',
    name: 'A busy market',
    want: `${fmt(MARKET_DR)} dr of goods sold to the ship and traders in a month`,
    deed: 'your busy market',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const { last, now } = salesOf(s);
      return { have: Math.max(last, now), need: MARKET_DR, words: `Sold ${fmt(last)} dr last month, ${fmt(now)} so far this month` };
    },
  },
  {
    id: 'cities',
    ambition: 'trade',
    name: 'Trade with half of Greece',
    want: `Trade with ${TRADE_CITIES} cities (Tyre’s ship counts)`,
    deed: 'your trade with half of Greece',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const names = tradingCities(s);
      return { have: names.length, need: TRADE_CITIES, words: names.length ? countWords(names.length, TRADE_CITIES, 'cities', names) : 'No trade yet' };
    },
  },
  {
    id: 'treasury',
    ambition: 'trade',
    name: 'The richest treasury in Greece',
    want: 'More drachmas than any city of Greece holds',
    deed: 'your treasury, the richest in Greece',
    reward: { kind: 'fame', months: 6 },
    progress: (s) => {
      let top: WorldCity | null = null;
      for (const c of rivalsOf(s)) if (!top || c.wealth > top.wealth) top = c;
      const theirs = Math.round(top?.wealth ?? 0);
      const need = Math.max(RICHEST_LEAST, theirs);
      return { have: Math.max(0, s.money), need, words: `Your treasury ${fmt(s.money)} dr; ${top ? `${whose(top.id)} ${fmt(theirs)}, the richest in Greece` : 'no treasury in Greece to match'}` };
    },
  },
  {
    id: 'lighthouse',
    ambition: 'trade',
    name: 'The Lighthouse',
    want: 'The Lighthouse burning on its headland',
    deed: 'the Lighthouse',
    reward: { kind: 'renown', mood: 10 },
    progress: (s) => monumentProgress(s, 'lighthouse'),
  },
  // A city of wonders.
  {
    id: 'town',
    ambition: 'wonders',
    name: 'A thriving town',
    want: `${fmt(TOWN_PEOPLE)} people`,
    deed: 'your thriving town',
    reward: { kind: 'gift', dr: 300 },
    progress: (s) => ({ have: s.population, need: TOWN_PEOPLE, words: `${fmt(s.population)} of ${fmt(TOWN_PEOPLE)} people` }),
  },
  {
    id: 'villas',
    ambition: 'wonders',
    name: 'Streets of villas',
    want: `${VILLAS} villas`,
    deed: 'your streets of villas',
    reward: { kind: 'fame', months: 3 },
    progress: (s) => {
      const n = homesAt(s, 6);
      return { have: n, need: VILLAS, words: n >= VILLAS ? `${fmt(n)} villas` : `${fmt(n)} of ${VILLAS} villas` };
    },
  },
  {
    id: 'estates',
    ambition: 'wonders',
    name: 'Grand estates',
    want: `${ESTATES} great estates`,
    deed: 'your grand estates',
    reward: { kind: 'renown', mood: 5 },
    progress: (s) => {
      const n = greatEstates(s);
      return { have: n, need: ESTATES, words: `${fmt(Math.min(n, ESTATES))} of ${ESTATES} great estates` };
    },
  },
  {
    id: 'great',
    ambition: 'wonders',
    name: 'A great city',
    want: `${fmt(GREAT_PEOPLE)} people`,
    deed: 'your great city',
    reward: { kind: 'gift', dr: 1000 },
    progress: (s) => ({ have: s.population, need: GREAT_PEOPLE, words: `${fmt(s.population)} of ${fmt(GREAT_PEOPLE)} people` }),
  },
  {
    id: 'stadium',
    ambition: 'wonders',
    name: 'The Stadium',
    want: 'The Stadium finished, its games to come',
    deed: 'the Stadium',
    reward: { kind: 'fame', months: 6 },
    progress: (s) => monumentProgress(s, 'stadium'),
  },
];

export const milestoneOf = (id: string): Milestone | undefined => MILESTONES.find((m) => m.id === id);
export const milestonesOf = (k: AmbitionKind): Milestone[] => MILESTONE_IDS[k].map((id) => MILESTONES.find((m) => m.id === id)!);
/** A milestone's place in its ambition (1 to 5). */
export const placeOf = (m: Milestone): number => milestonesOf(m.ambition).indexOf(m) + 1;

/** Is it met now? */
export const met = (p: Progress): boolean => p.have >= p.need;
/** How far towards it, 0 to 1. */
export const shareOf = (p: Progress): number => (p.need > 0 ? Math.max(0, Math.min(1, p.have / p.need)) : 1);


/** A reward in words, before it is given: "a gift of 300 dr from the warmest ruler". */
export function rewardWords(r: Reward): string {
  if (r.kind === 'gift') return `a gift of ${fmt(r.dr)} dr from the warmest ruler`;
  if (r.kind === 'fame') return `settlers drawn by fame: newcomers come twice as often for ${r.months} months`;
  return `every ruler ${r.mood} warmer, fading over a year`;
}

// ---------------------------------------------------------------------------
// Reaching them.

/** The ruler who sends a milestone's gift: the warmest (ties: the first in Greece's order). */
function warmest(s: SimState): WorldCity | null {
  let best: WorldCity | null = null;
  let bm = -Infinity;
  for (const id of RULED) {
    const c = cityOf(s.world, id);
    if (!c.ruler || c.pop <= 0) continue;
    const m = moodOf(c, s.tick);
    if (m > bm) {
      bm = m;
      best = c;
    }
  }
  return best;
}

/** Give a milestone's reward, and say what it came to. */
function give(s: SimState, m: Milestone): string {
  const r = m.reward;
  const what = m.deed;
  if (r.kind === 'gift') {
    const c = warmest(s);
    if (!c) return '';
    rulerGift(s, c, -1, r.dr, `in honour of ${what}`);
    return `${rulerName(c)} sends ${fmt(r.dr)} dr in honour of it`;
  }
  if (r.kind === 'fame') {
    s.ambition.fameUntil = Math.max(s.ambition.fameUntil, s.tick) + r.months * TICKS_PER_MONTH;
    return `settlers drawn by its fame come twice as often for ${r.months} months`;
  }
  for (const id of RULED) {
    const c = cityOf(s.world, id);
    if (!c.ruler || c.pop <= 0) continue;
    c.memories.push({ kind: 'renown', why: `Your city’s renown: ${what}`, amount: r.mood, tick: s.tick, fade: fadeFor(c, RENOWN_FADE, true) });
    const line = settleMood(s, c, `your city’s renown (${what})`);
    if (line) news(s.world, s.tick, c.id, line);
  }
  return `every ruler in Greece is ${r.mood} warmer for it`;
}

/** What each ruler says at the grand finish, by how they feel. */
function grandWords(s: SimState, c: WorldCity): string {
  const town = s.world.name;
  const mood = moodOf(c, s.tick);
  const t = c.ruler?.traits ?? [];
  if (mood >= 30) return `${rulerShort(c)} raises a cup to ${town}: “master of Greece, its greatest market and its wonder, and our friend”`;
  if (t.includes('proud') || mood <= -30) return `${rulerShort(c)} grudges it, but owns it: “there is no city in Greece like ${town} now”`;
  if (t.includes('warlike')) return `${rulerShort(c)} salutes ${town}: “its army is feared, its ships are everywhere, and its Colossus looks down on us all”`;
  if (t.includes('greedy') || t.includes('shrewd')) return `${rulerShort(c)} counts it up: “${town} holds the richest treasury and the busiest quays in Greece”`;
  return `${rulerShort(c)} sends word: “all Greece speaks of ${town}, its Colossus, its Lighthouse and its games”`;
}

/** Look at the town: record each milestone met, quietly or with its reward, and an ambition or all three achieved. */
function look(s: SimState, quiet: boolean): void {
  const a = s.ambition;
  const done = new Set(a.reached.map((l) => l.id));
  const before = AMBITIONS.filter((k) => achieved(s, k).tick > 0);
  for (const m of MILESTONES) {
    if (done.has(m.id) || !met(m.progress(s))) continue;
    a.reached.push({ id: m.id, tick: s.tick, quiet, note: quiet ? '' : give(s, m) });
    s.rev++;
  }
  if (quiet) {
    if (!a.grand && AMBITIONS.every((k) => achieved(s, k).tick > 0)) {
      a.grand = s.tick;
      a.grandQuiet = true;
    }
    return;
  }
  for (const k of AMBITIONS) {
    if (before.includes(k) || achieved(s, k).tick === 0) continue;
    const c = warmest(s);
    if (c) news(s.world, s.tick, c.id, `${rulerName(c)}: all Greece calls ${s.world.name} ${AMBITION_IN[k]} now`);
  }
  if (!a.grand && AMBITIONS.every((k) => achieved(s, k).tick > 0)) {
    a.grand = s.tick;
    a.grandQuiet = false;
    // The grand finish: a word from every ruler.
    for (const id of RULED) {
      const c = cityOf(s.world, id);
      if (!c.ruler || c.pop <= 0) continue;
      news(s.world, s.tick, c.id, grandWords(s, c));
    }
  }
}

/** Switch ambitions on or off (a command). Switched on, it records at once what the town has already met, quietly. */
export function setAmbition(s: SimState, on: boolean): void {
  const a = s.ambition;
  if (a.on === on) return;
  a.on = on;
  if (on) {
    a.looked = true;
    look(s, true);
  }
}

/** Once a tick: settlers drawn by fame; once a day, the milestones (nothing with the switch off). */
export function stepAmbition(s: SimState): void {
  const a = s.ambition;
  if (!a.on) return;
  // An older save, or a town switched on without a look: what it already has is recorded quietly.
  if (!a.looked) {
    a.looked = true;
    look(s, true);
    return;
  }
  // Fame: the settlers' clock runs FAME_PACE times as fast (never past its next look).
  if (a.fameUntil > s.tick && s.settlerClock > 1) s.settlerClock -= FAME_PACE - 1;
  if (s.tick % TICKS_PER_DAY === 0) look(s, false);
}

// ---------------------------------------------------------------------------
// What the panel, the chip and the town line say.

/** A milestone as the panel shows it. */
export interface MilestoneView {
  id: string;
  place: number;
  name: string;
  want: string;
  reward: string;
  /** Reached: when, already met when opened, and what its reward came to. */
  reached: number;
  quiet: boolean;
  note: string;
  /** Not yet: how far, in words and as a share. */
  words: string;
  share: number;
  /** Is it the great monument? */
  monument: boolean;
}

/** An ambition as the panel shows it. */
export interface AmbitionView {
  kind: AmbitionKind;
  name: string;
  what: string;
  /** Achieved: when (0: not yet), and whether it was already when the town was opened. */
  achieved: number;
  quiet: boolean;
  count: number;
  milestones: MilestoneView[];
}

/** The three side by side, for the panel. */
export function ambitionView(s: SimState): AmbitionView[] {
  return AMBITIONS.map((k) => {
    const milestones = milestonesOf(k).map((m, i): MilestoneView => {
      const l = laurelOf(s, m.id);
      const p = m.progress(s);
      return { id: m.id, place: i + 1, name: m.name, want: m.want, reward: rewardWords(m.reward), reached: l?.tick ?? 0, quiet: l?.quiet ?? false, note: l?.note ?? '', words: p.words, share: l ? 1 : shareOf(p), monument: i === 4 };
    });
    const a = achieved(s, k);
    return { kind: k, name: AMBITION_NAMES[k], what: AMBITION_WHAT[k], achieved: a.tick, quiet: a.quiet, count: milestones.filter((m) => m.reached).length, milestones };
  });
}

/**
 * The nearest milestone not yet reached, across all three: each ambition's
 * next one (its lowest not yet reached), and of those three the furthest
 * along (ties: Greece, trade, wonders). Null once all are reached. (Slice 40:
 * it was the furthest along of all fifteen, so a new town's chip named the
 * richest treasury in Greece, a quarter of the way there with its first
 * 5,000 dr, ahead of open for trade.)
 */
export function nearest(s: SimState): { m: Milestone; p: Progress; share: number } | null {
  let best: { m: Milestone; p: Progress; share: number } | null = null;
  const next = new Set<AmbitionKind>();
  for (const m of MILESTONES) {
    if (laurelOf(s, m.id) || next.has(m.ambition)) continue;
    next.add(m.ambition);
    const p = m.progress(s);
    const share = shareOf(p);
    if (!best || share > best.share + 1e-9) best = { m, p, share };
  }
  return best;
}

/** The laurels in all, and how many there are. */
export const laurelCount = (s: SimState): number => s.ambition.reached.length;
export const MILESTONE_COUNT = MILESTONES.length;

/**
 * The town line for the newest laurel (not one already met when the town
 * was opened), for LINE_DAYS days: what it was, for which ambition, and its
 * reward; an ambition achieved, or all three.
 */
export function ambitionTownLine(s: SimState): string {
  const a = s.ambition;
  if (!a.on) return '';
  if (a.grand && !a.grandQuiet && s.tick - a.grand < LINE_DAYS * TICKS_PER_DAY) return `All three ambitions achieved: ${s.world.name} is master of Greece, its greatest market and its wonder. Every ruler sends word, and the city celebrates. Play on as long as you like.`;
  let last: Laurel | undefined;
  for (const l of a.reached) if (!l.quiet && (!last || l.tick >= last.tick)) last = l;
  if (!last || s.tick - last.tick >= LINE_DAYS * TICKS_PER_DAY) return '';
  const m = milestoneOf(last.id);
  if (!m) return '';
  const k = m.ambition;
  const done = achieved(s, k);
  if (done.tick === last.tick && !done.quiet) return `${AMBITION_NAMES[k]}: achieved in year ${yearOf(done.tick)}, with ${m.deed}${last.note ? `; ${last.note}` : ''}. The other ambitions carry on.`;
  const count = milestonesOf(k).filter((x) => laurelOf(s, x.id)).length;
  return `A laurel for ${AMBITION_IN[k]} (${count} of 5): ${m.name[0].toLowerCase()}${m.name.slice(1)}${last.note ? `. ${last.note[0].toUpperCase()}${last.note.slice(1)}` : ''}.`;
}

/** Fame drawing settlers, for the population's tooltip ('' none). */
export function fameWords(s: SimState): string {
  const a = s.ambition;
  if (!a.on || a.fameUntil <= s.tick) return '';
  const days = Math.ceil((a.fameUntil - s.tick) / TICKS_PER_DAY);
  return `Your city’s fame draws settlers: newcomers come twice as often for ${days} more days.`;
}
