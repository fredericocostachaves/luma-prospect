
import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { getHostedAuthLink, getReconnectLink } from '../services/unipileService';

// Simple Icons LinkedIn SVG
const LinkedInIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

interface LinkedInAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: any) => void;
  reconnectAccountId?: string;
}

const LinkedInAuth: React.FC<LinkedInAuthProps> = ({ 
  isOpen, 
  onClose,
  reconnectAccountId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      if (reconnectAccountId) {
        response = await getReconnectLink({
          accountId: reconnectAccountId,
          type: 'reconnect',
          providers: ['linkedin'],
          successRedirectUrl: window.location.origin + '/?status=success',
          failureRedirectUrl: window.location.origin + '/?status=failure'
        });
      } else {
        response = await getHostedAuthLink();
      }

      console.log('Link gerado:', response.url);
      window.location.href = response.url;

    } catch (err: any) {
      setError(err.message || 'Erro ao conectar conta.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex flex-col">
            <h3 className="font-semibold text-gray-900 leading-none mb-1">
              {reconnectAccountId ? 'Reconectar Conta' : 'Conectar Conta'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="text-center py-4">
                <p className="text-sm text-gray-600">
                  Você será redirecionado para o assistente de conexão segura para vincular sua conta do LinkedIn.
                </p>
              </div>

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LinkedInIcon className="w-5 h-5" />
                    {reconnectAccountId ? 'Reconectar LinkedIn' : 'Conectar LinkedIn'}
                  </>
                )}
              </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedInAuth;
