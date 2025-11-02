// Teste do fluxo simplificado de autenticação Google
// Este script testa se o middleware carrega os dados corretamente

const fetch = require('node-fetch');

async function testarFluxoSimplificado() {
    console.log('🧪 Iniciando teste do fluxo simplificado...');
    
    try {
        // 1. Primeiro, fazer login para obter o token
        console.log('\n1️⃣ Fazendo login Google...');
        const loginResponse = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'schoolts965@gmail.com',
                name: 'Eduardo',
                sub: '108470775322756618187',
                picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('📋 Resposta do login:', {
            status: loginResponse.status,
            success: loginData.success,
            hasToken: !!loginData.token,
            hasUser: !!loginData.user
        });
        
        if (!loginData.success || !loginData.token) {
            console.error('❌ Falha no login:', loginData);
            return;
        }
        
        const token = loginData.token;
        console.log('✅ Token obtido:', token.substring(0, 50) + '...');
        
        // 2. Testar o endpoint /profile com o token
        console.log('\n2️⃣ Testando endpoint /profile...');
        const profileResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const profileData = await profileResponse.json();
        console.log('📋 Resposta do profile:', {
            status: profileResponse.status,
            success: profileData.success,
            hasData: !!profileData.data,
            hasProfile: !!profileData.data?.profile,
            hasAddress: !!profileData.data?.address
        });
        
        if (profileResponse.status === 200 && profileData.success) {
            console.log('✅ Fluxo simplificado funcionando!');
            console.log('👤 Dados do usuário:', {
                id: profileData.data.profile.id,
                email: profileData.data.profile.email,
                nome: profileData.data.profile.nome,
                google_id: profileData.data.profile.google_id,
                hasAddress: !!profileData.data.address
            });
        } else {
            console.error('❌ Erro no profile:', profileData);
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

// Executar o teste
testarFluxoSimplificado();

