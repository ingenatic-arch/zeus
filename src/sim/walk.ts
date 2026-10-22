/**
 * What every walker shares: paths of waypoints, where a walker stands
 * between them, how fast each kind walks, and the junction rule service
 * walkers use to choose their way.
 */
import { dhypot } from '../map/dmath';
import { centreOf, findBuilding } from './buildings';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';

/** Walking speed of settlers and leavers, tiles per tick (1.2 tiles a second at normal speed). */
export const WALK_SPEED = 0.12;
/** The water carrier, the food vendor, the priestess and the actor walk at the settlers' pace. */
export const CARRIER_SPEED = 0.12;
/** An ox cart is a little slower. */
export const CART_SPEED = 0.09;
/** An ox dragging a sledge of marble blocks (slice 32) is slower still: two thirds of a cart's pace. */
export const SLEDGE_SPEED = CART_SPEED * (2 / 3);
/** A maker's cart: an ox cart, or a quarry's sledge (slice 32), which is a cart in every rule but its pace and its look. */
export const isCart = (w: Walker): boolean => w.kind === 'cart' || w.kind === 'sledge';
/** How far beyond the map's edge walkers appear and disappear. */
export const OFF_MAP = 5;

/** The watchman and the inspector walk half as fast again as the others (see hazards.ts). */
export const PATROL_SPEED = CARRIER_SPEED * 1.5;

/** The tax collector walks at the same pace (see taxes.ts, which says why). */
export const COLLECTOR_SPEED = PATROL_SPEED;

/** The trading post's dockers walk at the collector's pace with their handcarts (the stores can be far from the shore: see trade.ts). */
export const DOCKER_SPEED = COLLECTOR_SPEED;

/** A docker or yard porter fetching a gift or a sending from the stores hurries: half as fast again (trade.ts). */
export const SENDING_FETCH_SPEED = DOCKER_SPEED * 1.5;

/** A watchman running to a fire (see hazards.ts, DASH_SPEED). */
export const RUN_SPEED = PATROL_SPEED * 1.6;

/** A caravan's drover and donkeys walk at a man's pace, faster than an ox cart (see routes.ts). */
export const CARAVAN_SPEED = WALK_SPEED;
/** Your own little caravan taking a gift or what a ruler asked for out of the city knows the streets and travels light: twice a trader's pace (diplomacy.ts). */
export const SENDING_SPEED = CARAVAN_SPEED * 2;

export function speedOf(w: Walker): number {
  if (w.kind === 'cart') return CART_SPEED;
  if (w.kind === 'sledge') return SLEDGE_SPEED;
  // (Your own caravan or porter about a gift or a sending: the gift's number is in `cheese`, see giftOf.)
  // (Slice 34: a vassal's tribute, `cheese` below 0, walks at a sending's pace too.)
  if (w.kind === 'caravan') return w.cheese !== 0 ? SENDING_SPEED : CARAVAN_SPEED;
  if (w.kind === 'watchman' && w.target > 0) return RUN_SPEED;
  if (w.kind === 'docker') return w.cheese > 0 ? SENDING_FETCH_SPEED : COLLECTOR_SPEED;
  if (w.kind === 'tax') return COLLECTOR_SPEED;
  if (w.kind === 'watchman' || w.kind === 'inspector') return PATROL_SPEED;
  return isRoundsWalker(w.kind) ? CARRIER_SPEED : WALK_SPEED;
}

/** A hunter walks at the settlers' pace, across country. */
export const HUNTER_SPEED = WALK_SPEED;

/** Walkers who walk a round: the water carrier, the food vendor, the priestess, the actor, the tax collector, the watchman and the inspector. */
export const isRoundsWalker = (k: Walker['kind']): boolean => k === 'water' || k === 'food' || k === 'priestess' || k === 'actor' || k === 'tax' || k === 'watchman' || k === 'inspector';

