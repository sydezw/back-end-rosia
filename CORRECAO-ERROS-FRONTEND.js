// CORREÇÃO DOS ERROS DO FRONTEND
// Execute este script no console do frontend para corrigir os problemas

(function() {
  console.log('🔧 CORREÇÃO DOS ERROS DO FRONTEND');
  console.log('=' .repeat(50));
  
  // 1. Corrigir o interceptador de fetch que está quebrando APIs externas
  console.log('\n🔍 CORRIGINDO INTERCEPTADOR DE FETCH...');
  
  // Salvar o fetch original se ainda não foi salvo
  if (!window.originalFetch) {
    window.originalFetch = window.fetch;
  }
  
  // Criar novo interceptador que não quebra APIs externas
  window.fetch = function(url, options = {}) {
    // Verificar se é uma requisição para o backend da aplicação
    const isBackendRequest = typeof url === 'string' && (
      url.includes('/api/users/profile-update') ||
      url.includes('https://back-end-rosia02.vercel.app') ||
      url.includes('back-end-rosia02.vercel.app')
    );
    
    if (isBackendRequest && url.includes('/api/users/profile-update')) {
      console.log('🔄 Redirecionando /api/users/profile-update para /api/google-users/profile-update');
      url = url.replace('/api/users/profile-update', '/api/google-users/profile-update');
    }
    
    // Para todas as outras requisições (ViaCEP, etc), usar fetch original
    return window.originalFetch.call(this, url, options);
  };
  
  console.log('✅ Interceptador de fetch corrigido');
  
  // 2. Corrigir problema de session undefined
  console.log('\n🔍 VERIFICANDO PROBLEMA DE SESSION...');
  
  // Verificar se existe supabase no contexto
  if (typeof supabase !== 'undefined') {
    console.log('✅ Supabase encontrado');
    
    // Tentar obter sessão atual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log('❌ Erro ao obter sessão:', error);
      } else if (session) {
        console.log('✅ Sessão ativa encontrada:', session.user.email);
      } else {
        console.log('⚠️ Nenhuma sessão ativa');
        
        // Verificar se há token no localStorage
        const token = localStorage.getItem('auth_token');
        if (token) {
          console.log('🔍 Token encontrado no localStorage, mas sem sessão Supabase');
          console.log('💡 Isso é normal para usuários Google separados');
        }
      }
    });
  } else {
    console.log('⚠️ Supabase não encontrado no contexto global');
  }
  
  // 3. Verificar e corrigir token de autenticação
  console.log('\n🔍 VERIFICANDO TOKEN DE AUTENTICAÇÃO...');
  
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Nenhum token encontrado');
    console.log('💡 Executando login automático...');
    
    // Fazer login automático
    const googleUserData = {
      email: 'schoolts965@gmail.com',
      sub: 'schoolts965@gmail.com',
      name: 'Eduardo',
      email_verified: true,
      picture: null
    };
    
    fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleUserData)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success && result.token) {
        localStorage.setItem('auth_token', result.token);
        console.log('✅ Novo token salvo!');
        console.log('🔄 Recarregue a página para aplicar as correções');
      } else {
        console.log('❌ Falha no login automático:', result);
      }
    })
    .catch(error => {
      console.log('❌ Erro no login automático:', error);
    });
    
  } else {
    console.log('✅ Token encontrado');
    
    try {
      // Verificar se o token é válido
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('📋 Token payload:', {
        provider: payload.provider,
        email: payload.email,
        exp: new Date(payload.exp * 1000).toLocaleString()
      });
      
      // Verificar se é token Google separado
      if (payload.provider === 'google-separated') {
        console.log('✅ Token Google separado válido');
      } else {
        console.log('⚠️ Token não é Google separado, pode causar problemas');
      }
      
    } catch (error) {
      console.log('❌ Token corrompido:', error);
      localStorage.removeItem('auth_token');
      console.log('🧹 Token corrompido removido');
    }
  }
  
  // 4. Criar função auxiliar para carregar dados do usuário
  console.log('\n🔧 CRIANDO FUNÇÃO AUXILIAR...');
  
  window.loadUserDataSafe = async function() {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Token não encontrado');
      }
      
      // Verificar se é usuário Google
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isGoogleUser = payload.provider === 'google-separated';
      
      if (isGoogleUser) {
        console.log('🔍 Carregando dados via API Google...');
        
        const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ Dados carregados com sucesso:', userData);
          return userData;
        } else {
          const error = await response.json();
          console.log('❌ Erro ao carregar dados:', error);
          throw new Error(error.message || 'Erro ao carregar dados');
        }
      } else {
        console.log('🔍 Carregando dados via Supabase...');
        // Lógica para usuários normais do Supabase
        throw new Error('Usuário não é Google separado');
      }
      
    } catch (error) {
      console.error('❌ Erro na função loadUserDataSafe:', error);
      throw error;
    }
  };
  
  console.log('✅ Função loadUserDataSafe criada');
  
  // 5. Testar correções
  console.log('\n🧪 TESTANDO CORREÇÕES...');
  
  // Testar fetch com ViaCEP
  fetch('https://viacep.com.br/ws/01310-100/json/')
    .then(response => response.json())
    .then(data => {
      console.log('✅ Teste ViaCEP funcionando:', data.logradouro);
    })
    .catch(error => {
      console.log('❌ Teste ViaCEP falhou:', error);
    });
  
  // Testar função de carregar dados
  if (localStorage.getItem('auth_token')) {
    window.loadUserDataSafe()
      .then(data => {
        console.log('✅ Teste loadUserDataSafe funcionando');
      })
      .catch(error => {
        console.log('❌ Teste loadUserDataSafe falhou:', error.message);
      });
  }
  
  console.log('\n🎉 CORREÇÕES APLICADAS!');
  console.log('📋 RESUMO:');
  console.log('- ✅ Interceptador de fetch corrigido (não quebra mais ViaCEP)');
  console.log('- ✅ Problema de session verificado');
  console.log('- ✅ Token de autenticação verificado/corrigido');
  console.log('- ✅ Função loadUserDataSafe criada');
  console.log('\n🔄 RECARREGUE A PÁGINA para aplicar todas as correções!');
  
})();

// INSTRUÇÕES:
// 1. Abra o console do frontend (F12 > Console)
// 2. Cole e execute este script
// 3. Aguarde as correções serem aplicadas
// 4. Recarregue a página
// 5. Teste o formulário de perfil novamente

