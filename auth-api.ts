import { API_ENDPOINTS, makeAuthenticatedRequest, DEFAULT_HEADERS } from './config/api';
import { User, AuthSession, AuthResponse } from './utils-api';
import { supabase } from './config/supabase';
import bcrypt from 'bcryptjs';

// ===== LOGIN COM GOOGLE (ALTERNATIVO SEM VALIDAÇÃO DE TOKEN) =====
export const loginGoogle = async (googleToken: string): Promise<AuthResponse> => {
  console.log('🔍 loginGoogle - Iniciando com token:', googleToken?.substring(0, 20) + '...');
  
  try {
    // Primeiro, tentar decodificar o token para obter dados do usuário
    let googleUser = null;
    
    try {
      // Decodificar JWT do Google (sem verificação de assinatura)
      const tokenParts = googleToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        googleUser = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          email_verified: payload.email_verified,
          sub: payload.sub
        };
        console.log('✅ Dados do usuário extraídos do token:', googleUser);
      }
    } catch (decodeError) {
      console.log('⚠️ Não foi possível decodificar o token, usando endpoint direto');
    }
    
    // Usar endpoint separado para usuários Google (evita conflitos de ID)
    const endpoint = googleUser ? '/auth/login/google-separated' : '/auth/login/google-alt';
    const requestBody = googleUser ? googleUser : { google_token: googleToken };
    
    console.log('🔍 Usando endpoint:', endpoint);
    console.log('🔍 Dados da requisição:', requestBody);
    
    const response = await makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('🔍 loginGoogle - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro no login com Google');
    }

    const data = await response.json();
    console.log('✅ loginGoogle - Sucesso:', {
      success: data.success,
      hasUser: !!data.user,
      hasToken: !!data.access_token
    });

    if (!data.success) {
      throw new Error(data.error || 'Falha no login');
    }

    // Salvar token no localStorage
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      console.log('✅ Token salvo no localStorage');
    }

    return {
      success: true,
      user: data.user,
      session: data.session || { access_token: data.access_token },
      access_token: data.access_token
    };

  } catch (error) {
    console.error('❌ loginGoogle - Erro completo:', error);
    throw error;
  }
};

// ===== LOGIN NORMAL =====
export const loginNormal = async (email: string, password: string): Promise<AuthResponse> => {
  console.log('🔍 loginNormal - Iniciando login para:', email);
  
  try {
    const response = await makeAuthenticatedRequest('/auth/login', {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    console.log('🔍 loginNormal - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro no login');
    }

    const data = await response.json();
    console.log('✅ loginNormal - Sucesso:', {
      success: data.success,
      hasUser: !!data.user,
      hasToken: !!data.access_token
    });

    if (!data.success) {
      throw new Error(data.error || 'Falha no login');
    }

    // Salvar token no localStorage
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      console.log('✅ Token salvo no localStorage');
    }

    return {
      success: true,
      user: data.user,
      session: data.session || { access_token: data.access_token },
      access_token: data.access_token
    };

  } catch (error) {
    console.error('❌ loginNormal - Erro completo:', error);
    throw error;
  }
};

// ===== REGISTRO =====
export const register = async (userData: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse> => {
  console.log('🔍 register - Iniciando registro para:', userData.email);
  
  try {
    const response = await makeAuthenticatedRequest('/auth/register', {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    console.log('🔍 register - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro no registro');
    }

    const data = await response.json();
    console.log('✅ register - Sucesso:', {
      success: data.success,
      hasUser: !!data.user,
      hasToken: !!data.access_token
    });

    if (!data.success) {
      throw new Error(data.error || 'Falha no registro');
    }

    // Salvar token no localStorage
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      console.log('✅ Token salvo no localStorage');
    }

    return {
      success: true,
      user: data.user,
      session: data.session || { access_token: data.access_token },
      access_token: data.access_token
    };

  } catch (error) {
    console.error('❌ register - Erro completo:', error);
    throw error;
  }
};

// ===== LOGOUT =====
export const logout = async (): Promise<void> => {
  console.log('🔍 logout - Iniciando logout');
  
  try {
    // Remover token do localStorage
    localStorage.removeItem('auth_token');
    console.log('✅ Token removido do localStorage');
    
    // Tentar fazer logout no servidor (opcional)
    try {
      await makeAuthenticatedRequest('/auth/logout', {
        method: 'POST',
        headers: DEFAULT_HEADERS
      });
      console.log('✅ Logout realizado no servidor');
    } catch (serverError) {
      console.log('⚠️ Erro no logout do servidor (ignorado):', serverError);
    }
    
  } catch (error) {
    console.error('❌ logout - Erro:', error);
    throw error;
  }
};

// ===== VERIFICAR PERFIL =====
// Função para detectar se o token é de usuário Google
const isGoogleUserToken = (): boolean => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      return payload.provider === 'google-separated';
    }
  } catch (error) {
    console.log('⚠️ Erro ao verificar tipo de token:', error);
  }
  return false;
};

