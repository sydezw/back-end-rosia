# 🔗 Guia de Integração Frontend ↔ Backend

Este guia mostra como integrar seu frontend com o backend da Rosita Floral Elegance.

## 📋 Índice

- [Configuração Inicial](#configuração-inicial)
- [Autenticação](#autenticação)
- [Produtos](#produtos)
- [Carrinho e Checkout](#carrinho-e-checkout)
- [Pedidos](#pedidos)
- [Frete](#frete)
- [Exemplos Práticos](#exemplos-práticos)

## 🚀 Configuração Inicial

### 1. Instalar Axios (Recomendado)

```bash
npm install axios
```

### 2. Configurar API Base

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // URL do seu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## 🔐 Autenticação

### Login Normal (Email/Senha)

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

## 🛍️ Produtos

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

## 🛒 Carrinho e Checkout

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

## 📦 Pedidos

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

## 🚚 Frete

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

## 💡 Exemplos Práticos

### Componente de Login (React)

```jsx
import React, { useState } from 'react';
import { login } from './api';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(email, password);
      console.log('Usuário logado:', user);
      // Redirecionar para dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
```

### Componente de Produtos (React)

```jsx
import React, { useState, useEffect } from 'react';
import { getProducts } from './api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  useEffect(() => {
    loadProducts();
  }, [page, category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await getProducts({ page, category });
      setProducts(result.products);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando produtos...</div>;

  return (
    <div>
      <select 
        value={category} 
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Todas as categorias</option>
        <option value="buques">Buquês</option>
        <option value="arranjos">Arranjos</option>
      </select>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <img src={product.image_url} alt={product.name} />
            <h3>{product.name}</h3>
            <p>R$ {product.price.toFixed(2)}</p>
            <button>Adicionar ao Carrinho</button>
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
```

### Hook de Carrinho (React)

```jsx
import { useState, useEffect } from 'react';
import { validateCart, calculateShipping } from './api';

function useCart() {
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

## 🔧 Utilitários

### Verificar Autenticação

```javascript
function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
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
```

## 🚀 URLs de Produção

Quando for fazer deploy, altere a `baseURL` do axios:

```javascript
// Desenvolvimento
baseURL: 'http://localhost:3001/api'

// Produção (Railway)
baseURL: 'https://seu-app.railway.app/api'

// Produção (Render)
baseURL: 'https://seu-app.onrender.com/api'

// Produção (Vercel)
baseURL: 'https://seu-app.vercel.app/api'
```

## 📝 Notas Importantes

1. **Tokens**: Sempre salve os tokens no `localStorage` ou `sessionStorage`
2. **Interceptors**: Use interceptors do Axios para renovação automática de tokens
3. **Tratamento de Erros**: Implemente tratamento adequado para erros de rede e autenticação
4. **CORS**: Certifique-se de que o backend está configurado para aceitar requisições do seu domínio
5. **HTTPS**: Em produção, sempre use HTTPS tanto no frontend quanto no backend

---

**🌹 Rosita Floral Elegance - Backend API**

Para mais detalhes, consulte o [README principal](./README.md) do projeto.