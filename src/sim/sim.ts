import { coastMap, type CoastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
import { BRIDGE_COST, bridgeAt, bridgeSpan, buildingRefusal, clearFee, COST, Ground, isBridge, mapIndex, ROAD_COST, roadRefusal, STARTING_MONEY, stepOf } from './build';
import { around, centreOf, findBuilding, footprint, footSide, recountPopulation, sideOf } from './buildings';
import { BURNT, FALLEN, FIRST_INSPECTOR, FIRST_WATCHMAN, moveInspector, stepArchitects, stepHazards, stepWatchPosts, type Fall } from './hazards';
import { dateOfTick, TICKS_PER_DAY, TICKS_PER_MONTH, type SimDate } from './clock';
import { BUILD_KINDS, type Command, type StampedCommand } from './commands';
import { FIRST_ACTOR, FIRST_PRIESTESS, moveCulture, stepCulture } from './culture';
import { FIRST_VENDOR, moveErrand, moveVendor, stepAgoras } from './food';
import { addComing, FIRST_GOOD, gi, GRAPES, held, isGood, noGoods, OLIVES, setHeld, WARE_NAMES, WARES, type Ware } from './foods';
import { FIRST_STALL_VENDOR, hasStall, moveStallVendor, stallBit, stallPrice, stallRefusal, STALL_GOODS, STALL_NAMES, stallWalker, stepStalls, vendorGood } from './goods';
import { moveHunter } from './hunt';
import { stepMakers } from './production';
import { folkRng } from './folk';
import { migrate } from './migrate';
import { stepHouses } from './houses';
import { stepLabour } from './labour';
import { nextFloat, seedRng } from './rng';
import { moveGroup, sendLeavers, SETTLER_INTERVAL, spawnSettlers } from './settlers';
import { ROUND_KINDS, SIM_STATE_VERSION, TILE_EMPTY, TILE_ROAD, type Building, type BuildingKind, type Round, type ServiceRecord, type SimState, type UndoEntry } from './state';
import { freshBook, note, stepBook } from './stockbook';
import { FIRST_CARRIER, moveCarrier, stepFountains } from './water';
import { FAIR, FIRST_COLLECTOR, handIn, HARSH, moveCollector, stepHarsh, stepTaxOffices } from './taxes';
import { freshLedger, income, pay, priceOf, spendable, stepWages } from './treasury';
import { freshHerds, stepWild, wildRng } from './wild';
import { FIRST_DOCKER, freshTrade, KEEP_MAX, moveDocker, stepDockers, stepTrade, TRADE_GOODS, tradeIndex } from './trade';
import { moveCaravan, openRoute, setDeal, stepRoutes } from './routes';
import { freshWorld, nameRefusal, stepWorld } from './world';
import { stepGrowth } from './growth';
import { stepRivals } from './rivals';
import { sendGift, stepDiplomacy, stepGifts } from './diplomacy';
import { answer, stepFavours } from './favours';
import { loanCommand, stepLoans } from './loans';
import { bandsAt, moveRaider, sheltering, stepRaids } from './raids';
import { sendExpedition, stepExpeditions } from './expeditions';
import { barracksGone, dismiss, freshArmy, hire, raise, sendBanner, stepArmy } from './army';
import { stepBattle } from './battle';
import { fleetCommand, freshFleet, orderTrireme, stepErrands, stepFleet, yardGone } from './fleet';
import { dropWalls, fullOf, layWalls, restoreWalls, unlayWalls, wallAt } from './walls';
// Slice 30.
import { freshCrime, moveThief, moveWatch, stepCrime } from './crime';
import { freshMaterials, moveLogger, moveQuarryman, stepMaterials } from './materials';
// Slice 33.
import { freshSeasons } from './seasons';

export const DEFAULT_SEED = 0x2e05; // "Zeus"
/** How many build actions undo remembers. */
export const UNDO_DEPTH = 10;
/** How long after an action it can still be undone (a month; while paused, time stands still). */
export const UNDO_WINDOW = TICKS_PER_MONTH;

/**
 * A new game. Greece is shuffled from `worldSeed` (a new game on the bare link
 * gets its own; by default the city's seed), on its own random numbers.
 */
export function createState(seed: number = DEFAULT_SEED, mapId = 'coast', worldSeed: number = seed): SimState {
  const rng = seedRng(seed);
  const s: SimState = {
    version: SIM_STATE_VERSION,
    mapId,
    seed,
    tick: 0,
    rng,
    folk: folkRng(seed),
    wild: wildRng(seed),
    herds: [],
    commandsApplied: 0,
    wind: { angle: 3.6 + nextFloat(rng) * 0.4, strength: 0.5 + nextFloat(rng) * 0.2 },
    money: STARTING_MONEY,
    hazards: false,
    population: 0,
    tiles: new Array<number>(MAP_SIZE * MAP_SIZE).fill(TILE_EMPTY),
    rounds: freshRounds(),
    taxRate: FAIR,
    ledger: freshLedger(STARTING_MONEY, 0),
    buildings: [],
    walkers: [],
    nextId: 1,
    cleared: [],
    undo: [],
    settlerClock: SETTLER_INTERVAL,
    rev: 0,
    looks: 0,
    tilesRev: 0,
    arrived: 0,
    left: 0,
    trade: freshTrade(),
    taxGone: [],
    world: freshWorld(worldSeed),
    stocks: freshBook(0),
    army: freshArmy(),
    walls: [],
    fleet: freshFleet(),
    crime: freshCrime(),
    materials: freshMaterials(),
    season: freshSeasons(),
  };
  s.herds = freshHerds(mapFor(mapId), s);
  return s;
}

export function freshRecord(): ServiceRecord {
  return { walked: new Array<number>(MAP_SIZE * MAP_SIZE).fill(0), exits: new Array<number>(MAP_SIZE * MAP_SIZE).fill(0) };
}

/** A fresh record for every round (see ROUND_KINDS). */
export function freshRounds(): Record<Round, ServiceRecord> {
  const out = {} as Record<Round, ServiceRecord>;
  for (const r of ROUND_KINDS) out[r] = freshRecord();
  return out;
}

/** The baked map a state's city sits on. */
export function mapFor(mapId: string): CoastMap {
  if (mapId !== 'coast') throw new Error(`Unknown map "${mapId}"`);
  return coastMap();
}

/**
 * The deterministic simulation. It advances only when step() is called, and
 * reads nothing from outside except queued commands. The host decides how
 * many steps to run per frame (that is where pause and speed live).
 */
export class Sim {
  state: SimState;
  private queue: StampedCommand[] = [];
  private seq = 0;
  /** Every command applied so far, in order, for replay. */
  readonly log: StampedCommand[] = [];

  constructor(seed: number = DEFAULT_SEED, worldSeed: number = seed) {
    this.state = createState(seed, 'coast', worldSeed);
  }

  /** The baked map (not part of the state: it is the same for every game on this map). */
  get map(): CoastMap {
    return mapFor(this.state.mapId);
  }

  /** Queue a command to apply on the next tick. */
  enqueue(command: Command): StampedCommand {
    return this.enqueueAt(this.state.tick + 1, command);
  }

  /** Queue a command for a given future tick (used by replay). */
  enqueueAt(tick: number, command: Command): StampedCommand {
    if (tick <= this.state.tick) throw new Error(`Command for tick ${tick} is in the past (now ${this.state.tick})`);
    const stamped: StampedCommand = { tick, seq: this.seq++, command };
    this.queue.push(stamped);
    return stamped;
  }

  /**
   * Apply the commands due at the start of the next tick now, without
   * advancing time. It is exactly what step() does first, so the log and a
   * replay are unchanged; it lets you build while the clock is paused, and
   * shows the result at once while it runs.
   */
  flush(): void {
    if (this.queue.length === 0) return;
    const t = this.state.tick + 1;
    const due = this.queue.filter((c) => c.tick === t).sort((a, b) => a.seq - b.seq);
    if (due.length === 0) return;
    this.queue = this.queue.filter((c) => c.tick !== t);
    for (const c of due) {
      applyCommand(this.state, this.map, c.command);
      this.log.push(c);
    }
  }

  /** Advance one fixed tick: first the commands due on it, then everything that moves. */
  step(): void {
    this.flush();
    const s = this.state;
    const t = s.tick + 1;
    s.tick = t;
    const map = this.map;
    // The first of the month: wages (for the workers each place had yesterday), and what harsh taxes do.
    stepWages(s);
    stepBook(s);
    stepHarsh(s, map);
    stepLabour(s, map);
    stepWild(s, map);
    stepWalkers(s, map);
    stepFountains(s, map);
    stepMakers(s, map);
    // Slice 32: the quarries' faces, the loggers' camps and the woods growing back (nothing with neither and no felled tree).
    stepMaterials(s, map);
    stepAgoras(s, map, stepStalls);
    stepTrade(s, map);
    // Trade routes, their caravans and ships, and the caravan yard's porters (nothing in a town with neither).
    stepRoutes(s, map, stepDockers);
    stepCulture(s, map);
    stepTaxOffices(s, map);
    stepWatchPosts(s, map);
    stepArchitects(s, map);
    // Each look for a home sets how long until the next.
    if (--s.settlerClock <= 0) spawnSettlers(s, map);
    stepHouses(s, map);
    stepHazards(s, map, (b, how) => toRubble(s, map, b, how));
    // Slice 30: temptation in every home, and the thieves it sends out (nothing with crime's switch off).
    stepCrime(s, map);
    // Greece, once a day: its prices and harvests, and once a month its history (it draws only on its own random numbers).
    stepWorld(s);
    // Greece goes on: its festivals, its rulers' quarrels and friendships with each other, their feuds and wars (never touching your city).
    stepRivals(s);
    // The gifts on their way, and the rulers' moods: their turns and what follows (once a day; whims and gifts back once a month, once your city deals with Greece).
    stepGifts(s, map);
    // The rulers' requests, offers and tribute: deadlines, and now and then a new one (once your first route is six months old).
    stepFavours(s, map);
    // Loans either way: terms running out, days due, debts overdue (once a day; nothing with no loans).
    stepLoans(s, map);
    // Threats and war bands: deadlines, the band's march, its coming in (nothing in a town that has never opened a route).
    stepRaids(s, map);
    stepDiplomacy(s);
    // Slice 31: Greece grows, once a month: its cities' people, wealth, armies and fleets, their colonies and vassals (never touching your city).
    stepGrowth(s);
    // The army: its companies' calls, pay and drill, the barracks' porters, the banners' marches (nothing in a town with no barracks).
    stepArmy(s, map);
    // Expeditions: companies mustering at the edge, the march across Greece, the fight, the march home (nothing with none sent).
    stepExpeditions(s, map);
    // Battles in the streets: raiders man by man, blows and arrows, the fallen (nothing while no raiders are on your map).
    stepBattle(s, map);
    // The fleet: the shipyards' work, rowers and their pay, ships in the bay and the fights there, triremes on the lanes, pirates (nothing with no shipyard, no raid from the sea and no sea route).
    stepFleet(s, map);
    stepErrands(s, map);
    // Daily systems.
    if (t % TICKS_PER_DAY === 0) driftWind(s);
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
  }

  get date(): SimDate {
    return dateOfTick(this.state.tick);
  }
}

// ---------------------------------------------------------------------------
// Commands.

function applyCommand(s: SimState, map: CoastMap, c: Command): void {
  s.commandsApplied++;
  switch (c.type) {
    case 'road':
      record(s, layRoads(s, map, c.tiles));
      break;
    case 'wall':
      if (Array.isArray(c.tiles)) record(s, drawWalls(s, map, c.tiles));
      break;
    case 'plots':
      record(s, placePlots(s, map, c.at, 'home'));
      break;
    case 'fountain':
      record(s, placePlots(s, map, c.at, 'fountain'));
      break;
    case 'build':
      if (BUILD_KINDS.includes(c.kind)) record(s, placePlots(s, map, c.at, c.kind));
      break;
    case 'tax':
      if (Number.isInteger(c.rate) && c.rate >= 0 && c.rate <= HARSH && c.rate !== s.taxRate) {
        s.taxRate = c.rate;
        s.rev++;
      }
      break;
    case 'stall':
      record(s, addStall(s, map, c.at, c.good));
      break;
    case 'clear':
      record(s, clearArea(s, map, c.x0, c.z0, c.x1, c.z1));
      break;
    case 'undo':
      undoLast(s, map);
      break;
    case 'hazards':
      s.hazards = c.on === true;
      break;
    case 'crime':
      s.crime.on = c.on === true;
      break;
    // Slice 33.
    case 'seasons':
      if (s.season.on !== (c.on === true)) {
        s.season.on = c.on === true;
        // (The land's look, the farms' and herds' pace and what the dial says all follow it.)
        s.looks++;
      }
      break;
    case 'trade': {
      const k = Number.isInteger(c.good) ? tradeIndex(c.good) : -1;
      if (k < 0) break;
      if (typeof c.sell === 'boolean' && c.sell !== s.trade.sell[k]) {
        s.trade.sell[k] = c.sell;
        s.rev++;
      }
      if (typeof c.keep === 'number' && Number.isInteger(c.keep) && c.keep >= 0 && c.keep <= KEEP_MAX && c.keep !== s.trade.keep[k]) {
        s.trade.keep[k] = c.keep;
        s.rev++;
      }
      break;
    }
    case 'route':
      if (c.kind === 'land' || c.kind === 'sea') openRoute(s, String(c.city), c.kind);
      break;
    case 'deal':
      if (c.kind === 'land' || c.kind === 'sea') setDeal(s, String(c.city), c.kind, c.good, c.sell, c.buy, c.upto);
      break;
    case 'gift':
      if (typeof c.good === 'number' && typeof c.amount === 'number') sendGift(s, map, String(c.city), c.good, c.amount);
      break;
    case 'answer':
      if (typeof c.deal === 'number' && typeof c.act === 'string') answer(s, map, c.deal, c.act);
      break;
    case 'loan':
      if (typeof c.act === 'string') loanCommand(s, c.act, String(c.city ?? ''), Number(c.amount ?? 0), Number(c.rate ?? 0), Number(c.months ?? 0), Number(c.loan ?? 0));
      break;
    case 'expedition':
      if (c.kind === 'raid' || c.kind === 'force') sendExpedition(s, map, String(c.city), c.kind);
      break;
    case 'raise':
      if (typeof c.barracks === 'number' && (c.kind === 'hoplite' || c.kind === 'archer')) raise(s, c.barracks, c.kind);
      break;
    case 'hire':
      if (typeof c.barracks === 'number' && typeof c.kind === 'string') hire(s, map, c.barracks, c.kind);
      break;
    case 'dismiss':
      if (typeof c.company === 'number') dismiss(s, map, c.company);
      break;
    case 'banner':
      if (typeof c.company === 'number' && Number.isInteger(c.tile)) sendBanner(s, map, c.company, c.tile);
      break;
    case 'trireme':
      if (typeof c.yard === 'number') orderTrireme(s, map, c.yard);
      break;
    case 'fleet':
      if (typeof c.trireme === 'number' && (c.act === 'guard' || c.act === 'home')) fleetCommand(s, map, c.trireme, c.act, String(c.lane ?? ''));
      break;
    case 'name':
      if (typeof c.name === 'string' && nameRefusal(c.name) === '' && c.name.trim() !== s.world.name) {
        s.world.name = c.name.trim().replace(/\s+/g, ' ');
        s.rev++;
      }
      break;
  }
}

const emptyEntry = (): UndoEntry => ({
  roads: [],
  plots: [],
  removedRoads: [],
  removedPlots: [],
  removedIds: [],
  removedKinds: [],
  removedStock: [],
  removedMeat: [],
  removedCheese: [],
  removedGoods: [],
  removedStalls: [],
  stalls: [],
  removedWas: [],
  removedLevels: [],
  removedNames: [],
  removedHazards: [],
  trees: [],
  cost: 0,
  tick: 0,
});

function record(s: SimState, e: UndoEntry): void {
  const tiles = e.roads.length + e.plots.length + e.removedRoads.length + e.removedPlots.length + (e.walls?.length ?? 0) + (e.removedWalls?.length ?? 0);
  if (tiles + e.trees.length + (e.stalls?.length ?? 0) === 0) return;
  e.tick = s.tick;
  s.undo.push(e);
  if (s.undo.length > UNDO_DEPTH) s.undo.shift();
  s.rev++;
  if (tiles) s.tilesRev++;
}

/** Clear the plants standing on a tile; returns the tree indices newly cleared. */
function clearTrees(s: SimState, map: CoastMap, tiles: number[]): number[] {
  const on = mapIndex(map).treesOn;
  const done = new Set(s.cleared);
  const fresh: number[] = [];
  for (const t of tiles) {
    for (const i of on.get(t) ?? []) {
      if (done.has(i)) continue;
      done.add(i);
      fresh.push(i);
    }
  }
  if (fresh.length) s.cleared = [...done].sort((a, b) => a - b);
  return fresh.sort((a, b) => a - b);
}

/**
 * Lay road on the tiles in order. A run of wet tiles in the list is a bridge:
 * laid whole, if it is a straight span of the river between two banks a road
 * can take (see bridgeSpan) and can be paid for, or not at all.
 */
function layRoads(s: SimState, map: CoastMap, tiles: number[]): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const ground = mapIndex(map).ground;
  const valid = (t: number): boolean => Number.isInteger(t) && t >= 0 && t < n * n;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (!valid(t)) continue;
    if (ground[t] === Ground.Water) {
      let j = i;
      while (j < tiles.length && valid(tiles[j]) && ground[tiles[j]] === Ground.Water) j++;
      const run = tiles.slice(i, j);
      i = j - 1;
      const span = spanOf(map, s, run);
      if (!span) continue;
      const cost = BRIDGE_COST * run.length;
      if (spendable(s) < cost) break;
      for (const u of run) s.tiles[u] = TILE_ROAD;
      pay(s, -cost, 'building', 'bridge', run.length);
      e.cost += cost;
      e.roads.push(...run);
      continue;
    }
    if (spendable(s) < ROAD_COST) break;
    if (roadRefusal(map, s, t % n, Math.floor(t / n)) !== '') continue;
    s.tiles[t] = TILE_ROAD;
    pay(s, -ROAD_COST, 'building', 'road');
    e.cost += ROAD_COST;
    e.roads.push(t);
  }
  e.trees = clearTrees(s, map, e.roads);
  // (A road laid over a breach in a wall clears its rubble away.)
  if (s.walls.length) {
    const took = dropWalls(s, e.roads.filter((t) => !wallAt(s, t)?.gate));
    if (took.length) e.removedWalls = took;
  }
  return e;
}

