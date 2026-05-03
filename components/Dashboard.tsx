import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Send, MessageCircle, Percent, AlertTriangle, Ban, DollarSign, FileText, Video } from 'lucide-react';

// --- MOCK DATA FOR CHARTS ---
const chartData = [
  { name: 'Seg', sent: 40, accepted: 24, replied: 10 },
  { name: 'Ter', sent: 30, accepted: 13, replied: 5 },
  { name: 'Qua', sent: 50, accepted: 30, replied: 15 },
  { name: 'Qui', sent: 45, accepted: 28, replied: 12 },
  { name: 'Sex', sent: 60, accepted: 40, replied: 20 },
  { name: 'Sab', sent: 20, accepted: 10, replied: 2 },
  { name: 'Dom', sent: 15, accepted: 8, replied: 1 },
];

// --- MOCK DATA FOR ACCOUNTS TABLE ---
interface AccountPerf {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'restricted' | 'disconnected';
  // Base metrics (daily average roughly)
  baseInvites: number;
  baseConnections: number;
  baseMessages: number;
  baseReplies: number;
  baseProposals: number;
  baseMeetings: number;
  baseSales: number;
}


type TimeRange = '1d' | '3d' | '7d' | '30d' | '3m' | '6m' | '12m';

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      <p className={`text-xs mt-1 ${color === 'red' ? 'text-red-500' : 'text-green-500'}`}>{sub}</p>
    </div>
    <div className={`p-3 rounded-lg ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

interface AccountFromApp {
  id: string;
  unipile_account_id?: string | null;
  name: string;
  status: 'CREATION_SUCCESS' | 'RECONNECTED';
  initials: string;
  avatar_url?: string;
}

interface DashboardProps {
  accounts?: AccountFromApp[];
}

const Dashboard: React.FC<DashboardProps> = ({ accounts = [] }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Map App accounts to AccountPerf for the table, matching with possible performance data
  const displayAccounts: AccountPerf[] = accounts.map(acc => {
    // Map status from App strings to Dashboard status keys
    const statusMap: Record<string, 'active' | 'restricted' | 'disconnected'> = {
      'CREATION_SUCCESS': 'active',
      'RECONNECTED': 'disconnected'
    };

    // Default performance data for accounts
    return {
      id: acc.id,
      name: acc.name,
      initials: acc.initials,
      status: statusMap[acc.status] || 'disconnected',
      baseInvites: 10,
      baseConnections: 4,
      baseMessages: 5,
      baseReplies: 1,
      baseProposals: 0,
      baseMeetings: 0,
      baseSales: 0
    };
  });

  // Helper to simulate data scaling based on time range
  const getMultiplier = (range: TimeRange) => {
    switch(range) {
      case '1d': return 1;
      case '3d': return 3;
      case '7d': return 7;
      case '30d': return 30;
      case '3m': return 90;
      case '6m': return 180;
      case '12m': return 365;
      default: return 1;
    }
  };

  const multiplier = getMultiplier(timeRange);

  return (
    <div className="space-y-8">
      
      {/* KPI Cards (Global) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Leads" value={(1240 * (multiplier > 7 ? multiplier/10 : 1)).toFixed(0)} sub="+12% cresc." icon={Users} color="blue" />
        <StatCard title="Conexões Enviadas" value={(845 * (multiplier > 7 ? multiplier/10 : 1)).toFixed(0)} sub="68% entregue" icon={Send} color="purple" />
        <StatCard title="Taxa de Aceite Média" value="42%" sub="+5% vs média" icon={Percent} color="green" />
        <StatCard title="Respostas Totais" value={(128 * (multiplier > 7 ? multiplier/10 : 1)).toFixed(0)} sub="Pipeline Ativo" icon={MessageCircle} color="orange" />
      </div>

      {/* Operations Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              Raio-X da Operação
            </h3>
            <p className="text-sm text-gray-500">Performance detalhada por conta conectada</p>
          </div>
          
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { k: '1d', l: '24h' },
              { k: '3d', l: '3 dias' },
              { k: '7d', l: '7 dias' },
              { k: '30d', l: '30 dias' },
              { k: '3m', l: '3 meses' },
              { k: '6m', l: '6 meses' },
              { k: '12m', l: '12 meses' }
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTimeRange(t.k as TimeRange)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  timeRange === t.k 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Conta / Status</th>
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">Convites</th>
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">Conexões</th>
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">% Aceite</th>
                <th className="px-4 py-4 text-center text-purple-600 bg-purple-50/30">Msgs Env.</th>
                <th className="px-4 py-4 text-center text-purple-600 bg-purple-50/30">Respostas</th>
                <th className="px-4 py-4 text-center border-l border-gray-100" title="Tag: Proposta Enviada">
                  <div className="flex items-center justify-center gap-1"><FileText className="w-3 h-3"/> Propostas</div>
                </th>
                <th className="px-4 py-4 text-center" title="Tag: Reunião Agendada">
                  <div className="flex items-center justify-center gap-1"><Video className="w-3 h-3"/> Reuniões</div>
                </th>
                <th className="px-4 py-4 text-center text-green-600 bg-green-50/30" title="Tag: Fechamento">
                  <div className="flex items-center justify-center gap-1"><DollarSign className="w-3 h-3"/> Vendas</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayAccounts.map((acc) => {
                // Calculate scaled metrics
                const invites = Math.floor(acc.baseInvites * multiplier);
                const connections = Math.floor(acc.baseConnections * multiplier);
                const rate = invites > 0 ? Math.round((connections / invites) * 100) : 0;
                const messages = Math.floor(acc.baseMessages * multiplier);
                const replies = Math.floor(acc.baseReplies * multiplier);
                const proposals = Math.floor(acc.baseProposals * multiplier);
                const meetings = Math.floor(acc.baseMeetings * multiplier);
                const sales = Math.floor(acc.baseSales * multiplier);

                return (
                  <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Account Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            acc.status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {acc.initials}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{acc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {acc.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Rodando
                              </span>
                            )}
                            {acc.status === 'restricted' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Bloqueada
                              </span>
                            )}
                            {acc.status === 'disconnected' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                <Ban className="w-3 h-3" />
                                Desconectada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Funnel Metrics */}
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-blue-50/10">{invites}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-blue-50/10">{connections}</td>
                    <td className="px-4 py-4 text-center font-medium bg-blue-50/10">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        rate >= 40 ? 'bg-green-100 text-green-700' : rate >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {rate}%
                      </span>
                    </td>

                    {/* Engagement Metrics */}
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-purple-50/10">{messages}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-purple-50/10">{replies}</td>

                    {/* Tag Conversion Metrics */}
                    <td className="px-4 py-4 text-center font-medium text-gray-700 border-l border-gray-100">{proposals}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-700">{meetings}</td>
                    <td className="px-4 py-4 text-center font-bold text-green-600 bg-green-50/10">{sales}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Visão Geral de Atividade (Agregado)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sent" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Enviados" />
                <Bar dataKey="accepted" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Aceitos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tendência de Respostas</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="replied" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} name="Respondidos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;