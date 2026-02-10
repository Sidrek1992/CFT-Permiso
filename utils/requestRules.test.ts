import { describe, expect, it } from 'vitest';
import { Employee, LeaveType } from '../types';
import { getRemainingDaysForType, validateBalanceForRequest } from './requestRules';

const employee: Employee = {
  id: 'e-1',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@institucion.cl',
  position: 'Docente',
  department: 'Académico',
  totalVacationDays: 15,
  usedVacationDays: 5,
  totalAdminDays: 6,
  usedAdminDays: 2,
  totalSickLeaveDays: 30,
  usedSickLeaveDays: 10,
  avatarUrl: 'https://example.com/avatar.png',
};

describe('getRemainingDaysForType', () => {
  it('returns remaining vacation days', () => {
    expect(getRemainingDaysForType(employee, LeaveType.LEGAL_HOLIDAY)).toBe(10);
  });

  it('returns null for unrestricted leave types', () => {
    expect(getRemainingDaysForType(employee, LeaveType.WITHOUT_PAY)).toBeNull();
  });
});

describe('validateBalanceForRequest', () => {
  it('fails when there are not enough days', () => {
    const result = validateBalanceForRequest(employee, LeaveType.ADMINISTRATIVE, 10);
    expect(result.valid).toBe(false);
    expect(result.remainingDays).toBe(4);
  });

  it('passes for unrestricted leave types', () => {
    const result = validateBalanceForRequest(employee, LeaveType.PARENTAL, 90);
    expect(result.valid).toBe(true);
    expect(result.remainingDays).toBeNull();
  });
});
