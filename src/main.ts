import './ui/style.css';
import * as THREE from 'three';
import { earshot } from './audio/earshot';
import { Sound, type Cue } from './audio/sound';
import { ClockDriver, type Speed } from './game/clockDriver';
import { DEMOS } from './game/demos';
import { attachInput, type PointerTools } from './game/input';
import { readLaunch } from './game/links';
import { browserStorage, labelOf, Saves, type SaveFile, type Slot } from './game/saves';
import { Tools, type ToolName } from './game/tools';
import { VIEWS } from './game/views';
import { coastMap } from './map/bake';
import { districtGrid } from './map/districts';
import { CameraRig, type CameraView } from './render/cameraRig';
import { CityView } from './render/city';
import { ServiceOverlay } from './render/overlay';
import { HazardView } from './render/hazards';
import { Selection, Signs } from './render/signs';
import { Placement } from './render/placement';
import { World } from './render/world';
import { isBridge } from './sim/build';
import { BUILDING_NAMES, centreOf, FINE, findBuilding, footSide, TOWNHOUSE, VILLA } from './sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './sim/clock';
import { lackWords, warningOf, warningsOf } from './sim/folk';
import { FLEECE, held, OIL, WHEAT, WINE } from './sim/foods';
import { goodUntil, hasStall } from './sim/goods';
import { workforce } from './sim/labour';
import { arrivalOutlook } from './sim/settlers';
import { herdStatus, homeStatus, moneyTip, townLines, walkerStatus, type Status } from './sim/status';
import { kindTotal, monthOf, owedWages, totals } from './sim/treasury';
import { purseTotal } from './sim/taxes';
import { TILE_ROAD, type Building, type Herd, type Walker } from './sim/state';
import { Sim, undoRefusal } from './sim/sim';
import { BuildBar, pointerTip } from './ui/buildbar';
import { Floaters } from './ui/floaters';
import { buildCorner } from './ui/help';
import { HouseholdPanel } from './ui/household';
import { LedgerCard } from './ui/ledger';
import { TradePanel } from './ui/trade';
import { shipNews, SHIP_COMING, tradingPost } from './sim/trade';
import { SaveMenu } from './ui/saveMenu';
import { SidePanel } from './ui/sidepanel';
import { TownLines } from './ui/townlines';
import { Welcome } from './ui/welcome';
import { TopBar } from './ui/topbar';
import { GreeceButton } from './ui/greeceButton';
import type { GreeceMap } from './render/greece/index';
import type { CityId } from './map/greece';
import { DEFAULT_SEED } from './sim/sim';

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
  /** How long the demo's town took to prepare (its setup ticks), within startMs. */
  setupMs?: number;
  info?: () => { triangles: number; calls: number; geometries: number; textures: number };
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
  screenOf?: (x: number, z: number) => { x: number; y: number };
  speed?: (s: Speed) => void;
  /** The save slots as the menu sees them, and what the last save said. */
  saves?: () => { available: boolean; manual: unknown; auto: unknown; autosaving: boolean; loaded: string; problem: string; lastSave: string };
  /** Save by hand now ('' when saved). */
  saveNow?: () => string;
  /** The shortfall lines showing under the top bar. */
  townLines?: () => string[];
  sound?: () => { started: boolean; muted: boolean; played: number; state: string };
  welcome?: () => boolean;
  /** The ledger card's text ('' when closed). */
  ledgerText?: () => string;
  /** The trading post's panel text ('' when closed), opening or closing it, and where the ship is. */
  tradeText?: () => string;
  /** A docker carrying a ware (any, -1) to the quay (back) or back to a store, where he is drawn. */
  dockerOf?: (ware: number, back?: boolean) => { x: number; z: number } | null;
  trade?: (open: boolean) => void;
  ship?: () => { visible: boolean; x: number; z: number; heading: number; version: string; phase: number; due: number; since: number; visits: number; lastPaid: number; chip: string; short: string };
  /** Open or close the ledger card, or the tax rates card. */
  ledger?: (open: boolean) => void;
  rates?: (open: boolean) => void;
  /** The side panel's text ('' when hidden), showing or hiding it, opening a tab or a ware's page, and what it shows. */
  sideText?: () => string;
  side?: (open: boolean) => void;
  sideTab?: (tab: string) => void;
  sideWare?: (ware: number) => void;
  /** Debug: how long building each tab's HTML takes (ms, the mean of n). */
  sideBench?: (n: number) => Record<string, number>;
  sideState?: () => { open: boolean; tab: string; ware: number; paints: number; draws: number };
  /** Debug, for screenshots only: make a home warned about every need it has (it changes the state outside the command queue). */
  warnAll?: (id: number) => void;
  /** Open or close the map of Greece (loading it the first time), optionally with a city's panel; and what it shows. */
  greece?: (open: boolean, city?: string) => void;
  greeceInfo?: () => Record<string, unknown>;
  /** The map's first open: ms from asking to its first frame drawn, and of that how long building its scene took. */
  greeceOpenMs?: number;
  greeceBuildMs?: number;
}

