import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PAL } from './palette';

/**
 * Exploration only (the city-look mock-ups): alternative looks for the city,
 * switched on by `window.__look` before the game boots. Nothing here is wired
 * into the game unless that is set.
 *
 *  a  Sunlit terracotta: smooth painted ground, tiled roofs, plaster grain, AO, warm grade.
 *  b  Painted fresco: (a) plus a brushed, inked, paper-grain finish.
 *  c  Light and colour only: today's facets, regraded palette and light, AO.
 */
export type LookName = 'base' | 'a' | 'b' | 'c';

interface LookDef {
  palette: Partial<Record<keyof typeof PAL, string>>;
  smoothGround: boolean;
  detail: boolean;
  ao: number;
  hemi: number;
  sun: number;
  grade: { sat: number; contrast: number; shadow: [number, number, number]; high: [number, number, number]; vignette: number; grain: number };
  bloom: number;
  painterly: boolean;
}

const WARM_PALETTE: LookDef['palette'] = {
  lush: '#68803f',
  lushDeep: '#55733a',
  meadow: '#8e9a52',
  dryGrass: '#bba765',
  sand: '#e7cf9b',
  wetSand: '#c8a872',
  seabed: '#d2bb86',
  seabedDeep: '#4f7a7a',
  rockWarm: '#c2a37c',
  rockGrey: '#a39886',
  roofTile: '#b8573a',
  roofTileDark: '#93422b',
  whitewash: '#eee4d0',
  whitewashShade: '#d8c8ac',
  villaWall: '#efdcbc',
  road: '#d9c49b',
  roadEdge: '#a98d66',
  earth: '#bc9f72',
  earthWorn: '#9f8158',
  plotLine: '#cfbf93',
  shallow: '#2f8f96',
  foam: '#f1e9d8',
  mid: '#16608a',
  deep: '#0c2f58',
  river: '#3696a6',
  oliveLeaf: '#8d9a66',
  oliveLeafDark: '#76845a',
  scrub: '#83904c',
  scrubDark: '#6d7a40',
  pine: '#3d6833',
  pineDark: '#30562b',
  cypress: '#2c4e2e',
  broom: '#d9b43a',
  shutter: '#35628f',
  bandBlue: '#2f5a9a',
  awning: '#b84a33',
  skyZenith: '#3c82c4',
  skyReflect: '#7fa6c0',
  skyHorizon: '#eedcb6',
  sun: '#ffeacc',
  hemiSky: '#c6dbef',
  hemiGround: '#b08f62',
};

const LOOKS: Record<Exclude<LookName, 'base'>, LookDef> = {
  a: {
    palette: WARM_PALETTE,
    smoothGround: true,
    detail: true,
    ao: 1,
    hemi: 0.85,
    sun: 3.3,
    grade: { sat: 0.97, contrast: 1.07, shadow: [0.92, 0.95, 1.07], high: [1.05, 1.0, 0.92], vignette: 0.24, grain: 0.018 },
    bloom: 0.12,
    painterly: false,
  },
  b: {
    palette: {
      ...WARM_PALETTE,
      roofTile: '#b25e3d',
      shallow: '#58a8a2',
      mid: '#2e7c95',
      deep: '#1d4a72',
    },
    smoothGround: true,
    detail: true,
    ao: 0.8,
    hemi: 1.0,
    sun: 3.0,
    grade: { sat: 0.9, contrast: 1.02, shadow: [0.95, 0.93, 1.0], high: [1.05, 1.01, 0.92], vignette: 0.3, grain: 0 },
    bloom: 0,
    painterly: true,
  },
  c: {
    palette: WARM_PALETTE,
    smoothGround: false,
    detail: false,
    ao: 1,
    hemi: 0.85,
    sun: 3.3,
    grade: { sat: 1.04, contrast: 1.06, shadow: [0.93, 0.95, 1.06], high: [1.04, 1.0, 0.93], vignette: 0.22, grain: 0.012 },
    bloom: 0.1,
    painterly: false,
  },
};

export function currentLook(): LookName {
  const l = (globalThis as { __look?: string }).__look;
  return l === 'a' || l === 'b' || l === 'c' ? l : 'base';
}

function def(): LookDef | null {
  const l = currentLook();
  return l === 'base' ? null : LOOKS[l];
}

/** Swap palette entries before anything is built. */
export function applyLookPalette(): void {
  const d = def();
  if (!d) return;
  const pal = PAL as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(d.palette)) pal[k] = v as string;
}

