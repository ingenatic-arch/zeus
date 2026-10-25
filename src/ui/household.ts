/**
 * The household panel: who lives in a home, how they feel and why, what they
 * have and lack, what they say, and what has happened to them. Opened by
 * clicking a lived-in home; it reads the sim state and refreshes a few times
 * a second while open.
 */
import type { CoastMap } from '../map/bake';
import { capacity, COTTAGE, FINE, findBuilding, HOME_NAMES, HUT, JOBS, levelName, TENT, TOWNHOUSE, VILLA } from '../sim/buildings';
import { chatterOf } from '../sim/chatter';
import { dateOfTick, formatYear, TICKS_PER_DAY } from '../sim/clock';
import { ageOf, BRINGER, cityHas, cityOffers, citySells, COTTAGE_FOOD_MIN, kinship, lackWords, leavingGroups, missingSince, moodOf, NEED_WORDS, NEEDS, needsOf, newNeeds, RISE_MIN, SETTLE, untilOf, URGENT, WARN_AFTER, WARNING, warningsOf, type Mood } from '../sim/folk';
import { canWorkIn } from '../sim/labour';
import { servesLine } from '../sim/armystatus';
import { foodLine, hazardLines, reachesWork, taxLine, whyDry, whyHungry, whyNoGood, whyNoPlays, whyUnblessed } from '../sim/status';
import { FLEECE, foodList, foodsOnTable, kindsNeeded, OIL, onTable, SERVICE_GOOD, WINE } from '../sim/foods';
import type { Building, Family, Person, Service, SimState, Story, Walker } from '../sim/state';
import { morph } from './morph';
// Slice 30.
import { daysToThief, lootWords, placeOf, targetFor, TEMPT_FULL, TEMPT_SHOW, temptationOf, thiefName, THIEVES_OUT, thievesOut, pronouns } from '../sim/crime';
// Slice 41.
import { crimeFor, crimeOfWalker, isCriminal, KIND_NAME, KIND_VERB, type CrimeKind } from '../sim/crime';
import { criminalDoing, grievances, outFrom } from '../sim/misdeeds';
import { denOf, gangOf, GANG_BREAK, gathering, monthsToGang, postsReaching } from '../sim/gangs';
// Slice 36: an estate's own needs, in words.
import { bringerOf, ESTATE_NEEDS, ESTATE_WORDS, fetchWords, LASTS, needWord, plotWaits, WARE_OF, wareUntil, wareWarnings, type EstateNeed } from '../sim/estates';
import { ESTATE, GREAT_ESTATE } from '../sim/buildings';
import { held } from '../sim/foods';
// Slice 37: a home left by settlers for a colony.
import { leftFor } from '../sim/colonies';
// Slice 45: the court and the prison.
import { awayLines, crimeWords, STOCKS_SPAN, type CaseKind } from '../sim/justice';

/** The food a level needs, for its story: bread for a cottage, a second kind for a townhouse, all three for a fine house. */
const foodFor = (level: number): string => (kindsNeeded(level) >= 3 ? 'all three kinds of food' : kindsNeeded(level) === 2 ? 'a second kind of food' : NEED_WORDS.food);

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const days = (ticks: number): string => {
  const d = Math.max(1, Math.ceil(ticks / TICKS_PER_DAY));
  if (d > 60) return `${Math.round(d / 30)} months`;
  return d === 1 ? '1 day' : `${d} days`;
};

