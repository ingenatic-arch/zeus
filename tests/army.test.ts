import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { coast } from '../src/map/coast';
import { companiesAt, COMPANY_SIZE, marchRefusal, menOf, readyOf, servingHomes } from '../src/sim/army';
import { buildingRefusal, copperOf, MINE_COPPER_MIN } from '../src/sim/build';
import { around, findBuilding, FINE, footprint, TOWNHOUSE } from '../src/sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { ARMOUR, GOOD_COUNT, held, setHeld } from '../src/sim/foods';
import { SIM_STATE_VERSION } from '../src/sim/state';
import { TRADE_GOODS } from '../src/sim/trade';
import { canWork, canWorkIn } from '../src/sim/labour';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { TILE_ROAD, type Building, type SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { demoSim } from './prepared';

const N = 128;

/** A spot for a building of this kind with a road beside it, nearest (x, z). */
function siteFor(sim: Sim, kind: 'barracks' | 'storehouse', x: number, z: number): number {
  const s = sim.state;
  let best = -1;
  let bd = Infinity;
  const side = kind === 'barracks' ? 4 : 3;
  for (let tz = 1; tz < N - side; tz++) {
    for (let tx = 1; tx < N - side; tx++) {
      if (buildingRefusal(sim.map, s, kind, tx, tz) !== '') continue;
      const ring: number[] = [];
      for (let d = 0; d < side; d++) ring.push((tz - 1) * N + tx + d, (tz + side) * N + tx + d, (tz + d) * N + tx - 1, (tz + d) * N + tx + side);
      if (!ring.some((t) => s.tiles[t] === TILE_ROAD)) continue;
      const d = Math.hypot(tx - x, tz - z);
      if (d < bd) {
        bd = d;
        best = tz * N + tx;
      }
    }
  }
  return best;
}

/** #richtown's town with a barracks by the core (and money to pay for it), and armour in a storehouse. */
function withBarracks(armour = 40): { sim: Sim; b: Building } {
  const sim = demoSim('richtown');
  const s = sim.state;
  const at = siteFor(sim, 'barracks', 74, 46);
  expect(at).toBeGreaterThanOrEqual(0);
  sim.enqueue({ type: 'build', kind: 'barracks', at: [at] });
  sim.flush();
  const b = s.buildings[s.buildings.length - 1];
  expect(b.kind).toBe('barracks');
  // (The storehouse nearest it: the porter walks there and back by road.)
  const store = s.buildings.filter((g) => g.kind === 'storehouse').sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];
  setHeld(store, ARMOUR, armour);
  // Its workers come at the start of the next day.
  sim.run(TICKS_PER_DAY + 1);
  return { sim, b };
}

const ledgerAddsUp = (s: SimState): void => {
  expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
};

describe('copper on the hills', () => {
  it('each outcrop has rock rich enough for a mine, and a mine is refused elsewhere', () => {
    const sim = new Sim();
    for (const o of coast.copper) expect(copperOf(sim.map, Math.round(o.x - 1), Math.round(o.z - 1), 2)).toBeGreaterThan(MINE_COPPER_MIN);
    expect(buildingRefusal(sim.map, sim.state, 'mine', 60, 50)).toMatch(/No copper/);
    // Somewhere in each outcrop a mine can go.
    for (const o of coast.copper) {
      let ok = false;
      for (let z = Math.floor(o.z - o.r); z <= o.z + o.r && !ok; z++) for (let x = Math.floor(o.x - o.r); x <= o.x + o.r && !ok; x++) ok = buildingRefusal(sim.map, sim.state, 'mine', x, z) === '';
      expect(ok).toBe(true);
    }
  });
});

