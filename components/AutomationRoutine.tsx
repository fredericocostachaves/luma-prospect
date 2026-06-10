import React, { useEffect, useState, useRef } from 'react';
import {
  Play, Square, Loader2, Heart, ExternalLink, CheckCircle2, XCircle, Clock,
  SkipForward, UserCheck, AlertTriangle, Send, MessageCircle, UserPlus, Edit3
} from 'lucide-react';
import supabase from '../utils/supabase';
import {
  getLinkedInProfilePosts, likeLinkedInPost, getProfile,
  sendInvitation, startChat, LinkedInPost
} from '../services/unipileService';

interface AutomationRoutineProps {
  currentAccount: { id: string; unipile_account_id?: string | null } | null;
  currentUserId: string | null;
}

type RoutineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
type RoutinePhase = 'like_connect' | 'check_message';

type LeadCampaignStatus = 'disponivel' | 'conexao_enviada' | 'conectado' | 'mensagem_enviada' | 'recusado';

interface LeadItem {
  id: string;
  name: string;
  provider_id: string | null;
  public_identifier: string | null;
  linkedin_url: string | null;
  avatar: string | null;
  title: string | null;
  status: string | null;
}

interface ActionLog {
  leadName: string;
  phase: string;
  action: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  timestamp: Date;
}

