/**
 * Marble and timber (slice 32): the quarry and its quarrymen, the loggers'
 * camp and its loggers, and the woods that grow back after them.
 *
 * - **Marble in the rock.** Pale outcrops on the headland (coast.marble),
 *   richest at the centre and only on rock, like the copper (tileMarble). A
 *   quarry (3 x 3) goes where its footprint averages QUARRY_MARBLE_MIN.
 * - **The quarry.** Up to four quarrymen (one for each quarter of its workers)
 *   work its face, each at his own place there, and never leave the pit. Each
 *   cuts a block in CUT ticks of work on the richest rock (longer on poorer:
 *   by the marble in it), levers it onto the stack (LEVER ticks) and starts
 *   the next, while the quarry has room for it. Its carts are sledges
 *   (food.ts), to the nearest storehouse with room.
 * - **The loggers' camp.** It goes where at least CAMP_TREES_MIN standing
 *   pines or cypresses are within CAMP_REACH of its middle. Up to three
 *   loggers are out at once (one for each third of its workers), a few days
 *   apart; each walks across country (as the hunters do) to the nearest
 *   standing tree in reach no other logger is after, chops at it for CHOP
 *   ticks and it falls, trims it for TRIM ticks, and carries its logs home
 *   (LOGS_PER_TREE). The olive trees are Athena's: the loggers leave them be.
 * - **Felled trees** (`s.materials.felled`, by the tree's number in the baked
 *   list, with the tick it fell; replaced as a new list whenever it changes,
 *   as `cleared` is). A felled tree is a stump that grows back: it stands
 *   again REGROW after it fell, and only then can it be felled again. A tree
 *   cleared away (a road, a building) is no longer felled.
 *
 * Nothing here runs in a town with no quarry, no camp and no felled tree.
 */
import type { CoastMap } from '../map/bake';
import { TreeKind } from '../map/bake';
import { dhypot } from '../map/dmath';
import { around, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { held, MARBLE, setHeld, TIMBER } from './foods';
import { goHome, routeTo, startsAt } from './hunt';
import { rateOf } from './labour';
import { door } from './rounds';
import type { Building, BuildingKind, Felled, Materials, SimState, Walker } from './state';
import { note } from './stockbook';
import { storeOf } from './stores';
import { newWalker, position, setPath, WALK_SPEED } from './walk';
import { lineClear, walkable } from './wild';
import { restFor } from './water';

/** A quarry needs at least this much marble in the rock over its footprint (0..1; see tileMarble). */
export const QUARRY_MARBLE_MIN = 0.3;
/** Most quarrymen at a fully staffed quarry's face. */
export const MAX_QUARRYMEN = 4;
/** Ticks of work a quarryman takes to cut a block on the richest rock (longer on poorer, by the marble in it). */
export const CUT = 9;
/** Ticks he takes to lever a cut block onto the stack. */
export const LEVER = 3;

/** How far (straight across country, from the camp's middle) its loggers go for trees. */
export const CAMP_REACH = 12;
/** A camp needs at least this many standing pines or cypresses in its reach. */
export const CAMP_TREES_MIN = 8;
/** Most loggers a fully staffed camp has out at once. */
export const MAX_LOGGERS = 3;
/** Ticks between loggers setting out from the same camp (three days). */
export const LOGGER_GAP = 3 * TICKS_PER_DAY;
/** Ticks a logger chops at a tree before it falls (two days), and trims it after (a day). */
export const CHOP = 2 * TICKS_PER_DAY;
export const TRIM = TICKS_PER_DAY;
/** Logs one tree brings. */
export const LOGS_PER_TREE = 16;
/** Ticks a felled tree takes to stand again as a full tree (two years). */
export const REGROW = 2 * TICKS_PER_YEAR;
/** Times a logger looks for another tree (his was felled or cleared away under him) before he goes home. */
const RETRIES = 3;
/** How far from the trunk he stands to chop. */
const AT_TRUNK = 0.7;

/** The first state of the slice's one top-level field: no tree felled. */
export const freshMaterials = (): Materials => ({ felled: [] });

// ---------------------------------------------------------------------------
// Marble in the rock.

const marbles = new WeakMap<CoastMap, Float32Array>();

/** Smooth step from 0 at a to 1 at b. */
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * How rich a tile's rock is in marble (0..1): within one of the coast's
 * outcrops (coast.marble), richest at its centre and nothing at its edge, and
 * only where the ground is rock. Worked out once per map, apart from the bake.
 */
export function tileMarble(map: CoastMap, t: number): number {
  let grid = marbles.get(map);
  if (!grid) {
    const n = map.size;
    grid = new Float32Array(n * n);
    for (const o of map.data.marble) {
      for (let z = Math.max(0, Math.floor(o.z - o.r)); z <= Math.min(n - 1, Math.ceil(o.z + o.r)); z++) {
        for (let x = Math.max(0, Math.floor(o.x - o.r)); x <= Math.min(n - 1, Math.ceil(o.x + o.r)); x++) {
          const d = dhypot(x + 0.5 - o.x, z + 0.5 - o.z) / o.r;
          if (d >= 1) continue;
          const rock = smooth(0.15, 0.45, map.sample(map.rock, x + 0.5, z + 0.5));
          const v = Math.min(1, (1 - d * d) * 1.25) * rock;
          const i = z * n + x;
          grid[i] = Math.max(grid[i], Math.round(v * 100) / 100);
        }
      }
    }
    marbles.set(map, grid);
  }
  return grid[t] ?? 0;
}

/** The mean marble of a footprint's tiles (0..1). */
export function marbleOf(map: CoastMap, x: number, z: number, side: number): number {
  const n = map.size;
  let g = 0;
  for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) g += tileMarble(map, Math.min(n - 1, Math.max(0, z + dz)) * n + Math.min(n - 1, Math.max(0, x + dx)));
  return Math.round((g / (side * side)) * 100) / 100;
}

