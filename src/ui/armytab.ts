/**
 * The side panel's Army tab (slice 23): the city's whole strength, then each
 * barracks with its companies (kind, men, wounded, where, what it is doing,
 * pay), and the barracks' own buttons: raise a company of hoplites or of
 * archers, and for each company select it (to march its banner), bring it
 * back to barracks, or dismiss it. Only reads the state; its buttons carry
 * data-act for the side panel to send.
 */
import type { CoastMap } from '../map/bake';
import { districtAt, districtTitle } from '../map/districts';
import { canSpare, companiesAt, companyOf, COMPANY_SIZE, doingWords, HIRED_PAY, hireRefusal, HIRELINGS, menOf, payOf, PER_BARRACKS, servingHomes, strength, woundedOf, type HiredKind } from '../sim/army';
// Slice 36.
import { HORSE_COMPANY } from '../sim/army';
import { ESTATE, VILLA } from '../sim/buildings';
import { companyWords } from '../sim/battle';
import { TICKS_PER_DAY } from '../sim/clock';
import { expeditionOf } from '../sim/expeditions';
import { centreOf, jobsAt } from '../sim/buildings';
import { ARMOUR, held } from '../sim/foods';
import type { Company, SimState } from '../sim/state';
import { SOLDIER_PAY } from '../sim/treasury';
import { afloat, CREW, crewWhy, FIT, guardRefusal, LANES, orderRefusal, PER_YARD, piratesOn, ROWER_PAY, rowersWarning, triremeDoing, triremeName, triremesAt, TRIREME_COST } from '../sim/fleet';
import { PLACES } from '../map/greece';
// Slice 38: the harbour's blockade, oars and repairs, warships.
import { blockadeWords } from '../sim/blockades';
import { bandWords, daysToMend, warWords } from '../sim/fleet';
// Slice 50: the kit.
import { actionIcon, buildingIcon, TRIREME_FIGURE, unitFigure } from './icons';
import { kbar, kbtn, kcard, kchip, kitHtml, kpips, kwhy, type PipState } from './kit';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number): string => Math.round(Math.abs(n)).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const lower = (t: string): string => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : t);

/** "Today", "3 days ago", "13 months ago" (phase 5 review: a launch of last year read "412 days ago"). */
function agoWords(ticks: number): string {
  const d = Math.floor(ticks / TICKS_PER_DAY);
  const m = Math.floor(d / 30);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d < 60 ? `${d} days ago` : m < 24 ? `${m} months ago` : `${Math.floor(m / 12)} years ago`;
}

/** Where a company is, in words: "at its barracks", or the district its banner stands in ('' for hirelings not yet in: their row says they are walking in). */
export function whereWords(s: SimState, map: CoastMap, c: Company): string {
  if (c.hired && !s.army.soldiers.some((x) => x.company === c.id && x.state !== 'coming')) return '';
  if (c.order === 'drill') return 'at its barracks';
  // (On an expedition, slice 28: where it is in Greece.)
  const e = c.away ? expeditionOf(s, c.away) : undefined;
  if (e) {
    const name = PLACES[e.city].name;
    const where = e.by === 'sea' ? 'the shipyard' : 'the edge of your land';
    if (e.phase === 'mustering') return c.order === 'away' ? `${e.by === 'sea' ? 'aboard at the shipyard' : 'at the edge of your land'}, waiting for the others, for ${name}` : `on its way to ${where}, for ${name}`;
    if (e.phase === 'marching') return e.by === 'sea' ? `at sea, bound for ${name}` : `on the road to ${name}`;
    if (e.phase === 'fighting') return `at ${name}`;
    if (e.phase === 'homeward') return e.by === 'sea' ? `at sea on the way home from ${name}` : `on the road home from ${name}`;
  }
  return lower(districtTitle(districtAt(map, c.x, c.z)));
}

