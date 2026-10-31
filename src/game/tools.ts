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
  clearFee,
  COST,
  DAIRY_GRASS_MIN,
  FARM_FERTILE_MIN,
  fertilityOf,
  grassOf,
  Ground,
  GROVE_OLIVE_MIN,
  oliveOf,
  PASTURE_GRASS_MIN,
  tileOlive,
  tileVine,
  VINE_MIN,
  vineOf,
  copperOf,
  MINE_COPPER_MIN,
  tileCopper,
  isBridge,
  mapIndex,
  PLOT_COST,
  PLOT_SIZE,
  plotNeighbours,
  plotRefusal,
  ROAD_COST,
  roadRefusal,
  tileGrass,
} from '../sim/build';
import { GATE_COST, TOWER_RANGE, WALL_COST, wallAt, wallJob } from '../sim/walls';
import { BUILD_TICKS, CREW, PER_YARD, ROWER_PAY, rowersWarning, TRIREME_COST } from '../sim/fleet';
import { beside, BUILDING_NAMES, findBuilding, footSide, JOBS, sideOf, STALL_JOBS } from '../sim/buildings';
import { FLEECE, held, OIL, WARE_NAMES, WARES, WHEAT, WINE, type Ware } from '../sim/foods';
import { stallPrice, stallRefusal } from '../sim/goods';
import { FLEECE_MONTH, GRAPE_HARVEST, OIL_MONTH, OLIVE_GROW, OLIVE_HARVEST, VINE_GROW, WINE_MONTH } from '../sim/production';
import { PRESS_OLIVES, STOREHOUSE_ARMOUR, STOREHOUSE_COPPER, STOREHOUSE_FLEECE, STOREHOUSE_HORSES, STOREHOUSE_MARBLE, STOREHOUSE_OIL, STOREHOUSE_TIMBER, STOREHOUSE_WINE, WINERY_GRAPES } from '../sim/stores';
import { armsLines } from './armstips';
import { worksHeadline, worksLines } from './workstips';
import { marbleOf, QUARRY_MARBLE_MIN, tileMarble } from '../sim/materials';
import { CHEESE_BATCH, CHEESE_EVERY, GRANARY_CAP, GRANARY_ROOM, GROW, HARVEST, VENDOR_RANGE } from '../sim/food';
import { HUNT_RANGE, lodgeOutlook } from '../sim/hunt';
import { herdName, MIN_HEAD } from '../sim/wild';
import { nearestReached, roadRoute, roadSearch } from '../sim/roads';
import { roadsBeside } from '../sim/rounds';
import { DOCKER_SPEED } from '../sim/walk';
import { HANDLE } from '../sim/food';
import type { Sim } from '../sim/sim';
import { TILE_ROAD, type Building, type BuildingKind } from '../sim/state';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../sim/clock';
import { CARRIER_RANGE } from '../sim/water';
import { ACTOR_RANGE, PRIESTESS_RANGE } from '../sim/culture';
import { COLLECTOR_RANGE, taxOf } from '../sim/taxes';
import { hasTaxOffice, owedWages, priceOf, reserve, spendable } from '../sim/treasury';
import { hazardReach, previewReach, type ServiceOverlay } from '../render/overlay';
import { INSPECT_RANGE, WATCH_RANGE } from '../sim/hazards';
import { placeName } from '../sim/status';
import { berthAt, FIRST_SHIP, PRICES, quayTiles, TRADE_GOODS } from '../sim/trade';
import { MARK_BAD, MARK_CLEAR, MARK_OK, MARK_WARN, type Placement } from '../render/placement';
// Slice 36.
import { ESTATE_PLOT_COST, ESTATE_SIZE, estateRefusal, HORSE_GRASS_MIN } from '../sim/build';
import { ESTATE, GREAT_ESTATE, HOME_CAPACITY, VILLA } from '../sim/buildings';
import { HORSE_BATCH, HORSE_EVERY } from '../sim/production';
import { TICKS_PER_YEAR } from '../sim/clock';
// Slice 41 (review).
import { denReachWords } from '../sim/gangs';
// Slice 45.
import { placeLines as justicePlaceLines } from '../sim/justice';
// Slice 49.
import { placeLines as healthPlaceLines } from '../sim/health';
// Slice 54: the sanctuary, to a god chosen first.
import { GODS, type GodId } from '../sim/pantheon';
import { PRIEST_RANGE, sanctuaryName, sanctuaryRefusal } from '../sim/sanctuaries';
import { needOf, sanctuaryStages, siteMaterials, type Site } from '../sim/monuments';
import { materialName } from '../sim/monumentstatus';
const capacityOf = (level: number): number => HOME_CAPACITY[level];

export type ToolName =
  | 'road'
  | 'housing'
  | 'fountain'
  | 'farm'
  | 'lodge'
  | 'dairy'
  | 'grove'
  | 'press'
  | 'pasture'
  | 'vineyard'
  | 'winery'
  | 'granary'
  | 'storehouse'
  | 'agora'
  | 'stall'
  | 'fleecestall'
  | 'winestall'
  | 'shrine'
  | 'theatre'
  | 'taxoffice'
  | 'watchpost'
  | 'architect'
  | 'trading'
  | 'yard'
  | 'mine'
  | 'armoury'
  | 'barracks'
  | 'wall'
  | 'tower'
  | 'shipyard'
  | 'clear'
  // Slice 32.
  | 'quarry'
  | 'loggers'
  // Slice 35.
  | 'masons'
  | 'lighthouse'
  | 'colossus'
  | 'stadium'
  // Slice 36.
  | 'horsefarm'
  | 'estate'
  // Slice 45.
  | 'court'
  | 'prison'
  // Slice 49.
  | 'infirmary'
  | 'asklepieion'
  // Slice 54.
  | 'sanctuary';
export const TOOLS: readonly ToolName[] = [
  'road',
  'housing',
  'fountain',
  'farm',
  'lodge',
  'dairy',
  'grove',
  'press',
  'pasture',
  'vineyard',
  'winery',
  'granary',
  'storehouse',
  'agora',
  'stall',
  'fleecestall',
  'winestall',
  'shrine',
  'theatre',
  'taxoffice',
  'watchpost',
  'architect',
  'trading',
  'yard',
  'mine',
  'armoury',
  'barracks',
  'wall',
  'tower',
  'shipyard',
  'clear',
  // Slice 32.
  'quarry',
  'loggers',
  // Slice 35.
  'masons',
  'lighthouse',
  'colossus',
  'stadium',
  // Slice 36.
  'horsefarm',
  'estate',
  // Slice 45.
  'court',
  'prison',
  // Slice 49.
  'infirmary',
  'asklepieion',
  // Slice 54.
  'sanctuary',
];

/** The tools that add a stall to an agora, and each one's good (`stall` is the oil stall's, as it always was). */
export const STALL_TOOLS: Partial<Record<ToolName, Ware>> = { stall: OIL, fleecestall: FLEECE, winestall: WINE };
/** The stall tool for a good. */
export const stallTool = (w: Ware): ToolName => (w === FLEECE ? 'fleecestall' : w === WINE ? 'winestall' : 'stall');
const isStallTool = (t: ToolName | null): boolean => t !== null && STALL_TOOLS[t] !== undefined;

