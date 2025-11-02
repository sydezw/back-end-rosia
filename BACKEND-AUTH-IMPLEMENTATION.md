# Implementação de Autenticação no Backend

## Visão Geral
Este documento descreve como implementar a autenticação completa no backend usando a tabela `user_profiles` como base única para usuários, suportando tanto login tradicional (email/senha) quanto login social (Google).

## Estrutura do Banco de Dados

### Tabela Principal: user_profiles
```sql
-- Executar o arquivo user_profiles_auth_migration.sql primeiro
```

### Campos de Autenticação Adicionados:
- `email`: Email único para login
- `password_hash`: Hash da senha (bcrypt)
- `google_id`: ID único do Google
- `auth_provider`: 'email' ou 'google'
- `email_verified`: Status de verificação
- `last_login`: Último acesso

## Endpoints da API

### 1. Registro de Usuário (Email/Senha)
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "MinhaSenh@123",
  "cpf": "123.456.789-00",
  "phone": "(11) 99999-9999",
  "birth_date": "1990-01-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "auth_provider": "email",
    "email_verified": false
  },
  "token": "jwt_token_aqui"
}
```

### 2. Login Tradicional (Email/Senha)
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "joao@exemplo.com",
  "password": "MinhaSenh@123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "cpf": "123.456.789-00",
    "phone": "(11) 99999-9999",
    "birth_date": "1990-01-01",
    "auth_provider": "email",
    "last_login": "2024-01-15T10:30:00Z"
  },
  "token": "jwt_token_aqui"
}
```

### 3. Login com Google
```
POST /api/auth/login/google
```

**Request Body:**
```json
{
  "google_token": "google_oauth_token",
  "google_user": {
    "id": "google_user_id",
    "email": "joao@gmail.com",
    "name": "João Silva",
    "picture": "https://..."
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login com Google realizado com sucesso",
  "user": {
    "id": 2,
    "name": "João Silva",
    "email": "joao@gmail.com",
    "google_id": "google_user_id",
    "auth_provider": "google",
    "email_verified": true,
    "last_login": "2024-01-15T10:30:00Z"
  },
  "token": "jwt_token_aqui"
}
```

### 4. Verificar Token
```
GET /api/auth/verify
Headers: Authorization: Bearer jwt_token
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@exemplo.com"
  }
}
```

### 5. Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer jwt_token
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

## Implementação no Backend

### 1. Dependências Necessárias
```bash
npm install bcryptjs jsonwebtoken google-auth-library
```

### 2. Middleware de Autenticação
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token inválido' });
  }
};
```

### 3. Funções de Hash de Senha
```javascript
// utils/password.js
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### 4. Validação de Google Token
```javascript
// utils/google-auth.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    throw new Error('Token do Google inválido');
  }
};
```

### 5. Queries do Banco de Dados
```javascript
// db/user-queries.js
const createUser = async (userData) => {
  const query = `
    INSERT INTO user_profiles (name, email, password_hash, cpf, phone, birth_date, auth_provider)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, auth_provider, email_verified, created_at
  `;
  const values = [userData.name, userData.email, userData.password_hash, userData.cpf, userData.phone, userData.birth_date, 'email'];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const createGoogleUser = async (googleData) => {
  const query = `
    INSERT INTO user_profiles (name, email, google_id, auth_provider, email_verified)
    VALUES ($1, $2, $3, 'google', true)
    RETURNING id, name, email, google_id, auth_provider, email_verified, created_at
  `;
  const values = [googleData.name, googleData.email, googleData.google_id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM user_profiles WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const findUserByGoogleId = async (googleId) => {
  const query = 'SELECT * FROM user_profiles WHERE google_id = $1';
  const result = await pool.query(query, [googleId]);
  return result.rows[0];
};

const updateLastLogin = async (userId) => {
  const query = 'UPDATE user_profiles SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
  await pool.query(query, [userId]);
};
```

## Variáveis de Ambiente

```env
# JWT
JWT_SECRET=sua_chave_secreta_muito_forte_aqui
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## Tratamento de Erros

### Códigos de Erro Comuns:
- **400**: Dados inválidos
- **401**: Não autenticado
- **403**: Token inválido
- **409**: Email já existe
- **500**: Erro interno do servidor

### Exemplo de Response de Erro:
```json
{
  "success": false,
  "message": "Email já está em uso",
  "error_code": "EMAIL_EXISTS"
}
```

## Segurança

1. **Senhas**: Sempre usar bcrypt com salt rounds >= 12
2. **JWT**: Usar chaves secretas fortes e expiração adequada
3. **CORS**: Configurar origins permitidas
4. **Rate Limiting**: Implementar limite de tentativas de login
5. **Validação**: Validar todos os inputs do usuário
6. **HTTPS**: Sempre usar HTTPS em produção

## Próximos Passos

1. Executar o SQL de migração
2. Implementar os endpoints da API
3. Configurar variáveis de ambiente
4. Testar autenticação local e Google
5. Implementar middleware de autenticação
6. Atualizar frontend para usar novos endpoints

---

**Última atualização:** 15/01/2024
**Status:** Pronto para implementação

