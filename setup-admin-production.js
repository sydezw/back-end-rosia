require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase Admin (usando service role key)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdminUser() {
  try {
    console.log('🔍 Verificando usuário admin no Supabase...');
    
    // 1. Verificar se o usuário já existe no Auth
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    const existingUser = users.users.find(user => user.email === 'suporte@rosia.com.br');
    
    let userId;
    
    if (existingUser) {
      console.log('✅ Usuário já existe no Supabase Auth:', existingUser.id);
      userId = existingUser.id;
    } else {
      // 2. Criar usuário no Supabase Auth
      console.log('📝 Criando usuário no Supabase Auth...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'suporte@rosia.com.br',
        password: 'rosia2025',
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          name: 'Administrador Rosia'
        }
      });
      
      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        return;
      }
      
      console.log('✅ Usuário criado no Supabase Auth:', newUser.user.id);
      userId = newUser.user.id;
    }
    
    // 3. Verificar se já existe na tabela admin_users
    const { data: adminUser, error: selectError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('email', 'suporte@rosia.com.br')
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar admin_users:', selectError);
      return;
    }
    
    if (adminUser) {
      console.log('✅ Usuário já existe na tabela admin_users:', adminUser.id);
      
      // Atualizar user_id se necessário
      if (adminUser.user_id !== userId) {
        const { error: updateError } = await supabaseAdmin
          .from('admin_users')
          .update({ user_id: userId })
          .eq('id', adminUser.id);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar user_id:', updateError);
        } else {
          console.log('✅ user_id atualizado na tabela admin_users');
        }
      }
    } else {
      // 4. Inserir na tabela admin_users
      console.log('📝 Adicionando usuário à tabela admin_users...');
      
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('admin_users')
        .insert({
          user_id: userId,
          email: 'suporte@rosia.com.br',
          active: true
        })
        .select();
      
      if (insertError) {
        console.error('❌ Erro ao inserir na tabela admin_users:', insertError);
        return;
      }
      
      console.log('✅ Usuário adicionado à tabela admin_users:', insertData[0].id);
    }
    
    console.log('\n🎉 Setup do usuário admin concluído com sucesso!');
    console.log('📧 Email: suporte@rosia.com.br');
    console.log('🔑 Senha: rosia2025');
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

setupAdminUser();

