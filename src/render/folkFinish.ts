import * as THREE from 'three';
import { PAL } from './palette';
import type { TPart } from './walkers';

/**
 * The city's finish for people (stage 2 of docs/plans/2026-10-19-city-look.md):
 * every walker's model, as it is built, has its plain shapes swapped for the
 * figure kit's, so each one keeps what it carries and wears and only the body
 * gets finer. A head becomes a rounded head with a nose and a neck; hair, caps
 * and veils round out; a tunic or dress becomes a garment with a waist,
 * shoulders and folds in the skirt; arms get hands and legs get sandals; and
 * the other few-sided shapes (hats, belts, baskets) get more sides.
 *
 * Each part is recognised by the primitive it was made from (three.js keeps a
 * geometry's parameters), and the move, turn and stretch it was given are read
 * back from where its corners ended up, so the finer shape lands exactly where
 * the plain one stood. A shape that was bent out of true (lumpy bundles) is
 * left as it was.
 */

/** The affine map taking `from`'s corners onto `to`'s (same corners in the same order), or null if no single map does. */
function affineBetween(from: THREE.BufferAttribute, to: THREE.BufferAttribute): THREE.Matrix4 | null {
  if (from.count !== to.count || from.count < 4) return null;
  const f = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(from, i);
  const t = (i: number): THREE.Vector3 => new THREE.Vector3().fromBufferAttribute(to, i);
  // Four corners spread as widely as can be: one, the farthest from it, the farthest from that line, the farthest from that plane.
  const p0 = f(0);
  let i1 = 0;
  let best = 0;
  for (let i = 1; i < from.count; i++) {
    const d = f(i).distanceToSquared(p0);
    if (d > best) [best, i1] = [d, i];
  }
  const e1 = f(i1).sub(p0);
  let i2 = 0;
  best = 0;
  for (let i = 1; i < from.count; i++) {
    const d = f(i).sub(p0).cross(e1).lengthSq();
    if (d > best) [best, i2] = [d, i];
  }
  const n = e1.clone().cross(f(i2).sub(p0));
  let i3 = 0;
  best = 0;
  for (let i = 1; i < from.count; i++) {
    const d = Math.abs(f(i).sub(p0).dot(n));
    if (d > best) [best, i3] = [d, i];
  }
  if (best < 1e-12) return null;
  const F = new THREE.Matrix3().set(...colsOf(f(i1).sub(p0), f(i2).sub(p0), f(i3).sub(p0)));
  const T = new THREE.Matrix3().set(...colsOf(t(i1).sub(t(0)), t(i2).sub(t(0)), t(i3).sub(t(0))));
  if (Math.abs(F.determinant()) < 1e-14) return null;
  const A = T.multiply(F.invert());
  const a = A.elements;
  const m = new THREE.Matrix4().set(a[0], a[3], a[6], 0, a[1], a[4], a[7], 0, a[2], a[5], a[8], 0, 0, 0, 0, 1);
  const shift = t(0).sub(p0.clone().applyMatrix4(m));
  m.setPosition(shift);
  // Every corner must land where it is: otherwise the shape was bent, not just moved.
  const v = new THREE.Vector3();
  let size = 0;
  for (let i = 0; i < to.count; i++) size = Math.max(size, t(i).distanceTo(t(0)));
  for (let i = 0; i < from.count; i++) {
    v.fromBufferAttribute(from, i).applyMatrix4(m);
    if (v.distanceTo(t(i)) > Math.max(1e-5, size * 1e-3)) return null;
  }
  return m;
}

/** A 3x3 matrix's row-major entries with the three vectors as its columns. */
function colsOf(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): [number, number, number, number, number, number, number, number, number] {
  return [a.x, b.x, c.x, a.y, b.y, c.y, a.z, b.z, c.z];
}

type CylParams = { radiusTop: number; radiusBottom: number; height: number; radialSegments: number; heightSegments: number; openEnded: boolean; thetaStart: number; thetaLength: number };
type IcoParams = { radius: number; detail: number };

