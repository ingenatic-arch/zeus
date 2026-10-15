/**
 * The sim calendar. Time in the sim is counted only in ticks; this module
 * turns a tick count into a date. One day is 10 ticks, one month is 30 days,
 * so at normal speed (10 ticks a second) a month lasts 30 seconds.
 */
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_DAY = 10;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const TICKS_PER_MONTH = TICKS_PER_DAY * DAYS_PER_MONTH;
export const TICKS_PER_YEAR = TICKS_PER_MONTH * MONTHS_PER_YEAR;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** The city is founded in March, 750 BC; years count down as they pass. */
export const START_YEAR_BC = 750;
export const START_MONTH = 2; // March, 0-based

export interface SimDate {
  /** 1-based day of the month. */
  day: number;
  /** 0-based month index. */
  month: number;
  monthName: string;
  /** Year as a BC number (750, 749, ...). After 1 BC comes AD 1, shown as a negative here. */
  yearBC: number;
  /** Whole months since the founding. */
  monthsElapsed: number;
}

export function dateOfTick(tick: number): SimDate {
  const monthsElapsed = Math.floor(tick / TICKS_PER_MONTH);
  const dayInMonth = Math.floor((tick % TICKS_PER_MONTH) / TICKS_PER_DAY);
  const absMonth = START_MONTH + monthsElapsed;
  const month = absMonth % MONTHS_PER_YEAR;
  const yearsPassed = Math.floor(absMonth / MONTHS_PER_YEAR);
  let yearBC = START_YEAR_BC - yearsPassed;
  // There is no year 0: 1 BC is followed by AD 1.
  if (yearBC <= 0) yearBC -= 1;
  return { day: dayInMonth + 1, month, monthName: MONTH_NAMES[month], yearBC, monthsElapsed };
}

export function formatYear(yearBC: number): string {
  return yearBC > 0 ? `${yearBC} BC` : `AD ${-yearBC}`;
}

export function formatDate(d: SimDate): string {
  return `${d.monthName}, ${formatYear(d.yearBC)}`;
}
