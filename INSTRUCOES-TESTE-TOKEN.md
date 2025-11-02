# Instruções para Testar Token de Autenticação

## Problema Identificado

O erro `401 Unauthorized - Token inválido ou expirado` no endpoint `PUT /api/users/profile` persiste mesmo após as correções implementadas.

## Causa Provável

O middleware `authenticateUser` está funcionando corretamente, mas pode haver um problema com:
1. **Token expirado**: O token do frontend pode ter expirado
2. **Configuração do Supabase**: As variáveis de ambiente podem estar incorretas
3. **Formato do token**: O token pode não estar sendo enviado no formato correto

## Como Testar com Token Real

### 1. Obter Token Válido do Frontend

No seu frontend, adicione este código para capturar o token atual:

```javascript
// No console do navegador ou em um componente
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  console.log('Token atual:', session.access_token);
  console.log('Expira em:', new Date(session.expires_at * 1000));
} else {
  console.log('Usuário não está logado');
}
```

### 2. Testar Token no Backend

Use o token obtido para testar o endpoint:

```powershell
# Substitua SEU_TOKEN_AQUI pelo token real
$token = "SEU_TOKEN_AQUI"
$headers = @{ 
  'Authorization' = "Bearer $token"; 
  'Content-Type' = 'application/json' 
}

# Testar endpoint de perfil
try {
  $response = Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/users/profile' -Method GET -Headers $headers
  Write-Host "✅ Sucesso: $($response | ConvertTo-Json)"
} catch {
  Write-Host "❌ Erro: $($_.Exception.Message)"
}
```

### 3. Testar Novo Endpoint de Configuração

```powershell
# Dados de teste para configuração completa
$dadosCompletos = @{
  cpf = '12345678901'
  telefone = '11987654321'
  data_nascimento = '1990-01-01'
  cep = '01234567'
  logradouro = 'Rua Teste'
  numero = '123'
  bairro = 'Centro'
  cidade = 'São Paulo'
  estado = 'SP'
  complemento = 'Apto 45'
} | ConvertTo-Json

# Testar endpoint de configuração completa
try {
  $response = Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/profile-config/complete' -Method PUT -Headers $headers -Body $dadosCompletos
  Write-Host "✅ Configuração salva: $($response | ConvertTo-Json)"
} catch {
  Write-Host "❌ Erro na configuração: $($_.Exception.Message)"
}
```

## Verificações Necessárias

### 1. Verificar Variáveis de Ambiente no Vercel

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role (se necessário)

### 2. Verificar Tabelas no Supabase

Certifique-se de que as tabelas existem:

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'user_addresses');

-- Criar tabelas se não existirem
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT,
  telefone TEXT,
  data_nascimento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  complemento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Configurar Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para user_addresses
CREATE POLICY "Users can view own address" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own address" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own address" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id);
```

## Próximos Passos

1. **Obter token real** do frontend usando o código JavaScript acima
2. **Testar endpoints** com o token real
3. **Verificar tabelas** no Supabase
4. **Configurar políticas RLS** se necessário
5. **Atualizar frontend** para usar os novos endpoints

## Endpoints Disponíveis

- `GET /api/users/profile` - Buscar perfil (corrigido para Supabase auth)
- `PUT /api/users/profile` - Atualizar perfil (corrigido para Supabase auth)
- `GET /api/profile-config/complete` - Buscar configuração completa
- `PUT /api/profile-config/complete` - Salvar configuração completa
- `GET /api/debug/token` - Debug de token (sem autenticação)

Todos os endpoints protegidos agora usam `authenticateUser` (Supabase) em vez de `authenticateToken` (JWT personalizado).

