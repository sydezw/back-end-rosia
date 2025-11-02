# Estrutura de Dados para Cada Aba do Admin

## 📊 1. DASHBOARD - Estrutura de Dados

### **Estado do Componente:**
```javascript
const [dashboardData, setDashboardData] = useState({
  stats: {
    totalSales: 0,
    todaySales: 0,
    monthSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
    totalUsers: 0
  },
  recentOrders: [],
  topProducts: [],
  loading: true,
  error: null
});
```

### **Formato dos Dados do Backend:**
```javascript
// Resposta de /api/admin/dashboard/stats
{
  "success": true,
  "data": {
    "sales": {
      "total": 15420.50,
      "today": 320.00,
      "month": 4580.30
    },
    "orders": {
      "total": 156,
      "pending": 8,
      "processing": 12,
      "completed": 136
    },
    "products": {
      "total": 45,
      "active": 42,
      "inactive": 3
    },
    "users": {
      "total": 89,
      "new_this_month": 12
    }
  }
}

// Resposta de /api/orders?limit=10
{
  "success": true,
  "orders": [
    {
      "id": "order_123",
      "user_email": "cliente@email.com",
      "total": 89.90,
      "status": "pending",
      "created_at": "2025-01-21T10:30:00Z",
      "items_count": 3
    }
  ]
}
```

---

## 📦 2. PRODUTOS - Estrutura de Dados

### **Estado do Componente:**
```javascript
const [productsData, setProductsData] = useState({
  products: [],
  currentProduct: null,
  filters: {
    category: 'all',
    status: 'all',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null
});
```

### **Formato dos Dados do Backend:**
```javascript
// Resposta de /api/products
{
  "success": true,
  "products": [
    {
      "id": "prod_123",
      "name": "Produto Exemplo",
      "description": "Descrição do produto",
      "price": 99.90,
      "category": "categoria-exemplo",
      "stock": 50,
      "status": "active",
      "images": [
        {
          "id": "img_1",
          "url": "https://supabase.co/storage/v1/object/public/product-images/image1.webp",
          "is_primary": true
        }
      ],
      "created_at": "2025-01-21T10:30:00Z",
      "updated_at": "2025-01-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}

// Dados para criar/editar produto
{
  "name": "Nome do Produto",
  "description": "Descrição detalhada",
  "price": 99.90,
  "category": "categoria",
  "stock": 100,
  "status": "active",
  "weight": 0.5,
  "dimensions": {
    "length": 10,
    "width": 8,
    "height": 5
  },
  "seo": {
    "title": "Título SEO",
    "description": "Meta descrição",
    "keywords": "palavra1, palavra2"
  }
}
```

---

## 🛒 3. PEDIDOS - Estrutura de Dados

### **Estado do Componente:**
```javascript
const [ordersData, setOrdersData] = useState({
  orders: [],
  currentOrder: null,
  filters: {
    status: 'all',
    dateRange: 'all',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null
});
```

### **Formato dos Dados do Backend:**
```javascript
// Resposta de /api/orders
{
  "success": true,
  "orders": [
    {
      "id": "order_123",
      "user_id": "user_456",
      "user_email": "cliente@email.com",
      "status": "pending",
      "total": 189.80,
      "subtotal": 159.90,
      "shipping_cost": 29.90,
      "payment_method": "credit_card",
      "payment_status": "pending",
      "shipping_address": {
        "street": "Rua Exemplo, 123",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01234-567",
        "country": "Brasil"
      },
      "items": [
        {
          "product_id": "prod_123",
          "product_name": "Produto A",
          "quantity": 2,
          "unit_price": 79.95,
          "total_price": 159.90
        }
      ],
      "tracking_code": null,
      "created_at": "2025-01-21T10:30:00Z",
      "updated_at": "2025-01-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}

// Status disponíveis para pedidos
const ORDER_STATUSES = {
  'pending': 'Pendente',
  'confirmed': 'Confirmado',
  'processing': 'Processando',
  'shipped': 'Enviado',
  'delivered': 'Entregue',
  'cancelled': 'Cancelado'
};
```

---

## 👥 4. USUÁRIOS - Estrutura de Dados

### **Estado do Componente:**
```javascript
const [usersData, setUsersData] = useState({
  users: [],
  currentUser: null,
  filters: {
    status: 'all',
    dateRange: 'all',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null
});
```

