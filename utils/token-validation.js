/**
 * Utilitário para validação e limpeza de tokens
 * Implementa as correções do SOLUCAO-TOKEN-UNDEFINED.md
 */

const jwt = require('jsonwebtoken');

/**
 * Valida se um token é um JWT válido
 * @param {string} token - Token a ser validado
 * @returns {Object} Resultado da validação
 */
const validateJWTFormat = (token) => {
  console.log('🔍 Validando formato do token:', {
    exists: !!token,
    type: typeof token,
    length: token ? token.length : 0,
    preview: token ? token.substring(0, 20) + '...' : 'null'
  });

  // Verificar se token existe
  if (!token) {
    return {
      isValid: false,
      error: 'Token não fornecido',
      type: 'MISSING_TOKEN'
    };
  }

  // Verificar se não é string "undefined"
  if (token === 'undefined' || token === 'null') {
    return {
      isValid: false,
      error: 'Token com valor inválido (string "undefined" ou "null")',
      type: 'INVALID_STRING_VALUE'
    };
  }

  // Verificar se é string
  if (typeof token !== 'string') {
    return {
      isValid: false,
      error: 'Token deve ser uma string',
      type: 'INVALID_TYPE'
    };
  }

  // Verificar formato JWT (deve ter 3 partes separadas por pontos)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      isValid: false,
      error: 'Token não possui formato JWT válido (deve ter 3 partes)',
      type: 'INVALID_JWT_FORMAT'
    };
  }

  // Verificar se as partes não estão vazias
  if (parts.some(part => !part || part.length === 0)) {
    return {
      isValid: false,
      error: 'Token JWT possui partes vazias',
      type: 'EMPTY_JWT_PARTS'
    };
  }

  return {
    isValid: true,
    message: 'Token possui formato JWT válido'
  };
};

/**
 * Valida e decodifica um token JWT
 * @param {string} token - Token JWT
 * @param {string} secret - Chave secreta para validação
 * @returns {Object} Resultado da validação e payload
 */
const validateAndDecodeJWT = (token, secret) => {
  console.log('🔍 Validando e decodificando JWT');

  // Primeiro validar formato
  const formatValidation = validateJWTFormat(token);
  if (!formatValidation.isValid) {
    return formatValidation;
  }

  try {
    // Tentar decodificar sem verificar assinatura primeiro
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return {
        isValid: false,
        error: 'Não foi possível decodificar o token',
        type: 'DECODE_ERROR'
      };
    }

    console.log('✅ Token decodificado:', {
      userId: decoded.userId,
      email: decoded.email,
      exp: decoded.exp,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });

    // Verificar se token não expirou
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return {
        isValid: false,
        error: 'Token expirado',
        type: 'EXPIRED_TOKEN',
        payload: decoded,
        expiredAt: new Date(decoded.exp * 1000).toISOString()
      };
    }

    // Verificar assinatura se secret fornecido
    if (secret) {
      try {
        const verified = jwt.verify(token, secret);
        return {
          isValid: true,
          payload: verified,
          message: 'Token válido e verificado'
        };
      } catch (verifyError) {
        return {
          isValid: false,
          error: 'Assinatura do token inválida',
          type: 'INVALID_SIGNATURE',
          payload: decoded,
          details: verifyError.message
        };
      }
    }

    return {
      isValid: true,
      payload: decoded,
      message: 'Token decodificado com sucesso (assinatura não verificada)'
    };

  } catch (error) {
    console.error('❌ Erro ao validar JWT:', error);
    return {
      isValid: false,
      error: 'Erro ao processar token JWT',
      type: 'PROCESSING_ERROR',
      details: error.message
    };
  }
};

/**
 * Gera informações de debug para um token
 * @param {string} token - Token a ser analisado
 * @returns {Object} Informações detalhadas do token
 */
const getTokenDebugInfo = (token) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    tokenAnalysis: {
      exists: !!token,
      type: typeof token,
      length: token ? token.length : 0,
      preview: token ? token.substring(0, 30) + '...' : 'null',
      isUndefinedString: token === 'undefined',
      isNullString: token === 'null',
      isEmpty: !token || token.length === 0
    }
  };

  if (token) {
    const validation = validateJWTFormat(token);
    debugInfo.formatValidation = validation;

    if (validation.isValid) {
      const decodeResult = validateAndDecodeJWT(token);
      debugInfo.decodeResult = decodeResult;
    }
  }

  return debugInfo;
};

/**
 * Sanitiza um token removendo valores inválidos
 * @param {any} token - Token a ser sanitizado
 * @returns {string|null} Token sanitizado ou null
 */
const sanitizeToken = (token) => {
  // Se não existe, retorna null
  if (!token) {
    return null;
  }

  // Se é string "undefined" ou "null", retorna null
  if (token === 'undefined' || token === 'null') {
    console.log('⚠️ Token sanitizado: removendo string inválida:', token);
    return null;
  }

  // Se não é string, retorna null
  if (typeof token !== 'string') {
    console.log('⚠️ Token sanitizado: tipo inválido:', typeof token);
    return null;
  }

  // Se é string vazia, retorna null
  if (token.trim().length === 0) {
    console.log('⚠️ Token sanitizado: string vazia');
    return null;
  }

  // Verificar formato JWT básico
  const formatValidation = validateJWTFormat(token);
  if (!formatValidation.isValid) {
    console.log('⚠️ Token sanitizado: formato inválido:', formatValidation.error);
    return null;
  }

  return token;
};

/**
 * Middleware para validar tokens em requisições
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const validateTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Token de autorização não fornecido',
      type: 'MISSING_AUTH_HEADER'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Formato de autorização inválido. Use: Bearer <token>',
      type: 'INVALID_AUTH_FORMAT'
    });
  }

  const token = authHeader.substring(7);
  const validation = validateAndDecodeJWT(token, process.env.JWT_SECRET);

  if (!validation.isValid) {
    return res.status(401).json({
      success: false,
      error: validation.error,
      type: validation.type,
      details: validation.details
    });
  }

  req.user = validation.payload;
  req.tokenInfo = validation;
  next();
};

module.exports = {
  validateJWTFormat,
  validateAndDecodeJWT,
  getTokenDebugInfo,
  sanitizeToken,
  validateTokenMiddleware
};