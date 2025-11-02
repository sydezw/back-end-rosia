# Sistema Separado para Usuários Google

## Visão Geral

Este sistema foi criado para resolver problemas de conflitos de ID entre usuários do Google e usuários normais. Agora temos tabelas e endpoints completamente separados para usuários que fazem login via Google.

## Estrutura do Sistema

### Tabelas do Banco de Dados

#### 1. `google_user_profiles`
```sql
CREATE TABLE google_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL, -- ID único do Google
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `google_user_addresses`
```sql
CREATE TABLE google_user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_user_id UUID NOT NULL REFERENCES google_user_profiles(id) ON DELETE CASCADE,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    complemento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Endpoints da API

#### Autenticação Google
- **POST** `/api/auth/login/google-separated`
  - Faz login usando as tabelas separadas do Google
  - Retorna token JWT específico para usuários Google
  - Payload: `{ email, name, picture, email_verified, sub }`

#### Perfil Google
- **GET** `/api/google-users/profile`
  - Busca perfil do usuário Google autenticado
  - Requer token de usuário Google

- **PUT** `/api/google-users/profile-update`
  - Atualiza perfil e endereço do usuário Google
  - Payload: `{ profile: {...}, address: {...} }`

#### Endereços Google
- **GET** `/api/google-users/addresses`
  - Lista endereços do usuário Google autenticado

## Como Usar no Frontend

### 1. Login Google
```typescript
import { API_ENDPOINTS } from './config/api';

// Usar o novo endpoint separado
const response = await fetch(API_ENDPOINTS.AUTH.GOOGLE_LOGIN_SEPARATED, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    email_verified: googleUser.email_verified,
    sub: googleUser.sub
  })
});
```

### 2. Requisições Autenticadas
```typescript
// Buscar perfil Google
const profileResponse = await fetch(API_ENDPOINTS.GOOGLE_USERS.PROFILE, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Atualizar perfil Google
const updateResponse = await fetch(API_ENDPOINTS.GOOGLE_USERS.UPDATE_PROFILE, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    profile: {
      nome: 'Nome Completo',
      telefone: '11999999999',
      cpf: '12345678901',
      data_nascimento: '1990-01-01'
    },
    address: {
      logradouro: 'Rua Exemplo',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567',
      complemento: 'Apto 45'
    }
  })
});
```

## Diferenças do Sistema Antigo

### Vantagens
1. **Sem conflitos de ID**: Usuários Google têm suas próprias tabelas
2. **Autenticação específica**: Middleware dedicado para usuários Google
3. **Tokens específicos**: JWT com payload específico para Google
4. **Isolamento completo**: Não interfere com usuários normais

### Token JWT Google
```json
{
  "googleUserId": "uuid-do-usuario-google",
  "googleId": "id-do-google",
  "email": "usuario@gmail.com",
  "provider": "google-separated"
}
```

## Migração

### Para usar o novo sistema:

1. **Execute o SQL de criação das tabelas**:
   ```bash
   # No Supabase Dashboard, execute o arquivo:
   database/google-user-tables.sql
   ```

2. **Atualize o frontend**:
   ```typescript
   // Trocar de:
   API_ENDPOINTS.AUTH.GOOGLE_LOGIN
   
   // Para:
   API_ENDPOINTS.AUTH.GOOGLE_LOGIN_SEPARATED
   ```

3. **Use os novos endpoints para perfil**:
   ```typescript
   // Em vez de /api/users/profile-update
   // Use: /api/google-users/profile-update
   ```

## Compatibilidade

- O sistema antigo continua funcionando
- Usuários existentes não são afetados
- Novos usuários Google usarão o sistema separado
- Possível migração gradual

## Logs e Debug

O sistema inclui logs detalhados:
- `🔍 POST /api/auth/login/google-separated` - Login Google
- `🔐 Google Auth Debug` - Autenticação de token
- `✅ Usuário Google autenticado` - Sucesso na autenticação
- `❌ Token não é de usuário Google separado` - Erro de token

## Próximos Passos

1. Testar o sistema completo
2. Migrar frontend para usar novos endpoints
3. Monitorar logs para garantir funcionamento
4. Considerar migração de usuários existentes (opcional)

---

**Nota**: Este sistema resolve definitivamente os problemas de conflito de ID que estavam causando erros na criação de endereços e perfis de usuários Google.