/**
 * Draw wall over the tiles in order (walls.ts): open dry ground takes a
 * stretch, a road a gate, a cracked or broken stretch is mended; each paid
 * for on the building line, while the treasury can pay.
 */
function drawWalls(s: SimState, map: CoastMap, tiles: number[]): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const valid = tiles.filter((t) => Number.isInteger(t) && t >= 0 && t < n * n);
  const { done, laid } = layWalls(
    map,
    s,
    valid,
    (cost) => spendable(s) >= cost,
    (cost, what) => {
      pay(s, -cost, 'building', what);
      e.cost += cost;
    },
  );
  if (done.length) e.walls = done;
  e.trees = clearTrees(s, map, laid);
  return e;
}

/** Is this run of wet tiles, in order, a whole bridge span from a bank a road can take? */
function spanOf(map: CoastMap, s: SimState, run: number[]): boolean {
  const n = map.size;
  const ground = mapIndex(map).ground;
  // Which way it runs: along the list, or (for a single tile) whichever way is a span.
  const dirs = run.length > 1 ? [run[1] - run[0] === -n ? 1 : run[1] - run[0] === -1 ? 2 : run[1] - run[0] === 1 ? 3 : run[1] - run[0] === n ? 4 : 0] : [1, 2, 3, 4];
  for (const dir of dirs) {
    if (dir === 0) return false;
    const from = run[0] - stepOf(n, dir);
    if (from < 0 || from >= n * n) continue;
    if (ground[from] !== Ground.Ok && ground[from] !== Ground.SteepForHome) continue;
    if (s.tiles[from] > 0) continue;
    const span = bridgeSpan(map, s, from, dir);
    if (span.end >= 0 && span.tiles.length === run.length && span.tiles.every((u, k) => u === run[k])) return true;
  }
  return false;
}

