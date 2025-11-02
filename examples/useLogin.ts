import { useState } from 'react';
import api from './api';

interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password
      });

      // Salvar tokens no localStorage
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro no login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Erro no logout:', err);
    } finally {
      // Limpar dados locais independente do resultado
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  };

  const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('access_token');
  };

  const getStoredUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  };

  return {
    login,
    logout,
    loading,
    error,
    isAuthenticated,
    getStoredUser
  };
}

