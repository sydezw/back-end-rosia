import axios from 'axios';

// 🔧 CONFIGURAÇÃO DA API
// Configuração automática baseada no ambiente
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // URL do backend no Vercel (substitua pela sua URL real)
    return process.env.REACT_APP_API_URL || 'https://rosita-backend-abc123.vercel.app/api';
  }
  // URL local para desenvolvimento
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// 🔐 INTERCEPTOR PARA ADICIONAR TOKEN AUTOMATICAMENTE
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔄 INTERCEPTOR PARA RENOVAÇÃO AUTOMÁTICA DE TOKEN
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 401 (não autorizado) e não for uma tentativa de renovação
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('🔄 Token expirado, tentando renovar...');
          
          // Tentar renovar o token
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          // Salvar novo token
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('refresh_token', data.session.refresh_token);

          // Repetir a requisição original com o novo token
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          
          console.log('✅ Token renovado com sucesso!');
          return api(originalRequest);
        } catch (refreshError) {
          console.error('❌ Erro ao renovar token:', refreshError);
          
          // Refresh falhou, limpar dados e redirecionar para login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Redirecionar para login (ajuste conforme sua aplicação)
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else {
        // Não há refresh token, redirecionar para login
        localStorage.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// 📊 INTERCEPTOR PARA LOG DE REQUISIÇÕES (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
      return config;
    },
    (error) => {
      console.error('❌ Erro na requisição:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data);
      return response;
    },
    (error) => {
      console.error(`❌ ${error.response?.status} ${error.config?.url}`, error.response?.data);
      return Promise.reject(error);
    }
  );
}

export default api;

// 🌐 CONFIGURAÇÕES PARA DIFERENTES AMBIENTES
/*
// Para usar em diferentes ambientes, você pode fazer assim:

const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // URLs de produção
    return process.env.REACT_APP_API_URL || 'https://seu-backend.railway.app/api';
  } else if (process.env.NODE_ENV === 'staging') {
    // URL de staging
    return 'https://staging-backend.railway.app/api';
  } else {
    // URL de desenvolvimento
    return 'http://localhost:3001/api';
  }
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});
*/

// 🔧 FUNÇÕES UTILITÁRIAS
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
  },

  // Verificar se token está próximo do vencimento
  isTokenExpiringSoon: (): boolean => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      // Decodificar JWT (apenas para verificar expiração)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Converter para milliseconds
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      
      // Retorna true se expira em menos de 5 minutos
      return timeUntilExpiration < 5 * 60 * 1000;
    } catch (error) {
      console.error('Erro ao verificar expiração do token:', error);
      return false;
    }
  }
};

// 📝 TIPOS TYPESCRIPT PARA AS RESPOSTAS DA API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}