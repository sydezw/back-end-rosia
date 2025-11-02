// COMANDO ÚNICO - Cole esta linha COMPLETA no console e pressione Enter:

window.corrigirTokenGoogleAgora = async function() { console.log('🔧 Iniciando correção...'); try { const tokenAtual = localStorage.getItem('auth_token'); if (!tokenAtual) { console.error('❌ Token não encontrado'); return; } const payload = JSON.parse(atob(tokenAtual.split('.')[1])); const dadosUsuario = { email: payload.email, sub: payload.googleId || payload.userId, name: payload.name || 'Usuário Google' }; console.log('✅ Dados:', dadosUsuario.email); const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: dadosUsuario.email, sub: dadosUsuario.sub, name: dadosUsuario.name, email_verified: true }) }); if (!response.ok) { console.error('❌ Erro:', response.status); return; } const resultado = await response.json(); if (resultado.token) { localStorage.setItem('auth_token', resultado.token); console.log('✅ Token salvo!'); const teste = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', { headers: { 'Authorization': `Bearer ${resultado.token}` } }); if (teste.ok) { console.log('🎉 SUCESSO! Erro 401 resolvido!'); } else { console.error('❌ Ainda com erro'); } } } catch (error) { console.error('❌ Erro:', error.message); } }; console.log('✅ Função criada! Execute: corrigirTokenGoogleAgora()');

// INSTRUÇÕES SIMPLES:
// 1. Copie a linha gigante acima (começando com "window.corrigirTokenGoogleAgora")
// 2. Cole no console do navegador
// 3. Pressione Enter
// 4. Execute: corrigirTokenGoogleAgora()

// VERSÃO ALTERNATIVA - Se a linha única não funcionar, use este bloco:
/*
(async function() {
  console.log('🔧 Correção automática iniciada...');
  
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
    headers: { 'Content-Type': 'application/json' },
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
    
    const teste = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
      headers: { 'Authorization': `Bearer ${resultado.token}` }
    });
    
    if (teste.ok) {
      console.log('🎉 SUCESSO TOTAL! Erro 401 resolvido!');
    } else {
      console.error('❌ Token ainda com problema');
    }
  }
})();
*/

