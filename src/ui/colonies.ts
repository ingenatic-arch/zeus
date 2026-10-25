/**
 * A site's page on the map of Greece (slice 37): an empty site with the
 * price of a colony there and who would go; your settlers on their way; your
 * colony (its people and why they grow, its governor, its share and its
 * ships, its loyalty with every reason, talk of freedom, a threat and its
 * answers, its guards, the homes its settlers left); a rival's colony; a
 * colony that stands free.
 *
 * It only reads the sim; its buttons go out as `colony` commands (and a
 * strike at a threatening city as an `expedition`).
 */
import type { CoastMap } from '../map/bake';
import { PLACES, siteOf, type CityId } from '../map/greece';
import { dateOfTick, formatYear, TICKS_PER_DAY } from '../sim/clock';
import type { Command } from '../sim/commands';
import { dayWords } from '../sim/favours';
import { expeditionPlan, expeditionRefusal } from '../sim/expeditions';
import { adjective } from '../sim/growth';
import { lateWords } from '../sim/seasons';
import type { SimState } from '../sim/state';
import { SAIL_IN, SHIP_ANCHORED } from '../sim/trade';
import { tributeWords } from '../sim/vassals';
import { blockaded } from '../sim/lanes';
import { NAME_MAX } from '../sim/world';
// (Integrating slice 37 with the trunk: the trade goods' colours are the trade panel's own, horses and all, in TRADE_GOODS' order.)
import { SWATCH } from './prices';
import {
  COLONY_ARMING,
  COLONY_STAND_DOWN,
  colonyGrowth,
  colonyLoyalty,
  colonyOf,
  colonyRefusal,
  colonyYear,
  fightOdds,
  foundingOf,
  foundingPlan,
  FREE_FROM,
  goodName,
  colonyGuards,
  guardsAtHome,
  heldWords,
  laneTicks,
  landsAbout,
  lowReasons,
  peopleOf,
  SHARE_WORDS,
  shareYear,
  siteGood,
  siteRecord,
  type Colony,
  type Founding,
  type Household,
} from '../sim/colonies';
// Slice 43.
import { COLONY_SHARE } from '../sim/colonies';
import { cargoWords, secondYear, STAGE_NAMES, stageOf } from '../sim/colonyworks';
import { cargoHtml, governorHtml, pictureHtml, wantHtml, worksEvent, worksHtml } from './colonygrowth';
// Slice 47: a colonial empire.
import { colonyEmpireEvent, defenceHtml, freeAllyHtml, freeAllyLine, freeAllySub, garrisonHtml, militiaHtml, strikeHtml, tradeHtml, treatyHtml } from './colonyempire';
import { freedOf, stationedWords } from '../sim/colonyempire';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const name = (id: CityId): string => PLACES[id]?.name ?? id;
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const inTen = (p: number): string => `about ${Math.max(1, Math.min(9, Math.round(p * 10)))} in 10`;
/** What each share does to loyalty (colonies.ts' SHARE_LOYALTY, in words for the buttons). */
const SHARE_LOYALTY = ['+15', '0', '−20'];
/** A colony of this size, for a free site's page: what one would send once it has grown a few years. */
const GROWN = 400;

function button(act: string, label: string, attrs: Record<string, string | number>, why: string, tip: string, cls = ''): string {
  const data = Object.entries(attrs)
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('');
  return `<button data-colony="${act}"${data}${cls ? ` class="${cls}"` : ''} title="${esc(why || tip)}"${why ? ' disabled' : ''}>${label}</button>`;
}

const swatch = (k: number): string => (k >= 0 && SWATCH[k] ? `<i class="sw" style="background:${SWATCH[k]}"></i>` : '');

/** The page's heading: the site's name and good, what it is, and (your colony) its name to rename. */
function header(s: SimState, site: string, title: string, sub: string, map: CoastMap | undefined, renaming: boolean, draft: string, rename: boolean): string {
  const p = siteOf(site);
  const kicker = `${p?.name ?? site} · ${p?.good ?? ''} · ${p?.blurb ?? ''}`;
  let h = `<h2>${esc(title)}${rename ? ' <button class="renamebtn" title="Rename your colony" aria-label="Rename your colony">✎</button>' : ''}</h2>`;
  if (rename && renaming) {
    const why = colonyRefusal(s, map as CoastMap, 'name', site, undefined, draft);
    const same = why === 'That is its name already';
    h = `<form class="rename"><input name="colonyname" maxlength="${NAME_MAX}" value="${esc(draft)}" aria-label="Your colony’s name" autocomplete="off" spellcheck="false"><button type="submit" class="ok"${why ? ' disabled' : ''}>Name it</button><button type="button" class="cancel">Cancel</button></form>${why && draft.trim() && !same ? `<div class="why">${esc(why)}</div>` : ''}`;
  }
  return `<header class="site"><div class="kicker">${esc(kicker)}</div>${h}<div class="from">${esc(sub)}</div></header>`;
}

