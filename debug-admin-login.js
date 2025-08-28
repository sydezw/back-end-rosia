const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugAdminLogin() {
  console.log('🔍 Debugando login administrativo...');
  
  // Verificar variáveis de ambiente
  console.log('\n📋 Variáveis de ambiente:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ Não definida');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ Não definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não definida');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Variáveis de ambiente obrigatórias não estão definidas');
    return;
  }
  
  // Criar cliente Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const email = 'suporte@rosia.com.br';
  
  try {
    console.log('\n🔍 Testando consulta à tabela admin_users...');
    
    // Testar consulta exata como no código da rota
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, user_id, active')
      .eq('email', email)
      .eq('active', true)
      .single();
    
    console.log('\n📊 Resultado da consulta:');
    console.log('Error:', adminError);
    console.log('Data:', adminCheck);
    
    if (adminError) {
      console.error('❌ Erro na consulta:', adminError.message);
      console.error('Código do erro:', adminError.code);
      console.error('Detalhes:', adminError.details);
      return;
    }
    
    if (!adminCheck) {
      console.error('❌ Nenhum usuário admin encontrado com email:', email);
      
      // Tentar buscar sem filtro de ativo
      console.log('\n🔍 Buscando sem filtro de ativo...');
      const { data: allAdmins, error: allError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email);
      
      console.log('Todos os admins com este email:', allAdmins);
      console.log('Erro:', allError);
      return;
    }
    
    console.log('✅ Usuário admin encontrado:', adminCheck);
    
    // Testar busca do usuário no Supabase Auth
    console.log('\n🔍 Testando busca no Supabase Auth...');
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(adminCheck.user_id);
    
    console.log('\n📊 Resultado da busca no Auth:');
    console.log('Error:', userError);
    console.log('User data:', userData?.user ? {
      id: userData.user.id,
      email: userData.user.email,
      created_at: userData.user.created_at
    } : 'Nenhum usuário encontrado');
    
    if (userError) {
      console.error('❌ Erro na busca do usuário:', userError.message);
      return;
    }
    
    if (!userData.user) {
      console.error('❌ Usuário não encontrado no Supabase Auth');
      return;
    }
    
    console.log('✅ Login administrativo deveria funcionar!');
    console.log('\n🎯 Simulando resposta de sucesso:');
    
    const adminToken = Buffer.from(`${adminCheck.id}:${adminCheck.email}:${Date.now()}`).toString('base64');
    
    const response = {
      success: true,
      user: {
        id: adminCheck.user_id,
        email: adminCheck.email,
        name: userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || 'Admin',
        avatar: userData.user.user_metadata?.avatar_url,
        isAdmin: true,
        adminId: adminCheck.id
      },
      session: {
        admin_token: adminToken,
        expires_at: Date.now() + (24 * 60 * 60 * 1000)
      }
    };
    
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugAdminLogin().catch(console.error);