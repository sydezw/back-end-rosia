// TESTE DA CORREÇÃO DEFINITIVA - Execute no console do navegador
// Este script testa a função corrigida que força a detecção de usuário Google

console.log('🧪 INICIANDO TESTE DA CORREÇÃO DEFINITIVA');
console.log('=' .repeat(50));

// Função de teste que simula a correção definitiva
window.testarCorrecaoDefinitiva = async function() {
  console.log('🔍 Testando correção definitiva...');
  
  try {
    // Simular dados de teste
    const profileData = {
      nome: 'Eduardo Teste',
      cpf: '66941783877',
      telefone: '11948833721',
      data_nascimento: '2000-11-11'
    };
    
    const addressData = {
      nome_endereco: 'Endereço Principal',
      cep: '07175390',
      logradouro: 'Rua Santa Izabel do Pará',
      numero: '14',
      bairro: 'Jardim do Triunfo',
      cidade: 'Guarulhos',
      estado: 'SP'
    };
    
    console.log('📤 Dados de teste preparados:', { profileData, addressData });
    
    // Verificar se a função corrigida está disponível
    if (typeof updateUserProfileFixed === 'function') {
      console.log('✅ Função updateUserProfileFixed encontrada');
      
      // Executar teste
      const result = await updateUserProfileFixed(profileData, addressData);
      console.log('✅ Teste concluído com sucesso:', result);
      
    } else {
      console.log('❌ Função updateUserProfileFixed não encontrada');
      console.log('📋 Para usar a correção definitiva:');
      console.log('1. No ProfileSettings.tsx, substitua a importação:');
      console.log('   ANTES: import { updateUserProfile } from "./profile-api";');
      console.log('   DEPOIS: import { updateUserProfileFixed as updateUserProfile } from "./CORRECAO-DEFINITIVA-GOOGLE-USER";');
      console.log('2. Recarregue a página');
      console.log('3. Execute este teste novamente');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Verificar estado atual
console.log('🔍 VERIFICAÇÃO DO ESTADO ATUAL:');
console.log('=' .repeat(30));

// Verificar tokens
const tokenNormal = localStorage.getItem('supabase.auth.token');
const tokenGoogle = localStorage.getItem('google_access_token');

console.log('🔍 TOKENS DISPONÍVEIS:');
console.log('Token normal:', tokenNormal ? '✅ Presente' : '❌ Ausente');
console.log('Token Google:', tokenGoogle ? '✅ Presente' : '❌ Ausente');

// Verificar se há sessão ativa
if (typeof supabase !== 'undefined') {
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (user) {
      console.log('✅ Usuário autenticado:', user.email);
      
      // Verificar se é usuário Google conhecido
      const googleUsers = ['schoolts965@gmail.com'];
      const isGoogleUser = googleUsers.includes(user.email || '');
      
      console.log('🔍 Tipo de usuário detectado:', isGoogleUser ? 'Google' : 'Normal');
      console.log('🔍 Email:', user.email);
      
      if (isGoogleUser) {
        console.log('✅ Este usuário deve usar o endpoint Google');
        console.log('📍 Endpoint correto: /api/google-users/profile-update');
      } else {
        console.log('✅ Este usuário deve usar o endpoint normal');
        console.log('📍 Endpoint correto: /api/users/profile-update');
      }
      
    } else {
      console.log('❌ Nenhum usuário autenticado');
    }
  }).catch(error => {
    console.error('❌ Erro ao verificar usuário:', error);
  });
} else {
  console.log('❌ Supabase não disponível');
}

console.log('\n🧪 COMANDOS DISPONÍVEIS:');
console.log('- testarCorrecaoDefinitiva() - Testa a função corrigida');

console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Aplicar a correção definitiva no ProfileSettings.tsx');
console.log('2. Recarregar a página');
console.log('3. Executar testarCorrecaoDefinitiva()');
console.log('4. Tentar salvar o perfil novamente');

console.log('\n✅ Script de teste carregado. Execute testarCorrecaoDefinitiva() quando pronto.');