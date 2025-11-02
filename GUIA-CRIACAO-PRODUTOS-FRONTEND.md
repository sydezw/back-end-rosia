# Guia Completo para Criação de Produtos no Frontend

## Visão Geral

Este guia fornece todas as informações necessárias para implementar a funcionalidade de criação de produtos no frontend da loja Rosia, incluindo estrutura do banco de dados, validações, hooks e interfaces.

## 📊 Estrutura do Banco de Dados

### Tabela `products`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  colors JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  material VARCHAR(100),
  brand VARCHAR(100),
  weight DECIMAL(8,3),
  volume DECIMAL(10,6),
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Campos Obrigatórios vs Opcionais

### ✅ Campos Obrigatórios
- **name**: Nome do produto (mínimo 2 caracteres)
- **description**: Descrição do produto (mínimo 10 caracteres)
- **price**: Preço do produto (número > 0)
- **stock**: Quantidade em estoque (número ≥ 0)
- **category**: Categoria do produto (mínimo 2 caracteres)

### 📝 Campos Opcionais
- **image_url**: URL da imagem principal
- **images**: Array de URLs das imagens (JSONB)
- **colors**: Array de cores disponíveis (JSONB)
- **sizes**: Array de tamanhos disponíveis (JSONB)
- **material**: Material do produto
- **brand**: Marca do produto
- **weight**: Peso em kg
- **volume**: Volume em m³
- **active**: Status ativo (padrão: true)
- **featured**: Produto em destaque (padrão: false)
- **tags**: Array de tags
- **metadata**: Dados extras em JSON

## 🏗️ Estrutura de Abas Sugerida

### 1. **Aba Informações Básicas**
- Nome do produto
- Descrição
- Categoria
- Marca
- Material
- Tags

### 2. **Aba Preço e Estoque**
- Preço
- Estoque
- Peso
- Volume

### 3. **Aba Variações**
- Cores disponíveis
- Tamanhos disponíveis

### 4. **Aba Imagens**
- Upload de imagens (máximo 10)
- Imagem principal
- Galeria de imagens

### 5. **Aba Configurações**
- Produto ativo
- Produto em destaque
- Metadados extras

## 🔧 Hooks Recomendados

### 1. Hook para Criação de Produtos

```typescript
import { useState } from 'react';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  colors?: string[];
  sizes?: string[];
  material?: string;
  brand?: string;
  weight?: number;
  volume?: number;
  tags?: string[];
  active?: boolean;
  featured?: boolean;
  metadata?: Record<string, any>;
}

interface UseCreateProductReturn {
  createProduct: (data: ProductFormData, images?: File[]) => Promise<any>;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export const useCreateProduct = (): UseCreateProductReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createProduct = async (data: ProductFormData, images?: File[]) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      
      // Adicionar dados do produto
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Adicionar imagens
      if (images && images.length > 0) {
        images.forEach((image) => {
          formData.append('images', image);
        });
      }

      const token = localStorage.getItem('admin_token');
      const response = await fetch('https://back-end-rosia.vercel.app/admin/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar produto');
      }

      const result = await response.json();
      setSuccess(true);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createProduct, loading, error, success };
};
```

### 2. Hook para Upload de Imagens

```typescript
import { useState } from 'react';

interface UseImageUploadReturn {
  images: File[];
  previews: string[];
  addImages: (files: FileList | File[]) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  validateImages: () => string | null;
}

export const useImageUpload = (maxImages: number = 10): UseImageUploadReturn => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const addImages = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImages = fileArray.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (images.length + validImages.length > maxImages) {
      alert(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    setImages(prev => [...prev, ...validImages]);
    
    // Criar previews
    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImages([]);
    setPreviews([]);
  };

  const validateImages = (): string | null => {
    if (images.length === 0) {
      return 'Pelo menos uma imagem é recomendada';
    }
    return null;
  };

  return {
    images,
    previews,
    addImages,
    removeImage,
    clearImages,
    validateImages
  };
};
```

### 3. Hook para Validação de Formulário

```typescript
import { useState, useEffect } from 'react';

interface ValidationErrors {
  [key: string]: string;
}

interface UseFormValidationReturn {
  errors: ValidationErrors;
  isValid: boolean;
  validateField: (field: string, value: any) => void;
  validateForm: (data: any) => boolean;
  clearErrors: () => void;
}

export const useFormValidation = (): UseFormValidationReturn => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(false);

  const validateField = (field: string, value: any) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) {
          error = 'Nome deve ter pelo menos 2 caracteres';
        }
        break;
      case 'description':
        if (!value || value.trim().length < 10) {
          error = 'Descrição deve ter pelo menos 10 caracteres';
        }
        break;
      case 'price':
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
          error = 'Preço deve ser um número maior que zero';
        }
        break;
      case 'stock':
        if (value === undefined || isNaN(value) || parseInt(value) < 0) {
          error = 'Estoque deve ser um número maior ou igual a zero';
        }
        break;
      case 'category':
        if (!value || value.trim().length < 2) {
          error = 'Categoria é obrigatória';
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = (data: any): boolean => {
    const requiredFields = ['name', 'description', 'price', 'stock', 'category'];
    let formErrors: ValidationErrors = {};

    requiredFields.forEach(field => {
      validateField(field, data[field]);
    });

    const hasErrors = Object.values(errors).some(error => error !== '');
    return !hasErrors;
  };

  const clearErrors = () => {
    setErrors({});
  };

  useEffect(() => {
    const hasErrors = Object.values(errors).some(error => error !== '');
    setIsValid(!hasErrors);
  }, [errors]);

  return {
    errors,
    isValid,
    validateField,
    validateForm,
    clearErrors
  };
};
```

