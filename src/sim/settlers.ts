/**
 * Settlers and leavers: groups who walk the road network. Settlers come in
 * where a road meets the edge of the map, walk to a plot with room and
 * pitch a tent (or join one); leavers walk out the same way.
 */
import type { CoastMap } from '../map/bake';
import { PLOT_SIZE, plotNeighbours } from './build';
import { nextInt } from './rng';
import { edgeRoads, nearestEdge, nearestReached, roadSearch, tracePath, type Search } from './roads';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';

/** How often (ticks) the city looks for a home for a new group of settlers. */
export const SETTLER_INTERVAL = 40;
/** Most settler groups on the road at once. */
export const MAX_SETTLER_GROUPS = 8;
/** Walking speed, tiles per tick (1.2 tiles a second at normal speed). */
export const WALK_SPEED = 0.12;
/** How far beyond the map's edge walkers appear and disappear. */
export const OFF_MAP = 5;
/** People a home holds, by level (0: an empty plot, which the first family turns into a tent). */
export const HOME_CAPACITY = [5, 5];

export function capacity(b: Building): number {
  return HOME_CAPACITY[Math.min(b.level, HOME_CAPACITY.length - 1)];
}

export function findBuilding(s: SimState, id: number): Building | undefined {
  // Buildings are kept in id order.
  let lo = 0;
  let hi = s.buildings.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = s.buildings[mid];
    if (b.id === id) return b;
    if (b.id < id) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

export function recountPopulation(s: SimState): void {
  let p = 0;
  for (const b of s.buildings) p += b.people;
  s.population = p;
}

const centre = (size: number, t: number): [number, number] => {
  const tx = t % size;
  return [tx + 0.5, (t - tx) / size + 0.5];
};

/** Where a walker steps on or off the map beyond an edge road tile. */
function offMapPoint(size: number, t: number): [number, number] {
  const tx = t % size;
  const tz = (t - tx) / size;
  if (tx === 0) return [-OFF_MAP + 0.5, tz + 0.5];
  if (tx === size - 1) return [size + OFF_MAP - 0.5, tz + 0.5];
  if (tz === 0) return [tx + 0.5, -OFF_MAP + 0.5];
  return [tx + 0.5, size + OFF_MAP - 0.5];
}

const plotCentre = (b: Building): [number, number] => [b.x + PLOT_SIZE / 2, b.z + PLOT_SIZE / 2];

/** Build a walker's path from waypoints: [x, z, tile] triples. */
function setPath(w: Walker, pts: Array<[number, number, number]>): void {
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

function roadPoints(size: number, tiles: number[]): Array<[number, number, number]> {
  return tiles.map((t) => {
    const [x, z] = centre(size, t);
    return [x, z, t];
  });
}

/** Homes that could take a group, best first: empty plots, then tents with room. */
function homesWithRoom(s: SimState): Building[] {
  const empty: Building[] = [];
  const room: Building[] = [];
  for (const b of s.buildings) {
    if (b.level === 0 && b.people === 0 && b.incoming === 0) empty.push(b);
    else if (b.level > 0 && b.people + b.incoming < capacity(b)) room.push(b);
  }
  return empty.concat(room);
}

/** The first home with room that the search reaches, and the road tile beside it. */
function reachableHome(s: SimState, size: number, search: Search): { b: Building; at: number } | null {
  for (const b of homesWithRoom(s)) {
    const at = nearestReached(search, plotNeighbours(size, b.x, b.z).filter((t) => s.tiles[t] === TILE_ROAD));
    if (at >= 0) return { b, at };
  }
  return null;
}

/** Look for a home for a new group, and send them in from the edge. */
export function spawnSettlers(s: SimState, map: CoastMap): void {
  const size = map.size;
  let groups = 0;
  for (const w of s.walkers) if (w.kind === 'settler') groups++;
  if (groups >= MAX_SETTLER_GROUPS) return;
  const edges = edgeRoads(s, size);
  if (edges.length === 0) return;
  const search = roadSearch(s, size, edges);
  const found = reachableHome(s, size, search);
  if (!found) return;
  const { b, at } = found;
  const room = capacity(b) - b.people - b.incoming;
  const people = Math.min(room, 2 + nextInt(s.rng, 3));
  const road = tracePath(search, at);
  const [ox, oz] = offMapPoint(size, road[0]);
  const [px, pz] = plotCentre(b);
  const w: Walker = { id: s.nextId++, kind: 'settler', people, home: b.id, path: [], tiles: [], seg: 0, along: 0, walked: 0, route: 0 };
  setPath(w, [[ox, oz, -1], ...roadPoints(size, road), [px, pz, -1]]);
  b.incoming += people;
  s.walkers.push(w);
}

/**
 * Send people out of the city from a spot beside the given road tiles
 * (a home being cleared). Returns false if no road leads out.
 */
export function sendLeavers(s: SimState, map: CoastMap, people: number, from: [number, number], roads: number[]): boolean {
  const size = map.size;
  const starts = roads.filter((t) => s.tiles[t] === TILE_ROAD);
  if (people <= 0 || starts.length === 0) return false;
  const search = roadSearch(s, size, starts);
  const edge = nearestEdge(search, s, size);
  if (edge < 0) return false;
  const road = tracePath(search, edge);
  const [ox, oz] = offMapPoint(size, edge);
  const w: Walker = { id: s.nextId++, kind: 'leaver', people, home: 0, path: [], tiles: [], seg: 0, along: 0, walked: 0, route: 0 };
  setPath(w, [[from[0], from[1], -1], ...roadPoints(size, road), [ox, oz, -1]]);
  s.walkers.push(w);
  return true;
}

/** Find a new way for a walker standing at waypoint `w.seg`. Returns false if it should vanish. */
function reroute(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const here: [number, number] = [w.path[w.seg * 2], w.path[w.seg * 2 + 1]];
  // Off the road (beyond the edge, or at a plot): step back onto the last road tile walked.
  let cur = w.tiles[w.seg];
  for (let k = w.seg; cur < 0 && k >= 0; k--) cur = w.tiles[k];
  if (cur < 0) {
    // Still outside the map: the way in has gone, so turn back.
    if (w.home) {
      const b = findBuilding(s, w.home);
      if (b) b.incoming -= w.people;
    }
    return false;
  }
  const search = roadSearch(s, size, [cur]);
  const start: Array<[number, number, number]> = [[here[0], here[1], -1]];
  if (w.kind === 'settler') {
    let b = findBuilding(s, w.home);
    let at = -1;
    if (b) {
      at = nearestReached(search, plotNeighbours(size, b.x, b.z).filter((t) => s.tiles[t] === TILE_ROAD));
      if (at < 0) {
        b.incoming -= w.people;
        b = undefined;
      }
    }
    if (!b) {
      const found = reachableHome(s, size, search);
      if (found && capacity(found.b) - found.b.people - found.b.incoming >= w.people) {
        b = found.b;
        at = found.at;
        b.incoming += w.people;
        w.home = b.id;
      }
    }
    if (b && at >= 0) {
      const [px, pz] = plotCentre(b);
      setPath(w, [...start, ...roadPoints(size, tracePath(search, at)), [px, pz, -1]]);
      return true;
    }
    // Nowhere to live: walk back out.
    w.kind = 'leaver';
    w.home = 0;
  }
  const edge = nearestEdge(search, s, size);
  if (edge < 0) return false;
  const [ox, oz] = offMapPoint(size, edge);
  setPath(w, [...start, ...roadPoints(size, tracePath(search, edge)), [ox, oz, -1]]);
  return true;
}

/** Is the way ahead still open (the next tile still a road, the home still there)? */
function aheadOk(s: SimState, w: Walker): boolean {
  const next = w.tiles[w.seg + 1];
  if (next >= 0 && s.tiles[next] !== TILE_ROAD) return false;
  if (w.kind === 'settler' && !findBuilding(s, w.home)) return false;
  return true;
}

/** Settlers reach their home. */
function arrive(s: SimState, w: Walker): void {
  const b = findBuilding(s, w.home);
  if (!b) return;
  b.incoming -= w.people;
  b.people += w.people;
  if (b.level === 0) {
    b.level = 1;
    b.since = s.tick;
  }
  s.arrived += w.people;
  recountPopulation(s);
  s.rev++;
}

/** Move every walker one tick along. */
export function stepWalkers(s: SimState, map: CoastMap): void {
  if (s.walkers.length === 0) return;
  const keep: Walker[] = [];
  for (const w of s.walkers) {
    if (moveWalker(s, map, w)) keep.push(w);
  }
  s.walkers = keep;
}

function moveWalker(s: SimState, map: CoastMap, w: Walker): boolean {
  let move = WALK_SPEED;
  // A few hops at most per tick; the loop guards against zero-length segments.
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      move = 0;
      break;
    }
    const step = len - w.along;
    move -= step;
    w.walked += step;
    w.seg++;
    w.along = 0;
    if (w.seg >= last) {
      // The end of the path.
      if (w.kind === 'settler') {
        if (findBuilding(s, w.home)) {
          arrive(s, w);
          return false;
        }
        if (!reroute(s, map, w)) return false;
        continue;
      }
      // Leavers walk off the map (they were counted as gone when they left home).
      return false;
    }
    if (!aheadOk(s, w) && !reroute(s, map, w)) return false;
  }
  return true;
}

/** What a home is waiting for, or who lives there, in a few plain words. */
export function homeStatus(s: SimState, map: CoastMap, b: Building): string {
  const size = map.size;
  const beside = plotNeighbours(size, b.x, b.z).filter((t) => s.tiles[t] === TILE_ROAD);
  let reach = '';
  if (beside.length === 0) reach = 'Needs a road beside it';
  else {
    const edges = edgeRoads(s, size);
    const search = roadSearch(s, size, edges);
    if (nearestReached(search, beside) < 0) reach = 'Needs its road joined to the edge of the map, where settlers come in';
  }
  const who = b.people === 1 ? '1 person' : `${b.people} people`;
  if (b.level === 0) {
    if (b.incoming > 0) return 'A housing plot · settlers are on their way';
    return reach ? `A housing plot · ${reach.toLowerCase()}` : 'A housing plot · waiting for settlers';
  }
  const full = b.people >= capacity(b);
  const more = b.incoming > 0 ? ' · more on the way' : full ? ' · full' : reach ? '' : ' · room for more';
  return `A tent · ${who}${more}`;
}
