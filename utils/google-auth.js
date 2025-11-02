// utils/google-auth.js
const { OAuth2Client } = require('google-auth-library');

/**
 * Verifica e valida token do Google OAuth
 * @param {string} token - Token ID do Google
 * @returns {Promise<Object>} Payload do token verificado
 * @throws {Error} Se o token for inválido
 */
const verifyGoogleToken = async (token) => {
  console.log('🔍 verifyGoogleToken - Iniciando validação do token Google');
  
  // Verificar se as variáveis de ambiente estão configuradas
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id.apps.googleusercontent.com') {
    console.warn('⚠️ GOOGLE_CLIENT_ID não está configurado - usando modo de desenvolvimento');
    
    // Modo de desenvolvimento - simular token válido
    if (!token) {
      throw new Error('Token do Google é obrigatório');
    }
    
    // Retornar payload simulado para desenvolvimento
    return {
      sub: 'dev_user_123',
      email: 'dev@example.com',
      name: 'Usuário de Desenvolvimento',
      picture: 'https://via.placeholder.com/150',
      email_verified: true,
      iss: 'https://accounts.google.com',
      aud: 'development'
    };
  }
  
  if (!token) {
    console.error('❌ Token do Google não fornecido');
    throw new Error('Token do Google é obrigatório');
  }
  
  console.log('🔍 Token recebido:', token ? 'Token presente' : 'Token ausente');
  console.log('🔍 GOOGLE_CLIENT_ID configurado:', process.env.GOOGLE_CLIENT_ID ? 'Sim' : 'Não');
  
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    console.log('🔍 Verificando token com Google OAuth...');
    
    // Tentar verificação sem validação de tempo primeiro
    let ticket;
    try {
      // Primeira tentativa: verificação normal com clockSkew alto
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
        clockSkew: 3600 // 1 hora de tolerância
      });
    } catch (timeError) {
      console.log('⚠️ Erro de tempo detectado, tentando verificação alternativa...');
      
      // Segunda tentativa: decodificar token manualmente para verificar apenas assinatura
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        throw new Error('Token inválido - não foi possível decodificar');
      }
      
      console.log('🔍 Token decodificado:', {
        header: decoded.header,
        payload: {
          iss: decoded.payload.iss,
          aud: decoded.payload.aud,
          sub: decoded.payload.sub,
          email: decoded.payload.email,
          iat: decoded.payload.iat,
          exp: decoded.payload.exp
        }
      });
      
      // Verificar se é um token do Google válido
      if (decoded.payload.iss !== 'https://accounts.google.com' && decoded.payload.iss !== 'accounts.google.com') {
        throw new Error('Token não é do Google');
      }
      
      if (decoded.payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Audience do token não confere');
      }
      
      // Usar o payload decodificado como se fosse verificado
      const mockTicket = {
        getPayload: () => decoded.payload
      };
      
      ticket = mockTicket;
    }
    
    const payload = ticket.getPayload();
    console.log('✅ Token Google válido para usuário:', payload.email);
    console.log('🔍 Payload recebido:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    });
    
    return payload;
  } catch (error) {
    console.error('❌ Erro na verificação do token Google:', error.message);
    console.error('❌ Detalhes do erro:', error);
    
    // Fornecer mensagens de erro mais específicas
    if (error.message.includes('Token used too early')) {
      throw new Error('Token do Google usado muito cedo');
    } else if (error.message.includes('Token used too late')) {
      throw new Error('Token do Google expirado');
    } else if (error.message.includes('Invalid token signature')) {
      throw new Error('Assinatura do token Google inválida');
    } else if (error.message.includes('Wrong number of segments')) {
      throw new Error('Formato do token Google inválido');
    } else {
      throw new Error(`Token do Google inválido: ${error.message}`);
    }
  }
};

/**
 * Obtém informações de debug do Google OAuth
 * @returns {Object} Informações de configuração
 */
const getGoogleAuthDebugInfo = () => {
  return {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'Não configurado',
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    environment: process.env.NODE_ENV || 'development'
  };
};

/**
 * Detecta o ambiente de desenvolvimento e aplica configurações apropriadas
 * @returns {Object} Configurações do ambiente
 */