/** A site's page. */
export function sitePageHtml(s: SimState, site: string, map: CoastMap | undefined, renaming: boolean, draft: string): string {
  const p = siteOf(site);
  const x = siteRecord(s, site);
  if (!p || !x) return '<header><h2>An empty site</h2></header>';
  const c = colonyOf(s, site);
  if (c) return colonyHtml(s, c, map, renaming, draft);
  const f = foundingOf(s, site);
  if (f) return `${header(s, site, p.name, `Your settlers are on their way to found a colony here`, map, false, '', false)}${foundingHtml(s, f)}`;
  if (x.owner) {
    const owner = x.owner as CityId;
    return `${header(s, site, p.name, `${cap(adjective(owner))} colony since ${formatYear(dateOfTick(x.since).yearBC)}, about ${fmt(Math.round(x.pop / 10) * 10)} people`, map, false, '', false)}<section><p class="line">It makes ${esc(p.good)} for ${esc(name(owner))}, and grows ${esc(name(owner))} a little each year. Nobody else founds here while it stands.</p><div class="acts open"><button data-cityopen="${owner}">${esc(whose(owner))} page</button></div></section>`;
  }
  // Slice 47: a colony you set free by treaty is your ally.
  const fa = freedOf(s, site);
  if (fa) return `${header(s, site, fa.name, freeAllySub(s, fa), map, false, '', false)}${freeAllyHtml(s, fa)}`;
  if (x.free) return `${header(s, site, x.free, `A city in its own right on ${p.name}, about ${fmt(Math.round(x.pop / 10) * 10)} people`, map, false, '', false)}<section><p class="line">It was your colony until it declared itself free, ${esc(dayWords(x.since))}. It answers to nobody now and sends you nothing; nobody founds on ${esc(p.name)} again.</p></section>`;
  if (x.bound) {
    const b = x.bound as CityId;
    return `${header(s, site, p.name, `Settlers from ${name(b)} are on their way`, map, false, '', false)}<section><p class="line">${esc(whose(b))} settlers land within ${Math.max(1, Math.ceil((x.lands - s.tick) / TICKS_PER_DAY))} days, and ${esc(p.name)} will be ${esc(whose(b))} colony.</p><div class="acts open"><button data-cityopen="${b}">${esc(whose(b))} page</button></div></section>`;
  }
  return `${header(s, site, p.name, 'No city yet: a place to found one', map, false, '', false)}${foundHtml(s, site, map)}`;
}

/** An empty site: what a colony here would be, the price, who would go, and the button (or why not). */
function foundHtml(s: SimState, site: string, map: CoastMap | undefined): string {
  const p = siteOf(site);
  if (!p || !map) return '';
  const plan = foundingPlan(s, map, site);
  const k = siteGood(site);
  const y = shareYear(site, GROWN, 1);
  const voyage = Math.round(plan.voyage / TICKS_PER_DAY);
  const who = plan.households.length
    ? `<ul class="means">${plan.households.map((h) => `<li><b>${esc(cap(h.name))}</b>, ${h.people} people</li>`).join('')}</ul>`
    : '<p class="if">Nobody could go now.</p>';
  const go = button('found', `Found a colony here <small>${fmt(plan.cost)} dr</small>`, { site }, plan.refusal, `${fmt(plan.cost)} dr and ${fmt(plan.wheat)} wheat; four households go`, 'send');
  const why = plan.refusal ? `<p class="eta no">${esc(plan.refusal)}.</p>` : `<p class="eta">Ready: they start packing the day you send them.</p>`;
  return `<section class="deals found"><h3>A colony of your own</h3><div class="deal way"><div>
<p>Four households from your town sail from your quay to ${esc(p.name)} to found <b>Nea ${esc(p.name)}</b>. ${swatch(k)}It makes ${esc(goodName(k))}, and sends you the share you choose each season by ship: a colony of ${GROWN} sends about ${fmt(y.amount)} ${esc(goodName(k))} a year at a fair share (${fmt(y.dr)} dr).</p>
<p class="line"><b>The price</b>: ${fmt(plan.cost)} dr to fit them out, ${fmt(plan.wheat)} wheat from your granaries for their first winter, and the households themselves: their homes stand empty for newcomers. About ${voyage} days’ sail from the gulf once they are aboard.</p>
<h4>Who would go</h4>${who}
${why}<div class="acts">${go}</div>
<p class="if">Huts, cottages and townhouses whose men are at home, the nearest the trading post first. They walk down to the quay as your ship sails in for them; she waits for them two months at most. One founding at a time.</p></div></div></section>`;
}

