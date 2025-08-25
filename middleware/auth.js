const { supabase } = require('../config/supabase');

/**
 * Middleware para autenticar usuário usando JWT do Supabase
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

module.exports = {
  authenticateUser,
  optionalAuth
};