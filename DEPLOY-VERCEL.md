# 🚀 Deploy do Backend no Vercel

Guia completo para fazer deploy do backend da Rosita Floral Elegance no Vercel.

## 📋 Pré-requisitos

- ✅ Conta no [Vercel](https://vercel.com)
- ✅ Conta no [GitHub](https://github.com) (recomendado)
- ✅ Projeto backend funcionando localmente
- ✅ Configurações do Supabase prontas

## 🔧 Preparação do Projeto

### 1. Verificar Arquivos Necessários

Certifique-se de que você tem:

- ✅ `vercel.json` - Configuração do Vercel
- ✅ `package.json` - Dependências e scripts
- ✅ `.env.example` - Exemplo de variáveis de ambiente
- ✅ `server.js` - Arquivo principal do servidor

### 2. Estrutura de Rotas

O projeto já está configurado com as rotas obrigatórias:

| Rota | Método | Função |
|------|--------|--------|
| `/api/auth/login` | POST | Login normal |
| `/api/auth/register` | POST | Registrar novo usuário |
| `/api/auth/login/google` | POST | Login social via Google |
| `/api/auth/login/facebook` | POST | Login social via Facebook |
| `/api/products` | GET | Listar produtos |
| `/api/checkout/create` | POST | Criar pedido |
| `/api/orders` | GET | Listar pedidos |
| `/api/shipping/calculate` | POST | Calcular frete |

## 🌐 Deploy no Vercel

### Opção 1: Deploy via GitHub (Recomendado)

#### 1. Criar Repositório no GitHub

```bash
# No terminal, dentro da pasta do projeto
git init
git add .
git commit -m "Initial commit - Backend Rosita Floral Elegance"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/rosita-backend.git
git push -u origin main
```

#### 2. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Conecte sua conta do GitHub
4. Selecione o repositório `rosita-backend`
5. Configure as variáveis de ambiente (veja seção abaixo)
6. Clique em **"Deploy"**

### Opção 2: Deploy via CLI do Vercel

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Fazer Login

```bash
vercel login
```

#### 3. Deploy

```bash
# No terminal, dentro da pasta do projeto
vercel
```

## 🔐 Configurar Variáveis de Ambiente

No painel do Vercel, vá em **Settings > Environment Variables** e adicione:

### Variáveis Obrigatórias

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Servidor
PORT=3001
NODE_ENV=production
JWT_SECRET=seu_jwt_secret_super_seguro_aqui

# Frontend
FRONTEND_URL=https://rosita-floral-elegance.vercel.app

# APIs Externas
FRETE_API_URL=https://api.frete.com
FRETE_API_KEY=sua_chave_api_frete

# Webhooks
PAYMENT_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

### Como Obter as Chaves do Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Vá para seu projeto
3. Clique em **Settings > API**
4. Copie:
   - **URL**: Project URL
   - **ANON KEY**: anon public
   - **SERVICE ROLE KEY**: service_role (⚠️ Mantenha secreta!)

## 🔄 Atualizar Frontend

Após o deploy, atualize a URL no seu frontend:

### 1. Obter URL do Deploy

Após o deploy, o Vercel fornecerá uma URL como:
```
https://rosita-backend-abc123.vercel.app
```

### 2. Atualizar api.ts/api.js

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rosita-backend-abc123.vercel.app/api', // ← Sua URL aqui
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
```

### 3. Configurar Domínio Personalizado (Opcional)

No Vercel:
1. Vá em **Settings > Domains**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções
4. Atualize a URL no frontend

## ✅ Testar o Deploy

### 1. Verificar Health Check

```bash
curl https://sua-url.vercel.app/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2024-01-25T10:30:00.000Z",
  "environment": "production"
}
```

### 2. Testar Autenticação

```bash
curl -X POST https://sua-url.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste",
    "email": "teste@email.com",
    "password": "123456"
  }'
```

### 3. Testar no Frontend

Use o componente `AuthExample.tsx` para testar:
- ✅ Login normal
- ✅ Registro de usuário
- ✅ Login social (se configurado)

## 🔧 Configurações Avançadas

### 1. Configurar CORS para Produção

O CORS já está configurado para aceitar requisições do frontend. Se precisar adicionar mais domínios:

```javascript
// server.js
const corsOptions = {
  origin: [
    'https://rosita-floral-elegance.vercel.app',
    'https://seu-dominio-personalizado.com',
    'http://localhost:3000' // Para desenvolvimento
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

### 2. Configurar Logs

O Vercel automaticamente captura logs. Para visualizar:
1. Vá para o projeto no Vercel
2. Clique em **Functions**
3. Selecione uma função
4. Veja os logs em tempo real

### 3. Monitoramento

Configure alertas no Vercel:
1. Vá em **Settings > Integrations**
2. Adicione integrações como Slack ou Discord
3. Configure alertas para erros

## 🚨 Solução de Problemas

### Erro: "Function Timeout"
```json
{
  "error": "Function execution timed out"
}
```
**Solução:** Aumente o timeout no `vercel.json`:
```json
{
  "functions": {
    "server.js": {
      "maxDuration": 60
    }
  }
}
```

### Erro: "Environment Variable Not Found"
```
Error: SUPABASE_URL is not defined
```
**Solução:** Verifique se todas as variáveis estão configuradas no Vercel.

### Erro de CORS
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solução:** Adicione a URL do frontend no CORS do backend.

### Erro: "Module Not Found"
```
Error: Cannot find module 'express'
```
**Solução:** Verifique se todas as dependências estão no `package.json`.

## 📝 Checklist Final

- [ ] ✅ Projeto deployado no Vercel
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Health check funcionando
- [ ] ✅ Frontend atualizado com nova URL
- [ ] ✅ Autenticação testada
- [ ] ✅ CORS configurado
- [ ] ✅ Logs funcionando
- [ ] ✅ Domínio personalizado (opcional)

## 🎉 Próximos Passos

1. **Configurar CI/CD**: Deploy automático a cada push
2. **Monitoramento**: Configurar alertas e métricas
3. **Backup**: Configurar backup do banco Supabase
4. **SSL**: Verificar certificados SSL
5. **Performance**: Otimizar queries e cache

---

**🌹 Rosita Floral Elegance - Backend em Produção!**

Seu backend está agora rodando em produção no Vercel. Todas as rotas de autenticação, produtos, checkout e frete estão disponíveis para o frontend consumir.