const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser, authenticateToken } = require('../middleware/auth');
const { invalidateToken } = require('../utils/tokenManager');
const { hashPassword, comparePassword } = require('../utils/password');
const { verifyGoogleToken } = require('../utils/google-auth');
const { 
  createUser, 
  createGoogleUser, 
  findUserByEmail, 
  findUserByGoogleId, 
  updateLastLogin 
} = require('../db/user-queries');
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
  console.log('🚀 POST /login/google - Iniciando login com Google');
  
  try {
    const { token } = req.body;
    const { sanitizeToken } = require('../utils/token-validation');
    
    console.log('🔍 Dados recebidos:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      requestHeaders: req.headers['user-agent'] ? 'Present' : 'Missing'
    });

    // Validação de entrada
    if (!token) {
      console.error('❌ Token do Google não fornecido');
      return res.status(400).json({
        error: 'Token do Google é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }

    if (typeof token !== 'string' || token.trim().length === 0) {
      console.error('❌ Token do Google inválido (formato)');
      return res.status(400).json({
        error: 'Token do Google deve ser uma string válida',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    console.log('🔍 Verificando token do Google...');
    
    // Verificar token do Google
    let payload;
    try {
      payload = await verifyGoogleToken(token.trim());
    } catch (tokenError) {
      console.error('❌ Erro na verificação do token:', tokenError.message);
      return res.status(401).json({
        error: tokenError.message,
        code: 'INVALID_GOOGLE_TOKEN'
      });
    }
    
    if (!payload) {
      console.error('❌ Payload do token Google vazio');
      return res.status(401).json({
        error: 'Token do Google inválido - payload vazio',
        code: 'EMPTY_PAYLOAD'
      });
    }

    // Validar dados essenciais do payload
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const avatar = payload.picture;
    const emailVerified = payload.email_verified;

    console.log('✅ Token Google válido:', {
      googleId: googleId ? 'Present' : 'Missing',
      email: email || 'Missing',
      name: name || 'Missing',
      emailVerified: emailVerified
    });

    if (!googleId || !email) {
      console.error('❌ Dados essenciais ausentes no token Google');
      return res.status(400).json({
        error: 'Token do Google não contém dados essenciais (ID ou email)',
        code: 'INCOMPLETE_GOOGLE_DATA'
      });
    }

    if (!emailVerified) {
      console.warn('⚠️ Email não verificado no Google:', email);
    }

    console.log('🔍 Buscando/criando perfil do usuário...');

    // Buscar ou criar perfil do usuário
    let userProfile = null;
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4(); // Gerar UUID válido
    
    try {
      // Verificar se estamos em modo de desenvolvimento
      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-project')) {
        console.log('⚠️ Modo de desenvolvimento - usando perfil simulado');
        userProfile = {
          id: userId,
          email: email,
          nome: name || 'Usuário de Desenvolvimento',
          google_id: googleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('✅ Perfil simulado criado:', userProfile);
      } else {
        // Tentar buscar perfil existente pelo Google ID
        console.log('🔍 Buscando perfil existente por Google ID:', googleId);
        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from('google_user_profiles')
          .select('*')
          .eq('google_id', googleId)
          .single();

      if (existingProfile) {
        console.log('✅ Perfil existente encontrado:', existingProfile.id);
        
        // Atualizar último login
        const { error: updateError } = await supabaseAdmin
          .from('google_user_profiles')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('google_id', googleId);
        
        if (updateError) {
          console.warn('⚠️ Erro ao atualizar último login:', updateError.message);
        } else {
          console.log('✅ Último login atualizado');
        }
        
        userProfile = existingProfile;
      } else {
        console.log('🔍 Perfil não encontrado, criando novo perfil...');
        
        // Criar novo perfil
        const newProfileData = {
          id: userId,
          email: email,
          nome: name || 'Usuário Google',
          google_id: googleId
        };
        
        console.log('🔍 Dados do novo perfil:', newProfileData);
        
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('google_user_profiles')
          .insert(newProfileData)
          .select()
          .single();

        if (createError) {
          if (createError.code === '23505') {
            console.warn('⚠️ Perfil já existe (duplicata), tentando buscar novamente...');
            // Tentar buscar novamente
            const { data: retryProfile } = await supabaseAdmin
              .from('google_user_profiles')
              .select('*')
              .eq('google_id', googleId)
              .single();
            userProfile = retryProfile;
          } else {
            console.error('❌ Erro ao criar perfil:', createError);
            throw createError;
          }
        } else {
          console.log('✅ Novo perfil criado:', newProfile.id);
          userProfile = newProfile;
        }
        
        // Fallback se ainda não temos perfil
        if (!userProfile) {
          console.log('🔧 Usando dados de fallback para o perfil');
          userProfile = newProfileData;
        }
      }
    }
    } catch (profileErr) {
      console.error('❌ Erro crítico ao gerenciar perfil do usuário:', profileErr);
      return res.status(500).json({
        error: 'Erro interno ao processar perfil do usuário',
        code: 'PROFILE_ERROR'
      });
    }

    // Validar JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não configurado');
      return res.status(500).json({
        error: 'Configuração do servidor incompleta',
        code: 'MISSING_JWT_SECRET'
      });
    }

    console.log('🔍 Gerando JWT token...');
    
    // Gerar JWT token para sessão com validação robusta
    let jwtToken;
    try {
      const jwtPayload = {
        userId: userProfile.id,
        email: email,
        provider: 'google',
        googleId: googleId,
        iat: Math.floor(Date.now() / 1000)
      };
      
      jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: '7d',
        issuer: 'rosia-backend',
        audience: 'rosia-frontend'
      });
      
      // Validar token gerado para evitar problemas
      const sanitizedToken = sanitizeToken(jwtToken);
      if (!sanitizedToken) {
        throw new Error('Token gerado é inválido');
      }
      
      console.log('✅ Token JWT gerado e validado:', {
        tokenLength: jwtToken.length,
        hasValidFormat: !!sanitizedToken,
        userId: jwtPayload.userId
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar token JWT:', error);
      return res.status(500).json({
        error: 'Erro ao gerar token de autenticação',
        details: error.message,
        code: 'JWT_GENERATION_ERROR'
      });
    }

    const responseData = {
      success: true,
      user: {
        id: userProfile.id,
        email: email,
        name: userProfile.nome || name,
        avatar: userProfile.avatar_url || avatar,
        provider: 'google',
        cpf: userProfile.cpf || null,
        phone: userProfile.telefone || null,
        hasProfile: true,
        emailVerified: emailVerified
      },
      token: jwtToken,
      access_token: jwtToken,  // Compatibilidade com frontend que espera access_token
      // Instruções para o frontend evitar salvar "undefined"
      frontend_instructions: {
        validation: {
          check_token_before_save: 'Sempre verificar se token não é "undefined" antes de salvar',
          sanitize_tokens: 'Usar função de sanitização para validar tokens',
          clear_on_invalid: 'Limpar localStorage se tokens forem inválidos'
        },
        example_code: {
          save_token: 'if (data.access_token && data.access_token !== "undefined") { localStorage.setItem("access_token", data.access_token); }',
          validate_before_use: 'const token = localStorage.getItem("access_token"); if (!token || token === "undefined") { /* redirect to login */ }'
        }
      }
    };

    console.log('✅ Login Google realizado com sucesso:', {
      userId: userProfile.id,
      email: email,
      hasToken: !!jwtToken,
      tokenValid: jwtToken !== 'undefined'
    });

    // Log final para debug
    console.log('📤 Resposta enviada:', {
      success: responseData.success,
      hasUser: !!responseData.user,
      hasToken: !!responseData.token,
      tokenValid: responseData.token !== 'undefined'
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ Erro não tratado no login Google:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Não expor detalhes internos em produção
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({
      error: 'Erro interno do servidor durante login Google',
      code: 'INTERNAL_ERROR',
      ...(isDevelopment && { details: error.message })
    });
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
 * Logout do usuário com invalidação de token
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // Obter token do header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Invalidar token no servidor
      await invalidateToken(token);
      console.log('✅ Token invalidado no logout');
    }
    
    // Também fazer logout no Supabase (se aplicável)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('⚠️ Aviso no logout Supabase:', error.message);
      // Não retornar erro, pois o token já foi invalidado
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso. Token invalidado.'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    next(error);
  }
});

/**
 * GET /auth/me
 * Retorna dados do usuário autenticado com perfil completo
 */
router.get('/me', authenticateToken, async (req, res, next) => {
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

/**
 * POST /auth/register-jwt
 * Registro de usuário com JWT personalizado
 */
router.post('/register-jwt', async (req, res, next) => {
  try {
    const { name, email, password, cpf, phone, birth_date } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios',
        error_code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Senha deve ter pelo menos 6 caracteres',
        error_code: 'WEAK_PASSWORD'
      });
    }

    // Verificar se email já existe
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email já está em uso',
        error_code: 'EMAIL_EXISTS'
      });
    }

    // Hash da senha para armazenar no perfil
    const password_hash = await hashPassword(password);

    // Criar usuário (Supabase Auth + perfil)
    const user = await createUser({
      name,
      email,
      password, // Senha original para Supabase Auth
      password_hash, // Hash para o perfil
      cpf,
      phone,
      birth_date
    });

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        auth_provider: user.auth_provider,
        email_verified: user.email_verified
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error_code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /auth/login-jwt
 * Login com email e senha usando JWT personalizado
 */
router.post('/login-jwt', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
        error_code: 'MISSING_FIELDS'
      });
    }

    // Buscar usuário
    const user = await findUserByEmail(email);
    if (!user || user.auth_provider !== 'email') {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error_code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar senha
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error_code: 'INVALID_CREDENTIALS'
      });
    }

    // Atualizar último login
    await updateLastLogin(user.id);

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        birth_date: user.birth_date,
        auth_provider: user.auth_provider,
        last_login: new Date().toISOString()
      },
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error_code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /auth/login/google-jwt
 * Login com Google usando JWT personalizado
 */
