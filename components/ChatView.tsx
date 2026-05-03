import React, { useState, useEffect, useRef } from 'react';
import { listChatMessages, sendMessageInChat, getChat, UnipileMessage, SendMessageRequest, UnipileChat } from '../services/unipileService';

interface ChatViewProps {
  chatId: string;
  currentAccount: { 
    id: string; 
    name: string;
    unipile_account_id?: string | null;
  };
  onClose: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ chatId, currentAccount, onClose }) => {
  const [messages, setMessages] = useState<UnipileMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [chatAccountId, setChatAccountId] = useState<string | undefined>(undefined);
  const [chatDetails, setChatDetails] = useState<UnipileChat | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setMessages([]); // clear previous chat messages immediately
      try {
        // Fetch chat details to determine the correct account_id to use
        const chatDetails = await getChat(chatId);
        setChatDetails(chatDetails || null);
        const accountId = chatDetails?.account_id || currentAccount?.id;
        setChatAccountId(accountId);

        const response = await listChatMessages({ chat_id: chatId, limit: 50, account_id: accountId });
        const items = response.items || [];
        // dedupe by id and sort by timestamp
        const map = new Map<string, UnipileMessage>();
        items.forEach(m => {
          if (m && m.id) map.set(m.id, m);
        });
        const unique = Array.from(map.values()).sort((a, b) => {
          const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
          return ta - tb;
        });
        setMessages(unique);
      } catch (err) {
        setMessages([]);
      }
      setLoading(false);
    };
    void fetchMessages();
  }, [chatId, currentAccount?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isReadOnly = Boolean(chatDetails?.read_only || chatDetails?.content_type === 'sponsored' || (chatDetails?.disabledFeatures || []).includes('reply'));

  const handleSend = async () => {
    if (isReadOnly) {
      return;
    }
    if (!input.trim()) return;
    setSending(true);
    try {
      const accountIdToUse = chatAccountId || currentAccount?.id;
      const req: SendMessageRequest = {
        chat_id: chatId,
        text: input,
        sender_id: currentAccount.id,
        account_id: accountIdToUse,
      };
      await sendMessageInChat(req);
      setInput('');
      // Reload messages and dedupe
      const response = await listChatMessages({ chat_id: chatId, limit: 50, account_id: accountIdToUse });
      const items = response.items || [];
      const map = new Map<string, UnipileMessage>();
      items.forEach(m => { if (m && m.id) map.set(m.id, m); });
      const unique = Array.from(map.values()).sort((a, b) => {
        const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      });
      setMessages(unique);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            {chatDetails?.attendees?.find(a => !a.is_self)?.picture_url && (
              <img 
                src={chatDetails.attendees.find(a => !a.is_self)?.picture_url} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {chatDetails?.name || chatDetails?.attendees?.find(a => !a.is_self)?.name || 'Chat'}
              </h3>
              {chatDetails?.attendees?.find(a => !a.is_self)?.title && (
                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                  {chatDetails.attendees.find(a => !a.is_self)?.title?.replace(/Seen today/g, 'Visto hoje').replace(/Seen yesterday/g, 'Visto ontem')}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">Fechar</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div>Carregando mensagens...</div>
          ) : messages.length === 0 ? (
            <div>Nenhuma mensagem.</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_sender ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-lg px-3 py-2 max-w-xs ${msg.is_sender ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}>
                  <div className="text-sm">{msg.text}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(msg.timestamp || '').toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t flex flex-col gap-2">
          {isReadOnly && (
            <div className="text-sm text-red-600">Este chat é somente leitura. Não é possível enviar mensagens.</div>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Digite sua mensagem..."
              disabled={sending || isReadOnly}
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={handleSend}
              disabled={sending || !input.trim() || isReadOnly}
            >Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
