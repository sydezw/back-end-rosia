# Carrinho e Checkout (Google) — API e Integração Frontend

Este guia documenta os novos endpoints de carrinho e checkout para usuários autenticados via Google e explica como integrá-los no frontend.

## Base
- Backend: `http://localhost:3030`
- Auth: `Authorization: Bearer <token_google>`
- Todas as rotas em `/api/cart` e `/api/order` requerem token Google válido.

## Endpoints

### GET `/api/cart`
Retorna o carrinho do usuário autenticado.

Resposta (200):
```json
{
  "success": true,
  "cart": {
    "items": [
      {
        "item_id": "<uuid>",
        "product_id": "<uuid>",
        "product_name": "Tênis Rosia",
        "image_url": "https://.../img.jpg",
        "quantity": 2,
        "price": 149.9,
        "color": "Preto",
        "size": "M"
      }
    ],
    "subtotal": 299.8,
    "items_count": 2
  }
}
```
Erros:
- 401 sem token
- 500 erro interno (ex.: falha Supabase)

### POST `/api/cart/add`
Adiciona um item ao carrinho. Faz merge quando mesmo `product_id + size + color` já existem.

Body:
```json
{
  "product_id": "<uuid>",
  "quantity": 1,
  "size": "M",
  "color": "Preto"
}
```
Resposta (201):
```json
{ "success": true, "cart_item": { "id": "<uuid>", "product_id": "<uuid>", "quantity": 1, "unit_price": 149.9 } }
```
Erros:
- 401 sem token
- 400 `product_id` ausente, `quantity <= 0`, ou quantidade (soma) excede estoque
- 404 produto inativo ou inexistente
- 500 erro ao inserir/atualizar

### PATCH `/api/cart/update`
Atualiza a quantidade de um item do carrinho.

Body:
```json
{ "cart_item_id": "<uuid>", "quantity": 3 }
```
Erros:
- 401 sem token
- 400 parâmetros inválidos ou quantidade > estoque
- 404 item não pertence ao usuário
- 500 erro ao atualizar

### DELETE `/api/cart/item?id=<uuid>`
Remove um item específico do carrinho.

Erros:
- 401 sem token
- 400 parâmetro `id` ausente
- 500 erro ao remover

### DELETE `/api/cart`
Limpa todo o carrinho do usuário autenticado.

Erros:
- 401 sem token
- 500 erro ao limpar

### POST `/api/order/checkout`
Cria um pedido a partir dos itens do carrinho; valida estoque, calcula frete e limpa o carrinho.

Body (exemplo):
```json
{
  "shipping_address": {
    "cep": "12345-678",
    "logradouro": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "complemento": "Apto 45"
  },
  "payment_method": "pix"
}
```
Resposta (201):
```json
{
  "success": true,
  "order": {
    "id": "<uuid>",
    "items": [
      { "product_id": "<uuid>", "product_name": "Tênis Rosia", "product_price": 149.9, "quantity": 2, "total": 299.8 }
    ],
    "subtotal": 299.8,
    "shipping_cost": 0,
    "total": 299.8,
    "status": "pendente",
    "payment_method": "pix",
    "shipping_address": { ... }
  }
}
```
Regras de frete:
- Base R$ 15 + R$ 2 por item
- Frete grátis se `subtotal >= 100`

Erros:
- 401 sem token
- 400 carrinho vazio, produto inativo ou estoque insuficiente
- 500 erro ao criar pedido ou atualizar estoque

## Observações Técnicas
- Imagem de produto: usa `products.image_url` e, se não existir, primeiro item de `products.images`.
- `subtotal` no carrinho é somatório de `unit_price * quantity`.
- Após checkout, o estoque é decrementado e o carrinho é limpo.

## Integração Frontend
A seguir exemplos com `fetch`. Garanta que o token Google esteja salvo (ex.: `localStorage.setItem('googleToken', token)`):

```ts
const BASE_URL = 'http://localhost:3030';
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('googleToken') || ''}`,
});

export async function getCart() {
  const res = await fetch(`${BASE_URL}/api/cart`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function addToCart(product_id: string, quantity = 1, size?: string, color?: string) {
  const res = await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ product_id, quantity, size, color }),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function updateCartItem(cart_item_id: string, quantity: number) {
  const res = await fetch(`${BASE_URL}/api/cart/update`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ cart_item_id, quantity }),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function removeCartItem(itemId: string) {
  const res = await fetch(`${BASE_URL}/api/cart/item?id=${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function clearCart() {
  const res = await fetch(`${BASE_URL}/api/cart`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

export async function checkout(shipping_address: any, payment_method = 'pix') {
  const res = await fetch(`${BASE_URL}/api/order/checkout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ shipping_address, payment_method }),
  });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}
```

### Fluxo recomendado no frontend
1. Logar com Google (fluxo separado) e salvar o token no `localStorage`.
2. `addToCart(...)` ao clicar em comprar.
3. `getCart()` para montar a UI do carrinho.
4. `updateCartItem(...)` para alterar quantidades.
5. `removeCartItem(...)` para remover.
6. `checkout({...})` para finalizar e exibir o pedido criado.

### Testes rápidos
PowerShell (sem token → 401):
```
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3030/api/cart
```
Com token:
```
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3030/api/cart -Headers @{ Authorization = "Bearer <token>" }
```

## Dicas de Debug
- 401: verifique se o header `Authorization: Bearer <token>` está presente.
- 500: consulte logs do backend para detalhes (Supabase/joins).
- Confirme que o backend está rodando na porta `3030` e que o `.env` tem `PORT=3030`.