import React, { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Clock } from 'lucide-react';
import { UnipileChatsResponse, UnipileChat, getChatMessages, getChatAttendee } from '../services/unipileService';

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
  subject?: string;
  message: string;
  time: string;
  unread: boolean;
  avatarUrl?: string;
  chatId: string;
  isReadOnly: boolean;
}

interface InboxProps {
  chatsData?: UnipileChatsResponse | null;
  currentAccount?: {
    id: string;
    unipile_account_id?: string | null;
    name: string;
  } | null;
}

import ChatView from './ChatView';
import { sendConnectRequest } from '../services/unipileService';
import {availableParallelism} from "node:os";

const Inbox: React.FC<InboxProps> = ({ chatsData, currentAccount }) => {
  const [messages, setMessages] = useState<InboxMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectAttendeeId, setConnectAttendeeId] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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
           const accountId = currentAccount?.unipile_account_id || currentAccount?.id;
           
           // Buscar mensagens do chat (apenas se não tiver lastMessage já no objeto chat)
           let lastMessage = chat.lastMessage;
           if (!lastMessage) {
             const chatMessages = await getChatMessages(chat.id, accountId);
             lastMessage = chatMessages?.items?.[0] as any;
           }

           // Dados EXCLUSIVOS do attendee (nome e foto)
           // Tenta pegar dos attendees já presentes no chat ou busca na API
           const attendee = chat.attendees?.find(a => !a.is_self) || 
                          await getChatAttendee(chat.attendee_id, accountId, chat.id);
           
           const name = attendee?.name || attendee?.display_name || chat.name || '(Sem título)';
           const avatarUrl = attendee?.picture_url || (attendee as any)?.avatar_url || '';
           const title = attendee?.title || (attendee as any)?.headline || '';
           const company = title ? title.replace(/Seen today/g, 'Visto hoje').replace(/Seen yesterday/g, 'Visto ontem') : '';

           return {
             id: chat.id,
             name,
             company,
             subject: chat.subject || '',
             message: lastMessage?.text || chat.lastMessage?.text || 'Sem mensagem',
             time: formatTimeAgo(lastMessage?.timestamp || chat.lastMessage?.timestamp || (chat as any).timestamp || (chat as any).updated_at),
             unread: (chat.unread_count || 0) > 0,
             avatarUrl,
             chatId: chat.id,
             isReadOnly: Boolean(chat.read_only || chat.content_type === 'sponsored' || (chat.disabledFeatures || []).includes('reply')),
           };
         })
       );

      setMessages(transformed);
      setLoading(false);
    };

    void transformChats();
  }, [chatsData, currentAccount]);

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
          <div key={msg.id} onClick={() => setSelectedChatId(msg.chatId)} className={`p-5 hover:bg-gray-50 transition-all flex gap-4 group cursor-pointer ${msg.unread ? 'bg-blue-50/10' : ''}`}>
              <div className="flex flex-col items-center gap-2">
                 {msg.avatarUrl && !imgErrors[msg.id] ? (
                   <img
                     src={msg.avatarUrl}
                     alt={msg.name}
                     className="w-10 h-10 rounded-full object-cover shadow-sm"
                     onError={() => setImgErrors(prev => ({ ...prev, [msg.id]: true }))}
                   />
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
                
                {msg.subject && (
                  <p className="text-xs text-gray-400 mb-1 truncate">
                    {msg.subject}
                  </p>
                )}
                <p className={`text-sm leading-relaxed mb-3 ${msg.unread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {msg.message}
                </p>
                
                {/* Actions Bar */}
                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); /* Qualify action placeholder */ }} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold rounded-lg hover:bg-brand-100 transition-colors border border-brand-100">
                        <Check className="w-3.5 h-3.5" />
                        Qualificar (Pipeline)
                    </button>
                    {!msg.isReadOnly && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedChatId(msg.chatId); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Responder
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); /* archive placeholder */ }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto" title="Arquivar">
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

        {selectedChatId && currentAccount && (
          <ChatView chatId={selectedChatId} currentAccount={currentAccount} onClose={() => setSelectedChatId(null)} />
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
