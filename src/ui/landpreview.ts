/**
 * The new-game screen's picture of a land (slice 46): the land drawn from
 * above, a pixel a tile, in its own colours (render/landlook.ts), with hill
 * shading, the sea's depths, the river and its channels, farmland in rows,
 * grassland, rock, marsh, woods and groves; and what the screen marks on it:
 * the copper, the marble, the woods, the quay sites, the roads in and the
 * road that will be laid. Reads the baked map only.
 */
import { WATER_RIVER, WATER_SEA, TreeKind, type CoastMap } from '../map/bake';
import { roadsIn, type RoadsIn } from '../map/landcheck';
import { landColours, marshColour } from '../render/landlook';
import { FARM_FERTILE_MIN, tileCopper, tileGrass } from '../sim/build';
import { tileMarble } from '../sim/materials';
import type { SimState } from '../sim/state';
import { quayTiles } from '../sim/trade';

type RGB = [number, number, number];
const rgb = (h: string): RGB => {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** What the picture marks, in tiles. */
export interface LandMarks {
  copper: Array<{ x: number; z: number }>;
  marble: Array<{ x: number; z: number }>;
  woods: Array<{ x: number; z: number }>;
  /** On a dry land, the springs (water under the ground round them, for fountains). */
  springs: Array<{ x: number; z: number }>;
  /** Where a trading post can stand, a few spread along the shore (the nearest the site first). */
  quays: Array<{ x: number; z: number }>;
  site: { x: number; z: number } | null;
  roads: RoadsIn;
  /** Counts for the words beside the picture. */
  farmland: number;
  grass: number;
  timber: number;
}

/** The land as RGBA pixels, one a tile (row by row from the north-west). */
export function paintLand(map: CoastMap, kind: string): Uint8ClampedArray {
  const n = map.size;
  const c = landColours(kind);
  const C = {
    deep: rgb(c.deep),
    mid: rgb(c.mid),
    shallow: rgb(c.shallow),
    river: rgb(c.river),
    sand: rgb(c.sand),
    lush: rgb(c.lush),
    lushDeep: rgb(c.lushDeep),
    meadow: rgb(c.meadow),
    dry: rgb(c.dryGrass),
    rock: rgb(c.rockWarm),
    rockGrey: rgb(c.rockGrey),
    marsh: rgb(marshColour(c)),
    pine: rgb(c.pineDark),
    olive: rgb(c.oliveLeafDark),
    copper: [46, 150, 120] as RGB,
    marble: [246, 242, 232] as RGB,
  };
  const out = new Uint8ClampedArray(n * n * 4);
  const h = (x: number, z: number): number => map.corner(Math.max(0, Math.min(n, x)), Math.max(0, Math.min(n, z)));
  for (let tz = 0; tz < n; tz++) {
    for (let tx = 0; tx < n; tx++) {
      const t = tz * n + tx;
      let col: RGB;
      const lo = Math.min(h(tx, tz), h(tx + 1, tz), h(tx, tz + 1), h(tx + 1, tz + 1));
      if (map.tileWater[t] === WATER_SEA) {
        const d = -lo;
        col = d < 1 ? mix(C.shallow, C.mid, clamp01(d)) : mix(C.mid, C.deep, clamp01((d - 1) / 3));
      } else if (map.tileWater[t] === WATER_RIVER) {
        col = C.river;
      } else {
        const fert = map.tileFertility[t];
        const grass = clamp01(tileGrass(map, t));
        if (fert >= FARM_FERTILE_MIN) col = (tz & 1) === 0 ? C.lush : mix(C.lush, C.lushDeep, 0.7);
        else col = mix(C.dry, C.meadow, grass);
        const rock = map.sample(map.rock, tx + 0.5, tz + 0.5);
        if (rock > 0.05) col = mix(col, (tx + tz) % 3 === 0 ? C.rockGrey : C.rock, clamp01(rock * 1.3));
        if (map.marsh) {
          const m = map.sample(map.marsh, tx + 0.5, tz + 0.5);
          if (m > 0.05) col = mix(col, C.marsh, clamp01(m * 1.2));
        }
        if (map.sample(map.shore, tx + 0.5, tz + 0.5) < 1.8 && lo < 1) col = C.sand;
        const cu = tileCopper(map, t);
        const mb = tileMarble(map, t);
        if (mb > 0.25 && mb >= cu) col = mix(col, C.marble, clamp01(mb * 1.4));
        else if (cu > 0.25 && (tx + 2 * tz) % 3 !== 0) col = mix(col, C.copper, clamp01(cu * 1.2));
        // Light from the north-west, as on the original's maps.
        const sl = h(tx, tz) - h(tx + 1, tz + 1);
        const k = 1 + Math.max(-0.35, Math.min(0.3, sl * 0.45));
        col = [col[0] * k, col[1] * k, col[2] * k];
      }
      const i = t * 4;
      out[i] = col[0];
      out[i + 1] = col[1];
      out[i + 2] = col[2];
      out[i + 3] = 255;
    }
  }
  // The trees: woods and pines dark, olives grey-green.
  for (const tr of map.trees) {
    if (tr.x < 0 || tr.z < 0 || tr.x >= n || tr.z >= n) continue;
    const timber = tr.kind === TreeKind.Pine || tr.kind === TreeKind.Cypress || tr.kind === TreeKind.Oak;
    if (!timber && tr.kind !== TreeKind.Olive) continue;
    const i = (Math.floor(tr.z) * n + Math.floor(tr.x)) * 4;
    const col = timber ? C.pine : C.olive;
    out[i] = col[0];
    out[i + 1] = col[1];
    out[i + 2] = col[2];
  }
  return out;
}

/** What to mark on the picture (`s`: a town with nothing built, founded on the land). */
export function landMarks(map: CoastMap, s: SimState): LandMarks {
  const n = map.size;
  const inside = (p: { x: number; z: number }): boolean => p.x >= 0 && p.z >= 0 && p.x < n && p.z < n;
  const site = map.data.site ?? null;
  // The quay sites: the shore where a trading post can stand, a few spread out, the nearest the site first.
  const q = quayTiles(map);
  const spots: Array<{ x: number; z: number; d: number }> = [];
  for (let t = 0; t < n * n; t++) {
    if (!q[t]) continue;
    const x = (t % n) + 0.5;
    const z = Math.floor(t / n) + 0.5;
    spots.push({ x, z, d: site ? Math.hypot(x - site.x, z - site.z) : 0 });
  }
  spots.sort((a, b) => a.d - b.d);
  const quays: Array<{ x: number; z: number }> = [];
  for (const sp of spots) {
    if (quays.length >= 4) break;
    if (quays.every((o) => Math.hypot(o.x - sp.x, o.z - sp.z) > n * 0.18)) quays.push({ x: sp.x, z: sp.z });
  }
  let farmland = 0;
  let grass = 0;
  for (let t = 0; t < n * n; t++) {
    if (map.tileWater[t]) continue;
    if (map.tileFertility[t] >= FARM_FERTILE_MIN) farmland++;
    else if (tileGrass(map, t) >= 0.35) grass++;
  }
  const timber = map.trees.filter((tr) => (tr.kind === TreeKind.Pine || tr.kind === TreeKind.Cypress || tr.kind === TreeKind.Oak) && inside(tr)).length;
  return {
    copper: map.data.copper.filter(inside).map(({ x, z }) => ({ x, z })),
    marble: map.data.marble.filter(inside).map(({ x, z }) => ({ x, z })),
    woods: (map.data.woods ?? []).filter(inside).map(({ x, z }) => ({ x, z })),
    springs: (map.data.springs ?? []).filter(inside).map(({ x, z }) => ({ x, z })),
    quays,
    site,
    roads: roadsIn(map, s),
    farmland,
    grass,
    timber,
  };
}
