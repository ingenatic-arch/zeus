/**
 * Battles in the streets (slice 24): your companies against raiders, man by
 * man, ticked only while there are raiders on your map (or arrows in the air,
 * or men lying where they fell), so a town at peace pays nothing for it.
 *
 * - **The raiders.** A band on your map (raids.ts) is a walker that finds the
 *   way; its men (`army.foes`) keep a loose pack round it. A raider who comes
 *   within a few paces of a soldier goes for him; while any of its men fight,
 *   the band stands where it is. A raider who can't get at the man he went for
 *   for a while gives up on him and goes on.
 * - **Your companies.** A company holding its ground (or drilling at its
 *   barracks) fights what comes near its banner, then goes back to its ranks:
 *   hoplites close with any raider within four tiles of the banner, and chase
 *   no further than a few more; archers shoot at any raider within eight tiles
 *   of them, and step back from one who comes too close (fighting him only if
 *   they can't). A man on the march only strikes back at a raider on him. A
 *   broken company runs: its men fight nobody, and raiders let them go.
 * - **Blows and arrows.** Every few ticks a man in reach strikes; the city's
 *   dice (a hash of the seed, the tick and who) say whether it lands and how
 *   hard. Hoplites hit hard and their armour turns most blows; raiders beat
 *   archers hand to hand; archers' arrows fly a few ticks and land where they
 *   were aimed, striking a raider if they were good.
 * - **Falling.** A man whose health runs out falls. A raider lies still a
 *   moment and is gone; what he carried is taken back (coin to the treasury,
 *   goods to the nearest store with room). A soldier is wounded or killed
 *   (about even odds): the wounded get up after a while and walk back to the
 *   barracks to heal; the killed are mourned at home (army.ts's news, the
 *   house's story and mood, one fewer in the house) and their company calls
 *   another man in their place.
 * - **Breaking.** A band that has lost half its men breaks and runs for its
 *   edge (raids.ts: breakBand); a company that has lost half the men it began
 *   the fight with breaks and runs back to its barracks.
 *
 * Pure and deterministic: its dice are hashes, drawing on no generator.
 */
import type { CoastMap } from '../map/bake';
import { datan2, dcos, dhypot, dsin } from '../map/dmath';
import { districtAt, districtTitle } from '../map/districts';
import { PLACES } from '../map/greece';
import { hash2 } from '../map/noise';
import { armyNews, companyName, companyOf, FALLEN_LIE, fatherWords, HIRELINGS, kinOf, sendBanner, type HiredKind } from './army';
import { findBuilding, recountPopulation } from './buildings';
import { tell } from './folk';
import { held, setHeld } from './foods';
import { breakBand, lootWords, raidersOf } from './raids';
import { note } from './stockbook';
import { isStore, roomFor } from './stores';
import type { Company, Foe, Raid, SimState, Soldier, Walker } from './state';
import { income } from './treasury';

// ---------------------------------------------------------------------------
// The numbers (tuned by eye).

/** How near (tiles) a man must be to strike. */
export const REACH = 0.45;
/** Ticks between a man's blows (a few more, by the dice), and between an archer's arrows. */
export const SWING = 8;
export const RELOAD = 14;
/** How far an archer shoots (tiles). */
export const BOW = 8;
/** Hoplites go for raiders this near their banner, and chase them no further than this from it. */
export const ENGAGE = 4;
export const LEASH = 5.5;
/** A raider goes for a soldier this near him; once his band is fighting, one this near (the band charges). */
export const FOE_SEE = 2.5;
export const CHARGE = 6;
/** An archer steps back from a raider this near him. */
export const TOO_CLOSE = 1.2;
/** Paces (tiles a tick): closing with a man, stepping back, keeping up with the band. */
const CLOSE_PACE = { hoplite: 0.14, archer: 0.12, raider: 0.17 } as const;
const BACK_PACE = 0.13;
const PACK_PACE = 0.26;
/** How hard each strikes, and how much of a blow each takes (hoplites' armour and shields turn most; raiders have shields). */
export const ATTACK = { hoplite: 20, archer: 6, raider: 16 } as const;
export const ARROW_HURT = 11;
export const TAKES = { hoplite: 0.45, archer: 1, raider: 0.8 } as const;
/** The odds a blow lands; an arrow's, falling off with the distance. */
const HIT = 0.65;
const ARROW_HIT = 0.78;
const ARROW_FALL_OFF = 0.035;
/** How fast an arrow flies (tiles a tick). */
const ARROW_SPEED = 1.1;
/** The odds a soldier who falls is only wounded. */
export const WOUNDED_ODDS = 0.5;
/** A raider who has not been able to strike the man he went for in this many ticks gives up on him, and on soldiers for a while. */
const STALL = 80;
const CALM = 60;
/** The pack: how far behind one another its rows run, and how far round its target the men stand. */
const PACK_ROW = 0.5;

