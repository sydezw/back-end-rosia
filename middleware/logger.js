/**
 * Middleware de logging para debugging
 */

const fs = require('fs');
const path = require('path');

// Verificar se estamos em ambiente serverless (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Criar diretório de logs apenas em ambiente local
let logsDir = null;
if (!isServerless) {
  logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
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

  // Log no console sempre (necessário para Vercel)
  console.log(`[${timestamp}] ${level}: ${message}`, data || '');

  // Escrever em arquivo apenas em ambiente local
  if (!isServerless && logsDir) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `${today}.log`);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFile, logLine);
  }
}

function redactBody(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactBody);
  const out = {};
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = data[k];
    const lk = String(k).toLowerCase();
    const sensitive = (
      lk === 'password' ||
      lk === 'senha' ||
      lk.endsWith('password') ||
      lk.endsWith('senha') ||
      lk === 'token' ||
      lk.endsWith('token') ||
      lk.includes('secret') ||
      lk.includes('authorization')
    );
    out[k] = sensitive ? '***REDACTED***' : (typeof v === 'object' && v !== null ? redactBody(v) : v);
  }
  return out;
}

function redactHeaders(h) {
  if (!h || typeof h !== 'object') return h;
  const out = {};
  const keys = Object.keys(h);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = h[k];
    const lk = String(k).toLowerCase();
    const sensitive = (
      lk === 'authorization' ||
      lk === 'cookie' ||
      lk === 'set-cookie' ||
      lk.includes('token') ||
      lk.includes('secret')
    );
    out[k] = sensitive ? '***REDACTED***' : v;
  }
  return out;
}

function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log da requisição
  writeLog('INFO', `${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    headers: redactHeaders(req.headers),
    body: req.method === 'POST' || req.method === 'PUT' ? redactBody(req.body) : undefined
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

function errorLogger(err, req, res, next) {
  writeLog('ERROR', `${req.method} ${req.originalUrl} - Error`, {
    error: err.message,
    stack: err.stack,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    headers: redactHeaders(req.headers),
    body: redactBody(req.body)
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
  logger,
  redactBody,
  redactHeaders
};

