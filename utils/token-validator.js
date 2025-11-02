/**
 * Utilitário para validação de tokens no frontend
 * Baseado no token-validation.js mas adaptado para uso no navegador
 */

/**
 * Valida se um token é válido
 * @param {string} token - Token a ser validado
 * @returns {boolean} True se o token é válido
 */
export const isValidToken = (token) => {
  console.log('🔍 Validando token:', {
    exists: !!token,
    type: typeof token,
    length: token ? token.length : 0,
    preview: token ? token.substring(0, 20) + '...' : 'null'
  });

  // Verificar se token existe
  if (!token) {
    console.warn('⚠️ Token não fornecido');
    return false;
  }

  // Verificar se não é string "undefined" ou "null"
  if (token === 'undefined' || token === 'null') {
    console.warn('⚠️ Token com valor inválido:', token);
    return false;
  }

  // Verificar se é string
  if (typeof token !== 'string') {
    console.warn('⚠️ Token deve ser uma string, recebido:', typeof token);
    return false;
  }

  // Verificar se não está vazio
  if (token.trim().length === 0) {
    console.warn('⚠️ Token está vazio');
    return false;
  }

  // Verificar formato JWT básico (deve ter 3 partes separadas por pontos)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.warn('⚠️ Token não tem formato JWT válido (3 partes):', parts.length);
    return false;
  }

  // Verificar se cada parte não está vazia
  if (parts.some(part => !part || part.trim().length === 0)) {
    console.warn('⚠️ Token JWT tem partes vazias');
    return false;
  }

  console.log('✅ Token passou na validação básica');
  return true;
};

/**
 * Extrai e valida tokens de dados de autenticação
 * @param {Object} authData - Dados de autenticação do servidor
 * @returns {Object} Tokens extraídos e erros encontrados
 */
export const extractAndValidateTokens = (authData) => {
  console.log('🔍 Extraindo tokens de:', authData);
  
  const result = {
    accessToken: null,
    refreshToken: null,
    errors: []
  };

  if (!authData || typeof authData !== 'object') {
    result.errors.push('Dados de autenticação inválidos');
    return result;
  }

  // Tentar extrair access token de diferentes locais
  const possibleAccessTokens = [
    authData.access_token,
    authData.token,
    authData.session?.access_token,
    authData.data?.access_token,
    authData.data?.session?.access_token
  ];

  for (const token of possibleAccessTokens) {
    if (token && isValidToken(token)) {
      result.accessToken = token;
      console.log('✅ Access token válido encontrado');
      break;
    }
  }

  if (!result.accessToken) {
    result.errors.push('Nenhum access token válido encontrado');
  }

  // Tentar extrair refresh token de diferentes locais
  const possibleRefreshTokens = [
    authData.refresh_token,
    authData.session?.refresh_token,
    authData.data?.refresh_token,
    authData.data?.session?.refresh_token
  ];

  for (const token of possibleRefreshTokens) {
    if (token && isValidToken(token)) {
      result.refreshToken = token;
      console.log('✅ Refresh token válido encontrado');
      break;
    }
  }

  if (!result.refreshToken) {
    result.errors.push('Nenhum refresh token válido encontrado (opcional)');
  }

  return result;
};

/**
 * Salva um token no localStorage se for válido
 * @param {string} token - Token a ser salvo
 * @param {string} key - Chave do localStorage
 * @returns {boolean} True se o token foi salvo com sucesso
 */
export const saveTokenIfValid = (token, key) => {
  console.log(`🔍 Tentando salvar token na chave '${key}'`);
  
  if (!isValidToken(token)) {
    console.error(`❌ Token inválido para chave '${key}'`);
    return false;
  }

  try {
    localStorage.setItem(key, token);
    console.log(`✅ Token salvo com sucesso na chave '${key}'`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao salvar token na chave '${key}':`, error);
    return false;
  }
};

/**
 * Limpa tokens inválidos do localStorage
 */
export const cleanupInvalidTokens = () => {
  console.log('🧹 Limpando tokens inválidos do localStorage');
  
  const tokenKeys = ['access_token', 'refresh_token'];
  let cleaned = 0;
  
  tokenKeys.forEach(key => {
    const token = localStorage.getItem(key);
    if (token && !isValidToken(token)) {
      localStorage.removeItem(key);
      console.log(`🗑️ Token inválido removido: ${key}`);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`✅ ${cleaned} token(s) inválido(s) removido(s)`);
  } else {
    console.log('✅ Nenhum token inválido encontrado');
  }
};

/**
 * Verifica se o usuário está autenticado com token válido
 * @returns {boolean} True se autenticado com token válido
 */
export const isAuthenticatedWithValidToken = () => {
  const token = localStorage.getItem('access_token');
  return isValidToken(token);
};

/**
 * Obtém informações de debug sobre tokens armazenados
 * @returns {Object} Informações de debug
 */
export const getStoredTokensDebugInfo = () => {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  
  return {
    accessToken: {
      exists: !!accessToken,
      isValid: isValidToken(accessToken),
      length: accessToken ? accessToken.length : 0,
      preview: accessToken ? accessToken.substring(0, 20) + '...' : null
    },
    refreshToken: {
      exists: !!refreshToken,
      isValid: isValidToken(refreshToken),
      length: refreshToken ? refreshToken.length : 0,
      preview: refreshToken ? refreshToken.substring(0, 20) + '...' : null
    }
  };
};

