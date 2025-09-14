# 🔧 SOLUÇÃO: Google OAuth 403 - Origem Não Permitida

## 🚨 PROBLEMA IDENTIFICADO

### Erro Principal:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
Failed to load resource: the server responded with a status of 403 ()
```

### Erro Secundário:
```
handleAuthSuccess - Access token inválido: undefined
```

## 🔍 ANÁLISE DO PROBLEMA

### 1. **Configuração de Domínios no Google Console**
- O Google Client ID está configurado apenas para `localhost:8080`
- Mas a aplicação pode estar rodando em outra porta ou domínio
- Domínios autorizados não incluem todas as possibilidades

### 2. **Token Inválido do Backend**
- O backend está retornando `undefined` como access_token
- A função `handleAuthSuccess` está rejeitando tokens inválidos
- O Google OAuth está funcionando, mas o backend não processa corretamente

## 🛠️ SOLUÇÕES

### SOLUÇÃO 1: Configurar Domínios Autorizados no Google Console

1. **Acesse o Google Cloud Console:**
   - Vá para: https://console.cloud.google.com/
   - Navegue para "APIs & Services" > "Credentials"

2. **Edite o OAuth 2.0 Client ID:**
   - Client ID: `718842423005-87hoau5s544gno1l7js214c3doicep40`
   - Clique em "Edit"

3. **Adicione Origens JavaScript Autorizadas:**
   ```
   http://localhost:3000
   http://localhost:5173
   http://localhost:8080
   http://127.0.0.1:3000
   http://127.0.0.1:5173
   http://127.0.0.1:8080
   https://seu-dominio-producao.com
   ```

4. **Adicione URIs de Redirecionamento Autorizados:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:5173/auth/callback
   http://localhost:8080/auth/callback
   http://127.0.0.1:3000/auth/callback
   http://127.0.0.1:5173/auth/callback
   http://127.0.0.1:8080/auth/callback
   https://seu-dominio-producao.com/auth/callback
   ```

### SOLUÇÃO 2: Verificar Backend Google OAuth

1. **Teste o Endpoint do Backend:**
   ```javascript
   // Execute no console do navegador:
   fetch('https://back-end-rosia02.vercel.app/api/auth/google', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       token: 'test-token'
     })
   })
   .then(response => response.json())
   .then(data => console.log('Backend Response:', data))
   .catch(error => console.error('Backend Error:', error));
   ```

### SOLUÇÃO 3: Implementar Fallback para Desenvolvimento

1. **Criar Configuração Dinâmica de Client ID:**
   ```javascript
   // Adicionar ao .env
   VITE_GOOGLE_CLIENT_ID_DEV=718842423005-87hoau5s544gno1l7js214c3doicep40.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_ID_PROD=seu-client-id-producao
   ```

2. **Atualizar App.tsx:**
   ```javascript
   const googleClientId = import.meta.env.VITE_ENV === 'production' 
     ? import.meta.env.VITE_GOOGLE_CLIENT_ID_PROD 
     : import.meta.env.VITE_GOOGLE_CLIENT_ID_DEV;
   ```

## 🚀 SOLUÇÃO IMEDIATA

### 1. **Verificar Porta Atual**
```javascript
// Execute no console do navegador:
console.log('🌐 URL Atual:', window.location.origin);
console.log('🔌 Porta:', window.location.port);
```

### 2. **Testar com Porta Correta**
Se a aplicação estiver rodando em porta diferente de 8080:

```bash
# Parar o servidor atual
# Ctrl+C no terminal

# Iniciar na porta correta
npm run dev -- --port 8080
```

### 3. **Limpar Cache do Google OAuth**
```javascript
// Execute no console do navegador:
console.log('🧹 Limpando cache do Google OAuth...');

// Limpar cookies do Google
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Recarregar página
window.location.reload();
```

## 🔧 CORREÇÃO NO CÓDIGO

### Melhorar Validação do Google Token

```javascript
// Em auth-api.ts - função loginGoogle
export async function loginGoogle(googleToken: string): Promise<{ user: User; token: string }> {
  console.log('🔍 loginGoogle - Token recebido:', googleToken ? 'Token presente' : 'Token ausente');
  
  if (!googleToken) {
    throw new Error('Token do Google não fornecido');
  }
  
  try {
    const response = await fetch(API_ENDPOINTS.AUTH.GOOGLE_LOGIN, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        token: googleToken
      })
    });
    
    console.log('🔍 loginGoogle - Response status:', response.status);
    
    const data = await handleApiResponse(response);
    console.log('🔍 loginGoogle - Data recebida:', data);
    
    // Verificar se o backend retornou dados válidos
    if (!data || (!data.access_token && !data.session?.access_token)) {
      console.error('❌ Backend não retornou access_token válido:', data);
      throw new Error('Backend não retornou token de acesso válido');
    }
    
    handleAuthSuccess(data);
    
    return { user: data.user, token: data.access_token || data.session?.access_token };
  } catch (error) {
    console.error('❌ loginGoogle - Erro:', error);
    throw error;
  }
}
```

## 📋 CHECKLIST DE CORREÇÃO

- [ ] Verificar porta da aplicação (deve ser 8080)
- [ ] Configurar domínios autorizados no Google Console
- [ ] Testar endpoint do backend
- [ ] Limpar cache do navegador
- [ ] Verificar logs do backend
- [ ] Testar login Google novamente
- [ ] Verificar se tokens são salvos corretamente

## 🎯 PRÓXIMOS PASSOS

1. **Configurar Google Console** (mais importante)
2. **Verificar backend** (segunda prioridade)
3. **Testar login completo**
4. **Documentar configuração final**

---

**⚠️ IMPORTANTE:** O erro 403 é principalmente devido à configuração de domínios no Google Console. Corrija isso primeiro antes de outras soluções.