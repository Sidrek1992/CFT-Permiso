import React, { useMemo, useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, AppConfig, WorkShift } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, Clock, CheckCircle, CalendarOff, ArrowRight, UserCheck, Mail, Copy, Check, CheckSquare, Square } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  requests: LeaveRequest[];
  config: AppConfig;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC<DashboardProps> = ({ employees, requests, config }) => {
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Calculate today's date string in local time YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const stats = useMemo(() => {
    return {
      totalEmployees: employees.length,
      pendingRequests: requests.filter(r => r.status === LeaveStatus.PENDING).length,
      approvedRequests: requests.filter(r => r.status === LeaveStatus.APPROVED).length,
    };
  }, [employees, requests]);

  const dailyAbsences = useMemo(() => {
    const active = requests.filter(r => 
      r.status === LeaveStatus.APPROVED && 
      r.startDate <= todayStr && 
      r.endDate >= todayStr
    );

    const startingToday = active.filter(r => r.startDate === todayStr);
    const continuing = active.filter(r => r.startDate < todayStr);
    
    // Enrich data with employee info
    const detailedList = active.map(r => ({
      ...r,
      employee: employees.find(e => e.id === r.employeeId),
      isStarting: r.startDate === todayStr
    })).sort((a, b) => (a.isStarting === b.isStarting ? 0 : a.isStarting ? -1 : 1)); // Show starting first

    return {
      total: active.length,
      starting: startingToday.length,
      continuing: continuing.length,
      list: detailedList
    };
  }, [requests, employees, todayStr]);

  const leaveTypeData = useMemo(() => {
    const data = [
      { name: 'Feriado Legal', value: requests.filter(r => r.type === LeaveType.LEGAL_HOLIDAY).length },
      { name: 'Administrativo', value: requests.filter(r => r.type === LeaveType.ADMINISTRATIVE).length },
      { name: 'Licencia Médica', value: requests.filter(r => r.type === LeaveType.SICK_LEAVE).length },
    ];
    return data.filter(d => d.value > 0);
  }, [requests]);

  const departmentData = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    employees.forEach(e => {
      deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
    });
    return Object.entries(deptCounts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === dailyAbsences.list.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = dailyAbsences.list.map(item => item.id);
      setSelectedIds(new Set(allIds));
    }
  };

  const getShiftText = (shift: WorkShift) => {
     if (shift === WorkShift.JM) return "Jornada Mañana";
     if (shift === WorkShift.JT) return "Jornada Tarde";
     return "Jornada Completa";
  };

  const generateReportText = () => {
    const todayFormatted = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Determine which list to use: Selected subset OR All if nothing selected
    const hasSelection = selectedIds.size > 0;
    const targetList = hasSelection 
        ? dailyAbsences.list.filter(item => selectedIds.has(item.id)) 
        : dailyAbsences.list;

    let body = `Estimados,\n\nSe informa el estado diario del personal para hoy ${todayFormatted}, desglosado por tipo de ausencia:\n\n`;

    if (targetList.length === 0) {
        body += "No hay funcionarios seleccionados o ausentes.\n";
    } else {
        // Define priority order for categories
        const categories = [
            LeaveType.LEGAL_HOLIDAY,
            LeaveType.ADMINISTRATIVE,
            LeaveType.SICK_LEAVE,
            LeaveType.WITHOUT_PAY,
            LeaveType.PARENTAL
        ];

        let hasOutput = false;

        categories.forEach(type => {
            // Filter the target list by current type
            const group = targetList.filter(item => item.type === type);
            
            if (group.length > 0) {
                hasOutput = true;
                body += `=== ${type.toUpperCase()} ===\n`;
                
                group.forEach(item => {
                    const emp = item.employee;
                    if(emp) {
                         // Select specific template based on type, fallback to general
                        let template = config.emailTemplate;
                        if (item.type === LeaveType.LEGAL_HOLIDAY && config.templateLegalHoliday) {
                            template = config.templateLegalHoliday;
                        } else if (item.type === LeaveType.ADMINISTRATIVE && config.templateAdministrative) {
                            template = config.templateAdministrative;
                        } else if (item.type === LeaveType.SICK_LEAVE && config.templateSickLeave) {
                            template = config.templateSickLeave;
                        }

                        let line = template || "- {NOMBRE}: {JORNADA} desde {DESDE} hasta {HASTA}.";
                        
                        // Replace variables
                        line = line.replace(/{NOMBRE}/g, `${emp.firstName} ${emp.lastName}`);
                        line = line.replace(/{CARGO}/g, emp.position);
                        line = line.replace(/{TIPO}/g, item.type); // Keeping it even if redundant for context
                        line = line.replace(/{JORNADA}/g, getShiftText(item.shift || WorkShift.JC));
                        line = line.replace(/{DESDE}/g, item.startDate);
                        line = line.replace(/{HASTA}/g, item.endDate);
                        line = line.replace(/{MOTIVO}/g, item.reason || '');

                        body += `${line}\n`;
                    } else {
                        // Fallback simple line if employee not found
                         body += `- Desconocido: Hasta el ${item.endDate}\n`;
                    }
                });
                body += '\n';
            }
        });

        if (!hasOutput) {
            body += "No hay ausencias registradas en la selección.\n";
        }
    }

    body += `Total reportados: ${targetList.length}\n\nSaludos cordiales,\nUnidad de Gestión de Personas`;
    return body;
  };

  const handleSendReport = () => {
    const subject = `Estado Diario del Personal - ${todayStr}`;
    const body = generateReportText();
    const mailto = `mailto:${config.notificationEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  const handleCopyReport = () => {
    const body = generateReportText();
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Funcionarios</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.totalEmployees}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Solicitudes Pendientes</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.pendingRequests}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Aprobadas (Año)</p>
            <h3 className="text-3xl font-bold text-slate-800">{stats.approvedRequests}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">Ausentes Hoy</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-slate-800">{dailyAbsences.total}</h3>
                {dailyAbsences.starting > 0 && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +{dailyAbsences.starting} inician
                    </span>
                )}
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <CalendarOff size={24} />
          </div>
        </div>
      </div>

      {/* Daily Status List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck size={20} className="text-indigo-600" />
                    Estado Diario del Personal ({todayStr})
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                    {selectedIds.size > 0 
                        ? `${selectedIds.size} seleccionados para reporte` 
                        : `${dailyAbsences.total > 0 ? 'Seleccione funcionarios para reporte parcial' : 'Sin novedades'}`}
                </span>
            </div>
            
            {dailyAbsences.total > 0 && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCopyReport}
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        title={selectedIds.size > 0 ? "Copiar reporte de selección" : "Copiar reporte completo"}
                    >
                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    </button>
                    <button 
                        onClick={handleSendReport}
                        className={`flex items-center gap-2 px-3 py-1.5 border text-sm font-medium rounded-lg transition-all shadow-sm ${
                            selectedIds.size > 0 
                                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                    >
                        <Mail size={16} />
                        {selectedIds.size > 0 ? `Enviar Selección (${selectedIds.size})` : 'Enviar Reporte Completo'}
                    </button>
                </div>
            )}
        </div>
        
        {dailyAbsences.total === 0 ? (
            <div className="p-8 text-center text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-3 text-emerald-100" />
                <p className="font-medium text-slate-600">Todo el personal se encuentra presente hoy.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <button onClick={toggleSelectAll} className="flex items-center justify-center text-slate-400 hover:text-indigo-600">
                                    {selectedIds.size === dailyAbsences.total && dailyAbsences.total > 0 
                                        ? <CheckSquare size={18} className="text-indigo-600" /> 
                                        : <Square size={18} />}
                                </button>
                            </th>
                            <th className="px-6 py-3 font-semibold">Funcionario</th>
                            <th className="px-6 py-3 font-semibold">Estado</th>
                            <th className="px-6 py-3 font-semibold">Tipo Permiso</th>
                            <th className="px-6 py-3 font-semibold">Retorno</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {dailyAbsences.list.map((item) => (
                            <tr 
                                key={item.id} 
                                className={`transition-colors cursor-pointer ${selectedIds.has(item.id) ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                                onClick={() => toggleSelection(item.id)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center text-slate-400">
                                        {selectedIds.has(item.id) 
                                            ? <CheckSquare size={18} className="text-indigo-600" /> 
                                            : <Square size={18} />}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={item.employee?.avatarUrl} 
                                            alt={item.employee?.firstName} 
                                            className="w-8 h-8 rounded-full bg-slate-200"
                                        />
                                        <div>
                                            <p className={`text-sm font-bold ${selectedIds.has(item.id) ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {item.employee?.firstName} {item.employee?.lastName}
                                            </p>
                                            <p className="text-xs text-slate-500">{item.employee?.position}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {item.isStarting ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            <ArrowRight size={12} /> Inicia Hoy
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                            <Clock size={12} /> En Curso
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-sm px-2 py-1 rounded ${
                                        item.type === LeaveType.LEGAL_HOLIDAY ? 'bg-blue-50 text-blue-700' :
                                        item.type === LeaveType.SICK_LEAVE ? 'bg-red-50 text-red-700' :
                                        item.type === LeaveType.ADMINISTRATIVE ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-600">
                                        Hasta el <span className="font-medium text-slate-900">{item.endDate}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribución por Tipo de Permiso</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Funcionarios por Departamento</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};