# 🔧 CORREÇÃO DO MIDDLEWARE GOOGLE PARA ACEITAR TOKENS SUPABASE

## 📋 Problema Identificado

O frontend estava enviando **tokens do Supabase** (`session.access_token`) para os endpoints de usuários Google, mas o middleware `authenticateGoogleUser` estava esperando **tokens JWT customizados** com `provider: 'google-separated'`.

### Erro Original:
```
PUT http://localhost:8080/api/google-users/profile-update 401 (Unauthorized)
Token inválido para usuários Google
```

## ✅ Solução Implementada

### 1. Middleware Atualizado (`middleware/auth.js`)

O middleware `authenticateGoogleUser` foi completamente reescrito para:

- ✅ **Aceitar tokens do Supabase** em vez de tokens JWT customizados
- ✅ **Validar tokens usando `supabaseAdmin.auth.getUser()`**
- ✅ **Verificar se o usuário é do tipo Google** através dos metadados
- ✅ **Buscar o usuário na tabela `google_user_profiles`** por `google_id` ou `email`
- ✅ **Adicionar informações completas ao `req`** para uso nos controllers

### 2. Fluxo de Autenticação Atualizado

```javascript
// ANTES (não funcionava)
Token JWT customizado → Verificação com JWT_SECRET → Erro 401

// DEPOIS (funcionando)
Token Supabase → supabaseAdmin.auth.getUser() → Verificação de metadados → Busca na tabela → Sucesso
```

### 3. Verificações Implementadas

1. **Validação do Token Supabase**:
   ```javascript
   const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
   ```

2. **Verificação de Usuário Google**:
   ```javascript
   const isGoogleUser = supabaseUser.app_metadata?.provider === 'google' || 
                       supabaseUser.app_metadata?.providers?.includes('google') ||
                       supabaseUser.user_metadata?.provider === 'google';
   ```

3. **Busca na Tabela Google**:
   ```javascript
   // Primeiro por google_id
   let { data: user, error } = await supabaseAdmin
     .from('google_user_profiles')
     .select('*')
     .eq('google_id', googleId)
     .single();
   
   // Se não encontrar, busca por email
   if (error || !user) {
     const { data: userByEmail, error: emailError } = await supabaseAdmin
       .from('google_user_profiles')
       .select('*')
       .eq('email', supabaseUser.email)
       .single();
   }
   ```

## 🎯 Endpoints Afetados

Os seguintes endpoints agora funcionam corretamente com tokens do Supabase:

- ✅ `GET /api/google-users/profile`
- ✅ `PUT /api/google-users/profile-update`

## 🧪 Como Testar

### Opção 1: Script de Teste Automático
```javascript
// Execute no console do navegador (usuário logado com Google)
// O arquivo TESTE-ENDPOINT-GOOGLE-SUPABASE.js contém o script completo
```

### Opção 2: Teste Manual
1. Faça login com Google no frontend
2. Abra o console do navegador
3. Execute:
   ```javascript
   const { data: { session } } = await window.supabase.auth.getSession();
   const token = session.access_token;
   
   fetch('https://back-end-rosia02.vercel.app/api/google-users/profile-update', {
     method: 'PUT',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       nome: 'Teste',
       telefone: '11999999999'
     })
   }).then(r => r.json()).then(console.log);
   ```

## 📊 Informações Adicionadas ao Request

O middleware agora adiciona as seguintes informações ao objeto `req`:

```javascript
req.googleUser = {
  id: user.id,                    // ID na tabela google_user_profiles
  google_id: user.google_id,      // ID do Google
  email: user.email,              // Email do usuário
  nome: user.nome,                // Nome completo
  telefone: user.telefone,        // Telefone
  cpf: user.cpf,                  // CPF
  data_nascimento: user.data_nascimento,
  provider: 'google-supabase'     // Novo identificador
};

req.supabaseUser = supabaseUser;  // Dados completos do Supabase
req.token = token;                // Token original
```

## 🔄 Compatibilidade

- ✅ **Frontend**: Não precisa de mudanças, continua enviando `session.access_token`
- ✅ **Controllers**: Continuam funcionando normalmente com `req.googleUser`
- ✅ **Outros middlewares**: Não foram afetados

## 🚀 Status

- ✅ Middleware atualizado
- ✅ Servidor reiniciado
- ✅ Script de teste criado
- ✅ Documentação completa

**O sistema agora aceita tokens do Supabase para usuários Google e deve resolver o erro 401!**