function addBuilding(s: SimState, n: number, x: number, z: number, kind: BuildingKind, stock = 0, meat = 0, cheese = 0, goods: number[] = noGoods(), stalls = 0, was: BuildingKind | '' = ''): Building {
  const b: Building = {
    id: s.nextId++,
    kind,
    x,
    z,
    level: 0,
    people: 0,
    incoming: 0,
    placed: s.tick,
    since: s.tick,
    waterUntil: 0,
    walker: 0,
    clock:
      kind === 'fountain'
        ? FIRST_CARRIER
        : kind === 'agora'
          ? FIRST_VENDOR
          : kind === 'shrine'
            ? FIRST_PRIESTESS
            : kind === 'theatre'
              ? FIRST_ACTOR
              : kind === 'taxoffice'
                ? FIRST_COLLECTOR
                : kind === 'watchpost'
                  ? FIRST_WATCHMAN
                  : kind === 'architect'
                    ? FIRST_INSPECTOR
                    : kind === 'trading' || kind === 'yard'
                      ? FIRST_DOCKER
                      : 0,
    turn: 0,
    foodUntil: 0,
    religionUntil: 0,
    cultureUntil: 0,
    workers: 0,
    stock,
    growth: 0,
    family: null,
    taxedAt: 0,
    taxPaid: 0,
    unpaid: 0,
    owed: 0,
    meat,
    cheese,
    meatIn: 0,
    cheeseIn: 0,
    meatUntil: 0,
    cheeseUntil: 0,
    grace: 0,
    goods: goods.slice(),
    goodsIn: noGoods(),
    goodsUntil: noGoods(),
    stalls,
    vclock: noGoods().map((_, k) => (stalls & (1 << k) ? FIRST_STALL_VENDOR : 0)),
    fetch: noGoods(),
    risk: 0,
    wear: 0,
    fire: 0,
    fireAt: 0,
    creakAt: 0,
    was,
    ruin: '',
    tempt: 0,
    robbedAt: 0,
  };
  s.buildings.push(b);
  // (Over rubble of a wall, or (a tower) standing wall: it takes their place. placePlots keeps what a tower took, for undo.)
  if (s.walls.length) dropWalls(s, footprint(n, x, z, footSide(b)));
  for (const t of footprint(n, x, z, footSide(b))) s.tiles[t] = b.id;
  return b;
}

