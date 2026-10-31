import { CREW, crewWhy, enemyDoing, triremeDoing, triremeName, triremeOf } from './sim/fleet';
import './ui/style.css';
import './ui/skin.css';
import * as THREE from 'three';
import { earshot } from './audio/earshot';
import { Sound, type Cue } from './audio/sound';
import { ClockDriver, type Speed } from './game/clockDriver';
import { DEMOS } from './game/demos';
import { attachInput, type PointerTools } from './game/input';
import { readLaunch } from './game/links';
import { browserStorage, decodeSave, labelOf, Saves, type SaveFile, type Slot } from './game/saves';
import { PREPARED } from 'virtual:prepared';
// Slice 37
import { foundingOf, settlersShipStatus } from './sim/colonies';
// Slice 43
import { cargoesFor, cargoShipStatus } from './sim/colonyworks';
// Slice 47: a company's or a militia's ship in your bay.
import { bayShipStatus } from './sim/colonyempire';
// Slice 40: the tribute and share ships' hover.
import { tributeShipStatus } from './sim/vassals';
import { Tools, type ToolName } from './game/tools';
import { VIEWS } from './game/views';
// Slice 42: the map is the state's land's, baked once the state is known.
import { BAY, landOf, mapOf } from './map/lands';
// Slice 46: founding on a land of the player's choosing, each kind in its own colours.
import { pinLand, seedOf, type LandKind } from './map/lands';
import { roadsIn } from './map/landcheck';
import { applyLandPalette } from './render/landlook';
import { KIND_WORDS, NewGame } from './ui/newgame';
import { foundPart } from './game/links';
import { districtGrid } from './map/districts';
import { CLASSIC_PIXELS, classicOn, classicSun, EYE, setClassic } from './render/classic';
import { applyFinishLight, applyFinishPalette, makeFinishPost, patchFinish, setFinish } from './render/finish';
import { CameraRig, cityLimits, type CameraView } from './render/cameraRig';
import { CityView } from './render/city';
import { ServiceOverlay } from './render/overlay';
import { HazardView } from './render/hazards';
// Slice 41
import { CrimeMarks } from './render/misdeeds';
import { isCriminal } from './sim/crime';
import { Selection, Signs } from './render/signs';
import { Placement } from './render/placement';
import { SUN_DIR, World } from './render/world';
import { isBridge } from './sim/build';
import { BUILDING_NAMES, centreOf, FINE, findBuilding, footSide, TOWNHOUSE, VILLA } from './sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './sim/clock';
import { lackWords, warningOf, warningsOf } from './sim/folk';
import { FLEECE, held, OIL, TIMBER, WHEAT, WINE } from './sim/foods';
import { loggerDoing } from './sim/materials';
import { goodUntil, hasStall } from './sim/goods';
import { workforce } from './sim/labour';
import { arrivalOutlook } from './sim/settlers';
import { herdStatus, homeStatus, moneyTip, raidChipNow, townLines, walkerStatus, type Status } from './sim/status';
import { kindTotal, monthOf, owedWages, totals } from './sim/treasury';
import { purseTotal } from './sim/taxes';
import { TILE_ROAD, type Building, type Herd, type Walker, type WallPiece } from './sim/state';
import { wallAt } from './sim/walls';
import { wallStatus } from './sim/wallstatus';
import { Sim, undoRefusal } from './sim/sim';
import { pointerTip } from './ui/buildbar';
import { Floaters } from './ui/floaters';
import { buildCorner } from './ui/help';
import { HouseholdPanel } from './ui/household';
import { LedgerCard } from './ui/ledger';
import { TradePanel } from './ui/trade';
// Slice 38: the shipyard's panel.
import { ShipyardPanel } from './ui/shipyard';
// Slice 45: the crime overlay's colours. (Merge of slice 45: the court's and the prison's panels are the building panel's, through its registry.)
import { CRIME_KIND_TONES } from './render/overlay';
// Slice 49: health, for the probes.
import { healthFigures } from './sim/health';
import { blockadeWords } from './sim/blockades';
import { shipNews, SHIP_AWAY, SHIP_COMING, tradingPost } from './sim/trade';
import { giftNews, giftWords } from './sim/diplomacy';
import { giftOf, position } from './sim/walk';
import { caravanOf, caravansOnMap, caravanYard, routeNews, routeOf, tradersNews, visitorOnMap, type RouteKind, type TraderNews } from './sim/routes';
import { SaveMenu } from './ui/saveMenu';
import { PANEL_ICONS, SidePanel } from './ui/sidepanel';
import { prepareSkin } from './ui/skin';
import { TownLines } from './ui/townlines';
import { RaidChip } from './ui/raidchip';
import { ArmyChip } from './ui/armychip';
import { DebtsChip } from './ui/debtschip';
// Slice 39.
import { AmbitionPanel } from './ui/ambition';
import { AMBITION_NAMES, ambitionTownLine, ambitionView, fameWords, laurelCount, MILESTONE_COUNT, nearest, placeOf, rewardWords } from './sim/ambitions';
import { debtsChip as debtsNow, whose as whoseCity } from './sim/loans';
import { raidOfBand } from './sim/raids';
import { Orders } from './game/orders';
import { companyOf, doingWords, menOf, strength, woundedOf } from './sim/army';
import { companyWords, foeDoing } from './sim/battle';
import { soldierStatus } from './sim/armystatus';
import { Welcome } from './ui/welcome';
import { TopBar } from './ui/topbar';
import { GreeceButton } from './ui/greeceButton';
import type { GreeceMap } from './render/greece/index';
import type { CityTab } from './ui/greece';
// Slice 44.
import { MessagePopups, MessagesPanel, MessageWatch, popsUp } from './ui/messages';
import { titleOf, unread, type Message, type MessageKind } from './sim/messages';
import type { Command } from './sim/commands';
import type { SimState } from './sim/state';
import { PLACES, type CityId } from './map/greece';
import { DEFAULT_SEED } from './sim/sim';
// Slice 30.
import { talliesNow, type CrimeTally } from './sim/crime';
// Slice 33.
import { RAIN, seasonNews, STORM, weatherNow, yearPhase } from './sim/seasons';
import { applySeasonUniforms, seasonLook } from './render/seasons';
import { buildRain } from './render/rain';
// Slice 48: a building's panel, and a paused workplace's plaque.
import { BuildingPanel, ownPanel } from './ui/buildingpanel';
import { PauseMarks } from './render/pausemarks';
import { ALARM, WARNING } from './sim/messages';
// Merge of slice 46: a founding's news.
import { say } from './sim/messages';
import { storeCartsOf } from './sim/storerules';
import { WARES } from './sim/foods';
// Slice 51: the overview.
import { Overview, type OverviewPage } from './ui/overview';
// Slice 50: the panels' kit (one tip for every panel, held steppers).
import { installKit, tipShowing } from './ui/kit';
// Merge of slice 50 with slice 49: the health legend's rod.
import { actionIcon } from './ui/icons';
// Slice 55: the monsters at the gates, drawn, and a monster's panel.
import { MonstersView } from './render/monsters';
import { MonsterPanel } from './ui/monsterpanel';
import { beastTip, monsterOf, sendMonster, STIR } from './sim/monsters';
import type { MonsterId } from './sim/pantheon';
// Slice 59: the heroes, drawn; the hall chooser; their tips.
import { HeroesView } from './render/heroes';
import { HeroChooser } from './ui/heroes';
import { hallOf, heroOf, heroTip, legendTip } from './sim/heroes';
import { HERO_IDS, type HeroId } from './sim/pantheon';

interface Probe {
  ready: boolean;
  frames: number;
  bakeMs: number;
  startMs: number;
  /** Main-thread time spent before drawing, summed over all frames (sim steps and view updates), in ms. */
  updateMs: number;
  /** Of that, the side panel's and the minimap's, in ms. */
  sideMs: number;
  /** When (ms since the page began loading) the game was ready, and when its first frame was drawn. */
  readyAt?: number;
  firstFrameAt?: number;
  /** How long the demo's town took to prepare (its setup ticks, or decoding its prepared town), within startMs. */
  setupMs?: number;
  /** Whether the demo opened from its town prepared at build time (slice 22), and how long fetching it took (before startMs). */
  prepared?: boolean;
  fetchMs?: number;
  /** How long making the interface's materials took (fonts, tiles, frames), in ms, alongside the fetch. */
  skinMs?: number;
  /** Every demo's token (for the measurements' load of each). */
  demos: string[];
  info?: () => { triangles: number; calls: number; geometries: number; textures: number };
  /** Slice 33 (for judging the look): show the land at another point of the year (0 to 4 from 1 March) and weather, or the sim's own again (no argument). */
  lookAt?: (phase?: number, rain?: number, storm?: number) => void;
  /** Slice 33: the look now (the year phase it shows and how wet it is). */
  look?: () => { phase: number | null; rain: number; storm: number };
  setView?: (name: string) => void;
  jump?: (view: CameraView) => void;
  view?: () => Required<CameraView>;
  tick?: () => number;
  meshes?: () => Array<{ name: string; count: number; triangles: number; shadow: boolean }>;
  city?: () => {
    population: number;
    money: number;
    homes: number;
    tents: number;
    huts: number;
    cottages: number;
    fountains: number;
    farms: number;
    granaries: number;
    agoras: number;
    carriers: number;
    vendors: number;
    carts: number;
    porters: number;
    watered: number;
    fed: number;
    jobs: number;
    filled: number;
    barns: number;
    stored: number;
    stall: number;
    bridges: number;
    taxes: number;
    wages: number;
    taxesNow: number;
    owed: number;
    taxRate: number;
    offices: number;
    collectors: number;
    ledgerOpen: boolean;
    ratesOpen: boolean;
    walkers: number;
    people: number;
    roads: number;
    cleared: number;
    tool: string | null;
    overlay: boolean;
    overlayMode: string | null;
    following: boolean;
    warned: number;
    signs: number;
    panel: number;
    undo: string;
    routes: number;
    markWrites: number;
    homesRefilled: number;
    lodges: number;
    dairies: number;
    hunters: number;
    herdHead: number;
    animals: number;
    meat: number;
    cheese: number;
    varied: number;
  };
  /** Screen position of the first water carrier, if one is out. */
  carrier?: () => { x: number; y: number } | null;
  /** Screen position of the first walker of a kind (water, food, cart, porter), if one is out. */
  walker?: (kind: string) => { x: number; y: number } | null;
  /** World position of the first walker of a kind, if one is out. */
  where?: (kind: string) => { x: number; z: number } | null;
  /** The text of the pointer tip, if it shows. */
  tipText?: () => string | null;
  /** The household panel's text ('' when closed). */
  panelText?: () => string;
  /** World position of a hunter on his way home with a kill, if any. */
  homeward?: () => { x: number; z: number } | null;
  /** World position of an ox cart carrying a food (0 wheat, 1 meat, 2 cheese), if any. */
  cartOf?: (food: number) => { x: number; z: number } | null;
  /** Where a porter carrying a ware (loaded) is drawn, if one is out. */
  porterOf?: (ware: number) => { x: number; z: number } | null;
  /** Buildings of a kind: top-left tile and id. */
  buildingsOf?: (kind: string) => Array<{ id: number; x: number; z: number }>;
  /** Slice 32: the trees felled and growing back, and where the works' walkers are drawn (a logger by what he is doing: out, chopping, trimming, home). */
  works?: () => { felled: number; quarrymen: number; sledges: number; logCarts: number; loggers: Array<{ doing: string; x: number; z: number } | null> };
  /** A watchman running to (or fighting) a fire, where he is drawn. */
  dasher?: () => { x: number; z: number } | null;
  /** A watchman at a fire, throwing water on it. */
  fighter?: () => { x: number; z: number } | null;
  /** Buildings smouldering, burning or creaking (or with risk or wear past `from`): where and how far gone. */
  hazardsOf?: (from?: number) => Array<{ id: number; kind: string; x: number; z: number; side: number; fire: number; creak: boolean; risk: number; wear: number }>;
  /** The wild herds: where each stands and how many head it has. */
  herds?: () => Array<{ kind: string; x: number; z: number; head: number }>;
  /** Lived-in homes: where they are (top-left tile), their level, and whether they are warned. */
  homes?: () => Array<{ id: number; x: number; z: number; level: number; people: number; warned: boolean; left: number }>;
  tool?: (t: string | null) => void;
  /** Screen position of a world point (for driving the mouse in tests). */
  /** Where a world point is on the screen: on the ground there, or at height `y` (merge of slice 48: a ship's hull is at the sea's surface, not on the sea bed under her). */
  screenOf?: (x: number, z: number, y?: number) => { x: number; y: number };
  speed?: (s: Speed) => void;
  /** The save slots as the menu sees them, and what the last save said. */
  saves?: () => { available: boolean; manual: unknown; auto: unknown; autosaving: boolean; loaded: string; problem: string; lastSave: string };
  /** Save by hand now ('' when saved). */
  saveNow?: () => string;
  /** The shortfall lines showing under the top bar. */
  townLines?: () => string[];
  gifts?: () => Array<{ id: number; from: string; to: string; good: number; amount: number; got: number; by: string; phase: number; deal: number; caravan: { x: number; z: number } | null; porters: Array<{ x: number; z: number }>; ship: { visible: boolean; x: number; z: number } | null }>;
  /** Rulers' requests, offers and demands for tribute, and how each stands. */
  deals?: () => Array<{ id: number; kind: string; city: string; good: number; amount: number; state: string; promised: boolean; gift: number; due: number; done: number; angry: boolean }>;
  /** Loans either way (slice 27): each one's city, side, state and numbers, and the debts chip's text. */
  loans?: () => { loans: Array<{ id: number; city: string; side: string; by: string; state: string; amount: number; rate: number; months: number; owed: number; due: number; gift: number; deal: number }>; chip: string; chipShown: boolean; overdue: boolean };
  /** Slice 20: the raids, the band in the city (where it is drawn), whether the chip shows, and how many walkers are indoors from it. */
  raids?: () => { raids: Array<{ id: number; city: string; phase: string; end: string; men: number; took: number; fired: boolean; coin: number; deal: number }>; band: { x: number; z: number; back: boolean; load: number; drawn: boolean } | null; chip: string; indoors: number };
  sound?: () => { started: boolean; muted: boolean; played: number; state: string };
  welcome?: () => boolean;
  /** The ledger card's text ('' when closed). */
  ledgerText?: () => string;
  /** The trading post's panel text ('' when closed), opening or closing it, and where the ship is. */
  tradeText?: () => string;
  /** Slice 38: the shipyard's panel's text ('' while it is shut). */
  shipyardText?: () => string;
  /** Slice 38: the triremes' hulls, oars and repairs, the blockades and the warships on the lanes. */
  /** Slice 40: the tribute and share ships drawn in the bay, where each is (for hovering them in tests). */
  tributeShips?: () => Array<{ key: string; visible: boolean; x: number; z: number }>;
  seas?: () => { triremes: { id: number; state: string; task: string; hp: number; oars: number; mend: boolean }[]; ships: { id: number; state: string; blockade: number; x: number; z: number }[]; blockades: { city: string; phase: string; ships: number; sunk: number; end: string }[]; warships: { way: string; of: string; ships: number }[]; words: string };
  /** A docker carrying a ware (any, -1) to the quay (back) or back to a store, where he is drawn. */
  dockerOf?: (ware: number, back?: boolean) => { x: number; z: number } | null;
  trade?: (open: boolean, tab?: string) => void;
  ship?: () => { visible: boolean; x: number; z: number; heading: number; version: string; phase: number; due: number; since: number; visits: number; lastPaid: number; chip: string; short: string };
  /** The trade routes: each one's trader (a foreign ship where it is drawn, or the caravan in the city), its travellers on the map of Greece, its news and visits; and the trade panel's tab. */
  traders?: () => { tab: string; routes: Array<{ key: string; next: number; visits: number; lastPaid: number; lastCost: number; short: string; ship: { visible: boolean; x: number; z: number; phase: number } | null; caravan: { x: number; z: number; back: boolean; trading: boolean; donkeys: number } | null; onMap: number[] }> };
  /** Open or close the ledger card, or the tax rates card. */
  ledger?: (open: boolean) => void;
  rates?: (open: boolean) => void;
  /** The side panel's text ('' when hidden), showing or hiding it, opening a tab or a ware's page, and what it shows. */
  sideText?: () => string;
  side?: (open: boolean) => void;
  sideTab?: (tab: string) => void;
  /** The army (slice 23): the company whose banner is in hand, and each company with its banner's screen point. */
  army?: () => { selected: number; hint: string; companies: Array<{ id: number; kind: string; order: string; x: number; z: number; men: number; ready: number; screen: { x: number; y: number } | null }> };
  /** Take a company's banner in hand (0: let go). */
  selectCompany?: (id: number) => void;
  /** Slice 24: send a player's command (as the panel would), play the city on a number of ticks at once, and the fight as it stands. */
  order?: (c: Parameters<Sim['enqueue']>[0]) => void;
  skip?: (ticks: number) => void;
  foeScreen?: () => { x: number; y: number } | null;
  /** Slice 25: the walls (each stretch's tile, strength and whether a gate), the towers and their archers, the band's siege and breaches, tower arrows in the air. */
  walls?: () => { pieces: Array<{ t: number; hp: number; gate: boolean }>; towers: Array<{ id: number; x: number; z: number; workers: number }>; siege: number; breaches: number; towerArrows: number; hammering: number };
  /** Slice 26: the fleet (triremes and enemy ships, each where she is and what she is doing; pirates; reports) and what the fleet view draws. */
  fleet?: () => { triremes: Array<{ id: number; name: string; state: string; task: string; order: string; lane: string; x: number; z: number; hp: number; crew: number; work: number }>; ships: Array<{ id: number; raid: number; state: string; x: number; z: number; hp: number; men: number; laden: boolean }>; pirates: Array<{ way: string; state: string; ships: number; took: number }>; reports: string[]; shown: Array<{ kind: string; id: number; x: number; z: number }> };
  battle?: () => { foes: number; fighting: number; fallen: number; arrows: number; broke: boolean; killed: number; wounded: number; centre: { x: number; z: number } | null; news: string[] };
  /** Slice 28: your expeditions (see expeditions.ts). */
  expeditions?: () => Array<{ id: number; city: string; kind: string; phase: string; loan: number; companies: number[]; ships: number[]; men: number; won: boolean; coin: number; goods: number; killed: number; wounded: number; report: string[] }>;
  /** Open a building's panel (0: close it). */
  showPanel?: (id: number) => void;
  /** The homes a soldier comes from (slice 23). */
  servingHomes?: () => number[];
  sideWare?: (ware: number) => void;
  /** Debug: how long building each tab's HTML takes (ms, the mean of n). */
  sideBench?: (n: number) => Record<string, number>;
  sideState?: () => { open: boolean; tab: string; ware: number; paints: number; draws: number };
  /** Debug, for screenshots only: make a home warned about every need it has (it changes the state outside the command queue). */
  warnAll?: (id: number) => void;
  /** Open or close the map of Greece (loading it the first time), optionally with a city's panel; and what it shows. */
  greece?: (open: boolean, city?: string, tab?: string) => void;
  greeceInfo?: () => Record<string, unknown>;
  /** Put the map of Greece's camera somewhere (a table x, z, and yaw, distance, tilt), for a close look in a screenshot. */
  greeceJump?: (v: { x: number; z: number; yaw: number; dist: number; tilt: number }) => void;
  /** Show the map of Greece's hover card for a thing on it ('war-3-sparta', 'fields-athens', a city), as if the pointer were at a screen point. */
  greeceHover?: (x: number, y: number) => void;
  /** A point on the screen towards the rear of a moving piece on the map of Greece (two thirds of the way from its head to its tail), to check that its whole body answers the pointer. */
  greeceBody?: (key: string) => { x: number; y: number } | null;
  /** The map's first open: ms from asking to its first frame drawn, and of that how long building its scene took. */
  greeceOpenMs?: number;
  greeceBuildMs?: number;
  /** Slice 30: crime: the switch, the tallies, the news, each thief out (where he is drawn, and his state), and the homes tempted from `from` up. */
  crime?: (from?: number) => { on: boolean; now: CrimeTally; last: CrimeTally; news: string[]; thieves: Array<{ id: number; home: number; target: number; back: boolean; load: number; loot: number; chased: number; drawn: { x: number; z: number } | null }>; chasing: number; tempted: Array<{ id: number; x: number; z: number; level: number; tempt: number }>; kinds?: boolean; criminals?: Array<Record<string, unknown>>; gangs?: unknown[]; broken?: unknown[]; talk?: unknown[]; marks?: { marks: number; shards: number; flags: number } };
  /** Slice 39: the ambitions (the switch, each milestone's progress and laurel, the chip's text and the town line), and the panel opened or closed, and its text. */
  ambition?: () => Record<string, unknown>;
  ambitionPanel?: (open: boolean) => string;
  // Slice 44
  /** The town's messages: the log (its last 80, or `last`), the seal's count and colour, the Messages panel (opened, closed or filtered first) and its text, the popup showing. */
  messages?: (open?: boolean, filter?: string, last?: number) => Record<string, unknown>;
  /** What the town has heard: the lines under the top bar, then every message's words, oldest first (the news the lines once told). */
  heard?: () => string[];
  // Slice 42
  /** The town's land (kind, size, seed), its site, how many road tiles are laid (and the first on the west edge), the camera's view, and how long its map took to bake. */
  land?: () => { kind: string; size: number; seed: number; site: { x: number; z: number } | null; roads: number; edgeRoad: number; view: { x: number; z: number; dist: number }; bakeMs: number };
  // Slice 48
  /** A building's panel: opened on a building (an id; 0 closes it) first if given; what it shows, and the paused plaques drawn. */
  building?: (id?: number) => { id: number; open: boolean; text: string; plaques: number };
  /** A building's orders and a store's rules, and the store-to-store carts on the road from or to it. */
  store?: (id: number) => { paused: boolean; first: boolean; workers: number; rules: number[]; held: number[]; out: number; coming: number } | null;
  /** Slice 45: the court's or a prison's panel opened on a building (0 shuts it), and its text; the law, the cases, the held, the stocks, the convicts walking and each prison's unrest. */
  justicePanel?: (at: number) => string;
  justice?: () => { law: Record<string, string>; cases: number; held: number; stocks: number; pinned: number[]; convicts: number; jails: Array<{ at: number; unrest: number; warned: boolean }>; text: string };
  // Slice 46
  /** The new-game screen's choice while it is open (null when it isn't). */
  newgame?: () => { kind: string; size: number; word: string; seed: number } | null;
  // Slice 51
  /** The overview: opened on a page (or closed, with null) first if given; whether it is open, its page, and what it says. */
  overview?: (page?: string | null) => { open: boolean; page: string; text: string };
  /** Time spent bringing the overview up to date (ms, summed). */
  overviewMs?: number;
  // Slice 49
  /** Health: the city's figures, the plague in Greece, the outbreak, the quarantine; what is drawn (the sick at doors, patients, braziers, pennants, physicians and bearers walking); the trade panel's and the building panel's text. */
  health?: () => { on: boolean; sick: number; plague: number; inBeds: number; average: number; called: number; risk: string; greece: Array<{ city: string; warned: boolean }>; outbreak: { struck: number; dead: number; fled: number } | null; quarantine: number; drawn: { doors: number; beds: number; fires: number; flags: number }; physicians: number; bearers: number; ship: number; trade: string; building: string; lines: string[] };
  /** Order or lift the quarantine (as the panels' button does). */
  quarantine?: (on: boolean) => void;
  // Slice 50
  /** The kit's tip showing ('' when none). */
  kitTip?: () => string;
  // Slice 55
  /** The monsters: each one's kind, state, place and health; what is drawn; the panel (opened on a monster first if given, 0 shuts it) and its text; the tip over the first one drawn. */
  monsters?: (open?: number) => { list: Array<{ id: number; kind: string; state: string; x: number; z: number; hp: number; full: number; lair: number; den: string }>; drawn: { figures: number; lairs: number; stones: number }; panel: string; tip: string };
  /** For the smoke test and looking: a monster sent as its god would (walking in at once), or one in its lair sent out (due in a day). */
  monsterSend?: (kind: string, why: string) => number;
  monsterRaid?: (id: number) => boolean;
  /** Where a monster is on screen (its middle), or null. */
  monsterOnScreen?: (id: number) => { x: number; y: number } | null;
  // Slice 59
  /** The heroes: each one's state, place and hall; what is drawn; the tip over the first one drawn; a hall's panel (opened on the hall of the hero given). */
  heroes?: (open?: string) => { list: Array<{ hero: string; state: string; x: number; z: number; hall: number; foe: number }>; drawn: { halls: number; heroes: number; legends: number; dancers: number }; tip: string; panel: string; chooser: boolean };
  /** Where a hero is on screen (their middle), or null. */
  heroOnScreen?: (hero: string) => { x: number; y: number } | null;
}

