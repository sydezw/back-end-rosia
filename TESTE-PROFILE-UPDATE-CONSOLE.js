// TESTE DO ENDPOINT PROFILE-UPDATE - DIAGNÓSTICO COMPLETO
// Cole este código no console do frontend para testar o endpoint profile-update:

(async function() {
  console.log('🧪 TESTE DO ENDPOINT PROFILE-UPDATE');
  console.log('===================================');
  
  // 1. Verificar token atual
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('❌ Nenhum token encontrado no localStorage');
    return;
  }
  
  console.log('✅ Token encontrado:', token.substring(0, 30) + '...');
  
  try {
    // 2. Decodificar token para verificar dados
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('📦 Dados do token:', {
      provider: payload.provider,
      googleUserId: payload.googleUserId,
      email: payload.email,
      exp: new Date(payload.exp * 1000).toLocaleString()
    });
    
    // 3. Primeiro testar o endpoint GET profile (que funciona)
    console.log('\n🔍 TESTANDO GET /api/google-users/profile...');
    const getResponse = await fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 GET Status:', getResponse.status);
    const getResult = await getResponse.json();
    console.log('📥 GET Resposta:', getResult);
    
    if (getResponse.status !== 200) {
      console.error('❌ GET profile falhou - parando teste');
      return;
    }
    
    // 4. Agora testar o endpoint PUT profile-update (que está falhando)
    console.log('\n🔍 TESTANDO PUT /api/google-users/profile-update...');
    
    const testData = {
      profile: {
        nome: 'Teste Console',
        telefone: '11999999999',
        cpf: '12345678901',
        data_nascimento: '1990-01-01'
      },
      address: {
        logradouro: 'Rua Teste',
        numero: '123',
        bairro: 'Bairro Teste',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        complemento: 'Apto 1'
      }
    };
    
    console.log('📤 Dados sendo enviados:', testData);
    
    const putResponse = await fetch('http://localhost:3030/api/google-users/profile-update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 PUT Status:', putResponse.status);
    const putResult = await putResponse.json();
    console.log('📥 PUT Resposta:', putResult);
    
    // 5. Análise detalhada do erro
    if (putResponse.status === 401) {
      console.log('\n🔍 ANÁLISE DO ERRO 401:');
      console.log('- Token usado:', token.substring(0, 50) + '...');
      console.log('- Provider no token:', payload.provider);
      console.log('- GoogleUserId no token:', payload.googleUserId);
      console.log('- Headers enviados:', {
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
        'Content-Type': 'application/json'
      });
      
      // Verificar se o token mudou entre as requisições
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken !== token) {
        console.log('⚠️ TOKEN MUDOU durante o teste!');
        console.log('Token original:', token.substring(0, 30) + '...');
        console.log('Token atual:', currentToken.substring(0, 30) + '...');
      } else {
        console.log('✅ Token permaneceu o mesmo');
      }
    }
    
    // 6. Teste adicional: verificar se o middleware está funcionando
    console.log('\n🔍 TESTE ADICIONAL: Verificando middleware...');
    const testResponse = await fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Test': 'middleware-check'
      }
    });
    
    console.log('📡 Teste middleware status:', testResponse.status);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
})();

// INSTRUÇÕES:
// 1. Cole este código no console do frontend
// 2. Analise os resultados
// 3. Compare o comportamento entre GET profile (funciona) e PUT profile-update (falha)
// 4. Verifique se há diferenças nos headers ou no token entre as requisições