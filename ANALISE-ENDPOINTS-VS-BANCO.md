# 📊 Análise: Endpoints vs Estrutura do Banco de Dados

## 🎯 Objetivo
Comparar os endpoints implementados com as tabelas e colunas do banco de dados para identificar lacunas e inconsistências.

---

## 📋 Tabelas do Banco de Dados

### 1. **admin_stats** (View/Tabela de Estatísticas)
**Colunas:**
- `produtos_ativos`, `produtos_inativos`, `produtos_estoque_baixo`
- `pedidos_pendentes`, `pedidos_processando`, `pedidos_enviados`, `pedidos_entregues`, `pedidos_cancelados`
- `vendas_totais`, `vendas_hoje`, `vendas_mes_atual`
- `total_usuarios`

**Endpoints Correspondentes:**
- ✅ `GET /api/admin/stats` - Implementado
- ✅ `GET /api/admin/dashboard` - Implementado

**Status:** ✅ **COMPLETO**

---

### 2. **admin_users** (Usuários Administradores)
**Colunas:**
- `id`, `user_id`, `email`, `created_at`, `updated_at`, `active`

**Endpoints Correspondentes:**
- ✅ `POST /api/admin/login` - Implementado
- ✅ `GET /api/admin/verify` - Implementado
- ❌ `GET /api/admin/users` - **FALTANDO** (listar admins)
- ❌ `POST /api/admin/users` - **FALTANDO** (criar admin)
- ❌ `PUT /api/admin/users/:id` - **FALTANDO** (atualizar admin)
- ❌ `DELETE /api/admin/users/:id` - **FALTANDO** (remover admin)

**Status:** ⚠️ **PARCIAL** - Falta CRUD completo de admins

---

### 3. **coupons** (Cupons de Desconto)
**Colunas:**
- `id`, `code`, `description`, `discount_type`, `discount_value`
- `min_order_value`, `max_uses`, `used_count`
- `valid_from`, `valid_until`, `active`
- `created_at`, `updated_at`

**Endpoints Correspondentes:**
- ❌ `GET /api/coupons` - **FALTANDO** (listar cupons)
- ❌ `POST /api/coupons` - **FALTANDO** (criar cupom)
- ❌ `PUT /api/coupons/:id` - **FALTANDO** (atualizar cupom)
- ❌ `DELETE /api/coupons/:id` - **FALTANDO** (deletar cupom)
- ❌ `POST /api/coupons/validate` - **FALTANDO** (validar cupom)
- ❌ `POST /api/checkout/apply-coupon` - **FALTANDO** (aplicar no checkout)

**Status:** ❌ **FALTANDO COMPLETAMENTE**

---

### 4. **coupon_uses** (Histórico de Uso de Cupons)
**Colunas:**
- `id`, `coupon_id`, `user_id`, `order_id`, `discount_applied`, `created_at`

**Endpoints Correspondentes:**
- ❌ `GET /api/admin/coupon-uses` - **FALTANDO** (relatório de uso)
- ❌ `GET /api/users/coupon-history` - **FALTANDO** (histórico do usuário)

**Status:** ❌ **FALTANDO COMPLETAMENTE**

---

### 5. **orders** (Pedidos)
**Colunas:**
- `id`, `user_id`, `items` (jsonb), `subtotal`, `shipping_cost`, `total`
- `status`, `payment_method`, `shipping_address` (jsonb), `shipping_method`
- `tracking_code`, `estimated_delivery`, `payment_confirmed_at`
- `payment_rejected_at`, `refunded_at`, `payment_data` (jsonb)
- `notes`, `created_at`, `updated_at`

