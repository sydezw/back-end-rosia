# Rosita Floral Elegance - Backend API

Backend completo para a loja online Rosita Floral Elegance, desenvolvido em Node.js com Express e integrado ao Supabase.

## 🚀 Tecnologias

- **Node.js** + **Express** - Framework web
- **Supabase** - Banco de dados PostgreSQL e autenticação
- **JWT** - Autenticação de usuários
- **Axios** - Cliente HTTP para APIs externas
- **Helmet** - Segurança HTTP
- **CORS** - Controle de acesso entre origens
- **Rate Limiting** - Proteção contra spam

## 🚀 Funcionalidades Implementadas

- ✅ **Autenticação completa** (registro, login, logout, social login)
- ✅ **Gestão de produtos** (listagem, detalhes, busca)
- ✅ **Carrinho e checkout** (adicionar itens, calcular totais)
- ✅ **Sistema de pedidos** (criar, listar, acompanhar)
- ✅ **Cálculo de frete** (integração com APIs de entrega)
- ✅ **Webhook de pagamentos** (confirmação automática)
- ✅ **Upload de imagens** (Supabase Storage, otimização automática)
- ✅ **Área administrativa** (CRUD completo de produtos com imagens)
- ✅ **Middleware de segurança** (CORS, rate limiting, helmet)
- ✅ **Tratamento de erros** (logs detalhados, respostas padronizadas)

## 📁 Estrutura do Projeto

```
back end da rosia/
├── config/
│   └── supabase.js          # Configuração do Supabase
├── middleware/
│   ├── auth.js              # Middleware de autenticação JWT
│   └── errorHandler.js      # Tratamento global de erros
├── routes/
│   ├── products.js          # Rotas de produtos
│   ├── orders.js            # Rotas de pedidos
│   ├── checkout.js          # Rotas de checkout
│   ├── shipping.js          # Rotas de frete
│   └── webhook.js           # Webhooks de pagamento
├── database/
│   └── schema.sql           # Estrutura das tabelas
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── server.js                # Servidor principal
└── README.md                # Este arquivo
```

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# Configurações do servidor
PORT=3001
NODE_ENV=development

# URL do frontend (para CORS)
FRONTEND_URL=https://rosita-floral-elegance.vercel.app

# Outros
JWT_SECRET=seu_jwt_secret_aqui
PAYMENT_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

### 3. Configurar Banco de Dados

1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o script `database/schema.sql` para criar as tabelas

### 4. Executar o Servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor estará rodando em `http://localhost:3001`

## 📚 API Endpoints

### Produtos

- `GET /products` - Lista todos os produtos
- `GET /products/:id` - Detalhes de um produto
- `GET /products/meta/categories` - Lista categorias disponíveis

### Checkout (Autenticado)

- `POST /checkout/create` - Cria um novo pedido
- `POST /checkout/validate` - Valida carrinho antes do checkout

### Pedidos (Autenticado)

- `GET /orders` - Lista pedidos do usuário
- `GET /orders/:id` - Detalhes de um pedido
- `PUT /orders/:id/cancel` - Cancela um pedido
- `GET /orders/status/summary` - Resumo de pedidos por status

### Frete

- `POST /shipping/calculate` - Calcula frete por CEP
- `GET /shipping/methods` - Lista métodos de envio
- `GET /shipping/zones` - Lista zonas de entrega

### Webhooks

- `POST /webhook/payment` - Recebe confirmações de pagamento
- `POST /webhook/shipping` - Recebe atualizações de envio

### Utilitários

- `GET /health` - Status do servidor

## 🔐 Autenticação

A API usa JWT do Supabase para autenticação. Para acessar rotas protegidas, inclua o token no header:

```
Authorization: Bearer seu_jwt_token_aqui
```

## 📦 Estrutura de Dados

### Produto
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "price": "number",
  "stock": "number",
  "category": "string",
  "image_url": "string",
  "active": "boolean"
}
```

### Pedido
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "string",
      "product_price": "number",
      "quantity": "number",
      "total": "number"
    }
  ],
  "subtotal": "number",
  "shipping_cost": "number",
  "total": "number",
  "status": "string",
  "payment_method": "string",
  "shipping_address": {
    "logradouro": "string",
    "numero": "string",
    "cep": "string",
    "cidade": "string",
    "estado": "string"
  }
}
```

## 🛡️ Segurança

- **Rate Limiting**: 100 requests por 15 minutos por IP
- **CORS**: Configurado para aceitar apenas o domínio do frontend
- **Helmet**: Headers de segurança HTTP
- **JWT Validation**: Todas as rotas protegidas validam tokens
- **Input Validation**: Validação de dados de entrada
- **SQL Injection Protection**: Uso de queries parametrizadas

## 💳 Integração com Pagamentos

O sistema está preparado para integração com gateways de pagamento:

- **Stripe**
- **Mercado Pago**
- **Pagar.me**
- **PagSeguro**

Os webhooks são configurados para receber confirmações de pagamento automaticamente.

## 🚚 Cálculo de Frete

O sistema calcula frete baseado em:

- **CEP de destino** (integração com ViaCEP)
- **Peso dos produtos**
- **Volume da encomenda**
- **Região de entrega**
- **Método de envio**

**Frete grátis** para pedidos acima de R$ 100,00.

## 🌐 Deploy

### Railway

1. Conecte seu repositório ao Railway
2. Configure as variáveis de ambiente
3. Deploy automático

### Render

1. Conecte seu repositório ao Render
2. Configure as variáveis de ambiente
3. Deploy automático

### Vercel

1. Instale a CLI do Vercel: `npm i -g vercel`
2. Execute: `vercel`
3. Configure as variáveis de ambiente no painel

## 🧪 Testando a API

### Health Check
```bash
curl http://localhost:3001/health
```

### Listar Produtos
```bash
curl http://localhost:3001/products
```

### Criar Pedido (com autenticação)
```bash
curl -X POST http://localhost:3001/checkout/create \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "uuid-do-produto",
        "quantity": 2
      }
    ],
    "shipping_address": {
      "logradouro": "Rua das Flores",
      "numero": "123",
      "cep": "01234567",
      "cidade": "São Paulo",
      "estado": "SP"
    }
  }'
```

## 🐛 Tratamento de Erros

Todos os erros são tratados de forma consistente:

```json
{
  "error": "Mensagem do erro",
  "code": "CODIGO_DO_ERRO",
  "details": "Detalhes adicionais (apenas em desenvolvimento)"
}
```

## 📝 Logs

O sistema registra:
- Erros de aplicação
- Webhooks recebidos
- Atualizações de pedidos
- Tentativas de autenticação

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ para Rosita Floral Elegance**