/** The tools that place one building where you click. */
type Placer = 'fountain' | 'farm' | 'lodge' | 'dairy' | 'grove' | 'press' | 'pasture' | 'vineyard' | 'winery' | 'granary' | 'storehouse' | 'agora' | 'shrine' | 'theatre' | 'taxoffice' | 'watchpost' | 'architect' | 'trading' | 'yard' | 'mine' | 'armoury' | 'barracks' | 'tower' | 'shipyard' | 'quarry' | 'loggers' | 'masons' | 'lighthouse' | 'colossus' | 'stadium' | 'horsefarm' | 'court' | 'prison' | 'infirmary' | 'asklepieion' | 'sanctuary';
const isPlacer = (t: ToolName | null): t is Placer => t !== null && t !== 'road' && t !== 'housing' && t !== 'clear' && t !== 'wall' && t !== 'estate' && !isStallTool(t);
/** Slice 36: tools that put down a footprint where you click (a building, plots, an estate's plot). */
const isFooted = (t: ToolName | null): boolean => t === 'housing' || t === 'estate' || isPlacer(t);

export interface ToolTip {
  /** Show text near the pointer (screen px), or hide with null; `warn` is a caution shown last, in amber. */
  show(text: string | null, x?: number, y?: number, bad?: boolean, warn?: string): void;
}

const fmt = (n: number): string => n.toLocaleString('en-GB');

/** What each service building's walker brings, how far she goes, and to which homes. */
const WALKS = {
  fountain: { service: 'water', walker: 'water carrier', range: CARRIER_RANGE, what: 'water', none: 'homes', note: '' },
  agora: { service: 'food', walker: 'food vendor', range: VENDOR_RANGE, what: 'food', none: 'huts', note: ' (tents live off the land)' },
  shrine: { service: 'religion', walker: 'priestess', range: PRIESTESS_RANGE, what: 'blessings', none: 'cottages', note: ' (cottages and better want her blessing)' },
  theatre: { service: 'culture', walker: 'actor', range: ACTOR_RANGE, what: 'plays', none: 'townhouses', note: ' (townhouses and better want plays)' },
  taxoffice: { service: 'tax', walker: 'tax collector', range: COLLECTOR_RANGE, what: 'taxes', none: 'lived-in homes', note: '' },
} as const;

/** What each stall does, and the chain that fills it, in the tool's tip. */
const STALL_WORDS: Partial<Record<Ware, { name: string; does: string; chain: string }>> = {
  [OIL]: { name: 'oil stall', does: 'Its porter fetches jars of oil from a storehouse; its oil vendor sells to cottages and better nearby: a townhouse needs oil', chain: 'Groves, an olive press and a storehouse (M, G) make it.' },
  [FLEECE]: { name: 'fleece stall', does: 'Its porter fetches bales of fleece from a storehouse; its fleece vendor sells to townhouses and better nearby: a fine house needs fleece', chain: 'A sheep pasture and a storehouse (M, G) make it.' },
  [WINE]: { name: 'wine stall', does: 'Its porter fetches amphorae of wine from a storehouse; its wine vendor sells to fine houses and better nearby: a villa needs wine', chain: 'Vineyards, a winery and a storehouse (M, G) make it.' },
};

/** Why a build that the drachmas would cover is refused: wages owed are paid first, and the treasury keeps back the price of a tax office while there is none. */
function keptBack(s: Parameters<typeof reserve>[0]): string {
  const owed = owedWages(s).owed;
  if (owed > 0) return `Not enough drachmas · the ${fmt(owed)} dr of wages owed are paid first`;
  return `Not enough drachmas · ${fmt(reserve(s))} dr is kept back for a tax office (Z): build that first`;
}

export class Tools {
  tool: ToolName | null = null;
  /** Slice 54: the god the sanctuary tool places a sanctuary to (chosen on the chooser first). */
  god: GodId | null = null;
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
  private tripsKey = '';
  private trips = '';

  /**
   * How far the trading post's dockers would walk from here to the nearest
   * granary and storehouse, as a round trip in days: the nearer the stores,
   * the faster the quay fills (worked out once per spot and town).
   */
  private dockerTrips(at: number, roads: number[]): string {
    const s = this.sim.state;
    const n = this.sim.map.size;
    const key = `${at}:${s.tilesRev}:${s.rev}`;
    if (key === this.tripsKey) return this.trips;
    this.tripsKey = key;
    const search = roadSearch(s, n, roads);
    const days = (kind: BuildingKind): number => {
      let best = Infinity;
      for (const g of s.buildings) {
        if (g.kind !== kind) continue;
        const t = nearestReached(search, roadsBeside(s, n, g));
        if (t >= 0) best = Math.min(best, search.dist[t]);
      }
      // There and back at a docker's pace, and loading at the store.
      return best === Infinity ? -1 : Math.max(1, Math.round((2 * best) / DOCKER_SPEED / TICKS_PER_DAY + HANDLE / TICKS_PER_DAY));
    };
    const words = (kind: BuildingKind, d: number): string => (d < 0 ? `no ${kind} is reached by road` : `the nearest ${kind} is a ${d}-day round trip`);
    const kinds = (['granary', 'storehouse'] as const).filter((k) => s.buildings.some((b) => b.kind === k));
    const parts = kinds.map((k) => words(k, days(k)));
    this.trips = `For its dockers ${parts.join(', ')}: the nearer the stores, the faster the quay fills`;
    return this.trips;
  }
  private reach = { homes: 0, dry: 0 };
  /** The same for a watch post or an architect's office, with the smoulders (creaks) it would reach. */
  private hazardKey = '';
  private hazard: ReturnType<typeof hazardReach> = { homes: 0, dry: 0, alarms: 0, first: null };
  /** Slice 41 (review): the same for a watch post and the gangs' dens it would reach. */
  private denKey = '';
  private den: ReturnType<typeof denReachWords> = { line: '', warn: '' };
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

  /** Slice 54: put the sanctuary tool in hand for a god (the chooser's card). */
  chooseGod(god: GodId): void {
    this.god = god;
    if (this.tool === 'sanctuary') this.preview();
    else this.select('sanctuary');
  }

