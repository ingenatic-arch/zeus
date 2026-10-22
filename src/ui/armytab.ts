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
import { canSpare, companiesAt, COMPANY_SIZE, doingWords, HIRED_PAY, hireRefusal, HIRELINGS, menOf, payOf, PER_BARRACKS, servingHomes, strength, woundedOf, type HiredKind } from '../sim/army';
// Slice 36.
import { HORSE_COMPANY } from '../sim/army';
import { ESTATE } from '../sim/buildings';
import { companyWords } from '../sim/battle';
import { TICKS_PER_DAY } from '../sim/clock';
import { expeditionOf } from '../sim/expeditions';
import { centreOf, jobsAt } from '../sim/buildings';
import { ARMOUR, held } from '../sim/foods';
import type { Company, SimState } from '../sim/state';
import { SOLDIER_PAY } from '../sim/treasury';
import { afloat, CREW, crewWhy, FIT, guardRefusal, LANES, orderRefusal, PER_YARD, piratesOn, ROWER_PAY, rowersWarning, triremeDoing, triremeName, triremesAt, TRIREME_COST } from '../sim/fleet';
import { PLACES } from '../map/greece';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.round(Math.abs(n)).toLocaleString('en-GB');
const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const lower = (t: string): string => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : t);

/** "today", "3 days ago". */
function agoWords(ticks: number): string {
  const d = Math.floor(ticks / TICKS_PER_DAY);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
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

/** The Army tab's HTML. `focus`: a barracks picked out (clicked in the city); `selected`: the company whose banner is in hand. */
export function armyHtml(s: SimState, map: CoastMap, focus: number, selected: number): string {
  const out: string[] = [];
  const barracks = s.buildings.filter((b) => b.kind === 'barracks');
  const st = strength(s);
  if (st.companies === 0 && barracks.length === 0) {
    out.push('<div class="bigline"><span class="big">0</span><span>soldiers</span></div>');
    out.push(
      `<p class="side-note">The city has no army yet. Build a barracks (B ×4) beside a road, then raise companies there: hoplites from the fine houses and villas, archers from the townhouses and better. Hoplites each need a set of armour: a copper mine on the green-streaked rock in the hills (B B) and an armoury (B ×3) make it, or Corinth and Athens sell it. In a pinch a barracks can hire a company of Cretan archers or Arcadian hoplites, for a fee and three times the pay.</p>`,
    );
    fleetHtml(s, map, focus, out);
    return out.join('');
  }
  out.push(`<div class="bigline"><span class="big">${fmt(st.men)}</span><span>${st.men === 1 ? 'soldier' : 'soldiers'} in ${st.companies} ${st.companies === 1 ? 'company' : 'companies'}</span></div>`);
  out.push(
    // (Your own men by kind, and hirelings once, so the three add up to the whole; a kind with none is left out when there are hirelings.)
    `<dl class="sums">${st.hoplites || !st.hirelings ? `<div><dt>Hoplites</dt><dd>${fmt(st.hoplites)}</dd></div>` : ''}${st.archers || !st.hirelings ? `<div><dt>Archers</dt><dd>${fmt(st.archers)}</dd></div>` : ''}${st.horsemen ? `<div><dt>Horsemen</dt><dd>${fmt(st.horsemen)}</dd></div>` : ''}${st.hirelings ? `<div><dt>Hirelings</dt><dd>${fmt(st.hirelings)}</dd></div>` : ''}${st.wounded ? `<div><dt>Wounded</dt><dd>${fmt(st.wounded)}</dd></div>` : ''}<div><dt>Pay a month</dt><dd>${fmt(st.pay)}<small> dr</small></dd></div></dl>`,
  );
  // The army's news: the last few things that happened to it.
  const news = s.army.news.filter((n) => n.tick <= s.tick).slice(-4).reverse();
  if (news.length) out.push(`<ul class="army-news">${news.map((n) => `<li><small>${esc(agoWords(s.tick - n.tick))}</small> ${esc(n.line)}.</li>`).join('')}</ul>`);
  if (st.companies > 0) out.push('<p class="side-note">Click a company (or its banner in the city) to take its banner in hand, then click a street or open ground to march it there; the view stays where you are looking, and the company’s place on its row takes you to it. Esc lets go. Orders work while paused.</p>');
  const serving = servingHomes(s);
  const homes = s.buildings.filter((b) => b.kind === 'home');
  const spare = { hoplite: homes.filter((b) => canSpare(s, b, 'hoplite', serving)).length, archer: homes.filter((b) => canSpare(s, b, 'archer', serving)).length, horseman: homes.filter((b) => canSpare(s, b, 'horseman', serving)).length };
  // Slice 36: the estates that could send a rider (any estate at all: the button shows only then).
  const estates = homes.filter((b) => b.estate && b.level >= ESTATE && b.people > 0).length;
  const armour = s.buildings.reduce((a, b) => a + (b.kind === 'storehouse' ? held(b, ARMOUR) : 0), 0);
  barracks.forEach((b, i) => {
    const cs = companiesAt(s, b);
    const [cx, cz] = centreOf(b);
    const title = barracks.length === 1 ? 'The barracks' : `The ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i] ?? `${i + 1}th`} barracks`;
    out.push(`<section class="barracks${b.id === focus ? ' focus' : ''}" data-barracks="${b.id}">`);
    out.push(`<h3><button class="link" data-act="go" data-x="${cx}" data-z="${cz}">${esc(title)}</button> <small>${esc(lower(districtTitle(districtAt(map, cx, cz))))} · ${b.workers} of ${jobsAt(b)} staff</small></h3>`);
    if (b.workers === 0) out.push('<p class="side-note warn">It has no staff yet: nobody takes the men in until it has workers.</p>');
    if (cs.length === 0) out.push('<p class="side-note">No companies yet.</p>');
    out.push('<ul class="companies">');
    for (const c of cs) {
      const men = menOf(s, c).length;
      const hurt = woundedOf(s, c).length;
      const where = whereWords(s, map, c);
      const sel = c.id === selected;
      const dismiss = c.hired ? 'They walk off the way they came; what they were owed is still paid' : 'The men walk home to their old work; their armour goes back to the stores';
      out.push(
        `<li class="company${sel ? ' on' : ''}${c.hired ? ` hired ${c.hired}` : ''}"><button class="pick" data-act="company" data-id="${c.id}" title="${c.away ? 'Away on an expedition: it takes orders again once it is home' : sel ? 'Its banner is in hand: click a street or open ground to march it there' : 'Take its banner in hand, to march it'}"${c.away ? ' disabled' : ''}><b>${esc(cap(companyWords(c)))}</b><span class="n">${men}<small> / ${c.want}</small></span></button>` +
          `<p>${esc(cap(doingWords(s, c)))}${where ? ` · ${c.away ? esc(where) : `<button class="link" data-act="go" data-x="${c.x.toFixed(1)}" data-z="${c.z.toFixed(1)}" title="Go there">${esc(where)}</button>`}` : ''} · ${hurt ? `<span class="warn">${hurt} wounded</span>` : 'none wounded'} · ${fmt(men * payOf(c))} dr a month${c.owed > 0 ? ` · <span class="warn">${fmt(c.owed)} dr pay owed</span>` : ''}</p>` +
          (c.why ? `<p class="why">${esc(c.why)}</p>` : '') +
          (c.away ? '</li>' : `<div class="acts">${c.order === 'drill' ? '' : `<button data-act="recall" data-id="${c.id}">Back to barracks</button>`}<button data-act="dismiss" data-id="${c.id}" title="${dismiss}">Dismiss</button></div></li>`),
      );
    }
    out.push('</ul>');
    if (cs.length < PER_BARRACKS) {
      out.push(
        `<div class="raise"><button data-act="raise" data-id="${b.id}" data-kind="hoplite" title="Sixteen men from the fine houses and villas, one a home, each with a set of armour from the stores">Raise a company of hoplites</button><button data-act="raise" data-id="${b.id}" data-kind="archer" title="Sixteen men from the townhouses and better, one a home; they need no armour">Raise a company of archers</button>${estates ? `<button data-act="raise" data-id="${b.id}" data-kind="horseman" title="${HORSE_COMPANY} riders, a son from each estate, mounted and armed from their own stables: fast, good against archers and against a band on the run, weak against a line of hoplites">Raise a company of horsemen</button>` : ''}</div>`,
      );
      out.push(
        `<p class="side-note">Room for ${PER_BARRACKS - cs.length} more. Homes that could send a man now: ${spare.hoplite} for hoplites, ${spare.archer} for archers${estates ? `, ${spare.horseman} ${spare.horseman === 1 ? 'estate' : 'estates'} a rider` : ''} · ${fmt(armour)} ${armour === 1 ? 'set' : 'sets'} of armour in the storehouses · ${SOLDIER_PAY} dr a man a month.</p>`,
      );
      // Hirelings: a company in a few days, for a price.
      const hire = (Object.keys(HIRELINGS) as HiredKind[]).map((k) => {
        const h = HIRELINGS[k];
        const no = hireRefusal(s, b, k);
        const tip = no || `Sixteen ${h.name} for ${h.fee} dr now and ${HIRED_PAY} dr a man a month (${fmt(COMPANY_SIZE * HIRED_PAY)} dr a month): they march in from the edge of your land, armed, and take nobody from your homes. Unpaid a month, they walk off`;
        return `<button data-act="hire" data-id="${b.id}" data-kind="${k}" title="${esc(tip)}"${no ? ' disabled' : ''}>Hire ${esc(h.name)} <small>${h.fee} dr</small></button>`;
      });
      out.push(`<div class="raise hire">${hire.join('')}</div>`);
    } else out.push(`<p class="side-note">Full: a barracks holds ${PER_BARRACKS} companies. Build another for more.</p>`);
    out.push('</section>');
  });
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
  out.push('<h3 class="fleet-head">The fleet</h3>');
  out.push(`<dl class="sums"><div><dt>Triremes</dt><dd>${fmt(ts.filter((t) => t.state !== 'building').length)}</dd></div><div><dt>Rowers</dt><dd>${fmt(rowers)}</dd></div><div><dt>Pay a month</dt><dd>${fmt(rowers * ROWER_PAY)}<small> dr</small></dd></div></dl>`);
  const lanes = (t: (typeof ts)[number]): string =>
    LANES.map((l) => {
      const no = guardRefusal(t, l.way);
      const p = piratesOn(s, l.way);
      const tip = no || `She rows out of the bay and along the lane to ${cityName(l.city)}, and keeps watch ${l.name}: what of yours passes there is safe${p ? `; she fights the ${p.ships === 1 ? 'pirate ship' : `${p.ships} pirate ships`} there` : ''}`;
      return `<button data-act="guard" data-id="${t.id}" data-lane="${l.way}" title="${esc(tip)}"${no ? ' disabled' : ''}>${esc(cityName(l.city))}${p ? ' <small>(pirates)</small>' : ''}</button>`;
    }).join('');
  const row = (t: (typeof ts)[number]): string => {
    const why = crewWhy(s, map, t);
    const hull = t.state === 'building' ? '' : ` · hull ${Math.round(t.hp)}%${t.hp < FIT ? ' <span class="warn">(mending before she goes out)</span>' : ''}`;
    const pay = t.crew.length ? ` · ${fmt(t.crew.length * ROWER_PAY)} dr a month` : '';
    const owed = t.owed > 0 ? ` · <span class="warn">${fmt(t.owed)} dr pay owed</span>` : '';
    // (Sailing home already, or carrying your soldiers on an expedition (she comes home with them): no button. Review of slice 26.)
    // (Slice 29: rowing home to her mooring, too: the lanes' buttons come back once she is moored.)
    const acts = t.state === 'building' || t.order === 'away' || (t.state === 'away' && t.order === 'bay') || (t.state === 'rowing' && t.order === 'bay' && (t.task === 'home' || t.task === 'in')) ? '' : t.order === 'lane' || t.state === 'away' || (t.state === 'rowing' && t.task === 'out') ? `<div class="acts"><button data-act="trihome" data-id="${t.id}" title="Back along the lane, into the bay and to her mooring">Bring her home</button></div>` : `<div class="acts lanes">${lanes(t)}</div>`;
    const n = t.state === 'building' ? '' : `<span class="n">${t.crew.length}<small> / ${CREW}</small></span>`;
    return `<li class="company trireme"><div class="pick"><b>The ${esc(triremeName(t))}</b>${n}</div><p>${esc(triremeDoing(s, t))}${hull}${pay}${owed}</p>${why ? `<p class="why">${esc(why)}</p>` : ''}${acts}</li>`;
  };
  yards.forEach((b, i) => {
    const [cx, cz] = centreOf(b);
    const title = yards.length === 1 ? 'The shipyard' : `The ${['first', 'second', 'third', 'fourth'][i] ?? `${i + 1}th`} shipyard`;
    const at = triremesAt(s, b.id).filter(afloat);
    out.push(`<section class="barracks shipyard${b.id === focus ? ' focus' : ''}" data-barracks="${b.id}">`);
    out.push(`<h3><button class="link" data-act="go" data-x="${cx}" data-z="${cz}">${esc(title)}</button> <small>${esc(lower(districtTitle(districtAt(map, cx, cz))))} · ${b.workers} of ${jobsAt(b)} shipwrights</small></h3>`);
    if (b.workers === 0) out.push('<p class="side-note warn">It has no shipwrights yet: nothing is built or mended, and no rowers are taken on.</p>');
    if (!at.length) out.push('<p class="side-note">No triremes yet.</p>');
    else out.push(`<ul class="companies">${at.map(row).join('')}</ul>`);
    const no = orderRefusal(s, b);
    const short = no ? '' : rowersWarning(s);
    out.push(
      `<div class="raise"><button data-act="trireme" data-id="${b.id}" title="${esc(no || `Built on the slip in about a month while the yard is staffed, then ${CREW} rowers come from the huts and cottages, one a home, at ${ROWER_PAY} dr a man a month${short ? `. ${short}` : ''}`)}"${no ? ' disabled' : ''}>Build a trireme <small>${TRIREME_COST} dr</small></button></div>`,
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
    lines.push(`<li class="warn-line">${esc(`Pirates ${p.place}, on the lane to ${cityName(p.city)}: ${p.ships} ${p.ships === 1 ? 'ship' : 'ships'}; ${when}${g.length ? `. The ${triremeName(g[0])} ${g[0].state === 'away' && triremeOnStation(s, g[0]) ? 'guards it' : 'is on her way to guard it'}` : ''}`)}.</li>`);
  }
  const reps = f.reports.filter((r) => r.tick <= s.tick).slice(-3).reverse();
  for (const r of reps) lines.push(`<li><small>${esc(agoWords(s.tick - r.tick))}</small> ${esc(r.line)}.</li>`);
  if (lines.length) out.push(`<ul class="army-news">${lines.join('')}</ul>`);
}

const triremeOnStation = (s: SimState, t: { state: string; start: number; dur: number; homeward: boolean }): boolean => !t.homeward && s.tick >= t.start + t.dur;
