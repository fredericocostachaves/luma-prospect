import React from 'react';
import { Check, X, MessageSquare, Clock, Star, MoreHorizontal } from 'lucide-react';

// Mock Inbox Data
const INBOX_MESSAGES = [
  { id: 1, name: "Alice Souza", company: "TechSoft", message: "Obrigado pela conexão! Tenho interesse sim em conhecer a ferramenta.", time: "2h atrás", unread: true },
  { id: 2, name: "Roberto Lima", company: "NuvemInc", message: "Pode me enviar mais detalhes sobre os planos Enterprise?", time: "5h atrás", unread: true },
  { id: 3, name: "Julia Martins", company: "DesignCo", message: "Gostaria de agendar uma reunião para semana que vem.", time: "1d atrás", unread: false },
  { id: 4, name: "Marcos Paulo", company: "Retail S.A.", message: "Agradeço o contato, mas não temos interesse no momento.", time: "2d atrás", unread: false },
];

const Inbox: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Caixa de Entrada</h2>
          <p className="text-sm text-gray-500">4 conversas ativas • 2 não lidas</p>
        </div>
        <div className="flex gap-2">
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                2 Prioritários
            </span>
            <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
                Todos
            </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {INBOX_MESSAGES.map((msg) => (
          <div key={msg.id} className={`p-5 hover:bg-gray-50 transition-all flex gap-4 group cursor-pointer ${msg.unread ? 'bg-blue-50/10' : ''}`}>
             <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${msg.unread ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.name.split(' ').map(n => n[0]).join('')}
                </div>
             </div>
             
             <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-sm text-gray-900 ${msg.unread ? 'font-bold' : 'font-semibold'}`}>
                            {msg.name}
                        </h3>
                        <span className="text-xs text-gray-500 font-normal truncate">
                            {msg.company}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3"/> {msg.time}
                    </span>
                </div>
                
                <p className={`text-sm leading-relaxed mb-3 ${msg.unread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {msg.message}
                </p>
                
                {/* Actions Bar */}
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-lg hover:bg-brand-100 transition-colors border border-brand-100">
                        <Check className="w-3.5 h-3.5" />
                        Qualificar (Pipeline)
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Responder
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto" title="Arquivar">
                        <X className="w-4 h-4" />
                    </button>
                </div>
             </div>
             
             {msg.unread && (
                 <div className="self-center">
                    <div className="w-2.5 h-2.5 bg-brand-500 rounded-full shadow-sm"></div>
                 </div>
             )}
          </div>
        ))}
      </div>
      
      {/* Load More / Footer */}
      <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
          <button className="text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors">
              Carregar mensagens antigas
          </button>
      </div>
    </div>
  );
};

export default Inbox;