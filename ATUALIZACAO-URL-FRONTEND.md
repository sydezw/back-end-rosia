# 🔄 Atualização Urgente - URL da API

## ⚠️ Problema Identificado

O frontend ainda está usando a URL antiga da API:
```
https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app
```

## ✅ URL Correta Atual

```
https://back-end-rosia.vercel.app
```

## 🛠️ Como Corrigir no Frontend

### 1. Localizar Arquivo de Configuração da API

Procure por arquivos como:
- `admin-api.ts`
- `api.ts`
- `config.ts`
- `.env`
- `.env.production`

### 2. Atualizar a URL Base

**Em `admin-api.ts` ou similar:**
```typescript
// ANTES (URL ANTIGA - REMOVER)
const API_BASE_URL = 'https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app';

// DEPOIS (URL NOVA - USAR)
const API_BASE_URL = 'https://back-end-rosia.vercel.app';
```

**Em arquivo `.env.production`:**
```bash
# ANTES (URL ANTIGA - REMOVER)
REACT_APP_API_URL=https://back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app

# DEPOIS (URL NOVA - USAR)
REACT_APP_API_URL=https://back-end-rosia.vercel.app
```

### 3. Verificar Todas as Ocorrências

Use a busca global no seu editor para encontrar:
```
back-end-rosia-41zn6wu6w-rosita933751-2137s-projects.vercel.app
```

E substitua por:
```
back-end-rosia.vercel.app
```

### 4. Reiniciar o Frontend

Após as alterações:
```bash
# Parar o servidor
Ctrl + C

# Limpar cache (se necessário)
npm run build

# Reiniciar
npm start
```

## 🔍 Verificação

Após a atualização, teste:
1. Acesse o painel admin
2. Tente criar/editar um produto
3. Verifique no Network tab se as requisições estão indo para a URL correta

## 📋 Checklist

- [ ] Localizar arquivo de configuração da API
- [ ] Atualizar URL base da API
- [ ] Verificar arquivo .env.production
- [ ] Buscar e substituir todas as ocorrências da URL antiga
- [ ] Reiniciar o frontend
- [ ] Testar funcionalidades admin
- [ ] Verificar Network tab no DevTools

---

**⚡ Ação Imediata Necessária:** O frontend precisa ser atualizado com a nova URL para funcionar corretamente!

