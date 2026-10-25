import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { footSide } from '../sim/buildings';
import { burnable, FIRE_NONE, HAZARD_HIGH, HAZARD_MARK, INSPECT_RANGE, WATCH_RANGE, wears } from '../sim/hazards';
import { eatsBread, FOOD_LASTS, VENDOR_RANGE } from '../sim/food';
import { roadSearch, type Search } from '../sim/roads';
import { roadsBeside } from '../sim/rounds';
import { TILE_ROAD, type Building, type BuildingKind, type Round, type SimState } from '../sim/state';
import { COLLECTOR_RANGE } from '../sim/taxes';
import { CARRIER_RANGE, waterReach, WATER_LASTS } from '../sim/water';
import { TICKS_PER_MONTH } from '../sim/clock';
import { warningOf, wantOf, wantsMoreFood } from '../sim/folk';
import { FOODS, foodUntil, kindsNeeded, tableUntil } from '../sim/foods';
import { GOOD_USE, goodUntil, hasStall } from '../sim/goods';
import { FLEECE, OIL, WINE, type Ware } from '../sim/foods';
import { ACTOR_RANGE, CULTURE_LASTS, PRIESTESS_RANGE, RELIGION_LASTS, wantsBlessing, wantsPlays } from '../sim/culture';
// Slice 30.
import { robbedLately, TEMPT_FULL, TEMPT_HALF, TEMPT_SHOW } from '../sim/crime';
// Slice 41.
import { isCriminal } from '../sim/crime';
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
  /** Which buildings of the source kind count (an agora with an oil stall); all if absent. */
  from?: (b: Building) => boolean;
}

/** What an overlay shows: a service's reach and supply (or where the tax collector reaches, and who has paid), or what each home is missing. */
export type OverlayMode = Round | 'missing' | 'variety' | 'crime';

/** A stall good's overlay: its stall's vendors' reach, and the homes that buy it. */
const goodMode = (w: Ware): Mode => {
  const use = GOOD_USE[w]!;
  return { source: 'agora', range: VENDOR_RANGE, lasts: use.lasts, until: (b) => goodUntil(b, w), wants: use.uses, from: (b) => hasStall(b, w) };
};

/** The makers and the store of each stall good, marked on its overlay as the farms and granaries are on the food one. */
const CHAIN: Partial<Record<Round, { makers: readonly BuildingKind[]; store: BuildingKind }>> = {
  oil: { makers: ['grove', 'press'], store: 'storehouse' },
  fleece: { makers: ['pasture'], store: 'storehouse' },
  wine: { makers: ['vineyard', 'winery'], store: 'storehouse' },
};

const MODES: Record<Round, Mode> = {
  water: { source: 'fountain', range: CARRIER_RANGE, lasts: WATER_LASTS, until: (b) => b.waterUntil, wants: (b) => b.kind === 'home' && b.level > 0 },
  // A home's food lasts as long as the kinds its level needs (its bread, for a hut or a cottage).
  food: { source: 'agora', range: VENDOR_RANGE, lasts: FOOD_LASTS, until: (b) => tableUntil(b), wants: eatsBread },
  religion: { source: 'shrine', range: PRIESTESS_RANGE, lasts: RELIGION_LASTS, until: (b) => b.religionUntil, wants: wantsBlessing },
  oil: goodMode(OIL),
  fleece: goodMode(FLEECE),
  wine: goodMode(WINE),
  culture: { source: 'theatre', range: ACTOR_RANGE, lasts: CULTURE_LASTS, until: (b) => b.cultureUntil, wants: wantsPlays },
  // Taxed within the month (see taxedLately): the collector's visit 'lasts' a month. A visit that paid nothing (the rate
  // was none) isn't tinted as paid: it shows as a home only due again (see below).
  tax: { source: 'taxoffice', range: COLLECTOR_RANGE, lasts: TICKS_PER_MONTH, until: (b) => (b.taxedAt > 0 && b.taxPaid > 0 ? b.taxedAt + TICKS_PER_MONTH : 0), wants: (b) => b.kind === 'home' && b.people > 0 },
  // Fire risk and wear have overlays of their own (see refreshHazard); these say where the walkers come from and how far they go.
  fire: { source: 'watchpost', range: WATCH_RANGE, lasts: TICKS_PER_MONTH, until: () => 0, wants: () => false },
  wear: { source: 'architect', range: INSPECT_RANGE, lasts: TICKS_PER_MONTH, until: () => 0, wants: () => false },
};