### **Formato dos Dados do Backend:**
```javascript
// Resposta de /api/admin/users
{
  "success": true,
  "users": [
    {
      "id": "user_123",
      "email": "cliente@email.com",
      "name": "João Silva",
      "phone": "+55 11 99999-9999",
      "status": "active",
      "email_verified": true,
      "total_orders": 5,
      "total_spent": 450.00,
      "last_order_date": "2025-01-20T15:30:00Z",
      "addresses": [
        {
          "id": "addr_1",
          "street": "Rua Exemplo, 123",
          "city": "São Paulo",
          "state": "SP",
          "zip_code": "01234-567",
          "is_default": true
        }
      ],
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 89,
    "totalPages": 5
  }
}
```

---

## ⚙️ 5. CONFIGURAÇÕES - Estrutura de Dados

### **Estado do Componente:**
```javascript
const [settingsData, setSettingsData] = useState({
  store: {
    name: '',
    description: '',
    logo: '',
    contact: {
      email: '',
      phone: '',
      whatsapp: ''
    },
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Brasil'
    }
  },
  payment: {
    mercadopago: {
      enabled: false,
      public_key: '',
      access_token: ''
    },
    pix: {
      enabled: false,
      key: ''
    }
  },
  shipping: {
    correios: {
      enabled: false,
      api_key: ''
    },
    free_shipping_threshold: 0,
    processing_days: 1
  },
  loading: false,
  error: null
});
```

### **Formato dos Dados do Backend:**
```javascript
// Resposta de /api/admin/settings
{
  "success": true,
  "settings": {
    "store": {
      "name": "Rosia Store",
      "description": "Loja online de produtos incríveis",
      "logo": "https://supabase.co/storage/v1/object/public/assets/logo.png",
      "contact": {
        "email": "contato@rosia.com.br",
        "phone": "+55 11 99999-9999",
        "whatsapp": "+55 11 99999-9999"
      },
      "address": {
        "street": "Rua Comercial, 123",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01234-567",
        "country": "Brasil"
      }
    },
    "payment": {
      "mercadopago": {
        "enabled": true,
        "public_key": "TEST-xxx",
        "access_token": "TEST-xxx"
      },
      "pix": {
        "enabled": true,
        "key": "contato@rosia.com.br"
      }
    },
    "shipping": {
      "correios": {
        "enabled": true,
        "api_key": "xxx"
      },
      "free_shipping_threshold": 100.00,
      "processing_days": 2
    }
  }
}
```

---

## 🔄 GERENCIAMENTO DE ESTADO GLOBAL

### **Context para Admin:**
```javascript
// contexts/AdminContext.js
const AdminContext = createContext();

const AdminProvider = ({ children }) => {
  const [adminState, setAdminState] = useState({
    user: null,
    token: null,
    permissions: [],
    isAuthenticated: false,
    loading: true
  });
  
  const login = (userData, token) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('userData', JSON.stringify(userData));
    
    setAdminState({
      user: userData,
      token,
      permissions: userData.permissions || [],
      isAuthenticated: true,
      loading: false
    });
  };
  
  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userData');
    
    setAdminState({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      loading: false
    });
  };
  
  return (
    <AdminContext.Provider value={{
      ...adminState,
      login,
      logout
    }}>
      {children}
    </AdminContext.Provider>
  );
};
```

---

## 📋 TIPOS DE DADOS TYPESCRIPT (Opcional)

```typescript
// types/admin.ts
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive';
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  user_id: string;
  user_email: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  shipping_address: Address;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: 'active' | 'inactive';
  total_orders: number;
  total_spent: number;
  created_at: string;
}

interface DashboardStats {
  sales: {
    total: number;
    today: number;
    month: number;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    new_this_month: number;
  };
}
```

---

## 🚀 IMPLEMENTAÇÃO PRÁTICA

### **1. Hook Genérico para API:**
```javascript
// hooks/useApi.js
const useApi = () => {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };
  
  const apiCall = async (endpoint, options = {}) => {
    const response = await fetch(`https://back-end-rosia.vercel.app${endpoint}`, {
      headers: getAuthHeaders(),
      ...options
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token inválido - redirecionar para login
        localStorage.clear();
        window.location.href = '/admin/login';
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  };
  
  return { apiCall };
};
```

### **2. Hook para cada aba:**
```javascript
// hooks/useAdminDashboard.js
const useAdminDashboard = () => {
  const { apiCall } = useApi();
  const [data, setData] = useState(initialState);
  
  const fetchDashboardData = async () => {
    setData(prev => ({ ...prev, loading: true }));
    
    try {
      const [stats, orders, products] = await Promise.all([
        apiCall('/api/admin/dashboard/stats'),
        apiCall('/api/orders?limit=10'),
        apiCall('/api/admin/products/top-selling')
      ]);
      
      setData({
        stats: stats.data,
        recentOrders: orders.orders,
        topProducts: products.products,
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };
  
  return { data, fetchDashboardData };
};
```

**Agora você tem a estrutura completa de dados para implementar todas as abas do admin! 🎯**