router.post('/login/google-jwt', async (req, res, next) => {
  try {
    const { google_token, google_user } = req.body;

    if (!google_token || !google_user) {
      return res.status(400).json({
        success: false,
        message: 'Token do Google e dados do usuário são obrigatórios',
        error_code: 'MISSING_FIELDS'
      });
    }

    // Verificar token do Google
    let googlePayload;
    try {
      googlePayload = await verifyGoogleToken(google_token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token do Google inválido',
        error_code: 'INVALID_GOOGLE_TOKEN'
      });
    }

    // Buscar usuário existente
    let user = await findUserByGoogleId(google_user.id);
    
    if (!user) {
      // Verificar se já existe usuário com mesmo email
      const existingUser = await findUserByEmail(google_user.email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email já está em uso com outro método de autenticação',
          error_code: 'EMAIL_EXISTS'
        });
      }

      // Criar novo usuário
      user = await createGoogleUser({
        name: google_user.name,
        email: google_user.email,
        google_id: google_user.id
      });
    }

    // Atualizar último login
    await updateLastLogin(user.id);

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login com Google realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        google_id: user.google_id,
        auth_provider: user.auth_provider,
        email_verified: user.email_verified,
        last_login: new Date().toISOString()
      },
      token
    });

  } catch (error) {
    console.error('Erro no login com Google:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error_code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /auth/verify
 * Verificar token JWT
 */
router.get('/verify', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

/**
 * POST /auth/logout-jwt
 * Logout JWT com invalidação de token
 */
router.post('/logout-jwt', authenticateToken, async (req, res) => {
  try {
    // Obter token do header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Invalidar token no servidor
      await invalidateToken(token);
      console.log('✅ Token JWT invalidado no logout');
    }
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso. Token invalidado.'
    });
  } catch (error) {
    console.error('Erro no logout JWT:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no logout'
    });
  }
});

