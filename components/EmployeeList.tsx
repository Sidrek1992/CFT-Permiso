import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import { Search, MoreHorizontal, UserPlus, X, Edit, Trash2, ArrowUpDown } from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  onAddEmployee: (data: { firstName: string; lastName: string; email: string; position: string; department: string }) => void;
  onEditEmployee: (id: string, data: { firstName: string; lastName: string; email: string; position: string; department: string }) => void;
  onDeleteEmployee: (id: string) => void;
  onViewProfile: (employee: Employee) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onAddEmployee, onEditEmployee, onDeleteEmployee, onViewProfile }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('lastName_asc');

  const menuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    department: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenModal = () => {
    setIsEditing(false);
    setCurrentEmployeeId(null);
    setFormData({ firstName: '', lastName: '', email: '', position: '', department: '' });
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleEditClick = (e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation(); // Prevent row click
    setIsEditing(true);
    setCurrentEmployeeId(employee.id);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      position: employee.position,
      department: employee.department
    });
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent row click
    setActiveMenu(null);
    onDeleteEmployee(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.firstName && formData.lastName) {
      if (isEditing && currentEmployeeId) {
        onEditEmployee(currentEmployeeId, formData);
      } else {
        onAddEmployee(formData);
      }
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', email: '', position: '', department: '' });
      setIsEditing(false);
      setCurrentEmployeeId(null);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    switch (sortOption) {
      case 'lastName_asc':
        return a.lastName.localeCompare(b.lastName);
      case 'lastName_desc':
        return b.lastName.localeCompare(a.lastName);
      case 'firstName_asc':
        return a.firstName.localeCompare(b.firstName);
      case 'firstName_desc':
        return b.firstName.localeCompare(a.firstName);
      case 'department_asc':
        return a.department.localeCompare(b.department);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" style={{ minHeight: '600px' }}>
        <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Listado de Funcionarios</h2>

          <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-auto">
              <ArrowUpDown size={16} className="text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 focus:outline-none cursor-pointer w-full"
                aria-label="Ordenar funcionarios por"
              >
                <option value="lastName_asc">Apellido (A-Z)</option>
                <option value="lastName_desc">Apellido (Z-A)</option>
                <option value="firstName_asc">Nombre (A-Z)</option>
                <option value="firstName_desc">Nombre (Z-A)</option>
                <option value="department_asc">Departamento</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar funcionario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                aria-label="Buscar funcionario por nombre, cargo o departamento"
              />
            </div>

            <button
              onClick={handleOpenModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap justify-center"
            >
              <UserPlus size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo Funcionario</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {sortedEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-50/50">
            <UserPlus size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600">No hay funcionarios encontrados</h3>
            <p className="mb-6">Intenta ajustar tu búsqueda o agrega un nuevo miembro.</p>
            <button
              onClick={handleOpenModal}
              className="text-indigo-600 font-medium hover:underline"
            >
              Agregar Funcionario
            </button>
          </div>
        ) : (
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse" aria-label="Lista de funcionarios">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4" scope="col">Funcionario</th>
                  <th className="px-6 py-4" scope="col">Departamento</th>
                  <th className="px-6 py-4 text-center" scope="col">Feriado Legal</th>
                  <th className="px-6 py-4 text-center" scope="col">Administrativos</th>
                  <th className="px-6 py-4 text-center" scope="col">Licencias</th>
                  <th className="px-6 py-4 text-right" scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onViewProfile(employee)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={employee.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-slate-900">{employee.lastName}, {employee.firstName}</p>
                          <p className="text-xs text-slate-500">{employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {employee.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800">{employee.totalVacationDays - employee.usedVacationDays}</span>
                        <span className="text-[10px] text-slate-400">de {employee.totalVacationDays}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800">{employee.totalAdminDays - employee.usedAdminDays}</span>
                        <span className="text-[10px] text-slate-400">de {employee.totalAdminDays}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${employee.usedSickLeaveDays > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          {employee.usedSickLeaveDays}
                        </span>
                        <span className="text-[10px] text-slate-400">usados</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === employee.id ? null : employee.id);
                        }}
                        className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                      >
                        <MoreHorizontal size={20} aria-hidden="true" />
                      </button>

                      {activeMenu === employee.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-8 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-50 animate-fade-in origin-top-right"
                        >
                          <button
                            onClick={(e) => handleEditClick(e, employee)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors first:rounded-t-lg"
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, employee.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg border-t border-slate-50"
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label={isEditing ? 'Editar Funcionario' : 'Registrar Nuevo Funcionario'}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditing ? 'Editar Funcionario' : 'Registrar Nuevo Funcionario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar formulario">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emp-firstName" className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input
                    id="emp-firstName"
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="emp-lastName" className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                  <input
                    id="emp-lastName"
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="emp-email" className="block text-sm font-medium text-slate-700 mb-1">Correo Institucional</label>
                <input
                  id="emp-email"
                  type="email"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emp-position" className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <input
                    id="emp-position"
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="emp-department" className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                  <input
                    id="emp-department"
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};