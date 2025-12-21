# Guia Frontend: Enviar pagamento para `/api/payments/mp/orders/card`

Este guia explica como o frontend deve enviar corretamente o payload para o endpoint de cartão do Mercado Pago Bricks no backend, evitando o problema de `body: undefined` observado no log do servidor.

## Problema observado

- Log do servidor mostrou `body: undefined` no POST:
  - Origin: `https://www.rosia.com.br`
  - Método: `POST`
  - Path: `/api/payments/mp/orders/card`
- Causas comuns:
  - Falta de `Content-Type: application/json`.
  - `fetch` sem `JSON.stringify(...)` no `body`.
  - Uso de `mode: 'no-cors'` (gera requisição opaca e sem corpo visível).
  - Envio com `FormData` sem conversão para JSON quando o backend espera JSON.

## Endpoint no backend

- Rota: `POST /api/payments/mp/orders/card`
- Implementação: `back-end-rosia/routes/payments.js:224`
- Parser JSON habilitado: `back-end-rosia/server.js:113` (`app.use(express.json({ limit: '50mb' }))`)
- Campos obrigatórios:
  - `token` (string)
  - `payment_method_id` (string)
  - `transaction_amount` (number)
  - `installments` (number)
  - `payer.email` (string)
- Campos opcionais suportados:
  - `issuer_id` (string|number)
  - `payer.identification` `{ type, number }`
  - `payer.first_name`, `payer.last_name`
  - `description`, `external_reference`, `statement_descriptor`
  - `binary_mode` (boolean; padrão true)
  - `idempotencyKey` ou `idempotency_key` (string)
  - `additional_info` (objeto)

## Exemplo com `fetch`

```ts
const payload = {
  token: cardToken, // gerado pelo Bricks
  payment_method_id: selectedMethodId, // ex.: 'visa'
  issuer_id: selectedIssuerId, // opcional
  transaction_amount: 58.8,
  installments: 1,
  payer: {
    email: userEmail,
    identification: { type: 'CPF', number: '12345678909' },
    first_name: 'Nome',
    last_name: 'Sobrenome'
  },
  external_reference: 'ORDER-1234',
  statement_descriptor: 'Rosita',
  idempotencyKey: crypto.randomUUID(),
  binary_mode: true
};

const res = await fetch('/api/payments/mp/orders/card', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await res.json();
```

## Exemplo com `axios`

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

const { data } = await api.post('/payments/mp/orders/card', {
  token,
  payment_method_id: 'visa',
  issuer_id: '123',
  transaction_amount: 58.8,
  installments: 1,
  payer: {
    email: 'test@example.com',
    identification: { type: 'CPF', number: '12345678909' }
  }
});
```

## Integração com Mercado Pago Bricks (CardPayment)

```ts
import { initMercadoPago } from '@mercadopago/sdk-js';

initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });

const bricksBuilder = window.mercadopago.bricks();

const settings = {
  initialization: {
    amount: 58.8
  },
  callbacks: {
    onSubmit: async ({ formData }) => {
      // formData contém: token, paymentMethodId, issuerId, installments, etc.
      const payload = {
        token: formData.token,
        payment_method_id: formData.paymentMethodId,
        issuer_id: formData.issuerId,
        transaction_amount: formData.transactionAmount,
        installments: formData.installments,
        payer: {
          email: formData.payer.email,
          identification: formData.payer.identification,
          first_name: formData.payer.firstName,
          last_name: formData.payer.lastName
        },
        external_reference: 'ORDER-1234',
        idempotencyKey: crypto.randomUUID(),
        binary_mode: true
      };

      const res = await fetch('/api/payments/mp/orders/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data; // tratar status: approved/pending/rejected
    },
    onError: (error) => {
      console.error(error);
    }
  }
};

await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', settings);
```

## Checklist para evitar `body: undefined`

- Enviar `headers: { 'Content-Type': 'application/json' }`.
- Usar `body: JSON.stringify(payload)` no `fetch`.
- Não usar `mode: 'no-cors'`.
- Garantir que não está enviando `FormData` quando o backend espera JSON.
- Verificar que o payload contém os campos obrigatórios.
- Acessar a rota certa: `/api/payments/mp/orders/card`.

## Resposta esperada

- Sucesso (mock sem `MP_ACCESS_TOKEN`):
  ```json
  {
    "success": true,
    "mock": true,
    "payment": { "id": "mp_mock_...", "status": "approved", "transaction_amount": 58.8 }
  }
  ```
- Sucesso (produção):
  ```json
  { "status": "success", "payment": { "id": "...", "status": "approved" } }
  ```
- Erro de validação:
  ```json
  { "error": "payment_method_id é obrigatório" }
  ```

## Referências de código

- Endpoint: `back-end-rosia/routes/payments.js:224`
- Ajustes Bricks e idempotência: `back-end-rosia/routes/payments.js:271`
- Parser JSON global: `back-end-rosia/server.js:113`