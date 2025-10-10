# GUIA DE CORREÇÃO - ERRO 401 NO FRONTEND

## 🔍 PROBLEMA IDENTIFICADO

O erro 401 "Unauthorized" está ocorrendo porque:

1. **Login Google funciona perfeitamente** ✅
   - Token é gerado corretamente
   - Status 200 no login
   - Token salvo no localStorage

2. **Problema no ProfileSettings** ❌
   - Faz requisição para `/api/users/profile` (endpoint de usuários normais)
   - Deveria fazer para `/api/google-users/profile` (endpoint específico Google)
   - Resultado: 401 Unauthorized

## 📊 ANÁLISE DO LOG

```
✅ Login: POST /api/auth/login/google → 200 OK
✅ Token: Salvo corretamente no localStorage
❌ Profile: GET /api/users/profile → 401 Unauthorized
```

**O token é válido, mas está sendo enviado para o endpoint errado!**

## 🛠️ SOLUÇÃO IMEDIATA

### Opção 1: Script de Correção (Temporário)
```javascript
// Execute no console do frontend:
// Arquivo: CORRECAO-INTERCEPTADOR-ENDPOINTS.js
```

### Opção 2: Correção Permanente no Código

#### 1. Modificar `endpoint-interceptor.ts`

```typescript
// Adicionar verificação de tipo de usuário
function getTokenProvider(): string | null {
  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.provider;
  } catch {
    return null;
  }
}

// Modificar interceptador
const originalFetch = window.fetch;

window.fetch = function(url: string | Request, options?: RequestInit) {
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Verificar se é requisição para backend da aplicação
  const isBackendRequest = (
    urlString.includes('/api/users/profile') || 
    urlString.includes('/api/users/profile-update')
  ) && (
    urlString.includes('localhost') || 
    urlString.includes('back-end-rosia02.vercel.app')
  );
  
  if (isBackendRequest) {
    const provider = getTokenProvider();
    
    if (provider === 'google-separated') {
      // Redirecionar para endpoints Google
      let newUrl = urlString;
      
      if (urlString.includes('/api/users/profile-update')) {
        newUrl = urlString.replace('/api/users/profile-update', '/api/google-users/profile-update');
      } else if (urlString.includes('/api/users/profile')) {
        newUrl = urlString.replace('/api/users/profile', '/api/google-users/profile');
      }
      
      console.log('🔄 Redirecionando para endpoint Google:', newUrl);
      return originalFetch(newUrl, options);
    }
  }
  
  return originalFetch(url, options);
};
```

#### 2. Alternativa: Modificar `ProfileSettings.tsx`

```typescript
// Função para determinar endpoint correto
const getProfileEndpoint = (): string => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
  
  if (!token) return '/api/users/profile';
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    if (payload.provider === 'google-separated') {
      return '/api/google-users/profile';
    }
  } catch (error) {
    console.log('Erro ao verificar token:', error);
  }
  
  return '/api/users/profile';
};

// Usar na função loadUserData
const loadUserData = async () => {
  try {
    const endpoint = getProfileEndpoint();
    console.log('📡 Usando endpoint:', endpoint);
    
    const response = await fetch(`http://localhost:3030${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // ... resto da função
  } catch (error) {
    // ... tratamento de erro
  }
};
```

## 🎯 RECOMENDAÇÃO

### Para Correção Imediata:
1. Execute o script `CORRECAO-INTERCEPTADOR-ENDPOINTS.js` no console
2. Teste o formulário de perfil

### Para Correção Permanente:
1. **Opção Preferida**: Modificar `endpoint-interceptor.ts` (centralizado)
2. **Opção Alternativa**: Modificar `ProfileSettings.tsx` (específico)

## 🔄 FLUXO CORRETO

```
1. Login Google → Token com provider: 'google-separated'
2. ProfileSettings → Verificar provider do token
3. Se Google → /api/google-users/profile
4. Se Normal → /api/users/profile
5. Sucesso → 200 OK com dados do usuário
```

## 🧪 TESTE DA CORREÇÃO

```javascript
// No console do frontend:
window.reloadProfileData(); // Função criada pelo script de correção
```

## 📝 RESUMO

- **Problema**: Endpoint errado para usuários Google
- **Causa**: ProfileSettings não verifica tipo de usuário
- **Solução**: Interceptador inteligente ou verificação no componente
- **Status**: Token válido, apenas redirecionamento necessário

---

**💡 O login está funcionando perfeitamente. O problema é apenas o redirecionamento de endpoints!**