/** Average colours and normals over shared corners, so the ground shades smoothly instead of in facets. */
const smoothed = new WeakSet<THREE.BufferGeometry>();
export function smoothByPosition(g: THREE.BufferGeometry): void {
  if (smoothed.has(g)) return;
  smoothed.add(g);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = g.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const key = (i: number): string => `${Math.round(pos.getX(i) * 100)},${Math.round(pos.getZ(i) * 100)}`;
  const acc = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let a = acc.get(k);
    if (!a) acc.set(k, (a = [0, 0, 0, 0, 0, 0, 0]));
    a[0] += nrm.getX(i);
    a[1] += nrm.getY(i);
    a[2] += nrm.getZ(i);
    if (colAttr) {
      a[3] += colAttr.getX(i);
      a[4] += colAttr.getY(i);
      a[5] += colAttr.getZ(i);
    }
    a[6]++;
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const a = acc.get(key(i))!;
    v.set(a[0], a[1], a[2]).normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
    if (colAttr) colAttr.setXYZ(i, a[3] / a[6], a[4] / a[6], a[5] / a[6]);
  }
  nrm.needsUpdate = true;
  if (colAttr) colAttr.needsUpdate = true;
}

const NOISE = /* glsl */ `
  float lkHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float lkNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(lkHash(i), lkHash(i + vec2(1.0, 0.0)), u.x), mix(lkHash(i + vec2(0.0, 1.0)), lkHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float lkNoise3(vec3 p) { return (lkNoise(p.xy) + lkNoise(p.yz + 17.3) + lkNoise(p.zx + 41.9)) / 3.0; }
  float lkFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * lkNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
  // Running-bond flagstones: (distance to the nearest joint, a per-stone random).
  vec2 lkFlags(vec2 p) {
    float row = floor(p.y);
    p.x += lkHash(vec2(row, 3.1)) * 0.9;
    float w = 1.0 + 0.6 * lkHash(vec2(floor(p.x * 0.5), row));
    vec2 q = vec2(p.x / w, p.y);
    vec2 f = fract(q);
    float dj = min(min(f.x, 1.0 - f.x) * w, min(f.y, 1.0 - f.y));
    return vec2(dj, lkHash(floor(q) + vec2(row * 1.7, 0.0)));
  }
  // Distance to the nearest cell edge of a jittered grid (cobbles, stones).
  vec2 lkCells(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0; float id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(lkHash(i + g), lkHash(i + g + 31.7)) * 0.8 + 0.1;
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = lkHash(i + g + 7.3); } else if (d < d2) d2 = d;
    }
    return vec2(d2 - d1, id);
  }
`;

