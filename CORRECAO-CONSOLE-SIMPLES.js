// CORREÇÃO SIMPLES - Cole TUDO no console do navegador
// Pressione Enter após colar e depois execute: corrigirTokenGoogleAgora()

console.log('🚨 CORREÇÃO TOKEN GOOGLE - VERSÃO SIMPLES');
console.log('=' .repeat(50));

// Função principal de correção
window.corrigirTokenGoogleAgora = async function() {
  console.log('🔧 Iniciando correção do token Google...');
  
  try {
    // 1. Obter token atual
    const tokenAtual = localStorage.getItem('auth_token');
    console.log('📋 Token atual:', tokenAtual ? 'Encontrado' : 'Não encontrado');
    
    if (!tokenAtual) {
      console.error('❌ Nenhum token encontrado no localStorage');
      console.log('💡 Faça login primeiro');
      return;
    }
    
    // 2. Decodificar token atual para obter dados
    let dadosUsuario;
    try {
      const payload = JSON.parse(atob(tokenAtual.split('.')[1]));
      dadosUsuario = {
        email: payload.email,
        sub: payload.googleId || payload.userId,
        name: payload.name || 'Usuário Google'
      };
      console.log('✅ Dados extraídos:', dadosUsuario.email);
    } catch (e) {
      console.error('❌ Erro ao decodificar token:', e);
      return;
    }
    
    // 3. Fazer login com endpoint correto
    console.log('🔄 Fazendo login com endpoint google-separated...');
    
    const response = await fetch('http://localhost:3030/api/auth/login/google-separated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: dadosUsuario.email,
        sub: dadosUsuario.sub,
        name: dadosUsuario.name,
        email_verified: true
      })
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na requisição:', errorText);
      return;
    }
    
    const resultado = await response.json();
    console.log('📥 Resposta recebida:', resultado.success ? 'Sucesso' : 'Falha');
    
    if (resultado.token) {
      // 4. Salvar novo token
      localStorage.setItem('auth_token', resultado.token);
      console.log('✅ Novo token salvo com sucesso!');
      
      // 5. Testar imediatamente
      console.log('🧪 Testando novo token...');
      
      const testeResponse = await fetch('http://localhost:3030/api/google-users/profile', {
        headers: {
          'Authorization': `Bearer ${resultado.token}`
        }
      });
      
      if (testeResponse.ok) {
        console.log('🎉 SUCESSO! Token funcionando perfeitamente!');
        console.log('✅ Erro 401 resolvido!');
        return true;
      } else {
        const testeError = await testeResponse.json();
        console.error('❌ Token ainda não funciona:', testeError.message);
        return false;
      }
    } else {
      console.error('❌ Nenhum token retornado:', resultado);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
};

// Função de teste rápido
window.testeTokenRapido = async function() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.log('❌ Nenhum token encontrado');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3030/api/google-users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      console.log('✅ Token funcionando!');
    } else {
      const error = await response.json();
      console.log('❌ Token com problema:', error.message);
    }
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
};

// Instruções
console.log('\n📋 INSTRUÇÕES:');
console.log('1. Cole TODO este código no console');
console.log('2. Pressione Enter');
console.log('3. Execute: corrigirTokenGoogleAgora()');
console.log('4. Para testar: testeTokenRapido()');
console.log('\n🚀 Pronto para usar!');}}}