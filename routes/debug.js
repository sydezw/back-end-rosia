const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { findUserById } = require('../db/user-queries');
const { checkIfTokenInvalidated, getTokenStats } = require('../utils/tokenManager');
const router = express.Router();

/**
 * GET /debug/token
 * Endpoint temporário para debug de tokens JWT
 */
router.get('/token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔧 Debug Token - Headers:', req.headers);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin
      },
      token: {
        provided: !!token,
        length: token?.length,
        preview: token ? `${token.substring(0, 30)}...` : 'N/A'
      },
      environment: {
        jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Missing',
        supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    if (!token) {
      return res.json({
        ...debugInfo,
        status: 'ERROR',
        message: 'Token não fornecido'
      });
    }
    
    // Testar validação JWT personalizado
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      debugInfo.jwt = {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        iat: decoded.iat,
        exp: decoded.exp,
        expired: Date.now() >= decoded.exp * 1000
      };
      
      // Testar busca do usuário no banco
      const user = await findUserById(decoded.userId);
      debugInfo.database = {
        userFound: !!user,
        userId: user?.id,
        userEmail: user?.email
      };
      
    } catch (jwtError) {
      debugInfo.jwt = {
        valid: false,
        error: jwtError.message,
        name: jwtError.name
      };
    }
    
    // Testar validação com Supabase (se aplicável)
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      debugInfo.supabase = {
        valid: !error && !!user,
        error: error?.message,
        userId: user?.id,
        userEmail: user?.email
      };
    } catch (supabaseError) {
      debugInfo.supabase = {
        valid: false,
        error: supabaseError.message
      };
    }
    
    res.json({
      ...debugInfo,
      status: 'SUCCESS',
      message: 'Debug completo'
    });
    
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro interno no debug',
      error: error.message
    });
  }
});

/**
 * GET /debug/env
 * Verificar variáveis de ambiente (sem expor valores)
 */
router.get('/env', (req, res) => {
  const envVars = {
    JWT_SECRET: process.env.JWT_SECRET ? 'Configured' : 'Missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    PORT: process.env.PORT || 'Not set'
  };
  
  res.json({
    status: 'SUCCESS',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para testar configuração do Supabase
router.get('/supabase-config', (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL ? 'Configurado' : 'Não configurado',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'Não configurado',
    url_preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'N/A'
  });
});

// Endpoint para testar token do Supabase
router.post('/test-supabase-token', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Verificar configuração do Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: 'Configuração do Supabase incompleta',
        code: 'SUPABASE_CONFIG_ERROR',
        details: {
          url: !!process.env.SUPABASE_URL,
          anon_key: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }

    // Tentar fazer login com Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        error: `Erro no login: ${error.message}`,
        code: 'LOGIN_ERROR',
        details: error
      });
    }

    if (!data.session || !data.session.access_token) {
      return res.status(400).json({
        error: 'Sessão ou token não encontrado',
        code: 'NO_SESSION'
      });
    }

    // Verificar se o token é válido
    const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
    
    if (userError) {
      return res.status(400).json({
        error: `Token inválido: ${userError.message}`,
        code: 'INVALID_TOKEN',
        details: userError
      });
    }

    res.json({
      success: true,
      message: 'Token gerado e validado com sucesso',
      token: data.session.access_token,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        created_at: userData.user.created_at
      },
      expires_at: data.session.expires_at
    });

  } catch (error) {
    console.error('Erro no teste de token Supabase:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Endpoint para testar validação de token específico
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório',
        code: 'MISSING_TOKEN'
      });
    }

    // Testar validação do token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return res.status(401).json({
        error: `Token inválido: ${error.message}`,
        code: 'INVALID_TOKEN',
        details: error
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Token válido',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    });

  } catch (error) {
    console.error('Erro na validação de token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Endpoint para testar middleware de autenticação com sistema de invalidação
router.get('/test-auth-middleware', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Debug Auth Middleware:');
    console.log('- Authorization Header:', authHeader ? 'Presente' : 'Ausente');
    console.log('- Header completo:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso requerido',
        debug: {
          hasHeader: !!authHeader,
          startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
          headerValue: authHeader || 'null'
        }
      });
    }

    const token = authHeader.substring(7);
    console.log('- Token extraído:', token.substring(0, 20) + '...');
    
    // Verificar se o token foi invalidado
    const isInvalidated = await checkIfTokenInvalidated(token);
    console.log('- Token invalidado?', isInvalidated);
    
    if (isInvalidated) {
      return res.status(401).json({
        success: false,
        error: 'Token foi invalidado (logout realizado)',
        code: 'TOKEN_INVALIDATED',
        debug: {
          tokenLength: token.length,
          invalidated: true,
          tokenStats: getTokenStats()
        }
      });
    }
    
    // Verificar se é um JWT personalizado
    let isCustomJWT = false;
    let jwtUser = null;
    
    try {
      if (process.env.JWT_SECRET) {
        jwtUser = jwt.verify(token, process.env.JWT_SECRET);
        isCustomJWT = true;
        console.log('- JWT personalizado válido:', { userId: jwtUser.userId, email: jwtUser.email });
        
        // Buscar usuário no banco
        const user = await findUserById(jwtUser.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'Usuário não encontrado no banco',
            code: 'USER_NOT_FOUND',
            debug: {
              tokenType: 'custom_jwt',
              userId: jwtUser.userId
            }
          });
        }
        
        return res.json({
          success: true,
          message: 'Token JWT personalizado válido e middleware funcionando',
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          debug: {
            tokenType: 'custom_jwt',
            tokenLength: token.length,
            invalidated: false,
            tokenStats: getTokenStats()
          }
        });
      }
    } catch (jwtError) {
      console.log('- Não é JWT personalizado, testando com Supabase...');
    }
    
    // Verificar configuração do Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuração do Supabase não encontrada',
        config: {
          url: !!process.env.SUPABASE_URL,
          key: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }
    
    // Testar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('- Resultado Supabase:', { user: !!user, error: !!error });
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
        debug: {
          tokenType: 'supabase',
          supabaseError: error ? error.message : null,
          hasUser: !!user,
          tokenLength: token.length,
          invalidated: false,
          tokenStats: getTokenStats()
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Token Supabase válido e middleware funcionando',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      debug: {
        tokenType: 'supabase',
        tokenLength: token.length,
        supabaseConnected: true,
        invalidated: false,
        tokenStats: getTokenStats()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Endpoint para obter estatísticas dos tokens invalidados
router.get('/token-stats', (req, res) => {
  try {
    const stats = getTokenStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;