/**
 * Unipile Integration Service (Hosted Auth Wizard)
 * Doc: https://developer.unipile.com/docs/hosted-auth
 */

const parseJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status} - ${text}`);
  }

  if (!contentType || !contentType.includes('application/json')) {
    console.error('Resposta inesperada (não-JSON):', text.substring(0, 100));
    throw new Error('O servidor retornou HTML em vez de JSON. Verifique a configuração do Proxy no Nginx.');
  }

  return JSON.parse(text);
};

export interface HostedAuthRequest {
  type: 'create' | 'reconnect';
  providers: string[] | '*';
  api_url: string;
  expiresOn: string;
  notify_url?: string;
  name?: string; // internal user ID
  success_redirect_url?: string;
  failure_redirect_url?: string;
  reconnect_account?: string;
}

export interface HostedAuthResponse {
  object: 'HostedAuthURL' | 'HostedAuthUrl';
  url: string;
}

/**
 * IMPORTANTE: Conforme a documentação (Step 1), a chamada de API para gerar
 * o link do Hosted Auth Wizard DEVE ser feita a partir de um processo de backend
 * intermediário para proteger a X-API-KEY. Nunca exponha sua chave no frontend.
 */
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const getHostedAuthLink = async (payload: Partial<HostedAuthRequest>): Promise<HostedAuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao chamar o backend para Hosted Auth:', error);
    throw error;
  }
};

/**
 * List accounts from Unipile (via backend)
 */
export const listAccounts = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/hosted/accounts`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao listar contas do Unipile:', error);
    throw error;
  }
};

/**
 * Redirect to the Unipile Hosted Auth Wizard
 */
export const redirectToHostedAuth = (url: string) => {
  window.location.assign(url);
};

export interface CreateAccountRequest {
  email: string;
  password: string;
  name?: string;
  company?: string;
  phone?: string;
  country?: string;
}

export interface CreateAccountResponse {
  object: string;
  url: string;
}

export const createAccount = async (payload: CreateAccountRequest): Promise<CreateAccountResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/hosted/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao criar conta no Unipile:', error);
    throw error;
  }
};

export interface HostedReconnectRequest {
  accountId: string;
  type: 'reconnect';
  providers: string[];
  notifyUrl?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface HostedReconnectResponse {
  object: string;
  url: string;
}

export const getReconnectLink = async (payload: HostedReconnectRequest): Promise<HostedReconnectResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/hosted/accounts/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao gerar link de reconexão:', error);
    throw error;
  }
};
