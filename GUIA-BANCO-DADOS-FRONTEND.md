# 🗄️ Guia Completo - Banco de Dados e APIs Frontend

## 📋 Visão Geral

Este guia explica toda a estrutura do banco de dados, como o frontend deve se conectar às APIs para gerenciar produtos, pedidos e usuários, incluindo hooks personalizados.

## 🔗 URLs da API

**Produção:** `https://back-end-rosia.vercel.app`
**Local:** `http://localhost:3001`

## 🗃️ Estrutura do Banco de Dados

### 📊 Tabelas Principais

#### 1. **users** - Usuários do Sistema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **admin_users** - Usuários Administrativos
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **products** - Catálogo de Produtos
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    images TEXT[], -- Array de URLs de imagens
    colors TEXT[], -- Array de cores disponíveis
    sizes TEXT[], -- Array de tamanhos disponíveis
    material VARCHAR(100),
    brand VARCHAR(100),
    weight DECIMAL(8,2), -- em gramas
    volume DECIMAL(8,2), -- em ml
    tags TEXT[], -- Array de tags para busca
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **orders** - Pedidos
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255), -- ID do Mercado Pago
    shipping_address JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **order_items** - Itens dos Pedidos
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    selected_color VARCHAR(50),
    selected_size VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **shipping_addresses** - Endereços de Entrega
```sql
CREATE TABLE shipping_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    number VARCHAR(20) NOT NULL,
    complement VARCHAR(255),
    neighborhood VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛍️ APIs de Produtos

### 1. Listar Produtos (Público)

**Endpoint:** `GET /products`

```typescript
interface ProductsAPI {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
  }) => Promise<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;
}

// Hook para produtos
export const useProducts = (filters?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
      }
      
      const response = await fetch(`${API_URL}/products?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }
      
      const data = await response.json();
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    pagination,
    loading,
    error,
    refetch: fetchProducts
  };
};
```

### 2. Obter Produto por ID (Público)

**Endpoint:** `GET /products/:id`

```typescript
export const useProduct = (id: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/products/${id}`);
        
        if (!response.ok) {
          throw new Error('Produto não encontrado');
        }
        
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  return { product, loading, error };
};
```

## 🔐 APIs Administrativas de Produtos

### 1. Criar Produto (Admin)

**Endpoint:** `POST /admin/products`
**Headers:** `Authorization: Bearer {admin_token}`

```typescript
interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  material?: string;
  brand?: string;
  weight?: number;
  volume?: number;
  tags?: string[];
}

