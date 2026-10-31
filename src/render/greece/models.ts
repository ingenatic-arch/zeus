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
    // Slice 31's newcomers.
    case 'thebes': {
      // Seven-gated Thebes: a ring of wall with seven towers round the Kadmeia, its hill and temple.
      walls(p, 1.1, 0.24, 14, 7, 13);
      hill(p, -0.1, 0.1, 0.55, 0.45, 14);
      temple(p, -0.1, 0.1, 0.42, 0.6, 0.4);
      houses(p, 16, 0.95, 15, 0, (x, z) => Math.hypot(x + 0.1, z - 0.1) < 0.55);
      banner(p, 0.7, -0.55, 0, 1.25, colour, trim);
      break;
    }
    case 'argos': {
      // The Argives' old town on its hills: a steep crag with a little fort on top, the houses at its foot.
      hill(p, 0.1, -0.2, 0.7, 1.05, 16);
      const fort: Part[] = [];
      walls(fort, 0.3, 0.16, 7, 3, 17);
      for (const q of fort) p.push({ geo: q.geo.translate(0.1, 0.95, -0.2), color: q.color });
      houses(p, 11, 0.95, 18, 0, (x, z) => Math.hypot(x - 0.1, z + 0.2) < 0.62);
      banner(p, 0.1, -0.2, 1.05, 1.0, colour, trim);
      break;
    }
    case 'knossos': {
      // The palace of Knossos: broad flat-roofed terraces round a court, its red columns with black tops; no walls.
      p.push({ geo: box(1.5, 0.22, 1.1, 0, 0, 0), color: '#e8d8b4' });
      p.push({ geo: box(0.9, 0.22, 0.7, -0.2, 0.22, -0.1), color: '#efe2c2' });
      p.push({ geo: box(0.45, 0.18, 0.4, 0.25, 0.44, 0.0), color: '#e8d8b4' });
      for (let k = 0; k < 6; k++) {
        const x = -0.6 + k * 0.24;
        p.push({ geo: new THREE.CylinderGeometry(0.05, 0.035, 0.34, 6).translate(x, 0.39, 0.42), color: '#b23a3a' });
        p.push({ geo: box(0.1, 0.05, 0.1, x, 0.56, 0.42), color: '#2a1c18' });
      }
      p.push({ geo: box(1.36, 0.04, 0.18, -0.0, 0.6, 0.42), color: '#e8d8b4' });
      // Horns of consecration on the roof.
      p.push({ geo: box(0.08, 0.16, 0.06, 0.15, 0.62, -0.05), color: MARBLE }, { geo: box(0.08, 0.16, 0.06, 0.35, 0.62, -0.05), color: MARBLE }, { geo: box(0.28, 0.05, 0.08, 0.25, 0.62, -0.05), color: MARBLE });
      houses(p, 12, 1.25, 19, 0, (x, z) => Math.abs(x) < 0.85 && Math.abs(z) < 0.65);
      banner(p, -0.85, -0.55, 0, 1.25, colour, trim);
      break;
    }
    case 'rhodes': {
      // A harbour town on its island's point: houses close-packed up the slope, two moles round the harbour and a beacon tower.
      houses(p, 18, 0.95, 20, 0, (_x, z) => z > 0.55);
      p.push({ geo: box(1.2, 0.08, 0.14, -0.25, -0.04, 1.0, 0.25), color: WALL_DARK });
      p.push({ geo: box(0.9, 0.08, 0.14, 0.55, -0.04, 0.95, -0.5), color: WALL_DARK });
      p.push({ geo: new THREE.CylinderGeometry(0.1, 0.13, 0.9, 7).translate(0.92, 0.41, 1.15), color: WALL });
      p.push({ geo: new THREE.ConeGeometry(0.12, 0.16, 7).translate(0.92, 0.94, 1.15), color: '#e8a23a' });
      temple(p, -0.25, -0.45, 0.0, 0.62, 0.2);
      banner(p, 0.35, -0.2, 0, 1.25, colour, trim);
      break;
    }
    case 'memphis': {
      // Egypt: a great pyramid and a smaller one, a temple behind its pylon gate, mud-brick houses, a strip of palms by the river.
      const sand = '#d9c28a';
      p.push({ geo: new THREE.ConeGeometry(0.85, 1.05, 4).rotateY(Math.PI / 4).translate(-0.55, 0.52, -0.45), color: sand });
      p.push({ geo: new THREE.ConeGeometry(0.5, 0.62, 4).rotateY(Math.PI / 4).translate(0.55, 0.31, -0.75), color: '#cfb57c' });
      p.push({ geo: box(0.28, 0.5, 0.2, 0.35, 0, 0.1).scale(1, 1, 1), color: '#e6d6ac' });
      p.push({ geo: box(0.28, 0.5, 0.2, 0.75, 0, 0.1), color: '#e6d6ac' });
      p.push({ geo: box(0.7, 0.32, 0.5, 0.55, 0, -0.25), color: '#efe2c2' });
      for (let k = 0; k < 14; k++) {
        const a = hash2(k, 31, 1) * Math.PI * 2;
        const d = 0.5 + Math.sqrt(hash2(k, 31, 2)) * 0.6;
        const x = Math.cos(a) * d + 0.1;
        const z = Math.sin(a) * d * 0.6 + 0.55;
        p.push({ geo: box(0.22, 0.16 + hash2(k, 31, 3) * 0.08, 0.2, x, 0, z), color: hash2(k, 31, 4) < 0.5 ? '#c8a878' : '#b8956a' });
      }
      for (let k = 0; k < 6; k++) {
        const x = -1.0 + k * 0.38;
        p.push({ geo: new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4).translate(x, 0.25, 1.15), color: '#7a5a34' });
        p.push({ geo: new THREE.ConeGeometry(0.16, 0.12, 6).translate(x, 0.54, 1.15), color: '#5f7f2c' });
      }
      banner(p, 0.0, 0.2, 0, 1.25, colour, trim);
      break;
    }
  }
  const g = merge(p);
  return g;
}

