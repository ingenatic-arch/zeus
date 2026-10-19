import { describe, expect, it } from 'vitest';
import { bake, PREPARABLE } from '../scripts/bake';
import { DEMOS } from '../src/game/demos';
import { decodeSave } from '../src/game/saves';
import { Sim } from '../src/sim/sim';

/**
 * Prepared towns (slice 22): a demo opened from the town prepared at build
 * time is the town its setup makes, and plays on exactly as it would have.
 */
describe('prepared towns', () => {
  it('every demo with a history can be prepared', () => {
    expect(PREPARABLE.length).toBeGreaterThan(80);
    expect(PREPARABLE).not.toContain('coast');
  });

  for (const name of ['caravan', 'raiders']) {
    it(`#${name}: decodes to the state its setup made, and plays on the same`, () => {
      const text = bake(name);
      expect(text).not.toBeNull();
      const d = decodeSave(text);
      expect(d.ok).toBe(true);
      const a = new Sim();
      if (d.ok) a.state = d.file.state;
      const b = new Sim();
      DEMOS[name].setup!(b);
      expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
      a.run(900);
      b.run(900);
      expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    }, 120000);
  }
});
