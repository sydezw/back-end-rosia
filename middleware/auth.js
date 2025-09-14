const { supabase } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { findUserById } = require('../db/user-queries');
const { checkIfTokenInvalidated } = require('../utils/tokenManager');

/**
 * Middleware para autenticar usuário usando JWT personalizado
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Log para debug
  console.log('🔐 Auth Debug - Headers:', {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin
  });
  console.log('🔐 Auth Debug - Token:', {
    provided: !!token,
    length: token?.length,
    preview: token ? `${token.substring(0, 20)}...` : 'N/A'
  });

  if (!token) {
    console.log('❌ Auth Error: Token não fornecido');
    return res.status(401).json({ 
      success: false, 
      message: 'Token de acesso requerido',
      code: 'MISSING_TOKEN'
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
    console.log('✅ Token JWT válido:', { userId: decoded.userId, email: decoded.email });
    
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      console.log('❌ Usuário não encontrado no banco:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('✅ Usuário autenticado:', { id: user.id, email: user.email });
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.log('❌ Erro na validação do token:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });
    return res.status(403).json({ 
      success: false, 
      message: 'Token inválido ou expirado',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware para autenticar usuário usando JWT do Supabase (mantido para compatibilidade)
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    req.userId = user.id;
    
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

module.exports = {
  authenticateToken,
  authenticateUser,
  optionalAuth,
  authenticateAdmin,
  checkAdminStatus
};