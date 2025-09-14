# 💳 Checkout Transparente - Mercado Pago

## 📋 Visão Geral

O Checkout Transparente permite que o pagamento seja processado diretamente no seu site, sem redirecionamento para o Mercado Pago. O usuário insere os dados do cartão na sua página e você processa o pagamento via API.

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-2173611905676529-082521-264dca32044a71bed9a94c083701ea0c-2640555101
MP_CLIENT_ID=2173611905676529
MP_CLIENT_SECRET=seu_client_secret_aqui
MP_PUBLIC_KEY=APP_USR-11736dab-6ce6-4bf1-98f7-60e8a595fa34
```

### Dependências

```bash
npm install mercadopago
```

## 🚀 Endpoints da API

### 1. Obter Configurações Públicas

```http
GET /payment/config
```

**Resposta:**
```json
{
  "public_key": "APP_USR-11736dab-6ce6-4bf1-98f7-60e8a595fa34",
  "configured": true
}
```

### 2. Criar Token do Cartão

```http
POST /payment/card-token
Content-Type: application/json
```

**Body:**
```json
{
  "card_number": "4111111111111111",
  "expiration_month": "12",
  "expiration_year": "2025",
  "security_code": "123",
  "cardholder_name": "João Silva",
  "cardholder_document_type": "CPF",
  "cardholder_document_number": "12345678901"
}
```

**Resposta:**
```json
{
  "token": "ff8080814c11e237014c1ff593b57b4d",
  "status": "active",
  "first_six_digits": "411111",
  "last_four_digits": "1111",
  "expiration_month": 12,
  "expiration_year": 2025,
  "cardholder_name": "João Silva"
}
```

### 3. Processar Pagamento

```http
POST /payment/card
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "token": "ff8080814c11e237014c1ff593b57b4d",
  "transaction_amount": 100.50,
  "installments": 1,
  "payment_method_id": "visa",
  "issuer_id": "25",
  "order_id": "uuid-do-pedido",
  "payer": {
    "email": "cliente@email.com",
    "identification": {
      "type": "CPF",
      "number": "12345678901"
    },
    "first_name": "João",
    "last_name": "Silva"
  },
  "billing_address": {
    "zip_code": "01234567",
    "street_name": "Rua das Flores",
    "street_number": "123"
  }
}
```

**Resposta (Aprovado):**
```json
{
  "payment_id": "1234567890",
  "status": "approved",
  "status_detail": "accredited",
  "order_id": "uuid-do-pedido",
  "transaction_amount": 100.50,
  "installments": 1,
  "message": "Pagamento aprovado com sucesso!"
}
```

**Resposta (Rejeitado):**
```json
{
  "payment_id": "1234567890",
  "status": "rejected",
  "status_detail": "cc_rejected_insufficient_amount",
  "order_id": "uuid-do-pedido",
  "transaction_amount": 100.50,
  "installments": 1,
  "message": "Pagamento rejeitado.",
  "rejection_reason": "cc_rejected_insufficient_amount"
}
```

### 4. Consultar Status do Pagamento

```http
GET /payment/{payment_id}
Authorization: Bearer {jwt_token}
```

**Resposta:**
```json
{
  "payment_id": "1234567890",
  "status": "approved",
  "status_detail": "accredited",
  "order_id": "uuid-do-pedido",
  "transaction_amount": 100.50,
  "installments": 1,
  "payment_method_id": "visa",
  "date_created": "2024-01-15T10:30:00.000Z",
  "date_approved": "2024-01-15T10:30:05.000Z"
}
```

### 5. Métodos de Pagamento

```http
GET /payment/methods
```

**Resposta:**
```json
{
  "payment_methods": [
    { "id": "visa", "name": "Visa", "type": "credit_card" },
    { "id": "master", "name": "Mastercard", "type": "credit_card" },
    { "id": "amex", "name": "American Express", "type": "credit_card" },
    { "id": "elo", "name": "Elo", "type": "credit_card" },
    { "id": "hipercard", "name": "Hipercard", "type": "credit_card" }
  ],
  "public_key": "APP_USR-11736dab-6ce6-4bf1-98f7-60e8a595fa34"
}
```

## 🔄 Webhooks

O sistema processa automaticamente os webhooks do Mercado Pago:

### URL do Webhook
```
https://seu-dominio.vercel.app/webhook/payment
```

### Eventos Processados

- **payment.created** - Pagamento criado
- **payment.updated** - Status do pagamento atualizado
- **payment.approved** - Pagamento aprovado
- **payment.rejected** - Pagamento rejeitado
- **payment.cancelled** - Pagamento cancelado
- **payment.refunded** - Pagamento reembolsado

### Configuração no Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em **Webhooks**
3. Adicione a URL: `https://seu-dominio.vercel.app/webhook/payment`
4. Selecione os eventos: `payment`
5. Configure o secret para validação