/** Housing plots, fountains, farms, granaries, the agora, shrines or theatres, on the same ground rules. */
function placePlots(s: SimState, map: CoastMap, at: number[], kind: BuildingKind): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const covered: number[] = [];
  for (const t of at) {
    if (!Number.isInteger(t) || t < 0 || t >= n * n) continue;
    const cost = priceOf(s, kind);
    if (spendable(s, kind) < cost) break;
    const x = t % n;
    const z = Math.floor(t / n);
    if (buildingRefusal(map, s, kind, x, z) !== '') continue;
    // (A tower takes the stretches of wall under it into it: undo gives them back.)
    if (s.walls.length) {
      const took = dropWalls(s, footprint(n, x, z, sideOf(kind)));
      if (took.length) e.removedWalls = [...(e.removedWalls ?? []), ...took];
    }
    const b = addBuilding(s, n, x, z, kind);
    pay(s, -cost, 'building', kind === 'home' ? 'plots' : kind);
    e.cost += cost;
    e.plots.push(b.id);
    covered.push(...footprint(n, x, z, sideOf(kind)));
    // Slice 32: a quarry's spoil heaps cover the ground round it too (the rocks there would stand in its pit).
    if (kind === 'quarry') for (let dz = -1; dz <= 3; dz++) for (let dx = -1; dx <= 3; dx++) if ((dz < 0 || dz > 2 || dx < 0 || dx > 2) && x + dx >= 0 && z + dz >= 0 && x + dx < n && z + dz < n) covered.push((z + dz) * n + x + dx);
  }
  e.trees = clearTrees(s, map, covered);
  return e;
}

