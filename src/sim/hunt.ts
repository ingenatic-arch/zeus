/**
 * The hunting lodge and its hunters. While a lodge has workers and room in
 * its store it sends hunters, a few days apart, up to three out at once
 * (fewer when short-handed), each after the nearest herd within HUNT_RANGE
 * that has game to spare. A hunter walks across country to the herd
 * (re-aiming if it has moved on, up to three times), stalks it for two days,
 * takes one head and carries the meat home. He never takes a herd's last two
 * head: if that is all it has when he gets there he comes back empty. Carts
 * take the meat from the lodge to a granary (food.ts).
 */
import type { CoastMap } from '../map/bake';
import { datan2, dcos, dhypot, dsin } from '../map/dmath';
import { around, centreOf, findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { LODGE_STORE } from './food';
import { MEAT } from './foods';
import { rateOf } from './labour';
import { door } from './rounds';
import type { Building, Herd, SimState, Walker } from './state';
import { note } from './stockbook';
import { HUNTER_SPEED, newWalker, position, setPath } from './walk';
import { bolt, lineClear, MIN_HEAD, offRoadPath, prunePath, regrowIn, walkable } from './wild';
import { restFor } from './water';
// Slice 57.
import { godHunt } from './pantheon';

/** How far (straight across country, from the lodge) its hunters go after game. */
export const HUNT_RANGE = 40;
/** Most hunters a fully staffed lodge has out at once. */
export const MAX_HUNTERS = 3;
/** Ticks between hunters setting out from the same lodge (three days). */
export const HUNTER_GAP = 3 * TICKS_PER_DAY;
/** Ticks a hunter stalks a herd before he takes one (two days). */
export const STALK = 2 * TICKS_PER_DAY;
/** Measures of meat one head of game brings. */
export const MEAT_KILL = 160;
/** How much further off (in tiles) a herd seems for each hunter already after it. */
const SHARED = 12;
/** How close to the herd he must be when he has finished stalking it. */
const REACH = 4;
/** Re-aims at a herd that moved before he gives up on it. */
const REAIMS = 3;
/** How far short of the herd he stops to stalk it. */
const SHORT = 2.5;

/** A lodge's hunters out now. */
export function huntersOut(s: SimState, l: Building): Walker[] {
  return s.walkers.filter((w) => w.kind === 'hunter' && w.origin === l.id);
}

/** Hunters a lodge can have out at once, for its workers. */
export const huntersFor = (l: Building): number => {
  const r = rateOf(l);
  return r <= 0 ? 0 : Math.max(1, Math.floor(r * MAX_HUNTERS + 1e-9));
};

/**
 * How far a herd is from a lodge, straight across country: from the middle of
 * the ground it roams (its home spot), not where it stands this moment, so a
 * herd wandering about near the edge of a lodge's reach doesn't drift in and
 * out of it.
 */
export const herdDistance = (l: Building, h: Herd): number => {
  const [cx, cz] = centreOf(l);
  return dhypot(h.hx - cx, h.hz - cz);
};

/** The herds within a lodge's reach, nearest first, with how many head each has to spare (counting hunters already after it). */
export function herdsInReach(s: SimState, l: Building): Array<{ h: Herd; i: number; spare: number; d: number; after: number }> {
  const out: Array<{ h: Herd; i: number; spare: number; d: number; after: number }> = [];
  s.herds.forEach((h, i) => {
    const d = herdDistance(l, h);
    if (d > HUNT_RANGE) return;
    let after = 0;
    for (const w of s.walkers) if (w.kind === 'hunter' && !w.back && w.food === i) after++;
    out.push({ h, i, spare: h.head - MIN_HEAD - after, d, after });
  });
  // Nearest first, though a herd another hunter is already after counts as further off, so the hunters spread out.
  return out.sort((a, b) => a.d + SHARED * a.after - (b.d + SHARED * b.after) || a.i - b.i);
}

/** The tile under a point. */
const tileAt = (size: number, x: number, z: number): number => Math.floor(z) * size + Math.floor(x);

/** A path for a hunter from where he stands (or the lodge's side) to a point, as waypoints with no road tiles; null if there is no way. */
export function routeTo(s: SimState, map: CoastMap, here: [number, number], starts: number[], x: number, z: number, short: number): Array<[number, number, number]> | null {
  const size = map.size;
  const tiles = offRoadPath(map, s, starts, tileAt(size, x, z));
  if (!tiles) return null;
  const pts = prunePath(map, s, tiles);
  const out: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const [px, pz] of pts) out.push([px, pz, -1]);
  // Stop a little short of the herd.
  if (short > 0 && out.length >= 2) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    const len = dhypot(b[0] - a[0], b[1] - a[1]);
    if (len > short + 0.5) {
      b[0] -= ((b[0] - a[0]) * short) / len;
      b[1] -= ((b[1] - a[1]) * short) / len;
    } else if (out.length > 2) out.pop();
  }
  return out;
}

