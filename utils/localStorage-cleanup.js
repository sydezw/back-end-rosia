/**
 * Utilitário para limpeza de localStorage
 * Remove tokens corrompidos, inválidos ou 'undefined'
 */

/**
 * Verifica se um valor é considerado inválido
 * @param {any} value - Valor a ser verificado
 * @returns {boolean} - true se o valor é inválido
 */
function isInvalidValue(value) {
  return (
    value === null ||
    value === undefined ||
    value === 'undefined' ||
    value === 'null' ||
    value === '' ||
    value === 'false' ||
    (typeof value === 'string' && value.trim() === '')
  );
}

/**
 * Verifica se um token JWT tem formato válido
 * @param {string} token - Token a ser verificado
 * @returns {boolean} - true se o token tem formato válido
 */
function isValidJWTFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // JWT deve ter 3 partes separadas por pontos
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Cada parte deve ser base64 válida (não vazia)
  return parts.every(part => part && part.length > 0);
}

/**
 * Lista de chaves relacionadas a autenticação que devem ser limpas
 */
const AUTH_KEYS = [
  'access_token',
  'refresh_token',
  'token',
  'jwt_token',
  'auth_token',
  'user_token',
  'session_token',
  'google_token',
  'user_data',
  'user_profile',
  'session_data',
  'auth_data',
  'login_data'
];

/**
 * Remove uma chave específica do localStorage com log
 * @param {string} key - Chave a ser removida
 * @param {string} reason - Motivo da remoção
 */
function removeKey(key, reason) {
  try {
    localStorage.removeItem(key);
    console.log(`🧹 localStorage: Removido '${key}' - ${reason}`);
  } catch (error) {
    console.error(`❌ Erro ao remover '${key}':`, error);
  }
}

/**
 * Limpa tokens inválidos do localStorage
 * @param {Object} options - Opções de limpeza
 * @param {boolean} options.verbose - Se deve exibir logs detalhados
 * @param {Array<string>} options.customKeys - Chaves adicionais para verificar
 * @returns {Object} - Relatório da limpeza
 */
function cleanupTokens(options = {}) {
  const { verbose = true, customKeys = [] } = options;
  
  if (typeof localStorage === 'undefined') {
    console.warn('⚠️ localStorage não disponível');
    return { cleaned: 0, errors: 0, keys: [] };
  }
  
  const report = {
    cleaned: 0,
    errors: 0,
    keys: [],
    timestamp: new Date().toISOString()
  };
  
  // Combinar chaves padrão com customizadas
  const keysToCheck = [...AUTH_KEYS, ...customKeys];
  
  if (verbose) {
    console.log('🧹 Iniciando limpeza do localStorage...');
    console.log(`📋 Verificando ${keysToCheck.length} chaves:`, keysToCheck);
  }
  
  keysToCheck.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      
      if (value !== null) {
        let shouldRemove = false;
        let reason = '';
        
        // Verificar se o valor é inválido
        if (isInvalidValue(value)) {
          shouldRemove = true;
          reason = `valor inválido: '${value}'`;
        }
        // Verificar se é um token com formato inválido
        else if (key.includes('token') && !isValidJWTFormat(value)) {
          shouldRemove = true;
          reason = 'formato de token inválido';
        }
        // Verificar se é um JSON corrompido
        else if (value.startsWith('{') || value.startsWith('[')) {
          try {
            JSON.parse(value);
          } catch (error) {
            shouldRemove = true;
            reason = 'JSON corrompido';
          }
        }
        
        if (shouldRemove) {
          removeKey(key, reason);
          report.cleaned++;
          report.keys.push({ key, reason, value: value.substring(0, 50) + '...' });
        } else if (verbose) {
          console.log(`✅ '${key}' está válido`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar '${key}':`, error);
      report.errors++;
    }
  });
  
  // Verificar todas as chaves do localStorage para encontrar outras relacionadas à auth
  try {
    const allKeys = Object.keys(localStorage);
    const authRelatedKeys = allKeys.filter(key => 
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('session') ||
      key.toLowerCase().includes('user')
    );
    
    authRelatedKeys.forEach(key => {
      if (!keysToCheck.includes(key)) {
        const value = localStorage.getItem(key);
        if (isInvalidValue(value)) {
          removeKey(key, 'chave relacionada à auth com valor inválido');
          report.cleaned++;
          report.keys.push({ key, reason: 'auto-detectada como inválida', value: String(value).substring(0, 50) + '...' });
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar chaves adicionais:', error);
    report.errors++;
  }
  
  if (verbose) {
    console.log('🧹 Limpeza concluída:', {
      cleaned: report.cleaned,
      errors: report.errors,
      totalKeys: keysToCheck.length
    });
    
    if (report.cleaned > 0) {
      console.log('📋 Chaves removidas:', report.keys);
    }
  }
  
  return report;
}

/**
 * Limpa completamente todos os dados de autenticação
 * @param {boolean} confirm - Confirmação para limpeza total
 */
function clearAllAuthData(confirm = false) {
  if (!confirm) {
    console.warn('⚠️ Use clearAllAuthData(true) para confirmar a limpeza total');
    return;
  }
  
  console.log('🧹 Limpando TODOS os dados de autenticação...');
  
  AUTH_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Removido: ${key}`);
    } catch (error) {
      console.error(`❌ Erro ao remover ${key}:`, error);
    }
  });
  
  console.log('✅ Limpeza total concluída');
}

/**
 * Valida se os tokens atuais são válidos
 * @returns {Object} - Status da validação
 */
function validateCurrentTokens() {
  const validation = {
    valid: [],
    invalid: [],
    missing: [],
    timestamp: new Date().toISOString()
  };
  
  AUTH_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    
    if (value === null) {
      validation.missing.push(key);
    } else if (isInvalidValue(value)) {
      validation.invalid.push({ key, value, reason: 'valor inválido' });
    } else if (key.includes('token') && !isValidJWTFormat(value)) {
      validation.invalid.push({ key, value: value.substring(0, 50) + '...', reason: 'formato inválido' });
    } else {
      validation.valid.push(key);
    }
  });
  
  return validation;
}

/**
 * Configura limpeza automática em intervalos
 * @param {number} intervalMinutes - Intervalo em minutos
 */
function setupAutoCleanup(intervalMinutes = 30) {
  console.log(`🔄 Configurando limpeza automática a cada ${intervalMinutes} minutos`);
  
  setInterval(() => {
    console.log('🔄 Executando limpeza automática...');
    cleanupTokens({ verbose: false });
  }, intervalMinutes * 60 * 1000);
}

// Exportar funções
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    cleanupTokens,
    clearAllAuthData,
    validateCurrentTokens,
    setupAutoCleanup,
    isInvalidValue,
    isValidJWTFormat
  };
} else {
  // Browser
  window.LocalStorageCleanup = {
    cleanupTokens,
    clearAllAuthData,
    validateCurrentTokens,
    setupAutoCleanup,
    isInvalidValue,
    isValidJWTFormat
  };
}

// Auto-executar limpeza na inicialização (apenas no browser)
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  // Executar limpeza inicial após 1 segundo
  setTimeout(() => {
    console.log('🚀 Executando limpeza inicial do localStorage...');
    cleanupTokens({ verbose: false });
  }, 1000);
}

