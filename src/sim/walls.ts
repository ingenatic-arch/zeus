/**
 * Walls, gates and towers (slice 25).
 *
 * - **Walls** are drawn like roads: a line of one-tile stretches of stone on
 *   dry land, each a few drachmas. A stretch stands on its tile
 *   (`TILE_WALL`), and nobody walks across it.
 * - **Gates** go wherever the line crosses a road: the tile stays a road, so
 *   your walkers, carts, traders and soldiers pass as before; raiders must
 *   break the gate down.
 * - **Strength.** Every stretch and gate has a strength that raiders' blows
 *   wear down (cracks show as it weakens). At nothing it is rubble: a breach
 *   anyone can walk through (the tile is open ground again, a gate's a road),
 *   until the wall is drawn over it again, for its price. A cracked stretch
 *   can be mended the same way, for its share of the price.
 * - **Towers** (2 x 2) stand on the wall line, the stretches under them taken
 *   into them. Each takes a few workers from the labour pool, paid like any
 *   (its archers), and shoots at raiders within about ten tiles, over walls and
 *   roofs (battle.ts). They don't burn, don't wear, and can't be broken.
 * - **Raiders' way** (raids.ts): a search where a standing stretch or gate is
 *   not a wall but a cost (its strength now, as steps), so a band goes round a
 *   wall's end if the gap is near, else through the nearest gate, else the
 *   weakest stretch, and stands there hammering until it breaks.
 *
 * The walls are a short list in the state, in tile order; a lookup by tile is
 * kept outside it (rebuilt whenever the list is replaced: every change to who
 * stands where replaces it; only strengths change in place). Pure and
 * deterministic.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { Ground, GROUND_REASON, HOME_MAX_RISE, mapIndex, RUBBLE_REFUSAL } from './build';
import { beside, findBuilding, footprint } from './buildings';
import { TILE_EMPTY, TILE_ROAD, TILE_WALL, type SimState, type WallPiece } from './state';
import { walkable } from './wild';

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** What a stretch of wall and a gate cost to build. */
export const WALL_COST = 12;
export const GATE_COST = 40;
/** How strong a stretch and a gate are when whole. */
export const WALL_HP = 600;
export const GATE_HP = 300;
/** A raider counts a standing stretch as this many steps out of his way for each point of its strength (a whole gate 25, a whole stretch 50). */
export const TOLL_PER_HP = 1 / 12;
/** How many men can hammer at a stretch at once, and what each takes off its strength a tick (a whole gate in about 12 days, a stretch in about 24, for a band of ten or more). */
export const HAMMERERS = 10;
export const BLOW = 0.25;
/** A man hammers at a stretch while he stands this near its middle (tiles). */
export const AT_WALL = 2.2;
/** How far a tower shoots (tiles, from its middle), and how high its archers stand. */
export const TOWER_RANGE = 10;
export const TOWER_TOP = 1.9;

/** How strong a piece is when whole. */
export const fullOf = (p: Pick<WallPiece, 'gate'>): number => (p.gate ? GATE_HP : WALL_HP);
/** Is it standing (not rubble)? */
export const standing = (p: WallPiece): boolean => p.hp > 0;
/** How it stands, for the drawing: 0 whole, 1 cracked (below two thirds), 2 badly cracked (below a third), 3 rubble. */
export const crackOf = (p: WallPiece): number => (p.hp <= 0 ? 3 : p.hp < fullOf(p) / 3 ? 2 : p.hp < (2 * fullOf(p)) / 3 ? 1 : 0);

// ---------------------------------------------------------------------------
// Looking the walls up.

let index: { walls: WallPiece[] | null; at: Int32Array } = { walls: null, at: new Int32Array(0) };

/** The piece of wall on a tile (standing or rubble), if any. */
export function wallAt(s: SimState, t: number): WallPiece | undefined {
  const w = s.walls;
  if (!w || w.length === 0) return undefined;
  if (index.walls !== w || index.at.length !== s.tiles.length) {
    const at = new Int32Array(s.tiles.length);
    for (let i = 0; i < w.length; i++) if (w[i].t >= 0 && w[i].t < at.length) at[w[i].t] = i + 1;
    index = { walls: w, at };
  }
  const i = t >= 0 && t < index.at.length ? index.at[t] : 0;
  return i > 0 ? w[i - 1] : undefined;
}

/** Is a gate standing on this tile (a road tile, closed to raiders)? */
export const gateStands = (s: SimState, t: number): boolean => s.tiles[t] === TILE_ROAD && s.walls.length > 0 && (wallAt(s, t)?.hp ?? 0) > 0;

/** Does a standing stretch or gate block a raider on this tile? */
export const barsFoe = (s: SimState, t: number): boolean => s.tiles[t] === TILE_WALL || gateStands(s, t);

/** Can a raider walk across this tile: ground anyone can walk, but not a standing gate. */
export const foeWalkable = (map: CoastMap, s: SimState, t: number): boolean => walkable(map, s, t) && !gateStands(s, t);

