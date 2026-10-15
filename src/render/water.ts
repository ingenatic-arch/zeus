import * as THREE from 'three';
import { FIELD_MIN, FIELD_N, type CoastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
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
  attribute vec2 aFlow;
  attribute float aFade;
  varying float vFade;
  varying vec3 vWorld;
  varying float vBaseY;
  varying vec2 vFlow;

  float ground(vec2 p) {
    vec2 uv = (p - uFieldMin + 0.5) / uFieldSize;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -9.0;
    return texture2D(uGround, uv).r;
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
    float depth = wp.y - ground(wp.xz);
    float edge = 1.0 - smoothstep(110.0, 128.0, max(abs(wp.x - 64.0), abs(wp.z - 64.0)) - 64.0);
    float amp = uWaveAmp * smoothstep(0.0, 1.6, depth) * mix(1.0, edge, 1.0 - uRiver);
    wp.y += waves(wp.xz, uTime) * amp * (0.6 + 0.6 * length(uWind));
    vWorld = wp.xyz;
    vFlow = aFlow;
    vFade = aFade;
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

  float ground(vec2 p) {
    vec2 uv = (p - uFieldMin + 0.5) / uFieldSize;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -9.0;
    return texture2D(uGround, uv).r;
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (N.y < 0.0) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);
    float depth = max(vBaseY - ground(vWorld.xz), 0.0);

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
    c = mix(c, uFoam, clamp(foam * 0.85 + band * 0.22, 0.0, 1.0));

    float alpha = mix(0.62, 0.94, smoothstep(0.0, 2.5, depth));
    alpha = max(alpha, foam);
    alpha *= vFade;
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
}

function groundTexture(map: CoastMap): THREE.DataTexture {
  const data = new Uint16Array(FIELD_N * FIELD_N);
  for (let i = 0; i < data.length; i++) data[i] = THREE.DataUtils.toHalfFloat(map.heights[i]);
  const tex = new THREE.DataTexture(data, FIELD_N, FIELD_N, THREE.RedFormat, THREE.HalfFloatType);
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
    depthWrite: true,
  });
  // Share the live uniforms (time, sun, colours) between both materials.
  Object.assign(m.uniforms, shared);
  if (river) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -2;
  }
  return m;
}

/** Sea: a grid wherever the ground dips near sea level, plus a flat skirt to the horizon. */
function seaGeometry(map: CoastMap): THREE.BufferGeometry {
  const step = 2;
  const lo = FIELD_MIN;
  const hi = FIELD_MIN + FIELD_N - 1;
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
  const zs = 96;
  const quad = (x0: number, z0: number, x1: number, z1: number): void => {
    const b = pos.length / 3;
    pos.push(x0, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  };
  quad(-R, zs, lo, R); // west
  quad(hi, zs, R, R); // east
  quad(lo, hi, hi, R); // south
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(1), 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** River: quads over the stream at its stepped surface height, carrying the flow direction. */
function riverGeometry(map: CoastMap): THREE.BufferGeometry {
  const pos: number[] = [];
  const flow: number[] = [];
  const fade: number[] = [];
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
      ids.set(k, v);
    }
    return v;
  };
  for (let z = 0; z < MAP_SIZE; z++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const q = map.riverAt(x + 0.5, z + 0.5);
      if (q.d > q.width + 1.3 || q.t > 0.995) continue;
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
    uFieldSize: { value: FIELD_N },
  };
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
  };
}
