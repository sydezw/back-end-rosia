# 🚀 Checklist de Deploy - Backend ROSIA

## ✅ Pré-Deploy - Verificações

### 🔐 Variáveis de Ambiente Configuradas

- [x] **SUPABASE_URL**: URL do projeto Supabase
- [x] **SUPABASE_ANON_KEY**: Chave pública para autenticação no frontend
- [x] **SUPABASE_SERVICE_ROLE_KEY**: Chave com permissões elevadas (backend)
- [x] **FRONTEND_URL**: `https://www.rosia.com.br`
- [x] **JWT_SECRET**: Chave secreta para tokens JWT
- [x] **NODE_ENV**: `production`
- [x] **PORT**: `3001`

### 💳 Mercado Pago

- [x] **MP_ACCESS_TOKEN_APP1**: Token de acesso da aplicação 1
- [x] **MP_ACCESS_TOKEN_APP2**: Token de acesso da aplicação 2
- [x] **MP_CLIENT_ID**: ID da aplicação Mercado Pago
- [x] **MP_CLIENT_SECRET**: Chave secreta do Mercado Pago
- [x] **MP_PUBLIC_KEY**: Chave pública do Mercado Pago
- [x] **PAYMENT_WEBHOOK_SECRET**: `200a75358097c58c82b46c97478c7439c728e0caeca468f8829beb0718f30935`

### 🔑 OAuth Google

- [x] **GOOGLE_CLIENT_ID**: ID da aplicação Google para login OAuth
- [x] **GOOGLE_CLIENT_SECRET**: Chave secreta do Google OAuth
- [x] **Callback URL**: `https://nsazbeovtmmetpiyokqc.supabase.co/auth/v1/callback`

### 📦 API dos Correios

- [x] **token_jwt**: JWT ativo com escopos amplos para:
  - Leitura e escrita
  - Rastreio de encomendas
  - Gerenciamento de fretes
  - Produtos e pedidos

## 🛠️ Configurações do Vercel

### 1. Variáveis de Ambiente no Vercel

```env
# ===== SUPABASE =====
SUPABASE_URL=https://nsazbeovtmmetpiyokqc.supabase.co
SUPABASE_ANON_KEY=[VALOR_REAL]
SUPABASE_SERVICE_ROLE_KEY=[VALOR_REAL]

# ===== SERVIDOR =====
PORT=3001
NODE_ENV=production
JWT_SECRET=[VALOR_REAL_32_CHARS]

# ===== FRONTEND =====
FRONTEND_URL=https://www.rosia.com.br

# ===== WEBHOOKS =====
PAYMENT_WEBHOOK_SECRET=200a75358097c58c82b46c97478c7439c728e0caeca468f8829beb0718f30935

# ===== MERCADO PAGO =====
MP_ACCESS_TOKEN=[VALOR_REAL_APP1]
MP_CLIENT_ID=[VALOR_REAL]
MP_CLIENT_SECRET=[VALOR_REAL]
MP_PUBLIC_KEY=[VALOR_REAL]

# ===== OAUTH =====
GOOGLE_CLIENT_ID=[VALOR_REAL]
GOOGLE_CLIENT_SECRET=[VALOR_REAL]

# ===== CORREIOS =====
FRETE_API_URL=https://api.correios.com.br
FRETE_API_KEY=[TOKEN_JWT_CORREIOS]
```

### 2. Configurações do Projeto

- **Framework Preset**: `Other`
- **Build Command**: `npm run build` (se necessário)
- **Output Directory**: `.` (raiz)
- **Install Command**: `npm install`
- **Development Command**: `npm start`

### 3. Domínio e DNS

- **Domínio Principal**: A ser definido
- **Subdomínio Sugerido**: `api.rosia.com.br`
- **SSL**: Automático via Vercel

## 🔗 URLs de Produção

### Backend Endpoints

