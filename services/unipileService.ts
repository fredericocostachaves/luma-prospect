/**
 * Unipile Integration Service (Hosted Auth Wizard)
 * Doc: https://developer.unipile.com/docs/hosted-auth
 */

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
    }

    return await response.json();
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na requisição: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar contas do Unipile:', error);
    throw error;
  }
};

/**
 * Conforme o Step 3 da documentação, o redirecionamento deve ser automático.
 */
export const redirectToHostedAuth = (url: string) => {
  // Conforme o pedido do usuário, agora o redirecionamento ocorre na mesma aba.
  // A documentação sugere um redirecionamento automático: "implement an automatic redirection mechanism"
  // E desaconselha o uso de iframes: "We do not recommend embedding our link in an iframe"
  window.location.assign(url);
};
