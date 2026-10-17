/**
 * The toy pieces on the table of Greece, all built in code: the walled towns
 * with their banners, the Tyre ship, the wooden table and its frame, and the
 * dotted roads and dashed sea lanes.
 */
import * as THREE from 'three';
import { alongLine, lineLength, PLACES, TABLE_D, TABLE_W, type CityId } from '../../map/greece';
import { hash2 } from '../../map/noise';
import { prism } from '../homes';
import { lumpy, merge, type Part } from '../trees';

const WALL = '#dcc9a0';
const WALL_DARK = '#c2ab80';
const HOUSE = '#f3ead6';
const HOUSE_SHADE = '#e7dcc2';
const ROOF = '#c4683f';
const ROOF_DARK = '#a9532f';
const MARBLE = '#f7f2e4';
const ROCK = '#b39a78';
const POLE = '#6e5641';

const box = (w: number, h: number, d: number, x: number, y: number, z: number, turn = 0): THREE.BufferGeometry => new THREE.BoxGeometry(w, h, d).rotateY(turn).translate(x, y + h / 2, z);

/** A little house: white walls and a hipped red roof. */
function house(parts: Part[], x: number, z: number, y: number, w: number, d: number, h: number, turn: number, seed: number): void {
  parts.push({ geo: box(w, h, d, x, y, z, turn), color: hash2(seed, 1, 3) < 0.5 ? HOUSE : HOUSE_SHADE });
  const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.74, h * 0.55, 4).rotateY(Math.PI / 4 + turn).scale(w >= d ? 1 : 0.8, 1, d > w ? 1 : 0.8);
  parts.push({ geo: roof.translate(x, y + h + h * 0.27, z), color: hash2(seed, 2, 3) < 0.6 ? ROOF : ROOF_DARK });
}

/** A temple: steps, a body of columns (a pale block), and a gable roof. */
function temple(parts: Part[], x: number, z: number, y: number, s: number, turn: number): void {
  parts.push({ geo: box(0.9 * s, 0.08 * s, 0.5 * s, x, y, z, turn), color: WALL });
  parts.push({ geo: box(0.8 * s, 0.32 * s, 0.4 * s, x, y + 0.08 * s, z, turn), color: MARBLE });
  const roof = prism(0.86 * s, 0.25 * s, 0.16 * s).rotateY(turn).translate(x, y + 0.4 * s, z);
  parts.push({ geo: roof, color: ROOF });
}

/** A ring of wall, with towers at some corners. */
function walls(parts: Part[], r: number, h: number, sides: number, towers: number, seed: number): void {
  for (let j = 0; j < sides; j++) {
    const a0 = (j / sides) * Math.PI * 2 + seed;
    const a1 = ((j + 1) / sides) * Math.PI * 2 + seed;
    const r0 = r * (0.92 + hash2(j, seed * 10, 7) * 0.16);
    const r1 = r * (0.92 + hash2((j + 1) % sides, seed * 10, 7) * 0.16);
    const x0 = Math.cos(a0) * r0;
    const z0 = Math.sin(a0) * r0;
    const x1 = Math.cos(a1) * r1;
    const z1 = Math.sin(a1) * r1;
    const len = Math.hypot(x1 - x0, z1 - z0);
    parts.push({ geo: new THREE.BoxGeometry(len + 0.06, h, 0.1).rotateY(-Math.atan2(z1 - z0, x1 - x0)).translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2), color: WALL });
    if (towers > 0 && j % Math.max(1, Math.round(sides / towers)) === 0) parts.push({ geo: new THREE.CylinderGeometry(0.11, 0.13, h * 1.45, 6).translate(x0, (h * 1.45) / 2, z0), color: WALL_DARK });
  }
}

/** A banner on a pole in the city's colours. */
function banner(parts: Part[], x: number, z: number, y: number, h: number, colour: string, trim: string): void {
  parts.push({ geo: new THREE.CylinderGeometry(0.025, 0.03, h, 5).translate(x, y + h / 2, z), color: POLE });
  parts.push({ geo: box(0.46, 0.28, 0.02, x + 0.24, y + h - 0.3, z), color: colour });
  parts.push({ geo: box(0.46, 0.05, 0.025, x + 0.24, y + h - 0.3, z), color: trim });
}

