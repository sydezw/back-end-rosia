# Sistema de Login Admin Simplificado

## Visão Geral

O sistema de login administrativo foi simplificado para usar apenas o **email** cadastrado na tabela `admin_users`, sem necessidade de senha.

## Como Funciona

### 1. Estrutura da Tabela admin_users

```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Endpoint de Login

**POST** `/admin/auth/login`

**Body:**
```json
{
  "email": "suporte@rosia.com.br"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "suporte@rosia.com.br",
    "name": "Nome do Admin",
    "avatar": "url-do-avatar",
    "isAdmin": true,
    "adminId": 1
  },
  "session": {
    "admin_token": "token-base64-gerado",
    "expires_at": 1234567890000
  }
}
```

### 3. Autenticação nas Rotas Admin

Todas as rotas administrativas requerem o header:

```
Authorization: Bearer <admin_token>
```

### 4. Token Admin

O `admin_token` é um token simples em base64 que contém:
- ID do admin
- Email do admin
- Timestamp de criação

**Validade:** 24 horas

## Implementação no Frontend

### Exemplo de Login

```javascript
const loginAdmin = async (email) => {
  try {
    const response = await fetch('/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Salvar token para usar nas próximas requisições
      localStorage.setItem('admin_token', data.session.admin_token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Erro no login admin:', error);
    throw error;
  }
};
```

### Exemplo de Requisição Autenticada

```javascript
const fetchAdminData = async () => {
  const token = localStorage.getItem('admin_token');
  
  const response = await fetch('/admin/products', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};
```

## Códigos de Erro

- `ADMIN_NOT_FOUND`: Email não encontrado na tabela admin_users
- `ADMIN_INACTIVE`: Admin existe mas está inativo
- `USER_NOT_FOUND`: Usuário não encontrado no Supabase Auth
- `TOKEN_EXPIRED`: Token admin expirou (mais de 24h)
- `MISSING_TOKEN`: Header Authorization não fornecido
- `INVALID_TOKEN`: Token inválido ou malformado

## Segurança

1. **Verificação Dupla**: O sistema verifica tanto na tabela `admin_users` quanto no Supabase Auth
2. **Expiração**: Tokens expiram em 24 horas
3. **Status Ativo**: Apenas admins com `active = true` podem fazer login
4. **CORS Configurado**: Apenas origens permitidas podem acessar a API

## URL de Produção

**Backend URL:** `https://back-end-rosia.vercel.app`

## Testando o Sistema

1. **Criar Admin no Banco:**
   ```sql
   INSERT INTO admin_users (email, user_id, active) 
   VALUES ('suporte@rosia.com.br', 'uuid-do-usuario-supabase', true);
   ```

2. **Fazer Login:**
   ```bash
   curl -X POST https://rosita-backend-bfzgt3trq-rosita933751-2137s-projects.vercel.app/admin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "suporte@rosia.com.br"}'
   ```

3. **Usar Token nas Rotas Admin:**
   ```bash
   curl -X GET https://rosita-backend-bfzgt3trq-rosita933751-2137s-projects.vercel.app/admin/products \
     -H "Authorization: Bearer <admin_token>"
   ```