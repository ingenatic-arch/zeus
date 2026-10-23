/**
 * Slice 38: contested seas. Blockades of your harbour (telegraphed, holding,
 * closing the harbour, broken by your triremes, lifted when their war ends,
 * none without a harbour to close), warships on the lanes in rivals' wars,
 * expeditions meeting pirates at sea, broken oars and repairs, the findings
 * carried over (the landing beach, collectors within a fortnight, a laden
 * ship's loot, every lane a place), and saves (mid-blockade, and a version
 * 33 save brought up through fromSlice38). The towns are the demos': #pirates
 * (trading with Athens by sea, a shipyard and a crewed trireme), #fortress
 * (Athens and Troy by sea, two triremes, companies) and #landing.
 */
import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/game/saves';
import { lineLength, wayOf, wayPoints, WAYS } from '../src/map/greece';
import { BAY_TICKS, blockadeOn, blockadeOnMap, sendBlockade, stageBlockade, toBreak, warsWithYou, WARSHIP_WARNING } from '../src/sim/blockades';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { GIFT_COINS, giftRefusal } from '../src/sim/diplomacy';
import { sendExpedition } from '../src/sim/expeditions';
import { CHEESE, FLEECE, MEAT, OIL, WHEAT, WINE } from '../src/sim/foods';
import { CRIPPLED_OARS, daysToMend, FIT, fit, LANES, MEND_A_DAY, OARS_A_DAY, oarPace, pirateBand, ROW_PACE, shipsOf, stationAlong } from '../src/sim/fleet';
import { blockaded } from '../src/sim/lanes';
import { migrate } from '../src/sim/migrate';
import { raidersOf, threaten } from '../src/sim/raids';
import { declareWar, endWar } from '../src/sim/rivals';
import { routeOf } from '../src/sim/routes';
import { deserialize, serialize, Sim } from '../src/sim/sim';
import { SIM_STATE_VERSION, type Raid, type SimState } from '../src/sim/state';
import { SHIP_AWAY, SHIP_COMING, SHIP_LEAVING, SHIP_MOORED, tradingPost } from '../src/sim/trade';
import { totals } from '../src/sim/treasury';
import { cityOf } from '../src/sim/world';
import { demoSim } from './prepared';

const made: Record<string, string> = {};
const fresh = (name: string): Sim => {
  made[name] ??= serialize(demoSim(name).state);
  const sim = new Sim();
  sim.state = deserialize(made[name]);
  return sim;
};
const send = (sim: Sim, c: Parameters<Sim['enqueue']>[0]): void => {
  sim.enqueue(c);
  sim.flush();
};
const until = (sim: Sim, ok: () => boolean, most: number): boolean => {
  for (let i = 0; i < most && !ok(); i++) sim.step();
  return ok();
};
const ledgerAddsUp = (s: SimState): void => expect(s.ledger.start + totals(s.ledger.now).net).toBe(s.money);
const STAGED = 'set up for this test';
const war = { city: 'troy' as const, cause: 'staged' as const, of: 0, why: STAGED };

