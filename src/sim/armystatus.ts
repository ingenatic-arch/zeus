/**
 * What the copper mine, the armoury, the barracks, a soldier and a home with a
 * man serving say when hovered or clicked (slice 23). Pure reads of the state.
 */
import type { CoastMap } from '../map/bake';
import { copperOf, outcropPlace } from './build';
import { BUILDING_NAMES, findBuilding, levelName } from './buildings';
import { companiesAt, companyName, companyOf, COMPANY_SIZE, doingWords, fatherWords, kindWord, menOf, PER_BARRACKS, servingFrom } from './army';
import { errandsOut } from './food';
import { ARMOUR, coming, COPPER, held } from './foods';
import { rateOf } from './labour';
import { ARMOUR_COPPER, ARMOUR_MONTH, COPPER_MONTH } from './production';
import { roadsBeside } from './rounds';
import { roomFor, roomOf, storeOf } from './stores';
import type { Building, SimState, Soldier } from './state';
import { SOLDIER_PAY } from './treasury';

export interface Status {
  title: string;
  detail: string;
}

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');
const roundTen = (v: number): number => (v >= 100 ? Math.round(v / 10) * 10 : Math.round(v));

/** Where a maker's carts take what it makes, or why they can't ('' when there is nothing to say). */
function cartLine(s: SimState, b: Building, w: number, what: string): string {
  const carts = errandsOut(s, b);
  if (carts) return `${carts === 1 ? 'A cart is' : `${carts} carts are`} taking its ${what} to a storehouse`;
  if (held(b, w) <= 0) return '';
  if (!s.buildings.some((g) => g.kind === 'storehouse')) return `Build a storehouse for its carts to take the ${what} to`;
  if (!s.buildings.some((g) => g.kind === 'storehouse' && roomFor(g, w) > 0)) return `Every storehouse is full of ${what}: its carts wait for room`;
  return '';
}

/** A copper mine: the copper in its rock, what it digs, where the ore goes. */
export function mineStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const ore = held(b, COPPER);
  const store = storeOf('mine');
  const rich = copperOf(map, b.x, b.z, 2);
  const title = `${BUILDING_NAMES.mine} · ${fmt(ore)} of ${fmt(store)} measures of copper ore`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its miners and its carts' };
  const rate = rateOf(b);
  let digging: string;
  if (ore >= store) digging = 'The ore heap is full: nobody digs until carts take the ore away';
  else if (rate === 0) digging = 'No ore is dug with nobody working here';
  else digging = `Copper in the rock ${Math.round(rich * 100)}% · about ${fmt(roundTen(COPPER_MONTH * rich * rate))} measures of ore a month${rate < 1 ? ` (${fmt(roundTen(COPPER_MONTH * rich))} fully worked)` : ''}`;
  return { title, detail: lines(workers, digging, `The copper ${outcropPlace(b.x + 1, b.z + 1)} · an armoury (B) hammers ${ARMOUR_COPPER} measures into a set of armour`, cartLine(s, b, COPPER, 'copper')) };
}

/** An armoury: copper in hand, sets made, where the armour goes. */
export function armouryStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const copper = held(b, COPPER);
  const made = held(b, ARMOUR);
  const store = storeOf('armoury');
  const title = `${BUILDING_NAMES.armoury} · ${fmt(made)} of ${fmt(store)} sets of armour`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its smiths and its carts' };
  const rate = rateOf(b);
  let making: string;
  if (made >= store) making = 'Its racks are full: nothing more is made until carts take the armour away';
  else if (rate === 0) making = 'Nothing is made with no smiths working here';
  else if (copper < ARMOUR_COPPER) {
    if (!s.buildings.some((g) => g.kind === 'mine')) making = 'It waits for copper: build a copper mine on the green-streaked rock in the hills (B), or buy copper from Sparta';
    else if (s.walkers.some((w) => w.kind === 'cart' && w.target === b.id)) making = 'It waits for copper: a cart is on its way';
    else making = 'It waits for copper from the mines’ carts';
  } else making = `Hammering bronze: about ${fmt(ARMOUR_MONTH * rate)} sets of armour a month while it has copper${rate < 1 ? ` (${ARMOUR_MONTH} fully worked)` : ''}`;
  const bringing = coming(b, COPPER);
  const inHand = `Copper waiting: ${fmt(copper)} of ${fmt(roomOf('armoury', COPPER))} measures (${ARMOUR_COPPER} a set: a helmet, a breastplate, a round shield and a spear)${bringing > 0 ? ` · carts are bringing ${fmt(bringing)} more` : ''}`;
  return { title, detail: lines(workers, making, inHand, cartLine(s, b, ARMOUR, 'armour')) };
}

