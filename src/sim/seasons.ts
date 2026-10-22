/**
 * The turning year (slice 33): four seasons, each three months, and what
 * they do to the city's rhythm. Oliver's choice (21 Oct), "look and rhythm":
 * "The land goes from green spring to gold summer to a grey-green winter.
 * Crops ripen and are reaped in season, herds breed in spring, and winter
 * storms slow ships and keep most armies home."
 *
 * - **The calendar.** The season is a pure function of the tick: the city is
 *   founded on 1 March, the first day of spring, and each season is 900
 *   ticks (three months), so the year keeps its length and the season never
 *   drifts. Spring is March to May, summer June to August, autumn September
 *   to November, winter December to February.
 * - **Rhythm.** Each season has a pace for what grows, averaging 1 over the
 *   year, so a fully worked farm, grove or flock makes what it made before in
 *   a year; only when it comes changes. Wheat ripens fastest in autumn (most
 *   harvests come in late summer and autumn, and the granaries fill then) and
 *   slowest in winter; olives and grapes are picked mostly in autumn; goats
 *   and sheep give most in spring, when they breed (kids and lambs, milk and
 *   shearing); the wild herds grow back twice as fast in spring.
 * - **Winter at sea.** A ship due in winter (the Tyrian ship, a sea route's)
 *   is held back by the storms, 6 to 12 days; enemy ships in the bay row at
 *   three quarters of their pace.
 * - **Winter on land.** A hostile ruler's own threat whose band would march in
 *   winter waits, two times in three. A threat already made keeps its word.
 * - **The weather.** Spells of three days, fair, rain or storm, more rain in
 *   winter and the odd storm; a hash of the city's seed and the day.
 *
 * The switch (`season.on`) is off in a bare state, so a town built without
 * it plays exactly as before; it is on in every new game, every demo's
 * history and every old save loaded. With it off every pace is 1, no ship is
 * late, no army waits, and the weather is always fair.
 *
 * Pure: everything here is arithmetic on the tick and hashes of the seed; it
 * draws on no generator.
 */
import { hash2 } from '../map/noise';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import type { BuildingKind, SimState } from './state';

export const SPRING = 0;
export const SUMMER = 1;
export const AUTUMN = 2;
export const WINTER = 3;
export type Season = 0 | 1 | 2 | 3;
export const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'] as const;
/** A season is three months. */
export const TICKS_PER_SEASON = 3 * TICKS_PER_MONTH;

/**
 * The season's state: its switch, and how late winter has made each ship's
 * next visit (days, by ship: 'tyre' for the merchant ship, a sea route's
 * key such as 'athens-sea'), for her chip and line. Only ships held back
 * are listed.
 */
export interface Seasons {
  on: boolean;
  late: Record<string, number>;
}

export const freshSeasons = (on = false): Seasons => ({ on, late: {} });

/** The season at a tick: tick 0 is 1 March, the first day of spring. */
export const seasonAt = (tick: number): Season => (Math.floor(Math.max(0, tick) / TICKS_PER_SEASON) % 4) as Season;

/** The town's season now, or -1 with the switch off. */
export const seasonOf = (s: SimState): Season | -1 => (s.season?.on ? seasonAt(s.tick) : -1);

/** The tick the season after the one at `tick` begins. */
export const nextSeasonAt = (tick: number): number => (Math.floor(Math.max(0, tick) / TICKS_PER_SEASON) + 1) * TICKS_PER_SEASON;

/** Whole days until the next season begins (at least 1). */
export const daysToNextSeason = (tick: number): number => Math.max(1, Math.ceil((nextSeasonAt(tick) - tick) / TICKS_PER_DAY));

/** How far through the year a tick is, 0 at 1 March to just under 4 at the end of February (a season a unit), for the look. */
export const yearPhase = (tick: number): number => (Math.max(0, tick) % (4 * TICKS_PER_SEASON)) / TICKS_PER_SEASON;

// ---------------------------------------------------------------------------
// Rhythm.

/** What grows to a season's pace: wheat, the groves' and vineyards' fruit, the dairy's goats and the pasture's sheep, and the wild herds. */
export type Rhythm = 'wheat' | 'fruit' | 'flock' | 'wild';

/**
 * Each rhythm's pace in spring, summer, autumn and winter (each set sums to
 * 4, so the year comes out the same): wheat ripens half again as fast in
 * autumn and at 60% in winter; olives and grapes ripen fastest for the
 * autumn picking; the flocks give most in spring; the wild herds breed in
 * spring.
 */
