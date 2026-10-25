/**
 * Slice 47 on a colony's page: its garrison (a company stationed there, or
 * the companies you could send; your triremes stationed off it), strikes
 * from it, its trade and your share, its militia, the treaty that would set
 * it free as your ally, how it stands against a threat, the buttons that sail
 * or call off a shipment; and the page of a colony you set free by treaty.
 *
 * It only reads the sim; its buttons go out as `colonyempire` commands.
 */
import type { CoastMap } from '../map/bake';
import { PLACES, siteOf, type CityId } from '../map/greece';
import { companyName, kindWord, readyOf } from '../sim/army';
import type { Command } from '../sim/commands';
import { dayWords } from '../sim/favours';
import type { SimState } from '../sim/state';
import { cargoDoing, cargoesFor, defenceWords, ownDefence, loadingFor, cargoActRefusal } from '../sim/colonyworks';
import { SAIL_IN } from '../sim/trade';
import { tributeWords } from '../sim/vassals';
import { guardsAtHome, shipsRefusal, siteRecord, type Colony } from '../sim/colonies';
import {
  companiesAtHome,
  defenceParts,
  freeMood,
  freeTrade,
  garrisonComing,
  garrisonHold,
  garrisonOf,
  homeRefusal,
  militiaOut,
  militiaReady,
  militiaWhy,
  militiaWords,
  MILITIA_TERMS,
  passageOf,
  passageWords,
  shareFrom,
  shipsOf,
  stationedThere,
  stationRefusal,
  STATION_LOYALTY,
  strikeLine,
  strikePlan,
  strikeRefusal,
  strikeTargets,
  colonyTrade,
  tradesWith,
  treatyRefusal,
  wouldHold,
  type FreeAlly,
} from '../sim/colonyempire';
import { moodWord } from '../sim/world';
import { moodFace } from './greece';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const name = (id: CityId): string => PLACES[id]?.name ?? id;
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const inTen = (p: number): string => `about ${Math.max(0, Math.min(10, Math.round(p * 10)))} in 10`;
const listWords = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function button(act: string, label: string, attrs: Record<string, string | number>, why: string, tip: string, cls = ''): string {
  const data = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('');
  return `<button data-colonyempire="${act}"${data}${cls ? ` class="${cls}"` : ''} title="${esc(why || tip)}"${why ? ' disabled' : ''}>${label}</button>`;
}

const fitMen = (s: SimState, id: number): number => s.army.soldiers.filter((x) => x.company === id && x.state === 'away' && x.hp >= 50).length;
const awayMen = (s: SimState, id: number): number => s.army.soldiers.filter((x) => x.company === id && x.state === 'away').length;

/** Its garrison: the company stationed there (or on its way, or out striking), or the companies you could send; your triremes stationed off it. */
export function garrisonHtml(s: SimState, c: Colony, map: CoastMap | undefined): string {
  const g = garrisonOf(s, c);
  let company: string;
  if (g) {
    const who = `${cap(companyName(g))} of ${kindWord(g.kind)}`;
    const p = passageOf(s, g.id);
    const home = button('home', 'Bring it home', { site: c.site }, homeRefusal(s, c), 'Your ship sails out for it, and brings the men back to your quay; they march home to their barracks');
    if (p) company = `<p class="line">${esc(passageWords(s, p))}.</p>`;
    else if (stationedThere(s, c)) {
      const men = awayMen(s, g.id);
      const fit = fitMen(s, g.id);
      company = `<p class="line"><b>${esc(who)}</b> (${men} men${fit < men ? `, ${fit} fit to fight` : ''}) holds it: raiders turn away by themselves ${inTen(garrisonHold(s, c))} times on its account, and it is more loyal (${signed(STATION_LOYALTY.company)}). It can strike from here (below).</p><div class="acts endally">${home}</div>`;
    } else {
      const e = s.world.expeditions.find((x) => x.id === g.away && x.from === c.site);
      company = `<p class="line">${esc(e ? strikeLine(s, e) : `${who} is out`)}: it holds ${esc(c.name)} again once it is back.</p>`;
    }
  } else {
    const at = companiesAtHome(s);
    const pick = at
      .slice(0, 4)
      .map((x) => button('station', `Station ${esc(companyName(x))} of ${esc(kindWord(x.kind))} <small>${readyOf(s, x).length} men · ${inTen(wouldHold(s, x)).replace('about ', '')}</small>`, { site: c.site, company: x.id }, map ? stationRefusal(s, map, c, x.id) : 'Not now', `Its banner marches to your quay; a boat rows the men out to your ship, eight a trip, and she sails for ${c.name}. There it turns raiders away by itself ${inTen(wouldHold(s, x))} times`, 'send'))
      .join('');
    const why = map ? stationRefusal(s, map, c) : 'Not now';
    company = `<p class="line">No company of yours is stationed here.${at.length ? '' : ` ${esc(why)}.`}</p>${pick ? `<div class="acts station">${pick}</div>` : ''}`;
  }
  const n = shipsOf(c).length;
  let ships: string;
  if (n) {
    const back = button('shipshome', 'Bring them home', { site: c.site }, '', 'They row home to your bay');
    ships = `<p class="line">${n === 1 ? 'One of your triremes is' : `${n} of your triremes are`} stationed off its shore for good: they fight every threat that comes (${signed(Math.min(STATION_LOYALTY.ships, n * STATION_LOYALTY.ship))} loyalty).</p><div class="acts endally">${back}</div>`;
  } else {
    const home = guardsAtHome(s).length;
    const why = shipsRefusal(s);
    ships = `<p class="line">None of your triremes is stationed off it.</p><div class="acts">${button('ships', `Station ${home === 1 ? 'your trireme' : home ? `your ${home} triremes` : 'triremes'} off it`, { site: c.site }, why, 'They sail out and stay, fighting every threat that comes, until you bring them home', 'send')}</div>`;
  }
  return `<section class="garrison"><h3>Its garrison</h3>${company}<h4>Your triremes</h4>${ships}<p class="foot">One company to a colony. Its men are away from your city until you bring them home: they don’t drill, march or defend your walls.</p></section>`;
}

