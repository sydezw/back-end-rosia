# Solução para Problemas de Login Google - Frontend

## 🚨 Problemas Identificados nos Logs

### 1. Backend não retorna access_token válido
**Erro**: `❌ Backend não retornou access_token válido`
**Causa**: O backend retorna `token` mas o frontend espera `access_token`

### 2. Erro 403 do Google OAuth
**Erro**: `The given origin is not allowed for the given client ID`
**Causa**: Configuração incorreta das origens autorizadas no Google Console

### 3. Servidor em produção com erro interno
**Erro**: `{"error":"Erro interno do servidor","code":"INTERNAL_ERROR"}`
**Causa**: Possível problema de configuração de variáveis de ambiente

## 🔧 Soluções Implementadas

### 1. Correção da Resposta do Backend

O backend atual retorna:
```json
{
  "success": true,
  "user": {...},
  "token": "jwt_token_here",
  "frontend_instructions": {...}
}
```

**Solução**: Adicionar `access_token` na resposta para compatibilidade:

```javascript
// No arquivo auth-api.ts do frontend, modificar:
if (data.success && (data.access_token || data.token)) {
  const token = data.access_token || data.token;
  
  // Validar token antes de salvar
  if (token && token !== 'undefined' && token !== 'null') {
    localStorage.setItem('access_token', token);
    return { success: true, user: data.user, token };
  } else {
    throw new Error('Token recebido é inválido');
  }
}
```

### 2. Atualização do Backend para Compatibilidade

Adicionar `access_token` na resposta do endpoint `/api/auth/login/google`:

```javascript
const responseData = {
  success: true,
  user: {...},
  token: jwtToken,           // Mantém compatibilidade
  access_token: jwtToken,    // Adiciona para frontend
  // ... resto da resposta
};
```

### 3. Configuração do Google OAuth

**Origens JavaScript autorizadas** no Google Console:
```
http://localhost:3000
http://localhost:5173
https://seu-dominio-frontend.vercel.app
https://back-end-rosia02.vercel.app
```

**URIs de redirecionamento autorizados**:
```
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
https://seu-dominio-frontend.vercel.app/auth/callback
https://back-end-rosia02.vercel.app/api/auth/callback/google
```

### 4. Validação Robusta no Frontend

```javascript
// auth-api.ts - Função melhorada
export const loginGoogle = async (googleToken: string) => {
  try {
    console.log('🔍 loginGoogle - Enviando requisição para:', `${API_BASE_URL}/auth/login/google`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleToken })
    });
    
    console.log('🔍 loginGoogle - Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na resposta:', errorData);
      throw new Error(errorData.error || 'Erro no login Google');
    }
    
    const data = await response.json();
    console.log('🔍 loginGoogle - Data recebida do backend:', data);
    
    // Verificar múltiplos formatos de token
    const token = data.access_token || data.token;
    
    if (data.success && token) {
      // Validação robusta do token
      if (token && 
          token !== 'undefined' && 
          token !== 'null' && 
          token !== null && 
          typeof token === 'string' && 
          token.length > 10) {
        
        console.log('✅ Token válido recebido, salvando...');
        localStorage.setItem('access_token', token);
        
        // Salvar dados do usuário
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return {
          success: true,
          user: data.user,
          token: token
        };
      } else {
        console.error('❌ Token inválido recebido:', { token, type: typeof token });
        throw new Error('Token recebido é inválido');
      }
    } else {
      console.error('❌ Backend não retornou dados válidos:', data);
      throw new Error(data.error || 'Backend não retornou token de acesso válido');
    }
    
  } catch (error) {
    console.error('❌ loginGoogle - Erro completo:', error);
    
    // Limpar dados corrompidos
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    throw error;
  }
};
```

### 5. Configuração de Variáveis de Ambiente

**Backend (.env)**:
```env
# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# JWT
JWT_SECRET=sua_chave_secreta_muito_forte_aqui

# Supabase
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# CORS
FRONTEND_URL=https://seu-frontend.vercel.app
```

**Frontend (.env)**:
```env
VITE_API_BASE_URL=https://back-end-rosia02.vercel.app/api
VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui
```

## 🔍 Testes e Validação

### 1. Testar Endpoint Local
```bash
# PowerShell
$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/auth/login/google' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{"token":"valid_google_token_here"}'
$response.Content | ConvertFrom-Json
```

### 2. Verificar Configuração Google
```javascript
// No console do navegador
fetch('/api/auth/debug/google-config')
  .then(r => r.json())
  .then(console.log);
```

### 3. Testar Limpeza de Tokens
```javascript
// Carregar utilitário de limpeza
fetch('/api/auth/utils/localStorage-cleanup.js')
  .then(r => r.text())
  .then(script => {
    eval(script);
    LocalStorageCleanup.cleanupTokens();
  });
```

## 📝 Checklist de Correções

### Backend
- [ ] Adicionar `access_token` na resposta do login Google
- [ ] Verificar variáveis de ambiente em produção
- [ ] Testar endpoint com token Google válido
- [ ] Verificar logs de erro em produção

### Frontend
- [ ] Atualizar `auth-api.ts` para aceitar `token` ou `access_token`
- [ ] Implementar validação robusta de tokens
- [ ] Adicionar limpeza automática de dados corrompidos
- [ ] Testar fluxo completo de login

### Google Console
- [ ] Verificar origens JavaScript autorizadas
- [ ] Confirmar URIs de redirecionamento
- [ ] Testar com diferentes domínios (local e produção)
- [ ] Verificar quotas e limites da API

## 🚀 Implementação Rápida

### 1. Correção Imediata no Backend
```javascript
// Em routes/auth.js, linha ~390
const responseData = {
  success: true,
  user: {...},
  token: jwtToken,
  access_token: jwtToken,  // ADICIONAR ESTA LINHA
  // ... resto da resposta
};
```

### 2. Correção Imediata no Frontend
```javascript
// Em auth-api.ts
const token = data.access_token || data.token;  // MODIFICAR ESTA LINHA
```

## 📞 Próximos Passos

1. **Implementar correção do backend** (adicionar access_token)
2. **Atualizar frontend** para aceitar ambos os formatos
3. **Verificar configuração Google Console**
4. **Testar em ambiente de produção**
5. **Monitorar logs para novos erros**

---

**Status**: Soluções identificadas e prontas para implementação
**Prioridade**: Alta - Afeta login de usuários
**Tempo estimado**: 30 minutos para implementar todas as correções

