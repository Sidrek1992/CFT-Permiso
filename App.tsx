import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EmployeeList } from './components/EmployeeList';
import { LeaveRequests } from './components/LeaveRequests';
import { AIAssistant } from './components/AIAssistant';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { CalendarView } from './components/CalendarView';
import { EmployeeProfile } from './components/EmployeeProfile';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { INITIAL_EMPLOYEES, INITIAL_REQUESTS } from './constants';
import { AppConfig, Employee, LeaveRequest, LeaveStatus, LeaveType, Notification } from './types';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    defaultVacationDays: 15,
    defaultAdminDays: 6,
    defaultSickLeaveDays: 30,
    notificationEmail: 'rrhh@institucion.cl',
    emailTemplate: "- {NOMBRE} ({CARGO}): {TIPO} {JORNADA} desde el {DESDE} hasta el {HASTA}.",
    templateLegalHoliday: "- {NOMBRE} ({CARGO}): Hará uso de Feriado Legal {JORNADA} desde el {DESDE} hasta el {HASTA}.",
    templateAdministrative: "- {NOMBRE} ({CARGO}): Solicitó Permiso Administrativo {JORNADA} el día {DESDE} (Retorna: {HASTA}).",
    templateSickLeave: "- {NOMBRE} ({CARGO}): Presenta Licencia Médica desde el {DESDE} hasta el {HASTA}."
  });

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('hrAppData');
    const savedAuth = sessionStorage.getItem('hrAppAuth');
    
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.requests) setRequests(parsed.requests);
        if (parsed.config) {
            // Merge defaults for backward compatibility if new keys don't exist in local storage
            setConfig(prev => ({
                ...prev,
                ...parsed.config
            }));
        }
      } catch (e) {
        console.error("Error loading local storage", e);
      }
    }
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    const dataToSave = { employees, requests, config };
    localStorage.setItem('hrAppData', JSON.stringify(dataToSave));
  }, [employees, requests, config]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('hrAppAuth', 'true');
    addNotification('Bienvenido al sistema', 'success');
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      message,
      type
    };
    setNotifications(prev => [...prev, newNotif]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNewRequest = (newRequestData: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newRequest: LeaveRequest = {
      ...newRequestData,
      id: Date.now().toString(),
      status: LeaveStatus.PENDING
    };
    setRequests([newRequest, ...requests]);
    addNotification('Solicitud creada correctamente', 'success');
  };

  const handleAddEmployee = (data: { firstName: string; lastName: string; email: string; position: string; department: string }) => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      position: data.position,
      department: data.department,
      totalVacationDays: config.defaultVacationDays,
      usedVacationDays: 0,
      totalAdminDays: config.defaultAdminDays,
      usedAdminDays: 0,
      totalSickLeaveDays: config.defaultSickLeaveDays,
      usedSickLeaveDays: 0,
      avatarUrl: `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=random&color=fff`
    };
    setEmployees([...employees, newEmployee]);
    addNotification('Funcionario registrado con éxito', 'success');
  };

  const handleEditEmployee = (id: string, data: { firstName: string; lastName: string; email: string; position: string; department: string }) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, ...data, avatarUrl: `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=random&color=fff` } : emp
    ));
    addNotification('Datos del funcionario actualizados', 'success');
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este funcionario? Esta acción no se puede deshacer.')) {
      setEmployees(employees.filter(emp => emp.id !== id));
      setRequests(requests.filter(req => req.employeeId !== id));
      addNotification('Funcionario eliminado', 'info');
    }
  };

  const updateRequestStatus = (id: string, status: LeaveStatus) => {
    setRequests(requests.map(req => {
      if (req.id === id) {
        // If approving, simple logic to deduct days
        if (status === LeaveStatus.APPROVED && req.status !== LeaveStatus.APPROVED) {
          setEmployees(currentEmployees => 
            currentEmployees.map(emp => {
              if (emp.id === req.employeeId) {
                if (req.type === LeaveType.LEGAL_HOLIDAY) {
                   return { ...emp, usedVacationDays: emp.usedVacationDays + req.daysCount };
                } else if (req.type === LeaveType.ADMINISTRATIVE) {
                   return { ...emp, usedAdminDays: emp.usedAdminDays + req.daysCount };
                } else if (req.type === LeaveType.SICK_LEAVE) {
                   return { ...emp, usedSickLeaveDays: emp.usedSickLeaveDays + req.daysCount };
                }
              }
              return emp;
            })
          );
          addNotification('Solicitud aprobada y saldos actualizados', 'success');
        } else if (status === LeaveStatus.REJECTED) {
            addNotification('Solicitud rechazada', 'info');
        }
        return { ...req, status };
      }
      return req;
    }));
  };

  const handleSaveConfig = (newConfig: AppConfig, applyToAll: boolean) => {
    setConfig(newConfig);
    if (applyToAll) {
      setEmployees(currentEmployees => 
        currentEmployees.map(emp => ({
          ...emp,
          totalVacationDays: newConfig.defaultVacationDays,
          totalAdminDays: newConfig.defaultAdminDays,
          totalSickLeaveDays: newConfig.defaultSickLeaveDays
        }))
      );
      addNotification('Configuración aplicada a todos los funcionarios', 'success');
    } else {
      addNotification('Configuración guardada', 'success');
    }
  };

  const handleImportData = (data: { employees: Employee[], requests: LeaveRequest[], config: AppConfig }) => {
    if (data.employees) setEmployees(data.employees);
    if (data.requests) setRequests(data.requests);
    if (data.config) setConfig(data.config);
    addNotification('Datos importados correctamente', 'success');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard employees={employees} requests={requests} config={config} />;
      case 'employees':
        return <EmployeeList 
          employees={employees} 
          onAddEmployee={handleAddEmployee} 
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onViewProfile={setSelectedEmployee}
        />;
      case 'requests':
        return <LeaveRequests 
          requests={requests} 
          employees={employees} 
          updateRequestStatus={updateRequestStatus}
          addNewRequest={addNewRequest}
          onError={(msg) => addNotification(msg, 'error')}
        />;
      case 'calendar':
        return <CalendarView requests={requests} employees={employees} />;
      case 'reports':
        return <Reports employees={employees} requests={requests} config={config} />;
      case 'ai-assistant':
        return <AIAssistant employees={employees} requests={requests} />;
      case 'settings':
        return <Settings 
          config={config} 
          employees={employees}
          requests={requests}
          onSave={handleSaveConfig} 
          onImport={handleImportData}
        />;
      default:
        return <Dashboard employees={employees} requests={requests} config={config} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
            {notifications.map(n => (
            <Toast key={n.id} notification={n} onClose={removeNotification} />
            ))}
        </div>
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onClose={removeNotification} />
        ))}
      </div>

      {/* Employee Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfile 
            employee={selectedEmployee} 
            requests={requests} 
            onClose={() => setSelectedEmployee(null)} 
        />
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      
      {/* Sidebar Wrapper for Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar currentView={currentView} setView={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
        }} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden">
          <h1 className="text-lg font-bold text-slate-800">Gestión HR</h1>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600">
             {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
             {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}