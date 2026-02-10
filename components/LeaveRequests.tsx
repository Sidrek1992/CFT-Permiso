import React, { useState, useMemo } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, WorkShift } from '../types';
import { Calendar, Check, X, Filter, Clock, FileDown, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateBusinessDays, formatDate, parseISODate } from '../utils/dateUtils';
import { getLeaveTypeIconColor, getShiftBadgeClasses, getStatusColor } from '../utils/colorUtils';
import { validateBalanceForRequest } from '../utils/requestRules';

interface LeaveRequestsProps {
  requests: LeaveRequest[];
  employees: Employee[];
  updateRequestStatus: (id: string, status: LeaveStatus) => void;
  addNewRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => void;
  onError: (msg: string) => void;
}

const ITEMS_PER_PAGE = 15;

export const LeaveRequests: React.FC<LeaveRequestsProps> = ({ requests, employees, updateRequestStatus, addNewRequest, onError }) => {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: LeaveType.LEGAL_HOLIDAY,
    shift: WorkShift.JC,
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Computed days count using shared utility
  const calculatedDays = useMemo(() => {
    return calculateBusinessDays(formData.startDate, formData.endDate, formData.type, formData.shift);
  }, [formData.startDate, formData.endDate, formData.type, formData.shift]);

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  // Filtered & paginated requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }
    return filtered;
  }, [requests, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  // Reset page when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.startDate || !formData.endDate) return;

    const start = parseISODate(formData.startDate);
    const end = parseISODate(formData.endDate);

    if (end < start) {
      onError("La fecha de término no puede ser anterior a la fecha de inicio.");
      return;
    }

    // Overlap validation
    const hasOverlap = requests.some(req =>
      req.employeeId === formData.employeeId &&
      req.status === LeaveStatus.APPROVED &&
      parseISODate(req.startDate) <= end &&
      parseISODate(req.endDate) >= start
    );

    if (hasOverlap) {
      onError("El funcionario ya tiene una solicitud aprobada en este rango de fechas.");
      return;
    }

    if (calculatedDays === 0 && (formData.type === LeaveType.LEGAL_HOLIDAY || formData.type === LeaveType.ADMINISTRATIVE)) {
      onError("El rango seleccionado no contiene días hábiles.");
      return;
    }

    const employee = getEmployee(formData.employeeId);
    if (!employee) {
      onError('El funcionario seleccionado no existe. Refresca la vista e intenta nuevamente.');
      return;
    }

    const balanceValidation = validateBalanceForRequest(employee, formData.type, calculatedDays);
    if (!balanceValidation.valid) {
      onError(balanceValidation.message || 'No hay saldo suficiente para esta solicitud.');
      return;
    }

    addNewRequest({
      employeeId: formData.employeeId,
      type: formData.type,
      shift: formData.shift,
      startDate: formData.startDate,
      endDate: formData.endDate,
      daysCount: calculatedDays,
      reason: formData.reason
    });
    setShowForm(false);
    setFormData({
      employeeId: '',
      type: LeaveType.LEGAL_HOLIDAY,
      shift: WorkShift.JC,
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const generatePDF = async (request: LeaveRequest) => {
    const emp = getEmployee(request.employeeId);
    if (!emp) return;

    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RESOLUCIÓN DE FERIADO/PERMISO", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° Solicitud: ${request.id}`, 20, 30);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-CL')}`, 20, 35);

    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("I. DATOS DEL FUNCIONARIO", 20, 50);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${emp.firstName} ${emp.lastName}`, 30, 60);
    doc.text(`Cargo: ${emp.position}`, 30, 67);
    doc.text(`Departamento: ${emp.department}`, 30, 74);
    doc.text(`Email: ${emp.email}`, 30, 81);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("II. DETALLE DE LA SOLICITUD", 20, 100);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo de Permiso: ${request.type}`, 30, 110);
    doc.text(`Jornada: ${request.shift || 'Jornada Completa'}`, 30, 117);
    doc.text(`Desde: ${formatDate(request.startDate)}`, 30, 124);
    doc.text(`Hasta: ${formatDate(request.endDate)}`, 100, 124);
    doc.text(`Días Totales Calculados: ${request.daysCount}`, 30, 131);

    if (request.reason) {
      doc.text(`Motivo/Observación: ${request.reason}`, 30, 140, { maxWidth: 160 });
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("III. RESOLUCIÓN", 20, 160);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Estado: ${request.status.toUpperCase()}`, 30, 170);

    doc.line(30, 240, 90, 240);
    doc.text("Firma Funcionario", 45, 245);

    doc.line(120, 240, 180, 240);
    doc.text("Jefatura / RRHH", 135, 245);

    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por Sistema de Gestión HR.", 105, 280, { align: "center" });

    doc.save(`Resolucion_${emp.lastName}_${request.startDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Solicitudes de Permiso</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          aria-label="Nueva solicitud de permiso"
        >
          <Calendar size={18} aria-hidden="true" />
          Nueva Solicitud
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-fade-in mb-6" role="dialog" aria-label="Formulario de nueva solicitud">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresar Nueva Solicitud</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Datos de la solicitud">
            <div>
              <label htmlFor="req-employee" className="block text-sm font-medium text-slate-700 mb-1">Funcionario</label>
              <select
                id="req-employee"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="req-type" className="block text-sm font-medium text-slate-700 mb-1">Tipo de Permiso</label>
                <select
                  id="req-type"
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as LeaveType })}
                >
                  {Object.values(LeaveType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="req-shift" className="block text-sm font-medium text-slate-700 mb-1">Jornada</label>
                <select
                  id="req-shift"
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  value={formData.shift}
                  onChange={e => setFormData({ ...formData, shift: e.target.value as WorkShift })}
                >
                  <option value={WorkShift.JC}>Completa (JC)</option>
                  <option value={WorkShift.JM}>Mañana (JM)</option>
                  <option value={WorkShift.JT}>Tarde (JT)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="req-start" className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
              <input
                id="req-start"
                type="date"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="req-end" className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
              <input
                id="req-end"
                type="date"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="md:col-span-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center justify-between" aria-live="polite">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-indigo-600" aria-hidden="true" />
                <span className="text-sm text-indigo-900 font-medium">Días a descontar:</span>
              </div>
              <span className="text-lg font-bold text-indigo-700">{calculatedDays} días</span>
            </div>
            {(formData.type === LeaveType.LEGAL_HOLIDAY || formData.type === LeaveType.ADMINISTRATIVE) && (
              <div className="md:col-span-2 flex items-start gap-2 text-xs text-slate-500">
                <AlertTriangle size={14} className="mt-0.5 text-amber-500" aria-hidden="true" />
                <p>El cálculo excluye fines de semana y feriados nacionales para Feriado Legal y Administrativo.</p>
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="req-reason" className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
              <textarea
                id="req-reason"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              ></textarea>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md"
              >
                Guardar Solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Functional Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" aria-hidden="true" />
              <label htmlFor="filter-status" className="text-sm font-medium text-slate-600">Estado:</label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value={LeaveStatus.PENDING}>Pendientes</option>
                <option value={LeaveStatus.APPROVED}>Aprobadas</option>
                <option value={LeaveStatus.REJECTED}>Rechazadas</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="filter-type" className="text-sm font-medium text-slate-600">Tipo:</label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => handleTypeFilterChange(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Todos</option>
                {Object.values(LeaveType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Mostrando {paginatedRequests.length} de {filteredRequests.length} solicitudes
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
              <p className="font-medium text-slate-600">No hay solicitudes que coincidan con los filtros.</p>
            </div>
          ) : (
            paginatedRequests.map((req) => {
              const emp = getEmployee(req.employeeId);
              return (
                <div key={req.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getLeaveTypeIconColor(req.type)}`} aria-hidden="true">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-slate-900">{emp?.firstName} {emp?.lastName}</h4>
                        <span className={getShiftBadgeClasses(req.shift || WorkShift.JC)}>
                          {req.shift || 'JC'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{req.type} • {req.daysCount} días</p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={12} aria-hidden="true" />
                        {formatDate(req.startDate)} a {formatDate(req.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>

                    <div className="flex gap-2">
                      {req.status === LeaveStatus.APPROVED && (
                        <button
                          onClick={() => {
                            void generatePDF(req);
                          }}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                          title="Descargar Resolución PDF"
                          aria-label={`Descargar PDF de resolución para ${emp?.firstName} ${emp?.lastName}`}
                        >
                          <FileDown size={18} />
                        </button>
                      )}

                      {req.status === LeaveStatus.PENDING && (
                        <>
                          <button
                            onClick={() => updateRequestStatus(req.id, LeaveStatus.APPROVED)}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors"
                            title="Aprobar"
                            aria-label={`Aprobar solicitud de ${emp?.firstName} ${emp?.lastName}`}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => updateRequestStatus(req.id, LeaveStatus.REJECTED)}
                            className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
                            title="Rechazar"
                            aria-label={`Rechazar solicitud de ${emp?.firstName} ${emp?.lastName}`}
                          >
                            <X size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-indigo-600'
                    }`}
                  aria-label={`Ir a página ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-white transition-colors"
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
