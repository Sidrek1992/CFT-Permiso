import { describe, expect, it } from 'vitest';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, WorkShift } from '../types';
import { recalculateEmployeeUsage } from './balanceUtils';

const baseEmployees: Employee[] = [
  {
    id: 'e-1',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@institucion.cl',
    position: 'Docente',
    department: 'Académico',
    totalVacationDays: 15,
    usedVacationDays: 0,
    totalAdminDays: 6,
    usedAdminDays: 0,
    totalSickLeaveDays: 30,
    usedSickLeaveDays: 0,
    avatarUrl: 'https://example.com/avatar-ana.png',
  },
  {
    id: 'e-2',
    firstName: 'Luis',
    lastName: 'Rojas',
    email: 'luis@institucion.cl',
    position: 'Coordinador',
    department: 'Admisión',
    totalVacationDays: 15,
    usedVacationDays: 0,
    totalAdminDays: 6,
    usedAdminDays: 0,
    totalSickLeaveDays: 30,
    usedSickLeaveDays: 0,
    avatarUrl: 'https://example.com/avatar-luis.png',
  },
];

const requests: LeaveRequest[] = [
  {
    id: 'r-1',
    employeeId: 'e-1',
    type: LeaveType.LEGAL_HOLIDAY,
    startDate: '2026-02-02',
    endDate: '2026-02-03',
    daysCount: 2,
    status: LeaveStatus.APPROVED,
    reason: 'Vacaciones',
    shift: WorkShift.JC,
  },
  {
    id: 'r-2',
    employeeId: 'e-1',
    type: LeaveType.ADMINISTRATIVE,
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    daysCount: 1,
    status: LeaveStatus.APPROVED,
    reason: 'Trámite',
    shift: WorkShift.JC,
  },
  {
    id: 'r-3',
    employeeId: 'e-2',
    type: LeaveType.SICK_LEAVE,
    startDate: '2026-02-11',
    endDate: '2026-02-12',
    daysCount: 2,
    status: LeaveStatus.APPROVED,
    reason: 'Licencia',
    shift: WorkShift.JC,
  },
  {
    id: 'r-4',
    employeeId: 'e-2',
    type: LeaveType.LEGAL_HOLIDAY,
    startDate: '2026-02-20',
    endDate: '2026-02-20',
    daysCount: 1,
    status: LeaveStatus.PENDING,
    reason: 'Pendiente',
    shift: WorkShift.JC,
  },
];

describe('recalculateEmployeeUsage', () => {
  it('rebuilds used-day balances from approved requests only', () => {
    const result = recalculateEmployeeUsage(baseEmployees, requests);

    expect(result).toHaveLength(2);
    expect(result[0].usedVacationDays).toBe(2);
    expect(result[0].usedAdminDays).toBe(1);
    expect(result[0].usedSickLeaveDays).toBe(0);

    expect(result[1].usedVacationDays).toBe(0);
    expect(result[1].usedAdminDays).toBe(0);
    expect(result[1].usedSickLeaveDays).toBe(2);
  });
});