const when = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.monthName.slice(0, 3)} ${formatYear(d.yearBC)}`;
};

/** "Nikias", "Nikias and Theano", "Nikias, Theano and Doros", "Nikias, Theano and 3 others". */
export function nameList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
}

/** A small inline icon for a need. */
const ICON = {
  water: '<svg viewBox="0 0 24 24" class="ic"><path d="M12 2.8c3.3 4.6 6.2 8.2 6.2 11.6a6.2 6.2 0 0 1-12.4 0c0-3.4 2.9-7 6.2-11.6z" fill="#4f9be0" stroke="#2c5f8f" stroke-width="1.2"/></svg>',
  food: '<svg viewBox="0 0 24 24" class="ic"><path d="M3 15.5c0-4.6 4-8 9-8s9 3.4 9 8c0 1.4-1 2.5-2.4 2.5H5.4C4 18 3 16.9 3 15.5z" fill="#e0a548" stroke="#8a5a14" stroke-width="1.2"/><path d="M8.5 10.5l1.4 3M12 9.8v3.4M15.5 10.5l-1.4 3" stroke="#8a5a14" stroke-width="1.4" stroke-linecap="round"/></svg>',
  religion: '<svg viewBox="0 0 24 24" class="ic"><path d="M2.6 8.6 12 3.4l9.4 5.2z" fill="#a98ae0" stroke="#4a3a6a" stroke-width="1.2" stroke-linejoin="round"/><path d="M5.4 10.4v7.4M9.8 10.4v7.4M14.2 10.4v7.4M18.6 10.4v7.4" stroke="#4a3a6a" stroke-width="1.8" stroke-linecap="round"/><path d="M2.8 18.4h18.4v2.6H2.8z" fill="#a98ae0" stroke="#4a3a6a" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  culture: '<svg viewBox="0 0 24 24" class="ic"><path d="M4.6 4.2c4.8 1.4 10 1.4 14.8 0 .6 7.2-1.4 15.4-7.4 16.2C6 19.6 4 11.4 4.6 4.2z" fill="#e3778f" stroke="#7a2a40" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0zM13.4 9.4q1.6-1.4 3.2 0-1.6 1.2-3.2 0z" fill="#7a2a40"/><path d="M8.2 13.6q3.8 4.2 7.6 0" fill="none" stroke="#7a2a40" stroke-width="1.6" stroke-linecap="round"/></svg>',
  oil: '<svg viewBox="0 0 24 24" class="ic"><path d="M10.4 3h3.2l-.3 3.2c3.6.9 5.4 3.9 5.4 7.3 0 3.6-2.2 6.4-4.6 7.5H9.9C7.5 19.9 5.3 17.1 5.3 13.5c0-3.4 1.8-6.4 5.4-7.3z" fill="#8aa83a" stroke="#3e4f12" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.8 6.8C6 6.6 5.4 8.4 6.6 9.6M16.2 6.8c1.8-.2 2.4 1.6 1.2 2.8" fill="none" stroke="#3e4f12" stroke-width="1.2" stroke-linecap="round"/><path d="M9 12.6q.4-2.4 2.2-3.2" fill="none" stroke="#d6e690" stroke-width="1.3" stroke-linecap="round"/></svg>',
  fleece: '<svg viewBox="0 0 24 24" class="ic"><path d="M5.2 14.6c-2.6-.4-3-4 -.4-4.8-.6-2.8 2.4-4.4 4.4-3 1-2.4 4.6-2.4 5.6 0 2-1.4 5 .2 4.4 3 2.6.8 2.2 4.4-.4 4.8.2 2.6-2.6 4.2-4.8 3-1.2 1.8-3.8 1.8-5 0-2.2 1.2-5-.4-4.8-3z" fill="#eee2c0" stroke="#8a744a" stroke-width="1.2" stroke-linejoin="round"/><path d="M11.4 4.6l.6 15" stroke="#4c5a8c" stroke-width="1.8" stroke-linecap="round"/></svg>',
  wine: '<svg viewBox="0 0 24 24" class="ic"><path d="M12.6 5.2c1.8-2.4 4.8-2.8 6.8-1.4-1.6 2.2-4 2.8-6.8 1.4z" fill="#6a9a34" stroke="#3a5a1a" stroke-width="1"/><path d="M11.6 6.6V3.4" stroke="#6a4a22" stroke-width="1.4" stroke-linecap="round"/><g fill="#7a2e80" stroke="#3e1240" stroke-width="1"><circle cx="7.6" cy="9" r="2.3"/><circle cx="12" cy="9" r="2.3"/><circle cx="16.4" cy="9" r="2.3"/><circle cx="9.8" cy="12.8" r="2.3"/><circle cx="14.2" cy="12.8" r="2.3"/><circle cx="12" cy="16.6" r="2.3"/></g></svg>',
  work: '<svg viewBox="0 0 16 16" class="ic"><path d="M3.2 14.4 9.6 8" stroke="#7a5c3c" stroke-width="2.2" stroke-linecap="round"/><path d="M8.2 2.2c2.6-.8 5.4.6 6 3.2l-2.6-.6-2.4 2.4-2.6-2.6z" fill="#7a5c3c"/></svg>',
  fire: '<svg viewBox="0 0 16 16" class="ic"><path d="M8 15c-3 0-4.8-2-4.8-4.6 0-2.4 1.6-3.6 2.4-5.4.4 1.2 1 2 1.8 2.4C7.6 4.8 8.6 2.6 10.4 1c-.2 2.2.6 3.4 1.6 4.8.9 1.2 1.2 2.4 1.2 3.8C13.2 12.6 11.2 15 8 15z" fill="#e2531e" stroke="#8a2a10" stroke-width=".8" stroke-linejoin="round"/><path d="M8 14c-1.4 0-2.2-.9-2.2-2.1 0-1.3.9-2 1.4-3 .6.9 1.4 1.2 1.7 2.1.5-.3.8-.8.9-1.4.6.8.6 1.5.6 2.1C10.4 13 9.4 14 8 14z" fill="#f6c13a"/></svg>',
  wear: '<svg viewBox="0 0 16 16" class="ic"><g fill="#c9b08a" stroke="#7a6446" stroke-width=".7"><rect x="1.5" y="2" width="6" height="3.6"/><rect x="8.5" y="2" width="6" height="3.6"/><rect x="1.5" y="10.4" width="6" height="3.6"/><rect x="8.5" y="10.4" width="6" height="3.6"/><rect x="5" y="6.2" width="6" height="3.6"/><rect x="1.5" y="6.2" width="3" height="3.6"/><rect x="11.5" y="6.2" width="3" height="3.6"/></g><path d="M8.6 1.5 7.4 5.6l1.6 2.2-1.8 2.8.8 3.9" fill="none" stroke="#3a2a22" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  tax: '<svg viewBox="0 0 16 16" class="ic"><ellipse cx="8" cy="11.6" rx="5.6" ry="2" fill="#2f7f6a"/><ellipse cx="8" cy="10.4" rx="5.6" ry="2" fill="#4f9f88"/><ellipse cx="8" cy="7.6" rx="5.6" ry="2" fill="#a07a1e"/><ellipse cx="8" cy="6.4" rx="5.6" ry="2" fill="#e3c060"/></svg>',
  home: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 21v-8.5L12 6l8 6.5V21z" fill="#e9cf98" stroke="#4a3420" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 21v-5h4v5z" fill="#4a3420"/></svg>',
};

/** A little face for the mood: frowning to smiling. */
function face(level: number): string {
  const fill = ['#d0573e', '#dc8048', '#e3aa4a', '#bdb24c', '#86ad44'][level];
  const mouth = ['M7 17.5q5-4.5 10 0', 'M7.5 16.8q4.5-2.6 9 0', 'M8 16h8', 'M7.5 15q4.5 2.8 9 0', 'M7 14.2q5 4.8 10 0'][level];
  const brows = level === 0 ? '<path d="M6.8 8.6l3 1.2M17.2 8.6l-3 1.2" stroke="#4a3420" stroke-width="1.3" stroke-linecap="round"/>' : '';
  return `<svg viewBox="0 0 24 24" class="face"><circle cx="12" cy="12" r="10" fill="${fill}" stroke="#4a3420" stroke-width="1.2"/><circle cx="8.8" cy="10.6" r="1.25" fill="#4a3420"/><circle cx="15.2" cy="10.6" r="1.25" fill="#4a3420"/>${brows}<path d="${mouth}" fill="none" stroke="#4a3420" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

/** What going up to each level brought. */
const UP_LINES = [
  '',
  '',
  'Built a hut, now that water comes to the door',
  'Became a cottage: whitewash, a tiled roof and bread on the table',
  'Became a townhouse: a second storey, a painted band under the eaves, and the priestess’s blessing',
  'Became a fine house: a courtyard, columns at the door, and evenings at the theatre',
  'Became a villa: a colonnade round a garden, an olive tree, and wine at every meal',
];

