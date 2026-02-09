import React, { useState, useEffect } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, WorkShift } from '../types';
import { Calendar, Check, X, Filter, Clock, FileDown, AlertTriangle } from 'lucide-react';
import { jsPDF } from "jspdf";
import { HOLIDAYS } from '../constants';

interface LeaveRequestsProps {
  requests: LeaveRequest[];
  employees: Employee[];
  updateRequestStatus: (id: string, status: LeaveStatus) => void;
  addNewRequest: (req: Omit<LeaveRequest, 'id' | 'status'>) => void;
  onError: (msg: string) => void;
}

export const LeaveRequests: React.FC<LeaveRequestsProps> = ({ requests, employees, updateRequestStatus, addNewRequest, onError }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: LeaveType.LEGAL_HOLIDAY,
    shift: WorkShift.JC,
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  // Helper: Calculate business days excluding weekends and holidays
  const calculateDaysCount = (startStr: string, endStr: string, type: LeaveType, shift: WorkShift) => {
    if (!startStr || !endStr) return 0;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (end < start) return 0;

    // Normalize to handle dates correctly
    // We treat dates as YYYY-MM-DD strings to avoid timezone issues for holiday comparison
    const currentDate = new Date(start);
    let count = 0;

    // Loop through each day
    while (currentDate <= end) {
      // Create string YYYY-MM-DD for comparison
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
      
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = HOLIDAYS.includes(dateStr);

      // Feriado Legal and Administrativo usually exclude weekends and holidays
      if (type === LeaveType.LEGAL_HOLIDAY || type === LeaveType.ADMINISTRATIVE) {
        if (!isWeekend && !isHoliday) {
          count++;
        }
      } else {
        // Medical leave, etc usually count calendar days
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Adjustment for Half Day Shifts if the duration is effectively 1 day calculated
    // Note: If someone takes 1 week of half days, it's complex, but usually systems count 0.5 per day.
    // Simplified logic: If total range is 1 day (or 0 business days but same start/end) and shift is not JC
    if (startStr === endStr && shift !== WorkShift.JC) {
        return 0.5;
    }

    return count;
  };

  // Recalculate days when dates or type changes
  useEffect(() => {
    const days = calculateDaysCount(formData.startDate, formData.endDate, formData.type, formData.shift);
    setCalculatedDays(days);
  }, [formData.startDate, formData.endDate, formData.type, formData.shift]);


  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.startDate || !formData.endDate) return;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
        onError("La fecha de término no puede ser anterior a la fecha de inicio.");
        return;
    }

    // Overlap validation
    const hasOverlap = requests.some(req => 
        req.employeeId === formData.employeeId &&
        req.status === LeaveStatus.APPROVED &&
        new Date(req.startDate) <= end &&
        new Date(req.endDate) >= start
    );

    if (hasOverlap) {
        onError("El funcionario ya tiene una solicitud aprobada en este rango de fechas.");
        return;
    }
    
    if (calculatedDays === 0 && (formData.type === LeaveType.LEGAL_HOLIDAY || formData.type === LeaveType.ADMINISTRATIVE)) {
        onError("El rango seleccionado no contiene días hábiles.");
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

  const generatePDF = (request: LeaveRequest) => {
    const emp = getEmployee(request.employeeId);
    if (!emp) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RESOLUCIÓN DE FERIADO/PERMISO", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° Solicitud: ${request.id}`, 20, 30);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-CL')}`, 20, 35);

    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    // Employee Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("I. DATOS DEL FUNCIONARIO", 20, 50);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${emp.firstName} ${emp.lastName}`, 30, 60);
    doc.text(`Cargo: ${emp.position}`, 30, 67);
    doc.text(`Departamento: ${emp.department}`, 30, 74);
    doc.text(`Email: ${emp.email}`, 30, 81);

    // Request Details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("II. DETALLE DE LA SOLICITUD", 20, 100);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo de Permiso: ${request.type}`, 30, 110);
    doc.text(`Jornada: ${request.shift || 'Jornada Completa'}`, 30, 117);
    doc.text(`Desde: ${request.startDate}`, 30, 124);
    doc.text(`Hasta: ${request.endDate}`, 100, 124);
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

    // Signatures
    doc.line(30, 240, 90, 240);
    doc.text("Firma Funcionario", 45, 245);

    doc.line(120, 240, 180, 240);
    doc.text("Jefatura / RRHH", 135, 245);

    // Footer
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por Sistema de Gestión HR.", 105, 280, { align: "center" });

    doc.save(`Resolucion_${emp.lastName}_${request.startDate}.pdf`);
  };

  const getShiftBadge = (shift: WorkShift) => {
    const baseClasses = "px-2 py-0.5 rounded text-[10px] font-bold border";
    switch(shift) {
        case WorkShift.JM: return `${baseClasses} bg-orange-50 text-orange-600 border-orange-100`;
        case WorkShift.JT: return `${baseClasses} bg-indigo-50 text-indigo-600 border-indigo-100`;
        default: return `${baseClasses} bg-slate-50 text-slate-600 border-slate-100`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Solicitudes de Permiso</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Calendar size={18} />
          Nueva Solicitud
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-fade-in mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresar Nueva Solicitud</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Funcionario</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.employeeId}
                onChange={e => setFormData({...formData, employeeId: e.target.value})}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Permiso</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
                  >
                    {Object.values(LeaveType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jornada</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: e.target.value as WorkShift})}
                  >
                    <option value={WorkShift.JC}>Completa (JC)</option>
                    <option value={WorkShift.JM}>Mañana (JM)</option>
                    <option value={WorkShift.JT}>Tarde (JT)</option>
                  </select>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
              <input 
                type="date" 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
              <input 
                type="date" 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                required
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="md:col-span-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={18} className="text-indigo-600" />
                    <span className="text-sm text-indigo-900 font-medium">Días a descontar:</span>
                </div>
                <span className="text-lg font-bold text-indigo-700">{calculatedDays} días</span>
            </div>
            {(formData.type === LeaveType.LEGAL_HOLIDAY || formData.type === LeaveType.ADMINISTRATIVE) && (
                <div className="md:col-span-2 flex items-start gap-2 text-xs text-slate-500">
                    <AlertTriangle size={14} className="mt-0.5 text-amber-500" />
                    <p>El cálculo excluye fines de semana y feriados nacionales para Feriado Legal y Administrativo.</p>
                </div>
            )}

             <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
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
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-2 text-slate-500">
             <Filter size={16} />
             <span className="text-sm font-medium">Filtrar por estado: Todos</span>
           </div>
        </div>
        <div className="divide-y divide-slate-100">
          {requests.map((req) => {
            const emp = getEmployee(req.employeeId);
            return (
              <div key={req.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex gap-4">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                     req.type === LeaveType.LEGAL_HOLIDAY ? 'bg-blue-100 text-blue-600' : 
                     req.type === LeaveType.SICK_LEAVE ? 'bg-red-100 text-red-600' : 
                     req.type === LeaveType.ADMINISTRATIVE ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                   }`}>
                     <Calendar size={20} />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-slate-900">{emp?.firstName} {emp?.lastName}</h4>
                        <span className={getShiftBadge(req.shift || WorkShift.JC)}>
                            {req.shift || 'JC'}
                        </span>
                     </div>
                     <p className="text-sm text-slate-500">{req.type} • {req.daysCount} días</p>
                     <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        {req.startDate} a {req.endDate}
                     </p>
                   </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                     ${req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 
                       req.status === LeaveStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                   `}>
                     {req.status}
                   </span>
                   
                   <div className="flex gap-2">
                    {req.status === LeaveStatus.APPROVED && (
                        <button 
                            onClick={() => generatePDF(req)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Descargar Resolución PDF"
                        >
                            <FileDown size={18} />
                        </button>
                    )}

                    {req.status === LeaveStatus.PENDING && (
                        <>
                        <button 
                            onClick={() => updateRequestStatus(req.id, LeaveStatus.APPROVED)}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200 transition-colors" title="Aprobar">
                            <Check size={18} />
                        </button>
                        <button 
                            onClick={() => updateRequestStatus(req.id, LeaveStatus.REJECTED)}
                            className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors" title="Rechazar">
                            <X size={18} />
                        </button>
                        </>
                    )}
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};