const { supabase, supabaseAdmin } = require('../config/supabase')
const { verifyGoogleToken } = require('../utils/google-auth');
const jwt = require('jsonwebtoken');
const { findUserById } = require('../db/user-queries');
const { checkIfTokenInvalidated } = require('../utils/tokenManager');
const { validateJWTFormat, sanitizeToken, getTokenDebugInfo } = require('../utils/token-validation');

/**
 * Middleware para autenticar usuário usando JWT personalizado com validação robusta
 */
const authenticateToken = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // ✅ LOGS DE DEBUG MELHORADOS
  console.log('🔐 Auth Debug - Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    contentType: req.headers['content-type']
  });
  console.log('🔐 Auth Debug - Token:', {
    provided: !!token,
    length: token?.length,
    preview: token ? `${token.substring(0, 20)}...` : 'N/A',
    isUndefined: token === 'undefined',
    isNull: token === null,
    isEmpty: token === ''
  });
  console.log('🔐 Auth Debug - JWT_SECRET:', {
    configured: !!process.env.JWT_SECRET,
    length: process.env.JWT_SECRET?.length || 0
  });

  if (!token) {
    console.log('❌ Auth Error: Token não fornecido');
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido',
      code: 'MISSING_TOKEN',
      debug: {
        authHeader: !!authHeader,
        headerFormat: authHeader ? 'Bearer token expected' : 'Authorization header missing'
      }
    });
  }

  // Sanitizar token para evitar valores 'undefined' ou inválidos
  const sanitizedToken = sanitizeToken(token);
  if (!sanitizedToken) {
    console.error('❌ Token inválido após sanitização:', {
      originalToken: token.substring(0, 20) + '...',
      tokenLength: token.length,
      isUndefined: token === 'undefined',
      isEmpty: token === ''
    });
    
    return res.status(401).json({
      success: false,
      message: 'Token fornecido é inválido',
      code: 'INVALID_TOKEN_FORMAT',
      debug: {
        tokenLength: token.length,
        isUndefined: token === 'undefined',
        isEmpty: token === '',
        suggestion: 'Verifique se o token não é "undefined" antes de enviar'
      }
    });
  }
  
  token = sanitizedToken;

  // Validação completa do token JWT
  const tokenValidation = validateJWTFormat(token);
  if (!tokenValidation.isValid) {
    console.error('❌ Token JWT com formato inválido:', tokenValidation);
    return res.status(401).json({
      success: false,
      message: 'Token JWT com formato inválido',
      code: 'MALFORMED_JWT',
      debug: tokenValidation.debug
    });
  }

  try {
    console.log('🔍 Verificando token JWT...');
    
    // Verificar se o token foi invalidado
    const isInvalidated = await checkIfTokenInvalidated(token);
    if (isInvalidated) {
      console.log('❌ Token foi invalidado (logout realizado)');
      return res.status(401).json({ 
        success: false, 
        message: 'Token foi invalidado. Faça login novamente.',
        code: 'TOKEN_INVALIDATED'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validar campos obrigatórios no payload
    if (!decoded.userId || !decoded.email) {
      throw new Error('Token não contém informações de usuário válidas');
    }
    
    console.log('✅ Token JWT válido:', { 
      userId: decoded.userId, 
      email: decoded.email,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'não definido',
      iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'não definido',
      timeUntilExpiry: decoded.exp ? Math.floor((decoded.exp * 1000 - Date.now()) / 1000) + 's' : 'N/A'
    });
    
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      console.log('❌ Usuário não encontrado no banco:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND',
        debug: {
          userId: decoded.userId,
          suggestion: 'Usuário pode ter sido removido do sistema'
        }
      });
    }

    console.log('✅ Usuário autenticado:', { id: user.id, email: user.email });
    req.user = user;
    req.userId = user.id;
    req.token = token;
    req.tokenPayload = decoded;
    req.authDebug = {
      tokenValidation,
      sanitized: true,
      middleware: 'authenticateToken',
      timestamp: new Date().toISOString()
    };
    next();
  } catch (error) {
    console.log('❌ Erro na validação do token:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });
    
    // Gerar informações de debug detalhadas
    const debugInfo = getTokenDebugInfo(token);
    
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido ou expirado',
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      debug: {
        ...debugInfo,
        jwtError: error.name,
        suggestion: error.name === 'TokenExpiredError' 
          ? 'Token expirado, faça login novamente'
          : 'Token inválido, limpe o localStorage e faça login novamente'
      }
    });
  }
};

