import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { bandsAt } from '../sim/raids';
import { TILE_ROAD, TILE_WALL, type Building, type SimState, type WallPiece } from '../sim/state';
import { crackOf, TOWER_TOP } from '../sim/walls';
import { merge, type Part } from './trees';

/** A stretch's height above the ground, its thickness, and its merlons'. */
const WALL_H = 0.92;
const THICK = 0.5;
const MERLON = 0.16;
/** A tower's side (it stands on 2 × 2 tiles) and the height of its roof walk (the archers stand there: the arrows rise from TOWER_TOP). */
const TOWER_SIDE = 1.66;
const TOWER_H = TOWER_TOP - 0.15;

const STONE = '#c9bc9f';
const STONE_SHADE = '#b3a688';
const STONE_DARK = '#9d9077';
const WALK = '#d8ccb0';
const SEAM = '#3f372e';
const TIMBER = '#7a5232';
const TIMBER_DARK = '#5a3b22';
const IRON = '#3a3632';
const RUBBLE = ['#b9ac90', '#a39679', '#8f846c', '#c7bb9f'];

/** Which way a neighbour lies: east, west, south, north. */
const DIRS: ReadonlyArray<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * The walls (slice 25): each standing stretch a block of dressed stone with
 * a walkway and merlons, joined to its neighbours along the line (straight,
 * corners and ends); a gate two piers and a lintel over the road with a
 * timber door (shut while raiders are on the map); a tower a square stone
 * tower with a roof walk and merlons; cracks dark seams down the face (one
 * below two thirds of its strength, more and a broken top below a third);
 * a breach a heap of stones. One merged mesh, rebuilt when a stretch,
 * a crack, a tower or the doors change.
 */
export class WallsView {
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh | null = null;
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
  private key = '';

  constructor(private readonly map: CoastMap) {
    this.group.name = 'walls';
  }

  /** Bring the walls up to date with the state (called whenever the state's revision moves). */
  sync(s: SimState): void {
    const towers = s.buildings.filter((b) => b.kind === 'tower');
    const shut = s.walls.length > 0 && bandsAt(s).length > 0;
    const key = `${s.walls.map((p) => `${p.t}${p.gate ? 'g' : ''}${crackOf(p)}`).join(',')}|${towers.map((b) => `${b.x},${b.z}`).join(';')}|${shut ? 1 : 0}`;
    if (key === this.key) return;
    this.key = key;
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (s.walls.length === 0 && towers.length === 0) return;
    const parts: Part[] = [];
    for (const p of s.walls) {
      if (p.hp <= 0) this.rubble(parts, s, p);
      else if (p.gate) this.gate(parts, s, p, shut);
      else this.stretch(parts, s, p);
    }
    for (const b of towers) this.tower(parts, b);
    this.mesh = new THREE.Mesh(merge(parts), this.material);
    this.mesh.name = 'walls';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
  }

  /** The lowest ground under a tile (the wall's footing goes down to it, so no stretch floats on a slope). */
  private footing(tx: number, tz: number): number {
    const m = this.map;
    return Math.min(m.corner(tx, tz), m.corner(tx + 1, tz), m.corner(tx, tz + 1), m.corner(tx + 1, tz + 1));
  }

  /** Is the tile beside one the wall joins to: a standing stretch or gate, or a tower? */
  private joins(s: SimState, t: number, dx: number, dz: number): boolean {
    const n = this.map.size;
    const x = (t % n) + dx;
    const z = Math.floor(t / n) + dz;
    if (x < 0 || z < 0 || x >= n || z >= n) return false;
    const u = z * n + x;
    if (s.tiles[u] === TILE_WALL) return true;
    if (s.tiles[u] > 0) return s.buildings.some((b) => b.id === s.tiles[u] && b.kind === 'tower');
    if (s.tiles[u] === TILE_ROAD) return s.walls.some((p) => p.t === u && p.gate && p.hp > 0);
    return false;
  }

