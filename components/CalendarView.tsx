import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { getLeaveTypeColor } from '../utils/colorUtils';
import { HOLIDAYS } from '../constants';
import { formatDate, parseISODate } from '../utils/dateUtils';

interface CalendarViewProps {
  requests: LeaveRequest[];
  employees: Employee[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ requests, employees }) => {
  const [selectedAbsence, setSelectedAbsence] = useState<{
    request: LeaveRequest;
    employeeName: string;
    employeePosition: string;
  } | null>(null);

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRequests = requests
      .filter((request) => request.status === LeaveStatus.APPROVED)
      .map((request) => parseISODate(request.startDate))
      .filter((date) => !Number.isNaN(date.getTime()) && date >= today)
      .sort((a, b) => a.getTime() - b.getTime());

    if (upcomingRequests.length > 0) {
      return new Date(upcomingRequests[0].getFullYear(), upcomingRequests[0].getMonth(), 1);
    }

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');

  const employeeById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, etc. Adjust so 0 = Monday for rendering
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const monthRequests = useMemo(() => {
    return requests.filter(req => {
      if (req.status !== LeaveStatus.APPROVED) return false;
      const start = parseISODate(req.startDate);
      const end = parseISODate(req.endDate);
      return start <= monthEnd && end >= monthStart;
    });
  }, [requests, monthStart, monthEnd]);

  const requestsByDay = useMemo(() => {
    const map = new Map<number, LeaveRequest[]>();

    monthRequests.forEach((req) => {
      const start = parseISODate(req.startDate);
      const end = parseISODate(req.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const rangeStart = start < monthStart ? monthStart : start;
      const rangeEnd = end > monthEnd ? monthEnd : end;
      const cursor = new Date(rangeStart);

      while (cursor <= rangeEnd) {
        const day = cursor.getDate();
        const list = map.get(day) || [];
        list.push(req);
        map.set(day, list);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [monthRequests, monthStart, monthEnd]);

  const monthSummary = useMemo(() => {
    let totalAbsences = 0;
    let busiestDay = 0;
    let maxCount = 0;

    requestsByDay.forEach((dayRequests, day) => {
      totalAbsences += dayRequests.length;
      if (dayRequests.length > maxCount) {
        maxCount = dayRequests.length;
        busiestDay = day;
      }
    });

    return {
      totalAbsences,
      daysWithAbsences: requestsByDay.size,
      busiestDay,
      maxCount,
    };
  }, [requestsByDay]);

  const dayColumnWidth = 36;

  const timelineRows = useMemo(() => {
    const rows = employees.map((employee) => {
      const employeeRequests = monthRequests
        .filter((request) => request.employeeId === employee.id)
        .map((request) => {
          const start = parseISODate(request.startDate);
          const end = parseISODate(request.endDate);
          const overlapStart = start < monthStart ? monthStart : start;
          const overlapEnd = end > monthEnd ? monthEnd : end;
          return {
            request,
            startDay: overlapStart.getDate(),
            endDay: overlapEnd.getDate(),
          };
        })
        .sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay);

      const laneEnds: number[] = [];
      const segments = employeeRequests.map((segment) => {
        let laneIndex = laneEnds.findIndex((lastEnd) => lastEnd < segment.startDay);
        if (laneIndex === -1) {
          laneIndex = laneEnds.length;
          laneEnds.push(segment.endDay);
        } else {
          laneEnds[laneIndex] = segment.endDay;
        }

        return {
          ...segment,
          lane: laneIndex,
        };
      });

      return {
        employee,
        segments,
        laneCount: Math.max(1, laneEnds.length),
      };
    });

    return rows.sort((a, b) => b.segments.length - a.segments.length || a.employee.firstName.localeCompare(b.employee.firstName));
  }, [employees, monthRequests, monthStart, monthEnd]);

  const mobileHighlights = useMemo(() => {
    const list: Array<{ day: number; dayRequests: LeaveRequest[]; dayIsHoliday: boolean }> = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayRequests = requestsByDay.get(day) || [];
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayIsHoliday = HOLIDAYS.includes(dateStr);
      if (dayRequests.length > 0 || dayIsHoliday) {
        list.push({ day, dayRequests, dayIsHoliday });
      }
    }

    return list;
  }, [daysInMonth, requestsByDay, year, month]);

  const isHoliday = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return HOLIDAYS.includes(dateStr);
  };

  const goToTodayMonth = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const openAbsenceDetails = (request: LeaveRequest) => {
    const employee = employeeById.get(request.employeeId);
    setSelectedAbsence({
      request,
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Funcionario',
      employeePosition: employee?.position || 'Cargo no disponible',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-reveal" style={{ animationDelay: '20ms' }}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="text-indigo-600" aria-hidden="true" />
            Calendario de Ausencias
          </h2>
          <p className="text-sm text-slate-500 mt-1">Visualiza ausencias aprobadas, feriados nacionales y carga diaria del equipo.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm" role="group" aria-label="Navegación de meses">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-base md:text-lg font-semibold w-40 md:w-48 text-center" aria-live="polite">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={goToTodayMonth}
            disabled={isCurrentMonth}
            className="ml-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Ir al mes actual"
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 animate-reveal" style={{ animationDelay: '90ms' }}>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${viewMode === 'calendar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          Calendario
        </button>
        <button
          type="button"
          onClick={() => setViewMode('timeline')}
          className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${viewMode === 'timeline' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          Timeline Equipo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-reveal" style={{ animationDelay: '160ms' }}>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ausencias del mes</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{monthSummary.totalAbsences}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Días con ausencias</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{monthSummary.daysWithAbsences}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Máxima carga diaria</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {monthSummary.maxCount > 0 ? `${monthSummary.maxCount} (${monthSummary.busiestDay}/${month + 1})` : '0'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 items-center text-xs" aria-label="Leyenda de colores">
        <span className="text-slate-500 font-medium">Leyenda:</span>
        <span className={`px-2 py-1 rounded border ${getLeaveTypeColor(LeaveType.LEGAL_HOLIDAY)}`}>Feriado Legal</span>
        <span className={`px-2 py-1 rounded border ${getLeaveTypeColor(LeaveType.ADMINISTRATIVE)}`}>Administrativo</span>
        <span className={`px-2 py-1 rounded border ${getLeaveTypeColor(LeaveType.SICK_LEAVE)}`}>Licencia Médica</span>
        <span className={`px-2 py-1 rounded border ${getLeaveTypeColor(LeaveType.WITHOUT_PAY)}`}>Sin Goce</span>
        <span className={`px-2 py-1 rounded border ${getLeaveTypeColor(LeaveType.PARENTAL)}`}>Post Natal</span>
        <span className="px-2 py-1 rounded border bg-amber-50 text-amber-700 border-amber-200">Feriado Nacional</span>
      </div>

      {viewMode === 'calendar' && (
        <>
      <div className="md:hidden bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3 animate-reveal" style={{ animationDelay: '240ms' }} aria-label={`Resumen móvil ${monthNames[month]} ${year}`}>
        {mobileHighlights.length === 0 ? (
          <p className="text-sm text-slate-500">No hay ausencias ni feriados registrados para este mes.</p>
        ) : (
          mobileHighlights.map(({ day, dayRequests, dayIsHoliday }) => (
            <div key={`mobile-${day}`} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{day} de {monthNames[month]}</span>
                <div className="flex items-center gap-2">
                  {dayRequests.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                      {dayRequests.length} ausencia(s)
                    </span>
                  )}
                  {dayIsHoliday && (
                    <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Feriado</span>
                  )}
                </div>
              </div>
              {dayRequests.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {dayRequests.map((req) => {
                    const emp = employeeById.get(req.employeeId);
                    const employeeName = emp ? `${emp.firstName} ${emp.lastName}` : 'Funcionario';
                    return (
                      <button
                        key={`${req.id}-mobile`}
                        type="button"
                        onClick={() => openAbsenceDetails(req)}
                        className={`w-full text-left text-xs px-2 py-1 rounded border hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${getLeaveTypeColor(req.type)}`}
                      >
                        {employeeName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-reveal" style={{ animationDelay: '240ms' }} role="grid" aria-label={`Calendario ${monthNames[month]} ${year}`}>
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50" role="row">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider" role="columnheader">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
          {/* Empty cells for previous month */}
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`prev-${index}`} className="bg-white min-h-[110px] md:min-h-[140px] p-2 opacity-40" role="gridcell" aria-hidden="true"></div>
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayRequests = requestsByDay.get(day) || [];
            const isWeekend = (firstDay + index) % 7 >= 5;
            const dayIsHoliday = isHoliday(day);
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const visibleRequests = dayRequests.slice(0, 3);
            const hiddenCount = Math.max(0, dayRequests.length - visibleRequests.length);

            return (
              <div
                key={day}
                className={`bg-white min-h-[110px] md:min-h-[140px] p-2 transition-colors hover:bg-slate-50 relative group ${isWeekend ? 'bg-slate-50/60' : ''} ${dayIsHoliday ? 'bg-amber-50/40' : ''}`}
                role="gridcell"
                aria-label={`${day} ${monthNames[month]}: ${dayRequests.length > 0 ? `${dayRequests.length} ausencia(s)` : 'Sin ausencias'}${dayIsHoliday ? ' - Feriado Nacional' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${isToday
                      ? 'bg-indigo-600 text-white'
                      : dayIsHoliday
                        ? 'text-amber-600 font-bold'
                        : 'text-slate-700'
                    }`}>
                    {day}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayRequests.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                        {dayRequests.length}
                      </span>
                    )}
                    {dayIsHoliday && (
                      <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Feriado</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mt-1 overflow-y-auto max-h-[90px] md:max-h-[105px] scrollbar-hide">
                  {visibleRequests.map(req => {
                    const emp = employeeById.get(req.employeeId);
                    const employeeName = emp ? `${emp.firstName} ${emp.lastName}` : 'Funcionario';
                    return (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => openAbsenceDetails(req)}
                        className={`w-full text-left text-[10px] md:text-[11px] px-1.5 py-1 rounded border truncate cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${getLeaveTypeColor(req.type)}`}
                        title={`${employeeName} - ${req.type}`}
                        aria-label={`${employeeName}: ${req.type}`}
                      >
                        {employeeName}
                      </button>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <div className="text-[10px] md:text-[11px] px-1.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                      +{hiddenCount} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {viewMode === 'timeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-reveal" style={{ animationDelay: '240ms' }}>
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Timeline de Ausencias del Equipo</h3>
            <p className="text-xs text-slate-500 mt-1">Visualiza solapamientos y carga por funcionario durante {monthNames[month]} {year}.</p>
          </div>

          <div className="overflow-auto">
            <div className="min-w-[1360px]">
              <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white">
                <div className="w-64 shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 border-r border-slate-200">Funcionario</div>
                <div className="flex-1 relative" style={{ width: `${daysInMonth * dayColumnWidth}px` }}>
                  <div className="flex">
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1;
                      const date = new Date(year, month, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const dayIsHoliday = isHoliday(day);

                      return (
                        <div
                          key={`timeline-header-${day}`}
                          className={`h-12 border-r border-slate-100 text-[11px] flex flex-col items-center justify-center ${dayIsHoliday ? 'bg-amber-50 text-amber-700' : isWeekend ? 'bg-slate-50 text-slate-400' : 'text-slate-600'}`}
                          style={{ width: `${dayColumnWidth}px` }}
                        >
                          <span className="font-semibold">{day}</span>
                          <span className="text-[10px]">{['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {timelineRows.map(({ employee, segments, laneCount }) => {
                const rowHeight = laneCount * 26 + 12;
                return (
                  <div key={`timeline-row-${employee.id}`} className="flex border-b border-slate-100 hover:bg-slate-50/40">
                    <div className="w-64 shrink-0 px-3 py-2 border-r border-slate-200">
                      <p className="text-sm font-medium text-slate-800 truncate">{employee.firstName} {employee.lastName}</p>
                      <p className="text-xs text-slate-500 truncate">{employee.department}</p>
                    </div>
                    <div className="relative" style={{ width: `${daysInMonth * dayColumnWidth}px`, height: `${rowHeight}px` }}>
                      {Array.from({ length: daysInMonth }).map((_, index) => {
                        const day = index + 1;
                        const date = new Date(year, month, day);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const dayIsHoliday = isHoliday(day);

                        return (
                          <div
                            key={`timeline-bg-${employee.id}-${day}`}
                            className={`absolute top-0 bottom-0 border-r border-slate-100 ${dayIsHoliday ? 'bg-amber-50/40' : isWeekend ? 'bg-slate-50/70' : ''}`}
                            style={{ left: `${(day - 1) * dayColumnWidth}px`, width: `${dayColumnWidth}px` }}
                            aria-hidden="true"
                          />
                        );
                      })}

                      {segments.map((segment) => {
                        const left = (segment.startDay - 1) * dayColumnWidth + 2;
                        const width = (segment.endDay - segment.startDay + 1) * dayColumnWidth - 4;
                        const top = segment.lane * 26 + 6;
                        const empName = `${employee.firstName} ${employee.lastName}`;
                        const shortLabel = width >= 90 ? `${empName.split(' ')[0]} · ${segment.request.type}` : empName.split(' ')[0];

                        return (
                          <button
                            key={`timeline-segment-${segment.request.id}-${segment.lane}`}
                            type="button"
                            onClick={() => openAbsenceDetails(segment.request)}
                            title={`${empName}: ${segment.request.type} (${formatDate(segment.request.startDate, 'medium')} - ${formatDate(segment.request.endDate, 'medium')})`}
                            className={`absolute h-5 rounded border px-1.5 text-[10px] font-medium truncate text-left hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${getLeaveTypeColor(segment.request.type)}`}
                            style={{ left: `${left}px`, width: `${Math.max(width, 16)}px`, top: `${top}px` }}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedAbsence && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de ausencia"
          onClick={() => setSelectedAbsence(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Detalle de Ausencia</h3>
              <button
                type="button"
                onClick={() => setSelectedAbsence(null)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                aria-label="Cerrar detalle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Funcionario</p>
                <p className="font-semibold text-slate-800">{selectedAbsence.employeeName}</p>
                <p className="text-slate-600">{selectedAbsence.employeePosition}</p>
              </div>

              <div>
                <p className="text-slate-500">Tipo</p>
                <span className={`inline-flex mt-1 px-2 py-1 rounded border text-xs font-semibold ${getLeaveTypeColor(selectedAbsence.request.type)}`}>
                  {selectedAbsence.request.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500">Desde</p>
                  <p className="font-medium text-slate-800">{formatDate(selectedAbsence.request.startDate, 'medium')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Hasta</p>
                  <p className="font-medium text-slate-800">{formatDate(selectedAbsence.request.endDate, 'medium')}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500">Jornada</p>
                <p className="font-medium text-slate-800">{selectedAbsence.request.shift}</p>
              </div>

              {selectedAbsence.request.reason && (
                <div>
                  <p className="text-slate-500">Motivo</p>
                  <p className="font-medium text-slate-800 break-words">{selectedAbsence.request.reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
