require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase Admin
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Definida' : '❌ Não definida');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testProductionDatabase() {
  try {
    console.log('🔍 Testando conexão com o banco de produção...');
    console.log('📍 URL do Supabase:', supabaseUrl);
    
    // 1. Testar conexão básica
    const { data: testData, error: testError } = await supabaseAdmin
      .from('admin_users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro de conexão:', testError);
      return;
    }
    
    console.log('✅ Conexão com banco estabelecida');
    
    // 2. Verificar usuários admin
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*');
    
    if (adminError) {
      console.error('❌ Erro ao buscar admin_users:', adminError);
      return;
    }
    
    console.log('\n📊 Usuários admin encontrados:', adminUsers.length);
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id}, Ativo: ${user.active})`);
    });
    
    // 3. Verificar usuários no Supabase Auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar usuários Auth:', authError);
      return;
    }
    
    console.log('\n🔐 Usuários no Supabase Auth:', authUsers.users.length);
    authUsers.users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    // 4. Verificar correspondência
    const adminEmails = adminUsers.map(u => u.email);
    const authEmails = authUsers.users.map(u => u.email);
    
    console.log('\n🔍 Verificando correspondências:');
    adminEmails.forEach(email => {
      const hasAuth = authEmails.includes(email);
      console.log(`  - ${email}: ${hasAuth ? '✅' : '❌'} no Auth`);
    });
    
    // 5. Testar especificamente o usuário suporte
    const supportUser = adminUsers.find(u => u.email === 'suporte@rosia.com.br');
    const supportAuth = authUsers.users.find(u => u.email === 'suporte@rosia.com.br');
    
    console.log('\n👤 Usuário suporte@rosia.com.br:');
    console.log('  - Na tabela admin_users:', supportUser ? '✅ Sim' : '❌ Não');
    console.log('  - No Supabase Auth:', supportAuth ? '✅ Sim' : '❌ Não');
    
    if (supportUser && supportAuth) {
      console.log('  - user_id corresponde:', supportUser.user_id === supportAuth.id ? '✅ Sim' : '❌ Não');
      console.log('  - Usuário ativo:', supportUser.active ? '✅ Sim' : '❌ Não');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testProductionDatabase();