/**
 * Slice 31: an empty site, a little cairn with a pale pennant on a pole; or,
 * once a colony stands there, a few houses round a banner in its founder's
 * colours (more as it grows, up to about a dozen).
 */
export function siteModel(colour: string, trim: string, people: number, growth?: SiteGrowth): THREE.BufferGeometry {
  const p: Part[] = [];
  if (people <= 0) {
    p.push({ geo: lumpy(new THREE.ConeGeometry(0.22, 0.3, 6, 1), 0.12, 23).translate(0, 0.14, 0), color: ROCK });
    p.push({ geo: new THREE.CylinderGeometry(0.02, 0.025, 0.85, 5).translate(0, 0.42, 0), color: POLE });
    p.push({ geo: box(0.3, 0.16, 0.02, 0.16, 0.62, 0), color: '#efe6cf' });
    return merge(p);
  }
  // (Slice 43: your colony by its stage and its works: tents at an outpost, more houses as it grows, and what you have built there.)
  if (growth) return colonyModel(p, colour, trim, people, growth);
  const n = Math.max(3, Math.min(12, Math.round(3 + people / 200)));
  houses(p, n, 0.3 + n * 0.035, 24);
  banner(p, 0.0, 0.0, 0, 1.0, colour, trim);
  return merge(p);
}

// Slice 43
/** A colony's stage (0 outpost to 3 city) and the works built there (fields, harbour, agora, temple, walls, trade), for its piece on the table. */
export interface SiteGrowth {
  stage: number;
  built: readonly string[];
  /** Its second trade's look: vines or olives in rows, a quarry, or a paddock. */
  trade: 'rows' | 'quarry' | 'paddock';
}

const TENT = '#efe2c4';
const FIELD_GREEN = '#a5c459';
const FIELD_GOLD = '#d8b84e';
const STONE = '#cdbb94';
const VINE = '#5f7f2c';

