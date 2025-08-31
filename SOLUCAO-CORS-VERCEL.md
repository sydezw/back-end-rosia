# 🚨 Solução para Erro de CORS no Vercel

## 🔍 Problema Identificado

O erro de CORS persiste porque:
1. O Vercel está redirecionando para autenticação
2. As variáveis de ambiente podem não estar configuradas
3. A aplicação não está funcionando corretamente em produção

## ✅ Soluções

### 1. Configurar Variáveis de Ambiente no Vercel

**Acesse:** https://vercel.com/dashboard

1. Selecione o projeto `back-end-rosia`
2. Vá em **Settings > Environment Variables**
3. Adicione as seguintes variáveis **OBRIGATÓRIAS**:

```bash
# SUPABASE (OBRIGATÓRIO)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SERVIDOR (OBRIGATÓRIO)
NODE_ENV=production
JWT_SECRET=seu_jwt_secret_super_seguro_de_pelo_menos_32_caracteres

# FRONTEND (OBRIGATÓRIO)
FRONTEND_URL=http://192.168.0.13:8080
```

**⚠️ IMPORTANTE:** Marque todas as opções:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 2. Fazer Novo Deploy

Após configurar as variáveis:

```bash
# No terminal do backend
vercel --prod
```

### 3. Testar a API

Após o deploy, teste:

```bash
# Teste básico
curl https://back-end-rosia.vercel.app/health

# Teste CORS
curl -X OPTIONS https://back-end-rosia.vercel.app/admin/products \
  -H "Origin: http://192.168.0.13:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"
```

### 4. Alternativa: Usar Servidor Local

Se o problema persistir no Vercel, use o servidor local:

**No Frontend:**
```typescript
// Configuração temporária para desenvolvimento
const API_BASE_URL = 'http://localhost:3001';
```

**No Backend:**
```bash
# Manter servidor local rodando
node server.js
```

## 🔧 Configuração de CORS Atual

O backend já está configurado para aceitar:
- `http://192.168.0.13:8080`
- `http://localhost:3000`
- `http://localhost:8080`
- `http://127.0.0.1:8080`

## 📋 Checklist de Resolução

- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Fazer novo deploy
- [ ] Testar endpoint `/health`
- [ ] Testar CORS com OPTIONS
- [ ] Atualizar URL no frontend
- [ ] Testar criação de produto

## 🆘 Se Nada Funcionar

**Opção 1: Servidor Local**
- Use `http://localhost:3001` no frontend
- Mantenha o servidor local rodando

**Opção 2: Domínio Personalizado**
- Configure um domínio personalizado no Vercel
- Evita problemas de autenticação

**Opção 3: Verificar Logs**
```bash
vercel logs --follow
```

---

**🎯 Próximo Passo:** Configure as variáveis de ambiente no Vercel e faça um novo deploy!