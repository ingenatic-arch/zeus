import * as THREE from 'three';

/**
 * Many looks drawn as one instanced mesh: every walker and animal look
 * (settlers, carriers, vendors, carts, deer…) goes into one of a few
 * MergedLooks, each drawn once for the whole map (and once more for its
 * shadow), however many kinds of walker are out.
 *
 * Each look is a merged, non-indexed model (see mergeTinted: position, colour,
 * tint mask and swinging legs per vertex). Every look's vertices go into one
 * float texture, three texels a vertex; the mesh itself is a run of as many
 * blank vertices as the largest look has, and each instance says which look
 * it is (where its vertices start in the texture and how many there are).
 * The vertex shader reads its vertex from the texture by its number; past the
 * end of a smaller look, vertices fold to one point (empty triangles).
 */

/** One full stride (two steps), in world units walked: legs swing with the distance covered, worked out in the shader from where she stands. */
export const STRIDE = 0.44;

/** Texels a row of the looks' texture. */
const TEX_W = 1024;

/** The shader code that reads a vertex of this instance's look: lookPos, lookColor, lookTint, lookLeg. */
const FETCH = `
  int lookV = gl_VertexID;
  bool lookOn = float(lookV) < aLook.y;
  int lookI = (int(aLook.x) + min(lookV, int(aLook.y) - 1)) * 3;
  vec4 lookA = texelFetch(lookTex, ivec2(lookI % ${TEX_W}, lookI / ${TEX_W}), 0);
  vec4 lookB = texelFetch(lookTex, ivec2((lookI + 1) % ${TEX_W}, (lookI + 1) / ${TEX_W}), 0);
  vec4 lookC = texelFetch(lookTex, ivec2((lookI + 2) % ${TEX_W}, (lookI + 2) / ${TEX_W}), 0);
  vec3 lookPos = lookOn ? lookA.xyz : vec3(0.0);
  float lookTint = lookA.w;
  vec3 lookColor = lookB.rgb;
  vec3 lookLeg = lookC.xyz;
`;

/** Legs swing about the hip with the distance walked; a walker standing still comes with its colour negated: legs together. */
const SWING = `
  #ifdef USE_INSTANCING_COLOR
  float moving = instanceColor.r < 0.0 ? 0.0 : 1.0;
  #else
  float moving = 1.0;
  #endif
  if (lookLeg.x != 0.0 && moving > 0.0) {
    vec3 at = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    float a = sin((at.x + at.z) * 6.2831853 / ${STRIDE.toFixed(3)}) * 0.5 * lookLeg.x;
    vec2 d = transformed.xy - lookLeg.yz;
    float c = cos(a);
    float s = sin(a);
    transformed.xy = lookLeg.yz + vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  }
`;

const PARS = `#include <common>\nattribute vec2 aLook;\nuniform highp sampler2D lookTex;`;

/** The lit material: flat shaded (normals from the faces), the look's colours, its tinted part (the tunic, a coat) in the instance's colour. */
function litMaterial(tex: { value: THREE.Texture | null }, name: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.lookTex = tex;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', PARS)
      .replace('#include <color_vertex>', `${FETCH}\n  vColor = vec4(lookColor, 1.0);\n  #ifdef USE_INSTANCING_COLOR\n  vColor.rgb *= mix(vec3(1.0), abs(instanceColor.rgb), lookTint);\n  #endif`)
      // No normals: the faces give them (flat shading); the shadow's normal offset takes straight up.
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `vec3 transformed = lookPos;\n#ifdef USE_INSTANCING\n${SWING}\n#endif`);
  };
  mat.customProgramCacheKey = () => `looks-lit-${name}`;
  return mat;
}

/** The shadow pass's material: the same vertices (legs together: the shadow is too small to tell). */
function depthMaterial(tex: { value: THREE.Texture | null }, name: string): THREE.MeshDepthMaterial {
  const mat = new THREE.MeshDepthMaterial();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.lookTex = tex;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', PARS).replace('#include <begin_vertex>', `${FETCH}\nvec3 transformed = lookPos;`);
  };
  mat.customProgramCacheKey = () => `looks-depth-${name}`;
  return mat;
}

/**
 * A set of looks drawn as one instanced mesh. add() each look's model first
 * (it returns the look's number); then each frame begin(), push() every
 * instance with its look, and end().
 */
