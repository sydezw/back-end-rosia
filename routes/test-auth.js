const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

/**
 * Endpoint para gerar um token de teste válido do Supabase
 */
router.post('/generate-test-token', async (req, res) => {
  try {
    const { email = 'teste@exemplo.com', password = 'teste123456' } = req.body;
    
    // Tentar fazer login ou criar usuário
    let authResult = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Se o login falhar, tentar criar o usuário
    if (authResult.error && authResult.error.message.includes('Invalid login credentials')) {
      console.log('Usuário não existe, criando...');
      authResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined // Não enviar email de confirmação
        }
      });
    }
    
    if (authResult.error) {
      return res.status(400).json({
        error: 'Erro ao gerar token de teste',
        details: authResult.error.message
      });
    }
    
    const { data: { session, user } } = authResult;
    
    if (!session || !session.access_token) {
      return res.status(400).json({
        error: 'Não foi possível gerar token de acesso',
        user: user ? { id: user.id, email: user.email } : null
      });
    }
    
    res.json({
      success: true,
      token: session.access_token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      expires_at: session.expires_at,
      message: 'Token de teste gerado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao gerar token de teste:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

/**
 * Endpoint para testar autenticação com token
 */
router.get('/test-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Testar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return res.status(401).json({
        valid: false,
        error: error.message,
        code: 'INVALID_TOKEN'
      });
    }
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      message: 'Token válido'
    });
    
  } catch (error) {
    console.error('Erro ao testar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;

