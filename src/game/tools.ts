/**
 * The build tools: what a press, drag and release of the left button does
 * while a tool is picked, the preview on the ground while dragging, and the
 * commands sent to the sim on release. Host code: it reads the sim state and
 * talks to the sim only through its command queue.
 */
import { WATER_NONE } from '../map/bake';
import { Ground, mapIndex, PLOT_COST, PLOT_SIZE, plotNeighbours, plotRefusal, ROAD_COST, roadRefusal } from '../sim/build';
import { roadRoute } from '../sim/roads';
import { findBuilding } from '../sim/settlers';
import type { Sim } from '../sim/sim';
import { TILE_ROAD } from '../sim/state';
import { MARK_BAD, MARK_CLEAR, MARK_OK, type Placement } from '../render/placement';

export type ToolName = 'road' | 'housing' | 'clear';
export const TOOLS: readonly ToolName[] = ['road', 'housing', 'clear'];

export interface ToolTip {
  /** Show text near the pointer (screen px), or hide with null. */
  show(text: string | null, x?: number, y?: number, bad?: boolean): void;
}

const fmt = (n: number): string => n.toLocaleString('en-GB');

export class Tools {
  tool: ToolName | null = null;
  private anchor = -1;
  private hover = -1;
  private hoverX = 0;
  private hoverZ = 0;
  private screen: [number, number] = [0, 0];
  private listeners: Array<(t: ToolName | null) => void> = [];
  private lastRev = -1;
  private routeKey = '';
  private route: number[] | null = null;
  /** What a release would send. */
  private pending: (() => void) | null = null;

  constructor(
    private readonly sim: Sim,
    private readonly placement: Placement,
    private readonly tip: ToolTip,
  ) {}

  onChange(l: (t: ToolName | null) => void): void {
    this.listeners.push(l);
  }

  get dragging(): boolean {
    return this.anchor >= 0;
  }

  select(t: ToolName | null): void {
    if (t === this.tool) t = null;
    this.tool = t;
    this.anchor = -1;
    const map = this.sim.map;
    const ix = mapIndex(map);
    this.placement.show(t !== null, t === 'road');
    if (t) {
      this.placement.setBlocked((i) => {
        if (map.tileWater[i] !== WATER_NONE) return false;
        const g = ix.ground[i];
        if (t === 'road') return g === Ground.Steep || g === Ground.Water;
        if (t === 'housing') return g !== Ground.Ok;
        return false;
      });
    }
    this.preview();
    for (const l of this.listeners) l(t);
  }

  /** The pointer moved over the ground (world x, z) or off it (null). */
  pointer(world: { x: number; z: number } | null, sx: number, sy: number): void {
    this.screen = [sx, sy];
    const n = this.sim.map.size;
    if (!world || world.x < 0 || world.z < 0 || world.x >= n || world.z >= n) {
      this.hover = -1;
    } else {
      this.hoverX = world.x;
      this.hoverZ = world.z;
      this.hover = Math.floor(world.z) * n + Math.floor(world.x);
    }
    if (world) this.placement.setCursor(world.x, world.z, this.tool === 'housing' ? 11 : 9);
    this.preview();
  }

  down(): void {
    if (!this.tool || this.hover < 0) return;
    this.anchor = this.tool === 'housing' ? this.plotAt() : this.hover;
    this.preview();
  }

  up(): void {
    if (!this.tool) return;
    this.preview();
    this.pending?.();
    this.anchor = -1;
    this.pending = null;
    this.preview();
  }

  /** Let go of a drag without building, or put the tool down. */
  cancel(): void {
    if (this.anchor >= 0) {
      this.anchor = -1;
      this.preview();
    } else this.select(null);
  }

  undo(): void {
    this.send({ type: 'undo' });
  }

  /** Re-draw the preview if the city changed under it. */
  frame(): void {
    if (this.sim.state.rev !== this.lastRev) this.preview();
  }

  private send(c: Parameters<Sim['enqueue']>[0]): void {
    this.sim.enqueue(c);
    // Build at once, even while paused (it is what the next tick would do first).
    this.sim.flush();
  }

