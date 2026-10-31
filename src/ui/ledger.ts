/**
 * The ledger: a parchment card saying where the treasury's drachmas came
 * from and went, this month so far and last month side by side. Coming in:
 * taxes by district (with the homes that paid), building undone. Going out:
 * wages by kind of workplace (with the workers paid), building by what was
 * built. Then each month's net and what it started with, and notes: how many
 * homes the collectors reached, the rate, the wage, and any wages owed or
 * money kept back for a tax office. Opened by clicking the drachmas, a money
 * line under the top bar, or $. It only reads the sim state.
 */
import type { CoastMap } from '../map/bake';
import { districtAt, DISTRICTS } from '../map/districts';
import { centreOf, sideOf } from '../sim/buildings';
import { clearFee, COST, ESTATE_PLOT_COST } from '../sim/build';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../sim/clock';
import type { BuildingKind, LedgerKind, LedgerLine, SimState } from '../sim/state';
import { monthlyTaxes } from '../sim/status';
import { TAX_RATES, taxedLately } from '../sim/taxes';
import { hasTaxOffice, kindTotal, monthOf, owedWages, reserve, totals, WAGE, wageBill } from '../sim/treasury';
import { morph } from './morph';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.abs(n).toLocaleString('en-GB');
const signed = (n: number): string => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(n)}` : '0');

/** What the workplaces and buildings are called, many of them. */
const PLURAL: Record<BuildingKind, string> = {
  home: 'homes',
  fountain: 'fountains',
  farm: 'farms',
  granary: 'granaries',
  agora: 'agoras',
  shrine: 'shrines',
  theatre: 'theatres',
  taxoffice: 'tax offices',
  lodge: 'hunting lodges',
  dairy: 'dairies',
  grove: 'olive groves',
  press: 'olive presses',
  storehouse: 'storehouses',
  pasture: 'sheep pastures',
  vineyard: 'vineyards',
  winery: 'wineries',
  watchpost: 'watch posts',
  architect: 'architects’ offices',
  rubble: 'heaps of rubble',
  trading: 'trading posts',
  yard: 'caravan yards',
  mine: 'copper mines',
  armoury: 'armouries',
  barracks: 'barracks',
  tower: 'towers',
  shipyard: 'shipyards',
  quarry: 'marble quarries',
  loggers: 'loggers’ camps',
  masons: 'masons’ yards',
  lighthouse: 'the Lighthouse',
  colossus: 'the Colossus',
  stadium: 'the Stadium',
  // Slice 36.
  horsefarm: 'horse farms',
  // Slice 45.
  court: 'courts',
  prison: 'prisons',
  // Slice 49.
  infirmary: 'infirmaries',
  asklepieion: 'asklepieia',
  // Slice 54.
  sanctuary: 'sanctuaries',
};

const count = (n: number, one: string, many: string): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** A ledger line's label, and the count beside it. */
function label(l: { kind: LedgerKind; what: string }, n: number): [string, string] {
  if (l.kind === 'taxes') return [`Taxes ${l.what}`, n ? count(n, 'home', 'homes') : ''];
  if (l.kind === 'sales') return [`Sales · ${l.what}`, ''];
  if (l.kind === 'refund') return ['Building undone', ''];
  if (l.kind === 'imports') return [`Bought · ${l.what}`, ''];
  if (l.kind === 'routes') return [`Trade route · ${l.what}`, ''];
  if (l.kind === 'gifts') return [`Gift · ${l.what}`, ''];
  if (l.kind === 'given') return [`Gift · ${l.what}`, ''];
  if (l.kind === 'favours') return [`Sent · ${l.what}, as they asked`, ''];
  if (l.kind === 'tribute') return [`Tribute · ${l.what}`, ''];
  if (l.kind === 'peace') return [`Peace bought · ${l.what}`, ''];
  if (l.kind === 'raid') return [`Raided by ${l.what}`, ''];
  // (Slice 28: goods and coin a lender seized against your debt, by the measure; and what your soldiers brought home.)
  if (l.kind === 'seized') return [`Seized by ${l.what}`, /drachmas$/.test(l.what) ? '' : 'measures'];
  if (l.kind === 'collected') return [`Brought home by your soldiers · ${l.what.replace(/^from /, '')}`, ''];
  if (l.kind === 'borrowed') return [`Loan · ${l.what}`, ''];
  if (l.kind === 'repayment') return [`Loan repaid · ${l.what}`, ''];
  if (l.kind === 'returned') return [`Loan sent back · ${l.what}`, ''];
  if (l.kind === 'lent') return [`Lent · ${l.what}`, ''];
  if (l.kind === 'repaid') return [`Loan repaid · ${l.what}`, ''];
  if (l.kind === 'soldiers') return ['Soldiers’ pay', n ? count(n, 'man', 'men') : ''];
  if (l.kind === 'rowers') return ['Rowers’ pay', n ? count(n, 'man', 'men') : ''];
  if (l.what === 'trireme') return ['Triremes', n > 1 ? String(n) : ''];
  if (l.kind === 'hirelings') return l.what === 'pay' ? ['Hirelings’ pay', n ? count(n, 'man', 'men') : ''] : [`Hired · ${l.what}`, ''];
  if (l.kind === 'recovered') return [`Taken back ${l.what}`, ''];
  // Slice 30: thieves.
  if (l.kind === 'stolen') return [`Stolen · ${l.what}`, n > 1 ? count(n, 'theft', 'thefts') : ''];
  // (Slice 41: the fines for each kind of criminal caught, "pickpockets caught", counted as such.)
  if (l.kind === 'fines') {
    const one = /^(pickpocket|vandal|arsonist|smuggler)s caught$/.exec(l.what)?.[1];
    return [`Fines · ${l.what}`, n ? count(n, one ?? 'thief', one ? `${one}s` : 'thieves') : ''];
  }
  // Slice 41: what a vandal smashed, mended; and what a crooked tax collector kept back.
  if (l.kind === 'repairs') return [`Repairs · ${PLURAL[l.what as BuildingKind] ?? l.what}`, n ? count(n, 'repair', 'repairs') : ''];
  if (l.kind === 'skimmed') return [`Skimmed ${l.what}`, n > 1 ? count(n, 'time', 'times') : ''];
  // Slice 34: a vassal's tribute in coin.
  if (l.kind === 'vassals') return [`Tribute from ${l.what}, your vassal`, n > 1 ? count(n, 'caravan', 'caravans') : ''];
  // Slice 37: founding a colony.
  if (l.kind === 'colonies') return [l.what, ''];
  // Slice 47: your share of a colony's (or free ally's) trade, in coin with its ships.
  if (l.kind === 'colonytrade') return [`Colonies’ trade · ${l.what.replace(/^from /, '')}`, n > 1 ? count(n, 'ship', 'ships') : ''];
  // Slice 53: a festival to a god.
  if (l.kind === 'worship') return [l.what.replace(/^./, (c) => c.toUpperCase()), n > 1 ? count(n, 'festival', 'festivals') : ''];
  if (l.kind === 'wages') return [`Wages · ${PLURAL[l.what as BuildingKind] ?? l.what}`, n ? count(n, 'worker', 'workers') : ''];
  if (l.kind === 'clearing') return [`Clearing rubble · ${PLURAL[l.what as BuildingKind] ?? l.what}`, n ? count(n, 'heap', 'heaps') : ''];
  if (l.kind === 'fire') return [`Burnt down · ${PLURAL[l.what as BuildingKind] ?? l.what}`, ''];
  if (l.kind === 'collapse') return [`Fell down · ${PLURAL[l.what as BuildingKind] ?? l.what}`, ''];
  if (l.what === 'road') return ['Roads', count(n, 'tile', 'tiles')];
  if (l.what === 'bridge') return ['Bridges', count(n, 'tile', 'tiles')];
  if (l.what === 'wall') return ['Walls', count(n, 'stretch', 'stretches')];
  if (l.what === 'gate') return ['Gates', count(n, 'gate', 'gates')];
  if (l.what === 'mended') return ['Walls mended', count(n, 'stretch', 'stretches')];
  if (l.what === 'plots') return ['Housing plots', count(n, 'plot', 'plots')];
  // Slice 36.
  if (l.what === 'estates') return ['Estates’ plots', count(n, 'plot', 'plots')];
  const k = l.what as BuildingKind;
  return [`${(PLURAL[k] ?? l.what).replace(/^./, (c) => c.toUpperCase())}`, n > 1 ? String(n) : ''];
}

/** The order the kinds come in, money in first. */
const ORDER: LedgerKind[] = ['taxes', 'sales', 'given', 'recovered', 'collected', 'borrowed', 'repayment', 'returned', 'refund', 'wages', 'soldiers', 'hirelings', 'rowers', 'building', 'clearing', 'imports', 'routes', 'gifts', 'favours', 'tribute', 'peace', 'lent', 'repaid', 'raid', 'seized', 'fire', 'collapse'];
// Slice 30: fines come in after what was taken back; what thieves stole goes last, under a head of its own.
ORDER.splice(ORDER.indexOf('recovered') + 1, 0, 'fines');
ORDER.push('stolen');
// Slice 34: tribute from vassals comes in after what your soldiers brought home.
ORDER.splice(ORDER.indexOf('collected') + 1, 0, 'vassals');
// Slice 37: fitting out a colony goes out after gifts and favours.
ORDER.splice(ORDER.indexOf('favours') + 1, 0, 'colonies');
// Slice 41: repairs go out after clearing rubble; what the tax collector skimmed is lost to thieves, after what they stole.
ORDER.splice(ORDER.indexOf('clearing') + 1, 0, 'repairs');
ORDER.push('skimmed');
// Slice 47: your share of the colonies' trade comes in after the vassals' tribute.
ORDER.splice(ORDER.indexOf('vassals') + 1, 0, 'colonytrade');
// Slice 53: festivals to the gods go out after the colonies.
ORDER.splice(ORDER.indexOf('colonies') + 1, 0, 'worship');

interface Row {
  kind: LedgerKind;
  what: string;
  now: LedgerLine | undefined;
  last: LedgerLine | undefined;
}

/** This month's and last month's lines, matched up by kind and what. */
function rowsOf(now: readonly LedgerLine[], last: readonly LedgerLine[]): Row[] {
  const rows = new Map<string, Row>();
  for (const [lines, key] of [[now, 'now'], [last, 'last']] as const) {
    for (const l of lines) {
      const id = `${l.kind}:${l.what}`;
      let r = rows.get(id);
      if (!r) rows.set(id, (r = { kind: l.kind, what: l.what, now: undefined, last: undefined }));
      r[key] = l;
    }
  }
  const size = (r: Row): number => Math.abs(r.now?.amount ?? 0) + Math.abs(r.last?.amount ?? 0);
  return [...rows.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || size(b) - size(a) || a.what.localeCompare(b.what));
}

const cell = (l: LedgerLine | undefined): string => {
  if (!l) return '<td class="amt nil">·</td>';
  // What fire and collapse took: how many buildings (they cost no coin until they are cleared and built again).
  // (Drachmas raiders took from the treasury are money, and show as money.)
  if (l.kind === 'fire' || l.kind === 'collapse' || l.kind === 'seized' || (l.kind === 'raid' && l.amount === 0)) return `<td class="amt lost">${l.n.toLocaleString('en-GB')}</td>`;
  return `<td class="amt ${l.amount > 0 ? 'in' : l.amount < 0 ? 'out' : ''}">${signed(l.amount)}</td>`;
};

/** The card's inner HTML. */
export function ledgerHtml(s: SimState, map: CoastMap): string {
  const l = s.ledger;
  const m = monthOf(s.tick);
  // The ledger turns its month on the next payment: until then, this month is empty and last month is what it holds.
  const current = l.month === m;
  const now = current ? l.now : [];
  const last = current ? l.last : l.month === m - 1 ? l.now : [];
  const startNow = current ? l.start : s.money;
  const startLast = current ? l.lastStart : l.month === m - 1 ? l.start : s.money;
  const day = Math.floor((s.tick % TICKS_PER_MONTH) / TICKS_PER_DAY) + 1;
  const rows = rowsOf(now, last);
  const body: string[] = [];
  let heading = '';
  for (const r of rows) {
    const head = r.kind === 'stolen' || r.kind === 'skimmed' ? 'Lost to thieves' : r.kind === 'raid' ? 'Lost to raiders' : r.kind === 'seized' ? 'Seized against your debts' : r.kind === 'fire' || r.kind === 'collapse' ? 'Lost to fire and collapse' : r.kind === 'wages' || r.kind === 'soldiers' || r.kind === 'hirelings' || r.kind === 'rowers' || r.kind === 'building' || r.kind === 'clearing' || r.kind === 'repairs' || r.kind === 'imports' || r.kind === 'routes' || r.kind === 'gifts' || r.kind === 'favours' || r.kind === 'tribute' || r.kind === 'peace' || r.kind === 'lent' || r.kind === 'repaid' || r.kind === 'colonies' ? 'Going out' : 'Coming in';
    if (head !== heading) {
      heading = head;
      body.push(`<tr class="head"><th colspan="3">${head}</th></tr>`);
    }
    const [name, n] = label(r, r.now?.n ?? r.last?.n ?? 0);
    // The count is this month's where there is one, else last month's.
    body.push(`<tr><td class="what">${esc(name)}${n ? ` <small>${esc(n)}</small>` : ''}</td>${cell(r.now)}${cell(r.last)}</tr>`);
  }
  if (rows.length === 0) body.push('<tr><td class="what none" colspan="3">Nothing has come in or gone out yet</td></tr>');
  const tn = totals(now);
  const tl = totals(last);
  const net = (n: number): string => `<td class="amt ${n > 0 ? 'in' : n < 0 ? 'out' : ''}">${signed(n)}</td>`;
  body.push(`<tr class="total"><td class="what">Net</td>${net(tn.net)}${net(tl.net)}</tr>`);
  body.push(`<tr class="start"><td class="what">At the start of the month</td><td class="amt">${fmt(startNow)}</td><td class="amt">${fmt(startLast)}</td></tr>`);

  const notes: string[] = [];
  const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.level > 0);
  const offices = s.buildings.filter((b) => b.kind === 'taxoffice').length;
  if (!hasTaxOffice(s)) {
    notes.push(`<li class="bad">No tax office, so no taxes come in. The treasury keeps back ${fmt(reserve(s))} dr so one can always be built (Z).</li>`);
  } else if (homes.length) {
    const missed = homes.filter((b) => !taxedLately(s, b));
    const paid = homes.length - missed.length;
    let text = `In the last month the ${offices === 1 ? 'tax collector' : `${offices} tax collectors`} called on ${count(paid, 'home', 'homes')} of ${homes.length.toLocaleString('en-GB')}.`;
    if (missed.length) {
      const by = new Map<number, number>();
      for (const b of missed) {
        const [cx, cz] = centreOf(b);
        const d = districtAt(map, cx, cz);
        by.set(d, (by.get(d) ?? 0) + 1);
      }
      const parts = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, k]) => `${k} ${DISTRICTS[d]?.where ?? 'elsewhere'}`);
      text += ` Not yet: ${parts.join(', ')}${by.size > 3 ? ' and elsewhere' : ''} (the tax overlay, J, shows where ${offices === 1 ? 'he walks' : 'they walk'}).`;
    }
    notes.push(`<li>${esc(text)}</li>`);
  }
  const paid = hasTaxOffice(s) ? `: over the last month the homes paid the collectors about ${fmt(monthlyTaxes(s))} dr` : '';
  notes.push(`<li>Taxes are <b>${TAX_RATES[s.taxRate]}</b>${paid}. Each worker is paid ${WAGE} dr on the first of the month: about ${fmt(wageBill(s))} dr a month as the workplaces are staffed now.</li>`);
  const owed = owedWages(s);
  if (owed.owed > 0) notes.push(`<li class="bad">The treasury owes ${fmt(owed.owed)} dr of this month’s wages at ${count(owed.places, 'workplace', 'workplaces')}, so they work at half pace. Money coming in pays them first.</li>`);
  const lost = (lines: readonly LedgerLine[]): LedgerLine[] => lines.filter((x) => x.kind === 'fire' || x.kind === 'collapse');
  const thisMonth = lost(now).length > 0;
  const gone = thisMonth ? lost(now) : lost(last);
  if (gone.length) {
    const n = gone.reduce((a, x) => a + x.n, 0);
    // (Slice 40: an estate's 4 × 4 rubble, not a home's 2 × 2.)
    const est = (x: LedgerLine): boolean => x.what === 'estates';
    const worth = gone.reduce((a, x) => a + x.n * (est(x) ? ESTATE_PLOT_COST : (COST[x.what as BuildingKind] ?? 0)), 0);
    const clearing = gone.reduce((a, x) => a + x.n * clearFee(est(x) ? 4 : sideOf(x.what as BuildingKind)), 0);
    notes.push(
      `<li class="bad">${esc(`${thisMonth ? 'This month' : 'Last month'} fire and collapse took ${count(n, 'building', 'buildings')}: about ${fmt(clearing)} dr to clear the rubble, and ${fmt(worth)} dr to build ${n === 1 ? 'it' : 'them'} again.`)}</li>`,
    );
  }
  const taxesNow = kindTotal(now, 'taxes');
  return `<button class="close" title="Close (Esc)" aria-label="Close">×</button>