/** Which of the placing overlay's tones (OVERLAY_TONES) each service's overlay takes. */
const TONE: Record<Round, number> = { water: 0, food: 1, religion: 2, culture: 3, tax: 4, oil: 5, fleece: 6, wine: 7, fire: 8, wear: 9 };

/** How high the top of each level of home stands (for the columns over them). */
export const ROOF = [0.8, 0.8, 1.1, 1.25, 1.7, 1.8, 2.0, 1.9, 2.3];

/** How far by road each road tile is from the nearest building of a kind (dist -1: none reaches it). */
export function reachOf(s: SimState, size: number, kind: BuildingKind, from?: (b: Building) => boolean): Search {
  if (kind === 'fountain') return waterReach(s, size);
  const sources: number[] = [];
  for (const b of s.buildings) if (b.kind === kind && (!from || from(b))) sources.push(...roadsBeside(s, size, b));
  return roadSearch(s, size, sources);
}

/**
 * The service overlays (water, food, religion and culture): road tiles in a
 * service walker's reach and the homes' supply, tinted on the ground (through
 * the placing overlay's texture), and a column over every home that wants it
 * with less than a month left: blue for water, gold for food, lilac for
 * blessings, olive green for oil, rose for plays, cream for fleece, purple for wine, as tall as its supply is fresh, or a short stub
 * where there is none. While a fountain, agora, shrine or theatre is being placed it also shows what the
 * new one would reach. The food overlay marks farms and granaries too, so
 * the chain from field to stall reads at a glance.
 */
export class ServiceOverlay {
  readonly group = new THREE.Group();
  /** Which overlay the player asked for, if any. */
  wanted: OverlayMode | null = null;
  /** Which one a tool needs (placing a fountain or an agora), if any. */
  forced: Round | null = null;
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
  /** The variety overlay's blocks: bread, meat, cheese, and a kind that is lacking. */
  private readonly foodTones = [new THREE.Color('#e2a43a'), new THREE.Color('#b8603e'), new THREE.Color('#f4dc78')];
  private readonly shortTone = new THREE.Color('#5e3a46');
  private readonly tones: Record<Round, { has: THREE.Color; fresh: THREE.Color; none: THREE.Color }> = {
    water: { has: new THREE.Color('#3f8fe0'), fresh: new THREE.Color('#8fd8ff'), none: new THREE.Color('#d8643a') },
    food: { has: new THREE.Color('#e09a26'), fresh: new THREE.Color('#ffe08a'), none: new THREE.Color('#9a4a6a') },
    religion: { has: new THREE.Color('#8a62d0'), fresh: new THREE.Color('#d6c2ff'), none: new THREE.Color('#9a7a52') },
    oil: { has: new THREE.Color('#7f9c2a'), fresh: new THREE.Color('#dcea8c'), none: new THREE.Color('#8a4e34') },
    culture: { has: new THREE.Color('#d8506e'), fresh: new THREE.Color('#ffc2cf'), none: new THREE.Color('#5a7290') },
    tax: { has: new THREE.Color('#2f9a80'), fresh: new THREE.Color('#9fe6d2'), none: new THREE.Color('#e09a2a') },
    fleece: { has: new THREE.Color('#d8c8a0'), fresh: new THREE.Color('#fff6e0'), none: new THREE.Color('#5a6290') },
    wine: { has: new THREE.Color('#7a2a68'), fresh: new THREE.Color('#d890c8'), none: new THREE.Color('#a08a48') },
    // Fire risk and wear: their columns go amber past half and red past three-quarters.
    fire: { has: new THREE.Color('#e0a02a'), fresh: new THREE.Color('#ffd27a'), none: new THREE.Color('#e0442a') },
    wear: { has: new THREE.Color('#d8a040'), fresh: new THREE.Color('#ffe0a0'), none: new THREE.Color('#d04a3a') },
  };

