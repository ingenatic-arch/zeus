/**
 * The festivals of Greece, at their seasons, every year: the Panathenaia in
 * Athens in July, the Karneia in Sparta in August, the Isthmian Games at
 * Corinth in April, each lasting a month. While one is on (and for a
 * fortnight before, as the city lays in for it) wine and meat grow dear
 * there (world.ts: the `feast` push), easing within a season after; a gift
 * that arrives while it is on counts for more (diplomacy.ts).
 *
 * Pure, and only the calendar: when a city's festival is, and what it is
 * called. No random numbers at all.
 */
import { PLACES, type CityId } from '../map/greece';
import { dateOfTick, START_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';

export interface Festival {
  city: CityId;
  name: string;
  /** Its month (0-based: 6 is July). It lasts the month. */
  month: number;
  /** In a few words, what it is. */
  what: string;
}

export const FESTIVALS: readonly Festival[] = [
  { city: 'corinth', name: 'the Isthmian Games', month: 3, what: 'games for Poseidon on the isthmus' },
  { city: 'athens', name: 'the Panathenaia', month: 6, what: 'Athena’s birthday, with a procession up to her temple' },
  { city: 'sparta', name: 'the Karneia', month: 7, what: 'nine days of feasting for Apollo, with no marching to war' },
];

/** The trade goods a festival makes dear (TRADE_GOODS order: wheat, meat, cheese, oil, fleece, wine), and how far it draws each one's stock down at most (a share of normal). */
export const FEAST_SHARE: readonly number[] = [0, 0.4, 0, 0, 0, 0.45];
/** How long before a festival the city starts laying in for it. */
export const FEAST_LEAD = 15 * TICKS_PER_DAY;
/** Days for the festival's push to wear off by about two thirds after it ends (within a season). */
export const FEAST_WEAR_DAYS = 40;
/** Days for the push to come on, by about two thirds, as the festival nears. */
export const FEAST_RAMP_DAYS = 10;

/** A city's festival, if it keeps one. */
export const festivalOf = (city: CityId): Festival | undefined => FESTIVALS.find((f) => f.city === city);

/** The tick a city's festival starts in the year of a tick, or next (the first of its month at or after the tick, less its length: so one on now counts). */
export function nextFestival(city: CityId, tick: number): { start: number; end: number } | null {
  const f = festivalOf(city);
  if (!f) return null;
  // The first of its month in the year of `tick` (months count from the founding in March).
  const monthsIn = Math.floor(tick / TICKS_PER_MONTH);
  const absNow = START_MONTH + monthsIn;
  const yearStart = (Math.floor(absNow / 12) * 12 - START_MONTH) * TICKS_PER_MONTH;
  let start = yearStart + f.month * TICKS_PER_MONTH;
  if (start + TICKS_PER_MONTH <= tick) start += TICKS_PER_YEAR;
  return { start, end: start + TICKS_PER_MONTH };
}

/** Is a city's festival on at a tick? */
export function festivalOn(city: CityId, tick: number): boolean {
  const n = nextFestival(city, tick);
  return !!n && tick >= n.start && tick < n.end;
}

/** Is a city laying in for its festival, or keeping it (from FEAST_LEAD before it to its end)? */
export function feasting(city: CityId, tick: number): boolean {
  const n = nextFestival(city, tick);
  return !!n && tick >= n.start - FEAST_LEAD && tick < n.end;
}

/** The festival on now, coming within so many ticks, or just past, in words, for the reasons: "the Panathenaia is on", "for the Panathenaia, in 12 days", "after the Panathenaia". */
export function feastWords(city: CityId, tick: number): string {
  const f = festivalOf(city);
  const n = nextFestival(city, tick);
  if (!f || !n) return '';
  if (tick >= n.start) return `${f.name} is on`;
  if (tick >= n.start - FEAST_LEAD) {
    const days = Math.max(1, Math.ceil((n.start - tick) / TICKS_PER_DAY));
    return `they are laying in for ${f.name}, in ${days === 1 ? 'a day' : `${days} days`}`;
  }
  return `${f.name} is lately over`;
}

/** "July", the month a festival is in. */
export const festivalMonth = (f: Festival): string => dateOfTick((f.month - START_MONTH + 12) % 12 * TICKS_PER_MONTH).monthName;

/** "the Panathenaia in Athens". */
export const festivalTitle = (f: Festival): string => `${f.name} in ${PLACES[f.city].name}`;
