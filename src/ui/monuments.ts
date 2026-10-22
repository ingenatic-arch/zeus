/**
 * The Monuments tab (slice 35), below its buildings: each monument, how far
 * along it is, the stage it is on and what it waits for; the masons' yards
 * and their builders; and the marble, timber and copper in the storehouses
 * that the ox carts haul from. A pure read of the state.
 */
import type { CoastMap } from '../map/bake';
import { centreOf } from '../sim/buildings';
import { COPPER, held, MARBLE, TIMBER } from '../sim/foods';
import { MONUMENT_KINDS, monumentName, monumentOf, progressOf, STAGES, totalOf, workOf, type MonumentKind } from '../sim/monuments';
import { doesLine, materialName, siteStatus } from '../sim/monumentstatus';
import { buildersFor, cartsTo, MAX_BUILDERS, siteBuilding } from '../sim/monumentworks';
import type { SimState } from '../sim/state';

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** One monument's entry: its name (to go there), how far along, and its site's own words. */
function entry(s: SimState, map: CoastMap, kind: MonumentKind): string {
  const x = monumentOf(s, kind);
  const b = x ? siteBuilding(s, x) : undefined;
  const Name = monumentName(kind, true);
  if (!x || !b) {
    const total = [MARBLE, TIMBER, COPPER].filter((w) => totalOf(kind, w) > 0).map((w) => `${fmt(totalOf(kind, w))} ${materialName(w)}`).join(', ');
    return `<li class="mon none"><span class="nm">${esc(Name)}</span><span class="n">not begun</span><small class="why">${esc(`${total} in all, in three stages · finished: ${doesLine(kind)}`)}</small></li>`;
  }
  const [cx, cz] = centreOf(b);
  const p = progressOf(x);
  // Three segments, one a stage: done, under way (by its work), or waiting.
  const segs = STAGES[kind]
    .map((st, i) => {
      const f = i < x.stage ? 1 : i === x.stage && x.building ? Math.min(1, x.work / workOf(st)) : 0;
      return `<i class="fill seg"><b style="width:${(f * 100).toFixed(0)}%"></b></i>`;
    })
    .join('');
  const state = x.finished ? 'finished' : `${Math.floor(p * 100)}%`;
  // (Its stage, builders and materials are in the site's own words below; only the carts on the road are added.)
  const carts = cartsTo(s, x.id).length;
  const doing = x.finished || carts === 0 ? '' : `${carts} ox cart${carts === 1 ? '' : 's'} on the road to it`;
  const why = siteStatus(s, map, b).detail.split('\n');
  return `<li class="mon"><button data-act="go" data-x="${cx}" data-z="${cz}" title="Go there">${esc(Name)}</button><span class="n">${state}</span><span class="segs">${segs}</span>${doing ? `<small class="why">${esc(doing)}</small>` : ''}${why.map((l) => `<small class="why">${esc(l)}</small>`).join('')}</li>`;
}

/** The tab's HTML. */
export function monumentsHtml(s: SimState, map: CoastMap): string {
  const out: string[] = [];
  out.push('<h3>The monuments</h3>');
  out.push(`<ul class="places monuments">${MONUMENT_KINDS.map((k) => entry(s, map, k)).join('')}</ul>`);
  const yards = s.buildings.filter((y) => y.kind === 'masons');
  out.push('<h3>Masons’ yards</h3>');
  if (yards.length === 0) out.push(`<p class="side-note">None yet: a monument’s stage needs builders, and each yard sends up to ${MAX_BUILDERS} (one for each two of its workers).</p>`);
  else {
    const rows = yards.map((y) => {
      const [cx, cz] = centreOf(y);
      const out = s.walkers.filter((w) => w.kind === 'builder' && w.origin === y.id && !w.back).length;
      return `<li><button data-act="go" data-x="${cx}" data-z="${cz}" title="Go there">Masons’ yard</button><span class="n">${out}<small> / ${buildersFor(y)} builders out</small></span></li>`;
    });
    out.push(`<ul class="places staff">${rows.join('')}</ul>`);
  }
  // What the ox carts haul from.
  const stored = [MARBLE, TIMBER, COPPER].map((w) => ({ w, n: s.buildings.reduce((a, g) => a + (g.kind === 'storehouse' ? held(g, w) : 0), 0) }));
  out.push('<h3>In the storehouses</h3>');
  out.push(`<ul class="places">${stored.map(({ w, n }) => `<li><button data-act="ware" data-ware="${w}" title="Where it comes from and goes">${esc(w === COPPER ? 'Copper (for bronze)' : materialName(w).replace(/^./, (c) => c.toUpperCase()))}</button><span class="n">${fmt(n)}</span></li>`).join('')}</ul>`);
  out.push('<p class="side-note">A stage starts only once everything it needs is on site: ox carts haul it from the storehouses, a few days apart. Then it goes as fast as the builders there.</p>');
  return out.join('');
}