**Endpoints Correspondentes:**
- ✅ `GET /api/orders` - Implementado (listar pedidos do usuário)
- ✅ `GET /api/orders/:id` - Implementado (detalhes do pedido)
- ✅ `POST /api/orders` - Implementado (criar pedido)
- ✅ `PUT /api/orders/:id/status` - Implementado (atualizar status)
- ✅ `PUT /api/orders/:id/cancel` - Implementado (cancelar pedido)
- ✅ `GET /api/admin/orders` - Implementado (admin listar todos)
- ✅ `PUT /api/admin/orders/:id` - Implementado (admin atualizar)
- ❌ `PUT /api/orders/:id/tracking` - **FALTANDO** (atualizar código de rastreamento)
- ❌ `GET /api/orders/:id/tracking` - **FALTANDO** (consultar rastreamento)

**Status:** ✅ **QUASE COMPLETO** - Falta apenas rastreamento

---

### 6. **products** (Produtos)
**Colunas:**
- `id`, `name`, `description`, `price`, `stock`, `category`
- `image_url`, `images` (jsonb), `weight`, `volume`
- `active`, `featured`, `tags` (array), `metadata` (jsonb)
- `colors` (jsonb), `sizes` (jsonb), `material`, `brand`
- `created_at`, `updated_at`

**Endpoints Correspondentes:**
- ✅ `GET /api/products` - Implementado (listar com filtros)
- ✅ `GET /api/products/:id` - Implementado (detalhes)
- ✅ `GET /api/products/categories` - Implementado (categorias)
- ✅ `GET /api/products/featured` - Implementado (produtos em destaque)
- ✅ `POST /api/admin/products` - Implementado (criar produto)
- ✅ `PUT /api/admin/products/:id` - Implementado (atualizar produto)
- ✅ `DELETE /api/admin/products/:id` - Implementado (deletar produto)
- ✅ `POST /api/upload` - Implementado (upload de imagens)
- ❌ `GET /api/products/search` - **PODE MELHORAR** (busca avançada)
- ❌ `GET /api/products/brands` - **FALTANDO** (listar marcas)
- ❌ `GET /api/products/materials` - **FALTANDO** (listar materiais)

**Status:** ✅ **COMPLETO** - Pequenas melhorias possíveis

---

### 7. **user_addresses** (Endereços dos Usuários)
**Colunas:**
- `id`, `user_id`, `name`, `logradouro`, `numero`, `complemento`
- `bairro`, `cidade`, `estado`, `cep`, `is_default`
- `created_at`, `updated_at`

**Endpoints Correspondentes:**
- ✅ `GET /api/profile/addresses` - Implementado
- ✅ `POST /api/profile/addresses` - Implementado
- ✅ `PUT /api/profile/addresses/:id` - Implementado
- ✅ `DELETE /api/profile/addresses/:id` - Implementado
- ✅ `PUT /api/profile/addresses/:id/default` - Implementado
- ✅ `GET /api/profile-config/complete` - Implementado (inclui endereço)
- ✅ `PUT /api/profile-config/complete` - Implementado (salva endereço)

**Status:** ✅ **COMPLETO**

---

### 8. **user_profiles** (Perfis dos Usuários)
**Colunas:**
- `id`, `user_id`, `nome`, `cpf`, `telefone`, `data_nascimento`
- `avatar_url`, `email`, `password_hash`, `google_id`
- `auth_provider`, `email_verified`, `last_login`
- `created_at`, `updated_at`

**Endpoints Correspondentes:**
- ✅ `GET /api/users/profile` - Implementado
- ✅ `PUT /api/users/profile` - Implementado
- ✅ `GET /api/profile-config/complete` - Implementado
- ✅ `PUT /api/profile-config/complete` - Implementado
- ✅ `POST /api/auth/register` - Implementado
- ✅ `POST /api/auth/login` - Implementado
- ✅ `POST /api/auth/google` - Implementado
- ✅ `GET /api/auth/me` - Implementado
- ❌ `PUT /api/users/avatar` - **FALTANDO** (upload de avatar)
- ❌ `PUT /api/users/password` - **FALTANDO** (alterar senha)
- ❌ `POST /api/auth/forgot-password` - **FALTANDO** (recuperar senha)
- ❌ `POST /api/auth/reset-password` - **FALTANDO** (redefinir senha)

