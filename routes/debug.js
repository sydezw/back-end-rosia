const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { findUserById } = require('../db/user-queries');
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

module.exports = router;