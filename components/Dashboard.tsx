import React, { useEffect, useMemo, useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, AppConfig } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, CartesianGrid } from 'recharts';
import { Users, Clock, CheckCircle, CalendarOff, ArrowRight, UserCheck, Mail, Copy, Check, CheckSquare, Square } from 'lucide-react';
import { getTodayString, formatDate, parseISODate } from '../utils/dateUtils';
import { getLeaveTypeColor } from '../utils/colorUtils';
import { generateCategorizedReport } from '../utils/reportUtils';

interface DashboardProps {
  employees: Employee[];
  requests: LeaveRequest[];
  config: AppConfig;
}

const COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#64748b', '#ec4899'];
const TREND_COLORS = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#0ea5e9'];

export const Dashboard: React.FC<DashboardProps> = ({ employees, requests, config }) => {
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const employeeById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const todayStr = getTodayString();

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

    const detailedList = active.map(r => ({
      ...r,
      employee: employeeById.get(r.employeeId),
      isStarting: r.startDate === todayStr
    })).sort((a, b) => (a.isStarting === b.isStarting ? 0 : a.isStarting ? -1 : 1));

    return {
      total: active.length,
      starting: startingToday.length,
      continuing: continuing.length,
      list: detailedList
    };
  }, [requests, employeeById, todayStr]);

  useEffect(() => {
    const activeIds = new Set(dailyAbsences.list.map((item) => item.id));

    setSelectedIds((previous) => {
      const next = new Set(Array.from(previous).filter((id) => activeIds.has(id)));
      let unchanged = next.size === previous.size;

      if (unchanged) {
        for (const id of next) {
          if (!previous.has(id)) {
            unchanged = false;
            break;
          }
        }
      }

      return unchanged ? previous : next;
    });
  }, [dailyAbsences.list]);

  const leaveTypeData = useMemo(() => {
    const data = [
      { name: 'Feriado Legal', value: requests.filter(r => r.type === LeaveType.LEGAL_HOLIDAY).length },
      { name: 'Administrativo', value: requests.filter(r => r.type === LeaveType.ADMINISTRATIVE).length },
      { name: 'Licencia Médica', value: requests.filter(r => r.type === LeaveType.SICK_LEAVE).length },
      { name: 'Sin Goce', value: requests.filter(r => r.type === LeaveType.WITHOUT_PAY).length },
      { name: 'Post Natal', value: requests.filter(r => r.type === LeaveType.PARENTAL).length },
    ];
    return data.filter(d => d.value > 0);
  }, [requests]);

  const departmentTrendData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; monthIndex: number; year: number }[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
      months.push({ key, label: `${label} ${String(year).slice(-2)}`, monthIndex, year });
    }

    const departmentUsage = new Map<string, number>();
    const approvedRequests = requests.filter((request) => request.status === LeaveStatus.APPROVED);

    approvedRequests.forEach((request) => {
      const employee = employeeById.get(request.employeeId);
      if (!employee) return;
      const dept = employee.department || 'Sin Departamento';
      departmentUsage.set(dept, (departmentUsage.get(dept) || 0) + request.daysCount);
    });

    const topDepartments = Array.from(departmentUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dept]) => dept);

    const trendRows = months.map((month) => {
      const base: Record<string, string | number> = { month: month.label };
      topDepartments.forEach((dept) => {
        base[dept] = 0;
      });
      return base;
    });

    approvedRequests.forEach((request) => {
      const employee = employeeById.get(request.employeeId);
      if (!employee) return;
      const dept = employee.department || 'Sin Departamento';
      if (!topDepartments.includes(dept)) return;

      const start = new Date(request.startDate);
      if (Number.isNaN(start.getTime())) return;

      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const rowIndex = months.findIndex((month) => month.key === key);
      if (rowIndex < 0) return;

      const currentValue = Number(trendRows[rowIndex][dept] || 0);
      trendRows[rowIndex][dept] = currentValue + request.daysCount;
    });

    return {
      departments: topDepartments,
      data: trendRows,
    };
  }, [requests, employeeById]);

  const pendingVsLastMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);

    const thisMonthPending = requests.filter((request) => {
      if (request.status !== LeaveStatus.PENDING) return false;
      const start = parseISODate(request.startDate);
      return start.getFullYear() === currentYear && start.getMonth() === currentMonth;
    }).length;

    const previousMonthPending = requests.filter((request) => {
      if (request.status !== LeaveStatus.PENDING) return false;
      const start = parseISODate(request.startDate);
      return start.getFullYear() === previousMonthDate.getFullYear() && start.getMonth() === previousMonthDate.getMonth();
    }).length;

    const delta = thisMonthPending - previousMonthPending;
    return {
      value: thisMonthPending,
      delta,
    };
  }, [requests]);

  const allDailySelected = useMemo(() => {
    return dailyAbsences.list.length > 0 && dailyAbsences.list.every((item) => selectedIds.has(item.id));
  }, [dailyAbsences.list, selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = dailyAbsences.list.map(item => item.id);
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allVisibleSelected = allIds.every((id) => next.has(id));

      if (allVisibleSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const generateReportText = useMemo(() => {
    const todayFormatted = formatDate(todayStr, 'long');

    const hasSelection = selectedIds.size > 0;
    const targetList = hasSelection
      ? dailyAbsences.list.filter(item => selectedIds.has(item.id))
      : dailyAbsences.list;

    const introText = `Estimados,\n\nSe informa el estado diario del personal para hoy ${todayFormatted}, desglosado por tipo de ausencia:\n\n`;

    return generateCategorizedReport(targetList, employees, config, introText);
  }, [selectedIds, dailyAbsences.list, employees, config, todayStr]);

  const handleSendReport = () => {
    const subject = `Estado Diario del Personal - ${formatDate(todayStr)}`;
    const mailto = `mailto:${config.notificationEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(generateReportText)}`;
    window.open(mailto, '_blank');
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-5 py-5 md:px-6 md:py-6 shadow-sm animate-reveal" style={{ animationDelay: '20ms' }}>
        <div className="absolute -top-10 -right-8 w-48 h-48 rounded-full bg-sky-200/30 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-8 w-48 h-48 rounded-full bg-indigo-200/25 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Centro de Control</p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-1">Panorama de Ausencias y Permisos</h2>
          <p className="text-sm text-slate-600 mt-1">Indicadores en tiempo real del estado del equipo y tendencias de uso por departamento.</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Estadísticas generales">
        {[
          {
            title: 'Total Funcionarios',
            value: stats.totalEmployees,
            badge: null,
            icon: <Users size={22} />,
            tone: 'from-sky-100/70 to-blue-50/60 text-blue-700 border-blue-100/80',
          },
          {
            title: 'Solicitudes Pendientes',
            value: pendingVsLastMonth.value,
            badge: pendingVsLastMonth.delta === 0 ? 'Sin cambio' : `${pendingVsLastMonth.delta > 0 ? '+' : ''}${pendingVsLastMonth.delta} vs mes anterior`,
            icon: <Clock size={22} />,
            tone: 'from-amber-100/70 to-yellow-50/60 text-amber-700 border-amber-100/80',
          },
          {
            title: 'Aprobadas (Año)',
            value: stats.approvedRequests,
            badge: null,
            icon: <CheckCircle size={22} />,
            tone: 'from-emerald-100/70 to-teal-50/60 text-emerald-700 border-emerald-100/80',
          },
          {
            title: 'Ausentes Hoy',
            value: dailyAbsences.total,
            badge: dailyAbsences.starting > 0 ? `+${dailyAbsences.starting} inician hoy` : null,
            icon: <CalendarOff size={22} />,
            tone: 'from-rose-100/70 to-pink-50/60 text-rose-700 border-rose-100/80',
          },
        ].map((card, index) => (
          <div
            key={card.title}
            className="group relative rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-reveal"
            style={{ animationDelay: `${80 + index * 70}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{card.title}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{card.value}</h3>
                {card.badge && (
                  <span className="inline-flex mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
                    {card.badge}
                  </span>
                )}
              </div>
              <div className={`p-3 rounded-xl border bg-gradient-to-br ${card.tone} group-hover:scale-105 transition-transform`} aria-hidden="true">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Status List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-reveal" style={{ animationDelay: '380ms' }} role="region" aria-label="Estado diario del personal">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <UserCheck size={20} className="text-indigo-600" aria-hidden="true" />
              Estado Diario del Personal ({formatDate(todayStr)})
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
                aria-label={selectedIds.size > 0 ? "Copiar reporte de selección" : "Copiar reporte completo"}
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
              <button
                onClick={handleSendReport}
                className={`flex items-center gap-2 px-3 py-1.5 border text-sm font-medium rounded-lg transition-all shadow-sm ${selectedIds.size > 0
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                aria-label={selectedIds.size > 0 ? `Enviar reporte de ${selectedIds.size} seleccionados` : 'Enviar reporte completo'}
              >
                <Mail size={16} aria-hidden="true" />
                {selectedIds.size > 0 ? `Enviar Selección (${selectedIds.size})` : 'Enviar Reporte Completo'}
              </button>
            </div>
          )}
        </div>

        {dailyAbsences.total === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-100" aria-hidden="true" />
            <p className="font-medium text-slate-600">Todo el personal se encuentra presente hoy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="Lista de ausencias del día">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3 w-10" scope="col">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-slate-400 hover:text-indigo-600"
                      aria-label={allDailySelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    >
                      {allDailySelected
                        ? <CheckSquare size={18} className="text-indigo-600" />
                        : <Square size={18} />}
                    </button>
                  </th>
                  <th className="px-6 py-3 font-semibold" scope="col">Funcionario</th>
                  <th className="px-6 py-3 font-semibold" scope="col">Estado</th>
                  <th className="px-6 py-3 font-semibold" scope="col">Tipo Permiso</th>
                  <th className="px-6 py-3 font-semibold" scope="col">Retorno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyAbsences.list.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors cursor-pointer ${selectedIds.has(item.id) ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleSelection(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleSelection(item.id);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-selected={selectedIds.has(item.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center text-slate-400" aria-hidden="true">
                        {selectedIds.has(item.id)
                          ? <CheckSquare size={18} className="text-indigo-600" />
                          : <Square size={18} />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.employee?.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full bg-slate-200"
                          aria-hidden="true"
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
                          <ArrowRight size={12} aria-hidden="true" /> Inicia Hoy
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          <Clock size={12} aria-hidden="true" /> En Curso
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm px-2 py-1 rounded border ${getLeaveTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        Hasta el <span className="font-medium text-slate-900">{formatDate(item.endDate)}</span>
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100 xl:col-span-1 animate-reveal" style={{ animationDelay: '460ms' }} role="img" aria-label="Gráfico de distribución por tipo de permiso">
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
                  {leaveTypeData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-100 xl:col-span-2 animate-reveal" style={{ animationDelay: '540ms' }} role="img" aria-label="Tendencia de permisos por departamento">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Tendencia de Uso por Departamento</h3>
          <p className="text-xs text-slate-500 mb-4">Días de permiso aprobados por mes (últimos 6 meses).</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={departmentTrendData.data}>
                <defs>
                  {departmentTrendData.departments.map((dept, index) => (
                    <linearGradient key={`dept-gradient-${dept}`} id={`deptGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TREND_COLORS[index % TREND_COLORS.length]} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={TREND_COLORS[index % TREND_COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                <Legend />
                {departmentTrendData.departments.map((dept, index) => (
                  <Area
                    key={`dept-area-${dept}`}
                    type="monotone"
                    dataKey={dept}
                    stroke={TREND_COLORS[index % TREND_COLORS.length]}
                    fill={`url(#deptGradient${index})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
