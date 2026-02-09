import React from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { X, Mail, Briefcase, Building, Calendar, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface EmployeeProfileProps {
  employee: Employee;
  requests: LeaveRequest[];
  onClose: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, requests, onClose }) => {
  // Filter requests for this employee
  const employeeRequests = requests
    .filter(req => req.employeeId === employee.id)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const chartData = [
    { name: 'Disponibles', value: employee.totalVacationDays - employee.usedVacationDays },
    { name: 'Usados', value: employee.usedVacationDays }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
          <div className="flex items-center gap-6">
            <img 
              src={employee.avatarUrl} 
              alt={employee.firstName} 
              className="w-24 h-24 rounded-full border-4 border-white/20 shadow-lg bg-slate-800"
            />
            <div>
              <h2 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h2>
              <div className="flex items-center gap-4 mt-2 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><Briefcase size={14} /> {employee.position}</span>
                <span className="flex items-center gap-1"><Building size={14} /> {employee.department}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-slate-400 text-sm">
                <Mail size={14} /> {employee.email}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
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
                <div className="h-10 w-10">
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
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full" 
                  style={{ width: `${((employee.totalAdminDays - employee.usedAdminDays) / employee.totalAdminDays) * 100}%` }}
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
                <Calendar size={18} className="text-slate-500" />
                Historial de Solicitudes
              </h3>
            </div>
            {employeeRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Award size={48} className="mx-auto mb-3 opacity-20" />
                <p>No hay registros de ausencias para este funcionario.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Fechas</th>
                    <th className="px-6 py-3 text-center">Días</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          req.type === LeaveType.LEGAL_HOLIDAY ? 'bg-blue-50 text-blue-700' :
                          req.type === LeaveType.SICK_LEAVE ? 'bg-red-50 text-red-700' :
                          req.type === LeaveType.ADMINISTRATIVE ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {req.startDate} <span className="text-slate-300 mx-1">➜</span> {req.endDate}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {req.daysCount}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-800' :
                          req.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {req.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};