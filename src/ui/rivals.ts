/**
 * What the map of Greece says about Greece's own doings (slice 21): the
 * little icons on a city's label while it is at war or keeping a festival,
 * the status line on its page, its Rivals tab (how its ruler feels about each
 * of the others, and why), the hover cards for armies, fleets, the crossed
 * swords and the fields, and the News of Greece list. Only reads the sim.
 */
import { PLACES, rivalWay, RULED, type CityId } from '../map/greece';
import { dateOfTick, formatDate, formatYear, TICKS_PER_DAY, TICKS_PER_YEAR } from '../sim/clock';
import { festivalMonth, festivalOf, festivalOn, isAre, nextFestival } from '../sim/festivals';
import { armiesOnMap, foeIn, helpCost, PAIR_LULL, sinceWords, tieOf, tieReasons, tieWord, warLine, warOf } from '../sim/rivals';
import type { SimState, War } from '../sim/state';
import { cityOf, HARVEST_WORDS, OUTLOOK_MONTH, HARVEST_MONTH, outlookWords, usualPrice } from '../sim/world';
import { adjective, baseOf, coloniesOf, lordWords, recordSince, sizeWhy, siteWords, trendOf, vassalsOf, wealthWord } from '../sim/growth';
import { siteOf } from '../map/greece';
import type { WorldCity } from '../sim/state';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (t: string): string => `${t[0].toUpperCase()}${t.slice(1)}`;
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const name = (id: CityId): string => PLACES[id].name;
const whose = (id: CityId): string => (name(id).endsWith('s') ? `${name(id)}’` : `${name(id)}’s`);
const days = (n: number): string => (n === 1 ? 'a day' : `${n} days`);
const dayMonth = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName}`;
};

/** Crossed swords, for a city's label while it is at war. */
export const WAR_ICON = `<svg viewBox="0 0 16 16" width="15" height="15" class="ask war" aria-hidden="true"><path d="M3 13 12.4 3.6M13 13 3.6 3.6" stroke="#cfd4d8" stroke-width="2" stroke-linecap="round"/><path d="M3 13 12.4 3.6M13 13 3.6 3.6" stroke="#4a4a4a" stroke-width=".5" stroke-linecap="round"/><path d="M1.8 10.6l3.6 3.6M14.2 10.6l-3.6 3.6" stroke="#b08a3a" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="8" r="1.4" fill="#b8322a"/></svg>`;
/** A wreath, for a city's label while it keeps its festival. */
export const FEAST_ICON = `<svg viewBox="0 0 16 16" width="15" height="15" class="ask feast" aria-hidden="true"><path d="M4.2 12.6A5.6 5.6 0 0 1 8 2.6a5.6 5.6 0 0 1 3.8 10" fill="none" stroke="#5f7f2c" stroke-width="1.2"/>${[0.15, 0.32, 0.5, 0.68, 0.85].map((u) => {
  const a = Math.PI * (1.15 - u * 1.3);
  const x = 8 + Math.cos(a) * 5.4;
  const y = 7.8 - Math.sin(a) * 5.2;
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.9" ry="1" transform="rotate(${((-a * 180) / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#7aa03c"/>`;
}).join('')}<path d="M6 13.2h4" stroke="#b8322a" stroke-width="1.4" stroke-linecap="round"/></svg>`;

/** A city's label icons for Greece's doings: crossed swords while at war, a wreath while its festival is on. */
export function labelIcons(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  return `${c.war ? WAR_ICON : ''}${festivalOn(id, s.tick) ? FEAST_ICON : ''}`;
}

/** What sending a city at war anything costs you with its enemy, in a sentence ('' at peace): "Athens, at war with Sparta, will hold anything you send Sparta against you: −8." */
export function foeNote(s: SimState, id: CityId): string {
  const cost = helpCost(s.world, id);
  return cost ? `${name(cost.foe)}, at war with ${name(id)}, will hold anything you send ${name(id)} against you: ${signed(cost.amount)}.` : '';
}

/** The last war a city fought, ended within the lull (for its page and its prices). */
export const lastWar = (s: SimState, id: CityId): War | undefined =>
  s.world.wars.filter((x) => x.ended > 0 && (x.a === id || x.b === id) && s.tick - x.ended < PAIR_LULL).sort((x, y) => y.ended - x.ended)[0];

/** How a city's harvest looks, in a few words: the coming one from June, else the last. */
export function harvestLine(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const ahead = outlookWords(c, s.tick);
  if (ahead) return cap(ahead);
  const m = dateOfTick(s.tick).month;
  const when = m >= HARVEST_MONTH ? 'this autumn' : 'last autumn';
  return `${cap(HARVEST_WORDS[c.harvest])} harvest ${when}`;
}

/** The colour a city's fields take: from June the coming harvest's look, else the last harvest (parched brown to rich gold). */
export function fieldColour(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const m = dateOfTick(s.tick).month;
  const h = m >= OUTLOOK_MONTH && m < HARVEST_MONTH ? c.outlook : c.harvest;
  return ['#8a5434', '#b08a50', '#cbc25a', '#e2b63a', '#f2c21c'][h] ?? '#cbc25a';
}

/** The status lines under a ruled city's mood: a war on or lately ended, its festival on or coming, its harvest. */
export function statusHtml(s: SimState, id: CityId): string {
  const out: string[] = [];
  const x = warOf(s.world, id);
  if (x) {
    const foe = foeIn(x, id);
    const where = armiesOnMap(x, s.tick).some((a) => a.phase === 'standing') ? (x.by === 'sea' ? 'their fleets face each other' : 'their armies stand') : x.by === 'sea' ? 'their fleets are at sea' : 'their armies are marching';
    out.push(`<li class="war">${WAR_ICON}<span><b>At war with ${esc(name(foe))}</b> since ${esc(sinceWords(x.start))}: ${esc(where)} ${esc(x.by === 'sea' ? '' : 'at ')}${esc(placeOf(x))}. The way between them is closed; food and fleece are dear here.</span></li>`);
  } else {
    const last = lastWar(s, id);
    if (last && s.tick - last.ended < TICKS_PER_YEAR) {
      const foe = foeIn(last, id);
      const when = sinceWords(last.ended);
      const how = last.fate === 'peace' ? `Made a weary peace with ${name(foe)} on ${when}` : last.fate === id ? `Won its war with ${name(foe)} on ${when}` : `Lost its war with ${name(foe)} on ${when}, and poorer for it: food and fleece dear here for a good while`;
      out.push(`<li class="${last.fate === id || last.fate === 'peace' ? 'after' : 'war'}">${WAR_ICON}<span>${esc(how)}.</span></li>`);
    }
  }
  const f = festivalOf(id);
  const n = nextFestival(id, s.tick);
  if (f && n) {
    if (s.tick >= n.start) out.push(`<li class="feast">${FEAST_ICON}<span><b>${esc(cap(f.name))}</b> ${isAre(f)} on, until ${esc(dayMonth(n.end))}: wine and meat dear; a gift that arrives now counts for more.</span></li>`);
    else {
      const d = Math.ceil((n.start - s.tick) / TICKS_PER_DAY);
      if (d <= 30) out.push(`<li class="feast">${FEAST_ICON}<span>${esc(cap(f.name))} in ${esc(days(d))}: they are laying in wine and meat for it.</span></li>`);
    }
  }
  out.push(`<li class="crop"><i style="background:${fieldColour(s, id)}"></i><span>${esc(harvestLine(s, id))}.</span></li>`);
  // (Slice 31: its size, with its trends.)
  out.unshift(sizeHtml(s, id));
  return `<ul class="status">${out.join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// Slice 31: how big a city is, and why.

const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');
/** A small arrow for a size growing or shrinking by a twentieth over the record ('' steady). */
export const trendHtml = (t: -1 | 0 | 1): string => (t > 0 ? '<span class="tr up" title="growing">▲</span>' : t < 0 ? '<span class="tr down" title="shrinking">▼</span>' : '');
/** A city's men under arms as the cards count them (a hundred men to each the sim keeps). */
export const menWords = (army: number): string => `${fmt(Math.round(army) * 100)} men`;
/** "7,300": a city's people, to the hundred. */
export const peopleShort = (c: WorldCity): string => fmt(Math.round(c.pop / 100) * 100);

/** The line of a ruled city's size on its page: "7,320 people ▲ · rich · 4,000 men · 14 ships · Sparta's vassal since 746 BC". */
export function sizeHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  if (!c.ruler || !c.pop) return '';
  const fleet = baseOf(id).fleet > 0 ? ` · ${fmt(c.fleet)} ${Math.round(c.fleet) === 1 ? 'ship' : 'ships'}${trendHtml(trendOf(c, 'fleet'))}` : '';
  const lord = c.lord ? ` · <b>${esc(lordWords(c))}</b>` : '';
  const vs = vassalsOf(s.world, id);
  const lordOf = vs.length ? ` · lord of ${esc(vs.map((v) => name(v.id)).join(' and '))}` : '';
  const cols = coloniesOf(s.world, id);
  const colonies = cols.length ? ` · ${cols.length === 1 ? 'a colony' : `${cols.length} colonies`} (${esc(cols.map((x) => siteOf(x.id)?.name ?? x.id).join(', '))})` : '';
  return `<li class="size"><span>${fmt(c.pop)} people${trendHtml(trendOf(c, 'pop'))} · ${esc(wealthWord(c))}${trendHtml(trendOf(c, 'wealth'))} · ${menWords(c.army)}${trendHtml(trendOf(c, 'army'))}${fleet}${lord}${lordOf}${colonies}. The Rivals tab says why.</span></li>`;
}

/** "How it stands", at the top of the Rivals tab: people, wealth, army and fleet, each with its change over the record and the reasons, biggest first; its lord or its vassals; its colonies. */
export function standsHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  if (!c.ruler || !c.pop) return '';
  const rows: string[] = [];
  const since = recordSince(s.tick);
  const kinds: Array<['pop' | 'wealth' | 'army' | 'fleet', string, (n: number) => string]> = [
    ['pop', 'People', (n) => fmt(n)],
    ['wealth', 'Treasury', (n) => `${fmt(n)} dr`],
    ['army', 'Army', (n) => menWords(n)],
    ['fleet', 'Fleet', (n) => `${fmt(n)} ${Math.round(n) === 1 ? 'ship' : 'ships'}`],
  ];
  for (const [what, label, show] of kinds) {
    if (what === 'fleet' && baseOf(id).fleet === 0) continue;
    const x = sizeWhy(c, what);
    const unit = (n: number): string => (what === 'pop' ? fmt(Math.abs(n)) : what === 'wealth' ? fmt(Math.abs(n)) : what === 'army' ? fmt(Math.abs(Math.round(n * 100))) : (Math.abs(n) < 10 ? Math.abs(n).toFixed(1) : fmt(Math.abs(n))));
    const why = x.why
      .filter((r) => (what === 'army' ? Math.abs(r.n * 100) >= 5 : what === 'fleet' ? Math.abs(r.n) >= 0.05 : true))
      .slice(0, 5)
      .map((r) => `<li class="${r.n > 0 ? 'good' : 'bad'}"><span class="v">${r.n > 0 ? '+' : '−'}${unit(r.n)}</span><span class="t">${esc(cap(r.why))}</span></li>`)
      .join('');
    const pct = Math.round(x.share * 100);
    const change = Math.abs(pct) >= 1 ? `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% ${since}` : `steady ${since}`;
    const note = what === 'wealth' ? ` (${esc(wealthWord(c))})` : '';
    rows.push(`<div class="stand"><div class="shead"><b>${label}</b><span>${show(x.now)}${note}${trendHtml(trendOf(c, what))}</span><span class="ch">${esc(change)}</span></div><ul class="whys">${why || '<li>Nothing moving it</li>'}</ul></div>`);
  }
  const lines: string[] = [];
  if (c.lord) lines.push(`${cap(lordWords(c))}: it pays ${name(c.lord)} a tenth of what it takes in, and goes to no war of its own. It breaks free if ${name(c.lord)} loses a war, or once its army is two thirds of ${whose(c.lord)}.`);
  const vs = vassalsOf(s.world, id);
  if (vs.length) lines.push(`Lord of ${vs.map((v) => name(v.id)).join(' and ')}, which ${vs.length === 1 ? 'pays' : 'pay'} it tribute.`);
  for (const x of coloniesOf(s.world, id)) lines.push(`${cap(siteOf(x.id)?.name ?? x.id)}: ${siteWords(s, x)}, making ${siteOf(x.id)?.good ?? 'goods'} for ${name(id)}.`);
  for (const x of s.world.sites.filter((y) => y.bound === id)) lines.push(`Settlers bound for ${siteOf(x.id)?.name ?? x.id}: ${siteWords(s, x)}.`);
  const more = lines.map((l) => `<p class="line">${esc(l)}</p>`).join('');
  return `<section class="stands"><h3>How it stands</h3>${rows.join('')}${more}<p class="foot">Each month a city’s people, treasury, army and fleet move with its harvests, its trade (yours too), its wars, its debts and its tribute, and are pulled back towards what its land can hold. A bigger city buys and sells more with you; a richer one has more to lend; a bigger army sends a bigger band.</p></section>`;
}

/** A site's hover card: its name and good, what it is, and who holds it or is bound for it. */
export function siteCard(s: SimState, id: string): string {
  const p = siteOf(id);
  const x = s.world.sites.find((y) => y.id === id);
  if (!p || !x) return '<b>An empty site</b>';
  const who = x.owner ? `Click for ${esc(whose(x.owner as CityId))} page` : x.bound ? `Click for ${esc(whose(x.bound as CityId))} page` : 'A strong city with ships may send settlers here';
  return `<b>${esc(`${p.name} · ${p.good}`)}</b><span>${esc(cap(p.blurb))}</span><span>${esc(cap(siteWords(s, x)))}${x.owner ? esc(`: ${p.good} for ${name(x.owner as CityId)}`) : ''}</span><span class="sub">${who}</span>`;
}

/** A site's label on the map: its name and good, or whose colony it is (with the founder's colour). */
export function siteLabelHtml(s: SimState, id: string): string {
  const p = siteOf(id);
  const x = s.world.sites.find((y) => y.id === id);
  if (!p || !x) return '';
  if (x.owner) return `<i class="lord" style="background:${PLACES[x.owner as CityId]?.colour ?? '#888'}"></i><b>${esc(p.name)}</b> <span class="gd">${esc(adjective(x.owner as CityId))}</span>`;
  return `<b>${esc(p.name)}</b> <span class="gd">${esc(p.good)}</span>`;
}

/** Where a war's armies meet: "Megara", "off Aegina". */
const placeOf = (x: War): string => rivalWay(x.a, x.b)?.place ?? '';

/** A ruled city's Rivals tab: how its ruler feels about each of the others, and why; its war, if any; its festival. */
export function rivalsHtml(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const they = c.ruler?.female ? 'she' : 'he';
  const rows = RULED.filter((o) => o !== id)
    .map((o) => {
      const n = tieOf(s.world, id, o, s.tick);
      const back = tieOf(s.world, o, id, s.tick);
      const word = tieWord(n, c.war === o);
      const why = tieReasons(s.world, id, o, s.tick)
        .map((r) => `<li class="${r.worth > 0 ? 'good' : 'bad'}"><span class="v">${r.worth > 0 ? '+' : '−'}${Math.abs(r.worth)}</span><span class="t">${esc(cap(r.why))}${r.tick > 0 ? `<em>since ${esc(formatDate(dateOfTick(r.tick)))}${r.fading ? ', fading' : ''}</em>` : ''}</span></li>`)
        .join('');
      const cls = word === 'at war' || word === 'feuding' ? 'bad' : word === 'friends' ? 'good' : '';
      return `<div class="rival ${cls}"><div class="rhead"><i style="background:${PLACES[o].colour}"></i><b>${esc(name(o))}</b><span class="rword">${cap(word)} <span class="num">${signed(n)}</span></span></div><ul class="whys">${why || '<li>Nothing either way</li>'}</ul><p class="back">${esc(cap(cityOf(s.world, o).ruler ? `${whose(o)} ruler feels ${signed(back)} towards ${name(id)}` : ''))}</p></div>`;
    })
    .join('');
  const x = warOf(s.world, id) ?? lastWar(s, id);
  const war = x ? `<section class="wars"><h3>War</h3><p class="line">${esc(warLine(x, s.tick))}.</p>${x.ended ? '' : `<p class="foot">It ends in a season or two, in a peace or a defeat. While it lasts each side may ask your city for help, and whatever you trade with or send to one side, the other remembers.</p>`}</section>` : '';
  const f = festivalOf(id);
  const n = nextFestival(id, s.tick);
  const feast = f && n ? `<section class="festival"><h3>Festival</h3><p class="line"><b>${esc(cap(f.name))}</b>, every ${esc(festivalMonth(f))}: ${esc(f.what)}${c.war && f.atWar ? ` (${esc(f.atWar)})` : ''}. ${s.tick >= n.start ? `On now, until ${esc(dayMonth(n.end))}.` : `Next on ${esc(dayMonth(n.start))}.`} For a fortnight before it and while it lasts, wine and meat are dear in ${esc(name(id))}; a gift that arrives while it is on counts half as much again${c.ruler?.traits.includes('pious') ? ` (twice as much: ${they} is pious)` : ''}.</p></section>` : '';
  return `${standsHtml(s, id)}<section class="rivals"><h3>How ${they} feels about the others</h3>${rows}<p class="foot">Rulers far enough out fall to feuding (${signed(-25)} or worse), and may go to war. Quarrels and friendships come and fade.</p></section>${war}${feast}`;
}

/** The card over an army or fleet on the map: whose, how many, out, standing or going home. */
export function armyCard(s: SimState, id: number, city: CityId): string {
  const x = s.world.wars.find((w) => w.id === id);
  if (!x) return `<b>${esc(whose(city))} army</b>`;
  const foe = foeIn(x, city);
  const a = armiesOnMap(x, s.tick).find((v) => v.city === city);
  const men = city === x.a ? x.menA : x.menB;
  const what = x.by === 'sea' ? 'fleet' : 'army';
  const place = placeOf(x);
  const line = !a
    ? 'At home'
    : a.phase === 'out'
      ? x.by === 'sea'
        ? `Sailing to meet ${whose(foe)} fleet ${place}`
        : `Marching to meet ${whose(foe)} army at ${place}`
      : a.phase === 'standing'
        ? x.by === 'sea'
          ? `Facing ${whose(foe)} fleet ${place}`
          : `Facing ${whose(foe)} army at ${place}`
        : x.fate === 'peace'
          ? `Going home to ${name(city)}: the war ended in a weary peace`
          : `Going home to ${name(city)}: ${x.fate === city ? 'the war won' : 'the war lost'}`;
  const size = x.by === 'sea' ? `${Math.max(3, Math.round(men / 3))} galleys` : `${(men * 100).toLocaleString('en-GB')} men`;
  return `<b>${esc(`${whose(city)} ${what} · ${size}`)}</b><span>${esc(line)}</span><span class="sub">Click for ${esc(name(city))}’s page</span>`;
}

/** The card over the crossed swords: the war, since when, why, the way closed, and what it does to prices in both. */
export function warCard(s: SimState, id: number): string {
  const x = s.world.wars.find((w) => w.id === id);
  if (!x) return '<b>A war</b>';
  const dear = (city: CityId): string => {
    const c = cityOf(s.world, city);
    return `${name(city)}: wheat ${c.price[0]} (usually ${usualPrice(c, 0)}), fleece ${c.price[4]} (usually ${usualPrice(c, 4)})`;
  };
  return `<b>${esc(`${name(x.a)} and ${name(x.b)} at war`)}</b><span>${esc(`Since ${sinceWords(x.start)}: ${x.why}. ${name(x.a)} declared it.`)}</span><span>${esc(`The ${x.by === 'sea' ? 'sea lane' : 'road'} between them is closed. Food and fleece are dear in both: ${dear(x.a)}; ${dear(x.b)}.`)}</span><span class="sub">Each side may ask your city for help; what you trade with or send one, the other remembers</span>`;
}

/** The card over a city's fields: how its harvest looks, and what that does to its wheat. */
export function fieldsCard(s: SimState, id: CityId): string {
  const c = cityOf(s.world, id);
  const k = 0;
  return `<b>${esc(`${whose(id)} fields`)}</b><span>${esc(harvestLine(s, id))}</span><span>${esc(`Wheat there is ${c.price[k]} a hundred (usually ${usualPrice(c, k)}). The harvest comes in each September.`)}</span><span class="sub">Click for ${esc(name(id))}’s page</span>`;
}

/** The News of Greece: the latest lines, newest first, each with its date and its city's colour (click for its page). */
export function newsHtml(s: SimState, open: boolean): string {
  const items = s.world.news.slice().reverse();
  const year = dateOfTick(s.tick).yearBC;
  const rows = items
    .map((n) => {
      const d = dateOfTick(n.tick);
      const line = n.line.replace(/\.$/, '');
      // (A line from an earlier year says which: the list can reach back more than a year, and each festival comes every year.)
      const when = `${d.day} ${d.monthName.slice(0, 3)}${d.yearBC !== year ? ` ${formatYear(d.yearBC)}` : ''}`;
      return `<li data-city="${n.city}" class="${n.urgent ? 'urgent' : n.greece ? 'greece' : ''}" title="Click for ${esc(PLACES[n.city]?.name ?? '')}’s page"><i style="background:${PLACES[n.city]?.colour ?? '#888'}"></i><span><em>${esc(when)}</em> ${esc(line)}.</span></li>`;
    })
    .join('');
  return `<button class="nhead" aria-expanded="${open}"><b>News of Greece</b><span>${items.length ? (open ? '▾' : `▸ ${items.length}`) : ''}</span></button>${open ? `<ul>${rows || '<li class="none">Nothing yet.</li>'}</ul>` : ''}`;
}

