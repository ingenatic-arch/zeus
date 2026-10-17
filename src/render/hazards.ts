import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { findBuilding, footSide } from '../sim/buildings';
import { FIRE_BURNING, FIRE_SMOULDER, HAZARD_FULL, HAZARD_MARK, wears, burnable } from '../sim/hazards';
import type { Building, BuildingKind, SimState } from '../sim/state';
import { puffTexture } from './puff';
import { circle, flat, mergeFlat } from './signs';

/** How often (seconds) which buildings are marked, smouldering or burning is worked out again. */
const REFRESH = 0.25;
/** A mark's radius at the default viewing distance (a little smaller than a need sign). */
const SIZE = 0.17;
/** Most puffs of smoke, dust and water, and most tongues of flame, drawn at once (past these, sources are skipped). */
const SMOKE_CAP = 1200;
const FLAME_CAP = 600;

/** Roughly how high each kind of building stands (homes by level), for where smoke leaves it and marks float. */
const HOME_TOP = [0.4, 0.75, 0.85, 0.95, 1.35, 1.5, 1.7];
const TOP: Partial<Record<BuildingKind, number>> = {
  farm: 0.35, grove: 1.2, vineyard: 0.55, pasture: 0.3, lodge: 0.8, dairy: 0.9,
  shrine: 1.0, theatre: 1.3, agora: 0.9, granary: 1.2, storehouse: 1.1, press: 1.0, winery: 1.0,
  taxoffice: 0.95, watchpost: 1.5, architect: 1.0, fountain: 0.4, rubble: 0.25,
};
const topOf = (b: Building): number => (b.kind === 'home' ? HOME_TOP[Math.min(b.level, HOME_TOP.length - 1)] : (TOP[b.kind] ?? 1));

/** The mark's cream face. */
function faceGeometry(): THREE.BufferGeometry {
  return flat(circle(1), '#fff6e2', 0.02, 20);
}

/** The mark's rim (coloured per mark: amber past half, red as it fills, pulsing once it smoulders or creaks). */
function rimGeometry(): THREE.BufferGeometry {
  const ring = circle(1.2);
  ring.holes.push(new THREE.Path().absarc(0, 0, 0.97, 0, Math.PI * 2, true));
  return flat(ring, '#ffffff', 0, 20);
}

/** A flame: an orange tongue with a yellow heart (fire risk). */
function flameIcon(): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  outer.moveTo(0, -0.62);
  outer.bezierCurveTo(0.5, -0.62, 0.62, -0.2, 0.42, 0.12);
  outer.bezierCurveTo(0.3, 0.32, 0.18, 0.42, 0.12, 0.72);
  outer.bezierCurveTo(-0.08, 0.5, -0.2, 0.46, -0.32, 0.24);
  outer.bezierCurveTo(-0.6, -0.1, -0.5, -0.62, 0, -0.62);
  const inner = new THREE.Shape();
  inner.moveTo(0, -0.5);
  inner.bezierCurveTo(0.28, -0.5, 0.32, -0.2, 0.18, 0.02);
  inner.bezierCurveTo(0.1, 0.14, 0.06, 0.2, 0.04, 0.32);
  inner.bezierCurveTo(-0.08, 0.2, -0.16, 0.1, -0.2, -0.04);
  inner.bezierCurveTo(-0.32, -0.3, -0.2, -0.5, 0, -0.5);
  return mergeFlat([flat(outer, '#e2531e', 0.04, 8), flat(inner, '#f6c13a', 0.05, 8)]);
}

