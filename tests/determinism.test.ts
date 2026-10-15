import { describe, expect, it } from 'vitest';
import { ClockDriver } from '../src/game/clockDriver';
import { MAP_SIZE } from '../src/map/coast';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import type { Command } from '../src/sim/commands';
import { deserialize, replay, serialize, Sim } from '../src/sim/sim';

const T = (x: number, z: number): number => z * MAP_SIZE + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));
const col = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => T(x, z0 + i));

/** A little neighbourhood built over time on the plain west of the river mouth. */
const SCRIPT: Array<[number, Command]> = [
  [5, { type: 'road', tiles: row(0, 30, 80) }],
  [40, { type: 'plots', at: [T(4, 78), T(8, 78), T(12, 78), T(4, 81), T(8, 81)] }],
  [200, { type: 'road', tiles: col(24, 66, 79) }],
  [260, { type: 'plots', at: [T(22, 70), T(25, 70), T(22, 74), T(25, 74), T(16, 78)] }],
  [900, { type: 'clear', x0: 8, z0: 81, x1: 9, z1: 82 }],
  [1300, { type: 'undo' }],
  [1600, { type: 'clear', x0: 24, z0: 70, x1: 24, z1: 71 }],
  [2400, { type: 'plots', at: [T(30, 76), T(30, 81)] }],
];

function scripted(seed: number, ticks = 5000): Sim {
  const sim = new Sim(seed);
  let k = 0;
  for (let t = 0; t < ticks; t++) {
    while (k < SCRIPT.length && SCRIPT[k][0] === t) sim.enqueue(SCRIPT[k++][1]);
    sim.step();
  }
  return sim;
}

describe('simulation determinism', () => {
  it('same seed and same commands give the same city', () => {
    const a = scripted(1234);
    expect(a.state.population).toBeGreaterThan(10);
    expect(serialize(a.state)).toEqual(serialize(scripted(1234).state));
  });

  it('a different seed gives a different city', () => {
    expect(serialize(scripted(1234).state)).not.toEqual(serialize(scripted(4321).state));
  });

  it('replaying the command log rebuilds the same city', () => {
    const sim = scripted(77);
    const again = replay(77, sim.log, sim.state.tick);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
    expect(again.state.commandsApplied).toBe(sim.log.length);
  });

  it('applies a command on the tick after it is queued, in queue order', () => {
    const sim = new Sim(5);
    sim.run(10);
    const a = sim.enqueue({ type: 'road', tiles: [T(10, 80)] });
    const b = sim.enqueue({ type: 'road', tiles: [T(11, 80)] });
    expect(a.tick).toBe(11);
    expect(sim.state.commandsApplied).toBe(0);
    sim.step();
    expect(sim.state.commandsApplied).toBe(2);
    expect(sim.state.undo.map((e) => e.roads)).toEqual([[T(10, 80)], [T(11, 80)]]);
    expect(b.seq).toBeGreaterThan(a.seq);
  });

  it('save round-trip carries on identically, even with settlers on the road', () => {
    const a = scripted(9, 300);
    expect(a.state.walkers.length).toBeGreaterThan(0);
    const b = new Sim(9);
    b.state = deserialize(serialize(a.state));
    a.run(2000);
    b.run(2000);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });

  it('refuses a save from another version with a plain message', () => {
    const s = JSON.parse(serialize(new Sim(1).state));
    s.version = 1;
    expect(() => deserialize(JSON.stringify(s))).toThrow(/version 1 /);
  });

  it('speed changes how fast ticks come, never what happens', () => {
    // Same number of ticks reached through different frame timings and speeds.
    const a = new Sim(3);
    const da = new ClockDriver(a, 'normal');
    a.enqueue({ type: 'road', tiles: row(0, 12, 80) });
    a.enqueue({ type: 'plots', at: [T(4, 78)] });
    // Frame times that are exact in binary, so the tick counts are exact too.
    for (let i = 0; i < 640; i++) da.update(1 / 64); // 10 s at normal = 100 ticks
    const b = new Sim(3);
    const db = new ClockDriver(b, 'fastest');
    b.enqueue({ type: 'road', tiles: row(0, 12, 80) });
    b.enqueue({ type: 'plots', at: [T(4, 78)] });
    for (let i = 0; i < 80; i++) db.update(1 / 32); // 2.5 s at x4 = 100 ticks
    expect(a.state.tick).toBe(b.state.tick);
    expect(serialize(a.state)).toEqual(serialize(b.state));
  });

  it('paused runs no ticks', () => {
    const sim = new Sim(3);
    const d = new ClockDriver(sim, 'paused');
    for (let i = 0; i < 100; i++) d.update(0.1);
    expect(sim.state.tick).toBe(0);
    d.setSpeed('normal');
    d.update(TICKS_PER_MONTH / 10);
    expect(sim.state.tick).toBe(Math.min(TICKS_PER_MONTH, 40));
  });

  it('pausing and carrying on returns to the speed that was running', () => {
    const d = new ClockDriver(new Sim(3), 'normal');
    d.setSpeed('fastest');
    d.togglePause();
    expect(d.speed).toBe('paused');
    d.togglePause();
    expect(d.speed).toBe('fastest');
  });
});
