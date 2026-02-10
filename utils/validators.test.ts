import { describe, expect, it } from 'vitest';
import { LeaveStatus, LeaveType, WorkShift } from '../types';
import { validateImportData } from './validators';

describe('validateImportData', () => {
  it('accepts a valid payload', () => {
    const result = validateImportData({
      employees: [
        {
          id: 'e-1',
          firstName: 'Ana',
          lastName: 'Pérez',
          email: 'ana@institucion.cl',
          position: 'Docente',
          department: 'Académico',
          totalVacationDays: 15,
          usedVacationDays: 2,
          totalAdminDays: 6,
          usedAdminDays: 1,
          totalSickLeaveDays: 30,
          usedSickLeaveDays: 0,
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
      requests: [
        {
          id: 'r-1',
          employeeId: 'e-1',
          type: LeaveType.LEGAL_HOLIDAY,
          startDate: '2026-02-01',
          endDate: '2026-02-03',
          daysCount: 2,
          status: LeaveStatus.APPROVED,
          reason: 'Vacaciones',
          shift: WorkShift.JC,
        },
      ],
      config: {
        defaultVacationDays: 15,
        defaultAdminDays: 6,
        defaultSickLeaveDays: 30,
        notificationEmail: 'rrhh@institucion.cl',
        emailTemplate: '- {NOMBRE}: {TIPO}',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects requests with invalid enum values', () => {
    const result = validateImportData({
      employees: [
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
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
      requests: [
        {
          id: 'r-1',
          employeeId: 'e-1',
          type: 'Permiso Inventado',
          startDate: '2026-02-01',
          endDate: '2026-02-03',
          daysCount: 2,
          status: LeaveStatus.APPROVED,
          reason: 'X',
          shift: WorkShift.JC,
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects payloads without import sections', () => {
    const result = validateImportData({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('El archivo no contiene funcionarios, solicitudes ni configuración.');
  });

  it('rejects requests where end date is before start date', () => {
    const result = validateImportData({
      employees: [
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
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
      requests: [
        {
          id: 'r-1',
          employeeId: 'e-1',
          type: LeaveType.ADMINISTRATIVE,
          startDate: '2026-02-12',
          endDate: '2026-02-10',
          daysCount: 1,
          status: LeaveStatus.APPROVED,
          reason: 'Trámite',
          shift: WorkShift.JC,
        },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it('rejects requests with inconsistent day counts', () => {
    const result = validateImportData({
      employees: [
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
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
      requests: [
        {
          id: 'r-1',
          employeeId: 'e-1',
          type: LeaveType.LEGAL_HOLIDAY,
          startDate: '2026-02-02',
          endDate: '2026-02-03',
          daysCount: 3,
          status: LeaveStatus.APPROVED,
          reason: 'Vacaciones',
          shift: WorkShift.JC,
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('días calculados inconsistentes'))).toBe(true);
  });

  it('rejects overlapping approved requests for the same employee', () => {
    const result = validateImportData({
      employees: [
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
          avatarUrl: 'https://example.com/avatar.png',
        },
      ],
      requests: [
        {
          id: 'r-1',
          employeeId: 'e-1',
          type: LeaveType.SICK_LEAVE,
          startDate: '2026-02-10',
          endDate: '2026-02-12',
          daysCount: 3,
          status: LeaveStatus.APPROVED,
          reason: 'Licencia',
          shift: WorkShift.JC,
        },
        {
          id: 'r-2',
          employeeId: 'e-1',
          type: LeaveType.SICK_LEAVE,
          startDate: '2026-02-12',
          endDate: '2026-02-13',
          daysCount: 2,
          status: LeaveStatus.APPROVED,
          reason: 'Licencia',
          shift: WorkShift.JC,
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('solapamiento'))).toBe(true);
  });
});