/** One line of a household's story. */
function storyLine(f: Family, e: Story, i: number): string {
  const who = nameList(e.names);
  const need = e.need === 'food' ? foodFor(e.what === 'down' ? e.level + 1 : e.level) : e.need && e.need !== 'tax' ? needWord(e.need) : 'water';
  switch (e.what) {
    case 'came':
      // (Slice 36: a noble house comes to an estate.)
      if (e.level >= ESTATE) return `${who} came from ${f.origin} with their household and took up the estate`;
      return `${who} came from ${f.origin} and pitched a tent`;
    case 'joined':
      return `${who} moved in`;
    case 'up':
      // (Slice 36: an estate's rise.)
      if (e.level >= GREAT_ESTATE) return 'Became a great estate: statues in the garden, armour on the wall for its sons, horses in the stable';
      return UP_LINES[Math.min(e.level, VILLA)] || 'Moved up a level';
    case 'warn': {
      // After going down a level for want of it, still without: they worry again.
      let again = false;
      for (let j = i - 1; j >= 0; j--) {
        const o = f.story[j];
        if (o.what === 'up' || (o.what === 'relief' && o.need === e.need)) break;
        if (o.what === 'down' && o.need === e.need) {
          again = true;
          break;
        }
      }
      if (again) return `Still without ${need}, even in the ${levelName(e.level, '')}: they began to worry again`;
      return `Ten days without ${need}: they began to worry`;
    }
    case 'relief': {
      // "Just in time" only when it was close (the warning more than half run).
      let warned = -1;
      for (let j = i - 1; j >= 0 && warned < 0; j--) if (f.story[j].what === 'warn') warned = f.story[j].tick;
      const close = warned >= 0 && e.tick - warned > WARNING / 2;
      const by = e.need && e.need !== 'tax' ? bringerOf(e.need) : 'the water carrier';
      return `${by[0].toUpperCase()}${by.slice(1)} came back${close ? ', just in time' : ''}`;
    }
    case 'down':
      return e.level === TENT ? `Went back to a tent, after two months without ${need}` : `Gave up the ${levelName(e.level + 1, '')} for ${levelName(e.level)}, after two months without ${need}`;
    case 'left':
      // Each family that left together has its own line.
      if (e.need === 'tax') return e.names.length >= 3 ? `${e.names[0]} and family went back to ${f.origin}: the taxes were too harsh` : `${who} moved away: the taxes were too harsh`;
      if (e.level >= ESTATE && e.names.length === 0) return `The house packed up and went back to ${f.origin}, after two months without ${need}`;
      return e.names.length >= 3 ? `${e.names[0]} and family went back to ${f.origin}` : `${who} moved away`;
    case 'fell':
      // (Slice 28: a man killed abroad, on an expedition, fell fighting a city's garrison or its watch.)
      return `${e.names[0]} fell fighting ${e.names[1] ?? 'raiders'}${/(garrison|watch)$/.test(e.names[1] ?? '') ? ', far from home' : ' in the streets'}, and the house mourned him`;
    // Slice 30: crime.
    case 'robbed':
      return e.n ? `A thief broke in and took ${e.n} dr` : `A thief broke in; the watchman caught ${e.names[0] ?? 'the thief'} and brought it all back`;
    case 'stole':
      // (Review of slice 30: "his" or "hers", as whoever went out.)
      return `${e.names[0]} came home before dawn with ${e.names[1] ?? 'something'} that wasn’t ${f.members.find((m) => m.name === e.names[0])?.female ? 'hers' : 'his'}`;
    case 'caught':
      // (Slice 45: walked to the court, to be tried there.)
      if (e.names[2] === 'court' && e.names[1] === 'skimming') return `${e.names[0]} kept back some of the tax office’s takings, was found out by the court’s clerks and summoned`;
      if (e.names[2] === 'court') return `${e.names[0]} was caught ${CAUGHT_AT[e.names[1] ?? 'theft'] ?? 'stealing'} by the watchman and walked to the court`;
      // (Slice 41: and the new kinds, by what they were caught at.)
      return `${e.names[0]} was caught ${CAUGHT_AT[e.names[1] ?? 'theft'] ?? 'stealing'} by the watchman; the house paid a ${e.n ?? 0} dr fine`;
    // Slice 41: the new kinds of crime, purses cut, and a gang's den.
    case 'misdeed': {
      const what = e.names[2] ?? 'something';
      if (e.names[1] === 'pickpocket') return `${e.names[0]} came home from the crowd with ${what} out of other people’s purses`;
      if (e.names[1] === 'vandal') return `${e.names[0]} smashed ${what} in a black mood, and came home grinning`;
      if (e.names[1] === 'arson') return `${e.names[0]} set fire to ${what}, and came home smelling of smoke`;
      return `${e.names[0]} came home from the waterfront with ${what} that was meant for the traders`;
    }
    case 'picked':
      return `A purse was cut in the crowd at ${e.names[0] ?? 'the agora'}: ${e.n ?? 0} dr gone`;
    case 'den':
      return e.n ? `${cap(e.names[0] ?? 'a gang')} made the house its den: rough company at all hours` : `The watch broke up ${e.names[0] ?? 'the gang'}; the house is quieter now`;
    // Slice 45: the court's sentence, and home again.
    case 'sentence': {
      const [name, p, kind, place] = e.names;
      const crime = crimeWords((kind ?? 'theft') as CaseKind, false) ?? 'theft';
      if (p === 'fine') return `The court fined ${name} ${e.n ?? 0} dr for ${crime}`;
      if (p === 'stocks') return `${name} stood ${STOCKS_SPAN} in the stocks at the agora${place ? ` ${place}` : ''} for ${crime}, for all to see`;
      if (p === 'prison') return `The court sent ${name} to prison for ${e.n ?? 0} months for ${crime}`;
      if (p === 'labour') return `The court sentenced ${name} to ${e.n ?? 0} months of hard labour at ${place || 'the quarry'} for ${crime}`;
      if (p === 'execution') return `${name} was condemned for ${crime} and drank the hemlock; the house mourned`;
      return `The court sentenced ${name} for ${crime}`;
    }
    case 'freed':
      return `${e.names[0]} came home from ${e.names[1] ?? 'prison'}`;
  }
}

/** Slice 41: what one of them was caught at, by the crime's kind. */
const CAUGHT_AT: Record<string, string> = { theft: 'stealing', pickpocket: 'picking pockets', vandal: 'with a club, on the way to smash something', arson: 'with a torch', smuggling: 'smuggling' };
const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

