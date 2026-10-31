/**
 * Slice 53: the gods on screen.
 *
 * - **The Olympus panel** (G, or the top bar's thunderbolt): the twelve as
 *   cards, four by three, each with its emblem in the god's colour, the mood
 *   in a word and on a bar from furious to loving, the weightiest reasons,
 *   their shrines, their sanctuary (merge with slice 54) and their rival. A card
 *   opens the god's page: every reason with its worth, two years of moods,
 *   what they love and hate, the rivalry, their shrines (each a link), the
 *   festival and the offering (sent to their first shrine), and what they
 *   can do in blessing and in wrath (the table's words; slice 57 makes them
 *   real).
 * - **A shrine's section** in its building panel (the registry's `more`):
 *   its god, or the twelve to choose from (a new shrine opens asking), the
 *   god's mood and reasons, a festival and an offering.
 * - **The overview's Gods page** (`godsPage`): the twelve's moods with two
 *   years of monthly bars, and links to their shrines.
 *
 * It only reads the state; its buttons send commands.
 */
import './olympus.css';
import type { CoastMap } from '../map/bake';
import { dateOfTick, MONTH_NAMES, TICKS_PER_MONTH } from '../sim/clock';
import type { Command } from '../sim/commands';
import { GOD_IDS, GOD_MOODS, GODS, MOOD_MONTHS, moodOfGod, moodRank, moodWord, noticed, reasonsOf, type GodId, type GodReason } from '../sim/pantheon';
import type { Building, SimState } from '../sim/state';
import { FESTIVAL_COST, festivalGoods, festivalOf, festivalRefusal, goodsWords, offeringOf, offeringTo, offerRefusal, placeWords, shrinesTo, shrineWords } from '../sim/worship';
// Merge with slice 54: a god's sanctuary on their card and page, and the festival and offering on a sanctuary's panel.
import { mapOf } from '../map/lands';
import { findBuilding } from '../sim/buildings';
import { stagesOf } from '../sim/monuments';
import { dimmed, sanctuaryDone, sanctuaryName, sanctuaryOf, STANDING_HONOUR } from '../sim/sanctuaries';
import { SANCTUARY_SLOTS } from './sanctuarypanel';
import { emblemSvg, godColour } from './emblems';
import { actionIcon } from './icons';
import { esc, kbtn, kitHtml, ksec } from './kit';
import { morph } from './morph';

const cap = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const plural = (n: number, one: string, many: string): string => `${n === 1 ? 'one' : n} ${n === 1 ? one : many}`;
const dayWords = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${MONTH_NAMES[d.month]}`;
};

// ---------------------------------------------------------------------------- pieces

/** A mood on its bar: a groove banded furious to loving, a pin where it stands. */
export function moodBar(n: number, cls = ''): string {
  const bands = GOD_MOODS.map((m, i) => {
    const to = i + 1 < GOD_MOODS.length ? GOD_MOODS[i + 1].from : 100;
    return `<i class="b${i}" style="left:${((m.from + 100) / 2).toFixed(1)}%;width:${((to - m.from) / 2).toFixed(1)}%"></i>`;
  }).join('');
  return `<span class="ol-bar${cls ? ` ${cls}` : ''}" role="img" aria-label="${esc(`${cap(moodWord(n))}, ${signed(n)} of 100 either way`)}">${bands}<b style="left:${((Math.max(-100, Math.min(100, n)) + 100) / 2).toFixed(1)}%"></b></span>`;
}

/** The mood in a word with its number. */
const moodChip = (n: number): string => `<span class="ol-word r${moodRank(n)}">${esc(cap(moodWord(n)))} <em>${signed(n)}</em></span>`;

/** A reason as a line: "+5 your shrine to Demeter". */
const reasonLine = (r: GodReason): string => `<li class="${r.worth > 0 ? 'up' : 'down'}"><b>${signed(r.worth)}</b> ${esc(r.why)}${r.fading ? '<small> · fading</small>' : ''}</li>`;

/** How far from watchful's middle a month's bar reaches full height (warm is 30, angry -60: most moods sit nearer). */
const MONTHS_SCALE = 40;

/** Two years of a god's moods, a bar a month (gold above watchful's middle, red below), and now, with watchful's edges dotted. */
export function moodMonths(s: SimState, god: GodId, w = 240, h = 36): string {
  const list = [...(s.gods.months[god] ?? []), moodOfGod(s, god)];
  const n = MOOD_MONTHS + 1;
  const bw = w / n;
  const mid = h / 2;
  const bars = list
    .slice(-n)
    .map((v, i, all) => {
      const x = (n - all.length + i) * bw;
      const hh = Math.max(1.5, Math.min(1, Math.abs(v) / MONTHS_SCALE) * mid);
      return `<rect x="${(x + bw * 0.15).toFixed(1)}" y="${(v >= 0 ? mid - hh : mid).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${hh.toFixed(1)}" class="${v >= 10 ? 'up' : v < -10 ? 'down' : 'even'}${i === all.length - 1 ? ' now' : ''}" data-tip="${esc(i === all.length - 1 ? `Now: ${moodWord(v)} (${signed(v)})` : `${monthAgo(s, all.length - 1 - i)}: ${moodWord(v)} (${signed(v)})`)}"></rect>`;
    })
    .join('');
  return `<svg class="ol-months" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px" role="img" aria-label="${esc(`${GODS[god].name}’s mood, month by month`)}"><path d="M0 ${mid}H${w}" class="axis"/><path d="M0 ${(mid - (10 / MONTHS_SCALE) * mid).toFixed(1)}H${w}M0 ${(mid + (10 / MONTHS_SCALE) * mid).toFixed(1)}H${w}" class="band"/>${bars}</svg>`;
}