export const getProfile = async (): Promise<User> => {
  console.log('🔍 getProfile - Buscando perfil do usuário');
  
  try {
    // Detectar se é usuário Google e usar endpoint apropriado
    const isGoogleUser = isGoogleUserToken();
    const endpoint = isGoogleUser ? '/google-users/profile' : '/profile';
    
    console.log('🔍 getProfile - Tipo de usuário:', isGoogleUser ? 'Google' : 'Normal');
    console.log('🔍 getProfile - Usando endpoint:', endpoint);
    
    const response = await makeAuthenticatedRequest(endpoint, {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    console.log('🔍 getProfile - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro ao buscar perfil');
    }

    const data = await response.json();
    console.log('✅ getProfile - Sucesso:', {
      hasUser: !!data.user,
      email: data.user?.email,
      userType: isGoogleUser ? 'Google' : 'Normal'
    });

    return data.user;

  } catch (error) {
    console.error('❌ getProfile - Erro completo:', error);
    throw error;
  }
};

// Função específica para perfil de usuários Google
export const getGoogleProfile = async (): Promise<User> => {
  console.log('🔍 getGoogleProfile - Buscando perfil do usuário Google');
  
  try {
    const response = await makeAuthenticatedRequest('/google-users/profile', {
      method: 'GET',
      headers: DEFAULT_HEADERS
    });

    console.log('🔍 getGoogleProfile - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro ao buscar perfil Google');
    }

    const data = await response.json();
    console.log('✅ getGoogleProfile - Sucesso:', {
      hasUser: !!data.user,
      email: data.user?.email
    });

    return data.user;

  } catch (error) {
    console.error('❌ getGoogleProfile - Erro completo:', error);
    throw error;
  }
};

// Função para atualizar perfil (detecta automaticamente o tipo)
export const updateProfile = async (profileData: any): Promise<any> => {
  console.log('🔍 updateProfile - Atualizando perfil');
  
  try {
    // Detectar se é usuário Google e usar endpoint apropriado
    const isGoogleUser = isGoogleUserToken();
    const endpoint = isGoogleUser ? '/google-users/profile-update' : '/profile';
    
    console.log('🔍 updateProfile - Tipo de usuário:', isGoogleUser ? 'Google' : 'Normal');
    console.log('🔍 updateProfile - Usando endpoint:', endpoint);
    
    const response = await makeAuthenticatedRequest(endpoint, {
      method: 'PUT',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(profileData)
    });

    console.log('🔍 updateProfile - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro ao atualizar perfil');
    }

    const data = await response.json();
    console.log('✅ updateProfile - Sucesso');

    return data;

  } catch (error) {
    console.error('❌ updateProfile - Erro completo:', error);
    throw error;
  }
};

// Função para atualizar perfil completo (perfil + endereço) - detecta automaticamente o tipo
export const updateUserProfile = async (profileData: any, addressData: any = null): Promise<any> => {
  console.log('🔍 updateUserProfile - Atualizando perfil completo');
  
  try {
    // Detectar se é usuário Google e usar endpoint apropriado
    const isGoogleUser = isGoogleUserToken();
    
    if (isGoogleUser) {
      console.log('🔍 updateUserProfile - Usuário Google detectado, usando endpoint específico');
      
      // Para usuários Google, usar o formato esperado pelo GoogleUsersController
      const requestData = {
        profile: profileData || {},
        address: addressData || {}
      };
      
      const response = await makeAuthenticatedRequest('/google-users/profile-update', {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(requestData)
      });

      console.log('🔍 updateUserProfile - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Erro na resposta Google:', errorData);
        throw new Error(errorData.error || 'Erro ao atualizar perfil Google');
      }

      const data = await response.json();
      console.log('✅ updateUserProfile - Sucesso Google');

      return {
        success: true,
        user: data.profile,
        address: data.address,
        message: data.message
      };
      
    } else {
      console.log('🔍 updateUserProfile - Usuário normal detectado, usando endpoint padrão');
      
      // Para usuários normais, usar o formato esperado pelo UsersController
      const requestData: any = {};
      
      // Adicionar dados do perfil se fornecidos
      if (profileData) {
        if (profileData.nome) requestData.nome = profileData.nome;
        if (profileData.cpf) requestData.cpf = profileData.cpf;
        if (profileData.telefone) requestData.telefone = profileData.telefone;
        if (profileData.data_nascimento) requestData.data_nascimento = profileData.data_nascimento;
      }
      
      // Adicionar dados do endereço se fornecidos
      if (addressData) {
        if (addressData.nome_endereco) requestData.nome_endereco = addressData.nome_endereco;
        if (addressData.cep) requestData.cep = addressData.cep;
        if (addressData.logradouro) requestData.logradouro = addressData.logradouro;
        if (addressData.numero) requestData.numero = addressData.numero;
        if (addressData.bairro) requestData.bairro = addressData.bairro;
        if (addressData.cidade) requestData.cidade = addressData.cidade;
        if (addressData.estado) requestData.estado = addressData.estado;
        if (addressData.complemento) requestData.complemento = addressData.complemento;
      }
      
      const response = await makeAuthenticatedRequest('/users/profile-update', {
        method: 'PUT',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(requestData)
      });

      console.log('🔍 updateUserProfile - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Erro na resposta normal:', errorData);
        throw new Error(errorData.error || 'Erro ao atualizar perfil');
      }

      const data = await response.json();
      console.log('✅ updateUserProfile - Sucesso normal');

      return {
        success: true,
        user: data.data?.user,
        address: data.data?.address,
        updated: data.data?.updated,
        message: data.message
      };
    }

  } catch (error) {
    console.error('❌ updateUserProfile - Erro completo:', error);
    throw error;
  }
};

export default {
  loginGoogle,
  loginNormal,
  register,
  logout,
  getProfile,
  getGoogleProfile,
  updateProfile,
  updateUserProfile
};