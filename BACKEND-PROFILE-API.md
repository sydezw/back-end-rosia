# API Backend - Perfil do Usuário (Minhas Informações)

## Visão Geral

Esta documentação descreve a API backend específica para a funcionalidade **"Minhas Informações"** da aplicação Rosia Loja. O foco é exclusivamente no gerenciamento de dados pessoais do usuário.

## Estrutura do Banco de Dados

### Tabela: `usuarios`

```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    telefone VARCHAR(20),
    data_nascimento DATE,
    avatar_url TEXT,
    email_verificado BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    criadoem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizadoem TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: `user_addresses`

```sql
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Chave estrangeira para auth.users.id - Supabase Auth
    name VARCHAR(100) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Endpoints da API

### 1. Obter Informações do Perfil

**GET** `/api/profile`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "telefone": "(11) 99999-9999",
    "data_nascimento": "1990-01-15",
    "avatar_url": "https://...",
    "email_verificado": true,
    "ultimo_login": "2024-01-15T10:30:00Z",
    "criadoem": "2024-01-01T00:00:00Z"
  }
}
```

### 1.1. Listar Endereços de Entrega

**GET** `/api/profile/addresses`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Casa",
      "logradouro": "Rua das Flores",
      "numero": "123",
      "complemento": "Apto 45",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234-567",
      "is_default": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 1.2. Criar Novo Endereço de Entrega

**POST** `/api/profile/addresses`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Trabalho",
  "logradouro": "Av. Paulista",
  "numero": "1000",
  "complemento": "Sala 101",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01310-100",
  "is_default": false
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Endereço criado com sucesso",
  "data": {
    "id": "uuid",
    "name": "Trabalho",
    "logradouro": "Av. Paulista",
    "numero": "1000",
    "complemento": "Sala 101",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01310-100",
    "is_default": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 1.3. Atualizar Endereço de Entrega

**PUT** `/api/profile/addresses/:id`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Casa Atualizada",
  "logradouro": "Rua das Rosas",
  "numero": "456",
  "complemento": "Casa 2",
  "bairro": "Jardim",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01234-567"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Endereço atualizado com sucesso",
  "data": {
    "id": "uuid",
    "name": "Casa Atualizada",
    "logradouro": "Rua das Rosas",
    "numero": "456",
    "complemento": "Casa 2",
    "bairro": "Jardim",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "is_default": true,
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### 1.4. Excluir Endereço de Entrega

**DELETE** `/api/profile/addresses/:id`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Endereço excluído com sucesso"
}
```

### 1.5. Definir Endereço Padrão

**PUT** `/api/profile/addresses/:id/default`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "João Silva",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "telefone": "(11) 99999-9999",
    "data_nascimento": "1990-01-15",
    "avatar_url": "https://...",
    "email_verificado": true,
    "ultimo_login": "2024-01-15T10:30:00Z",
    "criadoem": "2024-01-01T00:00:00Z"
  }
}
```

### 2. Atualizar Informações do Perfil

**PUT** `/api/profile`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "nome": "João Silva Santos",
  "cpf": "123.456.789-00",
  "telefone": "(11) 98888-8888",
  "data_nascimento": "1990-01-15"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "data": {
    "id": "uuid",
    "nome": "João Silva Santos",
    "email": "joao@email.com",
    "cpf": "123.456.789-00",
    "telefone": "(11) 98888-8888",
    "data_nascimento": "1990-01-15",
    "atualizadoem": "2024-01-15T10:35:00Z"
  }
}
```

### 3. Upload de Avatar

**POST** `/api/profile/avatar`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

**Body:**
```
file: [arquivo de imagem]
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Avatar atualizado com sucesso",
  "data": {
    "avatar_url": "https://storage.example.com/avatars/user-uuid.jpg"
  }
}
```

## Validações

### Validações de Campo

#### Perfil do Usuário

1. **Nome:**
   - Obrigatório
   - Mínimo 2 caracteres
   - Máximo 255 caracteres
   - Apenas letras e espaços

2. **CPF:**
   - Formato: 000.000.000-00
   - Validação de dígitos verificadores
   - Único no sistema

3. **Telefone:**
   - Formato: (00) 00000-0000 ou (00) 0000-0000
   - Opcional

4. **Data de Nascimento:**
   - Formato: YYYY-MM-DD
   - Idade mínima: 13 anos
   - Opcional

5. **Avatar:**
   - Formatos aceitos: JPG, PNG, WEBP
   - Tamanho máximo: 5MB
   - Dimensões máximas: 1024x1024px

#### Endereços de Entrega

1. **Nome do Endereço:**
   - Obrigatório
   - Mínimo 2 caracteres
   - Máximo 100 caracteres
   - Exemplos: "Casa", "Trabalho", "Casa da Mãe"

2. **Logradouro:**
   - Obrigatório
   - Mínimo 5 caracteres
   - Máximo 255 caracteres

