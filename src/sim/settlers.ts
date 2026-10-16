import type { CoastMap } from '../map/bake';
import { around, capacity, findBuilding, HOME_CAPACITY, recountPopulation } from './buildings';
import { nextInt } from './rng';
import { edgeRoads, nearestEdge, nearestReached, overland, roadSearch, tracePath, type Search } from './roads';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { newWalker, offMapPoint, plotCentre, position, roadPoints, setPath, WALK_SPEED } from './walk';

export { capacity, findBuilding, HOME_CAPACITY, recountPopulation, WALK_SPEED };

/** The longest wait (ticks) between looks for a home for new settlers: room for one small family, no water. */
export const SETTLER_INTERVAL = 40;
/** The shortest wait, however much room there is. */
export const SETTLER_INTERVAL_MIN = 12;
/** Most settler groups on the road at once, however much room there is. */
export const MAX_SETTLER_GROUPS = 30;

/**
 * How long to wait before the next group of settlers, given the free room in
 * homes the road reaches and the share of lived-in homes with water: more room
 * and more water bring people sooner.
 */
export function arrivalInterval(room: number, water: number): number {
  const t = Math.round(SETTLER_INTERVAL / (1 + room / 30 + 1.2 * water));
  return Math.max(SETTLER_INTERVAL_MIN, Math.min(SETTLER_INTERVAL, t));
}

/** How many groups may be on the road at once, given the free room they could fill. */
export function maxGroups(room: number): number {
  return Math.min(MAX_SETTLER_GROUPS, 4 + Math.floor(room / 8));
}

/** The share of lived-in homes that have water now (0 if nobody lives anywhere). */
export function waterShare(s: SimState): number {
  let lived = 0;
  let wet = 0;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0) continue;
    lived++;
    if (b.waterUntil > s.tick) wet++;
  }
  return lived ? wet / lived : 0;
}

/** Homes that could take a group, best first: empty plots, then tents with room. */
function homesWithRoom(s: SimState): Building[] {
  const empty: Building[] = [];
  const room: Building[] = [];
  for (const b of s.buildings) {
    if (b.kind !== 'home') continue;
    if (b.level === 0 && b.people === 0 && b.incoming === 0) empty.push(b);
    else if (b.level > 0 && b.people + b.incoming < capacity(b)) room.push(b);
  }
  return empty.concat(room);
}

const roomIn = (b: Building): number => capacity(b) - b.people - b.incoming;

/**
 * The first home the search reaches with room for `need` people, and the road
 * tile beside it; failing that, the reachable home with the most room.
 */
function reachableHome(s: SimState, size: number, search: Search, need = 1): { b: Building; at: number } | null {
  let best: { b: Building; at: number } | null = null;
  for (const b of homesWithRoom(s)) {
    const at = nearestReached(search, around(size, b).filter((t) => s.tiles[t] === TILE_ROAD));
    if (at < 0) continue;
    if (roomIn(b) >= need) return { b, at };
    if (!best || roomIn(b) > roomIn(best.b)) best = { b, at };
  }
  return best;
}

/** Free room in homes the search reaches. */
function reachableRoom(s: SimState, size: number, search: Search): number {
  let room = 0;
  for (const b of homesWithRoom(s)) {
    if (nearestReached(search, around(size, b).filter((t) => s.tiles[t] === TILE_ROAD)) >= 0) room += roomIn(b);
  }
  return room;
}

/**
 * Look for a home for a new group, and send them in from the edge. Sets how
 * long until the next look, from the room there is and how much of the city has water.
 */
export function spawnSettlers(s: SimState, map: CoastMap): void {
  const size = map.size;
  s.settlerClock = SETTLER_INTERVAL;
  const edges = edgeRoads(s, size);
  if (edges.length === 0) return;
  const search = roadSearch(s, size, edges);
  const room = reachableRoom(s, size, search);
  if (room === 0) return;
  s.settlerClock = arrivalInterval(room, waterShare(s));
  let groups = 0;
  for (const w of s.walkers) if (w.kind === 'settler') groups++;
  if (groups >= maxGroups(room)) return;
  const found = reachableHome(s, size, search);
  if (!found) return;
  const { b, at } = found;
  const people = Math.min(roomIn(b), 2 + nextInt(s.rng, 3));
  const road = tracePath(search, at);
  const [ox, oz] = offMapPoint(size, road[0]);
  const [px, pz] = plotCentre(b);
  const w = newWalker(s, 'settler', people);
  w.home = b.id;
  setPath(w, [[ox, oz, -1], ...roadPoints(s, size, road), [px, pz, -1]]);
  b.incoming += people;
  s.walkers.push(w);
}

/** How settling is going, for the population's tooltip. */
export interface Outlook {
  /** Is there a road in from the map's edge at all? */
  road: boolean;
  /** Free room in homes that road reaches. */
  room: number;
  /** Share of lived-in homes with water. */
  water: number;
  /** Ticks between groups of newcomers. */
  interval: number;
}

export function arrivalOutlook(s: SimState, map: CoastMap): Outlook {
  const size = map.size;
  const edges = edgeRoads(s, size);
  const water = waterShare(s);
  if (edges.length === 0) return { road: false, room: 0, water, interval: SETTLER_INTERVAL };
  const room = reachableRoom(s, size, roadSearch(s, size, edges));
  return { road: true, room, water, interval: arrivalInterval(room, water) };
}

/**
 * Send people out of the city from a spot beside the given road tiles
 * (a home being cleared): along the road to the edge if one leads there,
 * otherwise on foot across the fields. Returns false if there is no way out at all.
 */
