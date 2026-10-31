/**
 * Slice 58: the gods of Greece on the map of Greece.
 *
 * - **A patron's mark** beside each ruled city's name on its label: the
 *   god's emblem, small, in their colour, its tip "Athena watches over
 *   Athens".
 * - **A city's patron** on its page, under the ruler: "Athena watches over
 *   Athens", her mood towards you with its bar and the reasons, and what a
 *   pious ruler makes of it.
 * - **Olympus**: the mountain's label, its hover card and its page, the
 *   twelve as kit cards (emblem, the city each watches over, mood word and
 *   bar, the weightiest reasons). Slice 53's Olympus panel was not on this
 *   line when this was written: these cards are this line's own, for the
 *   integrator to unify with that panel's.
 *
 * It only reads the state (moods through the groundwork's API).
 */
import { PLACES, type CityId } from '../map/greece';
import type { Festival } from '../sim/festivals';
import { moodWith, pietyOf } from '../sim/greecegods';
import { GOD_IDS, GODS, goddess, moodOfGod, moodRank, moodWord, PATRONS, patronOf, reasonsOf, type GodId, type GodReason } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { cityOf } from '../sim/world';
import { godColourCss, godEmblem } from './godemblems';
import { esc, kbar, kcard } from './kit';
import './greecegods.css';

const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const cityName = (id: CityId): string => PLACES[id].name;
/** "Athens’", "Corinth’s". */
const possessive = (n: string): string => (n.endsWith('s') ? `${n}’` : `${n}’s`);

/** The cities a god watches over ("Athens"; "" for none). */
export function citiesOf(g: GodId): CityId[] {
  return (Object.keys(PATRONS) as CityId[]).filter((c) => PATRONS[c] === g);
}

/** "Athena watches over Athens". */
export const watchesWords = (g: GodId, city: CityId): string => `${GODS[g].name} watches over ${cityName(city)}`;

/** The patron's mark on a city's label ('' for a city with none). */
export function patronMark(id: CityId): string {
  const g = patronOf(id);
  if (!g) return '';
  return `<span class="patron" style="--god:${godColourCss(g)}" title="${esc(watchesWords(g, id))}">${godEmblem(g, 'gem')}</span>`;
}

/** The line under a ruled city's name on its page: its patron's emblem and "Athena watches over Athens" ('' with none). */
export function patronKicker(id: CityId): string {
  const g = patronOf(id);
  if (!g) return '';
  return `<div class="gg-watch" style="--god:${godColourCss(g)}">${godEmblem(g, 'gem')}<span>${esc(watchesWords(g, id))}</span></div>`;
}

/** A mood's bar, -100 to 100, a mark at 0. */
const moodBar = (n: number, tip = 'From furious to loving'): string => kbar({ value: n + 100, max: 200, tone: n >= 10 ? 'good' : n <= -10 ? 'danger' : 'stone', tick: 0.5, tip, cls: 'gg-bar' });

/** One reason, as the cards list them. */
const reasonLi = (r: GodReason): string => `<li class="${r.worth > 0 ? 'up' : 'down'}"><b>${signed(r.worth)}</b> ${esc(cap(r.why))}${r.fading ? '<small> · fading</small>' : ''}</li>`;

/** A mood said in a word and its number: "Angry (−33)". */
const moodChip = (n: number): string => `<span class="gg-word r${moodRank(n)}">${esc(cap(moodWord(n)))} <em>${signed(n)}</em></span>`;

/** "with you", "of you" or "towards you" for a mood. */
const towards = (n: number): string => `${moodWith(moodWord(n))} you`;

/**
 * A ruled city's patron on its page (the Ruler tab): the god, their mood
 * towards you and the weightiest reasons (those from Greece first), and what
 * a pious ruler makes of it ('' for a city with no patron).
 */
