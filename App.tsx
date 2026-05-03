import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Workflow, Inbox as InboxIcon, Menu, Settings, LogOut, ChevronDown, ChevronUp, Plus, Check, Columns, UserPlus, RefreshCw } from 'lucide-react';
import { supabase } from './utils/supabase';
import { Database } from './database.types';
import { listAccounts, listChats, UnipileChatsResponse, syncLinkedInAccount, getAccountById, getAccountOwner } from './services/unipileService';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';

// Lazy load heavy components
const CampaignBuilder = lazy(() => import('./components/CampaignBuilder'));
const AudienceFilter = lazy(() => import('./components/AudienceFilter'));
const PipelineBoard = lazy(() => import('./components/KanbanInbox'));
const Inbox = lazy(() => import('./components/Inbox'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const LinkedInAuth = lazy(() => import('./components/LinkedInAuth'));
const Invitations = lazy(() => import('./components/Invitations'));

enum Tab {
  DASHBOARD = 'Painel de Controle',
  CAMPAIGNS = 'Campanhas',
  AUDIENCE = 'Audiência & Listas',
  INBOX = 'Caixa de Entrada',
  PIPELINE = 'Pipeline de Vendas',
  INVITATIONS = 'Convites',
}

interface Account {
  id: string;
  unipile_account_id?: string | null;
  name: string;
  status: 'CREATION_SUCCESS' | 'RECONNECTED';
  initials: string;
  avatar_url?: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [reconnectAccountId, setReconnectAccountId] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [syncedAccountIds, setSyncedAccountIds] = useState<Set<string>>(new Set());
  const [accountsRefreshKey, setAccountsRefreshKey] = useState(0);
  
  // Account State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Função para buscar contas
  const fetchAccounts = async (userId: string) => {
    setIsAppLoading(true);
    try {
      const { data: linkedAccounts, error: linkedError } = await (supabase as any)
        .from('accounts')
        .select('id, unipile_account_id, name, status, initials')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (linkedAccounts && linkedAccounts.length > 0) {
        const accountsToDisplay: Account[] = [];
        
        for (const acc of linkedAccounts) {
          let accountName = acc.name;
          let accountInitials = acc.initials;
          let avatarUrl = '';
          
          // Se não tem name, buscar no Unipile
          if (acc.unipile_account_id) {
            const unipileData = await getAccountById(acc.unipile_account_id);
            if (unipileData) {
              if (!accountName || accountName.trim() === '') {
                accountName = unipileData.name;
                accountInitials = (accountName.substring(0, 2) || 'LI').toUpperCase();
              }
              
              // Buscar o perfil do dono para pegar a imagem correta
              const ownerData = await getAccountOwner(acc.unipile_account_id);
              if (ownerData && ownerData.profile_picture_url) {
                avatarUrl = ownerData.profile_picture_url;
              } else {
                avatarUrl = unipileData.profile_picture_url || '';
              }
              
              // Atualizar no banco se o nome mudou ou se não tinha iniciais
              if (!acc.name || !acc.initials) {
                const { error: updateError } = await (supabase as any)
                  .from('accounts')
                  .update({ 
                    name: accountName, 
                    initials: accountInitials,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', acc.id);
              }
            }
          }
          
          // Gerar initials se não tiver (primeira letra do primeiro e último nome)
          if (!accountInitials && accountName) {
            const nameParts = accountName.trim().split(/\s+/);
            const firstInitial = nameParts[0]?.[0] || '';
            const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] || '' : '';
            accountInitials = (firstInitial + (lastInitial || firstInitial)).toUpperCase() || 'LI';
          }
          
          accountsToDisplay.push({
            id: acc.id,
            unipile_account_id: acc.unipile_account_id || '',
            name: accountName || '',
            status: acc.status || 'CREATION_SUCCESS',
            initials: accountInitials || 'LI',
            avatar_url: avatarUrl
          });
        }
        
        setAccounts(accountsToDisplay);
        setCurrentAccount(accountsToDisplay[0]);
      } else {
        setAccounts([]);
        setCurrentAccount(null);
      }
    } catch (err) {
    } finally {
      setIsAppLoading(false);
    }
  };

  // Inbox State
  const [chats, setChats] = useState<UnipileChatsResponse | null>(null);

  const isResetPasswordPage = window.location.pathname === '/reset-password' || window.location.search.includes('type=recovery');

  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingEmail(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        setCurrentUserEmail(session.user.email ?? null);
      } else {
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setCurrentUserEmail(null);
      }
      setIsLoadingEmail(false);
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        setCurrentUserEmail(session.user.email ?? null);
      } else {
        setIsAuthenticated(false);
        setCurrentUserId(null);
        setCurrentUserEmail(null);
      }
      setIsLoadingEmail(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    fetchAccounts(currentUserId);
  }, [currentUserId, accountsRefreshKey]);

  // Sincronizar conta quando retornar do Unipile com account_id
  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;
    
    const params = new URLSearchParams(window.location.search);
    const accountId = params.get('account_id');
    const isNewConnection = params.get('flow') === 'new_connection';
    
    if (accountId && !params.has('reconnect') && !syncedAccountIds.has(accountId) && !isNewConnection) {
      const syncAndRefresh = async () => {
        try {
          await syncLinkedInAccount({
            accountId: accountId,
            userId: currentUserId
          });
          setSyncedAccountIds(prev => new Set(prev).add(accountId));
          setAccountsRefreshKey(prev => prev + 1);
          // Clean URL
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('account_id');
          cleanUrl.searchParams.delete('flow');
          cleanUrl.searchParams.delete('reconnect');
          window.history.replaceState({}, '', cleanUrl.toString());
        } catch (err) {
        }
      };
      syncAndRefresh();
    } else if ((accountId || isNewConnection) && !params.has('reconnect')) {
      // Clean URL if new connection flow or has accountId but no sync needed
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('account_id');
      cleanUrl.searchParams.delete('flow');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [currentUserId, isAuthenticated, syncedAccountIds]);

  useEffect(() => {
    if (activeTab === Tab.INBOX && currentAccount) {
      const fetchChats = async () => {
        try {
          const accountId = currentAccount.unipile_account_id || currentAccount.id;
          const response = await listChats({ account_id: accountId, limit: 50 });
          setChats(response);
        } catch (err) {
        }
      };
      void fetchChats();
    }
  }, [activeTab, currentAccount]);

  const handleAddAccount = async (newAccount: any) => {
    if (!currentUserId) {
      alert('Sessão expirada. Faça login novamente.');
      return;
    }
    
    const formattedAccount: Account = {
      id: newAccount.id,
      unipile_account_id: newAccount.unipile_account_id || newAccount.id,
      name: newAccount.name,
      status: newAccount.status as 'CREATION_SUCCESS' | 'RECONNECTED',
      initials: newAccount.initials || (() => {
        const nameParts = (newAccount.name || '').trim().split(/\s+/);
        const firstInitial = nameParts[0]?.[0] || '';
        const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] || '' : '';
        return (firstInitial + (lastInitial || firstInitial)).toUpperCase() || 'LI';
      })(),
      avatar_url: newAccount.profile_picture_url || ''
    };

    // Verificar se a conta já existe
    const accountExists = accounts.some(a => a.id === formattedAccount.id);
    if (accountExists) {
      alert('Esta conta já está vinculada. Remova-a primeiro se quiser reconectá-la.');
      return;
    }

    // Verificar se usuário já tem uma conta vinculada
    if (accounts.length >= 1) {
      alert('Você já possui uma conta vinculada. Remova-a primeiro para adicionar outra.');
      return;
    }

    // Salvar conta no banco de dados (Supabase)
    try {
      type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
      const accountToInsert: AccountInsert = {
        id: formattedAccount.id,
        unipile_account_id: formattedAccount.unipile_account_id,
        name: formattedAccount.name,
        status: formattedAccount.status,
        initials: formattedAccount.initials,
        user_id: currentUserId,
        proxy_settings: newAccount.proxy_settings || null
      };

      const { error } = await (supabase as any)
        .from('accounts')
        .insert(accountToInsert);

      if (error) {
        alert('Erro ao salvar a conta. Tente novamente.');
        return;
      }
    } catch (err) {
      alert('Erro inesperado ao adicionar conta.');
      return;
    }

    setAccounts(prev => [...prev, formattedAccount]);
    setCurrentAccount(formattedAccount);
  };

  const handleLoginSuccess = (userId: string) => {
    setCurrentUserId(userId);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated || !currentUserId) {
    if (isResetPasswordPage) {
      return <ResetPassword />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-6">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Carregando sua conta</h2>
          <p className="text-gray-500 text-center text-sm leading-relaxed">
            Estamos sincronizando suas conexões e mensagens do Unipile. Por favor, aguarde um momento.
          </p>
          <div className="mt-8 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-brand-600 h-full w-2/3 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
        activeTab === tab
          ? 'bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4.5 h-4.5 ${activeTab === tab ? 'text-brand-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-2 px-2 mb-8 mt-2">
            <div className="bg-brand-600 p-2 rounded-lg shadow-sm">
               <Workflow className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800 tracking-tight">Luma Prospect</span>
          </div>

          <nav className="flex-1 space-y-1">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Geral</p>
            <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Painel" />
            <NavItem tab={Tab.CAMPAIGNS} icon={Workflow} label="Campanhas" />
            
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">Vendas</p>
            <NavItem tab={Tab.AUDIENCE} icon={Users} label="Audiência" />
            <NavItem tab={Tab.INBOX} icon={InboxIcon} label="Inbox" />
            <NavItem tab={Tab.PIPELINE} icon={Columns} label="Pipeline" />
            <NavItem tab={Tab.INVITATIONS} icon={UserPlus} label="Convites" />
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
            
            {/* Account Selector */}
            {accounts.length === 0 ? (
              // No account: show simple connect button
              <button 
                onClick={() => {
                  setReconnectAccountId(undefined);
                  const url = new URL(window.location.href);
                  url.searchParams.set('flow', 'new_connection');
                  window.history.replaceState({}, '', url.toString());
                  setIsAuthModalOpen(true);
                }}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-left flex items-center gap-3"
              >
                <div className="w-8 h-8 border border-dashed border-gray-300 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Conectar Conta</p>
                  <p className="text-xs text-gray-400">Clique para vincular seu LinkedIn</p>
                </div>
              </button>
            ) : (
              // Has account
              <div className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-left">
                <div className="flex items-center gap-3">
                  {currentAccount?.avatar_url ? (
                    <img 
                      src={currentAccount.avatar_url} 
                      alt={currentAccount.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                      {currentAccount?.initials || 'LI'}
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-gray-700 truncate">{currentAccount?.name || currentAccount?.unipile_account_id || 'Nenhuma conta'}</p>
                     <p className={`text-xs ${currentAccount?.status === 'CREATION_SUCCESS' ? 'text-green-600' : currentAccount?.status === 'RECONNECTED' ? 'text-yellow-600' : 'text-gray-500'}`}>
                       {currentAccount?.status === 'CREATION_SUCCESS' ? 'Ativo' : currentAccount?.status === 'RECONNECTED' ? 'Reconectado' : 'Não sincronizado'}
                     </p>
                  </div>
                  {currentAccount?.status !== 'CREATION_SUCCESS' && (
                    <button 
                      onClick={() => {
                        setReconnectAccountId(currentAccount?.id);
                        setIsAuthModalOpen(true);
                      }}
                      className="px-2 py-1 bg-white border border-red-200 text-red-600 text-[10px] font-bold rounded-md hover:bg-red-50"
                    >
                      Reconectar
                    </button>
                  )}
                </div>
              </div>
            )}

            <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">
              <Settings className="w-4.5 h-4.5 text-gray-400" />
              Configurações
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                setCurrentUserId(null);
                setCurrentUserEmail(null);
              }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="w-4.5 h-4.5 text-red-400" />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
           <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg">
               <Workflow className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">Luma Prospect</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeTab}
                </h1>
                <p className="text-gray-500 mt-1">
                  {activeTab === Tab.DASHBOARD && `Visão geral para ${currentAccount?.unipile_account_id || currentAccount?.name || 'sua conta'}`}
                  {activeTab === Tab.CAMPAIGNS && 'Crie e gerencie seus fluxos de automação.'}
                  {activeTab === Tab.AUDIENCE && 'Encontre e importe leads usando filtros.'}
                  {activeTab === Tab.INBOX && 'Gerencie mensagens não lidas e respostas.'}
                  {activeTab === Tab.PIPELINE && 'Acompanhe suas oportunidades de venda.'}
                  {activeTab === Tab.INVITATIONS && 'Gerencie seus convites de conexão e novas amizades.'}
                </p>
              </div>
              
              {/* Context indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 self-start sm:self-auto">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {isLoadingEmail ? 'Carregando...' : `Visualizando: ${currentUserEmail || currentAccount?.name || '...'}`}
              </div>
            </header>

            {activeTab === Tab.DASHBOARD && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <Dashboard accounts={accounts} />
              </Suspense>
            )}
            {activeTab === Tab.CAMPAIGNS && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <CampaignBuilder />
              </Suspense>
            )}
            {activeTab === Tab.AUDIENCE && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <AudienceFilter />
              </Suspense>
            )}
            {activeTab === Tab.INBOX && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <Inbox chatsData={chats} currentAccount={currentAccount} />
              </Suspense>
            )}
            {activeTab === Tab.PIPELINE && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <PipelineBoard />
              </Suspense>
            )}
            {activeTab === Tab.INVITATIONS && (
              <Suspense fallback={<div className="flex items-center justify-center h-96 text-gray-500">Carregando...</div>}>
                <Invitations currentAccount={currentAccount} />
              </Suspense>
            )}
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LinkedIn Auth Modal */}
      <Suspense fallback={null}>
        <LinkedInAuth 
          isOpen={isAuthModalOpen} 
          onClose={() => {
            setIsAuthModalOpen(false);
            setReconnectAccountId(undefined);
            const url = new URL(window.location.href);
            if (url.searchParams.has('flow')) {
              url.searchParams.delete('flow');
              window.history.replaceState({}, '', url.toString());
            }
          }}
          onSuccess={handleAddAccount}
          reconnectAccountId={reconnectAccountId}
          userId={currentUserId || undefined}
        />
      </Suspense>
    </div>
  );
};

export default App;
