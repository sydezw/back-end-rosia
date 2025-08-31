/**
 * Middleware de logging para debugging
 */

const fs = require('fs');
const path = require('path');

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Função para escrever logs em arquivo
function writeLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFileSync(logFile, logLine);
  
  // Também exibir no console em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`, data || '');
  }
}

// Middleware de logging de requisições
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log da requisição
  writeLog('INFO', `${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  
  // Interceptar a resposta
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log da resposta
    writeLog('INFO', `${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
    
    originalSend.call(this, data);
  };
  
  next();
}

// Middleware de logging de erros
function errorLogger(err, req, res, next) {
  writeLog('ERROR', `${req.method} ${req.originalUrl} - Error`, {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });
  
  next(err);
}

// Funções de logging por nível
const logger = {
  info: (message, data) => writeLog('INFO', message, data),
  warn: (message, data) => writeLog('WARN', message, data),
  error: (message, data) => writeLog('ERROR', message, data),
  debug: (message, data) => writeLog('DEBUG', message, data)
};

module.exports = {
  requestLogger,
  errorLogger,
  logger
};