  select(t: ToolName | null): void {
    if (t === this.tool) t = null;
    this.tool = t;
    this.anchor = -1;
    const map = this.sim.map;
    const ix = mapIndex(map);
    this.placement.show(t !== null, t === 'road', t === 'mine', t === 'quarry');
    if (t) {
      const quay = t === 'trading' || t === 'shipyard' || t === 'colossus' ? quayTiles(map) : new Uint8Array(0);
      this.placement.setBlocked((i) => {
        if (map.tileWater[i] !== WATER_NONE) return false;
        const g = ix.ground[i];
        if (t === 'road') return g === Ground.Steep || g === Ground.Water;
        // Walls stand on dry ground, steep or not (not on cliffs or in the water).
        if (t === 'wall') return g !== Ground.Ok && g !== Ground.SteepForHome;
        if (t === 'tower') return g !== Ground.Ok && g !== Ground.SteepForHome;
        // A farm also needs fertile ground: the rest is washed rust near the pointer.
        if (t === 'farm') return g !== Ground.Ok || map.tileFertility[i] < FARM_FERTILE_MIN;
        // A dairy needs grass for its goats: rock and sand are washed rust.
        if (t === 'dairy') return g !== Ground.Ok || tileGrass(map, i) < DAIRY_GRASS_MIN;
        // A grove needs dry slopes: the river land, rock and sand are washed rust (slopes too steep for a house will do).
        if (t === 'grove') return (g !== Ground.Ok && g !== Ground.SteepForHome) || tileOlive(map, i) < GROVE_OLIVE_MIN;
        // A horse farm needs grass for its horses (slice 36).
        if (t === 'horsefarm') return g !== Ground.Ok || tileGrass(map, i) < HORSE_GRASS_MIN;
        // A pasture needs grass for its sheep.
        if (t === 'pasture') return g !== Ground.Ok || tileGrass(map, i) < PASTURE_GRASS_MIN;
        // A vineyard needs dry ground in the sun: the river land, rock, sand and slopes turned away from the sun are washed rust.
        if (t === 'vineyard') return (g !== Ground.Ok && g !== Ground.SteepForHome) || tileVine(map, i) < VINE_MIN;
        // A copper mine needs copper in the rock: the rest is washed rust (the copper itself shows green: see Placement).
        if (t === 'mine') return (g !== Ground.Ok && g !== Ground.SteepForHome) || tileCopper(map, i) < MINE_COPPER_MIN * 0.5;
        // A quarry needs marble in the rock (it shows pale: see Placement), and takes a slope as a mine does.
        if (t === 'quarry') return (g !== Ground.Ok && g !== Ground.SteepForHome) || tileMarble(map, i) < QUARRY_MARBLE_MIN * 0.5;
        // The trading post goes on the bay shore where the ship can come alongside: the rest is washed rust.
        if (t === 'trading' || t === 'shipyard' || t === 'colossus') return g !== Ground.Ok || quay[i] === 0;
        // Slice 35: the Lighthouse takes a slope, as a quarry does (on the headland: its tip says where).
        if (t === 'lighthouse') return g !== Ground.Ok && g !== Ground.SteepForHome;
        // Slice 46's review: on a dry land a fountain needs water under the ground: the dry ground is washed rust (elsewhere it goes anywhere).
        if (t === 'fountain' && map.groundwater) return g !== Ground.Ok || map.groundwater[i] === 0;
        // A stall goes on an agora: nothing is washed.
        if (isStallTool(t)) return false;
        if (isFooted(t)) return g !== Ground.Ok;
        return false;
      });
    }
    // Placing a fountain shows the water overlay, and what the new one would reach; an agora, the food overlay; a farm or granary, the food overlay too (where the chain runs); a shrine, theatre or tax office, its own.
    if (this.overlay) {
      this.overlay.forced =
        t === 'fountain'
          ? 'water'
          : t === 'agora' || t === 'farm' || t === 'granary' || t === 'lodge' || t === 'dairy'
            ? 'food'
            : t === 'grove' || t === 'press' || t === 'storehouse' || t === 'stall'
              ? 'oil'
              : t === 'pasture' || t === 'fleecestall' || t === 'horsefarm'
                ? 'fleece'
                : t === 'vineyard' || t === 'winery' || t === 'winestall'
                  ? 'wine'
                  : t === 'shrine'
                ? 'religion'
                : t === 'theatre'
                  ? 'culture'
                  : t === 'taxoffice'
                    ? 'tax'
                    : t === 'watchpost'
                      ? 'fire'
                      : t === 'architect'
                        ? 'wear'
                        : null;
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
    if (world) this.placement.setCursor(world.x, world.z, isFooted(this.tool) ? 11 : 9);
    this.preview();
  }

  down(): void {
    if (!this.tool || this.hover < 0) return;
    this.anchor = isFooted(this.tool) ? this.plotAt(this.side()) : this.hover;
    this.preview();
  }

  /** Told each time the player builds, clears or undoes something (the command), or a press builds nothing (null). */
  onAct: ((c: Parameters<Sim['enqueue']>[0] | null) => void) | null = null;

  up(): void {
    // Only a press that began here (not one let go of with Esc) builds.
    if (!this.tool || this.anchor < 0) return;
    this.preview();
    if (this.pending) this.pending();
    else this.onAct?.(null);
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

  /**
   * Re-draw the preview if the city changed under it. With no tool there is
   * no preview, and the tip is the hover's: a city that changes all the time
   * (a home going up, a family moving in) hid it every few frames.
   */
  frame(): void {
    if (this.tool && this.sim.state.rev !== this.lastRev) this.preview();
  }

  /** How many times a road route has been worked out (for the smoke test: it shouldn't follow settlers arriving). */
  routesFound = 0;

  private send(c: Parameters<Sim['enqueue']>[0]): void {
    const s = this.sim.state;
    const before = s.rev;
    this.sim.enqueue(c);
    // Build at once, even while paused (it is what the next tick would do first).
    this.sim.flush();
    this.onAct?.(s.rev !== before ? c : null);
  }

  private setMarks(marks: Map<number, number>): void {
    this.lastMarks = marks;
    this.placement.setMarks(marks);
  }

  /** The footprint side of what the tool places. */
  private side(): number {
    return this.tool === 'estate' ? ESTATE_SIZE : isPlacer(this.tool) ? sideOf(this.tool) : PLOT_SIZE;
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
      let money = spendable(s);
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
      const kept = s.money >= total && spendable(s) < total ? ` · ${keptBack(s).replace(/^Not enough drachmas · /, '')}` : '';
      if (lay.length < fresh.length) this.tip.show(`Not enough drachmas: ${fmt(total)} dr for ${fresh.length} tiles${span}${kept}`, sx, sy, true);
      else this.tip.show(`Road · ${fresh.length} ${fresh.length === 1 ? 'tile' : 'tiles'}${span} · ${fmt(total)} dr`, sx, sy);
      if (lay.length) this.pending = () => this.send({ type: 'road', tiles: lay });
      return;
    }
    if (this.tool === 'wall') {
      this.drawWall(sx, sy, marks);
      return;
    }
    if (isPlacer(this.tool)) {
      this.placeOne(this.tool, sx, sy, marks);
      return;
    }
    if (this.tool === 'estate') {
      this.placeEstate(sx, sy, marks);
      return;
    }
    const good = this.tool ? STALL_TOOLS[this.tool] : undefined;
    if (good !== undefined) {
      this.placeStall(good, sx, sy, marks);
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
      let afford = Math.floor(spendable(s, 'home') / PLOT_COST);
      for (let z = fz; stepZ > 0 ? z <= ez : z >= ez; z += stepZ) {
        for (let x = fx; stepX > 0 ? x <= ex : x >= ex; x += stepX) {
          const r = plotRefusal(map, s, x, z);
          const good = r === '' && afford > 0;
          if (good) {
            afford--;
            ok.push(z * n + x);
            if (!plotNeighbours(n, x, z).some((t) => s.tiles[t] === TILE_ROAD)) roadless++;
          } else reason ||= r || (s.money >= PLOT_COST ? keptBack(s) : 'Not enough drachmas');
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
    let walls = 0;
    const bridges = new Set<number>();
    const homes = new Set<number>();
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const t = z * n + x;
        const on = s.tiles[t];
        // Walls, gates and breaches (slice 25) are cleared like roads.
        const piece = s.walls.length ? wallAt(s, t) : undefined;
        if (piece) {
          walls++;
          marks.set(t, MARK_CLEAR);
          if (on !== TILE_ROAD) continue;
        }
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
      const side = footSide(b);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) marks.set((b.z + dz) * n + b.x + dx, MARK_CLEAR);
    }
    this.setMarks(marks);
    const bits: string[] = [];
    if (roads) bits.push(`${roads} road ${roads === 1 ? 'tile' : 'tiles'}`);
    if (bridges.size) bits.push(bridges.size === 1 ? 'a bridge' : `${bridges.size} bridges`);
    if (walls) bits.push(`${walls} ${walls === 1 ? 'stretch' : 'stretches'} of wall`);
    const KIND_WORDS: Record<BuildingKind, [string, string]> = {
      home: ['home', 'homes'],
      fountain: ['fountain', 'fountains'],
      farm: ['farm', 'farms'],
      granary: ['granary', 'granaries'],
      agora: ['agora', 'agoras'],
      shrine: ['shrine', 'shrines'],
      theatre: ['theatre', 'theatres'],
      taxoffice: ['tax office', 'tax offices'],
      lodge: ['hunting lodge', 'hunting lodges'],
      dairy: ['dairy', 'dairies'],
      grove: ['olive grove', 'olive groves'],
      press: ['olive press', 'olive presses'],
      storehouse: ['storehouse', 'storehouses'],
      pasture: ['sheep pasture', 'sheep pastures'],
      vineyard: ['vineyard', 'vineyards'],
      winery: ['winery', 'wineries'],
      watchpost: ['watch post', 'watch posts'],
      architect: ['architect’s office', 'architects’ offices'],
      rubble: ['heap of rubble', 'heaps of rubble'],
      trading: ['trading post', 'trading posts'],
      yard: ['caravan yard', 'caravan yards'],
      mine: ['copper mine', 'copper mines'],
      armoury: ['armoury', 'armouries'],
      barracks: ['barracks', 'barracks'],
      tower: ['tower', 'towers'],
      shipyard: ['shipyard', 'shipyards'],
      quarry: ['marble quarry', 'marble quarries'],
      loggers: ['loggers’ camp', 'loggers’ camps'],
      masons: ['masons’ yard', 'masons’ yards'],
      lighthouse: ['lighthouse', 'lighthouses'],
      colossus: ['colossus', 'colossi'],
      stadium: ['stadium', 'stadiums'],
      horsefarm: ['horse farm', 'horse farms'],
      // Slice 45.
      court: ['court', 'courts'],
      prison: ['prison', 'prisons'],
      // Slice 49.
      infirmary: ['infirmary', 'infirmaries'],
      asklepieion: ['asklepieion', 'asklepieia'],
      // Slice 54.
      sanctuary: ['sanctuary', 'sanctuaries'],
    };
    for (const [k, c] of kinds) bits.push(`${c} ${KIND_WORDS[k][c === 1 ? 0 : 1]}`);
    // Rubble is carted away for a small fee.
    let fee = 0;
    for (const id of homes) {
      const b = findBuilding(s, id);
      if (b?.kind === 'rubble') fee += clearFee(footSide(b));
    }
    if (trees) bits.push(`trees on ${trees} ${trees === 1 ? 'tile' : 'tiles'}`);
    if (bits.length === 0) {
      this.tip.show('Nothing to clear', sx, sy);
      return;
    }
    let text = `Clear ${bits.join(', ')}`;
    if (fee > 0) text += ` · ${fmt(fee)} dr to cart the rubble away`;
    if (fee > 0 && spendable(s) < fee) {
      this.tip.show(`${text}\nNot enough drachmas to clear the rubble`, sx, sy, true);
      return;
    }
    if (people) text += ` · ${people === 1 ? '1 person leaves' : `${people} people leave`}`;
    // What the cleared workplaces and stores hold is lost with them: say what.
    const works = [...homes].map((id) => findBuilding(s, id)).filter((b): b is Building => !!b && b.kind !== 'home');
    const lost = WARES.filter((w) => works.some((b) => held(b, w) > 0)).map((w) => (w === WHEAT ? 'grain' : WARE_NAMES[w]));
    if (lost.length) text += ` · the ${lost.length > 1 ? `${lost.slice(0, -1).join(', ')} and ${lost[lost.length - 1]}` : lost[0]} in ${works.length > 1 ? 'them' : 'it'} ${lost.length > 1 ? 'are' : 'is'} lost`;
    this.tip.show(text, sx, sy, people > 0 || lost.length > 0);
    this.pending = () => this.send({ type: 'clear', x0, z0, x1, z1 });
  }

  /** Adding a stall for a good to the agora under the pointer: which agora, what it costs, and what it would do. */
  private placeStall(good: Ware, sx: number, sy: number, marks: Map<number, number>): void {
    const s = this.sim.state;
    const n = this.sim.map.size;
    const on = s.tiles[this.hover];
    const a = on > 0 ? findBuilding(s, on) : undefined;
    const cost = stallPrice(good);
    const r = stallRefusal(s, n, this.hover, good, spendable(s, 'agora'));
    const why = r === 'Not enough money' ? (s.money >= cost ? keptBack(s) : 'Not enough drachmas') : r;
    const words = STALL_WORDS[good]!;
    if (a) {
      const side = footSide(a);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) marks.set((a.z + dz) * n + a.x + dx, why ? MARK_BAD : MARK_OK);
    }
    this.setMarks(marks);
    const Name = words.name.replace(/^./, (c) => c.toUpperCase());
    if (why) {
      this.tip.show(a ? why : `${Name} · click an agora to add one`, sx, sy, !!a);
      return;
    }
    const lines = [words.does];
    let warn = '';
    if (!s.buildings.some((b) => b.kind === 'storehouse')) warn = `No storehouse yet: its porter would have nowhere to fetch ${WARE_NAMES[good]} from. ${words.chain}`;
    this.tip.show([`${Name} · ${fmt(cost)} dr · ${STALL_JOBS === 1 ? 'one more worker' : `${STALL_JOBS} more workers`} at the agora`, ...lines].join('\n'), sx, sy, false, warn);
    const at = this.hover;
    this.pending = () => this.send({ type: 'stall', at, good });
  }

  /** Placing one fountain, farm, granary, agora, shrine, theatre or tax office: where it would go, what it costs, and what it would do there. */
  /**
   * The wall tool (slice 25): an L from where the press began to the pointer,
   * like a road's straight drag. Each tile of open dry ground becomes a
   * stretch, each road tile a gate, each cracked or broken stretch is mended;
   * the rest is skipped (red, and the tip says why). The tip counts them and
   * what they cost; the sim lays as many as the treasury pays for, in order.
   */
  private drawWall(sx: number, sy: number, marks: Map<number, number>): void {
    const s = this.sim.state;
    const map = this.sim.map;
    const n = map.size;
    const from = this.anchor >= 0 ? this.anchor : this.hover;
    const line = straight(n, from, this.hover);
    let money = spendable(s);
    let total = 0;
    let stretches = 0;
    let gates = 0;
    let mends = 0;
    let gateMends = 0;
    let short = false;
    let why = '';
    const lay: number[] = [];
    for (const t of line) {
      const job = wallJob(map, s, t);
      if (job.what === 'none') {
        if (!/already$/.test(job.why)) {
          marks.set(t, MARK_BAD);
          why ||= job.why;
        }
        continue;
      }
      total += job.cost;
      if (job.what === 'wall') stretches++;
      else if (job.what === 'gate') gates++;
      else {
        mends++;
        if (wallAt(s, t)?.gate) gateMends++;
      }
      if (!short && money >= job.cost) {
        money -= job.cost;
        lay.push(t);
        marks.set(t, MARK_OK);
      } else {
        short = true;
        marks.set(t, MARK_BAD);
      }
    }
    this.setMarks(marks);
    const bits: string[] = [];
    // (Slice 25's review: "each" only where there are several.)
    if (stretches) bits.push(`${stretches === 1 ? 'a stretch' : `${stretches} stretches`} (${WALL_COST} dr${stretches === 1 ? '' : ' each'})`);
    if (gates) bits.push(`${gates === 1 ? 'a gate' : `${gates} gates`} where it crosses the road (${GATE_COST} dr${gates === 1 ? '' : ' each'})`);
    if (mends) bits.push(`${mends} mended`);
    if (bits.length === 0) {
      this.tip.show(why || (wallAt(s, this.hover) ? `${wallAt(s, this.hover)!.gate ? 'A gate' : 'A wall'} already, whole` : 'Nothing to build here'), sx, sy, !!why);
      return;
    }
    const lines = [`Wall · ${bits.join(', ')} · ${fmt(total)} dr`];
    lines.push(gates || gateMends ? 'Your people pass through gates; raiders must break them' : 'Nobody crosses a wall: carts and walkers go round, or through a gate where it crosses a road');
    if (from === this.hover && !this.dragging) lines.push('Drag to draw a line of wall');
    const warn = why ? `Skipped where it can’t stand: ${why}` : '';
    if (short) this.tip.show(`Not enough drachmas: ${fmt(total)} dr for all of it\n${lines.slice(1).join('\n')}`, sx, sy, true, warn);
    else this.tip.show(lines.join('\n'), sx, sy, false, warn);
    if (lay.length) this.pending = () => this.send({ type: 'wall', tiles: lay });
  }

  private placeOne(kind: Placer, sx: number, sy: number, marks: Map<number, number>): void {
    const s = this.sim.state;
    const map = this.sim.map;
    const n = map.size;
    this.overlay?.setPreview(null);
    const side = sideOf(kind);
    const at = this.plotAt(side);
    const x = at % n;
    const z = Math.floor(at / n);
    const cost = priceOf(s, kind);
    // (Slice 54: a sanctuary to the god chosen, one to a god.)
    const holy = kind === 'sanctuary' ? (this.god ? sanctuaryRefusal(s, this.god) : 'Choose a god first: the Sanctuary button on the Mythology tab') : '';
    const r = holy || buildingRefusal(map, s, kind, x, z) || (spendable(s, kind) >= cost ? '' : s.money >= cost ? keptBack(s) : 'Not enough drachmas');
    const roads = (side === PLOT_SIZE ? plotNeighbours(n, x, z) : beside(n, x, z, side)).filter((t) => s.tiles[t] === TILE_ROAD);
    // Allowed, but no use without a road beside it: amber, not red.
    const mk = r ? MARK_BAD : roads.length === 0 ? MARK_WARN : MARK_OK;
    for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) if (x + dx < n && z + dz < n) marks.set((z + dz) * n + x + dx, mk);
    this.setMarks(marks);
    if (r) {
      const fert = kind === 'farm' ? ` (here ${Math.round(fertilityOf(map, x, z, side) * 100)}%, it needs ${Math.round(FARM_FERTILE_MIN * 100)}%)` : '';
      const grass = kind === 'dairy' || kind === 'pasture' || kind === 'horsefarm' ? ` (here ${Math.round(grassOf(map, x, z, side) * 100)}%, it needs ${Math.round((kind === 'dairy' ? DAIRY_GRASS_MIN : kind === 'horsefarm' ? HORSE_GRASS_MIN : PASTURE_GRASS_MIN) * 100)}%)` : '';
      const olive = kind === 'grove' ? ` (olive ground here ${Math.round(oliveOf(map, x, z, side) * 100)}%, it needs ${Math.round(GROVE_OLIVE_MIN * 100)}%)` : '';
      const vine = kind === 'vineyard' ? ` (vine ground here ${Math.round(vineOf(map, x, z, side) * 100)}%, it needs ${Math.round(VINE_MIN * 100)}%)` : '';
      const copper = kind === 'mine' ? ` (copper here ${Math.round(copperOf(map, x, z, side) * 100)}%, it needs ${Math.round(MINE_COPPER_MIN * 100)}%)` : kind === 'quarry' ? ` (marble here ${Math.round(marbleOf(map, x, z, side) * 100)}%, it needs ${Math.round(QUARRY_MARBLE_MIN * 100)}%)` : '';
      this.tip.show(r + (r.startsWith('Not fertile') ? fert : r.startsWith('Too little grass') ? grass : r.startsWith('Poor ground for olives') ? olive : r.startsWith('Poor ground for vines') ? vine : r.startsWith('No copper') || r.startsWith('No marble') ? copper : ''), sx, sy, true);
      return;
    }
    const name = kind === 'fountain' ? 'Fountain' : BUILDING_NAMES[kind].replace(/^(An?|The) /, '').replace(/^./, (c) => c.toUpperCase());
    // (Review of slice 35: the monuments have no workers of their own, so no "0 workers".)
    let text = `${name} · ${fmt(cost)} dr${JOBS[kind] > 0 ? ` · ${JOBS[kind]} workers` : ''}`;
    const lines: string[] = [];
    let warn = '';
    if (kind === 'fountain' || kind === 'agora' || kind === 'shrine' || kind === 'theatre' || kind === 'taxoffice') {
      const { service, walker, range, what, none, note } = WALKS[kind];
      if (kind === 'taxoffice') {
        const per = taxOf(s.taxRate, 3);
        lines.push(hasTaxOffice(s) ? 'Another collector, for the homes the others don’t reach' : 'Its tax collector brings in what each household he calls on owes: without one, no taxes come in');
        if (cost < COST[kind]) lines.push(`${hasTaxOffice(s) ? 'While wages are owed' : 'With no tax office'}, one costs no more than the treasury holds: ${fmt(cost)} dr, not ${fmt(COST[kind])}`);
        lines.push(per > 0 ? `At this rate a cottage pays ${per} dr a month` : 'At this rate nobody pays: the collector still walks');
      }
      if (kind === 'shrine') lines.push('Its priestess blesses the homes she passes: a cottage with a month’s blessing in hand becomes a townhouse');
      if (kind === 'theatre') lines.push('Its actor brings the plays to the homes he passes: a townhouse with a month’s plays in hand becomes a fine house');
      if (roads.length === 0) warn = `No road beside it: its ${walker} would have nowhere to walk. Lay a road along one side first.`;
      else {
        this.overlay?.setPreview(roads);
        const key = `${kind}:${at}:${s.tilesRev}:${s.rev}`;
        if (key !== this.reachKey) {
          this.reachKey = key;
          this.reach = previewReach(s, n, roads, service);
        }
        const { homes, dry } = this.reach;
        if (homes === 0) lines.push(`No ${none} within ${range} steps along the road yet${note}`);
        else if (kind === 'taxoffice') lines.push(`Its ${walker} would reach ${homes} ${homes === 1 ? 'home' : 'homes'}${dry ? ` · ${dry} no collector has called on this month` : ''}`);
        else lines.push(`Its ${walker} would reach ${homes} ${homes === 1 ? 'home' : 'homes'}${dry ? ` · ${dry} without ${what} now` : ''}`);
      }
      if (kind === 'agora' && !s.buildings.some((b) => b.kind === 'granary')) lines.push('Its porter fetches grain from a granary: build one too');
    } else if (kind === 'watchpost' || kind === 'architect') {
      const fire = kind === 'watchpost';
      lines.push(
        fire
          ? `Its watchman walks the streets nearby: every building beside his way is made safe from fire, a smouldering one put out, and he runs to flames he can see${s.crime.on ? '. Homes he passes are less tempted to steal, and he catches any thief he sees' : ''}`
          : 'Its inspector walks the streets nearby: every building beside her way is made sound, a creaking one saved from falling in',
      );
      if (roads.length === 0) warn = `No road beside it: its ${fire ? 'watchman' : 'inspector'} would have nowhere to walk. Lay a road along one side first.`;
      else {
        this.overlay?.setPreview(roads);
        // (Again each day: smoulders and creaks come and go without the town changing.)
        const key = `${kind}:${at}:${s.tilesRev}:${s.rev}:${Math.floor(s.tick / TICKS_PER_DAY)}`;
        if (key !== this.hazardKey) {
          this.hazardKey = key;
          this.hazard = hazardReach(s, n, roads, fire ? 'fire' : 'wear');
        }
        const { homes, dry, alarms, first } = this.hazard;
        if (homes === 0) lines.push(`No buildings within ${fire ? WATCH_RANGE : INSPECT_RANGE} steps along the road yet`);
        else lines.push(`Its ${fire ? 'watchman' : 'inspector'} would reach ${homes} ${homes === 1 ? 'building' : 'buildings'}${dry ? ` · ${dry} ${fire ? 'at risk of fire' : 'worn'} past half now` : ''}`);
        // Whether it would reach the trouble there is now.
        const now = fire ? s.buildings.filter((b) => b.fire !== 0) : s.buildings.filter((b) => b.creakAt > 0);
        const doing = fire ? 'smouldering or burning' : 'creaking';
        if (alarms === 1 && first) lines.push(`It reaches ${placeName(first)}, which is ${fire ? (first.fire === 2 ? 'burning' : 'smouldering') : 'creaking'}`);
        else if (alarms > 1) lines.push(`It reaches ${alarms} of the ${now.length} buildings ${doing} now`);
        else if (now.length === 1) warn = `It doesn’t reach ${placeName(now[0])}, which is ${fire ? (now[0].fire === 2 ? 'burning' : 'smouldering') : 'creaking'}: try nearer to it`;
        else if (now.length > 1) warn = `It doesn’t reach any of the ${now.length} buildings ${doing} now: try nearer to them`;
        // Slice 41 (review): whether its round would reach a gang's den, and what that does (a fire's warning first).
        if (fire && s.crime.gangs.length) {
          if (key !== this.denKey) {
            this.denKey = key;
            this.den = denReachWords(s, n, roads);
          }
          if (this.den.line) lines.push(this.den.line);
          else if (this.den.warn && !warn) warn = this.den.warn;
        }
      }
    } else if (kind === 'farm') {
      const fert = fertilityOf(map, x, z, side);
      const months = GROW / TICKS_PER_MONTH;
      text += ` · fertile ground ${Math.round(fert * 100)}%`;
      lines.push(`About ${fmt(Math.round(HARVEST * fert))} measures of wheat every ${months} months, fully worked`);
      if (roads.length === 0) warn = 'No road beside it: its workers couldn’t get there and its carts couldn’t take the harvest away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'granary')) lines.push('Its ox carts take the harvest to a granary: build one too');
    } else if (kind === 'lodge') {
      const o = lodgeOutlook(s, x, z);
      if (o.game.length === 0) {
        const near = s.herds.map((h) => ({ h, d: Math.hypot(h.x - x - 1.5, h.z - z - 1.5) })).sort((a, b) => a.d - b.d)[0];
        warn = near ? `No game within reach: the nearest herd is ${herdName(near.h)}, ${Math.round(near.d)} tiles off; hunters go ${HUNT_RANGE} at most` : 'No game anywhere';
      } else {
        lines.push(`Game in reach: ${o.game.map((g) => `${herdName(g.h)} (${g.h.head} head, ${Math.round(g.d)} tiles)`).join(', ')}`);
        if (o.meat > 0) lines.push(`About ${fmt(Math.round(o.meat / 10) * 10)} measures of meat a month, fully worked${o.byGame ? `: as fast as the game grows back${o.shared ? `, shared with ${o.shared === 1 ? 'the lodge' : `the ${o.shared} lodges`} already after it` : ''}` : ''}`);
        else lines.push(`The herds in reach are down to their last ${MIN_HEAD}: nothing to hunt until they grow back`);
      }
      if (roads.length === 0) warn ||= 'No road beside it: its workers couldn’t get there and its carts couldn’t take the meat away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'granary')) lines.push('Its ox carts take the meat to a granary: build one too');
    } else if (kind === 'dairy') {
      const grass = grassOf(map, x, z, side);
      text += ` · grass ${Math.round(grass * 100)}%`;
      lines.push(`About ${fmt(Math.round(((CHEESE_BATCH * TICKS_PER_MONTH) / CHEESE_EVERY) * grass / 10) * 10)} measures of cheese a month, fully worked: the greener the pasture, the more`);
      if (roads.length === 0) warn = 'No road beside it: its workers couldn’t get there and its carts couldn’t take the cheese away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'granary')) lines.push('Its ox carts take the cheese to a granary: build one too');
    } else if (kind === 'grove') {
      const ground = oliveOf(map, x, z, side);
      const olives = Math.round(OLIVE_HARVEST * ground);
      text += ` · olive ground ${Math.round(ground * 100)}%`;
      lines.push(`About ${fmt(olives)} measures of olives every ${OLIVE_GROW / TICKS_PER_MONTH} months, fully worked: about ${fmt(Math.round(olives / (OLIVE_GROW / TICKS_PER_MONTH) / 10) * 10)} jars of oil a month once pressed`);
      if (roads.length === 0) warn = 'No road beside it: its workers couldn’t get there and its carts couldn’t take the olives away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'press')) lines.push('Its ox carts take the olives to an olive press: build one too (M again)');
    } else if (kind === 'press') {
      lines.push(`Presses up to ${fmt(OIL_MONTH)} jars of oil a month, fully worked, from as many measures of olives (it holds ${fmt(PRESS_OLIVES)} waiting)`);
      if (roads.length === 0) warn = 'No road beside it: carts couldn’t bring the olives or take the oil away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'grove')) lines.push('Its olives come from the olive groves’ carts: build a grove on the dry slopes');
      else if (!s.buildings.some((b) => b.kind === 'storehouse')) lines.push('Its ox carts take the oil to a storehouse: build one too (G twice)');
    } else if (kind === 'pasture') {
      const grass = grassOf(map, x, z, side);
      text += ` · grass ${Math.round(grass * 100)}%`;
      lines.push(`About ${fmt(Math.round((FLEECE_MONTH * grass) / 10) * 10)} bales of fleece a month, fully worked: the greener the grass, the more`);
      if (roads.length === 0) warn = 'No road beside it: its shepherds couldn’t get there and its carts couldn’t take the fleece away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'storehouse')) lines.push('Its ox carts take the fleece to a storehouse: build one too (G twice)');
    } else if (kind === 'horsefarm') {
      // Slice 36.
      const grass = grassOf(map, x, z, side);
      text += ` · grass ${Math.round(grass * 100)}%`;
      const year = Math.round((TICKS_PER_YEAR / HORSE_EVERY) * Math.max(1, Math.round(HORSE_BATCH * grass)));
      lines.push(`About ${fmt(year)} horses a year, fully worked: the mares foal in spring, so most come then; its grooms lead them to a storehouse`);
      lines.push('Horses are for the estates’ stables (and their sons ride them with the horsemen)');
      if (roads.length === 0) warn = 'No road beside it: its grooms couldn’t get there or lead the horses away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'storehouse')) lines.push('Its grooms lead the horses to a storehouse: build one too (G twice)');
    } else if (kind === 'vineyard') {
      const ground = vineOf(map, x, z, side);
      const grapes = Math.round(GRAPE_HARVEST * ground);
      text += ` · vine ground ${Math.round(ground * 100)}%`;
      lines.push(`About ${fmt(grapes)} measures of grapes every ${VINE_GROW / TICKS_PER_MONTH} months, fully worked: about ${fmt(Math.round(grapes / (VINE_GROW / TICKS_PER_MONTH) / 10) * 10)} amphorae of wine a month once trodden`);
      lines.push('Best on a slope facing the afternoon sun; flat ground gives about half');
      if (roads.length === 0) warn = 'No road beside it: its workers couldn’t get there and its carts couldn’t take the grapes away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'winery')) lines.push('Its ox carts take the grapes to a winery: build one too (M again)');
    } else if (kind === 'winery') {
      lines.push(`Makes up to ${fmt(WINE_MONTH)} amphorae of wine a month, fully worked, from as many measures of grapes (it holds ${fmt(WINERY_GRAPES)} waiting)`);
      if (roads.length === 0) warn = 'No road beside it: carts couldn’t bring the grapes or take the wine away. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'vineyard')) lines.push('Its grapes come from the vineyards’ carts: plant a vineyard on a sunny slope');
      else if (!s.buildings.some((b) => b.kind === 'storehouse')) lines.push('Its ox carts take the wine to a storehouse: build one too (G twice)');
    } else if (kind === 'trading') {
      const berth = berthAt(map, x, z);
      lines.push('Its dockers carry what the granaries and storehouses hold beyond what the city keeps to the quay; a merchant ship calls every three months and buys it');
      if (berth) lines.push(`A jetty runs ${Math.round(berth.len)} ${Math.round(berth.len) === 1 ? 'tile' : 'tiles'} out to deep water, where she ties up`);
      lines.push(`She pays for every 100: ${TRADE_GOODS.map((w, k) => `${WARE_NAMES[w]} ${fmt(PRICES[k])}`).join(', ')} dr · the first ship is due ${FIRST_SHIP / TICKS_PER_MONTH} months after it is built`);
      if (roads.length === 0) warn = 'No road beside it: its dockers couldn’t reach the stores. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'granary' || b.kind === 'storehouse')) lines.push('Its dockers fetch from the granaries and storehouses: the city has none yet');
      else lines.push(this.dockerTrips(at, roads));
    } else if (kind === 'yard') {
      lines.push('Its porters carry what the granaries and storehouses hold beyond what the city keeps to the yard, where caravans from Greece buy it and unload what you ordered');
      lines.push('Open a land route on the map of Greece (the Greece tab, or the Tab key) and a caravan comes every two months, walking in by road from the edge of the map: the nearer the edge road, the sooner it reaches the yard');
      if (roads.length === 0) warn = 'No road beside it: caravans couldn’t reach it and its porters couldn’t reach the stores. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'granary' || b.kind === 'storehouse')) lines.push('Its porters fetch from the granaries and storehouses: the city has none yet');
      else lines.push(this.dockerTrips(at, roads).replace('For its dockers', 'For its porters').replace('the quay fills', 'the yard fills'));
    } else if (kind === 'mine' || kind === 'armoury' || kind === 'barracks') {
      const more = armsLines(s, map, kind, x, z, side, roads.length > 0);
      if (kind === 'mine') text += ` · copper in the rock ${Math.round(copperOf(map, x, z, side) * 100)}%`;
      lines.push(...more.lines);
      warn = more.warn;
    } else if (kind === 'court' || kind === 'prison') {
      // Slice 45.
      const more = justicePlaceLines(s, kind, roads.length > 0);
      lines.push(...more.lines);
      warn = more.warn;
    } else if (kind === 'sanctuary' && this.god) {
      // Slice 54.
      const more = sanctuaryPlaceLines(s, this.god, roads.length > 0);
      text = `${sanctuaryName(this.god, true).replace(/^The s/, 'S')} · ${fmt(cost)} dr · ${JOBS.sanctuary} workers once finished`;
      lines.push(...more.lines);
      warn = more.warn;
    } else if (kind === 'infirmary' || kind === 'asklepieion') {
      // Slice 49.
      const more = healthPlaceLines(s, kind, roads.length > 0);
      lines.push(...more.lines);
      warn = more.warn;
    } else if (kind === 'quarry' || kind === 'loggers' || kind === 'masons' || kind === 'lighthouse' || kind === 'colossus' || kind === 'stadium') {
      // Slice 32; slice 35.
      const more = worksLines(s, map, kind, x, z, roads.length > 0);
      text += worksHeadline(s, map, kind, x, z);
      lines.push(...more.lines);
      warn = more.warn;
    } else if (kind === 'shipyard') {
      const berth = berthAt(map, x, z);
      lines.push(`Its ${JOBS.shipyard} shipwrights build triremes on its slip, one at a time (${TRIREME_COST} dr each, about ${Math.round(BUILD_TICKS / TICKS_PER_DAY)} days), and mend them at its jetty; it moors ${PER_YARD}`);
      lines.push(`A trireme needs ${CREW} rowers, a man from each of as many huts and cottages, paid ${ROWER_PAY} dr a month: she rows out to meet raiders’ ships in the bay, or guards a sea lane from pirates`);
      if (berth) lines.push(`A jetty runs ${Math.round(berth.len)} ${Math.round(berth.len) === 1 ? 'tile' : 'tiles'} out to deep water, where they moor`);
      if (roads.length === 0) warn = 'No road beside it: its shipwrights and rowers couldn’t reach it. Lay a road along one side first.';
      else warn = rowersWarning(s);
    } else if (kind === 'tower') {
      lines.push(`Its ${JOBS.tower} workers are its archers: from its top they shoot at raiders within ${TOWER_RANGE} tiles, over walls and roofs`);
      lines.push('It stands on the wall line: towers either side of a gate make raiders pay for breaking it');
      if (roads.length === 0) warn = 'No road beside it: no archers could reach it. Set it beside a road, by a gate.';
    } else if (kind === 'storehouse') {
      lines.push(`Stores ${fmt(STOREHOUSE_OIL)} jars of oil, ${fmt(STOREHOUSE_FLEECE)} bales of fleece, ${fmt(STOREHOUSE_WINE)} amphorae of wine, ${fmt(STOREHOUSE_COPPER)} measures of copper, ${fmt(STOREHOUSE_ARMOUR)} sets of armour, ${fmt(STOREHOUSE_MARBLE)} blocks of marble, ${fmt(STOREHOUSE_TIMBER)} logs and ${fmt(STOREHOUSE_HORSES)} horses: the makers’ carts bring them, and the agoras’ stall porters fetch them`);
      lines.push('Near the agora is best: each stall’s porter walks there and back for every load');
      if (roads.length === 0) warn = 'No road beside it: carts and porters couldn’t reach it. Lay a road along one side first.';
      else if (!s.buildings.some((b) => b.kind === 'agora' && b.stalls)) lines.push('An agora needs a stall to sell what it holds: K twice (oil), three times (fleece) or four (wine), then click an agora');
    } else {
      lines.push(`Stores ${fmt(GRANARY_CAP)} measures of wheat and ${fmt(GRANARY_ROOM[1])} each of meat and cheese: carts bring them, the agora’s porter fetches them`);
      if (roads.length === 0) warn = 'No road beside it: carts and porters couldn’t reach it. Lay a road along one side first.';
    }
    this.tip.show([text, ...lines].join('\n'), sx, sy, false, warn);
    // (Slice 54: a sanctuary is its own command, with its god.)
    const god = this.god;
    this.pending = () => {
      if (kind === 'sanctuary') {
        if (god) this.send({ type: 'sanctuary', god, at: [at] });
        return;
      }
      this.send(kind === 'fountain' ? { type: 'fountain', at: [at] } : { type: 'build', kind, at: [at] });
    };
  }

