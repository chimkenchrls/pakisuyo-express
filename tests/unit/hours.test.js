import { describe, it, expect } from 'vitest';
import { getHoursStatus, manilaHour } from '../../src/lib/hours.js';

// Manila is UTC+8 with no daylight saving, so instants below are unambiguous.
describe('hours', () => {
  it('reads the hour in Manila, not the machine timezone', () => {
    expect(manilaHour(new Date('2026-10-03T00:30:00Z'))).toBe(8);
    expect(manilaHour(new Date('2026-10-03T16:00:00Z'))).toBe(0); // midnight, not 24
  });

  it.each([
    ['2026-10-02T23:59:00Z', false], // 7:59 AM
    ['2026-10-03T00:00:00Z', true],  // 8:00 AM
    ['2026-10-03T10:59:00Z', true],  // 6:59 PM
    ['2026-10-03T11:00:00Z', false], // 7:00 PM
    ['2026-10-03T15:00:00Z', false], // 11:00 PM
  ])('%s → open=%s', (iso, isOpen) => {
    const status = getHoursStatus(new Date(iso));
    expect(status.isOpen).toBe(isOpen);
    expect(status.label).toBe(isOpen ? 'Open today 8AM–7PM' : 'Closed now — opens 8AM');
  });
});
