// SOLUÇÃO PARA QUANDO NÃO HÁ TOKEN NO LOCALSTORAGE
// Cole este código no console:

(async function() {
  console.log('🔧 Verificando situação do usuário...');
  
  try {
    // Primeiro, verifica se há token no localStorage
    let tokenAtual = localStorage.getItem('auth_token');
    let dadosUsuario = null;
    
    if (tokenAtual) {
      console.log('✅ Token encontrado no localStorage');
      const payload = JSON.parse(atob(tokenAtual.split('.')[1]));
      dadosUsuario = {
        email: payload.email,
        sub: payload.googleId || payload.userId,
        name: payload.name || 'Usuário Google'
      };
    } else {
      console.log('⚠️ Token não encontrado no localStorage');
      
      // Verifica se há sessão do Supabase
      const supabaseSession = localStorage.getItem('sb-localhost-auth-token');
      if (supabaseSession) {
        console.log('✅ Sessão Supabase encontrada');
        const sessionData = JSON.parse(supabaseSession);
        if (sessionData.user) {
          dadosUsuario = {
            email: sessionData.user.email,
            sub: sessionData.user.id,
            name: sessionData.user.user_metadata?.full_name || sessionData.user.email.split('@')[0]
          };
          console.log('✅ Dados extraídos do Supabase:', dadosUsuario.email);
        }
      }
      
      // Se ainda não tem dados, solicita inserção manual
      if (!dadosUsuario) {
        console.log('❌ Nenhuma sessão encontrada.');
        console.log('📝 Para corrigir manualmente, execute:');
        console.log('window.corrigirComDados("seu-email@gmail.com", "seu-google-id", "Seu Nome");');
        
        // Cria função para correção manual
        window.corrigirComDados = async function(email, googleId, nome) {
          console.log('🔧 Corrigindo com dados fornecidos...');
          
          const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email,
              sub: googleId,
              name: nome,
              email_verified: true
            })
          });
          
          if (!response.ok) {
            console.error('❌ Erro na requisição:', response.status);
            return;
          }
          
          const resultado = await response.json();
          
          if (resultado.token) {
            localStorage.setItem('auth_token', resultado.token);
            console.log('✅ Token salvo com sucesso!');
            
            // Teste imediato
            const teste = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
              headers: {
                'Authorization': `Bearer ${resultado.token}`
              }
            });
            
            if (teste.ok) {
              console.log('🎉 SUCESSO! Erro 401 resolvido!');
            } else {
              console.error('❌ Ainda com erro');
            }
          }
        };
        
        return;
      }
    }
    
    // Se chegou até aqui, tem dados para processar
    if (dadosUsuario) {
      console.log('✅ Processando dados:', dadosUsuario.email);
      
      const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: dadosUsuario.email,
          sub: dadosUsuario.sub,
          name: dadosUsuario.name,
          email_verified: true
        })
      });
      
      if (!response.ok) {
        console.error('❌ Erro na requisição:', response.status);
        return;
      }
      
      const resultado = await response.json();
      
      if (resultado.token) {
        localStorage.setItem('auth_token', resultado.token);
        console.log('✅ Novo token salvo!');
        
        // Teste imediato
        const teste = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
          headers: {
            'Authorization': `Bearer ${resultado.token}`
          }
        });
        
        if (teste.ok) {
          console.log('🎉 SUCESSO TOTAL! Erro 401 resolvido!');
        } else {
          console.error('❌ Ainda há problemas');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();

// INSTRUÇÕES:
// 1. Cole este código no console
// 2. Se não encontrar dados, use: corrigirComDados("email", "google-id", "nome")
// 3. Substitua pelos seus dados reais do Google