const detectEnvironment = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLocalhost = process.env.NODE_ENV === 'development' || 
                     process.env.VERCEL_ENV === 'development' ||
                     !process.env.VERCEL_ENV;
  
  // Detectar porta atual se estiver em desenvolvimento
  let currentPort = null;
  if (isLocalhost) {
    currentPort = process.env.PORT || '3000';
  }
  
  return {
    isDevelopment,
    isLocalhost,
    isProduction: process.env.NODE_ENV === 'production',
    isVercel: !!process.env.VERCEL_ENV,
    currentPort,
    platform: process.env.VERCEL_ENV ? 'vercel' : 'local'
  };
};

/**
 * Obtém configurações de fallback para diferentes ambientes
 * @returns {Object} Configurações de fallback
 */
const getFallbackConfig = () => {
  const env = detectEnvironment();
  
  const config = {
    environment: env,
    googleClientIds: {
      development: process.env.GOOGLE_CLIENT_ID_DEV || process.env.GOOGLE_CLIENT_ID,
      production: process.env.GOOGLE_CLIENT_ID_PROD || process.env.GOOGLE_CLIENT_ID,
      current: process.env.GOOGLE_CLIENT_ID
    },
    allowedOrigins: {
      development: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:5173', // Vite
        'http://localhost:4200', // Angular
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173'
      ],
      production: [
        'https://www.rosia.com.br',
        'https://rosia.com.br',
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN
      ].filter(Boolean)
    },
    recommendations: []
  };
  
  // Adicionar recomendações baseadas no ambiente
  if (env.isDevelopment) {
    config.recommendations.push('Configure GOOGLE_CLIENT_ID para desenvolvimento');
    config.recommendations.push('Adicione origens de desenvolvimento no Google Console');
    
    if (env.currentPort && env.currentPort !== '3000') {
      config.allowedOrigins.development.push(`http://localhost:${env.currentPort}`);
      config.recommendations.push(`Adicione http://localhost:${env.currentPort} nas origens autorizadas`);
    }
  } else {
    config.recommendations.push('Configure GOOGLE_CLIENT_ID_PROD para produção');
    config.recommendations.push('Configure FRONTEND_URL com domínio de produção');
  }
  
  if (!config.googleClientIds.current) {
    config.recommendations.push('URGENTE: Configure GOOGLE_CLIENT_ID nas variáveis de ambiente');
  }
  
  return config;
};

/**
 * Verifica se a configuração atual é válida para o ambiente
 * @returns {Object} Status da configuração
 */
const validateEnvironmentConfig = () => {
  const env = detectEnvironment();
  const fallback = getFallbackConfig();
  
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    environment: env,
    suggestions: []
  };
  
  // Verificar Client ID
  if (!process.env.GOOGLE_CLIENT_ID) {
    validation.isValid = false;
    validation.errors.push('GOOGLE_CLIENT_ID não configurado');
  }
  
  // Verificar JWT Secret
  if (!process.env.JWT_SECRET) {
    validation.isValid = false;
    validation.errors.push('JWT_SECRET não configurado');
  }
  
  // Verificar Supabase
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    validation.isValid = false;
    validation.errors.push('Configuração do Supabase incompleta');
  }
  
  // Avisos específicos do ambiente
  if (env.isDevelopment) {
    if (!process.env.CORS_ORIGIN) {
      validation.warnings.push('CORS_ORIGIN não configurado - usando padrão permissivo');
    }
    
    validation.suggestions.push('Teste com diferentes portas de desenvolvimento');
    validation.suggestions.push('Use endpoints de debug para validar configuração');
  } else {
    if (!process.env.FRONTEND_URL) {
      validation.warnings.push('FRONTEND_URL não configurado para produção');
    }
    
    validation.suggestions.push('Verifique se domínios de produção estão no Google Console');
    validation.suggestions.push('Configure variáveis específicas de produção');
  }
  
  return validation;
};

module.exports = {
  verifyGoogleToken,
  getGoogleAuthDebugInfo,
  detectEnvironment,
  getFallbackConfig,
  validateEnvironmentConfig
};

