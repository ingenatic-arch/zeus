import * as THREE from 'three';
import { TreeKind } from '../map/bake';
import { hash2 } from '../map/noise';
import { finishOn } from './finish';
import { col, PAL } from './palette';

/**
 * Exploration only (the city-look mock-ups): fuller plants for look A. A crown
 * is a cloud of small leaf clumps whose normals point out from the crown's
 * middle, so it shades as one soft mass with a broken, leafy edge instead of
 * a few big facets. Branches reach from the trunk into the crown.
 */

type Soft = { geo: THREE.BufferGeometry; color: THREE.Color; centre?: THREE.Vector3; soft?: number };

const rand = (i: number, j: number, seed: number): number => hash2(i, j, seed);

function nudge(geo: THREE.BufferGeometry, amount: number, seed: number): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = Math.round(x * 97) * 7 + Math.round(y * 89) * 13 + Math.round(z * 83) * 17;
    const s = 1 + (hash2(k, 1, seed) - 0.5) * amount;
    p.setXYZ(i, x * s, y * (1 + (hash2(k, 2, seed) - 0.5) * amount), z * s);
  }
  return geo;
}

/** Merge parts, keeping smooth normals (or crown normals: out from a centre, blended with the face). */
function mergeSoft(parts: Soft[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const colr: number[] = [];
  const v = new THREE.Vector3();
  const f = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const part of parts) {
    const g0 = part.geo;
    if (!g0.attributes.normal) g0.computeVertexNormals();
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      pos.push(v.x, v.y, v.z);
      if (part.centre) {
        const t = i - (i % 3);
        a.fromBufferAttribute(p, t);
        b.fromBufferAttribute(p, t + 1);
        c.fromBufferAttribute(p, t + 2);
        f.subVectors(b, a).cross(c.clone().sub(a)).normalize();
        const out = v.clone().sub(part.centre).normalize();
        if (f.dot(out) < 0) f.negate();
        out.lerp(f, part.soft ?? 0.3).normalize();
        nor.push(out.x, out.y, out.z);
      } else {
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
      }
      colr.push(part.color.r, part.color.g, part.color.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  out.computeBoundingSphere();
  return out;
}

/** A tapered limb from one point to another. */
function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, sides = 6): THREE.BufferGeometry {
  const d = to.clone().sub(from);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), sides, 1);
  g.translate(0, d.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

interface CrownOpts {
  centre: THREE.Vector3;
  radius: THREE.Vector3;
  clumps: number;
  size: [number, number];
  light: string;
  dark: string;
  seed: number;
  /** Squash each clump vertically (needles and leaves lie in flat sprays). */
  flat?: number;
  /** Bias clumps to the shell (1) or fill (0). */
  shell?: number;
  /** Rounder clumps (four times the corners): for the big trees, which are few. */
  fine?: boolean;
}

function crown(o: CrownOpts, out: Soft[]): THREE.Vector3[] {
  const light = col(o.light);
  const dark = col(o.dark);
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < o.clumps; i++) {
    // A point in the ellipsoid, pushed out towards its shell.
    const u = rand(i, 1, o.seed) * 2 - 1;
    const th = rand(i, 2, o.seed) * Math.PI * 2;
    const rr = Math.pow(rand(i, 3, o.seed), 1 - (o.shell ?? 0.6) * 0.8);
    const s = Math.sqrt(1 - u * u);
    const p = new THREE.Vector3(s * Math.cos(th) * rr * o.radius.x, u * rr * o.radius.y, s * Math.sin(th) * rr * o.radius.z).add(o.centre);
    spots.push(p);
    const r = o.size[0] + (o.size[1] - o.size[0]) * rand(i, 4, o.seed);
    const geo = nudge(new THREE.IcosahedronGeometry(r, o.fine ? 1 : 0), 0.3, o.seed + i);
    geo.scale(1, o.flat ?? 0.8, 1).rotateY(rand(i, 5, o.seed) * 3).translate(p.x, p.y, p.z);
    // Lighter on top and towards the sun, darker underneath and inside.
    const up = (p.y - o.centre.y) / o.radius.y;
    const k = THREE.MathUtils.clamp(0.5 + up * 0.45 + (rand(i, 6, o.seed) - 0.5) * 0.4, 0, 1);
    out.push({ geo, color: dark.clone().lerp(light, k), centre: o.centre, soft: 0.12 });
  }
  return spots;
}

function olive(seed: number): THREE.BufferGeometry {
  const parts: Soft[] = [];
  const bark = col('#6e5f50');
  // A gnarled, leaning trunk in three kinked pieces, splitting into boughs.
  const p0 = new THREE.Vector3(0, -0.05, 0);
  const p1 = new THREE.Vector3(0.06, 0.22, 0.02);
  const p2 = new THREE.Vector3(-0.02, 0.46, -0.03);
  parts.push({ geo: limb(p0, p1, 0.085, 0.065, 7), color: bark }, { geo: limb(p1, p2, 0.065, 0.05, 7), color: bark });
  const c = new THREE.Vector3(0.02, 0.86, 0);
  const spots = crown({ centre: c, radius: new THREE.Vector3(0.55, 0.32, 0.5), clumps: 11, size: [0.13, 0.19], light: '#aab37e', dark: '#59653f', seed, shell: 0.8, flat: 0.7, fine: true }, parts);
  for (let i = 0; i < 4; i++) {
    const to = spots[i].clone().lerp(c, 0.25);
    parts.push({ geo: limb(p2, to, 0.035, 0.015, 5), color: bark });
  }
  return mergeSoft(parts);
}

