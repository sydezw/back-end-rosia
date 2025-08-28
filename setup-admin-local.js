const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupAdminLocal() {
  console.log('🔧 Configurando usuário administrador local...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
    return;
  }
  
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const adminEmail = 'suporte@rosia.com.br';
  const adminPassword = 'rosia2025';
  
  try {
    console.log('\n1️⃣ Verificando se usuário já existe no Supabase Auth...');
    
    // Primeiro, tentar buscar o usuário por email
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    let authUser = existingUsers.users.find(user => user.email === adminEmail);
    
    if (authUser) {
      console.log('✅ Usuário já existe no Supabase Auth:', authUser.id);
    } else {
      console.log('📝 Criando usuário no Supabase Auth...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Administrador',
          full_name: 'Administrador do Sistema'
        }
      });
      
      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        return;
      }
      
      authUser = newUser.user;
      console.log('✅ Usuário criado no Supabase Auth:', authUser.id);
    }
    
    console.log('\n2️⃣ Verificando se usuário existe na tabela admin_users...');
    
    // Usar cliente admin para contornar RLS
    const supabase = supabaseAdmin;
    
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar admin_users:', checkError);
      return;
    }
    
    if (existingAdmin) {
      console.log('✅ Usuário já existe na tabela admin_users');
      
      // Atualizar user_id se necessário
      if (existingAdmin.user_id !== authUser.id) {
        console.log('🔄 Atualizando user_id na tabela admin_users...');
        
        const { error: updateError } = await supabase
          .from('admin_users')
          .update({ user_id: authUser.id })
          .eq('email', adminEmail);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar admin_users:', updateError);
          return;
        }
        
        console.log('✅ user_id atualizado com sucesso');
      }
    } else {
      console.log('📝 Criando registro na tabela admin_users...');
      
      const { data: newAdmin, error: insertError } = await supabase
        .from('admin_users')
        .insert({
          email: adminEmail,
          user_id: authUser.id,
          active: true
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Erro ao inserir em admin_users:', insertError);
        return;
      }
      
      console.log('✅ Registro criado na tabela admin_users:', newAdmin.id);
    }
    
    console.log('\n3️⃣ Testando login administrativo...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('admin_users')
      .select('id, email, user_id, active')
      .eq('email', adminEmail)
      .eq('active', true)
      .single();
    
    if (finalError || !finalCheck) {
      console.error('❌ Erro na verificação final:', finalError);
      return;
    }
    
    console.log('✅ Configuração concluída com sucesso!');
    console.log('📊 Dados do admin:', finalCheck);
    console.log('\n🎯 Agora você pode fazer login com:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

setupAdminLocal().catch(console.error);