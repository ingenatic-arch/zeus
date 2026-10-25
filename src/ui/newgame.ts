/**
 * The new-game screen (slice 46), opened from the welcome card's "Found a new
 * city" (or by `#newgame`): choose a kind of land, a size and a seed word, see
 * the land drawn from above with what it holds marked on it, and found the
 * city there. Founding opens the land's own link (`#found.<kind>.<size>.<word>`),
 * so the game starts afresh on it; the Bay is the coast of the bare link.
 *
 * It bakes the chosen land in the page with the game's own bake, and draws it
 * with landpreview.ts. Read-only: it changes no town.
 */
import './newgame.css';
import { BAY, cleanWord, LAND_SIZES, landMap, seedOf, type Land, type LandKind } from '../map/lands';
import type { CoastMap } from '../map/bake';
import { createState } from '../sim/sim';
import { landColours } from '../render/landlook';
import { landMarks, paintLand, type LandMarks } from './landpreview';

/** The kinds of land as the screen offers them, with a line on each. */
export const KIND_WORDS: ReadonlyArray<{ kind: LandKind; name: string; line: string }> = [
  { kind: 'bay', name: 'The Bay', line: 'The coast you know: the sheltered bay, the river down from the north-west crags, the headland with its marble.' },
  { kind: 'sheltered', name: 'A sheltered bay', line: 'A bay of its own shape and a river from the hills, a headland with marble and copper; on a larger land, a lake or uplands inland.' },
  { kind: 'islands', name: 'Islands offshore', line: 'A gentle shore with a cove for the quay, and islands scattered out to sea: a fine harbour, less land.' },
  { kind: 'delta', name: 'A river delta', line: 'Low green land where the river splits into channels through reeds and marsh: the richest farmland, and bridges to build.' },
  { kind: 'mountains', name: 'A mountain shore', line: 'Rocky ranges and cliffs, one small bay with a little flat land behind it: copper and marble in many places, little room to farm.' },
  { kind: 'dryplain', name: 'A dry plain', line: 'Wide ochre land for olives and vines, a narrow green valley, little wood; water lies under the ground only by the river and the springs.' },
  { kind: 'woods', name: 'A wooded coast', line: 'Deep woods of pine and oak down to the shore, the river and the bay in clearings: timber everywhere, fields to clear.' },
];

const SIZE_WORDS: Record<number, string> = { 128: 'Small', 192: 'Medium', 256: 'Large' };

/** Words for "Another": things of the Greek coast. */
const WORDS = ['olive', 'laurel', 'dolphin', 'amphora', 'heron', 'cypress', 'marble', 'harbour', 'myrtle', 'owl', 'bronze', 'thyme', 'oar', 'lyre', 'fig', 'swallow', 'pine', 'salt', 'wave', 'ember', 'goat', 'vine', 'shell', 'cicada', 'anchor', 'agora', 'kestrel', 'sail', 'honey', 'tunny', 'acorn', 'bay', 'dawn', 'gull', 'reed', 'flint', 'barley', 'cedar', 'kid', 'pebble'];

export interface NewGameOptions {
  /** Found the city on this land (the Bay: start on the coast of the bare link). */
  onFound: (kind: LandKind, size: number, word: string) => void;
  onBack: () => void;
  /** Where to start: the kind, size and word last chosen (a founding link's), else a sheltered bay of the middle size. */
  start?: { kind: LandKind; size: number; word: string };
}

/** The lands drawn lately (the game's cache keeps the town's own land pinned, so baking these never pushes it out). */
const baked = new Map<string, { map: CoastMap; marks: LandMarks; pixels: Uint8ClampedArray }>();

export class NewGame {
  private el: HTMLElement;
  private kind: LandKind;
  private size: number;
  private word: string;
  private gone = false;
  private drawToken = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly facts: HTMLElement;
  private readonly wordInput: HTMLInputElement;