const monthAgo = (s: SimState, k: number): string => {
  // (The record's last month was kept at the start of this one: k = 1.)
  const d = dateOfTick(Math.max(0, (Math.floor(s.tick / TICKS_PER_MONTH) - k + 1) * TICKS_PER_MONTH));
  return `Start of ${MONTH_NAMES[d.month]}`;
};

/** Where a god stands with the festival: announced, under way, last held. */
function festivalWords(s: SimState, god: GodId): string {
  const f = festivalOf(s, god);
  if (f?.walker) return `${GODS[god].name}’s festival is under way: the procession is out.`;
  if (f) return `A festival to ${GODS[god].name} is announced for ${dayWords(f.day)}.`;
  const last = s.gods.lastFestival[god] ?? -1;
  return last >= 0 ? `The last festival to ${GODS[god].name} was on ${dayWords(last)}.` : `No festival to ${GODS[god].name} yet.`;
}

/** The festival's and the offering's buttons for a shrine. */
function worshipButtons(s: SimState, map: CoastMap, b: Building | undefined, god: GodId, named = false): string {
  const G = GODS[god];
  // (On a god's page, which of their shrines the buttons act at.)
  const at = named && b ? `<p class="ol-note ol-at">${esc(`At ${placeWords(map, b, s)}${placesTo(s, god).length > 1 ? ' (the others from their own panels)' : ''}:`)}</p>` : '';
  const none = `Dedicate a shrine to ${G.name} first`;
  const fWhy = b ? festivalRefusal(s, map, b.id) : none;
  const oWhy = b ? offerRefusal(s, map, b.id) : none;
  const data = { id: b?.id ?? 0 };
  return `${at}<div class="ol-acts">${kbtn({ act: 'festival', data, icon: emblemSvg(god, 'ki'), html: 'Hold a festival', tone: 'lapis', small: true, why: fWhy || undefined, tip: `A festival to ${G.name}: ${FESTIVAL_COST} dr and ${goodsWords(G.sacred, festivalGoods(G.sacred))} from the stores, announced a month ahead; then a procession round the agora, and the homes it passes glad for a season. One a year.` })}${kbtn({ act: 'offer', data, icon: 'keep', html: 'Send an offering', small: true, why: oWhy || undefined, tip: `An offering to ${G.name}: ${goodsWords(G.sacred, offeringOf(G.sacred))}, carried from the nearest store to the ${b?.kind === 'sanctuary' ? 'sanctuary' : 'shrine'}. A small honour, when it arrives.` })}</div>${fWhy && b ? `<p class="k-why">${esc(fWhy)}.</p>` : ''}`;
}

/** Merge with slice 54: a god's finished sanctuary's building, if it stands. */
const holyOf = (s: SimState, god: GodId): Building | undefined => {
  const x = sanctuaryDone(s, god) ? sanctuaryOf(s, god) : undefined;
  return x ? findBuilding(s, x.id) : undefined;
};