/** A company's men as pips, in their places: ready, waiting for armour, wounded, walking in, away; the rest empty. */
function companyPips(s: SimState, c: Company): { pips: PipState[]; tip: string } {
  const men = menOf(s, c);
  const n = (st: string[]): number => men.filter((x) => st.includes(x.state)).length;
  const ready = n(['ready']);
  const arming = n(['arming']);
  const hurt = n(['wounded', 'healing']);
  const coming = n(['coming']);
  const away = n(['away']);
  const other = men.length - ready - arming - hurt - coming - away;
  const pips: PipState[] = [
    ...Array<PipState>(ready + Math.max(0, other)).fill('ready'),
    ...Array<PipState>(away).fill('away'),
    ...Array<PipState>(arming).fill('arming'),
    ...Array<PipState>(hurt).fill('wounded'),
    ...Array<PipState>(coming).fill('coming'),
  ];
  while (pips.length < c.want) pips.push('empty');
  const bits = [`${ready} ready`, away ? `${away} away` : '', arming ? `${arming} waiting for armour` : '', hurt ? `${hurt} wounded` : '', coming ? `${coming} walking in` : '', c.want > men.length ? `${c.want - men.length} ${c.want - men.length === 1 ? 'place' : 'places'} empty` : ''].filter((b) => b);
  return { pips: pips.slice(0, Math.max(c.want, men.length)), tip: `${men.length} of ${c.want} men: ${bits.join(', ')}` };
}

/** "16 of 32 ready: 16 wait for armour", for your own companies (allies apart). */
export function readyWords(s: SimState): string {
  let men = 0;
  let ready = 0;
  let arming = 0;
  let hurt = 0;
  let coming = 0;
  let away = 0;
  for (const c of s.army.companies) {
    if (c.ally) continue;
    for (const x of menOf(s, c)) {
      men++;
      if (x.state === 'ready') ready++;
      else if (x.state === 'arming') arming++;
      else if (x.state === 'wounded' || x.state === 'healing') hurt++;
      else if (x.state === 'coming') coming++;
      else if (x.state === 'away') away++;
    }
  }
  if (!men) return '';
  if (ready === men) return men === 1 ? 'He is ready' : `All ${fmt(men)} ready`;
  const bits = [arming ? `${fmt(arming)} ${arming === 1 ? 'waits' : 'wait'} for armour` : '', hurt ? `${fmt(hurt)} wounded` : '', coming ? `${fmt(coming)} walking in` : '', away ? `${fmt(away)} away` : ''].filter((b) => b);
  return `${fmt(ready)} of ${fmt(men)} ready${bits.length ? `: ${bits.join(', ')}` : ''}`;
}

/** The key to the pips. */
const PIP_KEY = `<div class="k-key"><span>${kpips(['ready'])}ready</span><span>${kpips(['arming'])}waiting for armour</span><span>${kpips(['wounded'])}wounded</span><span>${kpips(['coming'])}walking in</span><span>${kpips(['away'])}away</span></div>`;

/** The Army tab's HTML. `focus`: a barracks picked out (clicked in the city); `selected`: the company whose banner is in hand. */
export function armyHtml(s: SimState, map: CoastMap, focus: number, selected: number): string {
  return kitHtml(`<div class="kit k-army">${armyInner(s, map, focus, selected)}</div>`);
}

