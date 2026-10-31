/**
 * What a sanctuary says when hovered (slice 54): while it rises, what its
 * site says (monumentstatus.ts: the stage, what it waits for, the builders);
 * finished, whose it is, whether its priests are out and how far they go,
 * the god's mood and why, or that it is dimmed and what brings it back.
 * Pure reads of the state.
 */
import type { CoastMap } from '../map/bake';
import { dateOfTick } from './clock';
import { siteOf } from './monuments';
import { siteStatus, type Status } from './monumentstatus';
import { GODS, moodOfGod, moodWord, reasonsOf } from './pantheon';
import { DIM_AFTER, dimmed, PRIEST_RANGE, sanctuaryName } from './sanctuaries';
import type { Building, SimState } from './state';
import { spanWords } from './materialstatus';
import { PRIESTESS_RANGE } from './culture';

const lines = (...ls: string[]): string => ls.filter((l) => l).join('\n');
const dayOf = (tick: number): string => {
  const d = dateOfTick(tick);
  return `${d.day} ${d.monthName}`;
};
const signed = (n: number): string => `${n > 0 ? '+' : ''}${Math.round(n)}`;

/** A sanctuary, hovered: its site while it rises, its god's affairs once finished. */
export function sanctuaryStatus(s: SimState, map: CoastMap, b: Building, workers: string): Status {
  const x = siteOf(s, b.id);
  if (!x || !x.finished || !x.god) return siteStatus(s, map, b);
  const g = GODS[x.god];
  const mood = moodOfGod(s, x.god);
  const why = reasonsOf(s, x.god)
    .slice(0, 3)
    .map((r) => `${signed(r.worth)} ${r.why}`)
    .join(' · ');
  const priests = s.walkers.filter((w) => w.kind === 'priest' && w.origin === b.id).length;
  const Name = sanctuaryName(x.god, true);
  if (dimmed(s, x)) {
    return {
      title: `${Name} · dimmed`,
      detail: lines(workers, `Its lamps are out: it has stood without priests for ${spanWords(s.tick - x.idle)}, and ${g.name} no longer counts it an honour. Workers bring it back`, `${g.name} is ${moodWord(mood)} (${signed(mood)})${why ? `: ${why}` : ''}`),
    };
  }
  const idle = x.idle > 0 ? `Nobody works it: it dims in ${spanWords(Math.max(0, DIM_AFTER - (s.tick - x.idle)))} unless workers come, and ${g.name}’s honour lapses` : '';
  return {
    title: `${Name} · ${moodWord(mood)}`,
    detail: lines(
      workers,
      idle,
      priests ? `${priests} ${priests === 1 ? 'priest' : 'priests'} out blessing homes, up to ${PRIEST_RANGE} tiles of road away (a shrine’s priestess goes ${PRIESTESS_RANGE})` : `Its priests bless homes up to ${PRIEST_RANGE} tiles of road away (a shrine’s priestess goes ${PRIESTESS_RANGE})`,
      `${g.name} is ${moodWord(mood)} (${signed(mood)})${why ? `: ${why}` : ''}`,
      `Finished on ${dayOf(x.finished)}, ${spanWords(x.finished - x.marked)} after it was marked out`,
    ),
  };
}