/** Where a god's festival and offerings can be held: their finished sanctuary first (merge with slice 54), then their shrines. */
const placesTo = (s: SimState, god: GodId): Building[] => {
  const holy = holyOf(s, god);
  return holy ? [holy, ...shrinesTo(s, god)] : shrinesTo(s, god);
};

/** The god's first place (their sanctuary, else a shrine) with nothing in the way of an offering (or the first). */
const shrineFor = (s: SimState, god: GodId): Building | undefined => {
  const all = placesTo(s, god);
  return all.find((b) => !offeringTo(s, b.id)) ?? all[0];
};

/**
 * Merge with slice 54: where a god's sanctuary stands, for their card (`short`)
 * and page (`long`): none, rising (its stage), finished, or dimmed; and its
 * building, for a link.
 */
export function sanctuaryWords(s: SimState, god: GodId): { b?: Building; short: string; long: string } {
  const x = sanctuaryOf(s, god);
  const G = GODS[god];
  if (!x) return { short: 'no sanctuary', long: `No sanctuary to ${G.name} yet: the Sanctuary button on the build bar marks one out.` };
  const b = findBuilding(s, x.id);
  const name = cap(sanctuaryName(god));
  const all = stagesOf(x);
  if (!x.finished) {
    const st = all[Math.min(x.stage, all.length - 1)];
    return { b, short: `sanctuary rising (${Math.min(x.stage + 1, all.length)} of ${all.length})`, long: `${name} is rising: ${st ? `${st.name.toLowerCase()}, ` : ''}stage ${Math.min(x.stage + 1, all.length)} of ${all.length}. Each stage finished honours ${G.name}.` };
  }
  if (dimmed(s, x)) return { b, short: 'sanctuary dimmed', long: `${name} is dimmed: no priests work it, and ${G.name} no longer counts it an honour until they come back.` };
  return { b, short: 'a sanctuary', long: `${name} stands finished: ${signed(STANDING_HONOUR)} to ${G.name} while it is staffed.` };
}

// ---------------------------------------------------------------------------- a shrine's section

/** The shrine whose god is being changed on its panel (0: none), so its choice of the twelve shows. */
let picking = 0;

/** Hooks main.ts sets: open the Olympus panel on a god. */
export const olympusHooks: { open: (god: GodId) => void } = { open: () => undefined };

/** A shrine's own sections (the building-panel registry's `more`). */
export function shrineSections(s: SimState, map: CoastMap, b: Building): string {
  const god = b.god;
  if (!god || picking === b.id) {
    const options = GOD_IDS.map((g) => {
      const m = moodOfGod(s, g);
      return `<button class="ol-pick${god === g ? ' on' : ''}" data-act="dedicate" data-god="${g}" style="--gc:${godColour(g)}" title="${esc(`${GODS[g].name}, ${GODS[g].epithet}, god of ${GODS[g].of}: ${moodWord(m)} (${signed(m)}). Loves ${GODS[g].loves.join(', ')}.`)}">${emblemSvg(g)}<b>${esc(GODS[g].name)}</b><small>${esc(moodWord(m))}</small></button>`;
    }).join('');
    const all = `<button class="ol-pick all${!god ? ' on' : ''}" data-act="dedicate" data-god="" title="To all the gods: it honours none of them, and serves the homes around it as before">${actionIcon('gods')}<b>All the gods</b><small>none in particular</small></button>`;
    const lead = god ? `Dedicated to ${GODS[god].name}. Choose again:` : 'To all the gods: it honours none of them, though its priestess still blesses the homes around it. Dedicate it to one of the twelve, and they will notice.';
    return ksec('Its god', `<p class="ol-lead">${esc(lead)}</p><div class="ol-picks">${options}${all}</div>${god ? kbtn({ act: 'pickdone', html: 'Keep it as it is', small: true, tone: 'stone' }) : ''}`, { icon: 'gods', cls: 'ol-shrine' });
  }
  const G = GODS[god];
  const m = moodOfGod(s, god);
  const rs = reasonsOf(s, god).slice(0, 4);
  const n = shrinesTo(s, god).length;
  const off = offeringTo(s, b.id);
  const head = `<div class="ol-shr" style="--gc:${godColour(god)}"><span class="ol-emb">${emblemSvg(god)}</span><div><p class="ol-who"><b>${esc(G.name)}</b>, ${esc(G.epithet)}, god of ${esc(G.of)}</p>${moodChip(m)}${moodBar(m)}</div></div>`;
  const why = rs.length ? `<ul class="ol-why">${rs.map(reasonLine).join('')}</ul>` : `<p class="ol-note">${esc(`${G.name} has noticed nothing of yours yet${noticed(s) ? '' : ': a town of under 300 is beneath the gods’ notice'}.`)}</p>`;
  const foot = `<p class="ol-note">${esc(`${n === 1 ? 'Your only shrine' : `One of your ${n} shrines`} to ${G.name}. ${festivalWords(s, god)}${off ? ` An offering of ${goodsWords(off.food, off.load)} is on its way here.` : ''}`)}</p>`;
  const more = `<div class="ol-acts">${kbtn({ act: 'pickgod', html: 'Change its god', small: true, tone: 'stone' })}${kbtn({ act: 'olympus', data: { god }, icon: 'gods', html: 'Olympus ›', small: true, tone: 'stone', tip: `${G.name}’s page on the Olympus panel (G)` })}</div>`;
  return ksec(`Dedicated to ${G.name}`, `${head}${why}${foot}${worshipButtons(s, map, b, god)}${more}`, { icon: 'gods', cls: 'ol-shrine' });
}