const HOUSE_STATE: Record<Household['state'], string> = { packing: 'packing at home', walking: 'walking down to the quay', quay: 'on the quay', aboard: 'aboard', stayed: 'stayed behind' };

/** Your settlers on their way: the households, your ship, the voyage. */
function foundingHtml(s: SimState, f: Founding): string {
  const rows = f.households.map((h) => `<li class="${h.state === 'aboard' ? 'good' : h.state === 'stayed' ? 'bad' : ''}"><b>${esc(cap(h.name))}</b>, ${h.people} people: ${esc(HOUSE_STATE[h.state])}</li>`).join('');
  let line = '';
  if (f.phase === 'gathering') {
    const anchored = !f.ship || f.ship.phase === SHIP_ANCHORED;
    const held = heldWords(s, f);
    line = held ? `${esc(held)}.` : anchored ? `Your ship rides at anchor off the jetty, and the families are rowed out to her as they come down. She sails once all are aboard, or ${esc(dayWords(f.until))} at the latest.` : `Your ship sails in for them about ${esc(dayWords((f.ship?.since ?? s.tick) + SAIL_IN))}.`;
  } else if (f.phase === 'leaving') line = `All aboard (${fmt(f.people)} people): your ship is sailing out of the bay. They land about ${esc(dayWords(landsAbout(s, f)))}.`;
  else if (f.phase === 'sea') line = `At sea with ${fmt(f.people)} people: they land about ${esc(dayWords(f.start + f.dur))}${esc(lateWords(s, `colony-${f.site}`))}.`;
  return `<section class="founding"><h3>Your settlers</h3><p class="line bound">${line}</p><ul class="means">${rows}</ul><p class="if">Sent ${esc(dayWords(f.at))}: ${fmt(f.cost)} dr and ${fmt(f.wheat)} wheat.</p></section>`;
}

/** Your colony's page. */
function colonyHtml(s: SimState, c: Colony, map: CoastMap | undefined, renaming: boolean, draft: string): string {
  const p = siteOf(c.site);
  const pop = peopleOf(s, c);
  const sub = `Your colony on ${p?.name ?? c.site} since ${dayWords(c.since)} · ${fmt(pop)} people`;
  // (Slice 43: its picture and stage first, what it asks, the goods going out, its governor or the candidates; its works after its people.)
  return `${header(s, c.site, c.name, sub, map, renaming, draft, true)}${pictureHtml(s, c)}${freedomHtml(s, c)}${threatHtml(s, c, map)}${wantHtml(s, c, map)}${cargoHtml(s, c)}${governorHtml(s, c)}${loyaltyHtml(s, c)}${shareHtml(s, c)}${tradeHtml(s, c)}${garrisonHtml(s, c, map)}${strikeHtml(s, c)}${militiaHtml(s, c)}${peopleHtml(s, c)}${worksHtml(s, c, map)}${guardsHtml(s, c, map)}${homesHtml(c)}`;
}

/** Talk of freedom: the warning and what mends it. */
function freedomHtml(s: SimState, c: Colony): string {
  if (!c.talk) return '';
  const l = colonyLoyalty(s, c);
  const lighter = c.share > 0 ? button('share', `Lighten its share to ${SHARE_WORDS[c.share - 1]} <em class="up">+${c.share === 2 ? 20 : 15}</em>`, { site: c.site, share: c.share - 1 }, '', 'Its loyalty mends over the next months', 'send') : '';
  return `<section class="deals arming"><h3>${esc(c.name)} talks of freedom</h3><div class="deal tribute"><div><p><b>Loyalty ${c.loyalty}</b>: ${esc(lowReasons(l, 3))}. It declares itself free about <b>${esc(dayWords(c.frees))}</b> unless its loyalty is back to ${COLONY_STAND_DOWN} by then.</p><div class="acts">${lighter}</div><p class="if">Your triremes count for it too (each +3), and a light share most of all. Free, it sends you nothing and is yours no more.</p>${treatyHtml(s, c)}</div></div></section>`;
}

