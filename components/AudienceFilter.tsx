import React, {useCallback, useEffect, useState} from 'react';
import {
  Briefcase,
  Building,
  ExternalLink,
  Filter,
  Heart,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import {FilterState} from '../types';
import {
  getLinkedInProfilePosts,
  getLinkedInSearchParameters,
  getProfile,
  likeLinkedInPost,
  listSentInvitations,
  performLinkedInSearch,
  sendInvitation,
  LinkedInPost,
  UnipileUserProfile
} from '../services/unipileService';
import supabase from '../utils/supabase';

interface AudienceFilterProps {
  currentAccount: {
    id: string;
    unipile_account_id?: string | null;
  } | null;
  currentUserId: string | null;
}

const AudienceFilter: React.FC<AudienceFilterProps> = ({ currentAccount, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UnipileUserProfile[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savedLeads, setSavedLeads] = useState<any[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<Record<string, 'pending' | 'connected'>>({});
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connected' | 'pending' | null>>({});
  const [postsLead, setPostsLead] = useState<any | null>(null);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId || !currentAccount?.id) return;
    const fetchSavedLeads = async () => {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('account_id', currentAccount.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const providerMap = JSON.parse(localStorage.getItem('lead_providers') || '{}');
        const augmented = data.map((l: any) => ({
          ...l,
          provider_id: l.provider_id || providerMap[l.linkedin_url] || null,
        }));
        setSavedLeads(augmented);
        checkAllLeadConnections(augmented);
      }
    };
    fetchSavedLeads();
  }, [currentUserId, currentAccount?.id]);

  useEffect(() => {
    const accountId = getUnipileAccountId();
    if (!accountId) return;
    (async () => {
      try {
        const sent = await listSentInvitations(accountId);
        const statusMap: Record<string, 'pending' | 'connected'> = {};
        (sent.items || []).forEach((inv: any) => {
          const pid = inv.invited_user_id || inv.recipient_id;
          if (!pid) return;
          if (inv.status === 'ACCEPTED') {
            statusMap[pid] = 'connected';
          } else if (inv.status === 'PENDING') {
            statusMap[pid] = 'pending';
          }
        });
        setInvitationStatus(statusMap);
      } catch (e) {
        console.error('[AudienceFilter] failed to fetch invitation status:', e);
      }
    })();
  }, [currentAccount?.unipile_account_id, currentAccount?.id]);

  const [filters, setFilters] = useState<FilterState>({
    jobTitle: '',
    location: '',
    industry: '',

    keywords: '',
  });

  useEffect(() => {
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    if (openMenuId) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [openMenuId]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getUnipileAccountId = () => {
    return currentAccount?.unipile_account_id || currentAccount?.id || '';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const accountId = getUnipileAccountId();
    if (!accountId) {
      setSearchError('Nenhuma conta conectada. Conecte uma conta do LinkedIn primeiro.');
      return;
    }

    if (isSearching) return;
    setIsSearching(true);
    setSearchError(null);

    try {
      const searchParams: Record<string, any> = {
        account_id: accountId,
        api: 'classic',
        category: 'people',
      };

      // Use advanced_keywords.title for job title (LinkedIn's structured title filter)
      if (filters.jobTitle) {
        searchParams.advanced_keywords = { title: filters.jobTitle };
      }

      // Resolve location to LinkedIn geo IDs via LOCATION type
      if (filters.location) {
        try {
          const locParams = await getLinkedInSearchParameters(accountId, 'LOCATION', filters.location);
          if (locParams?.items?.length > 0) {
            searchParams.location = [locParams.items[0].id];
          }
        } catch (e) {
          // location resolution failed silently
        }
      }

      // Resolve industry to LinkedIn IDs via INDUSTRY type
      if (filters.industry) {
        try {
          const indParams = await getLinkedInSearchParameters(accountId, 'INDUSTRY', filters.industry);
          if (indParams?.items?.length > 0) {
            searchParams.industry = [indParams.items[0].id];
          }
        } catch (e) {
          // industry resolution failed silently
        }
      }

      if (filters.keywords) searchParams.keywords = filters.keywords;

      const response = await performLinkedInSearch(searchParams as any);
      const results = response.items || [];

      // Pós-filtro: remove resultados que não contenham os textos buscados
      let filtered = await Promise.all(
          results.map(async (profile) => {
            if (profile.profile_picture_url || profile.picture_url || profile.avatar_url || profile.profile_picture_url_large) {
              return profile;
            }
            const identifier = profile.provider_id || profile.public_identifier || profile.member_urn;
            if (identifier) {
              const full = await getProfile(identifier, accountId);
              if (full) {
                return {...profile, ...full};
              }
            }
            return profile;
          })
      );
      if (filters.location) {
        filtered = filtered.filter(p => {
          const loc = (p.location || '').toLowerCase();
          return loc.includes(filters.location!.toLowerCase());
        });
      }
      if (filters.jobTitle) {
        filtered = filtered.filter(p => {
          const title = ((p as any).headline || p.title || '').toLowerCase();
          return title.includes(filters.jobTitle!.toLowerCase());
        });
      }

      // Remove already-saved leads from results
      const savedIds = new Set(savedLeads.map((l: any) => l.provider_id || l.public_identifier).filter(Boolean));
      if (savedIds.size > 0) {
        filtered = filtered.filter(p => !savedIds.has((p as any).provider_id || (p as any).public_identifier));
      }

      setSearchResults(filtered);
      setSelectedLeads(new Set());
      setActiveTab('list');
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao realizar busca. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === searchResults.length && searchResults.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(searchResults.map(l => (l as any).provider_id || (l as any).id)));
    }
  };

  const getLeadInitials = (profile: any) => {
    const name = profile.display_name || profile.name || profile.first_name || profile.last_name || '';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
    return (first + (last || first)).toUpperCase() || '?';
  };

  const getLeadName = (profile: any) => {
    return profile.display_name || profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Sem nome';
  };

  const getCompany = (profile: any) => {
    return profile.company || profile.title || '';
  };

  const getAvatar = (profile: any) => {
    return profile.profile_picture_url || profile.profile_picture_url_large || profile.picture_url || profile.avatar_url || profile.avatar || '';
  };

  const getLinkedInUrl = (profile: any) => {
    return profile.linkedin_url || (profile.public_identifier
      ? `https://www.linkedin.com/in/${profile.public_identifier}/`
      : null);
  };
  const handleSaveList = async () => {
    if (!listName.trim()) return;
    const accountId = getUnipileAccountId();
    if (!accountId || !currentUserId) return;

    setIsSaving(true);
    try {
      const selectedProfiles = searchResults.filter(p => selectedLeads.has((p as any).provider_id || (p as any).id));

      // Resolve provider_id via getProfile for leads that don't have it from search
      const resolvedProfiles = await Promise.all(selectedProfiles.map(async (p) => {
        if ((p as any).provider_id) return p;
        const pubId = (p as any).public_identifier;
        if (!pubId) { return p; }
        try {
          const full = await getProfile(pubId, accountId);
          if (full?.provider_id) return { ...p, provider_id: full.provider_id };
        } catch (e) { /* silent */ }
        return p;
      }));

      const leadsToInsert = resolvedProfiles.map(profile => ({
        user_id: currentUserId,
        account_id: currentAccount!.id,
        name: getLeadName(profile),
        title: profile.headline || null,
        company: getCompany(profile) || null,
        location: profile.location || null,
        linkedin_url: profile.public_identifier
          ? `https://www.linkedin.com/in/${profile.public_identifier}/`
          : null,
        provider_id: (profile as any).provider_id || null,
        public_identifier: profile.public_identifier || null,
        status: 'Disponível',
        avatar: getAvatar(profile) || null,
        tags: [listName.trim()],
      }));

      const { error } = await (supabase as any).from('leads').insert(leadsToInsert);
      if (error) throw error;

      // Store provider_id in localStorage for lookup after page refresh
      const providerMap = JSON.parse(localStorage.getItem('lead_providers') || '{}');
      leadsToInsert.forEach(l => {
        if (l.provider_id && l.linkedin_url) {
          providerMap[l.linkedin_url] = l.provider_id;
        }
      });
      localStorage.setItem('lead_providers', JSON.stringify(providerMap));

      const savedIds = new Set(resolvedProfiles.map(p => (p as any).provider_id || (p as any).id));

      const newSaved = resolvedProfiles.map((p, i) => ({
        id: Date.now() + i,
        name: getLeadName(p),
        title: p.headline || '',
        company: getCompany(p),
        location: p.location || '',
        linkedin_url: p.public_identifier
          ? `https://www.linkedin.com/in/${p.public_identifier}/`
          : null,
        provider_id: p.provider_id || null,
        public_identifier: p.public_identifier || null,
        date: new Date().toLocaleDateString('pt-BR'),
        avatar: getLeadInitials(p),
        status: 'Disponível',
        picture_url: getAvatar(p),
        tags: [listName.trim()],
      }));

      setSavedLeads(prev => [...newSaved, ...prev]);
      const newSavedIds = new Set(newSaved.map(p => p.provider_id || p.public_identifier).filter(Boolean));
      setSearchResults(prev => prev.filter(p => !newSavedIds.has((p as any).provider_id || (p as any).public_identifier)));
      setSelectedLeads(new Set());
      setShowSaveModal(false);
      setListName('');
    } catch (err: any) {
      setSearchError(err.message || 'Erro ao salvar leads.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const { error } = await (supabase as any)
      .from('leads')
      .delete()
      .eq('id', leadId);
    if (!error) {
      setSavedLeads(prev => prev.filter(l => l.id !== leadId));
    }
    setOpenMenuId(null);
  };

  const handleSendConnection = async (lead: any) => {
    const accountId = getUnipileAccountId();
    if (!accountId) return;

    let providerId = lead.provider_id;

    if (!providerId && lead.linkedin_url) {
      const providerMap = JSON.parse(localStorage.getItem('lead_providers') || '{}');
      providerId = providerMap[lead.linkedin_url] || null;
    }

    if (!providerId && lead.linkedin_url) {
      try {
        const handle = lead.linkedin_url.split('/in/')[1]?.replace(/\/$/, '');
        if (handle) {
          const response = await performLinkedInSearch({
            account_id: accountId,
            api: 'classic',
            category: 'people',
            keywords: handle,
          } as any);
          const found = (response.items || [])[0] as any;
          if (found?.provider_id) {
            providerId = found.provider_id;
          }
        }
      } catch (e) {
        console.error('[AudienceFilter] profile lookup failed:', e);
      }
    }

    if (!providerId) {
      console.warn('[AudienceFilter] no provider_id found for', lead.name);
      return;
    }

    setConnectingId(providerId);
    try {
      const result = await sendInvitation({ account_id: accountId, provider_id: providerId });
      if (result?.status === 'ALREADY_INVITED') {
        setInvitationStatus(prev => ({ ...prev, [providerId]: 'pending' }));
        setSearchError('Um convite já foi enviado recentemente para esse contato.');
      } else if (result?.status === 'SENT') {
        setInvitationStatus(prev => ({ ...prev, [providerId]: 'pending' }));
      } else {
        setSearchError('Erro ao enviar pedido de conexão.');
      }
    } catch (e: any) {
      setSearchError('Erro ao enviar pedido de conexão.');
    }
    setConnectingId(null);
    setOpenMenuId(null);
  };

  const getUnipileAccountIdForPosts = () => {
    return currentAccount?.unipile_account_id || currentAccount?.id || '';
  };

  const handleViewPosts = async (lead: any) => {
    const accountId = getUnipileAccountIdForPosts();
    let providerId = lead.provider_id;

    if (!providerId && lead.linkedin_url) {
      const providerMap = JSON.parse(localStorage.getItem('lead_providers') || '{}');
      providerId = providerMap[lead.linkedin_url] || null;
    }

    if (!providerId) {
      setSearchError('ID do perfil não encontrado para este lead.');
      return;
    }

    setPostsLead(lead);
    setIsLoadingPosts(true);
    setPosts([]);

    try {
      const result = await getLinkedInProfilePosts(accountId, providerId);
      setPosts(result.items || []);
    } catch (err: any) {
      setSearchError('Erro ao carregar posts.');
      setPostsLead(null);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleLikePost = async (post: LinkedInPost) => {
    const accountId = getUnipileAccountIdForPosts();
    if (!accountId || !post.social_id) return;

    setLikingPostId(post.social_id);
    try {
      await likeLinkedInPost(accountId, post.social_id);
      setPosts(prev => prev.map(p =>
        p.social_id === post.social_id
          ? {
              ...p,
              user_reacted: p.user_reacted ? null : 'LIKE',
              reaction_counter: (p.reaction_counter || 0) + (p.user_reacted ? -1 : 1),
            }
          : p
      ));
    } catch (err: any) {
      setSearchError('Erro ao curtir post.');
    } finally {
      setLikingPostId(null);
    }
  };

  const checkLeadConnection = async (lead: any) => {
    const accountId = getUnipileAccountId();
    if (!accountId) return;

    const pid = lead.provider_id;
    const pubId = lead.public_identifier;

    const cacheKey = pid || pubId || lead.id;
    if (!cacheKey) return;
    if (connectionStatus[cacheKey]) return;

    const identifiers = [pid, pubId].filter(Boolean);
    if (identifiers.length === 0) return;

    for (const identifier of identifiers) {
      try {
        const profile = await getProfile(identifier, accountId);
        if (profile) {
          const isConnected = profile.is_relationship === true || !!profile.connected_at;
          if (isConnected) {
            setConnectionStatus(prev => ({ ...prev, [cacheKey]: 'connected' }));
            return;
          }
          break;
        }
      } catch (e) {
        // tenta próximo identificador
      }
    }
  };

  const checkAllLeadConnections = async (leads: any[]) => {
    const accountId = getUnipileAccountId();
    if (!accountId) return;

    for (const lead of leads) {
      const pid = lead.provider_id;
      const pubId = lead.public_identifier;
      const identifiers = [pid, pubId].filter(Boolean);
      const cacheKey = pid || pubId || lead.id;
      if (!cacheKey || connectionStatus[cacheKey]) continue;

      for (const identifier of identifiers) {
        try {
          const profile = await getProfile(identifier, accountId);
          if (profile) {
            const isConnected = profile.is_relationship === true || !!profile.connected_at;
            if (isConnected) {
              setConnectionStatus(prev => ({ ...prev, [cacheKey]: 'connected' }));
            }
            break;
          }
        } catch (e) {
          // tenta próximo identificador
        }
      }
    }
  };

  const handleOpenMenu = (e: React.MouseEvent, lead: any) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = lead.provider_id || lead.id;
    setMenuPos({ top: rect.bottom + 4, right: document.documentElement.clientWidth - rect.right });
    setOpenMenuId(openMenuId === id ? null : id);
    checkLeadConnection(lead);
  };

  const clearFilters = useCallback(() => {
    setFilters({
      jobTitle: '',
      location: '',
      industry: '',
  
      keywords: '',
    });
    setSearchResults([]);
    setSelectedLeads(new Set());
    setSearchError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header / Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex p-1 bg-gray-200/80 rounded-lg">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'list'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            Meus Leads Salvos
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'search'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Search className="w-4 h-4" />
            Nova Busca (LinkedIn)
          </button>
        </div>

        {activeTab === 'list' && searchResults.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={selectedLeads.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Salvar Selecionados
            </button>
          </div>
        )}
      </div>

      {searchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {searchError}
          <button onClick={() => setSearchError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- CONTENT: LEADS LIST --- */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Search info banner */}
          {searchResults.length > 0 && (
            <div className="bg-brand-50 border-b border-brand-100 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-700">
                {searchResults.length} leads encontrados
              </span>
              <div className="flex gap-2">
                {selectedLeads.size > 0 && (
                  <span className="text-xs text-brand-600 font-medium">
                    {selectedLeads.size} selecionados
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Limpar resultados
                </button>
              </div>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedLeads.size > 0 && searchResults.length > 0 && (
            <div className="bg-brand-50 border-b border-brand-100 px-6 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-700">
                {selectedLeads.size} leads selecionados
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-200 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-100"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </button>
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar seleção
                </button>
              </div>
            </div>
          )}

          {/* Search Results Section */}
          {searchResults.length > 0 && (
            <>
              <div className="bg-brand-50 border-b border-brand-100 px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-700">
                  {searchResults.length} leads encontrados na busca
                </span>
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Limpar resultados
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[500px]">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 w-10">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedLeads.size === searchResults.length && searchResults.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                          />
                        </div>
                      </th>
                      <th className="px-4 sm:px-6 py-4 whitespace-nowrap">Nome</th>
                      <th className="px-4 sm:px-6 py-4 whitespace-nowrap">Cargo / Headline</th>
                      <th className="px-4 sm:px-6 py-4 whitespace-nowrap">Localização</th>
                      <th className="px-4 sm:px-6 py-4 whitespace-nowrap">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {searchResults.map((lead) => {
                      const id = lead.provider_id;
                      const name = getLeadName(lead);
                      const headline = lead.headline || lead.title || '';
                      const location = lead.location || '';
                      const avatar = getAvatar(lead);
                      const initials = getLeadInitials(lead);
                      const linkedinUrl = getLinkedInUrl(lead);

                      return (
                        <tr key={id} className={`hover:bg-gray-50/80 transition-colors ${selectedLeads.has(id) ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-4 sm:px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedLeads.has(id)}
                              onChange={() => toggleSelectLead(id)}
                              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {avatar ? (
                                <img src={avatar} alt={name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                  {initials}
                                </div>
                              )}
                              <span className="font-semibold text-gray-800 truncate max-w-[120px] sm:max-w-none">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 max-w-[160px] sm:max-w-[220px]">
                            <span className="text-gray-600 text-xs line-clamp-2">{headline || '—'}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[100px] sm:max-w-[160px]">{location || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            {linkedinUrl ? (
                              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium whitespace-nowrap">
                                <ExternalLink className="w-3.5 h-3.5" />
                                Perfil
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Saved Leads Section */}
          <div className="bg-green-50 border-b border-green-100 px-6 py-3">
            <span className="text-sm font-semibold text-green-700">
              {savedLeads.length} leads salvos
            </span>
          </div>

          {savedLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Nome</th>
                    <th className="px-6 py-4 whitespace-nowrap">Cargo</th>
                    <th className="px-6 py-4 whitespace-nowrap">Localização</th>
                    <th className="px-6 py-4 whitespace-nowrap">LinkedIn</th>
                    <th className="px-6 py-4 whitespace-nowrap">Tags</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {savedLeads.map((lead) => {
                    const id = lead.provider_id || lead.id;
                    const name = getLeadName(lead);
                    const headline = lead.headline || lead.title || '';
                    const location = lead.location || '';
                    const avatar = getAvatar(lead);
                    const initials = getLeadInitials(lead);
                    const linkedinUrl = getLinkedInUrl(lead);

                    return (
                      <tr key={id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {avatar ? (
                              <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                {initials}
                              </div>
                            )}
                            <span className="font-semibold text-gray-800 truncate max-w-[180px]">{name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-[220px]">
                          <span className="text-gray-600 text-xs line-clamp-2">{headline || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{location || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {linkedinUrl ? (
                            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                              <ExternalLink className="w-3.5 h-3.5" />
                              Perfil
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.tags?.length > 0 ? (
                            <div className="flex gap-1">
                              {lead.tags.map((tag: string, i: number) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button
                            onClick={(e) => handleOpenMenu(e, lead)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          {openMenuId === (lead.provider_id || lead.id) && menuPos && (
                            <div onClick={(e) => e.stopPropagation()} className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[11rem]" style={{ top: menuPos.top, right: menuPos.right }}>
                              <button
                                onClick={() => { handleDeleteLead(lead.id); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                              {(() => {
                                const pid = (lead as any).provider_id;
                                const pubId = (lead as any).public_identifier;
                                const cacheKey = pid || pubId || lead.id;
                                const invStatus = pid ? invitationStatus[pid] : null;
                                const relStatus = cacheKey ? connectionStatus[cacheKey] : null;
                                const status = relStatus || invStatus || null;
                                if (status === 'connected') {
                                  return (
                                    <>
                                      <button disabled className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-green-600 cursor-not-allowed">
                                        <UserPlus className="w-4 h-4" />
                                        Já é contato
                                      </button>
                                      <button
                                        onClick={() => { handleViewPosts(lead); setOpenMenuId(null); }}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        <Heart className="w-4 h-4" />
                                        Ver Posts
                                      </button>
                                    </>
                                  );
                                }
                                if (status === 'pending') {
                                  return (
                                    <button disabled className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-amber-600 cursor-not-allowed">
                                      <UserPlus className="w-4 h-4" />
                                      Convite pendente
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => { handleSendConnection(lead); setOpenMenuId(null); }}
                                    disabled={connectingId != null && connectingId === pid}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    {connectingId && connectingId === pid ? 'Enviando...' : 'Enviar Pedido de Conexão'}
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                Nenhum lead salvo
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Use a busca do LinkedIn para encontrar e importar leads para sua lista.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Nova Busca
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- CONTENT: NEW SEARCH FORM --- */}
      {activeTab === 'search' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
            <div className="bg-brand-50 p-2 rounded-lg">
              <Filter className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Nova Busca de Audiência</h2>
              <p className="text-sm text-gray-500">Defina os critérios para importar leads do LinkedIn</p>
            </div>
          </div>

          {!getUnipileAccountId() && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Conecte uma conta do LinkedIn para realizar buscas.
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Por limite do LinkedIn só é possível buscar no máximo 1.000 contatos (ou 2.500 se sua conta tiver LinkedIn Sales Navigator).
            <a
              href="https://developer.unipile.com/docs/provider-limits-and-restrictions"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1 text-blue-600 hover:text-blue-800"
            >
              Saiba mais
            </a>
          </div>

          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  Cargo / Função
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={filters.jobTitle}
                  onChange={handleFilterChange}
                  placeholder="ex: CTO, Gerente de Marketing"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  Localização / Região
                </label>
                <input
                  type="text"
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  placeholder="ex: São Paulo, Lisboa, Remoto"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building className="w-4 h-4 text-gray-400" />
                  Indústria / Setor
                </label>
                <input
                  type="text"
                  name="industry"
                  value={filters.industry}
                  onChange={handleFilterChange}
                  placeholder="ex: Software, Saúde, Educação, Varejo..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>

            </div>

            <div className="mb-8 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Search className="w-4 h-4 text-gray-400" />
                Palavras-chave Booleanas (Opcional)
              </label>
              <input
                type="text"
                name="keywords"
                value={filters.keywords}
                onChange={handleFilterChange}
                placeholder='ex: ("SaaS" OR "Software") AND NOT "Recrutador"'
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Limpar Filtros
              </button>
              <button
                type="submit"
                disabled={isSearching || !getUnipileAccountId()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar Leads
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Save List Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Salvar Leads</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selecionado{selectedLeads.size !== 1 ? 's' : ''}.
              Escolha uma tag para identificar e salve no banco de dados.
            </p>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Tag (ex: CTOS SP)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveList}
                disabled={!listName.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Modal */}
      {postsLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-brand-50 p-2 rounded-lg">
                  <Heart className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Posts Recentes</h3>
                  <p className="text-sm text-gray-500">{getLeadName(postsLead)}</p>
                </div>
              </div>
              <button
                onClick={() => { setPostsLead(null); setPosts([]); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingPosts ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Carregando posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Nenhum post encontrado</h3>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    Este perfil não possui posts recentes ou não está disponível.
                  </p>
                </div>
              ) : (
                posts.map((post) => {
                  const isLiked = !!post.user_reacted;
                  const isLiking = likingPostId === post.social_id;
                  return (
                    <div key={post.social_id || post.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
                      {post.text && (
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line line-clamp-6">
                          {post.text}
                        </p>
                      )}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {post.attachments.filter(a => a.type === 'img' && a.url && !a.unavailable).slice(0, 4).map((att, i) => (
                            <img
                              key={att.id || i}
                              src={att.url}
                              alt=""
                              className="h-32 w-32 object-cover rounded-lg border border-gray-200 shrink-0"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            {post.reaction_counter || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {post.comment_counter || 0}
                          </span>
                          {post.parsed_datetime && (
                            <span className="text-gray-400">
                              {new Date(post.parsed_datetime).toLocaleDateString('pt-BR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleLikePost(post)}
                          disabled={isLiking || !(post.id || post.social_id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                            isLiked
                              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLiking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          )}
                          {isLiked ? 'Curtido' : 'Curtir'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceFilter;