/**
 * Take a building down: a home's family packs up and walks out (or just
 * leaves, if no road leads out); the walkers it sends out (a water carrier, a
 * farm's carts, the agora's vendor and porter, a priestess, an actor) go home at once, giving back
 * any room a cart had reserved at a granary.
 */
function removeBuilding(s: SimState, map: CoastMap, b: Building): void {
  const n = map.size;
  for (const t of footprint(n, b.x, b.z, footSide(b))) s.tiles[t] = TILE_EMPTY;
  s.buildings = s.buildings.filter((o) => o !== b);
  // The goods on a trading post's quay go with it: remembered, so the town line can say what was lost.
  if (b.kind === 'trading') {
    const quay = TRADE_GOODS.map((w) => held(b, w));
    if (quay.some((q) => q > 0)) {
      s.trade.lost = quay;
      s.trade.lostAt = s.tick;
    }
  }
  if (b.kind !== 'home') {
    s.walkers = s.walkers.filter((w) => {
      // (A caravan bound for the yard turns back instead: see routes.ts. Raiders go on with what they took: raids.ts.)
      if (w.origin !== b.id || w.kind === 'caravan' || w.kind === 'raider') return true;
      if ((w.kind === 'cart' || w.kind === 'sledge' || (w.kind === 'docker' && w.load > 0)) && !w.back) {
        const g = findBuilding(s, w.target);
        if (g) addComing(g, w.food, -w.load);
      }
      // A tax collector hands in what he has collected.
      if (w.purse.length) handIn(s, w);
      return false;
    });
  }
  // A barracks' companies are disbanded with it.
  if (b.kind === 'barracks') barracksGone(s, map, b);
  // A shipyard's trireme on the slip is lost with it; those afloat ride where they are.
  if (b.kind === 'shipyard') yardGone(s, b);
  if (b.people > 0) {
    s.left += b.people;
    sendLeavers(s, map, b.people, centreOf(b), around(n, b));
  }
  b.family = null;
  recountPopulation(s);
}

