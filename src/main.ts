import './ui/style.css';
import * as THREE from 'three';
import { ClockDriver, SPEEDS, type Speed } from './game/clockDriver';
import { attachInput } from './game/input';
import { DEMOS, VIEWS } from './game/views';
import { coastMap } from './map/bake';
import { CameraRig, type CameraView } from './render/cameraRig';
import { World } from './render/world';
import { Sim } from './sim/sim';
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
}

const params = new URLSearchParams(location.search);
const probe: Probe = { ready: false, frames: 0, bakeMs: 0, startMs: 0 };
(window as unknown as { __zeus: Probe }).__zeus = probe;

function start(): void {
  const t0 = performance.now();
  const demo = DEMOS[params.get('demo') ?? ''];
  const viewName = params.get('cam') ?? demo?.view ?? 'coast';
  const view = VIEWS[viewName] ?? VIEWS.coast;
  const speedParam = params.get('speed') as Speed | null;
  const speed: Speed = speedParam && SPEEDS.includes(speedParam) ? speedParam : 'normal';
  const shot = params.has('shot');

  const sim = new Sim();
  const driver = new ClockDriver(sim, speed);
  const map = coastMap();
  probe.bakeMs = performance.now() - t0;

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
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 9000);
  const rig = new CameraRig(camera, map, view);

  const ui = document.getElementById('ui') as HTMLElement;
  const topbar = new TopBar(ui, driver);
  const corner = buildCorner(ui, () => rig.faceNorth(), !shot);
  const pollKeys = attachInput(canvas, rig, driver, () => corner.toggleHelp());

  const resize = (): void => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
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
      if (!m.isMesh) return;
      const g = m.geometry;
      const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const count = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
      out.push({ name: m.name, count, triangles: tris * count, shadow: m.castShadow });
    });
    return out;
  };

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
    const w = sim.state.wind;
    world.update(time, rig, w.angle, w.strength);
    topbar.showDate(sim.date);
    corner.setHeading(rig.view.yaw);
    renderer.render(world.scene, camera);
    probe.frames++;
  });

  document.getElementById('loading')?.classList.add('gone');
  probe.startMs = performance.now() - t0;
  probe.ready = true;
}

// Let the loading card paint before the coast is shaped.
requestAnimationFrame(() => setTimeout(start, 0));
