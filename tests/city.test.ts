import { describe, expect, it } from 'vitest';
import { coastMap, WATER_NONE, WATER_RIVER, WATER_SEA } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';
import { Ground, mapIndex, PLOT_COST, plotRefusal, ROAD_COST, roadRefusal, STARTING_MONEY } from '../src/sim/build';
import { roadRoute } from '../src/sim/roads';
import { HOME_CAPACITY } from '../src/sim/settlers';
import { Sim } from '../src/sim/sim';
import { TILE_EMPTY, TILE_ROAD, type SimState } from '../src/sim/state';

const map = coastMap();
const N = MAP_SIZE;
const T = (x: number, z: number): number => z * N + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));

/** Run the sim, checking that whenever a walker reaches a waypoint inside the map, it is standing on a road. */
function watchWalkers(sim: Sim, ticks: number, onStep?: (s: SimState) => void): void {
  const at = new Map<number, string>();
  for (let i = 0; i < ticks; i++) {
    sim.step();
    for (const w of sim.state.walkers) {
      const key = `${w.route}:${w.seg}`;
      if (at.get(w.id) === key) continue;
      at.set(w.id, key);
      const t = w.tiles[w.seg];
      if (t >= 0) expect(sim.state.tiles[t]).toBe(TILE_ROAD);
    }
    onStep?.(sim.state);
  }
}

describe('where you can build', () => {
  const ix = mapIndex(map);
  it('refuses the sea and the river, and accepts open land', () => {
    let sea = -1;
    let river = -1;
    for (let t = 0; t < N * N; t++) {
      if (sea < 0 && map.tileWater[t] === WATER_SEA) sea = t;
      if (river < 0 && map.tileWater[t] === WATER_RIVER) river = t;
    }
    const s = new Sim(1).state;
    expect(roadRefusal(map, s, sea % N, Math.floor(sea / N))).toMatch(/wet/i);
    expect(roadRefusal(map, s, river % N, Math.floor(river / N))).toMatch(/wet/i);
    expect(roadRefusal(map, s, 10, 80)).toBe('');
    expect(plotRefusal(map, s, 4, 78)).toBe('');
  });

  it("refuses the river's underwater shelf, where the water mask says land", () => {
    // Tiles the mask calls land but with a corner under the river's surface.
    let shelf = 0;
    for (let tz = 0; tz < N; tz++) {
      for (let tx = 0; tx < N; tx++) {
        const t = T(tx, tz);
        if (map.tileWater[t] !== WATER_NONE) continue;
        for (const [cx, cz] of [[tx, tz], [tx + 1, tz], [tx, tz + 1], [tx + 1, tz + 1]]) {
          const q = map.riverAt(cx, cz);
          if (q.surface > 0.02 && q.d < q.width + 2 && map.heightAt(cx, cz) < q.surface) {
            shelf++;
            expect(ix.ground[t]).toBe(Ground.Water);
          }
        }
      }
    }
    expect(shelf).toBeGreaterThan(0);
  });

  it('refuses steep rock in the hills', () => {
    let steep = 0;
    for (let t = 0; t < N * N; t++) if (ix.ground[t] === Ground.Steep) steep++;
    expect(steep).toBeGreaterThan(200);
    // The crags of the north-west massif.
    expect(ix.ground[T(20, 12)]).toBe(Ground.Steep);
  });

  it('charges for roads and plots, and stops when the money runs out', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: row(0, 9, 80) });
    sim.enqueue({ type: 'plots', at: [T(4, 78)] });
    sim.step();
    expect(sim.state.money).toBe(STARTING_MONEY - 10 * ROAD_COST - PLOT_COST);
    sim.state.money = ROAD_COST * 2 + 1;
    sim.enqueue({ type: 'road', tiles: row(10, 20, 80) });
    sim.step();
    expect(sim.state.money).toBe(1);
    expect(sim.state.tiles[T(11, 80)]).toBe(TILE_ROAD);
    expect(sim.state.tiles[T(12, 80)]).toBe(TILE_EMPTY);
  });

  it('clears the trees under a road and records them; undo grows them back and refunds', () => {
    const ix2 = mapIndex(map);
    let tile = -1;
    for (const [t, list] of ix2.treesOn) {
      if (list.length && roadRefusal(map, new Sim(1).state, t % N, Math.floor(t / N)) === '') {
        tile = t;
        break;
      }
    }
    expect(tile).toBeGreaterThanOrEqual(0);
    const sim = new Sim(1);
    sim.enqueue({ type: 'road', tiles: [tile] });
    sim.step();
    const gone = ix2.treesOn.get(tile) ?? [];
    for (const i of gone) expect(sim.state.cleared).toContain(i);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.cleared).toEqual([]);
    expect(sim.state.money).toBe(STARTING_MONEY);
    expect(sim.state.tiles[tile]).toBe(TILE_EMPTY);
  });
});

describe('roads and routes', () => {
  it('a dragged road goes around a home in its way, over buildable ground only', () => {
    const sim = new Sim(1);
    sim.enqueue({ type: 'plots', at: [T(10, 79)] });
    sim.step();
    const s = sim.state;
    const route = roadRoute(map, s, T(2, 80), T(20, 80));
    expect(route).not.toBeNull();
    expect(route).not.toContain(T(10, 80));
    for (const t of route!) expect(roadRefusal(map, s, t % N, Math.floor(t / N))).toBe('');
    // Each step joins the last on a side.
    for (let i = 1; i < route!.length; i++) expect([1, N]).toContain(Math.abs(route![i - 1] - route![i]));
  });

  it('there is no road across the river where it is too wide to bridge', () => {
    expect(roadRoute(map, new Sim(1).state, T(50, 61), T(65, 60))).toBeNull();
  });

  it('a straight drag on open land is a straight road', () => {
    const route = roadRoute(map, new Sim(1).state, T(2, 80), T(20, 80));
    expect(route).toEqual(row(2, 20, 80));
  });
});

