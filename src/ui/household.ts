/**
 * The household panel: who lives in a home, how they feel and why, what they
 * have and lack, what they say, and what has happened to them. Opened by
 * clicking a lived-in home; it reads the sim state and refreshes a few times
 * a second while open.
 */
import type { CoastMap } from '../map/bake';
import { capacity, COTTAGE, findBuilding, HOME_NAMES, HUT, JOBS, TENT } from '../sim/buildings';
import { chatterOf } from '../sim/chatter';
import { dateOfTick, formatYear, TICKS_PER_DAY } from '../sim/clock';
import { ageOf, COTTAGE_FOOD_MIN, kinship, moodOf, WARN_AFTER, WARNING, warningOf, type Mood } from '../sim/folk';
import { canWork } from '../sim/labour';
import { distFrom, roadsBeside } from '../sim/rounds';
import { whyDry, whyHungry } from '../sim/status';
import type { Building, Family, Person, SimState, Story } from '../sim/state';

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
  work: '<svg viewBox="0 0 16 16" class="ic"><path d="M3.2 14.4 9.6 8" stroke="#7a5c3c" stroke-width="2.2" stroke-linecap="round"/><path d="M8.2 2.2c2.6-.8 5.4.6 6 3.2l-2.6-.6-2.4 2.4-2.6-2.6z" fill="#7a5c3c"/></svg>',
  home: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 21v-8.5L12 6l8 6.5V21z" fill="#e9cf98" stroke="#4a3420" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 21v-5h4v5z" fill="#4a3420"/></svg>',
};

/** A little face for the mood: frowning to smiling. */
function face(level: number): string {
  const fill = ['#d0573e', '#dc8048', '#e3aa4a', '#bdb24c', '#86ad44'][level];
  const mouth = ['M7 17.5q5-4.5 10 0', 'M7.5 16.8q4.5-2.6 9 0', 'M8 16h8', 'M7.5 15q4.5 2.8 9 0', 'M7 14.2q5 4.8 10 0'][level];
  const brows = level === 0 ? '<path d="M6.8 8.6l3 1.2M17.2 8.6l-3 1.2" stroke="#4a3420" stroke-width="1.3" stroke-linecap="round"/>' : '';
  return `<svg viewBox="0 0 24 24" class="face"><circle cx="12" cy="12" r="10" fill="${fill}" stroke="#4a3420" stroke-width="1.2"/><circle cx="8.8" cy="10.6" r="1.25" fill="#4a3420"/><circle cx="15.2" cy="10.6" r="1.25" fill="#4a3420"/>${brows}<path d="${mouth}" fill="none" stroke="#4a3420" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

/** One line of a household's story. */
function storyLine(f: Family, e: Story): string {
  const who = nameList(e.names);
  const need = e.need === 'water' ? 'water' : 'bread';
  switch (e.what) {
    case 'came':
      return `${who} came from ${f.origin} and pitched a tent`;
    case 'joined':
      return `${who} moved in`;
    case 'up':
      return e.level >= COTTAGE ? 'Became a cottage: whitewash, a tiled roof and bread on the table' : 'Built a hut, now that water comes to the door';
    case 'warn':
      return e.need === 'water' ? 'The water ran out' : 'The bread ran out';
    case 'relief':
      return e.need === 'water' ? 'The water carrier came back, just in time' : 'The food vendor came back, just in time';
    case 'down':
      return e.level === HUT ? `Gave up the cottage for a hut, after two months without ${need}` : `Went back to a tent, after two months without ${need}`;
    case 'left':
      return `${who} ${e.names.length === 1 ? 'moved' : 'moved'} away`;
  }
}

/** The members, head first, with their ages and how they are related. */
function memberRow(s: SimState, p: Person): string {
  return `<li><span class="nm">${esc(p.name)}</span><span class="age">${ageOf(s, p)}</span><span class="kin">${esc(kinship(p))}</span></li>`;
}

function moodBlock(m: Mood): string {
  const reasons = m.reasons.map((r) => `<li class="${r.tone > 0 ? 'good' : r.tone < 0 ? 'bad' : 'so'}">${esc(r.text)}</li>`).join('');
  return `<section class="mood">${face(m.level)}<div><div class="word">${m.word}</div><ul class="reasons">${reasons}</ul></div></section>`;
}

/** What they have and lack, and what the next level needs. */
function needsBlock(s: SimState, map: CoastMap, b: Building): string {
  const has: string[] = [];
  const lack: string[] = [];
  const wet = b.waterUntil - s.tick;
  const fed = b.foodUntil - s.tick;
  const agoras = s.buildings.filter((o) => o.kind === 'agora');
  if (wet > 0) has.push(`${ICON.water}<span><b>Water</b> · lasts ${days(wet)} more</span>`);
  else lack.push(`${ICON.water}<span><b>Water</b> · ${esc(whyDry(s, map, b))}</span>`);
  if (b.level >= HUT) {
    if (fed > 0) has.push(`${ICON.food}<span><b>Bread</b> · lasts ${days(fed)} more</span>`);
    else lack.push(`${ICON.food}<span><b>Bread</b> · ${esc(whyHungry(s, map, b, agoras))}</span>`);
  }
  const able = canWork(b);
  if (able > 0 && s.buildings.some((o) => JOBS[o.kind] > 0)) {
    if (b.workers > 0) has.push(`${ICON.work}<span><b>Work</b> for ${b.workers} of the ${able} who can work</span>`);
    if (b.workers < able) {
      const why = b.workers > 0 || reachesWork(s, map, b) ? 'but every job they can reach is taken' : 'but no road joins it to a workplace';
      lack.push(`${ICON.work}<span><b>Work</b> · ${b.workers ? `${able - b.workers} more` : `the ${able} who could`} would work, ${why}</span>`);
    }
  }
  let next = '';
  if (b.level === TENT) next = 'To become a hut: water, brought by a fountain’s water carrier';
  else if (b.level === HUT) {
    const hand = fed > 0 ? ` (they have ${days(fed)}’ worth)` : '';
    next = `To become a cottage: water, and a month’s bread in hand from the agora’s food vendor${fed >= COTTAGE_FOOD_MIN ? '' : hand}`;
  } else next = 'A cottage is as fine as homes get, for now';
  const list = (items: string[]): string => (items.length ? `<ul class="chips">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="none">Nothing</p>');
  return `<section class="needs"><h3>What they have</h3>${list(has)}<h3>What they lack</h3>${list(lack)}<p class="next">${ICON.home}<span>${esc(next)}</span></p></section>`;
}