/**
 * GET /auth/debug/google-config
 * Debug: Verificar configuração do Google OAuth
 */
// Endpoint de teste para Google OAuth
router.post('/test/google-login', async (req, res) => {
  try {
    console.log('🧪 Testando login Google com token simulado...');
    
    const { verifyGoogleToken } = require('../utils/google-auth');
    
    // Usar token de teste
    const testToken = 'test_token_123';
    
    const payload = await verifyGoogleToken(testToken);
    
    res.json({
      success: true,
      message: 'Google OAuth configurado corretamente para desenvolvimento',
      payload: payload,
      environment: 'development'
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: 'Erro no teste do Google OAuth'
    });
  }
});

router.get('/debug/google-config', async (req, res) => {
  console.log('🔍 GET /debug/google-config - Verificando configuração Google OAuth');
  
  try {
    const { 
      getGoogleAuthDebugInfo, 
      getFallbackConfig, 
      validateEnvironmentConfig 
    } = require('../utils/google-auth');
    
    const debugInfo = getGoogleAuthDebugInfo();
    const fallbackConfig = getFallbackConfig();
    const validation = validateEnvironmentConfig();
    
    const configStatus = {
      timestamp: new Date().toISOString(),
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        suggestions: validation.suggestions
      },
      environment: validation.environment,
      googleAuth: {
        hasClientId: debugInfo.hasClientId,
        clientIdPrefix: debugInfo.clientIdPrefix,
        hasClientSecret: debugInfo.hasClientSecret,
        fallbackClientIds: fallbackConfig.googleClientIds
      },
      jwt: {
        hasSecret: !!process.env.JWT_SECRET,
        secretPrefix: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'Não configurado'
      },
      supabase: {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      server: {
        port: process.env.PORT || 'Não definida',
        cors: {
          origin: process.env.CORS_ORIGIN || 'Não definida',
          allowedOrigins: fallbackConfig.allowedOrigins
        }
      },
      recommendations: fallbackConfig.recommendations
    };
    
    console.log('✅ Configuração Google OAuth verificada:', {
      isValid: validation.isValid,
      errors: validation.errors.length,
      warnings: validation.warnings.length
    });
    
    res.json({
      success: true,
      message: 'Configuração do Google OAuth com validação de ambiente',
      data: configStatus
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar configuração',
      details: error.message
    });
  }
});

