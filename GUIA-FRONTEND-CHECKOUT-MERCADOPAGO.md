# 🛒 Guia Frontend - Checkout e Mercado Pago

## 📋 Visão Geral

Este guia explica como integrar o frontend com a API do backend para implementar o sistema completo de checkout e pagamentos via Mercado Pago.

## 🔗 URLs da API

**Produção:** `https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app`
**Local:** `http://localhost:3001`

## 🛍️ Fluxo Completo de Checkout

### 1. Criar Pedido (Checkout)

**Endpoint:** `POST /checkout/create`
**Autenticação:** Bearer Token (JWT)

```typescript
interface CheckoutItem {
  product_id: string;
  quantity: number;
}

interface ShippingAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  shipping_address: ShippingAddress;
  payment_method: 'credit_card' | 'pix' | 'boleto';
}

// Exemplo de uso
const createOrder = async (checkoutData: CheckoutRequest) => {
  const response = await fetch(`${API_URL}/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(checkoutData)
  });
  
  return response.json();
};
```

**Resposta de Sucesso:**
```json
{
  "order_id": "uuid-do-pedido",
  "subtotal": 150.00,
  "shipping_cost": 15.00,
  "total": 165.00,
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Produto A",
      "product_price": 75.00,
      "quantity": 2,
      "total": 150.00
    }
  ],
  "shipping_address": {...},
  "status": "pendente",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### 2. Configuração do Mercado Pago

**Endpoint:** `GET /payment/config`

```typescript
const getMercadoPagoConfig = async () => {
  const response = await fetch(`${API_URL}/payment/config`);
  return response.json();
};

// Resposta
{
  "public_key": "APP_USR-11736dab-6ce6-4bf1-98f7-60e8a595fa34",
  "configured": true
}
```

### 3. Criar Token do Cartão

**Endpoint:** `POST /payment/card-token`

```typescript
interface CardData {
  card_number: string;
  expiration_month: string;
  expiration_year: string;
  security_code: string;
  cardholder_name: string;
  cardholder_document_type?: string;
  cardholder_document_number?: string;
}

const createCardToken = async (cardData: CardData) => {
  const response = await fetch(`${API_URL}/payment/card-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cardData)
  });
  
  return response.json();
};
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

### 4. Processar Pagamento

**Endpoint:** `POST /payment/card`
**Autenticação:** Bearer Token (JWT)

```typescript
interface PaymentData {
  token: string;
  transaction_amount: number;
  installments: number;
  payment_method_id: string;
  issuer_id?: string;
  order_id: string;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
    first_name: string;
    last_name: string;
  };
  billing_address?: {
    zip_code: string;
    street_name: string;
    street_number: string;
  };
}

const processPayment = async (paymentData: PaymentData) => {
  const response = await fetch(`${API_URL}/payment/card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(paymentData)
  });
  
  return response.json();
};
```

**Resposta (Aprovado):**
```json
{
  "payment_id": "1234567890",
  "status": "approved",
  "status_detail": "accredited",
  "order_id": "uuid-do-pedido",
  "transaction_amount": 165.00,
  "installments": 1,
  "message": "Pagamento aprovado com sucesso!"
}
```

## 🎨 Componentes React Recomendados

### 1. Hook de Checkout

```typescript
import { useState } from 'react';
import { useAuth } from './useAuth';

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const createOrder = async (checkoutData: CheckoutRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(checkoutData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pedido');
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading, error };
};
```

### 2. Hook do Mercado Pago

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useMercadoPago = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_URL}/payment/config`);
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        console.error('Erro ao carregar config MP:', err);
      }
    };
    
    loadConfig();
  }, []);

  const createCardToken = async (cardData: CardData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/payment/card-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar token');
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentData: PaymentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/payment/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    config,
    createCardToken,
    processPayment,
    loading,
    error
  };
};
```

### 3. Componente de Checkout

```tsx
import React, { useState } from 'react';
import { useCheckout } from './hooks/useCheckout';
import { useMercadoPago } from './hooks/useMercadoPago';
import { useCart } from './hooks/useCart';

const CheckoutPage: React.FC = () => {
  const [step, setStep] = useState(1); // 1: Endereço, 2: Pagamento, 3: Confirmação
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({} as ShippingAddress);
  const [order, setOrder] = useState<any>(null);
  
  const { items, total } = useCart();
  const { createOrder, loading: checkoutLoading } = useCheckout();
  const { createCardToken, processPayment, loading: paymentLoading } = useMercadoPago();

  const handleCreateOrder = async () => {
    try {
      const orderData = await createOrder({
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        shipping_address: shippingAddress,
        payment_method: 'credit_card'
      });
      
      setOrder(orderData);
      setStep(2);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
    }
  };

  const handlePayment = async (cardData: CardData) => {
    try {
      // 1. Criar token do cartão
      const tokenResponse = await createCardToken(cardData);
      
      // 2. Processar pagamento
      const paymentResponse = await processPayment({
        token: tokenResponse.token,
        transaction_amount: order.total,
        installments: 1,
        payment_method_id: 'visa', // Detectar automaticamente
        order_id: order.order_id,
        payer: {
          email: 'cliente@email.com', // Pegar do usuário logado
          identification: {
            type: 'CPF',
            number: cardData.cardholder_document_number
          },
          first_name: cardData.cardholder_name.split(' ')[0],
          last_name: cardData.cardholder_name.split(' ').slice(1).join(' ')
        }
      });
      
      if (paymentResponse.status === 'approved') {
        setStep(3); // Sucesso
      } else {
        // Tratar rejeição
        alert('Pagamento rejeitado: ' + paymentResponse.message);
      }
    } catch (error) {
      console.error('Erro no pagamento:', error);
    }
  };

  return (
    <div className="checkout-container">
      {step === 1 && (
        <AddressForm 
          address={shippingAddress}
          onChange={setShippingAddress}
          onNext={handleCreateOrder}
          loading={checkoutLoading}
        />
      )}
      
      {step === 2 && order && (
        <PaymentForm 
          order={order}
          onPayment={handlePayment}
          loading={paymentLoading}
        />
      )}
      
      {step === 3 && (
        <SuccessPage order={order} />
      )}
    </div>
  );
};
```

### 4. Formulário de Pagamento

```tsx
import React, { useState } from 'react';

