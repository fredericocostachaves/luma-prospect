import React, { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutDashboard, Users, Workflow, Inbox as InboxIcon, Menu, Settings, LogOut, ChevronDown, ChevronUp, Plus, Check, Columns } from 'lucide-react';
import { supabase } from './utils/supabase';
import { Database } from './database.types';
import { listAccounts, listChats, UnipileChatsResponse, syncLinkedInAccount } from './services/unipileService';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';

// Lazy load heavy components
const CampaignBuilder = lazy(() => import('./components/CampaignBuilder'));
const AudienceFilter = lazy(() => import('./components/AudienceFilter'));
const PipelineBoard = lazy(() => import('./components/KanbanInbox'));
const Inbox = lazy(() => import('./components/Inbox'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const LinkedInAuth = lazy(() => import('./components/LinkedInAuth'));

enum Tab {
  DASHBOARD = 'Painel de Controle',
  CAMPAIGNS = 'Campanhas',
  AUDIENCE = 'Audiência & Listas',
  INBOX = 'Caixa de Entrada',
  PIPELINE = 'Pipeline de Vendas',
}

interface Account {
  id: string;
  name: string;
  email: string;
  status: 'Ativo' | 'Desconectado' | 'Restrito';
  initials: string;
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
  const [syncedAccountIds, setSyncedAccountIds] = useState<Set<string>>(new Set());
  
  // Account State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Inbox State
  const [chats, setChats] = useState<UnipileChatsResponse | null>(null);

  const isResetPasswordPage = window.location.pathname === '/reset-password' || window.location.search.includes('type=recovery');

  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingEmail(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setIsAuthenticated(true)
        setCurrentUserId(session.user.id)
        setCurrentUserEmail(session.user.email ?? null)
      } else {
        setIsAuthenticated(false)
        setCurrentUserId(null)
        setCurrentUserEmail(null)
      }
      setIsLoadingEmail(false)
    }
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true)
        setCurrentUserId(session.user.id)
        setCurrentUserEmail(session.user.email ?? null)
      } else {
        setIsAuthenticated(false)
        setCurrentUserId(null)
        setCurrentUserEmail(null)
      }
      setIsLoadingEmail(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let isMounted = true;

const fetchAccounts = async () => {
      try {

        const params = new URLSearchParams(window.location.search);
        const accountId = params.get('account_id');
        
        let accountsToDisplay: Account[] = [];

        // 1. Se veio do flow de autenticação com account_id, sincronizar a nova conta
        if (accountId && currentUserId && !window.location.search.includes('reconnect')) {
          try {
            await syncLinkedInAccount({
              accountId: accountId,
              userId: currentUserId
            });
            console.log('Conta sincronizada:', accountId);
          } catch (err) {
            console.error('Erro ao sincronizar conta:', err);
          }
          
          // Limpar URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        
        // 2. Buscar contas vinculadas ao usuário no Supabase
        if (!currentUserId) return;
        
        const { data: linkedAccounts, error: linkedError } = await (supabase as any)
          .from('accounts')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: true });

        if (linkedError) {
          console.error('Erro ao carregar contas do Supabase:', linkedError);
        }

// 3. Se há contas vinculadas, buscar status atualizado do Unipile para cada uma
        if (linkedAccounts && linkedAccounts.length > 0) {
          try {
            const unipileResponse = await listAccounts();
            
            for (const acc of linkedAccounts) {
              const unipileAcc = unipileResponse?.items?.find((u: any) => u.id === acc.id);
              const sourceStatus = unipileAcc?.sources?.[0]?.status || 'UNKNOWN';
              accountsToDisplay.push({
                id: acc.id,
                name: acc.name,
                email: acc.email || unipileAcc?.type || 'Sem e-mail',
                status: sourceStatus === 'OK' ? 'Ativo' : (sourceStatus === 'CONNECTING' ? 'Desconectado' : 'Restrito'),
                initials: acc.initials || acc.name.substring(0, 2).toUpperCase()
              });
            }
          } catch (err) {
            console.error('Erro ao buscar contas do Unipile:', err);
            for (const acc of linkedAccounts) {
              accountsToDisplay.push({
                id: acc.id,
                name: acc.name,
                email: acc.email || 'Sem e-mail',
                status: 'Desconectado' as const,
                initials: acc.initials || acc.name.substring(0, 2).toUpperCase()
              });
            }
          }
        }


if (isMounted) {
          if (accountsToDisplay.length > 0) {
            setAccounts(accountsToDisplay);
            setCurrentAccount(accountsToDisplay[0]);
          } else {
            setAccounts([]);
            setCurrentAccount(null);
          }
        }

      } catch (err) {
        console.error('Erro ao carregar contas:', err);
      }
    };

    void fetchAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sincronizar conta quando retornar do Unipile com account_id
  useEffect(() => {
    if (!currentUserId || !isAuthenticated) return;
    
    const params = new URLSearchParams(window.location.search);
    const accountId = params.get('account_id');
    
    if (accountId && !window.location.search.includes('reconnect') && !syncedAccountIds.has(accountId)) {
      const syncAndRefresh = async () => {
        try {
          await syncLinkedInAccount({
            accountId: accountId,
            userId: currentUserId
          });
          console.log('Conta sincronizada:', accountId);
          setSyncedAccountIds(prev => new Set(prev).add(accountId));
          window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
          console.error('Erro ao sincronizar conta:', err);
        }
      };
      syncAndRefresh();
    }
  }, [currentUserId, isAuthenticated, syncedAccountIds]);

  useEffect(() => {
    if (activeTab === Tab.INBOX && currentAccount) {
      const fetchChats = async () => {
        try {
          const response = await listChats({ account_id: currentAccount.id, limit: 50 });
          setChats(response);
        } catch (err) {
          console.error('Erro ao carregar chats:', err);
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
      name: newAccount.name,
      email: newAccount.email,
      status: newAccount.status as 'Ativo' | 'Desconectado' | 'Restrito',
      initials: newAccount.initials || newAccount.name.substring(0, 2).toUpperCase()
    };

    // Verificar se a conta já existe
    const accountExists = accounts.some(a => a.id === formattedAccount.id);
    if (accountExists) {
      console.error('Conta já existe');
      alert('Esta conta já está vinculada. Remova-a primeiro se quiser reconectá-la.');
      return;
    }

    // Verificar limite de 5 contas
    if (accounts.length >= 5) {
      console.error('Limite de 5 contas atingido');
      alert('Você atingiu o limite máximo de 5 contas. Remova uma conta para adicionar outra.');
      return;
    }

    // Salvar conta no banco de dados (Supabase)
    try {

      
      type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
      const accountToInsert: AccountInsert = {
        id: formattedAccount.id,
        name: formattedAccount.name,
        email: formattedAccount.email,
        status: formattedAccount.status,
        initials: formattedAccount.initials,
        user_id: currentUserId,
        proxy_settings: newAccount.proxy_settings || null
      };

      const { error } = await (supabase as any)
        .from('accounts')
        .insert(accountToInsert);

      if (error) {
        console.error('Erro ao salvar conta no banco:', error);
        alert('Erro ao salvar a conta. Tente novamente.');
        return;
      } else {

      }
    } catch (err) {
      console.error('Erro inesperado ao salvar conta:', err);
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
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
            
            {/* Account Selector */}
            <div className="relative">
                <button 
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                  className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                      {currentAccount?.initials || '??'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-700 truncate">{currentAccount?.name || 'Nenhuma conta'}</p>
                      <p className={`text-xs ${currentAccount?.status === 'Ativo' ? 'text-green-600' : currentAccount?.status === 'Desconectado' ? 'text-yellow-600' : 'text-red-500'}`}>
                        {currentAccount?.status || 'Não sincronizado'}
                      </p>
                    </div>
                    {isSwitcherOpen ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600"/>}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isSwitcherOpen && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 space-y-1">
                      {accounts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">Nenhuma conta vinculada</p>
                          <p className="text-xs text-gray-400 mt-1">Conecte uma conta para começar</p>
                        </div>
                      ) : (
                        accounts.map(account => (
                          <div key={account.id} className="group relative">
                            <button
                              onClick={() => {
                                setCurrentAccount(account);
                                setIsSwitcherOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${currentAccount?.id === account.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentAccount?.id === account.id ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {account.initials}
                               </div>
                               <div className="flex-1 text-left truncate">
                                  <p className="font-medium">{account.name}</p>
                                  <p className={`text-[10px] ${account.status === 'Ativo' ? 'text-green-600' : account.status === 'Desconectado' ? 'text-yellow-600' : 'text-red-500'}`}>{account.status}</p>
                               </div>
                               {currentAccount?.id === account.id && <Check className="w-3 h-3" />}
                            </button>
                            
                            {account.status !== 'Ativo' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReconnectAccountId(account.id);
                                  setIsAuthModalOpen(true);
                                  setIsSwitcherOpen(false);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 px-2 py-1 bg-white border border-red-200 text-red-600 text-[10px] font-bold rounded-md hover:bg-red-50"
                              >
                                Reconectar
                              </button>
                            )}
                          </div>
                        ))
                      )}
                      <div className="h-px bg-gray-100 my-1" />
                      <button 
                        onClick={() => {
                          setReconnectAccountId(undefined);
                          setIsAuthModalOpen(true);
                          setIsSwitcherOpen(false);
                        }}
                        disabled={accounts.length >= 5}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                          accounts.length >= 5
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-brand-600'
                        }`}
                        title={accounts.length >= 5 ? 'Limite de 5 contas atingido' : ''}
                      >
                        <div className={`w-6 h-6 border border-dashed rounded-full flex items-center justify-center ${
                          accounts.length >= 5 ? 'border-gray-200' : 'border-gray-300'
                        }`}>
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="font-medium">{accounts.length === 0 ? 'Conectar Conta' : 'Adicionar Conta'}</span>
                        {accounts.length >= 5 && <span className="ml-auto text-xs">Limite: 5/5</span>}
                      </button>
                    </div>
                  </div>
                )}
            </div>

            <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">
              <Settings className="w-4.5 h-4.5 text-gray-400" />
              Configurações
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut()
                setIsAuthenticated(false)
                setCurrentUserId(null)
                setCurrentUserEmail(null)
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
                  {activeTab === Tab.DASHBOARD && `Visão geral para ${currentAccount?.name || 'sua conta'}`}
                  {activeTab === Tab.CAMPAIGNS && 'Crie e gerencie seus fluxos de automação.'}
                  {activeTab === Tab.AUDIENCE && 'Encontre e importe leads usando filtros.'}
                  {activeTab === Tab.INBOX && 'Gerencie mensagens não lidas e respostas.'}
                  {activeTab === Tab.PIPELINE && 'Acompanhe suas oportunidades de venda.'}
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