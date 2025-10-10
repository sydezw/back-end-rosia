// VERIFICAÇÃO DO TOKEN GERADO - DIAGNÓSTICO COMPLETO
// Cole este código no console para verificar o token atual:

(function() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO TOKEN');
  console.log('================================');
  
  // 1. Verificar se existe token
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('❌ Nenhum token encontrado no localStorage');
    return;
  }
  
  console.log('✅ Token encontrado no localStorage');
  console.log('📏 Tamanho do token:', token.length, 'caracteres');
  
  try {
    // 2. Decodificar o token JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Token JWT inválido - não tem 3 partes');
      return;
    }
    
    // 3. Decodificar header
    const header = JSON.parse(atob(parts[0]));
    console.log('🔧 Header do JWT:', header);
    
    // 4. Decodificar payload
    const payload = JSON.parse(atob(parts[1]));
    console.log('📦 Payload completo do JWT:', payload);
    
    // 5. Verificações específicas
    console.log('\n🔍 VERIFICAÇÕES ESPECÍFICAS:');
    console.log('- Provider:', payload.provider || '❌ NÃO DEFINIDO');
    console.log('- Email:', payload.email || '❌ NÃO DEFINIDO');
    console.log('- User ID:', payload.userId || '❌ NÃO DEFINIDO');
    console.log('- Google ID:', payload.googleId || '❌ NÃO DEFINIDO');
    console.log('- Nome:', payload.name || '❌ NÃO DEFINIDO');
    
    // 6. Verificar expiração
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      console.log('⏰ Expira em:', expDate.toLocaleString());
      console.log('⏰ Agora:', now.toLocaleString());
      console.log('⏰ Token válido:', expDate > now ? '✅ SIM' : '❌ EXPIRADO');
    }
    
    // 7. Verificar se é token Google correto
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    if (payload.provider === 'google-separated') {
      console.log('✅ Provider CORRETO: google-separated');
    } else if (payload.provider === 'google') {
      console.log('❌ Provider INCORRETO: google (deveria ser google-separated)');
    } else {
      console.log('❌ Provider INVÁLIDO:', payload.provider);
    }
    
    // 8. Teste imediato do token
    console.log('\n🧪 TESTANDO TOKEN ATUAL...');
    fetch('http://localhost:3030/api/google-users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      console.log('📡 Status da requisição:', response.status);
      if (response.ok) {
        console.log('🎉 TOKEN FUNCIONANDO!');
        return response.json();
      } else {
        console.log('❌ TOKEN NÃO FUNCIONANDO');
        return response.json();
      }
    })
    .then(data => {
      console.log('📥 Resposta do servidor:', data);
    })
    .catch(error => {
      console.error('❌ Erro no teste:', error);
    });
    
  } catch (error) {
    console.error('❌ Erro ao decodificar token:', error.message);
  }
})();

// INSTRUÇÕES:
// 1. Cole este código no console
// 2. Analise o resultado
// 3. Se o provider estiver errado, execute novamente o corrigirComDados
// 4. Se ainda não funcionar, pode ser problema no backend