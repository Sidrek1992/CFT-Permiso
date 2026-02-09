import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, Sparkles, Mail, CalendarDays } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    { id: 'employees', label: 'Funcionarios', icon: Users },
    { id: 'requests', label: 'Solicitudes', icon: FileText },
    { id: 'reports', label: 'Reportes', icon: Mail },
    { id: 'ai-assistant', label: 'Asistente IA', icon: Sparkles, special: true },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">Gestión HR</h1>
        <p className="text-xs text-slate-400 mt-1">Institucional V1.1</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? item.special 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/50'
                    : 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={item.special ? 'text-yellow-200' : ''} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => setView('settings')}
          className={`flex items-center gap-3 px-4 py-3 w-full transition-colors rounded-lg ${
            currentView === 'settings' 
              ? 'bg-slate-800 text-white shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings size={20} />
          <span>Configuración</span>
        </button>
      </div>
    </div>
  );
};