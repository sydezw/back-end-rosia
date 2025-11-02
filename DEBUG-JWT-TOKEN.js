const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function debugJWTToken() {
  console.log('🔍 DEBUG: Testando geração e decodificação de JWT Token\n');
  
  try {
    // 1. Fazer login para obter token
    console.log('1. Fazendo login Google...');
    const loginResponse = await fetch('https://back-end-rosia02.vercel.app/api/auth/login/google-separated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'schoolts965@gmail.com',
        name: 'Test User',
        sub: '123456789',
        picture: 'https://example.com/photo.jpg'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login Response:', {
      success: loginData.success,
      hasToken: !!loginData.token,
      tokenLength: loginData.token?.length
    });
    
    if (!loginData.success || !loginData.token) {
      console.error('❌ Login falhou:', loginData);
      return;
    }
    
    const token = loginData.token;
    
    // 2. Decodificar token sem verificar assinatura
    console.log('\n2. Decodificando token (sem verificar assinatura)...');
    const decodedUnsafe = jwt.decode(token);
    console.log('Token decodificado:', JSON.stringify(decodedUnsafe, null, 2));
    
    // 3. Verificar token com JWT_SECRET
    console.log('\n3. Verificando token com JWT_SECRET...');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verificado com sucesso:', {
        googleUserId: decoded.googleUserId,
        googleId: decoded.googleId,
        email: decoded.email,
        provider: decoded.provider,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (verifyError) {
      console.error('❌ Erro ao verificar token:', verifyError.message);
    }
    
    // 4. Testar endpoint /profile com o token
    console.log('\n4. Testando endpoint /profile...');
    const profileResponse = await fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('Profile Response Status:', profileResponse.status);
    console.log('Profile Response:', JSON.stringify(profileData, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  }
}

// Executar debug
debugJWTToken();

