import type { CityId } from '../map/greece';
import type { RngState } from './rng';
import type { Crime } from './crime';
// Slice 33.
import type { Seasons } from './seasons';
// Slice 34: your vassals, allies and heralds (vassals.ts).
import type { Empire } from './vassals';
// Slice 35: the monuments' sites and the Stadium's games.
import type { Monuments } from './monuments';
// Slice 38: blockades of your harbour (blockades.ts).
import type { Blockade } from './blockades';
// Slice 39: the ambitions and the milestones reached (ambitions.ts).
import type { Ambition } from './laurels';

/** Bump when the shape of SimState changes, so old saves fail clearly. */
export const SIM_STATE_VERSION = 38;

/** What stands on a map tile: nothing, a road, or a building (by id, > 0). */
export const TILE_EMPTY = 0;
export const TILE_ROAD = -1;
/** A stretch of wall standing on the tile (slice 25; see walls.ts): nobody walks across it. A gate stands on a road tile, which stays TILE_ROAD. */
export const TILE_WALL = -2;

/** What a building is. */
export type BuildingKind =
  | 'home'
  | 'fountain'
  | 'farm'
  | 'granary'
  | 'agora'
  | 'shrine'
  | 'theatre'
  | 'taxoffice'
  | 'lodge'
  | 'dairy'
  | 'grove'
  | 'press'
  | 'storehouse'
  | 'pasture'
  | 'vineyard'
  | 'winery'
  | 'watchpost'
  | 'architect'
  | 'rubble'
  | 'trading'
  | 'yard'
  | 'mine'
  | 'armoury'
  | 'barracks'
  | 'tower'
  | 'shipyard'
  // Slice 32: the quarry and the loggers' camp.
  | 'quarry'
  | 'loggers'
  // Slice 35: the masons' yard and the three monuments.
  | 'masons'
  | 'lighthouse'
  | 'colossus'
  | 'stadium'
  // Slice 36: the horse farm.
  | 'horsefarm';
/** Every kind of building, in the order saves have always listed them. */
export const BUILDING_KINDS: readonly BuildingKind[] = ['home', 'fountain', 'farm', 'granary', 'agora', 'shrine', 'theatre', 'taxoffice', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'watchpost', 'architect', 'rubble', 'trading', 'yard', 'mine', 'armoury', 'barracks', 'tower', 'shipyard', 'quarry', 'loggers', 'masons', 'lighthouse', 'colossus', 'stadium', 'horsefarm'];

/** The services walkers carry along the streets, each with its own record: water, bread, the priestess's blessings, oil, plays, fleece and wine. */
export type Service = 'water' | 'food' | 'religion' | 'oil' | 'culture' | 'fleece' | 'wine';

/** Every walker's round with a record of the streets: the services, the tax collector's, the watchman's (`fire`) and the inspector's (`wear`). */
export type Round = Service | 'tax' | 'fire' | 'wear';
/** Every round, in a fixed order (what a save holds a record for). */
export const ROUND_KINDS: readonly Round[] = ['water', 'food', 'religion', 'oil', 'culture', 'fleece', 'wine', 'tax', 'fire', 'wear'];

/**
 * A building on a square footprint (2 x 2 for homes, fountains, shrines, tax offices,
 * watch posts and architects' offices, 3 x 3 for the rest; rubble on the
 * footprint of what stood there; see sideOf and footSide) whose top-left tile is (x, z).
 * A home's level: 0 an empty plot marked out for settlers, 1 a tent, 2 a hut,
 * 3 a cottage, 4 a townhouse, 5 a fine house, 6 a villa. Rubble: 1 burnt, 2 fallen in.
 * Every building carries every field (zero where it doesn't apply), so the
 * state stays uniform plain data.
 */
export interface Building {
  id: number;
  kind: BuildingKind;
  x: number;
  z: number;
  level: number;
  /** People living here. */
  people: number;
  /** People on their way here (room reserved for them). */
  incoming: number;
  /** Tick the building was placed. */
  placed: number;
  /** Tick it last changed level (the tent going up), for the renderer's little rise. */
  since: number;
  /** A home: the tick its water lasts until (0: it has never had any). */
  waterUntil: number;
  /** A fountain, agora, shrine or theatre: its walker out on the streets (walker id), or 0. */
  walker: number;
  /** A fountain, agora, shrine or theatre: ticks until its next walker sets off. */
  clock: number;
  /** A fountain, agora, shrine or theatre: how many walkers it has sent (which side the next one leaves by). */
  turn: number;
  /** A home: the tick its food lasts until (0: it has never had any). */
  foodUntil: number;
  /** A home: the tick the priestess's blessing lasts until (0: never had one). */
  religionUntil: number;
  /** A home: the tick its plays last until (0: never had any). */
  cultureUntil: number;
  /** A workplace: the people working there. A home: how many of its people have work. */
  workers: number;
  /** Measures of wheat: in a farm's barn, a granary's store, or the agora's food stall. */
  stock: number;
  /** A farm: how far the crop has grown (ticks at full strength; harvest at GROW). */
  growth: number;
  /** A lived-in home: the household living there (null for workplaces and empty plots). */
  family: Family | null;
  /** A home: the tick a tax collector last taxed it (0: never). */
  taxedAt: number;
  /** A home: what it paid him then, in drachmas. */
  taxPaid: number;
  /** A home: how many of its workers work where wages went unpaid this month. */
  unpaid: number;
  /** A workplace: wages it is owed this month and hasn't been paid (0: paid, or nothing due). */
  owed: number;
  /** Measures of meat and of cheese: in a lodge's or a dairy's store, a granary, or the agora's stall (wheat is `stock`; see foods.ts). */
  meat: number;
  cheese: number;
  /** A granary: room for meat and for cheese reserved by carts on their way (wheat's is `incoming`). */
  meatIn: number;
  cheeseIn: number;
  /** A home: the tick its meat and its cheese last until (0: never had any; bread is `foodUntil`). */
  meatUntil: number;
  cheeseUntil: number;
  /**
   * A home: no need counts as missing before this tick. A town saved before
   * a level needed what it needs now (a townhouse two kinds of food) gets the
   * usual warning time from when it was loaded, not all at once.
   */
  grace: number;
  /**
   * Goods (see foods.ts: olives, oil, fleece, grapes, wine, one number each):
   * what a grove, press, pasture, vineyard, winery, storehouse or agora stall holds (`goods`), the room
   * carts on their way have reserved (`goodsIn`), and for a home the tick its
   * supply of each lasts until (`goodsUntil`, 0: never had any).
   */
  goods: number[];
  goodsIn: number[];
  goodsUntil: number[];
  /** An agora: the stalls it has for goods beside its food stall, a bit each (1 << (good - OLIVES); the oil stall is 2, fleece 4, wine 16). */
  stalls: number;
  /** An agora: each good's stall vendor's clock (ticks until she next sets off; -1 while she is out). */
  vclock: number[];
  /** An agora: each good's stall porter's clock (ticks until he next looks for a load). */
  fetch: number[];
  /** Fire risk and wear, 0 to 1,000 (HAZARD_FULL; see hazards.ts): a watchman resets the one, an inspector the other. */
  risk: number;
  wear: number;
  /** 0 none, 1 smouldering, 2 burning (FIRE_* in hazards.ts). */
  fire: number;
  /** Smouldering: the tick it catches fire. Burning: the tick it falls to rubble. 0 otherwise. */
  fireAt: number;
  /** Creaking: the tick it falls in (0: not creaking). */
  creakAt: number;
  /** Rubble: what stood there ('' for everything else). */
  was: BuildingKind | '';
  /** Rubble where a home stood: the household's name ('' otherwise). */
  ruin: string;
  /** Slice 30: a home's temptation to crime, 0 to 1,000 (TEMPT_FULL in crime.ts): full, one of them slips out to steal (0 for everything else). */
  tempt: number;
  /** Slice 30: the tick a thief last robbed it (0: never): a store or the tax office isn't robbed again within a month. */
  robbedAt: number;
  /** Slice 36: a home laid out as an estate (estates.ts): four by four, its levels the estate (7) and the great estate (8); rubble keeps it from what stood there. False for everything else. */
  estate: boolean;
}

