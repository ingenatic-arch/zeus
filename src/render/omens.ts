import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { centreOf, footSide, livedIn } from '../sim/buildings';
import { curseNow, GODS } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { CURSES, QUAKE_REACH, RIOT_REACH } from '../sim/wrath';

/**
 * Slice 57: the signs of a god's wrath in the city, drawn from the sim's
 * `gods.wrath` (a pure read).
 *
 * - **A storm cloud** gathers over the place an omen means, a little bigger
 *   and darker each day of its month, with lightning flickering inside it;
 *   a smaller one hangs over a god come in wrath.
 * - **A ring of red light** on the ground where a curse will strike the
 *   city itself (an earthquake's or a riot's reach, a few tiles for the rest),
 *   pulsing faster as the day nears.
 * - **Dead birds** lying round the place.
 * - **Blight**: under Demeter's blight or Athena's failed olives (their omen or
 *   the curse in force), the fields or groves are patched grey-brown.
 *
 * Render only: nothing here feeds back into the sim.
 */

/** The most clouds' puffs, rings, birds and blighted patches drawn. */
const PUFFS = 160;
const RINGS = 4;
const BIRDS = 24;
const PATCHES = 96;
/** A cloud's height over the ground, and its puffs at the omen's start and its end. */
const CLOUD_HIGH = 7.5;
const PUFFS_FROM = 14;
const PUFFS_TO = 30;