/** Ground: grass in clumps with gaps between, dry gold drifts, bare soil and stones showing through, rippled sand, strata on rock. */
const GROUND = /* glsl */ `
  {
    vec3 c = diffuseColor.rgb;
    vec2 p = vLkWorld.xz;
    float big = lkFbm(p * 0.12);
    float patchy = lkFbm(p * 0.45 + 3.3);
    float grain = lkNoise(p * 13.0);
    float greenness = clamp((c.g - max(c.r * 0.82, c.b * 1.6)) * 9.0, 0.0, 1.0);
    // How small a clump is on screen: fade the fine pattern out to its average far away.
    float fwC = fwidth(p.x * 5.0);
    float nearC = 1.0 - smoothstep(0.35, 1.0, fwC);
    float nearB = 1.0 - smoothstep(0.35, 1.0, fwidth(p.x * 38.0));
    // Tufts: soft dark hollows between, scattered rather than in a net.
    float tuftA = lkNoise(p * 7.0 + 3.1);
    float tuftB = lkNoise(p * 15.0 - 7.7);
    float clump = smoothstep(0.25, 0.65, tuftA * 0.6 + tuftB * 0.4);
    float blade = lkNoise(vec2(p.x * 38.0, p.y * 38.0)) * 0.6 + lkNoise(p * 61.0) * 0.4;

    vec3 grass = c;
    grass *= mix(vec3(0.94, 1.03, 0.9), vec3(1.14, 1.0, 0.7), smoothstep(0.42, 0.68, big));
    grass = mix(grass, grass * vec3(0.84, 0.96, 0.78), smoothstep(0.55, 0.75, patchy) * 0.55);
    grass *= mix(0.9, mix(0.74, 1.06, clump), nearC);
    grass = mix(grass, grass * vec3(1.08, 1.04, 0.86), (1.0 - clump) * 0.0 + smoothstep(0.6, 0.9, tuftB) * 0.3 * nearC);
    grass *= mix(1.0, 0.84 + 0.3 * blade, nearB);
    // Bare, trodden soil and a few stones where the grass gives out.
    float bare = smoothstep(0.6, 0.7, lkFbm(p * 0.6 + 11.0)) * mix(0.75, 1.0 - clump * 0.7, nearC);
    vec3 soil = c * vec3(1.05, 0.72, 0.5) * (0.8 + 0.4 * lkNoise(p * 9.0));
    vec2 st = lkCells(p * 7.0 + 40.0);
    float stone = step(0.93, st.y) * smoothstep(0.1, 0.3, st.x) * nearC;
    soil = mix(soil, soil * 1.25, stone * 0.6);
    grass = mix(grass, soil, bare * 0.85);

    vec3 bareGround = c * (0.86 + 0.24 * lkFbm(p * 3.1)) * (0.94 + 0.12 * grain);
    float steep = 1.0 - clamp(lkWorldN.y, 0.0, 1.0);
    float sandy = clamp((c.r - c.b * 1.6) * 3.0, 0.0, 1.0) * (1.0 - greenness) * (1.0 - smoothstep(0.2, 0.4, steep));
    // Wind ripples on the sand.
    float rip = sin(dot(p, vec2(0.8, 0.6)) * 9.0 + lkNoise(p * 1.3) * 6.0);
    bareGround *= mix(1.0, 0.95 + 0.06 * rip, sandy * nearC);
    // Bedding in the rock.
    bareGround *= 0.9 + 0.2 * lkNoise(vec2(dot(p, vec2(0.7, 0.7)) * 1.5, vLkWorld.y * 7.0)) * smoothstep(0.15, 0.4, steep);
    c = mix(bareGround, grass, greenness);
    diffuseColor.rgb = c;
    lkH = mix(0.004 * rip * sandy * nearC, (0.025 * clump + 0.006 * blade * nearB) * nearC * (1.0 - bare * 0.7), greenness);
  }
`;

/** Buildings, trees and the rest: tiled roofs, plaster walls with grime at the foot, leafy crowns. */
const OBJECTS = /* glsl */ `
  {
    vec3 c = diffuseColor.rgb;
    vec3 wp = vLkWorld;
    vec3 n = lkWorldN;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float hi = max(c.r, max(c.g, c.b));
    float lo = min(c.r, min(c.g, c.b));
    bool terracotta = c.r > c.g * 2.4 && c.r > c.b * 4.0 && c.r > 0.2;
    bool green = c.g > c.r * 1.05 && c.g > c.b * 1.5 && lum < 0.45;
    bool pale = lum > 0.5 && (hi - lo) < 0.35 * hi;
    vec3 tri = abs(n);
    vec2 wallUv = tri.x > tri.z ? vec2(wp.z, wp.y) : vec2(wp.x, wp.y);
    float above = wp.y - lkGround(wp.xz);
    if (terracotta && n.y > 0.25 && n.y < 0.985) {
      vec2 down = normalize(n.xz + 1e-5);
      vec2 eave = vec2(-down.y, down.x);
      float u = dot(wp.xz, eave) * 9.0;
      float v = dot(wp.xz, down) * 6.5 + 0.5 * step(0.5, fract(u * 0.5));
      float fw = max(fwidth(u), fwidth(v));
      float far = smoothstep(0.35, 0.9, fw);
      float ch = 0.5 + 0.5 * sin(u * 6.2831853);
      float row = smoothstep(0.0, 0.25, fract(v));
      float tile = mix(0.72, 1.08, pow(ch, 0.7)) * mix(0.72, 1.0, row) * (0.88 + 0.24 * lkHash(floor(vec2(u, v))));
      float weather = 0.88 + 0.24 * lkFbm(wp.xz * 1.3);
      c *= mix(tile, 0.9, far) * weather;
      // Lichen and soot creep in from the eaves.
      c = mix(c, c * vec3(0.8, 0.86, 0.7), smoothstep(0.55, 0.8, lkFbm(wp.xz * 2.7 + 9.0)) * 0.5);
      lkH = (0.018 * pow(ch, 0.7) + 0.012 * row) * (1.0 - far);
    } else if (terracotta && n.y >= 0.985) {
      c *= 0.88 + 0.22 * lkFbm(wp.xz * 6.0);
    } else if (green) {
      float leaf = clamp((lkNoise3(wp * 14.0) - 0.5) * 2.2 + 0.5, 0.0, 1.0) * 0.5 + clamp((lkNoise3(wp * 37.0 + 3.0) - 0.5) * 2.2 + 0.5, 0.0, 1.0) * 0.5;
      float gap = smoothstep(0.4, 0.3, lkNoise3(wp * 21.0 + 5.0));
      c *= (0.72 + 0.5 * leaf) * (1.0 - 0.45 * gap);
      c = mix(c, c * vec3(1.15, 1.08, 0.8), clamp(n.y, 0.0, 1.0) * 0.35);
      #ifdef FLAT_SHADED
      lkBend = 0.75;
      #else
      lkBend = 0.12;
      #endif
      lkH = 0.03 * leaf - 0.02 * gap;
    } else if (pale && abs(n.y) < 0.4) {
      float plaster = lkFbm(wallUv * 7.0);
      float stain = lkFbm(wallUv * vec2(1.2, 0.5) + 3.7);
      c *= (0.93 + 0.1 * plaster) * mix(vec3(1.0), vec3(0.93, 0.89, 0.82), smoothstep(0.45, 0.75, stain));
      // Splash and dust at the foot of the wall.
      c *= mix(vec3(0.74, 0.68, 0.6), vec3(1.0), smoothstep(0.02, 0.45 + 0.2 * stain, above));
      lkH = 0.005 * plaster;
    } else if (pale) {
      // Paving, steps and marble tops: big slabs.
      vec2 cell = lkFlags(wp.xz * vec2(2.2, 2.2));
      float far = smoothstep(0.2, 0.6, fwidth(wp.x * 2.2));
      float joint = smoothstep(0.015, 0.06, cell.x);
      c *= mix((0.92 + 0.1 * cell.y) * mix(0.84, 1.0, joint) * (0.95 + 0.08 * lkFbm(wp.xz * 4.0)), 0.97, far);
      lkH = 0.01 * joint * (1.0 - far);
    } else {
      float k = lkFbm((tri.y > 0.5 ? wp.xz : wallUv) * 5.0);
      c *= 0.9 + 0.16 * k;
      c *= mix(vec3(0.8, 0.75, 0.68), vec3(1.0), smoothstep(0.0, 0.3, above));
      lkH = 0.006 * k;
    }
    diffuseColor.rgb = c;
  }
`;

