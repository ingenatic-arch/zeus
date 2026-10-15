import * as THREE from 'three';

/**
 * Instanced meshes split into square chunks of the world, each with its own
 * bounds, so the camera and the shadow pass skip the chunks they can't see.
 * One InstancedMesh per chunk that has anything in it.
 *
 * Use set() to replace one chunk's instances (plants, homes: rebuilt when
 * something changes), or begin()/push()/end() to refill every chunk (walkers,
 * every frame).
 */
export class ChunkedInstances {
  readonly group = new THREE.Group();
  private readonly chunks = new Map<number, { mesh: THREE.InstancedMesh; cap: number; lo: number; hi: number; n: number }>();
  private readonly radius: number;
  private readonly height: number;
  private readonly tmpC = new THREE.Color(1, 1, 1);

  constructor(
    readonly name: string,
    private readonly geometry: THREE.BufferGeometry,
    private readonly material: THREE.Material,
    readonly size: number,
    private readonly opts: { castShadow: boolean; receiveShadow: boolean; colors: boolean },
  ) {
    this.group.name = name;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const bb = geometry.boundingBox as THREE.Box3;
    // Generous: instances may be scaled up to about twice their model size.
    this.radius = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z)) * 2.2;
    this.height = bb.max.y * 2.2;
  }

  key(x: number, z: number): number {
    return (Math.floor(z / this.size) + 512) * 1024 + (Math.floor(x / this.size) + 512);
  }

  private chunk(key: number, need: number): { mesh: THREE.InstancedMesh; cap: number; lo: number; hi: number; n: number } {
    let c = this.chunks.get(key);
    if (c && c.cap >= need) return c;
    const cap = Math.max(need, c ? c.cap * 2 : 8);
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, cap);
    mesh.name = `${this.name}-${key}`;
    mesh.castShadow = this.opts.castShadow;
    mesh.receiveShadow = this.opts.receiveShadow;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.opts.colors) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    mesh.count = 0;
    if (c) {
      // Carry over what was there.
      mesh.instanceMatrix.array.set(c.mesh.instanceMatrix.array.subarray(0, c.n * 16));
      if (c.mesh.instanceColor && mesh.instanceColor) mesh.instanceColor.array.set(c.mesh.instanceColor.array.subarray(0, c.n * 3));
      mesh.count = c.n;
      this.group.remove(c.mesh);
      c.mesh.dispose();
    }
    const fresh = { mesh, cap, lo: c?.lo ?? Infinity, hi: c?.hi ?? -Infinity, n: c?.n ?? 0 };
    this.chunks.set(key, fresh);
    this.group.add(mesh);
    return fresh;
  }

  private bound(key: number, c: { mesh: THREE.InstancedMesh; lo: number; hi: number }): void {
    const cx = ((key % 1024) - 512 + 0.5) * this.size;
    const cz = (Math.floor(key / 1024) - 512 + 0.5) * this.size;
    const lo = Number.isFinite(c.lo) ? c.lo : 0;
    const hi = Number.isFinite(c.hi) ? c.hi : 0;
    const half = this.size * Math.SQRT1_2 + this.radius;
    const vert = (hi - lo) / 2 + this.height;
    c.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, (lo + hi) / 2 + this.height / 2, cz), Math.hypot(half, vert));
  }

  /**
   * Replace the instances in the chunk holding (x, z): write(i, matrix, colour)
   * fills instance i. Pass n = 0 to empty it.
   */
  set(x: number, z: number, n: number, write: (i: number, m: THREE.Matrix4, c: THREE.Color) => void): void {
    const key = this.key(x, z);
    if (n === 0 && !this.chunks.has(key)) return;
    const c = this.chunk(key, n);
    c.lo = Infinity;
    c.hi = -Infinity;
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      this.tmpC.setRGB(1, 1, 1);
      write(i, m, this.tmpC);
      c.mesh.setMatrixAt(i, m);
      if (c.mesh.instanceColor) c.mesh.setColorAt(i, this.tmpC);
      const y = m.elements[13];
      c.lo = Math.min(c.lo, y);
      c.hi = Math.max(c.hi, y);
    }
    c.n = n;
    c.mesh.count = n;
    c.mesh.visible = n > 0;
    c.mesh.instanceMatrix.needsUpdate = true;
    if (c.mesh.instanceColor) c.mesh.instanceColor.needsUpdate = true;
    this.bound(key, c);
  }

  // Refilling every chunk each frame.
  private filling = new Map<number, number>();

  begin(): void {
    this.filling.clear();
    for (const c of this.chunks.values()) {
      c.n = 0;
      c.lo = Infinity;
      c.hi = -Infinity;
    }
  }

  push(m: THREE.Matrix4, color?: THREE.Color): void {
    const x = m.elements[12];
    const y = m.elements[13];
    const z = m.elements[14];
    const key = this.key(x, z);
    const n = this.filling.get(key) ?? 0;
    const c = this.chunk(key, n + 1);
    c.mesh.setMatrixAt(n, m);
    if (c.mesh.instanceColor) c.mesh.setColorAt(n, color ?? this.tmpC.setRGB(1, 1, 1));
    c.n = n + 1;
    c.lo = Math.min(c.lo, y);
    c.hi = Math.max(c.hi, y);
    this.filling.set(key, n + 1);
  }

  end(): void {
    for (const [key, c] of this.chunks) {
      c.mesh.count = c.n;
      c.mesh.visible = c.n > 0;
      if (c.n > 0) {
        c.mesh.instanceMatrix.needsUpdate = true;
        if (c.mesh.instanceColor) c.mesh.instanceColor.needsUpdate = true;
        this.bound(key, c);
      }
    }
  }

  /** Total instances drawn, for the measuring script. */
  get count(): number {
    let n = 0;
    for (const c of this.chunks.values()) n += c.n;
    return n;
  }
}
