/**
 * Slice 48: the stores' rules and the workplaces' orders. A store that
 * doesn't accept a ware gets none, and one with a limit fills no further;
 * a store emptying a ware sends it out by cart and is fetched from first; a
 * store getting a ware has it brought over; goods never go round between
 * stores; a paused workplace has nobody, and one given its workers first is
 * filled first. The rules are saved, the same commands give the same town,
 * and an older save loads with every store accepting everything. And (slice
 * 44's finding) an alarm in Greece's news is known by its kind.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { jobsAt } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { news } from '../src/sim/diplomacy';
import { held, OIL, setHeld, WARES, WINE, type Ware } from '../src/sim/foods';
import { nearestBy } from '../src/sim/food';
import { roadsBeside } from '../src/sim/rounds';
import { stepMessages } from '../src/sim/heard';
import { rateOf } from '../src/sim/labour';
import { ALARM } from '../src/sim/messages';
import { migrate } from '../src/sim/migrate';
import { Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Building, type SimState } from '../src/sim/state';
import { EMPTY, fromStores, GET, isStore, limitOf, modeOf, REFUSE, roomOf } from '../src/sim/stores';
import { demoSim } from './prepared';

const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};

/** #richtown's two storehouses: the one up by the olive press, and the one by the quay (beside the winery). */
function storehouses(s: SimState): { hill: Building; quay: Building } {
  const press = s.buildings.find((b) => b.kind === 'press')!;
  const post = s.buildings.find((b) => b.kind === 'trading')!;
  const all = s.buildings.filter((b) => b.kind === 'storehouse');
  const near = (o: Building) => (b: Building) => Math.abs(b.x - o.x) + Math.abs(b.z - o.z);
  const hill = all.slice().sort((a, b) => near(press)(a) - near(press)(b))[0];
  const quay = all.slice().sort((a, b) => near(post)(a) - near(post)(b))[0];
  expect(hill).not.toBe(quay);
  return { hill, quay };
}

/** Run a town on, calling `each` after every tick. */
function play(sim: Sim, ticks: number, each?: () => void): void {
  for (let i = 0; i < ticks; i++) {
    sim.step();
    each?.();
  }
}

/** The carts setting out this tick from one store to another, as [from, to, ware]. */
const storeCarts = (s: SimState): Array<[Building, Building, Ware]> => {
  const out: Array<[Building, Building, Ware]> = [];
  for (const w of s.walkers) {
    if ((w.kind !== 'cart' && w.kind !== 'sledge') || w.back || w.since !== s.tick) continue;
    const from = s.buildings.find((b) => b.id === w.origin);
    const to = s.buildings.find((b) => b.id === w.target);
    if (from && to && isStore(from.kind) && isStore(to.kind)) out.push([from, to, w.food]);
  }
  return out;
};