/** The members, head first, with their ages and how they are related. */
function memberRow(s: SimState, p: Person): string {
  return `<li><span class="nm">${esc(p.name)}</span><span class="age">${ageOf(s, p)}</span><span class="kin">${esc(kinship(p))}</span></li>`;
}

function moodBlock(m: Mood): string {
  const reasons = m.reasons.map((r) => `<li class="${r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : 'so'}">${esc(r.text)}</li>`).join('');
  return `<section class="mood">${face(m.level)}<div><div class="word">${m.word}</div><ul class="reasons">${reasons}</ul></div></section>`;
}

/** Why a home lacks a need, in a few words. */
function whyLacks(s: SimState, map: CoastMap, b: Building, need: Service): string {
  if (need === 'water') return whyDry(s, map, b);
  if (need === 'food') {
    // Some kinds on the table but not all its level needs: the food line says which, and why.
    if (foodsOnTable(b, s.tick).length > 0) return foodLine(s, map, b).replace(/^Only /, 'only ');
    return whyHungry(s, map, b, s.buildings.filter((o) => o.kind === 'agora'));
  }
  const good = SERVICE_GOOD[need];
  if (good !== undefined) return whyNoGood(s, map, b, good);
  return need === 'religion' ? whyUnblessed(s, map, b) : whyNoPlays(s, map, b);
}

const TITLE: Record<Service, string> = { water: 'Water', food: 'Food', religion: 'Blessings', oil: 'Oil', culture: 'Plays', fleece: 'Fleece', wine: 'Wine' };

/** What the next level needs, in a sentence. */
function nextLine(s: SimState, b: Building): string {
  const fed = b.foodUntil - s.tick;
  const settled = s.tick - b.since >= SETTLE ? '' : `, once they’ve been ${/^[aeiou]/.test(levelName(b.level, '')) ? 'an' : 'a'} ${levelName(b.level, '')} a month`;
  const short = (need: Service): string => (untilOf(b, need) - s.tick >= RISE_MIN ? '' : ` (they have ${untilOf(b, need) > s.tick ? `${days(untilOf(b, need) - s.tick)}’ worth` : 'none'})`);
  if (b.level === TENT) return 'To become a hut: water, brought by a fountain’s water carrier';
  if (b.level === HUT) {
    const hand = fed > 0 ? ` (they have ${days(fed)}’ worth)` : '';
    return `To become a cottage: water, and a month’s bread in hand from the agora’s food vendor${fed >= COTTAGE_FOOD_MIN ? '' : hand}`;
  }
  // The next level's food: two kinds for a townhouse, all three for a fine house, and whether the city makes them.
  const has = cityHas(s);
  const kinds = kindsNeeded(b.level + 1);
  const food = kinds === 2 ? 'two kinds of food (bread and meat or cheese)' : 'all three kinds of food (bread, meat and cheese)';
  const makers = has.kinds < kinds ? ` · the city makes only ${has.kinds === 1 ? 'one kind' : `${has.kinds} kinds`}: build ${[!has.makes[1] ? 'a hunting lodge' : '', !has.makes[2] ? 'a dairy' : ''].filter(Boolean).join(kinds - has.kinds > 1 ? ' and ' : ' or ')}` : '';
  const onTable = foodsOnTable(b, s.tick).length;
  const plate = onTable < kinds ? ` (they have ${onTable === 0 ? 'none' : foodList(foodsOnTable(b, s.tick))})` : '';
  if (b.level === COTTAGE) {
    const oil = citySells(s, OIL) ? `, and a month’s oil from an oil vendor${short('oil')}` : ', and oil: the city has no oil stall yet (an olive grove, a press, a storehouse, then K twice on an agora)';
    if (!has.shrine) return `To become a townhouse: the blessing of a shrine’s priestess, ${food}${oil}. The city has no shrine yet`;
    return `To become a townhouse: a month’s blessing in hand from a shrine’s priestess${short('religion')}, with a month of water and of ${food}${plate}${makers}${oil}${settled}`;
  }
  if (b.level === TOWNHOUSE) {
    const fleece = citySells(s, FLEECE) ? `, and a month’s fleece from a fleece vendor${short('fleece')}` : ', and fleece: the city has no fleece stall yet (a sheep pasture, a storehouse, then K three times on an agora)';
    if (!has.theatre) return `To become a fine house: plays, brought by a theatre’s actor, and ${food}${fleece}. The city has no theatre yet`;
    return `To become a fine house: a month’s plays in hand from a theatre’s actor${short('culture')}, with a month of ${food}${plate}${makers}${fleece} and of everything else${settled}`;
  }
  // Slice 36: an estate's rise, and the top.
  if (b.estate) {
    if (b.level >= GREAT_ESTATE) return 'A great estate is as grand as homes get';
    const want = ESTATE_NEEDS.filter((n) => wareUntil(s, b, n) - s.tick < RISE_MIN).map((n) => `${ESTATE_WORDS[n]} (they have ${wareUntil(s, b, n) > s.tick ? `${days(wareUntil(s, b, n) - s.tick)}’ worth` : 'none'})`);
    return `To become a great estate: a month in hand of marble for its statues, armour for its sons and horses for its stable, which its porters and groom fetch from your storehouses${want.length ? ` · short of ${want.join(', ')}` : ''}, with a month of everything a villa needs${settled}`;
  }
  if (b.level === FINE) {
    if (!citySells(s, WINE)) return 'To become a villa: wine, brought by a wine vendor. The city has no wine stall yet (a vineyard, a winery, a storehouse, then K four times on an agora)';
    return `To become a villa: a month’s wine in hand from a wine vendor${short('wine')}, with a month of everything else${settled}`;
  }
  return 'A villa is as grand as homes get';
}

