// SOLUÇÃO IMEDIATA - Cole no console do navegador e execute
// Esta é a correção mais direta para o erro 401

console.log('🚨 SOLUÇÃO IMEDIATA PARA ERRO 401 GOOGLE');
console.log('=' .repeat(50));

// EXECUTE ESTA FUNÇÃO IMEDIATAMENTE
window.corrigirTokenGoogleAgora = async function() {
  console.log('🔧 Corrigindo token Google AGORA...');
  
  try {
    // 1. Verificar se Supabase está disponível
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase não encontrado. Certifique-se de estar na página correta.');
      return false;
    }
    
    // 2. Obter sessão atual
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.error('❌ Erro na sessão:', error);
      console.log('💡 Faça logout e login novamente');
      return false;
    }
    
    console.log('✅ Sessão Supabase encontrada:', session.user.email);
    
    // 3. Fazer login com endpoint correto
    console.log('🔄 Fazendo login com endpoint google-separated...');
    
    const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        google_token: session.access_token
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro no login:', errorData);
      return false;
    }
    
    const result = await response.json();
    
    if (result.token) {
      // 4. Salvar novo token
      localStorage.setItem('auth_token', result.token);
      console.log('✅ Token corrigido e salvo!');
      
      // 5. Verificar token
      const tokenParts = result.token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      
      console.log('📋 Novo token:', {
        provider: payload.provider,
        googleUserId: payload.googleUserId,
        email: payload.email
      });
      
      if (payload.provider === 'google-separated') {
        console.log('🎉 SUCESSO! Token corrigido.');
        console.log('📋 Agora tente salvar o perfil novamente.');
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
};

// EXECUTAR AUTOMATICAMENTE
console.log('🚀 Executando correção automática...');
corrigirTokenGoogleAgora().then(sucesso => {
  if (sucesso) {
    console.log('\n🎯 PRÓXIMO PASSO:');
    console.log('Tente salvar o perfil na interface agora!');
  } else {
    console.log('\n❌ Correção falhou. Tente:');
    console.log('1. Fazer logout e login novamente');
    console.log('2. Verificar se o servidor está rodando');
  }
});

// Função para testar rapidamente
window.testeRapido = async function() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.log('❌ Sem token');
    return;
  }
  
  try {
    const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📥 Teste perfil:', response.status);
    
    if (response.ok) {
      console.log('✅ Token funcionando!');
    } else {
      const error = await response.json();
      console.log('❌ Erro:', error.message);
    }
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
};

console.log('\n📋 COMANDOS EXTRAS:');
console.log('- corrigirTokenGoogleAgora() - Executar correção novamente');
console.log('- testeRapido() - Testar se token está funcionando');

