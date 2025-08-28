require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

const testAdminLogin = async () => {
  console.log('🔍 Testando login admin...');
  console.log('📧 Email:', 'suporte@rosia.com.br');
  
  try {
    // Verificar na tabela admin_users
    console.log('\n1. Verificando na tabela admin_users...');
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', 'suporte@rosia.com.br')
      .eq('active', true)
      .single();
    
    if (adminError) {
      console.log('❌ Erro na consulta admin_users:', adminError);
      return;
    }
    
    if (!adminUser) {
      console.log('❌ Usuário não encontrado na tabela admin_users');
      return;
    }
    
    console.log('✅ Usuário encontrado na admin_users:', adminUser);
    
    // Verificar no Supabase Auth
    console.log('\n2. Verificando no Supabase Auth...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminUser.user_id);
    
    if (authError) {
      console.log('❌ Erro na consulta Supabase Auth:', authError);
      return;
    }
    
    if (!authUser.user) {
      console.log('❌ Usuário não encontrado no Supabase Auth');
      return;
    }
    
    console.log('✅ Usuário encontrado no Supabase Auth:', authUser.user.email);
    
    // Simular geração de token
    console.log('\n3. Simulando geração de token...');
    const adminToken = Buffer.from(JSON.stringify({
      adminId: adminUser.id,
      userId: adminUser.user_id,
      email: adminUser.email,
      timestamp: Date.now()
    })).toString('base64');
    
    console.log('✅ Token gerado:', adminToken.substring(0, 50) + '...');
    
    console.log('\n🎉 Login admin funcionaria corretamente!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

testAdminLogin();