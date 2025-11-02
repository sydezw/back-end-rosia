// SOLUÇÃO DEFINITIVA PARA CONSOLE - SEM ERROS DE SINTAXE
// Cole EXATAMENTE como está abaixo no console:

(async function() {
  console.log('🔧 Iniciando correção do token Google...');
  
  try {
    const tokenAtual = localStorage.getItem('auth_token');
    if (!tokenAtual) {
      console.error('❌ Token não encontrado');
      return;
    }
    
    const payload = JSON.parse(atob(tokenAtual.split('.')[1]));
    const dadosUsuario = {
      email: payload.email,
      sub: payload.googleId || payload.userId,
      name: payload.name || 'Usuário Google'
    };
    
    console.log('✅ Dados extraídos:', dadosUsuario.email);
    
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
      console.log('✅ Novo token salvo com sucesso!');
      
      // Teste imediato
      const teste = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
        headers: {
          'Authorization': `Bearer ${resultado.token}`
        }
      });
      
      if (teste.ok) {
        console.log('🎉 SUCESSO TOTAL! Erro 401 resolvido definitivamente!');
        console.log('✅ Token agora funciona perfeitamente!');
      } else {
        console.error('❌ Ainda há problemas com o token');
      }
    } else {
      console.error('❌ Token não retornado pelo servidor');
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error.message);
  }
})();

// INSTRUÇÕES:
// 1. Abra o Console do navegador (F12)
// 2. Cole TODO o código acima
// 3. Pressione Enter
// 4. Aguarde a mensagem de sucesso
// 5. O erro 401 estará resolvido!