describe('blockades', () => {
  it('a war sends a fleet that is told at once, sails its lane, shows on the horizon, takes station and closes the harbour, which opens when its war ends', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    // (No triremes, so nothing breaks it.)
    s.fleet.triremes = [];
    const b = sendBlockade(s, war, 3, s.tick + 4 * TICKS_PER_MONTH);
    expect(b.phase).toBe('sailing');
    expect(s.world.news.at(-1)!.line).toMatch(/Troy’s fleet has put to sea to blockade your harbour/);
    expect(s.world.news.at(-1)!.urgent).toBe(true);
    // At least ten days' warning before it holds.
    expect(b.arrives - s.tick).toBeGreaterThanOrEqual(8 * TICKS_PER_DAY);
    const a0 = blockadeOnMap(s, b, s.tick)!;
    const a1 = blockadeOnMap(s, b, s.tick + 5 * TICKS_PER_DAY)!;
    expect(a1.along).toBeLessThan(a0.along);
    expect(until(sim, () => b.phase === 'coming', 2 * TICKS_PER_MONTH)).toBe(true);
    expect(s.fleet.ships.filter((e) => e.blockade === b.id).length).toBe(3);
    expect(blockaded(s)).toBeUndefined();
    const sighted = s.tick;
    expect(until(sim, () => b.phase === 'holding', TICKS_PER_MONTH)).toBe(true);
    expect(s.tick - b.seen).toBeGreaterThanOrEqual(10 * TICKS_PER_DAY);
    expect(s.tick - sighted).toBeGreaterThan(TICKS_PER_DAY);
    expect(blockaded(s)).toBe(b);
    // (Review of slice 38: the lines' days come true: on station about BAY_TICKS after the sails are seen, as the Sails! line says, and about when the first line said.)
    expect(Math.abs(s.tick - sighted - BAY_TICKS)).toBeLessThanOrEqual(TICKS_PER_DAY);
    expect(s.world.news.some((n) => n.line.startsWith('Sails! Troy’s blockading fleet') && n.line.endsWith(`in about ${Math.round(BAY_TICKS / TICKS_PER_DAY)} days`))).toBe(true);
    expect(Math.abs(s.tick - (b.arrives + BAY_TICKS))).toBeLessThanOrEqual(TICKS_PER_DAY);
    // (And no gift goes by sea while it holds; Troy is reached only by sea.)
    expect(giftRefusal(s, sim.map, 'troy', -1, GIFT_COINS[0])).toMatch(/fleet holds the mouth of your harbour/);
    // While it holds, no ship comes in from beyond the mouth, and none leaves the quay.
    const ship = s.trade.ship;
    const route = routeOf(s, 'athens', 'sea')!;
    const v = route.ship!;
    let came = false;
    let left = false;
    const wasMoored = ship.phase === SHIP_MOORED;
    for (let i = 0; i < 2 * TICKS_PER_MONTH; i++) {
      const before = [ship.phase, v.phase];
      sim.step();
      if (before[0] === SHIP_AWAY && ship.phase === SHIP_COMING) came = true;
      if (before[1] === SHIP_AWAY && v.phase === SHIP_COMING) came = true;
      if (before[0] === SHIP_MOORED && ship.phase === SHIP_LEAVING) left = true;
      if (before[1] === SHIP_MOORED && v.phase === SHIP_LEAVING) left = true;
    }
    expect(came).toBe(false);
    expect(left).toBe(false);
    void wasMoored;
    // The Tyrian ship is held (out at sea or at the quay), and her line says so.
    expect(ship.phase === SHIP_AWAY || ship.phase === SHIP_MOORED).toBe(true);
    // The war over: lifted, its ships sail off, and the ship due sails in.
    b.until = s.tick;
    expect(until(sim, () => b.phase === 'over', 2 * TICKS_PER_DAY)).toBe(true);
    expect(b.end).toBe('peace');
    expect(blockaded(s)).toBeUndefined();
    expect(s.fleet.ships.filter((e) => e.blockade === b.id).every((e) => e.state === 'leaving')).toBe(true);
    expect(until(sim, () => ship.phase === SHIP_COMING || ship.phase === SHIP_LEAVING, 3 * TICKS_PER_DAY)).toBe(true);
    expect(until(sim, () => !s.fleet.ships.some((e) => e.blockade === b.id), TICKS_PER_MONTH)).toBe(true);
  }, 300000);

  it('your triremes break it: half its ships sunk, the rest flee; its city remembers and its fleet is the smaller; the triremes come home hurt and are mended', () => {
    const sim = fresh('fortress');
    const s = sim.state;
    const troyFleet = cityOf(s.world, 'troy').fleet;
    const b = stageBlockade(s, sim.map, 'troy', 2, STAGED, s.tick + 6 * TICKS_PER_MONTH)!;
    expect(b).not.toBeNull();
    expect(b.phase).toBe('holding');
    expect(s.fleet.triremes.length).toBeGreaterThanOrEqual(2);
    expect(until(sim, () => s.fleet.triremes.some((t) => t.task === 'fight'), 2 * TICKS_PER_DAY)).toBe(true);
    let oars = 100;
    const ok = until(
      sim,
      () => {
        for (const t of s.fleet.triremes) oars = Math.min(oars, t.oars);
        return b.phase === 'over';
      },
      3 * TICKS_PER_MONTH,
    );
    expect(ok).toBe(true);
    expect(b.end).toBe('broken');
    expect(b.sunk).toBeGreaterThanOrEqual(toBreak(b));
    expect(cityOf(s.world, 'troy').memories.some((m) => m.kind === 'blockade')).toBe(true);
    expect(cityOf(s.world, 'troy').fleet).toBeLessThan(troyFleet);
    expect(cityOf(s.world, 'troy').grew.some((g) => g.kind === 'blockade')).toBe(true);
    expect(s.world.news.some((n) => /Your triremes have broken Troy’s blockade/.test(n.line))).toBe(true);
    // Struck, they lost oars; home, any badly hurt is laid up until whole.
    expect(oars).toBeLessThan(100);
    expect(until(sim, () => s.fleet.triremes.every((t) => t.state === 'moored'), 2 * TICKS_PER_MONTH)).toBe(true);
    for (const t of s.fleet.triremes) {
      if (t.mend) {
        expect(fit(t)).toBe(false);
        expect(daysToMend(s, t)).toBeGreaterThan(0);
      }
    }
    expect(until(sim, () => s.fleet.triremes.every((t) => !t.mend && t.hp >= 100 && t.oars >= 100), 2 * TICKS_PER_MONTH)).toBe(true);
    ledgerAddsUp(s);
  }, 300000);

  it('a band out against you is a war: its city may send its fleet; none comes with no harbour to close', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    s.hazards = true;
    s.fleet.triremes = [];
    // Troy's threat refused: its band gathers, and Troy is at war with you.
    const c = cityOf(s.world, 'troy');
    c.memories.push({ kind: 'staged', why: STAGED, amount: -80, tick: s.tick, fade: 10 * TICKS_PER_MONTH * 12 });
    const r = threatenTroy(sim);
    expect(warsWithYou(s).some((x) => x.city === 'troy' && x.cause === 'raid' && x.of === r.id)).toBe(true);
    // Another copy with no trading post: never.
    const bare = new Sim();
    bare.state = deserialize(serialize(s));
    send(bare, { type: 'clear', x0: tradingPost(s)!.x, z0: tradingPost(s)!.z, x1: tradingPost(s)!.x, z1: tradingPost(s)!.z });
    expect(tradingPost(bare.state)).toBeUndefined();
    bare.run(3 * TICKS_PER_MONTH);
    expect(bare.state.fleet.blockades.length).toBe(0);
    // With the harbour: within a few months, while the band is out, a fleet puts to sea (if Troy's dice say so); it ends with the band.
    const got = until(sim, () => s.fleet.blockades.length > 0 || r.ended > 0, 6 * TICKS_PER_MONTH);
    expect(got).toBe(true);
    if (s.fleet.blockades.length) {
      const b = s.fleet.blockades[0];
      expect(b.cause).toBe('raid');
      expect(b.of).toBe(r.id);
      // (Counted from when the band sets out: a band defied in your first year of trade bides its time at home first. On
      // the trunk's history (the crews of walkers) #pirates opens 12 days sooner after its first route, and that was
      // enough to carry the band's end past six months from the threat.)
      expect(until(sim, () => r.ended > 0, Math.max(0, r.start + r.dur - s.tick) + 6 * TICKS_PER_MONTH)).toBe(true);
      expect(until(sim, () => b.phase === 'over', 2 * TICKS_PER_DAY)).toBe(true);
      expect(['peace', 'broken', 'supplies', 'winter']).toContain(b.end);
    }
  }, 300000);

  it('a blockade on station round-trips through a save and plays on the same', () => {
    const sim = fresh('fortress');
    const s = sim.state;
    stageBlockade(s, sim.map, 'troy', 3, STAGED, s.tick + 6 * TICKS_PER_MONTH);
    sim.run(3 * TICKS_PER_DAY);
    const d = decodeSave(encodeSave(s, 1));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const other = new Sim();
    other.state = d.file.state;
    sim.run(20 * TICKS_PER_DAY);
    other.run(20 * TICKS_PER_DAY);
    expect(serialize(other.state)).toBe(serialize(sim.state));
  }, 300000);
});

