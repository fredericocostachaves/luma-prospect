import React, { useState } from 'react';
import { LayoutDashboard, Users, Workflow, Inbox as InboxIcon, Menu, Settings, LogOut, Linkedin, ChevronDown, ChevronUp, Plus, Check, Columns } from 'lucide-react';
import CampaignBuilder from './components/CampaignBuilder';
import AudienceFilter from './components/AudienceFilter';
import PipelineBoard from './components/KanbanInbox'; // Renamed export in file
import Inbox from './components/Inbox';
import Dashboard from './components/Dashboard';
import LinkedInAuth from './components/LinkedInAuth';

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

const ACCOUNTS: Account[] = [
  { id: '1', name: 'João Silva', email: 'joao.silva@empresa.com.br', status: 'Ativo', initials: 'JS' },
  { id: '2', name: 'Sara Costa', email: 'sara.costa@tech.com', status: 'Ativo', initials: 'SC' },
  { id: '3', name: 'Marcos Souza', email: 'marcos@vendas.org', status: 'Restrito', initials: 'MS' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Account State
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);
  const [currentAccount, setCurrentAccount] = useState<Account>(ACCOUNTS[0]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const handleAddAccount = (newAccount: Account) => {
    setAccounts(prev => [...prev, newAccount]);
    setCurrentAccount(newAccount);
  };

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
                      {currentAccount.initials}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-semibold text-gray-700 truncate">{currentAccount.name}</p>
                      <p className={`text-xs ${currentAccount.status === 'Ativo' ? 'text-green-600' : 'text-red-500'}`}>
                        {currentAccount.status}
                      </p>
                    </div>
                    {isSwitcherOpen ? <ChevronUp className="w-4 h-4 text-gray-400"/> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600"/>}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isSwitcherOpen && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 space-y-1">
                      {accounts.map(account => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setCurrentAccount(account);
                            setIsSwitcherOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${currentAccount.id === account.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentAccount.id === account.id ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
                              {account.initials}
                           </div>
                           <span className="flex-1 text-left truncate">{account.name}</span>
                           {currentAccount.id === account.id && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                      <div className="h-px bg-gray-100 my-1" />
                      <button 
                        onClick={() => {
                          setIsAuthModalOpen(true);
                          setIsSwitcherOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-brand-600 transition-colors"
                      >
                        <div className="w-6 h-6 border border-dashed border-gray-300 rounded-full flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="font-medium">Adicionar Conta</span>
                      </button>
                    </div>
                  </div>
                )}
            </div>

            <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">
              <Settings className="w-4.5 h-4.5 text-gray-400" />
              Configurações
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl">
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
                  {activeTab === Tab.DASHBOARD && `Visão geral para ${currentAccount.name}`}
                  {activeTab === Tab.CAMPAIGNS && 'Crie e gerencie seus fluxos de automação.'}
                  {activeTab === Tab.AUDIENCE && 'Encontre e importe leads usando filtros.'}
                  {activeTab === Tab.INBOX && 'Gerencie mensagens não lidas e respostas.'}
                  {activeTab === Tab.PIPELINE && 'Acompanhe suas oportunidades de venda.'}
                </p>
              </div>
              
              {/* Context indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 self-start sm:self-auto">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Visualizando: {currentAccount.name}
              </div>
            </header>

            {activeTab === Tab.DASHBOARD && <Dashboard />}
            {activeTab === Tab.CAMPAIGNS && <CampaignBuilder />}
            {activeTab === Tab.AUDIENCE && <AudienceFilter />}
            {activeTab === Tab.INBOX && <Inbox />}
            {activeTab === Tab.PIPELINE && <PipelineBoard />}
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
      <LinkedInAuth 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAddAccount}
        userId={currentAccount.id}
      />
    </div>
  );
};

export default App;