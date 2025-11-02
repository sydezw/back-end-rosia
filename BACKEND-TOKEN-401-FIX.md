# 🔧 BACKEND: Correção do Erro 401 - Token Inválido

## 🚨 Problema Identificado

**Erro**: `PUT https://back-end-rosia02.vercel.app/api/users/profile-update 401 (Unauthorized)`  
**Resposta**: `{"error":"Token inválido ou expirado","code":"INVALID_TOKEN"}`

## 🔍 Análise do Problema

O frontend está enviando o token JWT corretamente, mas o backend está rejeitando com erro 401. Possíveis causas:

1. **Token expirado** - JWT com tempo de vida muito curto
2. **Validação incorreta** - Middleware de autenticação com problemas
3. **Secret key diferente** - Chave de assinatura JWT inconsistente
4. **Formato do token** - Header Authorization mal formatado

## 🎯 Ações Necessárias no Backend

### 1. Verificar Middleware de Autenticação

**Arquivo**: `middleware/auth.js` ou similar

```javascript
// Verificar se está extraindo o token corretamente
const token = req.headers.authorization?.replace('Bearer ', '');

if (!token) {
  return res.status(401).json({ 
    error: 'Token não fornecido', 
    code: 'NO_TOKEN' 
  });
}

// Adicionar logs para debug
console.log('🔍 Token recebido:', token.substring(0, 20) + '...');
console.log('🔍 Headers:', req.headers.authorization);
```

### 2. Verificar Validação JWT

```javascript
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token válido para usuário:', decoded.userId);
  req.user = decoded;
  next();
} catch (error) {
  console.error('❌ Erro na validação JWT:', error.message);
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expirado', 
      code: 'TOKEN_EXPIRED' 
    });
  }
  
  return res.status(401).json({ 
    error: 'Token inválido', 
    code: 'INVALID_TOKEN' 
  });
}
```

### 3. Verificar Configuração JWT

**Arquivo**: `.env` ou configuração

```env
# Verificar se a JWT_SECRET está definida
JWT_SECRET=sua_chave_secreta_aqui

# Verificar tempo de expiração (recomendado: 24h ou mais)
JWT_EXPIRES_IN=24h
```

### 4. Verificar Endpoint `/api/users/profile-update`

```javascript
// Adicionar logs no início do endpoint
app.put('/api/users/profile-update', authenticateToken, async (req, res) => {
  console.log('📥 Requisição recebida para profile-update');
  console.log('👤 Usuário autenticado:', req.user.userId);
  console.log('📋 Dados recebidos:', req.body);
  
  try {
    // Sua lógica aqui
  } catch (error) {
    console.error('❌ Erro no profile-update:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 5. Verificar Geração de Token no Login

**Arquivo**: Endpoint de login

```javascript
// Verificar se o token está sendo gerado corretamente
const token = jwt.sign(
  { 
    userId: user.id, 
    email: user.email 
  },
  process.env.JWT_SECRET,
  { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  }
);

console.log('✅ Token gerado para:', user.email);
console.log('🔍 Token (primeiros 20 chars):', token.substring(0, 20) + '...');
```

## 🧪 Testes Recomendados

### 1. Teste Manual do Token

```bash
# Testar o endpoint diretamente
curl -X PUT https://back-end-rosia02.vercel.app/api/users/profile-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"nome":"Teste"}'
```

### 2. Verificar Token no JWT.io

1. Copie o token do localStorage do frontend
2. Cole em https://jwt.io
3. Verifique se:
   - Token está bem formado
   - Payload contém dados corretos
   - Não está expirado

### 3. Logs de Debug

Adicionar logs temporários para debug:

```javascript
// No middleware de autenticação
console.log('🔍 DEBUG - Headers completos:', req.headers);
console.log('🔍 DEBUG - Authorization header:', req.headers.authorization);
console.log('🔍 DEBUG - Token extraído:', token);
console.log('🔍 DEBUG - JWT_SECRET definido:', !!process.env.JWT_SECRET);
```

## 🎯 Checklist de Verificação

- [ ] JWT_SECRET está definido no .env
- [ ] JWT_SECRET é o mesmo usado no login e na validação
- [ ] Token não está expirado (verificar expiresIn)
- [ ] Middleware de autenticação está funcionando
- [ ] Header Authorization está sendo lido corretamente
- [ ] Endpoint `/api/users/profile-update` existe e está protegido
- [ ] Logs de debug estão ativos

## 🚀 Solução Rápida

Se o problema persistir, implemente esta validação temporária:

```javascript
// Middleware de debug temporário
app.use('/api/users/profile-update', (req, res, next) => {
  console.log('🔍 DEBUG PROFILE-UPDATE:');
  console.log('- Method:', req.method);
  console.log('- Headers:', req.headers);
  console.log('- Authorization:', req.headers.authorization);
  console.log('- Body:', req.body);
  next();
});
```

## 📋 Resposta Esperada

Após as correções, o endpoint deve:

1. ✅ Aceitar tokens JWT válidos
2. ✅ Retornar dados atualizados com sucesso
3. ✅ Logs claros de debug
4. ✅ Tratamento adequado de erros

---

**Prioridade**: 🔴 ALTA - Bloqueando funcionalidade crítica  
**Tempo estimado**: 30-60 minutos  
**Impacto**: Usuários não conseguem salvar dados do perfil

