import * as THREE from 'three';
import { FIELD_MIN, RIVER_EDGE_FADE, shoreZ, type CoastMap } from '../map/bake';
import { smoothstep } from '../map/noise';
import { finishOn } from './finish';
import { col, PAL } from './palette';

/**
 * Sea and river water: one custom shader with gentle faceted waves, colour by
 * depth (read from a baked height texture), shoreline foam and sun glints.
 */

const vertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uTime;
  uniform vec2 uWind;
  uniform float uWaveAmp;
  uniform float uRiver;
  uniform sampler2D uGround;
  uniform vec2 uFieldMin;
  uniform float uFieldSize;
  uniform float uMapHalf;
  attribute vec2 aFlow;
  attribute float aFade;
  attribute float aEdge;
  varying float vFade;
  varying float vEdge;
  varying vec3 vWorld;
  varying float vBaseY;
  varying vec2 vFlow;

  // The baked ground: r is the height, g how much the river covers the spot.
  // Beyond the baked field the sea floor carries on from the field's edge
  // and slopes gently away, so the water's colour has no seam there.
  vec2 groundAt(vec2 p) {
    vec2 uv = (p - uFieldMin + 0.5) / uFieldSize;
    vec2 g = texture2D(uGround, clamp(uv, 0.0, 1.0)).rg;
    vec2 out_ = abs(uv - clamp(uv, 0.0, 1.0)) * uFieldSize;
    float beyond = max(out_.x, out_.y);
    if (beyond > 0.0) {
      float r = mix(g.r, min(g.r, -1.0), smoothstep(0.0, 40.0, beyond));
      g = vec2(mix(r, -9.0, smoothstep(0.0, 400.0, beyond)), 0.0);
    }
    return g;
  }

  float waves(vec2 p, float t) {
    vec2 d1 = normalize(uWind);
    vec2 d2 = vec2(-d1.y, d1.x);
    float w = sin(dot(p, d1) * 0.42 + t * 1.15) * 0.55;
    w += sin(dot(p, normalize(d1 * 0.6 + d2 * 0.8)) * 0.77 - t * 1.6) * 0.3;
    w += sin(dot(p, normalize(d1 * 0.4 - d2 * 0.9)) * 1.31 + t * 2.1) * 0.15;
    return w;
  }

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vBaseY = wp.y;
    vec2 g = groundAt(wp.xz);
    float depth = wp.y - g.r;
    float edge = 1.0 - smoothstep(110.0, 128.0, max(abs(wp.x - uMapHalf), abs(wp.z - uMapHalf)) - uMapHalf);
    float amp = uWaveAmp * smoothstep(0.0, 1.6, depth) * mix(1.0, edge, 1.0 - uRiver);
    // The sea lies flat under the river's mouth, so the river always shows above it.
    amp *= 1.0 - g.g * (1.0 - uRiver);
    wp.y += waves(wp.xz, uTime) * amp * (0.6 + 0.6 * length(uWind));
    vWorld = wp.xyz;
    vFlow = aFlow;
    vFade = aFade;
    vEdge = aEdge;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uRiver;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uShallow;
  uniform vec3 uMid;
  uniform vec3 uDeep;
  uniform vec3 uRiverCol;
  uniform vec3 uFoam;
  uniform vec3 uSky;
  uniform sampler2D uGround;
  uniform vec2 uFieldMin;
  uniform float uFieldSize;
  varying vec3 vWorld;
  varying float vBaseY;
  varying vec2 vFlow;
  varying float vFade;
  varying float vEdge;
  uniform vec2 uEdgeFade;
  // 1 with the city's finish on (render/finish.ts): lacy, broken foam rather than a solid band.
  uniform float uSoft;

  vec2 groundAt(vec2 p) {
    vec2 uv = (p - uFieldMin + 0.5) / uFieldSize;
    vec2 g = texture2D(uGround, clamp(uv, 0.0, 1.0)).rg;
    vec2 out_ = abs(uv - clamp(uv, 0.0, 1.0)) * uFieldSize;
    float beyond = max(out_.x, out_.y);
    if (beyond > 0.0) {
      float r = mix(g.r, min(g.r, -1.0), smoothstep(0.0, 40.0, beyond));
      g = vec2(mix(r, -9.0, smoothstep(0.0, 400.0, beyond)), 0.0);
    }
    return g;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (N.y < 0.0) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);
    vec2 g = groundAt(vWorld.xz);
    float depth = max(vBaseY - g.r, 0.0);

    vec3 c;
    if (uRiver > 0.5) {
      c = mix(uRiverCol, uMid, smoothstep(0.2, 1.4, depth));
      // Streaks of light drifting downstream.
      vec2 f = normalize(vFlow + 1e-4);
      vec2 side = vec2(-f.y, f.x);
      float along = dot(vWorld.xz, f);
      float across = dot(vWorld.xz, side);
      float streak = sin(along * 2.2 - uTime * 2.6 + sin(across * 1.7) * 2.0 + sin(along * 0.37) * 3.0);
      c += vec3(0.11, 0.13, 0.12) * smoothstep(0.82, 1.0, streak);
    } else {
      c = mix(uShallow, uMid, smoothstep(0.25, 2.2, depth));
      c = mix(c, uDeep, smoothstep(2.0, 7.5, depth));
    }

    // Soft light from the sun on the facets, then the sky reflected at grazing angles.
    float lit = 0.72 + 0.28 * max(dot(N, uSunDir), 0.0);
    c *= lit;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    c = mix(c, uSky, fres * 0.4);

    // Glints: a hard sparkle and a broad sheen.
    // Each little patch of water tilts a touch differently and changes now and then,
    // so the sun catches only some of them: a twinkle rather than a glare.
    vec2 rp = mat2(0.866, 0.5, -0.5, 0.866) * vWorld.xz * 2.2;
    vec2 cell = floor(rp);
    float tw = floor(uTime * 2.0 + hash(cell) * 9.0);
    vec3 jit = vec3(hash(cell + tw * 1.31) - 0.5, 0.0, hash(cell + 17.0 + tw * 0.77) - 0.5) * 0.3;
    float on = step(0.82, hash(cell * 1.7 + tw * 0.13));
    vec2 inCell = fract(rp) - 0.5;
    float dot_ = 1.0 - smoothstep(0.12, 0.42, length(inCell));
    vec3 Ns = normalize(N + jit);
    vec3 H = normalize(uSunDir + V);
    float nh = max(dot(Ns, H), 0.0);
    c += uSunColor * (pow(nh, 160.0) * 1.1 * on * dot_ + pow(max(dot(N, H), 0.0), 90.0) * 0.06);

    // Foam where the water meets the shore, breathing in and out.
    float breathe = 0.5 + 0.5 * sin(uTime * 1.1 + vWorld.x * 0.21 + vWorld.z * 0.17);
    float foamW = mix(0.1, 0.26, breathe) * (1.0 - uRiver * 0.7);
    float foam = 1.0 - smoothstep(foamW * 0.4, foamW, depth);
    // A second, broken line a little way out.
    float band = smoothstep(0.06, 0.0, abs(depth - (0.5 + 0.3 * breathe))) * (1.0 - uRiver);
    band *= step(0.6, hash(floor(vWorld.xz * 0.9)));
    // With the finish: the foam breaks into lace that drifts, thick at the water's edge and thinning out.
    float lace = vnoise(vWorld.xz * 2.3 + vec2(uTime * 0.15, -uTime * 0.1)) * 0.6 + vnoise(vWorld.xz * 6.1 - uTime * 0.2) * 0.4;
    foam *= mix(1.0, smoothstep(0.4, 0.8, lace + (1.0 - depth / max(foamW, 0.01)) * 0.22), uSoft);
    band *= mix(1.0, smoothstep(0.45, 0.7, lace), uSoft);
    c = mix(c, uFoam, clamp(foam * mix(0.85, 0.62, uSoft) + band * 0.22, 0.0, 1.0));

    float alpha = mix(0.62, 0.94, smoothstep(0.0, 2.5, depth));
    alpha = max(alpha, foam * mix(1.0, 0.85, uSoft));
    if (uRiver > 0.5) {
      // The stream draws its own edge, a smooth curve with a thin line of foam,
      // fading out over the shallow shelf before the bank breaks the surface.
      float rim = smoothstep(uEdgeFade.x - 0.16, uEdgeFade.x, vEdge);
      c = mix(c, uFoam, rim * mix(0.6, 0.35, uSoft));
      alpha = max(alpha, rim * 0.8);
      alpha *= 1.0 - smoothstep(uEdgeFade.x, uEdgeFade.y, vEdge);
      alpha *= vFade;
    } else {
      // Where the river runs out into the bay, the sea gives way to it.
      alpha *= 1.0 - g.g;
    }
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(c, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export interface Water {
  group: THREE.Group;
  update(time: number, windAngle: number, windStrength: number): void;
  setSun(dir: THREE.Vector3): void;
  /** Slice 33: the season's sea, `grey` (0 to 1) towards a cold winter grey, `blue` towards a deeper summer blue. */
  setLook(grey: number, blue: number): void;
}

/** Slice 33: a colour gone grey and dim (winter), or richer (summer). */
const GREY_HUE = new THREE.Color(0.9, 0.98, 0.96);
const BLUE_HUE = new THREE.Color(0.9, 1.0, 1.08);
function seaGrey(c: THREE.Color, out: THREE.Color): THREE.Color {
  const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  return out.setRGB(l + (c.r - l) * 0.18, l + (c.g - l) * 0.18, l + (c.b - l) * 0.18).multiply(GREY_HUE).multiplyScalar(0.86);
}
function seaBlue(c: THREE.Color, out: THREE.Color): THREE.Color {
  const l = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  return out.setRGB(l + (c.r - l) * 1.3, l + (c.g - l) * 1.3, l + (c.b - l) * 1.3).multiply(BLUE_HUE);
}

/** How strongly the river shows at each point, from the edge of the stream and its fade into the sea. */
function riverCover(map: CoastMap, x: number, z: number): number {
  const q = map.riverAt(x, z);
  if (q.t > 0.995) return 0;
  return (1 - smoothstep(RIVER_EDGE_FADE[0], RIVER_EDGE_FADE[1], q.d - q.width)) * Math.min(1, q.surface / 0.25);
}

/** The ground under the water, baked for the shader: r is the height, g how much the river covers it. */
function groundTexture(map: CoastMap): THREE.DataTexture {
  const n = map.fieldN * map.fieldN;
  const data = new Uint16Array(n * 2);
  for (let i = 0; i < n; i++) data[i * 2] = THREE.DataUtils.toHalfFloat(map.heights[i]);
  // The river's cover only matters where it meets the sea, near its mouth.
  const r = map.river;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let i = 0; i < r.xs.length; i++) {
    if (r.surface[i] > 0.4) continue;
    x0 = Math.min(x0, r.xs[i]);
    x1 = Math.max(x1, r.xs[i]);
    z0 = Math.min(z0, r.zs[i]);
    z1 = Math.max(z1, r.zs[i]);
  }
  const pad = 6;
  for (let z = Math.floor(z0) - pad; z <= Math.ceil(z1) + pad; z++) {
    for (let x = Math.floor(x0) - pad; x <= Math.ceil(x1) + pad; x++) {
      if (!map.inField(x, z)) continue;
      data[map.idx(x, z) * 2 + 1] = THREE.DataUtils.toHalfFloat(riverCover(map, x, z));
    }
  }
  const tex = new THREE.DataTexture(data, map.fieldN, map.fieldN, THREE.RGFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeMaterial(shared: Record<string, THREE.IUniform>, river: boolean): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uRiver: { value: river ? 1 : 0 }, uWaveAmp: { value: river ? 0.02 : 0.11 } }]),
    transparent: true,
    fog: true,
    // The horizon skirt's quads face either way; the underside is never seen anyway.
    side: THREE.DoubleSide,
    // The sea is drawn first and leaves the depth alone, so it can never hide
    // the river where the two meet; nothing else transparent comes after.
    depthWrite: river,
  });
  // Share the live uniforms (time, sun, colours) between both materials.
  Object.assign(m.uniforms, shared);
  return m;
}