```
Base URL: https://[seu-projeto].vercel.app

# Autenticação
POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout
GET  /auth/me

# Produtos
GET    /products
GET    /products/:id
POST   /products (admin)
PUT    /products/:id (admin)
DELETE /products/:id (admin)

# Pedidos
GET  /orders
POST /orders
GET  /orders/:id
PUT  /orders/:id

# Pagamentos (Mercado Pago)
POST /payment/card-token
POST /payment/card
GET  /payment/:id
GET  /payment/methods
GET  /payment/config

# Webhooks
POST /webhook/payment

# Frete
POST /shipping/calculate
GET  /shipping/track/:code

# Upload
POST /upload/image
DELETE /upload/image/:filename

# Admin
GET    /admin/dashboard
GET    /admin/orders
GET    /admin/products
POST   /admin/products
PUT    /admin/products/:id
DELETE /admin/products/:id

# Health Check
GET /health
```

## 🧪 Testes Pós-Deploy

### 1. Health Check

```bash
curl https://[seu-projeto].vercel.app/health
```

**Resposta Esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 2. CORS Test

```javascript
// No console do https://www.rosia.com.br
fetch('https://[seu-projeto].vercel.app/health')
  .then(r => r.json())
  .then(console.log)
```

### 3. Autenticação

```bash
# Teste de registro
curl -X POST https://[seu-projeto].vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@rosia.com.br","password":"123456","name":"Teste"}'
```

### 4. Mercado Pago

```bash
# Teste de configuração
curl https://[seu-projeto].vercel.app/payment/config
```

**Resposta Esperada:**
```json
{
  "public_key": "APP_USR-...",
  "configured": true
}
```

### 5. Webhook

```bash
# Teste de webhook (simulação)
curl -X POST https://[seu-projeto].vercel.app/webhook/payment \
  -H "Content-Type: application/json" \
  -H "X-Signature: test" \
  -d '{"type":"payment","data":{"id":"123"}}'
```

## 🔧 Configurações Externas

### Mercado Pago Dashboard

1. **Webhook URL**: `https://[seu-projeto].vercel.app/webhook/payment`
2. **Eventos**: `payment.created`, `payment.updated`
3. **Secret**: `200a75358097c58c82b46c97478c7439c728e0caeca468f8829beb0718f30935`

### Google OAuth Console

1. **Authorized Origins**: `https://www.rosia.com.br`
2. **Redirect URIs**: `https://nsazbeovtmmetpiyokqc.supabase.co/auth/v1/callback`

### Supabase Dashboard

1. **Site URL**: `https://www.rosia.com.br`
2. **Redirect URLs**: `https://www.rosia.com.br/**`
3. **CORS Origins**: `https://www.rosia.com.br`

## 📊 Monitoramento

### Logs do Vercel

- Acesse: `https://vercel.com/dashboard/[projeto]/functions`
- Monitore erros em tempo real
- Configure alertas para falhas

### Métricas Importantes

- **Response Time**: < 500ms
- **Error Rate**: < 1%
- **Uptime**: > 99.9%
- **Memory Usage**: < 512MB

## 🚨 Troubleshooting

### Problemas Comuns

1. **CORS Error**
   - Verificar `FRONTEND_URL` no Vercel
   - Confirmar configuração no `server.js`

2. **Supabase Connection**
   - Validar `SUPABASE_URL` e chaves
   - Verificar configurações de rede

3. **Mercado Pago Webhook**
   - Confirmar `PAYMENT_WEBHOOK_SECRET`
   - Verificar URL no dashboard MP

4. **OAuth Google**
   - Validar `GOOGLE_CLIENT_ID`
   - Confirmar redirect URLs

### Comandos de Debug

```bash
# Verificar variáveis de ambiente
vercel env ls

# Ver logs em tempo real
vercel logs [deployment-url] --follow

# Redeploy forçado
vercel --force
```

## ✅ Checklist Final

- [ ] Todas as variáveis de ambiente configuradas no Vercel
- [ ] Deploy executado com sucesso
- [ ] Health check respondendo OK
- [ ] CORS funcionando com frontend
- [ ] Autenticação Supabase operacional
- [ ] Mercado Pago configurado e testado
- [ ] Webhooks recebendo notificações
- [ ] OAuth Google funcionando
- [ ] API dos Correios respondendo
- [ ] Logs sem erros críticos
- [ ] Monitoramento configurado

---

## 🎯 Próximos Passos

1. **Configurar domínio personalizado** (api.rosia.com.br)
2. **Implementar cache Redis** (se necessário)
3. **Configurar backup automático**
4. **Implementar rate limiting avançado**
5. **Configurar alertas de monitoramento**

**🚀 Backend ROSIA pronto para produção!**

