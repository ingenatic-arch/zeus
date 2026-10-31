/**
 * What a remembered thing is worth as it fades: the rulers' moods (world.ts)
 * and the gods' (pantheon.ts) are both sums of memories, and fade the same
 * way. This file imports nothing but a type, so the modules that read it
 * don't change the order the sim's modules are first loaded in (see the
 * note at the top of laurels.ts).
 */
import type { Memory } from './state';

/** What a memory is worth at a tick: its amount, fading evenly to nothing (whole numbers, so the reasons add up to the mood). */
export function memoryWorth(m: Memory, tick: number): number {
  if (m.fade <= 0) return m.amount;
  const left = 1 - (tick - m.tick) / m.fade;
  return left <= 0 ? 0 : Math.round(m.amount * Math.min(1, left));
}