/** Your colony's piece: tents or houses by its stage, and its built works around them. */
function colonyModel(p: Part[], colour: string, trim: string, people: number, g: SiteGrowth): THREE.BufferGeometry {
  const has = (k: string): boolean => g.built.includes(k);
  const stage = Math.max(0, Math.min(3, g.stage));
  const r = [0.36, 0.46, 0.6, 0.74][stage];
  // (The middle kept open for the agora and the temple's hill when they are built.)
  const open = (x: number, z: number): boolean => (has('agora') && Math.hypot(x - 0.12, z + 0.05) < 0.22) || (has('temple') && Math.hypot(x + 0.05, z + r * 0.45) < 0.24);
  if (stage === 0) {
    for (const [x, z, a] of [[-0.22, 0.05, 0.3], [0.12, -0.16, -0.4], [0.2, 0.18, 0.9]] as Array<[number, number, number]>) {
      p.push({ geo: new THREE.ConeGeometry(0.17, 0.26, 4).rotateY(a).translate(x, 0.13, z), color: TENT });
      p.push({ geo: box(0.05, 0.1, 0.02, x, 0, z + 0.12, a), color: colour });
    }
  } else {
    const n = Math.max(3, Math.min(16, Math.round([3, 5, 8, 11][stage] + Math.max(0, people - [0, 150, 400, 900][stage]) / 150)));
    houses(p, n, r, 24, 0, open);
  }
  banner(p, -0.05, 0.05, 0, stage === 0 ? 0.85 : 1.0, colour, trim);
  if (has('fields')) {
    for (let i = 0; i < 4; i++) p.push({ geo: box(0.34, 0.025, 0.16, -r - 0.24, 0, -0.27 + i * 0.18, 0.15), color: i % 2 ? FIELD_GOLD : FIELD_GREEN });
  }
  if (has('agora')) {
    p.push({ geo: box(0.36, 0.03, 0.3, 0.12, 0, -0.05), color: '#e8dcc0' });
    p.push({ geo: box(0.36, 0.14, 0.07, 0.12, 0.03, -0.18), color: MARBLE });
    p.push({ geo: prism(0.4, 0.08, 0.06).translate(0.12, 0.17, -0.18), color: ROOF });
  }
  if (has('temple')) {
    p.push({ geo: lumpy(new THREE.ConeGeometry(0.3, 0.22, 7, 1), 0.06, 41).translate(-0.05, 0.1, -r * 0.45), color: ROCK });
    temple(p, -0.05, -r * 0.45, 0.17, 0.42, 0);
  }
  if (has('walls')) walls(p, r + 0.14, 0.16, 9, 4, 1.3);
  if (has('harbour')) {
    // (A stone mole curving off the shore on the far side from the fields, a jetty beside it.)
    for (let i = 0; i < 4; i++) {
      const a = -0.5 + i * 0.36;
      p.push({ geo: box(0.2, 0.07, 0.11, r + 0.3 + Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3 + 0.1, -a + Math.PI / 2), color: STONE });
    }
    p.push({ geo: box(0.36, 0.05, 0.08, r + 0.22, 0.03, -0.22), color: '#8a5a34' });
  }
  if (has('trade')) {
    const x0 = 0.1;
    const z0 = r + 0.26;
    if (g.trade === 'rows') {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) p.push({ geo: new THREE.SphereGeometry(0.045, 5, 3).translate(x0 - 0.18 + j * 0.12, 0.05, z0 - 0.09 + i * 0.09), color: VINE });
    } else if (g.trade === 'quarry') {
      p.push({ geo: box(0.36, 0.14, 0.22, x0, 0, z0), color: '#ddd5c2' });
      p.push({ geo: box(0.12, 0.08, 0.1, x0 + 0.26, 0, z0 + 0.06), color: MARBLE });
      p.push({ geo: box(0.1, 0.08, 0.1, x0 + 0.24, 0, z0 - 0.08), color: MARBLE });
    } else {
      for (const [dx, dz, w, d] of [[0, -0.14, 0.4, 0.02], [0, 0.14, 0.4, 0.02], [-0.2, 0, 0.02, 0.3], [0.2, 0, 0.02, 0.3]] as Array<[number, number, number, number]>) p.push({ geo: box(w, 0.06, d, x0 + dx, 0, z0 + dz), color: POLE });
      for (const [dx, dz] of [[-0.06, -0.04], [0.08, 0.05]] as Array<[number, number]>) p.push({ geo: box(0.12, 0.07, 0.05, x0 + dx, 0.03, z0 + dz), color: '#8a5a34' });
    }
  }
  return merge(p);
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