function clearArea(s: SimState, map: CoastMap, x0: number, z0: number, x1: number, z1: number): UndoEntry {
  const e = emptyEntry();
  const n = map.size;
  const xa = Math.max(0, Math.min(x0, x1));
  const xb = Math.min(n - 1, Math.max(x0, x1));
  const za = Math.max(0, Math.min(z0, z1));
  const zb = Math.min(n - 1, Math.max(z0, z1));
  const empty: number[] = [];
  const homes: Building[] = [];
  const roads = new Set<number>();
  for (let z = za; z <= zb; z++) {
    for (let x = xa; x <= xb; x++) {
      const t = z * n + x;
      const on = s.tiles[t];
      if (on === TILE_ROAD) {
        // Any tile of a bridge takes the whole bridge with it.
        if (isBridge(map, s, t)) for (const u of bridgeAt(map, s, t)) roads.add(u);
        else roads.add(t);
      } else if (on > 0) {
        const b = findBuilding(s, on);
        if (b && !homes.includes(b)) homes.push(b);
      } else empty.push(t);
    }
  }
  // Walls and gates in it go (a gate with its road), rubble of them too.
  if (s.walls.length) {
    const tiles: number[] = [];
    for (let z = za; z <= zb; z++) for (let x = xa; x <= xb; x++) if (wallAt(s, z * n + x)) tiles.push(z * n + x);
    const took = dropWalls(s, tiles);
    if (took.length) e.removedWalls = took;
  }
  for (const t of [...roads].sort((a, b) => a - b)) {
    s.tiles[t] = TILE_EMPTY;
    e.removedRoads.push(t);
  }
  for (const b of homes) {
    // Rubble is carted away for a small fee (left where it is if the treasury can't pay it).
    if (b.kind === 'rubble') {
      const fee = clearFee(footSide(b));
      if (spendable(s) < fee) continue;
      pay(s, -fee, 'clearing', b.was || 'home');
      e.cost += fee;
    }
    e.removedWas?.push(b.was);
    e.removedLevels?.push(b.level);
    e.removedNames?.push(b.ruin);
    // How near it was to burning or falling: undo brings it back as it was (clearing and undoing is no way to put a fire out).
    e.removedHazards?.push(b.risk, b.wear, b.fire, b.fireAt, b.creakAt, b.placed);
    e.removedPlots.push(b.z * n + b.x);
    e.removedIds.push(b.id);
    e.removedKinds.push(b.kind);
    e.removedStock.push(b.stock);
    e.removedMeat?.push(b.meat);
    e.removedCheese?.push(b.cheese);
    e.removedGoods?.push(b.goods.slice());
    e.removedStalls?.push(b.stalls);
    noteLost(s, b, 'cleared');
    removeBuilding(s, map, b);
  }
  e.trees = clearTrees(s, map, empty);
  return e;
}

/** What a building held goes into the stock book as lost (a home holds nothing: what it has is its table, already counted as used). */
function noteLost(s: SimState, b: Building, how: string, sign = 1): void {
  if (b.kind === 'home') return;
  for (const w of WARES) note(s, w, 'lost', how, sign * held(b, w));
}

/**
 * A building burnt down or fallen in: it goes as if cleared (a home's family
 * packs up and leaves, a workplace's walkers go home), and a heap of rubble
 * takes its footprint, remembering what stood there and whose house it was.
 * Undo can no longer take it away (it is gone), and the ledger counts it.
 */
function toRubble(s: SimState, map: CoastMap, b: Building, how: Fall): void {
  const n = map.size;
  const name = b.kind === 'home' ? (b.family?.name ?? '') : '';
  const kind = b.kind;
  noteLost(s, b, how);
  removeBuilding(s, map, b);
  // Undoing the building of it no longer takes it away, so no longer refunds it either.
  for (const e of s.undo) {
    if (!e.plots.includes(b.id)) continue;
    e.plots = e.plots.filter((id) => id !== b.id);
    e.cost = Math.max(0, e.cost - COST[kind]);
  }
  const r = addBuilding(s, n, b.x, b.z, 'rubble', 0, 0, 0, noGoods(), 0, kind);
  r.level = how === 'fire' ? BURNT : FALLEN;
  r.ruin = name;
  pay(s, 0, how, kind === 'home' ? (b.level > 0 ? 'home' : 'plots') : kind, 1);
  s.rev++;
  s.tilesRev++;
}

/** Add a stall for a good to the agora covering a tile, for its price (see stallRefusal). */
function addStall(s: SimState, map: CoastMap, at: number, good: Ware): UndoEntry {
  const e = emptyEntry();
  if (!Number.isInteger(at) || !Number.isInteger(good)) return e;
  if (stallRefusal(s, map.size, at, good, spendable(s, 'agora')) !== '') return e;
  const a = findBuilding(s, s.tiles[at]);
  if (!a) return e;
  const cost = stallPrice(good);
  a.stalls |= stallBit(good);
  a.vclock[gi(good)] = FIRST_STALL_VENDOR;
  pay(s, -cost, 'building', STALL_NAMES[good] ?? 'stall');
  e.cost = cost;
  e.stalls = [a.id, good];
  s.looks++;
  return e;
}

/** Take a stall off an agora again (an undo): its vendor and porter go with it. */
function removeStall(s: SimState, a: Building, good: Ware): void {
  if (!hasStall(a, good)) return;
  a.stalls &= ~stallBit(good);
  setHeld(a, good, 0);
  a.vclock[gi(good)] = 0;
  a.fetch[gi(good)] = 0;
  s.walkers = s.walkers.filter((w) => !stallWalker(w, a, good));
  s.looks++;
}

