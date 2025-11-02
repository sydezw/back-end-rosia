// CORREÇÃO FINAL PARA ERROS 401 DE USUÁRIOS INEXISTENTES NO FRONTEND
// Este arquivo contém a solução completa para tratar usuários que não existem mais no sistema

/**
 * PROBLEMA IDENTIFICADO:
 * - Usuário com ID 2c1f4048-b751-4493-a62d-0090fde82e53 não existe no Auth do Supabase
 * - Frontend ainda possui token/sessão local deste usuário inexistente
 * - Quando tenta fazer requisições, recebe 401 com mensagem "Usuário não encontrado"
 * 
 * SOLUÇÃO IMPLEMENTADA:
 * 1. Middleware backend melhorado com mensagens claras e códigos específicos
 * 2. Frontend deve interceptar erros 401 e limpar dados locais
 * 3. Redirecionamento automático para login quando usuário não existe
 */

// ============================================================================
// 1. INTERCEPTADOR DE ERROS PARA O FRONTEND (endpoint-interceptor.ts)
// ============================================================================

const FRONTEND_ERROR_INTERCEPTOR = `
// Adicionar ao endpoint-interceptor.ts

// Função para limpar dados de usuário inexistente
function clearInvalidUserData() {
  console.log('🧹 Limpando dados de usuário inexistente...');
  
  // Limpar localStorage
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('user');
  localStorage.removeItem('userProfile');
  localStorage.removeItem('authToken');
  
  // Limpar sessionStorage
  sessionStorage.removeItem('supabase.auth.token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('userProfile');
  
  // Limpar cookies se houver
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('✅ Dados locais limpos');
}

// Função para redirecionar para login
function redirectToLogin(reason = 'Sessão expirada') {
  console.log('🔄 Redirecionando para login:', reason);
  
  // Mostrar notificação ao usuário
  if (typeof window !== 'undefined' && window.alert) {
    alert(\`Sua sessão expirou ou sua conta não foi encontrada. Você será redirecionado para o login.\\n\\nMotivo: \${reason}\`);
  }
  
  // Redirecionar para página de login
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

// Interceptador melhorado para erros 401
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    const response = await originalFetch.apply(this, args);
    
    // Interceptar erros 401
    if (response.status === 401) {
      const responseData = await response.clone().json().catch(() => ({}));
      
      console.log('🚨 Erro 401 interceptado:', responseData);
      
      // Verificar se é erro de usuário não encontrado
      if (responseData.code === 'USER_NOT_FOUND' || 
          responseData.message?.includes('Usuário não encontrado') ||
          responseData.message?.includes('não foi encontrado')) {
        
        console.log('❌ Usuário não encontrado - limpando dados e redirecionando');
        
        clearInvalidUserData();
        redirectToLogin(responseData.message || 'Usuário não encontrado');
        
        return response;
      }
      
      // Verificar se é erro de token expirado
      if (responseData.code === 'INVALID_GOOGLE_TOKEN_TYPE' ||
          responseData.message?.includes('Token inválido') ||
          responseData.message?.includes('sessão expirada')) {
        
        console.log('🔑 Token inválido - limpando dados e redirecionando');
        
        clearInvalidUserData();
        redirectToLogin(responseData.message || 'Token inválido');
        
        return response;
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Erro no interceptador:', error);
    throw error;
  }
};

console.log('✅ Interceptador de erros 401 ativado');
`;

// ============================================================================
// 2. MELHORIAS PARA google-user-profile-api.ts
// ============================================================================

const FRONTEND_API_IMPROVEMENTS = `
// Melhorias para google-user-profile-api.ts

// Função para verificar se usuário existe antes de fazer requisições
async function checkUserExists() {
  try {
    const response = await fetch('/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${getAuthToken()}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      const errorData = await response.json();
      
      if (errorData.code === 'USER_NOT_FOUND') {
        console.log('❌ Usuário não existe mais no sistema');
        return false;
      }
    }
    
    return response.ok;
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    return false;
  }
}

// Função melhorada para updateUserProfile
export async function updateUserProfile(profileData) {
  console.log('🔄 Iniciando atualização de perfil...');
  
  try {
    // Verificar se usuário existe antes de tentar atualizar
    const userExists = await checkUserExists();
    
    if (!userExists) {
      console.log('❌ Usuário não existe - não é possível atualizar perfil');
      throw new Error('Usuário não encontrado no sistema. Faça login novamente.');
    }
    
    // Continuar com a atualização normal...
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Tratar resposta...
    if (!response.ok) {
      const errorData = await response.json();
      
      // Se ainda assim receber 401, limpar dados
      if (response.status === 401 && errorData.code === 'USER_NOT_FOUND') {
        clearInvalidUserData();
        redirectToLogin(errorData.message);
      }
      
      throw new Error(\`HTTP \${response.status}: \${JSON.stringify(errorData)}\`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    throw error;
  }
}
`;

