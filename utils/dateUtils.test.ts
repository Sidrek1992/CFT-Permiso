import { describe, expect, it } from 'vitest';
import { LeaveType, WorkShift } from '../types';
import { calculateBusinessDays, isValidISODate } from './dateUtils';

describe('calculateBusinessDays', () => {
  it('excludes weekends for legal holidays', () => {
    const days = calculateBusinessDays('2026-02-02', '2026-02-08', LeaveType.LEGAL_HOLIDAY, WorkShift.JC);
    expect(days).toBe(5);
  });

  it('returns half-day for single-day partial shift', () => {
    const days = calculateBusinessDays('2026-02-10', '2026-02-10', LeaveType.ADMINISTRATIVE, WorkShift.JM);
    expect(days).toBe(0.5);
  });

  it('counts calendar days for sick leave', () => {
    const days = calculateBusinessDays('2026-02-06', '2026-02-08', LeaveType.SICK_LEAVE, WorkShift.JC);
    expect(days).toBe(3);
  });

  it('returns zero for invalid date input', () => {
    const days = calculateBusinessDays('2026-02-31', '2026-02-08', LeaveType.SICK_LEAVE, WorkShift.JC);
    expect(days).toBe(0);
  });
});

describe('isValidISODate', () => {
  it('accepts a real ISO date', () => {
    expect(isValidISODate('2026-02-28')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
  });

  it('rejects malformed strings', () => {
    expect(isValidISODate('2026/02/10')).toBe(false);
  });
});