/**
 * Why the last action can't be undone now, or '' if it can: undo reaches back
 * only UNDO_WINDOW ticks, and never unplaces a building someone has moved
 * into or something is stored in.
 */
export function undoRefusal(s: SimState): string {
  const e = s.undo[s.undo.length - 1];
  if (!e) return 'Nothing to undo';
  if (s.tick - e.tick > UNDO_WINDOW) return 'Undo only reaches back about a month';
  for (const id of e.plots) {
    const b = findBuilding(s, id);
    if (!b) continue;
    if (b.people > 0) return b.kind === 'home' ? 'A family has moved in: clear it instead' : 'Someone lives there now';
    if (b.stock > 0) return b.kind === 'farm' ? 'There is grain in its barn now: clear it instead' : 'There is grain stored in it now: clear it instead';
    if (b.meat > 0 || b.cheese > 0) return `There is ${b.meat > 0 ? 'meat' : 'cheese'} stored in it now: clear it instead`;
    const k = b.goods.findIndex((n) => n > 0);
    if (k >= 0) return `There ${k + FIRST_GOOD === OLIVES || k + FIRST_GOOD === GRAPES ? 'are' : 'is'} ${WARE_NAMES[k + FIRST_GOOD]} stored in it now: clear it instead`;
  }
  // (A wall raiders have hammered at since stays, cracked or broken: undo would hand back its whole price. Slice 25's review.)
  const ws = e.walls ?? [];
  for (let i = 0; i + 2 < ws.length; i += 3) {
    const p = wallAt(s, ws[i]);
    if (p && p.hp < fullOf(p)) return p.hp > 0 ? 'Raiders have cracked that wall since: it stays (draw over it to mend it)' : 'Raiders have broken that wall since: it stays (draw over it to build it again)';
  }
  const st = e.stalls ?? [];
  for (let i = 0; i + 1 < st.length; i += 2) {
    const a = findBuilding(s, st[i]);
    const good = st[i + 1];
    if (!a || !isGood(good)) continue;
    if (held(a, good) > 0 || s.walkers.some((w) => stallWalker(w, a, good) && w.kind === 'porter' && w.load > 0)) return `There is ${WARE_NAMES[good]} on the stall now: it stays`;
  }
  return '';
}

/** Forget actions too old to undo. */
function forgetOld(s: SimState): void {
  const keep = s.undo.filter((e) => s.tick - e.tick <= UNDO_WINDOW);
  if (keep.length !== s.undo.length) s.undo = keep;
}

/** How many numbers an undo entry keeps for each building it cleared (see UndoEntry.removedHazards). */
const HAZARD_FIELDS = 6;

function undoLast(s: SimState, map: CoastMap): void {
  forgetOld(s);
  if (undoRefusal(s) !== '') return;
  const e = s.undo.pop();
  if (!e) return;
  const n = map.size;
  const st = e.stalls ?? [];
  for (let i = 0; i + 1 < st.length; i += 2) {
    const a = findBuilding(s, st[i]);
    if (a && STALL_GOODS.includes(st[i + 1])) removeStall(s, a, st[i + 1]);
  }
  for (const id of e.plots) {
    const b = findBuilding(s, id);
    if (b) removeBuilding(s, map, b);
  }
  // Walls it laid taken away, those it mended as they were.
  if (e.walls?.length) unlayWalls(s, e.walls);
  for (const t of e.roads) if (s.tiles[t] === TILE_ROAD) s.tiles[t] = TILE_EMPTY;
  if (e.cost > 0) income(s, e.cost, 'refund', 'undone');
  // What it removed comes back where the ground is still free. A home comes
  // back as an empty plot: its family has already gone. Land first, then
  // bridges (whose ends are on the land).
  const ground = mapIndex(map).ground;
  for (const t of e.removedRoads) if (ground[t] !== Ground.Water && roadRefusal(map, s, t % n, Math.floor(t / n)) === '') s.tiles[t] = TILE_ROAD;
  for (const t of e.removedRoads) if (ground[t] === Ground.Water && s.tiles[t] === TILE_EMPTY) s.tiles[t] = TILE_ROAD;
  // Walls and gates it cleared, or a tower took in, come back where the ground is free for them.
  if (e.removedWalls?.length) restoreWalls(s, e.removedWalls);
  // Older undo entries that placed those plots now point at the new ones,
  // so undoing them takes the plot away again (and refunds it only once).
  const order = e.removedPlots.map((_, i) => i).sort((a, b) => e.removedPlots[a] - e.removedPlots[b]);
  const renamed = new Map<number, number>();
  for (const i of order) {
    const t = e.removedPlots[i];
    const x = t % n;
    const z = Math.floor(t / n);
    const kind = e.removedKinds[i] ?? 'home';
    // Rubble comes back as it was, where nothing has gone up since.
    if (kind === 'rubble') {
      const was = (e.removedWas?.[i] ?? 'home') as BuildingKind;
      if (footprint(n, x, z, sideOf(was)).every((t) => s.tiles[t] === TILE_EMPTY)) {
        const r = addBuilding(s, n, x, z, 'rubble', 0, 0, 0, noGoods(), 0, was);
        r.level = e.removedLevels?.[i] ?? BURNT;
        r.ruin = e.removedNames?.[i] ?? '';
        // When it fell (for the town lines' news), as before.
        const placed = e.removedHazards?.[i * HAZARD_FIELDS + 5];
        if (placed !== undefined) r.placed = placed;
        renamed.set(e.removedIds[i], r.id);
      }
      continue;
    }
    // A granary, farm, lodge, dairy or agora comes back with the food it held.
    const keep = kind !== 'home';
    if (buildingRefusal(map, s, kind, x, z) === '') {
      const goods = keep ? (e.removedGoods?.[i] ?? noGoods()) : noGoods();
      const stalls = kind === 'agora' ? (e.removedStalls?.[i] ?? 0) : 0;
      const b = addBuilding(s, n, x, z, kind, keep ? (e.removedStock?.[i] ?? 0) : 0, keep ? (e.removedMeat?.[i] ?? 0) : 0, keep ? (e.removedCheese?.[i] ?? 0) : 0, goods, stalls);
      // What it held is no longer lost.
      if (keep) noteLost(s, b, 'cleared', -1);
      // Its fire risk and wear come back with it, smouldering, burning or creaking if it was.
      const h = e.removedHazards;
      if (h && h.length >= (i + 1) * HAZARD_FIELDS && kind !== 'home') {
        const k = i * HAZARD_FIELDS;
        b.risk = h[k];
        b.wear = h[k + 1];
        b.fire = h[k + 2];
        b.fireAt = h[k + 3];
        b.creakAt = h[k + 4];
      }
      renamed.set(e.removedIds[i], b.id);
    }
  }
  if (renamed.size) {
    for (const older of s.undo) {
      older.plots = older.plots.map((id) => renamed.get(id) ?? id);
      if (older.stalls) older.stalls = older.stalls.map((v, k) => (k % 2 === 0 ? (renamed.get(v) ?? v) : v));
    }
  }
  // Plants grow back where nothing stands.
  if (e.trees.length) {
    const tiles = mapIndex(map).treeTiles;
    const back = new Set(e.trees.filter((i) => tiles[i].every((t) => s.tiles[t] === TILE_EMPTY)));
    s.cleared = s.cleared.filter((i) => !back.has(i));
  }
  s.rev++;
  s.tilesRev++;
}

