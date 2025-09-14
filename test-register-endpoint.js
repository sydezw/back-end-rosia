// Script para testar o endpoint de registro
// Execute: node test-register-endpoint.js

const fetch = require('node-fetch');

async function testRegisterEndpoint() {
  const userData = {
    name: "Teste Usuario",
    email: "teste@example.com",
    password: "123456",
    cpf: "12345678901",
    phone: "11987654321",
    birth_date: "1990-01-01"
  };

  try {
    console.log('Testando endpoint de registro...');
    console.log('Dados:', JSON.stringify(userData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/auth/register-jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Endpoint funcionando corretamente!');
    } else {
      console.log('❌ Erro no endpoint');
    }
  } catch (error) {
    console.error('Erro na requisição:', error.message);
  }
}

testRegisterEndpoint();