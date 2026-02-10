import { Employee, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { calculateBusinessDays, parseISODate, toLocalDateString } from './dateUtils';

interface UsageCounters {
  vacation: number;
  administrative: number;
  sickLeave: number;
}

const createCounters = (): UsageCounters => ({
  vacation: 0,
  administrative: 0,
  sickLeave: 0,
});

/**
 * Rebuilds employee used-day counters from approved requests.
 * Totals remain unchanged; only consumed balances are recalculated.
 */
export const recalculateEmployeeUsage = (
  employees: Employee[],
  requests: LeaveRequest[],
  referenceYear: number = new Date().getFullYear()
): Employee[] => {
  const usageByEmployee = new Map<string, UsageCounters>();
  const periodStart = new Date(referenceYear, 0, 1);
  const periodEnd = new Date(referenceYear, 11, 31);

  requests.forEach((request) => {
    if (request.status !== LeaveStatus.APPROVED) {
      return;
    }

    const requestStart = parseISODate(request.startDate);
    const requestEnd = parseISODate(request.endDate);
    if (Number.isNaN(requestStart.getTime()) || Number.isNaN(requestEnd.getTime())) {
      return;
    }

    if (requestStart > periodEnd || requestEnd < periodStart) {
      return;
    }

    const overlapStart = requestStart < periodStart ? periodStart : requestStart;
    const overlapEnd = requestEnd > periodEnd ? periodEnd : requestEnd;
    const overlapDays = calculateBusinessDays(
      toLocalDateString(overlapStart),
      toLocalDateString(overlapEnd),
      request.type,
      request.shift
    );

    if (overlapDays <= 0) {
      return;
    }

    const counters = usageByEmployee.get(request.employeeId) || createCounters();

    if (request.type === LeaveType.LEGAL_HOLIDAY) {
      counters.vacation += overlapDays;
    } else if (request.type === LeaveType.ADMINISTRATIVE) {
      counters.administrative += overlapDays;
    } else if (request.type === LeaveType.SICK_LEAVE) {
      counters.sickLeave += overlapDays;
    }

    usageByEmployee.set(request.employeeId, counters);
  });

  return employees.map((employee) => {
    const counters = usageByEmployee.get(employee.id) || createCounters();

    return {
      ...employee,
      usedVacationDays: counters.vacation,
      usedAdminDays: counters.administrative,
      usedSickLeaveDays: counters.sickLeave,
    };
  });
};
