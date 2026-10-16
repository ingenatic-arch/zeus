/**
 * The build tools: what a press, drag and release of the left button does
 * while a tool is picked, the preview on the ground while dragging, and the
 * commands sent to the sim on release. Host code: it reads the sim state and
 * talks to the sim only through its command queue.
 */
import { WATER_NONE } from '../map/bake';
import {
  BRIDGE_COST,
  BRIDGE_MAX,
  bridgeAt,
  bridgeSpan,
  buildingRefusal,
  COST,
  FARM_FERTILE_MIN,
  fertilityOf,
  Ground,
  isBridge,
  mapIndex,
  PLOT_COST,
  PLOT_SIZE,
  plotNeighbours,
  plotRefusal,
  ROAD_COST,
  roadRefusal,
} from '../sim/build';
import { beside, BUILDING_NAMES, findBuilding, JOBS, sideOf } from '../sim/buildings';
import { GRANARY_CAP, GROW, HARVEST, VENDOR_RANGE } from '../sim/food';
import { roadRoute } from '../sim/roads';
import type { Sim } from '../sim/sim';
import { TILE_ROAD, type BuildingKind } from '../sim/state';
import { TICKS_PER_MONTH } from '../sim/clock';
import { CARRIER_RANGE } from '../sim/water';
import { previewReach, type ServiceOverlay } from '../render/overlay';
import { MARK_BAD, MARK_CLEAR, MARK_OK, type Placement } from '../render/placement';

export type ToolName = 'road' | 'housing' | 'fountain' | 'farm' | 'granary' | 'agora' | 'clear';
export const TOOLS: readonly ToolName[] = ['road', 'housing', 'fountain', 'farm', 'granary', 'agora', 'clear'];