  /** Slice 36: an estate's plot, 4 x 4, where you click. */
  private placeEstate(sx: number, sy: number, marks: Map<number, number>): void {
    const s = this.sim.state;
    const map = this.sim.map;
    const n = map.size;
    this.overlay?.setPreview(null);
    const side = ESTATE_SIZE;
    const at = this.plotAt(side);
    const x = at % n;
    const z = Math.floor(at / n);
    const r = estateRefusal(map, s, x, z) || (spendable(s, 'home') >= ESTATE_PLOT_COST ? '' : s.money >= ESTATE_PLOT_COST ? keptBack(s) : 'Not enough drachmas');
    const roads = beside(n, x, z, side).filter((t) => s.tiles[t] === TILE_ROAD);
    const mk = r ? MARK_BAD : roads.length === 0 ? MARK_WARN : MARK_OK;
    for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) if (x + dx < n && z + dz < n) marks.set((z + dz) * n + x + dx, mk);
    this.setMarks(marks);
    if (r) {
      this.tip.show(r, sx, sy, true);
      return;
    }
    const text = `Estate · ${fmt(ESTATE_PLOT_COST)} dr for the plot · up to ${capacityOf(ESTATE)} people, ${capacityOf(GREAT_ESTATE)} as a great estate`;
    let warn = '';
    if (roads.length === 0) warn = 'No road beside it: the noble house comes in by road, and the walkers that serve it need one. Lay a road along one side first.';
    else if (!s.buildings.some((b) => b.kind === 'home' && !b.estate && b.level >= VILLA && b.people > 0)) warn = 'No villa in your city yet: no noble house will come until there is one.';
    this.tip.show([text, ESTATE_TIP].join('\n'), sx, sy, false, warn);
    this.pending = () => this.send({ type: 'estate', at: [at] });
  }
}

