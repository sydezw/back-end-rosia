-- =====================================================
-- SCHEMA COMPLETO PARA PERFIL DE USUÁRIOS E CARRINHO
-- =====================================================

-- 1. TABELA DE PERFIS DE USUÁRIOS (complementa auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações básicas
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE, -- formato: 000.000.000-00
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
  
  -- Preferências
  newsletter_subscription BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Índices para busca
  CONSTRAINT cpf_format CHECK (cpf ~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$' OR cpf IS NULL)
);

-- 2. TABELA DE ENDEREÇOS
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- Dados do endereço
  label VARCHAR(50) DEFAULT 'Principal', -- 'Casa', 'Trabalho', 'Principal'
  recipient_name VARCHAR(255) NOT NULL, -- Nome de quem vai receber
  street VARCHAR(255) NOT NULL, -- Rua, número
  complement VARCHAR(100), -- Apartamento, bloco, etc
  neighborhood VARCHAR(100) NOT NULL, -- Bairro
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL, -- SP, RJ, etc
  zip_code VARCHAR(9) NOT NULL, -- formato: 00000-000
  country VARCHAR(50) DEFAULT 'Brasil',
  
  -- Referência geográfica
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Configurações
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validações
  CONSTRAINT zip_code_format CHECK (zip_code ~ '^[0-9]{5}-[0-9]{3}$'),
  CONSTRAINT state_format CHECK (LENGTH(state) = 2)
);

-- 3. TABELA DE CARRINHO
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Detalhes do item
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size VARCHAR(10), -- P, M, G, GG, etc
  color VARCHAR(50),
  
  -- Preços (salvos no momento da adição)
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Metadados
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicatas (mesmo produto, tamanho e cor)
  UNIQUE(user_id, product_id, size, color)
);

-- 4. TABELA DE FAVORITOS
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Evitar duplicatas
  UNIQUE(user_id, product_id)
);

-- 5. TABELA DE HISTÓRICO DE NAVEGAÇÃO
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(50) NOT NULL, -- 'view_product', 'add_to_cart', 'purchase', etc
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Dados da atividade
  metadata JSONB, -- dados extras específicos da atividade
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON public.user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Índices para user_addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON public.user_addresses(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_user_addresses_zip_code ON public.user_addresses(zip_code);

-- Índices para cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_added_at ON public.cart_items(added_at);

-- Índices para user_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON public.user_favorites(product_id);

-- Índices para user_activity
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at
    BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON public.cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para garantir apenas um endereço padrão por usuário
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o novo endereço é padrão, remove o padrão dos outros
    IF NEW.is_default = true THEN
        UPDATE public.user_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_default_address_trigger
    BEFORE INSERT OR UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- Função para limpar carrinho antigo (itens > 30 dias)
CREATE OR REPLACE FUNCTION clean_old_cart_items()
RETURNS void AS $$
BEGIN
    DELETE FROM public.cart_items 
    WHERE added_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View para dados completos do usuário
CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at as auth_created_at,
    
    p.full_name,
    p.cpf,
    p.phone,
    p.birth_date,
    p.gender,
    p.newsletter_subscription,
    p.sms_notifications,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at,
    p.last_login,
    
    -- Endereço padrão
    a.id as default_address_id,
    a.label as default_address_label,
    a.recipient_name,
    a.street,
    a.complement,
    a.neighborhood,
    a.city,
    a.state,
    a.zip_code,
    a.country,
    
    -- Estatísticas
    (SELECT COUNT(*) FROM public.cart_items WHERE user_id = u.id) as cart_items_count,
    (SELECT COUNT(*) FROM public.user_favorites WHERE user_id = u.id) as favorites_count,
    (SELECT COUNT(*) FROM public.orders WHERE user_id = u.id) as orders_count
    
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
LEFT JOIN public.user_addresses a ON p.id = a.user_id AND a.is_default = true;

-- View para carrinho com detalhes dos produtos
CREATE OR REPLACE VIEW cart_with_products AS
SELECT 
    c.id as cart_item_id,
    c.user_id,
    c.quantity,
    c.size,
    c.color,
    c.unit_price,
    c.total_price,
    c.added_at,
    
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.category,
    p.stock,
    p.status as product_status,
    
    -- Primeira imagem do produto
    (SELECT url FROM public.product_images WHERE product_id = p.id ORDER BY is_primary DESC, created_at ASC LIMIT 1) as product_image
    
FROM public.cart_items c
JOIN public.products p ON c.product_id = p.id
WHERE p.status = 'active';

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para user_addresses
CREATE POLICY "Users can manage own addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para cart_items
CREATE POLICY "Users can manage own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_favorites
CREATE POLICY "Users can manage own favorites" ON public.user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_activity
CREATE POLICY "Users can view own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity" ON public.user_activity
    FOR INSERT WITH CHECK (true);

-- Políticas para admins
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- =====================================================
-- DADOS INICIAIS / EXEMPLOS
-- =====================================================

-- Inserir perfil de exemplo (será criado automaticamente via trigger no auth)
-- Este é apenas um exemplo da estrutura

/*
INSERT INTO public.user_profiles (id, full_name, cpf, phone, birth_date, gender) VALUES 
('user-uuid-here', 'João Silva Santos', '123.456.789-00', '+55 11 99999-9999', '1990-05-15', 'masculino');

INSERT INTO public.user_addresses (user_id, label, recipient_name, street, complement, neighborhood, city, state, zip_code, is_default) VALUES 
('user-uuid-here', 'Casa', 'João Silva Santos', 'Rua das Flores, 123', 'Apto 45', 'Centro', 'São Paulo', 'SP', '01234-567', true);
*/

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Este schema fornece:
-- ✅ Perfil completo do usuário com CPF, telefone, data nascimento
-- ✅ Sistema de endereços múltiplos com endereço padrão
-- ✅ Carrinho persistente com detalhes de produto
-- ✅ Sistema de favoritos
-- ✅ Histórico de atividades
-- ✅ Segurança RLS
-- ✅ Triggers automáticos
-- ✅ Views otimizadas
-- ✅ Índices para performance
-- ✅ Validações de dados (CPF, CEP, etc)

-- Para usar no frontend:
-- 1. Login: SELECT * FROM user_complete_profile WHERE id = auth.uid()
-- 2. Carrinho: SELECT * FROM cart_with_products WHERE user_id = auth.uid()
-- 3. Endereços: SELECT * FROM user_addresses WHERE user_id = auth.uid()
-- 4. Favoritos: SELECT * FROM user_favorites WHERE user_id = auth.uid()