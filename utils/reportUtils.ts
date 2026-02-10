import { Employee, LeaveRequest, LeaveType, AppConfig, WorkShift } from '../types';
import { getShiftText } from './dateUtils';

/**
 * Replaces template variables with actual request/employee data.
 *
 * Available variables: {NOMBRE}, {CARGO}, {TIPO}, {JORNADA}, {DESDE}, {HASTA}, {MOTIVO}
 *
 * @param template - Template string with {VARIABLE} placeholders
 * @param emp - Employee data
 * @param request - Leave request data
 * @returns Populated template string
 */
export const populateTemplate = (
    template: string,
    emp: Employee,
    request: LeaveRequest
): string => {
    let line = template || '- {NOMBRE}: {JORNADA} desde {DESDE} hasta {HASTA}.';

    line = line.replace(/{NOMBRE}/g, `${emp.firstName} ${emp.lastName}`);
    line = line.replace(/{CARGO}/g, emp.position);
    line = line.replace(/{TIPO}/g, request.type);
    line = line.replace(/{JORNADA}/g, getShiftText(request.shift || WorkShift.JC));
    line = line.replace(/{DESDE}/g, request.startDate);
    line = line.replace(/{HASTA}/g, request.endDate);
    line = line.replace(/{MOTIVO}/g, request.reason || '');

    return line;
};

/**
 * Selects the appropriate email template based on leave type.
 * Falls back to the general template if a specific one isn't configured.
 *
 * @param type - Leave type
 * @param config - App configuration containing templates
 * @returns Template string for the given leave type
 */
export const getTemplateForType = (type: LeaveType, config: AppConfig): string => {
    switch (type) {
        case LeaveType.LEGAL_HOLIDAY:
            return config.templateLegalHoliday || config.emailTemplate;
        case LeaveType.ADMINISTRATIVE:
            return config.templateAdministrative || config.emailTemplate;
        case LeaveType.SICK_LEAVE:
            return config.templateSickLeave || config.emailTemplate;
        default:
            return config.emailTemplate;
    }
};

/**
 * Generates a categorized report body text from a list of leave requests.
 * Groups requests by leave type in a defined priority order.
 *
 * This function replaces the duplicated logic that was previously in both
 * Dashboard.tsx (generateReportText) and Reports.tsx (generateEmailBody).
 *
 * @param targetRequests - List of leave requests to include in the report
 * @param employees - Full list of employees (for name/position lookup)
 * @param config - App configuration (for templates)
 * @param introText - Custom introduction paragraph
 * @returns Formatted report body string
 */
export const generateCategorizedReport = (
    targetRequests: LeaveRequest[],
    employees: Employee[],
    config: AppConfig,
    introText: string
): string => {
    let body = introText;

    if (targetRequests.length === 0) {
        body += 'No hay funcionarios seleccionados o ausentes.\n';
    } else {
        const categories = [
            LeaveType.LEGAL_HOLIDAY,
            LeaveType.ADMINISTRATIVE,
            LeaveType.SICK_LEAVE,
            LeaveType.WITHOUT_PAY,
            LeaveType.PARENTAL,
        ];

        let hasOutput = false;

        categories.forEach((type) => {
            const group = targetRequests.filter((item) => item.type === type);

            if (group.length > 0) {
                hasOutput = true;
                body += `=== ${type.toUpperCase()} ===\n`;

                group.forEach((item) => {
                    const emp = employees.find((e) => e.id === item.employeeId);
                    if (emp) {
                        const template = getTemplateForType(item.type, config);
                        body += `${populateTemplate(template, emp, item)}\n`;
                    } else {
                        body += `- Desconocido: Hasta el ${item.endDate}\n`;
                    }
                });
                body += '\n';
            }
        });

        if (!hasOutput) {
            body += 'No hay ausencias registradas en la selección.\n';
        }
    }

    body += `Total reportados: ${targetRequests.length}\n\nSaludos cordiales,\nUnidad de Gestión de Personas`;
    return body;
};
