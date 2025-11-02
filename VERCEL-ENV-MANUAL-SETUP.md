# 🔧 Configuração Manual das Variáveis de Ambiente na Vercel

## 📋 Credenciais Google OAuth

**⚠️ IMPORTANTE**: Use as credenciais reais fornecidas pelo usuário.

```
GOOGLE_CLIENT_ID=seu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_google_client_secret
```

## 🌐 Configuração via Dashboard Vercel

### Passo 1: Acessar o Projeto
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique no projeto **back-end-rosia02**

### Passo 2: Configurar Variáveis
1. Clique em **Settings** (no menu superior)
2. No menu lateral, clique em **Environment Variables**
3. Clique em **Add New**

### Passo 3: Adicionar GOOGLE_CLIENT_ID
1. **Name**: `GOOGLE_CLIENT_ID`
2. **Value**: `[USAR_CREDENCIAL_REAL_FORNECIDA]`
3. **Environments**: ✅ Marcar todas as opções:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. Clique em **Save**

### Passo 4: Adicionar GOOGLE_CLIENT_SECRET
1. Clique em **Add New** novamente
2. **Name**: `GOOGLE_CLIENT_SECRET`
3. **Value**: `[USAR_CREDENCIAL_REAL_FORNECIDA]`
4. **Environments**: ✅ Marcar todas as opções:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Clique em **Save**

## 🚀 Redeploy Automático

Após adicionar as variáveis, a Vercel fará **redeploy automático** do projeto.

**Aguarde 2-3 minutos** para o deploy completar.

## 🧪 Testar a Configuração

### Teste 1: Verificar se o endpoint responde
```bash
curl -X POST https://back-end-rosia02.vercel.app/api/auth/login/google \
     -H "Content-Type: application/json" \
     -d '{"token":"test"}'
```

**Resultado esperado**: Erro relacionado ao token inválido (não mais "Erro interno do servidor")

### Teste 2: Verificar logs da Vercel
1. No dashboard da Vercel, clique em **Functions**
2. Clique em **View Function Logs**
3. Faça uma requisição e verifique se não há erros de variáveis de ambiente

## ✅ Checklist de Verificação

- [ ] GOOGLE_CLIENT_ID adicionado com valor correto
- [ ] GOOGLE_CLIENT_SECRET adicionado com valor correto
- [ ] Ambas variáveis marcadas para Production, Preview e Development
- [ ] Redeploy automático completado (aguardar 2-3 minutos)
- [ ] Teste do endpoint não retorna mais "Erro interno do servidor"
- [ ] Logs da Vercel não mostram erros de variáveis de ambiente

## 🔍 Troubleshooting

### Problema: Ainda retorna "Erro interno do servidor"
**Solução**: 
1. Verificar se as variáveis foram salvas corretamente
2. Aguardar mais tempo para o redeploy
3. Forçar redeploy: Deployments → ⋯ → Redeploy

### Problema: "Variable not found"
**Solução**:
1. Verificar se os nomes estão exatos: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
2. Verificar se todas as environments estão marcadas

### Problema: Token inválido
**Solução**: Normal! Significa que as variáveis estão funcionando. O erro agora é do token de teste.

---

**📝 Nota**: Após a configuração, o Google OAuth estará funcional para autenticação de usuários reais.

