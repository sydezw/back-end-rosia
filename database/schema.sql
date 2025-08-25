-- Estrutura das tabelas para o Supabase
-- Execute estes comandos no SQL Editor do Supabase

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category VARCHAR(100),
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb, -- Array de URLs de imagens
  weight DECIMAL(8,3) DEFAULT 0.5, -- Peso em kg
  volume DECIMAL(8,3) DEFAULT 0.001, -- Volume em litros
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  tags TEXT[], -- Array de tags para busca
  metadata JSONB DEFAULT '{}'::jsonb, -- Dados extras
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL, -- Array de itens do pedido
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (
    status IN ('pendente', 'pago', 'enviado', 'entregue', 'cancelado', 'pagamento_rejeitado', 'reembolsado', 'em_transito')
  ),
  payment_method VARCHAR(50) DEFAULT 'pix' CHECK (
    payment_method IN ('pix', 'cartao_credito', 'cartao_debito', 'boleto')
  ),
  shipping_address JSONB NOT NULL, -- Endereço de entrega
  shipping_method VARCHAR(50) DEFAULT 'standard',
  tracking_code VARCHAR(100),
  estimated_delivery DATE,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_rejected_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  payment_data JSONB, -- Dados do gateway de pagamento
  notes TEXT, -- Observações do pedido
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de endereços dos usuários (opcional)
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- Nome do endereço (ex: Casa, Trabalho)
  logradouro VARCHAR(255) NOT NULL,
  numero VARCHAR(20) NOT NULL,
  complemento VARCHAR(100),
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cupons de desconto (opcional)
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, is_default);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)

-- Produtos: todos podem ler, apenas admins podem modificar
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtos são visíveis para todos" ON products
  FOR SELECT USING (true);

-- Pedidos: usuários só podem ver seus próprios pedidos
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios pedidos" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pedidos" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios pedidos" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Endereços: usuários só podem ver seus próprios endereços
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios endereços" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);

-- Cupons: todos podem ler cupons ativos
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cupons ativos são visíveis para todos" ON coupons
  FOR SELECT USING (active = true);

-- Uso de cupons: usuários só podem ver seus próprios usos
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios usos de cupons" ON coupon_uses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar usos de cupons" ON coupon_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Inserir alguns produtos de exemplo
INSERT INTO products (name, description, price, stock, category, image_url, weight, volume) VALUES
('Buquê de Rosas Vermelhas', 'Lindo buquê com 12 rosas vermelhas frescas', 89.90, 15, 'Buquês', 'https://example.com/rosas-vermelhas.jpg', 0.8, 0.002),
('Arranjo de Lírios Brancos', 'Elegante arranjo com lírios brancos em vaso de vidro', 125.00, 8, 'Arranjos', 'https://example.com/lirios-brancos.jpg', 1.2, 0.003),
('Buquê de Girassóis', 'Alegre buquê com 8 girassóis frescos', 65.50, 20, 'Buquês', 'https://example.com/girassois.jpg', 0.6, 0.002),
('Cesta de Flores Mistas', 'Cesta rústica com variedade de flores coloridas', 95.00, 12, 'Cestas', 'https://example.com/cesta-mistas.jpg', 1.5, 0.004),
('Orquídea Phalaenopsis', 'Orquídea branca em vaso decorativo', 78.00, 25, 'Plantas', 'https://example.com/orquidea.jpg', 0.9, 0.001);

-- Inserir alguns cupons de exemplo
INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_uses, valid_until) VALUES
('BEMVINDO10', 'Desconto de 10% para novos clientes', 'percentage', 10.00, 50.00, 100, NOW() + INTERVAL '30 days'),
('FRETE15', 'R$ 15 de desconto no frete', 'fixed', 15.00, 80.00, 50, NOW() + INTERVAL '15 days'),
('FLORES20', '20% de desconto em buquês', 'percentage', 20.00, 100.00, 200, NOW() + INTERVAL '7 days');

-- Comentários nas tabelas
COMMENT ON TABLE products IS 'Tabela de produtos da loja';
COMMENT ON TABLE orders IS 'Tabela de pedidos dos clientes';
COMMENT ON TABLE user_addresses IS 'Endereços salvos dos usuários';
COMMENT ON TABLE coupons IS 'Cupons de desconto disponíveis';
COMMENT ON TABLE coupon_uses IS 'Registro de uso dos cupons';

COMMENT ON COLUMN products.items IS 'Array JSON com itens do pedido: [{product_id, product_name, product_price, quantity, total}]';
COMMENT ON COLUMN orders.shipping_address IS 'JSON com endereço: {logradouro, numero, complemento, bairro, cidade, estado, cep}';
COMMENT ON COLUMN orders.payment_data IS 'Dados do webhook do gateway de pagamento';
COMMENT ON COLUMN products.images IS 'Array de URLs das imagens do produto';
COMMENT ON COLUMN products.metadata IS 'Dados extras do produto (especificações, etc.)';

-- Função para buscar produtos com filtros
CREATE OR REPLACE FUNCTION search_products(
  search_term TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  price DECIMAL,
  stock INTEGER,
  category VARCHAR,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.name, p.description, p.price, p.stock, 
    p.category, p.image_url, p.created_at
  FROM products p
  WHERE 
    p.active = true
    AND p.stock > 0
    AND (search_term IS NULL OR 
         p.name ILIKE '%' || search_term || '%' OR 
         p.description ILIKE '%' || search_term || '%')
    AND (category_filter IS NULL OR p.category = category_filter)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;