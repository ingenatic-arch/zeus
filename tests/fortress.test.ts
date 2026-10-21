/**
 * Slice 29: #fortress, the phase's prepared town. It opens with its walls,
 * gates and towers, two barracks and three companies, two triremes, a loan
 * each way and Sparta's band on the road; played on with its companies held
 * inside the west gate, the band is met there, and the books add up.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { menOf } from '../src/sim/army';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { reachesEdge } from '../src/sim/raids';
import { Sim } from '../src/sim/sim';
import type { SimState } from '../src/sim/state';
import { totals, wageBill } from '../src/sim/treasury';
import { demoSim } from './prepared';

const N = 128;
const tile = (x: number, z: number): number => z * N + x;
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
/** Inside the west gate, on the main street. */
const HOLD = tile(43, 41);

describe('#fortress', () => {
  it('opens with walls, gates and towers, two barracks, three companies, two triremes, a loan each way and Sparta’s band on the road', () => {
    const s = demoSim('fortress').state;
    const gates = s.walls.filter((p) => p.gate).map((p) => p.t);
    expect(gates).toContain(tile(40, 41));
    expect(gates.some((t) => Math.floor(t / N) === 22)).toBe(true);
    const towers = s.buildings.filter((b) => b.kind === 'tower');
    expect(towers.length).toBe(3);
    for (const b of towers) expect(b.workers).toBeGreaterThan(0);
    const barracks = s.buildings.filter((b) => b.kind === 'barracks');
    expect(barracks.length).toBe(2);
    expect(s.army.companies.length).toBe(3);
    for (const c of s.army.companies) expect(menOf(s, c).length).toBeGreaterThanOrEqual(10);
    const ships = s.fleet.triremes.filter((t) => t.state === 'moored');
    expect(ships.length).toBe(2);
    for (const t of ships) expect(t.crew.length).toBe(12);
    expect(s.world.loans.some((l) => l.side === 'in' && l.state === 'running')).toBe(true);
    expect(s.world.loans.some((l) => l.side === 'out' && l.state === 'running')).toBe(true);
    const r = s.world.raids.find((x) => x.ended === 0)!;
    expect(r.city).toBe('sparta');
    expect(['gathering', 'marching']).toContain(r.phase);
    const days = (reachesEdge(s, r) - s.tick) / TICKS_PER_DAY;
    expect(days).toBeGreaterThan(14);
    expect(days).toBeLessThan(28);
    expect(s.money).toBeGreaterThan(2 * wageBill(s));
    ledgerAddsUp(s);
  });

  it('played on with its companies inside the west gate, the band is met there and the books add up, month by month', () => {
    const sim = demoSim('fortress');
    const s = sim.state;
    for (const c of s.army.companies) sim.enqueue({ type: 'banner', company: c.id, tile: HOLD });
    sim.flush();
    const r = s.world.raids.find((x) => x.ended === 0)!;
    for (let m = 0; m < 4 && r.ended === 0; m++) {
      sim.run(TICKS_PER_MONTH);
      ledgerAddsUp(s);
    }
    expect(r.ended).toBeGreaterThan(0);
    expect(r.fallen).toBeGreaterThan(r.men / 3);
    expect(r.stole).toBe(0);
    // (A save made after it opens again, the same town.)
    const d = decodeSave(encodeSave(s, 0));
    expect(d.ok).toBe(true);
    if (d.ok) {
      const again = new Sim();
      again.state = d.file.state;
      again.run(TICKS_PER_DAY);
      sim.run(TICKS_PER_DAY);
      expect(again.state.money).toBe(s.money);
    }
  });
});
