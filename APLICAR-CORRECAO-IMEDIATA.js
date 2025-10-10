// APLICAR CORREÇÃO IMEDIATA - Execute no console do navegador
// Esta correção força o login com endpoint correto para gerar token válido

console.log('🚨 APLICANDO CORREÇÃO IMEDIATA PARA TOKEN GOOGLE');
console.log('=' .repeat(60));

// Função para aplicar correção imediata
window.aplicarCorrecaoImediata = async function() {
  console.log('🔧 Iniciando correção imediata do token...');
  
  try {
    // 1. Verificar token atual
    const tokenAtual = localStorage.getItem('auth_token');
    
    if (tokenAtual) {
      console.log('🔍 Token atual encontrado, analisando...');
      
      try {
        const tokenParts = tokenAtual.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('📋 Token atual:', {
            provider: payload.provider,
            userId: payload.userId,
            googleUserId: payload.googleUserId,
            email: payload.email
          });
          
          if (payload.provider === 'google-separated' && payload.googleUserId) {
            console.log('✅ Token já está correto!');
            return;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao decodificar token:', error);
      }
    }
    
    // 2. Obter sessão Supabase
    console.log('🔍 Obtendo sessão Supabase...');
    
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase não disponível. Certifique-se de estar na página correta.');
      return;
    }
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro na sessão Supabase:', sessionError);
      return;
    }
    
    if (!session || !session.access_token) {
      console.error('❌ Sessão Supabase não encontrada. Faça login novamente.');
      return;
    }
    
    console.log('✅ Sessão Supabase válida encontrada');
    console.log('📋 Email da sessão:', session.user?.email);
    
    // 3. Fazer login com endpoint correto
    console.log('🔄 Fazendo login com endpoint google-separated...');
    
    const response = await fetch('http://localhost:3030/api/auth/login/google-separated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        google_token: session.access_token
      })
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro no login separado:', errorData);
      
      if (response.status === 404) {
        console.log('💡 Dica: Verifique se o servidor está rodando e o endpoint existe');
      }
      return;
    }
    
    const result = await response.json();
    console.log('✅ Login separado bem-sucedido!');
    console.log('📋 Resultado:', {
      success: result.success,
      hasToken: !!result.token,
      user: result.user?.email
    });
    
    // 4. Salvar novo token
    if (result.token) {
      localStorage.setItem('auth_token', result.token);
      console.log('✅ Novo token salvo no localStorage');
      
      // Verificar novo token
      try {
        const tokenParts = result.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('✅ Novo token verificado:', {
            provider: payload.provider,
            googleUserId: payload.googleUserId,
            email: payload.email,
            expiracao: new Date(payload.exp * 1000).toLocaleString()
          });
          
          if (payload.provider === 'google-separated' && payload.googleUserId) {
            console.log('🎉 TOKEN CORRIGIDO COM SUCESSO!');
            console.log('📋 Agora você pode tentar salvar o perfil novamente');
            console.log('🔄 Recarregue a página se necessário');
          } else {
            console.warn('⚠️ Token gerado mas ainda não está no formato correto');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar novo token:', error);
      }
      
    } else {
      console.error('❌ Token não retornado na resposta');
    }
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
    
    if (error.message.includes('fetch')) {
      console.log('💡 Dica: Verifique se o servidor backend está rodando na porta 3030');
    }
  }
};

// Função para testar o perfil após correção
window.testarPerfilAposCorrecao = async function() {
  console.log('🧪 TESTANDO PERFIL APÓS CORREÇÃO');
  console.log('-' .repeat(40));
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ Token não encontrado');
      return;
    }
    
    console.log('🔍 Testando endpoint de perfil Google...');
    
    const response = await fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Perfil obtido com sucesso!');
      console.log('📋 Dados do perfil:', result);
      
      console.log('\n🎯 TESTE DE ATUALIZAÇÃO:');
      console.log('Agora tente salvar o perfil na interface');
      
    } else {
      const error = await response.json();
      console.error('❌ Erro ao obter perfil:', error);
      
      if (response.status === 401) {
        console.log('💡 Token ainda inválido. Execute aplicarCorrecaoImediata() novamente');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Função para verificar status atual
window.verificarStatusAtual = function() {
  console.log('🔍 VERIFICANDO STATUS ATUAL');
  console.log('-' .repeat(30));
  
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado');
    return;
  }
  
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      
      console.log('📋 Token atual:');
      console.log('   Provider:', payload.provider);
      console.log('   User ID:', payload.userId);
      console.log('   Google User ID:', payload.googleUserId);
      console.log('   Email:', payload.email);
      console.log('   Expira em:', new Date(payload.exp * 1000).toLocaleString());
      
      const isCorrect = payload.provider === 'google-separated' && payload.googleUserId;
      console.log('\n🎯 Status:', isCorrect ? '✅ CORRETO' : '❌ INCORRETO');
      
      if (!isCorrect) {
        console.log('\n📋 AÇÃO NECESSÁRIA:');
        console.log('Execute: aplicarCorrecaoImediata()');
      } else {
        console.log('\n📋 PRÓXIMO PASSO:');
        console.log('Tente salvar o perfil na interface');
      }
      
    } else {
      console.log('❌ Formato de token inválido');
    }
  } catch (error) {
    console.error('❌ Erro ao decodificar token:', error);
  }
};

// Executar verificação inicial
console.log('🚀 Executando verificação inicial...');
verificarStatusAtual();

console.log('\n📋 COMANDOS DISPONÍVEIS:');
console.log('- verificarStatusAtual() - Verificar status do token');
console.log('- aplicarCorrecaoImediata() - Corrigir token (PRINCIPAL)');
console.log('- testarPerfilAposCorrecao() - Testar perfil após correção');

console.log('\n🎯 PASSOS PARA CORREÇÃO:');
console.log('1. Execute: aplicarCorrecaoImediata()');
console.log('2. Execute: testarPerfilAposCorrecao()');
console.log('3. Tente salvar o perfil na interface');

console.log('\n⚡ CORREÇÃO RÁPIDA:');
console.log('Se quiser aplicar imediatamente, execute: aplicarCorrecaoImediata()');