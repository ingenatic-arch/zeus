/**
 * The minimap at the top of the side panel: the whole map on a round bronze
 * plate, turned with the camera so it always matches the screen (what is up
 * on the screen is up on the plate), with the land, the sea and the river,
 * trees, roads and buildings in their colours, fires and the ship as marks,
 * and the ground the camera sees outlined. Click or drag on it to go there.
 *
 * It only reads the sim state. The land is painted once; trees, roads and
 * buildings are repainted when the town changes (at most twice a second);
 * the plate itself is redrawn each frame, which is one image and a few lines.
 */
import { TreeKind, WATER_RIVER, WATER_SEA, type CoastMap } from '../map/bake';
import { PAL } from '../render/palette';
import { footSide } from '../sim/buildings';
import { TILE_ROAD, type Building, type BuildingKind, type SimState } from '../sim/state';

/** The minimap's size on screen (CSS pixels): the plate and the bronze ring round it, which the panel's head draws (see skin.ts). */
export const PLATE = 216;
/** The ring's width: the map is drawn inside it, north's marker on it. */
const RIM = 16;

/** What each building is coloured on the plate: homes in terracotta, makers in their crop's colour, stores in stone, the town's own buildings in white. */
const KIND_COLOUR: Record<BuildingKind, string> = {
  home: '#c8643b',
  fountain: '#4f9be0',
  farm: '#e0b84a',
  granary: '#efe3c6',
  agora: '#fbf6ea',
  shrine: '#c2aef0',
  theatre: '#ee8aa2',
  taxoffice: '#5fb39a',
  lodge: '#9b6b43',
  dairy: '#f1e3a0',
  grove: '#5f7a2c',
  press: '#9b6b43',
  storehouse: '#efe3c6',
  pasture: '#c9d98a',
  vineyard: '#8a4a88',
  winery: '#9b6b43',
  watchpost: '#e2643a',
  architect: '#b8a07a',
  rubble: '#5a4a3e',
  trading: '#7a4a2c',
  yard: '#b07a3e',
  mine: '#4f9a86',
  armoury: '#b0803a',
  barracks: '#d8483a',
  tower: '#d9cfb8',
};

/** A home's colour by its level: tents and huts in canvas and straw, cottages and up in terracotta, villas deeper. */
const HOME_COLOUR = ['#d8c79a', '#e8dcb8', '#d9b77a', '#d0784a', '#c8643b', '#b85432', '#a8462a'];

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The land and water of every tile, painted once (RGB, a tile a pixel). */
function paintLand(map: CoastMap): Uint8ClampedArray {
  const n = map.size;
  const out = new Uint8ClampedArray(n * n * 4);
  const C = {
    deep: hex(PAL.deep),
    mid: hex(PAL.mid),
    shallow: hex(PAL.shallow),
    river: hex(PAL.river),
    sand: hex(PAL.sand),
    lush: hex(PAL.lush),
    meadow: hex(PAL.meadow),
    dry: hex(PAL.dryGrass),
    rock: hex(PAL.rockWarm),
    rockGrey: hex(PAL.rockGrey),
  };
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const t = z * n + x;
      const cx = x + 0.5;
      const cz = z + 0.5;
      const h = map.sample(map.heights, cx, cz);
      let c: [number, number, number];
      const water = map.tileWater[t];
      if (water === WATER_RIVER) c = C.river;
      else if (water === WATER_SEA || h < 0) c = h < -2.2 ? C.deep : h < -0.8 ? mix(C.mid, C.deep, clamp01((-h - 0.8) / 1.4)) : mix(C.shallow, C.mid, clamp01(-h / 0.8));
      else {
        const fert = map.tileFertility[t];
        const rock = map.sample(map.rock, cx, cz);
        const shore = map.sample(map.shore, cx, cz);
        c = fert > 0.5 ? mix(C.meadow, C.lush, clamp01((fert - 0.5) * 2)) : mix(C.dry, C.meadow, clamp01(fert * 2));
        if (rock > 0.2) c = mix(c, h > 6 ? C.rockGrey : C.rock, clamp01((rock - 0.2) * 1.6));
        if (shore > 0.5 && h < 0.9) c = mix(c, C.sand, clamp01((shore - 0.5) * 2.5));
        // Hill shading: lit from the north-west, so the hills stand up off the plate.
        const e = 0.8;
        const dx = map.sample(map.heights, cx + e, cz) - map.sample(map.heights, cx - e, cz);
        const dz = map.sample(map.heights, cx, cz + e) - map.sample(map.heights, cx, cz - e);
        const light = clamp01(0.86 - (dx + dz) * 0.22 + h * 0.012);
        c = [c[0] * (0.55 + light * 0.55), c[1] * (0.55 + light * 0.55), c[2] * (0.55 + light * 0.55)];
      }
      out[t * 4] = c[0];
      out[t * 4 + 1] = c[1];
      out[t * 4 + 2] = c[2];
      out[t * 4 + 3] = 255;
    }
  }
  return out;
}