  constructor(root: HTMLElement, private o: NewGameOptions) {
    this.kind = o.start?.kind ?? 'sheltered';
    this.size = o.start?.size ?? 192;
    this.word = cleanWord(o.start?.word ?? '') || pick(-1);
    const el = document.createElement('div');
    el.className = 'newgame';
    el.innerHTML = `
      <div class="ng-card" role="dialog" aria-label="Found a new city">
        <h2>Found a new city</h2>
        <div class="ng-body">
          <div class="ng-choose">
            <h3>The land</h3>
            <div class="ng-kinds">${KIND_WORDS.map((k) => `<button class="ng-kind" data-kind="${k.kind}"><b>${k.name}</b><span>${k.line}</span></button>`).join('')}</div>
            <div class="ng-row ng-sizes"><h3>Its size</h3>${LAND_SIZES.map((n) => `<button class="ng-size" data-size="${n}" title="${n} tiles a side">${SIZE_WORDS[n]}</button>`).join('')}</div>
            <div class="ng-row ng-seed"><h3>Its seed</h3><input type="text" maxlength="24" spellcheck="false" aria-label="The seed: a word" /><button class="pill" data-act="another" title="A new word, a new land of this kind">Another</button></div>
            <p class="ng-note">The same kind, size and word always make the same land, so a land can be shared by its link.</p>
          </div>
          <div class="ng-look">
            <canvas class="ng-map" width="512" height="512" aria-label="The land from above"></canvas>
            <div class="ng-legend">
              <span><i class="k-site"></i>where the city starts</span>
              <span><i class="k-road"></i>the road in, laid at once</span>
              <span><i class="k-in"></i>roads in from the edges</span>
              <span><i class="k-quay"></i>quay sites</span>
              <span><i class="k-copper"></i>copper</span>
              <span><i class="k-marble"></i>marble</span>
              <span><i class="k-woods"></i>woods for timber</span>
              <span><i class="k-farm"></i>farmland</span>
              <span><i class="k-grass"></i>grassland</span>
              <span class="k-springs-row"><i class="k-spring"></i>springs</span>
            </div>
            <p class="ng-facts"></p>
          </div>
        </div>
        <div class="actions">
          <button class="pill primary" data-act="found">Found the city here</button>
          <button class="pill" data-act="back">Back</button>
        </div>
      </div>`;
    root.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('.ng-map') as HTMLCanvasElement;
    this.facts = el.querySelector('.ng-facts') as HTMLElement;
    this.wordInput = el.querySelector('.ng-seed input') as HTMLInputElement;
    this.wordInput.value = this.word;
    el.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!t) {
        if (e.target === el) this.close();
        return;
      }
      if (t.dataset.kind) this.kind = t.dataset.kind as LandKind;
      else if (t.dataset.size) this.size = Number(t.dataset.size);
      else if (t.dataset.act === 'another') {
        this.word = pick(WORDS.indexOf(this.word));
        this.wordInput.value = this.word;
      } else if (t.dataset.act === 'found') {
        this.o.onFound(this.kind, this.kind === 'bay' ? BAY.size : this.size, this.word);
        return;
      } else if (t.dataset.act === 'back') {
        this.close();
        return;
      } else return;
      this.refresh();
    });
    this.wordInput.addEventListener('change', () => {
      const w = cleanWord(this.wordInput.value);
      this.word = w || this.word;
      this.wordInput.value = this.word;
      this.refresh();
    });
    this.wordInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.wordInput.blur();
    });
    this.refresh();
  }

  get open(): boolean {
    return !this.gone;
  }

  /** Back to the welcome card. */
  close(): void {
    if (this.gone) return;
    this.gone = true;
    this.el.remove();
    this.o.onBack();
  }

  /** The land now chosen (for the probe). */
  get choice(): { kind: LandKind; size: number; word: string; seed: number } {
    return { kind: this.kind, size: this.kind === 'bay' ? BAY.size : this.size, word: this.word, seed: seedOf(this.word) };
  }

  private refresh(): void {
    const bay = this.kind === 'bay';
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('.ng-kind')) b.classList.toggle('on', b.dataset.kind === this.kind);
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('.ng-size')) {
      b.classList.toggle('on', !bay && Number(b.dataset.size) === this.size);
      b.disabled = bay;
    }
    this.wordInput.disabled = bay;
    (this.el.querySelector('[data-act="another"]') as HTMLButtonElement).disabled = bay;
    this.el.classList.toggle('dry', this.kind === 'dryplain');
    // Draw after the page has shown the choice (a large land takes a moment to bake).
    const token = ++this.drawToken;
    this.facts.textContent = 'Drawing the land…';
    this.canvas.classList.add('busy');
    requestAnimationFrame(() =>
      setTimeout(() => {
        if (token !== this.drawToken || this.gone) return;
        this.draw();
      }, 0),
    );
  }

  private land(): Land {
    return this.kind === 'bay' ? BAY : { kind: this.kind, size: this.size, seed: seedOf(this.word) };
  }

  private draw(): void {
    const land = this.land();
    const key = `${land.kind}:${land.size}:${land.seed}`;
    let got = baked.get(key);
    if (!got) {
      const map = landMap(land);
      const marks = landMarks(map, createState(undefined, 'coast', undefined, land));
      got = { map, marks, pixels: paintLand(map, land.kind) };
      baked.set(key, got);
      if (baked.size > 4) baked.delete(baked.keys().next().value as string);
    }
    drawLand(this.canvas, got.map, got.pixels, got.marks);
    // The legend's farmland and grassland in this land's own colours.
    const c = landColours(land.kind);
    this.el.style.setProperty('--ng-farm', c.lush);
    this.el.style.setProperty('--ng-farm-deep', c.lushDeep);
    this.el.style.setProperty('--ng-grass', c.meadow);
    this.canvas.classList.remove('busy');
    this.facts.innerHTML = factsOf(land, got.marks);
  }
}

