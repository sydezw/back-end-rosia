-- 🔧 CORREÇÃO URGENTE: Constraint de chave estrangeira incorreta na tabela user_addresses
-- 
-- PROBLEMA IDENTIFICADO:
-- A constraint atual: FOREIGN KEY (user_id) REFERENCES user_profiles(id)
-- Deveria ser: FOREIGN KEY (user_id) REFERENCES auth.users(id)
-- 
-- ERRO ATUAL: Key (user_id)=(48d2e0cb-4d87-474a-90f8-6e4ebbf1da05) is not present in table "user_profiles"
-- CAUSA: A constraint está referenciando user_profiles(id) em vez de auth.users(id)

-- EXECUTE OS COMANDOS ABAIXO NO SEU CLIENTE SQL (Supabase Dashboard ou psql):

-- Remover a constraint atual
ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_fkey;

-- Adicionar a constraint correta referenciando auth.users(id)
ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Verificar se a constraint foi criada corretamente
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition 
FROM pg_constraint 
WHERE conrelid = 'user_addresses'::regclass AND contype = 'f';

-- RESULTADO ESPERADO:
-- user_addresses_user_id_fkey | f | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE

-- EXPLICAÇÃO DA CORREÇÃO:
-- O sistema usa uma arquitetura híbrida onde:
-- - auth.users: Contém os usuários do Supabase Auth (IDs reais dos usuários)
-- - user_profiles: Contém perfis estendidos com user_id referenciando auth.users(id)
-- - user_addresses: Deve referenciar auth.users(id) diretamente, não user_profiles(id)