let glowTex: THREE.Texture | null = null;
/** A soft round glow (the lightning in the cloud, the ring). */
function glow(): THREE.Texture {
  if (glowTex) return glowTex;
  const n = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

let ringTex: THREE.Texture | null = null;
/** A ring, bright at its edge (a curse's reach on the ground). */
function ring(): THREE.Texture {
  if (ringTex) return ringTex;
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.22)');
  grad.addColorStop(0.92, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  ringTex = new THREE.CanvasTexture(c);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  return ringTex;
}

/** A fixed hash to a number in [0, 1) (render only: any spread will do, and it never changes). */
const hash = (a: number, b: number): number => {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export class OmensView {
  readonly group = new THREE.Group();
  /** Where the ground is (bridges included): set by main.ts. */
  ground: (x: number, z: number) => number;
  private readonly puffs: THREE.InstancedMesh;
  private readonly flashes: THREE.InstancedMesh;
  private readonly rings: THREE.InstancedMesh;
  private readonly birds: THREE.InstancedMesh;
  private readonly patches: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private readonly flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  /** Where the storm gathers for a curse that comes from outside (a monster): over the town's middle, kept per omen. */
  private readonly hearts = new Map<number, [number, number]>();
  /** What was drawn last frame (for the probes). */
  drawn = { clouds: 0, puffs: 0, rings: 0, birds: 0, patches: 0, flashes: 0 };

  constructor(private readonly map: CoastMap) {
    this.group.name = 'omens';
    this.ground = (x, z) => map.heightAt(x, z);
    const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.82, flatShading: true, emissive: '#06040a' });
    this.puffs = this.instanced(new THREE.IcosahedronGeometry(1, 1), cloudMat, PUFFS, 'omen-cloud');
    this.puffs.castShadow = true;
    const add = (map: THREE.Texture, side: THREE.Side): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side, fog: false, toneMapped: false });
    const quad = new THREE.PlaneGeometry(1, 1);
    this.flashes = this.instanced(quad, add(glow(), THREE.FrontSide), 8, 'omen-flash');
    this.rings = this.instanced(quad, add(ring(), THREE.DoubleSide), RINGS, 'omen-ring');
    // A bird lying on its side: a body and two spread wings, flat on the ground.
    const bird = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.05, 0, 0.12), new THREE.Vector3(0.05, 0, 0.12), new THREE.Vector3(0, 0, -0.14),
      new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0.26, 0, -0.06), new THREE.Vector3(0.04, 0, -0.08),
      new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(-0.04, 0, -0.08), new THREE.Vector3(-0.22, 0, 0.04),
    ]);
    bird.computeVertexNormals();
    this.birds = this.instanced(bird, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), BIRDS, 'omen-birds');
    this.patches = this.instanced(quad, new THREE.MeshBasicMaterial({ map: glow(), color: '#ffffff', transparent: true, depthWrite: false, opacity: 0.85, side: THREE.DoubleSide }), PATCHES, 'omen-blight');
  }

  private instanced(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, name: string): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.group.add(mesh);
    return mesh;
  }

  /** Each frame: the clouds, rings, birds and blight for every omen running (and the curses in force), and a cloud over each god come in wrath. */
  update(s: SimState, time: number, face: THREE.Quaternion): void {
    const w = s.gods.wrath;
    const d = { clouds: 0, puffs: 0, rings: 0, birds: 0, patches: 0, flashes: 0 };
    let blight = curseNow(s, 'blight') ? 1 : 0;
    let olives = curseNow(s, 'olives') ? 1 : 0;
    for (const o of w?.omens ?? []) {
      const span = Math.max(1, o.day - o.at);
      const near = Math.max(0, Math.min(1, (s.tick - o.at) / span));
      const C = CURSES[o.curse];
      // (A curse on a place gathers over it; one that comes from outside, a monster, over the town's middle.)
      const [cx, cz] = C.local ? [o.x, o.z] : this.heart(s, o.at);
      const gy = this.ground(cx, cz);
      this.cloud(d, cx, gy + CLOUD_HIGH, cz, 2 + 2.4 * near, Math.round(PUFFS_FROM + (PUFFS_TO - PUFFS_FROM) * near), 0.24 - 0.12 * near, o.at, time, face, 0.35 + 0.65 * near);
      if (C.local && d.rings < RINGS) {
        const reach = o.curse === 'earthquake' ? QUAKE_REACH : o.curse === 'riot' ? RIOT_REACH : 3;
        const beat = 0.55 + 0.45 * Math.sin(time * (1.2 + 3 * near));
        this.sc.set(reach * 2, reach * 2, 1);
        this.p.set(o.x, gy + 0.08, o.z);
        this.m.compose(this.p, this.flat, this.sc);
        this.rings.setMatrixAt(d.rings, this.m);
        this.rings.setColorAt(d.rings, this.c.set('#d8301c').multiplyScalar((0.25 + 0.55 * near) * beat));
        d.rings++;
      }
      // Dead birds about the place, more as the day nears.
      const many = Math.min(BIRDS - d.birds, 3 + Math.round(5 * near));
      for (let i = 0; i < many; i++) {
        const a = hash(o.at, i) * Math.PI * 2;
        const r = 0.8 + hash(o.at + 1, i) * 3.2;
        const bx = cx + Math.cos(a) * r;
        const bz = cz + Math.sin(a) * r;
        if (this.wet(bx, bz)) continue;
        this.e.set(0, hash(o.at + 2, i) * Math.PI * 2, 0);
        this.q.setFromEuler(this.e);
        this.sc.setScalar(1.3);
        this.p.set(bx, this.ground(bx, bz) + 0.05, bz);
        this.m.compose(this.p, this.q, this.sc);
        this.birds.setMatrixAt(d.birds, this.m);
        this.birds.setColorAt(d.birds, this.c.set('#1e1c22'));
        d.birds++;
      }
      if (o.curse === 'blight') blight = Math.max(blight, near);
      if (o.curse === 'olives') olives = Math.max(olives, near);
    }
    // A god come in wrath: a small storm cloud over their head.
    for (const f of s.gods.walks.figures) {
      if (f.why !== 'wrath') continue;
      this.cloud(d, f.x, this.ground(f.x, f.z) + 5.4, f.z, 1.3, 12, 0.16, f.id * 97, time, face, 1);
    }
    // Blight on the fields or groves: grey-brown patches, more of each footprint as the day nears.
    if (blight > 0 || olives > 0) {
      for (const b of s.buildings) {
        if (d.patches >= PATCHES) break;
        const k = b.kind === 'farm' ? blight : b.kind === 'grove' ? olives : 0;
        if (k <= 0) continue;
        const [cx, cz] = centreOf(b);
        const side = footSide(b);
        for (let i = 0; i < 3 && d.patches < PATCHES; i++) {
          const ox = (hash(b.id, i) - 0.5) * side * 0.6;
          const oz = (hash(b.id, i + 7) - 0.5) * side * 0.6;
          this.sc.set(side * (0.45 + 0.4 * k), side * (0.45 + 0.4 * k), 1);
          this.p.set(cx + ox, this.ground(cx + ox, cz + oz) + 0.07 + i * 0.004, cz + oz);
          this.m.compose(this.p, this.flat, this.sc);
          this.patches.setMatrixAt(d.patches, this.m);
          this.patches.setColorAt(d.patches, this.c.set(b.kind === 'farm' ? '#5a4a34' : '#4a4038'));
          d.patches++;
        }
      }
    }
    const meshes: Array<[THREE.InstancedMesh, number]> = [
      [this.puffs, d.puffs],
      [this.flashes, d.flashes],
      [this.rings, d.rings],
      [this.birds, d.birds],
      [this.patches, d.patches],
    ];
    for (const [mesh, n] of meshes) {
      mesh.count = n;
      if (n) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
    this.drawn = d;
  }

  /** Is a spot on water (no dead bird lies there)? */
  private wet(x: number, z: number): boolean {
    const n = this.map.size;
    const tx = Math.floor(x);
    const tz = Math.floor(z);
    return tx < 0 || tz < 0 || tx >= n || tz >= n || this.map.tileWater[tz * n + tx] !== 0;
  }

  /** The middle of the town's lived-in homes (kept per omen, by when it began). */
  private heart(s: SimState, key: number): [number, number] {
    let h = this.hearts.get(key);
    if (h) return h;
    let x = 0;
    let z = 0;
    let k = 0;
    for (const b of s.buildings) {
      if (!livedIn(b)) continue;
      const [bx, bz] = centreOf(b);
      x += bx;
      z += bz;
      k++;
    }
    h = k ? [x / k, z / k] : [s.gods.wrath.omens[0]?.x ?? 0, s.gods.wrath.omens[0]?.z ?? 0];
    if (this.hearts.size > 8) this.hearts.clear();
    this.hearts.set(key, h);
    return h;
  }

  /** A storm cloud of `n` puffs about a point, `r` wide, `grey` light (0 black), churning slowly, lightning flickering inside at `flicker` (0 to 1) the most. */
  private cloud(d: typeof this.drawn, x: number, y: number, z: number, r: number, n: number, grey: number, seed: number, time: number, face: THREE.Quaternion, flicker: number): void {
    d.clouds++;
    for (let i = 0; i < n && d.puffs < PUFFS; i++) {
      const a = hash(seed, i) * Math.PI * 2 + time * 0.08 * (i % 2 ? 1 : -1);
      const rr = r * (0.2 + 0.8 * hash(seed + 3, i));
      const px = x + Math.cos(a) * rr;
      const pz = z + Math.sin(a) * rr;
      const py = y + (hash(seed + 5, i) - 0.5) * r * 0.35 + Math.sin(time * 0.6 + i) * 0.08;
      const size = (0.6 + hash(seed + 7, i) * 0.7) * (0.45 + r * 0.14);
      this.sc.set(size * 1.3, size * 0.75, size * 1.3);
      this.p.set(px, py, pz);
      this.e.set(0, a, 0);
      this.q.setFromEuler(this.e);
      this.m.compose(this.p, this.q, this.sc);
      this.puffs.setMatrixAt(d.puffs, this.m);
      const g = grey * (0.75 + 0.5 * hash(seed + 9, i));
      this.puffs.setColorAt(d.puffs, this.c.setRGB(g * 0.92, g * 0.9, g * 1.05));
      d.puffs++;
    }
    // Lightning inside it: a flash now and then (a little more often as its day nears).
    const beat = Math.floor(time * 4 + seed);
    const on = hash(beat, seed) < 0.06 + 0.12 * flicker && time * 4 + seed - beat < 0.5;
    if (on && d.flashes < 8) {
      this.sc.setScalar(r * 2.6);
      this.p.set(x + (hash(beat, 1) - 0.5) * r, y - 0.4, z + (hash(beat, 2) - 0.5) * r);
      this.m.compose(this.p, face, this.sc);
      this.flashes.setMatrixAt(d.flashes, this.m);
      this.flashes.setColorAt(d.flashes, this.c.set('#c8b8ff').multiplyScalar(0.9 * flicker));
      d.flashes++;
    }
  }

  /** For the probes: what each omen means in words. */
  static words(s: SimState): string[] {
    return (s.gods.wrath?.omens ?? []).map((o) => `${GODS[o.god].name}: ${CURSES[o.curse].name}`);
  }
}
