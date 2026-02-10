import React, { useEffect, useMemo, useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, AppConfig, WorkShift } from '../types';
import { Copy, Check, ExternalLink, Filter, Calendar, ListChecks } from 'lucide-react';
import { formatDate, getTodayString, parseISODate } from '../utils/dateUtils';
import { getLeaveTypeColor } from '../utils/colorUtils';
import { generateCategorizedReport } from '../utils/reportUtils';

interface ReportsProps {
  employees: Employee[];
  requests: LeaveRequest[];
  config: AppConfig;
}

export const Reports: React.FC<ReportsProps> = ({ employees, requests, config }) => {
  const [copied, setCopied] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());

  const employeeById = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const activeLeaves = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return requests
      .filter(r => r.status === LeaveStatus.APPROVED)
      .filter(r => {
        const endDate = parseISODate(r.endDate);
        endDate.setHours(23, 59, 59, 999);
        return endDate >= now;
      })
      .sort((a, b) => parseISODate(a.startDate).getTime() - parseISODate(b.startDate).getTime());
  }, [requests]);

  const filteredLeaves = useMemo(() => {
    if (selectedType === 'all') return activeLeaves;
    return activeLeaves.filter(r => r.type === selectedType);
  }, [activeLeaves, selectedType]);

  useEffect(() => {
    const activeIds = new Set(activeLeaves.map((request) => request.id));

    setSelectedRequestIds((previous) => {
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

      if (unchanged) {
        return previous;
      }
      return next;
    });
  }, [activeLeaves]);

  const toggleSelection = (id: string) => {
    setSelectedRequestIds((previous) => {
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
    const allFilteredIds = filteredLeaves.map(r => r.id);
    setSelectedRequestIds((previous) => {
      const next = new Set(previous);
      const allVisibleSelected = allFilteredIds.every(id => next.has(id));

      if (allVisibleSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }

      return next;
    });
  };

  // Memoized email body using shared utility
  const emailBody = useMemo(() => {
    const today = formatDate(getTodayString(), 'long');
    const selectedLeaves = activeLeaves.filter(r => selectedRequestIds.has(r.id));

    if (selectedLeaves.length === 0) {
      return `Estimados,\n\nSe informa el detalle de funcionarios ausentes o con permisos programados al ${today}:\n\n(Seleccione funcionarios de la lista para generar el reporte).\n\nSaludos cordiales,\nUnidad de Gestión de Personas`;
    }

    const introText = `Estimados,\n\nSe informa el detalle de funcionarios ausentes o con permisos programados al ${today}, desglosado por tipo de ausencia:\n\n`;
    return generateCategorizedReport(selectedLeaves, employees, config, introText);
  }, [activeLeaves, selectedRequestIds, employees, config]);

  const emailSubject = `Reporte de Ausencias y Permisos - ${new Date().toLocaleDateString('es-CL')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMailClient = () => {
    const mailtoLink = `mailto:${config.notificationEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2 animate-reveal" style={{ animationDelay: '20ms' }}>
        <h2 className="text-2xl font-bold text-slate-800">Generador de Reportes</h2>
        <p className="text-slate-500">Seleccione los funcionarios para generar un informe categorizado por tipo de ausencia para toda la institución.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Selection List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px] animate-reveal" style={{ animationDelay: '120ms' }} role="region" aria-label="Lista de ausencias disponibles">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Filter size={18} className="text-indigo-600" aria-hidden="true" />
                Ausencias Disponibles
              </h3>
              <div className="text-xs text-slate-500" aria-live="polite">
                {selectedRequestIds.size} seleccionados
              </div>
            </div>

            <div className="flex gap-2">
              <label htmlFor="report-filter" className="sr-only">Filtrar por categoría</label>
              <select
                id="report-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                <option value={LeaveType.LEGAL_HOLIDAY}>Solo Feriados Legales</option>
                  <option value={LeaveType.ADMINISTRATIVE}>Solo Administrativos</option>
                  <option value={LeaveType.SICK_LEAVE}>Solo Licencias Médicas</option>
                  <option value={LeaveType.WITHOUT_PAY}>Sin Goce de Sueldo</option>
                  <option value={LeaveType.PARENTAL}>Post Natal Parental</option>
                </select>
              </div>
            </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredLeaves.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Calendar size={48} className="mb-2 opacity-20" aria-hidden="true" />
                <p>No hay ausencias aprobadas para este filtro.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border-b border-slate-50 mb-2 sticky top-0 bg-white z-10 shadow-sm"
                  onClick={toggleSelectAll}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleSelectAll();
                    }
                  }}
                  aria-label={filteredLeaves.every(r => selectedRequestIds.has(r.id)) ? 'Deseleccionar todos los visibles' : 'Seleccionar todos los visibles'}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    checked={filteredLeaves.length > 0 && filteredLeaves.every(r => selectedRequestIds.has(r.id))}
                    readOnly
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <span className="text-sm font-bold text-slate-700">Seleccionar Visibles</span>
                </div>

                {filteredLeaves.map(req => {
                  const emp = employeeById.get(req.employeeId);
                  return (
                    <div
                      key={req.id}
                      onClick={() => toggleSelection(req.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleSelection(req.id);
                        }
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border border-transparent ${selectedRequestIds.has(req.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50'
                        }`}
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={selectedRequestIds.has(req.id)}
                      aria-label={`${emp?.firstName} ${emp?.lastName} - ${req.type}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        checked={selectedRequestIds.has(req.id)}
                        readOnly
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-slate-900 truncate">{emp?.firstName} {emp?.lastName}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap border ${getLeaveTypeColor(req.type)}`}>
                            {req.type}
                          </span>
                        </div>
                        <div className="flex gap-2 items-center mt-0.5">
                          <p className="text-xs text-slate-500">{emp?.position}</p>
                          {req.shift && req.shift !== WorkShift.JC && (
                            <span className="text-[10px] px-1 py-0 bg-amber-50 text-amber-600 border border-amber-100 rounded">
                              {req.shift}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar size={10} aria-hidden="true" />
                          {formatDate(req.startDate)} <span className="text-slate-300">➜</span> {formatDate(req.endDate)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview & Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px] animate-reveal" style={{ animationDelay: '220ms' }} role="region" aria-label="Vista previa del reporte">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <ListChecks size={18} className="text-indigo-600" aria-hidden="true" />
              Vista Previa del Reporte
            </h3>
            <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              Para: <span className="font-medium text-slate-700">{config.notificationEmail}</span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="space-y-2 mb-4">
              <label htmlFor="report-subject" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asunto</label>
              <div id="report-subject" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm font-medium truncate">
                {emailSubject}
              </div>
            </div>

            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <label htmlFor="report-body" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuerpo del Mensaje (Agrupado por Tipo)</label>
              <textarea
                id="report-body"
                readOnly
                value={emailBody}
                className="w-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:outline-none resize-none leading-relaxed"
                aria-label="Vista previa del cuerpo del reporte"
              />
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-4 text-right">
              El sistema usa la plantilla configurada para cada tipo de ausencia.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleOpenMailClient}
                disabled={selectedRequestIds.size === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                aria-label={`Enviar reporte con ${selectedRequestIds.size} funcionarios seleccionados`}
              >
                <ExternalLink size={18} aria-hidden="true" />
                Enviar Reporte
              </button>
              <button
                onClick={handleCopy}
                disabled={selectedRequestIds.size === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border ${copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                aria-label="Copiar reporte al portapapeles"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
