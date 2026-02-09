import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType } from '../types';

interface CalendarViewProps {
  requests: LeaveRequest[];
  employees: Employee[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ requests, employees }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Default to Jan 2026 based on data

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
  
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Filter requests for this month
  const monthRequests = requests.filter(req => {
    if (req.status === LeaveStatus.REJECTED) return false;
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);
    return start <= monthEnd && end >= monthStart;
  });

  const getRequestsForDay = (day: number) => {
    const currentDayDate = new Date(year, month, day);
    currentDayDate.setHours(0,0,0,0);
    
    return monthRequests.filter(req => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // Normalize times
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      return currentDayDate >= start && currentDayDate <= end;
    });
  };

  const getTypeColor = (type: LeaveType) => {
    switch (type) {
      case LeaveType.LEGAL_HOLIDAY: return 'bg-blue-100 text-blue-700 border-blue-200';
      case LeaveType.SICK_LEAVE: return 'bg-red-100 text-red-700 border-red-200';
      case LeaveType.ADMINISTRATIVE: return 'bg-purple-100 text-purple-700 border-purple-200';
      case LeaveType.WITHOUT_PAY: return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-indigo-100 text-indigo-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" />
          Calendario de Ausencias
        </h2>
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold w-32 text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-slate-600 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px border-b border-slate-200">
          {/* Empty cells for previous month */}
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`prev-${index}`} className="bg-white min-h-[120px] p-2 opacity-50"></div>
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayRequests = getRequestsForDay(day);
            const isWeekend = (firstDay + index) % 7 >= 5;

            return (
              <div key={day} className={`bg-white min-h-[120px] p-2 transition-colors hover:bg-slate-50 relative group ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                  day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-700'
                }`}>
                  {day}
                </span>
                
                <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] scrollbar-hide">
                  {dayRequests.map(req => {
                    const emp = employees.find(e => e.id === req.employeeId);
                    return (
                      <div 
                        key={req.id} 
                        className={`text-[10px] px-1.5 py-1 rounded border truncate cursor-help ${getTypeColor(req.type)}`}
                        title={`${emp?.firstName} ${emp?.lastName} - ${req.type}`}
                      >
                        {emp?.firstName} {emp?.lastName}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};