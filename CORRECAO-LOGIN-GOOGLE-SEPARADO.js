// CORREÇÃO: Forçar login Google com endpoint separado
// Execute no console do navegador para corrigir o token

console.log('🔧 CORREÇÃO: Login Google com Endpoint Separado');
console.log('=' .repeat(60));

// Função para fazer login Google com endpoint correto
window.corrigirLoginGoogle = async function() {
  console.log('🔍 Iniciando correção do login Google...');
  
  try {
    // 1. Verificar token atual
    const tokenAtual = localStorage.getItem('auth_token');
    
    if (tokenAtual) {
      console.log('🔍 Token atual encontrado, verificando tipo...');
      
      try {
        const tokenParts = tokenAtual.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔍 Payload do token atual:', {
            provider: payload.provider,
            userId: payload.userId,
            googleUserId: payload.googleUserId,
            email: payload.email
          });
          
          if (payload.provider === 'google-separated') {
            console.log('✅ Token já está correto (google-separated)');
            return;
          } else {
            console.log('⚠️ Token incorreto, provider:', payload.provider);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao decodificar token:', error);
      }
    }
    
    // 2. Obter token Google do Supabase
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase não disponível');
      return;
    }
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Erro na sessão Supabase:', sessionError);
      return;
    }
    
    console.log('✅ Sessão Supabase obtida');
    
    // 3. Fazer login com endpoint separado
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
      return;
    }
    
    const result = await response.json();
    console.log('✅ Login separado bem-sucedido:', result);
    
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
            email: payload.email
          });
        }
      } catch (error) {
        console.error('❌ Erro ao verificar novo token:', error);
      }
      
      console.log('🎉 CORREÇÃO CONCLUÍDA!');
      console.log('📋 Agora você pode tentar salvar o perfil novamente');
      
    } else {
      console.error('❌ Token não retornado na resposta');
    }
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
};

// Função para verificar status do token
window.verificarStatusToken = function() {
  console.log('🔍 VERIFICANDO STATUS DO TOKEN');
  console.log('-' .repeat(40));
  
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado');
    return;
  }
  
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      
      console.log('📋 Informações do token:');
      console.log('   Provider:', payload.provider);
      console.log('   User ID:', payload.userId);
      console.log('   Google User ID:', payload.googleUserId);
      console.log('   Email:', payload.email);
      console.log('   Expiração:', new Date(payload.exp * 1000).toLocaleString());
      
      const isCorrect = payload.provider === 'google-separated' && payload.googleUserId;
      console.log('\n🎯 Status:', isCorrect ? '✅ CORRETO' : '❌ INCORRETO');
      
      if (!isCorrect) {
        console.log('📋 Para corrigir, execute: corrigirLoginGoogle()');
      }
      
    } else {
      console.log('❌ Formato de token inválido');
    }
  } catch (error) {
    console.error('❌ Erro ao decodificar token:', error);
  }
};

// Função para testar perfil após correção
window.testarPerfilCorrigido = async function() {
  console.log('🧪 TESTANDO PERFIL APÓS CORREÇÃO');
  console.log('-' .repeat(40));
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ Token não encontrado');
      return;
    }
    
    // Testar endpoint de perfil Google
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
      console.log('✅ Perfil obtido com sucesso:', result);
    } else {
      const error = await response.json();
      console.error('❌ Erro ao obter perfil:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar verificação inicial
console.log('🚀 Executando verificação inicial...');
verificarStatusToken();

console.log('\n📋 COMANDOS DISPONÍVEIS:');
console.log('- verificarStatusToken() - Verificar status do token atual');
console.log('- corrigirLoginGoogle() - Fazer login com endpoint correto');
console.log('- testarPerfilCorrigido() - Testar acesso ao perfil após correção');

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Execute: corrigirLoginGoogle()');
console.log('2. Execute: testarPerfilCorrigido()');
console.log('3. Tente salvar o perfil novamente');