<h2>The treasury · ${fmt(s.money)} dr</h2>
<table class="book"><thead><tr><th></th><th>This month<small>${day === 1 && taxesNow === 0 ? 'just begun' : `so far, ${count(day, 'day', 'days')}`}</small></th><th>Last month<small>&nbsp;</small></th></tr></thead><tbody>${body.join('')}</tbody></table>
<ul class="notes">${notes.join('')}</ul>`;
}

/** How often (seconds) the open card is brought up to date. */
const REFRESH = 0.4;

export class LedgerCard {
  private readonly el: HTMLElement;
  private html = '';
  private last = -Infinity;
  /** Called when the card opens (so the other cards in the corner can close). */
  onOpen: () => void = () => {};

  constructor(root: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'ledger';
    el.hidden = true;
    root.appendChild(el);
    this.el = el;
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.close')) this.toggle(false);
    });
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  toggle(show = this.el.hidden): void {
    this.el.hidden = !show;
    this.last = -Infinity;
    if (show) this.onOpen();
  }

  update(s: SimState, map: CoastMap, time: number): void {
    if (this.el.hidden || time - this.last < REFRESH) return;
    this.last = time;
    const html = ledgerHtml(s, map);
    if (html !== this.html) {
      this.html = html;
      morph(this.el, html);
    }
  }

  /** The card's text (for the smoke test). */
  get text(): string {
    return this.el.hidden ? '' : (this.el.textContent ?? '');
  }
}
