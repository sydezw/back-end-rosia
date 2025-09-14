require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

/**
 * Script para criar o usuário administrador de teste
 * Email: admin@rosia.com
 * Senha: admin123
 */
async function createTestAdmin() {
  try {
    console.log('🚀 Iniciando criação do usuário administrador de teste...');
    
    const adminEmail = 'teste@rosia.com';
    const adminPassword = 'admin123';
    
    // 1. Criar usuário no Supabase Auth
    console.log('📝 Criando usuário no Supabase Auth...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Admin Teste',
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
          console.log('✅ Usuário admin de teste já existe na tabela admin_users');
          console.log('📧 Email:', existingAdmin.email);
          console.log('🔑 Senha: admin123');
          return;
        }
        
        // 3. Adicionar à tabela admin_users
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
          throw new Error(`Erro ao adicionar à tabela admin_users: ${adminError.message}`);
        }
        
        console.log('✅ Usuário admin de teste adicionado à tabela admin_users');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Senha: admin123');
        return;
      } else {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }
    }
    
    console.log(`✅ Usuário criado no Auth: ${authUser.user.id}`);
    
    // 2. Adicionar à tabela admin_users
    console.log('📝 Adicionando à tabela admin_users...');
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: authUser.user.id,
        email: adminEmail,
        active: true
      })
      .select()
      .single();
    
    if (adminError) {
      throw new Error(`Erro ao adicionar à tabela admin_users: ${adminError.message}`);
    }
    
    console.log('✅ Usuário administrador de teste criado com sucesso!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Senha: admin123');
    console.log('🆔 Admin ID:', adminData.id);
    console.log('🆔 User ID:', authUser.user.id);
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador de teste:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestAdmin()
    .then(() => {
      console.log('🎉 Script concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestAdmin };