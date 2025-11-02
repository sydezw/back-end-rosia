// CORREÇÃO DEFINITIVA: Modificar auth-api.ts para detectar Google por email
// Esta correção resolve o problema de detecção de usuário Google

console.log('🔧 CORREÇÃO DEFINITIVA: Auth API Google Detection');
console.log('=' .repeat(60));

// Função para aplicar a correção no auth-api.ts
window.aplicarCorrecaoAuthApi = function() {
  console.log('📋 INSTRUÇÕES PARA CORREÇÃO DEFINITIVA:');
  console.log('-' .repeat(50));
  
  console.log('\n1️⃣ MODIFICAR FUNÇÃO isGoogleUserToken no auth-api.ts:');
  console.log('\n   SUBSTITUIR esta função:');
  console.log(`
   const isGoogleUserToken = (): boolean => {
     try {
       const token = localStorage.getItem('auth_token');
       if (!token) return false;
       
       const tokenParts = token.split('.');
       if (tokenParts.length === 3) {
         const payload = JSON.parse(atob(tokenParts[1]));
         return payload.provider === 'google-separated';
       }
     } catch (error) {
       console.log('⚠️ Erro ao verificar tipo de token:', error);
     }
     return false;
   };`);
   
   console.log('\n   POR esta função corrigida:');
   console.log(`
   const isGoogleUserToken = (): boolean => {
     try {
       const token = localStorage.getItem('auth_token');
       if (!token) return false;
       
       const tokenParts = token.split('.');
       if (tokenParts.length === 3) {
         const payload = JSON.parse(atob(tokenParts[1]));
         
         // Detectar por provider ou por email do Google
         const isGoogleProvider = payload.provider === 'google-separated' || payload.provider === 'google';
         const isGoogleEmail = payload.email && payload.email.includes('@gmail.com');
         
         console.log('🔍 Detecção Google:', {
           provider: payload.provider,
           email: payload.email,
           isGoogleProvider,
           isGoogleEmail,
           resultado: isGoogleProvider || isGoogleEmail
         });
         
         return isGoogleProvider || isGoogleEmail;
       }
     } catch (error) {
       console.log('⚠️ Erro ao verificar tipo de token:', error);
     }
     return false;
   };`);
   
   console.log('\n2️⃣ ADICIONAR FUNÇÃO DE AUTO-CORREÇÃO:');
   console.log('\n   ADICIONAR após a função isGoogleUserToken:');
   console.log(`
   // Função para corrigir token Google automaticamente
   const autoCorrigirTokenGoogle = async (): Promise<boolean> => {
     try {
       const token = localStorage.getItem('auth_token');
       if (!token) return false;
       
       const tokenParts = token.split('.');
       if (tokenParts.length === 3) {
         const payload = JSON.parse(atob(tokenParts[1]));
         
         // Se é Google mas não tem provider correto, corrigir
         if ((payload.provider === 'google' || payload.email?.includes('@gmail.com')) && 
             payload.provider !== 'google-separated') {
           
           console.log('🔄 Auto-corrigindo token Google...');
           
           // Obter sessão Supabase
           const { data: { session } } = await supabase.auth.getSession();
           
           if (session?.access_token) {
             const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ google_token: session.access_token })
             });
             
             if (response.ok) {
               const result = await response.json();
               if (result.token) {
                 localStorage.setItem('auth_token', result.token);
                 console.log('✅ Token Google corrigido automaticamente');
                 return true;
               }
             }
           }
         }
       }
     } catch (error) {
       console.log('⚠️ Erro na auto-correção:', error);
     }
     return false;
   };`);
   
   console.log('\n3️⃣ MODIFICAR FUNÇÃO getProfile:');
   console.log('\n   SUBSTITUIR o início da função getProfile por:');
   console.log(`
   export const getProfile = async (): Promise<User> => {
     console.log('🔍 getProfile - Buscando perfil do usuário');
     
     try {
       // Auto-corrigir token se necessário
       await autoCorrigirTokenGoogle();
       
       // Detectar se é usuário Google e usar endpoint apropriado
       const isGoogleUser = isGoogleUserToken();
       const endpoint = isGoogleUser ? '/google-users/profile' : '/profile';
       
       console.log('🔍 getProfile - Tipo de usuário:', isGoogleUser ? 'Google' : 'Normal');
       console.log('🔍 getProfile - Usando endpoint:', endpoint);`);
       
   console.log('\n4️⃣ SALVAR E RECARREGAR:');
   console.log('   - Salve o arquivo auth-api.ts');
   console.log('   - Recarregue a página');
   console.log('   - Tente salvar o perfil novamente');
};

// Função para verificar se a correção foi aplicada
window.verificarCorrecaoAplicada = function() {
  console.log('🔍 VERIFICANDO SE CORREÇÃO FOI APLICADA');
  console.log('-' .repeat(40));
  
  // Verificar se as funções existem no escopo global
  if (typeof isGoogleUserToken !== 'undefined') {
    console.log('✅ Função isGoogleUserToken encontrada');
    
    // Testar detecção
    try {
      const resultado = isGoogleUserToken();
      console.log('🔍 Resultado da detecção:', resultado);
    } catch (error) {
      console.log('❌ Erro ao testar detecção:', error);
    }
  } else {
    console.log('❌ Função isGoogleUserToken não encontrada');
    console.log('📋 A correção ainda não foi aplicada');
  }
};

// Função para testar correção temporária
window.testeCorrecaoTemporaria = async function() {
  console.log('🧪 TESTE: Correção Temporária');
  console.log('-' .repeat(30));
  
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ Token não encontrado');
      return;
    }
    
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      
      console.log('🔍 Payload atual:', {
        provider: payload.provider,
        email: payload.email
      });
      
      // Detectar se é Google
      const isGoogleProvider = payload.provider === 'google-separated' || payload.provider === 'google';
      const isGoogleEmail = payload.email && payload.email.includes('@gmail.com');
      const isGoogle = isGoogleProvider || isGoogleEmail;
      
      console.log('🎯 Detecção:', {
        isGoogleProvider,
        isGoogleEmail,
        isGoogle
      });
      
      if (isGoogle && payload.provider !== 'google-separated') {
        console.log('🔄 Necessário corrigir token...');
        
        // Tentar correção
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          const response = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_token: session.access_token })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.token) {
              localStorage.setItem('auth_token', result.token);
              console.log('✅ Token corrigido temporariamente');
              console.log('📋 Agora tente salvar o perfil');
            }
          } else {
            console.error('❌ Erro na correção:', await response.json());
          }
        }
      } else if (isGoogle && payload.provider === 'google-separated') {
        console.log('✅ Token já está correto');
      }
    }
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

// Executar verificação inicial
console.log('🚀 Executando verificação inicial...');
verificarCorrecaoAplicada();

console.log('\n📋 COMANDOS DISPONÍVEIS:');
console.log('- aplicarCorrecaoAuthApi() - Ver instruções para correção definitiva');
console.log('- verificarCorrecaoAplicada() - Verificar se correção foi aplicada');
console.log('- testeCorrecaoTemporaria() - Aplicar correção temporária (teste)');

console.log('\n🎯 SOLUÇÕES:');
console.log('1. TEMPORÁRIA: Execute testeCorrecaoTemporaria()');
console.log('2. DEFINITIVA: Execute aplicarCorrecaoAuthApi() e siga as instruções');

