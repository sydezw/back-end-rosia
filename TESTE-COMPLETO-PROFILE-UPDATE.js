// TESTE COMPLETO: LOGIN + PROFILE-UPDATE
// Este script faz login primeiro e depois testa o endpoint profile-update

(async function() {
  console.log('🚀 TESTE COMPLETO: LOGIN + PROFILE-UPDATE');
  console.log('==========================================');
  
  // 1. Verificar se já existe token
  let token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado. Fazendo login primeiro...');
    
    // Dados do usuário Google (substitua pelos dados reais)
    const googleUserData = {
      email: 'schoolts965@gmail.com',
      sub: 'schoolts965@gmail.com', // Google ID (sub)
      name: 'Usuário Teste',
      email_verified: true,
      picture: null
    };
    
    console.log('🔐 Fazendo login com:', googleUserData.email);
    
    try {
      // Fazer login no endpoint Google separado
      const loginResponse = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleUserData)
      });
      
      console.log('📡 Login Status:', loginResponse.status);
      const loginResult = await loginResponse.json();
      console.log('📥 Login Resposta:', loginResult);
      
      if (loginResponse.status !== 200 || !loginResult.token) {
        console.error('❌ Falha no login. Não é possível continuar.');
        return;
      }
      
      // Salvar token
      token = loginResult.token;
      localStorage.setItem('auth_token', token);
      console.log('✅ Token salvo no localStorage');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return;
    }
  } else {
    console.log('✅ Token já existe no localStorage');
  }
  
  console.log('🔍 Token atual:', token.substring(0, 30) + '...');
  
  try {
    // 2. Decodificar token para verificar dados
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('📦 Dados do token:', {
      provider: payload.provider,
      googleUserId: payload.googleUserId,
      email: payload.email,
      exp: new Date(payload.exp * 1000).toLocaleString()
    });
    
    // 3. Testar GET profile primeiro
    console.log('\n🔍 TESTANDO GET /api/google-users/profile...');
    const getResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
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
      console.error('❌ GET profile falhou. Token pode estar inválido.');
      
      // Limpar token inválido e tentar login novamente
      localStorage.removeItem('auth_token');
      console.log('🔄 Token removido. Execute o script novamente.');
      return;
    }
    
    // 4. Agora testar PUT profile-update
    console.log('\n🔍 TESTANDO PUT /api/google-users/profile-update...');
    
    const testData = {
      profile: {
        nome: 'Teste Console Atualizado',
        telefone: '11987654321',
        cpf: '12345678901',
        data_nascimento: '1990-01-01'
      },
      address: {
        logradouro: 'Rua Teste Console',
        numero: '456',
        bairro: 'Bairro Console',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        complemento: 'Apto Console'
      }
    };
    
    console.log('📤 Dados sendo enviados:', testData);
    
    const putResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile-update', {
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
    
    // 5. Análise do resultado
    if (putResponse.status === 200) {
      console.log('\n🎉 SUCESSO! Profile-update funcionou!');
      console.log('✅ Perfil atualizado com sucesso');
      
      // Testar GET novamente para confirmar atualização
      console.log('\n🔍 VERIFICANDO ATUALIZAÇÃO...');
      const verifyResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const verifyResult = await verifyResponse.json();
      console.log('📥 Perfil após atualização:', verifyResult);
      
    } else if (putResponse.status === 401) {
      console.log('\n❌ ERRO 401 PERSISTENTE!');
      console.log('🔍 ANÁLISE DETALHADA:');
      console.log('- Token usado:', token.substring(0, 50) + '...');
      console.log('- Provider no token:', payload.provider);
      console.log('- GoogleUserId no token:', payload.googleUserId);
      console.log('- Erro retornado:', putResult);
      
      // Verificar se GET ainda funciona
      console.log('\n🔍 TESTANDO GET NOVAMENTE...');
      const reGetResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 GET Status (após PUT falhar):', reGetResponse.status);
      
      if (reGetResponse.status === 200) {
        console.log('⚠️ PROBLEMA ESPECÍFICO DO PUT!');
        console.log('GET funciona, mas PUT não. Pode ser problema no middleware ou controlador.');
      } else {
        console.log('❌ Token foi invalidado durante o processo');
      }
      
    } else {
      console.log('\n❌ ERRO INESPERADO:', putResponse.status);
      console.log('📥 Resposta:', putResult);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
})();

// INSTRUÇÕES:
// 1. SUBSTITUA os dados do googleUserData pelos dados reais do seu usuário Google:
//    - email: seu email do Google
//    - sub: seu Google ID (geralmente o mesmo email ou um ID único)
//    - name: seu nome completo
// 2. Cole este código no console do frontend
// 3. O script fará login automaticamente se não houver token
// 4. Depois testará tanto GET quanto PUT para comparar comportamentos
// 5. Analise os logs para identificar onde está o problema