/**
 * POST /auth/debug/google-token
 * Debug: Testar validação de token Google
 */
router.post('/debug/google-token', async (req, res) => {
  console.log('🔍 POST /debug/google-token - Testando validação de token Google');
  
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token é obrigatório para teste',
        example: {
          token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...'
        }
      });
    }
    
    console.log('🔍 Testando token:', {
      hasToken: !!token,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 50) + '...'
    });
    
    // Testar verificação do token
    let payload;
    let tokenValid = false;
    let errorDetails = null;
    
    try {
      payload = await verifyGoogleToken(token);
      tokenValid = true;
      console.log('✅ Token válido');
    } catch (tokenError) {
      errorDetails = {
        message: tokenError.message,
        type: tokenError.constructor.name
      };
      console.log('❌ Token inválido:', tokenError.message);
    }
    
    const testResult = {
      timestamp: new Date().toISOString(),
      tokenTest: {
        valid: tokenValid,
        error: errorDetails,
        payload: tokenValid ? {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture ? 'Present' : 'Missing',
          email_verified: payload.email_verified,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat
        } : null
      },
      recommendations: []
    };
    
    // Adicionar recomendações baseadas no resultado
    if (!tokenValid) {
      testResult.recommendations.push('Verifique se o token foi gerado corretamente pelo Google');
      testResult.recommendations.push('Confirme se o GOOGLE_CLIENT_ID está configurado corretamente');
      testResult.recommendations.push('Verifique se o token não expirou');
    } else {
      testResult.recommendations.push('Token válido! Pode prosseguir com o login');
      if (!payload.email_verified) {
        testResult.recommendations.push('Atenção: Email não verificado no Google');
      }
    }
    
    res.json({
      success: true,
      message: 'Teste de token Google concluído',
      data: testResult
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de token:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no teste de token',
      details: error.message
    });
  }
});

/**
 * GET /auth/debug/google-flow
 * Debug: Informações sobre o fluxo completo do Google OAuth
 */
