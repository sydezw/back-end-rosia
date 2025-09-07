# Guia Completo: Abas do Admin e Integração com Backend

## 🎯 Visão Geral
Este guia detalha como cada aba do painel administrativo deve se conectar com o backend e quais endpoints usar.

---

## 📊 1. ABA DASHBOARD

### **Informações Necessárias:**
- Resumo de vendas (total, hoje, mês)
- Produtos mais vendidos
- Pedidos recentes
- Estatísticas gerais

### **Endpoints do Backend:**
```javascript
// Estatísticas gerais
GET https://back-end-rosia.vercel.app/api/admin/dashboard/stats
Headers: { Authorization: 'Bearer {admin_token}' }

// Pedidos recentes (últimos 10)
GET https://back-end-rosia.vercel.app/api/orders?limit=10&sort=created_at:desc
Headers: { Authorization: 'Bearer {admin_token}' }

// Produtos mais vendidos
GET https://back-end-rosia.vercel.app/api/admin/products/top-selling
Headers: { Authorization: 'Bearer {admin_token}' }
```

### **Como Implementar no Frontend:**
```javascript
// hooks/useAdminDashboard.js
const useAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  
  const fetchDashboardData = async () => {
    const token = localStorage.getItem('admin_token');
    
    // Buscar estatísticas
    const statsResponse = await fetch('/api/admin/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Buscar pedidos recentes
    const ordersResponse = await fetch('/api/orders?limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Buscar produtos mais vendidos
    const productsResponse = await fetch('/api/admin/products/top-selling', {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
};
```

---

## 📦 2. ABA PRODUTOS

### **Informações Necessárias:**
- Lista de todos os produtos
- Criar novo produto
- Editar produto existente
- Excluir produto
- Upload de imagens

### **Endpoints do Backend:**
```javascript
// Listar todos os produtos
GET https://back-end-rosia.vercel.app/api/products
Headers: { Authorization: 'Bearer {admin_token}' }

// Criar produto
POST https://back-end-rosia.vercel.app/api/products
Headers: { 
  Authorization: 'Bearer {admin_token}',
  Content-Type: 'multipart/form-data'
}
Body: FormData com produto + imagens

// Atualizar produto
PUT https://back-end-rosia.vercel.app/api/products/{id}
Headers: { Authorization: 'Bearer {admin_token}' }

// Excluir produto
DELETE https://back-end-rosia.vercel.app/api/products/{id}
Headers: { Authorization: 'Bearer {admin_token}' }
```

### **Como Implementar no Frontend:**
```javascript
// hooks/useAdminProducts.js
const useAdminProducts = () => {
  const [products, setProducts] = useState([]);
  
  const fetchProducts = async () => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setProducts(data.products);
  };
  
  const createProduct = async (productData, images) => {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    
    // Adicionar dados do produto
    Object.keys(productData).forEach(key => {
      formData.append(key, productData[key]);
    });
    
    // Adicionar imagens
    images.forEach(image => {
      formData.append('images', image);
    });
    
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  };
};
```

---

## 🛒 3. ABA PEDIDOS

### **Informações Necessárias:**
- Lista de todos os pedidos
- Filtrar por status
- Atualizar status do pedido
- Ver detalhes do pedido
- Histórico de pagamentos

### **Endpoints do Backend:**
```javascript
// Listar todos os pedidos
GET https://back-end-rosia.vercel.app/api/orders
Headers: { Authorization: 'Bearer {admin_token}' }
Query params: ?status=pending&page=1&limit=20

// Detalhes de um pedido
GET https://back-end-rosia.vercel.app/api/orders/{id}
Headers: { Authorization: 'Bearer {admin_token}' }

// Atualizar status do pedido
PUT https://back-end-rosia.vercel.app/api/orders/{id}/status
Headers: { Authorization: 'Bearer {admin_token}' }
Body: { status: 'processing' | 'shipped' | 'delivered' | 'cancelled' }
```

