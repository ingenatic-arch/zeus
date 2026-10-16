import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { sideOf } from '../sim/buildings';
import { eatsBread, FOOD_LASTS, VENDOR_RANGE } from '../sim/food';
import { roadSearch, type Search } from '../sim/roads';
import { roadsBeside } from '../sim/rounds';
import { TILE_ROAD, type Building, type BuildingKind, type Service, type SimState } from '../sim/state';
import { CARRIER_RANGE, waterReach, WATER_LASTS } from '../sim/water';
import { TICKS_PER_MONTH } from '../sim/clock';
import { warningOf, wantOf } from '../sim/folk';
import { FOOD_FARM, FOOD_GRANARY, MISSING_FINE, MISSING_WANT, MISSING_WARN, WATER_DRY, WATER_FOUNTAIN, WATER_HOME, WATER_PREVIEW, WATER_REACH, WATER_WALKED, type Placement } from './placement';

/** How often (seconds) the overlay is brought up to date while it shows. */
const REFRESH = 0.25;

/** What each service's overlay reads: where its walkers start, how far they go, how long it lasts, and which homes want it. */
interface Mode {
  source: BuildingKind;
  range: number;
  lasts: number;
  until: (b: Building) => number;
  wants: (b: Building) => boolean;
}

/** What an overlay shows: a service's reach and supply, or what each home is missing. */
export type OverlayMode = Service | 'missing';

const MODES: Record<Service, Mode> = {
  water: { source: 'fountain', range: CARRIER_RANGE, lasts: WATER_LASTS, until: (b) => b.waterUntil, wants: (b) => b.kind === 'home' && b.level > 0 },
  food: { source: 'agora', range: VENDOR_RANGE, lasts: FOOD_LASTS, until: (b) => b.foodUntil, wants: eatsBread },
};

/** How far by road each road tile is from the nearest building of a kind (dist -1: none reaches it). */
export function reachOf(s: SimState, size: number, kind: BuildingKind): Search {
  if (kind === 'fountain') return waterReach(s, size);
  const sources: number[] = [];
  for (const b of s.buildings) if (b.kind === kind) sources.push(...roadsBeside(s, size, b));
  return roadSearch(s, size, sources);
}

/**
 * The water and food overlays: road tiles in a service walker's reach and
 * the homes' supply, tinted on the ground (through the placing overlay's
 * texture), and a column over every home that wants it: blue for water,
 * gold for food, as tall as its supply is fresh, or a short stub where there
 * is none. While a fountain or agora is being placed it also shows what the
 * new one would reach. The food overlay marks farms and granaries too, so
 * the chain from field to stall reads at a glance.
 */
export class ServiceOverlay {
  readonly group = new THREE.Group();
  /** Which overlay the player asked for, if any. */
  wanted: OverlayMode | null = null;
  /** Which one a tool needs (placing a fountain or an agora), if any. */
  forced: Service | null = null;
  private columns: THREE.InstancedMesh;
  private readonly codes: Uint8Array;
  private last = -Infinity;
  private lastRev = -1;
  private lastMode: OverlayMode | null = null;
  private preview: number[] | null = null;
  private previewKey = '';
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly tones: Record<Service, { has: THREE.Color; fresh: THREE.Color; none: THREE.Color }> = {
    water: { has: new THREE.Color('#3f8fe0'), fresh: new THREE.Color('#8fd8ff'), none: new THREE.Color('#d8643a') },
    food: { has: new THREE.Color('#e09a26'), fresh: new THREE.Color('#ffe08a'), none: new THREE.Color('#9a4a6a') },
  };

