/**
 * A colony's picture on its page (slice 43), drawn in code as SVG: its island
 * over the sea, and on it what the colony has become. An outpost is tents, a
 * cook fire and a boat drawn up on the beach; a settlement a few white houses
 * with red roofs and a pen; a town a dozen up the slope; a city houses on
 * terraces up to the hilltop. Its works stand where they would: fields in
 * green and gold strips on the left slope, a stone mole with a jetty and a
 * second ship (the harbour), a colonnaded square (the agora), a temple on the
 * hilltop, a wall with towers round the houses, and its second trade's mark
 * on the right slope. A funded work is marked out in a dashed line until its
 * goods land, then stands in scaffolding until built.
 *
 * Colours are the original look's: green grass, white walls, orange tiles, a
 * blue sea. It only reads the colony's record.
 */
import { PLACES } from '../map/greece';
import { hash2 } from '../map/noise';
import { secondGood, stageOf, STAGE_NAMES, workOf, type WorkKind } from '../sim/colonyworks';
import type { Colony } from '../sim/colonies';
import { CHEESE, FLEECE, HORSES, MARBLE, OIL, WINE } from '../sim/foods';
import { TRADE_GOODS } from '../sim/trade';

const W = 360;
const H = 160;
const COAST = 118;

const SKY_TOP = '#bcd9e6';
const SKY_LOW = '#eef4ea';
const SEA = '#3f8fb8';
const SEA_LIGHT = '#6fb0cf';
const GRASS = '#8fb455';
const GRASS_DARK = '#7a9e47';
const HILL = '#b8a47a';
const HILL_DARK = '#a08b62';
const BEACH = '#e8d7a3';
const WALL = '#f3ead6';
const WALL_SHADE = '#ddd0b2';
const ROOF = '#c8643b';
const ROOF_DARK = '#a8502e';
const STONE = '#d9c9a2';
const STONE_DARK = '#b8a47e';
const MARBLE_C = '#f8f4e8';
const WOOD = '#8a5a34';
const FIELD_GREEN = '#a5c459';
const FIELD_GOLD = '#dcbc52';
const TENT = '#efe2c4';
const INK = '#4a3420';

/** How a work stands in the picture: not there, marked out (its goods on the way), going up, or built. */
type Look = 'none' | 'marked' | 'building' | 'built';

const f1 = (n: number): string => n.toFixed(1);

/** Where houses stand, from the shore up the slope (the first ones nearest the beach). */
const HOUSE_SPOTS: ReadonlyArray<[number, number]> = [
  // By the beach, the middle first; then up the slope round the open square of the agora, row by row.
  [178, 116], [196, 117], [162, 115], [212, 116], [146, 114], [228, 115], [244, 114],
  [138, 104], [156, 104], [228, 104], [246, 104], [262, 106],
  [132, 93], [150, 93], [166, 92], [228, 92], [245, 93], [260, 95],
  [150, 81], [167, 80], [184, 80], [201, 80], [218, 80], [235, 81], [252, 83],
  [168, 69], [186, 68], [204, 68], [222, 69], [239, 71],
  [188, 58], [206, 57], [223, 59],
];

/** A little house: a white front, a shaded side and an orange roof. */
function house(x: number, y: number, k: number, op = 1): string {
  const w = 12 + hash2(k, 3, 91) * 4;
  const h = 7 + hash2(k, 4, 91) * 2.5;
  const side = 4;
  const roof = hash2(k, 5, 91) < 0.6 ? ROOF : ROOF_DARK;
  return `<g opacity="${op}"><path d="M${f1(x - w / 2)} ${f1(y)}h${f1(w)}v${f1(-h)}h${f1(-w)}z" fill="${WALL}"/><path d="M${f1(x + w / 2)} ${f1(y)}l${side} -2v${f1(-h)}l-${side} 2z" fill="${WALL_SHADE}"/><path d="M${f1(x - w / 2 - 1)} ${f1(y - h)}l${f1(w / 2 + 1)} -4.5l${f1(w / 2 + 1)} 4.5z" fill="${roof}"/><path d="M${f1(x + w / 2 + 1)} ${f1(y - h)}l${side} -2l-${f1(w / 2 + 1)} -4.5l-${side - 1} 0z" fill="${ROOF_DARK}"/><rect x="${f1(x - 1)}" y="${f1(y - 3.5)}" width="2" height="3.5" fill="${INK}" opacity="0.55"/></g>`;
}

