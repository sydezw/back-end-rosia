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
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: 'Nome, email e senha são obrigatórios'
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        error: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    // Tentar primeiro com cliente público, depois admin se falhar
    console.log('=== TENTATIVA DE REGISTRO ===');
    console.log('Email:', email);
    console.log('Nome:', nome);
    console.log('Senha length:', senha.length);
    
    // Primeira tentativa: cliente público
    let { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          name: nome,
          full_name: nome
        }
      }
    });
    
    console.log('Tentativa 1 (cliente público):');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
    
    // Se falhar, tentar com cliente admin
    if (error && error.code === 'unexpected_failure') {
      console.log('Tentando com cliente admin...');
      const adminResult = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        user_metadata: {
          name: nome,
          full_name: nome
        },
        email_confirm: true
      });
      data = adminResult.data;
      error = adminResult.error;
      console.log('Tentativa 2 (cliente admin):');
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('Error:', JSON.stringify(error, null, 2));
    }

    console.log('Supabase Response:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', JSON.stringify(error, null, 2));
    console.log('=============================');

    if (error) {
      return res.status(400).json({
        error: 'Erro ao criar usuário',
        details: error.message,
        code: error.code || 'unknown'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: nome
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

    // Buscar ou criar perfil do usuário
    let userProfile = null;
    try {
      // Tentar buscar perfil existente
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (existingProfile) {
        // Atualizar último login
        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
        
        userProfile = existingProfile;
      } else {
        // Criar novo perfil (o trigger já deve ter criado, mas garantimos aqui)
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url,
            provider: 'google',
            google_id: data.user.user_metadata?.sub,
            email_verified: true,
            last_login: new Date().toISOString()
          })
          .select()
          .single();

        if (createError && createError.code !== '23505') { // Ignora erro de duplicata
          console.error('Erro ao criar perfil:', createError);
        }
        
        userProfile = newProfile || { 
          id: data.user.id,
          full_name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email,
          avatar_url: data.user.user_metadata?.avatar_url,
          provider: 'google'
        };
      }
    } catch (profileErr) {
      console.error('Erro ao gerenciar perfil do usuário:', profileErr);
      // Continua mesmo se houver erro no perfil
    }

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userProfile?.full_name || data.user.user_metadata?.name || data.user.user_metadata?.full_name,
        avatar: userProfile?.avatar_url || data.user.user_metadata?.avatar_url,
        provider: 'google',
        cpf: userProfile?.cpf,
        phone: userProfile?.phone,
        hasProfile: !!userProfile
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
 * GET /auth/callback/google
 * Callback do Google OAuth (para redirecionamento)
 */
router.get('/callback/google', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=no_code`);
    }

    // Trocar código por token com Supabase
    const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Erro ao trocar código por sessão:', authError);
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(authError.message)}`);
    }

    // Buscar ou criar perfil do usuário
    let userProfile = null;
    try {
      // Tentar buscar perfil existente
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (existingProfile) {
        // Atualizar último login
        await supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
        
        userProfile = existingProfile;
      } else {
        // Criar novo perfil (o trigger já deve ter criado, mas garantimos aqui)
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email,
            avatar_url: data.user.user_metadata?.avatar_url,
            provider: 'google',
            google_id: data.user.user_metadata?.sub,
            email_verified: true,
            last_login: new Date().toISOString()
          })
          .select()
          .single();

        if (createError && createError.code !== '23505') { // Ignora erro de duplicata
          console.error('Erro ao criar perfil no callback:', createError);
        }
        
        userProfile = newProfile;
      }
    } catch (profileErr) {
      console.error('Erro ao gerenciar perfil do usuário no callback:', profileErr);
      // Continua mesmo se houver erro no perfil
    }

    // Redirecionar para o frontend com os tokens e dados do perfil
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('access_token', data.session.access_token);
    redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);
    redirectUrl.searchParams.set('expires_at', data.session.expires_at);
    redirectUrl.searchParams.set('user_id', data.user.id);
    redirectUrl.searchParams.set('email', data.user.email);
    
    // Usar dados do perfil se disponível, senão usar metadata do Google
    const userName = userProfile?.full_name || data.user.user_metadata?.name || data.user.user_metadata?.full_name;
    const userAvatar = userProfile?.avatar_url || data.user.user_metadata?.avatar_url;
    
    if (userName) {
      redirectUrl.searchParams.set('name', userName);
    }
    if (userAvatar) {
      redirectUrl.searchParams.set('avatar', userAvatar);
    }
    if (userProfile?.cpf) {
      redirectUrl.searchParams.set('cpf', userProfile.cpf);
    }
    if (userProfile?.phone) {
      redirectUrl.searchParams.set('phone', userProfile.phone);
    }
    redirectUrl.searchParams.set('hasProfile', userProfile ? 'true' : 'false');

    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Erro no callback do Google:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_error`);
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
 * Retorna dados do usuário autenticado com perfil completo
 */
router.get('/me', authenticateUser, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Buscar dados completos do usuário usando a view
    const { data: profile, error } = await supabase
      .from('user_complete_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao buscar perfil completo:', error);
      // Se houver erro, retorna apenas os dados básicos
      return res.json({
        success: true,
        user: req.user,
        profile: null
      });
    }

    res.json({
      success: true,
      user: req.user,
      profile: profile || null
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