/** A threat to it: whose ships, when, and the three answers. */
function threatHtml(s: SimState, c: Colony, map: CoastMap | undefined): string {
  const t = c.threat;
  if (!t) return '';
  if (t.end !== '') return `<div class="giftnews${t.end === 'driven' || t.end === 'off' ? ' theirs' : ''}">${esc(cap(t.line))}${t.end === 'off' ? '' : ` (${esc(dayWords(t.due))})`}.</div>`;
  const pop = peopleOf(s, c);
  const what = t.kind === 'claim' ? `to claim it for ${name(t.city)}: ${t.men} men against its ${Math.round(pop / 8)}` : `to raid it: ${t.men} men`;
  const home = map ? guardsAtHome(s).length : 0;
  // (Integrating slice 37 with the trunk: a crippled trireme, slice 38's, does not guard.)
  const there = colonyGuards(s, c);
  const reach = s.tick + laneTicks(c.site) + 4 * TICKS_PER_DAY;
  const late = reach > t.due ? ` They would come too late: off its shore about ${dayWords(reach)}.` : '';
  // (Review of slice 37: ships that would come too late don't count in the odds.)
  const odds = fightOdds(there + (late ? 0 : home), t.ships);
  const guardWhy = map ? colonyRefusal(s, map, 'guard', c.site) : 'Not now';
  const guard = button('guard', guardWhy || !home ? 'Send triremes to guard it' : `Send ${home === 1 ? 'your trireme' : `your ${home} triremes`} to guard it <small>${late ? 'too late to fight' : inTen(odds)}</small>`, { site: c.site }, guardWhy, late ? `${late.trim()} They would guard it after, and count for its loyalty.` : `With ${there + home} against their ${t.ships} ships: ${inTen(odds)} to drive them off.`, 'send');
  const plan = expeditionPlan(s, t.city, 'force');
  const strikeWhy = expeditionRefusal(s, t.city, 'force');
  const strike = button('strike', `Strike at ${esc(name(t.city))}${strikeWhy ? '' : ` <small>${inTen(plan.odds)}</small>`}`, { city: t.city, site: c.site }, strikeWhy, `A full force marches on ${name(t.city)}: its ships are called home as soon as your army sets out`, 'refuse');
  const fall = t.kind === 'claim' ? `${name(t.city)} takes it: it is yours no more` : `the raiders take 15 in every hundred of its people and its next shipment, and it remembers you did nothing (${signed(-25)})`;
  const guarding = there ? `<p class="eta sent">Your ${there === 1 ? 'trireme is' : `${there} triremes are`} on the way or on station: ${inTen(fightOdds(there, t.ships))} as they stand.</p>` : '';
  // Slice 47: every part of its defence on the one roll (triremes, walls, a soldier governor, a company stationed there).
  const stands = defenceHtml(s, c, fightOdds(there, t.ships), there);
  return `<section class="deals"><h3>${esc(whose(t.city))} ships</h3><div class="deal threat"><div><p><b>${t.ships} ships of ${esc(name(t.city))}</b> are sailing for ${esc(c.name)} ${esc(what)}. They arrive about <b>${esc(dayWords(t.due))}</b>.</p>${guarding}${stands}
<div class="acts">${guard}${strike}</div>${guardWhy && !there ? `<p class="eta no">Triremes: ${esc(guardWhy)}.</p>` : ''}${strikeWhy ? `<p class="eta no">Your army: ${esc(strikeWhy)}.</p>` : ''}
<p class="if">Triremes off its shore fight them when they come (driven off, it is grateful: ${signed(15)}). Your army marching on ${esc(name(t.city))} calls them home, though as any war without cause ${esc(name(t.city))} hates it. Let it be, and ${esc(fall)}.</p></div></div></section>`;
}