const probe: Probe = { ready: false, frames: 0, bakeMs: 0, startMs: 0, updateMs: 0, sideMs: 0 };
(window as unknown as { __zeus: Probe }).__zeus = probe;

function start(): void {
  const t0 = performance.now();
  const launch = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const demo = launch.demo ? DEMOS[launch.demo] : undefined;
  const view0 = VIEWS[launch.cam ?? demo?.view ?? 'coast'] ?? VIEWS.coast;
  const speed: Speed = launch.speed ?? demo?.speed ?? 'normal';
  const shot = launch.shot;

  const map = coastMap();
  // Which district each tile is in (for the ledger's taxes), worked out now rather than as the first collector calls (about 25 ms).
  districtGrid(map);
  probe.bakeMs = performance.now() - t0;
  // A new game shuffles Greece from a seed of its own (the city keeps its seed, so the coast opens as ever); a demo's Greece comes from its city's seed.
  const sim = demo || launch.load ? new Sim() : new Sim(DEFAULT_SEED, (Math.random() * 0x100000000) >>> 0);
  const tSetup = performance.now();
  // Fire risk and wear build up in every game (a demo turns them on as it opens).
  if (demo?.setup) demo.setup(sim);
  else {
    sim.enqueue({ type: 'hazards', on: true });
    sim.flush();
  }
  probe.setupMs = performance.now() - tSetup;

  // A saved town asked for by the link (#continue, #autosave, #saved) is opened before anything draws it.
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
        sim.state = r.file.state;
      } else problem = r.why;
    }
    // The link has done its work: reloading the page now starts afresh (with a way back to the save).
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      /* Not allowed here; reloading would open the save again, which is harmless. */
    }
  }
  const view = loaded?.view ? { ...VIEWS.coast, ...loaded.view } : view0;
  const driver = new ClockDriver(sim, speed);

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  canvas.tabIndex = 0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // Capped at 1.5: on high-density screens full resolution costs a lot of shading for little gain.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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
  const selection = new Selection(map);
  world.scene.add(selection.mesh);
  // A demo can ring a tile until a road is laid on it (#warning's cut road), so it is easy to find.
  const mark = demo?.mark ? new Selection(map, '#fff8e6', 'mark') : null;
  if (mark && demo?.mark) {
    mark.set({ id: -1, ...demo.mark }, 1);
    world.scene.add(mark.mesh);
  }
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 9000);
  const rig = new CameraRig(camera, map, view);

  const ui = document.getElementById('ui') as HTMLElement;
  const topbar = new TopBar(ui, driver);
  // The first-time hint says left-drag moves the view, which isn't so with a tool already picked.
  // The bare link opens on the coast with a welcome card (which carries the controls line itself).
  const welcoming = !demo && !loaded && !shot;
  const corner = buildCorner(ui, () => rig.faceNorth(), !shot && !demo?.tool && !welcoming);
  const tip = pointerTip(ui);
  const tools = new Tools(sim, placement, tip, overlay);
  const bar = new BuildBar(ui, (t) => tools.select(t), () => tools.undo(), (o) => overlay.toggle(o));
  tools.onChange((t) => bar.showTool(t));
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
  const panel = new HouseholdPanel(ui, () => panel.show(0));
  // The trading post's panel shares the household panel's place: one at a time.
  const tradePanel = new TradePanel(ui, (c) => {
    sim.enqueue(c);
    sim.flush();
    sound.play('build');
    startAutosaving();
  });
  tradePanel.onOpen = () => panel.show(0);
  /** Open the trading post's panel and go to the post. */
  const goToPost = (): void => {
    const p = tradingPost(sim.state);
    if (!p) return;
    stopFollow();
    tradePanel.toggle(true);
    const [cx, cz] = centreOf(p);
    const v = rig.view;
    rig.flyTo({ ...v, x: cx, z: cz, dist: Math.min(v.dist, 30) });
  };
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.hidden = true;
  const MISSING_LEGEND = '<b>What’s missing</b><span><i class="warn"></i>Going down a level unless it comes</span><span><i class="want"></i>Needs it to grow</span><span><i class="fine"></i>Has all it needs</span>';
  const VARIETY_LEGEND =
    '<b>On the table</b><span><i class="bread"></i>Bread</span><span><i class="meat"></i>Meat</span><span><i class="cheese"></i>Cheese</span><span><i class="short"></i>A kind it needs and lacks</span><span><i class="want"></i>Another kind would lift it</span>';
  legend.innerHTML = MISSING_LEGEND;
  let legendFor = 'missing';
  const lines = new TownLines(notices, (l) => {
    if (l.need === 'money') return ledger.toggle(true);
    if (l.need === 'ship') return goToPost();
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
  topbar.onShip(goToPost);
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

  // The side panel down the right: the minimap and the city's information in tabs, open to begin with on a wide
  // window; its switch goes beside the mute and saves buttons (they sit over the panel's head while it shows).
  const sideBtn = document.createElement('button');
  sideBtn.className = 'btn side-btn';
  sideBtn.setAttribute('aria-label', 'Side panel');
  sideBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.2" fill="none" stroke="#7a5c3c" stroke-width="1.6"/><path d="M14.5 4.5v15" stroke="#7a5c3c" stroke-width="1.6"/><path d="M16.6 8.4h2.4M16.6 11h2.4M16.6 13.6h2.4" stroke="#c8643b" stroke-width="1.5" stroke-linecap="round"/></svg>';
  sideBtn.addEventListener('click', () => side.toggle());
  corner.el.insertBefore(sideBtn, corner.el.firstChild);
  const side = new SidePanel(ui, map, {
    goTo: (x, z, jump) => {
      stopFollow();
      const v = rig.view;
      if (jump) rig.jumpTo({ ...v, x, z });
      else rig.flyTo({ ...v, x, z });
    },
    overlay: (m) => overlay.toggle(m),
    overlayMode: () => overlay.mode,
    ledger: () => ledger.toggle(true),
    rates: () => topbar.toggleRates(true),
    openHome: (id) => {
      tradePanel.toggle(false);
      panel.show(id);
    },
    toggled: (open) => {
      sideBtn.classList.toggle('on', open);
      sideBtn.setAttribute('aria-pressed', String(open));
      sideBtn.title = open ? 'Hide the side panel (the map and the city’s goods, people, services and money)' : 'Show the side panel: the map and the city’s goods, people, services and money';
      resize();
    },
  }, innerWidth >= 1200);

  // The welcome card on the bare link.
  const newest = saves.newest();
  welcomeCard = welcoming || problem
    ? new Welcome(ui, { saved: newest ? saves.info(newest) : null, onContinue: () => go('#continue'), problem: problem ? `That saved town couldn’t be opened. ${problem}` : '', noStorage: !saves.available })
    : null;
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
      changed += ' · Greece is there now: the Greece button at the end of the top bar (or Tab) opens a map of the Aegean, with Athens, Sparta, Corinth and Troy, their rulers and what they make and want.';
    }
    saveMenu.flash(`Welcome back · ${loaded.label.date} · ${loaded.label.people.toLocaleString('en-GB')} people${changed}`);
  }

  const WALKER_NAMES: Record<string, string> = { water: 'the water carrier', food: 'the food vendor', oil: 'the oil vendor', fleece: 'the fleece vendor', wine: 'the wine vendor', cart: 'the ox cart', porter: 'the porter', priestess: 'the priestess', actor: 'the actor', tax: 'the tax collector', hunter: 'the hunter', watchman: 'the watchman', inspector: 'the inspector', docker: 'the docker' };

  /** The walker with a job nearest a screen point (within a few pixels), if any. */
  const walkerNear = (sx: number, sy: number): number => {
    const r = canvas.getBoundingClientRect();
    let best = -1;
    let bd = 22 * 22;
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
  /** Is the pointer on the ship (near her hull or her mast, on screen)? */
  const shipNear = (sx: number, sy: number): boolean => {
    const at = city.ship.info;
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
  /** The ship's tip: where she is in her schedule, what she buys. */
  const shipStatus = (): Status => {
    const news = shipNews(sim.state);
    return { title: 'The merchant ship from Tyre', detail: [news?.line ?? '', 'She buys wheat, meat and cheese from the granaries, oil, fleece and wine from the storehouses, at steady prices · click for the trading post'].filter((x) => x).join('\n') };
  };
  const showStatus = (st: Status, sx: number, sy: number): void => tip.show(st.detail ? `${st.title}\n${st.detail}` : st.title, sx, sy);

  // With no tool picked, hovering a home says who lives there and what reaches it; a workplace, how it is doing; a walker, what she's doing.
  const hover = (world: { x: number; z: number } | null, sx: number, sy: number): void => {
    const c = walkerNear(sx, sy);
    const w = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
    const ws = w ? walkerStatus(sim.state, w) : null;
    if (ws) return showStatus(ws, sx, sy);
    if (shipNear(sx, sy)) return showStatus(shipStatus(), sx, sy);
    const b = buildingAt(world);
    if (!b) {
      const h = herdAt(world);
      if (h) return showStatus(herdStatus(sim.state, h), sx, sy);
      return tip.show(bridgeAtPointer(world) ? 'A timber bridge' : null, sx, sy);
    }
    const st = homeStatus(sim.state, map, b);
    // A lived-in home: its family's name, and a click opens their panel.
    if (b.family && b.people > 0) {
      st.title = `The house of ${b.family.name} · ${st.title.replace(/^A /, 'a ')}`;
      if (panel.id !== b.id) st.detail = `${st.detail ? st.detail + '\n' : ''}Click to see who lives here`;
    }
    showStatus(st, sx, sy);
  };

  // Following a walker with a job: through her rests and new rounds (the next one from the same place), until the player moves the view.
  let follow: { walker: number; origin: number; kind: Walker['kind']; pans: number } | null = null;
  const startFollow = (origin: number, kind: Walker['kind'], walker = 0): void => {
    follow = { walker, origin, kind, pans: rig.pans };
    followChip.textContent = `Following ${WALKER_NAMES[kind] ?? 'them'} · drag the map or press Esc to stop`;
    followChip.hidden = false;
  };
  const stopFollow = (): void => {
    follow = null;
    followChip.hidden = true;
  };
  const updateFollow = (): void => {
    if (!follow) return;
    if (rig.pans !== follow.pans) return stopFollow();
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
  const MAKERS: ToolName[] = ['farm', 'lodge', 'dairy', 'grove', 'press', 'pasture', 'vineyard', 'winery'];
  const SELLERS: ToolName[] = ['agora', 'stall', 'fleecestall', 'winestall'];
  /** What Z cycles through: the offices. */
  const OFFICES: ToolName[] = ['taxoffice', 'watchpost', 'architect'];
  const next = (list: ToolName[], now: ToolName | null, back = false): ToolName => {
    const i = now ? list.indexOf(now) : -1;
    if (i < 0) return list[0];
    return list[(i + (back ? list.length - 1 : 1)) % list.length];
  };
  const TOOL_KEYS: Record<string, ToolName> = { t: 'road', h: 'housing', b: 'fountain', m: 'farm', g: 'granary', k: 'agora', v: 'shrine', p: 'theatre', z: 'taxoffice', x: 'clear' };
  /** What clicking a workplace follows. */
  const FOLLOWS: Partial<Record<Building['kind'], Walker['kind']>> = { fountain: 'water', agora: 'food', farm: 'cart', shrine: 'priestess', theatre: 'actor', taxoffice: 'tax', lodge: 'hunter', dairy: 'cart', grove: 'cart', press: 'cart', pasture: 'cart', vineyard: 'cart', winery: 'cart', watchpost: 'watchman', architect: 'inspector' };
  const pointerTools: PointerTools = {
    get active() {
      return tools.tool !== null && !greeceOpen();
    },
    pointer(w, sx, sy) {
      if (greeceOpen()) return greece?.hover(sx, sy);
      lastPointer = { world: w, sx, sy };
      if (tools.tool) tools.pointer(w, sx, sy);
      else hover(w, sx, sy);
    },
    down: () => tools.down(),
    up: () => tools.up(),
    cancel: () => {
      // Esc puts away the welcome card, the saves card and the controls card first.
      if (welcomeCard?.open) welcomeCard.dismiss();
      else if (topbar.ratesOpen) topbar.toggleRates(false);
      else if (ledger.open) ledger.toggle(false);
      else if (saveMenu.open) saveMenu.toggle(false);
      else if (corner.helpOpen) corner.toggleHelp(false);
      else if (greece && greeceOpen()) {
        // The map of Greece: its panel first, then the map itself.
        if (greece.shown) greece.show(null);
        else toggleGreece(false);
      } else if (tools.tool) tools.cancel();
      else if (follow) stopFollow();
      else if (tradePanel.open) tradePanel.toggle(false);
      else if (panel.open) panel.show(0);
      else tools.cancel();
    },
    click(w, sx, sy) {
      if (greeceOpen()) return greece?.click(sx, sy);
      // A walker with a job, or the fountain, agora or farm she works from: follow her.
      const c = walkerNear(sx, sy);
      const walker = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
      if (walker) return startFollow(walker.origin, walker.kind, walker.id);
      if (shipNear(sx, sy)) return goToPost();
      const b = buildingAt(w);
      // A lived-in home: who lives there. Open ground: close the panel.
      if (b?.kind === 'home' && b.people > 0) {
        tradePanel.toggle(false);
        panel.show(b.id);
        return hover(w, sx, sy);
      }
      // The trading post: its panel (what to sell, how much to keep, when the ship comes).
      if (b?.kind === 'trading') {
        tradePanel.toggle(true);
        return hover(w, sx, sy);
      }
      if (!b) {
        panel.show(0);
        tradePanel.toggle(false);
      }
      const kind = b ? FOLLOWS[b.kind] : undefined;
      if (b && kind) startFollow(b.id, kind, sim.state.walkers.find((o) => o.origin === b.id && o.kind === kind)?.id ?? 0);
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
      if (k === 'j') {
        // J: the taxes overlay, then fire risk, then wear, then off.
        const cycle = ['tax', 'fire', 'wear'] as const;
        const at = cycle.indexOf(overlay.wanted as (typeof cycle)[number]);
        overlay.wanted = at < 0 ? 'tax' : at === cycle.length - 1 ? null : cycle[at + 1];
        return true;
      }
      let t = TOOL_KEYS[k];
      if (!t) return false;
      // M again: the farm, then the hunting lodge, the dairy, the olive grove, the olive press, the sheep pasture, the vineyard and the winery.
      if (k === 'm') t = next(MAKERS, tools.tool, e?.shiftKey);
      // G again: the granary, then the storehouse, then the trading post; K again: the agora, then its oil, fleece and wine stalls.
      if (k === 'g') t = next(['granary', 'storehouse', 'trading'], tools.tool, e?.shiftKey);
      if (k === 'k') t = next(SELLERS, tools.tool, e?.shiftKey);
      // Z again: the tax office, then the watch post, then the architect's office.
      if (k === 'z') t = next(OFFICES, tools.tool, e?.shiftKey);
      tools.select(t);
      const p = lastPointer;
      tools.pointer(p.world, p.sx, p.sy);
      return true;
    },
  };
  tools.onChange((t) => {
    if (!t) hover(lastPointer.world, lastPointer.sx, lastPointer.sy);
  });
  const pollKeys = attachInput(canvas, () => (greece?.open ? greece.rig : rig), driver, () => corner.toggleHelp(), pointerTools);
  if (demo?.tool) tools.select(demo.tool);
  if (demo?.follow) {
    const kind = demo.follow;
    const from: Building['kind'] =
      kind === 'water' ? 'fountain' : kind === 'food' || kind === 'oil' || kind === 'fleece' || kind === 'wine' ? 'agora' : kind === 'priestess' ? 'shrine' : kind === 'actor' ? 'theatre' : kind === 'tax' ? 'taxoffice' : kind === 'hunter' ? 'lodge' : kind === 'watchman' ? 'watchpost' : kind === 'inspector' ? 'architect' : 'farm';
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
  const greeceOpen = (): boolean => greece?.open === true;
  const greeceButton = new GreeceButton(() => toggleGreece());
  const loadGreece = (): Promise<GreeceMap> =>
    (greeceLoading ??= import('./render/greece/index').then((m) => {
      greece = m.createGreece(
        {
          renderer,
          canvas,
          ui,
          send: (c) => {
            sim.enqueue(c);
            sim.flush();
            sound.play('build');
            startAutosaving();
          },
        },
        () => performance.now(),
      );
      probe.greeceBuildMs = greece.buildMs;
      return greece;
    }));
  /** Open or close the map (opening it the first time loads it). */
  function toggleGreece(on?: boolean, city?: CityId): void {
    const want = on ?? !greeceOpen();
    if (!want) {
      if (!greece?.open) return;
      greece.toggle(false);
      greeceButton.set(false);
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
    tip.show(null, 0, 0);
    welcomeCard?.dismiss();
    greeceButton.set(true);
    if (!greeceAsked) greeceAsked = performance.now();
    void loadGreece().then((g) => {
      if (!greeceButton.el.classList.contains('on')) return;
      g.toggle(true);
      resize();
      if (city) g.show(city);
      sound.play('map');
    });
  }

  // A demo can open a household's panel from the start.
  const opened = demo?.open?.(sim.state) ?? 0;
  if (opened) panel.show(opened);
  if (demo?.ledger) ledger.toggle(true);
  if (demo?.trade) tradePanel.toggle(true);
  if (demo?.side?.ware !== undefined) side.showWare(demo.side.ware);
  else if (demo?.side?.tab) side.showTab(demo.side.tab);
  if (demo?.greece) toggleGreece(true, demo.greece === true ? undefined : demo.greece);

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
    triangles: renderer.info.render.triangles,
    calls: renderer.info.render.calls,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  });
  probe.setView = (name: string) => rig.jumpTo(VIEWS[name] ?? VIEWS.coast);
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
    const first = [...city.walkers.serviceAt.values()].find((o) => o.kind === kind)?.pos;
    if (!first) return null;
    const v = first.clone().setY(first.y + 0.3).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };
  probe.carrier = () => probe.walker?.('water') ?? null;
  probe.where = (kind: string) => {
    const first = [...city.walkers.serviceAt.values()].find((o) => o.kind === kind)?.pos;
    return first ? { x: first.x, z: first.z } : null;
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
  probe.sound = () => ({ started: sound.started, muted: sound.muted, played: sound.played, state: sound.state });
  probe.welcome = () => !!welcomeCard?.open;
  probe.ledgerText = () => ledger.text;
  probe.tradeText = () => tradePanel.text;
  probe.trade = (open) => tradePanel.toggle(open);
  probe.ship = () => {
    const sh = sim.state.trade.ship;
    return { ...city.ship.info, phase: sh.phase, due: sh.due, since: sh.since, visits: sh.visits, lastPaid: sh.lastPaid, chip: shipNews(sim.state)?.chip ?? '', short: shipNews(sim.state)?.short ?? '' };
  };
  probe.ledger = (open) => ledger.toggle(open);
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
  probe.greece = (open, city) => toggleGreece(open, city as CityId | undefined);
  probe.greeceInfo = () => (greece ? greece.info() : { open: false, built: false });
  probe.screenOf = (x, z) => {
    const v = new THREE.Vector3(x, map.heightAt(x, z), z).project(camera);
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
  // The ship as last seen: her sail sighted rings the harbour bell; her paying floats the drachmas up from the quay.
  let shipSeen = { phase: sim.state.trade.ship.phase, visits: sim.state.trade.ship.visits };
  // Tax collectors' satchels as last seen, so "+84 dr" floats up from the office when one hands in.
  const satchels = new Map<number, { dr: number; origin: number }>();
  // The population's tooltip says how often newcomers are coming, and why.
  let outlookAt = -Infinity;
  let workRev = -1;
  let troubleAt = -Infinity;
  let linesAt = -Infinity;
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
      let t = d.y < -1e-4 ? (ground - o.y) / d.y : Infinity;
      const flat = Math.hypot(d.x, d.z) || 1;
      t = Math.min(t, 160 / flat);
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
      topbar.setPeopleTip(arrivalOutlook(s, map));
      topbar.setMoneyTip(moneyTip(s));
    }
    {
      const l = s.ledger;
      const m = monthOf(s.tick);
      const last = l.month === m ? l.last : l.month === m - 1 ? l.now : [];
      topbar.showTrend(last.length ? totals(last).net : null, owedWages(s).owed > 0);
      topbar.showRate(s.taxRate);
      topbar.showShip(shipNews(s));
    }
    if (s.rev + s.looks !== workRev) {
      workRev = s.rev + s.looks;
      topbar.showWork(workforce(s), BUILDING_NAMES);
    }
    if (time - troubleAt > 0.5) {
      troubleAt = time;
      topbar.showTrouble(trouble().map((h) => ({ name: h.b.family?.name ?? '?', need: h.need, days: Math.max(1, Math.ceil(h.left / TICKS_PER_DAY)) })));
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
      greece.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time, dt);
      topbar.showDate(sim.date);
      topbar.showCity(s.population, s.money, time);
      probe.updateMs += performance.now() - jsStart;
      greece.render();
      if (!greeceFirst) {
        greeceFirst = true;
        probe.greeceOpenMs = performance.now() - greeceAsked;
      }
      probe.frames++;
      return;
    }
    world.setSeason(sim.date.month / 12 + (sim.date.day - 1) / (12 * 30));
    world.update(time, rig, s.wind.angle, s.wind.strength);
    city.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time, camera.quaternion);
    updateFollow();
    overlay.update(s, time);
    bar.showOverlay(overlay.mode);
    legend.hidden = overlay.mode !== 'missing' && overlay.mode !== 'variety';
    if (!legend.hidden && legendFor !== overlay.mode) {
      legendFor = overlay.mode as string;
      legend.innerHTML = legendFor === 'variety' ? VARIETY_LEGEND : MISSING_LEGEND;
    }
    signs.update(s, camera, time, overlay.mode === 'missing');
    hazardView.update(s, camera, time, city.walkers.serviceAt);
    ledger.update(s, map, time);
    tradePanel.update(s, map, time);
    {
      const t = performance.now();
      side.update(s, time);
      if (side.open) side.minimap.update(s, rig.view.yaw, viewOutline(), time, city.ship.info);
      probe.sideMs += performance.now() - t;
    }
    const open = panel.update(s, map, time);
    selection.set(open ?? (tradePanel.open ? (tradingPost(s) ?? null) : null));
    selection.update(time);
    if (mark?.mesh.visible && demo?.mark) {
      if (s.tiles[demo.mark.z * map.size + demo.mark.x] === TILE_ROAD) mark.set(null);
      else mark.update(time);
    }
    placement.update(time);
    tools.frame();
    topbar.showDate(sim.date);
    topbar.showCity(s.population, s.money, time);
    const why = undoRefusal(s);
    bar.setUndo(why === '', why === 'Nothing to undo' ? '' : why);
    corner.setHeading(rig.view.yaw);
    // What frames cost on the main thread before drawing (the sim's steps and every view's update), summed.
    probe.updateMs += performance.now() - jsStart;
    renderer.render(world.scene, camera);
    floaters.update(camera, canvas.clientWidth, canvas.clientHeight, time);
    probe.frames++;
    if (probe.frames === 1) probe.firstFrameAt = performance.now();
  });

  document.getElementById('loading')?.classList.add('gone');
  probe.startMs = performance.now() - t0;
  probe.readyAt = performance.now();
  probe.ready = true;
}

// Say what the wait is for: a prepared town is played forward before it opens, and a save is read.
{
  const l = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const card = document.getElementById('loading');
  if (card && l.demo && DEMOS[l.demo]?.setup) card.textContent = 'Shaping the coast and getting the town ready…';
  else if (card && l.load) card.textContent = 'Opening your town…';
}
// Let the loading card paint before the coast is shaped.
requestAnimationFrame(() => setTimeout(start, 0));
