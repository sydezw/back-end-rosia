import { supabase } from './config/supabase.js';

// Função para verificar se o token é de usuário Google
const isGoogleUserToken = (user: any): boolean => {
  try {
    // Primeiro, verificar app_metadata do Supabase
    const provider = user?.app_metadata?.provider;
    console.log('🔍 Provider do usuário (app_metadata):', provider);
    console.log('🔍 App metadata completo:', user?.app_metadata);
    
    // Verificar se é usuário Google pelo app_metadata
    let isGoogle = provider === 'google' || provider === 'google-separated';
    
    // Se não encontrou no app_metadata, verificar no localStorage
    if (!isGoogle) {
      console.log('🔍 Verificando token JWT no localStorage...');
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('🔍 Payload do token JWT:', payload);
          
          const jwtProvider = payload.provider;
          console.log('🔍 Provider do JWT:', jwtProvider);
          
          isGoogle = jwtProvider === 'google-separated';
          console.log('🔍 É usuário Google pelo JWT?', isGoogle);
        } catch (jwtError) {
          console.log('⚠️ Erro ao decodificar JWT:', jwtError);
        }
      }
    }
    
    console.log('🔍 Resultado final - É usuário Google?', isGoogle);
    return isGoogle;
  } catch (error) {
    console.error('Erro ao verificar token Google:', error);
    return false;
  }
}

// Função para atualizar perfil completo (perfil + endereço) - detecta automaticamente o tipo
export const updateUserProfile = async (profileData: any, addressData: any = null): Promise<any> => {
  console.log('🔍 updateUserProfile - Iniciando atualização de perfil');
  
  try {
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Usuário não autenticado:', authError);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter a sessão e o token de acesso
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      throw new Error('Sessão inválida');
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    console.log('✅ Token obtido com sucesso');
    
    // Detectar se é usuário Google
    let isGoogleUser = isGoogleUserToken(user);
    console.log('🔍 Detecção inicial - Tipo de usuário:', isGoogleUser ? 'Google' : 'Normal');
    console.log('🔍 User ID do Supabase:', user?.id);
    console.log('🔍 Email do usuário:', user?.email);
    
    // FORÇAR detecção como Google para este usuário específico (temporário para debug)
    if (user?.email === 'schoolts965@gmail.com') {
      console.log('🔍 FORÇANDO detecção como usuário Google para schoolts965@gmail.com');
      isGoogleUser = true;
    }
    
    // Se a detecção por token falhou, verificar diretamente no banco
    if (!isGoogleUser && user?.id) {
      console.log('🔍 Verificando no banco se usuário é Google...');
      try {
        const checkResponse = await fetch(`http://localhost:3030/api/google-users/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (checkResponse.ok) {
          console.log('✅ Usuário encontrado na tabela Google');
          isGoogleUser = true;
        } else {
          console.log('❌ Usuário não encontrado na tabela Google');
        }
      } catch (error) {
        console.log('❌ Erro ao verificar tabela Google:', error);
      }
    }
    
    console.log('🔍 Detecção final - Tipo de usuário:', isGoogleUser ? 'Google' : 'Normal');
    
    // Preparar dados da requisição baseado no tipo de usuário
    let requestData: any;
    let endpoint: string;
    
    if (isGoogleUser) {
      // Para usuários Google, usar o formato esperado pelo GoogleUsersController
      endpoint = 'http://localhost:3030/api/google-users/profile-update';
      requestData = {
        profile: profileData || {},
        address: addressData || {}
      };
      console.log('🔍 Usando endpoint Google:', endpoint);
    } else {
      // Para usuários normais, usar o formato esperado pelo UsersController
      endpoint = 'http://localhost:3030/api/users/profile-update';
      requestData = {};
      
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
      
      console.log('🔍 Usando endpoint normal:', endpoint);
    }
    
    console.log('📤 Dados da requisição:', requestData);
    
    // Fazer a requisição
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na resposta:', errorData);
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log('✅ Resposta recebida:', data);
    
    // Retornar formato padronizado
    return {
      success: true,
      user: isGoogleUser ? data.profile : data.data?.user,
      address: isGoogleUser ? data.address : data.data?.address,
      updated: data.data?.updated,
      message: data.message || 'Perfil atualizado com sucesso'
    };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    throw error;
  }
};

// Função para obter perfil do usuário
export const getUserProfile = async (): Promise<any> => {
  console.log('🔍 getUserProfile - Obtendo perfil do usuário');
  
  try {
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Usuário não autenticado:', authError);
      throw new Error('Usuário não autenticado');
    }
    
    // Obter a sessão e o token de acesso
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      throw new Error('Sessão inválida');
    }
    
    // Detectar se é usuário Google
    const isGoogleUser = isGoogleUserToken(user);
    const endpoint = isGoogleUser 
      ? 'http://localhost:3030/api/google-users/profile'
      : 'http://localhost:3030/api/users/profile';
    
    console.log('🔍 Usando endpoint:', endpoint);
    
    // Fazer a requisição
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na resposta:', errorData);
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log('✅ Perfil obtido:', data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao obter perfil:', error);
    throw error;
  }
};

export default {
  updateUserProfile,
  getUserProfile
};