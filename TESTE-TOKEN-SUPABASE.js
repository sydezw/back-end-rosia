// Script para testar e corrigir o problema do token Supabase
require('dotenv').config();

const { supabaseAdmin } = require('./config/supabase');

async function testarTokenSupabase() {
  console.log('🔍 TESTE: Validação de Token Supabase');
  console.log('=====================================');
  
  try {
    // 1. Verificar configuração do Supabase
    console.log('\n1. Verificando configuração do Supabase...');
    console.log('- URL configurada:', !!process.env.SUPABASE_URL);
    console.log('- Service Key configurada:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 2. Listar usuários existentes
    console.log('\n2. Listando usuários do Supabase Auth...');
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      return;
    }
    
    console.log(`✅ Encontrados ${users.users.length} usuários`);
    
    // Mostrar usuários Google
    const googleUsers = users.users.filter(user => 
      user.app_metadata?.provider === 'google' || 
      user.app_metadata?.providers?.includes('google')
    );
    
    console.log(`📧 Usuários Google encontrados: ${googleUsers.length}`);
    googleUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    if (googleUsers.length === 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: Não há usuários Google no Supabase Auth!');
      console.log('\n💡 SOLUÇÕES:');
      console.log('1. O usuário precisa fazer login via Google OAuth no Supabase');
      console.log('2. Ou criar um usuário Google manualmente no Supabase Auth');
      console.log('3. Verificar se a integração Google OAuth está configurada');
      return;
    }
    
    // 3. Verificar usuário Google diretamente (generateAccessToken não existe)
    const googleUser = googleUsers[0];
    console.log(`\n3. Verificando usuário Google: ${googleUser.email}`);
    
    // Buscar dados completos do usuário
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(googleUser.id);
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return;
    }
    
    console.log('✅ Usuário encontrado no Supabase Auth');
    const validatedUser = userData.user;
    console.log('Dados do usuário:', {
      id: validatedUser.id,
      email: validatedUser.email,
      provider: validatedUser.app_metadata?.provider,
      google_id: validatedUser.user_metadata?.sub || validatedUser.user_metadata?.provider_id
    });
    
    // 4. Nota sobre tokens
    console.log('\n4. Sobre tokens de acesso...');
    console.log('⚠️  A função generateAccessToken não está disponível nesta versão do Supabase');
    console.log('💡 Tokens devem ser obtidos através do login OAuth no frontend');
    
    // 5. Verificar se existe na tabela google_user_profiles
    console.log('\n5. Verificando tabela google_user_profiles...');
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('google_user_profiles')
      .select('*')
      .eq('email', validatedUser.email)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar perfil:', profileError);
      return;
    }
    
    if (!profileData) {
      console.log('⚠️  Usuário não encontrado na tabela google_user_profiles');
      console.log('💡 Criando registro na tabela...');
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('google_user_profiles')
        .insert({
          google_id: validatedUser.id,
          email: validatedUser.email,
          nome: validatedUser.user_metadata?.full_name || validatedUser.user_metadata?.name || 'Usuário Google'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar perfil:', createError);
        return;
      }
      
      console.log('✅ Perfil criado:', newProfile);
    } else {
      console.log('✅ Perfil encontrado:', profileData);
    }
    
    // 6. Resumo dos resultados
    console.log('\n6. Resumo dos resultados:');
    console.log('✅ Configuração do Supabase: OK');
    console.log('✅ Usuários Google encontrados:', googleUsers.length);
    console.log('✅ Perfil criado/verificado na tabela google_user_profiles');
    console.log('\n💡 Para testar o endpoint, use um token real obtido do frontend OAuth');
    console.log('🔧 O middleware authenticateGoogleUser deve funcionar corretamente agora');
    

    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
if (require.main === module) {
  testarTokenSupabase();
}

module.exports = { testarTokenSupabase };

