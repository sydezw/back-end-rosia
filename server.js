require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importar rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const checkoutRoutes = require('./routes/checkout');
const shippingRoutes = require('./routes/shipping');
const webhookRoutes = require('./routes/webhook');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const paymentsRoutes = require('./routes/payments');
const installmentsRoutes = require('./routes/installments');
const profileRoutes = require('./routes/profile');
const usersRoutes = require('./routes/users');
const profileConfigRoutes = require('./routes/profile-config');
const cepRoutes = require('./routes/cep');
const debugRoutes = require('./routes/debug');
const testAuthRoutes = require('./routes/test-auth');
const googleUsersRoutes = require('./routes/google-users');
const cartRoutes = require('./routes/cart');
const singleOrderRoutes = require('./routes/order');

// Importar middlewares
const errorHandler = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');
const { requestLogger, errorLogger, logger } = require('./middleware/logger');

// Importar configuração do storage
const { createBucketIfNotExists } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3030;
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos'
});

// Middlewares globais
app.use(helmet());
app.use(limiter);
app.use(cors());
app.options('*', cors());

// Servir arquivos estáticos
app.use(express.static('public'));

// Headers de segurança para resolver Cross-Origin-Opener-Policy
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Adicionar headers específicos para debug de CORS
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔍 CORS Debug - Origin: ${req.headers.origin}, Method: ${req.method}, Path: ${req.path}`);
  }
  
  next();
});

// Configuração de CORS por ambiente
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_LOCAL,
  'https://www.rosia.com.br',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8888',
  'https://nsazbeovtmmetpiyokqc.supabase.co',
  'https://accounts.google.com',
  'https://apis.google.com',
  'https://www.googleapis.com',
  'https://oauth2.googleapis.com'
];

if (!isDev) {
  allowedOrigins.push(
    'https://www.rosia.com.br',
    'https://rosia.com.br', // Domínio sem www
    'https://rosialoja-front-rosialastcommit.vercel.app', // Frontend na Vercel
    'https://back-end-rosia02.vercel.app' // Backend na Vercel
  );
}

app.use(cors({
  origin: allowedOrigins.filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'X-Idempotency-Key'
  ],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);
app.use((req, res, next) => { console.log('REQ:', req.method, req.url); next(); });

// Middleware específico para webhook (após express.json para não interferir)
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use('/api/payments', express.raw({ type: 'application/json' }));
app.use('/api/payments,', express.raw({ type: 'application/json' }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/cep', cepRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api', installmentsRoutes);

// Rotas protegidas
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/checkout', authenticateToken, checkoutRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Rotas públicas do MercadoPago (sem autenticação) - DEVE VIR ANTES DAS ROTAS PROTEGIDAS
app.get('/api/payments/config', (req, res) => {
  const publicKey = process.env.MP_PUBLIC_KEY || process.env.VITE_MP_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: "Public key não configurada" });
  }
  return res.json({ publicKey: publicKey });
});

app.get('/api/payments/methods', (req, res) => {
  console.log('🔓 Rota pública /api/payments/methods acessada');
  req.url = '/methods';
  paymentsRoutes.handle(req, res, () => {});
});

// Endpoints públicos para o Brick criar token e processar pagamento
app.post('/api/payments/mp/card-token', (req, res) => {
  req.url = '/mp/card-token';
  paymentsRoutes.handle(req, res, () => {});
});

app.post('/api/payments/mp/credit-card', (req, res) => {
  req.url = '/mp/credit-card';
  paymentsRoutes.handle(req, res, () => {});
});

app.post('/api/payments', (req, res) => {
  req.url = '/mercadopago';
  webhookRoutes.handle(req, res, () => {});
});
app.post('/api/payments,', (req, res) => {
  req.url = '/mercadopago';
  webhookRoutes.handle(req, res, () => {});
});

// 🔓 Endpoint público para criar pagamento Pix (sem autenticação)
app.post('/api/pix/create', (req, res) => {
  req.url = '/mp/orders/pix';
  paymentsRoutes.handle(req, res, () => {});
});

app.use('/api/payments/mp/process', (req, res, next) => {
  console.log('➡️', req.method, req.path);
  console.log('📦 BODY RECEBIDO:', req.body);
  console.log('Headers:', req.headers['content-type']);
  if (!req.body) {
    return res.status(400).json({ error: 'Body vazio' });
  }
  next();
});

app.post('/api/payments/mp/process', (req, res) => {
  req.url = '/mp/process';
  paymentsRoutes.handle(req, res, () => {});
});
const corsOptionsForOrdersCard = {
  origin: (origin, callback) => {
    const allowed = allowedOrigins.filter(Boolean);
    if (!origin) return callback(null, false);
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.options('/process_payment', cors(corsOptionsForOrdersCard), (req, res) => {
  res.sendStatus(200);
});
app.post('/process_payment', (req, res) => {
  console.log('HEADERS:', req.headers);
  console.log('BODY:', req.body);
  paymentsRoutes.handle(req, res, () => {});
});

// Compatível com clientes que prefixam com /api
app.options('/api/process_payment', cors(corsOptionsForOrdersCard), (req, res) => {
  res.sendStatus(200);
});
app.post('/api/process_payment', (req, res) => {
  console.log('HEADERS:', req.headers);
  console.log('BODY:', req.body);
  paymentsRoutes.handle(req, res, () => {});
});

// Rotas protegidas de pagamentos (todas as demais) - SEMPRE DEPOIS DAS PÚBLICAS
app.use('/api/payments', authenticateToken, paymentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile-config', profileConfigRoutes);
app.use('/api/test-auth', testAuthRoutes);
app.use('/api/google-users', googleUsersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', singleOrderRoutes);

// Rotas sem prefixo /api (para compatibilidade)
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/shipping', shippingRoutes);
app.use('/webhook', webhookRoutes);
app.use('/orders', authenticateToken, orderRoutes);
app.use('/checkout', authenticateToken, checkoutRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/payment', paymentRoutes);
app.use('/payments', paymentsRoutes);
app.use('/installments', installmentsRoutes);
app.use('/profile', profileRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Rosia API',
    version: '1.0.0',
    status: 'Online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/auth',
      products: '/products',
      orders: '/orders',
      checkout: '/checkout',
      admin: '/admin',
      profile: '/profile',
      upload: '/upload',
      payment: '/payment',
      shipping: '/shipping',
      health: '/health'
    }
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl 
  });
});

// Middleware de tratamento de erros
app.use(errorLogger);
app.use(errorHandler);

// Inicializar storage apenas em desenvolvimento
const initializeServer = async () => {
  // Em produção (Vercel), não inicializar storage na inicialização
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Criar bucket do Supabase Storage se não existir
      await createBucketIfNotExists();
      console.log('✅ Storage configurado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao configurar storage:', error.message);
      console.log('⚠️  Servidor continuará sem storage configurado');
    }
  }

  // Iniciar servidor (desenvolvimento e produção local)
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📸 Upload de imagens: Habilitado`);
    });
  }
};

// Inicializar (desenvolvimento e produção local)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  initializeServer();
}

module.exports = app;