/** What they have and lack, and what the next level needs. */
function needsBlock(s: SimState, map: CoastMap, b: Building): string {
  const has: string[] = [];
  const lack: string[] = [];
  // The needs of their level, and the next level's if it is to be had in the city.
  const shown = new Set<Service>(['water', ...needsOf(b)]);
  if (b.level >= COTTAGE) for (const n of newNeeds(b.level)) if (cityOffers(s, n)) shown.add(n);
  for (const need of NEEDS) {
    if (!shown.has(need)) continue;
    const left = untilOf(b, need) - s.tick;
    const table = need === 'food' ? ` · ${foodList(foodsOnTable(b, s.tick))}` : '';
    if (left > 0) has.push(`${ICON[need]}<span><b>${TITLE[need]}</b>${table} · ${need === 'religion' || need === 'culture' ? 'last' : 'lasts'} ${days(left)} more</span>`);
    else lack.push(`${ICON[need]}<span><b>${TITLE[need]}</b> · ${esc(whyLacks(s, map, b, need))}</span>`);
  }
  const able = canWorkIn(s, b);
  // Their man in the army (slice 23): a line of its own.
  const serves = servesLine(s, b);
  if (serves) has.push(`${ICON.work}<span><b>Serves</b> · ${esc(serves.replace(/ · he has left his work$/, ''))}; he has left his work</span>`);
  if (able > 0 && s.buildings.some((o) => JOBS[o.kind] > 0)) {
    if (b.workers > 0) has.push(`${ICON.work}<span><b>Work</b> for ${b.workers} of the ${able} who can work</span>`);
    if (b.workers < able) {
      const why = b.workers > 0 || reachesWork(s, map.size, b) ? 'but every job they can reach is taken' : 'but no road joins it to a workplace';
      lack.push(`${ICON.work}<span><b>Work</b> · ${b.workers ? `${able - b.workers} more would work` : able === 1 ? 'the one who can work would' : `all ${able} who can work would`}, ${why}</span>`);
    }
  }
  const next = nextLine(s, b);
  // What they pay: a line of its own, neither had nor lacked.
  const tax = taxLine(s, map, b).replace(/^Taxes: /, '');
  const taxes = tax ? `<p class="next taxes">${ICON.tax}<span><b>Taxes</b> · ${esc(tax)}</span></p>` : '';
  const list = (items: string[]): string => (items.length ? `<ul class="chips">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="none">Nothing</p>');
  return `<section class="needs"><h3>What they have</h3>${list(has)}<h3>What they lack</h3>${list(lack)}${taxes}<p class="next">${ICON.home}<span>${esc(next)}</span></p></section>`;
}

/** The warning box: what ran out, how long ago, how long they will put up with it, and what would help. */
function warningBlock(s: SimState, map: CoastMap, b: Building): string {
  const ws = warningsOf(s, b);
  const w = ws[0];
  if (!w) {
    // A few days late is ordinary: a softer note, no warning yet.
    const need = needsOf(b).find((n) => untilOf(b, n) <= s.tick);
    if (!need) return '';
    const until = untilOf(b, need);
    const since = missingSince(b, need);
    const what = lackWords(s, b, need);
    // A town saved before this level needed it: they put up with it for a while (see missingSince).
    if (since > s.tick) return `<div class="late">${ICON[need]}<span>No ${what} yet · they’ll put up with it for ${days(since - s.tick)} more, then start to worry</span></div>`;
    const gone = s.tick - since;
    if (need === 'food' && since === b.grace && since > Math.max(until, b.since)) {
      return `<div class="late">${ICON[need]}<span>No ${what} yet · they’ll start to worry in ${days(WARN_AFTER - gone)}</span></div>`;
    }
    // Gone longer than that: they have just moved down a level without it, and the count starts again.
    if (s.tick - until >= WARN_AFTER) {
      return `<div class="late">${ICON[need]}<span>Still no ${what}${until > 0 ? `, ${days(s.tick - until)} now` : ''} · they’ve made do with the ${levelName(b.level, '')}, and will start to worry again in ${days(WARN_AFTER - gone)}</span></div>`;
    }
    // Bread on the table, but not the second (or third) kind its level needs.
    if (need === 'food' && onTable(b, s.tick) > 0) return `<div class="late">${ICON[need]}<span>No ${what} for ${days(gone)} · they’ll start to worry after ${days(WARN_AFTER)}</span></div>`;
    const by = BRINGER[need];
    return `<div class="late">${ICON[need]}<span>${by[0].toUpperCase()}${by.slice(1)} is ${days(gone)} late · they’ll start to worry after ${days(WARN_AFTER)}</span></div>`;
  }
  const to = levelName(b.level - 1);
  // (Slice 36: an estate is left, not let go down to a villa.)
  if (b.estate && b.level === ESTATE) {
    const share = Math.max(0, Math.min(1, w.left / WARNING));
    const title = ws.map((x, i) => `${i ? 'no' : 'No'} ${lackWords(s, b, x.need)} for ${days(s.tick - x.since)}`).join(', ');
    const icons = NEEDS.filter((n) => ws.some((x) => x.need === n)).map((n) => ICON[n]).join('');
    return `<div class="warning${w.left <= URGENT ? ' urgent' : ''}"><span class="icons">${icons}</span><div><b>${title}</b><p>In ${days(w.left)} the house packs up and leaves the estate, unless ${BRINGER[w.need]} comes by.</p><div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div><p class="why">Why: ${esc(whyLacks(s, map, b, w.need))}</p></div></div>`;
  }
  const share = Math.max(0, Math.min(1, w.left / WARNING));
  const urgent = w.left <= URGENT;
  // Who would go: whole families together, named.
  const f = b.family;
  const groups = f ? leavingGroups(s, f, b.people - capacity({ ...b, level: b.level - 1 })) : [];
  const going = groups.reduce((n, g) => n + g.length, 0);
  const label = (g: number[]): string => (!f ? '' : g.length >= 3 ? `${f.members[g[0]].name} and family` : nameList(g.map((i) => f.members[i].name)));
  const who = going > 0 ? ` ${going === 1 ? `${label(groups[0])} would move away` : `${going} of them would move away (${groups.map(label).join('; ')})`}.` : '';
  const title = ws.map((x, i) => `${i ? 'no' : 'No'} ${lackWords(s, b, x.need)} for ${days(s.tick - x.since)}`).join(', ');
  // The other needs they lack, each with when it alone would send them down (needs that would do so on the same day share a clause).
  const rest: Array<{ words: string[]; left: number }> = [];
  for (const x of ws.slice(1)) {
    const same = rest.find((r) => days(r.left) === days(x.left));
    if (same) same.words.push(lackWords(s, b, x.need));
    else rest.push({ words: [lackWords(s, b, x.need)], left: x.left });
  }
  const also = rest.map((r, i) => (i ? ` Without ${r.words.join(' or ')}, in ${days(r.left)}.` : ` Without ${r.words.join(' or ')}, they go in ${days(r.left)} all the same.`)).join('');
  const why = ws.map((x) => `<p class="why">${ws.length > 1 ? `${TITLE[x.need]}: ` : 'Why: '}${esc(whyLacks(s, map, b, x.need))}</p>`).join('');
  // The icons in the order the signs show them.
  const icons = NEEDS.filter((n) => ws.some((x) => x.need === n)).map((n) => ICON[n]).join('');
  return `<div class="warning${urgent ? ' urgent' : ''}"><span class="icons">${icons}</span><div><b>${title}</b><p>In ${days(w.left)} they give up the ${levelName(b.level, '')} for ${to}, unless ${BRINGER[w.need]} comes by.${esc(who)}${also}</p><div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div>${why}</div></div>`;
}

/**
 * Fire and wear for the household: smouldering or creaking as a warning box
 * (the days left and who can stop it), else risk or wear past a quarter as a
 * quieter note; nothing while the house is safe and sound.
 */
function hazardBlock(s: SimState, map: CoastMap, b: Building): string {
  const ls = hazardLines(s, map, b);
  if (!ls.length) return '';
  return ls
    .map((l) => {
      const fire = /^(On fire|Smouldering|Fire risk)/.test(l);
      const [head, ...rest] = l.split(' · ');
      const urgent = /^(On fire|Smouldering|Creaking)/.test(l);
      if (urgent) return `<div class="warning urgent hazard"><span class="icons">${fire ? ICON.fire : ICON.wear}</span><div><b>${esc(head)}</b><p>${esc(rest.join(' · '))}</p></div></div>`;
      return `<div class="late hazard">${fire ? ICON.fire : ICON.wear}<span>${esc(l)}</span></div>`;
    })
    .join('');
}

/** Slice 30: a hooded figure, for the temptation block. */
const HOOD = '<svg viewBox="0 0 24 24" class="ic"><path d="M12 2.4c-3.9 0-6.3 3-6.3 6.9 0 1.8.5 3.3 1.2 4.5L4.5 21.8h15l-2.4-8c.7-1.2 1.2-2.7 1.2-4.5 0-3.9-2.4-6.9-6.3-6.9z" fill="#3a3540" stroke="#1a1820" stroke-width="1.1" stroke-linejoin="round"/><ellipse cx="12" cy="9.9" rx="3" ry="3.4" fill="#1a1820"/><circle cx="17.6" cy="18" r="3.2" fill="#c8963c" stroke="#5e4214" stroke-width="1"/></svg>';

/**
 * Slice 30: how tempted the household is to steal, and why, from a quarter up
 * (or one of them out stealing now): the reasons, how far it has built and
 * how soon someone slips out, and what holds them back. Slice 41: with the
 * new kinds on, whichever crime their trouble points to, and why; one of them
 * out at any crime; a gang's den; talk of burning; a gang gathering round it.
 */
function crimeBlock(s: SimState, map: CoastMap, b: Building): string {
  if (!s.crime.on) return '';
  // Slice 41: a gang's den, talk of burning, a gang gathering here, before anything else.
  const extra = s.crime.kinds ? gangBlock(s, map, b) : '';
  const out = s.crime.kinds ? outFrom(s, b) : s.walkers.find((w) => w.kind === 'thief' && w.home === b.id && w.people > 0);
  if (out && (out.kind !== 'thief' || gangOf(s, out))) return extra + outBlock(s, b, out);
  if (out) {
    const t = findBuilding(s, out.target);
    const pr = pronouns(b, out);
    const doing = out.back ? (out.load > 0 ? `slipping home with ${lootWords(out)}` : 'slipping home empty-handed') : `on ${pr.his} way to ${t ? placeOf(t) : 'somewhere'}`;
    return `${extra}<div class="warning crime">${HOOD}<div><b>${esc(thiefName(b, out))} is out stealing</b><p>${esc(doing)}${out.meat > 0 ? `, a watchman after ${pr.him}` : ''}</p><p class="why">A watchman who sees ${pr.him} runs after ${pr.him}; caught, the house pays a fine.</p></div></div>`;
  }
  if (b.tempt < TEMPT_SHOW || denOf(s, b) || s.crime.talk.some((x) => x.home === b.id)) return extra;
  const t = temptationOf(s, map.size, b);
  const pushing = t.reasons.filter((r) => r.w > 0).map((r) => r.text);
  const holding = t.reasons.filter((r) => r.w < 0).map((r) => r.text);
  const pct = Math.round((100 * b.tempt) / TEMPT_FULL);
  const d = daysToThief(b, t);
  // Slice 41: which crime their trouble points to (theft, with the new kinds off).
  const c = s.crime.kinds ? crimeFor(s, map.size, b, t) : null;
  const kind = c?.kind ?? 'theft';
  if (kind === 'theft') {
    const full = thievesOut(s).length >= THIEVES_OUT;
    const soon = d === 0 ? (targetFor(s, map.size, b) ? (full ? `someone slips out once one of the ${THIEVES_OUT} thieves out now is home` : 'someone slips out any day now') : 'nothing worth stealing within reach, for now') : d < Infinity ? `a thief in about ${days(d * TICKS_PER_DAY)}` : 'easing';
    const head = pushing.length ? `Tempted to steal: ${pushing.join(', ')}` : 'Tempted to steal, less each day';
    const held = holding.length ? `<p class="why">Holding them back: ${esc(holding.join(', '))}.</p>` : '<p class="why">A watchman walking by would hold them back (a watch post, Z twice).</p>';
    return `${extra}<div class="warning crime">${HOOD}<div><b>${esc(head)}</b><p>${pct}% · ${esc(soon)}</p><div class="bar"><i style="width:${pct}%"></i></div>${held}</div></div>`;
  }
  const name = KIND_NAME[kind];
  const soon = d === 0 ? (kind === 'arson' ? 'talk of burning begins any day now' : `a ${name} slips out any day now`) : d < Infinity ? (kind === 'arson' ? `talk of burning in about ${days(d * TICKS_PER_DAY)}` : `a ${name} in about ${days(d * TICKS_PER_DAY)}`) : 'easing';
  // Slice 45 (slice 41's review): the reasons once, in the "Why" line, with what points them to this crime rather than theft
  // (a vandal's "angry and idle" only says again what the reasons say), and the place within reach.
  const head = pushing.length ? `Tempted to ${KIND_VERB[kind]}` : `Tempted to ${KIND_VERB[kind]}, less each day`;
  const reason = kind === 'vandal' ? '' : (c?.why ?? '').replace(/^poor, and /, '');
  const whyText = [pushing.join(', '), reason].filter((x) => x).join(', and ');
  const why = `<p class="why">${esc(`Why ${KIND_VERB[kind] === 'burn' ? 'burning' : KIND_ING[kind]}: ${whyText || 'not much any more'}. ${cap(placeOf(c!.target))} is within reach.`)}</p>`;
  const held = holding.length ? `<p class="why">Holding them back: ${esc(holding.join(', '))}.</p>` : '<p class="why">A watchman walking by would hold them back (a watch post, Z twice).</p>';
  return `${extra}<div class="warning crime">${HOOD}<div><b>${esc(head)}</b><p>${pct}% · ${esc(soon)}</p><div class="bar"><i style="width:${pct}%"></i></div>${why}${held}</div></div>`;
}

/** Slice 45: one of them caught and walked to the court, waiting for trial, in prison, at hard labour or in the stocks. */
function awayBlock(s: SimState, map: CoastMap, b: Building): string {
  const lines = awayLines(s, map, b);
  if (!lines.length) return '';
  return `<div class="warning crime law">${HOOD}<div><b>${esc(lines.length === 1 ? 'Before the law' : `Before the law: ${lines.length} of them`)}</b>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div></div>`;
}

/** Slice 41: "picking pockets", "smashing things", "smuggling". */
const KIND_ING: Record<CrimeKind, string> = { theft: 'stealing', pickpocket: 'picking pockets', vandal: 'smashing things', arson: 'burning', smuggling: 'smuggling' };

/** Slice 41: one of them out at a new kind of crime: what doing, and what the watch would do. */
function outBlock(s: SimState, b: Building, w: Walker): string {
  const kind = crimeOfWalker(w.kind);
  const pr = pronouns(b, w);
  const g = gangOf(s, w);
  const doing = criminalDoing(s, w);
  const watch = g ? `One of ${g.name}’s men: a lone watchman can’t take ${pr.him}; two can.` : `A watchman who sees ${pr.him} runs after ${pr.him}; caught, the house pays a fine.`;
  return `<div class="warning crime">${HOOD}<div><b>${esc(thiefName(b, w))} is out ${esc(KIND_ING[kind])}</b><p>${esc(doing)}${w.meat > 0 ? `, a watchman after ${pr.him}` : ''}</p><p class="why">${esc(watch)}</p></div></div>`;
}

/** Slice 41: the house as a gang's den, talk of burning in it, or a gang gathering round it. */
function gangBlock(s: SimState, map: CoastMap, b: Building): string {
  const out: string[] = [];
  const g = denOf(s, b);
  if (g) {
    const den = postsReaching(s, map.size, b).length;
    const men = s.walkers.filter((w) => w.home === b.id && w.people > 0 && isCriminal(w.kind)).length;
    const breaking = g.covered > 0 ? ` Two watch posts reach it now: the gang breaks up in about ${days(Math.max(1, GANG_BREAK * TICKS_PER_DAY - (s.tick - g.covered)))}.` : den === 1 ? ' One watch post’s round reaches it: a second whose round reaches this house would break the gang up.' : ' Two watch posts whose rounds reach this house would break the gang up.';
    out.push(`<div class="warning urgent crime">${HOOD}<div><b>The den of ${esc(g.name)}</b><p>${men ? `${men} of its men out now · ` : ''}its men go out every week or so, to steal, smuggle or pick pockets, and beat off a lone watchman</p><p class="why">${esc(breaking.trim())}</p></div></div>`);
  }
  const talk = s.crime.talk.find((x) => x.home === b.id);
  if (talk) {
    const t = temptationOf(s, map.size, b);
    const left = Math.max(0, talk.at - s.tick);
    out.push(`<div class="warning urgent crime">${HOOD}<div><b>Talk of burning: ${esc(grievances(s, b, t))}</b><p>someone sets a fire ${left > 0 ? `in about ${days(left)}` : 'any day now'}, unless things get better</p><p class="why">A watchman walking by would calm it (a watch post, Z twice); so would food on the table and lighter taxes.</p></div></div>`);
  }
  const gath = gathering(s).find((x) => x.seat === b.id);
  if (gath && !g) {
    const m = monthsToGang(gath.heat);
    out.push(`<div class="warning crime">${HOOD}<div><b>A gang is gathering around this house</b><p>the homes here have been tempted for ${gath.heat} months: ${m > 0 ? `in about ${m} ${m === 1 ? 'month' : 'months'}` : 'any day now'} a gang takes a house here as its den</p><p class="why">A watch post whose round comes this way would scatter it.</p></div></div>`);
  }
  return out.join('');
}

/** Slice 36: a little icon for each of an estate's own needs. */
const ESTATE_ICON: Record<EstateNeed, string> = {
  marble: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 9.6 12 6l8 3.6v8L12 21l-8-3.4z" fill="#f2ede0" stroke="#7a7260" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 9.6l8 3.4 8-3.4M12 13v8" fill="none" stroke="#7a7260" stroke-width="1.1"/></svg>',
  armour: '<svg viewBox="0 0 24 24" class="ic"><path d="M6 4.4h12l-1 6.2c-.4 2.8 1 5 1 8.4H6c0-3.4 1.4-5.6 1-8.4z" fill="#c8963c" stroke="#5e4214" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 4.4q3 3 6 0M12 9v8" fill="none" stroke="#5e4214" stroke-width="1.1"/></svg>',
  horses: '<svg viewBox="0 0 24 24" class="ic"><path d="M7 21c.4-3.4 1.6-6 1-8.4-.4-1.6-2.4-2.4-3.4-3.8L7.6 5c1-.8 2.4-1.4 3.6-1.4l.6-1.8 1.4 1.6c3.6.8 6.2 4 6.6 8.2.2 3.2-.4 6.6-1.6 9.4z" fill="#8a5a34" stroke="#3a2412" stroke-width="1.1" stroke-linejoin="round"/><circle cx="9.6" cy="7.2" r=".9" fill="#1a120c"/></svg>',
};

/**
 * Slice 36: an estate's stable and yard: its marble, armour and horses, how
 * long each lasts, and whether its porters are out for more (or why not); at a
 * great estate, a warning box for any it has gone without.
 */
function stableBlock(s: SimState, b: Building): string {
  if (b.people === 0) return '';
  const great = b.level >= GREAT_ESTATE;
  const ws = wareWarnings(s, b);
  const w = ws[0];
  let warn = '';
  if (w) {
    const share = Math.max(0, Math.min(1, w.left / WARNING));
    const title = ws.map((x, i) => `${i ? 'no' : 'No'} ${ESTATE_WORDS[x.need]} for ${days(s.tick - x.since)}`).join(', ');
    warn = `<div class="warning${w.left <= URGENT ? ' urgent' : ''}"><span class="icons">${ws.map((x) => ESTATE_ICON[x.need]).join('')}</span><div><b>${title}</b><p>In ${days(w.left)} they give up the great estate for an estate, unless ${bringerOf(w.need)} comes back from a storehouse.</p><div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div><p class="why">${esc(fetchWords(s, b, w.need))}</p></div></div>`;
  }
  const rows = ESTATE_NEEDS.map((n) => {
    const left = wareUntil(s, b, n) - s.tick;
    const have = held(b, WARE_OF[n]);
    const lasts = left > 0 ? `${have} in hand${great ? `, lasting ${days(left)}` : ''}` : 'none';
    return `<li>${ESTATE_ICON[n]}<span><b>${ESTATE_WORDS[n][0].toUpperCase()}${ESTATE_WORDS[n].slice(1)}</b> · ${esc(lasts)} · ${esc(fetchWords(s, b, n))}</span></li>`;
  }).join('');
  const use = great ? `A great estate uses a block of marble every ${days(LASTS.marble)}, a set of armour every ${days(LASTS.armour)} and a horse every ${days(LASTS.horses)}` : 'An estate gathers them for when it becomes a great estate';
  return `${warn}<section class="needs stable"><h3>Their stable and yard</h3><ul class="chips">${rows}</ul><p class="none">${esc(use)}</p></section>`;
}

/** The whole panel's inner HTML for a home. */
export function householdHtml(s: SimState, map: CoastMap, b: Building): string {
  const f = b.family;
  const level = HOME_NAMES[Math.min(b.level, HOME_NAMES.length - 1)];
  if (!f && b.estate) return `<header><div class="kicker">An estate’s plot</div><h2>Waiting for a noble house</h2></header><section class="needs"><p class="next">${ICON.home}<span>${esc(plotWaits(s, map, b))}</span></p></section>`;
  // (Slice 37 review: a home its household left to found a colony says so, as its hover does.)
  const left = f ? '' : leftFor(s, b.id);
  if (!f) return `<header><div class="kicker">${level}</div><h2>Nobody lives here</h2>${left ? `<div class="from">${esc(left)}</div>` : ''}</header>`;
  const cap = capacity(b);
  const room = b.people >= cap ? 'full' : `room for ${cap - b.people} more`;
  const since = ` · here since ${when(f.came)}`;
  const has = (k: Building['kind']): boolean => s.buildings.some((o) => o.kind === k);
  const mood = moodOf(s, b, { agora: has('agora'), jobs: s.buildings.some((o) => JOBS[o.kind] > 0), shrine: has('shrine'), theatre: has('theatre') }, canWorkIn(s, b));
  const able = canWorkIn(s, b);
  const talk = chatterOf(s, b, able > b.workers)
    .map((l) => `<blockquote>“${esc(l.text)}”<cite>${esc(l.who.name)}, ${ageOf(s, l.who)}</cite></blockquote>`)
    .join('');
  const members = f.members.map((p) => memberRow(s, p)).join('');
  const story = f.story
    .map((e, i) => `<li><span class="when">${when(e.tick)}</span><span>${esc(storyLine(f, e, i))}</span></li>`)
    .reverse()
    .join('');
  return `<header><div class="kicker">${level} · ${b.people} ${b.people === 1 ? 'person' : 'people'}, ${room}</div><h2>The house of ${esc(f.name)}</h2><div class="from">From ${esc(f.origin)}${since}</div></header>
${warningBlock(s, map, b)}
${b.estate ? stableBlock(s, b) : ''}
${hazardBlock(s, map, b)}
${crimeBlock(s, map, b)}
${awayBlock(s, map, b)}
${moodBlock(mood)}
<section class="talk">${talk}</section>
${needsBlock(s, map, b)}
<section class="members"><h3>Who lives here</h3><ul>${members}</ul></section>
<section class="story"><h3>Their story</h3><ul>${story}</ul></section>`;
}

/** How often (seconds) the open panel is brought up to date. */
const REFRESH = 0.3;

export class HouseholdPanel {
  private readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private shownId = 0;
  private html = '';
  private last = -Infinity;

  constructor(root: HTMLElement, onClose: () => void) {
    const el = document.createElement('div');
    el.className = 'household';
    el.hidden = true;
    el.innerHTML = '<button class="close" title="Close (Esc)" aria-label="Close">×</button><div class="body"></div>';
    root.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', onClose);
  }

  /** The home showing, or 0. */
  get id(): number {
    return this.shownId;
  }

  get open(): boolean {
    return this.shownId !== 0;
  }

  show(id: number): void {
    if (id !== this.shownId) this.body.scrollTop = 0;
    this.shownId = id;
    this.last = -Infinity;
    this.el.hidden = id === 0;
  }

  /** Refresh while open; closes itself if the home has gone. Returns the home showing, if any. */
  update(s: SimState, map: CoastMap, time: number): Building | null {
    if (!this.shownId) return null;
    const b = findBuilding(s, this.shownId);
    if (!b || b.kind !== 'home') {
      this.show(0);
      return null;
    }
    if (time - this.last < REFRESH) return b;
    this.last = time;
    const html = householdHtml(s, map, b);
    if (html !== this.html) {
      this.html = html;
      // In place (see morph): a hover tip stays up while the figures move.
      morph(this.body, html);
    }
    return b;
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.textContent ?? '');
  }
}
