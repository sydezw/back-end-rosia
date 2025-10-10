// CORREÇÃO DO INTERCEPTADOR DE ENDPOINTS - PROBLEMA 401
// Execute este script no console do frontend para corrigir o redirecionamento

(function() {
  console.log('🔧 CORRIGINDO INTERCEPTADOR DE ENDPOINTS');
  console.log('=' .repeat(50));
  
  // ========================================
  // PROBLEMA IDENTIFICADO:
  // ========================================
  console.log('\n❌ PROBLEMA IDENTIFICADO:');
  console.log('- Login Google funciona (status 200, token salvo)');
  console.log('- ProfileSettings faz requisição para /api/users/profile');
  console.log('- Deveria fazer para /api/google-users/profile');
  console.log('- Resultado: 401 Unauthorized');
  
  // ========================================
  // VERIFICAR TOKEN ATUAL
  // ========================================
  console.log('\n🔍 VERIFICANDO TOKEN ATUAL...');
  
  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado!');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('✅ Token decodificado:', {
      provider: payload.provider,
      email: payload.email,
      userId: payload.userId || payload.googleUserId,
      isGoogle: payload.provider === 'google-separated'
    });
    
    if (payload.provider !== 'google-separated') {
      console.log('⚠️ Token não é de usuário Google separado!');
      return;
    }
    
  } catch (error) {
    console.log('❌ Erro ao decodificar token:', error);
    return;
  }
  
  // ========================================
  // CORRIGIR INTERCEPTADOR
  // ========================================
  console.log('\n🔧 CORRIGINDO INTERCEPTADOR...');
  
  // Salvar fetch original
  if (!window.originalFetch) {
    window.originalFetch = window.fetch.bind(window);
    console.log('✅ Fetch original salvo');
  }
  
  // Criar interceptador corrigido
  window.fetch = function(url, options = {}) {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Verificar se é requisição para backend da aplicação
    const isBackendRequest = (
      urlString.includes('/api/users/profile') || 
      urlString.includes('/api/users/profile-update')
    ) && (
      urlString.includes('localhost') || 
      urlString.includes('back-end-rosia02.vercel.app')
    );
    
    if (isBackendRequest) {
      // Verificar se usuário é Google
      const currentToken = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      
      if (currentToken) {
        try {
          const payload = JSON.parse(atob(currentToken.split('.')[1]));
          
          if (payload.provider === 'google-separated') {
            // Redirecionar para endpoints Google
            let newUrl = urlString;
            
            if (urlString.includes('/api/users/profile-update')) {
              newUrl = urlString.replace('/api/users/profile-update', '/api/google-users/profile-update');
              console.log('🔄 Redirecionando profile-update:', newUrl);
            } else if (urlString.includes('/api/users/profile')) {
              newUrl = urlString.replace('/api/users/profile', '/api/google-users/profile');
              console.log('🔄 Redirecionando profile:', newUrl);
            }
            
            return window.originalFetch(newUrl, options);
          }
        } catch (error) {
          console.log('⚠️ Erro ao verificar token, usando URL original');
        }
      }
    }
    
    // Para todas as outras requisições, usar fetch original
    return window.originalFetch(url, options);
  };
  
  console.log('✅ Interceptador corrigido!');
  
  // ========================================
  // TESTAR CORREÇÃO
  // ========================================
  console.log('\n🧪 TESTANDO CORREÇÃO...');
  
  // Teste 1: Verificar redirecionamento
  console.log('\n📡 Teste 1: Verificando redirecionamento...');
  
  const testUrl = 'http://localhost:3030/api/users/profile';
  console.log('URL original:', testUrl);
  
  // Simular requisição para ver redirecionamento
  fetch(testUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('✅ Teste 1 - Status:', response.status);
    if (response.status === 200) {
      console.log('✅ Redirecionamento funcionando!');
      return response.json();
    } else {
      console.log('⚠️ Status não é 200, mas redirecionamento aplicado');
      return response.text();
    }
  })
  .then(data => {
    console.log('📦 Dados recebidos:', data);
  })
  .catch(error => {
    console.log('❌ Erro no teste:', error);
  });
  
  // ========================================
  // FUNÇÃO PARA RECARREGAR DADOS
  // ========================================
  console.log('\n🔄 CRIANDO FUNÇÃO PARA RECARREGAR DADOS...');
  
  window.reloadProfileData = function() {
    console.log('🔄 Recarregando dados do perfil...');
    
    const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    
    if (!token) {
      console.log('❌ Token não encontrado');
      return;
    }
    
    // Fazer requisição direta para endpoint correto
    fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('📡 Status da requisição:', response.status);
      
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`Erro ${response.status}`);
      }
    })
    .then(data => {
      console.log('✅ Dados do perfil carregados:', data);
      
      // Tentar atualizar a interface se possível
      if (window.React && window.ReactDOM) {
        console.log('🔄 Tentando atualizar interface...');
        // Disparar evento customizado para componentes React
        window.dispatchEvent(new CustomEvent('profileDataLoaded', { detail: data }));
      }
      
      return data;
    })
    .catch(error => {
      console.log('❌ Erro ao carregar dados:', error);
    });
  };
  
  // ========================================
  // RESUMO E INSTRUÇÕES
  // ========================================
  console.log('\n🎉 CORREÇÃO APLICADA!');
  console.log('=' .repeat(30));
  console.log('✅ Interceptador corrigido');
  console.log('✅ Redirecionamento automático ativo');
  console.log('✅ Função de teste criada');
  
  console.log('\n📋 FUNÇÕES DISPONÍVEIS:');
  console.log('- window.reloadProfileData() - Recarregar dados do perfil');
  
  console.log('\n🔄 PRÓXIMOS PASSOS:');
  console.log('1. Execute: window.reloadProfileData()');
  console.log('2. Ou recarregue a página para aplicar correção');
  console.log('3. Teste o formulário de perfil novamente');
  
  console.log('\n💡 EXPLICAÇÃO DO PROBLEMA:');
  console.log('- O login Google funcionava corretamente');
  console.log('- Mas o ProfileSettings usava endpoint errado');
  console.log('- /api/users/profile → /api/google-users/profile');
  console.log('- Agora o interceptador redireciona automaticamente');
  
})();

// ==========================================
// INSTRUÇÕES PARA O FRONTEND:
// ==========================================
// 
// PROBLEMA IDENTIFICADO:
// - Login Google funciona (token salvo corretamente)
// - ProfileSettings faz requisição para /api/users/profile
// - Deveria fazer para /api/google-users/profile
// - Resultado: 401 Unauthorized
// 
// SOLUÇÃO:
// 1. Execute este script no console
// 2. O interceptador será corrigido automaticamente
// 3. Requisições serão redirecionadas para endpoints corretos
// 
// ALTERNATIVA PERMANENTE:
// Modifique o endpoint-interceptor.ts para incluir:
// - Verificação do tipo de usuário (Google vs Normal)
// - Redirecionamento automático baseado no provider do token
// - Manter compatibilidade com APIs externas (ViaCEP, etc)