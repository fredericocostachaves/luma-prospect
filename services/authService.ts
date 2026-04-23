import supabase from '../utils/supabase'

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  userId: string
  email: string
  message?: string
}

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password
    })

    if (error) {
      if (error.message.includes('Invalid login') || error.message.includes('invalid')) {
        return { userId: '', email: '', message: 'invalid' }
      }
      return { userId: '', email: '', message: error.message }
    }

    return {
      userId: data.user?.id || '',
      email: data.user?.email || payload.email,
      message: 'Login realizado com sucesso'
    }
  } catch (err: any) {
    return { userId: '', email: '', message: err.message || 'Erro ao fazer login' }
  }
}

export const logout = async (): Promise<void> => {
  await supabase.auth.signOut()
}