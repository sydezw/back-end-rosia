// db/user-queries.js
const { supabase, supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');

/**
 * Cria um novo usuário com email/senha
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Usuário criado
 */
const createUser = async (userData) => {
  // Gerar um UUID para usar como user_id
  const uuid = crypto.randomUUID();
  
  // Criar o perfil diretamente na tabela user_profiles
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      user_id: uuid,
      nome: userData.name,
      email: userData.email,
      password_hash: userData.password_hash,
      cpf: userData.cpf,
      telefone: userData.phone,
      data_nascimento: userData.birth_date,
      auth_provider: 'email',
      email_verified: false
    })
    .select('id, nome, email, auth_provider, email_verified, created_at')
    .single();

  if (error) throw error;
  return data;
};

/**
 * Cria um novo usuário com Google OAuth
 * @param {Object} googleData - Dados do Google
 * @returns {Promise<Object>} Usuário criado
 */
const createGoogleUser = async (googleData) => {
  // Primeiro, inserir o usuário e obter o ID gerado
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      nome: googleData.name,
      email: googleData.email,
      google_id: googleData.google_id,
      auth_provider: 'google',
      email_verified: true
    })
    .select('id')
    .single();

  if (error) throw error;
  
  // Atualizar user_id com o mesmo valor do id
  const { data: updatedData, error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ user_id: data.id })
    .eq('id', data.id)
    .select('id, nome, email, google_id, auth_provider, email_verified, created_at')
    .single();

  if (updateError) throw updateError;
  return updatedData;
};

/**
 * Busca usuário por email
 * @param {string} email - Email do usuário
 * @returns {Promise<Object|null>} Usuário encontrado ou null
 */
const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Busca usuário por Google ID
 * @param {string} googleId - Google ID do usuário
 * @returns {Promise<Object|null>} Usuário encontrado ou null
 */
const findUserByGoogleId = async (googleId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Busca usuário por ID (verifica ambas as tabelas: user_profiles e google_user_profiles)
 * @param {number} userId - ID do usuário
 * @returns {Promise<Object|null>} Usuário encontrado ou null
 */
const findUserById = async (userId) => {
  console.log('🔍 findUserById - Procurando usuário:', userId);
  
  // Primeiro, tentar na tabela user_profiles (usuários normais)
  const { data: normalUser, error: normalError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (normalUser) {
    console.log('🔍 findUserById - Usuário normal encontrado:', userId);
    return { ...normalUser, userType: 'normal' };
  }
  
  // Se não encontrou, tentar na tabela google_user_profiles (usuários Google)
  const { data: googleUser, error: googleError } = await supabaseAdmin
    .from('google_user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (googleUser) {
    console.log('🔍 findUserById - Usuário Google encontrado:', userId);
    return { ...googleUser, userType: 'google' };
  }
  
  console.log('🔍 findUserById - Usuário não encontrado em nenhuma tabela:', userId);
  
  if (normalError && normalError.code !== 'PGRST116') {
    console.error('❌ findUserById - Erro na tabela user_profiles:', normalError);
  }
  if (googleError && googleError.code !== 'PGRST116') {
    console.error('❌ findUserById - Erro na tabela google_user_profiles:', googleError);
  }
  
  return null;
};

/**
 * Busca usuário Google por ID
 * @param {number} userId - ID do usuário Google
 * @returns {Promise<Object|null>} Usuário Google encontrado ou null
 */
const findGoogleUserById = async (userId) => {
  console.log('🔍 findGoogleUserById - Procurando usuário Google:', userId);
  
  const { data, error } = await supabaseAdmin
    .from('google_user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('🔍 findGoogleUserById - Resultado:', { data: !!data, error: error?.message, userId });
  
  if (error && error.code !== 'PGRST116') {
    console.error('❌ findGoogleUserById - Erro:', error);
    throw error;
  }
  
  return data;
};

/**
 * Atualiza último login do usuário
 * @param {number} userId - ID do usuário
 * @returns {Promise<void>}
 */
const updateLastLogin = async (userId) => {
  const { error } = await supabase
    .from('user_profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
};

module.exports = {
  createUser,
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  findGoogleUserById,
  updateLastLogin
};

