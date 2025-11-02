# Guia Completo: Login Admin no Frontend

## ✅ Status do Backend
**FUNCIONANDO 100%** - O endpoint de login admin está operacional e retornando o token corretamente.

## 🔧 Endpoint de Login Admin

**URL:** `https://back-end-rosia.vercel.app/admin/auth/login`
**Método:** POST
**Content-Type:** application/json

### Requisição:
```json
{
  "email": "suporte@rosia.com.br"
}
```

### Resposta de Sucesso:
```json
{
  "success": true,
  "admin_token": "Y2E5OWZiMmMtZmQ4OC00YzQ2LWIzMmUtZWZmMWQyZWI2MDk0OnN1cG9ydGVAcm9zaWEuY29tLmJyOjE3NTY2NjY5NDIwNTk=",
  "user": {
    "id": "c47a7779-d9bb-4e45-8477-0ee1e0be27c7",
    "email": "suporte@rosia.com.br",
    "name": "Admin",
    "role": "admin",
    "permissions": [
      "products.create",
      "products.read",
      "products.update",
      "products.delete",
      "orders.read",
      "orders.update",
      "dashboard.read"
    ],
    "avatar": null,
    "created_at": "2025-08-28T15:19:18.565124Z"
  },
  "session": {
    "expires_at": 1756753342059
  }
}
```

## 📋 Checklist de Implementação Frontend

### 1. ✅ Hook useAdminLogin

**O que deve fazer:**
- [ ] Fazer requisição POST para o endpoint de login
- [ ] Salvar `isAdmin: true` no localStorage
- [ ] Salvar `admin_token` no localStorage
- [ ] Salvar dados do usuário no localStorage
- [ ] Retornar estado de loading e erro

**Exemplo de implementação:**
```javascript
const useAdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://back-end-rosia.vercel.app/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // ✅ CRÍTICO: Salvar isAdmin: true
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('admin_token', data.admin_token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Erro no login');
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
```

### 2. ✅ Componente AdminRoute

**O que deve verificar:**
- [ ] Ler `userData.isAdmin` do localStorage
- [ ] Verificar se é exatamente `true` (string ou boolean)
- [ ] Redirecionar para login se não for admin
- [ ] Permitir acesso se for admin

**Exemplo de implementação:**
```javascript
const AdminRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = () => {
      // ✅ CRÍTICO: Verificar isAdmin no localStorage
      const isAdmin = localStorage.getItem('isAdmin');
      const adminToken = localStorage.getItem('admin_token');
      
      // Verificar se isAdmin é 'true' (string) ou true (boolean)
      if ((isAdmin === 'true' || isAdmin === true) && adminToken) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  if (loading) {
    return <div>Carregando...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};
```

### 3. ✅ Página de Login Admin

**Elementos necessários:**
- [ ] Campo de email
- [ ] Botão de login
- [ ] Estado de loading
- [ ] Exibição de erros
- [ ] Redirecionamento após sucesso

**Exemplo de implementação:**
```javascript
const AdminLogin = () => {
  const [email, setEmail] = useState('suporte@rosia.com.br');
  const { login, loading, error } = useAdminLogin();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await login(email);
    
    if (result.success) {
      // ✅ CRÍTICO: Redirecionar para dashboard
      navigate('/admin/dashboard');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email do administrador"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

### 4. ✅ Configuração de Rotas

**Estrutura necessária:**
```javascript
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública de login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Rotas protegidas */}
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        
        <Route path="/admin/products" element={
          <AdminRoute>
            <AdminProducts />
          </AdminRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};
```

## 🔍 Debugging - O que Verificar

### Se o login não funcionar:
1. **Verificar no Network tab:** A requisição está sendo feita corretamente?
2. **Verificar no Console:** Há erros JavaScript?
3. **Verificar no localStorage:** Os dados estão sendo salvos?
   - `isAdmin` deve ser `'true'`
   - `admin_token` deve ter um valor base64
   - `userData` deve ter os dados do usuário

### Se o redirecionamento não funcionar:
1. **Verificar AdminRoute:** Está lendo `isAdmin` corretamente?
2. **Verificar navegação:** O `navigate('/admin/dashboard')` está sendo chamado?
3. **Verificar rotas:** A rota `/admin/dashboard` existe?

## 🚀 Próximos Passos

Após implementar o login:
1. Criar dashboard admin
2. Implementar logout (limpar localStorage)
3. Adicionar verificação de expiração do token
4. Implementar criação de produtos

## 📞 Suporte

Se ainda houver problemas:
1. Verificar se o email está correto: `suporte@rosia.com.br`
2. Confirmar que o backend está respondendo
3. Verificar se o localStorage está sendo usado corretamente

**O backend está 100% funcional e pronto para uso!**