/** Whether any workplace is joined to the home by road. */
function reachesWork(s: SimState, map: CoastMap, b: Building): boolean {
  const roads = roadsBeside(s, map.size, b);
  return s.buildings.some((o) => JOBS[o.kind] > 0 && roads.some((t) => distFrom(s, map.size, o)[t] >= 0));
}

/** The warning box: what ran out, how long ago, how long they will put up with it, and what would help. */
function warningBlock(s: SimState, map: CoastMap, b: Building): string {
  const w = warningOf(s, b);
  if (!w) {
    // A few days late is ordinary: a softer note, no warning yet.
    const late = b.level >= HUT && (b.waterUntil <= s.tick || (b.level >= COTTAGE && b.foodUntil <= s.tick));
    if (!late) return '';
    const need = b.waterUntil <= s.tick ? 'water' : 'food';
    const gone = s.tick - Math.max(need === 'water' ? b.waterUntil : b.foodUntil, b.since);
    return `<div class="late">${ICON[need]}<span>${need === 'water' ? 'The water carrier' : 'The food vendor'} is ${days(gone)} late · they’ll start to worry after ${days(WARN_AFTER)}</span></div>`;
  }
  const what = w.need === 'water' ? 'water' : 'bread';
  const to = b.level === HUT ? 'a tent' : 'a hut';
  const help = w.need === 'water' ? whyDry(s, map, b) : whyHungry(s, map, b, s.buildings.filter((o) => o.kind === 'agora'));
  const share = Math.max(0, Math.min(1, w.left / WARNING));
  const urgent = w.left <= 10 * TICKS_PER_DAY;
  const leave = b.people - capacity({ ...b, level: b.level - 1 });
  const who = leave > 0 ? ` and ${leave === 1 ? 'one of them moves' : `${leave} of them move`} away` : '';
  return `<div class="warning${urgent ? ' urgent' : ''}">${ICON[w.need]}<div><b>No ${what} for ${days(s.tick - w.since)}</b><p>In ${days(w.left)} they give up the ${HOME_NAMES[b.level].replace(/^A /, '').toLowerCase()} for ${to}${who}, unless ${w.need === 'water' ? 'the water carrier comes by' : 'the food vendor comes by'}.</p><div class="bar"><i style="width:${(share * 100).toFixed(1)}%"></i></div><p class="why">Why: ${esc(help)}</p></div></div>`;
}

/** The whole panel's inner HTML for a home. */
export function householdHtml(s: SimState, map: CoastMap, b: Building): string {
  const f = b.family;
  const level = HOME_NAMES[Math.min(b.level, HOME_NAMES.length - 1)];
  if (!f) return `<header><div class="kicker">${level}</div><h2>Nobody lives here</h2></header>`;
  const cap = capacity(b);
  const room = b.people >= cap ? 'full' : `room for ${cap - b.people} more`;
  const came = f.story.find((e) => e.what === 'came');
  const since = came ? ` · here since ${when(came.tick)}` : '';
  const mood = moodOf(s, b, { agora: s.buildings.some((o) => o.kind === 'agora'), jobs: s.buildings.some((o) => JOBS[o.kind] > 0) }, canWork(b));
  const able = canWork(b);
  const talk = chatterOf(s, b, able > b.workers)
    .map((l) => `<blockquote>“${esc(l.text)}”<cite>${esc(l.who.name)}, ${ageOf(s, l.who)}</cite></blockquote>`)
    .join('');
  const members = f.members.map((p) => memberRow(s, p)).join('');
  const story = [...f.story]
    .reverse()
    .map((e) => `<li><span class="when">${when(e.tick)}</span><span>${esc(storyLine(f, e))}</span></li>`)
    .join('');
  return `<header><div class="kicker">${level} · ${b.people} ${b.people === 1 ? 'person' : 'people'}, ${room}</div><h2>The house of ${esc(f.name)}</h2><div class="from">From ${esc(f.origin)}${since}</div></header>
${warningBlock(s, map, b)}
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
      this.body.innerHTML = html;
    }
    return b;
  }

  /** The panel's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.body.textContent ?? '');
  }
}
