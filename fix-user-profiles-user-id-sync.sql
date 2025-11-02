-- 🔧 CORREÇÃO CRÍTICA: Sincronizar user_id em user_profiles com auth.users
-- 
-- PROBLEMA IDENTIFICADO:
-- - Usuário em auth.users: ID = 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a'
-- - Usuário em user_profiles: user_id = '094be36c-071f-4f88-98d9-466013017521' (INCORRETO)
-- 
-- CAUSA: O login Google está criando IDs inconsistentes entre auth.users e user_profiles
-- SOLUÇÃO: Atualizar user_id em user_profiles para referenciar o ID correto do auth.users

-- EXECUTE NO SUPABASE DASHBOARD:

-- 1. Atualizar o user_id para o ID correto do auth.users
UPDATE user_profiles 
SET user_id = 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a' 
WHERE email = 'schoolts965@gmail.com';

-- 2. Verificar se a atualização foi bem-sucedida
SELECT id, user_id, nome, email 
FROM user_profiles 
WHERE email = 'schoolts965@gmail.com';

-- 3. Verificar se o user_id agora existe em auth.users
SELECT 'auth.users' as tabela, id, email 
FROM auth.users 
WHERE id = 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a'
UNION ALL
SELECT 'user_profiles' as tabela, user_id as id, email 
FROM user_profiles 
WHERE email = 'schoolts965@gmail.com';

-- RESULTADO ESPERADO:
-- Ambas as consultas devem retornar o mesmo ID: 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a'

-- 4. OPCIONAL: Verificar se há outros usuários com o mesmo problema
SELECT 
    up.email,
    up.user_id as user_profiles_id,
    au.id as auth_users_id,
    CASE 
        WHEN up.user_id = au.id THEN '✅ CORRETO' 
        ELSE '❌ INCORRETO' 
    END as status
FROM user_profiles up
LEFT JOIN auth.users au ON au.email = up.email
WHERE up.user_id != au.id OR au.id IS NULL;