export const useAdminProducts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = async (productData: CreateProductData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar produto');
      }
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, productData: Partial<CreateProductData>) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar produto');
      }
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar produto');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    loading,
    error
  };
};
```

### 2. Listar Todos os Produtos (Admin)

**Endpoint:** `GET /admin/products`
**Headers:** `Authorization: Bearer {admin_token}`

```typescript
export const useAdminProductsList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }
      
      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  return {
    products,
    loading,
    error,
    refetch: fetchAllProducts
  };
};
```

## 📦 APIs de Pedidos

### 1. Listar Pedidos do Usuário

**Endpoint:** `GET /orders`
**Headers:** `Authorization: Bearer {user_token}`

```typescript
export const useUserOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('user_token');
      if (!token) {
        throw new Error('Token de usuário não encontrado');
      }
      
      const response = await fetch(`${API_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar pedidos');
      }
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders
  };
};
```

### 2. Obter Pedido por ID

**Endpoint:** `GET /orders/:id`
**Headers:** `Authorization: Bearer {user_token}`

```typescript
export const useOrder = (orderId: string) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('user_token');
        if (!token) {
          throw new Error('Token de usuário não encontrado');
        }
        
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Pedido não encontrado');
        }
        
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return { order, loading, error };
};
```

## 🔐 APIs Administrativas de Pedidos

### 1. Listar Todos os Pedidos (Admin)

**Endpoint:** `GET /admin/orders`
**Headers:** `Authorization: Bearer {admin_token}`

```typescript
export const useAdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar pedidos');
      }
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status');
      }
      
      // Atualizar lista local
      await fetchAllOrders();
      
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  return {
    orders,
    loading,
    error,
    updateOrderStatus,
    refetch: fetchAllOrders
  };
};
```

## 👥 APIs de Usuários

### 1. Listar Usuários (Admin)

**Endpoint:** `GET /admin/users`
**Headers:** `Authorization: Bearer {admin_token}`

```typescript
export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers
  };
};
```

## 🖼️ Upload de Imagens

### 1. Upload de Imagem de Produto

**Endpoint:** `POST /upload/product-image`
**Headers:** `Authorization: Bearer {admin_token}`
**Content-Type:** `multipart/form-data`

```typescript
export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadProductImage = async (file: File): Promise<string> => {
    try {
      setUploading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${API_URL}/upload/product-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }
      
      const data = await response.json();
      return data.imageUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadProductImage,
    uploading,
    error
  };
};
```

## 🔧 Hook Completo para Administração

```typescript
import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface AdminDashboardData {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export const useAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('Token de administrador não encontrado');
      }
      
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    refetch: fetchDashboardData
  };
};
```

## 📱 Componente de Administração de Produtos

```tsx
import React, { useState } from 'react';
import { useAdminProducts, useAdminProductsList, useImageUpload } from './hooks';

const AdminProductsPage: React.FC = () => {
  const { products, loading: loadingList, refetch } = useAdminProductsList();
  const { createProduct, updateProduct, deleteProduct, loading: actionLoading } = useAdminProducts();
  const { uploadProductImage, uploading } = useImageUpload();
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    colors: [] as string[],
    sizes: [] as string[],
    material: '',
    brand: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        category: '',
        colors: [],
        sizes: [],
        material: '',
        brand: ''
      });
      setEditingProduct(null);
      setShowForm(false);
      
      // Refresh list
      refetch();
      
      alert('Produto salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        await deleteProduct(id);
        refetch();
        alert('Produto deletado com sucesso!');
      } catch (error) {
        alert('Erro ao deletar produto');
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const imageUrl = await uploadProductImage(file);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
    } catch (error) {
      alert('Erro ao fazer upload da imagem');
    }
  };

  return (
    <div className="admin-products">
      <div className="header">
        <h1>Gerenciar Produtos</h1>
        <button 
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Novo Produto
        </button>
      </div>
      
      {showForm && (
        <div className="product-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Descrição:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Preço:</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Estoque:</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Imagem:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <span>Fazendo upload...</span>}
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={actionLoading}>
                {actionLoading ? 'Salvando...' : 'Salvar'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="products-list">
        {loadingList ? (
          <div>Carregando produtos...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>R$ {product.price.toFixed(2)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData({
                          name: product.name,
                          description: product.description || '',
                          price: product.price,
                          stock: product.stock,
                          category: product.category || '',
                          colors: product.colors || [],
                          sizes: product.sizes || [],
                          material: product.material || '',
                          brand: product.brand || ''
                        });
                        setShowForm(true);
                      }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="btn-danger"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminProductsPage;
```

## 🔑 Variáveis de Ambiente Necessárias

```env
# Frontend (.env)
REACT_APP_API_URL=https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
```

## 📋 Status dos Pedidos

```typescript
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pendente',
  [ORDER_STATUS.CONFIRMED]: 'Confirmado',
  [ORDER_STATUS.PROCESSING]: 'Processando',
  [ORDER_STATUS.SHIPPED]: 'Enviado',
  [ORDER_STATUS.DELIVERED]: 'Entregue',
  [ORDER_STATUS.CANCELLED]: 'Cancelado'
};
```

## ✅ Checklist de Implementação

### Backend (Já Implementado)
- [x] Estrutura do banco de dados
- [x] APIs de produtos públicas
- [x] APIs administrativas
- [x] Sistema de autenticação
- [x] Upload de imagens
- [x] Integração Mercado Pago

### Frontend (Para Implementar)
- [ ] Configurar variáveis de ambiente
- [ ] Implementar hooks de produtos
- [ ] Implementar hooks administrativos
- [ ] Criar páginas de administração
- [ ] Implementar upload de imagens
- [ ] Testar todas as funcionalidades
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states

---

**🗄️ Banco de dados e APIs prontos para integração frontend!**

📊 **Completo** | 🔐 **Seguro** | ⚡ **Eficiente**