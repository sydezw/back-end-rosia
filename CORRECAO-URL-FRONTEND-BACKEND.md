# 🔧 CORREÇÃO: URL do Backend no Frontend

## ❌ Problema Identificado

O frontend está tentando acessar o backend na porta **8080**, mas o servidor está rodando na porta **3030**.

**Erro no console:**
```
PUT http://localhost:8080/api/google-users/address 404 (Not Found)
```

**Servidor real:**
```
https://back-end-rosia02.vercel.app
```

## ✅ Solução

### 1. Verificar Configuração da API no Frontend

Procure por arquivos de configuração da API no frontend:

```typescript
// config/api.ts ou similar
const API_BASE_URL = 'https://back-end-rosia02.vercel.app'; // ✅ Correto
// NÃO: 'http://localhost:8080' // ❌ Incorreto
```

### 2. Atualizar Interceptador de Endpoints

No arquivo `endpoint-interceptor.ts`, verifique se a URL base está correta:

```typescript
// endpoint-interceptor.ts
const baseURL = process.env.REACT_APP_API_URL || 'https://back-end-rosia02.vercel.app';
```

### 3. Variáveis de Ambiente

Crie/atualize o arquivo `.env` no frontend:

```env
# .env (frontend)
REACT_APP_API_URL=https://back-end-rosia02.vercel.app
REACT_APP_BACKEND_URL=https://back-end-rosia02.vercel.app
```

### 4. Verificar ProfileSettings.tsx

No componente ProfileSettings, certifique-se de que está usando a URL correta:

```typescript
// ProfileSettings.tsx
const handleSaveAddress = async (addressData: any) => {
  try {
    const response = await fetch('/api/google-users/address', { // ✅ Relativo
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addressData)
    });
    
    // OU usar URL absoluta:
    // const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/address', {
    
  } catch (error) {
    console.error('Erro ao salvar endereço:', error);
  }
};
```

## 🔍 Como Verificar

### 1. Testar Endpoint Manualmente

```bash
# PowerShell - Testar se o backend está funcionando
curl -X PUT https://back-end-rosia02.vercel.app/api/google-users/address `
  -H "Authorization: Bearer SEU_TOKEN_SUPABASE" `
  -H "Content-Type: application/json" `
  -d '{"cep":"12345-678","logradouro":"Rua Teste","numero":"123","bairro":"Centro","cidade":"São Paulo","estado":"SP"}'
```

### 2. Verificar se o Servidor Está Rodando

```bash
# Verificar processos na porta 3030
netstat -ano | findstr :3030
```

### 3. Logs do Backend

Quando o frontend fizer a requisição correta, você deve ver logs como:

```
🔐 Google Auth Debug - Token: { provided: true, length: 180, preview: 'eyJhbGciOiJIUzI1NiIsInR5...' }
🔍 Verificando token do Supabase para usuário Google...
✅ Token do Supabase válido para usuário: usuario@email.com
✅ Usuário Google autenticado: usuario@email.com
```

## 🚀 Configuração Recomendada

### Frontend (desenvolvimento)
```env
REACT_APP_API_URL=https://back-end-rosia02.vercel.app
```

### Frontend (produção)
```env
REACT_APP_API_URL=https://back-end-rosia02.vercel.app
```

### Código Adaptativo
```typescript
// config/api.ts
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://back-end-rosia02.vercel.app';
  }
  return process.env.REACT_APP_API_URL || 'https://back-end-rosia02.vercel.app';
};

export const API_BASE_URL = getApiUrl();
```

## ✅ Checklist de Verificação

- [ ] Backend rodando na porta 3030
- [ ] Frontend configurado para usar https://back-end-rosia02.vercel.app
- [ ] Variáveis de ambiente atualizadas
- [ ] Interceptador usando URL correta
- [ ] Token do Supabase sendo enviado corretamente
- [ ] CORS configurado para aceitar requisições do frontend

## 🔧 Teste Rápido

Após as correções, teste no console do navegador:

```javascript
// Console do navegador
fetch('https://back-end-rosia02.vercel.app/api/google-users/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Se retornar dados do perfil, a configuração está correta! 🎉

