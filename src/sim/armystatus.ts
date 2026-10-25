/**
 * What the copper mine, the armoury, the barracks, a soldier and a home with a
 * man serving say when hovered or clicked (slice 23). Pure reads of the state.
 */
import type { CoastMap } from '../map/bake';
import { copperOf, outcropPlace } from './build';
import { BUILDING_NAMES, findBuilding, levelName } from './buildings';
import { companiesAt, companyName, companyOf, doingWords, fatherWords, HIRED_PAY, HIRELINGS, kinOf, kindWord, menOf, PER_BARRACKS, servingFrom, woundedOf, type HiredKind } from './army';
import { companyWords } from './battle';
import { afloat, orderRefusal, PER_YARD, rowerFrom, triremeDoing, triremeName, triremesAt, TRIREME_COST } from './fleet';
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
  return { title, detail: lines(workers, digging, `The copper ${outcropPlace(map, b.x + 1, b.z + 1)} · an armoury (B) hammers ${ARMOUR_COPPER} measures into a set of armour`, cartLine(s, b, COPPER, 'copper')) };
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
  const rows = cs.map((c) => {
    const hurt = woundedOf(s, c).length;
    return `${companyWords(c).replace(/^t/, 'T')}: ${menOf(s, c).length} of ${c.want}${hurt ? ` (${hurt} wounded)` : ''} · ${doingWords(s, c)}${c.why ? ` · ${c.why}` : ''}${c.owed > 0 ? ` · ${fmt(c.owed)} dr pay owed` : ''}`;
  });
  const rack = held(b, ARMOUR);
  const porter = s.walkers.find((w) => w.origin === b.id && w.kind === 'porter');
  const carrying = porter ? (porter.back ? `Its porter is bringing ${porter.load} ${porter.load === 1 ? 'set' : 'sets'} of armour from a storehouse` : 'Its porter is on his way to a storehouse for armour') : '';
  const room = cs.length < PER_BARRACKS ? `Room for ${PER_BARRACKS - cs.length} more ${PER_BARRACKS - cs.length === 1 ? 'company' : 'companies'}: click it to raise one (hoplites from fine houses and villas, archers from townhouses and better, horsemen from estates) · ${SOLDIER_PAY} dr a man a month; or to hire one (${HIRED_PAY} dr a man)` : `Full: a barracks holds ${PER_BARRACKS} companies`;
  return { title, detail: lines(workers, ...rows, rack > 0 ? `Armour on the racks: ${rack} ${rack === 1 ? 'set' : 'sets'}` : '', carrying, room) };
}

/** A shipyard's hover card (phase 5 review: it had none, and read as a housing plot): its triremes and what each is doing. */
export function shipyardStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const at = triremesAt(s, b.id).filter(afloat);
  const title = `${BUILDING_NAMES.shipyard} · ${at.length ? `${at.length} of ${PER_YARD} ${at.length === 1 ? 'trireme' : 'triremes'}` : 'no triremes yet'}`;
  if (roadsBeside(s, map.size, b).length === 0) return { title, detail: 'Needs a road beside it, for its shipwrights and rowers' };
  const rows = at.map((t) => `The ${triremeName(t)}: ${triremeDoing(s, t).replace(/^./, (c) => c.toLowerCase())}${t.state === 'moored' || t.state === 'building' ? '' : ` · hull ${Math.round(t.hp)}%, oars ${Math.round(t.oars)}%`}`);
  const no = orderRefusal(s, b);
  return { title, detail: lines(workers, ...rows, no ? '' : `Room for another trireme: ${TRIREME_COST} dr`, 'Click for its panel: build, mend and send out its triremes') };
}