interface PaymentFormProps {
  order: any;
  onPayment: (cardData: CardData) => void;
  loading: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ order, onPayment, loading }) => {
  const [cardData, setCardData] = useState<CardData>({
    card_number: '',
    expiration_month: '',
    expiration_year: '',
    security_code: '',
    cardholder_name: '',
    cardholder_document_number: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPayment(cardData);
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className="payment-form">
      <div className="order-summary">
        <h3>Resumo do Pedido</h3>
        <p>Subtotal: R$ {order.subtotal.toFixed(2)}</p>
        <p>Frete: R$ {order.shipping_cost.toFixed(2)}</p>
        <p><strong>Total: R$ {order.total.toFixed(2)}</strong></p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Número do Cartão</label>
          <input
            type="text"
            value={formatCardNumber(cardData.card_number)}
            onChange={(e) => setCardData({
              ...cardData,
              card_number: e.target.value.replace(/\s/g, '')
            })}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Mês</label>
            <select
              value={cardData.expiration_month}
              onChange={(e) => setCardData({
                ...cardData,
                expiration_month: e.target.value
              })}
              required
            >
              <option value="">Mês</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                  {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Ano</label>
            <select
              value={cardData.expiration_year}
              onChange={(e) => setCardData({
                ...cardData,
                expiration_year: e.target.value
              })}
              required
            >
              <option value="">Ano</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          
          <div className="form-group">
            <label>CVV</label>
            <input
              type="text"
              value={cardData.security_code}
              onChange={(e) => setCardData({
                ...cardData,
                security_code: e.target.value
              })}
              placeholder="123"
              maxLength={4}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Nome no Cartão</label>
          <input
            type="text"
            value={cardData.cardholder_name}
            onChange={(e) => setCardData({
              ...cardData,
              cardholder_name: e.target.value
            })}
            placeholder="João Silva"
            required
          />
        </div>
        
        <div className="form-group">
          <label>CPF</label>
          <input
            type="text"
            value={cardData.cardholder_document_number}
            onChange={(e) => setCardData({
              ...cardData,
              cardholder_document_number: e.target.value.replace(/\D/g, '')
            })}
            placeholder="12345678901"
            maxLength={11}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="pay-button"
        >
          {loading ? 'Processando...' : `Pagar R$ ${order.total.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};
```

## 🔒 Segurança e Boas Práticas

### 1. Validações no Frontend

```typescript
// Validação de cartão de crédito
const validateCardNumber = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, '');
  return /^\d{13,19}$/.test(cleaned);
};

const validateCVV = (cvv: string): boolean => {
  return /^\d{3,4}$/.test(cvv);
};

const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11;
};
```

### 2. Tratamento de Erros

```typescript
const handlePaymentError = (error: any) => {
  switch (error.code) {
    case 'cc_rejected_insufficient_amount':
      return 'Saldo insuficiente no cartão';
    case 'cc_rejected_bad_filled_card_number':
      return 'Número do cartão inválido';
    case 'cc_rejected_bad_filled_security_code':
      return 'Código de segurança inválido';
    case 'cc_rejected_bad_filled_date':
      return 'Data de vencimento inválida';
    default:
      return error.description || 'Erro no processamento do pagamento';
  }
};
```

## 📱 Responsividade

```css
/* CSS para checkout responsivo */
.checkout-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .checkout-container {
    padding: 10px;
  }
}

.pay-button {
  width: 100%;
  padding: 15px;
  background: #00a650;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.pay-button:hover {
  background: #008f43;
}

.pay-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

## 🧪 Cartões de Teste

```typescript
// Para ambiente de desenvolvimento
const TEST_CARDS = {
  VISA_APPROVED: {
    card_number: '4111111111111111',
    security_code: '123',
    expiration_month: '12',
    expiration_year: '2025'
  },
  MASTERCARD_REJECTED: {
    card_number: '5555555555554444',
    security_code: '123',
    expiration_month: '12',
    expiration_year: '2025'
  },
  AMEX_PENDING: {
    card_number: '378282246310005',
    security_code: '1234',
    expiration_month: '12',
    expiration_year: '2025'
  }
};
```

## ✅ Checklist de Implementação

- [ ] Configurar URLs da API (produção/desenvolvimento)
- [ ] Implementar hook de autenticação
- [ ] Criar hook de checkout
- [ ] Criar hook do Mercado Pago
- [ ] Implementar formulário de endereço
- [ ] Implementar formulário de pagamento
- [ ] Adicionar validações de cartão
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states
- [ ] Testar com cartões de teste
- [ ] Implementar página de sucesso
- [ ] Adicionar responsividade
- [ ] Configurar HTTPS em produção

---

**🎉 Checkout e Mercado Pago prontos para integração!**

💳 **Seguro** | 🚀 **Rápido** | 📱 **Responsivo**