/** Slice 36: what a home can need: a service walked round the streets, or what an estate's porter fetches (estates.ts). */
export type Need = Service | 'marble' | 'armour' | 'horses';

/** What a walker is (see Walker.kind). */
export type WalkerKind = 'settler' | 'leaver' | 'water' | 'cart' | 'porter' | 'food' | 'oil' | 'priestess' | 'actor' | 'tax' | 'hunter' | 'fleece' | 'wine' | 'watchman' | 'inspector' | 'docker' | 'caravan' | 'raider' | 'thief' | 'quarryman' | 'logger' | 'sledge' | 'builder' | 'oxcart' | 'visitor'
  // Slice 37: a household walking to the quay to sail for a colony (colonies.ts).
  | 'colonist'
  // Slice 43: a porter carrying goods down to the quay for a colony (colonyworks.ts).
  | 'shipper';
/** Every kind of walker, in the order saves have always listed them. */
export const WALKER_KINDS: readonly WalkerKind[] = ['settler', 'leaver', 'water', 'cart', 'porter', 'food', 'oil', 'priestess', 'actor', 'tax', 'hunter', 'fleece', 'wine', 'watchman', 'inspector', 'docker', 'caravan', 'raider', 'thief', 'quarryman', 'logger', 'sledge', 'builder', 'oxcart', 'visitor', 'colonist', 'shipper'];

/** Someone living in a home. */
export interface Person {
  name: string;
  female: boolean;
  /** The tick they were born (before the founding: negative), so their age grows with the years. */
  born: number;
  /** How they are related: 'head' for the head of the house, otherwise to `kin` ('son' of 'Lykos'). */
  role: Kin;
  /** The name of the person they are related to ('' for the head). */
  kin: string;
}

export type Kin = 'head' | 'wife' | 'husband' | 'son' | 'daughter' | 'mother' | 'father' | 'brother' | 'sister' | 'cousin';

/** Something that happened to a household, for its story. */
export interface Story {
  tick: number;
  /** came: founded the house; joined: more family moved in; up / down: the home changed level; warn: a need ran out; relief: it came back in time; left: people moved away; fell: the man who served fell in battle (names: his, and the city whose raiders it was). */
  what: 'came' | 'joined' | 'up' | 'down' | 'warn' | 'relief' | 'left' | 'fell' | 'robbed' | 'stole' | 'caught';
  /** The need it was about (a Service, or an estate's: slice 36), 'tax' for someone driven out by harsh taxes, or ''. */
  need: '' | Need | 'tax';
  /** The home's level after it. */
  level: number;
  /** Who it was about. */
  names: string[];
  /**
   * Slice 30, crime (crime.ts): robbed, a thief broke in (`n`: the drachmas taken, 0 if the watchman brought them
   * back; names: the thief's, once caught); stole, one of them came home with loot (`n`: how much; names: his and
   * what it was); caught, one of them was caught stealing (`n`: the fine; names: his). Missing for everything else.
   */
  n?: number;
}

/** The household in a home: who they are, who lives there, and what has happened to them. */
export interface Family {
  /** The founder's name: "the house of Nikias". */
  name: string;
  /** Where they came from. */
  origin: string;
  /** When they came (the story keeps only the last few things that happened). */
  came: number;
  /** For choosing what they say. */
  seed: number;
  /** Everyone living there, in the order they came (the head first). */
  members: Person[];
  /** The last few things that happened, oldest first. */
  story: Story[];
  /** The needs the home is warning about now, so the story notes each warning (and each relief) once. */
  warned: Need[];
}

/**
 * A group walking along a path: settlers on their way to a home, or leavers
 * on their way out of the city. The path is a list of waypoints (x, z pairs,
 * world units; tile centres on the road) with the road tile under each
 * waypoint, or -1 where it is off the road (beyond the map edge, or the plot).
 */
export interface Walker {
  id: number;
  /** Settlers, leavers, a fountain's water carrier, an ox cart (from any maker), the agora's porters, its food vendor and its oil, fleece and wine vendors, a shrine's priestess, a theatre's actor, a tax office's collector or a lodge's hunter. */
  kind: WalkerKind;
  people: number;
  /** The building settlers are heading for (0 for leavers). */
  home: number;
  path: number[];
  tiles: number[];
  /** Which segment of the path it is on (between waypoint seg and seg + 1). */
  seg: number;
  /** Distance travelled along the current segment. */
  along: number;
  /** Total distance walked since the path began, for the renderer to line up the group. */
  walked: number;
  /** Bumped when the walker takes a new path, so the renderer can re-read it. */
  route: number;
  /** A service walker, cart or porter: the building it belongs to (0 for others). */
  origin: number;
  /** Heading home. */
  back: boolean;
  /** A service walker: road tiles walked out on this round that she hadn't walked yet this round. */
  steps: number;
  /** A service walker: the tick she set off on this round. */
  since: number;
  /** A cart, porter or docker: the building it is heading for (a granary, press or storehouse). A watchman: the fire he is running to or fighting (0: on his round). */
  target: number;
  /** A cart: measures of its ware (`food`) it carries; the food porter: measures of wheat; a goods porter: of his good; a hunter: meat. */
  load: number;
  /**
   * A cart: the ware it carries (0 wheat, 1 meat, 2 cheese, 3 olives, 4 oil…;
   * see foods.ts). A porter: 0 for the food porter, or the good he fetches. A
   * hunter: the herd he is after (its index), or -1.
   */
  food: number;
  /** The porter: measures of meat and of cheese he carries (0 for everyone else). A docker: `meat` is the room on the quay he has reserved for what he fetches (see trade.ts). */
  meat: number;
  cheese: number;
  /** A cart or porter: ticks left unloading or loading where it stands. A watchman: ticks left fighting a fire. */
  wait: number;
  /** A service walker: the road tiles she has walked this round (which no longer count towards it). */
  trail: number[];
  /** A tax collector: the coins in his satchel, by district, as [district, drachmas, …] pairs (empty for everyone else). */
  purse: number[];
}

/**
 * A herd of wild animals roaming its home range off the roads: deer on the
 * hills, boar in the woods. The renderer draws its animals around where it
 * stands; the sim moves only the herd.
 */
export interface Herd {
  kind: 'deer' | 'boar';
  /** How people name where it lives: "below the crags". */
  place: string;
  /** Where it roams: within `r` tiles of (hx, hz). */
  hx: number;
  hz: number;
  r: number;
  /** Where it stands now and where it is heading (world units). */
  x: number;
  z: number;
  tx: number;
  tz: number;
  /** Head of game now, and when it is whole. */
  head: number;
  full: number;
  /** Ticks it grazes before moving on. */
  clock: number;
  /** Ticks until another head grows back (while it is below full). */
  grow: number;
  /** The tick it last bolted from a hunter (it runs while it flees). */
  fled: number;
}

/** What a service's walkers have done on the streets, one entry per map tile. */
export interface ServiceRecord {
  /** The tick one of its walkers last stood there (0 never), for the overlay. */
  walked: number[];
  /**
   * At a junction, which way (1 north, 2 west, 3 east, 4 south; 0 never) one
   * of its walkers last left it. The next one takes the next way round, so over
   * a few rounds every street in reach gets walked.
   */
  exits: number[];
}

