import React, { useEffect, useRef } from 'react';
import { Employee, LeaveRequest } from '../types';
import { X, Mail, Briefcase, Building, Calendar, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatDate, parseISODate } from '../utils/dateUtils';
import { getLeaveTypeColor, getStatusColor } from '../utils/colorUtils';

interface EmployeeProfileProps {
  employee: Employee;
  requests: LeaveRequest[];
  onClose: () => void;
}



export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, requests, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus the close button on mount, return focus on unmount
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  // Filter requests for this employee
  const employeeRequests = requests
    .filter(req => req.employeeId === employee.id)
    .sort((a, b) => parseISODate(b.startDate).getTime() - parseISODate(a.startDate).getTime());

  const chartData = [
    { name: 'Disponibles', value: employee.totalVacationDays - employee.usedVacationDays },
    { name: 'Usados', value: employee.usedVacationDays }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${employee.firstName} ${employee.lastName}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
          <div className="flex items-center gap-6">
            <img
              src={employee.avatarUrl}
              alt={`Avatar de ${employee.firstName} ${employee.lastName}`}
              className="w-24 h-24 rounded-full border-4 border-white/20 shadow-lg bg-slate-800"
            />
            <div>
              <h2 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h2>
              <div className="flex items-center gap-4 mt-2 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><Briefcase size={14} aria-hidden="true" /> {employee.position}</span>
                <span className="flex items-center gap-1"><Building size={14} aria-hidden="true" /> {employee.department}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-slate-400 text-sm">
                <Mail size={14} aria-hidden="true" /> {employee.email}
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar perfil"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Stats Cards */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Feriado Legal</h3>
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-3xl font-bold text-slate-800">{employee.totalVacationDays - employee.usedVacationDays}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {employee.totalVacationDays}</span>
                </div>
                <div className="h-10 w-10" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} innerRadius={15} outerRadius={20} dataKey="value" stroke="none">
                        <Cell fill="#cbd5e1" />
                        <Cell fill="#4f46e5" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Días Administrativos</h3>
              <div>
                <span className="text-3xl font-bold text-slate-800">{employee.totalAdminDays - employee.usedAdminDays}</span>
                <span className="text-sm text-slate-400 ml-1">/ {employee.totalAdminDays}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden" role="progressbar" aria-valuenow={employee.totalAdminDays - employee.usedAdminDays} aria-valuemax={employee.totalAdminDays} aria-label="Días administrativos restantes">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${employee.totalAdminDays > 0 ? ((employee.totalAdminDays - employee.usedAdminDays) / employee.totalAdminDays) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Licencias Médicas (Año)</h3>
              <div>
                <span className={`text-3xl font-bold ${employee.usedSickLeaveDays > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {employee.usedSickLeaveDays}
                </span>
                <span className="text-sm text-slate-400 ml-1">días</span>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-slate-500" aria-hidden="true" />
                Historial de Solicitudes
              </h3>
              <span className="text-xs text-slate-400">{employeeRequests.length} registros</span>
            </div>
            {employeeRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Award size={48} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
                <p>No hay registros de ausencias para este funcionario.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" aria-label="Historial de solicitudes del funcionario">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-6 py-3" scope="col">Tipo</th>
                      <th className="px-6 py-3" scope="col">Fechas</th>
                      <th className="px-6 py-3 text-center" scope="col">Días</th>
                      <th className="px-6 py-3" scope="col">Estado</th>
                      <th className="px-6 py-3" scope="col">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getLeaveTypeColor(req.type)}`}>
                            {req.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(req.startDate)} <span className="text-slate-300 mx-1">➜</span> {formatDate(req.endDate)}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-slate-700">
                          {req.daysCount}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={req.reason}>
                          {req.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