export function patronSection(s: SimState, id: CityId): string {
  const g = patronOf(id);
  if (!g) return '';
  const G = GODS[g];
  const c = cityOf(s.world, id);
  const n = moodOfGod(s, g);
  const all = reasonsOf(s, g);
  const greek = all.filter((r) => r.kind === 'greece');
  const shown = [...greek, ...all.filter((r) => r.kind !== 'greece')].slice(0, 3);
  const pious = c.ruler?.traits.includes('pious');
  const p = pietyOf(s, c);
  const piety = !s.gods.on
    ? ''
    : pious
      ? `<p class="gg-pious">${esc(`${cap(c.ruler?.name ?? 'The ruler')} is pious, and minds what ${G.name} thinks of you: ${p ? `${signed(p)} to ${c.ruler?.female ? 'her' : 'his'} mood, while ${G.name} is ${moodWord(n)}` : `nothing either way while ${goddess(g) ? 'she' : 'he'} is ${moodWord(n)}`}.`)}</p>`
      : '';
  return `<section class="gg-patron" style="--god:${godColourCss(g)}"><h3>${esc(`${possessive(cityName(id))} god`)}</h3><div class="gg-row"><span class="gg-em">${godEmblem(g)}</span><div><p class="gg-who"><b>${esc(watchesWords(g, id))}</b>, ${esc(G.epithet)}, ${goddess(g) ? 'goddess' : 'god'} of ${esc(G.of)}.</p><p class="gg-mood">${moodChip(n)} ${esc(towards(n))}${moodBar(n)}</p></div></div>${shown.length ? `<ul class="gg-whys">${shown.map(reasonLi).join('')}</ul>` : `<p class="gg-none">${esc(`${G.name} has no reason to think either way of you yet.`)}</p>`}${piety}<p class="gg-foot">${esc(`Making war on ${cityName(id)} angers ${goddess(g) ? 'her' : 'him'}, plunder more; ${moodRank(n) <= 1 ? `while ${goddess(g) ? 'she' : 'he'} is ${moodWord(n)} ${goddess(g) ? 'she' : 'he'} stands with ${possessive(cityName(id))} men against yours` : `angry, ${goddess(g) ? 'she' : 'he'} would stand with ${possessive(cityName(id))} men against yours`}.`)}</p></section>`;
}

/** A festival's god, for its chip: their emblem. */
export const feastMark = (f: Festival): string => `<span class="gg-feast" style="--god:${godColourCss(f.god)}" title="${esc(`Held for ${GODS[f.god].name}`)}">${godEmblem(f.god, 'gem')}</span>`;

// ---------------------------------------------------------------------------
// Olympus.

/** How many of the twelve love you, and how many are angry or furious. */
export function olympusCounts(s: SimState): { loving: number; warm: number; angry: number } {
  let loving = 0;
  let warm = 0;
  let angry = 0;
  for (const g of GOD_IDS) {
    const r = moodRank(moodOfGod(s, g));
    if (r >= 6) loving++;
    else if (r >= 5) warm++;
    if (r <= 1) angry++;
  }
  return { loving, warm, angry };
}

/** The mountain's label on the map. */
export function olympusLabelHtml(s: SimState): string {
  const n = olympusCounts(s);
  const bits = [n.loving ? `<span class="gg-n up" title="${n.loving === 1 ? 'A god loves your city' : `${n.loving} gods love your city`}">♥ ${n.loving}</span>` : '', n.angry ? `<span class="gg-n down" title="${n.angry === 1 ? 'A god is angry with you' : `${n.angry} gods are angry with you`}">⚡ ${n.angry}</span>` : ''].join('');
  return `<svg class="gg-peak" viewBox="0 0 20 14" aria-hidden="true"><path d="M1 13 7.4 3.6l2.4 3 2.2-2.8L19 13z" fill="#cfc6b6" stroke="#5a4630" stroke-width="1"/><path d="M5.6 6.2 7.4 3.6l2.4 3 2.2-2.8 2.2 2.8-1.6.6-.8-.9-1.6 1.2-1.8-1.6-1.4 1.2z" fill="#fbf7ee"/></svg><b>Olympus</b>${bits}`;
}

