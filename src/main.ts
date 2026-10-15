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
import { WaterOverlay } from './render/overlay';
import { Placement } from './render/placement';
import { World } from './render/world';
import { PLOT_SIZE } from './sim/build';
import { findBuilding } from './sim/buildings';
import { arrivalOutlook } from './sim/settlers';
import { carrierStatus, homeStatus, type Status } from './sim/status';
import type { Building } from './sim/state';
import { Sim } from './sim/sim';
import { BuildBar, pointerTip } from './ui/buildbar';
import { Floaters } from './ui/floaters';
import { buildCorner } from './ui/help';
import { TopBar } from './ui/topbar';

interface Probe {
  ready: boolean;
  frames: number;
  bakeMs: number;
  startMs: number;
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
    fountains: number;
    carriers: number;
    watered: number;
    walkers: number;
    people: number;
    roads: number;
    cleared: number;
    tool: string | null;
    overlay: boolean;
    following: boolean;
    routes: number;
    markWrites: number;
    homesRefilled: number;
  };
  /** Screen position of the first water carrier, if one is out. */
  carrier?: () => { x: number; y: number } | null;
  /** The text of the pointer tip, if it shows. */
  tipText?: () => string | null;
  tool?: (t: string | null) => void;
  /** Screen position of a world point (for driving the mouse in tests). */
  screenOf?: (x: number, z: number) => { x: number; y: number };
  speed?: (s: Speed) => void;
}