/** Strikes from it: the stationed company sails at a city near it, shorter than from home. */
export function strikeHtml(s: SimState, c: Colony): string {
  if (!stationedThere(s, c)) return '';
  const rows = strikeTargets(s, c)
    .map((id) => {
      const p = strikePlan(s, c, id);
      const why = strikeRefusal(s, c, id);
      const threat = c.threat && c.threat.end === '' && c.threat.city === id;
      return `<li${threat ? ' class="bad"' : ''}><div><b>${esc(name(id))}</b>${threat ? ' <span class="why">(its ships threaten it)</span>' : ''}<div class="does">${p.days} days’ sail from here; ${p.fromHome} from your city. Your ${p.ours} against its watch of ${p.theirs}.</div></div>${button('strike', `Raid it <small>${inTen(p.odds)}</small>`, { site: c.site, city: id }, why, `${cap(companyName(stationedThere(s, c)!))} sails from ${c.name} to raid ${name(id)}: ${inTen(p.odds)} to win; it comes back here after`, 'refuse')}</li>`;
    })
    .join('');
  return `<section class="strikes"><h3>Strikes from it</h3><ul class="works strikes">${rows}</ul><p class="foot">A raid with the company stationed here: no mustering, straight from its shore. A city whose ships threaten it calls them home once you strike. As any war without cause, the city hates it.</p></section>`;
}

/** Its trade with Greece, and your share. */
export function tradeHtml(s: SimState, c: Colony): string {
  const t = colonyTrade(s, c);
  const with2 = tradesWith(s, c.site).map(name);
  const rows = t.why.map((w, k) => `<li class="${/halved|keeps/.test(w) ? 'bad' : k === 0 ? '' : 'good'}"><span class="t">${esc(cap(w))}</span></li>`).join('');
  const season = Math.round(t.share / 4);
  return `<section class="coltrade"><h3>Its trade</h3><p class="line">It trades on its own${with2.length ? ` with ${esc(listWords(with2))}` : ''}: about <b>${fmt(t.trade)} dr</b> a year. Your share: <b>${fmt(t.share)} dr</b> a year${season ? `, about ${fmt(season)} each season in coin on its share ship` : ''}.</p><ul class="whys plain">${rows}</ul><p class="foot">A third of its trade is yours, halved under 40 loyalty, none while it talks of freedom. A harbour and a larger stage trade more. On your ledger as the colonies’ trade.</p></section>`;
}

/** Its militia: who would come, and any on their way. */
export function militiaHtml(s: SimState, c: Colony): string {
  const why = militiaWhy(c);
  const ready = militiaReady(s).find((m) => m.site === c.site);
  const out = militiaOut(s)
    .filter((m) => m.site === c.site)
    .map((m) => `<p class="eta sent">${esc(m.exp ? `${m.men} of its men are with your army` : militiaWords(s, m))}.</p>`)
    .join('');
  const line = ready ? `It sends <b>${ready.men} men</b> when you are raided, and to your wars: they sail in to your quay and stand with your soldiers, as an ally’s aid does.` : `${esc(why)}.`;
  return `<section class="militia"><h3>Its militia</h3><p class="line">${line}</p>${out}<p class="foot">From ${MILITIA_TERMS.stage === 2 ? 'a town' : 'a larger stage'} with loyalty ${MILITIA_TERMS.loyalty} or more: a man for every 40 people, 8 to 16.</p></section>`;
}

