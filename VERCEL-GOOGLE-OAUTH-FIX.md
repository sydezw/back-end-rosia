# 🔧 Correção Google OAuth na Vercel - Erro 500

## 🚨 Problema Identificado

O erro `500 (Internal Server Error)` no endpoint `/api/auth/login/google` indica que as variáveis de ambiente `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` **NÃO estão configuradas na Vercel**.

## ✅ Solução Passo a Passo

### 1. Configurar Variáveis na Vercel

1. **Acesse o Dashboard da Vercel:**
   - Vá para: https://vercel.com/dashboard
   - Selecione o projeto: `back-end-rosia02`

2. **Navegue para Environment Variables:**
   - Clique em `Settings`
   - Selecione `Environment Variables`

3. **Adicione as Variáveis:**
   ```
   Nome: GOOGLE_CLIENT_ID
   Valor: [USE_A_CREDENCIAL_REAL_DO_ARQUIVO_google-credentials.txt]
   Ambiente: Production, Preview, Development
   ```
   
   ```
   Nome: GOOGLE_CLIENT_SECRET
   Valor: [USE_A_CREDENCIAL_REAL_DO_ARQUIVO_google-credentials.txt]
   Ambiente: Production, Preview, Development
   ```

⚠️ **CREDENCIAIS:** Use os valores reais do arquivo `google-credentials.txt` (não commitado).

### 2. Redeploy Obrigatório

⚠️ **IMPORTANTE:** Após adicionar as variáveis, você DEVE fazer um redeploy:

1. **Via Dashboard:**
   - Vá para `Deployments`
   - Clique nos 3 pontos (`...`) do último deployment
   - Selecione `Redeploy`

2. **Via Git (Recomendado):**
   ```bash
   git commit --allow-empty -m "trigger redeploy for env vars"
   git push origin main
   ```

### 3. Verificar Configuração

Após o redeploy, teste:

```bash
# Teste GET (deve retornar erro de método)
curl https://back-end-rosia02.vercel.app/api/auth/login/google

# Teste POST (deve processar sem erro 500)
curl -X POST https://back-end-rosia02.vercel.app/api/auth/login/google \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 🔍 Diagnóstico do Problema

### Erro Atual:
- ❌ `POST /api/auth/login/google` → `500 (Internal Server Error)`
- ❌ Variáveis `process.env.GOOGLE_CLIENT_ID` e `process.env.GOOGLE_CLIENT_SECRET` são `undefined`

### Após Correção:
- ✅ `POST /api/auth/login/google` → Processamento normal (sem erro 500)
- ✅ Variáveis de ambiente disponíveis no runtime

## 📋 Checklist de Verificação

- [ ] Variáveis adicionadas na Vercel Dashboard
- [ ] Ambientes selecionados: Production, Preview, Development
- [ ] Redeploy executado
- [ ] Teste do endpoint realizado
- [ ] Erro 500 resolvido

## 🚀 Próximos Passos

Após resolver o erro 500:
1. Testar o fluxo completo de autenticação Google
2. Verificar se o CORS está funcionando corretamente
3. Testar integração com o frontend

---

**Nota:** As credenciais reais estão no arquivo `google-credentials.txt` (não commitado) para segurança.