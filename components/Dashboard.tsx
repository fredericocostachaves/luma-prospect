import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Send, MessageCircle, Percent, AlertTriangle, Ban, DollarSign, FileText, Video } from 'lucide-react';
import supabase from '../utils/supabase';

interface AccountPerf {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'restricted' | 'disconnected';
  totalLeads: number;
  totalMessages: number;
  totalReplies: number;
  totalProposals: number;
  totalMeetings: number;
  totalSales: number;
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
  status: 'CREATION_SUCCESS' | 'RECONNECTED' | 'DISCONNECTED';
  initials: string;
  avatar_url?: string;
}

interface DashboardProps {
  accounts?: AccountFromApp[];
  currentUserId?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ accounts = [], currentUserId }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const [totalLeads, setTotalLeads] = useState(0);
  const [totalWithProviderId, setTotalWithProviderId] = useState(0);
  const [totalReplies, setTotalReplies] = useState(0);
  const [perfData, setPerfData] = useState<Record<string, any>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId);

        const { count: leadsWithProvider } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .not('provider_id', 'is', null);

        const { count: inboundMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('direction', 'inbound');

        setTotalLeads(leadsCount || 0);
        setTotalWithProviderId(leadsWithProvider || 0);
        setTotalReplies(inboundMessages || 0);

        const perfMap: Record<string, any> = {};
        for (const acc of accounts) {
          const { count: accLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('account_id', acc.id);

          const { count: accMsgs } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('account_id', acc.id)
            .eq('direction', 'outbound');

          const { count: accReplies } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('account_id', acc.id)
            .eq('direction', 'inbound');

          const { count: accDeals } = await supabase
            .from('pipeline_deals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('account_id', acc.id);

          perfMap[acc.id] = {
            leads: accLeads || 0,
            messages: accMsgs || 0,
            replies: accReplies || 0,
            deals: accDeals || 0,
          };
        }
        setPerfData(perfMap);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const startStr = sevenDaysAgo.toISOString();

        const { data: leadsByDay } = await supabase
          .from('leads')
          .select('created_at')
          .eq('user_id', currentUserId)
          .gte('created_at', startStr);

        const { data: msgsByDay } = await supabase
          .from('messages')
          .select('created_at, direction')
          .eq('user_id', currentUserId)
          .gte('created_at', startStr);

        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const dayMap: Record<string, { sent: number; replied: number }> = {};

        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const key = dayNames[d.getDay()];
          dayMap[key] = { sent: 0, replied: 0 };
        }

        (leadsByDay || []).forEach((l: any) => {
          const d = new Date(l.created_at);
          const key = dayNames[d.getDay()];
          if (dayMap[key]) dayMap[key].sent++;
        });

        (msgsByDay || []).forEach((m: any) => {
          const d = new Date(m.created_at);
          const key = dayNames[d.getDay()];
          if (dayMap[key] && m.direction === 'inbound') {
            dayMap[key].replied++;
          }
        });

        const chart = Object.entries(dayMap).map(([name, vals]) => ({
          name,
          sent: vals.sent,
          accepted: Math.round(vals.sent * 0.4),
          replied: vals.replied,
        }));
        setChartData(chart);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, accounts]);

  const statusMap: Record<string, 'active' | 'restricted' | 'disconnected'> = {
    'CREATION_SUCCESS': 'active',
    'RECONNECTED': 'disconnected',
    'DISCONNECTED': 'disconnected'
  };

  const displayAccounts: AccountPerf[] = accounts.map(acc => {
    const pd = perfData[acc.id] || { leads: 0, messages: 0, replies: 0, deals: 0 };
    return {
      id: acc.id,
      name: acc.name,
      initials: acc.initials,
      status: statusMap[acc.status] || 'disconnected',
      totalLeads: pd.leads,
      totalMessages: pd.messages,
      totalReplies: pd.replies,
      totalProposals: 0,
      totalMeetings: 0,
      totalSales: 0,
    };
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 text-sm">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* KPI Cards (Global) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Leads" value={totalLeads.toLocaleString('pt-BR')} sub="Base total" icon={Users} color="blue" />
        <StatCard title="Conexões Enviadas" value={totalWithProviderId.toLocaleString('pt-BR')} sub="Com perfil identificado" icon={Send} color="purple" />
        <StatCard title="Taxa de Aceite Média" value="--" sub="Aguardando dados" icon={Percent} color="green" />
        <StatCard title="Respostas Totais" value={totalReplies.toLocaleString('pt-BR')} sub="Mensagens recebidas" icon={MessageCircle} color="orange" />
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
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">Leads</th>
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">Msgs Env.</th>
                <th className="px-4 py-4 text-center text-blue-600 bg-blue-50/30">Respostas</th>
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
                const leads = Math.floor(acc.totalLeads * (multiplier > 7 ? multiplier/7 : 1));
                const messages = Math.floor(acc.totalMessages * (multiplier > 7 ? multiplier/7 : 1));
                const replies = Math.floor(acc.totalReplies * (multiplier > 7 ? multiplier/7 : 1));

                return (
                  <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
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

                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-blue-50/10">{leads}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-purple-50/10">{messages}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-600 bg-purple-50/10">{replies}</td>

                    <td className="px-4 py-4 text-center font-medium text-gray-700 border-l border-gray-100">{acc.totalProposals}</td>
                    <td className="px-4 py-4 text-center font-medium text-gray-700">{acc.totalMeetings}</td>
                    <td className="px-4 py-4 text-center font-bold text-green-600 bg-green-50/10">{acc.totalSales}</td>
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
          <h3 className="text-lg font-bold text-gray-800 mb-4">Leads Adicionados (7 dias)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sent" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="accepted" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Estimado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Respostas Recebidas (7 dias)</h3>
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
