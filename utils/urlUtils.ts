/**
 * Obtém a URL base da aplicação de forma dinâmica ou via variável de ambiente.
 */
export const getAppUrl = (): string => {
  // Em ambiente de produção, podemos querer forçar uma URL específica via variável de ambiente
  const envUrl = import.meta.env.VITE_APP_URL;
  
  if (envUrl) {
    // Remove a barra final se existir para consistência
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // Fallback para o origin atual do browser
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  // Último fallback (não deve acontecer no browser)
  return 'http://localhost:3000';
};

/**
 * Constrói uma URL de redirecionamento absoluta.
 */
export const getRedirectUrl = (path: string): string => {
  const baseUrl = getAppUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
