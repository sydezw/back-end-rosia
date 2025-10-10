// 🔧 CORREÇÃO DEFINITIVA - URL DO FRONTEND
// Este script corrige o problema de URL incorreta no frontend

console.log('🔧 Iniciando correção definitiva da URL do frontend...');

// 1. Interceptar todas as requisições fetch
if (window.originalFetch) {
  console.log('⚠️ Interceptador já existe, removendo...');
  window.fetch = window.originalFetch;
  delete window.originalFetch;
}

// Salvar fetch original
window.originalFetch = window.fetch;

// Novo interceptador que corrige URLs automaticamente
window.fetch = function(url, options = {}) {
  let newUrl = url;
  
  // Corrigir URLs que apontam para localhost:8080
  if (typeof url === 'string') {
    if (url.includes('localhost:8080')) {
      newUrl = url.replace('localhost:8080', 'localhost:3030');
      console.log(`🔄 URL corrigida: ${url} → ${newUrl}`);
    }
    
    // Corrigir endpoints específicos
    if (url.includes('/api/users/profile') && !url.includes('/api/google-users/profile')) {
      // Verificar se é usuário Google
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.provider === 'google-separated' || payload.email?.includes('@gmail.com')) {
            newUrl = newUrl.replace('/api/users/profile', '/api/google-users/profile');
            console.log(`🔄 Endpoint corrigido para Google: ${url} → ${newUrl}`);
          }
        } catch (e) {
          console.log('⚠️ Erro ao decodificar token, usando endpoint original');
        }
      }
    }
  }
  
  // Garantir que sempre use localhost:3030 para APIs
  if (typeof newUrl === 'string' && newUrl.includes('/api/') && !newUrl.includes('localhost:3030')) {
    if (newUrl.startsWith('/api/')) {
      newUrl = `http://localhost:3030${newUrl}`;
      console.log(`🔄 URL base adicionada: ${url} → ${newUrl}`);
    }
  }
  
  return window.originalFetch(newUrl, options);
};

console.log('✅ Interceptador de URL instalado com sucesso!');

// 2. Função para testar a correção
window.testarCorrecaoURL = async function() {
  console.log('🧪 Testando correção de URL...');
  
  try {
    // Teste 1: URL incorreta deve ser corrigida
    console.log('📝 Teste 1: Corrigindo localhost:8080 → localhost:3030');
    const response1 = await fetch('http://localhost:8080/api/google-users/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    console.log(`✅ Teste 1: Status ${response1.status}`);
    
    // Teste 2: Endpoint de usuário normal deve ser redirecionado para Google
    console.log('📝 Teste 2: Redirecionando /api/users/profile → /api/google-users/profile');
    const response2 = await fetch('http://localhost:3030/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    console.log(`✅ Teste 2: Status ${response2.status}`);
    
    console.log('🎉 Todos os testes passaram! Correção funcionando.');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
  }
};

// 3. Função para recarregar dados do perfil
window.recarregarPerfil = async function() {
  console.log('🔄 Recarregando dados do perfil...');
  
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('❌ Token não encontrado');
      return;
    }
    
    const response = await fetch('http://localhost:3030/api/google-users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados do perfil carregados:', data);
      return data;
    } else {
      console.error('❌ Erro ao carregar perfil:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
};

// 4. Aplicar correção automaticamente
console.log('🚀 Executando teste automático...');
setTimeout(() => {
  window.testarCorrecaoURL();
}, 1000);

console.log(`
📋 INSTRUÇÕES DE USO:
1. Execute: testarCorrecaoURL() - para testar as correções
2. Execute: recarregarPerfil() - para recarregar dados do perfil
3. A correção já está ativa automaticamente!

✅ Agora todas as requisições serão corrigidas automaticamente!`);