describe('settlers', () => {
  it('walk in from the edge along the road, pitch a tent and fill it', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 14, 80) });
    sim.enqueue({ type: 'plots', at: [T(10, 78)] });
    let walked = false;
    watchWalkers(sim, 1500, (s) => {
      if (s.walkers.length) walked = true;
    });
    expect(walked).toBe(true);
    const b = sim.state.buildings[0];
    expect(b.level).toBe(1);
    expect(b.people).toBe(HOME_CAPACITY[1]);
    expect(sim.state.population).toBe(HOME_CAPACITY[1]);
    expect(sim.state.walkers).toEqual([]);
  });

  it('never come to a plot that no road joins to the edge of the map', () => {
    const sim = new Sim(2);
    // A road that stops short of the edge, and a plot beside it.
    sim.enqueue({ type: 'road', tiles: row(3, 14, 80) });
    sim.enqueue({ type: 'plots', at: [T(10, 78)] });
    sim.run(1000);
    expect(sim.state.population).toBe(0);
    expect(sim.state.buildings[0].level).toBe(0);
  });

  it('re-route when the road ahead is cut, and turn back if there is no way', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: [...row(0, 30, 80)] });
    sim.enqueue({ type: 'plots', at: [T(28, 78)] });
    // Wait until a group is on the road, then cut the road in front of them.
    watchWalkers(sim, 40);
    expect(sim.state.walkers.length).toBe(1);
    sim.enqueue({ type: 'clear', x0: 20, z0: 80, x1: 20, z1: 80 });
    watchWalkers(sim, 400);
    expect(sim.state.population).toBe(0);
    expect(sim.state.walkers.length).toBe(0);
    expect(sim.state.buildings[0].incoming).toBe(0);
    // Mend it with a detour, and they come.
    sim.enqueue({ type: 'road', tiles: [T(19, 81), T(20, 81), T(21, 81)] });
    watchWalkers(sim, 800);
    expect(sim.state.population).toBeGreaterThan(0);
  });

  it('turn round at once when the tile just ahead of them is cut, instead of stepping over the gap', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 30, 80) });
    sim.enqueue({ type: 'plots', at: [T(28, 78)] });
    // Walk them a little way onto the map, half-way between two tiles.
    watchWalkers(sim, 1);
    while (!(sim.state.walkers.length && sim.state.walkers[0].tiles[sim.state.walkers[0].seg] >= 0 && sim.state.walkers[0].along > 0.3)) watchWalkers(sim, 1);
    const w = sim.state.walkers[0];
    const ahead = w.tiles[w.seg + 1];
    sim.enqueue({ type: 'clear', x0: ahead % N, z0: 80, x1: ahead % N, z1: 80 });
    watchWalkers(sim, 400, (s) => {
      for (const v of s.walkers) {
        const x = v.path[v.seg * 2];
        expect(x).toBeLessThan((ahead % N) + 0.5);
      }
    });
    expect(sim.state.population).toBe(0);
    expect(sim.state.walkers).toEqual([]);
    expect(sim.state.buildings[0].incoming).toBe(0);
  });

  it('a family cleared from a tent with no road out walks off across the fields', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 14, 80) });
    sim.enqueue({ type: 'plots', at: [T(10, 78)] });
    sim.run(1500);
    expect(sim.state.population).toBe(5);
    // Clear the tent and the road beside it, cutting it off from the edge.
    sim.enqueue({ type: 'clear', x0: 9, z0: 78, x1: 11, z1: 80 });
    sim.step();
    expect(sim.state.population).toBe(0);
    expect(sim.state.walkers.map((w) => [w.kind, w.people])).toEqual([['leaver', 5]]);
    const w = sim.state.walkers[0];
    expect(w.tiles.every((t) => t === -1)).toBe(true);
    sim.run(600);
    expect(sim.state.walkers).toEqual([]);
  });

  it('undoing a clear, then the plots it cleared, takes the plots away and refunds them once', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 14, 80) });
    sim.step();
    const before = sim.state.money;
    sim.enqueue({ type: 'plots', at: [T(4, 78), T(6, 78)] });
    sim.step();
    sim.enqueue({ type: 'clear', x0: 4, z0: 78, x1: 6, z1: 78 });
    sim.step();
    expect(sim.state.buildings).toEqual([]);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.buildings.length).toBe(2);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.buildings).toEqual([]);
    expect(sim.state.money).toBe(before);
    expect(sim.state.tiles[T(4, 78)]).toBe(TILE_EMPTY);
  });

  it('clearing a tent sends its family out and lowers the population; undo brings back an empty plot', () => {
    const sim = new Sim(2);
    sim.enqueue({ type: 'road', tiles: row(0, 14, 80) });
    sim.enqueue({ type: 'plots', at: [T(10, 78)] });
    sim.run(1500);
    expect(sim.state.population).toBe(5);
    sim.enqueue({ type: 'clear', x0: 10, z0: 78, x1: 10, z1: 78 });
    sim.step();
    expect(sim.state.population).toBe(0);
    expect(sim.state.buildings).toEqual([]);
    expect(sim.state.walkers.map((w) => w.kind)).toEqual(['leaver']);
    expect(sim.state.left).toBe(5);
    watchWalkers(sim, 300);
    expect(sim.state.walkers).toEqual([]);
    sim.enqueue({ type: 'undo' });
    sim.step();
    expect(sim.state.buildings.length).toBe(1);
    expect(sim.state.buildings[0].level).toBe(0);
  });
});