/** The shrine section's buttons (the registry's `act`): a command to send, 'redraw' for its own state, null for not its own. */
export function shrineAct(act: string, el: HTMLElement, b: Building): Command | 'redraw' | null {
  if (act === 'dedicate') {
    picking = 0;
    return { type: 'dedicate', id: b.id, god: el.dataset.god ?? '' };
  }
  if (act === 'pickgod') {
    picking = b.id;
    return 'redraw';
  }
  if (act === 'pickdone') {
    picking = 0;
    return 'redraw';
  }
  if (act === 'festival') return { type: 'festival', id: b.id };
  if (act === 'offer') return { type: 'offer', id: b.id };
  if (act === 'olympus' && el.dataset.god) {
    olympusHooks.open(el.dataset.god as GodId);
    return 'redraw';
  }
  return null;
}

/** Tip lines the shrine's own section says (left out of "What it is doing"). */
export const SHRINE_QUIET = /^(Dedicated to|To all the gods)/;

// ---------------------------------------------------------------------------- a sanctuary's festival and offering

/**
 * Merge with slice 54: a finished sanctuary's panel gets the festival and the
 * offering in the place slice 54 left for them (SANCTUARY_SLOTS.offerings),
 * acting at the sanctuary: a festival from it walks from its altar.
 */
export function sanctuaryWorship(s: SimState, b: Building, god: GodId): string {
  if (!sanctuaryDone(s, god) || sanctuaryOf(s, god)?.id !== b.id) return '';
  const G = GODS[god];
  const off = offeringTo(s, b.id);
  const more = `<div class="ol-acts">${kbtn({ act: 'olympus', data: { god }, icon: 'gods', html: 'Olympus ›', small: true, tone: 'stone', tip: `${G.name}’s page on the Olympus panel (G)` })}</div>`;
  return ksec('Festival and offering', `<p class="ol-note">${esc(`${festivalWords(s, god)}${off ? ` An offering of ${goodsWords(off.food, off.load)} is on its way here.` : ''} A festival here walks from the altar.`)}</p>${worshipButtons(s, mapOf(s), b, god)}${more}`, { icon: 'gods', cls: 'ol-shrine' });
}
SANCTUARY_SLOTS.offerings = sanctuaryWorship;

/** A sanctuary's festival, offering and Olympus buttons (the registry's `act`), as a shrine's. */
export function sanctuaryAct(act: string, el: HTMLElement, b: Building): Command | 'redraw' | null {
  return act === 'festival' || act === 'offer' || act === 'olympus' ? shrineAct(act, el, b) : null;
}

// ---------------------------------------------------------------------------- the Olympus panel

