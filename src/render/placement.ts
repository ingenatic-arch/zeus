import * as THREE from 'three';
import { tileCopper } from '../sim/build';
import { tileMarble } from '../sim/materials';
import type { CoastMap } from '../map/bake';

/** What the drag would do to a tile, as shown while placing. */
export const MARK_NONE = 0;
export const MARK_OK = 1;
export const MARK_BAD = 2;
export const MARK_CLEAR = 3;
/** It can go here, but it won't work as it is (a workplace with no road beside it). */
export const MARK_WARN = 4;

/**
 * The water overlay's codes, one per tile in the texture's alpha channel:
 * 1–100 a road in a water carrier's reach (brighter nearer the fountain),
 * 101–200 the same, walked by a carrier lately, 201 a road the fountain being
 * placed would bring into reach, 210–249 a home with water (more the fresher),
 * 250 a lived-in home without water, 252 a fountain.
 */
export const WATER_REACH = 1;
export const WATER_WALKED = 101;
export const WATER_PREVIEW = 201;
export const WATER_HOME = 210;
export const WATER_DRY = 250;
export const WATER_FOUNTAIN = 252;
/** In the food overlay (the same codes, in gold), and these two besides: a farm, a granary. */
export const FOOD_FARM = 253;
export const FOOD_GRANARY = 254;
/** In the "what's missing" overlay: a home that is warned (it will drop a level), one that lacks what it needs to grow, one that has all it needs. */
export const MISSING_WARN = 205;
export const MISSING_WANT = 206;
export const MISSING_FINE = 207;

