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

// Importar middlewares
const errorHandler = require('./middleware/errorHandler');
const { authenticateUser } = require('./middleware/auth');

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
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Middleware para webhook (antes do express.json para raw body)
app.use('/webhook', express.raw({ type: 'application/json' }));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas públicas
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/shipping', shippingRoutes);
app.use('/webhook', webhookRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/orders', authenticateUser, orderRoutes);
app.use('/checkout', authenticateUser, checkoutRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/payment', paymentRoutes);

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
app.use(errorHandler);

// Inicializar storage e iniciar servidor
const initializeServer = async () => {
  try {
    // Criar bucket do Supabase Storage se não existir
    await createBucketIfNotExists();
    console.log('✅ Storage configurado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao configurar storage:', error.message);
    console.log('⚠️  Servidor continuará sem storage configurado');
  }

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`📸 Upload de imagens: Habilitado`);
  });
};

initializeServer();

module.exports = app;