  /** Top-left tile of the plot centred on the pointer. */
  private plotAt(): number {
    const n = this.sim.map.size;
    const x = Math.max(0, Math.min(n - PLOT_SIZE, Math.round(this.hoverX - PLOT_SIZE / 2)));
    const z = Math.max(0, Math.min(n - PLOT_SIZE, Math.round(this.hoverZ - PLOT_SIZE / 2)));
    return z * n + x;
  }

  private preview(): void {
    const s = this.sim.state;
    this.lastRev = s.rev;
    this.pending = null;
    const marks = new Map<number, number>();
    if (!this.tool || this.hover < 0) {
      this.placement.setMarks(marks);
      this.tip.show(null);
      return;
    }
    const map = this.sim.map;
    const n = map.size;
    const [sx, sy] = this.screen;
    if (this.tool === 'road') {
      const from = this.anchor >= 0 ? this.anchor : this.hover;
      // The route only changes when the tiles or the city do.
      const key = `${from}:${this.hover}:${s.rev}`;
      if (this.routeKey !== key) {
        this.routeKey = key;
        this.route = roadRoute(map, s, from, this.hover);
      }
      const route = this.route;
      if (!route) {
        // Show the straight way, and why it's blocked.
        let reason = '';
        for (const t of straight(n, from, this.hover)) {
          const r = roadRefusal(map, s, t % n, Math.floor(t / n));
          if (r && r !== 'Already a road') {
            marks.set(t, MARK_BAD);
            reason ||= r;
          } else marks.set(t, MARK_OK);
        }
        this.placement.setMarks(marks);
        this.tip.show(from === this.hover ? reason : `No way through: ${reason.toLowerCase() || 'blocked'}`, sx, sy, true);
        return;
      }
      const fresh = route.filter((t) => s.tiles[t] !== TILE_ROAD);
      const afford = Math.floor(s.money / ROAD_COST);
      fresh.forEach((t, i) => marks.set(t, i < afford ? MARK_OK : MARK_BAD));
      this.placement.setMarks(marks);
      if (fresh.length === 0) {
        this.tip.show('Already a road', sx, sy);
        return;
      }
      const lay = fresh.slice(0, afford);
      const cost = lay.length * ROAD_COST;
      if (lay.length < fresh.length) this.tip.show(`Not enough drachmas: ${fmt(fresh.length * ROAD_COST)} dr for ${fresh.length} tiles`, sx, sy, true);
      else this.tip.show(`Road · ${fresh.length} ${fresh.length === 1 ? 'tile' : 'tiles'} · ${fmt(cost)} dr`, sx, sy);
      if (lay.length) this.pending = () => this.send({ type: 'road', tiles: lay });
      return;
    }
    if (this.tool === 'housing') {
      const end = this.plotAt();
      const from = this.anchor >= 0 ? this.anchor : end;
      const fx = from % n;
      const fz = Math.floor(from / n);
      const ex = end % n;
      const ez = Math.floor(end / n);
      const stepX = ex >= fx ? PLOT_SIZE : -PLOT_SIZE;
      const stepZ = ez >= fz ? PLOT_SIZE : -PLOT_SIZE;
      const ok: number[] = [];
      let reason = '';
      let roadless = 0;
      let afford = Math.floor(s.money / PLOT_COST);
      for (let z = fz; stepZ > 0 ? z <= ez : z >= ez; z += stepZ) {
        for (let x = fx; stepX > 0 ? x <= ex : x >= ex; x += stepX) {
          const r = plotRefusal(map, s, x, z);
          const good = r === '' && afford > 0;
          if (good) {
            afford--;
            ok.push(z * n + x);
            if (!plotNeighbours(n, x, z).some((t) => s.tiles[t] === TILE_ROAD)) roadless++;
          } else reason ||= r || 'Not enough drachmas';
          for (let dz = 0; dz < PLOT_SIZE; dz++) {
            for (let dx = 0; dx < PLOT_SIZE; dx++) {
              const tx = x + dx;
              const tz = z + dz;
              if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
              const t = tz * n + tx;
              if (!good && marks.get(t) === MARK_OK) continue;
              marks.set(t, good ? MARK_OK : MARK_BAD);
            }
          }
        }
      }
      this.placement.setMarks(marks);
      if (ok.length === 0) {
        this.tip.show(reason, sx, sy, true);
        return;
      }
      let text = `Housing · ${ok.length} ${ok.length === 1 ? 'plot' : 'plots'} · ${fmt(ok.length * PLOT_COST)} dr`;
      if (roadless) text += ok.length === 1 ? ' · needs a road beside it' : ` · ${roadless} need a road beside them`;
      this.tip.show(text, sx, sy);
      this.pending = () => this.send({ type: 'plots', at: ok });
      return;
    }
    // Clear: a rectangle of tiles.
    const from = this.anchor >= 0 ? this.anchor : this.hover;
    const x0 = Math.min(from % n, this.hover % n);
    const x1 = Math.max(from % n, this.hover % n);
    const z0 = Math.min(Math.floor(from / n), Math.floor(this.hover / n));
    const z1 = Math.max(Math.floor(from / n), Math.floor(this.hover / n));
    const treesOn = mapIndex(map).treesOn;
    const cleared = new Set(s.cleared);
    let roads = 0;
    let trees = 0;
    const homes = new Set<number>();
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const t = z * n + x;
        const on = s.tiles[t];
        if (on === TILE_ROAD) roads++;
        else if (on > 0) homes.add(on);
        else if ((treesOn.get(t) ?? []).some((i) => !cleared.has(i))) trees++;
        else {
          marks.set(t, MARK_OK);
          continue;
        }
        marks.set(t, MARK_CLEAR);
      }
    }
    let people = 0;
    for (const id of homes) {
      const b = findBuilding(s, id);
      if (!b) continue;
      people += b.people;
      for (let dz = 0; dz < PLOT_SIZE; dz++) for (let dx = 0; dx < PLOT_SIZE; dx++) marks.set((b.z + dz) * n + b.x + dx, MARK_CLEAR);
    }
    this.placement.setMarks(marks);
    const bits: string[] = [];
    if (roads) bits.push(`${roads} road ${roads === 1 ? 'tile' : 'tiles'}`);
    if (homes.size) bits.push(`${homes.size} ${homes.size === 1 ? 'home' : 'homes'}`);
    if (trees) bits.push(`trees on ${trees} ${trees === 1 ? 'tile' : 'tiles'}`);
    if (bits.length === 0) {
      this.tip.show('Nothing to clear', sx, sy);
      return;
    }
    let text = `Clear ${bits.join(', ')}`;
    if (people) text += ` · ${people === 1 ? '1 person leaves' : `${people} people leave`}`;
    this.tip.show(text, sx, sy, people > 0);
    this.pending = () => this.send({ type: 'clear', x0, z0, x1, z1 });
  }
}

/** Tiles along an L from one tile to another (the longer side first). */
function straight(n: number, a: number, b: number): number[] {
  const ax = a % n;
  const az = Math.floor(a / n);
  const bx = b % n;
  const bz = Math.floor(b / n);
  const out: number[] = [];
  const sx = Math.sign(bx - ax);
  const sz = Math.sign(bz - az);
  if (Math.abs(bx - ax) >= Math.abs(bz - az)) {
    for (let x = ax; x !== bx + sx || x === ax; x += sx || 1) {
      out.push(az * n + x);
      if (sx === 0) break;
    }
    for (let z = az + sz; sz !== 0 && z !== bz + sz; z += sz) out.push(z * n + bx);
  } else {
    for (let z = az; z !== bz + sz || z === az; z += sz || 1) {
      out.push(z * n + ax);
      if (sz === 0) break;
    }
    for (let x = ax + sx; sx !== 0 && x !== bx + sx; x += sx) out.push(bz * n + x);
  }
  return out;
}

