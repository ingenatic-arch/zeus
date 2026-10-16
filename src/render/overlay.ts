import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { PLOT_SIZE } from '../sim/build';
import { roadSearch } from '../sim/roads';
import { TILE_ROAD, type SimState } from '../sim/state';
import { CARRIER_RANGE, roadsBeside, waterReach, WATER_LASTS } from '../sim/water';
import { WATER_DRY, WATER_FOUNTAIN, WATER_HOME, WATER_PREVIEW, WATER_REACH, WATER_WALKED, type Placement } from './placement';

/** How often (seconds) the overlay is brought up to date while it shows. */
const REFRESH = 0.25;

/**
 * The water overlay: road tiles in a water carrier's reach and the homes'
 * water, tinted on the ground (through the placing overlay's texture), and a
 * column over every lived-in home: blue, as tall as its water is fresh, or a
 * short terracotta stub where there is none. While a fountain is being
 * placed it also shows what the new one would reach.
 */
export class WaterOverlay {
  readonly group = new THREE.Group();
  /** Shown because the player asked for it. */
  wanted = false;
  /** Shown because a tool needs it (placing a fountain). */
  forced = false;
  private columns: THREE.InstancedMesh;
  private readonly codes: Uint8Array;
  private last = -Infinity;
  private lastRev = -1;
  private preview: number[] | null = null;
  private previewKey = '';
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly wet = new THREE.Color('#3f8fe0');
  private readonly fresh = new THREE.Color('#8fd8ff');
  private readonly dry = new THREE.Color('#d8643a');

  constructor(
    private readonly map: CoastMap,
    private readonly placement: Placement,
  ) {
    this.group.name = 'water-overlay';
    this.codes = new Uint8Array(map.size * map.size);
    const geo = new THREE.CylinderGeometry(0.1, 0.11, 1, 6).translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, flatShading: true, emissive: new THREE.Color('#203a55'), emissiveIntensity: 0.25 });
    this.columns = new THREE.InstancedMesh(geo, mat, 256);
    this.columns.name = 'water-columns';
    this.columns.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.columns.count = 0;
    this.columns.frustumCulled = false;
    this.group.add(this.columns);
    this.group.visible = false;
  }

  get on(): boolean {
    return this.wanted || this.forced;
  }

  /** Road tiles beside a fountain being placed (its reach is previewed), or null. */
  setPreview(sources: number[] | null): void {
    const key = sources ? sources.join(',') : '';
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.preview = sources;
    this.last = -Infinity;
  }

  update(s: SimState, time: number): void {
    const on = this.on;
    this.group.visible = on;
    this.placement.showOverlay(on);
    if (!on) return;
    if (time - this.last < REFRESH && s.rev === this.lastRev) return;
    this.last = time;
    this.lastRev = s.rev;
    this.refresh(s);
  }

  private refresh(s: SimState): void {
    const size = this.map.size;
    const codes = this.codes;
    codes.fill(0);
    const reach = waterReach(s, size);
    const pre = this.preview ? roadSearch(s, size, this.preview).dist : null;
    for (let t = 0; t < codes.length; t++) {
      const on = s.tiles[t];
      if (on !== TILE_ROAD) continue;
      const d = reach.dist[t];
      if (d >= 0 && d <= CARRIER_RANGE) {
        const k = Math.round(99 * (1 - d / (CARRIER_RANGE + 1)));
        const walked = s.rounds.water.walked[t] > 0 && s.tick - s.rounds.water.walked[t] < WATER_LASTS;
        codes[t] = (walked ? WATER_WALKED : WATER_REACH) + k;
      } else if (pre && pre[t] >= 0 && pre[t] <= CARRIER_RANGE) codes[t] = WATER_PREVIEW;
    }
    let n = 0;
    const need = s.buildings.length;
    if (need > this.columnsCap()) this.grow(need);
    for (const b of s.buildings) {
      let code = 0;
      if (b.kind === 'fountain') code = WATER_FOUNTAIN;
      else if (b.level > 0) {
        const left = b.waterUntil - s.tick;
        const k = left > 0 ? Math.min(1, left / WATER_LASTS) : 0;
        code = left > 0 ? WATER_HOME + Math.round(39 * k) : WATER_DRY;
        // The column.
        const cx = b.x + PLOT_SIZE / 2;
        const cz = b.z + PLOT_SIZE / 2;
        const y = this.map.heightAt(cx, cz) + (b.level >= 2 ? 1.3 : 1.0);
        const h = left > 0 ? 0.2 + 0.7 * k : 0.22;
        this.p.set(cx, y, cz);
        this.s.set(left > 0 ? 1 : 1.5, h, left > 0 ? 1 : 1.5);
        this.m.compose(this.p, this.q, this.s);
        this.columns.setMatrixAt(n, this.m);
        if (left > 0) this.c.copy(this.wet).lerp(this.fresh, k * 0.6);
        else this.c.copy(this.dry);
        this.columns.setColorAt(n, this.c);
        n++;
      }
      if (!code) continue;
      for (let dz = 0; dz < PLOT_SIZE; dz++) for (let dx = 0; dx < PLOT_SIZE; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = n;
    this.columns.instanceMatrix.needsUpdate = true;
    if (this.columns.instanceColor) this.columns.instanceColor.needsUpdate = true;
    this.placement.setOverlay(codes);
  }

  private columnsCap(): number {
    return this.columns.instanceMatrix.count;
  }

  private grow(need: number): void {
    const cap = Math.max(need, this.columnsCap() * 2);
    const old = this.columns;
    const mesh = new THREE.InstancedMesh(old.geometry, old.material, cap);
    mesh.name = old.name;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    mesh.frustumCulled = false;
    this.group.remove(old);
    old.dispose();
    this.group.add(mesh);
    this.columns = mesh;
  }
}

/** Homes a new fountain with these roadside tiles would reach, and how many of them have no water now. */
export function previewReach(s: SimState, size: number, sources: number[]): { homes: number; dry: number } {
  if (sources.length === 0) return { homes: 0, dry: 0 };
  const dist = roadSearch(s, size, sources).dist;
  let homes = 0;
  let dry = 0;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0) continue;
    if (!roadsBeside(s, size, b).some((t) => dist[t] >= 0 && dist[t] <= CARRIER_RANGE)) continue;
    homes++;
    if (b.waterUntil <= s.tick) dry++;
  }
  return { homes, dry };
}
