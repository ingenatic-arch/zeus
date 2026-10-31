/**
 * Slice 53: the twelve's emblems, drawn here in SVG in each god's colour
 * (the groundwork's table names them): Zeus's thunderbolt, Hera's peacock
 * feather, Poseidon's trident, Demeter's sheaf, Athena's owl, Apollo's lyre,
 * Artemis' bow, Ares' spear, Aphrodite's dove, Hephaestus' hammer, Hermes'
 * caduceus and Dionysus' vine. Each is filled in the god's colour with a
 * darker line of the same hue, on a 32 × 32 box, so the pale ones (Zeus's
 * gold, Artemis' moonlight) still read on parchment.
 */
import { GODS, type Emblem, type GodId } from '../sim/pantheon';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
/** A colour darkened towards ink (k: 0 none, 1 black). */
function shade(n: number, k: number): string {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number): number => Math.round(c * (1 - k));
  return hex((f(r) << 16) | (f(g) << 8) | f(b));
}

/** Each emblem's drawing: `c` its fill, `d` its line, `l` a light touch. */
const DRAW: Record<Emblem, (c: string, d: string, l: string) => string> = {
  thunderbolt: (c, d, l) => `<path d="M18.5 2 7.5 17.2h7.2L10.8 30l13.6-17.6h-7.6L21.4 2z" fill="${c}" stroke="${d}" stroke-width="1.4" stroke-linejoin="round"/><path d="M17.6 5.4 11.8 14" stroke="${l}" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>`,
  peacock: (c, d, l) => `<path d="M16 30.5V13" stroke="${d}" stroke-width="1.4"/><path d="M16 2.2c6.4 3.4 8.6 8.6 6.4 13.4-1.4 3-3.8 4.6-6.4 4.6s-5-1.6-6.4-4.6C7.4 10.8 9.6 5.6 16 2.2z" fill="${c}" stroke="${d}" stroke-width="1.3"/><ellipse cx="16" cy="12.4" rx="3.6" ry="4.4" fill="#e9c650" stroke="${d}" stroke-width=".9"/><ellipse cx="16" cy="12.8" rx="1.9" ry="2.5" fill="#1b2f6a"/><path d="M9.8 16.4 6.6 18.6M22.2 16.4l3.2 2.2M10.4 20.4 7.8 23M21.6 20.4l2.6 2.6" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><circle cx="15.2" cy="11.6" r=".7" fill="${l}"/>`,
  trident: (c, d) => `<path d="M16 31V9" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/><path d="M16 31V9" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/><path d="M7 4.5v6.8c0 2.6 2.2 4.4 5 4.4h8c2.8 0 5-1.8 5-4.4V4.5" fill="none" stroke="${d}" stroke-width="3.4" stroke-linejoin="round"/><path d="M7 4.5v6.8c0 2.6 2.2 4.4 5 4.4h8c2.8 0 5-1.8 5-4.4V4.5" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 2.2 13.6 7h4.8zM7 1.6 5 6h4zM25 1.6 23 6h4z" fill="${c}" stroke="${d}" stroke-width=".9" stroke-linejoin="round"/>`,
  sheaf: (c, d, l) => `<path d="M16 30 9.4 13M16 30l6.6-17M16 30V11M16 30l-3.4-17.6M16 30l3.4-17.6" stroke="${d}" stroke-width="1.2"/><g fill="${c}" stroke="${d}" stroke-width=".8"><ellipse cx="9" cy="10" rx="2" ry="4.4" transform="rotate(-22 9 10)"/><ellipse cx="12.4" cy="8" rx="2" ry="4.6" transform="rotate(-10 12.4 8)"/><ellipse cx="16" cy="6.6" rx="2.1" ry="4.8"/><ellipse cx="19.6" cy="8" rx="2" ry="4.6" transform="rotate(10 19.6 8)"/><ellipse cx="23" cy="10" rx="2" ry="4.4" transform="rotate(22 23 10)"/></g><path d="M11.4 21.6h9.2l-.8 3h-7.6z" fill="#a8452a" stroke="${d}" stroke-width=".9"/><path d="M14.6 5.2v3" stroke="${l}" stroke-width=".8" opacity=".9"/>`,
  owl: (c, d, l) => `<path d="M8.6 7.4 10 3.4l3.4 3.2h5.2L22 3.4l1.4 4c1.6 2 2.4 4.6 2.4 7.6 0 8.6-4.4 14.6-9.8 14.6S6.2 23.6 6.2 15c0-3 .8-5.6 2.4-7.6z" fill="${c}" stroke="${d}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12.3" cy="12" r="3.4" fill="${l}" stroke="${d}" stroke-width=".9"/><circle cx="19.7" cy="12" r="3.4" fill="${l}" stroke="${d}" stroke-width=".9"/><circle cx="12.3" cy="12" r="1.5" fill="#22201c"/><circle cx="19.7" cy="12" r="1.5" fill="#22201c"/><path d="M16 14.2 14.8 16.6h2.4z" fill="#d49a32"/><path d="M11 20.4l2 1.4 3-1.4 3 1.4 2-1.4M11.6 23.8l2 1.4 2.4-1.2 2.4 1.2 2-1.4" fill="none" stroke="${d}" stroke-width=".8" opacity=".75"/>`,
  lyre: (c, d) => `<path d="M8.6 4.2C5.2 6.6 5 12 8 16.4c1.6 2.4 2.4 4.6 2.4 7.4v3.6h11.2v-3.6c0-2.8.8-5 2.4-7.4 3-4.4 2.8-9.8-.6-12.2" fill="none" stroke="${d}" stroke-width="3.6" stroke-linecap="round"/><path d="M8.6 4.2C5.2 6.6 5 12 8 16.4c1.6 2.4 2.4 4.6 2.4 7.4v3.6h11.2v-3.6c0-2.8.8-5 2.4-7.4 3-4.4 2.8-9.8-.6-12.2" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M7.4 8.4h17.2" stroke="${d}" stroke-width="2.2" stroke-linecap="round"/><path d="M12.6 8.8v18M15 8.8v18M17.4 8.8v18M19.8 8.8v18" stroke="${d}" stroke-width=".7"/><rect x="9.6" y="26.2" width="12.8" height="3.2" rx="1" fill="${c}" stroke="${d}" stroke-width="1"/>`,
  bow: (c, d, l) => `<path d="M9 3.2c9.4 5 12.4 9.6 12.4 12.8S18.4 23.8 9 28.8" fill="none" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/><path d="M9 3.2c9.4 5 12.4 9.6 12.4 12.8S18.4 23.8 9 28.8" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/><path d="M9 3.2v25.6" stroke="${d}" stroke-width=".8"/><path d="M5 16h22.6" stroke="${d}" stroke-width="1.4"/><path d="M30 16l-3.8-2.4v4.8z" fill="${c}" stroke="${d}" stroke-width=".8"/><path d="M3 13.6 6 16l-3 2.4M5 13.6 8 16l-3 2.4" fill="none" stroke="${d}" stroke-width=".9"/><path d="M11 6.2c2 1.2 3.6 2.4 4.8 3.6" stroke="${l}" stroke-width=".8" opacity=".8"/>`,
  spear: (c, d, l) => `<path d="M5 29 22.4 9.6" stroke="#6e4a26" stroke-width="2.6" stroke-linecap="round"/><path d="M21 6.6c2.4-2.6 5.4-4 8.4-4.4-.4 3-1.8 6-4.4 8.4l-2.8.6-1.8-1.8z" fill="${c}" stroke="${d}" stroke-width="1.2" stroke-linejoin="round"/><path d="M23.4 8.4 27.4 4.4" stroke="${l}" stroke-width=".8" opacity=".85"/><path d="M19.8 10.6l1.6 1.6" stroke="${d}" stroke-width="2.6"/><path d="M3.6 30.4 6.4 27.6" stroke="${d}" stroke-width="3" stroke-linecap="round"/><path d="M13 22c-3.6 1.6-6.6 1.2-8.8-1.2 2.6-.6 5.2-.6 7.4.2z" fill="${c}" stroke="${d}" stroke-width=".8" opacity=".9"/>`,
  dove: (c, d, l) => `<path d="M3.4 17.6c3.4-.8 6-.4 8 .8 1.6-4.4 5-8 10.2-9.2 1.4-2.6 3.4-4 6-4l1 1.4-2.6 1.2c.6 1.4.6 3 .2 4.6-1.4 6.2-6.6 10.4-13.4 10.6l-3.6 4.4-1-4.2c-2-1-3.6-2.8-4.8-5.6z" fill="${c}" stroke="${d}" stroke-width="1.2" stroke-linejoin="round"/><path d="M12.4 18.6c2.6-4.8 5.8-7.6 9.8-8.4-1 4.8-4.6 8.6-9.8 8.4z" fill="${l}" stroke="${d}" stroke-width=".8"/><circle cx="25.6" cy="7.4" r=".9" fill="#22201c"/><path d="M28.6 6.6 31 7l-2.4 1.2" fill="#d49a32"/>`,
  hammer: (c, d, l) => `<path d="M16.4 13.6 9.2 29.4" stroke="#6e4a26" stroke-width="3.2" stroke-linecap="round"/><path d="M6.4 6.8l11.8-4.6 4.4 1.2 2.6 6.6-2.4 1.4-1.6-2.4L9.6 13.4z" fill="${c}" stroke="${d}" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 7.6l9.6-3.8" stroke="${l}" stroke-width=".9" opacity=".85"/><path d="M5.6 7.2 9 13.8" stroke="${d}" stroke-width="2.6" stroke-linecap="round"/><path d="M24 22l3 1.4M23.2 25.2l3.4.2M21.4 27.6l2.4 1.8" stroke="#e9a43a" stroke-width="1.2" stroke-linecap="round"/>`,
  caduceus: (c, d) => `<path d="M16 7v23.4" stroke="${d}" stroke-width="2.6" stroke-linecap="round"/><path d="M16 7v23.4" stroke="#e7c766" stroke-width="1.2" stroke-linecap="round"/><path d="M15.4 6.4C12.4 3 7.4 2.8 3.4 5c3 .6 5.2 1.8 6.8 3.6l5.2.6zM16.6 6.4c3-3.4 8-3.6 12-1.4-3 .6-5.2 1.8-6.8 3.6l-5.2.6z" fill="${c}" stroke="${d}" stroke-width="1" stroke-linejoin="round"/><circle cx="16" cy="5.4" r="2" fill="#e7c766" stroke="${d}" stroke-width=".9"/><path d="M12 11.6c0 2.6 8 3 8 6.2s-8 3.4-8 6.4 8 2.8 8 5M20 11.6c0 2.6-8 3-8 6.2s8 3.4 8 6.4-8 2.8-8 5" fill="none" stroke="${d}" stroke-width="2.6" stroke-linecap="round"/><path d="M12 11.6c0 2.6 8 3 8 6.2s-8 3.4-8 6.4 8 2.8 8 5M20 11.6c0 2.6-8 3-8 6.2s8 3.4 8 6.4-8 2.8-8 5" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>`,
  vine: (c, d, l) => `<path d="M16 3.6c-1.4 2.6-1.6 4.6-.4 6.6" stroke="#5a7a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M15.4 6.2c3-2.6 7.4-3 10.4-1.2-.6 3.2-3.6 5.6-7.4 5.8z" fill="#6f9a3a" stroke="#3e5a1a" stroke-width=".9"/><g fill="${c}" stroke="${d}" stroke-width=".8"><circle cx="12.4" cy="12.6" r="2.6"/><circle cx="17.4" cy="12.4" r="2.6"/><circle cx="21.6" cy="14.4" r="2.4"/><circle cx="10.4" cy="17" r="2.5"/><circle cx="15.2" cy="16.8" r="2.6"/><circle cx="20" cy="18.6" r="2.5"/><circle cx="12.6" cy="21.4" r="2.5"/><circle cx="17.4" cy="22.2" r="2.5"/><circle cx="15" cy="26.4" r="2.4"/></g><g fill="${l}" opacity=".7"><circle cx="11.6" cy="11.8" r=".7"/><circle cx="16.6" cy="11.6" r=".7"/><circle cx="14.4" cy="16" r=".7"/><circle cx="11.8" cy="20.6" r=".7"/></g>`,
};

/** A god's emblem, drawn in their colour: an SVG string (class `emb`, sized by its place). */
export function emblemSvg(god: GodId, cls = 'emb'): string {
  const G = GODS[god];
  const c = hex(G.colour);
  // (Pale colours get a deeper line, dark ones a lighter touch on top.)
  const lum = (((G.colour >> 16) & 255) * 0.3 + ((G.colour >> 8) & 255) * 0.59 + (G.colour & 255) * 0.11) / 255;
  const d = shade(G.colour, lum > 0.7 ? 0.62 : 0.55);
  const l = lum > 0.7 ? '#ffffff' : '#fff6dc';
  return `<svg viewBox="0 0 32 32" class="${cls}" aria-hidden="true">${DRAW[G.emblem](c, d, l)}</svg>`;
}

/** A god's colour as CSS. */
export const godColour = (god: GodId): string => hex(GODS[god].colour);