  constructor(
    private readonly map: CoastMap,
    private readonly placement: Placement,
  ) {
    this.group.name = 'service-overlay';
    this.codes = new Uint8Array(map.size * map.size);
    const geo = new THREE.CylinderGeometry(0.1, 0.11, 1, 6).translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, flatShading: true, emissive: new THREE.Color('#203a55'), emissiveIntensity: 0.25 });
    this.columns = new THREE.InstancedMesh(geo, mat, 256);
    this.columns.name = 'overlay-columns';
    this.columns.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    this.columns.count = 0;
    this.columns.frustumCulled = false;
    this.group.add(this.columns);
    this.group.visible = false;
  }

  /** The overlay showing now: a tool's comes first. */
  get mode(): OverlayMode | null {
    return this.forced ?? this.wanted;
  }

  get on(): boolean {
    return this.mode !== null;
  }

  /** Show this overlay, or hide it if it is the one showing. */
  toggle(m: OverlayMode): void {
    this.wanted = this.wanted === m ? null : m;
  }

  /** Road tiles beside a fountain or agora being placed (its reach is previewed), or null. */
  setPreview(sources: number[] | null): void {
    const key = sources ? sources.join(',') : '';
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.preview = sources;
    this.last = -Infinity;
  }

  update(s: SimState, time: number): void {
    const mode = this.mode;
    this.group.visible = mode !== null;
    this.placement.showOverlay(mode !== null, mode === 'food');
    if (!mode) return;
    if (time - this.last < REFRESH && s.rev === this.lastRev && mode === this.lastMode) return;
    this.last = time;
    this.lastRev = s.rev;
    this.lastMode = mode;
    if (mode === 'missing') this.refreshMissing(s);
    else this.refresh(s, mode);
  }

  /**
   * What each lived-in home is missing: red where it is warned (it will drop
   * a level), amber where it lacks what it needs to grow, green where it has
   * all it needs. Roads are left as they are; the signs over the homes say which need.
   */
  private refreshMissing(s: SimState): void {
    const size = this.map.size;
    const codes = this.codes;
    codes.fill(0);
    for (const b of s.buildings) {
      if (b.kind !== 'home' || b.people === 0) continue;
      const code = warningOf(s, b) ? MISSING_WARN : wantOf(s, b) ? MISSING_WANT : MISSING_FINE;
      for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = 0;
    this.placement.setOverlay(codes);
  }

  private refresh(s: SimState, service: Service): void {
    const size = this.map.size;
    const mode = MODES[service];
    const codes = this.codes;
    codes.fill(0);
    const reach = reachOf(s, size, mode.source);
    const walkedAt = s.rounds[service].walked;
    const pre = this.preview ? roadSearch(s, size, this.preview).dist : null;
    for (let t = 0; t < codes.length; t++) {
      if (s.tiles[t] !== TILE_ROAD) continue;
      const d = reach.dist[t];
      if (d >= 0 && d <= mode.range) {
        const k = Math.round(99 * (1 - d / (mode.range + 1)));
        const walked = walkedAt[t] > 0 && s.tick - walkedAt[t] < mode.lasts;
        codes[t] = (walked ? WATER_WALKED : WATER_REACH) + k;
      } else if (pre && pre[t] >= 0 && pre[t] <= mode.range) codes[t] = WATER_PREVIEW;
    }
    let n = 0;
    const need = s.buildings.length;
    if (need > this.columns.instanceMatrix.count) this.grow(need);
    const tone = this.tones[service];
    for (const b of s.buildings) {
      let code = 0;
      if (b.kind === mode.source) code = WATER_FOUNTAIN;
      else if (service === 'food' && b.kind === 'farm') code = FOOD_FARM;
      else if (service === 'food' && b.kind === 'granary') code = FOOD_GRANARY;
      else if (mode.wants(b)) {
        const left = mode.until(b) - s.tick;
        const k = left > 0 ? Math.min(1, left / mode.lasts) : 0;
        code = left > 0 ? WATER_HOME + Math.round(39 * k) : WATER_DRY;
        // A post only over homes without, or with less than a month left: the ground's tint shows the rest.
        if (left >= TICKS_PER_MONTH) {
          const side = sideOf(b.kind);
          for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
          continue;
        }
        const cx = b.x + 1;
        const cz = b.z + 1;
        const y = this.map.heightAt(cx, cz) + (b.level >= 3 ? 1.45 : b.level >= 2 ? 1.3 : 1.0);
        const h = left > 0 ? 0.2 + 2.4 * k : 0.22;
        this.p.set(cx, y, cz);
        this.s.set(left > 0 ? 1 : 1.5, h, left > 0 ? 1 : 1.5);
        this.m.compose(this.p, this.q, this.s);
        this.columns.setMatrixAt(n, this.m);
        if (left > 0) this.c.copy(tone.has).lerp(tone.fresh, k * 0.6);
        else this.c.copy(tone.none);
        this.columns.setColorAt(n, this.c);
        n++;
      }
      if (!code) continue;
      const side = sideOf(b.kind);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = n;
    this.columns.instanceMatrix.needsUpdate = true;
    if (this.columns.instanceColor) this.columns.instanceColor.needsUpdate = true;
    this.placement.setOverlay(codes);
  }

  private grow(need: number): void {
    const cap = Math.max(need, this.columns.instanceMatrix.count * 2);
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

/**
 * Homes a new fountain or agora with these roadside tiles would reach, and
 * how many of them have no water (or food) now.
 */
export function previewReach(s: SimState, size: number, sources: number[], service: Service = 'water'): { homes: number; dry: number } {
  if (sources.length === 0) return { homes: 0, dry: 0 };
  const mode = MODES[service];
  const dist = roadSearch(s, size, sources).dist;
  let homes = 0;
  let dry = 0;
  for (const b of s.buildings) {
    if (!mode.wants(b)) continue;
    if (!roadsBeside(s, size, b).some((t) => dist[t] >= 0 && dist[t] <= mode.range)) continue;
    homes++;
    if (mode.until(b) <= s.tick) dry++;
  }
  return { homes, dry };
}