router.get('/debug/google-flow', async (req, res) => {
  console.log('🔍 GET /debug/google-flow - Informações do fluxo Google OAuth');
  
  try {
    const flowInfo = {
      timestamp: new Date().toISOString(),
      endpoints: {
        config: {
          method: 'GET',
          url: '/api/auth/debug/google-config',
          description: 'Verificar configuração do Google OAuth'
        },
        tokenTest: {
          method: 'POST',
          url: '/api/auth/debug/google-token',
          description: 'Testar validação de token Google',
          body: { token: 'seu_google_token_aqui' }
        },
        jwtValidation: {
          method: 'POST',
          url: '/api/auth/debug/jwt-validation',
          description: 'Testar validação de token JWT',
          body: { token: 'seu_jwt_token_aqui' }
        },
        login: {
          method: 'POST',
          path: '/api/auth/login/google',
          description: 'Login principal com token Google',
          requiredFields: ['token'],
          response: 'JWT token + dados do usuário'
        },
        loginJwt: {
          method: 'POST',
          path: '/api/auth/login/google-jwt',
          description: 'Login alternativo com dados do Google',
          requiredFields: ['google_token', 'google_user'],
          response: 'JWT token + dados do usuário'
        },
        callback: {
          method: 'GET',
          path: '/api/auth/callback/google',
          description: 'Callback para OAuth flow (se usado)',
          parameters: ['code', 'state'],
          response: 'Redirecionamento ou dados'
        },
        verify: {
          method: 'GET',
          url: '/api/auth/verify',
          description: 'Verificar token JWT',
          headers: { Authorization: 'Bearer jwt_token' }
        }
      },
      configuration: {
        required: [
          'GOOGLE_CLIENT_ID',
          'JWT_SECRET',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY'
        ],
        optional: [
          'GOOGLE_CLIENT_SECRET',
          'CORS_ORIGIN',
          'NODE_ENV'
        ]
      },
      troubleshooting: {
        error403: {
          description: 'Origem não permitida',
          solutions: [
            'Configurar domínios autorizados no Google Console',
            'Adicionar URLs de desenvolvimento (localhost:3000, localhost:8080)',
            'Verificar se o Client ID está correto'
          ]
        },
        tokenInvalid: {
          description: 'Token inválido ou expirado',
          solutions: [
            'Verificar se o token foi gerado corretamente',
            'Confirmar se não expirou',
            'Testar com endpoint /debug/google-token'
          ]
        },
        undefinedToken: {
          description: 'Token com valor "undefined" salvo no localStorage',
          solutions: [
            'Limpar localStorage: localStorage.clear()',
            'Fazer novo login completo',
            'Verificar função handleAuthSuccess no frontend'
          ]
        },
        configError: {
          description: 'Erro de configuração',
          solutions: [
            'Verificar variáveis de ambiente',
            'Testar com endpoint /debug/google-config',
            'Confirmar configuração no Google Console'
          ]
        }
      },
      testFlow: {
        step1: 'Verificar configuração: GET /api/auth/debug/google-config',
        step2: 'Obter token do Google no frontend',
        step3: 'Testar token: POST /api/auth/debug/google-token',
        step4: 'Fazer login: POST /api/auth/login/google',
        step5: 'Verificar autenticação: GET /api/auth/verify',
        step6: 'Testar JWT: POST /api/auth/debug/jwt-validation'
      }
    };
    
    res.json({
      success: true,
      message: 'Informações do fluxo Google OAuth',
      data: flowInfo
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter informações do fluxo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter informações do fluxo',
      details: error.message
    });
  }
});

/**
 * POST /auth/debug/jwt-validation
 * Debug: Validar token JWT e detectar problemas como "undefined"
 */
router.post('/debug/jwt-validation', async (req, res) => {
  console.log('🔍 POST /debug/jwt-validation - Validando token JWT');
  
  try {
    const { token } = req.body;
    const { getTokenDebugInfo, validateAndDecodeJWT, sanitizeToken } = require('../utils/token-validation');
    
    console.log('📥 Token recebido para validação:', {
      exists: !!token,
      type: typeof token,
      length: token ? token.length : 0,
      preview: token ? token.substring(0, 30) + '...' : 'null'
    });
    
    // Obter informações detalhadas do token
    const debugInfo = getTokenDebugInfo(token);
    
    // Tentar sanitizar o token
    const sanitizedToken = sanitizeToken(token);
    
    // Se token foi sanitizado (removido), fornecer instruções
    if (!sanitizedToken && token) {
      debugInfo.sanitization = {
        original: token,
        sanitized: null,
        action: 'Token removido por ser inválido',
        recommendations: [
          'Limpar localStorage: localStorage.clear()',
          'Fazer novo login completo',
          'Verificar função de salvamento de token no frontend'
        ]
      };
    } else if (sanitizedToken) {
      // Validar token sanitizado
      const validation = validateAndDecodeJWT(sanitizedToken, process.env.JWT_SECRET);
      debugInfo.validation = validation;
      
      if (validation.isValid) {
        debugInfo.recommendations = [
          'Token JWT válido e funcional',
          'Pode ser usado para autenticação'
        ];
      } else {
        debugInfo.recommendations = [
          'Token possui formato correto mas falhou na validação',
          'Verificar se JWT_SECRET está correto',
          'Confirmar se token não expirou'
        ];
      }
    }
    
    console.log('✅ Validação de JWT concluída:', {
      isValid: debugInfo.validation?.isValid || false,
      error: debugInfo.validation?.error || 'Token inválido'
    });
    
    res.json({
      success: true,
      message: 'Validação de token JWT concluída',
      data: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Erro na validação de JWT:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na validação de JWT',
      details: error.message
    });
  }
});