/** Sea: a grid wherever the ground dips near sea level, plus a flat skirt to the horizon. */
function seaGeometry(map: CoastMap): THREE.BufferGeometry {
  const step = 2;
  const lo = FIELD_MIN;
  const hi = FIELD_MIN + map.fieldN - 1;
  const cells = Math.round((hi - lo) / step);
  const vid = new Int32Array((cells + 1) * (cells + 1)).fill(-1);
  const pos: number[] = [];
  const idx: number[] = [];
  const vert = (i: number, j: number): number => {
    const k = j * (cells + 1) + i;
    if (vid[k] < 0) {
      vid[k] = pos.length / 3;
      pos.push(lo + i * step, 0, lo + j * step);
    }
    return vid[k];
  };
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = lo + i * step;
      const z = lo + j * step;
      const m = Math.min(map.corner(x, z), map.corner(x + step, z), map.corner(x, z + step), map.corner(x + step, z + step), map.corner(x + 1, z + 1));
      if (m > 0.15) continue;
      // The river draws its own water; keep the sea out of its channel.
      const rq = map.riverAt(x + step / 2, z + step / 2);
      if (rq.d < rq.width + 1.5 && rq.surface > 0.3) continue;
      const a = vert(i, j);
      const b = vert(i + 1, j);
      const c = vert(i, j + 1);
      const d = vert(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
  }
  // Skirt: big flat quads carrying the sea out to the horizon on the sea side
  // only (south of the coast line where it leaves the field), so the land
  // beyond the map reads as more land rather than an island.
  const R = 6000;
  // Far enough north to fill the far coast's bays; the land hides the rest (slice 42: 80 north of the coast at the field's sides, 20 on the Bay).
  const zs = Math.floor((Math.min(shoreZ(map.data.shore, lo), shoreZ(map.data.shore, hi)) - 80) / step) * step;
  const quad = (x0: number, z0: number, x1: number, z1: number): void => {
    const b = pos.length / 3;
    pos.push(x0, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  };
  // Along the edge of the grid the skirt shares the grid's vertices, so the
  // two meet without a hairline crack.
  for (let z = zs; z < hi; z += step) {
    quad(-R, z, lo, z + step); // west
    quad(hi, z, R, z + step); // east
  }
  for (let x = lo; x < hi; x += step) quad(x, hi, x + step, R); // south
  quad(-R, hi, lo, R);
  quad(hi, hi, R, R);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(1), 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(-10), 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** River: quads over the stream at its stepped surface height, carrying the flow direction. */
function riverGeometry(map: CoastMap): THREE.BufferGeometry {
  const pos: number[] = [];
  const flow: number[] = [];
  const fade: number[] = [];
  const edge: number[] = [];
  const idx: number[] = [];
  const ids = new Map<number, number>();
  const vert = (x: number, z: number): number => {
    const k = z * 1000 + x;
    let v = ids.get(k);
    if (v === undefined) {
      const q = map.riverAt(x, z);
      v = pos.length / 3;
      pos.push(x, q.surface + 0.015, z);
      flow.push(q.dirX, q.dirZ);
      // Melt into the sea where the river reaches sea level.
      fade.push(Math.min(1, q.surface / 0.25));
      // Distance past the stream's edge; the shader fades the water out over the shelf.
      edge.push(q.d - q.width);
      ids.set(k, v);
    }
    return v;
  };
  for (let z = 0; z < map.size; z++) {
    for (let x = 0; x < map.size; x++) {
      const q = map.riverAt(x + 0.5, z + 0.5);
      // Cover every cell the faded edge can reach (half a cell's diagonal past it).
      if (q.d > q.width + RIVER_EDGE_FADE[1] + 0.75 || q.t > 0.995) continue;
      const a = vert(x, z);
      const b = vert(x + 1, z);
      const c = vert(x, z + 1);
      const d = vert(x + 1, z + 1);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildWater(map: CoastMap): Water {
  const shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector2(1, 0) },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: col(PAL.sun).clone() },
    uShallow: { value: col(PAL.shallow).clone() },
    uMid: { value: col(PAL.mid).clone() },
    uDeep: { value: col(PAL.deep).clone() },
    uRiverCol: { value: col(PAL.river).clone() },
    uFoam: { value: col(PAL.foam).clone() },
    uSky: { value: col(PAL.skyReflect).clone() },
    uGround: { value: groundTexture(map) },
    uFieldMin: { value: new THREE.Vector2(FIELD_MIN, FIELD_MIN) },
    uFieldSize: { value: map.fieldN },
    uMapHalf: { value: map.size / 2 },
    uEdgeFade: { value: new THREE.Vector2(...RIVER_EDGE_FADE) },
    uSoft: { value: finishOn() ? 1 : 0 },
  };
  // Slice 33: the colours the season moves, as they were built.
  const looks: [string, THREE.Color][] = ['uShallow', 'uMid', 'uDeep', 'uSky', 'uRiverCol'].map((n) => [n, (shared[n].value as THREE.Color).clone()]);
  const tmp = new THREE.Color();
  let lookKey = '0.000 0.000';
  const group = new THREE.Group();
  group.name = 'water';
  const sea = new THREE.Mesh(seaGeometry(map), makeMaterial(shared, false));
  sea.name = 'sea';
  sea.renderOrder = 1;
  const river = new THREE.Mesh(riverGeometry(map), makeMaterial(shared, true));
  river.name = 'river';
  river.renderOrder = 2;
  group.add(sea, river);
  return {
    group,
    update(time, angle, strength) {
      shared.uTime.value = time;
      (shared.uWind.value as THREE.Vector2).set(Math.cos(angle), Math.sin(angle)).multiplyScalar(strength);
    },
    setSun(dir) {
      (shared.uSunDir.value as THREE.Vector3).copy(dir).normalize();
    },
    setLook(grey, blue) {
      const key = `${grey.toFixed(3)} ${blue.toFixed(3)}`;
      if (key === lookKey) return;
      lookKey = key;
      for (const [name, base] of looks) {
        const v = shared[name].value as THREE.Color;
        v.copy(base);
        if (blue > 0) v.lerp(seaBlue(base, tmp), Math.max(0, Math.min(1, blue)));
        if (grey > 0) v.lerp(seaGrey(base, tmp), Math.max(0, Math.min(1, grey)));
      }
    },
  };
}
