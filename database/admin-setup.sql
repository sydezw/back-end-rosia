-- Script para configurar usuário administrador exclusivo
-- Execute este script no Supabase SQL Editor

-- 1. Criar usuário admin no auth.users (se não existir)
-- IMPORTANTE: Execute este comando no Supabase Dashboard > Authentication > Users
-- Ou use o painel de administração do Supabase para criar manualmente:
-- Email: admin@rosia.com.br
-- Password: (defina uma senha segura)
-- Confirme o email automaticamente

-- 2. Criar tabela para controle de administradores
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- 3. Inserir o usuário admin na tabela (substitua pelo ID real do usuário criado)
-- NOTA: Você precisará substituir 'USER_ID_DO_ADMIN' pelo ID real do usuário admin criado
-- Para encontrar o ID, vá em Authentication > Users no Supabase e copie o ID do usuário admin@rosia.com.br

-- INSERT INTO admin_users (user_id, email) 
-- VALUES ('USER_ID_DO_ADMIN', 'admin@rosia.com.br');

-- 4. Função para verificar se um usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Políticas RLS para admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver a tabela de admins
CREATE POLICY "Apenas admins podem ver admin_users" ON admin_users
  FOR SELECT USING (is_current_user_admin());

-- Apenas admins podem inserir novos admins
CREATE POLICY "Apenas admins podem inserir admin_users" ON admin_users
  FOR INSERT WITH CHECK (is_current_user_admin());

-- Apenas admins podem atualizar admin_users
CREATE POLICY "Apenas admins podem atualizar admin_users" ON admin_users
  FOR UPDATE USING (is_current_user_admin());

-- 7. Atualizar políticas existentes para permitir acesso admin

-- Produtos: admins podem fazer tudo
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON products;
CREATE POLICY "Admins podem gerenciar produtos" ON products
  FOR ALL USING (is_current_user_admin());

-- Pedidos: admins podem ver e gerenciar todos os pedidos
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON orders;
CREATE POLICY "Admins podem ver todos os pedidos" ON orders
  FOR SELECT USING (is_current_user_admin());

DROP POLICY IF EXISTS "Admins podem atualizar todos os pedidos" ON orders;
CREATE POLICY "Admins podem atualizar todos os pedidos" ON orders
  FOR UPDATE USING (is_current_user_admin());

-- Cupons: admins podem gerenciar todos os cupons
DROP POLICY IF EXISTS "Admins podem gerenciar cupons" ON coupons;
CREATE POLICY "Admins podem gerenciar cupons" ON coupons
  FOR ALL USING (is_current_user_admin());

-- 8. Criar view para estatísticas administrativas
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
  -- Estatísticas de produtos
  (SELECT COUNT(*) FROM products WHERE active = true) as produtos_ativos,
  (SELECT COUNT(*) FROM products WHERE active = false) as produtos_inativos,
  (SELECT COUNT(*) FROM products WHERE stock <= 5) as produtos_estoque_baixo,
  
  -- Estatísticas de pedidos
  (SELECT COUNT(*) FROM orders WHERE status = 'pendente') as pedidos_pendentes,
  (SELECT COUNT(*) FROM orders WHERE status = 'processando') as pedidos_processando,
  (SELECT COUNT(*) FROM orders WHERE status = 'enviado') as pedidos_enviados,
  (SELECT COUNT(*) FROM orders WHERE status = 'entregue') as pedidos_entregues,
  (SELECT COUNT(*) FROM orders WHERE status = 'cancelado') as pedidos_cancelados,
  
  -- Estatísticas financeiras
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'entregue') as vendas_totais,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'entregue' AND created_at >= CURRENT_DATE) as vendas_hoje,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'entregue' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as vendas_mes_atual,
  
  -- Estatísticas de usuários
  (SELECT COUNT(*) FROM auth.users) as total_usuarios;

-- NOTA: Views não suportam políticas RLS diretamente
-- A segurança é controlada pelas tabelas subjacentes e pela função is_current_user_admin()
-- que deve ser verificada no código da aplicação antes de acessar esta view

-- 9. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Comentários para documentação
COMMENT ON TABLE admin_users IS 'Tabela para controle de usuários administradores';
COMMENT ON FUNCTION is_admin(UUID) IS 'Verifica se um usuário específico é administrador';
COMMENT ON FUNCTION is_current_user_admin() IS 'Verifica se o usuário atual é administrador';
COMMENT ON VIEW admin_stats IS 'View com estatísticas para o painel administrativo';

-- INSTRUÇÕES DE USO:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Crie o usuário admin@rosia.com.br no painel Authentication > Users
-- 3. Copie o ID do usuário criado
-- 4. Execute o INSERT comentado acima substituindo 'USER_ID_DO_ADMIN' pelo ID real
-- 5. Teste o login com o usuário admin para verificar as permissões

-- EXEMPLO DE COMO INSERIR O ADMIN (descomente e substitua o ID):
-- INSERT INTO admin_users (user_id, email) 
-- VALUES ('12345678-1234-1234-1234-123456789abc', 'admin@rosia.com.br');

-- Para verificar se funcionou:
-- SELECT * FROM admin_users;
-- SELECT is_current_user_admin(); -- deve retornar true quando logado como admin