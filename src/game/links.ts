import { SPEEDS, type Speed } from './clockDriver';

/** What a link asks for: a prepared scene, a camera view, a speed, and the screenshot flag. */
export interface Launch {
  demo?: string;
  cam?: string;
  speed?: Speed;
  shot: boolean;
  /** Start with the water overlay on. */
  overlay: boolean;
  /** Draw the city without its finish (the old look), for comparing and measuring. */
  plain: boolean;
  /** Open a saved town: the newest save (`#continue`), the autosave (`#autosave`) or the one saved by hand (`#saved`). */
  load?: 'newest' | 'auto' | 'manual';
}

const LOADS: Record<string, Launch['load']> = { continue: 'newest', autosave: 'auto', saved: 'manual' };

/**
 * Read a link. The published page only receives a bare hash, so links are
 * tokens like `#streets` or `#streets-fast` (parts joined by dashes, each a
 * demo, a camera view, a speed, `overlay`, `plain` or `shot`). Query parameters (`?demo=`,
 * `?cam=`, `?speed=`, `?shot=1`) still work for local runs and win over the hash.
 */
export function readLaunch(search: string, hash: string, demos: Record<string, unknown>, views: Record<string, unknown>): Launch {
  const out: Launch = { shot: false, overlay: false, plain: false };
  for (const part of hash.replace(/^#/, '').toLowerCase().split('-')) {
    if (!part) continue;
    if (part === 'shot') out.shot = true;
    else if (part === 'overlay') out.overlay = true;
    else if (part === 'plain') out.plain = true;
    else if (Object.hasOwn(LOADS, part)) out.load = LOADS[part];
    else if ((SPEEDS as readonly string[]).includes(part)) out.speed = part as Speed;
    else if (part in demos && !out.demo) out.demo = part;
    else if (part in views) out.cam = part;
  }
  const q = new URLSearchParams(search);
  const demo = q.get('demo');
  if (demo && demo in demos) out.demo = demo;
  const cam = q.get('cam');
  if (cam && cam in views) out.cam = cam;
  const speed = q.get('speed');
  if (speed && (SPEEDS as readonly string[]).includes(speed)) out.speed = speed as Speed;
  if (q.has('shot')) out.shot = true;
  if (q.has('overlay')) out.overlay = true;
  if (q.has('plain')) out.plain = true;
  return out;
}
