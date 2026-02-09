import { Employee, LeaveRequest, LeaveType, LeaveStatus, WorkShift } from './types';

// Holidays for 2025 and 2026 (YYYY-MM-DD)
export const HOLIDAYS = [
  // 2025
  '2025-01-01', // Año Nuevo
  '2025-04-18', // Viernes Santo
  '2025-04-19', // Sábado Santo
  '2025-05-01', // Día del Trabajo
  '2025-05-21', // Glorias Navales
  '2025-06-20', // Pueblos Indígenas
  '2025-06-29', // San Pedro y San Pablo
  '2025-07-16', // Virgen del Carmen
  '2025-08-15', // Asunción de la Virgen
  '2025-09-18', // Independencia
  '2025-09-19', // Glorias del Ejército
  '2025-10-12', // Encuentro de Dos Mundos
  '2025-10-31', // Iglesias Evangélicas
  '2025-11-01', // Todos los Santos
  '2025-12-08', // Inmaculada Concepción
  '2025-12-25', // Navidad
  
  // 2026 (Estimated)
  '2026-01-01',
  '2026-04-03', // Viernes Santo
  '2026-04-04',
  '2026-05-01',
  '2026-05-21',
  '2026-06-21',
  '2026-06-29',
  '2026-07-16',
  '2026-08-15',
  '2026-09-18',
  '2026-09-19',
  '2026-10-12',
  '2026-10-31',
  '2026-11-01',
  '2026-12-08',
  '2026-12-25',
];

// Helper to create employee
const createEmp = (id: string, firstName: string, lastName: string): Employee => ({
  id,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/ /g, '')}@institucion.cl`,
  position: 'Funcionario',
  department: 'General',
  totalVacationDays: 15,
  usedVacationDays: 0,
  totalAdminDays: 6,
  usedAdminDays: 0,
  totalSickLeaveDays: 30,
  usedSickLeaveDays: 0,
  avatarUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random&color=fff`
});

export const INITIAL_EMPLOYEES: Employee[] = [
  createEmp('1', 'Nelida', 'Valderama'),
  createEmp('2', 'Yahivett', 'Tarque'),
  createEmp('3', 'Maria Soledad', 'Jarrin'),
  createEmp('4', 'Max', 'Tapia'),
  createEmp('5', 'Gloria', 'Bolaño'),
  createEmp('6', 'Romina', 'Siau'),
  createEmp('7', 'Sebastian', 'Troncoso Bruna'),
  createEmp('8', 'Alvaro', 'Ron'),
  createEmp('9', 'Alejandra', 'Leiva'),
  createEmp('10', 'Paola', 'Reyes'),
  createEmp('11', 'Rodrigo', 'Marin'),
  createEmp('12', 'Karen', 'Diaz'),
  createEmp('13', 'Natalia', 'Jofre'),
  createEmp('14', 'Angelica', 'Zenis'),
  createEmp('15', 'Patricio', 'Tapia Muñoz'),
  createEmp('16', 'Sebastian', 'Diaz'),
  createEmp('17', 'Benjamin', 'Vega Navarro'),
  createEmp('18', 'Nicolas', 'Labbe'),
  createEmp('19', 'Carolina', 'Prieto'),
  createEmp('20', 'Marcela', 'Fernandez'),
  createEmp('21', 'Silvia', 'Esquivel'),
  createEmp('22', 'Jennifer', 'Cancino'),
  createEmp('23', 'Jose', 'Montero'),
  createEmp('24', 'Jorge', 'Guillen'),
  createEmp('25', 'Vanessa', 'Tavali Cortés'),
  createEmp('26', 'Nicol', 'Diaz'),
  createEmp('27', 'Claudia', 'Zamorano'),
  createEmp('28', 'Fernanda', 'Urrutia'),
  createEmp('29', 'Alonso', 'Pereda'),
  createEmp('30', 'Maximiliano', 'Guzmán'),
  // New Employees from updated list
  createEmp('31', 'Roxany', 'Mery'),
  createEmp('32', 'Reinaldo', 'Valencia'),
  createEmp('33', 'Gabriela', 'Zorilla'),
  createEmp('34', 'Maria Alejandra', 'Saez'),
  createEmp('35', 'Romina', 'Ron'),
  createEmp('36', 'Ruth', 'Muñoz'),
  createEmp('37', 'Marcelo', 'Cardenas'),
  createEmp('38', 'Anibal', 'Carrasco'),
  createEmp('39', 'Yanet', 'Esquivel'),
  createEmp('40', 'Nicole', 'Ortega'),
  createEmp('41', 'Mercedes', 'Corrales'),
  createEmp('42', 'Rosa', 'Jarpa Zamorano'),
  createEmp('43', 'Jeremy', 'Gee'),
];

