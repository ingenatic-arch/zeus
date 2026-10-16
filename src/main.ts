import './ui/style.css';
import * as THREE from 'three';
import { ClockDriver, type Speed } from './game/clockDriver';
import { DEMOS } from './game/demos';
import { attachInput, type PointerTools } from './game/input';
import { readLaunch } from './game/links';
import { Tools, type ToolName } from './game/tools';
import { VIEWS } from './game/views';
import { coastMap } from './map/bake';
import { CameraRig, type CameraView } from './render/cameraRig';
import { CityView } from './render/city';
import { ServiceOverlay } from './render/overlay';
import { Selection, Signs } from './render/signs';
import { Placement } from './render/placement';
import { World } from './render/world';
import { isBridge } from './sim/build';
import { BUILDING_NAMES, centreOf, findBuilding } from './sim/buildings';
import { TICKS_PER_DAY } from './sim/clock';
import { NEED_WORDS, warningOf, warningsOf } from './sim/folk';
import { workforce } from './sim/labour';
import { arrivalOutlook } from './sim/settlers';
import { homeStatus, walkerStatus, type Status } from './sim/status';
import { TILE_ROAD, type Building, type Walker } from './sim/state';
import { Sim, undoRefusal } from './sim/sim';
import { BuildBar, pointerTip } from './ui/buildbar';
import { Floaters } from './ui/floaters';
import { buildCorner } from './ui/help';
import { HouseholdPanel } from './ui/household';
import { TopBar } from './ui/topbar';

interface Probe {
  ready: boolean;
  frames: number;
  bakeMs: number;
  startMs: number;
  /** Main-thread time spent before drawing, summed over all frames (sim steps and view updates), in ms. */
  updateMs: number;
  /** When (ms since the page began loading) the game was ready, and when its first frame was drawn. */
  readyAt?: number;
  firstFrameAt?: number;
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
    rent: number;
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
  /** Lived-in homes: where they are (top-left tile), their level, and whether they are warned. */
  homes?: () => Array<{ id: number; x: number; z: number; level: number; people: number; warned: boolean; left: number }>;
  tool?: (t: string | null) => void;
  /** Screen position of a world point (for driving the mouse in tests). */
  screenOf?: (x: number, z: number) => { x: number; y: number };
  speed?: (s: Speed) => void;
}

const probe: Probe = { ready: false, frames: 0, bakeMs: 0, startMs: 0, updateMs: 0 };
(window as unknown as { __zeus: Probe }).__zeus = probe;

