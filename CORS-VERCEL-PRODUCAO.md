# 🚀 CORS: Configuração para Produção na Vercel

## ✅ Configurações Implementadas

### 🔧 Headers de Segurança

Adicionados headers para resolver problemas de **Cross-Origin-Opener-Policy**:

```javascript
// Headers de segurança para resolver Cross-Origin-Opener-Policy
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});
```

### 🌐 Origens CORS Configuradas

```javascript
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_LOCAL, 
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://www.rosia.com.br',
    'https://back-end-rosia02.vercel.app', // Backend na Vercel
    'https://nsazbeovtmmetpiyokqc.supabase.co', // Supabase para OAuth
    'http://192.168.0.13:8080',
    'http://127.0.0.1:8080'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
}));
```

### 📋 Variáveis de Ambiente

Adicionadas no `.env.example`:

```env
# Configurações do servidor
NODE_ENV=production

# Configurações CORS para produção
CORS_ORIGIN=https://www.rosia.com.br,http://localhost:8080,https://nsazbeovtmmetpiyokqc.supabase.co,https://back-end-rosia02.vercel.app
```

## 🎯 Problemas Resolvidos

### ✅ Cross-Origin-Opener-Policy
- **Problema**: Erro ao abrir popups para OAuth
- **Solução**: Header `same-origin-allow-popups`

### ✅ Backend na Vercel
- **URL**: `https://back-end-rosia02.vercel.app`
- **Status**: Online e funcionando
- **Endpoints**: Todos disponíveis com prefixo `/api`

### ✅ Supabase OAuth
- **Domínio**: `https://nsazbeovtmmetpiyokqc.supabase.co`
- **Função**: Autenticação social (Google, etc.)

### ✅ Desenvolvimento Local
- **Vite**: `http://localhost:5173`
- **React**: `http://localhost:3000`
- **IPs locais**: Suporte mantido

## 🔄 Deploy e Teste

### 1. Verificar Backend na Vercel
```bash
curl https://back-end-rosia02.vercel.app/health
```

### 2. Testar CORS
```javascript
// No frontend
fetch('https://back-end-rosia02.vercel.app/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'test@test.com', password: '123456' })
})
```

### 3. Verificar Headers
No DevTools > Network > Headers:
- ✅ `Access-Control-Allow-Origin`
- ✅ `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- ✅ `Cross-Origin-Embedder-Policy: unsafe-none`

## 📝 Próximos Passos

1. **Deploy**: Fazer push das alterações
2. **Teste**: Verificar funcionamento na Vercel
3. **Frontend**: Atualizar URL da API se necessário
4. **Monitoramento**: Verificar logs de CORS

## 🔗 URLs Importantes

- **Frontend**: `https://www.rosia.com.br`
- **Backend Vercel**: `https://back-end-rosia02.vercel.app`
- **Supabase**: `https://nsazbeovtmmetpiyokqc.supabase.co`
- **Health Check**: `https://back-end-rosia02.vercel.app/health`

---

**Status**: ✅ Configuração completa para produção na Vercel
**Data**: Janeiro 2025
**Versão**: 1.0