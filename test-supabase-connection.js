require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('=== TESTE DE CONEXÃO SUPABASE ===');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'NÃO CONFIGURADO');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'NÃO CONFIGURADO');

// Teste 1: Cliente público
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Teste 2: Cliente admin
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('\n=== TESTE 1: Verificar conexão básica ===');
    const { data, error } = await supabase.from('auth.users').select('count').limit(1);
    console.log('Conexão básica:', error ? 'FALHOU' : 'OK');
    if (error) console.log('Erro:', error);

    console.log('\n=== TESTE 2: Verificar configurações de auth ===');
    const { data: settings, error: settingsError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    console.log('Admin auth:', settingsError ? 'FALHOU' : 'OK');
    if (settingsError) console.log('Erro:', settingsError);
    else console.log('Total de usuários:', settings.users?.length || 0);

    console.log('\n=== TESTE 3: Tentar signup simples ===');
    const testEmail = `teste${Date.now()}@exemplo.com`;
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'MinhaSenh@123!'
    });
    console.log('Signup público:', signupError ? 'FALHOU' : 'OK');
    console.log('Data:', signupData);
    console.log('Error:', signupError);

    console.log('\n=== TESTE 4: Tentar criar usuário com admin ===');
    const testEmail2 = `admin${Date.now()}@exemplo.com`;
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail2,
      password: 'MinhaSenh@123!',
      email_confirm: true
    });
    console.log('Criação admin:', adminError ? 'FALHOU' : 'OK');
    console.log('Data:', adminData);
    console.log('Error:', adminError);

  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testConnection();

