-- TABELAS ESPECÍFICAS PARA USUÁRIOS DO GOOGLE
-- Criadas para evitar conflitos de ID com auth.users

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
CREATE INDEX IF NOT EXISTS idx_google_user_addresses_google_user_id ON google_user_addresses(google_user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_user_profiles_updated_at
    BEFORE UPDATE ON google_user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_user_addresses_updated_at
    BEFORE UPDATE ON google_user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE google_user_profiles IS 'Perfis específicos para usuários autenticados via Google OAuth';
COMMENT ON TABLE google_user_addresses IS 'Endereços para usuários Google, referenciando google_user_profiles';
COMMENT ON COLUMN google_user_profiles.google_id IS 'ID único fornecido pelo Google OAuth';
COMMENT ON COLUMN google_user_addresses.google_user_id IS 'Referência para o perfil do usuário Google';