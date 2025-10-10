// DIAGNÓSTICO COMPLETO: Verificar e corrigir detecção de usuário Google
// Execute no console do navegador para diagnóstico completo

console.log('🔍 DIAGNÓSTICO COMPLETO - USUÁRIO GOOGLE');
console.log('=' .repeat(60));

// Função principal de diagnóstico
window.diagnosticoCompletoGoogle = async function() {
  console.log('\n1️⃣ VERIFICANDO AUTENTICAÇÃO...');
  console.log('-' .repeat(40));
  
  try {
    // Verificar se Supabase está disponível
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase não está disponível');
      return;
    }
    
    // Obter usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Usuário não autenticado:', userError);
      return;
    }
    
    console.log('✅ Usuário autenticado:');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('   Provider:', user.app_metadata?.provider);
    console.log('   Providers:', user.app_metadata?.providers);
    
    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Erro na sessão:', sessionError);
      return;
    }
    
    console.log('✅ Sessão válida:');
    console.log('   Access Token:', session.access_token ? 'Presente' : 'Ausente');
    console.log('   Refresh Token:', session.refresh_token ? 'Presente' : 'Ausente');
    
    console.log('\n2️⃣ VERIFICANDO DETECÇÃO DE USUÁRIO GOOGLE...');
    console.log('-' .repeat(40));
    
    // Lista de usuários Google conhecidos
    const googleUsers = [
      'schoolts965@gmail.com',
      // Adicione outros emails Google aqui
    ];
    
    const isGoogleUser = googleUsers.includes(user.email || '');
    
    console.log('🔍 Email do usuário:', user.email);
    console.log('🔍 É usuário Google?', isGoogleUser ? '✅ SIM' : '❌ NÃO');
    
    if (isGoogleUser) {
      console.log('✅ USUÁRIO GOOGLE DETECTADO');
      console.log('📍 Endpoint correto: /api/google-users/profile-update');
      console.log('📍 Tabela correta: google_user_profiles');
    } else {
      console.log('⚠️ USUÁRIO NORMAL DETECTADO');
      console.log('📍 Endpoint correto: /api/users/profile-update');
      console.log('📍 Tabela correta: user_profiles');
    }
    
    console.log('\n3️⃣ TESTANDO ENDPOINTS...');
    console.log('-' .repeat(40));
    
    // Testar endpoint Google
    console.log('🧪 Testando endpoint Google...');
    try {
      const googleResponse = await fetch('http://localhost:3030/api/google-users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('📥 Google endpoint status:', googleResponse.status);
      
      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        console.log('✅ Google endpoint funcionando:', googleData.success ? 'SIM' : 'NÃO');
      } else {
        const googleError = await googleResponse.json();
        console.log('❌ Google endpoint erro:', googleError);
      }
    } catch (error) {
      console.error('❌ Erro ao testar endpoint Google:', error);
    }
    
    // Testar endpoint normal
    console.log('\n🧪 Testando endpoint normal...');
    try {
      const normalResponse = await fetch('http://localhost:3030/api/users/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      console.log('📥 Normal endpoint status:', normalResponse.status);
      
      if (normalResponse.ok) {
        const normalData = await normalResponse.json();
        console.log('✅ Normal endpoint funcionando:', normalData.success ? 'SIM' : 'NÃO');
      } else {
        const normalError = await normalResponse.json();
        console.log('❌ Normal endpoint erro:', normalError);
      }
    } catch (error) {
      console.error('❌ Erro ao testar endpoint normal:', error);
    }
    
    console.log('\n4️⃣ RECOMENDAÇÕES...');
    console.log('-' .repeat(40));
    
    if (isGoogleUser) {
      console.log('🎯 PARA USUÁRIO GOOGLE:');
      console.log('1. Use o endpoint: /api/google-users/profile-update');
      console.log('2. Execute a correção urgente: CORRECAO-URGENTE-ENDPOINT.js');
      console.log('3. Ou aplique a correção definitiva no código');
    } else {
      console.log('🎯 PARA USUÁRIO NORMAL:');
      console.log('1. Use o endpoint: /api/users/profile-update');
      console.log('2. Verifique se não há conflitos de email na tabela user_profiles');
    }
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
};

// Função para aplicar correção automática
window.aplicarCorrecaoAutomatica = function() {
  console.log('🔧 APLICANDO CORREÇÃO AUTOMÁTICA...');
  
  // Interceptar fetch para redirecionar automaticamente
  const originalFetch = window.fetch;
  
  window.fetch = function(url, options = {}) {
    // Se for uma requisição para o endpoint de usuários normais de um usuário Google
    if (url.includes('/api/users/profile-update') || url.includes('/api/users/profile')) {
      // Verificar se é usuário Google
      const googleUsers = ['schoolts965@gmail.com'];
      
      // Tentar obter email do usuário atual
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && googleUsers.includes(user.email || '')) {
          console.log('🔄 REDIRECIONAMENTO AUTOMÁTICO ATIVADO para usuário Google');
        }
      });
      
      // Redirecionar para endpoint Google
      const newUrl = url.replace('/api/users/', '/api/google-users/');
      console.log('🔄 Redirecionando:', url, '→', newUrl);
      
      return originalFetch(newUrl, options);
    }
    
    return originalFetch(url, options);
  };
  
  console.log('✅ Correção automática aplicada!');
  console.log('📋 Todas as requisições serão redirecionadas automaticamente');
};

// Executar diagnóstico automaticamente
console.log('🚀 Executando diagnóstico automático...');
diagnosticoCompletoGoogle();

console.log('\n📋 COMANDOS DISPONÍVEIS:');
console.log('- diagnosticoCompletoGoogle() - Executar diagnóstico completo');
console.log('- aplicarCorrecaoAutomatica() - Aplicar redirecionamento automático');