/** Troy's king threatens; the threat is refused (as the demos stage it). */
function threatenTroy(sim: Sim): Raid {
  const s = sim.state;
  const r = threaten(s, sim.map, cityOf(s.world, 'troy'), STAGED);
  send(sim, { type: 'answer', deal: r.deal, act: 'refuse' });
  return s.world.raids.find((x) => x.city === 'troy' && x.ended === 0)!;
}

describe('warships', () => {
  const gift = (sim: Sim): void => {
    const good = [WINE, WHEAT, OIL, FLEECE, CHEESE, MEAT].find((w) => giftRefusal(sim.state, sim.map, 'athens', w, 200) === '');
    expect(good).toBeDefined();
    send(sim, { type: 'gift', city: 'athens', good: good!, amount: 200 });
  };

  it('a rival war puts warships on the lane to the other side, which seize a gift sent there and sail off when the war ends', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    s.hazards = true;
    s.fleet.pirates = [];
    s.fleet.triremes = [];
    // (Greece's own wars ended first: one at a time.)
    for (const w of s.world.wars) if (w.ended === 0) endWar(s, w);
    const x = declareWar(s, 'troy', 'athens', STAGED);
    expect(until(sim, () => s.fleet.pirates.some((p) => p.of === 'troy'), 2 * TICKS_PER_DAY)).toBe(true);
    const p = s.fleet.pirates.find((q) => q.of === 'troy')!;
    expect(p.way).toBe('athens-sea');
    expect(p.war).toBe(x.id);
    expect(s.world.news.some((n) => /Troy’s warships have taken station off Cape Skyllaion/.test(n.line))).toBe(true);
    expect(until(sim, () => p.state === 'preying', WARSHIP_WARNING + 2 * TICKS_PER_DAY)).toBe(true);
    gift(sim);
    const g = s.world.gifts.find((q) => q.from === 'home' && q.to === 'athens')!;
    expect(g.by).toBe('sea');
    expect(until(sim, () => !s.world.gifts.includes(g), 3 * TICKS_PER_MONTH)).toBe(true);
    expect(p.took.some((w) => w.startsWith('200 '))).toBe(true);
    expect(s.world.news.some((n) => /Troy’s warships off Cape Skyllaion seized your gift/.test(n.line))).toBe(true);
    endWar(s, x);
    expect(until(sim, () => p.state === 'gone', 2 * TICKS_PER_DAY)).toBe(true);
  }, 300000);

  it('a guard on the lane fights them, and they count for more than pirates', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    s.hazards = true;
    s.fleet.pirates = [];
    for (const w of s.world.wars) if (w.ended === 0) endWar(s, w);
    declareWar(s, 'troy', 'athens', STAGED);
    const t = s.fleet.triremes[0];
    expect(until(sim, () => s.fleet.pirates.some((p) => p.of === 'troy'), 2 * TICKS_PER_DAY)).toBe(true);
    send(sim, { type: 'fleet', trireme: t.id, act: 'guard', lane: 'athens-sea' });
    expect(until(sim, () => s.fleet.reports.length > 0, 3 * TICKS_PER_MONTH)).toBe(true);
    expect(s.fleet.reports[0].line).toMatch(/warship/);
  }, 300000);
});

