# 🔧 Informações Necessárias para o Backend - Resolução de Erros de Comunicação

## 📋 Resumo Executivo

Este documento contém todas as informações necessárias para que o backend resolva os problemas de comunicação identificados no frontend da Rosia Loja.

## 🌐 Configurações Atuais do Frontend

### URLs da API
- **Produção**: `https://back-end-rosia.vercel.app`
- **Local**: `http://localhost:3001`
- **Configuração no .env**: `VITE_API_URL=https://back-end-rosia.vercel.app`

### Estrutura de Autenticação
- **Token Admin**: Armazenado em `localStorage.getItem('admin_token')`
- **Token Usuário**: Armazenado em `localStorage.getItem('access_token')`
- **Refresh Token**: Armazenado em `localStorage.getItem('refresh_token')`

## 🔍 Problemas Identificados

### 1. Endpoints Administrativos
O frontend está fazendo chamadas para os seguintes endpoints admin que precisam estar funcionais:

```
POST /admin/auth/login
GET /admin/dashboard
GET /admin/products
POST /admin/products
PUT /admin/products/{id}
DELETE /admin/products/{id}
GET /admin/orders
PUT /admin/orders/{id}/status
GET /admin/users
GET /admin/categories
GET /admin/sizes
GET /admin/settings
PUT /admin/settings
GET /admin/reports
```

### 2. Endpoints Públicos
Endpoints públicos que o frontend utiliza:

```
GET /products
GET /products/{id}
GET /products/meta/categories
GET /products/featured
POST /auth/login
POST /auth/register
POST /auth/google
POST /auth/facebook
```

### 3. Headers Esperados
O frontend envia os seguintes headers:

```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}' // Para rotas autenticadas
}
```

### 4. Timeout Configurado
- **Timeout**: 10 segundos (10000ms)
- **withCredentials**: false

## 🚨 Erros Comuns Identificados no Código

### 1. Tratamento de Erros de Autenticação
```javascript
// O frontend espera estas respostas de erro:
{
  "error": "Token inválido ou expirado",
  "code": 401
}

{
  "error": "Acesso negado",
  "code": 403
}
```

### 2. Estrutura de Resposta Esperada para Login Admin
```javascript
{
  "success": true,
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "admin" | "super_admin",
    "permissions": ["string"],
    "avatar": "string",
    "created_at": "string",
    "last_login": "string"
  },
  "session": {
    "admin_token": "string",
    "expires_at": number
  }
}
```

### 3. Estrutura de Resposta para Produtos
```javascript
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "price": number,
      "stock": number,
      "category": "string",
      "images": ["string"],
      "sizes": ["string"],
      "colors": ["string"],
      "material": "string",
      "brand": "string",
      "weight": number,
      "volume": number,
      "tags": ["string"],
      "status": "active" | "inactive",
      "featured": boolean,
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

## 🔧 Configurações CORS Necessárias

O backend deve aceitar requisições dos seguintes domínios:

```javascript
// Configuração CORS necessária
const corsOptions = {
  origin: [
    'https://www.rosia.com.br',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## 📊 Dados de Teste Necessários

### Usuário Admin de Teste
```javascript
{
  "email": "admin@rosia.com",
  "password": "admin123", // ou qualquer senha padrão
  "role": "admin",
  "permissions": ["products.create", "products.read", "products.update", "products.delete"]
}
```

### Categorias Padrão
```javascript
[
  "Roupas Femininas",
  "Vestido",
  "Blusas",
  "Calças",
  "Saias",
  "Acessórios"
]
```

### Tamanhos Padrão
```javascript
["PP", "P", "M", "G", "GG", "XG"]
```

## 🔍 Logs e Debugging

### Informações para Logs do Backend
1. **Request Headers**: Logar todos os headers recebidos
2. **Authorization Token**: Verificar se o token está sendo recebido corretamente
3. **Request Body**: Logar o corpo das requisições POST/PUT
4. **Response Status**: Sempre retornar status HTTP apropriados

### Status Codes Esperados
- **200**: Sucesso
- **201**: Criado com sucesso
- **400**: Dados inválidos
- **401**: Não autenticado
- **403**: Sem permissão
- **404**: Não encontrado
- **500**: Erro interno do servidor

## 🚀 Testes de Conectividade

### Endpoints para Testar Primeiro
1. `GET /health` - Health check básico
2. `POST /admin/auth/login` - Login administrativo
3. `GET /products` - Listagem pública de produtos
4. `GET /admin/products` - Listagem admin de produtos

### Ferramentas de Teste Recomendadas
- **Postman**: Para testar endpoints manualmente
- **curl**: Para testes rápidos via terminal
- **Browser DevTools**: Para verificar requisições do frontend

## 📝 Checklist para o Backend

### Configuração Básica
- [ ] CORS configurado corretamente
- [ ] Headers de resposta apropriados
- [ ] Timeout adequado (>10 segundos)
- [ ] Logs de requisições habilitados

### Autenticação
- [ ] Endpoint de login admin funcionando
- [ ] Validação de token JWT
- [ ] Renovação de token implementada
- [ ] Logout funcionando

### Produtos
- [ ] CRUD completo de produtos
- [ ] Upload de imagens funcionando
- [ ] Filtros e busca implementados
- [ ] Paginação funcionando

### Administração
- [ ] Dashboard com estatísticas
- [ ] Gestão de usuários
- [ ] Gestão de pedidos
- [ ] Configurações da loja

## 🔗 URLs de Referência

- **Frontend em Produção**: A ser definida
- **Backend em Produção**: `https://back-end-rosia.vercel.app`
- **Documentação da API**: A ser criada

## 📞 Próximos Passos

1. **Verificar Health Check**: Confirmar se o backend está respondendo
2. **Testar Login Admin**: Validar autenticação administrativa
3. **Testar CRUD Produtos**: Verificar operações básicas
4. **Configurar CORS**: Ajustar para aceitar requisições do frontend
5. **Implementar Logs**: Para facilitar debugging
6. **Criar Dados de Teste**: Usuário admin e produtos iniciais

---

**📋 Este documento deve ser usado pelo desenvolvedor backend para resolver todos os problemas de comunicação identificados no frontend.**

**🔄 Última atualização**: Janeiro 2025
**📧 Contato**: Para dúvidas sobre a integração frontend-backend