/** A wall of dressed stone with a dark crack running down it (wear). */
function crackIcon(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const brick = (x: number, y: number, w: number): void => {
    const s = new THREE.Shape();
    s.moveTo(x - w / 2, y - 0.14);
    s.lineTo(x + w / 2, y - 0.14);
    s.lineTo(x + w / 2, y + 0.14);
    s.lineTo(x - w / 2, y + 0.14);
    s.closePath();
    parts.push(flat(s, '#b9a27c', 0.04, 1));
  };
  for (const [x, y, w] of [[-0.3, 0.33, 0.52], [0.3, 0.33, 0.52], [0, 0, 0.52], [-0.52, 0, 0.36], [0.52, 0, 0.36], [-0.3, -0.33, 0.52], [0.3, -0.33, 0.52]] as const) brick(x, y, w);
  const crack = new THREE.Shape();
  crack.moveTo(0.06, 0.62);
  crack.lineTo(0.2, 0.62);
  crack.lineTo(0.02, 0.2);
  crack.lineTo(0.2, -0.06);
  crack.lineTo(-0.04, -0.62);
  crack.lineTo(-0.16, -0.62);
  crack.lineTo(0.04, -0.08);
  crack.lineTo(-0.12, 0.18);
  crack.closePath();
  parts.push(flat(crack, '#3a2a22', 0.05, 1));
  return mergeFlat(parts);
}

/** A source of particles, from the last refresh. */
interface Hot {
  b: Building;
  cx: number;
  cz: number;
  /** The ground under its centre and the height of its roof. */
  y: number;
  top: number;
  side: number;
  how: 'smoulder' | 'fire' | 'creak';
}

interface Mark {
  b: Building;
  cx: number;
  cz: number;
  y: number;
  /** 0 just past half … 1 full; 2 smouldering or creaking. */
  risk: number;
  wear: number;
}

/** A watchman throwing water: where he stands and the fire he is fighting. */
interface Throw {
  x: number;
  y: number;
  z: number;
  to: Hot | null;
}

const fract = (x: number): number => x - Math.floor(x);
/** A fixed pseudo-random 0..1 for a building and a puff (render only: the look, not the sim). */
const rnd = (a: number, b: number): number => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);

/**
 * Fire and wear made visible: a little plaque over every building past half
 * its fire risk (a flame) or its wear (a cracked wall), amber turning red as
 * it fills and pulsing once it smoulders or creaks; a thin wisp of smoke from
 * a smoulder; tongues of flame and a heavy column of smoke leaning with the
 * wind from a fire; puffs of dust and falling grit from a creaking building;
 * and water thrown from a watchman's bucket. The particles are cheap low-poly
 * puffs worked out from the clock each frame (no state of their own), in two
 * capped instanced meshes; nothing draws while nothing is wrong.
 */
/** Past this distance (tiles) from the camera, only the worst mark of each kind in each block shows (smouldering and creaking ones always). */
const THIN_FROM = 34;
/** A block, for thinning the marks: squares of this many tiles. */
const BLOCK = 8;

export class HazardView {
  readonly group = new THREE.Group();
  private readonly plaques: THREE.InstancedMesh;
  private readonly faces: THREE.InstancedMesh;
  private readonly flamesIcon: THREE.InstancedMesh;
  private readonly cracksIcon: THREE.InstancedMesh;
  private readonly smoke: THREE.InstancedMesh;
  private readonly flames: THREE.InstancedMesh;
  private hot: Hot[] = [];
  private marks: Mark[] = [];
  private readonly worst = new Map<number, Mark>();
  private last = -Infinity;
  private lastTick = -1;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly sc = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly right = new THREE.Vector3();
  private readonly amber = new THREE.Color('#e0a030');
  private readonly red = new THREE.Color('#b8261a');
  private readonly grey = new THREE.Color('#8a8580');
  private readonly pale = new THREE.Color('#c9c4bb');
  private readonly dark = new THREE.Color('#4a4440');
  private readonly dust = new THREE.Color('#cbb48c');
  private readonly water = new THREE.Color('#8fd0ea');
  private readonly steam = new THREE.Color('#eef2f2');
  private readonly orange = new THREE.Color('#ff7a1a');
  private readonly yellow = new THREE.Color('#ffd23a');
  private readonly deep = new THREE.Color('#e0401a');
  /** Shown now (for the measuring script and the smoke checks). */
  count = { marks: 0, smoke: 0, flames: 0 };

