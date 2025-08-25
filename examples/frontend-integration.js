// 🚀 GUIA DE INTEGRAÇÃO FRONTEND ↔ BACKEND
// Exemplos práticos de como chamar as APIs do backend

// ========================================
// 1️⃣ CONFIGURAÇÃO DO AXIOS (RECOMENDADO)
// ========================================

import axios from 'axios';

// Configuração base da API
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

// Interceptor para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, tentar renovar
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', {
            refresh_token: refreshToken
          });
          
          // Salvar novo token
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('refresh_token', data.session.refresh_token);
          
          // Repetir requisição original
          error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh falhou, redirecionar para login
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ========================================
// 2️⃣ FUNÇÕES DE AUTENTICAÇÃO
// ========================================

/**
 * Login com email e senha
 */
export async function loginNormal(email, password) {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    
    // Salvar tokens no localStorage
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Registro de novo usuário
 */
export async function registerUser({ name, email, password }) {
  try {
    const { data } = await api.post('/auth/register', { name, email, password });
    
    // Se retornou sessão, salvar tokens
    if (data.session) {
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Erro no registro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Login com Google
 */
export async function loginGoogle(googleToken) {
  try {
    const { data } = await api.post('/auth/login/google', { token: googleToken });
    
    // Salvar tokens
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Erro no login Google:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Login com Facebook
 */
export async function loginFacebook(facebookToken) {
  try {
    const { data } = await api.post('/auth/login/facebook', { token: facebookToken });
    
    // Salvar tokens
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Erro no login Facebook:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Logout
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Erro no logout:', error);
  } finally {
    // Limpar dados locais independente do resultado
    localStorage.clear();
    window.location.href = '/login';
  }
}

/**
 * Obter dados do usuário atual
 */
export async function getCurrentUser() {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    throw error;
  }
}

/**
 * Solicitar reset de senha
 */
export async function forgotPassword(email) {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (error) {
    console.error('Erro ao solicitar reset:', error);
    throw error;
  }
}

// ========================================
// 3️⃣ FUNÇÕES DE PRODUTOS
// ========================================

/**
 * Listar produtos
 */
export async function getProducts({ page = 1, limit = 12, category, search } = {}) {
  try {
    const params = new URLSearchParams({ page, limit });
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    
    const { data } = await api.get(`/products?${params}`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
}

/**
 * Obter produto por ID
 */
export async function getProduct(id) {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    throw error;
  }
}

/**
 * Obter categorias
 */
export async function getCategories() {
  try {
    const { data } = await api.get('/products/meta/categories');
    return data;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw error;
  }
}

// ========================================
// 4️⃣ FUNÇÕES DE CHECKOUT E PEDIDOS
// ========================================

/**
 * Validar carrinho antes do checkout
 */
export async function validateCart(cart, cep = null) {
  try {
    const { data } = await api.post('/checkout/validate', { cart, cep });
    return data;
  } catch (error) {
    console.error('Erro ao validar carrinho:', error);
    throw error;
  }
}

/**
 * Criar pedido
 */
export async function createOrder(orderData) {
  try {
    const { data } = await api.post('/checkout/create', orderData);
    return data;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
}

/**
 * Listar pedidos do usuário
 */
export async function getUserOrders({ page = 1, limit = 10, status } = {}) {
  try {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    
    const { data } = await api.get(`/orders?${params}`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

/**
 * Obter detalhes de um pedido
 */
export async function getOrder(orderId) {
  try {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    throw error;
  }
}

/**
 * Cancelar pedido
 */
export async function cancelOrder(orderId) {
  try {
    const { data } = await api.put(`/orders/${orderId}/cancel`);
    return data;
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    throw error;
  }
}

// ========================================
// 5️⃣ FUNÇÕES DE FRETE
// ========================================

/**
 * Calcular frete
 */
export async function calculateShipping(cep, cart) {
  try {
    const { data } = await api.post('/shipping/calculate', { cep, cart });
    return data;
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    throw error;
  }
}

/**
 * Obter métodos de entrega
 */
export async function getShippingMethods() {
  try {
    const { data } = await api.get('/shipping/methods');
    return data;
  } catch (error) {
    console.error('Erro ao buscar métodos de entrega:', error);
    throw error;
  }
}

// ========================================
// 6️⃣ EXEMPLOS DE USO NO REACT
// ========================================

/*
// Exemplo de componente de Login
import React, { useState } from 'react';
import { loginNormal, loginGoogle } from './api';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await loginNormal(email, password);
      console.log('Login realizado:', result.user);
      // Redirecionar para dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Erro no login: ' + error.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
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

// Exemplo de listagem de produtos
import React, { useState, useEffect } from 'react';
import { getProducts } from './api';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadProducts = async () => {
    try {
      const result = await getProducts({ page, limit: 12 });
      setProducts(result.products);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>R$ {product.price}</p>
        </div>
      ))}
    </div>
  );
}
*/

// ========================================
// 7️⃣ UTILITÁRIOS
// ========================================

/**
 * Verificar se usuário está logado
 */
export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

/**
 * Obter usuário do localStorage
 */
export function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/**
 * Formatar preço para exibição
 */
export function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

/**
 * Formatar CEP
 */
export function formatCEP(cep) {
  return cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Validar CEP
 */
export function isValidCEP(cep) {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}