export function sendLeavers(s: SimState, map: CoastMap, people: number, from: [number, number], roads: number[]): boolean {
  if (people <= 0) return false;
  const w = newWalker(s, 'leaver', people);
  const starts = roads.filter((t) => s.tiles[t] === TILE_ROAD);
  if (!walkOut(s, map, w, from, starts)) {
    s.nextId--;
    return false;
  }
  s.walkers.push(w);
  return true;
}

/**
 * Point a walker out of the city from where it stands: along the road from
 * the given road tiles (or the tile it stands on) to the nearest edge, or, if
 * no road leads out, straight across the fields to the nearest edge.
 */
function walkOut(s: SimState, map: CoastMap, w: Walker, here: [number, number], roads: number[], ahead = -1): boolean {
  const size = map.size;
  const start: Array<[number, number, number]> = [[here[0], here[1], -1]];
  if (roads.length) {
    const search = roadSearch(s, size, roads);
    const edge = nearestEdge(search, s, size);
    if (edge >= 0) {
      const [ox, oz] = offMapPoint(size, edge);
      setPath(w, [...start, ...roadPoints(s, size, onward(tracePath(search, edge), ahead)), [ox, oz, -1]]);
      return true;
    }
  }
  const tx = Math.min(size - 1, Math.max(0, Math.floor(here[0])));
  const tz = Math.min(size - 1, Math.max(0, Math.floor(here[1])));
  const way = overland(map, s, tz * size + tx);
  if (!way) return false;
  const pts: Array<[number, number, number]> = [...start];
  for (let i = 0; i < way.points.length; i += 2) pts.push([way.points[i], way.points[i + 1], -1]);
  const [ox, oz] = offMapPoint(size, way.edge);
  pts.push([ox, oz, -1]);
  setPath(w, pts);
  return true;
}

/**
 * A walker re-routing between two road tiles starts its new way from the tile
 * behind it; if the way goes on through the tile ahead, skip the step back.
 */
function onward(tiles: number[], ahead: number): number[] {
  return ahead >= 0 && tiles.length > 1 && tiles[1] === ahead ? tiles.slice(1) : tiles;
}

/**
 * Find a new way for a walker whose road ahead was cut or whose home has gone,
 * starting from where it stands (it turns round if it must). Returns false if
 * it should vanish.
 */
function reroute(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const here = position(w);
  const ahead = w.seg + 1 < w.tiles.length ? w.tiles[w.seg + 1] : -1;
  // Off the road (beyond the edge, or at a plot): step back onto the last road tile walked.
  let cur = w.tiles[w.seg];
  for (let k = w.seg; cur < 0 && k >= 0; k--) cur = w.tiles[k];
  if (cur < 0) {
    if (w.kind === 'settler') {
      // Still outside the map: the way in has gone, so turn back the way they came.
      const b = findBuilding(s, w.home);
      if (b) b.incoming -= w.people;
      w.kind = 'leaver';
      w.home = 0;
      setPath(w, [
        [here[0], here[1], -1],
        [w.path[0], w.path[1], -1],
      ]);
      return true;
    }
    return walkOut(s, map, w, here, []);
  }
  const search = roadSearch(s, size, [cur]);
  const start: Array<[number, number, number]> = [[here[0], here[1], -1]];
  if (w.kind === 'settler') {
    let b = findBuilding(s, w.home);
    let at = -1;
    if (b) {
      at = nearestReached(search, around(size, b).filter((t) => s.tiles[t] === TILE_ROAD));
      if (at < 0) {
        b.incoming -= w.people;
        b = undefined;
      }
    }
    if (!b) {
      // Anywhere else with room for them all; failing that, as many as fit (the rest go elsewhere).
      const found = reachableHome(s, size, search, w.people);
      if (found) {
        b = found.b;
        at = found.at;
        w.people = Math.min(w.people, roomIn(b));
        b.incoming += w.people;
        w.home = b.id;
      }
    }
    if (b && at >= 0) {
      const [px, pz] = plotCentre(b);
      setPath(w, [...start, ...roadPoints(s, size, onward(tracePath(search, at), ahead)), [px, pz, -1]]);
      return true;
    }
    // Nowhere to live: walk back out.
    w.kind = 'leaver';
    w.home = 0;
  }
  return walkOut(s, map, w, here, [cur], ahead);
}

/** Is the way ahead still open (the next tile still a road, the home still there)? */
function aheadOk(s: SimState, w: Walker): boolean {
  const next = w.tiles[w.seg + 1];
  if (next >= 0 && s.tiles[next] !== TILE_ROAD) return false;
  if (w.kind === 'settler' && !findBuilding(s, w.home)) return false;
  return true;
}

/** Does the walker's home still have room for it (it may have shrunk since they set off)? */
function homeTakes(s: SimState, w: Walker): boolean {
  const b = findBuilding(s, w.home);
  return !!b && capacity(b) - b.people > 0;
}

/** Settlers reach their home; as many as fit move in. */
function arrive(s: SimState, w: Walker): void {
  const b = findBuilding(s, w.home);
  if (!b) return;
  b.incoming -= w.people;
  const people = Math.min(w.people, capacity(b) - b.people);
  b.people += people;
  if (b.level === 0) {
    b.level = 1;
    b.since = s.tick;
  }
  s.arrived += people;
  recountPopulation(s);
  s.rev++;
}

/** Move a settler or leaver group one tick along. Returns false when it is done (arrived, or gone). */
export function moveGroup(s: SimState, map: CoastMap, w: Walker): boolean {
  // The road just ahead may have been cut (or the home cleared) since the last tick.
  if (!aheadOk(s, w) && !reroute(s, map, w)) return false;
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
        if (homeTakes(s, w)) {
          arrive(s, w);
          return false;
        }
        // Gone, or full since they set off: look elsewhere.
        const b = findBuilding(s, w.home);
        if (b) b.incoming -= w.people;
        w.home = 0;
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