/** A caravan on the road: a drover and three pack donkeys in a line, their loads in the city's colour (along +x, the lead at +x). */
export function caravanModel(colour: string): THREE.BufferGeometry {
  const p: Part[] = [];
  for (let i = 0; i < 3; i++) {
    const x = 0.55 - i * 0.62;
    p.push({ geo: box(0.42, 0.2, 0.16, x, 0.16, 0), color: '#8e8478' });
    p.push({ geo: box(0.14, 0.22, 0.12, x + 0.26, 0.24, 0), color: '#7a7064' });
    p.push({ geo: box(0.3, 0.14, 0.3, x - 0.02, 0.3, 0), color: colour });
    for (const dx of [-0.15, 0.15]) for (const dz of [-0.05, 0.05]) p.push({ geo: box(0.05, 0.16, 0.05, x + dx, 0, dz), color: '#5a5249' });
  }
  // The drover at the head, in a pale tunic.
  p.push({ geo: new THREE.CylinderGeometry(0.07, 0.11, 0.42, 6).translate(1.0, 0.21, 0), color: '#efe2c4' });
  p.push({ geo: new THREE.SphereGeometry(0.08, 6, 4).translate(1.0, 0.5, 0), color: '#b07a52' });
  return merge(p);
}

/**
 * A war band on the road (along +x, the head at +x): a few warriors in ranks
 * of two, round shields in the city's colour, spears up, and a banner at the
 * head; gathering (`camp`), they stand in a ring round the banner by a tent.
 */
export function bandModel(colour: string, trim: string, camp = false): THREE.BufferGeometry {
  const p: Part[] = [];
  const men: Array<[number, number, number]> = [];
  if (camp) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      men.push([Math.cos(a) * 0.55, Math.sin(a) * 0.55, a + Math.PI]);
    }
    p.push({ geo: new THREE.ConeGeometry(0.32, 0.42, 4).rotateY(Math.PI / 4).translate(-0.15, 0.21, -0.1), color: '#e9dcc0' });
  } else for (let i = 0; i < 8; i++) men.push([0.8 - Math.floor(i / 2) * 0.36, i % 2 ? 0.13 : -0.13, 0]);
  for (const [x, z, turn] of men) {
    // A warrior: dark tunic, bronze helmet, a round shield in the colour on his left, a spear up on his right.
    p.push({ geo: new THREE.CylinderGeometry(0.055, 0.085, 0.3, 6).translate(x, 0.15, z), color: colour });
    p.push({ geo: new THREE.SphereGeometry(0.065, 6, 4).translate(x, 0.36, z), color: '#b08a3a' });
    const sx = x + Math.sin(turn) * 0.09;
    const sz = z + (camp ? Math.cos(turn) * 0.09 : -0.09);
    p.push({ geo: new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8).rotateX(Math.PI / 2).rotateY(camp ? turn : 0).translate(sx, 0.2, sz), color: '#c9a04a' });
    p.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.62, 4).translate(x - Math.sin(turn) * 0.08, 0.31, z + (camp ? -Math.cos(turn) * 0.08 : 0.09)), color: POLE });
  }
  banner(p, camp ? 0 : 1.05, 0, 0, 0.95, colour, trim);
  return merge(p);
}

/**
 * How far each moving piece reaches behind and ahead of its place along its
 * own +x (in its own units, before its scale): the body the pointer is
 * tested against on the screen, so a column can be picked anywhere along
 * it, not only at its head.
 */
export const BODY = {
  ship: [-1.05, 1.3],
  caravan: [-0.9, 1.1],
  band: [-0.65, 1.3],
  camp: [-0.65, 0.65],
  fleet: [-1.6, 1.4],
} as const;