/** What a line of the ledger is about. */
export type LedgerKind = 'taxes' | 'sales' | 'refund' | 'wages' | 'building' | 'fire' | 'collapse' | 'clearing' | 'imports' | 'routes' | 'gifts' | 'given' | 'favours' | 'tribute' | 'peace' | 'raid' | 'soldiers' | 'hirelings' | 'recovered' | 'borrowed' | 'repaid' | 'lent' | 'repayment' | 'returned' | 'rowers' | 'seized' | 'collected' | 'stolen' | 'fines' | 'vassals'
  // Slice 37: founding a colony.
  | 'colonies';

/**
 * A line of the ledger: every payment of one kind and about one thing (taxes
 * from a district, wages for a kind of building, building a kind of thing)
 * in a month, added up. `amount` is signed: in is positive, out negative.
 */
export interface LedgerLine {
  kind: LedgerKind;
  /** The district (taxes), the building kind (wages, building, fire, collapse, clearing) or what was built or undone. */
  what: string;
  amount: number;
  /** How many: homes that paid, workers paid, tiles laid, buildings built, burnt down, fallen in or cleared away. */
  n: number;
}

/**
 * The treasury's accounts: this month's lines and last month's, each with
 * the money it started with, so start + the lines = the money at its end
 * (or now). Every change to the money goes through `pay` (treasury.ts).
 */
export interface Ledger {
  /** The month (months since the founding) the `now` lines are for. */
  month: number;
  /** Money at the start of this month. */
  start: number;
  now: LedgerLine[];
  /** Money at the start of last month, and last month's lines. */
  lastStart: number;
  last: LedgerLine[];
}

/** What one build action changed, so it can be undone. */
export interface UndoEntry {
  /** Road tiles it laid. */
  roads: number[];
  /** Building ids it placed (plots and fountains). */
  plots: number[];
  /** Road tiles it removed. */
  removedRoads: number[];
  /** Buildings it removed (top-left tiles). */
  removedPlots: number[];
  /** The ids those plots had (same order), so an undo that brings them back can keep older entries pointing at them. */
  removedIds: number[];
  /** What each of them was (same order). */
  removedKinds: BuildingKind[];
  /** The stock each held (same order), which comes back with it. */
  removedStock: number[];
  /** The meat and cheese each held (same order; missing in older saves: none). */
  removedMeat?: number[];
  removedCheese?: number[];
  /** The goods each held and (an agora) the stalls it had (same order; missing in older saves: none). */
  removedGoods?: number[][];
  removedStalls?: number[];
  /** Stalls it added, as [agora id, good] pairs (missing in older saves: none). */
  stalls?: number[];
  /** Rubble it cleared: what had stood there, burnt (1) or fallen (2), and the household's name (same order as removedPlots; missing in older saves). */
  removedWas?: string[];
  removedLevels?: number[];
  removedNames?: string[];
  /** Fire and wear of what it cleared, six numbers each in the same order: risk, wear, fire, fireAt, creakAt and the tick it was placed (missing in older saves: undo brings buildings back safe and sound). */
  removedHazards?: number[];
  /**
   * Slice 25: the wall stretches it laid, mended or took in (a tower), as
   * [tile, strength before (-1: new), gate (1) or not (0)] triples; and the
   * stretches it cleared away, as [tile, strength, gate] triples (missing in
   * older saves: none).
   */
  walls?: number[];
  removedWalls?: number[];
  /** Slice 36: whether each building it cleared was an estate (or the rubble of one), in the order of removedPlots (missing in older saves: none was). */
  removedEstates?: boolean[];
  /** Tree indices it cleared. */
  trees: number[];
  /** Drachmas it cost. */
  cost: number;
  /** The tick it was done (undo only reaches back UNDO_WINDOW ticks). */
  tick: number;
}

/**
 * The whole simulation state: plain data only (numbers, strings, arrays,
 * plain objects), so it can be serialised with JSON and compared in tests.
 */
export interface SimState {
  version: number;
  /** Which authored map the city sits on. */
  mapId: string;
  seed: number;
  /** Ticks completed since the founding. */
  tick: number;
  rng: RngState;
  /**
   * A second generator for the people: names, ages, where they came from.
   * Kept apart so drawing names never shifts the main one (settler groups
   * grow exactly as they did before households had names).
   */
  folk: RngState;
  /** A third generator for the wild herds, so their wandering never shifts the other two. */
  wild: RngState;
  /** The wild herds on the hills and in the woods. */
  herds: Herd[];
  /** Commands applied so far. */
  commandsApplied: number;
  /**
   * The breeze over the bay. Drifts a little each day (seeded), and the
   * renderer reads it to set which way the waves roll. Later it can steer
   * ships and smoke.
   */
  wind: { angle: number; strength: number };
  /** Drachmas in the treasury. */
  money: number;
  /**
   * Whether fire risk and wear build up (see hazards.ts). Off in a bare
   * state; a command turns it on in every game (as a new game starts, or as a
   * demo opens: a demo's history is built with it off, so each demo opens
   * with no risk or wear anywhere, and histories from before fire are unchanged).
   */
  hazards: boolean;
  /** People living in the city. */
  population: number;
  /** One entry per map tile (tz * size + tx): TILE_EMPTY, TILE_ROAD or a building id. */
  tiles: number[];
  /** Each round's record of the streets its walkers walk (the four services and the tax collectors). */
  rounds: Record<Round, ServiceRecord>;
  /** The tax rate: 0 none, 1 light, 2 fair, 3 heavy, 4 harsh. */
  taxRate: number;
  /** Where the treasury's drachmas came from and went, this month and last. */
  ledger: Ledger;
  buildings: Building[];
  walkers: Walker[];
  nextId: number;
  /** Indices into the baked tree list of plants cleared away, sorted. */
  cleared: number[];
  /** The last few build actions, newest last. */
  undo: UndoEntry[];
  /** Ticks until the next look for a home for settlers. */
  settlerClock: number;
  /** Bumped whenever tiles, buildings (placed, cleared, a new level, people moving in or out) or trees change. */
  rev: number;
  /** Bumped when how a workplace looks changes: a farm's crop grows a stage, or a stock (barn, granary, stall) changes. */
  looks: number;
  /** Bumped only when tiles change (what a road route depends on). */
  tilesRev: number;
  /** Running totals. */
  arrived: number;
  left: number;
  /** What the trading post sells and keeps, and the merchant ship (see trade.ts). */
  trade: Trade;
  /** When households left the city whole for harsh taxes (ticks, the last year's; see stepHarsh in taxes.ts). */
  taxGone: number[];
  /** Greece beyond the walls: the other cities, their rulers and goods (see world.ts). */
  world: World;
  /** What the city made, used, sold, bought and lost of each ware, this month, last month and the last year (see stockbook.ts). */
  stocks: StockBook;
  /** The city's companies of soldiers and their men (see army.ts). */
  army: Army;
  /** Its walls and gates, stretch by stretch, in tile order (slice 25; see walls.ts). */
  walls: WallPiece[];
  /** Its triremes, enemy ships in the bay, and pirates on the sea lanes (slice 26; see fleet.ts). */
  fleet: Fleet;
  /** Slice 30: crime's switch, its news and the month's tallies (see crime.ts; each home's temptation is its `tempt`). */
  crime: Crime;
  /** Slice 32: the trees the loggers have felled, growing back (materials.ts). */
  materials: Materials;
  /** Slice 33: the seasons' switch and the ships winter has held back (see seasons.ts; the season itself is the tick's). */
  season: Seasons;
  /** Slice 34: your vassals and allies, heralds on their way, tribute and aid coming, allies' calls to war (see vassals.ts; a vassal's own link is its city's `lord`, 'home'). */
  empire: Empire;
  /** Slice 35: the monuments' sites, their stages and the Stadium's games (monuments.ts, monumentworks.ts). */
  monuments: Monuments;
  /** Slice 39: the ambitions' switch, the milestones reached and when, fame drawing settlers, the grand finish (ambitions.ts). */
  ambition: Ambition;
}

