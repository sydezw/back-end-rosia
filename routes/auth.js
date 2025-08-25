const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

/**
 * POST /auth/login
 * Login com email e senha
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios'
      });
    }

    // Autenticar com Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: error.message
      });
    }

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, user_metadata')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/register
 * Registro de novo usuário
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Nome, email e senha são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    // Criar usuário no Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          full_name: name
        }
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: name
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      } : null
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/google
 * Login com Google OAuth
 */
router.post('/login/google', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token do Google é obrigatório'
      });
    }

    // Verificar token do Google com Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: token
    });

    if (error) {
      return res.status(401).json({
        error: 'Token do Google inválido',
        details: error.message
      });
    }

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url,
        provider: 'google'
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/facebook
 * Login com Facebook OAuth
 */
router.post('/login/facebook', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token do Facebook é obrigatório'
      });
    }

    // Verificar token do Facebook com Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'facebook',
      token: token
    });

    if (error) {
      return res.status(401).json({
        error: 'Token do Facebook inválido',
        details: error.message
      });
    }

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name,
        avatar: data.user.user_metadata?.avatar_url,
        provider: 'facebook'
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/refresh
 * Renovar token de acesso
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token é obrigatório'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        details: error.message
      });
    }

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/logout
 * Logout do usuário
 */
router.post('/logout', authenticateUser, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        error: 'Erro ao fazer logout',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Obter dados do usuário autenticado
 */
router.get('/me', authenticateUser, async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/forgot-password
 * Solicitar reset de senha
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email é obrigatório'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao enviar email de reset',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Email de reset enviado com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/reset-password
 * Resetar senha com token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Token e nova senha são obrigatórios'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return res.status(400).json({
        error: 'Erro ao resetar senha',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Senha resetada com sucesso'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;