  constructor(private readonly map: CoastMap) {
    this.group.name = 'hazards';
    const basic = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mark = (name: string, geo: THREE.BufferGeometry, colours: boolean): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(geo, basic, 128);
      mesh.name = name;
      if (colours) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(128 * 3).fill(1), 3);
      mesh.count = 0;
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      return mesh;
    };
    this.plaques = mark('hazard-rim', rimGeometry(), true);
    this.faces = mark('hazard-face', faceGeometry(), false);
    this.flamesIcon = mark('hazard-flame', flameIcon(), false);
    this.cracksIcon = mark('hazard-crack', crackIcon(), false);
    // Soft puffs (slice 14; they were lit balls, which read as stones): squares turned to the camera, each a soft round
    // blot fading out to its edge, from a texture drawn here.
    const puff = new THREE.PlaneGeometry(2, 2);
    this.smoke = new THREE.InstancedMesh(puff, new THREE.MeshBasicMaterial({ map: puffTexture(), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), SMOKE_CAP);
    this.smoke.name = 'hazard-smoke';
    this.smoke.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE_CAP * 3), 3);
    // A tongue of flame: a four-sided spike, unlit so it glows.
    const tongue = new THREE.ConeGeometry(0.5, 1, 4).translate(0, 0.5, 0);
    this.flames = new THREE.InstancedMesh(tongue, new THREE.MeshBasicMaterial({ toneMapped: false }), FLAME_CAP);
    this.flames.name = 'hazard-flames';
    this.flames.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FLAME_CAP * 3), 3);
    for (const mesh of [this.smoke, this.flames]) {
      mesh.count = 0;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  private refresh(s: SimState): void {
    const hot: Hot[] = [];
    const marks: Mark[] = [];
    if (s.hazards || s.buildings.some((b) => b.risk > 0 || b.wear > 0 || b.fire > 0 || b.creakAt > 0)) {
      for (const b of s.buildings) {
        if (b.kind === 'rubble') continue;
        const side = footSide(b);
        const cx = b.x + side / 2;
        const cz = b.z + side / 2;
        const y = this.map.heightAt(cx, cz);
        const top = topOf(b);
        if (b.fire === FIRE_BURNING) hot.push({ b, cx, cz, y, top, side, how: 'fire' });
        else if (b.fire === FIRE_SMOULDER) hot.push({ b, cx, cz, y, top, side, how: 'smoulder' });
        if (b.creakAt > 0 && b.fire !== FIRE_BURNING) hot.push({ b, cx, cz, y, top, side, how: 'creak' });
        if (b.fire === FIRE_BURNING) continue;
        const risk = b.fire === FIRE_SMOULDER ? 2 : burnable(b) && b.risk >= HAZARD_MARK ? (b.risk - HAZARD_MARK) / (HAZARD_FULL - HAZARD_MARK) : -1;
        const wear = b.creakAt > 0 ? 2 : wears(b) && b.wear >= HAZARD_MARK ? (b.wear - HAZARD_MARK) / (HAZARD_FULL - HAZARD_MARK) : -1;
        if (risk >= 0 || wear >= 0) marks.push({ b, cx, cz, y: y + top + 0.55, risk, wear });
      }
    }
    this.hot = hot;
    this.marks = marks;
  }

  /** Watchmen standing at a fire, throwing water on it (their drawn positions, from the walkers). */
  private throws(s: SimState, at: Map<number, { pos: THREE.Vector3 }>): Throw[] {
    const out: Throw[] = [];
    for (const w of s.walkers) {
      if (w.kind !== 'watchman' || w.target <= 0 || w.wait <= 0) continue;
      const pos = at.get(w.id)?.pos;
      const fire = findBuilding(s, w.target);
      if (!pos || !fire) continue;
      out.push({ x: pos.x, y: pos.y, z: pos.z, to: this.hot.find((h) => h.b === fire) ?? null });
    }
    return out;
  }

  update(s: SimState, camera: THREE.Camera, time: number, walkers: Map<number, { pos: THREE.Vector3 }>): void {
    if (time - this.last > REFRESH || Math.floor(s.tick / 10) !== this.lastTick) {
      this.last = time;
      this.lastTick = Math.floor(s.tick / 10);
      this.refresh(s);
    }
    this.drawMarks(camera, time);
    let smoke = 0;
    let flames = 0;
    const wx = Math.cos(s.wind.angle);
    const wz = Math.sin(s.wind.angle);
    const face = camera.quaternion;
    const puff = (x: number, y: number, z: number, r: number, c: THREE.Color): void => {
      if (smoke >= SMOKE_CAP) return;
      this.p.set(x, y, z);
      // (A soft blot is a little wider than the ball it stands for.)
      this.sc.set(r * 1.25, r * 1.15, 1);
      this.m.compose(this.p, face, this.sc);
      this.smoke.setMatrixAt(smoke, this.m);
      this.smoke.setColorAt(smoke++, c);
    };
    const tongue = (x: number, y: number, z: number, w: number, h: number, c: THREE.Color, spin: number): void => {
      if (flames >= FLAME_CAP) return;
      this.p.set(x, y, z);
      this.sc.set(w, h, w);
      this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, spin);
      this.m.compose(this.p, this.q, this.sc);
      this.flames.setMatrixAt(flames, this.m);
      this.flames.setColorAt(flames++, c);
    };
    for (const h of this.hot) {
      const id = h.b.id;
      const roof = h.y + h.top;
      if (h.how === 'smoulder') {
        // A thin grey wisp curling up from the roof, thickening and paling as it climbs, drifting with the wind, then thinning out.
        // Each puff keeps a little size and drift of its own, so the wisp is ragged rather than a neat stack of balls.
        const n = 16;
        const ox = (rnd(id, 2) - 0.5) * h.side * 0.35;
        const oz = (rnd(id, 3) - 0.5) * h.side * 0.35;
        for (let i = 0; i < n; i++) {
          const t = fract(time * 0.16 + i / n + rnd(id, 1));
          const sway = Math.sin(time * 0.8 + t * 6 + id) * 0.16 * t;
          const jx = (rnd(id, 20 + i) - 0.5) * 0.5 * t;
          const jz = (rnd(id, 40 + i) - 0.5) * 0.5 * t;
          const r = (0.08 + t * 0.3) * (0.7 + 0.6 * rnd(id, 60 + i)) * (t > 0.7 ? (1 - t) / 0.3 : 1) * (t < 0.08 ? t / 0.08 : 1);
          const drift = t * (0.9 + t * 0.9);
          this.c.copy(this.grey).lerp(this.pale, Math.min(1, t * 1.4));
          puff(h.cx + ox + wx * drift + sway + jx, roof + t * 2.4, h.cz + oz + wz * drift - sway * 0.5 + jz, r, this.c);
        }
      } else if (h.how === 'fire') {
        // Tongues of flame over the whole footprint, licking up through the roof: deep red, orange and yellow, each flickering.
        const n = h.side * h.side * 3;
        for (let i = 0; i < n; i++) {
          const ox = (rnd(id, 10 + i) - 0.5) * h.side * 0.8;
          const oz = (rnd(id, 40 + i) - 0.5) * h.side * 0.8;
          const flick = 0.5 + 0.5 * Math.sin(time * (6 + rnd(id, 70 + i) * 5) + i * 1.3);
          const hue = rnd(id, 190 + i);
          const tall = (0.32 + rnd(id, 100 + i) * 0.4 + (hue > 0.66 ? 0 : 0.15)) * (0.7 + flick * 0.5);
          const base = h.y + h.top * (0.55 + rnd(id, 130 + i) * 0.4) - 0.1;
          const wide = 0.2 + rnd(id, 160 + i) * 0.16;
          const from = hue < 0.3 ? this.deep : this.orange;
          const to = hue < 0.3 ? this.orange : hue < 0.66 ? this.yellow : this.pale;
          this.c.copy(from).lerp(to, flick * (hue > 0.66 ? 0.25 : 0.7));
          if (hue > 0.66) this.c.copy(this.yellow).lerp(this.orange, 1 - flick);
          tongue(h.cx + ox, base, h.cz + oz, wide, tall, this.c, i + time * 0.4);
        }
        // A heavy column of smoke, dark low down, paler and wider as it climbs, leaning with the wind.
        const m = 10 + h.side * 4;
        for (let i = 0; i < m; i++) {
          const t = fract(time * 0.16 + i / m + rnd(id, 200 + i) * 0.1);
          const ox = (rnd(id, 220 + i) - 0.5) * h.side * 0.6;
          const oz = (rnd(id, 260 + i) - 0.5) * h.side * 0.6;
          const lean = t * t * 3.2;
          const r = (0.22 + t * 0.66) * (t > 0.85 ? (1 - t) * 6.7 : 1);
          this.c.copy(this.dark).lerp(this.pale, t * 0.8);
          puff(h.cx + ox * (1 - t * 0.5) + wx * lean, roof + 0.5 + t * 4.4, h.cz + oz * (1 - t * 0.5) + wz * lean, r, this.c);
        }
      } else {
        // Creaking: puffs of dust bursting from the foot of its walls now and then, and grit falling from the eaves.
        for (let i = 0; i < 8; i++) {
          const t = fract(time * 0.28 + i / 8 + rnd(id, 300 + i));
          if (t > 0.6) continue;
          const a = rnd(id, 310 + i) * Math.PI * 2;
          const d = h.side * 0.5 + 0.05;
          const k = t / 0.6;
          this.c.copy(this.dust).lerp(this.pale, k);
          puff(h.cx + Math.cos(a) * (d + k * 0.5), h.y + 0.12 + k * 0.45, h.cz + Math.sin(a) * (d + k * 0.5), (0.14 + k * 0.3) * (1 - k * 0.5), this.c);
        }
        for (let i = 0; i < 5; i++) {
          const t = fract(time * 0.6 + i / 5 + rnd(id, 330 + i));
          const a = rnd(id, 340 + i) * Math.PI * 2;
          const d = h.side * 0.5;
          puff(h.cx + Math.cos(a) * d, roof - t * t * h.top, h.cz + Math.sin(a) * d, 0.05, this.dust);
        }
      }
    }
    // Water from the watchmen's buckets: an arc of drops onto the fire, and steam where it lands.
    for (const w of this.throws(s, walkers)) {
      const h = w.to;
      if (!h) continue;
      const tx = h.cx + (w.x - h.cx) * 0.3;
      const tz = h.cz + (w.z - h.cz) * 0.3;
      const ty = h.y + h.top * 0.6;
      for (let i = 0; i < 7; i++) {
        const t = fract(time * 1.3 + i / 7);
        const x = w.x + (tx - w.x) * t;
        const z = w.z + (tz - w.z) * t;
        const y = w.y + 0.3 + (ty - w.y - 0.3) * t + Math.sin(t * Math.PI) * 0.7;
        puff(x, y, z, 0.045 + 0.03 * Math.sin(t * Math.PI), this.water);
      }
      for (let i = 0; i < 4; i++) {
        const t = fract(time * 0.5 + i / 4);
        puff(tx + (rnd(i, 7) - 0.5) * 0.4, ty + t * 1.2, tz + (rnd(i, 8) - 0.5) * 0.4, 0.1 + t * 0.22, this.steam);
      }
    }
    for (const [mesh, n] of [[this.smoke, smoke], [this.flames, flames]] as const) {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.count.smoke = smoke;
    this.count.flames = flames;
  }

  /** Grow a mark mesh to hold n. */
  private fit(name: 'plaques' | 'faces' | 'flamesIcon' | 'cracksIcon', n: number): void {
    const old = this[name];
    if (n <= old.instanceMatrix.count) return;
    const cap = Math.max(n, old.instanceMatrix.count * 2);
    const mesh = new THREE.InstancedMesh(old.geometry, old.material, cap);
    mesh.name = old.name;
    if (old.instanceColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    mesh.frustumCulled = false;
    mesh.renderOrder = old.renderOrder;
    this.group.remove(old);
    old.dispose();
    this.group.add(mesh);
    (this as unknown as Record<string, THREE.InstancedMesh>)[name] = mesh;
  }

  private drawMarks(camera: THREE.Camera, time: number): void {
    let plates = 0;
    let fl = 0;
    let cr = 0;
    const need = this.marks.reduce((a, k) => a + (k.risk >= 0 ? 1 : 0) + (k.wear >= 0 ? 1 : 0), 0);
    this.fit('plaques', need);
    this.fit('faces', need);
    this.fit('flamesIcon', need);
    this.fit('cracksIcon', need);
    const q = camera.quaternion;
    this.right.set(1, 0, 0).applyQuaternion(q);
    // From the usual zoom and further a neglected street would be a crowd of marks: only the worst of each kind in each
    // block shows (any smouldering or creaking one always does).
    const worst = this.worst;
    worst.clear();
    for (const k of this.marks) {
      this.p.set(k.cx, k.y, k.cz);
      if (this.p.distanceTo(camera.position) < THIN_FROM) continue;
      const key = Math.floor(k.cz / BLOCK) * 64 + Math.floor(k.cx / BLOCK);
      for (const [v, i] of [[k.risk, 0], [k.wear, 1]] as const) {
        if (v < 0 || v >= 2) continue;
        const was = worst.get(key * 2 + i);
        if (!was || v > (i === 0 ? was.risk : was.wear) || (v === (i === 0 ? was.risk : was.wear) && k.b.id < was.b.id)) worst.set(key * 2 + i, k);
      }
    }
    for (const k of this.marks) {
      this.p.set(k.cx, k.y, k.cz);
      const dist = this.p.distanceTo(camera.position);
      const far = Math.min(3, Math.max(0.6, dist / 27));
      const key = Math.floor(k.cz / BLOCK) * 64 + Math.floor(k.cx / BLOCK);
      const shows = (v: number, i: number): boolean => v >= 0 && (dist < THIN_FROM || v >= 2 || worst.get(key * 2 + i) === k);
      const both = shows(k.risk, 0) && shows(k.wear, 1);
      for (const [v, icon] of [[k.risk, 'fire'], [k.wear, 'wear']] as const) {
        if (!shows(v, icon === 'fire' ? 0 : 1)) continue;
        const pulse = v >= 2 ? 1 + 0.14 * Math.sin(time * 6 + k.b.id) : 1;
        const r = SIZE * far * pulse;
        const shift = both ? (icon === 'fire' ? -1.25 : 1.25) * SIZE * far : 0;
        const bob = Math.sin(time * 1.5 + k.b.id * 0.7 + (icon === 'fire' ? 0 : 1.1)) * 0.03;
        this.p.set(k.cx, k.y + bob + (far - 1) * 0.25, k.cz).addScaledVector(this.right, shift);
        this.sc.set(r, r, r);
        this.m.compose(this.p, q, this.sc);
        this.faces.setMatrixAt(plates, this.m);
        this.plaques.setMatrixAt(plates, this.m);
        this.c.copy(this.amber).lerp(this.red, Math.min(1, v));
        this.plaques.setColorAt(plates++, this.c);
        if (icon === 'fire') this.flamesIcon.setMatrixAt(fl++, this.m);
        else this.cracksIcon.setMatrixAt(cr++, this.m);
      }
    }
    for (const [mesh, n] of [[this.plaques, plates], [this.faces, plates], [this.flamesIcon, fl], [this.cracksIcon, cr]] as const) {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.count.marks = plates;
  }
}