/** A word for "Another" (not the one now shown). */
function pick(not: number): string {
  // (The UI's own randomness: a word to start from, not part of any town.)
  let i = Math.floor(Math.random() * WORDS.length);
  if (i === not) i = (i + 1) % WORDS.length;
  return WORDS[i];
}

const SIDE_WORDS: Record<string, string> = { north: 'north', east: 'east', west: 'west' };

function factsOf(land: Land, m: LandMarks): string {
  const n = (v: number): string => v.toLocaleString('en-GB');
  const road = m.roads.road.length
    ? `The road in comes from the <b>${SIDE_WORDS[m.roads.from]}</b> edge, ${n(m.roads.road.length)} tiles to where the city starts.`
    : land.kind === 'bay'
      ? 'Lay the road in yourself, from any edge.'
      : '';
  const what = [
    `${n(m.farmland)} tiles of farmland`,
    `${n(m.grass)} of grassland`,
    `${n(m.timber)} trees for timber`,
    `${m.copper.length} copper outcrop${m.copper.length === 1 ? '' : 's'}`,
    `${m.marble.length} of marble`,
  ];
  if (m.springs.length) what.push(`${m.springs.length} springs`);
  return `${road} ${what.join(' · ')}.`;
}

/** The land drawn on the canvas, scaled up crisply, with its marks over it. */
function drawLand(canvas: HTMLCanvasElement, map: CoastMap, pixels: Uint8ClampedArray, m: LandMarks): void {
  const n = map.size;
  const W = canvas.width;
  const k = W / n;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const src = document.createElement('canvas');
  src.width = n;
  src.height = n;
  src.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(pixels), n, n), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, W);
  ctx.drawImage(src, 0, 0, W, W);
  const at = (x: number): number => x * k;
  // The road that will be laid: a terracotta line from the edge to the site.
  if (m.roads.road.length) {
    ctx.save();
    ctx.strokeStyle = 'rgba(60, 30, 12, 0.55)';
    ctx.lineWidth = Math.max(4, k * 1.4);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const path = (): void => {
      ctx.beginPath();
      m.roads.road.forEach((t, i) => {
        const x = at((t % n) + 0.5);
        const z = at(Math.floor(t / n) + 0.5);
        if (i === 0) ctx.moveTo(x, z);
        else ctx.lineTo(x, z);
      });
    };
    path();
    ctx.stroke();
    ctx.strokeStyle = '#d8a25a';
    ctx.lineWidth = Math.max(2, k * 0.8);
    path();
    ctx.stroke();
    ctx.restore();
  }
  // The roads in from the edges: gold arrows pointing in.
  for (const [side, t] of Object.entries(m.roads.ins)) {
    if (t < 0) continue;
    const x = at((t % n) + 0.5);
    const z = at(Math.floor(t / n) + 0.5);
    const dir = side === 'north' ? [0, 1] : side === 'west' ? [1, 0] : [-1, 0];
    arrow(ctx, x, z, dir[0], dir[1], side === m.roads.from);
  }
  for (const p of m.springs) ring(ctx, at(p.x), at(p.z), 7, '#3d7fb8', 'rgba(220, 240, 255, 0.85)');
  for (const p of m.woods) tree(ctx, at(p.x), at(p.z));
  for (const p of m.copper) diamond(ctx, at(p.x), at(p.z), '#2f9a7c', '#0f3a2e');
  for (const p of m.marble) diamond(ctx, at(p.x), at(p.z), '#f7f3ea', '#5a5040');
  for (const p of m.quays) quay(ctx, at(p.x), at(p.z));
  if (m.site) star(ctx, at(m.site.x), at(m.site.z));
}

