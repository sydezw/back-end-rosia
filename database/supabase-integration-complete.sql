-- =====================================================
-- INTEGRAÇÃO COMPLETA SUPABASE - USUÁRIOS E GOOGLE OAUTH
-- =====================================================
-- Este arquivo configura:
-- 1. Tabela de perfis de usuários integrada com auth.users
-- 2. Tabela de endereços com relações corretas
-- 3. Triggers automáticos para criar perfis no login Google
-- 4. Políticas de segurança RLS
-- 5. Funções auxiliares

-- =====================================================
-- 1. TABELA DE PERFIS DE USUÁRIOS
-- =====================================================

-- NOTA: A tabela user_profiles foi substituída pela tabela 'usuarios' existente no banco
-- Mantendo comentário para referência da estrutura original
/*
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações básicas
  full_name VARCHAR(255),
  cpf VARCHAR(14) UNIQUE, -- formato: 000.000.000-00
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(20) CHECK (gender IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
  
  -- Dados do Google OAuth (quando aplicável)
  google_id VARCHAR(255),
  avatar_url TEXT,
  
  -- Preferências
  newsletter_subscription BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT false,
  
  -- Metadados
  provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'facebook'
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Validações
  CONSTRAINT cpf_format CHECK (cpf ~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$' OR cpf IS NULL)
);
*/

-- =====================================================
-- 2. TABELA DE ENDEREÇOS (ATUALIZADA)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Dados do endereço
  name VARCHAR(100) NOT NULL DEFAULT 'Principal', -- Nome do endereço (Casa, Trabalho, etc)
  logradouro VARCHAR(255) NOT NULL, -- Rua/Avenida
  numero VARCHAR(20) NOT NULL, -- Número
  complemento VARCHAR(100), -- Apartamento, bloco, etc
  bairro VARCHAR(100) NOT NULL, -- Bairro
  cidade VARCHAR(100) NOT NULL, -- Cidade
  estado VARCHAR(2) NOT NULL, -- SP, RJ, etc
  cep VARCHAR(9) NOT NULL, -- formato: 00000-000
  
  -- Configurações
  is_default BOOLEAN DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validações
  CONSTRAINT cep_format CHECK (cep ~ '^[0-9]{5}-[0-9]{3}$'),
  CONSTRAINT estado_format CHECK (LENGTH(estado) = 2)
);

-- =====================================================
-- 3. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil automaticamente quando um novo usuário é criado
  -- Atualizado para usar a tabela 'usuarios' existente
  INSERT INTO public.usuarios (
    id,
    nome,
    email,
    criadoem,
    atualizadoem
  ) VALUES (
    NEW.id::text,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    NEW.email,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    atualizadoem = NOW(),
    nome = COALESCE(
      EXCLUDED.nome,
      usuarios.nome
    );
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. FUNÇÃO PARA GARANTIR ENDEREÇO PADRÃO ÚNICO
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo endereço é padrão, remove o padrão dos outros
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  -- Se é o primeiro endereço do usuário, torna padrão automaticamente
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses 
    WHERE user_id = NEW.user_id AND id != NEW.id
  ) THEN
    NEW.is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente (COMENTADO - tabela não existe)
/*
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
*/

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
    BEFORE UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para endereço padrão único
DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON public.user_addresses;
CREATE TRIGGER ensure_single_default_address_trigger
    BEFORE INSERT OR UPDATE ON public.user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_address();

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para user_profiles (COMENTADO - tabela não existe)
/*
CREATE INDEX IF NOT EXISTS idx_user_profiles_cpf ON public.user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON public.user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON public.user_profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON public.user_profiles(provider);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);
*/

