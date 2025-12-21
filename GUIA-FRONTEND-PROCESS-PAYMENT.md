# Guia Frontend: Enviar pagamento para `/process_payment`

Este guia mostra como integrar o Brick de cartão do Mercado Pago com o backend usando o endpoint `/process_payment`, evitando o problema de `body: undefined` e seguindo os requisitos oficiais (token, transaction_amount, installments, payment_method_id, payer.email e cabeçalho `X-Idempotency-Key`).

## Endpoint

- URL: `/process_payment`
- Método: `POST`
- Conteúdo: `application/json`
- Validações: `token`, `payment_method_id`, `transaction_amount`, `installments`, `payer.email`
- Idempotência: gerar UUID v4 e enviar no cabeçalho `X-Idempotency-Key` (feito pelo backend se não for enviado)

## Exemplo com `fetch`

```ts
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
  description: 'Compra Rosia',
  binary_mode: true
};

const res = await fetch('/process_payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await res.json();
```

## Exemplo com `axios`

```ts
import axios from 'axios';

const api = axios.create({ headers: { 'Content-Type': 'application/json' } });

const { data } = await api.post('/process_payment', {
  token,
  payment_method_id: 'visa',
  issuer_id: '123',
  transaction_amount: 100,
  installments: 1,
  payer: {
    email: 'usuario@exemplo.com',
    identification: { type: 'CPF', number: '12345678909' }
  },
  external_reference: 'ORDER-1234',
  description: 'Compra Rosia'
});
```

## Integração com Brick `CardPayment`

```ts
import { initMercadoPago } from '@mercadopago/sdk-js';

initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' });
const bricksBuilder = window.mercadopago.bricks();

await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
  initialization: { amount: 100 },
  callbacks: {
    onSubmit: async ({ formData }) => {
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
        description: 'Compra Rosia',
        binary_mode: true
      };

      const res = await fetch('/process_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    }
  }
});
```

## Checklist para evitar `body: undefined`

- Definir `headers: { 'Content-Type': 'application/json' }`.
- Enviar `body: JSON.stringify(payload)`.
- Não usar `mode: 'no-cors'`.
- Garantir campos obrigatórios.
- Usar `/process_payment` exatamente.

## Respostas

- Sucesso: objeto do pagamento com `status`, `status_detail`, `id`.
- Erro de validação: JSON com `error` descritivo.
- Mock em dev sem `MP_ACCESS_TOKEN`: resposta simulada com `success: true` e `status: 'approved'`.

## Referências de código

- Rota: `back-end-rosia/routes/payments.js:224` removida para o fluxo antigo.
- Nova rota: `back-end-rosia/routes/payments.js:...` (`/process_payment`).
- Mapeamento público: `back-end-rosia/server.js:...` (`app.post('/process_payment', ...)`).
- SDK: `back-end-rosia/config/mercadopago.js:70` (envio com idempotência por requisição).