export const PACES: Record<Rhythm, readonly [number, number, number, number]> = {
  wheat: [0.9, 1.1, 1.4, 0.6],
  fruit: [0.8, 1.0, 1.6, 0.6],
  flock: [1.4, 1.1, 0.9, 0.6],
  wild: [2, 1, 0.5, 0.5],
};

/** Which rhythm each maker follows (the rest, presses, wineries, mines, armouries, lodges, keep their pace all year). */
export const RHYTHM_OF: Partial<Record<BuildingKind, Rhythm>> = { farm: 'wheat', grove: 'fruit', vineyard: 'fruit', dairy: 'flock', pasture: 'flock' };

/** A rhythm's pace now (1 with the switch off). */
export const paceOf = (s: SimState, r: Rhythm): number => (s.season?.on ? PACES[r][seasonAt(s.tick)] : 1);

/** A maker's pace now: its rhythm's, or 1 for one with none. */
export const makerPace = (s: SimState, kind: BuildingKind): number => {
  const r = RHYTHM_OF[kind];
  return r ? paceOf(s, r) : 1;
};

/**
 * How many ticks `left` more growth takes at `rate` (work a tick at full
 * pace), through the seasons ahead at their paces (just `left / rate` with
 * the switch off). Infinity with nobody working.
 */
export function ticksToGrow(s: SimState, r: Rhythm, left: number, rate: number): number {
  if (rate <= 0) return Infinity;
  if (left <= 0) return 0;
  if (!s.season?.on) return left / rate;
  let t = s.tick;
  let need = left;
  let total = 0;
  for (let guard = 0; guard < 16; guard++) {
    const per = PACES[r][seasonAt(t)] * rate;
    const span = nextSeasonAt(t) - t;
    if (per * span >= need) return total + need / per;
    need -= per * span;
    total += span;
    t += span;
  }
  return total + need / rate;
}

/** A season's word for how a rhythm goes in it: "half again as fast", "at 60%". */
export function paceWords(p: number): string {
  if (p >= 1.95) return 'twice as fast';
  if (p >= 1.55) return `${Math.round(p * 10) / 10} times as fast`;
  if (p >= 1.45) return 'half again as fast';
  if (p > 1.02) return `a little faster (${Math.round(p * 100)}%)`;
  if (p >= 0.98) return 'at its usual pace';
  if (p >= 0.5) return `slower (${Math.round(p * 100)}%)`;
  return `at ${Math.round(p * 100)}%`;
}

/** Why a crop's or a flock's pace is what it is now, in words ('' with the switch off): "Autumn: the wheat ripens half again as fast". */
export function paceLine(s: SimState, kind: BuildingKind): string {
  const r = RHYTHM_OF[kind];
  if (!r || !s.season?.on) return '';
  const season = seasonAt(s.tick);
  const p = PACES[r][season];
  const Name = SEASON_NAMES[season][0].toUpperCase() + SEASON_NAMES[season].slice(1);
  const what =
    kind === 'farm'
      ? 'the wheat ripens'
      : kind === 'grove'
        ? 'the olives ripen'
        : kind === 'vineyard'
          ? 'the grapes ripen'
          : kind === 'dairy'
            ? season === SPRING
              ? 'the goats have their kids and give the most milk'
              : 'the goats give milk'
            : season === SPRING
              ? 'the ewes lamb and the flock is sheared'
              : 'the flock’s fleece grows';
  return `${Name}: ${what} ${paceWords(p)}`;
}

// ---------------------------------------------------------------------------
// The weather.

export const FAIR = 0;
export const RAIN = 1;
export const STORM = 2;
export type Weather = 0 | 1 | 2;
/** Weather comes in spells of this many days. */
export const SPELL_DAYS = 3;
/** The share of spells that are wet in spring, summer, autumn and winter, and of wet spells that are storms. */
export const RAIN_ODDS = [0.25, 0.07, 0.3, 0.45] as const;
export const STORM_ODDS = [0, 0, 0.12, 0.35] as const;

/** The weather on a day (from the founding), for a city's seed: always fair with the switch off. */
export function weatherOn(s: SimState, day: number): Weather {
  if (!s.season?.on) return FAIR;
  const season = seasonAt(day * TICKS_PER_DAY);
  const spell = Math.floor(day / SPELL_DAYS);
  if (hash2(spell, 0x5e5, s.seed) >= RAIN_ODDS[season]) return FAIR;
  return hash2(spell, 0x570, s.seed) < STORM_ODDS[season] ? STORM : RAIN;
}

/** The weather now. */
export const weatherNow = (s: SimState): Weather => weatherOn(s, Math.floor(s.tick / TICKS_PER_DAY));

// ---------------------------------------------------------------------------
// Winter at sea and on land.

