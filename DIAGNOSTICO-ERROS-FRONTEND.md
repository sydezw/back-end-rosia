# 🚨 Diagnóstico de Erros - Frontend

## 📊 Análise dos Erros Identificados

### 1. ❌ Erro de CORS (Crítico)
```
Access to XMLHttpRequest at 'https://back-end-rosia.vercel.app/admin/products' 
from origin 'http://192.168.0.13:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Causa:** O frontend ainda está usando a URL correta (`https://back-end-rosia.vercel.app`), mas o erro indica que o cabeçalho CORS não está sendo retornado.

### 2. ❌ Erro 413 - Content Too Large
```
POST https://back-end-rosia.vercel.app/admin/products net::ERR_FAILED 413 (Content Too Large)
```

**Causa:** O payload da requisição está muito grande, provavelmente devido a imagens em base64.

## 🔧 Soluções Imediatas

### Solução 1: Verificar Configuração CORS no Backend

**Problema:** O middleware CORS pode não estar sendo aplicado corretamente em produção.

**Verificação necessária em `server.js`:**
```javascript
// Verificar se esta configuração está ativa:
app.use(cors({
  origin: [
    'http://192.168.0.13:8080',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

### Solução 2: Resolver Erro 413 - Content Too Large

**Configuração necessária em `server.js`:**
```javascript
// Aumentar limite de payload
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Para multer (upload de arquivos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    fieldSize: 50 * 1024 * 1024  // 50MB para campos
  }
});
```

### Solução 3: Otimizar Upload de Imagens no Frontend

**Problema:** Imagens muito grandes sendo enviadas como base64.

**Solução recomendada:**
```typescript
// Comprimir imagem antes do upload
const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% qualidade
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

## 🔍 Testes de Diagnóstico

### Teste 1: Verificar CORS Manualmente
```bash
# Testar preflight request
curl -X OPTIONS https://back-end-rosia.vercel.app/admin/products \
  -H "Origin: http://192.168.0.13:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

### Teste 2: Verificar Tamanho do Payload
```javascript
// No frontend, antes de enviar:
console.log('Tamanho do payload:', JSON.stringify(productData).length, 'bytes');
console.log('Tamanho em MB:', (JSON.stringify(productData).length / 1024 / 1024).toFixed(2));
```

## 📋 Checklist de Correções

### Backend (`server.js`)
- [ ] ✅ Verificar se CORS está configurado corretamente
- [ ] ✅ Aumentar limite de payload para 50MB
- [ ] ✅ Configurar multer com limites adequados
- [ ] ✅ Fazer novo deploy no Vercel

### Frontend
- [ ] 🔄 Implementar compressão de imagens
- [ ] 🔄 Adicionar logs de tamanho do payload
- [ ] 🔄 Implementar fallback para imagens grandes
- [ ] 🔄 Testar criação de produto com imagem pequena

### Variáveis de Ambiente (Vercel)
- [ ] 🔄 Verificar se `FRONTEND_URL=http://192.168.0.13:8080` está configurada
- [ ] 🔄 Verificar outras variáveis obrigatórias

## 🚀 Próximos Passos

1. **Imediato:** Corrigir configuração CORS e limites no backend
2. **Curto prazo:** Implementar compressão de imagens no frontend
3. **Médio prazo:** Migrar para upload direto de arquivos (não base64)

---

**Status:** 🔴 Crítico - Funcionalidade admin bloqueada por CORS e limite de payload