/** A barracks: its companies, its rack of armour, its porter. */
export function barracksStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const cs = companiesAt(s, b);
  const men = cs.reduce((a, c) => a + menOf(s, c).length, 0);
  const title = `${BUILDING_NAMES.barracks} · ${cs.length ? `${cs.length} ${cs.length === 1 ? 'company' : 'companies'}, ${men} ${men === 1 ? 'man' : 'men'}` : 'no companies yet'}`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its men and its porter' };
  const rows = cs.map((c) => `${companyName(c).replace(/^t/, 'T')} of ${kindWord(c.kind)}: ${menOf(s, c).length} of ${COMPANY_SIZE} · ${doingWords(s, c)}${c.why ? ` · ${c.why}` : ''}${c.owed > 0 ? ` · ${fmt(c.owed)} dr pay owed` : ''}`);
  const rack = held(b, ARMOUR);
  const porter = s.walkers.find((w) => w.origin === b.id && w.kind === 'porter');
  const carrying = porter ? (porter.back ? `Its porter is bringing ${porter.load} ${porter.load === 1 ? 'set' : 'sets'} of armour from a storehouse` : 'Its porter is on his way to a storehouse for armour') : '';
  const room = cs.length < PER_BARRACKS ? `Room for ${PER_BARRACKS - cs.length} more ${PER_BARRACKS - cs.length === 1 ? 'company' : 'companies'}: click it to raise one (hoplites from fine houses and villas, archers from townhouses and better) · ${SOLDIER_PAY} dr a man a month` : `Full: a barracks holds ${PER_BARRACKS} companies`;
  return { title, detail: lines(workers, ...rows, rack > 0 ? `Armour on the racks: ${rack} ${rack === 1 ? 'set' : 'sets'}` : '', carrying, room) };
}

/** A soldier: who he is, whose son, and what he is doing. */
export function soldierStatus(s: SimState, x: Soldier): Status {
  const c = companyOf(s, x.company);
  const home = findBuilding(s, x.home);
  const kind = c ? kindWord(c.kind, false) : 'soldier';
  const title = `${x.name}, ${fatherWords(x)} · ${c ? `${kind} of ${companyName(c)}` : 'dismissed, going home'}`;
  const house = x.house ? `Of the house of ${x.house}${home && home.kind === 'home' ? `, ${levelName(home.level)}` : ''}` : '';
  const doing =
    x.state === 'coming'
      ? 'Walking in from his home to the barracks'
      : x.state === 'arming'
        ? 'At the barracks, waiting for his set of armour from the stores'
        : x.state === 'leaving'
          ? 'Walking home to his old work'
          : c
            ? c.order === 'drill'
              ? 'Drilling on the barracks ground'
              : c.order === 'march' || c.order === 'return'
                ? 'Marching with his company'
                : 'Holding with his company, under its banner'
            : '';
  const kit = c?.kind === 'hoplite' ? (x.armed ? 'Bronze helmet, breastplate, round shield and spear' : 'No armour yet') : c?.kind === 'archer' ? 'A bow and a quiver' : '';
  return { title, detail: lines(house, doing, kit) };
}

/** A home's word about its man in the army ('' if none of its men serves): "Their eldest, Lykon, serves in the 2nd company of hoplites". */
export function servesLine(s: SimState, b: Building): string {
  const x = servingFrom(s, b);
  if (!x) return '';
  const c = companyOf(s, x.company);
  const who = x.father ? `Their eldest, ${x.name},` : `${x.name}, the head of the house,`;
  if (!c) return '';
  return `${who} serves in ${companyName(c)} of ${kindWord(c.kind)}${x.state === 'coming' ? ' (on his way to the barracks)' : ''} · he has left his work`;
}