const AutomationRoutine: React.FC<AutomationRoutineProps> = ({ currentAccount, currentUserId }) => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [status, setStatus] = useState<RoutineStatus>('idle');
  const [phase, setPhase] = useState<RoutinePhase>('like_connect');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [messageText, setMessageText] = useState(
    'Olá {{nome}}, tudo bem? Vi que aceitou minha conexão. Gostaria de entender melhor como posso ajudar.'
  );
  const [lastRunSummary, setLastRunSummary] = useState<{
    total: number; success: number; error: number; skipped: number
  } | null>(null);
  const [realConnectionMap, setRealConnectionMap] = useState<Record<string, boolean>>({});
  const [checkingConnections, setCheckingConnections] = useState(false);
  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (!currentUserId || !currentAccount?.id) {
      setLoadingLeads(false);
      return;
    }
    const fetchLeads = async () => {
      setLoadingLeads(true);
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, provider_id, public_identifier, linkedin_url, avatar, title, status')
        .eq('user_id', currentUserId)
        .eq('account_id', currentAccount.id)
        .order('created_at', { ascending: false });
      if (!error && data) setLeads(data as LeadItem[]);
      setLoadingLeads(false);
    };
    fetchLeads();
  }, [currentUserId, currentAccount?.id]);

  useEffect(() => {
    if (!currentAccount || leads.length === 0) return;
    const accountId = currentAccount.unipile_account_id || currentAccount.id || '';
    if (!accountId) return;

    let cancelled = false;
    const checkAll = async () => {
      setCheckingConnections(true);
      const map: Record<string, boolean> = {};
      for (const lead of leads) {
        if (cancelled) break;
        const pid = lead.provider_id;
        if (!pid) continue;
        try {
          const profile = await getProfile(pid, accountId);
          const isConnected = profile?.is_relationship === true || !!profile?.connected_at;
          map[lead.id] = isConnected;
          if (isConnected && normalizeStatus(lead.status) === 'disponivel') {
            await updateLeadStatus(lead.id, 'conectado');
          }
        } catch { /* skip */ }
        await sleep(500);
      }
      if (!cancelled) setRealConnectionMap(map);
      setCheckingConnections(false);
    };
    checkAll();
    return () => { cancelled = true; };
  }, [currentAccount, leads.length]);

  const updateLeadStatus = async (leadId: string, newStatus: LeadCampaignStatus) => {
    await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  const addLog = (leadName: string, phase: string, action: string, status: 'success' | 'error' | 'skipped', message: string) => {
    setLogs(prev => [{ leadName, phase, action, status, message, timestamp: new Date() }, ...prev]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const resolveProviderId = async (lead: LeadItem): Promise<string | null> => {
    if (lead.provider_id) return lead.provider_id;
    const accountId = currentAccount?.unipile_account_id || currentAccount?.id || '';
    if (!accountId) return null;
    const pubId = lead.public_identifier || lead.linkedin_url?.split('/in/')[1]?.replace(/\/$/, '');
    if (!pubId) return null;
    try {
      const profile = await getProfile(pubId, accountId);
      return profile?.provider_id || null;
    } catch {
      return null;
    }
  };

  const processLikeConnect = async (lead: LeadItem): Promise<{ status: 'success' | 'error' | 'skipped'; message: string }> => {
    const accountId = currentAccount?.unipile_account_id || currentAccount?.id || '';
    if (!accountId) return { status: 'error', message: 'Conta sem unipile_account_id' };

    const providerId = await resolveProviderId(lead);
    if (!providerId) return { status: 'skipped', message: 'Sem identificador do perfil' };

    let profile: any = null;
    try {
      profile = await getProfile(providerId, accountId);
    } catch { /* ignore */ }

    const alreadyConnected = profile?.is_relationship === true || !!profile?.connected_at;
    if (alreadyConnected) {
      await updateLeadStatus(lead.id, 'conectado');
      return { status: 'skipped', message: 'Já é conexão, pulando convite' };
    }

    let liked = false;
    try {
      const result = await getLinkedInProfilePosts(accountId, providerId, 3);
      const posts = result.items || [];
      const unlikeable = posts.filter(p => p.social_id && !p.user_reacted && p.permissions?.can_react !== false);
      if (unlikeable.length > 0) {
        await likeLinkedInPost(accountId, unlikeable[0].social_id!);
        liked = true;
      }
    } catch { /* like failed, continue */ }

    try {
      await sendInvitation({ account_id: accountId, provider_id: providerId });
    } catch {
      return { status: 'error', message: 'Erro ao enviar convite' };
    }

    await updateLeadStatus(lead.id, 'conexao_enviada');
    const msg = liked ? 'Post curtido + convite enviado' : 'Convite enviado (sem post para curtir)';
    return { status: 'success', message: msg };
  };

  const processCheckMessage = async (lead: LeadItem): Promise<{ status: 'success' | 'error' | 'skipped'; message: string }> => {
    const accountId = currentAccount?.unipile_account_id || currentAccount?.id || '';
    if (!accountId) return { status: 'error', message: 'Conta sem unipile_account_id' };

    const providerId = await resolveProviderId(lead);
    if (!providerId) return { status: 'skipped', message: 'Sem identificador do perfil' };

    let profile: any = null;
    try {
      profile = await getProfile(providerId, accountId);
    } catch {
      return { status: 'error', message: 'Erro ao buscar perfil' };
    }

    const isConnected = profile?.is_relationship === true || !!profile?.connected_at;

    if (!isConnected) {
      return { status: 'skipped', message: 'Ainda não aceitou a conexão' };
    }

    await updateLeadStatus(lead.id, 'conectado');

    const connectedAt = profile.connected_at ? new Date(profile.connected_at * 1000) : null;
    const oneDay = 24 * 60 * 60 * 1000;
    const waitTime = connectedAt ? Math.max(0, oneDay - (Date.now() - connectedAt.getTime())) : oneDay;

    if (waitTime > 0) {
      const horas = Math.ceil(waitTime / (60 * 60 * 1000));
      addLog(lead.name, 'check_message', 'wait', 'success', `Aguardando ${horas}h para enviar mensagem`);
      if (waitTime < oneDay) {
        await sleep(Math.min(waitTime, 10000));
      }
    }

    if (cancelledRef.current) {
      return { status: 'skipped', message: 'Rotina cancelada antes de enviar mensagem' };
    }

    const personalizedMsg = messageText.replace(/\{\{nome\}\}/g, lead.name);

    try {
      const chatResult = await startChat({
        account_id: accountId,
        attendee_id: providerId,
        initial_message: personalizedMsg,
      });
      await updateLeadStatus(lead.id, 'mensagem_enviada');
      return { status: 'success', message: `Mensagem enviada: "${personalizedMsg.substring(0, 60)}..."` };
    } catch {
      return { status: 'error', message: 'Erro ao enviar mensagem' };
    }
  };

  const startRoutine = async () => {
    const targetLeads = leads.filter(l => selectedIds.has(l.id) && isSelectable(l));
    if (targetLeads.length === 0) return;

    cancelledRef.current = false;
    pausedRef.current = false;
    setStatus('running');
    setLogs([]);
    setLastRunSummary(null);
    setProgress({ current: 0, total: targetLeads.length });

    let success = 0, error = 0, skipped = 0;

    for (let i = 0; i < targetLeads.length; i++) {
      if (cancelledRef.current) break;
      while (pausedRef.current) {
        if (cancelledRef.current) break;
        await sleep(500);
      }
      if (cancelledRef.current) break;

      const lead = targetLeads[i];
      const phaseLabel = phase === 'like_connect' ? 'Curtir+Conectar' : 'Verificar+Mensagem';

      const result = phase === 'like_connect'
        ? await processLikeConnect(lead)
        : await processCheckMessage(lead);

      addLog(lead.name, phaseLabel, result.status, result.status, result.message);

      if (result.status === 'success') success++;
      else if (result.status === 'error') error++;
      else skipped++;

      setProgress({ current: i + 1, total: targetLeads.length });
      await sleep(3000 + Math.random() * 4000);
    }

    setStatus(cancelledRef.current ? 'cancelled' : 'completed');
    setLastRunSummary({ total: targetLeads.length, success, error, skipped });
  };

  const pauseRoutine = () => { pausedRef.current = true; setStatus('paused'); };
  const resumeRoutine = () => { pausedRef.current = false; setStatus('running'); };
  const cancelRoutine = () => { cancelledRef.current = true; setStatus('cancelled'); };

  const normalizeStatus = (s: string | null) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const phaseLeads = leads.filter(l => {
    const st = normalizeStatus(l.status);
    if (phase === 'like_connect') {
      if (realConnectionMap[l.id]) return false;
      return !l.status || st === 'disponivel' || st === 'recusado';
    }
    return st === 'conexao_enviada' || st === 'conectado';
  });

  const isSelectable = (lead: LeadItem) => {
    if (phase === 'like_connect') return !realConnectionMap[lead.id];
    return normalizeStatus(lead.status) === 'conectado';
  };

  const selectableLeads = leads.filter(l => isSelectable(l) && phaseLeads.includes(l));
  const selectableCount = selectableLeads.length;
  const selectedValid = new Set([...selectedIds].filter(id => leads.some(l => l.id === id && isSelectable(l))));

  const getLeadInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
    return (first + (last || first)).toUpperCase() || '?';
  };

  const toggleSelect = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!lead || !isSelectable(lead)) return;
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleSelectAll = () => {
    if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); }
    else { setSelectedIds(new Set(selectableLeads.map(l => l.id))); setSelectAll(true); }
  };

  useEffect(() => {
    const allSelected = selectableLeads.length > 0 && selectableLeads.every(l => selectedIds.has(l.id));
    setSelectAll(allSelected);
  }, [selectedIds, selectableLeads]);

  const statusBadge = (s: string | null) => {
    const map: Record<string, { label: string; cls: string }> = {
      disponivel: { label: 'Disponível', cls: 'bg-gray-100 text-gray-600' },
      conexao_enviada: { label: 'Convite Enviado', cls: 'bg-blue-100 text-blue-700' },
      conectado: { label: 'Conectado', cls: 'bg-green-100 text-green-700' },
      mensagem_enviada: { label: 'Mensagem Enviada', cls: 'bg-purple-100 text-purple-700' },
      recusado: { label: 'Recusado', cls: 'bg-red-100 text-red-700' },
    };
    const m = map[s || ''] || { label: s || '—', cls: 'bg-gray-100 text-gray-600' };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-6 h-6 text-brand-600" />
            Campanha de Automação
          </h2>
          <p className="text-sm text-gray-500">
            Curta posts, envie conexões, aguarde aceitação e dispare mensagens
          </p>
        </div>

        <div className="flex gap-2">
          {status === 'running' && (
            <>
              <button onClick={pauseRoutine} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100">
                <Clock className="w-4 h-4" /> Pausar
              </button>
              <button onClick={cancelRoutine} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                <Square className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}
          {status === 'paused' && (
            <>
              <button onClick={resumeRoutine} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                <Play className="w-4 h-4" /> Continuar
              </button>
              <button onClick={cancelRoutine} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                <Square className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}
          {(status === 'idle' || status === 'completed' || status === 'cancelled') && (
            <button
              onClick={startRoutine}
              disabled={selectedValid.size === 0 || !currentAccount}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Play className="w-4 h-4" />
              Executar Fase ({selectedValid.size})
            </button>
          )}
        </div>
      </div>

      {!currentAccount && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Conecte uma conta do LinkedIn para usar a automação.
        </div>
      )}

      {/* Phase Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 flex gap-1 w-fit">
        <button
          onClick={() => { setPhase('like_connect'); setLastRunSummary(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            phase === 'like_connect' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart className="w-4 h-4" />
          1. Curtir + Conectar
        </button>
        <button
          onClick={() => { setPhase('check_message'); setLastRunSummary(null); }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            phase === 'check_message' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Send className="w-4 h-4" />
          2. Verificar + Mensagem
        </button>
      </div>

      {/* Flow Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 flex-wrap">
          <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold">1. Curtir Post</span>
          <span className="text-gray-400">→</span>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">2. Enviar Conexão</span>
          <span className="text-gray-400">→</span>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">3. Conectou?</span>
          <span className="text-gray-400">→</span>
          <span className="text-green-600 font-bold">Sim</span>
          <span className="text-gray-400">→</span>
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">4. Aguardar 1 dia</span>
          <span className="text-gray-400">→</span>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">5. Enviar Mensagem</span>
          <span className="text-gray-300 mx-1">|</span>
          <span className="text-red-600 font-bold">Não</span>
          <span className="text-gray-400">→</span>
          <span className="text-red-100 bg-red-700 px-3 py-1 rounded-full text-xs font-bold">Sair da Campanha</span>
        </div>
      </div>

      {/* Message Template (Phase 2) */}
      {phase === 'check_message' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Edit3 className="w-4 h-4 text-gray-400" />
            Template de Mensagem (use {'{'}nome{'}'} para personalizar)
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm resize-none"
          />
        </div>
      )}

      {/* Progress Bar */}
      {(status === 'running' || status === 'paused') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status === 'running' ? <Loader2 className="w-5 h-5 text-brand-600 animate-spin" /> : <Clock className="w-5 h-5 text-amber-500" />}
              <span className="font-semibold text-gray-800">{status === 'running' ? 'Executando...' : 'Pausado'}</span>
            </div>
            <span className="text-sm text-gray-500">{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${status === 'running' ? 'bg-brand-600' : 'bg-amber-400'}`}
              style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Summary */}
      {lastRunSummary && (status === 'completed' || status === 'cancelled') && (
        <div className={`rounded-xl border p-5 ${status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {status === 'completed' ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-gray-500" />}
            <h3 className="font-bold text-gray-800">{status === 'completed' ? 'Fase concluída' : 'Cancelado'}</h3>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="text-gray-600">{lastRunSummary.total} leads</span>
            <span className="text-green-600 font-semibold">{lastRunSummary.success} sucesso</span>
            {lastRunSummary.error > 0 && <span className="text-red-600 font-semibold">{lastRunSummary.error} erro{lastRunSummary.error > 1 ? 's' : ''}</span>}
            {lastRunSummary.skipped > 0 && <span className="text-amber-600 font-semibold">{lastRunSummary.skipped} pulado{lastRunSummary.skipped > 1 ? 's' : ''}</span>}
          </div>
        </div>
      )}

      {/* Lead Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {phaseLeads.length} lead{phaseLeads.length !== 1 ? 's' : ''} nesta fase
            {selectedValid.size > 0 && <span className="text-brand-600 ml-2">({selectedValid.size} selecionados)</span>}
          </span>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={selectAll} onChange={toggleSelectAll}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer" />
            Selecionar todos
          </label>
        </div>

        {loadingLeads ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-brand-600 animate-spin" /></div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Heart className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-sm">Nenhum lead salvo. Importe leads primeiro na seção Audiência.</p>
          </div>
        ) : phaseLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <CheckCircle2 className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-sm">
              {phase === 'like_connect'
                ? 'Todos os leads já foram processados nesta fase. Mude para "Verificar + Mensagem".'
                : 'Nenhum lead com convite pendente. Execute a Fase 1 primeiro.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 w-10"></th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rede</th>
                  <th className="px-4 py-3">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.filter(l => {
                  const st = normalizeStatus(l.status);
                  if (phase === 'like_connect') {
                    if (realConnectionMap[l.id]) return false;
                    return !l.status || st === 'disponivel' || st === 'recusado';
                  }
                  return st === 'conexao_enviada' || st === 'conectado';
                }).map(lead => (
                  <tr key={lead.id} className={`hover:bg-gray-50/80 transition-colors ${selectedIds.has(lead.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-3">
                      <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                        disabled={!isSelectable(lead)}
                        className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {lead.avatar ? (
                          <img src={lead.avatar} alt={lead.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                            {getLeadInitials(lead.name)}
                          </div>
                        )}
                        <span className="font-medium text-gray-800 truncate max-w-[180px]">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]">{lead.title || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(lead.status)}</td>
                    <td className="px-4 py-3">
                      {checkingConnections && realConnectionMap[lead.id] === undefined ? (
                        <span className="text-gray-400 text-[10px]">verificando...</span>
                      ) : realConnectionMap[lead.id] ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          <UserCheck className="w-3 h-3" /> Contato
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                          Não contato
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.linkedin_url ? (
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <ExternalLink className="w-3 h-3" /> Perfil
                        </a>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Registro de Ações</h3>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 text-xs">
                <tr>
                  <th className="px-4 py-2">Lead</th>
                  <th className="px-4 py-2">Fase</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Detalhe</th>
                  <th className="px-4 py-2">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-700">{log.leadName}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{log.phase}</td>
                    <td className="px-4 py-2">
                      {log.status === 'success' && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sucesso</span>}
                      {log.status === 'error' && <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Erro</span>}
                      {log.status === 'skipped' && <span className="text-amber-600 flex items-center gap-1"><SkipForward className="w-3 h-3" /> Pulado</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[280px] truncate">{log.message}</td>
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{log.timestamp.toLocaleTimeString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRoutine;
