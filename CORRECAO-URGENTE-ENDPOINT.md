// CORREÇÃO URGENTE: Interceptar e redirecionar requisições para endpoint correto
// Execute este código no console do navegador ANTES de tentar salvar o perfil

console.log('🚨 APLICANDO CORREÇÃO URGENTE DE ENDPOINT');
console.log('=' .repeat(50));

// Interceptar fetch para redirecionar automaticamente
const originalFetch = window.fetch;

window.fetch = function(url, options = {}) {
  console.log('📡 REQUISIÇÃO INTERCEPTADA:', url);
  
  // Se for uma requisição para o endpoint de usuários normais
  if (url.includes('/api/users/profile-update')) {
    console.log('🔄 REDIRECIONANDO: /api/users/profile-update → /api/google-users/profile-update');
    
    // Redirecionar para o endpoint Google
    const newUrl = url.replace('/api/users/profile-update', '/api/google-users/profile-update');
    console.log('✅ Nova URL:', newUrl);
    
    return originalFetch(newUrl, options);
  }
  
  // Para outras requisições, usar o fetch original
  return originalFetch(url, options);
};

console.log('✅ Interceptador de fetch instalado');
console.log('📋 Agora todas as requisições para /api/users/profile-update serão redirecionadas para /api/google-users/profile-update');

// Função para testar a correção
window.testarCorrecaoUrgente = async function() {
  console.log('🧪 Testando correção urgente...');
  
  try {
    // Simular uma requisição que seria redirecionada
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || 'test'}`
      },
      body: JSON.stringify({
        profile: {
          nome: 'Teste',
          cpf: '12345678901',
          telefone: '11999999999',
          data_nascimento: '1990-01-01'
        },
        address: {
          nome_endereco: 'Teste',
          cep: '01234567',
          logradouro: 'Rua Teste',
          numero: '123',
          bairro: 'Teste',
          cidade: 'São Paulo',
          estado: 'SP'
        }
      })
    });
    
    console.log('📥 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Teste bem-sucedido:', result);
    } else {
      const error = await response.json();
      console.log('⚠️ Resposta do servidor:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Função para remover a correção
window.removerCorrecaoUrgente = function() {
  window.fetch = originalFetch;
  console.log('🔄 Interceptador removido, fetch original restaurado');
};

console.log('\n🎯 INSTRUÇÕES:');
console.log('1. Execute este código no console');
console.log('2. Tente salvar o perfil normalmente');
console.log('3. Verifique se a requisição foi redirecionada');
console.log('4. Para testar: testarCorrecaoUrgente()');
console.log('5. Para remover: removerCorrecaoUrgente()');

console.log('\n✅ CORREÇÃO URGENTE APLICADA!');
console.log('Agora tente salvar o perfil novamente.');

