import { LeaveType, LeaveStatus, WorkShift } from '../types';

/**
 * Returns Tailwind CSS classes for a leave type badge (background, text, border).
 * Used consistently in Dashboard, LeaveRequests, CalendarView, EmployeeProfile, and Reports.
 */
export const getLeaveTypeColor = (type: LeaveType): string => {
    switch (type) {
        case LeaveType.LEGAL_HOLIDAY:
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case LeaveType.SICK_LEAVE:
            return 'bg-red-50 text-red-700 border-red-200';
        case LeaveType.ADMINISTRATIVE:
            return 'bg-purple-50 text-purple-700 border-purple-200';
        case LeaveType.WITHOUT_PAY:
            return 'bg-gray-100 text-gray-700 border-gray-200';
        case LeaveType.PARENTAL:
            return 'bg-pink-50 text-pink-700 border-pink-200';
        default:
            return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

/**
 * Returns Tailwind CSS classes for leave type icon containers (circle backgrounds).
 */
export const getLeaveTypeIconColor = (type: LeaveType): string => {
    switch (type) {
        case LeaveType.LEGAL_HOLIDAY:
            return 'bg-blue-100 text-blue-600';
        case LeaveType.SICK_LEAVE:
            return 'bg-red-100 text-red-600';
        case LeaveType.ADMINISTRATIVE:
            return 'bg-purple-100 text-purple-600';
        case LeaveType.WITHOUT_PAY:
            return 'bg-gray-100 text-gray-600';
        case LeaveType.PARENTAL:
            return 'bg-pink-100 text-pink-600';
        default:
            return 'bg-slate-100 text-slate-600';
    }
};

/**
 * Returns Tailwind CSS classes for a leave status badge.
 */
export const getStatusColor = (status: LeaveStatus): string => {
    switch (status) {
        case LeaveStatus.APPROVED:
            return 'bg-emerald-100 text-emerald-700';
        case LeaveStatus.REJECTED:
            return 'bg-red-100 text-red-700';
        case LeaveStatus.PENDING:
            return 'bg-amber-100 text-amber-700';
        default:
            return 'bg-slate-100 text-slate-600';
    }
};

/**
 * Returns Tailwind CSS classes for a work shift badge.
 */
export const getShiftBadgeClasses = (shift: WorkShift): string => {
    const base = 'px-2 py-0.5 rounded text-[10px] font-bold border';
    switch (shift) {
        case WorkShift.JM:
            return `${base} bg-orange-50 text-orange-600 border-orange-100`;
        case WorkShift.JT:
            return `${base} bg-indigo-50 text-indigo-600 border-indigo-100`;
        default:
            return `${base} bg-slate-50 text-slate-600 border-slate-100`;
    }
};
