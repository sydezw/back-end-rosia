require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const userId = '270139ae-71dc-4547-8775-bb073f0bd1a4';
  console.log(`🔍 Buscando usuário ${userId}...`);
  
  // Buscar na tabela google_user_profiles
  const { data: googleUser, error: googleError } = await supabase
    .from('google_user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  console.log('\n📊 RESULTADO - Google User Profiles:');
  console.log('Status:', googleUser ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  if (googleUser) {
    console.log('Dados:', JSON.stringify(googleUser, null, 2));
  }
  if (googleError) {
    console.log('Erro:', googleError);
  }
  
  // Buscar endereço
  const { data: address, error: addressError } = await supabase
    .from('google_user_addresses')
    .select('*')
    .eq('google_user_id', userId)
    .maybeSingle();
  
  console.log('\n📊 RESULTADO - Google User Addresses:');
  console.log('Status:', address ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  if (address) {
    console.log('Dados:', JSON.stringify(address, null, 2));
  }
  if (addressError) {
    console.log('Erro:', addressError);
  }
  
  // Buscar também por google_id na tabela google_user_profiles
  const { data: googleUserByGoogleId, error: googleIdError } = await supabase
    .from('google_user_profiles')
    .select('*')
    .eq('google_id', userId)
    .maybeSingle();
  
  console.log('\n📊 RESULTADO - Busca por google_id:');
  console.log('Status:', googleUserByGoogleId ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  if (googleUserByGoogleId) {
    console.log('Dados:', JSON.stringify(googleUserByGoogleId, null, 2));
  }
  if (googleIdError) {
    console.log('Erro:', googleIdError);
  }
  
})().catch(console.error);

