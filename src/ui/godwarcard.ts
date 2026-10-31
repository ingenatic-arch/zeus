/**
 * Slice 60: the Army tab's "Call on the gods" card. It shows while the gods
 * watch and there is war about: a band on its way or on your land, a god
 * marching with one, a god fighting for you. First the gods against you (who,
 * with whom, why, and that your soldiers can't hurt them); then the gods
 * fighting for you and the duel, if any; then each god who could answer a
 * call (their emblem, how they fight, the button, or why not yet); and the
 * others, a row of dimmed emblems, each saying in its tip why they won't come.
 *
 * Only reads the state; its buttons carry data-act "callgod" (and data-god)
 * for the side panel to send.
 */
import { PLACES } from '../map/greece';
import { TICKS_PER_DAY } from '../sim/clock';
import { figureOf } from '../sim/epiphany';
import { angerWords, callable, callRefusal, duelLine, invaders, loving, sanctuaryStands, STYLES, warDoing } from '../sim/godwar';
import { GODS, goddess, moodOfGod, moodWord, type GodId } from '../sim/pantheon';
import type { SimState } from '../sim/state';
import { emblemIcon } from './godpanel';
import { esc, kbtn, kcard, kh, ksec, kwhy } from './kit';
import './godwarcard.css';

const cap = (t: string): string => (t ? `${t[0].toUpperCase()}${t.slice(1)}` : t);
const whose = (c: keyof typeof PLACES): string => (PLACES[c].name.endsWith('s') ? `${PLACES[c].name}’` : `${PLACES[c].name}’s`);

/** Is there war about: a band coming or here, or a god at war? */
function warAbout(s: SimState): boolean {
  const w = s.gods.war;
  if (w.marches.length || w.champions.length || w.duel) return true;
  return s.world.raids.some((r) => !r.broke && (r.phase === 'threat' || r.phase === 'gathering' || r.phase === 'marching' || r.phase === 'raiding'));
}

