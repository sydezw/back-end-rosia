// db/user-queries.js
const { supabase, supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');

/**
 * Cria um novo usuário com email/senha
 * @param {Object} userData - Dados do usuário
 * @returns {Promise<Object>} Usuário criado
 */
const createUser = async (userData) => {
  // Criar o perfil diretamente na tabela user_profiles sem user_id
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
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
 * Busca usuário por ID
 * @param {number} userId - ID do usuário
 * @returns {Promise<Object|null>} Usuário encontrado ou null
 */
const findUserById = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
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
  updateLastLogin
};