/** Its loyalty: the number, where it is heading, every reason. */
function loyaltyHtml(s: SimState, c: Colony): string {
  const l = colonyLoyalty(s, c);
  const heading = Math.round(l.target);
  const trend = heading > c.loyalty ? `rising towards ${heading}` : heading < c.loyalty ? `falling towards ${heading}` : 'steady';
  const rows = l.why.map((x) => `<li class="${x.n > 0 ? 'good' : 'bad'}"><span class="v">${signed(x.n)}</span><span class="t">${esc(cap(x.why))}</span></li>`).join('');
  const pct = Math.max(0, Math.min(100, c.loyalty));
  const big = peopleOf(s, c) >= FREE_FROM;
  const foot = big ? `Grown past ${FREE_FROM}, it talks of freedom under ${COLONY_ARMING}, and declares it a season later unless it mends.` : `Under ${FREE_FROM} people it is too small to stand alone, whatever its loyalty.`;
  return `<section class="loyalty"><h3>Its loyalty</h3><div class="deal${c.talk ? ' tribute' : ''}"><div><p class="line"><b>${c.loyalty}</b> of 100, ${esc(trend)} (it moves half the way each month).</p><div class="bar"><i style="width:${pct}%"></i><s style="left:${COLONY_ARMING}%" title="Under ${COLONY_ARMING} a large colony talks of freedom"></s></div><ul class="whys"><li><span class="v">50</span><span class="t">To start with</span></li>${rows}</ul><p class="if">${esc(foot)}</p></div></div></section>`;
}

/** Its share: light, fair or heavy, what it comes to, what is on its way, what has come. */
function shareHtml(s: SimState, c: Colony): string {
  const y = colonyYear(s, c);
  const g = goodName(y.good);
  const buttons = SHARE_WORDS.map((wd, k) => {
    const t = colonyYear(s, c, k);
    return button('share', `${cap(wd)} <small>${fmt(t.amount)}</small> <em class="${k === 2 ? 'down' : k === 0 ? 'up' : ''}">${SHARE_LOYALTY[k]}</em>`, { site: c.site, share: k }, '', `${cap(wd)}: about ${fmt(t.amount)} ${g} a year (${fmt(t.dr)} dr); loyalty ${SHARE_LOYALTY[k]}; it grows ${k === 0 ? 'faster' : k === 2 ? 'slower' : 'as it would'}`, k === c.share ? 'on' : '');
  }).join('');
  const sent = c.sent ? `${c.sent === 1 ? 'One ship has' : `${c.sent} ships have`} come in, worth ${fmt(c.worth)} dr in all.` : 'None has come in yet.';
  const next = `The next sets out about ${dayWords(c.next)}${c.skip ? ', empty: the raiders took what it had' : ''}.`;
  const way = s.empire.tribute
    .filter((t) => t.colony === c.site && t.phase !== 'done')
    .map((t) => `<p class="eta sent">${esc(cap(tributeWords(t)))} ${t.phase === 'road' && s.tick >= t.start + t.dur && blockaded(s) ? `waiting off your gulf: ${esc(whose(blockaded(s)!.city))} fleet holds the mouth of your harbour, and it sails in once the blockade is broken or lifted` : t.phase === 'road' ? `at sea: in your bay about ${esc(dayWords(t.start + t.dur + SAIL_IN))}${esc(lateWords(s, `colony-${c.site}`))}` : t.phase === 'bay' ? 'on its ship in your bay, coming ashore' : 'coming in to your stores on its donkeys'}.</p>`)
    .join('');
  const last = s.empire.tribute.filter((t) => t.colony === c.site && t.phase === 'done').at(-1);
  const lastLine = last ? `<p class="if">Last: ${esc(tributeWords(last))} ${esc(last.how)}${last.lost ? ` (${fmt(last.lost)} there was no room for)` : ''}, ${esc(dayWords(last.ended))}.</p>` : '';
  const two = secondYear(s, c, COLONY_SHARE[c.share] ?? 0.4);
  const second = two.amount > 0 ? `, and ${swatch(two.good)}about ${esc(cargoWords(two.good, two.amount))} from its second trade` : '';
  return `<section class="tribute"><h3>Its share</h3><p class="line">${swatch(y.good)}<b>${esc(cap(SHARE_WORDS[c.share]))}</b>: about ${fmt(y.amount)} ${esc(g)} a year (${fmt(y.dr)} dr at the ship’s prices)${second}, a quarter of it each season by ship. ${esc(sent)} ${esc(next)}</p>${way}${lastLine}<div class="choice weights">${buttons}</div><p class="foot">Of what it makes: light a fifth, fair two fifths, heavy three fifths. Heavier fills your stores faster, slows its growth and wears its loyalty down.</p></section>`;
}

