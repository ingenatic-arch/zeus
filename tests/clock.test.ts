import { describe, expect, it } from 'vitest';
import { dateOfTick, formatDate, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_SECOND } from '../src/sim/clock';

describe('calendar', () => {
  it('a month lasts 30 seconds at normal speed', () => {
    expect(TICKS_PER_MONTH / TICKS_PER_SECOND).toBe(30);
  });

  it('starts in March, 750 BC', () => {
    expect(formatDate(dateOfTick(0))).toBe('March, 750 BC');
    expect(dateOfTick(0).day).toBe(1);
  });

  it('counts days and months', () => {
    expect(dateOfTick(TICKS_PER_DAY * 29).day).toBe(30);
    expect(formatDate(dateOfTick(TICKS_PER_MONTH))).toBe('April, 750 BC');
  });

  it('rolls December 750 BC over into January 749 BC', () => {
    expect(formatDate(dateOfTick(TICKS_PER_MONTH * 9))).toBe('December, 750 BC');
    expect(formatDate(dateOfTick(TICKS_PER_MONTH * 10))).toBe('January, 749 BC');
  });

  it('goes from 1 BC to AD 1 with no year 0', () => {
    const toJan1BC = TICKS_PER_MONTH * (10 + 12 * 748);
    expect(formatDate(dateOfTick(toJan1BC))).toBe('January, 1 BC');
    expect(formatDate(dateOfTick(toJan1BC + TICKS_PER_MONTH * 12))).toBe('January, AD 1');
  });
});
