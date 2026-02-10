import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Notification } from '../types';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle size={20} aria-hidden="true" />;
      case 'error': return <AlertCircle size={20} aria-hidden="true" />;
      default: return <Info size={20} aria-hidden="true" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'error': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div
      className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-toast-in transition-all ${getStyles()}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/40" aria-hidden="true">
        <div className="h-full bg-current/70 animate-progress-shrink" />
      </div>
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="text-sm font-medium">{notification.message}</p>
      <button
        onClick={() => onClose(notification.id)}
        className="ml-2 text-current opacity-60 hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};