const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    // A hair above the road paving (which sits 0.035 above the ground), so road tiles take the tint too.
    wp.y += 0.05;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMarks;
  uniform float uSize;
  uniform vec2 uCursor;
  uniform float uRadius;
  uniform float uEdgeGlow;
  uniform float uCopper;
  uniform float uMarble;
  uniform float uTime;
  uniform float uGrid;
  uniform float uOverlay;
  varying vec3 vWorld;

  // The overlay's tone (see OVERLAY_TONES): reach on the roads, road walked lately, a preview, a home that has it, a home without, the source.
  uniform vec3 uCol[6];

  void main() {
    vec2 p = vWorld.xz;
    if (p.x < 0.0 || p.y < 0.0 || p.x > uSize || p.y > uSize) discard;
    vec2 tile = floor(p);
    // r: what the drag does here; g: the ground can't take this tool; b: the map's edge; a: the water overlay.
    vec4 m = texture2D(uMarks, (tile + 0.5) / uSize);
    float mark = floor(m.r * 255.0 + 0.5);
    float near = (1.0 - smoothstep(uRadius * 0.45, uRadius, distance(p, uCursor))) * uGrid;

    // The faint grid, fading away from the pointer.
    vec2 f = abs(fract(p) - 0.5);
    float d = 0.5 - max(f.x, f.y);
    float w = fwidth(p.x) + fwidth(p.y);
    float line = 1.0 - smoothstep(0.0, w * 0.9, d);
    vec4 col = vec4(1.0, 0.97, 0.88, line * 0.38 * near);

    // The water overlay (see WATER_* codes): reach on the roads, water on the homes.
    float o = floor(m.a * 255.0 + 0.5) * uOverlay;
    float edge = smoothstep(0.30, 0.48, max(f.x, f.y));
    if (o > 0.5 && o < 100.5) {
      float k = (o - 1.0) / 99.0;
      col = vec4(uCol[0], 0.16 + 0.26 * k);
    } else if (o > 100.5 && o < 200.5) {
      float k = (o - 101.0) / 99.0;
      col = vec4(uCol[1], 0.34 + 0.34 * k);
    } else if (o > 200.5 && o < 201.5) {
      col = vec4(uCol[2], 0.5 + 0.15 * sin(uTime * 4.0));
    } else if (o > 209.5 && o < 249.5) {
      float k = (o - 210.0) / 39.0;
      col = vec4(uCol[3], (0.3 + 0.35 * k) * (0.75 + 0.25 * edge));
    } else if (o > 249.5 && o < 250.5) {
      col = vec4(uCol[4], 0.42 * (0.7 + 0.3 * edge));
    } else if (o > 251.5 && o < 252.5) {
      col = vec4(uCol[5], 0.6);
    } else if (o > 204.5 && o < 205.5) {
      col = vec4(0.86, 0.28, 0.18, (0.5 + 0.1 * sin(uTime * 3.0)) * (0.7 + 0.3 * edge));
    } else if (o > 205.5 && o < 206.5) {
      col = vec4(0.96, 0.7, 0.2, 0.42 * (0.7 + 0.3 * edge));
    } else if (o > 206.5 && o < 207.5) {
      col = vec4(0.45, 0.72, 0.3, 0.34 * (0.7 + 0.3 * edge));
    } else if (o > 252.5 && o < 253.5) {
      col = vec4(0.7, 0.82, 0.28, 0.45 * (0.7 + 0.3 * edge));
    } else if (o > 253.5 && o < 254.5) {
      col = vec4(0.95, 0.85, 0.45, 0.5 * (0.7 + 0.3 * edge));
    }
    if (o > 0.5) col.rgb = mix(col.rgb, vec3(1.0, 0.97, 0.88), line * 0.5 * near);

    // Ground the tool can't use, near the pointer: a soft rust wash.
    col = mix(col, vec4(0.78, 0.32, 0.2, 0.22), m.g * near * (1.0 - line * 0.5));

    // Copper in the rock, while the mine tool is in hand: green streaks over the rock, the richer the stronger (b: 1..201; 255 is the map's edge).
    float bv = floor(m.b * 255.0 + 0.5);
    float rich = (bv > 0.5 && bv < 201.5) ? (bv - 1.0) / 200.0 : 0.0;
    if (uCopper > 0.5 && rich > 0.0) {
      float sv = sin((p.x * 1.3 + p.y * 0.7) * 3.4 + sin(p.y * 1.9 + p.x * 0.4) * 2.2);
      float streak = smoothstep(0.35, 0.85, sv);
      vec4 green = vec4(0.22, 0.78, 0.58, (0.16 + 0.5 * streak) * (0.35 + 0.65 * rich));
      col = mix(col, green, green.a / max(green.a + col.a * (1.0 - green.a), 0.001));
      col.a = max(col.a, green.a);
    }

    // Marble in the rock (slice 32), while the quarry tool is in hand: a pale glaze with soft grey veins, the richer the stronger (b: 202..252).
    float marble = (bv > 201.5 && bv < 252.5) ? (bv - 202.0) / 50.0 : 0.0;
    if (uMarble > 0.5 && marble > 0.0) {
      float vein = sin((p.x * 0.9 - p.y * 1.4) * 2.6 + sin(p.x * 2.3 + p.y * 0.6) * 1.8);
      float soft = smoothstep(0.55, 0.95, vein);
      vec4 pale = vec4(mix(vec3(0.98, 0.96, 0.9), vec3(0.62, 0.62, 0.64), soft * 0.6), (0.22 + 0.18 * soft) * (0.4 + 0.6 * marble) + 0.18 * marble);
      col = mix(col, pale, pale.a / max(pale.a + col.a * (1.0 - pale.a), 0.001));
      col.a = max(col.a, pale.a);
    }

    // Where settlers come in: the map's edge glows gold under the road tool.
    float glow = step(254.5, bv) * uEdgeGlow * (0.55 + 0.25 * sin(uTime * 2.4));
    col = mix(col, vec4(1.0, 0.82, 0.32, 0.6), glow);

    // The drag's tiles, with a slightly brighter rim.
    float rim = smoothstep(0.32, 0.47, max(f.x, f.y));
    if (mark > 0.5 && mark < 1.5) col = vec4(1.0, 0.97, 0.85, 0.42 + 0.25 * rim);
    else if (mark > 1.5 && mark < 2.5) col = vec4(0.9, 0.22, 0.14, 0.5 + 0.25 * rim);
    else if (mark > 2.5 && mark < 3.5) col = vec4(1.0, 0.5, 0.15, 0.5 + 0.25 * rim);
    else if (mark > 3.5) col = vec4(1.0, 0.78, 0.24, 0.5 + 0.25 * rim);
    if (mark < 0.5 && o < 0.5 && uGrid < 0.5) discard;
    if (col.a < 0.003) discard;
    gl_FragColor = col;
  }