/**
 * One tile's stretch of wall, or a gate where a wall crosses a road (slice
 * 25, walls.ts). Its strength runs down as raiders hammer at it; at 0 it is
 * rubble, a breach anyone can walk through, until the wall is drawn over it
 * again.
 */
export interface WallPiece {
  t: number;
  hp: number;
  gate: boolean;
}

// ---------------------------------------------------------------------------
// The army (see army.ts). Nothing here draws on any random numbers: a town
// with no barracks has an empty army and plays exactly as it did before.

/** What a company is: heavy infantry with spear and shield, or light, with a bow; or (slice 36) the estates' sons on horseback. */
export type CompanyKind = 'hoplite' | 'archer' | 'horseman';

/**
 * What a company is doing: drilling at its barracks, marching to its banner's
 * tile, holding there (fighting what comes within reach: battle.ts), or
 * marching back to its barracks; or away from the city on an expedition
 * (slice 28: expeditions.ts), its banner and its men gone from your map.
 */
export type CompanyOrder = 'drill' | 'march' | 'hold' | 'return' | 'away';

/** A company of up to 16 men under its banner. */
export interface Company {
  id: number;
  /** Its number in the city (the 1st, the 2nd…): the lowest free when it was raised. */
  n: number;
  kind: CompanyKind;
  /** The barracks it belongs to (a building id). */
  barracks: number;
  /** Its banner's emblem (see EMBLEMS in army.ts). */
  emblem: number;
  order: CompanyOrder;
  /** Where its banner stands (world units: tile units), and which way the company faces (radians; 0 is +x). */
  x: number;
  z: number;
  face: number;
  /** Marching: the banner's way, as x, z pairs, how far along it is, and the tile it is going to (-1: none). */
  path: number[];
  along: number;
  target: number;
  /** How many men it wants (16). */
  want: number;
  /** The tick it was raised. */
  raised: number;
  /** Pay owed and not yet paid this month (drachmas; 0 paid). */
  owed: number;
  /** Why it can't fill, in words ('' while it is full or filling). */
  why: string;
  /** Hirelings (slice 24): Cretan archers or Arcadian hoplites, hired for a fee ('' for citizens). They walk in from the edge, refill from nobody's home, and walk off if their pay is a month owed. */
  hired: '' | 'cretan' | 'arcadian';
  /** In a fight: how many men stood in its ranks when it began (0: not fighting). It breaks when half of them have fallen. */
  strong: number;
  /** Broken: running back to its barracks, fighting nobody on the way. */
  routed: boolean;
  /** Slice 28: the expedition it marches with (world.expeditions; 0 none). */
  away: number;
  /** Slice 34: an allied company come to help against raiders (vassals.ts): the city it came from (missing: your own). */
  ally?: CityId;
}

/** How the man who serves stands in his house. */
export type ServesAs = 'head' | 'son' | 'husband' | 'brother' | 'cousin';

/**
 * What a soldier is doing: walking in from his home, waiting at the barracks
 * for armour, in the ranks, or walking home, dismissed; fallen in a fight
 * (lying still, then gone), or wounded (lying still, then walking back to
 * his barracks) and healing there; or away with his company on an
 * expedition (slice 28), off your map.
 */
export type SoldierState = 'coming' | 'arming' | 'ready' | 'leaving' | 'fallen' | 'wounded' | 'healing' | 'away';

/** A man serving in a company. */
export interface Soldier {
  id: number;
  /** His company (its id; 0 once dismissed and walking home). */
  company: number;
  /** His place in the ranks (0 to 15). */
  slot: number;
  /** The home he comes from (a building id; 0 for a hireling, later). */
  home: number;
  /**
   * His name, the name of the one he is known by in the house (a son's
   * father, a husband's wife, a brother's or cousin's head of the house; ''
   * for the head himself), and the house's.
   */
  name: string;
  father: string;
  house: string;
  /** How he stands in the house: its head, a son, or the husband, brother or cousin of `father` (a save from before this was kept: a son if `father` is set, else the head). */
  kin?: ServesAs;
  state: SoldierState;
  /** Where he stands (world units) and which way he faces (radians). */
  x: number;
  z: number;
  face: number;
  /** His own way while walking in or home, or to his place (x, z pairs), and which waypoint he is heading for. */
  path: number[];
  seg: number;
  /** How far he has walked, for the renderer's stride. */
  walked: number;
  /** A hoplite: whether he has his set of armour. */
  armed: boolean;
  /** Health, 0 to 100. */
  hp: number;
  /** In a fight (battle.ts): the raider he is fighting (a foe's id, 0 none), ticks until his next blow or arrow, the tick he last struck (for the drawing: a spear's thrust, a bow drawn), and the tick he fell (0 standing). */
  foe: number;
  cool: number;
  swung: number;
  fell: number;
}

/** A raider on your map (battle.ts): one man of a band, with the band (`raid`: its raid's id) or fighting. */
export interface Foe {
  id: number;
  raid: number;
  /** His place in the band's loose pack. */
  slot: number;
  x: number;
  z: number;
  face: number;
  hp: number;
  /** With the band, fighting a soldier, or fallen (lying still a moment, then gone). */
  state: 'with' | 'fight' | 'fallen';
  /** The soldier he is fighting (0 none), ticks until his next blow, the tick he last struck, the tick he fell (0 standing). */
  foe: number;
  cool: number;
  swung: number;
  fell: number;
  /** How far he has walked, for the drawing's stride. */
  walked: number;
  /** The tick he took on the soldier he is fighting, and the tick until which he pays soldiers no mind (one he could not reach for a while: he gives up on him and goes on). */
  since: number;
  calm: number;
}

/** An arrow in flight (battle.ts): from where it was loosed to where it lands, over its flight, at a foe (0: at nobody now), and what it does if it strikes. */
export interface Arrow {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** The ticks it was loosed and lands. */
  t0: number;
  t1: number;
  foe: number;
  dmg: number;
  /** How high it was loosed from (a tower's top; missing: a man's bow). */
  h0?: number;
}

/** A line of the army's news for the town lines: a man fallen and mourned, a band broken, hirelings walking off (`at`: the building it is about, 0 none). */
export interface ArmyNews {
  tick: number;
  line: string;
  at: number;
}

/** The city's companies and their men. */
export interface Army {
  companies: Company[];
  soldiers: Soldier[];
  /** The next company's and soldier's id (raiders' too). */
  nextId: number;
  /** Raiders on your map, man by man, and the arrows in the air (both empty but in a fight). */
  foes: Foe[];
  arrows: Arrow[];
  /** The last few lines of news from the fighting. */
  news: ArmyNews[];
  /** Pay still owed to men dismissed (their companies gone), paid as money comes in. */
  owed: number;
}

// ---------------------------------------------------------------------------
// Greece (see world.ts). Nothing here draws on the city's random numbers, and
// nothing in the city reads it yet but the map: a town that keeps to itself
// plays exactly as it did before Greece was there.

/** What a ruler is like: two of these, shuffled each game. */
export type Trait = 'proud' | 'greedy' | 'generous' | 'warlike' | 'pious' | 'shrewd' | 'fickle' | 'steadfast';

/** The ruler of one of the four cities you can deal with. */
export interface Ruler {
  name: string;
  female: boolean;
  /** "King of Sparta". */
  title: string;
  traits: Trait[];
  /** Picks the portrait's features (hair, beard, skin, the shape of the face). */
  face: number;
}

