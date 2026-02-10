import { AppConfig, Employee, LeaveRequest, LeaveStatus, LeaveType, WorkShift } from '../types';
import { calculateBusinessDays, isValidISODate, parseISODate } from './dateUtils';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isNonNegativeNumber = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;

const isString = (value: unknown): value is string => typeof value === 'string';

const hasValue = (value: string): boolean => value.trim().length > 0;

const nearlyEqual = (a: number, b: number, tolerance = 0.01): boolean => Math.abs(a - b) <= tolerance;

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates that an object has the shape of an Employee.
 * Checks required fields and basic type constraints.
 */
export const validateEmployee = (obj: unknown): obj is Employee => {
    if (!obj || typeof obj !== 'object') return false;
    const e = obj as Record<string, unknown>;
    return (
        isString(e.id) &&
        isString(e.firstName) &&
        isString(e.lastName) &&
        isString(e.email) &&
        isString(e.position) &&
        isString(e.department) &&
        isNonNegativeNumber(e.totalVacationDays) &&
        isNonNegativeNumber(e.usedVacationDays) &&
        isNonNegativeNumber(e.totalAdminDays) &&
        isNonNegativeNumber(e.usedAdminDays) &&
        isNonNegativeNumber(e.totalSickLeaveDays) &&
        isNonNegativeNumber(e.usedSickLeaveDays) &&
        isString(e.avatarUrl) &&
        e.usedVacationDays <= e.totalVacationDays &&
        e.usedAdminDays <= e.totalAdminDays &&
        e.usedSickLeaveDays <= e.totalSickLeaveDays &&
        hasValue(e.id) &&
        hasValue(e.firstName) &&
        hasValue(e.lastName) &&
        hasValue(e.email) &&
        e.email.includes('@')
    );
};

/**
 * Validates that an object has the shape of a LeaveRequest.
 */
export const validateLeaveRequest = (obj: unknown): obj is LeaveRequest => {
    if (!obj || typeof obj !== 'object') return false;
    const r = obj as Record<string, unknown>;
    return (
        isString(r.id) &&
        isString(r.employeeId) &&
        isString(r.startDate) &&
        isString(r.endDate) &&
        isNonNegativeNumber(r.daysCount) &&
        isString(r.reason) &&
        isString(r.type) &&
        isString(r.status) &&
        isString(r.shift) &&
        Object.values(LeaveType).includes(r.type as LeaveType) &&
        Object.values(LeaveStatus).includes(r.status as LeaveStatus) &&
        Object.values(WorkShift).includes(r.shift as WorkShift) &&
        isValidISODate(r.startDate) &&
        isValidISODate(r.endDate) &&
        parseISODate(r.startDate).getTime() <= parseISODate(r.endDate).getTime() &&
        r.daysCount > 0 &&
        ((r.shift as WorkShift) === WorkShift.JC || r.startDate === r.endDate) &&
        ((r.shift as WorkShift) === WorkShift.JC || nearlyEqual(r.daysCount, 0.5)) &&
        hasValue(r.id) &&
        hasValue(r.employeeId)
    );
};

/**
 * Validates an AppConfig object.
 */
export const validateConfig = (obj: unknown): obj is AppConfig => {
    if (!obj || typeof obj !== 'object') return false;
    const c = obj as Record<string, unknown>;

    const carryEnabledOk = c.carryoverVacationEnabled === undefined || typeof c.carryoverVacationEnabled === 'boolean';
    const carryMaxOk = c.carryoverVacationMaxPeriods === undefined || isFiniteNumber(c.carryoverVacationMaxPeriods);
    const adminExpireOk = c.adminDaysExpireAtYearEnd === undefined || typeof c.adminDaysExpireAtYearEnd === 'boolean';
    const reminderDaysOk = c.yearCloseReminderDays === undefined || isFiniteNumber(c.yearCloseReminderDays);

    return (
        isFiniteNumber(c.defaultVacationDays) &&
        isFiniteNumber(c.defaultAdminDays) &&
        isFiniteNumber(c.defaultSickLeaveDays) &&
        isString(c.notificationEmail) &&
        isString(c.emailTemplate) &&
        carryEnabledOk &&
        carryMaxOk &&
        adminExpireOk &&
        reminderDaysOk
    );
};

/**
 * Validates imported data structure (from JSON or Excel).
 * Returns a detailed validation result with errors and warnings.
 *
 * @param data - Parsed import payload
 * @returns ValidationResult with validity status and error/warning messages
 */
