# Soluções Implementadas - Configuração de Perfil

## Problema Resolvido

O erro `403 Forbidden - Token inválido ou expirado` no endpoint `PUT /api/users/profile` foi causado por incompatibilidade entre os tipos de token:
- **Frontend**: Enviava tokens do Supabase
- **Backend**: Esperava JWT personalizado

## Alterações Realizadas

### 1. Correção do Middleware de Autenticação

**Arquivo**: `routes/users.js`
- ✅ Alterado de `authenticateToken` (JWT personalizado) para `authenticateUser` (Supabase)
- ✅ Agora aceita tokens do Supabase corretamente

### 2. Novo Endpoint de Configuração Completa

**Arquivo**: `routes/profile-config.js` (NOVO)
- ✅ Endpoint: `PUT /api/profile-config/complete`
- ✅ Endpoint: `GET /api/profile-config/complete`
- ✅ Separação correta dos dados:
  - **user_profiles**: CPF, telefone, data_nascimento
  - **user_addresses**: CEP, logradouro, número, bairro, cidade, estado, complemento

### 3. Validações Implementadas

- ✅ **CPF**: Formato e dígitos verificadores
- ✅ **Telefone**: Formato brasileiro (11 dígitos)
- ✅ **CEP**: Formato brasileiro (8 dígitos)
- ✅ **Data de nascimento**: Formato ISO e idade mínima
- ✅ **Campos obrigatórios**: Nome, logradouro, número, bairro, cidade, estado

## Como Usar os Novos Endpoints

### Endpoint de Configuração Completa

```javascript
// PUT /api/profile-config/complete
const dadosCompletos = {
  // Dados para user_profiles
  cpf: '12345678901',
  telefone: '11987654321', 
  data_nascimento: '1990-01-01',
  
  // Dados para user_addresses
  cep: '01234567',
  logradouro: 'Rua Exemplo',
  numero: '123',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  complemento: 'Apto 45' // Opcional
};

// Headers necessários
const headers = {
  'Authorization': `Bearer ${supabaseToken}`,
  'Content-Type': 'application/json'
};
```

### Endpoint de Consulta

```javascript
// GET /api/profile-config/complete
// Retorna dados completos do perfil e endereço
const response = await fetch('/api/profile-config/complete', {
  headers: {
    'Authorization': `Bearer ${supabaseToken}`
  }
});
```

## Estrutura das Tabelas no Supabase

### user_profiles
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key para auth.users)
- cpf (text)
- telefone (text)
- data_nascimento (date)
- created_at (timestamp)
- updated_at (timestamp)
```

### user_addresses
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key para auth.users)
- cep (text)
- logradouro (text)
- numero (text)
- bairro (text)
- cidade (text)
- estado (text)
- complemento (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## Status Atual

- ✅ **Middleware corrigido**: Aceita tokens do Supabase
- ✅ **Endpoints criados**: Configuração completa implementada
- ✅ **Validações ativas**: CPF, telefone, CEP, campos obrigatórios
- ✅ **Deploy realizado**: Alterações no ar
- ⚠️ **Teste pendente**: Necessário token válido do Supabase para teste completo

## Próximos Passos

1. **Frontend**: Atualizar para usar o novo endpoint `/api/profile-config/complete`
2. **Teste**: Validar com token real do Supabase
3. **Supabase**: Verificar se as tabelas `user_profiles` e `user_addresses` existem
4. **Políticas RLS**: Configurar permissões no Supabase se necessário

## Observações Importantes

- O endpoint antigo `/api/users/profile` ainda funciona, mas agora usa autenticação Supabase
- O novo endpoint `/api/profile-config/complete` é mais robusto e completo
- Todas as validações são feitas no backend antes de salvar no banco
- Os dados são separados corretamente entre as duas tabelas