// Helper to create request
const createReq = (id: string, empId: string, start: string, end: string, days: number, type: LeaveType, shift: WorkShift): LeaveRequest => ({
  id,
  employeeId: empId,
  startDate: start, // YYYY-MM-DD format
  endDate: end,
  daysCount: days,
  type,
  shift,
  status: LeaveStatus.APPROVED, // Assuming data from table is approved
  reason: 'Solicitud Importada'
});

export const INITIAL_REQUESTS: LeaveRequest[] = [
  // Existing requests
  createReq('101', '1', '2026-01-05', '2026-01-23', 15.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Nelida
  createReq('102', '2', '2026-01-06', '2026-01-12', 5.0, LeaveType.WITHOUT_PAY, WorkShift.JC), // Yahivett
  createReq('103', '3', '2026-01-06', '2026-01-06', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Maria Soledad
  createReq('104', '4', '2026-01-07', '2026-01-07', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Max Tapia
  createReq('105', '5', '2026-01-06', '2026-01-07', 2.0, LeaveType.SICK_LEAVE, WorkShift.JC), // Gloria Bolaño
  createReq('106', '6', '2026-01-06', '2026-01-06', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Romina Siau
  createReq('107', '7', '2026-01-09', '2026-01-09', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Sebastian Troncoso
  createReq('108', '8', '2026-01-08', '2026-01-08', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Alvaro Ron
  createReq('109', '9', '2026-12-08', '2026-02-18', 42.0, LeaveType.SICK_LEAVE, WorkShift.JC), // Alejandra Leiva
  createReq('110', '10', '2026-01-09', '2026-01-09', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Paola Reyes
  createReq('111', '11', '2026-01-16', '2026-01-16', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Rodrigo Marin
  createReq('112', '12', '2026-01-06', '2026-03-30', 84.0, LeaveType.PARENTAL, WorkShift.JC), // Karen Diaz
  createReq('113', '13', '2026-01-12', '2026-01-12', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Natalia Jofre
  createReq('114', '14', '2026-01-12', '2026-01-12', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Angelica Zenis
  createReq('115', '15', '2026-01-12', '2026-01-12', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Patricio Tapia
  createReq('116', '15', '2026-01-13', '2026-01-14', 2.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Patricio Tapia (2)
  createReq('117', '10', '2026-01-16', '2026-01-16', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Paola Reyes (2)
  createReq('118', '7', '2026-01-16', '2026-01-16', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Sebastian Troncoso (2)
  createReq('119', '16', '2026-01-16', '2026-01-16', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Sebastian Diaz
  createReq('120', '17', '2026-01-23', '2026-02-06', 11.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Benjamin Vega
  createReq('121', '18', '2026-01-26', '2026-02-06', 10.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Nicolas Labbe
  createReq('122', '19', '2026-01-21', '2026-01-21', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Carolina Prieto
  createReq('123', '20', '2026-01-19', '2026-01-21', 3.0, LeaveType.SICK_LEAVE, WorkShift.JC), // Marcela Fernandez
  createReq('124', '21', '2026-01-22', '2026-01-22', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Silvia Esquivel
  createReq('125', '22', '2026-01-22', '2026-01-22', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Jennifer Cancino
  createReq('126', '23', '2026-01-23', '2026-01-23', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Jose Montero
  createReq('127', '24', '2026-01-26', '2026-02-17', 17.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Jorge Guillen
  createReq('128', '22', '2026-01-26', '2026-02-13', 15.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Jennifer Cancino (2)
  createReq('129', '16', '2026-01-21', '2026-01-23', 3.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Sebastian Diaz (2)
  createReq('130', '25', '2026-01-26', '2026-02-01', 7.0, LeaveType.SICK_LEAVE, WorkShift.JC), // Vanessa Tavali
  createReq('131', '26', '2026-01-26', '2026-01-26', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Nicol Diaz
  createReq('132', '7', '2026-01-27', '2026-01-27', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Sebastian Troncoso (3)
  createReq('133', '27', '2026-01-30', '2026-01-30', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Claudia Zamorano
  createReq('134', '15', '2026-01-29', '2026-02-13', 12.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Patricio Tapia (3)
  createReq('135', '6', '2026-01-30', '2026-01-30', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Romina Siau (2)
  createReq('136', '28', '2026-01-28', '2026-01-28', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Fernanda Urrutia
  createReq('137', '29', '2026-01-27', '2026-01-27', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JM), // Alonso Pereda
  createReq('138', '30', '2026-01-29', '2026-01-29', 1.0, LeaveType.SICK_LEAVE, WorkShift.JC), // Maximiliano Guzman
  createReq('139', '21', '2026-01-30', '2026-01-30', 0.5, LeaveType.ADMINISTRATIVE, WorkShift.JT), // Silvia Esquivel (2)
  
  // New Requests added from updated list
  createReq('201', '31', '2026-02-16', '2026-03-03', 12.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Roxany Mery
  createReq('202', '32', '2026-02-02', '2026-02-27', 20.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Reinaldo Valencia
  createReq('203', '33', '2026-02-02', '2026-02-27', 20.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Gabriela Zorilla
  createReq('204', '34', '2026-02-02', '2026-02-27', 20.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Maria Alejandra Saez
  createReq('205', '35', '2026-02-13', '2026-03-04', 12.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Romina Ron
  createReq('206', '36', '2026-02-23', '2026-02-27', 5.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Ruth Muñoz
  createReq('207', '28', '2026-02-02', '2026-02-27', 20.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Fernanda Urrutia
  createReq('208', '37', '2026-02-02', '2026-02-27', 20.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Marcelo Cardenas
  createReq('209', '5', '2026-02-02', '2026-02-02', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Gloria Bolaño
  createReq('210', '5', '2026-02-09', '2026-02-09', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Gloria Bolaño (2)
  createReq('211', '5', '2026-02-16', '2026-02-16', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Gloria Bolaño (3)
  createReq('212', '5', '2026-02-27', '2026-03-02', 2.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Gloria Bolaño (4)
  createReq('213', '38', '2026-02-02', '2026-02-20', 15.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Anibal Carrasco
  createReq('214', '7', '2026-02-02', '2026-02-02', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Sebastian Troncoso
  createReq('215', '39', '2026-02-02', '2026-02-02', 1.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JM), // Yanet Esquivel
  createReq('216', '40', '2026-02-02', '2026-02-13', 10.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Nicole Ortega
  createReq('217', '23', '2026-02-05', '2026-02-27', 17.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // José Manuel Montero
  createReq('218', '8', '2026-02-03', '2026-02-23', 15.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Álvaro Ron
  createReq('219', '41', '2026-02-03', '2026-02-24', 16.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Mercedes Corrales
  createReq('220', '42', '2026-02-16', '2026-02-27', 10.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Rosa Jarpa Zamorano
  createReq('221', '6', '2026-02-09', '2026-02-13', 5.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Romina Siau
  createReq('222', '7', '2026-02-05', '2026-02-06', 2.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Sebastian Troncoso (2)
  createReq('223', '16', '2026-02-05', '2026-02-13', 7.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Sebastian Diaz
  createReq('224', '43', '2026-02-09', '2026-02-09', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Jeremy Gee
  createReq('225', '36', '2026-02-10', '2026-02-10', 1.0, LeaveType.ADMINISTRATIVE, WorkShift.JC), // Ruth Muñoz
  createReq('226', '39', '2026-02-16', '2026-02-20', 5.0, LeaveType.LEGAL_HOLIDAY, WorkShift.JC), // Yanet Esquivel (2)
];