/** The city's dice for a battle: a number in [0, 1) from the tick, who, and what for. */
const roll = (s: SimState, who: number, salt: number): number => hash2(s.tick, who * 16 + salt, (s.seed ^ 0x62617474) | 0);

const cityName = (r: Raid): string => PLACES[r.city].name;
const whose = (r: Raid): string => (cityName(r).endsWith('s') ? `${cityName(r)}’` : `${cityName(r)}’s`);

/** A raider still on his feet. */
const up = (f: Foe): boolean => f.state !== 'fallen';
/** A soldier in the ranks and on his feet (not walking in, waiting for armour, wounded or fallen). */
const standing = (x: Soldier): boolean => x.state === 'ready' && x.company > 0;

/** Is there anything for the battle to do this tick? */
const quiet = (s: SimState): boolean => s.army.foes.length === 0 && s.army.arrows.length === 0 && !s.world.raids.some((r) => r.phase === 'raiding');

// ---------------------------------------------------------------------------
// Each tick.

export function stepBattle(s: SimState, map: CoastMap): void {
  if (quiet(s)) return;
  const a = s.army;
  // The bands on your map, by raid.
  const bands = new Map<number, { r: Raid; w: Walker | undefined }>();
  for (const r of s.world.raids) if (r.phase === 'raiding' || a.foes.some((f) => f.raid === r.id)) bands.set(r.id, { r, w: raidersOf(s, r) });
  // A band just in (or from an older save) gets its men; the men of a band that has left the map are gone with it, but for the fallen.
  for (const { r, w } of bands.values()) if (w && r.fallen === 0 && !a.foes.some((f) => f.raid === r.id)) muster(s, r, w);
  if (a.foes.some((f) => up(f) && !bands.get(f.raid)?.w) || a.foes.some((f) => !up(f) && s.tick - f.fell >= FALLEN_LIE)) {
    a.foes = a.foes.filter((f) => (up(f) ? !!bands.get(f.raid)?.w : s.tick - f.fell < FALLEN_LIE));
  }
  const foes = a.foes.filter(up);
  const byFoe = new Map<number, Foe>();
  for (const f of foes) byFoe.set(f.id, f);
  const men = a.soldiers.filter(standing);
  const byMan = new Map<number, Soldier>();
  for (const x of men) byMan.set(x.id, x);
  const companies = new Map<number, Company>();
  for (const c of a.companies) companies.set(c.id, c);
  // (The men raiders go for: not those of a broken company, running for their barracks.)
  const menToFight = men.filter((x) => !companies.get(x.company)?.routed);

  // Arrows landing.
  if (a.arrows.length) {
    const flying = [];
    for (const ar of a.arrows) {
      if (s.tick < ar.t1) {
        flying.push(ar);
        continue;
      }
      const f = ar.foe ? byFoe.get(ar.foe) : undefined;
      if (f && up(f)) f.hp -= ar.dmg;
    }
    a.arrows = flying;
  }

  // The raiders: who goes for whom, and the pack.
  for (const f of foes) {
    const band = bands.get(f.raid);
    if (!band || !band.w) continue;
    const { r, w } = band;
    let t = f.foe ? byMan.get(f.foe) : undefined;
    // (Nor a man of a broken company: they let him run. Slice 24's review: they cut down a whole broken company as it ran.)
    if (r.broke || s.tick < f.calm || (t && companies.get(t.company)?.routed)) t = undefined;
    // Not able to strike him for a while: he gives up on him (and soldiers) and goes on.
    if (t && s.tick - f.since > STALL && s.tick - f.swung > STALL) {
      t = undefined;
      f.calm = s.tick + CALM;
    }
    if (!t && !r.broke && s.tick >= f.calm) {
      // (A band already fighting charges: its men go for any soldier within a charge of them, not only one in their way.)
      t = nearest(menToFight, f.x, f.z, r.fought >= s.tick - 1 ? CHARGE : FOE_SEE);
      if (t) f.since = s.tick;
    }
    if (t) {
      f.state = 'fight';
      f.foe = t.id;
      if (dhypot(t.x - f.x, t.z - f.z) > REACH * 0.85) moveTo(map, s, f, t.x, t.z, CLOSE_PACE.raider);
      f.face = datan2(t.z - f.z, t.x - f.x);
    } else {
      f.state = 'with';
      f.foe = 0;
      const [px, pz, face] = packPlace(w, f);
      const d = dhypot(px - f.x, pz - f.z);
      if (d > 1e-6) {
        const step = Math.min(d, PACK_PACE);
        f.x += ((px - f.x) / d) * step;
        f.z += ((pz - f.z) / d) * step;
        f.walked += step;
      }
      f.face = d > 0.05 ? datan2(pz - f.z, px - f.x) : face;
    }
  }

  // Your men: who goes for whom. (A marching company whose banner raiders have come near turns to fight.)
  const shooting = new Map<number, Foe>();
  const marchFight = new Set<number>();
  for (const c of a.companies) if (c.order === 'march' && !c.routed && nearestFoe(foes, bands, c.x, c.z, ENGAGE, () => true)) marchFight.add(c.id);
  for (const x of men) {
    const c = companies.get(x.company);
    if (!c) continue;
    // (A broken company runs: its men turn to fight nobody, not even one at their heels.)
    if (c.routed) {
      x.foe = 0;
      continue;
    }
    // (A company on the march stops and fights when raiders come at it: army.ts holds its banner while its men fight.)
    const seek = (c.order === 'hold' || c.order === 'drill' || (c.order === 'march' && marchFight.has(c.id))) && !c.routed && x.path.length === 0;
    let t = x.foe ? byFoe.get(x.foe) : undefined;
    if (t && !up(t)) t = undefined;
    const onMe = (): Foe | undefined => foes.find((f) => f.foe === x.id && dhypot(f.x - x.x, f.z - x.z) <= REACH);
    if (c.kind === 'hoplite') {
      // (A hoplite chases no further than his leash from the banner, nor a band already running.)
      if (t && (!seek || dhypot(t.x - c.x, t.z - c.z) > LEASH || bands.get(t.raid)?.r.broke)) t = undefined;
      if (!t && seek) t = nearestFoe(foes, bands, x.x, x.z, ENGAGE + 2, (f) => dhypot(f.x - c.x, f.z - c.z) <= ENGAGE);
      t ??= onMe();
      x.foe = t ? t.id : 0;
      if (t) {
        if (dhypot(t.x - x.x, t.z - x.z) > REACH * 0.85 && seek) moveTo(map, s, x, t.x, t.z, CLOSE_PACE.hoplite);
        x.face = datan2(t.z - x.z, t.x - x.x);
      }
      continue;
    }
    // An archer: back from a raider too close, hand to hand only if he can't; else he shoots from his place.
    const close = nearest(foes, x.x, x.z, TOO_CLOSE);
    if (close) {
      x.foe = close.id;
      x.face = datan2(close.z - x.z, close.x - x.x);
      if (seek) {
        const d = dhypot(x.x - close.x, x.z - close.z) || 1;
        const tx = x.x + ((x.x - close.x) / d) * BACK_PACE;
        const tz = x.z + ((x.z - close.z) / d) * BACK_PACE;
        if (dhypot(tx - c.x, tz - c.z) <= LEASH) moveTo(map, s, x, tx, tz, BACK_PACE);
      }
      continue;
    }
    x.foe = 0;
    if (!seek) continue;
    const aim = nearest(foes, x.x, x.z, BOW);
    if (aim) {
      shooting.set(x.id, aim);
      x.face = datan2(aim.z - x.z, aim.x - x.x);
    }
  }

  // (Men in a fight keep a little apart: no two crowd onto the same spot.)
  spread(map, s, men.filter((x) => x.foe > 0));
  spread(map, s, foes.filter((f) => f.state === 'fight'));

  // Blows, and arrows loosed.
  for (const x of men) {
    if (x.cool > 0 && (x.foe > 0 || shooting.has(x.id))) x.cool--;
    if (x.cool > 0) continue;
    const c = companies.get(x.company);
    if (!c) continue;
    const t = x.foe ? byFoe.get(x.foe) : undefined;
    if (t && up(t) && dhypot(t.x - x.x, t.z - x.z) <= REACH) {
      x.cool = SWING + Math.floor(roll(s, x.id, 1) * 4);
      x.swung = s.tick;
      if (roll(s, x.id, 2) < HIT) t.hp -= ATTACK[c.kind] * (0.8 + 0.4 * roll(s, x.id, 3)) * TAKES.raider;
      continue;
    }
    const aim = shooting.get(x.id);
    if (aim) {
      x.cool = RELOAD + Math.floor(roll(s, x.id, 4) * 4);
      x.swung = s.tick;
      const d = dhypot(aim.x - x.x, aim.z - x.z);
      const good = roll(s, x.id, 5) < ARROW_HIT - ARROW_FALL_OFF * d;
      // (A miss lands a little way off.)
      const ox = good ? 0 : (roll(s, x.id, 6) - 0.5) * 1.2;
      const oz = good ? 0 : (roll(s, x.id, 7) - 0.5) * 1.2;
      a.arrows.push({ x0: x.x, z0: x.z, x1: aim.x + ox, z1: aim.z + oz, t0: s.tick, t1: s.tick + Math.max(2, Math.ceil(d / ARROW_SPEED)), foe: good ? aim.id : 0, dmg: ARROW_HURT * (0.8 + 0.4 * roll(s, x.id, 8)) * TAKES.raider });
    }
  }
  for (const f of foes) {
    if (f.cool > 0) f.cool--;
    if (f.state !== 'fight' || f.cool > 0) continue;
    const t = byMan.get(f.foe);
    if (!t || dhypot(t.x - f.x, t.z - f.z) > REACH) continue;
    const c = companies.get(t.company);
    f.cool = SWING + Math.floor(roll(s, f.id, 9) * 4);
    f.swung = s.tick;
    if (roll(s, f.id, 10) < HIT) t.hp -= ATTACK.raider * (0.8 + 0.4 * roll(s, f.id, 11)) * TAKES[c?.kind ?? 'archer'];
  }

  // The fallen.
  for (const f of foes) if (f.hp <= 0 && up(f)) fallFoe(s, map, f, bands.get(f.raid));
  for (const x of men) if (x.hp <= 0 && standing(x)) fallMan(s, x, companies.get(x.company), bands);
  // Who is fighting: the bands stand while theirs fight; companies note their strength as a fight begins.
  for (const { r } of bands.values()) if (a.foes.some((f) => f.raid === r.id && f.state === 'fight')) r.fought = s.tick;
  // (A band running for its edge fights no more: companies count their fight over.)
  const anyFoes = a.foes.some((f) => up(f) && !bands.get(f.raid)?.r.broke);
  for (const c of a.companies) {
    const engaged = a.soldiers.some((x) => x.company === c.id && standing(x) && (x.foe > 0 || shooting.has(x.id)));
    const ready = a.soldiers.filter((x) => x.company === c.id && standing(x)).length;
    if (engaged && c.strong === 0) c.strong = ready;
    // Half the men it began with fallen: it breaks, and runs for its barracks.
    if (c.strong > 0 && !c.routed && ready * 2 < c.strong) rout(s, map, c);
    else if (!anyFoes && !c.routed && c.strong > 0) c.strong = 0;
  }
  // A band that has lost half its men breaks and runs; one with nobody left is gone (raids.ts settles it).
  for (const { r, w } of bands.values()) {
    if (!w) continue;
    const left = a.foes.filter((f) => f.raid === r.id && up(f)).length;
    w.people = Math.max(0, left);
    if (left === 0) {
      s.walkers = s.walkers.filter((o) => o !== w);
      s.rev++;
    } else if (!r.broke && left * 2 <= r.men) {
      for (const f of a.foes) if (f.raid === r.id && up(f)) {
        f.state = 'with';
        f.foe = 0;
      }
      breakBand(s, map, r);
      battleNews(s, map, r, w);
    }
  }
}