  private box(parts: Part[], w: number, h: number, d: number, x: number, y: number, z: number, color: string, yaw = 0): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (yaw) geo.rotateY(yaw);
    geo.translate(x, y + h / 2, z);
    parts.push({ geo, color });
  }

  /** A stretch: a stone post at the middle of its tile and an arm to each neighbour it joins, walkway and merlons on top. */
  private stretch(parts: Part[], s: SimState, p: WallPiece): void {
    const n = this.map.size;
    const tx = p.t % n;
    const tz = Math.floor(p.t / n);
    const cx = tx + 0.5;
    const cz = tz + 0.5;
    const base = this.footing(tx, tz) - 0.12;
    const top = this.map.heightAt(cx, cz) + WALL_H;
    const h = top - base;
    const crack = crackOf(p);
    const arms = DIRS.filter(([dx, dz]) => this.joins(s, p.t, dx, dz));
    // (A lone stretch, or the end of a line, still reads as a short wall: an arm both ways along its line.)
    const ew = arms.some(([dx]) => dx !== 0);
    const ns = arms.some(([, dz]) => dz !== 0);
    const along = arms.length > 0 ? arms : ([[1, 0], [-1, 0]] as Array<[number, number]>);
    if (arms.length === 1) along.push([-arms[0][0], -arms[0][1]]);
    // The broken top of a badly cracked stretch: a notch out of it.
    const notch = crack >= 2 ? 0.28 + 0.12 * hash2(tx, tz, 902) : 0;
    this.box(parts, THICK, h - notch, THICK, cx, base, cz, (tx + tz) % 2 ? STONE : STONE_SHADE);
    for (const [dx, dz] of along) {
      const len = 0.5 - THICK / 2 + 0.001;
      const mx = cx + dx * (THICK / 2 + len / 2);
      const mz = cz + dz * (THICK / 2 + len / 2);
      const w = dx !== 0 ? len : THICK;
      const d = dz !== 0 ? len : THICK;
      const armNotch = crack >= 2 && hash2(tx + dx, tz + dz, 903) > 0.5 ? notch : 0;
      this.box(parts, w, h - armNotch, d, mx, base, mz, STONE);
      // Courses of the dressed stone: a slightly darker band low down.
      this.box(parts, w + 0.012, 0.12, d + 0.012, mx, top - h * 0.55, mz, STONE_SHADE);
    }
    // The walkway (lighter stone) and the merlons on both faces.
    this.box(parts, THICK + 0.02, 0.04, THICK + 0.02, cx, top - notch - 0.02, cz, WALK);
    const faces = ew && !ns ? 'ew' : ns && !ew ? 'ns' : 'both';
    for (const [dx, dz] of along) {
      for (const side of [-1, 1]) {
        if (crack >= 2 && hash2(tx * 3 + dx, tz * 3 + dz + side, 904) > 0.35) continue;
        const off = THICK / 2 - MERLON / 2;
        const mx = cx + dx * 0.36 + (dz !== 0 ? side * off : 0);
        const mz = cz + dz * 0.36 + (dx !== 0 ? side * off : 0);
        this.box(parts, dx !== 0 ? 0.18 : MERLON, 0.17, dz !== 0 ? 0.18 : MERLON, mx, top, mz, STONE_DARK);
      }
    }
    void faces;
    // Cracks: dark seams down its faces, more the weaker it is.
    if (crack >= 1) {
      const seams = crack === 1 ? 1 : 3;
      for (let i = 0; i < seams; i++) {
        const k = hash2(tx * 7 + i, tz * 5, 905);
        const a = (k - 0.5) * 0.6;
        const side = hash2(tx, tz * 7 + i, 906) > 0.5 ? 1 : -1;
        const sh = h * (0.45 + 0.4 * hash2(tx + i, tz, 907));
        const runsEW = ew || !ns;
        const x = runsEW ? cx + a : cx + side * (THICK / 2 + 0.004);
        const z = runsEW ? cz + side * (THICK / 2 + 0.004) : cz + a;
        this.box(parts, runsEW ? 0.035 : 0.012, sh, runsEW ? 0.012 : 0.035, x, top - notch - sh, z, SEAM, (k - 0.5) * 0.5);
      }
    }
  }

  /** A gate: a stone pier either side of the road and a lintel over it, the door's two leaves open against the piers (shut while raiders are about). */
  private gate(parts: Part[], s: SimState, p: WallPiece, shut: boolean): void {
    const n = this.map.size;
    const tx = p.t % n;
    const tz = Math.floor(p.t / n);
    const cx = tx + 0.5;
    const cz = tz + 0.5;
    // The wall runs east-west if it joins that way (or the road runs north-south through it); the road through it runs across.
    const ew = this.joins(s, p.t, 1, 0) || this.joins(s, p.t, -1, 0) || (!this.joins(s, p.t, 0, 1) && !this.joins(s, p.t, 0, -1) && (s.tiles[p.t + n] === TILE_ROAD || s.tiles[p.t - n] === TILE_ROAD));
    const base = this.footing(tx, tz) - 0.12;
    const top = this.map.heightAt(cx, cz) + WALL_H + 0.18;
    const h = top - base;
    const crack = crackOf(p);
    const pier = 0.2;
    for (const side of [-1, 1]) {
      const o = side * (0.5 - pier / 2);
      this.box(parts, ew ? pier : THICK + 0.1, h, ew ? THICK + 0.1 : pier, cx + (ew ? o : 0), base, cz + (ew ? 0 : o), STONE_SHADE);
      // Merlons on the piers.
      this.box(parts, ew ? pier : 0.18, 0.2, ew ? 0.18 : pier, cx + (ew ? o : 0), top, cz + (ew ? 0 : o), STONE_DARK);
    }
    // The lintel over the way.
    const lin = 0.26;
    this.box(parts, ew ? 1.0 : THICK + 0.1, lin, ew ? THICK + 0.1 : 1.0, cx, top - lin, cz, STONE);
    // The door: timber leaves with iron bands; shut across the way, or open against the piers.
    const dh = top - lin - this.map.heightAt(cx, cz);
    const g = this.map.heightAt(cx, cz);
    const leaf = 0.5 - pier;
    for (const side of [-1, 1]) {
      if (shut) {
        const o = side * (leaf / 2 + 0.002);
        // (Badly broken, one leaf is staved in: only its lower part still hangs.)
        const lh = crack >= 2 && side < 0 ? dh * 0.5 : dh;
        this.box(parts, ew ? leaf : 0.08, lh, ew ? 0.08 : leaf, cx + (ew ? o : 0), g, cz + (ew ? 0 : o), crack >= 1 && side < 0 ? TIMBER_DARK : TIMBER);
        for (const y of [0.25, 0.65]) this.box(parts, ew ? leaf : 0.09, 0.05, ew ? 0.09 : leaf, cx + (ew ? o : 0), g + dh * y, cz + (ew ? 0 : o), IRON);
      } else {
        // Swung back inside the gate, against the piers.
        const o = side * (0.5 - pier - 0.04);
        const back = 0.08 + leaf / 2;
        this.box(parts, ew ? 0.08 : leaf, dh, ew ? leaf : 0.08, cx + (ew ? o : back), g, cz + (ew ? back : o), TIMBER);
      }
    }
    if (crack >= 1) {
      // Splintered: a pale gash in the door, and a seam in a pier.
      for (let i = 0; i < crack; i++) {
        const k = hash2(tx + i, tz, 908);
        this.box(parts, ew ? 0.07 : 0.11, dh * 0.45, ew ? 0.11 : 0.07, cx + (ew ? 0.05 + k * 0.2 : 0), g + dh * 0.15, cz + (ew ? 0 : 0.05 + k * 0.2), '#d8b98a');
      }
      this.box(parts, ew ? 0.03 : THICK + 0.12, h * 0.6, ew ? THICK + 0.12 : 0.03, cx + (ew ? 0.42 : 0), top - h * 0.6, cz + (ew ? 0 : 0.42), SEAM);
    }
  }

  /** A breach: the stumps of what stood, and a heap of fallen stones (a broken gate's pushed to the road's sides, the way through clear, a splintered leaf of its door lying by it). */
  private rubble(parts: Part[], s: SimState, p: WallPiece): void {
    const n = this.map.size;
    const tx = p.t % n;
    const tz = Math.floor(p.t / n);
    const cx = tx + 0.5;
    const cz = tz + 0.5;
    const g = this.map.heightAt(cx, cz);
    const base = this.footing(tx, tz) - 0.12;
    // Which way the line ran: along its standing neighbours (or across the road, for a gate).
    const ew = this.joins(s, p.t, 1, 0) || this.joins(s, p.t, -1, 0) || (p.gate && (s.tiles[p.t + n] === TILE_ROAD || s.tiles[p.t - n] === TILE_ROAD));
    if (p.gate) {
      // The piers broken off low, either side of the road.
      for (const side of [-1, 1]) {
        const o = side * 0.4;
        const h = g - base + 0.28 + 0.14 * hash2(tx + side, tz, 913);
        this.box(parts, ew ? 0.2 : THICK + 0.1, h, ew ? THICK + 0.1 : 0.2, cx + (ew ? o : 0), base, cz + (ew ? 0 : o), STONE_SHADE);
      }
      // A leaf of the door, split and thrown down.
      const geo = new THREE.BoxGeometry(0.34, 0.05, 0.26);
      geo.rotateY(hash2(tx, tz, 914) * 2);
      geo.rotateX(0.18);
      geo.translate(cx + (ew ? 0.06 : 0.22), g + 0.05, cz + (ew ? 0.22 : 0.06));
      parts.push({ geo, color: TIMBER_DARK });
    } else {
      // The stumps of the wall, and a low heap where it fell, spilling out on both sides.
      this.box(parts, ew ? 0.9 : THICK, g - base + 0.22, ew ? THICK : 0.9, cx, base, cz, STONE_SHADE);
      this.box(parts, ew ? 0.98 : 0.95, 0.12, ew ? 0.95 : 0.98, cx, g - 0.04, cz, STONE_DARK);
    }
    for (let i = 0; i < 16; i++) {
      const a = hash2(tx * 13 + i, tz, 910);
      const b = hash2(tx, tz * 13 + i, 911);
      const c = hash2(tx + i, tz + i, 912);
      let x = tx + 0.08 + 0.84 * a;
      let z = tz + 0.08 + 0.84 * b;
      // (A gate's stones lie to the road's sides.)
      if (p.gate) {
        const along = ew ? x - cx : z - cz;
        const push = along < 0 ? -0.3 - 0.15 * c : 0.3 + 0.15 * c;
        if (ew) x = cx + push;
        else z = cz + push;
      }
      const sz = 0.13 + 0.15 * c;
      const y = this.map.heightAt(x, z) - 0.02 + (p.gate ? 0 : 0.08) + (i < 6 ? 0.1 : 0);
      const geo = new THREE.BoxGeometry(sz * 1.3, sz * 0.8, sz);
      geo.rotateY(c * 3);
      geo.rotateX((a - 0.5) * 0.7);
      geo.translate(x, y + sz * 0.35, z);
      parts.push({ geo, color: RUBBLE[i % RUBBLE.length] });
    }
  }

  /** A tower: a square stone tower over its 2 × 2 tiles, a band of darker stone, a door at its foot, a roof walk with merlons round it. */
  private tower(parts: Part[], b: Building): void {
    const cx = b.x + 1;
    const cz = b.z + 1;
    const m = this.map;
    const base = Math.min(this.footing(b.x, b.z), this.footing(b.x + 1, b.z), this.footing(b.x, b.z + 1), this.footing(b.x + 1, b.z + 1)) - 0.12;
    const top = m.heightAt(cx, cz) + TOWER_H;
    const h = top - base;
    const S = TOWER_SIDE;
    // A slightly wider footing, the shaft, a string course, and the roof walk's parapet standing out.
    this.box(parts, S + 0.12, 0.3 + (m.heightAt(cx, cz) - base), S + 0.12, cx, base, cz, STONE_DARK);
    this.box(parts, S, h, S, cx, base, cz, STONE);
    this.box(parts, S + 0.04, 0.08, S + 0.04, cx, base + h * 0.55, cz, STONE_SHADE);
    this.box(parts, S + 0.14, 0.14, S + 0.14, cx, top - 0.02, cz, STONE_SHADE);
    this.box(parts, S - 0.2, 0.03, S - 0.2, cx, top + 0.1, cz, WALK);
    // Merlons round the roof walk: four a side.
    const half = (S + 0.14) / 2 - 0.08;
    for (let i = 0; i < 4; i++) {
      const o = -half + 0.08 + (i * (2 * half - 0.16)) / 3;
      this.box(parts, 0.2, 0.22, 0.16, cx + o, top + 0.12, cz - half, STONE_DARK);
      this.box(parts, 0.2, 0.22, 0.16, cx + o, top + 0.12, cz + half, STONE_DARK);
      this.box(parts, 0.16, 0.22, 0.2, cx - half, top + 0.12, cz + o, STONE_DARK);
      this.box(parts, 0.16, 0.22, 0.2, cx + half, top + 0.12, cz + o, STONE_DARK);
    }
    // Arrow slits: dark and narrow, two on each face, high up.
    for (const [dx, dz] of DIRS) {
      for (const o of [-0.35, 0.35]) {
        const x = cx + dx * (S / 2 + 0.005) + (dz !== 0 ? o : 0);
        const z = cz + dz * (S / 2 + 0.005) + (dx !== 0 ? o : 0);
        this.box(parts, dx !== 0 ? 0.02 : 0.06, 0.32, dz !== 0 ? 0.02 : 0.06, x, base + h * 0.68, z, SEAM);
      }
    }
    // A timber door at its foot, on every face (whichever faces the road).
    const g = m.heightAt(cx, cz);
    for (const [dx, dz] of DIRS) {
      this.box(parts, dx !== 0 ? 0.03 : 0.34, 0.6, dz !== 0 ? 0.03 : 0.34, cx + dx * (S / 2 + 0.01), g, cz + dz * (S / 2 + 0.01), TIMBER_DARK);
    }
  }
}
