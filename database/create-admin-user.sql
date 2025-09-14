-- Script para criar o usuário administrador
-- Execute este script no Supabase SQL Editor

-- PASSO 1: Primeiro, crie o usuário no painel Authentication > Users do Supabase
-- Email: suporte@rosia.com.br
-- Password: rosia2025
-- Confirme o email automaticamente

-- PASSO 2: Depois de criar o usuário, execute o comando abaixo
-- Substitua 'USER_ID_AQUI' pelo ID real do usuário criado

-- Para encontrar o ID do usuário, execute:
-- SELECT id, email FROM auth.users WHERE email = 'suporte@rosia.com.br';

-- Depois execute este INSERT com o ID correto:
-- INSERT INTO admin_users (user_id, email) 
-- VALUES ('USER_ID_AQUI', 'suporte@rosia.com.br');

-- EXEMPLO COMPLETO (substitua o ID):
-- INSERT INTO admin_users (user_id, email) 
-- VALUES ('12345678-1234-1234-1234-123456789abc', 'suporte@rosia.com.br');

-- Para verificar se funcionou:
-- SELECT * FROM admin_users;

-- INSTRUÇÕES DETALHADAS:
-- 1. Vá para o Supabase Dashboard
-- 2. Acesse Authentication > Users
-- 3. Clique em "Add user"
-- 4. Preencha:
--    - Email: suporte@rosia.com.br
--    - Password: rosia2025
--    - Email Confirm: true (marque a opção)
-- 5. Clique em "Create user"
-- 6. Copie o ID do usuário criado
-- 7. Vá para SQL Editor
-- 8. Execute: SELECT id FROM auth.users WHERE email = 'suporte@rosia.com.br';
-- 9. Copie o ID retornado
-- 10. Execute: INSERT INTO admin_users (user_id, email) VALUES ('ID_COPIADO', 'suporte@rosia.com.br');

-- VERIFICAÇÃO FINAL:
-- SELECT 
--   au.email as admin_email,
--   u.email as user_email,
--   au.active,
--   au.created_at
-- FROM admin_users au
-- JOIN auth.users u ON au.user_id = u.id
-- WHERE au.email = 'suporte@rosia.com.br';