/** The men of a band just in: in a loose pack round where it stands. */
function muster(s: SimState, r: Raid, w: Walker): void {
  for (let k = 0; k < r.men; k++) {
    const f: Foe = { id: s.army.nextId++, raid: r.id, slot: k, x: 0, z: 0, face: 0, hp: 100, state: 'with', foe: 0, cool: 0, swung: 0, fell: 0, walked: 0, since: 0, calm: 0 };
    const [px, pz, face] = packPlace(w, f);
    f.x = px;
    f.z = pz;
    f.face = face;
    s.army.foes.push(f);
  }
  s.rev++;
}

/** How far along its way a walker is. */
function alongOf(w: Walker): number {
  let d = 0;
  for (let i = 0; i < w.seg && i * 2 + 3 < w.path.length; i++) d += dhypot(w.path[i * 2 + 2] - w.path[i * 2], w.path[i * 2 + 3] - w.path[i * 2 + 1]);
  return d + w.along;
}

/** The point at a distance along a walker's way, and which way it runs there. */
function pointOn(path: readonly number[], d: number): [number, number, number] {
  let left = Math.max(0, d);
  let face = path.length >= 4 ? datan2(path[3] - path[1], path[2] - path[0]) : 0;
  for (let i = 2; i < path.length; i += 2) {
    const ax = path[i - 2];
    const az = path[i - 1];
    const len = dhypot(path[i] - ax, path[i + 1] - az);
    if (len > 1e-9) face = datan2(path[i + 1] - az, path[i] - ax);
    if (left <= len) {
      const u = len > 1e-9 ? left / len : 0;
      return [ax + (path[i] - ax) * u, az + (path[i + 1] - az) * u, face];
    }
    left -= len;
  }
  return [path[path.length - 2] ?? 0, path[path.length - 1] ?? 0, face];
}

