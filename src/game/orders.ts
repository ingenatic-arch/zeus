/**
 * A company's banner in hand (slice 23): the company picked out (by its
 * banner, one of its men, or its row on the Army tab), the tile under the
 * pointer marked where it can march and where not, with the way's length and
 * why not; a click there (or a drag from the banner to it) sends it. Escape or
 * a right-click lets go. Host code: it reads the sim state and talks to the
 * sim only through its command queue (flushed at once, so it works while
 * paused, as building does).
 */
import { companyName, companyOf, kindWord, MARCH_SPEED, marchRefusal, pathLength, RIDE_SPEED, wayFrom } from '../sim/army';
import { TICKS_PER_DAY } from '../sim/clock';
import type { Command } from '../sim/commands';
import type { Sim } from '../sim/sim';
import { MARK_BAD, MARK_OK, type Placement } from '../render/placement';
import type { ToolTip } from './tools';

export class Orders {
  /** The company whose banner is in hand, or 0. */
  selected = 0;
  private hover = -1;
  private screen: [number, number] = [0, 0];
  private key = '';
  private why = '';
  private days = 0;
  private listeners: Array<(id: number) => void> = [];
  /** Told each time an order is sent (the command), or refused (null). */
  onAct: ((c: Command | null) => void) | null = null;

  constructor(
    private readonly sim: Sim,
    private readonly placement: Placement,
    private readonly tip: ToolTip,
    /** The company whose banner or man is under a screen point (0: none). */
    private readonly pick: (sx: number, sy: number) => number,
    /** Is a build tool in hand (it keeps the placement grid when the banner is let go)? */
    private readonly toolOn: () => boolean,
    /** Who the soldier under a screen point is, in a line ('' for none: a banner, or nobody). */
    private readonly who: (sx: number, sy: number) => string = () => '',
  ) {}

  onChange(l: (id: number) => void): void {
    this.listeners.push(l);
  }

  /** Take a company's banner in hand (0: let go). */
  select(id: number): void {
    if (id && !companyOf(this.sim.state, id)) id = 0;
    if (id === this.selected) return;
    this.selected = id;
    this.key = '';
    this.hover = -1;
    if (id !== 0 || !this.toolOn()) {
      this.placement.show(id !== 0, false);
      this.placement.setMarks(new Map());
    }
    if (!id) this.tip.show(null);
    for (const l of this.listeners) l(id);
  }

  /** What the hint chip says while a banner is in hand. */
  hint(): string {
    const c = companyOf(this.sim.state, this.selected);
    if (!c) return '';
    // (Slice 36's review: horsemen ride, as the pointer's tip says.)
    return `${cap(companyName(c))} of ${kindWord(c.kind)} · click a street or open ground to ${c.kind === 'horseman' ? 'ride' : 'march'} there · Esc to let go`;
  }

  /** The pointer moved (world point or null, screen point). */
  pointer(world: { x: number; z: number } | null, sx: number, sy: number): void {
    this.screen = [sx, sy];
    const n = this.sim.map.size;
    this.hover = world && world.x >= 0 && world.z >= 0 && world.x < n && world.z < n ? Math.floor(world.z) * n + Math.floor(world.x) : -1;
    if (world) this.placement.setCursor(world.x, world.z, 7);
    this.preview();
  }

  /** Re-check the tile under the pointer if the city or the company moved on. */
  frame(): void {
    if (!this.selected) return;
    if (!companyOf(this.sim.state, this.selected)) return this.select(0);
    this.preview();
  }

  private preview(): void {
    const s = this.sim.state;
    const c = companyOf(s, this.selected);
    const [sx, sy] = this.screen;
    // Over its own banner or one of its men: nothing to mark (a click there keeps it in hand).
    const over = this.pick(sx, sy);
    if (!c || this.hover < 0 || over) {
      this.placement.setMarks(new Map());
      // (A man under the pointer says who he is first, as he does with no banner in hand.)
      const man = over ? this.who(sx, sy) : '';
      const line = (t: string): string => (man ? `${man}\n${t}` : t);
      if (c && over && over !== c.id) {
        const o = companyOf(s, over);
        if (o) this.tip.show(line(`${cap(companyName(o))} of ${kindWord(o.kind)} · click to take its banner instead`), sx, sy);
      } else if (c && over) this.tip.show(line(`${cap(companyName(c))} of ${kindWord(c.kind)}: its banner is in hand · click a street or open ground to ${c.kind === 'horseman' ? 'ride' : 'march'} there`), sx, sy);
      else this.tip.show(null);
      return;
    }
    // (The way is worked out again only when the tile, the city or the banner's tile changes.)
    const n = this.sim.map.size;
    const from = Math.floor(c.z) * n + Math.floor(c.x);
    const key = `${c.id}:${this.hover}:${from}:${s.rev}:${s.tilesRev}`;
    if (key !== this.key) {
      this.key = key;
      this.why = marchRefusal(s, this.sim.map, c, this.hover);
      const way = this.why ? null : wayFrom(s, this.sim.map, c.x, c.z, this.hover);
      // (Slice 36: horsemen ride, faster.)
      this.days = way ? Math.max(1, Math.round(pathLength(way) / (c.kind === 'horseman' ? RIDE_SPEED : MARCH_SPEED) / TICKS_PER_DAY)) : 0;
    }
    this.placement.setMarks(new Map([[this.hover, this.why ? MARK_BAD : MARK_OK]]));
    if (this.why) this.tip.show(this.why, sx, sy, true);
    else this.tip.show(`${c.kind === 'horseman' ? 'Ride' : 'March'} ${companyName(c)} of ${kindWord(c.kind)} here · about ${this.days} ${this.days === 1 ? 'day' : 'days'} away · they hold here, in ranks`, sx, sy);
  }

  private downAt = -1;

  down(): void {
    this.downAt = this.pick(this.screen[0], this.screen[1]);
  }

  /** Let go of the press: on a banner or a man, take that company; elsewhere, march there. */
  up(): void {
    const s = this.sim.state;
    const c = companyOf(s, this.selected);
    const over = this.pick(this.screen[0], this.screen[1]);
    if (over && (this.downAt === over || this.downAt <= 0)) {
      if (over !== this.selected) this.select(over);
      this.downAt = -1;
      return;
    }
    this.downAt = -1;
    if (!c || this.hover < 0) return;
    if (marchRefusal(s, this.sim.map, c, this.hover) !== '') {
      this.onAct?.(null);
      return;
    }
    this.send({ type: 'banner', company: c.id, tile: this.hover });
    this.key = '';
    this.preview();
  }

  /** Send an order now (it is applied at once, even while paused). */
  send(c: Command): void {
    const s = this.sim.state;
    const before = s.rev;
    this.sim.enqueue(c);
    this.sim.flush();
    this.onAct?.(s.rev !== before ? c : null);
  }
}

const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