/** Houses scattered over a disc, jittered on a grid so they don't overlap. */
function houses(parts: Part[], n: number, r: number, seed: number, y = 0, skip?: (x: number, z: number) => boolean): void {
  let placed = 0;
  const taken = new Set<string>();
  for (let k = 0; k < n * 6 && placed < n; k++) {
    const a = hash2(k, seed, 11) * Math.PI * 2;
    const d = Math.sqrt(hash2(k, seed, 12)) * r;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (skip?.(x, z)) continue;
    const g = Math.round(x / 0.42) * 0.42 + (hash2(k, seed, 13) - 0.5) * 0.08;
    const gz = Math.round(z / 0.42) * 0.42 + (hash2(k, seed, 14) - 0.5) * 0.08;
    const key = `${Math.round(g / 0.42)},${Math.round(gz / 0.42)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    const w = 0.26 + hash2(k, seed, 15) * 0.12;
    const dd = 0.22 + hash2(k, seed, 16) * 0.12;
    house(parts, g, gz, y, w, dd, 0.2 + hash2(k, seed, 17) * 0.1, Math.round(hash2(k, seed, 18) * 2) * (Math.PI / 2) * 0.5, seed + k);
    placed++;
  }
}

/** A rocky hill (an acropolis, Acrocorinth, Troy's mound). */
function hill(parts: Part[], x: number, z: number, r: number, h: number, seed: number): void {
  parts.push({ geo: lumpy(new THREE.ConeGeometry(r, h, 9, 2), 0.18, seed).translate(x, h / 2 - 0.02, z), color: ROCK });
}

/**
 * A toy town for a city of Greece, in its own frame (its middle at the
 * origin, the ground at y = 0). Your own city's houses grow with its people.
 */
export function cityModel(id: CityId, people = 0): THREE.BufferGeometry {
  const p: Part[] = [];
  const { colour, trim } = PLACES[id];
  switch (id) {
    case 'athens': {
      walls(p, 1.25, 0.2, 11, 4, 1);
      hill(p, 0.2, -0.15, 0.62, 0.55, 2);
      temple(p, 0.2, -0.15, 0.5, 0.75, 0.2);
      houses(p, 18, 1.08, 3, 0, (x, z) => Math.hypot(x - 0.2, z + 0.15) < 0.62);
      banner(p, -0.85, 0.5, 0, 1.25, colour, trim);
      break;
    }
    case 'sparta': {
      // Sparta has no walls: its villages and its soldiers are its walls.
      houses(p, 14, 1.1, 4);
      temple(p, 0.1, 0.05, 0, 0.7, 0.9);
      banner(p, -0.55, -0.45, 0, 1.25, colour, trim);
      break;
    }
    case 'corinth': {
      walls(p, 1.0, 0.18, 10, 3, 5);
      hill(p, -0.2, 0.95, 0.6, 0.95, 6);
      p.push({ geo: new THREE.CylinderGeometry(0.2, 0.22, 0.18, 7).translate(-0.2, 0.95, 0.95), color: WALL_DARK });
      houses(p, 14, 0.85, 7, 0, (x, z) => Math.hypot(x + 0.2, z - 0.95) < 0.55);
      temple(p, 0.35, -0.3, 0, 0.6, 0.0);
      banner(p, 0.55, 0.45, 0, 1.25, colour, trim);
      break;
    }
    case 'troy': {
      hill(p, 0, 0, 1.15, 0.28, 8);
      p.push({ geo: new THREE.CylinderGeometry(1.0, 1.05, 0.06, 12).translate(0, 0.24, 0), color: '#c9b089' });
      const g: Part[] = [];
      walls(g, 1.0, 0.42, 12, 6, 9);
      for (const q of g) p.push({ geo: q.geo.translate(0, 0.25, 0), color: q.color });
      const inner: Part[] = [];
      houses(inner, 12, 0.8, 10, 0.27);
      p.push(...inner);
      p.push({ geo: box(0.55, 0.36, 0.4, 0.05, 0.27, -0.05), color: MARBLE });
      p.push({ geo: prism(0.6, 0.24, 0.16).translate(0.05, 0.63, -0.05), color: ROOF });
      banner(p, 0.0, 0.0, 0.62, 1.15, colour, trim);
      break;
    }
    case 'tyre': {
      // An island city, tall and close-packed, with a harbour mole.
      for (let k = 0; k < 16; k++) {
        const a = hash2(k, 21, 1) * Math.PI * 2;
        const d = Math.sqrt(hash2(k, 21, 2)) * 0.75;
        p.push({ geo: box(0.24, 0.3 + hash2(k, 21, 3) * 0.3, 0.24, Math.cos(a) * d, 0, Math.sin(a) * d), color: hash2(k, 21, 4) < 0.5 ? HOUSE : '#e8d6b4' });
      }
      p.push({ geo: box(1.4, 0.08, 0.14, -0.3, -0.04, 0.95, 0.3), color: WALL_DARK });
      banner(p, 0.1, -0.1, 0.4, 1.1, colour, trim);
      break;
    }
    case 'home': {
      // Your city, growing with its people: no walls yet.
      const n = Math.max(3, Math.min(18, Math.round(3 + people / 70)));
      houses(p, n, 0.45 + n * 0.035, 12);
      banner(p, 0.0, 0.0, 0, 1.25, colour, trim);
      break;
    }
  }
  const g = merge(p);
  return g;
}

/** A little merchant ship (bow along +x) with a sail in her city's colour. */
export function shipModel(sail: string, stripe: string): THREE.BufferGeometry {
  const p: Part[] = [];
  const hull = new THREE.CylinderGeometry(0.3, 0.16, 2.1, 7, 1).rotateZ(Math.PI / 2).scale(1, 0.55, 1);
  p.push({ geo: hull.translate(0, 0.1, 0), color: '#7a4a2c' });
  p.push({ geo: box(1.6, 0.05, 0.42, -0.05, 0.2, 0), color: '#a5764a' });
  p.push({ geo: new THREE.CylinderGeometry(0.03, 0.035, 1.5, 5).translate(0.05, 0.95, 0), color: POLE });
  p.push({ geo: box(0.05, 0.9, 1.15, 0.05, 0.7, 0).translate(0, 0, 0), color: sail });
  p.push({ geo: box(0.06, 0.16, 1.17, 0.05, 1.08, 0), color: stripe });
  p.push({ geo: new THREE.ConeGeometry(0.1, 0.35, 5).rotateZ(-Math.PI / 2).translate(1.12, 0.25, 0), color: '#6a3f24' });
  return merge(p);
}

/** The wooden table under the map, and the raised frame round it. */
export function tableModel(): THREE.Group {
  const g = new THREE.Group();
  const top: Part[] = [];
  const W = TABLE_W;
  const D = TABLE_D;
  // Planks under everything, running east-west.
  const pw = 9;
  for (let z = -60, k = 0; z < D + 60; z += pw, k++) top.push({ geo: box(W + 140, 1.2, pw - 0.25, W / 2, -2.6, z + pw / 2), color: k % 3 === 0 ? '#7a4f30' : k % 3 === 1 ? '#6f4629' : '#83563a' });
  // The frame: a moulded rim on four sides.
  const f = 3.2;
  const fh = 1.0;
  const rim: Array<[number, number, number, number]> = [
    [W / 2, -f / 2, W + 2 * f, f],
    [W / 2, D + f / 2, W + 2 * f, f],
    [-f / 2, D / 2, f, D],
    [W + f / 2, D / 2, f, D],
  ];
  for (const [x, z, w, d] of rim) {
    top.push({ geo: box(w, fh + 2.6, d, x, -2.0, z), color: '#8f5d36' });
    top.push({ geo: box(w * (w > d ? 1 : 0.55), 0.22, d * (d > w ? 1 : 0.55), x, fh + 0.6 - 2.0 + 2.0, z), color: '#b98552' });
  }
  const m = new THREE.Mesh(merge(top), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }));
  m.name = 'greece-table';
  m.receiveShadow = true;
  g.add(m);
  return g;
}

/**
 * The ways drawn on the table: dots along the roads (on the ground), dashes
 * along the sea lanes (on the water). `lines` are table x, z polylines.
 */
export function wayMarks(roads: number[][], lanes: number[][], heightAt: (x: number, z: number) => number): THREE.Group {
  const g = new THREE.Group();
  const dots: THREE.Matrix4[] = [];
  const dashes: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (const line of roads) {
    const L = lineLength(line);
    for (let d = 0.5; d < L - 0.3; d += 0.55) {
      const p = alongLine(line, d);
      m.compose(new THREE.Vector3(p.x, heightAt(p.x, p.z) + 0.06, p.z), q.identity(), new THREE.Vector3(1, 1, 1));
      dots.push(m.clone());
    }
  }
  for (const line of lanes) {
    const L = lineLength(line);
    for (let d = 1.4; d < L - 0.8; d += 1.5) {
      const p = alongLine(line, d);
      q.setFromAxisAngle(up, -Math.atan2(p.dz, p.dx));
      m.compose(new THREE.Vector3(p.x, 0.04, p.z), q, new THREE.Vector3(1, 1, 1));
      dashes.push(m.clone());
    }
  }
  const dotMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.11, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#7a4b2a', roughness: 0.9 }), dots.length);
  dots.forEach((x, i) => dotMesh.setMatrixAt(i, x));
  dotMesh.name = 'greece-roads';
  const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: '#fdf7e6', roughness: 0.6, transparent: true, opacity: 0.85 }), dashes.length);
  dashes.forEach((x, i) => dashMesh.setMatrixAt(i, x));
  dashMesh.name = 'greece-lanes';
  g.add(dotMesh, dashMesh);
  return g;
}