/**
 * Something a ruler remembers about you. Their mood is the sum of what each
 * memory is worth now: `amount` when it happened (`tick`), fading evenly to
 * nothing over `fade` ticks (0: it never fades).
 */
export interface Memory {
  /** What kind of thing it was: 'history', 'trait', 'first' (the starting mood), 'gift' (your gift), 'snub' (their trader turned back), 'whim' (a fickle ruler's passing mood), 'staged' (set up by a demo); later refusals, promises… */
  kind: string;
  /** What it was, in words: "old Argos and Sparta were rivals for the Peloponnese". */
  why: string;
  amount: number;
  tick: number;
  fade: number;
}

/**
 * A city of Greece. Its goods are kept by trade good (TRADE_GOODS in
 * trade.ts: wheat, meat, cheese, oil, fleece, wine): what its people make and
 * use in a year, what it has in hand, and what it pays or asks for a hundred
 * measures now, with a year of monthly prices behind it, oldest first.
 */
export interface WorldCity {
  id: CityId;
  /** Null for your city and Tyre (no ruler to deal with). */
  ruler: Ruler | null;
  /** The ruler's memories of you, oldest first (their mood is what these add up to now). */
  memories: Memory[];
  /** How the ruler feels about each other city to begin with: the old rivalries of the cities and their own leaning (by CITY_IDS order; 0 for itself and for cities without a ruler). What has passed between them since is in `bonds` (rivals.ts). */
  ties: number[];
  /** What the ruler remembers of the other rulers (quarrels, friendships, wars), oldest first. */
  bonds: Bond[];
  /** By trade good (TRADE_GOODS order): what it makes and uses in a year (measures). */
  make: number[];
  need: number[];
  /** What it has in store now, and the two things pushing that from normal (see world.ts): your trade (`yours`: sold to them +, bought from them −) and its harvest (`crop`), each wearing off. */
  stock: number[];
  yours: number[];
  crop: number[];
  /** Two more pushes on its stock (rivals.ts, festivals.ts): its wars (`strife`: drawn down while at war, and after a defeat) and its festival (`feast`). */
  strife: number[];
  feast: number[];
  /** Its market price per 100 now, the last twelve months' (oldest first), and a trail a fortnight or so behind (for the arrow). */
  price: number[];
  history: number[][];
  trail: number[];
  /** What you sold them (+) or bought from them (−) by good, month by month for the last twelve (oldest first; the last is this month). */
  dealt: number[][];
  /** The last harvest: 0 failed, 1 poor, 2 fair, 3 good, 4 rich. And the next one, foreseen (the fields' look from June). */
  harvest: number;
  outlook: number;
  /** The tick its festival ends (0: none on). */
  festival: number;
  /** The city it is at war with ('' at peace). */
  war: CityId | '';
  /** The ruler's mood, as the word last said of it (0 hostile … 5 devoted, MOOD_WORDS in world.ts): a line of news when it turns. */
  feel: number;
  /** The tick the ruler last sent you a gift (0: never). */
  gave: number;
  /** Slice 31 (growth.ts): its people, its treasury (dr), its men under arms and its ships (all 0 for your city and Tyre, which are not counted here). */
  pop: number;
  wealth: number;
  army: number;
  fleet: number;
  /** The city it is a vassal of ('' none), and since when: rivals' in slice 31, yours (`home`) in slice 34. */
  lord: CityId | '';
  lordSince: number;
  /** What has moved its people, wealth, army and fleet lately, by cause and year, oldest first (growth.ts). */
  grew: Growth[];
}

/** Slice 31: what one cause did to a city in one year (growth.ts), so its page can name why it grew or shrank. */
export interface Growth {
  /** The cause: 'harvest', 'trade' (with you), 'commerce' (its own), 'war', 'defeat', 'victory', 'debt', 'tribute', 'vassals', 'colony', 'land' (the pull back towards what its land can hold), 'upkeep'. */
  kind: string;
  /** The game's year it was in (0 the founding year), and its words ("good harvests"). */
  year: number;
  why: string;
  /** What it added (+) or took (−) in that year, unrounded. */
  pop: number;
  wealth: number;
  army: number;
  fleet: number;
}

/**
 * Slice 31: an empty site where a city could be founded (SITES in
 * map/greece.ts), and who holds it. A colony is the site held by a city:
 * the rivals' in slice 31, yours (`home`) in slice 37.
 */
export interface Site {
  id: string;
  /** Who holds it ('' free), since when, and how many people live there. */
  owner: CityId | '';
  since: number;
  pop: number;
  /** A city sending settlers there ('' none), when it said so, and when they land. */
  bound: CityId | '';
  told: number;
  lands: number;
  /** Slice 37: your colony there declared itself free (its name; '' otherwise): nobody founds there again. */
  free: string;
}

/** Something a ruler remembers of another ruler (rivals.ts): what it was, what it is worth and when, fading as a memory does. */
export interface Bond extends Memory {
  /** The city it is about. */
  city: CityId;
}

/**
 * A war between two rival cities (rivals.ts). Where each side's army (or
 * fleet) is on the map is a pure function of the tick: marching out from
 * its city along the way to the meeting place, standing there while the war
 * lasts, and marching home once it is over.
 */
export interface War {
  id: number;
  /** Who declared it, and on whom. */
  a: CityId;
  b: CityId;
  /** Why, in words: "over the border lands". */
  why: string;
  /** The way between them (RIVAL_WAYS in map/greece.ts), by land or by sea. */
  way: string;
  by: 'land' | 'sea';
  start: number;
  /** When it ends, as the dice set it at the start (a season or two). */
  until: number;
  /** How it ends, as the dice set it at the start: 'peace', or the winner. */
  fate: 'peace' | CityId;
  /** How many men each side has out (a's, b's), for the figures on the map. */
  menA: number;
  menB: number;
  /** The battle half-way through has been told. */
  told: boolean;
  /** When it ended (0 while it is on). */
  ended: number;
}

/**
 * A trade route from your city to another, by land or by sea (see routes.ts).
 * By trade good (TRADE_GOODS order) throughout.
 */
export interface TradeRoute {
  city: CityId;
  kind: 'land' | 'sea';
  /** The tick it was opened, and when its next trader is due (a caravan at your map's edge, a ship at the jetty). */
  opened: number;
  next: number;
  /** What you have sold them and bought from them this year (January to December). */
  sold: number[];
  bought: number[];
  /** What you sell them (of the goods they buy), what you buy from them (of the goods they sell), and buying, how much to stock the stores up to. */
  sell: boolean[];
  buy: boolean[];
  upto: number[];
  /** A sea route's ship (null for a land route). */
  ship: Visitor | null;
  /** This visit: what the trader has taken so far, what it unloaded, and what that cost. */
  hold: number[];
  unloaded: number[];
  cost: number;
  /** Visits so far; the last one's end, what it bought from you and paid, and what it sold you and cost. */
  visits: number;
  lastAt: number;
  lastSold: number[];
  lastPaid: number;
  lastBought: number[];
  lastCost: number;
  /** The tick a trader last turned back without trading (0: never), and why ('road', 'yard', 'post'). */
  missedAt: number;
  missed: string;
  /** The tick its ruler closed it, hostile (0: open): no trader sets off until the mood mends. */
  closed: number;
  /** Slice 26: her cargo for you was taken by pirates on her way (the tick; 0: not this time): she comes in empty. */
  robbed: number;
}

