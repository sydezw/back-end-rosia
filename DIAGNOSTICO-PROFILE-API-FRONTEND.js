// 🔍 SCRIPT DE DIAGNÓSTICO - Execute no Console do Navegador
// Copie e cole este código no console do navegador (F12) para diagnosticar o problema

console.log('🔍 === DIAGNÓSTICO DO PROFILE-API ===');

// 1. Verificar se o profile-api.ts está sendo importado corretamente
try {
  // Tentar acessar a função updateUserProfile
  if (typeof updateUserProfile !== 'undefined') {
    console.log('✅ Função updateUserProfile encontrada globalmente');
  } else {
    console.log('❌ Função updateUserProfile NÃO encontrada globalmente');
    console.log('💡 Isso pode significar que você não está importando do arquivo correto');
  }
} catch (error) {
  console.log('❌ Erro ao verificar updateUserProfile:', error.message);
}

// 2. Verificar se há múltiplas versões da função
console.log('\n🔍 Verificando imports no código...');
console.log('📝 Certifique-se de que você tem APENAS esta importação:');
console.log('✅ import { updateUserProfile } from "./profile-api";');
console.log('\n❌ NÃO deve ter estas importações:');
console.log('❌ import { updateUserProfile } from "./profile-api-old";');
console.log('❌ import { updateProfile } from "./algum-outro-arquivo";');

// 3. Verificar localStorage para tokens
console.log('\n🔍 Verificando autenticação...');
const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('supabase.auth.token');
if (token) {
  console.log('✅ Token encontrado no localStorage');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('📧 Email do token:', payload.email);
    console.log('🆔 User ID:', payload.userId);
    console.log('🔗 Provider:', payload.app_metadata?.provider || 'não definido');
  } catch (e) {
    console.log('❌ Erro ao decodificar token:', e.message);
  }
} else {
  console.log('❌ Nenhum token encontrado no localStorage');
}

// 4. Verificar se há requisições sendo feitas
console.log('\n🔍 Monitorando requisições...');
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('profile-update')) {
    console.log('🌐 REQUISIÇÃO DETECTADA:', url);
    if (url.includes('/api/users/profile-update')) {
      console.log('❌ PROBLEMA: Usando endpoint de usuário NORMAL');
      console.log('💡 Deveria usar: /api/google-users/profile-update');
    } else if (url.includes('/api/google-users/profile-update')) {
      console.log('✅ CORRETO: Usando endpoint de usuário GOOGLE');
    }
  }
  return originalFetch.apply(this, args);
};

console.log('✅ Monitor de requisições ativado');
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Tente atualizar o perfil agora');
console.log('2. Observe as mensagens que aparecerão aqui');
console.log('3. Se aparecer "❌ PROBLEMA", você não está usando o profile-api.ts correto');
console.log('\n🔧 SOLUÇÃO:');
console.log('1. Verifique se você tem: import { updateUserProfile } from "./profile-api";');
console.log('2. Remova qualquer outra importação de updateUserProfile');
console.log('3. Limpe o cache do navegador (Ctrl+Shift+R)');
console.log('4. Tente novamente');

// 5. Função de teste manual
window.testarProfileAPI = async function() {
  console.log('\n🧪 === TESTE MANUAL DO PROFILE-API ===');
  
  try {
    // Dados de teste
    const profileData = {
      nome: 'Teste Usuario',
      cpf: '12345678901',
      telefone: '11999999999',
      data_nascimento: '1990-01-01'
    };
    
    const addressData = {
      nome_endereco: 'Endereço de Teste',
      cep: '01234567',
      logradouro: 'Rua de Teste',
      numero: '123',
      bairro: 'Bairro Teste',
      cidade: 'São Paulo',
      estado: 'SP'
    };
    
    console.log('📤 Testando com dados:', { profileData, addressData });
    
    // Tentar chamar a função
    if (typeof updateUserProfile === 'function') {
      console.log('✅ Função updateUserProfile encontrada, executando...');
      const result = await updateUserProfile(profileData, addressData);
      console.log('✅ Teste concluído com sucesso:', result);
    } else {
      console.log('❌ Função updateUserProfile não encontrada');
      console.log('💡 Certifique-se de importar: import { updateUserProfile } from "./profile-api";');
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
  }
};

console.log('\n🧪 Para testar manualmente, execute: testarProfileAPI()');
console.log('\n=== FIM DO DIAGNÓSTICO ===');