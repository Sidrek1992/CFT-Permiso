import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded simple password as requested
    if (password === 'Gestion2024') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[128px]"></div>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in">
        <div className="p-8 text-center bg-white border-b border-slate-100">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
             <ShieldCheck className="text-white" size={32} />
           </div>
           <h1 className="text-2xl font-bold text-slate-800">Gestión HR Institucional</h1>
           <p className="text-slate-500 mt-2 text-sm">Ingrese sus credenciales para acceder al sistema de gestión.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña de Acceso</label>
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Lock className="h-5 w-5 text-slate-400" />
               </div>
               <input
                 type="password"
                 className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-all
                   ${error 
                     ? 'border-rose-300 focus:ring-rose-200 bg-rose-50 text-rose-900' 
                     : 'border-slate-300 focus:ring-indigo-200 focus:border-indigo-500'}`}
                 placeholder="••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 autoFocus
               />
             </div>
             {error && (
               <p className="mt-2 text-sm text-rose-600 font-medium animate-pulse">
                 Contraseña incorrecta. Intente nuevamente.
               </p>
             )}
           </div>

           <button
             type="submit"
             className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-lg transition-all transform active:scale-95 shadow-lg hover:shadow-xl"
           >
             Ingresar al Sistema
             <ArrowRight size={18} />
           </button>
        </form>
        
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Sistema V1.1 &copy; 2026</p>
        </div>
      </div>
    </div>
  );
};