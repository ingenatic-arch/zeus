import { dateOfTick, TICKS_PER_DAY, type SimDate } from './clock';
import type { Command, StampedCommand } from './commands';
import { nextFloat, seedRng } from './rng';
import { SIM_STATE_VERSION, type SimState } from './state';

export const DEFAULT_SEED = 0x2e05; // "Zeus"

export function createState(seed: number = DEFAULT_SEED, mapId = 'coast'): SimState {
  const rng = seedRng(seed);
  return {
    version: SIM_STATE_VERSION,
    mapId,
    seed,
    tick: 0,
    rng,
    commandsApplied: 0,
    wind: { angle: 3.6 + nextFloat(rng) * 0.4, strength: 0.5 + nextFloat(rng) * 0.2 },
  };
}

/**
 * The deterministic simulation. It advances only when step() is called, and
 * reads nothing from outside except queued commands. The host decides how
 * many steps to run per frame (that is where pause and speed live).
 */
export class Sim {
  state: SimState;
  private queue: StampedCommand[] = [];
  private seq = 0;
  /** Every command applied so far, in order, for replay. */
  readonly log: StampedCommand[] = [];

  constructor(seed: number = DEFAULT_SEED) {
    this.state = createState(seed);
  }

  /** Queue a command to apply on the next tick. */
  enqueue(command: Command): StampedCommand {
    return this.enqueueAt(this.state.tick + 1, command);
  }

  /** Queue a command for a given future tick (used by replay). */
  enqueueAt(tick: number, command: Command): StampedCommand {
    if (tick <= this.state.tick) throw new Error(`Command for tick ${tick} is in the past (now ${this.state.tick})`);
    const stamped: StampedCommand = { tick, seq: this.seq++, command };
    this.queue.push(stamped);
    return stamped;
  }

  /** Advance one fixed tick. */
  step(): void {
    const s = this.state;
    const t = s.tick + 1;
    if (this.queue.length > 0) {
      const due = this.queue.filter((c) => c.tick === t).sort((a, b) => a.seq - b.seq);
      if (due.length > 0) {
        this.queue = this.queue.filter((c) => c.tick !== t);
        for (const c of due) {
          applyCommand(s, c.command);
          this.log.push(c);
        }
      }
    }
    // Daily systems.
    if (t % TICKS_PER_DAY === 0) driftWind(s);
    s.tick = t;
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
  }

  get date(): SimDate {
    return dateOfTick(this.state.tick);
  }
}

function applyCommand(s: SimState, c: Command): void {
  switch (c.type) {
    case 'mark':
      s.commandsApplied++;
      break;
  }
}

function driftWind(s: SimState): void {
  const w = s.wind;
  w.angle += (nextFloat(s.rng) - 0.5) * 0.08;
  // Pulled gently back towards a south-westerly sea breeze.
  w.angle += (3.8 - w.angle) * 0.02;
  w.strength += (nextFloat(s.rng) - 0.5) * 0.06;
  w.strength = Math.min(1, Math.max(0.25, w.strength + (0.55 - w.strength) * 0.03));
}

/** Plain serialised form of the state (what a save will hold). */
export function serialize(s: SimState): string {
  return JSON.stringify(s);
}

export function deserialize(json: string): SimState {
  const data = JSON.parse(json) as Partial<SimState>;
  if (data.version !== SIM_STATE_VERSION) {
    throw new Error(`This save is from version ${String(data.version)} and this game reads version ${SIM_STATE_VERSION}.`);
  }
  return data as SimState;
}

/** Rebuild a sim from a seed and a command log, running to the given tick. */
export function replay(seed: number, log: readonly StampedCommand[], toTick: number): Sim {
  const sim = new Sim(seed);
  for (const c of log) sim.enqueueAt(c.tick, c.command);
  sim.run(toTick);
  return sim;
}
