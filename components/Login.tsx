import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertCircle, UserPlus } from 'lucide-react';
import { login, signUp } from '../services/authService';
import supabase from '../utils/supabase';

interface LoginProps {
  onLoginSuccess: (userId: string, email: string) => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'password_reset_failed') {
      setError('Link de redefinição expirado ou inválido. Por favor, solicite um novo link.');
      params.delete('error');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Preencha o e-mail');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        if (!password) {
          setError('Preencha a senha');
          return;
        }
        const response = await login({ email, password });
        if (!response.userId) {
          setError(response.message || 'Credenciais inválidas');
          return;
        }
        onLoginSuccess(response.userId, response.email);
      } else if (mode === 'signup') {
        if (!password) {
          setError('Preencha a senha');
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          return;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return;
        }
        const response = await signUp({ email, password });
        if (!response.userId) {
          setError(response.message || 'Erro ao realizar cadastro');
          return;
        }
        setSuccessMessage(response.message || 'Cadastro realizado com sucesso!');
        setMode('login');
      } else {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        setSuccessMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            {mode === 'signup' ? <UserPlus className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar nova conta' : 'Redefinir Senha'}
          </h1>
          <p className="text-slate-400 mt-2">
            {mode === 'login' 
              ? 'Entre para continuar usando o Luma Prospect' 
              : mode === 'signup'
              ? 'Preencha os dados abaixo para se cadastrar'
              : 'Informe seu e-mail para receber o link de redefinição'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="flex border-b border-slate-700/50">
            <button
              type="button"
              onClick={() => toggleMode('login')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                mode === 'login' 
                  ? 'text-white bg-blue-600/20 border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => toggleMode('signup')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${
                mode === 'signup' 
                  ? 'text-white bg-blue-600/20 border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              Criar Conta
            </button>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? "current-password" : "new-password"}
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              ) : mode === 'signup' ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Cadastrar
                </>
              ) : (
                'Enviar E-mail de Redefinição'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => toggleMode('reset')}
                className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                Esqueceu a senha? <span className="font-medium text-blue-400">Redefinir</span>
              </button>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => toggleMode('login')}
                className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
              >
                Já tem uma conta? <span className="font-medium text-blue-400">Fazer Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-slate-500 text-sm mt-8">
        Luma Prospect © 2026 • Sistema de Automação de LinkedIn
      </p>
    </div>
  </div>
);
};

export default Login;