import { describe, expect, it } from 'vitest';
import { AppConfig, Employee } from '../types';
import { applyYearClose, getYearCloseReminderMessage, shouldRunYearClose } from './yearCloseUtils';

const baseConfig: AppConfig = {
  defaultVacationDays: 15,
  defaultAdminDays: 6,
  defaultSickLeaveDays: 30,
  notificationEmail: 'rrhh@institucion.cl',
  emailTemplate: '- {NOMBRE}: {TIPO}',
  carryoverVacationEnabled: true,
  carryoverVacationMaxPeriods: 2,
  adminDaysExpireAtYearEnd: true,
  yearCloseReminderDays: 30,
};

const baseEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@institucion.cl',
    position: 'Docente',
    department: 'Académico',
    totalVacationDays: 30,
    usedVacationDays: 10,
    totalAdminDays: 6,
    usedAdminDays: 2,
    totalSickLeaveDays: 30,
    usedSickLeaveDays: 3,
    avatarUrl: 'https://example.com/avatar.png',
  },
];

describe('year close automation', () => {
  it('applies carryover and resets annual counters', () => {
    const result = applyYearClose(baseEmployees, baseConfig);

    expect(result.employees[0].totalVacationDays).toBe(30);
    expect(result.employees[0].usedVacationDays).toBe(0);
    expect(result.employees[0].totalAdminDays).toBe(6);
    expect(result.employees[0].usedAdminDays).toBe(0);
    expect(result.adminDaysExpired).toBe(4);
  });

  it('detects when year close should run', () => {
    const shouldRun = shouldRunYearClose(new Date('2026-12-31T12:00:00'), {
      lastClosedYear: 2025,
      lastReminderYear: 2026,
    });
    expect(shouldRun).toBe(true);
  });

  it('emits reminder message near year end', () => {
    const message = getYearCloseReminderMessage(
      new Date('2026-12-15T12:00:00'),
      baseEmployees,
      baseConfig,
      { lastClosedYear: 2025, lastReminderYear: 2025 }
    );

    expect(message).toContain('Alerta de cierre anual');
  });
});
