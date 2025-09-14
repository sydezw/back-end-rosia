-- CORREÇÃO DA FUNÇÃO handle_new_user()
-- Execute este SQL no painel do Supabase para corrigir o erro de signup

-- O problema: a função estava tentando inserir um UUID na coluna 'id' que é INTEGER
-- A solução: remover a inserção do ID e deixar o PostgreSQL gerar automaticamente

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil automaticamente quando um novo usuário é criado
  -- Corrigido para usar um ID sequencial ao invés do UUID
  INSERT INTO public.usuarios (
    nome,
    email,
    senhahash,
    criadoem,
    atualizadoem
  ) VALUES (
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'nome',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'supabase_managed', -- Senha gerenciada pelo Supabase
    NOW(),
    NOW()
  ) ON CONFLICT (email) DO UPDATE SET
    atualizadoem = NOW(),
    nome = COALESCE(
      EXCLUDED.nome,
      usuarios.nome
    );
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTRUÇÕES:
-- 1. Acesse o painel do Supabase
-- 2. Vá em SQL Editor
-- 3. Cole e execute este código
-- 4. Teste o signup novamente

-- EXPLICAÇÃO DO PROBLEMA:
-- A função original tentava inserir NEW.id::text (UUID) na coluna 'id' (INTEGER)
-- Isso causava erro de conversão de tipo, resultando em 'Database error saving new user'
-- A correção remove a inserção do ID e usa o campo email como chave única