/** A raider's toll for a tile (see Toll in wild.ts): 0 open, the steps a standing stretch or gate is worth to break, -1 never. */
export function foeToll(map: CoastMap, s: SimState): (t: number) => number {
  return (t: number): number => {
    const on = s.tiles[t];
    if (on === TILE_WALL || on === TILE_ROAD) {
      const p = s.walls.length ? wallAt(s, t) : undefined;
      if (p && p.hp > 0) return Math.max(1, p.hp * TOLL_PER_HP);
    }
    return walkable(map, s, t) ? 0 : -1;
  };
}

/** Is the straight way between two points free of standing walls (and, for a raider, standing gates)? Buildings don't count: only walls part men in a fight. */
export function wallsBetween(map: CoastMap, s: SimState, x0: number, z0: number, x1: number, z1: number, foe: boolean): boolean {
  if (s.walls.length === 0) return false;
  const n = map.size;
  const steps = Math.ceil(dhypot(x1 - x0, z1 - z0) * 3);
  for (let k = 1; k < steps; k++) {
    const f = k / steps;
    const x = Math.floor(x0 + (x1 - x0) * f);
    const z = Math.floor(z0 + (z1 - z0) * f);
    if (x < 0 || z < 0 || x >= n || z >= n) continue;
    const t = z * n + x;
    if (s.tiles[t] === TILE_WALL || (foe && gateStands(s, t))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Drawing walls.

/** What drawing the wall over a tile would do: a new stretch, a gate (over a road), mend one, nothing (whole already), or why not. */
export type WallJob = { what: 'wall' | 'gate' | 'mend'; cost: number } | { what: 'none'; why: string };

/** What drawing the wall over this tile would do, and what it costs. */
export function wallJob(map: CoastMap, s: SimState, t: number): WallJob {
  const n = map.size;
  if (!Number.isInteger(t) || t < 0 || t >= n * n) return { what: 'none', why: GROUND_REASON[Ground.OffMap] };
  const p = wallAt(s, t);
  if (p) {
    if (p.hp >= fullOf(p)) return { what: 'none', why: p.gate ? 'A gate already' : 'A wall already' };
    const price = p.gate ? GATE_COST : WALL_COST;
    return { what: 'mend', cost: Math.max(1, Math.ceil(price * (1 - p.hp / fullOf(p)))) };
  }
  const g = mapIndex(map).ground[t] as Ground;
  const on = s.tiles[t];
  if (on === TILE_ROAD) {
    if (g === Ground.Water) return { what: 'none', why: 'Walls stand on dry land: not on a bridge' };
    return { what: 'gate', cost: GATE_COST };
  }
  if (g !== Ground.Ok && g !== Ground.SteepForHome) return { what: 'none', why: g === Ground.Water ? 'Walls stand on dry land: not in the water or on the river bank' : GROUND_REASON[g] };
  if (on > 0) {
    const b = findBuilding(s, on);
    return { what: 'none', why: b?.kind === 'rubble' ? RUBBLE_REFUSAL : b?.kind === 'tower' ? 'A tower already' : 'Something is built here' };
  }
  if (on !== TILE_EMPTY) return { what: 'none', why: 'Something is built here' };
  return { what: 'wall', cost: WALL_COST };
}

/** Put a piece in the list, keeping it in tile order (a new list, so the lookup is rebuilt). */
function insert(s: SimState, p: WallPiece): void {
  const w = s.walls.slice();
  let i = w.length;
  while (i > 0 && w[i - 1].t > p.t) i--;
  w.splice(i, 0, p);
  s.walls = w;
}

/** Take the pieces on these tiles out of the list (a stretch standing there leaves open ground). Returns what was taken, as [tile, strength, gate] triples. */
export function dropWalls(s: SimState, tiles: readonly number[]): number[] {
  if (s.walls.length === 0 || tiles.length === 0) return [];
  const set = new Set(tiles);
  const out: number[] = [];
  const keep: WallPiece[] = [];
  for (const p of s.walls) {
    if (!set.has(p.t)) {
      keep.push(p);
      continue;
    }
    out.push(p.t, p.hp, p.gate ? 1 : 0);
    if (s.tiles[p.t] === TILE_WALL) s.tiles[p.t] = TILE_EMPTY;
  }
  if (out.length) {
    s.walls = keep;
    s.tilesRev++;
    s.rev++;
  }
  return out;
}

/**
 * Lay or mend wall on these tiles, in order, while the treasury can pay
 * (`pay` takes the drachmas and the ledger's word for each). Returns what it
 * did as [tile, strength before (-1 new), gate] triples, for undo, and the
 * tiles where new stretches stand (their plants are cleared).
 */
export function layWalls(map: CoastMap, s: SimState, tiles: readonly number[], afford: (cost: number) => boolean, pay: (cost: number, what: 'wall' | 'gate' | 'mended') => void): { done: number[]; laid: number[] } {
  const done: number[] = [];
  const laid: number[] = [];
  const seen = new Set<number>();
  for (const t of tiles) {
    if (seen.has(t)) continue;
    seen.add(t);
    const job = wallJob(map, s, t);
    if (job.what === 'none') continue;
    if (!afford(job.cost)) break;
    if (job.what === 'mend') {
      const p = wallAt(s, t)!;
      done.push(t, p.hp, p.gate ? 1 : 0);
      p.hp = fullOf(p);
      if (!p.gate) s.tiles[t] = TILE_WALL;
      pay(job.cost, 'mended');
    } else {
      const gate = job.what === 'gate';
      insert(s, { t, hp: gate ? GATE_HP : WALL_HP, gate });
      if (!gate) {
        s.tiles[t] = TILE_WALL;
        laid.push(t);
      }
      done.push(t, -1, gate ? 1 : 0);
      pay(job.cost, job.what);
    }
  }
  if (done.length) {
    s.tilesRev++;
    s.rev++;
  }
  return { done, laid };
}

/** Undo what layWalls (or a tower taking stretches in) did: new pieces taken away, mended ones as they were. */
export function unlayWalls(s: SimState, done: readonly number[]): void {
  if (!done.length) return;
  const gone: number[] = [];
  for (let i = done.length - 3; i >= 0; i -= 3) {
    const t = done[i];
    const before = done[i + 1];
    if (before < 0) gone.push(t);
  }
  dropWalls(s, gone);
  restoreWalls(s, done, true);
}

/**
 * Pieces come back as they were ([tile, strength, gate] triples), where the
 * ground is still free for them (a stretch's tile open, a gate's a road).
 * With `mendedOnly`, only the triples with a strength before (>= 0).
 */
export function restoreWalls(s: SimState, list: readonly number[], mendedOnly = false): void {
  let changed = false;
  for (let i = 0; i + 2 < list.length; i += 3) {
    const t = list[i];
    const hp = list[i + 1];
    const gate = list[i + 2] === 1;
    if (hp < 0) continue;
    if (mendedOnly && hp < 0) continue;
    const p = wallAt(s, t);
    if (p) {
      p.hp = hp;
      if (!gate) s.tiles[t] = hp > 0 ? TILE_WALL : s.tiles[t] === TILE_WALL ? TILE_EMPTY : s.tiles[t];
      changed = true;
      continue;
    }
    if (gate ? s.tiles[t] !== TILE_ROAD : s.tiles[t] !== TILE_EMPTY) continue;
    insert(s, { t, hp, gate });
    if (!gate && hp > 0) s.tiles[t] = TILE_WALL;
    changed = true;
  }
  if (changed) {
    s.tilesRev++;
    s.rev++;
  }
}

/** A piece broken: rubble, a breach anyone can walk through. */
export function breakPiece(s: SimState, p: WallPiece): void {
  p.hp = 0;
  if (!p.gate && s.tiles[p.t] === TILE_WALL) s.tiles[p.t] = TILE_EMPTY;
  s.tilesRev++;
  s.rev++;
}

// ---------------------------------------------------------------------------
// Towers.

/** Why a tower can't have its top-left tile here, or '' if it can: on open ground or standing wall, with a stretch under or beside it. */
export function towerRefusal(map: CoastMap, s: SimState, tx: number, tz: number): string {
  const n = map.size;
  const ix = mapIndex(map);
  let onLine = false;
  for (const t of footprint(n, tx, tz, 2)) {
    const x = t % n;
    if (tx < 0 || tz < 0 || tx + 1 >= n || tz + 1 >= n || x < tx) return GROUND_REASON[Ground.OffMap];
    const g = ix.ground[t] as Ground;
    if (g !== Ground.Ok && g !== Ground.SteepForHome) return g === Ground.Water ? 'Towers stand on dry land' : GROUND_REASON[g];
    const on = s.tiles[t];
    if (on === TILE_WALL) {
      onLine = true;
      continue;
    }
    if (on === TILE_ROAD) return wallAt(s, t) ? 'A gate is here: set the tower beside it, on the wall' : 'A road runs here: set the tower on the wall beside it';
    if (on !== TILE_EMPTY) {
      const b = findBuilding(s, on);
      return b?.kind === 'rubble' ? RUBBLE_REFUSAL : 'Something is built here';
    }
    if (wallAt(s, t)) onLine = true;
  }
  if (!onLine) onLine = beside(n, tx, tz, 2).some((t) => !!wallAt(s, t));
  if (!onLine) return 'A tower stands on a wall: draw the wall first (the wall tool), then set the tower on its line';
  const hs: number[] = [];
  for (let dz = 0; dz <= 2; dz++) for (let dx = 0; dx <= 2; dx++) hs.push(map.corner(tx + dx, tz + dz));
  if (Math.max(...hs) - Math.min(...hs) > HOME_MAX_RISE * 1.6) return 'Too uneven for a tower';
  return '';
}

/** The towers' archers: how many stand on a tower (its workers, fewer while its wages are unpaid). */
export function towerArchers(b: { kind: string; workers: number; owed: number }): number {
  if (b.kind !== 'tower') return 0;
  return b.owed > 0 ? Math.floor(b.workers / 2) : b.workers;
}
