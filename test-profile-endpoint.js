require('dotenv').config();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

(async () => {
  console.log('🧪 TESTE DO ENDPOINT /api/google-users/profile');
  
  // Simular um token JWT como o que seria gerado no login
  const userId = '270139ae-71dc-4547-8775-bb073f0bd1a4';
  const googleId = '113424915539878152126';
  const email = 'rosita933751@gmail.com';
  
  // Criar token JWT local (como o gerado no login)
  const tokenPayload = {
    googleUserId: userId,
    googleId: googleId,
    email: email,
    provider: 'google-separated'
  };
  
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
  
  console.log('🔑 Token gerado:', token.substring(0, 50) + '...');
  console.log('📦 Payload do token:', tokenPayload);
  
  try {
    // Testar o endpoint
    const response = await fetch('http://localhost:3030/api/google-users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📊 RESULTADO DO TESTE:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ DADOS RETORNADOS:');
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('Resposta não é JSON válido');
      }
    } else {
      console.log('\n❌ ERRO NA REQUISIÇÃO');
    }
    
  } catch (error) {
    console.error('❌ Erro ao fazer requisição:', error.message);
  }
  
})().catch(console.error);