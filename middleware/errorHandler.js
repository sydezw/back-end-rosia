/**
 * Middleware global para tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
  console.error('Erro capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Erro de validação do Supabase
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      error: 'Erro de validação dos dados',
      details: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // Erro de autenticação
  if (err.name === 'JsonWebTokenError' || err.message.includes('JWT')) {
    return res.status(401).json({
      error: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }

  // Erro de autorização
  if (err.status === 403) {
    return res.status(403).json({
      error: 'Acesso negado',
      code: 'FORBIDDEN'
    });
  }

  // Erro de recurso não encontrado
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Recurso não encontrado',
      code: 'NOT_FOUND'
    });
  }

  // Erro de dados duplicados
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Dados já existem',
      code: 'DUPLICATE_DATA'
    });
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      code: 'INVALID_JSON'
    });
  }

  // Erro genérico do servidor
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;