// utils/tokenManager.js
// Sistema de gerenciamento de tokens invalidados

// Em produção, usar Redis ou banco de dados para persistência
// Por enquanto, usando Set em memória para desenvolvimento
const invalidatedTokens = new Set();

/**
 * Invalida um token adicionando-o à lista de tokens invalidados
 * @param {string} token - Token JWT a ser invalidado
 * @returns {Promise<void>}
 */
export const invalidateToken = async (token) => {
  try {
    // Adicionar token à lista de invalidados
    invalidatedTokens.add(token);
    
    console.log(`Token invalidado: ${token.substring(0, 20)}...`);
    
    // TODO: Em produção, salvar no banco para persistência
    // await db.query('INSERT INTO invalidated_tokens (token, created_at) VALUES (?, ?)', [token, new Date()]);
    
    return true;
  } catch (error) {
    console.error('Erro ao invalidar token:', error);
    return false;
  }
};

/**
 * Verifica se um token foi invalidado
 * @param {string} token - Token JWT a ser verificado
 * @returns {Promise<boolean>} - true se o token foi invalidado
 */
export const checkIfTokenInvalidated = async (token) => {
  try {
    const isInvalidated = invalidatedTokens.has(token);
    
    // TODO: Em produção, verificar no banco
    // const result = await db.query('SELECT 1 FROM invalidated_tokens WHERE token = ?', [token]);
    // return result.length > 0;
    
    return isInvalidated;
  } catch (error) {
    console.error('Erro ao verificar token invalidado:', error);
    return false;
  }
};

/**
 * Limpa tokens invalidados antigos (opcional - para limpeza de memória)
 * @param {number} maxAge - Idade máxima em milissegundos (padrão: 24 horas)
 * @returns {Promise<number>} - Número de tokens removidos
 */
export const cleanupInvalidatedTokens = async (maxAge = 24 * 60 * 60 * 1000) => {
  try {
    // Em implementação com Set simples, não temos timestamp
    // Esta função seria útil com implementação em banco de dados
    
    console.log('Limpeza de tokens invalidados executada');
    return 0;
    
    // TODO: Implementação com banco de dados
    // const cutoffDate = new Date(Date.now() - maxAge);
    // const result = await db.query('DELETE FROM invalidated_tokens WHERE created_at < ?', [cutoffDate]);
    // return result.affectedRows;
  } catch (error) {
    console.error('Erro na limpeza de tokens:', error);
    return 0;
  }
};

/**
 * Obtém estatísticas dos tokens invalidados (para debug)
 * @returns {Object} - Estatísticas dos tokens
 */
export const getTokenStats = () => {
  return {
    totalInvalidatedTokens: invalidatedTokens.size,
    timestamp: new Date().toISOString()
  };
};

// Limpeza automática a cada 6 horas (opcional)
setInterval(() => {
  cleanupInvalidatedTokens();
}, 6 * 60 * 60 * 1000);

console.log('✅ Sistema de gerenciamento de tokens inicializado');