/** A soldier: who he is, whose son, and what he is doing. */
export function soldierStatus(s: SimState, x: Soldier): Status {
  const c = companyOf(s, x.company);
  const home = findBuilding(s, x.home);
  const h = c?.hired ? HIRELINGS[c.hired as HiredKind] : undefined;
  const kind = h ? h.one : c ? kindWord(c.kind, false) : 'soldier';
  const gone = x.home === 0 ? 'paid off, leaving your land' : 'dismissed, going home';
  const title = `${x.name}, ${fatherWords(x)} · ${x.state === 'fallen' ? `fallen, of ${c ? companyName(c) : 'his company'}` : c ? `${kind} of ${companyName(c)}` : gone}`;
  const house = h ? `From ${x.house}, hired for ${HIRED_PAY} dr a month` : x.house ? `Of the house of ${x.house}${home && home.kind === 'home' ? `, ${levelName(home.level)}` : ''}` : '';
  const foe = x.foe ? s.army.foes.find((f) => f.id === x.foe) : undefined;
  const raid = foe ? s.world.raids.find((r) => r.id === foe.raid) : undefined;
  const doing =
    x.state === 'fallen'
      ? x.home ? 'Killed fighting raiders; his house mourns him' : 'Killed fighting raiders'
      : x.state === 'wounded'
        ? x.path.length ? 'Wounded: limping back to the barracks to heal' : 'Wounded: down where he fell, and he will get up'
        : x.state === 'healing'
          ? `Healing at the barracks: ${x.hp}% whole`
          : x.state === 'coming'
            ? h ? 'Marching in from the edge of your land' : c?.kind === 'horseman' ? 'Riding in from his estate to the barracks' : 'Walking in from his home to the barracks'
            : x.state === 'arming'
              ? 'At the barracks, waiting for his set of armour from the stores'
              : x.state === 'leaving'
                ? x.home === 0 ? 'Walking off to the edge of your land' : 'Walking home to his old work'
                : foe
                  ? `Fighting a raider${raid ? ` of ${raid.city[0].toUpperCase()}${raid.city.slice(1)}` : ''}`
                  : c
                    ? c.routed
                      ? 'Running back to the barracks with his broken company'
                      : c.order === 'drill'
                        ? 'Drilling on the barracks ground'
                        : c.order === 'march' || c.order === 'return'
                          ? 'Marching with his company'
                          : 'Holding with his company, under its banner'
                    : '';
  const hurt = x.state === 'ready' && x.hp < 100 ? (x.hp >= 60 ? 'Hurt' : 'Badly hurt') : '';
  const kit = c?.kind === 'hoplite' ? (x.armed ? (h ? 'His own bronze, and an Arcadian shield' : 'Bronze helmet, breastplate, round shield and spear') : 'No armour yet') : c?.kind === 'archer' ? (h ? 'A Cretan bow, and the skill to use it' : 'A bow and a quiver') : c?.kind === 'horseman' ? 'His own horse from the estate’s stable, a bronze helmet, a light shield and a spear' : '';
  return { title, detail: lines(house, doing, hurt, kit) };
}

/** A home's word about its man in the army ('' if none of its men serves): "Their eldest, Lykon, serves in the 2nd company of hoplites". */
export function servesLine(s: SimState, b: Building): string {
  const x = servingFrom(s, b);
  if (!x) {
    // Slice 26: or rows in a trireme.
    const row = rowerFrom(s, b);
    if (!row) return '';
    const r = row.r;
    const who = r.kin === 'son' ? `Their eldest, ${r.name},` : r.kin === 'head' || !r.father ? `${r.name}, the head of the house,` : `${r.name}, ${r.kin} of ${r.father},`;
    const where = row.t.state === 'away' ? ' (away on the sea lanes)' : row.t.state === 'building' ? ' (waiting while she is built)' : '';
    return `${who} rows in the trireme ${triremeName(row.t)}${where} · he has left his work`;
  }
  const c = companyOf(s, x.company);
  const k = kinOf(x);
  const who = k === 'son' ? `Their eldest, ${x.name},` : k === 'head' || !x.father ? `${x.name}, the head of the house,` : `${x.name}, ${fatherWords(x)},`;
  if (!c) return '';
  const state = x.state === 'coming' ? ' (on his way to the barracks)' : x.state === 'wounded' || x.state === 'healing' ? ' (wounded, healing at the barracks)' : '';
  return `${who} serves in ${companyName(c)} of ${kindWord(c.kind)}${state} · he has left his work`;
}
