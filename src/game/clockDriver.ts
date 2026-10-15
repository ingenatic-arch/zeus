import { TICKS_PER_SECOND } from '../sim/clock';
import type { Sim } from '../sim/sim';

export type Speed = 'paused' | 'normal' | 'fast' | 'fastest';
export const SPEEDS: readonly Speed[] = ['paused', 'normal', 'fast', 'fastest'];
export const SPEED_MULTIPLIER: Record<Speed, number> = { paused: 0, normal: 1, fast: 2, fastest: 4 };

/** Never run more than this many ticks in one frame (a tab coming back from sleep). */
const MAX_TICKS_PER_FRAME = 40;

/**
 * Drives the sim from wall-clock time. This is host code, outside the sim:
 * it turns real seconds into a whole number of fixed ticks. Speed is not part
 * of the sim state, because it never changes what happens, only how fast.
 */
export class ClockDriver {
  speed: Speed;
  /** The speed Space resumes to: whatever was running before the pause. */
  private resume: Exclude<Speed, 'paused'> = 'normal';
  private acc = 0;
  private listeners: Array<(s: Speed) => void> = [];

  constructor(
    private readonly sim: Sim,
    speed: Speed = 'normal',
  ) {
    this.speed = speed;
    if (speed !== 'paused') this.resume = speed;
  }

  setSpeed(s: Speed): void {
    if (s === this.speed) return;
    this.speed = s;
    if (s === 'paused') this.acc = 0;
    else this.resume = s;
    for (const l of this.listeners) l(s);
  }

  /** Pause, or carry on at the speed that was running before. */
  togglePause(): void {
    this.setSpeed(this.speed === 'paused' ? this.resume : 'paused');
  }

  onSpeedChange(l: (s: Speed) => void): void {
    this.listeners.push(l);
  }

  /** Advance by dt real seconds; returns the number of ticks run. */
  update(dtSeconds: number): number {
    this.acc += Math.max(0, dtSeconds) * TICKS_PER_SECOND * SPEED_MULTIPLIER[this.speed];
    let n = 0;
    while (this.acc >= 1 && n < MAX_TICKS_PER_FRAME) {
      this.sim.step();
      this.acc -= 1;
      n++;
    }
    if (n === MAX_TICKS_PER_FRAME) this.acc = 0;
    return n;
  }

  /** Fraction of the way to the next tick, for smoothing motion between ticks. */
  get alpha(): number {
    return this.acc;
  }
}