## 📝 Tipos TypeScript

```typescript
// Tipos para o produto
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  images: string[];
  colors: string[];
  sizes: string[];
  material?: string;
  brand?: string;
  weight?: number;
  volume?: number;
  active: boolean;
  featured: boolean;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Tipos para criação de produto
export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  colors?: string[];
  sizes?: string[];
  material?: string;
  brand?: string;
  weight?: number;
  volume?: number;
  tags?: string[];
  active?: boolean;
  featured?: boolean;
  metadata?: Record<string, any>;
}

// Resposta da API
export interface CreateProductResponse {
  message: string;
  product: Product;
  uploadError?: string;
}
```

## 🎨 Exemplo de Componente de Formulário

```tsx
import React, { useState } from 'react';
import { useCreateProduct } from './hooks/useCreateProduct';
import { useImageUpload } from './hooks/useImageUpload';
import { useFormValidation } from './hooks/useFormValidation';

const CreateProductForm: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    colors: [],
    sizes: [],
    material: '',
    brand: '',
    weight: 0,
    volume: 0,
    tags: [],
    active: true,
    featured: false
  });

  const { createProduct, loading, error, success } = useCreateProduct();
  const { images, previews, addImages, removeImage } = useImageUpload();
  const { errors, validateField, validateForm } = useFormValidation();

  const tabs = [
    'Informações Básicas',
    'Preço e Estoque',
    'Variações',
    'Imagens',
    'Configurações'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      alert('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      await createProduct(formData, images);
      alert('Produto criado com sucesso!');
      // Reset form ou redirect
    } catch (err) {
      console.error('Erro ao criar produto:', err);
    }
  };

  return (
    <div className="create-product-form">
      <h1>Criar Novo Produto</h1>
      
      {/* Navegação das abas */}
      <div className="tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Conteúdo das abas */}
        {activeTab === 0 && (
          <div className="tab-content">
            <h2>Informações Básicas</h2>
            {/* Campos básicos */}
          </div>
        )}
        
        {activeTab === 1 && (
          <div className="tab-content">
            <h2>Preço e Estoque</h2>
            {/* Campos de preço e estoque */}
          </div>
        )}
        
        {/* Outras abas... */}
        
        <div className="form-actions">
          <button type="button" onClick={() => setActiveTab(Math.max(0, activeTab - 1))}>
            Anterior
          </button>
          <button type="button" onClick={() => setActiveTab(Math.min(tabs.length - 1, activeTab + 1))}>
            Próximo
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductForm;
```

## 🔒 Autenticação

### Headers Necessários
```javascript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
  // Para FormData, não definir Content-Type (deixar o browser definir)
};
```

## 📡 Endpoint da API

### URL de Produção
```
POST https://back-end-rosia.vercel.app/admin/products
```

### Formato da Requisição
- **Content-Type**: `multipart/form-data`
- **Método**: POST
- **Autenticação**: Bearer Token (admin_token)

### Exemplo de FormData
```javascript
const formData = new FormData();
formData.append('name', 'Camiseta Básica');
formData.append('description', 'Camiseta 100% algodão');
formData.append('price', '29.90');
formData.append('stock', '50');
formData.append('category', 'Camisetas');
formData.append('colors', JSON.stringify(['Branco', 'Preto']));
formData.append('sizes', JSON.stringify(['P', 'M', 'G']));
// Adicionar imagens
formData.append('images', imageFile1);
formData.append('images', imageFile2);
```

## ✅ Validações do Backend

### Imagens
- **Tipos permitidos**: JPEG, JPG, PNG, WebP
- **Tamanho máximo**: 5MB por imagem
- **Quantidade máxima**: 10 imagens
- **Processamento**: Redimensionamento automático para 800x800px e conversão para WebP

### Campos de Texto
- **Nome**: Mínimo 2 caracteres
- **Descrição**: Mínimo 10 caracteres
- **Categoria**: Mínimo 2 caracteres

### Campos Numéricos
- **Preço**: Deve ser > 0
- **Estoque**: Deve ser ≥ 0

## 🎯 Categorias Sugeridas

Baseado nos produtos de exemplo no banco:
- Camisetas
- Vestidos
- Calças
- Blusas
- Saias
- Acessórios
- Sapatos
- Bolsas

## 🏷️ Tags Sugeridas

- Casual
- Elegante
- Esportivo
- Festa
- Trabalho
- Verão
- Inverno
- Algodão
- Seda
- Jeans

## 📱 Responsividade

O formulário deve ser responsivo e funcionar bem em:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🚀 Próximos Passos

1. Implementar o formulário com as abas sugeridas
2. Integrar os hooks fornecidos
3. Adicionar validação em tempo real
4. Implementar preview das imagens
5. Adicionar feedback visual para upload
6. Testar em diferentes dispositivos

---

**Nota**: Este guia fornece uma base sólida para implementar a criação de produtos. Adapte conforme necessário para atender aos requisitos específicos do seu design e UX.

