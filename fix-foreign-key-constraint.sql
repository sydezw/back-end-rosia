-- Script para remover temporariamente a restrição de chave estrangeira
-- Execute este comando no SQL Editor do Supabase

-- Remover a restrição de chave estrangeira user_id
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Permitir que user_id seja qualquer UUID válido
-- Isso permite que o endpoint de registro funcione sem depender do Supabase Auth

-- Para recriar a restrição mais tarde (quando necessário):
-- ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;Get Started