/** The centre of a tile, world units. */
export const centre = (size: number, t: number): [number, number] => {
  const tx = t % size;
  return [tx + 0.5, (t - tx) / size + 0.5];
};

/** The middle of a building's footprint. */
export const plotCentre = (b: Building): [number, number] => centreOf(b);

/**
 * The gift (its number in world.gifts, diplomacy.ts) a walker is about: a
 * docker or yard porter fetching one from the stores, or the little caravan
 * taking one out of the city; 0 for none. It is kept in the walker's spare
 * `cheese` field, which no docker or caravan uses otherwise (only the food
 * porters and vendors carry cheese in it), so it never changes the shape of
 * a save; read and set it only through these two.
 */
export const giftOf = (w: Walker): number => (w.kind === 'docker' || w.kind === 'caravan' ? w.cheese : 0);
export function setGiftOf(w: Walker, id: number): void {
  if (w.kind === 'docker' || w.kind === 'caravan') w.cheese = id;
}

/** A new walker with every field set. */
export function newWalker(s: SimState, kind: Walker['kind'], people: number): Walker {
  return {
    id: s.nextId++,
    kind,
    people,
    home: 0,
    path: [],
    tiles: [],
    seg: 0,
    along: 0,
    walked: 0,
    route: 0,
    origin: 0,
    back: false,
    steps: 0,
    since: 0,
    target: 0,
    load: 0,
    food: 0,
    meat: 0,
    cheese: 0,
    wait: 0,
    trail: [],
    purse: [],
  };
}

/** Where a walker steps on or off the map beyond an edge road tile. */
export function offMapPoint(size: number, t: number): [number, number] {
  const tx = t % size;
  const tz = (t - tx) / size;
  if (tx === 0) return [-OFF_MAP + 0.5, tz + 0.5];
  if (tx === size - 1) return [size + OFF_MAP - 0.5, tz + 0.5];
  if (tz === 0) return [tx + 0.5, -OFF_MAP + 0.5];
  return [tx + 0.5, size + OFF_MAP - 0.5];
}

/** Give a walker a new path from waypoints: [x, z, tile] triples (tile -1 where off the road). */
export function setPath(w: Walker, pts: Array<[number, number, number]>): void {
  w.path = [];
  w.tiles = [];
  for (const [x, z, t] of pts) {
    w.path.push(x, z);
    w.tiles.push(t);
  }
  w.seg = 0;
  w.along = 0;
  w.route++;
}

/** Waypoints at the centres of road tiles. */
export function roadPoints(s: SimState, size: number, tiles: number[]): Array<[number, number, number]> {
  return tiles.map((t) => {
    const [x, z] = centre(size, t);
    // A tile that is no longer a road (just cleared under a walker) is walked as open ground.
    return [x, z, s.tiles[t] === TILE_ROAD ? t : -1];
  });
}

/** Where a walker is now, between its waypoints. */
export function position(w: Walker): [number, number] {
  const i = w.seg * 2;
  if (i + 3 >= w.path.length) return [w.path[w.path.length - 2], w.path[w.path.length - 1]];
  const x0 = w.path[i];
  const z0 = w.path[i + 1];
  const len = dhypot(w.path[i + 2] - x0, w.path[i + 3] - z0) || 1;
  const f = Math.min(1, w.along / len);
  return [x0 + (w.path[i + 2] - x0) * f, z0 + (w.path[i + 3] - z0) * f];
}

/** Road tiles joined to a tile, in a fixed order (north, west, east, south). */
export function roadNeighbours(s: SimState, size: number, t: number): number[] {
  const tx = t % size;
  const out: number[] = [];
  if (t >= size && s.tiles[t - size] === TILE_ROAD) out.push(t - size);
  if (tx > 0 && s.tiles[t - 1] === TILE_ROAD) out.push(t - 1);
  if (tx < size - 1 && s.tiles[t + 1] === TILE_ROAD) out.push(t + 1);
  if (t < size * (size - 1) && s.tiles[t + size] === TILE_ROAD) out.push(t + size);
  return out;
}