const probe: Probe = { ready: false, frames: 0, bakeMs: 0, startMs: 0 };
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
  const overlay = new WaterOverlay(map, placement);
  overlay.wanted = launch.overlay;
  world.scene.add(overlay.group);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 9000);
  const rig = new CameraRig(camera, map, view);

  const ui = document.getElementById('ui') as HTMLElement;
  const topbar = new TopBar(ui, driver);
  // The first-time hint says left-drag moves the view, which isn't so with a tool already picked.
  const corner = buildCorner(ui, () => rig.faceNorth(), !shot && !demo?.tool);
  const tip = pointerTip(ui);
  const tools = new Tools(sim, placement, tip, overlay);
  const toggleWater = (): void => {
    overlay.wanted = !overlay.wanted;
  };
  const bar = new BuildBar(ui, (t) => tools.select(t), () => tools.undo(), toggleWater);
  tools.onChange((t) => bar.showTool(t));
  const floaters = new Floaters(ui);
  const followChip = document.createElement('div');
  followChip.className = 'follow-chip';
  followChip.hidden = true;
  followChip.textContent = 'Following the water carrier · drag the map or press Esc to stop';
  ui.appendChild(followChip);

  /** The water carrier nearest a screen point (within a few pixels), if any. */
  const carrierNear = (sx: number, sy: number): number => {
    const r = canvas.getBoundingClientRect();
    let best = -1;
    let bd = 22 * 22;
    const v = new THREE.Vector3();
    for (const [id, pos] of city.walkers.carrierAt) {
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
  const showStatus = (st: Status, sx: number, sy: number): void => tip.show(st.detail ? `${st.title}\n${st.detail}` : st.title, sx, sy);

  // With no tool picked, hovering a home says who lives there and what reaches it; a fountain or its carrier, what she's doing.
  const hover = (world: { x: number; z: number } | null, sx: number, sy: number): void => {
    const c = carrierNear(sx, sy);
    const w = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
    if (w) return showStatus(carrierStatus(w), sx, sy);
    const b = buildingAt(world);
    if (!b) return tip.show(null);
    showStatus(homeStatus(sim.state, map, b), sx, sy);
  };

  // Following a water carrier: through her rests and new rounds, until the player moves the view.
  let follow: { fountain: number; pans: number } | null = null;
  const startFollow = (fountain: number): void => {
    follow = { fountain, pans: rig.pans };
    followChip.hidden = false;
  };
  const stopFollow = (): void => {
    follow = null;
    followChip.hidden = true;
  };
  const updateFollow = (): void => {
    if (!follow) return;
    if (rig.pans !== follow.pans) return stopFollow();
    const f = findBuilding(sim.state, follow.fountain);
    if (!f) return stopFollow();
    const pos = city.walkers.carrierAt.get(f.walker);
    if (pos) rig.follow(pos.x, pos.z);
    else rig.follow(f.x + 1, f.z + 1);
  };
  let lastPointer: { world: { x: number; z: number } | null; sx: number; sy: number } = { world: null, sx: 0, sy: 0 };
  const TOOL_KEYS: Record<string, ToolName> = { t: 'road', h: 'housing', b: 'fountain', x: 'clear' };
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
      if (tools.tool || !follow) tools.cancel();
      else stopFollow();
    },
    click(w, sx, sy) {
      // A water carrier, or a fountain: follow her.
      const c = carrierNear(sx, sy);
      const walker = c >= 0 ? sim.state.walkers.find((o) => o.id === c) : undefined;
      if (walker) return startFollow(walker.origin);
      const b = buildingAt(w);
      if (b?.kind === 'fountain') startFollow(b.id);
    },
    key(k) {
      if (k === 'undo' || k === 'u') {
        tools.undo();
        return true;
      }
      if (k === 'o') {
        toggleWater();
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
    const f = sim.state.buildings.find((b) => b.kind === 'fountain');
    if (f) startFollow(f.id);
  }

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
    return {
      population: s.population,
      money: s.money,
      homes: homes.length,
      tents: homes.filter((b) => b.level === 1).length,
      huts: homes.filter((b) => b.level === 2).length,
      fountains: s.buildings.length - homes.length,
      carriers: s.walkers.filter((w) => w.kind === 'water').length,
      watered: homes.filter((b) => b.waterUntil > s.tick).length,
      walkers: s.walkers.length,
      people: city.walkers.count,
      roads: s.tiles.filter((t) => t === -1).length,
      cleared: s.cleared.length,
      tool: tools.tool,
      overlay: overlay.on,
      following: follow !== null,
      routes: tools.routesFound,
      markWrites: placement.markWrites,
      homesRefilled: city.homes.lastRefilled,
    };
  };
  probe.carrier = () => {
    const first = [...city.walkers.carrierAt.values()][0];
    if (!first) return null;
    const v = first.clone().setY(first.y + 0.3).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  };
  probe.tipText = () => {
    const el = document.querySelector('.pointer-tip') as HTMLElement | null;
    return el && !el.hidden ? (el.dataset.text ?? el.textContent) : null;
  };
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

  let last = performance.now();
  let time = 0;
  renderer.setAnimationLoop((now) => {
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
        const cx = b.x + PLOT_SIZE / 2;
        const cz = b.z + PLOT_SIZE / 2;
        const at = new THREE.Vector3(cx, map.heightAt(cx, cz), cz);
        if (b.people > before.people) floaters.add(`+${b.people - before.people}`, at, time);
        if (b.kind === 'home' && b.level === 2 && before.level === 1) floaters.add('Hut', at.setY(at.y + 0.5), time, 'water');
        if (b.kind === 'home' && b.level === 1 && before.level === 2) floaters.add('Back to a tent', at.setY(at.y + 0.5), time, 'dry');
      }
      remember();
    }
    if (time - outlookAt > 2) {
      outlookAt = time;
      topbar.setPeopleTip(arrivalOutlook(s, map));
    }
    world.update(time, rig, s.wind.angle, s.wind.strength);
    city.update(s, driver.speed === 'paused' ? 0 : Math.min(1, driver.alpha), time);
    updateFollow();
    overlay.update(s, time);
    bar.showWater(overlay.on);
    placement.update(time);
    tools.frame();
    topbar.showDate(sim.date);
    topbar.showCity(s.population, s.money, time);
    bar.setUndo(s.undo.length > 0);
    corner.setHeading(rig.view.yaw);
    renderer.render(world.scene, camera);
    floaters.update(camera, canvas.clientWidth, canvas.clientHeight, time);
    probe.frames++;
  });

  document.getElementById('loading')?.classList.add('gone');
  probe.startMs = performance.now() - t0;
  probe.ready = true;
}

// Let the loading card paint before the coast is shaped.
requestAnimationFrame(() => setTimeout(start, 0));
