import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Send, Check, X, Clock, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { 
  listSentInvitations, 
  listReceivedInvitations, 
  sendInvitation, 
  handleInvitation, 
  cancelInvitation,
  getProfile,
  getLinkedInSearchParameters,
  performLinkedInSearch,
  UnipileInvitation,
  UnipileUserProfile,
  LinkedInSearchParameter
} from '../services/unipileService';

interface InvitationsProps {
  currentAccount: {
    id: string;
    unipile_account_id?: string | null;
    name: string;
  } | null;
}

const Invitations: React.FC<InvitationsProps> = ({ currentAccount }) => {
  const [sentInvitations, setSentInvitations] = useState<UnipileInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<UnipileInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSearchingProfile, setIsSearchingProfile] = useState(false);
  const [isFetchingPictures, setIsFetchingPictures] = useState(false);
  const [searchedProfile, setSearchedProfile] = useState<UnipileUserProfile | null>(null);
  const [searchResults, setSearchResults] = useState<UnipileUserProfile[]>([]);
  const [searchKeywords, setSearchKeywords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profilePictures, setProfilePictures] = useState<Record<string, string | null>>({});
  const [parameterSuggestions, setParameterSuggestions] = useState<LinkedInSearchParameter[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  
  // refs para controlar a busca e evitar loops de cancelamento indesejados
  const fetchVersionRef = useRef(0);
  const prevDataDeps = useRef({ accId: '', sentLen: 0, recLen: 0, loading: true });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (val: string) => {
    if (!currentAccount || val.length < 3 || val.includes('linkedin.com')) {
      setParameterSuggestions([]);
      return;
    }
    try {
      const accountId = currentAccount.unipile_account_id || currentAccount.id;
      const res = await getLinkedInSearchParameters(accountId, 'PEOPLE', val);
      setParameterSuggestions(res.items || []);
      setShowSuggestions(true);
    } catch (e) {
      // Ignora erro silenciosamente para não atrapalhar o input
    }
  };

  const fetchData = async () => {
    if (!currentAccount) return;
    setLoading(true);
    setError(null);
    try {
      const accountId = currentAccount.unipile_account_id || currentAccount.id;
      const [sent, received] = await Promise.all([
        listSentInvitations(accountId),
        listReceivedInvitations(accountId)
      ]);
      setSentInvitations(sent.items || []);
      setReceivedInvitations(received.items || []);
    } catch (err) {
      setError('Erro ao carregar convites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentAccount]);

  useEffect(() => {
    // Identificar se os dados REAIS mudaram para decidir se cancelamos a busca em curso
    const accId = currentAccount?.unipile_account_id || currentAccount?.id || '';
    const sentLen = sentInvitations.length;
    const recLen = receivedInvitations.length;
    
    const dataChanged = accId !== prevDataDeps.current.accId || 
                        sentLen !== prevDataDeps.current.sentLen || 
                        recLen !== prevDataDeps.current.recLen ||
                        loading !== prevDataDeps.current.loading;

    if (dataChanged) {
      fetchVersionRef.current++;
      prevDataDeps.current = { accId, sentLen, recLen, loading };
    }

    const currentVersion = fetchVersionRef.current;

    const fetchPictures = async () => {
      if (!currentAccount || loading || isFetchingPictures) return;
      
      const allInvs = [...sentInvitations, ...receivedInvitations];
      
      // Filtrar IDs que ainda não temos no cache de imagens (undefined significa que não tentamos)
      const idsToFetch = allInvs
        .map(inv => inv.invited_user_id)
        .filter((id): id is string => !!id && profilePictures[id] === undefined);

      if (idsToFetch.length === 0) {
        return;
      }

      setIsFetchingPictures(true);

      // Pegar apenas IDs únicos para evitar requisições duplicadas
      const uniqueIds = Array.from(new Set(idsToFetch));
      const accountId = currentAccount.unipile_account_id || currentAccount.id;

      // Busca em paralelo com limite de concorrência para ser mais rápido sem sobrecarregar
      try {
        const concurrency = 5;
        for (let i = 0; i < uniqueIds.length; i += concurrency) {
          if (fetchVersionRef.current !== currentVersion || !isMounted.current) break;
          
          const batch = uniqueIds.slice(i, i + concurrency);
          await Promise.all(batch.map(async (id) => {
            if (fetchVersionRef.current !== currentVersion || !isMounted.current) return;
            try {
              const profile = await getProfile(id, accountId);
              if (fetchVersionRef.current !== currentVersion || !isMounted.current) return;
              
              const imgUrl = profile?.profile_picture_url || profile?.picture_url || profile?.avatar_url || null;
              setProfilePictures(prev => ({
                ...prev,
                [id]: imgUrl
              }));
            } catch (e) {
              // Marcar como processado (null) mesmo em caso de erro para evitar loop infinito
              setProfilePictures(prev => ({
                ...prev,
                [id]: null
              }));
            }
          }));
        }
      } finally {
        if (isMounted.current) setIsFetchingPictures(false);
      }
    };

    if (!loading && !isFetchingPictures && (sentInvitations.length > 0 || receivedInvitations.length > 0)) {
      const hasMissingPictures = [...sentInvitations, ...receivedInvitations].some(
        inv => inv.invited_user_id && profilePictures[inv.invited_user_id] === undefined
      );
      if (hasMissingPictures) {
        fetchPictures();
      }
    }
  }, [sentInvitations, receivedInvitations, currentAccount, loading, isFetchingPictures]);

  const handleSearchProfile = async (overrideIdentifier?: string, overrideId?: string) => {
    const identifier = overrideIdentifier || newIdentifier;
    if (!currentAccount || (!identifier && !searchKeywords)) return;
    
    setIsSearchingProfile(true);
    setError(null);
    setSearchedProfile(null);
    setSearchResults([]);
    setShowSuggestions(false);
    try {
      const accountId = currentAccount.unipile_account_id || currentAccount.id;
      
      // Se tivermos um ID de sugestão (overrideId), tentamos buscar o perfil direto primeiro
      if (overrideId) {
        const profile = await getProfile(overrideId, accountId);
        if (profile) {
          setSearchedProfile(profile);
          setIsSearchingProfile(false);
          return;
        }
      }

      // Se for uma URL do LinkedIn, usamos o getProfile (identificador direto)
      if (identifier.includes('linkedin.com/in/')) {
        const profile = await getProfile(identifier, accountId);
        if (profile) {
          setSearchedProfile(profile);
        } else {
          setError('Perfil não encontrado. Verifique a URL.');
        }
      } else {
        // Caso contrário, fazemos uma busca por keywords
        const keywords = searchKeywords || identifier;
        const result = await performLinkedInSearch({
          account_id: accountId,
          keywords: keywords,
          api: 'classic',
          category: 'people'
        });
        
        if (result.items && result.items.length > 0) {
          setSearchResults(result.items);
        } else {
          setError('Nenhum perfil encontrado para esta busca.');
        }
      }
    } catch (err) {
      setError('Erro ao realizar busca.');
    } finally {
      setIsSearchingProfile(false);
    }
  };

  const handleSendInvitation = async (profile?: UnipileUserProfile) => {
    const targetProfile = profile || searchedProfile;
    const providerId = targetProfile?.provider_id;
    
    if (!currentAccount || !providerId) {
      if (!providerId) setError('É necessário buscar um perfil antes de enviar o convite.');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);
    try {
      const accountId = currentAccount.unipile_account_id || currentAccount.id;
      await sendInvitation({
        account_id: accountId,
        provider_id: providerId,
        message: newMessage || undefined
      });
      setSuccess('Convite enviado com sucesso!');
      setNewIdentifier('');
      setSearchKeywords('');
      setNewMessage('');
      setSearchedProfile(null);
      setSearchResults([]);
      fetchData();
    } catch (err) {
      setError('Erro ao enviar convite. Verifique o identificador.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAction = async (id: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (action === 'CANCEL') {
        await cancelInvitation(id);
        setSuccess('Convite cancelado.');
      } else {
        await handleInvitation(id, action);
        setSuccess(action === 'ACCEPT' ? 'Convite aceito!' : 'Convite recusado.');
      }
      await fetchData();
    } catch (err) {
      setError('Erro ao processar ação.');
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Data pendente';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return timestamp;
    }
  };

  if (!currentAccount) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Selecione uma conta para gerenciar convites.
      </div>
    );
  }

  return (
    <div className="space-y-6 relative min-h-[600px]">
      {(loading || isFetchingPictures) && (
        <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl transition-all duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
              <RefreshCw className="w-5 h-5 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-bold text-lg">Aguarde um momento</p>
              <p className="text-gray-500 text-sm mt-1">
                {loading ? 'Sincronizando seus convites...' : 'Carregando fotos dos perfis...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enviar Novo Convite */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            Novo Convite de Conexão
          </h2>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSearchProfile(); }} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Identificador ou Busca (Nome, Cargo, URL)</label>
              <div className="flex gap-2">
                <div ref={searchContainerRef} className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newIdentifier}
                    onChange={(e) => {
                        const val = e.target.value;
                        setNewIdentifier(val);
                        if (searchedProfile) setSearchedProfile(null);
                        if (searchResults.length > 0) setSearchResults([]);
                        fetchSuggestions(val);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Nome, URL do LinkedIn ou Palavra-chave"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    required
                  />
                  {showSuggestions && parameterSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                          {parameterSuggestions.map((param) => (
                              <button
                                  key={param.id}
                                  type="button"
                                  onClick={() => {
                                      setNewIdentifier(param.title);
                                      setParameterSuggestions([]);
                                      handleSearchProfile(param.title, param.id);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-brand-50 transition-colors border-b last:border-0 border-gray-100 flex items-center gap-3"
                              >
                                  <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                                      {param.picture_url ? (
                                          <img src={param.picture_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold">
                                              {param.title?.[0]?.toUpperCase() || '?'}
                                          </div>
                                      )}
                                  </div>
                                  <span className="font-medium truncate block">{param.title}</span>
                              </button>
                          ))}
                      </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleSearchProfile()}
                  disabled={isSearchingProfile || !newIdentifier}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isSearchingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Mensagem (Opcional)</label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Olá, gostaria de conectar..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          {searchedProfile && (
            <div className="mt-4 p-4 bg-brand-50/50 border border-brand-100 rounded-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 bg-white rounded-full border-2 border-brand-200 overflow-hidden flex-shrink-0">
                  {(searchedProfile.profile_picture_url || searchedProfile.picture_url || searchedProfile.avatar_url) ? (
                    <img src={searchedProfile.profile_picture_url || searchedProfile.picture_url || searchedProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-300 font-bold text-xl">
                      {(searchedProfile.display_name?.[0] || searchedProfile.first_name?.[0] || searchedProfile.title?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 leading-tight truncate">
                    {searchedProfile.display_name || (searchedProfile.first_name ? `${searchedProfile.first_name} ${searchedProfile.last_name}` : '')}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{searchedProfile.headline}</p>
                  {searchedProfile.location && (
                    <p className="text-xs text-gray-400 mt-1">{searchedProfile.location}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSendInvitation(searchedProfile)}
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar Convite
              </button>
            </div>
          )}

          {searchResults.length > 0 && (
              <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Resultados da busca</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[800px] overflow-y-auto pr-2">
                      {searchResults.map((profile) => (
                          <div key={profile.provider_id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-4 hover:border-brand-300 transition-colors group shadow-sm">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 bg-gray-50 rounded-full border border-gray-100 overflow-hidden flex-shrink-0">
                                      {(profile.profile_picture_url || profile.picture_url || profile.avatar_url) ? (
                                          <img src={profile.profile_picture_url || profile.picture_url || profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                      ) : (
                                          <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">
                                              {(profile.display_name?.[0] || profile.first_name?.[0] || profile.title?.[0] || '?').toUpperCase()}
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-900 leading-tight truncate">
                                          {profile.display_name || profile.title || `${profile.first_name} ${profile.last_name}`}
                                      </h4>
                                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{profile.headline}</p>
                                  </div>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => handleSendInvitation(profile)}
                                  disabled={isSending}
                                  className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-lg font-bold hover:bg-brand-600 hover:text-white disabled:opacity-50 transition-all"
                              >
                                  <Send className="w-3.5 h-3.5" />
                                  Conectar
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {!searchedProfile && searchResults.length === 0 && (
              <div className="flex justify-end pt-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Search className="w-3 h-3" />
                      Busque um perfil por nome, cargo ou URL para enviar um convite.
                  </p>
              </div>
          )}
        </form>
      </div>

      {/* Listagem de Convites */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        <div className="border-b border-gray-100 flex items-center justify-between p-2 bg-gray-50/50">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'received'
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recebidos ({receivedInvitations.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enviados ({sentInvitations.length})
            </button>
          </div>
          <button 
            onClick={fetchData} 
            className="p-2 text-gray-400 hover:text-brand-600 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>}
        {success && <div className="p-4 bg-green-50 text-green-600 text-sm border-b border-green-100">{success}</div>}

        <div className="divide-y divide-gray-100">
          {(activeTab === 'received' ? receivedInvitations : sentInvitations).length === 0 && !loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <Clock className="w-8 h-8 text-gray-300" />
              <p>Nenhum convite {activeTab === 'received' ? 'recebido' : 'enviado'} encontrado.</p>
            </div>
          ) : (
            (activeTab === 'received' ? receivedInvitations : sentInvitations).map((inv) => {
              const attendee = inv.attendee || (activeTab === 'sent' ? inv.recipient : inv.sender);
              
              // Extração robusta do nome
              let displayName = 'Usuário';
              if (inv.invited_user && typeof inv.invited_user === 'object') {
                displayName = (inv.invited_user as any).display_name || (inv.invited_user as any).name || (inv.invited_user as any).full_name || displayName;
              } else if (typeof inv.invited_user === 'string' && inv.invited_user) {
                displayName = inv.invited_user;
              } else if (attendee?.display_name) {
                displayName = attendee.display_name;
              } else if (activeTab === 'sent') {
                displayName = inv.invited_user_id || inv.recipient_id || displayName;
              } else {
                displayName = inv.invited_user_id || inv.sender_id || displayName;
              }

              // Extração robusta da imagem
              const pictureUrl = (inv.invited_user_id && profilePictures[inv.invited_user_id]) ||
                               attendee?.picture_url || 
                               attendee?.profile_picture_url || 
                               attendee?.avatar_url || 
                               (inv as any).picture_url || 
                               (inv as any).profile_picture_url || 
                               (inv as any).avatar_url ||
                               (inv as any).user_picture_url ||
                               (inv as any).sender_picture_url ||
                               (inv as any).recipient_picture_url ||
                               (inv as any).invited_user_picture_url || 
                               (inv as any).invited_user_details?.picture_url ||
                               (inv as any).invited_user_details?.profile_picture_url ||
                               (inv as any).invited_user_details?.avatar_url ||
                               (inv.invited_user && typeof inv.invited_user === 'object' ? (inv.invited_user as any).picture_url : null) ||
                               (inv.invited_user && typeof inv.invited_user === 'object' ? (inv.invited_user as any).profile_picture_url : null) ||
                               (inv.invited_user && typeof inv.invited_user === 'object' ? (inv.invited_user as any).avatar_url : null) ||
                               (inv as any).picture ||
                               (attendee as any)?.picture;

              const invitationDate = inv.date || inv.sent_date || inv.timestamp || '';
              
              // Tradução de termos comuns da API que podem vir em inglês
              const description = inv.invited_user_description ? 
                inv.invited_user_description.replace(/Sent today/g, 'Enviado hoje') :
                null;

              return (
                <div key={inv.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold overflow-hidden flex-shrink-0">
                      {pictureUrl ? (
                          <img src={pictureUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                          (displayName?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-800 truncate">
                          {displayName}
                        </h4>
                        {description && (
                          <span className="text-[10px] text-gray-400 truncate hidden sm:inline">{description}</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          inv.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      {inv.message && <p className="text-sm text-gray-600 mt-1 line-clamp-1 italic">"{inv.message}"</p>}
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(invitationDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeTab === 'received' && inv.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(inv.id, 'ACCEPT')}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Aceitar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(inv.id, 'DECLINE')}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Recusar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {activeTab === 'sent' && inv.status === 'PENDING' && (
                      <button
                        onClick={() => handleAction(inv.id, 'CANCEL')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                      >
                        <X className="w-3 h-3" />
                        Cancelar
                      </button>
                    )}
                    {inv.attendee?.profile_url && (
                      <a
                        href={inv.attendee.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Ver Perfil"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Invitations;
