import { describe, expect, it } from 'vitest';
import { bakeCoast, WATER_RIVER, WATER_SEA, type CoastMap } from '../src/map/bake';
import { MAP_SIZE } from '../src/map/coast';

function digest(map: CoastMap): string {
  // A cheap, order-sensitive checksum of every baked array.
  let h = 2166136261;
  const mix = (v: number): void => {
    h ^= Math.round(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  };
  for (const arr of [map.heights, map.fertility, map.rock, map.shore, map.tileFertility]) for (const v of arr) mix(v);
  for (const v of map.tileWater) mix(v);
  for (const t of map.trees) {
    mix(t.kind);
    mix(t.x);
    mix(t.z);
    mix(t.scale);
  }
  return (h >>> 0).toString(16);
}

const map = bakeCoast();

describe('the coast bake', () => {
  it('gives the same coast every time', () => {
    expect(digest(bakeCoast())).toBe(digest(map));
  });

  it('has a bay of open sea and plenty of dry land', () => {
    let sea = 0;
    let land = 0;
    for (const w of map.tileWater) {
      if (w === WATER_SEA) sea++;
      else if (w === 0) land++;
    }
    expect(sea).toBeGreaterThan(MAP_SIZE * MAP_SIZE * 0.1);
    expect(land).toBeGreaterThan(MAP_SIZE * MAP_SIZE * 0.5);
    // The middle of the bay is sea; the hills in the north-west are land.
    expect(map.tileWater[map.tileIndex(66, 90)]).toBe(WATER_SEA);
    expect(map.tileWater[map.tileIndex(15, 15)]).toBe(0);
  });

  it('has a river that never flows uphill and reaches the sea', () => {
    const s = map.river.surface;
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
    expect(s[0]).toBeGreaterThan(4); // rises up in the hills
    expect(s[s.length - 1]).toBe(0); // ends at sea level
  });

  it('marks a connected run of river tiles from the hills to the bay', () => {
    const start: number[] = [];
    for (let i = 0; i < map.tileWater.length; i++) if (map.tileWater[i] === WATER_RIVER) start.push(i);
    expect(start.length).toBeGreaterThan(80);
    // Flood fill through river tiles (4-neighbour) from the highest one.
    const first = start[0];
    const seen = new Set([first]);
    const queue = [first];
    while (queue.length) {
      const i = queue.pop() as number;
      const x = i % MAP_SIZE;
      const z = Math.floor(i / MAP_SIZE);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= MAP_SIZE || nz >= MAP_SIZE) continue;
        const j = nz * MAP_SIZE + nx;
        if (!seen.has(j) && map.tileWater[j] === WATER_RIVER) {
          seen.add(j);
          queue.push(j);
        }
      }
    }
    expect(seen.size).toBe(start.length);
    // And the river touches the sea.
    let touchesSea = false;
    for (const i of seen) {
      const x = i % MAP_SIZE;
      const z = Math.floor(i / MAP_SIZE);
      if (z + 1 < MAP_SIZE && map.tileWater[(z + 1) * MAP_SIZE + x] === WATER_SEA) touchesSea = true;
    }
    expect(touchesSea).toBe(true);
  });

  it('keeps the river banks fertile', () => {
    const q = map.river;
    const mid = Math.floor(q.xs.length * 0.6);
    const x = Math.round(q.xs[mid] + q.width[mid] + 3);
    const z = Math.round(q.zs[mid]);
    expect(map.sample(map.fertility, x, z)).toBeGreaterThan(0.6);
  });

  it('never floats a tree over water', () => {
    for (const t of map.trees) {
      if (t.kind === 6 /* reeds stand in the shallows */) continue;
      const r = map.riverAt(t.x, t.z);
      expect(r.d > r.width || r.surface < 0.03).toBe(true);
    }
  });
});