function start(): void {
  const t0 = performance.now();
  const launch = readLaunch(location.search, location.hash, DEMOS, VIEWS);
  const demo = launch.demo ? DEMOS[launch.demo] : undefined;
  const view = VIEWS[launch.cam ?? demo?.view ?? 'coast'] ?? VIEWS.coast;
  const speed: Speed = launch.speed ?? demo?.speed ?? 'normal';
  const shot = launch.shot;

  const map = coastMap();
  probe.bakeMs = performance.now() - t0;
  const sim = new Sim();
  demo?.setup?.(sim);
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
  const corner = buildCorner(ui, () => rig.faceNorth(), !shot && !demo?.tool);
  const tip = pointerTip(ui);
  const tools = new Tools(sim, placement, tip, overlay);
  const bar = new BuildBar(ui, (t) => tools.select(t), () => tools.undo(), (o) => overlay.toggle(o));
  tools.onChange((t) => bar.showTool(t));
  const floaters = new Floaters(ui);
  const panel = new HouseholdPanel(ui, () => panel.show(0));
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.hidden = true;
  legend.innerHTML = '<b>What’s missing</b><span><i class="warn"></i>Going down a level unless it comes</span><span><i class="want"></i>Needs it to grow</span><span><i class="fine"></i>Has all it needs</span>';
  ui.appendChild(legend);
  const followChip = document.createElement('div');
  followChip.className = 'follow-chip';
  followChip.hidden = true;
  ui.appendChild(followChip);
  const WALKER_NAMES: Record<string, string> = { water: 'the water carrier', food: 'the food vendor', cart: 'the ox cart', porter: 'the porter', priestess: 'the priestess', actor: 'the actor' };

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
  const bridgeAtPointer = (world: { x: number; z: number } | null): boolean => {
    const n = map.size;
    if (!world || world.x < 0 || world.z < 0 || world.x >= n || world.z >= n) return false;
    return isBridge(map, sim.state, Math.floor(world.z) * n + Math.floor(world.x));
  };
  const showStatus = (st: Status, sx: number, sy: number): void => tip.show(st.detail ? `${st.title}\n${st.detail}` : st.title, sx, sy);

  // With no tool picked, hovering a home says who lives there and what reaches it; a workplace, how it is doing; a walker, what she's doing.
  const hover = (world: { x: number; z: number } | null, sx: number, sy: number): void => {
    const c = walkerNear(sx, sy);
    const w = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
    const ws = w ? walkerStatus(sim.state, w) : null;
    if (ws) return showStatus(ws, sx, sy);
    const b = buildingAt(world);
    if (!b) return tip.show(bridgeAtPointer(world) ? 'A timber bridge' : null, sx, sy);
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
      const next = sim.state.walkers.find((o) => o.origin === f.id && o.kind === follow?.kind);
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
  const TOOL_KEYS: Record<string, ToolName> = { t: 'road', h: 'housing', b: 'fountain', m: 'farm', g: 'granary', k: 'agora', v: 'shrine', p: 'theatre', x: 'clear' };
  /** What clicking a workplace follows. */
  const FOLLOWS: Partial<Record<Building['kind'], Walker['kind']>> = { fountain: 'water', agora: 'food', farm: 'cart', shrine: 'priestess', theatre: 'actor' };
  const pointerTools: PointerTools = {
    get active() {
      return tools.tool !== null;
    },
    pointer(w, sx, sy) {
      lastPointer = { world: w, sx, sy };
      if (tools.tool) tools.pointer(w, sx, sy);
      else hover(w, sx, sy);
    },
    down: () => tools.down(),
    up: () => tools.up(),
    cancel: () => {
      if (tools.tool) tools.cancel();
      else if (follow) stopFollow();
      else if (panel.open) panel.show(0);
      else tools.cancel();
    },
    click(w, sx, sy) {
      // A walker with a job, or the fountain, agora or farm she works from: follow her.
      const c = walkerNear(sx, sy);
      const walker = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
      if (walker) return startFollow(walker.origin, walker.kind, walker.id);
      const b = buildingAt(w);
      // A lived-in home: who lives there. Open ground: close the panel.
      if (b?.kind === 'home' && b.people > 0) {
        panel.show(b.id);
        return hover(w, sx, sy);
      }
      if (!b) panel.show(0);
      const kind = b ? FOLLOWS[b.kind] : undefined;
      if (b && kind) startFollow(b.id, kind, sim.state.walkers.find((o) => o.origin === b.id && o.kind === kind)?.id ?? 0);
    },
    key(k) {
      if (k === 'undo' || k === 'u') {
        tools.undo();
        return true;
      }
      if (k === 'o') {
        overlay.toggle('water');
        return true;
      }
      if (k === 'l') {
        overlay.toggle('food');
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
      const t = TOOL_KEYS[k];
      if (!t) return false;
      tools.select(t);
      const p = lastPointer;
      tools.pointer(p.world, p.sx, p.sy);
      return true;
    },
  };
  tools.onChange((t) => {
    if (!t) hover(lastPointer.world, lastPointer.sx, lastPointer.sy);
  });
  const pollKeys = attachInput(canvas, rig, driver, () => corner.toggleHelp(), pointerTools);
  if (demo?.tool) tools.select(demo.tool);
  if (demo?.follow) {
    const kind = demo.follow;
    const from: Building['kind'] = kind === 'water' ? 'fountain' : kind === 'food' ? 'agora' : kind === 'priestess' ? 'shrine' : kind === 'actor' ? 'theatre' : 'farm';
    // Carts: wait at the farm whose field is nearest to ripe and follow its first cart, so the harvest itself is in view.
    const ripest = kind === 'cart' ? sim.state.buildings.filter((b) => b.kind === 'farm').sort((a, b) => b.growth - a.growth)[0] : undefined;
    const w = ripest ? undefined : sim.state.walkers.find((o) => o.kind === kind);
    const f = ripest ?? (w ? findBuilding(sim.state, w.origin) : sim.state.buildings.find((b) => b.kind === from));
    if (f) startFollow(f.id, kind, w?.id ?? 0);
  }

  // A demo can open a household's panel from the start.
  const opened = demo?.open?.(sim.state) ?? 0;
  if (opened) panel.show(opened);

  /** "water", "water or bread", "water, bread or blessings". */
  const orList = (w: string[]): string => (w.length <= 1 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} or ${w[w.length - 1]}`);
  /** Homes in trouble, most urgent first. */
  const trouble = (): Array<{ b: Building; left: number; need: string }> => {
    const out: Array<{ b: Building; left: number; need: string }> = [];
    for (const b of sim.state.buildings) {
      const ws = warningsOf(sim.state, b);
      if (ws.length) out.push({ b, left: ws[0].left, need: orList(ws.map((w) => NEED_WORDS[w.need])) });
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

  const resize = (): void => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
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
  probe.jump = (v: CameraView) => rig.jumpTo(v);
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
      rent: s.rent.paid,
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
      panel: panel.id,
      undo: undoRefusal(s),
      routes: tools.routesFound,
      markWrites: placement.markWrites,
      homesRefilled: city.homes.lastRefilled,
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
  probe.tool = (t) => tools.select(t as ToolName | null);
  probe.speed = (s) => driver.setSpeed(s);
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
  // The population's tooltip says how often newcomers are coming, and why.
  let outlookAt = -Infinity;
  let workRev = -1;
  let troubleAt = -Infinity;

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
    rig.update(dt);
    const s = sim.state;
    if (s.rev !== seenRev) {
      seenRev = s.rev;
      for (const b of s.buildings) {
        const before = known.get(b.id) ?? { people: 0, level: 0 };
        const [cx, cz] = centreOf(b);
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
        // People moving away from a home that stays (it went down a level).
        if (b.kind === 'home' && b.people < before.people && b.level < before.level) floaters.add(`−${before.people - b.people}`, at.clone().setY(at.y - 0.2), time, 'dry');
      }
      remember();
    }
    if (time - outlookAt > 2) {
      outlookAt = time;
      topbar.setPeopleTip(arrivalOutlook(s, map));
      topbar.setMoneyTip(s.rent);
    }
    if (s.rev + s.looks !== workRev) {
      workRev = s.rev + s.looks;
      topbar.showWork(workforce(s), BUILDING_NAMES);
    }
    if (time - troubleAt > 0.5) {
      troubleAt = time;
      topbar.showTrouble(trouble().map((h) => ({ name: h.b.family?.name ?? '?', need: h.need, days: Math.max(1, Math.ceil(h.left / TICKS_PER_DAY)) })));
    }
    world.update(time, rig, s.wind.angle, s.wind.strength);
    city.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time);
    updateFollow();
    overlay.update(s, time);
    bar.showOverlay(overlay.mode);
    legend.hidden = overlay.mode !== 'missing';
    signs.update(s, camera, time, overlay.mode === 'missing');
    const open = panel.update(s, map, time);
    selection.set(open);
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

// Let the loading card paint before the coast is shaped.
requestAnimationFrame(() => setTimeout(start, 0));