/** Where the marble outcrop nearest a point is said to be ("on the headland’s crown"). */
export function marblePlace(map: CoastMap, x: number, z: number): string {
  let best = map.data.marble[0];
  let bd = Infinity;
  for (const o of map.data.marble) {
    const d = dhypot(x - o.x, z - o.z);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best.place;
}

/** Blocks a month a quarry cuts with this many quarrymen on rock this rich. */
export const blocksPerMonth = (rich: number, men: number): number => (rich <= 0 || men <= 0 ? 0 : (men * TICKS_PER_MONTH) / (CUT / rich + LEVER));
/** What a fully staffed quarry cuts a month on the richest rock. */
export const QUARRY_MONTH = Math.round(blocksPerMonth(1, MAX_QUARRYMEN));

/** Quarrymen a quarry has at its face, for its workers. */
export const quarrymenFor = (q: Building): number => {
  const r = rateOf(q);
  return r <= 0 ? 0 : Math.max(1, Math.floor(r * MAX_QUARRYMEN + 1e-9));
};

/**
 * Which side of a quarry's footprint its face is cut into: the uphill side
 * (0 north, 1 east, 2 south, 3 west; the highest mean of the corners along
 * it), so the pit opens downhill. From the map alone.
 */
export function quarryFace(map: CoastMap, x: number, z: number): number {
  const side = 3;
  const edge = (pts: Array<[number, number]>): number => pts.reduce((a, [px, pz]) => a + map.corner(px, pz), 0) / pts.length;
  const row = (zz: number): Array<[number, number]> => [0, 1, 2, 3].map((k) => [x + k, zz]);
  const col = (xx: number): Array<[number, number]> => [0, 1, 2, 3].map((k) => [xx, z + k]);
  const hs = [edge(row(z)), edge(col(x + side)), edge(row(z + side)), edge(col(x))];
  let best = 0;
  for (let k = 1; k < 4; k++) if (hs[k] > hs[best] + 1e-6) best = k;
  return best;
}

/**
 * The turn of a quarry's model (radians, as Works turns its buildings: local
 * (lx, lz) lies at world (lx cos + lz sin, -lx sin + lz cos) from the centre)
 * that puts its face, at local -x, on the uphill side.
 */
export function quarryYaw(face: number): number {
  return face === 0 ? -Math.PI / 2 : face === 1 ? Math.PI : face === 2 ? Math.PI / 2 : 0;
}

/**
 * Where each quarryman stands in the pit (world units), by his place (0..3):
 * three along the foot of the face, a pick's reach out from it, and one by
 * the stack, squaring the blocks. In the model's frame (face at -x), turned
 * with it.
 */
export function quarrySpot(map: CoastMap, q: Pick<Building, 'x' | 'z'>, place: number): [number, number] {
  const SPOTS: Array<[number, number]> = [
    [-0.64, -0.95],
    [-0.64, -0.15],
    [-0.64, 0.8],
    [0.47, -0.42],
  ];
  const [lx, lz] = SPOTS[place % SPOTS.length];
  // cos and sin of quarryYaw, by face (whole numbers, so no trigonometry in the simulation).
  const [c, sn] = ([[0, -1], [-1, 0], [0, 1], [1, 0]] as const)[quarryFace(map, q.x, q.z)];
  return [q.x + 1.5 + lx * c + lz * sn, q.z + 1.5 - lx * sn + lz * c];
}

// ---------------------------------------------------------------------------
// The woods.

const timbers = new WeakMap<CoastMap, number[]>();

/** The trees a logger can fell, by number in the baked list: the pines and cypresses on the map (not the olives, which are Athena's). */
export function timberTrees(map: CoastMap): number[] {
  let list = timbers.get(map);
  if (!list) {
    list = [];
    const n = map.size;
    map.trees.forEach((t, i) => {
      // (Slice 46: and the oaks of a wooded land.)
      if (t.kind !== TreeKind.Pine && t.kind !== TreeKind.Cypress && t.kind !== TreeKind.Oak) return;
      if (t.x < 0 || t.z < 0 || t.x >= n || t.z >= n) return;
      list!.push(i);
    });
    timbers.set(map, list);
  }
  return list;
}

const sets = new WeakMap<object, Set<number>>();
/** The numbers in a list as a set, worked out once per list (the lists are replaced, never changed, so this holds). */
function setOf<T>(xs: readonly T[], key: (x: T) => number): Set<number> {
  let st = sets.get(xs);
  if (!st) {
    st = new Set(xs.map(key));
    sets.set(xs, st);
  }
  return st;
}
const clearedSet = (s: SimState): Set<number> => setOf(s.cleared, (i) => i);
const felledSet = (s: SimState): Set<number> => setOf(s.materials.felled, (f: Felled) => f.tree);

/** Is this tree standing: not cleared away, not felled and growing back? */
export const standing = (s: SimState, i: number): boolean => !clearedSet(s).has(i) && !felledSet(s).has(i);
/** Is this tree felled and growing back (and not cleared away since)? */
export const isFelled = (s: SimState, i: number): boolean => felledSet(s).has(i) && !clearedSet(s).has(i);

/** The pines and cypresses within a camp's reach of a point, nearest first, skipping any under the footprint (x, z, side) it stands on. */
export function treesNear(map: CoastMap, cx: number, cz: number, foot?: { x: number; z: number; side: number }): Array<{ i: number; d: number }> {
  const out: Array<{ i: number; d: number }> = [];
  for (const i of timberTrees(map)) {
    const t = map.trees[i];
    if (foot && t.x >= foot.x && t.x < foot.x + foot.side && t.z >= foot.z && t.z < foot.z + foot.side) continue;
    const d = dhypot(t.x - cx, t.z - cz);
    if (d <= CAMP_REACH) out.push({ i, d });
  }
  return out.sort((a, b) => a.d - b.d || a.i - b.i);
}

/** A camp's woods: the trees in its reach, standing and felled (growing back). */
export function campWoods(map: CoastMap, s: SimState, b: Pick<Building, 'x' | 'z'>): { standing: Array<{ i: number; d: number }>; felled: Felled[] } {
  const [cx, cz] = [b.x + 1, b.z + 1];
  const near = treesNear(map, cx, cz, { x: b.x, z: b.z, side: 2 });
  const inReach = new Set(near.map((t) => t.i));
  return {
    standing: near.filter((t) => standing(s, t.i)),
    felled: s.materials.felled.filter((f) => inReach.has(f.tree) && !clearedSet(s).has(f.tree)),
  };
}

/** Loggers a camp has out at once, for its workers. */
export const loggersFor = (c: Building): number => {
  const r = rateOf(c);
  return r <= 0 ? 0 : Math.max(1, Math.floor(r * MAX_LOGGERS + 1e-9));
};

/** A camp's loggers out now. */
export const loggersOut = (s: SimState, c: Building): Walker[] => s.walkers.filter((w) => w.kind === 'logger' && w.origin === c.id);
/** A quarry's quarrymen at its face. */
export const quarrymenAt = (s: SimState, q: Building): Walker[] => s.walkers.filter((w) => w.kind === 'quarryman' && w.origin === q.id);

/** What a logger is doing, from his walker: walking out, chopping, trimming, carrying logs home. */
export type LoggerDoing = 'out' | 'chopping' | 'trimming' | 'home';
export const loggerDoing = (w: Walker): LoggerDoing => (w.back ? 'home' : w.steps === 1 ? 'chopping' : w.steps === 2 ? 'trimming' : 'out');

/**
 * About how many trees a month a camp fells, and so the logs it brings: its
 * loggers (as staffed, or `men`) walking to and from the nearest trees in
 * reach (the mean of the nearest few) and chopping and trimming each. 0 with
 * no standing tree in reach.
 */
export function fellingPace(trees: ReadonlyArray<{ d: number }>, men: number): number {
  if (men <= 0 || trees.length === 0) return 0;
  const near = trees.slice(0, Math.min(trees.length, 6));
  const d = near.reduce((a, t) => a + t.d, 0) / near.length;
  // Across country is a little longer than the straight line.
  const trip = (2 * d * 1.15) / WALK_SPEED + CHOP + TRIM;
  return (men * TICKS_PER_MONTH) / Math.max(trip, LOGGER_GAP);
}

/** What a fully staffed camp brings a month a fair walk (six tiles) from its trees. */
export const CAMP_MONTH = Math.round(fellingPace([{ d: 6 }], MAX_LOGGERS) * LOGS_PER_TREE);

/**
 * A camp's woods in numbers, for its panel and for the tip before it is
 * placed: trees standing in reach and felled, trees felled a month at the
 * pace it works (fully staffed, or with `men`), the logs that brings, how
 * many months the standing trees last at that pace, how many felled trees
 * grow back in the coming year (a month's worth), and how long until the
 * first stands again (0: none felled).
 */
export function campOutlook(
  map: CoastMap,
  s: SimState,
  b: Pick<Building, 'x' | 'z'>,
  men: number,
): { standing: number; felled: number; treesMonth: number; logsMonth: number; lasts: number; backMonth: number; firstBack: number } {
  const wood = campWoods(map, s, b);
  const treesMonth = fellingPace(wood.standing, men);
  const backYear = wood.felled.filter((f) => f.at + REGROW - s.tick <= TICKS_PER_YEAR).length;
  const firstBack = wood.felled.reduce((a, f) => Math.min(a, Math.max(1, f.at + REGROW - s.tick)), Infinity);
  return {
    standing: wood.standing.length,
    felled: wood.felled.length,
    treesMonth,
    logsMonth: Math.round(treesMonth * LOGS_PER_TREE),
    lasts: treesMonth > 0 ? wood.standing.length / treesMonth : Infinity,
    backMonth: backYear / 12,
    firstBack: Number.isFinite(firstBack) ? firstBack : 0,
  };
}

/** About what a quarry would cut a month if placed here, fully staffed, and on how rich a rock. */
export function quarryOutlook(map: CoastMap, x: number, z: number): { rich: number; blocks: number; place: string } {
  const rich = marbleOf(map, x, z, 3);
  return { rich, blocks: Math.round(blocksPerMonth(rich, MAX_QUARRYMEN)), place: marblePlace(map, x + 1.5, z + 1.5) };
}

// ---------------------------------------------------------------------------
// Where they can go.

/** Why a quarry or a loggers' camp can't have its top-left tile here ('' if it can): the ground itself is checked before (build.ts). */
export function materialRefusal(map: CoastMap, s: SimState, kind: BuildingKind, tx: number, tz: number): string {
  if (kind === 'quarry') {
    if (marbleOf(map, tx, tz, 3) < QUARRY_MARBLE_MIN) return 'No marble in the rock here: a quarry needs the pale stone on the headland';
    return '';
  }
  if (kind === 'loggers') {
    const n = campWoods(map, s, { x: tx, z: tz }).standing.length;
    if (n < CAMP_TREES_MIN) return `Not at a wood’s edge: a loggers’ camp needs at least ${CAMP_TREES_MIN} standing pines or cypresses within ${CAMP_REACH} tiles (${n === 0 ? 'there are none' : n === 1 ? 'there is 1' : `there are ${n}`})`;
    return '';
  }
  return '';
}

// ---------------------------------------------------------------------------
// The quarry's face.

/** A quarry's face: quarrymen come to work it and go as its workers do. */
function stepQuarry(s: SimState, map: CoastMap, q: Building): void {
  const want = quarrymenFor(q);
  const men = quarrymenAt(s, q);
  if (men.length === want) return;
  if (men.length > want) {
    // The last to come goes first.
    const gone = new Set(men.sort((a, b) => b.food - a.food).slice(0, men.length - want).map((w) => w.id));
    s.walkers = s.walkers.filter((w) => !gone.has(w.id));
    return;
  }
  const places = new Set(men.map((w) => w.food));
  for (let p = 0; p < MAX_QUARRYMEN && places.size < want; p++) {
    if (places.has(p)) continue;
    places.add(p);
    const w = newWalker(s, 'quarryman', 1);
    w.origin = q.id;
    w.food = p;
    // (He starts on his block where the last man at this place would have.)
    w.meat = 0;
    const [x, z] = quarrySpot(map, q, p);
    setPath(w, [[x, z, -1]]);
    s.walkers.push(w);
  }
}

/** A quarryman's tick at the face: cutting his block, levering it onto the stack. False when he is done (the quarry gone). */
export function moveQuarryman(s: SimState, map: CoastMap, w: Walker): boolean {
  const q = findBuilding(s, w.origin);
  if (!q || q.kind !== 'quarry') return false;
  // Levering a cut block onto the stack.
  if (w.wait > 0) {
    w.wait--;
    return true;
  }
  // The stack is full: he waits for the sledges.
  if (held(q, MARBLE) >= storeOf('quarry')) return true;
  // His work on the block, in hundredths of a tick on the richest rock (whole numbers).
  w.meat += Math.round(marbleOf(map, q.x, q.z, 3) * 100);
  if (w.meat < CUT * 100) return true;
  w.meat -= CUT * 100;
  setHeld(q, MARBLE, held(q, MARBLE) + 1);
  note(s, MARBLE, 'made', 'quarry', 1);
  w.steps++;
  w.wait = LEVER;
  s.looks++;
  return true;
}

// ---------------------------------------------------------------------------
// The loggers.

/** The trees no other logger is after, standing in this camp's reach, nearest first. */
function freeTrees(map: CoastMap, s: SimState, c: Building, self?: Walker): Array<{ i: number; d: number }> {
  const taken = new Set<number>();
  for (const w of s.walkers) if (w.kind === 'logger' && w !== self && !w.back && w.food >= 0) taken.add(w.food);
  return campWoods(map, s, c).standing.filter((t) => !taken.has(t.i));
}

/** A way across country from where he stands to beside a tree's trunk; null if there is none. */
function wayToTree(map: CoastMap, s: SimState, here: [number, number], starts: number[], i: number): Array<[number, number, number]> | null {
  const n = map.size;
  const t = map.trees[i];
  const tile = Math.floor(t.z) * n + Math.floor(t.x);
  // (A tree on ground he can't stand on: to a tile beside it he can.)
  let gx = t.x;
  let gz = t.z;
  if (!walkable(map, s, tile)) {
    const side = [tile - n, tile - 1, tile + 1, tile + n].find((u) => u >= 0 && u < n * n && walkable(map, s, u));
    if (side === undefined) return null;
    gx = (side % n) + 0.5;
    gz = Math.floor(side / n) + 0.5;
  }
  const way = routeTo(s, map, here, starts, gx, gz, 0);
  if (!way) return null;
  // He stops a step short of the trunk, on the side he came from.
  const prev = way.length >= 2 ? way[way.length - 2] : [here[0], here[1]];
  const len = dhypot(prev[0] - t.x, prev[1] - t.z);
  const end: [number, number, number] = len > AT_TRUNK ? [t.x + ((prev[0] - t.x) * AT_TRUNK) / len, t.z + ((prev[1] - t.z) * AT_TRUNK) / len, -1] : [prev[0], prev[1], -1];
  if (way.length >= 2) way[way.length - 1] = end;
  else way.push(end);
  return way;
}

/** Camps send their loggers out. */
function stepCamps(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const c of s.buildings) {
    if (c.kind !== 'loggers') continue;
    // c.growth counts down to the next logger setting out.
    if (c.growth > 0) {
      c.growth--;
      continue;
    }
    const most = loggersFor(c);
    if (most === 0) continue;
    const out = loggersOut(s, c);
    if (out.length >= most) {
      c.growth = TICKS_PER_DAY;
      continue;
    }
    // Room in the store for what the loggers out (and this one) will bring.
    if (held(c, TIMBER) + (out.length + 1) * LOGS_PER_TREE > storeOf('loggers')) {
      c.growth = LOGGER_GAP;
      continue;
    }
    const sides = around(size, c).filter((t) => walkable(map, s, t));
    const trees = freeTrees(map, s, c);
    if (trees.length === 0 || sides.length === 0) {
      c.growth = LOGGER_GAP;
      continue;
    }
    // The nearest tree he can reach (trying a few), stepping out on the side nearest it.
    let sent = false;
    for (const tr of trees.slice(0, 3)) {
      const t = map.trees[tr.i];
      const side = sides.reduce((a, u) => {
        const da = dhypot((a % size) + 0.5 - t.x, Math.floor(a / size) + 0.5 - t.z);
        const du = dhypot((u % size) + 0.5 - t.x, Math.floor(u / size) + 0.5 - t.z);
        return du < da ? u : a;
      });
      const way = wayToTree(map, s, door(size, c, side), [side], tr.i);
      if (!way) continue;
      const w = newWalker(s, 'logger', 1);
      w.origin = c.id;
      w.food = tr.i;
      w.since = s.tick;
      setPath(w, way);
      s.walkers.push(w);
      sent = true;
      break;
    }
    c.growth = sent ? restFor(c, LOGGER_GAP) : LOGGER_GAP;
  }
}

