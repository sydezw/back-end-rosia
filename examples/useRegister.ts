import { useState } from 'react';
import api from './api';

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (userData: RegisterData): Promise<RegisterResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Validações básicas
      if (!userData.name || userData.name.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres');
      }

      if (!userData.email || !isValidEmail(userData.email)) {
        throw new Error('Email inválido');
      }

      if (!userData.password || userData.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const { data } = await api.post<RegisterResponse>('/auth/register', {
        nome: userData.name.trim(),
        email: userData.email.toLowerCase().trim(),
        senha: userData.password
      });

      // Se retornou sessão, salvar tokens
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Erro no registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 6) {
      return { isValid: false, message: 'Senha deve ter pelo menos 6 caracteres' };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, message: 'Senha deve conter pelo menos uma letra minúscula' };
    }

    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Senha deve conter pelo menos um número' };
    }

    return { isValid: true, message: 'Senha válida' };
  };

  return {
    register,
    loading,
    error,
    validatePassword
  };
}

// Função auxiliar para validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

