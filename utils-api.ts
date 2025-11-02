// Tipos e interfaces para a API de autenticação

// Interface do usuário
export interface User {
  id: string;
  email: string;
  nome?: string;
  name?: string;
  avatar?: string;
  created_at?: string;
  criadoem?: string;
  updated_at?: string;
  atualizadoem?: string;
  email_confirmed?: boolean;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  role?: string;
  metadata?: any;
}

// Interface da sessão de autenticação
export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: User;
}

// Interface da resposta de autenticação
export interface AuthResponse {
  success: boolean;
  user?: User;
  session?: AuthSession;
  access_token?: string;
  refresh_token?: string;
  token?: string;
  message?: string;
  error?: string;
}

// Interface para dados de registro
export interface RegisterData {
  nome: string;
  email: string;
  senha: string;
}

// Interface para dados de login
export interface LoginData {
  email: string;
  senha?: string;
  password?: string;
}

// Interface para dados de login Google
export interface GoogleLoginData {
  token: string;
  google_token?: string;
}

// Interface para endereços
export interface Address {
  id?: string;
  name: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  is_default?: boolean;
  criadoem?: string;
  atualizadoem?: string;
}

// Interface para resposta de endereços
export interface AddressResponse {
  success: boolean;
  data?: {
    addresses?: Address[];
    address?: Address;
  };
  message?: string;
  error?: string;
}

// Interface para perfil do usuário
export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  avatar?: string;
  addresses?: Address[];
  created_at?: string;
  updated_at?: string;
}

// Interface para resposta de perfil
export interface ProfileResponse {
  success: boolean;
  data?: {
    profile?: UserProfile;
    user?: User;
  };
  message?: string;
  error?: string;
}

// Tipos de erro da API
export type ApiError = {
  message: string;
  code?: string;
  details?: any;
};

// Tipos de status de requisição
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

// Interface para configuração de requisição
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// Interface para resposta padrão da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

// Exportar tipos úteis
export type { RequestInit } from 'node-fetch';