/** Streets: laid stones on the roads, trodden earth with pebbles elsewhere. */
const PAVING = /* glsl */ `
  {
    vec3 c = diffuseColor.rgb;
    vec2 p = vLkWorld.xz;
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float far = smoothstep(0.25, 0.8, fwidth(p.x * 3.0));
    if (lum > 0.5) {
      vec2 cell = lkFlags(p * vec2(3.0, 4.0));
      float joint = smoothstep(0.02, 0.09, cell.x);
      float stone = (0.84 + 0.26 * cell.y) * mix(0.7, 1.0, joint) * (0.94 + 0.12 * lkNoise(p * 14.0));
      c *= mix(stone, 0.92, far) * (0.9 + 0.16 * lkFbm(p * 0.9));
      // Worn paler down the middle of the way, dustier at the edges.
      lkH = 0.016 * joint * (1.0 - far);
    } else {
      float k = lkFbm(p * 3.5);
      c *= (0.84 + 0.26 * k) * (0.95 + 0.1 * lkNoise(p * 19.0));
      lkH = 0.02 * k * (1.0 - far);
    }
    diffuseColor.rgb = c;
  }
`;

/** Bump the shading normal by a height worked out in the fragment (no tangents needed), and bend leaves towards the sky. */
const APPLY = /* glsl */ `
  {
    vec3 sp = -vViewPosition;
    vec3 sx = dFdx(sp), sy = dFdy(sp);
    vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
    float det = dot(sx, r1);
    vec2 dh = vec2(dFdx(lkH), dFdy(lkH));
    vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
    normal = normalize(abs(det) * normal - grad);
    vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
    normal = normalize(mix(normal, up, lkBend));
  }
`;

let groundTex: THREE.DataTexture | null = null;
let groundSize = 128;

const patched = new WeakSet<THREE.Material>();