/** A tent in cream with a stripe in your colours. */
function tent(x: number, y: number, colour: string): string {
  return `<path d="M${x - 10} ${y}l10 -14l10 14z" fill="${TENT}" stroke="${WALL_SHADE}" stroke-width="0.6"/><path d="M${x} ${y - 14}l10 14l3 -1l-9 -13z" fill="${WALL_SHADE}"/><path d="M${x - 4} ${y - 5.6}l4 -5.6l4 5.6z" fill="${colour}"/><path d="M${x - 2} ${y}l2 -4l2 4z" fill="${INK}" opacity="0.5"/>`;
}

/** A merchant ship: a dark hull, a mast and a sail (furled at a jetty). */
function ship(x: number, y: number, colour: string, furled: boolean, scale = 1): string {
  const s = scale;
  const sail = furled ? `<rect x="${f1(x - 6 * s)}" y="${f1(y - 13 * s)}" width="${f1(12 * s)}" height="${f1(2 * s)}" fill="${colour}"/>` : `<path d="M${f1(x - 7 * s)} ${f1(y - 17 * s)}h${f1(14 * s)}v${f1(10 * s)}h${f1(-14 * s)}z" fill="${colour}"/><path d="M${f1(x - 7 * s)} ${f1(y - 15 * s)}h${f1(14 * s)}" stroke="${WALL}" stroke-width="${f1(1.2 * s)}"/>`;
  return `<path d="M${f1(x - 12 * s)} ${f1(y - 3 * s)}h${f1(24 * s)}l-${f1(4 * s)} ${f1(4 * s)}h-${f1(16 * s)}z" fill="#6e4426"/><path d="M${f1(x)} ${f1(y - 3 * s)}v${f1(-16 * s)}" stroke="${WOOD}" stroke-width="${f1(1.1 * s)}"/>${sail}`;
}

/** Scaffolding: poles and ladders of timber over a work going up, inside a box. */
function scaffold(x: number, y: number, w: number, h: number): string {
  let p = '';
  for (let i = 0; i <= 3; i++) p += `M${f1(x + (w * i) / 3)} ${f1(y)}v${f1(-h)}`;
  for (let j = 1; j <= 2; j++) p += `M${f1(x)} ${f1(y - (h * j) / 3)}h${f1(w)}`;
  p += `M${f1(x)} ${f1(y)}L${f1(x + w / 3)} ${f1(y - h)}M${f1(x + (2 * w) / 3)} ${f1(y)}L${f1(x + w)} ${f1(y - h)}`;
  return `<path d="${p}" stroke="${WOOD}" stroke-width="0.9" fill="none"/>`;
}

/** A work's shape drawn as it stands: marked out (dashed), going up (faint, in scaffolding), or built. */
function stand(look: Look, body: string, outline: string, box: [number, number, number, number]): string {
  if (look === 'none') return '';
  if (look === 'marked') return `<path d="${outline}" fill="none" stroke="${INK}" stroke-width="0.9" stroke-dasharray="2.5 2" opacity="0.7"/>`;
  if (look === 'building') return `<g opacity="0.5">${body}</g>${scaffold(...box)}`;
  return body;
}

/** The fields: strips of green and gold on the left slope, with a low wall at their foot. */
function fields(look: Look): string {
  const strips: string[] = [];
  const pts: Array<[number, number]> = [[24, 112], [44, 104], [66, 97], [88, 92]];
  pts.forEach(([x, y], i) => {
    strips.push(`<path d="M${x} ${y}l20 -5l14 6l-20 6z" fill="${i % 2 ? FIELD_GOLD : FIELD_GREEN}" stroke="${GRASS_DARK}" stroke-width="0.5"/>`);
    strips.push(`<path d="M${x + 4} ${y + 1}l18 -4.5M${x + 8} ${y + 3}l18 -4.5" stroke="${i % 2 ? '#b99a3a' : '#86a843'}" stroke-width="0.5"/>`);
  });
  return stand(look, strips.join(''), 'M24 112l20 -5l14 6l-20 6zM44 104l20 -5l14 6l-20 6zM66 97l20 -5l14 6l-20 6zM88 92l20 -5l14 6l-20 6z', [26, 116, 92, 26]);
}

