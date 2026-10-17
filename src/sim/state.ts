import type { CityId } from '../map/greece';
import type { RngState } from './rng';

/** Bump when the shape of SimState changes, so old saves fail clearly. */
export const SIM_STATE_VERSION = 14;

/** What stands on a map tile: nothing, a road, or a building (by id, > 0). */
export const TILE_EMPTY = 0;
export const TILE_ROAD = -1;

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
  | 'trading';
/** Every kind of building, in the order saves have always listed them. */
export const BUILDING_KINDS: readonly BuildingKind[] = ['home', 'fountain', 'farm', 'granary', 'agora', 'shrine', 'theatre', 'taxoffice', 'lodge', 'dairy', 'grove', 'press', 'storehouse', 'pasture', 'vineyard', 'winery', 'watchpost', 'architect', 'rubble', 'trading'];

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
}

/** What a walker is (see Walker.kind). */
export type WalkerKind = 'settler' | 'leaver' | 'water' | 'cart' | 'porter' | 'food' | 'oil' | 'priestess' | 'actor' | 'tax' | 'hunter' | 'fleece' | 'wine' | 'watchman' | 'inspector' | 'docker';
/** Every kind of walker, in the order saves have always listed them. */
export const WALKER_KINDS: readonly WalkerKind[] = ['settler', 'leaver', 'water', 'cart', 'porter', 'food', 'oil', 'priestess', 'actor', 'tax', 'hunter', 'fleece', 'wine', 'watchman', 'inspector', 'docker'];

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
  /** came: founded the house; joined: more family moved in; up / down: the home changed level; warn: a need ran out; relief: it came back in time; left: people moved away. */
  what: 'came' | 'joined' | 'up' | 'down' | 'warn' | 'relief' | 'left';
  /** The need it was about (a Service), 'tax' for someone driven out by harsh taxes, or ''. */
  need: '' | Service | 'tax';
  /** The home's level after it. */
  level: number;
  /** Who it was about. */
  names: string[];
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
  warned: Service[];
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
export type LedgerKind = 'taxes' | 'sales' | 'refund' | 'wages' | 'building' | 'fire' | 'collapse' | 'clearing';

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
  /** What kind of thing it was ('history', 'trait', 'first'; later gifts, refusals, promises…). */
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
  /** How the ruler feels about each other city (by CITY_IDS order; 0 for itself and for cities without a ruler). */
  ties: number[];
  make: number[];
  need: number[];
  stock: number[];
  price: number[];
  history: number[][];
  /** The last harvest: 0 failed, 1 poor, 2 fair, 3 good, 4 rich. */
  harvest: number;
  /** The tick its festival ends (0: none on). */
  festival: number;
  /** The city it is at war with ('' at peace). */
  war: CityId | '';
}

/** A trade route from your city to another (slice 16 opens them). */
export interface TradeRoute {
  city: CityId;
  kind: 'land' | 'sea';
  /** The tick it was opened, and when its next trader sets off. */
  opened: number;
  next: number;
  /** What you have sold them and bought from them this year, by trade good. */
  sold: number[];
  bought: number[];
}

/** A ruler's request, offer, demand for tribute or threat, with its deadline (slices 19 and 20). */
export interface Deal {
  kind: 'request' | 'offer' | 'tribute' | 'threat';
  city: CityId;
  /** The trade good (by TRADE_GOODS order), or -1 for drachmas. */
  good: number;
  amount: number;
  /** When it was made, and by when it must be met. */
  at: number;
  due: number;
  state: 'open' | 'promised' | 'met' | 'refused' | 'broken' | 'lapsed';
}

/**
 * Someone on the move on the map (a trader, goods sent as a gift, an army, a
 * war band), along one of the ways (WAYS in map/greece.ts). Where they are is a
 * pure function of the tick: `start` and `dur` along the way, outward from your
 * city or homeward to theirs.
 */
export interface Traveller {
  kind: 'trader' | 'gift' | 'army' | 'raiders';
  city: CityId;
  way: string;
  start: number;
  dur: number;
  homeward: boolean;
}

/** A line of news from Greece. */
export interface NewsItem {
  tick: number;
  city: CityId;
  line: string;
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
}