3. **Número:**
   - Obrigatório
   - Máximo 20 caracteres
   - Formato: Números e letras (ex: "123", "123A", "S/N")

4. **Complemento:**
   - Opcional
   - Máximo 100 caracteres
   - Exemplos: "Apto 45", "Bloco B", "Casa 2"

5. **Bairro:**
   - Obrigatório
   - Mínimo 2 caracteres
   - Máximo 100 caracteres

6. **Cidade:**
   - Obrigatório
   - Mínimo 2 caracteres
   - Máximo 100 caracteres

7. **Estado:**
   - Obrigatório
   - Formato: 2 caracteres (sigla do estado)
   - Validação: Lista de estados brasileiros válidos

8. **CEP:**
   - Obrigatório
   - Formato: XXXXX-XXX ou XXXXXXXX
   - Validação: Formato brasileiro de CEP

### Exemplo de Validação no Backend (Node.js)

```javascript
const validateProfileData = (data) => {
  const errors = [];

  // Validar nome
  if (!data.nome || data.nome.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  // Validar CPF
  if (data.cpf && !isValidCPF(data.cpf)) {
    errors.push('CPF inválido');
  }

  // Validar telefone
  if (data.telefone && !isValidPhone(data.telefone)) {
    errors.push('Telefone inválido');
  }

  // Validar data de nascimento
  if (data.data_nascimento) {
    const birthDate = new Date(data.data_nascimento);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 13);
    
    if (birthDate > minAge) {
      errors.push('Idade mínima é 13 anos');
    }
  }

  return errors;
};

// Validação de dados de endereço
const validateAddressData = (data) => {
  const errors = [];
  
  // Nome do endereço
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Nome do endereço deve ter pelo menos 2 caracteres');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Nome do endereço deve ter no máximo 100 caracteres');
  }
  
  // Logradouro
  if (!data.logradouro || data.logradouro.trim().length < 5) {
    errors.push('Logradouro deve ter pelo menos 5 caracteres');
  }
  if (data.logradouro && data.logradouro.length > 255) {
    errors.push('Logradouro deve ter no máximo 255 caracteres');
  }
  
  // Número
  if (!data.numero || data.numero.trim().length === 0) {
    errors.push('Número é obrigatório');
  }
  if (data.numero && data.numero.length > 20) {
    errors.push('Número deve ter no máximo 20 caracteres');
  }
  
  // Complemento (opcional)
  if (data.complemento && data.complemento.length > 100) {
    errors.push('Complemento deve ter no máximo 100 caracteres');
  }
  
  // Bairro
  if (!data.bairro || data.bairro.trim().length < 2) {
    errors.push('Bairro deve ter pelo menos 2 caracteres');
  }
  if (data.bairro && data.bairro.length > 100) {
    errors.push('Bairro deve ter no máximo 100 caracteres');
  }
  
  // Cidade
  if (!data.cidade || data.cidade.trim().length < 2) {
    errors.push('Cidade deve ter pelo menos 2 caracteres');
  }
  if (data.cidade && data.cidade.length > 100) {
    errors.push('Cidade deve ter no máximo 100 caracteres');
  }
  
  // Estado
  if (!data.estado || data.estado.length !== 2) {
    errors.push('Estado deve ter exatamente 2 caracteres');
  }
  
  const validStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  if (data.estado && !validStates.includes(data.estado.toUpperCase())) {
    errors.push('Estado inválido');
  }
  
  // CEP
  if (!data.cep) {
    errors.push('CEP é obrigatório');
  } else {
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!cepRegex.test(data.cep)) {
      errors.push('CEP deve estar no formato XXXXX-XXX ou XXXXXXXX');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## Middleware de Autenticação

```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
};
```

## Controllers

### ProfileController

```javascript
class ProfileController {
  // GET /api/profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Remover dados sensíveis
      const { senha_hash, ...userData } = user;
      
      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // PUT /api/profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      // Validar dados
      const errors = validateProfileData(updateData);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors
        });
      }

      // Verificar se CPF já existe (se fornecido)
      if (updateData.cpf) {
        const existingUser = await User.findByCPF(updateData.cpf);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'CPF já cadastrado'
          });
        }
      }

      // Atualizar usuário
      const updatedUser = await User.update(userId, updateData);
      
      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: updatedUser
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/profile/avatar
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo não fornecido'
        });
      }

      // Upload para storage (AWS S3, Cloudinary, etc.)
      const avatarUrl = await uploadToStorage(file, `avatars/${userId}`);
      
      // Atualizar URL do avatar no banco
      await User.updateAvatar(userId, avatarUrl);
      
      res.json({
        success: true,
        message: 'Avatar atualizado com sucesso',
        data: { avatar_url: avatarUrl }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
```

### AddressController

```javascript
class AddressController {
  // GET /api/profile/addresses
  async getAddresses(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await db.query(
        'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC',
        [userId]
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/profile/addresses
  async createAddress(req, res) {
    try {
      const userId = req.user.id;
      const { name, logradouro, numero, complemento, bairro, cidade, estado, cep, is_default } = req.body;
      
      // Validação dos dados
      const validation = validateAddressData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors
        });
      }

      // Se for endereço padrão, remover padrão dos outros
      if (is_default) {
        await db.query(
          'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
          [userId]
        );
      }
      
      const result = await db.query(
        `INSERT INTO user_addresses (user_id, name, logradouro, numero, complemento, bairro, cidade, estado, cep, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, name, logradouro, numero, complemento, bairro, cidade, estado, cep, is_default || false]
      );
      
      res.status(201).json({
        success: true,
        message: 'Endereço criado com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao criar endereço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // PUT /api/profile/addresses/:id
  async updateAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const { name, logradouro, numero, complemento, bairro, cidade, estado, cep } = req.body;
      
      // Validação dos dados
      const validation = validateAddressData(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: validation.errors
        });
      }

      // Verificar se o endereço pertence ao usuário
      const checkResult = await db.query(
        'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      const result = await db.query(
        `UPDATE user_addresses 
         SET name = $1, logradouro = $2, numero = $3, complemento = $4, bairro = $5, cidade = $6, estado = $7, cep = $8, updated_at = NOW()
         WHERE id = $9 AND user_id = $10
         RETURNING *`,
        [name, logradouro, numero, complemento, bairro, cidade, estado, cep, addressId, userId]
      );
      
      res.json({
        success: true,
        message: 'Endereço atualizado com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // DELETE /api/profile/addresses/:id
  async deleteAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário
      const checkResult = await db.query(
        'SELECT id, is_default FROM user_addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      // Deletar o endereço
      await db.query(
        'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      );
      
      // Se era o endereço padrão, definir outro como padrão
      if (checkResult.rows[0].is_default) {
        await db.query(
          `UPDATE user_addresses 
           SET is_default = TRUE 
           WHERE user_id = $1 
           AND id = (SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1)`,
          [userId]
        );
      }
      
      res.json({
        success: true,
        message: 'Endereço excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir endereço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // PUT /api/profile/addresses/:id/default
  async setDefaultAddress(req, res) {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      // Verificar se o endereço pertence ao usuário
      const checkResult = await db.query(
        'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
        [addressId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Endereço não encontrado'
        });
      }
      
      // Remover padrão de todos os endereços do usuário
      await db.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
      
      // Definir o endereço como padrão
      const result = await db.query(
        'UPDATE user_addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
        [addressId, userId]
      );
      
      res.json({
        success: true,
        message: 'Endereço padrão definido com sucesso',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Erro ao definir endereço padrão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
```

## Rotas

```javascript
const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/ProfileController');
const AddressController = require('../controllers/AddressController');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');

const profileController = new ProfileController();
const addressController = new AddressController();

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticateToken);

// Rotas do perfil
router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.post('/profile/avatar', upload.single('file'), profileController.uploadAvatar);

// Rotas de endereços
router.get('/profile/addresses', addressController.getAddresses);
router.post('/profile/addresses', addressController.createAddress);
router.put('/profile/addresses/:id', addressController.updateAddress);
router.delete('/profile/addresses/:id', addressController.deleteAddress);
router.put('/profile/addresses/:id/default', addressController.setDefaultAddress);

module.exports = router;
```

## Códigos de Erro

| Código | Descrição |
|--------|----------|
| 400 | Dados inválidos ou malformados |
| 401 | Token de autenticação não fornecido |
| 403 | Token de autenticação inválido |
| 404 | Usuário não encontrado |
| 409 | CPF já cadastrado |
| 413 | Arquivo muito grande |
| 415 | Tipo de arquivo não suportado |
| 500 | Erro interno do servidor |

## Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/rosia_db

# JWT
JWT_SECRET=sua_chave_secreta_muito_forte
JWT_EXPIRES_IN=7d

# Upload de arquivos
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Storage (exemplo AWS S3)
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_BUCKET_NAME=rosia-avatars
AWS_REGION=us-east-1
```

## Dependências Necessárias

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5",
    "pg": "^8.8.0",
    "joi": "^17.7.0",
    "aws-sdk": "^2.1200.0",
    "sharp": "^0.32.0"
  }
}
```

## Notas Importantes

1. **Segurança:**
   - Sempre validar e sanitizar dados de entrada
   - Usar HTTPS em produção
   - Implementar rate limiting
   - Logs de auditoria para alterações de perfil

2. **Performance:**
   - Implementar cache para dados de perfil
   - Otimizar queries do banco de dados
   - Compressão de imagens de avatar

3. **Backup:**
   - Backup regular do banco de dados
   - Backup de arquivos de avatar

4. **Monitoramento:**
   - Logs de erro detalhados
   - Métricas de performance
   - Alertas para falhas críticas