/**
 * POST /auth/debug/cleanup-tokens
 * Debug: Utilitário para limpar tokens corrompidos (simulação do frontend)
 */
router.post('/debug/cleanup-tokens', async (req, res) => {
  console.log('🔍 POST /debug/cleanup-tokens - Simulando limpeza de tokens');
  
  try {
    const { tokens } = req.body; // { access_token, refresh_token, user }
    const { sanitizeToken } = require('../utils/token-validation');
    
    const cleanupResult = {
      timestamp: new Date().toISOString(),
      original: tokens || {},
      cleaned: {},
      actions: [],
      recommendations: []
    };
    
    if (tokens) {
      // Verificar access_token
      if (tokens.access_token) {
        const cleanedAccessToken = sanitizeToken(tokens.access_token);
        cleanupResult.cleaned.access_token = cleanedAccessToken;
        
        if (!cleanedAccessToken) {
          cleanupResult.actions.push('access_token removido (inválido)');
        } else {
          cleanupResult.actions.push('access_token mantido (válido)');
        }
      }
      
      // Verificar refresh_token
      if (tokens.refresh_token) {
        const cleanedRefreshToken = sanitizeToken(tokens.refresh_token);
        cleanupResult.cleaned.refresh_token = cleanedRefreshToken;
        
        if (!cleanedRefreshToken) {
          cleanupResult.actions.push('refresh_token removido (inválido)');
        } else {
          cleanupResult.actions.push('refresh_token mantido (válido)');
        }
      }
      
      // Verificar user data
      if (tokens.user) {
        try {
          const userData = typeof tokens.user === 'string' ? JSON.parse(tokens.user) : tokens.user;
          if (userData && typeof userData === 'object') {
            cleanupResult.cleaned.user = userData;
            cleanupResult.actions.push('user data mantido (válido)');
          } else {
            cleanupResult.actions.push('user data removido (inválido)');
          }
        } catch (error) {
          cleanupResult.actions.push('user data removido (JSON inválido)');
        }
      }
    }
    
    // Gerar recomendações
    if (cleanupResult.actions.some(action => action.includes('removido'))) {
      cleanupResult.recommendations = [
        'Execute no console do navegador: localStorage.clear()',
        'Recarregue a página: window.location.reload()',
        'Faça novo login completo',
        'Verifique a função handleAuthSuccess no frontend'
      ];
    } else {
      cleanupResult.recommendations = [
        'Tokens parecem válidos',
        'Se ainda há problemas, verifique a expiração',
        'Teste com endpoint /debug/jwt-validation'
      ];
    }
    
    console.log('✅ Simulação de limpeza concluída:', {
      actionsCount: cleanupResult.actions.length,
      hasValidTokens: !!cleanupResult.cleaned.access_token
    });
    
    res.json({
      success: true,
      message: 'Simulação de limpeza de tokens concluída',
      data: cleanupResult
    });
    
  } catch (error) {
    console.error('❌ Erro na simulação de limpeza:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na simulação de limpeza',
      details: error.message
    });
  }
});

/**
 * GET /auth/debug/cleanup-tokens
 * Limpa tokens corrompidos (simulação para frontend)
 */
