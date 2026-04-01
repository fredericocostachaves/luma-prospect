
import React, { useState } from 'react';
import { Linkedin, X, Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import { createAccount, getReconnectLink } from '../services/unipileService';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setError(null);
      setEmail('');
      setPassword('');
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
        response = await createAccount({
          email,
          password
        });
      }

      console.log('Link gerado:', response.url);
      window.location.href = response.url;

    } catch (err: any) {
      setError(err.message || 'Erro ao conectar conta.');
    } finally {
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
            <span className="text-[10px] text-gray-500 font-medium">LinkedIn via Unipile</span>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email LinkedIn</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                onClick={handleConnect}
                disabled={loading || !email || !password}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Linkedin className="w-5 h-5" />
                    {reconnectAccountId ? 'Reconectar LinkedIn' : 'Conectar LinkedIn'}
                  </>
                )}
              </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Powered by Unipile
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkedInAuth;