export class MergedLooks {
  readonly group = new THREE.Group();
  private readonly models: THREE.BufferGeometry[] = [];
  private readonly looks: Look[] = [];
  private starts: number[] = [];
  private counts: number[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  private lookAttr: THREE.InstancedBufferAttribute | null = null;
  private cap = 0;
  private n = 0;
  private verts = 0;
  private readonly tex = { value: null as THREE.Texture | null };
  private readonly lit: THREE.MeshStandardMaterial;
  private readonly depth: THREE.MeshDepthMaterial;

  constructor(
    readonly name: string,
    private readonly startCap = 64,
  ) {
    this.group.name = name;
    this.lit = litMaterial(this.tex, name);
    this.depth = depthMaterial(this.tex, name);
  }

  /** Add a look (a model from mergeTinted): what its instances are pushed to each frame. */
  look(model: THREE.BufferGeometry): Look {
    if (this.tex.value) throw new Error(`${this.name}: looks are added before the first frame`);
    this.models.push(model.index ? model.toNonIndexed() : model);
    const l = new Look(this, this.models.length - 1);
    this.looks.push(l);
    return l;
  }

  /** Lay every look's vertices out in the texture. */
  private seal(): void {
    let total = 0;
    for (const g of this.models) {
      this.starts.push(total);
      const n = g.attributes.position.count;
      this.counts.push(n);
      total += n;
      this.verts = Math.max(this.verts, n);
    }
    const rows = Math.max(1, Math.ceil((total * 3) / TEX_W));
    const data = new Float32Array(TEX_W * rows * 4);
    let o = 0;
    for (const g of this.models) {
      const p = g.attributes.position;
      const c = g.attributes.color;
      const t = g.attributes.aTint;
      const l = g.attributes.aLeg;
      for (let i = 0; i < p.count; i++) {
        data.set([p.getX(i), p.getY(i), p.getZ(i), t ? t.getX(i) : 0], o);
        data.set([c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1, 1], o + 4);
        data.set([l ? l.getX(i) : 0, l ? l.getY(i) : 0, l ? l.getZ(i) : 0, 0], o + 8);
        o += 12;
      }
    }
    const tex = new THREE.DataTexture(data, TEX_W, rows, THREE.RGBAFormat, THREE.FloatType);
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.tex.value = tex;
    this.grow(this.startCap);
  }

  private grow(need: number): void {
    const cap = Math.max(need, this.cap * 2, 8);
    const geo = new THREE.BufferGeometry();
    // Blank vertices: the shader reads each from the texture.
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.verts * 3), 3));
    const look = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    look.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aLook', look);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    const mesh = new THREE.InstancedMesh(geo, this.lit, cap);
    mesh.name = this.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = this.depth;
    // Drawn whatever the camera sees: one mesh for the whole map.
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    const old = this.mesh;
    if (old && this.lookAttr) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, this.n * 16));
      (mesh.instanceColor.array as Float32Array).set((old.instanceColor!.array as Float32Array).subarray(0, this.n * 3));
      (look.array as Float32Array).set((this.lookAttr.array as Float32Array).subarray(0, this.n * 2));
      this.group.remove(old);
      old.geometry.dispose();
      old.dispose();
    }
    this.mesh = mesh;
    this.lookAttr = look;
    this.cap = cap;
    this.group.add(mesh);
  }

  begin(): void {
    if (!this.tex.value) this.seal();
    this.n = 0;
    for (const l of this.looks) l.n = 0;
  }

  push(look: number, m: THREE.Matrix4, c: THREE.Color): void {
    if (this.n >= this.cap) this.grow(this.n + 1);
    const mesh = this.mesh!;
    mesh.setMatrixAt(this.n, m);
    mesh.setColorAt(this.n, c);
    this.lookAttr!.setXY(this.n, this.starts[look], this.counts[look]);
    this.n++;
  }

  end(): void {
    const mesh = this.mesh!;
    mesh.count = this.n;
    mesh.visible = this.n > 0;
    if (this.n === 0) return;
    for (const a of [mesh.instanceMatrix, mesh.instanceColor!, this.lookAttr!]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * a.itemSize);
      a.needsUpdate = true;
    }
  }

  /** Instances drawn this frame. */
  get count(): number {
    return this.n;
  }
}

/** One look of a MergedLooks: push its instances each frame. */
export class Look {
  /** Instances pushed this frame. */
  n = 0;

  constructor(
    private readonly set: MergedLooks,
    readonly index: number,
  ) {}

  push(m: THREE.Matrix4, c: THREE.Color): void {
    this.set.push(this.index, m, c);
    this.n++;
  }

  get count(): number {
    return this.n;
  }
}

/**
 * The walkers' and animals' merged meshes. Every instance runs as many
 * vertices as the biggest look in its mesh, so the many small looks (people
 * on foot, about 450 to 1,100 vertices) go in one, and the few big ones (ox
 * carts, hunters with a kill, the animals: up to about 2,000) in the other.
 */
export class FolkLooks {
  readonly group = new THREE.Group();
  readonly people = new MergedLooks('folk-people', 256);
  readonly big = new MergedLooks('folk-big', 64);

  constructor() {
    this.group.name = 'folk';
    this.group.add(this.people.group, this.big.group);
  }

  begin(): void {
    this.people.begin();
    this.big.begin();
  }

  end(): void {
    this.people.end();
    this.big.end();
  }
}