/** The view's ground outline, for the plate: up to four world points (x, z). */
export type Footprint = ReadonlyArray<{ x: number; z: number }>;

export class Minimap {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  /** The town painted a tile a pixel (land, trees, roads, buildings). */
  private readonly town: HTMLCanvasElement;
  private readonly townCtx: CanvasRenderingContext2D;
  private readonly land: Uint8ClampedArray;
  private readonly image: ImageData;
  private paintedRev = -1;
  private paintedAt = -Infinity;
  private yaw = 0;
  private readonly n: number;
  private dragging = false;
  private readonly dpr: number;
  /** How many times the town has been painted and the plate drawn (for the probe). */
  paints = 0;
  draws = 0;
  /** What the plate last showed (the turn, the view's outline, the town, the marks), so an unchanged plate isn't drawn again. */
  private drawnKey = '';

  constructor(
    private readonly map: CoastMap,
    /** Go to a world point: `fly` for a click, a jump while dragging. */
    private readonly goTo: (x: number, z: number, fly: boolean) => void,
    /** Face north (a click on north's marker on the ring). */
    private readonly onNorth: () => void = () => undefined,
  ) {
    this.n = map.size;
    const el = document.createElement('div');
    el.className = 'minimap';
    el.title = 'The whole map, turned as you see it · click or drag to go there';
    const canvas = document.createElement('canvas');
    this.dpr = Math.min(2, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    canvas.width = Math.round(PLATE * this.dpr);
    canvas.height = Math.round(PLATE * this.dpr);
    canvas.style.width = `${PLATE}px`;
    canvas.style.height = `${PLATE}px`;
    el.appendChild(canvas);
    this.el = el;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.town = document.createElement('canvas');
    this.town.width = this.n;
    this.town.height = this.n;
    this.townCtx = this.town.getContext('2d') as CanvasRenderingContext2D;
    this.image = this.townCtx.createImageData(this.n, this.n);
    this.land = paintLand(map);
    const at = (e: PointerEvent): { x: number; z: number } | null => this.worldAt(e.clientX, e.clientY);
    canvas.addEventListener('pointerdown', (e) => {
      if (this.onMarker(e.clientX, e.clientY)) {
        this.onNorth();
        e.preventDefault();
        return;
      }
      const w = at(e);
      if (!w) return;
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
      this.goTo(w.x, w.z, true);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) {
        const on = this.onMarker(e.clientX, e.clientY);
        canvas.style.cursor = on ? 'pointer' : this.worldAt(e.clientX, e.clientY) ? 'crosshair' : 'default';
        canvas.title = on ? 'North · click to face north (N)' : '';
        return;
      }
      const w = at(e);
      if (w) this.goTo(w.x, w.z, false);
    });
    const up = (e: PointerEvent): void => {
      this.dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }

  /** Pixels on the plate per tile: the whole map fits inside the rim at any turn. */
  private get scale(): number {
    return (PLATE - 2 * RIM - 4) / (this.n * Math.SQRT2);
  }

  /** Where north's marker is on the plate (CSS pixels from its middle), as last drawn. */
  private marker: [number, number] = [0, -(PLATE / 2 - RIM / 2)];

  /** Whether a screen point is on north's marker. */
  private onMarker(clientX: number, clientY: number): boolean {
    const r = this.canvas.getBoundingClientRect();
    const k = r.width / PLATE;
    return Math.hypot((clientX - r.left) / k - PLATE / 2 - this.marker[0], (clientY - r.top) / k - PLATE / 2 - this.marker[1]) < 10;
  }

  /** The world point under a screen point, if it is on the map (inside the ring). */
  worldAt(clientX: number, clientY: number): { x: number; z: number } | null {
    const r = this.canvas.getBoundingClientRect();
    // (The panel's head may be drawn smaller on a short window.)
    const k = r.width / PLATE;
    const px = (clientX - r.left) / k - PLATE / 2;
    const py = (clientY - r.top) / k - PLATE / 2;
    if (Math.hypot(px, py) > PLATE / 2 - RIM) return null;
    const sx = px / this.scale;
    const sy = py / this.scale;
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const x = sx * c + sy * s + this.n / 2;
    const z = -sx * s + sy * c + this.n / 2;
    if (x < 0 || z < 0 || x > this.n || z > this.n) return null;
    return { x, z };
  }

  /** Where a world point lies on the plate (CSS pixels from its middle). */
  private plateAt(x: number, z: number): [number, number] {
    const dx = (x - this.n / 2) * this.scale;
    const dz = (z - this.n / 2) * this.scale;
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    return [dx * c - dz * s, dx * s + dz * c];
  }

  /** Repaint the town (trees, roads, buildings) over the land. */
  private paint(s: SimState): void {
    const n = this.n;
    const px = this.image.data;
    px.set(this.land);
    const put = (t: number, c: [number, number, number], a = 1): void => {
      const i = t * 4;
      px[i] = px[i] + (c[0] - px[i]) * a;
      px[i + 1] = px[i + 1] + (c[1] - px[i + 1]) * a;
      px[i + 2] = px[i + 2] + (c[2] - px[i + 2]) * a;
    };
    // Trees: a darker green where they stand (cleared ones are gone).
    const cleared = new Set(s.cleared);
    const pine = hex(PAL.pineDark);
    const olive = hex(PAL.oliveLeafDark);
    this.map.trees.forEach((tr, i) => {
      if (cleared.has(i)) return;
      const tx = Math.floor(tr.x);
      const tz = Math.floor(tr.z);
      if (tx < 0 || tz < 0 || tx >= n || tz >= n) return;
      // Trees darken their tile; scrub and broom a little; rocks, reeds and flowers not at all.
      if (tr.kind === TreeKind.Rock || tr.kind === TreeKind.Reed || tr.kind === TreeKind.Flowers) return;
      const low = tr.kind === TreeKind.Scrub || tr.kind === TreeKind.Broom;
      put(tz * n + tx, tr.kind === TreeKind.Olive ? olive : pine, low ? 0.2 : 0.5);
    });
    const road = hex(PAL.road);
    for (let t = 0; t < n * n; t++) if (s.tiles[t] === TILE_ROAD) put(t, road);
    // The walls (slice 25) in pale stone, their gates darker, breaches as faint rubble.
    const wall = hex('#e8dcc0');
    const gate = hex('#8a6a48');
    const breach = hex('#7a6c5c');
    for (const p of s.walls) put(p.t, p.hp <= 0 ? breach : p.gate ? gate : wall, p.hp <= 0 ? 0.5 : 1);
    const cache = new Map<string, [number, number, number]>();
    const colourOf = (b: Building): [number, number, number] => {
      const key = b.kind === 'home' ? `home${b.level}` : b.kind;
      let c = cache.get(key);
      if (!c) cache.set(key, (c = hex(b.kind === 'home' ? (HOME_COLOUR[b.level] ?? KIND_COLOUR.home) : KIND_COLOUR[b.kind])));
      return c;
    };
    for (const b of s.buildings) {
      const side = footSide(b);
      const c = colourOf(b);
      for (let dz = 0; dz < side; dz++) for (let dx = 0; dx < side; dx++) put((b.z + dz) * n + b.x + dx, c, b.kind === 'home' && b.level === 0 ? 0.45 : 1);
    }
    this.townCtx.putImageData(this.image, 0, 0);
    this.paints++;
  }

  /**
   * Bring the plate up to date: the town if it changed (at most twice a
   * second), then the plate turned to the camera, the view's outline, and
   * the marks (fires, the ship).
   */
  update(s: SimState, yaw: number, view: Footprint, time: number, ship: { visible: boolean; x: number; z: number } | null): void {
    if (s.rev !== this.paintedRev && time - this.paintedAt > 0.5) {
      this.paintedRev = s.rev;
      this.paintedAt = time;
      this.paint(s);
    }
    this.yaw = yaw;
    // Drawn again only when something on it moved: the turn, the view, the town, the ship; fires pulse, so a plate with fires on it is drawn every frame.
    let key = `${yaw.toFixed(3)}|${this.paints}|${view.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(';')}|${ship?.visible ? `${ship.x.toFixed(1)},${ship.z.toFixed(1)}` : ''}`;
    if (s.buildings.some((b) => b.fire !== 0)) key += `|${time}`;
    if (key === this.drawnKey) return;
    this.drawnKey = key;
    this.draws++;
    const ctx = this.ctx;
    const d = this.dpr;
    const R = PLATE / 2;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, PLATE, PLATE);
    // The plate: a bronze rim round a sea-blue disc (the sea goes on past the map's edge).
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - RIM, 0, Math.PI * 2);
    ctx.fillStyle = '#7fb8c4';
    ctx.fill();
    ctx.clip();
    ctx.translate(R, R);
    ctx.rotate(yaw);
    const half = (this.n / 2) * this.scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(40, 30, 20, 0.35)';
    ctx.shadowBlur = 6;
    ctx.drawImage(this.town, -half, -half, half * 2, half * 2);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(74, 52, 32, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-half, -half, half * 2, half * 2);
    ctx.restore();
    // What the camera sees.
    if (view.length >= 3) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - RIM, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      view.forEach((p, i) => {
        const [x, y] = this.plateAt(p.x, p.z);
        if (i === 0) ctx.moveTo(R + x, R + y);
        else ctx.lineTo(R + x, R + y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 250, 235, 0.16)';
      ctx.fill();
      ctx.strokeStyle = '#fffaf0';
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }
    // Fires: a pulsing red mark over a burning building, orange over a smouldering one.
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    for (const b of s.buildings) {
      if (b.fire === 0) continue;
      const side = footSide(b);
      const [x, y] = this.plateAt(b.x + side / 2, b.z + side / 2);
      ctx.beginPath();
      ctx.arc(R + x, R + y, b.fire === 2 ? 3 + pulse * 2 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = b.fire === 2 ? '#e83a1a' : '#f0a030';
      ctx.fill();
      ctx.strokeStyle = '#fff6e4';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (ship?.visible) {
      const [x, y] = this.plateAt(ship.x, ship.z);
      if (Math.hypot(x, y) < R - RIM - 3) {
        ctx.beginPath();
        ctx.arc(R + x, R + y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fffaf0';
        ctx.fill();
        ctx.strokeStyle = '#7a4a2c';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    // North: a gold stud on the ring (which the panel's head draws), turning with the view; a click on it faces north.
    const [nx, ny] = this.plateAt(this.n / 2, -1e6);
    const len = Math.hypot(nx, ny) || 1;
    const ux = nx / len;
    const uy = ny / len;
    this.marker = [ux * (R - RIM / 2), uy * (R - RIM / 2)];
    ctx.save();
    ctx.translate(R + this.marker[0], R + this.marker[1]);
    ctx.rotate(Math.atan2(uy, ux) + Math.PI / 2);
    ctx.shadowColor = 'rgba(30, 18, 6, 0.55)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 7.6, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(-2.4, -2.6, 0.5, 0, 0, 8);
    g.addColorStop(0, '#fff1bf');
    g.addColorStop(0.45, '#e2b24e');
    g.addColorStop(1, '#8a5e1c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(70, 44, 12, 0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#4a2e0c';
    ctx.font = '700 9.5px Cinzel, Palatino, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 0.6);
    ctx.restore();
  }
}