const probe: Probe = { ready: false, frames: 0, bakeMs: 0, startMs: 0, updateMs: 0, sideMs: 0, demos: Object.keys(DEMOS) };
(window as unknown as { __zeus: Probe }).__zeus = probe;

function start(preparedTown: string | null): void {
  const t0 = performance.now();
  const launch = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const demo = launch.demo ? DEMOS[launch.demo] : undefined;
  const view0 = VIEWS[launch.cam ?? demo?.view ?? 'coast'] ?? VIEWS.coast;
  const speed: Speed = launch.speed ?? demo?.speed ?? 'normal';
  const shot = launch.shot;

  // The city's finish (render/finish.ts); a link ending in -plain opens with the old look.
  setFinish(!launch.plain);
  // The original Zeus look (render/classic.ts); -modern opens with the look of 24 Oct.
  setClassic(!launch.plain && !launch.modern);
  applyFinishPalette();
  classicSun(SUN_DIR);
  // A new game shuffles Greece from a seed of its own (the city keeps its seed, so the coast opens as ever); a demo's Greece comes from its city's seed.
  // Slice 42: a prepared town is read first, so that a demo on a generated land founds there (and the Bay isn't baked for nothing).
  const ready = preparedTown ? decodeSave(preparedTown) : null;
  // A saved town asked for by the link (#continue, #autosave, #saved) is read first too (slice 42's review: so a town on a generated land founds there, and the Bay isn't baked for nothing).
  const saves = new Saves(browserStorage());
  let loaded: SaveFile | null = null;
  let problem = '';
  if (launch.load && !demo) {
    const slot: Slot | null = launch.load === 'newest' ? saves.newest() : launch.load;
    if (!saves.available) problem = 'Saving isn’t available in this window, so there is no saved town here to open.';
    else if (!slot) problem = 'There is no saved town in this browser yet.';
    else {
      const r = saves.load(slot);
      if (r.ok) {
        loaded = r.file;
      } else problem = r.why;
    }
    // The link has done its work: reloading the page now starts afresh (with a way back to the save).
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      /* Not allowed here; reloading would open the save again, which is harmless. */
    }
  }
  const tFound = performance.now();
  // Slice 46: a founding link (#found.<kind>.<size>.<word>) founds a new game on its land.
  const founding = !demo && !launch.load && launch.found ? { kind: launch.found.kind as LandKind, size: launch.found.size, seed: seedOf(launch.found.word) } : null;
  let foundRoad = '';
  const sim = demo || launch.load ? new Sim(DEFAULT_SEED, DEFAULT_SEED, demo?.setup && ready?.ok ? landOf(ready.file.state) : loaded ? landOf(loaded.state) : BAY) : new Sim(DEFAULT_SEED, (Math.random() * 0x100000000) >>> 0, founding ?? BAY);
  const tSetup = performance.now();
  // (Founding bakes the land's map: counted in the bake's time below.)
  const foundMs = tSetup - tFound;
  // Fire risk and wear build up in every game (a demo turns them on as it opens).
  // A demo opens from its town prepared when the game was built (the same state its setup makes, checked then), or plays its setup.
  if (demo?.setup && ready?.ok) {
    sim.state = ready.file.state;
    probe.prepared = true;
  } else if (demo?.setup) demo.setup(sim);
  else {
    sim.enqueue({ type: 'hazards', on: true });
    // Slice 30: and crime (with taxes day by day, harsh taxes' harder bite and fire's gentler first year).
    sim.enqueue({ type: 'crime', on: true });
    // Slice 33: and the seasons.
    sim.enqueue({ type: 'seasons', on: true });
    // Slice 39: and the ambitions, counting from the founding.
    sim.enqueue({ type: 'ambition', on: true });
    // Slice 41: and the new kinds of crime and gangs.
    sim.enqueue({ type: 'crimes', on: true });
    // Slice 49: and health (no plague in the town's first year).
    sim.enqueue({ type: 'health', on: true });
    // Phase 7 groundwork: and the gods, watching from the founding.
    sim.enqueue({ type: 'gods', on: true });
    sim.flush();
    // Slice 46: on a land founded from the new-game screen, the road in is laid at once (from the edge nearest the city's ground).
    if (founding) {
      const r = roadsIn(sim.map, sim.state);
      const road = r.road;
      foundRoad = road.length > 0 ? `${road.length} tiles from the ${r.from} edge` : '';
      if (road.length > 0) {
        sim.enqueue({ type: 'road', tiles: road });
        sim.flush();
      }
      // (Merge of slice 46: the founding is the scroll's first news, under City, its link at the road's end by the city's ground.)
      const name = (KIND_WORDS.find((k) => k.kind === founding.kind)?.name ?? 'A new land').replace(/^A /, 'a ').replace(/^Islands offshore/, 'a coast with islands offshore');
      say(sim.state, { kind: 'land', words: `Your city is founded on ${name}. ${road.length > 0 ? `The road in is laid, ${foundRoad}: families will come along it.` : 'Lay a road in from the edge of the map, and families will come along it.'}`, at: road.length > 0 ? { tile: road[road.length - 1] } : undefined });
    }
  }
  probe.setupMs = performance.now() - tSetup;

  // A saved town asked for by the link (#continue, #autosave, #saved), read above, is opened before anything draws it.
  if (loaded) sim.state = loaded.state;
  // Slice 42: the map of the town's land (a demo's, a save's, or a new game's: the Bay), baked now that the town is known.
  const tBake = performance.now();
  const map = mapOf(sim.state);
  // Slice 46: the town's land is kept baked whatever the new-game screen shows, and drawn in its kind's colours.
  pinLand(landOf(sim.state));
  applyLandPalette(landOf(sim.state).kind);
  // Which district each tile is in (for the ledger's taxes), worked out now rather than as the first collector calls (about 25 ms).
  districtGrid(map);
  probe.bakeMs = foundMs + performance.now() - tBake;
  // A generated land opens over its own bay (its site), unless the link asks for a view.
  const site = map.data.site;
  const landView: CameraView | null = site && !launch.cam && (!demo || demo.view === 'land') ? { x: site.x, z: site.z - 4, yaw: 0.12, dist: 100, tilt: -0.5 } : null;
  const view = loaded?.view ? { ...VIEWS.coast, ...loaded.view } : (landView ?? view0);
  const driver = new ClockDriver(sim, speed);

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  canvas.tabIndex = 0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // Capped at 1.5: on high-density screens full resolution costs a lot of shading for little gain.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  // The original look (render/classic.ts): the original's pixel size, drawn hard-edged.
  if (classicOn()) {
    renderer.setPixelRatio(CLASSIC_PIXELS);
    canvas.style.imageRendering = 'pixelated';
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const world = new World(map);
  const city = new CityView(map, world.plants);
  world.scene.add(city.group);
  const terrainMesh = world.scene.getObjectByName('terrain-map') as THREE.Mesh;
  const placement = new Placement(map, terrainMesh.geometry);
  world.scene.add(placement.mesh);
  const overlay = new ServiceOverlay(map, placement);
  overlay.wanted = launch.overlay || demo?.overlayOn ? (demo?.overlay ?? 'water') : null;
  world.scene.add(overlay.group);
  const signs = new Signs(map);
  world.scene.add(signs.group);
  const hazardView = new HazardView(map);
  world.scene.add(hazardView.group);
  // Slice 41: what the new crimes leave in the street (smashed buildings, gangs' dens, talk of burning).
  const crimeMarks = new CrimeMarks(map);
  world.scene.add(crimeMarks.group);
  // Slice 48: a paused workplace's plaque.
  const pauseMarks = new PauseMarks(map);
  world.scene.add(pauseMarks.group);
  // Slice 55: the monsters, their lairs and Medusa's stone figures.
  const monstersView = new MonstersView(map);
  world.scene.add(monstersView.group);
  // Slice 59: the heroes' halls, the heroes, the places of legend and the fête.
  const heroesView = new HeroesView(map);
  world.scene.add(heroesView.group);
  const selection = new Selection(map);
  world.scene.add(selection.mesh);
  // A demo can ring a tile until a road is laid on it (#warning's cut road), so it is easy to find.
  const mark = demo?.mark ? new Selection(map, '#fff8e6', 'mark') : null;
  if (mark && demo?.mark) {
    mark.set({ id: -1, ...demo.mark }, 1);
    world.scene.add(mark.mesh);
  }
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 9000);
  applyFinishLight(world.scene, renderer);
  // Slice 33: the season's look and the day's weather (render/seasons.ts, render/rain.ts).
  const rain = buildRain();
  world.scene.add(rain.mesh);
  const look = seasonLook(null);
  let wetNow = -1;
  let stormNow = 0;
  let lookOver: { phase: number; rain: number; storm: number } | null = null;
  let lookPhase: number | null = null;
  probe.lookAt = (phase, rain = 0, storm = 0) => {
    lookOver = phase === undefined ? null : { phase, rain, storm };
  };
  probe.look = () => ({ phase: lookPhase, rain: wetNow, storm: stormNow });
  const finish = makeFinishPost(renderer, world.scene, camera);
  const rig = new CameraRig(camera, map, view, cityLimits(map.size));
  // The original look's fixed view (render/classic.ts).
  rig.setClassic(classicOn());
  // Slice 33: the camera keeps out of the trees on hillsides.
  rig.setCanopy((x, z) => world.plants.canopyAt(x, z));

  const ui = document.getElementById('ui') as HTMLElement;
  // Slice 50
  installKit(document.body);
  const topbar = new TopBar(ui, driver);
  // The first-time hint says left-drag moves the view, which isn't so with a tool already picked.
  // The bare link opens on the coast with a welcome card (which carries the controls line itself).
  const welcoming = !demo && !loaded && !shot;
  const corner = buildCorner(ui, !shot && !demo?.tool && !welcoming, classicOn());
  const tip = pointerTip(ui);
  const tools = new Tools(sim, placement, tip, overlay);
  /** The company whose banner or man is under a screen point (set once the city view is up; 0: none). */
  let armyPick: (sx: number, sy: number) => { company: number; soldier: number; d?: number } = () => ({ company: 0, soldier: 0 });
  const orders = new Orders(
    sim,
    placement,
    tip,
    (sx, sy) => armyPick(sx, sy).company,
    () => tools.tool !== null,
    (sx, sy) => {
      const id = armyPick(sx, sy).soldier;
      const x = id ? sim.state.army.soldiers.find((o) => o.id === id) : undefined;
      return x ? soldierStatus(sim.state, x).title : '';
    },
  );
  // Picking up a build tool lets go of a banner.
  tools.onChange((t) => {
    if (t) orders.select(0);
  });
  // Picking a tool puts the welcome card away.
  tools.onChange((t) => {
    if (t) welcomeCard?.dismiss();
  });
  const CUES: Record<string, Cue> = { road: 'road', plots: 'plots', fountain: 'build', build: 'build', clear: 'clear', undo: 'undo' };
  tools.onAct = (c) => {
    if (!c) return sound.play('refuse');
    sound.play(CUES[c.type] ?? 'build');
    // A prepared town (a demo) only starts saving itself once it has been saved by hand, so trying things in a demo never overwrites the autosave of your own town.
    if (c.type !== 'undo') startAutosaving();
  };
  const floaters = new Floaters(ui);
  const sound = new Sound();
  // Under the top bar: the shortfall lines, the follow chip and the overlay legend, stacked.
  const notices = document.createElement('div');
  notices.className = 'notices';
  ui.appendChild(notices);
  // The chips (a raid, the army, debts) side by side in one row, not stacked one under another (phase 4's review: three stacked pushed the lines down over Greece's cities).
  const chips = document.createElement('div');
  chips.className = 'chiprow';
  notices.prepend(chips);
  const raidChip = new RaidChip(chips, (city) => toggleGreece(true, city as CityId, 'ruler'));
  const armyChip = new ArmyChip(chips, () => side.showTab('army'));
  // While a loan stands either way: the next date due (red while one is overdue); it opens the Administration tab (the old Money tab), where every loan is listed.
  const debtsChip = new DebtsChip(chips, () => side.showTab('administration'));
  const panel = new HouseholdPanel(ui, () => panel.show(0));
  // The trading post's panel shares the household panel's place: one at a time.
  const tradePanel = new TradePanel(ui, (c) => {
    sim.enqueue(c);
    sim.flush();
    sound.play('build');
    startAutosaving();
    linesAt = -Infinity;
  });
  tradePanel.onOpen = () => panel.show(0);
  // Slice 38: the shipyard's panel, in the same place: one at a time (with the household's and the trading post's).
  const shipyardPanel = new ShipyardPanel(ui, (c) => {
    sim.enqueue(c);
    sim.flush();
    sound.play('build');
    startAutosaving();
    linesAt = -Infinity;
  });
  shipyardPanel.onOpen = () => {
    panel.show(0);
    tradePanel.toggle(false);
  };
  tradePanel.onOpen = () => {
    panel.show(0);
    shipyardPanel.toggle(false);
  };
  // (The Army tab's fleet has a button that opens it.)
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest?.('button[data-act="shipyard"]') as HTMLButtonElement | null;
    if (b) shipyardPanel.show(Number(b.dataset.id) || 0);
  });
  /** Open the trading post's panel and go to the post. */
  const goToPost = (): void => {
    const p = tradingPost(sim.state);
    if (!p) return;
    stopFollow();
    tradePanel.showTab('tyre');
    const [cx, cz] = centreOf(p);
    const v = rig.view;
    rig.flyTo({ ...v, x: cx, z: cz, dist: Math.min(v.dist, 30) });
  };
  /** The trader the top bar's chip shows (its click goes there). */
  let traderChip: TraderNews | null = null;
  /** Open the trade panel on a trader's tab ('tyre', or a route: 'corinth-land') and go to where it trades. */
  const goToTrader = (who: string): void => {
    if (who === 'tyre') return goToPost();
    const [city, kind] = who.split('-');
    const r = routeOf(sim.state, city, kind as RouteKind);
    if (!r) return;
    stopFollow();
    tradePanel.showTab(who);
    // A caravan walking in: follow it down the street to the yard.
    const walking = r.kind === 'land' ? caravanOf(sim.state, r.city) : undefined;
    if (walking && !walking.back && walking.wait === 0) return startFollow(walking.origin, 'caravan', walking.id);
    const depot = r.kind === 'land' ? caravanYard(sim.state) : tradingPost(sim.state);
    if (!depot) return;
    const [cx, cz] = centreOf(depot);
    const v = rig.view;
    rig.flyTo({ ...v, x: cx, z: cz, dist: Math.min(v.dist, 30) });
  };
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.hidden = true;
  const MISSING_LEGEND = '<b>What’s missing</b><span><i class="warn"></i>Going down a level unless it comes</span><span><i class="want"></i>Needs it to grow</span><span><i class="fine"></i>Has all it needs</span>';
  const VARIETY_LEGEND =
    '<b>On the table</b><span><i class="bread"></i>Bread</span><span><i class="meat"></i>Meat</span><span><i class="cheese"></i>Cheese</span><span><i class="short"></i>A kind it needs and lacks</span><span><i class="want"></i>Another kind would lift it</span>';
  // Slice 45: the crime overlay's key (its columns by the crime each home turns to).
  const CRIME_LEGEND = `<b>Crime</b>${(['theft', 'pickpocket', 'vandal', 'arson', 'smuggling'] as const).map((k) => `<span><i style="background:${CRIME_KIND_TONES[k]}"></i>${{ theft: 'Theft', pickpocket: 'Picking pockets', vandal: 'Smashing things', arson: 'Burning', smuggling: 'Smuggling' }[k]}</span>`).join('')}<span><i class="fine"></i>Content</span>`;
  legend.innerHTML = MISSING_LEGEND;
  let legendFor = 'missing';
  // Slice 49: the health overlay's legend.
  // (Merge of slice 50: the kit's rod of Asklepios before its name, and its swatches in the stylesheet.)
  const HEALTH_LEGEND = `<b class="hl">${actionIcon('health')}Health</b><span><i class="fine"></i>Well or healthy</span><span><i class="want"></i>Sickly</span><span><i class="warn"></i>Ailing</span><span><i class="sick"></i>Someone sick</span><span><i class="plague"></i>Plague</span>`;
  const lines = new TownLines(notices, (l) => {
    if (l.need === 'money') return ledger.toggle(true);
    // Slice 39: a laurel's line opens the Ambition panel.
    if (l.need === 'ambition') return ambitionPanel.toggle(true);
    if (l.need === 'ship') return goToPost();
    if (l.need === 'trader') return goToTrader(l.route ?? 'tyre');
    if (l.need === 'greece' || l.need === 'favour' || l.need === 'loan' || l.need === 'raid' || l.need === 'alarm') return toggleGreece(true, (l.route as CityId | undefined) ?? undefined, l.need === 'greece' ? undefined : l.need === 'loan' ? 'loans' : 'ruler');
    // Slice 34: your empire's line opens its city's Empire tab.
    if (l.need === 'empire') return toggleGreece(true, (l.route as CityId | undefined) ?? undefined, 'empire');
    // Slice 30 (review): a thief out: close in on him and follow him (he is small and dark at the usual distance).
    // (Slice 41: or any kind of criminal.)
    const thief = l.need === 'crime' ? sim.state.walkers.find((o) => isCriminal(o.kind) && o.people > 0 && o.home === l.at) : undefined;
    if (thief) {
      const at = city.walkers.serviceAt.get(thief.id)?.pos;
      const v = rig.view;
      rig.flyTo({ ...v, x: at?.x ?? v.x, z: at?.z ?? v.z, dist: Math.min(v.dist, 14) });
      return startFollow(thief.origin, thief.kind, thief.id);
    }
    const b = findBuilding(sim.state, l.at);
    if (!b) return;
    stopFollow();
    const [cx, cz] = centreOf(b);
    const v = rig.view;
    rig.flyTo({ ...v, x: cx, z: cz, dist: Math.min(v.dist, 30) });
    if (l.need === 'food' && overlay.mode !== 'food') overlay.toggle('food');
  });
  notices.appendChild(legend);
  const followChip = document.createElement('div');
  followChip.className = 'follow-chip';
  followChip.hidden = true;
  notices.appendChild(followChip);
  // A banner in hand: what it is and what to do (slice 23).
  const ordersChip = document.createElement('div');
  ordersChip.className = 'follow-chip orders-chip';
  ordersChip.hidden = true;
  notices.appendChild(ordersChip);
  /** Take a company's banner in hand (0: let go), putting down any tool. */
  const takeBanner = (id: number): void => {
    if (id && tools.tool) tools.select(null);
    orders.select(id);
  };
  orders.onChange((id) => {
    ordersChip.hidden = !id;
    ordersChip.textContent = orders.hint();
  });
  orders.onAct = (c) => {
    if (!c) return sound.play('refuse');
    sound.play('build');
    if (c.type !== 'undo') startAutosaving();
    linesAt = -Infinity;
  };
  let welcomeCard: Welcome | null = null;
  // Saving: by hand (the scroll button, Ctrl+S), and by itself every three
  // months and when the page is left, once the player has built something
  // this session or opened a save. A demo saves itself only once it has been
  // saved by hand: building in one doesn't touch the autosave.
  let autosaving = loaded !== null;
  // A new town begun on the bare link while the autosave holds another town: like a demo, it saves itself only once it
  // has been saved by hand, so starting afresh never loses the town you had (the saves card and a note say so).
  const keptAuto = !demo && loaded === null && saves.available && !!saves.info('auto')?.label;
  let keptNoted = false;
  /** The player has done something in this town: it saves itself from now on (but a demo, or a new town over another's autosave). */
  const startAutosaving = (): void => {
    if (autosaving || demo) return;
    if (!keptAuto) {
      autosaving = true;
      return;
    }
    if (keptNoted) return;
    keptNoted = true;
    const l = saves.info('auto')?.label;
    saveMenu.flash(`Your autosaved town${l ? ` (${l.date}, ${l.people.toLocaleString('en-GB')} people)` : ''} is kept: this new one saves itself once you save it by hand (Ctrl+S).`);
  };
  let lastAuto = sim.state.tick;
  let savedRev = loaded ? sim.state.rev : -1;
  let leaving = false;
  let lastSave = '';
  /** Whether the note has said so after an autosave this session, and why the last autosave failed ('' if it didn't). */
  let autoNoted = false;
  let autoProblem = '';
  const writeSave = (slot: Slot): string => {
    const why = saves.save(slot, sim.state, Date.now(), rig.view);
    lastSave = why || `${slot}:${sim.state.tick}`;
    if (!why) {
      savedRev = sim.state.rev;
      if (slot === 'auto') lastAuto = sim.state.tick;
    }
    return why;
  };
  const go = (hash: string): void => {
    leaving = true;
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    } catch {
      location.hash = hash;
    }
    location.reload();
  };
  const saveMenu = new SaveMenu(ui, corner.el, {
    saves,
    save: (slot) => {
      const why = writeSave(slot);
      if (!why) {
        autosaving = true;
        sound.play('save');
        saveMenu.flash(`Saved · ${labelOf(sim.state).date}`);
      }
      return why;
    },
    load: (slot) => {
      // Keep the town on screen in the autosave first, unless that is the save being opened.
      if (slot === 'manual' && autosaving && sim.state.rev !== savedRev) writeSave('auto');
      go(slot === 'auto' ? '#autosave' : '#saved');
    },
    fresh: () => {
      if (autosaving && sim.state.rev !== savedRev) writeSave('auto');
      go('');
    },
    unsaved: () => autosaving && sim.state.rev !== savedRev,
    autosave: () => ({ on: autosaving, problem: autoProblem, demo: !!demo, kept: keptAuto && !autosaving }),
  });
  // The saves card, the controls card and the ledger share the top right corner: one at a time.
  const ledger = new LedgerCard(ui);
  saveMenu.onOpen = () => {
    corner.toggleHelp(false);
    ledger.toggle(false);
    topbar.toggleRates(false);
  };
  corner.onHelpOpen(() => {
    saveMenu.toggle(false);
    ledger.toggle(false);
    topbar.toggleRates(false);
  });
  ledger.onOpen = () => {
    saveMenu.toggle(false);
    corner.toggleHelp(false);
    topbar.toggleRates(false);
  };
  // The tax rates card opens under its chip, over the corner: it puts the corner's cards away too.
  topbar.onRatesOpen = () => {
    saveMenu.toggle(false);
    corner.toggleHelp(false);
    ledger.toggle(false);
  };
  topbar.onMoney(() => ledger.toggle());
  // Slice 39: the Ambition panel, from the laurel chip; it shares the top of the screen with the corner's cards, one at a time.
  const ambitionPanel = new AmbitionPanel(ui);
  ambitionPanel.onOpen = () => {
    saveMenu.toggle(false);
    corner.toggleHelp(false);
    ledger.toggle(false);
    topbar.toggleRates(false);
  };
  {
    const ledgerOpen = ledger.onOpen;
    ledger.onOpen = () => {
      ledgerOpen?.();
      ambitionPanel.toggle(false);
    };
    const savesOpen = saveMenu.onOpen;
    saveMenu.onOpen = () => {
      savesOpen?.();
      ambitionPanel.toggle(false);
    };
    const ratesOpen = topbar.onRatesOpen;
    topbar.onRatesOpen = () => {
      ratesOpen?.();
      ambitionPanel.toggle(false);
    };
    corner.onHelpOpen(() => ambitionPanel.toggle(false));
  }
  topbar.onLaurel(() => ambitionPanel.toggle());
  // (Review of slice 39: the chip's tip is the game's own, kept left of the side panel, whose column would hide it.)
  topbar.laurelTips((text, x, y) => {
    tip.show(text, x, y);
    const el = ui.querySelector('.pointer-tip') as HTMLElement | null;
    if (!text || !el) return;
    const r = side.el.getBoundingClientRect();
    const room = r.width > 0 && r.left > 0 ? r.left : innerWidth;
    if (x + 16 + el.offsetWidth > room - 8) tip.show(text, Math.max(8, room - 24 - el.offsetWidth), y);
  });
  let laurelFresh = false;
  ambitionPanel.onLaurel = (cue) => {
    sound.play(cue);
    laurelFresh = true;
  };
  topbar.onShip(() => goToTrader(traderChip?.who ?? 'tyre'));
  // The tax rate, through the command queue like any other action.
  topbar.setupRates(ui, (rate) => {
    if (rate === sim.state.taxRate) return;
    sim.enqueue({ type: 'tax', rate });
    sim.flush();
    sound.play('build');
    startAutosaving();
  });
  const autosaveNow = (): void => {
    if (!autosaving || leaving || !saves.available || sim.state.rev === savedRev) return;
    writeSave('auto');
  };
  addEventListener('pagehide', autosaveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autosaveNow();
  });

  // The mute switch, beside the saves.
  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn mute-btn';
  const showMute = (m: boolean): void => {
    muteBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="#7a5c3c" stroke="#7a5c3c" stroke-width="1.2" stroke-linejoin="round"/>${m ? '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" stroke="#a24e2c" stroke-width="1.8" stroke-linecap="round"/>' : '<path d="M15.2 9a4.2 4.2 0 0 1 0 6M17.6 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="#7a5c3c" stroke-width="1.6" stroke-linecap="round"/>'}</svg>`;
    muteBtn.title = m ? 'Sound is off: click to turn it on' : 'Sound is on (the sea, birds, the streets): click to turn it off';
    muteBtn.setAttribute('aria-label', m ? 'Turn sound on' : 'Turn sound off');
    muteBtn.classList.toggle('off', m);
  };
  showMute(sound.muted);
  sound.onChange(showMute);
  muteBtn.addEventListener('click', () => sound.toggle());
  corner.el.insertBefore(muteBtn, corner.el.firstChild);

  // The control panel down the right: the minimap with road, clear, undo and the overlays round it, then a tab for
  // each kind of building, with its buildings and that part of the city's state.
  const side = new SidePanel(ui, map, {
    goTo: (x, z, jump) => {
      stopFollow();
      const v = rig.view;
      if (jump) rig.jumpTo({ ...v, x, z });
      else rig.flyTo({ ...v, x, z });
    },
    faceNorth: () => rig.faceNorth(),
    tool: (t) => tools.select(t),
    undo: () => tools.undo(),
    overlay: (m) => overlay.toggle(m),
    overlayMode: () => overlay.mode,
    ledger: () => ledger.toggle(true),
    rates: () => topbar.toggleRates(true),
    openHome: (id) => {
      tradePanel.toggle(false);
      panel.show(id);
    },
    army: (c) => orders.send(c),
    // (The view stays where it is, so you can take each company's banner in turn and plant it where you are looking:
    // review of phase 4. The company's place on its row is a link that goes to it.)
    selectCompany: (id) => {
      const c = companyOf(sim.state, id);
      if (!c || id === orders.selected) return takeBanner(0);
      takeBanner(id);
    },
    selected: () => orders.selected,
    loans: (city) => toggleGreece(true, city as CityId, 'loans'),
    toggled: () => resize(),
  });
  tools.onChange((t) => side.showTool(t));

  // The welcome card on the bare link.
  const newest = saves.newest();
  // Slice 46: with a way to the new-game screen, and its words for a city founded on a land of its own.
  let newGame: NewGame | null = null;
  const lookPart = launch.plain ? '-plain' : launch.modern ? '-modern' : '';
  const openNewGame = (): void => {
    if (newGame?.open) return;
    newGame = new NewGame(ui, {
      start: launch.found ? { kind: launch.found.kind as LandKind, size: launch.found.size, word: launch.found.word } : undefined,
      onBack: () => {
        newGame = null;
      },
      onFound: (kind, size, word) => {
        // The Bay is the bare link's coast: on it already, the card just goes.
        if (kind === 'bay' && !founding && !launch.newgame) {
          newGame?.close();
          welcomeCard?.dismiss();
        } else go(kind === 'bay' ? (lookPart ? `#${lookPart.slice(1)}` : '') : `#${foundPart(kind, size, word)}${lookPart}`);
      },
    });
  };
  probe.newgame = () => (newGame?.open ? { ...newGame.choice } : null);
  // Slice 50
  probe.kitTip = tipShowing;
  const foundedLand = founding ? KIND_WORDS.find((k) => k.kind === founding.kind) : undefined;
  welcomeCard = welcoming || problem
    ? new Welcome(ui, {
        saved: newest ? saves.info(newest) : null,
        onContinue: () => go('#continue'),
        problem: problem ? `That saved town couldn’t be opened. ${problem}` : '',
        noStorage: !saves.available,
        onNewGame: openNewGame,
        land: foundedLand ? { name: foundedLand.name, line: foundedLand.line, road: foundRoad } : undefined,
      })
    : null;
  if (launch.newgame && welcoming) openNewGame();
  if (loaded) {
    // A town saved before taxes came in (phase 1) says what changed.
    let changed = loaded.from === 6 ? ' · Rent is gone: taxes come in with a tax collector now. Build a tax office (Z) by the houses.' : '';
    // …and one saved before meat and cheese (slice 8 or older), with townhouses or better, says what they need now and how long they have.
    if (loaded.from !== undefined && loaded.from <= 7 && sim.state.buildings.some((b) => b.kind === 'home' && b.people > 0 && b.level >= TOWNHOUSE)) {
      changed += ' · Townhouses now need two kinds of food and fine houses all three: build a hunting lodge (M M) near the game and a dairy (M M M) on green land.';
    }
    // …and one saved before oil (slice 9 or older), with townhouses or better; its grace (eight months from loading) covers the food above too.
    if (loaded.from !== undefined && loaded.from <= 8 && sim.state.buildings.some((b) => b.kind === 'home' && b.people > 0 && b.level >= TOWNHOUSE)) {
      changed += ' · Townhouses now need oil: plant olive groves on the dry slopes (M ×4), build an olive press (M ×5), a storehouse (G G) and an oil stall on an agora (K K). They have eight months before they start to worry.';
    }
    // …and one saved before fleece (slice 10 or older), with fine houses; they have eight months from loading.
    if (loaded.from !== undefined && loaded.from <= 9 && sim.state.buildings.some((b) => b.kind === 'home' && b.people > 0 && b.level >= FINE)) {
      changed += ' · Fine houses now need fleece: put a sheep pasture on the grass (M ×6), a storehouse (G G) and a fleece stall on an agora (K ×3). They have eight months before they start to worry. With wine as well (a vineyard M ×7, a winery M ×8, a wine stall K ×4) they become villas.';
    }
    // …and one saved before fire and collapse (slice 11 or older): everything starts safe and sound, and the risk builds from here.
    if (loaded.from !== undefined && loaded.from <= 10 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · Buildings can now catch fire and wear out. Yours start safe and sound: a watch post (Z Z) keeps fire away and an architect’s office (Z ×3) keeps them standing. A mark over a building shows when it is past half way.';
    }
    // …and one saved before the trading post (slice 12 or older): ships can call now.
    if (loaded.from !== undefined && loaded.from <= 11 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · Merchant ships now call: build a trading post (G ×3) on the bay shore where deep water comes close, and sell your spare wheat, meat, cheese, oil, fleece and wine.';
    }
    // …and one saved before slice 14's money: the taxes and harsh rates changed.
    if (loaded.from !== undefined && loaded.from <= 12 && sim.state.buildings.some((b) => b.kind === 'home' && b.people > 0)) {
      changed += ' · Taxes are retuned: the finer houses pay more, and harsh taxes now drive whole households out and keep newcomers away. Collectors are paid first when money runs short.';
    }
    // …and one saved before Greece (slice 14 or older): the map is there now.
    if (loaded.from !== undefined && loaded.from <= 13) {
      changed += ' · Greece is there now: the Greece tab under the top bar (or the Tab key) opens a map of the Aegean, with Athens, Sparta, Corinth and Troy, their rulers and what they make and want.';
    }
    // …and one saved before Greece went on by itself (slice 20 or older, with Greece).
    if (loaded.from !== undefined && loaded.from >= 14 && loaded.from <= 20) {
      changed += ' · Greece goes on by itself now: its rulers quarrel, feud and go to war with each other, and keep their festivals. The map of Greece (Tab) has the news.';
    }
    // …and one saved before the army (slice 22 or older): the city can arm itself.
    if (loaded.from !== undefined && loaded.from <= 21 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · The city can arm itself now: copper in the hills for a copper mine and an armoury (B B, B ×3), and a barracks (B ×4) that raises companies of hoplites and archers from your best homes. The Military tab in the side panel has them.';
    }
    // …and one saved before raiders were fought (slice 23 or older, with a town): raids come for the stores and the treasury now, and soldiers fight them.
    if (loaded.from !== undefined && loaded.from <= 22 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · Raiders now come for your stores and the tax office, and burn on their way; bands grow with your city. Companies placed in their way fight them, and a barracks can hire Cretan archers or Arcadian hoplites in a pinch.';
    }
    // …and one saved before walls (slice 24 or older, with a town): the city can wall itself in.
    if (loaded.from !== undefined && loaded.from <= 23 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · You can wall your city now: the wall tool (B ×5) draws stone walls, with gates where they cross a road, and towers (B ×6) on the wall shoot raiders. Raiders must go round a wall or break through it.';
    }
    // …and one saved before loans (version 24 or older): rulers lend and borrow now.
    if (loaded.from !== undefined && loaded.from <= 24 && sim.state.world.routes.length > 0) {
      changed += ' · Loans both ways now: ask a ruler to lend you coin, or lend them yours, on the Loans tab of their page on the map of Greece (Tab).';
    }
    // …and one saved before the fleet (version 25 or older, with a town): the sea.
    if (loaded.from !== undefined && loaded.from <= 25 && sim.state.buildings.some((b) => b.kind !== 'rubble')) {
      changed += ' · From the sea: raiders from Troy (and from cities you trade with only by sea) now come in ships and land on your beach. A shipyard on the shore (B ×7) builds triremes that fight them in the bay and guard your sea lanes from pirates.';
    }
    saveMenu.flash(`Welcome back · ${loaded.label.date} · ${loaded.label.people.toLocaleString('en-GB')} people${changed}`);
  }

  const WALKER_NAMES: Record<string, string> = { water: 'the water carrier', food: 'the food vendor', oil: 'the oil vendor', fleece: 'the fleece vendor', wine: 'the wine vendor', cart: 'the ox cart', porter: 'the porter', priestess: 'the priestess', actor: 'the actor', tax: 'the tax collector', hunter: 'the hunter', watchman: 'the watchman', inspector: 'the inspector', docker: 'the docker', caravan: 'the caravan', raider: 'the raiders', thief: 'the thief' };
  // Slice 41.
  Object.assign(WALKER_NAMES, { pickpocket: 'the pickpocket', vandal: 'the vandal', arsonist: 'the arsonist', smuggler: 'the smuggler' });

  // The banner or the soldier under a screen point: a banner's cloth within a finger's breadth, a man within a few pixels.
  armyPick = (sx, sy) => {
    const r = canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    const dist2 = (p: THREE.Vector3, lift: number): number => {
      v.copy(p).setY(p.y + lift).project(camera);
      if (v.z > 1) return Infinity;
      const dx = r.left + (v.x * 0.5 + 0.5) * r.width - sx;
      const dy = r.top + (-v.y * 0.5 + 0.5) * r.height - sy;
      return dx * dx + dy * dy;
    };
    let company = 0;
    let bd = 24 * 24;
    for (const [id, pos] of city.army.bannerAt) {
      const d = dist2(pos, 0);
      if (d < bd) {
        bd = d;
        company = id;
      }
    }
    if (company) return { company, soldier: 0 };
    let soldier = 0;
    bd = 14 * 14;
    for (const [id, pos] of city.army.soldierAt) {
      const d = dist2(pos, 0.22);
      if (d < bd) {
        bd = d;
        soldier = id;
      }
    }
    if (!soldier) return { company: 0, soldier: 0 };
    return { company: sim.state.army.soldiers.find((x) => x.id === soldier)?.company ?? 0, soldier, d: bd };
  };
  /** The raider nearest a screen point (within a few pixels), or 0; `most`: only one nearer than this (pixels squared). */
  const foeNear = (sx: number, sy: number, most = 14 * 14): number => {
    const r = canvas.getBoundingClientRect();
    let best = 0;
    let bd = most;
    const v = new THREE.Vector3();
    for (const [id, pos] of city.walkers.foeAt) {
      v.copy(pos).setY(pos.y + 0.24).project(camera);
      if (v.z > 1) continue;
      const dx = r.left + (v.x * 0.5 + 0.5) * r.width - sx;
      const dy = r.top + (-v.y * 0.5 + 0.5) * r.height - sy;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  };
  /** The walker with a job nearest a screen point (within a few pixels), if any. */
  const walkerNear = (sx: number, sy: number, most = 22): number => {
    const r = canvas.getBoundingClientRect();
    let best = -1;
    let bd = most * most;
    const v = new THREE.Vector3();
    for (const [id, { pos }] of city.walkers.serviceAt) {
      v.copy(pos).setY(pos.y + 0.3).project(camera);
      if (v.z > 1) continue;
      const dx = r.left + (v.x * 0.5 + 0.5) * r.width - sx;
      const dy = r.top + (-v.y * 0.5 + 0.5) * r.height - sy;
      if (dx * dx + dy * dy < bd) {
        bd = dx * dx + dy * dy;
        best = id;
      }
    }
    return best;
  };
  /** A monument or masons' yard under the pointer, by its mesh (phase 5 review: tall, so the ground under the pointer can be well behind it). */
  const monumentRay = new THREE.Raycaster();
  const monumentNdc = new THREE.Vector2();
  const monumentAt = (sx: number, sy: number): Building | undefined => {
    const r = canvas.getBoundingClientRect();
    monumentNdc.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    monumentRay.setFromCamera(monumentNdc, camera);
    const hit = city.monuments.pick(monumentRay);
    return hit ? findBuilding(sim.state, hit.id) : undefined;
  };
  const buildingAt = (world: { x: number; z: number } | null): Building | undefined => {
    const n = map.size;
    if (!world || world.x < 0 || world.z < 0 || world.x >= n || world.z >= n) return undefined;
    const on = sim.state.tiles[Math.floor(world.z) * n + Math.floor(world.x)];
    return on > 0 ? findBuilding(sim.state, on) : undefined;
  };
  /** The wild herd under a world point (its animals stand within a tile or so of its place), if any. */
  const herdAt = (world: { x: number; z: number } | null): Herd | undefined => {
    if (!world) return undefined;
    let best: Herd | undefined;
    let bd = 1.6;
    for (const h of sim.state.herds) {
      const d = Math.hypot(h.x - world.x, h.z - world.z);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    return best;
  };
  const bridgeAtPointer = (world: { x: number; z: number } | null): boolean => {
    const n = map.size;
    if (!world || world.x < 0 || world.z < 0 || world.x >= n || world.z >= n) return false;
    return isBridge(map, sim.state, Math.floor(world.z) * n + Math.floor(world.x));
  };
  /** The stretch of wall or gate under the pointer (slice 25), if any. */
  const wallAtPointer = (world: { x: number; z: number } | null): WallPiece | undefined => {
    const n = map.size;
    if (!world || world.x < 0 || world.z < 0 || world.x >= n || world.z >= n || sim.state.walls.length === 0) return undefined;
    return wallAt(sim.state, Math.floor(world.z) * n + Math.floor(world.x));
  };
  /** Is the pointer on the ship (near her hull or her mast, on screen)? */
  const shipNear = (sx: number, sy: number, at: { visible: boolean; x: number; z: number } = city.ship.info): boolean => {
    if (!at.visible) return false;
    const r = canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    for (const y of [0.4, 1.6]) {
      v.set(at.x, y, at.z).project(camera);
      if (v.z > 1) continue;
      const dx = r.left + (v.x * 0.5 + 0.5) * r.width - sx;
      const dy = r.top + (-v.y * 0.5 + 0.5) * r.height - sy;
      // Her size on screen: about two units either way.
      const near = new THREE.Vector3(at.x + 2, y, at.z).project(camera);
      const px = Math.max(18, Math.abs((near.x - v.x) * 0.5 * r.width));
      if (dx * dx + dy * dy < px * px) return true;
    }
    return false;
  };
  /** The foreign ship under the pointer, if any: her city. */
  const visitorNear = (sx: number, sy: number): string | null => {
    for (const [id, view] of city.visitors) if (shipNear(sx, sy, view.info)) return id;
    return null;
  };
  /** A trireme or an enemy ship under the pointer (slice 26), nearest first. */
  const fleetNear = (sx: number, sy: number): { kind: 'trireme' | 'enemy'; id: number } | null => {
    for (const o of city.fleet.shown) if (shipNear(sx, sy, o)) return { kind: o.kind, id: o.id };
    return null;
  };
  /** A trireme's or an enemy ship's tip. */
  const fleetStatus = (o: { kind: 'trireme' | 'enemy'; id: number }): Status | null => {
    if (o.kind === 'trireme') {
      const t = triremeOf(sim.state, o.id);
      if (!t) return null;
      // (Slice 38: her oars, and her shipyard's panel.)
      return { title: `The trireme ${triremeName(t)} · ${t.crew.length} of ${CREW} rowers · hull ${Math.round(t.hp)}% · oars ${Math.round(t.oars)}%`, detail: [triremeDoing(sim.state, t), crewWhy(sim.state, map, t), 'Click for her shipyard'].filter((l) => l).join('\n') };
    }
    const e = sim.state.fleet.ships.find((x) => x.id === o.id);
    if (!e) return null;
    return { title: enemyDoing(sim.state, e), detail: `Hull ${Math.max(0, Math.round(e.hp))}%${sim.state.fleet.triremes.some((t) => t.foe === e.id) ? ' · your triremes are on her' : ''}` };
  };
  /** A foreign ship's tip: who she is, where she is in her visit, what her city trades. */
  const visitorStatus = (id: string): Status => {
    const r = routeOf(sim.state, id, 'sea');
    const name = PLACES[id as CityId]?.name ?? id;
    return { title: `The ship from ${name}`, detail: [r ? `${routeNews(sim.state, r).line}` : '', `Click for the sea route to ${name}: what she buys and sells`].filter((x) => x).join('\n') };
  };
  /** The ship's tip: where she is in her schedule, what she buys. */
  const shipStatus = (): Status => {
    const news = shipNews(sim.state);
    return { title: 'The merchant ship from Tyre', detail: [news?.line ?? '', 'She buys wheat, meat and cheese from the granaries, oil, fleece and wine from the storehouses, at steady prices · click for the trading post'].filter((x) => x).join('\n') };
  };
  const showStatus = (st: Status, sx: number, sy: number): void => tip.show(st.detail ? `${st.title}\n${st.detail}` : st.title, sx, sy);
  // Slice 55: the monster under a screen point (its body, or its lair while it is inside healing or before it).
  const beastUnder = (sx: number, sy: number) => {
    if (!sim.state.legends.monsters.length) return undefined;
    const r = canvas.getBoundingClientRect();
    const id = monstersView.pick(camera, r, sx, sy) || monstersView.pickLair(camera, r, sx, sy);
    return id > 0 ? monsterOf(sim.state, id) : undefined;
  };

  // With no tool picked, hovering a home says who lives there and what reaches it; a workplace, how it is doing; a walker, what she's doing.
  const hover = (world: { x: number; z: number } | null, sx: number, sy: number): void => {
    // A soldier, or a company's banner; a raider nearer the pointer than the soldier (in a fight they stand close: slice 24's review).
    const pickedArmy = armyPick(sx, sy);
    const foeFirst = pickedArmy.soldier && pickedArmy.d !== undefined ? foeNear(sx, sy, pickedArmy.d) : 0;
    const ff = foeFirst ? sim.state.army.foes.find((o) => o.id === foeFirst) : undefined;
    if (ff) return showStatus(foeDoing(sim.state, ff), sx, sy);
    if (pickedArmy.soldier) {
      const x = sim.state.army.soldiers.find((o) => o.id === pickedArmy.soldier);
      if (x) {
        const st = soldierStatus(sim.state, x);
        if (x.company) st.detail = `${st.detail}\nClick to take his company’s banner in hand`;
        return showStatus(st, sx, sy);
      }
    }
    if (pickedArmy.company) {
      const co = companyOf(sim.state, pickedArmy.company);
      const hurt = co ? woundedOf(sim.state, co).length : 0;
      if (co) return showStatus({ title: `The banner of ${companyWords(co)} · ${menOf(sim.state, co).length} of ${co.want} men${hurt ? `, ${hurt} wounded` : ''}`, detail: [doingWords(sim.state, co).replace(/^./, (ch) => ch.toUpperCase()), co.why, 'Click to take its banner in hand, then click a street or open ground to march it there'].filter((l) => l).join('\n') }, sx, sy);
    }
    // Slice 59: a hero, or a place of legend.
    {
      const r = canvas.getBoundingClientRect();
      const h = heroesView.pick(camera, r, sx, sy);
      const c = h ? heroOf(sim.state, h) : undefined;
      if (c) {
        const st = heroTip(sim.state, c);
        return showStatus({ title: st.title, detail: `${st.detail}\nClick for ${c.hero === 'atalanta' ? 'her' : 'his'} hall` }, sx, sy);
      }
      const li = sim.state.legends.slain.length ? heroesView.pickLegend(camera, r, sx, sy) : -1;
      const lt = li >= 0 ? legendTip(sim.state, li) : null;
      if (lt) return showStatus(lt, sx, sy);
    }
    // Slice 55: a monster, or its lair.
    {
      const bm = beastUnder(sx, sy);
      if (bm) {
        const st = beastTip(sim.state, bm);
        return showStatus({ title: st.title, detail: `${st.detail}${monsterPanel.id === bm.id ? '' : '\nClick for its panel'}` }, sx, sy);
      }
    }
    // A raider (each of a band's men is a figure of his own).
    const foe = foeNear(sx, sy);
    const f = foe ? sim.state.army.foes.find((o) => o.id === foe) : undefined;
    if (f) return showStatus(foeDoing(sim.state, f), sx, sy);
    // (A monument under the pointer: one of its builders only when the pointer is right on him.)
    const tall = monumentAt(sx, sy);
    const c = walkerNear(sx, sy, tall ? 9 : 22);
    const w = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
    const ws = w ? walkerStatus(sim.state, w) : null;
    if (ws) return showStatus(ws, sx, sy);
    const fl = fleetNear(sx, sy);
    const fs = fl ? fleetStatus(fl) : null;
    if (fs) return showStatus(fs, sx, sy);
    if (shipNear(sx, sy)) return showStatus(shipStatus(), sx, sy);
    const visitor = visitorNear(sx, sy);
    if (visitor) return showStatus(visitorStatus(visitor), sx, sy);
    for (const [to, view] of city.giftShips) {
      if (!shipNear(sx, sy, view.info)) continue;
      const g = sim.state.world.gifts.find((x) => x.from === 'home' && x.to === to && x.phase === 1 && x.by === 'sea');
      if (g) return showStatus({ title: `${g.deal ? 'Your ship' : 'Your gift ship'} · ${giftWords(g.good, g.amount)} for ${PLACES[g.to].name}${g.deal ? (sim.state.world.deals.find((d) => d.id === g.deal)?.kind === 'tribute' ? ', as tribute' : sim.state.world.deals.find((d) => d.id === g.deal)?.kind === 'threat' ? ', the price of peace' : ', as they asked') : ''}`, detail: `${giftNews(sim.state, g)}. On the map of Greece she sails the lane to ${PLACES[g.to].name}` }, sx, sy);
    }
    // Slice 37: your settlers' ship, sailing in, at anchor while the families are rowed out, and sailing out with them.
    for (const [site, view] of city.colonyShips) {
      if (!shipNear(sx, sy, view.info)) continue;
      const f = foundingOf(sim.state, site);
      if (f) return showStatus(settlersShipStatus(sim.state, f), sx, sy);
    }
    // Slice 43: your ship taking goods out to a colony.
    // (Slice 47: every ship of the line, by her own key: two for one colony each have theirs; a company's or a militia's ship too.)
    for (const { key, view } of city.cargoShips) {
      if (!key || !shipNear(sx, sy, view.info)) continue;
      const x = key.startsWith('cargo-') ? cargoesFor(sim.state).find((y) => y.id === Number(key.slice(6))) : undefined;
      const st = x ? cargoShipStatus(sim.state, x) : bayShipStatus(sim.state, key);
      if (st) return showStatus(st, sx, sy);
    }
    // Slice 40: a vassal's tribute ship, or a colony's share ship.
    for (const [key, view] of city.tributeShips) {
      if (!shipNear(sx, sy, view.info)) continue;
      const t = sim.state.empire.tribute.find((y) => (y.colony ? `colony:${y.colony}` : y.city) === key && y.ship);
      if (t) return showStatus(tributeShipStatus(sim.state, t), sx, sy);
    }
    const b = tall ?? buildingAt(world);
    if (!b) {
      const h = herdAt(world);
      if (h) return showStatus(herdStatus(sim.state, h), sx, sy);
      const piece = wallAtPointer(world);
      if (piece) return showStatus(wallStatus(sim.state, map, piece), sx, sy);
      return tip.show(bridgeAtPointer(world) ? 'A timber bridge' : null, sx, sy);
    }
    const st = homeStatus(sim.state, map, b);
    // A lived-in home: its family's name, and a click opens their panel.
    if (b.family && b.people > 0) {
      st.title = `The house of ${b.family.name} · ${st.title.replace(/^A /, 'a ')}`;
      if (panel.id !== b.id) st.detail = `${st.detail ? st.detail + '\n' : ''}Click to see who lives here`;
    }
    // Slice 48.
    else if (buildingPanel.id !== b.id && !ownPanel(b.kind)) st.detail = `${st.detail ? st.detail + '\n' : ''}Click for its panel`;
    showStatus(st, sx, sy);
  };

  // Following a walker with a job: through her rests and new rounds (the next one from the same place), until the player moves the view.
  let follow: { walker: number; origin: number; kind: Walker['kind']; pans: number } | null = null;
  const startFollow = (origin: number, kind: Walker['kind'], walker = 0): void => {
    follow = { walker, origin, kind, pans: rig.pans };
    // (A lender's army, slice 28: its collectors, not raiders.)
    const band = kind === 'raider' && walker ? sim.state.walkers.find((o) => o.id === walker) : undefined;
    const r = band ? raidOfBand(sim.state, band) : undefined;
    followChip.textContent = `Following ${r?.loan ? `${whoseCity(r.city)} collectors` : (WALKER_NAMES[kind] ?? 'them')} · drag the map or press Esc to stop`;
    followChip.hidden = false;
  };
  const stopFollow = (): void => {
    follow = null;
    followChip.hidden = true;
  };
  const updateFollow = (): void => {
    if (!follow) return;
    if (rig.pans !== follow.pans) return stopFollow();
    // Raiders: the band itself, until it leaves the map (what it came for may burn down under it).
    if (follow.kind === 'raider') {
      const band = city.walkers.serviceAt.get(follow.walker);
      if (!band) return stopFollow();
      return rig.follow(band.pos.x, band.pos.z);
    }
    const f = findBuilding(sim.state, follow.origin);
    if (!f) return stopFollow();
    let at = city.walkers.serviceAt.get(follow.walker);
    if (!at) {
      // Her round is over: the next one out from the same place, if any.
      const mine = sim.state.walkers.filter((o) => o.origin === f.id && o.kind === follow?.kind);
      // (A lodge has several hunters out: the one who set out last, if any is still on his way out.)
      const next = follow.kind === 'hunter' ? (mine.filter((o) => !o.back).sort((a, b) => a.walked - b.walked)[0] ?? mine[0]) : mine[0];
      if (next) {
        follow.walker = next.id;
        at = city.walkers.serviceAt.get(next.id);
      }
    }
    if (at) rig.follow(at.pos.x, at.pos.z);
    else {
      const [cx, cz] = centreOf(f);
      rig.follow(cx, cz);
    }
  };
  let lastPointer: { world: { x: number; z: number } | null; sx: number; sy: number } = { world: null, sx: 0, sy: 0 };
  /** What M and K cycle through (Shift goes back a step). */
  const MAKERS: ToolName[] = ['farm', 'lodge', 'dairy', 'grove', 'press', 'pasture', 'vineyard', 'winery', 'quarry', 'loggers', 'horsefarm'];
  const SELLERS: ToolName[] = ['agora', 'stall', 'fleecestall', 'winestall'];
  /** What Z cycles through: the offices. */
  const OFFICES: ToolName[] = ['taxoffice', 'watchpost', 'architect', 'court', 'prison'];
  // Slice 49: the infirmary and the asklepieion (Z ×6, Z ×7).
  OFFICES.push('infirmary', 'asklepieion');
  const next = (list: ToolName[], now: ToolName | null, back = false): ToolName => {
    const i = now ? list.indexOf(now) : -1;
    if (i < 0) return list[0];
    return list[(i + (back ? list.length - 1 : 1)) % list.length];
  };
  const TOOL_KEYS: Record<string, ToolName> = { t: 'road', h: 'housing', b: 'fountain', m: 'farm', g: 'granary', k: 'agora', v: 'shrine', p: 'theatre', z: 'taxoffice', x: 'clear' };
  // (Slice 48: clicking a workplace opens its panel, whose walkers each have a Follow button, where it once followed one of them.)
  const pointerTools: PointerTools = {
    get active() {
      return (tools.tool !== null || orders.selected !== 0) && !greeceOpen();
    },
    pointer(w, sx, sy) {
      if (greeceOpen()) return greece?.hover(sx, sy);
      lastPointer = { world: w, sx, sy };
      if (tools.tool) tools.pointer(w, sx, sy);
      else if (orders.selected) orders.pointer(w, sx, sy);
      else hover(w, sx, sy);
    },
    down: () => (tools.tool ? tools.down() : orders.down()),
    up: () => (tools.tool ? tools.up() : orders.up()),
    cancel: () => {
      // Esc puts away the welcome card, the saves card and the controls card first.
      // Slice 46: the new-game screen before it.
      if (newGame?.open) newGame.close();
      else if (welcomeCard?.open) welcomeCard.dismiss();
      else if (topbar.ratesOpen) topbar.toggleRates(false);
      else if (ledger.open) ledger.toggle(false);
      // Slice 39.
      else if (ambitionPanel.open) ambitionPanel.toggle(false);
      // Slice 44.
      else if (msgPanel.open) msgPanel.toggle(false);
      // Slice 51.
      else if (overview.open) overview.toggle(false);
      else if (saveMenu.open) saveMenu.toggle(false);
      else if (corner.helpOpen) corner.toggleHelp(false);
      else if (greece && greeceOpen()) {
        // The map of Greece: its panel first, then the map itself.
        if (greece.shown) greece.show(null);
        else toggleGreece(false);
      } else if (tools.tool) tools.cancel();
      else if (orders.selected) takeBanner(0);
      else if (follow) stopFollow();
      else if (tradePanel.open) tradePanel.toggle(false);
      // (Slice 38.)
      else if (shipyardPanel.open) shipyardPanel.toggle(false);
      else if (panel.open) panel.show(0);
      // Slice 48.
      else if (buildingPanel.open) buildingPanel.show(0);
      // Slice 55.
      else if (monsterPanel.open) monsterPanel.show(0);
      else tools.cancel();
    },
    click(w, sx, sy) {
      if (greeceOpen()) return greece?.click(sx, sy);
      // A banner or a soldier: take his company's banner in hand.
      const army = armyPick(sx, sy);
      if (army.company) {
        stopFollow();
        takeBanner(army.company);
        return;
      }
      // Slice 59: a hero: their hall's panel.
      {
        const h = heroesView.pick(camera, canvas.getBoundingClientRect(), sx, sy);
        const c = h ? heroOf(sim.state, h) : undefined;
        const hall = c ? hallOf(sim.state, c) : undefined;
        if (hall) {
          buildingPanel.show(hall.id);
          return hover(w, sx, sy);
        }
      }
      // Slice 55: a monster (or its lair): its panel.
      const bm = beastUnder(sx, sy);
      if (bm) {
        monsterPanel.show(bm.id);
        return hover(w, sx, sy);
      }
      // A walker with a job, or the fountain, agora or farm she works from: follow her.
      const tall = monumentAt(sx, sy);
      // (Slice 51: a click on a building's footprint is for the building, unless right on a walker there: carts waiting at
      // a store's gate took the clicks meant for its panel.)
      const c = walkerNear(sx, sy, tall || buildingAt(w) ? 9 : 22);
      const walker = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
      if (walker) return startFollow(walker.origin, walker.kind, walker.id);
      const fl = fleetNear(sx, sy);
      if (fl?.kind === 'trireme') {
        // (Slice 38: her shipyard's panel, as well as the Army tab's fleet.)
        side.showBarracks(triremeOf(sim.state, fl.id)?.yard ?? 0);
        shipyardPanel.show(triremeOf(sim.state, fl.id)?.yard ?? 0);
        return hover(w, sx, sy);
      }
      if (shipNear(sx, sy)) return goToPost();
      const visitor = visitorNear(sx, sy);
      if (visitor) return goToTrader(`${visitor}-sea`);
      const b = tall ?? buildingAt(w);
      // (Slice 45: the court or a prison opens its panel below, slice 48's, with the law, the cases or the prisoners: merge of slice 45.)
      // A lived-in home: who lives there. Open ground: close the panel.
      if (b?.kind === 'home' && b.people > 0) {
        tradePanel.toggle(false);
        shipyardPanel.toggle(false);
        panel.show(b.id);
        return hover(w, sx, sy);
      }
      // A barracks: the Army tab, its companies and its buttons.
      if (b?.kind === 'barracks' || b?.kind === 'shipyard') {
        side.showBarracks(b.id);
        // (Slice 38: a shipyard opens its own panel too.)
        if (b.kind === 'shipyard') shipyardPanel.show(b.id);
        return hover(w, sx, sy);
      }
      // Slice 35: a monument or a masons' yard: the Monuments tab, where it stands and what it waits for.
      if (b?.kind === 'lighthouse' || b?.kind === 'colossus' || b?.kind === 'stadium' || b?.kind === 'masons') {
        side.showTab('monuments');
        if (b.kind === 'masons') startFollow(b.id, 'builder', sim.state.walkers.find((o) => o.origin === b.id && o.kind === 'builder')?.id ?? 0);
        return hover(w, sx, sy);
      }
      // The trading post: its panel (what to sell, how much to keep, when the ship comes).
      if (b?.kind === 'trading' || b?.kind === 'yard') {
        tradePanel.showTab(b.kind === 'trading' ? 'tyre' : 'yard');
        return hover(w, sx, sy);
      }
      if (!b) {
        panel.show(0);
        tradePanel.toggle(false);
        shipyardPanel.toggle(false);
      }
      // Slice 48: any other building opens its panel (its walkers there, each with Follow); open ground closes it.
      buildingPanel.show(b ? b.id : 0);
      if (b) return hover(w, sx, sy);
    },
    key(k, e) {
      if (k === 'save') {
        saveMenu.saveNow();
        return true;
      }
      if (k === 'tab') {
        // Tab: the map of Greece and back (every letter is already taken).
        e?.preventDefault();
        toggleGreece();
        return true;
      }
      if (k === '$') {
        ledger.toggle();
        return true;
      }
      // Slice 44: the Messages panel (every letter is taken: the key left of 1, as a game's log often is).
      if (k === '\u0060') {
        msgPanel.toggle();
        return true;
      }
      // Slice 51: the overview (O, by its place on the keyboard), over the city.
      if (k === 'overview') {
        if (greeceOpen() && !overview.open) toggleGreece(false);
        overview.toggle();
        return true;
      }
      // On the map, the city's tools and overlays are put away.
      if (greeceOpen()) return false;
      if (k === 'undo' || k === 'u') {
        tools.undo();
        return true;
      }
      if (k === 'o') {
        overlay.toggle('water');
        return true;
      }
      if (k === 'l') {
        // L: the food overlay, then what is on the tables, then oil, fleece and wine, then off.
        const cycle = ['food', 'variety', 'oil', 'fleece', 'wine'] as const;
        const at = cycle.indexOf(overlay.wanted as (typeof cycle)[number]);
        overlay.wanted = at < 0 ? 'food' : at === cycle.length - 1 ? null : cycle[at + 1];
        return true;
      }
      if (k === 'i') {
        overlay.toggle('missing');
        return true;
      }
      if (k === 'y') {
        overlay.toggle('religion');
        return true;
      }
      if (k === 'c') {
        overlay.toggle('culture');
        return true;
      }
      // Slice 49: J after crime: the health overlay, then off.
      if (k === 'j' && (overlay.wanted === 'crime' || overlay.wanted === 'health')) {
        overlay.wanted = overlay.wanted === 'crime' ? 'health' : null;
        return true;
      }
      if (k === 'j') {
        // J: the taxes overlay, then fire risk, then wear, then crime (slice 30), then off.
        const cycle = ['tax', 'fire', 'wear', 'crime'] as const;
        const at = cycle.indexOf(overlay.wanted as (typeof cycle)[number]);
        overlay.wanted = at < 0 ? 'tax' : at === cycle.length - 1 ? null : cycle[at + 1];
        return true;
      }
      let t = TOOL_KEYS[k];
      if (!t) return false;
      // M again: the farm, then the hunting lodge, the dairy, the olive grove, the olive press, the sheep pasture, the vineyard and the winery.
      if (k === 'm') t = next(MAKERS, tools.tool, e?.shiftKey);
      // G again: the granary, then the storehouse, then the trading post, then the caravan yard; K again: the agora, then its oil, fleece and wine stalls.
      if (k === 'g') t = next(['granary', 'storehouse', 'trading', 'yard'], tools.tool, e?.shiftKey);
      if (k === 'k') t = next(SELLERS, tools.tool, e?.shiftKey);
      // H again (slice 36): an estate's plot.
      if (k === 'h') t = next(['housing', 'estate'], tools.tool, e?.shiftKey);
      // Z again: the tax office, then the watch post, then the architect's office.
      if (k === 'z') t = next(OFFICES, tools.tool, e?.shiftKey);
      // B again: the fountain, then the copper mine, the armoury, the barracks, the wall, the tower and the shipyard.
      if (k === 'b') t = next(['fountain', 'mine', 'armoury', 'barracks', 'wall', 'tower', 'shipyard'], tools.tool, e?.shiftKey);
      // Slice 59: V again: a hero's hall.
      if (k === 'v') t = next(['shrine', 'herohall'], tools.tool, e?.shiftKey);
      tools.select(t);
      const p = lastPointer;
      tools.pointer(p.world, p.sx, p.sy);
      return true;
    },
  };
  tools.onChange((t) => {
    if (!t) hover(lastPointer.world, lastPointer.sx, lastPointer.sy);
  });
  // (Merge of slice 46: the game's keys leave the game alone while the new-game screen is open.)
  const pollKeys = attachInput(canvas, () => (greece?.open ? greece.rig : rig), driver, () => corner.toggleHelp(), pointerTools, () => !!newGame?.open);
  if (demo?.tool) tools.select(demo.tool);
  if (demo?.follow) {
    const kind = demo.follow;
    const from: Building['kind'] =
      kind === 'water' ? 'fountain' : kind === 'food' || kind === 'oil' || kind === 'fleece' || kind === 'wine' ? 'agora' : kind === 'priestess' ? 'shrine' : kind === 'actor' ? 'theatre' : kind === 'tax' ? 'taxoffice' : kind === 'hunter' ? 'lodge' : kind === 'watchman' ? 'watchpost' : kind === 'inspector' ? 'architect' : kind === 'caravan' ? 'yard' : 'farm';
    // Carts: follow a loaded cart from the demo's kind of maker (a farm's by default) that is on the road now, else wait at
    // the one whose crop is nearest to ripe and follow its first cart, so the harvest itself is in view.
    const maker = demo.followFrom ?? 'farm';
    const rolling = kind === 'cart' ? sim.state.walkers.find((o) => o.kind === 'cart' && o.load > 0 && !o.back && findBuilding(sim.state, o.origin)?.kind === maker && maker !== 'farm') : undefined;
    const ripest = kind === 'cart' && !rolling ? sim.state.buildings.filter((b) => b.kind === maker).sort((a, b) => b.growth - a.growth)[0] : undefined;
    // Hunters: the one who set out last (not one already on his way home), so the camera goes out with him to the herd and back.
    const outbound = kind === 'hunter' ? sim.state.walkers.filter((o) => o.kind === 'hunter' && !o.back && o.wait === 0).sort((a, b) => a.walked - b.walked)[0] : undefined;
    // A watchman or an inspector: the one from the first post (or office) built, the core town's.
    const first = kind === 'watchman' || kind === 'inspector' ? sim.state.buildings.find((b) => b.kind === from) : undefined;
    const w = ripest ? undefined : (rolling ?? outbound ?? (first ? sim.state.walkers.find((o) => o.origin === first.id) : undefined) ?? sim.state.walkers.find((o) => o.kind === kind));
    const f = ripest ?? (w ? findBuilding(sim.state, w.origin) : sim.state.buildings.find((b) => b.kind === from));
    if (f) startFollow(f.id, kind, w?.id ?? 0);
  }

  // The map of Greece: loaded and built the first time it opens (a separate file, so the city's first load never waits for it).
  let greece: GreeceMap | null = null;
  let greeceLoading: Promise<GreeceMap> | null = null;
  let greeceAsked = 0;
  let greeceFirst = false;
  /** The last frame drew the map of Greece, straight to the screen (not through the city's finish). */
  let drewMap = false;
  const greeceOpen = (): boolean => greece?.open === true;
  const greeceButton = new GreeceButton(() => toggleGreece());
  const loadGreece = (): Promise<GreeceMap> =>
    (greeceLoading ??= import('./render/greece/index').then((m) => {
      greece = m.createGreece(
        {
          renderer,
          canvas,
          ui,
          map,
          send: (c) => {
            sim.enqueue(c);
            sim.flush();
            sound.play('build');
            startAutosaving();
            // (The lines under the top bar say what the answer did at once, not half a second on.)
            linesAt = -Infinity;
          },
        },
        () => performance.now(),
      );
      probe.greeceBuildMs = greece.buildMs;
      return greece;
    }));
  /** Open or close the map (opening it the first time loads it). */
  function toggleGreece(on?: boolean, city?: CityId, tab?: CityTab): void {
    // (The button shows what was asked for, so Tab pressed again while the map first loads takes it back.)
    const want = on ?? !greeceButton.el.classList.contains('on');
    if (!want) {
      // (Asked to close while it is still loading the first time: it stays shut when it arrives.)
      if (!greece?.open) return greeceButton.set(false);
      greece.toggle(false);
      greeceButton.set(false);
      lines.refold();
      // The side panel's column comes back, so the city's canvas narrows again.
      resize();
      sound.play('map');
      return;
    }
    // The city's tools, follow, panels and tips are put away while Greece is open.
    tools.select(null);
    stopFollow();
    panel.show(0);
    tradePanel.toggle(false);
    shipyardPanel.toggle(false);
    tip.show(null, 0, 0);
    welcomeCard?.dismiss();
    greeceButton.set(true);
    if (!greeceAsked) greeceAsked = performance.now();
    void loadGreece().then((g) => {
      if (!greeceButton.el.classList.contains('on')) return;
      g.toggle(true);
      lines.refold();
      resize();
      if (city) g.show(city, tab);
      sound.play('map');
    });
  }

  // A demo can open a household's panel from the start.
  const opened = demo?.open?.(sim.state) ?? 0;
  if (opened) panel.show(opened);
  if (demo?.ledger) ledger.toggle(true);
  // Slice 39.
  if (demo?.ambition) ambitionPanel.toggle(true);
  if (typeof demo?.trade === 'string') tradePanel.showTab(demo.trade);
  else if (demo?.trade) tradePanel.toggle(true);
  if (demo?.side?.ware !== undefined) side.showWare(demo.side.ware);
  else if (demo?.side?.tab) side.showTab(demo.side.tab);
  // (Slice 26: the Army tab scrolled to the shipyard, its fleet.)
  const yard = demo?.side?.fleet ? sim.state.buildings.find((b) => b.kind === 'shipyard') : undefined;
  if (yard) side.showBarracks(yard.id);
  // (Slice 38: the shipyard's panel open from the start.)
  if (demo?.shipyard) shipyardPanel.show(sim.state.buildings.find((b) => b.kind === 'shipyard')?.id ?? 0);
  if (demo?.greece) toggleGreece(true, demo.greece === true ? undefined : demo.greece, demo.greeceTab);
  // A demo can open with a company's banner in hand (slice 23).
  const banner = demo?.select?.(sim.state) ?? 0;
  if (banner) takeBanner(banner);

  // Slice 44: the town's messages. The scroll on the top bar opens the Messages panel on the left (where a home's panel
  // opens: one of them at a time); alarms pop up at the bottom left, the rest come quietly with a soft sound. Read marks
  // and pins are commands; which kinds pop up is the player's setting, kept in the browser (ui/messages.ts).
  const sendMessages = (c: Command): void => {
    sim.enqueue(c);
    sim.flush();
  };
  /** The tab a city's page opens on for a message of each kind (its ruler's page otherwise). */
  const MESSAGE_TABS: Partial<Record<MessageKind, CityTab>> = { loan: 'loans', deal: 'ruler', raid: 'ruler', blockade: 'ruler', vassal: 'empire', colony: 'empire', rebellion: 'empire' };
  /** Where a message's place stands in the city (null: on the map of Greece, or gone). */
  const messageSpot = (s: SimState, m: Message): { x: number; z: number } | null => {
    const a = m.at;
    if (!a) return null;
    if ('building' in a) {
      const b = findBuilding(s, a.building);
      if (!b) return null;
      const [x, z] = centreOf(b);
      return { x, z };
    }
    if ('tile' in a) return { x: (a.tile % map.size) + 0.5, z: Math.floor(a.tile / map.size) + 0.5 };
    if ('company' in a) {
      const c = s.army.companies.find((o) => o.id === a.company);
      return c ? { x: c.x, z: c.z } : null;
    }
    return null;
  };
  /** Go to a message's place: its city's (or site's) page on the map of Greece, or the city's camera over it. */
  const goToMessage = (m: Message): void => {
    const a = m.at;
    if (!a) return;
    if ('city' in a) return toggleGreece(true, a.city, MESSAGE_TABS[m.kind]);
    if ('site' in a) return toggleGreece(true, `site:${a.site}` as CityId);
    const at = messageSpot(sim.state, m);
    if (!at) return;
    if ('company' in a) side.showTab('army');
    if (greeceOpen()) toggleGreece(false);
    stopFollow();
    const v = rig.view;
    rig.flyTo({ ...v, x: at.x, z: at.z, dist: Math.min(v.dist, 30) });
  };
  const msgPanel = new MessagesPanel(ui, {
    send: sendMessages,
    go: goToMessage,
    canGo: (s, m) => !!m.at && ('city' in m.at || 'site' in m.at || messageSpot(s, m) !== null),
    goCity: (city, tab) => toggleGreece(true, city, (tab as CityTab | undefined) ?? 'ruler'),
  });
  msgPanel.onOpen = () => {
    panel.show(0);
    tradePanel.toggle(false);
    shipyardPanel.toggle(false);
    const g = greece as GreeceMap | null;
    if (g?.open && g.shown) g.show(null);
  };
  // (Merge of slice 51: a click on an alarm's popup puts the overview away, so you see where it takes you.)
  const msgPops = new MessagePopups(ui, (m) => {
    if (overview.open) overview.toggle(false);
    goToMessage(m);
  }, (m) => {
    if (!m.read) sendMessages({ type: 'messages', act: 'read', ids: [m.id] });
  });
  const msgWatch = new MessageWatch();
  topbar.onMessages(() => msgPanel.toggle());
  /** Whether another panel on the left was open last frame (one opening puts the Messages panel away). */
  let msgOthers = false;
  let msgBadgeAt = -Infinity;
  // A demo opens with its history read, but for its last stretch (#messages: the last season's).
  if (demo) {
    const s = sim.state;
    const from = s.tick - (demo.unread ?? 0);
    const ids = s.messages.log.filter((m) => !m.read && m.tick <= from).map((m) => m.id);
    if (ids.length) sendMessages({ type: 'messages', act: 'read', ids });
  }
  if (demo?.messages) msgPanel.toggle(true);

  // Slice 48: a building's panel, on the left: one at a time with the household, trade, shipyard and Messages panels.
  const buildingPanel = new BuildingPanel(ui, {
    send: (c) => {
      sim.enqueue(c);
      sim.flush();
      sound.play('build');
      startAutosaving();
      linesAt = -Infinity;
    },
    follow: (origin, kind, walker) => startFollow(origin, kind, walker),
    openMessage: (id) => msgPanel.showMessage(id),
    openOwn: (b) => {
      if (b.kind === 'home') panel.show(b.id);
      else if (b.kind === 'barracks') side.showBarracks(b.id);
      else if (b.kind === 'shipyard') shipyardPanel.show(b.id);
      else if (b.kind === 'trading' || b.kind === 'yard') tradePanel.showTab(b.kind === 'trading' ? 'tyre' : 'yard');
      else side.showTab('monuments');
    },
  });
  buildingPanel.onOpen = () => {
    panel.show(0);
    tradePanel.toggle(false);
    shipyardPanel.toggle(false);
    msgPanel.toggle(false);
  };
  for (const other of [tradePanel, shipyardPanel, msgPanel]) {
    const was = other.onOpen;
    other.onOpen = () => {
      was?.();
      buildingPanel.show(0);
    };
  }
  // Slice 55: a monster's panel, one at a time with the others on the left.
  const monsterPanel = new MonsterPanel(ui);
  monsterPanel.onOpen = () => {
    panel.show(0);
    buildingPanel.show(0);
    tradePanel.toggle(false);
    shipyardPanel.toggle(false);
    msgPanel.toggle(false);
  };
  for (const other of [tradePanel, shipyardPanel, msgPanel, buildingPanel]) {
    const was = other.onOpen;
    other.onOpen = () => {
      was?.();
      monsterPanel.show(0);
    };
  }
  // Slice 59: a monster's Send buttons; the hero's hall chooser, opened as the tool is picked up.
  monsterPanel.send = (c) => {
    sim.enqueue(c);
    sim.flush();
    sound.play('build');
    startAutosaving();
  };
  const heroChooser = new HeroChooser(ui, { state: () => sim.state, choose: (h) => tools.chooseHero(h), dismiss: () => tools.select(null) });
  tools.onChange((t) => {
    if (t === 'herohall') {
      tools.chooseHero(null);
      heroChooser.show();
    } else heroChooser.close();
  });
  probe.heroes = (open) => {
    const s = sim.state;
    if (open && HERO_IDS.includes(open as HeroId)) {
      const c = heroOf(s, open as HeroId);
      const hall = c ? hallOf(s, c) : undefined;
      if (hall) buildingPanel.show(hall.id);
    }
    buildingPanel.update(s, map, Infinity);
    const first = heroesView.shown[0];
    const c = first ? heroOf(s, first.hero) : undefined;
    const t = c ? heroTip(s, c) : null;
    return {
      list: s.legends.heroes.map((o) => ({ hero: o.hero, state: o.state, x: o.x, z: o.z, hall: o.hall, foe: o.foe })),
      drawn: heroesView.counts,
      tip: t ? `${t.title}\n${t.detail}` : '',
      panel: buildingPanel.text,
      chooser: heroChooser.open,
    };
  };
  probe.heroOnScreen = (hero) => {
    const o = heroesView.shown.find((x) => x.hero === hero);
    if (!o) return null;
    const r = canvas.getBoundingClientRect();
    const v = new THREE.Vector3(o.x, o.y + o.tall * 0.5, o.z).project(camera);
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };
  probe.monsterSend = (kind, why) => {
    const m = sendMonster(sim.state, kind as MonsterId, why);
    if (m) m.next = sim.state.tick;
    return m?.id ?? 0;
  };
  probe.monsterRaid = (id) => {
    const m = monsterOf(sim.state, id);
    if (!m || m.state !== 'lair') return false;
    m.next = sim.state.tick + STIR + 1;
    return true;
  };
  probe.monsterOnScreen = (id) => {
    const o = monstersView.shown.find((x) => x.id === id);
    if (!o) return null;
    const r = canvas.getBoundingClientRect();
    const v = new THREE.Vector3(o.x, o.y + o.tall * 0.5, o.z).project(camera);
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };
  probe.monsters = (open) => {
    if (open !== undefined) monsterPanel.show(open);
    monsterPanel.update(sim.state, Infinity);
    const first = monstersView.shown[0];
    const m = first ? monsterOf(sim.state, first.id) : undefined;
    const t = m ? beastTip(sim.state, m) : null;
    return {
      list: sim.state.legends.monsters.map((o) => ({ id: o.id, kind: o.kind, state: o.state, x: o.x, z: o.z, hp: o.hp, full: o.full, lair: o.lair, den: o.den })),
      drawn: monstersView.counts,
      panel: monsterPanel.text,
      tip: t ? `${t.title}\n${t.detail}` : '',
    };
  };
  /** The scroll's seal: the unread warnings and alarms (news stays bold in the panel and counted on its chips). */
  const sealOf = (s: SimState): { n: number; u: number } => {
    let n = 0;
    let u = -1;
    for (const m of s.messages.log) {
      if (m.read || m.u < WARNING) continue;
      n++;
      if (m.u > u) u = m.u;
    }
    return { n, u: u >= ALARM ? ALARM : u };
  };
  // A demo can open with a building's panel showing (#workpanel, #storeset).
  if (demo?.building) buildingPanel.show(demo.building(sim.state));
  probe.building = (id) => {
    if (id !== undefined) buildingPanel.show(id);
    buildingPanel.update(sim.state, map, Infinity);
    return { id: buildingPanel.id, open: buildingPanel.open, text: buildingPanel.text, plaques: pauseMarks.count };
  };
  probe.store = (id) => {
    const b = findBuilding(sim.state, id);
    if (!b) return null;
    const c = storeCartsOf(sim.state, b);
    return { paused: !!b.paused, first: !!b.first, workers: b.workers, rules: [...b.rules], held: WARES.map((w) => held(b, w)), out: c.out, coming: c.coming };
  };

  // Slice 51: the overview, the whole city in one window (the top bar's button, or O). Its links fly the camera to the
  // place (with the overlay that shows it), or open the panel or page that has more; the window steps aside for them.
  /** Fly the camera over a spot. */
  const flyOver = (x: number, z: number): void => {
    if (greeceOpen()) toggleGreece(false);
    stopFollow();
    const v = rig.view;
    rig.flyTo({ ...v, x, z, dist: Math.min(v.dist, 30) });
  };
  const overview = new Overview(ui, {
    goTo: (x, z, mode) => {
      if (mode) overlay.wanted = mode;
      flyOver(x, z);
    },
    overlay: (mode) => {
      overlay.wanted = mode;
    },
    openHome: (id) => {
      const b = findBuilding(sim.state, id);
      if (!b) return;
      flyOver(...centreOf(b));
      panel.show(id);
    },
    openBuilding: (id) => {
      const b = findBuilding(sim.state, id);
      if (!b) return;
      flyOver(...centreOf(b));
      if (b.kind === 'home' && b.people > 0) panel.show(id);
      else buildingPanel.show(id);
    },
    openWare: (w) => side.showWare(w),
    ledger: () => ledger.toggle(true),
    city: (id, tab) => toggleGreece(true, id, (tab as CityTab | undefined) ?? 'ruler'),
    site: (id) => toggleGreece(true, `site:${id}` as CityId),
    company: (id) => {
      side.showTab('army');
      takeBanner(id);
    },
  });
  overview.onOpen = () => {
    panel.show(0);
    tradePanel.toggle(false);
    shipyardPanel.toggle(false);
    msgPanel.toggle(false);
    buildingPanel.show(0);
    ledger.toggle(false);
    tools.select(null);
    // (Review of slice 51: and the cards over the city's middle.)
    ambitionPanel.toggle(false);
    if (saveMenu.open) saveMenu.toggle(false);
    corner.toggleHelp(false);
  };
  topbar.onOverview(() => {
    if (greeceOpen() && !overview.open) toggleGreece(false);
    overview.toggle();
  });
  if (demo?.overview) overview.toggle(true, demo.overview);
  probe.overviewMs = 0;
  probe.overview = (page) => {
    if (page === null) overview.toggle(false);
    else if (page) overview.toggle(true, page as OverviewPage);
    overview.update(sim.state, map, Infinity);
    return { open: overview.open, page: overview.pageNow, text: overview.text };
  };

  /** "water", "water or bread", "water, bread or blessings". */
  const orList = (w: string[]): string => (w.length <= 1 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} or ${w[w.length - 1]}`);
  /** Homes in trouble, most urgent first. */
  const trouble = (): Array<{ b: Building; left: number; need: string }> => {
    const out: Array<{ b: Building; left: number; need: string }> = [];
    for (const b of sim.state.buildings) {
      const ws = warningsOf(sim.state, b);
      if (ws.length) out.push({ b, left: ws[0].left, need: orList(ws.map((w) => lackWords(sim.state, b, w.need))) });
    }
    return out.sort((a, b) => a.left - b.left || a.b.id - b.b.id);
  };
  topbar.onTrouble(() => {
    const first = trouble()[0];
    if (!first) return;
    stopFollow();
    panel.show(first.b.id);
    const [cx, cz] = centreOf(first.b);
    const v = rig.view;
    rig.flyTo({ ...v, x: cx, z: cz, dist: Math.min(v.dist, 24) });
  });

  function resize(): void {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  addEventListener('hashchange', () => location.reload());
  resize();

  probe.info = () => ({
    // (With the finish on, what the scene's own pass drew: the renderer's count after the chain is only its last full-screen pass.)
    // (The map of Greece draws without the finish, so then the renderer's own count is the map's, not the city's last frame.)
    triangles: finish && !drewMap ? finish.info().triangles : renderer.info.render.triangles,
    calls: finish && !drewMap ? finish.info().calls : renderer.info.render.calls,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  });
  probe.setView = (name: string) => {
    // (A view chosen stops following anyone: otherwise the camera eases back to them frame by frame, and what is in view depends on how fast the frames come.)
    stopFollow();
    rig.jumpTo(VIEWS[name] ?? VIEWS.coast);
  };
  probe.jump = (v: CameraView) => {
    stopFollow();
    rig.jumpTo(v);
  };
  probe.view = () => rig.view;
  probe.tick = () => sim.state.tick;
  probe.meshes = () => {
    const out: Array<{ name: string; count: number; triangles: number; shadow: boolean }> = [];
    world.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      const g = m.geometry;
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const count = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
      out.push({ name: m.name, count, triangles: tris * count, shadow: m.castShadow });
    });
    return out;
  };
  probe.city = () => {
    const s = sim.state;
    const homes = s.buildings.filter((b) => b.kind === 'home');
    const of = (k: Building['kind']): Building[] => s.buildings.filter((b) => b.kind === k);
    const sum = (bs: Building[]): number => bs.reduce((a, b) => a + b.stock, 0);
    const wf = workforce(s);
    return {
      population: s.population,
      money: s.money,
      homes: homes.length,
      tents: homes.filter((b) => b.level === 1).length,
      huts: homes.filter((b) => b.level === 2).length,
      cottages: homes.filter((b) => b.level === 3).length,
      townhouses: homes.filter((b) => b.level === 4).length,
      fine: homes.filter((b) => b.level === 5).length,
      buildings: s.buildings.length,
      fountains: of('fountain').length,
      farms: of('farm').length,
      granaries: of('granary').length,
      agoras: of('agora').length,
      shrines: of('shrine').length,
      theatres: of('theatre').length,
      priestesses: s.walkers.filter((w) => w.kind === 'priestess').length,
      actors: s.walkers.filter((w) => w.kind === 'actor').length,
      carriers: s.walkers.filter((w) => w.kind === 'water').length,
      vendors: s.walkers.filter((w) => w.kind === 'food').length,
      carts: s.walkers.filter((w) => w.kind === 'cart').length,
      porters: s.walkers.filter((w) => w.kind === 'porter').length,
      watered: homes.filter((b) => b.waterUntil > s.tick).length,
      fed: homes.filter((b) => b.foodUntil > s.tick).length,
      blessed: homes.filter((b) => b.religionUntil > s.tick).length,
      entertained: homes.filter((b) => b.cultureUntil > s.tick).length,
      jobs: wf.jobs,
      filled: wf.filled,
      barns: sum(of('farm')),
      stored: sum(of('granary')),
      stall: sum(of('agora')),
      bridges: s.tiles.filter((_, t) => isBridge(map, s, t)).length,
      taxes: kindTotal(s.ledger.last, 'taxes'),
      wages: -kindTotal(s.ledger.last, 'wages'),
      taxesNow: kindTotal(s.ledger.now, 'taxes'),
      owed: owedWages(s).owed,
      taxRate: s.taxRate,
      offices: of('taxoffice').length,
      collectors: s.walkers.filter((w) => w.kind === 'tax').length,
      ledgerOpen: ledger.open,
      ratesOpen: topbar.ratesOpen,
      walkers: s.walkers.length,
      people: city.walkers.count,
      roads: s.tiles.filter((t) => t === -1).length,
      cleared: s.cleared.length,
      tool: tools.tool,
      overlay: overlay.on,
      overlayMode: overlay.mode,
      following: follow !== null,
      warned: s.buildings.filter((b) => warningOf(s, b)).length,
      signs: signs.count,
      signsWide: signs.wide,
      hazardMarks: hazardView.count.marks,
      smokePuffs: hazardView.count.smoke,
      flames: hazardView.count.flames,
      // Slice 41.
      crimeMarks: crimeMarks.count.marks,
      panel: panel.id,
      undo: undoRefusal(s),
      routes: tools.routesFound,
      markWrites: placement.markWrites,
      homesRefilled: city.homes.lastRefilled,
      lodges: of('lodge').length,
      dairies: of('dairy').length,
      hunters: s.walkers.filter((w) => w.kind === 'hunter').length,
      herdHead: s.herds.reduce((a, h) => a + h.head, 0),
      animals: city.animals.count,
      meat: s.buildings.reduce((a, b) => a + b.meat, 0),
      cheese: s.buildings.reduce((a, b) => a + b.cheese, 0),
      varied: homes.filter((b) => [b.foodUntil, b.meatUntil, b.cheeseUntil].filter((u) => u > s.tick).length >= 2).length,
      groves: of('grove').length,
      presses: of('press').length,
      storehouses: of('storehouse').length,
      oilStalls: of('agora').filter((a) => hasStall(a, OIL)).length,
      oilVendors: s.walkers.filter((w) => w.kind === 'oil').length,
      oil: s.buildings.reduce((a, b) => a + (b.kind === 'home' ? 0 : held(b, OIL)), 0),
      oiled: homes.filter((b) => goodUntil(b, OIL) > s.tick).length,
      noOil: homes.filter((b) => warningsOf(s, b).some((w) => w.need === 'oil')).length,
      pastures: of('pasture').length,
      vineyards: of('vineyard').length,
      wineries: of('winery').length,
      fleeceStalls: of('agora').filter((a) => hasStall(a, FLEECE)).length,
      wineStalls: of('agora').filter((a) => hasStall(a, WINE)).length,
      fleeceVendors: s.walkers.filter((w) => w.kind === 'fleece').length,
      wineVendors: s.walkers.filter((w) => w.kind === 'wine').length,
      fleece: s.buildings.reduce((a, b) => a + (b.kind === 'home' ? 0 : held(b, FLEECE)), 0),
      wine: s.buildings.reduce((a, b) => a + (b.kind === 'home' ? 0 : held(b, WINE)), 0),
      fleeced: homes.filter((b) => goodUntil(b, FLEECE) > s.tick).length,
      wined: homes.filter((b) => goodUntil(b, WINE) > s.tick).length,
      villas: homes.filter((b) => b.level === VILLA).length,
      watchposts: of('watchpost').length,
      architects: of('architect').length,
      watchmen: s.walkers.filter((w) => w.kind === 'watchman').length,
      dashing: s.walkers.filter((w) => w.kind === 'watchman' && w.target > 0).length,
      inspectors: s.walkers.filter((w) => w.kind === 'inspector').length,
      smoulders: s.buildings.filter((b) => b.fire === 1).length,
      fires: s.buildings.filter((b) => b.fire === 2).length,
      creaks: s.buildings.filter((b) => b.creakAt > 0).length,
      rubble: of('rubble').length,
      tradingPosts: of('trading').length,
      dockers: s.walkers.filter((w) => w.kind === 'docker').length,
      onQuay: of('trading').reduce((a, b) => a + held(b, WHEAT) + b.meat + b.cheese + held(b, OIL) + held(b, FLEECE) + held(b, WINE), 0),
      tradeOpen: tradePanel.open,
      shipChip: (document.querySelector('.ship-chip') as HTMLElement | null)?.hidden === false ? (document.querySelector('.ship-chip .txt')?.textContent ?? '') : '',
      sales: kindTotal(s.ledger.now, 'sales') + kindTotal(s.ledger.last, 'sales'),
      hazards: s.hazards,
    };
  };
  probe.walker = (kind: string) => {
    // The one of that kind nearest the middle of the view (others may be anywhere, even off the screen).
    const r = canvas.getBoundingClientRect();
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const o of city.walkers.serviceAt.values()) {
      if (o.kind !== kind) continue;
      const v = o.pos.clone().setY(o.pos.y + 0.3).project(camera);
      const d = v.z > 1 ? 1e9 + v.x * v.x + v.y * v.y : v.x * v.x + v.y * v.y;
      if (d < bd) {
        bd = d;
        best = { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
      }
    }
    return best;
  };
  probe.carrier = () => probe.walker?.('water') ?? null;
  // (Slice 47, review of slice 43: where the sim has the first walker of a kind now, not where the renderer last drew one, which
  // kept walkers gone or hidden indoors.)
  probe.where = (kind: string) => {
    const w = sim.state.walkers.find((x) => x.kind === kind && x.path.length >= 2);
    if (!w) return null;
    const [x, z] = position(w);
    return { x, z };
  };
  probe.tipText = () => {
    const el = document.querySelector('.pointer-tip') as HTMLElement | null;
    return el && !el.hidden ? (el.dataset.text ?? el.textContent) : null;
  };
  probe.panelText = () => panel.text;
  probe.homes = () =>
    sim.state.buildings
      .filter((b) => b.kind === 'home' && b.people > 0)
      .map((b) => {
        const w = warningOf(sim.state, b);
        return { id: b.id, x: b.x, z: b.z, level: b.level, people: b.people, warned: !!w, left: w ? w.left : -1 };
      });
  const drawnAt = (pick: (w: Walker) => boolean): { x: number; z: number } | null => {
    const w = sim.state.walkers.find(pick);
    const at = w ? city.walkers.serviceAt.get(w.id) : undefined;
    return at ? { x: at.pos.x, z: at.pos.z } : null;
  };
  probe.dasher = () => drawnAt((w) => w.kind === 'watchman' && w.target > 0);
  probe.fighter = () => drawnAt((w) => w.kind === 'watchman' && w.target > 0 && w.wait > 0);
  probe.homeward = () => drawnAt((w) => w.kind === 'hunter' && w.back && w.load > 0);
  probe.cartOf = (food) => drawnAt((w) => w.kind === 'cart' && w.food === food && w.load > 0);
  probe.porterOf = (ware) => drawnAt((w) => w.kind === 'porter' && w.food === ware && w.load > 0);
  probe.dockerOf = (ware, back = true) => drawnAt((w) => w.kind === 'docker' && (ware < 0 || w.food === ware) && w.load > 0 && w.back === back);
  probe.buildingsOf = (kind) => sim.state.buildings.filter((b) => b.kind === kind).map((b) => ({ id: b.id, x: b.x, z: b.z }));
  probe.works = () => {
    const ws = sim.state.walkers;
    const at = (w: Walker): { x: number; z: number } | null => {
      const p = city.walkers.serviceAt.get(w.id);
      return p ? { x: p.pos.x, z: p.pos.z } : null;
    };
    return {
      felled: sim.state.materials.felled.length,
      quarrymen: ws.filter((w) => w.kind === 'quarryman').length,
      sledges: ws.filter((w) => w.kind === 'sledge').length,
      logCarts: ws.filter((w) => w.kind === 'cart' && w.food === TIMBER && w.load > 0).length,
      loggers: ws.filter((w) => w.kind === 'logger').map((w) => { const p = at(w); return p ? { doing: loggerDoing(w), ...p } : null; }),
    };
  };
  probe.hazardsOf = (from = 1001) =>
    sim.state.buildings
      .filter((b) => b.fire > 0 || b.creakAt > 0 || b.risk >= from || b.wear >= from)
      .map((b) => ({ id: b.id, kind: b.kind, x: b.x, z: b.z, side: footSide(b), fire: b.fire, creak: b.creakAt > 0, risk: b.risk, wear: b.wear }));
  probe.herds = () => sim.state.herds.map((h) => ({ kind: h.kind, x: h.x, z: h.z, head: h.head }));
  probe.tool = (t) => tools.select(t as ToolName | null);
  probe.saves = () => ({ available: saves.available, manual: saves.info('manual'), auto: saves.info('auto'), autosaving, kept: keptAuto && !autosaving, loaded: loaded ? loaded.label.date : '', problem, lastSave });
  probe.saveNow = () => {
    saveMenu.saveNow();
    return lastSave.includes(':') ? '' : lastSave;
  };
  probe.townLines = () => lines.texts;
  // Slice 18: the gifts on their way, and where your gift's caravan or ship is drawn in the city.
  const shipInfo = (i?: { visible: boolean; x: number; z: number }): { visible: boolean; x: number; z: number } => (i ? { visible: i.visible, x: i.x, z: i.z } : { visible: false, x: 0, z: 0 });
  probe.gifts = () =>
    sim.state.world.gifts.map((g) => {
      const w = g.from === 'home' ? sim.state.walkers.find((x) => x.kind === 'caravan' && giftOf(x) === g.id) : undefined;
      const at = w ? drawnAt((x) => x === w) : null;
      // (The porters or dockers fetching it, where they are drawn.)
      const porters = sim.state.walkers.filter((x) => x.kind === 'docker' && giftOf(x) === g.id).map((p) => drawnAt((x) => x === p)).filter((p) => p !== null).map((p) => ({ x: p!.x, z: p!.z }));
      return { id: g.id, from: g.from, to: g.to, good: g.good, amount: g.amount, got: g.got, by: g.by, phase: g.phase, deal: g.deal, caravan: at ? { x: at.x, z: at.z } : null, porters, ship: g.ship ? shipInfo(city.giftShips.get(g.to)?.info) : null };
    });
  probe.deals = () => sim.state.world.deals.map((d) => ({ id: d.id, kind: d.kind, city: d.city, good: d.good, amount: d.amount, state: d.state, promised: d.promised, gift: d.gift, due: d.due, done: d.done, angry: d.angry }));
  probe.loans = () => ({
    loans: sim.state.world.loans.map((l) => ({ id: l.id, city: l.city, side: l.side, by: l.by, state: l.state, amount: l.amount, rate: l.rate, months: l.months, owed: l.owed, due: l.due, gift: l.gift, deal: l.deal, step: l.step, withhold: l.withhold, seized: l.seized, raid: l.raid, demand: l.demand, sent: l.sent })),
    chip: debtsChip.el.textContent ?? '',
    chipShown: !debtsChip.el.hidden,
    overdue: debtsChip.el.classList.contains('overdue'),
  });
  // Slice 28: your expeditions, where they are and their reports.
  probe.expeditions = () => sim.state.world.expeditions.map((e) => ({ id: e.id, city: e.city, kind: e.kind, phase: e.phase, loan: e.loan, companies: e.companies, ships: e.ships, men: e.men.length, won: e.won, coin: e.coin, goods: e.goods, killed: e.killed.length, wounded: e.wounded.length, report: e.report }));
  probe.raids = () => {
    const s = sim.state;
    const w = s.walkers.find((x) => x.kind === 'raider');
    const at = w ? city.walkers.serviceAt.get(w.id) : undefined;
    const [x, z] = w ? position(w) : [0, 0];
    return {
      raids: s.world.raids.map((r) => ({ id: r.id, city: r.city, phase: r.phase, end: r.end, men: r.men, took: r.took, fired: r.fired, coin: r.coin, deal: r.deal })),
      band: w ? { x, z, back: w.back, load: w.load, drawn: !!at } : null,
      chip: raidChip.el.hidden ? '' : raidChip.el.textContent ?? '',
      indoors: city.walkers.hidden.size,
    };
  };
  probe.sound = () => ({ started: sound.started, muted: sound.muted, played: sound.played, state: sound.state });
  probe.welcome = () => !!welcomeCard?.open;
  probe.ledgerText = () => ledger.text;
  probe.tradeText = () => tradePanel.text;
  probe.shipyardText = () => shipyardPanel.text;
  probe.tributeShips = () => [...city.tributeShips].map(([key, v]) => ({ key, visible: v.info.visible, x: v.info.x, z: v.info.z }));
  probe.seas = () => {
    const f = sim.state.fleet;
    return {
      triremes: f.triremes.map((t) => ({ id: t.id, state: t.state, task: t.task, hp: t.hp, oars: t.oars, mend: t.mend })),
      ships: f.ships.map((e) => ({ id: e.id, state: e.state, blockade: e.blockade ?? 0, x: e.x, z: e.z })),
      blockades: f.blockades.map((b) => ({ city: b.city, phase: b.phase, ships: b.ships, sunk: b.sunk, end: b.end })),
      warships: f.pirates.filter((p) => p.of).map((p) => ({ way: p.way, of: p.of ?? '', ships: p.ships })),
      words: blockadeWords(sim.state),
    };
  };
  probe.trade = (open, tab) => {
    tradePanel.toggle(open);
    if (open && tab) tradePanel.showTab(tab);
  };
  // Slice 49
  probe.health = () => {
    const s = sim.state;
    const f = healthFigures(s);
    const o = s.health.outbreak;
    tradePanel.update(s, map, Infinity);
    if (buildingPanel.open) buildingPanel.update(s, map, Infinity);
    const sea = s.world.routes.find((r) => r.kind === 'sea' && r.city === 'athens');
    return {
      on: f.on,
      sick: f.sick,
      plague: f.plague,
      inBeds: f.inBeds,
      average: f.average,
      called: f.called,
      risk: f.risk,
      greece: s.health.greece.map((p) => ({ city: p.city, warned: p.warned > 0 })),
      outbreak: o ? { struck: o.struck.length, dead: o.dead, fled: o.fled } : null,
      quarantine: Math.max(0, s.health.quarantine - s.tick),
      drawn: city.health.drawn,
      physicians: s.walkers.filter((w) => w.kind === 'physician').length,
      bearers: s.walkers.filter((w) => w.kind === 'bearer').length,
      ship: sea?.ship?.phase ?? -1,
      trade: tradePanel.text,
      building: buildingPanel.text,
      lines: townLines(s, map).filter((l) => l.need === 'health').map((l) => l.text),
    };
  };
  probe.quarantine = (on) => {
    sim.enqueue({ type: 'quarantine', on });
    sim.flush();
  };
  probe.ship = () => {
    const sh = sim.state.trade.ship;
    return { ...city.ship.info, phase: sh.phase, due: sh.due, since: sh.since, visits: sh.visits, lastPaid: sh.lastPaid, chip: shipNews(sim.state)?.chip ?? '', short: shipNews(sim.state)?.short ?? '' };
  };
  probe.traders = () => {
    const s = sim.state;
    return {
      tab: tradePanel.open ? tradePanel.tab : '',
      routes: s.world.routes.map((r) => {
        const view = city.visitors.get(r.city);
        const w = r.kind === 'land' ? caravanOf(s, r.city) : undefined;
        const at = w ? drawnAt((x) => x === w) : null;
        const onMap = r.kind === 'sea' ? (visitorOnMap(r, s.tick, map.size).where === 'home' ? [] : [visitorOnMap(r, s.tick, map.size).along]) : caravansOnMap(s, r, s.tick).map((c) => c.along);
        return {
          key: `${r.city}-${r.kind}`,
          next: r.next,
          visits: r.visits,
          lastPaid: r.lastPaid,
          lastCost: r.lastCost,
          short: routeNews(s, r).short,
          ship: r.kind === 'sea' && view ? { visible: view.info.visible, x: view.info.x, z: view.info.z, phase: r.ship ? r.ship.phase : 0 } : null,
          caravan: w && at ? { x: at.x, z: at.z, back: w.back, trading: w.wait > 0, donkeys: w.people } : null,
          onMap,
        };
      }),
    };
  };
  probe.ledger = (open) => ledger.toggle(open);
  // Slice 39.
  probe.ambition = () => {
    const s = sim.state;
    const n = nearest(s);
    return {
      on: s.ambition.on,
      looked: s.ambition.looked,
      laurels: laurelCount(s),
      grand: s.ambition.grand,
      fameUntil: s.ambition.fameUntil,
      reached: s.ambition.reached.map((l) => ({ ...l })),
      columns: ambitionView(s).map((a) => ({ kind: a.kind, achieved: a.achieved, quiet: a.quiet, count: a.count, milestones: a.milestones.map((m) => ({ id: m.id, reached: m.reached, quiet: m.quiet, share: m.share, words: m.words })) })),
      nearest: n ? { id: n.m.id, share: n.share, words: n.p.words } : null,
      chip: (document.querySelector('.laurel-chip') as HTMLElement | null)?.textContent ?? '',
      chipShown: !((document.querySelector('.laurel-chip') as HTMLElement | null)?.hidden ?? true),
      line: ambitionTownLine(s),
      panelOpen: ambitionPanel.open,
    };
  };
  probe.ambitionPanel = (open) => {
    ambitionPanel.toggle(open);
    ambitionPanel.update(sim.state, Infinity);
    return ambitionPanel.text;
  };
  // Slice 44.
  probe.heard = () => [...lines.texts, ...sim.state.messages.log.map((m) => m.words)];
  probe.messages = (open, filter, last = 80) => {
    if (open !== undefined) msgPanel.toggle(open);
    if (filter) msgPanel.showFilter(filter as Parameters<typeof msgPanel.showFilter>[0]);
    const s = sim.state;
    msgPanel.refresh(s, map);
    const u = unread(s);
    const seal = document.querySelector('.scroll-btn .seal') as HTMLElement | null;
    return {
      count: s.messages.log.length,
      since: s.messages.since,
      unread: u.n,
      urgent: u.u,
      seal: seal && !seal.hidden ? (seal.textContent ?? '') : '',
      sealClass: seal?.className ?? '',
      open: msgPanel.open,
      text: msgPanel.open ? msgPanel.text : '',
      popup: msgPops.text,
      log: s.messages.log.slice(-last).map((m) => ({ id: m.id, tick: m.tick, kind: m.kind, u: m.u, title: titleOf(m), words: m.words, at: m.at ?? null, read: !!m.read, pin: !!m.pin })),
    };
  };
  {
    // Slice 48: and the seal's count, of the unread warnings and alarms.
    const was = probe.messages;
    probe.messages = (open, filter, last) => ({ ...was(open, filter, last), sealed: sealOf(sim.state).n });
  }
  // Slice 45.
  // (Merge of slice 45: the court's and the prison's panels are the building panel, opened on them.)
  const justiceText = (): string => {
    const b = buildingPanel.open ? findBuilding(sim.state, buildingPanel.id) : undefined;
    if (!b || (b.kind !== 'court' && b.kind !== 'prison')) return '';
    buildingPanel.update(sim.state, map, Infinity);
    return buildingPanel.text;
  };
  probe.justicePanel = (at) => {
    buildingPanel.show(at);
    return justiceText();
  };
  probe.justice = () => {
    const c = sim.state.crime;
    return {
      law: { ...c.law },
      cases: c.cases.length,
      held: c.held.length,
      stocks: c.stocks.length,
      pinned: c.stocks.filter((p) => sim.state.tick >= p.since && sim.state.tick < p.until).map((p) => p.at),
      convicts: sim.state.walkers.filter((w) => w.kind === 'convict' && w.people > 0).length,
      jails: c.jails.map((j) => ({ at: j.at, unrest: j.unrest, warned: j.warned > 0 })),
      text: justiceText(),
    };
  };
  probe.sideText = () => side.text;
  probe.side = (open) => side.toggle(open);
  probe.sideTab = (t) => side.showTab(t as Parameters<typeof side.showTab>[0]);
  probe.sideWare = (w) => side.showWare(w);
  probe.sideBench = (n) => {
    const out: Record<string, number> = {};
    for (const [t, w] of [['goods', -1], ['goods', 0], ['goods', 7], ['people', -1], ['services', -1], ['money', -1]] as const) {
      if (w >= 0) side.showWare(w);
      else side.showTab(t);
      const t0 = performance.now();
      for (let i = 0; i < n; i++) side.html(sim.state);
      out[`${t}${w >= 0 ? w : ''}`] = (performance.now() - t0) / n;
    }
    const t0 = performance.now();
    for (let i = 0; i < n; i++) arrivalOutlook(sim.state, map);
    out.outlook = (performance.now() - t0) / n;
    return out;
  };
  probe.sideState = () => ({ open: side.open, tab: side.tabNow, ware: side.wareNow, paints: side.minimap.paints, draws: side.minimap.draws });
  probe.rates = (open) => topbar.toggleRates(open);
  probe.warnAll = (id) => {
    const b = findBuilding(sim.state, id);
    if (!b) return;
    const t = sim.state.tick;
    // As if every need had run out at once, a month and a half ago (debug only).
    b.since = Math.min(b.since, t - 2000);
    b.waterUntil = b.foodUntil = b.religionUntil = b.cultureUntil = t - 450;
    b.meatUntil = b.cheeseUntil = t - 450;
    b.goodsUntil = b.goodsUntil.map(() => t - 450);
    b.grace = 0;
    sim.state.rev++;
  };
  probe.speed = (s) => driver.setSpeed(s);
  // Step the paused sim by hand (for even frames of an animation in screenshots).
  (probe as unknown as { stepSim: (n: number) => void }).stepSim = (n) => {
    for (let i = 0; i < n; i++) sim.step();
  };
  probe.greece = (open, city, tab) => toggleGreece(open, city as CityId | undefined, tab as CityTab | undefined);
  probe.greeceInfo = () => (greece ? greece.info() : { open: false, built: false });
  probe.greeceJump = (v) => greece?.rig.jumpTo(v);
  probe.greeceHover = (x, y) => greece?.hover(x, y);
  probe.greeceBody = (key) => greece?.bodyPoint(key) ?? null;
  probe.army = () => {
    const toScreen = (v: THREE.Vector3): { x: number; y: number } => {
      const p = v.clone().project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    };
    return {
      selected: orders.selected,
      hint: ordersChip.hidden ? '' : (ordersChip.textContent ?? ''),
      companies: sim.state.army.companies.map((c) => {
        const at = city.army.bannerAt.get(c.id);
        const men = sim.state.army.soldiers.filter((x) => x.company === c.id);
        return { id: c.id, kind: c.kind, order: c.order, x: c.x, z: c.z, men: men.length, ready: men.filter((x) => x.state === 'ready').length, screen: at ? toScreen(at) : null };
      }),
    };
  };
  probe.selectCompany = (id) => takeBanner(id);
  probe.order = (c) => orders.send(c);
  probe.skip = (n) => sim.run(n);
  probe.foeScreen = () => {
    const first = [...city.walkers.foeAt.values()][0];
    if (!first) return null;
    const v = first.clone().setY(first.y + 0.24).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };
  probe.battle = () => {
    const a = sim.state.army;
    const up = a.foes.filter((f) => f.state !== 'fallen');
    const fight = up.filter((f) => f.state === 'fight');
    const r = sim.state.world.raids.find((x) => x.phase === 'raiding') ?? sim.state.world.raids.at(-1);
    const near = fight.length ? fight : up;
    const centre = near.length ? { x: near.reduce((s, f) => s + f.x, 0) / near.length, z: near.reduce((s, f) => s + f.z, 0) / near.length } : null;
    return { foes: up.length, fighting: fight.length, fallen: r?.fallen ?? 0, arrows: a.arrows.length, broke: r?.broke ?? false, killed: r?.killed ?? 0, wounded: r?.wounded ?? 0, centre, news: a.news.map((n) => n.line) };
  };
  probe.fleet = () => {
    const f = sim.state.fleet;
    return {
      triremes: f.triremes.map((t) => ({ id: t.id, name: triremeName(t), state: t.state, task: t.task, order: t.order, lane: t.lane, x: t.x, z: t.z, hp: t.hp, crew: t.crew.length, work: t.work })),
      ships: f.ships.map((e) => ({ id: e.id, raid: e.raid, state: e.state, x: e.x, z: e.z, hp: e.hp, men: e.men, laden: e.laden })),
      pirates: f.pirates.map((p) => ({ way: p.way, state: p.state, ships: p.ships, took: p.took.length })),
      reports: f.reports.map((r) => r.line),
      shown: city.fleet.shown.map((o) => ({ kind: o.kind, id: o.id, x: o.x, z: o.z })),
    };
  };
  probe.walls = () => {
    const s = sim.state;
    const r = s.world.raids.find((x) => x.phase === 'raiding') ?? s.world.raids.at(-1);
    return {
      pieces: s.walls.map((p) => ({ t: p.t, hp: p.hp, gate: p.gate })),
      towers: s.buildings.filter((b) => b.kind === 'tower').map((b) => ({ id: b.id, x: b.x, z: b.z, workers: b.workers })),
      siege: r?.siege ?? -1,
      breaches: r?.breaches ?? 0,
      towerArrows: s.army.arrows.filter((a) => a.h0 !== undefined).length,
      hammering: s.army.foes.filter((f) => f.state === 'with' && f.swung > 0 && s.tick - f.swung < 24).length,
    };
  };
  probe.showPanel = (id) => panel.show(id);
  probe.servingHomes = () => sim.state.army.soldiers.map((x) => x.home).filter((h) => h > 0);
  // Slice 30.
  probe.crime = (from = 1) => {
    const s = sim.state;
    const t = talliesNow(s);
    return {
      on: s.crime.on,
      now: t.now,
      last: t.last,
      news: s.crime.news.map((n) => n.line),
      thieves: s.walkers
        .filter((w) => w.kind === 'thief' && w.people > 0)
        .map((w) => {
          const at = city.walkers.serviceAt.get(w.id);
          return { id: w.id, home: w.home, target: w.target, back: w.back, load: w.load, loot: w.food, chased: w.meat, drawn: at ? { x: at.pos.x, z: at.pos.z } : null };
        }),
      chasing: s.walkers.filter((w) => w.kind === 'watchman' && w.meat > 0).length,
      // Slice 41: the new kinds out, and the gangs, broken buildings and talk.
      kinds: s.crime.kinds,
      criminals: s.walkers
        .filter((w) => isCriminal(w.kind) && w.kind !== 'thief' && w.people > 0)
        .map((w) => {
          const at = city.walkers.serviceAt.get(w.id);
          return { id: w.id, kind: w.kind, home: w.home, target: w.target, back: w.back, wait: w.wait, mingling: w.kind === 'pickpocket' && w.steps === 1, drawn: at ? { x: at.pos.x, z: at.pos.z } : null };
        }),
      gangs: s.crime.gangs.map((g) => ({ ...g })),
      broken: s.crime.broken.map((x) => ({ ...x })),
      talk: s.crime.talk.map((x) => ({ ...x })),
      marks: crimeMarks.count,
      tempted: s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.tempt >= from).map((b) => ({ id: b.id, x: b.x, z: b.z, level: b.level, tempt: b.tempt })),
    };
  };
  probe.screenOf = (x, z, y) => {
    const v = new THREE.Vector3(x, y ?? map.heightAt(x, z), z).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };

  // Families moving in: "+3" floats up from their tent; "Hut" when a tent becomes a hut.
  const known = new Map<number, { people: number; level: number }>();
  const remember = (): void => {
    known.clear();
    for (const b of sim.state.buildings) known.set(b.id, { people: b.people, level: b.level });
  };
  remember();
  let seenRev = sim.state.rev;
  // Fire and collapse as last seen (each tick): a fire catching, put out, a building starting to creak or falling.
  // (One number a building: its fire state times two, plus one if it creaks; kept in place, so nothing is made each tick.)
  const hazardSeen = new Map<number, number>();
  const hazardOf = (b: Building): number => b.fire * 2 + (b.creakAt > 0 ? 1 : 0);
  const seeHazards = (): void => {
    if (hazardSeen.size > sim.state.buildings.length * 2) hazardSeen.clear();
    for (const b of sim.state.buildings) hazardSeen.set(b.id, hazardOf(b));
  };
  seeHazards();
  let hazardTick = sim.state.tick;
  // The war's sounds (phase 4's review): companies as last seen (a new one, or one sent off under its banner, sounds the trumpet),
  // the walls' strength (a blow heard as a thud), and loans' states (their coin counted in or out).
  const companiesSeen = new Map<number, string>();
  const orderOf = (c: { order: string; target: number }): string => (c.order === 'march' ? `march:${c.target}` : c.order);
  for (const c of sim.state.army.companies) companiesSeen.set(c.id, orderOf(c));
  const wallsSeen = new Map<number, number>();
  for (const p of sim.state.walls) wallsSeen.set(p.t, p.hp);
  const loansSeen = new Map<number, string>();
  for (const l of sim.state.world.loans) loansSeen.set(l.id, l.state);
  const COIN_STATES = new Set(['running', 'repaid', 'repaying', 'offering', 'sending', 'collected']);
  const warSounds = (since: number): void => {
    const st = sim.state;
    const ear = rig.view;
    const hearing = 12 + ear.dist * 0.8;
    const near = (x: number, z: number): boolean => Math.hypot(x - ear.x, z - ear.z) < hearing;
    const cues: Cue[] = [];
    for (const c of st.army.companies) {
      const o = orderOf(c);
      const was = companiesSeen.get(c.id);
      if (was !== o) {
        if (was === undefined || (c.order === 'march' && was !== o)) cues.push('trumpet');
        companiesSeen.set(c.id, o);
      }
    }
    if (companiesSeen.size > st.army.companies.length) for (const id of companiesSeen.keys()) if (!st.army.companies.some((c) => c.id === id)) companiesSeen.delete(id);
    if (st.army.foes.length) {
      let clash = false;
      for (const x of st.army.soldiers) if (x.swung > since && x.foe > 0 && near(x.x, x.z)) clash = true;
      for (const f of st.army.foes) if (f.swung > since && f.state === 'fight' && near(f.x, f.z)) clash = true;
      if (clash) cues.push('clash');
      if (st.army.arrows.some((a) => a.t0 > since && near(a.x0, a.z0))) cues.push('arrow');
    }
    if (st.walls.length) {
      for (const p of st.walls) {
        const was = wallsSeen.get(p.t);
        if (was !== undefined && p.hp < was && near(p.t % map.size, Math.floor(p.t / map.size))) cues.push('thud');
        wallsSeen.set(p.t, p.hp);
      }
    }
    if (st.fleet.triremes.some((t) => t.state === 'rowing' && near(t.x, t.z))) cues.push('oars');
    for (const l of st.world.loans) {
      const was = loansSeen.get(l.id);
      if (was !== l.state && COIN_STATES.has(l.state)) cues.push('coins');
      loansSeen.set(l.id, l.state);
    }
    for (const c of new Set(cues)) sound.play(c);
  };
  // The ship as last seen: her sail sighted rings the harbour bell; her paying floats the drachmas up from the quay.
  let shipSeen = { phase: sim.state.trade.ship.phase, visits: sim.state.trade.ship.visits };
  // The routes' traders as last seen: a caravan coming in brays, a foreign ship sighted rings the bell, a trader paying floats its drachmas up from the yard or the quay.
  const routesSeen = new Map<string, { phase: number; visits: number }>();
  for (const r of sim.state.world.routes) routesSeen.set(`${r.city}-${r.kind}`, { phase: r.ship?.phase ?? 0, visits: r.visits });
  const caravansSeen = new Set(sim.state.walkers.filter((w) => w.kind === 'caravan').map((w) => w.id));
  // Raiders already in the city as it opens are not news; a band coming in at the edge is: the horn, and "Raiders!" where they come in.
  const raidersSeen = new Set(sim.state.walkers.filter((w) => w.kind === 'raider').map((w) => w.id));
  // Tax collectors' satchels as last seen, so "+84 dr" floats up from the office when one hands in.
  const satchels = new Map<number, { dr: number; origin: number }>();
  // The population's tooltip says how often newcomers are coming, and why.
  let outlookAt = -Infinity;
  let workRev = -1;
  let troubleAt = -Infinity;
  let linesAt = -Infinity;
  // Slice 39: the laurel chip's last update.
  let laurelAt = -Infinity;
  /** A collector handing in at his office: the coins float up from it. */
  function handIn(office: number, dr: number): void {
    const o = findBuilding(sim.state, office);
    if (!o) return;
    const [cx, cz] = centreOf(o);
    floaters.add(`+${dr.toLocaleString('en-GB')} dr`, new THREE.Vector3(cx, map.heightAt(cx, cz) + 1.2, cz), time, 'tax');
  }
  /** The ground the camera sees, as four world points (the screen's corners on the ground; toward the horizon, a long way out). */
  const outlineRay = new THREE.Raycaster();
  const outlineNdc = new THREE.Vector2();
  const outlinePts = [
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    { x: 0, z: 0 },
    { x: 0, z: 0 },
  ];
  const CORNERS: ReadonlyArray<[number, number]> = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const viewOutline = (): typeof outlinePts => {
    const v = rig.view;
    const ground = map.heightAt(v.x, v.z);
    CORNERS.forEach(([nx, ny], i) => {
      outlineNdc.set(nx, ny);
      outlineRay.setFromCamera(outlineNdc, camera);
      const o = outlineRay.ray.origin;
      const d = outlineRay.ray.direction;
      // Where the ray meets the ground's level, no further than 160 tiles out across it.
      // (The original look's long lens stands EYE.back further off and always looks down onto the ground: the cap allows for it.)
      let t = d.y < -1e-4 ? (ground - o.y) / d.y : Infinity;
      const flat = Math.hypot(d.x, d.z) || 1;
      t = Math.min(t, (160 + 2 * EYE.back) / flat);
      outlinePts[i].x = o.x + d.x * t;
      outlinePts[i].z = o.z + d.z * t;
    });
    return outlinePts;
  };
  /** The autosave comes round every three months of game time. */
  const AUTOSAVE_EVERY = 3 * TICKS_PER_MONTH;

  let last = performance.now();
  let time = 0;
  renderer.setAnimationLoop((now) => {
    const jsStart = performance.now();
    const raw = Math.max(0, (now - last) / 1000);
    last = now;
    // The clock keeps real time even when frames are slow (up to a second's
    // gap); animation and the camera take smaller steps so nothing lurches.
    driver.update(Math.min(1, raw));
    const dt = Math.min(0.1, raw);
    time += dt;
    pollKeys(dt);
    const onMap = greeceOpen();
    // (The city's camera is left where it was while the map is open, so closing it comes back to the same view.)
    if (!onMap) rig.update(dt);
    const s = sim.state;
    if (s.tick !== hazardTick) {
      warSounds(hazardTick);
      hazardTick = s.tick;
      let cue: Cue | null = null;
      const ear = rig.view;
      const hearing = 10 + ear.dist * 0.8;
      for (const b of s.buildings) {
        const seen = hazardSeen.get(b.id);
        const now = hazardOf(b);
        if (seen === now) continue;
        // Something changed (or the building is new): only now work out where it is.
        const [cx, cz] = centreOf(b);
        const at = new THREE.Vector3(cx, map.heightAt(cx, cz) + 1.1, cz);
        const near = Math.hypot(cx - ear.x, cz - ear.z) < hearing;
        if (seen === undefined) {
          // Rubble where a building stood: it fell or burnt down (heard across the town).
          if (b.kind === 'rubble' && s.tick - b.placed <= 20) {
            floaters.add(b.level === 1 ? 'Burnt down' : 'Fell down', at, time, 'fire');
            cue = 'collapse';
          }
          continue;
        }
        const was = { fire: seen >> 1, creak: (seen & 1) === 1 };
        if (b.fire === 2 && was.fire !== 2) {
          floaters.add('Fire!', at, time, 'fire');
          cue ??= 'ignite';
        } else if (b.fire === 1 && was.fire === 0 && near) floaters.add('Smoke', at, time, 'fire');
        else if (b.fire === 0 && was.fire > 0) {
          floaters.add(was.fire === 2 ? 'Put out' : 'Smoke put out', at, time, 'safe');
          if (was.fire === 2) cue ??= 'douse';
        }
        if (b.creakAt > 0 && !was.creak) {
          floaters.add('Creaking', at, time, 'dry');
          if (near) cue ??= 'groan';
        } else if (b.creakAt === 0 && was.creak) floaters.add('Made sound', at, time, 'safe');
      }
      seeHazards();
      const ship = s.trade.ship;
      if (ship.phase !== shipSeen.phase || ship.visits !== shipSeen.visits) {
        const post = tradingPost(s);
        if (ship.phase === SHIP_COMING && shipSeen.phase !== SHIP_COMING) cue ??= 'ship';
        if (ship.visits > shipSeen.visits && post && ship.lastPaid > 0) {
          const [cx, cz] = centreOf(post);
          floaters.add(`+${ship.lastPaid.toLocaleString('en-GB')} dr`, new THREE.Vector3(cx, map.heightAt(cx, cz) + 1.3, cz), time, 'sale');
          cue = 'sale';
        }
        shipSeen = { phase: ship.phase, visits: ship.visits };
      }
      if (s.world.routes.length) {
        for (const r of s.world.routes) {
          const key = `${r.city}-${r.kind}`;
          const was = routesSeen.get(key) ?? { phase: SHIP_AWAY, visits: 0 };
          const phase = r.ship?.phase ?? 0;
          if (phase === was.phase && r.visits === was.visits) continue;
          if (r.ship && phase === SHIP_COMING && was.phase !== SHIP_COMING) cue ??= 'ship';
          const depot = r.kind === 'land' ? caravanYard(s) : tradingPost(s);
          if (r.visits > was.visits && depot && r.lastPaid > 0) {
            const [cx, cz] = centreOf(depot);
            floaters.add(`+${r.lastPaid.toLocaleString('en-GB')} dr`, new THREE.Vector3(cx, map.heightAt(cx, cz) + 1.3, cz), time, 'sale');
            cue = 'sale';
          }
          routesSeen.set(key, { phase, visits: r.visits });
        }
        for (const w of s.walkers) {
          if (w.kind !== 'caravan' || caravansSeen.has(w.id)) continue;
          caravansSeen.add(w.id);
          if (!w.back) cue ??= 'caravan';
        }
        if (caravansSeen.size > 8) for (const id of caravansSeen) if (!s.walkers.some((w) => w.id === id)) caravansSeen.delete(id);
        for (const w of s.walkers) {
          if (w.kind !== 'raider' || raidersSeen.has(w.id)) continue;
          raidersSeen.add(w.id);
          const x = w.path[2] ?? w.path[0];
          const z = w.path[3] ?? w.path[1];
          floaters.add('Raiders!', new THREE.Vector3(x, map.heightAt(x, z) + 1.4, z), time, 'fire');
          cue = 'horn';
        }
      }
      if (cue) sound.play(cue);
    }
    if (s.rev !== seenRev) {
      seenRev = s.rev;
      let cue: Cue | null = null;
      // A home's chime is heard only near the view (the sound module also keeps it to one a second).
      const ear = rig.view;
      const hearing = 8 + ear.dist * 0.6;
      for (const b of s.buildings) {
        const before = known.get(b.id) ?? { people: 0, level: 0 };
        const [cx, cz] = centreOf(b);
        const heard = b.kind === 'home' && Math.hypot(cx - ear.x, cz - ear.z) < hearing;
        if (heard && before.level > 0 && b.level > before.level) cue = 'rise';
        else if (heard && b.level < before.level && b.level > 0) cue ??= 'decline';
        const at = new THREE.Vector3(cx, map.heightAt(cx, cz), cz);
        if (b.people > before.people) floaters.add(`+${b.people - before.people}`, at, time);
        if (b.kind === 'home' && b.level === 2 && before.level === 1) floaters.add('Hut', at.setY(at.y + 0.5), time, 'water');
        if (b.kind === 'home' && b.level === 1 && before.level === 2) floaters.add('Back to a tent', at.clone().setY(at.y + 0.5), time, 'dry');
        if (b.kind === 'home' && b.level === 3 && before.level === 2) floaters.add('Cottage', at.setY(at.y + 0.6), time, 'food');
        if (b.kind === 'home' && b.level === 2 && before.level === 3) floaters.add('Back to a hut', at.clone().setY(at.y + 0.6), time, 'dry');
        if (b.kind === 'home' && b.level === 4 && before.level === 3) floaters.add('Townhouse', at.setY(at.y + 0.9), time, 'religion');
        if (b.kind === 'home' && b.level === 3 && before.level === 4) floaters.add('Back to a cottage', at.clone().setY(at.y + 0.9), time, 'dry');
        if (b.kind === 'home' && b.level === 5 && before.level === 4) floaters.add('Fine house', at.setY(at.y + 1.0), time, 'culture');
        if (b.kind === 'home' && b.level === 4 && before.level === 5) floaters.add('Back to a townhouse', at.clone().setY(at.y + 1.0), time, 'dry');
        if (b.kind === 'home' && b.level === VILLA && before.level === FINE) floaters.add('Villa', at.setY(at.y + 1.2), time, 'wine');
        if (b.kind === 'home' && b.level === FINE && before.level === VILLA) floaters.add('Back to a fine house', at.clone().setY(at.y + 1.2), time, 'dry');
        // A whole household gone (harsh taxes): the house left an empty plot.
        if (b.kind === 'home' && b.level === 0 && before.level > 0 && b.people === 0) floaters.add('Moved away', at.clone().setY(at.y + 0.6), time, 'dry');
        // People moving away from a home that stays (it went down a level).
        if (b.kind === 'home' && b.people < before.people && b.level < before.level) floaters.add(`−${before.people - b.people}`, at.clone().setY(at.y - 0.2), time, 'dry');
      }
      remember();
      if (cue) sound.play(cue);
    }
    {
      // Every frame, not only when the town changes: a collector handing in doesn't change the town's look.
      const out = new Set<number>();
      for (const w of s.walkers) {
        if (w.kind !== 'tax') continue;
        out.add(w.id);
        const dr = purseTotal(w);
        const was = satchels.get(w.id);
        if (was && was.dr > 0 && dr < was.dr) handIn(was.origin, was.dr - dr);
        satchels.set(w.id, { dr, origin: w.origin });
      }
      for (const [id, was] of satchels) {
        if (out.has(id)) continue;
        if (was.dr > 0) handIn(was.origin, was.dr);
        satchels.delete(id);
      }
    }
    if (time - outlookAt > 2) {
      outlookAt = time;
      topbar.setPeopleTip(arrivalOutlook(s, map), !s.buildings.some((b) => b.kind === 'home'));
      // Slice 39: settlers drawn by fame, named in the people's tooltip.
      topbar.notePeople(fameWords(s));
      topbar.setMoneyTip(moneyTip(s));
    }
    {
      const l = s.ledger;
      const m = monthOf(s.tick);
      const last = l.month === m ? l.last : l.month === m - 1 ? l.now : [];
      topbar.showTrend(last.length ? totals(last).net : null, owedWages(s).owed > 0);
      topbar.showRate(s.taxRate);
      // The traders chip: the Tyre ship's news as ever, or with routes open whichever trader is nearest (here, coming, then due soonest).
      const tyre = shipNews(s);
      traderChip = s.world.routes.length ? (tradersNews(s, tyre)[0] ?? null) : tyre ? { ...tyre, who: 'tyre', kind: 'sea' } : null;
      topbar.showShip(traderChip);
      raidChip.show(raidChipNow(s));
      const army = strength(s);
      // (Merge of slice 47: your own companies out, stationed in a colony too; allied companies and militia named apart.)
      armyChip.show(army.men, army.companies, s.army.companies.filter((c) => !c.ally && c.order !== 'drill').length, army.allies);
      debtsChip.show(debtsNow(s));
      // Slice 39: the laurel chip, the nearest milestone across the three ambitions.
      if (time - laurelAt > 0.5 || laurelFresh) {
        laurelAt = time;
        const n = s.ambition.on ? nearest(s) : null;
        const won = laurelCount(s);
        // (Review of slice 39: in the game's own tip, a line each.)
        const tip = n
          ? `Nearest milestone: ${n.m.name} · ${AMBITION_NAMES[n.m.ambition]}, ${placeOf(n.m)} of 5\nWants: ${n.m.want[0].toLowerCase()}${n.m.want.slice(1)}\nNow: ${n.p.words}\nReward: ${rewardWords(n.m.reward)}\n${won} of ${MILESTONE_COUNT} laurels won · click for the ambitions`
          : `Every ambition achieved: ${won} of ${MILESTONE_COUNT} laurels\nClick for the ambitions`;
        topbar.showLaurel(s.ambition.on ? { name: n?.m.name ?? '', share: n?.share ?? 1, tip, won, of: MILESTONE_COUNT } : null, time, laurelFresh);
        laurelFresh = false;
      }
    }
    if (s.rev + s.looks !== workRev) {
      workRev = s.rev + s.looks;
      topbar.showWork(workforce(s), BUILDING_NAMES);
    }
    if (time - troubleAt > 0.5) {
      troubleAt = time;
      topbar.showTrouble(trouble().map((h) => ({ name: h.b.family?.name ?? '?', need: h.need, days: Math.max(1, Math.ceil(h.left / TICKS_PER_DAY)) })));
    }
    // Slice 44: new messages (an alarm pops up, unless the Messages panel is open; anything else, a soft sound), the
    // scroll's seal, the panel and the popups; and another panel opening on the left puts the Messages panel away.
    {
      let cue: Cue | null = null;
      for (const m of msgWatch.fresh(s)) {
        if (popsUp(m)) {
          if (!msgPanel.open) msgPops.push(m);
          // (A fire and raiders coming in have their own sounds, the flames catching and the war horn.)
          if (m.kind !== 'fire' && m.kind !== 'raid') cue = 'alarm';
        } else cue ??= 'message';
      }
      if (cue) sound.play(cue);
      if (time - msgBadgeAt > 0.25) {
        msgBadgeAt = time;
        // (Slice 48: the seal counts the unread warnings and alarms.)
        const u = sealOf(s);
        topbar.showMessages(u.n, u.u, msgPanel.open, unread(s).n);
      }
      msgPanel.update(s, map, time);
      // (Real time: a card stays its six seconds however slow the frames. Review of slice 44.)
      msgPops.update(performance.now() / 1000);
      const g = greece as GreeceMap | null;
      const others = panel.open || tradePanel.open || shipyardPanel.open || !!(g?.open && g.shown);
      if (others && !msgOthers && msgPanel.open) msgPanel.toggle(false);
      msgOthers = others;
    }
    if (time - linesAt > 0.5) {
      linesAt = time;
      lines.update(townLines(s, map), s.tick);
      if (sound.started) sound.listen(earshot(map, rig.view, s));
    }
    if (autosaving && s.tick - lastAuto >= AUTOSAVE_EVERY) {
      lastAuto = s.tick;
      if (s.rev !== savedRev && saves.available) {
        const why = writeSave('auto');
        // Said once a session (the saves card always shows when it last saved), and when it can't save, once for each reason.
        if (!why) {
          autoProblem = '';
          if (!autoNoted) saveMenu.flash(`Saved by itself · ${labelOf(s).date}`);
          autoNoted = true;
        } else if (why !== autoProblem) {
          autoProblem = why;
          saveMenu.flash(`It couldn’t save by itself: ${why}`, true);
        }
      }
    }
    sound.update(dt);
    if (onMap && greece) {
      // The map of Greece instead of the city (which runs on, undrawn).
      // (Review of slice 51: the overview steps aside for the map, as for the panels in the city's loop.)
      if (overview.open) {
        overview.toggle(false);
        topbar.showOverview(false);
      }
      greece.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time, dt);
      topbar.showDate(sim.date);
      // Slice 43 (review): the season dial keeps time on the map too (it read "Summer" into December while the colony demos ran on there).
      topbar.showSeason(seasonNews(s), yearPhase(s.tick) / 4);
      topbar.showCity(s.population, s.money, time);
      probe.updateMs += performance.now() - jsStart;
      greece.render();
      drewMap = true;
      // (The city's floating labels are hidden here, but go on ageing, so they don't pile up while the map is open.)
      floaters.update(camera, canvas.clientWidth, canvas.clientHeight, time);
      if (!greeceFirst) {
        greeceFirst = true;
        probe.greeceOpenMs = performance.now() - greeceAsked;
      }
      probe.frames++;
      return;
    }
    world.setSeason(sim.date.month / 12 + (sim.date.day - 1) / (12 * 30));
    {
      // Slice 33: the land, sea and sky follow the season; rain and storms ease in and out (and open as they are).
      const wx = weatherNow(s);
      const wetTo = wx === STORM ? 1 : wx === RAIN ? 0.65 : 0;
      const stormTo = wx === STORM ? 1 : 0;
      if (wetNow < 0) {
        wetNow = wetTo;
        stormNow = stormTo;
      } else {
        const k = Math.min(1, dt * 0.5);
        wetNow += (wetTo - wetNow) * k;
        stormNow += (stormTo - stormNow) * k;
      }
      if (lookOver) {
        wetNow = lookOver.rain;
        stormNow = lookOver.storm;
      }
      lookPhase = lookOver ? lookOver.phase : s.season?.on ? yearPhase(s.tick) : null;
      seasonLook(lookPhase, wetNow, stormNow, look);
      applySeasonUniforms(look);
      // Now and then a flash of lightning in a storm.
      const beat = Math.floor(time / 6.5);
      const since = time - beat * 6.5;
      const flash = stormNow > 0.6 && ((beat * 2654435761) >>> 0) % 3 === 0 && since < 0.35 ? (since < 0.08 || (since > 0.16 && since < 0.24) ? 1 : 0) * stormNow : 0;
      world.setLook(look, flash);
      rain.update(camera, rig.target, time % 600, s.wind.angle, s.wind.strength, wetNow + stormNow * 0.6);
    }
    world.update(time, rig, s.wind.angle, s.wind.strength);
    city.army.selected = orders.selected;
    city.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time, camera.quaternion);
    updateFollow();
    overlay.update(s, time);
    side.showOverlay(overlay.mode);
    legend.hidden = overlay.mode !== 'missing' && overlay.mode !== 'variety' && !(overlay.mode === 'crime' && sim.state.crime.kinds);
    if (!legend.hidden && legendFor !== overlay.mode) {
      legendFor = overlay.mode as string;
      legend.innerHTML = legendFor === 'variety' ? VARIETY_LEGEND : legendFor === 'crime' ? CRIME_LEGEND : MISSING_LEGEND;
    }
    // Slice 49: the health overlay's legend.
    if (overlay.mode === 'health') {
      legend.hidden = false;
      if (legendFor !== 'health') {
        legendFor = 'health';
        legend.innerHTML = HEALTH_LEGEND;
      }
    }
    signs.update(s, camera, time, overlay.mode === 'missing');
    hazardView.update(s, camera, time, city.walkers.serviceAt);
    crimeMarks.update(s, camera, time);
    // Slice 48.
    pauseMarks.update(s, camera, time);
    buildingPanel.update(s, map, time);
    if (panel.open && buildingPanel.open) buildingPanel.show(0);
    // Slice 55.
    monstersView.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time, camera.quaternion);
    monsterPanel.update(s, time);
    if (panel.open && monsterPanel.open) monsterPanel.show(0);
    // Slice 59.
    heroesView.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time);
    // Slice 51.
    {
      const t = performance.now();
      overview.mode = overlay.mode;
      // (Review of slice 51: a panel or card opened while it is open, or a tool picked up, comes first: it steps aside
      // rather than covering them. Opening it puts them away, so one still open was opened after it.)
      if (overview.open && (msgPanel.open || ledger.open || ambitionPanel.open || tradePanel.open || shipyardPanel.open || panel.open || buildingPanel.open || saveMenu.open || corner.helpOpen || tools.tool)) overview.toggle(false);
      overview.update(s, map, time);
      topbar.showOverview(overview.open);
      probe.overviewMs = (probe.overviewMs ?? 0) + performance.now() - t;
    }
    ledger.update(s, map, time);
    // Slice 39.
    ambitionPanel.update(s, time);
    tradePanel.update(s, map, time);
    shipyardPanel.update(s, map, time);
    {
      const t = performance.now();
      side.update(s, time);
      if (side.open) side.minimap.update(s, rig.view.yaw, viewOutline(), time, city.ship.info);
      probe.sideMs += performance.now() - t;
    }
    const open = panel.update(s, map, time);
    // (Slice 36: an estate's ring goes round its whole 4 x 4.)
    // (Slice 48: and the building whose panel is open.)
    const bOpen = !open && buildingPanel.open ? findBuilding(s, buildingPanel.id) : undefined;
    selection.set(open ?? bOpen ?? (tradePanel.open ? ((tradePanel.tab === 'yard' || tradePanel.tab.endsWith('-land') ? caravanYard(s) : tradingPost(s)) ?? null) : null), open && 'estate' in open && open.estate ? footSide(open) : bOpen ? footSide(bOpen) : 2);
    selection.update(time);
    if (mark?.mesh.visible && demo?.mark) {
      if (s.tiles[demo.mark.z * map.size + demo.mark.x] === TILE_ROAD) mark.set(null);
      else mark.update(time);
    }
    placement.update(time);
    tools.frame();
    orders.frame();
    if (!ordersChip.hidden) ordersChip.textContent = orders.hint();
    topbar.showDate(sim.date);
    // Slice 33: the season dial.
    topbar.showSeason(seasonNews(s), yearPhase(s.tick) / 4);
    topbar.showCity(s.population, s.money, time);
    const why = undoRefusal(s);
    side.setUndo(why === '', why === 'Nothing to undo' ? '' : why);
    // What frames cost on the main thread before drawing (the sim's steps and every view's update), summed.
    probe.updateMs += performance.now() - jsStart;
    drewMap = false;
    if (finish) {
      // New meshes (rebuilt chunks, new buildings) share the patched materials; the check for new ones is cheap but needn't run every frame.
      if (probe.frames < 40 || probe.frames % 60 === 0) patchFinish(world.scene, map);
      finish.render();
    } else renderer.render(world.scene, camera);
    floaters.update(camera, canvas.clientWidth, canvas.clientHeight, time);
    probe.frames++;
    if (probe.frames === 1) probe.firstFrameAt = performance.now();
  });

  document.getElementById('loading')?.classList.add('gone');
  probe.startMs = performance.now() - t0;
  probe.readyAt = performance.now();
  // Slice 42.
  probe.land = () => ({ ...landOf(sim.state), site: map.data.site ?? null, roads: sim.state.tiles.filter((v) => v === TILE_ROAD).length, edgeRoad: sim.state.tiles.findIndex((v, t) => v === TILE_ROAD && t % map.size === 0), view: { x: rig.view.x, z: rig.view.z, dist: rig.view.dist }, bakeMs: probe.bakeMs });
  probe.ready = true;
}

// Say what the wait is for: a prepared town is played forward before it opens, and a save is read.
{
  const l = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const card = document.getElementById('loading');
  if (card && l.demo && DEMOS[l.demo]?.setup) card.textContent = 'Shaping the coast and getting the town ready…';
  else if (card && l.load) card.textContent = 'Opening your town…';
}
/** A demo's prepared town, fetched (its own small file) before the game starts; null when there is none (the demo then plays its setup). */
async function boot(): Promise<void> {
  const l = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const t0 = performance.now();
  let town: string | null = null;
  // The interface's materials are made while the town is fetched.
  const skin = prepareSkin(PANEL_ICONS).then((ms) => (probe.skinMs = ms));
  const load = l.demo && DEMOS[l.demo]?.setup && Object.hasOwn(PREPARED, l.demo) ? PREPARED[l.demo] : undefined;
  if (load) {
    try {
      town = (await load()).default;
    } catch {
      town = null;
    }
    probe.fetchMs = performance.now() - t0;
  }
  await skin;
  start(town);
}
// Let the loading card paint before the coast is shaped.
requestAnimationFrame(() => setTimeout(() => void boot(), 0));