/** An army's body: its ranks from the rear to the banner at its head (as `armyModel` lays them out). */
export const armyBody = (men: number): readonly [number, number] => [-0.36 * Math.ceil(men / ARMY_FILE) + 0.2, 1.05];

/** Men abreast in an army's ranks. */
const ARMY_FILE = 3;

/**
 * A city's army on the march (along +x, the head at +x): a phalanx of
 * hoplites three abreast, rank behind rank (more ranks for a bigger city),
 * shields in the city's colour with a rim of its trim, spears up, and a tall
 * banner at the head.
 */
export function armyModel(colour: string, trim: string, men: number): THREE.BufferGeometry {
  const p: Part[] = [];
  for (let i = 0; i < men; i++) {
    const rank = Math.floor(i / ARMY_FILE);
    const file = i % ARMY_FILE;
    const x = 0.62 - rank * 0.36;
    const z = (file - (ARMY_FILE - 1) / 2) * 0.24;
    p.push({ geo: new THREE.CylinderGeometry(0.055, 0.085, 0.3, 6).translate(x, 0.15, z), color: '#7a4a32' });
    p.push({ geo: new THREE.SphereGeometry(0.066, 6, 4).translate(x, 0.36, z), color: '#b08a3a' });
    // A crest on the helmet, in the city's colour.
    p.push({ geo: box(0.13, 0.05, 0.025, x - 0.01, 0.41, z), color: colour });
    // The shield, facing forward-left, big and round; its rim in the trim.
    p.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.03, 9).rotateZ(Math.PI / 2).translate(x + 0.09, 0.21, z - 0.04), color: colour });
    p.push({ geo: new THREE.CylinderGeometry(0.045, 0.045, 0.035, 6).rotateZ(Math.PI / 2).translate(x + 0.1, 0.21, z - 0.04), color: trim });
    p.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4).translate(x - 0.03, 0.35, z + 0.08), color: POLE });
  }
  banner(p, 1.0, 0, 0, 1.15, colour, trim);
  return merge(p);
}

/** A war galley (bow along +x): long and low, a ram at the bow, a row of oars each side, a painted eye, a dark sail with its city's stripe. */
function galley(p: Part[], x: number, z: number, colour: string, trim: string): void {
  const hull = new THREE.CylinderGeometry(0.2, 0.12, 2.0, 7, 1).rotateZ(Math.PI / 2).scale(1, 0.5, 0.85);
  p.push({ geo: hull.translate(x, 0.08, z), color: '#3d2a1e' });
  p.push({ geo: box(1.7, 0.04, 0.28, x - 0.05, 0.15, z), color: '#7a5a3a' });
  p.push({ geo: new THREE.ConeGeometry(0.06, 0.32, 5).rotateZ(-Math.PI / 2).translate(x + 1.12, 0.03, z), color: '#b08a3a' });
  p.push({ geo: box(0.04, 0.07, 0.07, x + 0.82, 0.12, z + 0.15), color: '#f2ead8' });
  p.push({ geo: box(0.04, 0.07, 0.07, x + 0.82, 0.12, z - 0.15), color: '#f2ead8' });
  for (let k = 0; k < 7; k++) {
    const ox = x - 0.65 + k * 0.2;
    for (const side of [-1, 1]) p.push({ geo: box(0.025, 0.02, 0.36, ox, 0.06, z + side * 0.28).rotateX(side * 0.25), color: '#c9a777' });
  }
  p.push({ geo: new THREE.CylinderGeometry(0.025, 0.03, 1.0, 5).translate(x - 0.05, 0.6, z), color: POLE });
  p.push({ geo: box(0.04, 0.55, 0.8, x - 0.05, 0.5, z), color: colour });
  p.push({ geo: box(0.05, 0.1, 0.82, x - 0.05, 0.72, z), color: trim });
}

/** A city's fleet at sea: three galleys in a wedge (the lead at +x). */
export function fleetModel(colour: string, trim: string): THREE.BufferGeometry {
  const p: Part[] = [];
  galley(p, 0.3, 0, colour, trim);
  galley(p, -0.5, 0.75, colour, trim);
  galley(p, -0.5, -0.75, colour, trim);
  return merge(p);
}

