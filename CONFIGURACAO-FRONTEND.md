# 🔗 Configurações Completas para Integração Frontend ↔ Backend

**Rosita Floral Elegance - Guia Completo de Integração**

Este documento contém **todas** as configurações necessárias para integrar seu frontend com o backend da Rosita Floral Elegance.

## 📋 Índice

- [1. Configuração Base da API](#1-configuração-base-da-api)
- [2. Sistema de Autenticação](#2-sistema-de-autenticação)
- [3. Gestão de Produtos](#3-gestão-de-produtos)
- [4. Sistema de Carrinho e Checkout](#4-sistema-de-carrinho-e-checkout)
- [5. Gestão de Pedidos](#5-gestão-de-pedidos)
- [6. Cálculo de Frete](#6-cálculo-de-frete)
- [7. Utilitários e Helpers](#7-utilitários-e-helpers)
- [8. Estruturas de Dados](#8-estruturas-de-dados)
- [9. URLs de Deploy](#9-urls-de-deploy)
- [10. Interceptor para Renovação de Token](#10-interceptor-para-renovação-de-token)
- [11. Exemplos Práticos React](#11-exemplos-práticos-react)
- [12. Configurações de Ambiente](#12-configurações-de-ambiente)

---

## 🚀 1. Configuração Base da API

### Instalar Dependências

```bash
npm install axios
```

### Configurar Cliente HTTP

```javascript
import axios from 'axios';

// Configuração automática baseada no ambiente
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // URL do backend em produção (substitua pela sua URL real)
    return process.env.REACT_APP_API_URL || 'https://seu-backend.vercel.app/api';
  }
  // URL local para desenvolvimento
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🔐 2. Sistema de Autenticação

### Login com Email/Senha

```javascript
// POST /api/auth/login
async function login(email, password) {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    
    // Salvar tokens
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro no login');
  }
}
```

### Registro de Usuário

```javascript
// POST /api/auth/register
async function register(name, email, password) {
  try {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password
    });
    
    if (data.session) {
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro no registro');
  }
}
```

### Login Social (Google/Facebook)

```javascript
// POST /api/auth/login/google
async function loginGoogle(googleToken) {
  try {
    const { data } = await api.post('/auth/login/google', {
      token: googleToken
    });
    
    // Salvar tokens
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro no login Google');
  }
}

// POST /api/auth/login/facebook
async function loginFacebook(facebookToken) {
  try {
    const { data } = await api.post('/auth/login/facebook', {
      token: facebookToken
    });
    
    // Salvar tokens
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro no login Facebook');
  }
}
```

### Logout

```javascript
// POST /api/auth/logout
async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Erro no logout:', error);
  } finally {
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

---

## 🛍️ 3. Gestão de Produtos

### Listar Produtos

```javascript
// GET /api/products
async function getProducts(options = {}) {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search
    } = options;
    
    const params = new URLSearchParams({ page, limit });
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const { data } = await api.get(`/products?${params}`);
    return data;
  } catch (error) {
    throw new Error('Erro ao carregar produtos');
  }
}
```

### Obter Produto por ID

```javascript
// GET /api/products/:id
async function getProduct(id) {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data.product;
  } catch (error) {
    throw new Error('Produto não encontrado');
  }
}
```

### Obter Categorias

```javascript
// GET /api/products/meta/categories
async function getCategories() {
  try {
    const { data } = await api.get('/products/meta/categories');
    return data.categories;
  } catch (error) {
    throw new Error('Erro ao carregar categorias');
  }
}
```

---

## 🛒 4. Sistema de Carrinho e Checkout

### Validar Carrinho

```javascript
// POST /api/checkout/validate
async function validateCart(cart, cep = null) {
  try {
    const { data } = await api.post('/checkout/validate', {
      cart,
      cep
    });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro na validação');
  }
}

// Exemplo de uso:
const cart = [
  {
    product_id: 'uuid-do-produto',
    quantity: 2
  }
];

const validation = await validateCart(cart, '01234-567');
console.log('Subtotal:', validation.summary.subtotal);
console.log('Frete:', validation.summary.shipping_cost);
console.log('Total:', validation.summary.total);
```

### Criar Pedido

```javascript
// POST /api/checkout/create
async function createOrder(orderData) {
  try {
    const { data } = await api.post('/checkout/create', orderData);
    return data.order;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro ao criar pedido');
  }
}

// Exemplo de uso:
const orderData = {
  cart: [
    {
      product_id: 'uuid-do-produto',
      quantity: 2
    }
  ],
  shipping_address: {
    street: 'Rua das Flores, 123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01234-567',
    complement: 'Apto 45'
  },
  shipping_method: 'standard',
  payment_method: 'credit_card'
};

const order = await createOrder(orderData);
console.log('Pedido criado:', order.id);
```

---

## 📦 5. Gestão de Pedidos

### Listar Pedidos do Usuário

```javascript
// GET /api/orders
async function getUserOrders(options = {}) {
  try {
    const {
      page = 1,
      limit = 10,
      status
    } = options;
    
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    
    const { data } = await api.get(`/orders?${params}`);
    return data;
  } catch (error) {
    throw new Error('Erro ao carregar pedidos');
  }
}
```

### Obter Detalhes do Pedido

```javascript
// GET /api/orders/:id
async function getOrder(orderId) {
  try {
    const { data } = await api.get(`/orders/${orderId}`);
    return data.order;
  } catch (error) {
    throw new Error('Pedido não encontrado');
  }
}
```

### Cancelar Pedido

```javascript
// PUT /api/orders/:id/cancel
async function cancelOrder(orderId) {
  try {
    const { data } = await api.put(`/orders/${orderId}/cancel`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro ao cancelar pedido');
  }
}
```

---

## 🚚 6. Cálculo de Frete

### Calcular Frete

```javascript
// POST /api/shipping/calculate
async function calculateShipping(cep, cart) {
  try {
    const { data } = await api.post('/shipping/calculate', {
      cep,
      cart
    });
    return data.shipping_options;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro no cálculo do frete');
  }
}

// Exemplo de uso:
const shippingOptions = await calculateShipping('01234-567', cart);
console.log('Opções de frete:', shippingOptions);
```

---

## 🔧 7. Utilitários e Helpers

### Verificar Autenticação

```javascript
function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

function getToken() {
  return localStorage.getItem('access_token');
}
```

### Formatação

```javascript
function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

function formatCEP(cep) {
  return cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
}

function isValidCEP(cep) {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

---

## 🎯 8. Estruturas de Dados

### Produto

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  active: boolean;
  colors?: string[];
  sizes?: string[];
  materials?: string[];
  created_at: string;
  updated_at: string;
}
```

### Carrinho

```typescript
interface CartItem {
  product_id: string;
  quantity: number;
  product?: Product; // Para exibição
}

interface CartValidation {
  summary: {
    subtotal: number;
    shipping_cost: number;
    total: number;
  };
  items: {
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    total: number;
    available: boolean;
  }[];
}
```

### Endereço de Entrega

```typescript
interface ShippingAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  complement?: string;
}
```

### Pedido

```typescript
interface Order {
  id: string;
  user_id: string;
  items: {
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
}
```

### Usuário

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
```

---

## 🌐 9. URLs de Deploy

### Configuração para Diferentes Ambientes

```javascript
// Desenvolvimento
baseURL: 'http://localhost:3001/api'

// Produção (Vercel)
baseURL: 'https://seu-backend.vercel.app/api'

// Produção (Railway)
baseURL: 'https://seu-app.railway.app/api'

// Produção (Render)
baseURL: 'https://seu-app.onrender.com/api'
```

### Configuração Automática

```javascript
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://seu-backend.vercel.app/api';
  } else if (process.env.NODE_ENV === 'staging') {
    return 'https://staging-backend.vercel.app/api';
  } else {
    return 'http://localhost:3001/api';
  }
};
```

---

## 🔄 10. Interceptor para Renovação de Token

```javascript
// Interceptor para renovação automática de token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 401 (não autorizado) e não for uma tentativa de renovação
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('🔄 Token expirado, tentando renovar...');
          
          // Tentar renovar o token
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          // Salvar novo token
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('refresh_token', data.session.refresh_token);

          // Repetir a requisição original com o novo token
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          
          console.log('✅ Token renovado com sucesso!');
          return api(originalRequest);
        } catch (refreshError) {
          console.error('❌ Erro ao renovar token:', refreshError);
          
          // Refresh falhou, limpar dados e redirecionar para login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Redirecionar para login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else {
        // Não há refresh token, redirecionar para login
        localStorage.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
```

---

## ⚛️ 11. Exemplos Práticos React

### Hook de Autenticação

```jsx
import { useState, useEffect, createContext, useContext } from 'react';
import { login, logout, register } from './api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    const userData = await login(email, password);
    setUser(userData);
    return userData;
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const handleRegister = async (name, email, password) => {
    const userData = await register(name, email, password);
    if (userData.user) {
      setUser(userData.user);
    }
    return userData;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login: handleLogin,
      logout: handleLogout,
      register: handleRegister,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
```

### Hook de Carrinho

```jsx
import { useState, useEffect } from 'react';
import { validateCart } from './api';

export function useCart() {
  const [cart, setCart] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar carrinho do localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Salvar carrinho no localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    if (cart.length > 0) {
      validateCartItems();
    }
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prevCart, { product_id: product.id, quantity, product }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product_id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const validateCartItems = async () => {
    setLoading(true);
    try {
      const result = await validateCart(cart);
      setValidation(result);
    } catch (error) {
      console.error('Erro na validação:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setValidation(null);
  };

  return {
    cart,
    validation,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    validateCartItems
  };
}
```

### Componente de Login

```jsx
import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // Redirecionar para dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
      </div>
      
      <div className="form-group">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          required
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

export default LoginForm;
```

### Componente de Produtos

```jsx
import React, { useState, useEffect } from 'react';
import { getProducts, getCategories } from './api';
import { useCart } from './hooks/useCart';
import { formatPrice } from './utils';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, category, search]);

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getProducts({ page, category, search });
      setProducts(result.products);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    alert(`${product.name} adicionado ao carrinho!`);
  };

  if (loading) return <div className="loading">Carregando produtos...</div>;

  return (
    <div className="product-list">
      <div className="filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produtos..."
        />
        
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img src={product.image_url} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="description">{product.description}</p>
            <p className="price">{formatPrice(product.price)}</p>
            <p className="stock">Estoque: {product.stock}</p>
            <button 
              onClick={() => handleAddToCart(product)}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
            </button>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Anterior
        </button>
        <span>Página {page}</span>
        <button onClick={() => setPage(p => p + 1)}>
          Próxima
        </button>
      </div>
    </div>
  );
}

export default ProductList;
```

---

## 🔧 12. Configurações de Ambiente

### Arquivo .env.local (Frontend)

```env
# URL da API
REACT_APP_API_URL=https://seu-backend.vercel.app/api

# Configurações do Supabase (se necessário no frontend)
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Outras configurações
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
```

### Configuração de CORS no Backend

Certifique-se de que o backend está configurado para aceitar requisições do seu domínio:

```javascript
// No backend (server.js)
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',           // Desenvolvimento
    'https://seu-frontend.vercel.app'  // Produção
  ],
  credentials: true
}));
```

---

## ✅ Checklist de Implementação

### Configuração Inicial
- [ ] Instalar axios
- [ ] Configurar cliente HTTP com baseURL
- [ ] Configurar interceptors para token
- [ ] Configurar variáveis de ambiente

### Autenticação
- [ ] Implementar funções de login/registro
- [ ] Implementar logout
- [ ] Implementar renovação automática de token
- [ ] Criar hook/context de autenticação

### Produtos
- [ ] Implementar listagem de produtos
- [ ] Implementar busca e filtros
- [ ] Implementar visualização de produto individual
- [ ] Implementar carregamento de categorias

### Carrinho
- [ ] Implementar hook de carrinho
- [ ] Implementar validação de carrinho
- [ ] Implementar persistência no localStorage
- [ ] Implementar cálculo de totais

### Checkout
- [ ] Implementar formulário de checkout
- [ ] Implementar cálculo de frete
- [ ] Implementar criação de pedido
- [ ] Implementar confirmação de pedido

### Pedidos
- [ ] Implementar listagem de pedidos
- [ ] Implementar visualização de pedido
- [ ] Implementar cancelamento de pedido
- [ ] Implementar acompanhamento de status

### Utilitários
- [ ] Implementar formatação de preços
- [ ] Implementar validação de CEP
- [ ] Implementar tratamento de erros
- [ ] Implementar loading states

---

## 📝 Notas Importantes

1. **Tokens**: Sempre salve os tokens no `localStorage` ou `sessionStorage`
2. **Interceptors**: Use interceptors do Axios para renovação automática de tokens
3. **Tratamento de Erros**: Implemente tratamento adequado para erros de rede e autenticação
4. **CORS**: Certifique-se de que o backend está configurado para aceitar requisições do seu domínio
5. **HTTPS**: Em produção, sempre use HTTPS tanto no frontend quanto no backend
6. **Validação**: Sempre valide dados no frontend antes de enviar para o backend
7. **Loading States**: Implemente estados de carregamento para melhor UX
8. **Error Boundaries**: Use Error Boundaries no React para capturar erros

---

## 🚀 Deploy e Produção

### Variáveis de Ambiente de Produção

```env
# Vercel
REACT_APP_API_URL=https://seu-backend.vercel.app/api

# Netlify
REACT_APP_API_URL=https://seu-backend.netlify.app/api

# Outras plataformas
REACT_APP_API_URL=https://seu-dominio.com/api
```

### Configuração de Build

```json
// package.json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "REACT_APP_ENVIRONMENT=production npm run build"
  }
}
```

---

**🌹 Rosita Floral Elegance - Configuração Completa**

Com todas essas configurações, seu frontend estará **100% integrado** com o backend da Rosita Floral Elegance!

Para mais detalhes, consulte:
- [README principal](./README.md)
- [Guia de Integração Frontend](./FRONTEND-INTEGRATION.md)
- [Guia de Deploy](./DEPLOY-VERCEL.md)
- [Documentação de Upload](./UPLOAD-ADMIN.md)

