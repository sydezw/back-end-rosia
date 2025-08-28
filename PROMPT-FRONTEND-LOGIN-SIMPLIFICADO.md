# Prompt para Frontend - Sistema de Login Admin Simplificado

## Contexto

O backend da aplicação Rosia foi atualizado com um **sistema de login administrativo simplificado** que usa apenas o email do administrador, sem necessidade de senha. Você precisa implementar a interface de login admin no frontend.

## URL da API

**Produção:** `https://back-end-rosia.vercel.app`

## Sistema de Login Simplificado

### Endpoint de Login Admin

**POST** `/admin/auth/login`

**Request:**
```json
{
  "email": "suporte@rosia.com.br"
}
```

**Response de Sucesso:**
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

**Response de Erro:**
```json
{
  "error": "Acesso negado. Email não encontrado ou usuário inativo.",
  "code": "ADMIN_NOT_FOUND"
}
```

## Implementação Requerida

### 1. Página de Login Admin

Crie uma página de login admin com:

- **Campo de Email**: Input para o email do administrador
- **Botão de Login**: Que faz a requisição para `/admin/auth/login`
- **Tratamento de Erros**: Exibir mensagens de erro apropriadas
- **Loading State**: Indicador visual durante a requisição

### 2. Gerenciamento de Estado

Implemente:

```typescript
// Tipos TypeScript
interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  adminId: number;
}

interface AdminSession {
  admin_token: string;
  expires_at: number;
}

interface AdminLoginResponse {
  success: boolean;
  user: AdminUser;
  session: AdminSession;
}

// Hook de Login Admin
const useAdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loginAdmin = async (email: string): Promise<AdminLoginResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro no login');
      }
      
      // Salvar no localStorage
      localStorage.setItem('admin_token', data.session.admin_token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { loginAdmin, loading, error };
};
```

### 3. Proteção de Rotas Admin

Crie um componente de proteção:

```typescript
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('admin_token');
      const user = localStorage.getItem('admin_user');
      
      if (!token || !user) {
        setIsAuthenticated(false);
        return;
      }
      
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(userData.isAdmin === true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);
  
  if (isAuthenticated === null) {
    return <div>Carregando...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};
```

### 4. Interceptor de Requisições

Configure um interceptor para adicionar o token automaticamente:

```typescript
const createAuthenticatedFetch = () => {
  return async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('admin_token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Se token expirou, redirecionar para login
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    
    return response;
  };
};

const authenticatedFetch = createAuthenticatedFetch();
```

### 5. Endpoints Administrativos Disponíveis

Todos requerem o header `Authorization: Bearer <admin_token>`:

- **GET** `/admin/products` - Listar produtos
- **POST** `/admin/products` - Criar produto
- **PUT** `/admin/products/:id` - Atualizar produto
- **DELETE** `/admin/products/:id` - Deletar produto
- **GET** `/admin/orders` - Listar pedidos
- **PUT** `/admin/orders/:id/status` - Atualizar status do pedido

### 6. Interface de Login

Crie uma interface moderna e responsiva:

```jsx
const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const { loginAdmin, loading, error } = useAdminLogin();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await loginAdmin(email);
      navigate('/admin/dashboard');
    } catch (err) {
      // Erro já tratado no hook
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login Administrativo
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Digite seu email de administrador
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="suporte@rosia.com.br"
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading || !email}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## Credenciais de Teste

**Email:** `suporte@rosia.com.br`

## Códigos de Erro para Tratar

- `ADMIN_NOT_FOUND`: "Email não encontrado ou usuário inativo"
- `USER_NOT_FOUND`: "Usuário não encontrado no sistema"
- `TOKEN_EXPIRED`: "Sessão expirada, faça login novamente"
- `MISSING_TOKEN`: "Token de acesso requerido"
- `INVALID_TOKEN`: "Token inválido"

## Próximos Passos

1. Implemente a página de login admin
2. Configure o gerenciamento de estado
3. Crie as rotas protegidas
4. Implemente o dashboard administrativo
5. Teste o fluxo completo de autenticação

## Observações Importantes

- O token expira em 24 horas
- Não há necessidade de senha, apenas email
- O sistema verifica se o admin está ativo
- CORS está configurado para `localhost:8080`
- Use HTTPS em produção