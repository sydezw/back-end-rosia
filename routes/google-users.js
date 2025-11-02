const express = require('express');
const GoogleUsersController = require('../controllers/GoogleUsersController');
const { authenticateGoogleUser } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// Endpoint para debug do token
router.get('/debug-token', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  let supabaseValidation = null;
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      supabaseValidation = {
        success: !error,
        error: error?.message,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata?.provider
        } : null
      };
    } catch (err) {
      supabaseValidation = {
        success: false,
        error: err.message
      };
    }
  }
  
  res.json({
    hasAuthHeader: !!authHeader,
    authHeader: authHeader,
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 50)}...` : null,
    supabaseValidation,
    headers: req.headers
  });
});

// Middleware de autenticação específico para usuários Google
router.use(authenticateGoogleUser);

// GET /api/google-users/profile - Buscar perfil do usuário Google autenticado
router.get('/profile', GoogleUsersController.getProfile);

// PUT /api/google-users/profile-update - Atualizar perfil completo do usuário Google autenticado
router.put('/profile-update', GoogleUsersController.updateProfileComplete);

// NOVOS ENDPOINTS SEPARADOS
// Atualizar apenas dados pessoais (nome, email, cpf, telefone, data_nascimento)
router.put('/personal-data', GoogleUsersController.updatePersonalData);

// Atualizar apenas endereço (cep, logradouro, numero, bairro, cidade, estado, complemento)
router.put('/address', GoogleUsersController.updateAddress);

// GET /api/google-users/addresses - Buscar endereços do usuário Google autenticado
router.get('/addresses', GoogleUsersController.getAddresses);

module.exports = router;

