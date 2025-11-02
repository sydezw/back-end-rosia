# 🔧 CORREÇÃO URGENTE: URLs do Frontend (8080 → 3030)

## 🚨 **PROBLEMA IDENTIFICADO**

O frontend está fazendo requisições para `localhost:8080`, mas o backend está rodando em `https://back-end-rosia02.vercel.app`.

**Erro observado:**
```
PUT http://localhost:8080/api/users/profile-update net::ERR_CONNECTION_REFUSED
```

## ✅ **SOLUÇÃO IMEDIATA**

### 1. **Localizar Arquivos de Configuração**

No seu projeto **frontend**, procure pelos seguintes arquivos:

#### **Arquivos de Configuração da API:**
- `src/config/api.ts` ou `src/config/api.js`
- `src/services/api.ts` ou `src/services/api.js`
- `src/utils/endpoint-interceptor.ts`
- `src/api/google-user-profile-api.ts`

#### **Arquivos de Ambiente:**
- `.env`
- `.env.local`
- `.env.development`

#### **Arquivos de Configuração do Build:**
- `vite.config.js` ou `vite.config.ts`
- `next.config.js`
- `package.json` (scripts de proxy)

### 2. **Fazer as Substituições**

**SUBSTITUIR:**
```javascript
// ❌ ERRADO
const API_BASE_URL = 'http://localhost:8080';
const baseURL = 'localhost:8080';
fetch('http://localhost:8080/api/users/profile-update')
```

**POR:**
```javascript
// ✅ CORRETO
const API_BASE_URL = 'https://back-end-rosia02.vercel.app';
const baseURL = 'https://back-end-rosia02.vercel.app';
fetch('https://back-end-rosia02.vercel.app/api/users/profile-update')
```

### 3. **Exemplos de Correção por Arquivo**

#### **src/config/api.ts:**
```typescript
// ❌ ANTES
export const API_BASE_URL = 'http://localhost:8080';

// ✅ DEPOIS
export const API_BASE_URL = 'https://back-end-rosia02.vercel.app';
```

#### **.env ou .env.local:**
```bash
# ❌ ANTES
REACT_APP_API_URL=http://localhost:8080
VITE_API_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080

# ✅ DEPOIS
REACT_APP_API_URL=https://back-end-rosia02.vercel.app
VITE_API_URL=https://back-end-rosia02.vercel.app
NEXT_PUBLIC_API_URL=https://back-end-rosia02.vercel.app
```

#### **vite.config.js (se usando proxy):**
```javascript
// ❌ ANTES
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}

// ✅ DEPOIS
server: {
  proxy: {
    '/api': 'https://back-end-rosia02.vercel.app'
  }
}
```

### 4. **Busca Rápida no Projeto**

**No VS Code ou editor:**
1. Pressione `Ctrl+Shift+F` (busca global)
2. Digite: `localhost:8080`
3. Substitua todos por: `https://back-end-rosia02.vercel.app`

**No terminal do frontend:**
```bash
# Buscar todas as ocorrências
grep -r "localhost:8080" src/

# Substituir automaticamente (Linux/Mac)
find src/ -type f -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | xargs sed -i 's/localhost:8080/https://back-end-rosia02.vercel.app/g'
```

### 5. **Reiniciar o Frontend**

Após fazer as correções:

```bash
# Parar o servidor do frontend (Ctrl+C)
# Depois reiniciar
npm run dev
# ou
yarn dev
# ou
npm start
```

## 🔍 **VERIFICAÇÃO**

### **1. Confirmar Backend Ativo:**
```bash
# Testar se o backend responde
curl https://back-end-rosia02.vercel.app/api/health
```

### **2. Verificar Logs do Frontend:**
Após a correção, os logs devem mostrar:
```
PUT https://back-end-rosia02.vercel.app/api/users/profile-update
```

### **3. Testar no Browser:**
- Abra as **DevTools** (F12)
- Vá na aba **Network**
- Faça uma ação que chame a API
- Verifique se as requisições vão para `:3030`

## 🎯 **RESULTADO ESPERADO**

Após a correção:
- ✅ Requisições vão para `https://back-end-rosia02.vercel.app`
- ✅ Backend responde corretamente
- ✅ Erro `ERR_CONNECTION_REFUSED` eliminado
- ✅ Atualização de perfil funciona

## 📞 **SUPORTE**

Se ainda houver problemas:
1. Verifique se o backend está rodando: `https://back-end-rosia02.vercel.app`
2. Confirme que não há cache do browser (Ctrl+Shift+R)
3. Verifique se todas as URLs foram alteradas
4. Reinicie tanto frontend quanto backend

---

**🚀 Backend confirmado rodando em: `https://back-end-rosia02.vercel.app`**

