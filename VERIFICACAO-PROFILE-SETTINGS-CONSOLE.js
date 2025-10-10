// SCRIPT DE VERIFICAÇÃO - Execute no Console do Navegador
// Este script verifica se o ProfileSettings.tsx está usando a importação correta

console.log('🔍 DIAGNÓSTICO: Verificação do ProfileSettings.tsx');
console.log('================================================');

// 1. Verificar se a função updateUserProfile está disponível
if (typeof updateUserProfile === 'function') {
  console.log('✅ Função updateUserProfile encontrada');
  
  // Verificar se tem a detecção automática de usuário Google
  const funcString = updateUserProfile.toString();
  if (funcString.includes('google-users/profile-update')) {
    console.log('✅ Função contém endpoint Google - IMPORTAÇÃO CORRETA');
    console.log('✅ ProfileSettings.tsx está usando: import { updateUserProfile } from "./profile-api";');
  } else {
    console.log('❌ Função NÃO contém endpoint Google - IMPORTAÇÃO INCORRETA');
    console.log('❌ ProfileSettings.tsx está usando importação antiga');
    console.log('🔧 CORREÇÃO NECESSÁRIA: Alterar para import { updateUserProfile } from "./profile-api";');
  }
} else {
  console.log('❌ Função updateUserProfile NÃO encontrada');
  console.log('❌ Verifique se o ProfileSettings.tsx tem a importação correta');
}

// 2. Verificar tokens no localStorage
const token = localStorage.getItem('token');
const googleToken = localStorage.getItem('google_token');

console.log('\n🔍 TOKENS DISPONÍVEIS:');
console.log('Token normal:', token ? '✅ Presente' : '❌ Ausente');
console.log('Token Google:', googleToken ? '✅ Presente' : '❌ Ausente');

// 3. Verificar qual tipo de usuário
if (googleToken) {
  console.log('\n👤 TIPO DE USUÁRIO: Google');
  console.log('📡 ENDPOINT ESPERADO: /api/google-users/profile-update');
} else if (token) {
  console.log('\n👤 TIPO DE USUÁRIO: Normal');
  console.log('📡 ENDPOINT ESPERADO: /api/users/profile-update');
} else {
  console.log('\n❌ USUÁRIO NÃO AUTENTICADO');
}

// 4. Monitorar próximas requisições
console.log('\n🔍 MONITORAMENTO DE REQUISIÇÕES:');
console.log('Aguardando próxima atualização de perfil...');

// Interceptar fetch para monitorar requisições
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('profile-update')) {
    console.log('\n📡 REQUISIÇÃO INTERCEPTADA:');
    console.log('URL:', url);
    
    if (url.includes('/api/google-users/profile-update')) {
      console.log('✅ ENDPOINT CORRETO para usuário Google');
    } else if (url.includes('/api/users/profile-update')) {
      if (googleToken) {
        console.log('❌ ENDPOINT INCORRETO para usuário Google!');
        console.log('🔧 Deveria usar: /api/google-users/profile-update');
      } else {
        console.log('✅ ENDPOINT CORRETO para usuário normal');
      }
    }
  }
  return originalFetch.apply(this, args);
};

// 5. Função de teste manual
window.testarProfileAPI = function() {
  console.log('\n🧪 TESTE MANUAL DA API:');
  
  if (typeof updateUserProfile !== 'function') {
    console.log('❌ Função updateUserProfile não disponível');
    return;
  }
  
  const dadosTeste = {
    profile: {
      nome: 'Teste',
      telefone: '11999999999'
    },
    address: {
      nome_endereco: 'Teste',
      cep: '01234567'
    }
  };
  
  console.log('📤 Enviando dados de teste:', dadosTeste);
  
  updateUserProfile(dadosTeste)
    .then(result => {
      console.log('✅ Teste bem-sucedido:', result);
    })
    .catch(error => {
      console.log('❌ Erro no teste:', error);
    });
};

console.log('\n🔧 COMANDOS DISPONÍVEIS:');
console.log('- testarProfileAPI() - Executa teste manual');
console.log('\n📋 CHECKLIST DE CORREÇÃO:');
console.log('[ ] ProfileSettings.tsx importa: import { updateUserProfile } from "./profile-api";');
console.log('[ ] Não há importações antigas de updateUserProfile');
console.log('[ ] Logs mostram "Usando endpoint Google" para usuários Google');
console.log('[ ] Requisições vão para /api/google-users/profile-update (usuários Google)');
console.log('[ ] Não ocorre mais erro 400 Bad Request');

console.log('\n✅ Verificação concluída. Execute testarProfileAPI() para teste manual.');