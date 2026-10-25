/**
 * Slice 48: the stores' rules at work, and a workplace's orders.
 *
 * A granary's or storehouse's rule for each ware (stores.ts) says whether it
 * accepts the ware, doesn't, gets it or empties it, and how full it fills.
 * Not accepting and the limit are kept by everyone who brings it there
 * (`roomFor`), and a store emptying a ware is where everyone fetching it goes
 * first (`fromStores`). Here, its carts:
 *
 * - **Empty:** while it holds some, every CART_GAP ticks a store sends an ox
 *   cart of the ware to the nearest store that takes it (one accepting or
 *   getting it, below its limit).
 * - **Get:** while it has room below its limit, every CART_GAP ticks a store
 *   has the nearest store that holds some (one emptying it first, never one
 *   getting it too) send a cart of it over.
 *
 * So goods only ever go from a store emptying them to one accepting or
 * getting them, or from any other store to one getting them: never back,
 * never round in a ring. A store sends at most MAX_CARTS carts at once, and
 * only while somebody works there. Nothing happens while every store accepts
 * everything, as before rules.
 *
 * A workplace can be paused or given its workers first (labour.ts shares the
 * workers out again as soon as either is ordered).
 */
import type { CoastMap } from '../map/bake';
import { findBuilding, jobsAt } from './buildings';
import type { Command } from './commands';
import { CART_GAP, CART_TAKE, errandsOut, MAX_CARTS, nearestBy, wayPoints } from './food';
import { addComing, held, MARBLE, setHeld, WARES, type Ware } from './foods';
import { rateOf, shareWork } from './labour';
import { door, roadsBeside } from './rounds';
import { ACCEPT, cutOf, EMPTY, fromStores, GET, hasRules, isStore, modeOf, REFUSE, roomFor, roomOf, ruleOf } from './stores';
import type { Building, SimState } from './state';
import { newWalker, setPath } from './walk';

/** The least a store's cart goes for, getting a ware: a quarter of a cart (or what room is left below the limit, if less, once it is nearly there). */
const LEAST = 4;

/** Each tick: the stores with rules send their carts, if it is their time. */
export function stepStores(s: SimState, map: CoastMap): void {
  for (const g of s.buildings) {
    if (!isStore(g.kind) || !hasRules(g)) continue;
    if (g.clock > 0) {
      g.clock--;
      continue;
    }
    g.clock = CART_GAP;
    if (g.paused || rateOf(g) === 0) continue;
    storeCarts(s, map.size, g);
  }
}

/** A store's turn: the first ware it is emptying that can go somewhere, else the first it is getting that some store can send (taking the wares in turn, so one doesn't hold up the rest). */
function storeCarts(s: SimState, size: number, g: Building): void {
  const roads = roadsBeside(s, size, g);
  if (roads.length === 0) return;
  const n = WARES.length;
  const from = Math.floor(s.tick / CART_GAP) % n;
  for (let i = 0; i < n; i++) {
    const w = WARES[(from + i) % n];
    if (roomOf(g.kind, w) <= 0) continue;
    const mode = modeOf(g, w);
    if (mode === EMPTY && held(g, w) > 0 && errandsOut(s, g) < MAX_CARTS) {
      const found = nearestBy(s, size, roads, (o) => o !== g && isStore(o.kind) && roomFor(o, w) > 0);
      if (!found) continue;
      sendCart(s, size, g, found.g, found.way, w, Math.min(CART_TAKE[w], held(g, w), roomFor(found.g, w)));
      return;
    }
    if (mode === GET) {
      const room = roomFor(g, w);
      if (room < Math.min(Math.ceil(CART_TAKE[w] / LEAST), roomOf(g.kind, w))) continue;
      const found = nearestBy(s, size, roads, (o) => o !== g && sends(s, o, w), fromStores(w));
      if (!found) continue;
      const way = found.way.slice().reverse();
      sendCart(s, size, found.g, g, way, w, Math.min(CART_TAKE[w], held(found.g, w), room));
      return;
    }
  }
}

/** Can a store send a cart of a ware to a store getting it: it holds some, isn't getting it itself, and has somebody to load a cart free? */
const sends = (s: SimState, o: Building, w: Ware): boolean => isStore(o.kind) && roomOf(o.kind, w) > 0 && held(o, w) > 0 && modeOf(o, w) !== GET && !o.paused && rateOf(o) > 0 && errandsOut(s, o) < MAX_CARTS;

