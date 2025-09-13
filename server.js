require('dotenv').config();
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
const profileRoutes = require('./routes/profile');
const usersRoutes = require('./routes/users');
const cepRoutes = require('./routes/cep');

// Importar middlewares
const errorHandler = require('./middleware/errorHandler');
const { authenticateUser } = require('./middleware/auth');
const { requestLogger, errorLogger, logger } = require('./middleware/logger');

// Importar configuração do storage
const { createBucketIfNotExists } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas tentativas, tente novamente em 15 minutos'
});

// Middlewares globais
app.use(helmet());
app.use(limiter);
app.use(requestLogger);

// Servir arquivos estáticos
app.use(express.static('public'));

// Headers de segurança para resolver Cross-Origin-Opener-Policy
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_LOCAL, 
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'http://localhost:8080', // Frontend local na porta 8080
    'https://www.rosia.com.br',
    'https://rosia.com.br', // Domínio sem www
    'https://rosialoja-front-rosialastcommit.vercel.app', // Frontend na Vercel
    'https://back-end-rosia02.vercel.app', // Backend na Vercel
    'https://nsazbeovtmmetpiyokqc.supabase.co', // Supabase para OAuth
    'http://192.168.0.13:8080',
    'http://127.0.0.1:8080',
    // Domínios do Google para OAuth
    'https://accounts.google.com',
    'https://www.googleapis.com',
    'https://oauth2.googleapis.com'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
}));

// Middlewares de parsing (devem vir antes das rotas)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware específico para webhook (após express.json para não interferir)
app.use('/webhook', express.raw({ type: 'application/json' }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/cep', cepRoutes);

// Rotas protegidas
app.use('/api/orders', authenticateUser, orderRoutes);
app.use('/api/checkout', authenticateUser, checkoutRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);

// Rotas sem prefixo /api (para compatibilidade)
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/shipping', shippingRoutes);
app.use('/webhook', webhookRoutes);
app.use('/orders', authenticateUser, orderRoutes);
app.use('/checkout', authenticateUser, checkoutRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/payment', paymentRoutes);
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

  // Iniciar servidor apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`📸 Upload de imagens: Habilitado`);
    });
  }
};

// Inicializar apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  initializeServer();
}

module.exports = app;