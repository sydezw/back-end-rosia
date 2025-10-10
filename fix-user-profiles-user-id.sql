-- Corrigir user_id na tabela user_profiles para corresponder ao ID correto da auth.users
-- Este problema ocorre quando há inconsistência entre os IDs das tabelas auth.users e user_profiles

-- Atualizar o user_id do usuário schoolts965@gmail.com
UPDATE user_profiles 
SET user_id = 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a' 
WHERE email = 'schoolts965@gmail.com';

-- Verificar se a atualização foi bem-sucedida
SELECT 
    up.id as profile_id,
    up.user_id as profile_user_id,
    up.email as profile_email,
    au.id as auth_user_id,
    au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
WHERE up.email = 'schoolts965@gmail.com';

-- Verificar se há outros usuários com inconsistência de IDs
SELECT 
    up.email,
    up.user_id as profile_user_id,
    au.id as auth_user_id,
    CASE 
        WHEN au.id IS NULL THEN 'ID não existe em auth.users'
        WHEN up.user_id != au.id THEN 'IDs não coincidem'
        ELSE 'OK'
    END as status
FROM user_profiles up
LEFT JOIN auth.users au ON up.email = au.email
ORDER BY up.email;