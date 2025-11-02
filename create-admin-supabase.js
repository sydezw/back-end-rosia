require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

/**
 * Script para criar o usuário administrador no Supabase
 * Execute este script uma vez para configurar o admin
 */
async function createAdminUser() {
  try {
    console.log('🚀 Iniciando criação do usuário administrador...');
    
    const adminEmail = 'suporte@rosia.com.br';
    const adminPassword = 'rosia2025';
    
    // 1. Criar usuário no Supabase Auth
    console.log('📝 Criando usuário no Supabase Auth...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Administrador Rosia',
        role: 'admin'
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Usuário já existe no Auth. Buscando ID...');
        
        // Buscar usuário existente
        const { data: existingUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
        if (searchError) {
          throw new Error(`Erro ao buscar usuários: ${searchError.message}`);
        }
        
        const existingUser = existingUsers.users.find(user => user.email === adminEmail);
        if (!existingUser) {
          throw new Error('Usuário não encontrado após busca');
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
          return;
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
        
      } else {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }
    } else {
      console.log(`✅ Usuário criado no Auth: ${authUser.user.id}`);
      
      // 2. Criar entrada na tabela admin_users
      console.log('📝 Criando entrada na tabela admin_users...');
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: authUser.user.id,
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
    }
    
    // 3. Verificação final
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
    console.log('🔐 Credenciais de login:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Senha: ${adminPassword}`);
    console.log('');
    console.log('🌐 Teste o login em: https://back-end-rosia.vercel.app/admin/auth/login');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message);
    process.exit(1);
  }
}

// Executar o script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };

