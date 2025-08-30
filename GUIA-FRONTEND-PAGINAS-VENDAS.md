# 🛍️ Guia Frontend - Páginas de Vendas e Produtos

## 📋 Visão Geral

Este guia explica como implementar as páginas de vendas, catálogo de produtos, carrinho de compras e gestão de pedidos no frontend.

## 🔗 URLs da API

**Produção:** `https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app`
**Local:** `http://localhost:3001`

## 📦 Endpoints de Produtos

### 1. Listar Produtos

**Endpoint:** `GET /products`
**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `limit` (opcional): Itens por página (padrão: 20)
- `category` (opcional): Filtrar por categoria
- `search` (opcional): Buscar por nome/descrição
- `min_price` (opcional): Preço mínimo
- `max_price` (opcional): Preço máximo

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  material?: string;
  brand?: string;
  weight?: number;
  volume?: number;
  tags?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Exemplo de uso
const getProducts = async (filters?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
}) => {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await fetch(`${API_URL}/products?${params}`);
  return response.json() as Promise<ProductsResponse>;
};
```

### 2. Obter Produto por ID

**Endpoint:** `GET /products/:id`

```typescript
const getProduct = async (id: string): Promise<Product> => {
  const response = await fetch(`${API_URL}/products/${id}`);
  
  if (!response.ok) {
    throw new Error('Produto não encontrado');
  }
  
  return response.json();
};
```

### 3. Buscar Produtos

**Endpoint:** `GET /products/search?q={query}`

```typescript
const searchProducts = async (query: string): Promise<Product[]> => {
  const response = await fetch(`${API_URL}/products/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.products;
};
```

## 🛒 Gerenciamento de Carrinho

### Hook do Carrinho

```typescript
import { useState, useEffect } from 'react';

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
  itemCount: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<Cart>({
    items: [],
    total: 0,
    subtotal: 0,
    itemCount: 0
  });

  // Carregar carrinho do localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
      }
    }
  }, []);

  // Salvar carrinho no localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Calcular totais
  useEffect(() => {
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    setCart(prev => ({
      ...prev,
      subtotal,
      total: subtotal, // Aqui você pode adicionar frete, taxas, etc.
      itemCount
    }));
  }, [cart.items]);

  const addToCart = (product: Product, quantity: number = 1, options?: {
    color?: string;
    size?: string;
  }) => {
    setCart(prev => {
      const existingItemIndex = prev.items.findIndex(item => 
        item.product.id === product.id &&
        item.selectedColor === options?.color &&
        item.selectedSize === options?.size
      );

      if (existingItemIndex >= 0) {
        // Atualizar quantidade do item existente
        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex].quantity += quantity;
        return { ...prev, items: updatedItems };
      } else {
        // Adicionar novo item
        const newItem: CartItem = {
          id: `${product.id}-${options?.color || ''}-${options?.size || ''}`,
          product,
          quantity,
          selectedColor: options?.color,
          selectedSize: options?.size
        };
        return { ...prev, items: [...prev.items, newItem] };
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    }));
  };

  const clearCart = () => {
    setCart({
      items: [],
      total: 0,
      subtotal: 0,
      itemCount: 0
    });
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };
};
```

## 🏪 Componentes de Produtos

### 1. Lista de Produtos

```tsx
import React, { useState, useEffect } from 'react';
import { useProducts } from './hooks/useProducts';
import { ProductCard } from './components/ProductCard';
import { ProductFilters } from './components/ProductFilters';
import { Pagination } from './components/Pagination';

interface ProductListProps {
  category?: string;
}

const ProductList: React.FC<ProductListProps> = ({ category }) => {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category,
    search: '',
    min_price: undefined as number | undefined,
    max_price: undefined as number | undefined
  });

  const { products, pagination, loading, error } = useProducts(filters);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading) {
    return (
      <div className="products-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 h-64 rounded-lg mb-4"></div>
              <div className="bg-gray-300 h-4 rounded mb-2"></div>
              <div className="bg-gray-300 h-4 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <p>Erro ao carregar produtos: {error}</p>
        <button onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="products-page">
      <ProductFilters 
        filters={filters}
        onChange={handleFilterChange}
      />
      
      <div className="products-grid">
        {products.length === 0 ? (
          <div className="no-products">
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
              />
            ))}
          </div>
        )}
      </div>
      
      {pagination && pagination.pages > 1 && (
        <Pagination 
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};
```

### 2. Card de Produto

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './hooks/useCart';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    
    // Feedback visual
    const button = e.currentTarget as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Adicionado!';
    button.disabled = true;
    
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1500);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="product-card">
      <Link to={`/produto/${product.id}`} className="product-link">
        <div className="product-image">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-product.jpg';
              }}
            />
          ) : (
            <div className="no-image">
              <span>Sem imagem</span>
            </div>
          )}
          
          {product.stock <= 5 && product.stock > 0 && (
            <div className="stock-warning">
              Últimas {product.stock} unidades
            </div>
          )}
          
          {product.stock === 0 && (
            <div className="out-of-stock">
              Esgotado
            </div>
          )}
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-category">{product.category}</p>
          
          {product.colors && product.colors.length > 0 && (
            <div className="product-colors">
              {product.colors.slice(0, 3).map(color => (
                <span 
                  key={color} 
                  className="color-dot"
                  style={{ backgroundColor: color.toLowerCase() }}
                  title={color}
                />
              ))}
              {product.colors.length > 3 && (
                <span className="more-colors">+{product.colors.length - 3}</span>
              )}
            </div>
          )}
          
          <div className="product-price">
            {formatPrice(product.price)}
          </div>
        </div>
      </Link>
      
      <div className="product-actions">
        <button 
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="add-to-cart-btn"
        >
          {product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
        </button>
      </div>
    </div>
  );
};
```

### 3. Página de Produto Individual

```tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from './hooks/useCart';
import { getProduct } from './api/products';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const productData = await getProduct(id);
        setProduct(productData);
        
        // Definir seleções padrão
        if (productData.colors && productData.colors.length > 0) {
          setSelectedColor(productData.colors[0]);
        }
        if (productData.sizes && productData.sizes.length > 0) {
          setSelectedSize(productData.sizes[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCart(product, quantity, {
      color: selectedColor,
      size: selectedSize
    });
    
    // Feedback
    alert('Produto adicionado ao carrinho!');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="product-page-loading">
        <div className="animate-pulse flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <div className="bg-gray-300 h-96 rounded-lg mb-4"></div>
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-300 h-20 w-20 rounded"></div>
              ))}
            </div>
          </div>
          <div className="md:w-1/2 space-y-4">
            <div className="bg-gray-300 h-8 rounded"></div>
            <div className="bg-gray-300 h-6 rounded w-2/3"></div>
            <div className="bg-gray-300 h-20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="error-page">
        <h1>Produto não encontrado</h1>
        <p>{error}</p>
        <Link to="/produtos">Voltar aos produtos</Link>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.image_url 
    ? [product.image_url] 
    : [];

  return (
    <div className="product-page">
      <div className="product-container">
        {/* Galeria de Imagens */}
        <div className="product-gallery">
          {images.length > 0 ? (
            <>
              <div className="main-image">
                <img 
                  src={images[selectedImage]} 
                  alt={product.name}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-product.jpg';
                  }}
                />
              </div>
              
              {images.length > 1 && (
                <div className="image-thumbnails">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    >
                      <img src={image} alt={`${product.name} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-image-large">
              <span>Sem imagem disponível</span>
            </div>
          )}
        </div>
        
        {/* Informações do Produto */}
        <div className="product-details">
          <h1 className="product-title">{product.name}</h1>
          <p className="product-category">{product.category}</p>
          
          <div className="product-price-large">
            {formatPrice(product.price)}
          </div>
          
          <div className="product-description">
            <p>{product.description}</p>
          </div>
          
          {/* Opções de Cor */}
          {product.colors && product.colors.length > 0 && (
            <div className="product-options">
              <label>Cor:</label>
              <div className="color-options">
                {product.colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color.toLowerCase() }}
                    title={color}
                  >
                    {selectedColor === color && <span className="checkmark">✓</span>}
                  </button>
                ))}
              </div>
              <span className="selected-option">Selecionado: {selectedColor}</span>
            </div>
          )}
          
          {/* Opções de Tamanho */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="product-options">
              <label>Tamanho:</label>
              <div className="size-options">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`size-option ${selectedSize === size ? 'selected' : ''}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Quantidade */}
          <div className="quantity-selector">
            <label>Quantidade:</label>
            <div className="quantity-controls">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
            <span className="stock-info">
              {product.stock} unidades disponíveis
            </span>
          </div>
          
          {/* Botões de Ação */}
          <div className="product-actions-large">
            <button 
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="add-to-cart-large"
            >
              {product.stock === 0 ? 'Produto Esgotado' : 'Adicionar ao Carrinho'}
            </button>
            
            <button className="buy-now-btn">
              Comprar Agora
            </button>
          </div>
          
          {/* Informações Adicionais */}
          <div className="product-specs">
            {product.material && (
              <div className="spec">
                <strong>Material:</strong> {product.material}
              </div>
            )}
            {product.brand && (
              <div className="spec">
                <strong>Marca:</strong> {product.brand}
              </div>
            )}
            {product.weight && (
              <div className="spec">
                <strong>Peso:</strong> {product.weight}g
              </div>
            )}
            {product.volume && (
              <div className="spec">
                <strong>Volume:</strong> {product.volume}ml
              </div>
            )}
          </div>
          
          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="product-tags">
              {product.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 🎨 Estilos CSS

```css
/* Produtos */
.products-grid {
  padding: 20px;
}

.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  background: white;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.product-image {
  position: relative;
  height: 250px;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.stock-warning {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.out-of-stock {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #f44336;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.product-info {
  padding: 15px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}

.product-category {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.product-colors {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #ddd;
}

.more-colors {
  font-size: 12px;
  color: #666;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: #2e7d32;
}

.add-to-cart-btn {
  width: 100%;
  padding: 12px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  margin: 15px;
  margin-top: 0;
}

.add-to-cart-btn:hover:not(:disabled) {
  background: #1b5e20;
}

.add-to-cart-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Página de Produto */
.product-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.product-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

@media (max-width: 768px) {
  .product-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.product-gallery .main-image {
  margin-bottom: 15px;
}

.product-gallery .main-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 12px;
}

.image-thumbnails {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}

.thumbnail {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.3s;
}

.thumbnail.active {
  border-color: #2e7d32;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #333;
}

.product-price-large {
  font-size: 32px;
  font-weight: 700;
  color: #2e7d32;
  margin: 20px 0;
}

.product-options {
  margin: 20px 0;
}

.product-options label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
}

.color-options {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #ddd;
  cursor: pointer;
  position: relative;
  transition: border-color 0.3s;
}

.color-option.selected {
  border-color: #2e7d32;
}

.color-option .checkmark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.size-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.size-option {
  padding: 10px 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.size-option.selected {
  border-color: #2e7d32;
  background: #2e7d32;
  color: white;
}

.quantity-selector {
  margin: 20px 0;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 10px 0;
}

.quantity-controls button {
  width: 40px;
  height: 40px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
}

.quantity-value {
  font-size: 18px;
  font-weight: 600;
  min-width: 30px;
  text-align: center;
}

.stock-info {
  color: #666;
  font-size: 14px;
}

.product-actions-large {
  display: flex;
  gap: 15px;
  margin: 30px 0;
}

.add-to-cart-large {
  flex: 2;
  padding: 15px;
  background: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.buy-now-btn {
  flex: 1;
  padding: 15px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.product-specs {
  margin: 30px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.spec {
  margin-bottom: 10px;
}

.product-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.tag {
  padding: 5px 10px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}
```

## 📱 Responsividade

```css
/* Mobile First */
@media (max-width: 640px) {
  .products-grid .grid {
    grid-template-columns: 1fr;
  }
  
  .product-actions-large {
    flex-direction: column;
  }
  
  .quantity-controls {
    justify-content: center;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .products-grid .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1025px) {
  .products-grid .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## ✅ Checklist de Implementação

### Produtos
- [ ] Hook useProducts para buscar produtos
- [ ] Componente ProductList com filtros
- [ ] Componente ProductCard responsivo
- [ ] Página de produto individual
- [ ] Sistema de busca
- [ ] Filtros por categoria, preço, etc.
- [ ] Paginação

### Carrinho
- [ ] Hook useCart para gerenciar estado
- [ ] Persistência no localStorage
- [ ] Componente de carrinho lateral
- [ ] Página de carrinho completa
- [ ] Cálculo de totais
- [ ] Validação de estoque

### UX/UI
- [ ] Loading states
- [ ] Estados de erro
- [ ] Feedback visual
- [ ] Responsividade
- [ ] Acessibilidade
- [ ] SEO otimizado

---

**🛍️ Páginas de vendas prontas para implementação!**

🎨 **Moderno** | 📱 **Responsivo** | ⚡ **Performático**