/** The hover card over Olympus. */
export function olympusCardHtml(s: SimState): string {
  const ranked = GOD_IDS.map((g) => ({ g, n: moodOfGod(s, g) })).sort((a, b) => b.n - a.n);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const line = (x: { g: GodId; n: number }): string => `${GODS[x.g].name} is ${moodWord(x.n)} ${towards(x.n)} (${signed(x.n)})`;
  const lines = !s.gods.on ? ['The gods are not watching'] : best.n === worst.n ? ['All twelve are watchful: nothing either way yet'] : [line(best), best.g !== worst.g ? line(worst) : ''].filter(Boolean);
  return `<b>Mount Olympus</b><span>The home of the twelve gods</span>${lines.map((l) => `<span>${esc(l)}</span>`).join('')}<span class="sub">Click to see each god’s mood towards your city, and why</span>`;
}

/** A ruled city's patron and their mood towards you, for its hover card ('' with none). */
export function patronHoverLine(s: SimState, id: CityId): string {
  const g = patronOf(id);
  if (!g) return '';
  const n = moodOfGod(s, g);
  return `<span class="gg-hl">${godEmblem(g, 'gem')} ${esc(`${watchesWords(g, id)}${s.gods.on ? ` · ${moodWord(n)} ${towards(n)}` : ''}`)}</span>`;
}

/** One god's card on the Olympus page. */
function olympusCard(s: SimState, g: GodId): string {
  const G = GODS[g];
  const n = moodOfGod(s, g);
  const reasons = reasonsOf(s, g).slice(0, 3);
  const cities = citiesOf(g);
  const watch = cities.length ? `Watches over ${cities.map(cityName).join(' and ')}` : g === 'aphrodite' ? 'Rose from the sea off Kythera' : 'Patron of no city of Greece here';
  const inner = `<div class="gg-ch"><span class="gg-em">${godEmblem(g)}</span><div class="gg-name"><b>${esc(G.name)}</b><small>${esc(cap(G.of))}</small><small class="gg-w">${esc(watch)}</small></div><div class="gg-mood">${moodChip(n)}${moodBar(n)}</div></div>${reasons.length ? `<ul class="gg-whys">${reasons.map(reasonLi).join('')}</ul>` : ''}`;
  return kcard(inner, `gg-card${reasons.length ? '' : ' quiet'}`, ` style="--god:${godColourCss(g)}"`);
}

/** The Olympus page: the twelve's moods towards you as cards. */
export function olympusPageHtml(s: SimState): string {
  const n = olympusCounts(s);
  const sum = !s.gods.on ? 'The gods are not watching this city.' : [n.loving ? `${n.loving === 1 ? 'one god loves' : `${n.loving} gods love`} your city` : '', n.warm ? `${n.warm === 1 ? 'one is' : `${n.warm} are`} warm` : '', n.angry ? `${n.angry === 1 ? 'one is' : `${n.angry} are`} angry with you` : ''].filter(Boolean).join(', ') || 'none of the twelve loves you or is angry with you yet';
  const noticed = s.gods.on && s.gods.noticedAt < 0 ? ' Your city is still beneath their notice: they take no great interest until it has 300 people.' : '';
  return `<header class="gg-olympus"><div class="kicker">Mount Olympus · the home of the twelve</div><h2>The gods of Olympus</h2><div class="from">${esc(cap(sum))}.${esc(noticed)}</div></header>
<p class="gg-intro">Each god remembers what you do, in your city and in Greece: their shrines and sanctuaries, festivals and offerings, what they love and hate in your streets, and your deeds abroad. A god who loves you blesses your expeditions; a city’s patron who is angry with you stands with its men; Poseidon’s mood tips the fights at sea.</p>
<div class="gg-cards">${GOD_IDS.map((g) => olympusCard(s, g)).join('')}</div>`;
}
