import * as THREE from 'three';
import type { CoastMap } from '../map/bake';

/** What the drag would do to a tile, as shown while placing. */
export const MARK_NONE = 0;
export const MARK_OK = 1;
export const MARK_BAD = 2;
export const MARK_CLEAR = 3;

const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMarks;
  uniform float uSize;
  uniform vec2 uCursor;
  uniform float uRadius;
  uniform float uEdgeGlow;
  uniform float uTime;
  varying vec3 vWorld;

  void main() {
    vec2 p = vWorld.xz;
    if (p.x < 0.0 || p.y < 0.0 || p.x > uSize || p.y > uSize) discard;
    vec2 tile = floor(p);
    // r: what the drag does here; g: the ground can't take this tool; b: the map's edge.
    vec3 m = texture2D(uMarks, (tile + 0.5) / uSize).rgb;
    float mark = floor(m.r * 255.0 + 0.5);
    float near = 1.0 - smoothstep(uRadius * 0.45, uRadius, distance(p, uCursor));

    // The faint grid, fading away from the pointer.
    vec2 f = abs(fract(p) - 0.5);
    float d = 0.5 - max(f.x, f.y);
    float w = fwidth(p.x) + fwidth(p.y);
    float line = 1.0 - smoothstep(0.0, w * 0.9, d);
    vec4 col = vec4(1.0, 0.97, 0.88, line * 0.38 * near);

    // Ground the tool can't use, near the pointer: a soft rust wash.
    col = mix(col, vec4(0.78, 0.32, 0.2, 0.22), m.g * near * (1.0 - line * 0.5));

    // Where settlers come in: the map's edge glows gold under the road tool.
    float glow = m.b * uEdgeGlow * (0.55 + 0.25 * sin(uTime * 2.4));
    col = mix(col, vec4(1.0, 0.82, 0.32, 0.6), glow);

    // The drag's tiles, with a slightly brighter rim.
    float rim = smoothstep(0.32, 0.47, max(f.x, f.y));
    if (mark > 0.5 && mark < 1.5) col = vec4(1.0, 0.97, 0.85, 0.42 + 0.25 * rim);
    else if (mark > 1.5 && mark < 2.5) col = vec4(0.9, 0.22, 0.14, 0.5 + 0.25 * rim);
    else if (mark > 2.5) col = vec4(1.0, 0.5, 0.15, 0.5 + 0.25 * rim);
    if (col.a < 0.003) discard;
    gl_FragColor = col;
  }
`;

/**
 * The placing overlay: a faint grid on the ground around the pointer, the
 * tiles a drag would take tinted by whether they can be built, and the map's
 * edge glowing where settlers come in. Drawn on the terrain's own triangles.
 */
export class Placement {
  readonly mesh: THREE.Mesh;
  private readonly data: Uint8Array;
  private readonly tex: THREE.DataTexture;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly size: number;

  constructor(map: CoastMap, terrain: THREE.BufferGeometry) {
    const n = map.size;
    this.size = n;
    this.data = new Uint8Array(n * n * 4);
    this.tex = new THREE.DataTexture(this.data, n, n, THREE.RGBAFormat);
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.minFilter = THREE.NearestFilter;
    this.tex.needsUpdate = true;
    // Mark the map's edge (land only), where roads bring settlers in.
    for (let t = 0; t < n * n; t++) {
      const x = t % n;
      const z = (t - x) / n;
      if ((x === 0 || z === 0 || x === n - 1 || z === n - 1) && map.tileWater[t] === 0) this.data[t * 4 + 2] = 255;
    }
    this.uniforms = {
      uMarks: { value: this.tex },
      uSize: { value: n },
      uCursor: { value: new THREE.Vector2(-100, -100) },
      uRadius: { value: 9 },
      uEdgeGlow: { value: 0 },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -8,
    });
    this.mesh = new THREE.Mesh(terrain, mat);
    this.mesh.name = 'placement';
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  show(on: boolean, edgeGlow: boolean): void {
    this.mesh.visible = on;
    this.uniforms.uEdgeGlow.value = edgeGlow ? 1 : 0;
  }

  setCursor(x: number, z: number, radius: number): void {
    (this.uniforms.uCursor.value as THREE.Vector2).set(x, z);
    this.uniforms.uRadius.value = radius;
  }

  update(time: number): void {
    this.uniforms.uTime.value = time;
  }

  /** Which tiles the current tool can't use at all (a soft wash near the pointer). */
  setBlocked(blocked: (t: number) => boolean): void {
    for (let t = 0; t < this.size * this.size; t++) this.data[t * 4 + 1] = blocked(t) ? 255 : 0;
    this.tex.needsUpdate = true;
  }

  /** The drag's tiles and what it would do to each. */
  setMarks(marks: ReadonlyMap<number, number>): void {
    for (let t = 0; t < this.size * this.size; t++) this.data[t * 4] = 0;
    for (const [t, v] of marks) this.data[t * 4] = v;
    this.tex.needsUpdate = true;
  }
}
