-- 🔧 CORREÇÃO: Confirmar emails de usuários existentes
-- Problema: Usuários criados antes de desabilitar confirmação ainda têm email_confirmed_at = null

-- ✅ Confirmar todos os emails não confirmados
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = ''
WHERE email_confirmed_at IS NULL;

-- 📋 Verificar resultado
SELECT 
  email,
  email_confirmed_at,
  confirmation_token,
  created_at
FROM auth.users 
ORDER BY created_at DESC;

-- 🎯 INSTRUÇÕES:
-- 1. Execute este SQL no painel do Supabase
-- 2. Vá em: SQL Editor > New Query
-- 3. Cole este código e execute
-- 4. Todos os usuários terão emails confirmados
-- 5. Teste o login novamente