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

// Importar middlewares
const errorHandler = require('./middleware/errorHandler');
const { authenticateUser } = require('./middleware/auth');

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
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
});

module.exports = app;