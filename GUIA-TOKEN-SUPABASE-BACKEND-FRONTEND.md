# 🔐 Guia: Token do Supabase no Backend e Frontend

## 📋 Visão Geral

Após as alterações no middleware `authenticateGoogleUser`, o backend agora aceita **tokens JWT do Supabase Auth** (`session.access_token`) em vez de tokens JWT customizados. Este guia explica como funciona a autenticação e como o frontend deve enviar as informações.

## 🔧 Como Funciona no Backend

### 1. Middleware `authenticateGoogleUser` Atualizado

**Localização:** `middleware/auth.js` (linhas 385-500)

**Fluxo de Validação:**

```javascript
// 1. Extração do token do header Authorization
const authHeader = req.headers.authorization;
const token = authHeader && authHeader.startsWith('Bearer ') 
  ? authHeader.substring(7) 
  : null;

// 2. Validação via Supabase Admin
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

// 3. Verificação se é usuário Google
if (user.app_metadata.provider !== 'google') {
  return res.status(401).json({ 
    success: false, 
    message: 'Token não é de usuário Google' 
  });
}

// 4. Busca do perfil na tabela google_user_profiles
const { data: googleUser } = await supabaseAdmin
  .from('google_user_profiles')
  .select('*')
  .or(`google_id.eq.${user.id},email.eq.${user.email}`)
  .single();

// 5. Adição das informações ao objeto req
req.user = googleUser;
req.supabaseUser = user;
req.provider = 'google-supabase';
```

### 2. Verificações Realizadas

✅ **Token válido:** Verifica se o token é válido via `supabaseAdmin.auth.getUser()`
✅ **Usuário Google:** Confirma que `user.app_metadata.provider === 'google'`
✅ **Perfil existe:** Busca o usuário na tabela `google_user_profiles`
✅ **Token não expirado:** Supabase valida automaticamente a expiração

### 3. Informações Disponíveis nos Controllers

Após a autenticação bem-sucedida, os controllers têm acesso a:

```javascript
// Dados do perfil Google
req.user = {
  id: 1,
  google_id: "user_google_id",
  email: "user@gmail.com",
  nome: "Nome do Usuário",
  telefone: "11999999999",
  // ... outros campos
};

// Dados completos do Supabase
req.supabaseUser = {
  id: "supabase_user_id",
  email: "user@gmail.com",
  app_metadata: { provider: "google" },
  user_metadata: { /* dados do Google */ },
  // ... outros campos
};

// Identificador do provider
req.provider = 'google-supabase';
```

## 🌐 Como o Frontend Deve Enviar

### 1. Obtenção do Token

**No Frontend (após login Google):**

```javascript
// Após login bem-sucedido
const { data: { session }, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});

if (session) {
  const token = session.access_token; // ✅ Este é o token que deve ser enviado
  
  // Armazenar para uso posterior
  localStorage.setItem('supabase_token', token);
}
```

### 2. Envio nas Requisições

**Formato do Header:**

```javascript
// ✅ CORRETO: Enviar token do Supabase
const token = session.access_token; // ou localStorage.getItem('supabase_token')

fetch('http://localhost:3030/api/google-users/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`, // ✅ Token do Supabase
    'Content-Type': 'application/json'
  }
});
```

**❌ INCORRETO (formato antigo):**

```javascript
// ❌ NÃO USAR MAIS: Token JWT customizado
const customToken = jwt.sign({ 
  provider: 'google-separated',
  googleUserId: 'xxx' 
}, secret);
```

### 3. Exemplo Completo de Requisição

```javascript
// Função para fazer requisições autenticadas
async function fazerRequisicaoAutenticada(url, options = {}) {
  // Obter sessão atual do Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// Uso:
// GET Profile
const profileResponse = await fazerRequisicaoAutenticada(
  'http://localhost:3030/api/google-users/profile'
);

// PUT Profile Update
const updateResponse = await fazerRequisicaoAutenticada(
  'http://localhost:3030/api/google-users/profile-update',
  {
    method: 'PUT',
    body: JSON.stringify({
      nome: 'Novo Nome',
      telefone: '11999999999'
    })
  }
);
```

## 🔍 Endpoints Afetados

Todos os endpoints que usam `authenticateGoogleUser` middleware:

- `GET /api/google-users/profile`
- `PUT /api/google-users/profile-update`
- Outros endpoints de usuários Google

## 🚨 Possíveis Erros e Soluções

### Erro 400 Bad Request

**Possíveis causas:**

1. **Token não enviado:**
   ```json
   {
     "success": false,
     "message": "Token de autorização necessário"
   }
   ```
   **Solução:** Verificar se o header `Authorization` está sendo enviado.

2. **Token inválido:**
   ```json
   {
     "success": false,
     "message": "Token inválido"
   }
   ```
   **Solução:** Verificar se o token do Supabase está correto e não expirado.

3. **Usuário não é Google:**
   ```json
   {
     "success": false,
     "message": "Token não é de usuário Google"
   }
   ```
   **Solução:** Confirmar que o login foi feito via Google OAuth.

### Erro 401 Unauthorized

**Possíveis causas:**

1. **Token expirado:**
   **Solução:** Renovar a sessão do Supabase.

2. **Usuário não encontrado:**
   ```json
   {
     "success": false,
     "message": "Usuário Google não encontrado"
   }
   ```
   **Solução:** Verificar se o usuário existe na tabela `google_user_profiles`.

## 🧪 Como Testar

### 1. Teste Manual no Console

```javascript
// No console do navegador (após login)
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session.access_token);

// Testar endpoint
fetch('http://localhost:3030/api/google-users/profile', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log);
```

### 2. Usar Scripts de Teste

- **Automático:** `TESTE-ENDPOINT-GOOGLE-SUPABASE.js`
- **Manual:** `TESTE-MANUAL-GOOGLE-ENDPOINT.js`

## 📝 Checklist para o Frontend

- [ ] Usar `session.access_token` do Supabase
- [ ] Enviar no header `Authorization: Bearer <token>`
- [ ] Verificar se usuário está logado antes de fazer requisições
- [ ] Tratar erros 400/401 adequadamente
- [ ] Renovar sessão quando token expira
- [ ] Remover lógica de tokens JWT customizados

## 🔄 Migração do Código Antigo

**Antes (❌):**
```javascript
const token = jwt.sign({
  provider: 'google-separated',
  googleUserId: user.id
}, JWT_SECRET);
```

**Depois (✅):**
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;
```

---

**✅ Com essas alterações, o sistema agora funciona de forma integrada com o Supabase Auth, eliminando a necessidade de tokens JWT customizados e simplificando a autenticação.**