/** The tools that place one building where you click. */
type Placer = 'fountain' | 'farm' | 'granary' | 'agora';
const isPlacer = (t: ToolName | null): t is Placer => t === 'fountain' || t === 'farm' || t === 'granary' || t === 'agora';

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
  private reachKey = '';
  private reach = { homes: 0, dry: 0 };
  /** What a release would send. */
  private pending: (() => void) | null = null;

  constructor(
    private readonly sim: Sim,
    private readonly placement: Placement,
    private readonly tip: ToolTip,
    private readonly overlay?: ServiceOverlay,
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
        // A farm also needs fertile ground: the rest is washed rust near the pointer.
        if (t === 'farm') return g !== Ground.Ok || map.tileFertility[i] < FARM_FERTILE_MIN;
        if (t === 'housing' || isPlacer(t)) return g !== Ground.Ok;
        return false;
      });
    }
    // Placing a fountain shows the water overlay, and what the new one would reach; an agora, the food overlay; a farm or granary, the food overlay too (where the chain runs).
    if (this.overlay) {
      this.overlay.forced = t === 'fountain' ? 'water' : t === 'agora' || t === 'farm' || t === 'granary' ? 'food' : null;
      this.overlay.setPreview(null);
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
    if (world) this.placement.setCursor(world.x, world.z, this.tool === 'housing' || isPlacer(this.tool) ? 11 : 9);
    this.preview();
  }

  down(): void {
    if (!this.tool || this.hover < 0) return;
    this.anchor = this.tool === 'housing' || isPlacer(this.tool) ? this.plotAt(this.side()) : this.hover;
    this.preview();
  }

  up(): void {
    // Only a press that began here (not one let go of with Esc) builds.
    if (!this.tool || this.anchor < 0) return;
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

  /** How many times a road route has been worked out (for the smoke test: it shouldn't follow settlers arriving). */
  routesFound = 0;

  private send(c: Parameters<Sim['enqueue']>[0]): void {
    this.sim.enqueue(c);
    // Build at once, even while paused (it is what the next tick would do first).
    this.sim.flush();
  }

  private setMarks(marks: Map<number, number>): void {
    this.lastMarks = marks;
    this.placement.setMarks(marks);
  }

  /** The footprint side of what the tool places. */
  private side(): number {
    return isPlacer(this.tool) ? sideOf(this.tool) : PLOT_SIZE;
  }

  /** Top-left tile of the footprint centred on the pointer. */
  private plotAt(side = PLOT_SIZE): number {
    const n = this.sim.map.size;
    const x = Math.max(0, Math.min(n - side, Math.round(this.hoverX - side / 2)));
    const z = Math.max(0, Math.min(n - side, Math.round(this.hoverZ - side / 2)));
    return z * n + x;
  }

  private preview(): void {
    this.previewMarks();
    // The marks on river tiles (a bridge) also float above the water, where they can be seen.
    const map = this.sim.map;
    const n = map.size;
    const lifted: Array<{ x: number; z: number; y: number; bad: boolean }> = [];
    for (const [t, v] of this.lastMarks) {
      if (map.tileWater[t] === WATER_NONE || (v !== MARK_OK && v !== MARK_BAD)) continue;
      const x = (t % n) + 0.5;
      const z = Math.floor(t / n) + 0.5;
      lifted.push({ x, z, y: Math.max(map.heightAt(x, z), map.riverAt(x, z).surface) + 0.35, bad: v === MARK_BAD });
    }
    this.placement.setLifted(lifted);
  }

  private lastMarks: ReadonlyMap<number, number> = new Map();

  private previewMarks(): void {
    const s = this.sim.state;
    this.lastRev = s.rev;
    this.pending = null;
    const marks = new Map<number, number>();
    if (!this.tool || this.hover < 0) {
      this.setMarks(marks);
      this.tip.show(null);
      return;
    }
    const map = this.sim.map;
    const n = map.size;
    const [sx, sy] = this.screen;
    if (this.tool === 'road') {
      const from = this.anchor >= 0 ? this.anchor : this.hover;
      // The route only changes when the tiles do (not when settlers arrive or houses grow).
      const key = `${from}:${this.hover}:${s.tilesRev}`;
      if (this.routeKey !== key) {
        this.routeKey = key;
        this.route = roadRoute(map, s, from, this.hover);
        this.routesFound++;
      }
      const route = this.route;
      if (!route) {
        // Show the straight way, and why it's blocked.
        let reason = '';
        const line = straight(n, from, this.hover);
        const ground = mapIndex(map).ground;
        for (let i = 0; i < line.length; i++) {
          const t = line[i];
          let r = roadRefusal(map, s, t % n, Math.floor(t / n));
          // Wet ground straight on from a bank: would a bridge do, and if not, why not?
          if (ground[t] === Ground.Water && i > 0 && ground[line[i - 1]] !== Ground.Water && !reason) {
            const d = t - line[i - 1];
            const dir = d === -n ? 1 : d === -1 ? 2 : d === 1 ? 3 : 4;
            const span = bridgeSpan(map, s, line[i - 1], dir);
            if (span.reason) r = span.reason;
            else if (span.end >= 0) r = 'Drag the road straight across the river, from bank to bank, to bridge it';
          }
          if (r && r !== 'Already a road') {
            marks.set(t, MARK_BAD);
            reason ||= r;
          } else marks.set(t, MARK_OK);
        }
        if (reason === 'Too wet: water or the river bank') reason = `Too wet · roads cross the river by a bridge: drag straight across where it is ${BRIDGE_MAX} tiles wide or less`;
        this.setMarks(marks);
        this.tip.show(from === this.hover ? reason : `No way through · ${reason || 'Blocked'}`, sx, sy, true);
        return;
      }
      const fresh = route.filter((t) => s.tiles[t] !== TILE_ROAD);
      // What it costs, tile by tile: a bridge is paid for whole, or not laid at all.
      const wet = mapIndex(map).ground;
      const lay: number[] = [];
      let money = s.money;
      let total = 0;
      let bridge = 0;
      let short = false;
      for (let i = 0; i < fresh.length; i++) {
        if (wet[fresh[i]] === Ground.Water) {
          let j = i;
          while (j < fresh.length && wet[fresh[j]] === Ground.Water) j++;
          const run = fresh.slice(i, j);
          const cost = run.length * BRIDGE_COST;
          total += cost;
          bridge += run.length;
          if (!short && money >= cost) {
            money -= cost;
            lay.push(...run);
          } else short = true;
          i = j - 1;
          continue;
        }
        total += ROAD_COST;
        if (!short && money >= ROAD_COST) {
          money -= ROAD_COST;
          lay.push(fresh[i]);
        } else short = true;
      }
      const laid = new Set(lay);
      for (const t of fresh) marks.set(t, laid.has(t) ? MARK_OK : MARK_BAD);
      this.setMarks(marks);
      if (fresh.length === 0) {
        this.tip.show('Already a road', sx, sy);
        return;
      }
      const span = bridge ? ` · a bridge of ${bridge} ${bridge === 1 ? 'tile' : 'tiles'} (${BRIDGE_COST} dr a tile)` : '';
      if (lay.length < fresh.length) this.tip.show(`Not enough drachmas: ${fmt(total)} dr for ${fresh.length} tiles${span}`, sx, sy, true);
      else this.tip.show(`Road · ${fresh.length} ${fresh.length === 1 ? 'tile' : 'tiles'}${span} · ${fmt(total)} dr`, sx, sy);
      if (lay.length) this.pending = () => this.send({ type: 'road', tiles: lay });
      return;
    }
    if (isPlacer(this.tool)) {
      this.placeOne(this.tool, sx, sy, marks);
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
      this.setMarks(marks);
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
    const bridges = new Set<number>();
    const homes = new Set<number>();
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const t = z * n + x;
        const on = s.tiles[t];
        if (on === TILE_ROAD) {
          if (isBridge(map, s, t)) {
            // Any tile of a bridge takes the whole bridge.
            const whole = bridgeAt(map, s, t);
            bridges.add(whole[0]);
            for (const u of whole) marks.set(u, MARK_CLEAR);
          } else roads++;
        } else if (on > 0) homes.add(on);
        else if ((treesOn.get(t) ?? []).some((i) => !cleared.has(i))) trees++;
        else {
          if (!marks.has(t)) marks.set(t, MARK_OK);
          continue;
        }
        marks.set(t, MARK_CLEAR);
      }
    }
    let people = 0;
    const kinds = new Map<BuildingKind, number>();
    for (const id of homes) {
      const b = findBuilding(s, id);
      if (!b) continue;
      people += b.people;
      kinds.set(b.kind, (kinds.get(b.kind) ?? 0) + 1);
      const side = sideOf(b.kind);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) marks.set((b.z + dz) * n + b.x + dx, MARK_CLEAR);
    }
    this.setMarks(marks);
    const bits: string[] = [];
    if (roads) bits.push(`${roads} road ${roads === 1 ? 'tile' : 'tiles'}`);
    if (bridges.size) bits.push(bridges.size === 1 ? 'a bridge' : `${bridges.size} bridges`);
    const KIND_WORDS: Record<BuildingKind, [string, string]> = {
      home: ['home', 'homes'],
      fountain: ['fountain', 'fountains'],
      farm: ['farm', 'farms'],
      granary: ['granary', 'granaries'],
      agora: ['agora', 'agoras'],
    };
    for (const [k, c] of kinds) bits.push(`${c} ${KIND_WORDS[k][c === 1 ? 0 : 1]}`);
    if (trees) bits.push(`trees on ${trees} ${trees === 1 ? 'tile' : 'tiles'}`);
    if (bits.length === 0) {
      this.tip.show('Nothing to clear', sx, sy);
      return;
    }
    let text = `Clear ${bits.join(', ')}`;
    if (people) text += ` · ${people === 1 ? '1 person leaves' : `${people} people leave`}`;
    const stock = [...homes].map((id) => findBuilding(s, id)).filter((b) => b && b.kind !== 'home' && b.stock > 0);
    if (stock.length) text += ' · the grain in it is lost';
    this.tip.show(text, sx, sy, people > 0 || stock.length > 0);
    this.pending = () => this.send({ type: 'clear', x0, z0, x1, z1 });
  }

  /** Placing one fountain, farm, granary or agora: where it would go, what it costs, and what it would do there. */
  private placeOne(kind: Placer, sx: number, sy: number, marks: Map<number, number>): void {
    const s = this.sim.state;
    const map = this.sim.map;
    const n = map.size;
    this.overlay?.setPreview(null);
    const side = sideOf(kind);
    const at = this.plotAt(side);
    const x = at % n;
    const z = Math.floor(at / n);
    const cost = COST[kind];
    const r = buildingRefusal(map, s, kind, x, z) || (s.money < cost ? 'Not enough drachmas' : '');
    for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) if (x + dx < n && z + dz < n) marks.set((z + dz) * n + x + dx, r ? MARK_BAD : MARK_OK);
    this.setMarks(marks);
    if (r) {
      const fert = kind === 'farm' ? ` (here ${Math.round(fertilityOf(map, x, z, side) * 100)}%, it needs ${Math.round(FARM_FERTILE_MIN * 100)}%)` : '';
      this.tip.show(r + (r.startsWith('Not fertile') ? fert : ''), sx, sy, true);
      return;
    }
    const roads = (side === PLOT_SIZE ? plotNeighbours(n, x, z) : beside(n, x, z, side)).filter((t) => s.tiles[t] === TILE_ROAD);
    const name = kind === 'fountain' ? 'Fountain' : BUILDING_NAMES[kind].replace(/^(A|The) /, '').replace(/^./, (c) => c.toUpperCase());
    let text = `${name} · ${fmt(cost)} dr · ${JOBS[kind]} workers`;
    const lines: string[] = [];
    if (kind === 'fountain' || kind === 'agora') {
      const service = kind === 'fountain' ? 'water' : 'food';
      const walker = kind === 'fountain' ? 'water carrier' : 'food vendor';
      const range = kind === 'fountain' ? CARRIER_RANGE : VENDOR_RANGE;
      if (roads.length === 0) lines.push(`Needs a road beside it, for the ${walker} to walk`);
      else {
        this.overlay?.setPreview(roads);
        const key = `${kind}:${at}:${s.tilesRev}:${s.rev}`;
        if (key !== this.reachKey) {
          this.reachKey = key;
          this.reach = previewReach(s, n, roads, service);
        }
        const { homes, dry } = this.reach;
        const what = kind === 'fountain' ? 'water' : 'food';
        if (homes === 0) lines.push(kind === 'fountain' ? `No homes within ${range} steps along the road yet` : `No huts within ${range} steps along the road yet (tents live off the land)`);
        else lines.push(`Its ${walker} would reach ${homes} ${homes === 1 ? 'home' : 'homes'}${dry ? ` · ${dry} without ${what} now` : ''}`);
      }
      if (kind === 'agora' && !s.buildings.some((b) => b.kind === 'granary')) lines.push('Its porter fetches grain from a granary: build one too');
    } else if (kind === 'farm') {
      const fert = fertilityOf(map, x, z, side);
      const months = GROW / TICKS_PER_MONTH;
      text += ` · fertile ground ${Math.round(fert * 100)}%`;
      lines.push(`About ${fmt(Math.round(HARVEST * fert))} measures of wheat every ${months} months, fully worked`);
      if (roads.length === 0) lines.push('Needs a road beside it, for its workers and its carts');
      else if (!s.buildings.some((b) => b.kind === 'granary')) lines.push('Its ox carts take the harvest to a granary: build one too');
    } else {
      lines.push(`Stores ${fmt(GRANARY_CAP)} measures: farms’ carts bring their wheat, the agora’s porter fetches it`);
      if (roads.length === 0) lines.push('Needs a road beside it, for carts and porters to reach it');
    }
    this.tip.show([text, ...lines].join('\n'), sx, sy);
    this.pending = () => this.send(kind === 'fountain' ? { type: 'fountain', at: [at] } : { type: 'build', kind, at: [at] });
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