/**
 * A foreign ship on a sea route: the Tyre ship's phases (SHIP_* in trade.ts,
 * with two more: anchored, waiting for the jetty, and coming alongside from
 * her anchorage), her way in from the horizon to the jetty, and where along
 * it she anchors. Where she is follows from these and the tick (visitorAt).
 */
export interface Visitor {
  phase: number;
  since: number;
  /** Sailing off: how far along her way in she was when she turned (1 from the quay). */
  turned: number;
  path: number[];
  /** The trading post she is calling at (0 while away). */
  post: number;
  /** How far along her way in she stops (1: the jetty; less: her anchorage), and how far to one side of her way she anchors (tiles, signed). */
  stop: number;
  aside: number;
}

/**
 * A ruler's request, offer, demand for tribute (see favours.ts) or threat
 * (see raids.ts), with its deadline and how it stands.
 */
export interface Deal {
  id: number;
  /** (`loanoffer`, `loanask`: a ruler's offer to lend you coin, or ask to borrow it; its loan in world.loans names it: loans.ts.) */
  kind: 'request' | 'offer' | 'tribute' | 'threat' | 'loanoffer' | 'loanask';
  city: CityId;
  /** The trade good (by TRADE_GOODS order), or -1 for drachmas. */
  good: number;
  amount: number;
  /** When it was made, and by when it must be met (an offer: answered). */
  at: number;
  due: number;
  /**
   * Open (waiting on you, or on what you sent); a request or tribute met in
   * time, late, refused, let run out (`lapsed`) or a promise broken; an offer
   * taken (running), declined, lapsed, kept or broken at the end of its year,
   * or ended (its route closed). A threat stays open while its raiders are
   * out, and ends met (paid off), ended (called off) or raided.
   */
  state: 'open' | 'met' | 'late' | 'refused' | 'lapsed' | 'broken' | 'taken' | 'declined' | 'kept' | 'ended' | 'raided';
  /** Why they ask, in words: "their harvest failed". */
  why: string;
  /** You promised it (a request). */
  promised: boolean;
  /** What you sent for it, on its way (a gift's id in world.gifts; 0 none), and how much of it arrived. */
  gift: number;
  got: number;
  /** When it was settled (0 while open or running). */
  ended: number;
  /** An offer: they buy from you ('buy') or sell to you ('sell'), at this price a hundred, so much gone under it, until this tick once taken. */
  side: '' | 'buy' | 'sell';
  price: number;
  done: number;
  until: number;
  /** Tribute: yearly or once, and how often paid. */
  yearly: boolean;
  paid: number;
  /** Tribute refused while the ruler was cold or worse: a threat is owed (raids.ts makes it, and clears this). */
  angry: boolean;
}

/**
 * Someone on the move on the map (a trader, goods sent as a gift, an army, a
 * war band), along one of the ways (WAYS in map/greece.ts). Where they are is a
 * pure function of the tick: `start` and `dur` along the way, coming to your
 * city (`homeward` false) or going home to theirs (true). A ship is drawn
 * from her route's record instead (see routes.ts).
 */
export interface Traveller {
  kind: 'trader' | 'gift' | 'army' | 'raiders';
  city: CityId;
  way: string;
  start: number;
  dur: number;
  homeward: boolean;
}

/**
 * A gift on its way, yours to a ruler (`from` 'home') or a ruler's to you
 * (see diplomacy.ts): drachmas (`good` -1) or a trade good (by TRADE_GOODS
 * index). Yours in goods is first fetched from the stores to the caravan yard
 * or the trading post (`depot`) by its porters or dockers (`got` so far:
 * phase 0), then leaves the city (phase 1: a little caravan walking out to
 * the edge of the map, or a ship sailing out of the bay, `ship`), then travels
 * the way on the map of Greece (phase 2: from `a0` to `a1` along it, from
 * `start` over `dur` ticks, so where it is is a pure function of the tick).
 */
export interface Gift {
  id: number;
  from: CityId;
  to: CityId;
  good: number;
  amount: number;
  got: number;
  /** By road or by sea, and the way on the map (WAYS in map/greece.ts). */
  by: 'land' | 'sea';
  way: string;
  phase: number;
  /** When it was sent, and where its goods are fetched to (a building id; 0 for coin, or a ruler's gift). */
  at: number;
  depot: number;
  start: number;
  dur: number;
  a0: number;
  a1: number;
  /** A gift by sea sailing out of your bay (phase 1): the ship's phase, when she cast off, how far in she was, her way. */
  ship: { phase: number; since: number; turned: number; path: number[] } | null;
  /** A ruler's gift: why they sent it, in words ("in thanks for your friendship"). */
  note: string;
  /** Sent for a ruler's request or tribute (a deal's id in world.deals; see favours.ts), not a gift: 0 for a gift. */
  deal: number;
  /** A herald about a loan, with its coin or none (a loan's id in world.loans; see loans.ts), not a gift: 0 for a gift. */
  loan: number;
}

/** A thing that moved a loan's interest or months, and by how much (percent, or months). */
export interface LoanWhy {
  why: string;
  n: number;
}

/**
 * A loan between your city and a ruler (see loans.ts): `side` 'in' you
 * borrow, 'out' you lend; `by` who proposed it. Repaid in one payment of the
 * whole sum and its interest (`owed`) on the day it is due.
 */
export interface Loan {
  id: number;
  city: CityId;
  side: 'in' | 'out';
  by: 'you' | 'them';
  /**
   * asking (your herald on his way to ask), terms (their terms wait on your
   * answer), proposed (a ruler's own offer or ask, a deal), coming (their
   * coin on its way to you), offering (your coin on its way, for them to take
   * or send back), sending (your coin on its way, as they asked), returning
   * (sent back), running, overdue, repaying (the whole sum on its way back),
   * grace (slice 28: a borrower asks you for more time, waiting on your
   * answer); over: repaid, refused, declined, lapsed, forgiven (you let them
   * off), collected (paid off by what was seized or taken by force).
   */
  state: 'asking' | 'terms' | 'proposed' | 'coming' | 'offering' | 'sending' | 'returning' | 'running' | 'overdue' | 'repaying' | 'grace' | 'repaid' | 'refused' | 'declined' | 'lapsed' | 'forgiven' | 'collected';
  /** The sum, the interest (a percent of it, for the whole loan), the months, and what is owed in all. */
  amount: number;
  rate: number;
  months: number;
  owed: number;
  /** What moved the interest and the months, each named. */
  rateWhy: LoanWhy[];
  monthsWhy: LoanWhy[];
  /** Why, in words: why they ask or offer, why they refused, took it or sent it back. */
  why: string;
  /** The ruler's offer or ask it came from (a deal's id; 0 none), and its herald on the way (a gift's id; 0 none). */
  deal: number;
  gift: number;
  /** When it was made; until when its terms stand (terms); when it was agreed and when it falls due; when it ended (0 while live); whether it was repaid late. */
  at: number;
  until: number;
  start: number;
  due: number;
  ended: number;
  late: boolean;
  /**
   * Slice 28, a debt unpaid. How far its escalation has gone (yours: 0 none,
   * 1 warned, 2 seizing, 3 an army to collect) and when the last step came;
   * the tick it fell overdue (0 never; kept, as your record or theirs); what
   * has been taken off it (dr) by seizures, loot or an expedition; you chose
   * not to pay it on the day; how often its day was put off; the reminder
   * given; the collectors' raid (0 none); a demand's deadline (0 none) and
   * whether one was made; the expedition out after it (0 none).
   */
  step: number;
  stepAt: number;
  fell: number;
  seized: number;
  withhold: boolean;
  extended: number;
  reminded: boolean;
  raid: number;
  demand: number;
  demanded: boolean;
  sent: number;
}