/** One god's card. */
function card(s: SimState, god: GodId): string {
  const G = GODS[god];
  const m = moodOfGod(s, god);
  const rs = reasonsOf(s, god).slice(0, 2);
  const n = shrinesTo(s, god).length;
  const f = festivalOf(s, god);
  const rival = GODS[G.rival];
  const rm = moodOfGod(s, G.rival);
  const why = rs.length ? rs.map((r) => `<span class="${r.worth > 0 ? 'up' : 'down'}">${signed(r.worth)} ${esc(r.why)}</span>`).join('') : `<span class="none">${esc(`Nothing of yours noticed yet`)}</span>`;
  const shrines = n ? plural(n, 'shrine', 'shrines') : 'no shrine';
  const fest = f ? (f.walker ? ' · festival under way' : ` · festival on ${dayWords(f.day)}`) : '';
  const holy = sanctuaryWords(s, god).short;
  return `<button class="ol-card" data-act="god" data-god="${god}" style="--gc:${godColour(god)}" title="${esc(`${G.name}’s page: every reason, two years of moods, the festival and offerings`)}"><span class="ol-top"><span class="ol-emb">${emblemSvg(god)}</span><span class="ol-nm"><b>${esc(G.name)}</b><small>${esc(G.epithet)}</small></span>${moodChip(m)}</span>${moodBar(m)}<span class="ol-rs">${why}</span><span class="ol-ft"><span>${esc(cap(shrines))} · ${esc(holy)}${esc(fest)}</span><span class="${rm < m ? 'riv' : ''}">Rival: ${esc(rival.name)}, ${esc(moodWord(rm))}</span></span><span class="ol-can"><span class="bl" title="${esc(`In blessing: ${G.blessWords}`)}"><b>Blessing</b> ${esc(G.blessWords)}</span><span class="cu" title="${esc(`In wrath: ${G.curseWords}`)}"><b>Wrath</b> ${esc(G.curseWords)}</span></span></button>`;
}

/** A god's page. */
function godPage(s: SimState, map: CoastMap, god: GodId): string {
  const G = GODS[god];
  const m = moodOfGod(s, god);
  const rs = reasonsOf(s, god);
  const shrines = shrinesTo(s, god);
  const rival = GODS[G.rival];
  const rm = moodOfGod(s, G.rival);
  const her = ['hera', 'demeter', 'athena', 'artemis', 'aphrodite'].includes(god) ? 'her' : 'his';
  const they = her === 'her' ? 'she' : 'he';
  const rivalWords = rm < m ? `${rival.name} is honoured less than ${G.name} now (${moodWord(rm)}, ${signed(rm)}), and minds: honouring ${G.name} costs a third as much with ${rival.name}.` : `${rival.name} is honoured as much or more (${moodWord(rm)}, ${signed(rm)}): honouring ${G.name} costs nothing with ${rival.name} while that lasts.`;
  const left = [
    `<div class="ol-gh" style="--gc:${godColour(god)}"><span class="ol-emb big">${emblemSvg(god)}</span><div><h3>${esc(G.name)}</h3><p class="ol-ep">${esc(cap(G.epithet))}, god of ${esc(G.of)}</p>${moodChip(m)}${moodBar(m, 'wide')}</div></div>`,
    ksec('Loves and hates', `<p class="ol-lh"><b>Loves</b> ${esc(G.loves.join(', '))}.</p><p class="ol-lh"><b>Hates</b> ${esc(G.hates.join(', '))}.</p><p class="ol-note">${esc(`What ${they} sees in your city is counted once a month, each thing with its reason. Deeds in Greece (wars, tribute, promises) come later.`)}</p>`, { icon: 'reach' }),
    ksec('Rival', `<p class="ol-riv" style="--gc:${godColour(G.rival)}">${emblemSvg(G.rival)}<span><b>${esc(rival.name)}</b>, ${esc(rival.epithet)}. ${esc(rivalWords)}</span></p>`, { icon: 'refuse' }),
    ksec('What they can do', `<p class="ol-lh"><b>In blessing</b> ${esc(G.blessWords)}</p><p class="ol-lh"><b>In wrath</b> ${esc(G.curseWords)}</p><p class="ol-note">The gods don’t act on these yet: their blessings and their wrath are still to come.</p>`, { icon: 'gods' }),
  ].join('');
  const why = rs.length ? `<ul class="ol-why">${rs.map(reasonLine).join('')}</ul>` : `<p class="ol-note">${esc(`${G.name} has noticed nothing of yours yet${noticed(s) ? '' : ': a town of under 300 is beneath the gods’ notice'}.`)}</p>`;
  const list = shrines.length ? `<ul class="ol-shrines">${shrines.map((b) => `<li><button class="ol-link" data-act="building" data-id="${b.id}">${esc(cap(shrineWords(map, b, s)))}</button>${offeringTo(s, b.id) ? '<small> · an offering on its way</small>' : ''}</li>`).join('')}</ul>` : `<p class="ol-note">${esc(`No shrine is dedicated to ${G.name}. Click a shrine to choose its god, or build one (V).`)}</p>`;
  // (Merge with slice 54: their sanctuary, as it stands, with a link to it.)
  const sw = sanctuaryWords(s, god);
  const holy = sw.b ? `<p class="ol-holy"><button class="ol-link" data-act="building" data-id="${sw.b.id}">${esc(cap(sanctuaryName(god)))}</button>${offeringTo(s, sw.b.id) ? '<small> · an offering on its way</small>' : ''}</p><p class="ol-note">${esc(sw.long)}</p>` : `<p class="ol-note">${esc(sw.long)}</p>`;
  const right = [
    ksec(`Why ${they} is ${moodWord(m)}`, why, { icon: 'reach', aside: `<b class="ol-sum">${signed(m)}</b>` }),
    ksec('Two years', `${moodMonths(s, god, 420, 64)}<p class="ol-note">${esc(`Month by month, at the start of each, and now: gold for pleased and better, red for displeased and worse; the dotted lines are watchful’s edges.`)}</p>`, { icon: 'overview' }),
    ksec('Worship', `${holy}${list}<p class="ol-note">${esc(festivalWords(s, god))}</p>${worshipButtons(s, map, shrineFor(s, god), god, true)}`, { icon: 'gods' }),
  ].join('');
  return `<div class="ol-page"><div class="ol-back">${kbtn({ act: 'all', icon: 'go', html: '‹ The twelve', small: true, tone: 'stone' })}</div><div class="ol-cols"><div>${left}</div><div>${right}</div></div></div>`;
}

