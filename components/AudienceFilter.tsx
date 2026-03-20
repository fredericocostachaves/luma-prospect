import React, { useState } from 'react';
import { Filter, Search, Users, MapPin, Briefcase, Building, List, Plus, MoreHorizontal, UserPlus, Trash2, CheckSquare } from 'lucide-react';
import { FilterState } from '../types';

// Mock Data for Saved Leads
const SAVED_LEADS = [
  { id: 1, name: "Ricardo Mendes", title: "CTO", company: "DevSolutions", location: "São Paulo, SP", date: "12/05/2024", avatar: "RM", status: "Disponível" },
  { id: 2, name: "Fernanda Torres", title: "Head de Marketing", company: "Growth Agency", location: "Rio de Janeiro, RJ", date: "10/05/2024", avatar: "FT", status: "Em Campanha" },
  { id: 3, name: "Carlos Drummond", title: "CEO Founder", company: "StartupX", location: "Belo Horizonte, MG", date: "09/05/2024", avatar: "CD", status: "Disponível" },
  { id: 4, name: "Ana Paula Silva", title: "Gerente de Vendas", company: "Retail Corp", location: "Curitiba, PR", date: "08/05/2024", avatar: "AS", status: "Disponível" },
  { id: 5, name: "Lucas Pereira", title: "Diretor de Operações", company: "Logística 360", location: "São Paulo, SP", date: "05/05/2024", avatar: "LP", status: "Contatado" },
  { id: 6, name: "Juliana Costa", title: "HR Manager", company: "PeopleFirst", location: "Florianópolis, SC", date: "02/05/2024", avatar: "JC", status: "Disponível" },
];

const AudienceFilter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'search'>('list');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

  // Filter Form State
  const [filters, setFilters] = useState<FilterState>({
    jobTitle: '',
    location: '',
    industry: '',
    companySize: '',
    keywords: '',
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching with filters:", filters);
    // Switch back to list view to simulate results
    setActiveTab('list');
  };

  const toggleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(l => l !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === SAVED_LEADS.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(SAVED_LEADS.map(l => l.id));
    }
  };

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

        {activeTab === 'list' && (
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              Filtrar Lista
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Importar CSV
            </button>
          </div>
        )}
      </div>

      {/* --- CONTENT: SAVED LEADS LIST --- */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Bulk Actions Bar */}
          {selectedLeads.length > 0 && (
            <div className="bg-brand-50 border-b border-brand-100 px-6 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-700">
                {selectedLeads.length} leads selecionados
              </span>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-200 text-brand-700 text-xs font-bold rounded-lg hover:bg-brand-100">
                  <UserPlus className="w-3.5 h-3.5" />
                  Adicionar à Campanha
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.length === SAVED_LEADS.length && SAVED_LEADS.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer" 
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Cargo & Empresa</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Data Importação</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SAVED_LEADS.map((lead) => (
                  <tr key={lead.id} className={`hover:bg-gray-50/80 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer" 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {lead.avatar}
                        </div>
                        <span className="font-semibold text-gray-800">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-medium">{lead.title}</span>
                        <span className="text-gray-500 text-xs">{lead.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {lead.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {lead.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        lead.status === 'Disponível' 
                          ? 'bg-green-100 text-green-700' 
                          : lead.status === 'Em Campanha' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-500">Mostrando 6 de 142 leads</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs border border-gray-300 rounded bg-white text-gray-600 disabled:opacity-50">Anterior</button>
              <button className="px-3 py-1 text-xs border border-gray-300 rounded bg-white text-gray-600">Próximo</button>
            </div>
          </div>
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
              <p className="text-sm text-gray-500">Defina os critérios para importar leads do LinkedIn Sales Navigator</p>
            </div>
          </div>

          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Job Title */}
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

              {/* Location */}
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

              {/* Industry */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building className="w-4 h-4 text-gray-400" />
                  Indústria / Setor
                </label>
                <select
                  name="industry"
                  value={filters.industry}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white transition-all"
                >
                  <option value="">Qualquer Indústria</option>
                  <option value="software">Software / TI</option>
                  <option value="marketing">Publicidade e Marketing</option>
                  <option value="finance">Serviços Financeiros</option>
                  <option value="health">Saúde e Bem-estar</option>
                </select>
              </div>

              {/* Company Size */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Users className="w-4 h-4 text-gray-400" />
                  Tamanho da Empresa
                </label>
                <select
                  name="companySize"
                  value={filters.companySize}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white transition-all"
                >
                  <option value="">Qualquer Tamanho</option>
                  <option value="1-10">1-10 funcionários</option>
                  <option value="11-50">11-50 funcionários</option>
                  <option value="51-200">51-200 funcionários</option>
                  <option value="201-500">201-500 funcionários</option>
                  <option value="500+">500+ funcionários</option>
                </select>
              </div>
            </div>

            {/* Keywords */}
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
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Limpar Filtros
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 shadow-md transition-all hover:shadow-lg"
              >
                <Search className="w-4 h-4" />
                Buscar & Criar Lista
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AudienceFilter;