/**
 * An expedition of your companies (slice 28, expeditions.ts): a raiding party
 * or a full force sent after a city, for a debt or without cause. It musters
 * (its companies march to the edge of your map on that city's side), marches
 * on the map of Greece (a pure function of the tick, as any traveller), fights
 * the city's garrison (resolved from the two sides' strength and the world's
 * dice), and comes home with what it took and a report.
 */
export interface Expedition {
  id: number;
  city: CityId;
  kind: 'raid' | 'force';
  /** The debt it goes after (a loan's id; 0: none, an attack without cause). */
  loan: number;
  /** Its companies (ids), and the men who set out with each (soldier ids). */
  companies: number[];
  men: number[];
  /** mustering (marching to the edge in your city), marching (on the map), fighting (at their city), homeward, back (in your city, marching to the barracks), done. */
  phase: 'mustering' | 'marching' | 'fighting' | 'homeward' | 'back' | 'done';
  by: 'land' | 'sea';
  way: string;
  /** The edge tile its companies leave and come back by (by sea: the tile beside the shipyard where they go aboard). */
  edge: number;
  /** By sea: the triremes that carry it (fleet.ts), out with it and home with it. */
  ships: number[];
  /** On the map: from `a0` to `a1` along its way, from `start` over `dur` ticks; when it set out. */
  start: number;
  dur: number;
  a0: number;
  a1: number;
  at: number;
  /** The fight: your strength and theirs, the odds, won or not, their men fallen. */
  ours: number;
  theirs: number;
  odds: number;
  won: boolean;
  fallen: number;
  /** What it brings home: coin, a trade good (-1 none) and how much, and the dr taken off the debt. */
  coin: number;
  good: number;
  goods: number;
  value: number;
  /** Your men killed and wounded (soldier ids). */
  killed: number[];
  wounded: number[];
  /** The report, line by line, once it has fought. */
  report: string[];
  ended: number;
  /** Slice 34: what it was sent to do besides (vassals.ts): '' as slice 28's, 'conquer' (to make the city your vassal, or crush a vassal arming against you), 'war' (to fight an ally's war). */
  aim: '' | 'conquer' | 'war';
}

/** A line of news from Greece. */
export interface NewsItem {
  tick: number;
  city: CityId;
  line: string;
  /** News that can't wait its turn (a threat, raiders): shown at once (missing: no). */
  urgent?: boolean;
  /** News of Greece's own doings (festivals, feuds, wars between rivals; missing: no): under the top bar only once your city has dealt with Greece. */
  greece?: boolean;
}

/**
 * A ruler's threat and the war band that follows it (see raids.ts): waiting
 * on the threat's deadline, gathering at their city, marching on yours along
 * the road (or the lane), raiding on your map, and going home (or turned
 * back). On the map of Greece where the band is is a pure function of the
 * tick: from `a0` to `a1` along its way, from `start` over `dur` ticks.
 */
export interface Raid {
  id: number;
  /** The threat it follows from (a deal in world.deals). */
  deal: number;
  city: CityId;
  /** How many men. */
  men: number;
  phase: 'threat' | 'gathering' | 'marching' | 'raiding' | 'homeward' | 'turned' | 'done';
  /** By road or by sea, and the way on the map (WAYS in map/greece.ts). */
  by: 'land' | 'sea';
  way: string;
  start: number;
  dur: number;
  a0: number;
  a1: number;
  /** The price of peace: coin, or goods they would take instead (a trade good's index, -1 none, and how many). */
  coin: number;
  alt: number;
  altAmount: number;
  /** On your map: the edge tile they came in by (-1 before), what they went for (a building id, and what it was), what they carried off (a ware, -1 none, and how many) and whether they set it alight. */
  edge: number;
  target: number;
  aim: BuildingKind | '';
  ware: number;
  took: number;
  fired: boolean;
  /**
   * Slice 24: the places they go for after `target`, in turn (building ids:
   * the tax office, after a store); the drachmas they took from the treasury;
   * how many buildings they set alight on the way; how many of them have
   * fallen; what of their loot was recovered from the fallen (goods, coin);
   * whether they broke and ran; and the tick they were last in a fight.
   */
  next: number[];
  stole: number;
  fires: number;
  fallen: number;
  regained: number;
  coinBack: number;
  broke: boolean;
  fought: number;
  /** How many of your men they killed, and wounded. */
  killed: number;
  wounded: number;
  /** Slice 25: the stretch of wall or the gate their way ends at, which they must break (its tile; -1 none), and how many they have broken. */
  siege: number;
  breaches: number;
  /**
   * Slice 26, a band from the sea: the beach tile it landed on (or makes for;
   * -1: by land), how many ships it came in and how many your triremes sank,
   * how many men landed (0 until they do) and how many went down with their
   * ships; and where it broke, in words, for the news once it has gone ('' if
   * it didn't).
   */
  shore: number;
  ships: number;
  sunk: number;
  landed: number;
  drowned: number;
  brokeAt: string;
  /** When it was settled (0 while it is live), and how: 'raided', 'paid', 'called' (their mood mended), 'nothing' (nothing to take). */
  ended: number;
  end: string;
  /** Slice 28: the debt it comes to collect (a loan's id: a lender's army, not a war band; 0 none). */
  loan: number;
}

/** Greece: your city's name, the cities and their rulers, and what goes on between them. */
export interface World {
  /** The seed Greece was shuffled from (a new game's own, apart from the city's). */
  seed: number;
  /** Greece's own random numbers, apart from the city's three. */
  rng: RngState;
  /** Your city's name. */
  name: string;
  /** The cities, in CITY_IDS order (yours first). */
  cities: WorldCity[];
  routes: TradeRoute[];
  deals: Deal[];
  travellers: Traveller[];
  news: NewsItem[];
  /** Gifts on their way, yours and the rulers', and the next one's number. */
  gifts: Gift[];
  nextGift: number;
  /** The tick your city first dealt with Greece (opened a route or sent a gift; 0: not yet): only then do rulers act on you. */
  contact: number;
  /** The next deal's number (world.deals). */
  nextDeal: number;
  /** Threats and their war bands, live or lately over (raids.ts), and the next one's number. */
  raids: Raid[];
  nextRaid: number;
  /** Wars between the rival cities, on or lately over (rivals.ts), and the next one's number. */
  wars: War[];
  nextWar: number;
  /** The pairs of rulers feuding now ('athens-sparta', in RULED order), so a feud's start and end are news once. */
  feuds: string[];
  /** Loans either way, live or lately over (loans.ts), and the next one's number. */
  loans: Loan[];
  nextLoan: number;
  /** Your expeditions, out or lately home (expeditions.ts), and the next one's number. */
  expeditions: Expedition[];
  nextExpedition: number;
  /** Slice 31: the empty sites and their colonies (growth.ts), in SITES order. */
  sites: Site[];
}

/**
 * What a line of the stock book is about: a ware made (by a kind of
 * workplace), used (by homes in a district, or a workshop as its input),
 * sold or bought (to or from whom), or lost (to fire, collapse or clearing).
 */
export type StockKind = 'made' | 'used' | 'sold' | 'bought' | 'lost';

/**
 * A line of the stock book: every measure of one ware of one kind about one
 * thing in a month, added up. `what`: the building kind that made or used it,
 * `homes:<district>` for what homes in a district used, who it was sold to or
 * bought from, or how it was lost ('fire', 'collapse', 'cleared').
 */
export interface StockLine {
  ware: number;
  kind: StockKind;
  what: string;
  n: number;
}

/** A month of the stock book in short: each kind's total of each ware (by ware index; missing is none). */
export interface StockMonth {
  month: number;
  made: number[];
  used: number[];
  sold: number[];
  bought: number[];
  lost: number[];
}

