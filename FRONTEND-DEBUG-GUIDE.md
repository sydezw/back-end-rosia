# 🔍 Guia de Debug - Frontend Login

## 🚨 Problema Atual
**Frontend enviando `body: undefined` para `/api/auth/login`**

### Stack de Erro:
```
auth-api.ts:34 
POST http://localhost:3001/api/auth/login 401 (Unauthorized)
login @ auth-api.ts:34
login @ useLogin.ts:15
login @ AuthContext.tsx:50
handleSignIn @ AuthDialog.tsx:51
```

## 🔧 Como Debugar

### 1. **AuthDialog.tsx** (Linha 51)
```typescript
// Adicione console.log para verificar os dados do formulário
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 🔍 DEBUG: Verificar dados do formulário
  console.log('🔍 AuthDialog - Dados do formulário:', {
    email: emailRef.current?.value,
    password: passwordRef.current?.value
  });
  
  const email = emailRef.current?.value;
  const password = passwordRef.current?.value;
  
  if (!email || !password) {
    console.error('❌ Email ou senha vazios');
    return;
  }
  
  try {
    await login({ email, password }); // Chamada para AuthContext
  } catch (error) {
    console.error('❌ Erro no handleSignIn:', error);
  }
};
```

### 2. **AuthContext.tsx** (Linha 50)
```typescript
// Verificar se os dados chegam corretamente no contexto
const login = async (credentials: { email: string; password: string }) => {
  // 🔍 DEBUG: Verificar dados recebidos
  console.log('🔍 AuthContext - Credenciais recebidas:', credentials);
  
  try {
    setLoading(true);
    const result = await authApi.login(credentials); // Chamada para useLogin
    
    console.log('✅ AuthContext - Login bem-sucedido:', result);
    setUser(result.user);
    setToken(result.token);
  } catch (error) {
    console.error('❌ AuthContext - Erro no login:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

### 3. **useLogin.ts** (Linha 15)
```typescript
// Verificar se os dados são passados corretamente para a API
export const useLogin = () => {
  const login = async (credentials: { email: string; password: string }) => {
    // 🔍 DEBUG: Verificar dados antes da chamada da API
    console.log('🔍 useLogin - Dados para API:', credentials);
    
    try {
      const response = await authApi.login(credentials); // Chamada para auth-api.ts
      console.log('✅ useLogin - Resposta da API:', response);
      return response;
    } catch (error) {
      console.error('❌ useLogin - Erro na API:', error);
      throw error;
    }
  };
  
  return { login };
};
```

### 4. **auth-api.ts** (Linha 34)
```typescript
// Verificar a requisição HTTP final
const login = async (credentials: { email: string; password: string }) => {
  // 🔍 DEBUG: Verificar dados finais e configuração da requisição
  console.log('🔍 auth-api - Dados finais:', credentials);
  console.log('🔍 auth-api - URL:', `${API_BASE_URL}/api/auth/login`);
  
  const requestBody = {
    email: credentials.email,
    password: credentials.password
  };
  
  console.log('🔍 auth-api - Body da requisição:', requestBody);
  console.log('🔍 auth-api - Body JSON:', JSON.stringify(requestBody));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody) // ⚠️ CRÍTICO: Verificar se está sendo serializado
    });
    
    console.log('🔍 auth-api - Response status:', response.status);
    console.log('🔍 auth-api - Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ auth-api - Erro da resposta:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ auth-api - Dados recebidos:', data);
    return data;
  } catch (error) {
    console.error('❌ auth-api - Erro na requisição:', error);
    throw error;
  }
};
```

## 🔍 Verificações no DevTools

### 1. **Console do Navegador**
- Abra F12 → Console
- Procure pelos logs de debug (🔍)
- Verifique se os dados estão sendo passados corretamente

### 2. **Network Tab**
- F12 → Network → XHR/Fetch
- Procure pela requisição `POST /api/auth/login`
- Verifique:
  - **Request Headers**: `Content-Type: application/json`
  - **Request Payload**: Deve conter `{"email":"...","password":"..."}`
  - **Response**: Status e corpo da resposta

### 3. **Possíveis Causas**

#### ❌ **Problema 1: Serialização JSON**
```typescript
// ERRADO:
body: credentials // Objeto não serializado

// CORRETO:
body: JSON.stringify(credentials) // String JSON
```

#### ❌ **Problema 2: Headers Ausentes**
```typescript
// ERRADO:
headers: {}

// CORRETO:
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

#### ❌ **Problema 3: Dados Vazios**
```typescript
// Verificar se email/password não estão undefined/null
if (!credentials.email || !credentials.password) {
  throw new Error('Email e senha são obrigatórios');
}
```

#### ❌ **Problema 4: URL Incorreta**
```typescript
// Verificar se API_BASE_URL está correto
console.log('API_BASE_URL:', API_BASE_URL);
// Deve ser: http://localhost:3001
```

## 🎯 Próximos Passos

1. **Adicionar todos os console.log** nos arquivos mencionados
2. **Testar o login** e verificar os logs no console
3. **Verificar Network tab** para ver a requisição real
4. **Identificar onde os dados se perdem** no fluxo
5. **Corrigir o problema** baseado nos achados

## ✅ Teste de Validação

Após as correções, a requisição deve aparecer nos logs do backend como:
```
[INFO] POST /api/auth/login {
  ip: '::1',
  userAgent: '...',
  body: { email: 'test@example.com', password: 'senha123' } // ✅ COM DADOS
}
```

**Não mais `body: undefined`** ❌

