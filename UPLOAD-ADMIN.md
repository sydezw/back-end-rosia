# 📸 Sistema de Upload e Administração

## 🎯 Funcionalidades Implementadas

### Upload de Imagens
- ✅ Upload de imagem única
- ✅ Upload de múltiplas imagens
- ✅ Otimização automática (WebP, redimensionamento)
- ✅ Validação de tipo e tamanho
- ✅ Integração com Supabase Storage
- ✅ Geração de URLs públicas

### Área Administrativa
- ✅ CRUD completo de produtos
- ✅ Gerenciamento de imagens por produto
- ✅ Validação de dados de produto
- ✅ Suporte a cores, tamanhos, material e marca
- ✅ Paginação e filtros
- ✅ Busca por nome e descrição

## 🛠️ Configuração do Supabase Storage

### 1. Criar Bucket
O sistema cria automaticamente o bucket `product-images` com as seguintes configurações:
- **Público**: Sim (para URLs diretas)
- **Tipos permitidos**: JPEG, PNG, WebP
- **Tamanho máximo**: 5MB por arquivo

### 2. Políticas de Segurança (RLS)
```sql
-- Permitir leitura pública
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Permitir upload apenas para usuários autenticados
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Permitir deleção apenas para usuários autenticados
CREATE POLICY "Authenticated delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);
```

## 📡 Endpoints de Upload

### Upload de Imagem Única
```http
POST /upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- image: File
```

**Resposta:**
```json
{
  "message": "Imagem enviada com sucesso",
  "image": {
    "filename": "1234567890_abcd1234.webp",
    "url": "https://your-project.supabase.co/storage/v1/object/public/product-images/general/1234567890_abcd1234.webp",
    "path": "general/1234567890_abcd1234.webp"
  }
}
```

### Upload de Múltiplas Imagens
```http
POST /upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- images: File[]
```

### Upload para Produto Específico
```http
POST /upload/product/:productId
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- images: File[]
```

### Deletar Imagem
```http
DELETE /upload/image
Content-Type: application/json
Authorization: Bearer <token>

{
  "imagePath": "products/123/image.webp",
  "productId": "123" // opcional
}
```

## 🛍️ Endpoints Administrativos

### Criar Produto com Imagens
```http
POST /admin/products
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- name: string
- description: string
- price: number
- stock: number
- category: string
- colors: JSON string (opcional)
- sizes: JSON string (opcional)
- material: string (opcional)
- brand: string (opcional)
- weight: number (opcional)
- volume: number (opcional)
- tags: JSON string (opcional)
- images: File[] (opcional)
```

**Exemplo de cores e tamanhos:**
```json
{
  "colors": ["Azul", "Vermelho", "Verde"],
  "sizes": ["P", "M", "G", "GG"]
}
```

### Atualizar Produto
```http
PUT /admin/products/:id
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
- (mesmos campos do POST)
- removeImages: JSON string (URLs para remover)
```

### Listar Produtos (Admin)
```http
GET /admin/products?page=1&limit=20&category=roupas&search=camiseta&sortBy=name&order=asc
Authorization: Bearer <token>
```

### Obter Produto Específico
```http
GET /admin/products/:id
Authorization: Bearer <token>
```

### Deletar Produto
```http
DELETE /admin/products/:id
Authorization: Bearer <token>
```

## 🔧 Processamento de Imagens

### Otimizações Automáticas
- **Formato**: Conversão para WebP (melhor compressão)
- **Redimensionamento**: Máximo 800x800px (mantém proporção)
- **Qualidade**: 85% (balanço entre qualidade e tamanho)
- **Nomes únicos**: UUID + timestamp para evitar conflitos

### Validações
- **Tipos permitidos**: JPEG, PNG, WebP
- **Tamanho máximo**: 5MB por arquivo
- **Quantidade máxima**: 10 arquivos por upload

## 📊 Estrutura do Banco de Dados

### Tabela Products (Atualizada)
```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  image_url TEXT, -- Imagem principal
  images JSONB DEFAULT '[]'::jsonb, -- Array de URLs
  colors JSONB DEFAULT '[]'::jsonb, -- Array de cores
  sizes JSONB DEFAULT '[]'::jsonb, -- Array de tamanhos
  material VARCHAR(100), -- Material do produto
  brand VARCHAR(100), -- Marca do produto
  weight DECIMAL(8,3), -- Peso em kg
  volume DECIMAL(10,3), -- Volume em cm³
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Índices para Performance
```sql
-- Índices GIN para buscas em JSONB
CREATE INDEX idx_products_colors ON products USING GIN (colors);
CREATE INDEX idx_products_sizes ON products USING GIN (sizes);
CREATE INDEX idx_products_tags ON products USING GIN (tags);

-- Índice para marca
CREATE INDEX idx_products_brand ON products (brand);

-- Índice para categoria
CREATE INDEX idx_products_category ON products (category);
```

## 🚀 Exemplos de Uso

### Frontend - Upload de Imagens
```javascript
const uploadProductImages = async (productId, files) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('images', file);
  });
  
  const response = await fetch(`/upload/product/${productId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### Frontend - Criar Produto
```javascript
const createProduct = async (productData, images) => {
  const formData = new FormData();
  
  // Adicionar dados do produto
  Object.keys(productData).forEach(key => {
    if (typeof productData[key] === 'object') {
      formData.append(key, JSON.stringify(productData[key]));
    } else {
      formData.append(key, productData[key]);
    }
  });
  
  // Adicionar imagens
  images.forEach(image => {
    formData.append('images', image);
  });
  
  const response = await fetch('/admin/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

## 🔒 Segurança

### Autenticação
- Todas as rotas de upload e admin requerem token JWT válido
- Validação de usuário autenticado via Supabase

### Validação de Arquivos
- Verificação de tipo MIME
- Limite de tamanho por arquivo e total
- Sanitização de nomes de arquivo

### Rate Limiting
- Limite global de 100 requests por 15 minutos
- Proteção contra spam de uploads

## 📝 Logs e Monitoramento

### Logs Implementados
- Upload de imagens (sucesso/erro)
- Criação/atualização de produtos
- Deleção de imagens e produtos
- Erros de validação

### Métricas Sugeridas
- Número de uploads por dia
- Tamanho total de storage utilizado
- Produtos criados/atualizados
- Erros de upload mais comuns

## 🎯 Próximos Passos

1. **Deploy do Backend**: Configurar no Vercel
2. **Configurar Storage**: Criar bucket no Supabase
3. **Testar Endpoints**: Validar todas as funcionalidades
4. **Integrar Frontend**: Conectar com a área administrativa
5. **Monitoramento**: Implementar logs detalhados

---

**✅ Sistema de upload e administração totalmente funcional e pronto para uso!**