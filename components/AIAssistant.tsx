import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User } from 'lucide-react';
import { askHRAssistant } from '../services/geminiService';
import { Employee, LeaveRequest } from '../types';

interface AIAssistantProps {
  employees: Employee[];
  requests: LeaveRequest[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: Date;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ employees, requests }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hola. Soy tu asistente de RRHH. Puedo ayudarte con consultas sobre saldos de vacaciones, estado de solicitudes o reportes rápidos. ¿Qué necesitas saber hoy?',
      time: new Date()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      time: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await askHRAssistant(userMsg.text, employees, requests);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: responseText,
      time: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <Sparkles className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Asistente Virtual HR</h2>
          <p className="text-indigo-100 text-sm">Potenciado por Gemini 3</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
                 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                 {msg.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
               </div>
               <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                 ${msg.sender === 'user' 
                   ? 'bg-indigo-600 text-white rounded-tr-none' 
                   : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                 {msg.text.split('\n').map((line, i) => (
                   <React.Fragment key={i}>
                     {line}
                     {i < msg.text.split('\n').length - 1 && <br />}
                   </React.Fragment>
                 ))}
                 <p className={`text-[10px] mt-2 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                   {msg.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </p>
               </div>
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-3 max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                 <Bot size={16} className="text-white" />
               </div>
               <div className="p-4 rounded-2xl bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm">
                 <div className="flex gap-2">
                   <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                   <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                 </div>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre funcionarios, permisos o saldos..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-700 shadow-inner"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-3">
          La IA puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
};