/** The tiles a walker standing here can set off from: his own, or the nearest walkable ones round it. */
export function startsAt(map: CoastMap, s: SimState, x: number, z: number): number[] {
  const size = map.size;
  const t = tileAt(size, x, z);
  if (walkable(map, s, t)) return [t];
  const out: number[] = [];
  for (const u of [t - size, t - 1, t + 1, t + size, t - size - 1, t - size + 1, t + size - 1, t + size + 1]) if (u >= 0 && u < size * size && walkable(map, s, u)) out.push(u);
  return out;
}

/** Send him home to his lodge from where he stands. False if there is no way. */
export function goHome(s: SimState, map: CoastMap, w: Walker, l: Building): boolean {
  const size = map.size;
  const here = position(w);
  const sides = around(size, l).filter((t) => walkable(map, s, t));
  if (sides.length === 0) return false;
  // Search from the lodge's sides to him, and walk it the other way.
  const starts = startsAt(map, s, here[0], here[1]);
  if (starts.length === 0) return false;
  let best: number[] | null = null;
  for (const st of starts) {
    const p = offRoadPath(map, s, sides, st);
    if (p && (!best || p.length < best.length)) best = p;
  }
  if (!best) return false;
  const pts = prunePath(map, s, best.reverse());
  const way: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const [px, pz] of pts) way.push([px, pz, -1]);
  const [dx, dz] = door(size, l, best[best.length - 1]);
  way.push([dx, dz, -1]);
  w.back = true;
  setPath(w, way);
  return true;
}

/** Lodges send their hunters out. */
export function stepLodges(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const l of s.buildings) {
    if (l.kind !== 'lodge') continue;
    // l.growth counts down to the next hunter setting out.
    if (l.growth > 0) {
      l.growth--;
      continue;
    }
    const most = huntersFor(l);
    if (most === 0) continue;
    const out = huntersOut(s, l);
    if (out.length >= most) {
      l.growth = TICKS_PER_DAY;
      continue;
    }
    // Room in the store for what the hunters out (and this one) will bring.
    if (l.meat + (out.length + 1) * MEAT_KILL > LODGE_STORE) {
      l.growth = HUNTER_GAP;
      continue;
    }
    const game = herdsInReach(s, l).find((g) => g.spare > 0);
    const sides = around(size, l).filter((t) => walkable(map, s, t));
    if (!game || sides.length === 0) {
      l.growth = HUNTER_GAP;
      continue;
    }
    // He steps out on the side nearest the herd.
    const [cx, cz] = centreOf(l);
    const ang = datan2(game.h.z - cz, game.h.x - cx);
    const side = sides.reduce((a, t) => {
      const da = dhypot((a % size) + 0.5 - cx - dcos(ang) * 2, Math.floor(a / size) + 0.5 - cz - dsin(ang) * 2);
      const dt = dhypot((t % size) + 0.5 - cx - dcos(ang) * 2, Math.floor(t / size) + 0.5 - cz - dsin(ang) * 2);
      return dt < da ? t : a;
    });
    const way = routeTo(s, map, door(size, l, side), [side], game.h.x, game.h.z, SHORT);
    if (!way) {
      l.growth = HUNTER_GAP;
      continue;
    }
    const w = newWalker(s, 'hunter', 1);
    w.origin = l.id;
    w.food = game.i;
    w.since = s.tick;
    setPath(w, way);
    s.walkers.push(w);
    l.growth = restFor(l, HUNTER_GAP);
  }
}

/** He takes one head of the herd he has been stalking, if it can spare one, and turns for home. */
function strike(s: SimState, map: CoastMap, w: Walker, l: Building): boolean {
  const h = s.herds[w.food];
  const [x, z] = position(w);
  if (h && h.head > MIN_HEAD) {
    if (dhypot(h.x - x, h.z - z) <= REACH + 1) {
      h.head--;
      // (Slice 57: double under Artemis's blessing.)
      w.load = MEAT_KILL * godHunt(s);
      bolt(s, map, h, x, z);
    } else if (w.steps < REAIMS && aim(s, map, w)) {
      // It moved off while he crept up (another hunter's kill scattered it): after it again.
      w.steps++;
      return true;
    }
  }
  return goHome(s, map, w, l) || home(s, w, l);
}

/** He is home (or can't get there): what he brought goes into the lodge's store. */
function home(s: SimState, w: Walker, l: Building): false {
  if (w.load > 0) {
    const had = l.meat;
    l.meat = Math.min(LODGE_STORE, l.meat + w.load);
    note(s, MEAT, 'made', 'lodge', l.meat - had);
    s.looks++;
  }
  return false;
}

