// CORREÇÃO PARA TRATAR USUÁRIOS INEXISTENTES NO FRONTEND
// Este script adiciona verificações e tratamento de erros quando usuários não existem

console.log('🔧 CORREÇÃO PARA USUÁRIOS INEXISTENTES NO FRONTEND');
console.log('====================================================\n');

// Função para verificar se o usuário atual existe no sistema
window.verificarUsuarioExiste = async function() {
  console.log('🔍 Verificando se o usuário atual existe no sistema...');
  
  try {
    // Obter token do localStorage
    const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    
    if (!token) {
      console.log('❌ Token não encontrado no localStorage');
      return { exists: false, reason: 'NO_TOKEN' };
    }
    
    console.log('✅ Token encontrado, verificando validade...');
    
    // Tentar fazer uma requisição simples para verificar se o usuário existe
    const response = await fetch('http://localhost:3030/api/google-users/debug-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('📥 Resposta do servidor:', result);
    
    if (result.success && result.tokenValid && result.user) {
      console.log('✅ Usuário existe e token é válido');
      return { 
        exists: true, 
        user: result.user,
        reason: 'VALID'
      };
    } else {
      console.log('❌ Usuário não existe ou token inválido');
      return { 
        exists: false, 
        reason: result.error || 'USER_NOT_FOUND',
        details: result
      };
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    return { 
      exists: false, 
      reason: 'NETWORK_ERROR',
      error: error.message
    };
  }
};

// Função para limpar dados de usuário inexistente
window.limparDadosUsuarioInexistente = function() {
  console.log('🧹 Limpando dados de usuário inexistente...');
  
  // Limpar tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  
  // Limpar dados de sessão
  localStorage.removeItem('user_data');
  localStorage.removeItem('user_profile');
  
  // Limpar cookies se existirem
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  
  console.log('✅ Dados limpos com sucesso');
};

// Função para redirecionar para login
window.redirecionarParaLogin = function() {
  console.log('🔄 Redirecionando para página de login...');
  
  // Verificar se estamos em desenvolvimento ou produção
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    // Em desenvolvimento, redirecionar para página de login local
    window.location.href = '/login';
  } else {
    // Em produção, redirecionar para página de login do site
    window.location.href = 'https://www.rosia.com.br/login';
  }
};

// Função principal para tratar usuário inexistente
window.tratarUsuarioInexistente = async function() {
  console.log('🚨 TRATANDO USUÁRIO INEXISTENTE');
  console.log('================================\n');
  
  try {
    // 1. Verificar se o usuário existe
    const verificacao = await window.verificarUsuarioExiste();
    
    if (verificacao.exists) {
      console.log('✅ Usuário existe, não é necessário tratamento');
      return { success: true, action: 'NO_ACTION_NEEDED' };
    }
    
    console.log('❌ Usuário não existe, iniciando tratamento...');
    
    // 2. Mostrar mensagem para o usuário
    const mensagem = `
      ⚠️ Sua sessão expirou ou sua conta não foi encontrada.
      
      Possíveis causas:
      • Sua conta foi removida do sistema
      • Sua sessão expirou
      • Houve um problema de sincronização
      
      Você será redirecionado para fazer login novamente.
    `;
    
    console.log(mensagem);
    
    // Se estivermos no navegador, mostrar alerta
    if (typeof alert !== 'undefined') {
      alert('Sua sessão expirou. Você será redirecionado para fazer login novamente.');
    }
    
    // 3. Limpar dados
    window.limparDadosUsuarioInexistente();
    
    // 4. Aguardar um pouco antes de redirecionar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Redirecionar para login
    window.redirecionarParaLogin();
    
    return { 
      success: true, 
      action: 'REDIRECTED_TO_LOGIN',
      reason: verificacao.reason
    };
    
  } catch (error) {
    console.error('❌ Erro ao tratar usuário inexistente:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
};

// Função para interceptar erros 401 e tratar automaticamente
window.interceptarErros401 = function() {
  console.log('🔧 Configurando interceptador de erros 401...');
  
  // Interceptar fetch global
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Se recebeu 401, verificar se é usuário inexistente
      if (response.status === 401) {
        console.log('🚨 Erro 401 detectado, verificando se usuário existe...');
        
        try {
          const errorData = await response.clone().json();
          
          // Se o erro é especificamente de usuário não encontrado
          if (errorData.code === 'USER_NOT_FOUND' || 
              errorData.message?.includes('Usuário não encontrado') ||
              errorData.message?.includes('não encontrado')) {
            
            console.log('🚨 Usuário não encontrado detectado, iniciando tratamento...');
            
            // Tratar usuário inexistente em background
            setTimeout(() => {
              window.tratarUsuarioInexistente();
            }, 1000);
          }
        } catch (parseError) {
          console.log('⚠️ Não foi possível analisar resposta 401:', parseError);
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
  };
  
  console.log('✅ Interceptador configurado com sucesso');
};

// Configurar interceptador automaticamente
window.interceptarErros401();

console.log('\n✅ CORREÇÃO CONFIGURADA COM SUCESSO!');
console.log('\n💡 FUNÇÕES DISPONÍVEIS:');
console.log('• window.verificarUsuarioExiste() - Verifica se usuário atual existe');
console.log('• window.tratarUsuarioInexistente() - Trata usuário inexistente');
console.log('• window.limparDadosUsuarioInexistente() - Limpa dados locais');
console.log('• window.redirecionarParaLogin() - Redireciona para login');
console.log('\n🔧 O interceptador de erros 401 está ativo automaticamente!');

// Testar a verificação imediatamente
console.log('\n🧪 TESTANDO VERIFICAÇÃO ATUAL...');
window.verificarUsuarioExiste().then(result => {
  console.log('📊 Resultado da verificação:', result);
  
  if (!result.exists) {
    console.log('⚠️ ATENÇÃO: Usuário atual não existe!');
    console.log('💡 Execute window.tratarUsuarioInexistente() para corrigir');
  }
}).catch(error => {
  console.error('❌ Erro no teste:', error);
});