router.get('/debug/cleanup-tokens', (req, res) => {
  console.log('🧹 GET /debug/cleanup-tokens - Simulando limpeza de tokens');
  
  try {
    // Simular limpeza de tokens corrompidos
    const mockCleanupResult = {
      cleaned: 3,
      errors: 0,
      keys: [
        { key: 'access_token', reason: 'valor undefined', value: 'undefined' },
        { key: 'refresh_token', reason: 'formato inválido', value: 'invalid_format' },
        { key: 'user_data', reason: 'JSON corrompido', value: '{invalid_json' }
      ],
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Simulação de limpeza de tokens concluída',
      cleanup: mockCleanupResult,
      instructions: {
        frontend: {
          usage: 'Use LocalStorageCleanup.cleanupTokens() no console do browser',
          auto_cleanup: 'LocalStorageCleanup.setupAutoCleanup(30) para limpeza automática',
          manual_clear: 'LocalStorageCleanup.clearAllAuthData(true) para limpeza total'
        },
        validation: {
          check_tokens: 'LocalStorageCleanup.validateCurrentTokens()',
          is_valid_jwt: 'LocalStorageCleanup.isValidJWTFormat(token)'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na simulação de limpeza:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na simulação de limpeza de tokens',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /auth/utils/localStorage-cleanup.js
 * Serve o utilitário de limpeza de localStorage para o frontend
 */
router.get('/utils/localStorage-cleanup.js', (req, res) => {
  console.log('📦 GET /utils/localStorage-cleanup.js - Servindo utilitário de limpeza');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const utilPath = path.join(__dirname, '..', 'utils', 'localStorage-cleanup.js');
    
    if (!fs.existsSync(utilPath)) {
      return res.status(404).json({
        success: false,
        error: 'Utilitário de limpeza não encontrado',
        code: 'CLEANUP_UTIL_NOT_FOUND'
      });
    }
    
    const utilContent = fs.readFileSync(utilPath, 'utf8');
    
    // Definir headers apropriados para JavaScript
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Adicionar comentário de cabeçalho
    const header = `/**
 * LocalStorage Cleanup Utility
 * Servido pelo backend Rosia
 * Timestamp: ${new Date().toISOString()}
 * Endpoint: /auth/utils/localStorage-cleanup.js
 */\n\n`;
    
    res.send(header + utilContent);
    
    console.log('✅ Utilitário de limpeza servido com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao servir utilitário de limpeza:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao servir utilitário de limpeza',
      details: error.message,
      code: 'CLEANUP_UTIL_SERVE_ERROR'
    });
  }
});

/**
 * POST /auth/login/google-alt
 * Login com Google (alternativo sem validação de token)
 */
router.post('/login/google-alt', async (req, res) => {
  console.log('🔍 POST /api/auth/login/google-alt - Dados recebidos:', req.body);
  
  try {
    const { google_user, google_token } = req.body;
    
    if (!google_user || !google_user.email) {
      return res.status(400).json({
        success: false,
        error: 'Dados do usuário Google são obrigatórios'
      });
    }
    
    console.log('🔍 Dados do usuário Google:', {
      email: google_user.email,
      name: google_user.name,
      picture: google_user.picture,
      email_verified: google_user.email_verified
    });
    
    // Verificar se usuário já existe no Supabase
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', google_user.email)
      .single();
    
    let user;
    
    if (existingUser) {
      console.log('✅ Usuário existente encontrado:', existingUser.email);
      user = existingUser;
      
      // Atualizar dados se necessário
      if (google_user.name && google_user.name !== existingUser.full_name) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: google_user.name,
            avatar_url: google_user.picture || null,
            last_login: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar usuário:', updateError);
        } else {
          user = updatedUser;
          console.log('✅ Dados do usuário atualizados');
        }
      }
    } else {
      console.log('🆕 Criando novo usuário Google:', google_user.email);
      
      // Criar novo usuário
      const userId = `google_${Date.now()}`;
      const { data: newUser, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: google_user.email,
          full_name: google_user.name || google_user.email.split('@')[0],
          avatar_url: google_user.picture || null,
          provider: 'google',
          google_id: google_user.id || google_user.sub,
          email_verified: google_user.email_verified || true,
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        return res.status(500).json({
          success: false,
          error: 'Erro ao criar usuário no banco de dados'
        });
      }
      
      user = newUser;
      console.log('✅ Novo usuário criado:', user.email);
    }
    
    // Gerar JWT token
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      provider: 'google'
    };
    
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    console.log('✅ Login Google alternativo realizado com sucesso para:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.nome,
        avatar: user.avatar_url,
        provider: 'google',
        emailVerified: user.email_verified
      },
      token: token,
      access_token: token,
      message: 'Login realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no login Google alternativo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor no login Google'
    });
  }
});

/**
 * POST /auth/login/google-direct
 * Login com Google (dados diretos)
 */