## 🔐 Segurança

### PCI Compliance

⚠️ **IMPORTANTE**: Ao usar Checkout Transparente, você precisa estar em conformidade com PCI DSS.

**Medidas de Segurança Implementadas:**

1. **Tokenização**: Dados do cartão são tokenizados antes do envio
2. **HTTPS**: Todas as comunicações são criptografadas
3. **Validação de Webhook**: Assinatura verificada automaticamente
4. **Não Armazenamento**: Dados sensíveis não são armazenados no servidor

### Validações

- Verificação de propriedade do pedido
- Validação de valor do pagamento
- Verificação de status do pedido
- Autenticação JWT obrigatória

## 🎯 Fluxo de Pagamento

### 1. Frontend (Coleta de Dados)

```javascript
// 1. Obter chave pública
const config = await fetch('/payment/config').then(r => r.json());

// 2. Criar token do cartão
const tokenData = {
  card_number: '4111111111111111',
  expiration_month: '12',
  expiration_year: '2025',
  security_code: '123',
  cardholder_name: 'João Silva',
  cardholder_document_number: '12345678901'
};

const tokenResponse = await fetch('/payment/card-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tokenData)
});

const { token } = await tokenResponse.json();
```

### 2. Backend (Processamento)

```javascript
// 3. Processar pagamento
const paymentData = {
  token,
  transaction_amount: 100.50,
  installments: 1,
  payment_method_id: 'visa',
  order_id: 'uuid-do-pedido',
  payer: {
    email: 'cliente@email.com',
    identification: { type: 'CPF', number: '12345678901' },
    first_name: 'João',
    last_name: 'Silva'
  }
};

const paymentResponse = await fetch('/payment/card', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(paymentData)
});
```

### 3. Webhook (Confirmação)

```javascript
// 4. Webhook automático atualiza status
// O sistema processa automaticamente:
// - Pagamentos aprovados → status: 'pago'
// - Pagamentos rejeitados → restaura estoque
// - Reembolsos → status: 'reembolsado'
```

## 📊 Status de Pagamento

| Status MP | Status Pedido | Descrição |
|-----------|---------------|----------|
| `pending` | `pendente` | Aguardando processamento |
| `approved` | `pago` | Pagamento aprovado |
| `rejected` | `pagamento_rejeitado` | Pagamento rejeitado |
| `cancelled` | `cancelado` | Pagamento cancelado |
| `refunded` | `reembolsado` | Pagamento reembolsado |
| `in_process` | `processando` | Em processamento |

## 🧪 Testes

### Cartões de Teste

```javascript
// Visa - Aprovado
card_number: '4111111111111111'
security_code: '123'

// Mastercard - Rejeitado
card_number: '5555555555554444'
security_code: '123'

// American Express - Pendente
card_number: '378282246310005'
security_code: '1234'
```

### Ambiente de Teste

```env
# Use credenciais de teste
MP_ACCESS_TOKEN=TEST-2173611905676529-082521-264dca32044a71bed9a94c083701ea0c-2640555101
MP_PUBLIC_KEY=TEST-11736dab-6ce6-4bf1-98f7-60e8a595fa34
```

## 🚨 Tratamento de Erros

### Erros Comuns

```json
// Token inválido
{
  "error": "Erro nos dados do cartão",
  "code": "invalid_card_data",
  "description": "Card number is invalid"
}

// Pagamento rejeitado
{
  "error": "Erro no processamento do pagamento",
  "code": "cc_rejected_insufficient_amount",
  "description": "Insufficient amount in card"
}

// Pedido não encontrado
{
  "error": "Pedido não encontrado",
  "code": "ORDER_NOT_FOUND"
}
```

## 📱 Integração Frontend

### React Hook Exemplo

```javascript
import { useState } from 'react';
import { api } from './api';

export function useMercadoPago() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCardToken = async (cardData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/payment/card-token', cardData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar token');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/payment/card', paymentData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar pagamento');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = async (paymentId) => {
    try {
      const response = await api.get(`/payment/${paymentId}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao consultar pagamento');
      throw err;
    }
  };

  return {
    createCardToken,
    processPayment,
    getPaymentStatus,
    loading,
    error
  };
}
```

## 🔗 Links Úteis

- [Documentação Oficial MP](https://www.mercadopago.com.br/developers/pt/docs)
- [SDK Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/testing)
- [PCI Compliance](https://www.mercadopago.com.br/developers/pt/docs/security/pci-compliance)

---

**✅ Checkout Transparente Mercado Pago implementado com sucesso!**

🔐 **Seguro** | 🚀 **Rápido** | 💳 **Flexível**