/** A ship due in winter is held back between these many days (a hash of the seed and her day). */
export const LATE_LEAST = 6;
export const LATE_MOST = 12;
/** In winter, enemy ships in the bay row at this share of their pace. */
export const WINTER_SEA_PACE = 0.75;

/**
 * Winter storms hold a ship back: the ticks to add to a visit due on tick
 * `due` (0 outside winter or with the switch off), and her lateness in days
 * noted under `ship` for her chip and line (cleared when she is on time).
 */
export function stormDelay(s: SimState, ship: string, due: number): number {
  if (!s.season?.on) return 0;
  if (seasonAt(due) !== WINTER) {
    if (s.season.late[ship]) delete s.season.late[ship];
    return 0;
  }
  const day = Math.floor(due / TICKS_PER_DAY);
  const days = LATE_LEAST + Math.floor(hash2(day, 0x1a7e, s.seed) * (LATE_MOST - LATE_LEAST + 1));
  s.season.late[ship] = days;
  return days * TICKS_PER_DAY;
}

/** How many days late a ship's next visit is for the winter's storms (0: on time). */
export const lateDays = (s: SimState, ship: string): number => (s.season?.on ? (s.season.late[ship] ?? 0) : 0);

/** Her lateness in words, to follow a line about her next visit ('' when on time): " · late: winter storms in the gulf held her back 9 days". */
export const lateWords = (s: SimState, ship: string): string => {
  const d = lateDays(s, ship);
  return d ? ` (late: winter storms in the gulf held her back ${d} days)` : '';
};

/** Ships' pace in the bay now (WINTER_SEA_PACE in winter, else 1). */
export const seaPace = (s: SimState): number => (s.season?.on && seasonAt(s.tick) === WINTER ? WINTER_SEA_PACE : 1);

/** Of hostile rulers' own threats whose bands would march in winter, this share wait for spring. */
export const WINTER_HOME = 2 / 3;

/**
 * Winter keeps most armies home: a ruler who would threaten now, with his
 * band to march on tick `marches`, lets it wait, two times in three, if that
 * falls in winter (`salt` keeps each ruler's month its own roll). A threat
 * already made is not asked: it keeps its word.
 */
export function armiesHome(s: SimState, marches: number, salt: number): boolean {
  if (!s.season?.on || seasonAt(marches) !== WINTER) return false;
  return hash2(salt, 0xa53, s.seed) < WINTER_HOME;
}

// ---------------------------------------------------------------------------
// What's coming, for the season dial.

export interface SeasonNews {
  season: Season;
  /** "Autumn". */
  name: string;
  /** Days into the season (from 1), and until the next. */
  day: number;
  left: number;
  weather: Weather;
  /** What's coming, short, for the dial: "the harvest in 12 d". */
  coming: string;
  /** The same in a sentence: "The harvest begins in 12 days: ...". */
  line: string;
}

const cap = (w: string): string => w[0].toUpperCase() + w.slice(1);

/** The season dial's words (null with the switch off). */
export function seasonNews(s: SimState): SeasonNews | null {
  if (!s.season?.on) return null;
  const season = seasonAt(s.tick);
  const left = daysToNextSeason(s.tick);
  const day = Math.floor((s.tick % TICKS_PER_SEASON) / TICKS_PER_DAY) + 1;
  const weather = weatherNow(s);
  const d = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`;
  let coming: string;
  let line: string;
  if (season === SPRING) {
    coming = `lambing · summer in ${left} d`;
    line = `Spring: the flocks lamb and kid and give the most milk and fleece, and the wild herds breed. The wheat grows a little slower than its usual pace. Summer comes in ${d(left)}`;
  } else if (season === SUMMER) {
    coming = `the harvest in ${left} d`;
    line = `Summer: the land turns gold and the wheat ripens a little faster. The harvest begins in ${d(left)}: in autumn the fields ripen half again as fast, the olives and grapes are picked, and the granaries fill`;
  } else if (season === AUTUMN) {
    coming = `harvest · winter in ${left} d`;
    line = `Autumn: the harvest. The fields ripen half again as fast, the olives and grapes are picked, and the granaries fill. Winter comes in ${d(left)}: the fields give little until spring, ships run late, and most rulers keep their men at home`;
  } else {
    coming = `storms · spring in ${left} d`;
    line = `Winter: the fields give little (60% of their pace), storms in the gulf hold ships back a week or two, and most rulers keep their men at home. Spring comes in ${d(left)}`;
  }
  if (weather === STORM) line += '. A storm is blowing';
  else if (weather === RAIN) line += '. It is raining';
  return { season, name: cap(SEASON_NAMES[season]), day, left, weather, coming, line };
}
