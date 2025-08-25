# 🚀 Exemplos de Integração Frontend-Backend

Este diretório contém exemplos práticos de como integrar o frontend React/TypeScript com o backend Node.js da Rosita Floral Elegance.

## 📁 Arquivos Incluídos

### 🔧 Configuração Base
- **`api.ts`** - Configuração do Axios com interceptors para autenticação automática

### 🎣 Hooks Personalizados
- **`useLogin.ts`** - Hook para login normal (email/senha)
- **`useRegister.ts`** - Hook para registro de usuários
- **`useSocialLogin.ts`** - Hook para login social (Google/Facebook)

### 🧩 Componentes de Exemplo
- **`AuthExample.tsx`** - Componente completo para testar autenticação

### 📚 Documentação
- **`frontend-integration.js`** - Guia completo com todas as funções de integração

## 🚀 Como Usar

### 1. Configurar a API Base

Primeiro, certifique-se de que o arquivo `api.ts` está configurado com a URL correta:

```typescript
// api.ts
const api = axios.create({
  baseURL: 'http://localhost:3001/api', // URL do seu backend
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 2. Usar os Hooks de Autenticação

#### Login Normal
```typescript
import { useLogin } from './useLogin';

function LoginComponent() {
  const { login, loading, error } = useLogin();

  const handleLogin = async () => {
    try {
      const result = await login('user@email.com', 'password123');
      console.log('Usuário logado:', result.user);
    } catch (err) {
      console.error('Erro no login:', err);
    }
  };

  return (
    <button onClick={handleLogin} disabled={loading}>
      {loading ? 'Carregando...' : 'Login'}
    </button>
  );
}
```

#### Registro de Usuário
```typescript
import { useRegister } from './useRegister';

function RegisterComponent() {
  const { register, loading, error } = useRegister();

  const handleRegister = async () => {
    try {
      const result = await register({
        name: 'João Silva',
        email: 'joao@email.com',
        password: 'senha123'
      });
      console.log('Usuário registrado:', result.user);
    } catch (err) {
      console.error('Erro no registro:', err);
    }
  };

  return (
    <button onClick={handleRegister} disabled={loading}>
      {loading ? 'Carregando...' : 'Registrar'}
    </button>
  );
}
```

#### Login Social
```typescript
import { useSocialLogin } from './useSocialLogin';

function SocialLoginComponent() {
  const { initiateGoogleLogin, initiateFacebookLogin, loading } = useSocialLogin();

  return (
    <div>
      <button onClick={initiateGoogleLogin} disabled={loading}>
        Login com Google
      </button>
      <button onClick={initiateFacebookLogin} disabled={loading}>
        Login com Facebook
      </button>
    </div>
  );
}
```

### 3. Testar com o Componente de Exemplo

Use o `AuthExample.tsx` para testar todas as funcionalidades:

```typescript
import AuthExample from './AuthExample';

function App() {
  return (
    <div>
      <h1>Teste de Autenticação</h1>
      <AuthExample />
    </div>
  );
}
```

## 🔐 Funcionalidades Implementadas

### ✅ Autenticação
- [x] Login com email/senha
- [x] Registro de usuários
- [x] Login social (Google/Facebook)
- [x] Renovação automática de tokens
- [x] Logout automático em caso de erro
- [x] Interceptors para requisições autenticadas

### ✅ Gerenciamento de Estado
- [x] Armazenamento seguro de tokens
- [x] Persistência de dados do usuário
- [x] Estados de loading e erro
- [x] Validações de entrada

### ✅ Segurança
- [x] Tokens JWT com renovação automática
- [x] Interceptors para autenticação
- [x] Limpeza automática em caso de erro
- [x] Timeout de requisições

## 🛠️ Configuração para Produção

### 1. Variáveis de Ambiente

Crie um arquivo `.env` no seu projeto frontend:

```env
# URLs da API
REACT_APP_API_URL=https://seu-backend.railway.app/api
REACT_APP_FRONTEND_URL=https://seu-frontend.vercel.app

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=seu_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=seu_google_client_secret

# Facebook OAuth
REACT_APP_FACEBOOK_APP_ID=seu_facebook_app_id
```

### 2. Atualizar Configuração da API

```typescript
// api.ts
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://seu-backend.railway.app/api';
  }
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## 🔍 Debugging e Logs

Em desenvolvimento, os interceptors automaticamente logam:
- 🚀 Requisições enviadas
- ✅ Respostas recebidas
- ❌ Erros encontrados
- 🔄 Renovações de token

## 📝 Próximos Passos

1. **Copie os arquivos necessários** para seu projeto frontend
2. **Configure as URLs** no arquivo `api.ts`
3. **Teste a autenticação** com o `AuthExample.tsx`
4. **Implemente os hooks** nos seus componentes
5. **Configure OAuth** para Google e Facebook
6. **Deploy** e teste em produção

## 🆘 Solução de Problemas

### Erro de CORS
```
Access to XMLHttpRequest at 'http://localhost:3001' from origin 'http://localhost:3000' has been blocked by CORS policy
```
**Solução:** Verifique se o backend está configurado com CORS para sua URL frontend.

### Token Expirado
```
401 Unauthorized
```
**Solução:** Os interceptors devem renovar automaticamente. Verifique se o refresh_token está válido.

### Erro de Conexão
```
Network Error
```
**Solução:** Verifique se o backend está rodando e a URL está correta.

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console
2. Confirme se o backend está rodando
3. Teste os endpoints diretamente com curl/Postman
4. Verifique as configurações de CORS

---

**🌹 Rosita Floral Elegance - Sistema de E-commerce Completo**