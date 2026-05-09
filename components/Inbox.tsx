import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, MessageSquare, Clock, Plus, Search, User } from 'lucide-react';
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
  onChatCreated?: () => void;
}

import ChatView from './ChatView';

const Inbox: React.FC<InboxProps> = ({ chatsData, currentAccount}) => {
  const [messages, setMessages] = useState<InboxMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

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

  const contacts = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter(msg => {
      const key = msg.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(msg => ({
      name: msg.name,
      title: msg.company,
      avatarUrl: msg.avatarUrl || '',
      chatId: msg.chatId,
    }));
  }, [messages]);

  const filteredContacts = useMemo(() => {
    if (!newChatSearch.trim()) return contacts;
    const q = newChatSearch.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, newChatSearch]);

  const unreadCount = messages.filter(m => m.unread).length;

  const handleContactSelect = (contact: { chatId: string }) => {
    setShowNewChatModal(false);
    setSelectedChatId(contact.chatId);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Caixa de Entrada</h2>
          <p className="text-sm text-gray-500">{messages.length} conversas ativas • {unreadCount} não lidas</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowNewChatModal(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                Novo Chat
            </button>
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

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setShowNewChatModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Chat</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newChatSearch}
                    onChange={e => setNewChatSearch(e.target.value)}
                    placeholder="Buscar contato..."
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {contacts.length === 0 ? 'Nenhum contato encontrado nas conversas existentes.' : 'Nenhum contato encontrado para essa busca.'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredContacts.map(contact => (
                      <button
                        key={contact.chatId}
                        onClick={() => handleContactSelect(contact)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        {contact.avatarUrl ? (
                          <img src={contact.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                          {contact.title && <p className="text-xs text-gray-500 truncate">{contact.title}</p>}
                        </div>
                        <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