/** The harbour: a stone mole curving out from the shore, a jetty, and a ship tied up at it. */
function harbour(look: Look, colour: string): string {
  const body = `<path d="M276 ${COAST}q22 2 40 14l-4 4q-18 -10 -38 -12z" fill="${STONE}" stroke="${STONE_DARK}" stroke-width="0.6"/><path d="M296 ${COAST + 3}h5v14h-5z" fill="${WOOD}"/>${look === 'built' ? ship(312, 140, colour, true, 0.9) : ''}`;
  return stand(look, body, `M276 ${COAST}q22 2 40 14l-4 4q-18 -10 -38 -12zM296 ${COAST + 3}h5v14h-5z`, [278, 136, 38, 18]);
}

/** The agora: a paved square with a colonnade (a stoa) along its back. */
function agora(look: Look): string {
  const cols = Array.from({ length: 8 }, (_, i) => `<rect x="${182 + i * 4.4}" y="89" width="1.4" height="7.5" fill="${MARBLE_C}"/>`).join('');
  const body = `<path d="M176 106h40l4 -6h-40z" fill="#e8dcc0" stroke="${STONE_DARK}" stroke-width="0.5"/><rect x="180" y="96.5" width="35" height="2" fill="${STONE}"/>${cols}<path d="M179 89l18.5 -4.5l18.5 4.5z" fill="${ROOF}"/><circle cx="198" cy="102.5" r="1.4" fill="${STONE_DARK}"/>`;
  return stand(look, body, 'M176 106h40l4 -6h-40zM180 89h35v9.5h-35z', [178, 106, 38, 21]);
}

/** The temple on the hilltop: steps, columns and a pediment in marble. */
function temple(look: Look): string {
  const cols = Array.from({ length: 6 }, (_, i) => `<rect x="${193 + i * 4}" y="31" width="1.6" height="8" fill="${MARBLE_C}" stroke="#d8d0bc" stroke-width="0.3"/>`).join('');
  const body = `<rect x="189" y="39" width="28" height="2.4" fill="${MARBLE_C}" stroke="#d8d0bc" stroke-width="0.4"/><rect x="191" y="30" width="24" height="1.6" fill="${MARBLE_C}"/>${cols}<path d="M190 30l13 -6l13 6z" fill="${MARBLE_C}" stroke="#d8d0bc" stroke-width="0.4"/><path d="M193 29.4l10 -4.4l10 4.4" fill="none" stroke="${ROOF}" stroke-width="0.8"/>`;
  // Drawn a little lower so it stands on the rocky top rather than floating over it.
  const drawn = stand(look, body, 'M189 41.4h28v-17h-28z', [189, 41, 28, 18]);
  return drawn ? `<g transform="translate(0 8)">${drawn}</g>` : '';
}

/** Walls round the houses, with towers and a gate to the shore. */
function walls(look: Look): string {
  const line = 'M120 119L123 92L150 70L190 55L234 57L266 74L280 98L282 119';
  const towers: Array<[number, number]> = [[123, 92], [150, 70], [190, 55], [234, 57], [266, 74], [280, 98]];
  const body = `<path d="${line}" fill="none" stroke="${STONE_DARK}" stroke-width="3.6" stroke-linejoin="round"/><path d="${line}" fill="none" stroke="${STONE}" stroke-width="2.2" stroke-linejoin="round"/>${towers.map(([x, y]) => `<rect x="${x - 3.2}" y="${y - 8}" width="6.4" height="9" fill="${STONE}" stroke="${STONE_DARK}" stroke-width="0.6"/><path d="M${x - 3.2} ${y - 8}h1.6v-1.4h1.6v1.4h1.6v-1.4h1.6v1.4" fill="${STONE}" stroke="${STONE_DARK}" stroke-width="0.4"/>`).join('')}`;
  if (look === 'marked') return `<path d="${line}" fill="none" stroke="${INK}" stroke-width="0.9" stroke-dasharray="2.5 2" opacity="0.7"/>`;
  if (look === 'building') return `<g opacity="0.5">${body}</g>${scaffold(140, 78, 20, 12)}${scaffold(244, 70, 18, 12)}`;
  return look === 'built' ? body : '';
}

