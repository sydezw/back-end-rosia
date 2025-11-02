# Guia de Segurança - Endpoint de Atualização de Perfil

## 🔒 Medidas de Segurança Implementadas

### 1. Autenticação JWT do Supabase

**Proteção**: O endpoint usa tokens JWT do Supabase para autenticação.

```javascript
// Middleware de autenticação (já implementado)
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso necessário',
        code: 'MISSING_TOKEN'
      });
    }
    
    // Validação JWT do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Falha na autenticação',
      code: 'AUTH_FAILED'
    });
  }
};
```

### 2. Isolamento de Dados por Usuário

**Proteção**: Cada usuário só pode acessar/modificar seus próprios dados.

```javascript
// No controller - Busca sempre pelo ID do usuário autenticado
const userId = req.user.id; // Vem do token JWT validado

// Buscar perfil do usuário logado
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId) // ← Filtro de segurança
  .single();

// Atualizar apenas dados do usuário logado
const { data: updatedProfile } = await supabase
  .from('user_profiles')
  .upsert({
    user_id: userId, // ← Sempre o usuário autenticado
    ...profileData
  })
  .eq('user_id', userId) // ← Dupla proteção
  .select('*')
  .single();
```

### 3. Validação e Sanitização de Dados

**Proteção**: Todos os dados são validados antes de serem salvos.

```javascript
// Validações implementadas
const validations = {
  cpf: {
    format: /^\d{11}$/,
    message: 'CPF deve conter exatamente 11 dígitos'
  },
  telefone: {
    format: /^\d{10,11}$/,
    message: 'Telefone deve ter 10 ou 11 dígitos'
  },
  cep: {
    format: /^\d{8}$/,
    message: 'CEP deve conter exatamente 8 dígitos'
  },
  email: {
    format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email deve ter formato válido'
  }
};

// Sanitização automática
const sanitizeData = (data) => {
  const sanitized = {};
  
  Object.keys(data).forEach(key => {
    let value = data[key];
    
    if (typeof value === 'string') {
      // Remove caracteres especiais perigosos
      value = value.trim().replace(/[<>"'&]/g, '');
      
      // Limita tamanho dos campos
      if (value.length > 255) {
        value = value.substring(0, 255);
      }
    }
    
    sanitized[key] = value;
  });
  
  return sanitized;
};
```

### 4. Rate Limiting (Recomendado)

**Proteção**: Limita número de requisições por IP/usuário.

```javascript
// Instalar: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

// Configurar rate limiting
const profileUpdateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 atualizações por 15 minutos
  message: {
    error: 'Muitas tentativas de atualização. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar no endpoint
router.put('/profile-update', profileUpdateLimit, authenticateUser, UsersController.updateProfileComplete);
```

### 5. Logs de Segurança

**Proteção**: Monitora tentativas de acesso suspeitas.

```javascript
const logSecurityEvent = (event, userId, ip, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    ip,
    userAgent: details.userAgent,
    details
  };
  
  console.log('🔒 SECURITY LOG:', JSON.stringify(logEntry));
  
  // Em produção, salvar em arquivo ou banco de dados
  // fs.appendFileSync('security.log', JSON.stringify(logEntry) + '\n');
};

// Usar nos endpoints
app.use((req, res, next) => {
  // Log de todas as tentativas de acesso a endpoints sensíveis
  if (req.path.includes('/profile')) {
    logSecurityEvent('PROFILE_ACCESS_ATTEMPT', req.user?.id || 'anonymous', req.ip, {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
  }
  next();
});
```

### 6. Validação de Origem (CORS)

**Proteção**: Controla quais domínios podem fazer requisições.

```javascript
// Configuração CORS segura
const corsOptions = {
  origin: [
    'http://localhost:3000', // Desenvolvimento
    'https://seudominio.com', // Produção
    'https://www.seudominio.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 7. Proteção contra SQL Injection

**Proteção**: Uso do Supabase Client (já protegido).

```javascript
// ✅ SEGURO - Supabase Client usa prepared statements
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId); // Parâmetro seguro

