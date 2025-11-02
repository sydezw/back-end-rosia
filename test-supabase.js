const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Testando configurações do Supabase...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definida' : 'Não definida');

async function testSupabase() {
  try {
    // Teste 1: Cliente público
    console.log('\n📋 Teste 1: Cliente público (anon key)');
    const supabasePublic = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: publicData, error: publicError } = await supabasePublic
      .from('products')
      .select('count')
      .limit(1);
    
    if (publicError) {
      console.log('❌ Erro no cliente público:', publicError.message);
    } else {
      console.log('✅ Cliente público funcionando');
    }
    
    // Teste 2: Cliente admin
    console.log('\n🔑 Teste 2: Cliente admin (service role key)');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('products')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.log('❌ Erro no cliente admin:', adminError.message);
    } else {
      console.log('✅ Cliente admin funcionando');
    }
    
    // Teste 3: Storage
    console.log('\n📸 Teste 3: Supabase Storage');
    const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
    
    if (storageError) {
      console.log('❌ Erro no storage:', storageError.message);
      console.log('Detalhes do erro:', storageError);
    } else {
      console.log('✅ Storage funcionando');
      console.log('Buckets encontrados:', buckets.map(b => b.name));
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    console.log('Stack:', error.stack);
  }
}

testSupabase();

