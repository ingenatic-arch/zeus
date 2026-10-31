/**
 * Slice 61: #olympus, every system of phase 7 in one town, opens with what
 * it promises: six sanctuaries along the sacred way (five finished, Apollo's
 * rising), shrines to eleven of the twelve, two gods loving and one angry
 * with an omen running, a monster in its lair, a hero's hall waiting on one
 * demand, Sparta's band on the road with Ares marching with it, a year of
 * messages, and some of every ambition's milestones met and some not.
 */
import { describe, expect, it } from 'vitest';
import { milestoneOf } from '../src/sim/ambitions';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../src/sim/clock';
import { demandsOf } from '../src/sim/heroes';
import { AMBITIONS, MILESTONE_IDS } from '../src/sim/laurels';
import { GOD_IDS, moodOfGod, moodWord } from '../src/sim/pantheon';
import { demoSim } from './prepared';

describe('#olympus (slice 61)', () => {
  it('opens with the gods, legends, war and ambitions it promises', () => {
    const s = demoSim('olympus').state;
    expect(s.gods.on).toBe(true);
    expect(s.ambition.on).toBe(true);
    // Six sanctuaries, five finished and Apollo's rising.
    const sites = s.monuments.sites.filter((x) => x.kind === 'sanctuary');
    expect(sites.map((x) => x.god)).toEqual(['demeter', 'athena', 'zeus', 'dionysus', 'hermes', 'apollo']);
    expect(sites.filter((x) => x.finished > 0).length).toBe(5);
    expect(sites[5].finished).toBe(0);
    // Shrines to eleven of the twelve: none to Ares.
    const shrined = new Set(s.buildings.filter((b) => b.kind === 'shrine' && b.god).map((b) => b.god));
    expect(GOD_IDS.filter((g) => !shrined.has(g))).toEqual(['ares']);
    // Two gods loving, Hera angry with her omen running, Ares furious and marching with Sparta's band on the road.
    const loving = GOD_IDS.filter((g) => moodWord(moodOfGod(s, g)) === 'loving');
    expect(loving).toEqual(['demeter', 'athena']);
    expect(moodWord(moodOfGod(s, 'hera'))).toBe('angry');
    expect(moodWord(moodOfGod(s, 'ares'))).toBe('furious');
    const omens = s.gods.wrath.omens;
    expect(omens.map((o) => [o.god, o.curse])).toEqual([['hera', 'quarrels']]);
    expect(omens[0].day - s.tick).toBeGreaterThan(7 * TICKS_PER_DAY);
    const band = s.world.raids.find((r) => r.city === 'sparta' && r.ended === 0);
    expect(band?.phase).toBe('marching');
    expect((band!.start + band!.dur - s.tick) / TICKS_PER_DAY).toBeGreaterThan(3);
    expect(s.gods.war.marches.map((m) => [m.god, m.raid])).toEqual([['ares', band!.id]]);
    // Athena walking for her festival as it opens.
    expect(s.gods.walks.figures.some((f) => f.god === 'athena')).toBe(true);
    // The Boar in its marsh; Atalanta's hall waiting on one demand (Artemis warm).
    expect(s.legends.monsters.map((m) => [m.kind, m.state])).toEqual([['boar', 'lair']]);
    expect(s.legends.heroes.map((h) => [h.hero, h.state])).toEqual([['atalanta', 'awaited']]);
    expect(demandsOf(s, 'atalanta').filter((d) => !d.met).map((d) => d.what)).toEqual(['Artemis warm']);
    // A year of messages.
    expect(s.tick - s.messages.log[0].tick).toBeGreaterThan(11 * TICKS_PER_MONTH);
    // Some of every ambition met and some not; the gods' first sanctuary won in play, not quietly.
    const reached = new Set(s.ambition.reached.map((l) => l.id));
    for (const k of AMBITIONS) {
      const ids = MILESTONE_IDS[k];
      expect(ids.some((id) => reached.has(id)), k).toBe(true);
      expect(ids.some((id) => !reached.has(id)), k).toBe(true);
    }
    expect(MILESTONE_IDS.gods.filter((id) => reached.has(id))).toEqual(['sanctuary']);
    expect(s.ambition.reached.find((l) => l.id === 'sanctuary')?.quiet).toBe(false);
    expect(milestoneOf('shrines')!.progress(s).words).toBe('Shrines to 11 of the twelve: none yet to Ares');
    expect(milestoneOf('loving')!.progress(s).words).toMatch(/^2 of 3 gods loving: Demeter and Athena; \w+ nearest, warm/);
    expect(milestoneOf('sanctuaries')!.progress(s).words).toMatch(/^5 of 6 sanctuaries standing: Demeter, Athena, Zeus, Dionysus and Hermes; Apollo’s rising/);
  }, 600_000);
});