/** An ox cart (a sledge for marble) from one store to another along `way` (road tiles from `from`'s side to `to`'s), with its load, the room reserved there. */
function sendCart(s: SimState, size: number, from: Building, to: Building, way: number[], w: Ware, load: number): void {
  if (load <= 0 || way.length === 0) return;
  const c = newWalker(s, w === MARBLE ? 'sledge' : 'cart', 1);
  c.origin = from.id;
  c.target = to.id;
  c.load = load;
  c.food = w;
  c.since = s.tick;
  setHeld(from, w, held(from, w) - load);
  addComing(to, w, load);
  setPath(c, wayPoints(size, door(size, from, way[0]), way, to));
  s.walkers.push(c);
  s.looks++;
}

/** The store-to-store carts on the road now: out from this store, and coming to it from another. */
export function storeCartsOf(s: SimState, g: Building): { out: number; coming: number } {
  let out = 0;
  let coming = 0;
  for (const w of s.walkers) {
    if ((w.kind !== 'cart' && w.kind !== 'sledge') || w.back) continue;
    if (w.origin === g.id) out++;
    else if (w.target === g.id && isStore(findBuilding(s, w.origin)?.kind ?? 'home')) coming++;
  }
  return { out, coming };
}

// ---------------------------------------------------------------------------
// Commands.

/** A store's rule for a ware, or for every ware at once ('none': accept nothing, but what it is emptying; 'all': accept everything, all of its room). Anything wrong does nothing. */
export function storeCommand(s: SimState, c: Extract<Command, { type: 'store' }>): void {
  const g = s.buildings.find((b) => b.id === c.id);
  if (!g || !isStore(g.kind)) return;
  if (g.rules.length < WARES.length) for (let i = g.rules.length; i < WARES.length; i++) g.rules.push(0);
  if (c.all === 'all' || c.all === 'none') {
    for (const w of WARES) {
      if (roomOf(g.kind, w) <= 0) continue;
      g.rules[w] = c.all === 'all' ? 0 : modeOf(g, w) === EMPTY ? g.rules[w] : ruleOf(REFUSE, cutOf(g, w));
    }
    tidy(g);
    s.rev++;
    return;
  }
  const w = c.ware;
  if (typeof w !== 'number' || !Number.isInteger(w) || w < 0 || w >= WARES.length || roomOf(g.kind, w) <= 0) return tidy(g);
  const ok = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3;
  const mode = ok(c.mode) ? c.mode : modeOf(g, w);
  const limit = ok(c.limit) ? c.limit : cutOf(g, w);
  const r = ruleOf(mode, limit);
  if (r === g.rules[w]) return tidy(g);
  g.rules[w] = r;
  tidy(g);
  // (Its carts look at once, not at the end of a wait set when it had nothing to do.)
  g.clock = 0;
  s.rev++;
}

/** Rules all back to accepting everything are no rules (as a new store's: a town's saves stay small). */
function tidy(g: Building): void {
  if (g.rules.every((r) => r === 0)) g.rules.length = 0;
}

/** A workplace paused (or set going again), or given its workers first (or not): the workers are shared out again at once. */
export function workCommand(s: SimState, map: CoastMap, c: Extract<Command, { type: 'work' }>): void {
  const b = s.buildings.find((o) => o.id === c.id);
  if (!b || b.kind === 'home' || jobsAt(b) === 0) return;
  let changed = false;
  if (typeof c.paused === 'boolean' && c.paused !== !!b.paused) {
    b.paused = c.paused ? 1 : 0;
    changed = true;
  }
  if (typeof c.first === 'boolean' && c.first !== !!b.first) {
    b.first = c.first ? 1 : 0;
    changed = true;
  }
  if (!changed) return;
  shareWork(s, map);
  s.rev++;
}

/** What a store does with a ware, in a few words ("accepts all of its room", "gets up to half", "doesn't accept", "empties"). */
export function ruleWords(g: Building, w: Ware): string {
  const mode = modeOf(g, w);
  const cut = cutOf(g, w);
  const upto = cut === 0 ? '' : ` up to ${['', 'three quarters', 'half', 'a quarter'][cut]} of its room`;
  if (mode === REFUSE) return 'doesn’t accept it';
  if (mode === EMPTY) return 'is emptying it: its carts take it out to other stores';
  if (mode === GET) return `gets it: carts bring it over from other stores${upto}`;
  return mode === ACCEPT && cut ? `accepts it${upto}` : 'accepts it';
}
