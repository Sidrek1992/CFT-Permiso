import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmployeeProfile } from './components/EmployeeProfile';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { ViewSkeleton } from './components/ViewSkeleton';
import { INITIAL_EMPLOYEES, INITIAL_REQUESTS } from './constants';
import { AppConfig, Employee, LeaveRequest, LeaveStatus, Notification } from './types';
import { Menu, X } from 'lucide-react';
import { recalculateEmployeeUsage } from './utils/balanceUtils';
import { validateBalanceForRequest } from './utils/requestRules';
import { buildApiUrl } from './services/http';
import { applyYearClose, getYearCloseReminderMessage, shouldRunYearClose, YearCloseMeta } from './utils/yearCloseUtils';
import { getTodayString } from './utils/dateUtils';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const EmployeeList = lazy(() => import('./components/EmployeeList').then((module) => ({ default: module.EmployeeList })));
const LeaveRequests = lazy(() => import('./components/LeaveRequests').then((module) => ({ default: module.LeaveRequests })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then((module) => ({ default: module.AIAssistant })));
const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const Reports = lazy(() => import('./components/Reports').then((module) => ({ default: module.Reports })));
const CalendarView = lazy(() => import('./components/CalendarView').then((module) => ({ default: module.CalendarView })));

const PERSISTENCE_DEBOUNCE_MS = 300;
const YEAR_CLOSE_META_KEY = 'hrAppYearCloseMeta';

const DEFAULT_YEAR_CLOSE_META: YearCloseMeta = {
  lastClosedYear: 0,
  lastReminderYear: 0,
};

const normalizeConfig = (config: AppConfig): AppConfig => ({
  ...config,
  carryoverVacationEnabled: config.carryoverVacationEnabled ?? true,
  carryoverVacationMaxPeriods: config.carryoverVacationMaxPeriods ?? 2,
  adminDaysExpireAtYearEnd: config.adminDaysExpireAtYearEnd ?? true,
  yearCloseReminderDays: config.yearCloseReminderDays ?? 30,
});

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getOperationalYear = (): number => new Date().getFullYear();

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [employees, setEmployees] = useState<Employee[]>(() => recalculateEmployeeUsage(INITIAL_EMPLOYEES, INITIAL_REQUESTS, getOperationalYear()));
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [startupNotices, setStartupNotices] = useState<string[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    defaultVacationDays: 15,
    defaultAdminDays: 6,
    defaultSickLeaveDays: 30,
    notificationEmail: 'rrhh@institucion.cl',
    emailTemplate: "- {NOMBRE} ({CARGO}): {TIPO} {JORNADA} desde el {DESDE} hasta el {HASTA}.",
    templateLegalHoliday: "- {NOMBRE} ({CARGO}): Hará uso de Feriado Legal {JORNADA} desde el {DESDE} hasta el {HASTA}.",
    templateAdministrative: "- {NOMBRE} ({CARGO}): Solicitó Permiso Administrativo {JORNADA} el día {DESDE} (Retorna: {HASTA}).",
    templateSickLeave: "- {NOMBRE} ({CARGO}): Presenta Licencia Médica desde el {DESDE} hasta el {HASTA}.",
    carryoverVacationEnabled: true,
    carryoverVacationMaxPeriods: 2,
    adminDaysExpireAtYearEnd: true,
    yearCloseReminderDays: 30,
  });

  const isAuthenticated = Boolean(sessionToken);

  const validateSession = useCallback(async (token: string) => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/session'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSessionToken(token);
        return;
      }
    } catch (error) {
      console.error('Session validation failed', error);
    }

    sessionStorage.removeItem('hrAppToken');
    setSessionToken(null);
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('hrAppData');
    const savedToken = sessionStorage.getItem('hrAppToken');

    if (savedToken) {
      void validateSession(savedToken);
    }

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const parsedEmployees: Employee[] = parsed.employees || INITIAL_EMPLOYEES;
        const parsedRequests: LeaveRequest[] = parsed.requests || INITIAL_REQUESTS;
        const parsedConfig: AppConfig = normalizeConfig({
          ...config,
          ...(parsed.config || {}),
        });

        let parsedMeta: YearCloseMeta = DEFAULT_YEAR_CLOSE_META;
        const rawMeta = localStorage.getItem(YEAR_CLOSE_META_KEY);
        if (rawMeta) {
          try {
            const metaObj = JSON.parse(rawMeta) as Partial<YearCloseMeta>;
            parsedMeta = {
              lastClosedYear: Number.isFinite(Number(metaObj.lastClosedYear)) ? Number(metaObj.lastClosedYear) : 0,
              lastReminderYear: Number.isFinite(Number(metaObj.lastReminderYear)) ? Number(metaObj.lastReminderYear) : 0,
            };
          } catch {
            parsedMeta = DEFAULT_YEAR_CLOSE_META;
          }
        }

        const today = new Date();
        const operationalYear = today.getFullYear();
        let nextEmployees = recalculateEmployeeUsage(parsedEmployees, parsedRequests, operationalYear);
        const notices: string[] = [];

        if (shouldRunYearClose(today, parsedMeta)) {
          const closeResult = applyYearClose(nextEmployees, parsedConfig);
          nextEmployees = closeResult.employees;
          parsedMeta.lastClosedYear = operationalYear;
          parsedMeta.lastReminderYear = operationalYear;
          notices.push(
            `Cierre anual automático aplicado: vencieron ${closeResult.adminDaysExpired} día(s) administrativos y se ajustó el arrastre de vacaciones.`
          );
        }

        const reminder = getYearCloseReminderMessage(today, nextEmployees, parsedConfig, parsedMeta);
        if (reminder) {
          notices.push(reminder);
          parsedMeta.lastReminderYear = operationalYear;
        }

        localStorage.setItem(YEAR_CLOSE_META_KEY, JSON.stringify(parsedMeta));

        setRequests(parsedRequests);
        setEmployees(nextEmployees);
        setConfig(parsedConfig);
        if (notices.length > 0) {
          setStartupNotices(notices);
        }
      } catch (e) {
        console.error("Error loading local storage", e);
      }
    }
  }, [validateSession]);

  // Save to LocalStorage on changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const dataToSave = { employees, requests, config };
      localStorage.setItem('hrAppData', JSON.stringify(dataToSave));
    }, PERSISTENCE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [employees, requests, config]);

  useEffect(() => {
    if (!selectedEmployee) return;

    const stillExists = employees.some((employee) => employee.id === selectedEmployee.id);
    if (!stillExists) {
      setSelectedEmployee(null);
    }
  }, [selectedEmployee, employees]);

  const handleLogin = (token: string) => {
    setSessionToken(token);
    sessionStorage.setItem('hrAppToken', token);
    addNotification('Bienvenido al sistema', 'success');
  };

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newNotif: Notification = {
      id: createId(),
      message,
      type
    };
    setNotifications(prev => [...prev, newNotif]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || startupNotices.length === 0) {
      return;
    }

    startupNotices.forEach((notice) => addNotification(notice, 'info'));
    setStartupNotices([]);
  }, [isAuthenticated, startupNotices, addNotification]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const today = getTodayString();
    const digestKey = `hrPushDigest:${today}`;
    if (sessionStorage.getItem(digestKey) === 'sent') {
      return;
    }

    const approved = requests.filter((request) => request.status === LeaveStatus.APPROVED);
    const startsToday = approved.filter((request) => request.startDate === today).length;
    const endsToday = approved.filter((request) => request.endDate === today).length;

    if (startsToday === 0 && endsToday === 0) {
      return;
    }

    addNotification(
      `Push diario: ${startsToday} ausencia(s) inician hoy y ${endsToday} finalizan hoy.`,
      'info'
    );
    sessionStorage.setItem(digestKey, 'sent');
  }, [isAuthenticated, requests, addNotification]);

  const handleLogout = useCallback(async () => {
    if (sessionToken) {
      try {
        await fetch(buildApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      } catch (error) {
        console.error('Logout request failed', error);
      }
    }

    sessionStorage.removeItem('hrAppToken');
    setSessionToken(null);
    setCurrentView('dashboard');
    addNotification('Sesión cerrada', 'info');
  }, [sessionToken, addNotification]);

  const addNewRequest = (newRequestData: Omit<LeaveRequest, 'id' | 'status'>) => {
    const newRequest: LeaveRequest = {
      ...newRequestData,
      id: createId(),
      status: LeaveStatus.PENDING
    };
    setRequests(currentRequests => {
      const nextRequests = [newRequest, ...currentRequests];
      setEmployees(currentEmployees => recalculateEmployeeUsage(currentEmployees, nextRequests, getOperationalYear()));
      return nextRequests;
    });
    addNotification('Solicitud creada correctamente', 'success');
  };

  const handleAddEmployee = (data: { firstName: string; lastName: string; email: string; position: string; department: string }) => {
    const newEmployee: Employee = {
      id: createId(),
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
    setEmployees(currentEmployees => [...currentEmployees, newEmployee]);
    addNotification('Funcionario registrado con éxito', 'success');
  };

  const handleEditEmployee = (id: string, data: { firstName: string; lastName: string; email: string; position: string; department: string }) => {
    setEmployees(currentEmployees => currentEmployees.map(emp =>
      emp.id === id ? { ...emp, ...data, avatarUrl: `https://ui-avatars.com/api/?name=${data.firstName}+${data.lastName}&background=random&color=fff` } : emp
    ));
    addNotification('Datos del funcionario actualizados', 'success');
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este funcionario? Esta acción no se puede deshacer.')) {
      setRequests(currentRequests => {
        const nextRequests = currentRequests.filter(req => req.employeeId !== id);
        setEmployees(currentEmployees => recalculateEmployeeUsage(
          currentEmployees.filter(emp => emp.id !== id),
          nextRequests,
          getOperationalYear()
        ));
        return nextRequests;
      });
      addNotification('Funcionario eliminado', 'info');
    }
  };

  /**
   * Updates a request status and rebuilds employee used-day balances.
   */
  const updateRequestStatus = (id: string, status: LeaveStatus) => {
    const targetRequest = requests.find(r => r.id === id);
    if (!targetRequest) return;

    // Confirmation for approval
    if (status === LeaveStatus.APPROVED) {
      const emp = employees.find(e => e.id === targetRequest.employeeId);
      if (!emp) {
        addNotification('No se pudo aprobar: funcionario no encontrado.', 'error');
        return;
      }

      if (targetRequest.status !== LeaveStatus.APPROVED) {
        const balanceValidation = validateBalanceForRequest(emp, targetRequest.type, targetRequest.daysCount);
        if (!balanceValidation.valid) {
          addNotification(balanceValidation.message || 'Saldo insuficiente para aprobar la solicitud.', 'error');
          return;
        }
      }

      const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'el funcionario';
      if (!window.confirm(`¿Confirma la aprobación de la solicitud de ${empName}? Se descontarán ${targetRequest.daysCount} día(s) de su saldo.`)) {
        return;
      }
    }

    setRequests(currentRequests => {
      const nextRequests = currentRequests.map(req => (req.id === id ? { ...req, status } : req));
      setEmployees(currentEmployees => recalculateEmployeeUsage(currentEmployees, nextRequests, getOperationalYear()));
      return nextRequests;
    });

    if (status === LeaveStatus.APPROVED && targetRequest.status !== LeaveStatus.APPROVED) {
      addNotification('Solicitud aprobada y saldos actualizados', 'success');
    } else if (status === LeaveStatus.REJECTED && targetRequest.status === LeaveStatus.APPROVED) {
      addNotification('Solicitud rechazada. Los días han sido revertidos al saldo del funcionario.', 'info');
    } else if (status === LeaveStatus.REJECTED) {
      addNotification('Solicitud rechazada', 'info');
    }
  };

  const handleSaveConfig = (newConfig: AppConfig, applyToAll: boolean) => {
    const nextConfig = normalizeConfig(newConfig);
    setConfig(nextConfig);
    if (applyToAll) {
      setEmployees(currentEmployees =>
        currentEmployees.map(emp => ({
          ...emp,
          totalVacationDays: nextConfig.defaultVacationDays,
          totalAdminDays: nextConfig.defaultAdminDays,
          totalSickLeaveDays: nextConfig.defaultSickLeaveDays
        }))
      );
      addNotification('Configuración aplicada a todos los funcionarios', 'success');
    } else {
      addNotification('Configuración guardada', 'success');
    }
  };

  const handleImportData = (data: { employees: Employee[], requests: LeaveRequest[], config: AppConfig }) => {
    const nextRequests = data.requests || requests;
    const nextEmployees = data.employees || employees;

    setRequests(nextRequests);

    const nextConfig = normalizeConfig(data.config || config);
    setConfig(nextConfig);
    setEmployees(recalculateEmployeeUsage(nextEmployees, nextRequests, getOperationalYear()));
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
        return sessionToken ? <AIAssistant employees={employees} requests={requests} sessionToken={sessionToken} /> : null;
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
        <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
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
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite" aria-label="Notificaciones">
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
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Wrapper for Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar currentView={currentView} setView={(view) => {
          setCurrentView(view);
          setMobileMenuOpen(false);
        }} onLogout={handleLogout} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden">
          <h1 className="text-lg font-bold text-slate-800">Gestión HR</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600"
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="flex-1 overflow-auto p-4 md:p-8" role="main">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<ViewSkeleton view={currentView} />}>
              <div key={currentView} className="animate-fade-in-up transition-all duration-300">
                {renderContent()}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
