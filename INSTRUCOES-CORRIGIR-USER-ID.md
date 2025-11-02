# 🚨 CORREÇÃO URGENTE: Sincronizar IDs de Usuário

## ❌ Problema Identificado

O login Google está funcionando, mas há uma **inconsistência crítica** entre as tabelas:

- **auth.users**: ID = `ce938b9d-4985-443c-8bb4-3d80f26bfe5a`
- **user_profiles**: user_id = `094be36c-071f-4f88-98d9-466013017521` ❌ **INCORRETO**

Isso causa erro na criação de endereços porque a constraint de chave estrangeira não encontra o `user_id` na tabela `auth.users`.

## 🔧 SOLUÇÃO IMEDIATA

### 1. Acesse o Supabase Dashboard
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor**

### 2. Execute este SQL:

```sql
-- CORREÇÃO CRÍTICA: Sincronizar user_id em user_profiles
UPDATE user_profiles 
SET user_id = 'ce938b9d-4985-443c-8bb4-3d80f26bfe5a' 
WHERE email = 'schoolts965@gmail.com';

-- Verificar se a correção funcionou
SELECT 
    'user_profiles' as tabela,
    id, 
    user_id, 
    nome, 
    email 
FROM user_profiles 
WHERE email = 'schoolts965@gmail.com'
UNION ALL
SELECT 
    'auth.users' as tabela,
    id, 
    id as user_id, 
    COALESCE(raw_user_meta_data->>'name', email) as nome,
    email 
FROM auth.users 
WHERE email = 'schoolts965@gmail.com';
```

### 3. Resultado Esperado
Após executar, ambas as linhas devem mostrar o mesmo `user_id`: `ce938b9d-4985-443c-8bb4-3d80f26bfe5a`

## ✅ Após a Correção

1. **Teste o sistema**: Faça login Google e tente atualizar o perfil
2. **Criação de endereços**: Deve funcionar sem erros
3. **Sistema completo**: Login + Perfil + Endereços funcionando 100%

## 🔍 Causa Raiz

O problema ocorreu porque:
1. O frontend estava usando endpoint antigo `/auth/login/google` 
2. Esse endpoint criava IDs customizados em vez de usar o Supabase Auth
3. **JÁ CORRIGIDO**: Frontend agora usa `/auth/login/google-direct`

## 📞 Suporte

Se tiver dúvidas:
1. Verifique se executou o SQL corretamente
2. Confirme que ambas as tabelas têm o mesmo ID
3. Teste o login Google novamente

---

**⚡ URGENTE**: Execute o SQL acima AGORA para resolver o problema!