/** The part's primitive made afresh (same corners, same order) and the map from it to where the part stands. */
function placed(geo: THREE.BufferGeometry): { kind: 'cyl'; p: CylParams; m: THREE.Matrix4 } | { kind: 'ico'; p: IcoParams; m: THREE.Matrix4 } | null {
  const g = geo as THREE.BufferGeometry & { parameters?: Record<string, unknown> };
  if (!g.parameters) return null;
  let fresh: THREE.BufferGeometry;
  if (g.type === 'CylinderGeometry') {
    const p = g.parameters as CylParams;
    fresh = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
  } else if (g.type === 'IcosahedronGeometry') {
    const p = g.parameters as IcoParams;
    fresh = new THREE.IcosahedronGeometry(p.radius, p.detail);
  } else return null;
  const from = (geo.index ? fresh : fresh.index ? fresh.toNonIndexed() : fresh).attributes.position as THREE.BufferAttribute;
  const m = affineBetween(from, geo.attributes.position as THREE.BufferAttribute);
  fresh.dispose();
  if (!m) return null;
  return g.type === 'CylinderGeometry' ? { kind: 'cyl', p: g.parameters as CylParams, m } : { kind: 'ico', p: g.parameters as IcoParams, m };
}

const V2 = (r: number, y: number): THREE.Vector2 => new THREE.Vector2(r, y);

/** A tunic (short) or a dress (long) in the place of a flared cylinder: a waist, shoulders, folds below the belt, a little flatter front to back. */
function garment(p: CylParams): THREE.BufferGeometry {
  const { radiusTop: rt, radiusBottom: rb, height: h } = p;
  const long = h >= 0.25;
  // Narrower at the belt than at the shoulders, whatever the flare below.
  const w = rt * 0.9;
  const profile = long
    ? [V2(0, -h / 2), V2(rb, -h / 2), V2(rb * 0.95, -h * 0.3), V2(rt * 1.2, h * 0.02), V2(w, h * 0.2), V2(rt * 1.12, h * 0.34), V2(rt * 1.22, h * 0.43), V2(rt * 0.72, h / 2), V2(0, h / 2)]
    : [V2(0, -h / 2), V2(rb, -h / 2), V2(rb * 0.93, -h * 0.28), V2(w, h * 0.08), V2(rt * 1.1, h * 0.3), V2(rt * 1.2, h * 0.42), V2(rt * 0.74, h / 2), V2(0, h / 2)];
  const g = new THREE.LatheGeometry(profile, 12);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const folds = long ? 11 : 9;
  const below = long ? h * 0.2 : h * 0.08;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = y < below ? Math.min(1, (below - y) / (below + h / 2)) * 0.75 + 0.25 : 0;
    const s = 1 + Math.sin(Math.atan2(z, x) * folds) * 0.07 * k;
    pos.setXYZ(i, x * s * 0.78, y, z * s);
  }
  return g;
}

/** Whether a cylinder is a person's tunic or dress: a closed, few-sided, flaring body about a person's height off the ground. */
function isGarment(p: CylParams, m: THREE.Matrix4): boolean {
  if (p.openEnded || p.radialSegments > 8 || p.thetaLength < Math.PI * 1.9) return false;
  if (!(p.radiusBottom > p.radiusTop * 1.25 && p.height >= 0.18 && p.height <= 0.34 && p.radiusTop >= 0.045 && p.radiusTop <= 0.065)) return false;
  const y = new THREE.Vector3().setFromMatrixPosition(m).y;
  return y > 0.13 && y < 0.25;
}