### **Como Implementar no Frontend:**
```javascript
// hooks/useAdminOrders.js
const useAdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: 'all' });
  
  const fetchOrders = async () => {
    const token = localStorage.getItem('admin_token');
    const queryParams = new URLSearchParams();
    
    if (filters.status !== 'all') {
      queryParams.append('status', filters.status);
    }
    
    const response = await fetch(`/api/orders?${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
  
  const updateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
  };
};
```

---

## 👥 4. ABA USUÁRIOS

### **Informações Necessárias:**
- Lista de usuários cadastrados
- Detalhes do usuário
- Histórico de pedidos por usuário
- Estatísticas de usuários

### **Endpoints do Backend:**
```javascript
// Listar usuários
GET https://back-end-rosia.vercel.app/api/admin/users
Headers: { Authorization: 'Bearer {admin_token}' }
Query params: ?page=1&limit=20&search=email

// Detalhes de um usuário
GET https://back-end-rosia.vercel.app/api/admin/users/{id}
Headers: { Authorization: 'Bearer {admin_token}' }

// Pedidos de um usuário
GET https://back-end-rosia.vercel.app/api/orders?user_id={id}
Headers: { Authorization: 'Bearer {admin_token}' }
```

### **Como Implementar no Frontend:**
```javascript
// hooks/useAdminUsers.js
const useAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchUsers = async () => {
    const token = localStorage.getItem('admin_token');
    const queryParams = new URLSearchParams();
    
    if (searchTerm) {
      queryParams.append('search', searchTerm);
    }
    
    const response = await fetch(`/api/admin/users?${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
  
  const fetchUserOrders = async (userId) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/api/orders?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
};
```

---

## ⚙️ 5. ABA CONFIGURAÇÕES

### **Informações Necessárias:**
- Configurações da loja
- Métodos de pagamento
- Configurações de frete
- Dados da empresa

### **Endpoints do Backend:**
```javascript
// Buscar configurações
GET https://back-end-rosia.vercel.app/api/admin/settings
Headers: { Authorization: 'Bearer {admin_token}' }

// Atualizar configurações
PUT https://back-end-rosia.vercel.app/api/admin/settings
Headers: { Authorization: 'Bearer {admin_token}' }
Body: { configurações atualizadas }

// Configurações de frete
GET https://back-end-rosia.vercel.app/api/admin/shipping/settings
Headers: { Authorization: 'Bearer {admin_token}' }
```

### **Como Implementar no Frontend:**
```javascript
// hooks/useAdminSettings.js
const useAdminSettings = () => {
  const [settings, setSettings] = useState({});
  
  const fetchSettings = async () => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
  
  const updateSettings = async (newSettings) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSettings)
    });
  };
};
```

---

## 🔐 AUTENTICAÇÃO EM TODAS AS ABAS

### **Token de Administrador:**
```javascript
// Sempre incluir o token em todas as requisições
const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Verificar se o token ainda é válido
const checkTokenValidity = async () => {
  const token = localStorage.getItem('admin_token');
  if (!token) return false;
  
  try {
    const response = await fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
};
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Para cada aba, implementar:
1. **Hook personalizado** para gerenciar estado
2. **Funções de API** com headers de autenticação
3. **Tratamento de erros** (401, 403, 500)
4. **Loading states** durante requisições
5. **Validação de formulários** antes do envio
6. **Feedback visual** (success/error messages)
7. **Paginação** para listas grandes
8. **Filtros e busca** quando aplicável

### 🔒 Segurança:
- Sempre verificar token antes das requisições
- Redirecionar para login se token inválido
- Não armazenar dados sensíveis no localStorage
- Implementar timeout para sessões

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementar hooks** para cada aba
2. **Criar componentes** de interface
3. **Testar integração** com backend
4. **Implementar tratamento de erros**
5. **Adicionar loading states**
6. **Testar fluxo completo**

**Backend Status: ✅ 100% Pronto e Funcional**