router.post('/login/google-direct', async (req, res) => {
  console.log('🔍 POST /api/auth/login/google-direct - Dados recebidos:', req.body);
  
  try {
    const { email, name, picture, email_verified, sub } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email é obrigatório'
      });
    }
    
    console.log('🔍 Dados do usuário Google diretos:', {
      email,
      name,
      picture,
      email_verified,
      sub
    });
    
    // Verificar se usuário já existe nas tabelas Google
    const { data: existingUser, error: fetchError } = await supabase
      .from('google_user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    let user;
    
    if (existingUser) {
      console.log('✅ Usuário existente encontrado:', existingUser.email);
      user = existingUser;
      
      // Atualizar dados se necessário
      if (name && name !== existingUser.nome) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('google_user_profiles')
          .update({
            nome: name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar usuário:', updateError);
        } else {
          user = updatedUser;
          console.log('✅ Dados do usuário atualizados');
        }
      }
    } else {
      console.log('🆕 Criando novo usuário Google:', email);
      
      // Criar novo perfil na tabela google_user_profiles
      const { data: createdUser, error: createError } = await supabase
        .from('google_user_profiles')
        .insert({
          google_id: sub || req.body.google_id,
          email: email,
          nome: name || email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar usuário:', createError);
        return res.status(500).json({ success: false, error: 'Erro ao criar usuário no banco de dados' });
      }
      
      user = createdUser;
      console.log('✅ Novo usuário criado:', user.email);
    }
    
    // Gerar JWT token
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      provider: 'google'
    };
    
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    console.log('✅ Login Google direto realizado com sucesso para:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.nome,
        provider: 'google',
        isGoogleUser: true
      },
      token: token,
      access_token: token,
      message: 'Login realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no login Google direto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor no login Google'
    });
  }
});

/**
 * POST /auth/login/google-separated
 * Login Google usando tabelas separadas (google_user_profiles)
 */
router.post('/login/google-separated', async (req, res) => {
  console.log('🔍 POST /api/auth/login/google-separated - Dados recebidos:', req.body);
  
  try {
    const { email, name, picture, email_verified, sub } = req.body;
    
    if (!email || !sub) {
      return res.status(400).json({
        success: false,
        error: 'Email e Google ID são obrigatórios'
      });
    }
    
    console.log('🔍 Dados do usuário Google:', {
      email,
      name,
      picture,
      email_verified,
      sub
    });
    
    // Verificar se usuário já existe na tabela google_user_profiles
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('google_user_profiles')
      .select('*')
      .eq('google_id', sub)
      .single();
    
    let user;
    
    if (existingUser) {
      console.log('✅ Usuário Google existente encontrado:', existingUser.email);
      user = existingUser;
      
      // Atualizar dados se necessário
      const updateData = {};
      if (name && name !== existingUser.nome) {
        updateData.nome = name;
      }
      if (email && email !== existingUser.email) {
        updateData.email = email;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('google_user_profiles')
          .update(updateData)
          .eq('id', existingUser.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar usuário Google:', updateError);
        } else {
          user = updatedUser;
          console.log('✅ Dados do usuário Google atualizados');
        }
      }
    } else {
      console.log('🆕 Criando novo usuário Google:', email);
      
      // Verificar se já existe usuário com este email
      const { data: existingByEmail } = await supabaseAdmin
        .from('google_user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingByEmail) {
        // Atualizar com o google_id se o usuário existe mas não tem google_id
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('google_user_profiles')
          .update({
            google_id: sub,
            nome: name || existingByEmail.nome
          })
          .eq('id', existingByEmail.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erro ao atualizar usuário existente com Google ID:', updateError);
          return res.status(500).json({ success: false, error: 'Erro ao vincular conta Google' });
        }
        
        user = updatedUser;
        console.log('✅ Usuário existente vinculado ao Google');
      } else {
        // Criar novo usuário na tabela google_user_profiles
        const { data: createdUser, error: createError } = await supabaseAdmin
          .from('google_user_profiles')
          .insert({
            google_id: sub,
            email: email,
            nome: name || email.split('@')[0]
          })
          .select()
          .single();
        
        if (createError) {
          console.error('❌ Erro ao criar usuário Google:', createError);
          return res.status(500).json({ success: false, error: 'Erro ao criar usuário Google no banco de dados' });
        }
        
        user = createdUser;
        console.log('✅ Novo usuário Google criado:', user.email);
      }
    }
    
    // Gerar JWT token específico para usuários Google
    const jwtPayload = {
      googleUserId: user.id,
      googleId: user.google_id,
      email: user.email,
      provider: 'google-separated'
    };
    
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    console.log('✅ Login Google separado realizado com sucesso para:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        google_id: user.google_id,
        email: user.email,
        name: user.nome,
        provider: 'google-separated',
        emailVerified: true
      },
      token: token,
      access_token: token,
      message: 'Login Google realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no login Google separado:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor no login Google'
    });
  }
});

module.exports = router;