// ❌ INSEGURO - Query SQL direta (NÃO usar)
// const query = `SELECT * FROM user_profiles WHERE user_id = '${userId}'`;
```

### 8. Validação de Tipos de Dados

**Proteção**: Garante que apenas dados válidos sejam processados.

```javascript
const validateRequestData = (data) => {
  const errors = {};
  
  // Validar tipos
  if (data.nome && typeof data.nome !== 'string') {
    errors.nome = ['Nome deve ser uma string'];
  }
  
  if (data.cpf && typeof data.cpf !== 'string') {
    errors.cpf = ['CPF deve ser uma string'];
  }
  
  if (data.numero && isNaN(parseInt(data.numero))) {
    errors.numero = ['Número deve ser numérico'];
  }
  
  // Validar tamanhos
  if (data.nome && data.nome.length > 100) {
    errors.nome = ['Nome muito longo (máximo 100 caracteres)'];
  }
  
  if (data.complemento && data.complemento.length > 100) {
    errors.complemento = ['Complemento muito longo (máximo 100 caracteres)'];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

## 🛡️ Como o Frontend Deve Enviar Dados

### 1. Sempre Incluir Token de Autorização

```javascript
// ✅ CORRETO
const { data: { session } } = await supabase.auth.getSession();

if (!session?.access_token) {
  throw new Error('Usuário não autenticado');
}

const response = await fetch('/api/users/profile-update', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}` // ← Token obrigatório
  },
  body: JSON.stringify(dados)
});
```

### 2. Validar Dados no Frontend (Primeira Linha de Defesa)

```javascript
const validateBeforeSend = (data) => {
  const errors = [];
  
  // CPF
  if (data.cpf) {
    const cleanCPF = data.cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length !== 11) {
      errors.push('CPF deve ter 11 dígitos');
    }
  }
  
  // Telefone
  if (data.telefone) {
    const cleanPhone = data.telefone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      errors.push('Telefone deve ter 10 ou 11 dígitos');
    }
  }
  
  // CEP
  if (data.cep) {
    const cleanCEP = data.cep.replace(/[^\d]/g, '');
    if (cleanCEP.length !== 8) {
      errors.push('CEP deve ter 8 dígitos');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 3. Tratar Erros de Segurança

```javascript
const handleSecurityErrors = (response, data) => {
  switch (response.status) {
    case 401:
      // Token inválido - redirecionar para login
      console.error('Token inválido:', data.error);
      // supabase.auth.signOut();
      // window.location.href = '/login';
      break;
      
    case 403:
      // Acesso negado
      console.error('Acesso negado:', data.error);
      alert('Você não tem permissão para esta ação');
      break;
      
    case 429:
      // Rate limit excedido
      console.error('Muitas tentativas:', data.error);
      alert('Muitas tentativas. Aguarde alguns minutos.');
      break;
      
    case 422:
      // Dados inválidos
      console.error('Dados inválidos:', data.error);
      // Mostrar erros específicos por campo
      break;
      
    default:
      console.error('Erro desconhecido:', data.error);
  }
};
```

### 4. Exemplo Completo Seguro

```javascript
const updateProfileSecure = async (profileData, addressData = null) => {
  try {
    // 1. Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    // 2. Preparar dados
    const requestData = {};
    if (profileData) Object.assign(requestData, profileData);
    if (addressData) Object.assign(requestData, addressData);
    
    // 3. Validar dados localmente
    const validation = validateBeforeSend(requestData);
    if (!validation.isValid) {
      throw new Error('Dados inválidos: ' + validation.errors.join(', '));
    }
    
    // 4. Fazer requisição segura
    const response = await fetch('https://back-end-rosia02.vercel.app/api/users/profile-update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    // 5. Tratar erros de segurança
    if (!response.ok) {
      handleSecurityErrors(response, data);
      throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Erro desconhecido'}`);
    }
    
    // 6. Retornar sucesso
    return {
      success: true,
      data: data.data,
      message: data.message
    };
    
  } catch (error) {
    console.error('❌ Erro na atualização segura:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

## 🚨 Alertas de Segurança

### ❌ O que NÃO fazer:

1. **Nunca enviar dados sem token**
2. **Nunca confiar apenas na validação frontend**
3. **Nunca expor IDs de outros usuários**
4. **Nunca fazer queries SQL diretas**
5. **Nunca logar tokens ou senhas**

### ✅ O que SEMPRE fazer:

1. **Sempre validar token no backend**
2. **Sempre filtrar por user_id**
3. **Sempre sanitizar dados de entrada**
4. **Sempre usar HTTPS em produção**
5. **Sempre logar tentativas suspeitas**

## 📊 Monitoramento de Segurança

### Métricas para Acompanhar:

- Tentativas de acesso com token inválido
- Múltiplas tentativas do mesmo IP
- Tentativas de acessar dados de outros usuários
- Dados malformados ou suspeitos
- Rate limiting ativado

### Logs Importantes:

```javascript
// Exemplo de log de segurança
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "INVALID_TOKEN_ATTEMPT",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "endpoint": "/api/users/profile-update",
  "details": {
    "token_provided": true,
    "token_format": "invalid",
    "user_id": null
  }
}
```

## 🔧 Configurações de Produção

### Variáveis de Ambiente Necessárias:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# Segurança
JWT_SECRET=sua_chave_jwt_super_secreta
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10

# CORS
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
```

### Checklist de Segurança:

- [ ] Tokens JWT validados em todos os endpoints
- [ ] Isolamento de dados por usuário implementado
- [ ] Validação e sanitização de dados ativa
- [ ] Rate limiting configurado
- [ ] CORS configurado corretamente
- [ ] Logs de segurança implementados
- [ ] HTTPS habilitado em produção
- [ ] Variáveis de ambiente protegidas
- [ ] Monitoramento de tentativas suspeitas
- [ ] Backup e recovery configurados

---

**🔒 Resumo**: O endpoint está protegido contra acesso não autorizado, manipulação de dados de outros usuários, ataques de força bruta e injeção de dados maliciosos. O frontend deve sempre enviar o token de autorização e validar dados antes do envio.

