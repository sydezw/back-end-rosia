# Solução Completa: Erros no Login Google

## Problema 1: Erro 500 "PROFILE_ERROR" no Backend

### Diagnóstico
- Erro ocorre apenas em produção (Vercel)
- Backend local funciona corretamente
- Supabase conecta localmente, mas pode ter problemas em produção

### Solução Passo a Passo

#### 1. Configurar Variáveis de Ambiente no Vercel

```bash
# Verificar variáveis atuais
vercel env ls

# Adicionar variáveis necessárias
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

#### 2. Valores das Variáveis (do arquivo .env)

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# JWT
JWT_SECRET=sua-jwt-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=718842423005-87hoau5s544gno1l7js214c3doicep40.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=sua-google-client-secret
```

#### 3. Redeploy Após Configuração

```bash
# Forçar novo deploy
vercel --prod
```

## Problema 2: Erro 403 Google OAuth

### Diagnóstico
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

### Solução no Google Cloud Console

#### 1. Acessar Google Cloud Console
- Ir para: https://console.cloud.google.com/
- Selecionar o projeto correto

#### 2. Configurar OAuth 2.0
- Navegar: APIs & Services > Credentials
- Encontrar o Client ID: `718842423005-87hoau5s544gno1l7js214c3doicep40.apps.googleusercontent.com`
- Clicar em "Edit" (ícone de lápis)

#### 3. Adicionar Origens Autorizadas

**Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:5173
https://www.rosia.com.br
https://rosia.com.br
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
https://www.rosia.com.br/auth/callback
https://rosia.com.br/auth/callback
```

#### 4. Salvar Configurações
- Clicar em "Save"
- Aguardar propagação (pode levar alguns minutos)

## Teste de Validação

### 1. Testar Backend em Produção

```powershell
# Testar endpoint de debug (após deploy)
Invoke-WebRequest -Uri 'https://back-end-rosia02.vercel.app/api/debug/supabase' -Method GET

# Testar login com token real do Google
$headers = @{ 'Content-Type' = 'application/json' }
$body = @{ access_token = 'TOKEN_REAL_DO_GOOGLE' } | ConvertTo-Json
Invoke-WebRequest -Uri 'https://back-end-rosia02.vercel.app/api/auth/login/google' -Method POST -Headers $headers -Body $body
```

### 2. Testar Frontend

1. Abrir aplicação no navegador
2. Tentar login com Google
3. Verificar se não há mais erro 403
4. Verificar se login completa com sucesso

## Checklist de Verificação

### Backend (Vercel)
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado após configuração
- [ ] Endpoint `/api/debug/supabase` retorna 200
- [ ] Endpoint `/api/auth/login/google` não retorna 500

### Google OAuth
- [ ] Origens JavaScript autorizadas configuradas
- [ ] URIs de redirect configuradas
- [ ] Configurações salvas no Google Console
- [ ] Sem erro 403 no console do navegador

### Frontend
- [ ] Login Google abre popup corretamente
- [ ] Não há erro de origem não autorizada
- [ ] Token é recebido do backend
- [ ] Usuário é redirecionado após login

## Comandos de Debug

### Verificar Logs do Vercel
```bash
vercel logs https://back-end-rosia02.vercel.app
```

### Testar Conectividade Supabase
```javascript
// No console do navegador ou Node.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('SUA_URL', 'SUA_ANON_KEY');
supabase.from('user_profiles').select('count').then(console.log);
```

### Verificar Token Google
```javascript
// Validar token no Google
fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
  .then(r => r.json())
  .then(console.log);
```

## Próximos Passos

1. **Configurar variáveis no Vercel** (prioridade alta)
2. **Corrigir Google OAuth** (prioridade alta)
3. **Testar endpoints de debug** (prioridade média)
4. **Validar fluxo completo** (prioridade média)
5. **Documentar solução final** (prioridade baixa)

## Contatos de Suporte

- **Vercel**: https://vercel.com/support
- **Supabase**: https://supabase.com/support
- **Google Cloud**: https://cloud.google.com/support