function armyInner(s: SimState, map: CoastMap, focus: number, selected: number): string {
  const out: string[] = [];
  const barracks = s.buildings.filter((b) => b.kind === 'barracks');
  const st = strength(s);
  if (st.companies + st.allies === 0 && barracks.length === 0) {
    out.push(`<div class="k-muster">${kcard(`<div class="k-big"><b>0</b><span>soldiers</span></div><div class="k-figs">${unitFigure('hoplite')}${unitFigure('archer')}${unitFigure('horseman')}</div>`, 'k-sum')}</div>`);
    out.push(
      `<p class="side-note">The city has no army yet. Build a barracks (B ×4) beside a road, then raise companies there: hoplites from the fine houses and villas, archers from the townhouses and better. Hoplites each need a set of armour: a copper mine on the green-streaked rock in the hills (B B) and an armoury (B ×3) make it, or Corinth and Athens sell it. In a pinch a barracks can hire a company of Cretan archers or Arcadian hoplites, for a fee and three times the pay.</p>`,
    );
    fleetHtml(s, map, focus, out);
    return out.join('');
  }
  // (Hoplites in without armour: counted among the soldiers, but not ready to march or go abroad.)
  const arming = s.army.soldiers.filter((x) => x.state === 'arming' && !companyOf(s, x.company)?.ally).length;
  // The muster: the whole strength, by kind, and how many are ready.
  const kinds: string[] = [];
  const kindChip = (fig: string, n: number, name: string): string => `<span class="k-kind" data-tip="${esc(`${fmt(n)} ${name}`)}">${fig}<b>${fmt(n)}</b><small>${esc(name[0].toUpperCase() + name.slice(1))}</small></span>`;
  if (st.hoplites || !st.hirelings) kinds.push(kindChip(unitFigure('hoplite'), st.hoplites, 'hoplites'));
  if (st.archers || !st.hirelings) kinds.push(kindChip(unitFigure('archer'), st.archers, 'archers'));
  if (st.horsemen) kinds.push(kindChip(unitFigure('horseman'), st.horsemen, 'horsemen'));
  if (st.hirelings) kinds.push(kindChip(unitFigure('archer', 'cretan'), st.hirelings, 'hirelings'));
  const ready = readyWords(s);
  const allyMen = s.army.companies.filter((c) => c.ally).reduce((a, c) => a + menOf(s, c).length, 0);
  const readyN = s.army.soldiers.filter((x) => x.state === 'ready' && !companyOf(s, x.company)?.ally).length;
  out.push(
    kcard(
      `<div class="k-big"><b>${fmt(st.men)}</b><span>${st.men === 1 ? 'soldier' : 'soldiers'} in ${st.companies} ${st.companies === 1 ? 'company' : 'companies'}${st.allies ? ` of yours, and ${st.allies} allied` : ''}</span></div>` +
        `<div class="k-figs">${kinds.join('')}</div>` +
        (ready ? `${kbar({ value: readyN, max: Math.max(1, st.men), tone: 'strength', tip: `${fmt(readyN)} of ${fmt(st.men)} in the ranks, ready to march or fight` })}<p class="k-ready${arming ? ' warn' : ''}"${arming ? ` data-tip="Hoplites in at their barracks without a set of armour: they don’t drill, march or go on an expedition until the barracks’ porter brings them one from the storehouses"` : ''}>${esc(ready)}</p>` : '') +
        `<div class="k-row k-sums">${kchip(`${fmt(st.pay)} dr a month`, { icon: 'pay', tip: 'Their pay, a month' })}${st.wounded ? kchip(`${fmt(st.wounded)} wounded`, { icon: 'wounded', tone: 'warn' }) : ''}${arming ? kchip(`${fmt(arming)} without armour`, { icon: 'armour', tone: 'warn', tip: 'Waiting for armour: the barracks’ porter brings each a set from the storehouses' }) : ''}${st.allies ? kchip(`${st.allies} allied: ${fmt(allyMen)} men`, { icon: 'guard', tip: 'Companies come to your aid from your allies, colonies and vassals: they fight beside yours, and aren’t counted with them' }) : ''}</div>`,
      'k-sum',
    ),
  );
  // The army's news: the last few things that happened to it.
  const news = s.army.news.filter((n) => n.tick <= s.tick).slice(-4).reverse();
  if (news.length) out.push(`<ul class="army-news k-news">${news.map((n) => `<li><small>${esc(agoWords(s.tick - n.tick))}</small> ${esc(n.line)}.</li>`).join('')}</ul>`);
  if (st.companies + st.allies > 0) out.push(PIP_KEY);
  const serving = servingHomes(s);
  const homes = s.buildings.filter((b) => b.kind === 'home');
  const spare = { hoplite: homes.filter((b) => canSpare(s, b, 'hoplite', serving)).length, archer: homes.filter((b) => canSpare(s, b, 'archer', serving)).length, horseman: homes.filter((b) => canSpare(s, b, 'horseman', serving)).length };
  // Slice 36: the estates that could send a rider. (The horsemen's button always shows: it showed only once an estate was
  // lived in, and a city without one never saw that horsemen could be raised. Without one it says what it takes.)
  const estates = homes.filter((b) => b.estate && b.level >= ESTATE && b.people > 0).length;
  const plots = homes.filter((b) => b.estate).length;
  const villas = homes.some((b) => !b.estate && b.level >= VILLA && b.people > 0);
  const noRiders = estates
    ? ''
    : plots
      ? villas
        ? 'Your estate’s plot waits for its noble house: it comes along the road from the edge of your land, and once it lives there it sends a son to ride'
        : 'Your estate’s plot waits for a noble house, and none comes until your city has a villa'
      : 'Horsemen are the sons of estates: lay out an estate’s plot (Population, Estate) beside a road near your villas; a noble house comes to it once the city has a villa, and each estate sends a rider';
  const armour = s.buildings.reduce((a, b) => a + (b.kind === 'storehouse' ? held(b, ARMOUR) : 0), 0);
  barracks.forEach((b, i) => {
    const cs = companiesAt(s, b);
    const [cx, cz] = centreOf(b);
    const title = barracks.length === 1 ? 'The barracks' : `The ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i] ?? `${i + 1}th`} barracks`;
    const jobs = jobsAt(b);
    out.push(`<section class="barracks${b.id === focus ? ' focus' : ''}" data-barracks="${b.id}">`);
    out.push(
      `<h3 class="k-h k-bh"><span class="k-hic">${buildingIcon('barracks')}</span><span class="k-ht"><button class="link" data-act="go" data-x="${cx}" data-z="${cz}" title="Go there">${esc(title)}</button> <small>${esc(lower(districtTitle(districtAt(map, cx, cz))))} · ${b.workers} of ${jobs} staff</small></span>${jobs <= 12 ? `<span class="k-aside">${kpips(Array.from({ length: jobs }, (_, k) => (k < b.workers ? 'on' : 'off')), `${b.workers} of ${jobs} staff`)}</span>` : ''}</h3>`,
    );
    if (b.workers === 0) out.push('<p class="side-note warn">It has no staff yet: nobody takes the men in until it has workers.</p>');
    if (cs.length === 0) out.push('<p class="side-note">No companies yet.</p>');
    out.push('<ul class="companies">');
    for (const c of cs) {
      const men = menOf(s, c).length;
      const hurt = woundedOf(s, c).length;
      const where = whereWords(s, map, c);
      const sel = c.id === selected;
      const dismiss = c.hired ? 'They walk off the way they came; what they were owed is still paid' : 'The men walk home to their old work; their armour goes back to the stores';
      const { pips, tip } = companyPips(s, c);
      const tag = c.hired ? kchip(c.hired === 'cretan' ? 'Cretan hirelings' : 'Arcadian hirelings', { tone: 'gold', tip: `Hired, at ${HIRED_PAY} dr a man a month` }) : c.militia ? kchip('militia', { tone: 'sea' }) : c.ally ? kchip('allied', { tone: 'sea' }) : '';
      const allyColour = c.ally ? (PLACES[c.ally as keyof typeof PLACES]?.colour ?? '') : '';
      const pickTip = c.away ? 'Away on an expedition: it takes orders again once it is home' : sel ? 'Its banner is in hand: click a street or open ground to march it there' : 'Take its banner in hand, to march it';
      const acts = c.away
        ? ''
        : `<div class="k-acts k-row">${c.order === 'drill' ? '' : kbtn({ act: 'recall', data: { id: c.id }, icon: 'recall', html: 'Back to barracks', small: true, tip: 'March it back to its barracks, to drill' })}${kbtn({ act: 'dismiss', data: { id: c.id }, icon: 'dismiss', html: 'Dismiss', small: true, tone: 'red', tip: dismiss })}</div>`;
      out.push(
        `<li class="k-card k-co${sel ? ' on' : ''}${c.hired ? ` hired ${c.hired}` : ''}">` +
          `<div class="k-cotop"><div class="k-niche">${unitFigure(c.kind, c.hired, allyColour)}</div><div class="k-coname"><button class="pick" data-act="company" data-id="${c.id}" title="${esc(pickTip)}"${c.away ? ' disabled' : ''}><span class="k-bi">${actionIcon('banner')}</span><b>${esc(cap(companyWords(c)))}</b></button>` +
          `<p>${esc(cap(doingWords(s, c)))}${where ? ` · ${c.away ? esc(where) : `<button class="link" data-act="go" data-x="${c.x.toFixed(1)}" data-z="${c.z.toFixed(1)}" title="Go there">${esc(where)}</button>`}` : ''}</p>${tag ? `<p>${tag}</p>` : ''}</div></div>` +
          `<div class="k-corow">${kpips(pips, tip, c.want > 12 ? '' : 'big')}</div>` +
          `<p class="k-cofoot"><b class="n" title="${esc(tip)}">${men}<small> / ${c.want}</small></b> men · ${hurt ? `<span class="warn">${hurt} wounded</span>` : 'none wounded'} · ${fmt(men * payOf(c))} dr a month${c.owed > 0 ? ` · <span class="warn">${fmt(c.owed)} dr pay owed</span>` : ''}</p>` +
          (c.why ? `<p class="why">${esc(c.why)}</p>` : '') +
          acts +
          '</li>',
      );
    }
    out.push('</ul>');
    if (cs.length < PER_BARRACKS) {
      const raiseBtn = (kind: 'hoplite' | 'archer' | 'horseman', label: string, tip: string, why: string, line: string): string =>
        `<div class="k-raise">${kbtn({ act: 'raise', data: { id: b.id, kind }, icon: unitFigure(kind), html: label, tip, why, cls: 'k-wide' })}${why ? kwhy(why) : line ? `<p class="k-why${/^No /.test(line) ? ' bad' : ''}">${esc(line)}</p>` : ''}</div>`;
      const homesLine = (n: number, from: string): string => (n ? `${n} ${n === 1 ? 'home' : 'homes'} could send a man now, from the ${from}` : `No home can send a man now: they come from the ${from}, one a home. It waits for them`);
      out.push(
        `<div class="k-recruit"><h4 class="k-h"><span class="k-hic">${actionIcon('raise')}</span><span class="k-ht">Raise a company</span><span class="k-aside">room for ${PER_BARRACKS - cs.length}</span></h4>` +
          raiseBtn('hoplite', 'Raise a company of hoplites', 'Sixteen men from the fine houses and villas, one a home, each with a set of armour from the stores', '', `${homesLine(spare.hoplite, 'fine houses and villas')} · ${fmt(armour)} ${armour === 1 ? 'set' : 'sets'} of armour in the storehouses`) +
          raiseBtn('archer', 'Raise a company of archers', 'Sixteen men from the townhouses and better, one a home; they need no armour', '', homesLine(spare.archer, 'townhouses and better')) +
          raiseBtn('horseman', 'Raise a company of horsemen', `${HORSE_COMPANY} riders, a son from each estate, mounted and armed from their own stables: fast, good against archers and against a band on the run, weak against a line of hoplites`, noRiders, estates ? `${spare.horseman} ${spare.horseman === 1 ? 'estate' : 'estates'} could send a rider now` : '') +
          `<p class="k-why">Each man is paid ${SOLDIER_PAY} dr a month.</p></div>`,
      );
      // Hirelings: a company in a few days, for a price.
      const hire = (Object.keys(HIRELINGS) as HiredKind[]).map((k) => {
        const h = HIRELINGS[k];
        const no = hireRefusal(s, b, k);
        const tip = `Sixteen ${h.name} for ${h.fee} dr now and ${HIRED_PAY} dr a man a month (${fmt(COMPANY_SIZE * HIRED_PAY)} dr a month): they march in from the edge of your land, armed, and take nobody from your homes. Unpaid a month, they walk off`;
        return `<div class="k-raise">${kbtn({ act: 'hire', data: { id: b.id, kind: k }, icon: unitFigure(h.kind, k), html: `Hire ${esc(h.name)} <small>${h.fee} dr</small>`, tip, why: no, cls: 'k-wide' })}${kwhy(no, true)}</div>`;
      });
      out.push(`<div class="k-recruit hire"><h4 class="k-h"><span class="k-hic">${actionIcon('hire')}</span><span class="k-ht">Hire a company</span></h4>${hire.join('')}</div>`);
    } else
      out.push(
        `<div class="k-recruit">${kbtn({ act: 'raise', data: { id: b.id, kind: 'hoplite' }, icon: 'raise', html: 'Raise a company', why: `A barracks holds ${PER_BARRACKS} companies: build another for more`, cls: 'k-wide' })}${kwhy(`Full: a barracks holds ${PER_BARRACKS} companies. Build another for more.`)}</div>`,
      );
    out.push('</section>');
  });
  if (st.companies + st.allies > 0) out.push('<p class="side-note">Click a company’s name (or its banner in the city) to take its banner in hand, then click a street or open ground to march it there; the view stays where you are looking, and the company’s place takes you to it. Esc lets go. Orders work while paused.</p>');
  fleetHtml(s, map, focus, out);
  return out.join('');
}