describe('expeditions at sea', () => {
  it('an expedition by sea meets pirates on its lane and fights them: a report, and its triremes come home hurt', () => {
    const sim = fresh('fortress');
    const s = sim.state;
    // (Sparta's band, #fortress' own, sent home for the test.)
    pirateBand(s, 'troy-sea', 2, STAGED);
    const e = sendExpedition(s, sim.map, 'troy', 'raid');
    expect(e).not.toBeNull();
    expect(e!.by).toBe('sea');
    expect(until(sim, () => s.fleet.reports.some((r) => r.way === 'troy-sea'), 4 * TICKS_PER_MONTH)).toBe(true);
    const rep = s.fleet.reports.find((r) => r.way === 'troy-sea')!;
    expect(rep.line).toMatch(/met two pirate ships off Kea/);
    expect(s.army.news.some((n) => n.line === rep.line)).toBe(true);
    const ships = e!.ships.map((id) => s.fleet.triremes.find((t) => t.id === id)!).filter(Boolean);
    expect(ships.length).toBeGreaterThan(0);
    expect(ships.every((t) => t.hp < 100 && t.oars < 100 && t.hp > 0)).toBe(true);
  }, 300000);
});

describe('oars', () => {
  it('a trireme with oars broken rows slower, down to about a third with none whole; crippled, she is not fit', () => {
    const sim = fresh('pirates');
    const t = sim.state.fleet.triremes[0];
    expect(oarPace(t)).toBeCloseTo(ROW_PACE, 9);
    t.oars = 0;
    expect(oarPace(t)).toBeCloseTo(ROW_PACE * 0.35, 9);
    t.oars = CRIPPLED_OARS - 1;
    expect(fit(t)).toBe(false);
    t.oars = FIT;
    expect(fit(t)).toBe(true);
    t.mend = true;
    expect(fit(t)).toBe(false);
  });

  it('called in for repair, she is laid up until whole, mended at the yard’s rate', () => {
    const sim = fresh('pirates');
    const s = sim.state;
    const t = s.fleet.triremes[0];
    t.hp = 70;
    t.oars = 64;
    send(sim, { type: 'fleet', trireme: t.id, act: 'repair' });
    expect(t.mend).toBe(true);
    expect(daysToMend(s, t)).toBe(Math.max(Math.ceil(30 / MEND_A_DAY), Math.ceil(36 / OARS_A_DAY)));
    expect(until(sim, () => !t.mend, TICKS_PER_MONTH)).toBe(true);
    expect(t.hp).toBe(100);
    expect(t.oars).toBe(100);
    expect(s.army.news.some((n) => /is mended, hull and oars/.test(n.line))).toBe(true);
  }, 120000);
});

