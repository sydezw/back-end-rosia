# Problemas de Token no Endpoint de Perfil - Backend

## 🚨 Erro Atual

**Endpoint:** `PUT https://back-end-rosia02.vercel.app/api/users/profile`  
**Status:** 403 (Forbidden)  
**Resposta:** `{"success":false,"message":"Token inválido","code":"INVALID_TOKEN"}`

## 📋 Análise do Problema

### 1. **Validação de Token JWT**

**Possíveis Causas:**
- Token JWT expirado
- Chave secreta JWT incorreta no backend
- Formato do token inválido
- Token não está sendo extraído corretamente do header Authorization

**Verificações Necessárias:**
```javascript
// Verificar se o token está sendo extraído corretamente
const token = req.headers.authorization?.replace('Bearer ', '');

// Verificar se a chave secreta está configurada
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

// Verificar se o token não expirou
jwt.verify(token, JWT_SECRET, (err, decoded) => {
  if (err) {
    console.log('Erro JWT:', err.message); // Log para debug
    return res.status(403).json({
      success: false,
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    });
  }
});
```

### 2. **Integração com Supabase Auth**

**Possíveis Causas:**
- Token do Supabase não está sendo validado corretamente
- Configuração incorreta do cliente Supabase no backend
- Variáveis de ambiente do Supabase não configuradas

**Verificações Necessárias:**
```javascript
// Verificar configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Para operações no backend
);

// Validar token do Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return res.status(403).json({
    success: false,
    message: 'Token inválido',
    code: 'INVALID_TOKEN'
  });
}
```

### 3. **Variáveis de Ambiente**

**Verificar se estão configuradas no Vercel:**
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
JWT_SECRET=sua_chave_secreta_jwt
```

### 4. **Middleware de Autenticação**

**Possível Problema:**
O middleware de autenticação pode estar rejeitando tokens válidos.

**Solução Sugerida:**
```javascript
// middleware/auth.js
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido',
        code: 'MISSING_TOKEN'
      });
    }

    // Validar com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Erro de validação:', error); // Log para debug
      return res.status(403).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user; // Adicionar usuário ao request
    next();
  } catch (error) {
    console.error('Erro no middleware de auth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
```

## 🔧 Soluções Recomendadas

### 1. **Implementar Logs Detalhados**
```javascript
// No endpoint PUT /api/users/profile
app.put('/api/users/profile', async (req, res) => {
  console.log('Headers recebidos:', req.headers);
  console.log('Token extraído:', req.headers.authorization);
  
  // ... resto da lógica
});
```

### 2. **Verificar Configuração do CORS**
```javascript
// Permitir headers de autorização
app.use(cors({
  origin: ['http://localhost:8080', 'https://seu-frontend.vercel.app'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. **Endpoint de Debug (Temporário)**
```javascript
// GET /api/debug/token - Para testar validação
app.get('/api/debug/token', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    res.json({
      token_provided: !!token,
      token_length: token?.length,
      supabase_error: error,
      user_id: user?.id,
      user_email: user?.email
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});
```

### 4. **Sincronização com user_profiles**

Como agora os dados estão na tabela `user_profiles`, verificar se o endpoint está consultando a tabela correta:

```javascript
// Buscar dados do usuário na tabela user_profiles
const { data: userProfile, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (error) {
  console.log('Erro ao buscar perfil:', error);
  return res.status(404).json({
    success: false,
    message: 'Perfil não encontrado',
    code: 'PROFILE_NOT_FOUND'
  });
}
```

## 🧪 Testes Recomendados

1. **Testar token manualmente:**
   - Fazer login no frontend
   - Copiar o token do localStorage
   - Testar no Postman/Insomnia

2. **Verificar logs do Vercel:**
   - Acessar dashboard do Vercel
   - Verificar logs da função
   - Procurar por erros de JWT/Supabase

3. **Testar endpoint de debug:**
   - Criar endpoint temporário para validar token
   - Verificar se Supabase está respondendo corretamente

## 📞 Próximos Passos

1. ✅ Implementar logs detalhados no endpoint
2. ✅ Verificar variáveis de ambiente no Vercel
3. ✅ Testar validação de token com Supabase
4. ✅ Atualizar consultas para usar tabela `user_profiles`
5. ✅ Implementar endpoint de debug temporário
6. ✅ Testar CORS e headers permitidos

---

**Observação:** O erro está ocorrendo especificamente na validação do token JWT. O backend precisa verificar se está usando a configuração correta do Supabase e se as variáveis de ambiente estão definidas no Vercel.