function arrow(ctx: CanvasRenderingContext2D, x: number, z: number, dx: number, dz: number, main: boolean): void {
  // Pulled in from the very edge so it shows whole.
  const cx = x + dx * 12;
  const cz = z + dz * 12;
  const s = main ? 11 : 8;
  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(Math.atan2(dz, dx));
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, -s * 0.75);
  ctx.lineTo(-s * 0.35, 0);
  ctx.lineTo(-s * 0.7, s * 0.75);
  ctx.closePath();
  ctx.fillStyle = main ? '#e9b44c' : 'rgba(233, 180, 76, 0.75)';
  ctx.strokeStyle = '#4a2c0c';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, z: number, fill: string, edge: string): void {
  ctx.beginPath();
  ctx.moveTo(x, z - 8);
  ctx.lineTo(x + 7, z);
  ctx.lineTo(x, z + 8);
  ctx.lineTo(x - 7, z);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
}

function ring(ctx: CanvasRenderingContext2D, x: number, z: number, r: number, edge: string, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, z, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();
}

function tree(ctx: CanvasRenderingContext2D, x: number, z: number): void {
  ctx.beginPath();
  ctx.moveTo(x, z - 10);
  ctx.lineTo(x + 7, z + 5);
  ctx.lineTo(x - 7, z + 5);
  ctx.closePath();
  ctx.fillStyle = '#2f5a2a';
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(x - 1.5, z + 5, 3, 4);
}

function quay(ctx: CanvasRenderingContext2D, x: number, z: number): void {
  ctx.fillStyle = '#2c4a86';
  ctx.strokeStyle = '#f2ead8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(x - 6, z - 6, 12, 12);
  ctx.fill();
  ctx.stroke();
  // An anchor's shank and arms.
  ctx.strokeStyle = '#f2ead8';
  ctx.beginPath();
  ctx.moveTo(x, z - 4);
  ctx.lineTo(x, z + 3.5);
  ctx.moveTo(x - 3.5, z + 1);
  ctx.quadraticCurveTo(x, z + 6, x + 3.5, z + 1);
  ctx.moveTo(x - 2.5, z - 2);
  ctx.lineTo(x + 2.5, z - 2);
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, z: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 12 : 5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(x + r * Math.cos(a), z + r * Math.sin(a));
    else ctx.lineTo(x + r * Math.cos(a), z + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = '#c8402a';
  ctx.strokeStyle = '#fff6e4';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}
