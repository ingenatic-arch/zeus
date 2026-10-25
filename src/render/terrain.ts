import * as THREE from 'three';
import { FAR_STEP, FIELD_MIN, OUTER_STEP, RIVER_SHELF, shoreZ, splitsMainDiagonal, type CoastMap } from '../map/bake';
import { clamp, fbm, hash2, lerp, ridged, smoothstep, valueNoise } from '../map/noise';
import { col, PAL } from './palette';
// Slice 46: marsh.
import { marshColour } from './landlook';

const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

/** The colour of one terrain facet, from what the ground is like there. */
function groundColour(map: CoastMap, x: number, z: number, h: number, ny: number, out: THREE.Color): THREE.Color {
  const d = map.sample(map.shore, x, z);
  const fert = map.sample(map.fertility, x, z);
  const rock = map.sample(map.rock, x, z);
  const n1 = valueNoise(x * 0.11, z * 0.11, 901);
  const n2 = valueNoise(x * 0.31, z * 0.31, 902);
  const steep = 1 - ny;
  const q = map.riverAt(x, z);
  const inRiver = q.d < q.width + 0.1 && q.surface > 0.02;
  // The pebbly shelf beside the stream, out to where the bank rises from the water.
  const bankAmt = q.surface > 0.05 && h < q.surface + 0.25 ? 1 - smoothstep(q.width + RIVER_SHELF - 0.1, q.width + RIVER_SHELF + 0.6, q.d) : 0;
  const onBank = bankAmt > 0.5;

  if (inRiver) {
    out.copy(col(PAL.riverBed));
  } else if (onBank) {
    // A pebbly margin where the water's edge meets the grass.
    out.copy(col(PAL.riverBank)).lerp(col(PAL.wetSand), hash2(Math.floor(x * 3.1), Math.floor(z * 2.9), 78) * 0.5);
    // Soften the margin into the grass so the facets don't form a row of teeth.
    out.lerp(col(PAL.lush), smoothstep(0.85, 0.5, bankAmt) * 0.55);
  } else if (h < -0.04) {
    out.copy(col(PAL.seabed)).lerp(col(PAL.seabedDeep), smoothstep(0.4, 5, -h));
  } else {
    // Grass: dry and golden on the slopes, greener in hollows, lush near the river.
    out.copy(col(PAL.dryGrass)).lerp(col(PAL.meadow), smoothstep(0.3, 0.75, n1));
    out.lerp(col(PAL.meadow), smoothstep(0.1, 0.3, fert) * 0.7);
    out.lerp(col(PAL.lush), smoothstep(0.3, 0.8, fert));
    if (fert > 0.6) out.lerp(col(PAL.lushDeep), smoothstep(0.6, 1, fert) * n2);
    // Sandy beach where the land meets the sea.
    const beachW = 2.0 + 1.6 * n2;
    const beach = (1 - smoothstep(beachW - 0.6, beachW + 0.6, d)) * (1 - smoothstep(0.9, 1.6, h));
    if (beach > 0) {
      tmp.copy(col(PAL.sand)).lerp(col(PAL.wetSand), 1 - smoothstep(0.0, 0.25, h));
      out.lerp(tmp, beach);
    }
    // Rock on crags and steep ground.
    // Grassy ledges break up the crags where the ground levels out.
    const ledge = smoothstep(0.55, 0.8, valueNoise(x * 0.17, z * 0.17, 903)) * (1 - smoothstep(0.2, 0.4, steep));
    const rockAmt = Math.max(rock * smoothstep(0.25, 0.55, n2 * 0.6 + rock * 0.6) * (1 - ledge), smoothstep(0.32, 0.55, steep));
    if (rockAmt > 0) {
      tmp2.copy(col(PAL.rockWarm)).lerp(col(PAL.rockGrey), smoothstep(0.25, 0.75, n1));
      tmp2.lerp(col(PAL.cliff), smoothstep(0.6, 0.9, n2) * 0.35);
      tmp2.lerp(col(PAL.rockDark), smoothstep(0.55, 0.85, steep) * 0.6);
      if (d < 5 && h < 6) tmp2.lerp(col(PAL.cliff), 0.6 * (1 - smoothstep(2, 5, d)));
      out.lerp(tmp2, Math.min(1, rockAmt));
    }
  }
  // Slice 46: marsh, dark and wet, wherever the land has it (pools take the sea bed's colour above).
  if (map.marsh && h > -0.04) {
    const m = map.sample(map.marsh, x, z);
    if (m > 0.02) out.lerp(col(marshColour(PAL)), Math.min(1, m * 0.9) * (1 - smoothstep(0.25, 0.7, h)));
  }
  // A little per-facet variation for the hand-made patchwork look.
  const j = 0.93 + 0.12 * hash2(Math.floor(x * 7.1), Math.floor(z * 7.3), 77);
  return out.multiplyScalar(j);
}

/**
 * Builds a faceted terrain mesh over a rectangle of corners with a given step.
 * Each triangle gets its own vertices so it can carry a flat colour.
 */
