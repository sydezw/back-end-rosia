const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSignup() {
  console.log('🔍 Testando signup direto...');
  console.log('URL:', process.env.SUPABASE_URL);
  
  const testEmail = `teste${Date.now()}@exemplo.com`;
  const testPassword = 'MinhaSenh@123!';
  const testName = 'Teste Direto';
  
  console.log('\n=== TESTE 1: Cliente Público ===');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName,
          full_name: testName
        }
      }
    });
    
    console.log('✅ Resultado:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
  } catch (err) {
    console.log('❌ Erro capturado:', err.message);
  }
  
  console.log('\n=== TESTE 2: Cliente Admin ===');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail + '.admin',
      password: testPassword,
      user_metadata: {
        name: testName,
        full_name: testName
      },
      email_confirm: true
    });
    
    console.log('✅ Resultado:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
  } catch (err) {
    console.log('❌ Erro capturado:', err.message);
  }
  
  console.log('\n=== TESTE 3: Verificar configurações ===');
  try {
    // Tentar listar usuários para verificar se o admin funciona
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Erro ao listar usuários:', listError);
    } else {
      console.log('✅ Admin funcionando - Total de usuários:', users.users.length);
    }
  } catch (err) {
    console.log('❌ Erro ao testar admin:', err.message);
  }
}

testSignup().catch(console.error);