const cityName = (id: keyof typeof PLACES): string => PLACES[id].name;

/**
 * The fleet (slice 26): each shipyard with its triremes (what each is doing,
 * her hull, her rowers and why she is short, her pay), and their buttons:
 * order a trireme, send one to guard a sea lane, bring her home; then the
 * pirates on the lanes and the last reports of fights at sea.
 */
function fleetHtml(s: SimState, map: CoastMap, focus: number, out: string[]): void {
  const f = s.fleet;
  const yards = s.buildings.filter((b) => b.kind === 'shipyard');
  const pirates = LANES.map((l) => piratesOn(s, l.way)).filter((p) => !!p);
  if (!yards.length && !f.triremes.length && !pirates.length && !f.reports.length) {
    out.push('<p class="side-note">On the shore, a shipyard (B ×7, Military) builds triremes to fight ships in the bay and guard your sea lanes.</p>');
    return;
  }
  const ts = f.triremes.filter(afloat);
  const rowers = ts.reduce((a, t) => a + t.crew.length, 0);
  out.push(`<h3 class="fleet-head k-h"><span class="k-hic">${actionIcon('ship')}</span><span class="k-ht">The fleet</span></h3>`);
  // (Slice 38: the harbour's blockade, and the shipyard's own panel.)
  const held = blockadeWords(s);
  if (held) out.push(`<p class="side-note warn">${esc(held)}.</p>`);
  if (yards.length) out.push(`<div class="k-recruit k-row">${kbtn({ act: 'shipyard', data: { id: yards.find((b) => b.id === focus)?.id ?? yards[0].id }, icon: buildingIcon('shipyard'), html: 'Open the shipyard', tip: 'Every trireme’s hull and oars, her repairs and orders, the harbour and the lanes', cls: 'k-wide' })}</div>`);
  out.push(`<div class="k-row k-sums">${kchip(`${fmt(ts.filter((t) => t.state !== 'building').length)} triremes`, { icon: 'ship' })}${kchip(`${fmt(rowers)} rowers`, { icon: 'men' })}${kchip(`${fmt(rowers * ROWER_PAY)} dr a month`, { icon: 'pay', tip: 'The rowers’ pay, a month' })}</div>`);
  const lanes = (t: (typeof ts)[number]): string =>
    // (Slice 38: the lanes you trade over, or where pirates or warships lie: every sea lane has a place now.)
    LANES.filter((l) => s.world.routes.some((r) => r.kind === 'sea' && r.city === l.city) || piratesOn(s, l.way)).map((l) => {
      const no = guardRefusal(t, l.way);
      const p = piratesOn(s, l.way);
      const tip = no || `She rows out of the bay and along the lane to ${cityName(l.city)}, and keeps watch ${l.name}: what of yours passes there is safe${p ? `; she fights the ${p.ships === 1 ? (p.of ? 'warship' : 'pirate ship') : `${p.ships} ${p.of ? 'warships' : 'pirate ships'}`} there` : ''}`;
      return kbtn({ act: 'guard', data: { id: t.id, lane: l.way }, icon: 'guard', html: `${esc(cityName(l.city))}${p ? ` <small>(${p.of ? 'warships' : 'pirates'})</small>` : ''}`, tip, why: no, small: true });
    }).join('');
  const row = (t: (typeof ts)[number]): string => {
    const why = crewWhy(s, map, t);
    // (Slice 38: her oars too, and her repair.)
    const days = daysToMend(s, t);
    const mend = t.state === 'building' ? '' : t.mend ? ` <span class="warn">(under repair${days > 0 ? `: whole in ${days} ${days === 1 ? 'day' : 'days'}` : ''})</span>` : t.hp < FIT || t.oars < FIT ? ' <span class="warn">(mending before she goes out)</span>' : '';
    const bars = t.state === 'building' ? '' : `<div class="k-meters"><span>Hull</span>${kbar({ value: t.hp, max: 100, tone: t.hp < FIT ? 'danger' : 'good', html: `${Math.round(t.hp)}%` })}<span>Oars</span>${kbar({ value: t.oars, max: 100, tone: t.oars < FIT ? 'danger' : 'good', html: `${Math.round(t.oars)}%` })}</div>`;
    const pay = t.crew.length ? ` · ${fmt(t.crew.length * ROWER_PAY)} dr a month` : '';
    const owed = t.owed > 0 ? ` · <span class="warn">${fmt(t.owed)} dr pay owed</span>` : '';
    // (Sailing home already, or carrying your soldiers on an expedition (she comes home with them): no button. Review of slice 26.)
    // (Slice 29: rowing home to her mooring, too: the lanes' buttons come back once she is moored.)
    const acts = t.state === 'building' || t.order === 'away' || (t.state === 'away' && t.order === 'bay') || (t.state === 'rowing' && t.order === 'bay' && (t.task === 'home' || t.task === 'in')) ? '' : t.order === 'lane' || t.state === 'away' || (t.state === 'rowing' && t.task === 'out') ? `<div class="k-acts k-row">${kbtn({ act: 'trihome', data: { id: t.id }, icon: 'home', html: 'Bring her home', small: true, tip: 'Back along the lane, into the bay and to her mooring' })}</div>` : lanes(t) ? `<div class="k-acts k-lanes k-row">${lanes(t)}</div>` : '';
    const n = t.state === 'building' ? '' : `<span class="n">${t.crew.length}<small> / ${CREW}</small></span>`;
    const crew = t.state === 'building' ? '' : kpips(Array.from({ length: CREW }, (_, k) => (k < t.crew.length ? 'ready' : 'empty')), `${t.crew.length} of ${CREW} rowers`, 'big');
    return `<li class="k-card k-co trireme"><div class="k-cotop"><div class="k-niche">${TRIREME_FIGURE}</div><div class="k-coname"><div class="pick"><b>The ${esc(triremeName(t))}</b></div><p>${esc(triremeDoing(s, t))}${mend}${pay}${owed}</p></div></div>${crew || n ? `<div class="k-corow">${crew}${n}</div>` : ''}${bars}${why ? `<p class="why">${esc(why)}</p>` : ''}${acts}</li>`;
  };
  yards.forEach((b, i) => {
    const [cx, cz] = centreOf(b);
    const title = yards.length === 1 ? 'The shipyard' : `The ${['first', 'second', 'third', 'fourth'][i] ?? `${i + 1}th`} shipyard`;
    const at = triremesAt(s, b.id).filter(afloat);
    out.push(`<section class="barracks shipyard${b.id === focus ? ' focus' : ''}" data-barracks="${b.id}">`);
    out.push(`<h3 class="k-h k-bh"><span class="k-hic">${buildingIcon('shipyard')}</span><span class="k-ht"><button class="link" data-act="go" data-x="${cx}" data-z="${cz}" title="Go there">${esc(title)}</button> <small>${esc(lower(districtTitle(districtAt(map, cx, cz))))} · ${b.workers} of ${jobsAt(b)} shipwrights</small></span></h3>`);
    if (b.workers === 0) out.push('<p class="side-note warn">It has no shipwrights yet: nothing is built or mended, and no rowers are taken on.</p>');
    if (!at.length) out.push('<p class="side-note">No triremes yet.</p>');
    else out.push(`<ul class="companies">${at.map(row).join('')}</ul>`);
    const no = orderRefusal(s, b);
    const short = no ? '' : rowersWarning(s);
    out.push(
      `<div class="k-recruit"><div class="k-raise">${kbtn({ act: 'trireme', data: { id: b.id }, icon: TRIREME_FIGURE, html: `Build a trireme <small>${TRIREME_COST} dr</small>`, tip: `Built on the slip in about a month while the yard is staffed, then ${CREW} rowers come from the huts and cottages, one a home, at ${ROWER_PAY} dr a man a month${short ? `. ${short}` : ''}`, why: no, cls: 'k-wide' })}${kwhy(no, true)}</div></div>`,
    );
    if (short) out.push(`<p class="side-note warn">${esc(short)}.</p>`);
    out.push(`<p class="side-note">${at.length} of ${PER_YARD} moorings used. Triremes at home, crewed and sound, row out to meet enemy ships in the bay.</p>`);
    out.push('</section>');
  });
  // Triremes whose yard is gone.
  const lost = ts.filter((t) => !yards.some((b) => b.id === t.yard));
  if (lost.length) out.push(`<section class="barracks"><h3>Without a yard</h3><ul class="companies">${lost.map(row).join('')}</ul></section>`);
  // The lanes.
  const lines: string[] = [];
  for (const l of LANES) {
    const p = piratesOn(s, l.way);
    if (!p) continue;
    const g = ts.filter((t) => t.order === 'lane' && t.lane === l.way);
    const when = p.state === 'seen' ? `they start seizing what of yours passes there in ${Math.max(1, Math.ceil((p.from - s.tick) / TICKS_PER_DAY))} days` : `seizing what of yours passes there${p.took.length ? ` (${p.took.length} taken so far)` : ''}`;
    lines.push(`<li class="warn-line">${esc(`${bandWords(p)} ${p.place}, on the lane to ${cityName(p.city)}${p.of ? ` (${warWords(s, p)})` : ''}: ${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}; ${when}${g.length ? `. The ${triremeName(g[0])} ${g[0].state === 'away' && triremeOnStation(s, g[0]) ? 'guards it' : 'is on her way to guard it'}` : ''}`)}.</li>`);
  }
  const reps = f.reports.filter((r) => r.tick <= s.tick).slice(-3).reverse();
  for (const r of reps) lines.push(`<li><small>${esc(agoWords(s.tick - r.tick))}</small> ${esc(r.line)}.</li>`);
  if (lines.length) out.push(`<ul class="army-news">${lines.join('')}</ul>`);
}

const triremeOnStation = (s: SimState, t: { state: string; start: number; dur: number; homeward: boolean }): boolean => !t.homeward && s.tick >= t.start + t.dur;