describe('the stores’ rules', () => {
  it('a store that doesn’t accept a ware gets none of it, and the carts take it to another', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const { hill, quay } = storehouses(s);
    send(sim, { type: 'store', id: hill.id, ware: OIL, mode: REFUSE });
    expect(modeOf(hill, OIL)).toBe(REFUSE);
    const t0 = s.tick;
    let most = held(hill, OIL);
    const quayBefore = held(quay, OIL);
    let brought = 0;
    play(sim, 3 * TICKS_PER_MONTH, () => {
      expect(held(hill, OIL)).toBeLessThanOrEqual(most);
      most = held(hill, OIL);
      // (A cart already on its way is turned away at the gate: none sets out for it.)
      for (const w of s.walkers) if (w.kind === 'cart' && w.food === OIL && !w.back && w.since > t0) expect(w.target).not.toBe(hill.id);
    });
    brought = held(quay, OIL) - quayBefore;
    // The press's oil went down to the quay's storehouse instead.
    expect(brought).toBeGreaterThan(0);
  });

  it('a limit stops deliveries at that share of the room', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const { quay } = storehouses(s);
    send(sim, { type: 'store', id: quay.id, ware: WINE, limit: 2 });
    expect(limitOf(quay, WINE)).toBe(roomOf('storehouse', WINE) / 2);
    play(sim, 4 * TICKS_PER_MONTH, () => {
      expect(held(quay, WINE)).toBeLessThanOrEqual(Math.max(limitOf(quay, WINE), 0));
    });
  });

  it('accept nothing in one click, and everything again', () => {
    const sim = demoSim('richtown');
    const { quay } = storehouses(sim.state);
    send(sim, { type: 'store', id: quay.id, ware: OIL, mode: EMPTY });
    send(sim, { type: 'store', id: quay.id, all: 'none' });
    for (const w of WARES) if (roomOf('storehouse', w) > 0) expect(modeOf(quay, w)).toBe(w === OIL ? EMPTY : REFUSE);
    send(sim, { type: 'store', id: quay.id, all: 'all' });
    expect(quay.rules.every((r) => r === 0)).toBe(true);
    // (Anything wrong does nothing.)
    send(sim, { type: 'store', id: quay.id, ware: 0, mode: REFUSE });
    send(sim, { type: 'store', id: quay.id, ware: OIL, mode: 7 });
    expect(quay.rules.every((r) => r === 0)).toBe(true);
  });

  it('a store getting a ware has it carted over, up to its limit', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const { hill, quay } = storehouses(s);
    send(sim, { type: 'store', id: quay.id, ware: OIL, mode: GET, limit: 2 });
    let carted = 0;
    const had = held(hill, OIL);
    play(sim, 2 * TICKS_PER_MONTH, () => {
      for (const [from, to, w] of storeCarts(s)) {
        if (w !== OIL) continue;
        expect(from).toBe(hill);
        expect(to).toBe(quay);
        carted++;
      }
      expect(held(quay, OIL)).toBeLessThanOrEqual(limitOf(quay, OIL));
    });
    // (The quay's store sells what comes to the ship, so what it holds needn't grow: the carts and the hill's store are the test.)
    expect(carted).toBeGreaterThan(0);
    expect(held(hill, OIL)).toBeLessThan(had);
  });

  it('a store emptying a ware sends it out by cart, and is where whoever fetches it goes first', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const size = sim.map.size;
    const { hill, quay } = storehouses(s);
    const post = s.buildings.find((b) => b.kind === 'trading')!;
    // Whoever fetches oil from the quay goes to the quay's storehouse, the nearer; once the hill's empties oil, there first.
    setHeld(quay, OIL, 300);
    const holding = (g: Building): boolean => g.kind === 'storehouse' && held(g, OIL) > 0;
    expect(nearestBy(s, size, roadsBeside(s, size, post), holding, fromStores(OIL))?.g).toBe(quay);
    send(sim, { type: 'store', id: hill.id, ware: OIL, mode: EMPTY });
    expect(nearestBy(s, size, roadsBeside(s, size, post), holding, fromStores(OIL))?.g).toBe(hill);
    // A paused store never.
    send(sim, { type: 'work', id: hill.id, paused: true });
    expect(nearestBy(s, size, roadsBeside(s, size, post), holding, fromStores(OIL))?.g).toBe(quay);
    send(sim, { type: 'work', id: hill.id, paused: false });
    const had = held(hill, OIL);
    let out = 0;
    play(sim, TICKS_PER_MONTH, () => {
      for (const [from, to, w] of storeCarts(s)) {
        if (w !== OIL) continue;
        expect(from).toBe(hill);
        expect(to).toBe(quay);
        out++;
      }
    });
    expect(out).toBeGreaterThan(0);
    expect(held(hill, OIL)).toBeLessThan(had);
  });

  it('goods never go round between stores: none from a store getting them, none to a store emptying them', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const { hill, quay } = storehouses(s);
    const granary = s.buildings.find((b) => b.kind === 'granary')!;
    const orders: Array<[number, Parameters<Sim['enqueue']>[0]]> = [
      [0, { type: 'store', id: quay.id, ware: OIL, mode: GET }],
      [0, { type: 'store', id: hill.id, ware: OIL, mode: GET }],
      [TICKS_PER_MONTH, { type: 'store', id: hill.id, ware: OIL, mode: EMPTY }],
      [2 * TICKS_PER_MONTH, { type: 'store', id: quay.id, ware: WINE, mode: EMPTY }],
      [2 * TICKS_PER_MONTH, { type: 'store', id: hill.id, ware: WINE, mode: GET, limit: 3 }],
      [3 * TICKS_PER_MONTH, { type: 'store', id: quay.id, ware: OIL, mode: EMPTY }],
      [4 * TICKS_PER_MONTH, { type: 'store', id: granary.id, ware: 0, limit: 1 }],
    ];
    const t0 = s.tick;
    let carts = 0;
    for (let i = 0; i < 6 * TICKS_PER_MONTH; i++) {
      for (const [at, c] of orders) if (s.tick - t0 === at) send(sim, c);
      sim.step();
      for (const [from, to, w] of storeCarts(s)) {
        carts++;
        // Only from a store emptying it, or to a store getting it; never from a getter, never to an emptier.
        expect(modeOf(from, w) === EMPTY || modeOf(to, w) === GET).toBe(true);
        expect(modeOf(to, w)).not.toBe(EMPTY);
        expect(from).not.toBe(to);
      }
      for (const g of [hill, quay, granary]) for (const w of WARES) if (roomOf(g.kind, w) > 0) expect(held(g, w)).toBeLessThanOrEqual(roomOf(g.kind, w));
    }
    expect(carts).toBeGreaterThan(0);
  });

  it('a paused store takes nothing and gives nothing', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const { hill } = storehouses(s);
    send(sim, { type: 'work', id: hill.id, paused: true });
    expect(hill.workers).toBe(0);
    play(sim, TICKS_PER_MONTH, () => {
      for (const w of s.walkers) if (!w.back && w.since === s.tick && (w.kind === 'cart' || w.kind === 'porter' || w.kind === 'docker')) expect(w.target).not.toBe(hill.id);
    });
  });
});