/** The treaty button, for the talk of freedom. */
export function treatyHtml(s: SimState, c: Colony): string {
  const why = treatyRefusal(s, c);
  const go = button('free', 'Sign a treaty: let it go free as your ally', { site: c.site }, why, `${c.name} stands free under its own ruler, warm to you: it keeps trading with you and sends half the share, and its militia when you need them`, 'send');
  return `<div class="acts treaty">${go}</div><p class="if">A treaty instead: it goes free as your ally, keeps a warm ruler, sends half your share of its trade and its militia. It no longer sends goods, and is yours no more.</p>`;
}

/** How it stands against a threat: every part that turns raiders away, and the whole. */
export function defenceHtml(s: SimState, c: Colony, triOdds: number, triremes: number): string {
  const d = defenceParts(s, c, ownDefence(c), defenceWords(c), triOdds, triremes);
  // (Review of slice 47: a company on its way says so, and what it will add once it lands.)
  const g = garrisonComing(s, c);
  const late = !!g && !!g.lands && !!c.threat && c.threat.end === '' && g.lands > c.threat.due;
  const coming = g ? `<p class="eta ${late ? 'no' : 'sent'}">${esc(cap(companyName(g.c)))} of ${esc(kindWord(g.c.kind))} is on its way${g.lands ? `, landing about ${esc(dayWords(g.lands))}` : ''}: once there it turns them away by itself ${inTen(g.hold)} times${late ? ', but it lands after they come' : ''}.</p>` : '';
  if (!d.parts.length) return `<p class="eta no">As it stands nothing turns them away: no triremes, walls or company there.</p>${coming}`;
  const parts = d.parts.map((x) => `${esc(x.why)}, ${inTen(x.p)}`).join('; ');
  return `<p class="eta ${d.p >= 0.5 ? 'sent' : 'no'}">As it stands, ${inTen(d.p)} that they are turned away: ${parts}.</p>${coming}`;
}

/** A shipment loading for it: sail now with what is aboard, or call it off. */
export function cargoActsHtml(s: SimState, c: Colony): string {
  const x = loadingFor(s, c.site);
  if (!x) return '';
  const sail = button('sail', 'Sail now with what is aboard', { site: c.site }, cargoActRefusal(s, 'sail', c.site), 'She sails at once; what is short lands short');
  const off = button('cancel', 'Call it off', { site: c.site }, cargoActRefusal(s, 'cancel', c.site), 'The goods go back to your stores, a work’s drachmas back to your treasury; your ship turns away');
  return `<div class="acts endally cargoacts">${sail}${off}</div>`;
}

/** A colony you set free by treaty: its ruler, warm to you; its trade and your share; its militia. */
export function freeAllyHtml(s: SimState, f: FreeAlly): string {
  const pop = Math.round(siteRecord(s, f.site)?.pop ?? 0);
  const m = freeMood(f);
  const w = moodWord(m.mood);
  const reasons = m.why.map((x) => `<li class="good"><span class="v">${signed(x.n)}</span><span class="t">${esc(cap(x.why))}</span></li>`).join('');
  const t = freeTrade(s, f);
  const ready = militiaReady(s).find((x) => x.site === f.site);
  const way = s.empire.tribute.filter((x) => x.colony === f.site && x.phase !== 'done');
  const coming = way.map((x) => `<p class="eta sent">${esc(cap(tributeWords(x)))}: on its way to you.</p>`).join('');
  const sent = f.sent ? `${f.sent === 1 ? 'One ship has' : `${f.sent} ships have`} come in, ${fmt(f.worth)} dr in all.` : 'None has come in yet.';
  const out = militiaOut(s)
    .filter((x) => x.site === f.site)
    .map((x) => `<p class="eta sent">${esc(x.exp ? `${x.men} of its men are with your army` : militiaWords(s, x))}.</p>`)
    .join('');
  return `<section class="freeally"><p class="line bound">Your ally since ${esc(dayWords(f.since))}, free by treaty: ${fmt(pop)} people under ${esc(f.ruler)}.</p>
<div class="moodline">${moodFace(w, 30)}<div><div class="word">${cap(w)} <span class="num">${signed(m.mood)}</span></div><p class="terms">${esc(f.ruler)} keeps the treaty.</p></div></div>
<h3>How ${esc(f.ruler)} feels about you</h3><ul class="whys">${reasons}</ul></section>
<section class="coltrade"><h3>Its trade</h3><p class="line">It trades about <b>${fmt(t.trade)} dr</b> a year, and sends you <b>${fmt(t.share)} dr</b> of it, a quarter each season by ship. ${esc(sent)} The next sets out about ${esc(dayWords(f.next))}.</p>${coming}</section>
<section class="militia"><h3>Its militia</h3><p class="line">${ready ? `It sends <b>${ready.men} men</b> when you are raided, and to your wars.` : 'It has none to send.'}</p>${out}</section>
<p class="foot">It answers to nobody but itself: you set no share, and it asks nothing of you.</p>`;
}

