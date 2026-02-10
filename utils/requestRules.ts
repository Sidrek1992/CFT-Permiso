import { Employee, LeaveType } from '../types';

export interface BalanceValidationResult {
  valid: boolean;
  remainingDays: number | null;
  message?: string;
}

const clampToZero = (value: number): number => (value < 0 ? 0 : value);

export const getRemainingDaysForType = (employee: Employee, type: LeaveType): number | null => {
  switch (type) {
    case LeaveType.LEGAL_HOLIDAY:
      return clampToZero(employee.totalVacationDays - employee.usedVacationDays);
    case LeaveType.ADMINISTRATIVE:
      return clampToZero(employee.totalAdminDays - employee.usedAdminDays);
    case LeaveType.SICK_LEAVE:
      return clampToZero(employee.totalSickLeaveDays - employee.usedSickLeaveDays);
    default:
      return null;
  }
};

export const validateBalanceForRequest = (
  employee: Employee,
  type: LeaveType,
  daysCount: number
): BalanceValidationResult => {
  if (!Number.isFinite(daysCount) || daysCount <= 0) {
    return {
      valid: false,
      remainingDays: null,
      message: 'La cantidad de días debe ser mayor que cero.',
    };
  }

  const remainingDays = getRemainingDaysForType(employee, type);
  if (remainingDays === null) {
    return {
      valid: true,
      remainingDays: null,
    };
  }

  if (daysCount > remainingDays) {
    return {
      valid: false,
      remainingDays,
      message: `Saldo insuficiente. Disponible: ${remainingDays} día(s). Solicitado: ${daysCount} día(s).`,
    };
  }

  return {
    valid: true,
    remainingDays,
  };
};