/** The second trade's mark on the right slope: vines, a quarry, a cheese hut and goats, olives, sheep, or horses in a paddock. */
function trade(look: Look, good: number): string {
  const w = good >= 0 ? TRADE_GOODS[good] : -1;
  let body = '';
  if (w === WINE) body = Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, i) => `<circle cx="${290 + i * 6 - r * 2}" cy="${80 + r * 5}" r="1.6" fill="#5f7f2c"/>`).join('')).join('') + `<path d="M286 96h34" stroke="${WOOD}" stroke-width="0.5"/>`;
  else if (w === MARBLE) body = `<path d="M288 94l6 -16l22 0l6 16z" fill="#d9d2c0"/><path d="M291 94l4 -6h7v-5h7v-5h7l4 16z" fill="${MARBLE_C}" stroke="#bdb39c" stroke-width="0.5"/>${[[290, 97], [297, 98], [304, 97]].map(([x, y]) => `<rect x="${x}" y="${y - 3.4}" width="5.4" height="3.4" fill="${MARBLE_C}" stroke="#bdb39c" stroke-width="0.4"/>`).join('')}`;
  else if (w === CHEESE) body = `${house(298, 92, 77)}${[[310, 90], [316, 93], [306, 95]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="1.5" fill="#f2efe6"/><circle cx="${x + 2}" cy="${y - 1}" r="0.9" fill="#7a6a58"/>`).join('')}`;
  else if (w === OIL) body = [[292, 84], [302, 80], [312, 86], [297, 92], [308, 93]].map(([x, y]) => `<path d="M${x} ${y + 4}v-3" stroke="${WOOD}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="3.6" fill="#8f9f6a"/>`).join('');
  else if (w === FLEECE) body = `<path d="M288 94l28 0l4 -12l-28 0z" fill="none" stroke="${WOOD}" stroke-width="0.7"/>${[[296, 89], [303, 86], [309, 90], [300, 92]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.7" fill="#f6f2e6"/>`).join('')}`;
  else if (w === HORSES) body = `<path d="M286 96l32 0l4 -14l-32 0z" fill="none" stroke="${WOOD}" stroke-width="0.8"/>${[[297, 91], [308, 88]].map(([x, y]) => `<path d="M${x - 4} ${y}h8v-3h-8z" fill="#7a4e2c"/><path d="M${x + 3} ${y - 3}l2.4 -3l1 0.6l-1.6 2.4z" fill="#7a4e2c"/><path d="M${x - 3} ${y}v3M${x + 3} ${y}v3" stroke="#5a3a20" stroke-width="0.8"/>`).join('')}`;
  return stand(look, body, 'M286 96l32 0l4 -18l-32 0z', [288, 96, 30, 18]);
}

/** How a work stands in a colony. */
function lookOf(c: Colony, kind: WorkKind): Look {
  const w = workOf(c, kind);
  if (!w) return 'none';
  return w.phase === 'built' ? 'built' : w.phase === 'building' ? 'building' : 'marked';
}

/** How many houses a colony of so many people at its stage shows. */
export function housesShown(stage: number, people: number): number {
  if (stage <= 0) return 0;
  if (stage === 1) return Math.min(8, 4 + Math.floor(Math.max(0, people - 150) / 80));
  if (stage === 2) return Math.min(14, 9 + Math.floor(Math.max(0, people - 400) / 100));
  return Math.min(HOUSE_SPOTS.length, 15 + Math.floor(Math.max(0, people - 900) / 60));
}

/** A colony's picture: its island, its stage and its works, as SVG. */
export function colonyPicture(c: Colony, people: number): string {
  const colour = PLACES.home.colour;
  const stage = stageOf(c);
  const look = (k: WorkKind): Look => lookOf(c, k);
  const parts: string[] = [];
  parts.push(`<defs><linearGradient id="cpsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset="1" stop-color="${SKY_LOW}"/></linearGradient></defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#cpsky)"/>`);
  // Far off: another island's blue ridge, and a few clouds.
  parts.push(`<path d="M0 ${COAST - 6}Q30 92 70 98Q100 102 120 ${COAST - 6}z" fill="#9fbccb"/><path d="M290 ${COAST - 8}Q320 84 360 90L360 ${COAST - 8}z" fill="#a9c4d1"/>`);
  for (const [x, y, r] of [[60, 26, 9], [76, 24, 7], [300, 34, 8], [314, 31, 6]] as Array<[number, number, number]>) parts.push(`<ellipse cx="${x}" cy="${y}" rx="${r * 1.8}" ry="${r * 0.7}" fill="#ffffff" opacity="0.75"/>`);
  // The sea, with a few strokes of light.
  parts.push(`<rect y="${COAST - 4}" width="${W}" height="${H - COAST + 4}" fill="${SEA}"/>`);
  for (let i = 0; i < 14; i++) {
    const x = (hash2(i, 1, 93) * W) | 0;
    const y = COAST + 6 + hash2(i, 2, 93) * (H - COAST - 10);
    parts.push(`<path d="M${x} ${f1(y)}q4 -2 8 0" stroke="${SEA_LIGHT}" stroke-width="1" fill="none"/>`);
  }
  // The island: a long green hill with a rocky top, a beach at its foot.
  parts.push(`<path d="M0 ${COAST}L0 110Q40 100 90 92Q140 80 176 56Q192 44 205 40Q220 44 236 56Q272 76 320 92Q345 99 ${W} 105L${W} ${COAST}z" fill="${GRASS}"/>`);
  parts.push(`<path d="M186 49Q196 42 205 40Q214 42 224 49L218 50L212 46L206 50L199 47L193 51z" fill="${HILL}"/><path d="M205 40Q214 42 224 49L218 50L212 46z" fill="${HILL_DARK}"/>`);
  parts.push(`<path d="M0 ${COAST}Q90 ${COAST - 6} 180 ${COAST - 4}T${W} ${COAST - 2}L${W} ${COAST + 3}Q270 ${COAST + 2} 180 ${COAST + 3}T0 ${COAST + 3}z" fill="${BEACH}"/>`);
  // A few dark bushes.
  for (let i = 0; i < 9; i++) {
    const x = 20 + hash2(i, 5, 94) * 320;
    const y = 96 + hash2(i, 6, 94) * 12 - (x > 140 && x < 270 ? 20 : 0);
    if (x > 120 && x < 290 && y > 70) continue;
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(2 + hash2(i, 7, 94) * 2)}" fill="${GRASS_DARK}"/>`);
  }
  parts.push(fields(look('fields')));
  parts.push(trade(look('trade'), secondGood(c.site)));
  parts.push(temple(look('temple')));
  parts.push(walls(look('walls')));
  // The settlement itself: tents at an outpost, houses after.
  if (stage === 0) {
    for (const [x, y] of [[160, 116], [182, 113], [206, 117], [226, 114]] as Array<[number, number]>) parts.push(tent(x, y, colour));
    parts.push(`<path d="M191 119l3.5 -4l3.5 4z" fill="#d06a2a"/><path d="M194.5 114q-3 -5 1 -9q3 -4 -1 -9" stroke="#cfc8bd" stroke-width="1.8" fill="none" opacity="0.8"/>`);
  } else {
    const n = housesShown(stage, people);
    const spots = HOUSE_SPOTS.slice(0, n).sort((a, b) => a[1] - b[1]);
    for (const [x, y] of spots) parts.push(house(x, y, x * 7 + y));
    if (stage === 1) parts.push(`<path d="M104 108h18l2 -6h-18z" fill="none" stroke="${WOOD}" stroke-width="0.8"/><ellipse cx="111" cy="105" rx="2.6" ry="1.6" fill="#f6f2e6"/><ellipse cx="117" cy="106" rx="2.6" ry="1.6" fill="#f6f2e6"/>`);
  }
  parts.push(agora(look('agora')));
  // A banner in your colours by the shore.
  parts.push(`<path d="M128 ${COAST}v-22" stroke="${WOOD}" stroke-width="1.2"/><path d="M128 ${COAST - 22}h12v7h-12z" fill="${colour}"/><path d="M128 ${COAST - 16.5}h12" stroke="${PLACES.home.trim}" stroke-width="1.1"/>`);
  // Boats: drawn up on the beach while it has no harbour; its ship at anchor; the harbour and its second ship.
  if (look('harbour') !== 'built') parts.push(`<path d="M238 ${COAST + 1}h16l-3 3h-10z" fill="#6e4426" transform="rotate(-6 246 ${COAST})"/>`);
  parts.push(harbour(look('harbour'), colour));
  parts.push(ship(84, 150, colour, false, 0.85));
  const name = `${c.name}, ${stage === 0 ? 'an' : 'a'} ${STAGE_NAMES[stage]}`;
  return `<svg class="colpic" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name.replace(/"/g, '&quot;')}">${parts.join('')}</svg>`;
}