/** Move every walker one tick along. */
function stepWalkers(s: SimState, map: CoastMap): void {
  if (s.walkers.length === 0) return;
  const keep = [];
  // Raiders on the map: the walkers near them have run indoors, and wait there.
  const bands = bandsAt(s);
  for (const w of s.walkers) {
    if (bands.length && sheltering(bands, w)) {
      keep.push(w);
      continue;
    }
    const on =
      w.kind === 'water'
        ? moveCarrier(s, map, w)
        : w.kind === 'food'
          ? moveVendor(s, map, w)
          : vendorGood(w.kind) >= 0
            ? moveStallVendor(s, map, w)
          : w.kind === 'priestess' || w.kind === 'actor'
            ? moveCulture(s, map, w)
            : w.kind === 'tax'
              ? moveCollector(s, map, w)
            : w.kind === 'watchman'
              ? moveWatch(s, map, w)
            : w.kind === 'inspector'
              ? moveInspector(s, map, w)
            : w.kind === 'cart' || w.kind === 'porter' || w.kind === 'sledge'
              ? moveErrand(s, map, w)
            : w.kind === 'docker'
              ? moveDocker(s, map, w)
            : w.kind === 'caravan'
              ? moveCaravan(s, map, w)
              : w.kind === 'hunter'
                ? moveHunter(s, map, w)
              : w.kind === 'raider'
                ? moveRaider(s, map, w)
              : w.kind === 'thief'
                ? moveThief(s, map, w)
              // Slice 32: the quarrymen at the face and the loggers in the woods.
              : w.kind === 'quarryman'
                ? moveQuarryman(s, map, w)
              : w.kind === 'logger'
                ? moveLogger(s, map, w)
                : moveGroup(s, map, w);
    if (on) keep.push(w);
  }
  s.walkers = keep;
}

function driftWind(s: SimState): void {
  const w = s.wind;
  w.angle += (nextFloat(s.rng) - 0.5) * 0.08;
  // Pulled gently back towards a south-westerly sea breeze.
  w.angle += (3.8 - w.angle) * 0.02;
  w.strength += (nextFloat(s.rng) - 0.5) * 0.06;
  w.strength = Math.min(1, Math.max(0.25, w.strength + (0.55 - w.strength) * 0.03));
}

/** Plain serialised form of the state (what a save will hold). */
export function serialize(s: SimState): string {
  return JSON.stringify(s);
}

/** A state back from its serialised form, brought up to date if it is older (see migrate.ts). */
export function deserialize(json: string): SimState {
  const data = JSON.parse(json) as Partial<SimState>;
  migrate(data);
  if (data.version !== SIM_STATE_VERSION) {
    throw new Error(`This save is from version ${String(data.version)} and this game reads version ${SIM_STATE_VERSION}.`);
  }
  return data as SimState;
}

/** Rebuild a sim from a seed and a command log, running to the given tick. */
export function replay(seed: number, log: readonly StampedCommand[], toTick: number): Sim {
  const sim = new Sim(seed);
  for (const c of log) sim.enqueueAt(c.tick, c.command);
  sim.run(toTick);
  return sim;
}
