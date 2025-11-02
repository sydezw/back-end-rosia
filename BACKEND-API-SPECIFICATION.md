# 📋 ESPECIFICAÇÃO DA API BACKEND - ROSIA LOJA

## 🎯 Visão Geral

Esta documentação define as especificações completas da API backend para o sistema de perfil de usuário e gerenciamento de endereços da Rosia Loja.

## 🔐 Autenticação

Todas as rotas protegidas requerem autenticação via JWT Bearer Token:

```http
Authorization: Bearer <jwt_token>
```

## 📊 Estrutura de Resposta Padrão

### Sucesso
```json
{
  "success": true,
  "data": {},
  "message": "Operação realizada com sucesso"
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro",
    "details": {}
  }
}
```

---

## 👤 ENDPOINTS DE USUÁRIO

### 1. Obter Perfil do Usuário

**GET** `/api/users/profile`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nome": "João Silva",
      "email": "joao@email.com",
      "cpf": "123.456.789-00",
      "telefone": "(11) 99999-9999",
      "data_nascimento": "1990-01-01",
      "avatar_url": "https://...",
      "email_verificado": true,
      "criadoem": "2024-01-01T00:00:00Z",
      "atualizadoem": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 2. Atualizar Perfil do Usuário

**PUT** `/api/users/profile`

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "nome": "João Silva Santos",
  "cpf": "123.456.789-00",
  "telefone": "(11) 99999-9999",
  "data_nascimento": "1990-01-01"
}
```

**Validações:**
- `nome`: obrigatório, mínimo 2 caracteres
- `cpf`: formato válido (000.000.000-00), único no sistema
- `telefone`: formato válido
- `data_nascimento`: formato ISO date

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nome": "João Silva Santos",
      "email": "joao@email.com",
      "cpf": "123.456.789-00",
      "telefone": "(11) 99999-9999",
      "data_nascimento": "1990-01-01",
      "atualizadoem": "2024-01-01T12:00:00Z"
    }
  },
  "message": "Perfil atualizado com sucesso"
}
```

### 3. Upload de Avatar

**POST** `/api/users/avatar`

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
avatar: <file> (jpg, png, webp - máximo 5MB)
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "avatar_url": "https://storage.../avatar.jpg"
  },
  "message": "Avatar atualizado com sucesso"
}
```

---

## 🏠 ENDPOINTS DE ENDEREÇOS

### 1. Listar Endereços do Usuário

**GET** `/api/users/addresses`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": "uuid",
        "name": "Casa",
        "cep": "01234-567",
        "logradouro": "Rua das Flores",
        "numero": "123",
        "complemento": "Apto 45",
        "bairro": "Centro",
        "cidade": "São Paulo",
        "estado": "SP",
        "is_default": true,
        "criadoem": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. Criar Novo Endereço

**POST** `/api/users/addresses`

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Trabalho",
  "cep": "01234-567",
  "logradouro": "Av. Paulista",
  "numero": "1000",
  "complemento": "Sala 101",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "is_default": false
}
```

**Validações:**
- `name`: obrigatório, máximo 100 caracteres
- `cep`: obrigatório, formato 00000-000
- `logradouro`: obrigatório, máximo 255 caracteres
- `numero`: obrigatório, máximo 20 caracteres
- `bairro`: obrigatório, máximo 100 caracteres
- `cidade`: obrigatório, máximo 100 caracteres
- `estado`: obrigatório, 2 caracteres (UF)
- `complemento`: opcional, máximo 255 caracteres

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "uuid",
      "name": "Trabalho",
      "cep": "01234-567",
      "logradouro": "Av. Paulista",
      "numero": "1000",
      "complemento": "Sala 101",
      "bairro": "Bela Vista",
      "cidade": "São Paulo",
      "estado": "SP",
      "is_default": false,
      "criadoem": "2024-01-01T12:00:00Z"
    }
  },
  "message": "Endereço criado com sucesso"
}
```

### 3. Atualizar Endereço

**PUT** `/api/users/addresses/:id`

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:** (mesma estrutura do POST)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "address": {
      "id": "uuid",
      "name": "Casa Atualizada",
      "cep": "01234-567",
      "logradouro": "Rua das Flores",
      "numero": "123",
      "complemento": "Apto 45",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "is_default": true,
      "atualizadoem": "2024-01-01T12:00:00Z"
    }
  },
  "message": "Endereço atualizado com sucesso"
}
```

### 4. Definir Endereço como Padrão