/**
 * Middleware para autenticar usuário aceitando JWT local e token do Supabase
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth Debug - Headers:', {
      authorization: authHeader ? 'Present' : 'Missing',
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      contentType: req.headers['content-type']
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth: Token de acesso ausente ou formato inválido');
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7);
    
    console.log('🔐 Auth Debug - Token:', {
      provided: !!token,
      length: token?.length,
      preview: token ? `${token.substring(0, 20)}...` : 'N/A'
    });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.userId || !decoded.email) {
        throw new Error('Payload inválido');
      }
      const user = await findUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      req.user = user;
      req.userId = user.id;
      req.provider = 'local-jwt';
      return next();
    } catch (jwtErr) {
      
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Supabase Auth Error:', {
        error: error?.message || 'Usuário não encontrado',
        user: !!user,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A'
      });
      return res.status(401).json({ 
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = user;
    req.userId = user.id;
    req.provider = 'supabase';
    
    next();
    
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware opcional para autenticação (não bloqueia se não autenticado)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    console.error('Erro na autenticação opcional:', error);
    next(); // Continua mesmo com erro
  }
};

/**
 * Middleware para verificar se o usuário é administrador
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar se é um admin_token (formato base64 com dados do admin)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [adminId, email, timestamp] = decoded.split(':');
      
      if (adminId && email && timestamp) {
        // Verificar se o token não expirou (24 horas)
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        
        if (tokenAge > maxAge) {
          return res.status(401).json({ 
            error: 'Token admin expirado',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        // Verificar se o admin ainda está ativo
        const { data: adminCheck, error: adminError } = await supabase
          .from('admin_users')
          .select('id, email, user_id')
          .eq('id', adminId)
          .eq('email', email)
          .eq('active', true)
          .single();

        if (adminError || !adminCheck) {
          return res.status(403).json({ 
            error: 'Admin não encontrado ou inativo',
            code: 'ADMIN_INACTIVE'
          });
        }

        // Adicionar dados do admin ao request
        req.adminId = adminCheck.id;
        req.userId = adminCheck.user_id;
        req.userEmail = adminCheck.email;
        req.isAdmin = true;
        
        return next();
      }
    } catch (decodeError) {
      // Se não conseguir decodificar como admin_token, tenta como JWT do Supabase
    }

    // Verificar token JWT do Supabase (fallback para compatibilidade)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }

    // Verificar se o usuário é admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('active', true)
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores podem acessar esta rota.',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Adicionar usuário e flag de admin ao request
    req.user = user;
    req.userId = user.id;
    req.isAdmin = true;
    
    next();
  } catch (error) {
    console.error('Erro na autenticação de admin:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware para verificar se o usuário atual é admin (sem bloquear)
 */
