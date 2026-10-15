import * as THREE from 'three';
import { FIELD_MIN, FIELD_N, OUTER_STEP, shoreZ, splitsMainDiagonal, type CoastMap } from '../map/bake';
import { coast, MAP_SIZE } from '../map/coast';
import { hash2, lerp, ridged, smoothstep, valueNoise } from '../map/noise';
import { col, PAL } from './palette';

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
  const bankAmt = q.surface > 0.05 && h < q.surface + 0.25 ? 1 - smoothstep(q.width + 0.1, q.width + 0.9, q.d) : 0;
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

/** Height of the far scenery: the coast carries on, with mountains rising inland. */
function farHeight(x: number, z: number): number {
  const d = shoreZ(coast.shore, x) - z;
  if (d < 0) return -4 - Math.min(-d * 0.05, 6);
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
  // Only a whisper of per-facet variation: the far rings are long thin facets that would stripe.
  return out.multiplyScalar(0.98 + 0.03 * hash2(Math.floor(x / 40), Math.floor(z / 40), 79));
}

/**
 * Scenery out to the horizon: square rings extruded from the edge of the
 * baked field, sharing its edge vertices exactly (no cracks), widening and
 * blending into a simple far landscape that the haze swallows.
 */
function buildFarLand(map: CoastMap): THREE.BufferGeometry {
  const lo = FIELD_MIN;
  const hi = FIELD_MIN + FIELD_N - 1;
  const step = OUTER_STEP * 2;
  // The field's perimeter, counter-clockwise from above, with outward directions.
  const perim: Array<{ x: number; z: number; dx: number; dz: number }> = [];
  for (let x = lo; x < hi; x += step) perim.push({ x, z: lo, dx: x === lo ? -1 : 0, dz: -1 });
  for (let z = lo; z < hi; z += step) perim.push({ x: hi, z, dx: 1, dz: z === lo ? -1 : 0 });
  for (let x = hi; x > lo; x -= step) perim.push({ x, z: hi, dx: x === hi ? 1 : 0, dz: 1 });
  for (let z = hi; z > lo; z -= step) perim.push({ x: lo, z, dx: -1, dz: z === hi ? 1 : 0 });
  const rings = [0, 10, 28, 60, 120, 220, 400, 700, 1200, 2200];
  const pts: THREE.Vector3[][] = rings.map((D) =>
    perim.map((p) => {
      const x = p.x + p.dx * D;
      const z = p.z + p.dz * D;
      const edge = map.corner(p.x, p.z);
      const h = D === 0 ? edge : lerp(edge, farHeight(x, z), smoothstep(0, 140, D));
      return new THREE.Vector3(x, h, z);
    }),
  );
  const pos: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3): void => {
    e1.subVectors(b, a);
    e2.subVectors(d, a);
    // Right-hand normal of a->b->d; three.js treats counter-clockwise (normal up) as the front.
    nrm.crossVectors(e1, e2).normalize();
    const cx = (a.x + b.x + d.x) / 3;
    const cz = (a.z + b.z + d.z) / 3;
    farColour((a.y + b.y + d.y) / 3, Math.abs(nrm.y), cx, cz, c);
    for (const v of nrm.y >= 0 ? [a, b, d] : [a, d, b]) {
      pos.push(v.x, v.y, v.z);
      colors.push(c.r, c.g, c.b);
    }
  };
  const n = perim.length;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = pts[r][i];
      const b = pts[r][j];
      const a2 = pts[r + 1][i];
      const b2 = pts[r + 1][j];
      tri(a, a2, b);
      tri(b, a2, b2);
    }
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
  for (let z = 0; z < MAP_SIZE; z++) for (let x = 0; x < MAP_SIZE; x++) inner.push([x, z]);
  const innerMesh = new THREE.Mesh(buildGrid(map, inner, 1), mat);
  innerMesh.receiveShadow = true;
  innerMesh.castShadow = true;
  innerMesh.name = 'terrain-map';
  group.add(innerMesh);

  const outer: Array<[number, number]> = [];
  const max = FIELD_MIN + FIELD_N - 1;
  for (let z = FIELD_MIN; z < max; z += OUTER_STEP) {
    for (let x = FIELD_MIN; x < max; x += OUTER_STEP) {
      if (x >= 0 && x < MAP_SIZE && z >= 0 && z < MAP_SIZE) continue;
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