/** The card's HTML, or '' when the gods are not watching or there is no war about. */
export function godWarCard(s: SimState): string {
  if (!s.gods.on || !warAbout(s)) return '';
  const w = s.gods.war;
  const out: string[] = [];
  // The gods against you.
  for (const m of w.marches) {
    const r = s.world.raids.find((x) => x.id === m.raid);
    if (!r) continue;
    const f = m.figure ? figureOf(s, m.figure) : undefined;
    const him = goddess(m.god) ? 'her' : 'him';
    const where = f ? cap(warDoing(s, f)) : `Marches with ${whose(r.city)} ${r.loan ? 'army' : 'raiders'}`;
    out.push(
      `<div class="gw-row foe"><span class="gw-em">${emblemIcon(m.god)}</span><p><b>${esc(GODS[m.god].name)} is against you.</b> ${esc(where)}. ${esc(angerWords(s, m.god))}. Your soldiers can’t hurt ${him}: hold out until the band breaks${f ? '' : `, calm ${him} before they come`}, or call on a god who loves you.</p></div>`,
    );
  }
  // The gods fighting for you.
  for (const c of w.champions) {
    const f = figureOf(s, c.figure);
    if (!f) continue;
    const days = Math.max(1, Math.ceil((f.leaves - s.tick) / TICKS_PER_DAY));
    const done = [c.felled ? `${c.felled} struck down` : '', c.ships ? `${c.ships} ${c.ships === 1 ? 'ship' : 'ships'} struck` : '', c.nerve ? `their nerve shaken ${c.nerve === 1 ? 'once' : `${c.nerve} times`}` : ''].filter(Boolean).join(', ');
    out.push(`<div class="gw-row friend"><span class="gw-em">${emblemIcon(f.god)}</span><p><b>${esc(GODS[f.god].name)} fights for you.</b> ${esc(cap(warDoing(s, f)))}${done ? ` · so far ${esc(done)}` : ''}. Gone once the band breaks, within ${days} ${days === 1 ? 'day' : 'days'}.</p></div>`);
  }
  if (w.duel) {
    const line = duelLine(s, w.duel);
    if (line) out.push(`<p class="gw-duel">${esc(line)}.</p>`);
  }
  // The gods who could come: those who love you with a finished sanctuary (a button each, or why not now).
  const all = callable(s);
  const ready = all.filter((c) => !c.why);
  const near = all.filter((c) => c.why && loving(s, c.god) && sanctuaryStands(s, c.god));
  const answer: string[] = [];
  for (const c of [...ready, ...near]) {
    const st = STYLES[c.god];
    answer.push(
      `<div class="gw-call">${kbtn({ act: 'callgod', data: { god: c.god }, icon: emblemIcon(c.god), html: `Call on ${esc(GODS[c.god].name)}`, why: c.why, tip: `${GODS[c.god].name} rises beside the invaders and ${st.words}. Once a year.`, cls: 'k-wide' })}${c.why ? kwhy(c.why) : `<p class="k-why">${esc(cap(goddess(c.god) ? 'she' : 'he'))} ${esc(st.words)}.</p>`}</div>`,
    );
  }
  // The others: a dimmed emblem each, its tip saying why.
  const rest = all.filter((c) => c.why && !near.includes(c));
  const busy = (g: string): boolean => w.champions.some((c) => c.god === g) || w.marches.some((m) => m.god === g);
  const lovingNoSanctuary = rest.filter((c) => !busy(c.god) && loving(s, c.god) && !sanctuaryStands(s, c.god));
  if (!answer.length && !w.champions.length) {
    const none = !invaders(s).length && !w.marches.length ? 'No god who loves you has a sanctuary in your city yet.' : 'No god can answer a call now.';
    answer.push(`<p class="gw-none">${esc(none)} A god answers a call to war only if they love your city and have a finished sanctuary here, once a year.</p>`);
  }
  if (lovingNoSanctuary.length) {
    answer.push(`<p class="gw-note">${esc(lovingNoSanctuary.map((c) => GODS[c.god].name).join(' and '))} ${lovingNoSanctuary.length === 1 ? 'loves' : 'love'} you, but ${lovingNoSanctuary.length === 1 ? 'has' : 'have'} no finished sanctuary to answer from: build one to call on ${lovingNoSanctuary.length === 1 ? (goddess(lovingNoSanctuary[0].god) ? 'her' : 'him') : 'them'}.</p>`);
  }
  const dim = rest
    .filter((c) => !lovingNoSanctuary.includes(c) && !busy(c.god))
    .map((c) => `<span class="gw-dim" data-tip="${esc(`${c.why}${/only .* towards you/.test(c.why) ? '' : ` (${moodWord(moodOfGod(s, c.god))})`}`)}" aria-label="${esc(`${GODS[c.god].name}: ${c.why}`)}">${emblemIcon(c.god)}</span>`);
  if (dim.length) answer.push(`<div class="gw-rest"><small>Won’t come:</small>${dim.join('')}</div>`);
  out.push(answer.join(''));
  return kcard(`${kh('Call on the gods', { icon: emblemIcon(ready[0]?.god ?? 'zeus') })}${out.join('')}`, 'k-godwar');
}

/** A finished sanctuary's call (its panel): while invaders are on your land or a god marches against you, the god's button, or why they can't come; '' otherwise. */
export function sanctuaryCall(s: SimState, god: GodId): string {
  if (!s.gods.on || (!invaders(s).length && !s.gods.war.marches.length)) return '';
  const why = callRefusal(s, god);
  const st = STYLES[god];
  return ksec(
    'Call to war',
    `<div class="gw-call">${kbtn({ act: 'callgod', data: { god }, icon: emblemIcon(god), html: `Call on ${esc(GODS[god].name)}`, why, tip: `${GODS[god].name} rises beside the invaders and ${st.words}. Once a year.`, cls: 'k-wide' })}${why ? kwhy(why) : `<p class="k-why">${esc(cap(goddess(god) ? 'she' : 'he'))} ${esc(st.words)}.</p>`}</div>`,
    { cls: 'k-godwar' },
  );
}
