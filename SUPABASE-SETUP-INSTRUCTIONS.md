# Instruções de Configuração do Supabase

## 📋 Resumo das Implementações

Este documento contém as instruções para implementar as funcionalidades solicitadas no Supabase:

1. ✅ **Tabelas de usuários e endereços** configuradas corretamente
2. ✅ **Integração com Google OAuth** implementada
3. ✅ **Relações entre tabelas** estabelecidas
4. ✅ **Backend atualizado** para integrar com as novas tabelas

## 🚀 Passos para Implementação

### 1. Aplicar Schema no Supabase

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o arquivo `database/supabase-integration-complete.sql`
4. Verifique se todas as tabelas foram criadas:
   - `user_profiles`
   - `user_addresses`
   - `cart_items`
   - `user_favorites`
   - `user_activity`

### 2. Configurar Autenticação Google

1. No painel do Supabase, vá para **Authentication > Providers**
2. Habilite o **Google Provider**
3. Configure as credenciais do Google OAuth:
   - Client ID
   - Client Secret
4. Configure a URL de redirecionamento:
   ```
   https://seu-projeto.supabase.co/auth/v1/callback
   ```

### 3. Configurar Variáveis de Ambiente

Certifique-se de que o backend tenha as seguintes variáveis:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
FRONTEND_URL=http://localhost:3000
```

### 4. Testar o Fluxo de Autenticação

#### Teste 1: Login via Google (POST)
```bash
curl -X POST http://localhost:5000/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"token": "google-id-token"}'
```

#### Teste 2: Callback do Google (GET)
```
http://localhost:5000/auth/callback/google?code=authorization-code
```

#### Teste 3: Buscar Perfil
```bash
curl -X GET http://localhost:5000/profile/me \
  -H "Authorization: Bearer access-token"
```

#### Teste 4: Listar Endereços
```bash
curl -X GET http://localhost:5000/profile/addresses \
  -H "Authorization: Bearer access-token"
```

## 📊 Estrutura das Tabelas

### user_profiles
- `id` (UUID) - Referência para auth.users
- `full_name` (TEXT)
- `cpf` (VARCHAR(11))
- `phone` (VARCHAR(15))
- `birth_date` (DATE)
- `avatar_url` (TEXT)
- `provider` (VARCHAR(20))
- `google_id` (TEXT)
- `email_verified` (BOOLEAN)
- `last_login` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### user_addresses
- `id` (UUID)
- `user_id` (UUID) - FK para auth.users
- `name` (VARCHAR(100))
- `recipient_name` (VARCHAR(255))
- `logradouro` (VARCHAR(255))
- `numero` (VARCHAR(20))
- `complemento` (VARCHAR(100))
- `bairro` (VARCHAR(100))
- `cidade` (VARCHAR(100))
- `estado` (VARCHAR(2))
- `cep` (VARCHAR(9))
- `is_default` (BOOLEAN)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## 🔧 Funcionalidades Implementadas

### Triggers Automáticos
- ✅ Criação automática de perfil ao registrar usuário
- ✅ Atualização automática de `updated_at`
- ✅ Garantia de apenas um endereço padrão por usuário
- ✅ Limpeza automática de itens antigos do carrinho

### Políticas de Segurança (RLS)
- ✅ Usuários só acessam seus próprios dados
- ✅ Admins têm acesso completo
- ✅ Proteção contra acesso não autorizado

### Views Otimizadas
- ✅ `user_complete_profile` - Perfil completo do usuário
- ✅ `cart_with_products` - Carrinho com detalhes dos produtos

### Funções Utilitárias
- ✅ `get_user_profile(user_id)` - Buscar perfil
- ✅ `update_last_login(user_id)` - Atualizar último login
- ✅ `ensure_single_default_address()` - Garantir endereço padrão único
- ✅ `clean_old_cart_items()` - Limpar carrinho antigo

## 🧪 Validação do Fluxo

### Cenário 1: Primeiro Login Google
1. Usuário faz login via Google
2. Sistema cria entrada em `auth.users`
3. Trigger cria perfil em `user_profiles`
4. Backend retorna dados completos

### Cenário 2: Login Subsequente
1. Usuário faz login via Google
2. Sistema encontra perfil existente
3. Atualiza `last_login`
4. Backend retorna dados atualizados

### Cenário 3: Gerenciamento de Endereços
1. Usuário adiciona endereço
2. Sistema valida dados obrigatórios
3. Aplica regras de endereço padrão
4. Salva com políticas RLS

## 🔍 Verificações de Qualidade

### Checklist de Validação
- [ ] Tabelas criadas no Supabase
- [ ] Google OAuth configurado
- [ ] Triggers funcionando
- [ ] Políticas RLS ativas
- [ ] Backend integrado
- [ ] Testes de login realizados
- [ ] Testes de perfil realizados
- [ ] Testes de endereços realizados

### Logs para Monitorar
```sql
-- Verificar criação de perfis
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 10;

-- Verificar endereços
SELECT * FROM user_addresses ORDER BY created_at DESC LIMIT 10;

-- Verificar últimos logins
SELECT id, full_name, last_login FROM user_profiles 
WHERE last_login > NOW() - INTERVAL '1 day';
```

## 🚨 Troubleshooting

### Problema: Perfil não é criado automaticamente
**Solução:** Verificar se o trigger `create_user_profile_trigger` está ativo

### Problema: Erro de permissão RLS
**Solução:** Verificar se as políticas estão habilitadas e corretas

### Problema: Google OAuth não funciona
**Solução:** Verificar credenciais e URLs de redirecionamento

### Problema: Endereço padrão duplicado
**Solução:** Executar função `ensure_single_default_address()`

## 📞 Suporte

Em caso de problemas:
1. Verificar logs do Supabase
2. Verificar logs do backend
3. Testar endpoints individualmente
4. Verificar variáveis de ambiente

---

**Status:** ✅ Implementação Completa
**Data:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Versão:** 1.0.0

