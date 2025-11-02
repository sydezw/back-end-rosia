// SCRIPT PARA LIMPAR TOKEN INVÁLIDO DO FRONTEND
// Execute este script no console do frontend para resolver o erro 401

(function() {
  console.log('🧹 LIMPEZA DE TOKEN INVÁLIDO NO FRONTEND');
  console.log('=========================================');
  
  // 1. Verificar token atual
  const currentToken = localStorage.getItem('auth_token');
  
  if (currentToken) {
    console.log('🔍 Token atual encontrado:', currentToken.substring(0, 50) + '...');
    
    try {
      // Decodificar token atual
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      console.log('📦 Dados do token atual:', {
        provider: payload.provider,
        googleUserId: payload.googleUserId,
        email: payload.email,
        exp: new Date(payload.exp * 1000).toLocaleString()
      });
      
      // Verificar se é token Google válido
      if (payload.provider === 'google-separated' && payload.googleUserId) {
        console.log('✅ Token parece válido. Testando com o backend...');
        
        // Testar token com backend
        fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          console.log('📡 Teste do token - Status:', response.status);
          
          if (response.status === 200) {
            console.log('✅ Token está funcionando! O problema pode estar no frontend.');
            console.log('💡 Tente recarregar a página ou verificar o código do frontend.');
          } else {
            console.log('❌ Token inválido no backend. Removendo...');
            localStorage.removeItem('auth_token');
            console.log('🧹 Token removido. Faça login novamente.');
          }
        })
        .catch(error => {
          console.error('❌ Erro ao testar token:', error);
        });
        
      } else {
        console.log('❌ Token não é do tipo Google separado. Removendo...');
        localStorage.removeItem('auth_token');
        console.log('🧹 Token removido.');
      }
      
    } catch (error) {
      console.log('❌ Token corrompido. Removendo...');
      localStorage.removeItem('auth_token');
      console.log('🧹 Token corrompido removido.');
    }
  } else {
    console.log('❌ Nenhum token encontrado no localStorage.');
  }
  
  // 2. Limpar outros possíveis tokens
  const keysToRemove = [
    'auth_token',
    'google_token',
    'user_token',
    'access_token',
    'jwt_token'
  ];
  
  console.log('\n🧹 Limpando possíveis tokens antigos...');
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
    }
  });
  
  // 3. Fazer novo login
  console.log('\n🔐 FAZENDO NOVO LOGIN...');
  
  const googleUserData = {
    email: 'schoolts965@gmail.com',
    sub: 'schoolts965@gmail.com',
    name: 'Eduardo',
    email_verified: true,
    picture: null
  };
  
  fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(googleUserData)
  })
  .then(response => {
    console.log('📡 Login Status:', response.status);
    return response.json();
  })
  .then(result => {
    console.log('📥 Login Resultado:', result);
    
    if (result.success && result.token) {
      localStorage.setItem('auth_token', result.token);
      console.log('✅ Novo token salvo com sucesso!');
      console.log('🔄 Recarregue a página para usar o novo token.');
      
      // Decodificar novo token
      const newPayload = JSON.parse(atob(result.token.split('.')[1]));
      console.log('📦 Novo token:', {
        provider: newPayload.provider,
        googleUserId: newPayload.googleUserId,
        email: newPayload.email,
        exp: new Date(newPayload.exp * 1000).toLocaleString()
      });
      
    } else {
      console.error('❌ Falha no novo login:', result);
    }
  })
  .catch(error => {
    console.error('❌ Erro no novo login:', error);
  });
  
})();

// INSTRUÇÕES:
// 1. Abra o console do frontend (F12 > Console)
// 2. Cole e execute este script
// 3. Aguarde a limpeza e novo login
// 4. Recarregue a página
// 5. Tente salvar as informações novamente