/** Crossed swords over the place two armies meet: two bronze blades, their hilts and guards dark, on a small red-rimmed disc. */
export function swordsModel(): THREE.BufferGeometry {
  const p: Part[] = [];
  for (const side of [-1, 1]) {
    const blade = box(0.09, 1.0, 0.03, 0, 0, 0).translate(0, 0.2, 0);
    const guard = box(0.32, 0.05, 0.06, 0, 0.17, 0);
    const hilt = box(0.06, 0.2, 0.05, 0, -0.03, 0);
    const pommel = new THREE.SphereGeometry(0.05, 6, 4).translate(0, -0.05, 0);
    for (const [g, c] of [
      [blade, '#d8dcdf'],
      [guard, '#b08a3a'],
      [hilt, '#4a2e1c'],
      [pommel, '#b08a3a'],
    ] as const)
      p.push({ geo: g.rotateZ(side * 0.62).translate(0, 0.62, 0), color: c });
  }
  p.push({ geo: new THREE.CylinderGeometry(0.42, 0.46, 0.06, 14).translate(0, 0.03, 0), color: '#a8322a' });
  p.push({ geo: new THREE.CylinderGeometry(0.34, 0.34, 0.07, 14).translate(0, 0.04, 0), color: '#f3e6c8' });
  return merge(p);
}

/** A festival round a city: banners on poles in a ring (its colour and gold), and an altar with garlands, for the smoke to rise from. */
export function festivalModel(colour: string, trim: string, r: number): THREE.BufferGeometry {
  const p: Part[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    p.push({ geo: new THREE.CylinderGeometry(0.022, 0.028, 0.78, 5).translate(x, 0.39, z), color: POLE });
    // A long banner hanging from a crossbar, facing out from the city, alternately in its colour and gold, with a band of its trim.
    const turn = -a;
    p.push({ geo: box(0.03, 0.03, 0.36, 0, 0, 0).rotateY(turn).translate(x, 0.72, z), color: POLE });
    p.push({ geo: box(0.025, 0.42, 0.32, 0, 0, 0).rotateY(turn).translate(x, 0.3, z), color: i % 2 ? '#e8c04a' : colour });
    p.push({ geo: box(0.03, 0.07, 0.33, 0, 0, 0).rotateY(turn).translate(x, 0.6, z), color: trim });
    p.push({ geo: new THREE.SphereGeometry(0.04, 6, 4).translate(x, 0.8, z), color: '#e8c04a' });
  }
  // The altar, white, garlanded, before the city.
  p.push({ geo: box(0.36, 0.22, 0.26, r * 0.55, 0, r * 0.55), color: MARBLE });
  p.push({ geo: box(0.4, 0.04, 0.3, r * 0.55, 0.22, r * 0.55), color: '#6f8f3c' });
  return merge(p);
}

/**
 * A patch of fields beside a city, laid over the ground (in table
 * coordinates, draped on the relief): two rows of strips of ploughland in a
 * few shades, with the ground showing between them; the harvest's colour is
 * its material's.
 */
export function fieldsModel(cx: number, cz: number, turn: number, seed: number, heightAt: (x: number, z: number) => number): THREE.BufferGeometry {
  const p: Part[] = [];
  const shades = ['#ffffff', '#e6e2d6', '#f2eee2', '#d6d0bf'];
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 6; i++) {
      const w = 0.36 + hash2(i, j, seed) * 0.12;
      const d = 1.25 + hash2(i, j + 7, seed) * 0.3;
      const g = new THREE.PlaneGeometry(w, d, 1, 4).rotateX(-Math.PI / 2);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const ox = (i - 2.5) * 0.48;
      const oz = (j - 0.5) * 1.62;
      for (let v = 0; v < pos.count; v++) {
        const lx = pos.getX(v) + ox;
        const lz = pos.getZ(v) + oz;
        const x = cx + lx * c - lz * s;
        const z = cz + lx * s + lz * c;
        pos.setXYZ(v, x, heightAt(x, z) + 0.05, z);
      }
      p.push({ geo: g, color: shades[(i * 3 + j + seed) % shades.length] });
    }
  const geo = merge(p);
  geo.computeVertexNormals();
  return geo;
}

