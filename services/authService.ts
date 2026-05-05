import supabase from '../utils/supabase'
import { getRedirectUrl } from '../utils/urlUtils'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  userId: string
  email: string
  message?: string
}

const translateError = (message: string): string => {
  if (message.includes('Invalid login') || message.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos'
  }
  if (message.includes('User not found')) {
    return 'Usuário não encontrado'
  }
  if (message.includes('Email not confirmed')) {
    return 'E-mail não confirmado. Verifique sua caixa de entrada.'
  }
  if (message.includes('Password is too short')) {
    return 'A senha é muito curta (mínimo 6 caracteres)'
  }
  if (message.includes('Rate limit exceeded')) {
    return 'Muitas tentativas. Tente novamente mais tarde.'
  }
  return message
}

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    })

    if (error) {
      return { userId: '', email: '', message: translateError(error.message) }
    }

    return {
      userId: data.user?.id || '',
      email: data.user?.email || payload.email,
      message: 'Login realizado com sucesso'
    }
  } catch (err: any) {
    return { userId: '', email: '', message: translateError(err.message || 'Erro ao fazer login') }
  }
}

export const signUp = async (payload: LoginRequest): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: getRedirectUrl('/confirm-email')
      }
    })

    if (error) {
      return { userId: '', email: '', message: translateError(error.message) }
    }

    // Se o usuário já existe e a proteção contra enumeração de e-mail estiver ativada,
    // o Supabase retorna um objeto de usuário mas a lista de identidades fica vazia.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { userId: '', email: '', message: 'Este e-mail já está cadastrado. Tente fazer login ou redefinir sua senha.' }
    }

    return {
      userId: data.user?.id || '',
      email: data.user?.email || payload.email,
      message: 'Cadastro realizado com sucesso! Verifique seu e-mail.'
    }
  } catch (err: any) {
    return { userId: '', email: '', message: err.message || 'Erro ao fazer cadastro' }
  }
}

export const logout = async (): Promise<void> => {
  await supabase.auth.signOut()
}