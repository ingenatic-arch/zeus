/**
 * What hovering a stretch of wall, a gate or a tower says (slice 25): what it
 * is, how strong, and what it is doing: a stretch being hammered at, and how
 * long it has left; a tower's archers, and whom they are shooting at.
 */
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { PLACES } from '../map/greece';
import { BUILDING_NAMES, centreOf } from './buildings';
import { TICKS_PER_DAY } from './clock';
import type { Status } from './status';
import type { Building, SimState, WallPiece } from './state';
import { AT_WALL, BLOW, crackOf, fullOf, GATE_COST, HAMMERERS, TOWER_RANGE, towerArchers, WALL_COST } from './walls';

const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');
const whose = (city: string): string => {
  const name = PLACES[city as keyof typeof PLACES]?.name ?? city;
  return name.endsWith('s') ? `${name}’` : `${name}’s`;
};

/** A stretch of wall or a gate, standing or broken. */
export function wallStatus(s: SimState, map: CoastMap, p: WallPiece): Status {
  const n = map.size;
  const crack = crackOf(p);
  const price = p.gate ? GATE_COST : WALL_COST;
  if (crack === 3) {
    return {
      title: p.gate ? 'A broken gate' : 'A breach in the wall',
      detail: lines(p.gate ? 'Raiders broke it down: anyone can walk through' : 'Raiders broke through here: anyone can walk through, raiders too', `Draw the wall over it to build it again: ${price} dr`),
    };
  }
  const full = fullOf(p);
  const state = crack === 0 ? 'whole' : crack === 1 ? 'cracked' : 'badly cracked';
  const title = `${p.gate ? 'A gate' : 'A stretch of wall'} · ${state}`;
  const what = p.gate ? 'Your people pass through it on the road; raiders must break it to get in' : 'Nobody crosses it: walkers and carts go round, or through a gate; raiders must break it to get in';
  // A band hammering at it: its men at the wall, and how long it has left at this rate.
  let hammer = '';
  for (const r of s.world.raids) {
    if (r.siege !== p.t || r.phase !== 'raiding') continue;
    const x = (p.t % n) + 0.5;
    const z = Math.floor(p.t / n) + 0.5;
    const men = Math.min(HAMMERERS, s.army.foes.filter((f) => f.raid === r.id && f.state === 'with' && dhypot(f.x - x, f.z - z) <= AT_WALL).length);
    const days = men > 0 ? Math.max(1, Math.ceil(p.hp / (men * BLOW) / TICKS_PER_DAY)) : 0;
    hammer = men > 0 ? `${whose(r.city)} raiders are hammering at it, ${men} at a time: through in about ${days === 1 ? 'a day' : `${days} days`} at this rate` : `${whose(r.city)} raiders are making for it, to break it`;
  }
  const mend = crack > 0 ? `Draw the wall over it to mend it: ${Math.max(1, Math.ceil(price * (1 - p.hp / full)))} dr` : '';
  return { title, detail: lines(hammer, `Strength ${Math.ceil(p.hp)} of ${full}`, what, mend) };
}

/** A tower: its archers, and whom they are shooting at. */
export function towerStatus(s: SimState, b: Building, workers: string): Status {
  const archers = towerArchers(b);
  const [cx, cz] = centreOf(b);
  const near = s.army.foes.filter((f) => f.state !== 'fallen' && dhypot(f.x - cx, f.z - cz) <= TOWER_RANGE);
  const cities = [...new Set(s.world.raids.filter((r) => near.some((f) => f.raid === r.id)).map((r) => r.city))];
  const title = `${BUILDING_NAMES.tower} · ${archers > 0 ? `${b.workers} ${b.workers === 1 ? 'archer' : 'archers'}` : 'no archers'}`;
  const doing =
    archers <= 0
      ? 'No archers on it: its workers are its archers'
      : near.length
        ? `Shooting at ${cities.map(whose).join(' and ')} raiders: ${near.length} within bowshot`
        : `Watching: it shoots at raiders within ${TOWER_RANGE} tiles, over walls and roofs`;
  return { title, detail: lines(doing, workers, b.owed > 0 ? 'Its archers shoot half as often while their wages are unpaid' : '', 'Towers don’t burn or wear, and raiders can’t break them') };
}