// ============================================================================
// 3. VERIFICAÇÃO INICIAL NO APP
// ============================================================================

const APP_INITIALIZATION = `
// Adicionar ao App.tsx ou componente principal

// Função para verificar integridade do usuário na inicialização
async function checkUserIntegrity() {
  console.log('🔍 Verificando integridade do usuário...');
  
  const token = localStorage.getItem('supabase.auth.token') || 
                sessionStorage.getItem('supabase.auth.token');
  
  if (!token) {
    console.log('✅ Nenhum token encontrado - usuário não logado');
    return true;
  }
  
  try {
    // Tentar fazer uma requisição simples para verificar se o usuário existe
    const response = await fetch('/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      const errorData = await response.json();
      
      if (errorData.code === 'USER_NOT_FOUND') {
        console.log('❌ Usuário não existe mais - limpando dados');
        clearInvalidUserData();
        return false;
      }
    }
    
    if (response.ok) {
      console.log('✅ Usuário válido');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação de integridade:', error);
  }
  
  return false;
}

// Chamar na inicialização do app
useEffect(() => {
  checkUserIntegrity().then(isValid => {
    if (!isValid) {
      // Redirecionar para login se usuário inválido
      navigate('/login');
    }
  });
}, []);
`;

// ============================================================================
// 4. INSTRUÇÕES DE IMPLEMENTAÇÃO
// ============================================================================

console.log('📋 CORREÇÃO FINAL PARA ERROS 401 DE USUÁRIOS INEXISTENTES');
console.log('===========================================================\n');

console.log('🔧 IMPLEMENTAÇÃO NECESSÁRIA NO FRONTEND:\n');

console.log('1️⃣ ENDPOINT INTERCEPTOR:');
console.log('   - Adicionar interceptador de fetch para capturar erros 401');
console.log('   - Limpar dados locais quando usuário não encontrado');
console.log('   - Redirecionar automaticamente para login\n');

console.log('2️⃣ API FUNCTIONS:');
console.log('   - Verificar existência do usuário antes de operações');
console.log('   - Tratar erros 401 de forma elegante');
console.log('   - Fornecer feedback claro ao usuário\n');

console.log('3️⃣ APP INITIALIZATION:');
console.log('   - Verificar integridade do usuário na inicialização');
console.log('   - Limpar dados inválidos automaticamente');
console.log('   - Prevenir erros futuros\n');

console.log('✅ BACKEND JÁ CORRIGIDO:');
console.log('   - Middleware melhorado com mensagens claras');
console.log('   - Códigos de erro específicos');
console.log('   - Tentativa de criação automática de perfil');
console.log('   - Sugestões de ação para o frontend\n');

console.log('🎯 RESULTADO ESPERADO:');
console.log('   - Usuários inexistentes são detectados automaticamente');
console.log('   - Dados locais são limpos automaticamente');
console.log('   - Redirecionamento suave para login');
console.log('   - Experiência do usuário melhorada');
console.log('   - Fim dos erros 401 inesperados\n');

console.log('💡 PRÓXIMOS PASSOS:');
console.log('   1. Implementar o interceptador no endpoint-interceptor.ts');
console.log('   2. Atualizar google-user-profile-api.ts com verificações');
console.log('   3. Adicionar verificação de integridade no App.tsx');
console.log('   4. Testar com usuário problemático');
console.log('   5. Verificar se redirecionamento funciona corretamente\n');

module.exports = {
  FRONTEND_ERROR_INTERCEPTOR,
  FRONTEND_API_IMPROVEMENTS,
  APP_INITIALIZATION
};

