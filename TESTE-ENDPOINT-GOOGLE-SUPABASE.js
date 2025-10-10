// TESTE DO ENDPOINT GOOGLE COM TOKEN SUPABASE
// Execute este script no console do navegador para testar o endpoint atualizado

console.log('🧪 INICIANDO TESTE DO ENDPOINT GOOGLE COM TOKEN SUPABASE');

// Verificar se o Supabase está disponível
if (typeof window.supabase === 'undefined') {
  console.error('❌ window.supabase não está disponível!');
  console.log('📋 SOLUÇÕES:');
  console.log('1. Certifique-se de estar na página do frontend onde o Supabase foi inicializado');
  console.log('2. Ou use o teste manual abaixo:');
  console.log('');
  console.log('🔧 TESTE MANUAL:');
  console.log('1. Abra as ferramentas de desenvolvedor (F12)');
  console.log('2. Vá para a aba Application/Storage > Local Storage');
  console.log('3. Procure por uma chave que contenha "supabase" e "access_token"');
  console.log('4. Copie o valor do access_token');
  console.log('5. Execute o código abaixo substituindo SEU_TOKEN_AQUI:');
  console.log('');
  console.log(`fetch('http://localhost:3030/api/google-users/profile', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer SEU_TOKEN_AQUI'
    }
  }).then(r => r.json()).then(console.log);`);
  return;
}

// Função para testar o endpoint atualizado
async function testarEndpointGoogleSupabase() {
  try {
    // 1. Obter o token do Supabase
    const { data: { session } } = await window.supabase.auth.getSession();

    if (!session) {
      console.error('❌ Usuário não está autenticado!');
      console.log('📋 Para autenticar:');
      console.log('1. Faça login na aplicação');
      console.log('2. Execute este script novamente');
      return;
    }

    const token = session.access_token;
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');

    // 2. Fazer a requisição para o endpoint
    console.log('🔄 Fazendo requisição para o endpoint...');
    
    const response = await fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCESSO! Dados do perfil Google:');
      console.log(data);
    } else {
      console.error('❌ ERRO na resposta:');
      console.error(data);
    }

  } catch (error) {
    console.error('❌ ERRO na requisição:', error);
  }
}

// Executar o teste
testarEndpointGoogleSupabase();