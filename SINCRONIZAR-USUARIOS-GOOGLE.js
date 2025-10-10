// Script para sincronizar todos os usuários Google do Supabase Auth para google_user_profiles
require('dotenv').config();

const { supabaseAdmin } = require('./config/supabase');

async function sincronizarUsuariosGoogle() {
  try {
    console.log('🔄 SINCRONIZAÇÃO: Usuários Google');
    console.log('=================================');

    // 1. Buscar todos os usuários do Supabase Auth
    console.log('1. Buscando usuários do Supabase Auth...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    // 2. Filtrar usuários Google
    const googleUsers = users.filter(user => 
      user.app_metadata?.provider === 'google' && 
      user.email
    );

    console.log(`✅ Encontrados ${googleUsers.length} usuários Google`);

    // 3. Para cada usuário Google, verificar/criar perfil
    for (const user of googleUsers) {
      console.log(`\n📧 Processando: ${user.email}`);
      
      // Verificar se já existe na tabela
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('google_user_profiles')
        .select('*')
        .eq('google_id', user.id)
        .single();

      if (existingProfile) {
        console.log('  ✅ Perfil já existe');
        continue;
      }

      // Criar novo perfil
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('google_user_profiles')
        .insert({
          google_id: user.id,
          email: user.email,
          nome: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
        })
        .select()
        .single();

      if (createError) {
        console.log('  ❌ Erro ao criar perfil:', createError.message);
      } else {
        console.log('  ✅ Perfil criado com sucesso');
        console.log('    ID:', newProfile.id);
        console.log('    Nome:', newProfile.nome);
      }
    }

    // 4. Verificar total final
    const { data: finalCount, error: countError } = await supabaseAdmin
      .from('google_user_profiles')
      .select('id', { count: 'exact' });

    if (!countError) {
      console.log(`\n🎉 SINCRONIZAÇÃO CONCLUÍDA!`);
      console.log(`📊 Total de perfis Google: ${finalCount.length}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar sincronização
sincronizarUsuariosGoogle();