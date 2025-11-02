# Diagnóstico: Erro 500 'PROFILE_ERROR' no Login Google

## 🚨 Problema Identificado

**Erro:** `Erro interno ao processar perfil do usuário` (código: `PROFILE_ERROR`)  
**Status:** 500 Internal Server Error  
**Endpoint:** `POST /api/auth/login/google`  
**Ambiente:** Produção (Vercel)

## 🔍 Análise do Código

O erro `PROFILE_ERROR` é lançado no arquivo `routes/auth.js` na linha ~325:

```javascript
catch (profileErr) {
  console.error('❌ Erro crítico ao gerenciar perfil do usuário:', profileErr);
  return res.status(500).json({
    error: 'Erro interno ao processar perfil do usuário',
    code: 'PROFILE_ERROR'
  });
}
```

## 🎯 Possíveis Causas

### 1. **Variáveis de Ambiente Ausentes/Incorretas**
- `SUPABASE_URL` não configurada
- `SUPABASE_ANON_KEY` inválida
- `SUPABASE_SERVICE_ROLE_KEY` ausente
- `JWT_SECRET` não definido

### 2. **Problemas de Conectividade com Supabase**
- Timeout na conexão
- Limites de rate limiting
- Problemas de rede no Vercel

### 3. **Problemas de Schema do Banco**
- Tabela `user_profiles` não existe
- Colunas ausentes ou com nomes diferentes
- Constraints de foreign key

### 4. **Problemas de Permissões**
- RLS (Row Level Security) bloqueando inserções
- Políticas de segurança muito restritivas
- Service role sem permissões adequadas

## 🔧 Soluções Imediatas

### 1. Verificar Variáveis de Ambiente no Vercel

**Acesse:** [Vercel Dashboard](https://vercel.com/dashboard) > Seu Projeto > Settings > Environment Variables

**Variáveis Obrigatórias:**
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=seu_jwt_secret_super_seguro_32_chars
GOOGLE_CLIENT_ID=718842423005-87hoau5s544gno1l7js214c3doicep40.apps.googleusercontent.com
```

**⚠️ Importante:** Marcar todas as opções:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 2. Testar Conexão com Supabase

**Criar endpoint de debug:**
```javascript
// routes/debug.js
router.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Supabase conectado com sucesso',
      hasData: !!data 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      code: 'SUPABASE_CONNECTION_ERROR'
    });
  }
});
```

### 3. Verificar Schema da Tabela

**SQL para verificar:**
```sql
-- Verificar se tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_profiles';

-- Verificar colunas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### 4. Implementar Logging Detalhado

**Adicionar logs específicos:**
```javascript
// No início do endpoint /login/google
console.log('🔍 Environment Check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
  hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasJwtSecret: !!process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV
});

// Antes da operação do Supabase
console.log('🔍 Supabase Operation:', {
  operation: 'select user_profiles',
  googleId: googleId,
  timestamp: new Date().toISOString()
});
```

## 🧪 Testes de Validação

### 1. Teste Local vs Produção
```bash
# Local (deve funcionar)
curl -X POST "http://localhost:3001/api/auth/login/google" \
  -H "Content-Type: application/json" \
  -d '{"token":"token_real_do_google"}'

# Produção (está falhando)
curl -X POST "https://back-end-rosia02.vercel.app/api/auth/login/google" \
  -H "Content-Type: application/json" \
  -d '{"token":"token_real_do_google"}'
```

### 2. Teste de Conectividade
```bash
# Testar endpoint de debug
curl "https://back-end-rosia02.vercel.app/api/debug/test-supabase"
```

## 📋 Checklist de Correção

### Vercel Environment Variables
- [ ] `SUPABASE_URL` configurada
- [ ] `SUPABASE_ANON_KEY` configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada
- [ ] `JWT_SECRET` configurada (mínimo 32 caracteres)
- [ ] `GOOGLE_CLIENT_ID` configurada
- [ ] Todas marcadas para Production/Preview/Development

### Supabase Configuration
- [ ] Tabela `user_profiles` existe
- [ ] Colunas necessárias presentes
- [ ] RLS configurado corretamente
- [ ] Service role tem permissões adequadas

### Deploy e Testes
- [ ] Fazer redeploy após configurar variáveis
- [ ] Testar endpoint de debug
- [ ] Testar login com token real do Google
- [ ] Verificar logs no Vercel Functions

## 🚀 Próximos Passos

1. **Imediato:** Verificar e configurar variáveis de ambiente no Vercel
2. **Curto prazo:** Implementar endpoint de debug para diagnóstico
3. **Médio prazo:** Adicionar logging detalhado e monitoramento
4. **Longo prazo:** Implementar retry logic e fallbacks

## 📞 Como Resolver

1. **Acesse o Vercel Dashboard**
2. **Configure todas as variáveis de ambiente**
3. **Faça redeploy do projeto**
4. **Teste novamente o login Google**
5. **Se persistir, verificar logs do Vercel Functions**

---

**Status:** 🔴 Erro ativo em produção  
**Prioridade:** 🚨 Alta - Funcionalidade crítica afetada  
**Estimativa de correção:** 15-30 minutos após configurar variáveis