/** The buildings beside a road tile (orthogonally), each once. */
export function besideRoad(s: SimState, size: number, t: number, out: Building[]): Building[] {
  out.length = 0;
  const tx = t % size;
  for (const u of [t - size, t - 1, t + 1, t + size]) {
    if (u < 0 || u >= size * size) continue;
    if ((u === t - 1 && tx === 0) || (u === t + 1 && tx === size - 1)) continue;
    const id = s.tiles[u];
    if (id <= 0) continue;
    const b = findBuilding(s, id);
    if (b && !out.includes(b)) out.push(b);
  }
  return out;
}

/**
 * How badly a home needs a service walker (lower is more urgent), or Infinity
 * if it doesn't want her at all: for a home whose level needs the service, the
 * tick it would go down a level for want of it; for one that only wants it to
 * grow, when its supply runs out, on the same scale (see serviceScore).
 */
export type NeedScore = (b: Building, s: SimState) => number;

/**
 * When a home would go down a level for want of a service (Infinity if its
 * level doesn't need it). A walker who would get there later than this can't
 * save it this round.
 */
export type NeedDue = (b: Building, s: SimState) => number;

/** Added to a home's score when she would get there too late to save it: she goes where she can still save someone first. */
export const TOO_LATE = 1e7;

/** Scratch space for wayNeeds (not state: cleared by a fresh stamp on every search). */
let stamp = new Int32Array(0);
let owner = new Int32Array(0);
let depth = new Int32Array(0);
let queue = new Int32Array(0);
let gen = 0;
const near: Building[] = [];

/**
 * How badly the homes down each way from road tile `cur` need a service
 * walker: one breadth-first search over the roads within her reach (`dist`,
 * road steps from her building, at most `range`), out from all of `ways` at
 * once and never back through `cur`, so each road tile belongs to the way that
 * gets there first. A way's need is the lowest, over the homes beside its road
 * tiles, of their score (see NeedScore) plus how long she would take to get
 * there at `ticksATile`, with TOO_LATE added for a home she would reach after
 * it has gone down (`due`); Infinity if no home that wants her lies that way.
 * With `firstOnly`, stops at the first such home.
 */
export function wayNeeds(
  s: SimState,
  size: number,
  dist: Int32Array,
  range: number,
  score: NeedScore,
  ticksATile: number,
  cur: number,
  ways: number[],
  firstOnly = false,
  due?: NeedDue,
): number[] {
  const total = size * size;
  if (stamp.length !== total) {
    stamp = new Int32Array(total);
    owner = new Int32Array(total);
    depth = new Int32Array(total);
    queue = new Int32Array(total);
    gen = 0;
  }
  gen++;
  const needs = ways.map(() => Infinity);
  let head = 0;
  let tail = 0;
  stamp[cur] = gen;
  ways.forEach((t, i) => {
    if (stamp[t] === gen) return;
    stamp[t] = gen;
    owner[t] = i;
    depth[t] = 1;
    queue[tail++] = t;
  });
  while (head < tail) {
    const t = queue[head++];
    const i = owner[t];
    let low = Infinity;
    const arrive = s.tick + depth[t] * ticksATile;
    for (const b of besideRoad(s, size, t, near)) {
      let v = score(b, s);
      if (v < Infinity && due && due(b, s) < arrive) v += TOO_LATE;
      if (v < low) low = v;
    }
    if (low < Infinity) {
      const v = low + depth[t] * ticksATile;
      if (v < needs[i]) needs[i] = v;
      if (firstOnly) return needs;
    }
    for (const u of roadNeighbours(s, size, t)) {
      if (stamp[u] === gen || dist[u] < 0 || dist[u] > range) continue;
      stamp[u] = gen;
      owner[u] = i;
      depth[u] = depth[t] + 1;
      queue[tail++] = u;
    }
  }
  return needs;
}
