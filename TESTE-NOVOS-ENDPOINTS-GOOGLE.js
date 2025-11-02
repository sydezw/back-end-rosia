const https = require('https');
const http = require('http');

// Configuração do teste
const BASE_URL = 'https://back-end-rosia02.vercel.app';
const TEST_TOKEN = 'seu-token-jwt-aqui'; // Substitua por um token válido para teste real

// Dados de teste
const DADOS_PESSOAIS_TESTE = {
  nome: 'João Silva Santos',
  email: 'joao.teste@gmail.com',
  cpf: '12345678901',
  telefone: '11999887766',
  data_nascimento: '1990-05-15'
};

const ENDERECO_TESTE = {
  cep: '01234-567',
  logradouro: 'Rua das Flores',
  numero: '123',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  complemento: 'Apartamento 45B'
};

// Função para fazer requisições HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Função para testar endpoint de dados pessoais
async function testarDadosPessoais() {
  console.log('\n🧪 TESTANDO ENDPOINT: /api/google-users/personal-data');
  console.log('📋 Dados enviados:', JSON.stringify(DADOS_PESSOAIS_TESTE, null, 2));
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/google-users/personal-data',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    const response = await makeRequest(options, DADOS_PESSOAIS_TESTE);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('📄 Resposta:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200) {
      console.log('✅ SUCESSO: Dados pessoais atualizados!');
      return true;
    } else if (response.statusCode === 401) {
      console.log('⚠️  AVISO: Token inválido ou não fornecido');
      return false;
    } else {
      console.log('❌ ERRO: Falha ao atualizar dados pessoais');
      return false;
    }
  } catch (error) {
    console.log('❌ ERRO DE CONEXÃO:', error.message);
    return false;
  }
}

// Função para testar endpoint de endereço
async function testarEndereco() {
  console.log('\n🧪 TESTANDO ENDPOINT: /api/google-users/address');
  console.log('📋 Dados enviados:', JSON.stringify(ENDERECO_TESTE, null, 2));
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/google-users/address',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    const response = await makeRequest(options, ENDERECO_TESTE);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('📄 Resposta:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200) {
      console.log('✅ SUCESSO: Endereço atualizado!');
      return true;
    } else if (response.statusCode === 401) {
      console.log('⚠️  AVISO: Token inválido ou não fornecido');
      return false;
    } else {
      console.log('❌ ERRO: Falha ao atualizar endereço');
      return false;
    }
  } catch (error) {
    console.log('❌ ERRO DE CONEXÃO:', error.message);
    return false;
  }
}

// Função para testar sem token (deve retornar 401)
async function testarSemToken() {
  console.log('\n🧪 TESTANDO SEM TOKEN (deve retornar 401)');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/google-users/personal-data',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
        // Sem Authorization header
      }
    };
    
    const response = await makeRequest(options, DADOS_PESSOAIS_TESTE);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('📄 Resposta:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 401) {
      console.log('✅ SUCESSO: Retornou 401 como esperado');
      return true;
    } else {
      console.log('❌ ERRO: Deveria retornar 401 sem token');
      return false;
    }
  } catch (error) {
    console.log('❌ ERRO DE CONEXÃO:', error.message);
    return false;
  }
}

// Função para testar campos obrigatórios
async function testarCamposObrigatorios() {
  console.log('\n🧪 TESTANDO CAMPOS OBRIGATÓRIOS (deve retornar 400)');
  
  const dadosIncompletos = {
    nome: 'João Silva',
    // email faltando
    cpf: '12345678901'
    // outros campos faltando
  };
  
  console.log('📋 Dados incompletos enviados:', JSON.stringify(dadosIncompletos, null, 2));
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/google-users/personal-data',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    const response = await makeRequest(options, dadosIncompletos);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log('📄 Resposta:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 400) {
      console.log('✅ SUCESSO: Retornou 400 para campos obrigatórios');
      return true;
    } else {
      console.log('❌ ERRO: Deveria retornar 400 para campos faltando');
      return false;
    }
  } catch (error) {
    console.log('❌ ERRO DE CONEXÃO:', error.message);
    return false;
  }
}

// Função para verificar se o servidor está rodando
async function verificarServidor() {
  console.log('🔍 VERIFICANDO SE O SERVIDOR ESTÁ RODANDO...');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/google-users/debug-token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode) {
      console.log('✅ SERVIDOR ESTÁ RODANDO na porta 3030');
      return true;
    }
  } catch (error) {
    console.log('❌ SERVIDOR NÃO ESTÁ RODANDO na porta 3030');
    console.log('💡 Execute: npm start');
    return false;
  }
}

// Função principal de teste
async function executarTestes() {
  console.log('🚀 INICIANDO TESTES DOS NOVOS ENDPOINTS GOOGLE');
  console.log('=' .repeat(60));
  
  // Verificar se servidor está rodando
  const servidorRodando = await verificarServidor();
  if (!servidorRodando) {
    console.log('\n❌ TESTES CANCELADOS: Servidor não está rodando');
    return;
  }
  
  let sucessos = 0;
  let total = 0;
  
  // Teste 1: Sem token
  total++;
  if (await testarSemToken()) sucessos++;
  
  // Teste 2: Campos obrigatórios
  total++;
  if (await testarCamposObrigatorios()) sucessos++;
  
  // Teste 3: Dados pessoais (precisa de token válido)
  total++;
  if (await testarDadosPessoais()) sucessos++;
  
  // Teste 4: Endereço (precisa de token válido)
  total++;
  if (await testarEndereco()) sucessos++;
  
  // Resumo
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log(`✅ Sucessos: ${sucessos}/${total}`);
  console.log(`❌ Falhas: ${total - sucessos}/${total}`);
  
  if (sucessos === total) {
    console.log('🎉 TODOS OS TESTES PASSARAM!');
  } else {
    console.log('⚠️  ALGUNS TESTES FALHARAM');
  }
  
  console.log('\n💡 DICAS:');
  console.log('- Para testar com token real, substitua TEST_TOKEN no início do arquivo');
  console.log('- Certifique-se de que o servidor está rodando: npm start');
  console.log('- Verifique se as tabelas google_user_profiles e google_user_addresses existem');
  console.log('- Para teste completo, use um token JWT válido de usuário Google');
}

// Executar testes
executarTestes().catch(console.error);

