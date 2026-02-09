export enum LeaveType {
  LEGAL_HOLIDAY = 'Feriado Legal',
  ADMINISTRATIVE = 'Permiso Administrativo',
  SICK_LEAVE = 'Licencia Médica',
  WITHOUT_PAY = 'Permiso Sin Goce de Sueldo',
  PARENTAL = 'Permiso Post Natal Parental'
}

export enum WorkShift {
  JC = 'Jornada Completa',
  JM = 'Jornada Mañana',
  JT = 'Jornada Tarde'
}

export enum LeaveStatus {
  PENDING = 'Pendiente',
  APPROVED = 'Aprobado',
  REJECTED = 'Rechazado'
}

export interface AppConfig {
  defaultVacationDays: number;
  defaultAdminDays: number;
  defaultSickLeaveDays: number;
  notificationEmail: string;
  emailTemplate: string; // General fallback
  templateLegalHoliday?: string;
  templateAdministrative?: string;
  templateSickLeave?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  totalVacationDays: number;
  usedVacationDays: number;
  totalAdminDays: number;
  usedAdminDays: number;
  totalSickLeaveDays: number;
  usedSickLeaveDays: number;
  email: string;
  avatarUrl: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: LeaveStatus;
  reason: string;
  shift: WorkShift;
}

export interface DashboardStats {
  totalEmployees: number;
  activeLeaves: number;
  pendingRequests: number;
  totalVacationDaysUsed: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}