/** A puff of smoke (one geometry for every puff). */
export const puffGeometry = (): THREE.BufferGeometry => new THREE.IcosahedronGeometry(0.16, 0);

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

/** A war's way drawn red on the table, closed: red dots along a road, red dashes along a lane. */
export function closedWay(line: number[], kind: 'land' | 'sea', heightAt: (x: number, z: number) => number): THREE.InstancedMesh {
  const L = lineLength(line);
  const step = kind === 'land' ? 0.55 : 0.9;
  const ms: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let d = 0.8; d < L - 0.8; d += step) {
    const p = alongLine(line, d);
    q.setFromAxisAngle(up, -Math.atan2(p.dz, p.dx));
    m.compose(new THREE.Vector3(p.x, (kind === 'land' ? heightAt(p.x, p.z) : 0) + 0.09, p.z), q, new THREE.Vector3(1, 1, 1));
    ms.push(m.clone());
  }
  const geo = kind === 'land' ? new THREE.CylinderGeometry(0.13, 0.14, 0.08, 6) : new THREE.BoxGeometry(0.5, 0.03, 0.13);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.7, emissive: '#5a0e08', emissiveIntensity: 0.5 }), ms.length);
  ms.forEach((x, i) => mesh.setMatrixAt(i, x));
  return mesh;
}

/**
 * (Slice 58) Mount Olympus, standing over Thessaly: a snowy peak of a few
 * craggy cones, the twelve's little temple gleaming gold on the summit, and a
 * ring of cloud about its shoulders. Its own height above the relief (the
 * relief's own hills there are low).
 */
export function olympusModel(): THREE.BufferGeometry {
  const p: Part[] = [];
  const ROCKS = ['#7d7468', '#6c6358', '#8a8072'];
  const SNOW = '#f8f6ef';
  // The massif: a wide grey base and five peaks along a ridge, the middle one highest.
  p.push({ geo: lumpy(new THREE.ConeGeometry(3.5, 1.8, 10, 2).scale(1.05, 1, 0.85).translate(0, 0.9, 0), 0.22, 3), color: ROCKS[0] });
  const peaks: Array<[number, number, number, number]> = [
    [0, 0, 1.6, 4.4],
    [-1.55, 0.35, 1.25, 3.3],
    [1.5, -0.3, 1.2, 3.1],
    [-2.75, 0.75, 0.95, 2.3],
    [2.7, -0.5, 0.95, 2.2],
  ];
  peaks.forEach(([x, z, r, h], i) => {
    p.push({ geo: lumpy(new THREE.ConeGeometry(r, h, 7, 2).translate(x, h / 2, z), 0.12, 11 + i), color: ROCKS[(i + 1) % 3] });
    // The snow on its upper part, streaking down a little.
    p.push({ geo: lumpy(new THREE.ConeGeometry(r * 0.5, h * 0.45, 7, 1).translate(x, h - h * 0.225 + 0.01, z), 0.05, 21 + i), color: SNOW });
  });
  // The gods' house on the summit: a little gold temple.
  p.push({ geo: box(0.4, 0.06, 0.28, 0, 4.3, 0), color: '#e8c04a' });
  p.push({ geo: box(0.34, 0.18, 0.22, 0, 4.36, 0), color: '#fbe9a0' });
  p.push({ geo: prism(0.38, 0.13, 0.12).translate(0, 4.54, 0), color: '#d9a62e' });
  // A few wisps of cloud drifting on its south-east shoulder.
  for (let i = 0; i < 4; i++) {
    const s = 0.34 + hash2(i, 5, 58) * 0.18;
    p.push({ geo: new THREE.IcosahedronGeometry(s, 1).scale(2.2, 0.45, 1).translate(0.9 + i * 0.55, 2.0 + hash2(i, 7, 58) * 0.5, 1.15 + (i % 2) * 0.35), color: '#fbfaf5' });
  }
  return merge(p);
}
