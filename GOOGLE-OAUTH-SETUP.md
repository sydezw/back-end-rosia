# 🔧 Configuração Google OAuth - Resolver Erro 500

## Problema Identificado

O erro 500 no endpoint `/api/auth/login/google` está ocorrendo porque as **variáveis de ambiente do Google OAuth não estão configuradas na Vercel**.

```
POST https://back-end-rosia02.vercel.app/api/auth/login/google 500 (Internal Server Error)
```

## Causa Raiz

O código em `utils/google-auth.js` tenta acessar `process.env.GOOGLE_CLIENT_ID`, mas essa variável não está definida na Vercel, causando falha na verificação do token.

## ✅ Solução: Configurar Variáveis na Vercel

### 1. Obter Credenciais do Google

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto ou crie um novo
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth 2.0 Client IDs**
5. Configure:
   - **Application type**: Web application
   - **Authorized JavaScript origins**: 
     - `http://localhost:8080`
     - `https://www.rosia.com.br`
     - `https://nsazbeovtmmetpiyokqc.supabase.co`
     - `http://localhost:5173`
     - `https://rosialoja-front-rosialastcommit.vercel.app`
     - `http://localhost:3000`
     - `http://localhost:3001`
     - `https://back-end-rosia02.vercel.app`
   - **Authorized redirect URIs**:
     - `https://rosia.com.br`
     - `http://localhost:8080/auth/callback`
     - `https://nsazbeovtmmetpiyokqc.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/callback`
     - `http://localhost:3000/api/auth/callback/google`
     - `https://back-end-rosia02.vercel.app/api/auth/login/google`
     - `https://back-end-rosia02.vercel.app/auth/callback`

### 2. Configurar na Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione o projeto `back-end-rosia02`
3. Vá em **Settings > Environment Variables**
4. Adicione as seguintes variáveis:

```env
GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_google_client_secret
```

**⚠️ IMPORTANTE**: Marque todas as opções:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 3. Redeployar

Após adicionar as variáveis:
1. Vá em **Deployments**
2. Clique nos 3 pontos do último deployment
3. Selecione **Redeploy**

## 🧪 Testar a Correção

Após o redeploy, teste o endpoint:

```bash
curl -X POST https://back-end-rosia02.vercel.app/api/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"token": "seu_google_id_token"}'
```

## 📋 Checklist de Verificação

- [ ] Credenciais Google OAuth criadas
- [ ] Domínios autorizados configurados
- [ ] Variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` adicionadas na Vercel
- [ ] Variáveis marcadas para Production, Preview e Development
- [ ] Projeto redeployado
- [ ] Endpoint testado e funcionando

## 🔍 Logs de Debug

Se ainda houver problemas, verifique os logs da Vercel:
1. Vá em **Functions**
2. Clique em **View Function Logs**
3. Faça uma requisição para o endpoint
4. Verifique se há erros relacionados ao Google OAuth

## 📝 Arquivos Relacionados

- `routes/auth.js` - Endpoint `/login/google`
- `utils/google-auth.js` - Verificação do token
- `.env.example` - Variáveis necessárias
- `vercel-env-example.txt` - Guia de configuração Vercel

---

## ✅ Status da Correção

**PROBLEMA IDENTIFICADO**: Erro 500 no endpoint `/api/auth/login/google`

**CAUSA RAIZ**: Variáveis de ambiente `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` não configuradas na Vercel

**STATUS**: 🔧 Credenciais obtidas - Pronto para configurar na Vercel

**CREDENCIAIS GOOGLE OAUTH**: ✅ Obtidas e prontas para configuração

**TESTE REALIZADO**: 
- ❌ GET `/api/auth/login/google` → "Rota não encontrada" 
- ✅ POST `/api/auth/login/google` → "Erro interno do servidor" (esperado sem as credenciais)

**Prioridade**: 🔴 Alta - Funcionalidade crítica de autenticação