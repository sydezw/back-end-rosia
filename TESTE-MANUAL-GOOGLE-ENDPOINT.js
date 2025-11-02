// 🧪 TESTE MANUAL DO ENDPOINT GOOGLE
// Use este script quando window.supabase não estiver disponível

console.log('🔧 TESTE MANUAL DO ENDPOINT GOOGLE');
console.log('================================');

// Função para testar com token manual
function testarComTokenManual(token) {
  if (!token) {
    console.error('❌ Token não fornecido!');
    console.log('📋 Como obter o token:');
    console.log('1. Faça login no frontend');
    console.log('2. Abra DevTools (F12)');
    console.log('3. Vá para Application > Local Storage');
    console.log('4. Procure por chave contendo "supabase" e "access_token"');
    console.log('5. Copie o valor e execute: testarComTokenManual("SEU_TOKEN_AQUI")');
    return;
  }

  console.log('🚀 Testando endpoint com token fornecido...');
  console.log('Token preview:', token.substring(0, 30) + '...');

  // Teste 1: GET Profile
  fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📊 GET Profile - Status:', response.status);
    return response.json();
  })
  .then(data => {
    if (data.success !== false) {
      console.log('✅ GET Profile - SUCESSO:');
      console.log(data);
      
      // Se GET funcionou, testar PUT
      console.log('\n🔄 Testando PUT Profile Update...');
      return fetch('https://back-end-rosia02.vercel.app/api/google-users/profile-update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: 'Teste Google User',
          telefone: '11999999999'
        })
      });
    } else {
      console.error('❌ GET Profile - ERRO:');
      console.error(data);
      throw new Error('GET falhou');
    }
  })
  .then(response => {
    if (response) {
      console.log('📊 PUT Profile Update - Status:', response.status);
      return response.json();
    }
  })
  .then(data => {
    if (data) {
      if (data.success !== false) {
        console.log('✅ PUT Profile Update - SUCESSO:');
        console.log(data);
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
      } else {
        console.error('❌ PUT Profile Update - ERRO:');
        console.error(data);
      }
    }
  })
  .catch(error => {
    console.error('💥 Erro durante os testes:', error);
  });
}

// Função para obter token do localStorage automaticamente
function obterTokenDoLocalStorage() {
  console.log('🔍 Procurando token no localStorage...');
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase')) {
      try {
        const value = localStorage.getItem(key);
        const parsed = JSON.parse(value);
        
        if (parsed && parsed.access_token) {
          console.log('✅ Token encontrado na chave:', key);
          console.log('🚀 Executando teste automaticamente...');
          testarComTokenManual(parsed.access_token);
          return;
        }
      } catch (e) {
        // Ignorar erros de parsing
      }
    }
  }
  
  console.log('❌ Token não encontrado no localStorage');
  console.log('📋 Execute manualmente: testarComTokenManual("SEU_TOKEN_AQUI")');
}

// Tentar obter token automaticamente
obterTokenDoLocalStorage();

// Disponibilizar função global
window.testarComTokenManual = testarComTokenManual;
window.obterTokenDoLocalStorage = obterTokenDoLocalStorage;

console.log('\n📋 FUNÇÕES DISPONÍVEIS:');
console.log('- testarComTokenManual("seu_token_aqui")');
console.log('- obterTokenDoLocalStorage()');