/** Move a hunter one tick along. Returns false when he is done (home, or gone). */
export function moveHunter(s: SimState, map: CoastMap, w: Walker): boolean {
  const l = findBuilding(s, w.origin);
  if (!l || l.kind !== 'lodge') return false;
  // Stalking.
  if (w.wait > 0) {
    if (--w.wait > 0) return true;
    return strike(s, map, w, l);
  }
  let move = HUNTER_SPEED;
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
      if (!lineClear(map, s, w.path[j], w.path[j + 1], w.path[j + 2], w.path[j + 3], walkable) && !(w.seg + 1 === last && w.back)) {
        if (!(w.back ? goHome(s, map, w, l) : aim(s, map, w))) return w.back ? home(s, w, l) : goHome(s, map, w, l) || home(s, w, l);
      }
      continue;
    }
    // The end of the way.
    if (w.back) return home(s, w, l);
    const h = s.herds[w.food];
    const [x, z] = position(w);
    if (!h || h.head <= MIN_HEAD) return goHome(s, map, w, l) || home(s, w, l);
    if (dhypot(h.x - x, h.z - z) > REACH) {
      // It has moved on: after it again, a few times.
      if (w.steps < REAIMS && aim(s, map, w)) {
        w.steps++;
        continue;
      }
      return goHome(s, map, w, l) || home(s, w, l);
    }
    // Close enough: he stalks it, and it grazes on unaware.
    w.wait = STALK;
    h.clock = Math.max(h.clock, STALK + 5);
    break;
  }
  return true;
}

/** Aim him at his herd where it stands now. False if there is no way. */
function aim(s: SimState, map: CoastMap, w: Walker): boolean {
  const h = s.herds[w.food];
  if (!h) return false;
  const [x, z] = position(w);
  const starts = startsAt(map, s, x, z);
  if (starts.length === 0) return false;
  const way = routeTo(s, map, [x, z], starts, h.x, h.z, SHORT);
  if (!way) return false;
  setPath(w, way);
  return true;
}

/**
 * About how much meat a lodge brings in a month: the least of what its
 * hunters can carry home (as staffed now, walking to the nearest herd with
 * game to spare and back) and what the herds in its reach grow back in a
 * month, shared with any other lodge after the same herds (0 with no game
 * to spare in reach). `game` says the herds hold it back.
 */
export function meatLimits(s: SimState, l: Building): { meat: number; game: boolean } {
  const hunters = huntersFor(l);
  if (hunters === 0) return { meat: 0, game: false };
  const inReach = herdsInReach(s, l);
  const game = inReach.filter((g) => g.h.head > MIN_HEAD);
  if (game.length === 0) return { meat: 0, game: true };
  const d = Math.min(...game.map((g) => g.d));
  // Across country is a little longer than the straight line.
  const trip = (2 * d * 1.15) / HUNTER_SPEED + STALK;
  const carried = (hunters * MEAT_KILL * TICKS_PER_MONTH) / Math.max(trip, HUNTER_GAP);
  const grows = inReach.reduce((n, g) => {
    const lodges = s.buildings.filter((o) => o.kind === 'lodge' && huntersFor(o) > 0 && herdDistance(o, g.h) <= HUNT_RANGE).length;
    return n + (MEAT_KILL * TICKS_PER_MONTH) / regrowIn(g.h) / Math.max(1, lodges);
  }, 0);
  return grows < carried ? { meat: Math.round(grows), game: true } : { meat: Math.round(carried), game: false };
}

/**
 * What a lodge would find if built with its top-left corner at (x, z), fully
 * staffed: the herds in reach (nearest first, with how far), and about how
 * much meat a month it would bring (see meatLimits), sharing the herds with
 * the lodges already after them.
 */
export function lodgeOutlook(s: SimState, x: number, z: number): { game: Array<{ h: Herd; d: number }>; meat: number; byGame: boolean; shared: number } {
  const cx = x + 1.5;
  const cz = z + 1.5;
  const game = s.herds
    .map((h) => ({ h, d: dhypot(h.x - cx, h.z - cz) }))
    .filter((g) => g.d <= HUNT_RANGE)
    .sort((a, b) => a.d - b.d);
  const others = s.buildings.filter((o) => o.kind === 'lodge' && huntersFor(o) > 0);
  const shared = others.filter((o) => game.some((g) => herdDistance(o, g.h) <= HUNT_RANGE)).length;
  const spare = game.filter((g) => g.h.head > MIN_HEAD);
  if (spare.length === 0) return { game, meat: 0, byGame: true, shared };
  const trip = (2 * spare[0].d * 1.15) / HUNTER_SPEED + STALK;
  const carried = (MAX_HUNTERS * MEAT_KILL * TICKS_PER_MONTH) / Math.max(trip, HUNTER_GAP);
  const grows = game.reduce((n, g) => n + (MEAT_KILL * TICKS_PER_MONTH) / regrowIn(g.h) / (1 + others.filter((o) => herdDistance(o, g.h) <= HUNT_RANGE).length), 0);
  return grows < carried ? { game, meat: Math.round(grows), byGame: true, shared } : { game, meat: Math.round(carried), byGame: false, shared };
}

/** About how much meat a lodge brings in a month (see meatLimits). */
export const meatPerMonth = (s: SimState, l: Building): number => meatLimits(s, l).meat;

/** What a full lodge brings in a month a fair walk (fifteen tiles) from its game. */
export const LODGE_MONTH = Math.round((MAX_HUNTERS * MEAT_KILL * TICKS_PER_MONTH) / ((2 * 15 * 1.15) / HUNTER_SPEED + STALK));