describe('a workplace’s orders', () => {
  it('paused, it has nobody and its workers go elsewhere; set going again, it fills again', () => {
    const sim = demoSim('richtown');
    const s = sim.state;
    const press = s.buildings.find((b) => b.kind === 'press')!;
    expect(press.workers).toBeGreaterThan(0);
    const working = (): number => s.buildings.reduce((a, b) => a + (b.kind === 'home' ? 0 : b.workers), 0);
    const before = working();
    send(sim, { type: 'work', id: press.id, paused: true });
    expect(press.paused).toBe(1);
    expect(press.workers).toBe(0);
    expect(rateOf(press)).toBe(0);
    // (Its workers went to other jobs, where there were jobs short.)
    expect(working()).toBeGreaterThanOrEqual(before - jobsAt(press));
    const oil = held(press, OIL);
    play(sim, 10 * TICKS_PER_DAY);
    expect(press.workers).toBe(0);
    expect(held(press, OIL)).toBeLessThanOrEqual(oil);
    send(sim, { type: 'work', id: press.id, paused: false });
    expect(press.workers).toBeGreaterThan(0);
  });

  it('given its workers first, a workplace short of them fills before the rest', () => {
    const sim = demoSim('workers');
    const s = sim.state;
    const short = s.buildings.filter((b) => jobsAt(b) > 0 && b.workers < jobsAt(b));
    expect(short.length).toBeGreaterThan(0);
    // The one furthest from being full.
    const p = short.sort((a, b) => a.workers / jobsAt(a) - b.workers / jobsAt(b) || a.id - b.id)[0];
    const had = p.workers;
    send(sim, { type: 'work', id: p.id, first: true });
    expect(p.first).toBe(1);
    expect(p.workers).toBeGreaterThan(had);
    play(sim, 3 * TICKS_PER_DAY);
    expect(p.workers).toBeGreaterThan(had);
  });
});

describe('saves and sameness', () => {
  it('the same commands give the same town', () => {
    const run = (): string => {
      const sim = demoSim('richtown');
      const { hill, quay } = storehouses(sim.state);
      const press = sim.state.buildings.find((b) => b.kind === 'press')!;
      send(sim, { type: 'store', id: quay.id, ware: OIL, mode: GET });
      send(sim, { type: 'store', id: hill.id, ware: WINE, mode: EMPTY, limit: 1 });
      send(sim, { type: 'work', id: press.id, first: true });
      play(sim, 40 * TICKS_PER_DAY);
      return JSON.stringify(sim.state);
    };
    expect(run()).toBe(run());
  });

  it('rules and orders are saved', () => {
    const sim = demoSim('richtown');
    const { quay } = storehouses(sim.state);
    const press = sim.state.buildings.find((b) => b.kind === 'press')!;
    send(sim, { type: 'store', id: quay.id, ware: OIL, mode: EMPTY, limit: 3 });
    send(sim, { type: 'work', id: press.id, paused: true, first: true });
    const d = decodeSave(encodeSave(sim.state, 0));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(JSON.stringify(d.file.state)).toBe(JSON.stringify(sim.state));
  });

  it('an older save loads with every store accepting everything and nothing paused', () => {
    const sim = demoSim('richtown');
    const old = JSON.parse(JSON.stringify(sim.state)) as Record<string, unknown> & { buildings: Array<Record<string, unknown>> };
    for (const b of old.buildings) {
      delete b.paused;
      delete b.first;
      delete b.rules;
    }
    old.version = SIM_STATE_VERSION - 1;
    expect(migrate(old)).toBe(SIM_STATE_VERSION - 1);
    expect(old.version).toBe(SIM_STATE_VERSION);
    expect(JSON.stringify(old)).toBe(JSON.stringify(sim.state));
  });
});

describe('alarms by their kind (slice 44’s finding)', () => {
  it('an alarm in Greece’s news is heard as its kind, whatever its words', () => {
    const s = new Sim().state;
    news(s.world, s.tick, 'sparta', 'Spartans at the gate, in words no rule knows', true, 'raid');
    news(s.world, s.tick, 'troy', 'Troy’s ships across the harbour, worded anew', true, 'blockade');
    stepMessages(s, new Sim().map);
    const got = s.messages.log.slice(-2).map((m) => [m.kind, m.u]);
    expect(got).toEqual([
      ['raid', ALARM],
      ['blockade', ALARM],
    ]);
  });
});