function buildGrid(map: CoastMap, cells: Array<[number, number]>, step: number): THREE.BufferGeometry {
  const pos = new Float32Array(cells.length * 18);
  const colors = new Float32Array(cells.length * 18);
  let o = 0;
  const c = new THREE.Color();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const e = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const tri = (x0: number, z0: number, y0: number, x1: number, z1: number, y1: number, x2: number, z2: number, y2: number): void => {
    a.set(x1 - x0, y1 - y0, z1 - z0);
    b.set(x2 - x0, y2 - y0, z2 - z0);
    nrm.crossVectors(b, a).normalize();
    if (nrm.y < 0) nrm.negate();
    e.set((x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3);
    groundColour(map, e.x, e.z, e.y, nrm.y, c);
    pos[o] = x0; pos[o + 1] = y0; pos[o + 2] = z0;
    pos[o + 3] = x1; pos[o + 4] = y1; pos[o + 5] = z1;
    pos[o + 6] = x2; pos[o + 7] = y2; pos[o + 8] = z2;
    for (let k = 0; k < 3; k++) {
      colors[o + k * 3] = c.r;
      colors[o + k * 3 + 1] = c.g;
      colors[o + k * 3 + 2] = c.b;
    }
    o += 9;
  };
  for (const [x, z] of cells) {
    const h00 = map.corner(x, z);
    const h10 = map.corner(x + step, z);
    const h01 = map.corner(x, z + step);
    const h11 = map.corner(x + step, z + step);
    const x1 = x + step;
    const z1 = z + step;
    // Counter-clockwise seen from above (+y): (x,z) -> (x,z1) -> (x1,z) etc.
    if (splitsMainDiagonal(h00, h10, h01, h11)) {
      tri(x, z, h00, x1, z1, h11, x1, z, h10);
      tri(x, z, h00, x, z1, h01, x1, z1, h11);
    } else {
      tri(x, z, h00, x, z1, h01, x1, z, h10);
      tri(x1, z, h10, x, z1, h01, x1, z1, h11);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Height of the far scenery: the coast carries on, with mountains rising inland (slice 42: the land's own coast). */
function farHeight(map: CoastMap, x: number, z: number): number {
  // Away from the map the coastline wanders into headlands and bays, so
  // it doesn't run ruler-straight to the horizon.
  const beyond = Math.max(FIELD_MIN - x, x - (FIELD_MIN + map.fieldN - 1), 0);
  const wander = 55 * fbm(x * 0.0045, 3.3, 4343, 3) * smoothstep(0, 260, beyond);
  const d = shoreZ(map.data.shore, x) + wander - z;
  // The sea floor shelves away from the beach (no step at the waterline).
  if (d < 0) return -Math.min(-d * 0.08, 10);
  const plain = 1.6 * (1 - Math.exp(-d / 15));
  const ridges = 0.35 + 0.65 * ridged(x * 0.006, z * 0.006, 4242, 4);
  return plain + 30 * ridges * smoothstep(20, 260, d);
}

function farColour(h: number, ny: number, x: number, z: number, out: THREE.Color): THREE.Color {
  const n = valueNoise(x * 0.02, z * 0.02, 905);
  out.copy(col(PAL.dryGrass)).lerp(col(PAL.meadow), smoothstep(0.35, 0.7, n));
  if (h < 0.3) out.lerp(col(PAL.sand), 1 - smoothstep(0.1, 0.3, h));
  const rock = Math.max(smoothstep(8, 22, h + n * 6), smoothstep(0.25, 0.5, 1 - ny));
  out.lerp(col(PAL.rockWarm).clone().lerp(col(PAL.rockGrey), n), rock);
  // Only a whisper of per-facet variation: far off it would just shimmer.
  return out.multiplyScalar(0.98 + 0.03 * hash2(Math.floor(x / 40), Math.floor(z / 40), 79));
}

/**
 * Bands of far scenery around the baked field, out to the horizon: square
 * rings of square cells, each band's cells twice the size of the last (so
 * there are no long thin facets to streak). Where a band meets a coarser
 * one, its in-between edge points sit on the coarser band's straight edge,
 * so nothing cracks; the field's own edge is shaped the same way in the bake.
 * These are the Bay's (its field reaches 192 from its middle); a larger
 * land's start as far beyond its own field (farBands).
 */
const FAR_BANDS: Array<[cell: number, outerHalf: number]> = [
  [FAR_STEP, 224],
  [8, 288],
  [16, 416],
  [32, 640],
  [64, 1152],
  [128, 2304],
  [256, 4352],
];

/**
 * Slice 42: the far bands round a field reaching `fieldHalf` from its
 * middle: as far beyond it as the Bay's are beyond the Bay's, each band's
 * edge on a whole number of the next band's cells (the Bay's are unchanged).
 */
function farBands(fieldHalf: number): Array<[cell: number, outerHalf: number]> {
  const BAY_HALF = 192;
  return FAR_BANDS.map(([cell, outer], i) => {
    const unit = i + 1 < FAR_BANDS.length ? FAR_BANDS[i + 1][0] : cell;
    return [cell, Math.ceil((fieldHalf + outer - BAY_HALF) / unit) * unit];
  });
}

function buildFarLand(map: CoastMap): THREE.BufferGeometry {
  const lo = FIELD_MIN;
  const hi = FIELD_MIN + map.fieldN - 1;
  const cx = (lo + hi) / 2;
  const fieldHalf = (hi - lo) / 2;
  const raw = (x: number, z: number): number => {
    const D = Math.max(Math.abs(x - cx), Math.abs(z - cx)) - fieldHalf;
    if (D <= 0) return map.corner(x, z);
    const edge = map.corner(clamp(x, lo, hi), clamp(z, lo, hi));
    return lerp(edge, farHeight(map, x, z), smoothstep(0, 140, D));
  };
  const bands = farBands(fieldHalf);
  const pos: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3): void => {
    e1.subVectors(b, a);
    e2.subVectors(d, a);
    nrm.crossVectors(e1, e2).normalize();
    farColour((a.y + b.y + d.y) / 3, Math.abs(nrm.y), (a.x + b.x + d.x) / 3, (a.z + b.z + d.z) / 3, c);
    // Wound so the normal points up: counter-clockwise from above, the front face for three.js.
    for (const v of nrm.y >= 0 ? [a, b, d] : [a, d, b]) {
      pos.push(v.x, v.y, v.z);
      colors.push(c.r, c.g, c.b);
    }
  };
  let inner = fieldHalf;
  for (let b = 0; b < bands.length; b++) {
    const [cell, outer] = bands[b];
    const coarser = b + 1 < bands.length ? bands[b + 1][0] : cell;
    // Height of a corner of this band; on its outer edge, points between the
    // next band's corners lie on that band's straight edge.
    const h = (x: number, z: number): number => {
      const ox = Math.abs(x - cx) === outer;
      const oz = Math.abs(z - cx) === outer;
      if (coarser !== cell && (ox || oz)) {
        const along = ox ? z : x;
        if (Math.round((along - cx) / cell) % 2 !== 0) {
          return ox ? (raw(x, z - cell) + raw(x, z + cell)) / 2 : (raw(x - cell, z) + raw(x + cell, z)) / 2;
        }
      }
      return raw(x, z);
    };
    const n = (2 * outer) / cell;
    const x0 = cx - outer;
    // Heights of the band's lattice, computed once per corner.
    const hs = new Float32Array((n + 1) * (n + 1)).fill(NaN);
    const corner = (i: number, j: number): number => {
      const k = j * (n + 1) + i;
      if (Number.isNaN(hs[k])) hs[k] = h(x0 + i * cell, x0 + j * cell);
      return hs[k];
    };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const xa = x0 + i * cell;
        const za = x0 + j * cell;
        // Only the ring between this band's inner and outer edges.
        if (xa >= cx - inner && xa + cell <= cx + inner && za >= cx - inner && za + cell <= cx + inner) continue;
        const h00 = corner(i, j);
        const h10 = corner(i + 1, j);
        const h01 = corner(i, j + 1);
        const h11 = corner(i + 1, j + 1);
        const p00 = new THREE.Vector3(xa, h00, za);
        const p10 = new THREE.Vector3(xa + cell, h10, za);
        const p01 = new THREE.Vector3(xa, h01, za + cell);
        const p11 = new THREE.Vector3(xa + cell, h11, za + cell);
        if (splitsMainDiagonal(h00, h10, h01, h11)) {
          tri(va.copy(p00), vb.copy(p11), vc.copy(p10));
          tri(va.copy(p00), vb.copy(p01), vc.copy(p11));
        } else {
          tri(va.copy(p00), vb.copy(p01), vc.copy(p10));
          tri(va.copy(p10), vb.copy(p01), vc.copy(p11));
        }
      }
    }
    inner = outer;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function buildTerrain(map: CoastMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 });

  const inner: Array<[number, number]> = [];
  const n = map.size;
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) inner.push([x, z]);
  const innerMesh = new THREE.Mesh(buildGrid(map, inner, 1), mat);
  innerMesh.receiveShadow = true;
  innerMesh.castShadow = true;
  innerMesh.name = 'terrain-map';
  group.add(innerMesh);

  const outer: Array<[number, number]> = [];
  const max = FIELD_MIN + map.fieldN - 1;
  for (let z = FIELD_MIN; z < max; z += OUTER_STEP) {
    for (let x = FIELD_MIN; x < max; x += OUTER_STEP) {
      if (x >= 0 && x < n && z >= 0 && z < n) continue;
      outer.push([x, z]);
    }
  }
  const outerMesh = new THREE.Mesh(buildGrid(map, outer, OUTER_STEP), mat);
  outerMesh.receiveShadow = true;
  // The scenery beyond the map is never inside the shadow box's interesting part.
  outerMesh.castShadow = false;
  outerMesh.name = 'terrain-surroundings';
  group.add(outerMesh);

  const far = new THREE.Mesh(buildFarLand(map), mat);
  far.name = 'terrain-far';
  far.receiveShadow = false;
  group.add(far);
  return group;
}
