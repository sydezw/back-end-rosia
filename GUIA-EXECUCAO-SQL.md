# 🗄️ Guia de Execução do SQL - Perfil de Usuário

## ⚠️ IMPORTANTE
O SQL para criar as tabelas de perfil de usuário precisa ser executado manualmente no Supabase Dashboard, pois requer permissões de administrador.

## 📋 Passos para Execução

### 1. Acessar o Supabase Dashboard
1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto da Rosia

### 2. Abrir o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### 3. Executar o SQL
Copie e cole o conteúdo do arquivo `database/user-profile-schema.sql` no editor e execute.

Ou execute os comandos abaixo um por vez:

```sql
-- 1. Criar tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf VARCHAR(14) UNIQUE, -- Formato: 000.000.000-00
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
  newsletter_subscription BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de endereços
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) DEFAULT 'Principal', -- Ex: Casa, Trabalho, etc.
  recipient_name VARCHAR(100) NOT NULL,
  street TEXT NOT NULL,
  complement TEXT,
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL, -- Ex: SP, RJ
  zip_code VARCHAR(9) NOT NULL, -- Formato: 00000-000
  country VARCHAR(50) DEFAULT 'Brasil',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de carrinho persistente
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size VARCHAR(10), -- P, M, G, GG, etc.
  color VARCHAR(50),
  unit_price DECIMAL(10,2) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id, size, color)
);

-- 4. Criar tabela de favoritos
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 5. Criar tabela de atividade do usuário
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'view_product', 'search', 'add_to_cart', etc.
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  search_term TEXT,
  metadata JSONB, -- Dados adicionais da atividade
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Criar Índices para Performance
```sql
-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
```

### 5. Criar Triggers para Atualização Automática
```sql
-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6. Criar Views para Consultas Otimizadas
```sql
-- View para perfil completo do usuário
CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  up.full_name,
  up.cpf,
  up.phone,
  up.birth_date,
  up.gender,
  up.newsletter_subscription,
  up.sms_notifications,
  up.created_at as profile_created_at,
  up.updated_at as profile_updated_at,
  -- Contar endereços
  (SELECT COUNT(*) FROM user_addresses WHERE user_id = u.id AND is_active = true) as addresses_count,
  -- Contar itens no carrinho
  (SELECT COUNT(*) FROM cart_items WHERE user_id = u.id) as cart_items_count,
  -- Contar favoritos
  (SELECT COUNT(*) FROM user_favorites WHERE user_id = u.id) as favorites_count
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id;

-- View para carrinho com detalhes dos produtos
CREATE OR REPLACE VIEW cart_with_products AS
SELECT 
  ci.id,
  ci.user_id,
  ci.product_id,
  ci.quantity,
  ci.size,
  ci.color,
  ci.unit_price,
  ci.added_at,
  ci.updated_at,
  p.name as product_name,
  p.description as product_description,
  p.category as product_category,
  p.stock as product_stock,
  (ci.quantity * ci.unit_price) as total_price,
  -- Primeira imagem do produto
  (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as product_image
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE p.status = 'active';
```

### 7. Configurar Row Level Security (RLS)
```sql
-- Habilitar RLS nas tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Usuários podem ver seu próprio perfil" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis" ON user_profiles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND active = true
  ));

-- Políticas para user_addresses
CREATE POLICY "Usuários podem gerenciar seus endereços" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os endereços" ON user_addresses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND active = true
  ));

-- Políticas para cart_items
CREATE POLICY "Usuários podem gerenciar seu carrinho" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_favorites
CREATE POLICY "Usuários podem gerenciar seus favoritos" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_activity
CREATE POLICY "Usuários podem ver sua atividade" ON user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir atividades" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as atividades" ON user_activity
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND active = true
  ));
```

## ✅ Verificação
Após executar o SQL, você pode verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_addresses', 'cart_items', 'user_favorites', 'user_activity');

-- Verificar views criadas
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('user_complete_profile', 'cart_with_products');
```

## 🚀 Próximos Passos
Após executar o SQL:
1. ✅ Tabelas de perfil criadas
2. ✅ Rotas de API implementadas (`/profile/*`)
3. ✅ Endpoint `/auth/me` atualizado
4. 🔄 Testar os endpoints no frontend
5. 🔄 Implementar interface de perfil no frontend

## 📝 Endpoints Disponíveis
Após a execução do SQL, estes endpoints estarão funcionais:

- `GET /auth/me` - Dados do usuário com perfil completo
- `GET /profile/me` - Perfil detalhado
- `PUT /profile/me` - Atualizar dados pessoais
- `GET /profile/addresses` - Listar endereços
- `POST /profile/addresses` - Adicionar endereço
- `PUT /profile/addresses/:id` - Atualizar endereço
- `DELETE /profile/addresses/:id` - Remover endereço
- `GET /profile/cart` - Carrinho persistente
- `POST /profile/cart` - Adicionar ao carrinho
- `PUT /profile/cart/:id` - Atualizar quantidade
- `DELETE /profile/cart/:id` - Remover item
- `DELETE /profile/cart` - Limpar carrinho
- `GET /profile/favorites` - Produtos favoritos
- `POST /profile/favorites` - Adicionar favorito
- `DELETE /profile/favorites/:product_id` - Remover favorito

## 🔧 Dados de Teste
Para testar, você pode usar estes dados:

```json
{
  "full_name": "João Silva",
  "cpf": "123.456.789-00",
  "phone": "(11) 99999-9999",
  "birth_date": "1990-01-15",
  "gender": "masculino"
}
```