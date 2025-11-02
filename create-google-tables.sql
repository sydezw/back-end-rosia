-- CRIAR TABELAS PARA USUÁRIOS GOOGLE
-- Execute este script no Supabase SQL Editor

-- Tabela para perfis de usuários Google
CREATE TABLE IF NOT EXISTS google_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL, -- ID único do Google
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para endereços de usuários Google
CREATE TABLE IF NOT EXISTS google_user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_user_id UUID NOT NULL REFERENCES google_user_profiles(id) ON DELETE CASCADE,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    complemento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_google_user_profiles_email ON google_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_google_user_profiles_google_id ON google_user_profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_google_user_profiles_cpf ON google_user_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_google_user_addresses_user_id ON google_user_addresses(google_user_id);
CREATE INDEX IF NOT EXISTS idx_google_user_addresses_cep ON google_user_addresses(cep);

-- Comentários para documentação
COMMENT ON TABLE google_user_profiles IS 'Perfis de usuários autenticados via Google OAuth';
COMMENT ON TABLE google_user_addresses IS 'Endereços dos usuários Google';
COMMENT ON COLUMN google_user_profiles.google_id IS 'ID único fornecido pelo Google OAuth';
COMMENT ON COLUMN google_user_addresses.google_user_id IS 'Referência ao perfil do usuário Google';

-- Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%google%'
ORDER BY table_name;