
import React, { useState } from 'react';
import { Linkedin, X, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LinkedInAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: any) => void;
}

const LinkedInAuth: React.FC<LinkedInAuthProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'connecting' | 'success'>('initial');

  if (!isOpen) return null;

  const handleStartAuth = async () => {
    setLoading(true);
    setError(null);
    setStep('connecting');

    try {
      // De acordo com https://developer.unipile.com/docs/hosted-auth
      // 1. O backend deve criar uma Hosted Session na API do Unipile
      // POST https://api.unipile.com/account/hosted_session
      // 2. O Unipile retorna uma URL (url) para redirecionamento

      // Simulação de chamada de API para obter a URL do Hosted Auth
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // No mundo real, aqui você redirecionaria:
      // window.location.href = hostedSessionUrl;
      
      // Para fins de demonstração na UI, vamos simular o sucesso
      setStep('success');
      if (onSuccess) {
        onSuccess({
          id: Math.random().toString(36).substr(2, 9),
          name: 'Nova Conta LinkedIn',
          status: 'Ativo',
          initials: 'NC'
        });
      }
    } catch (err) {
      setError('Ocorreu um erro ao iniciar a autenticação. Tente novamente.');
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
          <h3 className="font-semibold text-gray-900">Conectar LinkedIn</h3>
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
              <h4 className="text-xl font-bold text-gray-900 mb-2">Autenticação Segura</h4>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Utilizamos o Unipile para conectar sua conta do LinkedIn com segurança. Você será redirecionado para a página de login oficial.
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
                    Iniciar Conexão
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                )}
              </button>
              
              <p className="mt-4 text-xs text-gray-400">
                Ao continuar, você concorda com nossos termos de serviço.
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
              <h4 className="text-lg font-bold text-gray-900 mb-2">Preparando conexão...</h4>
              <p className="text-gray-500">Estamos estabelecendo um túnel seguro com o Unipile.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Conectado!</h4>
              <p className="text-gray-500 mb-8">
                Sua conta do LinkedIn foi vinculada com sucesso ao Luma Prospect.
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
            <span className="text-blue-600 font-extrabold italic">Unipile</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkedInAuth;