export interface OlympusDeps {
  send: (c: Command) => void;
  /** Fly to a building and open its panel. */
  openBuilding: (id: number) => void;
}

/** How often (seconds) the open panel is brought up to date. */
const REFRESH = 0.5;

export class OlympusPanel {
  private readonly el: HTMLElement;
  private readonly head: HTMLElement;
  private readonly body: HTMLElement;
  private god: GodId | null = null;
  private html = '';
  private headHtml = '';
  private last = -Infinity;
  private s: SimState | null = null;
  private map: CoastMap | null = null;
  /** Called when the panel opens (the panels it would cover make way). */
  onOpen: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    private readonly deps: OlympusDeps,
  ) {
    const el = document.createElement('div');
    el.className = 'olympus kit';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Olympus: the twelve gods');
    el.innerHTML = '<button class="close" data-tip="Close (G or Esc)" aria-label="Close">×</button><header class="ol-head k-head"></header><div class="ol-body"></div>';
    root.appendChild(el);
    this.el = el;
    this.head = el.querySelector('.ol-head') as HTMLElement;
    this.body = el.querySelector('.ol-body') as HTMLElement;
    (el.querySelector('.close') as HTMLElement).addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => this.click(e));
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  /** The god whose page is showing (null: the twelve). */
  get showing(): GodId | null {
    return this.god;
  }

  /** What it says now (for the probe). */
  get text(): string {
    return this.open ? (this.el.innerText || this.el.textContent || '') : '';
  }

  /** Open or close it; open on a god's page (or the twelve, with null) if given. */
  toggle(show = this.el.hidden, god?: GodId | null): void {
    if (god !== undefined) this.show(god);
    const opening = show && this.el.hidden;
    this.el.hidden = !show;
    this.last = -Infinity;
    if (opening) this.onOpen?.();
  }

  show(god: GodId | null): void {
    if (god !== this.god) this.body.scrollTop = 0;
    this.god = god;
    this.last = -Infinity;
  }

  private click(e: Event): void {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t || (t as HTMLButtonElement).disabled) return;
    const act = t.dataset.act;
    if (act === 'god') this.show(t.dataset.god as GodId);
    else if (act === 'all') this.show(null);
    else if (act === 'building') {
      this.deps.openBuilding(Number(t.dataset.id));
      this.toggle(false);
    } else if (act === 'festival') this.deps.send({ type: 'festival', id: Number(t.dataset.id) });
    else if (act === 'offer') this.deps.send({ type: 'offer', id: Number(t.dataset.id) });
    else return;
    this.last = -Infinity;
    if (this.s && this.map) this.update(this.s, this.map, Infinity);
  }

  update(s: SimState, map: CoastMap, time: number): void {
    this.s = s;
    this.map = map;
    if (this.el.hidden || time - this.last < REFRESH) return;
    this.last = Number.isFinite(time) ? time : this.last;
    const pleased = GOD_IDS.filter((g) => moodRank(moodOfGod(s, g)) >= 4).length;
    const cross = GOD_IDS.filter((g) => moodRank(moodOfGod(s, g)) <= 2).length;
    const kicker = `Olympus · ${pleased ? `${plural(pleased, 'god', 'gods')} pleased or better` : 'none pleased yet'}${cross ? ` · ${plural(cross, 'god', 'gods')} displeased or worse` : ''}`;
    const head = `<div class="k-pic">${actionIcon('gods')}</div><div class="k-hd"><div class="k-kicker">${esc(kicker)}</div><h2>${esc(this.god ? `${GODS[this.god].name}` : 'The twelve')}</h2></div>`;
    if (head !== this.headHtml) {
      this.headHtml = head;
      morph(this.head, head);
    }
    const html = kitHtml(this.god ? godPage(s, map, this.god) : `<div class="ol-grid">${GOD_IDS.map((g) => card(s, g)).join('')}</div><p class="ol-foot">${esc(noticed(s) ? 'Each god’s mood is the sum of what they remember: worship (shrines, festivals, offerings), what they love and hate in your city, and neglect. Honouring a god stirs their rival, while the rival is honoured less. Click a god for their page.' : 'Your town is beneath the gods’ notice until it has 300 people: nothing it does yet moves them but worship. Click a god for their page.')}</p>`);
    if (html !== this.html) {
      this.html = html;
      morph(this.body, html);
    }
  }
}