/** Its people and why they grow. */
function peopleHtml(s: SimState, c: Colony): string {
  const g = colonyGrowth(s, c);
  const total = g.reduce((a, x) => a + x.n, 0);
  const rows = g.filter((x) => x.n !== 0 || x.why.startsWith('newcomers')).map((x) => `<li class="${x.n > 0 ? 'good' : x.n < 0 ? 'bad' : ''}"><span class="v">${signed(x.n)}</span><span class="t">${esc(cap(x.why))}</span></li>`).join('');
  return `<section class="stands"><h3>Its people</h3><p class="line"><b>${fmt(peopleOf(s, c))}</b> (${fmt(c.settlers)} landed), growing about ${fmt(total)} a year:</p><ul class="whys">${rows}</ul><p class="if">Fewer newcomers come as it fills, and none sail in winter.</p></section>`;
}

/** Your triremes guarding it, and sending or calling them. */
function guardsHtml(s: SimState, c: Colony, map: CoastMap | undefined): string {
  if (c.threat && c.threat.end === '' && !c.guards.length) return '';
  const recall = button('recall', 'Call them home', { site: c.site }, map ? colonyRefusal(s, map, 'recall', c.site) : 'Not now', 'They row home to the bay');
  if (c.guards.length) return `<section><h3>Its guards</h3><p class="line">${c.guards.length === 1 ? 'One of your triremes guards it' : `${c.guards.length} of your triremes guard it`}, there or on the way.</p><div class="acts endally">${recall}</div></section>`;
  const home = guardsAtHome(s).length;
  if (!home) return '';
  return `<section><h3>Its guards</h3><p class="line">None of your triremes is off its shore. Send them when a rival’s ships come; your triremes count for its loyalty wherever they are.</p></section>`;
}

/** The homes its settlers left in your town. */
function homesHtml(c: Colony): string {
  if (!c.homes.length) return '';
  return `<p class="foot">Its first settlers: ${esc(c.homes.map((h) => h.name.replace(/^the house of /, '')).join(', '))}. Their homes in your town have newcomers in them now, or stand empty for them.</p>`;
}

/** A click on a colony's button: send its command. True if it was one. `open` opens a city's page. */
export function colonyEvent(e: Event, send: (c: Command) => void, open: (id: CityId, tab?: string) => void): boolean {
  const t = e.target as HTMLElement;
  if (e.type !== 'click') return false;
  const o = t.closest('button[data-cityopen]') as HTMLButtonElement | null;
  if (o) {
    // (Slice 47: the empire's list opens a vassal's page on its Empire tab.)
    open(o.dataset.cityopen as CityId, o.dataset.citytab);
    return true;
  }
  if (worksEvent(e, send)) return true;
  if (colonyEmpireEvent(e, send)) return true;
  const b = t.closest('button[data-colony]') as HTMLButtonElement | null;
  if (!b || b.disabled) return false;
  const act = b.dataset.colony;
  const site = b.dataset.site ?? '';
  if (act === 'found' || act === 'guard' || act === 'recall') send({ type: 'colony', act, site });
  else if (act === 'share') send({ type: 'colony', act, site, share: Number(b.dataset.share) });
  else if (act === 'strike') send({ type: 'expedition', city: b.dataset.city ?? '', kind: 'force' });
  else return false;
  return true;
}

/** (For the map's hover card on a site: a line on your colony or your settlers there.) */
export function siteCardLine(s: SimState, site: string): string {
  const c = colonyOf(s, site);
  if (c) {
    const t = c.threat && c.threat.end === '' ? `; ${c.threat.ships} ships of ${name(c.threat.city)} coming to ${c.threat.kind} it` : '';
    // (Slice 43: its stage, and what it asks of you.)
    const w = c.want && c.want.end === '' && !c.want.cargo ? `; it asks you for ${cargoWords(c.want.good, c.want.amount)}` : '';
    // (Slice 47: what is stationed there.)
    const g = stationedWords(s, c);
    return `${c.name}, your colony: ${STAGE_NAMES[stageOf(c)]} of ${fmt(peopleOf(s, c))} people, loyalty ${c.loyalty}${c.talk ? ', talking of freedom' : ''}${g ? `; ${g} stationed there` : ''}${t}${w}`;
  }
  const fa = freedOf(s, site);
  if (fa) return freeAllyLine(s, fa);
  const f = foundingOf(s, site);
  if (f) return f.phase === 'gathering' ? 'Your settlers are coming down to your quay for it' : `Your settlers are ${f.phase === 'sea' ? 'at sea' : 'sailing out of your bay'} for it: they land about ${dayWords(landsAbout(s, f))}`;
  return '';
}