describe('findings carried over', () => {
  it('the band lands from the beach the Sails! line named, its ships drawn up near it, the last on the beach within about a fortnight of the first sail', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'troy' && x.ended === 0)!;
    const shore = r.shore;
    const N = sim.map.size;
    for (const e of shipsOf(s, r)) expect(Math.hypot((e.tile % N) - (shore % N), Math.floor(e.tile / N) - Math.floor(shore / N))).toBeLessThanOrEqual(10);
    expect(until(sim, () => r.landed > 0, TICKS_PER_MONTH)).toBe(true);
    expect(s.tick - r.start).toBeLessThanOrEqual(15 * TICKS_PER_DAY);
    expect(r.edge).toBe(shore);
    expect(raidersOf(s, r)).toBeDefined();
  }, 120000);

  it('a laden ship sunk as she sails off gives back her share of the loot to the stores and the treasury, and the ledger adds up', () => {
    const sim = fresh('landing');
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'troy' && x.ended === 0)!;
    expect(until(sim, () => shipsOf(s, r).some((e) => e.state === 'leaving' && e.laden), 3 * TICKS_PER_MONTH)).toBe(true);
    const took = r.took - r.regained + (r.stole - r.coinBack);
    expect(took).toBeGreaterThan(0);
    const before = { regained: r.regained, coinBack: r.coinBack };
    for (const e of shipsOf(s, r)) e.hp = 0;
    sim.step();
    expect(r.regained + r.coinBack).toBeGreaterThan(before.regained + before.coinBack);
    expect(s.army.news.some((n) => /hauled out of the shallows/.test(n.line))).toBe(true);
    ledgerAddsUp(s);
  }, 120000);

  it('every sea lane but the Tyre ship’s has a place for pirates and warships, on the lane', () => {
    const sea = WAYS.filter((w) => w.kind === 'sea' && w.to !== 'tyre');
    expect(LANES.length).toBe(sea.length);
    for (const w of sea) {
      const l = LANES.find((x) => x.way === w.id)!;
      expect(l.name.length).toBeGreaterThan(0);
      const at = stationAlong(w.id);
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(lineLength(wayPoints(wayOf(w.id))));
    }
    expect(LANES.find((l) => l.way === 'knossos-sea')!.name).toBe('off Melos');
  });
});

describe('saves', () => {
  it('a version 33 save loads through fromSlice38: no blockades, oars whole, nothing under repair', () => {
    const sim = fresh('pirates');
    const st = JSON.parse(serialize(sim.state)) as Record<string, unknown>;
    const f = st.fleet as Record<string, unknown>;
    delete f.blockades;
    for (const t of f.triremes as Array<Record<string, unknown>>) {
      delete t.oars;
      delete t.mend;
    }
    // (Slice 38 is version 34 on the trunk: its step runs from 33, then any later steps.)
    st.version = 33;
    expect(migrate(st)).toBe(33);
    expect(st.version).toBe(SIM_STATE_VERSION);
    const out = deserialize(JSON.stringify(st));
    expect(decodeSave(encodeSave(out, 1)).ok).toBe(true);
    expect(out.fleet.blockades).toEqual([]);
    expect(out.fleet.triremes.every((t) => t.oars === 100 && t.mend === false)).toBe(true);
    expect(blockadeOn(out)).toBeUndefined();
  });
});
