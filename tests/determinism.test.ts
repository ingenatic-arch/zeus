import { describe, expect, it } from 'vitest';
import { ClockDriver } from '../src/game/clockDriver';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { deserialize, replay, serialize, Sim } from '../src/sim/sim';

function scripted(seed: number): Sim {
  const sim = new Sim(seed);
  for (let t = 0; t < 5000; t++) {
    if (t % 337 === 0) sim.enqueue({ type: 'mark', label: `at ${t}` });
    sim.step();
  }
  return sim;
}

describe('simulation determinism', () => {
  it('same seed and same commands give the same state', () => {
    expect(serialize(scripted(1234).state)).toEqual(serialize(scripted(1234).state));
  });

  it('a different seed gives a different state', () => {
    expect(serialize(scripted(1234).state)).not.toEqual(serialize(scripted(4321).state));
  });

  it('replaying the command log rebuilds the same state', () => {
    const sim = scripted(77);
    const again = replay(77, sim.log, sim.state.tick);
    expect(serialize(again.state)).toEqual(serialize(sim.state));
    expect(again.state.commandsApplied).toBe(sim.log.length);
  });

  it('applies a command on the tick after it is queued, in queue order', () => {
    const sim = new Sim(5);
    sim.run(10);
    const a = sim.enqueue({ type: 'mark', label: 'a' });
    const b = sim.enqueue({ type: 'mark', label: 'b' });
    expect(a.tick).toBe(11);
    expect(sim.state.commandsApplied).toBe(0);
    sim.step();
    expect(sim.state.commandsApplied).toBe(2);
    expect(sim.log.map((c) => c.command.label)).toEqual(['a', 'b']);
    expect(b.seq).toBeGreaterThan(a.seq);
  });

  it('save round-trip carries on identically', () => {
    const a = scripted(9);
    const b = new Sim(9);
    b.state = deserialize(serialize(a.state));
    a.run(2000);
    b.run(2000);
    expect(serialize(b.state)).toEqual(serialize(a.state));
  });

  it('refuses a save from another version with a plain message', () => {
    const s = JSON.parse(serialize(new Sim(1).state));
    s.version = 999;
    expect(() => deserialize(JSON.stringify(s))).toThrow(/version 999/);
  });

  it('speed changes how fast ticks come, never what happens', () => {
    // Same number of ticks reached through different frame timings and speeds.
    const a = new Sim(3);
    const da = new ClockDriver(a, 'normal');
    // Frame times that are exact in binary, so the tick counts are exact too.
    for (let i = 0; i < 640; i++) da.update(1 / 64); // 10 s at normal = 100 ticks
    const b = new Sim(3);
    const db = new ClockDriver(b, 'fastest');
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
});
