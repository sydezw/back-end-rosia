# 🔧 Debug do Erro 401 - Token Inválido ou Expirado

## 🚨 Problema Identificado

O erro `PUT /api/users/profile 401 (Unauthorized)` com a mensagem `"Token inválido ou expirado"` indica que o middleware de autenticação está rejeitando o token enviado pelo frontend.

---

## 🧪 Testes de Diagnóstico

### 1. **Teste do Middleware (Sem Token)**
✅ **Status:** Funcionando corretamente
- Endpoint: `GET /api/debug/test-auth-middleware`
- Resultado: Retorna 401 quando não há token (comportamento esperado)

### 2. **Teste com Token Real (NECESSÁRIO)**
⚠️ **Status:** Pendente - Precisa de token do frontend

**Como obter o token:**

1. **Abra o frontend da aplicação**
2. **Faça login normalmente**
3. **Abra o DevTools (F12)**
4. **Vá para a aba Application**
5. **Procure em Local Storage por:**
   - `supabase.auth.token`
   - `sb-[projeto-id]-auth-token`
   - Qualquer chave que contenha "auth" ou "token"

6. **Copie o `access_token`** (não o refresh_token)

7. **Teste no PowerShell:**
```powershell
# Substitua SEU_TOKEN_AQUI pelo token real
$token = "SEU_TOKEN_AQUI"
$headers = @{'Authorization' = "Bearer $token"}

# Teste o middleware
Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/debug/test-auth-middleware' -Method GET -Headers $headers

# Teste o endpoint de perfil
Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/users/profile' -Method GET -Headers $headers
```

---

## 🔍 Possíveis Causas do Erro 401

### **1. Token Expirado**
- **Sintoma:** Token era válido mas expirou
- **Solução:** Fazer novo login ou refresh do token
- **Verificação:** Checar timestamp de expiração no token

### **2. Configuração do Supabase**
- **Sintoma:** Variáveis de ambiente incorretas
- **Verificação:** Testar `GET /api/debug/supabase-config`
- **Solução:** Verificar SUPABASE_URL e SUPABASE_ANON_KEY no Vercel

### **3. Formato do Token**
- **Sintoma:** Token não está no formato JWT esperado
- **Verificação:** Token deve começar com "eyJ"
- **Solução:** Verificar se está enviando o access_token correto

### **4. Middleware de Autenticação**
- **Sintoma:** Middleware rejeitando tokens válidos
- **Verificação:** Logs do servidor no Vercel
- **Solução:** Verificar implementação do middleware

### **5. CORS ou Headers**
- **Sintoma:** Headers não chegando ao servidor
- **Verificação:** Network tab do DevTools
- **Solução:** Verificar configuração CORS

---

## 📋 Checklist de Diagnóstico

### ✅ **Já Verificado:**
- [x] Middleware de autenticação implementado
- [x] Endpoint de debug funcionando
- [x] Estrutura do controller correta
- [x] Rota configurada corretamente

### ⏳ **Pendente de Verificação:**
- [ ] Token real do frontend é válido
- [ ] Configuração do Supabase no Vercel
- [ ] Logs do servidor durante a requisição
- [ ] Headers chegando ao servidor
- [ ] Formato do token enviado

---

## 🛠️ Comandos de Teste

### **1. Testar Configuração do Supabase**
```powershell
Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/debug/supabase-config' -Method GET
```

### **2. Testar Middleware (com token real)**
```powershell
$token = "SEU_TOKEN_REAL_AQUI"
$headers = @{'Authorization' = "Bearer $token"}
Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/debug/test-auth-middleware' -Method GET -Headers $headers
```

### **3. Testar Endpoint de Perfil (com token real)**
```powershell
$token = "SEU_TOKEN_REAL_AQUI"
$headers = @{'Authorization' = "Bearer $token"}
Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/users/profile' -Method GET -Headers $headers
```

### **4. Testar Atualização de Perfil (com token real)**
```powershell
$token = "SEU_TOKEN_REAL_AQUI"
$headers = @{'Authorization' = "Bearer $token"; 'Content-Type' = 'application/json'}
$body = @{
  full_name = "Teste Nome"
  phone = "11999999999"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://back-end-rosia02.vercel.app/api/users/profile' -Method PUT -Headers $headers -Body $body
```

---

## 🎯 Próximos Passos

### **PRIORIDADE ALTA** 🔴
1. **Obter token real do frontend**
2. **Testar middleware com token real**
3. **Verificar logs do Vercel**
4. **Confirmar configuração do Supabase**

### **Se o token for válido mas ainda der erro:**
1. Verificar variáveis de ambiente no Vercel
2. Checar logs detalhados do servidor
3. Verificar se o usuário existe na tabela user_profiles
4. Testar com usuário recém-criado

### **Se o token for inválido:**
1. Verificar implementação do login no frontend
2. Confirmar que está salvando o token correto
3. Verificar se não há problemas de CORS
4. Testar fluxo completo de autenticação

---

## 📞 Informações para Suporte

**Endpoints de Debug Disponíveis:**
- `GET /api/debug/supabase-config` - Verificar configuração
- `GET /api/debug/test-auth-middleware` - Testar middleware
- `POST /api/debug/validate-token` - Validar token específico

**Logs Importantes:**
- Console do frontend (erros de token)
- Network tab (headers enviados)
- Logs do Vercel (erros do servidor)

**Arquivos Relevantes:**
- `middleware/auth.js` - Middleware de autenticação
- `routes/users.js` - Rotas de usuário
- `controllers/UsersController.js` - Controller de perfil
- `config/supabase.js` - Configuração do Supabase

