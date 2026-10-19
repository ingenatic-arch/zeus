/**
 * #rivals (slice 22): the prepared town trading with every city of Greece
 * opens with every route open and trading, a request and a threat open, a
 * war between rivals on, caravans in the streets and a ship at the quay or
 * coming; and it plays a year on with the treasury and the ledger agreeing.
 */
import { describe, expect, it } from 'vitest';
import { bake } from '../scripts/bake';
import { DEMOS } from '../src/game/demos';
import { decodeSave } from '../src/game/saves';
import { TICKS_PER_MONTH } from '../src/sim/clock';
import { liveRaid } from '../src/sim/raids';
import { warOf } from '../src/sim/rivals';
import { Sim } from '../src/sim/sim';
import type { SimState } from '../src/sim/state';
import { totals } from '../src/sim/treasury';
import { demoSim } from './prepared';

const ledgerAddsUp = (s: SimState): void => {
  expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
  expect(s.money).toBeGreaterThanOrEqual(0);
};

describe('#rivals', () => {
  it('opens trading with every city, a request, a threat and a war on, traders in the city', () => {
    const s = demoSim('rivals').state;
    const keys = s.world.routes.map((r) => `${r.city}-${r.kind}`).sort();
    expect(keys).toEqual(['athens-land', 'athens-sea', 'corinth-land', 'corinth-sea', 'sparta-land', 'troy-sea']);
    // (Every route has had its traders come at least once.)
    for (const r of s.world.routes) expect(r.visits, `${r.city}-${r.kind}`).toBeGreaterThan(0);
    const request = s.world.deals.find((d) => d.city === 'athens' && d.kind === 'request' && d.state === 'open');
    expect(request).toBeDefined();
    const raid = liveRaid(s.world);
    expect(raid?.city).toBe('sparta');
    const war = warOf(s.world, 'troy');
    expect(war && [war.a, war.b].sort()).toEqual(['athens', 'troy']);
    // The request ends with the war, or before.
    expect(request!.due).toBeLessThanOrEqual(war!.until);
    expect(s.walkers.filter((w) => w.kind === 'caravan').length).toBeGreaterThanOrEqual(2);
    ledgerAddsUp(s);
  });

  it('the three tokens open the one town, over the city, on the map and by the yard', () => {
    expect([DEMOS.rivals.view, DEMOS.rivalsmap.greece, DEMOS.rivalstreet.view]).toEqual(['rivals', true, 'rivalstreet']);
  });

  it('prepared, it is the town its setup makes, and plays on the same', () => {
    const text = bake('rivals');
    expect(text).not.toBeNull();
    const d = decodeSave(text);
    expect(d.ok).toBe(true);
    const a = new Sim();
    if (d.ok) a.state = d.file.state;
    const b = new Sim();
    DEMOS.rivals.setup!(b);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    a.run(900);
    b.run(900);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  }, 180000);

  it('plays a year on, the ledger adding up every month', () => {
    const sim = demoSim('rivals');
    for (let m = 0; m < 12; m++) {
      sim.run(TICKS_PER_MONTH);
      ledgerAddsUp(sim.state);
    }
    expect(sim.state.population).toBeGreaterThan(1000);
  }, 180000);
});
