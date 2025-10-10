-- =====================================================
-- ADICIONAR COLUNA FULL_NAME NA TABELA USER_PROFILES
-- =====================================================
-- Este arquivo adiciona a coluna 'full_name' na tabela user_profiles
-- para corrigir o erro no endpoint /auth/login/google-direct

-- Verificar se a tabela user_profiles existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        -- Adicionar coluna full_name se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN full_name VARCHAR(255);
            RAISE NOTICE 'Coluna full_name adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna full_name já existe na tabela user_profiles';
        END IF;
        
        -- Adicionar coluna avatar_url se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN avatar_url TEXT;
            RAISE NOTICE 'Coluna avatar_url adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna avatar_url já existe na tabela user_profiles';
        END IF;
        
        -- Adicionar coluna provider se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'provider' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN provider VARCHAR(50) DEFAULT 'email';
            RAISE NOTICE 'Coluna provider adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna provider já existe na tabela user_profiles';
        END IF;
        
        -- Adicionar coluna google_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'google_id' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN google_id VARCHAR(255);
            RAISE NOTICE 'Coluna google_id adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna google_id já existe na tabela user_profiles';
        END IF;
        
        -- Adicionar coluna email_verified se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'email_verified' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN email_verified BOOLEAN DEFAULT false;
            RAISE NOTICE 'Coluna email_verified adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna email_verified já existe na tabela user_profiles';
        END IF;
        
        -- Adicionar coluna last_login se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_login' AND table_schema = 'public') THEN
            ALTER TABLE public.user_profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Coluna last_login adicionada à tabela user_profiles';
        ELSE
            RAISE NOTICE 'Coluna last_login já existe na tabela user_profiles';
        END IF;
        
    ELSE
        RAISE NOTICE 'Tabela user_profiles não existe. Criando tabela completa...';
        
        -- Criar tabela user_profiles completa
        CREATE TABLE IF NOT EXISTS public.user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            avatar_url TEXT,
            provider VARCHAR(50) DEFAULT 'email',
            google_id VARCHAR(255),
            email_verified BOOLEAN DEFAULT false,
            last_login TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON public.user_profiles(google_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_provider ON public.user_profiles(provider);
        
        -- Habilitar RLS
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas básicas
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (true);
            
        CREATE POLICY "Users can insert own profile" ON public.user_profiles
            FOR INSERT WITH CHECK (true);
            
        CREATE POLICY "Users can update own profile" ON public.user_profiles
            FOR UPDATE USING (true);
        
        RAISE NOTICE 'Tabela user_profiles criada com sucesso';
    END IF;
END $$;

-- Verificar estrutura final da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;