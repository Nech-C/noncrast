import { describe, expect, it } from 'vitest';

import { formatDateInput, parseDateInput } from '../src/utils/dateHelper';

describe('dateHelper', () => {
  it('formats a timestamp into YYYY-MM-DD', () => {
    const ts = new Date('2025-01-02T12:00:00Z').getTime(); // midday to avoid TZ shifts
    expect(formatDateInput(ts)).toBe('2025-01-02');
  });

  it('returns empty string for nullish or zero timestamps', () => {
    expect(formatDateInput(null)).toBe('');
    expect(formatDateInput(0 as unknown as number)).toBe('');
  });

  it('parses a valid date string into a timestamp', () => {
    const expected = new Date('2025-03-15').getTime();
    expect(parseDateInput('2025-03-15')).toBe(expected);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('not-a-date')).toBeNull();
  });
});
