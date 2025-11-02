// Configuração da API para o frontend

// URLs base da API
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Ambiente do navegador
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://back-end-rosia02.vercel.app';
    }
    // Produção - ajuste conforme sua URL de produção
    return 'https://back-end-rosia02.vercel.app';
  }
  
  // Ambiente Node.js (SSR)
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://back-end-rosia02.vercel.app';
  }
  return 'https://back-end-rosia02.vercel.app';
};

const BASE_URL = getBaseURL();

// Endpoints da API
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/api/auth/login`,
    REGISTER: `${BASE_URL}/api/auth/register`,
    GOOGLE_LOGIN: `${BASE_URL}/api/auth/login/google-direct`, // Endpoint antigo (ainda funcional)
    GOOGLE_LOGIN_SEPARATED: `${BASE_URL}/api/auth/login/google-separated`, // Novo endpoint para tabelas separadas
    LOGOUT: `${BASE_URL}/api/auth/logout`,
    REFRESH: `${BASE_URL}/api/auth/refresh`,
    VERIFY: `${BASE_URL}/api/auth/verify`
  },
  PROFILE: {
    GET: `${BASE_URL}/api/profile`,
    UPDATE: `${BASE_URL}/api/profile`,
    ADDRESSES: `${BASE_URL}/api/profile/addresses`
  },
  USERS: {
    ADDRESSES: `${BASE_URL}/api/users/addresses`
  },
  GOOGLE_USERS: {
    PROFILE: `${BASE_URL}/api/google-users/profile`,
    UPDATE_PROFILE: `${BASE_URL}/api/google-users/profile-update`,
    ADDRESSES: `${BASE_URL}/api/google-users/addresses`
  }
};

// Headers padrão
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Função para requisições autenticadas
export const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    ...DEFAULT_HEADERS,
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  const response = await fetch(endpoint, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Erro na requisição' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  
  return await response.json();
};

// Utilitários da API
export const apiUtils = {
  // Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  // Obter usuário armazenado
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Limpar dados de autenticação
  clearAuth: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Obter token atual
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  }
};

