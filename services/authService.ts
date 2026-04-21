const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

const parseJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status} - ${text}`);
  }

  if (!contentType || !contentType.includes('application/json')) {
    console.error('Resposta inesperada (não-JSON):', text.substring(0, 100));
    throw new Error('O servidor retornou HTML em vez de JSON.');
  }

  return JSON.parse(text);
};

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  message?: string;
}

export const register = async (payload: RegisterRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao registrar:', error);
    throw error;
  }
};

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
};