require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

/**
 * Script para adicionar usuário existente à tabela admin_users
 */
async function addAdminToTable() {
  try {
    console.log('🚀 Iniciando adição do usuário à tabela admin_users...');
    
    const adminEmail = 'suporte@rosia.com.br';
    
    // 1. Buscar usuário existente no Auth
    console.log('🔍 Buscando usuário no Supabase Auth...');
    const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) {
      throw new Error(`Erro ao buscar usuários: ${searchError.message}`);
    }
    
    const existingUser = existingUsers.users.find(user => user.email === adminEmail);
    if (!existingUser) {
      throw new Error('Usuário não encontrado no Auth');
    }
    
    console.log(`✅ Usuário encontrado: ${existingUser.id}`);
    
    // 2. Verificar se já existe na tabela admin_users
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Erro ao verificar admin existente: ${checkError.message}`);
    }
    
    if (existingAdmin) {
      console.log('✅ Usuário admin já existe na tabela admin_users');
      console.log('📊 Dados do admin:', existingAdmin);
      return existingAdmin;
    }
    
    // 3. Criar entrada na tabela admin_users
    console.log('📝 Criando entrada na tabela admin_users...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: existingUser.id,
        email: adminEmail,
        active: true
      })
      .select()
      .single();
    
    if (adminError) {
      throw new Error(`Erro ao criar admin_user: ${adminError.message}`);
    }
    
    console.log('✅ Admin criado com sucesso!');
    console.log('📊 Dados do admin:', adminData);
    
    // 4. Verificação final
    console.log('🔍 Verificação final...');
    const { data: finalCheck, error: finalError } = await supabaseAdmin
      .from('admin_users')
      .select(`
        id,
        email,
        user_id,
        active,
        created_at
      `)
      .eq('email', adminEmail)
      .single();
    
    if (finalError) {
      throw new Error(`Erro na verificação final: ${finalError.message}`);
    }
    
    console.log('🎉 Usuário administrador configurado com sucesso!');
    console.log('📋 Resumo:');
    console.log(`   Email: ${finalCheck.email}`);
    console.log(`   User ID: ${finalCheck.user_id}`);
    console.log(`   Admin ID: ${finalCheck.id}`);
    console.log(`   Ativo: ${finalCheck.active}`);
    console.log(`   Criado em: ${finalCheck.created_at}`);
    console.log('');
    console.log('🌐 Teste o login em: https://back-end-rosia.vercel.app/admin/auth/login');
    
    return finalCheck;
    
  } catch (error) {
    console.error('❌ Erro ao adicionar usuário à tabela admin:', error.message);
    process.exit(1);
  }
}

// Executar o script
if (require.main === module) {
  addAdminToTable()
    .then(() => {
      console.log('✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

module.exports = { addAdminToTable };

