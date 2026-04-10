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

export const getHostedAuthLink = async (payload?: Partial<HostedAuthRequest>): Promise<HostedAuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/unipile/accounts/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined
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
    const response = await fetch(`${API_BASE_URL}/api/v1/unipile/accounts`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/unipile/accounts/reconnect`, {
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

/**
 * Delete a specific account from Unipile
 */
export const deleteAccount = async (accountId: string): Promise<void> => {
  await fetch(`${API_BASE_URL}/api/v1/unipile/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json'
    }
  });
};

export interface UnipileChatMessage {
  id: string;
  text?: string;
  timestamp: string;
  sender_id: string;
  account_id: string;
  chat_id: string;
  type: string;
  status?: string;
}

export interface UnipileChat {
  id: string;
  account_id: string;
  account_type?: string;
  name?: string;
  last_message?: UnipileChatMessage;
  unread_count?: number;
  participants?: Array<{
    id: string;
    name?: string;
    avatar_url?: string;
    username?: string;
    title?: string;
    company?: string;
  }>;
  created_at?: string;
  updated_at?: string;
  snippet?: string;
}

export interface UnipileChatsResponse {
  object: string;
  items?: UnipileChat[];
  cursor?: string;
}

export interface ListChatsParams {
  unread?: boolean;
  cursor?: string;
  before?: string;
  after?: string;
  limit?: number;
  account_type?: string;
  account_id?: string;
}

export const listChats = async (params?: ListChatsParams): Promise<UnipileChatsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.unread !== undefined) queryParams.set('unread', String(params.unread));
      if (params.cursor) queryParams.set('cursor', params.cursor);
      if (params.before) queryParams.set('before', params.before);
      if (params.after) queryParams.set('after', params.after);
      if (params.limit) queryParams.set('limit', String(params.limit));
      if (params.account_type) queryParams.set('account_type', params.account_type);
      if (params.account_id) queryParams.set('account_id', params.account_id);
    }

    const url = `${API_BASE_URL}/api/v1/unipile/chats${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error('Erro ao listar chats do Unipile:', error);
    throw error;
  }
};

export interface UnipileChatAttendee {
  id: string;
  object?: string;
  account_id?: string;
  name?: string;
  username?: string;
  picture_url?: string;
  profile_url?: string;
  title?: string;
  company?: string;
  linkedin_id?: string;
}

export const getChatAttendee = async (attendeeId: string): Promise<UnipileChatAttendee | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/unipile/chat-attendees/${attendeeId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    return await parseJsonResponse(response);
  } catch (error) {
    console.error(`Erro ao buscar attendee ${attendeeId}:`, error);
    return null;
  }
};
