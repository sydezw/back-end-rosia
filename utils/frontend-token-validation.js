/**
 * Utilitário para validação e limpeza de tokens no frontend
 * Resolve o problema de tokens 'undefined' salvos no localStorage
 */

/**
 * Valida se um token é válido (não undefined, null, empty ou string 'undefined')
 * @param {any} token - Token a ser validado
 * @returns {boolean} - True se o token é válido
 */
function isValidToken(token) {
  // Verificar se é null, undefined ou empty
  if (!token || token === null || token === undefined) {
    return false;
  }
  
  // Verificar se é string vazia ou apenas espaços
  if (typeof token === 'string' && token.trim() === '') {
    return false;
  }
  
  // Verificar se é a string literal 'undefined'
  if (token === 'undefined' || token === 'null') {
    return false;
  }
  
  // Verificar se é um JWT válido (formato básico)
  if (typeof token === 'string') {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitiza um token, removendo valores inválidos
 * @param {any} token - Token a ser sanitizado
 * @returns {string|null} - Token válido ou null se inválido
 */
function sanitizeToken(token) {
  if (!isValidToken(token)) {
    return null;
  }
  
  return typeof token === 'string' ? token.trim() : String(token).trim();
}

/**
 * Limpa tokens inválidos do localStorage
 * @returns {Object} - Relatório da limpeza
 */
function cleanupInvalidTokens() {
  const report = {
    cleaned: [],
    kept: [],
    errors: []
  };
  
  try {
    // Lista de chaves de token conhecidas
    const tokenKeys = [
      'token',
      'access_token', 
      'jwt_token',
      'auth_token',
      'user_token',
      'admin_token',
      'google_token'
    ];
    
    tokenKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        
        if (value !== null) {
          if (!isValidToken(value)) {
            localStorage.removeItem(key);
            report.cleaned.push({ key, value: value.substring(0, 20) + '...' });
          } else {
            report.kept.push({ key, valid: true });
          }
        }
      } catch (error) {
        report.errors.push({ key, error: error.message });
      }
    });
    
    // Verificar todas as chaves do localStorage para tokens suspeitos
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('token') || key.includes('Token'))) {
        if (!tokenKeys.includes(key)) {
          try {
            const value = localStorage.getItem(key);
            if (value && !isValidToken(value)) {
              localStorage.removeItem(key);
              report.cleaned.push({ key, value: value.substring(0, 20) + '...', type: 'discovered' });
            }
          } catch (error) {
            report.errors.push({ key, error: error.message });
          }
        }
      }
    }
    
  } catch (error) {
    report.errors.push({ general: error.message });
  }
  
  return report;
}

/**
 * Função segura para salvar token no localStorage
 * @param {string} key - Chave do localStorage
 * @param {any} token - Token a ser salvo
 * @returns {boolean} - True se salvou com sucesso
 */
function safeSetToken(key, token) {
  try {
    const sanitized = sanitizeToken(token);
    
    if (!sanitized) {
      console.warn(`🚨 Tentativa de salvar token inválido na chave '${key}':`, token);
      return false;
    }
    
    localStorage.setItem(key, sanitized);
    console.log(`✅ Token salvo com sucesso na chave '${key}'`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao salvar token na chave '${key}':`, error);
    return false;
  }
}

/**
 * Função segura para obter token do localStorage
 * @param {string} key - Chave do localStorage
 * @returns {string|null} - Token válido ou null
 */
function safeGetToken(key) {
  try {
    const token = localStorage.getItem(key);
    
    if (!token) {
      return null;
    }
    
    const sanitized = sanitizeToken(token);
    
    if (!sanitized) {
      console.warn(`🚨 Token inválido encontrado na chave '${key}', removendo...`);
      localStorage.removeItem(key);
      return null;
    }
    
    return sanitized;
    
  } catch (error) {
    console.error(`❌ Erro ao obter token da chave '${key}':`, error);
    return null;
  }
}

/**
 * Função para validar e corrigir handleAuthSuccess
 * @param {Object} authData - Dados de autenticação do backend
 * @returns {Object} - Dados processados e validados
 */
function handleAuthSuccess(authData) {
  console.log('🔍 handleAuthSuccess - Dados recebidos:', authData);
  
  const result = {
    success: false,
    user: null,
    token: null,
    errors: []
  };
  
  try {
    // Validar estrutura dos dados
    if (!authData || typeof authData !== 'object') {
      result.errors.push('Dados de autenticação inválidos');
      return result;
    }
    
    // Extrair token (priorizar access_token, depois token)
    let token = authData.access_token || authData.token;
    
    if (!isValidToken(token)) {
      result.errors.push(`Token inválido recebido: ${token}`);
      return result;
    }
    
    // Sanitizar token
    token = sanitizeToken(token);
    
    if (!token) {
      result.errors.push('Token não pôde ser sanitizado');
      return result;
    }
    
    // Salvar token de forma segura
    if (!safeSetToken('token', token)) {
      result.errors.push('Falha ao salvar token principal');
    }
    
    if (!safeSetToken('access_token', token)) {
      result.errors.push('Falha ao salvar access_token');
    }
    
    // Processar dados do usuário
    if (authData.user && typeof authData.user === 'object') {
      try {
        localStorage.setItem('userData', JSON.stringify(authData.user));
        result.user = authData.user;
      } catch (error) {
        result.errors.push(`Erro ao salvar userData: ${error.message}`);
      }
    }
    
    // Marcar como admin se aplicável
    if (authData.user && authData.user.is_admin) {
      localStorage.setItem('isAdmin', 'true');
      safeSetToken('admin_token', token);
    }
    
    result.success = true;
    result.token = token;
    
    console.log('✅ handleAuthSuccess - Processamento concluído:', {
      success: result.success,
      hasToken: !!result.token,
      hasUser: !!result.user,
      errors: result.errors.length
    });
    
  } catch (error) {
    result.errors.push(`Erro crítico: ${error.message}`);
    console.error('❌ handleAuthSuccess - Erro crítico:', error);
  }
  
  return result;
}

/**
 * Inicialização automática - limpa tokens inválidos ao carregar
 */
function initTokenValidation() {
  console.log('🔧 Iniciando validação de tokens...');
  
  const report = cleanupInvalidTokens();
  
  if (report.cleaned.length > 0) {
    console.warn('🧹 Tokens inválidos removidos:', report.cleaned);
  }
  
  if (report.errors.length > 0) {
    console.error('❌ Erros durante limpeza:', report.errors);
  }
  
  console.log('✅ Validação de tokens concluída:', {
    cleaned: report.cleaned.length,
    kept: report.kept.length,
    errors: report.errors.length
  });
  
  return report;
}

// Exportar funções para uso no frontend
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    isValidToken,
    sanitizeToken,
    cleanupInvalidTokens,
    safeSetToken,
    safeGetToken,
    handleAuthSuccess,
    initTokenValidation
  };
} else if (typeof window !== 'undefined') {
  // Browser
  window.TokenValidation = {
    isValidToken,
    sanitizeToken,
    cleanupInvalidTokens,
    safeSetToken,
    safeGetToken,
    handleAuthSuccess,
    initTokenValidation
  };
}

// Auto-inicializar no browser
if (typeof window !== 'undefined' && window.localStorage) {
  // Aguardar DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTokenValidation);
  } else {
    initTokenValidation();
  }
}