function patch(mat: THREE.MeshStandardMaterial, body: string, name: string): void {
  if (patched.has(mat)) return;
  patched.add(mat);
  const baseKey = mat.customProgramCacheKey();
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLkWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 lkp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
          lkp = instanceMatrix * lkp;
          #endif
          vLkWorld = (modelMatrix * lkp).xyz;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLkWorld;\nuniform sampler2D lkGroundTex;\nuniform float lkGroundSize;\n${NOISE}\nfloat lkGround(vec2 p) { return texture2D(lkGroundTex, (p + 0.5) / (lkGroundSize + 1.0)).r; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\nvec3 lkWorldN = normalize((vec4(normal, 0.0) * viewMatrix).xyz);\nfloat lkH = 0.0;\nfloat lkBend = 0.0;\n${body}\n${APPLY}`);
    shader.uniforms.lkGroundTex = { value: groundTex };
    shader.uniforms.lkGroundSize = { value: groundSize };
  };
  mat.customProgramCacheKey = () => `${baseKey}-look-${name}`;
  mat.needsUpdate = true;
}

/** Patch the scene's materials (call again as things are added; it is idempotent). */
export function patchScene(scene: THREE.Scene, map: { size: number; corner(x: number, z: number): number }): void {
  const d = def();
  if (!d) return;
  if (!groundTex) {
    const n = map.size + 1;
    const data = new Uint16Array(n * n);
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) data[z * n + x] = THREE.DataUtils.toHalfFloat(map.corner(x, z));
    groundTex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.HalfFloatType);
    groundTex.magFilter = THREE.LinearFilter;
    groundTex.minFilter = THREE.LinearFilter;
    groundTex.needsUpdate = true;
    groundSize = map.size;
  }
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) return;
    let inTerrain = false;
    let inStreets = false;
    let inPlants = false;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      if (p.name === 'terrain') inTerrain = true;
      if (p.name === 'streets') inStreets = true;
      if (p.name === 'trees') inPlants = true;
    }
    // The fuller plants (lookTrees.ts) carry crown normals: shade them smooth.
    if (inPlants && d.detail && mat.flatShading) {
      mat.flatShading = false;
      mat.needsUpdate = true;
    }
    if (inTerrain) {
      if (d.smoothGround) {
        smoothByPosition(m.geometry);
        mat.flatShading = false;
      }
      if (d.detail) patch(mat, GROUND, 'ground');
    } else if (inStreets) {
      if (d.smoothGround) {
        smoothByPosition(m.geometry);
        mat.flatShading = false;
      }
      if (d.detail) patch(mat, PAVING, 'paving');
    } else if (d.detail && mat.vertexColors) {
      patch(mat, OBJECTS, 'objects');
    } else if (d.detail && !mat.vertexColors) {
      // Instanced walkers and the like: leave them crisp.
    }
  });
  // The street chunks are rebuilt as roads change: smooth the new ones too.
  const streets = scene.getObjectByName('streets');
  if (streets && d.smoothGround && !(streets.userData.lkHooked as boolean)) {
    streets.userData.lkHooked = true;
    streets.addEventListener('childadded', (e) => {
      const c = (e as unknown as { child: THREE.Mesh }).child;
      if (c.geometry) smoothByPosition(c.geometry);
    });
    streets.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) smoothByPosition(m.geometry);
    });
  }
}

/** The light: a lower sky fill and a stronger, warmer sun, so form and shadow read. */
export function applyLookLight(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const d = def();
  if (!d) return;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.traverse((o) => {
    const h = o as THREE.HemisphereLight;
    if (h.isHemisphereLight) h.intensity = d.hemi;
    const s = o as THREE.DirectionalLight;
    if (s.isDirectionalLight) s.intensity = d.sun;
  });
}

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1 },
    uContrast: { value: 1 },
    uShadow: { value: new THREE.Vector3(1, 1, 1) },
    uHigh: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0 },
    uGrain: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uSat, uContrast, uVignette, uGrain; uniform vec3 uShadow, uHigh; uniform vec2 uRes;
    varying vec2 vUv;
    float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c *= mix(uShadow, vec3(1.0), smoothstep(0.0, 0.55, l));
      c *= mix(vec3(1.0), uHigh, smoothstep(0.45, 1.0, l));
      vec2 q = (vUv - 0.5) * vec2(1.0, 0.85);
      c *= 1.0 - uVignette * smoothstep(0.25, 0.85, length(q) * 1.25);
      c += (h(vUv * uRes) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

/** Generalised Kuwahara (four quadrants): flattens texture into brush-like patches, keeping edges. */
const BRUSH = {
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: GRADE.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; varying vec2 vUv;
    void main() {
      vec2 px = 1.0 / uRes;
      const int R = 3;
      vec3 m[4]; vec3 s[4];
      for (int k = 0; k < 4; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); }
      for (int j = -R; j <= R; j++) for (int i = -R; i <= R; i++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * px).rgb;
        vec3 cc = c * c;
        if (i <= 0 && j <= 0) { m[0] += c; s[0] += cc; }
        if (i >= 0 && j <= 0) { m[1] += c; s[1] += cc; }
        if (i <= 0 && j >= 0) { m[2] += c; s[2] += cc; }
        if (i >= 0 && j >= 0) { m[3] += c; s[3] += cc; }
      }
      float n = float((R + 1) * (R + 1));
      float best = 1e9; vec3 outc = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 mu = m[k] / n;
        vec3 v = abs(s[k] / n - mu * mu);
        float sig = v.r + v.g + v.b;
        if (sig < best) { best = sig; outc = mu; }
      }
      gl_FragColor = vec4(outc, 1.0);
    }
  `,
};

/** Ink lines where depth or facing jumps, laid over a paper grain. */
const INK = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tNormal: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 9000 },
  },
  vertexShader: GRADE.vertexShader,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tDepth, tNormal; uniform vec2 uRes; uniform float cameraNear, cameraFar;
    varying vec2 vUv;
    float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    vec3 nm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float nz(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
    void main() {
      vec2 px = 1.0 / uRes;
      float z = vz(vUv);
      float zs = 0.0; float ns = 0.0;
      vec3 n0 = nm(vUv);
      for (int k = 0; k < 4; k++) {
        vec2 o = k == 0 ? vec2(px.x, 0.0) : k == 1 ? vec2(-px.x, 0.0) : k == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
        zs += max(vz(vUv + o) - z, 0.0);
        ns += 1.0 - dot(n0, nm(vUv + o));
      }
      float edge = smoothstep(0.012, 0.04, zs / z) + smoothstep(0.25, 0.7, ns);
      edge = clamp(edge, 0.0, 1.0) * (1.0 - smoothstep(60.0, 160.0, z));
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = mix(c, c * vec3(0.42, 0.32, 0.26), edge * 0.75);
      float paper = nz(vUv * uRes / 3.0) * 0.5 + nz(vUv * uRes / 11.0) * 0.5;
      float fibre = nz(vec2(vUv.x * uRes.x / 1.5, vUv.y * uRes.y / 40.0));
      c *= 0.94 + 0.08 * paper + 0.03 * fibre;
      c = mix(c, c * vec3(1.03, 0.99, 0.9), 0.5);
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export interface LookPost {
  render(): void;
}

/** The look's post-processing chain, or null for today's look. */
export function makeLookPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): LookPost | null {
  const d = def();
  if (!d) return null;
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y);
  ao.blendIntensity = d.ao;
  // Most of the city has no normals of its own (flat shading works them out from the faces): do the same in the AO's normal pass.
  ao.normalMaterial.flatShading = true;
  ao.normalMaterial.side = THREE.DoubleSide;
  ao.normalMaterial.needsUpdate = true;
  ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 16 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  composer.addPass(ao);
  if (d.bloom > 0) composer.addPass(new UnrealBloomPass(size, d.bloom, 0.5, 0.92));
  composer.addPass(new OutputPass());
  const extra: ShaderPass[] = [];
  if (d.painterly) {
    const brush = new ShaderPass(BRUSH);
    composer.addPass(brush);
    extra.push(brush);
    const ink = new ShaderPass(INK);
    ink.uniforms.tDepth.value = ao.depthTexture;
    ink.uniforms.tNormal.value = ao.normalTexture;
    composer.addPass(ink);
    extra.push(ink);
  }
  const grade = new ShaderPass(GRADE);
  const g = d.grade;
  grade.uniforms.uSat.value = g.sat;
  grade.uniforms.uContrast.value = g.contrast;
  grade.uniforms.uShadow.value.set(...g.shadow);
  grade.uniforms.uHigh.value.set(...g.high);
  grade.uniforms.uVignette.value = g.vignette;
  grade.uniforms.uGrain.value = g.grain;
  composer.addPass(grade);
  extra.push(grade);
  const last = new THREE.Vector2();
  return {
    render() {
      renderer.getDrawingBufferSize(size);
      if (!size.equals(last)) {
        last.copy(size);
        composer.setSize(size.x, size.y);
        for (const p of extra) p.uniforms.uRes?.value.copy(size);
      }
      for (const p of extra) {
        if (p.uniforms.cameraNear) {
          p.uniforms.cameraNear.value = camera.near;
          p.uniforms.cameraFar.value = camera.far;
        }
      }
      composer.render();
    },
  };
}