/** The tree falls: it is felled (a new list, as `cleared` is). */
function fell(s: SimState, i: number): void {
  s.materials.felled = [...s.materials.felled, { tree: i, at: s.tick }];
  s.looks++;
}

/** He is home (or can't get there): his logs go into the camp's store. */
function home(s: SimState, w: Walker, c: Building): false {
  if (w.load > 0) {
    const had = held(c, TIMBER);
    setHeld(c, TIMBER, Math.min(storeOf('loggers'), had + w.load));
    note(s, TIMBER, 'made', 'loggers', held(c, TIMBER) - had);
    s.looks++;
  }
  return false;
}

/** His tree is gone (felled by another, cleared away): another, a few times, or home. */
function another(s: SimState, map: CoastMap, w: Walker, c: Building): boolean {
  w.steps = 0;
  w.wait = 0;
  if (w.cheese < RETRIES) {
    w.cheese++;
    const [x, z] = position(w);
    const starts = startsAt(map, s, x, z);
    if (starts.length) {
      for (const tr of freeTrees(map, s, c, w).slice(0, 3)) {
        const way = wayToTree(map, s, [x, z], starts, tr.i);
        if (!way) continue;
        w.food = tr.i;
        setPath(w, way);
        return true;
      }
    }
  }
  w.food = -1;
  return goHome(s, map, w, c) || home(s, w, c);
}