const checkAdminStatus = async (req, res, next) => {
  try {
    if (req.userId) {
      const { data: adminCheck, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', req.userId)
        .eq('active', true)
        .single();

      req.isAdmin = !adminError && adminCheck;
    } else {
      req.isAdmin = false;
    }
    
    next();
  } catch (error) {
    console.error('Erro ao verificar status de admin:', error);
    req.isAdmin = false;
    next();
  }
};

/**
 * Middleware para autenticar usuários Google usando tabelas separadas
 */
const authenticateGoogleUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Google Auth - Validando JWT local:', {
    hasHeader: !!authHeader,
    hasToken: !!token,
    tokenLength: token?.length
  });

  if (!token) {
    console.log('❌ Google Auth Error: Token não fornecido');
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido para usuários Google',
      code: 'MISSING_GOOGLE_TOKEN'
    });
  }

  try {
    console.log('🔍 Validando JWT local gerado pelo backend...');
    
    // Validar JWT local (gerado pelo backend)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('✅ JWT local válido:', {
      googleId: decoded.googleId,
      email: decoded.email,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    // Buscar dados do perfil na tabela google_user_profiles usando google_id
    const { data: profileData, error: profileError } = await supabase
      .from('google_user_profiles')
      .select('*')
      .eq('google_id', decoded.googleId)
      .single();

    if (profileError || !profileData) {
      console.log('❌ Perfil Google não encontrado:', {
        googleId: decoded.googleId,
        error: profileError?.message
      });
      return res.status(404).json({
        success: false,
        message: 'Perfil Google não encontrado',
        code: 'GOOGLE_PROFILE_NOT_FOUND'
      });
    }

    // Buscar endereço do usuário (se existir)
    const { data: addressData, error: addressError } = await supabase
      .from('google_user_addresses')
      .select('*')
      .eq('google_user_id', profileData.id)
      .single();

    // Preparar dados do usuário com perfil e endereço
    const userData = {
      id: profileData.id,
      google_id: profileData.google_id,
      email: profileData.email,
      nome: profileData.nome,
      telefone: profileData.telefone,
      cpf: profileData.cpf,
      data_nascimento: profileData.data_nascimento,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      isGoogleUser: true,
      address: null
    };

    // Adicionar endereço se existir
    if (!addressError && addressData) {
      userData.address = {
        id: addressData.id,
        logradouro: addressData.logradouro,
        numero: addressData.numero,
        bairro: addressData.bairro,
        cidade: addressData.cidade,
        estado: addressData.estado,
        cep: addressData.cep,
        complemento: addressData.complemento,
        created_at: addressData.created_at,
        updated_at: addressData.updated_at
      };
    }
    
    console.log('✅ Dados do usuário Google carregados:', {
      id: userData.id,
      email: userData.email,
      hasAddress: !!userData.address
    });
    
    // Adicionar dados completos do usuário à requisição
    req.user = userData;
    req.userId = userData.id;

    next();
    
  } catch (jwtError) {
    console.log('❌ JWT local inválido:', {
      error: jwtError.message,
      name: jwtError.name
    });
    
    return res.status(401).json({
      success: false,
      message: 'Token inválido para usuários Google',
      code: 'INVALID_GOOGLE_TOKEN',
      debug: { error: jwtError.message },
      action: 'REDIRECT_TO_LOGIN'
    });
  }
};

// Novo middleware: autenticação via token do Supabase (admin) e perfil Google
const authenticateSupabaseGoogleUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token ausente', code: 'MISSING_TOKEN' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    let email;
    let googleId;

    if (!error && user) {
      email = user.email;
      googleId = user?.user_metadata?.sub || (Array.isArray(user?.identities) ? user.identities[0]?.identity_data?.sub : null);
      req.supabaseUser = user;
      req.supabaseAuthUser = user;
    } else {
      let payload;
      try {
        payload = await verifyGoogleToken(token);
      } catch (verifyErr) {
        return res.status(401).json({ success: false, message: 'Token inválido', code: 'INVALID_TOKEN' });
      }
      email = payload?.email;
      googleId = payload?.sub || null;
      req.supabaseUser = null;
      req.supabaseAuthUser = null;
    }

    // Buscar perfil Google por email (fallback para google_id)
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('google_user_profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if ((!profile || profileError) && googleId) {
      const { data: profileByGoogle, error: profileGoogleErr } = await supabaseAdmin
        .from('google_user_profiles')
        .select('*')
        .eq('google_id', googleId)
        .maybeSingle();
      profile = profileByGoogle;
      profileError = profileGoogleErr;
    }

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Perfil Google não encontrado',
        code: 'GOOGLE_PROFILE_NOT_FOUND'
      });
    }

    const { data: addressData } = await supabaseAdmin
      .from('google_user_addresses')
      .select('*')
      .eq('google_user_id', profile.id)
      .maybeSingle();

    const userData = {
      id: profile.id,
      google_id: profile.google_id,
      email: profile.email,
      nome: profile.nome,
      telefone: profile.telefone,
      cpf: profile.cpf,
      data_nascimento: profile.data_nascimento,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      isGoogleUser: true,
      address: addressData || null
    };

    req.user = userData;
    req.userId = userData.id;

    next();
  } catch (e) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
      code: 'INVALID_TOKEN',
      debug: { error: e.message }
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateUser,
  optionalAuth,
  authenticateAdmin,
  checkAdminStatus,
  authenticateGoogleUser,
  authenticateSupabaseGoogleUser
};

