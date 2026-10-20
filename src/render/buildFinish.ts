import * as THREE from 'three';
import { PAL } from './palette';
import type { Part } from './trees';

/**
 * The city's finish for buildings (stage 3 of docs/plans/2026-10-19-city-look.md):
 * as each building's model is merged, its plain walls get the stonework that
 * makes them read as built: a stone surround, sill and lintel round every
 * window, jambs and a lintel round every door, a moulded cornice under the
 * eaves, and a string course between the floors of a two-storey wall.
 *
 * Walls, windows and doors are found by what they are made of: upright boxes
 * of whitewash or stucco, and the dark boxes of the panes and doors set in
 * them. Each surround is centred on the wall's face, so half of it sinks into
 * the wall and half stands proud, whichever way the wall faces.
 */

/** Limestone for the surrounds; a paler stone for the cornice and the string course. */
const STONE = '#d8c6a1';
const CORNICE = '#e6d9be';

type Box = { min: THREE.Vector3; max: THREE.Vector3; size: THREE.Vector3 };

/** A part's extent, if it is a box standing square to the axes (as walls, panes and doors are). */
function squareBox(geo: THREE.BufferGeometry): Box | null {
  const g = geo as THREE.BufferGeometry & { parameters?: { width: number; height: number; depth: number } };
  if (g.type !== 'BoxGeometry' || !g.parameters) return null;
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const size = b.getSize(new THREE.Vector3());
  // Turned only by quarter turns: its extent is its own sides (in some order), not a tilted box's.
  const own = [g.parameters.width, g.parameters.height, g.parameters.depth].sort((a, c) => a - c);
  const got = [size.x, size.y, size.z].sort((a, c) => a - c);
  const scaled = got[2] / Math.max(own[2], 1e-9);
  if (own.some((v, i) => Math.abs(v * scaled - got[i]) > 1e-4)) return null;
  return { min: b.min.clone(), max: b.max.clone(), size };
}

const slab = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

/** A box `t` thick through a face (across `axis`, centred on `at`), spanning `a0..a1` along the face and `y0..y1` up it. */
function onFace(axis: 'x' | 'z', at: number, t: number, a0: number, a1: number, y0: number, y1: number): THREE.BufferGeometry {
  return axis === 'x' ? slab(at - t / 2, y0, a0, at + t / 2, y1, a1) : slab(a0, y0, at - t / 2, a1, y1, at + t / 2);
}

/** The frame round an opening (a pane or a door) set in a wall facing along `axis`. */
function surround(b: Box, door: boolean): Part[] {
  const axis: 'x' | 'z' = b.size.x < b.size.z ? 'x' : 'z';
  const at = axis === 'x' ? (b.min.x + b.max.x) / 2 : (b.min.z + b.max.z) / 2;
  const a0 = axis === 'x' ? b.min.z : b.min.x;
  const a1 = axis === 'x' ? b.max.z : b.max.x;
  const j = door ? 0.035 : 0.022;
  const out: Part[] = [
    // Jambs either side.
    { geo: onFace(axis, at, 0.045, a0 - j, a0, b.min.y, b.max.y), color: STONE },
    { geo: onFace(axis, at, 0.045, a1, a1 + j, b.min.y, b.max.y), color: STONE },
    // The lintel, a little wider than the jambs.
    { geo: onFace(axis, at, 0.055, a0 - j - 0.012, a1 + j + 0.012, b.max.y, b.max.y + (door ? 0.05 : 0.032)), color: STONE },
  ];
  // A window's sill, standing out further to shed the rain.
  if (!door) out.push({ geo: onFace(axis, at, 0.075, a0 - j - 0.008, a1 + j + 0.008, b.min.y - 0.026, b.min.y), color: STONE });
  return out;
}

const isWall = (p: Part, b: Box): boolean => (p.color === PAL.whitewash || p.color === PAL.villaWall) && b.size.y >= 0.4 && b.size.x >= 0.4 && b.size.z >= 0.4;
const isPane = (p: Part, b: Box): boolean => p.color === PAL.door && Math.min(b.size.x, b.size.z) <= 0.035 && Math.max(b.size.x, b.size.z) >= 0.07 && Math.max(b.size.x, b.size.z) <= 0.17 && b.size.y >= 0.08 && b.size.y <= 0.2;
const isDoor = (p: Part, b: Box): boolean => p.color === PAL.door && Math.min(b.size.x, b.size.z) <= 0.045 && Math.max(b.size.x, b.size.z) >= 0.12 && Math.max(b.size.x, b.size.z) <= 0.32 && b.size.y >= 0.24 && b.size.y <= 0.5;

/** A building's parts with the stonework added. */
export function finishBuilding(parts: Part[]): Part[] {
  const boxes = parts.map((p) => squareBox(p.geo));
  // Painted bands under the eaves (townhouses, villas): the cornice goes under them instead.
  const bands = parts.flatMap((p, i) => (boxes[i] && (p.color === PAL.bandBlue || p.color === PAL.bandOchre || p.color === PAL.villaBand || p.color === PAL.marble) ? [boxes[i]!] : []));
  const extra: Part[] = [];
  parts.forEach((p, i) => {
    const b = boxes[i];
    if (!b) return;
    if (isPane(p, b)) extra.push(...surround(b, false));
    else if (isDoor(p, b)) extra.push(...surround(b, true));
    else if (isWall(p, b)) {
      const { min, max } = b;
      // Bands wrapped round the wall's top, one under the next.
      const round = bands.filter((d) => d.min.x <= min.x + 0.02 && d.max.x >= max.x - 0.02 && d.min.z <= min.z + 0.02 && d.max.z >= max.z - 0.02 && d.size.y < 0.15);
      let top = max.y;
      for (let more = true; more; ) {
        more = false;
        for (const d of round) if (d.max.y >= top - 0.002 && d.min.y < top - 0.002 && d.max.y <= max.y + 0.002) [top, more] = [d.min.y, true];
      }
      // The cornice: a fillet and a broader moulding over it.
      extra.push({ geo: slab(min.x - 0.012, top - 0.05, min.z - 0.012, max.x + 0.012, top - 0.03, max.z + 0.012), color: CORNICE });
      extra.push({ geo: slab(min.x - 0.026, top - 0.03, min.z - 0.026, max.x + 0.026, top, max.z + 0.026), color: CORNICE });
      // Between the floors of a two-storey wall.
      if (b.size.y >= 0.85) {
        const y = min.y + b.size.y * 0.5;
        extra.push({ geo: slab(min.x - 0.014, y, min.z - 0.014, max.x + 0.014, y + 0.03, max.z + 0.014), color: CORNICE });
      }
    }
  });
  return extra.length ? [...parts, ...extra] : parts;
}