-- Índices para user_addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON public.user_addresses(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_user_addresses_cep ON public.user_addresses(cep);

-- =====================================================
-- 8. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY; -- COMENTADO - tabela não existe
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles (COMENTADO - tabela não existe)
/*
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
*/

-- Políticas para user_addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.user_addresses;
CREATE POLICY "Users can manage own addresses" ON public.user_addresses
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para admins (se existir tabela admin_users) (COMENTADO - tabela user_profiles não existe)
/*
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );
*/

-- =====================================================
-- 9. VIEWS ÚTEIS
-- =====================================================

-- View para dados completos do usuário
CREATE OR REPLACE VIEW public.user_complete_profile AS
SELECT 
    u.id,
    u.email,
    u.nome as full_name,
    u.criadoem as user_created_at,
    u.atualizadoem as user_updated_at,
    
    -- Endereço padrão
    a.id as default_address_id,
    a.name as default_address_name,
    a.logradouro,
    a.numero,
    a.complemento,
    a.bairro,
    a.cidade,
    a.estado,
    a.cep,
    
    -- Estatísticas
    (SELECT COUNT(*) FROM public.user_addresses WHERE user_id::text = u.id::text) as addresses_count
    
FROM public.usuarios u
LEFT JOIN public.user_addresses a ON u.id::text = a.user_id::text AND a.is_default = true;

-- =====================================================
-- 10. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para buscar perfil completo do usuário
DROP FUNCTION IF EXISTS public.get_user_profile(UUID);
CREATE FUNCTION public.get_user_profile(user_uuid UUID)
RETURNS TABLE (
    id TEXT,
    email TEXT,
    full_name VARCHAR,
    addresses_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucp.id::text,
        ucp.email,
        ucp.full_name,
        ucp.addresses_count
    FROM public.user_complete_profile ucp
    WHERE ucp.id::text = user_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar último login
CREATE OR REPLACE FUNCTION public.update_last_login(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Atualizado para usar a tabela 'usuarios' existente
    UPDATE public.usuarios 
    SET atualizadoem = NOW() 
    WHERE id = user_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

-- COMMENT ON TABLE public.user_profiles IS 'Perfis de usuários integrados com auth.users do Supabase'; -- COMENTADO - tabela não existe
COMMENT ON TABLE public.user_addresses IS 'Endereços dos usuários com suporte a múltiplos endereços';

-- COMMENT ON COLUMN public.user_profiles.google_id IS 'ID do usuário no Google (sub claim do JWT)'; -- COMENTADO - tabela não existe
-- COMMENT ON COLUMN public.user_profiles.provider IS 'Provedor de autenticação: email, google, facebook'; -- COMENTADO - tabela não existe
COMMENT ON COLUMN public.user_addresses.is_default IS 'Indica se é o endereço padrão do usuário';

-- =====================================================
-- 12. DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================

-- Exemplo de como os dados serão estruturados:
/*
-- Usuário criado via Google OAuth terá (COMENTADO - tabela user_profiles não existe):
INSERT INTO public.user_profiles (id, full_name, google_id, avatar_url, provider, email_verified) 
VALUES (
  'uuid-do-usuario',
  'João Silva Santos',
  'google-sub-id-123456',
  'https://lh3.googleusercontent.com/...',
  'google',
  true
);

-- Endereço do usuário:
INSERT INTO public.user_addresses (user_id, name, logradouro, numero, bairro, cidade, estado, cep, is_default)
VALUES (
  'uuid-do-usuario',
  'Casa',
  'Rua das Flores',
  '123',
  'Centro',
  'São Paulo',
  'SP',
  '01234-567',
  true
);
*/

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
PARA IMPLEMENTAR:

1. Execute este arquivo no SQL Editor do Supabase
2. Verifique se as tabelas foram criadas corretamente
3. Teste o login via Google OAuth
4. Verifique se o perfil é criado automaticamente
5. Configure as variáveis de ambiente no backend:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY

PARA USAR NO FRONTEND:

1. Login: SELECT * FROM public.user_complete_profile WHERE id = auth.uid()
2. Endereços: SELECT * FROM public.user_addresses WHERE user_id = auth.uid()
3. Atualizar perfil: UPDATE public.usuarios SET ... WHERE id = auth.uid() -- (usar tabela usuarios ao invés de user_profiles)
4. Adicionar endereço: INSERT INTO public.user_addresses ...

PARA USAR NO BACKEND:

1. Após login Google, chame: SELECT public.update_last_login(user_id)
2. Para buscar perfil: SELECT * FROM public.get_user_profile(user_id)
3. Verificar se usuário existe: SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = user_id)
*/