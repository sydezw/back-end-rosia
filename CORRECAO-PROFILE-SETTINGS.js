// CORREÇÃO ESPECÍFICA PARA ProfileSettings.tsx
// Execute este script no console para corrigir o erro "session is not defined"

(function() {
  console.log('🔧 CORREÇÃO ESPECÍFICA - ProfileSettings.tsx');
  console.log('=' .repeat(55));
  
  // 1. Substituir a função loadUserData problemática
  console.log('\n🔍 CORRIGINDO FUNÇÃO loadUserData...');
  
  // Criar versão corrigida da função loadUserData
  window.loadUserDataFixed = async function() {
    console.log('📥 Carregando dados do usuário via backend...');
    
    try {
      // Obter token do localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }
      
      // Verificar se é usuário Google
      let isGoogleUser = false;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        isGoogleUser = payload.provider === 'google-separated';
        console.log('🔍 Tipo de usuário:', isGoogleUser ? 'Google Separado' : 'Supabase Normal');
      } catch (error) {
        console.log('⚠️ Erro ao decodificar token, assumindo usuário normal');
      }
      
      // Escolher endpoint baseado no tipo de usuário
      const endpoint = isGoogleUser 
        ? 'https://back-end-rosia02.vercel.app/api/google-users/profile'
        : 'https://back-end-rosia02.vercel.app/api/users/profile';
      
      console.log('📡 Fazendo requisição para:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na resposta:', errorData);
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('✅ Dados carregados com sucesso:', userData);
      
      return userData;
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do usuário:', error);
      throw error;
    }
  };
  
  // 2. Criar função para salvar dados do perfil
  window.saveUserDataFixed = async function(profileData, addressData) {
    console.log('💾 Salvando dados do usuário...');
    
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }
      
      // Verificar se é usuário Google
      let isGoogleUser = false;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        isGoogleUser = payload.provider === 'google-separated';
      } catch (error) {
        console.log('⚠️ Erro ao decodificar token, assumindo usuário normal');
      }
      
      // Escolher endpoint baseado no tipo de usuário
      const endpoint = isGoogleUser 
        ? 'https://back-end-rosia02.vercel.app/api/google-users/profile-update'
        : 'https://back-end-rosia02.vercel.app/api/users/profile-update';
      
      console.log('📡 Salvando em:', endpoint);
      
      const requestBody = {
        profile: profileData,
        address: addressData
      };
      
      console.log('📦 Dados a serem salvos:', requestBody);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro ao salvar:', errorData);
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Dados salvos com sucesso:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      throw error;
    }
  };
  
  // 3. Criar função para buscar CEP (corrigida)
  window.fetchAddressByCepFixed = async function(cep) {
    console.log('🔍 Buscando CEP:', cep);
    
    try {
      // Usar fetch original para evitar interceptação
      const originalFetch = window.originalFetch || fetch;
      
      const response = await originalFetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }
      
      const data = await response.json();
      
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }
      
      console.log('✅ CEP encontrado:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Erro ao buscar CEP:', error);
      throw error;
    }
  };
  
  // 4. Função para verificar se usuário está logado
  window.isUserLoggedIn = function() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return false;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // Verificar se token não expirou
      if (payload.exp && payload.exp < now) {
        console.log('⚠️ Token expirado');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('❌ Token inválido:', error);
      return false;
    }
  };
  
  // 5. Função para obter informações do usuário do token
  window.getUserInfoFromToken = function() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return null;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        email: payload.email,
        provider: payload.provider,
        isGoogle: payload.provider === 'google-separated',
        googleUserId: payload.googleUserId,
        userId: payload.userId
      };
    } catch (error) {
      console.log('❌ Erro ao decodificar token:', error);
      return null;
    }
  };
  
  // 6. Testar as funções corrigidas
  console.log('\n🧪 TESTANDO FUNÇÕES CORRIGIDAS...');
  
  // Testar se usuário está logado
  const isLoggedIn = window.isUserLoggedIn();
  console.log('✅ Usuário logado:', isLoggedIn);
  
  if (isLoggedIn) {
    const userInfo = window.getUserInfoFromToken();
    console.log('✅ Informações do usuário:', userInfo);
    
    // Testar carregamento de dados
    window.loadUserDataFixed()
      .then(data => {
        console.log('✅ Teste de carregamento funcionou');
      })
      .catch(error => {
        console.log('❌ Teste de carregamento falhou:', error.message);
      });
  }
  
  // Testar busca de CEP
  window.fetchAddressByCepFixed('01310100')
    .then(data => {
      console.log('✅ Teste de CEP funcionou:', data.logradouro);
    })
    .catch(error => {
      console.log('❌ Teste de CEP falhou:', error.message);
    });
  
  console.log('\n🎉 FUNÇÕES CORRIGIDAS CRIADAS!');
  console.log('📋 FUNÇÕES DISPONÍVEIS:');
  console.log('- window.loadUserDataFixed() - Carregar dados do usuário');
  console.log('- window.saveUserDataFixed(profile, address) - Salvar dados');
  console.log('- window.fetchAddressByCepFixed(cep) - Buscar CEP');
  console.log('- window.isUserLoggedIn() - Verificar se está logado');
  console.log('- window.getUserInfoFromToken() - Obter info do token');
  
  console.log('\n💡 COMO USAR NO COMPONENTE:');
  console.log('1. Substitua as chamadas problemáticas pelas funções corrigidas');
  console.log('2. Use window.loadUserDataFixed() em vez da função original');
  console.log('3. Use window.saveUserDataFixed() para salvar dados');
  console.log('4. Use window.fetchAddressByCepFixed() para buscar CEP');
  
})();

// INSTRUÇÕES:
// 1. Execute este script no console do frontend
// 2. As funções corrigidas estarão disponíveis globalmente
// 3. Teste as funções individualmente se necessário
// 4. Recarregue a página para aplicar as correções