/** Move a logger one tick along. False when he is done (home, or gone). */
export function moveLogger(s: SimState, map: CoastMap, w: Walker): boolean {
  const c = findBuilding(s, w.origin);
  if (!c || c.kind !== 'loggers') return false;
  // At his tree: chopping (steps 1), then trimming it where it fell (steps 2).
  if (w.wait > 0) {
    if (w.steps === 1 && !standing(s, w.food)) return another(s, map, w, c);
    if (--w.wait > 0) return true;
    if (w.steps === 1) {
      fell(s, w.food);
      w.steps = 2;
      w.wait = TRIM;
      return true;
    }
    w.load = LOGS_PER_TREE;
    w.steps = 3;
    return goHome(s, map, w, c) || home(s, w, c);
  }
  let move = WALK_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      break;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
    if (w.seg < last) {
      // Something built across the way ahead: find another.
      const j = w.seg * 2;
      if (!lineClear(map, s, w.path[j], w.path[j + 1], w.path[j + 2], w.path[j + 3], walkable) && !(w.seg + 1 === last)) {
        if (w.back) {
          if (!goHome(s, map, w, c)) return home(s, w, c);
        } else return another(s, map, w, c);
      }
      continue;
    }
    // The end of the way.
    if (w.back) return home(s, w, c);
    if (!standing(s, w.food)) return another(s, map, w, c);
    // At the trunk: he chops.
    w.steps = 1;
    w.wait = CHOP;
    break;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The day.

/** The woods grow back: felled trees that have stood again for long enough, or were cleared away, leave the list. */
function regrow(s: SimState): void {
  const felled = s.materials.felled;
  const cleared = clearedSet(s);
  const keep = felled.filter((f) => s.tick - f.at < REGROW && !cleared.has(f.tree));
  if (keep.length !== felled.length) {
    s.materials.felled = keep;
    s.looks++;
  }
}

/**
 * The slice's tick, after the makers': each quarry's face (its quarrymen
 * coming and going with its workers), each camp's loggers setting out, and
 * once a day the woods growing back. Nothing in a town with no quarry, no
 * camp and no felled tree.
 */
export function stepMaterials(s: SimState, map: CoastMap): void {
  if (s.materials.felled.length && s.tick % TICKS_PER_DAY === 0) regrow(s);
  for (const b of s.buildings) if (b.kind === 'quarry') stepQuarry(s, map, b);
  stepCamps(s, map);
}
