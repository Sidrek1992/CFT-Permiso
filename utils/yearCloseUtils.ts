import { AppConfig, Employee } from '../types';

export interface YearCloseMeta {
  lastClosedYear: number;
  lastReminderYear: number;
}

export interface YearCloseResult {
  employees: Employee[];
  adminDaysExpired: number;
  vacationDaysCapped: number;
}

const DEFAULT_MAX_VACATION_PERIODS = 2;
const DEFAULT_REMINDER_DAYS = 30;

const getMaxVacationPeriods = (config: AppConfig): number => {
  const value = Number(config.carryoverVacationMaxPeriods ?? DEFAULT_MAX_VACATION_PERIODS);
  if (!Number.isFinite(value)) return DEFAULT_MAX_VACATION_PERIODS;
  return Math.max(1, Math.min(5, Math.trunc(value)));
};

const getReminderDays = (config: AppConfig): number => {
  const value = Number(config.yearCloseReminderDays ?? DEFAULT_REMINDER_DAYS);
  if (!Number.isFinite(value)) return DEFAULT_REMINDER_DAYS;
  return Math.max(1, Math.min(90, Math.trunc(value)));
};

export const getTargetYearToClose = (today: Date): number | null => {
  const month = today.getMonth();
  const day = today.getDate();

  if (month === 11 && day === 31) {
    return today.getFullYear();
  }

  // Grace period in January in case the app was not opened on Dec 31
  if (month === 0 && day <= 31) {
    return today.getFullYear() - 1;
  }

  return null;
};

export const shouldRunYearClose = (today: Date, meta: YearCloseMeta): boolean => {
  const targetYear = getTargetYearToClose(today);
  if (!targetYear) {
    return false;
  }

  return meta.lastClosedYear < targetYear;
};

export const applyYearClose = (employees: Employee[], config: AppConfig): YearCloseResult => {
  const maxPeriods = getMaxVacationPeriods(config);
  const carryEnabled = config.carryoverVacationEnabled !== false;
  const expireAdmin = config.adminDaysExpireAtYearEnd !== false;

  const maxVacationTotal = config.defaultVacationDays * maxPeriods;

  let adminDaysExpired = 0;
  let vacationDaysCapped = 0;

  const nextEmployees = employees.map((employee) => {
    const vacationRemaining = Math.max(0, employee.totalVacationDays - employee.usedVacationDays);
    const adminRemaining = Math.max(0, employee.totalAdminDays - employee.usedAdminDays);

    const rawVacationTotal = carryEnabled
      ? config.defaultVacationDays + vacationRemaining
      : config.defaultVacationDays;

    const nextVacationTotal = Math.min(maxVacationTotal, rawVacationTotal);
    vacationDaysCapped += Math.max(0, rawVacationTotal - nextVacationTotal);

    if (expireAdmin) {
      adminDaysExpired += adminRemaining;
    }

    return {
      ...employee,
      totalVacationDays: nextVacationTotal,
      usedVacationDays: 0,
      totalAdminDays: expireAdmin ? config.defaultAdminDays : employee.totalAdminDays,
      usedAdminDays: 0,
      totalSickLeaveDays: config.defaultSickLeaveDays,
      usedSickLeaveDays: 0,
    };
  });

  return {
    employees: nextEmployees,
    adminDaysExpired,
    vacationDaysCapped,
  };
};

export const getYearCloseReminderMessage = (
  today: Date,
  employees: Employee[],
  config: AppConfig,
  meta: YearCloseMeta
): string | null => {
  const currentYear = today.getFullYear();
  if (today.getMonth() !== 11) {
    return null;
  }

  if (meta.lastReminderYear >= currentYear) {
    return null;
  }

  const yearEnd = new Date(currentYear, 11, 31);
  const diffMs = yearEnd.getTime() - today.getTime();
  const daysUntilYearEnd = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  const reminderDays = getReminderDays(config);

  if (daysUntilYearEnd > reminderDays) {
    return null;
  }

  const adminsToExpire = employees.reduce((acc, employee) => {
    return acc + Math.max(0, employee.totalAdminDays - employee.usedAdminDays);
  }, 0);

  return `Alerta de cierre anual: faltan ${daysUntilYearEnd} día(s) para el 31/12. Se vencerán ${adminsToExpire} día(s) administrativos no usados.`;
};
