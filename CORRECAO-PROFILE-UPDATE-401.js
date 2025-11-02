// CORREÇÃO ESPECÍFICA: ERRO 401 NO PROFILE-UPDATE
// Este script corrige o formato dos dados do Google e testa especificamente o erro 401

(async function() {
  console.log('🔧 CORREÇÃO: ERRO 401 NO PROFILE-UPDATE');
  console.log('==========================================');
  
  // 1. Limpar token antigo se existir
  localStorage.removeItem('auth_token');
  console.log('🧹 Token antigo removido');
  
  // 2. Dados corretos para o endpoint Google separado
  const googleUserData = {
    email: 'schoolts965@gmail.com',
    sub: 'schoolts965@gmail.com', // Campo correto: 'sub' em vez de 'googleId'
    name: 'Usuário Teste',
    email_verified: true,
    picture: null
  };
  
  console.log('🔐 Fazendo login com dados corretos:', {
    email: googleUserData.email,
    sub: googleUserData.sub,
    name: googleUserData.name
  });
  
  try {
    // 3. Login com formato correto
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
      console.error('❌ Falha no login. Verifique os dados do Google.');
      return;
    }
    
    const token = loginResult.token;
    localStorage.setItem('auth_token', token);
    console.log('✅ Token salvo com sucesso');
    
    // 4. Decodificar token para verificar
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('📦 Token decodificado:', {
      provider: payload.provider,
      googleUserId: payload.googleUserId,
      email: payload.email,
      exp: new Date(payload.exp * 1000).toLocaleString()
    });
    
    // 5. Testar GET profile (deve funcionar)
    console.log('\n🔍 TESTE 1: GET /api/google-users/profile');
    const getResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 GET Status:', getResponse.status);
    const getResult = await getResponse.json();
    console.log('📥 GET Resultado:', getResult);
    
    if (getResponse.status !== 200) {
      console.error('❌ GET profile falhou. Token inválido.');
      return;
    }
    
    console.log('✅ GET profile funcionou!');
    
    // 6. Testar PUT profile-update (problema do erro 401)
    console.log('\n🔍 TESTE 2: PUT /api/google-users/profile-update');
    
    const updateData = {
      profile: {
        nome: 'Teste Correção 401',
        telefone: '11999887766',
        cpf: '98765432100', // CPF diferente para evitar conflito
        data_nascimento: '1990-01-01'
      },
      address: {
        logradouro: 'Rua Correção',
        numero: '123',
        bairro: 'Bairro Teste',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        complemento: 'Apto 1'
      }
    };
    
    console.log('📤 Dados para atualização:', updateData);
    
    const putResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile-update', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('📡 PUT Status:', putResponse.status);
    const putResult = await putResponse.json();
    console.log('📥 PUT Resultado:', putResult);
    
    // 7. Análise do resultado
    if (putResponse.status === 200) {
      console.log('\n🎉 SUCESSO! Erro 401 corrigido!');
      console.log('✅ Profile-update funcionando normalmente');
      
      // Verificar se a atualização foi salva
      console.log('\n🔍 VERIFICAÇÃO: GET profile após atualização');
      const verifyResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const verifyResult = await verifyResponse.json();
      console.log('📥 Perfil atualizado:', verifyResult);
      
    } else if (putResponse.status === 401) {
      console.log('\n❌ ERRO 401 AINDA PERSISTE!');
      console.log('🔍 DIAGNÓSTICO DETALHADO:');
      
      // Comparar headers das requisições
      console.log('- Token usado (primeiros 50 chars):', token.substring(0, 50));
      console.log('- Provider no token:', payload.provider);
      console.log('- GoogleUserId no token:', payload.googleUserId);
      console.log('- Erro retornado:', putResult);
      
      // Testar GET novamente para confirmar que token ainda é válido
      console.log('\n🔍 TESTE DE CONFIRMAÇÃO: GET profile novamente');
      const reGetResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 GET Status (após PUT falhar):', reGetResponse.status);
      
      if (reGetResponse.status === 200) {
        console.log('⚠️ PROBLEMA ESPECÍFICO DO ENDPOINT PUT!');
        console.log('- GET funciona = Token válido');
        console.log('- PUT falha = Problema no middleware ou controlador do PUT');
        console.log('- Possível causa: Diferença na validação entre GET e PUT');
      } else {
        console.log('❌ Token foi invalidado durante o processo');
      }
      
    } else {
      console.log('\n❌ ERRO INESPERADO:', putResponse.status);
      console.log('📥 Resposta:', putResult);
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error);
  }
})();

// COMO USAR:
// 1. Substitua o email e sub pelos seus dados reais do Google
// 2. Cole no console do frontend (F12 > Console)
// 3. Execute e analise os logs
// 4. Se ainda der erro 401, o problema está no backend (middleware ou controlador)

