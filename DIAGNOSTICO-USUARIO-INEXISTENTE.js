// DIAGNÓSTICO E CORREÇÃO DE USUÁRIOS INEXISTENTES
// Este script ajuda a identificar e resolver problemas de usuários que não existem no sistema

// Carregar variáveis de ambiente
require('dotenv').config();

const { supabaseAdmin } = require('./config/supabase');

async function diagnosticarUsuarioInexistente() {
  console.log('🔍 DIAGNÓSTICO DE USUÁRIO INEXISTENTE');
  console.log('=====================================\n');
  
  try {
    // 1. Listar todos os usuários Google ativos
    console.log('1. 📋 USUÁRIOS GOOGLE NO SUPABASE AUTH:');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários do Auth:', authError);
      return;
    }
    
    const googleUsers = authUsers.users.filter(user => 
      user.app_metadata?.provider === 'google'
    );
    
    console.log(`✅ Total de usuários Google no Auth: ${googleUsers.length}`);
    googleUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
    });
    
    // 2. Listar usuários na tabela google_user_profiles
    console.log('\n2. 📋 USUÁRIOS NA TABELA GOOGLE_USER_PROFILES:');
    const { data: profileUsers, error: profileError } = await supabaseAdmin
      .from('google_user_profiles')
      .select('google_id, email, nome');
    
    if (profileError) {
      console.error('❌ Erro ao buscar perfis Google:', profileError);
      return;
    }
    
    console.log(`✅ Total de perfis Google: ${profileUsers.length}`);
    profileUsers.forEach(user => {
      console.log(`   - ${user.email} (Google ID: ${user.google_id})`);
    });
    
    // 3. Identificar inconsistências
    console.log('\n3. 🔍 VERIFICANDO INCONSISTÊNCIAS:');
    
    const authUserIds = googleUsers.map(u => u.id);
    const profileUserIds = profileUsers.map(u => u.google_id);
    
    // Usuários no Auth mas não na tabela de perfis
    const missingProfiles = authUserIds.filter(id => !profileUserIds.includes(id));
    if (missingProfiles.length > 0) {
      console.log('⚠️ Usuários Google sem perfil na tabela:');
      missingProfiles.forEach(id => {
        const user = googleUsers.find(u => u.id === id);
        console.log(`   - ${user.email} (ID: ${id})`);
      });
    } else {
      console.log('✅ Todos os usuários Google têm perfis na tabela');
    }
    
    // Perfis na tabela mas não no Auth
    const orphanedProfiles = profileUserIds.filter(id => !authUserIds.includes(id));
    if (orphanedProfiles.length > 0) {
      console.log('⚠️ Perfis órfãos (sem usuário no Auth):');
      orphanedProfiles.forEach(id => {
        const profile = profileUsers.find(u => u.google_id === id);
        console.log(`   - ${profile.email} (Google ID: ${id})`);
      });
    } else {
      console.log('✅ Todos os perfis têm usuários correspondentes no Auth');
    }
    
    // 4. Verificar o usuário específico do erro
    const problematicUserId = '2c1f4048-b751-4493-a62d-0090fde82e53';
    console.log(`\n4. 🔍 VERIFICANDO USUÁRIO ESPECÍFICO: ${problematicUserId}`);
    
    // Verificar no Auth
    const { data: specificUser, error: specificError } = await supabaseAdmin.auth.admin.getUserById(problematicUserId);
    
    if (specificError || !specificUser.user) {
      console.log('❌ Usuário NÃO encontrado no Supabase Auth');
      console.log('💡 Possíveis causas:');
      console.log('   - Usuário foi removido do sistema');
      console.log('   - Token expirado ou inválido');
      console.log('   - Problema na sessão do frontend');
    } else {
      console.log('✅ Usuário encontrado no Auth:', specificUser.user.email);
      
      // Verificar na tabela de perfis
      const { data: specificProfile } = await supabaseAdmin
        .from('google_user_profiles')
        .select('*')
        .eq('google_id', problematicUserId)
        .single();
      
      if (specificProfile) {
        console.log('✅ Perfil encontrado na tabela');
      } else {
        console.log('❌ Perfil NÃO encontrado na tabela');
        console.log('🔧 Criando perfil automaticamente...');
        
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('google_user_profiles')
          .insert({
            google_id: specificUser.user.id,
            email: specificUser.user.email,
            nome: specificUser.user.user_metadata?.full_name || specificUser.user.email.split('@')[0]
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Erro ao criar perfil:', createError);
        } else {
          console.log('✅ Perfil criado com sucesso:', newProfile);
        }
      }
    }
    
    // 5. Sincronizar usuários faltantes
    if (missingProfiles.length > 0) {
      console.log('\n5. 🔧 SINCRONIZANDO USUÁRIOS FALTANTES:');
      
      for (const userId of missingProfiles) {
        const user = googleUsers.find(u => u.id === userId);
        console.log(`🔧 Criando perfil para: ${user.email}`);
        
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('google_user_profiles')
          .insert({
            google_id: user.id,
            email: user.email,
            nome: user.user_metadata?.full_name || user.email.split('@')[0]
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Erro ao criar perfil para ${user.email}:`, createError);
        } else {
          console.log(`✅ Perfil criado para ${user.email}`);
        }
      }
    }
    
    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('1. Se o usuário específico não existe, peça para fazer login novamente');
    console.log('2. Se há perfis órfãos, considere removê-los');
    console.log('3. Verifique se o frontend está usando tokens válidos');
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  }
}

// Executar diagnóstico
diagnosticarUsuarioInexistente()
  .then(() => {
    console.log('\n🏁 Diagnóstico finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