**Status:** ✅ **QUASE COMPLETO** - Falta gestão de avatar e senha

---

## 🚨 Endpoints Implementados SEM Tabela Correspondente

### 1. **CEP e Frete**
- ✅ `GET /api/cep/:cep` - Implementado (API externa)
- ✅ `POST /api/shipping/calculate` - Implementado (cálculo de frete)

### 2. **Pagamentos**
- ✅ `POST /api/payment/create` - Implementado (MercadoPago)
- ✅ `POST /api/webhook/mercadopago` - Implementado (webhook)

### 3. **Checkout**
- ✅ `POST /api/checkout/create` - Implementado
- ✅ `POST /api/checkout/validate` - Implementado

### 4. **Debug e Testes**
- ✅ `GET /api/debug/token` - Implementado
- ✅ `GET /api/debug/supabase-config` - Implementado
- ✅ `POST /api/debug/validate-token` - Implementado

---

## 📊 Resumo da Análise

| Tabela | Status | Endpoints Faltando | Prioridade |
|--------|--------|-------------------|------------|
| `admin_stats` | ✅ Completo | - | - |
| `admin_users` | ⚠️ Parcial | CRUD de admins | Média |
| `coupons` | ❌ Faltando | Sistema completo | **Alta** |
| `coupon_uses` | ❌ Faltando | Relatórios de uso | Baixa |
| `orders` | ✅ Quase completo | Rastreamento | Média |
| `products` | ✅ Completo | Melhorias menores | Baixa |
| `user_addresses` | ✅ Completo | - | - |
| `user_profiles` | ✅ Quase completo | Avatar e senha | Média |

---

## 🎯 Recomendações de Implementação

### **PRIORIDADE ALTA** 🔴

#### 1. Sistema de Cupons Completo
```javascript
// Endpoints necessários:
GET    /api/coupons              // Listar cupons (admin)
POST   /api/coupons              // Criar cupom (admin)
PUT    /api/coupons/:id          // Atualizar cupom (admin)
DELETE /api/coupons/:id          // Deletar cupom (admin)
POST   /api/coupons/validate     // Validar cupom (público)
POST   /api/checkout/apply-coupon // Aplicar no checkout
GET    /api/admin/coupon-uses    // Relatório de uso (admin)
```

### **PRIORIDADE MÉDIA** 🟡

#### 2. Gestão de Usuários Admin
```javascript
GET    /api/admin/users          // Listar admins
POST   /api/admin/users          // Criar admin
PUT    /api/admin/users/:id      // Atualizar admin
DELETE /api/admin/users/:id      // Remover admin
```

#### 3. Gestão de Avatar e Senha
```javascript
PUT    /api/users/avatar         // Upload de avatar
PUT    /api/users/password       // Alterar senha
POST   /api/auth/forgot-password // Recuperar senha
POST   /api/auth/reset-password  // Redefinir senha
```

#### 4. Sistema de Rastreamento
```javascript
PUT    /api/orders/:id/tracking  // Atualizar código de rastreamento
GET    /api/orders/:id/tracking  // Consultar rastreamento
```

### **PRIORIDADE BAIXA** 🟢

#### 5. Melhorias em Produtos
```javascript
GET    /api/products/brands      // Listar marcas
GET    /api/products/materials   // Listar materiais
GET    /api/products/search      // Busca avançada melhorada
```

---

## ✅ Conclusão

**Status Geral:** 📊 **75% Completo**

- ✅ **Funcionalidades Core:** Produtos, Pedidos, Perfis, Endereços
- ⚠️ **Funcionalidades Importantes:** Cupons (faltando), Gestão de Admins (parcial)
- 🔧 **Melhorias:** Avatar, Senha, Rastreamento

**Próximo Passo Recomendado:** Implementar o sistema de cupons completo, pois é uma funcionalidade essencial para e-commerce que está completamente ausente.