`;

type RGB = readonly [number, number, number];
/**
 * Each service overlay's colours (by tone), in the order the shader reads
 * them: a road in reach (faint), a road walked lately, a preview of a new
 * building's reach, a home that has it, a home without, and the building it
 * comes from. Water blue, food gold, blessings lilac, plays rose, taxes
 * bronze-green, oil olive, fleece the cream of new wool, wine a deep purple,
 * fire risk brick red, wear slate blue.
 */
export const OVERLAY_TONES: ReadonlyArray<readonly [RGB, RGB, RGB, RGB, RGB, RGB]> = [
  [[0.36, 0.64, 0.95], [0.22, 0.72, 1.0], [0.2, 0.62, 1.0], [0.2, 0.5, 0.95], [0.86, 0.36, 0.2], [0.3, 0.82, 1.0]],
  [[0.95, 0.74, 0.3], [1.0, 0.66, 0.12], [1.0, 0.7, 0.2], [0.92, 0.62, 0.14], [0.62, 0.3, 0.42], [1.0, 0.82, 0.3]],
  [[0.66, 0.54, 0.92], [0.7, 0.46, 1.0], [0.68, 0.5, 1.0], [0.56, 0.38, 0.9], [0.62, 0.48, 0.3], [0.8, 0.66, 1.0]],
  [[0.95, 0.52, 0.62], [1.0, 0.4, 0.58], [1.0, 0.46, 0.62], [0.9, 0.32, 0.5], [0.36, 0.46, 0.6], [1.0, 0.62, 0.72]],
  [[0.3, 0.78, 0.66], [0.12, 0.76, 0.6], [0.2, 0.74, 0.6], [0.12, 0.56, 0.46], [0.8, 0.56, 0.24], [0.36, 0.9, 0.76]],
  [[0.62, 0.74, 0.3], [0.6, 0.78, 0.16], [0.62, 0.76, 0.2], [0.46, 0.6, 0.12], [0.66, 0.42, 0.24], [0.78, 0.9, 0.4]],
  [[0.96, 0.9, 0.74], [1.0, 0.93, 0.7], [1.0, 0.92, 0.72], [0.9, 0.82, 0.6], [0.4, 0.42, 0.6], [1.0, 0.96, 0.84]],
  [[0.66, 0.3, 0.6], [0.62, 0.16, 0.5], [0.66, 0.22, 0.56], [0.5, 0.12, 0.4], [0.7, 0.6, 0.3], [0.8, 0.44, 0.72]],
  // Fire risk: the watchman's roads in a smoky brick red; his post bright.
  [[0.9, 0.46, 0.3], [0.96, 0.38, 0.2], [0.98, 0.46, 0.26], [0.86, 0.36, 0.2], [0.86, 0.3, 0.2], [1.0, 0.56, 0.3]],
  // Wear: the inspector's roads in the slate blue of her dress; her office bright.
  [[0.46, 0.56, 0.78], [0.36, 0.5, 0.86], [0.42, 0.54, 0.9], [0.32, 0.44, 0.74], [0.86, 0.3, 0.2], [0.56, 0.68, 0.96]],
  // Slice 49, health: the physicians' roads in a fresh herb green; the infirmaries and asklepieia bright.
  [[0.42, 0.78, 0.56], [0.3, 0.84, 0.5], [0.36, 0.8, 0.54], [0.28, 0.66, 0.42], [0.86, 0.36, 0.26], [0.6, 0.95, 0.7]],
];

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
      // Copper in the rock (slice 23): 1..201 by how rich, shown while the mine tool is in hand.
      else {
        const c = tileCopper(map, t);
        // (And marble, slice 32: 202..252, where it is richer than any copper there.)
        const mb = tileMarble(map, t);
        if (mb > 0.02 && mb >= c) this.data[t * 4 + 2] = 202 + Math.round(mb * 50);
        else if (c > 0.02) this.data[t * 4 + 2] = 1 + Math.round(c * 200);
      }
    }
    this.uniforms = {
      uMarks: { value: this.tex },
      uSize: { value: n },
      uCursor: { value: new THREE.Vector2(-100, -100) },
      uRadius: { value: 9 },
      uEdgeGlow: { value: 0 },
      uCopper: { value: 0 },
      uMarble: { value: 0 },
      uTime: { value: 0 },
      uGrid: { value: 0 },
      uOverlay: { value: 0 },
      uCol: { value: OVERLAY_TONES[0].map((c) => new THREE.Vector3(c[0], c[1], c[2])) },
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
    // Marks over the river (a bridge being dragged) float at the deck's height, above the water.
    const tile = new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2);
    this.lifted = new THREE.InstancedMesh(tile, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }), 32);
    this.lifted.name = 'placement-lifted';
    this.lifted.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(32 * 3), 3);
    this.lifted.count = 0;
    this.lifted.frustumCulled = false;
    this.lifted.renderOrder = 3;
    this.mesh.add(this.lifted);
  }

  private readonly lifted: THREE.InstancedMesh;

  /** Marks drawn in the air over water: tile centres at a height, good or bad. */
  setLifted(marks: ReadonlyArray<{ x: number; z: number; y: number; bad: boolean }>): void {
    const m = new THREE.Matrix4();
    const ok = new THREE.Color(1.0, 0.97, 0.85);
    const bad = new THREE.Color(0.9, 0.22, 0.14);
    const n = Math.min(marks.length, this.lifted.instanceMatrix.count);
    for (let i = 0; i < n; i++) {
      const k = marks[i];
      m.makeTranslation(k.x, k.y, k.z);
      this.lifted.setMatrixAt(i, m);
      this.lifted.setColorAt(i, k.bad ? bad : ok);
    }
    if (this.lifted.count === 0 && n === 0) return;
    this.lifted.count = n;
    this.lifted.instanceMatrix.needsUpdate = true;
    if (this.lifted.instanceColor) this.lifted.instanceColor.needsUpdate = true;
  }

  private tool = false;
  private overlay = false;

  /** A tool is picked (the grid and the drag's tiles show); the road tool also lights the map's edge. */
  show(on: boolean, edgeGlow: boolean, copper = false, marble = false): void {
    this.tool = on;
    this.uniforms.uGrid.value = on ? 1 : 0;
    this.uniforms.uEdgeGlow.value = edgeGlow ? 1 : 0;
    this.uniforms.uCopper.value = copper ? 1 : 0;
    this.uniforms.uMarble.value = marble ? 1 : 0;
    this.mesh.visible = this.tool || this.overlay;
  }

  /** A service overlay on or off, in its tone (an OVERLAY_TONES row: 0 water, 1 food, 2 religion, 3 culture, 4 taxes, 5 oil, 6 fleece, 7 wine). */
  showOverlay(on: boolean, tone = 0): void {
    const row = OVERLAY_TONES[tone] ?? OVERLAY_TONES[0];
    const cols = this.uniforms.uCol.value as THREE.Vector3[];
    for (let i = 0; i < 6; i++) cols[i].set(row[i][0], row[i][1], row[i][2]);
    this.overlay = on;
    this.uniforms.uOverlay.value = on ? 1 : 0;
    this.mesh.visible = this.tool || this.overlay;
  }

  /** The water overlay's code for every tile (WATER_* values). */
  setOverlay(codes: Uint8Array): void {
    const d = this.data;
    let changed = false;
    for (let t = 0; t < codes.length; t++) {
      if (d[t * 4 + 3] !== codes[t]) {
        d[t * 4 + 3] = codes[t];
        changed = true;
      }
    }
    if (changed) this.tex.needsUpdate = true;
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

  private marks = new Map<number, number>();

  /** The drag's tiles and what it would do to each. The texture is touched only if they changed. */
  setMarks(marks: ReadonlyMap<number, number>): void {
    const old = this.marks;
    if (old.size === marks.size) {
      let same = true;
      for (const [t, v] of marks) {
        if (old.get(t) !== v) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    for (const t of old.keys()) this.data[t * 4] = 0;
    for (const [t, v] of marks) this.data[t * 4] = v;
    this.marks = new Map(marks);
    this.writes++;
    this.tex.needsUpdate = true;
  }

  /** How many times the marks have been written to the texture (for the smoke test). */
  get markWrites(): number {
    return this.writes;
  }
  private writes = 0;
}
