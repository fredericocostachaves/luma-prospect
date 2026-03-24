
import React, { useState } from 'react';
import { Linkedin, X, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getHostedAuthLink, redirectToHostedAuth } from '../services/unipileService';
import { supabase } from '../utils/supabase';

interface LinkedInAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: any) => void;
  userId?: string;
  reconnectAccountId?: string;
  notifyUrl?: string;
}

const LinkedInAuth: React.FC<LinkedInAuthProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId, 
  reconnectAccountId,
  notifyUrl 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'connecting' | 'redirected' | 'success'>('initial');
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);

  // Implementação de Supabase Realtime para ouvir quando a conta for criada/atualizada via Webhook (Step 4 do Unipile)
  React.useEffect(() => {
    if (step !== 'redirected' || !userId) return;

    // Verificar imediatamente ao entrar neste estado (caso o webhook tenha sido mais rápido)
    checkStatus();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts'
          // Removido filtro de postgres para maior robustez, filtrando no callback
        },
        (payload) => {
          console.log('Mudança detectada na tabela accounts:', payload);
          const newAccount = payload.new as any;
          // Se uma nova conta foi inserida ou atualizada para Ativo, podemos considerar sucesso
          if (newAccount && newAccount.user_id === userId && newAccount.status === 'Ativo') {
            setStep(prev => {
              if (prev !== 'success' && onSuccess) {
                onSuccess(newAccount);
              }
              return 'success';
            });
          }
        }
      )
      .subscribe();

    // Polling de segurança a cada 5 segundos (opcional, mas garante o retorno caso o realtime falhe)
    const interval = setInterval(checkStatus, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [step, userId, onSuccess]);

  const checkStatus = async () => {
    if (!userId) return;
    try {
      const { data, error: supabaseError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Ativo')
        .order('created_at', { ascending: false })
        .limit(1);

      if (supabaseError) {
        console.error('Supabase error in checkStatus:', supabaseError);
        return;
      }

      if (data && data.length > 0) {
        const resultAccount = data[0];
        setStep(prev => {
          if (prev !== 'success' && onSuccess) {
            onSuccess(resultAccount);
          }
          return 'success';
        });
      }
    } catch (err: any) {
      console.error('Erro ao verificar status:', err);
      // Opcional: setError('Não foi possível verificar o status da conta no momento.');
    }
  };

  if (!isOpen) return null;

  const handleStartAuth = async () => {
    setLoading(true);
    setError(null);
    setStep('connecting');

    try {
      // Step 1 & 2: O backend deve criar o link do Hosted Auth Wizard
      const isReconnect = !!reconnectAccountId;
      
      const response = await getHostedAuthLink({
        type: isReconnect ? 'reconnect' : 'create',
        reconnect_account: reconnectAccountId,
        providers: '*', // Alinhado com o exemplo funcional do usuário
        api_url: 'https://api34.unipile.com:16410', // URL da instância api34 conforme exemplo
        expiresOn: new Date(Date.now() + 86400000).toISOString(), // Expira em 24h
        name: userId || 'anonymous_user',
        notify_url: notifyUrl || import.meta.env.VITE_UNIPILE_NOTIFY_URL,
        success_redirect_url: window.location.origin + '/?status=success', 
        failure_redirect_url: window.location.origin + '/?status=failure'
      });

      setHostedUrl(response.url);
      
      // Step 3: Redirecionamento automático recomendado
      redirectToHostedAuth(response.url);
      
      setStep('redirected');
      
      console.log('Wizard do Unipile iniciado. Redirecionando para o fluxo de autenticação.');

    } catch (err) {
      setError('Ocorreu um erro ao iniciar a autenticação (Hosted Auth Wizard). Tente novamente.');
      setStep('initial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex flex-col">
            <h3 className="font-semibold text-gray-900 leading-none mb-1">Conectar via Hosted Auth Wizard</h3>
            <span className="text-[10px] text-gray-500 font-medium">Fluxo Unipile Recomendado</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 'initial' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                <Linkedin className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {reconnectAccountId ? 'Reconectar Conta' : 'Conexão Simplificada'}
              </h4>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Usamos o <strong>Hosted Auth Wizard</strong> do Unipile para fornecer uma interface segura e otimizada de login. 
              </p>
              
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleStartAuth}
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Gerar Link de Conexão
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
              
              <p className="mt-4 text-xs text-gray-400">
                O link será gerado de forma única para sua segurança.
              </p>
            </div>
          )}

          {step === 'connecting' && (
            <div className="text-center py-12">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-brand-600 rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Linkedin className="w-8 h-8 text-brand-600" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Gerando Link Seguro...</h4>
              <p className="text-gray-500 text-sm">Seu backend está solicitando o wizard para o Unipile.</p>
            </div>
          )}

          {step === 'redirected' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100">
                <ExternalLink className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Redirecionando</h4>
              <p className="text-sm text-gray-500 mb-6">
                Estamos enviando você para o Wizard de conexão.<br/>
                Caso o redirecionamento demore, clique no botão abaixo:
              </p>
              <div className="flex flex-col gap-2 items-center mb-6">
                <button 
                  onClick={checkStatus}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Já conectei! Verificar agora
                </button>

                <a 
                  href={hostedUrl || '#'} 
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
                >
                  O link não abriu? Clique aqui para abrir manualmente
                </a>
              </div>

              <div className="flex items-center justify-center gap-2 text-brand-600 text-xs mt-2 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aguardando conclusão do fluxo...
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Conectado!</h4>
              <p className="text-gray-500 mb-8 text-sm">
                Sua conta do LinkedIn foi vinculada via <strong>Hosted Auth Wizard</strong> com sucesso.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3.5 px-6 rounded-xl transition-all"
              >
                Concluir
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            Powered by 
            <span className="text-blue-600 font-extrabold italic">Unipile Wizard</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkedInAuth;