/** The kit for one part: what replaces it (or itself, kept). `heads` are where the heads stand, so hair over one is told from a bundle. */
function refine(part: TPart, heads: THREE.Vector3[]): TPart[] {
  const at = placed(part.geo);
  if (!at) return [part];
  const { m } = at;
  const centre = new THREE.Vector3().setFromMatrixPosition(m);
  const same = (geo: THREE.BufferGeometry, extra: Partial<TPart> = {}): TPart => ({ ...part, ...extra, geo: geo.applyMatrix4(m) });
  if (at.kind === 'ico') {
    const r = at.p.radius;
    if (at.p.detail > 0 || r > 0.09) return [part];
    if (part.color === PAL.skin && r >= 0.045 && r <= 0.07) {
      // A head: rounded, a nose to the front (+x) and a neck down to the shoulders.
      return [
        same(new THREE.SphereGeometry(r * 0.8, 9, 7).scale(0.95, 1.1, 0.9)),
        same(new THREE.ConeGeometry(r * 0.16, r * 0.4, 4).rotateZ(-Math.PI / 2).translate(r * 0.8, -r * 0.08, 0), { color: PAL.skin }),
        same(new THREE.CylinderGeometry(r * 0.3, r * 0.34, r * 0.7, 6).translate(0, -r * 0.95, 0), { color: PAL.skin }),
      ];
    }
    // Hair, a cap, a veil, a mask: rounded out. (Bundles and loads are bent by hand, so never reach here.)
    if (heads.some((h) => h.distanceTo(centre) < 0.07)) return [same(new THREE.SphereGeometry(r * 0.92, 9, 6))];
    return [same(new THREE.IcosahedronGeometry(r, 1))];
  }
  const p = at.p;
  if (isGarment(p, m)) return [same(garment(p))];
  const thin = Math.max(p.radiusTop, p.radiusBottom) < 0.025;
  if (part.color === PAL.skin && thin && p.radialSegments <= 5 && p.height >= 0.07 && p.height <= 0.2) {
    const top = new THREE.Vector3(0, p.height / 2, 0).applyMatrix4(m);
    const foot = new THREE.Vector3(0, -p.height / 2, 0).applyMatrix4(m);
    if (part.leg && foot.y < 0.02 && Math.abs(top.x - foot.x) < 0.02) {
      // A leg: a calf narrowing to the ankle, and a sandal under it, swinging with it.
      return [
        same(new THREE.CylinderGeometry(p.radiusTop * 0.95, p.radiusBottom * 0.72, p.height, 6, 1, false)),
        { geo: new THREE.BoxGeometry(0.05, 0.012, 0.026).translate(foot.x + 0.012, 0.006, foot.z), color: PAL.leather, leg: part.leg },
        { geo: new THREE.CylinderGeometry(p.radiusBottom * 0.8, p.radiusBottom * 0.8, 0.01, 6).translate(foot.x, foot.y + 0.028, foot.z), color: PAL.leather, leg: part.leg },
      ];
    }
    // An arm: its hand at the end away from the shoulder.
    const shoulder = new THREE.Vector3(0, 0.3, Math.sign(centre.z || 1) * 0.065);
    const hand = top.distanceTo(shoulder) > foot.distanceTo(shoulder) ? top : foot;
    return [
      same(new THREE.CylinderGeometry(p.radiusTop * 1.05, p.radiusBottom * 0.85, p.height, 6, 1, p.openEnded, p.thetaStart, p.thetaLength)),
      { geo: new THREE.SphereGeometry(Math.max(p.radiusTop, p.radiusBottom) * 0.95, 6, 4).scale(1, 1.2, 0.8).translate(hand.x, hand.y, hand.z), color: PAL.skin, leg: part.leg },
    ];
  }
  // Anything else few-sided and round (hats, belts, baskets, shields): more sides, so it reads round.
  if (p.radialSegments < 10 && !thin) {
    const sides = Math.max(p.radiusTop, p.radiusBottom) > 0.06 ? 14 : 10;
    return [same(new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, sides, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength))];
  }
  if (p.radialSegments < 6 && thin) return [same(new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 6, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength))];
  return [part];
}

/** A walker's parts with the figure kit in place of its plain shapes. */
export function finishParts(parts: TPart[]): TPart[] {
  const heads: THREE.Vector3[] = [];
  for (const part of parts) {
    if (part.color !== PAL.skin) continue;
    const at = placed(part.geo);
    if (at && at.kind === 'ico' && at.p.detail === 0 && at.p.radius >= 0.045 && at.p.radius <= 0.07) heads.push(new THREE.Vector3().setFromMatrixPosition(at.m));
  }
  return parts.flatMap((part) => refine(part, heads));
}