/**
 * A raider's place in the band's pack: a few abreast, row behind row along
 * its way, each a little off his line; at its target, round it, each at his
 * own spot.
 */
export function packPlace(w: Walker, f: Foe): [number, number, number] {
  const k = f.slot;
  const lead = alongOf(w);
  const [hx, hz] = pointOn(w.path, lead);
  if (w.wait > 0) {
    const ang = hash2(w.id, k, 2101) * Math.PI * 2;
    const rad = 0.7 + hash2(w.id, k, 2102) * 1.1;
    return [hx + dcos(ang) * rad, hz + dsin(ang) * rad, ang + Math.PI];
  }
  const row = Math.floor(k / 3);
  const [x0, z0, f0] = pointOn(w.path, lead - row * PACK_ROW - hash2(w.id, k, 2103) * 0.12);
  const side = ((k % 3) - 1) * 0.22 + (hash2(w.id, k, 2104) - 0.5) * 0.08;
  return [x0 - dsin(f0) * side, z0 + dcos(f0) * side, f0];
}

/** The nearest of a list of figures within `most` tiles of (x, z). */
function nearest<T extends { x: number; z: number }>(list: readonly T[], x: number, z: number, most: number): T | undefined {
  let best: T | undefined;
  let bd = most;
  for (const o of list) {
    const d = dhypot(o.x - x, o.z - z);
    if (d <= bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

/** The nearest raider of a band still standing to fight, within `most` tiles, that passes `ok`. */
function nearestFoe(foes: readonly Foe[], bands: Map<number, { r: Raid }>, x: number, z: number, most: number, ok: (f: Foe) => boolean): Foe | undefined {
  let best: Foe | undefined;
  let bd = most;
  for (const f of foes) {
    if (bands.get(f.raid)?.r.broke || !ok(f)) continue;
    const d = dhypot(f.x - x, f.z - z);
    if (d <= bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

/**
 * Somewhere a man can step in a fight: off the map, or anywhere but inside a
 * building. (Not only on walkable ground: a company holding a bridge or a
 * narrow lane stands in ranks wider than it, and the raiders must be able to
 * come at its outer files.)
 */
function footing(map: CoastMap, s: SimState, x: number, z: number): boolean {
  const n = map.size;
  if (x < 0 || z < 0 || x >= n || z >= n) return true;
  return s.tiles[Math.floor(z) * n + Math.floor(x)] <= 0;
}

/** A step towards (tx, tz): straight if the ground allows, else along one axis; not at all if neither (a man already off his footing may step anywhere). */
function moveTo(map: CoastMap, s: SimState, o: { x: number; z: number; walked: number }, tx: number, tz: number, pace: number): void {
  const dx = tx - o.x;
  const dz = tz - o.z;
  const d = dhypot(dx, dz);
  if (d < 1e-6) return;
  const step = Math.min(d, pace);
  const nx = o.x + (dx / d) * step;
  const nz = o.z + (dz / d) * step;
  const loose = !footing(map, s, o.x, o.z);
  const tries: Array<[number, number]> = [
    [nx, nz],
    [o.x + Math.sign(dx) * Math.min(Math.abs(dx), step), o.z],
    [o.x, o.z + Math.sign(dz) * Math.min(Math.abs(dz), step)],
  ];
  for (const [px, pz] of tries) {
    if (!loose && !footing(map, s, px, pz)) continue;
    o.walked += dhypot(px - o.x, pz - o.z);
    o.x = px;
    o.z = pz;
    return;
  }
}

/** How close two men in a fight stand, at the closest, and how far a tick they step apart. */
const ELBOW = 0.24;
const SHOVE = 0.03;

/** Men in a fight closer than an elbow's room step apart (each pair once, in list order). */
function spread(map: CoastMap, s: SimState, list: ReadonlyArray<{ x: number; z: number; walked: number; id: number }>): void {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      if (Math.abs(dx) > ELBOW || Math.abs(dz) > ELBOW) continue;
      const d = dhypot(dx, dz);
      if (d >= ELBOW) continue;
      // (Exactly on top of one another: apart along a way of their own.)
      const ux = d > 1e-6 ? dx / d : dcos(a.id + b.id);
      const uz = d > 1e-6 ? dz / d : dsin(a.id + b.id);
      const step = Math.min(SHOVE, (ELBOW - d) / 2);
      moveTo(map, s, b, b.x + ux * step, b.z + uz * step, step);
      moveTo(map, s, a, a.x - ux * step, a.z - uz * step, step);
    }
  }
}

/** "in the market quarter", for the news: where a fight was. */
function whereWords(map: CoastMap, x: number, z: number): string {
  const t = districtTitle(districtAt(map, x, z));
  return t ? `${t[0].toLowerCase()}${t.slice(1)}` : 'in the streets';
}

/** A raider falls: what he carried is taken back (coin to the treasury, goods to the nearest store with room). */
function fallFoe(s: SimState, map: CoastMap, f: Foe, band: { r: Raid; w: Walker | undefined } | undefined): void {
  const standingBefore = s.army.foes.filter((o) => o.raid === f.raid && up(o)).length;
  f.state = 'fallen';
  f.fell = s.tick;
  f.foe = 0;
  f.hp = 0;
  for (const x of s.army.soldiers) if (x.foe === f.id) x.foe = 0;
  if (!band) return;
  const { r, w } = band;
  r.fallen++;
  const n = Math.max(1, standingBefore);
  const goods = Math.floor((r.took - r.regained) / n);
  if (goods > 0 && r.ware >= 0) {
    let store = null;
    let bd = Infinity;
    for (const g of s.buildings) {
      if (!isStore(g.kind) || roomFor(g, r.ware) < goods) continue;
      const d = dhypot(g.x + 1 - f.x, g.z + 1 - f.z);
      if (d < bd) {
        bd = d;
        store = g;
      }
    }
    if (store) {
      setHeld(store, r.ware, held(store, r.ware) + goods);
      note(s, r.ware, 'lost', `raid:${r.city}`, -goods);
      r.regained += goods;
      s.looks++;
    }
  }
  const coin = Math.floor((r.stole - r.coinBack) / n);
  if (coin > 0) {
    income(s, coin, 'recovered', `from ${whose(r)} raiders`);
    r.coinBack += coin;
  }
  if (w) w.load = Math.max(0, r.took - r.regained);
  void map;
  s.rev++;
}

/** A soldier falls: wounded (he lies a while, then walks back to heal) or killed (mourned at home, his place called again). */
function fallMan(s: SimState, x: Soldier, c: Company | undefined, bands: Map<number, { r: Raid; w: Walker | undefined }>): void {
  // (Whose raiders struck him: the band of the raider on him, else any band on the map.)
  const by = s.army.foes.find((f) => f.foe === x.id && up(f));
  const r = (by ? bands.get(by.raid)?.r : undefined) ?? [...bands.values()][0]?.r;
  for (const f of s.army.foes) if (f.foe === x.id) {
    f.foe = 0;
    f.state = 'with';
  }
  x.foe = 0;
  x.fell = s.tick;
  x.path = [];
  x.seg = 0;
  if (roll(s, x.id, 12) < WOUNDED_ODDS) {
    x.state = 'wounded';
    x.hp = 5;
    if (r) r.wounded++;
    s.rev++;
    return;
  }
  x.state = 'fallen';
  x.hp = 0;
  if (r) r.killed++;
  mourn(s, x, c, r);
  s.rev++;
}

/** A man killed: his house mourns him (its story, its mood, one fewer living there), and the town hears. */
function mourn(s: SimState, x: Soldier, c: Company | undefined, r: Raid | undefined): void {
  const foe = r ? `${whose(r)} raiders` : 'raiders';
  const company = c ? `${companyName(c)}` : 'his company';
  if (c?.hired || x.home === 0) {
    const h = c?.hired ? HIRELINGS[c.hired as HiredKind] : undefined;
    armyNews(s, `${x.name}, a ${h ? h.one : 'hireling'} of ${company} from ${x.house}, fell fighting ${foe}`, 0);
    return;
  }
  const b = findBuilding(s, x.home);
  const f = b?.family;
  if (b && f) {
    const i = f.members.findIndex((p) => p.name === x.name && !p.female && (p.role === kinOf(x) || (kinOf(x) === 'head' && p.role === 'head')));
    const j = i >= 0 ? i : f.members.findIndex((p) => p.name === x.name && !p.female);
    if (j >= 0) {
      f.members.splice(j, 1);
      b.people = Math.max(0, b.people - 1);
      recountPopulation(s);
    }
    tell(s, f, 'fell', b.level, [x.name, foe]);
  }
  armyNews(s, `${x.name}, ${fatherWords(x)}, of ${company}, fell fighting ${foe}. The house of ${x.house} mourns him`, x.home);
}

/** A company has lost half the men it began the fight with: it breaks, and runs for its barracks. */
function rout(s: SimState, map: CoastMap, c: Company): void {
  c.routed = true;
  for (const x of s.army.soldiers) if (x.company === c.id) x.foe = 0;
  if (!sendBanner(s, map, c.id, -1)) c.order = 'hold';
  armyNews(s, `${companyName(c)[0].toUpperCase()}${companyName(c).slice(1)} has lost half its men and breaks: they run back to the barracks`, c.barracks);
  s.rev++;
}

/** The news of a band broken: who broke it, and what it cost. */
function battleNews(s: SimState, map: CoastMap, r: Raid, w: Walker): void {
  const [x, z] = [w.path[w.seg * 2] ?? 0, w.path[w.seg * 2 + 1] ?? 0];
  const ours = [r.killed ? `${r.killed} of yours ${r.killed === 1 ? 'was' : 'were'} killed` : '', r.wounded ? `${r.wounded} wounded` : ''].filter(Boolean).join(' and ');
  armyNews(s, `Your soldiers broke ${whose(r)} raiders ${whereWords(map, x, z)}: ${r.fallen} of their ${r.men} men fell${ours ? `; ${ours}` : ', and none of yours'}`, 0);
}

/** Who a company is, for a hover: "the 1st company of Cretan archers". */
export const companyWords = (c: Company): string => `${companyName(c)} of ${c.hired ? HIRELINGS[c.hired as HiredKind].name : c.kind === 'hoplite' ? 'hoplites' : 'archers'}`;

/** What a raider is doing, for his hover. */
export function foeDoing(s: SimState, f: Foe): { title: string; detail: string } {
  const r = s.world.raids.find((o) => o.id === f.raid);
  const name = r ? cityName(r) : 'Greece';
  const title = `A raider of ${name}`;
  if (!up(f)) return { title, detail: 'Fallen' };
  const health = f.hp >= 75 ? 'unhurt' : f.hp >= 40 ? 'hurt' : 'badly hurt';
  const man = f.foe ? s.army.soldiers.find((x) => x.id === f.foe) : undefined;
  const c = man ? companyOf(s, man.company) : undefined;
  const doing = r?.broke ? 'running for the edge with the rest' : man ? `fighting ${man.name} of ${c ? companyWords(c) : 'your soldiers'}` : 'with the band';
  const carried = r ? lootWords(r) : '';
  const loot = carried ? ` · the band carries ${carried}` : '';
  return { title, detail: `${health} · ${doing}${loot}` };
}
