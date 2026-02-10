import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, Sparkles, Mail, CalendarDays, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    { id: 'employees', label: 'Funcionarios', icon: Users },
    { id: 'requests', label: 'Solicitudes', icon: FileText },
    { id: 'reports', label: 'Reportes', icon: Mail },
    { id: 'ai-assistant', label: 'Asistente IA', icon: Sparkles, special: true },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-slate-900 text-white overflow-y-auto">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">Gestión HR</h1>
        <p className="text-xs text-slate-400 mt-1">Institucional V1.3.1</p>
      </div>
      <nav className="flex-1 p-4 space-y-2" aria-label="Menú principal">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                  ? item.special
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50'
                    : 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Ir a ${item.label}`}
            >
              <Icon size={20} className={item.special ? 'text-yellow-200' : ''} aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => setView('settings')}
          className={`flex items-center gap-3 px-4 py-3 w-full transition-colors rounded-lg ${currentView === 'settings'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          aria-current={currentView === 'settings' ? 'page' : undefined}
          aria-label="Ir a Configuración"
        >
          <Settings size={20} aria-hidden="true" />
          <span>Configuración</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-rose-200 hover:bg-rose-900/20 transition-colors rounded-lg"
          aria-label="Cerrar sesión"
        >
          <LogOut size={20} aria-hidden="true" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
