/**
 * Bringing an older saved state up to this version, so old towns load.
 *
 * Version 6 (phase 1) to 7 (slice 8, coin and the ledger): rent is gone,
 * taxes come in with a tax collector instead, and wages go out. The town
 * keeps its money; the rate is fair; the ledger starts this month with what
 * the treasury holds; nobody has been taxed or is owed wages yet; and the
 * new round record (where tax collectors have walked) starts empty. A
 * phase-1 town has no tax office, so the welcome back says to build one.
 *
 * Pure: it only reshapes plain data. What it can't recognise it leaves
 * alone, for the save checks to refuse in plain words.
 */
import { MAP_SIZE } from '../map/coast';
import { SIM_STATE_VERSION } from './state';
import { FAIR } from './taxes';
import { freshLedger } from './treasury';

/** The oldest state version this game can bring up to date. */
export const OLDEST_READABLE = 6;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Bring a parsed state up to SIM_STATE_VERSION in place. Returns the version
 * it was (so the game can say what changed), or 0 if it needed nothing or
 * can't be brought up (too old, too new, or not a state at all).
 */
export function migrate(st: unknown): number {
  if (!isObj(st) || typeof st.version !== 'number') return 0;
  const from = st.version;
  if (from >= SIM_STATE_VERSION || from < OLDEST_READABLE) return 0;
  if (from === 6) from6(st);
  return from;
}

function from6(st: Record<string, unknown>): void {
  delete st.rent;
  st.taxRate = FAIR;
  const money = typeof st.money === 'number' ? st.money : 0;
  const tick = typeof st.tick === 'number' ? st.tick : 0;
  st.ledger = freshLedger(money, tick);
  if (isObj(st.rounds)) {
    const n = MAP_SIZE * MAP_SIZE;
    st.rounds.tax = { walked: new Array<number>(n).fill(0), exits: new Array<number>(n).fill(0) };
  }
  if (Array.isArray(st.buildings)) {
    for (const b of st.buildings) {
      if (!isObj(b)) continue;
      b.taxedAt = 0;
      b.taxPaid = 0;
      b.unpaid = 0;
      b.owed = 0;
    }
  }
  if (Array.isArray(st.walkers)) for (const w of st.walkers) if (isObj(w)) w.purse = [];
  st.version = 7;
}
