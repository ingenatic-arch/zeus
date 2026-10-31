/**
 * Slice 54: the twelve gods' emblems, drawn in code as small SVGs in each
 * god's colour (pantheon.ts `GODS[god].emblem` and `.colour`), for the
 * sanctuary chooser's cards and the sanctuary's panel. Later slices may use
 * them for the gods' other cards. Read-only.
 */
import { GODS, type Emblem, type GodId } from '../sim/pantheon';

/** Each emblem's drawing on a 24 x 24 box: `F` is filled in the god's colour, `D` in a deep ink, `S` is a stroke in ink. */
const DRAW: Record<Emblem, string> = {
  // A zigzag bolt, forked at both ends.
  thunderbolt: '<path d="M13.6 1.8 6.4 13h4.8l-2.6 9.2 8.8-12.4h-5l3.4-8z" class="F"/><path d="M6.4 13 4.2 15.4M17.4 9.8l2.4-1.6" class="S"/>',
  // A peacock's fanned tail, eyes on it, its body in front.
  peacock: '<path d="M12 21C5 21 2 14.8 3.4 8.6 6 10.6 8.8 12.2 12 13c3.2-.8 6-2.4 8.6-4.4C22 14.8 19 21 12 21z" class="F"/><circle cx="6.2" cy="12.4" r="1.2" class="D"/><circle cx="9.2" cy="9.8" r="1.2" class="D"/><circle cx="14.8" cy="9.8" r="1.2" class="D"/><circle cx="17.8" cy="12.4" r="1.2" class="D"/><path d="M12 21v-8.6c0-2.4.6-4.6 2-6" class="S"/><circle cx="14.4" cy="5.2" r="1.4" class="D"/>',
  // A trident.
  trident: '<path d="M11 8h2v14h-2z" class="F"/><path d="M5 2.4 6.6 6v2.6c0 1.6 1.4 2.6 3 2.6h4.8c1.6 0 3-1 3-2.6V6L19 2.4M12 1.6v6.6" class="S"/><path d="M4.2 3.4 5 1.4l.8 2zM18.2 3.4l.8-2 .8 2zM11.2 2.2 12 .4l.8 1.8z" class="F"/>',
  // A sheaf of wheat, bound.
  sheaf: '<path d="M12 22c-.6-4-.6-8 0-12M12 22c-2-3.8-4-7-6.6-9.6M12 22c2-3.8 4-7 6.6-9.6" class="S"/><ellipse cx="12" cy="6.4" rx="2.2" ry="4.4" class="F"/><ellipse cx="6" cy="9.4" rx="2" ry="4" transform="rotate(-32 6 9.4)" class="F"/><ellipse cx="18" cy="9.4" rx="2" ry="4" transform="rotate(32 18 9.4)" class="F"/><path d="M8.6 16.4h6.8" class="S"/>',
  // An owl, its big eyes.
  owl: '<path d="M5.6 6 8 8.2C9.2 7.6 10.6 7.4 12 7.4s2.8.2 4 .8L18.4 6l.4 5.6c.6 1.4 1 3 1 4.6 0 3.8-3.4 6-7.8 6s-7.8-2.2-7.8-6c0-1.6.4-3.2 1-4.6z" class="F"/><circle cx="9.2" cy="12" r="2.2" class="W"/><circle cx="14.8" cy="12" r="2.2" class="W"/><circle cx="9.2" cy="12" r="1" class="D"/><circle cx="14.8" cy="12" r="1" class="D"/><path d="m12 13.4-.9 1.6h1.8z" class="D"/>',
  // A lyre: two curved arms, the yoke, the strings.
  lyre: '<path d="M7.4 21.4h9.2c.6-2.2.2-4-1.6-5.2C17 13.6 19 10.4 18.6 6c-.2-2-1.6-3.4-3.2-3.6M7.4 21.4c-.6-2.2-.2-4 1.6-5.2C7 13.6 5 10.4 5.4 6 5.6 4 7 2.6 8.6 2.4" class="S"/><path d="M5.8 6.4h12.4" class="S"/><path d="M9.4 6.6v13.6M11.2 6.6v13.6M12.8 6.6v13.6M14.6 6.6v13.6" class="T"/><path d="M7.2 19.2h9.6v2.4H7.2z" class="F"/>',
  // A bow, drawn, with its arrow.
  bow: '<path d="M6.4 2.6c6.6 2.4 9.6 6 9.6 9.4s-3 7-9.6 9.4" class="FS"/><path d="M6.4 2.6v18.8" class="T"/><path d="M3 12h17" class="S"/><path d="m20.8 12-3-2v4zM3 12l-1.4-1.6M3 12l-1.4 1.6" class="D"/>',
  // A spear and a round shield (Ares).
  spear: '<circle cx="10" cy="14" r="7" class="F"/><circle cx="10" cy="14" r="2.4" class="D"/><path d="M14.4 2.2 21 21" class="S"/><path d="m13.2 1 3.4 1-1.2 3.8z" class="D"/>',
  // A dove in flight.
  dove: '<path d="M2.6 13.4c3.2.2 5.6-.6 7.4-2.6C11.4 7.4 13.6 4.2 18 3.2c-1.4 2.4-1.8 4.8-1 7.4 2-.4 3.6 0 4.6 1-1.4.2-2.6.8-3.4 1.8-1.6 3.8-5.2 6.2-9.6 6.2L5.4 22l.4-3.2c-1.6-1.2-2.6-3-3.2-5.4z" class="F"/><circle cx="16.8" cy="11.4" r=".8" class="D"/><path d="m21.6 11.6 1.4-.4" class="S"/>',
  // A smith's hammer over an anvil.
  hammer: '<path d="M3 16.4h13.4l-2.2 2.2v2.6H5.8v-2.6z" class="D"/><path d="M16.4 16.4 21 15.2v1.2z" class="D"/><path d="m9.6 13.6 7.6-9.4" class="S"/><path d="m14.6 2 5.6 4.4-1.8 2.2-5.6-4.4z" class="F"/>',
  // The caduceus: a winged staff, two snakes about it.
  caduceus: '<path d="M12 4v18" class="S"/><path d="M12 5.4C9 4 6 4.4 3.4 6.4c2.8.2 5.6 0 8.6-1M12 5.4c3-1.4 6-1 8.6 1-2.8.2-5.6 0-8.6-1" class="F"/><path d="M9 8.6c0 2 6 2.6 6 4.8s-6 2.6-6 4.8 3 2.4 3 2.4M15 8.6c0 2-6 2.6-6 4.8s6 2.6 6 4.8-3 2.4-3 2.4" class="T2"/><circle cx="12" cy="3.2" r="1.4" class="F"/>',
  // A vine: grapes hanging under a leaf.
  vine: '<path d="M4 3.6c3.6.4 6 2 8 4.4 2-2.4 4.4-4 8-4.4" class="S"/><path d="M12 8c-2.4-2.4-5.6-2-6.8.2 2.6.6 4.6.6 6.8-.2z" class="D"/><circle cx="10" cy="11" r="1.9" class="F"/><circle cx="14" cy="11" r="1.9" class="F"/><circle cx="12" cy="14.2" r="1.9" class="F"/><circle cx="8.2" cy="14.4" r="1.7" class="F"/><circle cx="15.8" cy="14.4" r="1.7" class="F"/><circle cx="10" cy="17.4" r="1.8" class="F"/><circle cx="14" cy="17.4" r="1.8" class="F"/><circle cx="12" cy="20.4" r="1.7" class="F"/>',
};

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** A god's emblem as an SVG in their colour (`cls` on the svg). */
export function godEmblem(god: GodId, cls = 'gem'): string {
  const g = GODS[god];
  const c = hex(g.colour);
  const ink = '#2e2014';
  const body = DRAW[g.emblem]
    .replace(/class="FS"/g, `fill="${c}" fill-opacity=".25" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`)
    .replace(/class="F"/g, `fill="${c}" stroke="${ink}" stroke-width=".9" stroke-linejoin="round"`)
    .replace(/class="D"/g, `fill="${ink}"`)
    .replace(/class="W"/g, `fill="#fbf4e2" stroke="${ink}" stroke-width=".7"`)
    .replace(/class="T2"/g, `fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"`)
    .replace(/class="T"/g, `fill="none" stroke="${ink}" stroke-width=".7"`)
    .replace(/class="S"/g, `fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`);
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

/** A god's colour as CSS. */
export const godColourCss = (god: GodId): string => hex(GODS[god].colour);