**PATCH** `/api/users/addresses/:id/default`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Endereço definido como padrão"
}
```

### 5. Excluir Endereço

**DELETE** `/api/users/addresses/:id`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Endereço excluído com sucesso"
}
```

---

## 🔍 ENDPOINT DE BUSCA CEP

### Buscar Endereço por CEP

**GET** `/api/cep/:cep`

**Parâmetros:**
- `cep`: CEP no formato 00000000 (apenas números)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "cep": "01234-567",
    "logradouro": "Rua das Flores",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

---

## ⚠️ CÓDIGOS DE ERRO

### Erros de Validação (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": {
      "cpf": ["CPF já está em uso"],
      "cep": ["Formato de CEP inválido"]
    }
  }
}
```

### Erro de Autenticação (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de acesso inválido ou expirado"
  }
}
```

### Recurso Não Encontrado (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Endereço não encontrado"
  }
}
```

### Erro Interno (500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Erro interno do servidor"
  }
}
```

---

## 🛠️ IMPLEMENTAÇÃO BACKEND

### 1. Middleware de Autenticação

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de acesso requerido'
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado'
        }
      });
    }
    req.user = user;
    next();
  });
};
```

### 2. Validação de CPF

```javascript
const validateCPF = (cpf) => {
  // Remove formatação
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se não são todos iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  
  return digit1 === parseInt(cleanCPF[9]) && digit2 === parseInt(cleanCPF[10]);
};
```

### 3. Validação de CEP

```javascript
const validateCEP = (cep) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return /^\d{8}$/.test(cleanCEP);
};
```

### 4. Formatação de Resposta

```javascript
const formatResponse = (success, data = null, message = null, error = null) => {
  const response = { success };
  
  if (success) {
    if (data) response.data = data;
    if (message) response.message = message;
  } else {
    response.error = error;
  }
  
  return response;
};
```

### 5. Exemplo de Controller - Perfil de Usuário

```javascript
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await db.query(
      'SELECT id, nome, email, cpf, telefone, data_nascimento, avatar_url, email_verificado, criadoem, atualizadoem FROM usuarios WHERE id = $1',
      [userId]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json(
        formatResponse(false, null, null, {
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado'
        })
      );
    }
    
    res.json(formatResponse(true, { user: user.rows[0] }));
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json(
      formatResponse(false, null, null, {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      })
    );
  }
};
```

### 6. Exemplo de Controller - Endereços

```javascript
const createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default } = req.body;
    
    // Validações
    if (!validateCEP(cep)) {
      return res.status(400).json(
        formatResponse(false, null, null, {
          code: 'VALIDATION_ERROR',
          message: 'CEP inválido',
          details: { cep: ['Formato de CEP inválido'] }
        })
      );
    }
    
    // Se for endereço padrão, remove padrão dos outros
    if (is_default) {
      await db.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }
    
    const result = await db.query(
      `INSERT INTO user_addresses 
       (user_id, name, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [userId, name, cep, logradouro, numero, complemento, bairro, cidade, estado, is_default]
    );
    
    res.status(201).json(
      formatResponse(true, { address: result.rows[0] }, 'Endereço criado com sucesso')
    );
  } catch (error) {
    console.error('Erro ao criar endereço:', error);
    res.status(500).json(
      formatResponse(false, null, null, {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      })
    );
  }
};
```

---

## 🔧 CONFIGURAÇÕES NECESSÁRIAS

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/rosia_db

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura
JWT_EXPIRES_IN=7d

# Upload de arquivos
UPLOAD_MAX_SIZE=5242880  # 5MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# API Externa
VIACEP_API_URL=https://viacep.com.br/ws
```

### Dependências Recomendadas

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.8.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "multer": "^1.4.5",
    "joi": "^17.7.0",
    "cors": "^2.8.5",
    "helmet": "^6.0.0",
    "express-rate-limit": "^6.6.0"
  }
}
```

---

## 📝 NOTAS IMPORTANTES

1. **Segurança**: Sempre validar e sanitizar dados de entrada
2. **Performance**: Implementar cache para consultas frequentes
3. **Logs**: Registrar todas as operações importantes
4. **Rate Limiting**: Implementar limitação de requisições
5. **CORS**: Configurar adequadamente para o frontend
6. **Backup**: Implementar rotina de backup do banco de dados
7. **Monitoramento**: Implementar health checks e métricas

---

## 🚀 PRÓXIMOS PASSOS

1. Implementar autenticação OAuth (Google, Facebook)
2. Sistema de notificações por email
3. API de produtos e carrinho
4. Sistema de pedidos e pagamentos
5. Dashboard administrativo
6. API de relatórios e analytics