/**
 * The city's stock book, kept like the ledger: this month's lines and last
 * month's, and the last twelve months in short (oldest first), so the side
 * panel can say what each ware's net is, where it goes, and how it has moved.
 * Only read by the UI: nothing in the sim depends on it.
 */
export interface StockBook {
  /** The month (months since the founding) the `now` lines are for. */
  month: number;
  now: StockLine[];
  last: StockLine[];
  months: StockMonth[];
}

/**
 * Selling to the merchant ship: for each good she buys (TRADE_GOODS in
 * trade.ts: wheat, meat, cheese, oil, fleece, wine, in that order) whether
 * it is for sale and how much the city keeps in its stores; and the ship.
 */
export interface Trade {
  sell: boolean[];
  keep: number[];
  ship: Ship;
  /** What was on the quay when the post last went (cleared, burnt or fallen in), of each good, and when (0: never). */
  lost: number[];
  lostAt: number;
}

/**
 * The merchant ship. Where she is at any moment follows from her route, her
 * phase, when it began and the tick (shipAt in trade.ts), so she is drawn
 * smoothly between ticks and nothing about her lives outside the state.
 */
export interface Ship {
  /** 0 away, 1 sailing in, 2 tied up and loading, 3 sailing off (SHIP_* in trade.ts). */
  phase: number;
  /** The tick she is due to tie up at the trading post (0: none due, there is no post). */
  due: number;
  /** The tick this phase began. */
  since: number;
  /** Sailing off: how far along her way in she was when she turned (1 from the quay). */
  turned: number;
  /** Her way in, from the horizon to the jetty, as x, z pairs (world units; empty while she is away). */
  path: number[];
  /** The trading post she is calling at (its id; 0 while away). */
  post: number;
  /** What she has loaded this visit, by trade good (measures). */
  hold: number[];
  /** Visits so far. */
  visits: number;
  /** Her last visit: the tick she sailed off (0: none yet), what she bought by trade good, and what she paid. */
  lastAt: number;
  lastBought: number[];
  lastPaid: number;
  /** Slice 35: her pace on this voyage, a share of the usual days in and out (set only while the Lighthouse burns; absent, the usual). */
  pace?: number;
}

// ---------------------------------------------------------------------------
// The fleet (slice 26, see fleet.ts). Nothing here draws on any random
// numbers: a town with no shipyard and no raid from the sea has an empty
// fleet and plays exactly as it did before.

/** A man rowing in a trireme: from his home (a hut or a cottage), who he is and who he is known by there. */
export interface Rower {
  home: number;
  name: string;
  father: string;
  house: string;
  kin: ServesAs;
}

/**
 * One of your triremes. Building at her shipyard, moored at its jetty,
 * rowing in your waters (to a foe, home to the jetty, out to sea or in from
 * it), away on the map of Greece (guarding a lane, or carrying a force), or
 * sinking. Where she is in the bay is kept tick by tick (x, z, her heading,
 * her way and how far along it); on the map of Greece it is a pure function
 * of the tick (from `a0` to `a1` along her lane, from `start` over `dur`).
 */
export interface Trireme {
  id: number;
  /** Her number in the city (names her: NAMES in fleet.ts), and her shipyard (a building id). */
  n: number;
  yard: number;
  state: 'building' | 'moored' | 'rowing' | 'away' | 'sinking';
  /** Rowing: to a foe, home to the jetty, out to sea (for a lane), or in from it. */
  task: '' | 'fight' | 'home' | 'out' | 'in';
  /** Her standing order: guard the bay, guard a sea lane (`lane`: its way's id), or away with a force (slice 28; `lane`: the way). */
  order: 'bay' | 'lane' | 'away';
  lane: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  path: number[];
  along: number;
  /** Her hull, 0 to 100. Building: how far along she is (ticks of work done). */
  hp: number;
  work: number;
  crew: Rower[];
  /** In a fight: the enemy ship she is after (0 none), ticks until she can ram again, the tick she last rammed and the tick she was last struck. */
  foe: number;
  cool: number;
  rammed: number;
  struck: number;
  /** On the map of Greece: from `a0` to `a1` along her lane, from `start` over `dur`; heading home or not. */
  start: number;
  dur: number;
  a0: number;
  a1: number;
  homeward: boolean;
  /** The tick she began to sink (0 afloat). */
  sank: number;
  /** Rowers' pay owed this month (drachmas; 0 paid). */
  owed: number;
  /** Slice 38: her oars, the share whole (0 to 100); laid up at her mooring under repair until hull and oars are whole. */
  oars: number;
  mend: boolean;
}

/** An enemy ship in your waters: one of a band's ships from the sea (raids.ts), sailing in, drawn up on the beach, sailing off, or sinking. */
export interface EnemyShip {
  id: number;
  raid: number;
  slot: number;
  /** Slice 38: or holding her station across your harbour mouth, a blockade's ship. */
  state: 'sailing' | 'beached' | 'leaving' | 'sinking' | 'holding';
  x: number;
  z: number;
  hx: number;
  hz: number;
  path: number[];
  along: number;
  /** Slice 38: a blockade's ship (its id; `raid` is 0), and her pace across your waters (a share of the usual; absent, the usual). */
  blockade?: number;
  pace?: number;
  /** The tick she sets off from the horizon (ships come in a little apart). */
  from: number;
  hp: number;
  /** Men aboard (sailing in), or left to guard her (beached). */
  men: number;
  /** Where she runs up on the beach (world units, in the shallows) and the beach tile beside it. */
  bx: number;
  bz: number;
  tile: number;
  /** Sailing off with loot aboard. */
  laden: boolean;
  /** The tick she last struck a trireme and was last struck, and when she began to sink (0 afloat); ticks until she strikes again. */
  struck: number;
  hit: number;
  sank: number;
  cool: number;
}

/**
 * Pirates on a sea lane (fleet.ts): seen first, preying on your goods that
 * pass their place from `from`, gone at `until`; or beaten by your triremes.
 */
export interface Pirates {
  id: number;
  /** The lane (a way's id), the city it leads to, and their place on it (PIRATE_PLACES in fleet.ts). */
  way: string;
  city: CityId;
  place: string;
  ships: number;
  seen: number;
  from: number;
  until: number;
  state: 'seen' | 'preying' | 'gone' | 'beaten';
  /** What they have seized, in words, and how often. */
  took: string[];
  /** The tick your triremes last fought them (0 never). */
  fought: number;
  /** Slice 38: a city's warships in a war (whose; absent: pirates), the rival war's id (-1: a war with you), and the expeditions that have met them (id, and 1 coming home). */
  of?: CityId;
  war?: number;
  met?: number[];
}

/** A sea fight on a lane, for the report: when, where, and what happened. */
export interface SeaReport {
  tick: number;
  way: string;
  city: CityId;
  won: boolean;
  line: string;
}

/** The city's triremes, enemy ships in its waters, pirates on the lanes, and the reports of fights at sea. */
export interface Fleet {
  triremes: Trireme[];
  ships: EnemyShip[];
  pirates: Pirates[];
  reports: SeaReport[];
  nextId: number;
  /** Slice 38: fleets sent to blockade your harbour, coming, holding or lately over. */
  blockades: Blockade[];
}

// ---------------------------------------------------------------------------
// Marble and timber (slice 32, see materials.ts). Nothing here draws on any
// random numbers: a town with no loggers' camp has nothing felled.

/** A tree a logger felled (its number in the baked map's plants) and the tick it fell: a stump, then a sapling, back to a tree REGROW after. */
export interface Felled {
  tree: number;
  at: number;
}

/** What the quarries and loggers' camps leave on the land: the trees felled and growing back, by tree number (replaced as a new list whenever it changes). */
export interface Materials {
  felled: Felled[];
}
