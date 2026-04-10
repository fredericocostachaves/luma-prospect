import React, { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Clock } from 'lucide-react';
import { UnipileChatsResponse, UnipileChat, getChatAttendee } from '../services/unipileService';

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
};

interface InboxMessageData {
  id: string;
  name: string;
  company: string;
  message: string;
  time: string;
  unread: boolean;
  avatarUrl?: string;
  chatId: string;
}

interface InboxProps {
  chatsData?: UnipileChatsResponse | null;
}

const Inbox: React.FC<InboxProps> = ({ chatsData }) => {
  const [messages, setMessages] = useState<InboxMessageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const transformChats = async () => {
      if (!chatsData?.items) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const transformed: InboxMessageData[] = await Promise.all(
        chatsData.items.map(async (chat: UnipileChat) => {
          const participant = chat.participants?.[0];
          let avatarUrl = participant?.avatar_url;
          let attendeeName = chat.name || participant?.name || participant?.username;

          if (chat.last_message?.sender_id) {
            const attendee = await getChatAttendee(chat.last_message.sender_id);
            if (attendee) {
              if (attendee.picture_url) avatarUrl = attendee.picture_url;
              if (!attendeeName || attendeeName === '(Sem título)') {
                attendeeName = attendee.name || attendee.username || '(Sem título)';
              }
            }
          }

          return {
            id: chat.id,
            name: attendeeName || '(Sem título)',
            company: participant?.company || participant?.title || '',
            message: chat.last_message?.text || chat.snippet || 'Sem mensagem',
            time: formatTimeAgo(chat.last_message?.timestamp || chat.updated_at),
            unread: (chat.unread_count || 0) > 0,
            avatarUrl,
            chatId: chat.id,
          };
        })
      );

      setMessages(transformed);
      setLoading(false);
    };

    void transformChats();
  }, [chatsData]);

  const unreadCount = messages.filter(m => m.unread).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Caixa de Entrada</h2>
          <p className="text-sm text-gray-500">{messages.length} conversas ativas • {unreadCount} não lidas</p>
        </div>
        <div className="flex gap-2">
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                {unreadCount} Prioritários
            </span>
            <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-full">
                Todos ({messages.length})
            </span>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando mensagens...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma mensagem encontrada</div>
        ) : (
          messages.map((msg) => (
          <div key={msg.id} className={`p-5 hover:bg-gray-50 transition-all flex gap-4 group cursor-pointer ${msg.unread ? 'bg-blue-50/10' : ''}`}>
              <div className="flex flex-col items-center gap-2">
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt={msg.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${msg.unread ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
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
        ))
        )}
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