export const validateImportData = (data: {
    employees?: unknown[];
    requests?: unknown[];
    config?: unknown;
}): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['El archivo no contiene datos válidos.'], warnings: [] };
    }

    // Validate employees
    if (data.employees !== undefined) {
        if (!Array.isArray(data.employees)) {
            errors.push('La lista de funcionarios no tiene formato de array.');
        } else {
            const invalidEmployeeIndexes = data.employees
                .map((employee, index) => ({ employee, index }))
                .filter(({ employee }) => !validateEmployee(employee))
                .map(({ index }) => index + 1);

            if (invalidEmployeeIndexes.length > 0) {
                errors.push(`Hay funcionarios inválidos en las filas: ${invalidEmployeeIndexes.join(', ')}.`);
            }

            if (data.employees.length === 0) {
                warnings.push('La lista de funcionarios está vacía.');
            }

            const employeeIds = new Set<string>();
            let duplicateEmployeeIds = 0;
            data.employees.forEach((employee) => {
                if (!validateEmployee(employee)) {
                    return;
                }
                if (employeeIds.has(employee.id)) {
                    duplicateEmployeeIds += 1;
                    return;
                }
                employeeIds.add(employee.id);
            });
            if (duplicateEmployeeIds > 0) {
                errors.push(`Se detectaron ${duplicateEmployeeIds} ID(s) de funcionario duplicados.`);
            }
        }
    }

    // Validate requests
    if (data.requests !== undefined) {
        if (!Array.isArray(data.requests)) {
            errors.push('La lista de solicitudes no tiene formato de array.');
        } else {
            const invalidRequestIndexes = data.requests
                .map((request, index) => ({ request, index }))
                .filter(({ request }) => !validateLeaveRequest(request))
                .map(({ index }) => index + 1);

            if (invalidRequestIndexes.length > 0) {
                errors.push(`Hay solicitudes inválidas en las filas: ${invalidRequestIndexes.join(', ')}.`);
            }

            const requestIds = new Set<string>();
            let duplicateRequestIds = 0;
            data.requests.forEach((request) => {
                if (!validateLeaveRequest(request)) {
                    return;
                }
                if (requestIds.has(request.id)) {
                    duplicateRequestIds += 1;
                    return;
                }
                requestIds.add(request.id);
            });
            if (duplicateRequestIds > 0) {
                errors.push(`Se detectaron ${duplicateRequestIds} ID(s) de solicitud duplicados.`);
            }
        }
    }

    // Validate config
    if (data.config !== undefined && !validateConfig(data.config)) {
        errors.push('La configuración importada no tiene una estructura válida.');
    }

    // Cross validation: requests must reference existing employees
    if (Array.isArray(data.employees) && Array.isArray(data.requests)) {
        const validEmployees = data.employees.filter(validateEmployee);
        const validRequests = data.requests.filter(validateLeaveRequest);

        const employeeIds = new Set(validEmployees.map((employee) => employee.id));
        const unknownEmployeeReferences = validRequests.filter((request) => !employeeIds.has(request.employeeId));

        if (unknownEmployeeReferences.length > 0) {
            errors.push(`Hay ${unknownEmployeeReferences.length} solicitud(es) con funcionario inexistente.`);
        }

        // Cross validation: verify daysCount consistency with range/type/shift
        const requestMismatches = validRequests.filter((request) => {
            const expectedDays = calculateBusinessDays(request.startDate, request.endDate, request.type, request.shift);
            return !nearlyEqual(expectedDays, request.daysCount);
        });

        if (requestMismatches.length > 0) {
            errors.push(`Hay ${requestMismatches.length} solicitud(es) con días calculados inconsistentes respecto a fechas, tipo o jornada.`);
        }

        // Cross validation: approved requests must not overlap per employee
        const approvedByEmployee = new Map<string, LeaveRequest[]>();
        validRequests
            .filter((request) => request.status === LeaveStatus.APPROVED)
            .forEach((request) => {
                const list = approvedByEmployee.get(request.employeeId) || [];
                list.push(request);
                approvedByEmployee.set(request.employeeId, list);
            });

        let overlapCount = 0;
        approvedByEmployee.forEach((employeeRequests) => {
            const sorted = [...employeeRequests].sort((a, b) => parseISODate(a.startDate).getTime() - parseISODate(b.startDate).getTime());

            for (let index = 1; index < sorted.length; index += 1) {
                const prevEnd = parseISODate(sorted[index - 1].endDate);
                const currentStart = parseISODate(sorted[index].startDate);
                if (currentStart <= prevEnd) {
                    overlapCount += 1;
                }
            }
        });

        if (overlapCount > 0) {
            errors.push(`Se detectaron ${overlapCount} solapamiento(s) entre solicitudes aprobadas de un mismo funcionario.`);
        }
    }

    // Must have at least some valid data
    if (data.employees === undefined && data.requests === undefined && data.config === undefined) {
        errors.push('El archivo no contiene funcionarios, solicitudes ni configuración.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
};
