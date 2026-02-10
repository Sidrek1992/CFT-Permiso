import { LeaveType, WorkShift } from '../types';
import { HOLIDAYS } from '../constants';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates whether a string is a real ISO date (YYYY-MM-DD).
 */
export const isValidISODate = (dateStr: string): boolean => {
  if (!ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/**
 * Parses an ISO date string (YYYY-MM-DD) into a local Date object.
 * Uses numeric constructor arguments to avoid UTC parsing offsets.
 */
export const parseISODate = (dateStr: string): Date => {
  if (!isValidISODate(dateStr)) {
    return new Date(Number.NaN);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats an ISO date string (YYYY-MM-DD) to a human-readable format in Spanish (Chile).
 * @param dateStr - ISO date string, e.g. '2026-02-09'
 * @param style - 'short' (09/02/2026), 'long' (lunes, 9 de febrero de 2026), 'medium' (9 feb 2026)
 * @returns Formatted date string in Spanish
 */
export const formatDate = (dateStr: string, style: 'short' | 'long' | 'medium' = 'short'): string => {
  if (!dateStr || !isValidISODate(dateStr)) return '';
  const date = parseISODate(dateStr);

  if (style === 'long') {
    return date.toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
  if (style === 'medium') {
    return date.toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  return date.toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

/**
 * Gets today's date as a YYYY-MM-DD string in the LOCAL timezone.
 * Avoids UTC conversion issues at the boundary hours (e.g. 21:00-00:00 in UTC-3).
 * @returns Today's date string, e.g. '2026-02-09'
 */
export const getTodayString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Converts a Date object to a YYYY-MM-DD string using LOCAL timezone.
 * This avoids the UTC shift that occurs with toISOString().
 * @param date - Date object to convert
 * @returns Local date string in YYYY-MM-DD format
 */
export const toLocalDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Calculates the number of working/calendar days between two dates,
 * depending on the leave type:
 * - LEGAL_HOLIDAY & ADMINISTRATIVE: excludes weekends and Chilean national holidays
 * - SICK_LEAVE, WITHOUT_PAY, PARENTAL: counts calendar days
 *
 * For half-day shifts (JM/JT) on a single-day range, returns 0.5
 *
 * @param startStr - Start date in YYYY-MM-DD format
 * @param endStr - End date in YYYY-MM-DD format
 * @param type - Type of leave
 * @param shift - Work shift (full day, morning, or afternoon)
 * @returns Number of days to deduct
 */
export const calculateBusinessDays = (
  startStr: string,
  endStr: string,
  type: LeaveType,
  shift: WorkShift
): number => {
  if (!startStr || !endStr) return 0;
  if (!isValidISODate(startStr) || !isValidISODate(endStr)) return 0;

  const start = parseISODate(startStr);
  const end = parseISODate(endStr);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  if (end < start) return 0;

  // Single-day half-shift
  if (startStr === endStr && shift !== WorkShift.JC) {
    return 0.5;
  }

  const currentDate = new Date(start);
  let count = 0;

  while (currentDate <= end) {
    const dateStr = toLocalDateString(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = HOLIDAYS.includes(dateStr);

    if (type === LeaveType.LEGAL_HOLIDAY || type === LeaveType.ADMINISTRATIVE) {
      if (!isWeekend && !isHoliday) {
        count++;
      }
    } else {
      count++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};

/**
 * Returns the full-text representation of a work shift.
 * @param shift - WorkShift enum value
 * @returns Human-readable shift name in Spanish
 */
export const getShiftText = (shift: WorkShift): string => {
  switch (shift) {
    case WorkShift.JM: return 'Jornada Mañana';
    case WorkShift.JT: return 'Jornada Tarde';
    default: return 'Jornada Completa';
  }
};
