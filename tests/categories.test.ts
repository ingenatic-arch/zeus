import { describe, expect, it } from 'vitest';
import { TOOLS } from '../src/game/tools';
import { CATEGORIES, HEAD_TOOLS } from '../src/ui/categories';

describe('the side panel’s tabs', () => {
  it('hold every building tool exactly once, so a new building is never left without a button', () => {
    const placed = [...HEAD_TOOLS, ...CATEGORIES.flatMap((c) => c.tools)];
    for (const t of TOOLS) expect(placed.filter((p) => p === t), t).toHaveLength(1);
    expect(placed.length).toBe(TOOLS.length);
  });
});
