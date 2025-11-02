# 🔐 Exemplo de Login para Frontend

## ❌ Problema Identificado
O frontend está enviando requisições com `body: undefined` para `/api/auth/login`, causando erro 400.

## ✅ Solução: Como Fazer Login Corretamente

### 📋 Formato da Requisição
```javascript
// Exemplo usando fetch
const loginUser = async (email, password) => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro no login');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};
```

### 🔧 Exemplo usando Axios
```javascript
import axios from 'axios';

const loginUser = async (email, password) => {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || 'Erro no login');
    }
    throw error;
  }
};
```

### 📝 Dados Obrigatórios
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

### 📤 Resposta de Sucesso (200)
```json
{
  "success": true,
  "user": {
    "id": "uuid-do-usuario",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "avatar": "url-do-avatar"
  },
  "session": {
    "access_token": "token-jwt",
    "refresh_token": "refresh-token",
    "expires_at": 1234567890
  }
}
```

### ❌ Resposta de Erro (400)
```json
{
  "error": "Email e senha são obrigatórios"
}
```

### ❌ Resposta de Erro (401)
```json
{
  "error": "Credenciais inválidas",
  "details": "Invalid login credentials"
}
```

## 🔍 Verificações do Frontend

### 1. Headers Corretos
- ✅ `Content-Type: application/json`
- ✅ Método: `POST`

### 2. Body Correto
- ✅ JSON válido com `email` e `password`
- ✅ Usar `JSON.stringify()` se usando fetch
- ✅ Não enviar body vazio ou undefined

### 3. URL Correta
- ✅ `http://localhost:3001/api/auth/login`
- ✅ Incluir `/api` no prefixo

## 🧪 Teste Manual (PowerShell)
```powershell
$headers = @{'Content-Type' = 'application/json'}
$body = @{
  email = 'usuario@exemplo.com'
  password = 'senha123'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/login' -Method POST -Headers $headers -Body $body
```

## 🚨 Problemas Comuns

1. **Body undefined**: Frontend não está enviando dados
2. **Headers incorretos**: Faltando `Content-Type: application/json`
3. **URL errada**: Esquecendo o prefixo `/api`
4. **JSON inválido**: Erro na serialização dos dados

## ✅ Status dos Testes
- ✅ Backend funcionando (teste PowerShell = 401 com credenciais inválidas)
- ✅ Rota `/api/auth/login` existe e responde
- ✅ Parsing JSON funcionando no backend
- ❌ Frontend enviando `body: undefined`

**Próximo passo**: Verificar como o frontend está construindo a requisição de login.