/** The header's sub-line for a free ally. */
export const freeAllySub = (s: SimState, f: FreeAlly): string => `Your ally on ${siteOf(f.site)?.name ?? f.site}, free by treaty, about ${fmt(Math.round((siteRecord(s, f.site)?.pop ?? 0) / 10) * 10)} people`;

/** (For the map's hover card: a free ally's line.) */
export const freeAllyLine = (s: SimState, f: FreeAlly): string => `${f.name}, your free ally: ${fmt(Math.round(siteRecord(s, f.site)?.pop ?? 0))} people under ${f.ruler}`;

/** A click on a slice 47 button: send its command. True if it was one. */
export function colonyEmpireEvent(e: Event, send: (c: Command) => void): boolean {
  const b = (e.target as HTMLElement).closest('button[data-colonyempire]') as HTMLButtonElement | null;
  if (!b || b.disabled || e.type !== 'click') return false;
  const act = b.dataset.colonyempire as Extract<Command, { type: 'colonyempire' }>['act'];
  const site = b.dataset.site ?? '';
  const company = b.dataset.company ? Number(b.dataset.company) : undefined;
  const city = b.dataset.city;
  send({ type: 'colonyempire', act, site, ...(company !== undefined ? { company } : {}), ...(city ? { city } : {}) });
  return true;
}

/** (For the map of Greece's hover card) a ship of your colonies' line ('cargo-', 'passage-', 'militia-') or a strike from a colony ('colexp-'); '' if the key is not one. */
export function colonyTravellerHtml(s: SimState, key: string): string {
  const [kind, raw] = key.split('-');
  const id = Number(raw);
  if (kind === 'cargo') {
    const x = cargoesFor(s).find((y) => y.id === id);
    return x ? `<b>${esc(`Your ship · goods for ${shareFrom(s, x.site)}`)}</b><span>${esc(cargoDoing(s, x))}</span><span class="sub">Click for its page</span>` : '<b>Your ship</b>';
  }
  if (kind === 'passage') {
    const p = (s.empire.passages ?? []).find((y) => y.id === id);
    return p ? `<b>${esc(`Your ship · soldiers for ${shareFrom(s, p.site)}`)}</b><span>${esc(passageWords(s, p))}</span><span class="sub">Click for its page</span>` : '<b>Your ship</b>';
  }
  if (kind === 'militia') {
    const m = (s.empire.militia ?? []).find((y) => y.id === id);
    if (!m) return '<b>A militia’s ship</b>';
    const e = m.exp ? s.world.expeditions.find((y) => y.id === m.exp) : undefined;
    const line = e ? `${m.men} men sailing to fight beside your army at ${name(e.city)}` : m.phase === 'sea' ? `${m.men} men sailing to your aid: in your bay about ${dayWords(m.start + m.dur + SAIL_IN)}` : militiaWords(s, m);
    return `<b>${esc(`The militia of ${m.name} · ${m.men} men`)}</b><span>${esc(line)}</span><span class="sub">Click for its page</span>`;
  }
  if (kind === 'colexp') {
    const e = s.world.expeditions.find((y) => y.id === id);
    return e ? `<b>${esc(`Your raiding party from ${shareFrom(s, e.from ?? '')}`)}</b><span>${esc(strikeLine(s, e))}</span><span class="sub">Click for ${esc(name(e.city))}’s page</span>` : '<b>Your raiding party</b>';
  }
  return '';
}

/** (For the map of Greece) the page a click on one of those opens; null if the key is not one. */
export function colonyTravellerPage(s: SimState, key: string): string | null {
  const [kind, raw] = key.split('-');
  const id = Number(raw);
  if (kind === 'cargo') return `site:${cargoesFor(s).find((y) => y.id === id)?.site ?? ''}`;
  if (kind === 'passage') return `site:${(s.empire.passages ?? []).find((y) => y.id === id)?.site ?? ''}`;
  if (kind === 'militia') return `site:${(s.empire.militia ?? []).find((y) => y.id === id)?.site ?? ''}`;
  if (kind === 'colexp') return s.world.expeditions.find((y) => y.id === id)?.city ?? null;
  return null;
}
