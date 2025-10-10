// DIAGNÓSTICO COMPLETO DO TOKEN DO FRONTEND
// Execute este script no console do frontend para diagnosticar o problema

(function() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO TOKEN DO FRONTEND');
  console.log('=' .repeat(60));
  
  // 1. Verificar todos os possíveis tokens no localStorage
  console.log('\n📦 VERIFICANDO LOCALSTORAGE...');
  const possibleKeys = [
    'auth_token',
    'access_token', 
    'token',
    'jwt_token',
    'google_token',
    'user_token',
    'authToken'
  ];
  
  const foundTokens = {};
  possibleKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      foundTokens[key] = {
        value: value,
        length: value.length,
        preview: value.substring(0, 50) + '...'
      };
    }
  });
  
  console.log('🔍 Tokens encontrados:', foundTokens);
  
  // 2. Analisar o token principal (auth_token)
  const mainToken = localStorage.getItem('auth_token');
  
  if (!mainToken) {
    console.log('❌ Nenhum auth_token encontrado!');
    console.log('💡 Faça login novamente para gerar um token.');
    return;
  }
  
  console.log('\n🔍 ANALISANDO TOKEN PRINCIPAL...');
  console.log('Token completo:', mainToken);
  console.log('Comprimento:', mainToken.length);
  
  // 3. Tentar decodificar o token JWT
  try {
    const parts = mainToken.split('.');
    
    if (parts.length !== 3) {
      console.log('❌ Token não está no formato JWT válido (deve ter 3 partes)');
      console.log('Partes encontradas:', parts.length);
      return;
    }
    
    // Decodificar header
    const header = JSON.parse(atob(parts[0]));
    console.log('\n📋 HEADER DO TOKEN:');
    console.log(header);
    
    // Decodificar payload
    const payload = JSON.parse(atob(parts[1]));
    console.log('\n📋 PAYLOAD DO TOKEN:');
    console.log(payload);
    
    // 4. Verificar se atende aos requisitos do backend
    console.log('\n✅ VERIFICAÇÃO DOS REQUISITOS DO BACKEND:');
    
    const hasCorrectProvider = payload.provider === 'google-separated';
    const hasGoogleUserId = !!payload.googleUserId;
    const hasEmail = !!payload.email;
    
    console.log('Provider correto (google-separated):', hasCorrectProvider ? '✅' : '❌', payload.provider);
    console.log('GoogleUserId presente:', hasGoogleUserId ? '✅' : '❌', payload.googleUserId);
    console.log('Email presente:', hasEmail ? '✅' : '❌', payload.email);
    
    // Verificar expiração
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    console.log('Token expirado:', isExpired ? '❌' : '✅', 
      payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'N/A');
    
    // 5. Diagnóstico final
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    
    if (!hasCorrectProvider) {
      console.log('❌ PROBLEMA: Token não tem provider "google-separated"');
      console.log('💡 SOLUÇÃO: Fazer novo login com endpoint correto');
    }
    
    if (!hasGoogleUserId) {
      console.log('❌ PROBLEMA: Token não tem googleUserId');
      console.log('💡 SOLUÇÃO: Verificar geração do token no backend');
    }
    
    if (isExpired) {
      console.log('❌ PROBLEMA: Token expirado');
      console.log('💡 SOLUÇÃO: Fazer novo login');
    }
    
    if (hasCorrectProvider && hasGoogleUserId && !isExpired) {
      console.log('✅ Token parece válido! Testando com o backend...');
      
      // 6. Testar token com o backend
      fetch('http://localhost:3030/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mainToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log('\n📡 TESTE COM BACKEND:');
        console.log('Status:', response.status);
        
        if (response.status === 200) {
          console.log('✅ Token funciona com GET /profile');
          
          // Testar com PUT profile-update
          return fetch('http://localhost:3030/api/google-users/profile-update', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${mainToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              profile: { name: 'Teste', cpf: '00000000000' },
              address: { cep: '00000000' }
            })
          });
        } else {
          return response.json().then(data => {
            console.log('❌ Erro no GET /profile:', data);
            throw new Error('GET falhou');
          });
        }
      })
      .then(response => {
        console.log('Status PUT /profile-update:', response.status);
        
        if (response.status === 200) {
          console.log('✅ Token funciona com PUT /profile-update também!');
        } else {
          return response.json().then(data => {
            console.log('❌ Erro no PUT /profile-update:', data);
          });
        }
      })
      .catch(error => {
        console.log('❌ Erro no teste:', error);
      });
      
    } else {
      console.log('\n🔧 EXECUTANDO CORREÇÃO AUTOMÁTICA...');
      
      // Limpar token inválido
      localStorage.removeItem('auth_token');
      console.log('🧹 Token inválido removido');
      
      // Fazer novo login
      const googleUserData = {
        email: 'schoolts965@gmail.com',
        sub: 'schoolts965@gmail.com', 
        name: 'Eduardo',
        email_verified: true,
        picture: null
      };
      
      fetch('http://localhost:3030/api/auth/login/google-separated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleUserData)
      })
      .then(response => response.json())
      .then(result => {
        if (result.success && result.token) {
          localStorage.setItem('auth_token', result.token);
          console.log('✅ Novo token salvo! Recarregue a página.');
          
          // Verificar novo token
          const newPayload = JSON.parse(atob(result.token.split('.')[1]));
          console.log('📋 Novo token payload:', newPayload);
        } else {
          console.log('❌ Falha no novo login:', result);
        }
      })
      .catch(error => {
        console.log('❌ Erro no novo login:', error);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro ao decodificar token:', error);
    console.log('💡 Token pode estar corrompido. Removendo...');
    localStorage.removeItem('auth_token');
    console.log('🧹 Token corrompido removido. Faça login novamente.');
  }
  
})();

// INSTRUÇÕES:
// 1. Abra o console do frontend (F12 > Console)
// 2. Cole e execute este script
// 3. Analise o diagnóstico completo
// 4. Se necessário, o script fará correção automática
// 5. Recarregue a página após a correção