  /** Slice 30: the crime overlay's columns: tempted past half, past three-quarters (or a thief out), and robbed lately. */
  private readonly crimeTones = { half: new THREE.Color('#a0609a'), high: new THREE.Color('#d0383a'), robbed: new THREE.Color('#b8c8e8') };

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
    this.placement.showOverlay(mode !== null, mode === 'variety' ? TONE.food : mode === 'crime' ? TONE.fire : mode && mode !== 'missing' ? TONE[mode] : 0);
    if (!mode) return;
    if (time - this.last < REFRESH && s.rev === this.lastRev && mode === this.lastMode) return;
    this.last = time;
    this.lastRev = s.rev;
    this.lastMode = mode;
    if (mode === 'missing') this.refreshMissing(s);
    else if (mode === 'variety') this.refreshVariety(s);
    else if (mode === 'fire' || mode === 'wear') this.refreshHazard(s, mode);
    else if (mode === 'crime') this.refreshCrime(s);
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

  /**
   * What is on each home's table: a little stack over it, a block for each
   * kind of food it has (gold bread, red-brown meat, pale cheese), and a dark
   * ring for each kind its level needs and lacks. The ground under a home is
   * red where it is short of a kind it needs, amber where another kind the
   * city makes would lift it a level, green where it has what it needs; the
   * farms, lodges and dairies, the granaries and the agoras are marked, so
   * where each food comes from reads at a glance.
   */
  private refreshVariety(s: SimState): void {
    const size = this.map.size;
    const codes = this.codes;
    codes.fill(0);
    const need = s.buildings.length * 3;
    if (need > this.columns.instanceMatrix.count) this.grow(need);
    let n = 0;
    const SEG = 0.26;
    for (const b of s.buildings) {
      let code = 0;
      if (b.kind === 'farm' || b.kind === 'lodge' || b.kind === 'dairy') code = FOOD_FARM;
      else if (b.kind === 'granary') code = FOOD_GRANARY;
      else if (b.kind === 'agora') code = WATER_FOUNTAIN;
      else if (eatsBread(b)) {
        const k = Math.max(1, kindsNeeded(b.level));
        let on = 0;
        const cx = b.x + footSide(b) / 2;
        const cz = b.z + footSide(b) / 2;
        const y0 = this.map.heightAt(cx, cz) + ROOF[b.level] + 0.15;
        for (const f of FOODS) {
          if (foodUntil(b, f) <= s.tick) continue;
          this.p.set(cx, y0 + on * SEG, cz);
          this.s.set(1.25, SEG * 0.82, 1.25);
          this.m.compose(this.p, this.q, this.s);
          this.columns.setMatrixAt(n, this.m);
          this.columns.setColorAt(n, this.foodTones[f]);
          n++;
          on++;
        }
        // The kinds it needs and hasn't got: dark rings stacked on top.
        const short = Math.max(0, k - on);
        for (let i = 0; i < short; i++) {
          this.p.set(cx, y0 + (on + i) * SEG, cz);
          this.s.set(1.7, SEG * 0.35, 1.7);
          this.m.compose(this.p, this.q, this.s);
          this.columns.setMatrixAt(n, this.m);
          this.columns.setColorAt(n, this.shortTone);
          n++;
        }
        // (A home from an older save still in its grace isn't short yet.)
        const lacking = tableUntil(b) <= s.tick && s.tick >= b.grace;
        code = lacking ? MISSING_WARN : wantsMoreFood(s, b) ? MISSING_WANT : MISSING_FINE;
        for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
        continue;
      }
      if (!code) continue;
      const side = footSide(b);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = n;
    this.columns.instanceMatrix.needsUpdate = true;
    if (this.columns.instanceColor) this.columns.instanceColor.needsUpdate = true;
    this.placement.setOverlay(codes);
  }

  /**
   * Fire risk or wear: the roads a watchman (or an inspector) reaches, brighter
   * where one has walked lately; every building that can burn (or wear)
   * tinted green below half, amber past half, red past three-quarters (and
   * pulsing while it smoulders, burns or creaks), with a column over each one
   * past half, as tall as how near it is to the top. The watch posts (or
   * architects' offices) are marked as the sources.
   */
  private refreshHazard(s: SimState, which: 'fire' | 'wear'): void {
    const size = this.map.size;
    const mode = MODES[which];
    const codes = this.codes;
    codes.fill(0);
    const reach = reachOf(s, size, mode.source);
    const walkedAt = s.rounds[which].walked;
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
    if (s.buildings.length > this.columns.instanceMatrix.count) this.grow(s.buildings.length);
    const tone = this.tones[which];
    for (const b of s.buildings) {
      let code = 0;
      const side = footSide(b);
      if (b.kind === mode.source) code = WATER_FOUNTAIN;
      else if (which === 'fire' ? burnable(b) : wears(b)) {
        const v = which === 'fire' ? b.risk : b.wear;
        const alarm = which === 'fire' ? b.fire !== FIRE_NONE : b.creakAt > 0;
        code = alarm || v >= HAZARD_HIGH ? MISSING_WARN : v >= HAZARD_MARK ? MISSING_WANT : MISSING_FINE;
        if (alarm || v >= HAZARD_MARK) {
          const k = alarm ? 1 : (v - HAZARD_MARK) / (1000 - HAZARD_MARK);
          const top = b.kind === 'home' ? ROOF[b.level] : side === 3 ? 1.6 : 1.3;
          this.p.set(b.x + side / 2, this.map.heightAt(b.x + side / 2, b.z + side / 2) + top + 0.2, b.z + side / 2);
          this.s.set(1.3, 0.3 + 2.2 * k, 1.3);
          this.m.compose(this.p, this.q, this.s);
          this.columns.setMatrixAt(n, this.m);
          if (alarm || v >= HAZARD_HIGH) this.c.copy(tone.none);
          else this.c.copy(tone.has).lerp(tone.fresh, 0.3);
          this.columns.setColorAt(n, this.c);
          n++;
        }
      }
      if (!code) continue;
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = n;
    this.columns.instanceMatrix.needsUpdate = true;
    if (this.columns.instanceColor) this.columns.instanceColor.needsUpdate = true;
    this.placement.setOverlay(codes);
  }

  /**
   * Slice 30, crime: the roads a watchman reaches, brighter where one has
   * walked lately (where he deters thieves); every lived-in home tinted green
   * below a quarter of its temptation (slice 33; it was half), amber past a
   * quarter (where its panel names it), red past three-quarters or
   * with a thief of theirs out, with a column over each one past half, as tall
   * as how near it is to sending one; and a short pale column over each home
   * robbed in the last two months. The watch posts are marked as the sources.
   */
  private refreshCrime(s: SimState): void {
    const size = this.map.size;
    const mode = MODES.fire;
    const codes = this.codes;
    codes.fill(0);
    const reach = reachOf(s, size, mode.source);
    const walkedAt = s.rounds.fire.walked;
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
    const out = new Set<number>();
    for (const w of s.walkers) if (w.kind === 'thief' && w.people > 0) out.add(w.home);
    // Slice 41: any kind of criminal out, a gang's den and talk of burning are as alarming as a thief out; a place
    // smashed (red) or worked by pickpockets or smugglers this month (amber) shows too.
    const smashed = new Set<number>();
    if (s.crime.kinds) {
      for (const w of s.walkers) if (isCriminal(w.kind) && w.people > 0) out.add(w.home);
      for (const g of s.crime.gangs) out.add(g.den);
      for (const t of s.crime.talk) out.add(t.home);
      for (const x of s.crime.broken) smashed.add(x.at);
    }
    let n = 0;
    if (s.buildings.length * 2 > this.columns.instanceMatrix.count) this.grow(s.buildings.length * 2);
    for (const b of s.buildings) {
      let code = 0;
      const side = footSide(b);
      if (b.kind === mode.source) code = WATER_FOUNTAIN;
      else if (b.kind === 'home' && b.people > 0 && b.family) {
        const alarm = out.has(b.id);
        const v = b.tempt;
        // (Slice 33: amber from a quarter, where the household's panel starts naming it.)
        code = alarm || v >= HAZARD_HIGH ? MISSING_WARN : v >= TEMPT_SHOW ? MISSING_WANT : MISSING_FINE;
        const top = ROOF[b.level];
        const y = this.map.heightAt(b.x + 1, b.z + 1) + top + 0.2;
        if (alarm || v >= TEMPT_HALF) {
          const k = alarm ? 1 : (v - TEMPT_HALF) / (TEMPT_FULL - TEMPT_HALF);
          this.p.set(b.x + 1, y, b.z + 1);
          this.s.set(1.3, 0.3 + 2.2 * k, 1.3);
          this.m.compose(this.p, this.q, this.s);
          this.columns.setMatrixAt(n, this.m);
          this.columns.setColorAt(n, this.c.copy(alarm || v >= HAZARD_HIGH ? this.crimeTones.high : this.crimeTones.half));
          n++;
        } else if (robbedLately(s, b)) {
          this.p.set(b.x + 1, y, b.z + 1);
          this.s.set(1.6, 0.35, 1.6);
          this.m.compose(this.p, this.q, this.s);
          this.columns.setMatrixAt(n, this.m);
          this.columns.setColorAt(n, this.c.copy(this.crimeTones.robbed));
          n++;
        }
      }
      // Slice 41: a place smashed, or worked by pickpockets or smugglers this month.
      else if (smashed.has(b.id)) code = MISSING_WARN;
      else if (s.crime.kinds && b.kind !== 'home' && b.kind !== 'granary' && b.kind !== 'storehouse' && b.kind !== 'taxoffice' && b.robbedAt > 0 && s.tick - b.robbedAt < TICKS_PER_MONTH) code = MISSING_WANT;
      if (!code) continue;
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
    }
    this.columns.count = n;
    this.columns.instanceMatrix.needsUpdate = true;
    if (this.columns.instanceColor) this.columns.instanceColor.needsUpdate = true;
    this.placement.setOverlay(codes);
  }

  private refresh(s: SimState, service: Round): void {
    const size = this.map.size;
    const mode = MODES[service];
    const codes = this.codes;
    codes.fill(0);
    const reach = reachOf(s, size, mode.source, mode.from);
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
      if (b.kind === mode.source && (!mode.from || mode.from(b))) code = WATER_FOUNTAIN;
      else if (service === 'food' && (b.kind === 'farm' || b.kind === 'lodge' || b.kind === 'dairy')) code = FOOD_FARM;
      else if (service === 'food' && b.kind === 'granary') code = FOOD_GRANARY;
      else if (CHAIN[service]?.makers.includes(b.kind)) code = FOOD_FARM;
      else if (CHAIN[service]?.store === b.kind) code = FOOD_GRANARY;
      else if (mode.wants(b)) {
        const left = mode.until(b) - s.tick;
        const k = left > 0 ? Math.min(1, left / mode.lasts) : 0;
        code = left > 0 ? WATER_HOME + Math.round(39 * k) : WATER_DRY;
        // A home a collector called on a month or two ago is only due again (his round takes about forty days):
        // untinted, and no post, so the posts mark the homes no collector's round reaches.
        if (service === 'tax' && left <= 0 && b.taxedAt > 0 && s.tick - b.taxedAt < 2 * TICKS_PER_MONTH) {
          const side = footSide(b);
          for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
          continue;
        }
        // A post only over homes without, or with less than a month left: the ground's tint shows the rest.
        // (Taxes last a month at most, so the tax overlay posts only the homes no collector has called on in two months.)
        if (left >= TICKS_PER_MONTH || (service === 'tax' && left > 0)) {
          const side = footSide(b);
          for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) codes[(b.z + dz) * size + b.x + dx] = code;
          continue;
        }
        const cx = b.x + footSide(b) / 2;
        const cz = b.z + footSide(b) / 2;
        const y = this.map.heightAt(cx, cz) + ROOF[b.level] + 0.2;
        // A home the tax collector hasn't called on gets a taller stub: unlike a missing service, it is the whole of what the overlay is for.
        const h = left > 0 ? 0.2 + 2.4 * k : service === 'tax' ? 0.75 : 0.22;
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
      const side = footSide(b);
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
export function previewReach(s: SimState, size: number, sources: number[], service: Round = 'water'): { homes: number; dry: number } {
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

/**
 * Buildings a new watch post (or architect's office) with these roadside
 * tiles would reach, how many of them are past half now, and how many of
 * those it reaches are smouldering or burning (creaking), with the first of them.
 */
export function hazardReach(s: SimState, size: number, sources: number[], which: 'fire' | 'wear'): { homes: number; dry: number; alarms: number; first: Building | null } {
  if (sources.length === 0) return { homes: 0, dry: 0, alarms: 0, first: null };
  const mode = MODES[which];
  const dist = roadSearch(s, size, sources).dist;
  let homes = 0;
  let dry = 0;
  let alarms = 0;
  let first: Building | null = null;
  for (const b of s.buildings) {
    if (which === 'fire' ? !burnable(b) : !wears(b)) continue;
    if (!roadsBeside(s, size, b).some((t) => dist[t] >= 0 && dist[t] <= mode.range)) continue;
    homes++;
    if ((which === 'fire' ? b.risk : b.wear) >= HAZARD_MARK) dry++;
    if (which === 'fire' ? b.fire !== FIRE_NONE : b.creakAt > 0) {
      alarms++;
      first ??= b;
    }
  }
  return { homes, dry, alarms, first };
}