describe('the barracks', () => {
  it('raises a company of hoplites from fine houses and villas, one man a home, and arms them from the stores', () => {
    const { sim, b } = withBarracks();
    const s = sim.state;
    expect(b.workers).toBeGreaterThan(0);
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'hoplite' });
    sim.run(12 * TICKS_PER_DAY);
    const [c] = companiesAt(s, b);
    expect(c.kind).toBe('hoplite');
    const men = menOf(s, c);
    expect(men.length).toBe(COMPANY_SIZE);
    // One man a home, from fine houses and villas, who has left his work.
    const homes = new Set(men.map((x) => x.home));
    expect(homes.size).toBe(COMPANY_SIZE);
    for (const id of homes) {
      const h = findBuilding(s, id)!;
      expect(h.level).toBeGreaterThanOrEqual(FINE);
      expect(canWorkIn(s, h)).toBe(Math.max(0, canWork(h) - 1));
    }
    expect(servingHomes(s).size).toBe(COMPANY_SIZE);
    // Each with a name, and his father's.
    expect(men.every((x) => x.name.length > 0 && x.house.length > 0)).toBe(true);
    sim.run(40 * TICKS_PER_DAY);
    expect(readyOf(s, c).length).toBe(COMPANY_SIZE);
    expect(menOf(s, c).every((x) => x.armed)).toBe(true);
    // Sixteen sets issued in the stock book.
    const issued = s.stocks.now.concat(s.stocks.last).filter((l) => l.ware === ARMOUR && l.kind === 'used' && l.what === 'barracks').reduce((a, l) => a + l.n, 0);
    expect(issued).toBe(COMPANY_SIZE);
    ledgerAddsUp(s);
  });

  it('says why a company can’t fill: no armour, or too few homes', () => {
    const { sim, b } = withBarracks(5);
    const s = sim.state;
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'hoplite' });
    sim.run(60 * TICKS_PER_DAY);
    const [c] = companiesAt(s, b);
    expect(menOf(s, c).filter((x) => x.armed).length).toBe(5);
    expect(c.why).toMatch(/No armour in the stores: 11 men are waiting/);
    // Archers come from townhouses and better, and need no armour.
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'archer' });
    sim.run(40 * TICKS_PER_DAY);
    const archers = companiesAt(s, b)[1];
    expect(readyOf(s, archers).length).toBe(COMPANY_SIZE);
    for (const x of menOf(s, archers)) expect(findBuilding(s, x.home)!.level).toBeGreaterThanOrEqual(TOWNHOUSE);
  });

  it('pays its soldiers monthly on their own ledger line', () => {
    const { sim, b } = withBarracks();
    const s = sim.state;
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'archer' });
    sim.run(TICKS_PER_MONTH - (s.tick % TICKS_PER_MONTH) + 2);
    const line = s.ledger.now.find((l) => l.kind === 'soldiers');
    expect(line).toBeDefined();
    expect(line!.amount).toBe(-3 * line!.n);
    expect(line!.n).toBeGreaterThan(0);
    ledgerAddsUp(s);
  });

  it('marches a company to a tile by roads and open ground, round buildings, and back to barracks', () => {
    const { sim, b } = withBarracks();
    const s = sim.state;
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'hoplite' });
    sim.run(60 * TICKS_PER_DAY);
    const [c] = companiesAt(s, b);
    expect(readyOf(s, c).length).toBe(COMPANY_SIZE);
    // Across the town: the main street's west end.
    const goal = 41 * N + 30;
    expect(marchRefusal(s, sim.map, c, goal)).toBe('');
    expect(marchRefusal(s, sim.map, c, s.buildings.find((h) => h.kind === 'home')!.z * N + s.buildings.find((h) => h.kind === 'home')!.x)).toMatch(/building/);
    sim.enqueue({ type: 'banner', company: c.id, tile: goal });
    const own = new Set(footprint(N, b.x, b.z, 4));
    let onBuilding = 0;
    for (let i = 0; i < 1500 && c.order !== 'hold'; i++) {
      sim.step();
      const t = Math.floor(c.z) * N + Math.floor(c.x);
      if (s.tiles[t] > 0 && !own.has(t)) onBuilding++;
    }
    expect(onBuilding).toBe(0);
    expect(c.order).toBe('hold');
    sim.run(100);
    for (const x of readyOf(s, c)) expect(Math.hypot(x.x - c.x, x.z - c.z)).toBeLessThan(1);
    // Back to barracks.
    sim.enqueue({ type: 'banner', company: c.id, tile: -1 });
    for (let i = 0; i < 1500 && c.order !== 'drill'; i++) sim.step();
    expect(c.order).toBe('drill');
    expect(own.has(Math.floor(c.z) * N + Math.floor(c.x))).toBe(true);
    // An unreachable tile is refused (the sea).
    expect(marchRefusal(s, sim.map, c, 110 * N + 40)).not.toBe('');
  });

  it('dismissed, the men go home to their jobs and their armour back to the stores', () => {
    const { sim, b } = withBarracks();
    const s = sim.state;
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'hoplite' });
    sim.run(60 * TICKS_PER_DAY);
    const [c] = companiesAt(s, b);
    expect(readyOf(s, c).length).toBe(COMPANY_SIZE);
    const homes = menOf(s, c).map((x) => findBuilding(s, x.home)!);
    const armourBefore = s.buildings.reduce((a, g) => a + (g.kind === 'storehouse' ? held(g, ARMOUR) : 0), 0) + held(b, ARMOUR);
    sim.enqueue({ type: 'dismiss', company: c.id });
    sim.flush();
    expect(s.army.companies.length).toBe(0);
    for (const h of homes) expect(canWorkIn(s, h)).toBe(canWork(h));
    sim.run(60 * TICKS_PER_DAY);
    expect(s.army.soldiers.length).toBe(0);
    // (The rack's carts take the sets back a load at a time.)
    for (let i = 0; i < 120 * TICKS_PER_DAY && (held(b, ARMOUR) > 0 || s.walkers.some((w) => w.origin === b.id)); i++) sim.step();
    // Every set back in the stores (none left on the barracks' rack).
    expect(held(b, ARMOUR)).toBe(0);
    const armourAfter = s.buildings.reduce((a, g) => a + (g.kind === 'storehouse' ? held(g, ARMOUR) : 0), 0);
    expect(armourAfter).toBe(armourBefore + COMPANY_SIZE);
  });

  it('plays the same with the same commands, and a save mid-march plays on the same', () => {
    const play = (): Sim => {
      const { sim, b } = withBarracks();
      sim.enqueue({ type: 'raise', barracks: b.id, kind: 'hoplite' });
      sim.run(25 * TICKS_PER_DAY);
      sim.enqueue({ type: 'banner', company: sim.state.army.companies[0].id, tile: 41 * N + 40 });
      sim.run(60);
      return sim;
    };
    const a = play();
    const b = play();
    expect(serialize(a.state)).toBe(serialize(b.state));
    const c = new Sim();
    c.state = deserialize(serialize(a.state));
    a.run(400);
    c.run(400);
    expect(serialize(c.state)).toBe(serialize(a.state));
  });

  it('clearing the barracks disbands its companies', () => {
    const { sim, b } = withBarracks();
    const s = sim.state;
    sim.enqueue({ type: 'raise', barracks: b.id, kind: 'archer' });
    sim.run(10 * TICKS_PER_DAY);
    expect(s.army.soldiers.length).toBeGreaterThan(0);
    sim.enqueue({ type: 'clear', x0: b.x, z0: b.z, x1: b.x + 1, z1: b.z + 1 });
    sim.flush();
    expect(s.army.companies.length).toBe(0);
    expect(s.army.soldiers.every((x) => x.state === 'leaving')).toBe(true);
    sim.run(40 * TICKS_PER_DAY);
    expect(s.army.soldiers.length).toBe(0);
    expect(around(N, b).length).toBeGreaterThan(0);
  });
});

describe('old saves', () => {
  it('a slice 22 save (version 21, every route open) loads with no army, every goods list two longer, and plays on', () => {
    const text = gunzipSync(readFileSync('tests/fixtures/slice22-rivals.save.json.gz')).toString();
    expect(JSON.parse(text).state.version).toBe(21);
    const got = decodeSave(text);
    if (!got.ok) throw new Error(got.why);
    const s = got.file.state;
    expect(s.version).toBe(SIM_STATE_VERSION);
    expect(s.army).toEqual({ companies: [], soldiers: [], nextId: 1 });
    for (const b of s.buildings) expect(b.goods.length).toBe(GOOD_COUNT);
    expect(s.trade.sell.length).toBe(TRADE_GOODS.length);
    for (const c of s.world.cities) expect(c.price.length).toBe(TRADE_GOODS.length);
    for (const r of s.world.routes) expect(r.sold.length).toBe(TRADE_GOODS.length);
    const people = s.population;
    const sim = new Sim();
    sim.state = s;
    sim.run(TICKS_PER_MONTH);
    expect(s.population).toBeGreaterThan(people * 0.9);
    expect(decodeSave(encodeSave(s, 1)).ok).toBe(true);
  }, 60000);
});

