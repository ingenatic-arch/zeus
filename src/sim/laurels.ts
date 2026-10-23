/**
 * The ambitions' record and the laurels in it (slice 39), apart from the
 * milestones themselves (ambitions.ts): what a save holds, when an ambition
 * was achieved, and the city's pride in it. This file imports nothing but
 * the clock, so the modules every tick passes through (the homes' moods in
 * folk.ts, the migrations) can read it without pulling the milestones' many
 * imports in ahead of their turn: with them, the order the sim's modules
 * are first loaded in changed, and a constant worked out as routes.ts loads
 * (from trade.ts's) came out NaN, which changed how ships take turns at the
 * jetty in several demos' histories.
 */
import { TICKS_PER_YEAR } from './clock';
import type { SimState } from './state';

/** A milestone reached: which, when, and whether it was already met when the town was opened (no fanfare, no reward); what its reward came to, in words. */
export interface Laurel {
  id: string;
  tick: number;
  quiet: boolean;
  note: string;
}

/** The slice's one top-level field. */
export interface Ambition {
  /** The switch (see the notes at the top of ambitions.ts). */
  on: boolean;
  /** Has it looked at the town since it was switched on? (false: the next look records what is met quietly.) */
  looked: boolean;
  /** The milestones reached, in the order they were. */
  reached: Laurel[];
  /** Settlers drawn by fame come twice as often until this tick (0: none). */
  fameUntil: number;
  /** When all three were achieved (0: not yet), and whether that was already so when the town was opened. */
  grand: number;
  grandQuiet: boolean;
}

export const freshAmbition = (on = false): Ambition => ({ on, looked: false, reached: [], fameUntil: 0, grand: 0, grandQuiet: false });

export type AmbitionKind = 'greece' | 'trade' | 'wonders';
export const AMBITIONS: readonly AmbitionKind[] = ['greece', 'trade', 'wonders'];
/** Each ambition's name within a sentence: "Master of Greece", "the great trading city", "a city of wonders". */
export const AMBITION_IN: Record<AmbitionKind, string> = { greece: 'Master of Greece', trade: 'the great trading city', wonders: 'a city of wonders' };
/** Each ambition's five milestones, easy to grand, by id (ambitions.ts defines them, in this order). */
export const MILESTONE_IDS: Record<AmbitionKind, readonly string[]> = {
  greece: ['army', 'vassal', 'feared', 'lord', 'colossus'],
  trade: ['routes', 'market', 'cities', 'treasury', 'lighthouse'],
  wonders: ['town', 'villas', 'estates', 'great', 'stadium'],
};

/** The laurel for a milestone, if it has been reached. */
export const laurelOf = (s: SimState, id: string): Laurel | undefined => s.ambition.reached.find((l) => l.id === id);

/** When an ambition was achieved (its last milestone reached; 0: not yet), and whether that was already so when the town was opened. */
export function achieved(s: SimState, k: AmbitionKind): { tick: number; quiet: boolean } {
  let tick = 0;
  let quiet = true;
  for (const id of MILESTONE_IDS[k]) {
    const l = laurelOf(s, id);
    if (!l) return { tick: 0, quiet: false };
    if (l.tick >= tick) {
      tick = l.tick;
      quiet = l.quiet;
    }
  }
  return { tick, quiet };
}

/** Pride: every home happier while an ambition (or all three) was achieved within this long. */
export const PRIDE_FOR = TICKS_PER_YEAR;
export const PRIDE_MOOD = 1;
export const GRAND_MOOD = 2;

/** The homes' pride in an ambition achieved in play (not one already so when the town was opened), for a year: the grand finish's, or the newest ambition's. */
export function prideMood(s: SimState): { w: number; text: string } | null {
  const a = s.ambition;
  if (!a.on) return null;
  // (Not for what was already so when the town was opened: that is recorded quietly.)
  if (a.grand && !a.grandQuiet && s.tick - a.grand < PRIDE_FOR) return { w: GRAND_MOOD, text: 'All Greece speaks of our city' };
  let best: { tick: number; k: AmbitionKind } | null = null;
  for (const k of AMBITIONS) {
    const { tick: t, quiet } = achieved(s, k);
    if (t && !quiet && s.tick - t < PRIDE_FOR && (!best || t > best.tick)) best = { tick: t, k };
  }
  return best ? { w: PRIDE_MOOD, text: `Proud of their city: ${AMBITION_IN[best.k]}` } : null;
}
