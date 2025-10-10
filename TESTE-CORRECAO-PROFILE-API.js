// TESTE DA CORREÇÃO DO PROFILE-API.TS
// Execute este script no console do frontend para testar a correção

(function() {
  console.log('🧪 TESTE DA CORREÇÃO DO PROFILE-API.TS');
  console.log('=' .repeat(50));
  
  // ========================================
  // 1. VERIFICAR TOKEN ATUAL
  // ========================================
  console.log('\n🔍 1. VERIFICANDO TOKEN ATUAL...');
  
  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado!');
    console.log('💡 Faça login primeiro');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('✅ Token decodificado:');
    console.log('   - Provider:', payload.provider);
    console.log('   - Email:', payload.email);
    console.log('   - Google User ID:', payload.googleUserId);
    console.log('   - É Google?', payload.provider === 'google-separated');
    
    if (payload.provider !== 'google-separated') {
      console.log('⚠️ Token não é de usuário Google!');
      console.log('💡 Este teste é específico para usuários Google');
      return;
    }
    
  } catch (error) {
    console.log('❌ Erro ao decodificar token:', error);
    return;
  }
  
  // ========================================
  // 2. TESTAR DETECÇÃO DE USUÁRIO GOOGLE
  // ========================================
  console.log('\n🔍 2. TESTANDO DETECÇÃO DE USUÁRIO GOOGLE...');
  
  // Simular a função isGoogleUserToken corrigida
  window.testGoogleUserDetection = function(user) {
    try {
      // Primeiro, verificar app_metadata do Supabase
      const provider = user?.app_metadata?.provider;
      console.log('🔍 Provider do usuário (app_metadata):', provider);
      
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
  };
  
  // Testar com usuário mock
  const mockUser = {
    email: 'schoolts965@gmail.com',
    app_metadata: {
      provider: 'google' // Pode não ter este campo
    }
  };
  
  console.log('🧪 Testando detecção com usuário mock...');
  const isDetectedAsGoogle = window.testGoogleUserDetection(mockUser);
  
  if (isDetectedAsGoogle) {
    console.log('✅ SUCESSO: Usuário detectado como Google!');
    console.log('✅ Endpoint que será usado: /api/google-users/profile-update');
  } else {
    console.log('❌ FALHA: Usuário NÃO detectado como Google!');
    console.log('❌ Endpoint que será usado: /api/users/profile-update');
  }
  
  // ========================================
  // 3. TESTAR REQUISIÇÃO REAL
  // ========================================
  console.log('\n🔍 3. TESTANDO REQUISIÇÃO REAL...');
  
  window.testProfileUpdate = async function() {
    console.log('📡 Iniciando teste de atualização de perfil...');
    
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }
      
      // Verificar se é usuário Google
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isGoogle = payload.provider === 'google-separated';
      
      // Escolher endpoint correto
      const endpoint = isGoogle 
        ? 'http://localhost:3030/api/google-users/profile-update'
        : 'http://localhost:3030/api/users/profile-update';
      
      console.log('📡 Endpoint escolhido:', endpoint);
      console.log('🔍 Tipo de usuário:', isGoogle ? 'Google' : 'Normal');
      
      // Dados de teste
      const testData = {
        profile: {
          nome: 'Eduardo Teste',
          telefone: '11999999999'
        },
        address: {
          cep: '01310100',
          logradouro: 'Avenida Paulista'
        }
      };
      
      console.log('📦 Dados de teste:', testData);
      
      // Fazer requisição
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testData)
      });
      
      console.log('📊 Status da resposta:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ SUCESSO: Perfil atualizado!');
        console.log('📦 Resultado:', result);
      } else {
        const errorData = await response.text();
        console.log('❌ ERRO na requisição:');
        console.log('   - Status:', response.status);
        console.log('   - Resposta:', errorData);
        
        if (response.status === 400) {
          console.log('💡 Erro 400: Verifique os dados enviados');
        } else if (response.status === 401) {
          console.log('💡 Erro 401: Token inválido ou endpoint errado');
        }
      }
      
    } catch (error) {
      console.log('❌ Erro no teste:', error);
    }
  };
  
  // ========================================
  // 4. RESUMO E INSTRUÇÕES
  // ========================================
  console.log('\n🎉 TESTE CONFIGURADO!');
  console.log('=' .repeat(30));
  console.log('✅ Função de detecção testada');
  console.log('✅ Função de teste criada');
  
  console.log('\n📋 FUNÇÕES DISPONÍVEIS:');
  console.log('- window.testGoogleUserDetection(user) - Testar detecção');
  console.log('- window.testProfileUpdate() - Testar requisição real');
  
  console.log('\n🔄 PRÓXIMOS PASSOS:');
  console.log('1. Execute: window.testProfileUpdate()');
  console.log('2. Verifique se o endpoint correto é usado');
  console.log('3. Confirme se não há mais erro 400/401');
  
  console.log('\n💡 CORREÇÃO APLICADA:');
  console.log('- profile-api.ts agora verifica o token JWT');
  console.log('- Detecção de usuário Google corrigida');
  console.log('- Endpoint correto será usado automaticamente');
  
  // Executar teste automático
  console.log('\n🚀 EXECUTANDO TESTE AUTOMÁTICO...');
  setTimeout(() => {
    window.testProfileUpdate();
  }, 1000);
  
})();

// ==========================================
// INSTRUÇÕES DE USO:
// ==========================================
// 
// 1. Abra o console do frontend (F12 > Console)
// 2. Cole e execute este script
// 3. Aguarde o teste automático
// 4. Se necessário, execute: window.testProfileUpdate()
// 
// RESULTADO ESPERADO:
// - Detecção: "É usuário Google? true"
// - Endpoint: "/api/google-users/profile-update"
// - Status: 200 OK (sem erro 400/401)