/** Slice 36: what an estate's plot is for, in the tip. */
const ESTATE_TIP = 'A noble house comes to it from the edge of your land once your city has a villa. It needs all a villa needs; with marble, armour and horses fetched from your storehouses it becomes a great estate. Its sons ride with the horsemen';

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

// Slice 54.

/** What placing a sanctuary to a god says: its stages and what each needs, its priests, what its god makes of it, and what it waits for in this city. */
function sanctuaryPlaceLines(s: Sim['state'], god: GodId, road: boolean): { lines: string[]; warn: string } {
  const g = GODS[god];
  const probe = { kind: 'sanctuary', god } as Site;
  // (Review of slice 54: a line to a stage, so the tip, which never wraps, stays narrow.)
  const stages = sanctuaryStages(god).map((st) => `  ${st.name}: ${siteMaterials(probe).filter((w) => needOf(st, w) > 0).map((w) => `${fmt(needOf(st, w))} ${materialName(w)}`).join(', ')}`);
  const lines = [
    'Three stages, hauled by the ox carts from the stores and raised by the masons’ builders:',
    ...stages,
    `${g.name} notices each stage; finished and staffed, it honours ${g.name} while it stands so`,
    `Its priests walk up to ${PRIEST_RANGE} tiles of road blessing homes (a shrine’s priestess goes ${PRIESTESS_RANGE})`,
  ];
  if (!s.buildings.some((b) => b.kind === 'masons')) lines.push('No masons’ yard yet: build one (the Monuments tab) to send its builders');
  if (!s.buildings.some((b) => b.kind === 'armoury')) lines.push('Its statue’s bronze is cast by an armoury’s smiths: the city has no armoury yet');
  return { lines, warn: road ? '' : 'No road beside it: the ox carts and builders couldn’t reach it, nor its priests the streets. Lay a road along one side first.' };
}
