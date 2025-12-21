# 🆕 NOVOS ENDPOINTS PARA USUÁRIOS GOOGLE

## Visão Geral

Foram criados dois novos endpoints específicos para usuários Google, separando a atualização de dados pessoais da atualização de endereços. Isso resolve os problemas anteriores e oferece maior flexibilidade.

## 📋 Estrutura das Tabelas

### `google_user_profiles`
- `id` (UUID) - Chave primária
- `google_id` (VARCHAR) - ID único do Google
- `email` (VARCHAR) - Email do usuário
- `nome` (VARCHAR) - Nome completo
- `telefone` (VARCHAR) - Telefone
- `cpf` (VARCHAR) - CPF único
- `data_nascimento` (DATE) - Data de nascimento
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `google_user_addresses`
- `id` (UUID) - Chave primária
- `google_user_id` (UUID) - FK para google_user_profiles
- `cep` (VARCHAR) - CEP
- `logradouro` (VARCHAR) - Rua/Avenida
- `numero` (VARCHAR) - Número
- `bairro` (VARCHAR) - Bairro
- `cidade` (VARCHAR) - Cidade
- `estado` (VARCHAR) - Estado (2 caracteres)
- `complemento` (TEXT) - Complemento (opcional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔗 Novos Endpoints

### 1. Atualizar Dados Pessoais

**PUT** `/api/google-users/personal-data`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "nome": "João Silva Santos",
  "email": "joao.silva@gmail.com",
  "cpf": "12345678901",
  "telefone": "11999887766",
  "data_nascimento": "1990-05-15"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Dados pessoais atualizados com sucesso",
  "profile": {
    "id": "uuid-do-usuario",
    "google_id": "google-id",
    "email": "joao.silva@gmail.com",
    "nome": "João Silva Santos",
    "telefone": "11999887766",
    "cpf": "12345678901",
    "data_nascimento": "1990-05-15",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Erros Possíveis:**
- `400` - Campos obrigatórios faltando
- `400` - CPF já em uso por outro usuário
- `401` - Token inválido ou usuário não autenticado
- `500` - Erro interno do servidor

### 2. Atualizar Endereço

**PUT** `/api/google-users/address`

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Body:**
```json
{
  "cep": "01234-567",
  "logradouro": "Rua das Flores",
  "numero": "123",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "complemento": "Apartamento 45B"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Endereço atualizado com sucesso",
  "address": {
    "id": "uuid-do-endereco",
    "google_user_id": "uuid-do-usuario",
    "cep": "01234-567",
    "logradouro": "Rua das Flores",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "estado": "SP",
    "complemento": "Apartamento 45B",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Erros Possíveis:**
- `400` - Campos obrigatórios faltando
- `401` - Token inválido ou usuário não autenticado
- `500` - Erro interno do servidor

## 💻 Exemplos de Uso no Frontend

### React/TypeScript

```typescript
// Atualizar dados pessoais
const updatePersonalData = async (personalData: {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
}) => {
  try {
    const token = localStorage.getItem('google_token');
    
    const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/personal-data', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(personalData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Dados pessoais atualizados:', result.profile);
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao atualizar dados pessoais:', error);
    throw error;
  }
};

// Atualizar endereço
const updateAddress = async (addressData: {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}) => {
  try {
    const token = localStorage.getItem('google_token');
    
    const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/address', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addressData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Endereço atualizado:', result.address);
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    throw error;
  }
};
```

### JavaScript Vanilla

```javascript
// Função para atualizar dados pessoais
async function atualizarDadosPessoais(dados) {
  const token = localStorage.getItem('google_token');
  
  const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/personal-data', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dados)
  });
  
  return await response.json();
}

// Função para atualizar endereço
async function atualizarEndereco(endereco) {
  const token = localStorage.getItem('google_token');
  
  const response = await fetch('https://back-end-rosia02.vercel.app/api/google-users/address', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(endereco)
  });
  
  return await response.json();
}

// Exemplo de uso
const dadosPessoais = {
  nome: 'João Silva Santos',
  email: 'joao.silva@gmail.com',
  cpf: '12345678901',
  telefone: '11999887766',
  data_nascimento: '1990-05-15'
};

const endereco = {
  cep: '01234-567',
  logradouro: 'Rua das Flores',
  numero: '123',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  complemento: 'Apartamento 45B'
};

// Atualizar dados
atualizarDadosPessoais(dadosPessoais)
  .then(result => console.log('Sucesso:', result))
  .catch(error => console.error('Erro:', error));

atualizarEndereco(endereco)
  .then(result => console.log('Sucesso:', result))
  .catch(error => console.error('Erro:', error));
```

## 🔧 Validações Implementadas

### Dados Pessoais
- ✅ Todos os campos são obrigatórios
- ✅ CPF deve ser único (não pode estar em uso por outro usuário)
- ✅ Email é validado
- ✅ Data de nascimento deve estar no formato YYYY-MM-DD

### Endereço
- ✅ Campos obrigatórios: cep, logradouro, numero, bairro, cidade, estado
- ✅ Complemento é opcional
- ✅ Estado deve ter 2 caracteres (SP, RJ, etc.)
- ✅ Atualiza endereço existente ou cria novo se não existir

## 🚀 Vantagens dos Novos Endpoints

1. **Separação de Responsabilidades**: Dados pessoais e endereço são atualizados independentemente
2. **Melhor UX**: Usuário pode salvar apenas uma seção por vez
3. **Menos Erros**: Validações específicas para cada tipo de dado
4. **Performance**: Atualizações menores e mais rápidas
5. **Flexibilidade**: Frontend pode implementar formulários separados

## 📝 Notas Importantes

- ⚠️ **Token JWT obrigatório**: Todos os endpoints requerem autenticação
- ⚠️ **CORS configurado**: Backend acessível em `https://back-end-rosia02.vercel.app`
- ⚠️ **Validação de CPF**: Sistema impede CPF duplicado
- ⚠️ **Endereço único**: Cada usuário Google pode ter apenas um endereço
- ⚠️ **Campos obrigatórios**: Todos os campos listados como obrigatórios devem ser enviados

## 🔄 Migração do Sistema Antigo

Se você estava usando o endpoint `/profile-update` anterior, pode migrar para os novos endpoints:

**Antes:**
```javascript
// Endpoint antigo (ainda funciona)
fetch('/api/google-users/profile-update', {
  method: 'PUT',
  body: JSON.stringify({ profile: {...}, address: {...} })
});
```

**Agora:**
```javascript
// Novos endpoints separados
fetch('/api/google-users/personal-data', {
  method: 'PUT',
  body: JSON.stringify({ nome, email, cpf, telefone, data_nascimento })
});

fetch('/api/google-users/address', {
  method: 'PUT',
  body: JSON.stringify({ cep, logradouro, numero, bairro, cidade, estado, complemento })
});
```