function pine(seed: number): THREE.BufferGeometry {
  const parts: Soft[] = [];
  const bark = col('#7a5a40');
  // The stone pine: a tall bare trunk, boughs fanning out to a wide flat umbrella.
  const base = new THREE.Vector3(0, -0.05, 0);
  const top = new THREE.Vector3(0.12, 1.42, 0.02);
  parts.push({ geo: limb(base, top, 0.11, 0.07, 7), color: bark });
  const c = new THREE.Vector3(0.1, 1.72, 0);
  const spots = crown({ centre: c, radius: new THREE.Vector3(0.85, 0.2, 0.8), clumps: 12, size: [0.18, 0.27], light: '#628c44', dark: '#2c4a28', seed, flat: 0.5, shell: 0.55, fine: true }, parts);
  for (let i = 0; i < 6; i++) parts.push({ geo: limb(top, spots[i].clone().setY(spots[i].y - 0.1), 0.05, 0.02, 5), color: bark });
  return mergeSoft(parts);
}

function cypress(seed: number): THREE.BufferGeometry {
  const parts: Soft[] = [];
  parts.push({ geo: limb(new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(0, 0.3, 0), 0.06, 0.05, 5), color: col(PAL.trunk) });
  // A dark green flame: rings of upright sprays, widest a third of the way up.
  const light = col('#4f7a44');
  const dark = col('#22392a');
  const levels = 9;
  for (let l = 0; l < levels; l++) {
    const t = l / (levels - 1);
    const y = 0.25 + t * 1.95;
    const r = 0.27 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) * (1 - t * 0.35) + 0.04;
    const n = Math.max(2, Math.round(r * 16));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(l, i, seed) * 0.8;
      const p = new THREE.Vector3(Math.cos(a) * r * 0.55, y, Math.sin(a) * r * 0.55);
      const s = r * (0.75 + 0.3 * rand(l, i + 9, seed));
      const geo = nudge(new THREE.IcosahedronGeometry(s, 0), 0.3, seed + l * 31 + i);
      geo.scale(0.9, 1.6, 0.9).translate(p.x, p.y, p.z);
      const k = THREE.MathUtils.clamp(0.35 + 0.4 * Math.cos(a - 2.4) * 0.5 + t * 0.3 + (rand(i, l, seed) - 0.5) * 0.3, 0, 1);
      parts.push({ geo, color: dark.clone().lerp(light, k), centre: new THREE.Vector3(0, y, 0), soft: 0.3 });
    }
  }
  return mergeSoft(parts);
}

function scrub(seed: number): THREE.BufferGeometry {
  const parts: Soft[] = [];
  crown({ centre: new THREE.Vector3(0, 0.14, 0), radius: new THREE.Vector3(0.32, 0.14, 0.3), clumps: 3, size: [0.13, 0.18], light: '#97a35a', dark: '#54633a', seed, shell: 0.5 }, parts);
  return mergeSoft(parts);
}

function broom(seed: number): THREE.BufferGeometry {
  const parts: Soft[] = [];
  const spots = crown({ centre: new THREE.Vector3(0, 0.18, 0), radius: new THREE.Vector3(0.28, 0.16, 0.28), clumps: 3, size: [0.13, 0.17], light: '#8f9a52', dark: '#56643a', seed, shell: 0.5 }, parts);
  const gold = col('#e2b83a');
  const deep = col('#c9932a');
  for (let i = 0; i < 6; i++) {
    const s = spots[i % spots.length];
    const p = s.clone().add(new THREE.Vector3((rand(i, 1, seed + 3) - 0.5) * 0.16, 0.06 + rand(i, 2, seed + 3) * 0.05, (rand(i, 3, seed + 3) - 0.5) * 0.16));
    parts.push({ geo: new THREE.OctahedronGeometry(0.035, 0).translate(p.x, p.y, p.z), color: rand(i, 4, seed) > 0.5 ? gold : deep, centre: s, soft: 0.5 });
  }
  return mergeSoft(parts);
}

/** The look's model for a kind of plant, or null to keep today's. */
export function lookTreeModel(kind: TreeKind): THREE.BufferGeometry | null {
  if (!finishOn()) return null;
  switch (kind) {
    case TreeKind.Olive:
      return olive(301);
    case TreeKind.Pine:
      return pine(302);
    case TreeKind.Cypress:
      return cypress(303);
    case TreeKind.Scrub:
      return scrub(304);
    case TreeKind.Broom:
      return broom(305);
    default:
      return null;
  }
}