// ---------------------------------------------------------------------------- the overview's Gods page

/** The overview's Gods page: each god's mood now and two years of it, and their shrines. */
export function godsPage(s: SimState, map: CoastMap): string {
  const rows = GOD_IDS.map((god) => {
    const G = GODS[god];
    const m = moodOfGod(s, god);
    const rs = reasonsOf(s, god).slice(0, 2);
    const shrines = shrinesTo(s, god);
    const holy = sanctuaryWords(s, god);
    const links = [holy.b ? `<button class="ov-link" data-act="building" data-id="${holy.b.id}">${esc(cap(holy.short === 'a sanctuary' ? sanctuaryName(god) : holy.short))}</button>` : '', ...shrines.map((b) => `<button class="ov-link" data-act="building" data-id="${b.id}">${esc(cap(shrineWords(map, b, s)))}</button>`)].join('') || '<span class="ov-note">no shrine</span>';
    return `<li class="ol-ovrow" style="--gc:${godColour(god)}"><span class="ol-emb">${emblemSvg(god)}</span><span class="ol-ovnm"><b>${esc(G.name)}</b>${moodChip(m)}<small>${esc(rs.map((r) => `${signed(r.worth)} ${r.why}`).join('; ') || 'nothing noticed yet')}</small></span>${moodMonths(s, god, 300, 44)}<span class="ol-ovsh">${links}</span></li>`;
  }).join('');
  const kept = Math.min(MOOD_MONTHS, s.gods.months.zeus?.length ?? 0);
  const lead = `The twelve’s moods towards your city, and how they have moved${kept ? ` over the last ${kept === 1 ? 'month' : `${kept} months`}` : ' (kept from the first month the gods watch)'}: gold bars for pleased and better, red for displeased and worse. The Olympus panel (G) has every reason.`;
  return `<p class="ov-lead">${esc(lead)}</p><ul class="ol-ov">${rows}</ul>`;
}

/** The Gods tab's word and mark: amber with a god displeased, red with one angry or worse. */
export function godsTab(s: SimState): { word: string; warn: 0 | 1 | 2 } {
  const ranks = GOD_IDS.map((g) => moodRank(moodOfGod(s, g)));
  const low = Math.min(...ranks);
  const pleased = ranks.filter((r) => r >= 4).length;
  const cross = ranks.filter((r) => r <= 2).length;
  return { word: cross ? `${cross} displeased` : pleased ? `${pleased} pleased` : 'watchful', warn: low <= 1 ? 2 : low <= 2 ? 1 : 0 };
}
